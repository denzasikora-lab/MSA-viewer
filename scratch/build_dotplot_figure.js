// Screenshot for manual section 9.7: a dot plot of SVK SINE copies (default: row 21, K3_499, against itself)
// from examples/svk_k4.fa, with the hover preview showing. Writes img/dotplot-example.png.
//   node scratch/build_dotplot_figure.js [rowA] [rowB]
const path = require('path');
const { launch } = require('../tests/lib/browser');
const { start } = require('../tests/lib/static-server');
(async () => {
  const rowA = +(process.argv[2] || 20), rowB = +(process.argv[3] || 20);
  const { server, baseUrl } = await start();
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 860 }, deviceScaleFactor: 2 });
  await p.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
  await p.setInputFiles('#fileInput', path.join(__dirname, '..', 'examples', 'svk_k4.fa'));
  await p.waitForTimeout(2500);
  const info = await p.evaluate(async ({ rowA, rowB }) => {
    const a = state.seqs[rowA], b = state.seqs[rowB];
    document.querySelector('input[name="dotPlotMode"][value="doter"]').checked = true; _dotOnModeChange();
    document.getElementById('dotPlotWindow').value = 11;
    const th = document.getElementById('dotPlotThreshold'); th.value = 65; th.dispatchEvent(new Event('input'));
    document.getElementById('dotPlotContextRadius').value = 20;
    await openDotPlot(a.seq.replace(/[-. ]/g, ''), b.seq.replace(/[-. ]/g, ''), a.header, b.header,
      { rowIndexA: rowA, rowIndexB: rowB, alignedSeqA: a.seq, alignedSeqB: b.seq });
    const S = _dotPlotState;
    return { a: a.header, b: b.header, rows: S.rows, cols: S.cols, regions: S.regions.slice(0, 6).map(r => `A${r.row + 1}/B${r.col + 1} len${r.length} ${Math.round(r.avgScore * 100)}%`) };
  }, { rowA, rowB });
  console.log(JSON.stringify(info));
  // Hover the middle of the strongest off-main-diagonal run, else the main diagonal
  const target = await p.evaluate(() => {
    const S = _dotPlotState;
    const r = S.regions.find(x => Math.abs(x.diagonal) > 10) || S.regions[0];
    return r ? { row: r.row + Math.floor(r.length / 2), col: r.col + Math.floor(r.length / 2) } : { row: 60, col: 60 };
  });
  const pos = await p.evaluate(({ row, col }) => {
    const ov = document.getElementById('dotPlotOverlay').getBoundingClientRect();
    const c = _dotCellToScreen(row, col);
    return { x: ov.left + c.x, y: ov.top + c.y };
  }, target);
  await p.mouse.move(pos.x, pos.y);
  await p.waitForTimeout(400);
  const out = path.join(__dirname, '..', 'img', 'dotplot-example.png');
  await p.locator('#dotPlotDialog').screenshot({ path: out });
  console.log('wrote', out, JSON.stringify(target));
  await b.close(); server.close();
})();
