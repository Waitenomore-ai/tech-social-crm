# Connect Facebook and Instagram messages to Tech Social CRM

This is the first automatic webhook connector for Tech Social CRM 2.1.

## What it does

- Verifies Meta's `hub.challenge` callback.
- Validates every POST using `X-Hub-Signature-256` and your Meta App Secret.
- Rejects forged events.
- Deduplicates Meta retries using the external message ID.
- Creates or updates a Social Inbox conversation.
- Adds inbound messages and message echoes to `social_messages`.
- Updates the Connections settings tab and CRM inbox in real time.

## 1. Run database migrations

In Supabase SQL Editor, run these in order if they have not already succeeded:

1. `supabase-complete-v2-migration.sql`
2. `supabase-meta-webhooks-migration.sql`

## 2. Create the Meta developer application

1. Go to https://developers.facebook.com/apps/.
2. Create a Business app with the Messenger use case.
3. Add Messenger and Instagram products.
4. Connect the Tech Lab Facebook Page.
5. Connect the Instagram Professional account where required.
6. Note the **App ID** and **App Secret**.

Never put the App Secret in GitHub or `config.js`.

## 3. Configure Supabase Edge Function secrets

In Supabase Dashboard, open **Edge Functions → Secrets** and add:

```text
META_VERIFY_TOKEN     A long random value you create
META_APP_SECRET       The Meta app secret
SUPABASE_ADMIN_KEY    Your Supabase secret API key
```

`SUPABASE_ADMIN_KEY` must be the server-only `sb_secret_...` key or legacy service-role key. It bypasses Row Level Security and must never be used in browser files.

Generate a verify token using a password manager or a command such as:

```bash
openssl rand -hex 32
```

## 4. Deploy the Edge Function

Install and authenticate the Supabase CLI, then run from the repository root:

```bash
supabase login
supabase link --project-ref yyxliadpoxpwbxojmqdk
supabase functions deploy meta-webhook --no-verify-jwt
```

The `--no-verify-jwt` option is necessary because Meta sends its own signature, not a Supabase user token. The function verifies the Meta signature internally.

## 5. Configure the Meta webhook

Use this callback URL:

```text
https://yyxliadpoxpwbxojmqdk.supabase.co/functions/v1/meta-webhook
```

Use the exact value you saved as `META_VERIFY_TOKEN` for Meta's Verify Token.

Subscribe to the message fields available for your app, including:

- `messages`
- `messaging_postbacks`
- Message echoes or seen/delivery fields if required

For Instagram, subscribe the Instagram Professional account to the corresponding messaging webhook fields.

## 6. Permissions

Depending on the Meta login/product route, expect permissions such as:

```text
pages_show_list
pages_manage_metadata
pages_messaging
pages_read_engagement
business_management
instagram_basic
instagram_manage_messages
```

Meta determines which permissions and access level your app needs. Standard access can be sufficient while serving accounts owned or managed by your app roles. Wider production use may require Business Verification and App Review.

## 7. Test

1. Use Meta's webhook test tool or message the connected Page/Instagram account from another account.
2. Open Tech Social CRM → **Social inbox**.
3. The message should appear as an inbound conversation.
4. Open **Settings → Connections** to see the connected account ID and last webhook event.

## Important

- The function currently ingests incoming messages and message echoes.
- Sending a live reply through Meta's API is a separate connector step and must obey Meta's messaging-window policies.
- Other social networks require their own function, signature verification and developer approval.
