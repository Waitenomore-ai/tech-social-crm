# Meta OAuth and automatic publishing setup — Tech Social CRM

This connector publishes directly to a Facebook Page and Instagram Professional account after one official Meta OAuth authorisation. It never stores Meta usernames or passwords.

## Current supported publishing baseline

- Facebook Page text/link posts
- Facebook Page image posts
- Instagram Professional single-image feed posts
- Encrypted OAuth tokens in Supabase Vault
- Reconnect flow when Meta access expires or is revoked
- Per-platform publish history and errors

Video, reels, stories and carousels require additional upload/status workflows and are not enabled in this release.

## 1. Run the database migration

In Supabase SQL Editor, run:

```text
supabase-meta-publishing-migration.sql
```

This adds OAuth state, encrypted Vault token references and publish-attempt history.

If the V5 marketing/lead migrations are also installed, apply `supabase-v5.1-rls-hardening.sql` afterwards as documented in `SUPABASE_SETUP.md`.

## 2. Configure Edge Function secrets

In Supabase **Edge Functions → Secrets**, add:

```text
META_APP_ID            Your Meta App ID
META_APP_SECRET        Your Meta App Secret
META_CONFIG_ID         Your Facebook Login for Business configuration ID
META_VERIFY_TOKEN      Your webhook verification token
META_GRAPH_VERSION     v25.0
CRM_RETURN_URL         https://waitenomore-ai.github.io/tech-social-crm/
SUPABASE_ADMIN_KEY     Supabase server-only secret/service-role key used by the Edge Functions
```

`META_CONFIG_ID` is required by `meta-oauth-start`. It identifies the Facebook Login for Business configuration that defines the business assets and permissions requested during OAuth.

Never add these values to GitHub, `config.js`, browser code or chat messages. `CRM_RETURN_URL` must point to the Tech Social CRM path, not merely the shared GitHub Pages origin.

## 3. Deploy or redeploy the functions

From the repository root:

```bash
supabase login
supabase link --project-ref yyxliadpoxpwbxojmqdk
supabase functions deploy meta-oauth-start --no-verify-jwt
supabase functions deploy meta-oauth-callback --no-verify-jwt
supabase functions deploy publish-meta --no-verify-jwt
supabase functions deploy meta-webhook --no-verify-jwt
```

Redeploy all four after pulling security changes from the repository so the live Edge Functions match source control.

The functions are public at the network layer because Meta callbacks/webhooks cannot present a normal CRM user JWT. They therefore perform their own checks:

- `meta-oauth-start` validates the signed-in Tech Social user and requires the Administrator role.
- `meta-oauth-callback` validates and atomically consumes the one-time OAuth state before exchanging the Meta code.
- `publish-meta` validates the signed-in user and requires Administrator or Approver permission before publishing.
- `meta-webhook` validates Meta's `X-Hub-Signature-256` HMAC signature before ingesting data.

## 4. Configure Facebook Login for Business

In the Meta developer app, configure Facebook Login for Business and note the configuration ID. Store that value as `META_CONFIG_ID` in the Supabase Edge Function secrets.

Add this exact Valid OAuth Redirect URI:

```text
https://yyxliadpoxpwbxojmqdk.supabase.co/functions/v1/meta-oauth-callback
```

Expected permissions include:

```text
pages_show_list
pages_read_engagement
pages_manage_posts
pages_manage_metadata
business_management
instagram_basic
instagram_content_publish
```

Meta may show different permission names depending on the products enabled on the app. Follow the current Meta developer dashboard and approved permissions for the connected business assets.

## 5. Configure the webhook

Use the deployed endpoint:

```text
https://yyxliadpoxpwbxojmqdk.supabase.co/functions/v1/meta-webhook
```

Use the same secret value stored as `META_VERIFY_TOKEN` when Meta asks for the webhook verify token.

The live webhook should not be considered configured until both verification and a signed test event succeed.

## 6. Connect the accounts

1. Sign in to Tech Social CRM as an Administrator.
2. Open **Settings → Connections**.
3. Select **Connect Facebook & Instagram**.
4. Complete Meta's official login and consent screen.
5. Select the Facebook Page and linked Instagram Professional account.
6. Meta redirects back to the Tech Social CRM path.
7. Connected accounts appear with green status dots.

The Page/Instagram access tokens are encrypted in Supabase Vault. The CRM browser cannot query or decrypt them.

OAuth state records expire after ten minutes and are single-use. If a connection attempt fails after the callback begins, start a new connection rather than reusing the callback URL.

## 7. Publish

1. Create or edit a post.
2. Select Facebook and/or Instagram on the post itself.
3. For Instagram, select an image from the Media Library.
4. Open the post in the Publishing Queue.
5. Select **Publish connected Meta accounts**.

The server only accepts Meta destinations that are also selected on the stored post. A request cannot add Facebook or Instagram as a publishing destination merely by sending it in the Edge Function request.

If every selected destination is published successfully, Tech Social marks the post Published when every platform on that post has been handled. Unsupported or unconnected platforms remain available through the manual composer buttons until their own API connector is installed.

## 8. Beta/Test verification checklist

Before production sign-off, verify all of the following against the deployed functions:

- OAuth start rejects unauthenticated users.
- OAuth start rejects Editor, Approver and Viewer roles.
- OAuth return URLs outside the Tech Social CRM path are rejected/fall back to `CRM_RETURN_URL`.
- Reusing the same OAuth callback state fails.
- OAuth token data never appears in browser responses or CRM tables.
- `publish-meta` rejects Viewer and Editor roles.
- `publish-meta` cannot publish to a Meta platform that was not selected on the post.
- Local development on port `4180` passes CORS preflight.
- Webhook GET verification fails if `META_VERIFY_TOKEN` is absent or incorrect.
- Webhook POST rejects missing/invalid `X-Hub-Signature-256` signatures.
- A valid signed Facebook/Instagram message is recorded only once when Meta retries the same event.

Keep this checklist open until the tests are performed against the active Supabase project.
