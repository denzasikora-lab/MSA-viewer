#!/usr/bin/env python3
"""Build the two synthetic block-mask fixtures with real, fixed-width,
column-aligned flanks (so emit_fixture's linear x->col mapping holds).

  synth_unbalanced : conserved element; right flank: most rows share the
                      consensus flank, a small subset (6/30) share a
                      distinct sequence -> expect a CONSERVATIVE(main) +
                      MOSAIC(subset) 2-rectangle split on the right flank.
  synth_gradient   : conserved element; right flank is the consensus flank
                      with a per-row increasing fraction of random mutations
                      -> continuous decay, expect NO clean split (one group).

Left flank in both is fully random per row (true background), so bg is
well below the element and the elevated calls are unambiguous.

NOTE (known limitation): a *balanced* two-type split (15/15) is NOT modelled
here -- row_partition keys on match-rate to the column majority, which does
not separate two co-equal types cleanly. Revisit if that case matters.
"""
import random, os

random.seed(1234)
BASES = "ACGT"
OUT = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "blockmask")


def rnd(n):
    return "".join(random.choice(BASES) for _ in range(n))


def mutate(seq, frac):
    s = list(seq)
    for i in range(len(s)):
        if random.random() < frac:
            s[i] = random.choice(BASES)
    return "".join(s)


def write_fa(path, rows):
    with open(path, "w") as fh:
        for name, seq in rows:
            fh.write(">%s\n%s\n" % (name, seq))
        # ensure equal width
    w = {len(s) for _, s in rows}
    assert len(w) == 1, ("ragged widths", w)


def build_unbalanced():
    n = 30
    LF, EL, RF = 150, 120, 100
    elem = rnd(EL)
    right_main = rnd(RF)
    right_alt = rnd(RF)
    rows = [("consensus", ("-" * LF) + elem + ("-" * RF))]
    for i in range(n):
        lf = rnd(LF)                                   # left flank: fully random per row
        el = mutate(elem, 0.03)                        # element: conserved
        rf = mutate(right_alt if i >= 24 else right_main, 0.03)  # 24 main / 6 alt
        rows.append(("seq%02d" % i, lf + el + rf))
    write_fa(os.path.join(OUT, "synth_unbalanced.aln.fa"), rows)
    print("synth_unbalanced.aln.fa", n + 1, "rows")


def build_gradient():
    n = 30
    LF, EL, RF = 150, 120, 80
    elem = rnd(EL)
    right_cons = rnd(RF)
    rows = [("consensus", ("-" * LF) + elem + ("-" * RF))]
    for i in range(n):
        lf = rnd(LF)                                   # left flank: fully random per row
        el = mutate(elem, 0.03)
        frac = 0.02 + 0.6 * (i / (n - 1))             # 0.02 -> 0.62 continuous
        rf = mutate(right_cons, frac)
        rows.append(("seq%02d" % i, lf + el + rf))
    write_fa(os.path.join(OUT, "synth_gradient.aln.fa"), rows)
    print("synth_gradient.aln.fa", n + 1, "rows")


if __name__ == "__main__":
    build_unbalanced()
    build_gradient()
