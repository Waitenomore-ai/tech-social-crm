import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = new Set([
    "https://waitenomore-ai.github.io",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  ]);

  return {
    "content-type": "application/json",
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "https://waitenomore-ai.github.io",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "Origin",
  };
};

const reply = (request: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });

Deno.serve(async (request) => {
  // Browser clients make a CORS preflight before the authenticated POST.
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") return reply(request, { error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = Deno.env.get("TECH_SOCIAL_ADMIN_KEY") ?? Deno.env.get("SUPABASE_ADMIN_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const metaAppId = Deno.env.get("META_APP_ID") ?? "";
  const metaConfigId = Deno.env.get("META_CONFIG_ID") ?? "";
  const graphVersion = Deno.env.get("META_GRAPH_VERSION") ?? "v25.0";
  const configuredReturnUrl = Deno.env.get("CRM_RETURN_URL") ?? "https://waitenomore-ai.github.io/tech-social-crm/";

  if (!supabaseUrl || !adminKey || !metaAppId || !metaConfigId) {
    return reply(request, { error: "Meta OAuth is not configured. META_APP_ID, META_CONFIG_ID and the server key are required." }, 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const jwt = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!jwt) return reply(request, { error: "Authentication required" }, 401);

  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });
  const userResult = await admin.auth.getUser(jwt);
  if (userResult.error || !userResult.data.user?.email) return reply(request, { error: "Invalid session" }, 401);

  const email = userResult.data.user.email.toLowerCase();
  const allowed = await admin.from("allowed_users").select("email,role").eq("email", email).maybeSingle();
  if (allowed.error || !allowed.data) return reply(request, { error: "This user is not approved" }, 403);
  if (allowed.data.role !== "admin") return reply(request, { error: "Administrator role is required to connect social accounts" }, 403);

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
  if (stateInsert.error) return reply(request, { error: stateInsert.error.message }, 500);

  const redirectUri = `${supabaseUrl}/functions/v1/meta-oauth-callback`;

  // Tech Social uses Meta's Facebook Login for Business flow. Meta's current
  // business-login flow uses a configuration ID to define the requested
  // business assets and permissions; do not send a classic scope-only login.
  const params = new URLSearchParams({
    client_id: metaAppId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    config_id: metaConfigId,
    override_default_response_type: "true",
  });

  return reply(request, {
    authorizationUrl: `https://www.facebook.com/${graphVersion}/dialog/oauth?${params}`,
    expiresAt,
  });
});
