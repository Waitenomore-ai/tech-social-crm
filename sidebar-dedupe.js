/* Tech Social CRM v5 sidebar cleanup. Keep one navigation entry per page and one page view per view id. */
(() => {
  const run = () => {
    const seenLinks = new Set();
    document.querySelectorAll('.sidebar .nav-item[data-view-link]').forEach(item => {
      const key = item.getAttribute('data-view-link');
      if (!key) return;
      if (seenLinks.has(key)) item.remove();
      else seenLinks.add(key);
    });

    const seenViews = new Set();
    document.querySelectorAll('main .view[data-view]').forEach(view => {
      const key = view.getAttribute('data-view');
      if (!key) return;
      if (seenViews.has(key)) view.remove();
      else seenViews.add(key);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
