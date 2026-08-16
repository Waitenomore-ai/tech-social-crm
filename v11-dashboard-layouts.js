(() => {
  'use strict';
  if (window.__TECH_SOCIAL_V11_DASHBOARD_LAYOUTS__) return;
  window.__TECH_SOCIAL_V11_DASHBOARD_LAYOUTS__ = true;

  const $ = (s, root = document) => root.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function clone(selector) {
    const source = $(selector);
    return source ? source.cloneNode(true) : document.createElement('div');
  }

  function platformMarkup() {
    const source = $('#miniAccounts');
    if (source && source.innerHTML.trim()) return source.innerHTML;
    const names = ['Instagram','TikTok','Facebook','X','LinkedIn','YouTube','WhatsApp'];
    return names.map(name => `<div class="v11-platform-fallback"><strong>${esc(name)}</strong><span>Account status available in Social Accounts</span></div>`).join('');
  }

  function recentMarkup() {
    const source = $('#recentPostsBody');
    if (source && source.innerHTML.trim()) return source.innerHTML;
    return '<tr><td colspan="6"><div class="v11-empty">No recent posts yet.</div></td></tr>';
  }

  function createQuickAccess() {
    const items = [
      ['calendar','Content calendar','Plan and schedule posts','calendar'],
      ['posts','All posts','View your content library','document'],
      ['templates','Post templates','Reuse proven content','template'],
      ['ideas','Content ideas','Capture and develop ideas','idea'],
      ['media','Media library','Manage your social assets','media'],
      ['campaigns','Campaigns','Organise content by campaign','campaign'],
      ['queue','Publishing queue','See what is ready to publish','queue'],
      ['accounts','Social accounts','Check connected networks','accounts'],
      ['notifications','Notifications','Review important updates','bell'],
      ['inbox','Social inbox','Manage conversations','inbox']
    ];
    const icons = {
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      document:'<path d="M6 3h9l4 4v14H6Z"/><path d="M14 3v5h5M9 12h7M9 16h5"/>',
      template:'<rect x="4" y="4" width="13" height="15" rx="2"/><path d="M8 8h5M8 12h5M8 16h3"/><path d="M8 20h9a3 3 0 0 0 3-3V8"/>',
      idea:'<path d="M9 18h6M10 22h4"/><path d="M8.5 15.5A6.5 6.5 0 1 1 15.5 15c-.8.7-1.5 1.5-1.5 3H10c0-1.5-.7-2.3-1.5-2.5Z"/>',
      media:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 3 3 2-2 6 6"/>',
      campaign:'<path d="M4 10v8l11 3V3L4 6v4Z"/><path d="m15 8 5 2v8l-5 3M8 8v7"/>',
      queue:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2M8 3.5 6 2M16 3.5 18 2"/>',
      accounts:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M17 13a5 5 0 0 1 5 5"/>',
      bell:'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
      inbox:'<path d="M4 5h16v13H8l-4 3Z"/><path d="M8 9h8M8 13h5"/>'
    };
    return items.map(([route, title, subtitle, icon]) => `
      <button class="v11-quick-item" type="button" data-layout-view="${route}">
        <span class="v11-quick-icon"><svg viewBox="0 0 24 24">${icons[icon]}</svg></span>
        <span class="v11-quick-copy"><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></span>
        <span class="v11-quick-star" aria-hidden="true">★</span>
      </button>`).join('');
  }

  function createRoot() {
    const dashboard = $('#dashboardView');
    if (!dashboard || $('#v11DashboardRoot')) return $('#v11DashboardRoot');

    const root = document.createElement('div');
    root.id = 'v11DashboardRoot';
    root.innerHTML = `
      <div class="v11-reference-dashboard">
        <section class="v11-welcome-hero">
          <div>
            <h2 id="v11Greeting">Good evening, Chris.</h2>
            <p id="v11Date">SUNDAY, 16 AUGUST 2026</p>
          </div>
        </section>

        <section class="v11-quick-access">
          <div class="v11-quick-head">
            <div>
              <h3><span>★</span> Quick Access</h3>
              <p>Your most-used social CRM areas are always visible here.</p>
            </div>
            <span class="v11-shortcut-count">10 shortcuts</span>
          </div>
          <div class="v11-quick-grid">${createQuickAccess()}</div>
        </section>

        <section class="v11-stats-wrap">
          <div class="v11-card v11-stats-card">
            <div class="v11-section-head"><div><p>CONTENT OVERVIEW</p><h3>What needs attention</h3></div></div>
            <div id="v11Stats"></div>
          </div>
        </section>

        <section class="v11-dashboard-grid">
          <div class="v11-card v11-recent-card">
            <div class="v11-section-head"><div><p>RECENT ACTIVITY</p><h3>Latest posts</h3></div><button type="button" data-layout-view="posts">View all posts</button></div>
            <div class="v11-table-wrap"><table><thead><tr><th>POST</th><th>CHANNELS</th><th>CAMPAIGN</th><th>DATE</th><th>STATUS</th></tr></thead><tbody id="v11Recent"></tbody></table></div>
          </div>
          <div class="v11-card v11-platform-card">
            <div class="v11-section-head"><div><p>YOUR NETWORK</p><h3>Account readiness</h3></div><button type="button" data-layout-view="accounts">Manage</button></div>
            <div class="v11-platforms" id="v11Platforms"></div>
          </div>
        </section>
      </div>`;

    dashboard.appendChild(root);
    return root;
  }

  function updateData(root) {
    if (!root) return;

    const greeting = $('#greetingLabel')?.textContent?.trim() || 'Good evening, Chris.';
    const date = $('#todayLabel')?.textContent?.trim() || '';
    const greetingTarget = $('#v11Greeting', root);
    const dateTarget = $('#v11Date', root);
    if (greetingTarget) greetingTarget.textContent = greeting;
    if (dateTarget) dateTarget.textContent = date;

    const stats = clone('.stats-grid');
    const statTarget = $('#v11Stats', root);
    if (statTarget && stats) {
      stats.className = 'v11-cloned-stats';
      statTarget.replaceChildren(stats);
    }

    const recent = $('#v11Recent', root);
    if (recent) recent.innerHTML = recentMarkup();

    const platforms = $('#v11Platforms', root);
    if (platforms) platforms.innerHTML = platformMarkup();
  }

  function route(action) {
    if (action === 'new-post') {
      document.querySelector('[data-new-post]')?.click();
      return;
    }
    document.querySelector(`[data-view-link="${action}"]`)?.click();
  }

  function wire(root) {
    if (!root || root.dataset.bound) return;
    root.dataset.bound = '1';
    root.addEventListener('click', e => {
      const button = e.target.closest('[data-layout-view]');
      if (button) {
        e.preventDefault();
        route(button.dataset.layoutView);
      }
    });
  }

  function boot() {
    const root = createRoot();
    if (!root) return;
    wire(root);
    updateData(root);

    const sources = ['.stats-grid','#recentPostsBody','#miniAccounts','#greetingLabel','#todayLabel'].map(s => $(s)).filter(Boolean);
    sources.forEach(source => {
      if (source.dataset.v11Observed) return;
      source.dataset.v11Observed = '1';
      new MutationObserver(() => updateData(root)).observe(source, {childList:true, subtree:true, characterData:true});
    });

    window.techSocialV11Dashboard = { refresh: () => updateData(root) };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
