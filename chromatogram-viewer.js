/**
 * ChromatogramViewer - lightweight Sanger trace viewer, sangerQC-style.
 * Renders A/C/G/T trace lines, base calls, and quality shading on a canvas
 * with pan/zoom, plus an optional simpler "quality bars" or "sequence only" view.
 */
(function (global) {
    'use strict';

    const BASE_COLOR = { A: '#2ca02c', C: '#1f77b4', G: '#333333', T: '#d62728' };
    const QUAL_HIGH = '#c8f0c8', QUAL_MED = '#fff3c4', QUAL_LOW = '#f8c8c8';

    let modal, canvas, ctx, titleEl, styleSelect, statusEl;
    let current = null; // { header, data (AB1Parser result), edits: Map(pos->base) }
    let viewState = { scale: 1, offsetX: 0, isDragging: false, dragStartX: 0, dragStartOffset: 0 };

    function qualityColor(q) {
        if (q >= 20) return QUAL_HIGH;
        if (q >= 10) return QUAL_MED;
        return QUAL_LOW;
    }

    function ensureModal() {
        if (modal) return;
        modal = document.createElement('div');
        modal.id = 'chromatogramModal';
        modal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10005;overflow:hidden;';
        modal.innerHTML = `
            <div style="background:white;margin:30px auto;padding:16px;max-width:95vw;max-height:92vh;width:1000px;min-width:560px;min-height:420px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);position:relative;display:flex;flex-direction:column;overflow:hidden;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <h3 style="margin:0;" id="chromatogramTitle">Chromatogram</h3>
                    <button id="chromatogramCloseBtn" style="border:none;background:none;font-size:20px;cursor:pointer;padding:0 4px;" title="Close">x</button>
                </div>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;font-size:12px;flex-wrap:wrap;">
                    <label>View:
                        <select id="chromatogramStyle" title="Choose how much detail to render">
                            <option value="sequence">Sequence only (FASTA)</option>
                            <option value="quality">Sequence + quality bars</option>
                            <option value="full" selected>Full chromatogram (traces + peaks)</option>
                        </select>
                    </label>
                    <span style="border-left:1px solid #ccc;height:16px;display:inline-block;margin:0 4px;"></span>
                    <button id="chromatogramZoomOut" style="font-size:11px;padding:2px 8px;" title="Zoom out">-</button>
                    <button id="chromatogramZoomIn" style="font-size:11px;padding:2px 8px;" title="Zoom in">+</button>
                    <button id="chromatogramResetView" style="font-size:11px;padding:2px 8px;" title="Reset pan/zoom">Reset</button>
                    <span style="border-left:1px solid #ccc;height:16px;display:inline-block;margin:0 4px;"></span>
                    <span style="font-size:11px;color:#666;">Click a base to correct its call.</span>
                    <span style="flex:1;"></span>
                    <button id="chromatogramApplyEdits" style="font-size:11px;padding:2px 8px;background:#4CAF50;color:white;border:none;border-radius:3px;" title="Write corrected bases back into the alignment">Apply Edits</button>
                </div>
                <div id="chromatogramViewport" style="overflow:auto;flex:1;min-height:260px;border:1px solid #ccc;position:relative;">
                    <canvas id="chromatogramCanvas" width="2000" height="320"></canvas>
                </div>
                <div id="chromatogramStatus" style="font-size:11px;color:#666;margin-top:4px;min-height:14px;"></div>
            </div>`;
        document.body.appendChild(modal);
        canvas = modal.querySelector('#chromatogramCanvas');
        ctx = canvas.getContext('2d');
        titleEl = modal.querySelector('#chromatogramTitle');
        styleSelect = modal.querySelector('#chromatogramStyle');
        statusEl = modal.querySelector('#chromatogramStatus');

        modal.querySelector('#chromatogramCloseBtn').addEventListener('click', close);
        modal.addEventListener('mousedown', (e) => { if (e.target === modal) close(); });
        styleSelect.addEventListener('change', render);
        modal.querySelector('#chromatogramZoomIn').addEventListener('click', () => zoom(1.4));
        modal.querySelector('#chromatogramZoomOut').addEventListener('click', () => zoom(1 / 1.4));
        modal.querySelector('#chromatogramResetView').addEventListener('click', () => { viewState.scale = 1; viewState.offsetX = 0; render(); });
        modal.querySelector('#chromatogramApplyEdits').addEventListener('click', applyEdits);

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.offsetX);
        });
        canvas.addEventListener('mousedown', (e) => {
            viewState.isDragging = true;
            viewState.dragStartX = e.clientX;
            viewState.dragStartOffset = viewState.offsetX;
        });
        window.addEventListener('mousemove', (e) => {
            if (!viewState.isDragging) return;
            viewState.offsetX = viewState.dragStartOffset + (e.clientX - viewState.dragStartX);
            render();
        });
        window.addEventListener('mouseup', () => {
            if (viewState.isDragging && Math.abs(viewState.offsetX - viewState.dragStartOffset) < 3) {
                handleClick(lastClickEvent);
            }
            viewState.isDragging = false;
        });
        let lastClickEvent = null;
        canvas.addEventListener('click', (e) => { lastClickEvent = e; if (!viewState.isDragging) handleClick(e); });
    }

    function zoom(factor, aroundX) {
        const oldScale = viewState.scale;
        viewState.scale = Math.max(0.2, Math.min(20, viewState.scale * factor));
        if (typeof aroundX === 'number') {
            const ratio = viewState.scale / oldScale;
            viewState.offsetX = aroundX - (aroundX - viewState.offsetX) * ratio;
        }
        render();
    }

    function baseAt(pos) {
        if (current.edits.has(pos)) return current.edits.get(pos);
        return current.data.sequence[pos];
    }

    function handleClick(e) {
        if (!e || !current) return;
        const d = current.data;
        if (styleSelect.value !== 'full' || !d.peakLocations.length) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - viewState.offsetX) / viewState.scale;
        // find nearest peak
        let best = -1, bestDist = Infinity;
        for (let i = 0; i < d.peakLocations.length; i++) {
            const dist = Math.abs(d.peakLocations[i] - x);
            if (dist < bestDist) { bestDist = dist; best = i; }
        }
        if (best === -1 || bestDist > 40) return;
        promptBaseEdit(best);
    }

    function promptBaseEdit(pos) {
        const current2 = baseAt(pos);
        const choice = prompt(`Correct base call at position ${pos + 1} (current: ${current2}). Enter A, C, G, T, or N:`, current2);
        if (!choice) return;
        const b = choice.trim().toUpperCase()[0];
        if (!'ACGTN-'.includes(b)) { showStatus('Invalid base.'); return; }
        current.edits.set(pos, b);
        render();
    }

    function showStatus(msg) { statusEl.textContent = msg; }

    function applyEdits() {
        if (!current || current.edits.size === 0) { showStatus('No edits to apply.'); return; }
        const seqs = (typeof state !== 'undefined' && state.seqs) || [];
        const seqObj = seqs.find(s => s.header === current.header);
        if (!seqObj) { showStatus('Sequence not found in current alignment.'); return; }
        if (typeof pushUndo === 'function') pushUndo('ab1-base-edit');
        let seq = seqObj.seq;
        let gapless = -1;
        const chars = seq.split('');
        for (let i = 0; i < chars.length; i++) {
            if (chars[i] === '-') continue;
            gapless++;
            if (current.edits.has(gapless)) chars[i] = current.edits.get(gapless);
        }
        seqObj.seq = chars.join('');
        if (typeof renderAlignment === 'function') renderAlignment();
        showStatus(`Applied ${current.edits.size} edit(s) to ${current.header}.`);
        current.edits.clear();
    }

    function render() {
        if (!current) return;
        const d = current.data;
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        const mode = styleSelect.value;
        if (mode === 'sequence') {
            renderSequenceOnly(d);
            return;
        }

        ctx.save();
        ctx.translate(viewState.offsetX, 0);
        ctx.scale(viewState.scale, 1);

        const baseTrackY = mode === 'quality' ? 40 : h - 60;
        const traceTop = 20, traceHeight = h - 100;

        if (mode === 'quality') {
            drawQualityBars(d);
        } else {
            drawTraces(d, traceTop, traceHeight);
        }
        drawBaseCalls(d, baseTrackY, mode);

        ctx.restore();
    }

    function renderSequenceOnly(d) {
        ctx.font = '13px monospace';
        ctx.fillStyle = '#333';
        const text = d.sequence.match(/.{1,80}/g) || [d.sequence];
        text.forEach((line, i) => ctx.fillText(line, 10, 24 + i * 18));
    }

    function drawQualityBars(d) {
        const n = d.sequence.length;
        const spacing = 12;
        for (let i = 0; i < n; i++) {
            const x = i * spacing;
            const q = d.quality[i] || 0;
            ctx.fillStyle = qualityColor(q);
            ctx.fillRect(x, 60, spacing - 1, Math.min(60, q * 2));
        }
    }

    function drawTraces(d, top, height) {
        const n = d.numSamples;
        if (!n) return;
        const maxVal = Math.max(1, ...['A', 'C', 'G', 'T'].flatMap(b => d.traces[b] || []));
        const xScale = 3; // px per sample before canvas-level zoom
        ['A', 'C', 'G', 'T'].forEach(base => {
            const arr = d.traces[base];
            if (!arr || !arr.length) return;
            ctx.beginPath();
            ctx.strokeStyle = BASE_COLOR[base];
            ctx.lineWidth = 1;
            for (let i = 0; i < arr.length; i++) {
                const x = i * xScale;
                const y = top + height - (arr[i] / maxVal) * height;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });
        canvas.dataset.xScale = xScale;
    }

    function drawBaseCalls(d, y, mode) {
        const xScale = mode === 'full' ? parseFloat(canvas.dataset.xScale || '3') : 12;
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i < d.sequence.length; i++) {
            const base = baseAt(i);
            const x = mode === 'full' && d.peakLocations[i] != null ? d.peakLocations[i] * xScale : i * xScale + 6;
            const q = d.quality[i] || 0;
            if (mode === 'full') {
                ctx.fillStyle = qualityColor(q);
                ctx.fillRect(x - 6, y - 14, 12, 28);
            }
            ctx.fillStyle = current.edits.has(i) ? '#e67e00' : (BASE_COLOR[base] || '#333');
            ctx.fillText(base, x, y + 4);
        }
        ctx.textAlign = 'left';
    }

    function open(header) {
        const traceData = ((typeof state !== 'undefined' && state.ab1Traces) || {})[header];
        if (!traceData) { alert('No AB1 trace data available for this sequence.'); return; }
        ensureModal();
        current = { header, data: traceData, edits: new Map() };
        viewState = { scale: 1, offsetX: 0, isDragging: false, dragStartX: 0, dragStartOffset: 0 };
        titleEl.textContent = `Chromatogram — ${header}`;
        canvas.width = Math.max(2000, (traceData.numSamples || 1000) * 3 + 100);
        modal.style.display = 'block';
        showStatus('');
        render();
    }

    function close() {
        if (modal) modal.style.display = 'none';
        current = null;
    }

    global.ChromatogramViewer = { open, close };
})(typeof window !== 'undefined' ? window : this);
