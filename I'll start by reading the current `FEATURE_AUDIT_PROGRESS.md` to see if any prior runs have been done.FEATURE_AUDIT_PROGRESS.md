# Feature inventory audit progress

## Done
- Input & Format Support section audited and corrected (commit pending)

## Current phase
in progress - next section is "Visualization & Rendering"

## Corrections made
1. **8-format → 9-format detection**: Document claimed 8 formats (FASTA, MSF, Clustal, PHYLIP, NEXUS, Stockholm, SAM, BAM/CRAM) but code supports 9 (adds GenBank via `parseGenBank()`). Also, CRAM is not supported anywhere in the codebase. Updated to list 9 formats including GenBank, removed CRAM. Also corrected "No file extension guessing" since BAM uses extension detection (`.bam`/`.sam`).
2. **CIGAR operations count**: Document claimed "All 11 CIGAR operations (M, I, D, N, S, H, P, =, X, B, soft-clip)" but there are only 9 standard CIGAR operations (M, I, D, N, S, H, P, =, X). 'B' is not a CIGAR operation, and "soft-clip" is the S operation (already listed). Corrected to "All 9 standard CIGAR operations."
3. **BAM/CRAM server pipeline**: Document claimed "POST `/api/bam2sam` runs `samtools view` server-side" but BAM is decompressed entirely client-side via `BamParser.decompressBAM()` using the browser's DecompressionStream API. No `/api/bam2sam` endpoint exists. CRAM is not supported. Corrected to describe actual client-side BAM decompression.
4. **URL parameter name**: Document claimed `?file=https://...` but the actual parameter is `?url=`. Also added `?data=` and `?snapshot=` parameters that exist in the code but were not documented. Fixed "ViewAlign" typo to "MSA viewer" in the novelty claim.
5. **Supplementary alignment filtering**: Document mentioned only secondary (0x100) and unmapped (0x4) filtering, but code filters `0x904` which also includes supplementary alignments (0x800). Added this to the description.

## Claims confirmed accurate
- **Recent files history**: `_historyManager` uses localStorage, stores text with 100KB cap (`substring(0, 100000)`), adjustable size 1-50, one-click reload, survives browser restarts. All claims accurate.
- **Pileup majority-rule consensus**: `parseSamToAlignment()` builds pileup and computes majority-rule consensus from mapped reads. Accurate.

## Needs human decision
(none)

## Notes for the next run
- **Compact/Reads calibration confirmed**: The "Compact mode" section (in Visualization & Rendering) is marked "*removed, may return*" but the comparison table says "Compact reads: ✅ IGV-style". The actual code has "Reads" mode (`modeReads` radio in index.html, `renderReadsAlignment()` in script.js) with IGV-style track packing (`assignReadTracks()`), SVG bars, mismatch coloring, soft-clip display, insertion ticks, deletion gaps, click-to-highlight, hover tooltips. This is NOT removed — it was renamed from "Compact" to "Reads". Must fix the "Compact mode" section AND the comparison table when reaching those sections.
- **GenBank format**: Code has `parseGenBank()` which parses LOCUS, DEFINITION, ACCESSION, ORGANISM, FEATURES, and ORIGIN blocks. This was not mentioned at all in the document's format list. Now added.
- **`?data=` and `?snapshot=` URL parameters**: Code supports base64-encoded inline data (`?data=`) and inline snapshots (`?snapshot=`) in addition to `?url=` and `?snapshotFile=`. Now documented.
- Next section to audit: "## 🖥️ Visualization & Rendering" — includes the Compact/Reads mode contradiction that must be resolved.
