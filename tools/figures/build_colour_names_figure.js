// Manual figure 9.11: example-colour-names.fa after Auto by Similarity (first
// 10 characters, sensitivity 3) and Sort by Color. Writes
// img/colour-names-example.png (or the path given as the first argument).
//   node tools/figures/build_colour_names_figure.js [out.png]
const path = require('path');
const { launch } = require('../../tests/lib/browser');
const { start } = require('../../tests/lib/static-server');

const ROOT = path.join(__dirname, '..', '..');
const OUT = process.argv[2] || path.join(ROOT, 'img', 'colour-names-example.png');

(async () => {
  const { server, baseUrl } = await start();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 820 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
    await page.setInputFiles('#fileInput', path.join(ROOT, 'example-colour-names.fa'));
    await page.waitForFunction(() => typeof state !== 'undefined' && state.seqs && state.seqs.length === 12, null, { timeout: 10000 });
    await page.evaluate(() => {
      document.getElementById('colourSimilarityChars').value = 10;
      document.getElementById('colourSimilarityThreshold').value = 3;
      document.getElementById('colourAutoButton').click();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getElementById('colourSortButton').click());
    await page.waitForTimeout(800);
    // close menus, then capture the menu bar down to the last sequence
    await page.mouse.click(5, 815);
    await page.waitForTimeout(300);
    const clip = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#alignmentContainer .seq-line')];
      const bottom = Math.max(...rows.map(r => r.getBoundingClientRect().bottom));
      return { x: 0, y: 0, width: 1400, height: Math.min(Math.ceil(bottom) + 6, 820) };
    });
    await page.screenshot({ path: OUT, clip });
    const groups = await page.evaluate(() => new Set(state.seqs.map(s => (typeof colourState !== 'undefined' && colourState.mappings.get(s.header)) || '')).size);
    console.log(JSON.stringify({ wrote: OUT, clip, colourGroups: groups, errors }));
  } finally {
    await browser.close();
    server.close();
  }
})();
