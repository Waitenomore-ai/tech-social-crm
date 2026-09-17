# Tech Social CRM v5.0 — Marketing layer

The existing CRM already provides the content calendar, posts, templates, media library, ideas, campaigns, approval workflow, publishing queue, social inbox, Meta connection, analytics and team administration.

This release adds the missing marketing/sales layer without duplicating the repair CRM:

- Social leads and lead pipeline
- Customer segments
- Review opportunities and review status tracking
- Follow-up campaign templates
- Monthly marketing reports with attributed revenue
- A Marketing workspace opened from the left sidebar

## Supabase migration order

For an installation that is adding the complete marketing/lead layer, apply these files in this order while signed in as the project owner:

1. `supabase-v5-marketing-migration.sql`
2. `supabase-v5-lead-workflow.sql`
3. `supabase-v5.1-rls-hardening.sql`

The v5.1 hardening migration is required for the current Beta/Test baseline. It restores the intended role boundary after the lead-workflow additions:

- Viewer stays read-only.
- Administrator, Editor and Approver can create/update marketing leads and lead history.
- Administrator and Editor can delete marketing leads/history records.
- The `create_social_lead()` SECURITY DEFINER RPC enforces the same write-role check instead of accepting every approved user.

The hardening migration is designed to be safe to re-run.

Then refresh Tech Social CRM. A new **Marketing** item appears in the left sidebar.

## Architecture

**Tech Lab CRM** remains the source of truth for customers, repairs, stock, sales and repair operations.

**Tech Social CRM** remains the source of truth for content, publishing, campaigns, social enquiries, marketing leads, reviews and marketing reporting.

The `crm_customer_id` field on a social lead is deliberately a reference rather than a second customer database. A future connector can populate it when a social lead becomes an actual Tech Lab CRM customer.

## Current workflow

`Social enquiry → Lead → Contacted → Quoted → Interested → Converted`

`Repair completed → Review opportunity → Requested → Received`

`Lead → Segment → Follow-up campaign → Future CRM hand-off`

The follow-up screen currently manages the campaign/template layer. Actual outbound sending should be connected through approved email/Meta APIs rather than storing social passwords or attempting to automate a consumer login.

## Beta/Test verification

Before production sign-off, test the Marketing workspace with separate Administrator, Editor, Approver and Viewer accounts. In particular, confirm that Viewer can read permitted marketing data but cannot create, edit or delete leads or lead-history records and cannot bypass those restrictions through the `create_social_lead()` RPC.
