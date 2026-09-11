# Block-mask test sets

Small alignments for exercising the 2D block mask and related features by
hand in the real viewer. Each was generated as **raw, unaligned** sequences
(`reference/make_test_sets.py`) with real indels and per-copy length
variation (not just substitutions), then aligned with the app's own
`realignAll()` (real `mafft-wasm`, the same engine ViewAlign uses) — not
hand-glued gaps. This matters: an earlier fixture (`oma_SINE16b.aln.fa`,
still used by `tests/blockmask/parity.js`, untouched here) was assembled by
splicing real per-copy flank bases onto a separately-aligned core, and its
ends looked ragged compared to what a genuine realignment finds.

| file | rows | designed to show |
|---|---|---|
| `clean_core.aln.fa` | 16 | baseline: one conserved core, independent (non-homologous) flanks — clean CONSERVATIVE + DIVERGENT, nothing else |
| `mosaic_subset.aln.fa` | 20 | a right-side tail shared by only 5 of 20 copies — MOSAIC / row-split at finer squint presets (V5) |
| `decay_slope.aln.fa` | 18 | a real shared flank with per-copy mutation load increasing across the set — graded DECAY_SLOPE, no clean boundary |
| `simple_repeat.aln.fa` | 16 | an embedded tandem repeat run inside the core — SIMPLE_REPEAT |
| `real_homologous_ends.aln.fa` | 16 | **both flanks are real shared ancestral sequence**, each copy independently trimmed/mutated — the direct case for "flanks look ragged until you actually realign" |
| `kitchen_sink.aln.fa` | 24 | composite of several of the above zones in one alignment, for looking at the diagram + block mask together |
| `oma_SINE16b_realigned.aln.fa` | 50 | the real `oma_SINE16b` candidate, degapped and freshly realigned end-to-end (not spliced) — a genuine MOSAIC block emerges on the left flank (cols ~487-563) that the older spliced fixture never surfaced |

To try one: open ViewAlign, load the file (paste or `?url=`), Clustering
panel → 2D block mask → Show mask. `reference/make_test_sets.py` regenerates
the raw (pre-alignment) sequences if you want to tweak parameters.
