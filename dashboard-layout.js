(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);

  function addExtraStats(){
    const grid=$('.stats-grid'); if(!grid || grid.dataset.modernised==='1') return;
    grid.dataset.modernised='1';
    const extra=document.createElement('article');
    extra.innerHTML='<span class="stat-icon blue"></span><div><small>MEDIA LIBRARY</small><strong id="modernMediaStat">0</strong><p>Files ready to reuse</p></div><button data-view-link="media">→</button>';
    const extra2=document.createElement('article');
    extra2.innerHTML='<span class="stat-icon purple"></span><div><small>SOCIAL ACCOUNTS</small><strong id="modernAccountsStat">0</strong><p>Connected channels</p></div><button data-view-link="accounts">→</button>';
    grid.append(extra,extra2);
  }

  function buildModernPanels(){
    const view=$('#dashboardView'); if(!view || view.dataset.modernPanels==='1') return;
    view.dataset.modernPanels='1';
    const grid=$('.dashboard-grid',view);
    const recent=$('.recent-panel',view);
    if(grid) grid.classList.add('modern-dashboard-hidden');
    if(recent) recent.classList.add('modern-dashboard-hidden');

    const work=document.createElement('section');
    work.className='panel modern-work-panel';
    work.innerHTML='<div class="modern-panel-heading"><h3>My Work Today</h3><span>Items needing attention</span></div><div class="modern-work-grid"><button class="modern-work-card" type="button" data-view-link="queue"><small>Due for processing</small><strong id="modernDue">0</strong><span>Posts ready for action</span></button><button class="modern-work-card" type="button" data-view-link="queue"><small>Ready &gt; chase time</small><strong id="modernChase">0</strong><span>Customers / approvals to chase</span></button><button class="modern-work-card" type="button" data-view-link="posts"><small>Assigned to me</small><strong id="modernAssigned">0</strong><span>My active content</span></button><button class="modern-work-card" type="button" data-view-link="inbox"><small>Customer replies</small><strong id="modernReplies">0</strong><span>Unread social replies</span></button></div>';

    const actions=document.createElement('section');
    actions.className='panel modern-actions-panel';
    actions.innerHTML='<div class="modern-panel-heading"><h3>Actions &amp; Follow-ups</h3><button class="button button-primary" type="button" data-new-post>+ Action</button></div><div class="modern-actions-grid"><button type="button" data-view-link="inbox"><span>♡</span>Follow up customers</button><button type="button" data-view-link="media"><span>✓</span>Check media library</button><button type="button" data-view-link="queue"><span>→</span>Review due posts</button><button type="button" data-view-link="requests"><span>▢</span>Respond to requests</button></div>';

    const anchor=recent || grid;
    if(anchor) anchor.after(work,actions); else view.append(work,actions);

    const refresh=()=>{
      const total=$('#totalPostsStat')?.textContent?.trim()||'0';
      const due=$('#duePostsStat')?.textContent?.trim()||'0';
      const scheduled=$('#scheduledPostsStat')?.textContent?.trim()||'0';
      const published=$('#publishedPostsStat')?.textContent?.trim()||'0';
      const media=$('#mediaNavCount')?.textContent?.trim()||'0';
      const accounts=$('#accountsNavCount')?.textContent?.trim()||'0';
      const set=(id,v)=>{const n=$('#'+id);if(n)n.textContent=v};
      set('modernMediaStat',media);set('modernAccountsStat',accounts);set('modernDue',due);set('modernChase',scheduled);set('modernAssigned',published);set('modernReplies',total);
    };
    refresh();
    setInterval(refresh,1500);
  }

  function tuneBrand(){
    const brand=$('.brand');
    if(brand){const div=$('.brand div',brand);if(div)div.innerHTML='<strong><em>TECH</em> SOCIAL</strong><small>CRM</small>';}
    const mobile=$('.mobile-logo');
    if(mobile)mobile.innerHTML='<img src="tech-social-mark.png" alt=""><strong>TECH <span>SOCIAL CRM</span></strong>';
  }

  function init(){tuneBrand();addExtraStats();buildModernPanels();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  setTimeout(init,500);setTimeout(init,1500);
})();
