/* Tech Social CRM 5.0 version patch. Keeps the deployed version UI aligned with version.json. */
(() => {
  const VERSION = '5.0';
  const RELEASE = {
    version: VERSION,
    date: '15 August 2026',
    summary: 'Sidebar visual redesign and navigation cleanup.',
    changes: [
      'Reverted the sidebar to a clean white design',
      'Made the sidebar independently scrollable',
      'Removed navigation icons from the sidebar',
      'Adjusted the logo and header spacing',
      'Moved the hook line into its own dedicated line',
      'Fixed logo and hook-line overlap'
    ]
  };

  const renderVersion = () => {
    const history = document.querySelector('#versionHistory');
    if (!history) return false;
    const existing = history.querySelectorAll('.version-card');
    const current = `<article class="version-card current"><header><h4>Version ${RELEASE.version} · Current</h4><time>${RELEASE.date}</time></header><p>${RELEASE.summary}</p><ul>${RELEASE.changes.map(change => `<li>${change}</li>`).join('')}</ul></article>`;
    if (!history.dataset.version50Patched) {
      history.insertAdjacentHTML('afterbegin', current);
      history.dataset.version50Patched = '1';
      existing.forEach(card => card.classList.remove('current'));
    }
    const status = document.querySelector('#versionStatus');
    if (status && !status.dataset.version50Patched) {
      status.textContent = `You are up to date on version ${VERSION}.`;
      status.dataset.version50Patched = '1';
    }
    const updateButton = document.querySelector('#updateNowButton');
    const availability = document.querySelector('#updateAvailability');
    if (updateButton) updateButton.disabled = true;
    if (availability) {
      availability.textContent = 'NO UPDATE';
      availability.classList.remove('available');
      availability.classList.add('unavailable');
    }
    return true;
  };

  const start = () => {
    renderVersion();
    const history = document.querySelector('#versionHistory');
    if (history) {
      new MutationObserver(() => renderVersion()).observe(history, {childList:true});
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
