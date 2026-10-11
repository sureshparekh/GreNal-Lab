// Local preview only:  node scripts/serve.mjs  → http://localhost:8765  (serves ./docs)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const PORT = +process.env.PORT || 8765;

http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(ROOT, path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; } // no directory traversal
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': (TYPES[extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(PORT, () => console.log(`Serving docs/ on http://localhost:${PORT}`));
