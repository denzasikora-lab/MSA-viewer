# Input-format edge cases

Each file holds the same 6 × 111 alignment as `../synthetic/synth_msa.fa` (or a stated variant),
written the way a particular program or platform writes it. Open any file and compare it with that one alignment.
`expected.json` lists what the viewer should load from each file; `node tests/compat/run.js` checks all of them in headless Chrome.
Regenerate with `python scratch/build_compat_examples.py`.

| File | What it tests | Expected |
|---|---|---|
| `fasta_crlf.fa` | FASTA with Windows CRLF line endings | 6 rows × 111 columns |
| `fasta_cr_only.fa` | FASTA with classic Mac CR-only line endings | 6 rows × 111 columns |
| `fasta_bom.fa` | FASTA starting with a UTF-8 byte-order mark | 6 rows × 111 columns |
| `fasta_wrapped_lower_dots.fa` | FASTA wrapped at 30, lowercase, "." gaps, descriptions, blank lines | 6 rows × 111 columns; case is kept as written; "." gaps become "-" |
| `fasta_rna.fa` | RNA (U instead of T) | 6 rows × 111 columns |
| `fasta_iupac.fa` | IUPAC ambiguity codes N R Y K M S W B D H V | 6 rows × 111 columns |
| `fasta_unaligned.fa` | Unaligned FASTA: unequal lengths (111, 110, 108, 90) | 6 rows × 111 columns; the viewer warns and pads shorter rows with trailing gaps |
| `fasta_ncbi_headers_dup.fa` | NCBI-style pipe headers with spaces; last two headers identical | 6 rows × 111 columns; names are the first word of the header; duplicates are kept as separate rows |
| `fasta_gzip.fa.gz` | gzip-compressed FASTA (.fa.gz) | 6 rows × 111 columns |
| `clustal_omega_counts.aln` | Clustal Omega header, 50-column blocks, residue counts, conservation lines | 6 rows × 111 columns |
| `clustal_muscle_cr_only.aln` | MUSCLE-style Clustal header with classic Mac CR-only line endings | 6 rows × 111 columns |
| `phylip_relaxed_long_names.phy` | Relaxed PHYLIP, names longer than 10 characters | 6 rows × 111 columns |
| `phylip_strict_interleaved_spaced.phy` | Strict PHYLIP (10-character name field), interleaved, residues in groups of 10 | 6 rows × 111 columns; names are exactly 10 characters and touch the sequence |
| `phylip_bom.phy` | PHYLIP starting with a UTF-8 byte-order mark | 6 rows × 111 columns |
| `nexus_interleaved_taxa_trees.nex` | NEXUS with TAXA + CHARACTERS blocks, INTERLEAVE=YES, a [comment], and a trailing TREES block | 6 rows × 111 columns |
| `nexus_quoted_names_lowercase.nex` | NEXUS in lowercase keywords with single-quoted taxon names containing spaces | 6 rows × 111 columns; a quoted name is one name, spaces included |
| `stockholm_interleaved_annotated_bom.sto` | Stockholm, interleaved 50-column blocks, #=GS/#=GR/#=GC lines, "." gaps, UTF-8 BOM | 6 rows × 111 columns; annotation lines are not sequences; "." gaps become "-" |
| `msf_gcg_tilde_dot_gaps.msf` | GCG MSF with "PileUp" header, "~" and "." gaps, residues in groups of 10 | 6 rows × 111 columns; "~" and "." gaps become "-" |
| `genbank_two_records_join.gb` | Two GenBank records in one file; CDS locations use join() and complement() | 2 rows × 111 columns |
| `unsupported_embl.embl` | EMBL flatfile (not a supported format) | refused with a message; should be refused with a message, not loaded as garbage |
