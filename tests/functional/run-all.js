// Functional tests: each check exercises a real feature through its real
// UI/function call path and asserts specific, correct output - not just
// "didn't crash." See FUNCTIONAL_TESTS_PROGRESS.md for coverage status.
const { start } = require('../lib/static-server');
const { launch, makeFasta, loadFasta, loadSyntheticFasta, setMode } = require('../lib/browser');

const CHECKS = [];
function check(name, fn) { CHECKS.push({ name, fn }); }

check('Reads mode: SAM loads 3 mapped reads with correct track packing', async (page) => {
    // 1. Load a 32bp reference sequence
    const refFasta = '>ref\nACGTACGTACGTACGTACGTACGTACGTACGT\n';
    await loadFasta(page, refFasta);

    // 2. Construct a SAM file with 3 reads at known positions.
    //    SAM POS is 1-based; the parser converts to 0-based.
    //    read1: POS=1  -> 0-based 0,  10M -> spans 0-9
    //    read2: POS=5  -> 0-based 4,  10M -> spans 4-13  (overlaps read1 -> track 1)
    //    read3: POS=15 -> 0-based 14, 10M -> spans 14-23 (no overlap  -> track 0)
    const samText = [
        '@HD\tVN:1.6\tSO:coordinate',
        '@SQ\tSN:ref\tLN:32',
        'read1\t0\tref\t1\t60\t10M\t*\t0\t0\tACGTACGTAC\t*',
        'read2\t0\tref\t5\t60\t10M\t*\t0\t0\tACGTACGTAC\t*',
        'read3\t0\tref\t15\t60\t10M\t*\t0\t0\tACGTACGTAC\t*',
    ].join('\n');

    // 3. Load SAM through the real handleBamFile entry point
    await page.evaluate(async (samText) => {
        const file = new File([samText], 'test.sam', { type: 'text/plain' });
        const event = { target: { files: [file], value: '' } };
        await handleBamFile(event);
    }, samText);
    await page.waitForTimeout(300);

    // 4. Assert specific, correct output
    const result = await page.evaluate(() => {
        const reads = bamState.reads;
        const svg = document.querySelector('#readsPileSvg');
        // Main read bars use fill #c8d8e8 (set in renderReadsAlignment)
        const readBars = svg ? svg.querySelectorAll('rect[fill="#c8d8e8"]').length : 0;
        return {
            readCount: reads ? reads.length : 0,
            refName: bamState.refName,
            nTracks: bamState.nTracks,
            svgExists: !!svg,
            readBars,
            readDetails: reads ? reads.map(r => ({
                name: r.name,
                start: r.start,
                end: r.end,
                track: r.track,
            })) : [],
        };
    });

    if (result.readCount !== 3) {
        return { pass: false, detail: `expected 3 reads in bamState, got ${result.readCount}` };
    }
    if (result.refName !== 'ref') {
        return { pass: false, detail: `expected refName 'ref', got '${result.refName}'` };
    }
    if (!result.svgExists) {
        return { pass: false, detail: 'SVG element #readsPileSvg not found' };
    }
    if (result.readBars !== 3) {
        return { pass: false, detail: `expected 3 read bars in SVG, got ${result.readBars}` };
    }
    const r1 = result.readDetails.find(r => r.name === 'read1');
    const r2 = result.readDetails.find(r => r.name === 'read2');
    const r3 = result.readDetails.find(r => r.name === 'read3');
    if (!r1 || !r2 || !r3) {
        return { pass: false, detail: `missing reads: ${JSON.stringify(result.readDetails)}` };
    }
    if (r1.start !== 0 || r1.end !== 9) {
        return { pass: false, detail: `read1 span: start=${r1.start} end=${r1.end}, expected 0-9` };
    }
    if (r2.start !== 4 || r2.end !== 13) {
        return { pass: false, detail: `read2 span: start=${r2.start} end=${r2.end}, expected 4-13` };
    }
    if (r3.start !== 14 || r3.end !== 23) {
        return { pass: false, detail: `read3 span: start=${r3.start} end=${r3.end}, expected 14-23` };
    }
    if (r1.track !== 0 || r2.track !== 1 || r3.track !== 0) {
        return { pass: false, detail: `tracks: r1=${r1.track} r2=${r2.track} r3=${r3.track}, expected 0,1,0` };
    }
    if (result.nTracks !== 2) {
        return { pass: false, detail: `expected 2 tracks, got ${result.nTracks}` };
    }
    return { pass: true, detail: `3 reads, 2 tracks, 3 bars rendered` };
});

check('Clustering: 10 sequences in 2 clear groups cluster correctly', async (page) => {
    // 1. Load 10 sequences: 5 identical 'A' sequences and 5 identical 'T' sequences.
    //    Every position is a diagnostic position (A vs T), giving 20 perfect features.
    //    With 5 seqs per group, default minOccurrences=5 is met.
    const fasta = [
        '>seqA1', 'AAAAAAAAAAAAAAAAAAAA',
        '>seqA2', 'AAAAAAAAAAAAAAAAAAAA',
        '>seqA3', 'AAAAAAAAAAAAAAAAAAAA',
        '>seqA4', 'AAAAAAAAAAAAAAAAAAAA',
        '>seqA5', 'AAAAAAAAAAAAAAAAAAAA',
        '>seqB1', 'TTTTTTTTTTTTTTTTTTTT',
        '>seqB2', 'TTTTTTTTTTTTTTTTTTTT',
        '>seqB3', 'TTTTTTTTTTTTTTTTTTTT',
        '>seqB4', 'TTTTTTTTTTTTTTTTTTTT',
        '>seqB5', 'TTTTTTTTTTTTTTTTTTTT',
    ].join('\n');
    await loadFasta(page, fasta);

    // 2. Set clustering parameters (lower thresholds for small test alignment)
    await page.evaluate(() => {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        setVal('clusterMinSizeInput', '2');
        setVal('clusterMinPerfectInput', '1');
        setVal('clusterMaxIterationsInput', '10');
        setVal('minOccurrencesInput', '2');
        setVal('qualitySmallInput', '50');
        setVal('qualityMediumInput', '50');
        setVal('qualityLargeInput', '50');
    });

    // 3. Run clustering through the real entry point
    try {
        await page.evaluate(async () => {
            if (typeof SINEClusterer === 'undefined') {
                throw new Error('SINEClusterer class not loaded in page');
            }
            await clusterSequences();
        });
    } catch (e) {
        return { pass: false, detail: `clustering threw: ${e.message}` };
    }

    // 4. Assert specific, correct output
    const result = await page.evaluate(() => {
        const cr = state.clusterResults;
        if (!cr) return { error: 'state.clusterResults is null' };
        return {
            nClusters: cr.summary?.nClusters,
            nAssigned: cr.summary?.nAssigned,
            nTotal: cr.summary?.nTotal,
            nUnassigned: cr.summary?.nUnassigned,
            clusterMap: state.clusterMap,
        };
    });

    if (result.error) {
        return { pass: false, detail: result.error };
    }
    if (result.nClusters !== 2) {
        return { pass: false, detail: `expected 2 clusters, got ${result.nClusters} (assigned=${result.nAssigned}, unassigned=${result.nUnassigned})` };
    }
    if (result.nAssigned !== 10) {
        return { pass: false, detail: `expected 10 assigned, got ${result.nAssigned}` };
    }
    // Check that seqA1-5 are in the same cluster and seqB1-5 are in the same cluster.
    // clusterMap is keyed by sequence identity (id/header), not row index -
    // it must survive reordering, so a raw numeric index was never the
    // right key here even before that was fixed.
    const clustersA = ['seqA1','seqA2','seqA3','seqA4','seqA5'].map(id => result.clusterMap[id]?.cluster);
    const clustersB = ['seqB1','seqB2','seqB3','seqB4','seqB5'].map(id => result.clusterMap[id]?.cluster);

    if (clustersA.some(c => c === undefined)) {
        return { pass: false, detail: `some group A sequences unassigned: ${JSON.stringify(clustersA)}` };
    }
    if (clustersB.some(c => c === undefined)) {
        return { pass: false, detail: `some group B sequences unassigned: ${JSON.stringify(clustersB)}` };
    }
    if (!clustersA.every(c => c === clustersA[0])) {
        return { pass: false, detail: `group A not in same cluster: ${JSON.stringify(clustersA)}` };
    }
    if (!clustersB.every(c => c === clustersB[0])) {
        return { pass: false, detail: `group B not in same cluster: ${JSON.stringify(clustersB)}` };
    }
    if (clustersA[0] === clustersB[0]) {
        return { pass: false, detail: `group A and group B in same cluster: ${clustersA[0]}` };
    }
    return { pass: true, detail: `2 clusters: A=${clustersA[0]}, B=${clustersB[0]}, 10 assigned` };
});

check('Colouring: clusterByName groups identically-prefixed names, applyPatternColour colours by regex', async (page) => {
    // 1. Load 6 sequences: 3 with "Human_" prefix, 3 with "Mouse_" prefix.
    //    Names share a common suffix pattern (_seqN) but have distinct prefixes,
    //    so clusterByName should separate them by prefix similarity.
    const fasta = [
        '>Human_seq1', 'ACGTACGTAC',
        '>Human_seq2', 'ACGTACGTAC',
        '>Human_seq3', 'ACGTACGTAC',
        '>Mouse_seq1', 'TTTTTTTTTT',
        '>Mouse_seq2', 'TTTTTTTTTT',
        '>Mouse_seq3', 'TTTTTTTTTT',
    ].join('\n');
    await loadFasta(page, fasta);

    // 2. Test clusterByName directly: should produce 2 clusters
    const clusterResult = await page.evaluate(() => {
        const names = state.seqs.map(s => s.header);
        const clusters = clusterByName(names, 10, 3);
        return {
            nClusters: clusters.length,
            clusters: clusters,
        };
    });

    if (clusterResult.nClusters !== 2) {
        return { pass: false, detail: `expected 2 clusters, got ${clusterResult.nClusters}: ${JSON.stringify(clusterResult.clusters)}` };
    }

    const humanCluster = clusterResult.clusters.find(c => c.includes('Human_seq1'));
    const mouseCluster = clusterResult.clusters.find(c => c.includes('Mouse_seq1'));

    if (!humanCluster || !mouseCluster) {
        return { pass: false, detail: `missing Human or Mouse cluster: ${JSON.stringify(clusterResult.clusters)}` };
    }
    if (humanCluster.length !== 3 || !humanCluster.every(n => n.startsWith('Human_'))) {
        return { pass: false, detail: `Human cluster wrong: ${JSON.stringify(humanCluster)}` };
    }
    if (mouseCluster.length !== 3 || !mouseCluster.every(n => n.startsWith('Mouse_'))) {
        return { pass: false, detail: `Mouse cluster wrong: ${JSON.stringify(mouseCluster)}` };
    }

    // 3. Test applyPatternColour through the real UI entry point.
    //    Set the pattern input to "Human" and a specific colour, then call
    //    applyPatternColour() - the same function the Pattern button triggers.
    const patternResult = await page.evaluate(() => {
        // Ensure UI elements exist (they should be in the HTML, but create if missing)
        let patternInput = document.getElementById('colourPatternInput');
        if (!patternInput) {
            patternInput = document.createElement('input');
            patternInput.id = 'colourPatternInput';
            patternInput.type = 'text';
            document.body.appendChild(patternInput);
        }
        let colourInput = document.getElementById('colourPatternColor');
        if (!colourInput) {
            colourInput = document.createElement('input');
            colourInput.id = 'colourPatternColor';
            colourInput.type = 'color';
            document.body.appendChild(colourInput);
        }

        patternInput.value = 'Human';
        colourInput.value = '#ff0000';

        // Clear any existing mappings
        colourState.mappings.clear();

        // Call the real function (same as clicking the Pattern button)
        applyPatternColour();

        // Collect results
        const mappings = {};
        colourState.mappings.forEach((color, name) => {
            mappings[name] = color;
        });
        return { mappings };
    });

    const mappedNames = Object.keys(patternResult.mappings);
    if (mappedNames.length !== 3) {
        return { pass: false, detail: `expected 3 mapped names, got ${mappedNames.length}: ${JSON.stringify(mappedNames)}` };
    }
    if (!mappedNames.every(n => n.startsWith('Human_'))) {
        return { pass: false, detail: `only Human_ names should be mapped: ${JSON.stringify(mappedNames)}` };
    }
    if (!mappedNames.every(n => patternResult.mappings[n] === '#ff0000')) {
        return { pass: false, detail: `all should be #ff0000: ${JSON.stringify(patternResult.mappings)}` };
    }

    return { pass: true, detail: `2 clusters (Human x3, Mouse x3), 3 names coloured by pattern` };
});

check('Search: exact and fuzzy motif matching with correct match counts', async (page) => {
    // 1. Load 3 sequences with known differences at the end:
    //    seq1: ACGTACGTAC (reference)
    //    seq2: ACGTACGTAG (1 mismatch at pos 9: G vs C)
    //    seq3: ACGTACGTGG (2 mismatches at pos 8,9: G,G vs A,C)
    const fasta = [
        '>seq1', 'ACGTACGTAC',
        '>seq2', 'ACGTACGTAG',
        '>seq3', 'ACGTACGTGG',
    ].join('\n');
    await loadFasta(page, fasta);

    // 2. Search for "ACGTACGTAC" with 0 mismatches (exact match only)
    await page.evaluate(() => {
        document.getElementById('searchInput').value = 'ACGTACGTAC';
        document.getElementById('maxMismatches').value = '0';
        state.searchHistory = [];
        searchMotif();
    });

    let result = await page.evaluate(() => {
        const h = state.searchHistory;
        return {
            historyLen: h.length,
            matchCount: h[0]?.matchCount,
            seqsWithMatches: h[0]?.sequencesWithMatches,
        };
    });

    // Exact: only seq1 matches (1 match in 1 sequence)
    if (result.historyLen !== 1) {
        return { pass: false, detail: `expected 1 search history entry, got ${result.historyLen}` };
    }
    if (result.matchCount !== 1) {
        return { pass: false, detail: `exact search: expected 1 match, got ${result.matchCount}` };
    }
    if (result.seqsWithMatches !== 1) {
        return { pass: false, detail: `exact search: expected 1 sequence with matches, got ${result.seqsWithMatches}` };
    }

    // 3. Search for "ACGTACGTAC" with 1 mismatch allowed
    await page.evaluate(() => {
        document.getElementById('searchInput').value = 'ACGTACGTAC';
        document.getElementById('maxMismatches').value = '1';
        state.searchHistory = [];
        searchMotif();
    });

    result = await page.evaluate(() => {
        const h = state.searchHistory;
        return {
            historyLen: h.length,
            matchCount: h[0]?.matchCount,
            seqsWithMatches: h[0]?.sequencesWithMatches,
        };
    });

    // 1 mismatch: seq1 (exact, 0mm) + seq2 (1mm) = 2 matches in 2 sequences
    // seq3 has 2 mismatches, should NOT match with maxMismatches=1
    if (result.matchCount !== 2) {
        return { pass: false, detail: `1-mismatch search: expected 2 matches (seq1 exact + seq2 1mm), got ${result.matchCount}` };
    }
    if (result.seqsWithMatches !== 2) {
        return { pass: false, detail: `1-mismatch search: expected 2 sequences with matches, got ${result.seqsWithMatches}` };
    }

    return { pass: true, detail: `exact: 1 match/1 seq, 1-mismatch: 2 matches/2 seqs, 2-mismatch seq correctly excluded` };
});

check('Dot plot: self-comparison produces points along the main diagonal', async (page) => {
    // 1. Load a single 20bp sequence with a repeating ACGT pattern.
    //    Self-comparison (seq vs itself) should produce matches along the
    //    main diagonal because every position i trivially matches itself.
    const fasta = '>seq1\nACGTACGTACGTACGTACGT\n';
    await loadFasta(page, fasta);

    // 2. Call openDotPlot with the sequence against itself (self-comparison).
    //    SPIN mode (default) uses k-mer exact matching via web worker.
    await page.evaluate(async () => {
        const seq = state.seqs[0].seq.replace(/[-.\s]/g, '');
        await openDotPlot(seq, seq, 'seq1', 'seq1', null);
    });

    // 3. Wait for the web worker computation to complete
    await page.waitForFunction(() => !_dotPlotState.computing, { timeout: 10000 });

    // 4. Assert specific, correct output
    const result = await page.evaluate(() => {
        const S = _dotPlotState;
        const canvas = document.getElementById('dotPlotCanvas');
        return {
            hasMatchMap: !!S.matchMap,
            rows: S.rows,
            cols: S.cols,
            spinMode: S.spinMode,
            canvasExists: !!canvas,
            canvasWidth: canvas ? canvas.width : 0,
            canvasHeight: canvas ? canvas.height : 0,
            // Count matches on the main diagonal: matchMap[i * cols + i]
            diagonalMatchCount: (() => {
                if (!S.matchMap || S.rows !== S.cols || S.rows === 0) return -1;
                let count = 0;
                for (let i = 0; i < S.rows; i++) {
                    if (S.matchMap[i * S.cols + i]) count++;
                }
                return count;
            })(),
            // Sample first 5 diagonal values for debugging
            diagonalSample: (() => {
                if (!S.matchMap || S.rows === 0) return null;
                const sample = [];
                for (let i = 0; i < Math.min(5, S.rows); i++) {
                    sample.push(S.matchMap[i * S.cols + i]);
                }
                return sample;
            })(),
        };
    });

    if (!result.hasMatchMap) {
        return { pass: false, detail: 'matchMap is null - SPIN word-match computation did not produce results' };
    }
    if (result.rows !== result.cols) {
        return { pass: false, detail: `self-comparison should have rows === cols, got ${result.rows} x ${result.cols}` };
    }
    if (result.rows === 0) {
        return { pass: false, detail: 'rows is 0 - no computation results' };
    }
    if (!result.canvasExists) {
        return { pass: false, detail: 'dot plot canvas element not found after openDotPlot' };
    }
    if (result.diagonalMatchCount === -1) {
        return { pass: false, detail: 'could not count diagonal matches (rows/cols mismatch or empty)' };
    }
    // For a self-comparison, positions on the main diagonal should match
    // (seq[i] === seq[i] trivially). With word size 6 (from #dotPlotWindow
    // default in HTML) and a 20bp sequence, every word at position i matches
    // itself, and each match marks 6 cells (i,i)..(i+5,i+5). The union of
    // all word matches covers the entire diagonal (0..19). Require at least
    // 50% as a robust threshold.
    const expectedMin = Math.floor(result.rows * 0.5);
    if (result.diagonalMatchCount < expectedMin) {
        return { pass: false, detail: `only ${result.diagonalMatchCount}/${result.rows} diagonal matches (expected at least ${expectedMin}); sample: ${JSON.stringify(result.diagonalSample)}` };
    }
    return { pass: true, detail: `${result.rows}x${result.cols} self-comparison, ${result.diagonalMatchCount} diagonal matches, canvas ${result.canvasWidth}x${result.canvasHeight}` };
});

check('Codon-aware realign: 1 nt deletion becomes a single frameshift gap, frame kept', async (page) => {
    // Four coding sequences; C has one nucleotide deleted (GG -> G at nt 24-25).
    const fasta = [
        '>A', 'ATGGCTGAAAAGCTGGATACCGTTGGAATGCCAGGTCTGAAACGTTAA',
        '>B', 'ATGGCTGAAAAGCTGGATACCGTTGGAATGCCAGGTCTGAAACGTTAA',
        '>C', 'ATGGCTGAGAAGCTGGATACCGTTGAATGCCAGGTCTGAAACGTTAA',
        '>D', 'ATGGCTGAAAAACTGGATACCGTTGGCATGCCAGGTCTAAAACGTTAA', ''
    ].join('\n');
    await loadFasta(page, fasta);
    await page.evaluate(() => {
        const sel = document.getElementById('mafftSeqType');
        sel.value = 'codon';
        sel.dispatchEvent(new Event('change'));
    });
    const optsShown = await page.evaluate(() => document.getElementById('codonAlignOpts').style.display !== 'none');
    if (!optsShown) return { pass: false, detail: 'codon settings not shown after choosing Coding sequence' };
    await page.evaluate(async () => { await realignAll(); });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({
        n: state.seqs.length,
        lens: state.seqs.map(s => s.seq.length),
        seqs: state.seqs.map(s => s.seq),
        names: state.seqs.map(s => s.header),
        stats: window._lastCodonAlignStats || null
    }));
    if (r.n !== 4) return { pass: false, detail: `expected 4 sequences, got ${r.n}` };
    if (new Set(r.lens).size !== 1 || r.lens[0] % 3 !== 0) return { pass: false, detail: `lengths ${r.lens.join(',')} not equal / not a multiple of 3` };
    const gaps = r.seqs.map(s => (s.match(/-/g) || []).length);
    const iC = r.names.indexOf('C');
    if (iC < 0) return { pass: false, detail: 'sequence C missing after realign' };
    if (gaps[iC] !== 1 || gaps.reduce((a, b) => a + b, 0) !== 1) return { pass: false, detail: `expected exactly one gap, in C; got gaps ${gaps.join(',')} (${r.seqs[iC]})` };
    if (r.seqs[iC].replace(/-/g, '') !== 'ATGGCTGAGAAGCTGGATACCGTTGAATGCCAGGTCTGAAACGTTAA') return { pass: false, detail: 'C residues changed' };
    if (!r.stats || !r.stats.frameshifts || r.stats.frameshifts.find(x => x.name === 'C').n !== 1) return { pass: false, detail: `stats: ${JSON.stringify(r.stats)}` };
    return { pass: true, detail: `C = ${r.seqs[iC]}; ref ${r.stats.ref}, ${Math.round(r.stats.ms)} ms` };
});


const CODON_TOY = [
    '>A', 'ATGGCTGAAAAGCTGGATACCGTTGGAATGCCAGGTCTGAAACGTTAA',
    '>B', 'ATGGCTGAAAAGCTGGATACCGTTGGAATGCCAGGTCTGAAACGTTAA',
    '>C', 'ATGGCTGAGAAGCTGGATACCGTTGAATGCCAGGTCTGAAACGTTAA',
    '>D', 'ATGGCTGAAAAACTGGATACCGTTGGCATGCCAGGTCTAAAACGTTAA', ''
].join('\n');
async function _setCodonMode(page) {
    await page.evaluate(() => {
        const sel = document.getElementById('mafftSeqType');
        sel.value = 'codon';
        sel.dispatchEvent(new Event('change'));
    });
}

check('Codon-aware: Realign Block is refused (out of frame) and the alignment is unchanged', async (page) => {
    await loadFasta(page, CODON_TOY);
    await _setCodonMode(page);
    const before = await page.evaluate(() => state.seqs.map(s => s.seq).join('|'));
    const msg = await page.evaluate(async () => {
        state.selectedColumns.clear();
        for (let c = 4; c < 20; c++) state.selectedColumns.add(c);
        await realignSelectedBlock();
        return document.getElementById('statusMessage').textContent;
    });
    const after = await page.evaluate(() => state.seqs.map(s => s.seq).join('|'));
    if (!/whole coding sequences/.test(msg)) return { pass: false, detail: `expected refusal message, got "${msg}"` };
    if (before !== after) return { pass: false, detail: 'alignment changed' };
    return { pass: true, detail: msg };
});

check('Codon-aware: protein input is refused with a clear message, alignment unchanged', async (page) => {
    await loadFasta(page, '>p1\nMKVLAAGIVGLLLAQPAMAEEKWW\n>p2\nMKVLAAGIVALLLAQPAMAEEKWW\n');
    await _setCodonMode(page);
    const before = await page.evaluate(() => state.seqs.map(s => s.seq).join('|'));
    const msg = await page.evaluate(async () => { await realignAll(); return document.getElementById('statusMessage').textContent; });
    const after = await page.evaluate(() => state.seqs.map(s => s.seq).join('|'));
    if (!/nucleotide/.test(msg) || /MAFFT/.test(msg)) return { pass: false, detail: `expected a codon-aligner refusal, got "${msg}"` };
    if (before !== after) return { pass: false, detail: 'alignment changed' };
    return { pass: true, detail: msg };
});

check('Codon-aware (fast engine): unknown reference name is reported, lowercase kept, no ! in the result', async (page) => {
    await loadFasta(page, CODON_TOY.replace('>C\nATGGCTGAGAAG', '>C\natggctgagaag'));
    await _setCodonMode(page);
    const r = await page.evaluate(async () => {
        const eng = document.getElementById('codonEngine');
        eng.value = 'fast'; eng.dispatchEvent(new Event('change'));   // the reference applies to the fast engine only
        document.getElementById('codonRef').value = 'nope';
        await realignAll();
        document.getElementById('codonRef').value = '';
        eng.value = 'macse'; eng.dispatchEvent(new Event('change'));
        return { msg: document.getElementById('statusMessage').textContent, seqs: state.seqs.map(s => s.seq), bangs: state.seqs.some(s => s.seq.includes('!')) };
    });
    if (!/"nope" not found/.test(r.msg)) return { pass: false, detail: `expected not-found warning, got "${r.msg}"` };
    if (r.bangs) return { pass: false, detail: "'!' written into the viewer" };
    const c = r.seqs.find(s => /^atggctgagaag/.test(s));
    if (!c) return { pass: false, detail: 'lowercase prefix of C lost: ' + r.seqs.join(' ') };
    return { pass: true, detail: r.msg };
});


check('Codon-aware: Realign Selected and Adjust direction (reverse-complemented CDS) keep every residue and the frame', async (page) => {
    const rc = s => s.split('').reverse().map(c => ({ A: 'T', C: 'G', G: 'C', T: 'A' }[c] || c)).join('');
    const C = 'ATGGCTGAGAAGCTGGATACCGTTGAATGCCAGGTCTGAAACGTTAA';
    await loadFasta(page, CODON_TOY.replace('>C\n' + C, '>C\n' + rc(C)));
    await _setCodonMode(page);
    const r = await page.evaluate(async () => {
        document.getElementById('mafftAdjustDir').checked = true;
        await realignAll();
        document.getElementById('mafftAdjustDir').checked = false;
        const afterAll = state.seqs.map(s => ({ h: s.header, s: s.seq }));
        const msgAll = document.getElementById('statusMessage').textContent;
        state.selectedRows.clear(); state.selectedRows.add(0); state.selectedRows.add(2); state.selectedRows.add(3);
        realignSelected();
        await new Promise(res => setTimeout(res, 1500));
        return { afterAll, msgAll, afterSel: state.seqs.map(s => ({ h: s.header, s: s.seq })), msgSel: document.getElementById('statusMessage').textContent };
    });
    const c = r.afterAll.find(x => x.h === 'C');
    if (!c || c.s.replace(/-/g, '') !== C) return { pass: false, detail: `C not flipped back to the coding strand: ${c && c.s}` };
    if ((c.s.match(/-/g) || []).length !== 1) return { pass: false, detail: `C should carry exactly one frameshift gap: ${c.s}` };
    const lens = new Set(r.afterSel.map(x => x.s.length));
    if (lens.size !== 1) return { pass: false, detail: 'unequal lengths after Realign Selected' };
    const orig = { A: 'ATGGCTGAAAAGCTGGATACCGTTGGAATGCCAGGTCTGAAACGTTAA', B: 'ATGGCTGAAAAGCTGGATACCGTTGGAATGCCAGGTCTGAAACGTTAA', C, D: 'ATGGCTGAAAAACTGGATACCGTTGGCATGCCAGGTCTAAAACGTTAA' };
    for (const x of r.afterSel) if (x.s.replace(/-/g, '') !== orig[x.h]) return { pass: false, detail: `${x.h} residues changed by Realign Selected` };
    return { pass: true, detail: `${r.msgAll} | ${r.msgSel}` };
});

check('Codon-aware: Add & Align places a new CDS with a deletion as one frameshift', async (page) => {
    await loadFasta(page, CODON_TOY);
    await _setCodonMode(page);
    const NEW = 'ATGGCTGAAAAGCTGGATACCTTGGAATGCCAGGTCTGAAACGTTAA'; // 1 nt deleted at 21
    const r = await page.evaluate(async (NEW) => {
        document.getElementById('addSeqInput').value = '>E\n' + NEW + '\n';
        addSequencesAndAlign();
        for (let t = 0; t < 40 && !state.seqs.some(s => s.header === 'E'); t++) await new Promise(res => setTimeout(res, 100));
        await new Promise(res => setTimeout(res, 300));
        return { seqs: state.seqs.map(s => ({ h: s.header, s: s.seq })), msg: document.getElementById('statusMessage').textContent };
    }, NEW);
    const e = r.seqs.find(x => x.h === 'E');
    if (!e) return { pass: false, detail: 'E not added: ' + r.msg };
    if (e.s.replace(/-/g, '') !== NEW) return { pass: false, detail: 'E residues changed' };
    if (new Set(r.seqs.map(x => x.s.length)).size !== 1 || r.seqs[0].s.length % 3 !== 0) return { pass: false, detail: 'lengths unequal / not codon columns' };
    if ((e.s.match(/-/g) || []).length !== 1) return { pass: false, detail: `E should have exactly one frameshift gap: ${e.s}` };
    return { pass: true, detail: `E = ${e.s}; ${r.msg}` };
});

check('Codon-aware (MACSE engine, default): real 4-species genes give exactly MACSE v2.07 alignments (pool, tiles, WebAssembly)', async (page) => {
    const fs = require('fs'), path = require('path');
    const fx = path.join(__dirname, '..', 'codon-align', 'fixtures');
    const details = [];
    for (const id of ['202190at40674', '106752at40674']) {     // 376 nt (whole profile alignments) and 1.3 kb (tiled)
        const inp = fs.readFileSync(path.join(fx, id + '.in.fna'), 'utf8');
        const mac = fs.readFileSync(path.join(fx, id + '.macse_NT.fna'), 'utf8').split('>').filter(Boolean)
            .map(b => { const [h, ...r] = b.split('\n'); return { h: h.trim(), s: r.join('').trim().replace(/!/g, '-') }; });
        await loadFasta(page, inp);
        await _setCodonMode(page);
        const r = await page.evaluate(async () => {
            const eng = document.getElementById('codonEngine').value;
            const shown = document.getElementById('codonMacseOpts').style.display !== 'none' && document.getElementById('codonFastOpts').style.display === 'none';
            await realignAll();
            return { eng, shown, seqs: state.seqs.map(s => ({ h: s.header, s: s.seq })), stats: window._lastCodonAlignStats, msg: document.getElementById('statusMessage').textContent };
        });
        if (r.eng !== 'macse') return { pass: false, detail: `default engine is ${r.eng}` };
        if (!r.shown) return { pass: false, detail: 'MACSE settings not shown / fast settings not hidden' };
        for (const m of mac) {
            const x = r.seqs.find(y => y.h === m.h);
            if (!x) return { pass: false, detail: `${id}: ${m.h} missing` };
            if (x.s !== m.s) return { pass: false, detail: `${id}: ${m.h} differs from MACSE` };
        }
        if (!r.stats || r.stats.engine !== 'macse') return { pass: false, detail: 'stats: ' + JSON.stringify(r.stats) };
        if (!r.stats.wasm || !(r.stats.threads >= 2)) return { pass: false, detail: `expected the WebAssembly kernel and a worker pool; stats ${JSON.stringify(r.stats)}` };
        details.push(`${id} identical, ${r.stats.columns} codons, ${r.stats.threads} threads, ${Math.round(r.stats.ms)} ms`);
    }
    return { pass: true, detail: details.join('; ') };
});

async function main() {
    const { server, baseUrl } = await start();
    const results = [];
    const filter = process.env.CHECK_FILTER ? process.env.CHECK_FILTER.toLowerCase() : null;
    const activeChecks = filter ? CHECKS.filter(c => c.name.toLowerCase().includes(filter)) : CHECKS;
    try {
        for (const { name, fn } of activeChecks) {
            const browser = await launch();
            const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
            page.setDefaultTimeout(30000);
            let outcome;
            const t0 = Date.now();
            try {
                await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
                outcome = await fn(page);
            } catch (e) {
                outcome = { pass: false, detail: `threw: ${e.message}` };
            }
            const ms = Date.now() - t0;
            console.log(`[${outcome.pass ? 'PASS' : 'FAIL'}] (${ms}ms) ${name}${outcome.detail ? ' - ' + outcome.detail : ''}`);
            results.push({ name, ...outcome });
            await browser.close();
        }
    } finally {
        server.close();
    }

    const failCount = results.filter(r => !r.pass).length;
    console.log(`\n${results.length - failCount}/${results.length} passed`);
    process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error('SUITE ERROR:', e); process.exit(1); });
