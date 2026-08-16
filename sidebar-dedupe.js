/* Tech Social CRM — safe sidebar duplicate cleanup. */
(() => {
  'use strict';
  if (window.__TECH_SOCIAL_SIDEBAR_DEDUPE__) return;
  window.__TECH_SOCIAL_SIDEBAR_DEDUPE__ = true;

  const aliases = {
    dashboard:'dashboard',
    'content calendar':'calendar', calendar:'calendar',
    'all posts':'posts', posts:'posts',
    'post templates':'templates', templates:'templates',
    'content ideas':'ideas', ideas:'ideas',
    'media library':'media', media:'media',
    campaigns:'campaigns', 'marketing campaigns':'campaigns',
    'publishing queue':'queue', queue:'queue',
    'social accounts':'accounts', accounts:'accounts',
    notifications:'notifications', 'notification centre':'notifications',
    'social inbox':'inbox', inbox:'inbox',
    'team requests':'requests', 'information requests':'requests',
    analytics:'analytics', 'content analytics':'analytics',
    'login & change log':'activity', 'change log':'activity',
    backups:'backups', 'backups and restore points':'backups',
    settings:'settings'
  };

  const cleanText = el => (el?.querySelector('span:not(.mi)')?.textContent || el?.textContent || '')
    .replace(/\s+/g,' ').trim().toLowerCase().replace(/\s*\d+\s*$/,'');

  function clean() {
    const seen = new Set();
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      const label = cleanText(item);
      const link = item.getAttribute('data-view-link');
      const key = link || aliases[label] || label;

      // Marketing has its own dedicated section and must not appear as an old Team item.
      if (label === 'marketing' || item.classList.contains('marketing-nav-item') || item.dataset.marketingNav === '1') {
        item.remove();
        return;
      }

      if (!key) return;
      if (seen.has(key)) item.remove();
      else seen.add(key);
    });
  }

  function boot() {
    clean();
    // Other modules can add navigation after startup. Watch only the sidebar;
    // never remove page/view containers, which keeps this cleanup isolated.
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) new MutationObserver(clean).observe(sidebar, {childList:true, subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
