-- Tech Social CRM v3.2 — Notification centre
-- Run after supabase-v3-roles-migration.sql.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  notification_type text not null check (notification_type in ('approval','request','inbox','due','overdue','role','system')),
  title text not null,
  body text not null default '',
  target_view text,
  entity_type text,
  entity_id text,
  dedupe_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists notifications_recipient_idx on public.notifications(recipient_email, created_at desc);
create index if not exists notification_reads_user_idx on public.notification_reads(user_id, read_at desc);

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications"
on public.notifications for select to authenticated
using (recipient_email = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "Users can view their read markers" on public.notification_reads;
drop policy if exists "Users can mark notifications read" on public.notification_reads;
drop policy if exists "Users can update their read markers" on public.notification_reads;
drop policy if exists "Users can mark notifications unread" on public.notification_reads;
create policy "Users can view their read markers"
on public.notification_reads for select to authenticated
using (user_id = auth.uid());
create policy "Users can mark notifications read"
on public.notification_reads for insert to authenticated
with check (user_id = auth.uid());
create policy "Users can update their read markers"
on public.notification_reads for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can mark notifications unread"
on public.notification_reads for delete to authenticated
using (user_id = auth.uid());

-- Notify administrators and approvers when a post enters approval.
create or replace function public.notify_post_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare member record;
begin
  if new.status = 'approval' and old.status is distinct from new.status then
    for member in select email from public.allowed_users where role in ('admin','approver') loop
      insert into public.notifications(recipient_email,notification_type,title,body,target_view,entity_type,entity_id,dedupe_key)
      values(member.email,'approval','Post awaiting approval',left(new.caption,180),'posts','post',new.id,'approval:'||new.id||':'||extract(epoch from new.updated_at)::text||':'||member.email)
      on conflict (dedupe_key) do nothing;
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists posts_notification_trigger on public.posts;
create trigger posts_notification_trigger after update on public.posts for each row execute function public.notify_post_approval();

-- Notify the assignee, or the working team when unassigned.
create or replace function public.notify_team_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare member record;
begin
  for member in
    select email from public.allowed_users
    where role <> 'viewer' and (new.assigned_to_email is null or email = lower(new.assigned_to_email))
  loop
    insert into public.notifications(recipient_email,notification_type,title,body,target_view,entity_type,entity_id,dedupe_key)
    values(member.email,'request',new.title,left(new.details,220),'requests','request',new.id,'request:'||new.id||':'||member.email)
    on conflict (dedupe_key) do nothing;
  end loop;
  return new;
end;
$$;
drop trigger if exists request_notification_trigger on public.team_requests;
create trigger request_notification_trigger after insert on public.team_requests for each row execute function public.notify_team_request();

-- Notify working team members when an incoming social message is recorded/imported.
create or replace function public.notify_incoming_social_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare member record; contact text;
begin
  if new.message_type = 'inbound' then
    select contact_name into contact from public.social_threads where id = new.thread_id;
    for member in select email from public.allowed_users where role <> 'viewer' loop
      insert into public.notifications(recipient_email,notification_type,title,body,target_view,entity_type,entity_id,dedupe_key)
      values(member.email,'inbox','New social message from '||coalesce(contact,'a contact'),left(new.body,220),'inbox','thread',new.thread_id::text,'message:'||new.id::text||':'||member.email)
      on conflict (dedupe_key) do nothing;
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists social_message_notification_trigger on public.social_messages;
create trigger social_message_notification_trigger after insert on public.social_messages for each row execute function public.notify_incoming_social_message();

-- Notify a member when an administrator changes their role.
create or replace function public.notify_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    insert into public.notifications(recipient_email,notification_type,title,body,target_view,entity_type,entity_id,dedupe_key)
    values(new.email,'role','Your team role changed','Your Tech Social role is now '||new.role||'.','settings','user',new.email,'role:'||new.email||':'||new.role||':'||extract(epoch from now())::text);
  end if;
  return new;
end;
$$;
drop trigger if exists role_change_notification_trigger on public.allowed_users;
create trigger role_change_notification_trigger after update of role on public.allowed_users for each row execute function public.notify_role_change();

-- Called by the signed-in application. Generates deduplicated reminders for that user.
create or replace function public.generate_due_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  member_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  member_role text := public.current_user_role();
  item record;
  inserted_count integer := 0;
  changed integer;
begin
  if member_role not in ('admin','approver') then return 0; end if;
  for item in
    select id, caption, scheduled_at
    from public.posts
    where status <> 'published' and scheduled_at <= now() + interval '24 hours'
  loop
    insert into public.notifications(recipient_email,notification_type,title,body,target_view,entity_type,entity_id,dedupe_key)
    values(
      member_email,
      case when item.scheduled_at < now() then 'overdue' else 'due' end,
      case when item.scheduled_at < now() then 'Post is overdue' else 'Post due within 24 hours' end,
      left(item.caption,220),
      'queue','post',item.id,
      case when item.scheduled_at < now() then 'overdue:' else 'due:' end || item.id || ':' || to_char(item.scheduled_at,'YYYYMMDDHH24MI') || ':' || member_email
    ) on conflict (dedupe_key) do nothing;
    get diagnostics changed = row_count;
    inserted_count := inserted_count + changed;
  end loop;
  return inserted_count;
end;
$$;
revoke all on function public.generate_due_notifications() from public, anon;
grant execute on function public.generate_due_notifications() to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notification_reads') then
    alter publication supabase_realtime add table public.notification_reads;
  end if;
end $$;

notify pgrst, 'reload schema';
