/*
 * block-mask.js — 2D block-mask classification for an MSA ("squint view").
 *
 * Faithful port of reference/block_schematic.py (the source of truth).
 * Pure functions, no DOM. computeBlockMask(fastaText, params, opts) -> maskJSON,
 * schema identical to reference/emit_fixture.py's output.
 *
 * Numpy semantics replicated exactly:
 *   - median: sorted; even length -> mean of the two middle values.
 *   - std: population (ddof=0).
 *   - bincount(b, minlength=4)[:4].argmax(): lowest index wins on a tie.
 *   - pad with constant GAP.
 * Integer results (column indices, group sizes, memberships, block count)
 * must be bit-identical to the Python. Float intermediates may differ < 1e-9
 * but must not flip a >=/> branch.
 */
(function (root) {
  'use strict';

  var GAP = 4;
  var CODE = { a: 0, c: 1, g: 2, t: 3, A: 0, C: 1, G: 2, T: 3 };

  // module defaults — same values as the Python globals
  var DEFAULTS = {
    WIN: 20,
    BG_MARGIN: 0.10,
    MOSAIC_STD: 0.12,
    DECAY_MIN_RUN: 3,
    ROW_MIN_GAP_ABS: 0.15,
    ROW_MIN_GAP_RATIO: 2.5,
    ROW_MIN_GROUP: 3,
    ZONE_BRIDGE: 2,
    ZONE_SPLIT_MAX_MAIN: 0.90,
    MIN_ZONE_W: 15,
    MIN_BLOCK_W: 15,
    FLANK: 250
  };

  function resolveParams(params) {
    var P = {}, k;
    for (k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) P[k] = DEFAULTS[k];
    if (params) for (k in params) if (params.hasOwnProperty(k) && params[k] != null) P[k] = params[k];
    return P;
  }

  // ---- numeric helpers ---------------------------------------------------

  function mean(a) {
    if (!a.length) return NaN;
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i];
    return s / a.length;
  }

  function std(a) {
    // population std, ddof=0
    if (!a.length) return NaN;
    var m = mean(a), s = 0;
    for (var i = 0; i < a.length; i++) { var d = a[i] - m; s += d * d; }
    return Math.sqrt(s / a.length);
  }

  function median(a) {
    if (!a.length) return NaN;
    var b = a.slice().sort(function (x, y) { return x - y; });
    var n = b.length, mid = n >> 1;
    return (n % 2) ? b[mid] : (b[mid - 1] + b[mid]) / 2;
  }

  function bincount4argmax(vals) {
    // bincount(vals, minlength=4)[:4].argmax(); lowest index on tie
    var c = [0, 0, 0, 0];
    for (var i = 0; i < vals.length; i++) { var v = vals[i]; if (v >= 0 && v < 4) c[v]++; }
    var best = 0;
    for (var k = 1; k < 4; k++) if (c[k] > c[best]) best = k;
    return best;
  }

  // ---- parsing ---------------------------------------------------------

  function parseAln(fastaText) {
    var names = [], seqs = [], cur = null;
    var lines = String(fastaText).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\s+$/, '');
      if (line.charAt(0) === '>') {
        names.push(line.slice(1));
        cur = [];
        seqs.push(cur);
      } else if (cur !== null) {
        cur.push(line);
      }
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

  function consensusIndex(names) {
    for (var i = 0; i < names.length; i++) {
      if (names[i].toUpperCase().indexOf('CONSENSUS') !== -1) return i;
    }
    return 0;
  }

  function hasExplicitConsensus(names) {
    for (var i = 0; i < names.length; i++) {
      if (names[i].toUpperCase().indexOf('CONSENSUS') !== -1) return true;
    }
    return false;
  }

  // When no row is named "consensus", using an arbitrary member row as the
  // reference is unsound: wherever THAT row happens to have its own private
  // gap (an insertion present in other copies but not in it), the element
  // coordinate space (built from that row's own non-gap positions) skips
  // those columns entirely -- a real hole in the mask, not a rendering
  // artifact. Build a true per-column majority-vote row instead, so the
  // reference reflects the whole alignment, not one arbitrary member.
  var CONSENSUS_MIN_COVERAGE = 3;
  function buildMajorityConsensusRow(A, minCoverage) {
    var ncols = A[0].length;
    var row = new Int8Array(ncols);
    for (var j = 0; j < ncols; j++) {
      var counts = [0, 0, 0, 0];
      var n = 0;
      for (var i = 0; i < A.length; i++) {
        var v = A[i][j];
        if (v !== GAP) { counts[v]++; n++; }
      }
      row[j] = (n >= minCoverage) ? argmaxCounts4(counts) : GAP;
    }
    return row;
  }
  function argmaxCounts4(counts) {
    var best = 0;
    for (var k = 1; k < 4; k++) if (counts[k] > counts[best]) best = k;
    return best;
  }

  function nonGapIndices(row) {
    var out = [];
    for (var i = 0; i < row.length; i++) if (row[i] !== GAP) out.push(i);
    return out;
  }

  function stripGaps(row, from, to) {
    var out = [];
    for (var i = from; i < to; i++) if (row[i] !== GAP) out.push(row[i]);
    return out;
  }

  // ---- stitched per-row arrays + majority track ----------------------

  function buildSeqsFull(A, ci, nzc, flank) {
    var lo = nzc[0], hi = nzc[nzc.length - 1];
    var L = nzc.length;
    var seqsFull = [];
    for (var i = 0; i < A.length; i++) {
      if (i === ci) continue;
      var row = A[i];
      var l = stripGaps(row, 0, lo);
      l.reverse();
      var leftTake = l.slice(0, flank);
      leftTake.reverse();
      var leftPart;
      if (leftTake.length < flank) {
        leftPart = new Array(flank - leftTake.length).fill(GAP).concat(leftTake);
      } else {
        leftPart = leftTake.slice(leftTake.length - flank);
      }
      var elemPart = new Array(L);
      for (var e = 0; e < L; e++) elemPart[e] = row[nzc[e]];
      var rr = stripGaps(row, hi + 1, row.length);
      var rightTake = rr.slice(0, flank);
      var rightPart;
      if (rightTake.length < flank) {
        rightPart = rightTake.concat(new Array(flank - rightTake.length).fill(GAP));
      } else {
        rightPart = rightTake.slice(0, flank);
      }
      seqsFull.push(leftPart.concat(elemPart, rightPart));
    }
    return seqsFull;
  }

  function buildMajFull(seqsFull, nx) {
    var maj = new Int8Array(nx);
    maj.fill(GAP);
    for (var j = 0; j < nx; j++) {
      var col = [];
      for (var i = 0; i < seqsFull.length; i++) {
        var v = j < seqsFull[i].length ? seqsFull[i][j] : GAP;
        if (v !== GAP) col.push(v);
      }
      if (col.length >= 8) maj[j] = bincount4argmax(col);
    }
    return maj;
  }

  // ---- windowed tracks (1D pair_id / bg) ---------------------------

  function pairIdentityCol(colVals) {
    var m = colVals.length;
    if (m < 4) return NaN;
    var cnt = [0, 0, 0, 0];
    for (var i = 0; i < m; i++) cnt[colVals[i]]++;
    var s = 0;
    for (var k = 0; k < 4; k++) s += cnt[k] * (cnt[k] - 1);
    return s / (m * (m - 1));
  }

  function windowedTracks(A, ci, nzc, flank) {
    var lo = nzc[0], hi = nzc[nzc.length - 1];
    var L = nzc.length;
    var n = A.length - 1;
    var xs = [], pair = [];

    var leftCols = [];
    for (var i = 0; i < A.length; i++) {
      if (i === ci) continue;
      var l = stripGaps(A[i], 0, lo);
      l.reverse();
      leftCols.push(l);
    }
    for (var off = flank; off >= 1; off--) {
      var colL = [];
      for (var a = 0; a < leftCols.length; a++) {
        var arr = leftCols[a];
        if (arr.length >= off) { var v = arr[off - 1]; if (v !== GAP) colL.push(v); }
      }
      xs.push(-off);
      pair.push(pairIdentityCol(colL));
    }

    for (var pi = 0; pi < nzc.length; pi++) {
      var c = nzc[pi];
      var colE = [];
      for (var r = 0; r < A.length; r++) {
        if (r === ci) continue;
        var vv = A[r][c];
        if (vv !== GAP) colE.push(vv);
      }
      xs.push(pi);
      pair.push(pairIdentityCol(colE));
    }

    var rightCols = [];
    for (var i2 = 0; i2 < A.length; i2++) {
      if (i2 === ci) continue;
      rightCols.push(stripGaps(A[i2], hi + 1, A[i2].length));
    }
    for (var off2 = 1; off2 <= flank; off2++) {
      var colR = [];
      for (var b2 = 0; b2 < rightCols.length; b2++) {
        var arr2 = rightCols[b2];
        if (arr2.length >= off2) { var v2 = arr2[off2 - 1]; if (v2 !== GAP) colR.push(v2); }
      }
      xs.push(L - 1 + off2);
      pair.push(pairIdentityCol(colR));
    }

    var q = Math.max(1, Math.floor(flank / 4));
    var far = [];
    for (var t = 0; t < xs.length; t++) {
      var x = xs[t], p = pair[t];
      var inLeft = (x >= -flank && x < -flank + q);
      var inRight = (x > L - 1 + flank - q && x <= L - 1 + flank);
      if ((inLeft || inRight) && isFinite(p)) far.push(p);
    }
    var bg = far.length ? median(far) : 0.25;
    return { xs: xs, pair: pair, L: L, bg: bg, n: n };
  }

  // ---- row clustering --------------------------------------------

  function clusterByValue(pairs, P) {
    var minGapAbs = P.ROW_MIN_GAP_ABS, minGapRatio = P.ROW_MIN_GAP_RATIO, minGroup = P.ROW_MIN_GROUP;
    var s = pairs.slice().sort(function (x, y) { return x[1] - y[1]; });
    var n = s.length;
    if (n < 2 * minGroup) {
      return s.length ? [s.map(function (t) { return t[0]; })] : [];
    }
    var gaps = [];
    for (var i = 0; i < n - 1; i++) gaps.push(s[i + 1][1] - s[i][1]);
    var medGap = gaps.length ? gaps.slice().sort(function (a, b) { return a - b; })[gaps.length >> 1] : 0;
    var cuts = [];
    for (var g = 0; g < gaps.length; g++) {
      if (gaps[g] >= minGapAbs && gaps[g] >= minGapRatio * Math.max(1e-6, medGap)) cuts.push(g + 1);
    }
    var groups = [], start = 0;
    for (var cI = 0; cI < cuts.length; cI++) { groups.push(s.slice(start, cuts[cI])); start = cuts[cI]; }
    groups.push(s.slice(start));
    var merged = [];
    for (var gi = 0; gi < groups.length; gi++) {
      var grp = groups[gi];
      if (merged.length && grp.length < minGroup) {
        var last = merged[merged.length - 1];
        for (var m2 = 0; m2 < grp.length; m2++) last.push(grp[m2]);
      } else {
        merged.push(grp.slice());
      }
    }
    return merged.map(function (grp) { return grp.map(function (t) { return t[0]; }); });
  }

  function rowPartitionForWindow(seqsFull, majFull, loI, hiI, P) {
    // Coverage requirement is relative to each row's OWN real sequence in
    // this span, not a fixed fraction of the window's stitched width. A
    // wide zone (e.g. a flank with strong per-copy length variation) can
    // be far wider than any single row's actual bases there; requiring
    // "half the window" in that case means NO row ever qualifies, and
    // clustering silently returns nothing. Requiring "half of what this
    // row actually has here" lets a short flank in a wide zone still be
    // classified.
    var pairs = [];
    for (var idx = 0; idx < seqsFull.length; idx++) {
      var s = seqsFull[idx];
      var vals = [];
      var ownLen = 0;
      for (var j = loI; j < hiI; j++) {
        if (j < s.length && s[j] !== GAP) {
          ownLen++;
          if (majFull[j] !== GAP) vals.push(s[j] === majFull[j] ? 1.0 : 0.0);
        }
      }
      var need = Math.max(3, ownLen * 0.5);
      if (vals.length >= need) pairs.push([idx, mean(vals)]);
    }
    return clusterByValue(pairs, P);
  }

  function windowMosaic(seqsFull, majFull, centerIdx, halfWin) {
    var loI = Math.max(0, centerIdx - halfWin);
    var hiI = Math.min(majFull.length, centerIdx + halfWin + 1);
    var need = Math.max(3, (hiI - loI) >> 1);
    var rates = [];
    for (var i = 0; i < seqsFull.length; i++) {
      var s = seqsFull[i];
      var vals = [];
      for (var j = loI; j < hiI; j++) {
        if (j < s.length && s[j] !== GAP && majFull[j] !== GAP) vals.push(s[j] === majFull[j] ? 1.0 : 0.0);
      }
      if (vals.length >= need) rates.push(mean(vals));
    }
    return rates.length >= 4 ? std(rates) : null;
  }

  function groupMeanPairId(seqsFull, loI, hiI, rows) {
    var tot = 0, hits = 0;
    for (var j = loI; j < hiI; j++) {
      var col = [];
      for (var ri = 0; ri < rows.length; ri++) {
        var r = rows[ri];
        if (j < seqsFull[r].length && seqsFull[r][j] !== GAP) col.push(seqsFull[r][j]);
      }
      if (col.length < 3) continue;
      var maj = bincount4argmax(col);
      for (var c = 0; c < col.length; c++) if (col[c] === maj) hits++;
      tot += col.length;
    }
    return tot ? hits / tot : 0.0;
  }

  // ---- simple-repeat scan on the consensus element --------------

  function repeatCols(cseq) {
    var set = {};
    var periodMax = 6, i = 0, Lc = cseq.length;
    while (i < Lc - 1) {
      var found = false;
      for (var period = 1; period <= periodMax; period++) {
        if (i + period * 3 > Lc) continue;
        var unit = cseq.substr(i, period);
        var j = i + period;
        while (cseq.substr(j, period) === unit && j + period <= Lc) j += period;
        if (Math.floor((j - i) / period) >= 4 && (j - i) >= 8) {
          for (var k = i; k < j; k++) set[k] = true;
          i = j;
          found = true;
          break;
        }
      }
      if (!found) i += 1;
    }
    return set;
  }

  // ---- 1D classification --------------------------------------

  function classifyBlocks(A, ci, nzc, flank, P) {
    var wt = windowedTracks(A, ci, nzc, flank);
    var xs = wt.xs, pair = wt.pair, L = wt.L, bg = wt.bg;

    var seqsFull = buildSeqsFull(A, ci, nzc, flank);
    var nx = xs.length;
    var majFull = buildMajFull(seqsFull, nx);

    var halfWin = Math.max(2, P.WIN >> 1);
    var mosaic = new Array(nx);
    for (var j = 0; j < nx; j++) mosaic[j] = windowMosaic(seqsFull, majFull, j, halfWin);

    var cons = A[ci];
    var cchars = '';
    for (var e = 0; e < nzc.length; e++) cchars += 'ACGT'.charAt(cons[nzc[e]]);
    var rep = repeatCols(cchars);

    var labels = new Array(nx);
    for (var idx = 0; idx < nx; idx++) {
      var x = xs[idx], p = pair[idx], m = mosaic[idx];
      if (x >= 0 && x < L && rep[x]) { labels[idx] = 'SIMPLE_REPEAT'; continue; }
      if (p == null || !isFinite(p)) { labels[idx] = 'DIVERGENT'; continue; }
      var elevated = p > bg + P.BG_MARGIN;
      var isMosaic = (m != null) && (m > P.MOSAIC_STD);
      if (elevated && isMosaic) labels[idx] = 'MOSAIC';
      else if (elevated) labels[idx] = 'CONSERVATIVE';
      else labels[idx] = 'DIVERGENT';
    }

    var fin = labels.slice();
    var i2 = 0;
    while (i2 < fin.length) {
      if (fin[i2] === 'DIVERGENT') {
        var j2 = i2;
        while (j2 < fin.length && fin[j2] === 'DIVERGENT') j2++;
        var seg = [];
        for (var k = i2; k < j2; k++) if (pair[k] != null && isFinite(pair[k])) seg.push(pair[k]);
        var touches = (i2 > 0 && (fin[i2 - 1] === 'CONSERVATIVE' || fin[i2 - 1] === 'MOSAIC')) ||
                      (j2 < fin.length && (fin[j2] === 'CONSERVATIVE' || fin[j2] === 'MOSAIC'));
        if (seg.length >= P.DECAY_MIN_RUN && touches) {
          var half = seg.length >> 1;
          if (half >= 1 && (mean(seg.slice(0, half)) - mean(seg.slice(half))) > 0.03) {
            for (var kk = i2; kk < j2; kk++) fin[kk] = 'DECAY_SLOPE';
          }
        }
        i2 = j2;
      } else {
        i2++;
      }
    }

    var blocks = [];
    var start = 0;
    for (var kb = 1; kb <= fin.length; kb++) {
      if (kb === fin.length || fin[kb] !== fin[start]) {
        blocks.push({ type: fin[start], x_start: xs[start], x_end: xs[kb - 1], n_pos: kb - start });
        start = kb;
      }
    }
    return { blocks: blocks, bg: bg, L: L };
  }

  // ---- 2D classification ------------------------------------

  function classifyBlocks2d(A, ci, nzc, flank, P) {
    var oned = classifyBlocks(A, ci, nzc, flank, P);
    var blocks1d = oned.blocks, bg = oned.bg, L = oned.L;

    var seqsFull = buildSeqsFull(A, ci, nzc, flank);
    var L2 = nzc.length;
    var nRows = seqsFull.length;
    var xs = [];
    for (var x = -flank; x < 0; x++) xs.push(x);
    for (var x2 = 0; x2 < L2; x2++) xs.push(x2);
    for (var x3 = L2; x3 < L2 + flank; x3++) xs.push(x3);
    var majFull = buildMajFull(seqsFull, xs.length);

    var xToIdx = {};
    for (var t = 0; t < xs.length; t++) xToIdx[xs[t]] = t;

    var posLabel = new Array(xs.length).fill(null);
    for (var bi = 0; bi < blocks1d.length; bi++) {
      var b = blocks1d[bi];
      for (var xx = b.x_start; xx <= b.x_end; xx++) {
        if (xToIdx.hasOwnProperty(xx)) posLabel[xToIdx[xx]] = b.type;
      }
    }
    var elevated = posLabel.map(function (lab) { return lab === 'CONSERVATIVE' || lab === 'MOSAIC'; });

    var regionBounds = [[0, flank], [flank, flank + L2], [flank + L2, xs.length]];

    function zonesIn(a, bEnd) {
      var out = [];
      var i = a;
      while (i < bEnd) {
        if (!elevated[i]) { i++; continue; }
        var j = i, gap = 0, k = i;
        while (k < bEnd) {
          if (elevated[k]) { j = k; gap = 0; }
          else { gap++; if (gap > P.ZONE_BRIDGE) break; }
          k++;
        }
        out.push([i, j + 1]);
        i = k;
      }
      return out;
    }

    var zones = [];
    for (var rb = 0; rb < regionBounds.length; rb++) {
      var zin = zonesIn(regionBounds[rb][0], regionBounds[rb][1]);
      for (var zi = 0; zi < zin.length; zi++) {
        if (zin[zi][1] - zin[zi][0] >= P.MIN_ZONE_W) zones.push(zin[zi]);
      }
    }

    var zoneRanges = [];
    var blocks2d = [];
    for (var z = 0; z < zones.length; z++) {
      var zlo = zones[z][0], zhi = zones[z][1];
      var groups = rowPartitionForWindow(seqsFull, majFull, zlo, zhi, P);
      var real = groups.filter(function (g) { return g.length >= P.ROW_MIN_GROUP; });
      real.sort(function (g1, g2) { return g2.length - g1.length; });
      var xStart = xs[zlo], xEnd = xs[zhi - 1];
      if (real.length < 2 || real[0].length >= P.ZONE_SPLIT_MAX_MAIN * nRows) continue;
      zoneRanges.push([xStart, xEnd]);
      var covered = {};
      for (var rank = 0; rank < real.length; rank++) {
        var g = real[rank];
        for (var gg = 0; gg < g.length; gg++) covered[g[gg]] = true;
        var typ;
        if (rank === 0) {
          var mid = groupMeanPairId(seqsFull, zlo, zhi, g);
          typ = mid > bg + 2 * P.BG_MARGIN ? 'CONSERVATIVE' : 'MOSAIC';
        } else {
          typ = 'MOSAIC';
        }
        blocks2d.push({
          type: typ, x_start: xStart, x_end: xEnd, n_pos: zhi - zlo,
          rows: g.slice().sort(function (u, w) { return u - w; }),
          n_rows: g.length, row_group_rank: rank
        });
      }
      var residual = [];
      for (var rr = 0; rr < nRows; rr++) if (!covered[rr]) residual.push(rr);
      if (residual.length) {
        blocks2d.push({
          type: 'DIVERGENT', x_start: xStart, x_end: xEnd, n_pos: zhi - zlo,
          rows: residual.slice().sort(function (u, w) { return u - w; }),
          n_rows: residual.length, row_group_rank: 'residual'
        });
      }
    }

    function clipOutZones(bk) {
      var segs = [[bk.x_start, bk.x_end]];
      for (var zr = 0; zr < zoneRanges.length; zr++) {
        var zs = zoneRanges[zr][0], ze = zoneRanges[zr][1];
        var next = [];
        for (var si = 0; si < segs.length; si++) {
          var sS = segs[si][0], sE = segs[si][1];
          if (sE < zs || sS > ze) { next.push([sS, sE]); continue; }
          if (sS < zs) next.push([sS, zs - 1]);
          if (sE > ze) next.push([ze + 1, sE]);
        }
        segs = next;
      }
      return segs;
    }

    for (var b1 = 0; b1 < blocks1d.length; b1++) {
      var blk = blocks1d[b1];
      var frags = clipOutZones(blk);
      for (var fi = 0; fi < frags.length; fi++) {
        var fS = frags[fi][0], fE = frags[fi][1];
        if (fE >= fS) {
          blocks2d.push({
            type: blk.type, x_start: fS, x_end: fE, n_pos: fE - fS + 1,
            rows: 'all', n_rows: nRows
          });
        }
      }
    }

    function secondKey(bk) {
      var rrk = bk.hasOwnProperty('row_group_rank') ? bk.row_group_rank : -1;
      return (typeof rrk === 'number') ? rrk : 99;
    }
    function cmpBlocks(u, w) {
      return (u.x_start - w.x_start) || (secondKey(u) - secondKey(w));
    }
    blocks2d.sort(cmpBlocks);

    function absorb(bl) {
      var changed = true;
      while (changed && bl.length > 1) {
        changed = false;
        var fh = [];
        for (var k = 0; k < bl.length; k++) {
          var rv = bl[k].rows;
          if (rv == null || rv === 'all') fh.push(k);
        }
        for (var pos = 0; pos < fh.length; pos++) {
          var k2 = fh[pos];
          var bb = bl[k2];
          if (bb.x_end - bb.x_start + 1 >= P.MIN_BLOCK_W) continue;
          var left = pos > 0 ? bl[fh[pos - 1]] : null;
          var right = (pos + 1 < fh.length) ? bl[fh[pos + 1]] : null;
          var cand = [];
          if (left && left.x_end + 1 >= bb.x_start - 3) cand.push(left);
          if (right && right.x_start - 1 <= bb.x_end + 3) cand.push(right);
          if (!cand.length) continue;
          var host = cand[0];
          for (var ci2 = 1; ci2 < cand.length; ci2++) {
            if ((cand[ci2].x_end - cand[ci2].x_start) > (host.x_end - host.x_start)) host = cand[ci2];
          }
          host.x_start = Math.min(host.x_start, bb.x_start);
          host.x_end = Math.max(host.x_end, bb.x_end);
          host.n_pos = host.x_end - host.x_start + 1;
          bl.splice(k2, 1);
          changed = true;
          break;
        }
      }
      return bl;
    }
    blocks2d = absorb(blocks2d);
    blocks2d.sort(cmpBlocks);
    return { blocks: blocks2d, bg: bg, L: L, nRows: nRows };
  }

  // ---- public entry point --------------------------------

  function computeBlockMask(fastaText, params, opts) {
    var P = resolveParams(params);
    opts = opts || {};
    var parsed = parseAln(fastaText);
    var A = parsed.A, names = parsed.names, nCols = parsed.ncols;
    var ci = consensusIndex(names);
    var nzc = nonGapIndices(A[ci]);
    var col0 = nzc[0], col1 = nzc[nzc.length - 1];
    var L = nzc.length;
    var flank = P.FLANK;

    var res = classifyBlocks2d(A, ci, nzc, flank, P);

    function xToCol(x) {
      if (x < 0) return col0 + x;
      if (x < L) return nzc[x];
      return col1 + (x - L + 1);
    }

    var outBlocks = [];
    for (var i = 0; i < res.blocks.length; i++) {
      var b = res.blocks[i];
      var cs = Math.max(0, xToCol(b.x_start));
      var ce = Math.min(nCols - 1, xToCol(b.x_end));
      if (ce < cs) continue;
      var entry = { type: b.type, col_start: cs, col_end: ce };
      entry.rows = (b.rows == null || b.rows === 'all') ? 'all'
        : b.rows.map(function (r) { return r | 0; }).sort(function (u, w) { return u - w; });
      if (b.hasOwnProperty('row_group_rank')) entry.group_rank = b.row_group_rank;
      outBlocks.push(entry);
    }

    var rowHeaders = [];
    for (var h = 0; h < names.length; h++) if (h !== ci) rowHeaders.push(names[h]);

    var paramKeys = ['WIN', 'MOSAIC_STD', 'BG_MARGIN', 'MIN_ZONE_W', 'ZONE_BRIDGE',
                     'ROW_MIN_GROUP', 'ROW_MIN_GAP_ABS', 'MIN_BLOCK_W'];
    var paramsOut = {};
    if (params) {
      for (var pk = 0; pk < paramKeys.length; pk++) {
        if (params.hasOwnProperty(paramKeys[pk])) paramsOut[paramKeys[pk]] = params[paramKeys[pk]];
      }
    }

    return {
      alignment_id: opts.alignmentId != null ? opts.alignmentId : '',
      preset: opts.preset != null ? opts.preset : null,
      n_rows: res.nRows,
      n_cols: nCols,
      elem_col_start: col0,
      elem_col_end: col1,
      row_headers: rowHeaders,
      params: paramsOut,
      blocks: outBlocks
    };
  }

  var api = {
    computeBlockMask: computeBlockMask,
    parseAln: parseAln,
    consensusIndex: consensusIndex,
    classifyBlocks2d: classifyBlocks2d,
    _internals: {
      windowedTracks: windowedTracks,
      buildSeqsFull: buildSeqsFull,
      buildMajFull: buildMajFull,
      clusterByValue: clusterByValue,
      rowPartitionForWindow: rowPartitionForWindow,
      windowMosaic: windowMosaic,
      median: median, std: std, mean: mean, bincount4argmax: bincount4argmax,
      DEFAULTS: DEFAULTS
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BlockMask = api;
})(typeof window !== 'undefined' ? window : this);
