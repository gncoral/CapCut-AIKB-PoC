import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadLocalEnv } from './env.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
loadLocalEnv(projectRoot);

const fileKey = process.env.FIGMA_FILE_KEY || 'HjEFKtMBDJm6Eessye8GjP';
const targetNodeId = process.env.FIGMA_TARGET_NODE_ID || '0:1';
const dataPath = path.join(projectRoot, 'data', 'images.json');
const assetDir = path.join(projectRoot, 'assets', 'model-launch-backgrounds');
const thumbnailDir = path.join(projectRoot, 'assets', 'model-launch-thumbnails');
const brandGuideDir = path.join(projectRoot, 'assets', 'brand-guidelines');
const characterDataPath = path.join(projectRoot, 'data', 'characters.json');
const characterAssetDir = path.join(projectRoot, 'assets', 'characters');
const characterThumbnailDir = path.join(projectRoot, 'assets', 'character-thumbnails');
const syncStatePath = path.join(projectRoot, 'data', 'sync-state.json');
const allowedTypes = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP', 'RECTANGLE', 'SLICE']);
const backgroundStyleNames = ['柔焦色场', '抽象扩散', '极简3D'];
const characterThumbnailScale = 0.35;
const characterAliases = {
  CH001: '冷灰利落',
  CH002: '橄榄学院',
  CH003: '蓝衫街头',
  CH004: '黑红运动',
  CH005: '灰调松弛',
};

function figmaHeaders() {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token || token === 'replace_me') {
    throw new Error('缺少 FIGMA_ACCESS_TOKEN。请在 .env.local 中填写 Figma 访问令牌。');
  }
  return { 'X-Figma-Token': token };
}

async function figmaJson(url) {
  const response = await fetch(url, { headers: figmaHeaders() });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Figma 请求失败 ${response.status}: ${body.slice(0, 240)}`);
  }
  return response.json();
}

function exportableChildren(node) {
  const children = Array.isArray(node?.children) ? node.children : [];
  const candidates = [];

  for (const child of children) {
    if (child.visible === false) continue;
    if (child.type === 'SECTION') {
      for (const nested of child.children || []) {
        if (nested.visible !== false && allowedTypes.has(nested.type)) {
          candidates.push({ ...nested, sectionName: child.name.trim() });
        }
      }
      continue;
    }
    if (allowedTypes.has(child.type)) candidates.push(child);
  }

  return candidates;
}

function collectStyleAnchors(node, anchors = []) {
  const label = `${node?.name || ''} ${node?.characters || ''}`;
  const style = backgroundStyleNames.find(name => label.includes(name));
  const box = node?.absoluteBoundingBox;
  if (style && box && Number.isFinite(box.x) && Number.isFinite(box.width)) {
    anchors.push({ style, centerX: box.x + box.width / 2 });
  }
  for (const child of node?.children || []) collectStyleAnchors(child, anchors);
  return anchors;
}

function backgroundStyleFor(node, styleAnchors) {
  const sectionStyle = backgroundStyleNames.find(name => node.sectionName?.includes(name));
  if (sectionStyle) return sectionStyle;

  const box = node?.absoluteBoundingBox;
  if (!box || styleAnchors.length === 0) return '';
  const centerX = box.x + box.width / 2;
  return styleAnchors
    .map(anchor => ({ ...anchor, distance: Math.abs(anchor.centerX - centerX) }))
    .sort((a, b) => a.distance - b.distance)[0].style;
}

function figmaDeeplink(nodeId) {
  const url = new URL(`https://www.figma.com/design/${fileKey}/背景图`);
  url.searchParams.set('node-id', nodeId.replace(':', '-'));
  return url.toString();
}

function fileNameFor(nodeId) {
  return `${nodeId.replace(/[^a-zA-Z0-9_-]/g, '-')}.png`;
}

function signatureFor(node) {
  return crypto.createHash('sha256').update(JSON.stringify(node)).digest('hex');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`图片下载失败 ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await fs.writeFile(destination, bytes);
}

function nodeArea(node) {
  const box = node?.absoluteBoundingBox;
  return Number(box?.width || 0) * Number(box?.height || 0);
}

async function syncBrandGuide(pageName, assetSlug, previousSignature = '') {
  const fileUrl = new URL(`https://api.figma.com/v1/files/${fileKey}`);
  fileUrl.searchParams.set('depth', '3');
  const filePayload = await figmaJson(fileUrl);
  const pageAliases = pageName === 'CapCut' ? ['CapCut', 'CapCat'] : [pageName];
  const page = filePayload.document?.children?.find(node => node.type === 'CANVAS' && pageAliases.includes(node.name.trim()));
  if (!page) throw new Error(`没有找到名为“${pageName}”的 Figma 页面。`);

  const candidates = exportableChildren(page);
  if (candidates.length === 0) throw new Error(`“${pageName}”页面没有找到可导出的画板。`);
  const mainBoard = candidates.sort((a, b) => nodeArea(b) - nodeArea(a))[0];
  const signature = signatureFor(mainBoard);
  const destinationDir = path.join(brandGuideDir, assetSlug);
  const destination = path.join(destinationDir, 'overview.png');
  if (signature === previousSignature && await fileExists(destination)) {
    return { page: page.name, board: mainBoard.name, nodeId: mainBoard.id, signature, changed: false };
  }

  const imageUrl = new URL(`https://api.figma.com/v1/images/${fileKey}`);
  imageUrl.searchParams.set('ids', mainBoard.id);
  imageUrl.searchParams.set('format', 'png');
  imageUrl.searchParams.set('scale', '1');
  imageUrl.searchParams.set('use_absolute_bounds', 'true');
  const imagePayload = await figmaJson(imageUrl);
  const temporaryUrl = imagePayload.images?.[mainBoard.id];
  if (!temporaryUrl) throw new Error(`Figma 没有返回${pageName}品牌画板的导出图片。`);

  await fs.mkdir(destinationDir, { recursive: true });
  await download(temporaryUrl, destination);
  return { page: page.name, board: mainBoard.name, nodeId: mainBoard.id, signature, changed: true };
}

function collectText(node, values = []) {
  if (node?.type === 'TEXT' && typeof node.characters === 'string') {
    const value = node.characters.trim();
    if (value) values.push(value);
  }
  for (const child of node?.children || []) collectText(child, values);
  return values;
}

function cleanPrompt(value) {
  return value.replace(/^\s*Prompt\s*[：:]\s*/i, '').trim();
}

function collectImageNodes(node, values = []) {
  const hasImageFill = Array.isArray(node?.fills) && node.fills.some(fill => fill?.type === 'IMAGE' && fill.visible !== false);
  if (hasImageFill && node.visible !== false) values.push(node);
  for (const child of node?.children || []) collectImageNodes(child, values);
  return values;
}

async function syncCharacterLibrary() {
  let existingCharacters = [];
  try {
    const parsed = JSON.parse(await fs.readFile(characterDataPath, 'utf8'));
    if (Array.isArray(parsed)) existingCharacters = parsed;
  } catch {
    existingCharacters = [];
  }
  const previousByCode = new Map(existingCharacters.map(character => [character.code, character]));

  const fileUrl = new URL(`https://api.figma.com/v1/files/${fileKey}`);
  fileUrl.searchParams.set('depth', '6');
  const filePayload = await figmaJson(fileUrl);
  const page = filePayload.document?.children?.find(node => node.type === 'CANVAS' && node.name.trim() === '人物素材库');
  if (!page) return { page: '人物素材库', synced: 0, skipped: true };

  const candidates = exportableChildren(page)
    .filter(node => collectText(node, []).some(value => /^CH\d{3}$/i.test(value)))
    .sort((a, b) => Number(a.absoluteBoundingBox?.x || 0) - Number(b.absoluteBoundingBox?.x || 0));
  if (candidates.length === 0) throw new Error('“人物素材库”页面没有找到包含 CH 编号的画板。');

  const imageNodesByBoard = new Map(candidates.map(node => [
    node.id,
    collectImageNodes(node, []).sort((a, b) => Number(a.absoluteBoundingBox?.y || 0) - Number(b.absoluteBoundingBox?.y || 0)),
  ]));
  const candidateState = candidates.map(node => {
    const textValues = collectText(node, []);
    const code = textValues.find(value => /^CH\d{3}$/i.test(value))?.toUpperCase();
    const previous = code ? previousByCode.get(code) : undefined;
    const signature = signatureFor({ node, characterThumbnailScale });
    return { node, code, previous, signature, changed: !previous || previous.figmaSignature !== signature };
  });
  const changedState = candidateState.filter(item => item.changed);
  const exportNodes = Array.from(new Map([
    ...changedState.map(item => item.node),
    ...changedState.flatMap(item => imageNodesByBoard.get(item.node.id) || []),
  ].map(node => [node.id, node])).values());

  let imagePayload = { images: {} };
  if (exportNodes.length > 0) {
    const imageUrl = new URL(`https://api.figma.com/v1/images/${fileKey}`);
    imageUrl.searchParams.set('ids', exportNodes.map(node => node.id).join(','));
    imageUrl.searchParams.set('format', 'png');
    imageUrl.searchParams.set('scale', '1');
    imageUrl.searchParams.set('use_absolute_bounds', 'true');
    imagePayload = await figmaJson(imageUrl);
  }

  const thumbnailNodes = changedState.map(item => imageNodesByBoard.get(item.node.id)?.[0] || item.node);
  let thumbnailPayload = { images: {} };
  if (thumbnailNodes.length > 0) {
    const thumbnailUrl = new URL(`https://api.figma.com/v1/images/${fileKey}`);
    thumbnailUrl.searchParams.set('ids', thumbnailNodes.map(node => node.id).join(','));
    thumbnailUrl.searchParams.set('format', 'jpg');
    thumbnailUrl.searchParams.set('scale', String(characterThumbnailScale));
    thumbnailUrl.searchParams.set('use_absolute_bounds', 'true');
    thumbnailPayload = await figmaJson(thumbnailUrl);
  }

  await fs.mkdir(characterAssetDir, { recursive: true });
  await fs.mkdir(characterThumbnailDir, { recursive: true });
  const characters = [];
  for (const item of candidateState) {
    const { node, code, previous, signature, changed } = item;
    if (!code) continue;
    if (!changed && previous) {
      characters.push(previous);
      continue;
    }
    const temporaryUrl = imagePayload.images?.[node.id];
    if (!temporaryUrl) continue;
    const textValues = collectText(node, []);
    const promptText = textValues.find(value => /^\s*Prompt\s*[：:]/i.test(value))
      || textValues.find(value => /Identity Lock/i.test(value))
      || '';
    const prompt = cleanPrompt(promptText) || previous?.prompt || '';
    const imageNodes = imageNodesByBoard.get(node.id) || [];
    const viewsNode = imageNodes[0];
    const detailsNode = imageNodes.length > 1 ? imageNodes[imageNodes.length - 1] : undefined;
    const fileName = fileNameFor(node.id);
    await download(temporaryUrl, path.join(characterAssetDir, fileName));
    const viewsFileName = viewsNode ? `views-${fileNameFor(viewsNode.id)}` : fileName;
    const detailsFileName = detailsNode ? `details-${fileNameFor(detailsNode.id)}` : fileName;
    const thumbnailFileName = fileName.replace(/\.png$/i, '.jpg');
    let thumbnailSrc = '';
    if (viewsNode && imagePayload.images?.[viewsNode.id]) {
      await download(imagePayload.images[viewsNode.id], path.join(characterAssetDir, viewsFileName));
    }
    if (detailsNode && imagePayload.images?.[detailsNode.id]) {
      await download(imagePayload.images[detailsNode.id], path.join(characterAssetDir, detailsFileName));
    }
    const thumbnailNode = viewsNode || node;
    if (thumbnailPayload.images?.[thumbnailNode.id]) {
      await download(thumbnailPayload.images[thumbnailNode.id], path.join(characterThumbnailDir, thumbnailFileName));
      thumbnailSrc = `assets/character-thumbnails/${thumbnailFileName}`;
    }
    const alias = characterAliases[code] || `人物 ${code.slice(-3)}`;
    characters.push({
      id: `figma:${fileKey}:${node.id}`,
      code,
      alias,
      prompt,
      src: `assets/characters/${viewsFileName}`,
      viewsSrc: `assets/characters/${viewsFileName}`,
      detailsSrc: `assets/characters/${detailsFileName}`,
      ...((thumbnailSrc || previous?.thumbnailSrc) ? { thumbnailSrc: thumbnailSrc || previous.thumbnailSrc } : {}),
      ...(previous?.detailsPreviewSrc ? { detailsPreviewSrc: previous.detailsPreviewSrc } : {}),
      url: figmaDeeplink(node.id),
      figmaFileKey: fileKey,
      figmaNodeId: node.id,
      figmaSignature: signature,
      source: 'figma',
      category: 'character-library',
      tags: ['人物素材库', '三视图', '细节图', 'Prompt', alias],
      syncedAt: changed ? new Date().toISOString() : previous?.syncedAt,
    });
  }

  await fs.writeFile(characterDataPath, `${JSON.stringify(characters, null, 2)}\n`, 'utf8');
  return { page: page.name, synced: characters.length, skipped: false };
}

export async function syncFigma() {
  await fs.mkdir(assetDir, { recursive: true });
  await fs.mkdir(thumbnailDir, { recursive: true });

  const nodesUrl = new URL(`https://api.figma.com/v1/files/${fileKey}/nodes`);
  nodesUrl.searchParams.set('ids', targetNodeId);
  nodesUrl.searchParams.set('depth', '3');
  const nodesPayload = await figmaJson(nodesUrl);
  const targetNode = nodesPayload.nodes?.[targetNodeId]?.document;
  if (!targetNode) throw new Error(`Figma 页面节点 ${targetNodeId} 不存在或无权读取。`);

  const candidates = exportableChildren(targetNode);
  if (candidates.length === 0) {
    throw new Error('指定页面没有找到可导出的 Frame、Group 或图片图层。');
  }
  const styleAnchors = collectStyleAnchors(targetNode);

  const existing = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  if (!Array.isArray(existing)) throw new Error('data/images.json 必须是数组。');
  const byId = new Map(existing.map(image => [image.id, image]));
  const today = new Date().toISOString().slice(0, 10);
  let synced = 0;
  let unchanged = 0;

  const candidateState = await Promise.all(candidates.map(async node => {
    const id = `figma:${fileKey}:${node.id}`;
    const previous = byId.get(id);
    const fileName = fileNameFor(node.id);
    const destination = path.join(assetDir, fileName);
    const thumbnailDestination = path.join(thumbnailDir, fileName.replace(/\.png$/i, '.jpg'));
    const signature = signatureFor(node);
    const changed = !previous
      || previous.figmaSignature !== signature
      || !(await fileExists(destination))
      || !(await fileExists(thumbnailDestination));
    return { node, id, previous, fileName, destination, signature, changed };
  }));
  const changedCandidates = candidateState.filter(item => item.changed);
  let imagePayload = { images: {} };
  let thumbnailPayload = { images: {} };
  if (changedCandidates.length > 0) {
    const imageUrl = new URL(`https://api.figma.com/v1/images/${fileKey}`);
    imageUrl.searchParams.set('ids', changedCandidates.map(item => item.node.id).join(','));
    imageUrl.searchParams.set('format', 'png');
    imageUrl.searchParams.set('scale', '1');
    imageUrl.searchParams.set('use_absolute_bounds', 'true');
    imagePayload = await figmaJson(imageUrl);

    const thumbnailUrl = new URL(`https://api.figma.com/v1/images/${fileKey}`);
    thumbnailUrl.searchParams.set('ids', changedCandidates.map(item => item.node.id).join(','));
    thumbnailUrl.searchParams.set('format', 'jpg');
    thumbnailUrl.searchParams.set('scale', '0.5');
    thumbnailUrl.searchParams.set('use_absolute_bounds', 'true');
    thumbnailPayload = await figmaJson(thumbnailUrl);
  }

  for (const item of candidateState) {
    const { node, id, previous, fileName, destination, signature, changed } = item;
    const temporaryUrl = imagePayload.images?.[node.id];
    if (changed) {
      if (!temporaryUrl) continue;
      await download(temporaryUrl, destination);
      synced += 1;
    } else {
      unchanged += 1;
    }
    const thumbnailFileName = fileName.replace(/\.png$/i, '.jpg');
    const thumbnailDestination = path.join(thumbnailDir, thumbnailFileName);
    if (changed || !(await fileExists(thumbnailDestination))) {
      const thumbnailUrl = thumbnailPayload.images?.[node.id];
      if (thumbnailUrl) await download(thumbnailUrl, thumbnailDestination);
    }
    const backgroundStyle = backgroundStyleFor(node, styleAnchors);
    byId.set(id, {
      ...(previous || {}),
      id,
      title: node.name || `模型上新背景 ${synced + 1}`,
      src: `assets/model-launch-backgrounds/${fileName}`,
      cardSrc: `assets/model-launch-thumbnails/${thumbnailFileName}`,
      url: figmaDeeplink(node.id),
      figmaFileKey: fileKey,
      figmaNodeId: node.id,
      source: 'figma',
      category: 'model-launch-background',
      style: backgroundStyle,
      tags: ['模型上新背景', backgroundStyle, 'figma', 'approved-reference'].filter(Boolean),
      added: previous?.added || today,
      figmaSignature: signature,
      syncedAt: changed ? new Date().toISOString() : previous?.syncedAt,
    });
  }

  const merged = Array.from(byId.values());
  await fs.writeFile(dataPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  let syncState = {};
  try {
    syncState = JSON.parse(await fs.readFile(syncStatePath, 'utf8'));
  } catch {
    syncState = {};
  }
  const brandGuides = await Promise.all([
    syncBrandGuide('剪映', 'jianying', syncState.brandGuides?.jianying || ''),
    syncBrandGuide('CapCut', 'capcut', syncState.brandGuides?.capcut || ''),
  ]);
  await fs.writeFile(syncStatePath, `${JSON.stringify({
    brandGuides: {
      jianying: brandGuides[0].signature,
      capcut: brandGuides[1].signature,
    },
  }, null, 2)}\n`, 'utf8');
  const characterLibrary = await syncCharacterLibrary();
  const styleCounts = Object.fromEntries(backgroundStyleNames.map(style => [
    style,
    candidates.filter(node => backgroundStyleFor(node, styleAnchors) === style).length,
  ]));
  return { discovered: candidates.length, synced, unchanged, total: merged.length, brandGuides, characterLibrary, styleCounts };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncFigma()
    .then(result => console.log(`Figma 同步完成：发现 ${result.discovered}，更新 ${result.synced}，跳过未变化 ${result.unchanged}，图库总计 ${result.total}；人物素材：${result.characterLibrary.synced}；风格标签：${JSON.stringify(result.styleCounts)}；品牌规范：${result.brandGuides.map(guide => `${guide.page} / ${guide.board}`).join('、')}`))
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
