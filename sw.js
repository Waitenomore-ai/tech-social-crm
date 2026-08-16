const CACHE='tech-social-crm-v26';
const ASSETS=['./','./index.html','./styles.css','./app.js','./config.js','./vendor/supabase.js','./tech-social-mark.png','./manifest.webmanifest','./version.json'];

const SIDEBAR_HOTFIX = `<script>
(function(){
  'use strict';
  function cleanSidebar(){
    const sidebar=document.getElementById('sidebar');
    if(!sidebar)return;

    // Keep exactly one navigation item for each view. Older cached builds
    // can append a second copy of the marketing/content menu.
    const seenViews=new Set();
    const items=[...sidebar.querySelectorAll('[data-view-link]')];
    for(const item of items){
      const view=item.getAttribute('data-view-link');
      if(!view)continue;
      if(seenViews.has(view)) item.remove();
      else seenViews.add(view);
    }

    // Remove the retired legacy navigation item if an old fragment restores it.
    for(const item of [...sidebar.querySelectorAll('button,a,li,div')]){
      if(item===sidebar)continue;
      const text=(item.textContent||'').replace(/\\s+/g,' ').trim().replace(/(\\d+)$/,'').trim();
      if(text==='Approval Queue' && !item.querySelector('[data-view-link]')) item.remove();
    }
  }

  function run(){
    cleanSidebar();
    setTimeout(cleanSidebar,100);
    setTimeout(cleanSidebar,500);
    setTimeout(cleanSidebar,1500);
    setTimeout(cleanSidebar,3000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
  new MutationObserver(cleanSidebar).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  // Always fetch the HTML from the deployed site, then inject the sidebar
  // dedupe hotfix. This avoids resurrecting an old cached HTML build.
  if(event.request.mode==='navigate' || url.pathname.endsWith('/index.html')){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(async response=>{
          if(!response.ok)return response;
          const html=await response.text();
          const patched=html.includes('</body>')
            ?html.replace('</body>',SIDEBAR_HOTFIX+'</body>')
            :html+SIDEBAR_HOTFIX;
          return new Response(patched,{status:response.status,statusText:response.statusText,headers:response.headers});
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
