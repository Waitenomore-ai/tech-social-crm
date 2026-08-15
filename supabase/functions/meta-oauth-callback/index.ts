import { createClient } from "npm:@supabase/supabase-js@2";

function redirectWith(url: string, key: string, value: string) {
  const target = new URL(url);
  target.searchParams.set(key, value);
  return Response.redirect(target.toString(), 302);
}

Deno.serve(async (request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = Deno.env.get("SUPABASE_ADMIN_KEY") ?? "";
  const metaAppId = Deno.env.get("META_APP_ID") ?? "";
  const metaAppSecret = Deno.env.get("META_APP_SECRET") ?? "";
  const graphVersion = Deno.env.get("META_GRAPH_VERSION") ?? "v25.0";
  const fallbackReturnUrl = Deno.env.get("CRM_RETURN_URL") ?? "https://waitenomore-ai.github.io/tech-social-crm/";
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (!supabaseUrl || !adminKey || !metaAppId || !metaAppSecret) return redirectWith(fallbackReturnUrl, "meta_error", "Connector is not configured");
  if (!code || !state || providerError) return redirectWith(fallbackReturnUrl, "meta_error", providerError || "Authorisation was cancelled");

  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });
  const stateResult = await admin.from("social_oauth_states").select("*").eq("state", state).eq("provider", "meta").maybeSingle();
  const oauthState = stateResult.data;
  if (stateResult.error || !oauthState || oauthState.used_at || new Date(oauthState.expires_at) < new Date()) {
    return redirectWith(fallbackReturnUrl, "meta_error", "Authorisation state expired or was already used");
  }

  const returnUrl = oauthState.return_url || fallbackReturnUrl;
  const redirectUri = `${supabaseUrl}/functions/v1/meta-oauth-callback`;
  try {
    const shortParams = new URLSearchParams({ client_id: metaAppId, client_secret: metaAppSecret, redirect_uri: redirectUri, code });
    const shortResponse = await fetch(`https://graph.facebook.com/${graphVersion}/oauth/access_token?${shortParams}`);
    const shortData = await shortResponse.json();
    if (!shortResponse.ok || !shortData.access_token) throw new Error(shortData.error?.message || "Could not exchange Meta authorisation code");

    const longParams = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: metaAppId, client_secret: metaAppSecret, fb_exchange_token: shortData.access_token });
    const longResponse = await fetch(`https://graph.facebook.com/${graphVersion}/oauth/access_token?${longParams}`);
    const longData = await longResponse.json();
    if (!longResponse.ok || !longData.access_token) throw new Error(longData.error?.message || "Could not create long-lived Meta token");
    const expiresAt = longData.expires_in ? new Date(Date.now() + Number(longData.expires_in) * 1000).toISOString() : null;

    const pagesResponse = await fetch(`https://graph.facebook.com/${graphVersion}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${encodeURIComponent(longData.access_token)}`);
    const pagesData = await pagesResponse.json();
    if (!pagesResponse.ok) throw new Error(pagesData.error?.message || "Could not retrieve Facebook Pages");

    let connected = 0;
    for (const page of pagesData.data ?? []) {
      const pageConnection = await admin.from("social_connections").upsert({
        platform: "facebook",
        external_account_id: String(page.id),
        account_name: page.name || "Facebook Page",
        status: "connected",
        webhook_enabled: true,
        scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_manage_metadata"],
        connected_by: oauthState.user_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "platform,external_account_id" }).select().single();
      if (pageConnection.error) throw pageConnection.error;
      const pageToken = page.access_token || longData.access_token;
      const pageTokenResult = await admin.rpc("store_social_connection_token", { p_connection_id: pageConnection.data.id, p_token: pageToken, p_expires_at: expiresAt });
      if (pageTokenResult.error) throw pageTokenResult.error;
      connected++;

      const instagram = page.instagram_business_account;
      if (instagram?.id) {
        const instagramConnection = await admin.from("social_connections").upsert({
          platform: "instagram",
          external_account_id: String(instagram.id),
          account_name: instagram.username ? `@${instagram.username}` : "Instagram Professional account",
          status: "connected",
          webhook_enabled: true,
          scopes: ["instagram_basic", "instagram_content_publish"],
          connected_by: oauthState.user_id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "platform,external_account_id" }).select().single();
        if (instagramConnection.error) throw instagramConnection.error;
        const instagramTokenResult = await admin.rpc("store_social_connection_token", { p_connection_id: instagramConnection.data.id, p_token: pageToken, p_expires_at: expiresAt });
        if (instagramTokenResult.error) throw instagramTokenResult.error;
        connected++;
      }
    }

    await admin.from("social_oauth_states").update({ used_at: new Date().toISOString() }).eq("state", state);
    return redirectWith(returnUrl, "meta_connected", String(connected));
  } catch (error) {
    console.error("Meta OAuth callback failed", error);
    await admin.from("social_oauth_states").update({ used_at: new Date().toISOString() }).eq("state", state);
    return redirectWith(returnUrl, "meta_error", error instanceof Error ? error.message : String(error));
  }
});
