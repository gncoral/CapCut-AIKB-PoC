import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLocalEnv } from './scripts/env.mjs';
import { syncFigma } from './scripts/sync-figma.mjs';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
loadLocalEnv(projectRoot);

const port = Number(process.env.PORT || 4173);
const intervalMinutes = Math.max(1, Number(process.env.SYNC_INTERVAL_MINUTES || 10));
const envPath = path.join(projectRoot, '.env.local');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function safePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolved = path.resolve(projectRoot, relative);
  return resolved.startsWith(projectRoot) ? resolved : null;
}

function json(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 20_000) throw new Error('请求内容过大');
  }
  return JSON.parse(body || '{}');
}

function hasFigmaToken() {
  return Boolean(process.env.FIGMA_ACCESS_TOKEN && process.env.FIGMA_ACCESS_TOKEN !== 'replace_me');
}

async function saveFigmaToken(token) {
  if (!/^figd_[A-Za-z0-9_-]{20,}$/.test(token)) {
    throw new Error('这不像有效的 Figma 个人访问令牌，请检查后重试。');
  }
  const contents = [
    `FIGMA_ACCESS_TOKEN=${token}`,
    `FIGMA_FILE_KEY=${process.env.FIGMA_FILE_KEY || 'HjEFKtMBDJm6Eessye8GjP'}`,
    `FIGMA_TARGET_NODE_ID=${process.env.FIGMA_TARGET_NODE_ID || '0:1'}`,
    `SYNC_INTERVAL_MINUTES=${intervalMinutes}`,
    `PORT=${port}`,
    '',
  ].join('\n');
  await fs.promises.writeFile(envPath, contents, { encoding: 'utf8', mode: 0o600 });
  process.env.FIGMA_ACCESS_TOKEN = token;
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://localhost');

  if (request.method === 'GET' && requestUrl.pathname === '/api/figma-status') {
    json(response, 200, { connected: hasFigmaToken(), intervalMinutes });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/connect-figma') {
    try {
      const body = await readJsonBody(request);
      await saveFigmaToken(String(body.token || '').trim());
      const result = await syncFigma();
      json(response, 200, { ok: true, ...result });
    } catch (error) {
      json(response, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/sync-figma') {
    try {
      const result = await syncFigma();
      json(response, 200, { ok: true, ...result });
    } catch (error) {
      json(response, 400, { ok: false, error: error.message });
    }
    return;
  }

  const filePath = safePath(request.url || '/');
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(response);
});

async function trySync() {
  if (!hasFigmaToken()) {
    console.log('Figma 自动同步未启动：等待 .env.local 中的访问令牌。');
    return;
  }
  try {
    const result = await syncFigma();
    console.log(`Figma 自动同步：发现 ${result.discovered}，写入 ${result.synced}`);
  } catch (error) {
    console.error(`Figma 自动同步失败：${error.message}`);
  }
}

server.listen(port, '127.0.0.1', () => {
  console.log(`CapCut AIKB PoC: http://127.0.0.1:${port}`);
  trySync();
  setInterval(trySync, intervalMinutes * 60 * 1000).unref();
});
