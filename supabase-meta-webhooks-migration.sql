-- Tech Social CRM v2.1 — Meta webhook connector migration
-- Run after supabase-complete-v2-migration.sql.

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook','instagram','tiktok','x','linkedin','youtube')),
  external_account_id text not null,
  account_name text not null default '',
  status text not null default 'connected' check (status in ('connected','attention','disconnected')),
  webhook_enabled boolean not null default true,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, external_account_id)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  external_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (platform, external_event_id)
);

alter table public.social_threads add column if not exists external_thread_id text;
alter table public.social_threads add column if not exists external_account_id text;
alter table public.social_threads add column if not exists source text not null default 'manual' check (source in ('manual','webhook'));
alter table public.social_messages add column if not exists external_id text;
alter table public.social_messages add column if not exists raw_payload jsonb;

create unique index if not exists social_threads_external_unique
on public.social_threads(platform, external_account_id, external_thread_id)
where external_thread_id is not null;

create unique index if not exists social_messages_external_unique
on public.social_messages(external_id)
where external_id is not null;

create index if not exists webhook_events_received_idx on public.webhook_events(received_at desc);
create index if not exists social_connections_platform_idx on public.social_connections(platform, status);

alter table public.social_connections enable row level security;
alter table public.webhook_events enable row level security;

-- Approved CRM users can view connector status. Tokens are never stored in these tables.
drop policy if exists "Approved team can view social connections" on public.social_connections;
create policy "Approved team can view social connections"
on public.social_connections for select to authenticated
using (public.is_allowed_user());

-- Webhook event payloads can contain personal data, so only approved users may view them.
drop policy if exists "Approved team can view webhook events" on public.webhook_events;
create policy "Approved team can view webhook events"
on public.webhook_events for select to authenticated
using (public.is_allowed_user());

-- Edge Functions use a server-side secret key to insert and update connector data.
-- No browser insert/update/delete policies are created for these two tables.

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_connections') then
    alter publication supabase_realtime add table public.social_connections;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='webhook_events') then
    alter publication supabase_realtime add table public.webhook_events;
  end if;
end $$;

notify pgrst, 'reload schema';
