// Accessibility checks: keyboard access to the menus and windows, names for
// controls, a live status region, and an axe-core scan (no serious or
// critical violations) of the loaded viewer with every menu open.
//
//   node tests/a11y/check.js
const fs = require('fs');
const { start } = require('../lib/static-server');
const { launch, loadFasta } = require('../lib/browser');

const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const CHECKS = [];
function check(name, fn) { CHECKS.push({ name, fn }); }
const active = page => page.evaluate(() => {
  const a = document.activeElement;
  return { id: a.id, label: a.getAttribute('aria-label') || '', tag: a.tagName, inMenu: a.closest('.menu-section')?.querySelector('.section-header span')?.textContent || '' };
});

check('every menu header is reachable with Tab and announced as a button', async (page) => {
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const a = await active(page);
    if (/ menu$/.test(a.label)) seen.add(a.label);
  }
  const headers = await page.evaluate(() => [...document.querySelectorAll('.menu-section > .section-header')]
    .filter(h => h.getClientRects().length).map(h => ({ label: h.getAttribute('aria-label'), role: h.getAttribute('role') })));
  const missing = headers.filter(h => !seen.has(h.label));
  const ok = headers.length >= 10 && missing.length === 0 && headers.every(h => h.role === 'button');
  return { pass: ok, detail: JSON.stringify({ visible: headers.length, missing }) };
});

check('Enter opens a menu and moves focus into it; Esc closes it and returns to the header', async (page) => {
  await page.focus('#controls .section-header[data-section="shade"]');
  await page.keyboard.press('Enter');
  const opened = await page.evaluate(() => {
    const sec = document.querySelector('.section-header[data-section="shade"]').closest('.menu-section');
    return { open: sec.classList.contains('menu-open'), expanded: sec.querySelector('.section-header').getAttribute('aria-expanded'), focusInside: sec.querySelector('.control-group').contains(document.activeElement) };
  });
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => {
    const h = document.querySelector('.section-header[data-section="shade"]');
    return { open: h.closest('.menu-section').classList.contains('menu-open'), focusOnHeader: document.activeElement === h };
  });
  const ok = opened.open && opened.expanded === 'true' && opened.focusInside && !closed.open && closed.focusOnHeader;
  return { pass: ok, detail: JSON.stringify({ opened, closed }) };
});

check('a modal window takes focus, keeps Tab inside, closes on Esc and returns focus', async (page) => {
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.id = '__opener'; b.textContent = 'open';
    b.onclick = () => showExclusiveModal('infoModal');
    document.body.appendChild(b);
    b.focus();
  });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  const r = await page.evaluate(() => {
    const m = document.getElementById('infoModal');
    return { role: m.getAttribute('role'), modal: m.getAttribute('aria-modal'), labelled: !!m.getAttribute('aria-labelledby'), focusInside: m.contains(document.activeElement) };
  });
  let escaped = false;
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    if (!(await page.evaluate(() => document.getElementById('infoModal').contains(document.activeElement)))) escaped = true;
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => ({ shown: getComputedStyle(document.getElementById('infoModal')).display !== 'none', focus: document.activeElement.id }));
  const ok = r.role === 'dialog' && r.modal === 'true' && r.labelled && r.focusInside && !escaped && !after.shown && after.focus === '__opener';
  return { pass: ok, detail: JSON.stringify({ r, escaped, after }) };
});

check('a tool window (Tree) takes focus and closes on Esc', async (page) => {
  await loadFasta(page, '>a\nACGTACGT\n>b\nACGAACGT\n>c\nACGTTCGT\n');
  await page.evaluate(() => showExclusiveModal('treeBuilderModal'));
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => ({ role: document.getElementById('treeBuilderModal').getAttribute('role'), focusInside: document.getElementById('treeBuilderModal').contains(document.activeElement) }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const shown = await page.evaluate(() => getComputedStyle(document.getElementById('treeBuilderModal')).display !== 'none');
  return { pass: r.role === 'dialog' && r.focusInside && !shown, detail: JSON.stringify({ r, shown }) };
});

check('status messages are announced (role=status, aria-live)', async (page) => {
  const r = await page.evaluate(() => { const s = document.getElementById('statusMessage'); return { role: s.getAttribute('role'), live: s.getAttribute('aria-live') }; });
  return { pass: r.role === 'status' && r.live === 'polite', detail: JSON.stringify(r) };
});

check('every visible form control and button has an accessible name', async (page) => {
  await page.evaluate(() => document.querySelectorAll('.menu-section').forEach(s => s.classList.add('menu-open')));
  await page.waitForTimeout(400);
  const missing = await page.evaluate(() => {
    const named = n => n.getAttribute('aria-label') || n.getAttribute('aria-labelledby')
      || (n.labels && [...n.labels].some(l => l.textContent.trim())) || (/^(BUTTON|A)$/.test(n.tagName) && n.textContent.trim().length > 1);
    return [...document.querySelectorAll('button, input:not([type=hidden]), select, textarea')]
      .filter(n => n.getClientRects().length && !named(n)).map(n => n.id || n.outerHTML.slice(0, 60));
  });
  return { pass: missing.length === 0, detail: missing.slice(0, 10).join(', ') };
});

check('axe-core: no serious or critical violations (alignment loaded, all menus open)', async (page) => {
  await loadFasta(page, '>a\nACGTACGTAC\n>b\nACGAACGTAC\n');
  await page.evaluate(() => document.querySelectorAll('.menu-section').forEach(s => s.classList.add('menu-open')));
  await page.addScriptTag({ content: AXE });
  const v = await page.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations
    .map(x => ({ id: x.id, impact: x.impact, n: x.nodes.length, ex: x.nodes.slice(0, 2).map(n => n.target.join(' ')) })));
  const bad = v.filter(x => x.impact === 'serious' || x.impact === 'critical');
  const minor = v.filter(x => !(x.impact === 'serious' || x.impact === 'critical')).map(x => `${x.id}(${x.n})`);
  return { pass: bad.length === 0, detail: JSON.stringify(bad) + (minor.length ? ' other: ' + minor.join(', ') : '') };
});

check('axe-core: manual has no serious or critical violations', async (page, baseUrl) => {
  await page.goto(baseUrl + '/manual.html', { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: AXE });
  const v = await page.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations
    .map(x => ({ id: x.id, impact: x.impact, n: x.nodes.length, ex: x.nodes.slice(0, 3).map(n => n.target.join(' ')) })));
  const bad = v.filter(x => x.impact === 'serious' || x.impact === 'critical');
  return { pass: bad.length === 0, detail: JSON.stringify(bad) };
});

async function main() {
  const { server, baseUrl } = await start();
  const browser = await launch();
  let failed = 0;
  try {
    for (const { name, fn } of CHECKS) {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      let outcome;
      try {
        await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
        outcome = await fn(page, baseUrl);
        if (outcome.pass && errors.length) outcome = { pass: false, detail: 'page errors: ' + errors.join(' | ') };
      } catch (e) { outcome = { pass: false, detail: 'threw: ' + e.message }; }
      if (!outcome.pass) failed++;
      console.log(`[${outcome.pass ? 'PASS' : 'FAIL'}] ${name}${outcome.detail ? ' - ' + outcome.detail : ''}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\n${CHECKS.length - failed}/${CHECKS.length} passed`);
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
