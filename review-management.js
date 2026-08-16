(() => {
  'use strict';
  if (window.__TECH_SOCIAL_REVIEW_MANAGEMENT__) return;
  window.__TECH_SOCIAL_REVIEW_MANAGEMENT__ = true;

  const TO = 'chris@techfixlab.co.uk';
  const CC = 'Sales@techfixlab.co.uk';
  const REVIEW_URL = 'https://share.google/7Mr6PgVfyF7cyEsBc';
  const esc = v => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const csv = v => `"${String(v ?? '').replace(/"/g,'""')}"`;

  function getRequests() {
    return Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.reviewRequests)
      ? window.__TECH_SOCIAL_MARKETING_STATE__.reviewRequests : [];
  }

  function isPending(r) { return !r.status || ['pending','not_requested'].includes(String(r.status).toLowerCase()); }

  function emailRequest(r) {
    const subject = encodeURIComponent(`Tech Lab review request — ${r.customer_name || 'Customer'}`);
    const body = encodeURIComponent(`Hi ${r.customer_name || 'there'},\n\nThank you for choosing Tech Lab. We hope you're happy with the service you received.\n\nIf you have a moment, we'd really appreciate an honest Google review:\n${r.review_url || REVIEW_URL}\n\nThank you,\nTech Lab Worthing`);
    window.location.href = `mailto:${encodeURIComponent(r.customer_email || '')}?cc=${encodeURIComponent(CC)}&subject=${subject}&body=${body}`;
  }

  function exportQueue() {
    const pending = getRequests().filter(isPending);
    if (!pending.length) { window.toast?.('There are no outstanding review requests.', true); return; }
    const cols = ['id','customer_name','customer_email','customer_phone','repair_id','repair_description','status','review_url','requested_at','received_at','notes','created_at'];
    const rows = [cols.map(csv).join(',')];
    pending.forEach(r => rows.push(cols.map(k => csv(r[k])).join(',')));
    const blob = new Blob([rows.join('\r\n')], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `tech-lab-review-requests-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    window.toast?.(`${pending.length} review request${pending.length===1?'':'s'} exported.`);
  }

  function addControls() {
    const body = document.querySelector('#marketingBody');
    if (!body || body.querySelector('#reviewManagementControls')) return;
    const toolbar = body.querySelector('.mk-toolbar');
    if (!toolbar) return;
    const wrap = document.createElement('div'); wrap.id='reviewManagementControls'; wrap.className='mk-toolbar-left';
    const pending = getRequests().filter(isPending).length;
    wrap.innerHTML = `<button class="mk-btn dark" id="reviewQueueExport" type="button">Export Review Queue</button><span style="font-size:9px;color:var(--muted);padding:7px 4px"><b>${pending}</b> outstanding review request${pending===1?'':'s'}</span>`;
    toolbar.appendChild(wrap);
    wrap.querySelector('#reviewQueueExport').onclick = exportQueue;
  }

  function exposeHelpers() { window.techSocialReview = {emailRequest, exportQueue, refresh:addControls}; }
  const observer = new MutationObserver(addControls);
  function init(){ exposeHelpers(); addControls(); observer.observe(document.body,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
