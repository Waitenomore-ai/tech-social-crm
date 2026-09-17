# Tech Social CRM

**Current release: V1.1 Beta/Test**  
**Where Tech Meets Social**

A secure social-media content CRM for Tech Lab.

> For current progress, beta blockers and planned work, see [`ROADMAP.md`](ROADMAP.md). Historical release details are kept in `version-info.json`.

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
- Direct Facebook Page text/image publishing implementation
- Direct Instagram Professional single-image publishing implementation
- No service-role key in the browser
- Social-network passwords are never collected

## Current release and migrations

V1.1 Beta/Test is the current repository release and focuses on the Media Library redesign and beta hardening.

The database has evolved through multiple migration generations. Existing installations should use the migration appropriate to their current schema and verify that all later required migrations have also been applied. In particular, the repository includes the v4 combined suite, Meta publishing/webhook migrations and the v5 marketing migration.

Start with **`SUPABASE_SETUP.md`** for the core Supabase setup. The public Project URL and anon/publishable key remain in **`config.js`**. Server-only secrets must stay in Supabase/Edge Function configuration and must never be committed to the repository or exposed to browser code.

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
- One publishing action copies the caption and opens selected official composers when an API connector is unavailable
- Cloud backup export and import
- Responsive mobile layout
- Installable PWA with a locally bundled Supabase browser client

## Marketing layer

The repository also contains the Tech Social marketing layer documented in **`V5_MARKETING_SETUP.md`**, including:

- Social leads and lead pipeline
- Customer segments
- Review opportunities and review tracking
- Follow-up campaign templates
- Monthly marketing reports and attributed-revenue reporting
- Marketing workspace

Tech Lab CRM remains the source of truth for customers, repairs, stock, sales and repair operations. Tech Social CRM remains the source of truth for content, publishing, campaigns, social enquiries, marketing leads, reviews and marketing reporting. The direct hand-off between the two systems remains roadmap work.

## Social-network publishing status

Supported Meta publishing code is documented in **`META_PUBLISHING_SETUP.md`**. The current implementation includes Facebook Page text/link and image posts plus Instagram Professional single-image feed posts after official Meta OAuth authorisation and environment setup.

Video, Reels, Stories and carousels require additional workflows and are not part of the current supported Meta publishing baseline. TikTok, X, LinkedIn and YouTube still use their official/manual composer flow until approved API connectors are added.

The social inbox stores manual customer-message records and internal team notes. The Meta webhook foundation is documented in **`META_WEBHOOK_SETUP.md`** and requires end-to-end environment verification before production sign-off.

Media filenames can be kept as a reference, but browsers do not allow one website to insert a local file into another website. For manual composer flows, select the same media again on the official publishing page.

## Run locally

```bash
npm install
npm run dev
```

Or serve the current static application directly:

```bash
python3 -m http.server 4180 --bind 0.0.0.0
```

Then open `http://localhost:4180`.

Until `config.js` contains valid Supabase public credentials, the app intentionally displays the one-time setup screen instead of an insecure local workspace.

## Release status

Tech Social CRM is currently **Beta/Test**, not a production-final release. Before production sign-off, complete the beta-blocker checklist in [`ROADMAP.md`](ROADMAP.md), including migration verification, role/RLS testing, browser/mobile regression checks, backup/restore verification and Meta end-to-end testing.
