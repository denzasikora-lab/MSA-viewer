# Example alignments

These files are served with the GitHub Pages app, so a `?url=` link can open them in one click.

## SVK SINE, four subfamilies

`svk_k4.fa` — 40 DNA sequences × 231 columns, 10 copies each of groups K1–K4. Conserved core, diagnostic SNPs, and ragged poly-A tails.

**Open in the viewer:**
https://toki-bio.github.io/MSA-viewer/?url=https://toki-bio.github.io/MSA-viewer/examples/svk_k4.fa&title=SVK%20SINE%20(K1–K4)

Things to try: **Shade**, **Clustering → Cluster Now**, **Colour Names**, **Display → Variable sites only**, **Consensus**, tree from selected rows.

## Synthetic set

`synthetic/` holds a 6×111 coding alignment in FASTA, Clustal, PHYLIP (sequential and interleaved), NEXUS, Stockholm, and MSF, plus a GenBank record, a protein translation, a dot-plot pair, and SAM/BAM reads. See `synthetic/README.md` for which row carries the synonymous change, the stop, the frameshift, and the restriction sites.

## Input-format edge cases

`compat/` holds the synthetic alignment written 20 other ways, plus BAM and CRAM files renamed so only their content identifies them: CRLF, CR-only and byte-order-mark files; wrapped, lowercase, RNA and IUPAC FASTA; Clustal Omega and MUSCLE headers with residue counts; strict and relaxed PHYLIP; NEXUS with comments, quoted names, TAXA and TREES blocks; annotated interleaved Stockholm; GCG MSF with `~` gaps; a two-record GenBank file; gzip; and an EMBL file that should be refused. See `compat/README.md`.

## Real-world files

`real/` holds 42 files written by other programs and databases (Biopython, pysam and htslib test data; Pfam, Rfam and NCBI records), each with its source and licence, and the answer an independent parser gives. See `real/README.md`.

`node tests/compat/run.js` opens every file in `synthetic/`, `compat/` and `real/` in headless Chrome and checks what the viewer loads against those answers.
