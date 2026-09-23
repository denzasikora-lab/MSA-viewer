# Synthetic test alignments

Small files for checking format detection, codon marks, dot plots, restriction sites, clustering, and read tracks. They are invented sequences, not biological data.

The alignment is 6 sequences by 111 columns. Columns 1–60 are a coding sequence (length divisible by 3). Columns 61–72 are a barcode that separates two groups of three. The rest is shared: a tandem `GATTACA`, its reverse complement `TGTAATC`, an EcoRI site, and a BamHI site.

| File | What to open it for |
|---|---|
| `synth_msa.fa` | FASTA. Codons, clustering, motifs, shading |
| `synth_msa.aln` | Clustal |
| `synth_msa.phy` | PHYLIP, sequential |
| `synth_msa.interleaved.phy` | PHYLIP, interleaved |
| `synth_msa.nex` | NEXUS |
| `synth_msa.sto` | Stockholm |
| `synth_msa.msf` | MSF |
| `synth_ref.gb` | GenBank flatfile of the reference, with a CDS feature on 1..60 |
| `synth_protein.fa` | The first three translations. `alpha_syn` matches `alpha_ref`. `alpha_mis` is glutamate where the others are alanine |
| `synth_dotplot.fa` | Two sequences. Compare them in the dot plot |
| `synth_reads.sam` | Drop this in. The viewer builds a pileup reference from the reads |
| `synth_reads.bam` | Same reads as BAM. Open `synth_ref.fa` (or `synth_ref.gb`) first, then the BAM; the reads pile onto that reference |
| `synth_ref.fa` | Ungapped reference. Open it before `synth_reads.bam`, or use it to build a CRAM |

## What you should see

Codon analysis, standard genetic code, frame 0 (the reference starts with ATG):

- `alpha_syn`: codon 3 is TTG instead of CTG. Both are leucine (synonymous).
- `alpha_mis`: codon 2 is GAA instead of GCA. Alanine to glutamate (non-synonymous).
- `beta_stop`: codon 10 is TAA, an in-frame stop. The reference codon there is TAC.
- `beta_fs`: a one-base gap at column 5. That is a frameshift.
- `beta_del`: codon 7 (GGC) is three gaps. The frame is preserved.

Clustering (Min size 3): `alpha_ref`, `alpha_syn`, and `alpha_mis` share columns 61–72 (`AAAAAACCCCCC`). The three `beta_` rows share `GGGGGGTTTTTT` there.

Dot plot, on any row of the MSA, self comparison, word size 6 or 7: two `GATTACA` copies. Both-strand comparison also hits `TGTAATC`. In `synth_dotplot.fa`, `seq_early` against `seq_late` puts the `ACGT` repeat on an off-diagonal.

Motif search: EcoRI `GAATTC` starts at column 97. BamHI `GGATCC` starts at column 103.

Reads in `synth_reads.sam`: two overlapping perfect reads, one mismatch at the non-synonymous site, one single-base deletion, one three-base insertion, and one reverse-strand read.

## CRAM

samtools is not required to read the SAM file. To make a CRAM for the server path:

```
samtools view -C -T synth_ref.fa -o synth_reads.cram synth_reads.bam
```
