// Mechanical oracle for block-bicluster.js. Tests observable behavior and
// known ground truth from the designed test fixtures, not internal
// implementation details. Exit 0 = pass. Never trust a "done" claim without
// this passing FRESH in the same run (see ORCHESTRATION-MANUAL.md).
'use strict';
const fs = require('fs');
const path = require('path');
const BC = require('../../block-bicluster.js');

const FIXDIR = path.join(__dirname, '..', 'fixtures', 'blockmask', 'testsets');
let failures = [];

function check(name, cond, detail) {
  if (!cond) failures.push(name + (detail ? ' -- ' + detail : ''));
}

// ---- 1. Runs without throwing, on a real alignment --------------------
let mask;
try {
  const fa = fs.readFileSync(path.join(FIXDIR, 'mosaic_subset.aln.fa'), 'utf8');
  mask = BC.computeBiclusterMask(fa, {});
  check('mosaic_subset: computeBiclusterMask returns an object', mask && typeof mask === 'object');
} catch (e) {
  check('mosaic_subset: computeBiclusterMask does not throw', false, e.message);
}

if (mask) {
  check('has n_rows/n_cols/blocks', typeof mask.n_rows === 'number' && typeof mask.n_cols === 'number' && Array.isArray(mask.blocks));

  // ---- 2. Tiling invariant: every column's rows are covered exactly once ----
  if (Array.isArray(mask.blocks) && mask.n_rows && mask.n_cols) {
    const covering = []; // per column, array of row-coverage counts
    for (let c = 0; c < mask.n_cols; c++) covering.push(new Uint8Array(mask.n_rows));
    for (const b of mask.blocks) {
      const rows = (b.rows === 'all') ? Array.from({ length: mask.n_rows }, (_, i) => i) : b.rows;
      for (let c = b.col_start; c <= b.col_end; c++) {
        for (const r of rows) {
          if (c >= 0 && c < mask.n_cols && r >= 0 && r < mask.n_rows) covering[c][r]++;
        }
      }
    }
    let badCols = 0;
    for (let c = 0; c < mask.n_cols; c++) {
      for (let r = 0; r < mask.n_rows; r++) {
        if (covering[c][r] !== 1) { badCols++; break; }
      }
    }
    check('tiling: every (row,col) covered exactly once', badCols === 0, badCols + ' columns have a row covered 0 or >1 times');
  }

  // ---- 3. Known design: mosaic_subset has a real 5-row shared-tail group ----
  const rowSplitBlocks = (mask.blocks || []).filter(b => b.rows !== 'all');
  check('mosaic_subset: at least one row-split block found', rowSplitBlocks.length > 0,
    'zero row-split blocks -- the known 5-of-20 shared-tail group was not detected at all');
  const plausibleGroup = rowSplitBlocks.find(b => Array.isArray(b.rows) && b.rows.length >= 3 && b.rows.length <= 8);
  check('mosaic_subset: a row-split block of plausible size (3-8 rows) exists', !!plausibleGroup,
    'row-split block sizes found: ' + rowSplitBlocks.map(b => b.rows.length).join(','));
}

// ---- 4. synth_unbalanced.aln.fa: designed 24-main / 6-alt split ----------
try {
  const fa2 = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'blockmask', 'synth_unbalanced.aln.fa'), 'utf8');
  const mask2 = BC.computeBiclusterMask(fa2, {});
  const splits2 = (mask2.blocks || []).filter(b => b.rows !== 'all');
  const sixGroup = splits2.find(b => Array.isArray(b.rows) && b.rows.length >= 4 && b.rows.length <= 8);
  check('synth_unbalanced: a row-split block of plausible size (4-8 rows) exists', !!sixGroup,
    'row-split block sizes found: ' + splits2.map(b => b.rows.length).join(','));
} catch (e) {
  check('synth_unbalanced: computeBiclusterMask does not throw', false, e.message);
}

// ---- 5. clean_core.aln.fa: should NOT be split by rows at all (uniform) --
try {
  const fa3 = fs.readFileSync(path.join(FIXDIR, 'clean_core.aln.fa'), 'utf8');
  const mask3 = BC.computeBiclusterMask(fa3, {});
  const splits3 = (mask3.blocks || []).filter(b => b.rows !== 'all');
  check('clean_core: no spurious row-splits on a uniform alignment', splits3.length === 0,
    'found ' + splits3.length + ' row-split block(s) where none should exist');
} catch (e) {
  check('clean_core: computeBiclusterMask does not throw', false, e.message);
}

if (failures.length) {
  console.log('FAIL (' + failures.length + '):');
  failures.forEach(f => console.log('  - ' + f));
  process.exit(1);
} else {
  console.log('PASS: all oracle checks passed');
  process.exit(0);
}
