/**
 * AB1Parser - minimal ABIF (Applied Biosystems AB1) format reader.
 * Extracts the called-base sequence, per-base quality scores, peak
 * locations, and the four raw trace channels needed for a chromatogram view.
 */
(function (global) {
    'use strict';

    const ELEM = {
        1: 'byte', 2: 'char', 3: 'word', 4: 'short', 5: 'long',
        7: 'float', 8: 'double', 10: 'date', 11: 'time',
        18: 'pString', 19: 'cString'
    };

    function readTagName(view, offset) {
        let s = '';
        for (let i = 0; i < 4; i++) s += String.fromCharCode(view.getUint8(offset + i));
        return s;
    }

    function readElement(view, offset, type) {
        switch (type) {
            case 'byte': return view.getUint8(offset);
            case 'char': return view.getUint8(offset);
            case 'word': return view.getUint16(offset, false);
            case 'short': return view.getInt16(offset, false);
            case 'long': return view.getInt32(offset, false);
            case 'float': return view.getFloat32(offset, false);
            case 'double': return view.getFloat64(offset, false);
            default: return null;
        }
    }

    function decodeDirEntry(view, buf, entryOffset) {
        const tagName = readTagName(view, entryOffset);
        const tagNumber = view.getInt32(entryOffset + 4, false);
        const elementTypeCode = view.getInt16(entryOffset + 8, false);
        const elementSize = view.getInt16(entryOffset + 10, false);
        const numElements = view.getInt32(entryOffset + 12, false);
        const dataSize = view.getInt32(entryOffset + 16, false);
        const dataOffsetField = entryOffset + 20;
        const dataOffset = dataSize <= 4 ? dataOffsetField : view.getInt32(dataOffsetField, false);
        const type = ELEM[elementTypeCode] || null;

        let value = null;
        if (type === 'char' && numElements > 0) {
            const bytes = new Uint8Array(buf, dataOffset, numElements);
            value = String.fromCharCode.apply(null, bytes);
        } else if (type === 'pString') {
            const len = view.getUint8(dataOffset);
            const bytes = new Uint8Array(buf, dataOffset + 1, len);
            value = String.fromCharCode.apply(null, bytes);
        } else if (type === 'cString') {
            let s = '', i = 0;
            while (true) {
                const c = view.getUint8(dataOffset + i);
                if (c === 0) break;
                s += String.fromCharCode(c);
                i++;
            }
            value = s;
        } else if (type === 'byte' && numElements > 1) {
            value = new Uint8Array(buf, dataOffset, numElements).slice();
        } else if (type === 'short' && numElements > 1) {
            const arr = new Array(numElements);
            for (let i = 0; i < numElements; i++) arr[i] = view.getInt16(dataOffset + i * 2, false);
            value = arr;
        } else if (type === 'word' && numElements > 1) {
            const arr = new Array(numElements);
            for (let i = 0; i < numElements; i++) arr[i] = view.getUint16(dataOffset + i * 2, false);
            value = arr;
        } else if (type) {
            value = readElement(view, dataOffset, type);
        }

        return { name: tagName, num: tagNumber, key: `${tagName}${tagNumber}`, value };
    }

    /**
     * Parse an ArrayBuffer containing an .ab1 file.
     * Returns null if the buffer isn't a valid ABIF file.
     */
    function parse(buf) {
        const view = new DataView(buf);
        const magic = readTagName(view, 0);
        if (magic !== 'ABIF') return null;

        const rootEntryOffset = 6;
        const root = decodeDirEntry(view, buf, rootEntryOffset);
        // The root directory entry describes the array of real entries.
        const numDirEntries = view.getInt32(rootEntryOffset + 12, false);
        const dirDataSize = view.getInt32(rootEntryOffset + 16, false);
        const dirOffset = dirDataSize <= 4 ? rootEntryOffset + 20 : view.getInt32(rootEntryOffset + 20, false);

        const tags = {};
        for (let i = 0; i < numDirEntries; i++) {
            const entry = decodeDirEntry(view, buf, dirOffset + i * 28);
            tags[entry.key] = entry.value;
        }

        const sequence = tags.PBAS2 || tags.PBAS1 || '';
        const quality = tags.PCON2 || tags.PCON1 || [];
        const qualityArr = (quality instanceof Uint8Array) ? Array.from(quality)
            : (typeof quality === 'string' ? Array.from(quality).map(c => c.charCodeAt(0)) : quality);
        const peakLocations = tags.PLOC2 || tags.PLOC1 || [];

        const order = tags.FWO_1 || 'GATC';
        const dataChannels = [tags.DATA9, tags.DATA10, tags.DATA11, tags.DATA12];
        const useAnalyzed = dataChannels.every(d => Array.isArray(d));
        const raw = useAnalyzed ? dataChannels : [tags.DATA1, tags.DATA2, tags.DATA3, tags.DATA4];

        const traces = { A: [], C: [], G: [], T: [] };
        for (let i = 0; i < 4 && i < order.length; i++) {
            const base = order[i];
            if (traces.hasOwnProperty(base) && Array.isArray(raw[i])) traces[base] = raw[i];
        }

        return {
            sampleName: tags.SMPL1 || '',
            sequence,
            quality: qualityArr,
            peakLocations,
            traces,
            numSamples: Math.max(traces.A.length, traces.C.length, traces.G.length, traces.T.length)
        };
    }

    function looksLikeAb1(buf) {
        if (!buf || buf.byteLength < 4) return false;
        const view = new DataView(buf);
        return readTagName(view, 0) === 'ABIF';
    }

    global.AB1Parser = { parse, looksLikeAb1 };
})(typeof window !== 'undefined' ? window : this);
