'use strict';
// Thread pool for MacseAlign.alignSequencesAsync in Node (worker_threads). Each thread loads macse-align.js and runs
// tasks (MacseAlign.runTask: a whole profile alignment or one tile of it). The next task taken is the one with the
// lowest priority number (the profile alignment the sequential program needs first); queued tasks of a cancelled
// generation are dropped, running ones finish unused. Part of the MACSE port tests (CeCILL 2.1, LICENSE-MACSE).
const { Worker } = require('worker_threads');
const os = require('os');

function makePool(size, modulePath) {
    size = Math.max(1, size || Math.min(8, os.cpus().length - 1));
    const workerSrc = `
        const { parentPort } = require('worker_threads');
        const MA = require(${JSON.stringify(modulePath)});
        parentPort.on('message', ({ id, task }) => {
            let msg;
            try { const result = MA.runTask(task); msg = { id, ok: true, result }; parentPort.postMessage(msg, MA.transferables(result)); }
            catch (e) { parentPort.postMessage({ id, ok: false, error: e && e.message || String(e) }); }
        });`;
    const workers = [], idle = [], queue = [], pending = new Map();
    let nextId = 1, closed = false;
    const takeNext = () => {
        let k = 0;
        for (let i = 1; i < queue.length; i++) if (queue[i].prio < queue[k].prio) k = i;
        return queue.splice(k, 1)[0];
    };
    const pump = () => {
        while (idle.length && queue.length) {
            const w = idle.pop(), job = takeNext();
            pending.set(job.id, job); job.worker = w;
            w.postMessage({ id: job.id, task: job.task }, job.transfer);
        }
    };
    for (let i = 0; i < size; i++) {
        const w = new Worker(workerSrc, { eval: true });
        w.on('message', ({ id, ok, result, error }) => {
            const job = pending.get(id); pending.delete(id);
            idle.push(w); pump();
            if (!job) return;
            if (ok) job.resolve(result); else job.reject(new Error(error));
        });
        w.on('error', e => { for (const job of pending.values()) if (job.worker === w) job.reject(e); });
        workers.push(w); idle.push(w);
    }
    const MA = require(modulePath);
    return {
        size,
        run(task, gen, prio) {
            if (closed) return Promise.reject(new Error('pool closed'));
            return new Promise((resolve, reject) => {
                queue.push({ id: nextId++, task, gen, prio: prio || 0, resolve, reject, transfer: task.kind === 'tile' ? MA.transferables(task) : [] });
                pump();
            });
        },
        cancel(gen) {
            for (let i = queue.length - 1; i >= 0; i--) if (queue[i].gen === gen) { queue[i].reject(new Error('cancelled')); queue.splice(i, 1); }
        },
        async close() { closed = true; await Promise.all(workers.map(w => w.terminate())); }
    };
}
module.exports = { makePool };
