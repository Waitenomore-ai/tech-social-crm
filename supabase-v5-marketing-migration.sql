-- Tech Social CRM v5.0 — Marketing / lead / review layer
-- Run once in Supabase Dashboard -> SQL Editor after the existing v4 migration.
-- This deliberately does NOT duplicate the repair CRM customer or repair tables.

create table if not exists public.social_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 180),
  email text not null default '',
  phone text not null default '',
  platform text not null default 'other' check (platform in ('facebook','instagram','tiktok','google','website','other')),
  handle text not null default '',
  enquiry text not null default '',
  status text not null default 'new' check (status in ('new','contacted','quoted','interested','converted','lost')),
  campaign_id text references public.campaigns(id) on delete set null,
  crm_customer_id text,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_leads_status_idx on public.social_leads(status, updated_at desc);
create index if not exists social_leads_platform_idx on public.social_leads(platform, created_at desc);

create table if not exists public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 120),
  description text not null default '',
  colour text not null default '#ef111b',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_leads add column if not exists segment_id uuid references public.customer_segments(id) on delete set null;

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null default '',
  customer_phone text not null default '',
  repair_id text,
  repair_description text not null default '',
  status text not null default 'pending' check (status in ('pending','requested','received','declined')),
  review_url text not null default '',
  requested_at timestamptz,
  received_at timestamptz,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_requests_status_idx on public.review_requests(status, created_at desc);

create table if not exists public.followup_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  channel text not null default 'manual' check (channel in ('manual','email','facebook','instagram')),
  message_template text not null default '',
  active boolean not null default true,
  next_run_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.social_leads(id) on delete cascade,
  campaign_id uuid not null references public.followup_campaigns(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned','sent','cancelled')),
  sent_at timestamptz,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lead_followups_schedule_idx on public.lead_followups(status, scheduled_at);

create table if not exists public.marketing_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,
  posts_published integer not null default 0 check (posts_published >= 0),
  reach bigint not null default 0 check (reach >= 0),
  engagement bigint not null default 0 check (engagement >= 0),
  enquiries integer not null default 0 check (enquiries >= 0),
  leads integer not null default 0 check (leads >= 0),
  customers integer not null default 0 check (customers >= 0),
  attributed_revenue numeric(12,2) not null default 0 check (attributed_revenue >= 0),
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_reports_month_idx on public.marketing_monthly_reports(month desc);

do $$
declare t text;
begin
  foreach t in array array['social_leads','customer_segments','review_requests','followup_campaigns','lead_followups','marketing_monthly_reports'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists "Marketing team can view" on public.%I',t);
    execute format('drop policy if exists "Marketing editors can insert" on public.%I',t);
    execute format('drop policy if exists "Marketing editors can update" on public.%I',t);
    execute format('drop policy if exists "Marketing editors can delete" on public.%I',t);
    execute format('create policy "Marketing team can view" on public.%I for select to authenticated using (public.is_allowed_user())',t);
    execute format('create policy "Marketing editors can insert" on public.%I for insert to authenticated with check (public.has_team_role(array[''admin'',''editor'',''approver'']))',t);
    execute format('create policy "Marketing editors can update" on public.%I for update to authenticated using (public.has_team_role(array[''admin'',''editor'',''approver''])) with check (public.has_team_role(array[''admin'',''editor'',''approver'']))',t);
    execute format('create policy "Marketing editors can delete" on public.%I for delete to authenticated using (public.has_team_role(array[''admin'',''editor'']))',t);
  end loop;
end $$;

insert into public.customer_segments(name,description,colour) values
 ('Repair Customers','Customers who have previously used Tech Lab for repairs.','#ef111b'),
 ('Laptop Buyers','People interested in laptops, refurbished laptops or business machines.','#356fd5'),
 ('Gamers','Customers interested in gaming PCs, consoles and gaming laptops.','#8a54cf'),
 ('Phone Buyers','Customers interested in phones and refurbished handsets.','#18a56e')
on conflict (name) do nothing;

create or replace function public.touch_marketing_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['social_leads','customer_segments','review_requests','followup_campaigns','marketing_monthly_reports'] loop
    execute format('drop trigger if exists %I on public.%I', 'touch_'||t, t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_marketing_updated_at()', 'touch_'||t, t);
  end loop;
end $$;

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
set search_path=public
as $$
declare new_id uuid;
begin
  if not public.is_allowed_user() then raise exception 'Not authorised'; end if;
  insert into public.social_leads(name,platform,enquiry,campaign_id,email,phone,created_by)
  values(p_name,p_platform,p_enquiry,p_campaign_id,p_email,p_phone,auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.create_social_lead(text,text,text,text,text,text) from public,anon;
grant execute on function public.create_social_lead(text,text,text,text,text,text) to authenticated;

notify pgrst, 'reload schema';
