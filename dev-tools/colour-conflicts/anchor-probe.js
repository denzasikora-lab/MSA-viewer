// Anchoring probe: after an edit, is each mark still on the same residue of the same
// sequence? A mark is recorded as (sequence name, residue number counted without gaps);
// for a gap, (name, "gap after residue n"). Before and after each action the sets are
// compared: "follows" = same set, otherwise the marks that moved, vanished or appeared.
//
// Usage: node dev-tools/colour-conflicts/anchor-probe.js  -> anchor-results.json
const fs = require('fs');
const path = require('path');
const { start } = require('../../tests/lib/static-server');
const { launch } = require('../../tests/lib/browser');

function fasta() {
  let x = 11;
  const r = () => { x = (x * 16807) % 2147483647; return x; };
  const base = Array.from({ length: 60 }, () => 'ACGT'[r() % 4]);
  let out = '';
  for (let i = 0; i < 12; i++) {
    const s = base.slice();
    [10, 20, 30].forEach(c => { s[c] = i < 6 ? 'G' : 'C'; });
    out += `>seq${i}\n${s.join('')}\n`;
  }
  return out;
}

// apply: mark residues around row 2 / column 10. detect: CSS selector of marked residue spans
// (names: of marked name cells).
const LAYERS = {
  'search':      { apply: `searchMotif({ motif: state.seqs[2].seq.slice(8, 13), color: '#ff0', bothStrands: false, useRegex: false, maxMismatches: 0, suppressMessage: true });`, cells: '[data-search-hit]' },
  'row-sel':     { apply: `state.selectedRows.add(2); updateRowSelections();`, rows: '.seq-line.selected[data-seq-index]' },
  'col-sel':     { apply: `[10, 11].forEach(c => state.selectedColumns.add(c)); updateColumnSelections();`, cells: '.column-selected' },
  'res-sel':     { apply: `state.selectedNucs.set(2, new Set([9, 10, 11])); refreshNucleotideSelectionsImmediate();`, state: `[...state.selectedNucs].flatMap(([r, s]) => [...s].map(p => [r, p]))` },
  'tsd':         { apply: `state.tsdMarkStyle = 'color'; state.tsdMarks = new Map([[2, new Set([10, 11])]]); renderAlignment({ deferConservation: true });`, cells: '.tsd-mark' },
  'repeat':      { apply: `const info = { segs: [[8, 13]], row: 2, color: '#f0f' }; state.repeatHighlights.set('p', info); _paintRepeatHighlight(info, true);`, cells: '[data-repeat-hl]' },
  'snp-groups':  { apply: `await clusterSequences();`, cells: '.diagnostic-mutation', names: '.seq-name.cluster-colored' },
  'name-colour': { apply: `colourState.mappings.set(state.seqs[2].header, '#f80'); applyColourToSeqNames(colourState.mappings);`, names: '.seq-name[style*="background"]' },
  'trim':        { apply: `state.trimBoundaries = { leftTrimEnd: 12, rightTrimStart: 55 }; renderAlignment();`, state: `state.trimBoundaries ? state.seqs.flatMap((q, r) => Array.from({ length: state.trimBoundaries.leftTrimEnd + 1 }, (_, p) => [r, p])) : []` },
};

// Actions a user commonly takes after marking something (all through app functions)
const ACTIONS = {
  'redraw':            `renderAlignment();`,
  'gap-col-left':      `state.selectedColumns = new Set([3]); insertGapColumn(); state.selectedColumns.clear(); updateColumnSelections();`,
  'gap-all-left(edit)':`if (!state.editModeActive) el('editToggleButton').click(); handleGeneDocGapToolClick(0, 3, 'insertGapAll'); el('editToggleButton').click();`,
  'gap-one-row(edit)': `if (!state.editModeActive) el('editToggleButton').click(); handleGeneDocGapToolClick(2, 3, 'insertGapSeq'); el('editToggleButton').click();`,
  'delete-row-above':  `deleteSequence(0);`,
  'move-row-to-top':   `state.selectedRows = new Set([2]); moveSelectedToTop(); state.selectedRows.clear(); updateRowSelections();`,
  'undo-after-gap':    `state.selectedColumns = new Set([3]); insertGapColumn(); state.selectedColumns.clear(); undoDelete();`,
};

const COLLECT = (layer) => `(() => {
  const L = ${JSON.stringify(layer)};
  const key = (r, p) => {
    const q = state.seqs[r]; if (!q) return null;
    let n = 0; for (let i = 0; i < p; i++) if (q.seq[i] !== '-' && q.seq[i] !== '.') n++;
    const ch = q.seq[p];
    return q.header + ':' + ((ch === '-' || ch === '.' || ch === undefined) ? 'gap-after-' + n : 'res' + (n + 1));
  };
  const out = new Set();
  if (L.cells) document.querySelectorAll('#alignmentContainer .seq-line[data-seq-index]:not(.consensus-line) .seq-data > span[data-pos]').forEach(sp => {
    if (!sp.matches(L.cells)) return;
    const k = key(+sp.closest('.seq-line').dataset.seqIndex, +sp.dataset.pos); if (k) out.add(k);
  });
  if (L.rows) document.querySelectorAll(L.rows).forEach(line => { const q = state.seqs[+line.dataset.seqIndex]; if (q) out.add(q.header + ':row'); });
  if (L.names) document.querySelectorAll('#alignmentContainer ' + L.names).forEach(n => { const q = state.seqs[+n.dataset.seqIndex]; if (q) out.add(q.header + ':name'); });
  if (L.state) (eval(L.state) || []).forEach(([r, p]) => { const k = key(r, p); if (k) out.add(k); });
  return [...out].sort();
})()`;

async function main() {
  const { server, baseUrl } = await start();
  const browser = await launch();
  const results = {};
  try {
    for (const [lid, L] of Object.entries(LAYERS)) {
      for (const [aid, act] of Object.entries(ACTIONS)) {
        const page = await browser.newPage({ viewport: { width: 1300, height: 800 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('dialog', d => d.accept());
        await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
        await page.evaluate(async f => { el('fastaInput').value = f; await parseAndRender(false); document.getElementById('modeSingle').checked = true; onModeChange(); }, fasta());
        await page.waitForTimeout(150);
        await page.evaluate(`(async () => { ${L.apply} })()`);
        await page.waitForTimeout(300);
        const before = await page.evaluate(COLLECT(L));
        await page.evaluate(`(async () => { ${act} })()`);
        await page.waitForTimeout(400);
        await page.evaluate(() => typeof flushPendingSpanRepaint === 'function' && flushPendingSpanRepaint());
        const after = await page.evaluate(COLLECT(L));
        const lost = before.filter(k => !after.includes(k)), gained = after.filter(k => !before.includes(k));
        results[`${lid}|${aid}`] = { before: before.length, after: after.length, lost, gained, errors };
        process.stdout.write(`${lid} | ${aid}: ${lost.length || gained.length ? `lost ${lost.length} gained ${gained.length}` : 'follows'}\n`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(__dirname, 'anchor-results.json'), JSON.stringify(results, null, 1));
}
main().catch(e => { console.error(e); process.exit(1); });
