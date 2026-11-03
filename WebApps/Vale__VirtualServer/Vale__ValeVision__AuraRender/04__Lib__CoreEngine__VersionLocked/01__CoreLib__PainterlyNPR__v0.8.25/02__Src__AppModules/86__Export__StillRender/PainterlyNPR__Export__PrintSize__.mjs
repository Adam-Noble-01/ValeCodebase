/* =============================================================================
   PAINTERLYNPR - EXPORT | STILL RENDER - PRINT SIZE
   =============================================================================

   FILE       : PainterlyNPR__Export__PrintSize__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Export - StillRender - PrintSize
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A raster's print size, written into the file: a PNG's pHYs
                (pixels per metre) and a comment naming the sheet and the dpi,
                and the browser download every export ends in
   CREATED    : 30-Oct-2026 (v0.8.0)

   DESCRIPTION:
   - The density is the sheet's own (its pixel width over its width in mm), so a
     print application that honours pHYs prints the sheet at its size, and a
     0.35 mm pen at 0.35 mm.

   WHY BOTH A CHUNK AND A COMMENT:
   - pHYs is the standard and most image tools read it; many print dialogs fit
     to the page regardless. The comment says in words what size to print at,
     and the PDF export (87) is the dependable true-size print.

   ============================================================================= */

// =============================================================================
// REGION | Still Render - Print Size
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | PNG Chunks
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | PNG's CRC-32 - a table made once
    // ------------------------------------------------------------
    const PNG_SIGNATURE  =  [137, 80, 78, 71, 13, 10, 26, 10];
    const CRC_TABLE  =  (() => {
        const t  =  new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c  =  n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            t[n]  =  c >>> 0;
        }
        return t;
    })();
    // ------------------------------------------------------------


    // FUNCTION | CRC-32 of Some Bytes
    // ------------------------------------------------------------
    function PainterlyNPR__PrintSize__Crc32(bytes) {
        let c  =  0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | One PNG Chunk - length, type, data, CRC
    // ------------------------------------------------------------
    function PainterlyNPR__PrintSize__Chunk(type, data) {
        const out  =  new Uint8Array(12 + data.length);
        const dv   =  new DataView(out.buffer);
        dv.setUint32(0, data.length);
        for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
        out.set(data, 8);
        dv.setUint32(8 + data.length, PainterlyNPR__PrintSize__Crc32(out.subarray(4, 8 + data.length)));
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Latin-1 Bytes of a Text - tEXt's encoding
    // ------------------------------------------------------------
    function PainterlyNPR__PrintSize__Latin1(text) {
        return Uint8Array.from(String(text), ch => { const c = ch.charCodeAt(0); return c < 256 ? c : 63; });
    }
    // ------------------------------------------------------------


    // FUNCTION | A PNG With Its Print Size - pHYs and text after the header
    // ------------------------------------------------------------
    // png: the encoded file's bytes. pxPerMm: the pixels a printed millimetre
    // covers across (pxPerMmY down, if it differs). texts: { keyword: text }
    // (Comment, Software ...). Any pHYs already there is replaced. Returns the
    // new bytes.
    function PainterlyNPR__PrintSize__Png(png, pxPerMm, texts, pxPerMmY) {
        for (let i = 0; i < 8; i++) if (png[i] !== PNG_SIGNATURE[i]) throw new Error('[PainterlyNPR PrintSize] Not a PNG.');
        const dv      =  new DataView(png.buffer, png.byteOffset, png.byteLength);
        const chunks  =  [];
        for (let at = 8; at + 12 <= png.length;) {
            const length  =  dv.getUint32(at);
            const type    =  String.fromCharCode(png[at + 4], png[at + 5], png[at + 6], png[at + 7]);
            chunks.push({ Type: type, Bytes: png.subarray(at, at + 12 + length) });
            at  +=  12 + length;
            if (type === 'IEND') break;
        }
        if (!chunks.length || chunks[0].Type !== 'IHDR') throw new Error('[PainterlyNPR PrintSize] The PNG has no header first.');
        const ppm   =  Math.round(pxPerMm * 1000);                            // <-- Pixels per metre, whole: 300 dpi's 11.81 px/mm is 11810
        const ppmY  =  Math.round((pxPerMmY || pxPerMm) * 1000);
        const phys  =  new Uint8Array(9);
        new DataView(phys.buffer).setUint32(0, ppm);
        new DataView(phys.buffer).setUint32(4, ppmY);
        phys[8]     =  1;                                                     // <-- The unit is the metre
        const added  =  [PainterlyNPR__PrintSize__Chunk('pHYs', phys)];
        for (const [keyword, text] of Object.entries(texts || {})) added.push(PainterlyNPR__PrintSize__Chunk('tEXt', PainterlyNPR__PrintSize__Latin1(keyword + '\0' + text)));
        const parts  =  [Uint8Array.from(PNG_SIGNATURE), chunks[0].Bytes, ...added, ...chunks.slice(1).filter(c => c.Type !== 'pHYs').map(c => c.Bytes)];
        const out    =  new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
        let o  =  0;
        for (const p of parts) { out.set(p, o); o += p.length; }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Print Size in Words - for a file's comment and the status line
    // ------------------------------------------------------------
    function PainterlyNPR__PrintSize__Describe(widthPx, heightPx, pxPerMm, sheetWidthMm, sheetHeightMm) {
        const dpi  =  pxPerMm * 25.4;
        return `${sheetWidthMm} x ${sheetHeightMm} mm sheet, ${widthPx} x ${heightPx} px at ${pxPerMm.toFixed(3)} px/mm (${dpi.toFixed(2)} dpi). Print at 100% (actual size, no fit to page) for true size: the technical pens are 0.13, 0.18, 0.25 and 0.35 mm on it. The file is exact; a printer, its paper and its ink may still spread a line.`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Download
// -----------------------------------------------------------------------------

    // FUNCTION | Hand a Blob to the Browser as a Download
    // ------------------------------------------------------------
    function PainterlyNPR__Export__Download(blob, name) {
        const a     =  document.createElement('a');
        a.href      =  URL.createObjectURL(blob);
        a.download  =  name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Export__Download,
        PainterlyNPR__PrintSize__Chunk,
        PainterlyNPR__PrintSize__Crc32,
        PainterlyNPR__PrintSize__Describe,
        PainterlyNPR__PrintSize__Png,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
