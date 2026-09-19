// Module-level yield helper using MessageChannel for near-zero-delay yielding.
// setTimeout(0) has a minimum delay of ~4ms in some browsers; MessageChannel
// fires on the next event loop turn with no artificial delay, cutting yield
// overhead roughly in half.
let _yieldResolver = null;
const _yieldChannel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
if (_yieldChannel) {
    _yieldChannel.port1.onmessage = () => {
        if (_yieldResolver) { const r = _yieldResolver; _yieldResolver = null; r(); }
    };
}
function _yieldToBrowser() {
    return new Promise(r => {
        if (_yieldChannel) {
            _yieldResolver = r;
            _yieldChannel.port2.postMessage(null);
        } else {
            setTimeout(r, 0);
        }
    });
}

class SINEClusterer {
    constructor(sequences) {
        this.sequences = sequences;
        this.nSeqs = sequences.length;
        this.alnLen = sequences[0].seq.length;
        this.matrix = sequences.map(s => s.seq.split(''));
        this._allSeqIndices = Array.from({length: this.nSeqs}, (_, i) => i);
        this._globalMaxSizeCache = null;
        this._columnCharCounts = null;
    }

    getPositionPatterns(pos, availableSeqs) {
        const patterns = {};
        for (const i of availableSeqs) {
            if (pos >= this.matrix[i].length) continue;  // bounds guard
            const ch = this.matrix[i][pos];
            if (ch === '-' || ch === '.') continue;       // gaps are not diagnostic
            if (!patterns[ch]) patterns[ch] = new Set();
            patterns[ch].add(i);
        }
        return patterns;
    }

    async findBestGroup(availableSeqs, options = {}) {
        const minSize = options.minSize || 3;
        let minOcc = options.minOccurrences || 2;
        if (options.datasetSize > 300) minOcc = 1;

        const qSmall = options.qualitySmall ?? 90;
        const qMed   = options.qualityMedium ?? 80;
        const qLarge = options.qualityLarge ?? 70;

        const breakSM = options.sizeSmallMedium || 11;
        const breakML = options.sizeMediumLarge || 20;

        // Respect trimming boundaries to avoid ragged-end features
        const startPos = options.trimStart || 0;
        const endPos = options.trimEnd !== undefined ? options.trimEnd : this.alnLen;

        let upperBound = availableSeqs.length;
        
        // Upper bound: cap cluster size at 50% of available sequences, but
        // never below minSize — otherwise leftover of size 2*minSize-1 cannot
        // produce any candidate (floor(5*0.5)=2 < minSize 3).
        // Prevent degenerate "everything" clusters while allowing large legitimate subfamilies
        // (e.g. a dominant Alu subfamily can be 30-40% of many SINE datasets).
        if (!options.relaxUpperBound) {
            upperBound = Math.max(minSize, Math.floor(availableSeqs.length * 0.50));
        }

        const _shouldCancel = options.shouldCancel || (() => false);
        const _yieldNow = _yieldToBrowser;
        let _lastYield = performance.now();
        const _CHUNK_MS = 16;

        // Lazy precompute column character counts (total across ALL sequences).
        // Used to compute outside counts in O(1) instead of O(nSeqs) per feature.
        if (!this._columnCharCounts) {
            this._columnCharCounts = new Map();
            for (let pos = 0; pos < this.alnLen; pos++) {
                const counts = new Map();
                for (let i = 0; i < this.nSeqs; i++) {
                    const ch = this.matrix[i][pos];
                    if (ch !== '-' && ch !== '.') {
                        counts.set(ch, (counts.get(ch) || 0) + 1);
                    }
                }
                this._columnCharCounts.set(pos, counts);
            }
        }

        const candidates = new Map();

        // Loop only within valid trimmed region
        for (let pos = startPos; pos < endPos; pos++) {
            const patterns = this.getPositionPatterns(pos, availableSeqs);

            // Skip positions where a single nucleotide dominates the WHOLE alignment
            // (>80% of all sequences, not just the remaining pool) - a conserved,
            // non-diagnostic column. Checking against availableSeqs alone made a
            // perfectly clean remaining cluster look "non-diagnostic" once an earlier
            // cluster was removed and the pool became internally homogeneous, even
            // though it was 100% distinct from the removed cluster.
            let maxGlobalSize;
            if (this._globalMaxSizeCache?.has(pos)) {
                maxGlobalSize = this._globalMaxSizeCache.get(pos);
            } else {
                const globalPatterns = this.getPositionPatterns(pos, this._allSeqIndices);
                maxGlobalSize = Math.max(0, ...Object.values(globalPatterns).map(s => s.size));
                if (!this._globalMaxSizeCache) this._globalMaxSizeCache = new Map();
                this._globalMaxSizeCache.set(pos, maxGlobalSize);
            }
            if (maxGlobalSize / this.nSeqs > 0.8) continue;

            for (const [ch, set] of Object.entries(patterns)) {
                const size = set.size;

                if (size >= minSize && size <= upperBound) {
                    const arr = Array.from(set).sort((a,b)=>a-b);
                    const key = arr.join(',');
                    if (!candidates.has(key)) candidates.set(key, {seq: arr, feats: []});
                    candidates.get(key).feats.push({pos, ch});
                }
            }

            if (performance.now() - _lastYield >= _CHUNK_MS) {
                await _yieldNow();
                if (_shouldCancel()) return null;
                _lastYield = performance.now();
            }
        }

        // fuzzy merge near-identical groups
        // Precompute Sets for O(1) membership tests (avoids O(n) .includes per pair)
        const candidateSets = new Map();
        for (const [k, d] of candidates) {
            candidateSets.set(k, new Set(d.seq));
        }
        const merged = new Map();
        const done = new Set();
        for (const [k1, d1] of candidates) {
            if (done.has(k1)) continue;
            let list = [d1];
            for (const [k2, d2] of candidates) {
                if (k1===k2 || done.has(k2)) continue;
                const d2Set = candidateSets.get(k2);
                const inter = d1.seq.filter(x => d2Set.has(x)).length;
                const union = d1.seq.length + d2.seq.length - inter;
                if (inter/union >= 0.90 && Math.abs(d1.seq.length - d2.seq.length) <= 5) {
                    list.push(d2);
                    done.add(k2);
                }
            }
            const best = list.reduce((a,b)=> a.seq.length > b.seq.length ? a : b);
            const key = best.seq.join(',');
            if (!merged.has(key)) merged.set(key, {seq: best.seq, feats: []});
            for (const g of list) merged.get(key).feats.push(...g.feats);
            done.add(k1);

            if (performance.now() - _lastYield >= _CHUNK_MS) {
                await _yieldNow();
                if (_shouldCancel()) return null;
                _lastYield = performance.now();
            }
        }

        // dedup feats
        for (const d of merged.values()) {
            const seen = new Set();
            d.feats = d.feats.filter(f => {
                const sig = f.pos+':'+f.ch;
                if (seen.has(sig)) return false;
                seen.add(sig);
                return true;
            });
        }

        let best = null;
        let bestScore = -1;

        for (const d of merged.values()) {
            if (d.feats.length < minOcc) continue;
            const gsize = d.seq.length;
            const thresh = gsize < breakSM ? qSmall : gsize < breakML ? qMed : qLarge;
            let good = 0;
            let score = 0;
            const validFeats = [];

            for (const {pos, ch} of d.feats) {
                let inside = 0;
                for (const i of d.seq) if (this.matrix[i][pos] === ch) inside++;

                const totalAtPos = this._columnCharCounts.get(pos)?.get(ch) || 0;
                const outside = totalAtPos - inside;

                const inP = inside / gsize * 100;
                const outP = outside / (this.nSeqs - gsize) * 100 || 0;
                const qual = Math.max(0, inP - outP);

                // Score weighting: perfect-unique (all members match, zero outside) = 3
                // near-perfect (>=80% members match) = 2, majority match = 1.5, imperfect (qual threshold) = 1
                if (outside === 0) {
                    good++;
                    score += inside === gsize ? 3 : inside >= gsize*0.8 ? 2 : 1.5;
                    validFeats.push({pos, ch});
                } else if (qual >= thresh) {
                    good++;
                    score += 1;
                    validFeats.push({pos, ch});
                }
            }

            if (performance.now() - _lastYield >= _CHUNK_MS) {
                await _yieldNow();
                if (_shouldCancel()) return null;
                _lastYield = performance.now();
            }

            if (good >= options.minPerfect && score > bestScore) {
                bestScore = score;
                best = {
                    sequences: d.seq,
                    size: gsize,
                    nPerfect: good,
                    nOccurrences: validFeats.length,
                    occurrences: validFeats
                };
            }
        }

        // Prune outliers (Seq 270 edge case)
        // Size-aware threshold: small groups (< 6 features) need >= 2 matches;
        // larger groups need >= ceil(30% of features).
        if (best && best.occurrences.length > 2) {
            const originalSize = best.sequences.length;
            const robustSequences = [];
            const minMatches = best.occurrences.length <= 5
                ? 2
                : Math.ceil(best.occurrences.length * 0.30);
            
            for (const seqIdx of best.sequences) {
                let matchCount = 0;
                for (const {pos, ch} of best.occurrences) {
                    if (this.matrix[seqIdx][pos] === ch) matchCount++;
                }
                if (matchCount >= minMatches) {
                    robustSequences.push(seqIdx);
                }
            }

            if (robustSequences.length < originalSize) {
                console.log(`[PRUNE] Removed ${originalSize - robustSequences.length} outliers (min ${minMatches}/${best.occurrences.length} matches)`);
                best.sequences = robustSequences;
                best.size = robustSequences.length;
                
                // Re-verify if the group is still valid after pruning
                if (best.size < minSize) {
                    best = null;
                } else {
                    // Re-validate features after prune: recalculate nPerfect and score
                    const gsize = best.size;
                    const thresh = gsize < breakSM ? qSmall
                        : gsize < breakML ? qMed : qLarge;
                    let good = 0, score = 0;
                    const validFeats = [];
                    for (const {pos, ch} of best.occurrences) {
                        let inside = 0;
                        for (const i of best.sequences) if (this.matrix[i][pos] === ch) inside++;
                        const totalAtPos = this._columnCharCounts.get(pos)?.get(ch) || 0;
                        const outside = totalAtPos - inside;
                        const inP = inside / gsize * 100;
                        const outP = outside / (this.nSeqs - gsize) * 100 || 0;
                        const qual = Math.max(0, inP - outP);
                        if (outside === 0) {
                            good++;
                            score += inside === gsize ? 3 : inside >= gsize * 0.8 ? 2 : 1.5;
                            validFeats.push({pos, ch});
                        } else if (qual >= thresh) {
                            good++;
                            score += 1;
                            validFeats.push({pos, ch});
                        }
                    }
                    best.nPerfect = good;
                    best.nOccurrences = validFeats.length;
                    best.occurrences = validFeats;
                    if (good < options.minPerfect) best = null;
                }
            }
        }

        if (!best && merged.size > 0) {
            // No cluster formed from available sequences
        }
        return best;
    }

    // Async version of findBestGroup with yield points inside the column scan,
    // fuzzy merge, and quality scoring loops so the browser can paint and the
    // Stop button can take effect DURING a single round, not just between them.
    // The sync findBestGroup is kept for the synchronous cluster() path.
    async findBestGroupAsync(availableSeqs, options = {}) {
        const minSize = options.minSize || 3;
        let minOcc = options.minOccurrences || 2;
        if (options.datasetSize > 300) minOcc = 1;

        const qSmall = options.qualitySmall ?? 90;
        const qMed   = options.qualityMedium ?? 80;
        const qLarge = options.qualityLarge ?? 70;

        const breakSM = options.sizeSmallMedium || 11;
        const breakML = options.sizeMediumLarge || 20;

        // Respect trimming boundaries to avoid ragged-end features
        const startPos = options.trimStart || 0;
        const endPos = options.trimEnd !== undefined ? options.trimEnd : this.alnLen;

        let upperBound = availableSeqs.length;

        // Upper bound: cap cluster size at 50% of available sequences, but
        // never below minSize — otherwise leftover of size 2*minSize-1 cannot
        // produce any candidate (floor(5*0.5)=2 < minSize 3).
        // Prevent degenerate "everything" clusters while allowing large legitimate subfamilies
        // (e.g. a dominant Alu subfamily can be 30-40% of many SINE datasets).
        if (!options.relaxUpperBound) {
            upperBound = Math.max(minSize, Math.floor(availableSeqs.length * 0.50));
        }

        const candidates = new Map();
        const _yield = () => new Promise(r => setTimeout(r, 0));
        const _cancelled = () => !!(options.shouldCancel && options.shouldCancel());

        // Loop only within valid trimmed region - chunked with yields
        const COL_CHUNK = 200;
        let colCount = 0;
        for (let pos = startPos; pos < endPos; pos++) {
            const patterns = this.getPositionPatterns(pos, availableSeqs);

            // Skip positions where a single nucleotide dominates the WHOLE alignment
            // (>80% of all sequences, not just the remaining pool) - a conserved,
            // non-diagnostic column. Checking against availableSeqs alone made a
            // perfectly clean remaining cluster look "non-diagnostic" once an earlier
            // cluster was removed and the pool became internally homogeneous, even
            // though it was 100% distinct from the removed cluster.
            const globalPatterns = this.getPositionPatterns(pos, this._allSeqIndices);
            const maxGlobalSize = Math.max(...Object.values(globalPatterns).map(s => s.size));
            if (maxGlobalSize / this.nSeqs > 0.8) continue;

            for (const [ch, set] of Object.entries(patterns)) {
                const size = set.size;

                if (size >= minSize && size <= upperBound) {
                    const arr = Array.from(set).sort((a,b)=>a-b);
                    const key = arr.join(',');
                    if (!candidates.has(key)) candidates.set(key, {seq: arr, feats: []});
                    candidates.get(key).feats.push({pos, ch});
                }
            }

            if (++colCount >= COL_CHUNK) {
                if (_cancelled()) return null;
                colCount = 0;
                await _yield();
            }
        }

        // fuzzy merge near-identical groups
        const merged = new Map();
        const done = new Set();
        let mergeCount = 0;
        for (const [k1, d1] of candidates) {
            if (done.has(k1)) continue;
            let list = [d1];
            for (const [k2, d2] of candidates) {
                if (k1===k2 || done.has(k2)) continue;
                const inter = d1.seq.filter(x=>d2.seq.includes(x)).length;
                const union = new Set([...d1.seq, ...d2.seq]).size;
                if (inter/union >= 0.90 && Math.abs(d1.seq.length - d2.seq.length) <= 5) {
                    list.push(d2);
                    done.add(k2);
                }
            }
            const best = list.reduce((a,b)=> a.seq.length > b.seq.length ? a : b);
            const key = best.seq.join(',');
            if (!merged.has(key)) merged.set(key, {seq: best.seq, feats: []});
            for (const g of list) merged.get(key).feats.push(...g.feats);
            done.add(k1);

            if (++mergeCount >= 30) {
                if (_cancelled()) return null;
                mergeCount = 0;
                await _yield();
            }
        }

        // dedup feats
        for (const d of merged.values()) {
            const seen = new Set();
            d.feats = d.feats.filter(f => {
                const sig = f.pos+':'+f.ch;
                if (seen.has(sig)) return false;
                seen.add(sig);
                return true;
            });
        }

        let best = null;
        let bestScore = -1;
        let scoreCount = 0;

        for (const d of merged.values()) {
            if (d.feats.length < minOcc) continue;
            const gsize = d.seq.length;
            const thresh = gsize < breakSM ? qSmall : gsize < breakML ? qMed : qLarge;

            let good = 0;
            let score = 0;
            const validFeats = [];

            for (const {pos, ch} of d.feats) {
                let inside = 0;
                for (const i of d.seq) if (this.matrix[i][pos] === ch) inside++;

                let outside = 0;
                for (let i=0; i<this.nSeqs; i++) {
                    if (!d.seq.includes(i) && this.matrix[i][pos] === ch) outside++;
                }

                const inP = inside / gsize * 100;
                const outP = outside / (this.nSeqs - gsize) * 100 || 0;
                const qual = Math.max(0, inP - outP);

                // Score weighting: perfect-unique (all members match, zero outside) = 3
                // near-perfect (>=80% members match) = 2, majority match = 1.5, imperfect (qual threshold) = 1
                if (outside === 0) {
                    good++;
                    score += inside === gsize ? 3 : inside >= gsize*0.8 ? 2 : 1.5;
                    validFeats.push({pos, ch});
                } else if (qual >= thresh) {
                    good++;
                    score += 1;
                    validFeats.push({pos, ch});
                }
            }

            if (good >= options.minPerfect && score > bestScore) {
                bestScore = score;
                best = {
                    sequences: d.seq,
                    size: gsize,
                    nPerfect: good,
                    nOccurrences: validFeats.length,
                    occurrences: validFeats
                };
            }

            if (++scoreCount >= 5) {
                if (_cancelled()) return null;
                scoreCount = 0;
                await _yield();
            }
        }

        // Prune outliers (Seq 270 edge case)
        // Size-aware threshold: small groups (< 6 features) need >= 2 matches;
        // larger groups need >= ceil(30% of features).
        if (best && best.occurrences.length > 2) {
            const originalSize = best.sequences.length;
            const robustSequences = [];
            const minMatches = best.occurrences.length <= 5
                ? 2
                : Math.ceil(best.occurrences.length * 0.30);

            for (const seqIdx of best.sequences) {
                let matchCount = 0;
                for (const {pos, ch} of best.occurrences) {
                    if (this.matrix[seqIdx][pos] === ch) matchCount++;
                }
                if (matchCount >= minMatches) {
                    robustSequences.push(seqIdx);
                }
            }

            if (robustSequences.length < originalSize) {
                console.log(`[PRUNE] Removed ${originalSize - robustSequences.length} outliers (min ${minMatches}/${best.occurrences.length} matches)`);
                best.sequences = robustSequences;
                best.size = robustSequences.length;

                // Re-verify if the group is still valid after pruning
                if (best.size < minSize) {
                    best = null;
                } else {
                    // Re-validate features after prune: recalculate nPerfect and score
                    const gsize = best.size;
                    const thresh = gsize < breakSM ? qSmall
                        : gsize < breakML ? qMed : qLarge;
                    let good = 0, score = 0;
                    const validFeats = [];
                    for (const {pos, ch} of best.occurrences) {
                        let inside = 0, outside = 0;
                        for (const i of best.sequences) if (this.matrix[i][pos] === ch) inside++;
                        for (let i = 0; i < this.nSeqs; i++) {
                            if (!best.sequences.includes(i) && this.matrix[i][pos] === ch) outside++;
                        }
                        const inP = inside / gsize * 100;
                        const outP = outside / (this.nSeqs - gsize) * 100 || 0;
                        const qual = Math.max(0, inP - outP);
                        if (outside === 0) {
                            good++;
                            score += inside === gsize ? 3 : inside >= gsize * 0.8 ? 2 : 1.5;
                            validFeats.push({pos, ch});
                        } else if (qual >= thresh) {
                            good++;
                            score += 1;
                            validFeats.push({pos, ch});
                        }
                    }
                    best.nPerfect = good;
                    best.nOccurrences = validFeats.length;
                    best.occurrences = validFeats;
                    if (good < options.minPerfect) best = null;
                }
            }
        }

        if (!best && merged.size > 0) {
            // No cluster formed from available sequences
        }
        return best;
    }

    getFeaturesByQuality(c) {
        const perfect = [], imperfect = [];
        const set = new Set(c.sequences);
        for (const {pos, ch} of c.occurrences) {
            let out = 0;
            for (let i=0; i<this.nSeqs; i++) if (!set.has(i) && this.matrix[i][pos]===ch) out++;
            (out===0 ? perfect : imperfect).push({pos:pos+1, char:ch, countOutside:out});
        }
        return {perfectFeatures: perfect, imperfectFeatures: imperfect};
    }

    _ensureColumnCharCounts() {
        if (this._columnCharCounts) return;
        this._columnCharCounts = new Map();
        for (let pos = 0; pos < this.alnLen; pos++) {
            const counts = new Map();
            for (let i = 0; i < this.nSeqs; i++) {
                const ch = this.matrix[i][pos];
                if (ch !== '-' && ch !== '.') {
                    counts.set(ch, (counts.get(ch) || 0) + 1);
                }
            }
            this._columnCharCounts.set(pos, counts);
        }
    }

    _seqIndex(x) {
        if (typeof x === 'number' && x >= 0) return x;
        if (x && typeof x.index === 'number') return x.index;
        return -1;
    }

    /**
     * Given a row partition (types), score every column as a character of each
     * type. Discovery is inverted: groups are already known (k-mer tree or
     * diagnostic positions); this only asks which columns characterize them.
     * Strict = exclusive (outside 0). Cloudy = enriched in the type but leaky.
     */
    characterizeGroups(groupIndexLists, options) {
        options = options || {};
        const minSize = options.minSize || 3;
        const inMin = options.cloudyInFreq != null ? options.cloudyInFreq : 0.55;
        const outMax = options.cloudyOutFreq != null ? options.cloudyOutFreq : 0.40;
        const deltaMin = options.cloudyDelta != null ? options.cloudyDelta : 0.35;
        const consGate = 0.8;
        this._ensureColumnCharCounts();

        const lists = Array.isArray(groupIndexLists) ? groupIndexLists : [];
        const results = [];
        for (let gi = 0; gi < lists.length; gi++) {
            const members = [];
            const raw = lists[gi] || [];
            for (let k = 0; k < raw.length; k++) {
                const idx = this._seqIndex(raw[k]);
                if (idx >= 0 && idx < this.nSeqs) members.push(idx);
            }
            const gsize = members.length;
            const outsideN = this.nSeqs - gsize;
            const strict = [];
            const cloudy = [];
            if (gsize < minSize) {
                results.push({ perfectFeatures: strict, cloudyFeatures: cloudy, motifRuns: [] });
                continue;
            }
            for (let pos = 0; pos < this.alnLen; pos++) {
                const gcounts = this._columnCharCounts.get(pos);
                let maxGlobal = 0;
                let globChar = null;
                if (gcounts) {
                    gcounts.forEach(function (v, ch) {
                        if (v > maxGlobal) { maxGlobal = v; globChar = ch; }
                    });
                }

                const counts = new Map();
                let insideCovered = 0;
                for (let m = 0; m < members.length; m++) {
                    const ch = this.matrix[members[m]][pos];
                    if (!ch || ch === '-' || ch === '.') continue;
                    counts.set(ch, (counts.get(ch) || 0) + 1);
                    insideCovered++;
                }
                if (insideCovered < minSize) continue;

                let b = null, bCount = 0;
                counts.forEach(function (n, ch) {
                    if (n > bCount) { b = ch; bCount = n; }
                });
                if (!b) continue;

                // Skip the shared conserved core only when this type agrees with
                // it. A minority apomorphy in an otherwise 80%+ column (K3 C vs
                // consensus G at CTCCCAGG) is a type character, not core.
                if (this.nSeqs > 0 && maxGlobal / this.nSeqs > consGate && b === globChar) continue;

                const inside = bCount;
                const totalAtPos = (gcounts && gcounts.get(b)) || 0;
                const outside = Math.max(0, totalAtPos - inside);
                const inFreq = inside / gsize;
                const outFreq = outsideN > 0 ? outside / outsideN : 0;

                if (outside === 0 && inside >= minSize) {
                    strict.push({ pos: pos + 1, char: b, countOutside: 0, inFreq: inFreq, outFreq: outFreq });
                } else if (inside >= minSize && inFreq >= inMin && outFreq <= outMax && (inFreq - outFreq) >= deltaMin) {
                    cloudy.push({ pos: pos + 1, char: b, countOutside: outside, inFreq: inFreq, outFreq: outFreq });
                }
            }
            results.push({
                perfectFeatures: strict,
                cloudyFeatures: cloudy,
                motifRuns: SINEClusterer.mergeMotifRuns(strict, cloudy)
            });
        }
        return results;
    }

    attachCharacterization(clusters, options) {
        options = options || {};
        const lists = (clusters || []).map(c => c.sequences || []);
        const chars = this.characterizeGroups(lists, options);
        for (let i = 0; i < (clusters || []).length; i++) {
            SINEClusterer.applyCharacterization(clusters[i], chars[i], !!options.unionCloudy);
        }
        return chars;
    }

    static applyCharacterization(cluster, char, unionCloudy) {
        if (!cluster || !char) return cluster;
        if (!unionCloudy) {
            cluster.perfectFeatures = char.perfectFeatures || [];
            cluster.cloudyFeatures = char.cloudyFeatures || [];
            cluster.motifRuns = char.motifRuns || [];
            cluster.nPerfect = cluster.perfectFeatures.length;
            return cluster;
        }
        if (!cluster.perfectFeatures) cluster.perfectFeatures = [];
        const seen = new Set(cluster.perfectFeatures.map(f => f.pos + ':' + f.char));
        const extra = char.perfectFeatures || [];
        for (let i = 0; i < extra.length; i++) {
            const f = extra[i];
            const k = f.pos + ':' + f.char;
            if (!seen.has(k)) {
                cluster.perfectFeatures.push(f);
                seen.add(k);
            }
        }
        cluster.cloudyFeatures = (char.cloudyFeatures || []).filter(f => !seen.has(f.pos + ':' + f.char));
        cluster.motifRuns = char.motifRuns || [];
        cluster.nPerfect = cluster.perfectFeatures.length;
        return cluster;
    }

    static mergeMotifRuns(strict, cloudy) {
        const byPos = new Map();
        (strict || []).forEach(f => byPos.set(f.pos, { pos: f.pos, char: f.char, grade: 'strict' }));
        (cloudy || []).forEach(f => {
            if (!byPos.has(f.pos)) byPos.set(f.pos, { pos: f.pos, char: f.char, grade: 'cloudy' });
        });
        const poss = Array.from(byPos.keys()).sort((a, b) => a - b);
        const runs = [];
        let run = null;
        for (let i = 0; i < poss.length; i++) {
            const p = poss[i];
            const f = byPos.get(p);
            if (run && p === run.end + 1) {
                run.end = p;
                run.motif += f.char;
                if (f.grade === 'strict') run.nStrict++;
                else run.nCloudy++;
            } else {
                if (run) runs.push(run);
                run = {
                    start: p,
                    end: p,
                    motif: f.char,
                    nStrict: f.grade === 'strict' ? 1 : 0,
                    nCloudy: f.grade === 'cloudy' ? 1 : 0
                };
            }
        }
        if (run) runs.push(run);
        return runs;
    }

    /**
     * How many groups to cut an UPGMA guide tree into. mergeDistances[i] is
     * the distance of the i-th closest merge (first merge = 0). The cut is
     * the largest jump in that series; if several jumps are close, the
     * finer split (more groups) is kept so visual bands are not collapsed.
     */
    static suggestGroupCount(mergeDistances, n) {
        const dists = mergeDistances || [];
        const maxK = Math.min(15, Math.max(2, (n || 0) - 1));
        if (!n || n < 3 || !dists.length) return Math.min(4, Math.max(2, n || 2));
        const candidates = [];
        for (let m = 0; m < dists.length; m++) {
            const kAfter = n - (m + 1);
            if (kAfter < 2 || kAfter > maxK) continue;
            const d0 = dists[m];
            const d1 = m + 1 < dists.length ? dists[m + 1] : d0;
            candidates.push({ k: kAfter, gap: d1 - d0 });
        }
        if (!candidates.length) return Math.min(4, maxK);
        let maxGap = 0;
        for (let i = 0; i < candidates.length; i++) {
            if (candidates[i].gap > maxGap) maxGap = candidates[i].gap;
        }
        if (maxGap <= 0) return Math.min(4, maxK);
        const prominent = candidates.filter(c => c.gap >= maxGap * 0.5);
        prominent.sort((a, b) => b.k - a.k);
        return prominent[0].k;
    }

    /**
     * Tag a bicluster rectangle's row-ids against type id-lists (same id space:
     * sequence indices or headers). inside = all rect rows subset of one type;
     * supports = Jaccard >= 0.5 but not a subset; discordant = mixed types.
     */
    static tagRectangleAgainstTypes(rectIds, typeIdLists) {
        if (!rectIds || rectIds === 'all' || !rectIds.length) {
            return { kind: 'none', typeIdx: -1, jaccard: 0 };
        }
        const R = new Set(rectIds);
        let bestInside = null;
        let bestSupport = null;
        let typesHit = 0;
        const lists = typeIdLists || [];
        for (let t = 0; t < lists.length; t++) {
            const T = new Set(lists[t] || []);
            if (!T.size) continue;
            let inter = 0;
            R.forEach(function (id) { if (T.has(id)) inter++; });
            if (inter === 0) continue;
            typesHit++;
            const union = R.size + T.size - inter;
            const jaccard = union ? inter / union : 0;
            const subset = inter === R.size && R.size >= 2;
            if (subset) {
                if (!bestInside || jaccard > bestInside.jaccard) {
                    bestInside = { kind: 'inside', typeIdx: t, jaccard: jaccard };
                }
            } else if (jaccard >= 0.5) {
                if (!bestSupport || jaccard > bestSupport.jaccard) {
                    bestSupport = { kind: 'supports', typeIdx: t, jaccard: jaccard };
                }
            }
        }
        if (bestInside) return bestInside;
        if (bestSupport) return bestSupport;
        if (typesHit >= 2) return { kind: 'discordant', typeIdx: -1, jaccard: 0 };
        return { kind: 'none', typeIdx: -1, jaccard: 0 };
    }

    _makeOptions(opts = {}) {
        return {
            minSize: 3,
            minPerfect: 4,
            maxIterations: 20,
            qualitySmall: 85,
            qualityMedium: 75,
            qualityLarge: 65,
            minOccurrences: 2,
            trimStart: 0,            // Default to no trimming
            trimEnd: this.alnLen,    // Default to full length
            ...opts
        };
    }

    async cluster(opts = {}) {
        const o = this._makeOptions(opts);

        const clusters = [];
        let avail = Array.from({length:this.nSeqs},(_,i)=>i);
        const onProgress = o.onProgress || (() => {});

        console.log('Starting SINE clustering — final stable version');

        let it = 0;
        while (avail.length >= o.minSize && it < o.maxIterations) {
            it++;
            const step = await this._clusterIteration(avail, clusters, o, it);
            // A miss this round is not the end: later rounds relax minPerfect /
            // quality. Stopping here made Max Iter a no-op whenever round 1
            // found nothing (the svk 600-consensus case).
            if (!step.group) continue;
            clusters.push(step.group);
            avail = step.avail;
            onProgress(`Cluster ${clusters.length}: ${step.group.size} seqs, ${clusters.reduce((a,c)=>a+c.size,0)} assigned, ${avail.length} remaining`);
        }

        return this._finaliseClusters(clusters, avail, o);
    }

    // One round of the search, shared by cluster() and clusterChunked() below,
    // so the two cannot drift apart. Now async: yields within findBestGroup.
    async _clusterIteration(avail, clusters, o, it) {
            const prog = it / o.maxIterations;

            // Later rounds may ease Min Features, but never down to 1–2:
            // that harvested noise triplets on uniform alignments (clean_core).
            const minPFloor = Math.min(3, o.minPerfect);
            const curMinP = Math.max(minPFloor, Math.round(o.minPerfect * (1 - prog * 0.5)));
            const curMinO = avail.length <= 20 ? 1 : o.minOccurrences;
            const curQS = Math.max(25, o.qualitySmall - prog*50);
            const curQM = Math.max(20, o.qualityMedium - prog*50);
            const curQL = Math.max(15, o.qualityLarge - prog*50);

            const assigned = clusters.flatMap(c => c.sequences);

            const go = {
                minSize: o.minSize,
                minPerfect: curMinP,
                minOccurrences: curMinO,
                qualitySmall: curQS,
                qualityMedium: curQM,
                qualityLarge: curQL,
                sizeSmallMedium: o.sizeSmallMedium,
                sizeMediumLarge: o.sizeMediumLarge,
                datasetSize: this.nSeqs,
                assignedSeqs: assigned,
                relaxUpperBound: false,
                trimStart: o.trimStart, // Pass trimming down
                trimEnd: o.trimEnd,      // Pass trimming down
                shouldCancel: o.shouldCancel || (() => false)
            };

            if (avail.length <= 10) {
                // Tiny leftover: still require a real diagnostic column, not a forced fit.
                go.minOccurrences = 1;
            }

            let group = await this.findBestGroup(avail, go);

            // Retry with relaxed upper bound if strict search fails — but do NOT
            // also relax Min Features. A leftover clump with 1–4 weak columns is
            // how this used to report a fake "cluster" of hundreds of sequences
            // (svk 600-consensus). A real majority subfamily still passes because
            // it has the original number of diagnostic positions.
            if (!group && avail.length >= o.minSize && !(o.shouldCancel && o.shouldCancel())) {
                console.log(`[RETRY] No group found. Retrying with relaxed upper bound...`);
                go.relaxUpperBound = true;
                go.minPerfect = o.minPerfect;
                go.minOccurrences = o.minOccurrences;
                group = await this.findBestGroup(avail, go);
                // All-of-remaining with too few *perfect* (outside=0) columns is
                // the leftover pile. Quality-passing imperfect columns are shared
                // ancestral noise (svk mixed sisters had 64 such and only 3
                // perfect). A real last type has minPerfect exclusive columns
                // (planted B: 8 T's that the extracted A's lack).
                if (group && group.size >= avail.length) {
                    const nPerf = (this.getFeaturesByQuality(group).perfectFeatures || []).length;
                    if (nPerf < o.minPerfect) group = null;
                }
            }

            if (group) {
                // Attach features to the group object for script.js access
                const f = this.getFeaturesByQuality(group);
                group.perfectFeatures = f.perfectFeatures;
                group.imperfectFeatures = f.imperfectFeatures;
                console.log(`Cluster ${clusters.length + 1}: size=${group.size} perfect=${f.perfectFeatures.length} total=${group.nOccurrences}`);
                return { group, avail: avail.filter(i => !group.sequences.includes(i)) };
            }
            if (avail.length >= o.minSize) console.log(`Stopped — ${avail.length} left as noise`);
            return { group: null, avail };
    }

    // Same search, yielding between rounds AND within each round's findBestGroup call,
    // so the page can repaint and the run can be stopped promptly at any point.
    async clusterChunked(opts = {}) {
        const o = this._makeOptions(opts);
        const clusters = [];
        let avail = Array.from({length:this.nSeqs},(_,i)=>i);
        const onProgress = o.onProgress || (() => {});
        const shouldCancel = o.shouldCancel || (() => false);
        const yieldNow = () => new Promise(r => setTimeout(r, 0));

        let it = 0, cancelled = false;
        while (avail.length >= o.minSize && it < o.maxIterations) {
            it++;
            onProgress(`Round ${it} of at most ${o.maxIterations} - ${clusters.length} found, ${avail.length} sequences left`);
            await yieldNow();
            if (shouldCancel()) { cancelled = true; break; }
            const step = await this._clusterIteration(avail, clusters, o, it);
            if (!step.group) continue;
            clusters.push(step.group);
            avail = step.avail;
        }
        const out = this._finaliseClusters(clusters, avail, o);
        out.cancelled = cancelled;
        return out;
    }

    _finaliseClusters(clusters, avail, o) {
        // Return object structure expected by script.js
        // Map sequence indices to full sequence objects for the clusters
        const validClusters = clusters.map(c => ({
            ...c,
            sequences: c.sequences.map(idx => ({
                index: idx,
                id: this.sequences[idx].id,
                seq: this.sequences[idx].seq
            }))
        }));
        
        const assignedCount = validClusters.reduce((a,c) => a + c.size, 0);

        return {
            clusters: validClusters,
            unassigned: avail.map(i => ({index: i, id: this.sequences[i].id, seq: this.sequences[i].seq})),
            summary: {
                nClusters: validClusters.length,
                nAssigned: assignedCount,
                nUnassigned: avail.length,
                nTotal: this.nSeqs
            }
        };
    }

    static getClusterColors() {
        return [
            '#e41a1c', // red
            '#377eb8', // blue
            '#4daf4a', // green
            '#984ea3', // purple
            '#ff7f00', // orange
            '#ffff33', // yellow
            '#a65628', // brown
            '#f781bf', // pink
            '#999999'  // gray
        ];
    }
}

/**
 * Calculate trim boundaries using sliding window gap analysis
 * @param {Array} sequences - [{id, seq}, ...]
 * @param {Object} options - {edgeWindow, leftGapThresh, rightGapThresh}
 * @returns {Object} {leftTrimEnd, rightTrimStart} - 0-based indices
 */
function getTrimBoundaries(sequences, options = {}) {
    const EDGE_WINDOW = options.edgeWindow || 15;
    const LEFT_GAP = options.leftGapThresh !== undefined ? options.leftGapThresh : 0.50;
    const RIGHT_GAP = options.rightGapThresh !== undefined ? options.rightGapThresh : 0.80;
    
    const nSeqs = sequences.length;
    const alnLen = sequences[0].seq.length;
    
    // Convert to matrix for fast access
    const matrix = sequences.map(s => s.seq.split(''));
    
    let leftTrimEnd = -1;
    let rightTrimStart = alnLen;
    
    // STEP 1: Trim from LEFT
    let winGaps = 0;
    let winCols = 0;
    
    for (let col = 0; col < alnLen; col++) {
        // Count gaps in current column
        let gapCount = 0;
        for (let s = 0; s < nSeqs; s++) {
            const char = matrix[s][col];
            if (char === '-' || char === '.') gapCount++;
        }
        
        // Add to window
        winCols++;
        winGaps += gapCount;
        
        // Slide window if larger than EDGE_WINDOW
        if (winCols > EDGE_WINDOW) {
            let oldGapCount = 0;
            const oldCol = col - EDGE_WINDOW;
            for (let s = 0; s < nSeqs; s++) {
                const char = matrix[s][oldCol];
                if (char === '-' || char === '.') oldGapCount++;
            }
            winGaps -= oldGapCount;
            winCols--;
        }
        
        const cumulativeGapPct = winGaps / (winCols * nSeqs);
        
        if (cumulativeGapPct > LEFT_GAP) {
            leftTrimEnd = col;
        } else {
            // Found first position with acceptable gaps, stop trimming left
            break;
        }
    }
    
    // STEP 2: Trim from RIGHT
    winGaps = 0;
    winCols = 0;
    const winGapArray = [];
    
    for (let col = alnLen - 1; col >= 0; col--) {
        // Count gaps in current column
        let gapCount = 0;
        for (let s = 0; s < nSeqs; s++) {
            const char = matrix[s][col];
            if (char === '-' || char === '.') gapCount++;
        }
        
        // Add to window
        winGapArray.push(gapCount);
        winCols++;
        winGaps += gapCount;
        
        // Slide window if larger than EDGE_WINDOW
        if (winCols > EDGE_WINDOW) {
            winGaps -= winGapArray.shift();
            winCols--;
        }
        
        const cumulativeGapPct = winGaps / (winCols * nSeqs);
        
        if (cumulativeGapPct > RIGHT_GAP) {
            rightTrimStart = col;
        } else {
            // Found last position with acceptable gaps, stop trimming right
            break;
        }
    }
    
    console.log(`Trim boundaries: left=${leftTrimEnd + 1} cols removed, right=${alnLen - rightTrimStart} cols removed`);
    
    return {
        leftTrimEnd: leftTrimEnd,    // Last removed column index on left (0-based)
        rightTrimStart: rightTrimStart // First removed column index on right (0-based)
    };
}
