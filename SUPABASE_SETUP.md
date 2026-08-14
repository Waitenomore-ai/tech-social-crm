# Secure login and shared database setup

Tech Social CRM uses Supabase Auth, Postgres and Row Level Security. Allow about 10 minutes for this one-time setup.

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

### Add the private media library

After the main SQL succeeds, create another SQL Editor query and run the complete contents of `supabase-media-migration.sql`. This creates the private Storage bucket, compressed-media metadata table, post relationship, Row Level Security policies and live updates. Run this migration before uploading the media-library app update.

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
4. Open `config.js` and replace the two placeholders:

```js
window.TECH_SOCIAL_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY'
};
```

The anon/publishable key is designed for browser use and is restricted by the SQL policies. **Never use or expose the service_role key.**

## 5. Create team accounts

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
