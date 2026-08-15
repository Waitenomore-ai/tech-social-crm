-- Tech Social CRM v2.3 — Safe Meta OAuth and publishing migration
-- Run after supabase-meta-webhooks-migration.sql.

create extension if not exists supabase_vault with schema vault;

alter table public.social_connections add column if not exists token_secret_id uuid;
alter table public.social_connections add column if not exists token_expires_at timestamptz;
alter table public.social_connections add column if not exists scopes text[] not null default '{}';
alter table public.social_connections add column if not exists connected_by uuid references auth.users(id) on delete set null;

create table if not exists public.social_oauth_states (
  state text primary key,
  provider text not null check (provider in ('meta')),
  user_id uuid not null references auth.users(id) on delete cascade,
  return_url text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.publish_attempts (
  id uuid primary key default gen_random_uuid(),
  post_id text references public.posts(id) on delete set null,
  platform text not null,
  connection_id uuid references public.social_connections(id) on delete set null,
  status text not null check (status in ('started','published','failed')),
  external_post_id text,
  error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists oauth_states_expiry_idx on public.social_oauth_states(expires_at);
create index if not exists publish_attempts_post_idx on public.publish_attempts(post_id, created_at desc);

alter table public.social_oauth_states enable row level security;
alter table public.publish_attempts enable row level security;

-- Approved users can see publish history but never OAuth states or decrypted tokens.
drop policy if exists "Approved team can view publish attempts" on public.publish_attempts;
create policy "Approved team can view publish attempts"
on public.publish_attempts for select to authenticated
using (public.is_allowed_user());

-- Server-only function: encrypt or replace an OAuth token in Supabase Vault.
create or replace function public.store_social_connection_token(
  p_connection_id uuid,
  p_token text,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_secret uuid;
  new_secret uuid;
begin
  select token_secret_id into existing_secret
  from public.social_connections
  where id = p_connection_id
  for update;

  if existing_secret is null then
    select vault.create_secret(
      p_token,
      'tech-social-connection-' || p_connection_id::text,
      'OAuth token for Tech Social connection ' || p_connection_id::text
    ) into new_secret;
  else
    perform vault.update_secret(existing_secret, p_token);
    new_secret := existing_secret;
  end if;

  update public.social_connections
  set token_secret_id = new_secret,
      token_expires_at = p_expires_at,
      updated_at = now()
  where id = p_connection_id;
end;
$$;

-- Server-only function: retrieve a decrypted token for an Edge Function.
create or replace function public.get_social_connection_token(p_connection_id uuid)
returns text
language sql
security definer
stable
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets secret
  join public.social_connections connection on connection.token_secret_id = secret.id
  where connection.id = p_connection_id;
$$;

revoke all on function public.store_social_connection_token(uuid,text,timestamptz) from public, anon, authenticated;
revoke all on function public.get_social_connection_token(uuid) from public, anon, authenticated;
grant execute on function public.store_social_connection_token(uuid,text,timestamptz) to service_role;
grant execute on function public.get_social_connection_token(uuid) to service_role;

notify pgrst, 'reload schema';
