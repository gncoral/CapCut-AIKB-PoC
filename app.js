const CATEGORY_MODEL_LAUNCH = 'model-launch-background';
const CATEGORY_CHARACTER = 'character-library';

const state = {
  images: [],
  characters: [],
  category: 'all',
  style: 'all',
  search: '',
};

const gallery = document.querySelector('#gallery');
const empty = document.querySelector('#empty');
const resultCount = document.querySelector('#result-count');
const syncState = document.querySelector('#sync-state');
const totalCount = document.querySelector('#total-count');
const modelLaunchCount = document.querySelector('#model-launch-count');
const characterCount = document.querySelector('#character-count');
const searchInput = document.querySelector('#search');
const dialog = document.querySelector('#preview-dialog');
const styleFilter = document.querySelector('#style-filter');
const characterDialog = document.querySelector('#character-dialog');
const characterViewsCanvas = document.querySelector('#character-views-canvas');
const characterDetailsCanvas = document.querySelector('#character-details-canvas');
const characterDetailCode = document.querySelector('#character-detail-code');
const characterDetailName = document.querySelector('#character-detail-name');
const characterDetailPrompt = document.querySelector('#character-detail-prompt');
const characterDetailSource = document.querySelector('#character-detail-source');
const copyCharacterPrompt = document.querySelector('#copy-character-prompt');
const copyCharacterViews = document.querySelector('#copy-character-views');
const copyCharacterDetails = document.querySelector('#copy-character-details');
const backgroundStyles = ['柔焦色场', '抽象扩散', '极简3D'];

const brandFamilies = {
  'jianying-capcut': ['剪映', 'CapCut'],
  'jimeng-dreamina': ['即梦', 'Dreamina'],
  'xingtu-hypic': ['醒图', 'Hypic'],
  'xioyunqiao-pippit': ['小云雀', 'Pippit'],
};

const brandGuides = {
  '剪映': {
    image: 'assets/brand-guidelines/jianying/overview.png',
    sourceUrl: 'https://www.figma.com/design/ehZBGGERFm9wim6KUmM5B6/%E5%89%AA%E6%98%A0%E8%AE%BE%E8%AE%A1%E8%AF%AD%E8%A8%80-%E6%9B%B4%E6%96%B0?node-id=467-146331&t=E0AuhsftD5fHGOwp-1',
  },
  'CapCut': {
    image: 'assets/brand-guidelines/capcut/overview.png',
    sourceUrl: 'https://www.figma.com/design/iEv05yI0ie9tvrxs6pUbCv/UG%E8%A7%86%E8%A7%89%E8%B5%84%E4%BA%A7%E5%BA%93---%E5%89%AA%E6%98%A0-CapCut?node-id=210-76&t=bUQWPyKBxm9y7aEE-1',
  },
};

const brandSubnav = document.querySelector('#brand-subnav');
const selectedBrandName = document.querySelector('#selected-brand-name');
const brandContentTitle = document.querySelector('#brand-content-title');
const brandSourceLink = document.querySelector('#brand-source-link');
const brandSourcePending = document.querySelector('#brand-source-pending');
const brandGuideImage = document.querySelector('#brand-guide-image');
const brandContentEmpty = document.querySelector('#brand-content-empty');

function renderBrandGuide(name) {
  const guide = brandGuides[name];
  selectedBrandName.textContent = name;
  brandContentTitle.textContent = `${name}品牌规范`;
  brandSourceLink.hidden = !guide?.sourceUrl;
  brandSourcePending.hidden = Boolean(guide?.sourceUrl);
  brandGuideImage.hidden = !guide?.image;
  brandContentEmpty.hidden = Boolean(guide?.image);

  if (guide?.sourceUrl) brandSourceLink.href = guide.sourceUrl;
  if (guide?.image) {
    brandGuideImage.src = `${guide.image}?t=${Date.now()}`;
    brandGuideImage.alt = `${name}品牌规范速览`;
  } else {
    brandGuideImage.removeAttribute('src');
    brandGuideImage.alt = '';
  }
}

function selectBrand(name, button) {
  renderBrandGuide(name);
  brandSubnav.querySelectorAll('.brand-option').forEach(option => {
    option.classList.toggle('active', option === button);
  });
}

function renderBrandOptions(family) {
  const names = brandFamilies[family] || [];
  brandSubnav.replaceChildren(...names.map((name, index) => {
    const button = document.createElement('button');
    button.className = `brand-option${index === 0 ? ' active' : ''}`;
    button.type = 'button';
    button.textContent = name;
    button.addEventListener('click', () => selectBrand(name, button));
    return button;
  }));
  renderBrandGuide(names[0] || '');
}

document.querySelector('.brand-family-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-brand-family]');
  if (!button) return;
  document.querySelectorAll('.brand-family').forEach(option => {
    option.classList.toggle('active', option === button);
  });
  renderBrandOptions(button.dataset.brandFamily);
});

renderBrandOptions('jianying-capcut');

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
  if (state.style !== 'all' && image.style !== state.style && !(image.tags || []).includes(state.style)) return false;
  if (!state.search) return true;
  const haystack = [image.title, image.source, image.category, ...(image.tags || [])]
    .map(safeText)
    .join(' ')
    .toLowerCase();
  return haystack.includes(state.search.toLowerCase());
}

function matchesCharacter(character) {
  if (state.category !== 'all' && state.category !== CATEGORY_CHARACTER) return false;
  if (!state.search) return true;
  const haystack = [character.code, character.alias, character.prompt, ...(character.tags || [])]
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

  const backgroundStyle = image.style || backgroundStyles.find(style => (image.tags || []).includes(style));
  if (backgroundStyle) {
    const styleBadge = document.createElement('span');
    styleBadge.className = 'style-badge';
    styleBadge.textContent = backgroundStyle === '极简3D' ? '极简 3D' : backgroundStyle;
    card.append(styleBadge);
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

function drawCharacterCrop(canvas, src, crop) {
  const image = new Image();
  image.onload = () => {
    const safeCrop = crop || { x: 0, y: 0, width: 1, height: 1 };
    const sx = Math.round(safeCrop.x * image.naturalWidth);
    const sy = Math.round(safeCrop.y * image.naturalHeight);
    const sw = Math.max(1, Math.round(safeCrop.width * image.naturalWidth));
    const sh = Math.max(1, Math.round(safeCrop.height * image.naturalHeight));
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  };
  image.src = src;
}

function openCharacter(character) {
  drawCharacterCrop(characterViewsCanvas, character.viewsSrc || character.src, character.viewsCrop);
  drawCharacterCrop(characterDetailsCanvas, character.detailsSrc || character.src, character.detailsCrop);
  characterDetailCode.textContent = character.code;
  characterDetailName.textContent = character.alias;
  characterDetailPrompt.textContent = character.prompt || '这个人物还没有填写 Prompt。';
  characterDetailSource.href = character.url || character.src;
  copyCharacterPrompt.dataset.prompt = character.prompt || '';
  copyCharacterPrompt.textContent = '复制 Prompt';
  copyCharacterViews.textContent = '复制三视图';
  copyCharacterDetails.textContent = '复制细节图';
  copyCharacterPrompt.disabled = !character.prompt;
  characterDialog.showModal();
}

function makeCharacterCard(character) {
  const card = document.createElement('article');
  card.className = 'card character-card';
  card.tabIndex = 0;
  card.setAttribute('aria-label', `查看 ${character.code} ${character.alias}`);

  const cover = document.createElement('div');
  cover.className = 'character-cover';
  const image = document.createElement('img');
  image.src = character.thumbnailSrc || character.viewsSrc || character.src;
  image.alt = `${character.code} ${character.alias}`;
  image.loading = 'lazy';
  image.decoding = 'async';
  cover.append(image);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const title = document.createElement('div');
  title.className = 'character-card-title';
  const code = document.createElement('span');
  code.className = 'character-code';
  code.textContent = character.code;
  const alias = document.createElement('span');
  alias.className = 'character-alias';
  alias.textContent = character.alias;
  title.append(code, alias);

  const tags = document.createElement('div');
  tags.className = 'character-tags';
  ['三视图', '细节图', 'Prompt'].forEach(label => {
    const tag = document.createElement('span');
    tag.textContent = label;
    tags.append(tag);
  });

  const prompt = document.createElement('p');
  prompt.className = 'character-card-prompt';
  const promptLabel = document.createElement('strong');
  promptLabel.textContent = 'Prompt：';
  const promptText = document.createElement('span');
  promptText.textContent = character.prompt || '暂未填写';
  prompt.append(promptLabel, promptText);

  const copyPrompt = document.createElement('button');
  copyPrompt.className = 'character-card-copy';
  copyPrompt.type = 'button';
  copyPrompt.title = '复制完整 Prompt';
  copyPrompt.setAttribute('aria-label', `复制 ${character.code} 的 Prompt`);
  copyPrompt.disabled = !character.prompt;
  copyPrompt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="10" height="10" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>';
  copyPrompt.addEventListener('click', async event => {
    event.stopPropagation();
    if (!character.prompt) return;
    try {
      await navigator.clipboard.writeText(character.prompt);
      copyPrompt.classList.add('copied');
      copyPrompt.title = '已复制';
      copyPrompt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"></path></svg>';
      window.setTimeout(() => {
        copyPrompt.classList.remove('copied');
        copyPrompt.title = '复制完整 Prompt';
        copyPrompt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="10" height="10" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>';
      }, 1600);
    } catch {
      copyPrompt.title = '复制失败，请点开人物详情复制';
    }
  });

  meta.append(title, tags, prompt, copyPrompt);
  card.append(cover, meta);

  card.addEventListener('click', () => openCharacter(character));
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openCharacter(character);
    }
  });
  return card;
}

function render() {
  const filteredImages = state.category === CATEGORY_CHARACTER ? [] : state.images.filter(matches);
  const filteredCharacters = state.characters.filter(matchesCharacter);
  const cards = [
    ...filteredImages.map(makeCard),
    ...filteredCharacters.map(makeCharacterCard),
  ];
  gallery.classList.toggle('character-gallery', state.category === CATEGORY_CHARACTER);
  gallery.replaceChildren(...cards);
  empty.hidden = cards.length !== 0;
  resultCount.textContent = state.category === CATEGORY_CHARACTER
    ? `${filteredCharacters.length} 个人物`
    : `${cards.length} 项素材`;
  totalCount.textContent = state.images.length + state.characters.length;
  modelLaunchCount.textContent = state.images.filter(image => image.category === CATEGORY_MODEL_LAUNCH).length;
  characterCount.textContent = state.characters.length;
}

document.querySelector('#category-chips').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  styleFilter.hidden = state.category !== CATEGORY_MODEL_LAUNCH;
  if (styleFilter.hidden) {
    state.style = 'all';
    document.querySelectorAll('[data-style]').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.style === 'all');
    });
  }
  document.querySelectorAll('[data-category]').forEach(chip => {
    chip.classList.toggle('active', chip === button);
  });
  render();
});

styleFilter.addEventListener('click', event => {
  const button = event.target.closest('[data-style]');
  if (!button) return;
  state.style = button.dataset.style;
  document.querySelectorAll('[data-style]').forEach(chip => {
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

document.querySelector('#character-dialog-close').addEventListener('click', () => characterDialog.close());
characterDialog.addEventListener('click', event => {
  if (event.target === characterDialog) characterDialog.close();
});

copyCharacterPrompt.addEventListener('click', async () => {
  const prompt = copyCharacterPrompt.dataset.prompt || '';
  if (!prompt) return;
  try {
    await navigator.clipboard.writeText(prompt);
    copyCharacterPrompt.textContent = '已复制';
    window.setTimeout(() => { copyCharacterPrompt.textContent = '复制 Prompt'; }, 1600);
  } catch {
    copyCharacterPrompt.textContent = '复制失败，请手动选择';
  }
});

async function copyCanvasImage(canvas, button, successLabel) {
  try {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片生成失败')), 'image/png');
    });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    button.textContent = successLabel;
    window.setTimeout(() => {
      button.textContent = button === copyCharacterViews ? '复制三视图' : '复制细节图';
    }, 1600);
  } catch {
    button.textContent = '复制失败';
  }
}

copyCharacterViews.addEventListener('click', () => copyCanvasImage(characterViewsCanvas, copyCharacterViews, '三视图已复制'));
copyCharacterDetails.addEventListener('click', () => copyCanvasImage(characterDetailsCanvas, copyCharacterDetails, '细节图已复制'));

async function load() {
  try {
    const [imageResponse, characterResponse] = await Promise.all([
      fetch(`data/images.json?t=${Date.now()}`),
      fetch(`data/characters.json?t=${Date.now()}`),
    ]);
    if (!imageResponse.ok) throw new Error(`图片库读取失败 HTTP ${imageResponse.status}`);
    const images = await imageResponse.json();
    const characters = characterResponse.ok ? await characterResponse.json() : [];
    if (!Array.isArray(images) || !Array.isArray(characters)) throw new Error('图库数据格式错误');
    state.images = images;
    state.characters = characters;
    const figmaCount = images.filter(image => image.source === 'figma').length;
    syncState.textContent = figmaCount || characters.length
      ? `已同步 ${figmaCount} 张图片 · ${characters.length} 个人物`
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
