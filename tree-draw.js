/*
 * tree-draw.js — graphical tree drawing for the Alignment Tree modal.
 *
 * The viewer already computes the tree and fills #treeNewickOutput with a Newick
 * string. This module parses that Newick and renders an SVG phylogram directly
 * inside the Tree modal (a #treeSvgOutput box, inserted above the Newick box).
 *
 * Interactive: zoom, swap the two branches at a node, and re-root on a branch.
 * The drawn tree is held as a live structure rather than rebuilt from text each
 * time, so those edits act on the tree itself; Reset returns to the computed tree.
 *
 * INSTALL: put this file in the repo next to script.js, then add ONE line in
 * index.html right AFTER the existing  <script src="script.js"></script>  :
 *
 *     <script src="tree-draw.js"></script>
 *
 * No changes to script.js are required.
 */
(function () {
  'use strict';

  // ---------- Newick <-> tree ----------
  function parseNewick(s) {
    s = String(s || '').trim();
    var i = 0;
    function readName() {
      var nm = '';
      if (s[i] === "'") {                 // quoted label: '' is an escaped quote
        i++;
        while (i < s.length) {
          if (s[i] === "'") { if (s[i + 1] === "'") { nm += "'"; i += 2; continue; } i++; break; }
          nm += s[i++];
        }
      } else {
        while (i < s.length && "():,;".indexOf(s[i]) === -1) nm += s[i++];
      }
      return nm.trim();
    }
    function node() {
      var n = { name: '', len: 0, children: [] };
      if (s[i] === '(') {
        i++;
        for (;;) { n.children.push(node()); if (s[i] === ',') { i++; continue; } break; }
        if (s[i] === ')') i++;
      }
      n.name = readName();
      if (s[i] === ':') {
        i++;
        var num = '';
        while (i < s.length && "():,;".indexOf(s[i]) === -1) num += s[i++];
        n.len = parseFloat(num) || 0;
      }
      return n;
    }
    return node();
  }

  function quoteName(nm) {
    return /[\s():,;']/.test(nm) ? "'" + String(nm).replace(/'/g, "''") + "'" : nm;
  }

  // Serialise back to Newick so a re-rooted or rotated tree can be copied out.
  function toNewick(root) {
    function fmtLen(v) {
      if (!(v > 0)) return '';
      return ':' + (Math.round(v * 1e6) / 1e6);
    }
    function rec(n, isRoot) {
      var inner = n.children.length
        ? '(' + n.children.map(function (c) { return rec(c, false); }).join(',') + ')'
        : '';
      return inner + quoteName(n.name || '') + (isRoot ? '' : fmtLen(n.len));
    }
    return rec(root, true) + ';';
  }

  function cloneTree(n) {
    return { name: n.name, len: n.len, children: n.children.map(cloneTree) };
  }

  // ---------- tree edits ----------

  // Rotate the children at an internal node (for two children this is a swap).
  function swapAt(node) {
    if (!node || node.children.length < 2) return false;
    node.children.reverse();
    return true;
  }

  // Re-root on the branch entering `target`: the new root sits at that branch's
  // midpoint, and every edge on the path back to the old root is reversed.
  function rerootOnBranch(root, target) {
    if (!target || target === root) return root;
    var parent = new Map();
    (function walk(n, p) { parent.set(n, p); n.children.forEach(function (c) { walk(c, n); }); })(root, null);
    var p0 = parent.get(target);
    if (!p0) return root;

    var half = (target.len || 0) / 2;
    p0.children = p0.children.filter(function (c) { return c !== target; });

    // Reverse the chain from p0 up to the old root, carrying each edge length
    // to the edge that replaces it.
    var node = p0, carried = half, up = parent.get(node);
    while (up) {
      up.children = up.children.filter(function (c) { return c !== node; });
      var nextUp = parent.get(up);
      node.children.push(up);
      var edge = node.len;
      node.len = carried;
      carried = edge;
      node = up;
      up = nextUp;
    }
    node.len = carried;

    target.len = half;
    var newRoot = { name: '', len: 0, children: [target, p0] };

    // The old root now has one child; splice it out so no artificial node remains.
    (function collapse(n) {
      n.children.forEach(collapse);
      n.children = n.children.reduce(function (acc, c) {
        if (c.children.length === 1 && !c.name) {
          var only = c.children[0];
          only.len = (only.len || 0) + (c.len || 0);
          acc.push(only);
        } else acc.push(c);
        return acc;
      }, []);
    })(newRoot);

    return newRoot;
  }

  // ---------- layout + SVG ----------
  function niceNum(v) {
    if (v <= 0) return 0;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / p;
    return (f >= 5 ? 5 : f >= 2 ? 2 : 1) * p;
  }

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Equal-angle unrooted layout (Felsenstein, Inferring Phylogenies, ch. 34 — the same
  // scheme FigTree, Dendroscope and iTOL use). Each node receives an angular sector in
  // proportion to the leaves below it, centred on the direction of its incoming edge, and
  // sits at its parent's position advanced along that direction by the branch length.
  function buildUnrootedSVGString(root, opts) {
    opts = opts || {};
    var measure = opts.measure || function (t) { return String(t).length * 6.8; };
    var boxW = (opts.width || 700), boxH = (opts.height || 520);
    var zoom = opts.zoom || 1;

    var anyLen = false;
    (function chk(n) { if (n.len > 0) anyLen = true; n.children.forEach(chk); })(root);

    var uid = 0, leaves = [];
    (function count(n) {
      n._id = uid++;
      n._leaves = n.children.length ? n.children.reduce(function (s, c) { return s + count(c); }, 0) : 1;
      if (!n.children.length) leaves.push(n);
      return n._leaves;
    })(root);
    if (!leaves.length) return '<div style="padding:8px;color:#777;">Empty tree.</div>';

    var edgeLen = function (n) { return anyLen ? (n.len || 0) : 1; };
    root.ux = 0; root.uy = 0; root.udir = 0;
    (function place(n, start, sector) {
      var a = start;
      n.children.forEach(function (c) {
        var sub = sector * (c._leaves / n._leaves);
        var dir = a + sub / 2;
        c.udir = dir;
        c.ux = n.ux + edgeLen(c) * Math.cos(dir);
        c.uy = n.uy + edgeLen(c) * Math.sin(dir);
        place(c, a, sub);
        a += sub;
      });
    })(root, 0, Math.PI * 2);

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    (function bounds(n) {
      if (n.ux < minX) minX = n.ux; if (n.ux > maxX) maxX = n.ux;
      if (n.uy < minY) minY = n.uy; if (n.uy > maxY) maxY = n.uy;
      n.children.forEach(bounds);
    })(root);

    var fontSize = Math.max(8, 12 * zoom);
    var maxLabel = 0;
    leaves.forEach(function (l) { maxLabel = Math.max(maxLabel, measure(l.name || '?')); });
    var margin = Math.min(maxLabel * zoom + 14, 240);

    var spanX = Math.max(maxX - minX, 1e-9), spanY = Math.max(maxY - minY, 1e-9);
    var innerW = Math.max(120, boxW - 2 * margin), innerH = Math.max(120, boxH - 2 * margin);
    var scale = Math.min(innerW / spanX, innerH / spanY) * zoom;
    var totalW = spanX * scale + 2 * margin, totalH = spanY * scale + 2 * margin;
    function PX(n) { return margin + (n.ux - minX) * scale; }
    function PY(n) { return margin + (n.uy - minY) * scale; }

    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + totalW.toFixed(0) + '" height="' + totalH.toFixed(0) +
      '" viewBox="0 0 ' + totalW.toFixed(0) + ' ' + totalH.toFixed(0) + '" font-family="system-ui,-apple-system,Segoe UI,sans-serif">');

    (function draw(n) {
      n.children.forEach(function (c) {
        var x1 = PX(n).toFixed(1), y1 = PY(n).toFixed(1), x2 = PX(c).toFixed(1), y2 = PY(c).toFixed(1);
        out.push('<line class="tree-hit tree-branch-hit" data-node="' + c._id + '" x1="' + x1 + '" y1="' + y1 +
          '" x2="' + x2 + '" y2="' + y2 + '" stroke="transparent" stroke-width="10"/>');
        out.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
          '" stroke="#3a3a3a" stroke-width="1.5" stroke-linecap="round" pointer-events="none"/>');
        draw(c);
      });
      if (n.children.length) {
        out.push('<circle class="tree-hit tree-node-hit" data-node="' + n._id + '" cx="' + PX(n).toFixed(1) +
          '" cy="' + PY(n).toFixed(1) + '" r="5" fill="transparent"/>');
        out.push('<circle cx="' + PX(n).toFixed(1) + '" cy="' + PY(n).toFixed(1) +
          '" r="2.2" fill="#7d97ad" pointer-events="none"/>');
      }
    })(root);

    leaves.forEach(function (l) {
      var toLeft = Math.cos(l.udir) < 0;
      out.push('<text x="' + (PX(l) + (toLeft ? -5 : 5)).toFixed(1) + '" y="' + (PY(l) + fontSize / 3).toFixed(1) +
        '" font-size="' + fontSize.toFixed(1) + '" fill="#1f1f1f" pointer-events="none"' +
        (toLeft ? ' text-anchor="end"' : '') + '>' + esc(l.name || '?') + '</text>');
    });

    if (anyLen) {
      var sbv = niceNum(spanX / 4), sbpx = sbv * scale, sy = totalH - 12;
      out.push('<line x1="12" y1="' + sy.toFixed(1) + '" x2="' + (12 + sbpx).toFixed(1) + '" y2="' + sy.toFixed(1) +
        '" stroke="#999" stroke-width="1.5"/>');
      out.push('<text x="' + (12 + sbpx / 2).toFixed(1) + '" y="' + (sy - 4).toFixed(1) +
        '" font-size="10" fill="#777" text-anchor="middle">' + sbv + '</text>');
    }
    out.push('</svg>');
    return out.join('');
  }

  function buildTreeSVGString(root, opts) {
    opts = opts || {};
    var measure = opts.measure || function (t) { return String(t).length * 6.8; };
    var containerW = opts.width || 700;
    var zoom = opts.zoom || 1;

    if (!root) return '<div style="padding:8px;color:#a00;">Cannot draw tree.</div>';
    if (opts.layout === 'unrooted') return buildUnrootedSVGString(root, opts);

    var anyLen = false;
    (function chk(n) { if (n.len > 0) anyLen = true; n.children.forEach(chk); })(root);
    var usePhylo = anyLen, rowH = 26 * zoom, padT = 18, padL = 12, padB = usePhylo ? 34 : 16;

    var leafCount = 0, maxX = 0, uid = 0;
    (function assign(n, x, depth) {
      n._id = uid++;
      n.x = usePhylo ? (depth === 0 ? 0 : x + n.len) : depth;
      if (!n.children.length) { n.y = leafCount++; }
      else {
        n.children.forEach(function (c) { assign(c, n.x, depth + 1); });
        n.y = (n.children[0].y + n.children[n.children.length - 1].y) / 2;
      }
      if (n.x > maxX) maxX = n.x;
    })(root, 0, 0);
    if (leafCount < 1) return '<div style="padding:8px;color:#777;">Empty tree.</div>';
    if (!usePhylo) (function fix(n) { if (!n.children.length) n.x = maxX; n.children.forEach(fix); })(root);

    var fontSize = Math.max(8, 12 * zoom);
    var maxLabel = 0;
    (function w(n) { if (!n.children.length) maxLabel = Math.max(maxLabel, measure(n.name || '?')); n.children.forEach(w); })(root);
    maxLabel *= zoom;

    var labelW = Math.min(maxLabel + 10, 260 * zoom), gap = 8;
    var plotW = Math.max(150, (containerW - padL - gap - 8) * zoom - labelW);
    var scaleX = maxX > 0 ? plotW / maxX : 1;
    var totalW = padL + plotW + gap + labelW + 8;
    var totalH = padT + (leafCount > 1 ? leafCount - 1 : 0) * rowH + padB;
    function px(x) { return padL + x * scaleX; }
    function py(r) { return padT + r * rowH; }

    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + totalW.toFixed(0) + '" height="' + totalH.toFixed(0) +
      '" viewBox="0 0 ' + totalW.toFixed(0) + ' ' + totalH.toFixed(0) + '" font-family="system-ui,-apple-system,Segoe UI,sans-serif">');

    (function draw(n, parentX, isRoot) {
      var x2 = px(n.x), y = py(n.y), x1 = px(parentX);
      // The horizontal branch is the click target for re-rooting; a wide invisible
      // line under it keeps thin branches easy to hit.
      if (!isRoot) {
        out.push('<line class="tree-hit tree-branch-hit" data-node="' + n._id + '" x1="' + x1.toFixed(1) + '" y1="' + y.toFixed(1) +
          '" x2="' + x2.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="transparent" stroke-width="10" stroke-linecap="butt"/>');
      }
      out.push('<line x1="' + x1.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y.toFixed(1) +
        '" stroke="#3a3a3a" stroke-width="1.5" stroke-linecap="round" pointer-events="none"/>');
      if (n.children.length) {
        var yt = py(n.children[0].y), yb = py(n.children[n.children.length - 1].y);
        out.push('<line x1="' + x2.toFixed(1) + '" y1="' + yt.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + yb.toFixed(1) +
          '" stroke="#3a3a3a" stroke-width="1.5" stroke-linecap="round" pointer-events="none"/>');
        // Node handle: click to swap the branches hanging off it.
        out.push('<circle class="tree-hit tree-node-hit" data-node="' + n._id + '" cx="' + x2.toFixed(1) + '" cy="' + y.toFixed(1) +
          '" r="5" fill="transparent"/>');
        out.push('<circle cx="' + x2.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.2" fill="#7d97ad" pointer-events="none"/>');
        n.children.forEach(function (c) { draw(c, n.x, false); });
      } else {
        out.push('<text x="' + (x2 + 6).toFixed(1) + '" y="' + (y + fontSize / 3).toFixed(1) +
          '" font-size="' + fontSize.toFixed(1) + '" fill="#1f1f1f" pointer-events="none">' + esc(n.name || '?') + '</text>');
      }
    })(root, root.x, true);

    if (usePhylo && maxX > 0) {
      var sbv = niceNum(maxX / 4), sbpx = sbv * scaleX, sy = totalH - 14;
      out.push('<line x1="' + padL + '" y1="' + sy.toFixed(1) + '" x2="' + (padL + sbpx).toFixed(1) + '" y2="' + sy.toFixed(1) +
        '" stroke="#999" stroke-width="1.5"/>');
      out.push('<text x="' + (padL + sbpx / 2).toFixed(1) + '" y="' + (sy - 4).toFixed(1) +
        '" font-size="10" fill="#777" text-anchor="middle">' + sbv + '</text>');
    }
    out.push('</svg>');
    return out.join('');
  }

  // ---------- module state ----------
  var st = { root: null, original: null, sourceNewick: '', zoom: 1, mode: 'swap', layout: 'rect', full: false };

  function measurer() {
    var ctx = null;
    try { ctx = document.createElement('canvas').getContext('2d'); ctx.font = '12px system-ui,-apple-system,sans-serif'; } catch (e) {}
    return ctx ? function (t) { return ctx.measureText(String(t)).width; }
               : function (t) { return String(t).length * 6.8; };
  }

  function nodeById(id) {
    var found = null;
    (function walk(n) { if (found) return; if (n._id === id) { found = n; return; } n.children.forEach(walk); })(st.root);
    return found;
  }

  function draw() {
    var box = document.getElementById('treeSvgCanvas');
    if (!box || !st.root) return;
    box.innerHTML = buildTreeSVGString(st.root, {
      measure: measurer(),
      width: box.clientWidth || 700,
      height: box.clientHeight || 520,
      zoom: st.zoom,
      layout: st.layout
    });
    var zl = document.getElementById('treeZoomLabel');
    if (zl) zl.textContent = Math.round(st.zoom * 100) + '%';
  }

  // ---------- export ----------
  function currentSvgEl() {
    var box = document.getElementById('treeSvgCanvas');
    return box ? box.querySelector('svg') : null;
  }

  function svgMarkup() {
    var svg = currentSvgEl();
    if (!svg) return null;
    // A white backing rect so the exported image is not transparent where viewers
    // (and Word) would otherwise show black.
    var clone = svg.cloneNode(true);
    clone.querySelectorAll('.tree-hit').forEach(function (n) { n.remove(); });
    var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', '0'); bg.setAttribute('y', '0');
    bg.setAttribute('width', clone.getAttribute('width'));
    bg.setAttribute('height', clone.getAttribute('height'));
    bg.setAttribute('fill', '#ffffff');
    clone.insertBefore(bg, clone.firstChild);
    return new XMLSerializer().serializeToString(clone);
  }

  function saveBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportSVG() {
    var markup = svgMarkup();
    if (!markup) return;
    saveBlob(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + markup], { type: 'image/svg+xml;charset=utf-8' }), 'tree.svg');
  }

  function exportPNG() {
    var markup = svgMarkup(), svg = currentSvgEl();
    if (!markup || !svg) return;
    var w = parseFloat(svg.getAttribute('width')) || 800;
    var h = parseFloat(svg.getAttribute('height')) || 600;
    var scale = 2;                                   // 2x so the raster stands up to print
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas');
      cv.width = Math.ceil(w * scale); cv.height = Math.ceil(h * scale);
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(function (blob) { if (blob) saveBlob(blob, 'tree.png'); }, 'image/png');
    };
    img.onerror = function () { alert('Could not rasterise the tree image.'); };
    // The SVG is self-contained (no external refs), so a data URL keeps the canvas clean.
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  }

  function setFullscreen(on) {
    var panel = document.getElementById('treeSvgOutput');
    if (!panel) return;
    st.full = !!on;
    panel.classList.toggle('tree-fullscreen', st.full);
    var btn = panel.querySelector('button[data-act="fullscreen"]');
    if (btn) btn.textContent = st.full ? 'Exit full screen' : 'Full screen';
    setTimeout(draw, 30);
  }

  function setTree(root, pushNewick) {
    st.root = root;
    draw();
    if (pushNewick) {
      var nwOut = document.getElementById('treeNewickOutput');
      if (nwOut) nwOut.value = toNewick(st.root);
    }
  }

  function loadFromNewick(nw) {
    var root;
    try { root = parseNewick(nw); } catch (e) { root = null; }
    st.sourceNewick = nw;
    st.original = root ? cloneTree(root) : null;
    st.root = root;
    draw();
  }

  function onCanvasClick(ev) {
    var hit = ev.target.closest ? ev.target.closest('.tree-hit') : null;
    if (!hit || !st.root) return;
    var id = parseInt(hit.getAttribute('data-node'), 10);
    var node = nodeById(id);
    if (!node) return;
    if (st.mode === 'reroot') {
      if (!hit.classList.contains('tree-branch-hit')) return;   // re-root needs a branch
      setTree(rerootOnBranch(st.root, node), true);
    } else {
      if (!swapAt(node)) return;
      setTree(st.root, true);
    }
  }

  // ---------- UI ----------
  function buildPanel() {
    var nwOut = document.getElementById('treeNewickOutput');
    if (!nwOut) return null;
    var panel = document.getElementById('treeSvgOutput');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'treeSvgOutput';   // spacing lives in styles.css so full screen can override it
    panel.innerHTML =
      '<div id="treeSvgToolbar" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;' +
      'font-size:11px;color:#31485c;padding:0 0 5px;">' +
        '<span style="color:#6b8299;">Zoom</span>' +
        '<button type="button" class="tree-tool" data-act="zoom-out" title="Zoom out">&minus;</button>' +
        '<span id="treeZoomLabel" style="min-width:34px;text-align:center;">100%</span>' +
        '<button type="button" class="tree-tool" data-act="zoom-in" title="Zoom in">+</button>' +
        '<button type="button" class="tree-tool" data-act="zoom-fit" title="Fit to width">Fit</button>' +
        '<span style="width:1px;height:14px;background:#c5d2df;margin:0 2px;"></span>' +
        '<span style="color:#6b8299;">Layout</span>' +
        '<label class="tree-mode"><input type="radio" name="treeLayout" value="rect" checked> rooted</label>' +
        '<label class="tree-mode"><input type="radio" name="treeLayout" value="unrooted"> unrooted</label>' +
        '<span style="width:1px;height:14px;background:#c5d2df;margin:0 2px;"></span>' +
        '<span style="color:#6b8299;">Click</span>' +
        '<label class="tree-mode"><input type="radio" name="treeClickMode" value="swap" checked> swap branches</label>' +
        '<label class="tree-mode"><input type="radio" name="treeClickMode" value="reroot"> re-root</label>' +
        '<span style="width:1px;height:14px;background:#c5d2df;margin:0 2px;"></span>' +
        '<button type="button" class="tree-tool" data-act="export-svg" title="Download the drawing as SVG">SVG</button>' +
        '<button type="button" class="tree-tool" data-act="export-png" title="Download the drawing as PNG (2x)">PNG</button>' +
        '<button type="button" class="tree-tool" data-act="fullscreen" title="Expand the tree to the whole window (Esc to leave)">Full screen</button>' +
        '<button type="button" class="tree-tool" data-act="reset" title="Back to the computed tree">Reset</button>' +
        '<span id="treeHint" style="color:#8a9bab;"></span>' +
      '</div>' +
      '<div id="treeSvgCanvas"></div>';
    nwOut.parentNode.insertBefore(panel, nwOut);

    panel.querySelector('#treeSvgToolbar').addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'zoom-in') st.zoom = Math.min(4, st.zoom * 1.25);
      else if (act === 'zoom-out') st.zoom = Math.max(0.25, st.zoom / 1.25);
      else if (act === 'zoom-fit') st.zoom = 1;
      else if (act === 'export-svg') { exportSVG(); return; }
      else if (act === 'export-png') { exportPNG(); return; }
      else if (act === 'fullscreen') { setFullscreen(!st.full); return; }
      else if (act === 'reset') {
        if (st.original) {
          st.root = cloneTree(st.original);
          var nwOut2 = document.getElementById('treeNewickOutput');
          if (nwOut2 && st.sourceNewick) nwOut2.value = st.sourceNewick;
        }
      }
      draw();
    });
    panel.querySelectorAll('input[name="treeClickMode"]').forEach(function (r) {
      r.addEventListener('change', function () {
        st.mode = r.value;
        var hint = document.getElementById('treeHint');
        if (hint) hint.textContent = st.mode === 'reroot' ? 'click a branch' : 'click a node';
      });
    });
    panel.querySelectorAll('input[name="treeLayout"]').forEach(function (r) {
      r.addEventListener('change', function () { st.layout = r.value; draw(); });
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && st.full) { ev.stopPropagation(); setFullscreen(false); }
    }, true);
    // The panel is resizable, so redraw to the new box when the user lets go.
    if (typeof ResizeObserver === 'function') {
      var pending = null;
      new ResizeObserver(function () {
        clearTimeout(pending);
        pending = setTimeout(draw, 120);
      }).observe(panel.querySelector('#treeSvgCanvas'));
    }
    var canvas = panel.querySelector('#treeSvgCanvas');
    canvas.addEventListener('click', onCanvasClick);
    // Ctrl/Cmd + wheel zooms, matching the rest of the viewer.
    canvas.addEventListener('wheel', function (ev) {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      ev.preventDefault();
      st.zoom = ev.deltaY < 0 ? Math.min(4, st.zoom * 1.1) : Math.max(0.25, st.zoom / 1.1);
      draw();
    }, { passive: false });
    return panel;
  }

  function renderTreeSVG(newick, container) {
    if (!container) return;
    container.innerHTML = buildTreeSVGString(parseNewick(newick), {
      measure: measurer(), width: container.clientWidth || 700, zoom: 1
    });
  }
  window.renderTreeSVG = renderTreeSVG;   // exposed in case you want to call it directly

  // ---------- wire into the existing Tree modal ----------
  function refresh() {
    var nwOut = document.getElementById('treeNewickOutput');
    if (!buildPanel() || !nwOut) return;
    // Only reload when the computed Newick actually changed, so re-rooting and
    // swapping survive an incidental refresh.
    if (nwOut.value && nwOut.value !== st.sourceNewick && nwOut.value !== toNewick(st.root || { name: '', len: 0, children: [] })) {
      loadFromNewick(nwOut.value);
    } else {
      draw();
    }
  }
  function init() {
    var modal = document.getElementById('treeBuilderModal');
    if (!modal) { setTimeout(init, 300); return; }   // wait for the modal to exist
    buildPanel();
    try {
      new MutationObserver(function () {
        if (modal.style.display && modal.style.display !== 'none') setTimeout(refresh, 20);
      }).observe(modal, { attributes: true, attributeFilter: ['style'] });
    } catch (e) {}
    var btn = document.getElementById('buildTreeButton');
    if (btn) btn.addEventListener('click', function () { setTimeout(refresh, 120); });
    document.querySelectorAll('input[name="treeMethod"]').forEach(function (r) {
      r.addEventListener('change', function () { setTimeout(refresh, 80); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Exposed for tests.
  window._treeDraw = {
    parseNewick: parseNewick, toNewick: toNewick, rerootOnBranch: rerootOnBranch,
    swapAt: swapAt, cloneTree: cloneTree, state: st
  };
})();
