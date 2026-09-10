/*
 * block-mask-overlay.js — renders a 2D block mask as a translucent rectangle
 * layer over the REAL ViewAlign alignment grid.
 *
 * Self-contained: reads window.state.seqs and the #alignmentContainer DOM,
 * measures its own metrics from rendered elements, and re-syncs on scroll /
 * re-render. No edits to script.js — index.html just needs:
 *   <script src="block-mask.js"></script>
 *   <script src="block-mask-overlay.js"></script>
 *
 * API (window.BlockMaskOverlay):
 *   applyLive(presetOrParams)   compute a mask from the loaded alignment + draw
 *   applyMask(maskJSON)         draw a supplied mask (stage-1 &mask= path)
 *   loadMaskFromUrl(url)        fetch + validate + applyMask
 *   setEnabled(bool) / setOpacity(n) / setColor(type, hex)
 *   clear()
 */
(function () {
  'use strict';

  var TYPE_COLORS = {
    CONSERVATIVE: '#16a34a',
    MOSAIC: '#f59e0b',
    DECAY_SLOPE: '#8b5cf6',
    DIVERGENT: '#cbd5e1',
    SIMPLE_REPEAT: '#ec4899'
  };
  var SVGNS = 'http://www.w3.org/2000/svg';

  var st = {
    mask: null,
    enabled: true,
    opacity: 0.5,
    colors: Object.assign({}, TYPE_COLORS),
    observer: null,
    scrollBound: false,
    rafPending: false
  };

  function container() { return document.getElementById('alignmentContainer'); }

  function seqs() {
    // script.js declares `const state` at classic-script top level: shared in
    // the global lexical scope, reachable as a free variable here, but NOT on
    // window. Guard with typeof so this file also works if loaded standalone.
    try {
      if (typeof state === 'object' && state && Array.isArray(state.seqs)) return state.seqs;
    } catch (e) { /* ReferenceError when state is truly absent */ }
    if (window.state && Array.isArray(window.state.seqs)) return window.state.seqs;
    return null;
  }

  function seqsToFasta() {
    var s = seqs();
    if (!s) return null;
    var out = [];
    for (var i = 0; i < s.length; i++) out.push('>' + (s[i].header || ('seq' + i)) + '\n' + s[i].seq);
    return out.join('\n') + '\n';
  }

  // ---- geometry, measured from the rendered grid --------------------------

  function measure() {
    var c = container();
    if (!c) return null;
    var rows = c.querySelectorAll('.seq-line[data-seq-index]');
    if (!rows.length) return null;
    var pRect = c.getBoundingClientRect();
    var sx = c.scrollLeft, sy = c.scrollTop;

    function relX(el) { return el.getBoundingClientRect().x - pRect.x + sx; }
    function relY(el) { return el.getBoundingClientRect().y - pRect.y + sy; }

    var first = rows[0];
    var rowH = first.getBoundingClientRect().height;
    var seqData = first.querySelector('.seq-data');
    if (!seqData || !rowH) return null;
    var spans = seqData.querySelectorAll('span[data-pos]');
    if (spans.length < 2) return null;

    // charW + col-0 x from two real residue spans (skip non-residue markers)
    var a = null, b = null;
    for (var k = 0; k < spans.length; k++) {
      var p = parseInt(spans[k].getAttribute('data-pos'), 10);
      if (isNaN(p)) continue;
      if (a === null) { a = { p: p, el: spans[k] }; continue; }
      if (p !== a.p) { b = { p: p, el: spans[k] }; break; }
    }
    if (!a || !b) return null;
    var ax = relX(a.el), bx = relX(b.el);
    var charW = (bx - ax) / (b.p - a.p);
    var col0X = ax - a.p * charW;

    // visual row order -> y, and header -> visual ordinal
    var s = seqs();
    var rowTop = [], headerToVis = {};
    for (var r = 0; r < rows.length; r++) {
      rowTop.push(relY(rows[r]));
      var si = parseInt(rows[r].getAttribute('data-seq-index'), 10);
      var hdr = (s && s[si]) ? s[si].header : null;
      if (hdr != null && headerToVis[hdr] === undefined) headerToVis[hdr] = r;
    }

    return {
      c: c, charW: charW, col0X: col0X, rowH: rowH,
      rowTop: rowTop, headerToVis: headerToVis,
      contentW: Math.max(c.scrollWidth, col0X + (st.mask ? st.mask.n_cols : 0) * charW),
      contentH: Math.max(c.scrollHeight, rowTop.length ? rowTop[rowTop.length - 1] + rowH : 0)
    };
  }

  // ---- layer --------------------------------------------------------------

  function ensureLayer(c) {
    if (getComputedStyle(c).position === 'static') c.style.position = 'relative';
    var layer = document.getElementById('blockMaskLayer');
    if (!layer) {
      layer = document.createElementNS(SVGNS, 'svg');
      layer.setAttribute('id', 'blockMaskLayer');
      layer.style.position = 'absolute';
      layer.style.left = '0';
      layer.style.top = '0';
      layer.style.pointerEvents = 'none';
      layer.style.zIndex = '5';
      c.insertBefore(layer, c.firstChild);
    }
    return layer;
  }

  function contiguousRuns(vis) {
    vis = vis.slice().sort(function (x, y) { return x - y; });
    var runs = [], s = vis[0], p = vis[0];
    for (var i = 1; i < vis.length; i++) {
      if (vis[i] === p + 1) { p = vis[i]; continue; }
      runs.push([s, p]); s = vis[i]; p = vis[i];
    }
    if (vis.length) runs.push([s, p]);
    return runs;
  }

  function draw() {
    var c = container();
    if (!c) return;
    var layer = ensureLayer(c);
    layer.innerHTML = '';
    if (!st.enabled || !st.mask) return;
    var m = measure();
    if (!m) return;

    layer.setAttribute('width', m.contentW);
    layer.setAttribute('height', m.contentH);
    layer.style.width = m.contentW + 'px';
    layer.style.height = m.contentH + 'px';

    var lastRow = m.rowTop.length - 1;
    var frag = document.createDocumentFragment();

    m.mask = st.mask;
    st.mask.blocks.forEach(function (blk) {
      var x = m.col0X + blk.col_start * m.charW;
      var w = (blk.col_end - blk.col_start + 1) * m.charW;
      var fill = st.colors[blk.type] || '#999';

      function rect(y, h, op, stroke) {
        var r = document.createElementNS(SVGNS, 'rect');
        r.setAttribute('x', x.toFixed(1));
        r.setAttribute('y', y.toFixed(1));
        r.setAttribute('width', Math.max(0.5, w).toFixed(1));
        r.setAttribute('height', Math.max(1, h).toFixed(1));
        r.setAttribute('fill', fill);
        r.setAttribute('fill-opacity', op.toFixed(3));
        if (stroke) { r.setAttribute('stroke', '#fff'); r.setAttribute('stroke-width', '0.6'); }
        frag.appendChild(r);
      }

      if (blk.rows === 'all') {
        var y0 = m.rowTop[0];
        var y1 = m.rowTop[lastRow] + m.rowH;
        rect(y0, y1 - y0, st.opacity * 0.85, false);
      } else {
        var vis = [];
        for (var i = 0; i < blk.rows.length; i++) {
          var hdr = st.mask.row_headers[blk.rows[i]];
          var v = m.headerToVis[hdr];
          if (v !== undefined) vis.push(v);
        }
        if (!vis.length) return;
        contiguousRuns(vis).forEach(function (run) {
          var y = m.rowTop[run[0]];
          var h = (m.rowTop[run[1]] + m.rowH) - m.rowTop[run[0]];
          rect(y, h, st.opacity, true);
        });
      }
    });
    layer.appendChild(frag);
  }

  function scheduleDraw() {
    if (st.rafPending) return;
    st.rafPending = true;
    requestAnimationFrame(function () { st.rafPending = false; draw(); });
  }

  function bindSync() {
    var c = container();
    if (!c) return;
    if (!st.scrollBound) {
      c.addEventListener('scroll', scheduleDraw, { passive: true });
      window.addEventListener('resize', scheduleDraw);
      st.scrollBound = true;
    }
    if (st.observer) st.observer.disconnect();
    st.observer = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var mm = muts[i];
        if (mm.target && mm.target.id === 'blockMaskLayer') continue;
        // ignore mutations we caused inside the layer
        var touchedLayerOnly = true;
        mm.addedNodes.forEach && mm.addedNodes.forEach(function (n) { if (n.id !== 'blockMaskLayer') touchedLayerOnly = false; });
        if (!touchedLayerOnly) { scheduleDraw(); return; }
      }
    });
    st.observer.observe(c, { childList: true, subtree: true, characterData: false });
  }

  // ---- validation for supplied masks ----------------------------------

  function validateMask(m) {
    if (!m || typeof m !== 'object') return 'not an object';
    if (!Array.isArray(m.blocks)) return 'missing blocks[]';
    if (!Array.isArray(m.row_headers)) return 'missing row_headers[]';
    for (var i = 0; i < m.blocks.length; i++) {
      var b = m.blocks[i];
      if (typeof b.col_start !== 'number' || typeof b.col_end !== 'number') return 'block ' + i + ' bad col range';
      if (b.rows !== 'all' && !Array.isArray(b.rows)) return 'block ' + i + ' bad rows';
    }
    return null;
  }

  // ---- public API ---------------------------------------------------

  var api = {
    applyLive: function (presetOrParams) {
      if (typeof window.BlockMask === 'undefined') { console.warn('[blockmask] block-mask.js not loaded'); return null; }
      var fasta = seqsToFasta();
      if (!fasta) { console.warn('[blockmask] no alignment loaded'); return null; }
      var params = presetOrParams;
      if (typeof presetOrParams === 'string') {
        params = (window.__BLOCKMASK_PRESETS || {})[presetOrParams] || null;
        if (!params) { console.warn('[blockmask] unknown preset ' + presetOrParams); return null; }
      }
      var opts = (typeof presetOrParams === 'string') ? { preset: presetOrParams } : {};
      st.mask = window.BlockMask.computeBlockMask(fasta, params || {}, opts);
      bindSync();
      draw();
      return st.mask;
    },
    applyMask: function (maskJSON) {
      var err = validateMask(maskJSON);
      if (err) { console.warn('[blockmask] invalid mask: ' + err); return false; }
      st.mask = maskJSON;
      bindSync();
      draw();
      return true;
    },
    loadMaskFromUrl: function (url) {
      return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        return api.applyMask(j);
      }).catch(function (e) { console.warn('[blockmask] mask fetch failed: ' + e.message); return false; });
    },
    setEnabled: function (v) { st.enabled = !!v; draw(); },
    setOpacity: function (n) { st.opacity = Math.max(0, Math.min(1, +n)); draw(); },
    setColor: function (type, hex) { st.colors[type] = hex; draw(); },
    redraw: scheduleDraw,
    clear: function () { st.mask = null; draw(); },
    _state: st
  };

  window.BlockMaskOverlay = api;

  // Honour ?mask=<url> on load, once an alignment is present.
  function tryUrlMask() {
    var m = /[?&]mask=([^&]+)/.exec(location.search);
    if (!m) return;
    var url = decodeURIComponent(m[1]);
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (seqs() && container() && container().querySelector('.seq-line[data-seq-index]')) {
        clearInterval(iv);
        api.loadMaskFromUrl(url);
      } else if (tries > 100) {
        clearInterval(iv);
      }
    }, 100);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryUrlMask);
  } else {
    tryUrlMask();
  }
})();
