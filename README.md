# Tech Social CRM 1.2.0-rc.1

**Where Tech Meets Social**

A secure social-media content CRM for Tech Lab.

**Release status:** Release Candidate 1. Repository-side production hardening is in place; live Supabase and Meta verification remains an explicit go-live gate documented in `PRODUCTION_READINESS.md`.

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
- Password reset and in-app password changes
- Editable user profiles and personalised greetings
- Administrator, Editor, Approver and Viewer roles
- Server-enforced Row Level Security permissions
- Administrator team-member management
- Approval and request-changes workflow
- Real-time notification bell and dedicated Notification Centre
- Approval, request, inbox, due-soon and overdue alerts
- Per-user synchronised read/unread status
- Approval comments, decision reasons and full history
- Recurring weekly/monthly draft generation
- Drag-and-drop monthly and weekly calendar
- Media folders, tags, archive and cleanup indicators
- Content ideas board with convert-to-post workflow
- Activity log and downloadable analytics
- Company defaults and branding settings
- Daily 30-day metadata backup snapshots
- Version checker with release history and numbered changes
- Shared information and content-approval requests
- Manual social inbox with customer-message records and internal team notes
- Official Meta OAuth connection—no stored social passwords
- Encrypted Meta tokens in Supabase Vault
- Direct Facebook Page text/image publishing
- Direct Instagram Professional image publishing
- No service-role key in the browser
- Social-network passwords are never collected

Start with **`SUPABASE_SETUP.md`**. Existing installations that still need the historical version 4 schema baseline can run **`supabase-v4-combined-migration.sql`** in the Supabase SQL Editor, followed by later migrations required by the features in use. The public Project URL and anon/publishable key remain in **`config.js`**.

Before production deployment, complete **`PRODUCTION_READINESS.md`**.

## CRM features

- Dashboard with content, due, scheduled and published totals
- Monthly publishing calendar
- Reusable post templates with captions, hashtags, channels and campaigns
- Create templates directly from the post editor
- Social post records with captions, links, hashtags and internal notes
- Workflow statuses: Draft, Awaiting approval, Scheduled, Ready and Published
- Campaign management
- Publishing queue ordered by date and time
- Instagram, TikTok, Facebook, X, LinkedIn and YouTube destinations
- Official sign-in links and shared account-ready reminders
- Connected Meta publishing plus official composer workflows for unsupported/unconnected platforms
- Cloud backup export and import
- Responsive mobile layout
- Installable PWA with a locally bundled Supabase browser client

## Important social-network limitations

Connected Facebook Pages and Instagram Professional accounts can publish the supported text/image formats through the approved Meta OAuth/API connector. Other networks continue to open their official composer/upload pages for final confirmation.

Meta video, Reels, Stories and carousel publishing are not part of this release candidate. The Social Inbox can ingest verified Facebook/Instagram webhook messages, but sending live replies through Meta's messaging API remains a separate connector step and must follow Meta messaging-window policies.

Media filenames can be kept as a reference, but browsers do not allow one website to insert a local file into another website. For manual-composer destinations, select the same media again on the official publishing page.

## Run locally

```bash
python3 -m http.server 4180 --bind 0.0.0.0
```

Then open `http://localhost:4180`.

For repository checks with Node 22+:

```bash
npm test
npm run check
```

Until `config.js` contains valid Supabase public credentials, the app intentionally displays the one-time setup screen instead of an insecure local workspace.
