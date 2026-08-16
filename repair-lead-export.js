(() => {
  'use strict';
  if (window.__TECH_SOCIAL_REPAIR_EXPORT__) return;
  window.__TECH_SOCIAL_REPAIR_EXPORT__ = true;

  const esc = v => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const csv = v => `"${String(v ?? '').replace(/"/g,'""')}"`;

  function isRepairLead(lead) {
    const text = [lead?.enquiry, lead?.notes, lead?.device, lead?.service, lead?.category].join(' ').toLowerCase();
    return /repair|broken|damage|screen|battery|charging|port|water|fault|fix|replacement/.test(text);
  }

  function exportRepairLeads() {
    const leads = Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.leads)
      ? window.__TECH_SOCIAL_MARKETING_STATE__.leads.filter(isRepairLead)
      : [];
    if (!leads.length) {
      if (typeof window.toast === 'function') window.toast('No repair leads are available to export.', true);
      return;
    }
    const columns = ['id','name','email','phone','platform','enquiry','status','campaign_id','created_at','updated_at'];
    const lines = [columns.map(csv).join(',')];
    leads.forEach(lead => lines.push(columns.map(k => csv(lead[k])).join(',')));
    const blob = new Blob([lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tech-lab-repair-leads-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    if (typeof window.toast === 'function') window.toast(`${leads.length} repair lead${leads.length===1?'':'s'} exported.`);
  }

  function addButton() {
    const body = document.querySelector('#marketingBody');
    if (!body || body.querySelector('#exportRepairLeads')) return;
    const toolbar = body.querySelector('.mk-toolbar');
    if (!toolbar) return;
    const button = document.createElement('button');
    button.id = 'exportRepairLeads';
    button.className = 'mk-btn dark';
    button.type = 'button';
    button.textContent = 'Export Repair Leads';
    button.title = 'Export repair enquiries for temporary import into the Tech Lab CRM';
    button.onclick = exportRepairLeads;
    toolbar.querySelector('.mk-toolbar-left')?.appendChild(button) || toolbar.appendChild(button);
  }

  const observe = new MutationObserver(addButton);
  const init = () => { addButton(); observe.observe(document.body, {childList:true, subtree:true}); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
