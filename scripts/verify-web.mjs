import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const root = resolve('web');
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createStaticServer() {
  return createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = resolve(join(root, relativePath));

    if (!filePath.startsWith(root) || !existsSync(filePath)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': types[extname(filePath)] || 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  });
}

const html = await readFile(join(root, 'index.html'), 'utf8');
const appJs = await readFile(join(root, 'scripts', 'app.js'), 'utf8');
const soundJs = await readFile(join(root, 'scripts', 'sounds.js'), 'utf8');
const statsJs = await readFile(join(root, 'scripts', 'stats.js'), 'utf8');
const storeJs = await readFile(join(root, 'scripts', 'store.js'), 'utf8');

assert(html.includes('<title>番茄钟 | 在线专注计时器</title>'), 'Missing web page title');
assert(html.includes('styles/main.css'), 'Missing stylesheet link');
assert(html.includes('scripts/app.js'), 'Missing app script');
assert(!html.includes('id="btn-minimize"'), 'Desktop minimize button should not ship in web page');
assert(!html.includes('id="btn-close"'), 'Desktop close button should not ship in web page');
assert(html.includes('id="set-ambience"'), 'Missing ambience selector');
assert(html.includes('id="file-ambience"'), 'Missing ambience file import');
assert(html.includes('id="set-focus-alert"'), 'Missing focus alert selector');
assert(html.includes('id="calendar-grid"'), 'Missing calendar grid');
assert(html.includes('id="sessions-list"'), 'Missing focus session list');
assert(appJs.includes('handleAudioImport'), 'Missing local audio import handler');
assert(appJs.includes('focusStartedAt'), 'Missing focus start capture');
assert(soundJs.includes('indexedDB.open'), 'Missing custom sound persistence');
assert(soundJs.includes('startAmbience'), 'Missing ambience playback API');
assert(statsJs.includes('renderCalendar'), 'Missing calendar rendering');
assert(statsJs.includes('deleteSession'), 'Missing session deletion');
assert(storeJs.includes('history'), 'Missing stats history support');
assert(storeJs.includes('sessions'), 'Missing focus session support');

const server = createStaticServer();
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));

try {
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const paths = [
    '/',
    '/styles/main.css',
    '/scripts/app.js',
    '/scripts/store.js',
    '/scripts/sounds.js',
    '/scripts/stats.js',
  ];

  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    assert(response.ok, `${path} returned ${response.status}`);
  }

  console.log(`Verified web static site at ${baseUrl}`);
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}
