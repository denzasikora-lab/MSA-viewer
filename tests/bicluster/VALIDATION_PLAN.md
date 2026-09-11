# Staged validation plan for block-bicluster.js

**Written before results exist — this is the plan, not the findings.**
Findings get appended to this file (a `## Results` section per stage) as
each stage actually runs, never overwriting an earlier stage's numbers.
Uses directly-constructed aligned matrices (not real MAFFT output) for
every stage below, deliberately: the point of this suite is validating the
biclustering *logic* against a KNOWN ground truth, the same way Cheng &
Church and later biclustering papers validate — implant a known bicluster
in a controlled synthetic matrix with tunable noise, then check recovery.
Testing against real MAFFT alignments (the `make_test_sets.py` fixtures)
is a separate, already-done concern (does realignment itself look right);
this suite assumes the matrix is already exactly as designed and asks only
"does the algorithm find what's really there."

## Stage 0 — pure 1D column separation (no row-splitting needed at all)

Every row is uniform, full-length, no length variation. One conserved
region + one divergent region, side by side. This isolates
`blockCoherence` + `bestColumnSplit` with zero interaction from row logic.

**Generator**: `toy0(nRows, coreLen, flankLen, coreMutRate, flankMutRate, seed)`
— all rows share a `core` (mutated at `coreMutRate`) and a `flank` (each
row's own *independent* random sequence — flankMutRate is unused, kept for
signature symmetry with later stages / ignored, since independent-random
IS "0% shared" by construction).

**Sweep**: `nRows` in {5, 10, 30}; `coreLen`/`flankLen` in {20, 60, 150};
`coreMutRate` in {0.0, 0.05, 0.15, 0.30, 0.50}. Record, for each
combination: does the algorithm produce exactly 2 full-row blocks (core,
flank) split at the true boundary ± 3 columns? At what `coreMutRate` does
detection first fail (core no longer distinguishable from flank), and does
that threshold move sensibly with `nRows` (more rows -> more statistical
power -> should tolerate higher mutation before failing)?

## Stage 1 — single row-subset "tail" block (the case from the mosaic_subset discussion)

One conserved core (all rows), then a region where only a SUBSET of rows
share a real sequence and the rest are independent random. This isolates
`bestRowSplit` given a zone `bestColumnSplit` has already correctly
carved out.

**Generator**: `toy1(nRows, coreLen, tailLen, subsetSize, subsetMutRate,
seed)` — core as in Stage 0 (fixed low mutation, e.g. 0.04, not swept
here); tail: `subsetSize` rows share a real tail sequence (mutated at
`subsetMutRate`), the remaining `nRows - subsetSize` rows get independent
random tails of the SAME length (no length variation in this stage — that
interaction is Stage 1b below).

**Sweep**: `nRows` in {10, 20, 50}; `subsetSize` in {2, 3, 5, 10, nRows/2};
`tailLen` in {20, 60, 150}; `subsetMutRate` in {0.0, 0.05, 0.15, 0.30}.
Record: is a row-split block found at all; is its row-set exactly the
planted subset (report false positives/negatives in membership, not just
"a split happened"); minimum `subsetSize` at which detection starts
working for each `tailLen`; whether `MIN_BLOCK_ROWS` (default 3) is
actually the right floor or whether real detection stops working before
reaching it (i.e. subsetSize=3 nominally clears the floor but may not be
statistically distinguishable from noise at low tailLen/high mutRate —
record where that is).

## Stage 1b — subset + independent length variation

Same as Stage 1, but each row's tail (both subset and background) gets
independently right-trimmed by a random 0-30% (mirrors `make_test_sets.py`'s
`trim_outer`, but applied here to a directly-constructed matrix by
introducing trailing gaps rather than re-running MAFFT — the trimming
itself is the point, not realignment). Tests whether the coverage-span
fix (terminal-gap exclusion) holds up under the exact condition that broke
the old zone-width approach.

**Sweep**: same as Stage 1, plus trim severity in {0% (=Stage 1 baseline,
should match those results), 15%, 30%}.

## Stage 2 — multiple blocks in one alignment

Two POSSIBLE configurations, both matter and are structurally different:

- **2a. Sequential (non-overlapping-in-rows) blocks**: core, then a right
  flank with 2 SEPARATE row-subsets sharing 2 DIFFERENT sequences (e.g.
  5 rows share tail-type-A, 5 different rows share tail-type-B, remaining
  rows independent random) — 3 groups in one zone, not 2. Tests whether
  `bestRowSplit`'s clustering finds >2 groups when >2 real groups exist,
  not just a binary split.
- **2b. Two independent zones**: core, then EARLY-tail region where subset
  X (rows 0-4) share a sequence, THEN a separate LATE-tail region (further
  right) where a DIFFERENT subset Y (rows 10-14, no overlap with X) shares
  a different sequence, with ordinary divergent background between and
  around both. Tests whether two unrelated row-subset blocks at different
  column ranges are both found independently without interfering with
  each other, and whether the divergent gap between them stays undivided
  full-row DIVERGENT.

**Sweep**: reuse the Stage 1 parameter ranges but only at 2-3
representative points each (this stage is about structural correctness,
not threshold-finding — Stages 0/1/1b already characterize the
thresholds).

## Output format for every stage

One CSV-like results table per stage appended under `## Results — Stage N`
in this file: one row per parameter combination, columns = every swept
parameter + `detected` (bool) + `row_set_correct` (bool or "n/a" for
Stage 0) + `col_boundary_error` (integer, columns off from true boundary)
+ one-sentence note for any surprising result. End each stage with a
`### Conclusion` paragraph: the practical threshold/limitation found, in
plain language, that should inform the real algorithm's default
parameters or documented limitations — this is the part that actually
matters, the raw table is just the evidence for it.

## Execution notes for whoever runs this (glm, most likely)

- Build the four `toyN(...)` generators as plain functions returning
  `{names, seqs}` (array of aligned strings, already padded to equal
  length — no MAFFT step, construct the gaps directly per the trim
  description above), then a FASTA-text assembler, then feed straight into
  `BlockBicluster.computeBiclusterMask`.
- This is a big sweep (hundreds of parameter combinations across 4
  stages) — write it as one script per stage that loops the sweep, checks
  recovery programmatically (compare returned blocks' row-sets/column
  boundaries against the known planted ground truth, not by eyeballing
  output), and appends the results table directly into this file. Do not
  hand-run individual cases one at a time.
- Do this ONLY after `tests/bicluster/oracle.js` passes (i.e. after
  `block-bicluster.js`'s six stubbed functions are implemented and the
  basic oracle is green) — there is no point sweeping parameters against
  code that still throws.

---

# Results (run 2026-09-12, after the mergeAdjacentLeaves fix)

**Context**: the first sweep run (numbers below superseded, not reproduced
here) caught a THIRD real bug beyond the two fixed in commit `32912ac`:
`mergeAdjacentLeaves` used a coherence-tolerance test (`mergedCoherence >=
min(partA, partB) - MERGE_TOLERANCE`) that is almost always satisfied when
merging a high-coherence and a low-coherence block, so it was silently
re-merging genuine splits back together immediately after `splitAndMerge`
correctly found them. Confirmed directly on a Stage 0 case: `splitAndMerge`
produced the correct 2 leaves (coherence 0.97 and 0.42), then
`mergeAdjacentLeaves` merged them straight back into 1 (0.70). Fixed by
reusing the exact same variance-reduction test used to ACCEPT a split, to
decide whether to UNDO one: only merge if splitting right back at that
boundary would score below `MIN_VARIANCE_REDUCTION` anyway.

## Stage 0 (pure column separation): 43/45 detected (was 0/45)

The `mergeAdjacentLeaves` fix alone took this from complete failure to
near-complete success. Full sweep table omitted here (see git history /
rerun `run_validation.js` for the live table) - both remaining misses were
at the extreme `mut=0.50` (50% mutation - the core is barely more
conserved than random background at that point, a reasonable place for
detection to fail).

## Stage 1 (single row-subset tail): 41/108 exact

Real recovery-rate characterization, not a bug: exact recovery correlates
with subset size and tail length as expected (bigger real subset = easier
to detect; longer tail = more columns of evidence per row). This is
legitimate threshold-tuning data for a future pass, not something to patch
reactively - see `bestRowSplit`'s current fixed thresholds
(`ROW_MIN_GAP_ABS=0.12`, min-sample-size=5, majority-group-floor=40%) as
the current operating point this rate reflects.

## Stage 2a (3 groups, one zone): mixed — group sizes matter, not a bug

`sizeA=3,sizeB=8` (asymmetric): both groups recovered exactly.
`sizeA=5,sizeB=5` and `sizeA=8,sizeB=8` (symmetric, no majority): both
missed. This is the SAME "no majority group" guard added in commit
`32912ac` doing exactly its job - a genuinely balanced multi-way split
(no group holds >=40% of rows) is currently rejected by design, matching
the earlier finding that a balanced split is hard to distinguish from
noise with a match-rate-to-majority approach. Documented as a known
limitation (also noted in `BICLUSTER_ALGORITHM_NOTES.md`'s open questions)
rather than patched - fixing it properly needs a different clustering
primitive for the no-majority case, not a threshold tweak.

## Stage 2b (two independent zones): both zones missed at the top level — real structural finding

Root cause isolated precisely, not just observed: `bestRowSplit` is
CORRECT — tested directly on the narrow early-zone [80,129] and late-zone
[190,239] ranges in isolation, it recovers the exact planted groups
(`[0,1,2,3,4]` and `[10,11,12,13,14]`) with real gain. The failure is that
`bestColumnSplit` never manages to carve those narrow zones out of the
wider combined [80,239] range first: early+mid+late all look similarly
"background" by pure column-purity (the row-structure that distinguishes
them is invisible to a column-only test that doesn't already know which
rows to group). This is a genuine limitation of single-step greedy
row-or-column splitting, not a threshold bug: real biclustering algorithms
(Cheng-Church) use iterative exploratory node-deletion specifically to
avoid getting stuck exactly here, rather than requiring a single up-front
split to already look good on one axis alone. Fixing this properly is a
real next-design-iteration item (e.g. trying several candidate column
sub-ranges via a coarser scan even when the full-zone split fails), not a
one-line patch - flagging for the next round rather than forcing a fix now.
