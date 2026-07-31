# ViewAlign

A browser-based platform for multiple sequence alignment visualization, editing, and analysis.
No installation, no build step, no framework dependencies.

**Live app:** https://toki-bio.github.io/MSA-viewer/ · **Manual:** https://toki-bio.github.io/MSA-viewer/manual.html

## Features

- **Nine input formats with auto-detection**: FASTA, MSF, Clustal, PHYLIP, NEXUS, Stockholm,
  GenBank flatfile, SAM, and BAM/CRAM (BAM/CRAM via the optional server)
- **Four view modes**: Full, Block, Canvas (viewport-culled, auto-activates above 150,000
  residues), and Reads (IGV-style tracks for mapped SAM/BAM data)
- **GeneDoc-style editing**: residue-level edits, Move NoGaps / Slide KeepGaps, gap column
  insert/delete, random-access undo/redo history
- **In-browser MAFFT**: WebAssembly build of MAFFT v7.525 — realign blocks or append and
  align new sequences with no server
- **Codon-aware analysis**: 15 NCBI genetic codes, synonymous/non-synonymous classification,
  frameshift detection, translation track
- **Subfamily clustering**: position-pattern clustering with fuzzy merging and configurable
  quality thresholds, plus diagnostic-feature tables and cluster colouring
- **More analysis**: dot plots with region detection, repeat/TSD finder, UPGMA trees,
  regex motif search, 50 restriction enzyme sites
- **Publication export**: SVG (viewport or full), Word-compatible RTF with per-residue
  conservation shading, FASTA, Newick
- **Shareable snapshots**: save and reopen a viewer state as JSON, standalone HTML, or URL
- **Optional server**: local BLAST database hosting, SSH remote file loading, samtools
  BAM/CRAM conversion

## Quick Start

### Browser (HTML only)
Open `index.html` in any modern browser. Supports local file upload.

### Server Mode (Recommended)
```bash
npm install
node server.js
```
Visit `http://localhost:3000`

Enables:
- BLAST search
- Remote SSH file loading

## Remote File Loading Setup

See **[REMOTE_PUSH_TO_LOAD_GUIDE.md](REMOTE_PUSH_TO_LOAD_GUIDE.md)** for comprehensive setup instructions including:
- Configuring remote servers
- Installing MC menu entries
- Troubleshooting SS connections

### Quick Example

**On remote server:**
```bash
# Add to ~/.config/mc/menu
v   View in MSA viewer
	echo "%d/%f" > /tmp/.msa_viewer_queue &
```

**In browser:**
1. Open `http://localhost:3000`
2. Navigate file in MC, press `F2 → v`
3. Click **Check Queue** button
4. Alignment loads with auto-focus

## Configuration

Edit `server.js` to add or modify SSH servers:
```javascript
const SSH_SERVERS = {
    'myserver': {
        label: 'My Lab Server',
        user: 'username',
        host: 'server.example.com',
        via: null  // or 'gateway' for jump host
    }
};
```

## Demo Sequences

Includes sample SINE sequences:
- **RepBase.bnk**: ~49K SINE elements
- **RepBase_filtered.bnk**: Filtered high-confidence elements
- **SINEBase.nr95**: Non-redundant collection
- **tua_DL_ASuh_JGrau_repeat.fa**: Custom repeat FASTA
- Custom Anolis sequences

## Snapshot Storage (GitHub Pages)

The `Snapshot` button exports:
- a direct encoded snapshot URL (`?snapshot=...`)
- a JSON snapshot file (for short-link hosting)
- an HTML launcher file

For short, stable links on GitHub Pages:
1. Export snapshot JSON from the app.
2. Commit the JSON file into [snapshots/README.md](snapshots/README.md) folder (`snapshots/`).
3. Open using:

`?snapshotFile=snapshots/<snapshot_file>.json`

## Security Notes

- SSH uses key-based auth (no passwords)
- Queue file at `/tmp/.msa_viewer_queue` must be world-writable (666)
- All file transfers encrypted over SSH
- Manual "Check Queue" button prevents continuous polling (safer for IDS-protected servers)

## Support

For issues or feature requests, see [GitHub Issues](https://github.com/Toki-bio/MSA-viewer/issues)

---

**Live Demo**: https://toki-bio.github.io/MSA-viewer
