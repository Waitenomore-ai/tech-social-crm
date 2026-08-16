(() => {
  'use strict';
  if (window.__TECH_SOCIAL_VERSION_MANAGER__) return;
  window.__TECH_SOCIAL_VERSION_MANAGER__ = true;

  const manifestUrl = () => `version-info.json?v=${Date.now()}`;
  const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const majorOf = version => String(version || '0').split('.')[0];
  const sortVersions = items => [...items].sort((a,b) => b.version.localeCompare(a.version, undefined, {numeric:true}));

  function styles() {
    if (document.getElementById('dynamicVersionStyles')) return;
    const style = document.createElement('style');
    style.id = 'dynamicVersionStyles';
    style.textContent = `.dynamic-version-history{display:grid;gap:10px;margin-top:20px}.dynamic-version-major{border:1px solid var(--line);border-radius:10px;background:#fff;overflow:hidden}.dynamic-version-major summary{display:flex;align-items:center;gap:10px;padding:13px 15px;cursor:pointer;list-style:none;font-size:10px;font-weight:800;color:var(--black)}.dynamic-version-major summary::-webkit-details-marker{display:none}.dynamic-version-major summary:before{content:'+';width:20px;height:20px;display:grid;place-items:center;border:1px solid var(--line);border-radius:5px;color:var(--muted);font-size:12px}.dynamic-version-major[open] summary:before{content:'−'}.dynamic-version-major summary .major-meta{margin-left:auto;color:var(--muted);font-size:8px;font-weight:600}.dynamic-version-major.current-major summary{background:var(--soft)}.dynamic-version-list{display:grid;gap:8px;padding:0 10px 10px}.dynamic-version-entry{padding:12px 13px;border:1px solid var(--line);border-radius:8px;background:#fff}.dynamic-version-entry.current-release{border-color:rgba(239,17,27,.25);box-shadow:inset 3px 0 0 var(--red)}.dynamic-version-entry-head{display:flex;align-items:center;gap:8px}.dynamic-version-number{font-size:10px;font-weight:850;color:var(--black)}.dynamic-version-date{margin-left:auto;color:var(--faint);font-size:7.5px}.dynamic-version-badge{padding:3px 6px;border-radius:99px;color:#fff;background:var(--red);font-size:7px;font-weight:800}.dynamic-version-summary{margin:6px 0;color:var(--muted);font-size:8.5px;line-height:1.5}.dynamic-version-changes{margin:6px 0 0;padding-left:17px;color:var(--ink);font-size:8px;line-height:1.65}`;
    document.head.appendChild(style);
  }

  function setCurrentVersion(version) {
    const label = `Version ${version}`;
    document.querySelectorAll('.settings-version-chip').forEach(el => el.textContent = label);
    document.querySelectorAll('.version-nav-badge').forEach(el => el.textContent = `v${version}`);
    document.querySelectorAll('.version-hero h3').forEach(el => el.innerHTML = `Tech Social <em>${esc(version)}</em>`);
    document.querySelectorAll('footer span:last-child').forEach(el => el.innerHTML = `<i></i> Version ${esc(version)} · Supabase secured`);
    document.title = `Tech Social CRM — v${version}`;
  }

  function render(manifest) {
    const current = manifest.current || {};
    const history = sortVersions(manifest.history || []);
    const currentMajor = majorOf(current.version);
    setCurrentVersion(current.version || 'Unknown');
    const heroStatus = document.querySelector('#versionStatus');
    if (heroStatus) heroStatus.textContent = `Version information is loaded automatically from the central release manifest. Current release: ${current.version}.`;
    const oldHistory = document.querySelector('#versionHistory');
    if (oldHistory) {
      const grouped = history.reduce((map, item) => { const major = majorOf(item.version); (map[major] ||= []).push(item); return map; }, {});
      oldHistory.innerHTML = '';
      oldHistory.className = 'dynamic-version-history';
      Object.keys(grouped).sort((a,b) => Number(b)-Number(a)).forEach(major => {
        const releases = sortVersions(grouped[major]);
        const details = document.createElement('details');
        details.className = `dynamic-version-major${major === currentMajor ? ' current-major' : ''}`;
        details.open = major === currentMajor;
        details.innerHTML = `<summary><span>Version ${esc(major)} releases</span><span class="major-meta">${releases.length} release${releases.length === 1 ? '' : 's'}</span></summary><div class="dynamic-version-list"></div>`;
        const list = details.querySelector('.dynamic-version-list');
        releases.forEach(item => {
          const entry = document.createElement('article');
          entry.className = `dynamic-version-entry${item.version === current.version ? ' current-release' : ''}`;
          entry.innerHTML = `<div class="dynamic-version-entry-head"><span class="dynamic-version-number">v${esc(item.version)}</span>${item.version === current.version ? '<span class="dynamic-version-badge">CURRENT</span>' : ''}<span class="dynamic-version-date">${esc(item.date)}</span></div><p class="dynamic-version-summary">${esc(item.summary)}</p><ul class="dynamic-version-changes">${(item.changes || []).map(change => `<li>${esc(change)}</li>`).join('')}</ul>`;
          list.appendChild(entry);
        });
        oldHistory.appendChild(details);
      });
    }
    const checkButton = document.querySelector('#checkVersionButton');
    if (checkButton) {
      checkButton.textContent = 'Refresh version information';
      checkButton.onclick = () => refresh(true);
    }
  }

  async function refresh(showToast = true) {
    const button = document.querySelector('#checkVersionButton');
    if (button) button.disabled = true;
    try {
      const response = await fetch(manifestUrl(), {cache:'no-store'});
      if (!response.ok) throw new Error(`Version manifest returned ${response.status}`);
      const fresh = await response.json();
      render(fresh);
      if (showToast && typeof window.toast === 'function') window.toast(`Version information refreshed — v${fresh.current?.version || '?'}`);
      return fresh;
    } catch (error) {
      if (showToast && typeof window.toast === 'function') window.toast(error.message || 'Could not refresh version information.', true);
      return null;
    } finally { if (button) button.disabled = false; }
  }

  function hookSettingsRenderer() {
    if (window.__TECH_SOCIAL_VERSION_SETTINGS_HOOK__) return true;
    if (typeof window.renderSettings !== 'function') return false;
    const originalRenderSettings = window.renderSettings;
    window.renderSettings = function (...args) {
      const result = originalRenderSettings.apply(this, args);
      Promise.resolve(result).finally(() => {
        const versionPane = document.querySelector('[data-settings-pane="versions"]');
        if (versionPane && !versionPane.hidden) refresh(false);
      });
      return result;
    };
    window.__TECH_SOCIAL_VERSION_SETTINGS_HOOK__ = true;
    return true;
  }

  function installSettingsHook() {
    if (hookSettingsRenderer()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (hookSettingsRenderer() || attempts >= 120) clearInterval(timer);
    }, 250);
  }

  async function init() {
    styles();
    await refresh(false);
    installSettingsHook();
    let lastVersion = null;
    setInterval(async () => {
      try {
        const response = await fetch(manifestUrl(), {cache:'no-store'});
        if (!response.ok) return;
        const manifest = await response.json();
        const version = manifest.current?.version;
        if (version && version !== lastVersion) { lastVersion = version; render(manifest); }
      } catch (_) {}
    }, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
