/*
 * block-bicluster.js — row/column-symmetric block detection for an MSA.
 *
 * Replaces the reference-row + fixed-zone approach in block-mask.js with
 * split-and-merge biclustering (Horowitz & Pavlidis 1974 shape; Cheng &
 * Church 1999 coherence-score shape, adapted for categorical data): no
 * row is ever "the reference." A candidate block (a row set x a column
 * range) is scored directly from its own rows and columns; if it isn't
 * coherent enough, the ONE split (by row OR by column, whichever helps
 * more) that most improves coherence is taken, and each half is scored
 * again, recursively. Coverage/gap handling reuses this app's own
 * _computeVarSites distinction (Simmons & Ochoterena 2000): a gap outside
 * a row's own [first,last] real-base span is missing data and excluded;
 * a gap inside that span is a real deletion state, counted equally with
 * A/C/G/T. See reference/BICLUSTER_ALGORITHM_NOTES.md for the full
 * research this implements — read it before changing the formulas below.
 *
 * Pure functions, no DOM. Mirrors reference/block_bicluster.py exactly
 * (same names in snake_case) for the parity test in
 * tests/bicluster/parity.js — change both together.
 */
(function (root) {
  'use strict';

  var GAP = 4;
  var CODE = { a: 0, c: 1, g: 2, t: 3, A: 0, C: 1, G: 2, T: 3 };

  var DEFAULTS = {
    MIN_COL_COVERAGE: 3,     // a column needs >= this many covered rows to count toward coherence
    MIN_BLOCK_ROWS: 3,       // a block (or a split-off row group) smaller than this is never accepted
    MIN_BLOCK_COLS: 8,       // a block (or a split-off column range) narrower than this is never accepted
    MIN_SPLIT_GAIN: 0.05,    // a split must improve weighted coherence by at least this much to be taken
    MERGE_TOLERANCE: 0.05    // two adjacent same-row leaves merge if doing so costs less than this
  };

  function resolveParams(params) {
    var P = {}, k;
    for (k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) P[k] = DEFAULTS[k];
    if (params) for (k in params) if (params.hasOwnProperty(k) && params[k] != null) P[k] = params[k];
    return P;
  }

  // ---- parsing (same format as block-mask.js's parseAln) -----------------

  function parseAln(fastaText) {
    var names = [], seqs = [], cur = null;
    var lines = String(fastaText).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\s+$/, '');
      if (line.charAt(0) === '>') { names.push(line.slice(1)); cur = []; seqs.push(cur); }
      else if (cur !== null) { cur.push(line); }
    }
    var strs = seqs.map(function (parts) { return parts.join(''); });
    var L = 0;
    for (var j = 0; j < strs.length; j++) if (strs[j].length > L) L = strs[j].length;
    var A = [];
    for (var r = 0; r < strs.length; r++) {
      var row = new Int8Array(L);
      row.fill(GAP);
      var s = strs[r];
      for (var col = 0; col < s.length; col++) {
        var ch = s.charAt(col);
        row[col] = CODE.hasOwnProperty(ch) ? CODE[ch] : GAP;
      }
      A.push(row);
    }
    return { names: names, A: A, ncols: L };
  }

  // ---- coverage spans (Simmons & Ochoterena: terminal vs internal gap) --

  // Per row, its own [first, last] real-base (non-GAP) column index.
  // first === -1 means the row is entirely gaps (no real data at all).
  // A column position outside [first,last] for a row is missing data for
  // that row and must be excluded from any tally involving it; a GAP
  // *inside* [first,last] is a real deletion state and counts like a base.
  function coverageSpans(A) {
    var spans = [];
    for (var i = 0; i < A.length; i++) {
      var row = A[i], first = -1, last = -1;
      for (var j = 0; j < row.length; j++) {
        if (row[j] !== GAP) { if (first === -1) first = j; last = j; }
      }
      spans.push([first, last]);
    }
    return spans;
  }

  // Per-column stats for column `col`, restricted to the given row-index
  // list `rows`, using `spans` for terminal-gap exclusion. State space is
  // 0..3 (A/C/G/T) plus 4 (GAP-as-a-real-state, only when inside a row's
  // own span). Returns { covered, dominant, dominantCount } where
  // `covered` counts only rows whose span includes `col`; `dominant` is
  // the most common state among those (ties broken by lowest state id,
  // i.e. A < C < G < T < gap-as-state); dominantCount is its count.
  // Returns { covered: 0, dominant: -1, dominantCount: 0 } if no row in
  // `rows` covers this column at all.
  function columnStats(A, rows, col, spans) {
    var counts = [0, 0, 0, 0, 0]; // A,C,G,T,gap-as-state
    var covered = 0;
    for (var k = 0; k < rows.length; k++) {
      var i = rows[k];
      var sp = spans[i];
      if (sp[0] === -1 || col < sp[0] || col > sp[1]) continue; // outside this row's own span: missing data
      var v = A[i][col];
      var state = (v === GAP) ? 4 : v; // internal gap = real state 4
      counts[state]++;
      covered++;
    }
    if (covered === 0) return { covered: 0, dominant: -1, dominantCount: 0 };
    var best = 0;
    for (var s = 1; s < 5; s++) if (counts[s] > counts[best]) best = s;
    return { covered: covered, dominant: best, dominantCount: counts[best] };
  }

  // ==========================================================================
  // EVERYTHING BELOW THIS LINE IS TO BE IMPLEMENTED. Read
  // reference/BICLUSTER_ALGORITHM_NOTES.md first. Do not change the function
  // signatures, DEFAULTS values, or the two functions above. Do not add
  // helper files. Fill in exactly the six function bodies below; each one's
  // docstring is the complete spec - there is nothing else to decide.
  // ==========================================================================

  // Block coherence score for a candidate block: rows = array of row
  // indices, colStart/colEnd = inclusive column range (0-based, into A's
  // own column space - callers are responsible for any coordinate mapping).
  //
  // For each column j in [colStart, colEnd], compute columnStats(A, rows,
  // j, spans). Skip (do not count) any column whose `covered` is below
  // P.MIN_COL_COVERAGE. For each remaining column, its "purity" is
  // dominantCount / covered (a value in (0, 1]).
  //
  // Return the MEAN purity over all qualifying columns - this is the
  // block's coherence score, in [0, 1], where 1.0 means every qualifying
  // column has every covered row agreeing.
  //
  // If zero columns qualify (all had covered < P.MIN_COL_COVERAGE), return
  // null (not 0, not NaN - null means "cannot be scored", a distinct case
  // from "scored as fully divergent").
  function blockCoherence(A, rows, colStart, colEnd, spans, P) {
    throw new Error('not implemented');
  }

  // Find the single best COLUMN split point for a candidate block (same
  // rows throughout, split only the column range into two contiguous
  // sub-ranges [colStart, splitCol] and [splitCol+1, colEnd]).
  //
  // Performance requirement: do NOT call blockCoherence from scratch for
  // every candidate splitCol (that is O(width^2) over the whole search).
  // Instead, precompute two arrays of length (colEnd-colStart+1), one pass
  // over the columns: at each column j, whether it qualifies (covered >=
  // P.MIN_COL_COVERAGE) and its purity if so. Then build PREFIX SUMS over
  // (a) the qualifying-column count and (b) the sum of purity values, so
  // that "mean purity over columns [colStart, k]" and "... over [k+1,
  // colEnd]" are each an O(1) lookup for every k using the prefix sums.
  // Evaluate every candidate splitCol in colStart..colEnd-1 this way in a
  // single O(width) pass (after the O(width) prefix-building pass).
  //
  // For a candidate split at splitCol: require both sides to have at
  // least P.MIN_BLOCK_COLS columns (skip candidates that don't). Compute
  // the weighted-average coherence of the two sides: (leftMean * leftWidth
  // + rightMean * rightWidth) / (leftWidth + rightWidth), using only sides
  // where the mean is not null (a null side, e.g. from zero qualifying
  // columns, disqualifies that split candidate entirely - skip it).
  //
  // Track whichever candidate splitCol maximizes (weightedAverage -
  // wholeBlockCoherence), i.e. the largest gain over the un-split block's
  // own coherence (computed once via blockCoherence on the whole range).
  // If the whole block's coherence is null, treat wholeBlockCoherence as 0
  // for the gain comparison.
  //
  // Return { splitCol: <col>, gain: <number> } for the best candidate, or
  // null if no candidate reaches P.MIN_SPLIT_GAIN, or if colEnd - colStart
  // + 1 < 2 * P.MIN_BLOCK_COLS (too narrow to split at all).
  function bestColumnSplit(A, rows, colStart, colEnd, spans, P) {
    throw new Error('not implemented');
  }

  // Find the single best ROW split for a candidate block (same column
  // range throughout, partition `rows` into two or more groups).
  //
  // For each row i in `rows`, compute its own match-rate to the block's
  // dominant pattern: for each column j in [colStart, colEnd] where
  // columnStats(A, rows, j, spans).covered >= P.MIN_COL_COVERAGE (compute
  // this ONCE per column across the whole row range, not per row - reuse
  // it), and where row i's own span covers j (per coverageSpans - skip
  // positions outside row i's own span, do not count them as mismatches),
  // check whether A[i][j] (or state 4 if GAP) equals that column's
  // dominant state. The row's match-rate is (matches / positions
  // checked). If a row has zero positions checked in this range (it has
  // no real data overlapping any qualifying column here), EXCLUDE it from
  // clustering entirely (it cannot be assigned to any group here) - do
  // not default it to a rate of 0 or 1.
  //
  // Gap-cluster the resulting (rowIndex, matchRate) pairs: sort by
  // matchRate, find gaps between consecutive values that are the largest
  // relative to the typical gap elsewhere (this is the exact same
  // gap-clustering algorithm as clusterByValue in block-mask.js - CALL
  // THAT FUNCTION, do not reimplement it; it already takes a P object
  // with ROW_MIN_GAP_ABS / ROW_MIN_GAP_RATIO / ROW_MIN_GROUP - use
  // P.MIN_BLOCK_ROWS as its ROW_MIN_GROUP, and reasonable defaults 0.15 /
  // 2.5 for the other two if not present on P).
  //
  // Keep only resulting groups with length >= P.MIN_BLOCK_ROWS. If fewer
  // than 2 such groups remain, return null (no real row split found).
  //
  // For the accepted groups, compute the weighted-average coherence
  // (blockCoherence of each group's own rows over the same column range,
  // weighted by group size) and compare its gain over the whole block's
  // own coherence (same wholeBlockCoherence handling as bestColumnSplit,
  // including the null-treated-as-0 rule). If gain < P.MIN_SPLIT_GAIN,
  // return null.
  //
  // Any rows NOT in an accepted group (excluded for lack of data, or in a
  // rejected too-small group) form a residual group - include it in the
  // returned groups array too, even if it doesn't meet MIN_BLOCK_ROWS
  // (mark it distinctly, see return shape).
  //
  // Return { groups: [ { rows: [...], residual: false }, ...,
  // { rows: [...], residual: true } ], gain: <number> } (residual entry
  // omitted entirely if there are no leftover rows), or null per the
  // rejection rules above.
  function bestRowSplit(A, rows, colStart, colEnd, spans, P) {
    throw new Error('not implemented');
  }

  // Recursive split-and-merge. Given a candidate block (rows, colStart,
  // colEnd), decide whether to keep it as one leaf or split it once (by
  // row OR by column - never both in the same call) and recurse.
  //
  // 1. If rows.length < 2*P.MIN_BLOCK_ROWS AND colEnd-colStart+1 <
  //    2*P.MIN_BLOCK_COLS, this block is too small to ever split further -
  //    return it as a single leaf: [{ rows: rows.slice(), colStart:
  //    colStart, colEnd: colEnd, coherence: blockCoherence(...) }].
  // 2. Otherwise call bestColumnSplit and bestRowSplit (both may run even
  //    if one of the two size floors above was already hit - only skip
  //    the one whose corresponding dimension is too small for ANY valid
  //    split, i.e. don't call bestColumnSplit if colEnd-colStart+1 <
  //    2*P.MIN_BLOCK_COLS, don't call bestRowSplit if rows.length <
  //    2*P.MIN_BLOCK_ROWS).
  // 3. If neither returned a real result (both null), return this block
  //    as a single leaf (same shape as step 1).
  // 4. Otherwise take whichever of the two has the larger `gain` (if only
  //    one is non-null, take that one). For a column split: recurse into
  //    [colStart, splitCol] and [splitCol+1, colEnd], same rows both
  //    sides; concatenate the two returned leaf-list arrays. For a row
  //    split: for EACH group in the result (including the residual group
  //    if present), recurse with that group's rows and the SAME colStart/
  //    colEnd; concatenate all returned leaf-list arrays.
  // 5. Recursion must terminate: each recursive call operates on a
  //    strictly smaller row count or column range than its parent, so
  //    plain recursion (no explicit depth limit needed) is fine - but add
  //    a hard safety cap of 200 total leaves; if exceeded, stop splitting
  //    and return whatever leaves have been produced so far plus the
  //    remaining un-split blocks as single leaves.
  //
  // Return: a flat array of leaf objects, each { rows: [...], colStart,
  // colEnd, coherence }.
  function splitAndMerge(A, rows, colStart, colEnd, spans, P) {
    throw new Error('not implemented');
  }

  // Merge adjacent (by column range) leaves that have the EXACT SAME row
  // set (same rows, any order - compare as sets) when doing so doesn't
  // hurt: sort leaves by colStart. Walk left to right; for two
  // column-adjacent leaves (leafA.colEnd + 1 === leafB.colStart) with
  // identical row sets, compute the coherence of the merged range
  // (blockCoherence over [leafA.colStart, leafB.colEnd] for those rows).
  // If merged coherence >= min(leafA.coherence, leafB.coherence) -
  // P.MERGE_TOLERANCE (treating a null coherence as 0 for this
  // comparison), replace the two leaves with one merged leaf (recompute
  // its coherence via blockCoherence, don't just average the two). Repeat
  // until no more merges apply (a single left-to-right sweep repeated
  // until it makes no changes in a full pass is sufficient - this does
  // not need to be maximally optimal, just correct and terminating).
  //
  // Return the resulting (possibly shorter) array of leaves, still sorted
  // by colStart.
  function mergeAdjacentLeaves(leaves, A, spans, P) {
    throw new Error('not implemented');
  }

  // Top-level entry point. Parse the alignment, run splitAndMerge from the
  // whole matrix (rows = every row index 0..A.length-1, colStart=0,
  // colEnd=ncols-1), merge adjacent leaves, and return:
  // { n_rows, n_cols, row_headers: names, blocks: [ { rows: "all" | [idx,
  // ...], col_start, col_end, coherence }, ... ] } sorted by col_start.
  // "rows" is the string "all" if the leaf's row set is every row index
  // 0..n_rows-1, otherwise a sorted array of row indices (0-based into
  // row_headers). This function has NO concept of a consensus/reference
  // row - every row is on equal footing, including whatever the alignment
  // calls its "consensus" row if it has one; do not special-case it.
  function computeBiclusterMask(fastaText, params) {
    throw new Error('not implemented');
  }

  var api = {
    parseAln: parseAln,
    coverageSpans: coverageSpans,
    columnStats: columnStats,
    blockCoherence: blockCoherence,
    bestColumnSplit: bestColumnSplit,
    bestRowSplit: bestRowSplit,
    splitAndMerge: splitAndMerge,
    mergeAdjacentLeaves: mergeAdjacentLeaves,
    computeBiclusterMask: computeBiclusterMask,
    DEFAULTS: DEFAULTS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BlockBicluster = api;
})(typeof window !== 'undefined' ? window : this);
