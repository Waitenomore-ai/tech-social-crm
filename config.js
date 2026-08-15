// Supabase Project Settings → API
// NEVER put the service_role key in this file.

window.TECH_SOCIAL_CONFIG = {
  supabaseUrl: 'https://yyxliadpoxpwbxojmqdk.supabase.co',
  supabaseAnonKey: 'sb_publishable_XMNGnEV-X5x7eRRuwRRLuQ_QHj09O5C'
};

/*
 * Meta OAuth reliability shim.
 *
 * The CRM uses db.functions.invoke('meta-oauth-start').  This wrapper keeps
 * every other Supabase API untouched, but sends the Meta OAuth start request
 * directly to the deployed Edge Function.  That makes the Connect button
 * independent of any cached/older FunctionsClient implementation.
 */
(() => {
  const originalCreateClient = window.supabase?.createClient;
  if (!originalCreateClient || window.__TECH_SOCIAL_CREATE_CLIENT_PATCHED__) return;
  window.__TECH_SOCIAL_CREATE_CLIENT_PATCHED__ = true;

  window.supabase.createClient = function (...args) {
    const client = originalCreateClient.apply(this, args);
    const [supabaseUrl, supabaseAnonKey] = args;
    const originalFunctions = client.functions;

    return new Proxy(client, {
      get(target, property, receiver) {
        if (property !== 'functions') return Reflect.get(target, property, receiver);

        return {
          invoke: async (functionName, options = {}) => {
            if (functionName !== 'meta-oauth-start') {
              return originalFunctions.invoke(functionName, options);
            }

            try {
              const { data: { session } = {} } = await target.auth.getSession();
              const headers = new Headers(options.headers || {});
              headers.set('apikey', supabaseAnonKey);
              headers.set('Content-Type', 'application/json');
              if (session?.access_token) {
                headers.set('Authorization', `Bearer ${session.access_token}`);
              }

              const response = await fetch(
                `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`,
                {
                  method: options.method || 'POST',
                  headers,
                  body: JSON.stringify(options.body || {})
                }
              );

              const text = await response.text();
              let data = null;
              try { data = text ? JSON.parse(text) : null; } catch { data = text; }

              if (!response.ok) {
                return {
                  data: null,
                  error: {
                    message: data?.error || data?.message || `Meta OAuth function returned HTTP ${response.status}`,
                    status: response.status,
                    context: response
                  },
                  response
                };
              }

              return { data, error: null, response };
            } catch (error) {
              return { data: null, error, response: undefined };
            }
          }
        };
      }
    });
  };
})();
