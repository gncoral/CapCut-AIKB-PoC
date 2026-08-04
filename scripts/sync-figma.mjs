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
const allowedTypes = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP', 'RECTANGLE', 'SLICE']);

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
        if (nested.visible !== false && allowedTypes.has(nested.type)) candidates.push(nested);
      }
      continue;
    }
    if (allowedTypes.has(child.type)) candidates.push(child);
  }

  return candidates;
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
      tags: ['模型上新背景', 'figma', 'approved-reference'],
      added: previous?.added || today,
      syncedAt: new Date().toISOString(),
    });
    synced += 1;
  }

  const merged = Array.from(byId.values());
  await fs.writeFile(dataPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return { discovered: candidates.length, synced, total: merged.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncFigma()
    .then(result => console.log(`Figma 同步完成：发现 ${result.discovered}，写入 ${result.synced}，图库总计 ${result.total}`))
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
