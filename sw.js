const CACHE='tech-social-crm-v25';
const ASSETS=['./','./index.html','./styles.css','./app.js','./config.js','./vendor/supabase.js','./tech-social-mark.png','./manifest.webmanifest','./version.json'];

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

  // Always get HTML from the deployed site. This prevents an old service
  // worker from resurrecting a previous CRM build.
  if(event.request.mode==='navigate' || url.pathname.endsWith('/index.html')){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(response=>response)
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