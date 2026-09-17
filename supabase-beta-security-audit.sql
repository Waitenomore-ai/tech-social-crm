-- Tech Social CRM — Beta/Test security audit
-- READ ONLY: this file does not change schema, data or policies.
-- Run in Supabase SQL Editor after applying the required migrations.
-- Use the results to verify the live database before production sign-off.

-- ============================================================
-- 1. APPROVED USERS / ROLE DISTRIBUTION
-- ============================================================
select
  role,
  count(*) as approved_users
from public.allowed_users
group by role
order by role;

-- ============================================================
-- 2. RLS ENABLED ON CRITICAL TABLES
-- ============================================================
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public','storage')
  and c.relname in (
    'allowed_users',
    'posts',
    'campaigns',
    'media_assets',
    'social_threads',
    'social_messages',
    'social_connections',
    'webhook_events',
    'publish_attempts',
    'post_templates',
    'notifications',
    'notification_reads',
    'post_approval_events',
    'recurring_schedules',
    'media_folders',
    'content_ideas',
    'audit_log',
    'company_settings',
    'backup_snapshots',
    'customer_segments',
    'social_leads',
    'social_lead_history',
    'review_requests',
    'followup_campaigns',
    'lead_followups',
    'marketing_monthly_reports',
    'objects'
  )
order by schema_name, table_name;

-- ============================================================
-- 3. ALL POLICIES ON CRITICAL TABLES
-- ============================================================
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public','storage')
  and tablename in (
    'allowed_users',
    'posts',
    'campaigns',
    'media_assets',
    'team_requests',
    'social_threads',
    'social_messages',
    'social_accounts',
    'social_connections',
    'webhook_events',
    'publish_attempts',
    'post_templates',
    'notifications',
    'notification_reads',
    'post_approval_events',
    'recurring_schedules',
    'media_folders',
    'content_ideas',
    'audit_log',
    'company_settings',
    'backup_snapshots',
    'customer_segments',
    'social_leads',
    'social_lead_history',
    'review_requests',
    'followup_campaigns',
    'lead_followups',
    'marketing_monthly_reports',
    'objects'
  )
order by schemaname, tablename, cmd, policyname;

-- ============================================================
-- 4. MARKETING / LEAD POLICIES THAT SHOULD EXIST AFTER v5.1
-- ============================================================
select
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname='public'
  and tablename in ('social_leads','social_lead_history')
order by tablename, cmd, policyname;

-- Expected after supabase-v5.1-rls-hardening.sql:
-- social_leads:
--   SELECT  -> public.is_allowed_user()
--   INSERT  -> admin/editor/approver
--   UPDATE  -> admin/editor/approver
--   DELETE  -> admin/editor
-- social_lead_history:
--   SELECT  -> public.is_allowed_user()
--   INSERT  -> admin/editor/approver
--   UPDATE  -> admin/editor/approver
--   DELETE  -> admin/editor
--
-- There should NOT be an "Approved team can update social leads" policy.

select
  case
    when exists (
      select 1 from pg_policies
      where schemaname='public'
        and tablename='social_leads'
        and policyname='Approved team can update social leads'
    ) then 'FAIL: broad social_leads update policy still exists'
    else 'PASS: broad social_leads update policy absent'
  end as social_leads_broad_update_check;

select
  case
    when exists (
      select 1 from pg_policies
      where schemaname='public'
        and tablename='social_lead_history'
        and policyname in (
          'Approved team can insert lead history',
          'Approved team can update lead history',
          'Approved team can delete lead history'
        )
    ) then 'FAIL: broad lead-history write policy still exists'
    else 'PASS: broad lead-history write policies absent'
  end as lead_history_broad_write_check;

-- ============================================================
-- 5. SECURITY DEFINER FUNCTIONS AND EXECUTE GRANTS
-- ============================================================
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as function_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
  and p.proname in (
    'current_user_role',
    'has_team_role',
    'update_own_profile',
    'set_post_approval',
    'generate_due_notifications',
    'create_social_lead',
    'store_social_connection_token',
    'get_social_connection_token'
  )
order by p.proname;

select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema='public'
  and routine_name in (
    'current_user_role',
    'has_team_role',
    'update_own_profile',
    'set_post_approval',
    'generate_due_notifications',
    'create_social_lead',
    'store_social_connection_token',
    'get_social_connection_token'
  )
order by routine_name, grantee;

-- Meta token storage/retrieval functions should only be executable by service_role.
-- create_social_lead may be executable by authenticated users because the function
-- itself now requires admin/editor/approver before writing.

-- ============================================================
-- 6. TABLE GRANTS (RLS MUST STILL RESTRICT ROW ACCESS)
-- ============================================================
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and grantee in ('anon','authenticated')
  and table_name in (
    'allowed_users',
    'posts',
    'campaigns',
    'media_assets',
    'social_leads',
    'social_lead_history',
    'customer_segments',
    'review_requests',
    'followup_campaigns',
    'lead_followups',
    'marketing_monthly_reports',
    'social_connections',
    'webhook_events',
    'publish_attempts'
  )
order by table_name, grantee, privilege_type;

-- ============================================================
-- 7. REALTIME PUBLICATION CHECK
-- ============================================================
select
  schemaname,
  tablename
from pg_publication_tables
where pubname='supabase_realtime'
  and schemaname='public'
order by tablename;

-- ============================================================
-- LIVE ROLE TESTS STILL REQUIRED
-- ============================================================
-- Static policy inspection is not enough for production sign-off.
-- Test with separate real accounts for:
--   Administrator
--   Editor
--   Approver
--   Viewer
--
-- Viewer must be able to read permitted marketing data but must fail to:
--   insert/update/delete public.social_leads
--   insert/update/delete public.social_lead_history
--   create a lead through RPC public.create_social_lead(...)
