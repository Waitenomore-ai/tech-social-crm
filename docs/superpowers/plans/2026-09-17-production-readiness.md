# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Tech Social CRM into a verifiable `1.2.0-rc.1` release-candidate state with correct deployment assets, automated checks, CI, and a concrete production gate.

**Architecture:** Keep the existing static Supabase CRM architecture unchanged. Harden the delivery boundary by deploying the repository-root runtime assets through Workers Static Assets with an explicit `.assetsignore` allowlist, then enforce that contract with dependency-free Node tests and GitHub Actions.

**Tech Stack:** HTML/CSS/JavaScript, Supabase, Supabase Edge Functions, Cloudflare Workers Static Assets, Node.js 22 built-in test runner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-17-production-readiness-design.md`

## Global Constraints

- Freeze product feature development for this pass.
- Do not expose Meta App Secret, Supabase admin/service-role keys, or other server secrets in browser assets.
- Keep the existing full CRM architecture and Supabase RLS model intact.
- Do not auto-deploy from CI in this pass.
- Release candidate version is exactly `1.2.0-rc.1`.

---

### Task 1: Deployment Contract Test

**Files:**
- Create: `tests/production-readiness.test.mjs`
- Later modify: `wrangler.toml`
- Later create: `.assetsignore`

**Interfaces:**
- Consumes: repository files from the project root.
- Produces: tests that define the required Workers deployment target and browser asset allowlist.

- [ ] **Step 1: Write the failing deployment tests**

Create tests using `node:test`, `node:assert/strict`, and `fs/promises`. Assert that `wrangler.toml` contains `directory = "."`, `.assetsignore` exists, and the allowlist explicitly keeps `index.html`, `app.js`, `styles.css`, `config.js`, `_headers`, `sw.js`, `manifest.webmanifest`, `version-info.json`, `version-manager.js`, `marketing.js`, `lead-workflow.js`, and `vendor/supabase.js`.

- [ ] **Step 2: Run the test to verify RED**

Run: `node --test tests/production-readiness.test.mjs`
Expected: FAIL because Wrangler still targets `./site` and `.assetsignore` does not exist.

- [ ] **Step 3: Fix the deployment boundary**

Change `[assets] directory` in `wrangler.toml` from `./site` to `.`. Add `.assetsignore` with `*` followed by negated entries for every runtime file required by the root application, including the `vendor/` directory and `vendor/supabase.js`; the legacy `site/`, SQL migrations, docs, Supabase function source, backups, and package metadata remain ignored by default.

- [ ] **Step 4: Re-run the test**

Run: `node --test tests/production-readiness.test.mjs`
Expected: deployment tests PASS.

- [ ] **Step 5: Commit**

Commit message: `fix: deploy full CRM instead of legacy site`

### Task 2: Release and Security Contract Tests

**Files:**
- Modify: `tests/production-readiness.test.mjs`
- Modify: `package.json`
- Modify: `version.json`
- Modify: `version-info.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: release manifests, browser configuration, and `_headers`.
- Produces: an enforceable release/security contract and `npm test` / `npm run check` commands.

- [ ] **Step 1: Add failing release consistency tests**

Assert that `package.json.version`, `version.json.version`, and `version-info.json.current.version` all equal `1.2.0-rc.1`; assert the current release summary identifies it as a release candidate.

- [ ] **Step 2: Add failing security guard tests**

Read browser-delivered source files (`config.js`, `app.js`, `marketing.js`, `version-manager.js`) and assert they do not contain secret-value markers matching `sb_secret_`, `service_role`, `META_APP_SECRET=`, or `SUPABASE_ADMIN_KEY=`. Read `_headers` and assert it contains `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, `object-src 'none'`, and `frame-ancestors 'none'`.

- [ ] **Step 3: Run tests to verify RED**

Run: `node --test tests/production-readiness.test.mjs`
Expected: FAIL on release version mismatch.

- [ ] **Step 4: Update release metadata**

Set `package.json.version` to `1.2.0-rc.1`, add scripts `test` and `check` both running the production-readiness test, update `version.json`, and prepend a matching `1.2.0-rc.1` entry/current object in `version-info.json`. Update README heading/status copy to identify `1.2.0-rc.1` as the current release candidate while retaining historical feature documentation.

- [ ] **Step 5: Run tests to verify GREEN**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `test: enforce release and security readiness`

### Task 3: Continuous Integration

**Files:**
- Create: `.github/workflows/production-readiness.yml`

**Interfaces:**
- Consumes: package scripts from Task 2.
- Produces: GitHub Actions status checks for pushes and pull requests.

- [ ] **Step 1: Add CI workflow**

Configure checkout, Node 22, `npm ci`, `npm test`, and `npm run check`. Trigger on `push` and `pull_request`. Grant only `contents: read`.

- [ ] **Step 2: Validate workflow structure**

Confirm the workflow contains no deployment step, no secrets, no write permission, and uses the checked-in lockfile through `npm ci`.

- [ ] **Step 3: Commit**

Commit message: `ci: add production readiness checks`

### Task 4: Production Gate Documentation

**Files:**
- Create: `PRODUCTION_READINESS.md`

**Interfaces:**
- Consumes: existing Supabase/Meta setup documents and repository checks.
- Produces: the authoritative go-live checklist.

- [ ] **Step 1: Document repository checks**

Record `npm ci`, `npm test`, and `npm run check` as required pre-release commands; require a clean CI run on the release commit.

- [ ] **Step 2: Document Supabase checks**

List required database migrations, RLS/role smoke tests, storage upload/read tests, and Edge Function deployment for `meta-oauth-start`, `meta-oauth-callback`, `meta-webhook`, and `publish-meta`.

- [ ] **Step 3: Document Meta checks**

Require OAuth connect/reconnect, Facebook Page publish, Instagram Professional image publish, webhook challenge/signature handling, and inbound message verification. Explicitly note that Reels/Stories/carousels and API live replies are outside this RC scope.

- [ ] **Step 4: Document rollback and smoke tests**

Require a backup/export, known-good release reference, desktop/mobile/PWA smoke test, auth/role checks, version page check, and post-deploy verification that the full CRM—not the legacy local-storage site—is served.

- [ ] **Step 5: Commit**

Commit message: `docs: add production go-live gate`

### Task 5: Final Verification and PR

**Files:**
- No new production files unless verification uncovers an issue.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified release-candidate branch and reviewable pull request.

- [ ] **Step 1: Run complete checks**

Run: `npm ci && npm test && npm run check`
Expected: all commands exit 0.

- [ ] **Step 2: Review branch diff**

Verify no credentials or unrelated feature changes were introduced; confirm Wrangler target, allowlist, version metadata, CI workflow, tests, and production checklist are present.

- [ ] **Step 3: Open pull request**

Open a PR from `chore/production-readiness-2026-09-17` to `main` summarising the deployment blocker fix, tests, CI, release candidate metadata, and remaining live external gates.

- [ ] **Step 4: Check GitHub Actions status**

Inspect the PR/commit checks. If CI fails, diagnose and fix before declaring repository-side completion.