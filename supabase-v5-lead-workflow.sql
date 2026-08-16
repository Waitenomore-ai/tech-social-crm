-- Tech Social CRM V5 — Social Enquiries / Leads workflow enhancement
-- Run once in Supabase SQL Editor after the existing V5 marketing migration.
-- Safe to re-run.

alter table public.social_leads
  add column if not exists assigned_to_email text,
  add column if not exists follow_up_at timestamptz,
  add column if not exists converted_at timestamptz,
  add column if not exists converted_by uuid references auth.users(id) on delete set null;

create table if not exists public.social_lead_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.social_leads(id) on delete cascade,
  event_type text not null check (event_type in ('created','updated','status_changed','follow_up_set','converted','note')),
  from_status text,
  to_status text,
  note text not null default '',
  assigned_to_email text,
  follow_up_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists social_lead_history_lead_idx
  on public.social_lead_history(lead_id, created_at desc);

alter table public.social_lead_history enable row level security;

drop policy if exists "Approved team can select lead history" on public.social_lead_history;
drop policy if exists "Approved team can insert lead history" on public.social_lead_history;

drop policy if exists "Approved team can update lead history" on public.social_lead_history;
drop policy if exists "Approved team can delete lead history" on public.social_lead_history;

create policy "Approved team can select lead history"
on public.social_lead_history for select to authenticated
using (public.is_allowed_user());

create policy "Approved team can insert lead history"
on public.social_lead_history for insert to authenticated
with check (public.is_allowed_user());

create policy "Approved team can update lead history"
on public.social_lead_history for update to authenticated
using (public.is_allowed_user()) with check (public.is_allowed_user());

create policy "Approved team can delete lead history"
on public.social_lead_history for delete to authenticated
using (public.is_allowed_user());

-- Ensure the lead table itself permits the new workflow fields.
alter table public.social_leads enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='social_leads' and policyname='Approved team can update social leads'
  ) then
    create policy "Approved team can update social leads"
    on public.social_leads for update to authenticated
    using (public.is_allowed_user())
    with check (public.is_allowed_user());
  end if;
end $$;

-- Realtime history so the lead timeline can update for the team.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='social_lead_history'
  ) then
    alter publication supabase_realtime add table public.social_lead_history;
  end if;
end $$;

notify pgrst, 'reload schema';
