(() => {
  'use strict';
  if (window.__TECH_SOCIAL_CAMPAIGN_ATTRIBUTION__) return;
  window.__TECH_SOCIAL_CAMPAIGN_ATTRIBUTION__ = true;

  const esc = v => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function leads() {
    return Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.leads) ? window.__TECH_SOCIAL_MARKETING_STATE__.leads : [];
  }
  function campaigns() {
    return Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.campaigns) ? window.__TECH_SOCIAL_MARKETING_STATE__.campaigns : [];
  }
  function posts() {
    return Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.posts) ? window.__TECH_SOCIAL_MARKETING_STATE__.posts : [];
  }
  function campaignName(id) {
    const c = campaigns().find(x => String(x.id) === String(id));
    return c?.name || (id ? String(id) : 'Unattributed');
  }

  function buildReport() {
    const by = {};
    campaigns().forEach(c => { by[c.id] = {id:c.id,name:c.name,posts:0,enquiries:0,leads:0,customers:0,revenue:0}; });
    posts().forEach(p => { if (p.campaign_id && by[p.campaign_id]) by[p.campaign_id].posts++; });
    leads().forEach(l => {
      const key = l.campaign_id || '__unattributed';
      by[key] ||= {id:key,name:campaignName(key),posts:0,enquiries:0,leads:0,customers:0,revenue:0};
      by[key].enquiries++;
      by[key].leads++;
      if (['customer','won','converted'].includes(String(l.status || '').toLowerCase())) by[key].customers++;
      const amount = Number(l.attributed_revenue ?? l.revenue ?? 0);
      if (Number.isFinite(amount)) by[key].revenue += amount;
    });
    return Object.values(by).sort((a,b) => (b.customers-a.customers) || (b.leads-a.leads) || (b.posts-a.posts));
  }

  function render() {
    const host = document.querySelector('#campaignAttributionPanel');
    if (!host) return;
    const rows = buildReport();
    host.innerHTML = `<div class="mk-card"><div class="mk-card-head"><div><h3>Campaign attribution</h3><p>Track content → enquiries → customers → attributed revenue.</p></div></div><div class="mk-table-wrap"><table class="mk-table"><thead><tr><th>Campaign</th><th>Posts</th><th>Enquiries</th><th>Customers</th><th>Revenue</th><th>Conversion</th></tr></thead><tbody>${rows.length ? rows.map(r => `<tr><td><strong>${esc(r.name)}</strong></td><td>${r.posts}</td><td>${r.enquiries}</td><td>${r.customers}</td><td>£${r.revenue.toFixed(2)}</td><td>${r.enquiries ? ((r.customers/r.enquiries)*100).toFixed(1) : '0.0'}%</td></tr>`).join('') : '<tr><td colspan="6">No campaign data yet.</td></tr>'}</tbody></table></div></div>`;
  }

  function addPanel() {
    const body = document.querySelector('#marketingBody');
    if (!body || body.querySelector('#campaignAttributionPanel')) return;
    const anchor = body.querySelector('#campaignsView, [data-view="campaigns"], .mk-campaigns, .campaigns-panel');
    if (!anchor) return;
    const panel = document.createElement('div'); panel.id='campaignAttributionPanel'; panel.style.marginTop='14px';
    anchor.appendChild(panel); render();
  }

  const observer = new MutationObserver(() => { addPanel(); render(); });
  function init(){ addPanel(); observer.observe(document.body,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
