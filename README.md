# ViewAlign

A browser-based platform for multiple sequence alignment visualization, editing, and analysis.
No installation, no build step, no framework dependencies.

**Live app:** https://toki-bio.github.io/MSA-viewer/ · **Manual:** https://toki-bio.github.io/MSA-viewer/manual.html

## Features

- **Nine input formats with auto-detection**: FASTA, MSF, Clustal, PHYLIP, NEXUS, Stockholm,
  GenBank flatfile, SAM, and BAM/CRAM (read in the browser onto an open reference);
  GenBank/RefSeq records can also be fetched by accession
- **Four view modes**: Full, Block, Canvas (viewport-culled; Full and Block window
  the alignment above about 500,000 residues, and Canvas auto-activates above
  5 million), and Reads (IGV-style tracks for mapped SAM/BAM data)
- **GeneDoc-style editing**: residue-level edits, Move NoGaps / Slide KeepGaps, gap column
  insert/delete, random-access undo/redo history
- **In-browser MAFFT**: WebAssembly build of MAFFT v7.525 — realign blocks or append and
  align new sequences with no server
- **Codon-aware analysis**: 15 NCBI genetic codes, synonymous/non-synonymous classification,
  frameshift detection, translation track
- **Codon-aware alignment**: a JavaScript port of MACSE v2.07 `alignSequences` (same alignments as MACSE),
  plus a fast reference-based approximation
- **Subfamily clustering**: position-pattern clustering with fuzzy merging and configurable
  quality thresholds, plus diagnostic-feature tables and cluster colouring
- **Sequence search**: BLAST-*like* search against loaded FASTA databases, runs entirely
  client-side in a Web Worker with selectable water/ssearch36/blastn-style scoring presets
  (not real NCBI BLAST or ssearch36, no install required). See `features-inventory.md` §
  "Sequence search" for exactly how this works, including a real incident where it silently
  broke and how it's guarded against recurring.
- **Annotation track**: BED features (genes, exons, repeats) drawn as a compact track above
  the alignment in every view mode; coordinates on a named sequence are mapped through its
  gaps, so the track follows the alignment. Load from a file, a URL, or `?bed=<url>`; with
  codon analysis on, each annotated CDS is translated in its own frame and strand
- **More analysis**: dot plots with region detection, repeat/TSD finder, UPGMA trees,
  regex motif search, 50 restriction enzyme sites
- **Publication export**: SVG (viewport or full), Word-compatible RTF with per-residue
  conservation shading, FASTA, Newick
- **Shareable snapshots**: save and reopen a viewer state as JSON, standalone HTML, or URL
- **Optional server**: local BLAST database hosting and SSH remote file loading

## Quick Start

**Try a starter alignment (40 SINE copies, 4 groups):**
https://toki-bio.github.io/MSA-viewer/?url=https://toki-bio.github.io/MSA-viewer/examples/svk_k4.fa&title=SVK%20SINE%20(K1–K4)

### Browser (HTML only)
Open `index.html` in any modern browser. Supports local file upload. More examples: [examples/](examples/).

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

The optional server reads local files and runs SSH on your behalf, so by default it only
serves this machine:

- It listens on `127.0.0.1`. Set `HOST=0.0.0.0` to accept other machines (LAN, Tailscale);
  the port is `PORT` (default 3000).
- Requests must use `localhost`, an IP address, or a name listed in `ALLOWED_HOSTS`
  (comma-separated), which blocks DNS-rebinding pages.
- `/api` requests sent by another web site's page are refused.
- Loading local paths and SSH files works only for clients on the same machine unless
  `ALLOW_REMOTE_FILE_ACCESS=1`. Local paths must lie under `LOCAL_FILE_ROOTS`
  (default: the ViewAlign folder and your home folder) and never inside hidden folders
  such as `~/.ssh`.
- `ssh-servers.json`, `blast_dbs.json`, logs and `server.js` are never served.
- Remote paths may contain letters, digits, spaces and `_ @ % + = : , . / ~ -` only.
- SSH uses key-based auth (no passwords)
- Queue file at `/tmp/.msa_viewer_queue` must be world-writable (666)
- All file transfers encrypted over SSH
- Manual "Check Queue" button prevents continuous polling (safer for IDS-protected servers)

## Licence

ViewAlign is released under the MIT License (`LICENSE`). The MACSE port (`macse-align.js`, `macse-worker.js`,
`macse-dp-wasm.js`; Ranwez et al. 2011, 2018) is distributed under MACSE's CeCILL 2.1 licence (`LICENSE-MACSE`). It runs
in its own worker and talks to the rest of ViewAlign only by messages.

## Support

For issues or feature requests, see [GitHub Issues](https://github.com/Toki-bio/MSA-viewer/issues)

---

**Live Demo**: https://toki-bio.github.io/MSA-viewer
