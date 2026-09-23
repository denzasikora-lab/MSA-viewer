"""Independent reference answers for examples/real/ and examples/synthetic/,
read with Biopython (alignments, GenBank) or a few lines of plain Python
(SAM), never with ViewAlign's own parsers.

Writes expected.json into each folder: the sequence names and sequences
Biopython reads; for SAM, the reads on the reference the viewer shows and,
for every read, which base belongs at which reference position (so a read
shifted by an insertion or soft clip is caught); for BAM, what to load first.
Run: python scratch/build_real_expected.py   (needs biopython)
"""
import gzip
import json
import os
import re

from Bio import AlignIO, SeqIO

ROOT = os.path.join(os.path.dirname(__file__), '..', 'examples')


def recs(records):
    return {'names': [r.id for r in records], 'seqs': [str(r.seq) for r in records]}


def try_formats(path, fmts, align=True):
    errors = []
    for fmt in fmts:
        try:
            if align:
                alns = list(AlignIO.parse(path, fmt))
                rows = [r for a in alns for r in a]
                note = '%d alignment(s)' % len(alns) if len(alns) > 1 else ''
            else:
                rows = list(SeqIO.parse(path, fmt))
                note = '%d record(s)' % len(rows) if len(rows) > 1 else ''
            if rows:
                e = recs(rows)
                e['biopython_format'] = fmt
                e['note'] = note
                return e
        except Exception as ex:  # try the next format
            errors.append('%s: %s' % (fmt, ex))
    return {'error': '; '.join(errors)}


def sam_expectation(path):
    reads, refs = [], {}
    for line in open(path, encoding='utf-8'):
        if line.startswith('@') or not line.strip():
            continue
        f = line.rstrip('\n').split('\t')
        flag = int(f[1])
        if flag & 0x4 or flag & 0x100 or flag & 0x800 or f[5] == '*' or f[9] == '*':
            continue
        refs[f[2]] = refs.get(f[2], 0) + 1
        reads.append(f)
    top = max(refs.items(), key=lambda kv: kv[1])
    placed = []  # in file order; paired reads share a name, so not a dict
    for f in reads:
        if f[2] != top[0]:
            continue
        # reference position (1-based) -> read base, for aligned (M/=/X) bases only
        refp, readp, bases = int(f[3]), 0, {}
        for n, op in re.findall(r'(\d+)([MIDNSHP=X])', f[5]):
            n = int(n)
            if op in 'M=X':
                for i in range(n):
                    bases[refp + i] = f[9][readp + i].upper()
                refp += n
                readp += n
            elif op in 'IS':
                readp += n
            elif op in 'DN':
                refp += n
        placed.append([f[0], bases])
    # the viewer piles up only the reference with the most reads
    return {'primary_mapped_reads': top[1], 'shown_reference': top[0], 'references': sorted(refs), 'placed_bases': placed}


def expectation(path, low):
    if low.endswith('.aln'):
        return try_formats(path, ['clustal'])
    if low.endswith('.phy'):
        # relaxed first: Biopython's relaxed reader raises when names and lengths
        # do not add up, while its strict reader silently cuts names at 10
        order = ['phylip-sequential', 'phylip-relaxed', 'phylip'] if 'sequential' in low else ['phylip-relaxed', 'phylip', 'phylip-sequential']
        return try_formats(path, order)
    if low.endswith('.nex'):
        return try_formats(path, ['nexus'])
    if low.endswith(('.sth', '.sto', '.seed.txt')):
        return try_formats(path, ['stockholm'])
    if low.endswith('.msf'):
        return try_formats(path, ['msf'])
    if low.endswith(('.gb', '.gbk')):
        return try_formats(path, ['genbank'], align=False)
    if low.endswith('.ab1'):
        return try_formats(path, ['abi'], align=False)
    if low.endswith('.gz'):
        with gzip.open(path, 'rt') as h:
            e = recs(list(SeqIO.parse(h, 'fasta')))
        e['biopython_format'] = 'fasta (gzip)'
        return e
    if low.endswith('.sam'):
        return sam_expectation(path)
    if low.endswith('.bam'):
        return {'reads_needs_reference': True}
    if 'pearson' in low:  # ';' comment lines
        return try_formats(path, ['fasta-pearson'], align=False)
    return try_formats(path, ['fasta'], align=False)  # .fa, .pro, .a2m, no extension


SPECIAL = {
    'real': {
        # 34 reads on CHROMOSOME_II, counted from the BAM records themselves
        'htslib_range.bam': {'reference_file': 'htslib_ce_CHROMOSOME_II.fa', 'reads_on_reference': 34},
        # the same reads as range.bam, as CRAM; decoded in the browser against the reference
        'htslib_range.cram': {'reference_file': 'htslib_ce_CHROMOSOME_II.fa', 'reads_on_reference': 34},
        'htslib_colons.bam': {'reads_needs_reference': True, 'note': 'reference names contain ":" "-" ","; no reads'},
        # Header claims 62 columns but 11 of 12 sequences say Len: 250; Biopython refuses it.
        # The viewer reads the 12 sequences as written, which is the useful outcome.
        'bp_DOA_prot.msf': {'rows': 12, 'note': 'malformed MSF header (62 vs Len: 250)'},
    },
    'synthetic': {
        # the same 6 reads as synth_reads.sam, piled onto the synthetic reference
        'synth_reads.bam': {'reference_file': 'synth_ref.fa', 'reads_on_reference': 6},
    },
}
SKIP = {'htslib_ce_chromosome_ii.fa', 'synth_key.json'}

for folder in ('real', 'synthetic'):
    d = os.path.join(ROOT, folder)
    out = {}
    for name in sorted(os.listdir(d)):
        low = name.lower()
        if low.endswith(('.json', '.md')) or low in SKIP:
            continue
        e = SPECIAL[folder].get(name) or expectation(os.path.join(d, name), low)
        out[name] = e
        shown = e.get('names') and '%d seqs' % len(e['names']) or e.get('primary_mapped_reads', e.get('rows', e.get('error', '')))
        print('%-10s %-40s %s' % (folder, name, str(shown)[:100]))
    with open(os.path.join(d, 'expected.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, indent=1)
