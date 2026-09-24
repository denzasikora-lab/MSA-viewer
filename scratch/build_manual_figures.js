// Screenshots for manual sections 1.4, 5.4, 8.4 and 9.4, from the files in examples/.
// Writes raw captures plus element boxes to scratch/_fig/; scratch/build_manual_figures.py
// then labels and assembles them into img/.
//   node scratch/build_manual_figures.js && python scratch/build_manual_figures.py
const fs = require('fs');
const path = require('path');
const { launch } = require('../tests/lib/browser');
const { start } = require('../tests/lib/static-server');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, '_fig');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const { server, baseUrl } = await start();
  const b = await launch();
  const newPage = async (file, vp) => { const p = await b.newPage({ viewport: vp || { width: 1400, height: 820 }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p._errs = errs; await p.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' }); await p.setInputFiles('#fileInput', path.join(ROOT, 'examples', file)); await p.waitForTimeout(2500); return p; };
  const report = {};

  // ---- 1.4 Interface layout: svk_k4.fa, Display menu open ------------------------------
  {
    const p = await newPage('svk_k4.fa');
    await p.hover('.section-header[data-section="display"]');
    await p.waitForTimeout(500);
    const boxes = await p.evaluate(() => {
      const box = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
      // version + filename sit together in the top-right corner
      const v = document.getElementById('versionIndicator').getBoundingClientRect();
      const f = document.getElementById('sourceInfo').getBoundingClientRect();
      const x0 = Math.min(v.left, f.left), y0 = Math.min(v.top, f.top), x1 = Math.max(v.right, f.right), y1 = Math.max(v.bottom, f.bottom);
      return {
        // the whole menu row: every visible top-bar control from Input to Actions
        menus: (() => {
          const skip = new Set(['versionIndicator', 'sourceInfo']);
          const rs = [...document.querySelectorAll('#controls button, #controls .section-header')]
            .filter(e => !skip.has(e.id) && !e.closest('#versionIndicator, #sourceInfo'))
            .map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.top < 30 && r.bottom < 40);
          const x0 = Math.min(...rs.map(r => r.left)), y0 = Math.min(...rs.map(r => r.top));
          const x1 = Math.max(...rs.map(r => r.right)), y1 = Math.max(...rs.map(r => r.bottom));
          return { x: x0 - 3, y: y0 - 3, w: x1 - x0 + 6, h: y1 - y0 + 6 };
        })(),
        openMenu: box('#display-controls'),
        modeSwitch: box('#quickModeSwitch'),
        viewport: box('#alignmentContainer'),
        versionFile: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
        versionText: document.getElementById('versionIndicator').textContent.trim(),
        fileText: document.getElementById('sourceInfo').textContent.trim()
      };
    });
    await p.screenshot({ path: path.join(OUT, 'layout.png') });
    report.layout = boxes; report.layoutErrors = p._errs;
    await p.close();
  }

  // ---- 5.4 Codon analysis: synth_msa.fa ----------------------------------------------
  {
    const p = await newPage('synthetic/synth_msa.fa', { width: 1300, height: 600 });
    await p.evaluate(() => {
      document.getElementById('modeSingle').checked = true; onModeChange();
      // conservation shading off so the codon underlines are visible
      for (const id of ['enableBlack', 'enableDark', 'enableLight']) { const e = document.getElementById(id); e.checked = false; e.dispatchEvent(new Event('change', { bubbles: true })); }
      const c = document.getElementById('codonAnalysis'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await p.waitForTimeout(1500);
    const info = await p.evaluate(() => ({
      codonOn: !!state._codonData, frame: state._codonActiveFrame,
      stops: state._codonData.stops.map((s, i) => [state.seqs[i].header, s.length]),
      frameshifts: state._codonData.frameShifts.map((s, i) => [state.seqs[i].header, s.length]),
      rows: state.seqs.map(s => s.header),
      // which 1-based columns the page actually marks, per row
      marked: Object.fromEntries(state.seqs.map((s, i) => [s.header, {
        syn: [...document.querySelectorAll(`.seq-line[data-seq-index="${i}"] .seq-data > span.codon-syn`)].map(e => +e.dataset.pos + 1),
        nonsyn: [...document.querySelectorAll(`.seq-line[data-seq-index="${i}"] .seq-data > span.codon-nonsyn`)].map(e => +e.dataset.pos + 1)
      }]))
    }));
    // Columns 1-60 only: the synthetic CDS is columns 1-60 (examples/synthetic/README.md);
    // past it, frame 0 reads non-coding sequence and marks stops that mean nothing
    const cr = await p.evaluate(() => {
      const c = document.getElementById('alignmentContainer').getBoundingClientRect();
      const lines = [...document.querySelectorAll('#alignmentContainer .seq-line')];
      const last = lines[lines.length - 1].getBoundingClientRect();
      const sp = document.querySelector('.seq-line[data-seq-index="0"] .seq-data > span[data-pos="59"]').getBoundingClientRect();
      return { x: c.left, y: c.top, w: sp.right - c.left + 4, h: last.bottom - c.top + 30 };
    });
    await p.screenshot({ path: path.join(OUT, 'codon.png'), clip: { x: cr.x, y: cr.y, width: cr.w, height: cr.h } });
    report.codon = info; report.codonErrors = p._errs;
    await p.close();
  }

  // ---- 8.4 Move NoGaps and Slide KeepGaps: real drags on synth_msa.fa ------------------
  {
    const p = await newPage('synthetic/synth_msa.fa', { width: 1300, height: 600 });
    await p.evaluate(() => { document.getElementById('modeSingle').checked = true; onModeChange(); });
    await p.waitForTimeout(800);
    await p.click('#editToggleButton');
    await p.waitForTimeout(300);
    const clip = async (name) => {
      // first 30 columns of all six rows, names included
      const r = await p.evaluate(() => {
        const rows = [...document.querySelectorAll('.seq-line[data-seq-index]')];
        const first = rows[0].getBoundingClientRect(), last = rows[rows.length - 1].getBoundingClientRect();
        const span30 = rows[0].querySelector('.seq-data > span[data-pos="29"]').getBoundingClientRect();
        return { x: Math.max(0, first.left - 2), y: first.top - 3, w: span30.right - first.left + 6, h: last.bottom - first.top + 6 };
      });
      await p.screenshot({ path: path.join(OUT, name), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    };
    const drag = async (tool, row, pos, cols) => {
      await p.click(tool === 'moveNoGaps' ? '#editMoveNoGapsButton' : '#editSlideKeepGapsButton');
      await p.waitForTimeout(200);
      const s = await p.evaluate(({ row, pos }) => {
        const sp = document.querySelector(`.seq-line[data-seq-index="${row}"] .seq-data > span[data-pos="${pos}"]`);
        const r = sp.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
      }, { row, pos });
      await p.mouse.move(s.x, s.y); await p.mouse.down();
      const steps = Math.abs(cols) * 4;
      for (let i = 1; i <= steps; i++) { await p.mouse.move(s.x + (cols * s.w) * i / steps, s.y); await p.waitForTimeout(15); }
      await p.mouse.up();
      await p.mouse.move(5, 590); await p.waitForTimeout(700); // off the alignment, so no tooltip
    };
    const seqOf = (i) => p.evaluate(i => state.seqs[i].seq.slice(0, 30), i);
    const rows = await p.evaluate(() => state.seqs.map(s => s.header));
    const del = rows.indexOf('beta_del'), fs1 = rows.indexOf('beta_fs');
    report.move = { row: 'beta_del', before: await seqOf(del) };
    await clip('move_before.png');
    // grab the residue at column 13 (0-based 12) and drag 3 columns right: closes the 3-base gap
    await drag('moveNoGaps', del, 12, 3.5);
    report.move.after = await seqOf(del);
    await clip('move_after.png');
    report.slide = { row: 'beta_fs', before: await seqOf(fs1) };
    // Slide KeepGaps: grab column 6 (0-based 5), just right of the one-base gap, drag 1 left
    await drag('slideKeepGaps', fs1, 5, -1);
    report.slide.after = await seqOf(fs1);
    await clip('slide_after.png');
    report.editErrors = p._errs;
    await p.close();
  }

  // ---- 9.4 Tree window: 12 SVK copies, three per subfamily ---------------------------
  {
    const p = await newPage('svk_k4.fa', { width: 1300, height: 900 });
    const picked = await p.evaluate(() => {
      const want = []; const byGroup = {};
      state.seqs.forEach((s, i) => { const g = s.header.slice(0, 2); (byGroup[g] ||= []).push(i); });
      Object.values(byGroup).forEach(ix => want.push(...ix.slice(0, 3)));
      state.selectedRows = new Set(want);
      openTreeBuilder();
      return want.map(i => state.seqs[i].header);
    });
    await p.waitForTimeout(1500);
    const tree = await p.evaluate(() => ({ summary: document.getElementById('treeBuilderSummary').textContent, newick: document.getElementById('treeNewickOutput').value.slice(0, 200), svg: !!document.querySelector('#treeBuilderDialog svg') }));
    // title, toolbar and drawing only: the dialog is taller than the window
    const tc = await p.evaluate(() => {
      const d = document.getElementById('treeBuilderDialog').getBoundingClientRect();
      const svg = document.querySelector('#treeBuilderDialog svg');
      let box = svg.parentElement; // the resizable drawing box around the svg
      const r = box.getBoundingClientRect();
      return { x: d.left, y: d.top, w: d.width, h: r.bottom - d.top + 8 };
    });
    await p.screenshot({ path: path.join(OUT, 'tree.png'), clip: { x: tc.x, y: tc.y, width: tc.w, height: tc.h } });
    report.tree = { picked, ...tree }; report.treeErrors = p._errs;
    await p.close();
  }

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
  await b.close(); server.close();
})();
