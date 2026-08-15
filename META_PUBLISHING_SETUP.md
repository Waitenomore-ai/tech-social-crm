# Meta OAuth and automatic publishing setup — Tech Social CRM 2.3

This connector publishes directly to a Facebook Page and Instagram Professional account after one official Meta OAuth authorisation. It never stores Meta usernames or passwords.

## Supported in version 2.3

- Facebook Page text/link posts
- Facebook Page image posts
- Instagram Professional single-image feed posts
- Encrypted OAuth tokens in Supabase Vault
- Reconnect flow when Meta access expires or is revoked
- Per-platform publish history and errors

Video, reels, stories and carousels require additional upload/status workflows and are not enabled in this first publishing release.

## 1. Run the database migration

In Supabase SQL Editor, run:

```text
supabase-meta-publishing-migration.sql
```

This adds OAuth state, encrypted Vault token references and publish-attempt history.

## 2. Configure Edge Function secrets

In Supabase **Edge Functions → Secrets**, add:

```text
META_APP_ID            Your Meta App ID
META_APP_SECRET        Your Meta App Secret
META_VERIFY_TOKEN      Existing webhook verification token
META_GRAPH_VERSION     v25.0
CRM_RETURN_URL         https://waitenomore-ai.github.io/tech-social-crm/
SUPABASE_ADMIN_KEY     Supabase server-only sb_secret_... key
```

Never add these values to GitHub, `config.js`, browser code or chat messages.

## 3. Deploy the functions

From the repository root:

```bash
supabase login
supabase link --project-ref yyxliadpoxpwbxojmqdk
supabase functions deploy meta-oauth-start --no-verify-jwt
supabase functions deploy meta-oauth-callback --no-verify-jwt
supabase functions deploy publish-meta --no-verify-jwt
```

If the inbound message webhook has not been deployed yet:

```bash
supabase functions deploy meta-webhook --no-verify-jwt
```

The functions are public at the network layer because Meta cannot send a Supabase user JWT. Each function performs its own authentication: CRM requests validate the signed-in user, while webhook requests validate Meta's signature.

## 4. Configure the Meta OAuth redirect

In the Meta developer app, add this exact Valid OAuth Redirect URI:

```text
https://yyxliadpoxpwbxojmqdk.supabase.co/functions/v1/meta-oauth-callback
```

Configure Facebook Login for Business and the Instagram content-management use case as applicable.

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

Meta may show different permission names depending on whether the app uses Facebook Login for Business or Instagram Login. Follow the current Meta product setup shown in the developer dashboard.

## 5. Connect the accounts

1. Sign in to Tech Social CRM.
2. Open **Settings → Connections**.
3. Select **Connect Facebook & Instagram**.
4. Complete Meta's official login and consent screen.
5. Select the Facebook Page and linked Instagram Professional account.
6. Meta redirects back to Tech Social.
7. Connected accounts appear with green status dots.

The Page/Instagram access tokens are encrypted in Supabase Vault. The CRM browser can never query or decrypt them.

## 6. Publish

1. Create or edit a post.
2. Select Facebook and/or Instagram.
3. For Instagram, select an image from the Media Library.
4. Open the post in the Publishing Queue.
5. Select **Publish connected Meta accounts**.

If every selected destination is published successfully, Tech Social marks the post Published. Unsupported or unconnected platforms remain available through the manual composer buttons until their own API connector is installed.
