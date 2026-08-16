/* Tech Social CRM v5.0 — Content Approval Centre.
 * Builds on the existing approval RPCs/tables already used by app.js.
 * No Meta/OAuth code is touched.
 */
(() => {
  if (window.__TECH_SOCIAL_V5_APPROVAL__) return;
  window.__TECH_SOCIAL_V5_APPROVAL__ = true;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const label = status => ({draft:'Draft',approval:'Awaiting approval',scheduled:'Scheduled',ready:'Ready to publish',published:'Published'}[status] || status || 'Unknown');
  const platforms = value => {
    let list = value;
    if (typeof value === 'string') { try { list = JSON.parse(value); } catch { list = value.split(',').map(x => x.trim()).filter(Boolean); } }
    if (!Array.isArray(list)) list = [];
    return list.map(x => `<span class="v5-approval-platform">${esc(x)}</span>`).join('');
  };

  const client = () => window.supabase.createClient(
    window.TECH_SOCIAL_CONFIG.supabaseUrl,
    window.TECH_SOCIAL_CONFIG.supabaseAnonKey,
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
  );

  const inject = () => {
    if (!document.body || document.querySelector('[data-v5-approval-centre]')) return;

    const navAnchor = document.querySelector('[data-view-link="posts"]') || document.querySelector('[data-view-link="calendar"]');
    if (navAnchor && navAnchor.parentElement) {
      const item = navAnchor.parentElement.cloneNode(true);
      const button = item.querySelector('[data-view-link]');
      if (button) {
        button.dataset.viewLink = 'v5-approval';
        button.textContent = 'Approval Queue';
        button.removeAttribute('aria-current');
      }
      navAnchor.parentElement.after(item);
    }

    const page = document.createElement('section');
    page.id = 'v5ApprovalCentre';
    page.className = 'v5-approval-page';
    page.hidden = true;
    page.dataset.v5ApprovalCentre = '1';
    page.innerHTML = `
      <div class="v5-approval-header">
        <div><p>VERSION 5.0 · CONTENT WORKFLOW</p><h1>Approval Queue</h1><span>Review social content before it moves to scheduling and publishing.</span></div>
        <button class="button button-outline" type="button" data-v5-approval-refresh>Refresh queue</button>
      </div>
      <div class="v5-approval-stats">
        <article><strong data-v5-count="waiting">0</strong><span>Awaiting approval</span></article>
        <article><strong data-v5-count="scheduled">0</strong><span>Scheduled</span></article>
        <article><strong data-v5-count="changes">0</strong><span>Returned for changes</span></article>
      </div>
      <div class="v5-approval-toolbar"><label>Search <input type="search" data-v5-approval-search placeholder="Search captions or notes…"></label><label>Status <select data-v5-approval-filter><option value="approval">Awaiting approval</option><option value="all">All workflow statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="ready">Ready to publish</option><option value="published">Published</option></select></label></div>
      <div class="v5-approval-list" data-v5-approval-list></div>
      <div class="v5-approval-empty" data-v5-approval-empty hidden>No posts match this approval queue.</div>
    `;
    const main = document.querySelector('main') || document.body;
    main.appendChild(page);

    const style = document.createElement('style');
    style.dataset.v5ApprovalStyle = '1';
    style.textContent = `
      .v5-approval-page{padding:28px;max-width:1400px;margin:0 auto}.v5-approval-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:22px}.v5-approval-header p{margin:0 0 5px;font-size:11px;font-weight:800;letter-spacing:.12em;color:#777}.v5-approval-header h1{margin:0;font-size:30px;color:#111}.v5-approval-header span{display:block;margin-top:7px;color:#666}.v5-approval-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}.v5-approval-stats article{background:#fff;border:1px solid #e6e6e6;border-radius:14px;padding:18px}.v5-approval-stats strong{display:block;font-size:28px;color:#111}.v5-approval-stats span{font-size:12px;color:#777}.v5-approval-toolbar{display:flex;gap:12px;align-items:end;background:#fff;border:1px solid #e6e6e6;border-radius:14px;padding:14px;margin-bottom:16px}.v5-approval-toolbar label{font-size:11px;font-weight:800;text-transform:uppercase;color:#666;display:flex;flex-direction:column;gap:6px}.v5-approval-toolbar input,.v5-approval-toolbar select{min-width:240px;border:1px solid #ddd;border-radius:8px;padding:10px;background:#fff}.v5-approval-list{display:grid;gap:12px}.v5-approval-card{display:grid;grid-template-columns:1fr auto;gap:18px;background:#fff;border:1px solid #e3e3e3;border-radius:14px;padding:18px}.v5-approval-card h3{margin:0 0 7px;font-size:16px;color:#111}.v5-approval-card p{margin:0;color:#555;white-space:pre-wrap}.v5-approval-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.v5-approval-platform,.v5-approval-status{font-size:10px;font-weight:800;padding:5px 8px;border-radius:999px;background:#f1f1f1;color:#333}.v5-approval-status{background:#fff2df}.v5-approval-actions{display:flex;align-items:center;gap:8px}.v5-approval-actions button{white-space:nowrap}.v5-approval-empty{padding:50px;text-align:center;color:#777;background:#fff;border:1px dashed #ddd;border-radius:14px}.v5-approval-nav-badge{margin-left:auto}
      @media(max-width:700px){.v5-approval-page{padding:18px}.v5-approval-header,.v5-approval-toolbar{flex-direction:column;align-items:stretch}.v5-approval-stats{grid-template-columns:1fr}.v5-approval-toolbar input,.v5-approval-toolbar select{min-width:0;width:100%}.v5-approval-card{grid-template-columns:1fr}.v5-approval-actions{justify-content:flex-start}}
    `;
    document.head.appendChild(style);

    const list = page.querySelector('[data-v5-approval-list]');
    const empty = page.querySelector('[data-v5-approval-empty]');
    let records = [];

    const openExistingPost = id => {
      const nav = document.querySelector('[data-view-link="posts"]');
      nav?.click();
      setTimeout(() => {
        const button = document.querySelector(`[data-edit-post="${CSS.escape(id)}"]`);
        if (button) button.click();
        else window.alert('Open the All Posts view to review this post.');
      }, 250);
    };

    const render = () => {
      const query = page.querySelector('[data-v5-approval-search]').value.trim().toLowerCase();
      const filter = page.querySelector('[data-v5-approval-filter]').value;
      const rows = records.filter(p => (filter==='all'||p.status===filter) && (!query || `${p.caption||''} ${p.notes||''}`.toLowerCase().includes(query)));
      page.querySelector('[data-v5-count="waiting"]').textContent = records.filter(p=>p.status==='approval').length;
      page.querySelector('[data-v5-count="scheduled"]').textContent = records.filter(p=>p.status==='scheduled').length;
      page.querySelector('[data-v5-count="changes"]').textContent = records.filter(p=>p.status==='draft').length;
      empty.hidden = rows.length > 0;
      list.innerHTML = rows.map(p => `
        <article class="v5-approval-card">
          <div><h3>${esc((p.caption||'Untitled post').slice(0,120))}</h3><p>${esc(p.notes||'No internal notes.')}</p><div class="v5-approval-meta">${platforms(p.platforms)}<span class="v5-approval-status">${esc(label(p.status))}</span>${p.scheduled_at?`<span class="v5-approval-status">${esc(new Date(p.scheduled_at).toLocaleString('en-GB'))}</span>`:''}</div></div>
          <div class="v5-approval-actions"><button class="button button-outline" data-v5-review="${esc(p.id)}">Review</button>${p.status==='approval'?`<button class="button complete-button" data-v5-approve="${esc(p.id)}">Approve</button>`:''}</div>
        </article>`).join('');
      list.querySelectorAll('[data-v5-review]').forEach(b=>b.addEventListener('click',()=>openExistingPost(b.dataset.v5Review)));
      list.querySelectorAll('[data-v5-approve]').forEach(b=>b.addEventListener('click',()=>decide(b.dataset.v5Approve,'approve')));
    };

    const load = async () => {
      list.innerHTML='<div class="v5-approval-empty">Loading approval queue…</div>';
      try {
        const c=client();
        const {data,error}=await c.from('posts').select('*').in('status',['approval','draft','scheduled','ready','published']).order('scheduled_at',{ascending:true,nullsFirst:false});
        if(error) throw error;
        records=data||[]; render();
      } catch(error) {
        list.innerHTML=`<div class="v5-approval-empty">Could not load the approval queue.<br><small>${esc(error?.message||'Unknown database error')}</small></div>`;
      }
    };

    const decide = async (id, decision) => {
      const reason = decision==='changes' ? window.prompt('Reason for requesting changes:','Please make the requested changes before resubmitting.') : '';
      if(decision==='changes' && !reason?.trim()) return;
      const c=client();
      const {data,error}=await c.rpc('set_post_approval_with_reason',{p_post_id:id,p_decision:decision,p_reason:reason||''});
      if(error){window.alert(error.message);return;}
      const row=records.find(p=>p.id===id); if(row) row.status=data;
      render();
    };

    page.querySelector('[data-v5-approval-refresh]').addEventListener('click',load);
    page.querySelector('[data-v5-approval-search]').addEventListener('input',render);
    page.querySelector('[data-v5-approval-filter]').addEventListener('change',render);

    const show = () => {
      document.querySelectorAll('main > section').forEach(section=>{ if(section!==page && !section.classList.contains('modal-backdrop')) section.hidden=true; });
      page.hidden=false;
      load();
    };
    const originalViewLinks = [...document.querySelectorAll('[data-view-link]')];
    originalViewLinks.forEach(button=>button.addEventListener('click',()=>{ if(button.dataset.viewLink!=='v5-approval') page.hidden=true; }));
    const approvalButton = document.querySelector('[data-view-link="v5-approval"]');
    approvalButton?.addEventListener('click',event=>{event.preventDefault();show();});

    /* If the existing post editor is already using the approval workflow, make
       the new queue a front door rather than replacing those proven controls. */
    if (window.__TECH_SOCIAL_V5_APPROVAL_AUTO_OPEN__) show();
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',inject,{once:true});
  else setTimeout(inject,250);
})();
