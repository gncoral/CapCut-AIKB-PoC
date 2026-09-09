// Public browsing only. Owner feedback UI, storage and APIs are not part of this bundle.
const $ = selector => document.querySelector(selector);
const state = { data: null, category: 'model-launch-background', source: 'all', search: '' };
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function link(text, url) {
  const a = el('a', '', text);
  if (/^https:\/\//.test(url || '')) a.href = url;
  a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}
function picture(src, title, eager = false) {
  const img = el('img'); img.src = src; img.alt = title; img.loading = eager ? 'eager' : 'lazy'; img.decoding = 'async';
  img.addEventListener('error', () => img.replaceWith(el('span', 'inspo-image-error', '预览暂不可用，请打开来源查看')), { once: true });
  return img;
}
function category() { return state.data.categories.find(c => c.id === state.category); }
function currentItems() { return state.data.items.filter(i => i.category === state.category); }

function renderCategories() {
  $('#inspo-categories').replaceChildren(...state.data.categories.map(c => {
    const b = el('button', c.id === state.category ? 'active' : ''); b.type = 'button'; b.setAttribute('aria-pressed', String(c.id === state.category)); b.dataset.inspoCategory = c.id;
    b.append(document.createTextNode(c.name), el('span', '', state.data.items.filter(i => i.category === c.id).length));
    b.addEventListener('click', () => { state.category = c.id; state.source = 'all'; state.search = ''; $('#inspo-source').value = 'all'; $('#inspo-search').value = ''; render(); });
    return b;
  }));
  $('#inspo-focus').textContent = category().focus;
  $('#inspo-seed-stack').replaceChildren(...category().samples.slice(0, 3).map(s => picture(s.src, s.title, true)));
  $('#inspo-show-seeds > span:last-child').textContent = `${category().samples.length} 张精选样本 ↗`;
  $('#inspo-total-count').textContent = state.data.items.length;
}

function card(item) {
  const article = el('article', 'inspo-card'); article.dataset.candidateId = item.id;
  const open = el('button', 'inspo-card-image'); open.type = 'button'; open.setAttribute('aria-label', `查看候选：${item.title}`);
  open.append(picture(item.src, item.title, true), el('span', 'inspo-image-hint', '查看参考点 ↗')); open.addEventListener('click', () => openCandidate(item));
  const body = el('div', 'inspo-card-body'); const meta = el('div', 'inspo-card-meta'); meta.append(link(`${item.source} ↗`, item.sourceUrl));
  const tags = el('div', 'inspo-card-tags'); item.tags.forEach(t => tags.append(el('span', '', t)));
  const actions = el('div', 'inspo-card-actions'); const why = el('button', '', '参考详情 ↗'); why.type = 'button'; why.addEventListener('click', () => openCandidate(item)); actions.append(why);
  body.append(meta, el('h3', '', item.title), el('p', '', item.reason), tags, actions); article.append(open, body); return article;
}
function render() {
  if (!state.data) return;
  renderCategories();
  const items = currentItems().filter(i => (state.source === 'all' || i.source === state.source) && (!state.search || [i.title, i.reason, ...i.tags].join(' ').toLowerCase().includes(state.search.toLowerCase())));
  $('#inspo-grid').dataset.inspoGridCategory = state.category;
  $('#inspo-grid').replaceChildren(...items.map(card));
  $('#inspo-result').textContent = `${category().name} · ${items.length} 张参考`;
  $('#inspo-empty').hidden = items.length > 0;
  $('#inspo-empty-title').textContent = '暂无符合条件的参考';
  $('#inspo-empty-description').textContent = '试试其他来源或关键词。';
}
const modal = el('dialog', 'inspo-dialog'); modal.id = 'inspo-dialog'; document.body.append(modal);
let modalOrigin = null;
function closeModal() { modal.close(); }
modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
modal.addEventListener('close', () => { const target = modalOrigin?.isConnected ? modalOrigin : document.querySelector(`.inspo-card[data-candidate-id="${modal.dataset.itemId || ''}"] .inspo-card-image`) || $('#inspo-show-seeds'); target?.focus(); });
function modalContent(content, compact = false) {
  modal.classList.toggle('inspo-dialog-compact', compact);
  const close = el('button', 'inspo-dialog-close', '×'); close.type = 'button'; close.setAttribute('aria-label', '关闭详情'); close.addEventListener('click', closeModal);
  modal.replaceChildren(close, content);
  if (!modal.open) { modalOrigin = document.activeElement; modal.showModal(); }
}
function openCandidate(item) {
  modal.dataset.itemId = item.id;
  const layout = el('div', 'inspo-detail'); const visual = el('div', 'inspo-detail-media'); visual.append(picture(item.src, item.title, true));
  const panel = el('div', 'inspo-detail-panel inspo-prompt-panel');
  const heading = el('h2', '', 'AI 提示词'); heading.id = 'inspo-detail-title'; modal.setAttribute('aria-labelledby', heading.id);
  const prompt = el('p', 'inspo-prompt-text', item.prompt);
  const copy = el('button', 'inspo-copy-prompt', '复制提示词'); copy.type = 'button';
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(item.prompt); copy.textContent = '已复制'; }
    catch { copy.textContent = '请长按提示词复制'; }
  });
  const source = link(`${item.source} 原图来源 ↗`, item.sourceUrl); source.className = 'inspo-prompt-source';
  panel.append(heading, prompt, copy, source);
  layout.append(visual, panel); modalContent(layout);
}
function openSeeds() {
  const wrap = el('div'); const header = el('header', 'inspo-seeds-header'); const heading = el('h2', '', `${category().name} · 精选样本`); heading.id = 'inspo-seeds-title'; modal.setAttribute('aria-labelledby', heading.id); delete modal.dataset.itemId;
  header.append(el('span', 'inspo-eyebrow', 'THE STARTING POINT'), heading, el('p', '', `${category().focus} 点击图片可回到 Figma 源节点。`), link('打开本类 Figma 页面 ↗', category().figmaUrl));
  const grid = el('div', 'inspo-seeds-grid'); category().samples.forEach(s => { const a = link('', s.url); a.append(picture(s.src, s.title), el('span', '', s.title)); grid.append(a); });
  wrap.append(header, grid); modalContent(wrap);
}


$('#inspo-source').addEventListener('change', e => { state.source = e.target.value; render(); });
$('#inspo-search').addEventListener('input', e => { state.search = e.target.value.trim(); render(); });
$('#inspo-show-seeds').addEventListener('click', () => { if (state.data) openSeeds(); });
$('#inspo-reset').addEventListener('click', () => { state.source = 'all'; state.search = ''; $('#inspo-search').value = ''; $('#inspo-source').value = 'all'; if (state.data) render(); else location.reload(); });
try {
  const response = await fetch('data/inspiration.json', { cache: 'no-cache' }); if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json(); if (!Array.isArray(data.categories) || !Array.isArray(data.items)) throw new Error('数据格式不正确');
  state.data = data;
  const requestedSource = new URLSearchParams(location.search).get('inspirationSource');
  if (data.items.some(i => i.source === requestedSource)) {
    state.source = requestedSource; $('#inspo-source').value = requestedSource;
  }
  render();
} catch (error) {
  $('#inspo-result').textContent = '参考读取失败'; $('#inspo-empty').hidden = false; $('#inspo-empty-title').textContent = '暂时无法读取灵感参考'; $('#inspo-empty-description').textContent = '请刷新后重试。'; console.error(error);
}
