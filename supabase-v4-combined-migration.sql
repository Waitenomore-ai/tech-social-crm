-- Tech Social CRM v4.0 combined feature migration
-- Requires supabase-v3-roles-migration.sql to have completed.
-- Tech Social CRM v3.1 — Reusable post templates
-- Run after supabase-v3-roles-migration.sql.

create table if not exists public.post_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  caption text not null default '',
  hashtags text not null default '',
  platforms text[] not null default '{}',
  campaign_id text references public.campaigns(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_templates_updated_idx on public.post_templates(updated_at desc);

alter table public.post_templates enable row level security;

drop policy if exists "Approved team can view templates" on public.post_templates;
drop policy if exists "Editors can create templates" on public.post_templates;
drop policy if exists "Editors can update templates" on public.post_templates;
drop policy if exists "Editors can delete templates" on public.post_templates;

create policy "Approved team can view templates"
on public.post_templates for select to authenticated
using (public.is_allowed_user());

create policy "Editors can create templates"
on public.post_templates for insert to authenticated
with check (public.has_team_role(array['admin','editor']));

create policy "Editors can update templates"
on public.post_templates for update to authenticated
using (public.has_team_role(array['admin','editor']))
with check (public.has_team_role(array['admin','editor']));

create policy "Editors can delete templates"
on public.post_templates for delete to authenticated
using (public.has_team_role(array['admin','editor']));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='post_templates'
  ) then
    alter publication supabase_realtime add table public.post_templates;
  end if;
end $$;

notify pgrst, 'reload schema';

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

-- Tech Social CRM v4.0 — Collaboration, planning, analytics and administration suite
-- Requires the v3.0 roles migration. Run this entire file in Supabase SQL Editor.

create extension if not exists pg_cron;

alter table public.posts add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.posts alter column scheduled_at drop not null;

create table if not exists public.post_approval_events (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.posts(id) on delete cascade,
  event_type text not null check (event_type in ('comment','submitted','approved','changes_requested','status_changed')),
  comment text not null default '',
  from_status text,
  to_status text,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  actor_email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_id uuid references public.post_templates(id) on delete cascade,
  frequency text not null check (frequency in ('weekly','monthly')),
  weekday integer check (weekday between 0 and 6),
  day_of_month integer check (day_of_month between 1 and 28),
  publish_time time not null default '09:00',
  next_run_at timestamptz not null,
  end_date date,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  colour text not null default '#ef111b',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.media_assets add column if not exists folder_id uuid references public.media_folders(id) on delete set null;
alter table public.media_assets add column if not exists tags text[] not null default '{}';
alter table public.media_assets add column if not exists archived boolean not null default false;

create table if not exists public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  status text not null default 'idea' check (status in ('idea','research','writing','review','ready')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to_email text,
  campaign_id text references public.campaigns(id) on delete set null,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  converted_post_id text references public.posts(id) on delete set null
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null default '',
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.company_settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null default 'Tech Lab',
  website_url text not null default 'https://www.techfixlab.co.uk',
  default_hashtags text not null default 'TechLab Worthing TechRepair',
  default_platforms text[] not null default array['instagram','facebook'],
  timezone text not null default 'Europe/London',
  working_hours_start time not null default '09:00',
  working_hours_end time not null default '17:30',
  primary_colour text not null default '#ef111b',
  footer_text text not null default 'Where Tech Meets Social',
  logo_media_id uuid references public.media_assets(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.company_settings(id) values(1) on conflict(id) do nothing;

create table if not exists public.backup_snapshots (
  id uuid primary key default gen_random_uuid(),
  backup_type text not null default 'manual' check (backup_type in ('manual','scheduled')),
  label text not null,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists approval_events_post_idx on public.post_approval_events(post_id, created_at);
create index if not exists recurring_next_run_idx on public.recurring_schedules(active, next_run_at);
create index if not exists ideas_status_idx on public.content_ideas(status, updated_at desc);
create index if not exists audit_created_idx on public.audit_log(created_at desc);
create index if not exists backups_created_idx on public.backup_snapshots(created_at desc);

alter table public.post_approval_events enable row level security;
alter table public.recurring_schedules enable row level security;
alter table public.media_folders enable row level security;
alter table public.content_ideas enable row level security;
alter table public.audit_log enable row level security;
alter table public.company_settings enable row level security;
alter table public.backup_snapshots enable row level security;

-- Standard role policies for new collaborative tables.
do $$
declare table_name text;
begin
  foreach table_name in array array['post_approval_events','recurring_schedules','media_folders','content_ideas'] loop
    execute format('drop policy if exists "Team read" on public.%I',table_name);
    execute format('drop policy if exists "Working team insert" on public.%I',table_name);
    execute format('drop policy if exists "Working team update" on public.%I',table_name);
    execute format('drop policy if exists "Editors delete" on public.%I',table_name);
    execute format('create policy "Team read" on public.%I for select to authenticated using (public.is_allowed_user())',table_name);
    execute format('create policy "Working team insert" on public.%I for insert to authenticated with check (public.has_team_role(array[''admin'',''editor'',''approver'']))',table_name);
    execute format('create policy "Working team update" on public.%I for update to authenticated using (public.has_team_role(array[''admin'',''editor'',''approver''])) with check (public.has_team_role(array[''admin'',''editor'',''approver'']))',table_name);
    execute format('create policy "Editors delete" on public.%I for delete to authenticated using (public.has_team_role(array[''admin'',''editor'']))',table_name);
  end loop;
end $$;

drop policy if exists "Team read audit" on public.audit_log;
create policy "Team read audit" on public.audit_log for select to authenticated using (public.is_allowed_user());

drop policy if exists "Team read company settings" on public.company_settings;
drop policy if exists "Admins update company settings" on public.company_settings;
create policy "Team read company settings" on public.company_settings for select to authenticated using (public.is_allowed_user());
create policy "Admins update company settings" on public.company_settings for update to authenticated using (public.has_team_role(array['admin'])) with check (public.has_team_role(array['admin']));

drop policy if exists "Admins read backups" on public.backup_snapshots;
drop policy if exists "Admins create backups" on public.backup_snapshots;
drop policy if exists "Admins delete backups" on public.backup_snapshots;
create policy "Admins read backups" on public.backup_snapshots for select to authenticated using (public.has_team_role(array['admin']));
create policy "Admins create backups" on public.backup_snapshots for insert to authenticated with check (public.has_team_role(array['admin']));
create policy "Admins delete backups" on public.backup_snapshots for delete to authenticated using (public.has_team_role(array['admin']));

-- Approval comments and decisions with history.
create or replace function public.add_approval_comment(p_post_id text,p_comment text)
returns uuid language plpgsql security definer set search_path=public as $$
declare event_id uuid; profile record;
begin
  if not public.has_team_role(array['admin','editor','approver']) then raise exception 'Working team role required'; end if;
  select display_name,email into profile from public.allowed_users where email=lower(auth.jwt()->>'email');
  insert into public.post_approval_events(post_id,event_type,comment,actor_id,actor_name,actor_email)
  values(p_post_id,'comment',trim(p_comment),auth.uid(),coalesce(profile.display_name,profile.email),profile.email) returning id into event_id;
  return event_id;
end;$$;
revoke all on function public.add_approval_comment(text,text) from public,anon;
grant execute on function public.add_approval_comment(text,text) to authenticated;

create or replace function public.set_post_approval_with_reason(p_post_id text,p_decision text,p_reason text default '')
returns text language plpgsql security definer set search_path=public as $$
declare next_status text; old_status text; profile record; editor record;
begin
  if not public.has_team_role(array['admin','approver']) then raise exception 'Approver role required'; end if;
  select status into old_status from public.posts where id=p_post_id;
  if p_decision='approve' then next_status:='ready'; elsif p_decision='changes' then next_status:='draft'; else raise exception 'Invalid decision'; end if;
  select display_name,email into profile from public.allowed_users where email=lower(auth.jwt()->>'email');
  update public.posts set status=next_status,updated_at=now(),updated_by=auth.uid() where id=p_post_id;
  insert into public.post_approval_events(post_id,event_type,comment,from_status,to_status,actor_id,actor_name,actor_email)
  values(p_post_id,case when p_decision='approve' then 'approved' else 'changes_requested' end,trim(p_reason),old_status,next_status,auth.uid(),coalesce(profile.display_name,profile.email),profile.email);
  if p_decision='changes' then
    for editor in select email from public.allowed_users where role in('admin','editor') loop
      insert into public.notifications(recipient_email,notification_type,title,body,target_view,entity_type,entity_id,dedupe_key)
      values(editor.email,'approval','Changes requested',coalesce(nullif(trim(p_reason),''),'An approver requested changes.'),'posts','post',p_post_id,'changes:'||p_post_id||':'||extract(epoch from now())::text||':'||editor.email);
    end loop;
  end if;
  return next_status;
end;$$;
revoke all on function public.set_post_approval_with_reason(text,text,text) from public,anon;
grant execute on function public.set_post_approval_with_reason(text,text,text) to authenticated;

-- Recurring generator. Called when an Editor/Admin opens the CRM.
create or replace function public.generate_recurring_posts()
returns integer language plpgsql security definer set search_path=public as $$
declare schedule record; template record; generated integer:=0; new_id text;
begin
  if not public.has_team_role(array['admin','editor']) then return 0; end if;
  for schedule in select * from public.recurring_schedules where active and next_run_at<=now() and (end_date is null or next_run_at::date<=end_date) loop
    select * into template from public.post_templates where id=schedule.template_id;
    if found then
      new_id:='post-'||replace(gen_random_uuid()::text,'-','');
      insert into public.posts(id,caption,link,hashtags,notes,platforms,scheduled_at,status,campaign_id,created_at,updated_at,created_by,updated_by)
      values(new_id,template.caption,'https://www.techfixlab.co.uk',template.hashtags,'Generated from recurring schedule: '||schedule.name,template.platforms,schedule.next_run_at,'draft',template.campaign_id,now(),now(),auth.uid(),auth.uid());
      generated:=generated+1;
    end if;
    update public.recurring_schedules set
      next_run_at=case when frequency='weekly' then next_run_at+interval '7 days' else next_run_at+interval '1 month' end,
      active=case when end_date is not null and (case when frequency='weekly' then next_run_at+interval '7 days' else next_run_at+interval '1 month' end)::date>end_date then false else true end,
      updated_at=now()
    where id=schedule.id;
  end loop;
  return generated;
end;$$;
revoke all on function public.generate_recurring_posts() from public,anon;
grant execute on function public.generate_recurring_posts() to authenticated;

-- Generic audit trigger.
create or replace function public.record_crm_audit()
returns trigger language plpgsql security definer set search_path=public as $$
declare row_data jsonb; row_id text; label text;
begin
  row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  row_id:=coalesce(row_data->>'id',row_data->>'email',row_data->>'platform');
  label:=coalesce(row_data->>'name',row_data->>'title',left(row_data->>'caption',100),row_data->>'original_name',row_id,'');
  insert into public.audit_log(actor_id,actor_email,action,entity_type,entity_id,summary,details)
  values(auth.uid(),lower(auth.jwt()->>'email'),lower(tg_op),tg_table_name,row_id,label,(row_data-'caption'-'details'-'notes'-'payload'-'snapshot'));
  return case when tg_op='DELETE' then old else new end;
end;$$;

-- Recreate audit triggers safely.
do $$
declare t text;
begin
  foreach t in array array['posts','campaigns','post_templates','media_assets','allowed_users','social_connections','publish_attempts','content_ideas'] loop
    execute format('drop trigger if exists crm_audit_trigger on public.%I',t);
    execute format('create trigger crm_audit_trigger after insert or update or delete on public.%I for each row execute function public.record_crm_audit()',t);
  end loop;
end $$;

-- Database-only snapshots; media binaries are referenced, never duplicated.
create or replace function public.create_backup_snapshot(p_label text default 'Manual backup',p_type text default 'manual')
returns uuid language plpgsql security definer set search_path=public as $$
declare backup_id uuid; data jsonb;
begin
  if p_type='manual' and not public.has_team_role(array['admin']) then raise exception 'Administrator required'; end if;
  select jsonb_build_object(
    'created_at',now(),'posts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.posts x),
    'campaigns',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.campaigns x),
    'templates',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.post_templates x),
    'ideas',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.content_ideas x),
    'requests',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.team_requests x),
    'media_metadata',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.media_assets x),
    'company_settings',(select to_jsonb(x) from public.company_settings x where id=1)
  ) into data;
  insert into public.backup_snapshots(backup_type,label,snapshot,created_by) values(p_type,p_label,data,auth.uid()) returning id into backup_id;
  delete from public.backup_snapshots where expires_at<now();
  return backup_id;
end;$$;
revoke all on function public.create_backup_snapshot(text,text) from public,anon;
grant execute on function public.create_backup_snapshot(text,text) to authenticated;

-- Scheduled backup helper. No browser credentials are involved.
create or replace function public.create_scheduled_backup()
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.backup_snapshots(backup_type,label,snapshot)
  select 'scheduled','Daily automatic backup '||to_char(now(),'YYYY-MM-DD'),jsonb_build_object(
    'created_at',now(),'posts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.posts x),
    'campaigns',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.campaigns x),
    'templates',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.post_templates x),
    'ideas',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.content_ideas x),
    'requests',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.team_requests x),
    'media_metadata',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.media_assets x),
    'company_settings',(select to_jsonb(x) from public.company_settings x where id=1)
  );
  delete from public.backup_snapshots where expires_at<now();
end;$$;
revoke all on function public.create_scheduled_backup() from public,anon,authenticated;

-- Schedule at 02:00 UTC daily. Re-running replaces the job.
do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname='tech-social-daily-backup' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('tech-social-daily-backup','0 2 * * *','select public.create_scheduled_backup();');
end $$;

-- Realtime tables.
do $$
declare t text;
begin
  foreach t in array array['post_approval_events','recurring_schedules','media_folders','content_ideas','audit_log','company_settings','backup_snapshots'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;

notify pgrst,'reload schema';
