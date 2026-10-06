// Browser-support checks: no syntax that older supported browsers cannot
// parse, the fallbacks for features some browsers lack, and the notice shown
// when the page is opened from disk.
//
//   node tests/browser-support/check.js
const fs = require('fs');
const path = require('path');
const { start } = require('../lib/static-server');
const { launch, loadFasta } = require('../lib/browser');

const ROOT = path.join(__dirname, '..', '..');
let failures = 0;
function report(name, ok, detail) {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail && !ok ? ' - ' + detail : ''}`);
  if (!ok) failures++;
}

// Files the page loads (workers included), from the public site list
const APP_JS = fs.readFileSync(path.join(ROOT, 'tools', 'build-site.sh'), 'utf8')
  .match(/APP_FILES=\(([\s\S]*?)\)/)[1].split(/\s+/).filter(f => f.endsWith('.js') && f !== 'disttbfast.js');

async function main() {
  // Regex lookbehind (Safari < 16.4) stops a whole script from parsing
  const lookbehind = [];
  for (const f of APP_JS) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    src.split('\n').forEach((line, i) => { if (/\(\?<[=!]/.test(line) && !/^\s*\/\//.test(line)) lookbehind.push(`${f}:${i + 1}`); });
  }
  report('no regex lookbehind in the viewer scripts (Safari < 16.4 cannot parse it)', lookbehind.length === 0, lookbehind.join(', '));

  const { server, baseUrl } = await start();
  const browser = await launch();
  try {
    // Copy without navigator.clipboard (plain http from another machine)
    {
      const ctx = await browser.newContext();
      await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => undefined, configurable: true }); });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
      await loadFasta(page, '>a\nACGT\n>b\nACGA\n');
      const r = await page.evaluate(async () => {
        const hasShim = !!(navigator.clipboard && navigator.clipboard.writeText);
        let copied = null;
        const orig = document.execCommand.bind(document);
        document.execCommand = (cmd) => { if (cmd === 'copy') { copied = document.activeElement && document.activeElement.value; return true; } return orig(cmd); };
        document.getElementById('copyAlignToolbarButton')?.click();
        await new Promise(r => setTimeout(r, 300));
        return { hasShim, copied: copied && copied.slice(0, 20) };
      });
      report('Copy works without navigator.clipboard (insecure context fallback)', r.hasShim && !!r.copied && errors.length === 0, JSON.stringify({ r, errors }));
      await ctx.close();
    }
    // A browser without AbortSignal.timeout (Chrome < 103, Safari < 16)
    {
      const ctx = await browser.newContext();
      await ctx.addInitScript(() => { delete AbortSignal.timeout; });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
      const ok = await page.evaluate(() => typeof AbortSignal.timeout === 'function' && AbortSignal.timeout(10) instanceof AbortSignal);
      report('AbortSignal.timeout is provided when missing', ok && errors.length === 0, JSON.stringify(errors));
      await ctx.close();
    }
    // Opened from disk
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('file://' + path.join(ROOT, 'index.html'));
      await page.waitForTimeout(1500);
      const msg = await page.evaluate(() => document.getElementById('statusMessage').textContent);
      report('opened from file:// the page says which tools need http(s)', /file:\/\//.test(msg) && /MAFFT/.test(msg) && errors.length === 0, JSON.stringify({ msg, errors }));
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nall browser-support checks passed');
  process.exit(failures ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
