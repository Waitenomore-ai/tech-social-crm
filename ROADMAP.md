# Tech Social CRM Roadmap

**Current release:** V1.1 Beta/Test  
**Current focus:** integration verification, production hardening and release readiness

This file is the authoritative roadmap for Tech Social CRM. Historical version details remain in `version-info.json`.

## Status key

- ✅ Done — implemented in the repository
- 🟡 Testing / integration — implemented but still requires end-to-end verification, deployment configuration or external approval
- ⬜ Next — planned work required before a production release
- 🔮 Future — useful expansion that is not a current release blocker

## 1. Core CRM

- ✅ Supabase email/password authentication
- ✅ Approved-user allowlist
- ✅ PostgreSQL Row Level Security
- ✅ Administrator, Editor, Approver and Viewer roles
- ✅ Shared cloud records across approved team members and devices
- ✅ Editable profiles and personalised greetings
- ✅ Password reset and password change flows
- ✅ Dashboard and content totals
- ✅ Social post records and workflow statuses
- ✅ Campaign management
- ✅ Publishing queue
- ✅ Monthly and weekly calendars
- ✅ Drag-and-drop scheduling
- ✅ Recurring weekly/monthly draft generation
- ✅ Reusable post templates
- ✅ Approval and request-changes workflow
- ✅ Approval comments, decision reasons and history
- ✅ Notification Centre and read/unread state
- ✅ Due-soon and overdue alerts
- ✅ Content Ideas board
- ✅ Activity log
- ✅ Analytics and downloadable reporting
- ✅ Company defaults and branding settings
- ✅ Metadata backup snapshots
- ✅ Version checker and release history
- ✅ Installable PWA

## 2. Media Library

- ✅ Private Supabase Storage media library
- ✅ Client-side image resizing and WebP compression
- ✅ SHA-256 duplicate detection
- ✅ Reuse one stored media object across multiple posts
- ✅ Folders and tags
- ✅ Search and filtering
- ✅ Archive / cleanup indicators
- ✅ V1.1 Media Library visual redesign
- ✅ Recent Media desktop layout
- ✅ Media overview count cards
- ✅ Duplicate legacy toolbar removed from the active layout
- 🟡 Complete end-to-end browser/device regression testing of the V1.1 redesign

## 3. Meta / social publishing

- ✅ Official Meta OAuth foundation
- ✅ Encrypted Meta tokens in Supabase Vault
- ✅ Facebook Page text/link publishing implementation
- ✅ Facebook Page image publishing implementation
- ✅ Instagram Professional single-image feed publishing implementation
- ✅ Per-platform publish history and errors
- ✅ Meta webhook connector foundation
- ✅ OAuth return URLs restricted to the configured Tech Social CRM path
- ✅ OAuth state is atomically consumed before token exchange to prevent callback replay
- ✅ Local development CORS coverage includes the documented `localhost:4180` port
- ✅ `publish-meta` now enforces that requested Meta destinations are actually selected on the stored post
- ✅ Webhook verification now fails closed when `META_VERIFY_TOKEN` is missing
- ✅ Webhook POST rejects unsupported Meta object types after signature validation
- ✅ Meta setup documentation now includes required `META_CONFIG_ID`
- 🟡 Redeploy `meta-oauth-start`, `meta-oauth-callback`, `publish-meta` and `meta-webhook` so the live Supabase functions match the hardened repository source
- 🟡 Verify production Meta app configuration and required permissions
- 🟡 Verify OAuth connect/reconnect flow end to end
- 🟡 Verify Facebook publishing against the connected production Page
- 🟡 Verify Instagram Professional publishing against the connected production account
- 🟡 Verify inbound Facebook/Instagram webhook processing end to end
- ⬜ Add automated regression checks around supported Meta publishing flows
- 🔮 Facebook/Instagram video publishing
- 🔮 Reels
- 🔮 Stories
- 🔮 Carousel publishing
- 🔮 Approved API connectors for TikTok, X, LinkedIn and YouTube

Until a platform has an approved API connector, its official composer remains the supported fallback.

## 4. Marketing layer

- ✅ Social leads and lead pipeline
- ✅ Customer segments
- ✅ Review opportunities and review tracking
- ✅ Follow-up campaign/template layer
- ✅ Monthly marketing reports
- ✅ Attributed-revenue reporting foundation
- ✅ Marketing workspace
- ✅ Static RLS audit identified Viewer write bypasses in the V5 lead workflow/RPC path
- ✅ `supabase-v5.1-rls-hardening.sql` added to restore Viewer read-only permissions and align lead RPC writes with Administrator/Editor/Approver roles
- ✅ `supabase-beta-security-audit.sql` added as a read-only live-policy inspection script
- 🟡 Confirm `supabase-v5-marketing-migration.sql`, `supabase-v5-lead-workflow.sql` and `supabase-v5.1-rls-hardening.sql` have been applied to the active Supabase project
- 🟡 Verify live RLS behaviour with separate Administrator, Editor, Approver and Viewer accounts
- 🟡 Run end-to-end tests for lead, segment, review and reporting workflows
- ⬜ Connect outbound follow-up sending through approved email/Meta APIs

## 5. Tech Lab CRM integration

- ✅ `crm_customer_id` reference field exists for social leads
- ⬜ Build the Tech Social CRM → Tech Lab CRM hand-off when a social lead becomes a customer
- ⬜ Define conflict/duplicate handling between the two systems
- ⬜ Add audit history for hand-offs and sync failures
- 🔮 Two-way customer/marketing status sync where operationally useful

Tech Lab CRM remains the source of truth for customers, repairs, stock, sales and repair operations. Tech Social CRM remains the source of truth for content, publishing, campaigns, social enquiries, marketing leads, reviews and marketing reporting.

## 6. Beta blockers / release readiness

These items should be cleared before calling the application production-ready:

- ⬜ Confirm all required Supabase migrations are applied in the active environment
- 🟡 Static RLS review completed for core role and V5 marketing/lead paths; live role verification still required
- ⬜ Verify RLS policies for Administrator, Editor, Approver and Viewer with real test accounts
- ⬜ Verify authentication, reset-password and session-expiry flows
- ⬜ Complete supported-browser and mobile regression testing
- ⬜ Verify Media Library upload, deduplication, reuse, archive and deletion flows
- ⬜ Verify calendar drag/drop and recurring content generation
- ⬜ Verify approval, notification and activity-log integrity
- ⬜ Verify backup creation and restore procedure
- 🟡 Meta Edge Function static security hardening completed in source; live redeploy and E2E verification remain
- ⬜ Complete Meta OAuth/webhook/publishing E2E testing
- 🟡 Browser config checked for obvious service-role/admin secret exposure; broader live/deployment secret verification still required
- ⬜ Add a repeatable smoke-test checklist for every release
- ⬜ Establish a release-candidate tag/build after beta blockers pass

## 7. Release path

### V1.1 Beta/Test — current

Media Library redesign and beta hardening.

### V1.2 Beta/Test — next target

Integration verification and cleanup:

- Supabase migration audit
- Role/RLS verification
- Meta OAuth/publishing/webhook verification
- Marketing-layer verification
- Browser/mobile regression checks
- Documentation consistency

### V1.3 Release Candidate

- All beta blockers resolved
- Repeatable smoke tests passing
- Production configuration documented
- Rollback process verified

### V2.0 Production

- Production-ready baseline
- Stable supported Meta publishing
- Confirmed backup/restore and security checks
- Future social-network connectors can then ship independently

## 8. Documentation rules

- `ROADMAP.md` is the source of truth for planned and remaining work.
- `version.json` is the small machine-readable current-release record.
- `version-info.json` is the detailed release history.
- `README.md` describes the current product and setup entry points.
- Historical files may retain their original version names where they document migrations or past releases.

Last roadmap refresh: 17 September 2026.
