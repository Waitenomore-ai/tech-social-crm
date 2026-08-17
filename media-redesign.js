/* V1.1 Beta/Test — isolated Media Library layout enhancement. */
(() => {
  if (window.__TECH_SOCIAL_MEDIA_REDESIGN__) return;
  window.__TECH_SOCIAL_MEDIA_REDESIGN__ = true;

  const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;

  const boot = () => {
    const view = document.getElementById('mediaView');
    if (!view || view.dataset.mediaRedesignReady === '1') return;
    const panel = view.querySelector('.media-panel');
    const filter = panel?.querySelector('.filter-bar');
    const grid = view.querySelector('#mediaGrid');
    const oldStats = view.querySelector('.media-stats');
    const headingButton = view.querySelector('.view-heading > .button-primary');
    if (!panel || !filter || !grid || !oldStats) return;

    view.dataset.mediaRedesignReady = '1';
    view.classList.add('media-redesign');
    panel.classList.add('media-redesign-panel');

    // The older v5 toolbar remains in the DOM for compatibility, but the new
    // Media Library presents one clean control bar instead of two toolbars.
    view.querySelectorAll('.v5-media-toolbar').forEach(el => { el.hidden = true; });

    // Keep the real upload button and move it into the control bar.
    if (headingButton) {
      headingButton.classList.add('media-redesign-upload');
      headingButton.classList.add('button-primary');
      headingButton.setAttribute('aria-label', 'Upload media');
      filter.appendChild(headingButton);
    }

    const folderButton = filter.querySelector('#newMediaFolderButton');
    if (folderButton) folderButton.hidden = true;

    // Keep the existing stat elements for the application logic, but present
    // a category-focused five-card overview for users.
    oldStats.hidden = true;
    const overview = document.createElement('div');
    overview.className = 'media-redesign-overview';
    overview.innerHTML = `<div class="media-overview-label">Media Overview</div><div class="media-redesign-stats">
      <article><span class="total">${icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m4 17 5-5 3.5 3.5 2-2L20 19"/>')}</span><div><strong data-media-redesign-total>0</strong><small>Total files</small></div></article>
      <article><span class="images">${icon('<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m5 17 4-4 3 3 2-2 5 5"/>')}</span><div><strong data-media-redesign-images>0</strong><small>Images</small></div></article>
      <article><span class="videos">${icon('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3Z"/>')}</span><div><strong data-media-redesign-videos>0</strong><small>Videos</small></div></article>
      <article><span class="audio">${icon('<path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>')}</span><div><strong data-media-redesign-audio>0</strong><small>Audio</small></div></article>
      <article><span class="other">${icon('<path d="M4 7h5l2 2h9v10H4Z"/><path d="M4 7V5h7l2 2"/>')}</span><div><strong data-media-redesign-other>0</strong><small>Other files</small></div></article>
    </div>`;

    const recent = document.createElement('div');
    recent.className = 'media-recent-label';
    recent.innerHTML = `<span>Recent Media</span><button type="button" data-media-view-all>View all media</button>`;

    panel.insertBefore(overview, grid);
    panel.insertBefore(recent, grid);

    const updateStats = () => {
      const cards = [...grid.querySelectorAll('.media-card')].filter(card => !card.hidden);
      const allCards = [...grid.querySelectorAll('.media-card')];
      const total = allCards.length;
      let images = 0, videos = 0, audio = 0;
      allCards.forEach(card => {
        const type = (card.dataset.type || card.dataset.mediaType || '').toLowerCase();
        const text = (card.textContent || '').toLowerCase();
        const video = type === 'video' || card.querySelector('video') || /\b(mp4|webm|mov|video)\b/.test(text);
        const audioMatch = type === 'audio' || /\b(mp3|wav|m4a|audio)\b/.test(text);
        if (video) videos += 1;
        else if (audioMatch) audio += 1;
        else if (card.querySelector('img') || ['image','photo','graphic','logo'].includes(type)) images += 1;
      });
      const other = Math.max(0, total - images - videos - audio);
      view.querySelector('[data-media-redesign-total]').textContent = total;
      view.querySelector('[data-media-redesign-images]').textContent = images;
      view.querySelector('[data-media-redesign-videos]').textContent = videos;
      view.querySelector('[data-media-redesign-audio]').textContent = audio;
      view.querySelector('[data-media-redesign-other]').textContent = other;
      recent.querySelector('button').textContent = cards.length === total ? 'View all media' : `Showing ${cards.length} of ${total}`;
    };

    recent.querySelector('[data-media-view-all]')?.addEventListener('click', () => {
      const search = view.querySelector('#mediaSearch');
      const type = view.querySelector('#mediaTypeFilter');
      const folder = view.querySelector('#mediaFolderFilter');
      if (search) search.value = '';
      if (type) type.value = 'all';
      if (folder) folder.value = 'all';
      [search, type, folder].forEach(el => el?.dispatchEvent(new Event('change', { bubbles: true })));
      search?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const observer = new MutationObserver(updateStats);
    observer.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-type', 'data-media-type'] });
    updateStats();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
