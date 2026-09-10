#!/usr/bin/env python3
"""Block-schematic classification: turn the per-position tracks (pairwise
identity, coverage, mosaicism) into a small number of labeled, contiguous
blocks -- a coarse structural summary next to the fine-grained line graph,
the way a gene-structure track summarizes exon/intron/UTR rather than
showing raw per-base conservation.

Block types (Sergei, 2026-09-10), in classification priority order:
  SIMPLE_REPEAT        consensus itself is a tandem repeat here (reuses
                        measure_c.py's simple_repeats(), not reinvented)
  CONSERVATIVE         high identity, ~all copies agree, low mosaicism
  MOSAIC               high-ish identity but only a SUBSET of copies agree
                        (high per-window match-rate variance) -- the
                        "conservative part of mosaic (not all copies)" case
  DECAY_SLOPE          identity trending down over several consecutive
                        windows without a sharp drop -- LINE-like rugged
                        decay, not a real boundary
  DIVERGENT            background identity -- ordinary flank/unrelated DNA

This reuses report_profile.py's already-computed pair_id/cover tracks (no
new alignment pass) plus a per-window mosaicism computed the same way
edge_profile.py's per-copy match-rate variance is (extended across the full
flank+element range, not just the element -- report_profile.py's own
mosaic track was element-only).
"""
import numpy as np

GAP = 4
CODE = {"a": 0, "c": 1, "g": 2, "t": 3, "A": 0, "C": 1, "G": 2, "T": 3}
WIN = 20
BG_MARGIN = 0.10       # pair_id above background + this counts as "elevated"
MOSAIC_STD = 0.12       # per-window match-rate std above this counts as mosaic
DECAY_MIN_RUN = 3       # consecutive declining windows to call it a slope


def read_aln(path):
    names, seqs, cur = [], [], None
    for line in open(path):
        line = line.rstrip()
        if line.startswith(">"):
            names.append(line[1:]); seqs.append([]); cur = seqs[-1]
        elif cur is not None:
            cur.append(line)
    seqs = ["".join(s) for s in seqs]
    L = max(len(s) for s in seqs)
    A = np.full((len(seqs), L), GAP, dtype=np.int8)
    for i, s in enumerate(seqs):
        for j, ch in enumerate(s):
            A[i, j] = CODE.get(ch, GAP)
    return names, A


def consensus_index(names):
    for i, h in enumerate(names):
        if "CONSENSUS" in h.upper():
            return i
    return 0


def windowed_tracks(path, flank=200):
    """Build per-window (pair_id, cover, mosaic_std, x) across
    [-flank .. elem_len-1+flank], same 3-zone x-axis as report_profile.py,
    stitched from each copy's own edge outward on ungapped sequence."""
    names, A = read_aln(path)
    ci = consensus_index(names)
    cons = A[ci]
    nzc = np.where(cons != GAP)[0]
    lo, hi = int(nzc[0]), int(nzc[-1])
    C = np.delete(A, ci, axis=0)
    n = C.shape[0]
    L = len(nzc)

    def pair_identity_col(col):
        b = col[col != GAP]
        m = len(b)
        if m < 4:
            return np.nan
        cnt = np.bincount(b, minlength=4)[:4].astype(float)
        return float((cnt * (cnt - 1)).sum() / (m * (m - 1)))

    xs, pair, cover = [], [], []
    left_cols = []
    for i in range(n):
        r = C[i, :lo]
        r = r[r != GAP]
        left_cols.append(r[::-1])
    for off in range(flank, 0, -1):
        col = np.array([l[off - 1] if len(l) >= off else GAP for l in left_cols], dtype=np.int8)
        xs.append(-off); pair.append(pair_identity_col(col))
        cover.append(float((col != GAP).sum()) / n)

    for p_i, c in enumerate(nzc):
        col = C[:, c]
        xs.append(p_i); pair.append(pair_identity_col(col))
        cover.append(float((col != GAP).sum()) / n)

    right_cols = []
    for i in range(n):
        r = C[i, hi + 1:]
        right_cols.append(r[r != GAP])
    for off in range(1, flank + 1):
        col = np.array([r[off - 1] if len(r) >= off else GAP for r in right_cols], dtype=np.int8)
        xs.append(L - 1 + off); pair.append(pair_identity_col(col))
        cover.append(float((col != GAP).sum()) / n)

    # background = median pair_id in the far flank (last quarter each side)
    q = max(1, flank // 4)
    far = [p for x, p in zip(xs, pair) if (-flank <= x < -flank + q or L - 1 + flank - q < x <= L - 1 + flank)
           and np.isfinite(p)]
    bg = float(np.median(far)) if far else 0.25

    return xs, pair, cover, L, bg, n, (names, A, ci, lo, hi)


ROW_MIN_GAP_ABS = 0.15     # match-rate gap needed to call a real row-split (not gradient)
ROW_MIN_GAP_RATIO = 2.5
ROW_MIN_GROUP = 3          # groups smaller than this fold into the residual/neighbor group


def cluster_by_value(pairs, min_gap_abs=None, min_gap_ratio=None, min_group=None):
    if min_gap_abs is None:
        min_gap_abs = ROW_MIN_GAP_ABS
    if min_gap_ratio is None:
        min_gap_ratio = ROW_MIN_GAP_RATIO
    if min_group is None:
        min_group = ROW_MIN_GROUP
    """pairs: list of (row_idx, value). Same gap-detection algorithm as
    edge_profile.cluster_edges, applied to match-rate instead of bp offset --
    a real gap must be both absolutely large and large relative to the
    typical gap elsewhere, so a continuous decay gradient (small gaps
    throughout) reports as ONE group rather than being sliced arbitrarily."""
    s = sorted(pairs, key=lambda t: t[1])
    n = len(s)
    if n < 2 * min_group:
        return [[i for i, _ in s]] if s else []
    gaps = [s[i + 1][1] - s[i][1] for i in range(n - 1)]
    med_gap = sorted(gaps)[len(gaps) // 2] if gaps else 0
    cuts = [i + 1 for i, g in enumerate(gaps)
            if g >= min_gap_abs and g >= min_gap_ratio * max(1e-6, med_gap)]
    groups, start = [], 0
    for c in cuts:
        groups.append(s[start:c]); start = c
    groups.append(s[start:])
    merged = []
    for g in groups:
        if merged and len(g) < min_group:
            merged[-1].extend(g)
        else:
            merged.append(list(g))
    return [[i for i, _ in g] for g in merged]


def row_partition_for_window(seqs_full, maj_full, lo_i, hi_i):
    """Per-row match-rate to majority over [lo_i,hi_i), then gap-clustered.
    Returns a list of row-index groups (each a list of row indices); rows
    with too little data in this window are omitted, not defaulted."""
    pairs = []
    for idx, s in enumerate(seqs_full):
        vals = []
        for j in range(lo_i, hi_i):
            if j < len(s) and s[j] != GAP and maj_full[j] != GAP:
                vals.append(1.0 if s[j] == maj_full[j] else 0.0)
        if len(vals) >= max(3, (hi_i - lo_i) // 2):
            pairs.append((idx, float(np.mean(vals))))
    return cluster_by_value(pairs)


def window_mosaic(seqs_full, maj_full, center_idx, half_win=WIN // 2):
    """Per-copy match rate vs a precomputed majority track, std across
    copies, in a window centered at center_idx (indices into seqs_full's
    own coordinate space, already aligned position-for-position)."""
    lo_i = max(0, center_idx - half_win)
    hi_i = min(len(maj_full), center_idx + half_win + 1)
    rates = []
    for s in seqs_full:
        vals = []
        for j in range(lo_i, hi_i):
            if j < len(s) and s[j] != GAP and maj_full[j] != GAP:
                vals.append(1.0 if s[j] == maj_full[j] else 0.0)
        if len(vals) >= max(3, (hi_i - lo_i) // 2):
            rates.append(np.mean(vals))
    return float(np.std(rates)) if len(rates) >= 4 else None


def classify_blocks(path, flank=200):
    xs, pair, cover, L, bg, n, aux = windowed_tracks(path, flank)
    names, A, ci, lo, hi = aux
    cons = A[ci]

    # majority track across the SAME stitched x-range, for mosaic std
    C = np.delete(A, ci, axis=0)
    # rebuild the same stitched per-copy arrays used above, but as a matrix
    # aligned to xs, for the mosaic calc (recompute cheaply from A directly)
    nzc = np.where(cons != GAP)[0]
    seqs_full = []
    lefts, rights = [], []
    for i in range(C.shape[0]):
        l = C[i, :lo]; l = l[l != GAP][::-1]
        r = C[i, hi + 1:]; r = r[r != GAP]
        lefts.append(l); rights.append(r)
    for i in range(C.shape[0]):
        left_part = lefts[i][:flank][::-1]
        left_part = np.pad(left_part, (flank - len(left_part), 0), constant_values=GAP) if len(left_part) < flank else left_part[-flank:]
        elem_part = np.array([C[i, c] for c in nzc], dtype=np.int8)
        right_part = rights[i][:flank]
        right_part = np.pad(right_part, (0, flank - len(right_part)), constant_values=GAP) if len(right_part) < flank else right_part[:flank]
        seqs_full.append(np.concatenate([left_part, elem_part, right_part]))

    maj_full = np.full(len(xs), GAP, dtype=np.int8)
    for j in range(len(xs)):
        col = np.array([s[j] if j < len(s) else GAP for s in seqs_full], dtype=np.int8)
        b = col[col != GAP]
        if len(b) >= 8:
            maj_full[j] = int(np.bincount(b, minlength=4)[:4].argmax())

    mosaic = [window_mosaic(seqs_full, maj_full, j, max(2, WIN // 2)) for j in range(len(xs))]

    # simple-repeat positions in the CONSENSUS (element only)
    cseq = "".join("ACGT"[c] for c in cons[nzc])
    repeat_cols = set()
    period_max = 6
    i = 0
    while i < len(cseq) - 1:
        found = False
        for period in range(1, period_max + 1):
            if i + period * 3 > len(cseq):
                continue
            unit = cseq[i:i + period]
            j = i + period
            while cseq[j:j + period] == unit and j + period <= len(cseq):
                j += period
            if (j - i) // period >= 4 and (j - i) >= 8:
                for k in range(i, j):
                    repeat_cols.add(k)
                i = j
                found = True
                break
        if not found:
            i += 1

    # classify each window
    labels = []
    for idx, x in enumerate(xs):
        p = pair[idx]
        m = mosaic[idx]
        if 0 <= x < L and x in repeat_cols:
            labels.append("SIMPLE_REPEAT")
            continue
        if p is None or not np.isfinite(p):
            labels.append("DIVERGENT")
            continue
        elevated = p > bg + BG_MARGIN
        is_mosaic = m is not None and m > MOSAIC_STD
        if elevated and is_mosaic:
            labels.append("MOSAIC")
        elif elevated:
            labels.append("CONSERVATIVE")
        else:
            labels.append("DIVERGENT")

    # promote isolated DIVERGENT runs adjacent to elevated blocks, that show
    # a declining (not flat) pair_id trend, to DECAY_SLOPE
    final = list(labels)
    i = 0
    while i < len(final):
        if final[i] == "DIVERGENT":
            j = i
            while j < len(final) and final[j] == "DIVERGENT":
                j += 1
            # check trend within [i,j): compare smoothed pair_id at start vs end
            seg = [pair[k] for k in range(i, j) if pair[k] is not None and np.isfinite(pair[k])]
            touches_elevated = (i > 0 and final[i - 1] in ("CONSERVATIVE", "MOSAIC")) or \
                                (j < len(final) and final[j] in ("CONSERVATIVE", "MOSAIC"))
            if len(seg) >= DECAY_MIN_RUN and touches_elevated:
                # monotonic-ish decline test: first half mean > second half mean by a margin
                half = len(seg) // 2
                if half >= 1 and (np.mean(seg[:half]) - np.mean(seg[half:])) > 0.03:
                    for k in range(i, j):
                        final[k] = "DECAY_SLOPE"
            i = j
        else:
            i += 1

    # collapse into contiguous blocks
    blocks = []
    start = 0
    for k in range(1, len(final) + 1):
        if k == len(final) or final[k] != final[start]:
            blocks.append({"type": final[start], "x_start": xs[start], "x_end": xs[k - 1], "n_pos": k - start})
            start = k
    return blocks, bg, L


ZONE_BRIDGE = 2            # bridge over this many non-elevated positions inside a zone
ZONE_SPLIT_MAX_MAIN = 0.90  # if the largest row-group covers >= this frac, treat zone as uniform
MIN_ZONE_W = 15           # zones narrower than this pass through as 1D (too little data to split)
MIN_BLOCK_W = 15          # squint: full-height blocks narrower than this get absorbed into a neighbour


def _stitched_arrays(path, flank):
    names, A = read_aln(path)
    ci = consensus_index(names)
    cons = A[ci]
    C = np.delete(A, ci, axis=0)
    n_rows = C.shape[0]
    nzc = np.where(cons != GAP)[0]
    lo, hi = int(nzc[0]), int(nzc[-1])
    L = len(nzc)
    seqs_full = []
    for i in range(n_rows):
        l = C[i, :lo]; l = l[l != GAP][::-1]
        r = C[i, hi + 1:]; r = r[r != GAP]
        left_part = l[:flank][::-1]
        left_part = np.pad(left_part, (flank - len(left_part), 0), constant_values=GAP) if len(left_part) < flank else left_part[-flank:]
        elem_part = np.array([C[i, c] for c in nzc], dtype=np.int8)
        right_part = r[:flank]
        right_part = np.pad(right_part, (0, flank - len(right_part)), constant_values=GAP) if len(right_part) < flank else right_part[:flank]
        seqs_full.append(np.concatenate([left_part, elem_part, right_part]))
    n_x = len(seqs_full[0])
    maj_full = np.full(n_x, GAP, dtype=np.int8)
    for j in range(n_x):
        col = np.array([s[j] for s in seqs_full], dtype=np.int8)
        b = col[col != GAP]
        if len(b) >= 8:
            maj_full[j] = int(np.bincount(b, minlength=4)[:4].argmax())
    xs = list(range(-flank, 0)) + list(range(L)) + list(range(L, L + flank))
    return seqs_full, maj_full, xs, L, n_rows


def _group_mean_pair_id(seqs_full, lo_i, hi_i, rows):
    """Mean per-column plurality-agreement inside this row-group over the span."""
    tot, hits = 0, 0
    for j in range(lo_i, hi_i):
        col = [seqs_full[r][j] for r in rows if j < len(seqs_full[r]) and seqs_full[r][j] != GAP]
        if len(col) < 3:
            continue
        maj = np.bincount(np.array(col), minlength=4)[:4].argmax()
        hits += sum(1 for c in col if c == maj)
        tot += len(col)
    return hits / tot if tot else 0.0


def classify_blocks_2d(path, flank=200):
    """2D rectangle-mask version. Adjacent elevated (CONSERVATIVE/MOSAIC)
    1D windows are first merged into one contiguous zone; each zone gets a
    SINGLE row-partition (gap-clustered match-rate) over its full width, so
    group membership is stable across the zone rather than flickering
    window-to-window. A zone that resolves to <2 real groups, or whose
    largest group covers >=ZONE_SPLIT_MAX_MAIN of rows, passes through as
    its original full-height 1D sub-blocks. A zone that genuinely splits is
    replaced by one rectangle per row-group (spanning the whole zone),
    plus a DIVERGENT residual rectangle for rows in no group."""
    blocks_1d, bg, L = classify_blocks(path, flank)
    seqs_full, maj_full, xs, L2, n_rows = _stitched_arrays(path, flank)
    x_to_idx = {x: i for i, x in enumerate(xs)}

    # per-position 1D label
    pos_label = [None] * len(xs)
    for b in blocks_1d:
        for x in range(b["x_start"], b["x_end"] + 1):
            if x in x_to_idx:
                pos_label[x_to_idx[x]] = b["type"]

    elevated = [lab in ("CONSERVATIVE", "MOSAIC") for lab in pos_label]

    # three regimes, zoned INDEPENDENTLY -- never bridge flank<->core:
    #   left flank  [0, flank)   core  [flank, flank+L2)   right flank  [flank+L2, N)
    region_bounds = [(0, flank), (flank, flank + L2), (flank + L2, len(xs))]

    def zones_in(a, b):
        out = []
        i = a
        while i < b:
            if not elevated[i]:
                i += 1
                continue
            j = i
            gap = 0
            k = i
            while k < b:
                if elevated[k]:
                    j = k
                    gap = 0
                else:
                    gap += 1
                    if gap > ZONE_BRIDGE:
                        break
                k += 1
            out.append((i, j + 1))
            i = k
        return out

    zones = []
    for (a, b) in region_bounds:
        for (zlo, zhi) in zones_in(a, b):
            if zhi - zlo >= MIN_ZONE_W:   # squint: ignore sub-15bp flicker
                zones.append((zlo, zhi))

    zone_ranges = set()
    blocks_2d = []
    for (zlo, zhi) in zones:
        groups = row_partition_for_window(seqs_full, maj_full, zlo, zhi)
        real = [g for g in groups if len(g) >= ROW_MIN_GROUP]
        real.sort(key=len, reverse=True)
        x_start, x_end = xs[zlo], xs[zhi - 1]
        if len(real) < 2 or len(real[0]) >= ZONE_SPLIT_MAX_MAIN * n_rows:
            continue  # leave this zone's 1D sub-blocks in place (added below)
        zone_ranges.add((x_start, x_end))
        covered = set()
        for rank, g in enumerate(real):
            covered.update(g)
            if rank == 0:
                mid = _group_mean_pair_id(seqs_full, zlo, zhi, g)
                typ = "CONSERVATIVE" if mid > bg + 2 * BG_MARGIN else "MOSAIC"
            else:
                typ = "MOSAIC"
            blocks_2d.append({
                "type": typ, "x_start": x_start, "x_end": x_end, "n_pos": zhi - zlo,
                "rows": sorted(g), "n_rows": len(g), "row_group_rank": rank,
            })
        residual = [r for r in range(n_rows) if r not in covered]
        if residual:
            blocks_2d.append({
                "type": "DIVERGENT", "x_start": x_start, "x_end": x_end,
                "n_pos": zhi - zlo, "rows": sorted(residual), "n_rows": len(residual),
                "row_group_rank": "residual",
            })

    # pass through every 1D block NOT inside a zone we split
    def in_split_zone(b):
        for (zs, ze) in zone_ranges:
            if b["x_start"] >= zs and b["x_end"] <= ze:
                return True
        return False

    def clip_out_zones(b):
        """Return list of pass-through fragments of b with split-zone spans removed."""
        segs = [(b["x_start"], b["x_end"])]
        for (zs, ze) in zone_ranges:
            new = []
            for (s, e) in segs:
                if e < zs or s > ze:
                    new.append((s, e)); continue
                if s < zs:
                    new.append((s, zs - 1))
                if e > ze:
                    new.append((ze + 1, e))
            segs = new
        return segs

    for b in blocks_1d:
        for (s, e) in clip_out_zones(b):
            if e >= s:
                blocks_2d.append(dict(b, x_start=s, x_end=e, n_pos=e - s + 1,
                                      rows="all", n_rows=n_rows))

    blocks_2d.sort(key=lambda b: (b["x_start"], b.get("row_group_rank", -1) if isinstance(b.get("row_group_rank", -1), int) else 99))

    # squint pass: absorb full-height blocks narrower than MIN_BLOCK_W into
    # whichever full-height neighbour is wider (row-split rectangles are never
    # absorbed). Iterate until stable.
    def absorb(bl):
        changed = True
        while changed and len(bl) > 1:
            changed = False
            fh = [k for k, b in enumerate(bl) if b.get("rows") in (None, "all")]
            for pos, k in enumerate(fh):
                b = bl[k]
                if b["x_end"] - b["x_start"] + 1 >= MIN_BLOCK_W:
                    continue
                left = bl[fh[pos - 1]] if pos > 0 else None
                right = bl[fh[pos + 1]] if pos + 1 < len(fh) else None
                # only merge with a contiguous full-height neighbour
                cand = []
                if left and left["x_end"] + 1 >= b["x_start"] - 3:
                    cand.append(left)
                if right and right["x_start"] - 1 <= b["x_end"] + 3:
                    cand.append(right)
                if not cand:
                    continue
                host = max(cand, key=lambda z: z["x_end"] - z["x_start"])
                host["x_start"] = min(host["x_start"], b["x_start"])
                host["x_end"] = max(host["x_end"], b["x_end"])
                host["n_pos"] = host["x_end"] - host["x_start"] + 1
                bl.pop(k)
                changed = True
                break
        return bl

    blocks_2d = absorb(blocks_2d)
    blocks_2d.sort(key=lambda b: (b["x_start"], b.get("row_group_rank", -1) if isinstance(b.get("row_group_rank", -1), int) else 99))
    return blocks_2d, bg, L, n_rows


def print_report(path):
    blocks, bg, L = classify_blocks(path)
    print("background=%.3f elem_len=%d" % (bg, L))
    for b in blocks:
        if b["n_pos"] < 3:
            continue  # skip 1-2 position noise blocks in the printout
        print("  [%5d, %5d]  n=%-4d  %s" % (b["x_start"], b["x_end"], b["n_pos"], b["type"]))


if __name__ == "__main__":
    import sys
    print_report(sys.argv[1])
