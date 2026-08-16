(() => {
  'use strict';
  if (window.__TECH_SOCIAL_V5_CALENDAR__) return;
  window.__TECH_SOCIAL_V5_CALENDAR__ = true;

  const CONFIG = window.TECH_SOCIAL_CONFIG;
  if (!CONFIG || !window.supabase?.createClient) return;
  const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let posts = [];
  let mode = 'month';
  let cursor = new Date();
  let platform = 'all';
  let status = 'all';
  let lastSignature = '';
  let loading = false;

  const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const localDate = date => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const title = post => String(post.caption || 'Untitled post').split(/\n/)[0].trim().slice(0,70) || 'Untitled post';
  const platforms = post => Array.isArray(post.platforms) ? post.platforms : (typeof post.platforms === 'string' ? post.platforms.replace(/[{}\[\]"]/g,'').split(',').map(x=>x.trim()).filter(Boolean) : []);
  const label = id => ({instagram:'Instagram',facebook:'Facebook',tiktok:'TikTok',x:'X',linkedin:'LinkedIn',youtube:'YouTube',whatsapp:'WhatsApp'}[id] || id);
  const statusLabel = id => ({draft:'Draft',approval:'Awaiting approval',scheduled:'Scheduled',ready:'Ready to publish',published:'Published'}[id] || id);
  const canEdit = () => !!document.querySelector('[data-new-post]:not(.permission-hidden)');

  function injectStyles(){
    if(document.getElementById('v5CalendarStyles')) return;
    const style=document.createElement('style'); style.id='v5CalendarStyles';
    style.textContent=`
      #calendarView .calendar-shell{overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 10px 30px rgba(15,23,42,.04)}
      #calendarView .calendar-toolbar{display:flex!important;align-items:center!important;gap:12px!important;flex-wrap:wrap!important;padding:24px 26px!important;background:#fff!important;border-bottom:1px solid var(--line)!important;min-height:96px!important;box-sizing:border-box!important}
      #calendarView .calendar-toolbar .calendar-arrow{width:42px!important;height:42px!important;min-width:42px!important;border:1px solid #d9dee7!important;border-radius:8px!important;background:#fff!important;color:#142038!important;font-size:18px!important;font-weight:700!important;cursor:pointer!important}
      #calendarView .calendar-toolbar #calendarMonthTitle{margin:0 6px!important;min-width:140px!important;font-size:18px!important;font-weight:800!important;color:#142038!important;white-space:nowrap!important}
      #calendarView .calendar-toolbar .today-button{height:42px!important;padding:0 16px!important;border:1px solid #d9dee7!important;border-radius:8px!important;background:#fff!important;color:#142038!important;font-size:13px!important;font-weight:700!important;cursor:pointer!important}
      #calendarView .calendar-view-toggle{display:flex!important;align-items:center!important;gap:0!important;margin-left:2px!important}
      #calendarView .calendar-view-toggle button{height:42px!important;padding:0 18px!important;border:1px solid #d9dee7!important;background:#fff!important;color:#142038!important;font-size:13px!important;font-weight:700!important;cursor:pointer!important}
      #calendarView .calendar-view-toggle button:first-child{border-radius:8px 0 0 8px!important}
      #calendarView .calendar-view-toggle button:last-child{border-radius:0 8px 8px 0!important;margin-left:-1px!important}
      #calendarView .calendar-view-toggle button.active{background:var(--red,#ed0b18)!important;color:#fff!important;border-color:var(--red,#ed0b18)!important;position:relative!important;z-index:1!important}
      #calendarView .calendar-legend{display:none!important}
      #calendarView .v5-calendar-summary{display:flex;align-items:center;gap:22px;margin-left:auto;font-size:12px;font-weight:800;white-space:nowrap;color:#142038}
      #calendarView .v5-calendar-summary span{display:inline-flex;align-items:center;gap:5px}
      #calendarView .v5-calendar-summary b{font-size:15px}
      #calendarView .v5-calendar-summary .draft b{color:#ef111c}.v5-calendar-summary .scheduled b{color:#e59600}.v5-calendar-summary .ready b{color:#18a56e}.v5-calendar-summary .published b{color:#8b55d9}
      #calendarView .v5-calendar-controls{display:grid!important;grid-template-columns:160px 160px;gap:10px!important;margin-left:14px!important;min-width:330px!important}
      #calendarView .v5-calendar-controls .v5-filter-note{grid-column:1 / -1!important;font-size:10px!important;color:#7a8799!important;text-align:right!important;margin:0!important}
      #calendarView .v5-calendar-controls select{height:42px!important;width:100%!important;border:1px solid #d9dee7!important;border-radius:9px!important;background:#fff!important;padding:0 12px!important;font:600 12px inherit!important;color:#142038!important;outline:none!important}
      #calendarView .v5-calendar-controls select:focus{border-color:var(--red,#ed0b18)!important;box-shadow:0 0 0 3px rgba(237,11,24,.08)!important}
      #calendarView .calendar-weekdays{background:#fafbfd!important;border-bottom:1px solid var(--line)!important}
      #calendarView .calendar-weekdays span{padding:14px 10px!important;font-size:10px!important;font-weight:800!important;color:#748197!important;letter-spacing:.08em!important;text-align:center!important}
      #calendarView .calendar-grid{background:#fff!important}
      #calendarView .calendar-day{min-height:105px!important;padding:10px!important;background:#fff!important;border-right:1px solid #e7ebf1!important;border-bottom:1px solid #e7ebf1!important}
      #calendarView .calendar-day.today{background:#fff8f8!important}
      #calendarView .calendar-day .day-number{font-size:12px!important;font-weight:800!important;color:#142038!important}
      #calendarView .calendar-day.other-month .day-number{color:#c5ccd7!important}
      .v5-calendar-post{display:grid;gap:3px;padding:6px 7px;border-radius:6px;background:#fff;border:1px solid var(--line);border-left:3px solid var(--red);cursor:pointer;font-size:8px;line-height:1.25;text-align:left}
      .v5-calendar-post:hover{box-shadow:0 3px 10px rgba(0,0,0,.08)}
      .v5-calendar-post.scheduled{border-left-color:#356fd5}.v5-calendar-post.ready{border-left-color:#18a56e}.v5-calendar-post.published{border-left-color:#8a55d9}.v5-calendar-post.approval{border-left-color:#d99a12}
      .v5-calendar-post small{font-size:7px;color:var(--muted);font-weight:600}
      .v5-calendar-day-view{display:grid;gap:12px;padding:18px;background:#fff;min-height:360px}
      .v5-day-empty{padding:60px 20px;text-align:center;color:var(--muted);font-size:11px}
      .v5-day-post{display:grid;grid-template-columns:70px 1fr auto;gap:14px;align-items:center;border:1px solid var(--line);border-radius:9px;padding:12px;background:#fff}
      .v5-day-post-time{font-size:11px;font-weight:800;color:var(--black)}
      .v5-day-post-title{font-size:10px;font-weight:750;color:var(--black)}
      .v5-day-post-meta{margin-top:4px;font-size:8px;color:var(--muted)}
      .v5-day-post .v5-status{font-size:7px;font-weight:800;text-transform:uppercase;padding:4px 6px;border-radius:99px;background:var(--soft);color:var(--black)}
      @media(max-width:1200px){#calendarView .v5-calendar-summary{order:5;width:100%;margin-left:0}#calendarView .v5-calendar-controls{margin-left:auto}}
      @media(max-width:800px){#calendarView .calendar-toolbar{padding:16px!important}#calendarView .v5-calendar-controls{width:100%;min-width:0;grid-template-columns:1fr 1fr;margin:0!important}.v5-day-post{grid-template-columns:1fr}.v5-day-post .v5-status{justify-self:start}}
    `;
    document.head.appendChild(style);
  }

  function controls(){
    const toolbar=document.querySelector('.calendar-toolbar'); if(!toolbar || toolbar.dataset.v5Ready) return;
    toolbar.dataset.v5Ready='1';
    toolbar.innerHTML=`
      <button class="calendar-arrow" id="previousMonthButton" type="button" aria-label="Previous">←</button>
      <h3 id="calendarMonthTitle">August 2026</h3>
      <button class="calendar-arrow" id="nextMonthButton" type="button" aria-label="Next">→</button>
      <button class="today-button" id="todayButton" type="button">Today</button>
      <div class="calendar-view-toggle" aria-label="Calendar view">
        <button type="button" data-v5-mode="month" class="active">Month</button>
        <button type="button" data-v5-mode="week">Week</button>
        <button type="button" data-v5-mode="day">Day</button>
      </div>
      <div class="v5-calendar-summary" aria-label="Post status summary">
        <span class="draft">Draft <b id="v5DraftCount">0</b></span>
        <span class="scheduled">Scheduled <b id="v5ScheduledCount">0</b></span>
        <span class="ready">Ready <b id="v5ReadyCount">0</b></span>
        <span class="published">Published <b id="v5PublishedCount">0</b></span>
      </div>
      <div class="v5-calendar-controls">
        <span class="v5-filter-note">Version 5.0 planner</span>
        <select id="v5CampaignFilter"><option value="all">All campaigns</option></select>
        <select id="v5PlatformFilter"><option value="all">All platforms</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="x">X</option><option value="linkedin">LinkedIn</option><option value="youtube">YouTube</option><option value="whatsapp">WhatsApp</option></select>
        <select id="v5StatusFilter"><option value="all">All statuses</option><option value="draft">Draft</option><option value="approval">Awaiting approval</option><option value="scheduled">Scheduled</option><option value="ready">Ready to publish</option><option value="published">Published</option></select>
      </div>`;
    const campaignSelect=toolbar.querySelector('#v5CampaignFilter');
    const campaigns=[...new Map(posts.filter(p=>p.campaign_id).map(p=>[p.campaign_id,p.campaign_id])).entries()];
    campaigns.forEach(([id,name])=>{const option=document.createElement('option');option.value=id;option.textContent=name;campaignSelect.appendChild(option)});
    toolbar.querySelector('#v5PlatformFilter').addEventListener('change',e=>{platform=e.target.value;render(true)});
    toolbar.querySelector('#v5StatusFilter').addEventListener('change',e=>{status=e.target.value;render(true)});
    toolbar.querySelectorAll('[data-v5-mode]').forEach(btn=>btn.addEventListener('click',()=>{mode=btn.dataset.v5Mode;toolbar.querySelectorAll('[data-v5-mode]').forEach(b=>b.classList.toggle('active',b===btn));render(true)}));
  }

  function filtered(){ return posts.filter(p=>(platform==='all'||platforms(p).includes(platform))&&(status==='all'||p.status===status)); }
  function range(){
    const base=new Date(cursor); base.setHours(0,0,0,0);
    if(mode==='day') return [new Date(base),new Date(base)];
    if(mode==='week'){const start=new Date(base); start.setDate(start.getDate()-((start.getDay()+6)%7)); const end=new Date(start); end.setDate(end.getDate()+6); return [start,end];}
    return [new Date(base.getFullYear(),base.getMonth(),1),new Date(base.getFullYear(),base.getMonth()+1,0)];
  }
  function headerTitle(){
    const [start,end]=range();
    if(mode==='day') return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(start);
    if(mode==='week') return `${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(start)} – ${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(end)}`;
    return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(cursor);
  }
  function postCard(p){const ps=platforms(p).map(label).join(', ')||'No platform';const time=p.scheduled_at?new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(p.scheduled_at)):'Unscheduled';return `<div class="v5-calendar-post ${esc(p.status)}" data-v5-post="${esc(p.id)}" draggable="${canEdit()}"><strong>${esc(title(p))}</strong><small>${esc(time)} · ${esc(ps)} · ${esc(statusLabel(p.status))}</small></div>`}
  function renderMonthWeek(){
    const base=new Date(cursor), month=base.getMonth(), year=base.getFullYear();
    const first=mode==='week'?new Date(base):new Date(year,month,1); const offset=(first.getDay()+6)%7; const start=new Date(first); start.setDate(first.getDate()-offset); const days=mode==='week'?7:42;
    let html=''; const list=filtered();
    for(let i=0;i<days;i++){const day=new Date(start);day.setDate(start.getDate()+i);const key=localDate(day);const dayPosts=list.filter(p=>p.scheduled_at&&localDate(p.scheduled_at)===key);const other=mode==='month'&&day.getMonth()!==month;const today=key===localDate(new Date());html+=`<div class="calendar-day ${other?'other-month':''} ${today?'today':''}" data-v5-day="${key}"><span class="day-number">${day.getDate()}</span><div class="day-posts">${dayPosts.slice(0,mode==='week'?10:4).map(postCard).join('')}${dayPosts.length>(mode==='week'?10:4)?`<span class="more-posts">+${dayPosts.length-(mode==='week'?10:4)} more</span>`:''}</div></div>`}
    return html;
  }
  function renderDay(){const key=localDate(cursor),list=filtered().filter(p=>p.scheduled_at&&localDate(p.scheduled_at)===key).sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at));return `<div class="v5-calendar-day-view">${list.length?list.map(p=>{const time=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(p.scheduled_at));return `<div class="v5-day-post" data-v5-post="${esc(p.id)}"><div class="v5-day-post-time">${time}</div><div><div class="v5-day-post-title">${esc(title(p))}</div><div class="v5-day-post-meta">${esc(platforms(p).map(label).join(', ')||'No platform')} · ${esc(statusLabel(p.status))}</div></div><span class="v5-status">${esc(statusLabel(p.status))}</span></div>`}).join(''):'<div class="v5-day-empty">No content scheduled for this day.</div>'}</div>`}

  function updateSummary(){
    const count=id=>posts.filter(p=>p.status===id).length;
    const values={v5DraftCount:count('draft'),v5ScheduledCount:count('scheduled'),v5ReadyCount:count('ready'),v5PublishedCount:count('published')};
    Object.entries(values).forEach(([id,value])=>{const node=document.getElementById(id);if(node)node.textContent=value});
  }

  function render(force=false){
    const view=document.querySelector('#calendarView'); if(!view || view.hidden) return;
    controls();
    updateSummary();
    const grid=document.querySelector('#calendarGrid'); if(!grid) return;
    const sig=JSON.stringify([mode,cursor.getFullYear(),cursor.getMonth(),cursor.getDate(),platform,status,posts.map(p=>`${p.id}:${p.scheduled_at}:${p.status}`).join('|')]);
    if(!force&&sig===lastSignature) return; lastSignature=sig;
    const titleNode=document.querySelector('#calendarMonthTitle'); if(titleNode) titleNode.textContent=headerTitle();
    const weekdays=document.querySelector('.calendar-weekdays');
    if(weekdays) weekdays.style.display=mode==='day'?'none':'';
    grid.innerHTML=mode==='day'?renderDay():renderMonthWeek();
    if(mode==='day') grid.classList.add('v5-day-grid'); else grid.classList.remove('v5-day-grid');
    grid.querySelectorAll('[data-v5-post]').forEach(node=>node.addEventListener('click',e=>{e.stopPropagation();const original=document.querySelector(`[data-edit-post="${CSS.escape(node.dataset.v5Post)}"]`);if(original) original.click();}));
    grid.querySelectorAll('[data-v5-day]').forEach(day=>day.addEventListener('click',e=>{if(e.target.closest('[data-v5-post]'))return; if(canEdit()){const date=day.dataset.v5Day;const original=document.querySelector('[data-new-post]');if(original){original.click();setTimeout(()=>{const input=document.querySelector('#postDate');if(input)input.value=date;},100)}}}));
    if(mode!=='day') attachDrag(grid);
  }
  function attachDrag(grid){grid.querySelectorAll('[data-v5-post]').forEach(node=>node.addEventListener('dragstart',e=>e.dataTransfer.setData('text/post-id',node.dataset.v5Post)));grid.querySelectorAll('[data-v5-day]').forEach(day=>{day.addEventListener('dragover',e=>{if(canEdit()){e.preventDefault();day.classList.add('drag-over')}});day.addEventListener('dragleave',()=>day.classList.remove('drag-over'));day.addEventListener('drop',async e=>{e.preventDefault();day.classList.remove('drag-over');const id=e.dataTransfer.getData('text/post-id');const post=posts.find(p=>p.id===id);if(!post)return;const old=post.scheduled_at?new Date(post.scheduled_at):new Date();const time=old.toTimeString().slice(0,5);const scheduledAt=new Date(`${day.dataset.v5Day}T${time}:00`).toISOString();const {error}=await client.from('posts').update({scheduled_at:scheduledAt,updated_at:new Date().toISOString()}).eq('id',id);if(error){if(typeof window.toast==='function')window.toast(error.message,true);return}post.scheduled_at=scheduledAt;render(true);if(typeof window.toast==='function')window.toast('Post rescheduled.');})})}
  async function load(){if(loading)return;loading=true;try{const {data,error}=await client.from('posts').select('id,caption,scheduled_at,status,platforms,campaign_id').order('scheduled_at',{ascending:true});if(error)throw error;posts=data||[];render(true)}catch(error){console.warn('V5 calendar could not load posts:',error)}finally{loading=false}}

  function navigation(){
    const prev=document.querySelector('#previousMonthButton'),next=document.querySelector('#nextMonthButton'),today=document.querySelector('#todayButton');
    if(prev&&!prev.dataset.v5Bound){prev.dataset.v5Bound='1';prev.addEventListener('click',()=>{if(mode==='day')cursor.setDate(cursor.getDate()-1);else if(mode==='week')cursor.setDate(cursor.getDate()-7);else cursor.setMonth(cursor.getMonth()-1);render(true)})}
    if(next&&!next.dataset.v5Bound){next.dataset.v5Bound='1';next.addEventListener('click',()=>{if(mode==='day')cursor.setDate(cursor.getDate()+1);else if(mode==='week')cursor.setDate(cursor.getDate()+7);else cursor.setMonth(cursor.getMonth()+1);render(true)})}
    if(today&&!today.dataset.v5Bound){today.dataset.v5Bound='1';today.addEventListener('click',()=>{cursor=new Date();render(true)})}
  }
  function boot(){injectStyles();navigation();load();setInterval(()=>{navigation();render();},700);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
