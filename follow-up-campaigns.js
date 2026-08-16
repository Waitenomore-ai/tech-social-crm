(() => {
  'use strict';
  if (window.__TECH_SOCIAL_FOLLOW_UPS__) return;
  window.__TECH_SOCIAL_FOLLOW_UPS__ = true;

  const KEY='tech_social_follow_up_campaigns';
  const get=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const save=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const leads=()=>Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.leads)?window.__TECH_SOCIAL_MARKETING_STATE__.leads:[];
  const customers=()=>Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.customers)?window.__TECH_SOCIAL_MARKETING_STATE__.customers:[];

  function audience(type){
    const all=[...customers(),...leads()]; const seen=new Set();
    return all.filter(x=>{const key=x.id||x.email||x.phone||x.name||x.customer_name;if(seen.has(key))return false;seen.add(key);return true}).filter(x=>{
      const t=[x.enquiry,x.notes,x.device,x.service,x.category,x.product].join(' ').toLowerCase();
      if(type==='repair')return /repair|broken|damage|screen|battery|charging|port|fault|fix|replacement/.test(t);
      if(type==='laptop')return /laptop|macbook|notebook|elitebook|probook/.test(t);
      if(type==='gaming')return /gaming|console|xbox|playstation|ps5|ps4|nintendo/.test(t);
      if(type==='review')return true;
      if(type==='inactive'){const d=new Date(x.updated_at||x.last_visit||x.created_at);return !isNaN(d)&&Date.now()-d.getTime()>90*86400000;}
      return true;
    });
  }

  function statusFor(x){
    const d=new Date(x.due_date||''); if(!x.due_date)return 'planned'; return d<=new Date()&&x.status==='planned'?'due':x.status||'planned';
  }
  function render(){
    const host=document.querySelector('#followUpCampaignsPanel');if(!host)return;
    const items=get().map(x=>({...x,status:statusFor(x)}));
    const counts=['planned','due','sent','completed'].map(s=>[s,items.filter(x=>x.status===s).length]);
    host.innerHTML=`<div class="mk-card"><div class="mk-card-head"><div><h3>Follow-up campaigns</h3><p>Bring previous customers back with targeted follow-ups.</p></div><button class="mk-btn dark" id="newFollowUp">New follow-up</button></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${counts.map(([s,n])=>`<span class="mk-pill">${s.toUpperCase()}: ${n}</span>`).join('')}</div><div class="mk-table-wrap"><table class="mk-table"><thead><tr><th>Campaign</th><th>Segment</th><th>Due</th><th>Status</th><th>History</th></tr></thead><tbody>${items.length?items.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.segment)}</td><td>${esc(x.due_date||'—')}</td><td>${esc(x.status)}</td><td>${(x.history||[]).length}</td></tr>`).join(''):'<tr><td colspan="5">No follow-up campaigns yet.</td></tr>'}</tbody></table></div></div>`;
    host.querySelector('#newFollowUp').onclick=()=>create();
  }
  function create(){
    const segment=prompt('Segment: repair, laptop, gaming, inactive, review or all','repair');if(segment===null)return;
    const type=segment.toLowerCase().trim(); if(!['repair','laptop','gaming','inactive','review','all'].includes(type)){window.toast?.('Invalid segment.',true);return;}
    const name=prompt('Follow-up campaign name',`${type==='all'?'Customer':type} follow-up`);if(!name)return;
    const due=prompt('Due date (YYYY-MM-DD)',new Date().toISOString().slice(0,10));if(!due)return;
    const list=get(); list.push({id:crypto.randomUUID(),name,segment:type,due_date:due,status:'planned',audience_count:audience(type).length,history:[{at:new Date().toISOString(),event:'created'}],created_at:new Date().toISOString()}); save(list); render(); window.toast?.('Follow-up campaign created.');
  }
  function add(){const body=document.querySelector('#marketingBody');if(!body||body.querySelector('#followUpCampaignsPanel'))return;const anchor=body.querySelector('#campaignsView,[data-view="campaigns"],.mk-campaigns,.campaigns-panel');if(!anchor)return;const p=document.createElement('div');p.id='followUpCampaignsPanel';p.style.marginTop='14px';anchor.appendChild(p);render();}
  function init(){add();new MutationObserver(()=>{add();render()}).observe(document.body,{childList:true,subtree:true});window.techSocialFollowUps={get,save,audience,render};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
