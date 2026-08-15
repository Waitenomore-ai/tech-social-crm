-- Tech Social CRM v4.2 amendment — Login and post-change log
-- Run after supabase-v3-roles-migration.sql. The v4 suite audit table is required.

create table if not exists public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null,
  user_agent text,
  logged_in_at timestamptz not null default now()
);

create index if not exists login_events_time_idx on public.login_events(logged_in_at desc);
create index if not exists login_events_user_idx on public.login_events(user_id,logged_in_at desc);

alter table public.login_events enable row level security;
drop policy if exists "Approved team can view login history" on public.login_events;
create policy "Approved team can view login history"
on public.login_events for select to authenticated
using (public.is_allowed_user());

-- Authenticated users can record only their own verified login through this function.
create or replace function public.record_login_event(p_user_agent text default null)
returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare
  profile record;
  event_id bigint;
begin
  if not public.is_allowed_user() then raise exception 'Not approved'; end if;
  select email,coalesce(display_name,email) as display_name,role into profile
  from public.allowed_users where email=lower(auth.jwt()->>'email');
  insert into public.login_events(user_id,email,display_name,role,user_agent)
  values(auth.uid(),profile.email,profile.display_name,profile.role,left(p_user_agent,500))
  returning id into event_id;
  return event_id;
end;
$$;
revoke all on function public.record_login_event(text) from public,anon;
grant execute on function public.record_login_event(text) to authenticated;

-- Replace the generic post trigger with a human-readable post-change audit trigger.
create or replace function public.record_post_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(auth.jwt()->>'email');
  row_id text;
  message text;
  detail jsonb;
begin
  row_id:=case when tg_op='DELETE' then old.id else new.id end;
  if tg_op='INSERT' then
    message:='Created post: '||left(new.caption,120);
    detail:=jsonb_build_object('status',new.status,'scheduled_at',new.scheduled_at,'platforms',new.platforms);
  elsif tg_op='DELETE' then
    message:='Deleted post: '||left(old.caption,120);
    detail:=jsonb_build_object('status',old.status,'scheduled_at',old.scheduled_at,'platforms',old.platforms);
  elsif old.status is distinct from new.status then
    message:='Changed post status from '||old.status||' to '||new.status||': '||left(new.caption,100);
    detail:=jsonb_build_object('old_status',old.status,'new_status',new.status,'scheduled_at',new.scheduled_at,'platforms',new.platforms);
  elsif old.scheduled_at is distinct from new.scheduled_at then
    message:='Rescheduled post: '||left(new.caption,120);
    detail:=jsonb_build_object('old_date',old.scheduled_at,'new_date',new.scheduled_at,'platforms',new.platforms);
  else
    message:='Edited post: '||left(new.caption,120);
    detail:=jsonb_build_object('status',new.status,'scheduled_at',new.scheduled_at,'platforms',new.platforms);
  end if;
  insert into public.audit_log(actor_id,actor_email,action,entity_type,entity_id,summary,details)
  values(auth.uid(),actor,lower(tg_op),'posts',row_id,message,detail);
  return case when tg_op='DELETE' then old else new end;
end;
$$;

drop trigger if exists crm_audit_trigger on public.posts;
drop trigger if exists post_change_audit_trigger on public.posts;
create trigger post_change_audit_trigger
after insert or update or delete on public.posts
for each row execute function public.record_post_change();

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='login_events') then
    alter publication supabase_realtime add table public.login_events;
  end if;
end $$;

notify pgrst,'reload schema';
