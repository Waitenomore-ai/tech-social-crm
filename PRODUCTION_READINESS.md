# Tech Social CRM — Production Readiness Gate

**Release candidate:** `1.2.0-rc.1`  
**Date:** 17 September 2026

This checklist is the authority for moving the current release candidate to production. Do not mark the release production-ready until every applicable item is checked against the live environment.

## 1. Repository gate

- [ ] `npm ci` completes successfully with Node.js 22 or newer.
- [ ] `npm test` passes all production-readiness tests.
- [ ] `npm run check` passes syntax checks for every deployed JavaScript asset.
- [ ] GitHub Actions **Production readiness** is green on the exact release commit.
- [ ] `wrangler.toml` points Workers Static Assets at `.` and not `./site`.
- [ ] `.assetsignore` remains default-deny and publishes only the approved browser/runtime asset set.
- [ ] `package.json`, `version.json`, and `version-info.json` all identify `1.2.0-rc.1` before RC testing. Promote all release metadata together when creating the final production version.
- [ ] No server secret values are present in browser-delivered JavaScript.
- [ ] `_headers` still supplies CSP, `nosniff`, referrer policy, permissions policy, `object-src 'none'`, and `frame-ancestors 'none'`.

## 2. Backup and rollback gate

Before changing the live database or deployment:

- [ ] Export/download the latest application metadata backup.
- [ ] Confirm a current Supabase database backup or point-in-time recovery option exists for the project.
- [ ] Record the currently deployed Git commit/release reference.
- [ ] Confirm the previous known-good Cloudflare deployment can be restored.
- [ ] Do not run a migration blindly if it may already have been applied; verify the live schema first.

## 3. Supabase database gate

Verify the live project contains the schema required by the features enabled in this release. Apply only migrations that are not already present.

### Core and collaboration

- [ ] Baseline/core schema from `supabase-setup.sql` is present.
- [ ] Required v2/v3 collaboration/auth/role objects are present.
- [ ] The version 4 suite represented by `supabase-v4-combined-migration.sql` is present for installations upgraded from the earlier baseline.
- [ ] Media-library tables, policies and storage objects required by the current UI are present.

### Marketing

- [ ] Objects from `supabase-v5-marketing-migration.sql` are present.
- [ ] `social_leads`, `review_requests`, `customer_segments`, `followup_campaigns`, `lead_followups`, and `marketing_monthly_reports` can be queried by an authorised user.
- [ ] The Marketing workspace opens without a missing-table/setup error.

### Meta connectors

- [ ] Objects required by `supabase-meta-webhooks-migration.sql` are present for inbound message/webhook handling.
- [ ] Objects required by `supabase-meta-publishing-migration.sql` are present for OAuth state, encrypted token references and publish-attempt history.
- [ ] Any prerequisite objects documented by `supabase-complete-v2-migration.sql` are present before webhook testing.

## 4. Supabase security/RLS gate

Use separate test users for each role where possible.

- [ ] Unapproved email addresses cannot gain normal workspace access.
- [ ] Approved users can sign in and sign out successfully.
- [ ] Password reset works.
- [ ] Administrator can perform administrator-only team/settings actions.
- [ ] Editor can create/edit allowed content but cannot perform administrator-only operations.
- [ ] Approver can use the intended review/approval workflow and cannot exceed that role.
- [ ] Viewer remains read-only where intended.
- [ ] Cross-user shared records are visible only according to the expected policies.
- [ ] Private media storage cannot be read anonymously.
- [ ] Browser clients cannot access/decrypt Supabase Vault secrets or use a service-role/admin key.

## 5. Supabase Edge Function gate

Deploy/verify the current repository versions of:

- [ ] `meta-oauth-start`
- [ ] `meta-oauth-callback`
- [ ] `meta-webhook`
- [ ] `publish-meta`

Confirm the server-side secret store contains the values required by the connector configuration, including as applicable:

- [ ] `META_APP_ID`
- [ ] `META_APP_SECRET`
- [ ] `META_VERIFY_TOKEN`
- [ ] `META_GRAPH_VERSION`
- [ ] `CRM_RETURN_URL`
- [ ] `SUPABASE_ADMIN_KEY`

Never place these server-only values in `config.js`, GitHub, browser storage, screenshots, support messages or chat logs.

## 6. Meta OAuth and publishing gate

With the real Meta developer app and Tech Lab accounts:

- [ ] OAuth starts only for an authenticated authorised CRM user.
- [ ] Meta callback returns to the expected CRM URL.
- [ ] Facebook Page connection succeeds.
- [ ] Linked Instagram Professional account connection succeeds where configured.
- [ ] Disconnect/revocation is handled cleanly.
- [ ] Reconnect works after an expired/revoked connection.
- [ ] Facebook Page text/link publish succeeds.
- [ ] Facebook Page image publish succeeds.
- [ ] Instagram Professional single-image feed publish succeeds.
- [ ] Failed publishes create a visible error/history record instead of silently marking the post Published.

### Explicitly outside this RC scope

The following are not completion blockers for `1.2.0-rc.1` and must not be represented as supported unless separately implemented and tested:

- Meta video publishing
- Reels
- Stories
- Carousel publishing
- Sending live Social Inbox replies through Meta's messaging API

## 7. Meta webhook / Social Inbox gate

- [ ] Meta webhook verification challenge succeeds with the configured verify token.
- [ ] Invalid `X-Hub-Signature-256` requests are rejected.
- [ ] Valid Facebook/Instagram message events are accepted.
- [ ] Duplicate retries do not create duplicate messages.
- [ ] A real inbound Facebook Page message appears in Social Inbox.
- [ ] A real inbound Instagram Professional message appears where the account/product supports it.
- [ ] Connection status/last webhook information updates as expected.

## 8. Core end-to-end smoke test

Run these against the release-candidate deployment with a non-admin test user first, then role-specific accounts as needed.

- [ ] Dashboard loads the full Supabase CRM, not the legacy local-storage `site/` application.
- [ ] Create a post draft.
- [ ] Edit and save the post.
- [ ] Assign a campaign.
- [ ] Apply/save a reusable template.
- [ ] Schedule the post and confirm it appears in calendar/queue views.
- [ ] Submit it for approval.
- [ ] Add approval comments / request changes.
- [ ] Approve it with the intended role.
- [ ] Upload a media item and confirm private storage access.
- [ ] Search/filter media.
- [ ] Create a content idea and convert it to a post.
- [ ] Confirm notification creation and read/unread synchronisation.
- [ ] Confirm another authorised session receives expected real-time updates.
- [ ] Create/update a Marketing lead.
- [ ] Confirm Marketing reporting loads.
- [ ] Confirm activity/audit history records the expected actions.
- [ ] Confirm export/backup controls complete successfully.

## 9. Browser, mobile and PWA gate

At minimum test:

- [ ] Current Chromium desktop browser.
- [ ] Current Firefox desktop browser.
- [ ] Current Safari/WebKit where available.
- [ ] iPhone/iPad layout and Add to Home Screen flow.
- [ ] Android layout and install/add-to-home-screen flow.
- [ ] PWA launch after installation.
- [ ] Service-worker update from a previous cached build to the RC.
- [ ] Login remains usable after cache/service-worker refresh.
- [ ] Media Library controls fit without horizontal overflow at supported breakpoints.

## 10. Cloudflare release gate

Before deployment:

- [ ] Confirm `wrangler.toml` is using Workers Static Assets with `directory = "."`.
- [ ] Confirm `.assetsignore` excludes the legacy `site/` tree, migrations, docs, setup files and server-function source by default.
- [ ] Run `npm test` and `npm run check` immediately before deploy.

Deploy using the normal authorised Cloudflare workflow, then verify:

- [ ] The home page is the full Tech Social CRM login/workspace.
- [ ] `config.js` is reachable and contains only the public Supabase project URL/publishable key plus browser code.
- [ ] `_headers` policies are present on live responses.
- [ ] The current version page shows the intended release metadata.
- [ ] Authentication works against the live Supabase project.
- [ ] No console-blocking CSP errors prevent Supabase, WebSocket or required local assets from loading.
- [ ] A complete smoke test succeeds after deployment.

## 11. Final promotion decision

Promote the RC to a final production version only when:

- [ ] Repository CI is green.
- [ ] All applicable Supabase/RLS checks are green.
- [ ] All supported Meta OAuth/publishing/webhook checks are green.
- [ ] Core E2E smoke test is green.
- [ ] Browser/mobile/PWA smoke tests are green.
- [ ] Rollback path has been confirmed.

If any live external gate fails, keep the release labelled **Release Candidate** and fix/test the failing gate before production promotion.
