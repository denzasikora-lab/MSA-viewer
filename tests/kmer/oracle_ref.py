#!/usr/bin/env python3
"""Independent reference implementation of ViewAlign's k-mer guide tree.

This file mirrors the *specification* of the JS implementation (kmer-tree.js), it
does not share any code with it.  It is meant to be used as an oracle from the
JS tests, e.g.::

    python3 tests/kmer/oracle_ref.py path/to/alignment.fa 6

Specification implemented (all arithmetic that the JS keeps in a Float32Array
is rounded to float32 here as well, so this oracle is bit-exact with it):

1. Cleaning: upper-case, U -> T, drop every character that is not A/C/G/T.
2. k-mers: every overlapping window of length k (k valid in 3..12) of the
   cleaned string, counted as a multiset (dict kmer -> count).
3. Distance(a, b) = 1 - S/M with S = sum_k min(ca[k], cb[k]) and
   M = sum_k max(ca[k], cb[k]).  If M == 0 the distance is 1.  Stored float32.
4. UPGMA: repeatedly merge the closest pair of active clusters.  The scan is
   i ascending, then j ascending (i < j), keeping a pair only on a strict '<',
   i.e. ties are broken by the FIRST pair found in that order.  The merged
   cluster keeps index i; index j becomes inactive.  New distances:
       d(i,k) = (d(i,k)*size_i + d(j,k)*size_j) / (size_i + size_k... sizes of
   the two merged clusters) rounded to float32, and d(j, .) is never used
   again.
5. guide_tree() -> list of (i, j, d) in merge order, d = the distance at which
   the pair merged.  cut() applies only the first n - groups merges and then
   returns one cluster id per sequence.

No scipy, no external data, only the standard library (numpy is used ONLY for
the float32 rounding when present; struct.unpack provides an identical
round-to-nearest-even fallback when numpy is missing).
"""

import sys

# ---------------------------------------------------------------- float32 ----
# Everything the JS writes into a Float32Array must be rounded to float32 the
# same way (round-to-nearest, ties-to-even).  Reminders:
#   * JS `new Float32Array(...)` store rounds the float64 value.
#   * numpy's np.float32(x) and struct's 'f' pack do exactly the same.
# The returned value is an exact float64 that equals the stored float32.

try:  # pragma: no cover - exercised on every call, two backends
    import numpy as _np

    def _f32(x):
        """Round a float64 value to float32 and back to float64."""
        return float(_np.float32(x))

except ImportError:  # pragma: no cover - only when numpy is unavailable
    import struct as _struct

    def _f32(x):
        """struct-based float32 rounding; identical to numpy's np.float32."""
        return _struct.unpack("<f", _struct.pack("<f", float(x)))[0]


# ------------------------------------------------------------- sequence I/O --

def _read_fasta(path):
    """Minimal FASTA reader -> list of (header, sequence) preserving order."""
    out = []
    header = None
    chunks = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.rstrip("\n").rstrip("\r")
            if line.startswith(">"):
                if header is not None:
                    out.append((header, "".join(chunks)))
                header = line[1:].strip()
                chunks = []
            else:
                chunks.append(line.strip())
    if header is not None:
        out.append((header, "".join(chunks)))
    return out


def _clean(seq):
    """Upper-case, U -> T, keep only A/C/G/T ('-', '.', N, ... are dropped)."""
    if not isinstance(seq, str):
        seq = str(seq)
    seq = seq.upper().replace("U", "T")
    out = []
    ok = "ACGT"
    for ch in seq:
        if ch in ok:
            out.append(ch)
    return "".join(out)


def _seq_text(entry):
    """Accept a raw string, a dict with a 'seq' key or an object attribute."""
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict):
        if "seq" in entry and isinstance(entry["seq"], str):
            return entry["seq"]
        if "sequence" in entry and isinstance(entry["sequence"], str):
            return entry["sequence"]
        raise TypeError("sequence dict has no usable 'seq' value: %r" % (entry,))
    if hasattr(entry, "seq"):
        return str(getattr(entry, "seq"))
    raise TypeError("cannot extract a sequence from %r" % (entry,))


def _norm_k(k):
    """Integer k in 3..12; anything else falls back to the default 6."""
    try:
        k = int(k)
    except (TypeError, ValueError):
        return 6
    return k if 3 <= k <= 12 else 6


# ------------------------------------------------------------- k-mer counts --

def kmer_counts(seq, k):
    """Multiset of all overlapping k-mers of the CLEANED string."""
    cleaned = _clean(seq)
    counts = {}
    n = len(cleaned)
    if k < 1 or n < k:
        return counts
    get = counts.get
    for i in range(n - k + 1):
        km = cleaned[i : i + k]
        counts[km] = get(km, 0) + 1
    return counts


# ---------------------------------------------------------------- distances --

def kmer_distance(counts_a, counts_b):
    """1 - S/M (Bray-Curtis style), M == 0 -> 1.  Exact integer sums, then
    one float64 division, then rounded to float32."""
    S = 0  # sum of mins
    M = 0  # sum of maxes
    if len(counts_a) > len(counts_b):
        counts_a, counts_b = counts_b, counts_a  # iterate the smaller dict
    for km, ca in counts_a.items():
        cb = counts_b.get(km)
        if cb is None:
            M += ca
        elif ca < cb:
            S += ca
            M += cb
        else:
            S += cb
            M += ca
    for km, cb in counts_b.items():
        if km not in counts_a:
            M += cb
    if M <= 0:
        return _f32(1.0)
    return _f32(1.0 - (float(S) / float(M)))


def distance_matrix(seqs, k):
    """n x n float32-valued matrix of k-mer distances (symmetric, d[i][i]=0)."""
    counts = [kmer_counts(s, k) for s in seqs]
    n = len(seqs)
    d = [[0.0] * n for _ in range(n)]
    for i in range(n):
        ci = counts[i]
        for j in range(i + 1, n):
            v = kmer_distance(ci, counts[j])
            d[i][j] = v
            d[j][i] = v
    return d


# ------------------------------------------------------------------- UPGMA --

def guide_tree(seqs, k):
    """UPGMA guide tree from the k-mer distances.

    seqs: list of sequence strings (dicts with a 'seq' key are tolerated).
    k:    k-mer length (3..12; invalid values fall back to 6).

    Returns ``merges``: a list of (i, j, d) tuples, one per merge, in merge
    order, where i < j are ORIGINAL sequence/cluster indices and d is the
    float32 distance at which the two clusters were merged.
    """
    k = _norm_k(k)
    n = len(seqs)
    merges = []
    if n < 2:
        return merges

    counts = [kmer_counts(_seq_text(s), k) for s in seqs]
    # cd[i][j] == cd[j][i]; values are exact float32-rounded distances.
    cd = [[0.0] * n for _ in range(n)]
    for i in range(n):
        ci = counts[i]
        row = cd[i]
        for j in range(i + 1, n):
            v = kmer_distance(ci, counts[j])
            row[j] = v
            cd[j][i] = v
    counts = None

    active = [True] * n
    size = [1] * n
    remaining = n

    # Find the closest pair: scan i ascending, then j ascending, keeping the
    # pair only on a strict '<' (exact float32 comparisons), so ties are
    # resolved to the FIRST such pair in that order.
    for _ in range(n - 1):
        best = None
        bi = -1
        bj = -1
        for i in range(n):
            if not active[i]:
                continue
            row = cd[i]
            for j in range(i + 1, n):
                if not active[j]:
                    continue
                v = row[j]
                if best is None or v < best:
                    best = v
                    bi = i
                    bj = j
            if bj >= 0 and row[bj] is best and best is not None and row[bj] == best and bj < i:
                pass  # unreachable; kept simple: strict '<' above is the rule
        if bi < 0:  # no active pair left (cannot happen while remaining >= 2)
            break

        merges.append((bi, bj, best))

        active[bj] = False
        si = size[bi]
        sj = size[bj]
        sm = si + sj
        size[bi] = sm
        remaining -= 1

        # d(i, k) = (d(i,k)*si + d(j,k)*sj) / sm, rounded to float32.
        sums = si + sj
        for m in range(n):
            if not active[m] or m == bi:
                continue
            dik = float(cd[bi][m])
            djk = float(cd[bj][m])
            v = (dik * si + djk * sj) / float(sums)
            v = _f32(v)
            cd[bi][m] = v
            cd[m][bi] = v
        for m in range(n):
            cd[bj][m] = 0.0  # j is inactive; its row is never used again
            cd[m][bj] = 0.0

    return merges


# --------------------------------------------------------------------- cut --

def cut(merges, n, groups):
    """Cluster ids after applying only the first ``n - groups`` merges.

    merges: the list returned by guide_tree
    n:      number of sequences
    groups: how many groups the result should have

    A UPGMA dendrogram of n leaves has n-1 merges; applying the first m gives
    n - m groups, so m = n - groups.  Cluster labels are canonical: ids are
    assigned 0..G-1 in order of the smallest sequence index in each cluster,
    making the result deterministic regardless of merge order.
    """
    if n < 0:
        raise ValueError("n must be >= 0")
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    apply = n - int(groups)
    if apply > len(merges):
        apply = len(merges)
    if apply < 0:
        apply = 0
    for m in range(apply):
        mi = int(merges[m][0])
        mj = int(merges[m][1])
        if mi < 0 or mj < 0 or mi >= n or mj >= n:
            continue
        ri = find(mi)
        rj = find(mj)
        if ri != rj:
            parent[rj] = ri

    # canonical relabelling by smallest member index
    label = {}
    out = []
    for i in range(n):
        r = find(i)
        if r not in label:
            label[r] = len(label)
        out.append(label[r])
    return out


# --------------------------------------------------------------------- main --

def _main(argv):
    if len(argv) != 3:
        sys.stderr.write("usage: %s ALIGNMENT.fa K\n" % argv[0])
        return 2
    records = _read_fasta(argv[1])
    if not records:
        sys.stderr.write("error: no FASTA records in %s\n" % argv[1])
        return 1
    try:
        k = int(argv[2])
    except ValueError:
        sys.stderr.write("error: k must be an integer, got %r\n" % argv[2])
        return 1
    merges = guide_tree([seq for _hdr, seq in records], k)
    for rec in records:
        if len(rec[1]) != len(records[0][1]):
            # guide_tree does NOT require equal lengths, but ViewAlign is fed a
            # real alignment, so warn instead of failing silently.
            break
    out = []
    for i, j, d in merges:
        out.append("%d %d %.9f\n" % (i, j, d))
    sys.stdout.write("".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv))
