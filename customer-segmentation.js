(() => {
  'use strict';
  if (window.__TECH_SOCIAL_CUSTOMER_SEGMENTS__) return;
  window.__TECH_SOCIAL_CUSTOMER_SEGMENTS__ = true;

  const esc = v => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const leads = () => Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.leads) ? window.__TECH_SOCIAL_MARKETING_STATE__.leads : [];
  const customers = () => Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.customers) ? window.__TECH_SOCIAL_MARKETING_STATE__.customers : [];

  function classify(item) {
    const text = [item?.enquiry,item?.notes,item?.device,item?.service,item?.category,item?.product].join(' ').toLowerCase();
    if (/gaming|console|xbox|playstation|ps5|ps4|nintendo|pc gaming/.test(text)) return 'Gaming';
    if (/laptop|macbook|notebook|computer|elitebook|probook/.test(text)) return 'Laptop';
    if (/iphone|ipad|android|samsung|phone|mobile/.test(text)) return 'Phone';
    if (/repair|broken|damage|screen|battery|charging|port|water|fault|fix|replacement/.test(text)) return 'Repair';
    return 'Other';
  }

  function build() {
    const all = [...customers(), ...leads()];
    const seen = new Set(), rows = [];
    all.forEach(x => {
      const key = x.id || `${x.email||''}|${x.phone||''}|${x.name||x.customer_name||''}`;
      if (seen.has(key)) return; seen.add(key);
      const name = x.name || x.customer_name || 'Unknown';
      const email = x.email || x.customer_email || '';
      const phone = x.phone || x.customer_phone || '';
      rows.push({key,name,email,phone,segment:classify(x),status:x.status||'Customer',source:x.source||x.platform||'Unknown'});
    });
    return rows;
  }

  function render(filter='All') {
    const host = document.querySelector('#customerSegmentsPanel'); if (!host) return;
    const rows = build().filter(r => filter==='All' || r.segment===filter);
    host.innerHTML = `<div class="mk-card"><div class="mk-card-head"><div><h3>Customer segments</h3><p>Quickly group social customers and enquiries by the type of business they are interested in.</p></div><select id="customerSegmentFilter"><option>All</option><option>Repair</option><option>Laptop</option><option>Gaming</option><option>Phone</option><option>Other</option></select></div><div class="mk-table-wrap"><table class="mk-table"><thead><tr><th>Customer</th><th>Segment</th><th>Contact</th><th>Status</th><th>Source</th></tr></thead><tbody>${rows.length ? rows.map(r=>`<tr><td><strong>${esc(r.name)}</strong></td><td>${esc(r.segment)}</td><td>${esc(r.email||r.phone||'—')}</td><td>${esc(r.status)}</td><td>${esc(r.source)}</td></tr>`).join('') : '<tr><td colspan="5">No customers or leads match this segment.</td></tr>'}</tbody></table></div></div>`;
    host.querySelector('#customerSegmentFilter').value=filter;
    host.querySelector('#customerSegmentFilter').onchange=e=>render(e.target.value);
  }

  function addPanel(){
    const body=document.querySelector('#marketingBody'); if(!body||body.querySelector('#customerSegmentsPanel')) return;
    const anchor=body.querySelector('#customersView,[data-view="customers"],.mk-customers,.customers-panel'); if(!anchor) return;
    const panel=document.createElement('div'); panel.id='customerSegmentsPanel'; panel.style.marginTop='14px'; anchor.appendChild(panel); render();
  }
  const observer=new MutationObserver(()=>{addPanel();render(document.querySelector('#customerSegmentFilter')?.value||'All');});
  function init(){addPanel();observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
