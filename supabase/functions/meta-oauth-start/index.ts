import { createClient } from "npm:@supabase/supabase-js@2";

const headers = { "content-type": "application/json" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request) => {
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = Deno.env.get("TECH_SOCIAL_ADMIN_KEY") ?? Deno.env.get("SUPABASE_ADMIN_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const metaAppId = Deno.env.get("META_APP_ID") ?? "";
  const graphVersion = Deno.env.get("META_GRAPH_VERSION") ?? "v25.0";
  const configuredReturnUrl = Deno.env.get("CRM_RETURN_URL") ?? "https://waitenomore-ai.github.io/tech-social-crm/";
  if (!supabaseUrl || !adminKey || !metaAppId) return reply({ error: "Meta OAuth is not configured" }, 503);

  const authorization = request.headers.get("authorization") ?? "";
  const jwt = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!jwt) return reply({ error: "Authentication required" }, 401);

  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });
  const userResult = await admin.auth.getUser(jwt);
  if (userResult.error || !userResult.data.user?.email) return reply({ error: "Invalid session" }, 401);

  const email = userResult.data.user.email.toLowerCase();
  const allowed = await admin.from("allowed_users").select("email,role").eq("email", email).maybeSingle();
  if (allowed.error || !allowed.data) return reply({ error: "This user is not approved" }, 403);
  if (allowed.data.role !== "admin") return reply({ error: "Administrator role is required to connect social accounts" }, 403);

  let requestedReturnUrl = configuredReturnUrl;
  try {
    const payload = await request.json();
    if (payload?.returnUrl && new URL(payload.returnUrl).origin === new URL(configuredReturnUrl).origin) {
      requestedReturnUrl = payload.returnUrl;
    }
  } catch {
    // The configured return URL is used when no JSON body is sent.
  }

  const state = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const stateInsert = await admin.from("social_oauth_states").insert({
    state,
    provider: "meta",
    user_id: userResult.data.user.id,
    return_url: requestedReturnUrl,
    expires_at: expiresAt,
  });
  if (stateInsert.error) return reply({ error: stateInsert.error.message }, 500);

  const redirectUri = `${supabaseUrl}/functions/v1/meta-oauth-callback`;
  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_manage_metadata",
    "business_management",
    "instagram_basic",
    "instagram_content_publish",
  ];
  const params = new URLSearchParams({
    client_id: metaAppId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: scopes.join(","),
  });

  return reply({
    authorizationUrl: `https://www.facebook.com/${graphVersion}/dialog/oauth?${params}`,
    expiresAt,
  });
});
