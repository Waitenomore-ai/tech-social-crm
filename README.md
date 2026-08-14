# Tech Social CRM

**Where Tech Meets Social**

A secure social-media content CRM for Tech Lab.

## Security and team access

- Supabase email/password authentication
- Approved-email allowlist
- PostgreSQL Row Level Security on every shared table
- Shared cloud records across approved team members and devices
- Private Supabase Storage media library with approved-user policies
- Client-side image resizing and WebP compression
- SHA-256 duplicate detection so matching files are stored once
- One media object reused by multiple posts
- Live updates when another team member changes content
- Password reset flow
- No service-role key in the browser
- Social-network passwords are never collected

Start with **`SUPABASE_SETUP.md`**. Run **`supabase-setup.sql`** in the Supabase SQL Editor, then place the public Project URL and anon/publishable key in **`config.js`**.

## CRM features

- Dashboard with content, due, scheduled and published totals
- Monthly publishing calendar
- Social post records with captions, links, hashtags and internal notes
- Workflow statuses: Draft, Awaiting approval, Scheduled, Ready and Published
- Campaign management
- Publishing queue ordered by date and time
- Instagram, TikTok, Facebook, X, LinkedIn and YouTube destinations
- Official sign-in links and shared account-ready reminders
- One publishing action copies the caption and opens selected official composers
- Cloud backup export and import
- Responsive mobile layout
- Installable PWA with a locally bundled Supabase browser client

## Important social-network limitation

This no-developer-account version cannot publish automatically in the background. It opens each social network's official composer for final confirmation. Social passwords are never collected or stored.

Media filenames can be kept as a reference, but browsers do not allow one website to insert the local file into another website. Select the same media again on the official publishing page.

## Run locally

```bash
python3 -m http.server 4180 --bind 0.0.0.0
```

Then open `http://localhost:4180`.

Until `config.js` contains valid Supabase public credentials, the app intentionally displays the one-time setup screen instead of an insecure local workspace.
