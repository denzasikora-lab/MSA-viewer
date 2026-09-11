'use strict';
// Run disttbfast (MAFFT WASM) off the main thread so the viewer stays responsive.
importScripts('disttbfast.js');

function stripGaps(fasta) {
    return fasta.split('\n').map(line => {
        if (line.startsWith('>')) return line;
        return line.replace(/[-.]/g, '');
    }).join('\n');
}

async function runDisttbfast(fastaInput, extraArgs, wasmPath) {
    const stdoutBuf = [];
    const stderrBuf = [];
    const mod = await createDisttbfast({
        locateFile: (path) => (wasmPath || '') + path,
        print: (text) => stdoutBuf.push(text),
        printErr: (text) => stderrBuf.push(text),
        noInitialRun: true
    });
    mod.FS.writeFile('/input.fa', fastaInput);

    const hasE = extraArgs.includes('-E');
    const baseArgs = hasE
        ? ['-i', '/input.fa']
        : ['-i', '/input.fa', '-E', '2'];
    const args = [...baseArgs, ...extraArgs];

    try {
        mod.callMain(args);
    } catch (e) {
        if (e && e.status !== undefined && e.status === 0) {
            // normal exit
        } else if (e && e.message && e.message.includes('exit(0)')) {
            // normal exit
        } else {
            const stderr = stderrBuf.join('\n');
            throw new Error(`disttbfast failed: ${e.message}\n${stderr}`);
        }
    }

    const result = stdoutBuf.join('\n');
    if (!result.trim()) {
        throw new Error('MAFFT produced no output');
    }
    return result;
}

self.onmessage = async (ev) => {
    const { id, type, fasta, extraArgs, wasmPath } = ev.data || {};
    if (type !== 'align') return;
    try {
        const ungapped = stripGaps(fasta);
        const result = await runDisttbfast(ungapped, extraArgs || [], wasmPath || '');
        self.postMessage({ id, ok: true, result });
    } catch (err) {
        self.postMessage({ id, ok: false, error: err?.message || String(err) });
    }
};
