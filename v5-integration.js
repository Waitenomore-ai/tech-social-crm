(() => {
  'use strict';
  if (window.__TECH_SOCIAL_V5_INTEGRATION__) return;
  window.__TECH_SOCIAL_V5_INTEGRATION__ = true;

  const REVIEW_URL = 'https://share.google/7Mr6PgVfyF7cyEsBc';
  const REPAIR_TO = 'chris@techfixlab.co.uk';
  const REPAIR_CC = 'Sales@techfixlab.co.uk';
  let data = { leads: [], segments: [], reviews: [], followups: [], followupCampaigns: [], reports: [] };
  let ready = false;

  const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const csv = value => `"${String(value ?? '').replace(/"/g,'""')}"`;
  const fmtDate = value => value ? new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)) : '—';
  const money = value => `£${Number(value || 0).toFixed(2)}`;
  const toastSafe = (message, warning=false) => typeof window.toast === 'function' ? window.toast(message, warning) : console.log(message);

  async function loadMarketingData() {
    if (!window.supabase || !window.TECH_SOCIAL_CONFIG || !currentUser) return false;
    if (!db) db = window.supabase.createClient(window.TECH_SOCIAL_CONFIG.supabaseUrl, window.TECH_SOCIAL_CONFIG.supabaseAnonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const results = await Promise.all([
      db.from('social_leads').select('*').order('updated_at',{ascending:false}),
      db.from('customer_segments').select('*').eq('active',true).order('name'),
      db.from('review_requests').select('*').order('created_at',{ascending:false}),
      db.from('followup_campaigns').select('*').order('created_at',{ascending:false}),
      db.from('lead_followups').select('*').order('scheduled_at'),
      db.from('marketing_monthly_reports').select('*').order('month',{ascending:false})
    ]);
    const [leads,segments,reviews,campaigns,followups,reports] = results;
    const firstError = results.find(r => r.error)?.error;
    if (firstError && /relation .* does not exist|schema cache/i.test(firstError.message || '')) {
      ready = false;
      return false;
    }
    if (leads.error || segments.error || reviews.error || campaigns.error || followups.error || reports.error) {
      ready = false;
      return false;
    }
    data = { leads: leads.data || [], segments: segments.data || [], reviews: reviews.data || [], followupCampaigns: campaigns.data || [], followups: followups.data || [], reports: reports.data || [] };
    ready = true;
    return true;
  }

  function addMarketingNavigation() {
    if (document.querySelector('[data-v5-marketing-nav]')) return;
    const group = document.createElement('section');
    group.className = 'sidebar-group';
    group.dataset.sidebarGroup = 'marketing-v5';
    group.dataset.v5MarketingNav = '1';
    group.innerHTML = `<button class="nav-label sidebar-group-toggle" type="button" data-sidebar-toggle="marketing-v5" aria-expanded="true"><span>MARKETING</span><span>⌄</span></button><nav class="side-nav" aria-label="Marketing navigation"><button class="nav-item" type="button" data-view-link="leads"><span>Leads & enquiries</span><b id="v5LeadCount">0</b></button><button class="nav-item" type="button" data-view-link="reviews"><span>Google reviews</span><b id="v5ReviewCount">0</b></button><button class="nav-item" type="button" data-view-link="followups"><span>Follow-up campaigns</span><b id="v5FollowupCount">0</b></button></nav>`;
    const system = document.querySelector('[data-sidebar-group="system"]');
    system?.before(group);
    group.querySelector('[data-sidebar-toggle]')?.addEventListener('click', () => group.classList.toggle('collapsed'));
    group.querySelectorAll('[data-view-link]').forEach(button => button.addEventListener('click', () => window.showView?.(button.dataset.viewLink)));
  }

  function addViews() {
    const main = document.querySelector('.main-shell');
    if (!main || document.querySelector('#v5LeadsView')) return;
    const footer = main.querySelector('footer');
    const shell = document.createDocumentFragment();
    const leadsView = document.createElement('section'); leadsView.className='view'; leadsView.id='v5LeadsView'; leadsView.dataset.view='leads'; leadsView.hidden=true;
    leadsView.innerHTML = `<div class="view-heading"><div><p>MARKETING PIPELINE</p><h2>Leads & enquiries</h2><span>Track social enquiries from first contact through to customer, without duplicating the Tech Lab CRM.</span></div><div class="heading-actions"><button class="button button-outline" id="v5ExportRepair" type="button">Export repair leads</button><button class="button button-primary" id="v5NewLead" type="button">New lead</button></div></div><div class="request-stats"><article><small>NEW</small><strong id="v5LeadNew">0</strong></article><article><small>CONTACTED</small><strong id="v5LeadContacted">0</strong></article><article><small>INTERESTED</small><strong id="v5LeadInterested">0</strong></article><article><small>CUSTOMERS</small><strong id="v5LeadCustomers">0</strong></article></div><section class="panel requests-panel"><div class="filter-bar"><label class="list-search"><input id="v5LeadSearch" type="search" placeholder="Search name, enquiry, phone or email…" /></label><select id="v5LeadStatus"><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="interested">Interested</option><option value="customer">Customer</option><option value="lost">Lost</option></select><select id="v5LeadSegment"><option value="all">All segments</option></select></div><div class="table-wrap"><table><thead><tr><th>LEAD</th><th>SOURCE</th><th>SEGMENT</th><th>STATUS</th><th>CAMPAIGN</th><th>UPDATED</th></tr></thead><tbody id="v5LeadRows"></tbody></table></div></section>`;
    const reviewsView = document.createElement('section'); reviewsView.className='view'; reviewsView.id='v5ReviewsView'; reviewsView.dataset.view='reviews'; reviewsView.hidden=true;
    reviewsView.innerHTML = `<div class="view-heading"><div><p>CUSTOMER EXPERIENCE</p><h2>Google review management</h2><span>Track review requests after repairs and sales and keep the follow-up process visible.</span></div><button class="button button-outline" id="v5ExportReviews" type="button">Export queue</button></div><div class="request-stats"><article><small>TO REQUEST</small><strong id="v5ReviewPending">0</strong></article><article><small>REQUESTED</small><strong id="v5ReviewRequested">0</strong></article><article><small>RECEIVED</small><strong id="v5ReviewReceived">0</strong></article></div><section class="panel requests-panel"><div class="table-wrap"><table><thead><tr><th>CUSTOMER</th><th>SERVICE</th><th>STATUS</th><th>REQUESTED</th><th></th></tr></thead><tbody id="v5ReviewRows"></tbody></table></div></section>`;
    const followView = document.createElement('section'); followView.className='view'; followView.id='v5FollowupsView'; followView.dataset.view='followups'; followView.hidden=true;
    followView.innerHTML = `<div class="view-heading"><div><p>RETENTION</p><h2>Follow-up campaigns</h2><span>Bring previous repair, laptop, gaming and phone customers back without relying on Meta.</span></div><button class="button button-primary" id="v5NewFollowupCampaign" type="button">New campaign</button></div><section class="panel requests-panel"><div class="request-stats"><article><small>PLANNED</small><strong id="v5FollowPlanned">0</strong></article><article><small>DUE</small><strong id="v5FollowDue">0</strong></article><article><small>COMPLETED</small><strong id="v5FollowCompleted">0</strong></article></div><div class="table-wrap"><table><thead><tr><th>CAMPAIGN</th><th>CHANNEL</th><th>STATUS</th><th>NEXT RUN</th><th>MESSAGE</th></tr></thead><tbody id="v5FollowRows"></tbody></table></div></section>`;
    shell.append(leadsView,reviewsView,followView);
    main.insertBefore(shell, footer || null);
    document.querySelector('#v5NewLead')?.addEventListener('click', createLeadPrompt);
    document.querySelector('#v5ExportRepair')?.addEventListener('click', exportRepairLeads);
    document.querySelector('#v5ExportReviews')?.addEventListener('click', exportReviewQueue);
    document.querySelector('#v5NewFollowupCampaign')?.addEventListener('click', createFollowupCampaignPrompt);
    ['v5LeadSearch','v5LeadStatus','v5LeadSegment'].forEach(id=>document.querySelector('#'+id)?.addEventListener('input',renderLeads));
  }

  function classify(text) {
    const value = String(text || '').toLowerCase();
    if (/gaming|xbox|playstation|ps5|ps4|nintendo|gaming pc|console/.test(value)) return 'Gamers';
    if (/laptop|macbook|elitebook|probook|notebook|computer/.test(value)) return 'Laptop Buyers';
    if (/iphone|ipad|samsung|android|phone|mobile/.test(value)) return 'Phone Buyers';
    if (/repair|broken|screen|battery|charging|water|fault|fix|replacement|damage/.test(value)) return 'Repair Customers';
    return 'Refurbished Device Buyers';
  }
  const segmentName = id => data.segments.find(s=>s.id===id)?.name || '';
  const campaignName = id => state.campaigns.find(c=>String(c.id)===String(id))?.name || (id || 'Unattributed');

  async function createLeadPrompt() {
    if (!canEditContent()) return toastSafe('Editor permission is required to create a lead.',true);
    const name=prompt('Customer name'); if(!name?.trim())return;
    const enquiry=prompt('What are they enquiring about?')||'';
    const platform=prompt('Source platform (facebook, instagram, website, other)','other')||'other';
    const email=prompt('Email address','')||'', phone=prompt('Phone number','')||'';
    const result=await db.rpc('create_social_lead',{p_name:name.trim(),p_platform:platform,p_enquiry:enquiry,p_campaign_id:null,p_email:email,p_phone:phone});
    if(result.error){toastSafe(result.error.message,true);return}
    await loadMarketingData(); renderMarketing(); toastSafe('Lead created.');
  }

  async function updateLeadStatus(id,status){
    if(!canEditContent())return;
    const result=await db.from('social_leads').update({status,updated_at:new Date().toISOString()}).eq('id',id);
    if(result.error){toastSafe(result.error.message,true);return}
    const lead=data.leads.find(x=>x.id===id); if(lead)lead.status=status; renderLeads(); updateCounts();
  }

  function renderLeads(){
    const search=(document.querySelector('#v5LeadSearch')?.value||'').toLowerCase(), status=document.querySelector('#v5LeadStatus')?.value||'all', segment=document.querySelector('#v5LeadSegment')?.value||'all';
    const items=data.leads.filter(l=>{const seg=l.segment_id||data.segments.find(s=>s.name===classify(`${l.enquiry} ${l.notes}`))?.id;return (status==='all'||l.status===status)&&(segment==='all'||seg===segment)&&(!search||[l.name,l.email,l.phone,l.enquiry,l.platform].join(' ').toLowerCase().includes(search))});
    const rows=document.querySelector('#v5LeadRows'); if(!rows)return;
    rows.innerHTML=items.map(l=>{const seg=l.segment_id?segmentName(l.segment_id):classify(`${l.enquiry} ${l.notes}`);return `<tr><td><strong>${esc(l.name)}</strong><small>${esc(l.email||l.phone||'No contact')}</small></td><td>${esc(l.platform)}</td><td>${esc(seg)}</td><td><select data-v5-lead-status="${l.id}">${['new','contacted','interested','customer','lost'].map(s=>`<option value="${s}" ${l.status===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select></td><td>${esc(campaignName(l.campaign_id))}</td><td>${fmtDate(l.updated_at)}</td></tr>`}).join('') || '<tr><td colspan="6">No leads match the current filters.</td></tr>';
    rows.querySelectorAll('[data-v5-lead-status]').forEach(select=>select.addEventListener('change',()=>updateLeadStatus(select.dataset.v5LeadStatus,select.value)));
    const counts={new:0,contacted:0,interested:0,customer:0};data.leads.forEach(l=>{if(counts[l.status]!==undefined)counts[l.status]++});
    document.querySelector('#v5LeadNew').textContent=counts.new;document.querySelector('#v5LeadContacted').textContent=counts.contacted;document.querySelector('#v5LeadInterested').textContent=counts.interested;document.querySelector('#v5LeadCustomers').textContent=counts.customer;
  }

  function exportRepairLeads(){
    const repairWords=/repair|broken|screen|battery|charging|water|fault|fix|replacement|damage/i;
    const rows=data.leads.filter(l=>repairWords.test(`${l.enquiry} ${l.notes}`));
    if(!rows.length){toastSafe('No repair leads are currently available.',true);return;}
    const headers=['id','name','email','phone','platform','handle','enquiry','status','campaign_id','crm_customer_id','notes','created_at','updated_at'];
    const csvText=[headers.map(csv).join(','),...rows.map(l=>headers.map(h=>csv(l[h])).join(','))].join('\r\n');
    const blob=new Blob([csvText],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`tech-lab-repair-leads-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    const subject=encodeURIComponent(`Tech Lab repair leads — ${new Date().toLocaleDateString('en-GB')}`),body=encodeURIComponent(`Hi Chris,\n\nThe attached CSV contains ${rows.length} repair lead${rows.length===1?'':'s'} exported from Tech Social CRM for temporary import into the Tech Lab CRM.\n\nPlease attach the downloaded CSV to this email before sending.\n\nThanks,\nTech Social CRM`);
    setTimeout(()=>{window.location.href=`mailto:${REPAIR_TO}?cc=${REPAIR_CC}&subject=${subject}&body=${body}`},200);
  }

  async function sendReviewRequest(id){
    if(!canEditContent())return toastSafe('Editor permission is required to send review requests.',true);
    const review=data.reviews.find(r=>r.id===id);if(!review)return;
    const recipient=review.customer_email||'';
    const subject=encodeURIComponent('Thank you for choosing Tech Lab');
    const body=encodeURIComponent(`Hi ${review.customer_name||'there'},\n\nThank you for choosing Tech Lab. We hope you were happy with the service you received.\n\nIf you have a moment, we would really appreciate an honest Google review:\n${review.review_url||REVIEW_URL}\n\nThank you,\nTech Lab Worthing`);
    window.location.href=`mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`;
    const result=await db.from('review_requests').update({status:'requested',requested_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
    if(!result.error){review.status='requested';review.requested_at=new Date().toISOString();renderReviews()}
  }

  function renderReviews(){
    const pending=data.reviews.filter(r=>!r.status||r.status==='pending').length,requested=data.reviews.filter(r=>r.status==='requested').length,received=data.reviews.filter(r=>r.status==='received').length;
    document.querySelector('#v5ReviewPending').textContent=pending;document.querySelector('#v5ReviewRequested').textContent=requested;document.querySelector('#v5ReviewReceived').textContent=received;
    const rows=document.querySelector('#v5ReviewRows');if(!rows)return;
    rows.innerHTML=data.reviews.map(r=>`<tr><td><strong>${esc(r.customer_name)}</strong><small>${esc(r.customer_email||r.customer_phone||'No contact')}</small></td><td>${esc(r.repair_description||'Service')}</td><td>${esc(r.status||'pending')}</td><td>${fmtDate(r.requested_at)}</td><td>${r.status==='received'?'<span class="status-pill published">Received</span>':`<button class="button button-outline" data-v5-send-review="${r.id}">${r.status==='requested'?'Send again':'Send request'}</button>`}</td></tr>`).join('')||'<tr><td colspan="5">No review requests yet.</td></tr>';
    rows.querySelectorAll('[data-v5-send-review]').forEach(b=>b.addEventListener('click',()=>sendReviewRequest(b.dataset.v5SendReview)));
  }
  function exportReviewQueue(){
    const headers=['id','customer_name','customer_email','customer_phone','repair_id','repair_description','status','review_url','requested_at','received_at','notes'];
    const text=[headers.map(csv).join(','),...data.reviews.map(r=>headers.map(h=>csv(r[h])).join(','))].join('\r\n');
    const blob=new Blob([text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`tech-lab-review-queue-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  }

  async function createFollowupCampaignPrompt(){
    if(!canEditContent())return toastSafe('Editor permission is required to create follow-up campaigns.',true);
    const name=prompt('Campaign name','Previous repair customer follow-up');if(!name?.trim())return;
    const message=prompt('Message template','Hi {{name}}, it has been a while since you visited Tech Lab. If you need anything, we are here to help!')||'';
    const channel=prompt('Channel','email')||'email';
    const result=await db.from('followup_campaigns').insert({name:name.trim(),message_template:message,channel,active:true,created_by:currentUser.id}).select().single();
    if(result.error){toastSafe(result.error.message,true);return}
    data.followupCampaigns.unshift(result.data);renderFollowups();toastSafe('Follow-up campaign created.');
  }
  function renderFollowups(){
    const now=Date.now(),planned=data.followups.filter(f=>f.status==='planned').length,due=data.followups.filter(f=>f.status==='planned'&&new Date(f.scheduled_at).getTime()<=now).length,completed=data.followups.filter(f=>['sent','completed'].includes(f.status)).length;
    document.querySelector('#v5FollowPlanned').textContent=planned;document.querySelector('#v5FollowDue').textContent=due;document.querySelector('#v5FollowCompleted').textContent=completed;
    const rows=document.querySelector('#v5FollowRows');if(!rows)return;
    rows.innerHTML=data.followupCampaigns.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.channel)}</td><td>${c.active?'Active':'Paused'}</td><td>${fmtDate(c.next_run_at)}</td><td>${esc(c.message_template||'—')}</td></tr>`).join('')||'<tr><td colspan="5">No follow-up campaigns yet.</td></tr>';
  }

  function addCampaignAttribution(){
    const campaignsView=document.querySelector('#campaignsView');if(!campaignsView||document.querySelector('#v5CampaignAttribution'))return;
    const panel=document.createElement('section');panel.className='panel';panel.id='v5CampaignAttribution';panel.style.marginTop='16px';panel.innerHTML='<div class="panel-heading"><div><p>MARKETING PERFORMANCE</p><h3>Campaign attribution</h3></div><span>Posts → enquiries → customers → revenue</span></div><div class="table-wrap"><table><thead><tr><th>CAMPAIGN</th><th>POSTS</th><th>ENQUIRIES</th><th>CUSTOMERS</th><th>REVENUE</th><th>CONVERSION</th></tr></thead><tbody id="v5CampaignRows"></tbody></table></div>';
    campaignsView.appendChild(panel);
  }
  function renderCampaignAttribution(){
    const rows=document.querySelector('#v5CampaignRows');if(!rows)return;
    const map={};state.campaigns.forEach(c=>map[c.id]={name:c.name,posts:0,enquiries:0,customers:0,revenue:0});
    state.posts.forEach(p=>{if(map[p.campaignId])map[p.campaignId].posts++});
    data.leads.forEach(l=>{const key=l.campaign_id;if(!map[key])map[key]={name:'Unattributed',posts:0,enquiries:0,customers:0,revenue:0};map[key].enquiries++;if(l.status==='customer')map[key].customers++});
    rows.innerHTML=Object.values(map).sort((a,b)=>b.enquiries-a.enquiries).map(r=>`<tr><td><strong>${esc(r.name)}</strong></td><td>${r.posts}</td><td>${r.enquiries}</td><td>${r.customers}</td><td>${money(r.revenue)}</td><td>${r.enquiries?((r.customers/r.enquiries)*100).toFixed(1):'0.0'}%</td></tr>`).join('')||'<tr><td colspan="6">No campaign attribution data yet.</td></tr>';
  }

  function addMonthlyReport(){
    const analytics=document.querySelector('#analyticsView');if(!analytics||document.querySelector('#v5MonthlyReport'))return;
    const panel=document.createElement('section');panel.className='panel';panel.id='v5MonthlyReport';panel.style.marginTop='16px';panel.innerHTML='<div class="panel-heading"><div><p>MARKETING REPORTING</p><h3>Monthly marketing report</h3></div><button class="button button-outline" id="v5RefreshReport" type="button">Refresh</button></div><div class="analytics-stats" id="v5MonthlyStats"></div>';
    analytics.appendChild(panel);panel.querySelector('#v5RefreshReport').addEventListener('click',refreshMonthlyReport);
  }
  async function refreshMonthlyReport(){
    const host=document.querySelector('#v5MonthlyStats');if(!host)return;
    const now=new Date(),year=now.getFullYear(),month=now.getMonth();
    const leads=data.leads.filter(l=>{const d=new Date(l.created_at);return d.getFullYear()===year&&d.getMonth()===month});
    const posts=state.posts.filter(p=>{const d=new Date(p.publishedAt||p.scheduledAt||p.createdAt);return d.getFullYear()===year&&d.getMonth()===month&&p.status==='published'});
    const customers=leads.filter(l=>l.status==='customer').length;
    const revenue=data.reports.find(r=>String(r.month).slice(0,7)===`${year}-${String(month+1).padStart(2,'0')}`)?.attributed_revenue||0;
    host.innerHTML=[['POSTS',posts.length],['ENQUIRIES',leads.length],['CUSTOMERS',customers],['ATTRIBUTED REVENUE',money(revenue)],['CONVERSION',`${leads.length?((customers/leads.length)*100).toFixed(1):'0.0'}%`]].map(([label,value])=>`<article><small>${label}</small><strong>${esc(value)}</strong></article>`).join('');
  }

  function updateCounts(){document.querySelector('#v5LeadCount')?.replaceChildren(document.createTextNode(String(data.leads.filter(l=>l.status!=='customer'&&l.status!=='lost').length)));document.querySelector('#v5ReviewCount')?.replaceChildren(document.createTextNode(String(data.reviews.filter(r=>!r.status||r.status==='pending').length)));document.querySelector('#v5FollowupCount')?.replaceChildren(document.createTextNode(String(data.followups.filter(f=>f.status==='planned').length)))}
  function renderMarketing(){renderLeads();renderReviews();renderFollowups();renderCampaignAttribution();refreshMonthlyReport();updateCounts()}

  async function refreshVersionPanel(){
    try{
      const response=await fetch(`version-info.json?refresh=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error('Version manifest unavailable');
      const info=await response.json(), current=info.current||info, version=current.version, history=info.history||[];
      document.querySelectorAll('.version-nav-badge').forEach(x=>x.textContent=`v${version}`);
      document.querySelectorAll('.settings-version-chip').forEach(x=>x.textContent=`Version ${version}`);
      document.querySelectorAll('#versionStatus').forEach(x=>x.textContent=`You are running Version ${version}. Version information was refreshed from the central manifest.`);
      const hero=document.querySelector('.version-hero h3');if(hero)hero.innerHTML=`Tech Social <em>${esc(version)}</em>`;
      const footer=document.querySelector('.main-shell footer span:last-child');if(footer)footer.innerHTML=`<i></i> Version ${esc(version)} · Supabase secured`;
      const historyHost=document.querySelector('#versionHistory');if(historyHost)historyHost.innerHTML=history.map((release,index)=>`<article class="version-card ${index===0?'current':''}"><header><h4>Version ${esc(release.version)}${index===0?' · Current':''}</h4><time>${esc(release.date)}</time></header><p>${esc(release.summary)}</p><ul>${(release.changes||[]).map(change=>`<li>${esc(change)}</li>`).join('')}</ul></article>`).join('');
    }catch(error){console.warn('V5 version refresh failed',error)}
  }
  function patchVersionRefresh(){
    const button=document.querySelector('#checkVersionButton');if(!button||button.dataset.v5Bound)return;button.dataset.v5Bound='1';button.addEventListener('click',event=>{event.stopImmediatePropagation();refreshVersionPanel()},true);
    const settings=document.querySelector('#settingsView');if(settings&&!settings.dataset.v5VersionObserver){settings.dataset.v5VersionObserver='1';new MutationObserver(()=>{if(!settings.hidden)refreshVersionPanel()}).observe(settings,{attributes:true,subtree:true,attributeFilter:['hidden','class']});}
  }

  const originalShowView=window.showView;
  if(typeof originalShowView==='function'){
    window.showView=(view,scroll=true)=>{originalShowView(view,scroll);if(view==='leads')renderLeads();if(view==='reviews')renderReviews();if(view==='followups')renderFollowups();if(view==='campaigns')renderCampaignAttribution();if(view==='analytics')refreshMonthlyReport();if(view==='settings')refreshVersionPanel()};
  }

  async function init(){
    addMarketingNavigation();addViews();addCampaignAttribution();addMonthlyReport();patchVersionRefresh();
    for(let i=0;i<40;i++){if(typeof currentUser!=='undefined'&&currentUser&&typeof db!=='undefined'&&db)break;await new Promise(r=>setTimeout(r,250));}
    if(!currentUser||!db)return;
    await loadMarketingData();renderMarketing();refreshVersionPanel();
    setInterval(async()=>{if(currentUser){if(await loadMarketingData())renderMarketing();refreshVersionPanel()}},30000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
