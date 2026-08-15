/* Tech Social CRM 5.2 version display patch. */
(() => {
  const VERSION = '5.2';
  const RELEASE = {
    version: VERSION,
    date: '15 August 2026',
    summary: 'Fixed version display synchronisation across the CRM.',
    changes: [
      'Updated the Settings version chip to show the current release',
      'Updated the Version page current release heading and status',
      'Updated the sidebar footer release label',
      'Prevented the built-in 4.3 version checker from overwriting the current version display'
    ]
  };

  const replaceReleaseLabels = () => {
    document.querySelectorAll('.settings-version-chip').forEach(el => {
      el.textContent = `Version ${VERSION}`;
    });
    document.querySelectorAll('.version-hero h3 em').forEach(el => {
      el.textContent = VERSION;
    });
    document.querySelectorAll('.sidebar-bottom, .privacy-note').forEach(root => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        if (/Version\s+4\.3/.test(node.nodeValue || '')) {
          node.nodeValue = node.nodeValue.replace(/Version\s+4\.3/g, `Version ${VERSION}`);
        }
      });
    });
  };

  const renderVersion = () => {
    const history = document.querySelector('#versionHistory');
    if (!history) return false;
    const existing = history.querySelectorAll('.version-card');
    if (!history.dataset.version52Patched) {
      const current = `<article class="version-card current"><header><h4>Version ${RELEASE.version} · Current</h4><time>${RELEASE.date}</time></header><p>${RELEASE.summary}</p><ul>${RELEASE.changes.map(change => `<li>${change}</li>`).join('')}</ul></article>`;
      history.insertAdjacentHTML('afterbegin', current);
      history.dataset.version52Patched = '1';
      existing.forEach(card => card.classList.remove('current'));
    }
    const status = document.querySelector('#versionStatus');
    if (status) {
      status.textContent = `You are up to date on version ${VERSION}.`;
      status.dataset.version52Patched = '1';
    }
    const updateButton = document.querySelector('#updateNowButton');
    const availability = document.querySelector('#updateAvailability');
    if (updateButton) updateButton.disabled = true;
    if (availability) {
      availability.textContent = 'NO UPDATE';
      availability.classList.remove('available');
      availability.classList.add('unavailable');
    }
    replaceReleaseLabels();
    return true;
  };

  const interceptVersionCheck = event => {
    const button = event.target?.closest?.('#checkVersionButton');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderVersion();
  };

  const start = () => {
    renderVersion();
    document.addEventListener('click', interceptVersionCheck, true);
    const history = document.querySelector('#versionHistory');
    if (history) new MutationObserver(renderVersion).observe(history, {childList:true});
    new MutationObserver(replaceReleaseLabels).observe(document.body, {childList:true, subtree:true});
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();