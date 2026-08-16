(() => {
  'use strict';
  if (window.__TECH_SOCIAL_LEAD_WORKFLOW__) return;
  window.__TECH_SOCIAL_LEAD_WORKFLOW__ = true;

  const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const toast = (message, bad=false) => window.toast?.(message, bad);
  let db = null;
  let schema = null;

  function getDb() {
    if (db) return db;
    if (!window.supabase || !window.TECH_SOCIAL_CONFIG) return null;
    db = window.supabase.createClient(window.TECH_SOCIAL_CONFIG.supabaseUrl, window.TECH_SOCIAL_CONFIG.supabaseAnonKey, {
      auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}
    });
    return db;
  }

  async function getSchema() {
    if (schema) return schema;
    const client = getDb();
    if (!client) return {};
    const {data, error} = await client.from('social_leads').select('*').limit(1);
    if (error) { schema = {}; return schema; }
    schema = new Set(Object.keys(data?.[0] || {}));
    return schema;
  }

  function patchField(patch, fields, names, value) {
    const name = names.find(n => fields.has(n));
    if (name && value !== undefined) patch[name] = value;
  }

  async function writeHistory(leadId, eventType, details={}) {
    const client = getDb();
    if (!client) return;
    try {
      await client.from('social_lead_history').insert({
        lead_id: leadId,
        event_type: eventType,
        from_status: details.from_status || null,
        to_status: details.to_status || null,
        note: details.note || '',
        assigned_to_email: details.assigned_to_email || null,
        follow_up_at: details.follow_up_at || null,
        created_by: (await client.auth.getUser()).data?.user?.id || null
      });
    } catch (_) {}
  }

  async function loadLead(id) {
    const client = getDb();
    if (!client) throw new Error('Database client is not ready.');
    const {data, error} = await client.from('social_leads').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async function loadHistory(id) {
    const client = getDb();
    if (!client) return [];
    const {data, error} = await client.from('social_lead_history').select('*').eq('lead_id', id).order('created_at', {ascending:false});
    return error ? [] : (data || []);
  }

  function ensureModal() {
    if (document.querySelector('#leadWorkflowModal')) return;
    const modal = document.createElement('div');
    modal.id = 'leadWorkflowModal';
    modal.className = 'modal-backdrop';
    modal.hidden = true;
    modal.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="leadWorkflowTitle" style="max-width:760px"><div class="modal-header"><div><p>LEAD MANAGEMENT</p><h2 id="leadWorkflowTitle">Lead details</h2></div><button class="close-button" type="button" data-lead-close aria-label="Close">×</button></div><form id="leadWorkflowForm"><input type="hidden" id="leadWorkflowId"><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><label><span>NAME</span><input id="leadWorkflowName" required></label><label><span>SOURCE</span><input id="leadWorkflowPlatform"></label><label><span>EMAIL</span><input id="leadWorkflowEmail" type="email"></label><label><span>PHONE</span><input id="leadWorkflowPhone"></label><label><span>STATUS</span><select id="leadWorkflowStatus"><option value="new">New</option><option value="contacted">Contacted</option><option value="interested">Interested</option><option value="customer">Customer</option><option value="lost">Lost</option></select></label><label><span>ASSIGNED TO</span><input id="leadWorkflowAssigned" placeholder="staff email"></label><label><span>FOLLOW-UP DATE</span><input id="leadWorkflowFollowUp" type="datetime-local"></label><label><span>CAMPAIGN</span><input id="leadWorkflowCampaign" placeholder="Campaign ID (optional)"></label></div><label style="display:block;margin-top:14px"><span>ENQUIRY</span><textarea id="leadWorkflowEnquiry" rows="3"></textarea></label><label style="display:block;margin-top:14px"><span>NOTES</span><textarea id="leadWorkflowNotes" rows="4"></textarea></label><div class="lead-history-box" style="margin-top:16px;padding:14px;border:1px solid #e5e5e5;border-radius:10px"><strong>Follow-up history</strong><div id="leadWorkflowHistory" style="margin-top:10px;max-height:180px;overflow:auto"></div></div><p id="leadWorkflowError" class="auth-message" role="alert"></p><div class="modal-footer"><button class="button button-outline" type="button" id="leadWorkflowConvert">Convert to Customer</button><button class="button button-outline" type="button" data-lead-close>Cancel</button><button class="button button-primary" type="submit">Save lead</button></div></form></section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-lead-close]').forEach(b => b.addEventListener('click', closeModal));
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    modal.querySelector('#leadWorkflowForm').addEventListener('submit', saveLead);
    modal.querySelector('#leadWorkflowConvert').addEventListener('click', convertLead);
  }

  function closeModal() { const m=document.querySelector('#leadWorkflowModal'); if(m)m.hidden=true; }
  function toLocalInput(value) {
    if (!value) return '';
    const d=new Date(value); if (Number.isNaN(d.getTime())) return '';
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocalInput(value) { return value ? new Date(value).toISOString() : null; }

  async function openLead(id) {
    ensureModal();
    const m=document.querySelector('#leadWorkflowModal');
    try {
      const lead=await loadLead(id), fields=await getSchema(), history=await loadHistory(id);
      m.querySelector('#leadWorkflowId').value=lead.id;
      m.querySelector('#leadWorkflowName').value=lead.name || '';
      m.querySelector('#leadWorkflowPlatform').value=lead.platform || '';
      m.querySelector('#leadWorkflowEmail').value=lead.email || '';
      m.querySelector('#leadWorkflowPhone').value=lead.phone || '';
      m.querySelector('#leadWorkflowStatus').value=lead.status || 'new';
      m.querySelector('#leadWorkflowAssigned').value=lead.assigned_to_email || '';
      m.querySelector('#leadWorkflowFollowUp').value=toLocalInput(lead.follow_up_at);
      m.querySelector('#leadWorkflowCampaign').value=lead.campaign_id || '';
      m.querySelector('#leadWorkflowEnquiry').value=lead.enquiry || '';
      m.querySelector('#leadWorkflowNotes').value=lead.notes || '';
      m.querySelector('#leadWorkflowConvert').disabled = lead.status === 'customer';
      m.querySelector('#leadWorkflowError').textContent = fields.size ? '' : 'Lead table is not available yet.';
      m.querySelector('#leadWorkflowHistory').innerHTML=history.length ? history.map(h=>`<div style="padding:7px 0;border-bottom:1px solid #eee"><strong>${esc(h.event_type.replaceAll('_',' '))}</strong><small style="display:block">${esc(new Date(h.created_at).toLocaleString('en-GB'))}${h.note?' — '+esc(h.note):''}</small></div>`).join('') : '<small>No history recorded yet.</small>';
      m.hidden=false;
    } catch (error) { toast(error.message || 'Could not open lead.', true); }
  }

  async function saveLead(event) {
    event.preventDefault();
    const id=document.querySelector('#leadWorkflowId').value;
    const client=getDb(); if(!client || !id)return;
    const fields=await getSchema();
    const before=await loadLead(id);
    const patch={updated_at:new Date().toISOString()};
    patchField(patch,fields,['name'],document.querySelector('#leadWorkflowName').value.trim());
    patchField(patch,fields,['platform','source'],document.querySelector('#leadWorkflowPlatform').value.trim());
    patchField(patch,fields,['email'],document.querySelector('#leadWorkflowEmail').value.trim());
    patchField(patch,fields,['phone'],document.querySelector('#leadWorkflowPhone').value.trim());
    patchField(patch,fields,['status'],document.querySelector('#leadWorkflowStatus').value);
    patchField(patch,fields,['assigned_to_email','assigned_to'],document.querySelector('#leadWorkflowAssigned').value.trim() || null);
    patchField(patch,fields,['follow_up_at','followup_at','follow_up_date'],fromLocalInput(document.querySelector('#leadWorkflowFollowUp').value));
    patchField(patch,fields,['campaign_id'],document.querySelector('#leadWorkflowCampaign').value.trim() || null);
    patchField(patch,fields,['enquiry','message'],document.querySelector('#leadWorkflowEnquiry').value.trim());
    patchField(patch,fields,['notes'],document.querySelector('#leadWorkflowNotes').value.trim());
    const {error}=await client.from('social_leads').update(patch).eq('id',id);
    if(error){document.querySelector('#leadWorkflowError').textContent=error.message;return;}
    const nextStatus=patch.status || before.status;
    if(nextStatus!==before.status) await writeHistory(id,'status_changed',{from_status:before.status,to_status:nextStatus,note:'Lead status updated'});
    if(patch.follow_up_at!==undefined && patch.follow_up_at!==before.follow_up_at) await writeHistory(id,'follow_up_set',{follow_up_at:patch.follow_up_at,note:patch.follow_up_at?'Follow-up date set':'Follow-up date cleared'});
    await writeHistory(id,'updated',{note:'Lead details updated',assigned_to_email:patch.assigned_to_email || null});
    closeModal(); toast('Lead updated.');
    document.querySelector('#v5LeadsView')?.dispatchEvent(new CustomEvent('lead-workflow-updated'));
  }

  async function convertLead() {
    const id=document.querySelector('#leadWorkflowId').value; if(!id)return;
    const client=getDb(); if(!client)return;
    const fields=await getSchema();
    const before=await loadLead(id);
    const patch={status:'customer',updated_at:new Date().toISOString()};
    patchField(patch,fields,['converted_at'],new Date().toISOString());
    const user=(await client.auth.getUser()).data?.user;
    patchField(patch,fields,['converted_by'],user?.id || null);
    const {error}=await client.from('social_leads').update(patch).eq('id',id);
    if(error){toast(error.message,true);return;}
    await writeHistory(id,'converted',{from_status:before.status,to_status:'customer',note:'Lead converted to customer'});
    document.querySelector('#leadWorkflowStatus').value='customer';
    document.querySelector('#leadWorkflowConvert').disabled=true;
    toast('Lead converted to Customer.');
  }

  function addActions() {
    const rows=document.querySelector('#v5LeadRows'); if(!rows)return;
    rows.querySelectorAll('tr').forEach(row=>{
      if(row.dataset.leadWorkflowReady==='1')return;
      const select=row.querySelector('[data-v5-lead-status]'); if(!select)return;
      const id=select.dataset.v5LeadStatus;
      row.dataset.leadWorkflowReady='1';
      const cell=document.createElement('td');
      cell.innerHTML=`<button class="button button-outline lead-manage-button" type="button" data-lead-manage="${esc(id)}">Manage</button>`;
      row.appendChild(cell);
    });
  }

  function addHeader() {
    const table=document.querySelector('#v5LeadRows')?.closest('table');
    if(!table || table.querySelector('[data-lead-workflow-heading]'))return;
    const tr=table.querySelector('thead tr'); if(!tr)return;
    const th=document.createElement('th'); th.dataset.leadWorkflowHeading='1'; th.textContent='ACTIONS'; tr.appendChild(th);
  }

  function init() {
    ensureModal();
    const onClick=e=>{const button=e.target.closest?.('[data-lead-manage]');if(button)openLead(button.dataset.leadManage);};
    document.addEventListener('click',onClick);
    const observer=new MutationObserver(()=>{addHeader();addActions();});
    observer.observe(document.body,{childList:true,subtree:true});
    addHeader();addActions();
    window.techSocialLeadWorkflow={open:openLead,convert:convertLead,refresh:addActions};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
