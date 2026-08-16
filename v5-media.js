/* Tech Social CRM — Media Library visual redesign. Only affects the Media Library view. */
(() => {
  'use strict';
  if (window.__TECH_SOCIAL_V5_MEDIA__) return;
  window.__TECH_SOCIAL_V5_MEDIA__ = true;

  const boot = () => {
    const view = document.querySelector('#mediaView') || document.querySelector('[data-view="media"]');
    if (!view || view.dataset.referenceMediaReady === '1') return;

    const heading = view.querySelector('.view-heading');
    const stats = view.querySelector('.media-stats');
    const panel = view.querySelector('.media-panel');
    const filterBar = view.querySelector('.media-panel .filter-bar');
    const grid = view.querySelector('#mediaGrid');
    const empty = view.querySelector('#mediaEmpty');
    const search = view.querySelector('#mediaSearch');
    const type = view.querySelector('#mediaTypeFilter');
    const folder = view.querySelector('#mediaFolderFilter');
    const newFolder = view.querySelector('#newMediaFolderButton');
    const upload = heading?.querySelector('[data-upload-media]');
    if (!heading || !stats || !panel || !filterBar || !grid) return;

    view.dataset.referenceMediaReady = '1';

    const kicker = heading.querySelector('p');
    const title = heading.querySelector('h2');
    const subtitle = heading.querySelector('span');
    if (kicker) kicker.textContent = 'MEDIA LIBRARY';
    if (title) title.textContent = 'Media Library';
    if (subtitle) subtitle.textContent = 'Manage and organise all your media files for social posts, campaigns and content.';
    if (search) search.placeholder = 'Search media…';

    const shell = document.createElement('div');
    shell.className = 'reference-media-layout';

    const toolbar = document.createElement('section');
    toolbar.className = 'reference-media-toolbar panel';
    toolbar.appendChild(filterBar);
    if (upload) {
      toolbar.appendChild(upload);
      upload.classList.add('reference-media-upload');
    }
    if (newFolder) newFolder.hidden = true;

    const overview = document.createElement('section');
    overview.className = 'reference-media-overview';
    overview.innerHTML = `
      <div class="reference-section-title">Media Overview</div>
      <div class="reference-stat-grid">
        <article class="reference-stat reference-stat-files"><span class="reference-stat-icon">▧</span><div><strong data-ref-stat="files">0</strong><small>Total files</small></div></article>
        <article class="reference-stat reference-stat-images"><span class="reference-stat-icon">▣</span><div><strong data-ref-stat="images">0</strong><small>Images</small></div></article>
        <article class="reference-stat reference-stat-videos"><span class="reference-stat-icon">▶</span><div><strong data-ref-stat="videos">0</strong><small>Videos</small></div></article>
        <article class="reference-stat reference-stat-audio"><span class="reference-stat-icon">♪</span><div><strong data-ref-stat="audio">0</strong><small>Audio</small></div></article>
        <article class="reference-stat reference-stat-other"><span class="reference-stat-icon">■</span><div><strong data-ref-stat="other">0</strong><small>Other files</small></div></article>
      </div>`;

    const recent = document.createElement('section');
    recent.className = 'reference-recent panel';
    recent.innerHTML = '<div class="reference-recent-heading"><div><strong>Recent Media</strong></div><button type="button" class="reference-view-all">View all media</button></div>';
    recent.appendChild(grid);
    if (empty) recent.appendChild(empty);

    shell.append(toolbar, overview, recent);
    heading.insertAdjacentElement('afterend', shell);

    stats.hidden = true;
    panel.hidden = true;

    const syncControls = () => {
      if (folder?.options?.length) folder.options[0].textContent = 'All categories';
    };

    const sync = () => {
      syncControls();
      const cards = [...grid.querySelectorAll('.media-card')];
      const visible = cards.filter(card => !card.hidden);
      const files = visible.length;
      const images = visible.filter(card => /IMAGE|JPG|PNG|WEBP/i.test(card.querySelector('.media-preview')?.textContent || '')).length;
      const videos = visible.filter(card => /VIDEO|MP4|WEBM|MOV/i.test(card.querySelector('.media-preview')?.textContent || '')).length;
      overview.querySelector('[data-ref-stat="files"]').textContent = files;
      overview.querySelector('[data-ref-stat="images"]').textContent = images;
      overview.querySelector('[data-ref-stat="videos"]').textContent = videos;
      overview.querySelector('[data-ref-stat="audio"]').textContent = 0;
      overview.querySelector('[data-ref-stat="other"]').textContent = Math.max(0, files - images - videos);
    };

    search?.addEventListener('input', sync);
    type?.addEventListener('change', sync);
    folder?.addEventListener('change', sync);
    overview.querySelector('[data-ref-stat="files"]')?.addEventListener('click', () => {});
    recent.querySelector('.reference-view-all')?.addEventListener('click', () => {
      if (search) search.value = '';
      if (type) type.value = 'all';
      if (folder) folder.value = 'all';
      search?.dispatchEvent(new Event('input', { bubbles: true }));
      sync();
    });

    new MutationObserver(sync).observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    new MutationObserver(syncControls).observe(filterBar, { childList: true, subtree: true });
    sync();
  };

  const start = () => {
    boot();
    const observer = new MutationObserver(boot);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
