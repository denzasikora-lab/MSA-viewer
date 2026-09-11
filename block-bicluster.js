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
    HAPLOTYPE_MIN_USABLE_ROWS: 20 // below this many rows with real data at the diagnostic columns, a clean-looking 2-way split is too easily found by chance (measured: small samples of ~16 rows produced gain up to 0.19 on a uniform/noise fixture; real biological structure recovered here used 48 rows) - this is the primary guard against overfitting on small blocks, not a claim that real structure can't exist in fewer rows
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

    // Compute weighted-average coherence of accepted groups
    var wholeBlockCoherence = blockCoherence(A, rows, colStart, colEnd, spans, P);
    if (wholeBlockCoherence === null) wholeBlockCoherence = 0;

    var totalWeight = 0, weightedSum = 0;
    for (var g = 0; g < acceptedGroups.length; g++) {
      var groupRows = acceptedGroups[g].map(function(x) { return x.idx; });
      var coh = blockCoherence(A, groupRows, colStart, colEnd, spans, P);
      if (coh === null) coh = 0;
      weightedSum += groupRows.length * coh;
      totalWeight += groupRows.length;
    }

    var weightedAvg = weightedSum / totalWeight;
    var gain = weightedAvg - wholeBlockCoherence;

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

  // Tries both row-split strategies and takes whichever finds a real,
  // higher-gain split (or the one that finds anything, if only one does).
  // _gapRowSplit and _haplotypeRowSplit are complementary, not redundant -
  // see each one's own comment for the structural case it covers.
  function bestRowSplit(A, rows, colStart, colEnd, spans, P) {
    var gapResult = _gapRowSplit(A, rows, colStart, colEnd, spans, P);
    var hapResult = _haplotypeRowSplit(A, rows, colStart, colEnd, spans, P);
    if (gapResult && hapResult) return (hapResult.gain > gapResult.gain) ? hapResult : gapResult;
    return gapResult || hapResult || null;
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

    // Step 3: neither found a real split
    if (!colSplit && !rowSplit) {
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
  function computeBiclusterMask(fastaText, params) {
    var P = resolveParams(params);
    var parsed = parseAln(fastaText);
    var A = parsed.A;
    var ncols = parsed.ncols;
    var names = parsed.names;
    var spans = coverageSpans(A);

    var allRows = [];
    for (var i = 0; i < A.length; i++) allRows.push(i);

    _splitLeafCount = 0;
    var leaves = splitAndMerge(A, allRows, 0, ncols - 1, spans, P);
    leaves = mergeAdjacentLeaves(leaves, A, spans, P);

    leaves.sort(function(a, b) { return a.colStart - b.colStart; });

    var blocks = leaves.map(function(leaf) {
      var sortedRows = leaf.rows.slice().sort(function(a, b) { return a - b; });
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
