(() => {
  'use strict';
  if (window.__TECH_SOCIAL_REPAIR_EXPORT__) return;
  window.__TECH_SOCIAL_REPAIR_EXPORT__ = true;

  const csv = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const repairPattern = /repair|broken|damage|screen|battery|charging|port|water|fault|fix|replacement/i;
  const getLeads = () => Array.isArray(window.__TECH_SOCIAL_MARKETING_STATE__?.leads)
    ? window.__TECH_SOCIAL_MARKETING_STATE__.leads.filter(lead =>
        repairPattern.test([lead?.enquiry, lead?.notes, lead?.device, lead?.service, lead?.category].join(' ')))
    : [];

  function makeCsv(leads) {
    const columns = ['id','name','email','phone','platform','enquiry','status','campaign_id','created_at','updated_at'];
    return [columns.map(csv).join(','), ...leads.map(lead => columns.map(k => csv(lead[k])).join(','))].join('\r\n');
  }

  function downloadCsv(leads) {
    const blob = new Blob([makeCsv(leads)], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tech-lab-repair-leads-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function emailRepairLeads() {
    const leads = getLeads();
    if (!leads.length) {
      if (typeof window.toast === 'function') window.toast('No repair leads are available to send.', true);
      return;
    }

    // Browsers cannot attach a generated CSV to mailto automatically.
    // Download first, then open the user's normal email client with the exact recipients populated.
    downloadCsv(leads);
    const date = new Date().toLocaleDateString('en-GB');
    const subject = `Tech Social CRM - Repair Leads - ${date}`;
    const body = `Hi Chris,\n\nPlease find attached the repair leads exported from Tech Social CRM.\n\nNumber of repair leads: ${leads.length}\nExport date: ${date}\n\nThe CSV file has been downloaded automatically. Please attach it to this email before sending.\n\nThanks,\nTech Social CRM`;
    window.location.href = `mailto:chris@techfixlab.co.uk?cc=Sales@techfixlab.co.uk&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window.toast === 'function') window.toast('CSV downloaded and email draft opened. Attach the CSV before sending.');
  }

  function addButtons() {
    const body = document.querySelector('#marketingBody');
    if (!body) return;
    const toolbar = body.querySelector('.mk-toolbar');
    if (!toolbar) return;
    const target = toolbar.querySelector('.mk-toolbar-left') || toolbar;

    if (!target.querySelector('#exportRepairLeads')) {
      const button = document.createElement('button');
      button.id = 'exportRepairLeads';
      button.className = 'mk-btn dark';
      button.type = 'button';
      button.textContent = 'Export Repair Leads';
      button.title = 'Download repair leads as a CSV for Tech Lab CRM import';
      button.onclick = () => {
        const leads = getLeads();
        if (!leads.length) return window.toast?.('No repair leads are available to export.', true);
        downloadCsv(leads);
        window.toast?.(`${leads.length} repair lead${leads.length === 1 ? '' : 's'} exported.`);
      };
      target.appendChild(button);
    }

    if (!target.querySelector('#emailRepairLeads')) {
      const button = document.createElement('button');
      button.id = 'emailRepairLeads';
      button.className = 'mk-btn dark';
      button.type = 'button';
      button.textContent = 'Email Repair Leads to Tech Lab';
      button.title = 'Download the CSV and open an email addressed to Chris with Sales copied';
      button.onclick = emailRepairLeads;
      target.appendChild(button);
    }
  }

  const init = () => {
    addButtons();
    new MutationObserver(addButtons).observe(document.body, {childList:true, subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
