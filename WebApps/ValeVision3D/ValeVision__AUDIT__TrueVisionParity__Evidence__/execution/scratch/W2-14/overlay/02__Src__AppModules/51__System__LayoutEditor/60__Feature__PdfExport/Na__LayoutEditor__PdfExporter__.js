// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - PDF EXPORTER
// =============================================================================
//
// FILE       : Na__LayoutEditor__PdfExporter__.js
// NAMESPACE  : Na__LePdf
// MODULE     : Layout Editor - PDF Exporter
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : One sheet to a PDF at true paper size: vector linework, dimensions, text and chrome; raster underlays and 3D views
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - jsPDF (the vendored UMD build, injected as a classic script on first
//   use) opens a page of the sheet's paper size. Bottom to top: the classic
//   title block scan when that style is on, then the sheet in the Layers
//   list's order (Na__LayoutEditor__PaintOrder__, the same plan the screen
//   stacks by): each viewport clipped to its frame (the composer underlay at
//   RasterPixelsPerMm, the projected linework as true vector lines at the
//   paper widths with a dash for the hidden class, the scene markup at
//   scale) with its own frame line and caption straight over it; the notes
//   margin, border and title block (or the classic field texts) over the
//   frontmost drawings; and each layer's markup where the list puts it.
// - Printed at 100 percent a 1:50 viewport measures true because every
//   coordinate is a paper millimetre.
// - Open Sans is embedded before anything is drawn. jsPDF's built-in
//   Helvetica is only the fallback when the TTF files cannot be fetched.
//   // @delegate: ./Na__LayoutEditor__PdfFonts__.js
//
// INTEGRATION:
// - Toolbar Download PDF and the Dev menu Export PDF call ExportSheet.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : ValeVision3D 35__System__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js and Lantern Designer SheetChrome DrawToPdf
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js,
//                   ported from this file (TrueVision3D v2.21.0). Its later hunks are replayed into this
//                   file's own sequence; the log below names each one
// - Source version: 1.12.0 (TrueVision3D v2.160.0, 23-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5); the linework call's shape
//                   01-Oct-2026 for ValeVision3D v2.71.2; the picture packing (1.11.0), the
//                   strict and pictureCompression options, LoadLibrary and the awaited save
//                   02-Oct-2026 for ValeVision3D v2.71.2; the Open Sans cuts (1.4.0, with
//                   Na__LayoutEditor__PdfFonts__) 02-Oct-2026 for ValeVision3D v2.71.3; the
//                   Layers list's paint order (1.7.0) 02-Oct-2026 for ValeVision3D v2.71.3
// - Parity        : adapted
// - Divergences   :
//   - Against its sources: any paper size; vector content; primitives shared with the screen.
//   - EnsureLinework is handed the viewport's Model Source, as TrueVision3D's exporter does; it is
//     always the live model here (ValeVision3D has no design phases).
//   - Not here yet: TrueVision3D's 1.2.0 and 1.12.0 (site plans, and their strict check), 1.6.0
//     (depth fog, and its picture's packing), 1.8.0 (Sheet Images), 1.9.0 (turned viewports) and
//     1.10.0 (note regions).
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.2.4 (TrueVision3D's paint order, v2.71.3)
// - The page is laid down in the Layers list's order. It used to print every
//   viewport, then all the sheet markup, then all the chrome - so a layer the
//   list put under the Viewports layer printed over the drawing, and every
//   caption printed over every note. BuildDocument now walks Na__LePaint__Plan:
//   a viewport and its own frame and caption, the notes margin with the border
//   and title block over the frontmost drawings, and each layer's markup where
//   the list puts it. A sheet whose viewports are at the bottom of the list
//   prints as it did, except that a note laid over the title block now prints
//   over it, as the screen has always shown it. Ported from TrueVision3D
//   (PdfExporter 1.7.0, v2.106.0).
//
// 02-Oct-2026 - Version 1.2.3 (TrueVision3D's Open Sans embedding, v2.71.3)
// - The Open Sans cuts are in memory before any document is measured or
//   drawn: EnsureJsPdf awaits Na__LePdfFonts__EnsureLoaded once jsPDF is
//   there, and BuildDocument installs the cuts in each new document, made
//   with putOnlyUsedFonts so a cut no text is set in stays out of the file.
//   Ported from TrueVision3D (PdfExporter 1.4.0, 14-Sep-2026).
// - The page's text is set by the chrome painter, which picks Helvetica
//   until Na__LayoutEditor__SheetChrome__ 1.14.0 chooses Open Sans through
//   Na__LePdfFonts__SetFont; until then the file carries Helvetica alone.
//
// 02-Oct-2026 - Version 1.2.2 (TrueVision3D's picture packing and export options, v2.71.2)
// - Viewport pictures (the 2D underlay and the 3D picture) are packed 'FAST' -
//   the Sub predictor - through Na__LePdf__AddPicture. jsPDF's default on a
//   compressed document is Paeth, and Chrome's PDF viewer (and Android's)
//   garbles a Paeth picture over 60 MB decoded into black blocks and streaks.
//   Pictures come out larger, with the same pixels. options.pictureCompression
//   can override it. Ported from TrueVision3D (PdfExporter 1.11.0, v2.155.0).
// - BuildDocument, DrawViewport and ExportSheet take TrueVision3D's options:
//   { strict : true } throws when a 2D viewport's drawing source is missing or
//   a 3D viewport could not be rendered, where the default leaves the frame
//   empty and still exports. Download PDF and the Dev menu pass no options.
// - Na__LePdf__LoadLibrary loads jsPDF alone and is exported; EnsureJsPdf
//   awaits it, as TrueVision3D's does. ExportSheet awaits the save
//   (returnPromise), so its toast follows the hand-over to the browser.
//
// 01-Oct-2026 - Version 1.2.1 (TrueVision3D's linework call, v2.71.2)
// - A 2D viewport's linework is asked for with the viewport's Model Source,
//   as TrueVision3D's exporter asks: EnsureLinework(definition, null, false,
//   described.modelSource). ValeVision3D has no design phases, so it is the
//   live model and the PDF prints exactly the lines it did.
//
// 14-Sep-2026 - Version 1.2.0
// - A 3D viewport's picture goes at Na__LeVp3d__ExportRectMm: the whole
//   picture's rectangle as before, or the frame itself once the frame shows a
//   window of a zoomed or slid picture - which is what the export rendered.
// - Ported from TrueVision3D (PdfExporter 1.3.0, v2.50.0).
//
// 13-Sep-2026 - Version 1.1.0
// - Linework prints as the same style bands the sheet paints: per-category
//   colour, weight and dash pattern, in paper millimetres. Ported from TrueVision3D (Edge Styles).
//
// 13-Sep-2026 - Version 1.0.3
// - Linework widths carry the viewport's Projected Linework and Hidden Lines composite weights, so the PDF prints what the sheet shows.
//
// 10-Sep-2026 - Version 1.0.2
// - Viewport pictures at the raster export level (High), whatever the working level on screen.
//
// 10-Sep-2026 - Version 1.0.1
// - Linework widths from the sheet's viewport lineweight; shapes arrive through the markup primitives.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Layout, Model, Chrome, Markup, Viewports, Assets
    // ------------------------------------------------------------
    import { Na__LeCfg__GetPdfSetup, Na__LeCfg__GetLineworkSetup, Na__LeCfg__GetLabel, Na__LeCfg__GetSpecificationSetup, Na__LeCfg__FormatLabel } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    import { Na__LePdfFonts__EnsureLoaded, Na__LePdfFonts__Install } from './Na__LayoutEditor__PdfFonts__.js';
    import { Na__LeFileName__Build } from './Na__LayoutEditor__PdfFilename__.js';   // <-- Shared with the specification download, so both name their files alike
    import { Na__LeScale__SheetLabel } from '../07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js';
    import { Na__LeLayout__Solve } from '../07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js';
    import { Na__LeModel__KIND_2D, Na__LeModel__GetFields } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
    import { Na__LeChrome__Build, Na__LeChrome__BuildViewportFrame, Na__LeChrome__DrawToPdf } from '../10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js';
    import { Na__LeMarkup__BuildScenePrimitives, Na__LeMarkup__BuildLayerPrimitives } from '../15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js';
    import { Na__LePaint__STEP_VIEWPORT, Na__LePaint__STEP_SHEET, Na__LePaint__Plan } from '../15__Core__Markup/Na__LayoutEditor__PaintOrder__.js';   // <-- The page is laid down in the Layers list's order, as the screen stacks it
    import { Na__LeVp2d__Describe, Na__LeVp2d__EnsureLinework, Na__LeVp2d__RenderForExport, Na__LeVp2d__StyleBands } from '../20__System__Viewports/Na__LayoutEditor__Viewport2d__.js';
    import { Na__LeVp3d__RenderForExport, Na__LeVp3d__ExportRectMm } from '../20__System__Viewports/Na__LayoutEditor__Viewport3d__.js';
    import { Na__DrawData__GetProjectCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    import { Na__LeSpec__EnsureLoaded } from '../50__Feature__Specification/Na__LayoutEditor__SpecData__.js';
    import { Na__LeMargin__Push, Na__LeMargin__Report } from '../50__Feature__Specification/Na__LayoutEditor__SpecMargin__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | jsPDF Loading
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Script Injection Promise
    // ------------------------------------------------------------
    let Na__LePdf__LoadPromise = null;
    // ------------------------------------------------------------


    // FUNCTION | Load the Vendored jsPDF UMD Once
    // ------------------------------------------------------------
    function Na__LePdf__LoadLibrary() {
        if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
        if (Na__LePdf__LoadPromise) return Na__LePdf__LoadPromise;
        Na__LePdf__LoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src   = Na__LeCfg__GetPdfSetup().jsPdfScriptPath;
            script.async = true;
            script.onload  = () => (window.jspdf && window.jspdf.jsPDF) ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF did not register'));
            script.onerror = () => reject(new Error('jsPDF failed to load from ' + script.src));
            document.head.appendChild(script);
        }).catch((error) => { Na__LePdf__LoadPromise = null; throw error; });
        return Na__LePdf__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Make Sure jsPDF Exists and Open Sans Is Ready to Embed
    // ------------------------------------------------------------
    async function Na__LePdf__EnsureJsPdf() {
        const JsPdf = await Na__LePdf__LoadLibrary();
        await Na__LePdfFonts__EnsureLoaded();                                     // <-- TTF in memory before any document is measured or drawn
        return JsPdf;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Shift Frame-Local Primitives Onto the Paper
    // ------------------------------------------------------------
    function Na__LePdf__Offset(primitives, dx, dy) {
        return primitives.map((p) => {
            const c = Object.assign({}, p);
            if (p.Kind === 'rect' || p.Kind === 'image') { c.X = p.X + dx; c.Y = p.Y + dy; }
            else if (p.Kind === 'line') { c.X1 = p.X1 + dx; c.Y1 = p.Y1 + dy; c.X2 = p.X2 + dx; c.Y2 = p.Y2 + dy; }
            else if (p.Kind === 'polyline') { c.Points = p.Points.map((pt) => [ pt[0] + dx, pt[1] + dy ]); }
            else if (p.Kind === 'text') { c.X = p.X + dx; c.BaselineY = p.BaselineY + dy; }
            else if (p.Kind === 'group') { c.Children = Na__LePdf__Offset(p.Children, dx, dy); if (p.ClipRect) c.ClipRect = Object.assign({}, p.ClipRect, { X : p.ClipRect.X + dx, Y : p.ClipRect.Y + dy }); }
            return c;
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Begin and End a Rectangular Clip
    // ------------------------------------------------------------
    function Na__LePdf__BeginClip(doc, rect) {
        try {
            doc.saveGraphicsState();
            doc.rect(rect.X, rect.Y, rect.WidthMm, rect.HeightMm, null);
            doc.clip();
            doc.discardPath();
            return true;
        } catch (e) { return false; }
    }
    function Na__LePdf__EndClip(doc, clipped) {
        if (clipped) { try { doc.restoreGraphicsState(); } catch (e) { /* nothing */ } }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hex to RGB
    // ------------------------------------------------------------
    function Na__LePdf__Rgb(hex) {
        const v = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || '')) ? String(hex).replace('#', '') : '323232';
        return [ parseInt(v.substring(0, 2), 16), parseInt(v.substring(2, 4), 16), parseInt(v.substring(4, 6), 16) ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw the Projected Linework of a 2D Viewport as Vector Lines
    // ------------------------------------------------------------
    function Na__LePdf__DrawLinework(doc, sheet, viewport, described, classes) {
        const win   = described.window;
        const setup = Na__LeCfg__GetLineworkSetup();
        const D     = win.Denominator;
        const minLen = setup.minSegmentPaperMm;
        const frame  = viewport.Viewport__FrameMm;
        const showHidden = viewport.Viewport__Styles.hiddenLines === true;
        // THE SAME BANDS THE SCREEN PAINTS. The PDF is paper millimetres already,
        // so widths and dash patterns go in unscaled; the screen multiplies both
        // by the denominator because its SVG is drawn in model millimetres.
        const bands = Na__LeVp2d__StyleBands(viewport, sheet && sheet.Sheet__Lineweights ? sheet.Sheet__Lineweights.ViewportPt : null, classes, showHidden);
        bands.forEach((band) => {
            const segments = classes[band.className];
            if (!segments || segments.length < 4) return;
            const rgb  = Na__LePdf__Rgb(band.colour);
            doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
            doc.setLineWidth(band.widthMm);
            doc.setLineCap('round');
            try { doc.setLineDashPattern(band.dashMm && band.dashMm.length ? band.dashMm : [], 0); } catch (e) { /* older build */ }
            const count = band.indices ? band.indices.length : Math.floor(segments.length / 4);
            for (let k = 0; k < count; k++) {
                const i  = (band.indices ? band.indices[k] : k) * 4;
                const x1 = frame.X + ((segments[i]     - win.OriginX) / D), y1 = frame.Y + ((segments[i + 1] - win.OriginY) / D);
                const x2 = frame.X + ((segments[i + 2] - win.OriginX) / D), y2 = frame.Y + ((segments[i + 3] - win.OriginY) / D);
                if (Math.abs(x2 - x1) < minLen && Math.abs(y2 - y1) < minLen) continue;
                // Skip segments wholly outside the frame; the clip handles the rest
                if ((x1 < frame.X && x2 < frame.X) || (x1 > frame.X + frame.WidthMm && x2 > frame.X + frame.WidthMm) ||
                    (y1 < frame.Y && y2 < frame.Y) || (y1 > frame.Y + frame.HeightMm && y2 > frame.Y + frame.HeightMm)) continue;
                doc.line(x1, y1, x2, y2);
            }
        });
        try { doc.setLineDashPattern([], 0); } catch (e) { /* nothing */ }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put One Viewport Picture on the Page
    // ------------------------------------------------------------
    // EVERY VIEWPORT PICTURE IS PACKED 'FAST'. Given no compression, jsPDF
    // picks 'SLOW' on a compressed document - the Paeth predictor on every
    // row - and Chrome's PDF viewer, the same engine as Android's, paints
    // black blocks and streaks over any such picture over 60,000,000 decoded
    // bytes (PS01 D01's proposed plan, 4518 x 5183 px, 70.3 MB). 'FAST' is the
    // Sub predictor, which never reads the row above, so it cannot happen; the
    // cost is a larger picture. Sheet Images have always been packed this way.
    // options.pictureCompression overrides it for a caller that wants other.
    // ------------------------------------------------------------
    function Na__LePdf__AddPicture(doc, dataUrl, x, y, widthMm, heightMm, options) {
        const packing = (options && typeof options.pictureCompression === 'string') ? options.pictureCompression : 'FAST';
        doc.addImage(dataUrl, 'PNG', x, y, widthMm, heightMm, undefined, packing);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw One Viewport
    // ------------------------------------------------------------
    async function Na__LePdf__DrawViewport(doc, sheet, viewport, options) {
        const frame   = viewport.Viewport__FrameMm;
        const clipped = Na__LePdf__BeginClip(doc, frame);
        try {
            if (viewport.Viewport__Kind === Na__LeModel__KIND_2D) {
                const described = Na__LeVp2d__Describe(viewport);
                if (!described.definition) { if (options && options.strict) throw new Error('A viewport drawing source is missing.'); return; }
                const underlay = await Na__LeVp2d__RenderForExport(viewport);
                if (underlay && underlay.dataUrl) Na__LePdf__AddPicture(doc, underlay.dataUrl, frame.X, frame.Y, frame.WidthMm, frame.HeightMm, options);
                if (viewport.Viewport__Styles.projectedLinework !== false) {
                    const classes = await Na__LeVp2d__EnsureLinework(described.definition, null, false, described.modelSource);   // <-- The viewport's own Model Source (the live model here)
                    if (classes) Na__LePdf__DrawLinework(doc, sheet, viewport, described, classes);
                }
                if (viewport.Viewport__MarkupMode === 'scene') {
                    Na__LeChrome__DrawToPdf(doc, Na__LePdf__Offset(Na__LeMarkup__BuildScenePrimitives(described), frame.X, frame.Y));
                }
                return;
            }
            const dataUrl = await Na__LeVp3d__RenderForExport(sheet, viewport);
            if (!dataUrl && options && options.strict) throw new Error('A 3D viewport could not be rendered.');
            if (dataUrl) {
                const rect = Na__LeVp3d__ExportRectMm(viewport);                   // <-- The picture's own rectangle, or the frame when it shows a window of a zoomed picture
                Na__LePdf__AddPicture(doc, dataUrl, frame.X + rect.X, frame.Y + rect.Y, rect.WidthMm, rect.HeightMm, options);
            }
        } finally {
            Na__LePdf__EndClip(doc, clipped);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Output File Name From the Pattern
    // ------------------------------------------------------------
    // Every token comes from the sheet as the title block reads it, so the file name
    // and the drawing it holds cannot disagree: the drawing code, revision and paper
    // are the ones printed on the sheet, not a second set assembled here. The naming
    // itself lives in Na__LayoutEditor__PdfFilename__, which the specification
    // download shares, so the two come out of the app named the same way.
    //
    // The date is TODAY, the day the file was issued, which is also what the title
    // block prints unless that field has been typed over. To make the file follow an
    // overridden title block date instead, pass fields.Date as parts.date.
    // ------------------------------------------------------------
    function Na__LePdf__Filename(sheet, layout) {
        const fields = Na__LeModel__GetFields(sheet);                              // <-- Defaults filled in, so a blank Drawing No. still names the file
        return Na__LeFileName__Build({
            code        : fields.DrawingNumber,
            name        : sheet.Sheet__Name,
            paper       : layout.Page.SizeKey,
            revision    : fields.Revision,
            projectCode : Na__DrawData__GetProjectCode()
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Document for a Sheet (returns the jsPDF instance)
    // ------------------------------------------------------------
    async function Na__LePdf__BuildDocument(sheet, options) {
        const JsPdf  = await Na__LePdf__EnsureJsPdf();
        const setup  = Na__LeCfg__GetPdfSetup();
        const layout = Na__LeLayout__Solve(sheet);
        const doc    = new JsPdf({ orientation : layout.Page.Orientation, unit : 'mm', format : [ layout.Page.WidthMm, layout.Page.HeightMm ], compress : true, putOnlyUsedFonts : true });
        Na__LePdfFonts__Install(doc);                                             // <-- Open Sans into this document; Helvetica remains if the TTF never arrived
        const scales = sheet.Sheet__Viewports.filter((v) => v.Viewport__Kind === Na__LeModel__KIND_2D).map((v) => v.Viewport__ScaleDenominator);
        doc.setProperties({
            title   : sheet.Sheet__Name,
            subject : 'ValeVision3D sheet ' + layout.Page.Label + ' ' + layout.Page.Orientation + ', scale ' + Na__LeScale__SheetLabel(scales),
            author  : setup.author,
            creator : setup.creator
        });

        // CHROME | The sheet's own, built once; the classic scan goes under everything
        const chrome = Na__LeChrome__Build(layout, sheet, { fields : Na__LeModel__GetFields(sheet), includeFrames : false });
        const scans  = (layout.TitleBlockStyle === 'classic') ? chrome.filter((p) => p.Kind === 'image') : [];
        const rest   = (layout.TitleBlockStyle === 'classic') ? chrome.filter((p) => p.Kind !== 'image') : chrome;
        Na__LeChrome__DrawToPdf(doc, scans);

        // THE SHEET IN THE LAYERS LIST'S ORDER | Back to front, from the plan
        // the screen stacks by, so what is under what on the page is what it is
        // on the sheet. It used to be every viewport, then all the markup, then
        // the chrome: a layer under the Viewports layer still printed over the
        // drawing. A viewport now prints with its own frame and caption straight
        // over it; the border, title block and notes margin over the frontmost
        // drawings; and each layer's markup where the list puts it.
        const steps = Na__LePaint__Plan(sheet);
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (step.kind === Na__LePaint__STEP_VIEWPORT) {
                await Na__LePdf__DrawViewport(doc, sheet, step.viewport, options);   // <-- Pictures at the raster export level
                Na__LeChrome__DrawToPdf(doc, Na__LeChrome__BuildViewportFrame(sheet, step.viewport));
                continue;
            }
            if (step.kind === Na__LePaint__STEP_SHEET) {
                const margin = [];
                Na__LeMargin__Push(margin, sheet, layout);                     // <-- The notes column's paper, then the border and title block over its edge
                Na__LeChrome__DrawToPdf(doc, margin);
                Na__LeChrome__DrawToPdf(doc, rest);
                continue;
            }
            Na__LeChrome__DrawToPdf(doc, Na__LeMarkup__BuildLayerPrimitives(sheet, step.layerId, null));
        }
        return { doc : doc, filename : Na__LePdf__Filename(sheet, layout) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Export a Sheet and Hand the File to the Browser
    // ------------------------------------------------------------
    async function Na__LePdf__ExportSheet(sheet, showToast, options) {
        const toast = (typeof showToast === 'function') ? showToast : () => {};
        if (!sheet) return false;
        try {
            const cap = Na__LeCfg__GetSpecificationSetup().loadTimeoutMs;
            await Promise.race([ Na__LeSpec__EnsureLoaded(), new Promise((resolve) => { window.setTimeout(resolve, cap); }) ]);   // <-- The notes margin prints its notes, not an empty column
            const built = await Na__LePdf__BuildDocument(sheet, options);
            await built.doc.save(built.filename, { returnPromise : true });
            const margin = Na__LeMargin__Report(sheet, null);
            if (margin.on && margin.overflow > 0) toast(Na__LeCfg__FormatLabel('PdfMarginOverflow', 'PDF downloaded, but {count} margin note(s) did not fit and were left out. Widen the notes margin or make its text smaller.', { count : margin.overflow }), true);
            else toast(Na__LeCfg__GetLabel('PdfReadyMessage', 'PDF downloaded.'), false);
            return true;
        } catch (exportError) {
            console.error('[ValeVision3D LayoutEditor] PDF export failed:', exportError);
            toast(Na__LeCfg__GetLabel('PdfFailedMessage', 'PDF export failed - see console.'), true);
            return false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor PDF Exporter API
    // ------------------------------------------------------------
    export {
        Na__LePdf__EnsureJsPdf,
        Na__LePdf__LoadLibrary,                                                 // <-- jsPDF ALONE, for the statement PDF: it draws no text, so the Open Sans cuts EnsureJsPdf also fetches would be half a megabyte a reader never uses
        Na__LePdf__BuildDocument,
        Na__LePdf__ExportSheet
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
