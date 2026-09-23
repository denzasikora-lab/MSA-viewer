# Real-world input files

Files written by other programs and databases, downloaded on 2026-09-23 and kept byte-for-byte
(see `.gitattributes`) so a reviewer can check how ViewAlign reads files it did not write itself.

`expected.json` holds what an independent parser reads from each file: Biopython 1.85 for alignments,
GenBank and AB1; a few lines of plain Python for SAM (which bases belong at which reference position).
`node tests/compat/run.js` opens every file in headless Chrome through the real file picker and compares.
Regenerate the answers with `python scratch/build_real_expected.py`.

Reads files: open `pysam_*.sam` on their own. For `htslib_range.bam`, open `htslib_ce_CHROMOSOME_II.fa` first,
then the BAM (34 reads pile onto that reference). `htslib_colons.bam` has no reads; on its own it explains
that a BAM needs its reference first.

| File | Source | Licence | Viewer result |
|---|---|---|---|
| [`bp_310.ab1`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Abi/310.ab1) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (1 rows); 1 name(s) differ, e.g. "bp_310" vs "D11F" |
| [`bp_3730.ab1`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Abi/3730.ab1) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (1 rows); 1 name(s) differ, e.g. "bp_3730" vs "226032_C-ME-18_pCAGseqF" |
| [`bp_DOA_prot.msf`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/msf/DOA_prot.msf) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (12 rows) |
| [`bp_EU851978.gbk`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/GenBank/EU851978.gbk) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (1 rows); 1 name(s) differ, e.g. "EU851978" vs "EU851978.1" |
| [`bp_NC_005816.gb`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/GenBank/NC_005816.gb) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (1 rows); 1 name(s) differ, e.g. "NC_005816" vs "NC_005816.1" |
| [`bp_W_prot.msf`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/msf/W_prot.msf) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (11 rows) |
| [`bp_aster_pearson.pro`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Fasta/aster_pearson.pro) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (1 rows) |
| [`bp_bats.nex`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Nexus/bats.nex) | Biopython test suite | Biopython License / BSD 3-Clause | as expected |
| [`bp_clustalw.a2m`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Clustalw/clustalw.a2m) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (2 rows) |
| [`bp_clustalw.aln`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Clustalw/clustalw.aln) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (2 rows) |
| [`bp_codonposset.nex`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Nexus/codonposset.nex) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (2 rows) |
| [`bp_cor6_6.gb`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/GenBank/cor6_6.gb) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (6 rows); 6 name(s) differ, e.g. "ATCOR66M" vs "X55053.1" |
| [`bp_dups.fasta`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Fasta/dups.fasta) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (5 rows) |
| [`bp_example.sth`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Stockholm/example.sth) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (3 rows) |
| [`bp_f002`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Fasta/f002) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (3 rows) |
| [`bp_flowers.pro.gz`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Fasta/flowers.pro.gz) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (3 rows) |
| [`bp_funny.sth`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Stockholm/funny.sth) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (6 rows) |
| [`bp_hedgehog.aln`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Clustalw/hedgehog.aln) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (5 rows) |
| [`bp_horses.phy`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Phylip/horses.phy) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (10 rows) |
| [`bp_interlaced.phy`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Phylip/interlaced.phy) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (3 rows) |
| [`bp_interlaced2.phy`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Phylip/interlaced2.phy) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (4 rows) |
| [`bp_kalign.aln`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Clustalw/kalign.aln) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (2 rows) |
| [`bp_msaprobs.aln`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Clustalw/msaprobs.aln) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (8 rows) |
| [`bp_muscle.aln`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Clustalw/muscle.aln) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (3 rows) |
| [`bp_odd_consensus.aln`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Clustalw/odd_consensus.aln) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (2 rows) |
| [`bp_pfam2.seed.txt`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Stockholm/pfam2.seed.txt) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (3 rows) |
| [`bp_probcons.aln`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Clustalw/probcons.aln) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (5 rows) |
| [`bp_promals3d.aln`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Clustalw/promals3d.aln) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (20 rows) |
| [`bp_rfam2.seed.txt`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Stockholm/rfam2.seed.txt) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (13 rows) |
| [`bp_sequential.phy`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Phylip/sequential.phy) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (3 rows) |
| [`bp_sequential2.phy`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Phylip/sequential2.phy) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (4 rows) |
| [`bp_test_Nexus_input.nex`](https://github.com/biopython/biopython/tree/08fc09086afe/Tests/Nexus/test_Nexus_input.nex) | Biopython test suite | Biopython License / BSD 3-Clause | as expected (9 rows) |
| [`htslib_ce_CHROMOSOME_II.fa`](https://github.com/samtools/htslib/tree/d3cc9553d89d/test/ce.fa) | htslib test data | MIT/Expat | reference for `htslib_range.bam` (CHROMOSOME_II extracted from ce.fa) |
| [`htslib_colons.bam`](https://github.com/samtools/htslib/tree/d3cc9553d89d/test/colons.bam) | htslib test data | MIT/Expat | as expected |
| [`htslib_range.bam`](https://github.com/samtools/htslib/tree/d3cc9553d89d/test/range.bam) | htslib test data | MIT/Expat | as expected (1 rows) |
| [`ncbi_NC_012920_human_mito.gb`](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NC_012920.1&rettype=gbwithparts&retmode=text) | NCBI RefSeq via E-utilities | public (NCBI places no restrictions) | as expected (1 rows); 1 name(s) differ, e.g. "NC_012920" vs "NC_012920.1" |
| [`pfam_PF00046_seed.sto`](https://www.ebi.ac.uk/interpro/api/entry/pfam/PF00046/?annotation=alignment:seed) | Pfam seed via InterPro API | CC0 | as expected (136 rows) |
| [`pysam_ex1.fa`](https://github.com/pysam-developers/pysam/tree/ba2e6c124398/tests/pysam_data/ex1.fa) | pysam test data | MIT | as expected (2 rows) |
| [`pysam_ex3.sam`](https://github.com/pysam-developers/pysam/tree/ba2e6c124398/tests/pysam_data/ex3.sam) | pysam test data | MIT | as expected (4 rows) |
| [`pysam_example_reverse_complement.sam`](https://github.com/pysam-developers/pysam/tree/ba2e6c124398/tests/pysam_data/example_reverse_complement.sam) | pysam test data | MIT | as expected (3 rows) |
| [`pysam_softclip.sam`](https://github.com/pysam-developers/pysam/tree/ba2e6c124398/tests/pysam_data/softclip.sam) | pysam test data | MIT | as expected (4 rows) |
| [`pysam_test_mapped_unmapped.sam`](https://github.com/pysam-developers/pysam/tree/ba2e6c124398/tests/pysam_data/test_mapped_unmapped.sam) | pysam test data | MIT | as expected (6 rows) |
| [`rfam_RF00005_tRNA.sto`](https://rfam.org/family/RF00005/alignment/stockholm) | Rfam seed | CC0 | as expected (954 rows) |

Name differences in the last column are expected: the viewer names a GenBank record by LOCUS (without
the `.1` version) and an AB1 trace by its file name, where Biopython uses the accession or sample name.
