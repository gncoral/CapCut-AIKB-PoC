import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLocalEnv } from './env.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
loadLocalEnv(projectRoot);

const fileKey = process.env.FIGMA_FILE_KEY || 'HjEFKtMBDJm6Eessye8GjP';
const targetNodeId = process.env.FIGMA_TARGET_NODE_ID || '0:1';
const dataPath = path.join(projectRoot, 'data', 'images.json');
const assetDir = path.join(projectRoot, 'assets', 'model-launch-backgrounds');
const brandGuideDir = path.join(projectRoot, 'assets', 'brand-guidelines');
const characterDataPath = path.join(projectRoot, 'data', 'characters.json');
const characterAssetDir = path.join(projectRoot, 'assets', 'characters');
const allowedTypes = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP', 'RECTANGLE', 'SLICE']);
const backgroundStyleNames = ['柔焦色场', '抽象扩散', '极简3D'];
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

async function syncBrandGuide(pageName, assetSlug) {
  const fileUrl = new URL(`https://api.figma.com/v1/files/${fileKey}`);
  fileUrl.searchParams.set('depth', '3');
  const filePayload = await figmaJson(fileUrl);
  const pageAliases = pageName === 'CapCut' ? ['CapCut', 'CapCat'] : [pageName];
  const page = filePayload.document?.children?.find(node => node.type === 'CANVAS' && pageAliases.includes(node.name.trim()));
  if (!page) throw new Error(`没有找到名为“${pageName}”的 Figma 页面。`);

  const candidates = exportableChildren(page);
  if (candidates.length === 0) throw new Error(`“${pageName}”页面没有找到可导出的画板。`);
  const mainBoard = candidates.sort((a, b) => nodeArea(b) - nodeArea(a))[0];

  const imageUrl = new URL(`https://api.figma.com/v1/images/${fileKey}`);
  imageUrl.searchParams.set('ids', mainBoard.id);
  imageUrl.searchParams.set('format', 'png');
  imageUrl.searchParams.set('scale', '1');
  imageUrl.searchParams.set('use_absolute_bounds', 'true');
  const imagePayload = await figmaJson(imageUrl);
  const temporaryUrl = imagePayload.images?.[mainBoard.id];
  if (!temporaryUrl) throw new Error(`Figma 没有返回${pageName}品牌画板的导出图片。`);

  const destinationDir = path.join(brandGuideDir, assetSlug);
  await fs.mkdir(destinationDir, { recursive: true });
  await download(temporaryUrl, path.join(destinationDir, 'overview.png'));
  return { page: page.name, board: mainBoard.name, nodeId: mainBoard.id };
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
  const exportNodes = Array.from(new Map([
    ...candidates,
    ...Array.from(imageNodesByBoard.values()).flat(),
  ].map(node => [node.id, node])).values());

  const imageUrl = new URL(`https://api.figma.com/v1/images/${fileKey}`);
  imageUrl.searchParams.set('ids', exportNodes.map(node => node.id).join(','));
  imageUrl.searchParams.set('format', 'png');
  imageUrl.searchParams.set('scale', '1');
  imageUrl.searchParams.set('use_absolute_bounds', 'true');
  const imagePayload = await figmaJson(imageUrl);

  await fs.mkdir(characterAssetDir, { recursive: true });
  const characters = [];
  for (const node of candidates) {
    const temporaryUrl = imagePayload.images?.[node.id];
    if (!temporaryUrl) continue;
    const textValues = collectText(node, []);
    const code = textValues.find(value => /^CH\d{3}$/i.test(value))?.toUpperCase();
    if (!code) continue;
    const promptText = textValues.find(value => /^\s*Prompt\s*[：:]/i.test(value))
      || textValues.find(value => /Identity Lock/i.test(value))
      || '';
    const imageNodes = imageNodesByBoard.get(node.id) || [];
    const viewsNode = imageNodes[0];
    const detailsNode = imageNodes.length > 1 ? imageNodes[imageNodes.length - 1] : undefined;
    const fileName = fileNameFor(node.id);
    await download(temporaryUrl, path.join(characterAssetDir, fileName));
    const viewsFileName = viewsNode ? `views-${fileNameFor(viewsNode.id)}` : fileName;
    const detailsFileName = detailsNode ? `details-${fileNameFor(detailsNode.id)}` : fileName;
    if (viewsNode && imagePayload.images?.[viewsNode.id]) {
      await download(imagePayload.images[viewsNode.id], path.join(characterAssetDir, viewsFileName));
    }
    if (detailsNode && imagePayload.images?.[detailsNode.id]) {
      await download(imagePayload.images[detailsNode.id], path.join(characterAssetDir, detailsFileName));
    }
    const alias = characterAliases[code] || `人物 ${code.slice(-3)}`;
    characters.push({
      id: `figma:${fileKey}:${node.id}`,
      code,
      alias,
      prompt: cleanPrompt(promptText),
      src: `assets/characters/${viewsFileName}`,
      viewsSrc: `assets/characters/${viewsFileName}`,
      detailsSrc: `assets/characters/${detailsFileName}`,
      url: figmaDeeplink(node.id),
      figmaFileKey: fileKey,
      figmaNodeId: node.id,
      source: 'figma',
      category: 'character-library',
      tags: ['人物素材库', '三视图', '细节图', 'Prompt', alias],
      syncedAt: new Date().toISOString(),
    });
  }

  await fs.writeFile(characterDataPath, `${JSON.stringify(characters, null, 2)}\n`, 'utf8');
  return { page: page.name, synced: characters.length, skipped: false };
}

export async function syncFigma() {
  await fs.mkdir(assetDir, { recursive: true });

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

  const imageUrl = new URL(`https://api.figma.com/v1/images/${fileKey}`);
  imageUrl.searchParams.set('ids', candidates.map(node => node.id).join(','));
  imageUrl.searchParams.set('format', 'png');
  imageUrl.searchParams.set('scale', '1');
  imageUrl.searchParams.set('use_absolute_bounds', 'true');
  const imagePayload = await figmaJson(imageUrl);

  const existing = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  if (!Array.isArray(existing)) throw new Error('data/images.json 必须是数组。');
  const byId = new Map(existing.map(image => [image.id, image]));
  const today = new Date().toISOString().slice(0, 10);
  let synced = 0;

  for (const node of candidates) {
    const temporaryUrl = imagePayload.images?.[node.id];
    if (!temporaryUrl) continue;

    const fileName = fileNameFor(node.id);
    const destination = path.join(assetDir, fileName);
    await download(temporaryUrl, destination);

    const id = `figma:${fileKey}:${node.id}`;
    const previous = byId.get(id);
    const backgroundStyle = backgroundStyleFor(node, styleAnchors);
    byId.set(id, {
      ...(previous || {}),
      id,
      title: node.name || `模型上新背景 ${synced + 1}`,
      src: `assets/model-launch-backgrounds/${fileName}`,
      url: figmaDeeplink(node.id),
      figmaFileKey: fileKey,
      figmaNodeId: node.id,
      source: 'figma',
      category: 'model-launch-background',
      style: backgroundStyle,
      tags: ['模型上新背景', backgroundStyle, 'figma', 'approved-reference'].filter(Boolean),
      added: previous?.added || today,
      syncedAt: new Date().toISOString(),
    });
    synced += 1;
  }

  const merged = Array.from(byId.values());
  await fs.writeFile(dataPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  const brandGuides = await Promise.all([
    syncBrandGuide('剪映', 'jianying'),
    syncBrandGuide('CapCut', 'capcut'),
  ]);
  const characterLibrary = await syncCharacterLibrary();
  const styleCounts = Object.fromEntries(backgroundStyleNames.map(style => [
    style,
    candidates.filter(node => backgroundStyleFor(node, styleAnchors) === style).length,
  ]));
  return { discovered: candidates.length, synced, total: merged.length, brandGuides, characterLibrary, styleCounts };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncFigma()
    .then(result => console.log(`Figma 同步完成：发现 ${result.discovered}，写入 ${result.synced}，图库总计 ${result.total}；人物素材：${result.characterLibrary.synced}；风格标签：${JSON.stringify(result.styleCounts)}；品牌规范：${result.brandGuides.map(guide => `${guide.page} / ${guide.board}`).join('、')}`))
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
