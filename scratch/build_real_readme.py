"""Write examples/real/README.md from tests/compat/report.json (run tests/compat/run.js first)."""
import json
import os

ROOT = os.path.join(os.path.dirname(__file__), '..')
report = {r['name']: r for r in json.load(open(os.path.join(ROOT, 'tests', 'compat', 'report.json'), encoding='utf-8')) if r['dir'] == 'real'}

BP = 'https://github.com/biopython/biopython/tree/08fc09086afe/Tests/'
PY = 'https://github.com/pysam-developers/pysam/tree/ba2e6c124398/tests/pysam_data/'
HT = 'https://github.com/samtools/htslib/tree/d3cc9553d89d/test/'
SOURCES = {
    'bp_': ('Biopython test suite', 'Biopython License / BSD 3-Clause'),
    'pysam_': ('pysam test data', 'MIT'),
    'htslib_': ('htslib test data', 'MIT/Expat'),
    'pfam_': ('Pfam seed via InterPro API', 'CC0'),
    'rfam_': ('Rfam seed', 'CC0'),
    'ncbi_': ('NCBI RefSeq via E-utilities', 'public (NCBI places no restrictions)'),
}
BP_DIR = {'.aln': 'Clustalw', '.a2m': 'Clustalw', '.phy': 'Phylip', '.nex': 'Nexus', '.sth': 'Stockholm', '.txt': 'Stockholm',
          '.gb': 'GenBank', '.gbk': 'GenBank', '.ab1': 'Abi', '.msf': 'msf'}
EXTRA_URL = {
    'pfam_PF00046_seed.sto': 'https://www.ebi.ac.uk/interpro/api/entry/pfam/PF00046/?annotation=alignment:seed',
    'rfam_RF00005_tRNA.sto': 'https://rfam.org/family/RF00005/alignment/stockholm',
    'ncbi_NC_012920_human_mito.gb': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NC_012920.1&rettype=gbwithparts&retmode=text',
    'htslib_ce_CHROMOSOME_II.fa': HT + 'ce.fa',
}


def url(name):
    if name in EXTRA_URL:
        return EXTRA_URL[name]
    if name.startswith('bp_'):
        orig = name[3:]
        ext = os.path.splitext(orig)[1]
        folder = BP_DIR.get(ext, 'Fasta')
        return BP + folder + '/' + orig
    if name.startswith('pysam_'):
        return PY + name[6:]
    if name.startswith('htslib_'):
        return HT + name[7:]
    return ''


lines = ['# Real-world input files', '',
         'Files written by other programs and databases, downloaded on 2026-09-23 and kept byte-for-byte',
         '(see `.gitattributes`) so a reviewer can check how ViewAlign reads files it did not write itself.', '',
         '`expected.json` holds what an independent parser reads from each file: Biopython 1.85 for alignments and',
         'GenBank; a few lines of plain Python for SAM (which bases belong at which reference position).',
         '`node tests/compat/run.js` opens every file in headless Chrome through the real file picker and compares.',
         'Regenerate the answers with `python scratch/build_real_expected.py`.', '',
         'Reads files: open `pysam_*.sam` on their own. For `htslib_range.bam`, open `htslib_ce_CHROMOSOME_II.fa` first,',
         'then the BAM or `htslib_range.cram` (the same 34 reads, decoded in the browser against that reference).',
         '`htslib_colons.bam` has no reads; on its own it explains',
         'that a BAM needs its reference first.', '',
         '| File | Source | Licence | Viewer result |', '|---|---|---|---|']
names = sorted(set(report) | {'htslib_ce_CHROMOSOME_II.fa'})
for name in names:
    src = next((v for k, v in SOURCES.items() if name.startswith(k)), ('', ''))
    r = report.get(name)
    if r:
        result = ('as expected' if r['ok'] else 'DIFFERS: ' + '; '.join(r['problems'])) + (' (%d rows)' % r['rows'] if r['rows'] else '')
        if r['warnings']:
            result += '; ' + '; '.join(r['warnings'])
    else:
        result = 'reference for `htslib_range.bam` (CHROMOSOME_II extracted from ce.fa)'
    lines.append('| [`%s`](%s) | %s | %s | %s |' % (name, url(name), src[0], src[1], result.replace('|', '\\|')))
lines += ['', 'Name differences in the last column are expected: the viewer names a GenBank record by LOCUS (without',
          'the `.1` version), where Biopython uses the accession.']
with open(os.path.join(ROOT, 'examples', 'real', 'README.md'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(lines) + '\n')
print('wrote', len(names), 'rows')
