// Checks the public GitHub Pages site built by tools/build-site.sh:
//  1. every script, stylesheet, worker and importScripts target the viewer
//     loads is in the site;
//  2. nothing private or restricted is (server, drafts, notes, tests,
//     sequence databases);
//  3. the built site works in headless Chromium: it loads without page
//     errors, opens an example by ?url=, and runs MAFFT in its worker.
//
//   node tests/site/check.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { launch } = require('../lib/browser');

const ROOT = path.join(__dirname, '..', '..');
let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ' - ' + detail : ''}`);
  if (!ok) failures++;
}

function serve(dir) {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const fp = path.join(dir, p);
      if (!fp.startsWith(dir)) { res.writeHead(403); res.end(); return; }
      fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
        res.end(data);
      });
    }).listen(0, () => resolve(server));
  });
}

async function main() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'viewalign-site-'));
  execFileSync('bash', [path.join(ROOT, 'tools', 'build-site.sh'), out], { stdio: 'pipe' });
  const has = f => fs.existsSync(path.join(out, f));

  // 1. Everything the viewer loads
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  const refs = new Set();
  for (const m of html.matchAll(/<script[^>]+src="([^"?#]+)/g)) refs.add(m[1]);
  for (const m of html.matchAll(/<link[^>]+href="([^"?#]+\.css)/g)) refs.add(m[1]);
  for (const f of fs.readdirSync(out).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(out, f), 'utf8');
    for (const m of src.matchAll(/new Worker\(\s*[`'"]\.?\/?([\w.-]+\.js)/g)) refs.add(m[1]);
    for (const m of src.matchAll(/importScripts\(([^)]*)\)/g)) {
      for (const n of m[1].matchAll(/'([\w.-]+\.js)'/g)) refs.add(n[1]);
    }
  }
  for (const f of ['disttbfast.wasm', 'vendor/gmod-cram/cram-bundle.js', 'vendor/gmod-cram/643.cram-bundle.js',
    'version.json', 'snapshots/index.json', 'manual.html', 'examples/svk_k4.fa']) refs.add(f);
  for (const f of refs) check(`site has ${f}`, has(f));
  for (const f of ['LICENSE', 'LICENSE-MACSE', 'LICENSE-MAFFT', 'THIRD_PARTY_NOTICES.md', 'vendor/gmod-cram/LICENSE']) {
    check(`site has licence file ${f}`, has(f));
  }

  // 2. Nothing private or restricted
  const all = execFileSync('find', [out, '-type', 'f'], { encoding: 'utf8' }).trim().split('\n').map(f => path.relative(out, f));
  const forbidden = [
    /^server\.js$/, /^ssh-servers/, /^package(-lock)?\.json$/, /\.bnk$/i, /repbase/i,
    /^SINEBase/, /^snake_gekko/, /^tua_/, /^manuscript/, /^cover-letter/, /^supplementary/,
    /_TASK\.md$/, /_PROGRESS\.md$/, /HANDOFF/, /audit/i, /^todo/, /\.out$/, /\.log$/,
    /^(tests|scratch|reference|dev-tools|\.github|node_modules)\//,
  ];
  const leaked = all.filter(f => forbidden.some(re => re.test(f)));
  check('site holds no server, drafts, notes, tests or databases', leaked.length === 0, leaked.slice(0, 10).join(', '));

  // 3. The built site works
  const server = await serve(out);
  const base = `http://localhost:${server.address().port}`;
  const browser = await launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const missing = [];
    page.on('response', r => {
      if (r.status() === 404 && !r.url().includes('/api/')) missing.push(r.url().replace(base, ''));
    });
    await page.goto(`${base}/index.html?url=${encodeURIComponent(base + '/examples/svk_k4.fa')}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.state && state.seqs && state.seqs.length === 40, null, { timeout: 15000 }).catch(() => {});
    const n = await page.evaluate(() => state.seqs.length);
    check('built site opens examples/svk_k4.fa by ?url= (40 sequences)', n === 40, String(n));
    const aligned = await page.evaluate(() => _runMafftInWorker('>a\nACGTACGTAAACCC\n>b\nACGTCGTAAACCC\n', []).then(r => r, e => 'ERR ' + e.message));
    check('built site runs MAFFT in its worker', typeof aligned === 'string' && /^>a/m.test(aligned) && aligned.includes('-'), String(aligned).slice(0, 120));
    check('no page errors on the built site', errors.length === 0, errors.join(' | '));
    check('no missing files requested by the built site', missing.length === 0, missing.join(', '));
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(out, { recursive: true, force: true });
  }
  console.log(failures ? `${failures} check(s) failed` : 'site checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
