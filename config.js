// Supabase Project Settings → API
// NEVER put the service_role key in this file.

window.TECH_SOCIAL_CONFIG = {
  supabaseUrl: 'https://yyxliadpoxpwbxojmqdk.supabase.co',
  supabaseAnonKey: 'sb_publishable_XMNGnEV-X5x7eRRuwRRLuQ_QHj09O5C'
};

/* Meta connection is intentionally unchanged for Version 5.0. */
(() => {
  const originalCreateClient = window.supabase?.createClient;
  if (!originalCreateClient || window.__TECH_SOCIAL_CREATE_CLIENT_PATCHED__) return;
  window.__TECH_SOCIAL_CREATE_CLIENT_PATCHED__ = true;
  window.supabase.createClient = function (...args) {
    const client = originalCreateClient.apply(this, args);
    const [supabaseUrl, supabaseAnonKey] = args;
    const originalFunctions = client.functions;
    return new Proxy(client, { get(target, property, receiver) {
      if (property !== 'functions') return Reflect.get(target, property, receiver);
      return { invoke: async (functionName, options = {}) => {
        if (functionName !== 'meta-oauth-start') return originalFunctions.invoke(functionName, options);
        try {
          const { data: { session } = {} } = await target.auth.getSession();
          const headers = new Headers(options.headers || {});
          headers.set('apikey', supabaseAnonKey); headers.set('Content-Type', 'application/json');
          if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
          const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`, {method:options.method||'POST',headers,body:JSON.stringify(options.body||{})});
          const text = await response.text(); let data=null; try { data=text?JSON.parse(text):null; } catch { data=text; }
          if (!response.ok) return {data:null,error:{message:data?.error||data?.message||`Meta OAuth function returned HTTP ${response.status}`,status:response.status,context:response},response};
          return {data,error:null,response};
        } catch(error) { return {data:null,error,response:undefined}; }
      }};
    }});
  };
})();

/* Direct Meta OAuth fail-safe — retained for Monday's Meta work. */
(() => {
  if (window.__TECH_SOCIAL_META_OAUTH_DIRECT__) return;
  window.__TECH_SOCIAL_META_OAUTH_DIRECT__ = true;
  document.addEventListener('click', async event => {
    const button = event.target?.closest?.('#connectMetaButton'); if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation(); if (button.dataset.oauthBusy === '1') return;
    button.dataset.oauthBusy='1'; button.disabled=true; const originalText=button.textContent; button.textContent='Opening Meta…';
    try {
      const authClient=window.supabase.createClient(window.TECH_SOCIAL_CONFIG.supabaseUrl,window.TECH_SOCIAL_CONFIG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
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

/* Existing Version 5 UI helpers. */
(() => {
  const loadScript = (src, marker) => {
    if(document.querySelector(`script[data-${marker}]`)) return;
    const script=document.createElement('script'); script.src=`${src}?v=${Date.now()}`; script.defer=true; script.dataset[marker]='1'; document.head.appendChild(script);
  };
  const load=()=>{
    loadScript('marketing.js','techSocialMarketing');
    if(!document.querySelector('link[data-tech-social-sidebar]')){const link=document.createElement('link');link.rel='stylesheet';link.href=`sidebar-redesign.css?v=${Date.now()}`;link.dataset.techSocialSidebar='1';document.head.appendChild(link);}
    loadScript('version-manager.js','techSocialVersionManager');
    loadScript('v5-calendar.js','techSocialV5Calendar');
    loadScript('v5-media.js','techSocialV5Media');
    loadScript('v5-approval.js','techSocialV5Approval');
    loadScript('sidebar-dedupe.js','techSocialSidebarDedupe');
    loadScript('v5-integration.js','techSocialV5Integration');
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
