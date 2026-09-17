import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = new Set([
    "https://waitenomore-ai.github.io",
    "http://localhost:3000",
    "http://localhost:4180",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4180",
    "http://127.0.0.1:5173",
  ]);

  return {
    "content-type": "application/json",
    ...(allowedOrigins.has(origin) ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "Origin",
  };
};

const reply = (request: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });

function captionFor(post: any) {
  const tags = String(post.hashtags || "").split(/[\s,]+/).filter(Boolean).map((tag) => `#${tag.replace(/^#+/, "")}`).join(" ");
  return [String(post.caption || "").trim(), tags].filter(Boolean).join("\n\n");
}

async function graphRequest(version: string, path: string, token: string, values: Record<string, string>) {
  const body = new URLSearchParams({ ...values, access_token: token });
  const response = await fetch(`https://graph.facebook.com/${version}/${path}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || `Meta API request failed (${response.status})`);
  return data;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") return reply(request, { error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = Deno.env.get("TECH_SOCIAL_ADMIN_KEY") ?? Deno.env.get("SUPABASE_ADMIN_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const graphVersion = Deno.env.get("META_GRAPH_VERSION") ?? "v25.0";
  if (!supabaseUrl || !adminKey) return reply(request, { error: "Publishing backend is not configured" }, 503);

  const authorization = request.headers.get("authorization") ?? "";
  const jwt = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!jwt) return reply(request, { error: "Authentication required" }, 401);

  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });
  const userResult = await admin.auth.getUser(jwt);
  const user = userResult.data.user;
  if (userResult.error || !user?.email) return reply(request, { error: "Authentication required" }, 401);

  const allowed = await admin.from("allowed_users").select("email,role").eq("email", user.email.toLowerCase()).maybeSingle();
  if (allowed.error || !allowed.data) return reply(request, { error: "User is not approved" }, 403);
  if (!["admin", "approver"].includes(allowed.data.role)) return reply(request, { error: "Approver role is required to publish" }, 403);

  let input: any;
  try { input = await request.json(); } catch { return reply(request, { error: "Invalid JSON" }, 400); }
  if (typeof input.postId !== "string" || !input.postId.trim()) return reply(request, { error: "postId is required" }, 400);

  const postResult = await admin.from("posts").select("*").eq("id", input.postId).maybeSingle();
  if (postResult.error || !postResult.data) return reply(request, { error: "Post not found" }, 404);
  const post = postResult.data;

  const postMetaPlatforms = Array.isArray(post.platforms)
    ? post.platforms.filter((value: string) => ["facebook", "instagram"].includes(value))
    : [];
  const requestedInput = Array.isArray(input.platforms)
    ? input.platforms.filter((value: string) => ["facebook", "instagram"].includes(value))
    : postMetaPlatforms;
  const requested = [...new Set(requestedInput.filter((value: string) => postMetaPlatforms.includes(value)))];

  if (!requested.length) return reply(request, { error: "This post has no selected Meta destinations" }, 400);

  let media: any = null;
  let mediaUrl = "";
  if (post.media_id) {
    const mediaResult = await admin.from("media_assets").select("*").eq("id", post.media_id).maybeSingle();
    media = mediaResult.data;
    if (media) {
      const signed = await admin.storage.from("tech-social-media").createSignedUrl(media.storage_path, 60 * 60);
      if (signed.error) return reply(request, { error: `Could not prepare media: ${signed.error.message}` }, 500);
      mediaUrl = signed.data.signedUrl;
    }
  }

  const connectionsResult = await admin.from("social_connections").select("*").in("platform", requested).eq("status", "connected");
  if (connectionsResult.error) return reply(request, { error: connectionsResult.error.message }, 500);
  const results: any[] = [];
  const caption = captionFor(post);

  for (const platform of requested) {
    const connection = (connectionsResult.data || []).find((item: any) => item.platform === platform);
    const started = await admin.from("publish_attempts").insert({ post_id: post.id, platform, connection_id: connection?.id || null, status: "started", requested_by: user.id }).select().single();
    try {
      if (!connection) throw new Error(`${platform} is not connected through OAuth`);
      const tokenResult = await admin.rpc("get_social_connection_token", { p_connection_id: connection.id });
      if (tokenResult.error || !tokenResult.data) throw new Error(`No valid ${platform} OAuth token is available`);
      const token = tokenResult.data;
      let externalId = "";

      if (platform === "facebook") {
        if (media?.media_type === "video") throw new Error("Facebook video API publishing is not enabled in this release");
        const data = mediaUrl
          ? await graphRequest(graphVersion, `${connection.external_account_id}/photos`, token, { url: mediaUrl, caption, published: "true" })
          : await graphRequest(graphVersion, `${connection.external_account_id}/feed`, token, { message: caption, link: post.link || "https://www.techfixlab.co.uk" });
        externalId = data.post_id || data.id;
      } else {
        if (!mediaUrl) throw new Error("Instagram requires an image selected from the media library");
        if (media.media_type !== "image") throw new Error("Instagram video/reel publishing is not enabled in this release");
        const container = await graphRequest(graphVersion, `${connection.external_account_id}/media`, token, { image_url: mediaUrl, caption });
        const published = await graphRequest(graphVersion, `${connection.external_account_id}/media_publish`, token, { creation_id: container.id });
        externalId = published.id;
      }

      if (started.data?.id) await admin.from("publish_attempts").update({ status: "published", external_post_id: externalId, completed_at: new Date().toISOString() }).eq("id", started.data.id);
      results.push({ platform, status: "published", externalId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (started.data?.id) await admin.from("publish_attempts").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).eq("id", started.data.id);
      results.push({ platform, status: "failed", error: message });
    }
  }

  const allSucceeded = results.every((result) => result.status === "published");
  const allPostPlatformsWereHandled = (post.platforms || []).every((value: string) => requested.includes(value));
  if (allSucceeded && allPostPlatformsWereHandled) {
    await admin.from("posts").update({ status: "published", updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", post.id);
  }

  return reply(request, { success: allSucceeded, complete: allSucceeded && allPostPlatformsWereHandled, results }, allSucceeded ? 200 : 207);
});
