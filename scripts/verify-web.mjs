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
assert(html.includes('<title>番茄钟 | 在线专注计时器</title>'), 'Missing web page title');
assert(html.includes('styles/main.css'), 'Missing stylesheet link');
assert(html.includes('scripts/app.js'), 'Missing app script');
assert(!html.includes('id="btn-minimize"'), 'Desktop minimize button should not ship in web page');
assert(!html.includes('id="btn-close"'), 'Desktop close button should not ship in web page');

const server = createStaticServer();
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));

try {
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const paths = ['/', '/styles/main.css', '/scripts/app.js', '/scripts/store.js'];

  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    assert(response.ok, `${path} returned ${response.status}`);
  }

  console.log(`Verified web static site at ${baseUrl}`);
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}
