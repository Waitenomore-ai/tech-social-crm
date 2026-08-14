-- Tech Social CRM — Supabase database and security setup
-- Run this entire file in Supabase Dashboard → SQL Editor.

create extension if not exists pgcrypto;

-- Only emails listed here can read or change CRM records.
create table if not exists public.allowed_users (
  email text primary key check (email = lower(email)),
  display_name text,
  added_at timestamptz not null default now()
);

create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_allowed_user() from public;
grant execute on function public.is_allowed_user() to authenticated;

alter table public.allowed_users enable row level security;
drop policy if exists "Approved users can view their own approval" on public.allowed_users;
create policy "Approved users can view their own approval"
on public.allowed_users for select
to authenticated
using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

create table if not exists public.campaigns (
  id text primary key,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  colour text not null default '#ef111b',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id text primary key,
  caption text not null check (char_length(caption) between 1 and 63206),
  link text not null default '',
  hashtags text not null default '',
  notes text not null default '',
  platforms text[] not null default '{}',
  scheduled_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','approval','scheduled','ready','published')),
  campaign_id text references public.campaigns(id) on delete set null,
  media_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.social_accounts (
  platform text primary key check (platform in ('instagram','tiktok','facebook','x','linkedin','youtube')),
  ready boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.social_accounts (platform, ready) values
  ('instagram', false), ('tiktok', false), ('facebook', false),
  ('x', false), ('linkedin', false), ('youtube', false)
on conflict (platform) do nothing;

alter table public.campaigns enable row level security;
alter table public.posts enable row level security;
alter table public.social_accounts enable row level security;

-- Every data operation requires an authenticated email in allowed_users.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['campaigns','posts','social_accounts']
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

-- Enable live team updates. Re-running this block is safe.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='posts') then
    alter publication supabase_realtime add table public.posts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='campaigns') then
    alter publication supabase_realtime add table public.campaigns;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_accounts') then
    alter publication supabase_realtime add table public.social_accounts;
  end if;
end $$;

-- IMPORTANT: replace these examples with the exact approved staff emails,
-- keep them lowercase, remove the leading --, then run those lines.
-- insert into public.allowed_users (email, display_name) values ('owner@example.com', 'Owner') on conflict (email) do nothing;
-- insert into public.allowed_users (email, display_name) values ('team@example.com', 'Team member') on conflict (email) do nothing;
