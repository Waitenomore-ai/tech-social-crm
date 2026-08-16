const CACHE='tech-social-crm-v23';
const ASSETS=['./','./index.html','./styles.css','./app.js','./config.js','./vendor/supabase.js','./tech-social-mark.png','./manifest.webmanifest','./version.json'];

const SIDEBAR_HOTFIX = `<script>
(function(){
  const allowed=new Set([
    'Dashboard','Content calendar','All posts','Post templates','Content ideas','Media library','Campaigns','Publishing queue','Social accounts',
    'Notifications','Social inbox','Team requests','Analytics','Login & change log','Backups','Settings'
  ]);
  const legacy=new Set(['Approval Queue']);
  function clean(){
    const sidebar=document.getElementById('sidebar');
    if(!sidebar)return;
    const seen=new Set();
    const candidates=[...sidebar.querySelectorAll('button,a,li')];
    for(const node of candidates){
      if(!node.isConnected)continue;
      const text=node.textContent.replace(/\s+/g,' ').trim().replace(/(\d+)$/,'').trim();
      if(!text || !node.closest('nav'))continue;
      if(legacy.has(text)){node.remove();continue;}
      if(!allowed.has(text))continue;
      if(seen.has(text))node.remove();
      else seen.add(text);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});else clean();
  new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(clean,500);setTimeout(clean,1500);setTimeout(clean,3000);
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
