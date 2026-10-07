// Menus and windows look right: no button text cut off in any menu, each
// label in the Display menu's codon row stays on the line of its dropdown, the
// Tree window fits the screen with Close visible, and "Load anyway" on the
// large-alignment question shows that it is working.
//
//   node tests/ui/menus-windows.test.js
const { start } = require('../lib/static-server');
const { findChrome } = require('../lib/browser');
const { chromium } = require('playwright-core');

let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failed++; };

(async () => {
  const { server, baseUrl } = await start();
  const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
  for (const [w, h] of [[1366, 768], [1280, 720]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(baseUrl + '/index.html?url=' + encodeURIComponent(baseUrl + '/examples/svk_k4.fa'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const tag = `${w}x${h}`;

    // every menu: no clipped button text
    const n = await page.evaluate(() => document.querySelectorAll('#controls .menu-section').length);
    const clipped = [];
    for (let i = 0; i < n; i++) {
      await page.evaluate(i => openMenuSection(document.querySelectorAll('#controls .menu-section')[i]), i);
      await page.waitForTimeout(200);
      clipped.push(...await page.evaluate(i => {
        const sec = document.querySelectorAll('#controls .menu-section')[i];
        return [...sec.querySelectorAll('.control-group button')].filter(b => b.getClientRects().length && b.clientWidth > 0 && b.scrollWidth > b.clientWidth + 1)
          .map(b => `"${b.textContent.trim()}" (${b.scrollWidth} > ${b.clientWidth})`);
      }, i));
    }
    check(clipped.length === 0, `${tag} no button text cut off in the menus${clipped.length ? ': ' + clipped.join(', ') : ''}`);

    // Display menu: codon labels stay with their dropdowns
    await page.evaluate(() => openMenuSection(document.querySelector('.section-header[data-section="display"]').parentElement));
    await page.waitForTimeout(200);
    const split = await page.evaluate(() => ['codonFrame', 'codonCode', 'codonFsRef'].filter(id => {
      const sel = document.getElementById(id), lab = document.querySelector(`label[for="${id}"]`);
      if (!sel || !lab || !sel.getClientRects().length) return false;
      const a = lab.getBoundingClientRect(), b = sel.getBoundingClientRect();
      return Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) > 6;
    }));
    check(split.length === 0, `${tag} codon row: each label on the line of its dropdown${split.length ? ' (split: ' + split.join(', ') + ')' : ''}`);
    await page.evaluate(() => closeAllMenusViaEsc());

    // Tree window fits the screen, Close visible after scrolling inside it
    await page.evaluate(() => { state.selectedRows.clear(); openTreeBuilder(); });
    await page.waitForFunction(() => document.getElementById('treeBuilderModal').style.display !== 'none', null, { timeout: 10000 });
    await page.waitForTimeout(1500);
    const tree = await page.evaluate(() => {
      const d = document.getElementById('treeBuilderDialog');
      d.scrollTop = d.scrollHeight;
      const r = d.getBoundingClientRect(), c = document.getElementById('treeBuilderCloseBtn').getBoundingClientRect();
      return { bottom: Math.round(r.bottom), vh: innerHeight, closeTop: Math.round(c.top), dTop: Math.round(r.top) };
    });
    check(tree.bottom <= tree.vh, `${tag} Tree window fits the screen (bottom ${tree.bottom}, window ${tree.vh})`);
    check(tree.closeTop >= tree.dTop - 1 && tree.closeTop < tree.dTop + 40, `${tag} Tree window: Close stays visible when scrolled (close at ${tree.closeTop}, window top ${tree.dTop})`);
    await page.evaluate(() => { document.getElementById('treeBuilderModal').style.display = 'none'; });

    // Load anyway: says it is working before the page blocks
    await page.evaluate(() => { let f = ''; for (let i = 0; i < 600; i++) { let s = ''; for (let j = 0; j < 3200; j++) s += 'ACGT'[(i + j * 7) % 4]; f += `>s${i}\n${s}\n`; } document.getElementById('fastaInput').value = f; parseAndRender(false); });
    await page.waitForSelector('#alignLoadProceed', { timeout: 15000 });
    const label = await page.evaluate(() => { const b = document.getElementById('alignLoadProceed'); b.click(); return [b.textContent, b.disabled, document.getElementById('alignLoadCancel').disabled]; });
    check(label[0] === 'Loading…' && label[1] && label[2], `${tag} Load anyway: shows "${label[0]}", buttons disabled`);
    await page.waitForFunction(() => !document.getElementById('alignLoadProceed') && state.seqs.length === 600, null, { timeout: 60000 });
    check(true, `${tag} Load anyway: dialog gone and alignment loaded`);

    check(errors.length === 0, `${tag} no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
    await page.close();
  }
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
