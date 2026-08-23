# MSA Viewer

A fast, interactive HTML-based MSA viewer for FASTA/MSF/NEXUS alignments, with client-side sequence search and remote file loading via SSH.

## Features

- **Interactive Alignment Viewer**: Scroll, zoom, highlight, color schemes
- **Sequence Search**: BLAST-*like* search against loaded FASTA databases — runs entirely client-side in a Web Worker (not real NCBI BLAST, no BLAST+ install required). See `features-inventory.md` § "Sequence search" for exactly how this works and a real incident where it silently broke.
- **Remote File Loading**: SSH to multiple servers (direct or via jump hosts)
  - Manual: Paste file path and click "Fetch"
  - Via Midnight Commander: Press `F2 → v` in MC, then click "Check Queue" to load
- **Drag-and-Drop Reordering**: Rearrange sequences in alignment
- **MSA Tools**: Multiple alignment, consensus extraction (with threshold control)
- **SINE Detection**: Identify and extract SINE-family sequences
- **Shareable Snapshots**: Export full-view state and reopen exact alignment view via URL

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
