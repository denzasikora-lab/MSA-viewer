"""Build examples/compat/: format edge cases for input-compatibility review.

Every file encodes the same 6 x 111 alignment as examples/synthetic/synth_msa.fa
(or a stated variant of it), so a reviewer can open any file and compare against
one known answer. expected.json records what the viewer should load from each.
Run: python scratch/build_compat_examples.py
"""
import gzip
import json
import os

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'examples', 'compat')
os.makedirs(OUT, exist_ok=True)


def read_fasta(path):
    recs, name = [], None
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        if line.startswith('>'):
            name = line[1:].split()[0]
            recs.append([name, ''])
        elif line:
            recs[-1][1] += line
    return recs


BASE = read_fasta(os.path.join(ROOT, 'examples', 'synthetic', 'synth_msa.fa'))
NAMES = [n for n, _ in BASE]
SEQS = [s for _, s in BASE]
L = len(SEQS[0])
expected = {}


def write(name, text, nl='\n', bom=False, raw=None):
    path = os.path.join(OUT, name)
    if raw is not None:
        data = raw
    else:
        data = text.replace('\n', nl).encode('utf-8')
        if bom:
            data = b'\xef\xbb\xbf' + data
    with open(path, 'wb') as f:
        f.write(data)


def expect(name, what, names=None, seqs=None, note='', reject=None):
    e = {'what': what, 'note': note}
    if reject:
        e['reject'] = reject
    else:
        e['names'] = names if names is not None else NAMES
        e['seqs'] = seqs if seqs is not None else SEQS
    expected[name] = e


def chunks(s, n):
    return [s[i:i + n] for i in range(0, len(s), n)]


def fasta(names, seqs, width=None):
    out = []
    for n, s in zip(names, seqs):
        out.append('>' + n)
        out.extend(chunks(s, width) if width else [s])
    return '\n'.join(out) + '\n'


# ---- FASTA variants -------------------------------------------------------
write('fasta_crlf.fa', fasta(NAMES, SEQS), nl='\r\n')
expect('fasta_crlf.fa', 'FASTA with Windows CRLF line endings')

write('fasta_cr_only.fa', fasta(NAMES, SEQS), nl='\r')
expect('fasta_cr_only.fa', 'FASTA with classic Mac CR-only line endings')

write('fasta_bom.fa', fasta(NAMES, SEQS), bom=True)
expect('fasta_bom.fa', 'FASTA starting with a UTF-8 byte-order mark')

wrapped = []
for n, s in zip(NAMES, SEQS):
    wrapped.append('>' + n + ' some description text')
    wrapped.extend(c.lower().replace('-', '.') for c in chunks(s, 30))
    wrapped.append('')
write('fasta_wrapped_lower_dots.fa', '\n'.join(wrapped) + '\n')
expect('fasta_wrapped_lower_dots.fa',
       'FASTA wrapped at 30, lowercase, "." gaps, descriptions, blank lines',
       seqs=[s.lower() for s in SEQS],
       note='case is kept as written; "." gaps become "-"')

rna = [s.replace('T', 'U') for s in SEQS]
write('fasta_rna.fa', fasta(NAMES, rna, 60))
expect('fasta_rna.fa', 'RNA (U instead of T)', seqs=rna)

iupac = [SEQS[0][:10] + 'NRYKMSWBDHV' + SEQS[0][21:]] + SEQS[1:]
write('fasta_iupac.fa', fasta(NAMES, iupac, 60))
expect('fasta_iupac.fa', 'IUPAC ambiguity codes N R Y K M S W B D H V', seqs=iupac)

ungapped = [s.replace('-', '') for s in SEQS]
ungapped[3] = ungapped[3][:90]
write('fasta_unaligned.fa', fasta(NAMES, ungapped, 60))
expect('fasta_unaligned.fa', 'Unaligned FASTA: unequal lengths (111, 110, 108, 90)',
       seqs=[s + '-' * (L - len(s)) for s in ungapped],
       note='the viewer warns and pads shorter rows with trailing gaps')

ncbi = ['gi|%d|gb|AB%06d.1| synthetic %s, partial cds' % (1000 + i, i, n) for i, n in enumerate(NAMES)]
ncbi[5] = ncbi[4]  # duplicate header
write('fasta_ncbi_headers_dup.fa', fasta(ncbi, SEQS, 70))
expect('fasta_ncbi_headers_dup.fa', 'NCBI-style pipe headers with spaces; last two headers identical',
       names=[h.split()[0] for h in ncbi],
       note='names are the first word of the header; duplicates are kept as separate rows')

write('fasta_gzip.fa.gz', None, raw=gzip.compress(fasta(NAMES, SEQS).encode()))
expect('fasta_gzip.fa.gz', 'gzip-compressed FASTA (.fa.gz)')

# ---- Clustal ----------------------------------------------------------------
def clustal(header, names, seqs, width=60, counts=False, cons=True):
    out = [header, '', '']
    pad = max(len(n) for n in names) + 4
    done = [0] * len(names)
    for start in range(0, len(seqs[0]), width):
        for i, (n, s) in enumerate(zip(names, seqs)):
            part = s[start:start + width]
            done[i] += len(part.replace('-', ''))
            out.append(n.ljust(pad) + part + ('\t%d' % done[i] if counts else ''))
        if cons:
            col = ''.join('*' if len(set(s[j] for s in seqs)) == 1 else ' '
                          for j in range(start, min(start + width, len(seqs[0]))))
            out.append(' ' * pad + col)
        out.append('')
    return '\n'.join(out) + '\n'


write('clustal_omega_counts.aln', clustal('CLUSTAL O(1.2.4) multiple sequence alignment', NAMES, SEQS, 50, counts=True))
expect('clustal_omega_counts.aln', 'Clustal Omega header, 50-column blocks, residue counts, conservation lines')

write('clustal_muscle_cr_only.aln', clustal('MUSCLE (3.8) multiple sequence alignment', NAMES, SEQS, 60), nl='\r')
expect('clustal_muscle_cr_only.aln', 'MUSCLE-style Clustal header with classic Mac CR-only line endings')

# ---- PHYLIP -------------------------------------------------------------------
long_names = [n + '_long_taxon_name' for n in NAMES]
write('phylip_relaxed_long_names.phy',
      ' %d %d\n' % (len(NAMES), L) + ''.join('%s  %s\n' % (n, s) for n, s in zip(long_names, SEQS)))
expect('phylip_relaxed_long_names.phy', 'Relaxed PHYLIP, names longer than 10 characters', names=long_names)

# Exactly 10-character names with the sequence starting right after: only a
# reader that honours the fixed 10-character name field splits these correctly
strict = ['taxon%05d' % (i + 1) for i in range(len(NAMES))]
lines = [' %d %d' % (len(NAMES), L)]
for i, s in enumerate(SEQS):
    lines.append(strict[i] + ' '.join(chunks(s[:50], 10)))
lines.append('')
for start in range(50, L, 50):
    for s in SEQS:
        lines.append(' '.join(chunks(s[start:start + 50], 10)))
    lines.append('')
write('phylip_strict_interleaved_spaced.phy', '\n'.join(lines) + '\n')
expect('phylip_strict_interleaved_spaced.phy',
       'Strict PHYLIP (10-character name field), interleaved, residues in groups of 10',
       names=strict, note='names are exactly 10 characters and touch the sequence')

write('phylip_bom.phy', '%d %d\n' % (len(NAMES), L) + ''.join('%s %s\n' % (n, s) for n, s in zip(NAMES, SEQS)), bom=True)
expect('phylip_bom.phy', 'PHYLIP starting with a UTF-8 byte-order mark')

# ---- NEXUS --------------------------------------------------------------------
nex = ['#NEXUS', '', 'BEGIN TAXA;', '  DIMENSIONS NTAX=%d;' % len(NAMES), '  TAXLABELS ' + ' '.join(NAMES) + ';', 'END;', '',
       'BEGIN CHARACTERS;', '  DIMENSIONS NCHAR=%d;' % L,
       '  FORMAT DATATYPE=DNA MISSING=? GAP=- INTERLEAVE=YES;', '  MATRIX', '[ interleaved blocks of 40 ]']
for start in range(0, L, 40):
    for n, s in zip(NAMES, SEQS):
        nex.append('    %-12s %s' % (n, s[start:start + 40]))
    nex.append('')
nex += ['  ;', 'END;', '', 'BEGIN TREES;', '  TREE t1 = ((alpha_ref,alpha_syn),alpha_mis,(beta_stop,(beta_fs,beta_del)));', 'END;']
write('nexus_interleaved_taxa_trees.nex', '\n'.join(nex) + '\n')
expect('nexus_interleaved_taxa_trees.nex',
       'NEXUS with TAXA + CHARACTERS blocks, INTERLEAVE=YES, a [comment], and a trailing TREES block')

quoted = ["'%s sp.'" % n for n in NAMES]
nexq = ['#NEXUS', 'begin data;', 'dimensions ntax=%d nchar=%d;' % (len(NAMES), L), 'format datatype=dna gap=- missing=?;', 'matrix']
nexq += ['%s %s' % (q, s) for q, s in zip(quoted, SEQS)] + [';', 'end;']
write('nexus_quoted_names_lowercase.nex', '\n'.join(nexq) + '\n')
expect('nexus_quoted_names_lowercase.nex', 'NEXUS in lowercase keywords with single-quoted taxon names containing spaces',
       names=['%s sp.' % n for n in NAMES], note='a quoted name is one name, spaces included')

# ---- Stockholm ----------------------------------------------------------------
sto = ['# STOCKHOLM 1.0', '#=GF ID compat', '']
for n in NAMES:
    sto.append('#=GS %s DE synthetic row %s' % (n, n))
sto.append('')
for start in range(0, L, 50):
    for n, s in zip(NAMES, SEQS):
        sto.append('%-12s %s' % (n, s[start:start + 50].replace('-', '.')))
    sto.append('#=GR alpha_ref SS ' + '.' * len(SEQS[0][start:start + 50]))
    sto.append('%-12s %s' % ('#=GC SS_cons', '.' * len(SEQS[0][start:start + 50])))
    sto.append('')
sto.append('//')
write('stockholm_interleaved_annotated_bom.sto', '\n'.join(sto) + '\n', bom=True)
expect('stockholm_interleaved_annotated_bom.sto',
       'Stockholm, interleaved 50-column blocks, #=GS/#=GR/#=GC lines, "." gaps, UTF-8 BOM',
       note='annotation lines are not sequences; "." gaps become "-"')

# ---- MSF -------------------------------------------------------------------------
msf = ['PileUp', '', '   MSF: %d  Type: N  Check: 1234  ..' % L, '']
for n in NAMES:
    msf.append(' Name: %-10s Len: %d  Check: 0  Weight: 1.00' % (n, L))
msf += ['', '//', '']
for start in range(0, L, 50):
    for n, s in zip(NAMES, SEQS):
        body = s[start:start + 50].replace('-', '.')
        if start == 0:
            body = body.replace('.', '~')
        msf.append('%-10s %s' % (n, ' '.join(chunks(body, 10))))
    msf.append('')
write('msf_gcg_tilde_dot_gaps.msf', '\n'.join(msf) + '\n')
expect('msf_gcg_tilde_dot_gaps.msf', 'GCG MSF with "PileUp" header, "~" and "." gaps, residues in groups of 10',
       note='"~" and "." gaps become "-"')

# ---- GenBank ----------------------------------------------------------------
def gb(locus, seq, cds):
    lines = ['LOCUS       %-16s %d bp    DNA     linear   SYN 23-SEP-2026' % (locus, len(seq)),
             'DEFINITION  Synthetic record %s.' % locus, 'ACCESSION   %s' % locus.upper(),
             'FEATURES             Location/Qualifiers',
             '     source          1..%d' % len(seq), '     CDS             %s' % cds, '                     /codon_start=1',
             'ORIGIN']
    for i in range(0, len(seq), 60):
        lines.append('%9d %s' % (i + 1, ' '.join(chunks(seq[i:i + 60].lower(), 10))))
    lines.append('//')
    return '\n'.join(lines) + '\n'


g1 = SEQS[0].replace('-', '')
g2 = SEQS[3].replace('-', '')
write('genbank_two_records_join.gb', gb('rec_one', g1, 'join(1..30,31..60)') + gb('rec_two', g2, 'complement(1..60)'))
expect('genbank_two_records_join.gb', 'Two GenBank records in one file; CDS locations use join() and complement()',
       names=['rec_one', 'rec_two'], seqs=[g1.upper(), g2.upper()])

# ---- Unsupported (should be refused with a clear message) --------------------
embl = ['ID   SYNTH; SV 1; linear; genomic DNA; STD; SYN; %d BP.' % len(g1), 'XX', 'DE   Synthetic EMBL record.', 'XX',
        'SQ   Sequence %d BP;' % len(g1)]
for i in range(0, len(g1), 60):
    embl.append('     ' + ' '.join(chunks(g1[i:i + 60].lower(), 10)).ljust(66) + '%d' % min(i + 60, len(g1)))
embl.append('//')
write('unsupported_embl.embl', '\n'.join(embl) + '\n')
expect('unsupported_embl.embl', 'EMBL flatfile (not a supported format)', reject='.',
       note='should be refused with a message, not loaded as garbage')

with open(os.path.join(OUT, 'expected.json'), 'w', encoding='utf-8', newline='\n') as f:
    json.dump(expected, f, indent=1)

readme = ["# Input-format edge cases", "",
          "Each file holds the same 6 × 111 alignment as `../synthetic/synth_msa.fa` (or a stated variant),",
          "written the way a particular program or platform writes it. Open any file and compare it with that one alignment.",
          "`expected.json` lists what the viewer should load from each file; `node tests/compat/run.js` checks all of them in headless Chrome.",
          "Regenerate with `python scratch/build_compat_examples.py`.", "",
          "| File | What it tests | Expected |", "|---|---|---|"]
for name, e in expected.items():
    outcome = 'refused with a message' if e.get('reject') else '%d rows × %d columns' % (len(e['seqs']), max(len(s) for s in e['seqs']))
    if e.get('note'):
        outcome += '; ' + e['note']
    readme.append('| `%s` | %s | %s |' % (name, e['what'], outcome))
with open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(readme) + '\n')
print(len(expected), 'files written to', os.path.normpath(OUT))
