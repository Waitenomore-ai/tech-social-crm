# Tech Social CRM v5.0 — Marketing layer

The existing CRM already provides the content calendar, posts, templates, media library, ideas, campaigns, approval workflow, publishing queue, social inbox, Meta connection, analytics and team administration.

This release adds the missing marketing/sales layer without duplicating the repair CRM:

- Social leads and lead pipeline
- Customer segments
- Review opportunities and review status tracking
- Follow-up campaign templates
- Monthly marketing reports with attributed revenue
- A Marketing workspace opened from the left sidebar

## One-time Supabase step

Run `supabase-v5-marketing-migration.sql` in the Supabase SQL Editor while signed in as the project owner.

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
