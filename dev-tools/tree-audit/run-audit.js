'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ALIGN_SOURCE = path.join(__dirname, '..', '..', 'script' + '.js');
const DRAW_SOURCE = path.join(__dirname, '..', '..', 'tree-draw' + '.js');
const ALIGN_BASENAME = path.basename(ALIGN_SOURCE);
const DRAW_BASENAME = path.basename(DRAW_SOURCE);

const FIXTURES = [
  { id: 'ident-raw', a: 'ACGTACGT', b: 'ACGTACGT', model: 'raw' },
  { id: 'ident-jc', a: 'ACGTACGT', b: 'ACGTACGT', model: 'jc69' },
  { id: 'ident-k80', a: 'ACGTACGT', b: 'ACGTACGT', model: 'k80' },
  { id: 'ti-raw', a: 'ACGTACGT', b: 'GCGTACGT', model: 'raw' },
  { id: 'ti-jc', a: 'ACGTACGT', b: 'GCGTACGT', model: 'jc69' },
  { id: 'ti-k80', a: 'ACGTACGT', b: 'GCGTACGT', model: 'k80' },
  { id: 'tv-raw', a: 'ACGTACGT', b: 'CCGTACGT', model: 'raw' },
  { id: 'tv-jc', a: 'ACGTACGT', b: 'CCGTACGT', model: 'jc69' },
  { id: 'tv-k80', a: 'ACGTACGT', b: 'CCGTACGT', model: 'k80' },
  { id: 'sat-jc', a: 'ACGTACGT', b: 'TGCATGCA', model: 'jc69' },
  { id: 'sat-k80', a: 'ACGTACGT', b: 'TGCATGCA', model: 'k80' },
  { id: 'gap-raw', a: 'ACGTACGT', b: '--------', model: 'raw' },
  { id: 'utrans', a: 'ACGUACGU', b: 'ACGTACGT', model: 'raw' },
  { id: 'ambig', a: 'ACGTACGN', b: 'ACGTACGT', model: 'raw' }
];

const TREE_SEQS = [
  { header: 'Alpha one', seq: 'ACGTACGT' },
  { header: 'Alpha two', seq: 'ACGTACGT' },
  { header: 'beta', seq: 'GCGTACGT' },
  { header: "O'Brien", seq: 'ACGTACGT' }
];

function loadTreeFns() {
  const src = fs.readFileSync(ALIGN_SOURCE, 'utf8');
  const start = src.indexOf('function _treeIsBase');
  const end = src.indexOf('function getTreeInputSequences');
  if (start < 0 || end < 0 || end <= start) throw new Error('tree functions not found');
  const sandbox = {};
  vm.runInNewContext(src.slice(start, end), sandbox, { filename: 'tree-fns.js' });
  return sandbox;
}

function cite(text, re) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return { line: i + 1, quote: lines[i].trim() };
  }
  return null;
}

// A defect is "present" while its original line is still in the source; once fixed, the
// line of the fix is cited instead (fixed 2026-09-27 on main, commit caf67b9).
function defectStatus(id, file, text, defectRe, fixRe) {
  const d = cite(text, defectRe);
  if (d) return { id, file, status: 'present', line: d.line, quote: d.quote };
  const f = cite(text, fixRe);
  return { id, file, status: f ? 'fixed' : 'unknown', line: f ? f.line : null, quote: f ? f.quote : null };
}

function collectAudit() {
  const fns = loadTreeFns();
  const alignText = fs.readFileSync(ALIGN_SOURCE, 'utf8');
  const drawText = fs.readFileSync(DRAW_SOURCE, 'utf8');
  const distances = FIXTURES.map(function (row) {
    const distance = fns._modelPairDistance(row.a, row.b, row.model);
    return { id: row.id, model: row.model, value: Number.isNaN(distance) ? 'undefined (no shared base)' : Number.isFinite(distance) ? distance : 'Infinity' };
  });
  let zoomIn = 1;
  let zoomOut = 1;
  for (let i = 0; i < 30; i++) {
    zoomIn = Math.min(4, zoomIn * 1.25);
    zoomOut = Math.max(0.25, zoomOut / 1.25);
  }
  const zoomFit = Number(drawText.match(/act === 'zoom-fit'\) st\.zoom = ([0-9.]+);/)[1]);
  const pngScale = Number(drawText.match(/var scale = ([0-9.]+);\s*\/\/ 2x/)[1]);
  // Fit: zoom 1 is the fitted size (the drawing is computed from the panel width); the real
  // defect was the tooltip wording and a 12px padding overflow, both fixed.
  const fit = defectStatus('zoom-fit', DRAW_BASENAME, drawText, /title="Fit to width"/, /data-act="zoom-fit" title="Back to 100%/);
  const gap = defectStatus('no-overlap', ALIGN_BASENAME, alignText, /compared === 0\) return 1;/, /compared === 0\) return NaN;/);
  const tie = defectStatus('nj-tie', ALIGN_BASENAME, alignText, /if \(q < minQ\) \{/, /Math\.abs\(q - minQ\) <= tol && dist\[a\]\[b\] < dist\[minI\]\[minJ\]/);
  return {
    distances: distances,
    upgma_newick: fns.buildUPGMATreeFromAlignment(TREE_SEQS, 'raw').newick,
    nj_newick: fns.buildNJTreeFromAlignment(TREE_SEQS, 'raw').newick,
    zoom_after_30_in: zoomIn,
    zoom_after_30_out: zoomOut,
    zoom_after_fit: zoomFit,
    png_scale: pngScale,
    defects: [fit, gap, tie]
  };
}

function main() {
  const audit = collectAudit();
  const text = JSON.stringify(audit, function (_key, value) {
    return value === Infinity || value === -Infinity ? 'Infinity' : value;
  });
  fs.writeFileSync(path.join(__dirname, 'audit-report.json'), text);
  process.stdout.write(text + '\n');
}

module.exports = {
  FIXTURES, TREE_SEQS, ALIGN_BASENAME, DRAW_BASENAME, loadTreeFns, collectAudit
};

if (require.main === module) main();
