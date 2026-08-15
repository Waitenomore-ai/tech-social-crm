/* Tech Social CRM 5.1 version patch. */
(() => {
  const VERSION = '5.1';
  const RELEASE = {
    version: VERSION,
    date: '15 August 2026',
    summary: 'Final sidebar icon cleanup.',
    changes: ['Removed the remaining Marketing icon from the sidebar']
  };

  const renderVersion = () => {
    const history = document.querySelector('#versionHistory');
    if (!history) return false;
    const existing = history.querySelectorAll('.version-card');
    const current = `<article class="version-card current"><header><h4>Version ${RELEASE.version} · Current</h4><time>${RELEASE.date}</time></header><p>${RELEASE.summary}</p><ul>${RELEASE.changes.map(change => `<li>${change}</li>`).join('')}</ul></article>`;
    if (!history.dataset.version51Patched) {
      history.insertAdjacentHTML('afterbegin', current);
      history.dataset.version51Patched = '1';
      existing.forEach(card => card.classList.remove('current'));
    }
    const status = document.querySelector('#versionStatus');
    if (status) {
      status.textContent = `You are up to date on version ${VERSION}.`;
      status.dataset.version51Patched = '1';
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
    if (history) new MutationObserver(renderVersion).observe(history, {childList:true});
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
