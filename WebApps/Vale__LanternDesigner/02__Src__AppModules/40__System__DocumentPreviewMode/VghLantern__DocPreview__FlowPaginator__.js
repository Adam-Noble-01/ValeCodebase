/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | FLOW PAGINATOR
   =============================================================================

   FILE       : VghLantern__DocPreview__FlowPaginator__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - FlowPaginator
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Break a flowing document body into page-sized pieces for the preview
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Takes one long body of markup and returns it cut into as many bodies as it needs
     pages, each measured to fit the page's own printable height.
   - Used by every flowing page kind in Preview and Send: the welcome letter, the
     specification and the terms. The drawing sheet does not come through here - it is
     one fixed sheet, not flowing content.
   - Measures in a detached element at the page's true millimetre body width, before
     the preview's scale transform, so what is measured is what is printed.

   -----------------------------------------------------------------------------

   WHY THIS EXISTS:
   The preview used to put a whole flowing document inside one page shell and let it
   overflow the paper. A forty-clause terms document then ran off the bottom of the
   sheet and kept going, so the preview showed neither where the pages break nor how
   many there are - which is most of what a preview is for. The PDF painters have
   always flowed properly through the writer's AddOverflowPage; this is the screen
   catching up with them.

   WHY IT SPLITS RECURSIVELY RATHER THAN BLOCK BY BLOCK:
   A terms section is one element containing a heading and forty list items. Treated
   as an indivisible block it would be pushed whole onto a page it cannot fit on and
   overflow exactly as before. When a block is taller than a page, the paginator
   descends into it and distributes its children instead, cloning the wrapper so each
   piece keeps its own styling. Two levels of that is enough for section, list, item.

   WHY MEASUREMENT IS DONE ONCE PER RENDER:
   The measuring host is created, filled, read and removed inside one call. Layout is
   read in a single pass over the children rather than re-measuring after each move,
   so a sixty-clause document costs one forced layout rather than sixty.

   ============================================================================= */

// =============================================================================
// REGION | Document Preview Flow Paginator Module
// =============================================================================

const VghLantern__DocPreview__FlowPaginator = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Measuring Host
    // ------------------------------------------------------------
    // Positioned off-screen rather than hidden with display:none, because an element
    // that is not displayed has no layout and therefore no measurable height.
    //
    // The inner element carries the real page body's class. That matters: the page
    // body is a flex column with a gap, and measuring the same content in a plain
    // block div gives a different answer. Measuring inside a copy of the box the
    // content will actually occupy is the only way the break lands where it is drawn.
    const MEASURE_HOST_ID   =  'VghLantern__DocPreview__MeasureHost';
    const MEASURE_STYLE     =  'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;';
    const CSS_PAGE_BODY     =  'VghLantern__DocPreview__PageBody';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Unit Conversion and Guards
    // ------------------------------------------------------------
    // A page authored in millimetres lays out at the CSS reference of 96dpi. Not a
    // design value: the conversion between the two units the page is described in.
    const CSS_PIXELS_PER_MM  =  96 / 25.4;

    const MAX_PAGES          =  200;                                          // <-- Runaway guard; a real document is nowhere near this
    const MIN_USABLE_PX      =  40;                                           // <-- Below this a page could not hold even one line
    const RECURSION_LIMIT    =  2;                                            // <-- section -> list -> item, which is as deep as the content goes
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Label
    // ------------------------------------------------------------
    const PDF_LABEL  =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Measuring Host
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create the Detached Measuring Host at the Page Body Width
    // ------------------------------------------------------------
    // Width is set in millimetres because that is the unit the page is authored in,
    // so the browser resolves it to exactly the pixels the real page body will get.
    // Returns the inner element - the one carrying the page body class - because that
    // is the box the content is measured inside.
    function VghLantern__FlowPaginator__CreateHost(page) {
        var outer  =  document.createElement('div');
        var inner  =  document.createElement('div');

        outer.id            =  MEASURE_HOST_ID;
        outer.style.cssText =  MEASURE_STYLE + 'width:' + page.BodyWidthMm + 'mm;';

        inner.className     =  CSS_PAGE_BODY;

        outer.appendChild(inner);
        document.body.appendChild(outer);

        return inner;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Printable Height of One Page in Pixels
    // ------------------------------------------------------------
    // The same three numbers the PDF painters reserve: the paper height less both
    // margins less the band kept clear for the footer. Reading the footer reserve from
    // the same config key the painters read is what makes the screen break where the
    // file breaks.
    function VghLantern__FlowPaginator__UsableHeightPx(page) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var docCfg        =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
        var pdfCfg        =  docCfg['VghLantern__DocPreview__Config__Pdf'] || {};

        var footerMm  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'FooterReserveMm', PDF_LABEL);
        var usableMm  =  page.HeightMm - (page.MarginMm * 2) - footerMm;

        return Math.max(MIN_USABLE_PX, usableMm * CSS_PIXELS_PER_MM);
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Measure a Child's Full Vertical Footprint
    // ------------------------------------------------------------
    // offsetHeight excludes margins, and the gap between two paragraphs is a margin,
    // so a run of blocks measured without them accumulates short and the last block on
    // each page overflows. Margins are read from the computed style and added back.
    function VghLantern__FlowPaginator__ChildHeightPx(element) {
        var computed  =  window.getComputedStyle(element);
        return element.offsetHeight +
               (parseFloat(computed.marginTop)    || 0) +
               (parseFloat(computed.marginBottom) || 0);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Splitting
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Distribute a Set of Measured Children Across Pages
    // ------------------------------------------------------------
    // Returns an array of arrays of nodes. A child that fits goes on the current page;
    // one that does not starts a new page; one that cannot fit on any page is handed
    // to the caller to break open.
    //
    // Nodes are returned rather than markup so the caller can clone them into whatever
    // wrapper the level needs, which is what makes the recursion work.
    function VghLantern__FlowPaginator__Distribute(children, heights, usableHeightPx, splitOversized) {
        var pages    =  [];
        var current  =  [];
        var used     =  0;
        var i, child, height, pieces, p;

        for (i = 0; i < children.length; i++) {
            child   =  children[i];
            height  =  heights[i];

            // Taller than an entire page. It has to be broken open or it will overflow
            // whichever page it lands on, which is the bug this module exists to fix.
            if (height > usableHeightPx && splitOversized) {
                pieces  =  splitOversized(child, usableHeightPx - used, usableHeightPx);

                if (pieces && pieces.length) {
                    for (p = 0; p < pieces.length; p++) {
                        if (p === 0 && pieces[p].FitsRemaining) {
                            current.push(pieces[p].Node);
                            used  +=  pieces[p].HeightPx;
                            continue;
                        }

                        if (current.length) pages.push(current);
                        current  =  [pieces[p].Node];
                        used     =  pieces[p].HeightPx;
                    }
                    continue;
                }
            }

            if (used + height > usableHeightPx && current.length) {
                pages.push(current);
                current  =  [];
                used     =  0;
            }

            current.push(child);
            used  +=  height;

            if (pages.length > MAX_PAGES) break;                              // <-- Runaway guard
        }

        if (current.length) pages.push(current);
        return pages;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Break One Oversized Block Open Into Page-Sized Clones
    // ------------------------------------------------------------
    // The wrapper is cloned empty for each piece so a split terms section keeps its
    // heading styling, its border and its critical colouring on every page it runs
    // onto. Depth is bounded because the content is only ever section, list, item.
    function VghLantern__FlowPaginator__SplitBlock(host, element, remainingPx, usableHeightPx, depth) {
        if (depth > RECURSION_LIMIT) return null;

        var children  =  Array.prototype.filter.call(element.children, function(node) {
            return node.nodeType === 1;
        });
        if (children.length < 2) return null;                                  // <-- Nothing to divide it at

        var heights  =  children.map(VghLantern__FlowPaginator__ChildHeightPx);

        var grouped  =  VghLantern__FlowPaginator__Distribute(
            children, heights, usableHeightPx,
            function(child, childRemaining, childUsable) {
                return VghLantern__FlowPaginator__SplitBlock(host, child, childRemaining, childUsable, depth + 1);
            }
        );
        if (grouped.length < 2) return null;

        // HELPER | Clone the wrapper empty and refill it with one page's children
        function buildPiece(group) {
            var shell  =  element.cloneNode(false);
            var n;
            for (n = 0; n < group.length; n++) shell.appendChild(group[n].cloneNode(true));
            return shell;
        }

        var pieces  =  [];
        var g, shell, height;

        for (g = 0; g < grouped.length; g++) {
            shell  =  buildPiece(grouped[g]);

            // Measured in the host so each piece's real height is known, including the
            // wrapper's own padding and borders, which the children's heights exclude.
            host.appendChild(shell);
            height  =  VghLantern__FlowPaginator__ChildHeightPx(shell);
            host.removeChild(shell);

            pieces.push({
                Node          : shell,
                HeightPx      : height,
                FitsRemaining : (g === 0 && height <= remainingPx)
            });
        }

        return pieces;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Split a Flowing Body Into One Body per Page
    // ------------------------------------------------------------
    // Returns an array of markup strings, one per page, always at least one. A body
    // that fits on a single page returns unchanged, so short documents cost one
    // measurement and no cloning at all.
    function VghLantern__DocPreview__FlowPaginator__Split(bodyHtml, page) {
        if (!bodyHtml || !page) return [bodyHtml || ''];

        var usableHeightPx  =  VghLantern__FlowPaginator__UsableHeightPx(page);
        var host            =  VghLantern__FlowPaginator__CreateHost(page);

        try {
            host.innerHTML  =  bodyHtml;

            if (host.offsetHeight <= usableHeightPx) return [bodyHtml];        // <-- Fits as it stands

            // The renderers wrap their whole document in one container element. The
            // page break has to happen among that container's children, not around it,
            // so it is unwrapped here and re-wrapped per page below.
            var wrapper   =  (host.children.length === 1) ? host.children[0] : null;
            var container =  wrapper || host;

            var children  =  Array.prototype.filter.call(container.children, function(node) {
                return node.nodeType === 1;
            });
            if (!children.length) return [bodyHtml];

            var heights  =  children.map(VghLantern__FlowPaginator__ChildHeightPx);

            var grouped  =  VghLantern__FlowPaginator__Distribute(
                children, heights, usableHeightPx,
                function(child, remaining, usable) {
                    return VghLantern__FlowPaginator__SplitBlock(host, child, remaining, usable, 1);
                }
            );
            if (grouped.length < 2) return [bodyHtml];

            var bodies  =  [];
            var g, shell, n;

            for (g = 0; g < grouped.length; g++) {
                shell  =  wrapper ? wrapper.cloneNode(false) : document.createElement('div');
                for (n = 0; n < grouped[g].length; n++) shell.appendChild(grouped[g][n].cloneNode(true));
                bodies.push(shell.outerHTML);
            }

            return bodies;

        } catch (splitError) {
            // A document that could not be split is still a document. Returning it
            // whole shows the content overflowing rather than showing nothing at all.
            console.warn('[VghLantern__DocPreview__FlowPaginator] Could not paginate this body:', splitError);
            return [bodyHtml];

        } finally {
            // The host returned above is the inner element, so the off-screen wrapper
            // that actually sits in the document is its parent.
            var mounted  =  document.getElementById(MEASURE_HOST_ID);
            if (mounted && mounted.parentNode) mounted.parentNode.removeChild(mounted);
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DocPreview__FlowPaginator__Split : VghLantern__DocPreview__FlowPaginator__Split
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__FlowPaginator  =  VghLantern__DocPreview__FlowPaginator;
