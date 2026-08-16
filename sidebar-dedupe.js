/* Tech Social CRM v5 sidebar cleanup — one menu entry per logical page. */
(() => {
  'use strict';

  const aliases = {
    'dashboard':'dashboard',
    'content calendar':'calendar', 'calendar':'calendar',
    'all posts':'posts', 'posts':'posts',
    'post templates':'templates', 'templates':'templates',
    'content ideas':'ideas', 'ideas':'ideas',
    'media library':'media', 'media':'media',
    'campaigns':'campaigns', 'marketing campaigns':'campaigns',
    'publishing queue':'queue', 'queue':'queue',
    'social accounts':'accounts', 'accounts':'accounts',
    'notifications':'notifications', 'notification centre':'notifications',
    'social inbox':'inbox', 'inbox':'inbox',
    'team requests':'requests', 'information requests':'requests',
    'analytics':'analytics', 'content analytics':'analytics',
    'login & change log':'activity', 'change log':'activity',
    'backups':'backups', 'backups and restore points':'backups',
    'settings':'settings'
  };

  const cleanText = el => (el?.querySelector('span:not(.mi)')?.textContent || el?.textContent || '')
    .replace(/\s+/g,' ').trim().toLowerCase().replace(/\s*\d+\s*$/,'');

  const run = () => {
    const seen = new Set();
    const items = [...document.querySelectorAll('.sidebar .nav-item')];

    items.forEach(item => {
      const label = cleanText(item);
      const link = item.getAttribute('data-view-link');
      const key = link || aliases[label] || label;

      // Marketing is an old overlay entry, not a standalone sidebar page.
      if (label === 'marketing' || item.classList.contains('marketing-nav-item') || item.dataset.marketingNav === '1') {
        item.remove();
        return;
      }

      if (!key) return;
      if (seen.has(key)) item.remove();
      else seen.add(key);
    });

    // Remove duplicate page containers as well, keeping the first canonical view.
    const seenViews = new Set();
    document.querySelectorAll('main .view[data-view]').forEach(view => {
      const key = view.getAttribute('data-view');
      if (!key) return;
      if (seenViews.has(key)) view.remove();
      else seenViews.add(key);
    });
  };

  // Run after the initial DOM and again after modules that may add navigation.
  const boot = () => {
    run();
    let runs = 0;
    const timer = setInterval(() => {
      run();
      if (++runs >= 20) clearInterval(timer);
    }, 500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
