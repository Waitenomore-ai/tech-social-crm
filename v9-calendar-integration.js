(() => {
  'use strict';
  if (window.__TECH_SOCIAL_V9_CALENDAR__) return;
  window.__TECH_SOCIAL_V9_CALENDAR__ = true;

  const CONFIG = window.TECH_SOCIAL_CONFIG;
  if (!CONFIG || !window.supabase?.createClient) return;
  const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let campaignFilter='all';
  let campaigns=[];
  let channel=null;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  async function loadCampaigns(){
    try {
      const {data,error}=await client.from('campaigns').select('id,name,status').order('name');
      if(error) return;
      campaigns=data||[];
      const select=document.querySelector('#v9CampaignFilter');
      if(!select)return;
      const current=campaignFilter;
      select.innerHTML='<option value="all">All campaigns</option>'+campaigns.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
      select.value=campaigns.some(c=>String(c.id)===String(current))?current:'all';
    } catch(_) {}
  }

  function addCampaignFilter(){
    const toolbar=document.querySelector('.calendar-toolbar');
    if(!toolbar)return;
    if(toolbar.querySelector('#v9CampaignFilter'))return;
    const controls=toolbar.querySelector('.v5-calendar-controls')||toolbar;
    const select=document.createElement('select');
    select.id='v9CampaignFilter';
    select.title='Filter calendar by campaign';
    select.innerHTML='<option value="all">All campaigns</option>';
    controls.appendChild(select);
    select.addEventListener('change',()=>{campaignFilter=select.value;filterCalendar()});
    loadCampaigns();
  }

  function filterCalendar(){
    document.querySelectorAll('[data-v5-post]').forEach(node=>{
      if(campaignFilter==='all'){node.style.display='';return;}
      const postId=node.dataset.v5Post;
      const postCampaign=document.querySelector(`[data-calendar-campaign="${CSS.escape(postId)}"]`)?.dataset.campaignId;
      node.style.display=String(postCampaign||'')===String(campaignFilter)?'':'none';
    });
    // Existing calendar owns the data query/rendering. Re-render after filter change so
    // hidden empty days remain structurally correct.
    window.techSocialV5Calendar?.refresh?.();
  }

  async function refresh(){
    await loadCampaigns();
    window.techSocialV5Calendar?.refresh?.();
    filterCalendar();
  }

  function subscribe(){
    if(channel)return;
    channel=client.channel('v9-calendar-posts');
    channel.on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>refresh());
    channel.on('postgres_changes',{event:'*',schema:'public',table:'campaigns'},()=>refresh());
    channel.subscribe();
  }

  function addCampaignMetadata(){
    document.querySelectorAll('[data-v5-post]').forEach(node=>{
      const id=node.dataset.v5Post;
      if(node.dataset.calendarCampaignReady)return;
      const original=node.getAttribute('data-campaign-id');
      if(original){
        node.dataset.calendarCampaign= id;
        node.dataset.calendarCampaignReady='1';
      }
    });
  }

  function boot(){
    addCampaignFilter();
    addCampaignMetadata();
    subscribe();
    loadCampaigns();
    const observer=new MutationObserver(()=>{addCampaignFilter();addCampaignMetadata();});
    observer.observe(document.body,{childList:true,subtree:true});
    window.techSocialV9Calendar={refresh};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
