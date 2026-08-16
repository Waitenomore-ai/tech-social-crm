(() => {
  'use strict';
  if (window.__TECH_SOCIAL_V11_DASHBOARD_LAYOUTS__) return;
  window.__TECH_SOCIAL_V11_DASHBOARD_LAYOUTS__ = true;

  const STORAGE_KEY = 'tech-social-dashboard-layout-v1';
  const DEFAULT_LAYOUT = 'platform';
  const layouts = [
    {id:'platform',label:'Platform Hub',description:'Networks first with quick access to what matters.'},
    {id:'overview',label:'Overview First',description:'Clean overview with key content numbers at the top.'},
    {id:'performance',label:'Focus on Performance',description:'Performance signals and top content take centre stage.'},
    {id:'activity',label:'Activity First',description:'Recent activity and publishing work come first.'},
    {id:'executive',label:'Executive Summary',description:'High-level summary with insights and quick actions.'}
  ];
  const $=(s,root=document)=>root.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const getLayout=()=>layouts.some(x=>x.id===localStorage.getItem(STORAGE_KEY))?localStorage.getItem(STORAGE_KEY):DEFAULT_LAYOUT;
  function clone(selector){const source=$(selector);return source?source.cloneNode(true):document.createElement('div');}
  function platformMarkup(){const source=$('#miniAccounts');if(source&&source.innerHTML.trim())return source.innerHTML;return ['Facebook','Instagram','TikTok','X','LinkedIn','YouTube'].map(name=>`<div class="v11-platform-fallback"><strong>${esc(name)}</strong><span>Account status available in Social Accounts</span></div>`).join('');}
  function recentMarkup(){const source=$('#recentPostsBody');if(source&&source.innerHTML.trim())return source.innerHTML;return '<tr><td colspan="6"><div class="v11-empty">No recent posts yet.</div></td></tr>';}
  function createRoot(){
    const dashboard=$('#dashboardView');if(!dashboard||$('#v11DashboardRoot'))return $('#v11DashboardRoot');
    const root=document.createElement('div');root.id='v11DashboardRoot';
    root.innerHTML=`<div class="v11-dashboard-toolbar"><div><span class="v11-eyebrow">DASHBOARD VIEW</span><strong id="v11LayoutDescription"></strong></div><label>Dashboard layout <select id="v11LayoutSelect" aria-label="Dashboard layout">${layouts.map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select></label></div><div class="v11-intro"><span id="v11Today"></span><h2 id="v11Greeting"></h2><p>Here’s what is happening across your social content.</p></div><div class="v11-layout" data-layout="platform"><div class="v11-zone v11-platform-zone"><section class="v11-card v11-platform-card"><div class="v11-card-head"><div><p>PLATFORM HUB</p><h3>Social network status</h3></div><button type="button" data-layout-view="accounts">Manage accounts</button></div><div class="v11-platforms" id="v11Platforms"></div></section></div><div class="v11-zone v11-stats-zone"><section class="v11-card v11-stats-card"><div class="v11-card-head"><div><p>CONTENT OVERVIEW</p><h3>What needs attention</h3></div></div><div id="v11Stats"></div></section></div><div class="v11-zone v11-recent-zone"><section class="v11-card v11-recent-card"><div class="v11-card-head"><div><p>RECENT ACTIVITY</p><h3>Latest posts</h3></div><button type="button" data-layout-view="posts">View all posts</button></div><div class="v11-table-wrap"><table><thead><tr><th>POST</th><th>CHANNELS</th><th>CAMPAIGN</th><th>DATE</th><th>STATUS</th></tr></thead><tbody id="v11Recent"></tbody></table></div></section></div><div class="v11-zone v11-top-zone"><section class="v11-card v11-top-card"><div class="v11-card-head"><div><p>TOP CONTENT</p><h3>Publishing signals</h3></div><button type="button" data-layout-view="analytics">View analytics</button></div><div class="v11-signal-grid"><div><strong id="v11PublishedSignal">0</strong><span>Published</span></div><div><strong id="v11ScheduledSignal">0</strong><span>Scheduled</span></div><div><strong id="v11DueSignal">0</strong><span>Due soon</span></div></div></section></div><div class="v11-zone v11-actions-zone"><section class="v11-card v11-actions-card"><div class="v11-card-head"><div><p>QUICK ACTIONS</p><h3>Get things done</h3></div></div><div class="v11-actions"><button type="button" data-layout-view="new-post">Create post</button><button type="button" data-layout-view="calendar">Add to calendar</button><button type="button" data-layout-view="media">Media library</button><button type="button" data-layout-view="campaigns">Campaigns</button></div></section></div></div>`;
    dashboard.appendChild(root);return root;
  }
  function updateData(root){
    const stats=clone('.stats-grid'),statTarget=$('#v11Stats',root);if(statTarget){stats.className='v11-cloned-stats';statTarget.replaceChildren(stats);}
    const recent=$('#v11Recent',root);if(recent)recent.innerHTML=recentMarkup();
    const platforms=$('#v11Platforms',root);if(platforms)platforms.innerHTML=platformMarkup();
    const text=id=>$(id)?.textContent?.trim()||'0';
    $('#v11PublishedSignal',root).textContent=text('#publishedPostsStat');$('#v11ScheduledSignal',root).textContent=text('#scheduledPostsStat');$('#v11DueSignal',root).textContent=text('#duePostsStat');
    $('#v11Today',root).textContent=$('#todayLabel')?.textContent?.trim()||'';$('#v11Greeting',root).textContent=$('#greetingLabel')?.textContent?.trim()||'Good afternoon, Chris.';
  }
  function route(action){if(action==='new-post'){document.querySelector('[data-new-post]')?.click();return}document.querySelector(`[data-view-link="${action}"]`)?.click();}
  function applyLayout(root,id){const safe=layouts.some(x=>x.id===id)?id:DEFAULT_LAYOUT;localStorage.setItem(STORAGE_KEY,safe);const layout=$('.v11-layout',root);if(layout)layout.dataset.layout=safe;const select=$('#v11LayoutSelect',root);if(select)select.value=safe;const desc=$('#v11LayoutDescription',root);if(desc)desc.textContent=layouts.find(x=>x.id===safe)?.description||'';}
  function wire(root){const select=$('#v11LayoutSelect',root);if(select&&!select.dataset.bound){select.dataset.bound='1';select.addEventListener('change',()=>applyLayout(root,select.value));}if(!root.dataset.bound){root.dataset.bound='1';root.addEventListener('click',e=>{const button=e.target.closest('[data-layout-view]');if(button){e.preventDefault();route(button.dataset.layoutView);}});}applyLayout(root,getLayout());}
  function boot(){const root=createRoot();if(!root)return;wire(root);updateData(root);const sources=['.stats-grid','#recentPostsBody','#miniAccounts','#publishedPostsStat','#scheduledPostsStat','#duePostsStat','#todayLabel','#greetingLabel'].map(s=>$(s)).filter(Boolean);sources.forEach(source=>{if(source.dataset.v11Observed)return;source.dataset.v11Observed='1';new MutationObserver(()=>updateData(root)).observe(source,{childList:true,subtree:true,characterData:true});});window.techSocialV11Dashboard={refresh:()=>updateData(root),setLayout:id=>applyLayout(root,id)};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
