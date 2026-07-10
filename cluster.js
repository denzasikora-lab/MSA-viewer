class SINEClusterer {
    constructor(sequences) {
        this.sequences = sequences;
        this.nSeqs = sequences.length;
        this.alnLen = sequences[0].seq.length;
        this.matrix = sequences.map(s => s.seq.split(''));
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

    findBestGroup(availableSeqs, options = {}) {
        const minSize = options.minSize || 3;
        let minOcc = options.minOccurrences || 2;
        if (options.datasetSize > 300) minOcc = 1;

        const qSmall = options.qualitySmall ?? 90;
        const qMed   = options.qualityMedium ?? 80;
        const qLarge = options.qualityLarge ?? 70;

        const breakSM = options.sizeSmallMedium || 11;
        const breakML = options.sizeMediumLarge || 20;

        // FIX: Respect trimming boundaries to avoid "ragged end" features
        const startPos = options.trimStart || 0;
        const endPos = options.trimEnd !== undefined ? options.trimEnd : this.alnLen;

        let upperBound = availableSeqs.length;
        
        // Upper bound: cap cluster size at 50% of available sequences.
        // Prevent degenerate "everything" clusters while allowing large legitimate subfamilies
        // (e.g. a dominant Alu subfamily can be 30-40% of many SINE datasets).
        if (!options.relaxUpperBound) {
            upperBound = Math.floor(availableSeqs.length * 0.50);
        }

        const candidates = new Map();

        // FIX: Loop only within valid trimmed region
        for (let pos = startPos; pos < endPos; pos++) {
            const patterns = this.getPositionPatterns(pos, availableSeqs);

            // Skip positions where any single nucleotide dominates (>80% of avail seqs)
            const availLen = availableSeqs.length;
            const maxSize = Math.max(...Object.values(patterns).map(s => s.size));
            if (maxSize / availLen > 0.8) continue;

            for (const [ch, set] of Object.entries(patterns)) {
                const size = set.size;

                if (size >= minSize && size <= upperBound) {
                    const arr = Array.from(set).sort((a,b)=>a-b);
                    const key = arr.join(',');
                    if (!candidates.has(key)) candidates.set(key, {seq: arr, feats: []});
                    candidates.get(key).feats.push({pos, ch});
                }
            }
        }

        // fuzzy merge near-identical groups
        const merged = new Map();
        const done = new Set();
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
        }

        // FIX: Prune outliers (The "Seq 270" Fix)
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
                    const thresh = gsize < options.sizeSmallMedium ? options.qualitySmall
                        : gsize < options.sizeMediumLarge ? options.qualityMedium : options.qualityLarge;
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
            console.log(`[DEBUG] No cluster | avail=${availableSeqs.length} minPerfect=${options.minPerfect} upper=${upperBound}`);
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

    cluster(opts = {}) {
        const o = {
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

        const clusters = [];
        let avail = Array.from({length:this.nSeqs},(_,i)=>i);
        const onProgress = o.onProgress || (() => {});

        console.log('Starting SINE clustering — final stable version');

        let it = 0;
        while (avail.length >= o.minSize && it < o.maxIterations) {
            it++;
            const prog = it / o.maxIterations;

            const curMinP = Math.max(1, Math.round(o.minPerfect * (1 - prog * 0.75)));
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
                trimEnd: o.trimEnd      // Pass trimming down
            };

            if (avail.length <= 10) {
                console.log(`[RESCUE] ${avail.length} left → ultra relaxed`);
                go.minPerfect = 1;
                go.minOccurrences = 1;
            }

            let group = this.findBestGroup(avail, go);

            // FIX: Retry with relaxed upper bound if strict search fails
            if (!group && avail.length >= o.minSize) {
                console.log(`[RETRY] No group found. Retrying with relaxed upper bound...`);
                go.relaxUpperBound = true;
                group = this.findBestGroup(avail, go);
            }

            if (group) {
                // FIX: Attach features to the group object so script.js can access them
                const f = this.getFeaturesByQuality(group);
                group.perfectFeatures = f.perfectFeatures;
                group.imperfectFeatures = f.imperfectFeatures;

                clusters.push(group);
                avail = avail.filter(i => !group.sequences.includes(i));
                onProgress(`Cluster ${clusters.length}: ${group.size} seqs, ${clusters.reduce((a,c)=>a+c.size,0)} assigned, ${avail.length} remaining`);
                console.log(`Cluster ${clusters.length}: size=${group.size} perfect=${f.perfectFeatures.length} total=${group.nOccurrences}`);
            } else {
                if (avail.length >= o.minSize) console.log(`Stopped — ${avail.length} left as noise`);
                break;
            }
        }

        // FIX: Return object structure expected by script.js
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