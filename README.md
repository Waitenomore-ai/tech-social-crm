# Tech Social

> **Where Tech Meets Social**

Tech Social is Tech Lab's private, browser-based social publishing dashboard. Prepare one post, select destinations, and open the official posting pages for Instagram, TikTok, Facebook, X, LinkedIn and YouTube.

![Tech Social brand mark](site/tech-social-mark.png)

## Project structure

```text
site/                   Deploy-ready website files
.github/workflows/      Automatic GitHub Pages deployment
wrangler.toml           Cloudflare Workers static-assets configuration
package.json            Local and Cloudflare deployment commands
```

## Deploy with Cloudflare Workers Builds

This repository is configured for the default Cloudflare deploy command:

```bash
npx wrangler deploy
```

The Wrangler configuration publishes `./site` as static assets. No Worker entry-point or build command is required. The new directory name also ensures that any obsolete `public/_redirects` file left in an older repository is ignored.

In Cloudflare Builds use:

- **Build command:** Leave blank
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** `/`

Every push to the connected production branch will deploy automatically.

## Deploy with Cloudflare Pages from Git

If using the older Pages Git workflow instead:

- **Framework preset:** None
- **Build command:** Leave blank
- **Build output directory:** `site`

## Deploy with GitHub Pages

1. Upload the repository contents to the `main` branch.
2. Open **Settings → Pages**.
3. Choose **GitHub Actions** under Build and deployment.
4. Run the included “Deploy Tech Social to GitHub Pages” workflow.

## Run locally

```bash
npm install
npm run dev
```

Or serve the static directory directly:

```bash
python3 -m http.server 4173 --directory site
```

## Features

- Tech Lab red, charcoal and circuit-inspired visual identity
- Responsive dashboard and post composer
- Locally saved draft, hashtags, link and destinations
- Publishing-day calendar with a time picker and downloadable `.ics` reminder
- Dashboard status for planned and due posts
- Official social-network sign-in and publishing pages
- One action opens all selected posting pages
- Caption automatically copied for pasting
- Installable Progressive Web App
- No social passwords collected or stored

## Important limitation

Without approved API/OAuth developer access, social networks require the final post to be reviewed and confirmed on their own website. The publishing calendar saves a plan and can download a reminder; it cannot post in the background while the app is closed. Account “Ready” indicators are local reminders only.

## Privacy

Draft content, selected destinations and account-ready reminders are stored only in the current browser's local storage. Login cookies and saved passwords remain under the control of the browser and each social network.
