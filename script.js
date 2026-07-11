// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// ViewAlign — browser-based multiple sequence alignment viewer & editor
const BUILD_TAG = 'v108';
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
//
// EXTERNAL CODE & ATTRIBUTION
// ===========================
// Ã¢â‚¬Â¢ MAFFT - alignment engine compiled to WebAssembly (disttbfast.js, mafft-wasm.js).
//   Katoh K, Standley DM (2013) Mol Biol Evol 30:772-780. BSD license.
// Ã¢â‚¬Â¢ GeneDoc - editing tools (Move NoGaps, Slide KeepGaps, RTF export) modeled after
//   GeneDoc's Arrange/MoveText and SlideText operations.
//   Nicholas KB et al. (1997) EMBNEW.NEWS 4:14.
// Ã¢â‚¬Â¢ IGV - Compact read-packing view inspired by the Integrative Genomics Viewer.
//   Robinson JT et al. (2011) Nat Biotechnol 29:24-26.
// Ã¢â‚¬Â¢ MACSE - Codon-aware visualization inspired by MACSE's approach.
//   Ranwez V et al. (2011) PLoS ONE 6:e22594.
// Ã¢â‚¬Â¢ Clustal - Clustal shading scheme and .aln format parser.
//   Sievers F et al. (2011) Mol Syst Biol 7:539.
// Ã¢â‚¬Â¢ BLOSUM62 - similarity matrix for amino acid grouping.
//   Henikoff S, Henikoff JG (1992) PNAS 89:10915-10919.
// Ã¢â‚¬Â¢ samtools - BAM/CRAM conversion (server-side).
//   Li H et al. (2009) Bioinformatics 25:2078-2079.
//
// All external code is used under its original open-source license.
// The remainder is original work.
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

// DEFAULTS & STATE
const DEBUG = false;
const debugLog = (...args) => { if (DEBUG) console.log(...args); };

const DEFAULTS = {
    consensusThreshold: 50,
    groupConsensusThreshold: 50,
    nameLength: 25,
    minCoverage: 30,
    colorScheme: 'monochrome'
};

const APP_VERSION = '1e8580e';

const state = {
    seqs: [],
    selectedRows: new Set(),
    selectedColumns: new Set(),
    selectedNucs: new Map(),
    pendingNucStart: null,
    spanCache: new Map(),
    domSelectedNucs: new Map(),
    domSelectedColumns: new Map(),
    domPendingNuc: null,
    lastSelectedIndex: null,
    lastSelectedColumn: null,
    consensusSeq: '',
    consensusCache: null,
    conservationDataCache: null,
    alignmentIndex: null, // { nSeqs, maxLen, totalResidues, mode, flags } from pre-parse scan
    deletedHistory: [],
    redoHistory: [],
    currentFilename: '',
    currentFilePath: '',
    searchHistory: [],
    isDragging: false,
    dragStartRow: null,
    dragStartCol: null,
    dragMode: null,
    ctrlPressed: false,
    altPressed: false,
    lastAction: null,
    draggingGroup: null,
    slideDragStartX: null,
    slideDragStartPos: null,
    slideSeqIndex: null,
    editModeActive: false,
    editTool: 'moveNoGaps',
    editLiveConservation: false,
    editDrag: null,
    editCell: null,
    tsdMarks: new Map(),
    tsdMarkStyle: 'color',
    tsdMarkColor: '#ffd54f',
    tsdMarkUndo: null,
    nameLength: DEFAULTS.nameLength,
    uiListenersAttached: false,
    panning: {
        active: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
        started: false
    },
    trimBoundaries: null,
    trimBackup: null,
    softTrimBoundaries: null, // { leftTrimEnd, rightTrimStart } Ã¢â‚¬â€ excluded from clustering only
    groupConsensusCount: 0,
    _statsMatrices: null
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Recent Files & Clipboard History Ã¢â€â‚¬Ã¢â€â‚¬
const _historyManager = {
    maxItems: 10,
    items: [],

    load() {
        try {
            const raw = localStorage.getItem('msaviewer_history');
            if (raw) { this.items = JSON.parse(raw); this.maxItems = this.items._max || 10; }
        } catch(e) { this.items = []; }
        if (!Array.isArray(this.items)) this.items = [];
    },

    save() {
        const store = this.items.slice(0, this.maxItems);
        store._max = this.maxItems;
        try { localStorage.setItem('msaviewer_history', JSON.stringify(store)); } catch(e) {}
    },

    add(type, data) {
        this.load();
        const entry = {
            type, // 'file' or 'clipboard'
            name: data.name || 'Untitled',
            timestamp: Date.now(),
            nSeqs: data.nSeqs || 0,
            length: data.length || 0,
            preview: data.preview || '',
            source: data.source || '',
            text: data.text || null // stored for clipboard items (small), null for files
        };
        // Remove duplicate (same name + source)
        this.items = this.items.filter(e => !(e.name === entry.name && e.source === entry.source));
        this.items.unshift(entry);
        if (this.items.length > this.maxItems + 20) this.items.length = this.maxItems + 20;
        this.save();
    },

    setMax(n) {
        this.maxItems = Math.max(1, Math.min(50, n));
        this.save();
    },

    renderDropdown() {
        this.load();
        const menu = document.getElementById('recentDropdown');
        if (!menu) return;
        if (this.items.length === 0) {
            menu.innerHTML = '<div style="padding:8px;color:#999;font-size:11px;">No recent files</div>';
            return;
        }
        const timeFmt = (ts) => {
            const d = new Date(ts);
            const now = new Date();
            const diffMin = Math.floor((now - d) / 60000);
            if (diffMin < 1) return 'just now';
            if (diffMin < 60) return diffMin + 'm ago';
            if (diffMin < 1440) return Math.floor(diffMin / 60) + 'h ago';
            return d.toLocaleDateString();
        };
        let html = '';
        for (const e of this.items.slice(0, this.maxItems)) {
            const icon = e.type === 'file' ? 'Ã°Å¸â€œÂ' : 'Ã°Å¸â€œâ€¹';
            const label = e.name.length > 35 ? e.name.substring(0, 32) + '...' : e.name;
            const meta = e.nSeqs ? `${e.nSeqs} seq Ãƒâ€” ${e.length} col` : '';
            html += `<div class="recent-item" data-idx="${this.items.indexOf(e)}"
                title="${this._escapeHtml(e.source || e.name)}\n${meta}\n${this._escapeHtml(e.preview)}"
                style="padding:5px 10px;cursor:pointer;font-size:11px;border-bottom:1px solid #eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${icon} <b>${this._escapeHtml(label)}</b>
                <span style="color:#999;font-size:10px;">${meta ? ' Ã‚Â· ' + meta : ''} Ã‚Â· ${timeFmt(e.timestamp)}</span>
            </div>`;
        }
        html += `<div style="padding:4px 10px;font-size:10px;color:#999;border-top:1px solid #eee;display:flex;justify-content:space-between;">
            <span>Showing ${Math.min(this.items.length, this.maxItems)} of ${this.items.length}</span>
            <span>Max: <input type="number" id="historyMaxInput" value="${this.maxItems}" min="1" max="50"
                style="width:36px;font-size:10px;padding:0 2px;text-align:center;"
                onchange="_historyManager.setMax(parseInt(this.value)||10);_historyManager.renderDropdown();"></span>
        </div>`;
        menu.innerHTML = html;

        // Click handlers
        menu.querySelectorAll('.recent-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.idx);
                const entry = this.items[idx];
                if (!entry) return;
                if (entry.text) {
                    fastaInput.value = entry.text;
                    state.currentFilename = entry.name;
                    state.currentFilePath = entry.source || '';
                    parseAndRender(false);
                } else {
                    showMessage('Original file not available - re-open the file to load it.', 3000);
                }
                document.getElementById('recentDropdown').style.display = 'none';
            });
        });
    },

    _escapeHtml(s) {
        if (!s) return '';
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
};

const SNAPSHOT_SCHEMA_VERSION = 1;

let _dragPreviewEl = null;
let _dragPreviewClass = '';
let _draggedSeqIndex = -1;
let _dragPreviewInsertAbove = true;
let _dragImageEl = null;
let _rowReorderDrag = null;

function _getDragImageEl() {
    if (_dragImageEl && _dragImageEl.isConnected) return _dragImageEl;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:-1000px;top:-1000px;width:1px;height:1px;opacity:0;pointer-events:none;background:transparent;';
    document.body.appendChild(el);
    _dragImageEl = el;
    return el;
}

function _getDragIndicatorEl() {
    let indicator = document.getElementById('drag-name-indicator');
    if (indicator) return indicator;
    indicator = document.createElement('div');
    indicator.id = 'drag-name-indicator';
    indicator.style.cssText = 'position:absolute;height:2px;background:#1976D2;border-radius:2px;pointer-events:none;z-index:200;';
    return indicator;
}

function updateVersionIndicator() {
    const elVersion = document.getElementById('versionIndicator');
    if (!elVersion) return;
    elVersion.textContent = `version ${BUILD_TAG} …`;
    fetch('https://api.github.com/repos/Toki-bio/MSA-viewer/commits/main?per_page=1')
        .then(r => r.json())
        .then(data => {
            const sha = (data.sha || '').substring(0, 7);
            const url = data.html_url || 'https://github.com/Toki-bio/MSA-viewer';
            elVersion.innerHTML = `version ${BUILD_TAG} (<a href="${url}" target="_blank" style="color:#888;">${sha}</a>)`;
        })
        .catch(() => { elVersion.textContent = `version ${BUILD_TAG}`; });
}

function updateControlsOffset() {
    const controls = document.getElementById('controls');
    const rootStyle = document.documentElement.style;
    if (!controls) {
        rootStyle.setProperty('--controls-offset', '0px');
        return;
    }
    const height = Math.ceil(controls.getBoundingClientRect().height);
    rootStyle.setProperty('--controls-offset', `${Math.max(0, height)}px`);
}

// ============ SSH FILE FETCH ============
let _sshServerAvailable = false;
let _sshPollRunning = false;
let _pollableServers = [];  // Only servers with direct SSH (no jump host)

// --- Server selector helpers (toggle button group) ---
function getSelectedServer() {
    const active = document.querySelector('#sshServerBtnGroup .srv-active');
    return active ? active.dataset.server : (_pollableServers[0] || 'default');
}
function setSelectedServer(key) {
    const btns = document.querySelectorAll('#sshServerBtnGroup .srv-btn');
    btns.forEach(b => {
        if (b.dataset.server === key) {
            b.classList.add('srv-active');
            b.style.background = '#4a90d9'; b.style.color = '#fff';
        } else {
            b.classList.remove('srv-active');
            b.style.background = '#f0f0f0'; b.style.color = '#333';
        }
    });
}
function _buildServerButtons(servers) {
    const group = document.getElementById('sshServerBtnGroup');
    if (!group) return;
    group.innerHTML = '';
    const keys = Object.keys(servers);
    keys.forEach((key, i) => {
        const srv = servers[key];
        const btn = document.createElement('button');
        btn.className = 'srv-btn' + (i === 0 ? ' srv-active' : '');
        btn.dataset.server = key;
        btn.title = srv.label;
        btn.textContent = srv.label.split(/[( ]/)[0]; // short name
        btn.style.cssText = 'font-size:10px;padding:0 6px;height:17px;line-height:15px;border:1px solid #999;cursor:pointer;white-space:nowrap;'
            + (i === 0 ? 'background:#4a90d9;color:#fff;border-radius:3px 3px 0 0;'
            : (i === keys.length - 1 ? 'background:#f0f0f0;color:#333;border-top:none;border-radius:0 0 3px 3px;'
            : 'background:#f0f0f0;color:#333;border-top:none;'));
        if (keys.length === 1) btn.style.borderRadius = '3px';
        btn.addEventListener('click', () => setSelectedServer(key));
        group.appendChild(btn);
    });
}

async function checkSshServer() {
    try {
        const resp = await fetch('/api/ssh-servers', { signal: AbortSignal.timeout(2000) });
        if (resp.ok) {
            _sshServerAvailable = true;
            const servers = await resp.json();
            _pollableServers = Object.keys(servers).filter(k => servers[k].pollable);
            if (Object.keys(servers).length === 0) return; // no servers configured
            debugLog(`[POLL] Pollable servers: ${_pollableServers.join(', ')}`);
            _buildServerButtons(servers);
            const row = document.getElementById('sshLoadRow');
            if (row) row.style.display = '';
            // MANUAL CHECKING ONLY: User clicks "Check Queue" button to poll
            // Auto-polling disabled to prevent IDS triggers from continuous SSH connections
        }
    } catch (_) {
        // Server not running - hide SSH row (already hidden by default)
    }
}

async function _pollLoop() {
    while (_sshPollRunning) {
        try {
            await _pollQueuedFile();
        } catch (e) {
            debugLog(`[POLL] Loop error: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 3000));
    }
}

let _pollBusy = false;
async function _pollQueuedFile() {
    if (_pollBusy) return;
    _pollBusy = true;
    try {
        // First check local queue
        const resp = await fetch('/api/poll-file', { signal: AbortSignal.timeout(8000) });
        if (resp.ok) {
            const data = await resp.json();
            if (data.queued) {
                debugLog(`[POLL] Local queue detected: ${data.file}`);
                if (data.server) setSelectedServer(data.server);
                await fetchFileFromServer(data.file, data.server);
                return;
            }
        }

        // Check remote server queue (MC writes to ~/.msa_viewer_queue)
        // Only poll servers without jump host (direct SSH) to avoid timeouts
        const srvGroup = document.getElementById('sshServerBtnGroup');
        if (!srvGroup) return;
        for (const serverKey of _pollableServers) {
            try {
                const r = await fetch(`/api/ssh-poll-file?server=${encodeURIComponent(serverKey)}`,
                    { signal: AbortSignal.timeout(8000) });
                if (!r.ok) {
                    let detail = `HTTP ${r.status}`;
                    try {
                        const err = await r.json();
                        if (err?.error) detail = err.error;
                    } catch {}
                    debugLog(`[POLL] ${serverKey}: ${detail}`);
                    continue;
                }
                const data = await r.json();
                if (data.queued) {
                    debugLog(`[POLL] ${serverKey}: Queue detected: ${data.file}`);
                    setSelectedServer(serverKey);
                    await fetchFileFromServer(data.file, serverKey);
                    return;
                }
            } catch (e) {
                debugLog(`[POLL] ${serverKey}: ${e.message}`);
            }
        }
    } catch (e) {
        debugLog(`[POLL] Error: ${e.message}`);
    } finally {
        _pollBusy = false;
    }
}

// Manual queue checking (user clicks button) with debounce to prevent hammering
let _lastManualCheckTime = 0;
async function checkMCQueueOnce() {
    const now = Date.now();
    if (now - _lastManualCheckTime < 2000) {
        showMessage('Please wait 2 seconds before checking again', 2000);
        return;
    }
    _lastManualCheckTime = now;

    const btn = document.getElementById('checkQueueButton');
    if (btn) btn.disabled = true;
    const serverKey = getSelectedServer();
    _sshOpen('SSH - Queue Check');
    _sshLog(`Checking ${serverKey}...`);

    try {
        // Check selected server's queue directly (not via _pollQueuedFile which checks ALL)
        const r = await fetch(`/api/ssh-poll-file?server=${encodeURIComponent(serverKey)}`,
            { signal: AbortSignal.timeout(12000) });
        if (!r.ok) {
            let detail = `HTTP ${r.status}`;
            try {
                const err = await r.json();
                if (err?.error) detail = err.error;
            } catch {}
            _sshError(detail);
            return;
        }
        const data = await r.json();
        if (data.queued) {
            debugLog(`[POLL] ${serverKey}: Queue detected: ${data.file}`);
            _sshLog(`Found: ${data.file.split('/').pop()} - fetching...`, 'info');
            await fetchFileFromServer(data.file, serverKey);
        } else {
            _sshLog(`No file queued on ${serverKey}`);
            _sshConsoleCloseTimer = setTimeout(() => {
                const c = document.getElementById('sshConsole');
                if (c) c.style.display = 'none';
            }, 2000);
        }
    } catch (e) {
        _sshError(`Queue check error: ${e.message}`);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function fetchFileFromServer(filePath, serverKey) {
    if (!filePath || !filePath.trim()) {
        showMessage('Enter a file path', 2000);
        return;
    }
    filePath = filePath.trim();
    serverKey = serverKey || getSelectedServer();
    const btn = document.getElementById('sshLoadButton');
    const input = document.getElementById('sshPathInput');
    if (btn) btn.disabled = true;
    if (input) input.disabled = true;
    _sshLog(`Fetching ${filePath.split('/').pop()} from ${serverKey}...`);
    try {
        const url = `/api/ssh-cat?file=${encodeURIComponent(filePath)}&server=${encodeURIComponent(serverKey)}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (!resp.ok) {
            throw new Error(data.error || 'SSH fetch failed');
        }
        const fastaInputEl = document.getElementById('fastaInput');
        fastaInputEl.value = data.content;
        const fname = filePath.split('/').pop() || filePath;
        state.currentFilename = fname;
        state.currentFilePath = filePath;
        parseAndRender(true);
        _sshSuccess(`${fname} Ã‚Â· ${state.seqs.length} seq${state.seqs.length !== 1 ? 's' : ''} Ã‚Â· ${serverKey}`);
        // Auto-focus browser window and bring to front
        window.focus();
        // Flash title bar to attract attention
        const origTitle = document.title;
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            document.title = (flashCount % 2 === 0) ? `Ã¢Ëœâ€¦ LOADED: ${fname}` : origTitle;
            flashCount++;
            if (flashCount > 8 || document.hasFocus()) {
                document.title = origTitle;
                clearInterval(flashInterval);
            }
        }, 500);
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        if (document.hidden && Notification.permission === 'granted') {
            new Notification('ViewAlign', { body: `Loaded ${fname}` });
        }
    } catch (err) {
        _sshError(err.message);
    } finally {
        if (btn) btn.disabled = false;
        if (input) input.disabled = false;
    }
}

function _isPointInsideAlignmentContainer(clientX, clientY) {
    const container = document.getElementById('alignmentContainer');
    if (!container) return false;
    const rect = container.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function _handleInternalDragEnterOver(e) {
    if (_draggedSeqIndex < 0) return;
    if (!_isPointInsideAlignmentContainer(e.clientX, e.clientY)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function _getDraggedIndices(draggedIndex) {
    if (state.selectedRows.size > 1 && state.selectedRows.has(draggedIndex)) {
        return Array.from(state.selectedRows).sort((a, b) => a - b);
    }
    return [draggedIndex];
}

function _findNearestSequenceLine(clientY) {
    const container = document.getElementById('alignmentContainer');
    if (!container) return null;
    const lines = container.querySelectorAll('.seq-line[data-seq-index]');
    if (!lines.length) return null;
    let bestLine = null;
    let bestDist = Infinity;
    let insertAbove = true;
    for (const line of lines) {
        const rect = line.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dist = Math.abs(clientY - midY);
        if (dist < bestDist) {
            bestDist = dist;
            bestLine = line;
            insertAbove = clientY < midY;
        }
    }
    if (!bestLine) return null;
    return { line: bestLine, insertAbove };
}

function _moveDraggedSequences(draggedIndex, targetIndex, insertAbove) {
    let draggedIndices = _getDraggedIndices(draggedIndex);
    if (draggedIndices.includes(targetIndex)) return false;

    pushUndo('reorder');

    const seqsToMove = [];
    for (let i = draggedIndices.length - 1; i >= 0; i--) {
        seqsToMove.unshift(state.seqs.splice(draggedIndices[i], 1)[0]);
    }

    let removedBefore = 0;
    for (const di of draggedIndices) {
        if (di < targetIndex) removedBefore++;
    }
    targetIndex -= removedBefore;

    const insertAt = insertAbove ? targetIndex : targetIndex + 1;
    state.seqs.splice(insertAt, 0, ...seqsToMove);

    state.selectedRows.clear();
    for (let i = 0; i < seqsToMove.length; i++) {
        state.selectedRows.add(insertAt + i);
    }

    renderAlignment();
    updateRowSelections();
    if (seqsToMove.length === 1) {
        showMessage(`"${seqsToMove[0].header}" moved to position ${insertAt + 1}`, 2000);
    } else {
        showMessage(`${seqsToMove.length} sequences moved to position ${insertAt + 1}`, 2000);
    }
    return true;
}

function _startRowReorderDrag(e, index) {
    _rowReorderDrag = {
        startX: e.clientX,
        startY: e.clientY,
        draggedIndex: index,
        started: false
    };
}

function _handleRowReorderMove(e) {
    if (!_rowReorderDrag) return;
    const dx = e.clientX - _rowReorderDrag.startX;
    const dy = e.clientY - _rowReorderDrag.startY;
    if (!_rowReorderDrag.started) {
        if ((dx * dx + dy * dy) < 16) return;
        _rowReorderDrag.started = true;
        _draggedSeqIndex = _rowReorderDrag.draggedIndex;
        document.body.classList.add('no-select');
        _highlightDragSources();
        document.body.classList.add('row-reorder-active');
    }
    const nearest = _findNearestSequenceLine(e.clientY);
    if (nearest) {
        const nameEl = nearest.line.querySelector('.seq-name');
        if (nameEl) {
            const cls = nearest.insertAbove ? 'drag-insert-above' : 'drag-insert-below';
            if (_dragPreviewEl !== nameEl || _dragPreviewClass !== cls) {
                _clearDragInsertPreview();
                const indicator = _getDragIndicatorEl();
                indicator.style.left = `${nameEl.offsetLeft + 6}px`;
                indicator.style.width = `${Math.max(8, nameEl.offsetWidth - 12)}px`;
                indicator.style.top = nearest.insertAbove ? '-1px' : 'auto';
                indicator.style.bottom = nearest.insertAbove ? 'auto' : '-1px';
                nearest.line.appendChild(indicator);
                _dragPreviewEl = nameEl;
                _dragPreviewClass = cls;
                _dragPreviewInsertAbove = nearest.insertAbove;
            }
        }
    }
    e.preventDefault();
}

function _finishRowReorderDrag(e) {
    if (!_rowReorderDrag) return;
    const drag = _rowReorderDrag;
    _rowReorderDrag = null;
    document.body.classList.remove('no-select');
    document.body.classList.remove('row-reorder-active');
    if (!drag.started) {
        _clearDragInsertPreview();
        _clearDragSources();
        _draggedSeqIndex = -1;
        return;
    }
    const nearest = _findNearestSequenceLine(e.clientY);
    if (nearest) {
        const targetIndex = parseInt(nearest.line.dataset.seqIndex);
        if (!isNaN(targetIndex)) {
            _moveDraggedSequences(drag.draggedIndex, targetIndex, nearest.insertAbove);
        }
    }
    _clearDragInsertPreview();
    _clearDragSources();
    _draggedSeqIndex = -1;
}

function handleDragStart(e) {
    try {
        e.preventDefault();
        if (!e || !e.dataTransfer) return;
        const nameEl = e.target?.closest('.seq-name');
        if (!nameEl) return;
        const seqIndex = nameEl.dataset.seqIndex;
        if (seqIndex === undefined || seqIndex === null) return;
        _draggedSeqIndex = parseInt(seqIndex);
        e.dataTransfer.setData('text/plain', String(seqIndex));
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setDragImage(_getDragImageEl(), 0, 0);
        // Highlight dragged sequence(s)
        _highlightDragSources();
    } catch (err) {
        console.warn('dragstart error', err);
    }
}

function _highlightDragSources() {
    // Determine which sequences are being dragged
    const indices = (state.selectedRows.size > 1 && state.selectedRows.has(_draggedSeqIndex))
        ? state.selectedRows
        : new Set([_draggedSeqIndex]);
    document.querySelectorAll('.seq-name').forEach(el => {
        const idx = parseInt(el.dataset.seqIndex);
        if (!isNaN(idx) && indices.has(idx)) {
            el.classList.add('drag-source');
        }
    });
}

function _clearDragSources() {
    document.querySelectorAll('.seq-name.drag-source').forEach(el => {
        el.classList.remove('drag-source');
    });
}

function handleDragEnd(e) {
    try {
        _clearDragInsertPreview();
        _clearDragSources();
        _draggedSeqIndex = -1;
        _dragPreviewInsertAbove = true;
        document.body.classList.remove('row-reorder-active');
    } catch (err) {
        console.warn('dragend error', err);
    }
}

function _showDragInsertPreview(e, container) {
    // Find the closest seq-line to the cursor
    const lines = container.querySelectorAll('.seq-line[data-seq-index]');
    if (!lines.length) return;

    let bestLine = null;
    let bestDist = Infinity;
    let insertAbove = true;

    for (const line of lines) {
        const rect = line.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dist = Math.abs(e.clientY - midY);
        if (dist < bestDist) {
            bestDist = dist;
            bestLine = line;
            insertAbove = e.clientY < midY;
        }
    }
    if (!bestLine) return;

    // Skip consensus lines and scale lines
    if (bestLine.classList.contains('consensus-line') || bestLine.classList.contains('scale-ruler-line')) return;

    const nameEl = bestLine.querySelector('.seq-name');
    if (!nameEl) return;

    const cls = insertAbove ? 'drag-insert-above' : 'drag-insert-below';
    // Skip if same element + same side
    if (_dragPreviewEl === nameEl && _dragPreviewClass === cls) return;
    // Clear previous
    _clearDragInsertPreview();
    // Apply a robust in-element indicator only in the names column
    const indicator = _getDragIndicatorEl();
    indicator.style.top = insertAbove ? '0' : 'auto';
    indicator.style.bottom = insertAbove ? 'auto' : '0';
    nameEl.appendChild(indicator);
    _dragPreviewEl = nameEl;
    _dragPreviewClass = cls;
    _dragPreviewInsertAbove = insertAbove;
}

function _clearDragInsertPreview() {
    if (_dragPreviewEl) {
        _dragPreviewEl = null;
        _dragPreviewClass = '';
    }
    const indicator = document.getElementById('drag-name-indicator');
    if (indicator) indicator.remove();
}

window.handleDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();

    // Capture preview state before clearing
    const insertAbove = _dragPreviewInsertAbove;
    const previewNameEl = _dragPreviewEl;
    _clearDragInsertPreview();
    _clearDragSources();

    try {
        const draggedIndex = _draggedSeqIndex;
        _draggedSeqIndex = -1;
        if (draggedIndex < 0) return;

        // Find target line from last preview or nearest line
        let targetLine = previewNameEl
            ? previewNameEl.closest('.seq-line')
            : e.target?.closest('.seq-line');

        // If dropped on a non-seq area, find the nearest seq-line
        if (!targetLine || targetLine.classList.contains('consensus-line') || targetLine.classList.contains('scale-ruler-line')) {
            const container = document.getElementById('alignmentContainer');
            if (!container) return;
            const lines = container.querySelectorAll('.seq-line[data-seq-index]');
            let bestLine = null;
            let bestDist = Infinity;
            for (const line of lines) {
                const rect = line.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const dist = Math.abs(e.clientY - midY);
                if (dist < bestDist) { bestDist = dist; bestLine = line; }
            }
            targetLine = bestLine;
        }
        if (!targetLine) return;

        const targetIndexStr = targetLine.dataset.seqIndex;
        if (!targetIndexStr) return;

        let targetIndex = parseInt(targetIndexStr);
        if (isNaN(targetIndex)) return;

        _moveDraggedSequences(draggedIndex, targetIndex, insertAbove);
    } catch (err) {
        console.warn('drop error', err);
    }
};
// DOM ELEMENTS
const el = id => document.getElementById(id);
const dropZone = el('dropZone');
const fastaInput = el('fastaInput');
const alignmentContainer = el('alignmentContainer');
const tooltip = el('tooltip');
const statusMessage = el('statusMessage');
const minimizeBar = el('minimizeBar');
const infoModal = el('infoModal');
// Wire consensus fallback select to trigger re-render
const consensusFallbackSelect = el('consensusFallback');
if (consensusFallbackSelect) {
    consensusFallbackSelect.addEventListener('change', () => {
        debounceRender();
    });
}
// Quick sanity check: ensure essential elements exist to avoid silent failures
if (!fastaInput || !alignmentContainer || !statusMessage) {
    console.error('Essential DOM elements missing:', {
        fastaInput: !!fastaInput,
        alignmentContainer: !!alignmentContainer,
        statusMessage: !!statusMessage
    });
    if (statusMessage) {
        statusMessage.textContent = 'Error: missing essential UI elements. Check console for details.';
        statusMessage.style.display = 'block';
    }
}
// UTILITY FUNCTIONS
function showMessage(msg, duration = 2000) {
    statusMessage.textContent = msg;
    statusMessage.style.display = 'block';
    if (duration > 0) setTimeout(() => { statusMessage.style.display = 'none'; }, duration);
}

const EXCLUSIVE_MODAL_IDS = [
    'infoModal',
    'colourInspectorModal',
    'clusteringModal',
    'seqEditModal',
    'addSeqModal',
    'dotPlotModal',
    'repeatFinderModal',
    'treeBuilderModal',
    'statsModal'
];

function showExclusiveModal(id) {
    EXCLUSIVE_MODAL_IDS.forEach(modalId => {
        if (modalId === id) return;
        const modal = el(modalId);
        if (modal) modal.style.display = 'none';
    });
    const modal = el(id);
    if (modal) modal.style.display = 'block';
    return modal;
}

// SSH mini-console helpers
let _sshConsoleCloseTimer = null;
function _sshOpen(title) {
    const cons = document.getElementById('sshConsole');
    const body = document.getElementById('sshConsoleBody');
    const titleEl = document.getElementById('sshConsoleTitle');
    if (!cons) return;
    if (_sshConsoleCloseTimer) { clearTimeout(_sshConsoleCloseTimer); _sshConsoleCloseTimer = null; }
    if (body) body.innerHTML = '';
    if (titleEl && title) titleEl.textContent = title;
    cons.style.display = 'block';
}
function _sshLog(msg, type = 'plain') {
    const body = document.getElementById('sshConsoleBody');
    const cons = document.getElementById('sshConsole');
    if (!body || !cons) return;
    if (cons.style.display === 'none') { body.innerHTML = ''; cons.style.display = 'block'; }
    if (_sshConsoleCloseTimer) { clearTimeout(_sshConsoleCloseTimer); _sshConsoleCloseTimer = null; }
    const line = document.createElement('div');
    line.className = `ssh-line ssh-line-${type}`;
    line.textContent = msg;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
}
function _sshSuccess(msg) {
    _sshLog('Ã¢Å“â€œ ' + msg, 'ok');
    _sshConsoleCloseTimer = setTimeout(() => {
        const cons = document.getElementById('sshConsole');
        if (cons) cons.style.display = 'none';
    }, 2500);
}
function _sshError(msg) { _sshLog('Ã¢Å“â€” ' + msg, 'err'); }

// Tooltip helper functions with viewport-aware positioning
function showTooltipAt(content, target, options = {}) {
    if (!tooltip || !target) return;
    // Reset to base class then optionally extend
    tooltip.className = 'tooltip';
    if (options.className) {
        tooltip.className += ' ' + options.className;
    }
    if (options.html) {
        tooltip.innerHTML = content;
    } else {
        tooltip.textContent = content;
    }
    tooltip.style.display = 'block';

    // Force a reflow to get accurate dimensions after content is set
    const tooltipWidth = tooltip.offsetWidth || 150;
    const tooltipHeight = tooltip.offsetHeight || 30;
    const gapSize = 8;

    // Get target position
    const rect = target.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Try to center horizontally above the target
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.top - tooltipHeight - gapSize;
    let useTransform = false;

    // Clamp horizontal position to keep tooltip on screen
    const padding = 5;
    if (left < padding) {
        left = padding;
    } else if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
    }

    // If tooltip goes above viewport, position it below instead
    if (top < padding) {
        top = rect.bottom + gapSize;
    }

    // Add scroll offset for absolute positioning
    tooltip.style.position = 'fixed';
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.transform = 'none';
}

function hideTooltip() {
    if (!tooltip) return;
    tooltip.style.display = 'none';
    tooltip.className = 'tooltip';
}

// Menu stability: JS owns open state; short delay only when leaving a menu entirely
const menuCloseDelays = new Map();
const MENU_CLOSE_DELAY = 120; // milliseconds Ã¢â‚¬â€ gap tolerance when moving to dropdown

function clearMenuCloseDelay(section) {
    if (menuCloseDelays.has(section)) {
        clearTimeout(menuCloseDelays.get(section));
        menuCloseDelays.delete(section);
    }
}

function closeOtherMenusExcept(activeSection) {
    document.querySelectorAll('.menu-section').forEach(section => {
        if (section === activeSection) return;
        clearMenuCloseDelay(section);
        section.classList.remove('menu-open');
        section.classList.remove('hover-active');
    });
}

function openMenuSection(section) {
    closeOtherMenusExcept(section);
    clearMenuCloseDelay(section);
    section.classList.add('menu-open');
}

function setupMenuStability() {
    const menuSections = document.querySelectorAll('.menu-section');
    menuSections.forEach(section => {
        const controlGroup = section.querySelector('.control-group');

        section.addEventListener('mouseenter', () => {
            openMenuSection(section);
        });

        section.addEventListener('mouseleave', () => {
            // Check if any input in this menu is focused (autocomplete might be open)
            const hasFocusedInput = controlGroup?.querySelector('input:focus') !== null;

            if (hasFocusedInput) {
                // Don't close if input is focused - let blur event handle it
                return;
            }

            // Brief delay when leaving menu entirely; switching sections closes others immediately
            const timeoutId = setTimeout(() => {
                section.classList.remove('menu-open');
                section.classList.remove('hover-active');
                menuCloseDelays.delete(section);
            }, MENU_CLOSE_DELAY);
            menuCloseDelays.set(section, timeoutId);
        });

        // Keep menu open when hovering over control-group
        if (controlGroup) {
            controlGroup.addEventListener('mouseenter', () => {
                openMenuSection(section);
            });

            // Close menu when blur happens and mouse is not hovering
            controlGroup.querySelectorAll('input').forEach(input => {
                input.addEventListener('blur', () => {
                    // Check if mouse is still over the section
                    if (!section.matches(':hover')) {
                        section.classList.remove('menu-open');
                        section.classList.remove('hover-active');
                        clearMenuCloseDelay(section);
                    }
                });
            });
        }
    });
}

function updateSliderBackground(slider) {
    if (!slider) return;
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.setProperty('--slider-value', value + '%');
}

function updateNameLengthSliderRange() {
    if (state.seqs.length === 0) return;

    // If "No limit" is active, skip slider updates
    if (el('nameLengthNoLimit')?.checked) return;

    // Use the display header (first token) only to size the name column,
    // so long descriptions in fullHeader don't blow up spacing.
    const maxNameLength = Math.max(...state.seqs.map(s => s.header.length));

    const slider = el('nameLengthSlider');
    const input = el('nameLengthInput');

    if (slider && input) {
        // Set range from 3 to maximum name length + 2 buffer (with minimum of 12 for reasonable display)
        // The +2 buffer ensures that when slider is set to max name length, the full display name is visible
        const newMax = Math.max(maxNameLength + 2, 12);

        // Update slider attributes
        slider.min = 3;
        slider.max = newMax;

        // Update input attributes
        input.min = 3;
        input.max = newMax;

    // Set slider to maximum display length when loading new file
    slider.value = newMax;
    input.value = newMax;

        // Update the state to reflect the new value
        state.nameLength = newMax;

        // If current value is below new min, adjust it
        if (parseInt(slider.value) < 3) {
            slider.value = 3;
            input.value = 3;
        }

        // Update slider background
        updateSliderBackground(slider);

        // Update title to reflect new range
        slider.title = `Adjust sequence name display length (3-${newMax} characters)`;

    }
}

function clampConsensusPercent(value) {
    const num = parseInt(value, 10);
    if (Number.isNaN(num)) return DEFAULTS.consensusThreshold;
    return Math.max(30, Math.min(100, num));
}

function clampGroupConsensusPercent(value) {
    const num = parseInt(value, 10);
    // Deprecated: group consensus threshold removed; fall back to general threshold
    if (Number.isNaN(num)) return DEFAULTS.consensusThreshold;
    return Math.max(30, Math.min(100, num));
}

function clampNameLength(value) {
    const num = parseInt(value, 10);
    if (Number.isNaN(num)) return DEFAULTS.nameLength;
    return Math.max(3, Math.min(50, num));
}
function clampMinCoverage(value) {
    const num = parseInt(value, 10);
    if (Number.isNaN(num)) return DEFAULTS.minCoverage;
    return Math.max(0, Math.min(100, num));
}

function setNameLengthUI(value, triggerRender = false) {
    if (el('nameLengthNoLimit')?.checked) {
        document.documentElement.style.setProperty('--nameLen', '9999');
        if (triggerRender) debounceRender();
        return;
    }
    const slider = el('nameLengthSlider');
    const input = el('nameLengthInput');
    const clamped = clampNameLength(value);
    if (slider) {
        slider.value = clamped;
        updateSliderBackground(slider);
    }
    if (input) {
        input.value = clamped;
    }
    document.documentElement.style.setProperty('--nameLen', clamped);
    if (triggerRender) {
        debounceRender();
    }
}

function setConsensusThresholdUI(value, triggerRender = false) {
    const slider = el('consensusThreshold');
    const input = el('consensusThresholdInput');
    const clamped = clampConsensusPercent(value);
    if (slider) {
        slider.min = 30;
        slider.max = 100;
        slider.value = clamped;
        updateSliderBackground(slider);
    }
    if (input) {
        input.min = 30;
        input.max = 100;
        input.value = clamped;
    }
    if (triggerRender) {
        debounceRender();
    }
}

function setGroupConsensusThresholdUI(value, triggerRender = false) {
    // Deprecated control; safely no-op
}

function setConsensusThresholdDefault(value, options = {}) {
    const clamped = clampConsensusPercent(value);
    DEFAULTS.consensusThreshold = clamped;
    const applyNow = options.applyNow !== false;
    if (applyNow) {
        setConsensusThresholdUI(clamped, Boolean(options.triggerRender));
    }
}

window.setConsensusThresholdDefault = setConsensusThresholdDefault;

function toggleStickyNames() {
    const sticky = el('stickyNames').checked;
    document.querySelectorAll('.seq-name').forEach(name => {
        name.classList.toggle('static', !sticky);
    });
    alignmentContainer.offsetHeight; // Force reflow
    // DOM mode picks this up via the CSS class toggle above (no .seq-name
    // elements exist in Canvas mode); Canvas bakes stickyNames into its
    // render closure instead, so it needs an explicit re-render to take effect.
    if (document.getElementById('modeCanvas')?.checked) debounceRender();
}
function calculateGaplessPositions(sequence) {
    const positions = [];
    let gaplessCount = 0;
    for (let i = 0; i < sequence.length; i++) {
        const char = sequence[i];
        if (char !== '-' && char !== '.') {
            gaplessCount++;
        }
        positions.push(gaplessCount);
    }
    return positions;
}
function reverseComplement(seq) {
    const complement = { 'A':'T','T':'A','C':'G','G':'C','N':'N','-':'-','.':'.', 'U':'A','R':'Y','Y':'R','M':'K','K':'M','S':'S','W':'W','H':'D','B':'V','V':'B','D':'H' };
    return seq.split('').reverse().map(b => complement[b] || 'N').join('');
}

function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return null;
    const num = parseInt(clean, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getComplementaryColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#00FFFF';
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const compHue = (hsl.h + 180) % 360;
    return hslToHex(compHue, Math.min(hsl.s + 10, 90), Math.min(hsl.l + 5, 85));
}
// IUPAC ambiguity code resolver for a set of standard bases
// Input: Array or Set containing any of A,C,G,T,U (U is treated as T)
// Output: Single IUPAC character representing the set, or 'N' if not resolvable
function iupacFromBases(bases) {
    if (!bases || (Array.isArray(bases) && bases.length === 0)) return 'N';
    const set = new Set();
    for (const b of bases) {
        if (!b) continue;
        const up = String(b).toUpperCase();
        if (up === 'U') set.add('T');
        else if (['A','C','G','T'].includes(up)) set.add(up);
    }
    if (set.size === 0) return 'N';
    if (set.size === 1) return [...set][0];
    const key = [...set].sort().join('');
    switch (key) {
        case 'AG': return 'R';
        case 'CT': return 'Y';
        case 'AC': return 'M';
        case 'GT': return 'K';
        case 'CG': return 'S';
        case 'AT': return 'W';
        case 'ACT': return 'H';
        case 'CGT': return 'B';
        case 'AGT': return 'D';
        case 'ACG': return 'V';
        case 'ACGT': return 'N';
        default: return 'N';
    }
}
// Map an IUPAC code back to the set of standard bases it represents
function iupacToBases(code) {
    const c = String(code || '').toUpperCase();
    switch (c) {
        case 'A': return ['A'];
        case 'C': return ['C'];
        case 'G': return ['G'];
        case 'T':
        case 'U': return ['T'];
        case 'R': return ['A','G'];
        case 'Y': return ['C','T'];
        case 'M': return ['A','C'];
        case 'K': return ['G','T'];
        case 'S': return ['C','G'];
        case 'W': return ['A','T'];
        case 'H': return ['A','C','T'];
        case 'B': return ['C','G','T'];
        case 'D': return ['A','G','T'];
        case 'V': return ['A','C','G'];
        case 'N': return ['A','C','G','T'];
        default: return [];
    }
}

// Unified consensus calculator used for:
//  - Displayed consensus (via renderAlignment when showConsensus true)
//  - Group consensus insertion / replacement
//  - Copy Selected Consensus
// Options derive from current UI controls so all paths stay identical.
// Returns full length consensus string (with gaps retained); caller can strip gaps if needed.
function _getConsensusOptions() {
    return {
        threshold: clampConsensusPercent(el('consensusThreshold').value) / 100,
        coverageMin: clampMinCoverage(el('consensusMinCoverage')?.value) / 100,
        consType: document.querySelector('input[name="consensusType"]:checked').value,
        fallbackMode: (document.getElementById('consensusFallback')?.value) || 'gap',
    };
}

function _computeConsensusCharForColumn(seqArray, pos, opts) {
    const { threshold, coverageMin, consType, fallbackMode } = opts;
    const col = seqArray.map(s => (s[pos] || '-').toUpperCase());
    const nonGapCol = col.filter(b => b !== '-' && b !== '.');
    if (nonGapCol.length === 0) return '-';
    const coverage = nonGapCol.length / seqArray.length;
    if (coverage < coverageMin) return '-';
    const counts = {};
    nonGapCol.forEach(b => counts[b] = (counts[b] || 0) + 1);
    const maxCount = Math.max(...Object.values(counts));
    const maxBases = Object.keys(counts).filter(b => counts[b] === maxCount);
    const freq = maxCount / col.length; // denominator includes gaps for consistency with display
    if (freq >= threshold) {
        const stdTop = maxBases.map(b => (b === 'U' ? 'T' : b)).filter(b => ['A','C','G','T'].includes(b));
        if (consType === 'ambiguous') {
            if (stdTop.length >= 2) return iupacFromBases(stdTop);
            if (stdTop.length === 1) return stdTop[0];
            return maxBases.sort()[0];
        }
        const normalBases = ['A','C','G','T'].filter(b => counts[b]);
        if (normalBases.length > 0) {
            const maxNormal = Math.max(...normalBases.map(b => counts[b] || 0));
            return normalBases.filter(b => (counts[b] || 0) === maxNormal).sort()[0];
        }
        return maxBases.sort()[0];
    }
    const presentStd = Object.keys(counts).map(b => (b === 'U' ? 'T' : b)).filter(b => ['A','C','G','T'].includes(b));
    const uniqueStd = Array.from(new Set(presentStd));
    if (fallbackMode === 'iupac' && uniqueStd.length >= 2) return iupacFromBases(uniqueStd);
    if (fallbackMode === 'n' && uniqueStd.length >= 2) return 'N';
    return '-';
}

function computeConsensusForSequences(seqArray) {
    if (!seqArray || seqArray.length === 0) return '';
    const len = Math.max(...seqArray.map(s => s.length));
    const opts = _getConsensusOptions();
    let out = '';
    for (let pos = 0; pos < len; pos++) {
        out += _computeConsensusCharForColumn(seqArray, pos, opts);
    }
    return out;
}

// Timesliced twin of computeConsensusForSequences, for the Canvas-mode
// deferred path where consensus isn't displayed but is still computed lazily
// for features like "Copy Consensus". Never blocks the main thread for more
// than ~8ms per slice, regardless of alignment size.
function computeConsensusForSequencesChunked(seqArray, onDone, token) {
    if (!seqArray || seqArray.length === 0) { onDone(''); return; }
    const len = Math.max(...seqArray.map(s => s.length));
    const opts = _getConsensusOptions();
    const chars = new Array(len);
    let pos = 0;
    function step() {
        if (token && token.cancelled) return;
        const t0 = performance.now();
        while (pos < len && (performance.now() - t0) < 8) {
            chars[pos] = _computeConsensusCharForColumn(seqArray, pos, opts);
            pos++;
        }
        if (pos < len) {
            setTimeout(step, 0);
        } else {
            onDone(chars.join(''));
        }
    }
    step();
}
// PARSING FUNCTIONS

// SAM/BAM detection - detects @HD/@SQ headers or tab-separated CIGAR lines
function _isSamInput(text) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return false;
    const headerLines = lines.filter(l => l.startsWith('@'));
    if (headerLines.length > 0) {
        return headerLines.some(l => l.startsWith('@HD') || l.startsWith('@SQ') || l.startsWith('@PG'));
    }
    const nonHeader = lines.filter(l => !l.startsWith('@'));
    if (nonHeader.length === 0) return false;
    const sample = nonHeader[0].split('\t');
    if (sample.length < 10) return false;
    const cigar = sample[5] || '';
    return /^(\d+[MIDNSHP=X])+$/.test(cigar);
}

// Expand CIGAR string into aligned read + reference sequences
function _expandCigar(readSeq, cigar, refSeq, refStart) {
    let readPos = 0, refPos = 0;
    let alignedRead = '', alignedRef = '';
    const ops = cigar.match(/\d+[MIDNSHP=X]/g) || [];
    for (const op of ops) {
        const len = parseInt(op);
        const type = op[op.length - 1];
        switch (type) {
            case 'M': case '=': case 'X':
                for (let i = 0; i < len; i++) {
                    alignedRead += readSeq[readPos + i] || 'N';
                    alignedRef += refSeq ? (refSeq[refStart + refPos + i] || 'N') : (readSeq[readPos + i] || 'N');
                }
                readPos += len; refPos += len;
                break;
            case 'I':
                for (let i = 0; i < len; i++) { alignedRead += readSeq[readPos + i] || 'N'; alignedRef += '-'; }
                readPos += len;
                break;
            case 'D':
                for (let i = 0; i < len; i++) { alignedRead += '-'; alignedRef += refSeq ? (refSeq[refStart + refPos + i] || 'N') : 'N'; }
                refPos += len;
                break;
            case 'S':
                for (let i = 0; i < len; i++) { alignedRead += (readSeq[readPos + i] || 'n').toLowerCase(); alignedRef += '-'; }
                readPos += len;
                break;
            case 'H': break;
            case 'N':
                for (let i = 0; i < len; i++) { alignedRead += '-'; alignedRef += refSeq ? (refSeq[refStart + refPos + i] || 'N') : 'N'; }
                refPos += len;
                break;
            case 'P': refPos += len; break;
        }
    }
    return { alignedRead, alignedRef };
}

// CIGAR reference span (M/D/N/= operations)
function _cigarRefSpan(cigar) {
    let span = 0;
    const ops = cigar.match(/\d+[MIDNSHP=X]/g) || [];
    for (const op of ops) {
        const len = parseInt(op);
        if ('MDN=X'.includes(op[op.length - 1])) span += len;
    }
    return span;
}
/**
 * Parse GenBank flatfile format.
 * Extracts: LOCUS name, DEFINITION, ACCESSION, ORGANISM,
 * FEATURES (source, CDS, gene annotations with positions).
 * Sequence from ORIGIN block.
 */
function parseGenBank(text) {
    const lines = text.split(/\r?\n/);
    let locus = '', definition = '', accession = '', organism = '', version = '';
    let inFeatures = false, inOrigin = false, inOrganism = false;
    let seqParts = [];
    const features = [];
    let currentFeature = null;
    let currentQualifierKey = null;

    function flushCurrentFeature() {
        if (currentFeature) features.push(currentFeature);
        currentFeature = null;
        currentQualifierKey = null;
    }

    for (const rawLine of lines) {
        const line = rawLine.replace(/\s+$/, '');
        const trimmed = line.trim();

        // End of record
        if (trimmed === '//') break;

        // HEADER fields
        if (/^LOCUS\s+/i.test(trimmed)) {
            const parts = trimmed.split(/\s+/);
            if (parts.length > 1) locus = parts.slice(1).join(' ');
            continue;
        }
        if (/^DEFINITION\s+/i.test(trimmed)) {
            definition = trimmed.replace(/^DEFINITION\s+/i, '');
            continue;
        }
        if (/^ACCESSION\s+/i.test(trimmed)) {
            accession = trimmed.replace(/^ACCESSION\s+/i, '');
            continue;
        }
        if (/^VERSION\s+/i.test(trimmed)) {
            version = trimmed.replace(/^VERSION\s+/i, '');
            continue;
        }

        // ORGANISM block (multi-line)
        if (/^\s*ORGANISM\s+/i.test(line)) {
            organism = line.replace(/^\s*ORGANISM\s+/i, '');
            inOrganism = true;
            continue;
        }
        if (inOrganism && /^\s{5,}\S/.test(line)) {
            organism += ' ' + trimmed;
            continue;
        } else {
            inOrganism = false;
        }

        // FEATURES block
        if (trimmed === 'FEATURES' || trimmed.startsWith('FEATURES ')) {
            inFeatures = true;
            continue;
        }
        if (inFeatures) {
            if (trimmed === 'ORIGIN' || /^\s{0,4}\w/.test(line) && !line.startsWith('     ')) {
                flushCurrentFeature();
                inFeatures = false;
            } else {
                const fline = trimmed;
                // Feature key line (starts with a keyword)
                if (/^(source|CDS|gene|mRNA|tRNA|rRNA|misc_feature|repeat_region|STS|primer_bind|promoter|exon|intron|misc_RNA|regulatory|LTR|misc_binding|misc_signal|misc_difference|variation|misc_recomb|mobile_element|oriT|protein_bind|stem_loop|sig_peptide|mat_peptide|transit_peptide|3'UTR|5'UTR|polyA_site|D-loop|TATA_signal|RBS|enhancer|CAAT_signal|GC_signal|terminator|rep_origin|D_segment|J_segment|V_segment|C_region|N_region|S_region|gap|assembly_gap|centromere|telomere|operon|iDNA|misc_structure)\b/.test(fline)) {
                    flushCurrentFeature();
                    const match = fline.match(/^([A-Za-z0-9_'.-]+)\s*(.+)?/);
                    currentFeature = { type: match[1], location: match[2] || '', qualifiers: {} };
                } else if (currentFeature && fline.startsWith('/')) {
                    // Qualifier line
                    const qmatch = fline.match(/^\/([^=]+)(?:=([\s\S]*))?$/);
                    if (qmatch) {
                        currentQualifierKey = qmatch[1];
                        const value = qmatch[2] === undefined ? true : qmatch[2].replace(/^"/, '').replace(/"$/, '');
                        currentFeature.qualifiers[currentQualifierKey] = value;
                    }
                } else if (currentFeature && currentQualifierKey && fline) {
                    const previous = currentFeature.qualifiers[currentQualifierKey];
                    const continuation = fline.replace(/"$/, '');
                    currentFeature.qualifiers[currentQualifierKey] =
                        previous === true ? continuation : `${previous} ${continuation}`.trim();
                }
                continue;
            }
        }

        // ORIGIN (sequence)
        if (trimmed.startsWith('ORIGIN')) {
            inOrigin = true;
            continue;
        }
        if (inOrigin) {
            // Remove line numbers and spaces
            const seq = trimmed.replace(/^\d+\s*/, '').replace(/\s+/g, '').toUpperCase();
            if (seq && !/^[\/\/]/.test(seq)) seqParts.push(seq);
        }
    }

    // Flush last feature
    flushCurrentFeature();

    const sequence = seqParts.join('');
    if (!sequence) return null;

    // Build header from metadata
    let header = locus || (accession ? `${accession}` : 'GenBank_import');
    if (organism) {
        const org = organism.split(/[;.]/)[0]?.trim();
        if (org) header += ` [${org}]`;
    }
    if (definition) {
        const def = definition.length > 80 ? definition.substring(0, 77) + '...' : definition;
        header += ` ${def}`;
    }

    // Store GenBank annotations in state for display
    state._genbankAnnotations = {
        locus, definition, accession, version, organism,
        features, sequenceLength: sequence.length
    };

    return [{
        header: header,
        seq: sequence,
        _genbank: { accession, organism, features }
    }];
}

// Parse SAM into FASTA-like alignment (pileup reference + gapped reads)
function parseSamToAlignment(samText) {
    const lines = samText.split('\n').filter(l => l.trim() && !l.startsWith('@'));
    if (lines.length === 0) return null;

    const records = [];
    for (const line of lines) {
        const f = line.split('\t');
        if (f.length < 10) continue;
        const flag = parseInt(f[1]) || 0;
        if (flag & 0x904) continue; // unmapped or secondary/supplementary
        if (!f[5] || f[5] === '*' || !f[9] || f[9] === '*') continue;
        records.push({ qname: f[0], rname: f[2], pos: parseInt(f[3]) - 1, cigar: f[5], seq: f[9], flag,
            mpos: f[7] !== '=' && f[7] !== '*' ? parseInt(f[7]) - 1 : -1, tlen: parseInt(f[8]) || 0 });
    }
    if (records.length === 0) return null;

    // Determine coordinate range
    let minPos = Infinity, maxPos = 0;
    for (const r of records) {
        const span = _cigarRefSpan(r.cigar);
        minPos = Math.min(minPos, r.pos);
        maxPos = Math.max(maxPos, r.pos + span);
    }
    const refLen = maxPos - minPos;

    // Build pileup consensus reference
    const pileup = new Array(refLen).fill(null).map(() => ({}));
    for (const r of records) {
        const ops = r.cigar.match(/\d+[MIDNSHP=X]/g) || [];
        let rp = 0, refp = r.pos - minPos;
        for (const op of ops) {
            const len = parseInt(op);
            const t = op[op.length - 1];
            if (t === 'M' || t === '=' || t === 'X') {
                for (let i = 0; i < len; i++) {
                    const b = (r.seq[rp + i] || 'N').toUpperCase();
                    const idx = refp + i;
                    if (idx >= 0 && idx < refLen) { const c = pileup[idx]; c[b] = (c[b] || 0) + 1; }
                }
                rp += len; refp += len;
            } else if (t === 'I' || t === 'S') { rp += len; }
            else if (t === 'D' || t === 'N') { refp += len; }
        }
    }

    let refSeq = '';
    for (const counts of pileup) {
        let best = 'N', bestN = 0;
        for (const [b, n] of Object.entries(counts)) { if (n > bestN) { bestN = n; best = b; } }
        refSeq += best;
    }

    // Build output sequences: reference first, then reads
    const seqs = [{
        header: 'REF',
        fullHeader: 'REF_' + (minPos + 1) + '-' + maxPos,
        seq: refSeq,
        gaplessPositions: calculateGaplessPositions(refSeq)
    }];

    for (const r of records) {
        const { alignedRead } = _expandCigar(r.seq, r.cigar, refSeq, r.pos - minPos);
        const leftPad = Math.max(0, r.pos - minPos);
        const rightLen = refLen - (leftPad + alignedRead.length);
        const fullSeq = '-'.repeat(leftPad) + alignedRead + '-'.repeat(Math.max(0, rightLen));
        seqs.push({
            header: r.qname,
            fullHeader: r.qname + ' pos=' + (r.pos + 1) + ' cigar=' + r.cigar,
            seq: fullSeq,
            gaplessPositions: calculateGaplessPositions(fullSeq),
            _samPair: (r.flag & 0x1) ? { flag: r.flag, mpos: r.mpos, tlen: r.tlen } : null
        });
    }

    return seqs;
}

// =====================================================================
// CODON ANALYSIS (MACSE-inspired)
// Genetic code - Standard (NCBI table 1)
// =====================================================================
const _GENETIC_CODE = {
    'TTT':'F','TTC':'F','TTA':'L','TTG':'L','TCT':'S','TCC':'S','TCA':'S','TCG':'S',
    'TAT':'Y','TAC':'Y','TAA':'*','TAG':'*','TGT':'C','TGC':'C','TGA':'*','TGG':'W',
    'CTT':'L','CTC':'L','CTA':'L','CTG':'L','CCT':'P','CCC':'P','CCA':'P','CCG':'P',
    'CAT':'H','CAC':'H','CAA':'Q','CAG':'Q','CGT':'R','CGC':'R','CGA':'R','CGG':'R',
    'ATT':'I','ATC':'I','ATA':'I','ATG':'M','ACT':'T','ACC':'T','ACA':'T','ACG':'T',
    'AAT':'N','AAC':'N','AAA':'K','AAG':'K','AGT':'S','AGC':'S','AGA':'R','AGG':'R',
    'GTT':'V','GTC':'V','GTA':'V','GTG':'V','GCT':'A','GCC':'A','GCA':'A','GCG':'A',
    'GAT':'D','GAC':'D','GAA':'E','GAG':'E','GGT':'G','GGC':'G','GGA':'G','GGG':'G'
};

// Genetic code variants - only differences from Standard
const _CODE_VARIANTS = {
    '2': { // Vertebrate Mitochondrial
        'AGA':'*','AGG':'*','ATA':'M','TGA':'W'
    },
    '3': { // Yeast Mitochondrial
        'ATA':'M','CTT':'T','CTC':'T','CTA':'T','CTG':'T','TGA':'W',
        'CGA':null,'CGC':null // absent codons
    },
    '4': { // Mold / Protozoan / Coelenterate Mitochondrial + Mycoplasma/Spiroplasma
        'TGA':'W'
    },
    '5': { // Invertebrate Mitochondrial
        'AGA':'S','AGG':'S','ATA':'M','TGA':'W'
    },
    '6': { // Ciliate / Dasycladacean / Hexamita Nuclear
        'TAA':'Q','TAG':'Q'
    },
    '9': { // Echinoderm / Flatworm Mitochondrial
        'AAA':'N','AGA':'S','AGG':'S','TGA':'W'
    },
    '10': { // Euplotid Nuclear
        'TGA':'C'
    },
    '11': { // Bacterial / Archaeal / Plant Plastid (same as Standard)
    },
    '12': { // Alternative Yeast Nuclear
        'CTG':'S'
    },
    '13': { // Ascidian Mitochondrial
        'AGA':'G','AGG':'G','ATA':'M','TGA':'W'
    },
    '14': { // Alternative Flatworm Mitochondrial
        'AAA':'N','AGA':'S','AGG':'S','TAA':'Y','TGA':'W'
    },
    '16': { // Chlorophycean Mitochondrial
        'TAG':'L'
    },
    '21': { // Trematode Mitochondrial
        'TGA':'W','ATA':'M','AGA':'S','AGG':'S','AAA':'N'
    },
    '22': { // Scenedesmus obliquus Mitochondrial
        'TCA':'*','TAG':'L'
    }
};

// Build active code from selected variant
function _getActiveCode() {
    const sel = document.getElementById('codonCode');
    const tableId = sel ? sel.value : '1';
    const code = Object.assign({}, _GENETIC_CODE);
    const overrides = _CODE_VARIANTS[tableId] || {};
    for (const [codon, aa] of Object.entries(overrides)) {
        if (aa === null) delete code[codon];
        else code[codon] = aa;
    }
    return code;
}

// Build synonymous codon map for the active code
function _getSynCodons(code) {
    const syn = {};
    for (const codon of Object.keys(code)) {
        syn[codon] = new Set();
        const aa = code[codon];
        for (const c2 of Object.keys(code)) {
            if (code[c2] === aa && c2 !== codon) syn[codon].add(c2);
        }
    }
    return syn;
}

// Synonymous mutation check for each codon position
const _SYN_CODONS = {}; // codon -> Set of synonymous codons
for (const [codon, aa] of Object.entries(_GENETIC_CODE)) {
    if (!_SYN_CODONS[codon]) _SYN_CODONS[codon] = new Set();
    for (const [c2, a2] of Object.entries(_GENETIC_CODE)) {
        if (a2 === aa && c2 !== codon) _SYN_CODONS[codon].add(c2);
    }
}

// Compute per-position codon analysis for a single frame (frameOffset = 0,1,2 alignment columns)
// Gaps are skipped during codon assembly (no frameshift on gaps); incomplete terminal codons flagged.
// When frameOffset is omitted, defaults to 0 (backward-compatible single-frame mode).
function _computeCodonAnalysis(seqs, len, frameOffset) {
    frameOffset = frameOffset || 0;
    if (seqs.length < 1) return null;
    const ntRe = /^[ACGTUacgtuNn-]+$/;
    for (const s of seqs) {
        const cleaned = s.seq.replace(/[-.]/g, '');
        if (cleaned.length > 0 && !ntRe.test(cleaned)) return null;
    }
    if (len % 3 !== 0) { len -= len % 3; if (len < 3) return null; }

    const activeCode = _getActiveCode();
    const nSeqs = seqs.length;
    const phase = new Array(nSeqs).fill(null).map(() => new Array(len).fill(-1));
    const stops = new Array(nSeqs).fill(null).map(() => []);
    const frameShifts = new Array(nSeqs).fill(null).map(() => []);
    const synNonSyn = new Array(nSeqs).fill(null).map(() => new Array(len).fill(null));
    const aaSeq = new Array(nSeqs).fill(null).map(() => []);

    const refIdx = 0;
    const refSeq = seqs[refIdx].seq;

    for (let i = 0; i < nSeqs; i++) {
        const seq = seqs[i].seq;
        let codonPhase = 0;
        let codonBuf = '';
        let codonCols = [];

        for (let pos = 0; pos < len; pos++) {
            const base = seq[pos];
            const isGap = base === '-' || base === '.';

            // Skip alignment columns before frameOffset
            if (pos < frameOffset) continue;

            // Gaps are skipped (preserve reading frame); no frameshift on gaps
            if (isGap) continue;

            // Non-gap base - add to codon
            phase[i][pos] = codonPhase;
            codonBuf += base.toUpperCase();
            codonCols.push(pos);
            codonPhase++;

            if (codonPhase >= 3) {
                const codon = codonBuf.replace(/[Nn]/g, 'N');
                const aa = activeCode[codon] || 'X';
                aaSeq[i].push({ cols: codonCols.slice(), codon, aa });

                if (aa === '*') {
                    for (const c of codonCols) stops[i].push(c);
                }

                // Syn/non-syn check vs reference (frame 0 only for consistency)
                if (i !== refIdx && frameOffset === 0) {
                    const refCodon = codonCols.map(c => (refSeq[c] || '-').toUpperCase()).join('');
                    const refAA = activeCode[refCodon] || 'X';
                    if (aa === refAA && codon !== refCodon) {
                        for (const c of codonCols) synNonSyn[i][c] = 'syn';
                    } else if (aa !== refAA) {
                        for (let k = 0; k < 3; k++) {
                            const mutCodon = refCodon.substring(0,k) + codon[k] + refCodon.substring(k+1);
                            const mutAA = activeCode[mutCodon] || 'X';
                            if (mutAA !== refAA) {
                                synNonSyn[i][codonCols[k]] = 'nonsyn';
                            } else {
                                synNonSyn[i][codonCols[k]] = 'syn';
                            }
                        }
                    }
                }

                codonPhase = 0;
                codonBuf = '';
                codonCols = [];
            }
        }

        if (codonPhase > 0 && codonPhase < 3) {
            frameShifts[i].push({ pos: len - 1, phase: codonPhase, type: 'incomplete' });
        }
    }

    return { phase, stops, frameShifts, synNonSyn, aaSeq, refIdx, frameOffset };
}

// Compute codon analysis for all three reading frames
// Returns { frames: [frame0, frame1, frame2], refIdx, bestFrame }
function _computeMultiFrameCodonAnalysis(seqs, len) {
    const frames = [];
    for (let fr = 0; fr < 3; fr++) {
        frames.push(_computeCodonAnalysis(seqs, len, fr));
    }
    // Auto-detect best frame: fewest total stop codons
    const stopSums = frames.map((f, fi) => ({
        frame: fi,
        totalStops: f.stops.reduce((a, b) => a + b.length, 0)
    }));
    stopSums.sort((a, b) => a.totalStops - b.totalStops);
    const bestFrame = stopSums[0].frame;
    return { frames, refIdx: 0, bestFrame };
}

// CANVAS-BASED RENDERER - for large alignments
// Draws only visible area, no per-residue DOM nodes
// =====================================================================
// totalContentW: current alignment's full pixel width (for the persistent scrollbar's thumb sizing).
// onOffsetChange: optional callback (registered by setupPersistentScrollbar) invoked after each
// draw() so the scrollbar can mirror wheel-scroll/drag-pan that didn't originate from the bar itself.
const _canvasState = { offsetX: 0, offsetY: 0, ctx: null, metrics: null, seqsLen: 0, scheduleDraw: null, totalContentW: 0, onOffsetChange: null };
// Cancellation token for the Canvas mode's deferred (chunked) conservation/
// consensus jobs; reassigned + old one cancelled on every render so a
// superseded background job can't clobber a newer one's results.
let _canvasDeferredToken = null;

function _initCanvasMetrics(ctx, fontSizePx) {
    // Cache is keyed on font size so zoom changes (which resize the DOM font)
    // invalidate stale metrics instead of leaving Canvas mode stuck at 12px.
    if (_canvasState.metrics && _canvasState.metrics.fontSizePx === fontSizePx) return _canvasState.metrics;
    ctx.font = fontSizePx + 'px "Courier New", monospace';
    const m = ctx.measureText('X');
    const charH = (m.fontBoundingBoxAscent && m.fontBoundingBoxDescent)
        ? m.fontBoundingBoxAscent + m.fontBoundingBoxDescent
        : Math.ceil(fontSizePx * 1.15);
    _canvasState.metrics = { charW: Math.ceil(m.width), charH: Math.ceil(charH), fontSizePx };
    return _canvasState.metrics;
}

// Reads the shading palette from the same CSS custom properties the DOM
// renderer uses (customizable via the black/dark/light colour pickers), so
// Canvas mode's conservation colours stay in sync with Normal mode instead
// of drifting to a hardcoded, unrelated palette.
function _getCanvasShadePalette() {
    const rs = getComputedStyle(document.documentElement);
    const v = (name, fallback) => (rs.getPropertyValue(name) || '').trim() || fallback;
    return {
        blackBg: v('--blackShading', '#000'), blackFg: v('--blackText', 'white'),
        darkBg: v('--darkShading', '#555'), darkFg: v('--darkText', 'white'),
        lightBg: v('--lightShading', '#ccc'), lightFg: v('--lightText', 'black'),
    };
}

function _renderCanvasAlignment(len, conservationData, shadeMode, blackThresh, darkThresh, lightThresh,
                                  enableBlack, enableDark, enableLight, nameLen, stickyNames) {
    alignmentContainer.innerHTML = '';
    alignmentContainer.style.overflow = 'hidden';
    alignmentContainer.style.position = 'relative';
    // Canvas mode needs explicit height since absolute canvas has no flow height
    const top = alignmentContainer.getBoundingClientRect().top;
    alignmentContainer.style.height = (window.innerHeight - top - 28) + 'px';

    const canvas = document.createElement('canvas');
    canvas.id = 'alignmentCanvas';
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    alignmentContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    // Match the current zoom level so Canvas mode's text size tracks Normal
    // mode's font-size (set on this same container by setZoom) instead of
    // staying pinned at a hardcoded size regardless of the zoom slider.
    const fontSizePx = parseFloat(getComputedStyle(alignmentContainer).fontSize) || 13;
    const fontStr = fontSizePx + 'px "Courier New", monospace';
    const nameFontStr = 'bold ' + fontStr; // matches Normal mode's bold .seq-name
    const m = _initCanvasMetrics(ctx, fontSizePx);
    const CHAR_W = m.charW;
    const CHAR_H = m.charH;
    const NAME_W = nameLen * CHAR_W + 8;
    // Glyph cache: pre-rendered (char, bg-color, fg-color) → off-screen canvas
    // Turns fillRect()+fillText() into a single drawImage() per cell after warm-up
    const _glyphCache = new Map();
    function _makeGlyph(ch, bg, fg) {
        const k = ch + '| ' + (bg||' ') + '| ' + fg + '| ' + dpr;
        let g = _glyphCache.get(k);
        if (!g) {
            g = document.createElement('canvas');
            g.width = Math.ceil(CHAR_W * dpr);
            g.height = Math.ceil(CHAR_H * dpr);
            const c2 = g.getContext('2d');
            c2.setTransform(dpr, 0, 0, dpr, 0, 0);
            c2.font = fontStr; c2.textBaseline = 'top';
            if (bg) { c2.fillStyle = bg; c2.fillRect(0, 0, CHAR_W, CHAR_H); }
            c2.fillStyle = fg; c2.fillText(ch, 0, 0);
            _glyphCache.set(k, g);
        }
        return g;
    }

    const nSeqs = state.seqs.length;
    const SCALE_H = CHAR_H; // one row at top, matching Full/Block .scale-ruler-line
    let _lastOffX = -1, _lastOffY = -1, _dirty = false;
    function _markDirty() { _dirty = true; }

    const totalContentW = NAME_W + len * CHAR_W + 4;
    const totalContentH = SCALE_H + nSeqs * CHAR_H + 4;
    // Exposed so the persistent horizontal scrollbar (a real DOM element,
    // since Canvas mode's own content isn't natively scrollable) can size
    // its thumb and mirror pan position.
    _canvasState.totalContentW = totalContentW;

    // Resize canvas to viewport
    function resize() {
        const rect = alignmentContainer.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    let drawRaf = 0;
    function scheduleDraw() {
        if (drawRaf) return;
        drawRaf = requestAnimationFrame(() => {
            drawRaf = 0;
            draw();
        });
    }
    _canvasState.scheduleDraw = scheduleDraw;

    resize();
    window.addEventListener('resize', () => { resize(); _markDirty(); scheduleDraw(); });
    setAlignmentColorSchemeClass();

    // Clamp offsets
    function clampOffsets() {
        const w = parseInt(canvas.style.width) || 800;
        const h = parseInt(canvas.style.height) || 600;
        _canvasState.offsetX = Math.max(0, Math.min(_canvasState.offsetX, totalContentW - w));
        _canvasState.offsetY = Math.max(0, Math.min(_canvasState.offsetY, totalContentH - h));
    }

    // Draw
    function draw() {
        clampOffsets();
        // Skip if offset hasn't changed and not explicitly marked dirty
        if (!_dirty && _canvasState.offsetX === _lastOffX && _canvasState.offsetY === _lastOffY) return;
        _lastOffX = _canvasState.offsetX; _lastOffY = _canvasState.offsetY; _dirty = false;
        const w = parseInt(canvas.style.width) || 800;
        const h = parseInt(canvas.style.height) || 600;
        const ox = _canvasState.offsetX;
        const oy = _canvasState.offsetY;
        const firstCol = Math.max(0, Math.floor((ox - NAME_W) / CHAR_W));
        const lastCol = Math.min(len - 1, Math.ceil((ox - NAME_W + w) / CHAR_W));
        const firstRow = Math.max(0, Math.floor((oy - SCALE_H) / CHAR_H));
        const lastRow = Math.min(nSeqs - 1, Math.floor((oy - SCALE_H + h - 1) / CHAR_H));

        ctx.clearRect(0, 0, w, h);
        ctx.font = fontStr;
        ctx.textBaseline = 'top';

        // Resolve the colour scheme and shading palette once per frame, not per
        // visible cell (getResidueSchemeStyle/getComputedStyle would otherwise be
        // recomputed for every glyph).
        const drawScheme = getEffectiveColorScheme();
        const pal = _getCanvasShadePalette();

        // Position scale (10, *, 20, * …) — only the visible column window, same
        // generateScale() as Full/Block mode; cost is O(visible cols), not alignment length.
        const scaleY = -oy;
        if (scaleY + SCALE_H > 0 && scaleY < h && firstCol <= lastCol) {
            const visCols = lastCol - firstCol + 1;
            const scaleText = generateScale(visCols, _canvasScaleInterval(CHAR_W), firstCol);
            if (stickyNames) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, scaleY, NAME_W, SCALE_H);
            }
            ctx.fillStyle = '#666';
            for (let j = 0; j < scaleText.length; j++) {
                const ch = scaleText[j];
                if (ch === ' ') continue;
                const x = NAME_W + (firstCol + j) * CHAR_W - ox;
                if (x + CHAR_W < 0 || x > w) continue;
                ctx.fillText(ch, x, scaleY);
            }
            ctx.fillStyle = '#ddd';
            ctx.fillRect(Math.max(0, NAME_W - ox), scaleY + SCALE_H - 1, w, 1);
        }

        for (let i = firstRow; i <= lastRow; i++) {
            const y = SCALE_H + i * CHAR_H - oy;
            const seq = state.seqs[i].seq;
            const consPos = conservationData;

            // Residues (glyph-cached: 1 drawImage per cell vs fillRect+fillText)
            for (let p = firstCol; p <= lastCol; p++) {
                const x = NAME_W + p * CHAR_W - ox;
                const base = seq[p] || '-';
                const baseUp = base.toUpperCase();
                const pd = consPos[p];
                const schemeStyle = getResidueSchemeStyle(base, drawScheme);
                // Defaults match Normal mode's ".other"/".gap" CSS classes so
                // unshaded residues render identically between the two modes.
                let textFill = '#000';
                let bgFill = null;

                if (schemeStyle) {
                    bgFill = schemeStyle.bg;
                    textFill = schemeStyle.fg;
                } else if (pd && pd.hasData && pd.hasValidCoverage) {
                    if (baseUp !== '-' && baseUp !== '.' && pd.consensusBases && pd.consensusBases.has(baseUp)) {
                        if (enableBlack && pd.conservation >= blackThresh) textFill = pal.blackFg, bgFill = pal.blackBg;
                        else if (enableDark && pd.conservation >= darkThresh) textFill = pal.darkFg, bgFill = pal.darkBg;
                        else if (enableLight && pd.conservation >= lightThresh) textFill = pal.lightFg, bgFill = pal.lightBg;
                    } else if (baseUp === '-' || baseUp === '.') {
                        textFill = '#888';
                        bgFill = '#fff';
                    }
                } else if (baseUp === '-' || baseUp === '.') {
                    textFill = '#888';
                    bgFill = '#fff';
                }

                // Single blit from glyph cache (eliminates fillStyle+fillRect+fillStyle+fillText)
                ctx.drawImage(_makeGlyph(base, bgFill, textFill), x, y, CHAR_W, CHAR_H);
            }

            // Sequence name — drawn last so it sits on top of any residues that
            // scrolled underneath it. Sticky mode pins it at a fixed screen x=0
            // with an opaque backing (matching Normal mode's sticky name column,
            // position:sticky + white background); non-sticky mode scrolls it
            // away with the content, like .seq-name.static.
            const name = state.seqs[i].header || ('Seq' + (i + 1));
            const displayName = name.length > nameLen ? name.substring(0, nameLen) + '\u2026' : name;
            ctx.font = nameFontStr;
            if (stickyNames) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, y, NAME_W, CHAR_H);
                ctx.fillStyle = '#333';
                ctx.fillText(displayName, 4, y);
            } else if (ox < NAME_W) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, y, NAME_W, CHAR_H);
                ctx.clip();
                ctx.fillStyle = '#333';
                ctx.fillText(displayName, 4 - ox, y);
                ctx.restore();
            }
            ctx.font = fontStr;
        }

        // Name column separator (fixed on-screen when sticky, scrolls with
        // content otherwise, matching the name column's own behaviour above)
        ctx.fillStyle = '#ddd';
        ctx.fillRect((stickyNames ? NAME_W : NAME_W - ox) - 2, 0, 1, totalContentH - oy);

        // Canvas mode has no native scrollable DOM node, so notify the
        // persistent horizontal scrollbar to mirror our internal pan offset.
        _canvasState.onOffsetChange?.();
    }
    resize();
    draw();

    // Scroll handling
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        _canvasState.offsetX += e.deltaX;
        _canvasState.offsetY += e.deltaY;
        scheduleDraw();
    }, { passive: false });

    // Touch/drag pan
    let dragging = false, dragStartX, dragStartY, dragOx, dragOy;
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            dragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragOx = _canvasState.offsetX;
            dragOy = _canvasState.offsetY;
            canvas.style.cursor = 'grabbing';
                   _markDirty();
        }
    });
    window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        _canvasState.offsetX = dragOx - (e.clientX - dragStartX);
        _canvasState.offsetY = dragOy - (e.clientY - dragStartY);
        scheduleDraw();
    });
    window.addEventListener('mouseup', () => {
        dragging = false;
        canvas.style.cursor = 'default';
    });

    scheduleDraw();
}

// Clustal (.aln) format parser
function parseClustal(text) {
    const lines = text.split(/\r?\n/);
    const seqMap = new Map();
    let started = false;
    for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith('//')) continue;
        if (t.startsWith('CLUSTAL')) { started = true; continue; }
        if (!started) continue;
        const m = t.match(/^(\S+)\s+(.+)$/);
        if (!m) continue;
        const name = m[1], seq = m[2].replace(/\s/g, '').replace(/\*/g, '-');
        if (!seqMap.has(name)) seqMap.set(name, '');
        seqMap.set(name, seqMap.get(name) + seq);
    }
    if (seqMap.size === 0) return null;
    const seqs = [];
    for (const [name, seq] of seqMap) {
        seqs.push({ header: name, fullHeader: name, seq: seq, gaplessPositions: calculateGaplessPositions(seq) });
    }
    return seqs;
}

// PHYLIP format parser (sequential and interleaved)
function parsePhylip(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return null;
    const hm = lines[0].trim().match(/^(\d+)\s+(\d+)/);
    if (!hm) return null;
    const nSeqs = parseInt(hm[1]), alignLen = parseInt(hm[2]);
    if (nSeqs < 1 || alignLen < 1) return null;
    const entries = [];
    for (let i = 1; i < lines.length && entries.length < nSeqs; i++) {
        const l = lines[i];
        if (l.length >= 10) {
            const name = l.substring(0, 10).trim();
            const seq = l.substring(10).replace(/\s/g, '');
            if (name && seq) entries.push({ name, seq });
        }
    }
    // Handle interleaved blocks
    if (entries.length === nSeqs) {
        let blockStart = 1 + nSeqs;
        while (blockStart < lines.length) {
            for (let k = 0; k < nSeqs && blockStart + k < lines.length; k++) {
                const l = lines[blockStart + k];
                const seq = l.replace(/^\s*\S+\s*/, '').replace(/\s/g, '');
                if (seq) entries[k].seq += seq;
            }
            blockStart += nSeqs;
        }
    }
    if (entries.length < nSeqs) return null;
    const seqs = [];
    for (const e of entries) {
        seqs.push({ header: e.name, fullHeader: e.name, seq: e.seq, gaplessPositions: calculateGaplessPositions(e.seq) });
    }
    return seqs;
}

// NEXUS format parser (DATA block with MATRIX)
function parseNexus(text) {
    const t = text.replace(/\r/g, '');
    const matrixIdx = t.search(/\bMATRIX\b/i);
    if (matrixIdx < 0) return null;
    // Find the matrix block content
    const block = t.substring(matrixIdx + 6);
    const endIdx = block.search(/;\s*end/i);
    const content = endIdx > 0 ? block.substring(0, endIdx) : block;
    const lines = content.split('\n');
    const seqMap = new Map();
    for (const line of lines) {
        const m = line.trim().match(/^(['\"]?)(\S+)\1\s+(.+)$/);
        if (!m) continue;
        const name = m[2];
        const seq = m[3].replace(/\s/g, '').replace(/[^A-Za-z?\-\.]/g, '');
        if (!seqMap.has(name)) seqMap.set(name, '');
        seqMap.set(name, seqMap.get(name) + seq);
    }
    if (seqMap.size === 0) return null;
    const seqs = [];
    for (const [name, seq] of seqMap) {
        seqs.push({ header: name, fullHeader: name, seq: seq, gaplessPositions: calculateGaplessPositions(seq) });
    }
    return seqs;
}

// Stockholm format parser (Pfam/HMMER/Rfam)
function parseStockholm(text) {
    const lines = text.split(/\r?\n/);
    const seqMap = new Map();
    let inAlign = false;
    for (const line of lines) {
        const t = line.trim();
        if (t === '//') break;
        if (t === '# STOCKHOLM 1.0' || t.startsWith('#=GF')) { inAlign = true; continue; }
        if (t.startsWith('#=GR') || t.startsWith('#=GC') || t.startsWith('#')) continue;
        if (!inAlign || !t) continue;
        const m = t.match(/^(\S+)\s+(.+)$/);
        if (!m) continue;
        const name = m[1], seq = m[2].replace(/\s/g, '').replace(/[.-]/g, '-');
        if (!seqMap.has(name)) seqMap.set(name, '');
        seqMap.set(name, seqMap.get(name) + seq);
    }
    if (seqMap.size === 0) return null;
    const seqs = [];
    for (const [name, seq] of seqMap) {
        seqs.push({ header: name, fullHeader: name, seq: seq, gaplessPositions: calculateGaplessPositions(seq) });
    }
    return seqs;
}

const FASTA_NUCLEOTIDE_CHARS = /^[ACGTUNRYMKSWHBVD.-]+$/i;
const FASTA_PROTEIN_ONLY_CHARS = /[EFILPQZXJO*]/i;

function _isProteinFastaSequence(rawSeq) {
    const seqType = el('mafftSeqType')?.value;
    if (seqType === '0' || seqType === '1') return true;
    const letters = String(rawSeq || '').replace(/[^A-Za-z*.-]/g, '');
    return FASTA_PROTEIN_ONLY_CHARS.test(letters) || !FASTA_NUCLEOTIDE_CHARS.test(letters);
}

function _sanitizeFastaSequence(rawSeq, isProtein) {
    const compact = String(rawSeq || '').replace(/\s+/g, '').toUpperCase().replace(/\./g, '-');
    if (isProtein) {
        return compact.replace(/[^ACDEFGHIKLMNPQRSTVWYBXZJUO*.-]/g, 'X');
    }
    return compact.replace(/[^ACGTUNRYMKSWHBVD.-]/g, 'N');
}

function _pushParsedFastaSequence(seqs, header, seq) {
    const cleanHeader = header.replace(/^>/, '').trim().replace(/\s+/g, ' ');
    const displayHeader = cleanHeader.split(/\s+/)[0] || 'unnamed';
    const processedSeq = _sanitizeFastaSequence(seq, _isProteinFastaSequence(seq));
    const gaplessPositions = calculateGaplessPositions(processedSeq);
    seqs.push({ header: displayHeader, fullHeader: cleanHeader, seq: processedSeq, gaplessPositions: gaplessPositions });
}

function parseFasta(text) {
    const lines = text.trim().split(/\r?\n/);
    const seqs = [];
    let seq = '', header = '';
    try {
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            if (line.startsWith('>')) {
                if (seq) {
                    _pushParsedFastaSequence(seqs, header, seq);
                    seq = '';
                }
                header = line;
            } else {
                seq += line.replace(/[^A-Za-z*.\-]/g, '');
            }
        }
        if (header && seq) {
            _pushParsedFastaSequence(seqs, header, seq);
        }
    } catch (err) {
        console.error('Error in parseFasta:', err);
        return null;
    }
    return seqs.length ? seqs : null;
}
function parseMsf(text) {
    const lines = text.trim().split(/\r?\n/);
    let i = 0;
    let isNucleic = true;
    let maxLen = 0;
    const seqMap = {};
    let names = [];
    // Find MSF header line
    const headerIndex = lines.findIndex(l => l.includes('MSF:') && l.includes('Check:'));
    if (headerIndex !== -1) {
        i = headerIndex;
        const headerLine = lines[headerIndex].trim();
        if (headerLine.includes('Type: P')) {
            isNucleic = false;
        } else if (headerLine.includes('Type: N')) {
            isNucleic = true;
        }
        i += 1; // Start after header
    } else {
        i = 0;
    }
    // Collect names from Name: lines before //
    while (i < lines.length) {
        let line = lines[i].trim();
        if (line === '//') {
            i += 1;
            break;
        }
        if (line.startsWith('Name:')) {
            const parts = line.split(/\s+/);
            let name = '';
            let j = 1; // after 'Name:'
            while (j < parts.length && !parts[j].startsWith('Len:')) {
                name += (name ? ' ' : '') + parts[j];
                j++;
            }
            if (name) {
                names.push(name);
            }
        }
        i += 1;
    }
    // Parse alignment blocks
    while (i < lines.length) {
        let line = lines[i].trim();
        if (!line) {
            i += 1;
            continue;
        }
        // Skip position lines like "1 50"
        if (/^\d+\s+\d+$/.test(line)) {
            i += 1;
            continue;
        }
        let foundName = null;
        for (let n of names) {
            if (line.startsWith(n)) {
                foundName = n;
                let seqPart = line.substring(n.length).trim();
                let blockSeq = seqPart.replace(/\s+/g, '').replace(/~/g, '-');
                if (!seqMap[foundName]) {
                    seqMap[foundName] = { header: foundName, fullHeader: foundName, seq: '' };
                }
                const seqObj = seqMap[foundName];
                seqObj.seq += blockSeq;
                if (seqObj.seq.length > maxLen) maxLen = seqObj.seq.length;
                break;
            }
        }
        i += 1;
    }
    const seqs = [];
    for (let name of names) {
        if (seqMap[name]) {
            let seqObj = seqMap[name];
            let processedSeq;
            if (isNucleic) {
                processedSeq = seqObj.seq.toUpperCase().replace(/[^ACGTUNRYMKSWHBVD\.\-]/g, 'N');
            } else {
                processedSeq = seqObj.seq.toUpperCase().replace(/[^A-Z\.\-]/g, 'X');
            }
            processedSeq = processedSeq.replace(/\./g, '-');
            while (processedSeq.length < maxLen) {
                processedSeq += '-';
            }
            const gaplessPositions = calculateGaplessPositions(processedSeq);
            const displayHeader = name.split(/\s+/)[0] || 'unnamed';
            seqs.push({ header: displayHeader, fullHeader: name, seq: processedSeq, gaplessPositions: gaplessPositions });
        }
    }
    return seqs.length ? seqs : null;
}
// VALIDATION FUNCTIONS
function validateThresholds() {
    const b = parseInt(el('blackSlider').value);
    const d = parseInt(el('darkSlider').value);
    const l = parseInt(el('lightSlider').value);
    if (b < d) {
        el('darkSlider').value = el('darkInput').value = b;
        showMessage("Dark threshold adjusted to match Black threshold", 3000);
    }
    if (d < l) {
        el('lightSlider').value = el('lightInput').value = d;
        showMessage("Light threshold adjusted to match Dark threshold", 3000);
    }
    ['blackSlider', 'darkSlider', 'lightSlider'].forEach(id => updateSliderBackground(el(id)));
}
// RENDERING FUNCTIONS
function initializeCollapsibleSections() {
    // Remove all collapsed classes to let CSS hover handle menu display
    document.querySelectorAll('.control-group').forEach(group => {
        group.classList.remove('collapsed');
        group.style.maxHeight = ''; // Clear inline styles
        group.style.display = ''; // Clear inline display - let CSS handle it
    });

    // Remove click handlers - menus now work on hover via CSS
    document.querySelectorAll('.section-header[data-section]').forEach(header => {
        header.classList.remove('collapsed');
        const toggleIcon = header.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.remove(); // Remove toggle icons since we're using hover
        }
    });
}

function toggleSection(e) {
    // No longer needed - hover handles display
}

function restoreCollapsedState() {
    // No longer needed - hover handles display via CSS
}

function toggleAllSections() {
    // No longer needed - hover handles display via CSS
    showMessage("Menus now work on hover", 2000);
}

function recalculateCollapsibleHeights() {
    // No longer needed - hover handles display via CSS
    // Do nothing - let CSS handle everything
}

function generateScale(maxLength, interval = 10, startPos = 0) {
    const scaleArray = new Array(maxLength).fill(' ');

    // Find the first multiple of interval in this block's range
    const startAbs = startPos + 1;
    const endAbs = startPos + maxLength;
    const firstMultiple = Math.ceil(startAbs / interval) * interval;

    // Show position markers at multiples of interval within this block
    for (let absPos = firstMultiple; absPos < endAbs; absPos += interval) {
        let label;
        // Alternate: 10 number, 20 *, 30 number, 40 *, etc.
        if ((absPos / interval) % 2 === 1) {
            label = absPos.toString();
        } else {
            label = '*';
        }

        const relIdx = absPos - startPos - 1; // 0-based index for the target position
        const startIdx = relIdx - (label.length - 1); // Right-align: last digit at relIdx

        // Only place the label if it fits completely within the block
        if (startIdx >= 0 && startIdx + label.length <= maxLength) {
            for (let i = 0; i < label.length; i++) {
                scaleArray[startIdx + i] = label[i];
            }
        }
    }

    return scaleArray.join('');
}

/** Scale tick spacing for Canvas mode: wider intervals when zoomed out so labels stay readable. */
function _canvasScaleInterval(charW) {
    if (charW >= 8) return 10;
    if (charW >= 5) return 20;
    if (charW >= 3) return 50;
    return 100;
}

const CONSERVATION_MIN_COVERAGE = 0.3; // Require at least 30% non-gap sequences for coloring

function _computeConservationForColumn(seqs, seqCount, pos, shadeMode) {
    // Count bases directly without creating intermediate arrays
    const counts = {};
    let nonGapCount = 0;

    for (let s = 0; s < seqCount; s++) {
        const rawBase = seqs[s].seq[pos] || '-';
        const base = rawBase.toUpperCase();
        if (base !== '-' && base !== '.') {
            counts[base] = (counts[base] || 0) + 1;
            nonGapCount++;
        }
    }

    if (nonGapCount === 0) return { hasData: false, hasValidCoverage: false };

    let maxCount = 0;
    for (const count of Object.values(counts)) {
        if (count > maxCount) maxCount = count;
    }

    const consensusBases = new Set();
    for (const [base, count] of Object.entries(counts)) {
        if (count === maxCount) consensusBases.add(base);
    }

    const denominator = shadeMode === 'all' ? seqCount : nonGapCount;
    const conservation = maxCount / denominator;
    const coverage = nonGapCount / seqCount;

    return {
        consensusBases,
        conservation,
        hasData: true,
        hasValidCoverage: coverage >= CONSERVATION_MIN_COVERAGE
    };
}

function preCalculateConservation(seqs, len, shadeMode) {
    const conservationData = new Array(len);
    const seqCount = seqs.length;
    for (let pos = 0; pos < len; pos++) {
        conservationData[pos] = _computeConservationForColumn(seqs, seqCount, pos, shadeMode);
    }
    return conservationData;
}

// Same computation as preCalculateConservation, but spread across timeslices
// (via setTimeout yields) so a very large alignment can never hold the main
// thread for more than ~8ms at a stretch. Used by the Canvas mode deferred
// shading pass, where the "freeze" reports came from.
function preCalculateConservationChunked(seqs, len, shadeMode, onDone, token) {
    const conservationData = new Array(len);
    const seqCount = seqs.length;
    let pos = 0;
    function step() {
        if (token && token.cancelled) return;
        const t0 = performance.now();
        while (pos < len && (performance.now() - t0) < 8) {
            conservationData[pos] = _computeConservationForColumn(seqs, seqCount, pos, shadeMode);
            pos++;
        }
        if (pos < len) {
            setTimeout(step, 0);
        } else {
            onDone(conservationData);
        }
    }
    step();
}

function getDeferredConservationData(len, shadeMode) {
    const cached = state.conservationDataCache;
    if (!cached || cached.shadeMode !== shadeMode || !cached.data) return null;
    if (cached.len === len) return cached.data;
    return Array.from({ length: len }, (_, pos) => cached.data[pos] || { hasData: false, hasValidCoverage: false });
}

function getDeferredConsensus(len) {
    const cached = state.consensusCache;
    if (!cached || !cached.values) return null;
    if (cached.len === len) return cached.values.slice();
    return Array.from({ length: len }, (_, pos) => cached.values[pos] || '-');
}

// Ã¢â€â‚¬Ã¢â€â‚¬ BAM / Reads Display Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// BAM state
let bamState = {
    reads: [],          // parsed BAM records
    refName: null,      // which reference these reads map to
    refSeq: null,       // reference sequence string
    refStart: 0,        // leftmost visible ref coordinate
    columns: [],        // expanded CIGAR columns per read: columns[row][col]
    readOrder: [],      // sorted read indices (by pos, then name)
};

/**
 * Show the BAM file picker when user clicks the BAM button.
 */
function handleOpenBamClick() {
    const input = document.getElementById('bamFileInput');
    if (input) input.click();
}

/**
 * Load and parse a BAM or SAM file.
 */
async function handleBamFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    showMessage('Loading BAMÃ¢â‚¬Â¦', 0);

    try {
        const ext = file.name.split('.').pop().toLowerCase();
        let buf;

        if (ext === 'sam') {
            // SAM is plain text Ã¢â‚¬â€ parse directly
            const text = await file.text();
            buf = parseSAMToBuffer(text);
        } else {
            // BAM binary Ã¢â‚¬â€ decompress with browser's DecompressionStream
            buf = await BamParser.decompressBAM(file);
        }

        // Parse header
        const header = BamParser.parseBAMHeader(buf);

        // Check reference match
        const loadedSeqs = state.seqs.map(s => ({ name: s.name, seq: s.seq }));
        const { matchedRef, warnings } = BamParser.checkRefMatch(
            header.refNames, header.refLengths, loadedSeqs
        );

        if (warnings.length) {
            warnings.forEach(w => console.warn('BAM:', w));
        }

        if (!matchedRef) {
            statusMessage.style.display = 'none';
            showMessage('BAM reference does not match loaded sequences. ' +
                'Load a reference FASTA first.', 5000);
            return;
        }

        // Parse records (stops at MAX_READS + 1)
        const { records, exceededLimit, totalReads } = BamParser.parseBAMRecords(buf, header.headerEndOffset);

        if (exceededLimit) {
            statusMessage.style.display = 'none';
            showMessage(
                `BAM has >${BamParser.MAX_READS} reads (found ${totalReads}). ` +
                'Please subset with samtools view -s or filter by region.',
                5000
            );
            return;
        }

        // Filter reads to matched reference
        const refIdx = header.refNames.indexOf(matchedRef);
        let matchedReads = records.filter(r => r.refID === refIdx);

        if (matchedReads.length === 0) {
            statusMessage.style.display = 'none';
            showMessage('No reads map to the matched reference.', 3000);
            return;
        }

        // Sort by position (pileup order)
        matchedReads.sort((a, b) => a.pos - b.pos || a.name.localeCompare(b.name));

        // Get reference sequence
        const refSeqObj = loadedSeqs.find(s => s.name === matchedRef);
        const refSeq = refSeqObj ? refSeqObj.seq.toUpperCase() : '';

        // Determine view window: leftmost read pos to rightmost read end
        let minPos = Infinity;
        let maxPos = 0;
        for (const r of matchedReads) {
            if (r.pos < minPos) minPos = r.pos;
            const readEnd = r.pos + computeReadSpan(r.cigar);
            if (readEnd > maxPos) maxPos = readEnd;
        }
        // Expand slightly for context
        minPos = Math.max(0, minPos - 10);
        maxPos = Math.min(refSeq.length, maxPos + 10);

        // Expand CIGAR for each read
        const columns = [];
        const readOrder = [];
        for (let i = 0; i < matchedReads.length; i++) {
            const r = matchedReads[i];
            const cols = BamParser.expandCigar(r, (refPos) => {
                if (refPos < 0 || refPos >= refSeq.length) return 'N';
                return refSeq[refPos];
            });
            columns.push(cols);
            readOrder.push(i);
        }

        // Store BAM state
        bamState = {
            reads: matchedReads,
            refName: matchedRef,
            refSeq,
            refStart: minPos,
            refEnd: maxPos,
            columns,
            readOrder,
        };

        // Switch to Full display mode and Reads view
        const singleRadio = document.getElementById('modeSingle');
        if (singleRadio) singleRadio.checked = true;
        const readsRadio = document.getElementById('modeReads');
        if (readsRadio) readsRadio.checked = true;

        renderAlignment();
        statusMessage.style.display = 'none';
        showMessage(`Loaded ${matchedReads.length} reads on ${matchedRef} (${minPos + 1}Ã¢â‚¬â€œ${maxPos})`, 2500);

    } catch (err) {
        statusMessage.style.display = 'none';
        console.error('BAM load error:', err);
        showMessage('Error loading BAM: ' + err.message, 4000);
    }

    // Reset file input so the same file can be re-selected
    event.target.value = '';
}

/**
 * Compute the total span of a read across the reference from its CIGAR.
 * Sum M, D, N operations (but not I or S).
 */
function computeReadSpan(cigar) {
    let span = 0;
    for (const op of cigar) {
        if (op.op === 'M' || op.op === '=' || op.op === 'X' || op.op === 'D' || op.op === 'N') {
            span += op.len;
        }
    }
    return span;
}

/**
 * Parse SAM text into a format compatible with the BAM parser's buffer output.
 * Simplified: creates a synthetic buffer-like object with SAM records.
 * In practice, we parse SAM as text and build record objects directly.
 */
function parseSAMToBuffer(text) {
    // Parse SAM as plain text Ã¢â‚¬â€ we'll build a pseudo-BAM buffer
    // This is simpler than trying to create binary BAM from SAM
    const lines = text.split('\n').filter(l => l.trim());
    const headerLines = [];
    const readLines = [];

    for (const line of lines) {
        if (line.startsWith('@')) {
            headerLines.push(line);
        } else {
            readLines.push(line);
        }
    }

    // Build a synthetic BAM-like header buffer
    // We'll create a minimal BAM header + encode records manually
    throw new Error(
        'SAM text input is not yet supported. ' +
        'Please convert to BAM first: samtools view -bS file.sam > file.bam'
    );
}

/**
 * Render the reads alignment view (BAM mode).
 * Shows reference track at top, reads below in pileup order.
 */
function renderReadsAlignment() {
    if (!bamState.reads.length || !bamState.refSeq) {
        alignmentContainer.innerHTML = '<div style="padding:20px;color:#888;">No reads loaded. Open a BAM file with the Ã°Å¸Â§Â¬ BAM button.</div>';
        return;
    }

    alignmentContainer.innerHTML = '';
    alignmentContainer.style.position = '';
    alignmentContainer.style.height = '';
    alignmentContainer.style.overflow = 'auto';

    const { reads, refSeq, refStart, refEnd, columns } = bamState;
    const viewLen = refEnd - refStart;
    const container = alignmentContainer;
    const cellW = 12; // px per base

    // Ã¢â€â‚¬Ã¢â€â‚¬ Reference track Ã¢â€â‚¬Ã¢â€â‚¬
    const refLine = document.createElement('div');
    refLine.className = 'seq-line ref-track-line';
    refLine.style.display = 'flex';
    refLine.style.alignItems = 'center';
    refLine.style.minHeight = '20px';
    refLine.style.borderBottom = '2px solid #333';
    refLine.style.position = 'sticky';
    refLine.style.top = '0';
    refLine.style.background = '#fafafa';
    refLine.style.zIndex = '2';

    // Reference name label
    const refLabel = document.createElement('span');
    refLabel.className = 'seq-name';
    refLabel.style.cssText = 'width:160px;min-width:160px;font-weight:bold;font-size:11px;padding:0 4px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    refLabel.textContent = bamState.refName;
    refLabel.title = bamState.refName;
    refLine.appendChild(refLabel);

    // Reference bases
    const refData = document.createElement('div');
    refData.className = 'seq-data';
    refData.style.display = 'flex';
    refData.style.flexWrap = 'nowrap';

    for (let p = refStart; p < refEnd; p++) {
        const base = refSeq[p] || 'N';
        const span = document.createElement('span');
        span.style.cssText = `display:inline-block;width:${cellW}px;text-align:center;font-size:10px;font-family:monospace;font-weight:bold;`;
        span.style.color = baseColorRef(base);
        span.textContent = base;
        span.dataset.pos = p;
        refData.appendChild(span);
    }
    refLine.appendChild(refData);
    container.appendChild(refLine);

    // Ã¢â€â‚¬Ã¢â€â‚¬ Scale ruler Ã¢â€â‚¬Ã¢â€â‚¬
    const scaleLine = document.createElement('div');
    scaleLine.className = 'seq-line scale-line';
    scaleLine.style.display = 'flex';
    scaleLine.style.alignItems = 'center';
    scaleLine.style.minHeight = '14px';
    scaleLine.style.background = '#f5f5f5';
    scaleLine.style.borderBottom = '1px solid #ddd';
    scaleLine.style.fontSize = '8px';
    scaleLine.style.color = '#888';
    scaleLine.style.position = 'sticky';
    scaleLine.style.top = '22px';
    scaleLine.style.zIndex = '1';

    const scaleLabel = document.createElement('span');
    scaleLabel.style.cssText = 'width:160px;min-width:160px;text-align:right;padding:0 4px;';
    scaleLine.appendChild(scaleLabel);

    const scaleData = document.createElement('div');
    scaleData.style.display = 'flex';
    // Show position ticks every 10 bases
    for (let p = refStart; p < refEnd; p++) {
        const span = document.createElement('span');
        span.style.cssText = `display:inline-block;width:${cellW}px;text-align:center;font-size:7px;`;
        if ((p + 1) % 10 === 0) {
            span.textContent = p + 1;
        } else if ((p + 1) % 5 === 0) {
            span.textContent = 'Ã‚Â·';
        }
        scaleData.appendChild(span);
    }
    scaleLine.appendChild(scaleData);
    container.appendChild(scaleLine);

    // Ã¢â€â‚¬Ã¢â€â‚¬ Read tracks Ã¢â€â‚¬Ã¢â€â‚¬
    for (let i = 0; i < reads.length; i++) {
        const read = reads[i];
        const readCols = columns[i];
        const isReverse = (read.flag & 0x10) !== 0; // reverse strand

        const readLine = document.createElement('div');
        readLine.className = 'seq-line read-track-line';
        readLine.style.display = 'flex';
        readLine.style.alignItems = 'center';
        readLine.style.minHeight = '16px';
        readLine.style.borderBottom = '1px solid #eee';

        // Read name label
        const nameSpan = document.createElement('span');
        nameSpan.className = 'seq-name';
        nameSpan.style.cssText = 'width:160px;min-width:160px;font-size:9px;padding:0 4px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#555;';
        nameSpan.textContent = isReverse ? 'Ã¢â€”â‚¬ ' + read.name : read.name + ' Ã¢â€“Â¶';
        nameSpan.title = `${read.name} pos=${read.pos + 1} mapq=${read.mapq} cigar=${BamParser.cigarToString(read.cigar)}`;
        readLine.appendChild(nameSpan);

        // Read data
        const dataDiv = document.createElement('div');
        dataDiv.className = 'seq-data';
        dataDiv.style.display = 'flex';

        for (let ci = 0; ci < readCols.length; ci++) {
            const col = readCols[ci];
            const span = document.createElement('span');
            span.style.cssText = `display:inline-block;width:${cellW}px;text-align:center;font-size:10px;font-family:monospace;`;

            switch (col.type) {
                case 'match':
                    span.textContent = 'Ã‚Â·'; // dot for match (clean IGV-like)
                    span.style.color = '#ccc';
                    break;
                case 'mismatch':
                    span.textContent = col.base;
                    span.style.color = '#555';
                    span.style.fontWeight = 'bold';
                    break;
                case 'insertion':
                    span.textContent = col.base;
                    span.style.color = '#4a90d9';
                    span.style.fontSize = '9px';
                    break;
                case 'deletion':
                    span.textContent = 'Ã¢Ë†â€™';
                    span.style.color = '#999';
                    span.style.fontSize = '11px';
                    break;
                case 'softclip':
                    span.textContent = col.base;
                    span.style.color = '#ccc';
                    span.style.opacity = '0.5';
                    break;
                case 'intron':
                    span.textContent = 'Ã‚Â·';
                    span.style.color = '#ddd';
                    break;
            }
            dataDiv.appendChild(span);
        }
        readLine.appendChild(dataDiv);
        container.appendChild(readLine);
    }
}

/**
 * Reference base color helper.
 */
function baseColorRef(base) {
    switch (base.toUpperCase()) {
        case 'A': return '#4caf50'; // green
        case 'C': return '#2196f3'; // blue
        case 'G': return '#ff9800'; // orange
        case 'T': return '#f44336'; // red
        case 'U': return '#9c27b0'; // purple
        default:  return '#999';   // grey
    }
}

/**
 * Show/hide the BAM button based on whether a reference sequence is loaded.
 */
// IGV-style compact read packing renderer
function renderCompactAlignment(len, conservationData, shadeMode, blackThresh, darkThresh, lightThresh,
    enableBlack, enableDark, enableLight, nameLen, stickyNames, standard, ambiguous, ambiguousMap,
    showConsensus, consType, threshold, fallbackMode, coverageMin) {

    alignmentContainer.innerHTML = '';
    // Reset styles from other modes (Canvas sets position/height/overflow)
    alignmentContainer.style.position = '';
    alignmentContainer.style.height = '';
    alignmentContainer.style.overflow = 'auto';
    state.spanCache = new Map();
    state.domSelectedNucs = new Map();
    state.domSelectedColumns = new Map();

    const seqs = state.seqs;
    const nSeqs = seqs.length;
    if (nSeqs === 0) return;

    // Find reference sequence (longest or first non-gappy)
    let refIdx = 0;
    let refLen = 0;
    let refGappiness = 999;
    for (let i = 0; i < nSeqs; i++) {
        const s = seqs[i].seq;
        const gapCount = (s.match(/[-.]/g) || []).length;
        const gappiness = gapCount / Math.max(1, s.length);
        if (s.length > refLen || (s.length === refLen && gappiness < refGappiness)) {
            refIdx = i;
            refLen = s.length;
            refGappiness = gappiness;
        }
    }

    // Parse read positions from reference-aligned sequences
    // Each read: {seqIdx, start, end, seq, name, mismatches[]}
    const reads = [];
    for (let i = 0; i < nSeqs; i++) {
        if (i === refIdx && nSeqs > 1) continue; // skip reference
        const s = seqs[i].seq;
        // Find first and last non-gap position
        let start = -1, end = -1;
        for (let p = 0; p < len; p++) {
            const ch = s[p] || '-';
            if (ch !== '-' && ch !== '.') {
                if (start < 0) start = p;
                end = p;
            }
        }
        if (start < 0) continue;
        const seq = s.substring(start, end + 1);
        const mismatches = [];
        const refSeq = seqs[refIdx].seq;
        for (let p = start; p <= end; p++) {
            const rb = (s[p] || '-').toUpperCase();
            const refb = (refSeq[p] || '-').toUpperCase();
            if (rb !== '-' && rb !== '.' && refb !== '-' && refb !== '.' && rb !== refb) {
                mismatches.push(p);
            }
        }
        reads.push({
            seqIdx: i,
            start, end, seq,
            name: seqs[i].header || ('Read' + (i + 1)),
            mismatches: new Set(mismatches),
            gaplessLen: seq.replace(/[-.]/g, '').length,
            _pairInfo: seqs[i]._samPair || null
        });
    }

    // Sort by start position
    reads.sort((a, b) => a.start - b.start);

    // Greedy track assignment
    const tracks = []; // tracks[trackIdx] = last-end position
    for (const read of reads) {
        let assigned = false;
        for (let t = 0; t < tracks.length; t++) {
            if (read.start >= tracks[t]) {
                tracks[t] = read.end + 1;
                read.track = t;
                assigned = true;
                break;
            }
        }
        if (!assigned) {
            read.track = tracks.length;
            tracks.push(read.end + 1);
        }
    }
    const nTracks = tracks.length;

    // Compute coverage per position
    const coverage = new Uint16Array(len);
    for (const read of reads) {
        for (let p = read.start; p <= read.end; p++) {
            const ch = seqs[read.seqIdx].seq[p] || '-';
            if (ch !== '-' && ch !== '.') coverage[p]++;
        }
    }
    const maxCov = Math.max(1, ...coverage);

    // Color helpers
    const bgColorPicker = document.getElementById('blackColorPicker');
    const dkColorPicker = document.getElementById('darkColorPicker');
    const ltColorPicker = document.getElementById('lightColorPicker');
    const defBlack = bgColorPicker?.value || '#000000';
    const defDark = dkColorPicker?.value || '#555555';
    const defLight = ltColorPicker?.value || '#cccccc';

    const getShade = (p, base) => {
        const cons = conservationData[p];
        if (!cons || cons.count === 0) return null;
        const count = (cons.baseCounts || {})[base.toUpperCase()] || 0;
        const pct = count / cons.count;
        if (enableBlack && pct >= blackThresh) return defBlack;
        if (enableDark && pct >= darkThresh) return defDark;
        if (enableLight && pct >= lightThresh) return defLight;
        return null;
    };

    const refSeq = seqs[refIdx].seq;
    const CHAR_W = 10;
    const ROW_H = 14;
    const COV_H = 50;
    const REF_H = 16;
    const TRACK_H = 12;
    const SCALE_H = 20;
    const NAME_W = Math.min(nameLen * 7, 200);
    const totalW = NAME_W + len * CHAR_W + 20;
    const totalH = COV_H + nTracks * TRACK_H + REF_H + SCALE_H + 20;

    // Build SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', totalW);
    svg.setAttribute('height', totalH);
    svg.setAttribute('style', 'font-family:monospace;font-size:11px;');
    svg.setAttribute('id', 'compactSvg');

    let y = 10;

    // Coverage histogram
    const covGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    for (let p = 0; p < len; p++) {
        const h = Math.max(1, (coverage[p] / maxCov) * COV_H);
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', NAME_W + p * CHAR_W);
        rect.setAttribute('y', y + COV_H - h);
        rect.setAttribute('width', CHAR_W - 1);
        rect.setAttribute('height', h);
        rect.setAttribute('fill', coverage[p] > 0 ? '#4682b4' : '#eee');
        covGroup.appendChild(rect);
    }
    // Coverage label
    const covLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    covLabel.setAttribute('x', 4);
    covLabel.setAttribute('y', y + COV_H / 2 + 4);
    covLabel.setAttribute('fill', '#333');
    covLabel.setAttribute('font-size', '10');
    covLabel.textContent = 'Coverage';
    covGroup.appendChild(covLabel);
    svg.appendChild(covGroup);
    y += COV_H + 4;

    // Read tracks
    const diffOnly = document.getElementById('compactDiffOnly')?.checked;
    const showPairs = document.getElementById('compactPairs')?.checked;
    const pairLines = []; // collect pair connections to draw after all tracks

    // Build pair map: qname -> [read1, read2]
    const pairMap = new Map();
    if (showPairs) {
        for (const read of reads) {
            if (!read._pairInfo) continue;
            const key = read.name;
            if (!pairMap.has(key)) pairMap.set(key, []);
            pairMap.get(key).push(read);
        }
    }

    for (let t = 0; t < nTracks; t++) {
        const trackReads = reads.filter(r => r.track === t);
        for (const read of trackReads) {
            const rx = NAME_W + read.start * CHAR_W;
            const rw = (read.end - read.start + 1) * CHAR_W;
            const ry = y;
            const rh = diffOnly ? 4 : TRACK_H - 2;

            if (diffOnly) {
                // Thin line mode - just a hairline with mismatch ticks
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', rx);
                line.setAttribute('y1', ry + 2);
                line.setAttribute('x2', rx + rw);
                line.setAttribute('y2', ry + 2);
                line.setAttribute('stroke', '#b0c4de');
                line.setAttribute('stroke-width', '1');
                svg.appendChild(line);
            } else {
                // Full bar mode
                const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                bar.setAttribute('x', rx);
                bar.setAttribute('y', ry);
                bar.setAttribute('width', rw);
                bar.setAttribute('height', rh);
                bar.setAttribute('fill', '#c8d8e8');
                bar.setAttribute('stroke', '#8ab4d6');
                bar.setAttribute('stroke-width', '0.5');
                bar.setAttribute('rx', '2');
                svg.appendChild(bar);
            }

            // Mismatch marks (always shown)
            for (const mp of read.mismatches) {
                const mx = NAME_W + mp * CHAR_W + CHAR_W / 2;
                const mark = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                mark.setAttribute('x', mx - 1);
                mark.setAttribute('y', ry);
                mark.setAttribute('width', 2);
                mark.setAttribute('height', diffOnly ? 4 : rh);
                mark.setAttribute('fill', '#e74c3c');
                svg.appendChild(mark);
            }

            // Read name label (only when enough space Ã¢â‚¬â€ not in diffOnly thin-line mode)
            if (!diffOnly && NAME_W > 30) {
                const name = read.name;
                const maxChars = Math.max(3, Math.floor(rw / 6));
                if (maxChars > 2) {
                    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    label.setAttribute('x', rx + 2);
                    label.setAttribute('y', ry + rh - 3);
                    label.setAttribute('fill', '#555');
                    label.setAttribute('font-size', '7');
                    label.setAttribute('font-family', 'monospace');
                    label.setAttribute('clip-path', `inset(0 ${rw - NAME_W + rx}px 0 0)`);
                    label.textContent = name.substring(0, maxChars);
                    svg.appendChild(label);
                }
            }

            // Collect pair info for connecting lines
            if (showPairs && read._pairInfo) {
                const mates = pairMap.get(read.name);
                if (mates && mates.length === 2) {
                    const other = mates[0] === read ? mates[1] : mates[0];
                    // Store: {track, read} for connection drawing
                    pairLines.push({
                        t1: t, t2: other.track,
                        x1: NAME_W + read.start * CHAR_W + rw / 2,
                        x2: NAME_W + other.start * CHAR_W + (other.end - other.start + 1) * CHAR_W / 2,
                        y1: y + rh / 2,
                        y2: -1 // filled after all tracks rendered
                    });
                }
            }
        }
        y += diffOnly ? 6 : TRACK_H;
    }

    // Draw pair connecting lines
    if (showPairs && pairLines.length > 0) {
        for (const pl of pairLines) {
            if (pl.y2 < 0) {
                // Find y2 from the mate's track
                const mateTrack = pl.t2;
                const trackY = COV_H + 4 + mateTrack * (diffOnly ? 6 : TRACK_H) + (diffOnly ? 2 : TRACK_H / 2);
                pl.y2 = trackY;
            }
            const conn = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            conn.setAttribute('x1', pl.x1);
            conn.setAttribute('y1', pl.y1);
            conn.setAttribute('x2', pl.x2);
            conn.setAttribute('y2', pl.y2);
            conn.setAttribute('stroke', '#999');
            conn.setAttribute('stroke-width', '0.5');
            conn.setAttribute('stroke-dasharray', '3,2');
            conn.setAttribute('opacity', '0.5');
            svg.appendChild(conn);
        }
    }

    y += 4;

    // Reference sequence
    const refLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    refLabel.setAttribute('x', 4);
    refLabel.setAttribute('y', y + 12);
    refLabel.setAttribute('fill', '#333');
    refLabel.setAttribute('font-weight', 'bold');
    refLabel.setAttribute('font-size', '10');
    refLabel.textContent = seqs[refIdx].header || 'Reference';
    svg.appendChild(refLabel);

    for (let p = 0; p < len; p++) {
        const base = refSeq[p] || '-';
        const shade = getShade(p, base);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', NAME_W + p * CHAR_W + CHAR_W / 2);
        text.setAttribute('y', y + 12);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', shade || '#333');
        text.setAttribute('font-weight', shade ? 'bold' : 'normal');
        text.setAttribute('font-size', '10');
        text.textContent = base;
        svg.appendChild(text);

        // Background rect for shaded positions
        if (shade) {
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bg.setAttribute('x', NAME_W + p * CHAR_W);
            bg.setAttribute('y', y + 1);
            bg.setAttribute('width', CHAR_W - 1);
            bg.setAttribute('height', REF_H - 2);
            bg.setAttribute('fill', shade);
            bg.setAttribute('opacity', '0.3');
            svg.insertBefore(bg, text);
        }
    }

    // Scale ruler
    y += REF_H + 4;
    for (let p = 0; p < len; p += 5) {
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', NAME_W + p * CHAR_W);
        tick.setAttribute('y1', y);
        tick.setAttribute('x2', NAME_W + p * CHAR_W);
        tick.setAttribute('y2', y + (p % 10 === 0 ? 8 : 4));
        tick.setAttribute('stroke', '#999');
        svg.appendChild(tick);
        if (p % 10 === 0) {
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', NAME_W + p * CHAR_W);
            t.setAttribute('y', y + 16);
            t.setAttribute('fill', '#666');
            t.setAttribute('font-size', '8');
            t.setAttribute('text-anchor', 'start');
            t.textContent = String(p + 1);
            svg.appendChild(t);
        }
    }

    alignmentContainer.appendChild(svg);
    alignmentContainer.style.overflow = 'auto';

    // Update info
    if (typeof updateSourceInfo === 'function') updateSourceInfo();
}

// Set whenever the user explicitly picks a display mode (see onModeChange),
// so the auto-switch-to-Canvas heuristic below stops overriding their choice
// back to Canvas on every subsequent render. Reset per-file in parseAndRender
// so a newly loaded large alignment still gets the initial suggestion.
let _userDismissedAutoCanvas = false;

function renderAlignment(options = {}) {
    // Catch-all sync: covers every path that flips a mode radio programmatically
    // (BAM load, snapshot/session restore, the auto-switch heuristic below,
    // etc.) without going through onModeChange, so the top-bar quick switcher
    // never drifts from whichever mode is actually about to render.
    syncQuickModeSwitch();
    if (!state.seqs || state.seqs.length === 0) {
        alignmentContainer.innerHTML = '<div style="padding:20px; color:#666; font-style:italic;">No sequences loaded. Paste FASTA/MSF and click Load.</div>';
        return;
    }
    // Reads mode: delegate to BAM renderer
    if (document.getElementById('modeReads')?.checked) {
        if (!bamState.reads || bamState.reads.length === 0) {
            alignmentContainer.innerHTML = '<div style="padding:20px;color:#888;">No reads loaded. Open a BAM file with the Ã°Å¸Â§Â¬ BAM button (after loading a reference FASTA).</div>';
            return;
        }
        renderReadsAlignment();
        return;
    }
    const coverageMin = clampMinCoverage(el('consensusMinCoverage')?.value) / 100;
    alignmentContainer.innerHTML = '';
    // Ensure Full/Block modes have correct scroll/layout behaviour
    // (any leftover Canvas/Compact inline styles are overwritten)
    alignmentContainer.style.position = 'static';
    alignmentContainer.style.height = 'auto';
    alignmentContainer.style.overflow = 'auto';
    setAlignmentColorSchemeClass();
    // Container-level drag handlers: allow drops anywhere, show preview
    // Remove old handlers first to avoid stacking
    if (!alignmentContainer._dragHandlersSet) {
        document.addEventListener('dragenter', _handleInternalDragEnterOver, true);
        document.addEventListener('dragover', _handleInternalDragEnterOver, true);
        alignmentContainer.addEventListener('dragover', (e) => {
            if (_draggedSeqIndex < 0) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            _showDragInsertPreview(e, alignmentContainer);
        });
        alignmentContainer.addEventListener('dragenter', (e) => {
            if (_draggedSeqIndex < 0) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        });
        alignmentContainer.addEventListener('drop', handleDrop);
        alignmentContainer._dragHandlersSet = true;
    }
    state.spanCache = new Map();
    state.domSelectedNucs = new Map();
    state.domSelectedColumns = new Map();
    state.domPendingNuc = null;

    const nameLengthSlider = el('nameLengthSlider');
    const blackThresh = parseInt(el('blackSlider').value) / 100;
    const darkThresh = parseInt(el('darkSlider').value) / 100;
    const lightThresh = parseInt(el('lightSlider').value) / 100;
    const enableBlack = el('enableBlack').checked;
    const enableDark = el('enableDark').checked;
    const enableLight = el('enableLight').checked;
    const stickyNames = el('stickyNames').checked;
    const useBlocks = el('modeBlocks').checked;
    const useSingle = el('modeSingle').checked;

    // Calculate sequence length for consensus and scale (must be before any use of len)
    const len = Math.max(...state.seqs.map(s => s.seq.length));

    // Ã¢â€â‚¬Ã¢â€â‚¬ Auto-detect: Canvas for large alignments Ã¢â€â‚¬Ã¢â€â‚¬
    const TOTAL_RESIDUES = state.seqs.length * len;
    // Disable span cache for large alignments (>80K residues) during view-only rendering
    state._enableSpanCache = (TOTAL_RESIDUES <= 80000);
    const CANVAS_AUTO_THRESHOLD = 150000; // ~100 seq Ãƒâ€” 1500 col
    let _renderStartTime = performance.now();
    const userWantsCanvas = document.getElementById('modeCanvas')?.checked;

    if (!userWantsCanvas && !_userDismissedAutoCanvas && TOTAL_RESIDUES > CANVAS_AUTO_THRESHOLD) {
        const canvasRadio = document.getElementById('modeCanvas');
        if (canvasRadio) canvasRadio.checked = true;
        syncQuickModeSwitch(); // this bypasses onModeChange, so sync explicitly
        showMessage(
            `Auto-switched to Canvas mode for ${TOTAL_RESIDUES.toLocaleString()} residues. ` +
            `Switch back to Block/Full for editing.`,
            6000
        );
        // Re-read to pick up the new checked state
        // Canvas dispatch is handled below
    }

    const blockWidth = parseInt(el('blockSizeSlider').value);
    const nameLen = parseInt(nameLengthSlider.value);
    // Update CSS variable for scale ruler padding
    document.documentElement.style.setProperty('--nameLen', nameLen);
    const standard = new Set(['A', 'C', 'G', 'T', 'U', 'N', '-', '.', 'a', 'c', 'g', 't', 'u', 'n']);
    const ambiguous = new Set(['R','Y','M','K','S','W','H','B','V','D','r','y','m','k','s','w','h','b','v','d']);
    const ambiguousMap = {
        'A,G': 'R', 'G,A': 'R', 'C,T': 'Y', 'T,C': 'Y', 'A,C': 'M', 'C,A': 'M',
        'G,T': 'K', 'T,G': 'K', 'C,G': 'S', 'G,C': 'S', 'A,T': 'W', 'T,A': 'W',
        'A,C,T': 'H', 'A,T,C': 'H', 'C,A,T': 'H', 'C,T,A': 'H', 'T,A,C': 'H', 'T,C,A': 'H',
        'G,C,T': 'B', 'G,T,C': 'B', 'C,G,T': 'B', 'C,T,G': 'B', 'T,G,C': 'B', 'T,C,G': 'B',
        'A,G,T': 'D', 'A,T,G': 'D', 'G,A,T': 'D', 'G,T,A': 'D', 'T,A,G': 'D', 'T,G,A': 'D',
        'A,C,G': 'V', 'A,G,C': 'V', 'C,A,G': 'V', 'C,G,A': 'V', 'G,A,C': 'V', 'G,C,A': 'V'
    };
    const showConsensus = el('showConsensus').checked;
    const consType = document.querySelector('input[name="consensusType"]:checked').value;
    const threshold = clampConsensusPercent(el('consensusThreshold').value) / 100;
    const fallbackMode = (document.getElementById('consensusFallback')?.value) || 'gap';

    // (len is declared above, before TOTAL_RESIDUES calculation)

    const shadeMode = document.querySelector('input[name="shadeMode"]:checked').value;
    const useCompact = document.getElementById('modeCompact')?.checked;
    const useCanvas = document.getElementById('modeCanvas')?.checked;

    // ── Canvas fast path (UGENE-style: first paint costs only the visible region) ──
    // Canvas shows no consensus row, so consensus is skipped entirely here.
    // Conservation shading is deferred: draw an unshaded frame immediately, then
    // compute conservation off the critical path (idle, time-sliced) and repaint shaded.
    if (useCanvas) {
        const cachedConservation = (state.conservationDataCache?.len === len
            && state.conservationDataCache?.shadeMode === shadeMode)
            ? state.conservationDataCache.data : null;
        _renderCanvasAlignment(len, cachedConservation || [], shadeMode, blackThresh, darkThresh, lightThresh,
            enableBlack, enableDark, enableLight, nameLen, stickyNames);

        // Invalidate any still-running chunked jobs from a previous load/render
        // so they don't write stale results (or fight over the main thread)
        // once a new file/render supersedes them.
        if (_canvasDeferredToken) _canvasDeferredToken.cancelled = true;
        const myToken = { cancelled: false };
        _canvasDeferredToken = myToken;

        if (!cachedConservation) {
            const computeShadingAndRepaint = () => {
                if (myToken.cancelled) return;
                if (!state.seqs || !state.seqs.length) return;
                if (Math.max(...state.seqs.map(s => s.seq.length)) !== len) return; // alignment changed
                preCalculateConservationChunked(state.seqs, len, shadeMode, (data) => {
                    if (myToken.cancelled) return;
                    state.conservationDataCache = { len, shadeMode, data };
                    if (document.getElementById('modeCanvas')?.checked) renderAlignment(options);
                }, myToken);
            };
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(computeShadingAndRepaint, { timeout: 1500 });
            } else {
                setTimeout(computeShadingAndRepaint, 30);
            }
        }

        // Consensus is not displayed in Canvas mode. Compute it lazily (time-sliced)
        // so features that consume it (Copy Consensus, etc.) still work without
        // blocking paint.
        if (showConsensus && state.consensusCache?.len !== len) {
            const computeConsensusIdle = () => {
                if (myToken.cancelled) return;
                if (!state.seqs || !state.seqs.length) return;
                if (Math.max(...state.seqs.map(s => s.seq.length)) !== len) return;
                computeConsensusForSequencesChunked(state.seqs.map(s => s.seq), (consStr) => {
                    if (myToken.cancelled) return;
                    const cons = consStr.split('');
                    state.consensusCache = { len, values: cons.slice() };
                    state.consensusSeq = consStr.replace(/-/g, '');
                }, myToken);
            };
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(computeConsensusIdle, { timeout: 2000 });
            } else {
                setTimeout(computeConsensusIdle, 60);
            }
        }
        return;
    }

    let consensus = [];
    if (showConsensus) {
        const deferredConsensus = options.deferConservation ? getDeferredConsensus(len) : null;
        if (deferredConsensus) {
            consensus = deferredConsensus;
        } else {
            // Use unified helper for consensus computation
            consensus = computeConsensusForSequences(state.seqs.map(s => s.seq)).split('');
            state.consensusCache = { len, values: consensus.slice() };
        }
    }
    state.consensusSeq = consensus.join('').replace(/-/g, '');
    const shouldRenderConsensus = showConsensus;
    const consensusPosEl = document.querySelector('input[name="consensusPosition"]:checked');
    const consensusPosition = consensusPosEl ? consensusPosEl.value : 'top';
    if (showConsensus) {
        document.getElementById('statusMessage').textContent = `Consensus: ${consensusPosition} | ${consensus.length} cols`;
    }

    // *** Pre-calculate conservation for ALL columns ONCE (DOM / Compact paths) ***
    const conservationData = (options.deferConservation && getDeferredConservationData(len, shadeMode))
        || preCalculateConservation(state.seqs, len, shadeMode);
    if (!options.deferConservation) {
        state.conservationDataCache = { len, shadeMode, data: conservationData };
    }

    if (useCompact) {
        renderCompactAlignment(len, conservationData, shadeMode, blackThresh, darkThresh, lightThresh,
            enableBlack, enableDark, enableLight, nameLen, stickyNames, standard, ambiguous, ambiguousMap,
            showConsensus, consType, threshold, fallbackMode, coverageMin);
        return;
    }

    // Highlight-diffs + Var-sites: mark columns that differ from consensus
    const highlightDiffs = document.getElementById('highlightDiffs')?.checked;
    const varSites = document.getElementById('varSitesOnly')?.checked;
    if ((highlightDiffs || varSites) && state.seqs.length > 1) {
        const diffCols = new Set();
        // Pre-compute consensus for diff detection
        const consSeq = consensus.length > 0 ? consensus : computeConsensusForSequences(state.seqs.map(s => s.seq)).split('');
        for (let pos = 0; pos < len; pos++) {
            const consBase = (consSeq[pos] || '-').toUpperCase();
            let isDiff = false;
            for (let i = 0; i < state.seqs.length && !isDiff; i++) {
                const base = (state.seqs[i].seq[pos] || '-').toUpperCase();
                if (base !== '-' && base !== '.' && consBase !== '-' && consBase !== '.' && base !== consBase) {
                    isDiff = true;
                }
            }
            if (isDiff) diffCols.add(pos);
        }
        state._diffColumns = diffCols;
        if (highlightDiffs) {
            document.body.classList.add('highlight-diffs');
            document.body.classList.remove('var-sites-only');
        }
        if (varSites) {
            document.body.classList.add('var-sites-only');
            document.body.classList.remove('highlight-diffs');
        }
    } else {
        state._diffColumns = null;
        document.body.classList.remove('highlight-diffs');
        document.body.classList.remove('var-sites-only');
    }

// Codon analysis
    const codonAnalysis = document.getElementById('codonAnalysis')?.checked;
    if (codonAnalysis) {
        // Compute all three frames; select active frame based on codonFrame dropdown
        state._codonFrames = _computeMultiFrameCodonAnalysis(state.seqs, len);
        const frameSel = document.getElementById('codonFrame')?.value || 'auto';
        if (state._codonFrames) {
            let activeFrame;
            if (frameSel === 'auto') {
                activeFrame = state._codonFrames.bestFrame;
            } else if (frameSel === 'all') {
                activeFrame = -1; // special: show all frames in AA rows
            } else {
                activeFrame = parseInt(frameSel) || 0;
            }
            // Set backward-compat _codonData to the active frame (or frame 0 for 'all')
            const displayFrame = activeFrame >= 0 ? activeFrame : 0;
            state._codonData = state._codonFrames.frames[displayFrame];
            state._codonActiveFrame = activeFrame;
            document.body.classList.add('codon-mode');
        } else {
            state._codonFrames = null;
            state._codonData = null;
            state._codonActiveFrame = 0;
            document.body.classList.remove('codon-mode');
            showMessage('Codon analysis requires a nucleotide alignment', 4000);
        }
    } else {
        state._codonData = null;
        state._codonFrames = null;
        state._codonActiveFrame = 0;
        document.body.classList.remove('codon-mode');
    }

    if (useBlocks) {
        for (let start = 0; start < len; start += blockWidth) {
            const end = Math.min(start + blockWidth, len);
            const blockLen = end - start;
            const blockDiv = document.createElement('div');
            blockDiv.className = 'block-block';

            // Add scale/ruler above each block (replaces separator)
            const scaleDiv = document.createElement('div');
            scaleDiv.className = 'seq-line scale-ruler-line';
            const scaleNameDiv = document.createElement('div');
            scaleNameDiv.className = 'seq-name';
            scaleNameDiv.textContent = '';
            const scaleDataDiv = document.createElement('div');
            scaleDataDiv.className = 'seq-data';
            const scaleText = generateScale(blockLen, 10, start);
            scaleDataDiv.textContent = scaleText;
            scaleDiv.appendChild(scaleNameDiv);
            scaleDiv.appendChild(scaleDataDiv);
            blockDiv.appendChild(scaleDiv);
            const isLastBlock = (start + blockWidth >= len);

            if (shouldRenderConsensus && consensusPosition === 'top') {
                addConsensusLine(blockDiv, consensus, start, end, nameLen, stickyNames, blackThresh, darkThresh, lightThresh, enableBlack, enableDark, enableLight, isLastBlock, 'top', options);
            }
            for (let i = 0; i < state.seqs.length; i++) {
                // *** PASS conservationData to createSequenceLine ***
                const lineDiv = createSequenceLine(i, start, end, nameLen, stickyNames, standard, ambiguous, blackThresh, darkThresh, lightThresh, enableBlack, enableDark, enableLight, isLastBlock, conservationData);
                blockDiv.appendChild(lineDiv);
            }
            if (shouldRenderConsensus && consensusPosition === 'bottom') {
                addConsensusLine(blockDiv, consensus, start, end, nameLen, stickyNames, blackThresh, darkThresh, lightThresh, enableBlack, enableDark, enableLight, isLastBlock, 'bottom', options);
            }
            alignmentContainer.appendChild(blockDiv);
        }
    } else {
        // Add scale/ruler at the top for full mode
        const scaleDiv = document.createElement('div');
        scaleDiv.className = 'seq-line scale-ruler-line';
        const scaleNameDiv = document.createElement('div');
        scaleNameDiv.className = 'seq-name';
        scaleNameDiv.textContent = '';
        const scaleDataDiv = document.createElement('div');
        scaleDataDiv.className = 'seq-data';
        const scaleText = generateScale(len);
        scaleDataDiv.textContent = scaleText;
        scaleDiv.appendChild(scaleNameDiv);
        scaleDiv.appendChild(scaleDataDiv);
        alignmentContainer.appendChild(scaleDiv);

        if (shouldRenderConsensus && consensusPosition === 'top') {
            addConsensusLine(alignmentContainer, consensus, 0, len, nameLen, stickyNames, blackThresh, darkThresh, lightThresh, enableBlack, enableDark, enableLight, true, 'top', options);
        }
        for (let i = 0; i < state.seqs.length; i++) {
            // *** PASS conservationData to createSequenceLine ***
            const lineDiv = createSequenceLine(i, 0, len, nameLen, stickyNames, standard, ambiguous, blackThresh, darkThresh, lightThresh, enableBlack, enableDark, enableLight, true, conservationData);
            alignmentContainer.appendChild(lineDiv);
        }
        if (shouldRenderConsensus && consensusPosition === 'bottom') {
            addConsensusLine(alignmentContainer, consensus, 0, len, nameLen, stickyNames, blackThresh, darkThresh, lightThresh, enableBlack, enableDark, enableLight, true, 'bottom', options);
        }
    }
    setTimeout(() => toggleStickyNames(), 0);
    ['blackSlider', 'darkSlider', 'lightSlider', 'nameLengthSlider', 'zoomSlider', 'blockSizeSlider', 'consensusThreshold'].forEach(id => {
        updateSliderBackground(el(id));
    });
    updateRowSelections();
    updateColumnSelections();
    scheduleNucSelectionRefresh();
    updateEditActiveCell();
    recalculateCollapsibleHeights();
    // GeneDoc edit dragging is handled by delegated alignmentContainer events.
    // Update sequence/source statistics after any rendering change
    if (typeof updateSourceInfo === 'function') {
        updateSourceInfo();
    }
    // Re-apply sequence name colours if any mappings exist
    const _renderMs = performance.now() - _renderStartTime;
    if (_renderMs > 50 && TOTAL_RESIDUES > 10000) console.warn('[PERF] render: '+_renderMs.toFixed(0)+'ms | '+TOTAL_RESIDUES.toLocaleString()+' residues');

        if (typeof applyColourToSeqNames === 'function' && colourState && colourState.mappings.size > 0) {
        applyColourToSeqNames(colourState.mappings);
    }

    // Post-process: AA translation rows (phase/stops now built inline)
    if (state._codonData) {
        const cd = state._codonData;
        // Add AA translation rows below each sequence
        const seqRows = alignmentContainer.querySelectorAll('.seq-line');
        seqRows.forEach(rowEl => {
            const seqIdx = parseInt(rowEl.dataset.seqIndex);
            if (isNaN(seqIdx)) return;
            // Check if already has AA rows
            if (rowEl.nextElementSibling?.classList.contains('aa-row')) return;

            const buildAARow = (aaSeqData, frameLabel, isBest) => {
                const aaRow = document.createElement('div');
                aaRow.className = 'aa-row';
                if (frameLabel !== null) aaRow.classList.add('aa-row-f' + frameLabel);
                if (isBest) aaRow.classList.add('aa-row-best');
                // Name column spacer - matches .seq-name width exactly
                const nameCol = document.createElement('div');
                nameCol.className = 'aa-name';
                if (frameLabel !== null) {
                    nameCol.textContent = 'F' + frameLabel + ':';
                }
                aaRow.appendChild(nameCol);
                // Data column - matches .seq-data
                const dataCol = document.createElement('div');
                dataCol.className = 'aa-data';
                if (aaSeqData) {
                    for (const entry of aaSeqData) {
                        const aa = entry.aa;
                        const startCol = entry.cols[0];
                        const aaSpan = document.createElement('span');
                        aaSpan.style.cssText = 'width:3ch;display:inline-block;text-align:center;' + (aa==='*'?'color:#e74c3c;font-weight:bold;':'');
                        aaSpan.textContent = aa;
                        aaSpan.dataset.col = startCol;
                        dataCol.appendChild(aaSpan);
                    }
                }
                aaRow.appendChild(dataCol);
                return aaRow;
            };

            if (state._codonFrames && state._codonActiveFrame === -1) {
                // All-frames mode: show three AA rows
                const best = state._codonFrames.bestFrame;
                for (let fr = 2; fr >= 0; fr--) {
                    const frData = state._codonFrames.frames[fr];
                    const aaRow = buildAARow(frData.aaSeq[seqIdx], fr, fr === best);
                    rowEl.insertAdjacentElement('afterend', aaRow);
                }
            } else {
                // Single-frame mode (frame 0, 1, 2, or auto)
                const activeFrame = state._codonActiveFrame >= 0 ? state._codonActiveFrame : 0;
                const aaRow = buildAARow(cd.aaSeq[seqIdx], null, false);
                rowEl.insertAdjacentElement('afterend', aaRow);
            }
        });    }
}

// Unified source info updater so counts stay accurate after deletions/insertions
function updateSourceInfo() {
    const infoEl = el('sourceInfo');
    const pathLineEl = el('sourcePathLine');
    const headerRowEl = pathLineEl?.closest('.header-info-row') || null;
    if (!infoEl) return;
    if (!state.seqs || state.seqs.length === 0) {
        infoEl.innerHTML = 'No file loaded';
        infoEl.title = '';
        infoEl.dataset.fullFilename = '';
        infoEl.dataset.fullPath = '';
        if (pathLineEl) {
            pathLineEl.innerHTML = '';
            pathLineEl.title = '';
            pathLineEl.dataset.fullPath = '';
        }
        if (headerRowEl) headerRowEl.style.display = 'none';
        return;
    }

    const escapeHtml = (text) => String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const seqCount = state.seqs.length;
    const aliLength = Math.max(...state.seqs.map(s => s.seq.length));
    const gaplessLengths = state.seqs.map(seq => seq.gaplessPositions[seq.gaplessPositions.length - 1] || 0);
    const minLength = Math.min(...gaplessLengths);
    const maxLength = Math.max(...gaplessLengths);
    const lengthRange = minLength === maxLength ? `${minLength}` : `${minLength}-${maxLength}`;

    const fullFilename = state.currentFilename || '';
    const filenameHtml = fullFilename
        ? `<strong><span class="source-file-name">${escapeHtml(fullFilename)}</span></strong>: `
        : '';

    const fullPath = state.currentFilePath || '';
    const summaryHtml = `${filenameHtml}<strong>${seqCount}</strong> seq, <strong>${aliLength}</strong> col, <strong>${lengthRange}</strong> bp`;
    infoEl.innerHTML = summaryHtml;
    infoEl.dataset.fullFilename = fullFilename;
    infoEl.dataset.fullPath = fullPath;
    if (pathLineEl) {
        pathLineEl.innerHTML = fullPath ? `<span class="source-inline-path">${escapeHtml(fullPath)}</span>` : '';
        pathLineEl.dataset.fullPath = fullPath;
    }
    if (headerRowEl) headerRowEl.style.display = fullPath ? '' : 'none';
    const titleParts = [];
    if (fullFilename) titleParts.push(fullFilename);
    if (fullPath) titleParts.push(fullPath);
    titleParts.push(`${seqCount} seq, ${aliLength} col, ${lengthRange} bp`);
    infoEl.title = titleParts.join('\n');

    const fileNameEl = infoEl.querySelector('.source-file-name');
    if (fileNameEl) {
        fileNameEl.dataset.fullFilename = fullFilename;
        fileNameEl.title = fullFilename;
    }

    const pathEl = pathLineEl?.querySelector('.source-inline-path');
    if (pathEl) {
        pathEl.dataset.fullPath = fullPath;
        requestAnimationFrame(() => {
            const isTruncated = pathEl.scrollWidth > pathEl.clientWidth + 1;
            pathEl.title = isTruncated ? fullPath : '';
            pathEl.dataset.truncated = isTruncated ? '1' : '0';
        });
    }
}

function initSourceInfoInteractions() {
    const infoEl = el('sourceInfo');
    const pathLineEl = el('sourcePathLine');
    if (!infoEl || infoEl.dataset.copyBound === '1') return;
    infoEl.dataset.copyBound = '1';

    infoEl.addEventListener('dblclick', (event) => {
        const target = event.target;
        const fileNameEl = target?.closest?.('.source-file-name');
        if (fileNameEl) {
            const filename = fileNameEl.dataset.fullFilename || infoEl.dataset.fullFilename || '';
            if (!filename) return;
            navigator.clipboard.writeText(filename)
                .then(() => showMessage('Filename copied', 1600))
                .catch(() => showMessage('Failed to copy filename', 2500));
        }
    });

    if (pathLineEl && pathLineEl.dataset.copyBound !== '1') {
        pathLineEl.dataset.copyBound = '1';
        pathLineEl.addEventListener('dblclick', (event) => {
            const pathEl = event.target?.closest?.('.source-inline-path');
            const path = pathEl?.dataset.fullPath || pathLineEl.dataset.fullPath || infoEl.dataset.fullPath || '';
            if (!path) return;
            navigator.clipboard.writeText(path)
                .then(() => showMessage('Path copied', 1600))
                .catch(() => showMessage('Failed to copy path', 2500));
        });
    }
}

function closeAllMenusViaEsc() {
    document.querySelectorAll('.menu-section').forEach(section => {
        clearMenuCloseDelay(section);
        section.classList.remove('menu-open');
        section.classList.remove('hover-active');
    });
    document.body.classList.add('suppress-menu-hover');
    const clearSuppress = () => {
        document.body.classList.remove('suppress-menu-hover');
        window.removeEventListener('mousemove', clearSuppress);
    };
    window.addEventListener('mousemove', clearSuppress, { once: true });
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }
}

function ensureSpanCacheRow(row) {
    let rowCache = state.spanCache.get(row);
    if (!rowCache) {
        rowCache = new Map();
        state.spanCache.set(row, rowCache);
    }
    return rowCache;
}

function registerSpanInCache(row, pos, span) {
    ensureSpanCacheRow(row).set(pos, span);
}

function getCachedSpan(row, pos) {
    return state.spanCache.get(row)?.get(pos) || null;
}

function getSpanElement(row, pos) {
    const cached = getCachedSpan(row, pos);
    if (cached) return cached;
    if (!alignmentContainer) return null;
    const line = alignmentContainer.querySelector(`.seq-line[data-seq-index="${row}"]`);
    return line?.querySelector(`.seq-data > span[data-pos="${pos}"]`) || null;
}

function forEachColumnSpan(pos, callback) {
    let found = 0;
    if (state.spanCache) {
        state.spanCache.forEach(rowMap => {
            const span = rowMap.get(pos);
            if (span) {
                found++;
                callback(span);
            }
        });
    }
    if (found > 0) return;
    if (!alignmentContainer) return;
    alignmentContainer.querySelectorAll(`.seq-data > span[data-pos="${pos}"]`).forEach(callback);
}

const RENDER_STANDARD_BASES = new Set(['A', 'C', 'G', 'T', 'U', 'N', '-', '.', 'a', 'c', 'g', 't', 'u', 'n']);
const RENDER_AMBIGUOUS_BASES = new Set(['R','Y','M','K','S','W','H','B','V','D','r','y','m','k','s','w','h','b','v','d']);
const ALIGNMENT_COLOR_SCHEMES = new Set([
    'monochrome',
    'nucleotide',
    'purine-pyrimidine',
    'ambiguity',
    'aa-clustal',
    'aa-jalview'
]);
const ALIGNMENT_COLOR_SCHEME_CLASSES = Array.from(ALIGNMENT_COLOR_SCHEMES, scheme => `color-scheme-${scheme}`);
const AMINO_ACID_GROUP_CLASSES = {
    A: 'aa-hydrophobic', V: 'aa-hydrophobic', I: 'aa-hydrophobic', L: 'aa-hydrophobic', M: 'aa-hydrophobic',
    R: 'aa-positive', K: 'aa-positive', H: 'aa-positive',
    D: 'aa-negative', E: 'aa-negative',
    S: 'aa-polar', T: 'aa-polar', N: 'aa-polar', Q: 'aa-polar',
    F: 'aa-aromatic', W: 'aa-aromatic', Y: 'aa-aromatic',
    C: 'aa-special', G: 'aa-special', P: 'aa-special',
    B: 'aa-special', Z: 'aa-special', X: 'aa-special', J: 'aa-special', O: 'aa-special', U: 'aa-special',
    '*': 'aa-stop'
};
const NUCLEOTIDE_ORIENTED_SCHEMES = new Set(['nucleotide', 'purine-pyrimidine', 'ambiguity']);
const RESIDUE_SCHEME_STYLES = {
    'aa-clustal': {
        'aa-hydrophobic': { bg: '#80b1ff', fg: '#062a5f' },
        'aa-positive': { bg: '#ff9a9a', fg: '#650808' },
        'aa-negative': { bg: '#ff77dd', fg: '#5d064e' },
        'aa-polar': { bg: '#8ee68e', fg: '#064906' },
        'aa-aromatic': { bg: '#8fe6ff', fg: '#07495a' },
        'aa-special': { bg: '#ffe680', fg: '#5c4600' },
        'aa-stop': { bg: '#222222', fg: '#ffffff' }
    },
    'aa-jalview': {
        'aa-hydrophobic': { bg: '#ffcc99', fg: '#5c2c00' },
        'aa-positive': { bg: '#99ccff', fg: '#06345f' },
        'aa-negative': { bg: '#ff9999', fg: '#620909' },
        'aa-polar': { bg: '#99e699', fg: '#064906' },
        'aa-aromatic': { bg: '#d6b3ff', fg: '#3d0b63' },
        'aa-special': { bg: '#ffff99', fg: '#555500' },
        'aa-stop': { bg: '#222222', fg: '#ffffff' }
    },
    'nucleotide': {
        'base-A': { bg: '#8ddf88', fg: '#063b09' },
        'base-C': { bg: '#87c7ff', fg: '#07335e' },
        'base-G': { bg: '#ffc878', fg: '#5f3300' },
        'base-T': { bg: '#ff8c8c', fg: '#5e0505' },
        'base-U': { bg: '#ff8c8c', fg: '#5e0505' },
        'base-N': { bg: '#d9d9d9', fg: '#333333' }
    },
    'purine-pyrimidine': {
        'pp-purine': { bg: '#ffe9a8', fg: '#6b4500' },
        'pp-pyrimidine': { bg: '#cbe7ff', fg: '#06466d' },
        'iupac-ambiguous': { bg: '#e5e5e5', fg: '#333333' },
        'base-N': { bg: '#e5e5e5', fg: '#333333' }
    },
    'ambiguity': {
        'iupac-ambiguous': { bg: '#e8ddff', fg: '#3f1375' },
        'base-R': { bg: '#d7ffd7', fg: '#075007' },
        'base-Y': { bg: '#d7edff', fg: '#06466d' },
        'base-S': { bg: '#dff7ff', fg: '#06515f' },
        'base-W': { bg: '#fff4c7', fg: '#6b5200' },
        'base-K': { bg: '#ffe2ce', fg: '#6a2a00' },
        'base-M': { bg: '#f4dcff', fg: '#5d126d' },
        'base-N': { bg: '#d9d9d9', fg: '#333333' }
    }
};
const RESIDUE_SCHEME_CLASS_PRIORITY = [
    'aa-stop', 'aa-hydrophobic', 'aa-positive', 'aa-negative', 'aa-polar', 'aa-aromatic', 'aa-special',
    'iupac-ambiguous', 'base-R', 'base-Y', 'base-S', 'base-W', 'base-K', 'base-M', 'base-H', 'base-B', 'base-V', 'base-D',
    'pp-purine', 'pp-pyrimidine',
    'base-A', 'base-C', 'base-G', 'base-T', 'base-U', 'base-N'
];
let _proteinSchemeRemapWarned = false;

let _proteinMemoArr = null, _proteinMemoType = null, _proteinMemoVal = false;
function isProteinAlignment(seqs = state.seqs) {
    if (!seqs || seqs.length === 0) return false;
    const seqType = el('mafftSeqType')?.value;
    if (seqType === '0' || seqType === '1') return true;
    // Scanning every sequence is O(seqs Ã— cols). This runs once per glyph in the
    // canvas hot loops, so memoize by array identity (a new array is created on
    // load; edits mutate in place and never flip nucleotide/protein status).
    if (seqs === _proteinMemoArr && seqType === _proteinMemoType) return _proteinMemoVal;
    const value = seqs.some(entry => _isProteinFastaSequence(entry.seq));
    _proteinMemoArr = seqs;
    _proteinMemoType = seqType;
    _proteinMemoVal = value;
    return value;
}

function usesMonochromeShading(colorScheme = getAlignmentColorScheme()) {
    return colorScheme === 'monochrome';
}

function getEffectiveColorScheme(scheme = getAlignmentColorScheme()) {
    if (isProteinAlignment() && NUCLEOTIDE_ORIENTED_SCHEMES.has(scheme)) {
        if (!_proteinSchemeRemapWarned) {
            _proteinSchemeRemapWarned = true;
            showMessage('Nucleotide colour scheme selected for protein alignment Ã¢â‚¬â€ using amino-acid colours', 3500);
        }
        return 'aa-clustal';
    }
    return scheme;
}

function getResidueSchemeStyle(base, scheme = getEffectiveColorScheme()) {
    if (usesMonochromeShading(scheme)) return null;
    const palette = RESIDUE_SCHEME_STYLES[scheme];
    if (!palette) return null;
    const classes = getResidueAnnotationClasses(base, RENDER_STANDARD_BASES, RENDER_AMBIGUOUS_BASES, scheme).split(/\s+/);
    for (const key of RESIDUE_SCHEME_CLASS_PRIORITY) {
        if (classes.includes(key) && palette[key]) return palette[key];
    }
    return null;
}

function getAlignmentColorScheme() {
    const scheme = el('colorSchemeSelect')?.value || DEFAULTS.colorScheme;
    return ALIGNMENT_COLOR_SCHEMES.has(scheme) ? scheme : DEFAULTS.colorScheme;
}

function setAlignmentColorSchemeClass() {
    if (!alignmentContainer) return;
    alignmentContainer.classList.remove(...ALIGNMENT_COLOR_SCHEME_CLASSES);
    alignmentContainer.classList.add(`color-scheme-${getEffectiveColorScheme()}`);
}

function getResidueAnnotationClasses(base, standard = RENDER_STANDARD_BASES, ambiguous = RENDER_AMBIGUOUS_BASES, colorScheme = getEffectiveColorScheme()) {
    const baseUp = String(base || '-').toUpperCase();
    if (baseUp === '-' || baseUp === '.') return '';

    const classes = [];
    if (/^[A-Z]$/.test(baseUp)) {
        classes.push(`base-${baseUp}`);
    } else if (baseUp === '*') {
        classes.push('base-STOP');
    }

    const isProteinScheme = colorScheme === 'aa-clustal' || colorScheme === 'aa-jalview';
    const isAmbiguousNucleotide = !isProteinScheme && (ambiguous.has(base) || ambiguous.has(baseUp));
    const isKnownNucleotide = standard.has(base) || standard.has(baseUp) || isAmbiguousNucleotide;
    const isAminoAcidSymbol = /^[A-Z*]$/.test(baseUp) && Boolean(AMINO_ACID_GROUP_CLASSES[baseUp]);

    if (!isKnownNucleotide && !(isProteinScheme && isAminoAcidSymbol)) {
        classes.push('artifact');
    } else if (isAmbiguousNucleotide) {
        classes.push('ambiguous', 'iupac-ambiguous');
    }

    if (baseUp === 'A' || baseUp === 'G') classes.push('pp-purine');
    if (baseUp === 'C' || baseUp === 'T' || baseUp === 'U') classes.push('pp-pyrimidine');
    if (AMINO_ACID_GROUP_CLASSES[baseUp]) classes.push(AMINO_ACID_GROUP_CLASSES[baseUp]);

    return classes.join(' ');
}

function getSequenceRenderConfig() {
    return {
        blackThresh: parseInt(el('blackSlider')?.value || '100', 10) / 100,
        darkThresh: parseInt(el('darkSlider')?.value || '80', 10) / 100,
        lightThresh: parseInt(el('lightSlider')?.value || '60', 10) / 100,
        enableBlack: !!el('enableBlack')?.checked,
        enableDark: !!el('enableDark')?.checked,
        enableLight: !!el('enableLight')?.checked,
        shadeMode: document.querySelector('input[name="shadeMode"]:checked')?.value || 'nongap',
        colorScheme: getAlignmentColorScheme(),
        effectiveColorScheme: getEffectiveColorScheme()
    };
}

function applyConservationShadeClass(baseUp, posData, config) {
    if (!usesMonochromeShading(config.effectiveColorScheme || config.colorScheme)) {
        return baseUp === '-' || baseUp === '.' ? 'gap' : 'other';
    }
    if (posData.hasData && posData.hasValidCoverage) {
        if (baseUp !== '-' && baseUp !== '.' && posData.consensusBases?.has(baseUp)) {
            if (config.enableBlack && posData.conservation >= config.blackThresh) return 'black';
            if (config.enableDark && posData.conservation >= config.darkThresh) return 'dark';
            if (config.enableLight && posData.conservation >= config.lightThresh) return 'light';
        }
        if (baseUp === '-' || baseUp === '.') return 'gap';
    } else if (baseUp === '-' || baseUp === '.') {
        return 'gap';
    }
    return 'other';
}

function getSequenceBaseRenderClass(base, pos, config, conservationData) {
    const baseUp = (base || '-').toUpperCase();
    const effectiveScheme = config.effectiveColorScheme || getEffectiveColorScheme(config.colorScheme);
    const baseClass = getResidueAnnotationClasses(base, RENDER_STANDARD_BASES, RENDER_AMBIGUOUS_BASES, effectiveScheme);

    const posData = conservationData?.[pos] || { hasData: false, hasValidCoverage: false };
    let cls = applyConservationShadeClass(baseUp, posData, config);

    if (state.selectedColumns.has(pos)) cls += ' column-selected';
    if (baseClass) cls += ` ${baseClass}`;
    return cls;
}

function getTsdMarkDisplay(rowIndex, pos) {
    const rowMarks = state.tsdMarks?.get(rowIndex);
    if (!rowMarks || !rowMarks.has(pos)) return { className: '', style: '' };
    if (state.tsdMarkStyle === 'bold') return { className: ' tsd-mark tsd-mark-bold', style: '' };
    if (state.tsdMarkStyle === 'color') {
        const color = /^#[0-9A-Fa-f]{6}$/.test(state.tsdMarkColor || '') ? state.tsdMarkColor : '#ffd54f';
        return { className: ' tsd-mark tsd-mark-color', style: ` style="background-color:${color};color:#111;font-weight:bold;"` };
    }
    return { className: ' tsd-mark', style: '' };
}

function setSpanTsdMarkDisplay(span, rowIndex, pos) {
    span.classList.remove('tsd-mark', 'tsd-mark-bold', 'tsd-mark-color');
    span.style.backgroundColor = '';
    span.style.color = '';
    span.style.fontWeight = '';
    const rowMarks = state.tsdMarks?.get(rowIndex);
    if (!rowMarks || !rowMarks.has(pos)) return;
    span.classList.add('tsd-mark');
    if (state.tsdMarkStyle === 'bold') {
        span.classList.add('tsd-mark-bold');
    } else if (state.tsdMarkStyle === 'color') {
        const color = /^#[0-9A-Fa-f]{6}$/.test(state.tsdMarkColor || '') ? state.tsdMarkColor : '#ffd54f';
        span.classList.add('tsd-mark-color');
        span.style.backgroundColor = color;
        span.style.color = '#111';
        span.style.fontWeight = 'bold';
    }
}

function refreshSequenceRowDom(rowIndex) {
    const seqObj = state.seqs[rowIndex];
    if (!seqObj || !alignmentContainer) return false;
    const rowCache = state.spanCache?.get(rowIndex);
    if (!rowCache || rowCache.size === 0) return false;

    const len = Math.max(...state.seqs.map(s => s.seq.length));
    const config = getSequenceRenderConfig();
    const conservationData = state.editLiveConservation
        ? (getDeferredConservationData(len, config.shadeMode) || state.conservationDataCache?.data || [])
        : [];

    rowCache.forEach((span, pos) => {
        const base = seqObj.seq[pos] || GENEDOC_FILLER;
        span.textContent = base;
        span.className = getSequenceBaseRenderClass(base, pos, config, conservationData);
        setSpanTsdMarkDisplay(span, rowIndex, pos);
    });

    if (state.selectedNucs.size) scheduleNucSelectionRefresh();
    updateEditActiveCell();
    return true;
}

function createSequenceLine(index, start, end, nameLen, stickyNames, standard, ambiguous, blackThresh, darkThresh, lightThresh, enableBlack, enableDark, enableLight, showLength = false, conservationData) {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'seq-line';
    lineDiv.dataset.seqIndex = index;
    const nameSpan = document.createElement('div');
    nameSpan.className = `seq-name ${stickyNames ? '' : 'static'}`;
    nameSpan.dataset.seqIndex = index;
    nameSpan.title = `${state.seqs[index].fullHeader} (length: ${state.seqs[index].seq.length})`;
    let displayName = state.seqs[index].header;
    let nameLenInt = parseInt(nameLen, 10);
    if (displayName.length > nameLenInt) {
        nameSpan.textContent = displayName.slice(0, nameLenInt) + '...';
        nameSpan.title = `${displayName} (length: ${state.seqs[index].seq.length})`;
    } else {
        nameSpan.textContent = displayName;
        nameSpan.title = `${displayName} (length: ${state.seqs[index].seq.length})`;
    }
    nameSpan.draggable = false;
    // Extra reliability: direct ctrl/meta click handler for sequence selection.
    // Using mousedown to precede potential drag initiation; stops propagation so global handler won't double toggle.
    nameSpan.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (isCtrlModifier(e)) {
            toggleRowSelection(index);
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (!e.shiftKey && !isAltModifier(e)) {
            _startRowReorderDrag(e, index);
            e.preventDefault();
            e.stopPropagation();
        }
    });
    // Tooltip: show truncated full header on hover (avoid OS tooltip delay)
    nameSpan.addEventListener('mouseover', () => {
        const full = state.seqs[index].fullHeader || state.seqs[index].header;
        const maxLen = 120;
        const text = (full.length > maxLen) ? (full.slice(0, maxLen - 1) + '...') : full;
        showTooltipAt(text, nameSpan);
    });
    nameSpan.addEventListener('mouseout', () => {
        hideTooltip();
    });
    // Single click no longer copies the name. Use double-click to edit.
    nameSpan.addEventListener('dblclick', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = state.seqs[index].header;
        input.style.width = `${nameSpan.offsetWidth}px`;
        input.style.fontSize = getComputedStyle(nameSpan).fontSize;
        input.style.fontFamily = getComputedStyle(nameSpan).fontFamily;
        input.style.padding = '0';
        input.style.border = '1px solid #ccc';
        nameSpan.innerHTML = '';
        nameSpan.appendChild(input);
        input.focus();
        input.select();
        const save = () => {
            const newName = input.value.trim();
            if (newName && newName !== state.seqs[index].header) {
                pushUndo('rename');
                state.seqs[index].header = newName;
                state.seqs[index].fullHeader = newName;
                renderAlignment();
                showMessage("Sequence renamed!", 2000);
            } else {
                renderAlignment();
            }
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                save();
            } else if (e.key === 'Escape') {
                renderAlignment();
            }
        });
        // Add outside click handler for faster exit
        const handleOutsideClick = (ev) => {
            if (!nameSpan.contains(ev.target)) {
                save();
                document.removeEventListener('click', handleOutsideClick);
            }
        };
        setTimeout(() => document.addEventListener('click', handleOutsideClick), 0);
    });
    lineDiv.addEventListener('drop', handleDrop);
    lineDiv.appendChild(nameSpan);
    const dataSpan = document.createElement('div');
    dataSpan.className = 'seq-data';
    // NO ACTION on plain click - only Ctrl+Click for selection
    dataSpan.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) return; // handled by mousedown
        // Do nothing on single click - no copy, no selection
    });

    // *** PERFORMANCE: Pre-cache references and build HTML string ***
    const seq = state.seqs[index].seq;
    const gaplessPositions = state.seqs[index].gaplessPositions;
    const selectedCols = state.selectedColumns;
    const htmlParts = [];
    const colorScheme = getAlignmentColorScheme();
    const effectiveColorScheme = getEffectiveColorScheme(colorScheme);
    const renderConfig = {
        blackThresh, darkThresh, lightThresh, enableBlack, enableDark, enableLight,
        colorScheme, effectiveColorScheme
    };

    for (let pos = start; pos < end; pos++) {
            const base = seq[pos] || '-';
            const baseUp = base.toUpperCase();
            const baseClass = getResidueAnnotationClasses(base, standard, ambiguous, effectiveColorScheme);

            const posData = conservationData[pos] || { hasData: false, hasValidCoverage: false };
            let cls = applyConservationShadeClass(baseUp, posData, renderConfig);

            // Codon analysis classes built inline (avoids 160K-node DOM scan)
            if (state._codonData && state._codonData.phase && state._codonData.phase[index]) {
                const ph = state._codonData.phase[index][pos];
                if (ph >= 0) cls += ' codon-p' + ph;
            }
            if (state._codonData && state._codonData.stops && state._codonData.stops[index]) {
                if (state._codonData.stops[index].includes(pos)) cls += ' codon-stop';
            }
            if (state._codonData && state._codonData.frameShifts && state._codonData.frameShifts[index]) {
                for (const fs of state._codonData.frameShifts[index]) {
                    if (fs.pos === pos && fs.type === 'incomplete') { cls += ' codon-fs'; break; }
                }
            }
            if (state._codonData && state._codonData.synNonSyn && state._codonData.synNonSyn[index]) {
                if (state._codonData.synNonSyn[index][pos]) cls += ' codon-' + state._codonData.synNonSyn[index][pos];
            }
            if (state._diffColumns && state._diffColumns.has(pos)) {
                cls += ' diff-highlight';
            }

            const colSelected = selectedCols.has(pos) ? ' column-selected' : '';
            const tsdDisplay = getTsdMarkDisplay(index, pos);
            const finalClass = `${cls}${baseClass ? ' ' + baseClass : ''}${colSelected}${tsdDisplay.className}`;
            htmlParts.push(`<span class="${finalClass}" data-pos="${pos}"${tsdDisplay.style}>${base}</span>`);
        }
    // Add sequence length at the end (only for last block)
    if (showLength) {
        const gaplessLength = gaplessPositions[gaplessPositions.length - 1] || 0;
        htmlParts.push(`<span class="seq-length" title="Sequence length: ${gaplessLength} (gapless)">${gaplessLength}</span>`);
    }

    // *** PERFORMANCE: Set innerHTML once instead of many appendChild calls ***
    dataSpan.innerHTML = htmlParts.join('');

    // Register spans in cache for selection features (skipped for large view-only renders)
    if (state._enableSpanCache !== false) {
        const spans = dataSpan.children;
        for (let i = 0; i < spans.length; i++) {
            const span = spans[i];
            const pos = span.dataset.pos;
            if (pos !== undefined) {
                registerSpanInCache(index, parseInt(pos), span);
            }
        }
    }

    // Apply repeat highlights to this sequence line
    if (state.repeatHighlights && state.repeatHighlights.size > 0) {
        _applyLineHighlights(dataSpan);
    }
    lineDiv.appendChild(dataSpan);
    if (state.selectedRows.has(index)) {
        lineDiv.classList.add('selected');
    }
    return lineDiv;
}
function addConsensusLine(parent, consensus, start, end, nameLen, stickyNames, blackThresh, darkThresh, lightThresh, enableBlack, enableDark, enableLight, showLength = false, position = 'bottom', options = {}) {
    const consLine = document.createElement('div');
    consLine.className = `seq-line consensus-line consensus-${position}`;
    const consName = document.createElement('div');
    consName.className = `seq-name ${stickyNames ? '' : 'static'}`;
    consName.textContent = 'Consensus';
    consLine.appendChild(consName);
    const dataSpan = document.createElement('div');
    dataSpan.className = 'seq-data';

    // Get trim boundaries if available
    const trimBounds = state.trimBoundaries || {};
    const leftTrimEnd = trimBounds.leftTrimEnd !== undefined ? trimBounds.leftTrimEnd : -1;
    const rightTrimStart = trimBounds.rightTrimStart !== undefined ? trimBounds.rightTrimStart : Infinity;

    for (let pos = start; pos < end; pos++) {
        const base = pos < consensus.length ? consensus[pos] : '-';
        const baseUp = base.toUpperCase();
        const baseClass = getResidueAnnotationClasses(base);

        // Determine display case from column conservation (consensus STRING stays uppercase)
        let displayBase = base;
        if (!options.deferConservation && base !== '-' && base !== '.') {
            const col = state.seqs.map(s => (s.seq[pos] || '-').toUpperCase());
            const nonGapCol = col.filter(b => b !== '-' && b !== '.');
            if (nonGapCol.length > 0) {
                const counts = {};
                nonGapCol.forEach(b => counts[b] = (counts[b] || 0) + 1);
                const maxCount = Math.max(...Object.values(counts));
                const threshold = clampConsensusPercent(el('consensusThreshold').value) / 100;
                const freq = maxCount / col.length;
                displayBase = freq >= threshold ? baseUp : baseUp.toLowerCase();
            }
        }

        const span = document.createElement('span');
        span.className = baseClass;
        span.textContent = displayBase;

        // Apply trim region coloring
        if (pos <= leftTrimEnd) {
            span.classList.add('trim-left');
            span.title = 'Trimmed (left)';
        } else if (pos >= rightTrimStart) {
            span.classList.add('trim-right');
            span.title = 'Trimmed (right)';
        }
        // Soft trim visual: dim columns excluded from clustering
        if (state.softTrimBoundaries && !state.trimBoundaries) {
            const stl = state.softTrimBoundaries.leftTrimEnd;
            const str = state.softTrimBoundaries.rightTrimStart;
            if (pos <= stl || pos >= str) {
                span.classList.add('soft-trim-col');
                if (!span.title) span.title = 'Excluded from clustering (soft trim)';
            }
        }

        // Tooltip on hover: show coverage and per-nucleotide percentages for this column
        span.addEventListener('mouseover', () => {
            const totalSeqs = state.seqs.length || 1;
            const colAll = state.seqs.map(s => s.seq[pos] || '-');
            const nonGaps = colAll.filter(b => b !== '-' && b !== '.');
            const coveragePct = Math.round((nonGaps.length / totalSeqs) * 100);
            const counts = {};
            for (const ch of nonGaps) {
                const up = String(ch).toUpperCase();
                const norm = up === 'U' ? 'T' : up;
                counts[norm] = (counts[norm] || 0) + 1;
            }
            const denom = nonGaps.length || 1;
            const entries = Object.entries(counts)
                .filter(([b,_]) => b !== '-' && b !== '.')
                .sort((a,b) => b[1]-a[1]);
            const colorMap = { A:'#27ae60', C:'#2980b9', G:'#d35400', T:'#c0392b', N:'#7f8c8d' };
            let html = `<div class="cov-row">Coverage: <strong>${coveragePct}%</strong> (${nonGaps.length}/${totalSeqs})</div>`;
            if (entries.length === 0) {
                html += '<div class="freq-row"><em>No bases</em></div>';
            } else {
                entries.forEach(([base,count]) => {
                    const pct = Math.round((count/denom)*100);
                    const color = colorMap[base] || '#555';
                    html += `<div class="freq-row"><span class="base" style="background:${color}">${base}</span><span class="pct">${pct}%</span><span class="raw">(${count})</span></div>`;
                });
            }
            // Additional counts for ambiguous, etc.
            const ambigBases = Object.keys(counts).filter(b => 'RYMKSWHBVD'.includes(b));
            if (ambigBases.length) {
                html += `<div class="freq-row"><span class="base" style="background:#8e44ad">Ambig</span><span class="pct">${ambigBases.length}</span></div>`;
            }
            showTooltipAt(html, span, {html:true, className:'consensus-box'});
        });
        span.addEventListener('mouseout', () => hideTooltip());
        dataSpan.appendChild(span);
    }
    // Apply repeat highlights to consensus line too
    if (state.repeatHighlights && state.repeatHighlights.size > 0) {
        _applyLineHighlights(dataSpan);
    }
    // Add consensus length at the end (only for last block and using gapless length)
    if (showLength) {
        const lengthSpan = document.createElement('span');
        lengthSpan.className = 'seq-length';
        // For consensus, count non-gap characters
        const consensusStr = Array.isArray(consensus) ? consensus.join('') : String(consensus || '');
        const gaplessLength = (consensusStr.match(/[^-.\s]/g) || []).length;
        lengthSpan.textContent = gaplessLength;
        lengthSpan.title = `Consensus length: ${gaplessLength} (gapless)`;
        dataSpan.appendChild(lengthSpan);
    }
    consLine.appendChild(dataSpan);
    parent.appendChild(consLine);
}
function setupHoverMenuReveal() {
    const controls = el('controls');
    if (!controls || !alignmentContainer) return;

    // Menu stays visible via CSS sticky positioning
    // This JavaScript just handles closing overlapping menu sections

    controls.addEventListener('click', (e) => {
        const header = e.target.closest('.section-header');
        if (header) {
            // When clicking a menu section header, close others
            document.querySelectorAll('.control-group').forEach(group => {
                const isRelated = header.nextElementSibling === group;
                if (!isRelated && group.style.display === 'block') {
                    group.style.display = 'none';
                }
            });
        }
    });
}

// Non-linear zoom: slider 0-100 maps to 50%-200% with log curve
// Gives equal space to zoom-out (50-100%) and zoom-in (100-200%)
function _sliderToZoom(sliderVal) {
    return Math.round(50 * Math.pow(4, sliderVal / 100));
}
function _zoomToSlider(zoomPct) {
    return Math.round(100 * Math.log2(zoomPct / 50) / 2);
}

function setZoom(percent) {
    const size = (percent / 100) * 13;
    alignmentContainer.style.fontSize = size + 'px';
    el('zoomVal').textContent = percent + '%';
    el('zoomVal').classList.toggle('not-default', percent !== 100);
    // DOM mode picks up the new font-size via CSS inheritance automatically,
    // but Canvas mode measures/bakes glyphs at a fixed size on render, so it
    // needs an explicit re-render to track the zoom slider.
    if (document.getElementById('modeCanvas')?.checked) debounceRender();
}
function setZoomFromSlider() {
    const slider = el('zoomSlider');
    setZoom(_sliderToZoom(parseInt(slider.value)));
}
function adjustZoom(delta) {
    const slider = el('zoomSlider');
    const currentPct = _sliderToZoom(parseInt(slider.value));
    let newPct = currentPct + delta;
    newPct = Math.max(50, Math.min(200, newPct));
    slider.value = _zoomToSlider(newPct);
    setZoom(newPct);
}
function resetZoom() {
    const slider = el('zoomSlider');
    slider.value = _zoomToSlider(100);
    setZoom(100);
    updateSliderBackground(slider);
}
function debounce(func, delay) {
    let timer;
    return () => {
        clearTimeout(timer);
        timer = setTimeout(func, delay);
    };
}
const debounceRender = debounce(renderAlignment, 50);

// ── Large-alignment pre-parse index & mode classification ──────────────────
// Three viewing strategies (chunking implemented in later phases):
//   tall  — many sequences  → vertical page chunks (PDF-like)
//   long  — few seqs, wide   → horizontal column windows
//   crazy — both dimensions  → warn before parse; user can cancel
const ALIGN_TALL_SEQ_THRESHOLD = 500;
const ALIGN_LONG_COL_THRESHOLD = 3000;
const ALIGN_CRAZY_VOLUME = 5_000_000;

/** Single-pass FASTA scan: counts sequences and lengths without building seq objects. */
function scanFastaIndex(text) {
    let nSeqs = 0, maxLen = 0, totalResidues = 0, curLen = 0;
    let i = 0;
    const len = text.length;
    while (i < len) {
        const lineStart = i;
        while (i < len && text[i] !== '\n' && text[i] !== '\r') i++;
        const line = text.slice(lineStart, i).trim();
        while (i < len && (text[i] === '\n' || text[i] === '\r')) i++;
        if (!line) continue;
        if (line[0] === '>') {
            if (curLen > 0) {
                maxLen = Math.max(maxLen, curLen);
                totalResidues += curLen;
                curLen = 0;
            }
            nSeqs++;
        } else {
            for (let j = 0; j < line.length; j++) {
                const c = line[j];
                if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '-' || c === '.' || c === '*') curLen++;
            }
        }
    }
    if (curLen > 0) {
        maxLen = Math.max(maxLen, curLen);
        totalResidues += curLen;
    }
    return { nSeqs, maxLen, totalResidues };
}

/** MSF header scan: sequence count from Name: lines, width from Len: in header. */
function scanMsfIndex(text) {
    let nSeqs = 0, maxLen = 0;
    let i = 0;
    const len = text.length;
    while (i < len) {
        const lineStart = i;
        while (i < len && text[i] !== '\n' && text[i] !== '\r') i++;
        const line = text.slice(lineStart, i).trim();
        while (i < len && (text[i] === '\n' || text[i] === '\r')) i++;
        if (!line) continue;
        if (line.startsWith('Name:')) nSeqs++;
        const m = line.match(/Len:\s*(\d+)/i);
        if (m) maxLen = Math.max(maxLen, parseInt(m[1], 10));
    }
    return { nSeqs, maxLen, totalResidues: nSeqs * maxLen };
}

/**
 * Cheap pre-parse index for FASTA/MSF. Returns null for formats we cannot
 * scan without a full parse (SAM, GenBank, etc.).
 */
function scanAlignmentText(text) {
    const t = text.trim();
    if (!t) return null;
    const isMsf = (t.includes('MSF:') && t.includes('Check:'))
        || t.includes('!!AA_MULTIPLE_ALIGNMENT')
        || t.includes('!!NA_MULTIPLE_ALIGNMENT');
    if (isMsf) return scanMsfIndex(text);
    if (t[0] === '>' || /^[A-Za-z*.\-]+$/m.test(t.split(/\r?\n/)[0] || '')) {
        return scanFastaIndex(text);
    }
    return null;
}

/**
 * Classify alignment dimensions into viewing mode.
 * @returns {{ mode: 'normal'|'tall'|'long'|'crazy', isTall: boolean, isLong: boolean, isCrazy: boolean }}
 */
function classifyAlignmentSize(stats) {
    const isTall = stats.nSeqs > ALIGN_TALL_SEQ_THRESHOLD;
    const isLong = stats.maxLen > ALIGN_LONG_COL_THRESHOLD;
    const isCrazy = (isTall && isLong) || stats.totalResidues > ALIGN_CRAZY_VOLUME;
    let mode = 'normal';
    if (isCrazy) mode = 'crazy';
    else if (isTall) mode = 'tall';
    else if (isLong) mode = 'long';
    return { mode, isTall, isLong, isCrazy };
}

function _formatResidueCount(n) {
    return (n >= 1_000_000)
        ? (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
        : n.toLocaleString();
}

/**
 * Modal shown for "crazy" alignments before any heavy parse work.
 * @returns {Promise<'cancel'|'proceed'>}
 */
function showLargeAlignmentDialog(stats, classification) {
    return new Promise((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'blast-modal-backdrop align-load-dialog';
        const dialog = document.createElement('div');
        dialog.className = 'blast-dialog';
        dialog.style.maxWidth = '460px';

        const title = document.createElement('div');
        title.className = 'blast-dialog-title';
        title.textContent = 'Large alignment';

        const content = document.createElement('div');
        content.className = 'blast-dialog-content';
        content.style.fontSize = '12px';
        content.style.lineHeight = '1.55';

        const reasons = [];
        if (classification.isTall && classification.isLong) {
            reasons.push('both sequence count and alignment width are very large');
        }
        if (stats.totalResidues > ALIGN_CRAZY_VOLUME) {
            reasons.push(`total size exceeds ${_formatResidueCount(ALIGN_CRAZY_VOLUME)} residues`);
        }
        const reasonText = reasons.length ? reasons.join(' and ') : 'this alignment is very large';

        content.innerHTML = `
            <p style="margin:0 0 10px;">
                <strong>${stats.nSeqs.toLocaleString()}</strong> sequences &times;
                <strong>${stats.maxLen.toLocaleString()}</strong> columns
                (<strong>${_formatResidueCount(stats.totalResidues)}</strong> residues)
            </p>
            <p style="margin:0 0 12px;color:#555;">
                Loading may be slow or briefly freeze the browser because ${reasonText}.
                Canvas mode is recommended for viewing; switch to Block/Full only for editing.
            </p>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button type="button" id="alignLoadCancel" style="padding:6px 14px;font-size:12px;cursor:pointer;">Cancel</button>
                <button type="button" id="alignLoadProceed" style="padding:6px 14px;font-size:12px;cursor:pointer;background:#1a73e8;color:#fff;border:1px solid #1557b0;border-radius:3px;">Load anyway</button>
            </div>
        `;

        dialog.appendChild(title);
        dialog.appendChild(content);
        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);

        const finish = (choice) => {
            backdrop.remove();
            document.removeEventListener('keydown', onKey);
            resolve(choice);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') finish('cancel');
        };
        document.addEventListener('keydown', onKey);
        content.querySelector('#alignLoadCancel').addEventListener('click', () => finish('cancel'));
        content.querySelector('#alignLoadProceed').addEventListener('click', () => finish('proceed'));
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) finish('cancel');
        });
    });
}

/** Run pre-parse scan; for crazy alignments prompt before parse. Returns false if cancelled. */
async function runAlignmentPreflight(inputText) {
    const stats = scanAlignmentText(inputText);
    if (!stats || stats.nSeqs < 1) {
        state.alignmentIndex = null;
        return true;
    }
    const classification = classifyAlignmentSize(stats);
    state.alignmentIndex = { ...stats, ...classification };

    if (classification.mode === 'crazy') {
        const choice = await showLargeAlignmentDialog(stats, classification);
        if (choice === 'cancel') return false;
    } else if (classification.mode === 'tall') {
        showMessage(
            `Large alignment (${stats.nSeqs.toLocaleString()} sequences) — vertical paging when enabled.`,
            3500
        );
    } else if (classification.mode === 'long') {
        showMessage(
            `Long alignment (${stats.maxLen.toLocaleString()} columns) — horizontal chunking when enabled.`,
            3500
        );
    }
    return true;
}

// CORE FUNCTIONS
async function parseAndRender(isFromDrop = false) {
    showMessage("Scanning alignment...", 0);
    _proteinSchemeRemapWarned = false;
    const inputText = fastaInput.value.trim();
    if (!inputText) {
        alignmentContainer.innerHTML = '<div>Paste MSF or FASTA into the box and click Load, or drop a file.</div>';
        statusMessage.style.display = 'none';
        return;
    }

    const proceed = await runAlignmentPreflight(inputText);
    if (!proceed) {
        statusMessage.style.display = 'none';
        showMessage('Load cancelled.', 2500);
        return;
    }

    showMessage("Parsing file...", 0);
    try {
        let parsed;
    // PRIORITIZE CONTENT-BASED DETECTION.
        const isSamContent = _isSamInput(inputText);
        const isMsfContent = (inputText.includes('MSF:') && inputText.includes('Check:')) ||
                             inputText.includes('!!AA_MULTIPLE_ALIGNMENT') ||
                             inputText.includes('!!NA_MULTIPLE_ALIGNMENT');

        if (isSamContent) {
            parsed = parseSamToAlignment(inputText);
            if (!parsed) throw new Error('SAM parsing failed - check format');
            state.currentFilename = state.currentFilename || 'SAM_import';
        } else if (/^LOCUS\s+/mi.test(inputText)) {
            parsed = parseGenBank(inputText);
            if (!parsed) throw new Error('GenBank parsing failed');
            state.currentFilename = state.currentFilename || 'genbank_import';
            showMessage('Detected GenBank format', 1500);
        } else if (inputText.match(/^(CLUSTAL|MUSCLE\s)/m)) {
            parsed = parseClustal(inputText);
            if (!parsed) throw new Error('Clustal parsing failed');
            state.currentFilename = state.currentFilename || 'clustal_import';
            showMessage('Detected Clustal format', 1500);
        } else if (/^# STOCKHOLM/m.test(inputText)) {
            parsed = parseStockholm(inputText);
            if (!parsed) throw new Error('Stockholm parsing failed');
            state.currentFilename = state.currentFilename || 'stockholm_import';
            showMessage('Detected Stockholm format', 1500);
        } else if (/#nexus|#NEXUS|begin\s+data/i.test(inputText)) {
            parsed = parseNexus(inputText);
            if (!parsed) throw new Error('NEXUS parsing failed');
            state.currentFilename = state.currentFilename || 'nexus_import';
            showMessage('Detected NEXUS format', 1500);
        } else if (/^\d+\s+\d+/.test(inputText.trim().split(/\r?\n/)[0])) {
            parsed = parsePhylip(inputText);
            if (parsed) {
                state.currentFilename = state.currentFilename || 'phylip_import';
                showMessage('Detected PHYLIP format', 1500);
            }
        } else if (isFromDrop || isMsfContent) {
            // If it's a file drop OR the content looks like MSF, try MSF first.
            parsed = parseMsf(inputText);
            if (!parsed) {
                showMessage("MSF parsing failed, trying FASTA...", 2000);
                parsed = parseFasta(inputText);
            }
        } else {
            // Otherwise, assume FASTA.
            parsed = parseFasta(inputText);
        }
        if (!parsed) throw new Error("No valid sequences found");
    // MOVE THIS LINE UP: Set filename BEFORE any parsing that might fail.
        if (!isFromDrop) {
            state.currentFilename = 'Clipboard';
            state.currentFilePath = '';
        }
        state.seqs = parsed;
        _userDismissedAutoCanvas = false; // fresh file: allow the Canvas suggestion again if it's large
        state.selectedRows.clear();
        state.selectedColumns.clear();
        state.selectedNucs.clear();
        state.pendingNucStart = null;
        state.lastSelectedIndex = null;
        state.groupConsensusCount = 0;

        // Update name length slider range based on loaded sequences
        // This will set the slider to maximum actual name length
        updateNameLengthSliderRange();

        // Update source info with comprehensive statistics
        updateSourceInfo();
        renderAlignment();
        _updateCompactControlsVisibility();
        // Auto-fit block size to screen width on every load
        setBlockSizeToScreen();
        setupHoverMenuReveal();
        showMessage("File loaded successfully!", 2000);

        // Record in history
        const isClipboard = !isFromDrop && state.currentFilename === 'Clipboard';
        const previewNames = parsed.slice(0, 3).map(s => s.header).join(', ');
        const previewSeq = (parsed[0]?.seq?.substring(0, 50) || '').replace(/-/g, '');
        _historyManager.add(
            isClipboard ? 'clipboard' : 'file',
            {
                name: isClipboard ? ('Paste ' + new Date().toLocaleTimeString()) : (state.currentFilename || 'Unknown'),
                nSeqs: parsed.length,
                length: (parsed[0]?.seq?.length || 0),
                preview: previewNames + (previewSeq ? '  [' + previewSeq + '...]' : ''),
                source: state.currentFilePath || '',
                text: inputText.substring(0, 100000) // store text for all items (100KB cap)
            }
        );

        // Ensure menus don't have inline styles that interfere with hover
        setTimeout(() => {
            try {
                document.querySelectorAll('.control-group').forEach(group => {
                    group.style.maxHeight = '';
                    group.style.display = '';
                });
            } catch (err) {
                console.warn('Failed to clear menu inline styles after load', err);
            }
        }, 100);
    } catch (e) {
        console.error("Error in parseAndRender:", e);
    alignmentContainer.innerHTML = `<div class="error-message">Ã¢Å“â€“ ${e.message}</div>`;
        showMessage(`Error: ${e.message}`, 5000);
    // Reset filename on error to avoid poisoning future loads
        state.currentFilename = '';
        state.currentFilePath = '';
        el('sourceInfo').innerHTML = 'No file loaded';
    }
}
// Mirrors the canonical mode radios' checked state onto the always-visible
// top-bar quick switcher. Called after any change to the real radios,
// including ones the quick switcher itself didn't trigger (Display dropdown,
// the auto-switch-to-Canvas heuristic, snapshot/session restore, etc).
function ensureCanvasModeNotice() {
    let notice = document.getElementById('canvasModeNotice');
    if (notice) return notice;
    const quickSwitch = document.getElementById('quickModeSwitch');
    const shortcuts = document.getElementById('shortcuts-section');
    if (!quickSwitch || !shortcuts || !quickSwitch.parentNode) return null;
    notice = document.createElement('span');
    notice.id = 'canvasModeNotice';
    notice.className = 'canvas-mode-chip';
    notice.title = 'Canvas mode is view-only. Switch to Full or Block to edit sequences or select columns (Ctrl+Alt+click).';
    notice.textContent = 'Canvas · view-only';
    quickSwitch.parentNode.insertBefore(notice, shortcuts);
    return notice;
}

function syncQuickModeSwitch() {
    const map = { modeSingle: 'qmSingle', modeBlocks: 'qmBlocks', modeCanvas: 'qmCanvas', modeReads: 'qmReads' };
    for (const [canonicalId, quickId] of Object.entries(map)) {
        const canonical = document.getElementById(canonicalId);
        const quick = document.getElementById(quickId);
        if (canonical && quick) quick.checked = canonical.checked;
    }

    // Only surface this switcher once you've actually left Full/Block (i.e. as
    // a way back from a "special" mode) - it stays out of the way otherwise.
    const isReadsMode = document.getElementById('modeReads')?.checked;
    const isCanvasMode = document.getElementById('modeCanvas')?.checked;
    const switchEl = document.getElementById('quickModeSwitch');
    if (switchEl) switchEl.style.display = (isCanvasMode || isReadsMode) ? '' : 'none';

    // Reads is only a real option once a reads (BAM/SAM) file has actually
    // been loaded - it's not a mode you'd otherwise want to switch into blind.
    const readsLabel = document.getElementById('qmReadsLabel');
    if (readsLabel) readsLabel.style.display = (bamState?.reads?.length > 0 || isReadsMode) ? '' : 'none';

    const canvasNotice = ensureCanvasModeNotice();
    setCanvasNoticeVisible(!!isCanvasMode);
}

function onModeChange() {
    // This only fires from a real user click on a mode radio (the auto-switch
    // heuristic in renderAlignment sets .checked programmatically, which does
    // not dispatch 'change'), so this is an unambiguous signal to stop
    // auto-switching back to Canvas for the rest of this file's session.
    _userDismissedAutoCanvas = true;
    if (document.getElementById('modeCanvas')?.checked) {
        // Entering Canvas mode: these caches are keyed only by length/shadeMode,
        // so any same-length edit made while away from Canvas (residue edits,
        // gap ops, sorts, realigns, etc.) would otherwise go undetected and
        // Canvas would silently keep showing stale shading/consensus.
        state.conservationDataCache = null;
        state.consensusCache = null;
    }
    syncQuickModeSwitch();
    // Keep block size row visible but gray it out when not in Block mode - prevents layout jump
    const container = el('blockSizeContainer');
    const isBlocks = el('modeBlocks')?.checked;
    if (container) {
        container.style.opacity = isBlocks ? '1' : '0.4';
        container.style.pointerEvents = isBlocks ? 'auto' : 'none';
    }
    _updateCompactControlsVisibility();
    renderAlignment();
    setupHoverMenuReveal();
}

function _updateCompactControlsVisibility() {
    const isCompact = el('modeCompact')?.checked;
    const hasPairs = state.seqs.some(s => s._pairInfo || s._samPair);
    // The compact-only row is a div with class compact-only
    const compactRow = document.querySelector('.mode-container .compact-only');
    if (compactRow) compactRow.style.display = isCompact ? 'flex' : 'none';
    const pairsEl = document.querySelector('.mode-container .compact-pairs-only');
    if (pairsEl) pairsEl.style.display = (isCompact && hasPairs) ? '' : 'none';
}

function setBlockSizeToScreen() {
    // Estimate how many chars fit in the visible alignment area.
    // Measure a single nucleotide span if one exists; otherwise approximate
    // from the container width minus the name column width.
    const container = document.getElementById('alignmentContainer');
    if (!container) return;
    // Try to measure an existing nucleotide span
    let charPx = 0;
    const sampleSpan = container.querySelector('.seq-data span[data-pos]');
    if (sampleSpan) {
        const r = sampleSpan.getBoundingClientRect();
        charPx = r.width;
    }
    if (!charPx) {
        // Fallback: use zoom-scaled monospace estimate (10px @ 100%)
        const zoom = _sliderToZoom(parseInt(el('zoomSlider')?.value || 50)) / 100;
        charPx = 10 * zoom;
    }
    // Available width = inner width of the container (excluding names)
    // Names col is sticky - measure it from the first name span
    let namePx = 0;
    const nameSpan = container.querySelector('.seq-name');
    if (nameSpan) {
        namePx = nameSpan.getBoundingClientRect().width;
    }
    const available = container.clientWidth - namePx - 20; // 20px safety margin
    const chars = Math.max(40, Math.min(300, Math.floor(available / charPx)));
    // Update slider and input
    const slider = el('blockSizeSlider');
    const input = el('blockSizeInput');
    const prev = parseInt(slider?.value || '200', 10);
    if (slider) slider.value = chars;
    if (input) input.value = chars;
    // Block size only affects Block mode. Canvas/Full/Compact don't reflow to it,
    // so avoid a redundant second full render on load for those modes. In Block
    // mode, re-render only when the computed size actually changed.
    const inBlockMode = !!el('modeBlocks')?.checked;
    if (inBlockMode && chars !== prev) {
        renderAlignment();
    }
}
function onShadeModeChange() {
    validateThresholds();
    debounceRender();
}
// Color picker logic for Black, Dark, Light
['black', 'dark', 'light'].forEach(function(shade) {
    const label = document.getElementById(shade + 'Label');
    const picker = document.getElementById(shade + 'ColorPicker');
    const slider = document.getElementById(shade + 'Slider');
    if (label && picker) {
        // Show picker on hover instead of click
        label.addEventListener('mouseenter', function() {
            picker.style.display = 'inline-block';
        });
        label.addEventListener('mouseleave', function() {
            // Hide picker when mouse leaves both label and picker
            setTimeout(() => {
                if (!label.matches(':hover') && !picker.matches(':hover')) {
                    picker.style.display = 'none';
                }
            }, 100);
        });
        picker.addEventListener('mouseleave', function() {
            // Hide picker when mouse leaves picker
            setTimeout(() => {
                if (!label.matches(':hover') && !picker.matches(':hover')) {
                    picker.style.display = 'none';
                }
            }, 100);
        });
        picker.addEventListener('input', function() {
            // Update CSS variable for slider fill
            slider.style.setProperty('--slider-fill', picker.value);
            // Also update the corresponding CSS variable for alignment shading if needed
            document.documentElement.style.setProperty('--' + shade + 'Shading', picker.value);
            // Compute readable text color (black or white) based on chosen color brightness
            try {
                const hex = (picker.value || '#000').replace('#', '');
                const r = parseInt(hex.substring(0,2), 16) || 0;
                const g = parseInt(hex.substring(2,4), 16) || 0;
                const b = parseInt(hex.substring(4,6), 16) || 0;
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                const textColor = brightness > 128 ? '#000' : '#fff';
                document.documentElement.style.setProperty('--' + shade + 'Text', textColor);
            } catch (err) {
                // ignore
            }
            // Update slider background
            updateSliderBackground(slider);
            // Optionally re-render alignment if color affects display
            if (typeof renderAlignment === 'function') {
                renderAlignment();
            }
        });
    }
});

// Reset button functionality for color pickers
['black', 'dark', 'light'].forEach(function(shade) {
    const resetButton = document.getElementById(shade + 'Reset');
    const picker = document.getElementById(shade + 'ColorPicker');
    const slider = document.getElementById(shade + 'Slider');

    if (resetButton && picker) {
        resetButton.addEventListener('click', function() {
            // Reset to default colors
            const defaultColors = {
                'black': '#000000',
                'dark': '#555555',
                'light': '#cccccc'
            };

            const defaultColor = defaultColors[shade];
            picker.value = defaultColor;

            // Update CSS variable for slider fill
            slider.style.setProperty('--slider-fill', defaultColor);
            // Update the corresponding CSS variable for alignment shading
            document.documentElement.style.setProperty('--' + shade + 'Shading', defaultColor);

            // Compute readable text color
            try {
                const hex = (defaultColor || '#000').replace('#', '');
                const r = parseInt(hex.substring(0,2), 16) || 0;
                const g = parseInt(hex.substring(2,4), 16) || 0;
                const b = parseInt(hex.substring(4,6), 16) || 0;
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                const textColor = brightness > 128 ? '#000' : '#fff';
                document.documentElement.style.setProperty('--' + shade + 'Text', textColor);
            } catch (err) {
                // ignore
            }

            // Update slider background and re-render
            updateSliderBackground(slider);
            if (typeof renderAlignment === 'function') {
                renderAlignment();
            }
        });
    }
});

// EVENT HANDLERS
function isCtrlModifier(e) {
    if (typeof e.getModifierState === 'function') {
        return e.getModifierState('Control') || e.getModifierState('Meta');
    }
    return !!(e.ctrlKey || e.metaKey);
}

function isAltModifier(e) {
    if (typeof e.getModifierState === 'function') {
        return e.getModifierState('Alt');
    }
    return !!e.altKey;
}

function setCanvasNoticeVisible(visible) {
    const notice = ensureCanvasModeNotice();
    if (notice) notice.classList.toggle('is-visible', visible);
}

function handleColumnSelectMouseDown(e) {
    if (e.button !== 0) return;
    if (!isCtrlModifier(e) || !isAltModifier(e)) return;
    const row = e.target.closest('.seq-line');
    if (!row || row.classList.contains('consensus-line') || row.classList.contains('scale-ruler-line')) return;
    const span = e.target.closest('.seq-data span[data-pos]');
    if (!span) return;
    const pos = parseInt(span.dataset.pos, 10);
    if (!Number.isFinite(pos)) return;

    state.isDragging = true;
    state.dragStartCol = pos;
    state.dragMode = 'col';

    if (e.shiftKey && state.lastSelectedColumn !== null) {
        const start = Math.min(state.lastSelectedColumn, pos);
        const end = Math.max(state.lastSelectedColumn, pos);
        for (let p = start; p <= end; p++) {
            state.selectedColumns.add(p);
        }
    } else if (state.selectedColumns.has(pos)) {
        state.selectedColumns.delete(pos);
    } else {
        state.selectedColumns.add(pos);
    }

    state.lastSelectedColumn = pos;
    updateColumnSelections();
    hideTooltip();
    e.preventDefault();
    e.stopPropagation();
}

function handleMouseDown(e) {
    if (e.button !== 0) return;
    const row = e.target.closest('.seq-line');
    if (!row || row.classList.contains('consensus-line')) return;
    const index = parseInt(row.dataset.seqIndex);
    const name = e.target.closest('.seq-name');
    const span = e.target.closest('.seq-data span');
    if (name) {
        if (isCtrlModifier(e)) {
            state.isDragging = true;
            state.dragStartRow = index;
            state.dragMode = 'row';
            toggleRowSelection(index);
            e.preventDefault();
        } else if (e.shiftKey && state.lastSelectedIndex !== null) {
            const start = Math.min(state.lastSelectedIndex, index);
            const end = Math.max(state.lastSelectedIndex, index);
            for (let i = start; i <= end; i++) {
                state.selectedRows.add(i);
            }
            updateRowSelections();
            e.preventDefault();
        }
    // No else clause - click without Ctrl/Shift copies name (handled in nameSpan.click)
    } else if (span && isCtrlModifier(e) && !isAltModifier(e)) {
        const pos = parseInt(span.dataset.pos);
        if (isNaN(pos)) return;

        // Check if this is a simple click (not a drag)
        // We'll determine this in mouseup - for now, prepare for both possibilities

        // Two-click system: Check if we have a pending start
        if (state.pendingNucStart === null) {
            // First click - set pending start and also prepare for potential drag
            state.selectedNucs.clear();
            state.pendingNucStart = {row: index, pos: pos};

            // Also set up drag state in case user drags
            state.isDragging = true;
            state.dragStartRow = index;
            state.dragStartCol = pos;
            state.dragMode = 'nuc';

            // Set initial selection to just this nucleotide
            let rowSet = new Set();
            rowSet.add(pos);
            state.selectedNucs.set(index, rowSet);

            scheduleNucSelectionRefresh();
        } else if (state.pendingNucStart.row === index) {
            // Second click on same row - complete the two-click selection
            const startPos = Math.min(state.pendingNucStart.pos, pos);
            const endPos = Math.max(state.pendingNucStart.pos, pos);
            let rowSet = new Set();
            for (let p = startPos; p <= endPos; p++) {
                rowSet.add(p);
            }
            state.selectedNucs.set(index, rowSet);
            state.pendingNucStart = null;
            scheduleNucSelectionRefresh();
        } else {
            // Click on different row - clear pending and start fresh
            state.selectedNucs.clear();
            state.pendingNucStart = {row: index, pos: pos};

            // Also set up drag state
            state.isDragging = true;
            state.dragStartRow = index;
            state.dragStartCol = pos;
            state.dragMode = 'nuc';

            let rowSet = new Set();
            rowSet.add(pos);
            state.selectedNucs.set(index, rowSet);

            scheduleNucSelectionRefresh();
        }

        e.preventDefault();
    }
    // Column selection: Ctrl+Alt+click handled in capture phase (handleColumnSelectMouseDown)
}
// Selection helper consolidating toggle behavior
function toggleRowSelection(index) {
    if (state.selectedRows.has(index)) {
        state.selectedRows.delete(index);
    } else {
        state.selectedRows.add(index);
    }
    state.lastSelectedIndex = index;
    updateRowSelections();
}
function handleMouseMove(e) {
    if (!state.isDragging) return;
    if (state.dragMode === 'row') {
        const row = e.target.closest('.seq-line');
        if (row) {
            const index = parseInt(row.dataset.seqIndex);
            if (index !== undefined) {
                const start = Math.min(state.dragStartRow, index);
                const end = Math.max(state.dragStartRow, index);
                for (let i = start; i <= end; i++) {
                    state.selectedRows.add(i);
                }
                updateRowSelections();
            }
        }
    } else if (state.dragMode === 'col') {
        hideTooltip();
        const span = e.target.closest('.seq-data span');
        if (span) {
            const pos = parseInt(span.dataset.pos);
            if (isNaN(pos)) return;
            const start = Math.min(state.dragStartCol, pos);
            const end = Math.max(state.dragStartCol, pos);
            for (let p = start; p <= end; p++) {
                state.selectedColumns.add(p);
            }
            updateColumnSelections();
        }
    } else if (state.dragMode === 'nuc') {
        const span = e.target.closest('.seq-data span');
        if (span) {
            const pos = parseInt(span.dataset.pos);
            if (isNaN(pos)) return;
            const currentIndex = parseInt(span.closest('.seq-line').dataset.seqIndex);
            // Only allow drag within the same row
            if (currentIndex === state.dragStartRow) {
                const startPos = Math.min(state.dragStartCol, pos);
                const endPos = Math.max(state.dragStartCol, pos);

                // Clear existing selection and create new range
                state.selectedNucs.clear();
                let rowSet = new Set();
                for (let p = startPos; p <= endPos; p++) {
                    rowSet.add(p);
                }
                state.selectedNucs.set(currentIndex, rowSet);
                scheduleNucSelectionRefresh();
            }
        }
    }
    e.preventDefault();
}
function handleMouseUp() {
    if (state.dragMode === 'nuc') {
        // If we have a pending start, this was either a simple click or a drag
        // The drag selection is already handled in mousemove
        // For simple clicks, keep the pending start for the two-click system
    }
    state.isDragging = false;
    state.dragStartRow = null;
    state.dragStartCol = null;
    state.dragMode = null;
}
function handleKeyDown(e) {
    if (e.key === 'Escape') {
        closeAllMenusViaEsc();
        e.preventDefault();
        return;
    }

    // If focus is in an input/textarea, block unmodified keypresses (normal typing),
    // but allow Ctrl/Meta/Alt shortcuts to pass through Ã¢â‚¬â€ EXCEPT in TEXTAREA
    // where browser-native shortcuts (Ctrl+A select-all-text, Ctrl+C copy, etc.) should work.
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        if (activeEl.tagName === 'TEXTAREA') {
            return; // let browser handle all keys in textarea (Input window etc.)
        }
        if (e.ctrlKey || e.metaKey || e.altKey) {
            // modifier key held Ã¢â‚¬â€ treat as shortcut, let it fall through
        } else if (state.editModeActive && state.editTool === 'residue' && state.editCell) {
            // GeneDoc residue editing mode Ã¢â‚¬â€ allow unmodified keys
        } else {
            return; // normal typing in input Ã¢â‚¬â€ don't intercept
        }
    }
    if (handleGeneDocResidueKey(e)) {
        return;
    }
    if (e.ctrlKey || e.metaKey) {
        state.ctrlPressed = true;
    }
    if (e.altKey) {
        state.altPressed = true;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        copySelected();
        e.preventDefault();
    }
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'r':
                if (e.shiftKey) {
                    realignSelectedBlock();
                } else {
                    reverseComplementSelected();
                }
                e.preventDefault();
                break;
            case 'del':
                deleteSelected();
                e.preventDefault();
                break;
            case 'z':
                undoDelete();
                e.preventDefault();
                break;
            case 'y':
                redoAction();
                e.preventDefault();
                break;
            case 'b':
                insertGroupConsensus();
                e.preventDefault();
                break;
            case 'u':
                duplicateSelected();
                e.preventDefault();
                break;
            case 't':
                openSelectedInNewTab();
                e.preventDefault();
                break;
            case 'a':
                selectAllSequences();
                e.preventDefault();
                break;
            case 's':
                if (e.shiftKey) {
                    savePreset();
                    e.preventDefault();
                }
                break;
            case 'o':
                loadPreset();
                e.preventDefault();
                break;
            case 'i':
                openInfoModal();
                e.preventDefault();
                break;
            case 'h':
                minimizeMenu();
                e.preventDefault();
                break;
            case 'f':
                if (e.shiftKey) {
                    clearLastSearch();
                } else if (e.altKey) {
                    clearAllSearches();
                } else {
                    searchMotif();
                }
                e.preventDefault();
                break;
            case 'k':
                if (e.shiftKey) {
                    copyConsensus();
                }
                e.preventDefault();
                break;
            case 'j':
                if (e.shiftKey) {
                    copySelectedConsensus();
                }
                e.preventDefault();
                break;
            case 'v':
                if (e.shiftKey) {
                    copySelectedColumns();
                }
                e.preventDefault();
                break;
            case 'd':
                if (e.shiftKey) {
                    deleteSelectedColumns();
                } else {
                    deleteSelectedColumns(true);
                }
                e.preventDefault();
                break;
            case '+':
                adjustZoom(10);
                e.preventDefault();
                break;
            case '-':
                adjustZoom(-10);
                e.preventDefault();
                break;
            case '0':
                // Reset zoom to 100%
                el('zoomSlider').value = _zoomToSlider(100);
                setZoom(100);
                e.preventDefault();
                break;
            case 'm':
                // Toggle all menu sections
                toggleAllSections();
                e.preventDefault();
                break;
        }
    }
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowUp') {
            moveSelectedUp();
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            moveSelectedDown();
            e.preventDefault();
        } else if (e.key === 'Home') {
            moveSelectedToTop();
            e.preventDefault();
        } else if (e.key === 'End') {
            moveSelectedToBottom();
            e.preventDefault();
        }
    }

    // Navigation shortcuts (non-Ctrl)
    if (e.key === 'F3') {
        if (e.shiftKey) {
            // Previous search result (placeholder for future implementation)
            showMessage("Previous search result (not implemented)", 2000);
        } else {
            // Next search result (placeholder for future implementation)
            showMessage("Next search result (not implemented)", 2000);
        }
        e.preventDefault();
    }

    // Page navigation for large alignments
    if (e.key === 'PageUp' || e.key === 'PageDown') {
        const container = alignmentContainer;
        const direction = e.key === 'PageUp' ? -1 : 1;
        const scrollAmount = container.clientHeight * 0.8;
        container.scrollTop += direction * scrollAmount;
        e.preventDefault();
    }
}
function handleKeyUp(e) {
    if (!e.ctrlKey && !e.metaKey) {
        state.ctrlPressed = false;
    }
    if (!e.altKey) {
        state.altPressed = false;
    }
}

window.addEventListener('blur', () => {
    state.ctrlPressed = false;
    state.altPressed = false;
});
// ACTION FUNCTIONS
function reverseComplementSelected() {
    if (state.selectedRows.size === 0) {
        showMessage("Select sequences (Ctrl+click) to RevComp.", 3000);
        return;
    }
    pushUndo('revcomp');
    for (const i of state.selectedRows) {
        if (i < state.seqs.length) {
            state.seqs[i] = {
                ...state.seqs[i],
                seq: reverseComplement(state.seqs[i].seq)
            };
            state.seqs[i].gaplessPositions = calculateGaplessPositions(state.seqs[i].seq);
        }
    }
    state.lastAction = 'revcomp';
    renderAlignment();
    showMessage("Reverse complement applied!", 2000);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Sort functions Ã¢â€â‚¬Ã¢â€â‚¬
function sortByName() {
    pushUndo();
    const indices = state.seqs.map((s, i) => ({ idx: i, name: s.header.toLowerCase() }));
    indices.sort((a, b) => a.name.localeCompare(b.name));
    state.seqs = indices.map(e => state.seqs[e.idx]);
    state.lastAction = 'sort';
    renderAlignment();
    showMessage('Sorted by name', 2000);
}
function sortByLength() {
    pushUndo();
    const indices = state.seqs.map((s, i) => ({ idx: i, len: s.seq.replace(/[-.]/g, '').length }));
    indices.sort((a, b) => b.len - a.len);
    state.seqs = indices.map(e => state.seqs[e.idx]);
    state.lastAction = 'sort';
    renderAlignment();
    showMessage('Sorted by length (descending)', 2000);
}
function sortBySimilarity() {
    if (state.seqs.length < 2) return;
    pushUndo();
    const ref = state.seqs[0].seq;
    const scored = state.seqs.map((s, i) => {
        let match = 0, total = 0;
        for (let p = 0; p < ref.length; p++) {
            const a = ref[p], b = s.seq[p] || '-';
            if (a !== '-' && a !== '.' && b !== '-' && b !== '.') { total++; if (a === b) match++; }
        }
        return { idx: i, score: total > 0 ? match / total : 0 };
    });
    scored.sort((a, b) => b.score - a.score);
    state.seqs = scored.map(e => state.seqs[e.idx]);
    state.lastAction = 'sort';
    renderAlignment();
    showMessage('Sorted by similarity to first sequence', 2000);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Save / Load sequence order Ã¢â€â‚¬Ã¢â€â‚¬
function exportOrder() {
    if (!state.seqs.length) { showMessage('No sequences loaded', 2000); return; }
    const order = state.seqs.map(s => s.header);
    const json = JSON.stringify({ version: 1, exported: new Date().toISOString(), count: order.length, order }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = _sanitizeSnapshotFileBaseName('msa_order') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showMessage('Order exported (' + order.length + ' sequences)', 2000);
}

function importOrder() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!data.order || !Array.isArray(data.order)) throw new Error('Invalid order file');
                const orderMap = new Map(data.order.map((h, i) => [h, i]));
                const currentHeaders = new Set(state.seqs.map(s => s.header));
                // Keep only headers present in the current alignment
                const reordered = [];
                const unmatched = [];
                for (const s of state.seqs) {
                    if (orderMap.has(s.header)) reordered.push(s);
                    else unmatched.push(s);
                }
                reordered.sort((a, b) => orderMap.get(a.header) - orderMap.get(b.header));
                const extra = data.order.filter(h => !currentHeaders.has(h));
                pushUndo();
                state.seqs = [...reordered, ...unmatched];
                state.lastAction = 'sort';
                renderAlignment();
                let msg = 'Order loaded (' + reordered.length + ' matched';
                if (unmatched.length) msg += ', ' + unmatched.length + ' new';
                if (extra.length) msg += ', ' + extra.length + ' missing';
                msg += ')';
                showMessage(msg, 2500);
            } catch (e) {
                showMessage('Invalid order file: ' + e.message, 4000);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function deleteSelected() {
    if (state.selectedRows.size === 0) {
        showMessage("No sequences selected for deletion.", 3000);
        return;
    }
    if (state.seqs.length === 1) {
        showMessage("Cannot delete the last sequence.", 3000);
        return;
    }
    if (confirm(`Delete ${state.selectedRows.size} sequence(s)?`)) {
        pushUndo('delete');
        const indicesToDelete = Array.from(state.selectedRows).sort((a,b)=>b-a);
        for (const index of indicesToDelete) {
            if (index < state.seqs.length) {
                state.seqs.splice(index, 1);
            }
        }
        state.selectedRows.clear();
        state.lastSelectedIndex = null;
        state.lastAction = 'delete';
        renderAlignment();
        showMessage("Sequences deleted!", 2000);
    }
}
/**
 * Push current state onto undo stack. Call BEFORE mutating state.
 */
function pushUndo(type) {
    state.deletedHistory.push({
        type: type,
        seqs: JSON.parse(JSON.stringify(state.seqs)),
        selectedRows: new Set(state.selectedRows),
        selectedColumns: new Set(state.selectedColumns)
    });
    // Clear redo stack whenever a new action is performed
    state.redoHistory = [];
}

function pushUndoRowPatch(type, rowIndex, beforeSeq, afterSeq) {
    if (!state.seqs[rowIndex] || beforeSeq === afterSeq) return;
    state.deletedHistory.push({
        type,
        patchType: 'row-seq',
        rowIndex,
        beforeSeq,
        afterSeq,
        selectedRows: new Set(state.selectedRows),
        selectedColumns: new Set(state.selectedColumns)
    });
    state.redoHistory = [];
}

function applyRowSeqPatch(entry, useAfter) {
    const rowIndex = entry?.rowIndex;
    if (!Number.isInteger(rowIndex) || !state.seqs[rowIndex]) return false;
    const nextSeq = useAfter ? entry.afterSeq : entry.beforeSeq;
    if (typeof nextSeq !== 'string') return false;
    state.seqs[rowIndex] = {
        ...state.seqs[rowIndex],
        seq: nextSeq,
        gaplessPositions: calculateGaplessPositions(nextSeq)
    };
    state.selectedRows = entry.selectedRows || new Set();
    state.selectedColumns = entry.selectedColumns || new Set();
    state.selectedNucs.clear();
    normalizeAlignmentLengths();
    renderAlignment();
    return true;
}

function undoDelete() {
    if (state.deletedHistory.length === 0) {
        showMessage("Nothing to undo.", 3000);
        return;
    }
    const last = state.deletedHistory.pop();
    if (last.patchType === 'row-seq') {
        state.redoHistory.push(last);
        if (applyRowSeqPatch(last, false)) {
            state.lastAction = null;
            showMessage(`Undo: ${last.type}`, 2000);
        }
        return;
    }
    // Save current state to redo stack before restoring
    state.redoHistory.push({
        type: 'redo-snapshot',
        seqs: JSON.parse(JSON.stringify(state.seqs)),
        selectedRows: new Set(state.selectedRows),
        selectedColumns: new Set(state.selectedColumns)
    });
    state.seqs = last.seqs;
    state.selectedRows = last.selectedRows || new Set();
    state.selectedColumns = last.selectedColumns || new Set();
    state.selectedNucs.clear();
    state.lastAction = null;
    renderAlignment();
    showMessage(`Undo: ${last.type}`, 2000);
}

function redoAction() {
    if (state.redoHistory.length === 0) {
        showMessage("Nothing to redo.", 3000);
        return;
    }
    const next = state.redoHistory.pop();
    if (next.patchType === 'row-seq') {
        state.deletedHistory.push(next);
        if (applyRowSeqPatch(next, true)) {
            state.lastAction = null;
            showMessage("Redo completed!", 2000);
        }
        return;
    }
    // Save current state to undo stack before redo
    state.deletedHistory.push({
        type: 'before-redo',
        seqs: JSON.parse(JSON.stringify(state.seqs)),
        selectedRows: new Set(state.selectedRows),
        selectedColumns: new Set(state.selectedColumns)
    });
    state.seqs = next.seqs;
    state.selectedRows = next.selectedRows || new Set();
    state.selectedColumns = next.selectedColumns || new Set();
    state.selectedNucs.clear();
    state.lastAction = null;
    renderAlignment();
    showMessage("Redo completed!", 2000);
}
function copySelected() {
    let nucText = '';
    for (let [i, posSet] of state.selectedNucs.entries()) {
        if (posSet.size === 0) continue;
        const s = state.seqs[i];
        const poss = Array.from(posSet).sort((a, b) => a - b);
        let start = poss[0], end = poss[0];
        let ranges = [];
        for (let j = 1; j < poss.length; j++) {
            if (poss[j] === end + 1) {
                end = poss[j];
            } else {
                ranges.push([start, end]);
                start = end = poss[j];
            }
        }
        ranges.push([start, end]);
        for (let [st, en] of ranges) {
            const sub = s.seq.slice(st, en + 1);
            nucText += sub + '\n';
        }
    }
    const trimmedNucText = nucText.trim();
    if (trimmedNucText) {
        const previewSource = trimmedNucText.replace(/\s+/g, ' ');
    const preview = previewSource.length > 50 ? previewSource.slice(0, 50) + '...' : previewSource;
        const baseCount = trimmedNucText.replace(/\s+/g, '').length;
        navigator.clipboard.writeText(trimmedNucText).then(() => {
            showMessage(`Copied ${baseCount} bp: ${preview}`, 4000);
        }).catch(err => {
            console.error('Copy failed:', err);
            showMessage("Failed to copy. Check console.", 5000);
        });
        return;
    }
    // Removed "No sequence selected" message - silent if nothing to copy
    if (state.selectedRows.size === 0) {
        return;
    }
    const fasta = Array.from(state.selectedRows).sort((a,b) => a - b).map(i => {
        const s = state.seqs[i];
        return `>${s.fullHeader || s.header}\n${s.seq}`;
    }).join('\n');
    navigator.clipboard.writeText(fasta).then(() => {
        showMessage("Selected sequences copied as FASTA!", 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showMessage("Failed to copy. Check console.", 5000);
    });
}
function copyAlignment() {
    if (!state.seqs || state.seqs.length === 0) {
        showMessage("No alignment loaded to copy.", 3000);
        return;
    }
    const fasta = state.seqs.map(s => `>${s.fullHeader || s.header}\n${s.seq}`).join('\n');
    navigator.clipboard.writeText(fasta).then(() => {
        const seqCount = state.seqs.length;
        const seqLen = state.seqs[0]?.seq.length || 0;
        showMessage(`Copied ${seqCount} sequences (${seqLen} bp) to clipboard!`, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showMessage("Failed to copy. Check console.", 5000);
    });
}
function downloadAlignment() {
    if (!state.seqs || state.seqs.length === 0) {
        showMessage("No alignment loaded to save.", 3000);
        return;
    }
    const fasta = state.seqs.map(s => `>${s.fullHeader || s.header}\n${s.seq}`).join('\n');
    const filename = (state.currentFilename || 'alignment').replace(/\.[^.]+$/, '') + '.fasta';
    const blob = new Blob([fasta], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showMessage(`Saved ${state.seqs.length} sequences as ${filename}`, 2000);
}
function copyPlainSingle(index) {
    const s = state.seqs[index];
    navigator.clipboard.writeText(s.seq).then(() => {
        showMessage("Sequence copied as plain text!", 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showMessage("Failed to copy. Check console.", 5000);
    });
}
function copyConsensus() {
    if (!state.consensusSeq) {
        showMessage("No consensus available to copy.", 3000);
        return;
    }
    const seqCount = state.seqs.length;
    const fasta = `>consensus_${seqCount}seqs\n${state.consensusSeq}`;
    navigator.clipboard.writeText(fasta).then(() => {
        showMessage("Consensus copied as FASTA!", 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showMessage("Failed to copy. Check console.", 5000);
    });
}
function copySelectedConsensus() {
    if (state.selectedRows.size < 2) {
        showMessage("Select at least 2 sequences to compute consensus.", 3000);
        return;
    }
    const selectedSeqs = Array.from(state.selectedRows).map(i => state.seqs[i].seq);
    const len = Math.max(...selectedSeqs.map(s => s.length));
    const threshold = clampConsensusPercent(el('consensusThreshold').value) / 100;
    const consType = document.querySelector('input[name="consensusType"]:checked').value;
    const fallbackMode = (document.getElementById('consensusFallback')?.value) || 'gap';
    const coverageMin = clampMinCoverage(el('consensusMinCoverage')?.value) / 100;
    let consArr = [];
    for (let pos = 0; pos < len; pos++) {
        const fullCol = selectedSeqs.map(s => s[pos] || '-');
        const nonGapCol = fullCol.filter(b => b !== '-' && b !== '.');
        if (nonGapCol.length === 0) {
            consArr.push('-');
            continue;
        }
        // Enforce min coverage relative to selected sequences
        const coverage = nonGapCol.length / selectedSeqs.length;
        if (coverage < coverageMin) {
            consArr.push('-');
            continue;
        }
        const counts = {};
        nonGapCol.forEach(b => counts[b] = (counts[b] || 0) + 1);
        const maxCount = Math.max(...Object.values(counts));
        const maxBases = Object.keys(counts).filter(b => counts[b] === maxCount);
        const freq = maxCount / fullCol.length; // align with displayed consensus
        if (freq >= threshold) {
            if (consType === 'ambiguous') {
                const stdTop = maxBases
                    .map(b => (b === 'U' ? 'T' : b))
                    .filter(b => ['A','C','G','T'].includes(b));
                if (stdTop.length >= 2) {
                    consArr.push(iupacFromBases(stdTop));
                } else if (stdTop.length === 1) {
                    consArr.push(stdTop[0]);
                } else {
                    consArr.push(maxBases.sort()[0]);
                }
            } else {
                const normalBases = ['A','C','G','T'].filter(b => counts[b]);
                if (normalBases.length > 0) {
                    const maxNormal = Math.max(...normalBases.map(b => counts[b] || 0));
                    const maxNormalBases = normalBases.filter(b => (counts[b] || 0) === maxNormal);
                    consArr.push(maxNormalBases.sort()[0]);
                } else {
                    consArr.push(maxBases.sort()[0]);
                }
            }
        } else {
            const presentStd = Object.keys(counts)
                .map(b => (b === 'U' ? 'T' : b))
                .filter(b => ['A','C','G','T'].includes(b));
            const uniqueStd = Array.from(new Set(presentStd));
            if (fallbackMode === 'iupac' && uniqueStd.length >= 2) {
                consArr.push(iupacFromBases(uniqueStd));
            } else if (fallbackMode === 'n' && uniqueStd.length >= 2) {
                consArr.push('N');
            } else {
                consArr.push('-');
            }
        }
    }
    // By default we copy consensus without gaps, mirroring Copy Consensus behavior
    const consStr = consArr.join('');
    const gapless = consStr.replace(/-/g, '');
    const fasta = `>Selected_Consensus\n${gapless}`;
    navigator.clipboard.writeText(fasta).then(() => {
        showMessage("Selected sequences consensus copied as FASTA!", 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showMessage("Failed to copy. Check console.", 5000);
    });
}
function copySelectedColumns() {
    if (state.selectedColumns.size === 0) {
        showMessage("No columns selected to copy.", 3000);
        return;
    }
    const cols = Array.from(state.selectedColumns).sort((a,b) => a - b);
    const fasta = state.seqs.map(s => {
        let seq = '';
        for (const pos of cols) {
            seq += s.seq[pos] || '-';
        }
        return `>${s.fullHeader || s.header}\n${seq}`;
    }).join('\n');
    navigator.clipboard.writeText(fasta).then(() => {
        showMessage("Selected columns copied as FASTA!", 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showMessage("Failed to copy.", 5000);
    });
}
function deleteSelectedColumns(skipConfirm) {
    if (state.selectedColumns.size === 0) {
        showMessage("No columns selected for deletion.", 3000);
        return;
    }
    if (skipConfirm || confirm(`Delete ${state.selectedColumns.size} column(s)?`)) {
        pushUndo('deleteColumns');
        const colsToDelete = Array.from(state.selectedColumns).sort((a,b) => b - a);
        state.seqs = state.seqs.map(s => {
            let seq = s.seq.split('');
            for (const pos of colsToDelete) {
                if (pos < seq.length) seq.splice(pos, 1);
            }
            s.gaplessPositions = calculateGaplessPositions(seq.join(''));
            return { ...s, seq: seq.join('') };
        });
        state.selectedColumns.clear();
        state.lastAction = 'deleteColumns';
        renderAlignment();
        showMessage("Columns deleted!", 2000);
    }
}
function selectAllSequences() {
    if (state.selectedRows.size === state.seqs.length) {
        state.selectedRows.clear();
        showMessage("All sequences deselected.", 2000);
    } else {
        state.selectedRows.clear();
        for (let i = 0; i < state.seqs.length; i++) {
            state.selectedRows.add(i);
        }
        showMessage("All sequences selected.", 2000);
    }
    updateRowSelections();
}
function moveSelectedUp() {
    if (state.selectedRows.size === 0) return;
    pushUndo('order');
    const indices = Array.from(state.selectedRows).sort((a, b) => a - b);
    if (indices[0] === 0) return;
    const newSeqs = [...state.seqs];
    const group = indices.map(i => newSeqs[i]);
    for (let j = indices.length - 1; j >= 0; j--) {
        newSeqs.splice(indices[j], 1);
    }
    const insertPos = indices[0] - 1;
    newSeqs.splice(insertPos, 0, ...group);
    state.seqs = newSeqs;
    state.selectedRows.clear();
    for (let k = 0; k < indices.length; k++) {
        state.selectedRows.add(insertPos + k);
    }
    renderAlignment();
    showMessage("Sequences moved up!", 2000);
}
function moveSelectedDown() {
    if (state.selectedRows.size === 0) return;
    pushUndo('order');
    const indices = Array.from(state.selectedRows).sort((a, b) => a - b);
    if (indices[indices.length - 1] === state.seqs.length - 1) return;
    const newSeqs = [...state.seqs];
    const group = indices.map(i => newSeqs[i]);
    for (let j = indices.length - 1; j >= 0; j--) {
        newSeqs.splice(indices[j], 1);
    }
    const insertPos = indices[indices.length - 1] - indices.length + 2;
    newSeqs.splice(insertPos, 0, ...group);
    state.seqs = newSeqs;
    state.selectedRows.clear();
    for (let k = 0; k < indices.length; k++) {
        state.selectedRows.add(insertPos + k);
    }
    renderAlignment();
    showMessage("Sequences moved down!", 2000);
}
function moveSelectedToTop() {
    if (state.selectedRows.size === 0) return;
    pushUndo('order');
    const indices = Array.from(state.selectedRows).sort((a, b) => a - b);
    const newSeqs = [...state.seqs];
    const group = indices.map(i => newSeqs[i]);
    for (let j = indices.length - 1; j >= 0; j--) {
        newSeqs.splice(indices[j], 1);
    }
    newSeqs.unshift(...group);
    state.seqs = newSeqs;
    state.selectedRows.clear();
    for (let k = 0; k < group.length; k++) {
        state.selectedRows.add(k);
    }
    renderAlignment();
    showMessage("Sequences moved to top!", 2000);
}
function moveSelectedToBottom() {
    if (state.selectedRows.size === 0) return;
    pushUndo('order');
    const indices = Array.from(state.selectedRows).sort((a, b) => a - b);
    const newSeqs = [...state.seqs];
    const group = indices.map(i => newSeqs[i]);
    for (let j = indices.length - 1; j >= 0; j--) {
        newSeqs.splice(indices[j], 1);
    }
    newSeqs.push(...group);
    state.seqs = newSeqs;
    state.selectedRows.clear();
    const newLen = state.seqs.length;
    for (let k = 0; k < group.length; k++) {
        state.selectedRows.add(newLen - group.length + k);
    }
    renderAlignment();
    showMessage("Sequences moved to bottom!", 2000);
}
function insertGroupConsensus() {
    if (state.selectedRows.size < 2) {
        showMessage("Select at least 2 sequences to compute group consensus.", 3000);
        return;
    }
    pushUndo('insertConsensus');
    state.groupConsensusCount++;
    const indices = Array.from(state.selectedRows).sort((a, b) => a - b);
    const selectedSeqs = indices.map(i => state.seqs[i].seq);
    const cons = computeConsensusForSequences(selectedSeqs);
    const groupName = `Grp${state.groupConsensusCount}Cons${indices.length}seq`;
    const consObj = { header: groupName, fullHeader: `${groupName} consensus of ${indices.length} sequences`, seq: cons, gaplessPositions: calculateGaplessPositions(cons) };
    const insertPos = indices[indices.length - 1] + 1;
    state.seqs.splice(insertPos, 0, consObj);
    renderAlignment();
    showMessage(`${groupName} inserted!`, 2000);
}

function replaceSelectedWithConsensus() {
    if (state.selectedRows.size < 2) {
        showMessage("Select at least 2 sequences to create consensus.", 3000);
        return;
    }

    const indices = Array.from(state.selectedRows).sort((a, b) => a - b);
    const selectedSeqs = indices.map(i => state.seqs[i].seq);
    const len = Math.max(...selectedSeqs.map(s => s.length));

    // Generate consensus sequence
    const cons = computeConsensusForSequences(selectedSeqs);

    // Create consensus name based on selected sequence indices
    const firstIdx = indices[0] + 1; // 1-based for display
    const lastIdx = indices[indices.length - 1] + 1;
    const consName = `cons_seq${firstIdx}-${lastIdx}`;

    // Save to history
    pushUndo('replaceWithConsensus');

    // Remove selected sequences (from end to start to preserve indices)
    for (let i = indices.length - 1; i >= 0; i--) {
        state.seqs.splice(indices[i], 1);
    }

    // Insert consensus at the position of the first selected sequence
    const consObj = {
        header: consName,
        fullHeader: `Consensus of sequences ${firstIdx}-${lastIdx}`,
        seq: cons,
        gaplessPositions: calculateGaplessPositions(cons)
    };
    state.seqs.splice(indices[0], 0, consObj);

    // Clear selection
    state.selectedRows.clear();

    renderAlignment();
    showMessage(`Replaced ${indices.length} sequences with consensus: ${consName}`, 3000);
}
function duplicateSelected() {
    if (state.selectedRows.size === 0) return;
    pushUndo('duplicate');
    const indices = Array.from(state.selectedRows).sort((a, b) => a - b);
    const copies = indices.map(i => ({...state.seqs[i], header: state.seqs[i].header + '_copy'}));
    state.seqs.push(...copies);
    renderAlignment();
    showMessage("Selected sequences duplicated!", 2000);
}
function openSelectedInNewTab() {
    if (state.selectedRows.size === 0) {
        showMessage("No sequences selected.", 3000);
        return;
    }
    const fasta = Array.from(state.selectedRows).sort((a,b) => a - b).map(i => {
        const s = state.seqs[i];
        return `>${s.fullHeader || s.header}\n${s.seq}`;
    }).join('\n');
    const blob = new Blob([fasta], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const newWindow = window.open();
    newWindow.document.write('<textarea style="width:100%;height:100%;">' + fasta + '</textarea>');
    newWindow.document.title = 'Selected Sequences';
    newWindow.document.close();
    showMessage("Selected sequences opened in new tab!", 2000);
}
function savePreset() {
    const preset = {
        black: el('blackSlider').value,
        dark: el('darkSlider').value,
        light: el('lightSlider').value,
        zoom: el('zoomSlider').value,
        mode: el('modeBlocks').checked ? 'blocks' : 'single',
        blockSize: el('blockSizeSlider').value,
        nameLen: el('nameLengthSlider').value,
        consensusThreshold: el('consensusThreshold').value,
        groupConsensusThreshold: el('groupConsensusThreshold')?.value ?? DEFAULTS.groupConsensusThreshold,
        consensusType: document.querySelector('input[name="consensusType"]:checked').value,
        showConsensus: el('showConsensus').checked,
        // Persist new consensus options
        consensusMinCoverage: el('consensusMinCoverage')?.value,
        consensusFallback: el('consensusFallback')?.value,
        shadeMode: document.querySelector('input[name="shadeMode"]:checked').value,
        colorScheme: getAlignmentColorScheme(),
        enableBlack: el('enableBlack').checked,
        enableDark: el('enableDark').checked,
        enableLight: el('enableLight').checked,
        stickyNames: el('stickyNames').checked
    };
    localStorage.setItem('qwen_msa_viewer_preset_v44', JSON.stringify(preset));
    showMessage("Preset saved!", 2000);
}
function loadPreset() {
    const saved = localStorage.getItem('qwen_msa_viewer_preset_v44');
    if (!saved) {
        showMessage("No saved preset found.", 3000);
        return;
    }
    const p = JSON.parse(saved);
    ['black','dark','light','zoom','blockSize','nameLen','consensusThreshold', 'groupConsensusThreshold', 'consensusMinCoverage'].forEach(k => {
        let value = p[k];
        if (k === 'consensusThreshold') {
            value = clampConsensusPercent(value);
            setConsensusThresholdUI(value);
            return;
        }
        if (k === 'groupConsensusThreshold') {
            value = clampGroupConsensusPercent(value);
            setGroupConsensusThresholdUI(value);
            return;
        }
        if (k === 'consensusMinCoverage') {
            // Clamp and apply to slider/input pair if present
            const clamped = clampMinCoverage(value ?? DEFAULTS.minCoverage);
            const sliderEl = el('consensusMinCoverage');
            const inputElement = el('consensusMinCoverageInput');
            if (sliderEl) {
                sliderEl.value = clamped;
                updateSliderBackground(sliderEl);
            }
            if (inputElement) inputElement.value = clamped;
            return;
        }
        const sliderEl = el(k + 'Slider');
        if (sliderEl) {
            sliderEl.value = value;
            updateSliderBackground(sliderEl);
        }
        const inputElement = el(k + 'Input');
        if (inputElement) inputElement.value = value;
        if (k === 'nameLen') {
            document.documentElement.style.setProperty('--nameLen', value);
        }
    });
    setZoom(p.zoom > 100 ? p.zoom : _sliderToZoom(p.zoom));
    el('modeBlocks').checked = p.mode === 'blocks';
    el('modeSingle').checked = p.mode !== 'blocks';
    el('stickyNames').checked = p.stickyNames !== undefined ? p.stickyNames : true;
    onModeChange();
    toggleStickyNames();
    document.querySelector(`input[name="consensusType"][value="${p.consensusType}"]`).checked = true;
    el('showConsensus').checked = p.showConsensus;
    // Restore consensus position if present
    if (p.consensusPosition) {
        const consensusPosRadio = document.querySelector(`input[name="consensusPosition"][value="${p.consensusPosition}"]`);
        if (consensusPosRadio && !consensusPosRadio.disabled) consensusPosRadio.checked = true;
    }
    // Restore fallback mode if present (defaults to current select's default)
    if (p.consensusFallback && el('consensusFallback')) {
        el('consensusFallback').value = p.consensusFallback;
    }
    if (p.colorScheme && el('colorSchemeSelect')) {
        el('colorSchemeSelect').value = ALIGNMENT_COLOR_SCHEMES.has(p.colorScheme) ? p.colorScheme : DEFAULTS.colorScheme;
    }
    document.querySelector(`input[name="shadeMode"][value="${p.shadeMode}"]`).checked = true;
    el('enableBlack').checked = p.enableBlack;
    el('enableDark').checked = p.enableDark;
    el('enableLight').checked = p.enableLight;
    renderAlignment();
    showMessage("Preset loaded!", 2000);
}

function _toBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

function _fromBase64Utf8(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

function _buildSnapshotPayload() {
    const fasta = state.seqs.map(s => `>${s.fullHeader || s.header}\n${s.seq}`).join('\n');
    const consensusTypeEl = document.querySelector('input[name="consensusType"]:checked');
    const shadeModeEl = document.querySelector('input[name="shadeMode"]:checked');
    const consensusPosEl = document.querySelector('input[name="consensusPosition"]:checked');
    // Serialize colour state (Map -> array of pairs)
    const colourMappings = [];
    state.colourState?.mappings?.forEach((color, name) => colourMappings.push([name, color]));
    return {
        schema: SNAPSHOT_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        createdAt: new Date().toISOString(),
        sourceTitle: state.currentFilename || 'Alignment snapshot',
        fasta,
        view: {
            black: el('blackSlider')?.value,
            dark: el('darkSlider')?.value,
            light: el('lightSlider')?.value,
            blackColor: el('blackColorPicker')?.value,
            darkColor: el('darkColorPicker')?.value,
            lightColor: el('lightColorPicker')?.value,
            zoom: el('zoomSlider')?.value,
            mode: el('modeBlocks')?.checked ? 'blocks' : 'single',
            blockSize: el('blockSizeSlider')?.value,
            nameLen: el('nameLengthSlider')?.value,
            consensusThreshold: el('consensusThreshold')?.value,
            groupConsensusThreshold: el('groupConsensusThreshold')?.value,
            consensusMinCoverage: el('consensusMinCoverage')?.value,
            consensusType: consensusTypeEl ? consensusTypeEl.value : 'normal',
            showConsensus: !!el('showConsensus')?.checked,
            consensusFallback: el('consensusFallback')?.value,
            consensusPosition: consensusPosEl ? consensusPosEl.value : 'top',
            shadeMode: shadeModeEl ? shadeModeEl.value : 'nongap',
            colorScheme: getAlignmentColorScheme(),
            enableBlack: !!el('enableBlack')?.checked,
            enableDark: !!el('enableDark')?.checked,
            enableLight: !!el('enableLight')?.checked,
            stickyNames: !!el('stickyNames')?.checked,
            selectedRows: Array.from(state.selectedRows).sort((a, b) => a - b),
            selectedColumns: Array.from(state.selectedColumns).sort((a, b) => a - b),
            scrollLeft: alignmentContainer?.scrollLeft || 0,
            scrollTop: alignmentContainer?.scrollTop || 0,
            maxMismatches: el('maxMismatches')?.value
        },
        colourState: colourMappings.length > 0 ? { mappings: colourMappings } : null,
        searchHistory: state.searchHistory.length > 0 ? state.searchHistory.map(h => ({
            motif: h.motif, color: h.color, label: h.label, strand: h.strand
        })) : null
    };
}

function _applySnapshotView(view) {
    if (!view || typeof view !== 'object') return;

    const applySliderPair = (key, sliderId, inputId, onSet = null) => {
        if (view[key] === undefined || view[key] === null) return;
        if (onSet) {
            onSet(view[key]);
            return;
        }
        const sliderEl = el(sliderId);
        const inputEl = el(inputId);
        if (sliderEl) {
            sliderEl.value = view[key];
            updateSliderBackground(sliderEl);
        }
        if (inputEl) inputEl.value = view[key];
    };

    applySliderPair('black', 'blackSlider', 'blackInput');
    applySliderPair('dark', 'darkSlider', 'darkInput');
    applySliderPair('light', 'lightSlider', 'lightInput');
    applySliderPair('zoom', 'zoomSlider', null, (v) => {
        let n = parseInt(v, 10);
        if (!Number.isNaN(n)) {
            // Migration: old snapshots stored zoom as percent (50-200), new ones store raw slider (0-100)
            if (n > 100) n = _zoomToSlider(n);
            const sliderEl = el('zoomSlider');
            if (sliderEl) {
                sliderEl.value = n;
                updateSliderBackground(sliderEl);
            }
            setZoom(_sliderToZoom(n));
        }
    });
    applySliderPair('blockSize', 'blockSizeSlider', 'blockSizeInput');
    applySliderPair('nameLen', 'nameLengthSlider', 'nameLengthInput', (v) => setNameLengthUI(v));
    applySliderPair('consensusThreshold', 'consensusThreshold', 'consensusThresholdInput', (v) => setConsensusThresholdUI(v));
    applySliderPair('groupConsensusThreshold', 'groupConsensusThreshold', 'groupConsensusThresholdInput', (v) => setGroupConsensusThresholdUI(v));
    applySliderPair('consensusMinCoverage', 'consensusMinCoverage', 'consensusMinCoverageInput', (v) => {
        const clamped = clampMinCoverage(v ?? DEFAULTS.minCoverage);
        const sliderEl = el('consensusMinCoverage');
        const inputEl = el('consensusMinCoverageInput');
        if (sliderEl) {
            sliderEl.value = clamped;
            updateSliderBackground(sliderEl);
        }
        if (inputEl) inputEl.value = clamped;
    });

    if (view.mode === 'single' || view.mode === 'blocks') {
        el('modeBlocks').checked = view.mode === 'blocks';
        el('modeSingle').checked = view.mode === 'single';
        onModeChange();
    }

    if (view.stickyNames !== undefined) {
        el('stickyNames').checked = !!view.stickyNames;
        toggleStickyNames();
    }

    if (view.consensusType) {
        const consensusTypeRadio = document.querySelector(`input[name="consensusType"][value="${view.consensusType}"]`);
        if (consensusTypeRadio) consensusTypeRadio.checked = true;
    }
    if (view.consensusPosition) {
        const consensusPosRadio = document.querySelector(`input[name="consensusPosition"][value="${view.consensusPosition}"]`);
        if (consensusPosRadio && !consensusPosRadio.disabled) consensusPosRadio.checked = true;
    }
    if (view.showConsensus !== undefined) {
        el('showConsensus').checked = !!view.showConsensus;
    }
    if (view.consensusFallback && el('consensusFallback')) {
        el('consensusFallback').value = view.consensusFallback;
    }
    if (view.shadeMode) {
        const shadeModeRadio = document.querySelector(`input[name="shadeMode"][value="${view.shadeMode}"]`);
        if (shadeModeRadio) shadeModeRadio.checked = true;
    }
    if (view.colorScheme && el('colorSchemeSelect')) {
        el('colorSchemeSelect').value = ALIGNMENT_COLOR_SCHEMES.has(view.colorScheme) ? view.colorScheme : DEFAULTS.colorScheme;
    }

    if (view.enableBlack !== undefined) el('enableBlack').checked = !!view.enableBlack;
    if (view.enableDark !== undefined) el('enableDark').checked = !!view.enableDark;
    if (view.enableLight !== undefined) el('enableLight').checked = !!view.enableLight;

    state.selectedRows.clear();
    if (Array.isArray(view.selectedRows)) {
        view.selectedRows.forEach(index => {
            if (Number.isInteger(index) && index >= 0 && index < state.seqs.length) {
                state.selectedRows.add(index);
            }
        });
    }

    state.selectedColumns.clear();
    if (Array.isArray(view.selectedColumns)) {
        view.selectedColumns.forEach(col => {
            if (Number.isInteger(col) && col >= 0) {
                state.selectedColumns.add(col);
            }
        });
    }

    // Restore custom shading colours
    if (view.blackColor) { const el = document.getElementById('blackColorPicker'); if (el) el.value = view.blackColor; }
    if (view.darkColor) { const el = document.getElementById('darkColorPicker'); if (el) el.value = view.darkColor; }
    if (view.lightColor) { const el = document.getElementById('lightColorPicker'); if (el) el.value = view.lightColor; }
    if (view.maxMismatches) { const el = document.getElementById('maxMismatches'); if (el) el.value = view.maxMismatches; }

    renderAlignment();

    const scrollLeft = Number(view.scrollLeft || 0);
    const scrollTop = Number(view.scrollTop || 0);
    if (alignmentContainer) {
        requestAnimationFrame(() => {
            alignmentContainer.scrollLeft = scrollLeft;
            alignmentContainer.scrollTop = scrollTop;
        });
    }
}

function _loadSnapshotPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid snapshot payload');
    }
    if (!payload.fasta || typeof payload.fasta !== 'string') {
        throw new Error('Snapshot has no alignment data');
    }

    const fastaInputEl = el('fastaInput');
    if (fastaInputEl) fastaInputEl.value = payload.fasta;

    state.currentFilename = payload.sourceTitle || payload.title || 'Snapshot';
    state.currentFilePath = '';

    // Parse and render first, THEN apply view settings

    parseAndRender(true).then(() => {
        _applySnapshotView(payload.view || {});
        if (payload.colourState) {
            _applySnapshotColourState(payload.colourState);
        }
        if (payload.searchHistory) {
            _applySnapshotSearchHistory(payload.searchHistory);
        }
    });
}

function _applySnapshotColourState(cs) {
    if (!cs || !Array.isArray(cs.mappings)) return;
    if (!state.colourState) {
        state.colourState = { mappings: new Map(), history: new Map(), presets: {} };
    }
    cs.mappings.forEach(([name, color]) => {
        state.colourState.mappings.set(name, color);
    });
    if (typeof applyColourToSeqNames === 'function') {
        applyColourToSeqNames(state.colourState.mappings);
    }
}

function _applySnapshotSearchHistory(sh) {
    if (!Array.isArray(sh)) return;
    sh.forEach(entry => {
        const motifKey = (entry.motif || '') + ':' + (entry.strand || 'fwd');
        // Re-run a lightweight highlight for saved searches
        const color = entry.color || '#ffcc00';
        const className = 'search-hit-snapshot-' + Math.random().toString(36).substring(2, 10);
        const style = document.createElement('style');
        style.textContent = '.' + className + ' { background-color: ' + color + ' !important; color: black !important; font-weight: bold; }';
        style.setAttribute('data-motif', motifKey);
        document.head.appendChild(style);

        const motif = (entry.motif || '').replace(/:.+$/, ''); // strip strand suffix
        document.querySelectorAll('.seq-line:not(.consensus-line)').forEach(row => {
            const index = parseInt(row.dataset.seqIndex);
            if (isNaN(index) || index < 0 || index >= state.seqs.length) return;
            const dataSpan = row.querySelector('.seq-data');
            if (!dataSpan) return;
            const spans = Array.from(dataSpan.children);
            const nonGapSpanIndices = [];
            const displayedChars = [];
            for (let si = 0; si < spans.length; si++) {
                const ch = (spans[si].textContent || '').toUpperCase();
                if (ch !== '-' && ch !== '.') {
                    nonGapSpanIndices.push(si);
                    displayedChars.push(ch);
                }
            }
            const displayString = displayedChars.join('').replace(/U/g, 'T');
            if (!displayString) return;
            const searchMotif = motif.replace(/U/g, 'T');
            for (let i = 0; i <= displayString.length - searchMotif.length; i++) {
                if (displayString.substring(i, i + searchMotif.length) === searchMotif) {
                    for (let j = 0; j < searchMotif.length; j++) {
                        const si = nonGapSpanIndices[i + j];
                        if (si !== undefined && spans[si]) spans[si].classList.add(className);
                    }
                }
            }
        });
        state.searchHistory.push({ motif: motifKey, color, className, label: entry.label || motif, strand: entry.strand || 'fwd', matchCount: 0, sequencesWithMatches: 0 });
    });
}

function _sanitizeSnapshotFileBaseName(sourceTitle) {
    const base = String(sourceTitle || 'alignment_snapshot')
        .trim()
        .replace(/[^a-z0-9._-]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${base || 'alignment_snapshot'}_${stamp}`;
}

function downloadSnapshotJson(payload, fileBaseName) {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = `${fileBaseName}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(dlUrl), 2000);
}

function downloadSnapshotHtml(snapshotUrl, sourceTitle) {
    const escapedTitle = String(sourceTitle || 'Alignment snapshot').replace(/[<>"']/g, '_').trim() || 'Alignment snapshot';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; line-height: 1.5; }
    .box { max-width: 780px; border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
    a { word-break: break-all; }
    .small { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="box">
    <h2 style="margin-top:0">Alignment Snapshot</h2>
    <p>This file points to a stateful snapshot of your current MSA view.</p>
    <p><a id="snapshotLink" href="${snapshotUrl}">Open snapshot in ViewAlign</a></p>
    <p class="small">If auto-redirect is blocked, click the link above.</p>
  </div>
  <script>
    setTimeout(function () { window.location.href = ${JSON.stringify(snapshotUrl)}; }, 80);
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeBaseName = escapedTitle.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '');
    a.href = dlUrl;
    a.download = `${safeBaseName || 'alignment_snapshot'}_snapshot.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(dlUrl), 2000);
}

async function createSnapshot() {
    if (!state.seqs || state.seqs.length === 0) {
        showMessage('Load an alignment first, then create snapshot.', 3000);
        return;
    }

    try {
        const payload = _buildSnapshotPayload();
        const encodedPayload = _toBase64Utf8(JSON.stringify(payload));
        const snapshotUrl = `${window.location.origin}${window.location.pathname}?snapshot=${encodeURIComponent(encodedPayload)}`;
        const fileBaseName = _sanitizeSnapshotFileBaseName(payload.sourceTitle || state.currentFilename || 'alignment_snapshot');
        const githubRelativePath = `snapshots/${fileBaseName}.json`;
        const githubSnapshotUrl = `${window.location.origin}${window.location.pathname}?snapshotFile=${encodeURIComponent(githubRelativePath)}`;

        let copied = false;
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(snapshotUrl);
            copied = true;
        }

        downloadSnapshotJson(payload, fileBaseName);
        downloadSnapshotHtml(snapshotUrl, payload.sourceTitle || state.currentFilename || 'alignment');

        const sizeKb = (snapshotUrl.length / 1024).toFixed(1);
        if (copied) {
            showMessage(`Snapshot copied; JSON+HTML downloaded (${sizeKb} KB URL). Upload JSON to /${githubRelativePath} for short link mode.`, 5200);
        } else {
            showMessage(`Snapshot JSON+HTML downloaded (${sizeKb} KB URL). Upload JSON to /${githubRelativePath} for short link mode.`, 5200);
        }

        console.log('GitHub snapshot URL (after uploading JSON file):', githubSnapshotUrl);
    } catch (err) {
        console.error('Snapshot creation failed:', err);
        showMessage(`Snapshot failed: ${err.message}`, 5000);
    }
}

async function openSnapshotFromPath(snapshotPath) {
    const normalizedPath = String(snapshotPath || '').trim();
    if (!normalizedPath) {
        showMessage('Select or enter a snapshot path first.', 3000);
        return;
    }
    try {
        showMessage('Loading snapshot...', 0);
        const resp = await fetch(normalizedPath, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const payload = await resp.json();
        _loadSnapshotPayload(payload);
        const pathInput = el('snapshotPathInput');
        if (pathInput) pathInput.value = normalizedPath;
        showMessage(`Snapshot loaded from ${normalizedPath}`, 2500);
    } catch (err) {
        console.error('Snapshot open failed:', err);
        showMessage(`Failed to open snapshot: ${err.message}`, 5000);
    }
}

function _renderSnapshotSelect(files) {
    const select = el('snapshotListSelect');
    if (!select) return;
    select.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- snapshots/*.json --';
    select.appendChild(defaultOption);

    files.forEach(file => {
        const opt = document.createElement('option');
        opt.value = file.path;
        opt.textContent = file.name;
        select.appendChild(opt);
    });
}

async function refreshSnapshotList(silent = false) {
    const refreshBtn = el('snapshotRefreshButton');
    if (refreshBtn) refreshBtn.disabled = true;

    try {
        // Local server mode: dynamic directory listing
        const apiResp = await fetch('/api/snapshots', { signal: AbortSignal.timeout(4000) });
        if (apiResp.ok) {
            const data = await apiResp.json();
            const files = Array.isArray(data.files) ? data.files : [];
            _renderSnapshotSelect(files);
            if (!silent) showMessage(`Snapshot list refreshed (${files.length} file${files.length === 1 ? '' : 's'})`, 2000);
            return;
        }
        throw new Error(`HTTP ${apiResp.status}`);
    } catch (_) {
        // Static mode fallback: optional manifest at snapshots/index.json
        try {
            const manifestResp = await fetch('./snapshots/index.json', { signal: AbortSignal.timeout(4000) });
            if (!manifestResp.ok) throw new Error(`HTTP ${manifestResp.status}`);
            const data = await manifestResp.json();
            const entries = Array.isArray(data.files) ? data.files : [];
            const files = entries.map(v => {
                const path = String(v.path || v).trim();
                const parts = path.split('/');
                return { path, name: String(v.name || parts[parts.length - 1] || path) };
            }).filter(v => v.path);
            _renderSnapshotSelect(files);
            if (!silent) showMessage(`Snapshot list refreshed (${files.length} via manifest)`, 2500);
            return;
        } catch (err2) {
            _renderSnapshotSelect([]);
            if (!silent) showMessage('No snapshot list API/manifest. Use manual snapshot path input.', 3500);
        }
    } finally {
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

function openSelectedSnapshotFromInputMenu() {
    const selectedPath = el('snapshotListSelect')?.value || '';
    if (!selectedPath) {
        showMessage('Pick a snapshot from the list first.', 2500);
        return;
    }
    openSnapshotFromPath(selectedPath);
}

function openSnapshotFromManualPath() {
    const pathValue = el('snapshotPathInput')?.value || '';
    openSnapshotFromPath(pathValue);
}

function _getContinuousSelectedColumnRange() {
    if (state.selectedColumns.size === 0) return null;
    const cols = Array.from(state.selectedColumns).sort((a, b) => a - b);
    for (let i = 1; i < cols.length; i++) {
        if (cols[i] !== cols[i - 1] + 1) return null;
    }
    return { minCol: cols[0], maxCol: cols[cols.length - 1], count: cols.length };
}

function degapSelectedBlock(direction = 'left') {
    if (!state.seqs.length) {
        showMessage('No sequences loaded.', 2000);
        return;
    }

    const range = _getContinuousSelectedColumnRange();
    if (!range || range.count < 1) {
        showMessage('Select a continuous column block first (Ctrl+Alt+drag).', 3500);
        return;
    }

    const alignLeft = direction !== 'right';
    pushUndo(alignLeft ? 'degap-block-left' : 'degap-block-right');

    const blockWidth = range.maxCol - range.minCol + 1;
    state.seqs.forEach(seqObj => {
        const leftPart = seqObj.seq.slice(0, range.minCol);
        const blockPart = seqObj.seq.slice(range.minCol, range.maxCol + 1);
        const rightPart = seqObj.seq.slice(range.maxCol + 1);
        const residues = blockPart.replace(/[-.\s]/g, '');
        const compacted = alignLeft
            ? residues.padEnd(blockWidth, '-')
            : residues.padStart(blockWidth, '-');
        seqObj.seq = leftPart + compacted + rightPart;
        seqObj.gaplessPositions = calculateGaplessPositions(seqObj.seq);
    });

    // Remove gap-only columns generated within this selected block
    const colsToRemove = [];
    for (let col = range.maxCol; col >= range.minCol; col--) {
        const allGap = state.seqs.every(seqObj => {
            const ch = seqObj.seq[col];
            return ch === '-' || ch === '.';
        });
        if (allGap) colsToRemove.push(col);
    }

    if (colsToRemove.length > 0) {
        state.seqs.forEach(seqObj => {
            const chars = seqObj.seq.split('');
            colsToRemove.forEach(col => {
                if (col >= 0 && col < chars.length) chars.splice(col, 1);
            });
            seqObj.seq = chars.join('');
            seqObj.gaplessPositions = calculateGaplessPositions(seqObj.seq);
        });
    }

    state.selectedColumns.clear();

    renderAlignment();
    showMessage(`Block degapped to ${alignLeft ? 'left' : 'right'}; removed ${colsToRemove.length} gap-only col(s).`, 2600);
}

function _escapeXmlText(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function _isTransparentCssColor(color) {
    if (!color) return true;
    const c = color.trim().toLowerCase();
    return c === 'transparent' || c === 'rgba(0, 0, 0, 0)' || c === 'rgba(0,0,0,0)';
}

function _exportAlignmentAsSvg(mode = 'viewport') {
    if (!alignmentContainer) {
        showMessage('Alignment container not found.', 3000);
        return;
    }
    if (!state.seqs || state.seqs.length === 0) {
        showMessage('Load an alignment first.', 3000);
        return;
    }

    const containerRect = alignmentContainer.getBoundingClientRect();
    const fullMode = mode === 'full';
    const width = Math.max(1, Math.round(fullMode ? alignmentContainer.scrollWidth : alignmentContainer.clientWidth));
    const height = Math.max(1, Math.round(fullMode ? alignmentContainer.scrollHeight : alignmentContainer.clientHeight));
    const viewRight = containerRect.left + (fullMode ? alignmentContainer.scrollWidth : alignmentContainer.clientWidth);
    const viewBottom = containerRect.top + (fullMode ? alignmentContainer.scrollHeight : alignmentContainer.clientHeight);

    const spanNodes = Array.from(alignmentContainer.querySelectorAll('.seq-line span, .scale-ruler-line span'));
    if (spanNodes.length === 0) {
        showMessage('Nothing visible to export.', 2500);
        return;
    }

    const bgRects = [];
    const textNodes = [];

    spanNodes.forEach(span => {
        const rawText = span.textContent || '';
        if (!rawText) return;

        const r = span.getBoundingClientRect();
        if (r.right <= containerRect.left || r.left >= viewRight || r.bottom <= containerRect.top || r.top >= viewBottom) return;

        const x = Math.max(0, r.left - containerRect.left + (fullMode ? alignmentContainer.scrollLeft : 0));
        const y = Math.max(0, r.top - containerRect.top + (fullMode ? alignmentContainer.scrollTop : 0));
        const w = Math.min(width - x, r.width);
        const h = Math.min(height - y, r.height);
        if (w <= 0 || h <= 0) return;

        const style = window.getComputedStyle(span);
        const bg = style.backgroundColor;
        const color = style.color || '#000';
        const fontSize = parseFloat(style.fontSize || '12') || 12;
        const fontFamily = style.fontFamily || 'monospace';
        const fontWeight = style.fontWeight || '400';
        const fontStyle = style.fontStyle || 'normal';
        const textY = y + h - Math.max(1, h * 0.18);

        if (!_isTransparentCssColor(bg)) {
            bgRects.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${_escapeXmlText(bg)}" />`);
        }

        const escaped = _escapeXmlText(rawText);
        textNodes.push(`<text x="${x.toFixed(2)}" y="${textY.toFixed(2)}" fill="${_escapeXmlText(color)}" font-family="${_escapeXmlText(fontFamily)}" font-size="${fontSize.toFixed(2)}px" font-weight="${_escapeXmlText(fontWeight)}" font-style="${_escapeXmlText(fontStyle)}" xml:space="preserve">${escaped}</text>`);
    });

    if (textNodes.length === 0) {
        showMessage('Nothing visible to export.', 2500);
        return;
    }

    const title = _escapeXmlText(state.currentFilename || 'alignment');
    const label = fullMode ? 'full alignment export' : 'viewport export';
    const svg = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<title>${title} ${label}</title>`,
        `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />`,
        ...bgRects,
        ...textNodes,
        `</svg>`
    ].join('\n');

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeBaseName = (state.currentFilename || 'alignment').replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '');
    a.href = dlUrl;
    a.download = `${safeBaseName || 'alignment'}_${fullMode ? 'full' : 'viewport'}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(dlUrl), 2000);
    showMessage(fullMode ? 'Full alignment exported as SVG.' : 'Visible viewport exported as SVG.', 2500);
}

function exportVisibleViewportAsSvg() {
    _exportAlignmentAsSvg('viewport');
}

function exportFullAlignmentAsSvg() {
    _exportAlignmentAsSvg('full');
}

// GeneDoc-style RTF export with per-residue conservation shading
function exportAlignmentAsRtf() {
    if (!state.seqs || state.seqs.length === 0) {
        showMessage('Load an alignment first.', 3000);
        return;
    }

    const len = Math.max(...state.seqs.map(s => s.seq.length));
    const shadeMode = document.querySelector('input[name="shadeMode"]:checked')?.value || 'nongap';
    const conservation = preCalculateConservation(state.seqs, len, shadeMode);
    const blackThresh = parseInt(el('blackSlider')?.value || 90) / 100;
    const darkThresh = parseInt(el('darkSlider')?.value || 70) / 100;
    const lightThresh = parseInt(el('lightSlider')?.value || 50) / 100;
    const enableBlack = el('enableBlack')?.checked !== false;
    const enableDark = el('enableDark')?.checked !== false;
    const enableLight = el('enableLight')?.checked !== false;

    // Collect unique colors from rendered spans for accurate RTF color table
    const colorMap = new Map();
    const seqColors = [];
    const consColors = [];
    const defaultColor = '#ffffff';
    colorMap.set(defaultColor, 0); // index 0 = white

    const getColorIdx = (hex) => {
        const k = (hex || defaultColor).toLowerCase();
        if (!colorMap.has(k)) colorMap.set(k, colorMap.size);
        return colorMap.get(k);
    };

    // Pre-compute colors for each position in each sequence
    for (let i = 0; i < state.seqs.length; i++) {
        const rowColors = [];
        for (let pos = 0; pos < len; pos++) {
            const cons = conservation[pos];
            const base = state.seqs[i].seq[pos] || '-';
            let color = defaultColor;
            if (cons && cons.count > 0) {
                const bestCount = cons.best ? cons.best.count : 0;
                const count = (cons.baseCounts || {})[base.toUpperCase()] || 0;
                const pct = cons.count > 0 ? count / cons.count : 0;
                if (enableBlack && pct >= blackThresh) color = el('blackColorPicker')?.value || '#000000';
                else if (enableDark && pct >= darkThresh) color = el('darkColorPicker')?.value || '#555555';
                else if (enableLight && pct >= lightThresh) color = el('lightColorPicker')?.value || '#cccccc';
            }
            rowColors.push(getColorIdx(color));
        }
        seqColors.push(rowColors);
    }

    // Consensus colors
    const showConsensus = el('showConsensus')?.checked;
    if (showConsensus) {
        const consSeq = computeConsensusForSequences(state.seqs.map(s => s.seq));
        for (let pos = 0; pos < len; pos++) {
            consColors.push(getColorIdx('#e8e8e8')); // light gray for consensus
        }
    }

    // Build RTF
    const rtfParts = [];
    rtfParts.push('{\\rtf1\\ansi\\deff0');
    rtfParts.push('{\\fonttbl{\\f0\\fmodern\\fprq1 Courier New;}}');

    // Color table
    rtfParts.push('{\\colortbl;');
    const sortedColors = [...colorMap.entries()].sort((a, b) => a[1] - b[1]);
    for (const [hex] of sortedColors) {
        if (hex === defaultColor) continue; // already added as ;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        rtfParts.push(`\\red${r}\\green${g}\\blue${b};`);
    }
    rtfParts.push('}');

    rtfParts.push('\\f0\\fs18'); // Courier New, 9pt

    // Scale ruler
    const rulerParts = [];
    for (let pos = 1; pos <= len; pos++) {
        if (pos % 10 === 0) {
            const s = String(pos);
            rulerParts.push(s);
        } else if (pos % 10 === 1) {
            rulerParts.push(' ');
        }
    }
    const ruler = rulerParts.join('');
    rtfParts.push(`\\b ${ruler}\\b0\\line`);

    // Consensus line
    if (showConsensus) {
        let consLine = '';
        for (let pos = 0; pos < len; pos++) {
            const ci = consColors[pos] || 0;
            const ch = computeConsensusForSequences(state.seqs.map(s => s.seq))[pos] || '-';
            consLine += `{\\highlight${ci} ${ch}}`;
        }
        rtfParts.push(`\\b Consensus\\b0\\line`);
        rtfParts.push(`${consLine}\\line`);
    }

    // Sequences
    const nameLen = parseInt(el('nameLengthSlider')?.value || 25);
    for (let i = 0; i < state.seqs.length; i++) {
        const name = (state.seqs[i].header || `Seq${i + 1}`).padEnd(nameLen).substring(0, nameLen);
        let seqLine = '';
        for (let pos = 0; pos < len; pos++) {
            const ci = seqColors[i][pos] || 0;
            const ch = state.seqs[i].seq[pos] || '-';
            seqLine += `{\\highlight${ci} ${ch}}`;
        }
        rtfParts.push(`${name} ${seqLine}\\line`);
    }

    rtfParts.push('}');
    const rtf = rtfParts.join('\n');

    const blob = new Blob([rtf], { type: 'application/rtf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (state.currentFilename || 'alignment').replace(/[^a-z0-9._-]+/gi, '_');
    a.href = url;
    a.download = `${safeName || 'alignment'}.rtf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showMessage('Alignment exported as RTF (open in Word)!', 2500);
}

var _menuMinimized = false;
var _lastMenuHeight = 0;

function minimizeMenu() {
    if (_menuMinimized) {
        expandMenu();
        return;
    }
    _menuMinimized = true;
    const controls = el('controls');
    _lastMenuHeight = controls.offsetHeight;
    // Reset overlay positioning
    controls.style.position = '';
    controls.style.top = '';
    controls.style.left = '';
    controls.style.right = '';
    controls.style.zIndex = '';
    controls.style.boxShadow = '';
    // Batch all visual changes in one animation frame Ã¢â‚¬â€ no intermediate paint
    requestAnimationFrame(() => {
        controls.style.display = 'none';
        minimizeBar.style.display = 'block';
        alignmentContainer.style.top = '20px';
        window.scrollTo(0, 0);
    });
}
function expandMenu() {
    _menuMinimized = false;
    // Batch all visual changes in one animation frame
    requestAnimationFrame(() => {
        minimizeBar.style.display = 'none';
        const controls = el('controls');
        alignmentContainer.style.top = (_lastMenuHeight || 80) + 'px';
        controls.style.display = 'grid';
        controls.style.position = '';
        controls.style.top = '';
        controls.style.left = '';
        controls.style.right = '';
        controls.style.zIndex = '';
        controls.style.boxShadow = '';
    });
}
function findFuzzyPositions(degapped, motif, maxMismatches) {
    const positions = [];
    for (let i = 0; i <= degapped.length - motif.length; i++) {
        let mismatches = 0;
        for (let j = 0; j < motif.length; j++) {
            if (degapped[i + j] !== motif[j]) {
                mismatches++;
                if (mismatches > maxMismatches) break;
            }
        }
        if (mismatches <= maxMismatches) {
            positions.push(i);
        }
    }
    return positions;
}

function findMatchesWithMismatches(degapped, motif, maxMismatches) {
    return findFuzzyPositions(degapped, motif, maxMismatches);
}

const RESTRICTION_ENZYMES = [
    { name: 'EcoRI', site: 'GAATTC' },
    { name: 'BamHI', site: 'GGATCC' },
    { name: 'HindIII', site: 'AAGCTT' },
    { name: 'NotI', site: 'GCGGCCGC' },
    { name: 'XhoI', site: 'CTCGAG' },
    { name: 'KpnI', site: 'GGTACC' },
    { name: 'SacI', site: 'GAGCTC' },
    { name: 'PstI', site: 'CTGCAG' },
    { name: 'SalI', site: 'GTCGAC' },
    { name: 'SmaI', site: 'CCCGGG' },
    { name: 'XbaI', site: 'TCTAGA' },
    { name: 'SpeI', site: 'ACTAGT' },
    { name: 'NheI', site: 'GCTAGC' },
    { name: 'AvrII', site: 'CCTAGG' },
    { name: 'BglII', site: 'AGATCT' },
    { name: 'NcoI', site: 'CCATGG' },
    { name: 'NdeI', site: 'CATATG' },
    { name: 'ApaI', site: 'GGGCCC' },
    { name: 'AgeI', site: 'ACCGGT' },
    { name: 'AscI', site: 'GGCGCGCC' },
    { name: 'BstBI', site: 'TTCGAA' },
    { name: 'ClaI', site: 'ATCGAT' },
    { name: 'DraI', site: 'TTTAAA' },
    { name: 'EagI', site: 'CGGCCG' },
    { name: 'EcoRV', site: 'GATATC' },
    { name: 'HaeIII', site: 'GGCC' },
    { name: 'HhaI', site: 'GCGC' },
    { name: 'HinfI', site: 'GANTC' },
    { name: 'HpaI', site: 'GTTAAC' },
    { name: 'MluI', site: 'ACGCGT' },
    { name: 'MfeI', site: 'CAATTG' },
    { name: 'MseI', site: 'TTAA' },
    { name: 'MspI', site: 'CCGG' },
    { name: 'NsiI', site: 'ATGCAT' },
    { name: 'PacI', site: 'TTAATTAA' },
    { name: 'PvuI', site: 'CGATCG' },
    { name: 'PvuII', site: 'CAGCTG' },
    { name: 'ScaI', site: 'AGTACT' },
    { name: 'SphI', site: 'GCATGC' },
    { name: 'SspI', site: 'AATATT' },
    { name: 'StuI', site: 'AGGCCT' },
    { name: 'TaqI', site: 'TCGA' },
    { name: 'XmaI', site: 'CCCGGG' },
    { name: 'BsaI', site: 'GGTCTC' },
    { name: 'BsmBI', site: 'CGTCTC' },
    { name: 'BbsI', site: 'GAAGAC' },
    { name: 'BtgZI', site: 'GCGATG' },
    { name: 'SapI', site: 'GCTCTTC' },
    { name: 'AarI', site: 'CACCTGC' },
    { name: 'DpnI', site: 'GATC' }
];

const IUPAC_REGEX = {
    A: 'A', C: 'C', G: 'G', T: 'T', U: 'T',
    R: '[AG]', Y: '[CT]', S: '[GC]', W: '[AT]',
    K: '[GT]', M: '[AC]', B: '[CGT]', D: '[AGT]',
    H: '[ACT]', V: '[ACG]', N: '[ACGT]'
};

function restrictionSiteToRegex(site) {
    return String(site || '').toUpperCase().replace(/[^ACGTURYSWKMBDHVN]/g, '').split('')
        .map(ch => IUPAC_REGEX[ch] || '')
        .join('');
}

function parseManualRestrictionSites(text) {
    return String(text || '').split(',').map(token => token.trim()).filter(Boolean).map((token, index) => {
        const parts = token.split(':');
        const name = parts.length > 1 ? parts.shift().trim() : `Custom${index + 1}`;
        const site = parts.join(':').trim() || token;
        return { name, site: site.toUpperCase().replace(/[^ACGTURYSWKMBDHVN]/g, '') };
    }).filter(entry => entry.site);
}

function renderRestrictionEnzymeList() {
    const list = el('reSiteList');
    if (!list || list.children.length > 0) return;
    RESTRICTION_ENZYMES.sort((a, b) => a.name.localeCompare(b.name)).forEach(({ name, site }) => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:3px;white-space:nowrap;font-size:10px;';
        label.title = `${name}: ${site}`;
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 're-cb';
        cb.value = site;
        cb.dataset.name = name;
        cb.style.margin = '0';
        label.appendChild(cb);
        label.appendChild(document.createTextNode(`${name} (${site})`));
        list.appendChild(label);
    });
}

function searchResEnzyme() {
    const cbs = document.querySelectorAll('.re-cb:checked');
    const selected = Array.from(cbs).map(cb => ({ name: cb.dataset.name || cb.value, site: cb.value }));
    const manual = parseManualRestrictionSites(el('reSiteManualInput')?.value);
    const enzymes = [...selected, ...manual];
    if (!enzymes.length) { showMessage('Select one or more restriction enzymes or enter a site.', 2000); return; }
    const palette = ['#FFD700','#FF6B6B','#00CED1','#FF8C00','#9370DB','#3CB371','#FF69B4','#20B2AA',
                     '#FFB347','#87CEEB','#FF6347','#98FB98','#DDA0DD','#F0E68C','#00BFFF','#FFA07A'];
    let colorIdx = state._searchColorOffset || 0;
    const bothStrands = !!el('searchBothStrands')?.checked;
    const currentResults = [];
    enzymes.forEach(({ name, site }) => {
        const regex = restrictionSiteToRegex(site);
        if (!regex) return;
        const color = palette[colorIdx % palette.length];
        const forwardResult = searchMotif({
            motif: regex,
            label: `${name} ${site}`,
            color,
            useRegex: true,
            bothStrands: false,
            strand: 'restriction',
            key: `restriction:${name}:${site}:fwd`,
            countMode: 'alignmentSites',
            suppressMessage: true
        });
        if (forwardResult) currentResults.push(...forwardResult.results);
        if (bothStrands) {
            const rcSite = reverseComplement(site).replace(/U/g, 'T');
            if (rcSite && rcSite !== site.replace(/U/g, 'T')) {
                const reverseResult = searchMotif({
                    motif: restrictionSiteToRegex(rcSite),
                    label: `${name} ${site} (rev comp ${rcSite})`,
                    color: getComplementaryColor(color),
                    useRegex: true,
                    bothStrands: false,
                    strand: 'restriction rev comp',
                    key: `restriction:${name}:${site}:rev`,
                    countMode: 'alignmentSites',
                    suppressMessage: true
                });
                if (reverseResult) currentResults.push(...reverseResult.results);
            }
        }
        colorIdx++;
    });
    state._searchColorOffset = colorIdx;
    const totalSites = currentResults.reduce((sum, item) => sum + (item.matchCount || 0), 0);
    const totalRowMatches = currentResults.reduce((sum, item) => sum + (item.rawMatchCount || 0), 0);
    const sequenceSet = new Set();
    currentResults.forEach(item => (item.sequenceIndices || []).forEach(index => sequenceSet.add(index)));
    const totalSeqs = sequenceSet.size;
    const label = el('reSiteLabel');
    if (label) label.textContent = `${enzymes.length} enzyme/site${enzymes.length !== 1 ? 's' : ''} searched`;
    const popup = el('reSitePopup');
    if (popup) popup.style.display = 'none';
    showMessage(`Found ${totalSites} unique restriction site${totalSites !== 1 ? 's' : ''} in ${totalSeqs} sequence${totalSeqs !== 1 ? 's' : ''} (${totalRowMatches} row match${totalRowMatches !== 1 ? 'es' : ''}).`, 3500);
}

function initResEnzymeSearch() {
    const popup = document.getElementById('reSitePopup');
    const btn = document.getElementById('reSitePopupBtn');
    const runBtn = document.getElementById('reSiteRunBtn');
    const clearBtn = document.getElementById('reSiteClearBtn');
    if (!popup || !btn) return;
    renderRestrictionEnzymeList();
    if (popup.parentElement !== document.body) {
        document.body.appendChild(popup);
    }
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    });
    runBtn?.addEventListener('click', searchResEnzyme);
    clearBtn?.addEventListener('click', () => {
        document.querySelectorAll('.re-cb').forEach(cb => cb.checked = false);
        const manual = el('reSiteManualInput');
        if (manual) manual.value = '';
    });
    const selectAllBtn = document.getElementById('reSiteSelectAllBtn');
    if (selectAllBtn) selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.re-cb').forEach(cb => cb.checked = true);
    });
    const unselectAllBtn = document.getElementById('reSiteUnselectAllBtn');
    if (unselectAllBtn) unselectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.re-cb').forEach(cb => cb.checked = false);
    });
    // Close popup on Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popup.style.display === 'block') {
            popup.style.display = 'none';
        }
    });
    // Close popup on outside click
    document.addEventListener('click', (e) => {
        if (!popup.contains(e.target) && e.target !== btn) {
            popup.style.display = 'none';
        }
    });
}

function searchMotif(options = {}) {
    const raw = options.motif ?? (el('searchInput').value || '');
    const motif = raw.trim().replace(/\s+/g, '').toUpperCase();
    if (!motif) return;
    const color = options.color || el('searchColor').value;
    const maxMismatches = options.maxMismatches ?? (parseInt(el('maxMismatches').value) || 0);
    const useRegex = options.useRegex ?? el('searchRegex')?.checked;
    const checkboxEl = el('searchBothStrands');
    const bothStrands = options.bothStrands ?? (checkboxEl && checkboxEl.checked);

    debugLog('=== SEARCH MOTIF STARTED ===');
    debugLog('Input motif:', motif);
    debugLog('Checkbox element found:', !!checkboxEl);
    debugLog('Checkbox checked:', bothStrands);
    debugLog('===============================');

    const fwdMotifRaw = motif;
    const fwdMotif = fwdMotifRaw.replace(/U/g, 'T');
    const baseLabel = options.label || fwdMotifRaw;
    const baseKey = options.key || fwdMotif;
    const motifsToSearch = [{
        motif: fwdMotif,
        color,
        label: bothStrands ? `${baseLabel} (fwd)` : baseLabel,
        strand: options.strand || 'fwd',
        key: baseKey
    }];
    if (bothStrands) {
        const rcMotifRaw = reverseComplement(fwdMotifRaw);
        const rcMotif = rcMotifRaw.replace(/U/g, 'T');
        debugLog('Both strands enabled. Reverse complement:', { fwdMotif, fwdMotifRaw, rcMotif, rcMotifRaw });
        if (rcMotif && rcMotif !== fwdMotif) {
            debugLog('Adding reverse complement motif to search list');
            motifsToSearch.push({
                motif: rcMotif,
                color: getComplementaryColor(color),
                label: `${rcMotifRaw} (rev comp)`,
                strand: 'rev comp',
                key: `${baseKey}:rev`
            });
        } else {
            debugLog('NOT adding reverse complement (palindromic or empty)');
        }
    } else {
        debugLog('Both strands NOT checked');
    }
    debugLog('Final motifs to search:', motifsToSearch.map(m => ({ motif: m.motif, label: m.label })));

    let totalMatches = 0;
    let fwdMatches = 0;
    let revMatches = 0;
    let fwdSeqs = new Set();
    let revSeqs = new Set();
    const searchResults = [];

    motifsToSearch.forEach(({ motif: searchMotifValue, color: searchColorValue, label, strand, key }) => {
        debugLog(`Searching for motif: "${searchMotifValue}" (${label}, ${strand})`);
        let motifMatches = 0;
        const motifAlignmentSites = new Set();
        let motifSeqsWithMatches = new Set();
        const motifKey = `${key || searchMotifValue}:${strand}`;
        const className = 'search-hit-' + Math.random().toString(36).substring(2, 12) + btoa(motifKey).replace(/=/g, '').substring(0, 5);

        // Remove any existing identical motif highlights first
        state.searchHistory = state.searchHistory.filter(item => {
            if (item.motif === motifKey) {
                document.querySelectorAll(`.${item.className}`).forEach(span => span.classList.remove(item.className));
                document.querySelector(`style[data-motif="${item.motif}"]`)?.remove();
                return false;
            }
            return true;
        });

        const style = document.createElement('style');
        style.textContent = `.${className} { background-color: ${searchColorValue} !important; color: black !important; font-weight: bold; }`;
        style.setAttribute('data-motif', motifKey);
        document.head.appendChild(style);

        // For each sequence row, map degapped indices back to span elements robustly
        document.querySelectorAll('.seq-line:not(.consensus-line)').forEach(row => {
            const index = parseInt(row.dataset.seqIndex);
            if (isNaN(index) || index < 0 || index >= state.seqs.length) return;
            const dataSpan = row.querySelector('.seq-data');
            if (!dataSpan) return;
            const spans = Array.from(dataSpan.children);

            // Build mapping and the displayed degapped string from the visible spans only
            const nonGapSpanIndices = [];
            const displayedChars = [];
            for (let si = 0; si < spans.length; si++) {
                const ch = (spans[si].textContent || '').toUpperCase();
                if (ch !== '-' && ch !== '.') {
                    nonGapSpanIndices.push(si);
                    displayedChars.push(ch);
                }
            }

            const displayString = displayedChars.join('');
            if (!displayString) return;

            // Treat U and T as equivalent for DNA/RNA searches
            const normalizedDisplay = displayString.replace(/U/g, 'T');
            const normalizedMotif = searchMotifValue;

            // Find matches with mismatches allowed (or regex)
            let matches;
            let matchLen = normalizedMotif.length; // default for exact/mismatch search
            if (useRegex) {
                matches = [];
                try {
                    const re = new RegExp(normalizedMotif, 'gi');
                    let m;
                    while ((m = re.exec(normalizedDisplay)) !== null) {
                        matches.push({ idx: m.index, len: m[0].length || 1 });
                        if (m[0].length === 0) re.lastIndex++;
                    }
                } catch(e) {
                    showMessage('Invalid regex: ' + e.message, 4000);
                    return;
                }
            } else {
                const rawMatches = findMatchesWithMismatches(normalizedDisplay, normalizedMotif, maxMismatches);
                matches = rawMatches.map(idx => ({ idx, len: normalizedMotif.length }));
            }
            debugLog(`  Seq ${index}: "${displayString}" vs "${normalizedMotif}" -> ${matches.length} matches`);
            if (matches.length > 0) {
                motifSeqsWithMatches.add(index);
                const isReverseStrand = String(strand || '').includes('rev comp');
                if (isReverseStrand) {
                    revSeqs.add(index);
                } else {
                    fwdSeqs.add(index);
                }
            }
            totalMatches += matches.length;
            motifMatches += matches.length;
            if (String(strand || '').includes('rev comp')) {
                revMatches += matches.length;
            } else {
                fwdMatches += matches.length;
            }

            // Highlight matching spans
            matches.forEach(m => {
                const startSpanIndex = nonGapSpanIndices[m.idx];
                const startPos = startSpanIndex !== undefined ? spans[startSpanIndex]?.dataset?.pos : undefined;
                if (startPos !== undefined) motifAlignmentSites.add(`${startPos}:${m.len}`);
                for (let i = 0; i < m.len; i++) {
                    const spanIndex = nonGapSpanIndices[m.idx + i];
                    if (spanIndex !== undefined && spans[spanIndex]) {
                        spans[spanIndex].classList.add(className);
                    }
                }
            });
        });

        // Track search history
        const displayMatches = options.countMode === 'alignmentSites' ? motifAlignmentSites.size : motifMatches;
        state.searchHistory.push({ motif: motifKey, color: searchColorValue, className, matchCount: displayMatches, rawMatchCount: motifMatches, sequencesWithMatches: motifSeqsWithMatches.size, label, strand });
        searchResults.push({ label, strand, matchCount: displayMatches, rawMatchCount: motifMatches, sequencesWithMatches: motifSeqsWithMatches.size, sequenceIndices: Array.from(motifSeqsWithMatches) });
    });

    updateActiveSearchesPanel();
    if (!options.suppressMessage) {
        if (bothStrands) {
            showMessage(
                `Found ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} (fwd:${fwdMatches}, rev comp:${revMatches}) in ${fwdSeqs.size + revSeqs.size} sequence${(fwdSeqs.size + revSeqs.size) !== 1 ? 's' : ''}`,
                3000
            );
        } else {
            showMessage(`Found ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in ${fwdSeqs.size} sequence${fwdSeqs.size !== 1 ? 's' : ''}`, 2000);
        }
    }
    return { totalMatches, fwdMatches, revMatches, fwdSeqs: fwdSeqs.size, revSeqs: revSeqs.size, results: searchResults };
}

function updateActiveSearchesPanel() {
    const panel = el('activeSearches');
    const list = el('searchList');

    if (state.searchHistory.length === 0) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    list.innerHTML = '';

    state.searchHistory.forEach((search, index) => {
        const item = document.createElement('div');
        item.className = 'search-item';

        const swatch = document.createElement('div');
        swatch.className = 'search-swatch';
        swatch.style.backgroundColor = search.color;

    const text = document.createElement('span');
    const label = search.label || search.motif;
    text.textContent = `${label} (${search.matchCount || 0})`;

        const remove = document.createElement('button');
        remove.className = 'search-remove';
    remove.innerHTML = 'Ãƒâ€”';
        remove.title = 'Remove this search';
        remove.addEventListener('click', () => {
            // Remove this specific search
            document.querySelectorAll(`.${search.className}`).forEach(span => span.classList.remove(search.className));
            document.querySelector(`style[data-motif="${search.motif}"]`)?.remove();
            state.searchHistory.splice(index, 1);
            updateActiveSearchesPanel();
        });

        item.appendChild(swatch);
        item.appendChild(text);
        item.appendChild(remove);
        list.appendChild(item);
    });
}


function clearLastSearch() {
    if (state.searchHistory.length === 0) {
        showMessage("No searches to clear.", 3000);
        return;
    }
    const last = state.searchHistory.pop();
    document.querySelectorAll(`.${last.className}`).forEach(span => span.classList.remove(last.className));
    document.querySelector(`style[data-motif="${last.motif}"]`)?.remove();
    updateActiveSearchesPanel();
    showMessage("Last search cleared!", 2000);
}
function clearAllSearches() {
    state.searchHistory.forEach(item => {
        document.querySelectorAll(`.${item.className}`).forEach(span => {
            span.classList.remove(item.className);
        });
        document.querySelector(`style[data-motif="${item.motif}"]`)?.remove();
    });
    state.searchHistory = [];
    updateActiveSearchesPanel();
    showMessage("All searches cleared!", 2000);
}
function openInfoModal() {
    showExclusiveModal('infoModal');
}
function closeInfoModal() {
    infoModal.style.display = 'none';
}

// ============================================================================
// Clustering and Trimming Functions
// ============================================================================

function updateClusteringStatus(msg) {
    const statusEl = el('clusteringStatus');
    if (statusEl) statusEl.textContent = msg;
    console.log('[Clustering] ' + msg);
}

function getTrimParameters() {
    return {
        edgeWindow: parseInt(el('edgeWindowInput')?.value) || 15,
        leftGapThresh: (parseInt(el('leftGapInput')?.value) || 50) / 100,
        rightGapThresh: (parseInt(el('rightGapInput')?.value) || 80) / 100
    };
}

function previewTrimming() {
    if (state.seqs.length < 1) {
        showMessage("No sequences loaded.", 3000);
        return;
    }

    updateClusteringStatus('Analyzing trim boundaries...');

    const sequences = state.seqs.map((seq, idx) => ({
        id: seq.header || `Seq${idx+1}`,
        seq: seq.seq
    }));

    const params = getTrimParameters();
    const trimBounds = getTrimBoundaries(sequences, params);

    state.trimBoundaries = trimBounds;

    const leftRemove = trimBounds.leftTrimEnd + 1;
    const rightRemove = state.seqs[0].seq.length - trimBounds.rightTrimStart;
    const status = `Preview: ${leftRemove} left + ${rightRemove} right would be removed`;

    updateClusteringStatus(status);
    debounceRender();
    showMessage(status, 3000);
}

function executeTrimming() {
    if (state.seqs.length < 1) {
        showMessage("No sequences loaded.", 3000);
        return;
    }

    if (!state.trimBoundaries) {
        showMessage("Run Preview first to set trim boundaries.", 3000);
        return;
    }

    const trimMode = document.querySelector('input[name="trimMode"]:checked')?.value || 'hard';
    const leftTrimEnd = state.trimBoundaries.leftTrimEnd;
    const rightTrimStart = state.trimBoundaries.rightTrimStart;
    const alnLen = state.seqs[0].seq.length;
    const leftRemoved = leftTrimEnd + 1;
    const rightRemoved = alnLen - rightTrimStart;

    if (trimMode === 'soft') {
        // Soft trim: mark columns as excluded without deleting them
        state.softTrimBoundaries = { leftTrimEnd, rightTrimStart };
        state.trimBackup = null;
        const clearBtn = document.getElementById('clearSoftTrimButton');
        if (clearBtn) clearBtn.style.display = '';
        const status = `Ã¢Å“â€œ Soft trim: ${leftRemoved}L + ${rightRemoved}R marked for clustering. Alignment unchanged.`;
        updateClusteringStatus(status);
        showMessage(status, 3000);
        state.trimBoundaries = null;
        debounceRender();
        return;
    }

    // Hard trim: actually delete columns
    state.softTrimBoundaries = null;
    state.trimBackup = state.seqs.map(seq => ({
        header: seq.header,
        fullHeader: seq.fullHeader,
        seq: seq.seq,
        gaplessPositions: seq.gaplessPositions
    }));

    const trimStart = leftTrimEnd + 1;
    const trimEnd = rightTrimStart;

    for (let i = 0; i < state.seqs.length; i++) {
        const seq = state.seqs[i].seq;
        state.seqs[i].seq = seq.substring(trimStart, trimEnd);
        state.seqs[i].gaplessPositions = calculateGaplessPositions(state.seqs[i].seq);
    }

    const newLen = trimEnd - trimStart;
    const status = `Ã¢Å“â€œ Hard trim: ${leftRemoved}L + ${rightRemoved}R = ${leftRemoved + rightRemoved} cols. New length: ${newLen}`;
    updateClusteringStatus(status);
    showMessage(status, 3000);
    state.trimBoundaries = null;
    debounceRender();
}

function clearSoftTrimming() {
    state.softTrimBoundaries = null;
    const clearBtn = document.getElementById('clearSoftTrimButton');
    if (clearBtn) clearBtn.style.display = 'none';
    updateClusteringStatus('Soft trim cleared');
    showMessage('Soft trim boundaries removed.', 2000);
    debounceRender();
}

function undoTrimming() {
    if (!state.trimBackup) {
        showMessage("No trimming to undo.", 3000);
        return;
    }

    state.seqs = state.trimBackup.map(seq => ({...seq}));
    state.trimBackup = null;
    state.trimBoundaries = null;
    state.softTrimBoundaries = null;

    updateClusteringStatus('Ã¢Å“â€œ Trimming reverted');
    showMessage('Trimming reverted - original alignment restored', 3000);
    debounceRender();
}

function clusterSequences() {
    if (state.seqs.length < 3) {
        showMessage("Need at least 3 sequences to cluster.", 3000);
        return;
    }

    updateClusteringStatus('Running clustering algorithm...');

    // Prepare sequences for clustering Ã¢â‚¬â€ respect soft trim if active
    const stb = state.softTrimBoundaries;
    const seqsForClustering = state.seqs.map(seq => {
        let s = seq.seq;
        if (stb) {
            const leftEnd = (stb.leftTrimEnd >= 0) ? stb.leftTrimEnd + 1 : 0;
            const rightStart = (stb.rightTrimStart > leftEnd) ? stb.rightTrimStart : s.length;
            s = s.substring(leftEnd, rightStart);
        }
        return { id: seq.header || seq.name || 'unnamed', seq: s };
    });

    // Get clustering parameters from UI
    const clusterParams = getClusteringParameters();

    // Run clustering
    const clusterer = new SINEClusterer(seqsForClustering);
    const clusterResults = clusterer.cluster({
        minSize: clusterParams.minSize,
        minPerfect: clusterParams.minPerfect,
        maxIterations: clusterParams.maxIterations,
        qualitySmall: clusterParams.qualitySmall,
        qualityMedium: clusterParams.qualityMedium,
        qualityLarge: clusterParams.qualityLarge,
        sizeSmallMedium: clusterParams.sizeSmallMedium,
        sizeMediumLarge: clusterParams.sizeMediumLarge,
        minOccurrences: clusterParams.minOccurrences,
        onProgress: (msg) => updateClusteringStatus(msg)
    });

    // Store results in state
    state.clusterResults = clusterResults;

    // Log to console
    console.log('=== CLUSTERING RESULTS ===');
    debugLog(`Parameters: minSize=${clusterParams.minSize}, minPerfect=${clusterParams.minPerfect}, maxIterations=${clusterParams.maxIterations}`);
    debugLog(`Quality Thresholds: small=${clusterParams.qualitySmall}%, medium=${clusterParams.qualityMedium}%, large=${clusterParams.qualityLarge}%`);
    debugLog(`Size Breakpoints: small-medium=${clusterParams.sizeSmallMedium}, medium-large=${clusterParams.sizeMediumLarge}`);
    debugLog(`Min Occurrences: ${clusterParams.minOccurrences}`);
    debugLog(`Total sequences: ${clusterResults.summary.nTotal}`);
    debugLog(`Clusters found: ${clusterResults.summary.nClusters}`);
    debugLog(`Assigned: ${clusterResults.summary.nAssigned}`);
    debugLog(`Unassigned: ${clusterResults.summary.nUnassigned}`);
    console.log('');

    const colors = SINEClusterer.getClusterColors();

    // Create cluster name map
    state.clusterMap = {};

    clusterResults.clusters.forEach((cluster, idx) => {
        const color = colors[idx % colors.length];
        debugLog(`\n--- CLUSTER ${idx + 1} ---`);
        debugLog(`Size: ${cluster.size} sequences`);
        debugLog(`Diagnostic features: ${cluster.nPerfect} (${cluster.nReliable || cluster.nPerfect} reliable)`);
        if (cluster.nFiltered) {
            debugLog(`Ã¢Å¡Â Ã¯Â¸Â  Filtered (high-leakage): ${cluster.nFiltered} features`);
        }
        debugLog(`Color: ${color}`);
        console.log('Sequences:');

        cluster.sequences.forEach(seq => {
            debugLog(`  Ã¢â‚¬Â¢ ${seq.id} (index ${seq.index})`);
            state.clusterMap[seq.index] = {
                cluster: idx,
                color: color,
                name: `Cluster ${idx + 1}`
            };
        });

        if (cluster.perfectFeatures.length > 0) {
            debugLog(`Perfect features (${cluster.perfectFeatures.length} reliable):`);
            cluster.perfectFeatures.slice(0, 5).forEach(f => {
                debugLog(`  Pos ${f.pos}: ${f.char}`);
            });
        }

        if (cluster.imperfectFeatures && cluster.imperfectFeatures.length > 0) {
            debugLog(`Imperfect features (${cluster.imperfectFeatures.length} reliable):`);
            cluster.imperfectFeatures.slice(0, 5).forEach(f => {
                debugLog(`  Pos ${f.pos}: ${f.char} (leaks to ${f.countOutside})`);
            });
        }
    });

    if (clusterResults.unassigned.length > 0) {
        debugLog(`\n--- UNASSIGNED (${clusterResults.unassigned.length} sequences) ---`);
        clusterResults.unassigned.forEach(seq => {
            debugLog(`  Ã¢â‚¬Â¢ ${seq.id} (index ${seq.index})`);
            state.clusterMap[seq.index] = {
                cluster: -1,
                color: '#cccccc',
                name: 'Unassigned'
            };
        });
    }

    console.log('\n=== END CLUSTERING ===\n');

    // Color the sequence names in UI
    colorSequencesByCluster();

    updateClusteringStatus(`Clustering complete: ${clusterResults.summary.nClusters} clusters found`);
}

function colorSequencesByCluster() {
    if (!state.clusterMap) {
        return;
    }

    // First, re-render to make sure we have fresh DOM elements
    renderAlignment();

    // Then find all sequence name elements and color them
    setTimeout(() => {
        const seqNameElements = document.querySelectorAll('.seq-name');

        seqNameElements.forEach((el) => {
            // Get the sequence index from data-seq-index attribute
            const seqIdx = parseInt(el.dataset.seqIndex);

            if (state.clusterMap[seqIdx] !== undefined) {
                const {color, name} = state.clusterMap[seqIdx];
                // Remove the default white background by using setProperty with important
                el.style.setProperty('background-color', color, 'important');
                el.style.setProperty('color', '#000000', 'important');
                el.style.setProperty('font-weight', 'bold', 'important');
                el.style.setProperty('background', color, 'important'); // Also set background shorthand
                el.title = name;
                el.classList.add('cluster-colored');
            }
        });

        // Now highlight diagnostic mutations
        highlightDiagnosticMutations();
    }, 50);
}

function highlightDiagnosticMutations() {
    if (!state.clusterResults) return;

    // Create a map: position -> [{clusterIdx, color, char, seqIndices, isPerfect}, ...]
    // seqIndices are the sequences that have this diagnostic feature
    const diagnosticMap = {};

    state.clusterResults.clusters.forEach((cluster, clusterIdx) => {
        const colors = SINEClusterer.getClusterColors();
        const color = colors[clusterIdx % colors.length];

        // Option: Paint ALL found features (not just validated ones)
        // This helps diagnose if the algorithm is missing features
        if (cluster.allFoundFeatures && cluster.allFoundFeatures.length > 0) {
            cluster.allFoundFeatures.forEach(feature => {
                const pos = feature.pos; // Already 0-based from cluster.js
                const char = feature.char;

                if (!diagnosticMap[pos]) {
                    diagnosticMap[pos] = [];
                }

                // Calculate inter-cluster leakage for this feature
                let leakageCount = 0;
                let totalOtherClusterSeqs = 0;
                state.clusterResults.clusters.forEach((otherCluster, otherIdx) => {
                    if (otherIdx !== clusterIdx) {
                        totalOtherClusterSeqs += otherCluster.sequences.length;
                        otherCluster.sequences.forEach(seq => {
                            // Check if this sequence has this feature at this position
                            if (seq.seq && seq.seq[pos] === char) {
                                leakageCount++;
                            }
                        });
                    }
                });

                const leakagePercent = totalOtherClusterSeqs > 0 ? Math.round((leakageCount / totalOtherClusterSeqs) * 100) : 0;

                // Mark as "all-found" to differentiate from validated features
                diagnosticMap[pos].push({
                    clusterIdx,
                    color,
                    char: char,
                    clusterName: `Cluster ${clusterIdx + 1}`,
                    seqIndices: new Set(cluster.sequences.map(s => s.index)),
                    isPerfect: true, // Default to perfect; will be styled differently if unvalidated
                    isAllFound: true, // Mark that this is from allFoundFeatures
                    interClusterLeakage: {
                        count: leakageCount,
                        total: totalOtherClusterSeqs,
                        percent: leakagePercent
                    }
                });
            });
        } else {
            // Fallback: use validated features if allFoundFeatures not available
            // Perfect features (full saturation)
            cluster.perfectFeatures.forEach(feature => {
                const pos = feature.pos - 1; // Convert to 0-based index

                if (!diagnosticMap[pos]) {
                    diagnosticMap[pos] = [];
                }

                // Calculate inter-cluster leakage for this feature
                let leakageCount = 0;
                let totalOtherClusterSeqs = 0;
                state.clusterResults.clusters.forEach((otherCluster, otherIdx) => {
                    if (otherIdx !== clusterIdx) {
                        totalOtherClusterSeqs += otherCluster.sequences.length;
                        otherCluster.sequences.forEach(seq => {
                            // Check if this sequence has this feature at this position
                            if (seq.seq && seq.seq[pos] === feature.char) {
                                leakageCount++;
                            }
                        });
                    }
                });

                const leakagePercent = totalOtherClusterSeqs > 0 ? Math.round((leakageCount / totalOtherClusterSeqs) * 100) : 0;

                diagnosticMap[pos].push({
                    clusterIdx,
                    color,
                    char: feature.char,
                    clusterName: `Cluster ${clusterIdx + 1}`,
                    seqIndices: new Set(cluster.sequences.map(s => s.index)),
                    isPerfect: true,
                    interClusterLeakage: {
                        count: leakageCount,
                        total: totalOtherClusterSeqs,
                        percent: leakagePercent
                    }
                });
            });

            // Imperfect features (faint/reduced opacity)
            if (cluster.imperfectFeatures) {
                cluster.imperfectFeatures.forEach(feature => {
                    const pos = feature.pos - 1; // Convert to 0-based index

                    if (!diagnosticMap[pos]) {
                        diagnosticMap[pos] = [];
                    }

                    // Calculate inter-cluster leakage for this feature
                    let leakageCount = 0;
                    let totalOtherClusterSeqs = 0;
                    state.clusterResults.clusters.forEach((otherCluster, otherIdx) => {
                        if (otherIdx !== clusterIdx) {
                            totalOtherClusterSeqs += otherCluster.sequences.length;
                            otherCluster.sequences.forEach(seq => {
                                // Check if this sequence has this feature at this position
                                if (seq.seq && seq.seq[pos] === feature.char) {
                                    leakageCount++;
                                }
                            });
                        }
                    });

                    const leakagePercent = totalOtherClusterSeqs > 0 ? Math.round((leakageCount / totalOtherClusterSeqs) * 100) : 0;

                    diagnosticMap[pos].push({
                        clusterIdx,
                        color,
                        char: feature.char,
                        countOutside: feature.countOutside,
                        clusterName: `Cluster ${clusterIdx + 1}`,
                        seqIndices: new Set(cluster.sequences.map(s => s.index)),
                        isPerfect: false,
                        interClusterLeakage: {
                            count: leakageCount,
                            total: totalOtherClusterSeqs,
                            percent: leakagePercent
                        }
                    });
                });
            }
        }
    });

    console.log('[Clustering] Found', Object.keys(diagnosticMap).length, 'diagnostic positions');

    // Find all seq-line rows and highlight diagnostic positions
    const seqLines = document.querySelectorAll('.seq-line');

    seqLines.forEach(seqLine => {
        // Get the sequence index for this row
        const seqIdx = parseInt(seqLine.dataset.seqIndex);
        if (isNaN(seqIdx)) return;

        const seqDataDiv = seqLine.querySelector('.seq-data');
        if (!seqDataDiv) return;

        const spans = seqDataDiv.querySelectorAll('span');

        spans.forEach(span => {
            // Get the alignment position
            const pos = parseInt(span.dataset.pos);
            if (isNaN(pos)) return;

            // Check if this position has diagnostics
            if (diagnosticMap[pos]) {
                // Find diagnostics relevant to this sequence's cluster
                // Prefer perfect features over imperfect
                const relevantDiags = diagnosticMap[pos].filter(diag =>
                    diag.seqIndices.has(seqIdx)
                );

                if (relevantDiags.length > 0) {
                    // Prioritize perfect features
                    const diag = relevantDiags.find(d => d.isPerfect) || relevantDiags[0];

                    // Only highlight if the base matches the diagnostic character
                    const baseChar = span.textContent;
                    if (baseChar === diag.char) {
                        const alpha = diag.isPerfect ? 1.0 : 0.4; // Perfect = full opacity, Imperfect = 40% opacity

                        // Convert hex color to RGB with alpha
                        const rgb = hexToRgb(diag.color);
                        const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
                        const textColor = diag.isPerfect ? 'white' : '#333';

                        span.style.setProperty('background-color', bgColor, 'important');
                        span.style.setProperty('color', textColor, 'important');
                        span.style.setProperty('font-weight', diag.isPerfect ? 'bold' : 'normal', 'important');

                        // Create enhanced tooltip showing inter-cluster leakage
                        let title = `${diag.clusterName}: ${diag.isPerfect ? 'diagnostic' : 'partial'} ${diag.char}`;

                        // If this feature has inter-cluster leakage info, show it
                        if (diag.interClusterLeakage) {
                            title += ` [leaks to ${diag.interClusterLeakage.count}/${diag.interClusterLeakage.total} in other clusters (${diag.interClusterLeakage.percent}%)]`;
                        } else if (diag.countOutside !== undefined) {
                            title += ` (found in ${diag.countOutside} outside)`;
                        }
                        span.title = title;
                        span.classList.add('diagnostic-mutation');
                    }
                }
            }
        });
    });
}

/**
 * Helper to convert hex color to RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : {r: 0, g: 0, b: 0};
}


function getClusteringParameters() {
    return {
        // Basic clustering
        minSize: parseInt(el('clusterMinSizeInput')?.value) || 3,
        minPerfect: parseInt(el('clusterMinPerfectInput')?.value) || 5,
        maxIterations: parseInt(el('clusterMaxIterationsInput')?.value) || 10,

        // Quality thresholds for imperfect features (based on cluster size)
        qualitySmall: parseInt(el('qualitySmallInput')?.value) || 90,      // < 11 sequences
        qualityMedium: parseInt(el('qualityMediumInput')?.value) || 80,    // 11-19 sequences
        qualityLarge: parseInt(el('qualityLargeInput')?.value) || 70,      // >= 20 sequences

        // Size breakpoints
        sizeSmallMedium: parseInt(el('sizeSmallMediumInput')?.value) || 11,
        sizeMediumLarge: parseInt(el('sizeMediumLargeInput')?.value) || 20,

        // Feature occurrence threshold
        minOccurrences: parseInt(el('minOccurrencesInput')?.value) || 5
    };
}

function saveClusteringPreset() {
    const presetName = el('presetNameInput')?.value?.trim();
    if (!presetName) {
        showMessage("Please enter a preset name", 2000);
        return;
    }

    const preset = {
        name: presetName,
        trimming: getTrimParameters(),
        clustering: getClusteringParameters(),
        timestamp: new Date().toISOString()
    };

    // Store in localStorage
    let presets = JSON.parse(localStorage.getItem('clusteringPresets') || '{}');
    presets[presetName] = preset;
    localStorage.setItem('clusteringPresets', JSON.stringify(presets));

    // Update preset list
    updateClusteringPresetList();

    el('presetNameInput').value = '';
    showMessage(`Preset "${presetName}" saved!`, 2000);
    console.log('[Clustering] Saved preset:', presetName, preset);
}

function createOptimalPreset(silent = false) {
    // Auto-create an "optimal" preset based on lesson learned:
    // The problem is NOT parameter relaxation - the problem is the INITIAL values
    // "two" preset works because it starts with minOccurrences=2 (LOW!)
    // "three" preset fails because it starts with minOccurrences=10 (HIGH!)
    //
    // Solution: Create preset with LOW initial minOccurrences (3-4)
    // This allows final clusters to form without over-relaxation complexity

    const optimalPreset = {
        name: 'optimal',
        trimming: {
            leftGapThresh: 0.6,
            rightGapThresh: 0.6,
            edgeWindow: 20
        },
        clustering: {
            minSize: 3,
            minPerfect: 5,
            maxIterations: 10,
            qualitySmall: 80,       // Conservative initial
            qualityMedium: 70,      // Conservative initial
            qualityLarge: 60,       // Conservative initial
            sizeSmallMedium: 11,
            sizeMediumLarge: 20,
            minOccurrences: 3       // KEY: LOW initial value (not 10 or 16)!
        },
        timestamp: new Date().toISOString()
    };

    // Store in localStorage
    let presets = JSON.parse(localStorage.getItem('clusteringPresets') || '{}');
    presets['optimal'] = optimalPreset;
    localStorage.setItem('clusteringPresets', JSON.stringify(presets));

    // Update preset list and select it
    updateClusteringPresetList();
    const presetSelect = el('clusteringPresetList');
    if (presetSelect) {
        presetSelect.value = 'optimal';
        // Immediately load it so user can see the parameters
        loadClusteringPreset(true);
    }

    if (!silent) {
        showMessage('Created "optimal" preset (minOccurrences=3) - now run clustering!', 3000);
    }
    console.log('[Clustering] Created optimal preset:', optimalPreset);
}

function loadClusteringPreset(silent = false) {
    const presetSelect = el('clusteringPresetList');
    const presetName = presetSelect?.value;

    if (!presetName) {
        showMessage("Please select a preset", 2000);
        return;
    }

    let presets = JSON.parse(localStorage.getItem('clusteringPresets') || '{}');
    const preset = presets[presetName];

    if (!preset) {
        showMessage("Preset not found", 2000);
        return;
    }

    // Apply trimming parameters
    el('leftGapInput').value = preset.trimming.leftGapThresh * 100;
    el('rightGapInput').value = preset.trimming.rightGapThresh * 100;
    el('edgeWindowInput').value = preset.trimming.edgeWindow;

    // Apply clustering parameters
    el('clusterMinSizeInput').value = preset.clustering.minSize;
    el('clusterMinPerfectInput').value = preset.clustering.minPerfect;
    el('clusterMaxIterationsInput').value = preset.clustering.maxIterations;

    // Apply quality thresholds (with fallback to defaults for older presets)
    el('qualitySmallInput').value = preset.clustering.qualitySmall || 90;
    el('qualityMediumInput').value = preset.clustering.qualityMedium || 80;
    el('qualityLargeInput').value = preset.clustering.qualityLarge || 70;

    // Apply size breakpoints (with fallback to defaults for older presets)
    el('sizeSmallMediumInput').value = preset.clustering.sizeSmallMedium || 11;
    el('sizeMediumLargeInput').value = preset.clustering.sizeMediumLarge || 20;

    // Apply min occurrences (with fallback to default for older presets)
    el('minOccurrencesInput').value = preset.clustering.minOccurrences || 5;

    const shouldSilent = silent || presetName === 'optimal';
    if (!shouldSilent) {
        showMessage(`Preset "${presetName}" loaded!`, 2000);
    }
    console.log('[Clustering] Loaded preset:', presetName, preset);
}

function updateClusteringPresetList() {
    const presetSelect = el('clusteringPresetList');
    if (!presetSelect) return;

    let presets = JSON.parse(localStorage.getItem('clusteringPresets') || '{}');
    const presetNames = Object.keys(presets).sort();

    // Clear and rebuild options
    presetSelect.innerHTML = '<option value="">-- Select preset --</option>';

    presetNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = `${name} (${new Date(presets[name].timestamp).toLocaleDateString()})`;
        presetSelect.appendChild(option);
    });

    console.log('[Clustering] Preset list updated:', presetNames.length, 'presets');
}

function deleteClusteringPreset() {
    const presetSelect = el('clusteringPresetList');
    const presetName = presetSelect?.value;

    if (!presetName) {
        showMessage("Please select a preset to delete", 2000);
        return;
    }

    if (!confirm(`Delete preset "${presetName}"?`)) {
        return;
    }

    let presets = JSON.parse(localStorage.getItem('clusteringPresets') || '{}');
    delete presets[presetName];
    localStorage.setItem('clusteringPresets', JSON.stringify(presets));

    updateClusteringPresetList();
    showMessage(`Preset "${presetName}" deleted`, 2000);
}

function displayClusteringResults(results) {
    const modal = el('clusteringModal');
    const content = el('clusteringContent');

    if (!modal || !content) return;

    const colors = SINEClusterer.getClusterColors();

    let html = `
        <div style="margin-bottom: 16px; padding: 8px; background: #e8f4f8; border-radius: 4px;">
            <strong>Summary:</strong> ${results.summary.nClusters} cluster${results.summary.nClusters !== 1 ? 's' : ''} |
            ${results.summary.nAssigned} sequences assigned | ${results.summary.nUnassigned} unassigned
        </div>
    `;

    // Display each cluster
    results.clusters.forEach((cluster, idx) => {
        const color = colors[idx % colors.length];
        html += `
            <div style="margin-bottom: 12px; padding: 8px; border: 1px solid #ddd; border-left: 4px solid ${color}; border-radius: 2px;">
                <div style="cursor: pointer; font-weight: bold; user-select: none; margin-bottom: 4px;" onclick="document.getElementById('cluster${idx}').style.display = document.getElementById('cluster${idx}').style.display === 'none' ? 'block' : 'none';">
                    Ã¢â€“Â¶ Cluster ${idx + 1}: ${cluster.size} sequences, ${cluster.nPerfect} diagnostic features
                </div>
                <div id="cluster${idx}" style="display: none; margin-left: 8px; margin-top: 8px;">
                    <div style="margin-bottom: 8px;">
                        <strong>Sequences:</strong>
                        <div style="margin: 4px 0; padding: 4px; background: #f9f9f9; border-radius: 2px;">
                            ${cluster.sequences.map((s, i) => `<div style="font-family: monospace; font-size: 10px;">Ã¢â‚¬Â¢ ${s.id}</div>`).join('')}
                        </div>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Diagnostic Features (first 20):</strong>
                        <div style="margin: 4px 0; padding: 4px; background: #f9f9f9; border-radius: 2px; max-height: 150px; overflow-y: auto;">
                            ${cluster.perfectFeatures.length > 0 ? cluster.perfectFeatures.map(f => `<div style="font-family: monospace; font-size: 10px;">Pos ${f.pos}: ${f.char}</div>`).join('') : '<em>None</em>'}
                        </div>
                    </div>
                    <button onclick="highlightCluster(${idx})" style="padding: 4px 8px; font-size: 11px; background: ${color}; color: white; border: none; border-radius: 2px; cursor: pointer;">Highlight in alignment</button>
                </div>
            </div>
        `;
    });

    // Display unassigned
    if (results.unassigned.length > 0) {
        html += `
            <div style="margin-bottom: 12px; padding: 8px; border: 1px solid #ddd; border-left: 4px solid #999999; border-radius: 2px;">
                <div style="cursor: pointer; font-weight: bold; user-select: none; margin-bottom: 4px;" onclick="document.getElementById('unassignedCluster').style.display = document.getElementById('unassignedCluster').style.display === 'none' ? 'block' : 'none';">
                    Ã¢â€“Â¶ Unassigned: ${results.unassigned.length} sequences
                </div>
                <div id="unassignedCluster" style="display: none; margin-left: 8px; margin-top: 8px;">
                    <div style="margin: 4px 0; padding: 4px; background: #f9f9f9; border-radius: 2px;">
                        ${results.unassigned.map(s => `<div style="font-family: monospace; font-size: 10px;">Ã¢â‚¬Â¢ ${s.id}</div>`).join('')}
                    </div>
                    <button onclick="highlightCluster(-1)" style="padding: 4px 8px; font-size: 11px; background: #999999; color: white; border: none; border-radius: 2px; cursor: pointer; margin-top: 4px;">Highlight in alignment</button>
                </div>
            </div>
        `;
    }

    content.innerHTML = html;
    showExclusiveModal('clusteringModal');
}

function highlightCluster(clusterIdx) {
    if (!state.clusteringResults) return;

    const results = state.clusteringResults;
    const colors = SINEClusterer.getClusterColors();

    // Clear previous cluster highlighting
    document.querySelectorAll('[data-cluster-highlight]').forEach(el => {
        el.removeAttribute('data-cluster-highlight');
        el.style.backgroundColor = '';
    });

    let indicesToHighlight = [];

    if (clusterIdx === -1) {
        // Highlight unassigned
        indicesToHighlight = results.unassigned.map(s => s.index);
    } else {
        // Highlight specific cluster
        indicesToHighlight = results.clusters[clusterIdx].sequences.map(s => s.index);
    }

    const color = clusterIdx === -1 ? '#999999' : colors[clusterIdx % colors.length];

    // Apply highlights
    indicesToHighlight.forEach(idx => {
        document.querySelectorAll(`.seq-line[data-seq-index="${idx}"]`).forEach(line => {
            line.setAttribute('data-cluster-highlight', 'true');
            line.style.backgroundColor = color + '33'; // 33 = 20% opacity
        });
    });

    showMessage(`Highlighted ${indicesToHighlight.length} sequence${indicesToHighlight.length !== 1 ? 's' : ''}`, 2000);
}

/**
 * Read MAFFT advanced options from UI and build extra args array for disttbfast.
 */
function getMafftExtraArgs() {
    const args = [];
    const seqType = el('mafftSeqType')?.value;
    const gapOpen = parseFloat(el('mafftGapOpen')?.value);
    const gapExt = parseFloat(el('mafftGapExt')?.value);
    const cycles = parseInt(el('mafftCycles')?.value);
    const offset = parseFloat(el('mafftOffset')?.value);

    if (!isNaN(gapOpen)) args.push('-f', String(-gapOpen));
    if (!isNaN(gapExt)) args.push('-h', String(-gapExt));
    if (!isNaN(cycles) && cycles >= 1) args.push('-C', String(cycles));
    // Note: disttbfast's -e flag does not accept a numeric value (it's a boolean flag);
    // passing '-e -0.123' causes illegal-option parse errors, so offset is omitted.

    const adjustDir = !!el('mafftAdjustDir')?.checked;
    const reorder = !!el('mafftReorder')?.checked;

    return { args, seqType: seqType || '2', adjustDir, reorder };
}

/**
 * Reverse-complement a nucleotide sequence.
 */
function _reverseComplement(seq) {
    const comp = { A:'T', T:'A', C:'G', G:'C', a:'t', t:'a', c:'g', g:'c',
                   R:'Y', Y:'R', S:'S', W:'W', K:'M', M:'K', B:'V', V:'B', D:'H', H:'D',
                   r:'y', y:'r', s:'s', w:'w', k:'m', m:'k', b:'v', v:'b', d:'h', h:'d',
                   N:'N', n:'n', '-':'-', '.':'.' };
    return seq.split('').reverse().map(c => comp[c] || c).join('');
}

/**
 * Adjust direction of sequences: detect and reverse-complement sequences
 * that are in the wrong orientation relative to the majority.
 * Uses 6-mer frequency voting against the first sequence.
 * Returns { fasta, flipped } where flipped is a Set of header names that were RC'd.
 */
function _adjustDirection(fasta) {
    const seqs = [];
    let cur = null;
    for (const line of fasta.split('\n')) {
        if (line.startsWith('>')) {
            if (cur) seqs.push(cur);
            cur = { header: line.substring(1).trim(), seq: '' };
        } else if (cur) {
            cur.seq += line.trim();
        }
    }
    if (cur) seqs.push(cur);
    if (seqs.length < 2) return { fasta, flipped: new Set() };

    // Build k-mer set from first sequence (reference)
    const K = 6;
    const refSeq = seqs[0].seq.toUpperCase().replace(/[^ACGT]/g, '');
    const refKmers = new Set();
    for (let i = 0; i <= refSeq.length - K; i++) {
        refKmers.add(refSeq.substring(i, i + K));
    }

    const flipped = new Set();
    const result = [`>${seqs[0].header}\n${seqs[0].seq}`];

    for (let i = 1; i < seqs.length; i++) {
        const s = seqs[i];
        const clean = s.seq.toUpperCase().replace(/[^ACGT]/g, '');
        const rc = _reverseComplement(clean);

        let fwdScore = 0, rcScore = 0;
        for (let j = 0; j <= clean.length - K; j++) {
            if (refKmers.has(clean.substring(j, j + K))) fwdScore++;
            if (refKmers.has(rc.substring(j, j + K))) rcScore++;
        }

        if (rcScore > fwdScore) {
            result.push(`>${s.header}\n${_reverseComplement(s.seq)}`);
            flipped.add(s.header);
        } else {
            result.push(`>${s.header}\n${s.seq}`);
        }
    }

    return { fasta: result.join('\n'), flipped };
}

/**
 * Reorder sequences by guide-tree order using 6-mer distance (like MAFFT --reorder).
 * Operates on ungapped sequences (pre-alignment), matching MAFFT's approach.
 * Input: FASTA string (ungapped).
 * Returns: reordered FASTA string + the ordered headers list.
 */
function _reorderByGuideTree(fasta) {
    const seqs = [];
    let cur = null;
    for (const line of fasta.split('\n')) {
        if (line.startsWith('>')) {
            if (cur) seqs.push(cur);
            cur = { header: line.substring(1).trim(), seq: '', fullLine: line };
        } else if (cur) {
            cur.seq += line.trim();
        }
    }
    if (cur) seqs.push(cur);
    if (seqs.length <= 2) return { fasta, order: seqs.map(s => s.header) };

    const n = seqs.length;
    const K = 6;

    // Build k-mer frequency vectors for each sequence
    const kmerVecs = [];
    for (const s of seqs) {
        const clean = s.seq.toUpperCase().replace(/[^ACGT]/g, '');
        const counts = new Map();
        for (let i = 0; i <= clean.length - K; i++) {
            const kmer = clean.substring(i, i + K);
            counts.set(kmer, (counts.get(kmer) || 0) + 1);
        }
        kmerVecs.push(counts);
    }

    // Compute pairwise distances using shared k-mer fraction (1 - jaccard-like)
    const dist = Array.from({ length: n }, () => new Float32Array(n));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const a = kmerVecs[i], b = kmerVecs[j];
            let shared = 0, total = 0;
            const allKmers = new Set([...a.keys(), ...b.keys()]);
            for (const km of allKmers) {
                const ca = a.get(km) || 0, cb = b.get(km) || 0;
                shared += Math.min(ca, cb);
                total += Math.max(ca, cb);
            }
            const d = total > 0 ? 1 - shared / total : 1;
            dist[i][j] = d;
            dist[j][i] = d;
        }
    }

    // UPGMA guide tree construction Ã¢â€ â€™ extract leaf order
    // Represent clusters as arrays of leaf indices; merge closest pair
    const clusters = seqs.map((_, i) => [i]);
    const clusterDist = dist.map(row => new Float32Array(row)); // copy
    const active = new Uint8Array(n).fill(1);

    for (let step = 0; step < n - 1; step++) {
        // Find closest pair of active clusters
        let minD = Infinity, ci = -1, cj = -1;
        for (let i = 0; i < n; i++) {
            if (!active[i]) continue;
            for (let j = i + 1; j < n; j++) {
                if (!active[j]) continue;
                if (clusterDist[i][j] < minD) {
                    minD = clusterDist[i][j];
                    ci = i; cj = j;
                }
            }
        }
        if (ci < 0) break;

        // Optimal leaf ordering at junction: try all 4 orientations of the two
        // clusters and pick the one where the junction elements are closest.
        // A=[...aL, aR] B=[...bL, bR] Ã¢â€ â€™ try (A+B), (A+B'), (A'+B), (A'+B')
        // where A' = reversed A, B' = reversed B
        const cA = clusters[ci], cB = clusters[cj];
        const aFirst = cA[0], aLast = cA[cA.length - 1];
        const bFirst = cB[0], bLast = cB[cB.length - 1];
        // Junction distances for each orientation:
        const opts = [
            { d: dist[aLast][bFirst],  revA: false, revB: false }, // A + B
            { d: dist[aLast][bLast],   revA: false, revB: true  }, // A + B'
            { d: dist[aFirst][bFirst], revA: true,  revB: false }, // A' + B
            { d: dist[aFirst][bLast],  revA: true,  revB: true  }, // A' + B'
        ];
        opts.sort((a, b) => a.d - b.d);
        const best = opts[0];
        const orderedA = best.revA ? [...cA].reverse() : cA;
        const orderedB = best.revB ? [...cB].reverse() : cB;
        clusters[ci] = orderedA.concat(orderedB);
        active[cj] = 0;

        // Update distances (average linkage / UPGMA)
        const sizeI = orderedA.length, sizeJ = orderedB.length;
        for (let k = 0; k < n; k++) {
            if (!active[k] || k === ci) continue;
            const newD = (clusterDist[ci][k] * sizeI + clusterDist[cj][k] * sizeJ) / (sizeI + sizeJ);
            clusterDist[ci][k] = newD;
            clusterDist[k][ci] = newD;
        }
    }

    // Find the last active cluster - its leaf order is the guide tree order
    const finalCluster = clusters.find((_, i) => active[i]) || clusters[0];
    const order = finalCluster;

    // Build reordered FASTA
    const reordered = order.map(i => `${seqs[i].fullLine}\n${seqs[i].seq}`).join('\n');
    const orderedHeaders = order.map(i => seqs[i].header);

    return { fasta: reordered, order: orderedHeaders };
}

function _treeIsBase(char) {
    return /^[ACGTU]$/i.test(char || '');
}

// Pairwise distance metrics for phylogenetic trees
// Returns { pDistance, transitions, transversions, compared } for model corrections
function _alignmentPairMetrics(seqOne, seqTwo) {
    // Purine = A,G; Pyrimidine = C,T
    const isPurine = c => c === 'A' || c === 'G';
    const isPyrimidine = c => c === 'C' || c === 'T';
    const maxLen = Math.max(seqOne.length, seqTwo.length);
    let compared = 0, mismatches = 0, transitions = 0, transversions = 0;
    for (let position = 0; position < maxLen; position++) {
        const b1 = (seqOne[position] || '-').toUpperCase().replace('U', 'T');
        const b2 = (seqTwo[position] || '-').toUpperCase().replace('U', 'T');
        if (!_treeIsBase(b1) || !_treeIsBase(b2)) continue;
        compared++;
        if (b1 !== b2) {
            mismatches++;
            if ((isPurine(b1) && isPurine(b2)) || (isPyrimidine(b1) && isPyrimidine(b2))) {
                transitions++;
            } else {
                transversions++;
            }
        }
    }
    const p = compared > 0 ? mismatches / compared : 0;
    return { p, compared, mismatches, transitions, transversions };
}

// Jukes-Cantor (JC69) correction for multiple hits
// d = -3/4 * ln(1 - 4/3 * p)
function _jc69Distance(p) {
    if (p >= 0.75) return Infinity; // saturation
    if (p <= 0) return 0;
    return -0.75 * Math.log(1 - (4 / 3) * p);
}

// Kimura 2-parameter (K80) correction
// P = transitions/compared, Q = transversions/compared
// d = -0.5 * ln(1 - 2P - Q) - 0.25 * ln(1 - 2Q)
function _k80Distance(P, Q) {
    if (P < 0) P = 0; if (Q < 0) Q = 0;
    const t1 = 1 - 2 * P - Q;
    const t2 = 1 - 2 * Q;
    if (t1 <= 0 || t2 <= 0) return Infinity; // saturation
    return -0.5 * Math.log(t1) - 0.25 * Math.log(t2);
}

// Compute pairwise distance using the selected model
function _modelPairDistance(seqOne, seqTwo, model) {
    const m = _alignmentPairMetrics(seqOne, seqTwo);
    if (m.compared === 0) return 1;
    switch (model) {
        case 'jc69': return _jc69Distance(m.p);
        case 'k80':
            const P = m.transitions / m.compared;
            const Q = m.transversions / m.compared;
            return _k80Distance(P, Q);
        default: return m.p; // 'raw': uncorrected p-distance
    }
}

// Backward-compat wrapper
function _alignmentPairDistance(seqOne, seqTwo) {
    return _alignmentPairMetrics(seqOne, seqTwo).p;
}

function _newickName(name) {
    const cleaned = String(name || 'seq').replace(/\s+/g, '_');
    if (/^[A-Za-z0-9_.:-]+$/.test(cleaned)) return cleaned;
    return `'${cleaned.replace(/'/g, "''")}'`;
}

function _branchLength(value) {
    return Math.max(0, value || 0).toFixed(6).replace(/0+$/, '').replace(/\.$/, '.0');
}

function _treeNodeToNewick(node, isRoot = false) {
    if (!node.left && !node.right) {
        const label = _newickName(node.name);
        return isRoot ? `${label};` : `${label}:${_branchLength(node.branchLength)}`;
    }
    const leftNewick = _treeNodeToNewick(node.left, false);
    const rightNewick = _treeNodeToNewick(node.right, false);
    const branch = isRoot ? ';' : `:${_branchLength(node.branchLength)}`;
    return `(${leftNewick},${rightNewick})${branch}`;
}

function _treeNodeToText(node, indent = '', isRoot = true) {
    const branch = isRoot ? '' : `:${_branchLength(node.branchLength)}`;
    if (!node.left && !node.right) return `${indent}${node.name}${branch}\n`;
    let text = `${indent}${isRoot ? 'root' : 'node'}${branch}\n`;
    text += _treeNodeToText(node.left, `${indent}  `, false);
    text += _treeNodeToText(node.right, `${indent}  `, false);
    return text;
}

function buildUPGMATreeFromAlignment(seqObjects, model) {
    model = model || 'raw';
    const sequenceCount = seqObjects.length;
    const baseDistances = Array.from({ length: sequenceCount }, () => new Array(sequenceCount).fill(0));
    let distanceTotal = 0;
    let distancePairs = 0;
    let distanceMin = Infinity;
    let distanceMax = 0;

    for (let firstIndex = 0; firstIndex < sequenceCount; firstIndex++) {
        for (let secondIndex = firstIndex + 1; secondIndex < sequenceCount; secondIndex++) {
            const distance = _modelPairDistance(seqObjects[firstIndex].seq, seqObjects[secondIndex].seq, model);
            baseDistances[firstIndex][secondIndex] = distance;
            baseDistances[secondIndex][firstIndex] = distance;
            distanceTotal += distance;
            distancePairs++;
            distanceMin = Math.min(distanceMin, distance);
            distanceMax = Math.max(distanceMax, distance);
        }
    }

    const clusters = seqObjects.map((seqObj, index) => ({
        name: seqObj.header || `seq_${index + 1}`,
        size: 1,
        height: 0,
        branchLength: 0,
        left: null,
        right: null
    }));
    const distances = baseDistances.map(row => row.slice());

    while (clusters.length > 1) {
        let closestFirst = 0;
        let closestSecond = 1;
        let closestDistance = distances[0][1];
        for (let firstIndex = 0; firstIndex < clusters.length; firstIndex++) {
            for (let secondIndex = firstIndex + 1; secondIndex < clusters.length; secondIndex++) {
                if (distances[firstIndex][secondIndex] < closestDistance) {
                    closestDistance = distances[firstIndex][secondIndex];
                    closestFirst = firstIndex;
                    closestSecond = secondIndex;
                }
            }
        }

        const firstCluster = clusters[closestFirst];
        const secondCluster = clusters[closestSecond];
        const mergedHeight = closestDistance / 2;
        firstCluster.branchLength = Math.max(0, mergedHeight - firstCluster.height);
        secondCluster.branchLength = Math.max(0, mergedHeight - secondCluster.height);

        const remainingOldIndices = [];
        const mergedDistances = [];
        for (let oldIndex = 0; oldIndex < clusters.length; oldIndex++) {
            if (oldIndex === closestFirst || oldIndex === closestSecond) continue;
            const weightedDistance = (
                distances[closestFirst][oldIndex] * firstCluster.size +
                distances[closestSecond][oldIndex] * secondCluster.size
            ) / (firstCluster.size + secondCluster.size);
            remainingOldIndices.push(oldIndex);
            mergedDistances.push(weightedDistance);
        }

        for (const removeIndex of [closestSecond, closestFirst]) {
            clusters.splice(removeIndex, 1);
            distances.splice(removeIndex, 1);
            distances.forEach(row => row.splice(removeIndex, 1));
        }

        const mergedCluster = {
            name: '',
            size: firstCluster.size + secondCluster.size,
            height: mergedHeight,
            branchLength: 0,
            left: firstCluster,
            right: secondCluster
        };

        distances.forEach((row, remainingIndex) => {
            row.push(mergedDistances[remainingIndex] ?? 0);
        });
        distances.push([...mergedDistances, 0]);
        clusters.push(mergedCluster);
    }

    const root = clusters[0];
    return {
        newick: _treeNodeToNewick(root, true),
        text: _treeNodeToText(root).trimEnd(),
        stats: {
            count: sequenceCount,
            averageDistance: distancePairs ? distanceTotal / distancePairs : 0,
            minDistance: distanceMin === Infinity ? 0 : distanceMin,
            maxDistance: distanceMax
        }
    };
}

/**
 * Neighbor-Joining tree from pairwise alignment distances.
 * Saitou & Nei (1987). Same distance matrix as UPGMA, different clustering.
 */
function buildNJTreeFromAlignment(seqObjects, model) {
    model = model || 'raw';
    const n = seqObjects.length;
    // Compute pairwise distances
    const baseDist = Array.from({ length: n }, () => new Array(n).fill(0));
    let distanceTotal = 0, distancePairs = 0, distanceMin = Infinity, distanceMax = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const d = _modelPairDistance(seqObjects[i].seq, seqObjects[j].seq, model);
            baseDist[i][j] = d;
            baseDist[j][i] = d;
            distanceTotal += d;
            distancePairs++;
            distanceMin = Math.min(distanceMin, d);
            distanceMax = Math.max(distanceMax, d);
        }
    }

    // Initialize clusters
    const clusters = seqObjects.map((s, i) => ({
        name: s.header || `seq_${i + 1}`,
        size: 1,
        height: 0,
        branchLength: 0,
        left: null,
        right: null
    }));
    const dist = baseDist.map(r => r.slice());
    let activeIndices = clusters.map((_, i) => i); // maps to original cluster positions

    // NJ main loop
    while (activeIndices.length > 2) {
        const m = activeIndices.length;
        // Net divergence r[i]
        const r = new Array(m).fill(0);
        for (let a = 0; a < m; a++) {
            for (let b = 0; b < m; b++) {
                if (a !== b) r[a] += dist[a][b];
            }
        }

        // Find minimum Q
        let minQ = Infinity, minI = 0, minJ = 1;
        for (let a = 0; a < m; a++) {
            for (let b = a + 1; b < m; b++) {
                const q = (m - 2) * dist[a][b] - r[a] - r[b];
                if (q < minQ) {
                    minQ = q;
                    minI = a;
                    minJ = b;
                }
            }
        }

        // Branch lengths
        const dij = dist[minI][minJ];
        const bi = Math.max(0, (dij + (r[minI] - r[minJ]) / (m - 2)) / 2);
        const bj = Math.max(0, dij - bi);

        const clusterI = clusters[activeIndices[minI]];
        const clusterJ = clusters[activeIndices[minJ]];
        clusterI.branchLength = bi;
        clusterJ.branchLength = bj;
        const mergedHeight = dij / 2; // approximate

        // New distances to merged node
        const newDistances = [];
        for (let k = 0; k < m; k++) {
            if (k === minI || k === minJ) continue;
            newDistances.push((dist[minI][k] + dist[minJ][k] - dij) / 2);
        }

        // Build merged node
        const merged = {
            name: '',
            size: clusterI.size + clusterJ.size,
            height: mergedHeight,
            branchLength: 0,
            left: clusterI,
            right: clusterJ
        };

        // Rebuild distance matrix without minI, minJ, adding merged
        const oldIndices = [];
        for (let k = 0; k < m; k++) {
            if (k === minI || k === minJ) continue;
            oldIndices.push(activeIndices[k]);
        }
        const newIndex = clusters.length;
        // Remove minI, minJ from dist matrix (minJ first since it's larger)
        dist.splice(Math.max(minI, minJ), 1);
        dist.splice(Math.min(minI, minJ), 1);
        dist.forEach(row => {
            row.splice(Math.max(minI, minJ), 1);
            row.splice(Math.min(minI, minJ), 1);
        });
        // Add merged row/col
        dist.forEach((row, ki) => row.push(newDistances[ki] ?? 0));
        dist.push([...newDistances, 0]);

        activeIndices.splice(Math.max(minI, minJ), 1);
        activeIndices.splice(Math.min(minI, minJ), 1);
        activeIndices.push(newIndex);
        clusters.push(merged);
    }

    // Connect last two clusters
    if (activeIndices.length === 2) {
        const a = activeIndices[0];
        const b = activeIndices[1];
        clusters[a].branchLength = Math.max(0, dist[0][1] / 2);
        clusters[b].branchLength = Math.max(0, dist[0][1] / 2);
        const root = {
            name: '',
            size: clusters[a].size + clusters[b].size,
            height: dist[0][1] / 2,
            branchLength: 0,
            left: clusters[a],
            right: clusters[b]
        };
        clusters.push(root);
        activeIndices = [clusters.length - 1];
    }

    const root = clusters[activeIndices[0]];
    return {
        newick: _treeNodeToNewick(root, true),
        text: _treeNodeToText(root).trimEnd(),
        stats: {
            count: n,
            averageDistance: distancePairs ? distanceTotal / distancePairs : 0,
            minDistance: distanceMin === Infinity ? 0 : distanceMin,
            maxDistance: distanceMax
        }
    };
}

function getTreeInputSequences() {
    if (!state.seqs || state.seqs.length < 2) return [];
    const selected = Array.from(state.selectedRows).filter(index => state.seqs[index]);
    const indices = selected.length >= 2 ? selected.sort((firstIndex, secondIndex) => firstIndex - secondIndex) : state.seqs.map((seqObj, index) => index);
    return indices.map(index => state.seqs[index]);
}

function openTreeBuilder() {
    const seqObjects = getTreeInputSequences();
    if (seqObjects.length < 2) {
        showMessage('Need at least two sequences to build a tree.', 2200);
        return;
    }
    const method = document.querySelector('input[name="treeMethod"]:checked')?.value || 'upgma';
    const modelEl = document.getElementById('treeDistanceModel');
    const model = modelEl ? modelEl.value : 'raw';
    const modelName = model === 'raw' ? 'p-distance' : model.toUpperCase();
    showMessage(`Building ${method.toUpperCase()} tree (${modelName})...`, 0);
    setTimeout(() => {
        try {
            const result = method === 'nj'
                ? buildNJTreeFromAlignment(seqObjects, model)
                : buildUPGMATreeFromAlignment(seqObjects, model);
            const modal = document.getElementById('treeBuilderModal');
            const summary = document.getElementById('treeBuilderSummary');
            const newickOutput = document.getElementById('treeNewickOutput');
            const textOutput = document.getElementById('treeTextOutput');
            const scope = state.selectedRows.size >= 2 ? 'selected sequences' : 'all sequences';
            if (summary) {
                summary.textContent = `${result.stats.count} ${scope} Ã‚Â· ${modelName} Ã‚Â· ${method.toUpperCase()} Ã‚Â· avg ${result.stats.averageDistance.toFixed(4)} Ã‚Â· range ${result.stats.minDistance.toFixed(4)}-${result.stats.maxDistance.toFixed(4)}`;
            }
            if (newickOutput) newickOutput.value = result.newick;
            if (textOutput) textOutput.textContent = result.text;
            if (modal) showExclusiveModal('treeBuilderModal');
            showMessage(`${method.toUpperCase()} tree built.`, 1200);
        } catch (err) {
            console.error('Tree build failed:', err);
            showMessage(`Tree build failed: ${err.message}`, 4000);
        }
    }, 10);
}

function closeTreeBuilder() {
    const modal = document.getElementById('treeBuilderModal');
    if (modal) modal.style.display = 'none';
}

function copyTreeNewick() {
    const newick = document.getElementById('treeNewickOutput')?.value || '';
    if (!newick) return;
    navigator.clipboard.writeText(newick)
        .then(() => showMessage('Newick copied.', 1400))
        .catch(() => showMessage('Failed to copy Newick.', 2200));
}

function downloadTreeNewick() {
    const newick = document.getElementById('treeNewickOutput')?.value || '';
    if (!newick) return;
    const blob = new Blob([newick + '\n'], { type: 'text/plain' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const base = (state.currentFilename || 'alignment').replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/_+$/, '') || 'alignment';
    link.href = downloadUrl;
    const method = document.querySelector('input[name="treeMethod"]:checked')?.value || 'upgma';
    const suffix = method === 'nj' ? '.nj.nwk' : '.upgma.nwk';
    link.download = `${base}${suffix}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 500);
}

/**
 * Open Alignment Statistics modal.
 * Implements esl-alistat (summary) and esl-alipid (pairwise identity)
 * from the Easel library by Sean Eddy, HHMI Janelia.
 * http://eddylab.org/easel/
 */
function openStats() {
    try {
        const seqs = getTreeInputSequences();
        if (seqs.length < 2) {
            showMessage('Need at least two sequences for statistics.', 2200);
            return;
        }
    // esl-alistat summary
    const alen = Math.max(...seqs.map(s => s.seq.length));
    const nseq = seqs.length;
    let totalResidues = 0, totalGaps = 0;
    for (const s of seqs) {
        for (const ch of s.seq) {
            if (ch === '-' || ch === '.') totalGaps++;
            else totalResidues++;
        }
    }
    const totalCells = nseq * alen;
    const gapPct = totalCells ? (totalGaps / totalCells * 100).toFixed(1) : '0';

    // esl-alipid: pairwise percent identity
    const identities = [];
    let minId = 100, maxId = 0, sumId = 0, pairCount = 0;
    const identityMatrix = Array.from({ length: nseq }, () => new Array(nseq).fill('100.0'));
    for (let i = 0; i < nseq; i++) {
        for (let j = 0; j < nseq; j++) {
            if (i === j) { identityMatrix[i][j] = '100.0'; continue; }
            if (i < j) {
                let matches = 0, compared = 0;
                for (let p = 0; p < alen; p++) {
                    const a = seqs[i].seq[p] || '-';
                    const b = seqs[j].seq[p] || '-';
                    if (a !== '-' && a !== '.' && b !== '-' && b !== '.') {
                        compared++;
                        if (a.toUpperCase() === b.toUpperCase()) matches++;
                    }
                }
                const pid = compared > 0 ? (matches / compared * 100) : 0;
                identities.push(pid);
                identityMatrix[i][j] = pid.toFixed(1);
                identityMatrix[j][i] = pid.toFixed(1);
                minId = Math.min(minId, pid);
                maxId = Math.max(maxId, pid);
                sumId += pid;
                pairCount++;
            }
        }
    }
    const avgId = pairCount > 0 ? (sumId / pairCount) : 0;

    // Distance matrix (p-distance = 1 - identity)
    const distMatrix = Array.from({ length: nseq }, () => new Array(nseq).fill('0.0000'));
    for (let i = 0; i < nseq; i++) {
        for (let j = 0; j < nseq; j++) {
            if (i < j) {
                const d = 1 - parseFloat(identityMatrix[i][j]) / 100;
                distMatrix[i][j] = d.toFixed(4);
                distMatrix[j][i] = d.toFixed(4);
            }
        }
    }

    // Render Summary tab
    const seqNames = seqs.map((s, i) => s.header || `seq_${i + 1}`);
    const longestName = Math.max(...seqNames.map(n => n.length));
    const maxName = Math.min(longestName, 30);
    const nameLen = maxName + 2;

    const summaryTab = document.getElementById('statsSummaryTab');
    if (!summaryTab) { showMessage('Statistics panel not found.', 3000); return; }
    const scopeLabel = state.selectedRows.size >= 2 ? 'selected sequences' : 'all sequences';
    summaryTab.innerHTML =
        `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">` +
        `<div style="border:1px solid #ddd;padding:8px;border-radius:4px;">` +
            `<b>Alignment (esl-alistat)</b><br>` +
            `<table style="font-size:11px;">` +
            `<tr><td>Sequences</td><td style="padding-left:12px;">${nseq}</td></tr>` +
            `<tr><td>Length</td><td style="padding-left:12px;">${alen} columns</td></tr>` +
            `<tr><td>Total cells</td><td style="padding-left:12px;">${totalCells.toLocaleString()}</td></tr>` +
            `<tr><td>Residues</td><td style="padding-left:12px;">${totalResidues.toLocaleString()}</td></tr>` +
            `<tr><td>Gaps</td><td style="padding-left:12px;">${totalGaps.toLocaleString()} (${gapPct}%)</td></tr>` +
            `<tr><td>Scope</td><td style="padding-left:12px;">${scopeLabel}</td></tr>` +
            `</table>` +
        `</div>` +
        `<div style="border:1px solid #ddd;padding:8px;border-radius:4px;">` +
            `<b>Identity (esl-alipid)</b><br>` +
            `<table style="font-size:11px;">` +
            `<tr><td>Mean identity</td><td style="padding-left:12px;">${avgId.toFixed(1)}%</td></tr>` +
            `<tr><td>Min identity</td><td style="padding-left:12px;">${minId.toFixed(1)}%</td></tr>` +
            `<tr><td>Max identity</td><td style="padding-left:12px;">${maxId.toFixed(1)}%</td></tr>` +
            `<tr><td>Pairs compared</td><td style="padding-left:12px;">${pairCount}</td></tr>` +
            `</table>` +
        `</div></div>`;

    // Render Distance Matrix tab
    let dm = `<b>Pairwise p-distance (1 Ã¢Ë†â€™ identity)</b><br><br>`;
    dm += ' '.repeat(nameLen);
    for (let i = 0; i < nseq; i++) dm += ` ${String(i + 1).padStart(4)} `;
    dm += '\n';
    for (let i = 0; i < nseq; i++) {
        const name = seqNames[i].substring(0, maxName).padEnd(nameLen, ' ');
        dm += name;
        for (let j = 0; j < nseq; j++) dm += ` ${distMatrix[i][j].padStart(6)}`;
        dm += '\n';
    }
    dm += `\nColumns: 1Ã¢â‚¬â€œ${nseq} = ${seqNames.slice(0, 4).join(', ')}${nseq > 4 ? '...' : ''}`;
    // Append distance matrix and identity to summary
    const dmControls = `<div style="margin:4px 0;"><button id="copyDistanceMatrixBtn" style="font-size:11px;padding:2px 8px;">Copy distance matrix</button></div>`;
    const dmContent = `<details style="margin-top:6px;"><summary style="cursor:pointer;font-weight:bold;font-size:11px;">Distance Matrix (p-distance)</summary>${dmControls}<pre style="font-size:10px;white-space:pre;overflow:auto;max-height:200px;">${dm}</pre></details>`;
    // Render identity matrix
    let im = `<b>Pairwise % identity</b><br><br>`;
    im += ' '.repeat(nameLen);
    for (let i = 0; i < nseq; i++) im += ` ${String(i + 1).padStart(5)}`;
    im += '\n';
    for (let i = 0; i < nseq; i++) {
        const name = seqNames[i].substring(0, maxName).padEnd(nameLen, ' ');
        im += name;
        for (let j = 0; j < nseq; j++) im += ` ${identityMatrix[i][j].padStart(5)}`;
        im += '\n';
    }
    im += `\nColumns: 1Ã¢â‚¬â€œ${nseq} = ${seqNames.slice(0, 4).join(', ')}${nseq > 4 ? '...' : ''}`;
    state._statsMatrices = { distance: dm, identity: im };
    const imControls = `<div style="margin:4px 0;"><button id="copyIdentityMatrixBtn" style="font-size:11px;padding:2px 8px;">Copy identity matrix</button></div>`;
    const imContent = `<details style="margin-top:4px;"><summary style="cursor:pointer;font-weight:bold;font-size:11px;">Pairwise Identity (%)</summary>${imControls}<pre style="font-size:10px;white-space:pre;overflow:auto;max-height:200px;">${im}</pre></details>`;
    summaryTab.innerHTML += dmContent + imContent;
    showExclusiveModal('statsModal');
    } catch(e) {
        console.error('Stats error:', e);
        showMessage(`Statistics error: ${e.message}`, 4000);
    }
}

function closeStats() {
    const modal = document.getElementById('statsModal');
    if (modal) modal.style.display = 'none';
}

function copyStatsMatrix(kind) {
    const text = state._statsMatrices?.[kind];
    if (!text) {
        showMessage('No statistics matrix available to copy.', 2200);
        return;
    }
    navigator.clipboard.writeText(text)
        .then(() => showMessage(`${kind === 'distance' ? 'Distance' : 'Identity'} matrix copied.`, 1600))
        .catch(() => showMessage('Failed to copy statistics matrix.', 2500));
}

function initStatsTabs() {
    const summaryTab = document.getElementById('statsSummaryTab');
    if (!summaryTab) return;
    summaryTab.addEventListener('click', (event) => {
        const target = event.target;
        if (target?.id === 'copyDistanceMatrixBtn') copyStatsMatrix('distance');
        if (target?.id === 'copyIdentityMatrixBtn') copyStatsMatrix('identity');
    });
}

function initTreeBuilderControls() {
    document.querySelectorAll('input[name="treeMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const modal = document.getElementById('treeBuilderModal');
            if (modal && modal.style.display !== 'none') {
                openTreeBuilder();
            }
        });
    });
}

function realignSelectedBlock() {
    if (state.seqs.length === 0) {
        showMessage("No sequences loaded.", 2000);
        return;
    }
    if (state.selectedColumns.size < 2) {
        showMessage("Select at least 2 columns to realign.", 3000);
        return;
    }

    const cols = Array.from(state.selectedColumns).sort((a, b) => a - b);
    const minCol = cols[0];
    const maxCol = cols[cols.length - 1];

    // Save undo state
    pushUndo('realign-block');

    // Extract block sub-sequences as FASTA
    let blockFasta = '';
    for (const s of state.seqs) {
        const block = s.seq.substring(minCol, maxCol + 1);
        blockFasta += `>${s.header}\n${block.replace(/[-.]/g, '')}\n`;
    }

    const { args: extraArgs, seqType } = getMafftExtraArgs();
    if (seqType !== '2') extraArgs.push('-E', seqType);

    showMessage("Realigning block with MAFFT...", 0);
    const mafft = new MafftWasm();
    mafft.realignBlock(blockFasta, extraArgs).then(result => {
        const aligned = parseMafftOutput(result);
        if (aligned.length !== state.seqs.length) {
            showMessage("Error: MAFFT returned different number of sequences.", 3000);
            return;
        }

        // Find max length of realigned block
        const maxLen = Math.max(...aligned.map(a => a.seq.length));

        // Splice realigned block back into each sequence
        for (let i = 0; i < state.seqs.length; i++) {
            const match = aligned.find(a => a.name === state.seqs[i].header);
            if (!match) continue;
            const padded = match.seq.padEnd(maxLen, '-');
            const left = state.seqs[i].seq.substring(0, minCol);
            const right = state.seqs[i].seq.substring(maxCol + 1);
            state.seqs[i].seq = left + padded + right;
            state.seqs[i].gaplessPositions = calculateGaplessPositions(state.seqs[i].seq);
        }

        // Pad all sequences to same length
        const totalMax = Math.max(...state.seqs.map(s => s.seq.length));
        for (const s of state.seqs) {
            s.seq = s.seq.padEnd(totalMax, '-');
        }

        state.selectedColumns.clear();
        renderAlignment();
        showMessage("Block realigned successfully!", 2000);
    }).catch(err => {
        showMessage("Realign block error: " + err.message, 4000);
        console.error("Realign block error:", err);
    });
}

/**
 * Realign all loaded sequences using MAFFT WASM.
 */
function realignAll() {
    if (state.seqs.length < 2) {
        showMessage("Need at least 2 sequences to align.", 2000);
        return;
    }

    // Save undo state
    pushUndo('realign-all');

    // Build ungapped FASTA
    let fasta = '';
    for (const s of state.seqs) {
        fasta += `>${s.fullHeader || s.header}\n${s.seq.replace(/[-.]/g, '')}\n`;
    }

    const { args: extraArgs, seqType, adjustDir, reorder } = getMafftExtraArgs();
    if (seqType !== '2') extraArgs.push('-E', seqType);

    // Pre-alignment: adjust direction if requested
    let flippedNames = new Set();
    if (adjustDir && seqType === '2') {
        const adj = _adjustDirection(fasta);
        fasta = adj.fasta;
        flippedNames = adj.flipped;
        if (flippedNames.size > 0) {
            console.log('Adjust direction: reverse-complemented', [...flippedNames]);
        }
    }

    // Pre-alignment: reorder by guide tree (6-mer distances) like MAFFT --reorder
    let guideOrder = null;
    if (reorder) {
        const reordered = _reorderByGuideTree(fasta);
        fasta = reordered.fasta;
        guideOrder = reordered.order;
    }

    showMessage("Aligning all sequences with MAFFT...", 0);
    const mafft = new MafftWasm();
    mafft.align(fasta, extraArgs).then(result => {
        const aligned = parseMafftOutput(result);
        if (aligned.length === 0) {
            showMessage("Error: MAFFT returned no sequences.", 3000);
            return;
        }

        // Build new seqs array
        const newSeqs = [];
        // Determine output order: guide tree order or original input order
        const outputOrder = guideOrder || state.seqs.map(s => s.fullHeader || s.header);
        for (const hdr of outputOrder) {
            const a = aligned.find(x => x.name === hdr || x.name === hdr.split(/\s+/)[0]);
            const orig = state.seqs.find(s => s.header === hdr || s.fullHeader === hdr);
            if (a) {
                newSeqs.push({
                    header: orig ? orig.header : a.name.split(/\s+/)[0],
                    fullHeader: orig ? orig.fullHeader : a.name,
                    seq: a.seq,
                    gaplessPositions: calculateGaplessPositions(a.seq)
                });
            }
        }
        // Fallback: use aligned in MAFFT output order
        if (newSeqs.length === 0) {
            for (const a of aligned) {
                const name = a.name.split(/\s+/)[0];
                newSeqs.push({
                    header: name,
                    fullHeader: a.name,
                    seq: a.seq,
                    gaplessPositions: calculateGaplessPositions(a.seq)
                });
            }
        }

        state.seqs = newSeqs;
        state.selectedRows.clear();
        state.selectedColumns.clear();
        state.selectedNucs.clear();
        renderAlignment();
        const msgs = [`Aligned ${state.seqs.length} sequences successfully!`];
        if (flippedNames.size > 0) msgs.push(`RC'd: ${[...flippedNames].join(', ')}`);
        showMessage(msgs.join(' '), flippedNames.size > 0 ? 5000 : 2000);
    }).catch(err => {
        showMessage("MAFFT alignment error: " + err.message, 4000);
        console.error("MAFFT alignment error:", err);
    });
}

/**
 * Realign only the selected sequences using MAFFT WASM.
 * Non-selected sequences stay unchanged. Selected sequences are realigned
 * among themselves and padded/trimmed to fit back into the alignment.
 */
function realignSelected() {
    if (state.selectedRows.size < 2) {
        showMessage("Select at least 2 sequences to realign.", 2000);
        return;
    }

    // Save undo state
    pushUndo('realign-selected');

    const selectedIndices = Array.from(state.selectedRows).sort((a, b) => a - b);

    // Build ungapped FASTA from selected sequences
    let fasta = '';
    for (const idx of selectedIndices) {
        const s = state.seqs[idx];
        fasta += `>${s.fullHeader || s.header}\n${s.seq.replace(/[-.]/g, '')}\n`;
    }

    const { args: extraArgs, seqType, adjustDir } = getMafftExtraArgs();
    if (seqType !== '2') extraArgs.push('-E', seqType);

    // Pre-alignment: adjust direction if requested
    if (adjustDir && seqType === '2') {
        const adj = _adjustDirection(fasta);
        fasta = adj.fasta;
        if (adj.flipped.size > 0) {
            console.log('Adjust direction (selected): reverse-complemented', [...adj.flipped]);
        }
    }

    showMessage(`Realigning ${selectedIndices.length} selected sequences with MAFFT...`, 0);
    const mafft = new MafftWasm();
    mafft.align(fasta, extraArgs).then(result => {
        const aligned = parseMafftOutput(result);
        if (aligned.length === 0) {
            showMessage("Error: MAFFT returned no sequences.", 3000);
            return;
        }

        // Replace selected sequences with aligned versions
        for (const idx of selectedIndices) {
            const s = state.seqs[idx];
            const match = aligned.find(a => a.name === s.header || a.name === s.fullHeader);
            if (match) {
                state.seqs[idx].seq = match.seq;
                state.seqs[idx].gaplessPositions = calculateGaplessPositions(match.seq);
            }
        }

        // Pad all sequences to the same length
        const maxLen = Math.max(...state.seqs.map(s => s.seq.length));
        for (const s of state.seqs) {
            s.seq = s.seq.padEnd(maxLen, '-');
        }

        state.selectedColumns.clear();
        renderAlignment();
        showMessage(`Realigned ${selectedIndices.length} selected sequences!`, 2000);
    }).catch(err => {
        showMessage("Realign selected error: " + err.message, 4000);
        console.error("Realign selected error:", err);
    });
}

/**
 * Open the Add Sequences modal.
 */
function openAddSequencesModal() {
    const modal = document.getElementById('addSeqModal');
    if (modal) {
        document.getElementById('addSeqInput').value = '';
        document.getElementById('addSeqFileLabel').textContent = '';
        document.getElementById('addSeqFileInput').value = '';
        showExclusiveModal('addSeqModal');
    }
}

/**
 * Browse button: open file dialog to append FASTA/MSF/other files to add-seq textarea.
 */
function initAddSeqBrowse() {
    const browseBtn = document.getElementById('addSeqBrowseButton');
    const fileInput = document.getElementById('addSeqFileInput');
    const label = document.getElementById('addSeqFileLabel');
    const textarea = document.getElementById('addSeqInput');
    if (!browseBtn || !fileInput || !textarea) return;

    browseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files);
        if (!files.length) return;
        label.textContent = `Reading ${files.length} file(s)...`;
        let allContent = textarea.value.trim();
        for (const file of files) {
            try {
                const text = await file.text();
                const trimmed = text.trim();
                if (allContent) allContent += '\n' + trimmed;
                else allContent = trimmed;
            } catch (e) {
                console.error('Error reading file:', file.name, e);
            }
        }
        textarea.value = allContent;
        label.textContent = `Loaded ${files.length} file(s): ${files.map(f => f.name).join(', ')}`;
        fileInput.value = '';
    });
}

/**
 * Close the Add Sequences modal.
 */
function closeAddSequencesModal() {
    const modal = document.getElementById('addSeqModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Just add sequences (pad with gaps to alignment length, no realignment).
 * Respects "Place at top" and "Align to consensus" checkboxes.
 */
async function addSequencesJustAdd() {
    const newText = document.getElementById('addSeqInput')?.value?.trim();
    if (!newText) {
        showMessage("Please paste FASTA sequences to add.", 2000);
        return;
    }

    // Parse FASTA
    const lines = newText.split('\n');
    const newSeqs = [];
    let currentHeader = null;
    let currentSeq = '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) {
            if (currentHeader !== null) {
                newSeqs.push({ header: currentHeader.split(/\s+/)[0], fullHeader: currentHeader, seq: currentSeq });
            }
            currentHeader = trimmed.substring(1).trim();
            currentSeq = '';
        } else if (trimmed) {
            currentSeq += trimmed;
        }
    }
    if (currentHeader !== null) {
        newSeqs.push({ header: currentHeader.split(/\s+/)[0], fullHeader: currentHeader, seq: currentSeq });
    }

    if (newSeqs.length === 0) {
        showMessage("No valid FASTA sequences found.", 2000);
        return;
    }

    const atTop = document.getElementById('addSeqAtTop')?.checked;
    const alignToCons = document.getElementById('addSeqAlignCons')?.checked;

    pushUndo('add-sequences');

    // If align-to-consensus, do pairwise alignment of each new seq against consensus
    if (alignToCons && state.seqs.length > 0 && state.consensusSeq) {
        try {
            const { args: extraArgs, seqType } = getMafftExtraArgs();
            const consensusArgs = [...extraArgs];
            if (seqType !== '2') consensusArgs.push('-E', seqType);

            let workingSeqs = state.seqs.map(seqObj => ({ ...seqObj }));
            const alignedNewSeqs = [];
            for (const ns of newSeqs) {
                const currentConsensus = computeConsensusForSequences(workingSeqs.map(seqObj => seqObj.seq));
                const alignedProfile = await alignSequenceToConsensusProfile(ns.seq, currentConsensus, consensusArgs);

                workingSeqs = workingSeqs.map(seqObj => {
                    const nextSeq = _rebuildSequenceWithInsertedProfileColumns(seqObj.seq, alignedProfile.layout, alignedProfile.extraColumnsPerSlot);
                    return {
                        ...seqObj,
                        seq: nextSeq,
                        gaplessPositions: calculateGaplessPositions(nextSeq)
                    };
                });

                ns.seq = alignedProfile.seq;
                ns.gaplessPositions = calculateGaplessPositions(ns.seq);
                alignedNewSeqs.push({ ...ns });
                workingSeqs.push({ ...ns });
            }

            const existingCount = workingSeqs.length - alignedNewSeqs.length;
            if (atTop) {
                state.seqs = [...alignedNewSeqs, ...workingSeqs.slice(0, existingCount)];
            } else {
                state.seqs = workingSeqs;
            }
        } catch (err) {
            console.error('Add-to-consensus alignment failed:', err);
            showMessage(`Add-to-consensus alignment failed: ${err.message}`, 4000);
            return;
        }
    } else {
        // Pad to current alignment length
        const alignLen = state.seqs.length > 0 ? Math.max(...state.seqs.map(s => s.seq.length)) : 0;
        for (const ns of newSeqs) {
            if (alignLen > 0 && ns.seq.length < alignLen) {
                ns.seq = ns.seq.padEnd(alignLen, '-');
            }
            ns.gaplessPositions = calculateGaplessPositions(ns.seq);
        }
    }

    if (!(alignToCons && state.seqs.length > 0 && state.consensusSeq)) {
        if (atTop) {
            state.seqs.unshift(...newSeqs);
        } else {
            state.seqs.push(...newSeqs);
        }
    }

    closeAddSequencesModal();
    renderAlignment();
    showMessage(`Added ${newSeqs.length} sequence${newSeqs.length > 1 ? 's' : ''} at ${atTop ? 'top' : 'bottom'}!`, 2000);
}

function _isGapChar(ch) {
    return ch === '-' || ch === '.' || ch === ' ';
}

function _buildProfileColumnLayout(profile) {
    const slots = [[]];
    const residueColumns = [];
    let residueCount = 0;

    for (let col = 0; col < profile.length; col++) {
        if (_isGapChar(profile[col])) {
            slots[residueCount].push(col);
            continue;
        }

        residueColumns.push(col);
        residueCount++;
        slots[residueCount] = slots[residueCount] || [];
    }

    return { slots, residueColumns, residueCount };
}

function _mapPairwiseAlignmentToProfile(alignedConsensus, alignedSeq, residueCount) {
    const slotInsertions = Array.from({ length: residueCount + 1 }, () => []);
    const residueChars = new Array(residueCount).fill('-');
    let residueIndex = 0;

    for (let i = 0; i < alignedConsensus.length; i++) {
        const consChar = alignedConsensus[i];
        const seqChar = alignedSeq[i] || '-';
        if (_isGapChar(consChar)) {
            slotInsertions[residueIndex].push(seqChar);
            continue;
        }

        if (residueIndex < residueCount) {
            residueChars[residueIndex] = seqChar;
        }
        residueIndex++;
    }

    return { slotInsertions, residueChars };
}

function _mergeSequenceIntoConsensusProfile(profile, alignedConsensus, alignedSeq) {
    const layout = _buildProfileColumnLayout(profile);
    const mapped = _mapPairwiseAlignmentToProfile(alignedConsensus, alignedSeq, layout.residueCount);
    const extraColumnsPerSlot = mapped.slotInsertions.map((chars, slotIndex) => {
        const existingSlots = layout.slots[slotIndex] || [];
        return Math.max(0, chars.length - existingSlots.length);
    });

    const rebuilt = [];
    for (let slotIndex = 0; slotIndex < layout.slots.length; slotIndex++) {
        const existingSlotCols = layout.slots[slotIndex] || [];
        const insertedChars = mapped.slotInsertions[slotIndex] || [];

        for (let i = 0; i < existingSlotCols.length; i++) {
            rebuilt.push(insertedChars[i] || '-');
        }

        const extraCount = extraColumnsPerSlot[slotIndex] || 0;
        for (let i = 0; i < extraCount; i++) {
            rebuilt.push(insertedChars[existingSlotCols.length + i] || '-');
        }

        if (slotIndex < layout.residueCount) {
            rebuilt.push(mapped.residueChars[slotIndex] || '-');
        }
    }

    return {
        seq: rebuilt.join(''),
        extraColumnsPerSlot,
        layout
    };
}

function _rebuildSequenceWithInsertedProfileColumns(seq, layout, extraColumnsPerSlot) {
    const rebuilt = [];

    for (let slotIndex = 0; slotIndex < layout.slots.length; slotIndex++) {
        const existingSlotCols = layout.slots[slotIndex] || [];
        for (const col of existingSlotCols) {
            rebuilt.push(seq[col] || '-');
        }

        const extraCount = extraColumnsPerSlot[slotIndex] || 0;
        for (let i = 0; i < extraCount; i++) {
            rebuilt.push('-');
        }

        if (slotIndex < layout.residueCount) {
            rebuilt.push(seq[layout.residueColumns[slotIndex]] || '-');
        }
    }

    return rebuilt.join('');
}

async function alignSequenceToConsensusProfile(seq, profile, extraArgs = []) {
    const ungappedSeq = String(seq || '').replace(/[-.\s]/g, '');
    const ungappedProfile = String(profile || '').replace(/[-.\s]/g, '');
    const layout = _buildProfileColumnLayout(profile || '');

    if (!profile) {
        throw new Error('Consensus profile is empty');
    }
    if (!ungappedProfile) {
        throw new Error('Consensus has no residues');
    }
    if (!ungappedSeq) {
        return {
            seq: profile.replace(/[^-.\s]/g, '-'),
            extraColumnsPerSlot: new Array(layout.slots.length).fill(0),
            layout
        };
    }

    const pairwiseFasta = `>consensus\n${ungappedProfile}\n>query\n${ungappedSeq}\n`;
    const mafft = new MafftWasm();
    const result = await mafft.align(pairwiseFasta, extraArgs);
    const aligned = parseMafftOutput(result);

    if (aligned.length < 2) {
        throw new Error('MAFFT pairwise alignment returned incomplete output');
    }

    return _mergeSequenceIntoConsensusProfile(profile, aligned[0].seq || '', aligned[1].seq || '');
}

/**
 * Add new sequences and realign with existing using MAFFT WASM.
 */
function addSequencesAndAlign() {
    const newText = document.getElementById('addSeqInput')?.value?.trim();
    if (!newText) {
        showMessage("Please paste FASTA sequences to add.", 2000);
        return;
    }
    if (state.seqs.length === 0) {
        showMessage("Load an alignment first.", 2000);
        return;
    }

    // Save undo state
    pushUndo('add-and-align');

    // Build ungapped FASTA from existing sequences
    let existingFasta = '';
    for (const s of state.seqs) {
        existingFasta += `>${s.fullHeader || s.header}\n${s.seq.replace(/[-.]/g, '')}\n`;
    }

    const { args: extraArgs, seqType, adjustDir, reorder } = getMafftExtraArgs();
    const atTop = !!document.getElementById('addSeqAtTop')?.checked;
    if (seqType !== '2') extraArgs.push('-E', seqType);

    // Pre-alignment: adjust direction on new sequences if requested
    let adjustedNewText = newText;
    if (adjustDir && seqType === '2') {
        // Use first existing sequence as reference orientation
        const refFasta = `>${state.seqs[0].header}\n${state.seqs[0].seq.replace(/[-.]/g, '')}\n${newText}`;
        const adj = _adjustDirection(refFasta);
        // Extract only the new sequences (skip the reference we prepended)
        const adjLines = adj.fasta.split('\n');
        let skip = true;
        const newLines = [];
        let count = 0;
        for (const line of adjLines) {
            if (line.startsWith('>')) {
                count++;
                if (count > 1) skip = false;
            }
            if (!skip) newLines.push(line);
        }
        adjustedNewText = newLines.join('\n');
        if (adj.flipped.size > 0) {
            console.log('Adjust direction (add&align): reverse-complemented', [...adj.flipped]);
        }
    }

    const addedFullHeaders = new Set();
    adjustedNewText.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) {
            addedFullHeaders.add(trimmed.substring(1).trim());
        }
    });

    closeAddSequencesModal();
    showMessage("Adding sequences and aligning with MAFFT...", 0);

    const mafft = new MafftWasm();
    mafft.addAndAlign(existingFasta, adjustedNewText, extraArgs).then(result => {
        const aligned = parseMafftOutput(result);
        if (aligned.length === 0) {
            showMessage("Error: MAFFT returned no sequences.", 3000);
            return;
        }

        // Build new seqs array; if reorder requested, sort by guide tree
        let newSeqs = [];
        for (const a of aligned) {
            const name = a.name.split(/\s+/)[0];
            newSeqs.push({
                header: name,
                fullHeader: a.name,
                seq: a.seq,
                gaplessPositions: calculateGaplessPositions(a.seq)
            });
        }

        if (reorder) {
            // Re-derive guide tree order from the combined ungapped sequences
            const combinedFasta = newSeqs.map(s => `>${s.fullHeader || s.header}\n${s.seq.replace(/[-. ]/g, '')}`).join('\n');
            const reordered = _reorderByGuideTree(combinedFasta);
            const orderMap = new Map(reordered.order.map((h, i) => [h, i]));
            newSeqs.sort((a, b) => {
                const ia = orderMap.get(a.fullHeader) ?? orderMap.get(a.header) ?? 9999;
                const ib = orderMap.get(b.fullHeader) ?? orderMap.get(b.header) ?? 9999;
                return ia - ib;
            });
        }

        // Respect "Place at top" after Add & Align
        if (addedFullHeaders.size > 0) {
            const added = [];
            const existing = [];
            for (const seqObj of newSeqs) {
                if (addedFullHeaders.has(seqObj.fullHeader || seqObj.header)) {
                    added.push(seqObj);
                } else {
                    existing.push(seqObj);
                }
            }
            if (added.length > 0) {
                newSeqs = atTop ? [...added, ...existing] : [...existing, ...added];
            }
        }

        state.seqs = newSeqs;
        state.selectedRows.clear();
        state.selectedColumns.clear();
        state.selectedNucs.clear();
        renderAlignment();
        showMessage(`Aligned ${state.seqs.length} sequences successfully!`, 2000);
    }).catch(err => {
        showMessage("MAFFT add & align error: " + err.message, 4000);
        console.error("MAFFT add & align error:", err);
    });
}

/**
 * Parse MAFFT FASTA output into array of {name, seq} objects.
 */
function parseMafftOutput(fastaStr) {
    const lines = fastaStr.split('\n');
    const result = [];
    let current = null;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('>')) {
            if (current) result.push(current);
            current = { name: trimmed.substring(1).trim(), seq: '' };
        } else if (current) {
            current.seq += trimmed.toUpperCase();
        }
    }
    if (current) result.push(current);
    return result;
}
function copySequences(gapped, isFasta, index) {
    let indices = Array.from(state.selectedRows).sort((a,b)=>a-b);
    if (indices.length === 0) {
        indices = [index];
    }
    let text = '';
    if (isFasta) {
        text = indices.map(i => {
            let seq = state.seqs[i].seq;
            if (!gapped) seq = seq.replace(/[-.]/g, '');
            return `>${state.seqs[i].fullHeader || state.seqs[i].header}\n${seq}`;
        }).join('\n');
    } else {
        text = indices.map(i => {
            let seq = state.seqs[i].seq;
            if (!gapped) seq = seq.replace(/[-.]/g, '');
            return seq;
        }).join('\n');
    }
    navigator.clipboard.writeText(text).then(() => {
        const count = indices.length;
        const type = isFasta ? 'FASTA' : 'plain text';
        const gapType = gapped ? 'gapped' : 'ungapped';
        showMessage(`${count > 1 ? 'Selected sequences' : 'Sequence'} copied as ${type} (${gapType})!`, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showMessage("Failed to copy.", 5000);
    });
}

// ============================================================
// Sequence Editor (SeqEdit)
// ============================================================

const _seqEditUndoStack = [];
let _seqEditUndoPos = -1;

function _seqEditPushUndo() {
    const textarea = document.getElementById('seqEditTextarea');
    if (!textarea) return;
    const val = textarea.value;
    if (_seqEditUndoPos >= 0 && _seqEditUndoStack[_seqEditUndoPos] === val) return;
    _seqEditUndoStack.length = _seqEditUndoPos + 1;
    _seqEditUndoStack.push(val);
    _seqEditUndoPos = _seqEditUndoStack.length - 1;
    if (_seqEditUndoStack.length > 50) { _seqEditUndoStack.shift(); _seqEditUndoPos--; }
    _updateSeqEditUndoButtons();
}

function _seqEditUndo() {
    if (_seqEditUndoPos <= 0) return;
    _seqEditUndoPos--;
    const textarea = document.getElementById('seqEditTextarea');
    if (textarea) textarea.value = _seqEditUndoStack[_seqEditUndoPos];
    _updateSeqEditUndoButtons();
    _updateSeqEditLength();
}

function _seqEditRedo() {
    if (_seqEditUndoPos >= _seqEditUndoStack.length - 1) return;
    _seqEditUndoPos++;
    const textarea = document.getElementById('seqEditTextarea');
    if (textarea) textarea.value = _seqEditUndoStack[_seqEditUndoPos];
    _updateSeqEditUndoButtons();
    _updateSeqEditLength();
}

function _updateSeqEditUndoButtons() {
    const undoBtn = document.getElementById('seqEditUndoBtn');
    const redoBtn = document.getElementById('seqEditRedoBtn');
    if (undoBtn) undoBtn.disabled = _seqEditUndoPos < 1;
    if (redoBtn) redoBtn.disabled = _seqEditUndoPos >= _seqEditUndoStack.length - 1;
}

function _seqEditResetUndo(initialValue) {
    _seqEditUndoStack.length = 0;
    _seqEditUndoStack.push(initialValue);
    _seqEditUndoPos = 0;
    _updateSeqEditUndoButtons();
}


function openSeqEditor(index) {
    if (index === undefined || index === null) {
        // Use selected rows, or open freeform if none selected
        if (state.selectedRows.size > 1) {
            // Multi-sequence mode
            return openSeqEditorMulti();
        } else if (state.selectedRows.size === 1) {
            index = Math.min(...state.selectedRows);
        } else {
            index = -1; // freeform mode
        }
    }
    if (index !== -1 && (index < 0 || index >= state.seqs.length)) return;

    const modal = document.getElementById('seqEditModal');
    if (!modal) return;
    const textarea = document.getElementById('seqEditTextarea');
    const nameInput = document.getElementById('seqEditNameInput');
    const indexEl = document.getElementById('seqEditIndex');

    // Show name input for single/freeform mode
    if (nameInput) nameInput.style.display = '';
    const nameLabel = nameInput?.previousElementSibling;
    if (nameLabel) nameLabel.style.display = '';

    if (index === -1) {
        // Freeform mode: blank editor for new or arbitrary text
        if (nameInput) nameInput.value = 'new_sequence';
        if (indexEl) indexEl.textContent = '-1';
        textarea.value = '>new_sequence\n';
    } else {
        const s = state.seqs[index];
        if (nameInput) nameInput.value = s.fullHeader || s.header;
        if (indexEl) indexEl.textContent = String(index);
        textarea.value = `>${s.fullHeader || s.header}\n${s.seq}`;
    }
    _updateSeqEditLength();

    showExclusiveModal('seqEditModal');
    _seqEditResetUndo(textarea.value);
    textarea.focus();
}

function openSeqEditorMulti() {
    const modal = document.getElementById('seqEditModal');
    if (!modal) return;
    const textarea = document.getElementById('seqEditTextarea');
    const nameInput = document.getElementById('seqEditNameInput');
    const indexEl = document.getElementById('seqEditIndex');

    // Hide name input for multi mode - names are in the textarea
    if (nameInput) nameInput.style.display = 'none';
    const nameLabel = nameInput?.previousElementSibling;
    if (nameLabel) nameLabel.style.display = 'none';

    // Store multi indices
    const indices = Array.from(state.selectedRows).sort((a, b) => a - b);
    if (indexEl) indexEl.textContent = 'multi:' + indices.join(',');

    // Build multi-FASTA
    let text = '';
    for (const i of indices) {
        const s = state.seqs[i];
        text += `>${s.fullHeader || s.header}\n${s.seq}\n`;
    }
    textarea.value = text.trimEnd();
    _updateSeqEditLength();

    showExclusiveModal('seqEditModal');
    textarea.focus();
}

function _updateSeqEditLength() {
    const textarea = document.getElementById('seqEditTextarea');
    if (!textarea) return;
    const lines = textarea.value.split('\n');
    let seqLen = 0;
    let seqCount = 0;
    for (const line of lines) {
        if (line.startsWith('>')) {
            seqCount++;
        } else {
            seqLen += line.trim().length;
        }
    }
    const lenSpan = document.getElementById('seqEditLength');
    if (lenSpan) {
        if (seqCount > 1) {
            lenSpan.textContent = `${seqLen} (${seqCount} sequences)`;
        } else {
            lenSpan.textContent = String(seqLen);
        }
    }
}

function closeSeqEditor() {
    const modal = document.getElementById('seqEditModal');
    if (modal) modal.style.display = 'none';
}

function _getSeqEditSequence() {
    const textarea = document.getElementById('seqEditTextarea');
    if (!textarea) return '';
    const lines = textarea.value.split('\n');
    let seq = '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('>')) seq += trimmed;
    }
    return seq;
}

/** Parse multi-FASTA from textarea into [{header, seq}, ...] */
function _getSeqEditMultiFasta() {
    const textarea = document.getElementById('seqEditTextarea');
    if (!textarea) return [];
    const lines = textarea.value.split('\n');
    const result = [];
    let currentHeader = null;
    let currentSeq = '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) {
            if (currentHeader !== null) {
                result.push({ header: currentHeader, seq: currentSeq });
            }
            currentHeader = trimmed.substring(1).trim();
            currentSeq = '';
        } else {
            currentSeq += trimmed;
        }
    }
    if (currentHeader !== null) {
        result.push({ header: currentHeader, seq: currentSeq });
    }
    return result;
}

/** Write multi-FASTA back to textarea */
function _setSeqEditMultiFasta(entries) {
    const textarea = document.getElementById('seqEditTextarea');
    if (!textarea) return;
    textarea.value = entries.map(e => `>${e.header}\n${e.seq}`).join('\n');
    _updateSeqEditLength();
}

function _isSeqEditMulti() {
    const indexEl = document.getElementById('seqEditIndex');
    return indexEl && indexEl.textContent.startsWith('multi:');
}

function _setSeqEditSequence(seq) {
    const textarea = document.getElementById('seqEditTextarea');
    if (!textarea) return;
    const nameInput = document.getElementById('seqEditNameInput');
    const name = nameInput ? nameInput.value : 'sequence';
    textarea.value = `>${name}\n${seq}`;
    _updateSeqEditLength();
}

const _complementMap = { 'A':'T','T':'A','C':'G','G':'C','N':'N','-':'-','.':'.',
    'U':'A','R':'Y','Y':'R','M':'K','K':'M','S':'S','W':'W',
    'H':'D','B':'V','V':'B','D':'H',
    'a':'t','t':'a','c':'g','g':'c','n':'n','u':'a',
    'r':'y','y':'r','m':'k','k':'m','s':'s','w':'w',
    'h':'d','b':'v','v':'b','d':'h' };

function _seqEditTransform(fn) {
    if (_isSeqEditMulti()) {
        const entries = _getSeqEditMultiFasta();
        for (const e of entries) e.seq = fn(e.seq);
        _setSeqEditMultiFasta(entries);
    } else {
        _setSeqEditSequence(fn(_getSeqEditSequence()));
    }
}

function seqEditDegap() {
    _seqEditTransform(seq => seq.replace(/[-.\s]/g, ''));
}

function seqEditReverse() {
    _seqEditTransform(seq => seq.split('').reverse().join(''));
}

function seqEditComplement() {
    _seqEditTransform(seq => seq.split('').map(b => _complementMap[b] || b).join(''));
}

function seqEditRevComp() {
    _seqEditTransform(seq => seq.split('').reverse().map(b => _complementMap[b] || b).join(''));
}

function seqEditUppercase() {
    _seqEditTransform(seq => seq.toUpperCase());
}

function seqEditLowercase() {
    _seqEditTransform(seq => seq.toLowerCase());
}

function seqEditApply() {
    const indexStr = document.getElementById('seqEditIndex')?.textContent;

    // Multi-sequence mode
    if (indexStr && indexStr.startsWith('multi:')) {
        const indices = indexStr.substring(6).split(',').map(Number);
        const entries = _getSeqEditMultiFasta();
        if (entries.length === 0) {
            showMessage("No sequences found.", 2000);
            return;
        }

        pushUndo('seqedit-multi');
        const padCheckbox = document.getElementById('seqEditPadGaps');
        const alignLen = state.seqs.length > 0 ? Math.max(...state.seqs.map(s => s.seq.length)) : 0;

        // Update existing sequences (matched by index order)
        const updateCount = Math.min(entries.length, indices.length);
        for (let i = 0; i < updateCount; i++) {
            const idx = indices[i];
            if (idx < 0 || idx >= state.seqs.length) continue;
            let seq = entries[i].seq;
            if (padCheckbox && padCheckbox.checked && alignLen > 0) {
                if (seq.length < alignLen) seq = seq.padEnd(alignLen, '-');
                else if (seq.length > alignLen) seq = seq.substring(0, alignLen);
            }
            const fullH = entries[i].header;
            state.seqs[idx].header = fullH.split(/\s+/)[0];
            state.seqs[idx].fullHeader = fullH;
            state.seqs[idx].seq = seq;
            state.seqs[idx].gaplessPositions = calculateGaplessPositions(seq);
        }
        // If user added extra sequences in the textarea, append them
        // Recompute alignment length in case updates above changed it
        const updatedAlignLen = state.seqs.length > 0 ? Math.max(...state.seqs.map(s => s.seq.length)) : 0;
        for (let i = updateCount; i < entries.length; i++) {
            let seq = entries[i].seq;
            if (padCheckbox && padCheckbox.checked && updatedAlignLen > 0) {
                if (seq.length < updatedAlignLen) seq = seq.padEnd(updatedAlignLen, '-');
                else if (seq.length > updatedAlignLen) seq = seq.substring(0, updatedAlignLen);
            }
            const fullH = entries[i].header;
            state.seqs.push({
                header: fullH.split(/\s+/)[0],
                fullHeader: fullH,
                seq: seq,
                gaplessPositions: calculateGaplessPositions(seq)
            });
        }
        closeSeqEditor();
        renderAlignment();
        showMessage(`${updateCount} sequence${updateCount > 1 ? 's' : ''} updated!`, 2000);
        return;
    }

    const index = parseInt(indexStr);
    const isFreeform = (index === -1);

    if (!isFreeform && (isNaN(index) || index < 0 || index >= state.seqs.length)) {
        showMessage("Invalid sequence index.", 3000);
        return;
    }

    let seq = _getSeqEditSequence();
    if (!seq) {
        showMessage("Sequence is empty.", 2000);
        return;
    }

    // Get header from name input field (preferred) or textarea first line
    const nameInput = document.getElementById('seqEditNameInput');
    let newFullHeader = nameInput ? nameInput.value.trim() : '';
    if (!newFullHeader) {
        const textarea = document.getElementById('seqEditTextarea');
        const firstLine = textarea.value.split('\n')[0].trim();
        if (firstLine.startsWith('>')) {
            newFullHeader = firstLine.substring(1).trim();
        }
    }
    if (!newFullHeader) newFullHeader = 'sequence';
    const newHeader = newFullHeader.split(/\s+/)[0];

    // Pad or trim if checkbox is checked
    const padCheckbox = document.getElementById('seqEditPadGaps');
    if (padCheckbox && padCheckbox.checked && state.seqs.length > 0) {
        const alignLen = Math.max(...state.seqs.map(s => s.seq.length));
        if (alignLen > 0) {
            if (seq.length < alignLen) {
                seq = seq.padEnd(alignLen, '-');
            } else if (seq.length > alignLen) {
                seq = seq.substring(0, alignLen);
            }
        }
    }

    if (isFreeform) {
        pushUndo('seqedit-add');
        const newSeq = {
            header: newHeader,
            fullHeader: newFullHeader,
            seq: seq,
            gaplessPositions: calculateGaplessPositions(seq)
        };
        state.seqs.push(newSeq);
        closeSeqEditor();
        renderAlignment();
        showMessage("New sequence added!", 2000);
    } else {
        pushUndo('seqedit');
        state.seqs[index].header = newHeader;
        state.seqs[index].fullHeader = newFullHeader;
        state.seqs[index].seq = seq;
        state.seqs[index].gaplessPositions = calculateGaplessPositions(seq);
        closeSeqEditor();
        renderAlignment();
        showMessage("Sequence updated!", 2000);
    }
}

// ============================================================
// Undo/Redo Dropdown Menus
// ============================================================

function showUndoRedoDropdown(buttonEl, stack, actionFn, labelPrefix) {
    // Remove any existing dropdown
    document.querySelectorAll('.undo-redo-dropdown').forEach(d => d.remove());

    if (stack.length === 0) {
        showMessage(`Nothing to ${labelPrefix.toLowerCase()}.`, 2000);
        return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'undo-redo-dropdown';
    dropdown.style.cssText = 'position:absolute; background:white; border:1px solid #ccc; box-shadow:0 2px 8px rgba(0,0,0,0.2); z-index:10000; max-height:200px; overflow-y:auto; min-width:140px; font-size:11px;';

    const rect = buttonEl.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom + 2}px`;

    // Show items in reverse order (most recent first)
    for (let i = stack.length - 1; i >= 0; i--) {
        const entry = stack[i];
        const item = document.createElement('div');
        item.style.cssText = 'padding:4px 8px; cursor:pointer; border-bottom:1px solid #eee;';
        const num = stack.length - i;
        item.textContent = `${num}. ${entry.type}`;
        item.title = `${labelPrefix} to this point (${num} step${num > 1 ? 's' : ''})`;
        item.addEventListener('mouseenter', () => item.style.background = '#e8f0fe');
        item.addEventListener('mouseleave', () => item.style.background = 'white');
        const stepsToUndo = stack.length - i;
        item.addEventListener('click', () => {
            dropdown.remove();
            cleanup();
            for (let j = 0; j < stepsToUndo; j++) {
                actionFn();
            }
        });
        dropdown.appendChild(item);
    }

    document.body.appendChild(dropdown);

    const closeHandler = (ev) => {
        if (!dropdown.contains(ev.target)) {
            dropdown.remove();
            cleanup();
        }
    };
    const escHandler = (ev) => {
        if (ev.key === 'Escape') {
            dropdown.remove();
            cleanup();
        }
    };
    const cleanup = () => {
        document.removeEventListener('click', closeHandler);
        document.removeEventListener('keydown', escHandler);
    };

    // Close on click outside or Escape key
    setTimeout(() => {
        document.addEventListener('click', closeHandler);
        document.addEventListener('keydown', escHandler);
    }, 0);
}

function deleteSequence(index) {
    if (state.seqs.length === 1) {
        showMessage("Cannot delete the last sequence.", 3000);
        return;
    }
    if (confirm('Delete this sequence?')) {
        pushUndo('delete');
        state.seqs.splice(index, 1);
        state.selectedRows.clear();
        renderAlignment();
        showMessage("Sequence deleted!", 2000);
    }
}
let contextMenu = null;
let contextMenuHighlightedRow = null;

function closeContextMenu() {
    if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
    }
    // Remove highlight
    if (contextMenuHighlightedRow !== null) {
        document.querySelectorAll(`.seq-line[data-seq-index="${contextMenuHighlightedRow}"]`)
            .forEach(line => line.classList.remove('context-menu-highlight'));
        contextMenuHighlightedRow = null;
    }
}

function showContextMenu(e, index) {
    closeContextMenu();

    // Highlight the sequence this menu is for
    contextMenuHighlightedRow = index;
    document.querySelectorAll(`.seq-line[data-seq-index="${index}"]`)
        .forEach(line => line.classList.add('context-menu-highlight'));

    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';

    // Temporarily position off-screen to measure height
    contextMenu.style.visibility = 'hidden';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    const copyFastaGapped = document.createElement('div');
    copyFastaGapped.textContent = 'Copy as FASTA gapped';
    copyFastaGapped.addEventListener('click', () => {
        copySequences(true, true, index);
        closeContextMenu();
    });
    const copyFastaUngapped = document.createElement('div');
    copyFastaUngapped.textContent = 'Copy as FASTA ungapped';
    copyFastaUngapped.addEventListener('click', () => {
        copySequences(false, true, index);
        closeContextMenu();
    });
    const copyPlainGapped = document.createElement('div');
    copyPlainGapped.textContent = 'Copy as plain text gapped';
    copyPlainGapped.addEventListener('click', () => {
        copySequences(true, false, index);
        closeContextMenu();
    });
    const copyPlainUngapped = document.createElement('div');
    copyPlainUngapped.textContent = 'Copy as plain text ungapped';
    copyPlainUngapped.addEventListener('click', () => {
        copySequences(false, false, index);
        closeContextMenu();
    });
    contextMenu.appendChild(copyFastaGapped);
    contextMenu.appendChild(copyFastaUngapped);
    contextMenu.appendChild(copyPlainGapped);
    contextMenu.appendChild(copyPlainUngapped);

    // Add color-specific copy options if this sequence has a color
    const seqName = state.seqs[index].header;
    if (colourState.mappings.has(seqName)) {
        const separator1 = document.createElement('div');
        separator1.style.borderTop = '1px solid #ccc';
        separator1.style.margin = '4px 0';
        contextMenu.appendChild(separator1);

        const colour = colourState.mappings.get(seqName);
        const colorLabel = document.createElement('div');
        colorLabel.textContent = `Color: ${colour}`;
        colorLabel.style.fontSize = '11px';
        colorLabel.style.color = '#666';
        colorLabel.style.padding = '2px 0';
        contextMenu.appendChild(colorLabel);

        const copySameColorGapped = document.createElement('div');
        copySameColorGapped.textContent = 'Copy this color (gapped)';
        copySameColorGapped.addEventListener('click', () => {
            copySequencesByColor(colour, true, true);
            closeContextMenu();
        });

        const copySameColorUngapped = document.createElement('div');
        copySameColorUngapped.textContent = 'Copy this color (ungapped)';
        copySameColorUngapped.addEventListener('click', () => {
            copySequencesByColor(colour, false, true);
            closeContextMenu();
        });

        contextMenu.appendChild(copySameColorGapped);
        contextMenu.appendChild(copySameColorUngapped);
    }

    // ---- Edit section ----
    const sepEdit = document.createElement('div');
    sepEdit.style.borderTop = '1px solid #ccc';
    sepEdit.style.margin = '4px 0';
    contextMenu.appendChild(sepEdit);

    // Edit in Sequence Editor
    const seqEditItem = document.createElement('div');
    seqEditItem.textContent = 'Edit Sequence...';
    seqEditItem.addEventListener('click', () => {
        openSeqEditor(index);
        closeContextMenu();
    });
    contextMenu.appendChild(seqEditItem);

    if (state.selectedRows.size <= 1) {
        const renameItem = document.createElement('div');
        renameItem.textContent = 'Rename sequence';
        renameItem.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = state.seqs[index].header;
            input.style.width = `${e.target.offsetWidth}px`;
            input.style.fontSize = getComputedStyle(e.target).fontSize;
            input.style.fontFamily = getComputedStyle(e.target).fontFamily;
            input.style.padding = '0';
            input.style.border = '1px solid #ccc';
            e.target.innerHTML = '';
            e.target.appendChild(input);
            input.focus();
            input.select();
            const save = () => {
                const newName = input.value.trim();
                if (newName && newName !== state.seqs[index].header) {
                    pushUndo('rename');
                    state.seqs[index].header = newName;
                    state.seqs[index].fullHeader = newName;
                    renderAlignment();
                    showMessage("Sequence renamed!", 2000);
                } else {
                    renderAlignment();
                }
            };
            input.addEventListener('blur', save);
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    save();
                } else if (ev.key === 'Escape') {
                    renderAlignment();
                }
            });
            closeContextMenu();
        });
        contextMenu.appendChild(renameItem);
    }

    // Add "Replace / Add consensus" if multiple sequences selected
    if (state.selectedRows.size >= 2) {
        const replaceConsensusItem = document.createElement('div');
        replaceConsensusItem.textContent = `Replace ${state.selectedRows.size} selected with consensus`;
        replaceConsensusItem.addEventListener('click', () => {
            replaceSelectedWithConsensus();
            closeContextMenu();
        });
        contextMenu.appendChild(replaceConsensusItem);

        const addConsensusItem = document.createElement('div');
        addConsensusItem.textContent = `Add consensus below (${state.selectedRows.size} selected)`;
        addConsensusItem.addEventListener('click', () => {
            insertGroupConsensus();
            closeContextMenu();
        });
        contextMenu.appendChild(addConsensusItem);
    }

    const deleteItem = document.createElement('div');
    deleteItem.textContent = state.selectedRows.size > 1 ? 'Delete selected' : 'Delete sequence';
    deleteItem.addEventListener('click', () => {
        if (state.selectedRows.size > 1) {
            deleteSelected();
        } else {
            deleteSequence(index);
        }
        closeContextMenu();
    });
    contextMenu.appendChild(deleteItem);

    const clearSelItem = document.createElement('div');
    clearSelItem.textContent = 'Clear selection';
    clearSelItem.addEventListener('click', () => {
        state.selectedRows.clear();
        state.selectedColumns.clear();
        state.selectedNucs.clear();
        state.pendingNucStart = null;
        updateRowSelections();
        updateColumnSelections();
        scheduleNucSelectionRefresh();
        closeContextMenu();
    });
    contextMenu.appendChild(clearSelItem);

    // ---- Movement section ----
    const sepMovement = document.createElement('div');
    sepMovement.style.borderTop = '1px solid #ccc';
    sepMovement.style.margin = '4px 0';
    contextMenu.appendChild(sepMovement);

    // Move to Top
    const moveTopItem = document.createElement('div');
    moveTopItem.textContent = 'Move to Top';
    moveTopItem.addEventListener('click', () => {
        if (!state.selectedRows.has(index)) {
            state.selectedRows.clear();
            state.selectedRows.add(index);
        }
        moveSelectedToTop();
        closeContextMenu();
    });
    contextMenu.appendChild(moveTopItem);

    // Move to Bottom
    const moveBottomItem = document.createElement('div');
    moveBottomItem.textContent = 'Move to Bottom';
    moveBottomItem.addEventListener('click', () => {
        if (!state.selectedRows.has(index)) {
            state.selectedRows.clear();
            state.selectedRows.add(index);
        }
        moveSelectedToBottom();
        closeContextMenu();
    });
    contextMenu.appendChild(moveBottomItem);

    // ---- Gap tools (on nucleotide click) ----
    if (e.target.tagName === 'SPAN' && e.target.parentNode.className === 'seq-data') {
        const pos = parseInt(e.target.dataset.pos);
        const sepGap = document.createElement('div');
        sepGap.style.borderTop = '1px solid #ccc';
        sepGap.style.margin = '4px 0';
        contextMenu.appendChild(sepGap);

        const insertGapItem = document.createElement('div');
        insertGapItem.textContent = 'Insert Single Gap Here';
        insertGapItem.addEventListener('click', () => {
            insertSingleGap(index, pos);
            closeContextMenu();
        });
        contextMenu.appendChild(insertGapItem);

        const removeGapItem = document.createElement('div');
        removeGapItem.textContent = 'Remove Single Gap Here';
        removeGapItem.addEventListener('click', () => {
            removeSingleGap(index, pos);
            closeContextMenu();
        });
        contextMenu.appendChild(removeGapItem);
    }

    // ---- Analysis tools ----
    if (state.selectedRows.size <= 1) {
        const sepAnalysis = document.createElement('div');
        sepAnalysis.style.borderTop = '1px solid #ccc';
        sepAnalysis.style.margin = '4px 0';
        contextMenu.appendChild(sepAnalysis);

        const blastItem = document.createElement('div');
        blastItem.textContent = 'BLAST Search';
        blastItem.addEventListener('click', () => {
            const seqData = state.seqs[index];
            const ungappedSeq = seqData.seq.replace(/-/g, '');
            showBlastDialog(seqData.header, ungappedSeq);
            closeContextMenu();
        });
        contextMenu.appendChild(blastItem);

        // Re-align against consensus
        const realignItem = document.createElement('div');
        realignItem.textContent = 'Re-align against consensus';
        realignItem.addEventListener('click', () => {
            realignSequenceAgainstConsensus(index);
            closeContextMenu();
        });
        contextMenu.appendChild(realignItem);

        // Dot-plot self
        const dotSelfItem = document.createElement('div');
        dotSelfItem.textContent = 'Dot-plot (self)';
        dotSelfItem.addEventListener('click', () => {
            const s = state.seqs[index];
            const ungapped = s.seq.replace(/[-. ]/g, '');
            openDotPlot(ungapped, ungapped, s.header, s.header, {
                rowIndexA: index,
                rowIndexB: index,
                alignedSeqA: s.seq,
                alignedSeqB: s.seq
            });
            closeContextMenu();
        });
        contextMenu.appendChild(dotSelfItem);

        // Repeat/TSD finder
        const repeatItem = document.createElement('div');
        repeatItem.textContent = 'Find repeats';
        repeatItem.addEventListener('click', () => {
            openRepeatFinder(index);
            closeContextMenu();
        });
        contextMenu.appendChild(repeatItem);
    }

    // Dot-plot between two selected sequences
    if (state.selectedRows.size === 2) {
        const dotPairItem = document.createElement('div');
        const selIndices = Array.from(state.selectedRows).sort((a, b) => a - b);
        dotPairItem.textContent = `Dot-plot (${state.seqs[selIndices[0]].header} vs ${state.seqs[selIndices[1]].header})`;
        dotPairItem.addEventListener('click', () => {
            const sA = state.seqs[selIndices[0]];
            const sB = state.seqs[selIndices[1]];
            openDotPlot(sA.seq.replace(/[-. ]/g, ''), sB.seq.replace(/[-. ]/g, ''), sA.header, sB.header, {
                rowIndexA: selIndices[0],
                rowIndexB: selIndices[1],
                alignedSeqA: sA.seq,
                alignedSeqB: sB.seq
            });
            closeContextMenu();
        });
        contextMenu.appendChild(dotPairItem);
    }

    document.body.appendChild(contextMenu);

    // Adjust position if menu would overflow viewport
    const menuRect = contextMenu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Check vertical overflow
    if (menuRect.bottom > viewportHeight) {
        // Position above the cursor instead
        const newTop = e.pageY - menuRect.height;
        contextMenu.style.top = `${Math.max(0, newTop)}px`;
    }

    // Check horizontal overflow
    if (menuRect.right > viewportWidth) {
        // Position to the left of the cursor instead
        const newLeft = e.pageX - menuRect.width;
        contextMenu.style.left = `${Math.max(0, newLeft)}px`;
    }

    // Make visible after positioning
    contextMenu.style.visibility = 'visible';

    // Close menu when clicking outside
    const closeOnClickOutside = (event) => {
        if (contextMenu && !contextMenu.contains(event.target)) {
            contextMenu.remove();
            // Remove highlight when menu closes
            if (contextMenuHighlightedRow !== null) {
                document.querySelectorAll(`.seq-line[data-seq-index="${contextMenuHighlightedRow}"]`)
                    .forEach(line => line.classList.remove('context-menu-highlight'));
                contextMenuHighlightedRow = null;
            }
            document.removeEventListener('click', closeOnClickOutside);
        }
    };
    // Use setTimeout to avoid immediate closure from the same click that opened the menu
    setTimeout(() => {
        document.addEventListener('click', closeOnClickOutside);
    }, 0);
}

function updateRowSelections() {
    document.querySelectorAll('.seq-line.selected').forEach(line => line.classList.remove('selected'));
    document.querySelectorAll('.seq-name.selected').forEach(name => name.classList.remove('selected'));
    state.selectedRows.forEach(index => {
        document.querySelectorAll(`.seq-line[data-seq-index="${index}"]`).forEach(line => line.classList.add('selected'));
        document.querySelectorAll(`.seq-name[data-seq-index="${index}"]`).forEach(name => name.classList.add('selected'));
    });
}
function updateColumnSelections() {
    state.domSelectedColumns.forEach(spanSet => {
        spanSet.forEach(span => span.classList.remove('column-selected'));
    });
    state.domSelectedColumns = new Map();
    state.selectedColumns.forEach(pos => {
        const spanSet = new Set();
        forEachColumnSpan(pos, span => {
            span.classList.add('column-selected');
            spanSet.add(span);
        });
        if (spanSet.size > 0) {
            state.domSelectedColumns.set(pos, spanSet);
        }
    });
}

let pendingNucDomUpdate = false;

function detachNucSelectedHandlers(span) {
    if (span.dataset.nucSelectedBound !== '1') return;
    const handlers = span._nucSelectedHandlers;
    if (handlers) {
        span.removeEventListener('mouseover', handlers.mouseover);
        span.removeEventListener('mouseout', handlers.mouseout);
        span.removeEventListener('click', handlers.click);
    }
    delete span._nucSelectedHandlers;
    delete span.dataset.nucSelectedBound;
}

function detachNucPendingHandlers(span) {
    if (span.dataset.nucPendingBound !== '1') return;
    const handlers = span._nucPendingHandlers;
    if (handlers) {
        span.removeEventListener('mouseover', handlers.mouseover);
        span.removeEventListener('mouseout', handlers.mouseout);
    }
    delete span._nucPendingHandlers;
    delete span.dataset.nucPendingBound;
}

function attachNucSelectedHandlers(span) {
    if (span.dataset.nucSelectedBound === '1') return;
    const mouseover = () => {
        showTooltipAt('Copy', span);
    };
    const mouseout = () => {
        hideTooltip();
    };
    const click = (event) => {
        event.stopPropagation();
        event.preventDefault();
        copySelected();
    };
    span.addEventListener('mouseover', mouseover);
    span.addEventListener('mouseout', mouseout);
    span.addEventListener('click', click);
    span.dataset.nucSelectedBound = '1';
    span._nucSelectedHandlers = { mouseover, mouseout, click };
}

function attachNucPendingHandlers(span) {
    if (span.dataset.nucPendingBound === '1') return;
    const mouseover = () => {
        showTooltipAt('Selection start - Ctrl+click another nucleotide to complete range', span);
    };
    const mouseout = () => {
        hideTooltip();
    };
    span.addEventListener('mouseover', mouseover);
    span.addEventListener('mouseout', mouseout);
    span.dataset.nucPendingBound = '1';
    span._nucPendingHandlers = { mouseover, mouseout };
}

function refreshNucleotideSelectionsImmediate() {
    const container = alignmentContainer;
    if (!container) return;
    const desiredSelections = state.selectedNucs;

    // Remove selections that are no longer desired
    for (const [row, posMap] of Array.from(state.domSelectedNucs.entries())) {
        const desiredSet = desiredSelections.get(row);
        if (!desiredSet || desiredSet.size === 0) {
            for (const [pos, span] of Array.from(posMap.entries())) {
                span.classList.remove('nuc-selected');
                detachNucSelectedHandlers(span);
                posMap.delete(pos);
            }
            state.domSelectedNucs.delete(row);
            continue;
        }
        for (const [pos, span] of Array.from(posMap.entries())) {
            if (!desiredSet.has(pos)) {
                span.classList.remove('nuc-selected');
                detachNucSelectedHandlers(span);
                posMap.delete(pos);
            }
        }
        if (posMap.size === 0) {
            state.domSelectedNucs.delete(row);
        }
    }

    // Add new selections
    desiredSelections.forEach((posSet, row) => {
        posSet.forEach(pos => {
            if (!state.domSelectedNucs.get(row)?.has(pos)) {
                const span = getSpanElement(row, pos);
                if (!span) return;
                span.classList.add('nuc-selected');
                attachNucSelectedHandlers(span);
                let rowMap = state.domSelectedNucs.get(row);
                if (!rowMap) {
                    rowMap = new Map();
                    state.domSelectedNucs.set(row, rowMap);
                }
                rowMap.set(pos, span);
            }
        });
    });

    // Update pending indicator
    if (state.domPendingNuc) {
        const { span } = state.domPendingNuc;
        span.classList.remove('nuc-pending');
        detachNucPendingHandlers(span);
        state.domPendingNuc = null;
    }
    if (state.pendingNucStart) {
        const { row, pos } = state.pendingNucStart;
        const span = getSpanElement(row, pos);
        if (span && !span.classList.contains('nuc-selected')) {
            span.classList.add('nuc-pending');
            attachNucPendingHandlers(span);
            state.domPendingNuc = { row, pos, span };
        }
    }
}

function scheduleNucSelectionRefresh() {
    if (pendingNucDomUpdate) return;
    pendingNucDomUpdate = true;
    const raf = (typeof window !== 'undefined' && window.requestAnimationFrame)
        ? window.requestAnimationFrame.bind(window)
        : (cb) => setTimeout(cb, 16);
    raf(() => {
        pendingNucDomUpdate = false;
        refreshNucleotideSelectionsImmediate();
    });
}
// EVENT LISTENERS
function initializeAppUI() {
    // This function is called once the DOM is fully loaded.

    updateVersionIndicator();
    checkSshServer();

    // SSH fetch: Enter key and button
    const sshPathInput = document.getElementById('sshPathInput');
    const sshLoadButton = document.getElementById('sshLoadButton');
    const checkQueueButton = document.getElementById('checkQueueButton');
    if (sshPathInput) {
        sshPathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const serverKey = getSelectedServer();
                fetchFileFromServer(sshPathInput.value, serverKey);
            }
        });
    }
    if (sshLoadButton) {
        sshLoadButton.addEventListener('click', () => {
            const serverKey = getSelectedServer();
            fetchFileFromServer(document.getElementById('sshPathInput')?.value, serverKey);
        });
    }
    if (checkQueueButton) {
        checkQueueButton.addEventListener('click', () => {
            checkMCQueueOnce();
        });
    }

    const snapshotPathInput = document.getElementById('snapshotPathInput');
    if (snapshotPathInput) {
        snapshotPathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                openSnapshotFromManualPath();
            }
        });
    }
    refreshSnapshotList(true);

    // Initialize source info
    el('sourceInfo').innerHTML = 'No file loaded';
    initSourceInfoInteractions();

    // Initialize collapsible sections
    try {
        initializeCollapsibleSections();
        restoreCollapsedState();
    } catch (err) {
        console.warn('Failed to initialize collapsible sections', err);
    }

    // No longer needed - hover handles all menu display
    setTimeout(() => {
        try {
            // Clear any inline styles that might interfere with hover
            document.querySelectorAll('.control-group').forEach(group => {
                group.style.maxHeight = '';
                group.style.display = '';
            });
        } catch (err) {
            console.warn('Failed to clear menu styles', err);
        }
    }, 50);

    // Use existing global DOM element references
    let contextMenu = null;

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--dropzone-hover-border)';
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = 'var(--dropzone-border)';
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--dropzone-border)';
            const file = e.dataTransfer.files[0];
            if (!file) return;
            state.currentFilename = file.name;
            state.currentFilePath = '';

            // Auto-detect BAM
            if (/\.(bam|sam)$/i.test(file.name) && state.seqs && state.seqs.length > 0) {
                handleBamFile({ target: { files: [file], value: '' } });
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                fastaInput.value = e.target.result;
                parseAndRender(true);
            };
            reader.onerror = () => {
                alignmentContainer.innerHTML = '<div class="error-message">Ã¢ÂÅ’ Error reading file.</div>';
                showMessage("Error reading file.", 5000);
            };
            reader.readAsText(file);
        });
        dropZone.addEventListener('click', (e) => {
            if (window.getSelection().toString()) return;
            const fileInput = el('fileInput');
            fileInput.value = '';
            fileInput.click();
        });
    }

    el('fileInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        state.currentFilename = file.name;
        state.currentFilePath = '';

        // Auto-detect BAM: if reference already loaded and file is .bam/.sam
        const isBam = /\.(bam|sam)$/i.test(file.name);
        console.log('BAM auto-detect:', { name: file.name, isBam, hasSeqs: !!(state.seqs && state.seqs.length > 0) });
        if (isBam && state.seqs && state.seqs.length > 0) {
            handleBamFile({ target: { files: [file], value: '' } });
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            fastaInput.value = evt.target.result;
            parseAndRender(true);
        };
        reader.onerror = () => {
            alignmentContainer.innerHTML = '<div class="error-message">Ã¢ÂÅ’ Error reading file.</div>';
            showMessage("Error reading file.", 5000);
        };
        reader.readAsText(file);
    });

    fastaInput?.addEventListener('paste', () => {
        setTimeout(() => {
            parseAndRender(false);
        }, 100);
    });

    // Attach listeners to all buttons
    const buttonActions = {
        'clearButton': () => fastaInput.value = '',
        'loadButton': () => parseAndRender(false),
        'reverseComplementButton': reverseComplementSelected,
        'copySelectedButton': copySelected,
        'copyAlignmentButton': copyAlignment,
        'deleteSelectedButton': deleteSelected,
        'undoButton': undoDelete,
        'redoButton': redoAction,
        'seqEditButton': () => openSeqEditor(),
        'seqEditCloseBtn': closeSeqEditor,
        'seqEditCancelBtn': closeSeqEditor,
        'seqEditApplyBtn': seqEditApply,
        'seqEditDegap': seqEditDegap,
        'seqEditReverse': seqEditReverse,
        'seqEditComplement': seqEditComplement,
        'seqEditRevComp': seqEditRevComp,
        'seqEditUppercase': seqEditUppercase,
        'seqEditLowercase': seqEditLowercase,
        'moveUpButton': moveSelectedUp,
        'moveDownButton': moveSelectedDown,
        'moveToTopButton': moveSelectedToTop,
        'moveToBottomButton': moveSelectedToBottom,
        'insertGroupConsensusButton': insertGroupConsensus,
        'duplicateButton': duplicateSelected,
        'openInNewTabButton': openSelectedInNewTab,
        'buildTreeButton': openTreeBuilder,
        'statsButton': openStats,
        'repeatFinderMenuButton': openRepeatFinder,
        'statsCloseBtn': closeStats,
        'treeBuilderCloseBtn': closeTreeBuilder,
        'treeCopyNewickBtn': copyTreeNewick,
        'treeDownloadNewickBtn': downloadTreeNewick,
        'selectAllButton': selectAllSequences,
        'copyColumnsButton': copySelectedColumns,
        'realignBlockButton': realignSelectedBlock,
        'realignAllButton': realignAll,
        'realignSelectedButton': realignSelected,
        'addSequencesButton': openAddSequencesModal,
        'addSeqPlusButton': openAddSequencesModal,
        'blockSizeScreenBtn': setBlockSizeToScreen,
        'addSeqJustAddButton': addSequencesJustAdd,
        'addSeqSubmitButton': addSequencesAndAlign,
        'addSeqCancelButton': closeAddSequencesModal,
        'clusterNowButton': clusterSequences,
        'previewTrimButton': previewTrimming,
        'executeTrimButton': executeTrimming,
        'undoTrimButton': undoTrimming,
        'clearSoftTrimButton': clearSoftTrimming,
        'clusteringSavePresetButton': saveClusteringPreset,
        'clusteringLoadPresetButton': loadClusteringPreset,
        'clusteringOptimalPresetButton': createOptimalPreset,
        'savePresetButton': savePreset,
        'loadPresetButton': loadPreset,
        'snapshotCreateTopButton': createSnapshot,
        'exportSvgTopButton': exportVisibleViewportAsSvg,
        'exportRtfButton': exportAlignmentAsRtf,
        'exportSvgFullTopButton': exportFullAlignmentAsSvg,
        'snapshotRefreshButton': refreshSnapshotList,
        'snapshotOpenButton': openSelectedSnapshotFromInputMenu,
        'snapshotPathOpenButton': openSnapshotFromManualPath,
        'infoButton': openInfoModal,
        'hotkeysIconBtn': () => {
            openInfoModal();
            const tip = document.getElementById('hotkeysTooltip');
            if (tip) tip.style.display = 'none';
        },
        'minimizeBtn': minimizeMenu,
        'zoomInButton': () => adjustZoom(10),
        'zoomOutButton': () => adjustZoom(-10),
        'searchButton': searchMotif,
        'clearLastSearchButton': clearLastSearch,
        'clearAllSearchesButton': clearAllSearches,
        'copyConsensusButton': copyConsensus,
        'copySelectedConsensusButton': copySelectedConsensus,
        'degapBlockLeftButton': () => degapSelectedBlock('left'),
        'degapBlockRightButton': () => degapSelectedBlock('right')
    };

    for (const id in buttonActions) {
        el(id)?.addEventListener('click', buttonActions[id]);
    }

    // Hotkeys icon hover tooltip
    const hotkeysBtn = el('hotkeysIconBtn');
    const hotkeysTip = el('hotkeysTooltip');
    if (hotkeysBtn && hotkeysTip) {
        let hideTimer = null;
        hotkeysBtn.addEventListener('mouseenter', () => {
            clearTimeout(hideTimer);
            hotkeysTip.style.display = 'block';
            const rect = hotkeysBtn.getBoundingClientRect();
            hotkeysTip.style.top = (rect.bottom + 4) + 'px';
            hotkeysTip.style.left = Math.min(rect.left, window.innerWidth - 310) + 'px';
        });
        hotkeysBtn.addEventListener('mouseleave', () => {
            hideTimer = setTimeout(() => { hotkeysTip.style.display = 'none'; }, 300);
        });
        hotkeysTip.addEventListener('mouseenter', () => clearTimeout(hideTimer));
        hotkeysTip.addEventListener('mouseleave', () => { hotkeysTip.style.display = 'none'; });
    }

    initializeGeneDocEditToolbar();

    // Click outside to close Add Sequences modal
    const addSeqModal = document.getElementById('addSeqModal');
    if (addSeqModal) {
        addSeqModal.addEventListener('click', (e) => {
            if (e.target === addSeqModal) closeAddSequencesModal();
        });
    }

    const treeBuilderModal = document.getElementById('treeBuilderModal');
    if (treeBuilderModal) {
        treeBuilderModal.addEventListener('click', (e) => {
            if (e.target === treeBuilderModal) closeTreeBuilder();
        });
    }

    // Click outside to close SeqEdit modal
    const seqEditModal = document.getElementById('seqEditModal');
    if (seqEditModal) {
        seqEditModal.addEventListener('click', (e) => {
            if (e.target === seqEditModal) closeSeqEditor();
        });
    }

    // SeqEdit textarea: update length on input
    const seqEditTextarea = document.getElementById('seqEditTextarea');
    if (seqEditTextarea) {
        seqEditTextarea.addEventListener('input', _updateSeqEditLength);
                seqEditTextarea.addEventListener('input', _seqEditPushUndo);
        seqEditTextarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault(); _seqEditUndo();
            } else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault(); _seqEditRedo();
            }
        });
    }

    // Undo/Redo dropdown buttons
    const undoDropdownBtn = el('undoDropdownBtn');
    if (undoDropdownBtn) {
        undoDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showUndoRedoDropdown(undoDropdownBtn, state.deletedHistory, undoDelete, 'Undo');
        });
    }
    const redoDropdownBtn = el('redoDropdownBtn');
    if (redoDropdownBtn) {
        redoDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showUndoRedoDropdown(redoDropdownBtn, state.redoHistory, redoAction, 'Redo');
        });
    }

    // Initialize clustering preset list
    updateClusteringPresetList();

    // Auto-create and load "optimal" preset as default if not already present
    setTimeout(() => {
        const presets = JSON.parse(localStorage.getItem('clusteringPresets') || '{}');
        if (!presets['optimal']) {
            // Create optimal preset silently
            createOptimalPreset(true);
        } else {
            // Load existing optimal preset
            const presetSelect = el('clusteringPresetList');
            if (presetSelect) {
                presetSelect.value = 'optimal';
                loadClusteringPreset(true);
            }
        }
    }, 100);

    const searchInputEl = el('searchInput');
    if (searchInputEl) {
        searchInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchMotif();
            }
        });
    }
    const reverseQueryButton = el('reverseComplementQueryButton');
    if (reverseQueryButton && searchInputEl) {
        reverseQueryButton.addEventListener('click', () => {
            const raw = searchInputEl.value || '';
            const motif = raw.trim().replace(/\s+/g, '').toUpperCase();
            if (!motif) return;
            searchInputEl.value = reverseComplement(motif);
        });
    }

    minimizeBar?.addEventListener('click', expandMenu);
    el('expandButton')?.addEventListener('click', expandMenu);

    // UI listener wiring
    attachUIListeners();

    // Apply default consensus thresholds
    setConsensusThresholdUI(DEFAULTS.consensusThreshold);
    setGroupConsensusThresholdUI(DEFAULTS.groupConsensusThreshold);
    setNameLengthUI(DEFAULTS.nameLength);

    // Set initial state for controls
    el('modeBlocks').checked = true;
    el('modeSingle').checked = false;
    const topConsensusRadio = document.querySelector('input[name="consensusPosition"][value="top"]');
    if (topConsensusRadio) {
        topConsensusRadio.checked = true;
    }

    // Trigger initial render/setup based on defaults
    onModeChange();
    toggleStickyNames();

    // Ã¢â€â‚¬Ã¢â€â‚¬ Residue case toggle (GeneDoc-style upper/lower/asis) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const caseSel = el('residueCase');
    if (caseSel) {
        const applyCase = () => {
            const v = caseSel.value;
            alignmentContainer.classList.toggle('residue-case-upper', v === 'upper');
            alignmentContainer.classList.toggle('residue-case-lower', v === 'lower');
        };
        caseSel.addEventListener('change', applyCase);
        applyCase();
    }

    updateControlsOffset();
    const controls = el('controls');
    if (controls && typeof ResizeObserver !== 'undefined') {
        const controlsResizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(updateControlsOffset);
        });
        controlsResizeObserver.observe(controls);
    }
    window.addEventListener('resize', () => window.requestAnimationFrame(updateControlsOffset));

    // Initialize slider backgrounds
    ['blackSlider', 'darkSlider', 'lightSlider', 'nameLengthSlider', 'zoomSlider', 'blockSizeSlider', 'consensusThreshold', 'groupConsensusThreshold', 'consensusMinCoverage'].forEach(id => {
        const slider = el(id);
        if (slider) {
            updateSliderBackground(slider);
        }
    });

    // Setup menu stability to prevent flickering on mouse movement
    setupMenuStability();

    // Ã¢â€â‚¬Ã¢â€â‚¬ :has() fallback for Firefox < 121 Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // CSS :has(.control-group:hover) is not supported in Firefox < 121.
    // We add .hover-active class via JS as a fallback.
    if (!CSS.supports('selector(:has(*))')) {
        document.querySelectorAll('.menu-section').forEach(section => {
            const cg = section.querySelector('.control-group');
            if (!cg) return;
            cg.addEventListener('mouseenter', () => openMenuSection(section));
            cg.addEventListener('mouseleave', () => section.classList.remove('hover-active'));
        });
    }

    // Initialize colour seqs feature
    initColourSeqs();

    // Initialize Dot Plot & Repeat Finder modals
    _initDotPlotEvents();    _initRepeatFinderEvents();

    // Ã¢â€â‚¬Ã¢â€â‚¬ URL parameter auto-loading Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // ...

    // Click-outside to close recent dropdown
    document.addEventListener('click', (e) => {
        const dd = document.getElementById('recentDropdown');
        if (!dd || dd.style.display !== 'block') return;
        if (!dd.contains(e.target) && e.target.id !== 'recentButton') {
            dd.style.display = 'none';
        }
    });
    // Supports:
    //   ?url=<relative_or_absolute_url>   - fetch FASTA/MSF from URL
    //   ?data=<base64_encoded_text>        - decode inline data
    //   ?title=<text>                      - optional display title
    const urlParams = new URLSearchParams(window.location.search);
    const autoSnapshot = urlParams.get('snapshot');
    const autoSnapshotFile = urlParams.get('snapshotFile');
    const autoUrl   = urlParams.get('url');
    const autoData  = urlParams.get('data');
    const autoTitle = urlParams.get('title');

    if (autoSnapshotFile) {
        showMessage('Loading snapshot file...', 0);
        fetch(autoSnapshotFile)
            .then(resp => {
                if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
                return resp.json();
            })
            .then(payload => {
                _loadSnapshotPayload(payload);
                showMessage('Snapshot file loaded', 2200);
            })
            .catch(err => {
                console.error('Snapshot file load failed:', err);
                showMessage(`Failed to load snapshot file: ${err.message}`, 5000);
            });
    } else if (autoSnapshot) {
        try {
            const snapshotText = _fromBase64Utf8(autoSnapshot);
            const payload = JSON.parse(snapshotText);
            _loadSnapshotPayload(payload);
            showMessage('Snapshot loaded', 2200);
        } catch (err) {
            console.error('Snapshot load failed:', err);
            showMessage(`Failed to load snapshot: ${err.message}`, 5000);
        }
    } else if (autoUrl) {
        showMessage('Loading alignment from URL...', 0);
        fetch(autoUrl)
            .then(resp => {
                if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
                return resp.text();
            })
            .then(text => {
                const fastaInputEl = el('fastaInput');
                if (fastaInputEl) fastaInputEl.value = text;
                state.currentFilename = autoTitle || autoUrl.split('/').pop() || 'URL';
                parseAndRender(true);
                showMessage('Alignment loaded from URL', 2000);
            })
            .catch(err => {
                console.error('URL auto-load failed:', err);
                showMessage(`Failed to load URL: ${err.message}`, 5000);
            });
    } else if (autoData) {
        try {
            const text = atob(autoData);
            const fastaInputEl = el('fastaInput');
            if (fastaInputEl) fastaInputEl.value = text;
            state.currentFilename = autoTitle || 'Inline data';
            parseAndRender(true);
            showMessage('Alignment loaded from inline data', 2000);
        } catch (err) {
            console.error('Inline data decode failed:', err);
            showMessage(`Failed to decode data: ${err.message}`, 5000);
        }
    }
    // Init Add-Sequences modal Browse button
    initAddSeqBrowse();
    initStatsTabs();
    initTreeBuilderControls();
    initResEnzymeSearch();
}

document.addEventListener('DOMContentLoaded', initializeAppUI);

// UI listener wiring is wrapped in a function so we can attach listeners after DOMContentLoaded
function attachUIListeners() {
    if (state.uiListenersAttached) return;
    state.uiListenersAttached = true;
    // Set up slider/input pairs manually to avoid function reference issues
    const sliderPairs = [
        ['blackSlider', 'blackInput'],
        ['darkSlider', 'darkInput'],
        ['lightSlider', 'lightInput'],
        ['nameLengthSlider', 'nameLengthInput'],
        ['blockSizeSlider', 'blockSizeInput'],
        ['consensusThreshold', 'consensusThresholdInput'],
        ['groupConsensusThreshold', 'groupConsensusThresholdInput'],
        ['consensusMinCoverage', 'consensusMinCoverageInput']
    ];

    sliderPairs.forEach(([sliderId, inputId]) => {
        const slider = el(sliderId);
        const input = el(inputId);
        if (slider && input) {
            const renderCb = debounceRender;
            slider.addEventListener('input', () => {
                if (sliderId === 'consensusThreshold') {
                    const clamped = clampConsensusPercent(slider.value);
                    slider.value = clamped;
                    input.value = clamped;
                } else if (sliderId === 'groupConsensusThreshold') {
                    const clamped = clampGroupConsensusPercent(slider.value);
                    slider.value = clamped;
                    input.value = clamped;
                } else if (sliderId === 'nameLengthSlider') {
                    const clamped = clampNameLength(slider.value);
                    slider.value = clamped;
                    input.value = clamped;
                    document.documentElement.style.setProperty('--nameLen', clamped);
                } else {
                    input.value = slider.value;
                }
                updateSliderBackground(slider);
                if (sliderId.includes('black') || sliderId.includes('dark') || sliderId.includes('light')) {
                    validateThresholds();
                }
                renderCb();
            });

            input.addEventListener('input', () => {
                if (sliderId === 'consensusThreshold') {
                    const clamped = clampConsensusPercent(input.value);
                    slider.value = clamped;
                    input.value = clamped;
                } else if (sliderId === 'groupConsensusThreshold') {
                    const clamped = clampGroupConsensusPercent(input.value);
                    slider.value = clamped;
                    input.value = clamped;
                } else if (sliderId === 'nameLengthSlider') {
                    const clamped = clampNameLength(input.value);
                    slider.value = clamped;
                    input.value = clamped;
                    document.documentElement.style.setProperty('--nameLen', clamped);
                } else if (sliderId === 'consensusMinCoverage') {
                    const clamped = clampMinCoverage(input.value);
                    slider.value = clamped;
                    input.value = clamped;
                } else {
                    slider.value = input.value;
                }
                updateSliderBackground(slider);
                if (inputId.includes('black') || inputId.includes('dark') || inputId.includes('light')) {
                    validateThresholds();
                }
                renderCb();
            });
        }
    });

    // Set up zoom slider (no input pair, just direct handling)
    const zoomSlider = el('zoomSlider');
    if (zoomSlider) {
        zoomSlider.addEventListener('input', debounce(() => {
            setZoomFromSlider();
            updateSliderBackground(zoomSlider);
        }, 50));
    }

    // Set up radio button groups
    const radioGroups = ['shadeMode', 'mode', 'consensusType', 'consensusFallback'];
    // consensusPosition gets a direct (non-debounced) handler for instant feedback
    document.querySelectorAll('input[name="consensusPosition"]').forEach(radio => {
        radio.addEventListener('change', () => renderAlignment());
    });
    radioGroups.forEach(group => {
        document.querySelectorAll(`input[name="${group}"]`).forEach(radio => {
            const handler = group === 'shadeMode' ? onShadeModeChange :
                           group === 'mode' ? onModeChange : debounceRender;
            radio.addEventListener('change', handler);
        });
    });

    // Always-visible top-bar mode switcher (mirrors the canonical mode radios
    // buried in the Display dropdown): clicking it drives the real radio +
    // onModeChange; syncQuickModeSwitch() keeps it reflecting the real state
    // whenever that changes from elsewhere (Display dropdown, auto-switch, etc).
    document.querySelectorAll('#quickModeSwitch input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const target = document.getElementById(radio.dataset.target);
            if (target && !target.checked) {
                target.checked = true;
                onModeChange();
            }
        });
    });
    syncQuickModeSwitch();

    // Set up checkbox listeners
    const checkboxes = ['enableBlack', 'enableDark', 'enableLight', 'showConsensus',
                        'compactDiffOnly', 'compactPairs', 'highlightDiffs', 'varSitesOnly', 'codonAnalysis'];
    checkboxes.forEach(id => {
        const elRef = el(id);
        if (elRef) elRef.addEventListener('change', () => {
            if (id === 'highlightDiffs') {
                document.body.classList.toggle('highlight-diffs', elRef.checked);
            }
            debounceRender();
        });
    });

    const codonCode = el('codonCode');
    if (codonCode) codonCode.addEventListener('change', debounceRender);

    const codonFrame = el('codonFrame');
    if (codonFrame) codonFrame.addEventListener('change', debounceRender);

    const colorSchemeSelect = el('colorSchemeSelect');
    if (colorSchemeSelect) colorSchemeSelect.addEventListener('change', debounceRender);

    const sticky = el('stickyNames');
    if (sticky) sticky.addEventListener('change', toggleStickyNames);

    // Name length "No limit" checkbox
    const noLimit = el('nameLengthNoLimit');
    if (noLimit) {
        noLimit.addEventListener('change', () => {
            const slider = el('nameLengthSlider');
            const input = el('nameLengthInput');
            if (noLimit.checked) {
                if (slider) slider.disabled = true;
                if (input) input.disabled = true;
                state.nameLength = 9999;
                document.documentElement.style.setProperty('--nameLen', '9999');
            } else {
                if (slider) slider.disabled = false;
                if (input) input.disabled = false;
                state.nameLength = parseInt(slider?.value || 50);
                document.documentElement.style.setProperty('--nameLen', state.nameLength);
            }
            debounceRender();
        });
    }

    // Alignment container events (document capture: survives innerHTML clears and
    // always sees reliable modifier state via getModifierState on the mouse event)
    const controls = el('controls');
    if (!state._alignmentPointerBound) {
        state._alignmentPointerBound = true;
        document.addEventListener('mousedown', (e) => {
            const container = document.getElementById('alignmentContainer');
            if (!container || !container.contains(e.target)) return;
            handleColumnSelectMouseDown(e);
        }, true);
        document.addEventListener('mousedown', (e) => {
            const container = document.getElementById('alignmentContainer');
            if (!container || !container.contains(e.target)) return;
            handleGeneDocEditMouseDown(e);
            if (!e.defaultPrevented) handleMouseDown(e);
            handleAlignmentPanStart(e);
        });
        document.addEventListener('mousemove', handleMouseMove);
    }
    if (alignmentContainer) {
        // *** PERFORMANCE: Event delegation for nucleotide tooltips ***
        alignmentContainer.addEventListener('mouseover', (e) => {
            const span = e.target.closest('.seq-data > span[data-pos]');
            if (span) {
                if (state.isDragging && state.dragMode === 'col') return;
                if (isCtrlModifier(e) && isAltModifier(e)) return;
                const pos = parseInt(span.dataset.pos);
                const seqLine = span.closest('.seq-line');
                if (seqLine && !seqLine.classList.contains('consensus-line')) {
                    const seqIdx = parseInt(seqLine.dataset.seqIndex);
                    if (seqIdx !== undefined && state.seqs[seqIdx]) {
                        const base = span.textContent;
                        if (base !== '-' && base !== '.') {
                            const gaplessPos = state.seqs[seqIdx].gaplessPositions[pos];
                            showTooltipAt(`${state.seqs[seqIdx].header}: ${gaplessPos}`, span);
                        }
                    }
                }
            }
        });
        alignmentContainer.addEventListener('mouseout', (e) => {
            if (e.target.matches('.seq-data > span[data-pos]')) {
                hideTooltip();
            }
        });

        alignmentContainer.addEventListener('click', () => {
            // If menu is shown as overlay, hide it when clicking on alignment
            if (controls && controls.style.position === 'fixed' && controls.style.transform !== 'translateY(-100%)') {
                controls.style.transform = 'translateY(-100%)';
                controls.style.position = '';
                controls.style.top = '';
                controls.style.left = '';
                controls.style.right = '';
                controls.style.zIndex = '';
                controls.style.boxShadow = '';
            }
        });
    }

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseup', handleAlignmentPanEnd);
    document.addEventListener('mouseup', _finishRowReorderDrag);
    document.addEventListener('mousemove', handleAlignmentPanMove);
    document.addEventListener('mousemove', _handleRowReorderMove);
    document.addEventListener('contextmenu', handleAlignmentPanContextMenu, true);
    // Use capture phase so shortcuts like Ctrl+H override browser built-ins
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);

    // Use existing global infoModal reference
    document.addEventListener('click', (event) => {
        if (event.target === infoModal) {
            closeInfoModal();
        }
    });

    if (alignmentContainer) {
        let contextMenu = null;
        alignmentContainer.addEventListener('contextmenu', (e) => {
            const name = e.target.closest('.seq-name');
            if (name) {
                e.preventDefault();
                const row = e.target.closest('.seq-line');
                const index = parseInt(row.dataset.seqIndex);
                contextMenu = showContextMenu(e, index, contextMenu);
            } else if (e.target.tagName === 'SPAN' && e.target.parentNode.className === 'seq-data') {
                e.preventDefault();
                const row = e.target.closest('.seq-line');
                const index = parseInt(row.dataset.seqIndex);
                contextMenu = showContextMenu(e, index, contextMenu);
            }
        });
        document.addEventListener('click', () => {
            if (contextMenu) {
                contextMenu.remove();
                contextMenu = null;
            }
        });
    }
}

// Auto-hide menu on scroll
let lastScrollTop = 0;

function setupMenuScrollBehavior() {
    const controls = el('controls');
    if (!controls || !alignmentContainer) return;

    let menuHeight = controls.offsetHeight;

    function updateMenuVisibility() {
        const isHidden = controls.style.transform === 'translateY(-100%)';
        alignmentContainer.style.top = isHidden ? '0' : (menuHeight + 'px');
    }

    alignmentContainer.addEventListener('scroll', () => {
        document.querySelectorAll('.seq-name').forEach(name => {
            name.style.display = 'none';
            name.offsetHeight;
            name.style.display = '';
        });

        if (menuHeight === 0) menuHeight = controls.offsetHeight;

        const scrollTop = alignmentContainer.scrollTop;
        const wasHidden = controls.style.transform === 'translateY(-100%)';

        if (scrollTop > lastScrollTop && scrollTop > 100) {
            controls.style.transform = 'translateY(-100%)';
            Object.assign(controls.style, { position: '', top: '', left: '', right: '', zIndex: '', boxShadow: '' });
        } else if (scrollTop === 0) {
            controls.style.transform = 'translateY(0)';
            Object.assign(controls.style, { position: '', top: '', left: '', right: '', zIndex: '', boxShadow: '' });
        }

        const isHidden = controls.style.transform === 'translateY(-100%)';
        if (wasHidden !== isHidden) {
            updateMenuVisibility();
        }

        lastScrollTop = scrollTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (e.clientY <= 50 && controls.style.transform === 'translateY(-100%)') {
            controls.style.transform = 'translateY(0)';
            Object.assign(controls.style, { position: 'fixed', top: '0', left: '0', right: '0', zIndex: '1000', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' });
        }
    });
}
//setupMenuScrollBehavior();  // Disabled - using setupHoverMenuReveal() instead
setupHoverMenuReveal();
// NEW EDITING FUNCTIONS
const GENEDOC_FILLER = '-';
const GENEDOC_MOVE_TOOLS = new Set(['moveNoGaps', 'slideKeepGaps']);
const GENEDOC_GAP_TOOLS = new Set([
    'insertGapSeq', 'deleteGapSeq',
    'insertGapOther', 'deleteGapOther',
    'insertGapAll', 'deleteGapAll'
]);

function initializeGeneDocEditToolbar() {
    const panel = el('editToolPanel');
    if (panel?.dataset.bound === '1') {
        updateGeneDocEditUI();
        return;
    }
    if (panel) panel.dataset.bound = '1';

    el('editToggleButton')?.addEventListener('click', () => {
        setGeneDocEditMode(!state.editModeActive);
    });

    document.querySelectorAll('#editToolPanel [data-edit-tool]').forEach(button => {
        button.addEventListener('click', () => setGeneDocEditTool(button.dataset.editTool));
    });

    el('editLiveConservationToggle')?.addEventListener('change', (event) => {
        state.editLiveConservation = !!event.target.checked;
    });

    el('editDeleteColumnsButton')?.addEventListener('click', () => deleteSelectedColumns(true));
    el('editClearGapColumnsButton')?.addEventListener('click', removeGapColumns);
    el('editSeqEditorButton')?.addEventListener('click', () => openSeqEditor());

    // Ã¢â€ Â» Cons button uses onclick=_recalcConservation in HTML

    updateGeneDocEditUI();
}

// Global wrapper for inline onclick handler
function _recalcConservation() {
    state.conservationDataCache = null;
    renderAlignment();
    showMessage('Conservation recalculated.', 1500);
}

function setGeneDocEditMode(active) {
    state.editModeActive = !!active;
    if (state.editModeActive && !GENEDOC_MOVE_TOOLS.has(state.editTool) && !GENEDOC_GAP_TOOLS.has(state.editTool) && state.editTool !== 'residue' && state.editTool !== 'selectColumn') {
        state.editTool = 'moveNoGaps';
    }
    if (!state.editModeActive) {
        clearGeneDocEditDrag();
        state.editCell = null;
        // Recalculate conservation on edit mode exit
        state.conservationDataCache = null;
        renderAlignment();
    }
    updateGeneDocEditUI();
    updateEditActiveCell();
    requestAnimationFrame(() => updateControlsOffset());
}

function setGeneDocEditTool(tool) {
    if (!GENEDOC_MOVE_TOOLS.has(tool) && !GENEDOC_GAP_TOOLS.has(tool) && tool !== 'residue' && tool !== 'selectColumn') return;
    state.editTool = tool;
    state.editModeActive = true;
    clearGeneDocEditDrag();
    if (tool !== 'residue') state.editCell = null;
    updateGeneDocEditUI();
    updateEditActiveCell();
    requestAnimationFrame(() => updateControlsOffset());
}

function updateGeneDocEditUI() {
    const toggle = el('editToggleButton');
    const panel = el('editToolPanel');
    if (toggle) {
        toggle.classList.toggle('active', state.editModeActive);
        toggle.setAttribute('aria-pressed', state.editModeActive ? 'true' : 'false');
    }
    if (panel) {
        panel.hidden = !state.editModeActive;
        panel.querySelectorAll('[data-edit-tool]').forEach(button => {
            const active = state.editModeActive && button.dataset.editTool === state.editTool;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }
    const liveConservationToggle = el('editLiveConservationToggle');
    if (liveConservationToggle) {
        liveConservationToggle.checked = !!state.editLiveConservation;
    }
    document.body.classList.toggle('edit-mode-active', state.editModeActive);
    if (state.editModeActive) {
        document.body.dataset.editTool = state.editTool;
    } else {
        delete document.body.dataset.editTool;
    }
}

function updateEditActiveCell() {
    if (state.editActiveSpan) {
        state.editActiveSpan.classList.remove('edit-active-cell');
        state.editActiveSpan = null;
    }
    if (!state.editModeActive || state.editTool !== 'residue' || !state.editCell) return;
    const span = getSpanElement(state.editCell.row, state.editCell.pos);
    if (span) {
        span.classList.add('edit-active-cell');
        state.editActiveSpan = span;
    }
}

function isGeneDocResidueChar(char) {
    return typeof char === 'string' && /^[A-Za-z]$/.test(char.charAt(0));
}

function isGeneDocGapChar(char) {
    return !isGeneDocResidueChar(char);
}

function normalizeAlignmentLengths() {
    if (!state.seqs.length) return 0;
    const len = Math.max(...state.seqs.map(s => s.seq.length));
    state.seqs.forEach(s => {
        if (s.seq.length < len) s.seq = s.seq.padEnd(len, GENEDOC_FILLER);
    });
    return len;
}

function refreshAllGaplessPositions() {
    state.seqs.forEach(s => {
        s.gaplessPositions = calculateGaplessPositions(s.seq);
    });
}

function finalizeGeneDocEdit(message, duration = 1800) {
    normalizeAlignmentLengths();
    refreshAllGaplessPositions();
    renderAlignment();
    if (message) showMessage(message, duration);
}

function countTrailingGeneDocFillers(chars) {
    let count = 0;
    for (let i = chars.length - 1; i >= 0; i--) {
        if (!isGeneDocGapChar(chars[i])) break;
        count++;
    }
    return count;
}

function geneDocInsertDashString(seq, pos) {
    const chars = seq.split('');
    if (pos < 0 || pos >= chars.length) return { seq, changed: false };
    const trailingFillers = countTrailingGeneDocFillers(chars);
    chars.splice(pos, 0, GENEDOC_FILLER);
    if (trailingFillers > 0) chars.pop();
    return { seq: chars.join(''), changed: true };
}

function geneDocDeleteDashString(seq, pos) {
    const chars = seq.split('');
    if (pos < 0 || pos >= chars.length || !isGeneDocGapChar(chars[pos])) {
        return { seq, changed: false };
    }
    chars.splice(pos, 1);
    chars.push(GENEDOC_FILLER);
    return { seq: chars.join(''), changed: true };
}

function geneDocSlideStepString(seq, pos, direction) {
    const chars = seq.split('');
    if (pos < 0 || pos >= chars.length || !isGeneDocResidueChar(chars[pos])) return { seq, moved: 0 };
    if (direction > 0) {
        const result = geneDocInsertDashString(seq, pos);
        return { seq: result.seq, moved: result.changed ? 1 : 0 };
    }
    // Left: scan for any gap to the left (not just immediately adjacent)
    let gapPos = -1;
    for (let i = pos - 1; i >= 0; i--) {
        if (isGeneDocGapChar(chars[i])) { gapPos = i; break; }
    }
    if (gapPos === -1) return { seq, moved: 0 };
    chars.splice(gapPos, 1);
    chars.push(GENEDOC_FILLER);
    return { seq: chars.join(''), moved: -1 };
}

function geneDocMoveStepString(seq, pos, direction) {
    const chars = seq.split('');
    if (pos < 0 || pos >= chars.length || !isGeneDocResidueChar(chars[pos])) return { seq, moved: 0 };
    if (direction > 0) {
        let runEnd = pos;
        while (runEnd < chars.length && isGeneDocResidueChar(chars[runEnd])) runEnd++;
        if (runEnd < chars.length) {
            for (let i = runEnd; i > pos; i--) {
                chars[i] = chars[i - 1];
            }
            chars[pos] = GENEDOC_FILLER;
        } else {
            chars.splice(pos, 0, GENEDOC_FILLER);
        }
        return { seq: chars.join(''), moved: 1 };
    }
    if (pos === 0 || !isGeneDocGapChar(chars[pos - 1])) return { seq, moved: 0 };
    let target = pos - 1;
    for (let source = pos; source < chars.length; source++) {
        if (isGeneDocResidueChar(chars[source])) {
            chars[target++] = chars[source];
        }
    }
    while (target < chars.length) {
        chars[target++] = GENEDOC_FILLER;
    }
    return { seq: chars.join(''), moved: -1 };
}

function geneDocMoveLeftString(seq, pos, amount) {
    const chars = seq.split('');
    if (amount <= 0 || pos < 0 || pos >= chars.length || !isGeneDocResidueChar(chars[pos])) {
        return { seq, moved: 0 };
    }

    let remaining = amount;
    let moved = 0;
    let start = pos;
    for (let scan = pos - 1; scan >= 0 && remaining > 0; scan--) {
        if (isGeneDocGapChar(chars[scan])) {
            remaining--;
            moved++;
            start = scan;
        }
    }
    if (moved === 0) return { seq, moved: 0 };

    const residues = [];
    for (let i = start; i <= pos; i++) {
        if (isGeneDocResidueChar(chars[i])) residues.push(chars[i]);
    }

    let write = start;
    residues.forEach(char => {
        chars[write++] = char;
    });
    while (write <= pos) {
        chars[write++] = GENEDOC_FILLER;
    }

    return { seq: chars.join(''), moved: -moved };
}

function geneDocMoveTextString(seq, pos, amount) {
    if (amount === 0) return { seq, moved: 0 };
    if (amount < 0) return geneDocMoveLeftString(seq, pos, -amount);

    let currentSeq = seq;
    let currentPos = pos;
    let movedTotal = 0;
    for (let i = 0; i < amount; i++) {
        const result = geneDocMoveStepString(currentSeq, currentPos, 1);
        if (!result.moved) break;
        currentSeq = result.seq;
        currentPos += result.moved;
        movedTotal += result.moved;
    }
    return { seq: currentSeq, moved: movedTotal };
}

function geneDocSlideTextString(seq, pos, amount) {
    if (amount === 0) return { seq, moved: 0 };
    const direction = Math.sign(amount);
    let currentSeq = seq;
    let currentPos = pos;
    let movedTotal = 0;
    for (let i = 0; i < Math.abs(amount); i++) {
        const result = geneDocSlideStepString(currentSeq, currentPos, direction);
        if (!result.moved) break;
        currentSeq = result.seq;
        currentPos += result.moved;
        movedTotal += result.moved;
    }
    return { seq: currentSeq, moved: movedTotal };
}

function canGeneDocMove(rowIndex, pos, direction, tool) {
    const seq = state.seqs[rowIndex]?.seq || '';
    if (pos < 0 || pos >= seq.length || !isGeneDocResidueChar(seq[pos])) return false;
    if (direction > 0) return true;
    if (tool === 'moveNoGaps') {
        for (let scan = pos - 1; scan >= 0; scan--) {
            if (isGeneDocGapChar(seq[scan])) return true;
        }
        return false;
    }
    if (tool === 'slideKeepGaps') {
        // Slide Keep Gaps: any gap to the left is consumable
        for (let scan = pos - 1; scan >= 0; scan--) {
            if (isGeneDocGapChar(seq[scan])) return true;
        }
        return false;
    }
    return pos > 0 && isGeneDocGapChar(seq[pos - 1]);
}

function applyGeneDocMoveAmount(rowIndex, pos, amount, tool) {
    const s = state.seqs[rowIndex];
    if (!s) return 0;
    const result = tool === 'slideKeepGaps'
        ? geneDocSlideTextString(s.seq, pos, amount)
        : geneDocMoveTextString(s.seq, pos, amount);
    if (result.moved) s.seq = result.seq;
    return result.moved;
}

function getGeneDocCharWidth(span) {
    const rect = span.getBoundingClientRect();
    if (rect.width > 0) return rect.width;
    const fontSize = parseFloat(getComputedStyle(span).fontSize) || 13;
    return Math.max(6, fontSize * 0.62);
}

function handleGeneDocEditMouseDown(e) {
    if (!state.editModeActive || e.button !== 0) return;
    const span = e.target.closest?.('.seq-data > span[data-pos]');
    if (!span) return;
    const seqLine = span.closest('.seq-line');
    if (!seqLine || seqLine.classList.contains('consensus-line') || seqLine.classList.contains('scale-ruler-line')) return;
    const rowIndex = parseInt(seqLine.dataset.seqIndex, 10);
    const pos = parseInt(span.dataset.pos, 10);
    if (!Number.isInteger(rowIndex) || !Number.isInteger(pos) || !state.seqs[rowIndex]) return;

    const tool = state.editTool;
    if (!GENEDOC_MOVE_TOOLS.has(tool) && !GENEDOC_GAP_TOOLS.has(tool) && tool !== 'residue' && tool !== 'selectColumn') return;

    e.preventDefault();
    e.stopImmediatePropagation();
    hideTooltip();

    if (GENEDOC_MOVE_TOOLS.has(tool)) {
        startGeneDocMoveDrag(e, rowIndex, pos, tool, span);
    } else if (GENEDOC_GAP_TOOLS.has(tool)) {
        handleGeneDocGapToolClick(rowIndex, pos, tool);
    } else if (tool === 'residue') {
        state.editCell = { row: rowIndex, pos };
        updateEditActiveCell();
    } else if (tool === 'selectColumn') {
        startGeneDocColumnDrag(pos);
    }
}

function startGeneDocMoveDrag(e, rowIndex, pos, tool, span) {
    if (!isGeneDocResidueChar(state.seqs[rowIndex].seq[pos])) {
        showMessage('Start a GeneDoc drag on a residue.', 1800);
        return;
    }
    clearGeneDocEditDrag();
    state.editDrag = {
        type: 'move',
        rowIndex,
        anchorPos: pos,
        tool,
        lastClientX: e.clientX,
        charWidth: getGeneDocCharWidth(span),
        originalSeq: state.seqs[rowIndex].seq,
        originalAlignmentLength: Math.max(...state.seqs.map(seqObj => seqObj.seq.length)),
        moved: 0
    };
    state.editCell = { row: rowIndex, pos };
    updateEditActiveCell();
    document.body.style.cursor = 'default';
    document.addEventListener('mousemove', handleGeneDocEditDragMove);
    document.addEventListener('mouseup', handleGeneDocEditDragEnd);
}

function startGeneDocColumnDrag(pos) {
    clearGeneDocEditDrag();
    state.editDrag = {
        type: 'selectColumn',
        startPos: pos,
        lastPos: pos
    };
    setGeneDocColumnRange(pos, pos);
    document.body.style.cursor = 'default';
    document.addEventListener('mousemove', handleGeneDocEditDragMove);
    document.addEventListener('mouseup', handleGeneDocEditDragEnd);
}

function setGeneDocColumnRange(startPos, endPos) {
    const start = Math.min(startPos, endPos);
    const end = Math.max(startPos, endPos);
    state.selectedColumns.clear();
    for (let pos = start; pos <= end; pos++) {
        state.selectedColumns.add(pos);
    }
    updateColumnSelections();
}

function handleGeneDocEditDragMove(e) {
    const drag = state.editDrag;
    if (!drag) return;
    e.preventDefault();

    if (drag.type === 'selectColumn') {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const span = target?.closest?.('.seq-data > span[data-pos]');
        if (!span) return;
        const pos = parseInt(span.dataset.pos, 10);
        if (!Number.isInteger(pos) || pos === drag.lastPos) return;
        drag.lastPos = pos;
        setGeneDocColumnRange(drag.startPos, pos);
        return;
    }

    if (drag.type !== 'move') return;
    const rawSteps = Math.trunc((e.clientX - drag.lastClientX) / drag.charWidth);
    if (rawSteps === 0) return;
    const amount = Math.max(-50, Math.min(50, rawSteps));
    const direction = Math.sign(amount);
    let totalMoved = 0;

    if (canGeneDocMove(drag.rowIndex, drag.anchorPos, direction, drag.tool)) {
        totalMoved = applyGeneDocMoveAmount(drag.rowIndex, drag.anchorPos, amount, drag.tool);
    }

    if (totalMoved !== 0) {
        normalizeAlignmentLengths();
        state.seqs[drag.rowIndex].gaplessPositions = calculateGaplessPositions(state.seqs[drag.rowIndex].seq);
        drag.anchorPos += totalMoved;
        state.editCell = { row: drag.rowIndex, pos: drag.anchorPos };
        if (state.editLiveConservation || !refreshSequenceRowDom(drag.rowIndex)) {
            renderAlignment({ deferConservation: !state.editLiveConservation });
        }
        drag.lastClientX += totalMoved * drag.charWidth;
        drag.moved += totalMoved;
    } else {
        drag.lastClientX = e.clientX;
    }
}

function handleGeneDocEditDragEnd() {
    const drag = state.editDrag;
    clearGeneDocEditDrag();
    if (drag?.type === 'move' && drag.moved !== 0) {
        pushUndoRowPatch(
            drag.tool === 'slideKeepGaps' ? 'geneDocSlideText' : 'geneDocMoveText',
            drag.rowIndex,
            drag.originalSeq,
            state.seqs[drag.rowIndex].seq
        );
        normalizeAlignmentLengths();
        refreshAllGaplessPositions();
        state.editCell = { row: drag.rowIndex, pos: drag.anchorPos };
        const nextAlignmentLength = Math.max(...state.seqs.map(seqObj => seqObj.seq.length));
        if (state.editLiveConservation || nextAlignmentLength !== drag.originalAlignmentLength) {
            renderAlignment({ deferConservation: !state.editLiveConservation });
        } else {
            refreshSequenceRowDom(drag.rowIndex);
            if (typeof updateSourceInfo === 'function') updateSourceInfo();
        }
        const label = drag.tool === 'slideKeepGaps' ? 'SlideText' : 'MoveText';
        showMessage(`${label} moved ${Math.abs(drag.moved)} column(s).`, 1400);
    }
}

function clearGeneDocEditDrag() {
    document.removeEventListener('mousemove', handleGeneDocEditDragMove);
    document.removeEventListener('mouseup', handleGeneDocEditDragEnd);
    document.body.style.cursor = '';
    state.editDrag = null;
}

function getGeneDocGapTargets(rowIndex, tool) {
    if (tool.endsWith('Seq')) return [rowIndex];
    if (tool.endsWith('Other')) return state.seqs.map((_, i) => i).filter(i => i !== rowIndex);
    return state.seqs.map((_, i) => i);
}

function handleGeneDocGapToolClick(rowIndex, pos, tool) {
    const targets = getGeneDocGapTargets(rowIndex, tool);
    if (!targets.length) {
        showMessage('No target sequences for this GeneDoc edit.', 1800);
        return;
    }
    const deleting = tool.startsWith('delete');
    if (deleting) {
        const blocked = targets.find(i => isGeneDocResidueChar(state.seqs[i].seq[pos] || GENEDOC_FILLER));
        if (blocked !== undefined) {
            showMessage('Delete Gap targets must be gaps.', 2200);
            return;
        }
    }

    pushUndo(`geneDoc-${tool}`);
    normalizeAlignmentLengths();
    let changed = false;
    targets.forEach(i => {
        const s = state.seqs[i];
        const result = deleting
            ? geneDocDeleteDashString(s.seq, pos)
            : geneDocInsertDashString(s.seq, pos);
        if (result.changed) {
            s.seq = result.seq;
            changed = true;
        }
    });
    if (!changed) {
        showMessage('No GeneDoc edit was applied.', 1800);
        return;
    }
    const label = deleting ? 'gap deleted' : 'gap inserted';
    finalizeGeneDocEdit(`${targets.length} sequence(s): ${label}.`, 1600);
}

function handleGeneDocResidueKey(e) {
    if (!state.editModeActive || state.editTool !== 'residue' || !state.editCell) return false;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;

    const { row, pos } = state.editCell;
    if (!state.seqs[row]) return false;

    // Handle Backspace: delete previous character
    if (e.key === 'Backspace') {
        e.preventDefault();
        if (pos > 0) {
            pushUndo('geneDocResidueEdit');
            const chars = state.seqs[row].seq.split('');
            chars[pos - 1] = GENEDOC_FILLER;
            state.seqs[row].seq = chars.join('');
            state.editCell = { row, pos: pos - 1 };
            fastUpdateEditCell();
        }
        return true;
    }

    // Handle Delete: delete current character
    if (e.key === 'Delete') {
        e.preventDefault();
        const chars = state.seqs[row].seq.split('');
        if (pos < chars.length) {
            pushUndo('geneDocResidueEdit');
            chars[pos] = GENEDOC_FILLER;
            state.seqs[row].seq = chars.join('');
            fastUpdateEditCell();
        }
        return true;
    }

    // Handle Arrow Left/Right: move cursor along the sequence
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (pos > 0) {
            state.editCell = { row, pos: pos - 1 };
            updateEditActiveCell();
        }
        return true;
    }
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        const maxPos = state.seqs[row].seq.length - 1;
        if (pos < maxPos) {
            state.editCell = { row, pos: pos + 1 };
            updateEditActiveCell();
        }
        return true;
    }

    // Only single printable characters
    if (e.key.length !== 1 || !/^[A-Za-z.-]$/.test(e.key)) return false;

    pushUndo('geneDocResidueEdit');
    normalizeAlignmentLengths();
    const chars = state.seqs[row].seq.split('');
    if (pos < 0 || pos >= chars.length) return false;
    chars[pos] = (e.key === '.' || e.key === '-') ? GENEDOC_FILLER : e.key.toUpperCase();
    state.seqs[row].seq = chars.join('');

    // Update the span at the OLD position (where we just typed)
    fastUpdateEditCellAt(row, pos);

    // Advance cursor
    const nextPos = Math.min(pos + 1, chars.length - 1);
    state.editCell = { row, pos: nextPos };
    updateEditActiveCell();

    e.preventDefault();
    return true;
}

/**
 * Fast in-place update for Type mode: updates a single span at (row,pos)
 * using cached DOM references. No full re-render. Like GeneDoc.
 */
function fastUpdateEditCellAt(row, pos) {
    const span = getSpanElement(row, pos);
    if (!span) {
        renderAlignment(); return;
    }

    const base = state.seqs[row].seq[pos] || GENEDOC_FILLER;
    span.textContent = base;
    // Update class for correct shading
    const consData = (state.conservationDataCache && state.conservationDataCache.data) || {};
    span.className = getSequenceBaseRenderClass(base, pos, getSequenceRenderConfig(), consData);
}

/**
 * Fast in-place update using current state.editCell position.
 * Used by Backspace/Delete where editCell already points to the right position.
 */
function fastUpdateEditCell() {
    if (!state.editCell) return;
    const { row, pos } = state.editCell;
    fastUpdateEditCellAt(row, pos);
    updateEditActiveCell();
}

function removeGapColumns() {
    if (state.seqs.length === 0) return;
    const len = Math.max(...state.seqs.map(s => s.seq.length));
    const colsToRemove = [];
    for (let pos = 0; pos < len; pos++) {
        if (state.seqs.every(s => isGeneDocGapChar(s.seq[pos] || GENEDOC_FILLER))) {
            colsToRemove.push(pos);
        }
    }
    if (colsToRemove.length === 0) {
        showMessage("No gap-only columns to remove.", 2000);
        return;
    }
    pushUndo('removeGaps');
    normalizeAlignmentLengths();
    state.seqs.forEach(s => {
        let seqArr = s.seq.split('');
        colsToRemove.sort((a, b) => b - a).forEach(pos => seqArr.splice(pos, 1));
        s.seq = seqArr.join('');
    });
    state.selectedColumns.clear();
    refreshAllGaplessPositions();
    renderAlignment();
    showMessage(`${colsToRemove.length} gap columns removed!`, 2000);
}

function insertGapColumn(skipSelected = false) {
    if (state.selectedColumns.size === 0) {
        showMessage("Select a column position by Ctrl+Alt+click on a nucleotide to insert gap there.", 5000);
        return;
    }
    const pos = Math.min(...state.selectedColumns);
    pushUndo('insertGap');
    normalizeAlignmentLengths();
    state.seqs.forEach((s, i) => {
        if (skipSelected && state.selectedRows.has(i)) return; // Skip selected rows when requested
        s.seq = s.seq.slice(0, pos) + '-' + s.seq.slice(pos);
    });
    normalizeAlignmentLengths();
    refreshAllGaplessPositions();
    state.selectedColumns.clear();
    renderAlignment();
    showMessage("Gap column inserted!", 2000);
}

function insertSingleGap(rowIndex, pos) {
    const s = state.seqs[rowIndex];
    if (!s) return;
    pushUndo('insertSingleGap');
    normalizeAlignmentLengths();
    const result = geneDocInsertDashString(s.seq, pos);
    if (!result.changed) {
        showMessage('No gap inserted.', 1800);
        return;
    }
    s.seq = result.seq;
    finalizeGeneDocEdit('Single GeneDoc gap inserted.', 1800);
}

function removeSingleGap(rowIndex, pos) {
    const s = state.seqs[rowIndex];
    if (!s) return;
    if (!isGeneDocGapChar(s.seq[pos] || GENEDOC_FILLER)) {
        showMessage("Not a gap.", 2000);
        return;
    }
    pushUndo('removeSingleGap');
    normalizeAlignmentLengths();
    const result = geneDocDeleteDashString(s.seq, pos);
    if (!result.changed) {
        showMessage('No gap removed.', 1800);
        return;
    }
    s.seq = result.seq;
    finalizeGeneDocEdit('Single GeneDoc gap removed.', 1800);
}

function handleAlignmentPanStart(e) {
    if (e.button !== 2) return;
    if (!alignmentContainer) return;
    // Only pan if NOT on a seq-data or seq-name element
    const dataTarget = e.target.closest('.seq-data');
    const nameTarget = e.target.closest('.seq-name');
    if (dataTarget || nameTarget) return;

    // Don't preventDefault here - let the contextmenu handler decide
    // (context menu is only suppressed after actual pan movement)
    state.panning.active = true;
    state.panning.started = false;
    state.panning.startX = e.clientX;
    state.panning.startY = e.clientY;
    state.panning.scrollLeft = alignmentContainer.scrollLeft;
    state.panning.scrollTop = alignmentContainer.scrollTop;
}

function handleAlignmentPanMove(e) {
    if (!state.panning.active || !alignmentContainer) return;

    // Check if right button is still held
    if (e.buttons !== undefined && (e.buttons & 2) === 0) {
        handleAlignmentPanEnd();
        return;
    }

    const deltaX = state.panning.startX - e.clientX;
    const deltaY = state.panning.startY - e.clientY;

    // Small threshold before activating pan
    if (!state.panning.started) {
        if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) {
            return;
        }
        state.panning.started = true;
    }

    e.preventDefault();
    alignmentContainer.scrollLeft = state.panning.scrollLeft + deltaX;
    alignmentContainer.scrollTop = state.panning.scrollTop + deltaY;
}

function handleAlignmentPanEnd() {
    if (!state.panning.active) return;
    state.panning.active = false;
    state.panning.started = false;
}

function handleAlignmentPanContextMenu(e) {
    if (state.panning.started) {
        e.preventDefault();
    }
}

// Ctrl+A on fastaInput handled by main capture-phase handler Ã¢â‚¬â€ no special override needed

// Drag handlers are defined at top of file (window.handleDragStart / window.handleDragEnd)

// ============================================================================
// FULL-WINDOW DRAG AND DROP - Add at the very end of script.js
// ============================================================================

(function() {
    // Create overlay element if it doesn't exist
    let dragOverlay = document.getElementById('drag-overlay');
    if (!dragOverlay) {
        dragOverlay = document.createElement('div');
        dragOverlay.id = 'drag-overlay';
        dragOverlay.className = 'drag-overlay hidden';
        // Empty overlay - just visual backdrop
        document.body.appendChild(dragOverlay);
    }

    let dragCounter = 0;

    // Prevent default drag behaviors on entire document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, function(e) {
            // Only prevent if it's a file drag, not text/element drag
            if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true); // Use capture phase to catch events early
    });

    // Show overlay when file enters window
    document.body.addEventListener('dragenter', function(e) {
        if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            dragCounter++;
            dragOverlay.classList.remove('hidden');
            dragOverlay.classList.add('active');
        }
    }, true);

    // Hide overlay when file leaves window
    document.body.addEventListener('dragleave', function(e) {
        if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            dragCounter--;
            if (dragCounter === 0) {
                dragOverlay.classList.remove('active');
                dragOverlay.classList.add('hidden');
            }
        }
    }, true);

    // Handle file drop on entire window
    document.body.addEventListener('drop', function(e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            e.preventDefault();
            e.stopPropagation();

            dragCounter = 0;
            dragOverlay.classList.remove('active');
            dragOverlay.classList.add('hidden');

            const file = e.dataTransfer.files[0];

            // Validate file type
            const validExtensions = ['.fasta', '.fa', '.msf', '.aln', '.clustal', '.txt'];
            const fileName = file.name.toLowerCase();
            const isValid = validExtensions.some(ext => fileName.endsWith(ext));

            if (!isValid) {
                showMessage('Please upload a valid alignment file (FASTA, MSF, Clustal, .txt)', 4000);
                return;
            }

            // Process the file
            state.currentFilename = file.name;
            const reader = new FileReader();
            reader.onload = function(event) {
                const fastaInputElement = el('fastaInput');
                if (fastaInputElement) {
                    fastaInputElement.value = event.target.result;
                    parseAndRender(true);
                }
            };
            reader.onerror = function() {
                showMessage('Error reading file. Please try again.', 5000);
            };
            reader.readAsText(file);
        }
    }, true);
})();

// Right-click horizontal scroll
window.addEventListener('load', () => {
    if (!alignmentContainer) return;
    let scrolling = false, sx = 0, sl = 0;

    alignmentContainer.addEventListener('mousedown', (e) => {
        if (e.button !== 2) return;
        if (e.target.closest('.seq-data, .seq-name')) return;
        scrolling = true;
        sx = e.clientX;
        sl = alignmentContainer.scrollLeft;
    });

    document.addEventListener('mousemove', (e) => {
        if (scrolling) alignmentContainer.scrollLeft = sl - (e.clientX - sx);
    });

    document.addEventListener('mouseup', () => { scrolling = false; });

    alignmentContainer.addEventListener('contextmenu', (e) => {
        if (!e.target.closest('.seq-data, .seq-name')) e.preventDefault();
    });
});

// ============================================================================
// COLOUR SEQUENCE NAMES FEATURE
// ============================================================================

// Copy all sequences with a specific color
function copySequencesByColor(colour, ungapped = false, asFasta = true) {
    const matchingSeqs = [];

    state.seqs.forEach((seq, idx) => {
        if (colourState.mappings.get(seq.header) === colour) {
            const seqData = ungapped ? seq.seq.replace(/-/g, '') : seq.seq;
            if (asFasta) {
                matchingSeqs.push(`>${seq.header}\n${seqData}`);
            } else {
                matchingSeqs.push(seqData);
            }
        }
    });

    if (matchingSeqs.length === 0) {
        showMessage('No sequences with this color', 2000);
        return;
    }

    const text = matchingSeqs.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        showMessage(`Copied ${matchingSeqs.length} sequence(s) with this color`, 2000);
    }).catch(err => {
        showMessage('Failed to copy', 2000);
    });
}

// Sort sequences by their assigned color
function sortSequencesByColor() {
    const colorOrder = new Map();
    let colorIndex = 0;

    // First pass: assign order to each color
    state.seqs.forEach((seq) => {
        const color = colourState.mappings.get(seq.header);
        if (color && !colorOrder.has(color)) {
            colorOrder.set(color, colorIndex++);
        }
    });

    // Sort: colored seqs first (by color), then uncolored
    const sortedSeqs = [...state.seqs].sort((a, b) => {
        const colorA = colourState.mappings.get(a.header);
        const colorB = colourState.mappings.get(b.header);

        const orderA = colorA ? colorOrder.get(colorA) : Infinity;
        const orderB = colorB ? colorOrder.get(colorB) : Infinity;

        return orderA - orderB;
    });

    // Update state and re-render
    state.seqs = sortedSeqs;
    state.selectedRows.clear();
    renderAlignment();
    showMessage('Sequences sorted by color', 2000);
}

// Group colored sequences at top
function groupColoredSequencesAtTop() {
    const coloredSeqs = [];
    const ungroupedSeqs = [];

    state.seqs.forEach((seq) => {
        if (colourState.mappings.has(seq.header)) {
            coloredSeqs.push(seq);
        } else {
            ungroupedSeqs.push(seq);
        }
    });

    // Combine: colored at top, then ungrouped
    state.seqs = [...coloredSeqs, ...ungroupedSeqs];
    state.selectedRows.clear();
    renderAlignment();
    showMessage(`Moved ${coloredSeqs.length} colored sequence(s) to top`, 2000);
}

// 10-color discrete palette
const colourPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A9DFBF'
];

// Store current color mappings and presets
let colourState = {
    mappings: new Map(), // seqName -> color (current)
    history: new Map(), // seqName -> [{color, method, timestamp}, ...]
    presets: JSON.parse(localStorage.getItem('seqColourPresets') || '{}')
};

// Normalize name for grouping: lowercase, normalize separators, strip trailing numbers
function normalizeName(name, maxChars = 10, stripTrailingNumbers = false) {
    let n = String(name || '').substring(0, maxChars).toLowerCase();
    // Normalize all separators (hyphen, underscore, dot, space) to underscore
    n = n.replace(/[-_.\s]/g, '_');
    if (stripTrailingNumbers) {
        n = n.replace(/[_\d]+$/, '');
    }
    return n;
}

// Get a canonical prefix for color assignment (used for sorting similar groups together)
function getCanonicalPrefix(name, maxChars = 10) {
    let n = normalizeName(name, maxChars, true);
    // Extract just alphabetic prefix for broader grouping
    const match = n.match(/^([a-z]+)/);
    return match ? match[1] : n;
}

// Position-weighted n-gram Jaccard similarity for sequence name clustering.
// Bigram + trigram with position boost (first 3 chars x2) handles
// organism prefixes, element names, and subfamily suffixes robustly.
function ngramJaccardSimilarity(a, b) {
    if (a === b) return 1;
    // Build weighted n-gram multiset for string s
    const buildNgrams = (s) => {
        const ngrams = new Map();
        const add = (ng, w) => ngrams.set(ng, (ngrams.get(ng) || 0) + w);
        // Bigrams (weight 1)
        for (let i = 0; i < s.length - 1; i++) add(s.substring(i, i + 2), 1);
        // Trigrams (weight 1.5 - more discriminative)
        for (let i = 0; i < s.length - 2; i++) add(s.substring(i, i + 3), 1.5);
        // Position boost: ngrams covering first 3 chars x2 (organism prefix)
        for (const [ng, w] of ngrams) {
            const idx = s.indexOf(ng);
            if (idx >= 0 && idx <= 2) ngrams.set(ng, w * 2);
        }
        return ngrams;
    };
    const na = buildNgrams(a), nb = buildNgrams(b);
    let shared = 0, total = 0;
    const all = new Set([...na.keys(), ...nb.keys()]);
    for (const ng of all) {
        const wa = na.get(ng) || 0, wb = nb.get(ng) || 0;
        shared += Math.min(wa, wb);
        total += Math.max(wa, wb);
    }
    return total > 0 ? shared / total : 0;
}

// Cluster sequences by normalized prefix using position-weighted n-gram Jaccard.
// Hard guarantee: identical normalized keys always share the same bucket.
// Sensitivity 0 = strict (merge only >= 90% similar), 10 = loose (merge >= 40% similar).
function clusterByName(seqNames, maxChars = 10, threshold = 3) {
    const nChars = Math.max(1, parseInt(maxChars, 10) || 10);
    const sensitivity = Math.max(0, Math.min(10, parseInt(threshold, 10) || 0));

    // 1) Hard guarantee: identical normalized first-N keys always share the same color key bucket.
    const keyToNames = new Map();
    for (const rawName of seqNames) {
        const key = normalizeName(rawName, nChars, false);
        if (!keyToNames.has(key)) keyToNames.set(key, []);
        keyToNames.get(key).push(rawName);
    }

    const uniqueKeys = Array.from(keyToNames.keys()).sort((a, b) => a.localeCompare(b));

    // 2) Sensitivity controls optional merge between near keys.
    //    sensitivity 0 = strict (0.90 similarity), sensitivity 10 = loose (0.40 similarity).
    const minSim = 0.90 - (sensitivity / 10) * 0.50; // range: 0.90 -> 0.40

    const clusters = []; // [{ repKey, keys: [] }]
    for (const key of uniqueKeys) {
        if (sensitivity >= 10 || minSim >= 1.0) {
            clusters.push({ repKey: key, keys: [key] });
            continue;
        }

        let bestCluster = -1;
        let bestSim = -1;
        for (let i = 0; i < clusters.length; i++) {
            const sim = ngramJaccardSimilarity(key, clusters[i].repKey);
            if (sim >= minSim && sim > bestSim) {
                bestSim = sim;
                bestCluster = i;
            }
        }

        if (bestCluster >= 0) {
            clusters[bestCluster].keys.push(key);
        } else {
            clusters.push({ repKey: key, keys: [key] });
        }
    }

    clusters.sort((a, b) => a.repKey.localeCompare(b.repKey));

    const out = [];
    for (const cluster of clusters) {
        const names = [];
        for (const key of cluster.keys) {
            const groupNames = keyToNames.get(key);
            if (groupNames && groupNames.length) names.push(...groupNames);
        }
        names.sort((a, b) => String(a).localeCompare(String(b)));
        out.push(names);
    }
    return out;
}

// Apply color to sequence name elements
function applyColourToSeqNames(mappings) {
    const seqNameElements = document.querySelectorAll('.seq-name');
    seqNameElements.forEach(el => {
        // Use underlying sequence header (not truncated display) for stable mapping
        let headerKey = el.dataset.seqIndex !== undefined ? (state.seqs[parseInt(el.dataset.seqIndex)]?.header || el.textContent.trim()) : el.textContent.trim();
        if (mappings.has(headerKey)) {
            const colour = mappings.get(headerKey);
            el.setAttribute('style', `background-color: ${colour} !important; color: #000 !important; font-weight: bold !important;`);
            el.title = `Color: ${colour}`;
        } else {
            el.removeAttribute('style');
            el.title = '';
        }
    });
}

// Helper: Record color in history
function recordColorHistory(seqName, color, method) {
    if (!colourState.history.has(seqName)) {
        colourState.history.set(seqName, []);
    }
    colourState.history.get(seqName).push({
        color,
        method,
        timestamp: new Date().toLocaleTimeString()
    });
}

// Pattern matching function
function applyPatternColour() {
    const patternInput = el('colourPatternInput');
    const colourInput = el('colourPatternColor');

    if (!patternInput.value.trim()) {
        showMessage('Please enter a pattern', 2000);
        return;
    }

    const pattern = patternInput.value.trim();
    const colour = colourInput.value;
    let matchedNames = new Set();

    try {
        const regex = new RegExp(pattern, 'i');
        const seqNameElements = document.querySelectorAll('.seq-name');
        seqNameElements.forEach(el => {
            const idx = el.dataset.seqIndex;
            const header = idx !== undefined ? (state.seqs[parseInt(idx)]?.header || el.textContent.trim()) : el.textContent.trim();
            if (regex.test(header) && !matchedNames.has(header)) {
                matchedNames.add(header);
                colourState.mappings.set(header, colour);
                recordColorHistory(header, colour, 'Pattern');
            }
        });

        applyColourToSeqNames(colourState.mappings);
    showMessage(`Applied to ${matchedNames.size} unique sequence(s)`, 2000);

    } catch (e) {
        showMessage(`Invalid regex: ${e.message}`, 3000);
    }
}

// Auto-color by similarity
function autoColourBySimilarity() {
    const maxChars = parseInt(el('colourSimilarityChars').value) || 10;
    const threshold = parseInt(el('colourSimilarityThreshold').value) || 3;
    const mode = document.querySelector('input[name="colourMode"]:checked').value;

    // Use actual sequence headers from state, not truncated display text
    if (!state.seqs || state.seqs.length === 0) {
        showMessage('No sequences loaded', 2000);
        return;
    }

    // Get unique sequence names from state (full headers, not truncated)
    const seqNames = state.seqs.map(s => s.header);

    if (seqNames.length === 0) {
        showMessage('No sequences loaded', 2000);
        return;
    }

    // Cluster sequences
    const clusters = clusterByName(seqNames, maxChars, threshold);

    // Reset current color mapping first so stale names do not affect sorting/grouping behavior.
    colourState.mappings.clear();

    // Assign colors based on mode
    // Use maximally distinct colors for better visual separation
    const nClusters = clusters.length;

    // High-contrast discrete palette (ColorBrewer/Tableau-inspired)
    const distinctColors = [
        '#e41a1c', // red
        '#377eb8', // blue
        '#4daf4a', // green
        '#ff7f00', // orange
        '#984ea3', // purple
        '#00bfc4', // cyan
        '#ffd92f', // yellow
        '#a65628', // brown
        '#f781bf', // pink
        '#999999', // gray
        '#66c2a5', // teal
        '#e6ab02'  // gold
    ];

    // Predefined hues for gradient mode (maximally separated)
    const distinctHues = [
        0, 210, 120, 30, 270, 180, 60, 300, 90, 240, 15, 165
    ];

    clusters.forEach((cluster, clusterIdx) => {
        let hue;
        if (nClusters <= distinctHues.length) {
            // Use predefined maximally distinct hues
            hue = distinctHues[clusterIdx];
        } else {
            // For many clusters, use golden ratio distribution
            const goldenRatio = 0.618033988749895;
            hue = ((clusterIdx * goldenRatio) % 1) * 360;
        }

        if (mode === 'discrete') {
            const colour = (nClusters <= distinctColors.length)
                ? distinctColors[clusterIdx]
                : `hsl(${Math.round(hue)}, 70%, 70%)`;
            cluster.forEach(name => {
                colourState.mappings.set(name, colour);
                recordColorHistory(name, colour, 'Auto-Similarity');
            });
        } else {
            // Gradient mode - shade by normalized key, so identical first-N groups keep identical color.
            const keyToNames = new Map();
            cluster.forEach(name => {
                const key = normalizeName(name, maxChars, false);
                if (!keyToNames.has(key)) keyToNames.set(key, []);
                keyToNames.get(key).push(name);
            });
            const sortedKeys = Array.from(keyToNames.keys()).sort((a, b) => a.localeCompare(b));
            const keyCount = Math.max(1, sortedKeys.length);

            sortedKeys.forEach((key, keyIdx) => {
                const lightness = keyCount === 1
                    ? 65
                    : 55 + (keyIdx * 25 / (keyCount - 1));
                const colour = `hsl(${Math.round(hue)}, 70%, ${Math.min(lightness, 85)}%)`;
                const namesForKey = keyToNames.get(key) || [];
                namesForKey.forEach(name => {
                    colourState.mappings.set(name, colour);
                    recordColorHistory(name, colour, 'Auto-Similarity');
                });
            });
        }
    });

    applyColourToSeqNames(colourState.mappings);
    showMessage(`Colored ${seqNames.length} sequences in ${clusters.length} cluster(s)`, 2000);
}

// Save preset
function saveColourPreset() {
    const presetName = el('colourPresetName').value.trim();

    if (!presetName) {
        showMessage('Please enter a preset name', 2000);
        return;
    }

    if (colourState.mappings.size === 0) {
        showMessage('No colors to save', 2000);
        return;
    }

    colourState.presets[presetName] = Array.from(colourState.mappings.entries());
    localStorage.setItem('seqColourPresets', JSON.stringify(colourState.presets));

    el('colourPresetName').value = '';
    updateColourPresetList();
    showMessage(`Preset '${presetName}' saved`, 2000);
}

// Load preset
function loadColourPreset() {
    if (Object.keys(colourState.presets).length === 0) {
        showMessage('No saved presets', 2000);
        return;
    }

    const presetNames = Object.keys(colourState.presets);
    const presetName = presetNames[0]; // TODO: could add dialog to select

    colourState.mappings = new Map(colourState.presets[presetName]);
    applyColourToSeqNames(colourState.mappings);
    showMessage(`Loaded preset '${presetName}'`, 2000);
}

// Reset all colours
function resetAllColours() {
    colourState.mappings.clear();
    colourState.history.clear();
    const seqNameElements = document.querySelectorAll('.seq-name');
    seqNameElements.forEach(el => {
        el.removeAttribute('style');
        el.title = '';
    });
    showMessage('All colors reset', 2000);
}

// Update preset list display
function updateColourPresetList() {
    const presetList = el('colourPresetList');
    const presetItems = el('presetItems');
    const presets = colourState.presets;

    if (Object.keys(presets).length === 0) {
        presetList.style.display = 'none';
        return;
    }

    presetList.style.display = 'block';
    presetItems.innerHTML = Object.keys(presets).map(name =>
        `<div style="cursor: pointer; padding: 2px; border-radius: 2px; margin: 2px 0; background: #f0f0f0;"
              onclick="(function() {
                colourState.mappings = new Map(colourState.presets['${name}']);
                applyColourToSeqNames(colourState.mappings);
                showMessage('Loaded ${name}', 2000);
              })()">
            ${name} <span style="float: right; cursor: pointer; color: #888;" onclick="(function(e) { e.stopPropagation(); delete colourState.presets['${name}']; localStorage.setItem('seqColourPresets', JSON.stringify(colourState.presets)); updateColourPresetList(); })(event)">Ã¢Å“â€¢</span>
        </div>`
    ).join('');
}

// Initialize colour seqs feature
// Show color history inspector
function showColorHistory() {
    const modal = el('colourInspectorModal');
    const content = el('colourHistoryContent');

    if (colourState.history.size === 0) {
        content.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No colors assigned yet</div>';
        showExclusiveModal('colourInspectorModal');
        return;
    }

    // Group by sequence name
    let html = '';
    const sortedNames = Array.from(colourState.history.keys()).sort();

    sortedNames.forEach(seqName => {
        const history = colourState.history.get(seqName);
        const currentColor = colourState.mappings.get(seqName);

        html += `<div style="margin-bottom: 12px; padding: 8px; background: #f9f9f9; border-radius: 3px; border-left: 3px solid ${currentColor};">`;
        html += `<div style="font-weight: bold; margin-bottom: 4px; word-break: break-all;">${seqName}</div>`;
        html += `<div style="font-size: 10px; color: #666; margin-bottom: 6px;">Current: <span style="display: inline-block; width: 12px; height: 12px; background: ${currentColor}; border: 1px solid #ccc; vertical-align: middle;"></span> ${currentColor}</div>`;
        html += `<div style="font-size: 10px;">History:</div>`;
        html += `<div style="margin-left: 8px;">`;

        history.forEach((entry, idx) => {
            html += `<div style="margin: 2px 0; display: flex; align-items: center; gap: 6px;">`;
            html += `<span style="color: #999; min-width: 20px;">${idx + 1}.</span>`;
            html += `<span style="display: inline-block; width: 14px; height: 14px; background: ${entry.color}; border: 1px solid #ccc; border-radius: 2px;"></span>`;
            html += `<span>${entry.color}</span>`;
            html += `<span style="color: #0066cc; margin: 0 4px;">Ã¢â€ Â ${entry.method}</span>`;
            html += `<span style="color: #999; font-size: 9px;">${entry.timestamp}</span>`;
            html += `</div>`;
        });

        html += `</div></div>`;
    });

    content.innerHTML = html;
    showExclusiveModal('colourInspectorModal');
}

function initColourSeqs() {
    const patternBtn = el('colourPatternButton');
    const autoBtn = el('colourAutoButton');
    const saveBtn = el('colourSavePresetButton');
    const loadBtn = el('colourLoadPresetButton');
    const resetBtn = el('colourResetButton');
    const sortBtn = el('colourSortButton');
    const groupBtn = el('colourGroupButton');
    const inspectBtn = el('colourInspectButton');
    const thresholdSlider = el('colourSimilarityThreshold');
    const patternInput = el('colourPatternInput');

    if (patternBtn) patternBtn.addEventListener('click', applyPatternColour);
    if (autoBtn) autoBtn.addEventListener('click', autoColourBySimilarity);
    if (saveBtn) saveBtn.addEventListener('click', saveColourPreset);
    if (loadBtn) loadBtn.addEventListener('click', loadColourPreset);
    if (resetBtn) resetBtn.addEventListener('click', resetAllColours);
    if (sortBtn) sortBtn.addEventListener('click', sortSequencesByColor);
    if (groupBtn) groupBtn.addEventListener('click', groupColoredSequencesAtTop);
    if (inspectBtn) inspectBtn.addEventListener('click', showColorHistory);

    // Keep menu open when interacting with pattern input
    if (patternInput) {
        patternInput.addEventListener('focus', () => {
            const colourMenu = document.querySelector('[id="colourseqs-controls"]')?.parentElement;
            if (colourMenu) {
                colourMenu.classList.add('menu-open');
            }
        });
        patternInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (!document.querySelector('[id="colourseqs-controls"]')?.parentElement?.matches(':hover')) {
                    document.querySelector('[id="colourseqs-controls"]')?.parentElement?.classList.remove('menu-open');
                }
            }, 100);
        });
    }

    // Update threshold display
    const updateThresholdLabel = () => {
        const sens = parseInt(thresholdSlider.value) || 3;
        const pct = Math.round((0.90 - (sens / 10) * 0.50) * 100);
        el('colourThresholdValue').textContent = pct + '%';
    };
    if (thresholdSlider) {
        thresholdSlider.addEventListener('input', updateThresholdLabel);
        updateThresholdLabel();
    }

    // Load initial presets list
    updateColourPresetList();
}

// ============================================================================
// End of Full-window drag-and-drop
// ============================================================================

// ============================================================================
// Persistent horizontal scrollbar synced with alignment
// ============================================================================
(function setupPersistentScrollbar() {
    const alignment = document.getElementById('alignmentContainer');
    const bar = document.querySelector('.horizontal-scrollbar');
    const thumb = document.querySelector('.horizontal-scrollbar-thumb');
    if (!alignment || !bar || !thumb) return;

    let syncing = false;
    // Canvas mode's content is a single absolutely-positioned <canvas> panned via
    // _canvasState.offsetX (alignment.scrollLeft/scrollWidth are meaningless there),
    // so this bar drives that offset directly instead of the DOM scroll position.
    const isCanvasMode = () => document.getElementById('modeCanvas')?.checked;

    function syncSizes() {
        syncing = true;
        if (isCanvasMode()) {
            const w = _canvasState.totalContentW || alignment.clientWidth;
            thumb.style.width = Math.max(w, alignment.clientWidth + 1) + 'px';
            bar.scrollLeft = _canvasState.offsetX || 0;
        } else {
            const w = alignment.scrollWidth || alignment.clientWidth;
            thumb.style.width = Math.max(w, alignment.clientWidth + 1) + 'px';
            bar.scrollLeft = alignment.scrollLeft;
        }
        syncing = false;
    }

    function onBarScroll() {
        if (syncing) return;
        syncing = true;
        if (isCanvasMode()) {
            _canvasState.offsetX = bar.scrollLeft;
            _canvasState.scheduleDraw?.();
        } else {
            alignment.scrollLeft = bar.scrollLeft;
        }
        syncing = false;
    }

    function onAlignmentScroll() {
        if (syncing || isCanvasMode()) return;
        syncing = true;
        bar.scrollLeft = alignment.scrollLeft;
        syncing = false;
    }

    // Registered once; Canvas's draw() calls this after every repaint so wheel-
    // scroll/drag-pan inside the canvas keeps the bar's thumb position in sync.
    _canvasState.onOffsetChange = () => {
        if (syncing || !isCanvasMode()) return;
        syncing = true;
        bar.scrollLeft = _canvasState.offsetX || 0;
        syncing = false;
    };

    syncSizes();
    bar.addEventListener('scroll', onBarScroll, { passive: true });
    alignment.addEventListener('scroll', onAlignmentScroll, { passive: true });
    window.addEventListener('resize', () => window.requestAnimationFrame(syncSizes));
    // Only watch for actual content changes, NOT style changes (which would be triggered by zoom)
    const mo = new MutationObserver(() => window.requestAnimationFrame(syncSizes));
    mo.observe(alignment, { childList: true, subtree: true, characterData: false, attributes: false });

    // Drag-to-pan with Pointer Events and capture for robustness
    let isDown = false, startX = 0, startScroll = 0;
    let dragRaf = null, lastDx = 0;
    bar.addEventListener('pointerdown', (e) => {
        isDown = true;
        try { bar.setPointerCapture(e.pointerId); } catch {}
        bar.classList.add('grabbing');
        document.body.classList.add('no-select');
        startX = e.clientX;
        startScroll = bar.scrollLeft;
        e.preventDefault();
    });
    bar.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        lastDx = e.clientX - startX;
        if (dragRaf) { e.preventDefault(); return; }
        dragRaf = window.requestAnimationFrame(() => {
            const newScroll = startScroll - lastDx;
            syncing = true;
            if (isCanvasMode()) {
                _canvasState.offsetX = newScroll;
                _canvasState.scheduleDraw?.();
            } else {
                alignment.scrollLeft = newScroll;
            }
            bar.scrollLeft = newScroll;
            syncing = false;
            dragRaf = null;
        });
        e.preventDefault();
    }, { passive: false });
    const endDrag = () => {
        if (!isDown) return;
        isDown = false;
        bar.classList.remove('grabbing');
        document.body.classList.remove('no-select');
        if (dragRaf) { cancelAnimationFrame(dragRaf); dragRaf = null; }
    };
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);
    window.addEventListener('mouseup', endDrag);

    // Map vertical wheel to horizontal scroll when user hovers the bar
    bar.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            bar.scrollLeft += e.deltaY;
            e.preventDefault();
        }
    }, { passive: false });
})();

// ============ BLAST SEARCH FUNCTIONS ============
let blastResultsModal = null;
let blastWorker = null;

function getBlastWorker() {
    if (!blastWorker) blastWorker = new Worker('./blast-worker.js');
    return blastWorker;
}

function showBlastDialog(sequenceHeader, sequenceSeq) {
    // Create modal for database selection
    const modal = document.createElement('div');
    modal.className = 'blast-modal-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'blast-dialog';

    const title = document.createElement('div');
    title.className = 'blast-dialog-title';
    title.textContent = 'BLAST Search';

    const content = document.createElement('div');
    content.className = 'blast-dialog-content';

    const seqLabel = document.createElement('div');
    seqLabel.innerHTML = `<strong>Sequence:</strong> ${sequenceHeader}`;
    seqLabel.style.marginBottom = '12px';
    seqLabel.style.fontSize = '12px';
    seqLabel.style.wordBreak = 'break-word';
    content.appendChild(seqLabel);

    const dbLabel = document.createElement('div');
    dbLabel.innerHTML = '<strong>Search databases:</strong>';
    dbLabel.style.marginBottom = '8px';
    content.appendChild(dbLabel);

    // Database checkboxes (fetched from server)
    const dbCheckboxes = {};
    const dbContainer = document.createElement('div');
    dbContainer.style.marginBottom = '16px';

    // Loading indicator
    const dbLoading = document.createElement('div');
    dbLoading.textContent = 'Loading databases...';
    dbLoading.style.fontSize = '11px';
    dbLoading.style.color = '#888';
    dbLoading.style.marginBottom = '8px';
    dbContainer.appendChild(dbLoading);

    let databases = [];

    fetchDatabases().then(dbs => {
        databases = dbs;
        dbLoading.remove();
        if (dbs.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'No databases configured. Add one below.';
            empty.style.fontSize = '11px';
            empty.style.color = '#888';
            empty.style.marginBottom = '8px';
            dbContainer.prepend(empty);
            return;
        }
        for (const db of dbs) {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.marginBottom = '6px';
            label.style.cursor = 'pointer';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = db.checked !== false;
            checkbox.style.marginRight = '8px';
            dbCheckboxes[db.name] = checkbox;
            const span = document.createElement('span');
            span.textContent = db.label || db.name;
            span.title = db.description || '';
            span.style.fontSize = '12px';
            if (!db.available) {
                span.style.color = '#999';
                checkbox.disabled = true;
                span.textContent += ' (unavailable)';
            }
            label.appendChild(checkbox);
            label.appendChild(span);
            dbContainer.appendChild(label);
        }
    }).catch(() => {
        dbLoading.textContent = 'Server not available - no BLAST databases';
    });

    // Manage databases button
    const manageBtn = document.createElement('button');
    manageBtn.textContent = '+ Manage Databases';
    manageBtn.style.padding = '3px 10px';
    manageBtn.style.fontSize = '10px';
    manageBtn.style.marginTop = '4px';
    manageBtn.style.marginBottom = '8px';
    manageBtn.style.cursor = 'pointer';
    manageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.remove();
        showDbManagementModal();
    });
    dbContainer.appendChild(manageBtn);

    content.appendChild(dbContainer);

    // E-value setting
    const evalueLabel = document.createElement('div');
    evalueLabel.innerHTML = '<strong>E-value threshold:</strong>';
    evalueLabel.style.marginBottom = '6px';
    evalueLabel.style.fontSize = '12px';
    content.appendChild(evalueLabel);

    const evalueInput = document.createElement('input');
    evalueInput.type = 'text';
    evalueInput.value = '1e-5';
    evalueInput.style.width = '100px';
    evalueInput.style.padding = '4px';
    evalueInput.style.marginBottom = '16px';
    evalueInput.style.fontSize = '12px';
    content.appendChild(evalueInput);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.justifyContent = 'flex-end';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.padding = '6px 16px';
    cancelBtn.style.fontSize = '12px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });

    const searchBtn = document.createElement('button');
    searchBtn.textContent = 'Search';
    searchBtn.style.padding = '6px 16px';
    searchBtn.style.fontSize = '12px';
    searchBtn.style.cursor = 'pointer';
    searchBtn.style.backgroundColor = '#4CAF50';
    searchBtn.style.color = 'white';
    searchBtn.style.border = 'none';
    searchBtn.style.borderRadius = '4px';
    searchBtn.addEventListener('click', async () => {
        const selectedDbs = [];
        for (const db of databases) {
            if (dbCheckboxes[db.name].checked) selectedDbs.push({ name: db.name, url: db.url });
        }

        if (selectedDbs.length === 0) {
            alert('Please select at least one database');
            return;
        }

        modal.remove();
        await runBlastSearch(sequenceHeader, sequenceSeq, selectedDbs, evalueInput.value);
    });

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(searchBtn);
    content.appendChild(buttonContainer);

    dialog.appendChild(title);
    dialog.appendChild(content);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Dynamic BLAST database helpers
async function fetchDatabases() {
    try {
        const resp = await fetch('/api/blast-db');
        if (!resp.ok) throw new Error('Server returned ' + resp.status);
        const data = await resp.json();
        const dbs = [];
        for (const [name, info] of Object.entries(data.databases || {})) {
            dbs.push({
                name,
                label: info.description || name,
                description: info.description || '',
                checked: true,
                available: info.exists && info.formatted
            });
        }
        dbs.sort((a, b) => a.label.localeCompare(b.label));
        return dbs;
    } catch (e) {
        console.warn('Failed to fetch BLAST databases:', e.message);
        return [];
    }
}

function showDbManagementModal() {
    const overlay = document.createElement('div');
    overlay.className = 'blast-results-modal-backdrop';
    overlay.style.zIndex = '10001';
    const dialog = document.createElement('div');
    dialog.className = 'blast-results-dialog-text';
    dialog.style.maxWidth = '640px';
    const titleBar = document.createElement('div');
    titleBar.className = 'blast-text-title-bar';
    titleBar.innerHTML = '<span>Manage BLAST Databases</span>';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'blast-close-btn';
    closeBtn.textContent = 'X';
    closeBtn.onclick = () => overlay.remove();
    titleBar.appendChild(closeBtn);
    dialog.appendChild(titleBar);
    // Database list
    const listSection = document.createElement('div');
    listSection.style.padding = '16px';
    listSection.style.maxHeight = '40vh';
    listSection.style.overflowY = 'auto';
    listSection.style.borderBottom = '1px solid #ddd';
    const listTitle = document.createElement('div');
    listTitle.textContent = 'Current databases:';
    listTitle.style.fontWeight = 'bold';
    listTitle.style.marginBottom = '8px';
    listTitle.style.fontSize = '13px';
    listSection.appendChild(listTitle);
    const refreshDbList = () => {
        listSection.querySelectorAll('.db-row').forEach(r => r.remove());
        fetchDatabases().then(dbs => {
            if (dbs.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = 'No databases configured.';
                empty.style.color = '#888';
                empty.style.fontSize = '12px';
                empty.className = 'db-row';
                listSection.appendChild(empty);
                return;
            }
            for (const db of dbs) {
                const row = document.createElement('div');
                row.className = 'db-row';
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.justifyContent = 'space-between';
                row.style.padding = '4px 0';
                row.style.borderBottom = '1px solid #eee';
                row.style.fontSize = '12px';
                const info = document.createElement('span');
                info.innerHTML = '<strong>' + db.label + '</strong>' +
                    (db.available ? '' : ' <span style="color:#c00;font-size:10px;">(unavailable)</span>') +
                    (db.description && db.description !== db.name ? ' <span style="color:#666;font-size:10px;">' + db.description + '</span>' : '');
                const delBtn = document.createElement('button');
                delBtn.textContent = 'Delete';
                delBtn.style.padding = '1px 8px';
                delBtn.style.fontSize = '10px';
                delBtn.style.background = '#e53935';
                delBtn.style.color = 'white';
                delBtn.style.border = 'none';
                delBtn.style.borderRadius = '3px';
                delBtn.style.cursor = 'pointer';
                delBtn.onclick = async () => {
                    if (!confirm('Delete database "' + db.name + '"? This removes the FASTA file and BLAST indexes.')) return;
                    try {
                        const resp = await fetch('/api/blast-db/' + encodeURIComponent(db.name), { method: 'DELETE' });
                        if (resp.ok) {
                            showMessage('Database "' + db.name + '" deleted', 2000);
                            refreshDbList();
                        } else {
                            const err = await resp.json();
                            showMessage('Delete failed: ' + (err.error || resp.status), 3000);
                        }
                    } catch (e) { showMessage('Delete error: ' + e.message, 3000); }
                };
                row.appendChild(info);
                row.appendChild(delBtn);
                listSection.appendChild(row);
            }
        }).catch(() => {
            const err = document.createElement('div');
            err.textContent = 'Server not available.';
            err.style.color = '#c00';
            err.style.fontSize = '12px';
            err.className = 'db-row';
            listSection.appendChild(err);
        });
    };
    refreshDbList();
    dialog.appendChild(listSection);
    // Add new database form
    const addSection = document.createElement('div');
    addSection.style.padding = '16px';
    const addTitle = document.createElement('div');
    addTitle.textContent = 'Add new database:';
    addTitle.style.fontWeight = 'bold';
    addTitle.style.marginBottom = '8px';
    addTitle.style.fontSize = '13px';
    addSection.appendChild(addTitle);
    const dbNameInput = document.createElement('input');
    dbNameInput.type = 'text';
    dbNameInput.placeholder = 'Database name (e.g. my_SINEs)';
    dbNameInput.style.cssText = 'width:100%;padding:6px;margin-bottom:8px;font-size:12px;box-sizing:border-box';
    addSection.appendChild(dbNameInput);
    const dbDescInput = document.createElement('input');
    dbDescInput.type = 'text';
    dbDescInput.placeholder = 'Description (e.g. Snake SINEs from RepBase)';
    dbDescInput.style.cssText = 'width:100%;padding:6px;margin-bottom:8px;font-size:12px;box-sizing:border-box';
    addSection.appendChild(dbDescInput);
    let fastaContent = null;
    let fastaFileName = '';
    const fileRow = document.createElement('div');
    fileRow.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;align-items:center';
    const fileBtn = document.createElement('button');
    fileBtn.textContent = 'Select FASTA file...';
    fileBtn.style.cssText = 'padding:4px 12px;font-size:12px;cursor:pointer';
    fileBtn.onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.fa,.fasta,.fas,.bnk,.txt';
        inp.onchange = () => {
            const file = inp.files[0];
            if (!file) return;
            fastaFileName = file.name;
            const reader = new FileReader();
            reader.onload = () => {
                fastaContent = reader.result;
                const n = fastaContent.split('\n').filter(l => l.startsWith('>')).length;
                if (!dbNameInput.value) dbNameInput.value = fastaFileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
                fileStatus.textContent = fastaFileName + ' (' + n + ' sequences)';
                fileStatus.style.color = '#4CAF50';
            };
            reader.readAsText(file);
        };
        inp.click();
    };
    fileRow.appendChild(fileBtn);
    const fileStatus = document.createElement('span');
    fileStatus.textContent = 'No file selected';
    fileStatus.style.cssText = 'font-size:11px;color:#888';
    fileRow.appendChild(fileStatus);
    addSection.appendChild(fileRow);
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Create Database';
    addBtn.style.cssText = 'padding:6px 20px;font-size:13px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer';
    addBtn.onclick = async () => {
        const name = dbNameInput.value.trim();
        if (!name) { showMessage('Enter a database name', 2000); return; }
        if (!fastaContent) { showMessage('Select a FASTA file first', 2000); return; }
        addBtn.disabled = true;
        addBtn.textContent = 'Creating...';
        try {
            const resp = await fetch('/api/blast-db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: dbDescInput.value.trim(), fasta: fastaContent })
            });
            const result = await resp.json();
            if (resp.ok) {
                showMessage('Database "' + name + '" created!', 2000);
                dbNameInput.value = '';
                dbDescInput.value = '';
                fastaContent = null;
                fastaFileName = '';
                fileStatus.textContent = 'No file selected';
                fileStatus.style.color = '#888';
                refreshDbList();
            } else {
                showMessage('Error: ' + (result.error || resp.status), 4000);
            }
        } catch (e) {
            showMessage('Creation failed: ' + e.message, 4000);
        }
        addBtn.disabled = false;
        addBtn.textContent = 'Create Database';
    };
    addSection.appendChild(addBtn);
    dialog.appendChild(addSection);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// Reverse complement helper for copy-FASTA buttons
function _rcStr(s) {
    const comp = {A:'T',T:'A',C:'G',G:'C',a:'t',t:'a',c:'g',g:'c',
                   R:'Y',Y:'R',S:'S',W:'W',K:'M',M:'K',B:'V',V:'B',D:'H',H:'D',N:'N',
                   r:'y',y:'r',s:'s',w:'w',k:'m',m:'k',b:'v',v:'b',d:'h',h:'d',n:'n','-':'-'};
    return s.split('').reverse().map(c => comp[c] || 'N').join('');
}

async function runBlastSearch(seqHeader, seqSeq, databases, evalue) {
    showMessage('Running BLAST search...', 0);
    const worker = getBlastWorker();
    const queryLen = seqSeq.replace(/[-\s]/g, '').length;

    const makeSearch = (db) => new Promise((resolve) => {
        const requestId = `${Date.now()}-${Math.random()}`;
        const handler = (e) => {
            const d = e.data;
            if (d.requestId !== requestId) return;
            if (d.type === 'progress') {
                showMessage(`[${db.name}] ${d.stage}...`, 0);
                return;
            }
            if (d.type === 'result') {
                worker.removeEventListener('message', handler);
                resolve([db.name, d]);
            }
        };
        worker.addEventListener('message', handler);
        worker.postMessage({ type: 'search', requestId, querySeq: seqSeq, dbName: db.name, dbUrl: db.url, maxHits: 10 });
    });

    try {
        const pairs = await Promise.all(databases.map(db => makeSearch(db)));
        const results = Object.fromEntries(pairs);
        showMessage('BLAST search complete!', 2000);
        displayBlastResults(seqHeader, queryLen, results);
    } catch (err) {
        console.error('BLAST search error:', err);
        showMessage(`Error: ${err.message}`, 5000);
    }
}

function buildBlastHitElement(hit, hitIndex, dbIndex, queryLen) {
    const W = 60;
    const hsp = hit.hsps[0];

    const div = document.createElement('div');
    div.className = 'blast-hit';
    div.id = `blast-hit-${dbIndex}-${hitIndex}`;

    // Header
    const header = document.createElement('div');
    header.className = 'blast-hit-header';
    header.textContent = `>> ${hit.def || hit.id}  (${hit.length} nt)`;
    div.appendChild(header);

    // Copy buttons
    const actions = document.createElement('div');
    actions.className = 'blast-hit-actions';

    const makeBtn = (label, getFasta) => {
        const btn = document.createElement('button');
        btn.className = 'blast-copy-btn';
        btn.textContent = `\uD83D\uDCCB ${label}`;
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(getFasta()).then(() => {
                btn.classList.add('copied');
                btn.textContent = '\u2713 Copied!';
                setTimeout(() => { btn.classList.remove('copied'); btn.textContent = `\uD83D\uDCCB ${label}`; }, 1800);
            });
        });
        return btn;
    };

    const regionSeq = hsp.strand === '-'
        ? _rcStr((hit.seq || '').substring(hsp.hitStart - 1, hsp.hitEnd))
        : (hit.seq || '').substring(hsp.hitStart - 1, hsp.hitEnd);
    const regionHeader = `${hit.def || hit.id}:${hsp.hitStart}-${hsp.hitEnd}${hsp.strand === '-' ? '(rc)' : ''}`;

    actions.appendChild(makeBtn('Copy region FASTA', () => `>${regionHeader}\n${regionSeq}`));
    actions.appendChild(makeBtn('Copy full seq FASTA', () => `>${hit.def || hit.id}\n${hit.seq || ''}`));
    div.appendChild(actions);

    // Stats
    const stats = document.createElement('div');
    stats.className = 'blast-hit-stats';
    const strandLabel = hsp.strand === '-' ? 'Plus/Minus' : 'Plus/Plus';
    const strandClass = hsp.strand === '-' ? 'stat-strand-minus' : 'stat-strand-plus';
    stats.innerHTML =
        `Score = ${hsp.bitScore} bits (${hsp.score})&nbsp;&nbsp; ` +
        `Identity = ${hsp.identity}/${hsp.alignLen} (${hsp.percent}%)&nbsp;&nbsp; ` +
        `Gaps = ${hsp.gaps}/${hsp.alignLen}<br>` +
        `Strand = <span class="${strandClass}">${strandLabel}</span>&nbsp;&nbsp; ` +
        `Query: ${hsp.queryStart}..${hsp.queryEnd} of ${queryLen} nt &rarr; ` +
        `Subject: ${hsp.hitStart}..${hsp.hitEnd} of ${hit.length} nt`;
    div.appendChild(stats);

    // Alignment blocks
    const pre = document.createElement('pre');
    pre.className = 'blast-alignment-block';
    let alnText = '';
    let qPos = hsp.queryStart;
    let sPos = hsp.hitStart;
    const numW = Math.max(String(hsp.queryEnd).length, String(hsp.hitEnd).length, 1);
    for (let i = 0; i < hsp.querySeq.length; i += W) {
        const qBlock = hsp.querySeq.substring(i, i + W);
        const mBlock = hsp.midline.substring(i, i + W);
        const sBlock = hsp.hitSeq.substring(i, i + W);
        const qAdv = qBlock.replace(/-/g, '').length;
        const sAdv = sBlock.replace(/-/g, '').length;
        const qEnd = qPos + qAdv - 1;
        const sEnd = sPos + sAdv - 1;
        const pad = ' '.repeat(7 + numW + 2);
        alnText += `Query  ${String(qPos).padStart(numW)}  ${qBlock}  ${qEnd}\n`;
        alnText += `${pad}${mBlock}\n`;
        alnText += `Sbjct  ${String(sPos).padStart(numW)}  ${sBlock}  ${sEnd}\n\n`;
        qPos = qEnd + 1;
        sPos = sEnd + 1;
    }
    pre.textContent = alnText;
    div.appendChild(pre);

    return div;
}

function displayBlastResults(queryName, queryLen, results) {
    if (blastResultsModal) {
        blastResultsModal.remove();
        blastResultsModal = null;
    }

    const overlay = document.createElement('div');
    overlay.className = 'blast-results-modal-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'blast-results-dialog-text';

    // ---- Title bar ----
    const titleBar = document.createElement('div');
    titleBar.className = 'blast-text-title-bar';
    const titleEl = document.createElement('span');
    titleEl.textContent = `BLAST Results \u2014 ${queryName}  (${queryLen} nt)`;
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '13px';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.className = 'blast-close-btn';
    closeBtn.onclick = () => { overlay.remove(); blastResultsModal = null; };
    titleBar.appendChild(titleEl);
    titleBar.appendChild(closeBtn);
    dialog.appendChild(titleBar);

    // ---- Tab bar ----
    const tabBar = document.createElement('div');
    tabBar.className = 'blast-tab-bar';
    const panes = [];

    const dbNames = Object.keys(results);

    for (let di = 0; di < dbNames.length; di++) {
        const dbName = dbNames[di];
        const dbResults = results[dbName];
        const hits = dbResults.hits || [];
        const numSeqs = dbResults.numSeqs || 0;
        const searchMs = dbResults.searchMs || 0;

        // Tab button
        const tab = document.createElement('button');
        tab.className = 'blast-tab-btn' + (di === 0 ? ' active' : '');
        tab.textContent = `${dbName}  (${dbResults.error ? 'error' : hits.length + ' hits'})`;
        tabBar.appendChild(tab);

        // Pane
        const pane = document.createElement('div');
        pane.className = 'blast-pane' + (di === 0 ? ' active' : '');

        if (dbResults.error) {
            const errPre = document.createElement('pre');
            errPre.className = 'blast-text-content';
            errPre.textContent = `Error searching ${dbName}:\n${dbResults.error}`;
            pane.appendChild(errPre);
        } else if (hits.length === 0) {
            const noPre = document.createElement('pre');
            noPre.className = 'blast-text-content';
            noPre.textContent = `No significant hits found in ${dbName}.`;
            pane.appendChild(noPre);
        } else {
            // --- Summary section ---
            const summarySection = document.createElement('div');
            summarySection.className = 'blast-summary-section';

            const dbStats = document.createElement('div');
            dbStats.className = 'blast-db-stats';
            dbStats.textContent = `Database: ${dbName}   Sequences: ${numSeqs}   Hits: ${hits.length}   Search time: ${searchMs} ms`;
            summarySection.appendChild(dbStats);

            const table = document.createElement('table');
            table.className = 'blast-summary-table';
            table.innerHTML = `<thead><tr>
                <th>#</th><th>Score</th><th>Ident%</th><th>Align</th>
                <th>Q range</th><th>S range</th><th>S len</th><th>Strand</th><th class="desc">Description</th>
            </tr></thead>`;
            const tbody = document.createElement('tbody');
            hits.forEach((hit, hi) => {
                const hsp = hit.hsps[0];
                const tr = document.createElement('tr');
                tr.className = 'blast-summary-row';
                const strandCls = hsp.strand === '-' ? 'strand-minus' : 'strand-plus';
                const strandTxt = hsp.strand === '-' ? 'Plus/Minus' : 'Plus/Plus';
                tr.innerHTML = `
                    <td>${hi + 1}</td>
                    <td>${hsp.bitScore}</td>
                    <td>${hsp.percent}%</td>
                    <td>${hsp.alignLen}</td>
                    <td>${hsp.queryStart}..${hsp.queryEnd}</td>
                    <td>${hsp.hitStart}..${hsp.hitEnd}</td>
                    <td>${hit.length}</td>
                    <td class="${strandCls}">${strandTxt}</td>
                    <td class="desc">${(hit.def || hit.id).substring(0, 80)}</td>`;
                tr.addEventListener('click', () => {
                    const target = hitsSection.querySelector(`#blast-hit-${di}-${hi}`);
                    if (target) hitsSection.scrollTop = target.offsetTop;
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            summarySection.appendChild(table);
            pane.appendChild(summarySection);

            // --- Hits section ---
            const hitsSection = document.createElement('div');
            hitsSection.className = 'blast-hits-section';
            hits.forEach((hit, hi) => {
                hitsSection.appendChild(buildBlastHitElement(hit, hi, di, queryLen));
            });
            pane.appendChild(hitsSection);
        }

        dialog.appendChild(pane);
        panes.push(pane);

        tab.addEventListener('click', () => {
            tabBar.querySelectorAll('.blast-tab-btn').forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            pane.classList.add('active');
        });
    }

    dialog.insertBefore(tabBar, panes[0]);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    blastResultsModal = overlay;

    overlay.addEventListener('click', e => {
        if (e.target === overlay) { overlay.remove(); blastResultsModal = null; }
    });
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// RE-ALIGN AGAINST CONSENSUS
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

async function realignSequenceAgainstConsensus(index) {
    if (!state.seqs || state.seqs.length < 2) {
        showMessage('Need at least 2 sequences for consensus', 2000);
        return;
    }
    const gappedCons = computeConsensusForSequences(state.seqs.map(s => s.seq));
    if (!gappedCons) {
        showMessage('Could not compute consensus', 2000);
        return;
    }
    try {
        const { args: extraArgs, seqType } = getMafftExtraArgs();
        const consensusArgs = [...extraArgs];
        if (seqType !== '2') consensusArgs.push('-E', seqType);

        showMessage('Re-aligning sequence against consensus...', 0);
        const alignedProfile = await alignSequenceToConsensusProfile(state.seqs[index].seq, gappedCons, consensusArgs);

        pushUndo('realign-to-consensus');
        state.seqs = state.seqs.map((seqObj, seqIndex) => {
            const nextSeq = seqIndex === index
                ? alignedProfile.seq
                : _rebuildSequenceWithInsertedProfileColumns(seqObj.seq, alignedProfile.layout, alignedProfile.extraColumnsPerSlot);
            return {
                ...seqObj,
                seq: nextSeq,
                gaplessPositions: calculateGaplessPositions(nextSeq)
            };
        });

        renderAlignment();
        showMessage(`Re-aligned "${state.seqs[index].header}" against consensus`, 2200);
    } catch (err) {
        console.error('Consensus realign failed:', err);
        showMessage(`Consensus realign failed: ${err.message}`, 4000);
    }
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// DOT-PLOT (integrated from Doter)
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

let _dotPlotWorker = null;
let _dotPlotState = {
    matchMap: null,
    spinMode: true,
    seqA: '', seqB: '', nameA: '', nameB: '',
    sourceSeqA: '', sourceSeqB: '',
    scores: null, rows: 0, cols: 0,
    scoreMin: 0, scoreMax: 1,
    threshold: 0.55, windowSize: 9, zoom: 1,
    dotImage: null, computing: false,
    lastRow: -1, lastCol: -1,
    pinnedRow: -1, pinnedCol: -1,
    meta: null,
    alignMapA: null,
    alignMapB: null,
    rowIndexA: -1,
    rowIndexB: -1,
    _frozen: false,
    _frozenRow: -1,
    _frozenCol: -1
};
const DOT_AXIS_PAD = 50;


// Old v1 dot plot (kept for reference, can be removed later)
function _buildUngappedToAlignMap(alignedSeq) {
    if (!alignedSeq) return null;
    const map = [];
    for (let i = 0; i < alignedSeq.length; i++) {
        const ch = alignedSeq[i];
        if (ch !== '-' && ch !== '.') map.push(i + 1);
    }
    return map;
}

function _dotSeqContext(seq, pos0, radius = 8) {
    if (!seq || pos0 < 0 || pos0 >= seq.length) return '';
    const start = Math.max(0, pos0 - radius);
    const end = Math.min(seq.length, pos0 + radius + 1);
    const left = seq.substring(start, pos0);
    const center = seq[pos0] || 'N';
    const right = seq.substring(pos0 + 1, end);
    return `${left}[${center}]${right}`;
}

function _dotNormAt(row, col) {
    const S = _dotPlotState;
    if (S.spinMode && S.matchMap) return S.matchMap[row * S.cols + col];
    if (!S.scores) return 0;
    const range = S.scoreMax - S.scoreMin || 1;
    return (S.scores[row * S.cols + col] - S.scoreMin) / range;
}

// --- SPIN word-match computation (k-mer exact matching) ---
let _dotWordWorker = null;
function _dotComputeWord(seqA, seqB, wordSize) {
    return new Promise((res, rej) => {
        if (!_dotWordWorker) _dotWordWorker = new Worker('doter-word-worker.js');
        const w = _dotWordWorker;
        const ok = (e) => { w.removeEventListener('message', ok); w.removeEventListener('error', no);
            if (e.data.error) { rej(new Error(e.data.error)); return; } res(e.data); };
        const no = (e) => { w.removeEventListener('message', ok); w.removeEventListener('error', no); rej(e); };
        w.addEventListener('message', ok);
        w.addEventListener('error', no);
        w.postMessage({ seqA, seqB, wordSize });
    });
}

// --- Mode toggle handler ---
function _dotOnModeChange() {
    const S = _dotPlotState;
    const spinRadio = document.querySelector('input[name="dotPlotMode"][value="spin"]');
    S.spinMode = spinRadio ? spinRadio.checked : true;
    const slider = document.getElementById('dotPlotThreshold');
    const val = document.getElementById('dotPlotThreshVal');
    const win = document.getElementById('dotPlotWindow');
    if (S.spinMode) {
        if (win) { win.max = 20; win.min = 2; if (parseInt(win.value) > 20) win.value = 9; }
        if (slider) slider.disabled = true;
        if (val) val.textContent = 'N/A';
    } else {
        if (win) { win.max = 61; win.min = 1; }
        if (slider) slider.disabled = false;
        if (slider && val) val.textContent = slider.value + '%';
    }
}

function _dotApplyZoom(factor, anchorX, anchorY) {
    const S = _dotPlotState;
    const vp = document.getElementById('dotPlotViewport');
    if (!vp || (!S.scores && !S.matchMap)) return;

    const vpRect = vp.getBoundingClientRect();
    const ax = anchorX != null ? anchorX : vpRect.left + vpRect.width / 2;
    const ay = anchorY != null ? anchorY : vpRect.top + vpRect.height / 2;
    const mx = ax - vpRect.left + vp.scrollLeft - DOT_AXIS_PAD;
    const my = ay - vpRect.top + vp.scrollTop - DOT_AXIS_PAD;
    const col = mx / S.zoom;
    const row = my / S.zoom;

    S.zoom = Math.max(0.5, Math.min(24, Math.round(S.zoom * factor * 10) / 10));
    _dotRender();

    vp.scrollLeft = DOT_AXIS_PAD + col * S.zoom - (ax - vpRect.left);
    vp.scrollTop = DOT_AXIS_PAD + row * S.zoom - (ay - vpRect.top);

    if (S.lastRow >= 0) {
        _dotDrawOverlay(S.lastRow, S.lastCol);
        _dotUpdateHoverInfo(S.lastRow, S.lastCol, { force: S._frozen });
    }
}

function _dotBindPlotWheel(el) {
    if (!el || el._dotWheelBound) return;
    el._dotWheelBound = true;
    el.addEventListener('wheel', (e) => {
        const S = _dotPlotState;
        if ((!S.scores && !S.matchMap)) return;
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            _dotApplyZoom(factor, e.clientX, e.clientY);
        }
    }, { passive: false });
}

function _dotUpdateHoverInfo(row, col, options = {}) {
    var S = _dotPlotState;
    var hoverEl = document.getElementById('dotPlotHover');
    var panelEl = document.getElementById('dotPlotAlignPanel');
    const force = options.force === true;

    if (S._frozen && !force) {
        const frozenRow = S._frozenRow >= 0 ? S._frozenRow : S.pinnedRow;
        const frozenCol = S._frozenCol >= 0 ? S._frozenCol : S.pinnedCol;
        if (hoverEl && frozenRow >= 0 && frozenCol >= 0) {
            hoverEl.textContent = `Frozen at A:${frozenRow + 1}/${S.rows}  B:${frozenCol + 1}/${S.cols}`;
        }
        if (panelEl) {
            panelEl.style.border = '2px solid #4a9eff';
            panelEl.style.background = '#f0f8ff';
        }
        return;
    }

    var norm = _dotNormAt(row, col);
    var chA = S.seqA[row] || 'N', chB = S.seqB[col] || 'N';

    // SPIN-style diagonal registration: column k shows A[row+k] above B[col+k]
    var ctx = parseInt(document.getElementById('dotPlotContextRadius')?.value) || 30;
    var aLine = '', bLine = '', guide = '';
    var aStart = Math.max(0, row - ctx);
    var bStart = Math.max(0, col - ctx);
    var aEnd = Math.min(S.seqA.length, row + ctx + 1);
    var bEnd = Math.min(S.seqB.length, col + ctx + 1);

    for (var k = -ctx; k <= ctx; k++) {
        var ar = row + k;
        var br = col + k;
        var aCh = (ar >= 0 && ar < S.seqA.length) ? S.seqA[ar] : ' ';
        var bCh = (br >= 0 && br < S.seqB.length) ? S.seqB[br] : ' ';
        aLine += aCh;
        bLine += bCh;
        guide += (ar >= 0 && ar < S.seqA.length && br >= 0 && br < S.seqB.length && aCh === bCh) ? '|' : ' ';
    }

    var cursorCol = ctx;
    if (cursorCol >= 0 && cursorCol < guide.length) {
        guide = guide.substring(0, cursorCol) + '^' + guide.substring(cursorCol + 1);
    }

    if (hoverEl) {
        hoverEl.textContent = 'A:' + (row + 1) + '/' + S.rows + '  B:' + (col + 1) + '/' + S.cols + '  ' +
            (S.spinMode ? 'match=' + norm : 'score=' + norm.toFixed(3)) + '  ' + chA + ' vs ' + chB +
            '  A[' + (aStart + 1) + '-' + aEnd + '] B[' + (bStart + 1) + '-' + bEnd + ']';
    }

    if (panelEl) {
        panelEl.style.border = S._frozen ? '2px solid #4a9eff' : '1px solid #d8d8d8';
        panelEl.style.background = S._frozen ? '#f0f8ff' : '#f7f7f7';

        var aLabel = Math.max(1, row - ctx + 1);
        var bLabel = Math.max(1, col - ctx + 1);
        panelEl.textContent =
            'A ' + String(aLabel).padStart(5) + '  ' + aLine + '\n' +
            ' '.repeat(9) + guide + '\n' +
            'B ' + String(bLabel).padStart(5) + '  ' + bLine;

        S._copyRegion = {
            aSlice: S.seqA.substring(aStart, aEnd),
            bSlice: S.seqB.substring(bStart, bEnd),
            aStart: aStart,
            bStart: bStart,
            nameA: S.nameA,
            nameB: S.nameB
        };
    }

    if (panelEl) panelEl.style.display = 'block';
}


function _dotClearHoverInfo() {
    const S = _dotPlotState;
    if (S._frozen) return;
    const hoverEl = document.getElementById('dotPlotHover');
    const metaEl = document.getElementById('dotPlotAlignMeta');
    const panelEl = document.getElementById('dotPlotAlignPanel');
    if (hoverEl) hoverEl.textContent = '';
    if (metaEl) metaEl.textContent = '';
    if (panelEl) panelEl.textContent = 'A: -\n   \nB: -';
}

function _getDotWorker() {
    if (!_dotPlotWorker) _dotPlotWorker = new Worker('doter-worker.js');
    return _dotPlotWorker;
}

function _dotCompute(seqA, seqB, windowSize, mode) {
    return new Promise((res, rej) => {
        const w = _getDotWorker();
        const ok = (e) => { w.removeEventListener('message', ok); w.removeEventListener('error', no);
            if (e.data.error) { rej(new Error(e.data.error)); return; } res(e.data); };
        const no = (e) => { w.removeEventListener('message', ok); w.removeEventListener('error', no); rej(e); };
        w.addEventListener('message', ok);
        w.addEventListener('error', no);
        w.postMessage({ seqA, seqB, windowSize, mode });
    });
}

function _dotBuildImage() {
    const S = _dotPlotState;
    // SPIN mode: binary matchMap (white dot on black background)
    if (S.spinMode && S.matchMap) {
        const img = new ImageData(S.cols, S.rows);
        const d = img.data;
        for (let i = 0, j = 0; i < S.rows * S.cols; i++, j += 4) {
            const v = S.matchMap[i] ? 255 : 0;
            d[j] = v; d[j+1] = v; d[j+2] = v; d[j+3] = 255;
        }
        S.dotImage = img;
        return;
    }
    // Doter mode: grayscale scores (black=high similarity, white=low)
    if (!S.scores) return;
    const img = new ImageData(S.cols, S.rows);
    const d = img.data;
    const range = S.scoreMax - S.scoreMin || 1;
    const thr = S.threshold;
    for (let i = 0, j = 0; i < S.rows * S.cols; i++, j += 4) {
        const n = (S.scores[i] - S.scoreMin) / range;
        const v = n >= thr ? Math.round((1 - n) * 255) : 255;
        d[j] = v; d[j + 1] = v; d[j + 2] = v; d[j + 3] = 255;
    }
    S.dotImage = img;
}

function _dotNiceStep(seqLen, maxTicks) {
    const raw = seqLen / maxTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    let step;
    if (norm <= 1) step = 1;
    else if (norm <= 2) step = 2;
    else if (norm <= 5) step = 5;
    else step = 10;
    return Math.max(1, step * mag);
}

function _dotRender() {
    const S = _dotPlotState;
    if (!S.dotImage) return;
    const canvas = document.getElementById('dotPlotCanvas');
    const overlay = document.getElementById('dotPlotOverlay');
    if (!canvas || !overlay) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = window.devicePixelRatio || 1;
    const z = S.zoom;
    const plotW = Math.round(S.cols * z);
    const plotH = Math.round(S.rows * z);
    const totalW = DOT_AXIS_PAD + plotW + 1;
    const totalH = DOT_AXIS_PAD + plotH + 1;
    // HiDPI: scale backing store, keep CSS size at logical pixels
    canvas.width = totalW * dpr; canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px'; canvas.style.height = totalH + 'px';
    overlay.width = totalW * dpr; overlay.height = totalH * dpr;
    overlay.style.width = totalW + 'px'; overlay.style.height = totalH + 'px';
    ctx.scale(dpr, dpr);
    // overlay context also needs HiDPI scaling
    const oCtx = overlay.getContext('2d');
    oCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, totalW, totalH);

    const tmp = document.createElement('canvas');
    tmp.width = S.cols; tmp.height = S.rows;
    tmp.getContext('2d').putImageData(S.dotImage, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, DOT_AXIS_PAD, DOT_AXIS_PAD, plotW, plotH);

    // Axes
    ctx.font = '11px system-ui, sans-serif';
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.strokeRect(DOT_AXIS_PAD + 0.5, DOT_AXIS_PAD + 0.5, plotW, plotH);

    const maxTicksX = Math.max(2, Math.floor(plotW / 50));
    const maxTicksY = Math.max(2, Math.floor(plotH / 40));
    const stepX = _dotNiceStep(S.cols, maxTicksX);
    const stepY = _dotNiceStep(S.rows, maxTicksY);

    ctx.fillStyle = '#555'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (let pos = stepX; pos <= S.cols; pos += stepX) {
        const x = DOT_AXIS_PAD + Math.round(pos * z) + 0.5;
        ctx.beginPath(); ctx.moveTo(x, DOT_AXIS_PAD); ctx.lineTo(x, DOT_AXIS_PAD - 5); ctx.stroke();
        ctx.fillText(String(pos), x, DOT_AXIS_PAD - 6);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let pos = stepY; pos <= S.rows; pos += stepY) {
        const y = DOT_AXIS_PAD + Math.round(pos * z) + 0.5;
        ctx.beginPath(); ctx.moveTo(DOT_AXIS_PAD, y); ctx.lineTo(DOT_AXIS_PAD - 5, y); ctx.stroke();
        ctx.fillText(String(pos), DOT_AXIS_PAD - 7, y);
    }

    // Axis titles
    ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = 'bold 11px system-ui, sans-serif';
    const nameB = S.nameB.length > 30 ? S.nameB.substring(0, 30) + '...' : S.nameB;
    const nameA = S.nameA.length > 30 ? S.nameA.substring(0, 30) + '...' : S.nameA;
    ctx.fillText(nameB, DOT_AXIS_PAD + plotW / 2, 2);
    ctx.save(); ctx.translate(12, DOT_AXIS_PAD + plotH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(nameA, 0, 0); ctx.restore();

    // Detect interesting regions for side panel
    setTimeout(() => _dotDetectRegions(), 50);
}

function _dotFitView() {
    const S = _dotPlotState;
    if ((!S.scores && !S.matchMap)) return;
    const vp = document.getElementById('dotPlotViewport');
    if (!vp) return;
    const vw = (vp.clientWidth || 600) - DOT_AXIS_PAD - 20;
    const vh = (vp.clientHeight || 400) - DOT_AXIS_PAD - 20;
    if (S.cols === 0 || S.rows === 0) return;
    const z = Math.min(vw / S.cols, vh / S.rows, 24);
    S.zoom = Math.max(0.5, Math.round(z * 10) / 10);
    _dotRender();
}

// Detect top-scoring diagonal regions for the side navigation list
function _dotDetectRegions() {
    const S = _dotPlotState;
    if ((!S.scores && !S.matchMap)) return;
    const regions = [];

    if (S.spinMode && S.matchMap) {
        // SPIN: find consecutive runs of word matches on each diagonal
        const minRun = Math.max(4, Math.floor(Math.min(S.rows, S.cols) * 0.08));
        for (let d = -(S.rows - 1); d < S.cols; d++) {
            let runStart = -1, runLen = 0;
            const startR = d < 0 ? -d : 0;
            const endR = Math.min(S.rows, S.cols - d);
            for (let r = startR; r < endR; r++) {
                const c = r + d;
                if (c < 0 || c >= S.cols || r >= S.rows) continue;
                if (S.matchMap[r * S.cols + c]) {
                    if (runStart < 0) runStart = r;
                    runLen++;
                } else {
                    if (runLen >= minRun) {
                        regions.push({ row: runStart, col: runStart + d, length: runLen, avgScore: 1, diagonal: d });
                    }
                    runStart = -1; runLen = 0;
                }
            }
            if (runLen >= minRun) {
                regions.push({ row: runStart, col: runStart + d, length: runLen, avgScore: 1, diagonal: d });
            }
        }
    } else if (S.scores) {
        // Doter: find runs where sliding-window score exceeds threshold
        const minRun = Math.max(6, Math.min(15, Math.floor(Math.min(S.rows, S.cols) * 0.12)));
        const minScore = S.threshold * S.windowSize * 0.9;
        for (let d = -(S.rows - 1); d < S.cols; d++) {
            let runStart = -1, runSum = 0, runLen = 0;
            const startR = d < 0 ? -d : 0;
            const endR = Math.min(S.rows, S.cols - d);
            for (let r = startR; r < endR; r++) {
                const c = r + d;
                if (c < 0 || c >= S.cols || r >= S.rows) continue;
                const score = S.scores[r * S.cols + c];
                if (score >= minScore) {
                    if (runStart < 0) runStart = r;
                    runSum += score;
                    runLen++;
                } else {
                    if (runLen >= minRun) {
                        regions.push({ row: runStart, col: runStart + d, length: runLen, avgScore: runSum / (runLen * S.windowSize), diagonal: d });
                    }
                    runStart = -1; runSum = 0; runLen = 0;
                }
            }
            if (runLen >= minRun) {
                regions.push({ row: runStart, col: runStart + d, length: runLen, avgScore: runSum / (runLen * S.windowSize), diagonal: d });
            }
        }
    }

    const isSelf = S.seqA === S.seqB && S.rows === S.cols;
    const filtered = regions.filter(r => !(r.diagonal === 0 && isSelf && r.length >= S.rows * 0.8));
    filtered.sort((a, b) => b.length - a.length || b.avgScore - a.avgScore);
    S.regions = filtered.slice(0, 30);
    _dotRenderRegionList();
}

function _dotRenderRegionList() {
    const S = _dotPlotState;
    const listEl = document.getElementById('dotPlotRegionList');
    const itemsEl = document.getElementById('dotPlotRegionItems');
    if (!listEl || !itemsEl) return;

    if (!S.regions || S.regions.length === 0) {
        listEl.style.display = 'none';
        return;
    }

    listEl.style.display = 'block';
    itemsEl.innerHTML = S.regions.map((r, i) => {
        const pct = (r.avgScore * 100).toFixed(1);
        return `<div style="padding:3px 6px;cursor:pointer;border-bottom:1px solid #eee;"
            onmouseenter="this.style.background='#d0e4ff'"
            onmouseleave="this.style.background=''"
            onclick="_dotGoToRegion(${i})"
            title="Diagonal run: ${r.length}bp, ${pct}% similarity">
            <b>#${i + 1}</b> ${r.length}bp ${pct}%
            <span style="color:#888;font-size:10px;">A${r.row + 1}-${r.row + r.length} / B${r.col + 1}-${r.col + r.length}</span>
          </div>`;
    }).join('');
}

function _dotGoToRegion(idx) {
    const S = _dotPlotState;
    if (!S.regions || !S.regions[idx]) return;
    const r = S.regions[idx];
    const vp = document.getElementById('dotPlotViewport');
    if (!vp) return;
    // Scroll to center the region in the viewport
    const cx = DOT_AXIS_PAD + (r.col + r.length / 2) * S.zoom;
    const cy = DOT_AXIS_PAD + (r.row + r.length / 2) * S.zoom;
    vp.scrollLeft = Math.max(0, cx - vp.clientWidth / 2);
    vp.scrollTop = Math.max(0, cy - vp.clientHeight / 2);
    // Highlight the region on overlay
    _dotDrawOverlay(r.row, r.col);
    _dotUpdateHoverInfo(r.row, r.col);
}

function _dotDrawOverlay(row, col) {
    const S = _dotPlotState;
    const overlay = document.getElementById('dotPlotOverlay');
    if (!overlay) return;
    const oCtx = overlay.getContext('2d');
    const z = S.zoom;
    const plotW = Math.round(S.cols * z), plotH = Math.round(S.rows * z);
    const totalW = DOT_AXIS_PAD + plotW + 1;
    const totalH = DOT_AXIS_PAD + plotH + 1;
    oCtx.clearRect(0, 0, totalW, totalH);
    if (row < 0 || col < 0 || row >= S.rows || col >= S.cols) return;
    const colW = plotW / S.cols, rowH = plotH / S.rows;
    const cx = DOT_AXIS_PAD + (col + 0.5) * colW;
    const cy = DOT_AXIS_PAD + (row + 0.5) * rowH;
    // Crosshair
    oCtx.strokeStyle = 'rgba(80,160,255,0.7)'; oCtx.lineWidth = 1;
    oCtx.beginPath();
    oCtx.moveTo(DOT_AXIS_PAD, cy); oCtx.lineTo(DOT_AXIS_PAD + plotW, cy);
    oCtx.moveTo(cx, DOT_AXIS_PAD); oCtx.lineTo(cx, DOT_AXIS_PAD + plotH);
    oCtx.stroke();
    // Diagonal trace â€” snap to pixel grid for crisp alignment with dot image
    const range = S.scoreMax - S.scoreMin || 1;
    oCtx.fillStyle = 'rgba(100,230,160,0.85)';
    const pxSz = Math.max(1, Math.round(colW));
    let r = row, c = col;
    if (S.spinMode && S.matchMap) {
        // SPIN: walk diagonal using binary matchMap
        while (r >= 0 && c >= 0) {
            if (!S.matchMap[r * S.cols + c]) break;
            oCtx.fillRect(DOT_AXIS_PAD + Math.floor(c * colW), DOT_AXIS_PAD + Math.floor(r * rowH), pxSz, pxSz);
            r--; c--;
        }
        r = row + 1; c = col + 1;
        while (r < S.rows && c < S.cols) {
            if (!S.matchMap[r * S.cols + c]) break;
            oCtx.fillRect(DOT_AXIS_PAD + Math.floor(c * colW), DOT_AXIS_PAD + Math.floor(r * rowH), pxSz, pxSz);
            r++; c++;
        }
    } else if (S.scores) {
        // Doter: walk diagonal using normalized scores
        while (r >= 0 && c >= 0) {
            const n = (S.scores[r * S.cols + c] - S.scoreMin) / range;
            if (n < S.threshold) break;
            oCtx.fillRect(DOT_AXIS_PAD + Math.floor(c * colW), DOT_AXIS_PAD + Math.floor(r * rowH), pxSz, pxSz);
            r--; c--;
        }
        r = row + 1; c = col + 1;
        while (r < S.rows && c < S.cols) {
            const n = (S.scores[r * S.cols + c] - S.scoreMin) / range;
            if (n < S.threshold) break;
            oCtx.fillRect(DOT_AXIS_PAD + Math.floor(c * colW), DOT_AXIS_PAD + Math.floor(r * rowH), pxSz, pxSz);
            r++; c++;
        }
    }
    // Position labels
    oCtx.fillStyle = 'rgba(80,160,255,0.95)'; oCtx.font = 'bold 11px system-ui';
    oCtx.textAlign = 'center'; oCtx.textBaseline = 'bottom';
    oCtx.fillText(String(col + 1), cx, DOT_AXIS_PAD - 1);
    oCtx.textAlign = 'right'; oCtx.textBaseline = 'middle';
    oCtx.fillText(String(row + 1), DOT_AXIS_PAD - 2, cy);

    // Draw pinned position marker (red crosshair) if set
    if (S.pinnedRow >= 0 && S.pinnedCol >= 0) {
        const pcx = DOT_AXIS_PAD + (S.pinnedCol + 0.5) * colW;
        const pcy = DOT_AXIS_PAD + (S.pinnedRow + 0.5) * rowH;
        oCtx.strokeStyle = 'rgba(220,50,50,0.85)'; oCtx.lineWidth = 1.5;
        oCtx.beginPath();
        oCtx.moveTo(DOT_AXIS_PAD, pcy); oCtx.lineTo(DOT_AXIS_PAD + plotW, pcy);
        oCtx.moveTo(pcx, DOT_AXIS_PAD); oCtx.lineTo(pcx, DOT_AXIS_PAD + plotH);
        oCtx.stroke();
        // Red square around pinned cell
        oCtx.strokeStyle = 'rgba(220,50,50,0.9)';
        oCtx.lineWidth = 2;
        oCtx.strokeRect(DOT_AXIS_PAD + Math.floor(S.pinnedCol * colW) - 1, DOT_AXIS_PAD + Math.floor(S.pinnedRow * rowH) - 1, colW + 2, rowH + 2);
        // Label
        oCtx.fillStyle = 'rgba(220,50,50,0.95)'; oCtx.font = 'bold 10px system-ui';
        oCtx.textAlign = 'left'; oCtx.textBaseline = 'bottom';
        oCtx.fillText('PIN: A'+String(S.pinnedRow+1)+' / B'+String(S.pinnedCol+1), DOT_AXIS_PAD + 4, DOT_AXIS_PAD - 1);
    }
}

async function openDotPlot(seqA, seqB, nameA, nameB, meta = null) {
    const S = _dotPlotState;
    S.seqA = seqA.toUpperCase(); S.seqB = seqB.toUpperCase();
    S.sourceSeqA = S.seqA; S.sourceSeqB = S.seqB;
    S.nameA = nameA; S.nameB = nameB;
    S.meta = meta || S.meta || null;
    const m = S.meta || {};
    S.rowIndexA = Number.isInteger(m.rowIndexA) ? m.rowIndexA : -1;
    S.rowIndexB = Number.isInteger(m.rowIndexB) ? m.rowIndexB : -1;
    S.alignMapA = m.alignMapA || _buildUngappedToAlignMap(m.alignedSeqA);
    S.alignMapB = m.alignMapB || _buildUngappedToAlignMap(m.alignedSeqB);
    const spinRadio = document.querySelector('input[name="dotPlotMode"][value="spin"]');
    S.spinMode = spinRadio ? spinRadio.checked : true;
    S.windowSize = parseInt(document.getElementById('dotPlotWindow')?.value) || 9;
    S.threshold = (parseInt(document.getElementById('dotPlotThreshold')?.value) || 55) / 100;
    S.pinnedRow = S.pinnedCol = -1;
    S._frozen = false;
    S._frozenRow = S._frozenCol = -1;

    const revComp = document.getElementById('dotPlotRevComp')?.checked;
    if (revComp) {
        const m = { A: 'T', C: 'G', G: 'C', T: 'A', U: 'A', N: 'N' };
        S.seqB = [...S.seqB].reverse().map(b => m[b] ?? 'N').join('');
        S.nameB = nameB + ' (RevComp)';
        if (S.alignMapB) S.alignMapB = [...S.alignMapB].reverse();
    }

    const modal = document.getElementById('dotPlotModal');
    if (modal) showExclusiveModal('dotPlotModal');
    const titleEl = document.getElementById('dotPlotTitle');
    if (titleEl) titleEl.textContent = `Dot Plot: ${nameA} vs ${nameB}${revComp ? ' (rc)' : ''}`;
    const statusEl = document.getElementById('dotPlotStatus');
    if (statusEl) statusEl.textContent = `Computing ${S.seqA.length} x ${S.seqB.length}...`;
    _dotClearHoverInfo();

    S.computing = true;
    const t0 = performance.now();
    try {
        if (S.spinMode) {
            const ws = Math.max(2, S.windowSize);
            const result = await _dotComputeWord(S.seqA, S.seqB, ws);
            S.matchMap = new Uint8Array(result.matchMap);
            S.scores = null;
            S.rows = result.rows; S.cols = result.cols;
            S.scoreMin = 0; S.scoreMax = 1;
        } else {
            const result = await _dotCompute(S.seqA, S.seqB, S.windowSize, 'identity');
            S.scores = new Int16Array(result.scores);
            S.matchMap = null;
            S.rows = result.rows; S.cols = result.cols;
            S.scoreMin = result.min; S.scoreMax = result.max;
        }
    } catch (err) {
        if (statusEl) statusEl.textContent = `Error: ${err.message}`;
        S.computing = false; return;
    }
    const ms = performance.now() - t0;
    S.computing = false;
    _dotBuildImage();
    _dotFitView();
    S.lastRow = S.lastCol = -1;
    if (statusEl) statusEl.textContent = `${S.seqA.length} x ${S.seqB.length} in ${ms < 1000 ? ms.toFixed(0) + ' ms' : (ms / 1000).toFixed(1) + ' s'}.`;
}

async function _dotUnfreeze() {
    const S = _dotPlotState;
    S._frozen = false;
    S._frozenRow = S._frozenCol = -1;
    const bar = document.getElementById('dotPlotSpinScroll');
    if (bar) bar.style.display = 'none';
    const panelEl = document.getElementById('dotPlotAlignPanel');
    if (panelEl) {
        panelEl.style.border = '1px solid #d8d8d8';
        panelEl.style.background = '#f7f7f7';
    }
}


function _initDotPlotEvents() {
    const overlay = document.getElementById('dotPlotOverlay');
    const threshSlider = document.getElementById('dotPlotThreshold');
    const threshVal = document.getElementById('dotPlotThreshVal');
    const recalcBtn = document.getElementById('dotPlotRecalc');
    const exportBtn = document.getElementById('dotPlotExport');
    const closeBtn = document.getElementById('dotPlotCloseBtn');

    if (overlay) {
        let hoverRaf = 0;
        overlay.addEventListener('mousemove', (e) => {
            const S = _dotPlotState;
            if ((!S.scores && !S.matchMap) || S._frozen || hoverRaf) return;
            hoverRaf = requestAnimationFrame(() => {
                hoverRaf = 0;
                const rect = overlay.getBoundingClientRect();
                const col = Math.floor((e.clientX - rect.left - DOT_AXIS_PAD) / S.zoom);
                const row = Math.floor((e.clientY - rect.top - DOT_AXIS_PAD) / S.zoom);
                if (row < 0 || col < 0 || row >= S.rows || col >= S.cols) {
                    _dotClearHoverInfo();
                    return;
                }
                if (row === S.lastRow && col === S.lastCol) return;
                S.lastRow = row; S.lastCol = col;
                try { _dotDrawOverlay(row, col); } catch (e) { console.error('_dotDrawOverlay:', e); }
                try { _dotUpdateHoverInfo(row, col); } catch (e) { console.error('_dotUpdateHoverInfo:', e); }
            });
        });
        overlay.addEventListener('mouseleave', () => {
            if (hoverRaf) { cancelAnimationFrame(hoverRaf); hoverRaf = 0; }
            const oCtx = overlay.getContext('2d');
            const S = _dotPlotState;
            const z = S.zoom;
            const pW = Math.round(S.cols * z), pH = Math.round(S.rows * z);
            const tw = DOT_AXIS_PAD + pW + 1;
            const th = DOT_AXIS_PAD + pH + 1;
            oCtx.clearRect(0, 0, tw, th);
            _dotPlotState.lastRow = _dotPlotState.lastCol = -1;
            _dotClearHoverInfo();
            // Redraw pinned marker if present
            if (_dotPlotState.pinnedRow >= 0) {
                _dotDrawOverlay(_dotPlotState.pinnedRow, _dotPlotState.pinnedCol);
            }
        });
        // Click to pin a coordinate for region copying
        overlay.addEventListener('click', (e) => {
            const S = _dotPlotState;
            if ((!S.scores && !S.matchMap) || S._frozen) return;
            const rect = overlay.getBoundingClientRect();
            const col = Math.floor((e.clientX - rect.left - DOT_AXIS_PAD) / S.zoom);
            const row = Math.floor((e.clientY - rect.top - DOT_AXIS_PAD) / S.zoom);
            if (row < 0 || col < 0 || row >= S.rows || col >= S.cols) return;
            S.pinnedRow = row; S.pinnedCol = col;
            _dotDrawOverlay(row, col);
            _dotUpdateHoverInfo(row, col);
            showMessage(`Pinned: A${row + 1} / B${col + 1}. Click \"Copy Region\" to copy FASTA.`, 2500);
        });
        overlay.addEventListener('dblclick', (e) => {
            const S = _dotPlotState;
            if ((!S.scores && !S.matchMap)) return;
            e.preventDefault();
            const rect = overlay.getBoundingClientRect();
            const col = Math.floor((e.clientX - rect.left - DOT_AXIS_PAD) / S.zoom);
            const row = Math.floor((e.clientY - rect.top - DOT_AXIS_PAD) / S.zoom);
            if (row < 0 || col < 0 || row >= S.rows || col >= S.cols) return;
            if (S._frozen) {
                _dotUnfreeze();
                S.lastRow = row;
                S.lastCol = col;
                _dotUpdateHoverInfo(row, col, { force: true });
                showMessage('Unfrozen.', 1500);
            } else {
                S.pinnedRow = row;
                S.pinnedCol = col;
                S._frozen = true;
                S._frozenRow = row;
                S._frozenCol = col;
                S.lastRow = row;
                S.lastCol = col;
                _dotUpdateHoverInfo(row, col, { force: true });
                _dotDrawOverlay(row, col);
                const bar = document.getElementById('dotPlotSpinScroll');
                if (bar) bar.style.display = 'block';
                showMessage('FROZEN — double-click to unfreeze.', 3000);
            }
        });
        const viewport = document.getElementById('dotPlotViewport');
        _dotBindPlotWheel(viewport);
        _dotBindPlotWheel(overlay);
        const dotModal = document.getElementById('dotPlotModal');
        const dotDialog = document.getElementById('dotPlotDialog');
        [dotModal, dotDialog].forEach((el) => {
            if (!el || el._dotWheelBound) return;
            el._dotWheelBound = true;
            el.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: false, capture: true });
        });
    }
    if (threshSlider) { _dotOnModeChange();
        threshSlider.addEventListener('input', () => {
            threshVal.textContent = threshSlider.value + '%';
            const S = _dotPlotState;
            S.threshold = parseInt(threshSlider.value) / 100;
            if (!S.spinMode && S.scores) { _dotBuildImage(); _dotRender(); }
        }); _dotOnModeChange();
        threshSlider.addEventListener('input', () => {
            const v = parseInt(threshSlider.value);
            if (threshVal) threshVal.textContent = v + '%';
            _dotPlotState.threshold = v / 100;
            if (_dotPlotState.scores) {
                _dotBuildImage();
                _dotRender();
                if (_dotPlotState.lastRow >= 0) {
                    _dotDrawOverlay(_dotPlotState.lastRow, _dotPlotState.lastCol);
                    _dotUpdateHoverInfo(_dotPlotState.lastRow, _dotPlotState.lastCol);
                }
            }
        });
    }
    const ctxInput = document.getElementById('dotPlotContextRadius');
    if (ctxInput) {
        ctxInput.addEventListener('input', () => {
            const S = _dotPlotState;
            if (S.lastRow >= 0 && S.lastCol >= 0) {
                _dotUpdateHoverInfo(S.lastRow, S.lastCol, { force: S._frozen });
            }
        });
    }
    const zoomInBtn = document.getElementById('dotPlotZoomIn');
    const zoomOutBtn = document.getElementById('dotPlotZoomOut');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => _dotApplyZoom(1.15));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => _dotApplyZoom(1 / 1.15));
    if (recalcBtn) {
        recalcBtn.addEventListener('click', () => {
            const S = _dotPlotState;
            if (S.seqA && S.seqB) openDotPlot(S.sourceSeqA || S.seqA, S.sourceSeqB || S.seqB, S.nameA, S.nameB, S.meta);
        });
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const canvas = document.getElementById('dotPlotCanvas');
            const olay = document.getElementById('dotPlotOverlay');
            if (!canvas) return;
            const c = document.createElement('canvas');
            c.width = canvas.width; c.height = canvas.height;
            const cx = c.getContext('2d');
            cx.drawImage(canvas, 0, 0);
            if (olay) cx.drawImage(olay, 0, 0);
            const a = document.createElement('a');
            a.href = c.toDataURL('image/png');
            a.download = `dotplot_${_dotPlotState.nameA}_vs_${_dotPlotState.nameB}.png`;
            a.click();
        });
    }
    const copyBtn = document.getElementById('dotPlotCopyRegion');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const S = _dotPlotState;
            const region = S._copyRegion;
            if (!region && S.pinnedRow < 0) {
                showMessage('Hover over or click the dot plot first to select a region.', 3000);
                return;
            }
            let fasta;
            if (region) {
                fasta = `>${region.nameA}_${region.aStart + 1}-${region.aStart + region.aSlice.length}\n${region.aSlice}\n` +
                        `>${region.nameB}_${region.bStart + 1}-${region.bStart + region.bSlice.length}\n${region.bSlice}`;
            } else {
                // Use pinned position Ã¢â‚¬â€ walk diagonal to find match extent
                const range = S.scoreMax - S.scoreMin || 1;
                const threshold = S.threshold;
                let rBack = S.pinnedRow, cBack = S.pinnedCol;
                while (rBack >= 0 && cBack >= 0) {
                    const n = (S.scores[rBack * S.cols + cBack] - S.scoreMin) / range;
                    if (n < threshold) break;
                    rBack--; cBack--;
                }
                rBack++; cBack++;
                let rFwd = S.pinnedRow + 1, cFwd = S.pinnedCol + 1;
                while (rFwd < S.rows && cFwd < S.cols) {
                    const n = (S.scores[rFwd * S.cols + cFwd] - S.scoreMin) / range;
                    if (n < threshold) break;
                    rFwd++; cFwd++;
                }
                const context = parseInt(document.getElementById('dotPlotContextRadius')?.value) || 5;
                const matchLen = rFwd - rBack;
                const maxSlice = matchLen + 2 * context;
                const aStart = Math.max(0, rBack - context);
                const bStart = Math.max(0, cBack - context);
                const availA = S.seqA.length - aStart;
                const availB = S.seqB.length - bStart;
                const sliceLen = Math.min(maxSlice, availA, availB);
                const aSlice = S.seqA.slice(aStart, aStart + sliceLen);
                const bSlice = S.seqB.slice(bStart, bStart + sliceLen);
                fasta = `>${S.nameA}_${aStart + 1}-${aStart + sliceLen}\n${aSlice}\n` +
                        `>${S.nameB}_${bStart + 1}-${bStart + sliceLen}\n${bSlice}`;
            }
            const len = fasta.split('\n')[1]?.length || 0;
            navigator.clipboard.writeText(fasta).then(() => {
                showMessage(`Copied ${len}bp region as FASTA!`, 2000);
            }).catch(() => showMessage('Copy failed.', 2000));
        });
    }
    // SVG export
    const svgBtn = document.getElementById('dotPlotExportSvg');
    if (svgBtn) {
        svgBtn.addEventListener('click', () => {
            const canvas = document.getElementById('dotPlotCanvas');
            if (!canvas) return;
            const S = _dotPlotState;
            const dataUrl = canvas.toDataURL('image/png');
            const svg = [
                '<?xml version="1.0" encoding="UTF-8"?>',
                `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`,
                `<title>Dot Plot: ${S.nameA} vs ${S.nameB}</title>`,
                `<rect width="${canvas.width}" height="${canvas.height}" fill="white"/>`,
                `<image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/>`,
                '</svg>'
            ].join('\n');
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dotplot_${S.nameA}_vs_${S.nameB}.svg`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            showMessage('Dot plot exported as SVG!', 2000);
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('dotPlotModal');
            if (modal) modal.style.display = 'none';
        });
    }

    // Local help inside the dot plot modal
    const helpBtn = document.getElementById('dotPlotHelpBtn');
    const helpDiv = document.getElementById('dotPlotHelp');
    if (helpBtn && helpDiv) {
        helpBtn.addEventListener('click', () => {
            helpDiv.style.display = (helpDiv.style.display === 'block') ? 'none' : 'block';
        });
    }

    // Mode radio buttons
    document.querySelectorAll('input[name="dotPlotMode"]').forEach(r => {
        r.addEventListener('change', _dotOnModeChange);
    });
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// REPEAT FINDER (Direct, Inverted, Tandem) & TSD FINDER
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

let _repeatFinderSeqIndex = -1;
// Repeat highlighting state
state.repeatHighlights = state.repeatHighlights || new Map(); // repeatId => {start, end, color}
let _lastRepeatResults = [];
const _repeatColorPalette = ["#ff6b6b","#ffa94d","#ffd43b","#69db7c","#4dabf7","#da77f2","#20c997","#ff8787","#74c0fc","#f783ac","#ffe066","#63e6be","#a9e34b","#e599f7","#66d9e8","#fcc419","#94d82d","#ff922b","#be4bdb","#339af0"];

function _syncRepeatFinderModeUI() {
    // All modes use the same general params now Ã¢â‚¬â€ nothing to toggle
}

function openRepeatFinder(seqIndex, preferredMode = null) {
    if (seqIndex === undefined || seqIndex === null || seqIndex < 0) seqIndex = 0;
    _repeatFinderSeqIndex = seqIndex;
    if (preferredMode) {
        const modeRadio = document.querySelector(`input[name="repeatMode"][value="${preferredMode}"]`);
        if (modeRadio) modeRadio.checked = true;
    }
    // Populate sequence selector
    const sel = document.getElementById('repeatFinderSeqSelect');
    if (sel) {
        sel.innerHTML = '';
        state.seqs.forEach((s, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            const name = s.header.length > 40 ? s.header.substring(0,40)+'...' : s.header;
            opt.textContent = `${i+1}: ${name}`;
            if (i === seqIndex) opt.selected = true;
            sel.appendChild(opt);
        });
        sel.onchange = () => { _repeatFinderSeqIndex = parseInt(sel.value); };
    }
    _syncRepeatFinderModeUI();
    const modal = document.getElementById('repeatFinderModal');
    if (modal) {
        showExclusiveModal('repeatFinderModal');
        _initRepeatFinderDrag();
    }
    document.getElementById('repeatResults').textContent = 'Click "Run Analysis" to start.';
}

function _initRepeatFinderDrag() {
    const inner = document.getElementById('repeatFinderModalInner');
    const handle = document.getElementById('repeatFinderDragHandle');
    if (!inner || !handle) return;
    let dragX = 0, dragY = 0, startX = 0, startY = 0;
    handle.onmousedown = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        dragX = inner.offsetLeft;
        dragY = inner.offsetTop;
        document.onmousemove = (me) => {
            me.preventDefault();
            inner.style.left = (dragX + me.clientX - startX) + 'px';
            inner.style.top = (dragY + me.clientY - startY) + 'px';
            inner.style.right = 'auto';
        };
        document.onmouseup = () => {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}

function openTsdFinder() {
    const autoMode = document.querySelector('input[name="tsdMode"][value="auto"]');
    if (autoMode) autoMode.checked = true;
    const flankInput = document.getElementById('tsdFlankSize');
    if (flankInput && !flankInput.value) flankInput.value = '30';
    openRepeatFinder(-1, 'tsd');
}

function cloneTsdMarks(markMap = state.tsdMarks) {
    const cloned = new Map();
    markMap?.forEach((posSet, rowIndex) => cloned.set(rowIndex, new Set(posSet)));
    return cloned;
}

function rowsForTsdResults(results) {
    const rowMap = new Map();
    results.forEach(result => {
        if (!Number.isInteger(result.seqIndex) || !state.seqs[result.seqIndex]) return;
        const positions = new Set([...(result.upPositions || []), ...(result.downPositions || [])]
            .filter(position => Number.isInteger(position) && position >= 0));
        if (!positions.size) return;
        const existing = rowMap.get(result.seqIndex) || new Set();
        positions.forEach(position => existing.add(position));
        rowMap.set(result.seqIndex, existing);
    });
    return rowMap;
}

function applyTsdMarking() {
    const results = _lastTsdResults || [];
    if (!results.length) {
        showMessage('Run TSD analysis first.', 2200);
        return;
    }
    const rowMarks = rowsForTsdResults(results);
    if (!rowMarks.size) {
        showMessage('No TSD positions available to mark.', 2200);
        return;
    }

    const style = document.getElementById('tsdMarkStyle')?.value || 'color';
    const color = document.getElementById('tsdMarkColor')?.value || '#ffd54f';
    const backupRows = [];
    const previousMarks = cloneTsdMarks();
    const previousStyle = state.tsdMarkStyle;
    const previousColor = state.tsdMarkColor;

    if (style === 'lowercase') {
        pushUndo('tsd-mark-lowercase');
        state.seqs = state.seqs.map((seqObj, rowIndex) => {
            const markPositions = rowMarks.get(rowIndex);
            const chars = seqObj.seq.toUpperCase().split('');
            markPositions?.forEach(position => {
                if (chars[position] && /[A-Z]/.test(chars[position])) chars[position] = chars[position].toLowerCase();
            });
            const nextSeq = chars.join('');
            if (nextSeq !== seqObj.seq) backupRows.push({ rowIndex, seq: seqObj.seq });
            return { ...seqObj, seq: nextSeq, gaplessPositions: calculateGaplessPositions(nextSeq) };
        });
        state.tsdMarks = new Map();
        state.tsdMarkStyle = style;
    } else {
        state.tsdMarks = rowMarks;
        state.tsdMarkStyle = style;
        state.tsdMarkColor = color;
    }

    state.tsdMarkUndo = { style, previousMarks, previousStyle, previousColor, rows: backupRows };
    renderAlignment({ deferConservation: true });
    showMessage(`Marked TSDs in ${rowMarks.size} sequence(s).`, 1800);
}

function undoTsdMarking() {
    const backup = state.tsdMarkUndo;
    if (!backup) {
        if (state.tsdMarks?.size) {
            state.tsdMarks = new Map();
            renderAlignment({ deferConservation: true });
            showMessage('TSD marks cleared.', 1600);
            return;
        }
        showMessage('No TSD marking to undo.', 1800);
        return;
    }

    if (backup.style === 'lowercase') {
        backup.rows.forEach(rowBackup => {
            if (!state.seqs[rowBackup.rowIndex]) return;
            state.seqs[rowBackup.rowIndex] = {
                ...state.seqs[rowBackup.rowIndex],
                seq: rowBackup.seq,
                gaplessPositions: calculateGaplessPositions(rowBackup.seq)
            };
        });
    }
    state.tsdMarks = backup.previousMarks || new Map();
    state.tsdMarkStyle = backup.previousStyle || 'color';
    state.tsdMarkColor = backup.previousColor || '#ffd54f';
    state.tsdMarkUndo = null;
    renderAlignment({ deferConservation: true });
    showMessage('TSD marking undone.', 1600);
}

function _revComp(seq) {
    const m = { A: 'T', C: 'G', G: 'C', T: 'A', U: 'A', N: 'N' };
    return [...seq].reverse().map(b => m[b.toUpperCase()] ?? 'N').join('');
}

/**
 * Find all k-mer repeat matches in a sequence with allowed divergence.
 */
function _findRepeats(seq, minLen, maxDivPct, type) {
    const candidates = [];
    const seqU = seq.toUpperCase();
    const n = seqU.length;
    if (n < minLen * 2) return [];

    const intervalOverlap = (a1, a2, b1, b2) => {
        const left = Math.max(a1, b1);
        const right = Math.min(a2, b2);
        return Math.max(0, right - left + 1);
    };

    // For tandem: look for repeated units adjacent to each other
    if (type === 'tandem') {
        return _findTandemRepeats(seqU, minLen, maxDivPct);
    }

    // For direct/inverted: find matches between different positions
    const maxDiv = maxDivPct / 100;
    const stepLen = Math.max(1, Math.floor(minLen / 2));

    for (let i = 0; i < n - minLen; i += 1) {
        const startJ = type === 'direct' ? i + minLen : 0;
        const endJ = type === 'direct' ? n : i;
        for (let j = startJ; j <= n - minLen; j += 1) {
            if (type === 'direct' && j <= i) continue;
            // Try to extend match
            let matchLen = 0;
            let mismatches = 0;
            const seqI = seqU.substring(i);
            const seqJ = type === 'inverted' ? _revComp(seqU.substring(j)) : seqU.substring(j);
            const maxExtend = Math.min(seqI.length, seqJ.length);
            for (let k = 0; k < maxExtend; k++) {
                if (seqI[k] !== seqJ[k]) mismatches++;
                matchLen++;
                if (mismatches / matchLen > maxDiv && matchLen > minLen) {
                    // Roll back the character that pushed us over threshold
                    matchLen--;
                    if (seqI[k] !== seqJ[k]) mismatches--;
                    break;
                }
            }
            const finalDiv = matchLen > 0 ? mismatches / matchLen : 1;
            if (matchLen >= minLen && finalDiv <= maxDiv) {
                // For direct repeats in the same strand, reject self-overlapping pairs
                // to avoid trivial shifted-suffix artifacts.
                if (type === 'direct') {
                    const aEnd = i + matchLen - 1;
                    const bEnd = j + matchLen - 1;
                    const disjoint = aEnd < j || bEnd < i;
                    if (!disjoint) continue;
                }

                candidates.push({
                    posA: i,
                    posB: j,
                    length: matchLen,
                    divergence: (finalDiv * 100).toFixed(1),
                    seqA: seqI.substring(0, matchLen),
                    seqB: seqJ.substring(0, matchLen)
                });
            }
            // Skip ahead if no match at minimum length
            if (matchLen < minLen) {
                // jump
            }
        }
        if (candidates.length > 500) break; // safety limit
    }

    // Deduplicate highly overlapping shifted hits from the same repeat pair.
    candidates.sort((a, b) => {
        if (b.length !== a.length) return b.length - a.length;
        return parseFloat(a.divergence) - parseFloat(b.divergence);
    });

    const results = [];
    for (const cand of candidates) {
        const isDuplicate = results.some(r => {
            const candA2 = cand.posA + cand.length - 1;
            const candB2 = cand.posB + cand.length - 1;
            const rA2 = r.posA + r.length - 1;
            const rB2 = r.posB + r.length - 1;

            const ovA = intervalOverlap(cand.posA, candA2, r.posA, rA2);
            const ovB = intervalOverlap(cand.posB, candB2, r.posB, rB2);
            const denom = Math.max(1, Math.min(cand.length, r.length));

            return (ovA / denom) >= 0.7 && (ovB / denom) >= 0.7;
        });
        if (!isDuplicate) {
            results.push(cand);
            if (results.length >= 100) break;
        }
    }

    return results;
}

/**
 * Find tandem repeats using simplified TRF-like logic.
 */
function _findTandemRepeats(seq, minUnitLen, maxDivPct) {
    const results = [];
    const n = seq.length;
    const maxDiv = maxDivPct / 100;
    const maxUnitLen = Math.min(Math.floor(n / 2), 200);

    for (let unitLen = minUnitLen; unitLen <= maxUnitLen; unitLen++) {
        for (let start = 0; start <= n - unitLen * 2; start++) {
            const unit = seq.substring(start, start + unitLen);
            // Count how many tandem copies
            let copies = 1;
            let totalMismatches = 0;
            let pos = start + unitLen;
            while (pos + unitLen <= n) {
                const next = seq.substring(pos, pos + unitLen);
                let mm = 0;
                for (let k = 0; k < unitLen; k++) {
                    if (unit[k] !== next[k]) mm++;
                }
                if (mm / unitLen <= maxDiv) {
                    copies++;
                    totalMismatches += mm;
                    pos += unitLen;
                } else {
                    break;
                }
            }
            if (copies >= 2) {
                const totalLen = copies * unitLen;
                const avgDiv = (totalMismatches / ((copies - 1) * unitLen) * 100).toFixed(1);
                const overlaps = results.some(r =>
                    Math.abs(r.start - start) < unitLen && Math.abs(r.unitLen - unitLen) < 3);
                if (!overlaps) {
                    results.push({
                        start, end: start + totalLen,
                        unitLen, copies,
                        unit, divergence: avgDiv,
                        region: seq.substring(start, start + totalLen)
                    });
                }
            }
        }
        if (results.length > 100) break;
    }
    results.sort((a, b) => b.copies * b.unitLen - a.copies * a.unitLen);
    return results.slice(0, 50);
}

function _tsdBase(char) {
    const base = (char || '').toUpperCase().replace('U', 'T');
    return /^[ACGTN]$/.test(base) ? base : '';
}

function _collectUngappedBasesWithColumns(seq, startCol, endCol) {
    const bases = [];
    const columns = [];
    const start = Math.max(0, Math.min(startCol, endCol));
    const end = Math.min(seq.length - 1, Math.max(startCol, endCol));
    for (let column = start; column <= end; column++) {
        const base = _tsdBase(seq[column]);
        if (!base) continue;
        bases.push(base);
        columns.push(column);
    }
    return { bases, columns };
}

function _sliceCollectedWindow(collected, startIndex, length) {
    return {
        bases: collected.bases.slice(startIndex, startIndex + length),
        columns: collected.columns.slice(startIndex, startIndex + length)
    };
}

function _tsdMismatchCount(firstSeq, secondSeq) {
    let mismatches = 0;
    for (let position = 0; position < firstSeq.length; position++) {
        const firstBase = firstSeq[position];
        const secondBase = secondSeq[position];
        if (firstBase === 'N' || secondBase === 'N') {
            mismatches += 0.5;
        } else if (firstBase !== secondBase) {
            mismatches += 1;
        }
    }
    return mismatches;
}

function _columnConservationScores(seqs, aliLen) {
    const scores = new Array(aliLen).fill(0);
    for (let column = 0; column < aliLen; column++) {
        const counts = {};
        let validCount = 0;
        for (const seqObj of seqs) {
            const base = _tsdBase(seqObj.seq[column]);
            if (!base || base === 'N') continue;
            counts[base] = (counts[base] || 0) + 1;
            validCount++;
        }
        if (validCount === 0) continue;
        const topCount = Math.max(...Object.values(counts));
        const identity = topCount / validCount;
        const coverage = validCount / Math.max(1, seqs.length);
        scores[column] = identity * coverage;
    }
    return scores;
}

function _windowMean(values, start, width) {
    const safeStart = Math.max(0, Math.min(values.length - 1, start));
    const safeEnd = Math.min(values.length, safeStart + width);
    if (safeEnd <= safeStart) return 0;
    let total = 0;
    for (let index = safeStart; index < safeEnd; index++) total += values[index];
    return total / (safeEnd - safeStart);
}

function _findSineBoundaryColumns(seqs, mode, params, aliLen) {
    const flankSize = params.flankSize || 30;
    if (mode === 'manual') {
        return {
            leftBoundary: Math.max(0, (params.upEnd || flankSize) - 1) + 1,
            rightBoundary: Math.max(0, (params.downStart || (aliLen - flankSize + 1)) - 1) - 1,
            upStart: Math.max(0, (params.upStart || 1) - 1),
            upEnd: Math.max(0, (params.upEnd || flankSize) - 1),
            downStart: params.downStart ? Math.max(0, params.downStart - 1) : Math.max(0, aliLen - flankSize),
            downEnd: params.downEnd ? Math.min(aliLen - 1, params.downEnd - 1) : aliLen - 1,
            label: 'manual'
        };
    }

    if (mode === 'topseq') {
        const topSeq = seqs[0]?.seq || '';
        let firstNonGap = -1;
        let lastNonGap = -1;
        for (let column = 0; column < topSeq.length; column++) {
            if (_tsdBase(topSeq[column])) {
                if (firstNonGap < 0) firstNonGap = column;
                lastNonGap = column;
            }
        }
        if (firstNonGap < 0) firstNonGap = flankSize;
        if (lastNonGap < 0) lastNonGap = Math.max(firstNonGap, aliLen - flankSize - 1);
        return {
            leftBoundary: firstNonGap,
            rightBoundary: lastNonGap,
            upStart: Math.max(0, firstNonGap - flankSize),
            upEnd: Math.max(0, firstNonGap - 1),
            downStart: Math.min(aliLen - 1, lastNonGap + 1),
            downEnd: Math.min(aliLen - 1, lastNonGap + flankSize),
            label: 'top sequence'
        };
    }

    const scores = _columnConservationScores(seqs, aliLen);
    const windowWidth = Math.max(6, Math.min(14, Math.floor(aliLen / 20) || 6));
    const threshold = seqs.length < 8 ? 0.62 : 0.54;
    let leftBoundary = 0;
    let rightBoundary = aliLen - 1;

    for (let start = 0; start <= aliLen - windowWidth; start++) {
        if (_windowMean(scores, start, windowWidth) >= threshold) {
            leftBoundary = start;
            break;
        }
    }
    for (let start = aliLen - windowWidth; start >= 0; start--) {
        if (_windowMean(scores, start, windowWidth) >= threshold) {
            rightBoundary = start + windowWidth - 1;
            break;
        }
    }

    return {
        leftBoundary,
        rightBoundary,
        upStart: Math.max(0, leftBoundary - flankSize),
        upEnd: Math.max(0, leftBoundary - 1),
        downStart: Math.min(aliLen - 1, rightBoundary + 1),
        downEnd: Math.min(aliLen - 1, rightBoundary + flankSize),
        label: `auto ${leftBoundary + 1}/${rightBoundary + 1}`
    };
}

function _findBestTsdInFlanks(upstreamWindow, downstreamWindow, rightBoundary, minTsdLen, maxTsdLen, maxDiv) {
    let bestTsd = null;
    const maxUpstreamOffset = 6;
    for (let tsdLen = minTsdLen; tsdLen <= maxTsdLen; tsdLen++) {
        if (upstreamWindow.bases.length < tsdLen || downstreamWindow.bases.length < tsdLen) continue;
        const closestUpstreamStart = upstreamWindow.bases.length - tsdLen;
        for (let upstreamOffset = 0; upstreamOffset <= Math.min(maxUpstreamOffset, closestUpstreamStart); upstreamOffset++) {
            const upstreamStart = closestUpstreamStart - upstreamOffset;
            const upstreamCandidate = _sliceCollectedWindow(upstreamWindow, upstreamStart, tsdLen);
            const upstreamSeq = upstreamCandidate.bases.join('');
            for (let downstreamStart = 0; downstreamStart <= downstreamWindow.bases.length - tsdLen; downstreamStart++) {
                const downstreamCandidate = _sliceCollectedWindow(downstreamWindow, downstreamStart, tsdLen);
                const downstreamSeq = downstreamCandidate.bases.join('');
                const mismatches = _tsdMismatchCount(upstreamSeq, downstreamSeq);
                const divergence = mismatches / tsdLen;
                if (divergence > maxDiv) continue;
                const downstreamColumn = downstreamCandidate.columns[0] ?? rightBoundary + 1;
                const boundaryDistance = Math.abs(downstreamColumn - (rightBoundary + 1));
                const score = (1 - divergence) * Math.sqrt(tsdLen) - upstreamOffset * 0.025 - boundaryDistance * 0.002;
                if (!bestTsd || score > bestTsd.score || (score === bestTsd.score && tsdLen > bestTsd.length)) {
                    bestTsd = {
                        score,
                        length: tsdLen,
                        divergence,
                        mismatches,
                        upSeq: upstreamSeq,
                        downSeq: downstreamSeq,
                        upCols: upstreamCandidate.columns,
                        downCols: downstreamCandidate.columns,
                        upstreamOffset,
                        boundaryDistance
                    };
                }
            }
        }
    }
    return bestTsd;
}

/**
 * TSD Finder - find Target Site Duplications at SINE/TE insertion boundaries.
 * Auto mode anchors on the conserved 5-prime SINE boundary and fuzzily scans a
 * broader 3-prime region, because the 3-prime tail/end is often less crisp.
 */
function _findTSD(seqs, mode, params) {
    const results = [];
    const aliLen = Math.max(...seqs.map(seqObj => seqObj.seq.length));
    const minTsdLen = params.minLen || 4;
    const maxTsdLen = params.maxLen || 20;
    const maxDiv = (params.maxDiv || 20) / 100;
    const flankSize = params.flankSize || 30;
    const boundaries = _findSineBoundaryColumns(seqs, mode, params, aliLen);
    const searchSlack = Math.max(flankSize, maxTsdLen + 12);

    for (let seqIndex = 0; seqIndex < seqs.length; seqIndex++) {
        const seq = seqs[seqIndex].seq;
        let upstreamWindow;
        let downstreamWindow;

        if (mode === 'manual') {
            upstreamWindow = _collectUngappedBasesWithColumns(seq, boundaries.upStart, boundaries.upEnd);
            downstreamWindow = _collectUngappedBasesWithColumns(seq, boundaries.downStart, boundaries.downEnd);
        } else {
            const upstreamCollected = _collectUngappedBasesWithColumns(seq, Math.max(0, boundaries.leftBoundary - flankSize - maxTsdLen - 10), boundaries.leftBoundary - 1);
            const upstreamStart = Math.max(0, upstreamCollected.bases.length - flankSize);
            upstreamWindow = _sliceCollectedWindow(upstreamCollected, upstreamStart, upstreamCollected.bases.length - upstreamStart);
            const downstreamStartCol = Math.max(0, boundaries.rightBoundary - searchSlack);
            const downstreamEndCol = Math.min(aliLen - 1, boundaries.rightBoundary + flankSize + maxTsdLen + 12);
            downstreamWindow = _collectUngappedBasesWithColumns(seq, downstreamStartCol, downstreamEndCol);
        }

        if (upstreamWindow.bases.length < minTsdLen || downstreamWindow.bases.length < minTsdLen) continue;
        const bestTsd = _findBestTsdInFlanks(upstreamWindow, downstreamWindow, boundaries.rightBoundary, minTsdLen, maxTsdLen, maxDiv);
        if (!bestTsd) continue;

        const upFirst = bestTsd.upCols[0] ?? boundaries.upStart;
        const upLast = bestTsd.upCols[bestTsd.upCols.length - 1] ?? boundaries.upEnd;
        const downFirst = bestTsd.downCols[0] ?? boundaries.downStart;
        const downLast = bestTsd.downCols[bestTsd.downCols.length - 1] ?? boundaries.downEnd;
        results.push({
            seqName: seqs[seqIndex].header,
            seqIndex,
            tsdLen: bestTsd.length,
            upTSD: bestTsd.upSeq,
            downTSD: bestTsd.downSeq,
            divergence: (bestTsd.divergence * 100).toFixed(1),
            mismatches: bestTsd.mismatches,
            upCols: `${upFirst + 1}-${upLast + 1}`,
            downCols: `${downFirst + 1}-${downLast + 1}`,
            upPositions: bestTsd.upCols.slice(),
            downPositions: bestTsd.downCols.slice(),
            boundary: boundaries.label,
            downstreamOffset: downFirst - (boundaries.rightBoundary + 1)
        });
    }
    return results;
}

function runRepeatAnalysis() {
    if (!state.seqs || state.seqs.length === 0) {
        showMessage('No sequences loaded', 2000);
        return;
    }
    const resultsEl = document.getElementById('repeatResults');
    if (!resultsEl) return;
    const mode = document.querySelector('input[name="repeatMode"]:checked')?.value || 'tandem';
    const scopeRadio = document.querySelector('input[name="repeatScope"]:checked');
    const scope = scopeRadio ? scopeRadio.value : 'single';

    let targets = [];
    if (scope === 'all') {
        state.seqs.forEach((s, i) => targets.push({ index: i, seq: s.seq.replace(/[-. ]/g, ''), name: s.header, fullSeq: s.seq }));
    } else if (scope === 'selected' && state.selectedRows.size > 0) {
        Array.from(state.selectedRows).sort((a,b)=>a-b).forEach(i => {
            const s = state.seqs[i];
            targets.push({ index: i, seq: s.seq.replace(/[-. ]/g, ''), name: s.header, fullSeq: s.seq });
        });
    }
    if (targets.length === 0) {
        const si = _repeatFinderSeqIndex >= 0 ? _repeatFinderSeqIndex : 0;
        targets = [{ index: si, seq: state.seqs[si]?.seq.replace(/[-. ]/g, '') || '', name: state.seqs[si]?.header || '', fullSeq: state.seqs[si]?.seq || '' }];
    }

    const minLen = parseInt(document.getElementById('repeatMinLen')?.value) || 10;
    const maxDiv = parseInt(document.getElementById('repeatMaxDiv')?.value) || 15;

    resultsEl.textContent = `Searching ${scope} ${mode} repeats in ${targets.length} sequence${targets.length!==1?'s':''}...`;
    setTimeout(() => {
        try {
            let allResults = [];
            let displayName = '';
            let totalLen = 0;
            for (const t of targets) {
                if (!t.seq) continue;
                if (!displayName) displayName = t.name;
                totalLen += t.seq.length;
                const gs2al = [];
                let gs = 0;
                for (let c = 0; c < t.fullSeq.length; c++) {
                    if (!' -.'.includes(t.fullSeq[c])) { gs2al[gs++] = c; }
                }
                const seqResults = _findRepeats(t.seq, minLen, maxDiv, mode);
                const mapped = seqResults.map(r => {
                    if (mode === 'tandem') {
                        const sG = r.start;
                        r.start = (sG >= 0 && sG < gs2al.length) ? (gs2al[sG] ?? r.start) : r.start;
                        const eG = r.end - 1;
                        r.end = (eG >= 0 && eG < gs2al.length && gs2al[eG] !== undefined) ? gs2al[eG] + 1 : r.end;
                    } else {
                        const oL = r.length;
                        const gA = r.posA;
                        r.posA = (gA >= 0 && gA < gs2al.length) ? (gs2al[gA] ?? r.posA) : r.posA;
                        const gB = r.posB;
                        r.posB = (gB >= 0 && gB < gs2al.length) ? (gs2al[gB] ?? r.posB) : r.posB;
                        let col = r.posA, bases = 0;
                        while (col < t.fullSeq.length && bases < oL) {
                            if (!' -.'.includes(t.fullSeq[col])) bases++;
                            col++;
                        }
                        r.alignEnd = col;
                    }
                    return r;
                });
                allResults = allResults.concat(mapped);
            }
            if (allResults.length === 0) {
                resultsEl.textContent = `No ${mode} repeats found (min ${minLen}bp, max ${maxDiv}% divergence).`;
                return;
            }
            _lastRepeatResults = allResults;
            const name = targets.length === 1 ? displayName : `${targets.length} sequences`;
            _renderRepeatResultsHTML(resultsEl, allResults, mode, name, totalLen);
        } catch (e) {
            resultsEl.textContent = `Error: ${e.message}`;
        }
    }, 50);
}

function _renderRepeatResultsHTML(el, results, mode, seqName, seqLength) {
    const colors = _repeatColorPalette;
    const hl = state.repeatHighlights;

    let html = `<div style="margin-bottom:8px;font-weight:bold;font-size:12px;">${mode} repeats in ${seqName} (${seqLength} bp) Ã¢â‚¬â€ ${results.length} found</div>`;
    html += '<div style="font-size:11px;color:#666;margin-bottom:4px;">Click a row to highlight in alignment. Click again to remove.</div>';

    if (mode === 'tandem') {
        html += `<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#f0f0f0;">` +
            `<th style="text-align:left;padding:2px 4px;width:30px;">#</th>` +
            `<th style="text-align:left;padding:2px 4px;">Colour</th>` +
            `<th style="text-align:right;padding:2px 4px;">Start</th>` +
            `<th style="text-align:right;padding:2px 4px;">End</th>` +
            `<th style="text-align:right;padding:2px 4px;">Unit</th>` +
            `<th style="text-align:right;padding:2px 4px;">Copies</th>` +
            `<th style="text-align:right;padding:2px 4px;">Div%</th>` +
            `<th style="text-align:left;padding:2px 4px;">Unit seq</th>` +
            `<th style="padding:2px 4px;width:20px;"></th>` +
            `</tr></thead><tbody>`;
        results.forEach((r, i) => {
            const color = colors[i % colors.length];
            const rid = 'tandem-' + i;
            const active = hl.has(rid);
            const bg = active ? color : 'transparent';
            html += `<tr data-repeat-id="${rid}" data-start="${r.start}" data-end="${r.end}" data-color="${color}" data-active="${active ? '1' : ''}"` +
                ` style="cursor:pointer;background:${bg};" ` +
                ` onmouseover="if(!this.dataset.active)this.style.background='${color}33'" ` +
                ` onmouseout="if(!this.dataset.active)this.style.background='transparent'" ` +
                ` onclick="_toggleRepeatHighlight(this)">` +
                `<td style="padding:2px 4px;">${i+1}</td>` +
                `<td style="padding:2px 4px;"><span style="display:inline-block;width:14px;height:14px;background:${color};border-radius:2px;vertical-align:middle;"></span></td>` +
                `<td style="text-align:right;padding:2px 4px;">${r.start+1}</td>` +
                `<td style="text-align:right;padding:2px 4px;">${r.end}</td>` +
                `<td style="text-align:right;padding:2px 4px;">${r.unitLen}bp</td>` +
                `<td style="text-align:right;padding:2px 4px;">${r.copies}Ãƒâ€”</td>` +
                `<td style="text-align:right;padding:2px 4px;">${r.divergence}%</td>` +
                `<td style="padding:2px 4px;font-family:monospace;">${r.unit}</td>` +
                `<td style="padding:2px 4px;text-align:center;"><button class="repeat-remove-btn" style="background:none;border:none;color:#c00;font-size:14px;cursor:pointer;line-height:1;padding:0 2px;" title="Remove this highlight" onclick="event.stopPropagation();_removeRepeatHighlight(this.closest('tr'))">Ãƒâ€”</button></td>` +
                `</tr>`;
        });
        html += '</tbody></table>';
    } else {
        html += `<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#f0f0f0;">` +
            `<th style="text-align:left;padding:2px 4px;width:30px;">#</th>` +
            `<th style="text-align:left;padding:2px 4px;">Colour</th>` +
            `<th style="text-align:right;padding:2px 4px;">PosA</th>` +
            `<th style="text-align:right;padding:2px 4px;">PosB</th>` +
            `<th style="text-align:right;padding:2px 4px;">Len</th>` +
            `<th style="text-align:right;padding:2px 4px;">Div%</th>` +
            `<th style="text-align:left;padding:2px 4px;">SeqA</th>` +
            `<th style="padding:2px 4px;width:20px;"></th>` +
            `</tr></thead><tbody>`;
        results.forEach((r, i) => {
            const color = colors[i % colors.length];
            const rid = mode + '-' + i;
            const active = hl.has(rid);
            const bg = active ? color : 'transparent';
            const alignEnd = r.alignEnd != null ? r.alignEnd : (r.posA + r.length);
            html += `<tr data-repeat-id="${rid}" data-start="${r.posA}" data-end="${alignEnd}" data-color="${color}" data-active="${active ? '1' : ''}"` +
                ` style="cursor:pointer;background:${bg};" ` +
                ` onmouseover="if(!this.dataset.active)this.style.background='${color}33'" ` +
                ` onmouseout="if(!this.dataset.active)this.style.background='transparent'" ` +
                ` onclick="_toggleRepeatHighlight(this)">` +
                `<td style="padding:2px 4px;">${i+1}</td>` +
                `<td style="padding:2px 4px;"><span style="display:inline-block;width:14px;height:14px;background:${color};border-radius:2px;vertical-align:middle;"></span></td>` +
                `<td style="text-align:right;padding:2px 4px;">${r.posA+1}</td>` +
                `<td style="text-align:right;padding:2px 4px;">${r.posB+1}</td>` +
                `<td style="text-align:right;padding:2px 4px;">${r.length}</td>` +
                `<td style="text-align:right;padding:2px 4px;">${r.divergence}%</td>` +
                `<td style="padding:2px 4px;font-family:monospace;">${r.seqA.length > 50 ? r.seqA.substring(0,50)+'...' : r.seqA}</td>` +
                `<td style="padding:2px 4px;text-align:center;"><button class="repeat-remove-btn" style="background:none;border:none;color:#c00;font-size:14px;cursor:pointer;line-height:1;padding:0 2px;" title="Remove this highlight" onclick="event.stopPropagation();_removeRepeatHighlight(this.closest('tr'))">Ãƒâ€”</button></td>` +
                `</tr>`;
        });
        html += '</tbody></table>';
    }
    el.innerHTML = html;
}

// Direct-DOM highlight removal (fast, no full renderAlignment)
function _removeRepeatHighlight(row) {
    const rid = row.dataset.repeatId;
    const start = parseInt(row.dataset.start);
    const end = parseInt(row.dataset.end);
    const hl = state.repeatHighlights;
    if (hl.has(rid)) {
        hl.delete(rid);
        // Remove backgrounds directly from DOM spans
        const allSpans = document.querySelectorAll('.seq-data > span[data-pos]');
        for (const span of allSpans) {
            const pos = parseInt(span.dataset.pos);
            if (pos >= start && pos < end) {
                span.style.removeProperty('background-color');
                const t = span.title || '';
                span.title = t.replace(/ \| repeat region/g, '');
            }
        }
    }
    // Update row state
    row.dataset.active = '';
    row.style.background = 'transparent';
}

function _toggleRepeatHighlight(row) {
    const rid = row.dataset.repeatId;
    const start = parseInt(row.dataset.start);
    const end = parseInt(row.dataset.end);
    const color = row.dataset.color;
    const hl = state.repeatHighlights;
    if (hl.has(rid)) {
        hl.delete(rid);
        // Fast path: remove backgrounds directly from DOM
        const allSpans = document.querySelectorAll('.seq-data > span[data-pos]');
        for (const span of allSpans) {
            const pos = parseInt(span.dataset.pos);
            if (pos >= start && pos < end) {
                span.style.removeProperty('background-color');
                const t = span.title || '';
                span.title = t.replace(/ \| repeat region/g, '');
            }
        }
        row.dataset.active = '';
        row.style.background = 'transparent';
    } else {
        hl.set(rid, { start, end, color });
        // Fast path: apply backgrounds directly to DOM
        const allSpans = document.querySelectorAll('.seq-data > span[data-pos]');
        for (const span of allSpans) {
            const pos = parseInt(span.dataset.pos);
            if (isNaN(pos)) continue;
            const ch = span.textContent;
            if (ch === '-' || ch === '.') continue;
            if (pos >= start && pos < end) {
                span.style.setProperty('background-color', color + '66', 'important');
                span.title = span.title ? span.title + ' | repeat region' : 'repeat region';
            }
        }
        requestAnimationFrame(() => _scrollToColumn(start));
        row.dataset.active = '1';
        row.style.background = color;
    }
}

function _applyLineHighlights(dataSpan) {
    const hl = state.repeatHighlights;
    if (!hl || hl.size === 0) return;
    const spans = dataSpan.children;
    for (let i = 0; i < spans.length; i++) {
        const span = spans[i];
        const pos = parseInt(span.dataset.pos);
        if (isNaN(pos)) continue;
        // Skip gap characters Ã¢â‚¬â€ do not colour gaps within repeats
        const ch = span.textContent;
        if (ch === '-' || ch === '.') continue;
        for (const [rid, info] of hl) {
            if (pos >= info.start && pos < info.end) {
                span.style.setProperty('background-color', info.color + '66', 'important');
                span.title = span.title ? span.title + ' | repeat region' : 'repeat region';
                break; // first matching highlight wins
            }
        }
    }
}

function _clearRepeatHighlights() {
    // Fast path: clear all highlight backgrounds directly from DOM
    state.repeatHighlights.clear();
    document.querySelectorAll('.seq-data > span[data-pos]').forEach(span => {
        span.style.removeProperty('background-color');
        const t = span.title || '';
        span.title = t.replace(/ \| repeat region/g, '');
    });
    // Refresh results table
    const el = document.getElementById('repeatResults');
    if (el && _lastRepeatResults.length) {
        const mode = document.querySelector('input[name="repeatMode"]:checked')?.value || 'tandem';
        const seqIndex = _repeatFinderSeqIndex >= 0 ? _repeatFinderSeqIndex : 0;
        const seqName = state.seqs[seqIndex]?.header || '';
        _renderRepeatResultsHTML(el, _lastRepeatResults, mode, seqName);
    }
}

function _scrollToColumn(colIndex) {
    const container = document.getElementById('alignmentContainer');
    if (!container) return;
    // Measure actual character width from a rendered span
    const sampleSpan = container.querySelector('.seq-data > span[data-pos]');
    let charW = 7.8; // fallback for 13px Courier New
    if (sampleSpan) { charW = sampleSpan.getBoundingClientRect().width || charW; }
    container.scrollLeft = Math.max(0, colIndex * charW - 120);
}

function _initRepeatFinderEvents() {
    const clearBtn = document.getElementById('repeatClearHighlightsBtn');
    if (clearBtn) clearBtn.addEventListener('click', _clearRepeatHighlights);
    const closeBtn = document.getElementById('repeatFinderCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        _clearRepeatHighlights();
        const modal = document.getElementById('repeatFinderModal');
        if (modal) modal.style.display = 'none';
    });
    const runBtn = document.getElementById('repeatRunBtn');
    if (runBtn) runBtn.addEventListener('click', runRepeatAnalysis);
        // Trim mode toggle: show/hide Clear Soft button
    document.querySelectorAll('input[name="trimMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const clearBtn = document.getElementById('clearSoftTrimButton');
            const isSoft = radio.value === 'soft';
            if (clearBtn) {
                clearBtn.style.display = (isSoft && state.softTrimBoundaries) ? '' : 'none';
            }
        });
    });

    document.querySelectorAll('input[name="repeatMode"]').forEach(radio => {
        radio.addEventListener('change', _syncRepeatFinderModeUI);
    });
    _syncRepeatFinderModeUI();
}
