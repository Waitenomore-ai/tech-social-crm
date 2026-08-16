/* Tech Social CRM v5.0 — Media Library workspace enhancement.
 * Builds on the existing media data, upload modal and post-media selector.
 * No Meta/OAuth or database schema changes.
 */
(() => {
  if (window.__TECH_SOCIAL_V5_MEDIA__) return;
  window.__TECH_SOCIAL_V5_MEDIA__ = true;

  const boot = () => {
    const view = document.querySelector('#mediaView') || document.querySelector('[data-view="media"]');
    if (!view || view.dataset.v5MediaReady === '1') return;
    view.dataset.v5MediaReady = '1';

    const heading = view.querySelector('.view-heading');
    const grid = document.querySelector('#mediaGrid');
    const search = document.querySelector('#mediaSearch');
    const type = document.querySelector('#mediaTypeFilter');
    const folder = document.querySelector('#mediaFolderFilter');
    const uploadButton = document.querySelector('#openMediaUploadButton');
    const dropZone = document.querySelector('#mediaDropZone');
    const input = document.querySelector('#mediaUploadInput');
    if (!heading || !grid) return;

    const toolbar = document.createElement('section');
    toolbar.className = 'v5-media-toolbar panel';
    toolbar.innerHTML = `
      <div class="v5-media-toolbar-main">
        <div><strong>Media workspace</strong><span>Keep photos, videos, graphics and logos ready for your next post.</span></div>
        <div class="v5-media-actions"><button type="button" class="button button-outline" data-v5-media-filter="all">All media</button><button type="button" class="button button-outline" data-v5-media-filter="image">Photos & graphics</button><button type="button" class="button button-outline" data-v5-media-filter="video">Videos</button><button type="button" class="button button-primary" data-v5-media-upload>Upload media</button></div>
      </div>
      <div class="v5-media-drop" tabindex="0"><span>Drop files here</span><small>Images, video and graphics can be added to the existing media library.</small></div>
    `;
    heading.insertAdjacentElement('afterend', toolbar);

    const refresh = () => {
      const q = (search?.value || '').trim().toLowerCase();
      const selectedType = type?.value || 'all';
      const cards = [...grid.children];
      cards.forEach(card => {
        const text = (card.textContent || '').toLowerCase();
        const cardType = (card.dataset.type || card.getAttribute('data-media-type') || '').toLowerCase();
        const matchesText = !q || text.includes(q);
        const matchesType = selectedType === 'all' || !cardType || cardType === selectedType || (selectedType === 'image' && ['photo','graphic','image','logo'].includes(cardType));
        card.hidden = !(matchesText && matchesType);
      });
    };

    toolbar.querySelectorAll('[data-v5-media-filter]').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.v5MediaFilter;
        if (type) type.value = value === 'all' ? 'all' : value;
        refresh();
      });
    });

    toolbar.querySelector('[data-v5-media-upload]')?.addEventListener('click', () => uploadButton?.click());
    search?.addEventListener('input', refresh);
    type?.addEventListener('change', refresh);
    folder?.addEventListener('change', refresh);

    const drop = toolbar.querySelector('.v5-media-drop');
    const openFiles = files => {
      if (!input || !files?.length) return;
      try {
        const dt = new DataTransfer();
        [...files].forEach(file => dt.items.add(file));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', {bubbles:true}));
        uploadButton?.click();
      } catch { uploadButton?.click(); }
    };
    ['dragenter','dragover'].forEach(eventName => drop?.addEventListener(eventName, event => {event.preventDefault();drop.classList.add('is-dragging');}));
    ['dragleave','drop'].forEach(eventName => drop?.addEventListener(eventName, event => {event.preventDefault();drop.classList.remove('is-dragging');}));
    drop?.addEventListener('drop', event => openFiles(event.dataTransfer.files));
    drop?.addEventListener('click', () => uploadButton?.click());
    drop?.addEventListener('keydown', event => {if(event.key === 'Enter' || event.key === ' ') {event.preventDefault();uploadButton?.click();}});

    const observe = new MutationObserver(refresh);
    observe.observe(grid, {childList:true,subtree:true});
    refresh();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
