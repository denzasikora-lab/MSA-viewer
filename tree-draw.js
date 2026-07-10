/*
 * tree-draw.js — graphical tree drawing for the Alignment Tree modal.
 *
 * The viewer already computes the tree and fills #treeNewickOutput with a Newick
 * string. This module parses that Newick and renders an SVG phylogram directly
 * inside the Tree modal (a new #treeSvgOutput box, inserted above the Newick box).
 *
 * INSTALL: put this file in the repo next to script.js, then add ONE line in
 * index.html right AFTER the existing  <script src="script.js?v=81"></script>  :
 *
 *     <script src="tree-draw.js"></script>
 *
 * No changes to script.js are required.
 */
(function () {
  'use strict';

  // ---------- Newick -> tree ----------
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

  function niceNum(v) {
    if (v <= 0) return 0;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / p;
    return (f >= 5 ? 5 : f >= 2 ? 2 : 1) * p;
  }

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---------- tree -> SVG string ----------
  function buildTreeSVGString(newick, opts) {
    opts = opts || {};
    var measure = opts.measure || function (t) { return String(t).length * 6.8; };
    var containerW = opts.width || 700;

    var root;
    try { root = parseNewick(newick); }
    catch (e) { return '<div style="padding:8px;color:#a00;">Cannot draw tree.</div>'; }

    // phylogram if any real branch length exists, otherwise cladogram fallback
    var anyLen = false;
    (function chk(n) { if (n.len > 0) anyLen = true; n.children.forEach(chk); })(root);
    var usePhylo = anyLen, rowH = 26, padT = 18, padL = 12, padB = usePhylo ? 34 : 16;

    var leafCount = 0, maxX = 0;
    (function assign(n, x, depth) {
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

    var maxLabel = 0;
    (function w(n) { if (!n.children.length) maxLabel = Math.max(maxLabel, measure(n.name || '?')); n.children.forEach(w); })(root);

    var labelW = Math.min(maxLabel + 10, 260), gap = 8;
    var plotW = Math.max(150, containerW - padL - gap - labelW - 8);
    var scaleX = maxX > 0 ? plotW / maxX : 1;
    var totalW = padL + plotW + gap + labelW + 8;
    var totalH = padT + (leafCount > 1 ? leafCount - 1 : 0) * rowH + padB;
    function px(x) { return padL + x * scaleX; }
    function py(r) { return padT + r * rowH; }

    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + totalW.toFixed(0) + '" height="' + totalH.toFixed(0) +
      '" viewBox="0 0 ' + totalW.toFixed(0) + ' ' + totalH.toFixed(0) + '" font-family="system-ui,-apple-system,Segoe UI,sans-serif">');

    (function draw(n, parentX) {
      var x2 = px(n.x), y = py(n.y), x1 = px(parentX);
      out.push('<line x1="' + x1.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y.toFixed(1) +
        '" stroke="#3a3a3a" stroke-width="1.5" stroke-linecap="round"/>');
      if (n.children.length) {
        var yt = py(n.children[0].y), yb = py(n.children[n.children.length - 1].y);
        out.push('<line x1="' + x2.toFixed(1) + '" y1="' + yt.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + yb.toFixed(1) +
          '" stroke="#3a3a3a" stroke-width="1.5" stroke-linecap="round"/>');
        n.children.forEach(function (c) { draw(c, n.x); });
      } else {
        out.push('<text x="' + (x2 + 6).toFixed(1) + '" y="' + (y + 4).toFixed(1) +
          '" font-size="12" fill="#1f1f1f">' + esc(n.name || '?') + '</text>');
      }
    })(root, root.x);

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

  function renderTreeSVG(newick, container) {
    if (!container) return;
    var ctx = null;
    try { ctx = document.createElement('canvas').getContext('2d'); ctx.font = '12px system-ui,-apple-system,sans-serif'; } catch (e) {}
    var measure = ctx ? function (t) { return ctx.measureText(String(t)).width; }
                      : function (t) { return String(t).length * 6.8; };
    container.innerHTML = buildTreeSVGString(newick, { measure: measure, width: container.clientWidth || 700 });
  }
  window.renderTreeSVG = renderTreeSVG;   // exposed in case you want to call it directly

  // ---------- wire into the existing Tree modal ----------
  function getBox() {
    var nwOut = document.getElementById('treeNewickOutput');
    if (!nwOut) return null;
    var box = document.getElementById('treeSvgOutput');
    if (!box) {
      box = document.createElement('div');
      box.id = 'treeSvgOutput';
      box.style.cssText = 'border:1px solid #ddd;border-radius:6px;background:#fff;padding:6px;margin:0 0 8px;max-height:52vh;overflow:auto;';
      nwOut.parentNode.insertBefore(box, nwOut);   // picture sits above the Newick text
    }
    return box;
  }
  function refresh() {
    var nwOut = document.getElementById('treeNewickOutput'), box = getBox();
    if (nwOut && box) renderTreeSVG(nwOut.value, box);
  }
  function init() {
    var modal = document.getElementById('treeBuilderModal');
    if (!modal) { setTimeout(init, 300); return; }   // wait for the modal to exist
    getBox();
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
})();
