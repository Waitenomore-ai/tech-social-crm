# Upload and publish Tech Social CRM with GitHub

## Upload the repository

1. Download and extract `tech-social-crm-supabase.zip` on your computer.
2. Sign in at https://github.com.
3. Select **New repository**.
4. Name it `tech-social-crm`.
5. Do not add another README, `.gitignore`, or licence because they are already included.
6. Create the repository.
7. Select **Add file → Upload files**.
8. Drag every extracted file and folder into the upload area. Make sure the `vendor` folder is included.
9. Enter `Initial Tech Social CRM` as the commit message.
10. Select **Commit changes**.

Do not upload the ZIP itself. GitHub will store it as one download and will not unpack or publish the CRM.

## Publish with GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main**.
4. Select folder **/(root)**.
5. Select **Save**.
6. Wait for GitHub to finish the deployment.

The address will normally be:

```text
https://YOUR-GITHUB-USERNAME.github.io/tech-social-crm/
```

## Connect Supabase

Before team members can sign in:

1. Complete `SUPABASE_SETUP.md`.
2. Run `supabase-setup.sql` in the Supabase SQL Editor.
3. Add approved team emails.
4. Edit `config.js` in GitHub and enter the public Project URL and anon/publishable key.
5. In Supabase **Authentication → URL Configuration** set the GitHub Pages address as the Site URL.
6. Add both of these Redirect URLs, replacing the username:

```text
https://YOUR-GITHUB-USERNAME.github.io/tech-social-crm/
https://YOUR-GITHUB-USERNAME.github.io/tech-social-crm/**
```

The anon/publishable key is intended for browser use and is protected by Row Level Security. Never put a database password or service-role key in GitHub.
