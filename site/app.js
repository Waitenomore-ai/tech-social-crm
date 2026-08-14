const NETWORKS = [
  {
    id: 'instagram', name: 'Instagram', badge: 'IG',
    color: 'linear-gradient(135deg, #7b35c8, #ef3d73 58%, #f59a3b)',
    description: 'Create page • paste caption',
    loginUrl: 'https://www.instagram.com/accounts/login/',
    composerUrl: () => 'https://www.instagram.com/',
    prefill: 'Paste the caption and choose your media'
  },
  {
    id: 'tiktok', name: 'TikTok', badge: 'TT', color: '#141918',
    description: 'Official upload page',
    loginUrl: 'https://www.tiktok.com/login',
    composerUrl: () => 'https://www.tiktok.com/upload',
    prefill: 'Paste the caption and choose your media'
  },
  {
    id: 'facebook', name: 'Facebook', badge: 'f', color: '#1877f2',
    description: 'Shares your link if provided',
    loginUrl: 'https://www.facebook.com/login',
    composerUrl: ({ url, caption }) => url
      ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(caption)}`
      : 'https://www.facebook.com/',
    prefill: 'Your link can be shared; paste the caption if needed'
  },
  {
    id: 'x', name: 'X', badge: 'X', color: '#111111',
    description: 'Caption and link are prefilled',
    loginUrl: 'https://x.com/i/flow/login',
    composerUrl: ({ caption, url }) => {
      const text = [caption, url].filter(Boolean).join(caption && url ? '\n\n' : '');
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    },
    prefill: 'Caption and link should already be filled in'
  },
  {
    id: 'linkedin', name: 'LinkedIn', badge: 'in', color: '#0a66c2',
    description: 'Shares your link if provided',
    loginUrl: 'https://www.linkedin.com/login',
    composerUrl: ({ url }) => url
      ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
      : 'https://www.linkedin.com/feed/',
    prefill: 'Your link can be shared; paste the caption if needed'
  },
  {
    id: 'youtube', name: 'YouTube', badge: 'YT', color: '#ff0033',
    description: 'YouTube Studio upload',
    loginUrl: 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2F',
    composerUrl: () => 'https://www.youtube.com/upload',
    prefill: 'Choose your video, then use the caption details'
  }
];

const STORAGE_KEY = 'tech-social-state-v1';
const LEGACY_STORAGE_KEY = 'postdeck-state-v1';
const defaultState = {
  caption: '',
  url: '',
  hashtags: '',
  selected: NETWORKS.map(network => network.id),
  ready: {},
  scheduleMode: 'now',
  scheduleDate: '',
  scheduleTime: '09:00'
};

const elements = {
  caption: document.querySelector('#caption'),
  captionCount: document.querySelector('#captionCount'),
  postUrl: document.querySelector('#postUrl'),
  hashtags: document.querySelector('#hashtags'),
  urlError: document.querySelector('#urlError'),
  saveState: document.querySelector('#saveState'),
  networkList: document.querySelector('#networkList'),
  networkTemplate: document.querySelector('#networkTemplate'),
  selectedSummary: document.querySelector('#selectedSummary'),
  launchButton: document.querySelector('#launchButton'),
  selectAllButton: document.querySelector('#selectAllButton'),
  accountsModal: document.querySelector('#accountsModal'),
  accountList: document.querySelector('#accountList'),
  closeAccountsButton: document.querySelector('#closeAccountsButton'),
  resultsModal: document.querySelector('#resultsModal'),
  closeResultsButton: document.querySelector('#closeResultsButton'),
  resultsIntro: document.querySelector('#resultsIntro'),
  resultList: document.querySelector('#resultList'),
  copyCaptionButton: document.querySelector('#copyCaptionButton'),
  copyLinkButton: document.querySelector('#copyLinkButton'),
  mediaZone: document.querySelector('#mediaZone'),
  mediaInput: document.querySelector('#mediaInput'),
  mediaEmpty: document.querySelector('#mediaEmpty'),
  mediaPreview: document.querySelector('#mediaPreview'),
  previewThumb: document.querySelector('#previewThumb'),
  mediaName: document.querySelector('#mediaName'),
  mediaSize: document.querySelector('#mediaSize'),
  removeMedia: document.querySelector('#removeMedia'),
  clearDataButton: document.querySelector('#clearDataButton'),
  toastRegion: document.querySelector('#toastRegion'),
  dashboardView: document.querySelector('#dashboardView'),
  composerView: document.querySelector('#composerView'),
  headerKicker: document.querySelector('#headerKicker'),
  headerTitle: document.querySelector('#headerTitle'),
  headerReadyText: document.querySelector('#headerReadyText'),
  sidebarReadyCount: document.querySelector('#sidebarReadyCount'),
  connectedStat: document.querySelector('#connectedStat'),
  connectedStatNote: document.querySelector('#connectedStatNote'),
  selectedStat: document.querySelector('#selectedStat'),
  draftStatus: document.querySelector('#draftStatus'),
  draftStatNote: document.querySelector('#draftStatNote'),
  draftPreview: document.querySelector('#draftPreview'),
  draftMeta: document.querySelector('#draftMeta'),
  dashboardChannelList: document.querySelector('#dashboardChannelList'),
  heroSelectedCount: document.querySelector('#heroSelectedCount'),
  dashboardDate: document.querySelector('#dashboardDate'),
  greetingText: document.querySelector('#greetingText'),
  dashboardScheduleState: document.querySelector('#dashboardScheduleState'),
  scheduleFields: document.querySelector('#scheduleFields'),
  scheduleDate: document.querySelector('#scheduleDate'),
  scheduleTime: document.querySelector('#scheduleTime'),
  scheduleError: document.querySelector('#scheduleError'),
  calendarReminderButton: document.querySelector('#calendarReminderButton'),
  publishModeLabel: document.querySelector('#publishModeLabel'),
  publishHelp: document.querySelector('#publishHelp'),
  sidebar: document.querySelector('#sidebar'),
  sidebarScrim: document.querySelector('#sidebarScrim'),
  menuButton: document.querySelector('#menuButton'),
  draftNavButton: document.querySelector('#draftNavButton')
};

let state = loadState();
let currentView = 'dashboard';
let mediaFile = null;
let mediaObjectUrl = null;
let saveTimer = null;
let lastFocusedElement = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (!saved || typeof saved !== 'object') return { ...defaultState, selected: [...defaultState.selected], ready: {} };
    return {
      ...defaultState,
      ...saved,
      selected: Array.isArray(saved.selected)
        ? saved.selected.filter(id => NETWORKS.some(network => network.id === id))
        : [...defaultState.selected],
      ready: saved.ready && typeof saved.ready === 'object' ? saved.ready : {}
    };
  } catch {
    return { ...defaultState, selected: [...defaultState.selected], ready: {} };
  }
}

function persistState(immediate = false) {
  elements.saveState?.classList.add('saving');
  if (elements.saveState) elements.saveState.innerHTML = '<span></span> Saving…';
  clearTimeout(saveTimer);
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      elements.saveState?.classList.remove('saving');
      if (elements.saveState) elements.saveState.innerHTML = '<span></span> Draft saved';
    } catch {
      if (elements.saveState) elements.saveState.innerHTML = '<span></span> Could not save';
    }
  };
  if (immediate) save();
  else saveTimer = setTimeout(save, 350);
}

function initialize() {
  elements.caption.value = state.caption;
  elements.postUrl.value = state.url;
  elements.hashtags.value = state.hashtags;
  elements.scheduleDate.value = state.scheduleDate;
  elements.scheduleTime.value = state.scheduleTime || '09:00';
  elements.scheduleDate.min = toLocalDateInput(new Date());
  setDateAndGreeting();
  updateCaptionCount();
  renderNetworks();
  renderAccounts();
  renderSchedule();
  updateDashboard();
  bindEvents();
  showView('dashboard', false);
  window.setInterval(() => {
    renderSchedule();
    updateDashboard();
  }, 60000);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function bindEvents() {
  elements.caption.addEventListener('input', handleDraftInput);
  elements.postUrl.addEventListener('input', event => {
    handleDraftInput(event);
    validateUrl(false);
  });
  elements.postUrl.addEventListener('blur', () => validateUrl(false));
  elements.hashtags.addEventListener('input', handleDraftInput);

  document.querySelectorAll('[data-schedule-mode]').forEach(button => {
    button.addEventListener('click', () => {
      state.scheduleMode = button.dataset.scheduleMode;
      if (state.scheduleMode === 'later' && !state.scheduleTime) state.scheduleTime = '09:00';
      elements.scheduleTime.value = state.scheduleTime;
      renderSchedule();
      updateDashboard();
      persistState(true);
      if (state.scheduleMode === 'later') window.setTimeout(() => elements.scheduleDate.focus(), 50);
    });
  });
  elements.scheduleDate.addEventListener('change', handleScheduleInput);
  elements.scheduleTime.addEventListener('change', handleScheduleInput);
  elements.calendarReminderButton.addEventListener('click', downloadCalendarReminder);

  document.querySelectorAll('[data-view-target]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      showView(button.dataset.viewTarget);
    });
  });
  document.querySelectorAll('[data-accounts]').forEach(button => {
    button.addEventListener('click', () => openModal(elements.accountsModal));
  });

  elements.draftNavButton.addEventListener('click', () => {
    showView('composer');
    window.setTimeout(() => elements.caption.focus(), 100);
  });

  elements.menuButton.addEventListener('click', toggleMobileMenu);
  elements.sidebarScrim.addEventListener('click', closeMobileMenu);

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      showView('composer');
      window.setTimeout(() => elements.caption.focus(), 100);
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!elements.launchButton.disabled) launchPostingPages();
    }
    if (event.key === 'Escape') {
      closeTopModal();
      closeMobileMenu();
    }
  });

  elements.selectAllButton.addEventListener('click', () => {
    state.selected = state.selected.length === NETWORKS.length ? [] : NETWORKS.map(network => network.id);
    renderNetworks();
    updateDashboard();
    persistState();
  });

  elements.launchButton.addEventListener('click', launchPostingPages);
  elements.closeAccountsButton.addEventListener('click', () => closeModal(elements.accountsModal));
  elements.closeResultsButton.addEventListener('click', () => closeModal(elements.resultsModal));
  elements.accountsModal.addEventListener('click', event => {
    if (event.target === elements.accountsModal) closeModal(elements.accountsModal);
  });
  elements.resultsModal.addEventListener('click', event => {
    if (event.target === elements.resultsModal) closeModal(elements.resultsModal);
  });

  elements.copyCaptionButton.addEventListener('click', async () => {
    const copied = await copyText(buildCaption());
    toast(copied ? 'Caption copied.' : 'Could not copy automatically. Select and copy the caption manually.', !copied);
  });
  elements.copyLinkButton.addEventListener('click', async () => {
    if (!state.url.trim()) return toast('There is no link in this draft.', true);
    const copied = await copyText(state.url.trim());
    toast(copied ? 'Link copied.' : 'Could not copy the link automatically.', !copied);
  });

  elements.mediaInput.addEventListener('change', () => setMedia(elements.mediaInput.files?.[0]));
  elements.removeMedia.addEventListener('click', event => {
    event.stopPropagation();
    clearMedia();
  });
  ['dragenter', 'dragover'].forEach(type => elements.mediaZone.addEventListener(type, event => {
    event.preventDefault();
    elements.mediaZone.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach(type => elements.mediaZone.addEventListener(type, event => {
    event.preventDefault();
    elements.mediaZone.classList.remove('dragging');
  }));
  elements.mediaZone.addEventListener('drop', event => setMedia(event.dataTransfer?.files?.[0]));

  elements.clearDataButton.addEventListener('click', () => {
    if (!window.confirm('Clear the saved draft, selected networks, and ready reminders from this browser?')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}
    state = { ...defaultState, selected: [...defaultState.selected], ready: {} };
    clearMedia();
    elements.caption.value = '';
    elements.postUrl.value = '';
    elements.hashtags.value = '';
    elements.scheduleDate.value = '';
    elements.scheduleTime.value = '09:00';
    updateCaptionCount();
    renderNetworks();
    renderAccounts();
    renderSchedule();
    updateDashboard();
    persistState(true);
    toast('Local Tech Social data cleared.');
  });
}

function showView(view, scroll = true) {
  currentView = view === 'composer' ? 'composer' : 'dashboard';
  const isComposer = currentView === 'composer';
  elements.dashboardView.hidden = isComposer;
  elements.composerView.hidden = !isComposer;
  elements.headerKicker.textContent = isComposer ? 'TECH SOCIAL / CREATE POST' : 'TECH SOCIAL / OVERVIEW';
  elements.headerTitle.textContent = isComposer ? 'Create a new post' : 'Publishing dashboard';
  document.querySelectorAll('.side-nav .nav-item[data-view-target]').forEach(item => {
    item.classList.toggle('active', item.dataset.viewTarget === currentView);
  });
  closeMobileMenu();
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
  elements.sidebar.classList.toggle('open');
  elements.sidebarScrim.classList.toggle('open');
}

function closeMobileMenu() {
  elements.sidebar.classList.remove('open');
  elements.sidebarScrim.classList.remove('open');
}

function setDateAndGreeting() {
  const now = new Date();
  elements.dashboardDate.textContent = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(now).toUpperCase();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  elements.greetingText.textContent = `${greeting}, Tech Lab.`;
}

function toLocalDateInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getScheduledDate() {
  if (state.scheduleMode !== 'later' || !state.scheduleDate) return null;
  const time = state.scheduleTime || '09:00';
  const scheduled = new Date(`${state.scheduleDate}T${time}:00`);
  return Number.isNaN(scheduled.getTime()) ? null : scheduled;
}

function formatScheduledDate(date, includeYear = false) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: includeYear ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function handleScheduleInput() {
  state.scheduleDate = elements.scheduleDate.value;
  state.scheduleTime = elements.scheduleTime.value || '09:00';
  renderSchedule();
  updateDashboard();
  persistState(true);
}

function validateSchedule(showToast = false) {
  if (state.scheduleMode !== 'later') {
    elements.scheduleError.textContent = '';
    return true;
  }
  if (!state.scheduleDate) {
    elements.scheduleError.textContent = 'Choose a publishing date.';
    if (showToast) toast('Choose a publishing date first.', true);
    return false;
  }
  const scheduled = getScheduledDate();
  if (!scheduled) {
    elements.scheduleError.textContent = 'Choose a valid date and time.';
    if (showToast) toast('Choose a valid publishing date and time.', true);
    return false;
  }
  const selectedDay = toLocalDateInput(scheduled);
  const today = toLocalDateInput(new Date());
  if (selectedDay < today) {
    elements.scheduleError.textContent = 'Choose today or a future date.';
    if (showToast) toast('The publishing date cannot be before today.', true);
    return false;
  }
  elements.scheduleError.textContent = '';
  return true;
}

function renderSchedule() {
  const isLater = state.scheduleMode === 'later';
  document.querySelectorAll('[data-schedule-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.scheduleMode === state.scheduleMode);
    button.setAttribute('aria-pressed', button.dataset.scheduleMode === state.scheduleMode ? 'true' : 'false');
  });
  elements.scheduleFields.hidden = !isLater;
  elements.scheduleDate.min = toLocalDateInput(new Date());
  elements.scheduleDate.value = state.scheduleDate;
  elements.scheduleTime.value = state.scheduleTime || '09:00';
  const valid = validateSchedule(false);
  elements.calendarReminderButton.disabled = !valid;
  updateDestinationSummary();
}

function downloadCalendarReminder() {
  if (!validateSchedule(true)) return;
  const start = getScheduledDate();
  const end = new Date(start.getTime() + 30 * 60000);
  const toICS = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escapeICS = value => String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
  const description = [state.caption.trim(), state.url.trim(), 'Open Tech Social to publish and confirm the post on each selected network.']
    .filter(Boolean)
    .join('\n\n');
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tech Social//Publishing Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:tech-social-${Date.now()}@techfixlab.co.uk`,
    `DTSTAMP:${toICS(new Date())}`,
    `DTSTART:${toICS(start)}`,
    `DTEND:${toICS(end)}`,
    'SUMMARY:Publish Tech Social post',
    `DESCRIPTION:${escapeICS(description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your Tech Social post is due in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tech-social-post-${state.scheduleDate}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Calendar reminder downloaded. Open it to add the reminder to your calendar.');
}

function handleDraftInput() {
  state.caption = elements.caption.value;
  state.url = elements.postUrl.value;
  state.hashtags = elements.hashtags.value;
  updateCaptionCount();
  updateDashboard();
  persistState();
}

function updateCaptionCount() {
  const count = elements.caption.value.length;
  elements.captionCount.textContent = `${count.toLocaleString()} ${count === 1 ? 'character' : 'characters'}`;
}

function updateDashboard() {
  const readyCount = NETWORKS.filter(network => state.ready[network.id]).length;
  const selectedCount = state.selected.length;
  const caption = state.caption.trim();
  const totalDetails = [caption, state.url.trim(), normalizeHashtags(state.hashtags)].filter(Boolean).length;
  const scheduled = getScheduledDate();
  const scheduleIsDue = scheduled && scheduled.getTime() <= Date.now();
  const scheduleLabel = scheduled ? formatScheduledDate(scheduled) : 'No date selected';

  elements.dashboardScheduleState.classList.toggle('planned', Boolean(scheduled) && !scheduleIsDue);
  elements.dashboardScheduleState.classList.toggle('due', Boolean(scheduleIsDue));
  elements.dashboardScheduleState.innerHTML = `<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5Z"/><path d="M5 9h14M9 2v5M15 2v5"/></svg> ${scheduleIsDue ? 'Due now' : scheduled ? scheduleLabel : 'No date selected'}`;

  elements.headerReadyText.textContent = readyCount ? `${readyCount} of 6 accounts ready` : 'No accounts ready';
  elements.sidebarReadyCount.textContent = readyCount;
  elements.connectedStat.innerHTML = `${readyCount} <em>/ 6</em>`;
  elements.connectedStatNote.textContent = readyCount === 6 ? 'Every channel is marked ready' : readyCount ? `${6 - readyCount} still need setup` : 'Connect your first channel';
  elements.selectedStat.innerHTML = `${selectedCount} <em>selected</em>`;
  elements.heroSelectedCount.textContent = String(selectedCount).padStart(2, '0');

  if (totalDetails) {
    const wordCount = caption ? caption.split(/\s+/).filter(Boolean).length : 0;
    elements.draftStatus.textContent = scheduleIsDue ? 'Due now' : scheduled ? 'Planned' : 'In progress';
    elements.draftStatNote.textContent = scheduled ? scheduleLabel : caption ? `${wordCount} ${wordCount === 1 ? 'word' : 'words'} in your caption` : 'Link or hashtags added';
    elements.draftPreview.textContent = caption || 'A draft has been started. Add a caption to bring it to life.';
    elements.draftMeta.textContent = `${elements.caption.value.length} characters • ${state.url.trim() ? 'Link added' : 'No link yet'} • ${scheduled ? `Planned ${scheduleLabel}` : 'Unscheduled'}`;
  } else {
    elements.draftStatus.textContent = scheduleIsDue ? 'Due now' : scheduled ? 'Planned' : 'Empty';
    elements.draftStatNote.textContent = scheduled ? scheduleLabel : 'Start something worth sharing';
    elements.draftPreview.textContent = scheduled ? 'A posting time is reserved. Add your caption and media before it is due.' : 'Your next post will appear here as you write it.';
    elements.draftMeta.textContent = scheduled ? `Planned ${scheduleLabel}` : 'No content yet';
  }

  elements.dashboardChannelList.innerHTML = '';
  NETWORKS.forEach(network => {
    const card = document.createElement('div');
    card.className = 'dashboard-channel';
    card.innerHTML = `<i class="${state.ready[network.id] ? 'ready' : ''}"></i><span class="network-badge" style="background:${network.color}">${network.badge}</span><strong>${network.name}</strong>`;
    elements.dashboardChannelList.appendChild(card);
  });
}

function renderNetworks() {
  elements.networkList.innerHTML = '';
  NETWORKS.forEach(network => {
    const fragment = elements.networkTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.network-row');
    const checkbox = fragment.querySelector('input');
    const badge = fragment.querySelector('.network-badge');
    const name = fragment.querySelector('.network-copy strong');
    const description = fragment.querySelector('.network-copy small');
    const readyDot = fragment.querySelector('.ready-dot');

    checkbox.checked = state.selected.includes(network.id);
    checkbox.setAttribute('aria-label', `Post to ${network.name}`);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.selected = [...new Set([...state.selected, network.id])];
      else state.selected = state.selected.filter(id => id !== network.id);
      updateDestinationSummary();
      updateDashboard();
      persistState();
    });

    row.style.setProperty('--network-color', network.color);
    badge.textContent = network.badge;
    name.textContent = network.name;
    description.textContent = network.description;
    readyDot.classList.toggle('ready', Boolean(state.ready[network.id]));
    readyDot.title = state.ready[network.id] ? 'Marked ready in this browser' : 'Setup reminder not marked ready';
    elements.networkList.appendChild(fragment);
  });
  updateDestinationSummary();
}

function updateDestinationSummary() {
  const count = state.selected.length;
  const isLater = state.scheduleMode === 'later';
  const scheduled = getScheduledDate();
  const isFuture = scheduled && scheduled.getTime() > Date.now();
  const needsDate = isLater && !scheduled;

  elements.selectedSummary.textContent = `${count} ${count === 1 ? 'network' : 'networks'}`;
  elements.launchButton.disabled = count === 0 || needsDate;
  elements.publishModeLabel.textContent = isFuture ? 'PLANNED POST' : scheduled ? 'SCHEDULE DUE' : 'READY TO OPEN';

  if (!count) {
    elements.launchButton.querySelector('span').textContent = 'Choose a destination';
  } else if (needsDate) {
    elements.launchButton.querySelector('span').textContent = 'Choose a publishing date';
  } else if (isFuture) {
    elements.launchButton.querySelector('span').textContent = 'Save posting plan';
  } else {
    elements.launchButton.querySelector('span').textContent = `Open ${count} posting ${count === 1 ? 'page' : 'pages'}`;
  }

  elements.publishHelp.textContent = isFuture
    ? `Planned for ${formatScheduledDate(scheduled, true)}. Add the calendar reminder so you know when to return.`
    : scheduled
      ? 'The planned time has arrived. Open the official posting pages to review and publish.'
      : 'Allow pop-ups. Your caption will be copied and each official posting page will open.';

  elements.selectAllButton.textContent = count === NETWORKS.length ? 'Clear all' : 'Select all';
  elements.networkList.querySelectorAll('.network-row').forEach((row, index) => {
    row.querySelector('input').checked = state.selected.includes(NETWORKS[index].id);
  });
}

function renderAccounts() {
  elements.accountList.innerHTML = '';
  NETWORKS.forEach(network => {
    const row = document.createElement('div');
    row.className = 'account-row';
    row.innerHTML = `
      <span class="network-badge" style="background:${network.color}">${network.badge}</span>
      <span class="account-copy"><strong>${network.name}</strong><small>${state.ready[network.id] ? 'Marked ready on this device' : 'Sign in on the official website'}</small></span>
      <span class="account-actions">
        <a class="button" href="${network.loginUrl}" target="_blank" rel="noopener noreferrer">Open sign-in</a>
        <button class="button ready-button ${state.ready[network.id] ? 'is-ready' : ''}" type="button">${state.ready[network.id] ? 'Ready ✓' : 'Mark ready'}</button>
      </span>`;
    row.querySelector('.ready-button').addEventListener('click', () => {
      state.ready[network.id] = !state.ready[network.id];
      persistState(true);
      renderAccounts();
      renderNetworks();
      updateDashboard();
      toast(state.ready[network.id] ? `${network.name} marked ready.` : `${network.name} ready reminder removed.`);
    });
    elements.accountList.appendChild(row);
  });
  updateDashboard();
}

function normalizeHashtags(value) {
  return value
    .split(/[\s,]+/)
    .map(tag => tag.trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, ''))
    .filter(Boolean)
    .map(tag => `#${tag}`)
    .join(' ');
}

function buildCaption() {
  const tags = normalizeHashtags(state.hashtags);
  return [state.caption.trim(), tags].filter(Boolean).join(state.caption.trim() && tags ? '\n\n' : '');
}

function validateUrl(showToast = false) {
  const value = elements.postUrl.value.trim();
  if (!value) {
    elements.urlError.textContent = '';
    return true;
  }
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
    elements.urlError.textContent = '';
    return true;
  } catch {
    elements.urlError.textContent = 'Enter a full link beginning with http:// or https://';
    if (showToast) toast('Please fix the link before opening posting pages.', true);
    return false;
  }
}

async function launchPostingPages() {
  state.caption = elements.caption.value;
  state.url = elements.postUrl.value.trim();
  state.hashtags = elements.hashtags.value;
  if (!validateUrl(true) || !validateSchedule(true)) return;

  const selectedNetworks = NETWORKS.filter(network => state.selected.includes(network.id));
  if (!selectedNetworks.length) return;

  const scheduled = getScheduledDate();
  if (scheduled && scheduled.getTime() > Date.now()) {
    persistState(true);
    updateDashboard();
    renderSchedule();
    toast(`Posting plan saved for ${formatScheduledDate(scheduled, true)}.`);
    showView('dashboard');
    return;
  }

  persistState(true);
  updateDashboard();
  const caption = buildCaption();
  const payload = { caption, url: state.url, hasMedia: Boolean(mediaFile) };
  const copyPromise = caption ? copyText(caption) : Promise.resolve(false);
  const results = [];

  selectedNetworks.forEach(network => {
    const url = network.composerUrl(payload);
    let opened = false;
    try {
      const tab = window.open('about:blank', '_blank');
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
        opened = true;
      }
    } catch {
      opened = false;
    }
    results.push({ network, url, opened });
  });

  const copied = await copyPromise;
  renderResults(results, copied, Boolean(caption));
  openModal(elements.resultsModal);
}

function renderResults(results, copied, hasCaption) {
  const openedCount = results.filter(result => result.opened).length;
  const blockedCount = results.length - openedCount;
  elements.resultsIntro.textContent = `${openedCount} of ${results.length} posting pages opened. ${hasCaption && copied ? 'Your caption is copied and ready to paste.' : hasCaption ? 'Use “Copy caption again” before pasting.' : 'Your draft has no caption to copy.'}${blockedCount ? ` ${blockedCount} ${blockedCount === 1 ? 'tab was' : 'tabs were'} blocked; use the button beside it.` : ''}`;

  elements.resultList.innerHTML = '';
  results.forEach(({ network, url, opened }) => {
    const row = document.createElement('div');
    row.className = 'result-row';
    row.innerHTML = `
      <span class="network-badge" style="background:${network.color}">${network.badge}</span>
      <span class="result-copy"><strong>${network.name}</strong><small class="${opened ? '' : 'blocked'}">${opened ? network.prefill : 'Pop-up blocked — open this page manually'}</small></span>
      <a class="button ${opened ? 'button-outline' : 'button-soft'}" href="${url}" target="_blank" rel="noopener noreferrer">${opened ? 'Open again' : 'Open page'}</a>`;
    elements.resultList.appendChild(row);
  });
  elements.copyCaptionButton.disabled = !hasCaption;
  elements.copyLinkButton.disabled = !state.url;
}

function setMedia(file) {
  if (!file) return;
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) return toast('Choose an image or video file.', true);

  clearMedia(false);
  mediaFile = file;
  mediaObjectUrl = URL.createObjectURL(file);
  elements.mediaEmpty.hidden = true;
  elements.mediaPreview.hidden = false;
  elements.mediaName.textContent = file.name;
  elements.mediaSize.textContent = `${formatBytes(file.size)} • ${isVideo ? 'Video' : 'Image'} • kept only for this session`;
  elements.previewThumb.innerHTML = isImage
    ? `<img src="${mediaObjectUrl}" alt="Selected media preview" />`
    : `<video src="${mediaObjectUrl}" muted aria-label="Selected video preview"></video>`;
}

function clearMedia(resetInput = true) {
  if (mediaObjectUrl) URL.revokeObjectURL(mediaObjectUrl);
  mediaObjectUrl = null;
  mediaFile = null;
  elements.mediaPreview.hidden = true;
  elements.mediaEmpty.hidden = false;
  elements.previewThumb.innerHTML = '';
  if (resetInput) elements.mediaInput.value = '';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    let successful = false;
    try { successful = document.execCommand('copy'); } catch {}
    helper.remove();
    return successful;
  }
}

function openModal(modal) {
  lastFocusedElement = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  window.setTimeout(() => modal.querySelector('button, a')?.focus(), 0);
}

function closeModal(modal) {
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = '';
  lastFocusedElement?.focus?.();
}

function closeTopModal() {
  if (!elements.resultsModal.hidden) closeModal(elements.resultsModal);
  else if (!elements.accountsModal.hidden) closeModal(elements.accountsModal);
}

function toast(message, warning = false) {
  const node = document.createElement('div');
  node.className = `toast${warning ? ' warning' : ''}`;
  node.textContent = message;
  elements.toastRegion.appendChild(node);
  window.setTimeout(() => node.remove(), 3600);
}

initialize();
