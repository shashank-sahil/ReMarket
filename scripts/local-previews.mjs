import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

const output = resolve(process.cwd(), 'out');
const previews = [
  { route: 'kgpians', port: 3101 },
  { route: 'nonkgpians', port: 3102 },
];
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

if (!existsSync(join(output, 'kgpians.html')) || !existsSync(join(output, 'nonkgpians.html'))) {
  console.error('Build the site first with npm run build.');
  process.exit(1);
}

for (const { route, port } of previews) {
  const server = createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname); }
    catch { response.writeHead(400).end('Bad request'); return; }

    if (pathname === '/') {
      response.writeHead(302, { Location: `/${route}` }).end();
      return;
    }

    const relative = pathname === `/${route}` || pathname === `/${route}/`
      ? `${route}.html`
      : pathname.slice(1);
    const file = resolve(output, relative);
    if (!file.startsWith(output + sep) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }

    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  server.on('error', error => {
    console.error(`Could not start ${route} preview on port ${port}: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log(`${route}: http://localhost:${port}`));
}
