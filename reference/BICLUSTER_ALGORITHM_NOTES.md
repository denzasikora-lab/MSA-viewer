# Block-mask algorithm: research notes for the next implementation pass

**Status: research only. No code changed by this document.** Written to be
read fresh in a later session before writing the next version of the
block-mask algorithm — do not re-derive this, read it.

## The problem, restated generally

An alignment is a matrix: rows = sequences, columns = positions. We want to
find rectangular sub-blocks (a set of rows × a set of columns) that are
internally coherent — "these N sequences agree with each other over this
column range." The current `block_schematic.py`/`block-mask.js` treats rows
and columns asymmetrically: one arbitrary row is picked as "the reference,"
column ranges ("zones") are found first from that reference's own extent,
and only then are rows clustered *within* a zone whose width was already
fixed by the reference. Three real bugs traced this session all come from
that asymmetry (see "Bugs this session" below). The user's framing is the
right one: **there is no principled reason columns should be found first
and rows second, or that one row should be special** — this is a symmetric
2D problem and should be solved with a symmetric algorithm. Below is what
already exists, in the literature and in this codebase, for exactly that.

## Established prior art

### 1. Biclustering (statistics / bioinformatics)

Also called co-clustering or two-mode clustering: cluster rows AND columns
of a data matrix *simultaneously*, discovering submatrices with a coherent
pattern rather than clustering one axis and treating the other as fixed.

- Cheng & Church (1999), *Biclustering of Expression Data* — the founding
  algorithm, originally for gene-expression matrices (rows = genes,
  columns = conditions — structurally identical to rows = sequences,
  columns = alignment positions). Scores a candidate submatrix by **mean
  squared residue (MSR)**: for cell (i,j) in a candidate bicluster, its
  residue is `a[i,j] - rowMean[i] - colMean[j] + blockMean`; MSR is the
  mean of squared residues over the block. Low MSR = coherent (the value at
  every cell is well predicted by an additive row-effect + column-effect
  model). Biclusters are found by a sequential covering / greedy
  node-deletion strategy: start with the whole matrix, repeatedly remove
  whichever single row or column reduces MSR the most, until MSR drops
  below a threshold; then greedily add back rows/columns that don't raise
  it. https://www.researchgate.net/publication/12345321_Biclustering_of_Expression_Data
- Madeira & Oliveira, *Biclustering data analysis: a comprehensive survey*
  (2004, updated 2024) — catalogs the whole field (constant biclusters,
  constant-row/column biclusters, coherent-value biclusters, coherent-
  evolution biclusters) and the algorithm families (greedy iterative
  search like Cheng-Church, divide-and-conquer, exhaustive enumeration,
  distribution-based). https://academic.oup.com/bib/article/25/4/bbae342/7713725
- Plaid models (Lazzeroni & Owen) — model the whole matrix as a sum of
  overlapping "layers," each layer defined by a subset of rows AND a
  subset of columns with roughly constant value. This is the closest
  existing formalism to "the alignment is literally a stack of
  rectangles" — worth reading before designing the output data model.

**For our case**: base-identity isn't continuous (it's categorical: A/C/G/T
plus gap-as-state, see below), so MSR itself doesn't apply directly, but
the *algorithm shape* — score a candidate block, greedily grow/shrink it by
one row or column at a time based on whichever move most improves the
score — carries over directly and IS the fix for the row/column asymmetry.

### 2. Split-and-merge image segmentation

Horowitz & Pavlidis (1974): recursively decompose a 2D region by a
homogeneity test. Given a region, test homogeneity; if not homogeneous,
split it (their original formulation used quadtree quartering, but the
general "split-and-merge" family splits along whichever axis or line most
increases homogeneity, not necessarily into quarters); recurse on each
part. After splitting, a **merge** pass reunites adjacent regions whose
patterns turn out to be statistically indistinguishable, cleaning up
fragmentation from the top-down order the splits happened to occur in.
https://en.wikipedia.org/wiki/Split_and_merge_segmentation

**For our case**: this is the general recursive shape to build the
biclustering search around — split a block by rows or by columns
(whichever helps more), recurse, then merge adjacent leaves with the same
row-membership and compatible pattern back into one wider rectangle. It
directly replaces the current fixed "zone" step (which only ever splits by
column first) and the separate, disconnected "squint absorb" merge pass
(which only merges full-height blocks, never row-split ones).

### 3. Gblocks / trimAl — the column-only special case, already well known

Castresana (2000), *Selection of Conserved Blocks from Multiple Alignments
for Their Use in Phylogenetic Analysis* (Gblocks) — the standard tool for
this problem, but it **only ever operates on columns**: it selects which
alignment columns are "conserved enough to keep," with no concept of a
column being conserved for a subset of rows only. trimAl and BMGE are the
same shape. This confirms the column-only half of the problem is
extremely well trodden; the row-subsetting half is the actual gap in the
standard toolkit, and is what biclustering (§1) fills in.
https://academic.oup.com/mbe/article/17/4/540/1127654

### 4. Gap coding in phylogenetics — already implemented correctly in this app

Simmons & Ochoterena (2000), *Gaps as Characters in Sequence-Based
Phylogenetic Analyses*, Systematic Biology 49(2):369-381. The
foundational treatment of a question every one of our per-column
coherence tests has to answer: **is a gap "no data" or a real character
state?** Their answer, "simple indel coding": a gap embedded *within* a
sequence's own real span is phylogenetically informative and should be
scored as a real state; a gap *outside* that span (the sequence doesn't
reach there at all — a leading/trailing gap from padding to alignment
width) is genuinely missing data and must be excluded from the count, not
scored as "different." Conflating the two is a known, named error mode in
the phylogenetics literature — treating terminal padding gaps as if they
were informative indels systematically inflates apparent divergence in
exactly the low-coverage flank regions that also trip up naive coverage
thresholds.

## Prior art already IN THIS CODEBASE — read before writing anything new

`_computeVarSites(len)` in `script.js` (search for that name; ~line 5863,
backs the Display menu's **Highlight Diffs** / **Variable Sites Only**
checkboxes — manual.html §5.2) already implements exactly the Simmons &
Ochoterena distinction, correctly, and is already tested and in production
use:

```js
// per sequence: its own real (non-gap) span
const spans = state.seqs.map(s => {
    let first = -1, last = -1;
    for (let i = 0; i < s.seq.length; i++) {
        if (s.seq[i] !== '-' && s.seq[i] !== '.') { if (first === -1) first = i; last = i; }
    }
    return { first, last };
});
// per column: only rows whose [first,last] span covers this position count
for (let pos = 0; pos < len; pos++) {
    const counts = {};
    let covered = 0;
    for (let i = 0; i < state.seqs.length; i++) {
        const { first, last } = spans[i];
        if (first === -1 || pos < first || pos > last) continue;   // outside own span: missing data, excluded
        const base = (state.seqs[i].seq[pos] || '-').toUpperCase();
        const ch = (base === '-' || base === '.') ? '-' : base;    // internal gap: a real state, counted
        counts[ch] = (counts[ch] || 0) + 1;
        covered++;
    }
    const diffCount = covered > 0 ? covered - Math.max(...Object.values(counts)) : 0;
    // column is "variable" if diffCount clears the threshold
}
```

This is a strictly better foundation for a per-column "dominant pattern +
coverage" primitive than what `block-mask.js`/`block_schematic.py`
currently do (GAP is always excluded regardless of whether it's terminal
or internal; coverage is judged against the wrong denominator — see bugs
below). **The next implementation should call this same span-based
coverage logic (or a shared extraction of it) instead of re-deriving gap
handling from scratch.**

The threshold UI next to it (manual.html §5.2.1) is *also* directly
relevant prior art for the "minimum block size" knob question: it offers
**both** a percentage mode and an absolute-**count** mode, with documented,
concrete guidance on when each fails —

> Percentage mode also has a related blind spot on real alignments: a
> region can be biologically highly variable while spreading that
> variation across many neighbouring columns, each affecting only a
> handful of sequences — staggered, independent insertions in a repeat
> family are a common example — so no single column ever reaches even a
> modest percentage threshold, and the whole region gets hidden as if it
> were conserved. Switch to count mode and set it to 1 ...

This is *the same failure mode* as `ROW_MIN_GROUP` (a fixed group-size
floor that a real-but-small subgroup, e.g. 5 of 20 copies, can fall just
short of) and as the zone-width-relative coverage bug. ViewAlign's own
answer — expose both a percentage and an absolute-count control, let the
user switch, and document which to reach for when — is a validated UX
pattern in this exact app and should be reused rather than re-invented for
the block-mask's own thresholds.

## Bugs found and fixed/open this session (for context, not to re-litigate)

1. **Fixed.** Overlay row query matched ViewAlign's own displayed Consensus
   line (`data-seq-index="-1"`, same attribute as real rows) — excluded via
   `:not(.consensus-line)`.
2. **Fixed.** `row_partition_for_window`'s coverage requirement was
   "half the window's width," not "half of what this row actually has
   there" — broke completely on wide zones with strong per-copy length
   variation (a realistic flank). Changed to be relative to each row's own
   real-base count in the span.
3. **Open — this is the one the above research is for.** Using an
   arbitrary member row as "the reference" when no row is named
   "consensus" is unsound whenever that row's own gap pattern isn't
   representative. Confirmed concretely on `mosaic_subset.aln.fa`: the
   picked reference (`seq00`) happens to be one of the 5 tail-sharing
   copies, so its own real-base extent already reaches into what is
   structurally the flank for the other 14 rows, so "the element" (defined
   as wherever the reference has real bases) silently swallows the whole
   zone. A first fix attempt — a single global per-column majority-vote
   consensus across ALL rows — was tried and reverted: with ~50 rows,
   almost every column gets ≥3 real votes from *somewhere*, so the
   synthetic consensus has no natural edge and its "element" span became
   the *entire* alignment on the real `oma_SINE16b` fixture. The fix needs
   to come from the biclustering reframing above (there should be no
   single "reference row" concept at all in the final design), not from a
   better way to pick one row.

## Proposed shape for the next implementation (not yet built)

Split-and-merge biclustering over the alignment matrix, no reference row:

1. **Coherence/coverage primitive**: reuse (or factor out into a shared
   function callable from both `script.js` and `block-mask.js`) the
   `_computeVarSites` span-based logic — per row, its own `[first,last]`
   real-base span; per column *restricted to a candidate row set*, only
   rows whose span covers that column count toward the dominant-pattern
   tally; internal gaps count as a real state, out-of-span positions are
   excluded, not defaulted.
2. **Recursive split**: start with one block = (all rows, all columns).
   Score coherence directly on the block's own rows/columns (no external
   reference) — e.g. mean pairwise agreement using the coverage primitive
   above, or an adapted mean-squared-residue analog for categorical data.
   If below threshold, evaluate candidate splits along BOTH axes (a column
   position where the dominant pattern changes; a row bipartition where
   two distinct patterns exist) and take whichever split improves
   coherence the most. Recurse on each half.
3. **Stop condition**: a single principled pair of knobs — minimum block
   size (offer both a row-count-fraction mode and an absolute-count mode,
   mirroring the Variable-Sites threshold control exactly, since it's
   already a validated pattern in this app for the identical class of
   problem) and a minimum coherence-improvement-per-split (to avoid
   fragmenting on noise).
4. **Merge pass**: adjacent leaf blocks with the same row membership and
   statistically indistinguishable patterns get reunited into one wider
   rectangle — this replaces the current ad hoc "squint absorb," which
   only ever merges full-height blocks and never touches row-split ones.
5. Simple repeat detection (tandem repeats in the consensus) and
   decay-slope promotion (declining identity trend) stay as they are —
   they're independent, already-working overlays on top of whichever
   blocks the biclustering step produces, not part of the row/column
   symmetry problem.

## Open questions for whoever implements this next

- What coherence score to use for categorical (base-identity) data —
  a direct categorical analog of mean-squared-residue, or a simpler
  agreement-fraction score? Worth a literature check on categorical/
  binary biclustering specifically (Cheng-Church is for continuous
  expression values) before choosing.
- Should the minimum-block-size knob default to count mode or percentage
  mode? The Variable-Sites precedent in this app defaults to percentage
  but documents count mode as the fix for exactly the small-subgroup blind
  spot — the block-mask use case may want count as the default instead,
  since "how many copies share this variant" is usually the more natural
  question than "what fraction."
- Performance: greedy Cheng-Church-style node deletion is O(n) per removal
  decision recomputed over the remaining matrix — need to check this stays
  fast enough for alignments in the hundreds-of-rows, thousand-plus-column
  range this tool actually sees, or whether a coarser/sampled scoring pass
  is needed first.
