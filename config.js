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
              if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
              const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`,{method:options.method||'POST',headers,body:JSON.stringify(options.body||{})});
              const text = await response.text();
              let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
              if (!response.ok) return {data:null,error:{message:data?.error||data?.message||`Meta OAuth function returned HTTP ${response.status}`,status:response.status,context:response},response};
              return {data,error:null,response};
            } catch (error) { return {data:null,error,response:undefined}; }
          }
        };
      }
    });
  };
})();

/* Direct Meta OAuth fail-safe. */
(() => {
  if (window.__TECH_SOCIAL_META_OAUTH_DIRECT__) return;
  window.__TECH_SOCIAL_META_OAUTH_DIRECT__ = true;
  document.addEventListener('click', async event => {
    const button = event.target?.closest?.('#connectMetaButton');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (button.dataset.oauthBusy === '1') return;
    button.dataset.oauthBusy = '1'; button.disabled = true; const originalText = button.textContent; button.textContent = 'Opening Meta…';
    try {
      const authClient = window.supabase.createClient(window.TECH_SOCIAL_CONFIG.supabaseUrl,window.TECH_SOCIAL_CONFIG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data:sessionData,error:sessionError}=await authClient.auth.getSession(); if(sessionError) throw sessionError;
      const session=sessionData?.session; if(!session?.access_token) throw new Error('Your Tech Social login session could not be found. Please sign in again.');
      const returnUrl=`${window.location.origin}${window.location.pathname}`;
      const response=await fetch(`${window.TECH_SOCIAL_CONFIG.supabaseUrl.replace(/\/$/,'')}/functions/v1/meta-oauth-start`,{method:'POST',headers:{apikey:window.TECH_SOCIAL_CONFIG.supabaseAnonKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({returnUrl})});
      const text=await response.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
      if(!response.ok||!data?.authorizationUrl)throw new Error(data?.error||data?.message||`Meta OAuth function returned HTTP ${response.status}`);
      window.location.assign(data.authorizationUrl);
    } catch(error) { button.disabled=false;button.dataset.oauthBusy='0';button.textContent=originalText;const message=error?.message||'Could not start Meta connection.';if(typeof window.toast==='function')window.toast(message,true);else window.alert(message); }
  },true);
})();

/* Load the marketing layer after the main CRM has initialised. */
(() => {
  if (window.__TECH_SOCIAL_MARKETING_LOADER__) return;
  window.__TECH_SOCIAL_MARKETING_LOADER__ = true;
  const load = () => {
    if (document.querySelector('script[data-tech-social-marketing]')) return;
    const script = document.createElement('script');
    script.src = `marketing.js?v=${Date.now()}`;
    script.defer = true;
    script.dataset.techSocialMarketing = '1';
    document.head.appendChild(script);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, {once:true}); else load();
})();

/* Load the sidebar visual layer after the base stylesheet. */
(() => {
  if (document.querySelector('link[data-tech-social-sidebar]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `sidebar-redesign.css?v=${Date.now()}`;
  link.dataset.techSocialSidebar = '1';
  document.head.appendChild(link);
})();

/* Load the deployed version 5.2 display patch. */
(() => {
  if (document.querySelector('script[data-tech-social-version]')) return;
  const script = document.createElement('script');
  script.src = `version-5.2-patch.js?v=${Date.now()}`;
  script.defer = true;
  script.dataset.techSocialVersion = '1';
  document.head.appendChild(script);
})();

/* Load the login recovery guard after app.js has bound the normal auth flow. */
(() => {
  if (document.querySelector('script[data-tech-social-login-fix]')) return;
  const load = () => {
    if (document.querySelector('script[data-tech-social-login-fix]')) return;
    const script = document.createElement('script');
    script.src = `auth-login-fix.js?v=${Date.now()}`;
    script.defer = true;
    script.dataset.techSocialLoginFix = '1';
    document.head.appendChild(script);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, {once:true}); else load();
})();

/*
 * Workspace startup safety guard.
 *
 * The CRM performs a number of PostgREST queries and RPC calls immediately
 * after authentication. A single stalled request previously left the UI on
 * "Opening Tech Social CRM" forever. Put a hard upper bound on database/RPC
 * requests so optional migration problems become warnings and core problems
 * become visible errors instead of an infinite loading screen.
 */
(() => {
  if (window.__TECH_SOCIAL_DB_TIMEOUT_GUARD__) return;
  window.__TECH_SOCIAL_DB_TIMEOUT_GUARD__ = true;

  const originalCreateClient = window.supabase?.createClient;
  if (!originalCreateClient) return;

  const DB_TIMEOUT_MS = 8000;

  const timeoutError = label => new Error(`${label} timed out after ${DB_TIMEOUT_MS / 1000}s. Check the Supabase database/migration state.`);

  const withTimeout = (promiseLike, label) => new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(timeoutError(label));
      }
    }, DB_TIMEOUT_MS);
    Promise.resolve(promiseLike).then(value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }, error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });

  const wrapBuilder = (builder, label) => {
    if (!builder || typeof builder !== 'object') return builder;
    return new Proxy(builder, {
      get(target, property, receiver) {
        if (property === 'then') {
          return (resolve, reject) => {
            const then = Reflect.get(target, 'then', target);
            return withTimeout(then.call(target, value => value), label).then(resolve, reject);
          };
        }
        const value = Reflect.get(target, property, receiver);
        if (typeof value !== 'function') return value;
        return (...args) => {
          const result = value.apply(target, args);
          if (result && typeof result === 'object' && typeof result.then === 'function') return wrapBuilder(result, label);
          return result;
        };
      }
    });
  };

  window.supabase.createClient = function (...args) {
    const client = originalCreateClient.apply(this, args);
    return new Proxy(client, {
      get(target, property, receiver) {
        if (property === 'from') {
          return table => wrapBuilder(target.from(table), `Database table ${table}`);
        }
        if (property === 'rpc') {
          return (name, params) => withTimeout(target.rpc(name, params), `RPC ${name}`);
        }
        return Reflect.get(target, property, receiver);
      }
    });
  };
})();

/* Force-refresh marker: 2026-08-16 login/workspace startup guard. */
