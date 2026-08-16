(() => {
  'use strict';
  if (window.__TECH_SOCIAL_MARKETING_REPORTS__) return;
  window.__TECH_SOCIAL_MARKETING_REPORTS__ = true;

  const leads=()=>Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.leads)?window.__TECH_SOCIAL_MARKETING_STATE__.leads:[];
  const posts=()=>Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.posts)?window.__TECH_SOCIAL_MARKETING_STATE__.posts:[];
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function report(){
    const now=new Date(), month=now.getMonth(), year=now.getFullYear();
    const monthlyLeads=leads().filter(x=>{const d=new Date(x.created_at||x.createdAt);return !isNaN(d)&&d.getMonth()===month&&d.getFullYear()===year;});
    const monthlyPosts=posts().filter(x=>{const d=new Date(x.published_at||x.scheduled_at||x.created_at);return !isNaN(d)&&d.getMonth()===month&&d.getFullYear()===year;});
    const customers=monthlyLeads.filter(x=>['customer','won','converted'].includes(String(x.status||'').toLowerCase())).length;
    const revenue=monthlyLeads.reduce((s,x)=>s+Number(x.attributed_revenue??x.revenue??0),0);
    const engagement=monthlyPosts.reduce((s,x)=>s+Number(x.engagements??x.engagement??0),0);
    return {monthlyLeads,monthlyPosts,customers,revenue,engagement,conversion:monthlyLeads.length?(customers/monthlyLeads.length)*100:0};
  }
  function render(){
    const host=document.querySelector('#monthlyMarketingReport');if(!host)return;
    const r=report(), month=new Date().toLocaleString('en-GB',{month:'long',year:'numeric'});
    host.innerHTML=`<div class="mk-card"><div class="mk-card-head"><div><h3>${esc(month)} marketing report</h3><p>Performance summary from the social CRM data currently available.</p></div></div><div class="mk-grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));display:grid;gap:10px"><div class="mk-card"><strong>${r.monthlyPosts.length}</strong><span>Posts</span></div><div class="mk-card"><strong>${r.monthlyLeads.length}</strong><span>Enquiries</span></div><div class="mk-card"><strong>${r.customers}</strong><span>Customers</span></div><div class="mk-card"><strong>£${r.revenue.toFixed(2)}</strong><span>Attributed revenue</span></div><div class="mk-card"><strong>${r.engagement}</strong><span>Engagements</span></div><div class="mk-card"><strong>${r.conversion.toFixed(1)}%</strong><span>Lead conversion</span></div></div></div>`;
  }
  function add(){const body=document.querySelector('#marketingBody');if(!body||body.querySelector('#monthlyMarketingReport'))return;const anchor=body.querySelector('#analyticsView,[data-view="analytics"],.mk-analytics,.analytics-panel');if(!anchor)return;const panel=document.createElement('div');panel.id='monthlyMarketingReport';panel.style.marginTop='14px';anchor.appendChild(panel);render();}
  const observer=new MutationObserver(()=>{add();render();});
  function init(){add();observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
