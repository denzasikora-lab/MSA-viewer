// Minimal static file server for headless test runs. Deliberately not
// server.js (avoids spinning up BLAST/worker child processes for tests that
// don't need them) - same lightweight pattern used ad hoc throughout
// development, now checked into the repo so CI/GLM loops don't depend on a
// scratchpad copy.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PORT = process.env.TEST_SERVER_PORT ? Number(process.env.TEST_SERVER_PORT) : 3193;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };

function start() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve({ server, port: PORT, baseUrl: `http://localhost:${PORT}` }));
  });
}

if (require.main === module) {
  start().then(({ port }) => console.log(`test static server on ${port}`));
} else {
  module.exports = { start, PORT };
}
