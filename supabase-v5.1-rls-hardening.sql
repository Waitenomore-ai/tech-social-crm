-- Tech Social CRM v5.1 — Marketing / lead workflow RLS hardening
-- Run after supabase-v5-marketing-migration.sql and supabase-v5-lead-workflow.sql.
-- Safe to re-run.
--
-- Purpose:
-- 1. Keep Viewer genuinely read-only in the marketing workspace.
-- 2. Remove the broad social-lead update fallback introduced by the V5 lead workflow.
-- 3. Prevent create_social_lead() SECURITY DEFINER RPC from bypassing role-based insert rules.

begin;

-- ============================================================
-- SOCIAL LEADS — canonical role policies
-- ============================================================
alter table public.social_leads enable row level security;

drop policy if exists "Approved team can update social leads" on public.social_leads;
drop policy if exists "Marketing team read" on public.social_leads;
drop policy if exists "Marketing team insert" on public.social_leads;
drop policy if exists "Marketing team update" on public.social_leads;
drop policy if exists "Marketing editors delete" on public.social_leads;

create policy "Marketing team read"
on public.social_leads for select to authenticated
using (public.is_allowed_user());

create policy "Marketing team insert"
on public.social_leads for insert to authenticated
with check (public.has_team_role(array['admin','editor','approver']));

create policy "Marketing team update"
on public.social_leads for update to authenticated
using (public.has_team_role(array['admin','editor','approver']))
with check (public.has_team_role(array['admin','editor','approver']));

create policy "Marketing editors delete"
on public.social_leads for delete to authenticated
using (public.has_team_role(array['admin','editor']));

-- ============================================================
-- LEAD HISTORY — viewers read; working team writes
-- ============================================================
alter table public.social_lead_history enable row level security;

drop policy if exists "Approved team can select lead history" on public.social_lead_history;
drop policy if exists "Approved team can insert lead history" on public.social_lead_history;
drop policy if exists "Approved team can update lead history" on public.social_lead_history;
drop policy if exists "Approved team can delete lead history" on public.social_lead_history;
drop policy if exists "Marketing team read lead history" on public.social_lead_history;
drop policy if exists "Marketing team insert lead history" on public.social_lead_history;
drop policy if exists "Marketing team update lead history" on public.social_lead_history;
drop policy if exists "Marketing editors delete lead history" on public.social_lead_history;

create policy "Marketing team read lead history"
on public.social_lead_history for select to authenticated
using (public.is_allowed_user());

create policy "Marketing team insert lead history"
on public.social_lead_history for insert to authenticated
with check (public.has_team_role(array['admin','editor','approver']));

create policy "Marketing team update lead history"
on public.social_lead_history for update to authenticated
using (public.has_team_role(array['admin','editor','approver']))
with check (public.has_team_role(array['admin','editor','approver']));

create policy "Marketing editors delete lead history"
on public.social_lead_history for delete to authenticated
using (public.has_team_role(array['admin','editor']));

-- ============================================================
-- SECURITY DEFINER RPC — enforce the same role boundary
-- ============================================================
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
declare
  new_id uuid;
begin
  if not public.has_team_role(array['admin','editor','approver']) then
    raise exception 'Marketing write role required';
  end if;

  if char_length(trim(coalesce(p_name,''))) < 1 then
    raise exception 'Lead name is required';
  end if;

  insert into public.social_leads(
    name,
    platform,
    enquiry,
    campaign_id,
    email,
    phone,
    created_by
  ) values (
    trim(p_name),
    coalesce(nullif(trim(p_platform),''),'other'),
    coalesce(p_enquiry,''),
    p_campaign_id,
    coalesce(p_email,''),
    coalesce(p_phone,''),
    auth.uid()
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_social_lead(text,text,text,text,text,text) from public,anon;
grant execute on function public.create_social_lead(text,text,text,text,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
