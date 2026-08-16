(() => {
  'use strict';
  if (window.__TECH_SOCIAL_V10_MEDIA__) return;
  window.__TECH_SOCIAL_V10_MEDIA__ = true;

  const CONFIG=window.TECH_SOCIAL_CONFIG;
  if(!CONFIG||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const toast=(m,b=false)=>window.toast?.(m,b);
  let assets=[];
  let filter='all';
  let search='';

  async function load(){
    const {data,error}=await client.from('media_assets').select('*').order('created_at',{ascending:false});
    if(error){if(error.code!=='42P01')toast('Media Library database table is not ready yet.',true);return;}
    assets=data||[];render();
  }

  function typeOf(a){
    const t=(a.mime_type||a.type||'').toLowerCase();
    if(t.includes('video'))return 'video';
    if(t.includes('image'))return 'image';
    return a.category==='video'?'video':'image';
  }

  function matches(a){
    const t=typeOf(a), q=search.toLowerCase();
    return (filter==='all'||filter===t)&&(!q||[a.name,a.filename,a.category,a.folder,a.tags,a.description].join(' ').toLowerCase().includes(q));
  }

  function render(){
    const grid=document.querySelector('#mediaGrid');if(!grid)return;
    const list=assets.filter(matches);
    grid.innerHTML=list.map(a=>`<article class="media-card" data-v10-media-id="${esc(a.id)}"><div class="media-preview">${typeOf(a)==='video'?'<span class="media-video-badge">VIDEO</span>':a.url||a.public_url?`<img src="${esc(a.url||a.public_url)}" alt="${esc(a.name||a.filename)}" loading="lazy">`:'<span>MEDIA</span>'}</div><div class="media-card-body"><strong>${esc(a.name||a.filename||'Untitled')}</strong><small>${esc(a.category||'General')} ${a.folder?'• '+esc(a.folder):''}</small><div class="media-tags">${esc(Array.isArray(a.tags)?a.tags.join(', '):(a.tags||''))}</div><div class="media-card-actions"><button type="button" class="button button-outline" data-media-edit="${esc(a.id)}">Edit</button><button type="button" class="button button-outline" data-media-copy="${esc(a.url||a.public_url||'')}">Copy link</button><button type="button" class="button button-danger" data-media-delete="${esc(a.id)}">Delete</button></div></div></article>`).join('')||'<div class="empty-state">No media matches your search.</div>';
  }

  async function edit(id){
    const a=assets.find(x=>String(x.id)===String(id));if(!a)return;
    const name=prompt('Media name:',a.name||a.filename||'');if(name===null)return;
    const category=prompt('Category (photo, video, graphic, logo):',a.category||'photo');if(category===null)return;
    const folder=prompt('Folder:',a.folder||'');if(folder===null)return;
    const tags=prompt('Tags (comma separated):',Array.isArray(a.tags)?a.tags.join(', '):(a.tags||''));if(tags===null)return;
    const {error}=await client.from('media_assets').update({name,category,folder,tags:tags.split(',').map(x=>x.trim()).filter(Boolean)}).eq('id',id);
    if(error){toast(error.message,true);return;}toast('Media updated.');load();
  }

  async function remove(id){
    if(!confirm('Delete this media item from the library?'))return;
    const {error}=await client.from('media_assets').delete().eq('id',id);if(error){toast(error.message,true);return;}toast('Media removed.');load();
  }

  async function copy(url){if(!url){toast('No media URL is available.',true);return;}try{await navigator.clipboard.writeText(url);toast('Media link copied.')}catch{toast(url);}}

  function wire(){
    const view=document.querySelector('#mediaView')||document.querySelector('[data-view="media"]');if(!view)return;
    const heading=view.querySelector('.view-heading');if(heading&&!view.querySelector('#v10MediaControls')){
      const box=document.createElement('div');box.id='v10MediaControls';box.className='panel';box.style.cssText='display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0';box.innerHTML='<input id="v10MediaSearch" class="input" placeholder="Search media…" style="min-width:240px"><select id="v10MediaFilter" class="input"><option value="all">All media</option><option value="image">Photos & graphics</option><option value="video">Videos</option></select><select id="v10MediaCategory" class="input"><option value="all">All categories</option><option value="photo">Photos</option><option value="graphic">Graphics</option><option value="logo">Logos</option><option value="video">Videos</option></select><button type="button" class="button button-primary" id="v10Upload">Upload media</button>';heading.insertAdjacentElement('afterend',box);
      box.querySelector('#v10MediaSearch').oninput=e=>{search=e.target.value;render()};box.querySelector('#v10MediaFilter').onchange=e=>{filter=e.target.value;render()};box.querySelector('#v10MediaCategory').onchange=e=>{const c=e.target.value;document.querySelectorAll('[data-v10-media-id]').forEach(card=>{const a=assets.find(x=>String(x.id)===String(card.dataset.v10MediaId));card.hidden=c!=='all'&&String(a?.category||'')!==c})};
      box.querySelector('#v10Upload').onclick=()=>document.querySelector('#openMediaUploadButton')?.click();
    }
    const grid=document.querySelector('#mediaGrid');if(grid&&!grid.dataset.v10Wired){grid.dataset.v10Wired='1';grid.addEventListener('click',e=>{const editBtn=e.target.closest('[data-media-edit]'),delBtn=e.target.closest('[data-media-delete]'),copyBtn=e.target.closest('[data-media-copy]');if(editBtn)edit(editBtn.dataset.mediaEdit);if(delBtn)remove(delBtn.dataset.mediaDelete);if(copyBtn)copy(copyBtn.dataset.mediaCopy)});}
    if(grid&&!grid.dataset.v10Observer){grid.dataset.v10Observer='1';new MutationObserver(()=>{if(!assets.length)load()}).observe(grid,{childList:true});}
  }

  function boot(){wire();load();new MutationObserver(wire).observe(document.body,{childList:true,subtree:true});window.techSocialV10Media={refresh:load};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
