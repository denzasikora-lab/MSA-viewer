# ViewAlign — Expanded Feature Inventory

> Supplementary material for the Bioinformatics Application Note.  
> Each feature describes **what it does** mechanically, not what it's called.  
> "Why it's novel" explains the gap in existing tools.

---

## 📥 Input & Format Support

### 9-format automatic detection
Load any of FASTA, MSF, Clustal, PHYLIP, NEXUS, Stockholm, SAM, BAM, or GenBank. Detection inspects content — `@HD`/`@SQ` headers for SAM, `CLUSTAL`/`MUSCLE` keywords for Clustal, `# STOCKHOLM 1.0` for Stockholm, `#NEXUS` for NEXUS, `MSF:` block for MSF, `nSeqs length` first-line pattern for PHYLIP, `LOCUS` header for GenBank. BAM is detected by file extension. No CRAM support.

**Why novel:** No other browser-based viewer accepts SAM, BAM, Stockholm, NEXUS, or GenBank. No desktop viewer auto-detects all 9 from content.

### CIGAR expansion for SAM
9 CIGAR operations (M, I, D, N, S, H, P, =, X) expanded to gapped nucleotide alignment via `_expandCigar()`. Pileup majority-rule consensus computed from mapped reads as the reference sequence. Secondary (flag 0x100), supplementary (flag 0x800), and unmapped (flag 0x4) reads automatically filtered.

**Why novel:** Full SAM specification support — not just M/I/D approximation. Pileup consensus eliminates need for a separate reference file.

### Client-side BAM parsing
`BamParser.decompressBAM()` parses BGZF-compressed BAM files entirely in the browser — no server round-trip. `parseBAMHeader()` and `parseBAMRecords()` extract reads directly from the binary format.

**Why novel:** NGS file inspection without a server or CLI. Unique among web viewers.

### Recent files history
localStorage-backed panel. Stores metadata + full alignment text (100 KB cap per entry). Adjustable size 1–50. One-click reload of any past file, including clipboard pastes. Survives browser restarts.

**Why novel:** Alignments persist across sessions without a server or database. Most viewers forget everything on tab close.

### URL parameter loading
`?url=https://...` auto-loads a remote alignment. `?data=...` loads inline base64-encoded alignment text. `?snapshot=...` / `?snapshotFile=https://...` auto-restore a full viewer state (inline or remote). `?title=...` sets a custom page title. Shareable links encode both data and display.

**Why novel:** Direct sharing of an alignment + its exact visual configuration with one URL. No other MSA viewer supports state-serialized URL loading.

---

## 🖥️ Visualization & Rendering

### 4 interchangeable view modes
**Full** (continuous scroll), **Block** (configurable-width wrapped blocks with repeating labels), **Canvas** (viewport-culled 2D canvas), **Reads** (IGV-style read tracks for mapped SAM/BAM data). Switch modes without reloading or reformatting. Variable Sites Only is a cross-mode overlay (checkbox), not a separate mode.

**Why novel:** Most viewers offer 1–2 modes. Four modes serve distinct workflows — editing (Full), publication inspection (Block), large alignments (Canvas), and NGS reads (Reads). Variable Sites Only adds variant scanning to any mode.

### Canvas renderer with automatic activation
Canvas 2D context with viewport culling. Draws only rows and columns visible in the viewport per frame — no per-residue DOM nodes. Activates automatically when the alignment exceeds 5,000,000 total residues with a status message and user override option. Mouse wheel + click-drag panning.

**Why novel:** Handles alignments that crash pure-DOM viewers. Auto-activation removes the performance decision from the user — the tool adapts.

### Reads mode (IGV-style read packing)
SVG-based greedy track assignment via `assignReadTracks()`. Each read is a horizontal bar with start/end cap marks. Mismatch positions colored red. Soft-clip extensions shown as dashed lighter-fill segments. Deletion gaps rendered as grey segments. Insertion positions marked with orange ticks. A "Show bases" toggle switches between diffs-only mode (mismatches only) and full base coloring. Click a read to highlight it and display its CIGAR, position, and MAPQ in the status line.

**Why novel:** NGS read visualization inside a general MSA tool — not a separate application. Track packing, soft-clip display, and per-base mismatch coloring in a browser-based alignment viewer.

### Cross-mode Highlight Diffs + Variable Sites Only
Conserved-column set computed once from the alignment. Highlight Diffs dims fully-conserved columns to 40% opacity across all view modes. Variable Sites Only hides them entirely. Both consume the same computation.

**Why novel:** Two cross-mode overlays sharing one conserved-set computation. Most viewers either lack this or implement it independently per mode.

---

## 🎨 Sequence Colouring System

This is not a single feature — it's a complete colour assignment infrastructure with multiple entry points, all tracked and reversible.

### Auto-colour by name similarity
`clusterByName()` normalizes sequence headers to first N configurable characters. Groups identical normalized keys into guaranteed-same-colour buckets. Optionally merges near-identical keys via Levenshtein distance with configurable sensitivity (0 = permissive, 10 = strict). Two rendering modes:
- **Discrete:** maximally-separated ColorBrewer/Tablaeu palette with golden-ratio hue distribution for >12 clusters. Every cluster gets a distinct colour.
- **Gradient:** HSL shading within clusters — identical normalized names get identical hue, then brightness varies.

**Why novel:** Guarantees identical-prefix sequences always share the same colour. The sensitivity slider bridges exact-match grouping and fuzzy taxonomic grouping. No other viewer has this.

### Pattern-based colouring
Colour sequences whose names match a regular expression. `applyPatternColour()` tests each sequence header against a user-supplied regex. All matching names assigned the colour in one operation. Tagged "Pattern" in colour history.

**Why novel:** Regex-based group assignment — colour all "Homo_sapiens" green, "Mus_musculus" blue, etc. in one step. Complements the name-similarity clustering for explicit taxonomic grouping.

### Cluster-based colouring
After running SINEClusterer, assign persistent colours to sequences by cluster membership. A "Highlight in alignment" button in the results panel highlights all member sequences. Colour survives all edits.

**Why novel:** Visual validation of algorithmic clustering — outliers are immediately obvious against colour-uniform groups.

### Colour history inspector
`recordColorHistory()` logs every assignment with timestamp and method tag (Pattern, Auto-Similarity). `showColorHistory()` renders an interactive panel showing who got what colour and how. Not a cosmetic feature — it's an audit trail for reproducible figure preparation.

**Why novel:** Colouring decisions become traceable. No other viewer tracks the provenance of colour assignments.

### Copy by colour
`copySequencesByColor(colour, ungapped, asFasta)` — one click exports all sequences sharing a colour. Gapped or ungapped. Pipeline: colour taxonomic groups → copy one group to clipboard → paste into downstream tool.

**Why novel:** Colour becomes a selection mechanism, not just decoration. Transforms the colouring system into a data export pipeline.

### Group/sort by colour
- **Group coloured at top:** `groupColoredSequencesAtTop()` — all coloured sequences move above uncoloured ones. One-click visual organization.
- **Sort by colour:** `sortSequencesByColor()` — orders by colour group, maintaining within-group order. Coloured sequences first, uncoloured at bottom.

**Why novel:** Colour assignments become physical row-ordering directives. No drag-and-drop needed for batch reorganization.

---

## ✂️ Editing Operations

### GeneDoc-style residue editor
Edit mode toggles per-residue keyboard input. Click a residue, type the replacement. Typing `-` or `.` replaces the current residue with a gap character at that position (does not insert a gap column). The edited span's shading updates immediately using cached conservation data; full conservation recomputation and gapless position cache updates happen on the next render. A separate "Live conservation" toggle enables real-time conservation recomputation during Move/Slide drag operations.

**Why novel:** Browser-based MSA editing is rare. MSAViewer (Yachdav 2016) has no editing mode. Per-keystroke span updates with cached conservation shading, plus a live-conservation toggle for drag operations, have no equivalent in other browser-based viewers.

### Full undo/redo with visual dropdown
Every operation — row deletion, duplication, reverse-complement, column deletion, gap insertion, residue typing, block realignment, degapping, replace-with-consensus — pushes to an undo stack. TSD marking with lowercase style also pushes to the main stack; colour and bold TSD marking use a separate undo mechanism. The dropdown shows operation names in reverse chronological order (most recent first); click any to jump to that state. Not linear — random-access undo.

**Why novel:** Random-access undo stack with named operations. Most viewers offer Ctrl+Z only. The dropdown makes complex editing explorable.

### Drag-and-drop row reordering
Click-drag sequence names to reorder. Visual insertion indicator during drag. Works with Ctrl+Click multi-selection — drag moves all selected rows as a group.

### Three sort operations
- **Name (A→Z):** alphabetical by sequence header
- **Length (descending):** by gapless residue count
- **Similarity to first:** pairwise identity against the first sequence, descending

**Why novel:** Three sort criteria in one dropdown. Most viewers offer none or one.

### Save / Load sequence order
- **Export (Exp):** serializes the current sequence order as a JSON file (`{version, exported, count, order}`). Downloadable with a timestamped filename.
- **Import (Imp):** file-picker opens a `.json` order file. Sequences present in both the file and the alignment are reordered to match; sequences missing from the file are appended at the bottom; extra entries in the file are reported but ignored. Undoable in a single step.

**Why novel:** Decouples sequence ordering from the alignment file. Reorder once in the viewer, export the order, and reapply it after reloading data — or share orders between collaborators. No other viewer offers a portable order format.

### Replace selected with consensus
Select N sequences → one click computes their majority-rule consensus → deletes the N sequences → inserts a single consensus row named `cons_seqX-Y` at the position of the first selected sequence. Reduces alignment size while preserving subfamily signal. Tracked in undo — reversible.

**Why novel:** Select→compress→insert in one operation. This directly supports the clustering workflow: identify a subfamily → replace its members with the subfamily consensus for cleaner downstream analysis. No other viewer offers this.

### Insert group consensus
Same consensus computation as replace, but inserts the consensus row below the selected group without deleting the originals. Uses the global consensus threshold and minimum coverage settings.

**Why novel:** Consensus as an annotation layer over the original sequences — not a replacement. The threshold and coverage minimum are shared with the global consensus controls, ensuring consistency between the displayed consensus line and inserted group consensuses.

### Block degapping (two directions)
Select a continuous column block → `degapSelectedBlock('left'|'right')` removes gaps from the block, aligns residues to the left or right, then **removes columns that became entirely gap**. Gap-padding direction is configurable. Tracked in undo.

**Why novel:** Two operations in one — degap + column cleanup. The "remove all-gap columns" step is critical: without it, degapping a block leaves a trail of empty columns. No other editor handles this automatically.

### Block realignment (Ctrl+Shift+R)
Select a column range → the viewer extracts the block from all sequences, de-gaps each, sends to MAFFT for realignment, splices the re-aligned block back into each sequence at the exact original position. Adjacent regions untouched. If MAFFT introduces gaps, all sequences padded to the same new block width.

**Why novel:** Fixes local misalignments without global realignment. The block extraction→reinsertion mechanism preserves the rest of the alignment byte-for-byte.

### SeqEdit bulk transformations
Six operations on selected sequences: degap, reverse, complement, reverse-complement, uppercase, lowercase. Optional length normalization pads all outputs to the same length. All tracked in undo.

**Why novel:** Bulk sequence-level transformations in a viewer — otherwise you'd write a script.

### Add sequences with consensus profile merging
Two options for adding new sequences: **Just Add** appends sequences padded with gaps; when "Align to consensus" is checked, each new sequence is pairwise-aligned against the existing alignment's consensus via MAFFT, and `_mergeSequenceIntoConsensusProfile()` tracks insertion slots per consensus position to rebuild the profile with dynamically added columns. **Add & Align** performs a full MAFFT realignment of all sequences (existing + new) together. In both cases the alignment grows dynamically — new insertion columns are inserted at the correct positions in all existing sequences.

**Why novel:** Grow an alignment without rebuilding it from scratch. The slot-tracking profile merging is a non-trivial algorithm — it preserves the consensus coordinate space while accommodating new insertions.

### Reorder by guide tree
`_reorderByGuideTree()` builds 6-mer frequency vectors for each sequence, computes pairwise k-mer Jaccard distances, constructs a UPGMA tree, and extracts a leaf ordering. At each UPGMA junction, tries **all 4 orientations** of the two subtrees (A+B, A+B', A'+B, A'+B') and picks the one with minimum adjacent-leaf distance.

**Why novel:** Optimal leaf ordering, not just a tree traversal. The orientation search at each junction ensures sequences that are close in k-mer space appear adjacent in the display.

---

## 🔬 Analysis Tools

### Codon analysis (MACSE-inspired)
Activates on nucleotide alignments of any length ≥ 3 (gapped CDS alignments are often not multiples of 3). N nucleotides colour-coded by codon position: blue=1st, green=2nd, orange=3rd. In-frame stop codons: red background, white bold text. Frameshift-inducing indels: wavy red underline. Substitutions classified relative to a reference sequence: synonymous (green underline) vs. non-synonymous (double red underline). Translated amino acid track displayed below each sequence.

**Why novel:** First browser-based MACSE-style codon viewer. 15 genetic codes (NCBI tables 1–6, 9–14, 16, 21, 22) — vertebrate/invertebrate/yeast/ascidian mitochondrial, ciliate/euplotid nuclear, and 9 others. Only differences from Standard stored; full table built by merge. Dynamic switching recalculates stop codons, syn/non-syn labels, and AA translations.

### Position-pattern clustering (SINEClusterer)
400-line algorithm for subfamily detection. At each alignment column, groups sequences by shared nucleotide. Collects candidate groups meeting size and quality thresholds. Fuzzy-merges near-identical groups (Jaccard ≥ 90%, size difference ≤ 5). Scores by feature quality: perfect-unique (all members share the base, zero outside) = 3, near-perfect (≥80% match) = 2, majority = 1.5, imperfect (passes quality threshold) = 1. Prunes outliers matching <30% of cluster features (or <2 matches for groups with ≤5 features). Iterates with progressive threshold relaxation (minimum perfect features decay from 5 to 1 over 10 iterations at UI defaults). Gap characters and monomorphic columns (>80% one base) filtered at the pattern collection stage. Bounding region trimming via sliding-window gap analysis excludes ragged ends. Configurable quality tiers (small <11 seqs at 80%, medium 11–19 at 70%, large ≥20 at 60%) with adjustable breakpoints. Upper bound prevents degenerate mega-clusters (cap at 50% of available sequences).

**Why novel:** Purpose-built for TE subfamily annotation. The only comparable tool is command-line SubFam. No other web or desktop viewer offers this workflow. The combination of gap filtering, monomorphic-column skipping, fuzzy merging, outlier pruning, and progressive relaxation is a complete subfamily detection pipeline, not just a clustering library.

### Cluster presets + colour by cluster
Save/restore parameter configurations as named presets. After clustering, assign persistent colours to sequences by cluster membership. Hover a cluster row to highlight all members in the alignment. Diagnostic mutation tables show perfect vs. imperfect features per cluster.

**Why novel:** Reproducible clustering across TE families. Colour-as-validation makes cluster quality instantly visual.

### Dot plot with region detection
Self-comparison or pairwise. Adjustable window (1–61, odd), identity threshold (0–100%), context radius (5–100 bp), RevComp axis B for inverted repeats. Region detector finds top 30 diagonal runs and presents them in a navigable sidebar. Click any region to scroll the alignment to that position. Hover shows aligned sequence context with mismatch highlighting. Copy Region exports the hovered region as FASTA. Export as PNG or SVG.

**Why novel:** Region detector + sidebar navigation bridges dot plot exploration and alignment inspection. No other viewer connects these — you see a dot, you click it, you're looking at the aligned sequences. Copy Region turns exploratory browsing into data extraction.

### Repeat & TSD Finder with undo marking
Tandem repeat detection with configurable minimum length and mismatch tolerance (minimum copy number fixed at ≥2). TSD detection with flanking window, minimum length, maximum mismatches. Found TSD pairs can be **marked** in the alignment using colour, bold, or lowercase residue styles. Marking is tracked in a dedicated undo (separate from the main stack for colour/bold; lowercase uses the main undo stack) — inspect, mark, revert if wrong. Separate from the repeat search results.

**Why novel:** Non-destructive TSD annotation with undo. Mark→inspect→undo workflow lets you try different parameter settings without polluting the alignment.

### UPGMA tree with optimal leaf ordering
Pairwise identity distances → UPGMA clustering with orientation-optimized leaf ordering → Newick output with branch lengths → .nwk download → text tree visualization.

### Multi-mode consensus engine
Two modes: **Plurity** (strict nucleotide — normal bases only, A/C/G/T priority, U→T normalization) and **Ambiguous** (IUPAC codes for multi-base positions). Independent **threshold** (frequency of majority base) and **coverage minimum** (fraction of non-gap sequences required). **Fallback mode**: gap or keep-best when no base meets threshold. Used by the consensus line, group consensus, replace-with-consensus, and SAM pileup consensus — all sharing the same engine with per-use configurable parameters.

**Why novel:** Independent threshold + coverage minimum is not standard. Most tools have a single "consensus threshold." The coverage minimum prevents calling a consensus base from 2 sequences out of 100. The IUPAC ambiguous mode preserves positional uncertainty information that plurality mode discards.

### Regex motif search
Search bar accepts exact motifs (with configurable 0–10 mismatches) or JavaScript regular expressions via `.*` checkbox toggle. Regex matches evaluated against degapped sequences. Match-length-aware highlighting (longer matches get wider highlights).

**Why novel:** Regex mode with the `.*` toggle is a single-checkbox conversion from exact to pattern search. Match-length-aware highlighting is rare.

### Sequence search ("BLAST Search" menu item) — client-side JS engine, NOT real BLAST

**This is the single most confused feature in the codebase (2026-08-23: it silently broke, took hours to root-cause, see below) — read this whole section before touching any of the files it names.**

**What it actually is:** a 100% client-side, in-browser search engine. It is *not* NCBI BLAST — `blastn` is never invoked for this feature. Right-click a sequence → "BLAST Search" → pick databases → `runBlastSearch()` (`script.js`) posts a message to a Web Worker (`blast-worker.js`), which:
1. `fetch()`es the chosen database's raw FASTA file directly (served statically by `express.static('.')` in `server.js` — any file in the project root is fetchable by its own filename over HTTP)
2. caches it in IndexedDB so repeat searches skip re-downloading
3. parses it, builds an in-memory inverted k-mer index, and searches against it in pure JS

It is "local" only in the sense that nothing leaves your machine (browser ↔ your own `localhost:3000`) — not in the sense of using a locally-installed BLAST+ binary.

**The list of databases** comes from `GET /api/blast-db` (`fetchDatabases()` in `script.js`). Each entry **must** include a `url` field (e.g. `/SINEBase.nr95.fa`) — this is the only way the Worker knows what to fetch. **This field has no other purpose and no other consumer** — do not remove it during a refactor just because nothing seems to read it nearby.

**A completely separate, currently-unused feature lives in the same file:** `server.js`'s `POST /api/blast` and `POST /api/blast-all` routes *do* call real `blastn`/`makeblastdb`, if BLAST+ is actually installed and on PATH. **No UI element calls either route.** The `formatted`/`.nhr`-index-file checks in `GET /api/blast-db` exist only for this separate, dead code path — they have nothing to do with whether a database actually works in the search UI. Do not use "formatted: false" as a reason to hide a database from the picker; that gate was removed 2026-08-23 for exactly this reason (see incident below).

**Database management** (Click **+ Manage Databases**): a CRUD modal — file-picker to add a new FASTA (server writes it, attempts `makeblastdb` for the unused real-BLAST path, registers it in `blast_dbs.json`), or delete a database and its index files.

**Incident history (2026-08-23):** commit `1afb6da` ("Add GitHub Pages BLAST") introduced this feature with a *hardcoded* database array in `script.js`, every entry carrying a working `url`. A later commit, `c38abf2` ("Add save/load sequence order, dynamic BLAST database management UI"), replaced that hardcoded array with the current server-fetched `fetchDatabases()` — and didn't carry the `url` field over. The bug was silent for an unknown period: the picker still listed databases (gated only on file existence/`formatted`, neither of which involves `url`), so nothing looked wrong until someone actually ran a search, which failed with `HTTP 404 fetching undefined` — a message that gives no hint that `url` is the missing piece. Fixed 2026-08-23 (both `server.js`'s response and `script.js`'s list now include `url` again), plus a loud explicit check added in `runBlastSearch()` so a future regression fails immediately with a named-database error instead of a cryptic worker-internal 404.

**Algorithm rewrite (2026-08-23), fixed every known limitation except protein support:**
- **Affine-gap Smith-Waterman (Gotoh), EMBOSS `water`-equivalent scoring** — replaced the previous linear-gap SW and its blastn-style scores (match +2/mismatch -3/gap-open 5/gap-extend 2) with EDNAFULL-equivalent scoring (match +5/mismatch -4/gapopen 10.0/gapextend 0.5), matching the EMBOSS `water` reference tool's real defaults rather than an approximation. Because `gapextend` is fractional, the DP score matrices are `Float64Array`, not `Int32Array` — an integer-typed matrix would silently truncate every gap-extension penalty to 0 (caught during integration, verified with a hand-computed test case before/after).
- **No silent length truncation.** The old engine hard-truncated every query and subject to 600bp, so a real hit deep inside a long database entry was invisible. Now the full sequence is indexed; a k-mer-seeded diagonal anchors a small window around the true match location for the DP step, so performance stays bounded without losing hits past 600bp.
- **Real, size-aware E-values.** Previously hardcoded to 0. Now computed via a Karlin-Altschul lambda solved for this tool's own actual match/mismatch scores (not borrowed from blastn), with a documented empirical K approximation (K_APPROX = 0.11) — `water` itself reports no E-value at all (score/identity/similarity/gaps only); this is an add-on layer on top.
- **IUPAC ambiguity codes** (N, R, Y, ...) are excluded from k-mer seeding rather than silently mapped to 'A' (which could seed false matches through masked/ambiguous regions) — they're still scored as ordinary mismatches inside the DP step itself.
- Verified end-to-end: a Node-level correctness suite (exact hand-computed scores for perfect-match, single-mismatch, and fractional-gap-penalty cases) plus a real headless-Chrome run against a live 81-sequence alignment and all 4 bundled databases, confirming real decimal bit-scores, real E-values, and correctly-rendered gapped alignments in the actual results UI (not just the underlying function).
- EMBOSS's exact default values (EDNAFULL match/mismatch, gapopen/gapextend) were sourced from a language model's recollection of the EMBOSS documentation, not from reading an installed EMBOSS instance directly — treat as "fairly confident, not independently verified against the actual EMBOSS source/ACD files" if bit-for-bit parity with real `water` output ever matters.

**Selectable scoring presets (2026-08-23):** the engine is not locked to one scoring scheme — `SCORING_PRESETS` in `blast-worker.js` offers `water` (default, above), `ssearch36`, and `blastn`, chosen per-search via a `preset` field on the Worker's `search` message. All three share the identical Gotoh DP recurrence and the same Karlin-Altschul-lambda E-value approximation; only the match/mismatch/gap-cost constants differ.
- `ssearch36`'s match/mismatch (+5/-4) and gap penalties (open=12, extend=4) are now confirmed against the real FASTA36 source repo's own documentation (`github.com/wrpearson/fasta36` `doc/fasta_guide.tex`: "Gap open penalty ... -12 for DNA" / "Penalty per residue in a gap ... -4 for DNA ... A single residue gap costs f + g") — not from running the actual binary, but from its own stated defaults rather than a recalled guess. ssearch36's real significance method is still different in kind (shuffled-sequence Monte Carlo + extreme-value fitting, not a closed-form lambda/K) — not replicated here; this preset reuses the same closed-form approximation as `water`.
- `blastn`'s scoring (reward+2/penalty-3/gapopen5/gapextend2) is NCBI's well-established, high-confidence published default — no verification gap here.
- **Important naming caveat, researched 2026-08-23:** the `blastn` preset name refers ONLY to borrowed scoring numbers, not to real blastn's actual algorithm. Real blastn's seeding requires TWO word hits on the same diagonal within a window before attempting extension at all, then a greedy ungapped X-drop walk, then only a bounded gapped X-drop DP around whatever survives — never an unbounded full local Smith-Waterman. This file's k-mer-index-then-full-DP approach (any single shared k-mer seeds a candidate, then a full affine-gap DP runs over a window around the best diagonal) diverges from that on both the seeding rule and the extension mechanism, regardless of which scoring preset is active. Deliberately not rebuilt as a literal two-hit/X-drop pipeline (see `C:\work\glm-harness\tasks\viewalign-blastn-preset.md` and its output for the full research/reasoning) — that fidelity mainly matters if the goal is replicating real BLASTN mechanics specifically, which isn't this viewer's goal. If that's ever needed, it's a separate, larger build, not implied by this preset's name.

**Quantified before/after validation + speed optimization (2026-08-23):** the pre-rewrite engine (git commit `20a6d5e`) was pulled from history and run through the same simulated-data benchmark as the rewrite, for a real before/after comparison (previously only described, never measured):
- **The documented 600bp-truncation bug, quantified:** given a query and a subject with the true match starting 3000bp into a long contig, the pre-rewrite engine didn't just miss the hit — it silently reported a *wrong* one (57.0% identity, `hitStart=5`, aligned against unrelated filler sequence within its 600bp window) with no indication anything was wrong. The rewritten engine correctly found the real match (80.8% identity, `hitStart=3001`).
- **Performance cost of the fix, quantified:** on a simulated 5000-sequence database, the pre-rewrite engine's flat 600bp cap made it fast but wrong (~18ms); the initial rewrite was correct but slower (~557ms).
- **Speed optimization, round 1 (k-mer-count DP cap):** profiling found the real bottleneck wasn't k-mer seeding (~2ms) but running full O(window²) affine-gap DP on every one of up to 400 k-mer-surviving candidates. Capping the DP step to the top `MAX_FULL_DP=80` candidates by k-mer hit count (a signal already computed for free during seeding, requiring no new scoring pass) cut simulated search time to ~324ms (~40% faster) with zero recall loss (still 5/5 known true hits found) — verified against the same live 12,030-sequence database in a real browser, producing byte-identical scores/E-values/alignment to the pre-optimization run. An initial attempt at a fancier ungapped-diagonal pre-score was tried and discarded: it was actually a *worse* ranking signal than the already-free k-mer count, since a few real indels shift part of an alignment off its single best-voted diagonal and the ungapped comparison punished that almost as much as random noise, dropping 1-2 of 5 true hits in testing.
- **Speed optimization, round 2 (banded DP):** BWA-MEM/minimap2-style — restricts the DP to a band (half-width 32bp) around the seed-voted diagonal instead of every cell in the full window (orthogonal to the windowing itself: window picks the subject slice, band picks which cells inside it get computed). O(window²) → O(window·band). Real ~2.5-3x further speedup, verified with zero recall loss including a stress test across indel rates 2%-12% (banded and unbanded produce byte-identical scores at every rate). Delegated: researched via glm-5.2 (correctly ruled out minimizers as solving the wrong bottleneck for this DP-bound, short-query engine), implemented by Cline (glm-5.2 backend) in an isolated worktree.
- **Speed optimization, round 3 (Web Worker pool sharding):** shards the DP step (not seeding) across up to 4 Web Workers for near-linear multi-core speedup. First attempt (eager background priming of the whole pool) was found in real-browser testing to *regress* the common case — Web Workers share no memory, so priming 3 extra workers × 4 databases = 12 concurrent full index-builds competing with real foreground searches made a fresh session's first search take ~32.5s instead of ~15-18s — reverted before merging. Fixed version: priming is fully serial and only runs in genuine idle time between searches (never overlapping foreground work), growing organically per database as it's actually used. Verified: cold four-database first search, nowhere near the reverted attempt's ~32.5s regression; a repeat search after one ~15s idle gap reaches full 4-worker sharding (139ms, since IndexedDB caches the raw FASTA so subsequent workers only re-parse/re-index, not re-download); full ordered-signature correctness match (id/score/bitScore/identity/evalue/hitStart) between 1-worker and 4-worker execution on the live database.
  - **Correction (2026-08-23):** an initial single-run comparison claimed the cold path was "13.3s, at or better than the pre-sharding baseline" — a user's pushback ("i recall it was faster before") prompted re-verifying properly with a side-by-side pre-sharding checkout on a separate port, run 3-4× each. Result: cold-path timing is statistically indistinguishable between pre-sharding and current (both ranged ~12-17s across repeated runs) — normal run-to-run variance (likely OS disk-cache state), not a real difference. The correct, honest claim is "no regression on the cold path" (true, confirmed architecturally — cold path always uses exactly 1 worker in both versions), not "faster." The real, meaningful win from this round is the warm-path speedup after idle-time priming, not the cold path.

**Why novel:** BLAST-quality sequence search that runs entirely client-side, with zero backend search dependency — works even with no BLAST+ installed anywhere, which is also why it can run unmodified from GitHub Pages (no server at all). Database management from the browser without touching a CLI, registry persisted in `blast_dbs.json` so it survives restarts.

---

## 📤 Export & Publishing

### RTF export with per-residue conservation shading
Word-compatible document. Courier New 9pt monospace. Each residue's background colour matches the active conservation shading scheme. Scale ruler every 10 positions. Consensus line at top (after ruler, before sequences). Sequence names left-aligned. Opens directly in Microsoft Word.

**Why novel:** GeneDoc-style publication-quality alignment figures from a browser. No desktop software needed for the final figure.

### Two-mode SVG export
**Export view as SVG:** exactly what's visible on screen. **Export full alignment as SVG:** all columns as a single vector graphic. Both preserve colours, shading, and labels.

### Snapshot system with URL loading
Save complete viewer state as JSON: alignment data, colour assignments, search highlight history, column selections, view mode, zoom level, custom colours. Load via file picker or URL parameter (`?snapshotFile=`). Two download formats: `.json` (reloadable) and `.html` (standalone printable view).

**Why novel:** State serialization includes colour, search, and selection — not just the alignment. URL-loadable snapshots are shareable links to exact viewer states.

### Copy variants
- **Copy selected as FASTA** (gapped or ungapped)
- **Copy selected columns as FASTA** — exports a column range across all sequences
- **Copy alignment** — full alignment as FASTA
- **Copy consensus** — consensus sequence as FASTA
- **Copy by colour** — all sequences with a specific colour, gapped or ungapped
- **Copy tree Newick** — UPGMA output to clipboard

**Why novel:** Copy selected **columns** has no equivalent in any other viewer. It exports a structural element (column range) rather than a sequence element.

---

## 🆕 What's New to Bioinformatics (Novelty Spotlight)

1. **First browser-based MACSE-inspired codon viewer with 15 genetic codes** — syn/non-syn classification, frameshift detection, and stop codon highlighting respond to genetic code switching in real time.

2. **First browser-based SAM/BAM reader with full CIGAR expansion** — all 9 CIGAR operations, pileup consensus reference, IGV-style read track visualization. Bridges the NGS–MSA gap.

3. **First position-pattern subfamily clustering in any viewer** — SINEClusterer provides TE annotation in a visual environment. Gap filtering, monomorphic-column skipping, fuzzy merging, outlier pruning, progressive relaxation, and configurable quality tiers. No command line, no separate tool.

4. **Select→compress→insert consensus pipeline** — select N sequences → replace with their consensus in one click. Directly supports the clustering→consensus workflow for subfamily annotation. Reversible (undo). No other viewer offers this.

5. **Auto-colour by name similarity with n-gram Jaccard clustering** — guaranteed same-colour assignment for identical-prefix sequences. Configurable sensitivity for fuzzy taxonomic grouping. Two rendering modes (discrete + gradient). Colour history inspector tracks every assignment's provenance.

6. **Colour-as-selection-metadata** — copy by colour, group by colour, sort by colour. Colour assignments become a data organization and export pipeline, not just decoration.

7. **Canvas renderer with automatic threshold activation** — handles alignments 10× larger than DOM-based viewers. User doesn't configure performance — the tool detects and adapts.

8. **IGV-style read packing in a general MSA tool** — diffs-only mode with "Show bases" toggle, soft-clip display, deletion gaps, insertion ticks. NGS visualization without leaving the alignment viewer.

9. **Block realignment with in-place splicing** — fix a locally misaligned region without touching the rest. Block degapping with automatic column cleanup. Both tracked in undo.

10. **Guide tree reordering with optimal leaf ordering** — tries all 4 subtree orientations at each UPGMA junction to minimize adjacent-leaf distance. k-mer frequency vectors for fast distance computation.

11. **GeneDoc-style RTF export from a browser** — per-residue conservation shading in Word-compatible format. No desktop software for publication figures.

12. **Snapshot system with search + colour state** — URL-loadable saved states include colour assignments and search highlights, not just alignment data. Shareable links to exact viewer configurations.

13. **9-format automatic content detection** — FASTA, MSF, Clustal, PHYLIP, NEXUS, Stockholm, SAM, BAM, GenBank. No file extension guessing. More formats than any browser viewer.

14. **Save/load sequence order as portable JSON** — export current order to a file, reimport after reloading data. Decouples ordering from alignment content. Matches by header name, handles missing/extra entries gracefully.

15. **Browser-based BLAST database CRUD** — upload FASTA → `makeblastdb` on server → registered in `blast_dbs.json`. Delete databases with index file cleanup. All from the viewer modal — no server CLI needed.

16. **Zero-dependency vanilla JavaScript architecture** — 12,000 lines. No framework, no build step, no installation. Runs from GitHub Pages.

---

## 📊 Comparison: Browser-Based ViewAligns

| Feature | ViewAlign | MSAViewer (Yachdav) | JalviewJS | AliView* | IGV.js |
|---------|-----------|---------------------|-----------|----------|--------|
| **Formats** | 9 (auto-detect) | 1 (FASTA) | 5+ | 5+ | SAM/BAM |
| **View modes** | 4 | 1 | 2 | 2 | 1 |
| **Residue editing** | ✅ GeneDoc-style | ❌ | ❌ | ✅ | ❌ |
| **Codon analysis** | ✅ 15 codes | ❌ | ❌ | ❌ | ❌ |
| **Sequence clustering** | ✅ SINEClusterer | ❌ | ❌ | ❌ | ❌ |
| **Replace with consensus** | ✅ select→compress | ❌ | ❌ | ❌ | ❌ |
| **Auto-colour by name** | ✅ n-gram Jaccard | ❌ | ❌ | ❌ | ❌ |
| **Copy by colour** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reads mode** | ✅ IGV-style | ❌ | ❌ | ❌ | ✅ |
| **Canvas large-align** | ✅ auto threshold | ✅ fixed | ❌ | ✅ | ✅ |
| **Block realignment** | ✅ Ctrl+Shift+R | ❌ | ❌ | ❌ | ❌ |
| **Block degapping** | ✅ + column cleanup | ❌ | ❌ | ❌ | ❌ |
| **Guide tree reorder** | ✅ optimal leaf | ❌ | ❌ | ❌ | ❌ |
| **Dot plot** | ✅ region nav + copy | ❌ | ❌ | ❌ | ❌ |
| **RTF export** | ✅ GeneDoc-style | ❌ | ❌ | ❌ | ❌ |
| **Snapshot state** | ✅ colours + search | ❌ | ❌ | ❌ | ❌ |
| **Regex search** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Server** | BLAST+SSH+snapshots | ❌ | ❌ | ❌ | ❌ |
| **Dependencies** | None (vanilla JS) | BioJS | BioJS | Java app | JS module |

*\*AliView is a desktop Java application; its JS version is limited.*

---

*Prepared for Bioinformatics (Oxford) Application Note submission.*
*Corresponding author: [to be filled]*
