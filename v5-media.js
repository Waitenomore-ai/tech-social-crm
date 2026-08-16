/* Tech Social CRM v5.0 — Media Library workspace enhancement. */
(() => {
  if (window.__TECH_SOCIAL_V5_MEDIA__) return;
  window.__TECH_SOCIAL_V5_MEDIA__ = true;
  const addStyles = () => {
    if (document.querySelector('link[data-tech-social-v5-media]')) return;
    const link = document.createElement('link'); link.rel='stylesheet'; link.href=`v5-media.css?v=${Date.now()}`; link.dataset.techSocialV5Media='1'; document.head.appendChild(link);
  };
  const boot = () => {
    addStyles();
    const view=document.querySelector('#mediaView')||document.querySelector('[data-view="media"]');
    if(!view||view.dataset.v5MediaReady==='1')return; view.dataset.v5MediaReady='1';
    const heading=view.querySelector('.view-heading'),grid=document.querySelector('#mediaGrid'),search=document.querySelector('#mediaSearch'),type=document.querySelector('#mediaTypeFilter'),folder=document.querySelector('#mediaFolderFilter'),uploadButton=document.querySelector('#openMediaUploadButton'),input=document.querySelector('#mediaUploadInput');
    if(!heading||!grid)return;
    const toolbar=document.createElement('section'); toolbar.className='v5-media-toolbar panel'; toolbar.innerHTML=`<div class="v5-media-toolbar-main"><div><strong>Media workspace</strong><span>Keep photos, videos, graphics and logos ready for your next post.</span></div><div class="v5-media-actions"><button type="button" class="button button-outline" data-v5-media-filter="all">All media</button><button type="button" class="button button-outline" data-v5-media-filter="image">Photos & graphics</button><button type="button" class="button button-outline" data-v5-media-filter="video">Videos</button><button type="button" class="button button-primary" data-v5-media-upload>Upload media</button></div></div><div class="v5-media-drop" tabindex="0"><span>Drop files here</span><small>Images, video and graphics can be added to the existing media library.</small></div>`; heading.insertAdjacentElement('afterend',toolbar);
    const refresh=()=>{const q=(search?.value||'').trim().toLowerCase(),selectedType=type?.value||'all';[...grid.children].forEach(card=>{const text=(card.textContent||'').toLowerCase(),cardType=(card.dataset.type||card.getAttribute('data-media-type')||'').toLowerCase(),matchesText=!q||text.includes(q),matchesType=selectedType==='all'||!cardType||cardType===selectedType||(selectedType==='image'&&['photo','graphic','image','logo'].includes(cardType));card.hidden=!(matchesText&&matchesType);});};
    toolbar.querySelectorAll('[data-v5-media-filter]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.v5MediaFilter;if(type)type.value=value==='all'?'all':value;refresh();}));
    toolbar.querySelector('[data-v5-media-upload]')?.addEventListener('click',()=>uploadButton?.click()); search?.addEventListener('input',refresh); type?.addEventListener('change',refresh); folder?.addEventListener('change',refresh);
    const drop=toolbar.querySelector('.v5-media-drop'),openFiles=files=>{if(!input||!files?.length)return;try{const dt=new DataTransfer();[...files].forEach(file=>dt.items.add(file));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));}catch{} uploadButton?.click();};
    ['dragenter','dragover'].forEach(n=>drop?.addEventListener(n,e=>{e.preventDefault();drop.classList.add('is-dragging');})); ['dragleave','drop'].forEach(n=>drop?.addEventListener(n,e=>{e.preventDefault();drop.classList.remove('is-dragging');})); drop?.addEventListener('drop',e=>openFiles(e.dataTransfer.files)); drop?.addEventListener('click',()=>uploadButton?.click()); drop?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();uploadButton?.click();}});
    new MutationObserver(refresh).observe(grid,{childList:true,subtree:true}); refresh();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
