# Secure login and shared database setup

Tech Social CRM uses Supabase Auth, Postgres and Row Level Security.

**Current application release:** V1.1 Beta/Test.

> This document covers the core Supabase setup. The repository contains historical incremental migrations because the application evolved through several alpha generations. Existing installations should audit which migrations have already been applied before running anything again. See `ROADMAP.md` for the current beta-blocker checklist.

## 1. Create the project

1. Go to https://supabase.com/dashboard and sign in.
2. Select **New project**.
3. Choose your organisation.
4. Name it `tech-social-crm`.
5. Generate and safely store the database password.
6. Choose a UK or nearby European region and create the project.

## 2. Create and secure the database

1. In the project, open **SQL Editor**.
2. Select **New query**.
3. Open `supabase-setup.sql` from this package and paste the entire file.
4. At the bottom, replace the example approved-user lines with your real staff emails in lowercase. For example:

```sql
insert into public.allowed_users (email, display_name)
values ('owner@yourcompany.co.uk', 'Owner')
on conflict (email) do nothing;

insert into public.allowed_users (email, display_name)
values ('staff@yourcompany.co.uk', 'Staff member')
on conflict (email) do nothing;
```

5. Remove the leading `--` from the real lines and select **Run**.

The SQL enables Row Level Security. Signing in is not enough to read CRM records—the signed-in email must also exist in `allowed_users`.

### Migration history / existing installations

The repository contains both incremental migrations and later combined migrations. **Do not blindly rerun every historical migration against an existing database.** First identify the current schema level, then apply only the required later migrations.

Historical migration files include:

- `supabase-media-migration.sql` — private media Storage, media metadata and policies
- `supabase-v2-migration.sql` / `supabase-complete-v2-migration.sql` — profiles, team information, requests, social inbox and notes
- `supabase-meta-webhooks-migration.sql` — Meta webhook foundation
- `supabase-meta-publishing-migration.sql` — Meta OAuth/publishing storage and history
- `supabase-v3-roles-migration.sql` — Administrator, Editor, Approver and Viewer roles
- `supabase-v3.1-templates-migration.sql` — post templates
- `supabase-v3.2-notifications-migration.sql` — persistent notifications
- `supabase-v4-suite-migration.sql` / `supabase-v4-combined-migration.sql` — v4 collaboration/admin suite
- `supabase-v4.2-login-log-migration.sql` — login/change logging additions
- `supabase-v5-marketing-migration.sql` — marketing workspace, segmentation, reviews and reporting layer
- `supabase-v5-lead-workflow.sql` — lead assignment, follow-up, conversion and history additions
- `supabase-v5.1-rls-hardening.sql` — required security hardening for marketing/lead role policies; run after both v5 migrations above

For the marketing layer, follow **`V5_MARKETING_SETUP.md`**. For Meta connection and direct publishing, follow **`META_WEBHOOK_SETUP.md`** and **`META_PUBLISHING_SETUP.md`**.

Before production sign-off, record which migrations are present in the active Supabase project and verify the resulting RLS policies using real test accounts for each role.

## 3. Configure email/password authentication

1. Open **Authentication → Providers → Email**.
2. Ensure email/password authentication is enabled.
3. Keep email confirmation enabled for stronger account verification.
4. Open **Authentication → URL Configuration**.
5. Set **Site URL** to the final CRM address after deployment.
6. Add the final CRM address to **Redirect URLs**. During local testing, also add `http://localhost:4180/**`.

## 4. Add the public browser credentials

1. Open the project’s **Connect** panel or **Project Settings → API**.
2. Copy the **Project URL**.
3. Copy the **anon** or **publishable** key.
4. Open `config.js` and replace the two public browser values:

```js
window.TECH_SOCIAL_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY'
};
```

The anon/publishable key is designed for browser use and is restricted by the SQL policies. **Never use or expose the service_role key, Supabase admin/secret key, Meta app secret or any other server-only credential in `config.js`, browser code, GitHub commits or chat messages.**

## 5. Configure server-only Meta secrets when using direct publishing

Meta OAuth, webhook handling and direct publishing use Supabase Edge Functions. Keep all server-only values in the Supabase Edge Function secret store and follow `META_PUBLISHING_SETUP.md` for the exact currently required names.

The browser must only receive the public Supabase URL, public anon/publishable key and the signed-in user's normal session token.

## 6. Create team accounts

1. Open the CRM.
2. Select **Create account**.
3. Enter an email already listed in `allowed_users` and choose a password of at least eight characters.
4. Confirm the email if Supabase sends a confirmation message.
5. Return to the CRM and sign in.

Unlisted users may create a Supabase Auth identity if public sign-up is enabled, but Row Level Security prevents them from reading or changing CRM data and the app signs them back out.

## Add or remove staff later

Run one of these in **SQL Editor**:

```sql
-- Add
insert into public.allowed_users (email, display_name)
values ('newperson@yourcompany.co.uk', 'New person')
on conflict (email) do update set display_name = excluded.display_name;

-- Remove access immediately
delete from public.allowed_users
where email = 'person@yourcompany.co.uk';
```

Removing an allowlist row immediately prevents that email from reading or changing shared data, even if the user still has an Auth account.

## Password reset

On the login screen, enter the approved email and select **Forgot your password?** Supabase sends a secure reset link to the configured Site URL.

## Beta/Test verification before production

After setup or migration work, verify at minimum:

1. Administrator, Editor, Approver and Viewer permissions with separate accounts. Viewer must remain read-only, including Marketing and lead-history RPC paths.
2. Login, logout, password reset and expired-session behaviour.
3. Media upload, deduplication, reuse and deletion/archive behaviour.
4. Calendar scheduling, drag/drop and recurring content.
5. Approval, notifications and activity history.
6. Backup creation and a documented restore procedure.
7. Meta OAuth, webhook and supported publishing flows if Meta is enabled.
8. No server-only secret is present in browser-delivered files.

Track completion in `ROADMAP.md`.
