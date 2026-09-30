// Colour / marking conflict probe.
//
// Every colouring or marking feature is a "layer" with apply() and clear(), driven through
// the app's own functions (the ones its buttons call, or the state + redraw path a snapshot
// uses). For each pair of layers, on a fresh page:
//   run 1: A, B -> sig AB; redraw -> sig ABr; clear B -> sig AB-B; clear A -> sig AB-B-A
//   run 2: B, A -> sig BA; clear A -> sig BA-A
// Each layer alone gives sig A (and clear -> should be the empty look again).
// A "sig" is the computed look of one target residue (row 2, column 10), its name cell
// and its row, in DOM mode; a separate pass samples Canvas mode pixels.
//
// Usage: node dev-tools/colour-conflicts/probe.js [--only a,b] [--canvas]
// Writes dev-tools/colour-conflicts/results.json.
const fs = require('fs');
const path = require('path');
const { start } = require('../../tests/lib/static-server');
const { launch } = require('../../tests/lib/browser');

const ROW = 2, COL = 10;

// 12 sequences, 60 columns, two groups (rows 0-5 / 6-11) differing at columns 10, 20, 30,
// so SNP grouping finds them and paints the target column. Column 5 is fully conserved.
function fasta() {
  let x = 7;
  const r = () => { x = (x * 16807) % 2147483647; return x; };
  const base = Array.from({ length: 60 }, () => 'ACGT'[r() % 4]);
  let out = '';
  for (let i = 0; i < 12; i++) {
    const s = base.slice();
    [10, 20, 30].forEach(c => { s[c] = i < 6 ? 'G' : 'C'; });
    [40, 45].forEach(c => { if (i % 3 === 0) s[c] = 'ACGT'[(i + c) % 4]; });
    out += `>seq${i}\n${s.join('')}\n`;
  }
  return out;
}

// apply / clear run inside the page; `await` is allowed.
const LAYERS = {
  'row-sel':     { label: 'Row selection', apply: `state.selectedRows.add(${ROW}); updateRowSelections();`,
                   clear: `state.selectedRows.delete(${ROW}); updateRowSelections();` },
  'col-sel':     { label: 'Column selection', apply: `state.selectedColumns.add(${COL}); updateColumnSelections();`,
                   clear: `state.selectedColumns.delete(${COL}); updateColumnSelections();` },
  'res-sel':     { label: 'Residue selection', apply: `state.selectedNucs.set(${ROW}, new Set([${COL - 1},${COL},${COL + 1}])); refreshNucleotideSelectionsImmediate();`,
                   clear: `state.selectedNucs.delete(${ROW}); refreshNucleotideSelectionsImmediate();` },
  'edit-cell':   { label: 'Edit cell (Type tool)', apply: `if (!state.editModeActive) el('editToggleButton').click(); el('editResidueButton').click(); state.editCell = { row: ${ROW}, pos: ${COL} }; updateEditActiveCell();`,
                   clear: `state.editCell = null; updateEditActiveCell(); if (state.editModeActive) el('editToggleButton').click();` },
  'search':      { label: 'Search hit', apply: `searchMotif({ motif: state.seqs[${ROW}].seq.slice(${COL - 2}, ${COL + 3}), color: '#ffff00', bothStrands: false, useRegex: false, maxMismatches: 0, suppressMessage: true });`,
                   clear: `clearAllSearches(true);` },
  'tsd-colour':  { label: 'TSD mark (colour)', apply: `state.tsdMarkStyle = 'color'; state.tsdMarkColor = '#00e5ff'; state.tsdMarks = new Map([[${ROW}, new Set([${COL}])]]); renderAlignment({ deferConservation: true });`,
                   clear: `state.tsdMarks = new Map(); renderAlignment({ deferConservation: true });` },
  'tsd-bold':    { label: 'TSD mark (bold)', apply: `state.tsdMarkStyle = 'bold'; state.tsdMarks = new Map([[${ROW}, new Set([${COL}])]]); renderAlignment({ deferConservation: true });`,
                   clear: `state.tsdMarks = new Map(); renderAlignment({ deferConservation: true });` },
  'repeat':      { label: 'Repeat highlight', apply: `const info = { segs: [[${COL - 2}, ${COL + 3}]], row: ${ROW}, color: '#ff00ff' }; state.repeatHighlights.set('probe', info); _paintRepeatHighlight(info, true);`,
                   clear: `_clearRepeatHighlights();` },
  'snp-groups':  { label: 'SNP groups (names + letters)', apply: `await clusterSequences();`,
                   clear: `clearTypePaint();` },
  'name-colour': { label: 'Name colour', apply: `colourState.mappings.set(state.seqs[${ROW}].header, '#ff8800'); applyColourToSeqNames(colourState.mappings);`,
                   clear: `colourState.mappings.delete(state.seqs[${ROW}].header); applyColourToSeqNames(colourState.mappings);` },
  'trim':        { label: 'Trim preview', apply: `state.trimBoundaries = { leftTrimEnd: ${COL + 2}, rightTrimStart: 55 }; renderAlignment();`,
                   clear: `_clearTrimPreview(); renderAlignment();` },
  'soft-trim':   { label: 'Soft trim', apply: `state.softTrimBoundaries = { leftTrimEnd: ${COL + 2}, rightTrimStart: 55 }; renderAlignment();`,
                   clear: `state.softTrimBoundaries = null; renderAlignment();` },
  'diffs':       { label: 'Highlight diffs', apply: `el('highlightDiffs').click();`, clear: `el('highlightDiffs').click();` },
  'var-sites':   { label: 'Variable sites only', apply: `el('varSitesOnly').click();`, clear: `el('varSitesOnly').click();` },
  'codon':       { label: 'Codon analysis', apply: `el('codonAnalysis').click();`, clear: `el('codonAnalysis').click();` },
  'block-mask':  { label: '2D block mask', apply: `computeAndShowBlockMask();`, clear: `clearBlockMask();` },
  'scheme-nt':   { label: 'Colours: Nucleotide', apply: `const s = el('colorSchemeSelect'); s.value = 'nucleotide'; s.dispatchEvent(new Event('change', { bubbles: true }));`,
                   clear: `const s = el('colorSchemeSelect'); s.value = 'monochrome'; s.dispatchEvent(new Event('change', { bubbles: true }));` },
};

// Computed look of the target residue, its name cell, its row, plus overlays.
const SIG = `(() => {
  const line = document.querySelector('.seq-line[data-seq-index="${ROW}"]');
  const span = line?.querySelector('.seq-data > span[data-pos="${COL}"]');
  const name = line?.querySelector('.seq-name');
  const pick = (e, props) => { if (!e) return null; const cs = getComputedStyle(e); const o = {}; props.forEach(p => { o[p] = cs[p]; }); return o; };
  const cell = pick(span, ['backgroundColor', 'color', 'fontWeight', 'opacity', 'display', 'textDecorationLine', 'outlineStyle', 'boxShadow',
    'backgroundImage', 'fontFamily', 'fontStyle', 'textDecorationColor']);
  if (cell && span) cell.text = span.textContent;
  return {
    cell,
    name: pick(name, ['backgroundColor', 'color', 'fontWeight', 'boxShadow', 'backgroundImage']),
    row: pick(line, ['backgroundColor', 'outlineStyle']),
    overlay: document.querySelectorAll('.block-mask-layer').length,
  };
})()`;

async function freshPage(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1300, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(async (f) => {
    el('fastaInput').value = f;
    await parseAndRender(false);
    document.getElementById('modeSingle').checked = true; onModeChange();
  }, fasta());
  await page.waitForTimeout(150);
  return { page, errors };
}

async function run(page, code) {
  await page.evaluate(`(async () => { ${code} })()`);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  // Several controls redraw through a 50 ms debounce; SETTLE_MS covers it (default 60 was
  // measured to race with Highlight diffs / Variable sites)
  await page.waitForTimeout(+(process.env.SETTLE_MS || 300));
}
const sig = page => page.evaluate(SIG);

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
  const ids = Object.keys(LAYERS).filter(id => !only || only.includes(id));
  const { server, baseUrl } = await start();
  const browser = await launch();
  const out = { row: ROW, col: COL, layers: {}, single: {}, pairs: {}, canvas: {} };
  for (const id of ids) out.layers[id] = LAYERS[id].label;
  try {
    const { page: p0 } = await freshPage(browser, baseUrl);
    out.base = await sig(p0);
    await p0.close();
    for (const a of ids) {
      const { page, errors } = await freshPage(browser, baseUrl);
      await run(page, LAYERS[a].apply);
      const on = await sig(page);
      await run(page, 'renderAlignment();');
      const redraw = await sig(page);
      await run(page, LAYERS[a].clear);
      const off = await sig(page);
      out.single[a] = { on, redraw, off, errors };
      await page.close();
      process.stdout.write(`single ${a}\n`);
    }
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i], b = ids[j];
        const r = {};
        {
          const { page, errors } = await freshPage(browser, baseUrl);
          await run(page, LAYERS[a].apply); await run(page, LAYERS[b].apply);
          r.ab = await sig(page);
          await run(page, 'renderAlignment();');
          r.abRedraw = await sig(page);
          await run(page, LAYERS[b].clear);
          r.abClearB = await sig(page);
          await run(page, LAYERS[a].clear);
          r.abClearBoth = await sig(page);
          r.errorsAB = errors;
          await page.close();
        }
        {
          const { page, errors } = await freshPage(browser, baseUrl);
          await run(page, LAYERS[b].apply); await run(page, LAYERS[a].apply);
          r.ba = await sig(page);
          await run(page, LAYERS[a].clear);
          r.baClearA = await sig(page);
          r.errorsBA = errors;
          await page.close();
        }
        out.pairs[`${a}|${b}`] = r;
        process.stdout.write(`pair ${a} | ${b}\n`);
      }
    }
    if (args.includes('--canvas')) {
      // Canvas mode: does each layer change the pixels at the target cell / name?
      for (const a of ['base', ...ids]) {
        const { page } = await freshPage(browser, baseUrl);
        if (a !== 'base') await run(page, LAYERS[a].apply);
        await run(page, `document.getElementById('modeCanvas').checked = true; onModeChange();`);
        await page.waitForTimeout(500);
        out.canvas[a] = await page.evaluate(({ ROW, COL }) => {
          const c = document.getElementById('alignmentCanvas');
          const m = _canvasState.metrics; if (!c || !m) return null;
          const dpr = devicePixelRatio;
          const ctx = c.getContext('2d');
          const px = (x, y) => Array.from(ctx.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data).slice(0, 3).join(',');
          const NAME_W = m.nameW, CHAR_W = m.charW, pitch = _canvasState.rowPitch, SCALE_H = m.charH;
          const y = SCALE_H + ROW * pitch + 2;
          return { cell: px(NAME_W + COL * CHAR_W + 1, y), name: px(4, y), metrics: Object.keys(m) };
        }, { ROW, COL });
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  const file = path.join(__dirname, only ? 'results-partial.json' : 'results.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log('wrote', file);
}

main().catch(e => { console.error(e); process.exit(1); });
