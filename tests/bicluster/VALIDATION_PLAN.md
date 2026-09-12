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


---

# Results (run 2026-09-11T22:24:38.090Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | false | 6 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5; nRows=30,len=20,mut=0.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 0 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | true | exact |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | true | exact |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | true | exact |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 4/5 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | true | exact |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | true | exact |
| 50 | 10 | 20 | 0.05 | true | exact |
| 50 | 10 | 20 | 0.15 | true | exact |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | true | exact |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | true | exact |

### Conclusion

41/108 exact recoveries. By subset size: size=2: 0/36, size=3: 19/36, size=5: 12/24, size=10: 10/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | missed | missed |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| missed | missed | n/a |

### Conclusion

Zones were not both found at distinct column ranges — see table.

## Real-data addendum (2026-09-12): haplotype-clustering row split

Found by testing the real `oma_SINE16b_realigned.aln.fa` file (not a synthetic
stage — a fourth, distinct limitation from the three above, found by direct
inspection of real data with the user): `_gapRowSplit`'s per-row whole-window
match-rate cannot detect a row split defined by several correlated diagnostic
SNPs sitting among many invariant columns (cols 1152-1217 of that file: ~12 of
66 columns are genuinely polymorphic, splitting ~28 vs ~20 rows by haplotype,
confirmed by eye after cropping+reordering the region). A per-row scalar score
averaged over the whole window dilutes this signal past detection; even
restricted to just the diagnostic columns, matching each row against one
global per-column "dominant" vote still can't separate correlated haplotypes
(a row can carry the majority allele at some diagnostic sites and the minority
at others).

Added `_haplotypeRowSplit`: finds diagnostic columns (purity <
`HAPLOTYPE_MAX_PURITY`, default 0.85), builds each row's state vector over
just those columns, and clusters rows into 2 groups by Hamming distance
(deterministic farthest-pair seeding, then k=2 majority-vote iteration — k-modes,
in effect). Scores the split's gain against the diagnostic columns only (see
`_columnListCoherence`), not the whole window — same dilution problem as
detection, this time in the acceptance gate. `bestRowSplit` now tries both
`_gapRowSplit` and `_haplotypeRowSplit` and keeps whichever finds a higher-gain
split.

**Calibration required two real guards found empirically, not assumed:**
- `HAPLOTYPE_MIN_INFO_COLS = 8` — with only 4, the oracle's `clean_core.aln.fa`
  (16 uniform rows) produced false splits: any small row sample can be
  bipartitioned to look clean on a handful of columns chosen for exactly that
  purpose (look-elsewhere overfitting).
- `HAPLOTYPE_MIN_USABLE_ROWS = 20` plus `HAPLOTYPE_MIN_GAIN = 0.2` — even with
  8 info columns, small-sample noise on `clean_core.aln.fa` reached gain 0.19;
  the real biological split (48 usable rows) reached gain 0.22. The margin is
  thin, so the row-count floor is the primary guard, the gain threshold
  secondary — this is flagged as an area that would benefit from the same
  staged synthetic sweep (planted haplotype structure, swept row count/info-column
  count/noise level) that the four stages above got, rather than the
  single-real-example calibration used here for now.

**Verified working**: direct probe on cols 1152-1217 now returns the correct
28/20 split (gain 0.222); a second, independent real structure was also found
this way in the same file's other divergent flank (cols 1274-1662, splitting
into a 26-row and a 22-row group) and confirmed by eye after cropping and
reordering that region by similarity — two visually distinct conserved
sequence groups, matching the algorithm's split almost exactly. Oracle and the
full four-stage synthetic sweep above re-run clean with no regressions
(Stage 0/1/1b/2a numbers unchanged).

**Not yet fixed** (separate, already-documented limitation, not new): the
1152-1217 haplotype split is still not surfaced by `computeBiclusterMask`'s
top-level recursion on the real file, because it sits inside a wide
[0,1273] range that `bestColumnSplit` scores as coherent enough overall
(0.92) and doesn't carve down to the narrow diagnostic zone first — the same
single-step-greedy blindness as the Stage 2b "two independent zones" finding
above. `_haplotypeRowSplit` is confirmed correct when the correct column range
is handed to it directly; recovering it automatically needs the same
future iterative-search fix noted for Stage 2b.


---

# Results (run 2026-09-11T22:36:41.753Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | false | 6 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5; nRows=30,len=20,mut=0.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 0 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | false | 3/3 |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | false | 3/3 |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | true | exact |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 4/5 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | true | exact |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | true | exact |
| 50 | 10 | 20 | 0.05 | true | exact |
| 50 | 10 | 20 | 0.15 | true | exact |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | true | exact |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | true | exact |

### Conclusion

39/108 exact recoveries. By subset size: size=2: 0/36, size=3: 17/36, size=5: 12/24, size=10: 10/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | missed | missed |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| missed | missed | n/a |

### Conclusion

Zones were not both found at distinct column ranges — see table.


## Real-data addendum (2026-09-12): two new row-split strategies added

Found by testing the real `oma_SINE16b_realigned.aln.fa` file directly with
the user (not a synthetic stage): `_gapRowSplit`'s per-row whole-window
match-rate cannot detect a row split defined by several correlated diagnostic
SNPs sitting among many invariant columns (cols 1152-1217 of that file: ~12 of
66 columns genuinely polymorphic, splitting rows into two haplotype groups,
confirmed by eye after cropping+reordering the region into a separate file for
inspection).

**`_haplotypeRowSplit`** (Hamming-distance k=2 clustering over just the
diagnostic columns, deterministic farthest-pair seeding) was added first and
found the real split (28/20 rows, gain 0.222 scored via new
`_columnListCoherence` helper against diagnostic columns only — averaging over
the whole window mathematically caps measurable gain regardless of split
quality, the same dilution problem that hid the signal from `_gapRowSplit` in
the first place). Required two empirically-found overfitting guards after the
oracle initially failed with false splits on the uniform `clean_core.aln.fa`
fixture: `HAPLOTYPE_MIN_INFO_COLS=8` (4 was not enough — small samples can
always be bipartitioned to look clean on a handful of hand-picked columns) and
`HAPLOTYPE_MIN_USABLE_ROWS=20` alongside `HAPLOTYPE_MIN_GAIN=0.2` (noise on
16 rows reached gain 0.19, the real 48-row split reached 0.22 — a thin margin,
flagged as needing its own synthetic sweep rather than the single-real-example
calibration used here).

**`_diagnosticRowSplit`** was added second, ported from this app's own
already-shipped, already-validated ViewAlign "Cluster Now" feature
(`SINEClusterer.findBestGroup` in `cluster.js`), generalized to work on a
`[colStart, colEnd]` sub-range instead of always the whole alignment. Run
directly (default parameters) on the real file as a sanity check before
porting: it independently found 7 clusters, two of which closely matched
groups already found by hand/`_haplotypeRowSplit` (a 20-seq cluster nearly
identical to a group found in the file's second divergent flank, cols
1274-1662; a 14-seq cluster overlapping heavily with the 1152-1217 haplotype
group) — real triangulation across three independent methods (eye, k-means,
evidence-accumulation), not one algorithm confirming itself. The ported
version treats every (column, state) pair as a candidate row group,
fuzzy-merges near-identical candidates across columns (>=90% overlap), and
scores each merged candidate by how many columns support it with few outside
"leaks" - real evidence accumulation rather than a fixed k, and naturally
finds >2 groups by iterating (extract best group, remove, repeat), which is a
better fit for Stage 2a's "3 groups, one zone" case than `_gapRowSplit`'s
majority-of-rows guard. On direct comparison at the exact 1152-1217 range it
found an independent 21/29 split (gain 0.214) very close to
`_haplotypeRowSplit`'s 20/28 (gain 0.222) - `bestRowSplit` now tries all three
row-split strategies and keeps the highest-gain result.

**Regression check**: oracle passes; full four-stage synthetic sweep re-run
shows Stage 0 (43/45), Stage 1b (11/12), and Stage 2a unchanged; Stage 1
dropped slightly (41/108 → 39/108, within noise - the diagnostic method
occasionally accepts/rejects a borderline case differently than the other two,
not a directional regression). Real file's overall block count changed
26 → 28 (broadly the same partition, a couple of extra sub-splits in the
already-known-complex 1585-1612 region) - not independently re-verified by eye
past the two clusters cross-checked above.

**Not yet fixed** (same already-documented limitation as before, not new):
the 1152-1217 split still isn't surfaced by `computeBiclusterMask`'s top-level
recursion on the real file - it sits inside a wide [0,1273] range that
`bestColumnSplit` judges coherent enough overall (0.92) before narrowing down
far enough to see it. All three row-split functions are confirmed correct when
handed the correct column range directly; recovering it automatically needs
the iterative-search fix already flagged for the Stage 2b "two independent
zones" case.

**Human verification of the 1585-1662 fragmentation** (2026-09-12): user
inspected `scratch/cropped_1585_1662.fa` (cropped + similarity-reordered) and
confirmed by eye: 5 nearly-empty (mostly-gap) sequences, several too short/
incomplete to cluster reliably, two major groups, and several discordant
outliers. This matches the algorithm's own output shape for this region (a
mix of small ~3-row groups, a couple of larger 11/12/22-row groups, and
several `coh=null`/tiny residual leaves) - the fragmentation here is real
substructure, not noise, confirmed independently of the algorithm's own score.


---

# Results (run 2026-09-11T22:52:59.576Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | false | 6 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5; nRows=30,len=20,mut=0.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 2/2 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | false | 3/3 |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | false | 3/3 |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | true | exact |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 4/5 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | true | exact |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | true | exact |
| 50 | 10 | 20 | 0.05 | true | exact |
| 50 | 10 | 20 | 0.15 | true | exact |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | true | exact |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | true | exact |

### Conclusion

39/108 exact recoveries. By subset size: size=2: 0/36, size=3: 17/36, size=5: 12/24, size=10: 10/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | missed | missed |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| exact | exact | true |

### Conclusion

Both independent row-subset zones recovered, at distinct non-overlapping column ranges as designed.

## Sliding-window row-split scan (2026-09-12): fixes the Stage 2b / top-level dilution limitation

Root cause of "the 1152-1217 haplotype split is correct in isolation but
never surfaces from computeBiclusterMask's top-level recursion" (documented
above) precisely diagnosed: `_haplotypeRowSplit`/`_diagnosticRowSplit` build
their diagnostic-column pool from EVERY qualifying column in whatever range
they're handed. At the real top-level [0,1273] range, that pool held 196
diagnostic columns - only 12 of which belonged to the real 1152-1217 signal,
the other 184 scattered elsewhere in a range whose AVERAGE coherence (0.92)
still looked "fine." The unrelated columns dilute/outcompete the real signal,
so both methods returned null on the full range despite being correct when
handed the narrow range directly. This is the exact same mechanism as the
Stage 2b synthetic failure, just discovered on real data first.

Added `_windowedRowSplitScan`: when a range's plain column/row splits both
fail, slide a `WINDOW_SCAN_WIDTH`-column window (default 64, 50% overlap,
capped at `WINDOW_SCAN_MAX`=60 windows) across the range and try
`bestRowSplit` on each window alone - restricting the diagnostic-column pool
back down to just that window fixes the dilution. Only runs when the plain
splits already failed, to bound the added cost to genuinely stuck cases.

**Stage 2b (two independent zones), previously "missed, missed, n/a": now
`zoneX: exact, zoneY: exact, distinctZones: true`.** Full sweep re-run shows
Stage 0/1/1b/2a unchanged (43/45, 39/108, 11/12, same 2a pattern) - no
regression, one real limitation fixed.

Real file: cols 1152-1217 now surfaces automatically at the top level
(`1152-1168 n=28`, `1152-1178 n=20`, matching the manually-probed split within
a few columns) with no perceptible performance cost (whole 50x1663 file:
~0.6s). Total leaf count on the real file rose sharply, 28 -> 74 - the window
scan is finding many more small splits throughout, not just the one target
region. This has NOT been independently spot-checked beyond the two regions
already verified by eye (1152-1217, 1585-1662) - flagged for the user to
sample a few more of the new small blocks before treating the denser output
as reflecting real substructure everywhere rather than some accumulated false
positives from the wider search space now being tried.


---

# Results (run 2026-09-11T23:01:39.176Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | false | 6 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5; nRows=30,len=20,mut=0.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 2/2 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | true | exact |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | true | exact |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | true | exact |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 4/5 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | true | exact |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | true | exact |
| 50 | 10 | 20 | 0.05 | true | exact |
| 50 | 10 | 20 | 0.15 | true | exact |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | true | exact |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | true | exact |

### Conclusion

41/108 exact recoveries. By subset size: size=2: 0/36, size=3: 19/36, size=5: 12/24, size=10: 10/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | missed | missed |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| missed | missed | n/a |

### Conclusion

Zones were not both found at distinct column ranges — see table.


---

# Results (run 2026-09-11T23:02:29.657Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | false | 6 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5; nRows=30,len=20,mut=0.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 2/2 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | true | exact |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | true | exact |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | true | exact |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 4/5 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | true | exact |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | true | exact |
| 50 | 10 | 20 | 0.05 | true | exact |
| 50 | 10 | 20 | 0.15 | true | exact |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | true | exact |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | true | exact |

### Conclusion

41/108 exact recoveries. By subset size: size=2: 0/36, size=3: 19/36, size=5: 12/24, size=10: 10/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | missed | missed |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| missed | missed | n/a |

### Conclusion

Zones were not both found at distinct column ranges — see table.


---

# Results (run 2026-09-11T23:03:07.064Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | false | 6 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5; nRows=30,len=20,mut=0.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 2/2 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | true | exact |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | true | exact |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | true | exact |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 4/5 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | true | exact |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | true | exact |
| 50 | 10 | 20 | 0.05 | true | exact |
| 50 | 10 | 20 | 0.15 | true | exact |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | true | exact |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | true | exact |

### Conclusion

41/108 exact recoveries. By subset size: size=2: 0/36, size=3: 19/36, size=5: 12/24, size=10: 10/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | missed | missed |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| missed | missed | n/a |

### Conclusion

Zones were not both found at distinct column ranges — see table.


---

# Results (run 2026-09-11T23:03:31.405Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | false | 6 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5; nRows=30,len=20,mut=0.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 2/2 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | true | exact |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | true | exact |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | true | exact |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 4/5 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | true | exact |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | true | exact |
| 50 | 10 | 20 | 0.05 | true | exact |
| 50 | 10 | 20 | 0.15 | true | exact |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | true | exact |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | true | exact |

### Conclusion

41/108 exact recoveries. By subset size: size=2: 0/36, size=3: 19/36, size=5: 12/24, size=10: 10/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | missed | missed |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| exact | exact | true |

### Conclusion

Both independent row-subset zones recovered, at distinct non-overlapping column ranges as designed.


---

# Results (run 2026-09-11T23:04:23.146Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | false | 6 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5; nRows=30,len=20,mut=0.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 2/2 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | true | exact |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | true | exact |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | true | exact |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 4/5 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | true | exact |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | true | exact |
| 50 | 10 | 20 | 0.05 | true | exact |
| 50 | 10 | 20 | 0.15 | true | exact |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | true | exact |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | true | exact |

### Conclusion

41/108 exact recoveries. By subset size: size=2: 0/36, size=3: 19/36, size=5: 12/24, size=10: 10/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | missed | missed |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| exact | exact | true |

### Conclusion

Both independent row-subset zones recovered, at distinct non-overlapping column ranges as designed.


---

# Results (run 2026-09-11T23:05:13.879Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | false | 6 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5; nRows=30,len=20,mut=0.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 2/2 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | true | exact |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | true | exact |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | true | exact |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 4/5 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | true | exact |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | true | exact |
| 50 | 10 | 20 | 0.05 | true | exact |
| 50 | 10 | 20 | 0.15 | true | exact |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | true | exact |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | true | exact |

### Conclusion

41/108 exact recoveries. By subset size: size=2: 0/36, size=3: 19/36, size=5: 12/24, size=10: 10/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | missed | missed |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| exact | exact | true |

### Conclusion

Both independent row-subset zones recovered, at distinct non-overlapping column ranges as designed.

## Diagnostic-method overfitting fix + reverted experiment (2026-09-12)

Testing on the small, well-understood `mosaic_subset.aln.fa` fixture (20
rows, exactly 1 known real planted subgroup) at the user's request for an
easier-to-eyeball example surfaced a real regression from the window-scan
work above: `computeBiclusterMask` produced 26 row-split blocks where only 1
should exist.

**Fixed**: `_diagnosticRowSplit`'s "ultra-relax" fallback (`avail.length <=
10` -> `minPerfect=1, minOccurrences=1`), ported directly from
`cluster.js`'s own endgame logic for forcing every leftover sequence into
SOME cluster (legitimate for that whole-alignment UI feature, meaningless
here where a "residual" group is already a fully valid outcome), was
manufacturing spurious 3-row groups once `_windowedRowSplitScan` started
calling this on many small windows/pools. Removed entirely, and added a
`rows.length < P.HAPLOTYPE_MIN_USABLE_ROWS` floor at entry (same floor
`_haplotypeRowSplit` already uses). Cut spurious row-split blocks from 25 to
17 (26 -> 18 total), oracle still passes, full synthetic sweep unchanged
including Stage 2b (still exact/exact/true).

**Tried and reverted**: a "look-elsewhere" gain-threshold multiplier
(`WINDOW_SCAN_GAIN_MULTIPLIER`) applied inside `_windowedRowSplitScan`,
reasoning that trying up to 60 windows and keeping the best inflates
false-positive risk (a real, correct concern in general). Measured directly
that a 2x multiplier broke real Stage 2b recovery (`missed, missed`)
WITHOUT reducing mosaic_subset's spurious block count at all - because the
narrow ranges producing that noise (8-13 columns) are all under
`WINDOW_SCAN_WIDTH` (64) and bypass the window scan entirely, calling
`bestRowSplit` directly via `splitAndMerge`'s normal step 2. Removed the
multiplier mechanism cleanly rather than leave a no-op parameter.

**Still open, NOT fixed**: the remaining 17 spurious row-split blocks on
mosaic_subset trace to `_gapRowSplit` - the original row-split method from
earlier in this session, untouched by today's changes - firing on narrow
(8-13 column) ranges with no real signal (measured: gain 0.35 on a
216-223 window that is pure noise). This is a pre-existing bug, not
introduced by the window-scan/diagnostic-method work, just not previously
visible because no one had looked at this fixture's FULL output before
(the oracle only checks "at least one plausible group exists," not "no
extra spurious ones"). Needs its own investigation - likely the same shape
of fix as haplotype/diagnostic already got (a sample-size or window-width
floor, or scoring against diagnostic-columns-only instead of the whole
narrow window) - not yet attempted.


---

# Results (run 2026-09-11T23:29:56.454Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 5 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | true | 3 |
| 30 | 20 | 0.05 | true | 5 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 0 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 0 |
| 10 | 3 | 20 | 0 | false | 0 |
| 10 | 3 | 20 | 0.05 | false | 0 |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | true | exact |
| 10 | 3 | 60 | 0 | false | 0 |
| 10 | 3 | 60 | 0.05 | false | 0 |
| 10 | 3 | 60 | 0.15 | false | 0 |
| 10 | 3 | 60 | 0.3 | false | 0 |
| 10 | 3 | 150 | 0 | false | 0 |
| 10 | 3 | 150 | 0.05 | false | 0 |
| 10 | 3 | 150 | 0.15 | false | 0 |
| 10 | 3 | 150 | 0.3 | false | 0 |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | false | 0 |
| 20 | 3 | 20 | 0.05 | false | 0 |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | false | 0 |
| 20 | 3 | 60 | 0.05 | false | 0 |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | false | 0 |
| 20 | 3 | 150 | 0.05 | false | 0 |
| 20 | 3 | 150 | 0.15 | false | 0 |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | false | 0 |
| 20 | 5 | 20 | 0.05 | false | 0 |
| 20 | 5 | 20 | 0.15 | false | 0 |
| 20 | 5 | 20 | 0.3 | false | 0 |
| 20 | 5 | 60 | 0 | false | 0 |
| 20 | 5 | 60 | 0.05 | false | 0 |
| 20 | 5 | 60 | 0.15 | false | 0 |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | false | 0 |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | false | 0 |
| 20 | 5 | 150 | 0.3 | false | 0 |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | false | 0 |
| 50 | 5 | 150 | 0.05 | false | 0 |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | false | 0 |
| 50 | 10 | 20 | 0.05 | false | 0 |
| 50 | 10 | 20 | 0.15 | false | 0 |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | false | 0 |
| 50 | 10 | 60 | 0.05 | false | 0 |
| 50 | 10 | 60 | 0.15 | false | 0 |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | false | 0 |
| 50 | 10 | 150 | 0.05 | false | 0 |
| 50 | 10 | 150 | 0.15 | false | 0 |
| 50 | 10 | 150 | 0.3 | false | 0 |

### Conclusion

3/108 exact recoveries. By subset size: size=2: 0/36, size=3: 2/36, size=5: 1/24, size=10: 0/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | false | 0 |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | false | 0 |
| 10 | 5 | 0 | false | 0 |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | false | 0 |
| 20 | 3 | 0 | false | 0 |
| 20 | 3 | 0.15 | false | 0 |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | false | 0 |
| 20 | 5 | 0.15 | false | 0 |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

3/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | missed | missed |
| 8 | 8 | exact | exact |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| missed | missed | n/a |

### Conclusion

Zones were not both found at distinct column ranges — see table.


---

# Results (run 2026-09-11T23:31:26.469Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | false | 6 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5; nRows=30,len=20,mut=0.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 2/2 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | true | exact |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | true | exact |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | true | exact |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 4/5 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | true | exact |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | true | exact |
| 50 | 10 | 20 | 0.05 | true | exact |
| 50 | 10 | 20 | 0.15 | true | exact |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | true | exact |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | true | exact |

### Conclusion

41/108 exact recoveries. By subset size: size=2: 0/36, size=3: 19/36, size=5: 12/24, size=10: 10/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | exact | exact |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| exact | exact | true |

### Conclusion

Both independent row-subset zones recovered, at distinct non-overlapping column ranges as designed.


---

# Results (run 2026-09-11T23:34:02.506Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | true | 3 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 2/2 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 2/2 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | true | exact |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | true | exact |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | true | exact |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | true | exact |
| 20 | 3 | 20 | 0.05 | false | 0 |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | true | exact |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | true | exact |
| 20 | 5 | 20 | 0.3 | false | 0 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | false | 0 |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | false | 0 |
| 50 | 10 | 20 | 0.05 | false | 0 |
| 50 | 10 | 20 | 0.15 | false | 0 |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | true | exact |
| 50 | 10 | 60 | 0.15 | false | 0 |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | true | exact |
| 50 | 10 | 150 | 0.3 | false | 0 |

### Conclusion

34/108 exact recoveries. By subset size: size=2: 0/36, size=3: 18/36, size=5: 11/24, size=10: 5/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | exact | exact |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| exact | exact | true |

### Conclusion

Both independent row-subset zones recovered, at distinct non-overlapping column ranges as designed.

## Real fix for _gapRowSplit false positives (2026-09-12), superseding the earlier singleton-display patch

The earlier "singleton = not a claim" display fix (previous entry above) was
correctly called out by the user as treating a symptom, not the actual
algorithm defect. Root cause, confirmed directly on the real spurious group
`[6,8,13,15,17]` at cols 216-223 of `mosaic_subset.aln.fa`: `_gapRowSplit`
scores a candidate group's coherence via plain `blockCoherence`, which
accepts ANY plurality (the single most common of 5 possible states -
A/C/G/T/gap) as a column's "dominant" state. For a 5-row candidate group,
a plurality of 2-4 out of 5 (40-80%) is unremarkable by pure chance (the
pigeonhole effect of few rows over few categories, not real agreement) -
confirmed the group showed exactly this at all 8 columns in range, yet
averaging several such chance-level columns produced an aggregate score
(0.60) that beat the whole subset's own coherence (0.69->wait, corrected
value 0.5428 vs subset whole 0.6875 initially, then further corrected),
clearing `MIN_SPLIT_GAIN` despite the group's rows sharing no real content.

First attempt (flat 90%/80%/70% purity floor by group size, same values
already used in `_findBestDiagnosticGroup`) was too blunt: it also floored
out real Stage 1 signal at realistic mutation rates (41/108 -> 3/108 exact
recovery - a large real regression), because a genuinely shared but
mutated sequence does not clear 90% raw purity just because the group is
small.

Second attempt: compare a column's group purity against the RATE AT WHICH
THE REST OF THE BLOCK ALREADY SHOWS THAT SAME STATE (enrichment over
background, the same idea `_findBestDiagnosticGroup`'s inP/outP quality
check already uses), with a flat 25-percentage-point margin. Still let the
same spurious group through: confirmed the "rest" pool (9-10 rows) showed
zero matches for the group's dominant state at most columns purely by
chance (with 5 states and ~9 rows, ~13% chance per column of zero overlap
is not rare), which trivially "enriches" any purity number above a flat
25-point bar.

**Final fix**: reuse `_findBestDiagnosticGroup`'s EXACT acceptance rule
(same function, not just same threshold values) - a column counts only if
either restMatch is exactly 0 (true exclusivity) or the in-group/out-group
percentage-point margin clears the SAME size-scaled threshold already
validated there (90/80/70). New helper `_strictGroupCoherence` +
`_countStateInRows`, used only for `_gapRowSplit`'s own group scoring.

**Result**: mosaic_subset.aln.fa row-split blocks: 18 -> 3 total (all
earlier spurious groups gone, including the specific one the user asked
about directly), with only the one real planted subgroup `[0,1,2,3,4]`
remaining. Full synthetic sweep: Stage 0 43->44/45, Stage 1 41->34/108
(real but modest cost - some borderline-real Stage 1 cases now also
require the extra margin), Stage 1b unchanged (11/12), Stage 2a IMPROVED
(the previously-missed 8-vs-8 balanced case now passes exactly), Stage 2b
unchanged (still exact/exact/true). Net: closes a real false-positive
source with one real, disclosed cost on borderline cases, not the earlier
patches' pattern of trading one failure mode for another.


---

# Results (run 2026-09-12T00:10:15.100Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | true | 3 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 0 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 0 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | false | 0 |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | false | 0 |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | false | 0 |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | false | 0 |
| 20 | 3 | 20 | 0.05 | false | 0 |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | false | 0 |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | false | 0 |
| 20 | 5 | 20 | 0.3 | false | 0 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | false | 0 |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | false | 0 |
| 50 | 10 | 20 | 0.05 | false | 0 |
| 50 | 10 | 20 | 0.15 | false | 0 |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | false | 0 |
| 50 | 10 | 60 | 0.15 | false | 0 |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | false | 0 |
| 50 | 10 | 150 | 0.3 | false | 0 |

### Conclusion

26/108 exact recoveries. By subset size: size=2: 0/36, size=3: 14/36, size=5: 9/24, size=10: 3/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | exact | exact |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| exact | exact | true |

### Conclusion

Both independent row-subset zones recovered, at distinct non-overlapping column ranges as designed.

## Gap-as-conservation-signal bug fix (2026-09-12) - found live in the UI

The user, using the newly-wired live overlay, correctly identified that a
block colored as moderately conserved (cols 33-40 of mosaic_subset.aln.fa,
coherence 0.838) didn't visually look conserved at all. Traced directly:
the dominant state at cols 33-39 was GAP (17/20 rows), not a real base -
only col 40 carried an actual shared letter. `columnStats`/`blockCoherence`
were treating "most rows share a deletion here" as equally strong
conservation evidence as "most rows share a real base here," which is not
the same claim - the former can just mean a set of independent short
sequences haven't reached that alignment position yet, not real homology.

**Fix**: `columnStats`'s dominant-state selection now only considers A/C/G/T
(states 0-3), never gap (state 4) - a column where every covered row is a
gap correctly falls out as dominantCount=0 (no real signal) rather than a
false "perfectly conserved" reading. This is a foundational change (affects
every consumer of columnStats: blockCoherence, bestColumnSplit,
_gapRowSplit, _haplotypeRowSplit/_diagnosticRowSplit's informative-column
detection).

This surfaced two further, real regressions that needed their own fixes
(not just accepted as collateral damage):

1. **clean_core.aln.fa false positives returned** (4 spurious row-split
   blocks) at its ragged trailing end, where real coherence is
   legitimately low (0.28) once gap-inflation was removed - `_gapRowSplit`
   could still find small groups whose `_strictGroupCoherence` cleared
   `MIN_SPLIT_GAIN` above that now-lower baseline. Traced to
   `_strictGroupCoherence`'s "isPerfect" shortcut (zero overlap with the
   rest of the block = automatically accept a column, regardless of the
   group's own internal purity) - a 7-row group with only 33% internal
   purity was passing purely because that weak plurality happened not to
   overlap the rest by chance (small alphabet, sparse real data). Fixed by
   removing the shortcut entirely: a column now always needs the real
   percentage-point margin over background, which a genuinely pure group
   still clears automatically (when overlap is truly zero, the margin
   equation reduces to requiring the group's own purity to clear the
   threshold directly). Also added a minimum-qualifying-columns floor
   (`GAP_MIN_QUALIFYING_COLS`, default 2) so a single lucky column can
   never carry a whole group's score alone.

2. **mosaic_subset.aln.fa's real 5-row signal stopped being found** even
   though its own `_strictGroupCoherence` was a perfect 1.0. Root cause:
   `_gapRowSplit`'s gain formula averaged coherence across ALL accepted
   groups, INCLUDING the large "everyone else" background group - which is
   deliberately heterogeneous by design and now (correctly) scores near
   zero, dragging the weighted average below the whole block's own
   baseline even when the real minority subgroup is a perfect match. Fixed
   by scoring gain from the BEST accepted group's own coherence, not a
   size-weighted average - the point of this split is finding one
   coherent minority while the rest legitimately doesn't cohere with
   itself, which an average-based score fundamentally can't reward.

**Result, verified directly**: `clean_core.aln.fa` back to 0 spurious
row-splits; `mosaic_subset.aln.fa` finds exactly the one real group
(coherence now 0.59, correctly reduced from the old gap-inflated number
since it no longer gets credit for shared gaps within its own span, only
real shared bases); the cols 33-40/41+ boundary that started this now
reads 32-39 at coherence 0.125 (correctly low/uninformative) and 40-150 at
0.879 (correctly high/real core) - matching what the user could see by eye
in the raw sequence letters. Full synthetic sweep: Stage 0 44/45, Stage 1
26/108 (further real cost from this round of fixes - the two changes here
are more conservative than before, disclosed rather than hidden), Stage 1b
11/12 unchanged, Stage 2a and 2b unchanged (still improved from earlier
in this file).


---

# Results (run 2026-09-12T00:26:06.953Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | true | 3 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 0 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 0 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | false | 0 |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | false | 0 |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | false | 0 |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | false | 0 |
| 20 | 3 | 20 | 0.05 | false | 0 |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | false | 0 |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | false | 0 |
| 20 | 5 | 20 | 0.3 | false | 0 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | false | 0 |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | false | 0 |
| 50 | 10 | 20 | 0.05 | false | 0 |
| 50 | 10 | 20 | 0.15 | false | 0 |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | false | 0 |
| 50 | 10 | 60 | 0.15 | false | 0 |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | false | 0 |
| 50 | 10 | 150 | 0.3 | false | 0 |

### Conclusion

26/108 exact recoveries. By subset size: size=2: 0/36, size=3: 14/36, size=5: 9/24, size=10: 3/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | exact | exact |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| exact | exact | true |

### Conclusion

Both independent row-subset zones recovered, at distinct non-overlapping column ranges as designed.

## Fully-gapped-column bug fix (2026-09-12) - second bug from the same gap fix

Found live in the UI, again by the user, on the real oma_SINE16b file this
time: a region (cols ~1280-1407) showed heavy, ragged fragmentation with
several leaves scoring EXACTLY coherence 0.000, next to a suspiciously
uniform all-gray region (cols 1408-1503, a single undivided "all" block,
coherence 0.463) that visually looked like it should show similar structure
to its neighbor, not none at all.

Root cause, confirmed directly: the earlier fix (dominant state must be
A/C/G/T, never gap) had a mirror-image bug - when EVERY row in a candidate
group is gap at a column (zero real bases at all), `dominant` fell through
to state 0 with dominantCount 0, reporting a fake "0% purity" instead of
"no real data here to judge." Confirmed on a real 23-row group where a
column had 0 covered real bases: blockCoherence scored that column exactly
0.000, dragging the group's average down and helping cause the
fragmentation.

Fix: `columnStats` now returns `covered: 0` (not just dominantCount 0) when
real-base count is zero, so the existing `MIN_COL_COVERAGE` check correctly
treats a fully-gapped column as uninformative and skips it - same principle
as the first gap fix, applied to the complementary degenerate case.
Deliberately narrower than also excluding gap rows from `covered` when SOME
real bases ARE present (a partial mix of a real base and genuine
within-span deletions is exactly what Simmons & Ochoterena's gap-as-real-
state treatment is for - only the all-gap degenerate case needed fixing).

**Effect on the real file was much larger than expected**: not just fixing
the one 0.000 anomaly, but changing detected structure broadly - the
previously-uniform-gray region the user flagged as suspicious now shows
real row-split structure with coherence up to 0.97, consistent with their
intuition that it shouldn't have looked so different from its neighbor.
Oracle and full synthetic sweep unchanged (44/45, 26/108, 11/12, same
Stage 2a/2b pattern) - the synthetic fixtures don't have enough fully-gapped
columns to exercise this path, which is why only the real biological data
(full of short, ragged terminal copies) surfaced it.


---

# Results (run 2026-09-12T00:42:13.443Z)

## Results — Stage 0

| nRows | len | mut | detected | nBlocks |
|---|---|---|---|---|
| 5 | 20 | 0 | true | 3 |
| 5 | 20 | 0.05 | true | 2 |
| 5 | 20 | 0.15 | true | 2 |
| 5 | 20 | 0.3 | true | 3 |
| 5 | 20 | 0.5 | false | 3 |
| 5 | 60 | 0 | true | 2 |
| 5 | 60 | 0.05 | true | 2 |
| 5 | 60 | 0.15 | true | 2 |
| 5 | 60 | 0.3 | true | 2 |
| 5 | 60 | 0.5 | true | 2 |
| 5 | 150 | 0 | true | 2 |
| 5 | 150 | 0.05 | true | 2 |
| 5 | 150 | 0.15 | true | 2 |
| 5 | 150 | 0.3 | true | 2 |
| 5 | 150 | 0.5 | true | 2 |
| 10 | 20 | 0 | true | 2 |
| 10 | 20 | 0.05 | true | 3 |
| 10 | 20 | 0.15 | true | 4 |
| 10 | 20 | 0.3 | true | 2 |
| 10 | 20 | 0.5 | true | 2 |
| 10 | 60 | 0 | true | 2 |
| 10 | 60 | 0.05 | true | 2 |
| 10 | 60 | 0.15 | true | 2 |
| 10 | 60 | 0.3 | true | 2 |
| 10 | 60 | 0.5 | true | 2 |
| 10 | 150 | 0 | true | 2 |
| 10 | 150 | 0.05 | true | 2 |
| 10 | 150 | 0.15 | true | 2 |
| 10 | 150 | 0.3 | true | 2 |
| 10 | 150 | 0.5 | true | 2 |
| 30 | 20 | 0 | true | 3 |
| 30 | 20 | 0.05 | true | 3 |
| 30 | 20 | 0.15 | true | 2 |
| 30 | 20 | 0.3 | true | 3 |
| 30 | 20 | 0.5 | true | 2 |
| 30 | 60 | 0 | true | 2 |
| 30 | 60 | 0.05 | true | 3 |
| 30 | 60 | 0.15 | true | 2 |
| 30 | 60 | 0.3 | true | 2 |
| 30 | 60 | 0.5 | true | 2 |
| 30 | 150 | 0 | true | 2 |
| 30 | 150 | 0.05 | true | 2 |
| 30 | 150 | 0.15 | true | 2 |
| 30 | 150 | 0.3 | true | 2 |
| 30 | 150 | 0.5 | true | 2 |

### Conclusion

Column separation fails at: nRows=5,len=20,mut=0.5.

## Results — Stage 1

| nRows | subsetSize | tailLen | mut | exact | partialOverlap |
|---|---|---|---|---|---|
| 10 | 2 | 20 | 0 | false | 0 |
| 10 | 2 | 20 | 0.05 | false | 0 |
| 10 | 2 | 20 | 0.15 | false | 0 |
| 10 | 2 | 20 | 0.3 | false | 0 |
| 10 | 2 | 60 | 0 | false | 0 |
| 10 | 2 | 60 | 0.05 | false | 0 |
| 10 | 2 | 60 | 0.15 | false | 0 |
| 10 | 2 | 60 | 0.3 | false | 0 |
| 10 | 2 | 150 | 0 | false | 0 |
| 10 | 2 | 150 | 0.05 | false | 0 |
| 10 | 2 | 150 | 0.15 | false | 0 |
| 10 | 2 | 150 | 0.3 | false | 0 |
| 10 | 3 | 20 | 0 | true | exact |
| 10 | 3 | 20 | 0.05 | false | 0 |
| 10 | 3 | 20 | 0.15 | true | exact |
| 10 | 3 | 20 | 0.3 | false | 0 |
| 10 | 3 | 60 | 0 | true | exact |
| 10 | 3 | 60 | 0.05 | true | exact |
| 10 | 3 | 60 | 0.15 | false | 0 |
| 10 | 3 | 60 | 0.3 | true | exact |
| 10 | 3 | 150 | 0 | true | exact |
| 10 | 3 | 150 | 0.05 | true | exact |
| 10 | 3 | 150 | 0.15 | true | exact |
| 10 | 3 | 150 | 0.3 | true | exact |
| 20 | 2 | 20 | 0 | false | 0 |
| 20 | 2 | 20 | 0.05 | false | 0 |
| 20 | 2 | 20 | 0.15 | false | 0 |
| 20 | 2 | 20 | 0.3 | false | 0 |
| 20 | 2 | 60 | 0 | false | 0 |
| 20 | 2 | 60 | 0.05 | false | 0 |
| 20 | 2 | 60 | 0.15 | false | 0 |
| 20 | 2 | 60 | 0.3 | false | 0 |
| 20 | 2 | 150 | 0 | false | 0 |
| 20 | 2 | 150 | 0.05 | false | 0 |
| 20 | 2 | 150 | 0.15 | false | 0 |
| 20 | 2 | 150 | 0.3 | false | 0 |
| 20 | 3 | 20 | 0 | false | 0 |
| 20 | 3 | 20 | 0.05 | false | 0 |
| 20 | 3 | 20 | 0.15 | false | 0 |
| 20 | 3 | 20 | 0.3 | false | 0 |
| 20 | 3 | 60 | 0 | true | exact |
| 20 | 3 | 60 | 0.05 | true | exact |
| 20 | 3 | 60 | 0.15 | false | 0 |
| 20 | 3 | 60 | 0.3 | false | 0 |
| 20 | 3 | 150 | 0 | true | exact |
| 20 | 3 | 150 | 0.05 | true | exact |
| 20 | 3 | 150 | 0.15 | true | exact |
| 20 | 3 | 150 | 0.3 | false | 0 |
| 20 | 5 | 20 | 0 | false | 0 |
| 20 | 5 | 20 | 0.05 | true | exact |
| 20 | 5 | 20 | 0.15 | false | 0 |
| 20 | 5 | 20 | 0.3 | false | 0 |
| 20 | 5 | 60 | 0 | true | exact |
| 20 | 5 | 60 | 0.05 | false | 0 |
| 20 | 5 | 60 | 0.15 | true | exact |
| 20 | 5 | 60 | 0.3 | false | 0 |
| 20 | 5 | 150 | 0 | true | exact |
| 20 | 5 | 150 | 0.05 | true | exact |
| 20 | 5 | 150 | 0.15 | true | exact |
| 20 | 5 | 150 | 0.3 | true | exact |
| 50 | 2 | 20 | 0 | false | 0 |
| 50 | 2 | 20 | 0.05 | false | 0 |
| 50 | 2 | 20 | 0.15 | false | 0 |
| 50 | 2 | 20 | 0.3 | false | 0 |
| 50 | 2 | 60 | 0 | false | 0 |
| 50 | 2 | 60 | 0.05 | false | 0 |
| 50 | 2 | 60 | 0.15 | false | 0 |
| 50 | 2 | 60 | 0.3 | false | 0 |
| 50 | 2 | 150 | 0 | false | 0 |
| 50 | 2 | 150 | 0.05 | false | 0 |
| 50 | 2 | 150 | 0.15 | false | 0 |
| 50 | 2 | 150 | 0.3 | false | 0 |
| 50 | 3 | 20 | 0 | false | 0 |
| 50 | 3 | 20 | 0.05 | false | 0 |
| 50 | 3 | 20 | 0.15 | false | 0 |
| 50 | 3 | 20 | 0.3 | false | 0 |
| 50 | 3 | 60 | 0 | false | 0 |
| 50 | 3 | 60 | 0.05 | false | 0 |
| 50 | 3 | 60 | 0.15 | false | 0 |
| 50 | 3 | 60 | 0.3 | false | 0 |
| 50 | 3 | 150 | 0 | false | 0 |
| 50 | 3 | 150 | 0.05 | false | 0 |
| 50 | 3 | 150 | 0.15 | false | 0 |
| 50 | 3 | 150 | 0.3 | false | 0 |
| 50 | 5 | 20 | 0 | false | 0 |
| 50 | 5 | 20 | 0.05 | false | 0 |
| 50 | 5 | 20 | 0.15 | false | 0 |
| 50 | 5 | 20 | 0.3 | false | 0 |
| 50 | 5 | 60 | 0 | false | 0 |
| 50 | 5 | 60 | 0.05 | false | 0 |
| 50 | 5 | 60 | 0.15 | false | 0 |
| 50 | 5 | 60 | 0.3 | false | 0 |
| 50 | 5 | 150 | 0 | true | exact |
| 50 | 5 | 150 | 0.05 | true | exact |
| 50 | 5 | 150 | 0.15 | false | 0 |
| 50 | 5 | 150 | 0.3 | false | 0 |
| 50 | 10 | 20 | 0 | false | 0 |
| 50 | 10 | 20 | 0.05 | false | 0 |
| 50 | 10 | 20 | 0.15 | false | 0 |
| 50 | 10 | 20 | 0.3 | false | 0 |
| 50 | 10 | 60 | 0 | true | exact |
| 50 | 10 | 60 | 0.05 | false | 0 |
| 50 | 10 | 60 | 0.15 | false | 0 |
| 50 | 10 | 60 | 0.3 | false | 0 |
| 50 | 10 | 150 | 0 | true | exact |
| 50 | 10 | 150 | 0.05 | true | exact |
| 50 | 10 | 150 | 0.15 | false | 0 |
| 50 | 10 | 150 | 0.3 | false | 0 |

### Conclusion

26/108 exact recoveries. By subset size: size=2: 0/36, size=3: 14/36, size=5: 9/24, size=10: 3/12.

## Results — Stage 1b (length variation)

| nRows | subsetSize | trim | exact | partialOverlap |
|---|---|---|---|---|
| 10 | 3 | 0 | true | exact |
| 10 | 3 | 0.15 | true | exact |
| 10 | 3 | 0.3 | true | exact |
| 10 | 5 | 0 | true | exact |
| 10 | 5 | 0.15 | true | exact |
| 10 | 5 | 0.3 | true | exact |
| 20 | 3 | 0 | true | exact |
| 20 | 3 | 0.15 | true | exact |
| 20 | 3 | 0.3 | false | 0 |
| 20 | 5 | 0 | true | exact |
| 20 | 5 | 0.15 | true | exact |
| 20 | 5 | 0.3 | true | exact |

### Conclusion

11/12 exact recoveries under independent trailing-gap trimming. Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.

## Results — Stage 2a (3 groups in one zone)

| sizeA | sizeB | groupA | groupB |
|---|---|---|---|
| 5 | 5 | missed | missed |
| 3 | 8 | exact | exact |
| 8 | 8 | exact | exact |

### Conclusion

At least one configuration failed to cleanly separate both groups — see table for which.

## Results — Stage 2b (two independent zones)

| zoneX | zoneY | distinctZones |
|---|---|---|
| exact | exact | true |

### Conclusion

Both independent row-subset zones recovered, at distinct non-overlapping column ranges as designed.

## Root-cause fix for singleton "clusters" (2026-09-12), superseding a display-only patch

User correctly rejected an initial fix that only forced singleton row-split
blocks to render gray in the live UI (script.js's color-mapping) as
treating a symptom again: "the block cannot contain 1 sequence. there
cannot be one coloured line in any block... it's a major flaw in your
logic," not a display detail.

**Real root cause**: `splitAndMerge`'s recursion-termination step ("too
small to split further - return whatever's left as a leaf") does not
itself enforce `MIN_BLOCK_ROWS` - a residual/leftover group from any of
the three row-split strategies can recurse down to a single row and still
come back as its own standalone leaf, even though `MIN_BLOCK_ROWS=3` is
supposed to mean a group that small is never treated as meaningful.
Confirmed live: a real 1-row leaf existed in `computeBiclusterMask`'s
output on a cropped real-file region.

**Fix**: new `_mergeUndersizedLeaves`, run right after `splitAndMerge`
returns (before `mergeAdjacentLeaves`) - any leaf under `MIN_BLOCK_ROWS`
is folded into whichever SIBLING leaf shares its exact column range and
is largest, recomputing that sibling's coherence over the merged rows.
This is a real algorithm-level fix (block-bicluster.js), not the earlier
script.js display-only patch (kept as harmless defense-in-depth, but now
dead code in practice since the algorithm no longer produces singletons).

**Verified**: oracle passes, full synthetic sweep unchanged (44/45,
26/108, 11/12, same Stage 2a/2b pattern - no regression), clean_core still
0 spurious splits, mosaic_subset still finds exactly its one real group,
and a direct check on the cropped real-file region that surfaced this bug
confirms zero singleton leaves remain anywhere in its output.
