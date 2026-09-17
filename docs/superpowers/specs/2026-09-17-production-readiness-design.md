# Tech Social CRM Production Readiness Design

**Date:** 17 September 2026

## Goal

Move Tech Social CRM from Beta/Test to a verifiable release-candidate state without adding new product features.

## Scope

This pass freezes feature development and focuses on deployment correctness, automated repository checks, CI, release consistency, security guardrails, and a measurable production checklist.

## Confirmed blocker

`wrangler.toml` currently points Workers Static Assets at `./site`. The `site/` application is the older local-storage posting dashboard, while the repository-root application contains the full Supabase CRM. Production deployment must serve the root CRM assets instead of the legacy site copy.

## Design

1. **Deployment correctness**
   - Point Wrangler Static Assets at the repository root.
   - Add a root `.assetsignore` allowlist so only browser/runtime assets are uploaded; setup documents, SQL migrations, backups, Supabase function sources, package metadata, and the legacy `site/` copy are not published as static assets.
   - Keep `_headers` in the asset set so Workers applies the existing CSP and security headers.

2. **Automated production checks**
   - Use Node's built-in test runner; do not add a test framework dependency.
   - Add tests that fail when Wrangler targets the legacy site, required runtime assets are excluded, release manifests disagree, browser assets contain server-secret markers, or required security headers disappear.
   - Add `npm test` and `npm run check` scripts.

3. **CI**
   - Add a GitHub Actions workflow for pushes and pull requests.
   - Use Node 22, `npm ci`, tests, and repository checks.
   - Do not deploy from CI in this pass; deployment remains an explicit release action.

4. **Release consistency**
   - Promote repository metadata to `1.2.0-rc.1`.
   - Make `package.json`, `version.json`, and `version-info.json` agree.
   - Describe the RC as production-hardening work, not as proof that external Meta/Supabase checks have already passed.

5. **Production gate**
   - Add a checklist covering Supabase migrations, Edge Function deployment, secrets, Meta OAuth/webhook validation, role/RLS smoke tests, backup/rollback, browser/device checks, and final deploy verification.
   - External systems requiring account credentials remain explicit manual/live gates.

## Security constraints

- Never place Meta App Secret, Supabase admin/service-role keys, or other server secrets in browser-delivered assets.
- The public Supabase project URL and publishable/anon key may remain in `config.js`; authorization continues to rely on Supabase authentication/RLS and server-side function checks.
- Keep CSP, frame protection, referrer policy, content-type protection, and restrictive permissions policy in `_headers`.

## Completion criteria

The repository-side pass is complete when the production-readiness tests pass, GitHub Actions is configured, release metadata is consistent, Wrangler serves the full CRM asset set rather than `site/`, and the production checklist clearly identifies the remaining live external verifications.