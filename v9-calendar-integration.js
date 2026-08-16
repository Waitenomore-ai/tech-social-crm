(() => {
  'use strict';
  if (window.__TECH_SOCIAL_V9_CALENDAR__) return;
  window.__TECH_SOCIAL_V9_CALENDAR__ = true;

  const CONFIG = window.TECH_SOCIAL_CONFIG;
  if (!CONFIG || !window.supabase?.createClient) return;
  const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let campaignFilter='all';
  let campaignMap=new Map();
  let postCampaignMap=new Map();
  let channel=null;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  async function loadData(){
    try {
      const [{data:campaigns,error:campaignError},{data:posts,error:postError}]=await Promise.all([
        client.from('campaigns').select('id,name,status').order('name'),
        client.from('posts').select('id,campaign_id')
      ]);
      if(!campaignError)campaignMap=new Map((campaigns||[]).map(c=>[String(c.id),c]));
      if(!postError)postCampaignMap=new Map((posts||[]).map(p=>[String(p.id),p.campaign_id?String(p.campaign_id):'']));
      const select=document.querySelector('#v9CampaignFilter');
      if(select){
        const current=campaignFilter;
        select.innerHTML='<option value="all">All campaigns</option>'+Array.from(campaignMap.values()).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
        select.value=campaignMap.has(String(current))?current:'all';
      }
    } catch(_) {}
  }

  function addCampaignFilter(){
    const toolbar=document.querySelector('.calendar-toolbar');
    if(!toolbar || toolbar.querySelector('#v9CampaignFilter'))return;
    const controls=toolbar.querySelector('.v5-calendar-controls')||toolbar;
    const select=document.createElement('select');
    select.id='v9CampaignFilter';
    select.title='Filter calendar by campaign';
    select.innerHTML='<option value="all">All campaigns</option>';
    controls.appendChild(select);
    select.addEventListener('change',()=>{campaignFilter=select.value;applyFilter()});
  }

  function applyFilter(){
    document.querySelectorAll('[data-v5-post]').forEach(node=>{
      const id=String(node.dataset.v5Post||'');
      const matches=campaignFilter==='all'||String(postCampaignMap.get(id)||'')===String(campaignFilter);
      node.style.display=matches?'':'none';
    });
  }

  async function refresh(){
    await loadData();
    addCampaignFilter();
    applyFilter();
  }

  function subscribe(){
    if(channel)return;
    channel=client.channel('v9-calendar-realtime');
    channel.on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>refresh());
    channel.on('postgres_changes',{event:'*',schema:'public',table:'campaigns'},()=>refresh());
    channel.subscribe();
  }

  function boot(){
    addCampaignFilter();
    refresh();
    subscribe();
    const observer=new MutationObserver(()=>{addCampaignFilter();applyFilter();});
    observer.observe(document.body,{childList:true,subtree:true});
    window.techSocialV9Calendar={refresh};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
