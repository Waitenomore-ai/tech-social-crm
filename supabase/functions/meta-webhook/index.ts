import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "content-type": "application/json" };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index++) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function validMetaSignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith("sha256=") || !appSecret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = `sha256=${bytesToHex(new Uint8Array(digest))}`;
  return constantTimeEqual(expected, signature.toLowerCase());
}

async function fallbackEventId(value: unknown) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return bytesToHex(new Uint8Array(digest));
}

Deno.serve(async (request) => {
  const verifyToken = Deno.env.get("META_VERIFY_TOKEN") ?? "";
  const appSecret = Deno.env.get("META_APP_SECRET") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = Deno.env.get("SUPABASE_ADMIN_KEY") ?? "";

  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
    }
    return response({ error: "Webhook verification failed" }, 403);
  }

  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  if (!supabaseUrl || !adminKey || !appSecret) {
    console.error("Missing Supabase or Meta Edge Function secrets");
    return response({ error: "Connector is not configured" }, 503);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!(await validMetaSignature(rawBody, signature, appSecret))) {
    console.warn("Rejected Meta webhook with invalid signature");
    return response({ error: "Invalid signature" }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return response({ error: "Invalid JSON" }, 400);
  }

  // The secret key is server-side only and bypasses RLS for verified webhook ingestion.
  const admin = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const platform = payload.object === "instagram" ? "instagram" : "facebook";
  let processed = 0;
  let ignored = 0;

  for (const entry of payload.entry ?? []) {
    const accountId = String(entry.id ?? "");
    if (!accountId) continue;

    await admin.from("social_connections").upsert({
      platform,
      external_account_id: accountId,
      account_name: platform === "instagram" ? "Instagram Professional account" : "Facebook Page",
      status: "connected",
      webhook_enabled: true,
      last_event_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "platform,external_account_id" });

    for (const event of entry.messaging ?? []) {
      if (!event.message) {
        ignored++;
        continue;
      }

      const isEcho = Boolean(event.message.is_echo);
      const customerId = String(isEcho ? event.recipient?.id : event.sender?.id);
      if (!customerId) {
        ignored++;
        continue;
      }

      const rawId = event.message.mid || await fallbackEventId({ platform, accountId, event });
      const externalEventId = `${platform}:${rawId}`;
      const eventType = isEcho ? "message_echo" : "message";
      const receivedAt = new Date(Number(event.timestamp) || Date.now()).toISOString();

      const eventInsert = await admin.from("webhook_events").insert({
        platform,
        external_event_id: externalEventId,
        event_type: eventType,
        payload: event,
        processing_status: "received",
        received_at: receivedAt,
      });

      // Meta retries webhooks. A unique event ID makes processing idempotent.
      if (eventInsert.error?.code === "23505") {
        ignored++;
        continue;
      }
      if (eventInsert.error) {
        console.error("Could not record webhook event", eventInsert.error);
        continue;
      }

      try {
        let threadResult = await admin
          .from("social_threads")
          .select("*")
          .eq("platform", platform)
          .eq("external_account_id", accountId)
          .eq("external_thread_id", customerId)
          .maybeSingle();

        let thread = threadResult.data;
        if (!thread) {
          const label = `${platform === "instagram" ? "Instagram" : "Facebook"} contact ${customerId.slice(-6)}`;
          const created = await admin.from("social_threads").insert({
            platform,
            contact_name: label,
            contact_handle: customerId,
            subject: `${platform === "instagram" ? "Instagram" : "Facebook"} message`,
            status: "open",
            source: "webhook",
            external_thread_id: customerId,
            external_account_id: accountId,
            created_at: receivedAt,
            updated_at: receivedAt,
            last_message_at: receivedAt,
          }).select().single();
          if (created.error) throw created.error;
          thread = created.data;
        }

        const text = event.message.text || (event.message.attachments?.length ? "[Media attachment]" : "[Unsupported message]");
        const messageInsert = await admin.from("social_messages").insert({
          thread_id: thread.id,
          message_type: isEcho ? "outbound" : "inbound",
          body: text,
          sender_name: isEcho ? "Tech Lab" : thread.contact_name,
          sender_user_id: null,
          external_id: externalEventId,
          raw_payload: event,
          created_at: receivedAt,
        });
        if (messageInsert.error && messageInsert.error.code !== "23505") throw messageInsert.error;

        await admin.from("social_threads").update({
          last_message_at: receivedAt,
          updated_at: receivedAt,
          status: "open",
        }).eq("id", thread.id);

        await admin.from("webhook_events").update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
        }).eq("external_event_id", externalEventId);
        processed++;
      } catch (error) {
        console.error("Meta event processing failed", error);
        await admin.from("webhook_events").update({
          processing_status: "failed",
          error_message: error instanceof Error ? error.message : String(error),
          processed_at: new Date().toISOString(),
        }).eq("external_event_id", externalEventId);
      }
    }
  }

  // Meta expects a prompt successful acknowledgement.
  return response({ received: true, processed, ignored });
});
