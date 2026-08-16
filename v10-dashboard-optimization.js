/* Tech Social CRM V10.1 — sidebar and dashboard optimization. */
(() => {
  'use strict';
  if (window.__TECH_SOCIAL_V10_DASHBOARD_OPT__) return;
  window.__TECH_SOCIAL_V10_DASHBOARD_OPT__ = true;

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  function cleanSidebar() {
    const aliases = {
      dashboard:'dashboard', 'content calendar':'calendar', calendar:'calendar',
      'all posts':'posts', posts:'posts', 'post templates':'templates', templates:'templates',
      'content ideas':'ideas', ideas:'ideas', 'media library':'media', media:'media',
      campaigns:'campaigns', 'marketing campaigns':'campaigns', 'publishing queue':'queue', queue:'queue',
      'social accounts':'accounts', accounts:'accounts', notifications:'notifications',
      'notification centre':'notifications', 'social inbox':'inbox', inbox:'inbox',
      'team requests':'requests', 'information requests':'requests', analytics:'analytics',
      'content analytics':'analytics', 'login & change log':'activity', 'change log':'activity',
      backups:'backups', 'backups and restore points':'backups', settings:'settings'
    };
    const seen = new Set();
    $$('.sidebar .nav-item').forEach(item => {
      const label = (item.querySelector('span')?.textContent || item.textContent || '').replace(/\s+/g,' ').trim().toLowerCase().replace(/\s*\d+\s*$/,'');
      const key = item.getAttribute('data-view-link') || aliases[label] || label;
      if (label === 'marketing' || item.dataset.marketingNav === '1' || item.classList.contains('marketing-nav-item')) { item.remove(); return; }
      if (key && seen.has(key)) item.remove(); else if (key) seen.add(key);
    });
  }

  function optimizeDashboard() {
    const dashboard = $('#dashboardView');
    const topbar = $('.topbar');
    if (!dashboard || !topbar) return;

    let strip = $('#dashboardNetworkStatusStrip');
    const accountPanel = $('.accounts-panel', dashboard);
    const mini = $('#miniAccounts');

    // Put the live network status immediately below the topbar/search area.
    if (!strip) {
      strip = document.createElement('section');
      strip.id = 'dashboardNetworkStatusStrip';
      strip.className = 'dashboard-network-strip';
      strip.setAttribute('aria-label','Network status');
      topbar.insertAdjacentElement('afterend', strip);
    }
    if (mini && mini.parentElement !== strip) {
      strip.appendChild(mini);
      const legend = accountPanel?.querySelector('.account-legend');
      if (legend) legend.remove();
    }
    strip.hidden = !dashboard.classList.contains('active');

    // The dashboard should not repeat network management; Settings/Social Accounts own it.
    accountPanel?.remove();

    // Keep Upcoming Content and Recent Activity compact and side-by-side.
    const grid = $('.dashboard-grid', dashboard);
    const recent = $('.recent-panel', dashboard);
    const upcoming = $('.upcoming-panel', dashboard);
    if (grid && recent && recent.parentElement !== grid) grid.appendChild(recent);
    if (grid && upcoming) grid.classList.add('dashboard-content-row');
    if (recent) recent.classList.add('dashboard-compact-panel');
    if (upcoming) upcoming.classList.add('dashboard-compact-panel');
  }

  function observe() {
    cleanSidebar();
    optimizeDashboard();
    const observer = new MutationObserver(() => { cleanSidebar(); optimizeDashboard(); });
    observer.observe(document.body, {childList:true, subtree:true});
    window.techSocialDashboardOptimization = {refresh: () => { cleanSidebar(); optimizeDashboard(); }};
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, {once:true});
  else observe();
})();
