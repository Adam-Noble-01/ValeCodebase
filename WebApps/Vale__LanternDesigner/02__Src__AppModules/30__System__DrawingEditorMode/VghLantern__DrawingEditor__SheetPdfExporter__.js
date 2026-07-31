/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | SHEET PDF EXPORTER
   =============================================================================

   FILE       : VghLantern__DrawingEditor__SheetPdfExporter__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - SheetPdfExporter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Bake the composed drawing sheet to a true-size, true-scale PDF
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Writes the sheet the Drawing Editor is showing as a single-page PDF at the exact
     paper size selected in the toolbar, so the file prints at 100 percent and every
     dimension measures correctly under a scale rule.
   - Draws nothing of its own. The rectangles come from the layout the Drawing Editor
     laid the screen sheet out with, and the frame furniture, notes and titleblock are
     the primitives SheetChrome built for that same sheet.
   - Orthographic views are rasterised because jsPDF cannot place vector SVG. All
     chrome text is drawn natively, so it stays selectable and searchable in the
     issued drawing.

   -----------------------------------------------------------------------------

   HOW SCALE CORRECTNESS IS GUARANTEED:
   Three things have to agree, and this module forces all three:
     1. The PDF page is created at the sheet's real millimetre size, so the PDF
        MediaBox is a true A3 (or A4, A2, A1) and no printer scaling is implied.
     2. Each view's viewBox is REWRITTEN to span exactly (body rectangle x scale
        denominator) model millimetres before rasterising. The drawn view therefore
        fills its frame at precisely 1:N regardless of how the browser laid the
        preview out.
     3. The raster is placed into that same body rectangle, so no fitting, letter-
        boxing or aspect correction happens between the maths and the paper.

   WHY THE VIEWBOX IS REWRITTEN RATHER THAN TRUSTED:
   The on-screen surface is fitted to a CSS box that is derived from, but not identical
   to, the solved rectangle once the browser has rounded it to device pixels. Trusting
   that viewBox would carry a fraction of a percent of screen error into a printed
   drawing that a joiner will measure.

   WHY THE EXPORT REUSES THE EDITOR'S LAYOUT:
   Re-solving here would be correct but not obviously correct - the moment a share, a
   note or a sheet size differed between the two solves, the file would stop matching
   the sheet the user approved. The layout travels on the described sheet instead.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Sheet PDF Exporter Module
// =============================================================================

const VghLantern__DrawingEditor__SheetPdfExporter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Failure Messages
    // ------------------------------------------------------------
    const MESSAGE_NO_LIBRARY         =  'PDF export failed - the jsPDF library did not load.';
    const MESSAGE_NO_SHEET           =  'Open a lantern in the Drawing Editor before exporting a PDF.';
    const MESSAGE_FAILED             =  'PDF export failed - see the browser console for details.';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Export Guard
    // ------------------------------------------------------------
    // A second click while the first export is still rasterising would produce two
    // files from one intent, so exports are serialised.
    let VghLantern__SheetPdfExporter__IsExporting  =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access and Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Named Drawing Editor Config Block
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__Block(blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        return drawingCfg['VghLantern__DrawingEditor__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report a Failure to the User
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__ReportFailure(message) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) {
            Toast.VghLantern__Toast__Show(message, 'error');
            return;
        }
        console.error('[VghLantern__DrawingEditor__SheetPdfExporter] ' + message);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report a Success to the User
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__ReportSuccess(message) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) Toast.VghLantern__Toast__Show(message, 'success');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View Rasterisation at True Scale
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Load an SVG String Into an Image Element
    // ------------------------------------------------------------
    // A blob URL rather than a data URI, because serialised drawing SVG routinely
    // exceeds the data URI length some browsers accept.
    function VghLantern__SheetPdfExporter__LoadSvgImage(svgMarkup) {
        return new Promise(function(resolve, reject) {
            var blob     =  new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
            var blobUrl  =  URL.createObjectURL(blob);
            var image    =  new Image();

            image.onload   =  function() { URL.revokeObjectURL(blobUrl); resolve(image); };
            image.onerror  =  function() { URL.revokeObjectURL(blobUrl); reject(new Error('SVG could not be decoded.')); };
            image.src      =  blobUrl;
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Rewrite a View's ViewBox to Span Exactly One Scale Window
    // ------------------------------------------------------------
    // This is the step that makes the printed drawing measurable. The window is
    // (body millimetres x denominator) of model space, centred on the view's own
    // projected extents, so the frame contains exactly what 1:N can hold.
    function VghLantern__SheetPdfExporter__ScaleSvgToFrame(svgMarkup, viewKey, bodyRect, denominator, skeleton, pixelsPerMm) {
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;

        var parsed  =  new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
        var svgEl   =  parsed.documentElement;
        if (!svgEl || svgEl.getElementsByTagName('parsererror').length) return null;

        var spanXMm  =  bodyRect.WidthMm  * denominator;
        var spanYMm  =  bodyRect.HeightMm * denominator;

        var centreX  =  0;
        var centreY  =  0;
        var extents  =  (CoordHelpers && skeleton)
            ? CoordHelpers.VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton(skeleton, viewKey)
            : null;

        if (extents) {
            centreX  =  (extents.MinX + extents.MaxX) / 2;
            centreY  =  (extents.MinY + extents.MaxY) / 2;
        }

        svgEl.setAttribute('viewBox',
            (centreX - (spanXMm / 2)) + ' ' + (centreY - (spanYMm / 2)) + ' ' + spanXMm + ' ' + spanYMm);

        // Intrinsic pixel size drives the rasteriser; the aspect already matches the
        // target rectangle exactly, so nothing is letterboxed away.
        svgEl.setAttribute('width',  Math.max(1, Math.round(bodyRect.WidthMm  * pixelsPerMm)) + 'px');
        svgEl.setAttribute('height', Math.max(1, Math.round(bodyRect.HeightMm * pixelsPerMm)) + 'px');
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        return new XMLSerializer().serializeToString(svgEl);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Rasterise Scaled SVG Markup to a PNG Data URL
    // ------------------------------------------------------------
    // PNG rather than JPEG: a drawing is thin dark lines on white, which JPEG blurs
    // into grey haloes and PNG compresses better than it would a photograph.
    async function VghLantern__SheetPdfExporter__RasteriseSvg(svgMarkup, bodyRect, pixelsPerMm) {
        var image   =  await VghLantern__SheetPdfExporter__LoadSvgImage(svgMarkup);
        var canvas  =  document.createElement('canvas');

        canvas.width   =  Math.max(1, Math.round(bodyRect.WidthMm  * pixelsPerMm));
        canvas.height  =  Math.max(1, Math.round(bodyRect.HeightMm * pixelsPerMm));

        var context  =  canvas.getContext('2d');
        context.fillStyle  =  '#ffffff';                                      // <-- Paper, and PNG alpha would otherwise print grey
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/png');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place One View Into Its Body Rectangle
    // ------------------------------------------------------------
    // A slot that cannot produce an image leaves an empty frame rather than aborting
    // the export: an issued sheet missing one view is recoverable, a missing file is
    // not.
    async function VghLantern__SheetPdfExporter__DrawView(doc, placement, sheet, skeleton, pixelsPerMm) {
        var slot  =  placement.Slot;
        var body  =  placement.Body;

        // The 3D snapshot was captured at this rectangle's aspect when the sheet was
        // composed, so it is placed rather than fitted - the same image fills the
        // same frame here as it does on screen.
        if (slot.Source === 'env3d') {
            var snapshot  =  sheet.ViewSnapshots ? sheet.ViewSnapshots[slot.Key] : null;
            if (snapshot) doc.addImage(snapshot, 'PNG', body.X, body.Y, body.WidthMm, body.HeightMm);
            return;
        }

        var markup  =  sheet.ViewSvgMarkup ? sheet.ViewSvgMarkup[slot.Key] : null;
        if (!markup) return;

        try {
            var scaled  =  VghLantern__SheetPdfExporter__ScaleSvgToFrame(
                markup, slot.ViewKey || slot.Key, body, sheet.ScaleDenominator, skeleton, pixelsPerMm
            );
            if (!scaled) return;

            var png  =  await VghLantern__SheetPdfExporter__RasteriseSvg(scaled, body, pixelsPerMm);
            doc.addImage(png, 'PNG', body.X, body.Y, body.WidthMm, body.HeightMm);
        } catch (rasterError) {
            console.warn('[VghLantern__DrawingEditor__SheetPdfExporter] View "' + slot.Key + '" could not be rasterised:', rasterError);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Metadata and Filename
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Export Filename From the Configured Pattern
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__ResolveFilename(sheet, layout) {
        var TitleBlock  =  window.VghLantern__DrawingEditor__TitleBlockRenderer;
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pdfCfg      =  VghLantern__SheetPdfExporter__Block('PdfExport');
        var pattern     =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
            pdfCfg, 'FilenamePattern', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__PdfExport');

        var fields  =  TitleBlock
            ? TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(sheet.Project, sheet.Lantern)
            : {};

        var tokens  =  {
            projectCode   : fields.projectCode   || '',
            projectName   : fields.projectName   || '',
            drawingNumber : fields.drawingNumber || '',
            lanternTitle  : fields.lanternTitle  || '',
            revision      : fields.revision      || '',
            sheetSize     : layout.Page.SizeKey  || '',
            scale         : String(sheet.ScaleDenominator || '')
        };

        var resolved  =  pattern.replace(/\{(\w+)\}/g, function(match, tokenName) {
            return String(tokens[tokenName] === undefined ? '' : tokens[tokenName])
                .trim().replace(/[^A-Za-z0-9_\-]+/g, '-').replace(/-{2,}/g, '-').replace(/^[-_]+|[-_]+$/g, '');
        });

        resolved  =  resolved.replace(/_{3,}/g, '__').replace(/-{2,}/g, '-');
        if (!/[A-Za-z0-9]/.test(resolved)) resolved  =  'VghLantern__DrawingSheet';

        return resolved + '.pdf';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Stamp the Document Properties
    // ------------------------------------------------------------
    // The page size and the drawn scale are written into the file metadata as well
    // as into the page geometry, so anyone checking why a print measured short can
    // read the intended paper and scale straight out of the document properties.
    function VghLantern__SheetPdfExporter__ApplyMetadata(doc, sheet, layout) {
        var TitleBlock    =  window.VghLantern__DrawingEditor__TitleBlockRenderer;
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pdfCfg        =  VghLantern__SheetPdfExporter__Block('PdfExport');

        var fields  =  TitleBlock
            ? TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(sheet.Project, sheet.Lantern)
            : {};

        var sheetLabel  =  (layout.Page.Label || layout.Page.SizeKey || '') + ' ' + layout.Page.Orientation;
        var sizeLabel   =  layout.Page.WidthMm + 'mm x ' + layout.Page.HeightMm + 'mm';

        var titleParts  =  [];
        if (fields.projectCode)   titleParts.push(fields.projectCode);
        if (fields.drawingNumber) titleParts.push(fields.drawingNumber);
        titleParts.push('Roof Lantern Drawing');

        var keywords  =  [
            'roof lantern', 'Vale Garden Houses',
            sheetLabel.trim(), sizeLabel, sheet.ScaleLabel || ''
        ].filter(function(part) { return !!part; });

        doc.setProperties({
            Title    : titleParts.join(' - '),
            Subject  : 'Drawn at ' + (sheet.ScaleLabel || 'the sheet scale') + ' on ' + sheetLabel.trim() +
                       ' (' + sizeLabel + '). Print at 100 percent with no page scaling for a true scale drawing.',
            Author   : ConfigLoader.VghLantern__ConfigLoader__RequireString(
                pdfCfg, 'Author', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__PdfExport'),
            Creator  : ConfigLoader.VghLantern__ConfigLoader__RequireString(
                pdfCfg, 'Creator', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__PdfExport'),
            Keywords : keywords.join(', ')
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Export the Composed Sheet as a True Size PDF
    // ------------------------------------------------------------
    async function VghLantern__DrawingEditor__SheetPdfExporter__Export() {
        if (VghLantern__SheetPdfExporter__IsExporting) return false;

        var JsPdf  =  (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
        if (!JsPdf) {
            VghLantern__SheetPdfExporter__ReportFailure(MESSAGE_NO_LIBRARY);
            return false;
        }

        var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
        var SheetChrome   =  window.VghLantern__DrawingEditor__SheetChrome;
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!SheetManager || !SheetChrome) return false;

        VghLantern__SheetPdfExporter__IsExporting  =  true;

        try {
            var sheet  =  SheetManager.VghLantern__DrawingEditor__SheetManager__DescribeSheet();
            if (!sheet || !sheet.IsComposed) {
                VghLantern__SheetPdfExporter__ReportFailure(MESSAGE_NO_SHEET);
                return false;
            }

            // The layout the Drawing Editor laid the screen sheet out with. Nothing
            // is re-solved here, so an export cannot disagree with what was approved.
            var layout  =  sheet.Layout;
            if (!layout) {
                VghLantern__SheetPdfExporter__ReportFailure(MESSAGE_NO_SHEET);
                return false;
            }

            var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
            var pdfCfg        =  VghLantern__SheetPdfExporter__Block('PdfExport');
            var pixelsPerMm   =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
                pdfCfg, 'RasterPixelsPerMm', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__PdfExport');

            // The page is created at the sheet's real millimetre size. Passing the
            // orientation that already matches the format stops jsPDF swapping the
            // axes back on us, which would silently produce a rotated MediaBox.
            var isLandscape  =  layout.Page.WidthMm >= layout.Page.HeightMm;
            var doc  =  new JsPdf({
                unit        : 'mm',
                orientation : isLandscape ? 'landscape' : 'portrait',
                format      : [layout.Page.WidthMm, layout.Page.HeightMm],
                compress    : true
            });

            var skeleton  =  StateManager ? StateManager.VghLantern__StateManager__GetSolvedSkeleton() : null;
            var i;

            // Views first, chrome after. A view is an opaque raster that fills its
            // body rectangle to the millimetre, so chrome drawn first would be
            // painted over along every edge it shares with the image. The on-screen
            // sheet stacks the chrome overlay above the frames for the same reason.
            for (i = 0; i < layout.Slots.length; i++) {
                await VghLantern__SheetPdfExporter__DrawView(doc, layout.Slots[i], sheet, skeleton, pixelsPerMm);
            }

            var logoAsset   =  await SheetChrome.VghLantern__DrawingEditor__SheetChrome__LoadLogo();
            var primitives  =  SheetChrome.VghLantern__DrawingEditor__SheetChrome__BuildForSheet(
                layout, sheet.Project, sheet.Lantern, logoAsset
            );
            SheetChrome.VghLantern__DrawingEditor__SheetChrome__DrawToPdf(doc, primitives);

            VghLantern__SheetPdfExporter__ApplyMetadata(doc, sheet, layout);
            doc.save(VghLantern__SheetPdfExporter__ResolveFilename(sheet, layout));

            VghLantern__SheetPdfExporter__ReportSuccess(
                'Drawing exported at ' + (layout.Page.Label || layout.Page.SizeKey) + ' ' + (sheet.ScaleLabel || '')
            );
            return true;

        } catch (exportError) {
            console.error('[VghLantern__DrawingEditor__SheetPdfExporter] Export failed:', exportError);
            VghLantern__SheetPdfExporter__ReportFailure(MESSAGE_FAILED);
            return false;

        } finally {
            VghLantern__SheetPdfExporter__IsExporting  =  false;
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__SheetPdfExporter__Export : VghLantern__DrawingEditor__SheetPdfExporter__Export
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetPdfExporter  =  VghLantern__DrawingEditor__SheetPdfExporter;
