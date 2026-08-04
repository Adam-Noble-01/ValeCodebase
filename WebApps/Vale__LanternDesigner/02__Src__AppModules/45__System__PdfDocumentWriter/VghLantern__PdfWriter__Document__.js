/* =============================================================================
   VGHLANTERN - PDF DOCUMENT WRITER | DOCUMENT
   =============================================================================

   FILE       : VghLantern__PdfWriter__Document__.js
   NAMESPACE  : VghLantern
   MODULE     : System - PdfDocumentWriter - Document
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The one place in the application that creates and saves a PDF
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Takes an ordered list of page descriptors and writes them to a single file.
     Each descriptor carries its own paper size, so one document can run A4 portrait
     specification pages straight into an A1 landscape drawing sheet.
   - Draws nothing. Every mark on every page comes from that page's Paint callback;
     this module owns page assembly, the footer and the file.
   - Both export routes go through here: the Drawing Editor's single-sheet download
     and the Preview and Send document.

   -----------------------------------------------------------------------------

   PAGE DESCRIPTOR SHAPE:

     {
       Kind     : 'drawingSheet' | 'specification' | ...   footer eligibility is by kind
       WidthMm  : number                                   this page's paper width
       HeightMm : number                                   this page's paper height
       Paint    : function(doc, pageContext)               sync or async
     }

   PAGE CONTEXT HANDED TO A PAINTER:

     {
       Kind, WidthMm, HeightMm
       PageNumber          physical page this descriptor is currently drawing on
       AddOverflowPage()   continue onto another page at this descriptor's own size
     }

   -----------------------------------------------------------------------------

   WHY ORIENTATION IS DERIVED AND NEVER PASSED IN:
   jsPDF rewrites the format array when the orientation string disagrees with the
   dimensions: ask for landscape with [210, 297] and it quietly hands back a 297 x 210
   page. That is a rotated MediaBox nobody notices until a drawing prints wrong. The
   orientation here is therefore always read off the dimensions themselves, which
   makes the two impossible to contradict.

   WHY FOOTERS ARE STAMPED LAST:
   "Page 2 of 5" needs the 5, and the 5 is not known until every painter has finished
   adding its overflow pages. Each physical page is measured against its own page size
   at stamp time, so a mixed-size document foots correctly on every sheet.

   WHY A FLOWING PAINTER ADDS ITS OWN PAGES:
   A specification runs to however many pages the takeoff needs. Letting the painter
   call AddOverflowPage keeps that decision with the content, while the new page still
   gets this module's size and footer rules rather than the painter's idea of them.

   ============================================================================= */

// =============================================================================
// REGION | PDF Document Writer Module
// =============================================================================

const VghLantern__PdfWriter__Document = (function() {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Write Guard
    // ------------------------------------------------------------
    // A second click while the first document is still rasterising would produce two
    // files from one intent, so writes are serialised across every export route.
    let VghLantern__PdfWriter__IsWriting  =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Named PDF Writer Config Block
    // ------------------------------------------------------------
    function VghLantern__PdfWriter__Block(blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var writerCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('PdfWriter') || {};
        return writerCfg['VghLantern__PdfWriter__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Configured Message String
    // ------------------------------------------------------------
    function VghLantern__PdfWriter__Message(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__PdfWriter__Block('Messages'), key,
            'Na__PdfWriter__Config.json -> VghLantern__PdfWriter__Config__Messages');
    }
    // ------------------------------------------------------------


    // FUNCTION | Expose the Footer Block to Screen Surfaces
    // ------------------------------------------------------------
    // The Preview and Send pages render their own footer on screen. Reading it from
    // here rather than from a mode config is what stops the previewed footer and the
    // written footer drifting apart.
    function VghLantern__PdfWriter__Document__FooterConfig() {
        return VghLantern__PdfWriter__Block('Footer');
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether a Page Kind Prints a Footer
    // ------------------------------------------------------------
    function VghLantern__PdfWriter__Document__KindShowsFooter(pageKind) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var footerCfg     =  VghLantern__PdfWriter__Block('Footer');
        var FOOTER_LABEL  =  'Na__PdfWriter__Config.json -> VghLantern__PdfWriter__Config__Footer';

        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(footerCfg, 'Enabled', FOOTER_LABEL)) return false;

        var skipKinds  =  ConfigLoader.VghLantern__ConfigLoader__RequireArray(footerCfg, 'SkipOnPageKinds', FOOTER_LABEL);
        return skipKinds.indexOf(pageKind) === -1;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | User Reporting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Report a Failure to the User
    // ------------------------------------------------------------
    function VghLantern__PdfWriter__ReportFailure(message) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) {
            Toast.VghLantern__Toast__Show(message, 'error');
            return;
        }
        console.error('[VghLantern__PdfWriter__Document] ' + message);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report a Success to the User
    // ------------------------------------------------------------
    function VghLantern__PdfWriter__ReportSuccess(message) {
        if (!message) return;

        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) Toast.VghLantern__Toast__Show(message, 'success');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Page Assembly
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Derive the jsPDF Orientation of a Page From Its Dimensions
    // ------------------------------------------------------------
    // Never taken from a caller. See the header: a disagreement between the string
    // and the array is resolved by jsPDF rewriting the array, which rotates the page.
    function VghLantern__PdfWriter__OrientationOf(page) {
        return (page.WidthMm >= page.HeightMm) ? 'landscape' : 'portrait';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Validate One Page Descriptor
    // ------------------------------------------------------------
    // A page with no usable paper size would be added at jsPDF's default A4 and would
    // then be painted with coordinates solved for something else, which is worse than
    // dropping it.
    function VghLantern__PdfWriter__IsUsablePage(page) {
        return !!page &&
               typeof page.WidthMm  === 'number' && page.WidthMm  > 0 &&
               typeof page.HeightMm === 'number' && page.HeightMm > 0 &&
               typeof page.Paint    === 'function';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Context One Painter Draws Against
    // ------------------------------------------------------------
    // AddOverflowPage is the only way a painter may extend the document. Routing it
    // through here means an overflow page is created at the descriptor's own size and
    // is registered for the footer pass exactly like the page that spawned it.
    function VghLantern__PdfWriter__BuildPageContext(doc, page, startPageNumber, footerFlags) {
        var context  =  {
            Kind        : page.Kind,
            WidthMm     : page.WidthMm,
            HeightMm    : page.HeightMm,
            PageNumber  : startPageNumber
        };

        context.AddOverflowPage  =  function() {
            doc.addPage([page.WidthMm, page.HeightMm], VghLantern__PdfWriter__OrientationOf(page));
            context.PageNumber  =  context.PageNumber + 1;
            footerFlags[context.PageNumber]  =  VghLantern__PdfWriter__Document__KindShowsFooter(page.Kind);
            return context.PageNumber;
        };

        return context;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Footer
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Stamp the Footer Onto Every Eligible Page
    // ------------------------------------------------------------
    // Run after every painter has finished, because the total is not known until
    // then. Each page is measured against its own size, so a document that mixes
    // paper sizes still foots to the correct edge on every sheet.
    function VghLantern__PdfWriter__StampFooters(doc, footerFlags) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var footerCfg     =  VghLantern__PdfWriter__Block('Footer');
        var FOOTER_LABEL  =  'Na__PdfWriter__Config.json -> VghLantern__PdfWriter__Config__Footer';

        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(footerCfg, 'Enabled', FOOTER_LABEL)) return;

        var footerText  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(footerCfg, 'FooterText',       FOOTER_LABEL);
        var pattern     =  ConfigLoader.VghLantern__ConfigLoader__RequireString(footerCfg, 'PageNumberFormat', FOOTER_LABEL);
        var colour      =  ConfigLoader.VghLantern__ConfigLoader__RequireString(footerCfg, 'TextColour',       FOOTER_LABEL);
        var fontSizePt  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(footerCfg, 'FontSizePt',       FOOTER_LABEL);
        var insetXMm    =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(footerCfg, 'InsetXMm',         FOOTER_LABEL);
        var insetYMm    =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(footerCfg, 'InsetYMm',         FOOTER_LABEL);

        var total  =  doc.internal.getNumberOfPages();
        var p, size, baselineY, label;

        for (p = 1; p <= total; p++) {
            if (footerFlags[p] === false) continue;

            doc.setPage(p);
            size       =  doc.internal.pageSize;
            baselineY  =  size.getHeight() - insetYMm;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(fontSizePt);
            doc.setTextColor(colour);

            doc.text(footerText, insetXMm, baselineY);

            label  =  pattern.replace('{page}', String(p)).replace('{total}', String(total));
            doc.text(label, size.getWidth() - insetXMm, baselineY, { align: 'right' });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Write an Ordered List of Page Descriptors to One PDF File
    // ------------------------------------------------------------
    // options is { Filename, Properties, SuccessMessage }. Returns true when a file
    // was produced. Every failure path reports to the user and returns false rather
    // than throwing, because an export button has nowhere useful to send an exception.
    async function VghLantern__PdfWriter__Document__Write(pages, options) {
        if (VghLantern__PdfWriter__IsWriting) return false;

        var JsPdf  =  (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
        if (!JsPdf) {
            VghLantern__PdfWriter__ReportFailure(VghLantern__PdfWriter__Message('LibraryUnavailable'));
            return false;
        }

        var usable  =  (pages || []).filter(VghLantern__PdfWriter__IsUsablePage);
        if (!usable.length) {
            VghLantern__PdfWriter__ReportFailure(VghLantern__PdfWriter__Message('NothingToWrite'));
            return false;
        }

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var docCfg        =  VghLantern__PdfWriter__Block('Document');
        var DOC_LABEL     =  'Na__PdfWriter__Config.json -> VghLantern__PdfWriter__Config__Document';
        var settings      =  options || {};

        VghLantern__PdfWriter__IsWriting  =  true;

        try {
            var doc  =  new JsPdf({
                unit        : ConfigLoader.VghLantern__ConfigLoader__RequireString(docCfg,  'Unit',     DOC_LABEL),
                orientation : VghLantern__PdfWriter__OrientationOf(usable[0]),
                format      : [usable[0].WidthMm, usable[0].HeightMm],
                compress    : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(docCfg, 'Compress', DOC_LABEL)
            });

            var footerFlags   =  {};                                           // <-- Physical page number -> prints a footer
            var pageNumber    =  1;
            var i, page, context;

            for (i = 0; i < usable.length; i++) {
                page  =  usable[i];

                if (i > 0) {
                    doc.addPage([page.WidthMm, page.HeightMm], VghLantern__PdfWriter__OrientationOf(page));
                    pageNumber++;
                }

                footerFlags[pageNumber]  =  VghLantern__PdfWriter__Document__KindShowsFooter(page.Kind);

                context  =  VghLantern__PdfWriter__BuildPageContext(doc, page, pageNumber, footerFlags);
                await page.Paint(doc, context);

                pageNumber  =  context.PageNumber;                             // <-- The painter may have flowed onto further pages
            }

            VghLantern__PdfWriter__StampFooters(doc, footerFlags);

            if (settings.Properties) doc.setProperties(settings.Properties);

            doc.save(settings.Filename ||
                (ConfigLoader.VghLantern__ConfigLoader__RequireString(docCfg, 'FallbackFilename', DOC_LABEL) + '.pdf'));

            VghLantern__PdfWriter__ReportSuccess(settings.SuccessMessage);
            return true;

        } catch (writeError) {
            console.error('[VghLantern__PdfWriter__Document] Write failed:', writeError);
            VghLantern__PdfWriter__ReportFailure(VghLantern__PdfWriter__Message('WriteFailed'));
            return false;

        } finally {
            VghLantern__PdfWriter__IsWriting  =  false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether a Write Is Already in Flight
    // ------------------------------------------------------------
    function VghLantern__PdfWriter__Document__IsWriting() {
        return VghLantern__PdfWriter__IsWriting;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__PdfWriter__Document__Write          : VghLantern__PdfWriter__Document__Write,
        VghLantern__PdfWriter__Document__IsWriting      : VghLantern__PdfWriter__Document__IsWriting,
        VghLantern__PdfWriter__Document__FooterConfig   : VghLantern__PdfWriter__Document__FooterConfig,
        VghLantern__PdfWriter__Document__KindShowsFooter: VghLantern__PdfWriter__Document__KindShowsFooter
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__PdfWriter__Document  =  VghLantern__PdfWriter__Document;
