const CATEGORY_MODEL_LAUNCH = 'model-launch-background';

const state = {
  images: [],
  category: 'all',
  search: '',
};

const gallery = document.querySelector('#gallery');
const empty = document.querySelector('#empty');
const resultCount = document.querySelector('#result-count');
const syncState = document.querySelector('#sync-state');
const totalCount = document.querySelector('#total-count');
const modelLaunchCount = document.querySelector('#model-launch-count');
const searchInput = document.querySelector('#search');
const dialog = document.querySelector('#preview-dialog');

document.querySelector('.tabs').addEventListener('click', event => {
  const tab = event.target.closest('[data-view]');
  if (!tab) return;

  document.querySelectorAll('.tab[data-view]').forEach(button => {
    button.classList.toggle('active', button === tab);
  });
  document.querySelectorAll('.view').forEach(view => {
    view.hidden = view.id !== `${tab.dataset.view}-view`;
  });
});

function safeText(value) {
  return String(value ?? '');
}

function sourceLabel(image) {
  if (image.source === 'figma') return 'Figma · 模型上新背景';
  return image.source || image.platform || '参考素材';
}

function matches(image) {
  if (state.category !== 'all' && image.category !== state.category) return false;
  if (!state.search) return true;
  const haystack = [image.title, image.source, image.category, ...(image.tags || [])]
    .map(safeText)
    .join(' ')
    .toLowerCase();
  return haystack.includes(state.search.toLowerCase());
}

function openPreview(image) {
  document.querySelector('#preview-image').src = image.src;
  document.querySelector('#preview-image').alt = image.title || '图片预览';
  document.querySelector('#preview-title').textContent = image.title || '未命名';
  const link = document.querySelector('#preview-link');
  link.href = image.url || image.figmaUrl || image.src;
  dialog.showModal();
}

function makeCard(image) {
  const card = document.createElement('article');
  card.className = 'card';
  card.tabIndex = 0;
  card.setAttribute('aria-label', `预览 ${image.title || '图片'}`);

  const img = document.createElement('img');
  img.className = 'card-media';
  img.src = image.src;
  img.alt = image.title || '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer-when-downgrade';

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = image.title || '未命名';

  const source = document.createElement('div');
  source.className = 'card-source';
  source.textContent = sourceLabel(image);

  meta.append(title, source);
  card.append(img, meta);

  if (image.source === 'figma') {
    const badge = document.createElement('span');
    badge.className = 'figma-badge';
    badge.textContent = 'Figma 已同步';
    card.append(badge);
  }

  card.addEventListener('click', () => openPreview(image));
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPreview(image);
    }
  });

  return card;
}

function render() {
  const filtered = state.images.filter(matches);
  gallery.replaceChildren(...filtered.map(makeCard));
  empty.hidden = filtered.length !== 0;
  resultCount.textContent = `${filtered.length} 张图片`;
  totalCount.textContent = state.images.length;
  modelLaunchCount.textContent = state.images.filter(image => image.category === CATEGORY_MODEL_LAUNCH).length;
}

document.querySelector('#category-chips').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(chip => {
    chip.classList.toggle('active', chip === button);
  });
  render();
});

searchInput.addEventListener('input', () => {
  state.search = searchInput.value.trim();
  render();
});

document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});

async function load() {
  try {
    const response = await fetch(`data/images.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('images.json 必须是数组');
    state.images = data;
    const figmaCount = data.filter(image => image.source === 'figma').length;
    syncState.textContent = figmaCount
      ? `已同步 ${figmaCount} 张 Figma 图片`
      : '等待首次 Figma 同步';
    render();
  } catch (error) {
    syncState.textContent = '图库读取失败';
    empty.hidden = false;
    empty.querySelector('h2').textContent = '无法读取图库';
    empty.querySelector('p').textContent = error.message;
  }
}

await load();
