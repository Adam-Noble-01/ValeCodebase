/* =============================================================================
   PAINTERLYNPR - EXPORT | PASSES AND PDF - TRUE-SIZE PDF
   =============================================================================

   FILE       : PainterlyNPR__Export__Pdf__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Export - PassesAndPdf - Pdf
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A one-page PDF whose page is the sheet, at its true size, with
                the rendered sheet filling it - the dependable print at 100%
   CREATED    : 30-Oct-2026 (v0.8.0)

   DESCRIPTION:
   - The page is the sheet (300 x 200 mm is 850.39 x 566.93 pt; A3 1190.55 x
     841.89); the raster is placed to fill it exactly, so printed at actual size
     every millimetre on the sheet - a pen's 0.35 mm, the calibration sheet's
     100 mm - is a millimetre on paper.
   - The image is RGB, compressed losslessly (FlateDecode, by the browser's own
     CompressionStream), so a 0.13 mm line keeps its antialiased coverage.
   - PrintScaling /None asks a viewer to print it at actual size.

   WHY A PDF:
   - A PNG's resolution (pHYs) is read by image tools but often ignored by print
     dialogs, which fit to the page; a PDF page has a size, and viewers print it
     at that size when asked for actual size. The printer, its paper and its ink
     can still spread a line: the file is exact, the print is the printer's.

   ============================================================================= */

// =============================================================================
// REGION | Passes and PDF - True-Size PDF
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | PDF
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Points to the Millimetre
    // ------------------------------------------------------------
    const PT_PER_MM  =  72 / 25.4;                                            // <-- A PDF point is 1/72 inch
    // ------------------------------------------------------------


    // FUNCTION | Deflate Some Bytes - zlib, as FlateDecode reads it
    // ------------------------------------------------------------
    async function PainterlyNPR__Pdf__Deflate(bytes) {
        const Deflater  =  globalThis.CompressionStream;                     // <-- Every browser the engine runs in has it; say so plainly where one has not
        if (!Deflater) throw new Error('[PainterlyNPR Pdf] This browser cannot compress (no CompressionStream): export a PNG instead.');
        const stream  =  new Blob([bytes]).stream().pipeThrough(new Deflater('deflate'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    // ------------------------------------------------------------


    // FUNCTION | A True-Size PDF of a Raster
    // ------------------------------------------------------------
    // rgb: the picture's rows top to bottom, three bytes a pixel. widthMm and
    // heightMm: the page, which the picture fills. info: { Title, Subject }.
    // Returns a Blob of type application/pdf.
    async function PainterlyNPR__Export__Pdf(rgb, width, height, widthMm, heightMm, info) {
        if (rgb.length !== width * height * 3) throw new Error(`[PainterlyNPR Pdf] Expected ${width * height * 3} bytes of RGB, got ${rgb.length}.`);
        const image  =  await PainterlyNPR__Pdf__Deflate(rgb);
        const W      =  (widthMm * PT_PER_MM).toFixed(4);
        const H      =  (heightMm * PT_PER_MM).toFixed(4);
        const text   =  (s) => String(s || '').replace(/[\\()]/g, ch => '\\' + ch).replace(/[^\x20-\x7e]/g, '?');   // <-- A PDF string, ASCII only
        const now    =  new Date();
        const stamp  =  `D:${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`;
        const content  =  `q\n${W} 0 0 ${H} 0 0 cm\n/Im0 Do\nQ\n`;
        const objects  =  [
            `<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None >> >>`,
            `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
            { Head: `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>`, Stream: image },
            { Head: `<< /Length ${content.length} >>`, Stream: new TextEncoder().encode(content) },
            `<< /Title (${text(info && info.Title)}) /Subject (${text(info && info.Subject)}) /Producer (PainterlyNPR) /CreationDate (${stamp}) >>`,
        ];
        const enc     =  new TextEncoder();
        const parts   =  [enc.encode('%PDF-1.6\n%'), Uint8Array.from([0xE2, 0xE3, 0xCF, 0xD3]), enc.encode('\n')];
        let length    =  parts.reduce((n, p) => n + p.length, 0);
        const offsets =  [];
        const push    =  (bytes) => { parts.push(bytes); length += bytes.length; };
        objects.forEach((obj, i) => {
            offsets.push(length);
            if (typeof obj === 'string') { push(enc.encode(`${i + 1} 0 obj\n${obj}\nendobj\n`)); return; }
            push(enc.encode(`${i + 1} 0 obj\n${obj.Head}\nstream\n`));
            push(obj.Stream);
            push(enc.encode('\nendstream\nendobj\n'));
        });
        const xref  =  length;
        push(enc.encode(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')));
        push(enc.encode(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
        return new Blob(parts, { type: 'application/pdf' });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Export__Pdf,
        PT_PER_MM  as  PainterlyNPR__Export__PT_PER_MM,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
