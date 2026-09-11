#!/usr/bin/env python3
"""Raw (UNALIGNED) small test sequence sets, one per block-mask feature to
exercise. Each gets run through REAL MAFFT (the same mafft-wasm ViewAlign
itself uses, via realignAll()) rather than hand-glued gaps -- so ends and
homology come out exactly as a genuine realignment would show them, per
the direct observation that the old fixture's hand-spliced flanks looked
ragged where real MAFFT finds real homology.
"""
import random, os

random.seed(2026)
BASES = "ACGT"
OUT = os.path.join(os.path.dirname(__file__), "test_sets_raw")
os.makedirs(OUT, exist_ok=True)


def rnd(n):
    return "".join(random.choice(BASES) for _ in range(n))


def mutate(seq, frac, indel_rate=0.0):
    """Substitutions at `frac`, plus small indels at `indel_rate` per
    position (half insertion, half deletion, 1-3bp) -- real genomic
    diversity, not just noise, so a real aligner has actual work to do."""
    s = list(seq)
    i = 0
    while i < len(s):
        if random.random() < indel_rate:
            if random.random() < 0.5:
                del s[i:i + random.randint(1, 3)]
                continue
            else:
                s[i:i] = [random.choice(BASES) for _ in range(random.randint(1, 3))]
                i += 3
                continue
        if random.random() < frac:
            s[i] = random.choice(BASES)
        i += 1
    return "".join(s)


def trim_outer(seq, side, max_trim_frac=0.35):
    """Randomly clip 0..max_trim_frac off the OUTER end only (side='left'
    trims from the start, side='right' trims from the end) -- simulates
    real copies with different amounts of flanking sequence actually
    captured, without disturbing the end that abuts the core."""
    n = len(seq)
    cut = random.randint(0, int(n * max_trim_frac))
    if side == "left":
        return seq[cut:]
    return seq[:n - cut] if cut else seq


def write_fa(name, rows):
    path = os.path.join(OUT, name + ".raw.fa")
    with open(path, "w") as fh:
        for n, s in rows:
            fh.write(">%s\n%s\n" % (n, s))
    print(name, len(rows), "seqs")
    return path


# 1) clean_core: one conserved core, independent (non-homologous) random
#    flanks each side -- the simple baseline: CONSERVATIVE core + DIVERGENT
#    flanks, clean short ends (no hidden homology to find).
def make_clean_core():
    n = 16
    core = rnd(90)
    rows = []
    for i in range(n):
        lf = rnd(random.randint(15, 30))
        el = mutate(core, 0.04, indel_rate=0.01)
        rf = rnd(random.randint(15, 30))
        rows.append(("seq%02d" % i, lf + el + rf))
    return write_fa("clean_core", rows)


# 2) mosaic_subset: core + a RIGHT-side tail shared by only 5 of 20 copies
#    (a distinct, conserved-among-themselves sequence), the other 15 get
#    independent random tails. Exercises MOSAIC (subset) detection.
def make_mosaic_subset():
    n = 20
    core = rnd(100)
    tail_shared = rnd(70)
    rows = []
    for i in range(n):
        lf = rnd(random.randint(12, 25))
        el = mutate(core, 0.04, indel_rate=0.01)
        rt = mutate(tail_shared, 0.03, indel_rate=0.01) if i < 5 else rnd(random.randint(40, 70))
        rows.append(("seq%02d" % i, lf + el + rt))
    return write_fa("mosaic_subset", rows)


# 3) decay_slope: core + a right flank that is a real shared ancestral
#    sequence but each copy's mutation load increases roughly with index
#    (graded erosion, no clean boundary) -- LINE-like decay, not MOSAIC.
def make_decay_slope():
    n = 18
    core = rnd(100)
    flank_root = rnd(90)
    rows = []
    for i in range(n):
        lf = rnd(random.randint(12, 25))
        el = mutate(core, 0.04, indel_rate=0.01)
        frac = 0.03 + 0.55 * (i / (n - 1))
        rf = mutate(flank_root, frac, indel_rate=0.01 + 0.02 * (i / (n - 1)))
        rows.append(("seq%02d" % i, lf + el + rf))
    return write_fa("decay_slope", rows)


# 4) simple_repeat: core contains an embedded tandem repeat run.
def make_simple_repeat():
    n = 16
    pre = rnd(45)
    unit = "CATG"
    repeat = unit * 9  # 36bp tandem run
    post = rnd(45)
    core = pre + repeat + post
    rows = []
    for i in range(n):
        lf = rnd(random.randint(12, 22))
        el = mutate(core, 0.03, indel_rate=0.005)
        rf = rnd(random.randint(12, 22))
        rows.append(("seq%02d" % i, lf + el + rf))
    return write_fa("simple_repeat", rows)


# 5) real_homologous_ends: directly answers "flanks look ragged but real
#    homology exists" -- BOTH flanks are real shared ancestral sequence
#    (moderate, uniform mutation, not independent random), long enough
#    (150bp) that a naive short-flank extraction would have clipped real
#    signal. A real MAFFT pass should align them cleanly end to end.
def make_real_homologous_ends():
    """The direct answer to 'flanks look ragged but MAFFT finds real
    homology there': both flanks ARE real shared ancestral sequence, but
    each copy independently (a) picked up indels/substitutions and (b) was
    captured with a different, randomly-trimmed amount of flanking
    sequence -- exactly what real genomic copies look like. Naive
    concatenation (no realignment) looks ragged at the ends purely from
    the length variation; a real MAFFT pass should recover clean aligned
    columns out to wherever the shortest copies still reach."""
    n = 16
    left_root = rnd(160)
    core = rnd(110)
    right_root = rnd(160)
    rows = []
    for i in range(n):
        lf = trim_outer(mutate(left_root, 0.10, indel_rate=0.015), "left")
        el = mutate(core, 0.04, indel_rate=0.01)
        rf = trim_outer(mutate(right_root, 0.10, indel_rate=0.015), "right")
        rows.append(("seq%02d" % i, lf + el + rf))
    return write_fa("real_homologous_ends", rows)


# 6) kitchen_sink: composite of several zones in one alignment, for an
#    integration look at the diagram + block mask together.
def make_kitchen_sink():
    n = 24
    left_root = rnd(80)
    core = rnd(120)
    unit = "AGAT"
    repeat = unit * 8
    tail_shared = rnd(60)
    right_root = rnd(80)
    rows = []
    for i in range(n):
        lf = trim_outer(mutate(left_root, 0.08, indel_rate=0.01), "left")
        el = mutate(core + repeat, 0.04, indel_rate=0.008)
        if i < 6:
            rt = mutate(tail_shared, 0.03, indel_rate=0.01)
        else:
            frac = 0.05 + 0.5 * ((i - 6) / (n - 7))
            rt = mutate(right_root, frac, indel_rate=0.01)
        rows.append(("seq%02d" % i, lf + el + rt))
    return write_fa("kitchen_sink", rows)


if __name__ == "__main__":
    make_clean_core()
    make_mosaic_subset()
    make_decay_slope()
    make_simple_repeat()
    make_real_homologous_ends()
    make_kitchen_sink()
