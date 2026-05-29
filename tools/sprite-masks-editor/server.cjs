const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const ASSETS_DIR = path.resolve(__dirname, '../../src/assets/characters');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
};

function sendJson(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function send404(res) {
  res.writeHead(404);
  res.end('Not found');
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // API: list characters with manifests
  if (p === '/api/characters' && req.method === 'GET') {
    const dirs = fs.readdirSync(ASSETS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();

    const characters = [];
    for (const dir of dirs) {
      const manifestPath = path.join(ASSETS_DIR, dir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      characters.push(manifest);
    }
    return sendJson(res, characters);
  }

  // API: save mask PNG
  const saveMatch = p.match(/^\/api\/characters\/([^/]+)\/masks\/([^/]+)$/);
  if (saveMatch && req.method === 'POST') {
    const [, charId, filename] = saveMatch;
    const masksDir = path.join(ASSETS_DIR, charId, 'masks');
    if (!fs.existsSync(masksDir)) fs.mkdirSync(masksDir, { recursive: true });

    const body = await readBody(req);
    const filePath = path.join(masksDir, filename);
    fs.writeFileSync(filePath, body);
    return sendJson(res, { ok: true, path: filePath });
  }

  // Serve character assets (frames/masks)
  const assetMatch = p.match(/^\/assets\/characters\/([^/]+)\/(frames|masks)\/([^/]+)$/);
  if (assetMatch && req.method === 'GET') {
    const [, charId, subdir, filename] = assetMatch;
    const filePath = path.join(ASSETS_DIR, charId, subdir, filename);
    if (!fs.existsSync(filePath)) return send404(res);
    const ext = path.extname(filename);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Serve editor HTML
  if (p === '/' || p === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Serve other static files from editor directory
  const staticPath = path.join(__dirname, p);
  if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
    const ext = path.extname(staticPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(staticPath).pipe(res);
    return;
  }

  send404(res);
});

server.listen(PORT, () => {
  console.log(`Sprite Masks Editor: http://localhost:${PORT}`);
  console.log(`Assets dir: ${ASSETS_DIR}`);
});
