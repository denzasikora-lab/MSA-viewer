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
 * Pure functions, no DOM. NOTE: reference/block_bicluster.py and
 * tests/bicluster/parity.js do NOT exist yet (that Python mirror is a
 * planned future step, not a current file — do not go looking for it).
 * The only oracle right now is tests/bicluster/oracle.js.
 */
(function (root) {
  'use strict';

  var GAP = 4;
  var CODE = { a: 0, c: 1, g: 2, t: 3, A: 0, C: 1, G: 2, T: 3 };

  var DEFAULTS = {
    MIN_COL_COVERAGE: 3,     // a column needs >= this many covered rows to count toward coherence
    MIN_BLOCK_ROWS: 3,       // a block (or a split-off row group) smaller than this is never accepted
    MIN_BLOCK_COLS: 8,       // a block (or a split-off column range) narrower than this is never accepted
    MIN_SPLIT_GAIN: 0.05,    // bestRowSplit: absolute coherence gain of the accepted groups over the whole
    MIN_VARIANCE_REDUCTION: 0.15, // bestColumnSplit: fractional reduction in column-purity variance (see its comment for why this is a different scale from MIN_SPLIT_GAIN)
    MERGE_TOLERANCE: 0.05,   // two adjacent same-row leaves merge if doing so costs less than this
    HAPLOTYPE_MAX_PURITY: 0.85,   // a column counts as "diagnostic" for haplotype clustering if its dominant-state purity is below this (i.e. it's genuinely polymorphic, not just noisy)
    HAPLOTYPE_MIN_INFO_COLS: 8,   // need at least this many diagnostic columns before haplotype clustering is attempted at all - fewer than this and a small row sample can always be bipartitioned to look clean on those same columns by pure look-elsewhere overfitting (measured: 4 was not enough, produced false splits on a uniform 16-row test fixture)
    HAPLOTYPE_MIN_GAIN: 0.2,      // scored against diagnostic columns ONLY (see _columnListCoherence), not the whole window, so this is NOT on the same scale as MIN_SPLIT_GAIN - measured against both a real 48-row biological split (gain 0.22) and small-sample noise on a 16-row uniform fixture (gain up to 0.19), this threshold alone sits between them but is a thin margin - HAPLOTYPE_MIN_USABLE_ROWS below is the primary noise guard, this is a secondary one
    HAPLOTYPE_MIN_USABLE_ROWS: 20, // below this many rows with real data at the diagnostic columns, a clean-looking 2-way split is too easily found by chance (measured: small samples of ~16 rows produced gain up to 0.19 on a uniform/noise fixture; real biological structure recovered here used 48 rows) - this is the primary guard against overfitting on small blocks, not a claim that real structure can't exist in fewer rows
    WINDOW_SCAN_WIDTH: 64,   // _windowedRowSplitScan: width of each sliding sub-window tried when a wide range's row-split methods find nothing - measured root cause: a wide range can carry FAR more diagnostic columns than the one real signal (e.g. 196 across a 1274-col real block vs 12 belonging to the real 66-col signal), and _haplotypeRowSplit/_diagnosticRowSplit both build their state vectors/candidates from ALL diagnostic columns in whatever range they're given, so unrelated columns elsewhere dilute/outcompete the real one. A narrower window restricts the diagnostic-column pool back down to just that window's own columns.
    WINDOW_SCAN_MAX: 60      // cap on how many windows a single _windowedRowSplitScan call will try, so cost stays bounded - this scan only runs at all when the plain whole-range column/row splits both already failed
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
    // Dominant state must be a real base (A/C/G/T), never a gap - "most
    // rows share a deletion here" is not the same claim as "most rows
    // share a real base here," and treating them as equally strong
    // conservation evidence produced a real, confirmed bug: a stretch
    // where most rows simply hadn't started their real sequence yet
    // (mostly gap, one lone real base at the very end) scored as high
    // coherence (0.80-0.90) purely from gap-agreement, visually
    // indistinguishable from genuine shared-sequence conservation but
    // meaning something completely different. counts[4] (gap) is still
    // tracked above but never eligible to be `dominant`.
    //
    // A second, opposite bug this same change first introduced and had to
    // be caught here too: if EVERY covered row is gap (real bases sum to
    // 0), `dominant` fell through to state 0 with dominantCount 0,
    // reporting a fake "0% purity" column instead of "no real data here
    // at all" - confirmed directly on real oma_SINE16b data, where a
    // 23-row group with zero real bases at a column (all deletions)
    // scored blockCoherence exactly 0.000 for that column, dragging the
    // group's average coherence toward zero and fragmenting a region that
    // should have been judged only on columns that actually carry real
    // sequence. A fully-gapped column is UNINFORMATIVE (same as covered <
    // MIN_COL_COVERAGE), not "0% conserved" - return covered:0 so
    // callers' existing MIN_COL_COVERAGE check skips it. This is
    // deliberately narrower than also excluding gap rows from `covered`
    // when SOME real bases are present: a partial mix of a real base and
    // genuine within-span deletions is exactly the case Simmons &
    // Ochoterena's gap-as-real-state treatment is for (a real deletion is
    // a different, valid state from a real base, and should count as a
    // mismatch against the real-base majority, not be excluded) - only
    // the all-gap degenerate case is being fixed here.
    var realCovered = counts[0] + counts[1] + counts[2] + counts[3];
    if (realCovered === 0) return { covered: 0, dominant: -1, dominantCount: 0 };
    var best = 0;
    for (var s = 1; s < 4; s++) if (counts[s] > counts[best]) best = s;
    return { covered: covered, dominant: best, dominantCount: counts[best] };
  }

  // Same purity-mean definition as blockCoherence, but over an arbitrary
  // (not necessarily contiguous) list of absolute column indices - used by
  // _haplotypeRowSplit to score a split against just its diagnostic
  // columns, since averaging over a whole contiguous window (most of it
  // invariant background) mathematically caps how much a real split can
  // ever move the score, regardless of how clean the split is.
  function _columnListCoherence(A, rows, cols, spans, P) {
    var sum = 0, n = 0;
    for (var c = 0; c < cols.length; c++) {
      var cs = columnStats(A, rows, cols[c], spans);
      if (cs.covered < P.MIN_COL_COVERAGE) continue;
      sum += cs.dominantCount / cs.covered;
      n++;
    }
    return n === 0 ? null : sum / n;
  }

  var _splitLeafCount = 0;

  function sameRowSet(a, b) {
    if (a.length !== b.length) return false;
    var sa = a.slice().sort(function(x, y) { return x - y; });
    var sb = b.slice().sort(function(x, y) { return x - y; });
    for (var i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
    return true;
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
    var sumPurity = 0, count = 0;
    for (var j = colStart; j <= colEnd; j++) {
      var cs = columnStats(A, rows, j, spans);
      if (cs.covered < P.MIN_COL_COVERAGE) continue;
      sumPurity += cs.dominantCount / cs.covered;
      count++;
    }
    if (count === 0) return null;
    return sumPurity / count;
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
    var width = colEnd - colStart + 1;
    if (width < 2 * P.MIN_BLOCK_COLS) return null;

    // Precompute per-column qualification and purity in one pass
    var qual = new Array(width);
    var purity = new Array(width);
    for (var i = 0; i < width; i++) {
      var cs = columnStats(A, rows, colStart + i, spans);
      if (cs.covered >= P.MIN_COL_COVERAGE) {
        qual[i] = true;
        purity[i] = cs.dominantCount / cs.covered;
      } else {
        qual[i] = false;
        purity[i] = 0;
      }
    }

    // Build prefix sums (count, sum, sum-of-squares) for O(1) sub-range
    // mean AND variance lookup. NOTE ON THE GAIN METRIC: a weighted
    // average of two partitions' means is, by definition, always close to
    // the whole's own mean (exactly equal but for coverage-cutoff edge
    // effects) -- "does the mean improve" is not a real split criterion
    // for a partition of a mean and is near-zero for every candidate
    // split. The actual criterion (same shape as CART/ANOVA recursive
    // partitioning, and the reason Cheng-Church's own coherence score is
    // residual/variance-based, not a plain mean) is VARIANCE REDUCTION:
    // does separating the range into two parts make each part more
    // internally uniform than the mixed whole was? That's a real,
    // non-trivial quantity that a genuine boundary (like a conserved
    // core next to a divergent flank) actually clears and noise doesn't.
    var prefixCount = new Array(width);
    var prefixSum = new Array(width);
    var prefixSumSq = new Array(width);
    var rc = 0, rp = 0, rp2 = 0;
    for (var i = 0; i < width; i++) {
      if (qual[i]) { rc++; rp += purity[i]; rp2 += purity[i] * purity[i]; }
      prefixCount[i] = rc;
      prefixSum[i] = rp;
      prefixSumSq[i] = rp2;
    }
    var totalQual = rc;
    var totalSum = rp;
    var totalSumSq = rp2;
    if (totalQual === 0) return null;
    var wholeMean = totalSum / totalQual;
    var wholeVariance = (totalSumSq / totalQual) - (wholeMean * wholeMean);

    var bestSplit = -1, bestGain = -Infinity;
    for (var s = 0; s < width - 1; s++) {
      var leftWidth = s + 1;
      var rightWidth = width - leftWidth;
      if (leftWidth < P.MIN_BLOCK_COLS || rightWidth < P.MIN_BLOCK_COLS) continue;

      var leftCount = prefixCount[s];
      var rightCount = totalQual - leftCount;
      if (leftCount === 0 || rightCount === 0) continue; // a null-mean side disqualifies this split

      var leftMean = prefixSum[s] / leftCount;
      var rightMean = (totalSum - prefixSum[s]) / rightCount;
      var leftVar = (prefixSumSq[s] / leftCount) - (leftMean * leftMean);
      var rightVar = ((totalSumSq - prefixSumSq[s]) / rightCount) - (rightMean * rightMean);

      var weightedVar = (leftVar * leftCount + rightVar * rightCount) / totalQual;
      // Fractional variance reduction: scale-invariant, so one threshold
      // (P.MIN_SPLIT_GAIN, read as "reduce variance by at least this
      // fraction") works regardless of how spread out purity happens to
      // be in a given alignment.
      var gain = wholeVariance > 1e-9 ? (wholeVariance - weightedVar) / wholeVariance : 0;

      if (gain > bestGain) {
        bestGain = gain;
        bestSplit = s;
      }
    }

    if (bestSplit === -1 || bestGain < P.MIN_VARIANCE_REDUCTION) return null;
    return { splitCol: colStart + bestSplit, gain: bestGain };
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
  // P.MIN_BLOCK_ROWS as its ROW_MIN_GROUP, and reasonable defaults 0.08 /
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
  // How many rows in `otherRows` are in state `state` at `col` (gap inside
  // a row's own span = real state 4, outside = missing/excluded) - used
  // by _strictGroupCoherence to measure a column's BACKGROUND rate for a
  // specific state, so a candidate group's purity can be judged against
  // what the rest of the block already shows there, not an absolute bar.
  function _countStateInRows(A, otherRows, col, state, spans) {
    var count = 0;
    for (var k = 0; k < otherRows.length; k++) {
      var i = otherRows[k];
      var sp = spans[i];
      if (sp[0] === -1 || col < sp[0] || col > sp[1]) continue;
      var v = A[i][col];
      var s = (v === GAP) ? 4 : v;
      if (s === state) count++;
    }
    return count;
  }

  // Same shape as blockCoherence (mean per-column purity), but a column
  // only counts toward a candidate group's score if the group's purity
  // there is meaningfully ENRICHED over the rest of the block's own rate
  // for that same state - not just an absolute purity floor, which
  // measured directly to be the wrong lever (a flat 90% threshold killed
  // real Stage 1 signal at realistic mutation rates just as readily as it
  // killed noise). Plain blockCoherence accepts any plurality (the most
  // common of 5 possible states - A/C/G/T/gap) as "dominant," no matter
  // how weak - for a SMALL candidate group this is a real bug: confirmed
  // directly that a 5-row group can show per-column pluralities of just
  // 2-4 out of 5 (40-80%) at EVERY column, each unremarkable by chance
  // alone with 5 rows over 5 states (the pigeonhole effect, not real
  // agreement) - averaged across several such columns it can still beat
  // the whole block's own mediocre coherence, with the group's rows
  // sharing no real content. The fix compares group purity against how
  // often the REST of the block already shows that exact state at that
  // column (the same enrichment/leakage idea _findBestDiagnosticGroup
  // already uses, applied here to _gapRowSplit's own scoring): a real
  // signal is enriched well above background; noise from a small alphabet
  // is not, regardless of its raw purity number.
  function _strictGroupCoherence(A, groupRows, colStart, colEnd, spans, P, allRows) {
    var groupSet = {};
    for (var gi = 0; gi < groupRows.length; gi++) groupSet[groupRows[gi]] = true;
    var restRows = [];
    for (var ri = 0; ri < allRows.length; ri++) {
      if (!groupSet[allRows[ri]]) restRows.push(allRows[ri]);
    }
    // Size-scaled quality threshold, same values and same reasoning as
    // _findBestDiagnosticGroup uses (ported from this app's own Cluster
    // Now feature) - measured directly that a much looser flat 25-point
    // margin still let noise through: a small group can show zero matches
    // in a modestly-sized "rest" pool by pure chance alone (9 rest rows,
    // 5 possible states, ~13% chance per column of zero overlap), which
    // is not remotely the same as 70-90 percentage points of real margin.
    var gsize = groupRows.length;
    var thresh = gsize < 11 ? 90 : gsize < 20 ? 80 : 70;

    var sum = 0, n = 0;
    for (var col = colStart; col <= colEnd; col++) {
      var cs = columnStats(A, groupRows, col, spans);
      if (cs.covered < P.MIN_COL_COVERAGE) continue;
      var groupPurity = cs.dominantCount / cs.covered;

      var restMatch = _countStateInRows(A, restRows, col, cs.dominant, spans);
      var restCovered = 0;
      for (var rr = 0; rr < restRows.length; rr++) {
        var sp = spans[restRows[rr]];
        if (sp[0] !== -1 && col >= sp[0] && col <= sp[1]) restCovered++;
      }
      var restRate = restCovered > 0 ? restMatch / restCovered : 0;

      // No "zero overlap with background = automatically accept" shortcut
      // here (unlike _findBestDiagnosticGroup, where a candidate group is
      // built FROM a specific shared state so its own internal purity is
      // 100% by construction) - confirmed directly that bypassing the
      // margin requirement on zero-overlap alone let a 7-row group with
      // only 33% internal purity through purely because that weak
      // majority happened not to overlap the rest by chance (small
      // alphabet, sparse real data). When restMatch really is 0, outP is
      // 0 and qual reduces to groupPurity*100 anyway, so a genuinely pure
      // group still passes automatically - this only removes the case
      // where zero overlap was doing the work instead of real purity.
      var inP = groupPurity * 100;
      var outP = restRate * 100;
      var qual = Math.max(0, inP - outP);
      if (qual < thresh) continue; // not enough real margin over background - don't count this column

      sum += groupPurity;
      n++;
    }
    // Require multiple independent qualifying columns, not just one -
    // confirmed directly (clean_core.aln.fa, a known-uniform fixture) that
    // a single column clearing "perfect exclusivity" by pure chance (easy
    // with a small alphabet and a small, sparse group) could otherwise
    // carry a whole group's coherence score on its own. Real signal should
    // show up at more than one position; a lone lucky column is exactly
    // the failure mode _findBestDiagnosticGroup's own minOccurrences
    // guards against, applied here too.
    var minQualifying = (P.GAP_MIN_QUALIFYING_COLS != null) ? P.GAP_MIN_QUALIFYING_COLS : 2;
    return n < minQualifying ? null : sum / n;
  }

  // Gap-clustering row split: scores each row by its OVERALL match-rate to
  // the dominant state, averaged across every qualifying column in range.
  // Works when one group shares a genuinely different whole-window pattern
  // (e.g. a distinct tail/flank) from the rest. Does NOT work when the
  // real split is defined by a handful of correlated diagnostic SNPs
  // sitting among many invariant columns - see _haplotypeRowSplit below,
  // which handles that case instead. See bestRowSplit for how the two are
  // combined.
  function _gapRowSplit(A, rows, colStart, colEnd, spans, P) {
    // Precompute column stats once for all columns in range
    var nCols = colEnd - colStart + 1;
    var colStatsArr = new Array(nCols);
    for (var j = 0; j < nCols; j++) {
      colStatsArr[j] = columnStats(A, rows, colStart + j, spans);
    }

    // For each row, compute match-rate to the dominant pattern
    var rowRates = [];
    var excludedRows = [];
    for (var k = 0; k < rows.length; k++) {
      var i = rows[k];
      var sp = spans[i];
      var matches = 0, positions = 0;
      for (var j = 0; j < nCols; j++) {
        var cs = colStatsArr[j];
        if (cs.covered < P.MIN_COL_COVERAGE) continue;
        if (sp[0] === -1 || (colStart + j) < sp[0] || (colStart + j) > sp[1]) continue;
        positions++;
        var v = A[i][colStart + j];
        var state = (v === GAP) ? 4 : v;
        if (state === cs.dominant) matches++;
      }
      // A rate computed from only a handful of positions is coarse and
      // discrete (e.g. with 3 positions the only possible values are
      // 0, .33, .67, 1 - adjacent sorted values can differ by .33 purely
      // from small-N discreteness, faking a "gap" the clustering mistakes
      // for a real split). Require a minimum sample size before trusting
      // a row's rate at all - excluded, not defaulted, same as zero
      // positions.
      if (positions < 5) {
        excludedRows.push(i);
      } else {
        rowRates.push({ idx: i, rate: matches / positions });
      }
    }

    if (rowRates.length === 0) return null;

    // Gap-cluster the (rowIndex, matchRate) pairs
    var minGapAbs = (P.ROW_MIN_GAP_ABS != null) ? P.ROW_MIN_GAP_ABS : 0.12;
    var minGapRatio = (P.ROW_MIN_GAP_RATIO != null) ? P.ROW_MIN_GAP_RATIO : 2.5;
    var minGroup = P.MIN_BLOCK_ROWS;

    var sorted = rowRates.slice().sort(function(a, b) { return a.rate - b.rate; });

    var gaps = [];
    for (var g = 0; g < sorted.length - 1; g++) {
      gaps.push(sorted[g + 1].rate - sorted[g].rate);
    }

    var sortedGaps = gaps.slice().sort(function(a, b) { return a - b; });
    var medianGap = sortedGaps.length > 0 ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 0;

    var splitPoints = [];
    for (var g = 0; g < gaps.length; g++) {
      if (gaps[g] >= minGapAbs && gaps[g] >= minGapRatio * medianGap) {
        splitPoints.push(g);
      }
    }

    // Form groups at split points
    var groups = [];
    var start = 0;
    for (var s = 0; s < splitPoints.length; s++) {
      groups.push(sorted.slice(start, splitPoints[s] + 1));
      start = splitPoints[s] + 1;
    }
    groups.push(sorted.slice(start));

    // Merge groups smaller than minGroup into previous group
    var merged = [];
    for (var g = 0; g < groups.length; g++) {
      if (groups[g].length < minGroup && merged.length > 0) {
        merged[merged.length - 1] = merged[merged.length - 1].concat(groups[g]);
      } else {
        merged.push(groups[g]);
      }
    }

    // Keep only groups with length >= MIN_BLOCK_ROWS
    var acceptedGroups = [];
    var residualRows = excludedRows.slice();
    for (var g = 0; g < merged.length; g++) {
      if (merged[g].length >= P.MIN_BLOCK_ROWS) {
        acceptedGroups.push(merged[g]);
      } else {
        for (var r = 0; r < merged[g].length; r++) residualRows.push(merged[g][r].idx);
      }
    }

    if (acceptedGroups.length < 2) return null;

    // Reject a split where NO group holds a majority of the block's own
    // rows: fragmenting everyone into several similarly-sized small
    // groups (e.g. 3/4/5/4 of 16) with no dominant remainder is exactly
    // the signature of clustering pure noise (independent random
    // sequences getting arbitrarily bucketed) rather than finding a real
    // "most copies share X, a genuine minority differs" structure - every
    // real planted case in this codebase's own test fixtures leaves a
    // clear majority group (e.g. 12 of 20, 24 of 30).
    var largestGroup = 0;
    for (var gi = 0; gi < acceptedGroups.length; gi++) {
      if (acceptedGroups[gi].length > largestGroup) largestGroup = acceptedGroups[gi].length;
    }
    if (largestGroup < 0.4 * rows.length) return null;

    // Score by the BEST accepted group's own coherence, not a
    // size-weighted average across all of them - using
    // _strictGroupCoherence rather than plain blockCoherence (see its
    // comment for the exact bug this closes: a 5-row group with only 2-4
    // out of 5 real agreement, unremarkable pigeonhole chance for a small
    // alphabet, averaged into a misleadingly high aggregate). A weighted
    // average over ALL groups was tried and measured to fail differently:
    // the point of this split is finding ONE coherent minority subgroup
    // while the remainder stays legitimately heterogeneous "everyone
    // else" - averaging in that deliberately-divergent majority group's
    // now-correctly-low strict coherence dragged the whole average below
    // the whole block's baseline, rejecting a real, perfect (coherence
    // 1.0) 5-row match on mosaic_subset.aln.fa because the OTHER 15 rows
    // (correctly) don't cohere with each other either.
    var wholeBlockCoherence = blockCoherence(A, rows, colStart, colEnd, spans, P);
    if (wholeBlockCoherence === null) wholeBlockCoherence = 0;

    var bestGroupCoh = 0;
    for (var g = 0; g < acceptedGroups.length; g++) {
      var groupRows = acceptedGroups[g].map(function(x) { return x.idx; });
      var coh = _strictGroupCoherence(A, groupRows, colStart, colEnd, spans, P, rows);
      if (coh !== null && coh > bestGroupCoh) bestGroupCoh = coh;
    }

    var gain = bestGroupCoh - wholeBlockCoherence;

    if (gain < P.MIN_SPLIT_GAIN) return null;

    // Build result groups with residual
    var resultGroups = [];
    for (var g = 0; g < acceptedGroups.length; g++) {
      var groupRows = acceptedGroups[g].map(function(x) { return x.idx; });
      resultGroups.push({ rows: groupRows, residual: false });
    }
    if (residualRows.length > 0) {
      resultGroups.push({ rows: residualRows, residual: true });
    }

    return { groups: resultGroups, gain: gain };
  }

  // Haplotype-clustering row split: finds real correlated-SNP structure
  // that _gapRowSplit misses (found by comparing to a real biological
  // example, tests/fixtures/blockmask/testsets/oma_SINE16b_realigned.aln.fa
  // cols 1152-1217 — two ~evenly-sized groups differing at ~12 of 66
  // columns, no single "whole-window match rate" separates them because
  // different rows carry different combinations of the minority/majority
  // allele across those columns; a per-row scalar score averaged over all
  // columns dilutes the signal and can't recover it, and even restricted
  // to just the diagnostic columns a per-row match-rate against one global
  // "dominant" vote per column still doesn't separate correlated
  // haplotypes cleanly. This needs actual row-vs-row similarity
  // clustering on the diagnostic columns, which is what this does:
  //
  // 1. Find "diagnostic" columns: covered >= P.MIN_COL_COVERAGE and
  //    dominant-state purity < P.HAPLOTYPE_MAX_PURITY (i.e. genuinely
  //    polymorphic - a near-invariant column carries no haplotype signal
  //    and would just add noise to the distance metric). Bail (null) if
  //    fewer than P.HAPLOTYPE_MIN_INFO_COLS qualify.
  // 2. Build each row's state vector over just those columns, respecting
  //    spans (a position outside a row's own real-base span is missing,
  //    not a state). Drop rows with too little real data there.
  // 3. Cluster into 2 groups by Hamming distance over the diagnostic
  //    columns: seed with the single farthest-apart pair (deterministic,
  //    no randomness), then iterate nearest-centroid assignment with
  //    majority-vote centroids (k=2 k-modes, in effect) until stable or a
  //    small iteration cap.
  // 4. Accept only if both groups meet P.MIN_BLOCK_ROWS and the resulting
  //    weighted-average blockCoherence beats the whole block's own
  //    coherence by at least P.HAPLOTYPE_MIN_GAIN. Deliberately NO
  //    majority-group-size guard here (unlike _gapRowSplit) - a real
  //    haplotype split is often close to balanced by nature, and rejecting
  //    balanced splits is exactly the failure mode this function exists to
  //    fix; noise is instead guarded against by requiring several
  //    genuinely polymorphic columns to agree, not by group-size shape.
  function _haplotypeRowSplit(A, rows, colStart, colEnd, spans, P) {
    var nCols = colEnd - colStart + 1;
    var colStatsArr = new Array(nCols);
    for (var j = 0; j < nCols; j++) colStatsArr[j] = columnStats(A, rows, colStart + j, spans);

    var infoCols = [];
    for (var j = 0; j < nCols; j++) {
      var cs = colStatsArr[j];
      if (cs.covered >= P.MIN_COL_COVERAGE && (cs.dominantCount / cs.covered) < P.HAPLOTYPE_MAX_PURITY) {
        infoCols.push(j);
      }
    }
    if (infoCols.length < P.HAPLOTYPE_MIN_INFO_COLS) return null;

    // Per-row state vectors over the diagnostic columns only
    var rowStates = {};
    var usableRows = [];
    var minKnown = Math.min(3, infoCols.length);
    for (var k = 0; k < rows.length; k++) {
      var i = rows[k];
      var sp = spans[i];
      var vec = new Array(infoCols.length);
      var nKnown = 0;
      for (var m = 0; m < infoCols.length; m++) {
        var col = colStart + infoCols[m];
        if (sp[0] === -1 || col < sp[0] || col > sp[1]) { vec[m] = null; continue; }
        var v = A[i][col];
        vec[m] = (v === GAP) ? 4 : v;
        nKnown++;
      }
      if (nKnown >= minKnown) {
        rowStates[i] = vec;
        usableRows.push(i);
      }
    }
    var minUsableRows = (P.HAPLOTYPE_MIN_USABLE_ROWS != null) ? P.HAPLOTYPE_MIN_USABLE_ROWS : (2 * P.MIN_BLOCK_ROWS);
    if (usableRows.length < Math.max(2 * P.MIN_BLOCK_ROWS, minUsableRows)) return null;

    function dist(a, b) {
      var va = rowStates[a], vb = rowStates[b];
      var diff = 0, n = 0;
      for (var m = 0; m < va.length; m++) {
        if (va[m] == null || vb[m] == null) continue;
        n++;
        if (va[m] !== vb[m]) diff++;
      }
      return n === 0 ? null : diff / n;
    }

    // Deterministic seeding: the single farthest-apart pair of rows
    var bestPair = null, bestDist = -1;
    for (var a = 0; a < usableRows.length; a++) {
      for (var b = a + 1; b < usableRows.length; b++) {
        var d = dist(usableRows[a], usableRows[b]);
        if (d !== null && d > bestDist) { bestDist = d; bestPair = [usableRows[a], usableRows[b]]; }
      }
    }
    if (bestPair === null || bestDist <= 0) return null;

    function majorityVec(group) {
      var vec = new Array(infoCols.length);
      for (var m = 0; m < infoCols.length; m++) {
        var counts = {};
        for (var k = 0; k < group.length; k++) {
          var s = rowStates[group[k]][m];
          if (s == null) continue;
          counts[s] = (counts[s] || 0) + 1;
        }
        var best = null, bestC = -1;
        for (var key in counts) {
          if (counts.hasOwnProperty(key) && counts[key] > bestC) { bestC = counts[key]; best = Number(key); }
        }
        vec[m] = best;
      }
      return vec;
    }

    var centroidA = rowStates[bestPair[0]].slice();
    var centroidB = rowStates[bestPair[1]].slice();
    var assignment = {};

    for (var iter = 0; iter < 10; iter++) {
      var newAssignment = {};
      for (var k = 0; k < usableRows.length; k++) {
        var i = usableRows[k];
        var vec = rowStates[i];
        var da = 0, db = 0, na = 0, nb = 0;
        for (var m = 0; m < vec.length; m++) {
          if (vec[m] == null) continue;
          if (centroidA[m] != null) { na++; if (vec[m] !== centroidA[m]) da++; }
          if (centroidB[m] != null) { nb++; if (vec[m] !== centroidB[m]) db++; }
        }
        var rateA = na > 0 ? da / na : 1;
        var rateB = nb > 0 ? db / nb : 1;
        newAssignment[i] = (rateA <= rateB) ? 'A' : 'B';
      }
      var groupA = usableRows.filter(function (i) { return newAssignment[i] === 'A'; });
      var groupB = usableRows.filter(function (i) { return newAssignment[i] === 'B'; });
      if (groupA.length === 0 || groupB.length === 0) return null;

      var stable = true;
      for (var key in newAssignment) {
        if (newAssignment[key] !== assignment[key]) { stable = false; break; }
      }
      assignment = newAssignment;
      centroidA = majorityVec(groupA);
      centroidB = majorityVec(groupB);
      if (stable) break;
    }

    var groupARows = usableRows.filter(function (i) { return assignment[i] === 'A'; });
    var groupBRows = usableRows.filter(function (i) { return assignment[i] === 'B'; });
    if (groupARows.length < P.MIN_BLOCK_ROWS || groupBRows.length < P.MIN_BLOCK_ROWS) return null;

    var residualRows = [];
    for (var k = 0; k < rows.length; k++) {
      if (!rowStates.hasOwnProperty(rows[k])) residualRows.push(rows[k]);
    }

    // Score gain against just the diagnostic columns (not the whole,
    // mostly-invariant window) - see _columnListCoherence's comment for
    // why averaging over the full window would mathematically cap the
    // measurable gain regardless of split quality.
    var diagAbsCols = infoCols.map(function (m) { return colStart + m; });
    var wholeBlockCoherence = _columnListCoherence(A, rows, diagAbsCols, spans, P);
    if (wholeBlockCoherence === null) wholeBlockCoherence = 0;

    var cohA = _columnListCoherence(A, groupARows, diagAbsCols, spans, P);
    if (cohA === null) cohA = 0;
    var cohB = _columnListCoherence(A, groupBRows, diagAbsCols, spans, P);
    if (cohB === null) cohB = 0;

    var weightedAvg = (cohA * groupARows.length + cohB * groupBRows.length) / (groupARows.length + groupBRows.length);
    var gain = weightedAvg - wholeBlockCoherence;
    if (gain < P.HAPLOTYPE_MIN_GAIN) return null;

    var resultGroups = [
      { rows: groupARows, residual: false },
      { rows: groupBRows, residual: false }
    ];
    if (residualRows.length > 0) resultGroups.push({ rows: residualRows, residual: true });

    return { groups: resultGroups, gain: gain };
  }

  // Diagnostic-feature evidence-accumulation row split, ported from this
  // app's own already-shipped, already-validated ViewAlign "Cluster Now"
  // feature (SINEClusterer.findBestGroup in cluster.js), generalized to
  // work on a [colStart, colEnd] sub-range instead of always the whole
  // alignment. Found to be a strictly better approach than
  // _haplotypeRowSplit's from-scratch k-means after running the real
  // Cluster Now feature on the same real oma_SINE16b file side by side:
  // it independently found the same two real groups (one matching almost
  // exactly), using a fundamentally more robust method - instead of
  // guessing k=2 and clustering by aggregate distance, EVERY (column,
  // state) pair is a candidate group ("these rows share this base here"),
  // near-identical candidates across many columns are fuzzy-merged, and
  // each merged candidate is scored by how many columns support it with
  // few outside "leaks" - real evidence accumulation, not a fixed-k
  // guess. It also naturally finds more than 2 groups by iterating
  // (extract the best group, remove it, repeat), which fixes Stage 2a's
  // "3 groups in one zone, no majority" case that _gapRowSplit's
  // majority-guard rejects by design.
  //
  // Deliberately keeps gap-as-real-deletion-state semantics (state 4
  // inside a row's own span counts as a real, poolable state, same as
  // A/C/G/T) rather than cluster.js's "gap is never diagnostic" rule -
  // that's this app's own established Simmons & Ochoterena-based
  // philosophy (see coverageSpans/columnStats), cluster.js's choice was
  // presumably fine for its own whole-alignment use case but there is no
  // reason to import it here.
  // One round: find the single best-supported diagnostic row group among
  // `avail` (a subset of `rows`), restricted to columns [colStart, colEnd].
  // Direct port of SINEClusterer.findBestGroup's algorithm (cluster.js),
  // adapted to a column sub-range and to this app's gap-as-real-state
  // rule. Returns { rows: [...], feats: [{col, state}] } or null.
  function _findBestDiagnosticGroup(A, rows, avail, colStart, colEnd, spans, P, opts) {
    var minSize = opts.minSize;
    var minOccurrences = opts.minOccurrences;
    var qSmall = opts.qualitySmall, qMed = opts.qualityMedium, qLarge = opts.qualityLarge;
    var breakSM = opts.sizeSmallMedium, breakML = opts.sizeMediumLarge;
    var upperBound = opts.relaxUpperBound ? avail.length : Math.max(minSize, Math.floor(avail.length * 0.5));
    var availSet = {};
    for (var a = 0; a < avail.length; a++) availSet[avail[a]] = true;

    // candidates: key = sorted-avail-row-list joined by ',' -> { rows, feats }
    var candidates = {};

    for (var col = colStart; col <= colEnd; col++) {
      // Non-diagnostic guard: a state that dominates >80% of the WHOLE
      // block's own rows (not just avail) carries no real signal here -
      // same rule as cluster.js's global 0.8 check, just scoped to this
      // block's own row set instead of the whole dataset.
      var globalCs = columnStats(A, rows, col, spans);
      if (globalCs.covered > 0 && (globalCs.dominantCount / globalCs.covered) > 0.8) continue;

      // Per-state row groups within avail, respecting spans (gap inside a
      // row's own span = real state 4; outside = missing, excluded).
      var byState = { 0: [], 1: [], 2: [], 3: [], 4: [] };
      for (var k = 0; k < avail.length; k++) {
        var i = avail[k];
        var sp = spans[i];
        if (sp[0] === -1 || col < sp[0] || col > sp[1]) continue;
        var v = A[i][col];
        var state = (v === GAP) ? 4 : v;
        byState[state].push(i);
      }
      for (var s = 0; s < 5; s++) {
        var set = byState[s];
        if (set.length >= minSize && set.length <= upperBound) {
          var key = set.join(',');
          if (!candidates[key]) candidates[key] = { rows: set, feats: [] };
          candidates[key].feats.push({ col: col, state: s });
        }
      }
    }

    // Fuzzy merge near-identical candidates (>=90% overlap, size diff <= 5)
    var keys = Object.keys(candidates);
    var done = {};
    var merged = {};
    for (var k1 = 0; k1 < keys.length; k1++) {
      if (done[keys[k1]]) continue;
      var d1 = candidates[keys[k1]];
      var list = [d1];
      var d1Set = {};
      for (var x = 0; x < d1.rows.length; x++) d1Set[d1.rows[x]] = true;
      for (var k2 = 0; k2 < keys.length; k2++) {
        if (k1 === k2 || done[keys[k2]]) continue;
        var d2 = candidates[keys[k2]];
        var inter = 0;
        for (var y = 0; y < d2.rows.length; y++) if (d1Set[d2.rows[y]]) inter++;
        var union = d1.rows.length + d2.rows.length - inter;
        if (inter / union >= 0.9 && Math.abs(d1.rows.length - d2.rows.length) <= 5) {
          list.push(d2);
          done[keys[k2]] = true;
        }
      }
      var best = list[0];
      for (var li = 1; li < list.length; li++) if (list[li].rows.length > best.rows.length) best = list[li];
      var mergedKey = best.rows.join(',');
      if (!merged[mergedKey]) merged[mergedKey] = { rows: best.rows, feats: [] };
      for (var li2 = 0; li2 < list.length; li2++) {
        for (var f = 0; f < list[li2].feats.length; f++) merged[mergedKey].feats.push(list[li2].feats[f]);
      }
      done[keys[k1]] = true;
    }

    // Dedup feats per merged candidate, then score
    var bestGroup = null, bestScore = -1;
    var mergedKeys = Object.keys(merged);
    for (var mi = 0; mi < mergedKeys.length; mi++) {
      var d = merged[mergedKeys[mi]];
      var seen = {};
      var feats = [];
      for (var fi = 0; fi < d.feats.length; fi++) {
        var sig = d.feats[fi].col + ':' + d.feats[fi].state;
        if (seen[sig]) continue;
        seen[sig] = true;
        feats.push(d.feats[fi]);
      }
      if (feats.length < minOccurrences) continue;

      var gsize = d.rows.length;
      var thresh = gsize < breakSM ? qSmall : gsize < breakML ? qMed : qLarge;
      var good = 0, score = 0;
      var validFeats = [];
      var gRowSet = {};
      for (var gr = 0; gr < d.rows.length; gr++) gRowSet[d.rows[gr]] = true;

      for (var ff = 0; ff < feats.length; ff++) {
        var col2 = feats[ff].col, state2 = feats[ff].state;
        var inside = 0;
        for (var gr2 = 0; gr2 < d.rows.length; gr2++) {
          var sp2 = spans[d.rows[gr2]];
          if (sp2[0] === -1 || col2 < sp2[0] || col2 > sp2[1]) continue;
          var v2 = A[d.rows[gr2]][col2];
          var st2 = (v2 === GAP) ? 4 : v2;
          if (st2 === state2) inside++;
        }
        var totalCs = columnStats(A, rows, col2, spans);
        // total rows (within this whole block) at this state
        var totalAtState = 0;
        for (var rr = 0; rr < rows.length; rr++) {
          var i3 = rows[rr];
          var sp3 = spans[i3];
          if (sp3[0] === -1 || col2 < sp3[0] || col2 > sp3[1]) continue;
          var v3 = A[i3][col2];
          var st3 = (v3 === GAP) ? 4 : v3;
          if (st3 === state2) totalAtState++;
        }
        var outside = totalAtState - inside;
        var outsidePoolSize = rows.length - gsize;
        var inP = (inside / gsize) * 100;
        var outP = outsidePoolSize > 0 ? (outside / outsidePoolSize) * 100 : 0;
        var qual = Math.max(0, inP - outP);

        if (outside === 0) {
          good++;
          score += (inside === gsize) ? 3 : (inside >= gsize * 0.8) ? 2 : 1.5;
          validFeats.push(feats[ff]);
        } else if (qual >= thresh) {
          good++;
          score += 1;
          validFeats.push(feats[ff]);
        }
      }

      if (good >= opts.minPerfect && score > bestScore) {
        bestScore = score;
        bestGroup = { rows: d.rows.slice(), feats: validFeats };
      }
    }

    return bestGroup;
  }

  // Iteratively extracts diagnostic row groups from [colStart, colEnd]:
  // find the best-supported group, remove it from the pool, repeat, same
  // shape as SINEClusterer.clusterChunked's round loop but capped at a
  // small number of rounds since this runs once per recursive
  // split-and-merge call, not once for the whole alignment. Falls back to
  // a fully relaxed search (minPerfect=1, minOccurrences=1) once very few
  // rows remain, same as cluster.js's own "RESCUE"/"RETRY" behavior.
  function _diagnosticRowSplit(A, rows, colStart, colEnd, spans, P) {
    // Guard against the exact overfitting mode found on the real
    // mosaic_subset.aln.fa fixture (20 rows, 1 known real subgroup): with
    // too few rows to search, cluster.js's own "RESCUE"/ultra-relaxed
    // fallback (minPerfect=1, minOccurrences=1 once few rows remain) is
    // fine for its own purpose - a UI feature that must eventually place
    // every leftover sequence SOMEWHERE - but block-bicluster.js already
    // has a legitimate "residual" group for rows that don't cluster, so
    // there is no reason to force-fit small pools here, and doing so
    // manufactured ~25 spurious 3-row groups from what should have been
    // exactly 1 real subgroup once _windowedRowSplitScan started calling
    // this on many small windows/pools. Deliberately NOT using that
    // relaxed fallback at all.
    if (rows.length < P.HAPLOTYPE_MIN_USABLE_ROWS) return null;

    var maxRounds = 5;
    var minSize = P.MIN_BLOCK_ROWS;
    var groups = [];
    var avail = rows.slice();

    for (var round = 0; round < maxRounds && avail.length >= minSize; round++) {
      var opts = {
        minSize: minSize,
        minPerfect: 5,
        minOccurrences: 5,
        qualitySmall: 90,
        qualityMedium: 80,
        qualityLarge: 70,
        sizeSmallMedium: 11,
        sizeMediumLarge: 20,
        relaxUpperBound: false
      };

      var group = _findBestDiagnosticGroup(A, rows, avail, colStart, colEnd, spans, P, opts);
      if (!group) {
        opts.relaxUpperBound = true;
        group = _findBestDiagnosticGroup(A, rows, avail, colStart, colEnd, spans, P, opts);
      }
      if (!group) break;

      groups.push(group.rows);
      var removeSet = {};
      for (var r = 0; r < group.rows.length; r++) removeSet[group.rows[r]] = true;
      avail = avail.filter(function (i) { return !removeSet[i]; });
    }

    if (groups.length === 0) return null;

    var resultGroups = [];
    for (var g = 0; g < groups.length; g++) resultGroups.push({ rows: groups[g], residual: false });
    if (avail.length > 0) resultGroups.push({ rows: avail, residual: true });

    // Need at least 2 "real" partitions (either >=2 found groups, or 1
    // found group + a substantial residual) to be a meaningful split at
    // all - a single group covering everything isn't a split.
    if (groups.length < 1 || (groups.length === 1 && avail.length === 0)) return null;

    // Score gain against the block's diagnostic columns (same definition
    // as _haplotypeRowSplit uses) rather than the whole window - same
    // dilution reasoning as _columnListCoherence's comment explains.
    var nCols = colEnd - colStart + 1;
    var diagCols = [];
    for (var j = 0; j < nCols; j++) {
      var cs = columnStats(A, rows, colStart + j, spans);
      if (cs.covered >= P.MIN_COL_COVERAGE && (cs.dominantCount / cs.covered) < P.HAPLOTYPE_MAX_PURITY) {
        diagCols.push(colStart + j);
      }
    }
    if (diagCols.length === 0) return null;

    var wholeCoh = _columnListCoherence(A, rows, diagCols, spans, P);
    if (wholeCoh === null) wholeCoh = 0;

    var totalWeight = 0, weightedSum = 0;
    for (var g2 = 0; g2 < resultGroups.length; g2++) {
      var grows = resultGroups[g2].rows;
      var coh = _columnListCoherence(A, grows, diagCols, spans, P);
      if (coh === null) coh = 0;
      weightedSum += grows.length * coh;
      totalWeight += grows.length;
    }
    var weightedAvg = weightedSum / totalWeight;
    var gain = weightedAvg - wholeCoh;

    if (gain < P.HAPLOTYPE_MIN_GAIN) return null;

    return { groups: resultGroups, gain: gain };
  }

  // Tries all row-split strategies and takes whichever finds a real,
  // higher-gain split (or the one that finds anything, if only one does).
  // Complementary, not redundant - see each one's own comment for the
  // structural case it covers. _diagnosticRowSplit (ported from this
  // app's own proven Cluster Now feature) is generally the strongest of
  // the three and the only one that finds >2 groups, but is left as a
  // peer rather than a replacement since it hasn't been run through the
  // synthetic validation sweep the other two have.
  // Two rows byte-identical over [colStart, colEnd] (respecting spans -
  // a position outside a row's own span is missing, not compared) must
  // never end up in different groups of the same split - if they read
  // the same, they cannot be evidence for two different, competing
  // patterns at the same time. Confirmed as a real, reproducible bug on
  // the real oma_SINE16b file (34 such pairs) and a cropped region of it
  // (497 pairs): identical rows landing in separate low-coherence groups
  // (0.33 and 0.06), each individually weak enough that neither should
  // have been trusted, and inconsistent with each other on their face.
  // Deliberately a DIRECT character comparison, not span-aware (unlike
  // most of this file's other per-row logic) - confirmed as the actual
  // fix needed: a span-aware version that distinguished "gap outside this
  // row's span" from "gap inside it" still called two rows non-identical
  // when both simply display as "-" at every position, which is exactly
  // the case the user is pointing at ("if one sequence is atgc and
  // another is also atgc, they are not different clusters") - identical
  // means what's actually visible/comparable, not the internal
  // real-deletion-vs-missing-data distinction that matters elsewhere in
  // this file.
  function _rowsIdenticalInRange(A, r1, r2, colStart, colEnd, spans) {
    for (var c = colStart; c <= colEnd; c++) {
      if (A[r1][c] !== A[r2][c]) return false;
    }
    return true;
  }

  // Merges together any groups in a row-split result that contain at
  // least one identical-row pair (see _rowsIdenticalInRange), repeating
  // until no more such pairs cross a group boundary. If everything
  // collapses into a single group (the split had no real basis once this
  // invariant is enforced), returns null.
  function _enforceIdenticalRowsSameGroup(A, colStart, colEnd, spans, result) {
    if (!result) return result;
    var groups = result.groups.map(function(g) { return { rows: g.rows.slice(), residual: g.residual }; });
    var changed = true;
    while (changed) {
      changed = false;
      for (var gi = 0; gi < groups.length && !changed; gi++) {
        if (!groups[gi].rows.length) continue;
        for (var gj = gi + 1; gj < groups.length && !changed; gj++) {
          if (!groups[gj].rows.length) continue;
          for (var a = 0; a < groups[gi].rows.length && !changed; a++) {
            for (var b = 0; b < groups[gj].rows.length; b++) {
              if (_rowsIdenticalInRange(A, groups[gi].rows[a], groups[gj].rows[b], colStart, colEnd, spans)) {
                groups[gi].rows = groups[gi].rows.concat(groups[gj].rows);
                groups[gi].residual = groups[gi].residual && groups[gj].residual;
                groups[gj].rows = [];
                changed = true;
                break;
              }
            }
          }
        }
      }
    }
    groups = groups.filter(function(g) { return g.rows.length > 0; });
    if (groups.length < 2) return null;
    return { groups: groups, gain: result.gain };
  }

  function bestRowSplit(A, rows, colStart, colEnd, spans, P) {
    var gapResult = _gapRowSplit(A, rows, colStart, colEnd, spans, P);
    var hapResult = _haplotypeRowSplit(A, rows, colStart, colEnd, spans, P);
    var diagResult = _diagnosticRowSplit(A, rows, colStart, colEnd, spans, P);
    var best = null;
    if (gapResult && (!best || gapResult.gain > best.gain)) best = gapResult;
    if (hapResult && (!best || hapResult.gain > best.gain)) best = hapResult;
    if (diagResult && (!best || diagResult.gain > best.gain)) best = diagResult;
    return _enforceIdenticalRowsSameGroup(A, colStart, colEnd, spans, best);
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
  // When a wide range's row-split methods find nothing even though a real
  // row-split signal exists somewhere narrower inside it, the cause is
  // dilution: _haplotypeRowSplit/_diagnosticRowSplit both build their
  // diagnostic-column pool from EVERY qualifying column in whatever range
  // they're given, and a wide range can carry far more of those than the
  // one real signal belongs to (measured on real data: 196 diagnostic
  // columns across a 1274-col block that was mostly just "coherent
  // enough on average," only 12 of which belonged to the actual 66-col
  // haplotype split - the other 184 outcompeted/diluted it). Scan a
  // sliding window of P.WINDOW_SCAN_WIDTH columns (P.WINDOW_SCAN_MAX
  // windows max, 50% overlap) across the range, calling bestRowSplit on
  // each window alone so its diagnostic-column pool is restricted back
  // down to just that window. Returns the single best-gain result found,
  // paired with the window it came from, or null.
  function _windowedRowSplitScan(A, rows, colStart, colEnd, spans, P) {
    var totalWidth = colEnd - colStart + 1;
    var winWidth = P.WINDOW_SCAN_WIDTH;
    if (totalWidth <= winWidth) return null; // whole range already tried by the caller

    // NOTE: an earlier version applied a stricter gain threshold here as a
    // look-elsewhere correction. Measured directly: it broke real Stage 2b
    // recovery without fixing the actual false-positive source (narrow
    // ranges under WINDOW_SCAN_WIDTH bypass this scan entirely and call
    // bestRowSplit directly - see _diagnosticRowSplit's own guards for the
    // fix that actually mattered, on the mosaic_subset regression this was
    // meant to address). Removed rather than kept as a no-op multiplier.

    var step = Math.max(1, Math.floor(winWidth / 2));
    var best = null, bestWinStart = -1, bestWinEnd = -1;
    var winStart = colStart;
    var tried = 0;

    while (winStart <= colEnd && tried < P.WINDOW_SCAN_MAX) {
      var winEnd = Math.min(winStart + winWidth - 1, colEnd);
      if (winEnd - winStart + 1 >= P.MIN_BLOCK_COLS) {
        var result = bestRowSplit(A, rows, winStart, winEnd, spans, P);
        if (result && (!best || result.gain > best.gain)) {
          best = result;
          bestWinStart = winStart;
          bestWinEnd = winEnd;
        }
      }
      tried++;
      if (winEnd >= colEnd) break;
      winStart += step;
    }

    if (!best) return null;
    return { rowSplit: best, winStart: bestWinStart, winEnd: bestWinEnd };
  }

  // Return: a flat array of leaf objects, each { rows: [...], colStart,
  // colEnd, coherence }.
  function splitAndMerge(A, rows, colStart, colEnd, spans, P) {
    // Safety cap on total leaves
    if (_splitLeafCount >= 200) {
      _splitLeafCount++;
      return [{ rows: rows.slice(), colStart: colStart, colEnd: colEnd, coherence: blockCoherence(A, rows, colStart, colEnd, spans, P) }];
    }

    // Step 1: too small to split in both dimensions
    if (rows.length < 2 * P.MIN_BLOCK_ROWS && (colEnd - colStart + 1) < 2 * P.MIN_BLOCK_COLS) {
      _splitLeafCount++;
      return [{ rows: rows.slice(), colStart: colStart, colEnd: colEnd, coherence: blockCoherence(A, rows, colStart, colEnd, spans, P) }];
    }

    // Step 2: try splits (only in dimensions that can support one)
    var colSplit = null, rowSplit = null;
    if ((colEnd - colStart + 1) >= 2 * P.MIN_BLOCK_COLS) {
      colSplit = bestColumnSplit(A, rows, colStart, colEnd, spans, P);
    }
    if (rows.length >= 2 * P.MIN_BLOCK_ROWS) {
      rowSplit = bestRowSplit(A, rows, colStart, colEnd, spans, P);
    }

    // Step 3: neither found a real split at the full range - before
    // giving up, check whether a narrower window inside this range hides
    // a row-split signal that the full range's diagnostic-column dilution
    // was hiding (see _windowedRowSplitScan's comment). Only tried here,
    // not on every call, to keep the extra cost bounded to genuinely
    // stuck cases.
    if (!colSplit && !rowSplit) {
      var windowed = (colEnd - colStart + 1) >= 2 * P.MIN_BLOCK_COLS
        ? _windowedRowSplitScan(A, rows, colStart, colEnd, spans, P)
        : null;
      if (windowed) {
        var wLeaves = [];
        if (windowed.winStart > colStart) {
          wLeaves = wLeaves.concat(splitAndMerge(A, rows, colStart, windowed.winStart - 1, spans, P));
        }
        for (var wg = 0; wg < windowed.rowSplit.groups.length; wg++) {
          wLeaves = wLeaves.concat(splitAndMerge(A, windowed.rowSplit.groups[wg].rows, windowed.winStart, windowed.winEnd, spans, P));
        }
        if (windowed.winEnd < colEnd) {
          wLeaves = wLeaves.concat(splitAndMerge(A, rows, windowed.winEnd + 1, colEnd, spans, P));
        }
        return wLeaves;
      }
      _splitLeafCount++;
      return [{ rows: rows.slice(), colStart: colStart, colEnd: colEnd, coherence: blockCoherence(A, rows, colStart, colEnd, spans, P) }];
    }

    // Step 4: take whichever has the larger gain
    var useColSplit = false;
    if (colSplit && rowSplit) {
      useColSplit = (colSplit.gain >= rowSplit.gain);
    } else if (colSplit) {
      useColSplit = true;
    }

    var leaves = [];
    if (useColSplit) {
      var leftLeaves = splitAndMerge(A, rows, colStart, colSplit.splitCol, spans, P);
      var rightLeaves = splitAndMerge(A, rows, colSplit.splitCol + 1, colEnd, spans, P);
      leaves = leftLeaves.concat(rightLeaves);
    } else {
      for (var g = 0; g < rowSplit.groups.length; g++) {
        var groupLeaves = splitAndMerge(A, rowSplit.groups[g].rows, colStart, colEnd, spans, P);
        leaves = leaves.concat(groupLeaves);
      }
    }

    return leaves;
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
  // Fractional variance-reduction of splitting [colStart,colEnd] at
  // splitCol (single evaluation, not a search) - the exact same criterion
  // bestColumnSplit uses to accept a split, reused here so merging is
  // never allowed to undo a split that would have been worth taking in
  // the first place. This directly replaces a mean/coherence-based merge
  // test (removed - same mathematical flaw as the original gain formula:
  // a coherence-tolerance check comparing the merged mean to the min of
  // two parts is satisfied by almost any high+low combination, which is
  // exactly why it was silently re-merging genuine splits back together).
  function _columnSplitVarianceGain(A, rows, colStart, splitCol, colEnd, spans, P) {
    var sum = 0, sumSq = 0, n = 0;
    var lSum = 0, lSumSq = 0, lN = 0;
    var rSum = 0, rSumSq = 0, rN = 0;
    for (var j = colStart; j <= colEnd; j++) {
      var cs = columnStats(A, rows, j, spans);
      if (cs.covered < P.MIN_COL_COVERAGE) continue;
      var p = cs.dominantCount / cs.covered;
      sum += p; sumSq += p * p; n++;
      if (j <= splitCol) { lSum += p; lSumSq += p * p; lN++; }
      else { rSum += p; rSumSq += p * p; rN++; }
    }
    if (n === 0 || lN === 0 || rN === 0) return 0;
    var wholeMean = sum / n, wholeVar = (sumSq / n) - wholeMean * wholeMean;
    if (wholeVar <= 1e-9) return 0;
    var lMean = lSum / lN, lVar = (lSumSq / lN) - lMean * lMean;
    var rMean = rSum / rN, rVar = (rSumSq / rN) - rMean * rMean;
    var weightedVar = (lVar * lN + rVar * rN) / n;
    return (wholeVar - weightedVar) / wholeVar;
  }

  function mergeAdjacentLeaves(leaves, A, spans, P) {
    var sorted = leaves.slice().sort(function(a, b) { return a.colStart - b.colStart; });

    var changed = true;
    while (changed) {
      changed = false;
      var i = 0;
      while (i < sorted.length - 1) {
        var leafA = sorted[i];
        var leafB = sorted[i + 1];
        if (leafA.colEnd + 1 !== leafB.colStart || !sameRowSet(leafA.rows, leafB.rows)) {
          i++;
          continue;
        }

        var mergedCoherence = blockCoherence(A, leafA.rows, leafA.colStart, leafB.colEnd, spans, P);
        var splitGain = _columnSplitVarianceGain(A, leafA.rows, leafA.colStart, leafA.colEnd, leafB.colEnd, spans, P);

        // Only merge if splitting right back at this exact boundary
        // would NOT have been worth doing - i.e. the two parts aren't
        // meaningfully different regimes, just an arbitrary top-down
        // fragment of one uniform region.
        if (splitGain < P.MIN_VARIANCE_REDUCTION) {
          var merged = {
            rows: leafA.rows.slice(),
            colStart: leafA.colStart,
            colEnd: leafB.colEnd,
            coherence: mergedCoherence
          };
          sorted.splice(i, 2, merged);
          changed = true;
        } else {
          i++;
        }
      }
    }

    return sorted;
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
  // splitAndMerge's recursion termination ("too small to split further -
  // return whatever's left as a leaf") does not itself enforce
  // MIN_BLOCK_ROWS: a residual/leftover group can recurse down to a
  // single row and still come back as its own standalone leaf, even
  // though MIN_BLOCK_ROWS=3 is supposed to mean a group that small is
  // never treated as meaningful. Confirmed live in the UI: a 1-row leaf
  // rendered as its own colored block, which is not a real finding -
  // there is nothing for one row to share a pattern WITH. Fold any leaf
  // under MIN_BLOCK_ROWS into whichever SIBLING leaf shares its exact
  // column range (the group it was originally split off from) and is
  // largest, recomputing that sibling's coherence over the merged rows,
  // rather than leaving it to exist - and be colored - as if it were a
  // group.
  //
  // Same treatment for a leaf whose coherence is null: that means every
  // one of its rows is gap across the ENTIRE leaf range (no real base
  // data anywhere in it) - confirmed live on a real 3-row leaf that read
  // as pure gaps at every column. That is not a group that failed to
  // reach a coherence threshold, it is a group with literally zero
  // measurable evidence, and merging it away is the same fix as the
  // undersized case for the same underlying reason (do not let a group
  // exist - and be colored as a find - that mechanically cannot
  // demonstrate anything).
  function _mergeUndersizedLeaves(leaves, A, spans, P) {
    var byRange = {};
    for (var i = 0; i < leaves.length; i++) {
      var key = leaves[i].colStart + ':' + leaves[i].colEnd;
      if (!byRange[key]) byRange[key] = [];
      byRange[key].push(leaves[i]);
    }
    var toRemove = {};
    var keys = Object.keys(byRange);
    for (var k = 0; k < keys.length; k++) {
      var group = byRange[keys[k]];
      if (group.length < 2) continue; // no sibling to merge into
      for (var g = 0; g < group.length; g++) {
        var leaf = group[g];
        if (leaf.rows.length >= P.MIN_BLOCK_ROWS && leaf.coherence !== null) continue;
        var target = null;
        for (var g2 = 0; g2 < group.length; g2++) {
          if (g2 === g || toRemove[group[g2]._id]) continue;
          if (!target || group[g2].rows.length > target.rows.length) target = group[g2];
        }
        if (!target) continue;
        target.rows = target.rows.concat(leaf.rows);
        target.coherence = blockCoherence(A, target.rows, target.colStart, target.colEnd, spans, P);
        leaf._id = leaf._id || (k + '-' + g);
        toRemove[leaf._id] = true;
        // mark so a later leaf in this same group doesn't try to merge
        // into something already merged away
        leaf._merged = true;
      }
    }
    return leaves.filter(function(l) { return !l._merged; });
  }

  // Global version of the identical-rows-same-group invariant
  // (_rowsIdenticalInRange / _enforceIdenticalRowsSameGroup in
  // bestRowSplit, which only catches this WITHIN one row-split call's
  // own returned groups). Confirmed the narrower, within-call fix did
  // NOT reduce the real-file counts at all (still 34 and 497 pairs) -
  // the actual cases are two leaves produced by INDEPENDENT recursive
  // branches (different parent row-splits, each doing its own further
  // column-splitting) that happen to land on the exact same
  // [colStart, colEnd] boundary later, without ever being part of the
  // same bestRowSplit call's group list. Runs over the FINAL flat leaf
  // list, same "group siblings by exact column range" pattern as
  // _mergeUndersizedLeaves, merging any pair of same-range sibling
  // leaves that share an identical-row pair.
  function _mergeIdenticalRowSiblings(leaves, A, spans, P) {
    var byRange = {};
    for (var i = 0; i < leaves.length; i++) {
      var key = leaves[i].colStart + ':' + leaves[i].colEnd;
      if (!byRange[key]) byRange[key] = [];
      byRange[key].push(leaves[i]);
    }
    var toRemove = {};
    var keys = Object.keys(byRange);
    for (var k = 0; k < keys.length; k++) {
      var group = byRange[keys[k]];
      if (group.length < 2) continue;
      var cs = group[0].colStart, ce = group[0].colEnd;
      var changed = true;
      while (changed) {
        changed = false;
        for (var gi = 0; gi < group.length && !changed; gi++) {
          if (toRemove[group[gi]._idr]) continue;
          for (var gj = gi + 1; gj < group.length && !changed; gj++) {
            if (toRemove[group[gj]._idr]) continue;
            outer:
            for (var a = 0; a < group[gi].rows.length; a++) {
              for (var b = 0; b < group[gj].rows.length; b++) {
                if (_rowsIdenticalInRange(A, group[gi].rows[a], group[gj].rows[b], cs, ce, spans)) {
                  group[gi].rows = group[gi].rows.concat(group[gj].rows);
                  group[gi].coherence = blockCoherence(A, group[gi].rows, cs, ce, spans, P);
                  group[gj]._idr = group[gj]._idr || (k + '-' + gj);
                  toRemove[group[gj]._idr] = true;
                  group[gj]._merged = true;
                  changed = true;
                  break outer;
                }
              }
            }
          }
        }
      }
    }
    return leaves.filter(function(l) { return !l._merged; });
  }

  // Header pattern this app's own fixtures/pipeline use:
  // ACCESSION:START-END(strand)(strand) - two rows sharing the same
  // ACCESSION and START are the SAME genomic locus extracted with two
  // different end coordinates (a known artifact, not independent
  // biological evidence), e.g. "AYEL01072234.1:54276-54551(+)(+)" and
  // "AYEL01072234.1:54276-54620(+)(+)". Confirmed live: exactly this
  // pair counted as 2 of 4 rows "supporting" a weak block, doubling its
  // apparent weight. Returns the accession+start key, or null if the
  // header doesn't match this pattern (nothing to dedup against).
  function _duplicateLocusKey(name) {
    var m = /^([^:]+):(\d+)-\d+/.exec(name);
    return m ? (m[1] + ':' + m[2]) : null;
  }

  // Collapses same-locus duplicates into one representative row for
  // CLUSTERING purposes only - every row-split/coherence computation sees
  // at most one row per real locus, so a duplicate can never inflate a
  // group's apparent support. The final leaf output expands each
  // representative back out to all of its duplicate members afterward
  // (via expandRow, built alongside this), so every original row still
  // appears in the returned blocks, always in the same group as its
  // duplicate(s).
  function _dedupLocusRows(names) {
    var keyOf = names.map(_duplicateLocusKey);
    var repOfKey = {};
    var repOf = new Array(names.length);
    var membersOf = {};
    for (var i = 0; i < names.length; i++) {
      var key = keyOf[i];
      if (key === null) { repOf[i] = i; membersOf[i] = [i]; continue; }
      if (!(key in repOfKey)) { repOfKey[key] = i; membersOf[i] = []; }
      var rep = repOfKey[key];
      repOf[i] = rep;
      membersOf[rep].push(i);
    }
    var dedupedRows = [];
    for (var r = 0; r < names.length; r++) if (repOf[r] === r) dedupedRows.push(r);
    return { dedupedRows: dedupedRows, membersOf: membersOf };
  }

  function computeBiclusterMask(fastaText, params) {
    var P = resolveParams(params);
    var parsed = parseAln(fastaText);
    var A = parsed.A;
    var ncols = parsed.ncols;
    var names = parsed.names;
    var spans = coverageSpans(A);

    var dedup = _dedupLocusRows(names);
    var allRows = dedup.dedupedRows;

    _splitLeafCount = 0;
    var leaves = splitAndMerge(A, allRows, 0, ncols - 1, spans, P);
    leaves = _mergeUndersizedLeaves(leaves, A, spans, P);
    leaves = mergeAdjacentLeaves(leaves, A, spans, P);
    // Run identical-row enforcement LAST: mergeAdjacentLeaves can combine
    // column-adjacent same-row-set leaves into a wider range that
    // coincidentally matches another leaf's range from a completely
    // different branch, creating new identical-row conflicts that didn't
    // exist before it ran. Confirmed directly: running this pass before
    // mergeAdjacentLeaves left 4 (real file) / 9 (crop) pairs unfixed,
    // all at ranges mergeAdjacentLeaves had just produced.
    leaves = _mergeIdenticalRowSiblings(leaves, A, spans, P);
    // Final evidence check: a leaf can be a MERGE product of several
    // earlier passes (mergeAdjacentLeaves combines column-adjacent
    // same-row-set leaves; the two passes above fold undersized/
    // duplicate-conflicting leaves into siblings) without ever being
    // re-validated as a single unit against the real acceptance
    // criterion. Confirmed directly, live: a final 6-row leaf displayed
    // with plain coherence 0.58 (computed with the diluted, unstrict
    // formula used only for display) scored NULL under
    // _strictGroupCoherence (the actual formula _gapRowSplit uses to
    // accept a split) when tested against the same background in
    // isolation - meaning this exact leaf, as it ended up, has ZERO real
    // supporting evidence, despite having passed through a pipeline of
    // otherwise-individually-correct merge steps. If a same-range sibling
    // exists, fold this leaf's rows into it (same mechanism as
    // _mergeUndersizedLeaves); otherwise, force this leaf's OWN
    // coherence to null so the existing null-coherence display backstop
    // (script.js) still catches it even though plain blockCoherence
    // alone would not have flagged it.
    (function _dropUnsupportedLeaves() {
      var byRange = {};
      for (var i = 0; i < leaves.length; i++) {
        var key = leaves[i].colStart + ':' + leaves[i].colEnd;
        if (!byRange[key]) byRange[key] = [];
        byRange[key].push(leaves[i]);
      }
      var toRemove = {};
      var keys = Object.keys(byRange);
      for (var k = 0; k < keys.length; k++) {
        var group = byRange[keys[k]];
        // Background for re-validation is the union of rows across ALL
        // sibling leaves at this exact column range - NOT the full
        // global row set. Using the global set was tried and measured to
        // regress a real, known-good signal (mosaic_subset.aln.fa's
        // 5-row group): the group was originally validated against its
        // LOCAL recursive context (whatever rows remained at that point
        // in the recursion, often far fewer than the full alignment),
        // and comparing against the true global population is a
        // different, often much larger and differently-composed
        // reference population than what justified the split in the
        // first place. The local sibling union is the closest available
        // approximation of that original context after merging.
        var localBackground = [];
        for (var gb = 0; gb < group.length; gb++) localBackground = localBackground.concat(group[gb].rows);
        if (group.length < 2) continue; // no sibling context to validate against locally

        // Check every group's own evidence, regardless of size - "this
        // group is the biggest one here" does not mean it is real
        // background exempt from evidence (tried exempting the largest
        // group and measured it to still let a 6-of-9 unsupported group
        // through as a colored find, since a near-balanced split's
        // larger side is not automatically "everyone else"). What
        // matters for whether to MERGE a failing group away is whether
        // the group it would merge into ALSO lacks evidence - never
        // merge a failing group into one that has real evidence, or a
        // real finding gets swallowed by an unsupported one (measured:
        // this destroyed mosaic_subset's real 5-row split entirely when
        // tried without this restriction).
        var strictOf = {};
        for (var gs = 0; gs < group.length; gs++) {
          if (group[gs].rows.length === A.length) { strictOf[gs] = 1; continue; } // 'all' leaf, not a claimed group - treat as "has evidence" so it's never a merge target/source here
          strictOf[gs] = _strictGroupCoherence(A, group[gs].rows, group[gs].colStart, group[gs].colEnd, spans, P, localBackground);
        }
        for (var g = 0; g < group.length; g++) {
          var leaf = group[g];
          if (leaf.rows.length === A.length) continue; // whole-block 'all' leaf, not a claimed group
          if (strictOf[g] !== null) continue; // has real evidence, leave as-is
          var target = null;
          for (var g2 = 0; g2 < group.length; g2++) {
            if (g2 === g || toRemove[group[g2]._iddu]) continue;
            if (strictOf[g2] !== null) continue; // only merge into another group that ALSO lacks evidence
            if (!target || group[g2].rows.length > target.rows.length) target = group[g2];
          }
          if (target) {
            target.rows = target.rows.concat(leaf.rows);
            target.coherence = blockCoherence(A, target.rows, target.colStart, target.colEnd, spans, P);
            leaf._iddu = leaf._iddu || (k + '-' + g);
            toRemove[leaf._iddu] = true;
            leaf._merged = true;
          } else {
            leaf.coherence = null;
          }
        }
      }
      leaves = leaves.filter(function(l) { return !l._merged; });
    })();

    leaves.sort(function(a, b) { return a.colStart - b.colStart; });

    var blocks = leaves.map(function(leaf) {
      // Expand each representative row back out to all of its duplicate
      // locus members (see _dedupLocusRows) - every original row must
      // still appear in the output, always in the same group as its
      // duplicate(s), even though only the representative took part in
      // the actual clustering computation above.
      var expandedRows = [];
      for (var k = 0; k < leaf.rows.length; k++) {
        var members = dedup.membersOf[leaf.rows[k]];
        for (var m = 0; m < members.length; m++) expandedRows.push(members[m]);
      }
      var sortedRows = expandedRows.sort(function(a, b) { return a - b; });
      var isAll = sortedRows.length === A.length;
      if (isAll) {
        for (var i = 0; i < sortedRows.length; i++) {
          if (sortedRows[i] !== i) { isAll = false; break; }
        }
      }
      return {
        rows: isAll ? 'all' : sortedRows,
        col_start: leaf.colStart,
        col_end: leaf.colEnd,
        coherence: leaf.coherence
      };
    });

    return {
      n_rows: A.length,
      n_cols: ncols,
      row_headers: names,
      blocks: blocks
    };
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
