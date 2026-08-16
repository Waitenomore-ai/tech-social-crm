(() => {
  'use strict';
  if (window.__TECH_SOCIAL_V11_1_NAV_REPAIR__) return;
  window.__TECH_SOCIAL_V11_1_NAV_REPAIR__ = true;

  const allowed = new Set(['dashboard','calendar','posts','templates','ideas','media','campaigns','notifications','analytics','activity','backups','inbox','requests','settings','queue','accounts','leads','reviews','followups']);

  function navigate(view) {
    if (!allowed.has(view)) return;
    if (typeof window.showView === 'function') {
      window.showView(view);
      return;
    }
    const views = [...document.querySelectorAll('.view')];
    views.forEach(node => { node.hidden = node.dataset.view !== view; });
    document.querySelectorAll('.nav-item[data-view-link]').forEach(node => {
      node.classList.toggle('active', node.dataset.viewLink === view);
    });
    const labels = {
      dashboard:['TECH SOCIAL / OVERVIEW','Content dashboard'], calendar:['TECH SOCIAL / PLANNER','Content calendar'], posts:['TECH SOCIAL / LIBRARY','All social posts'], templates:['TECH SOCIAL / TEMPLATES','Post templates'], ideas:['TECH SOCIAL / IDEAS','Content ideas'], media:['TECH SOCIAL / MEDIA','Media library'], campaigns:['TECH SOCIAL / CAMPAIGNS','Campaign manager'], notifications:['TECH SOCIAL / NOTIFICATIONS','Notification centre'], analytics:['TECH SOCIAL / ANALYTICS','Content analytics'], activity:['TECH SOCIAL / ACTIVITY','Activity log'], backups:['TECH SOCIAL / BACKUPS','Backups'], inbox:['TECH SOCIAL / INBOX','Social inbox'], requests:['TECH SOCIAL / REQUESTS','Team requests'], settings:['TECH SOCIAL / SETTINGS','Settings'], queue:['TECH SOCIAL / PUBLISHING','Publishing queue'], accounts:['TECH SOCIAL / ACCOUNTS','Social accounts']
    };
    const pair = labels[view];
    if (pair) {
      const kicker = document.querySelector('#pageKicker');
      const title = document.querySelector('#pageTitle');
      if (kicker) kicker.textContent = pair[0];
      if (title) title.textContent = pair[1];
    }
    window.scrollTo({top:0,behavior:'smooth'});
  }

  document.addEventListener('click', event => {
    const link = event.target?.closest?.('#sidebar .nav-item[data-view-link]');
    if (!link) return;
    const view = link.dataset.viewLink;
    if (!allowed.has(view)) return;
    event.preventDefault();
    navigate(view);
  }, true);

  window.techSocialNavigationRepair = { navigate };
})();
