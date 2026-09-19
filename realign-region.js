/**
 * Region realign: isolate selected column runs, optionally RC / reorder, MAFFT each
 * run independently, splice back in one rebuild so later-run indices do not shift.
 *
 * Browser: window.RealignRegion
 * Node:    module.exports
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.RealignRegion = api;
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function headerKey(s) {
        var h = (s && (s.header || s.fullHeader || s.name)) || '';
        return String(h).split(/\s+/)[0];
    }

    function cloneSeq(s) {
        return {
            header: s.header,
            fullHeader: s.fullHeader || s.header,
            seq: s.seq
        };
    }

    function padTo(seq, len) {
        if (seq.length >= len) return seq;
        return seq + new Array(len - seq.length + 1).join('-');
    }

    function padAll(seqs) {
        var max = 0;
        for (var i = 0; i < seqs.length; i++) {
            if (seqs[i].seq.length > max) max = seqs[i].seq.length;
        }
        return seqs.map(function (s) {
            var c = cloneSeq(s);
            c.seq = padTo(s.seq, max);
            return c;
        });
    }

    function ungapped(seq) {
        return String(seq || '').replace(/[-.]/g, '');
    }

    // MAFFT WASM emits a fixed case; walk original ungapped bases onto the
    // gapped result so mixed-case input (lowercase flanks) survives splice.
    function remapCaseOntoAligned(original, aligned) {
        var oi = 0;
        var out = '';
        original = String(original || '');
        aligned = String(aligned || '');
        for (var k = 0; k < aligned.length; k++) {
            var c = aligned.charAt(k);
            if (c === '-' || c === '.') { out += c; continue; }
            var orig = original.charAt(oi++);
            out += (orig && orig === orig.toLowerCase()) ? c.toLowerCase() : c.toUpperCase();
        }
        return out;
    }

    function parseFasta(fasta) {
        var lines = String(fasta || '').split('\n');
        var result = [];
        var current = null;
        for (var i = 0; i < lines.length; i++) {
            var trimmed = lines[i].trim();
            if (!trimmed) continue;
            if (trimmed.charAt(0) === '>') {
                if (current) result.push(current);
                current = { name: trimmed.substring(1).trim(), seq: '' };
            } else if (current) {
                current.seq += trimmed;
            }
        }
        if (current) result.push(current);
        return result;
    }

    function toFasta(recs) {
        return recs.map(function (r) {
            return '>' + (r.name || r.header) + '\n' + (r.seq || '');
        }).join('\n');
    }

    function reverseComplement(seq) {
        var comp = {
            A: 'T', T: 'A', C: 'G', G: 'C', a: 't', t: 'a', c: 'g', g: 'c',
            R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K', B: 'V', V: 'B', D: 'H', H: 'D',
            r: 'y', y: 'r', s: 's', w: 'w', k: 'm', m: 'k', b: 'v', v: 'b', d: 'h', h: 'd',
            N: 'N', n: 'n', '-': '-', '.': '.'
        };
        var out = '';
        for (var i = seq.length - 1; i >= 0; i--) {
            var c = seq.charAt(i);
            out += comp[c] || c;
        }
        return out;
    }

    /**
     * Contiguous runs of selected columns. Isolated single columns are dropped
     * (MAFFT on a 1-column span is meaningless). Indices are 0-based inclusive.
     */
    function columnRuns(selectedCols) {
        var cols = [];
        if (selectedCols && typeof selectedCols.forEach === 'function') {
            selectedCols.forEach(function (c) { cols.push(Number(c)); });
        } else {
            cols = Array.prototype.slice.call(selectedCols || []).map(Number);
        }
        cols = cols.filter(function (n) { return n >= 0 && isFinite(n); })
            .sort(function (a, b) { return a - b; });
        var uniq = [];
        for (var i = 0; i < cols.length; i++) {
            if (i === 0 || cols[i] !== cols[i - 1]) uniq.push(cols[i]);
        }
        var runs = [];
        for (var j = 0; j < uniq.length; j++) {
            var c = uniq[j];
            var last = runs[runs.length - 1];
            if (last && c === last.end + 1) last.end = c;
            else runs.push({ start: c, end: c });
        }
        return runs.filter(function (r) { return r.end - r.start + 1 >= 2; });
    }

    function remapIndex(i, len) {
        return len - 1 - i;
    }

    function remapRun(run, len) {
        return { start: remapIndex(run.end, len), end: remapIndex(run.start, len) };
    }

    function concatSelected(seq, cols) {
        var s = '';
        var list = [];
        if (cols && typeof cols.forEach === 'function' && !Array.isArray(cols)) {
            cols.forEach(function (c) { list.push(Number(c)); });
        } else {
            list = Array.prototype.slice.call(cols || []).map(Number);
        }
        list.sort(function (a, b) { return a - b; });
        for (var i = 0; i < list.length; i++) s += seq.charAt(list[i]) || '';
        return ungapped(s);
    }

    function lookupHeader(byHeader, s) {
        var k = headerKey(s);
        if (byHeader[k] !== undefined) return byHeader[k];
        if (s.header && byHeader[s.header] !== undefined) return byHeader[s.header];
        if (s.fullHeader && byHeader[s.fullHeader] !== undefined) return byHeader[s.fullHeader];
        return undefined;
    }

    function applyOrder(seqs, headerOrder) {
        var byKey = {};
        for (var i = 0; i < seqs.length; i++) {
            byKey[headerKey(seqs[i])] = seqs[i];
            if (seqs[i].header) byKey[seqs[i].header] = seqs[i];
            if (seqs[i].fullHeader) byKey[seqs[i].fullHeader] = seqs[i];
        }
        var out = [];
        var seen = {};
        var order = headerOrder || [];
        for (var j = 0; j < order.length; j++) {
            var s = byKey[order[j]] || byKey[String(order[j]).split(/\s+/)[0]];
            if (s && !seen[headerKey(s)]) {
                out.push(s);
                seen[headerKey(s)] = true;
            }
        }
        for (var k = 0; k < seqs.length; k++) {
            if (!seen[headerKey(seqs[k])]) out.push(seqs[k]);
        }
        return out;
    }

    /**
     * Rebuild each row: original flanks/mids kept, each run replaced by its
     * aligned slice. Per-sequence coordinates so a full-row RC can splice at
     * mirrored columns without shifting later runs on unflipped rows.
     *
     * runPlans: [{ byHeader, alignedLen, coords: { headerKey: {start,end} } }]
     * sorted by original start (unflipped coordinates) — rebuild walks left to
     * right *per sequence* using that seq's own coords sorted by start.
     */
    function rebuild(seqs, runPlans) {
        return seqs.map(function (s) {
            var key = headerKey(s);
            var pieces = [];
            for (var i = 0; i < runPlans.length; i++) {
                var plan = runPlans[i];
                var coord = plan.coords[key];
                if (!coord) continue;
                var piece = lookupHeader(plan.byHeader, s);
                if (piece === undefined) piece = new Array(plan.alignedLen + 1).join('-');
                pieces.push({
                    start: coord.start,
                    end: coord.end,
                    text: padTo(piece, plan.alignedLen)
                });
            }
            pieces.sort(function (a, b) { return a.start - b.start; });
            var out = '';
            var cursor = 0;
            for (var p = 0; p < pieces.length; p++) {
                if (pieces[p].start < cursor) continue;
                out += s.seq.substring(cursor, pieces[p].start);
                out += pieces[p].text;
                cursor = pieces[p].end + 1;
            }
            out += s.seq.substring(cursor);
            var c = cloneSeq(s);
            c.seq = out;
            return c;
        });
    }

    /**
     * 6-mer voting vs the first sequence (same rule as script.js _adjustDirection).
     */
    function adjustDirection(fasta, rcFn) {
        rcFn = rcFn || reverseComplement;
        var seqs = parseFasta(fasta);
        if (seqs.length < 2) return { fasta: fasta, flipped: new Set() };

        var K = 6;
        var refSeq = seqs[0].seq.toUpperCase().replace(/[^ACGT]/g, '');
        var refKmers = {};
        for (var i = 0; i <= refSeq.length - K; i++) {
            refKmers[refSeq.substring(i, i + K)] = true;
        }

        var flipped = new Set();
        var result = ['>' + seqs[0].name + '\n' + seqs[0].seq];

        for (var n = 1; n < seqs.length; n++) {
            var s = seqs[n];
            var clean = s.seq.toUpperCase().replace(/[^ACGT]/g, '');
            var rcClean = rcFn(clean);
            var fwdScore = 0, rcScore = 0;
            for (var j = 0; j <= clean.length - K; j++) {
                if (refKmers[clean.substring(j, j + K)]) fwdScore++;
                if (refKmers[rcClean.substring(j, j + K)]) rcScore++;
            }
            if (rcScore > fwdScore) {
                result.push('>' + s.name + '\n' + rcFn(s.seq));
                flipped.add(s.name.split(/\s+/)[0]);
                flipped.add(s.name);
            } else {
                result.push('>' + s.name + '\n' + s.seq);
            }
        }
        return { fasta: result.join('\n'), flipped: flipped };
    }

    function defaultReorderByGuideTree(fasta) {
        var recs = parseFasta(fasta);
        recs.sort(function (a, b) {
            if (a.seq < b.seq) return -1;
            if (a.seq > b.seq) return 1;
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });
        return { fasta: toFasta(recs), order: recs.map(function (r) { return r.name; }) };
    }

    function seqsEqual(a, b) {
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) {
            if (headerKey(a[i]) !== headerKey(b[i])) return false;
            if (a[i].seq !== b[i].seq) return false;
        }
        return true;
    }

    /**
     * @param {Array<{header,fullHeader?,seq}>} seqs
     * @param {Set|Array<number>} selectedCols
     * @param {object} options
     */
    async function run(seqs, selectedCols, options) {
        options = options || {};
        var rcFn = options.reverseComplement || reverseComplement;
        var parseFn = options.parseFasta || parseFasta;
        var adjustFn = options.adjustDirection || adjustDirection;
        var reorderFn = options.reorderByGuideTree || defaultReorderByGuideTree;
        var mafftAlign = options.mafftAlign;
        var extraArgs = options.extraArgs || [];

        var orig = (seqs || []).map(cloneSeq);
        if (!orig.length) {
            return { seqs: orig, cancelled: false, noop: true, aligned: false, flipped: [], order: null, orderApplied: false, runs: [], mafftCalls: 0, message: 'No sequences' };
        }

        var runs = columnRuns(selectedCols);
        if (!runs.length) {
            return { seqs: orig, cancelled: false, noop: true, aligned: false, flipped: [], order: null, orderApplied: false, runs: [], mafftCalls: 0, message: 'Need at least one span of 2+ selected columns' };
        }

        var alen = orig[0].seq.length;
        var colsSorted = [];
        if (selectedCols && typeof selectedCols.forEach === 'function' && !Array.isArray(selectedCols)) {
            selectedCols.forEach(function (c) { colsSorted.push(Number(c)); });
        } else {
            colsSorted = Array.prototype.slice.call(selectedCols || []).map(Number);
        }
        colsSorted.sort(function (a, b) { return a - b; });

        var working = orig.map(cloneSeq);
        var flippedSet = new Set();
        var applyAdjustFull = options.applyAdjustFull !== false; // default Yes
        var applyReorder = !!options.applyReorder;               // default No
        var adjustDir = !!options.adjustDir;
        var reorder = !!options.reorder;
        var reorderOnly = !!options.reorderOnly;
        var mafftCalls = 0;

        if (adjustDir) {
            var regionFa = '';
            for (var i = 0; i < working.length; i++) {
                regionFa += '>' + headerKey(working[i]) + '\n' + concatSelected(working[i].seq, colsSorted) + '\n';
            }
            var adj = adjustFn(regionFa, rcFn);
            flippedSet = adj.flipped || new Set();
            if (flippedSet.size) {
                if (applyAdjustFull) {
                    working = working.map(function (s) {
                        var k = headerKey(s);
                        if (!flippedSet.has(k) && !flippedSet.has(s.header) && !flippedSet.has(s.fullHeader)) return s;
                        var c = cloneSeq(s);
                        c.seq = rcFn(s.seq);
                        return c;
                    });
                } else {
                    working = working.map(function (s) {
                        var k = headerKey(s);
                        if (!flippedSet.has(k) && !flippedSet.has(s.header) && !flippedSet.has(s.fullHeader)) return s;
                        var seq = s.seq;
                        var sortedRuns = runs.slice().sort(function (a, b) { return a.start - b.start; });
                        for (var r = sortedRuns.length - 1; r >= 0; r--) {
                            var run = sortedRuns[r];
                            var slice = seq.substring(run.start, run.end + 1);
                            seq = seq.substring(0, run.start) + rcFn(slice) + seq.substring(run.end + 1);
                        }
                        var c = cloneSeq(s);
                        c.seq = seq;
                        return c;
                    });
                }
            }
        }

        function isFlipped(s) {
            var k = headerKey(s);
            return flippedSet.has(k) || flippedSet.has(s.header) || flippedSet.has(s.fullHeader);
        }

        function coordsFor(s, run) {
            if (adjustDir && applyAdjustFull && isFlipped(s)) {
                var L = s.seq.length || alen;
                return remapRun(run, L);
            }
            return { start: run.start, end: run.end };
        }

        function regionUngappedFa() {
            var fa = '';
            for (var i = 0; i < working.length; i++) {
                var s = working[i];
                var ug = '';
                for (var r = 0; r < runs.length; r++) {
                    var co = coordsFor(s, runs[r]);
                    ug += ungapped(s.seq.substring(co.start, co.end + 1));
                }
                fa += '>' + headerKey(s) + '\n' + ug + '\n';
            }
            return fa;
        }

        var flippedNames = [];
        flippedSet.forEach(function (h) {
            if (flippedNames.indexOf(h) < 0 && h.indexOf(' ') < 0) flippedNames.push(h);
        });

        if (reorderOnly) {
            var tree = reorderFn(regionUngappedFa());
            var order = tree.order || [];
            if (!applyReorder) {
                return {
                    seqs: padAll(working),
                    cancelled: false,
                    noop: !adjustDir || flippedNames.length === 0,
                    aligned: false,
                    flipped: flippedNames,
                    order: order,
                    orderApplied: false,
                    runs: runs,
                    mafftCalls: 0,
                    message: 'Reorder only: row order not applied (whole-MSA apply is off)'
                };
            }
            working = applyOrder(working, order);
            return {
                seqs: padAll(working),
                cancelled: false,
                noop: false,
                aligned: false,
                flipped: flippedNames,
                order: order,
                orderApplied: true,
                runs: runs,
                mafftCalls: 0,
                message: 'Reordered by selected region (no alignment)'
            };
        }

        if (typeof mafftAlign !== 'function') {
            throw new Error('mafftAlign callback is required unless reorderOnly is set');
        }

        // Tree from the isolated region (post-adjust, pre-MAFFT) so splice-length
        // changes cannot shift the columns the order is computed from.
        var pendingOrder = null;
        if (reorder) {
            pendingOrder = (reorderFn(regionUngappedFa()).order) || [];
        }

        var runPlans = [];
        for (var ri = 0; ri < runs.length; ri++) {
            var run = runs[ri];
            var recs = [];
            var emptyKeys = [];
            for (var si = 0; si < working.length; si++) {
                var s = working[si];
                var co = coordsFor(s, run);
                var ug = ungapped(s.seq.substring(co.start, co.end + 1));
                var k = headerKey(s);
                if (!ug) emptyKeys.push(k);
                else recs.push({ name: k, seq: ug });
            }
            var byHeader = {};
            var alignedLen = 0;
            if (!recs.length) {
                alignedLen = run.end - run.start + 1;
                for (var e = 0; e < emptyKeys.length; e++) {
                    byHeader[emptyKeys[e]] = new Array(alignedLen + 1).join('-');
                }
            } else {
                mafftCalls++;
                var raw = await mafftAlign(toFasta(recs), extraArgs);
                if (raw === null || raw === undefined) {
                    return {
                        seqs: orig,
                        cancelled: true,
                        noop: true,
                        aligned: false,
                        flipped: flippedNames,
                        order: null,
                        orderApplied: false,
                        runs: runs,
                        mafftCalls: mafftCalls,
                        message: 'Cancelled'
                    };
                }
                var origUgByName = {};
                for (var oi = 0; oi < recs.length; oi++) origUgByName[recs[oi].name] = recs[oi].seq;
                var aligned = parseFn(raw);
                for (var a = 0; a < aligned.length; a++) {
                    var nm = aligned[a].name.split(/\s+/)[0];
                    var origUg = origUgByName[nm] || origUgByName[aligned[a].name];
                    var recased = origUg ? remapCaseOntoAligned(origUg, aligned[a].seq) : aligned[a].seq;
                    byHeader[nm] = recased;
                    if (recased.length > alignedLen) alignedLen = recased.length;
                }
                if (!alignedLen) {
                    for (var b = 0; b < aligned.length; b++) {
                        if (aligned[b].seq.length > alignedLen) alignedLen = aligned[b].seq.length;
                    }
                }
                for (var ek = 0; ek < emptyKeys.length; ek++) {
                    byHeader[emptyKeys[ek]] = new Array(alignedLen + 1).join('-');
                }
            }
            var coords = {};
            for (var ci = 0; ci < working.length; ci++) {
                coords[headerKey(working[ci])] = coordsFor(working[ci], run);
            }
            runPlans.push({ byHeader: byHeader, alignedLen: alignedLen, coords: coords, start: run.start, end: run.end });
        }

        working = rebuild(working, runPlans);
        working = padAll(working);

        var order = pendingOrder;
        var orderApplied = false;
        if (reorder && pendingOrder && applyReorder) {
            working = applyOrder(working, pendingOrder);
            orderApplied = true;
        }

        return {
            seqs: working,
            cancelled: false,
            noop: false,
            aligned: true,
            flipped: flippedNames,
            order: order,
            orderApplied: orderApplied,
            runs: runs,
            mafftCalls: mafftCalls,
            message: 'Region realigned'
        };
    }

    return {
        columnRuns: columnRuns,
        remapIndex: remapIndex,
        remapRun: remapRun,
        ungapped: ungapped,
        concatSelected: concatSelected,
        parseFasta: parseFasta,
        toFasta: toFasta,
        reverseComplement: reverseComplement,
        adjustDirection: adjustDirection,
        applyOrder: applyOrder,
        padAll: padAll,
        padTo: padTo,
        rebuild: rebuild,
        headerKey: headerKey,
        seqsEqual: seqsEqual,
        remapCaseOntoAligned: remapCaseOntoAligned,
        run: run
    };
}));
