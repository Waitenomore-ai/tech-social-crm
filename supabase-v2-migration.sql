-- Tech Social CRM v2.0 migration
-- Run after supabase-media-migration.sql in Supabase Dashboard → SQL Editor.

-- Approved users can update only their own display name; email cannot be changed.
drop policy if exists "Approved users can update their own profile" on public.allowed_users;
create policy "Approved users can update their own profile"
on public.allowed_users for update to authenticated
using (email = lower(coalesce(auth.jwt() ->> 'email', '')))
with check (email = lower(coalesce(auth.jwt() ->> 'email', '')));

create table if not exists public.team_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('information','content_approval')),
  title text not null check (char_length(title) between 1 and 180),
  details text not null default '',
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','completed')),
  requested_by uuid references auth.users(id) on delete set null,
  requested_by_email text not null,
  requested_by_name text not null,
  assigned_to_email text,
  related_post_id text references public.posts(id) on delete set null,
  related_campaign_id text references public.campaigns(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_threads (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram','tiktok','facebook','x','linkedin','youtube','other')),
  contact_name text not null check (char_length(contact_name) between 1 and 160),
  contact_handle text not null default '',
  subject text not null default '',
  status text not null default 'open' check (status in ('open','waiting','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.social_threads(id) on delete cascade,
  message_type text not null check (message_type in ('inbound','outbound','internal')),
  body text not null check (char_length(body) between 1 and 10000),
  sender_name text not null,
  sender_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists team_requests_status_idx on public.team_requests(status, updated_at desc);
create index if not exists social_threads_last_message_idx on public.social_threads(last_message_at desc);
create index if not exists social_messages_thread_idx on public.social_messages(thread_id, created_at);

alter table public.team_requests enable row level security;
alter table public.social_threads enable row level security;
alter table public.social_messages enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['team_requests','social_threads','social_messages']
  loop
    execute format('drop policy if exists "Approved team can select" on public.%I', table_name);
    execute format('drop policy if exists "Approved team can insert" on public.%I', table_name);
    execute format('drop policy if exists "Approved team can update" on public.%I', table_name);
    execute format('drop policy if exists "Approved team can delete" on public.%I', table_name);
    execute format('create policy "Approved team can select" on public.%I for select to authenticated using (public.is_allowed_user())', table_name);
    execute format('create policy "Approved team can insert" on public.%I for insert to authenticated with check (public.is_allowed_user())', table_name);
    execute format('create policy "Approved team can update" on public.%I for update to authenticated using (public.is_allowed_user()) with check (public.is_allowed_user())', table_name);
    execute format('create policy "Approved team can delete" on public.%I for delete to authenticated using (public.is_allowed_user())', table_name);
  end loop;
end $$;

-- Real-time requests and inbox updates. Re-running is safe.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='team_requests') then
    alter publication supabase_realtime add table public.team_requests;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_threads') then
    alter publication supabase_realtime add table public.social_threads;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_messages') then
    alter publication supabase_realtime add table public.social_messages;
  end if;
end $$;
