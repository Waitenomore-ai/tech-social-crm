-- Tech Social CRM v5.0 — Marketing / sales layer
--
-- Run this entire file once in the Supabase SQL Editor as the project owner.
-- It is intentionally additive: the repair CRM remains the source of truth for
-- customers, repairs, stock and sales. This layer stores marketing information.
--
-- Existing v4 tables such as posts, campaigns, media_assets and the social inbox
-- are NOT duplicated here.
--
-- Requires the v3 roles migration (is_allowed_user / has_team_role).
-- Safe to re-run: tables, columns, indexes, policies and triggers use IF NOT EXISTS
-- / drop-and-recreate patterns where appropriate.

begin;

-- ============================================================
-- 1. CUSTOMER SEGMENTS
-- ============================================================

create table if not exists public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  colour text not null default '#ef111b',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_segments add column if not exists active boolean not null default true;
alter table public.customer_segments add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.customer_segments add column if not exists created_at timestamptz not null default now();
alter table public.customer_segments add column if not exists updated_at timestamptz not null default now();

create unique index if not exists customer_segments_name_lower_idx
  on public.customer_segments (lower(name));
create index if not exists customer_segments_active_idx
  on public.customer_segments (active, name);

-- ============================================================
-- 2. SOCIAL LEADS
-- ============================================================

create table if not exists public.social_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null default '',
  phone text not null default '',
  platform text not null default 'other',
  handle text not null default '',
  enquiry text not null default '',
  status text not null default 'new',
  campaign_id text references public.campaigns(id) on delete set null,
  crm_customer_id text,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add newer fields when an earlier v5 draft has already created the table.
alter table public.social_leads add column if not exists segment_id uuid references public.customer_segments(id) on delete set null;
alter table public.social_leads add column if not exists source_reference text;
alter table public.social_leads add column if not exists handle text not null default '';
alter table public.social_leads add column if not exists crm_customer_id text;
alter table public.social_leads add column if not exists notes text not null default '';
alter table public.social_leads add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.social_leads add column if not exists created_at timestamptz not null default now();
alter table public.social_leads add column if not exists updated_at timestamptz not null default now();

create index if not exists social_leads_status_idx
  on public.social_leads(status, updated_at desc);
create index if not exists social_leads_platform_idx
  on public.social_leads(platform, created_at desc);
create index if not exists social_leads_campaign_idx
  on public.social_leads(campaign_id, created_at desc);
create index if not exists social_leads_segment_idx
  on public.social_leads(segment_id, created_at desc);
create index if not exists social_leads_crm_customer_idx
  on public.social_leads(crm_customer_id)
  where crm_customer_id is not null;
create index if not exists social_leads_email_idx
  on public.social_leads(lower(email))
  where email <> '';

comment on table public.social_leads is
  'Marketing leads originating from Facebook, Instagram, TikTok, Google, website or other channels. crm_customer_id is a reference to the separate Tech Lab CRM, not a duplicate customer record.';
comment on column public.social_leads.crm_customer_id is
  'Reference to the customer record in the separate Tech Lab repair CRM. Deliberately not a foreign key because the systems use separate databases.';

-- ============================================================
-- 3. REVIEW MANAGEMENT
-- ============================================================

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null default '',
  customer_phone text not null default '',
  repair_id text,
  repair_description text not null default '',
  status text not null default 'pending',
  review_url text not null default '',
  requested_at timestamptz,
  received_at timestamptz,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.review_requests add column if not exists crm_customer_id text;
alter table public.review_requests add column if not exists declined_at timestamptz;
alter table public.review_requests add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.review_requests add column if not exists created_at timestamptz not null default now();
alter table public.review_requests add column if not exists updated_at timestamptz not null default now();

create index if not exists review_requests_status_idx
  on public.review_requests(status, created_at desc);
create index if not exists review_requests_customer_idx
  on public.review_requests(crm_customer_id, created_at desc)
  where crm_customer_id is not null;
create index if not exists review_requests_repair_idx
  on public.review_requests(repair_id, created_at desc)
  where repair_id is not null;

comment on table public.review_requests is
  'Review opportunities generated after a customer interaction/repair. A future connector can populate these automatically from the Tech Lab repair CRM.';

-- ============================================================
-- 4. FOLLOW-UP CAMPAIGNS
-- ============================================================

create table if not exists public.followup_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null default 'manual',
  message_template text not null default '',
  active boolean not null default true,
  next_run_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists followup_campaigns_active_idx
  on public.followup_campaigns(active, next_run_at);

-- ============================================================
-- 5. INDIVIDUAL LEAD FOLLOW-UPS
-- ============================================================

create table if not exists public.lead_followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.social_leads(id) on delete cascade,
  campaign_id uuid not null references public.followup_campaigns(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'planned',
  sent_at timestamptz,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Compatibility columns for the richer follow-up workflow.
alter table public.lead_followups add column if not exists followup_campaign_id uuid references public.followup_campaigns(id) on delete set null;
alter table public.lead_followups add column if not exists completed_at timestamptz;
alter table public.lead_followups add column if not exists updated_at timestamptz not null default now();

create index if not exists lead_followups_schedule_idx
  on public.lead_followups(status, scheduled_at);
create index if not exists lead_followups_lead_idx
  on public.lead_followups(lead_id, created_at desc);
create index if not exists lead_followups_campaign_idx
  on public.lead_followups(campaign_id, scheduled_at);

comment on table public.lead_followups is
  'Individual follow-up actions against social leads. Actual outbound sending should be connected through approved email/Meta APIs rather than storing social passwords.';

-- ============================================================
-- 6. MONTHLY MARKETING REPORTS
-- ============================================================

create table if not exists public.marketing_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,
  posts_published integer not null default 0,
  reach bigint not null default 0,
  engagement bigint not null default 0,
  enquiries integer not null default 0,
  leads integer not null default 0,
  customers integer not null default 0,
  attributed_revenue numeric(12,2) not null default 0,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_reports_month_idx
  on public.marketing_monthly_reports(month desc);

comment on table public.marketing_monthly_reports is
  'Monthly marketing KPIs and revenue attributed to social/marketing activity.';

-- ============================================================
-- 7. UPDATED-AT TRIGGER
-- ============================================================

create or replace function public.touch_marketing_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_marketing_updated_at() from public, anon;
grant execute on function public.touch_marketing_updated_at() to authenticated;

drop trigger if exists touch_customer_segments_updated_at on public.customer_segments;
create trigger touch_customer_segments_updated_at
before update on public.customer_segments
for each row execute function public.touch_marketing_updated_at();

drop trigger if exists touch_social_leads_updated_at on public.social_leads;
create trigger touch_social_leads_updated_at
before update on public.social_leads
for each row execute function public.touch_marketing_updated_at();

drop trigger if exists touch_review_requests_updated_at on public.review_requests;
create trigger touch_review_requests_updated_at
before update on public.review_requests
for each row execute function public.touch_marketing_updated_at();

drop trigger if exists touch_followup_campaigns_updated_at on public.followup_campaigns;
create trigger touch_followup_campaigns_updated_at
before update on public.followup_campaigns
for each row execute function public.touch_marketing_updated_at();

drop trigger if exists touch_lead_followups_updated_at on public.lead_followups;
create trigger touch_lead_followups_updated_at
before update on public.lead_followups
for each row execute function public.touch_marketing_updated_at();

drop trigger if exists touch_marketing_monthly_reports_updated_at on public.marketing_monthly_reports;
create trigger touch_marketing_monthly_reports_updated_at
before update on public.marketing_monthly_reports
for each row execute function public.touch_marketing_updated_at();

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

alter table public.customer_segments enable row level security;
alter table public.social_leads enable row level security;
alter table public.review_requests enable row level security;
alter table public.followup_campaigns enable row level security;
alter table public.lead_followups enable row level security;
alter table public.marketing_monthly_reports enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'social_leads',
    'customer_segments',
    'review_requests',
    'followup_campaigns',
    'lead_followups',
    'marketing_monthly_reports'
  ] loop
    execute format('drop policy if exists "Marketing team can view" on public.%I', t);
    execute format('drop policy if exists "Marketing team can insert" on public.%I', t);
    execute format('drop policy if exists "Marketing team can update" on public.%I', t);
    execute format('drop policy if exists "Marketing team can delete" on public.%I', t);
    execute format('drop policy if exists "Marketing editors can insert" on public.%I', t);
    execute format('drop policy if exists "Marketing editors can update" on public.%I', t);
    execute format('drop policy if exists "Marketing editors can delete" on public.%I', t);
    execute format('drop policy if exists "Marketing team read" on public.%I', t);
    execute format('drop policy if exists "Marketing team insert" on public.%I', t);
    execute format('drop policy if exists "Marketing team update" on public.%I', t);
    execute format('drop policy if exists "Marketing editors delete" on public.%I', t);

    execute format('create policy "Marketing team read" on public.%I for select to authenticated using (public.is_allowed_user())', t);
    execute format('create policy "Marketing team insert" on public.%I for insert to authenticated with check (public.has_team_role(array[''admin'',''editor'',''approver'']))', t);
    execute format('create policy "Marketing team update" on public.%I for update to authenticated using (public.has_team_role(array[''admin'',''editor'',''approver''])) with check (public.has_team_role(array[''admin'',''editor'',''approver'']))', t);
    execute format('create policy "Marketing editors delete" on public.%I for delete to authenticated using (public.has_team_role(array[''admin'',''editor'']))', t);
  end loop;
end $$;

-- Explicit grants for the authenticated browser client. RLS is still the security boundary.
grant select, insert, update, delete on public.social_leads to authenticated;
grant select, insert, update, delete on public.customer_segments to authenticated;
grant select, insert, update, delete on public.review_requests to authenticated;
grant select, insert, update, delete on public.followup_campaigns to authenticated;
grant select, insert, update, delete on public.lead_followups to authenticated;
grant select, insert, update, delete on public.marketing_monthly_reports to authenticated;

-- ============================================================
-- 9. STARTER SEGMENTS
-- ============================================================
-- These can be edited or removed from the Marketing workspace.

insert into public.customer_segments(name, description, colour)
values
  ('Repair Customers', 'Customers who have previously used Tech Lab for repairs.', '#ef111b'),
  ('Laptop Buyers', 'People interested in laptops, refurbished laptops or business machines.', '#356fd5'),
  ('Gamers', 'Customers interested in gaming PCs, consoles and gaming laptops.', '#8a54cf'),
  ('Phone Buyers', 'Customers interested in phones and refurbished handsets.', '#18a56e'),
  ('Refurbished Device Buyers', 'People interested in refurbished phones, laptops and other devices.', '#e58b18')
on conflict (name) do nothing;

-- ============================================================
-- 10. LEAD CREATION HELPER FOR FUTURE WEBHOOK/INBOX INTEGRATION
-- ============================================================
-- The browser UI can insert directly under RLS. This RPC is provided for future
-- server-side/webhook use and does not contain any social passwords or tokens.

create or replace function public.create_social_lead(
  p_name text,
  p_platform text,
  p_enquiry text,
  p_campaign_id text default null,
  p_email text default '',
  p_phone text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  if not public.is_allowed_user() then
    raise exception 'Not authorised';
  end if;

  insert into public.social_leads(
    name, platform, enquiry, campaign_id, email, phone, created_by
  )
  values (
    trim(p_name), p_platform, coalesce(p_enquiry,''), p_campaign_id,
    coalesce(p_email,''), coalesce(p_phone,''), auth.uid()
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_social_lead(text,text,text,text,text,text) from public, anon;
grant execute on function public.create_social_lead(text,text,text,text,text,text) to authenticated;

-- ============================================================
-- 11. POSTGREST REFRESH
-- ============================================================

notify pgrst, 'reload schema';

commit;
