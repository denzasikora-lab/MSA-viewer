// Stray scrollbars: elements that show a scrollbar for only a few pixels of
// overflow (or always, with overflow:scroll), and horizontal page overflow.
// Runs with real scrollbars (headless Chromium hides them by default) on the
// empty page, an example alignment in every view mode, every menu and the
// main windows, at common screen sizes and scaling factors.
//
//   node tests/layout/stray-scrollbars.test.js
const { start } = require('../lib/static-server');
const { findChrome } = require('../lib/browser');
const { chromium } = require('playwright-core');
const SCAN = () => {
  const out = [];
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth) out.push(`PAGE horizontal overflow ${de.scrollWidth - de.clientWidth}px`);
  for (const e of document.querySelectorAll('body *')) {
    if (!e.getClientRects().length) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden') continue;
    const ox = e.scrollWidth - e.clientWidth, oy = e.scrollHeight - e.clientHeight;
    const sx = /(auto|scroll)/.test(cs.overflowX), sy = /(auto|scroll)/.test(cs.overflowY);
    const name = `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''}`;
    if (sx && ox > 0 && ox <= 24) out.push(`${name}: horizontal scrollbar for ${ox}px`);
    if (sy && oy > 0 && oy <= 24) out.push(`${name}: vertical scrollbar for ${oy}px`);
    if (cs.overflowX === 'scroll' && ox <= 0) out.push(`${name}: overflow-x:scroll always shows a bar`);
    if (cs.overflowY === 'scroll' && oy <= 0) out.push(`${name}: overflow-y:scroll always shows a bar`);
  }
  return out;
};
(async () => {
  const { server, baseUrl } = await start();
  const b = await chromium.launch({ executablePath: findChrome(), headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
  const seen = new Map();
  const add = (ctx, list) => list.forEach(x => { if (!seen.has(x)) seen.set(x, ctx); });
  for (const [w, h, dpr] of [[1366, 768, 1], [1366, 768, 1.25], [1536, 864, 1.25], [1920, 1080, 1.5], [1280, 720, 1]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await p.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    const tag = `${w}x${h}@${dpr}`;
    add(`${tag} empty`, await p.evaluate(SCAN));
    await p.goto(baseUrl + '/index.html?url=' + encodeURIComponent(baseUrl + '/examples/svk_k4.fa'), { waitUntil: 'networkidle' });
    await p.waitForTimeout(1500);
    for (const mode of ['modeBlocks', 'modeSingle', 'modeCanvas']) {
      await p.evaluate(id => { document.getElementById(id).checked = true; onModeChange(); }, mode); await p.waitForTimeout(700);
      add(`${tag} svk_k4 ${mode}`, await p.evaluate(SCAN));
    }
    await p.evaluate(() => { document.getElementById('modeBlocks').checked = true; onModeChange(); }); await p.waitForTimeout(500);
    const headers = await p.$$('#controls .menu-section > .section-header');
    for (let i = 0; i < headers.length; i++) {
      await p.evaluate(i => { const s = document.querySelectorAll('#controls .menu-section')[i]; s && openMenuSection(s); }, i);
      await p.waitForTimeout(250);
      const label = await p.evaluate(i => document.querySelectorAll('#controls .menu-section > .section-header')[i]?.textContent.trim().split(/\s+/)[0], i);
      add(`${tag} menu ${label}`, await p.evaluate(SCAN));
    }
    await p.evaluate(() => closeAllMenusViaEsc());
    for (const id of ['infoModal', 'addSeqModal', 'treeBuilderModal', 'dotPlotModal', 'repeatFinderModal', 'statsModal', 'colourInspectorModal']) {
      await p.evaluate(id => { try { if (id === 'statsModal') { if (typeof openStatsModal === 'function') openStatsModal(); else document.getElementById(id).style.display = 'block'; } else showExclusiveModal(id); } catch (e) { document.getElementById(id).style.display = 'block'; } }, id);
      await p.waitForTimeout(600);
      add(`${tag} window ${id}`, await p.evaluate(SCAN));
      await p.evaluate(id => { document.getElementById(id).style.display = 'none'; }, id);
    }
    await p.close();
  }
  for (const [k, v] of seen) console.log(`FAIL ${k}   [first at ${v}]`);
  console.log(seen.size ? `${seen.size} stray scrollbar(s)` : 'no stray scrollbars');
  await b.close(); server.close();
  process.exit(seen.size ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
