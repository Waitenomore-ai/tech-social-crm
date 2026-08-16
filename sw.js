const CACHE='tech-social-crm-v24';
const ASSETS=['./','./index.html','./styles.css','./app.js','./config.js','./vendor/supabase.js','./tech-social-mark.png','./manifest.webmanifest','./version.json'];

const SIDEBAR_HOTFIX = `<script>
(function(){
  function cleanSidebar(){
    const sidebar=document.getElementById('sidebar');
    if(!sidebar)return;

    // The source sidebar has one canonical item for each view. Remove any
    // duplicate navigation item that may have been left by an older build.
    const seenViews=new Set();
    const items=[...sidebar.querySelectorAll('[data-view-link]')];
    for(const item of items){
      const view=item.getAttribute('data-view-link');
      if(!view)continue;
      if(seenViews.has(view)){
        item.remove();
      }else{
        seenViews.add(view);
      }
    }

    // Remove the retired legacy item if an old cached fragment added it.
    for(const item of [...sidebar.querySelectorAll('button,a,li,div')]){
      if(item===sidebar)continue;
      const text=(item.textContent||'').replace(/\\s+/g,' ').trim().replace(/(\\d+)$/,'').trim();
      if(text==='Approval Queue' && !item.querySelector('[data-view-link]'))item.remove();
    }
  }

  function run(){
    cleanSidebar();
    setTimeout(cleanSidebar,100);
    setTimeout(cleanSidebar,500);
    setTimeout(cleanSidebar,1500);
    setTimeout(cleanSidebar,3000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
  new MutationObserver(function(){cleanSidebar()}).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(event.request);
      if(!response.ok)return response;
      const type=response.headers.get('content-type')||'';
      if(type.includes('text/html')){
        const html=await response.text();
        const patched=html.includes('</body>')?html.replace('</body>',SIDEBAR_HOTFIX+'</body>'):html+SIDEBAR_HOTFIX;
        const out=new Response(patched,{status:response.status,statusText:response.statusText,headers:response.headers});
        caches.open(CACHE).then(cache=>cache.put(event.request,out.clone()));
        return out;
      }
      caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
      return response;
    }catch(e){
      return caches.match(event.request).then(cached=>cached||caches.match('./index.html'));
    }
  })());
});
