import { createClient } from "npm:@supabase/supabase-js@2";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

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
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = Deno.env.get("TECH_SOCIAL_ADMIN_KEY") ?? Deno.env.get("SUPABASE_ADMIN_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const graphVersion = Deno.env.get("META_GRAPH_VERSION") ?? "v25.0";
  if (!supabaseUrl || !adminKey) return reply({ error: "Publishing backend is not configured" }, 503);

  const authorization = request.headers.get("authorization") ?? "";
  const jwt = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });
  const userResult = await admin.auth.getUser(jwt);
  const user = userResult.data.user;
  if (userResult.error || !user?.email) return reply({ error: "Authentication required" }, 401);
  const allowed = await admin.from("allowed_users").select("email,role").eq("email", user.email.toLowerCase()).maybeSingle();
  if (!allowed.data) return reply({ error: "User is not approved" }, 403);
  if (!["admin", "approver"].includes(allowed.data.role)) return reply({ error: "Approver role is required to publish" }, 403);

  let input: any;
  try { input = await request.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  if (!input.postId) return reply({ error: "postId is required" }, 400);

  const postResult = await admin.from("posts").select("*").eq("id", input.postId).maybeSingle();
  if (postResult.error || !postResult.data) return reply({ error: "Post not found" }, 404);
  const post = postResult.data;
  const requested = Array.isArray(input.platforms) ? input.platforms.filter((value: string) => ["facebook", "instagram"].includes(value)) : (post.platforms || []).filter((value: string) => ["facebook", "instagram"].includes(value));
  if (!requested.length) return reply({ error: "This post has no Meta destinations" }, 400);

  let media: any = null;
  let mediaUrl = "";
  if (post.media_id) {
    const mediaResult = await admin.from("media_assets").select("*").eq("id", post.media_id).maybeSingle();
    media = mediaResult.data;
    if (media) {
      const signed = await admin.storage.from("tech-social-media").createSignedUrl(media.storage_path, 60 * 60);
      if (signed.error) return reply({ error: `Could not prepare media: ${signed.error.message}` }, 500);
      mediaUrl = signed.data.signedUrl;
    }
  }

  const connectionsResult = await admin.from("social_connections").select("*").in("platform", requested).eq("status", "connected");
  if (connectionsResult.error) return reply({ error: connectionsResult.error.message }, 500);
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

  return reply({ success: allSucceeded, complete: allSucceeded && allPostPlatformsWereHandled, results }, allSucceeded ? 200 : 207);
});
