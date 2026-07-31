/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | VIEWPORT FRAME
   =============================================================================

   FILE       : VghLantern__DrawingEditor__ViewportFrame__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - ViewportFrame
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the positioned slots that hold each view on a sheet
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds the box and the empty drawable body for one view slot, positioned from
     the paper rectangles SheetPdfLayout solved. The frame's border and caption are
     not built here - SheetChrome draws those onto both surfaces.
   - Computes the paper-space size of every frame from the sheet size, margins,
     titleblock height and grid gutters, so the scale manager can be asked whether a
     view fits before anything is drawn.
   - Knows nothing about what goes inside a frame. ViewPlacement fills the bodies.

   -----------------------------------------------------------------------------

   WHY FRAME SIZES ARE COMPUTED IN PAPER MILLIMETRES:
   The sheet is laid out in real paper millimetres and only scaled to pixels for
   display. That means the same numbers drive the screen sheet and the PDF, so what
   fits on screen fits on paper. A pixel-first layout would have to be re-derived at
   export time and would inevitably drift.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Viewport Frame Module
// =============================================================================

const VghLantern__DrawingEditor__ViewportFrame = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names and Data Attributes
    // ------------------------------------------------------------
    const CSS_FRAME        =  'VghLantern__Sheet__Frame';
    const CSS_FRAME_BODY   =  'VghLantern__Sheet__FrameBody';

    const ATTR_SLOT_KEY    =  'data-vgh-slot';
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Drawing Editor Config Root
    // ------------------------------------------------------------
    function VghLantern__ViewportFrame__DrawingConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Sheet Config Block
    // ------------------------------------------------------------
    function VghLantern__ViewportFrame__SheetConfig() {
        return VghLantern__ViewportFrame__DrawingConfig()['VghLantern__DrawingEditor__Config__Sheet'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__ViewportFrame__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Paper Space Measurement
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Paper Size of a Sheet
    // ------------------------------------------------------------
    // Config lists sizes landscape (long edge first); portrait swaps them here so a
    // size is only described once.
    function VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm(sheetSizeKey, orientation) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var sheetCfg     =  VghLantern__ViewportFrame__SheetConfig();
        var sizes        =  sheetCfg.SheetSizes || {};
        var resolvedKey  =  sheetSizeKey || sheetCfg.DefaultSheetSize;
        var entry        =  sizes[resolvedKey];

        if (!entry) return null;

        var resolvedOrientation  =  orientation || ConfigLoader.VghLantern__ConfigLoader__RequireString(
            sheetCfg, 'DefaultOrientation', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__Sheet');
        var isPortrait           =  resolvedOrientation === 'portrait';

        return {
            Key         : resolvedKey,
            Label       : entry.Label || resolvedKey,
            Orientation : resolvedOrientation,
            WidthMm     : isPortrait ? entry.HeightMm : entry.WidthMm,
            HeightMm    : isPortrait ? entry.WidthMm  : entry.HeightMm
        };
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Frame Markup
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Frame Markup for One Solved Slot Placement
    // ------------------------------------------------------------
    // The frame carries no chrome of its own any more. Its border, its caption strip
    // and the caption text are drawn by SheetChrome into the sheet's SVG overlay, so
    // the screen and the PDF paint identical frame furniture from one description.
    // What is left here is a positioned box and the drawable body inside it, placed
    // straight from the solved paper rectangles.
    function VghLantern__DrawingEditor__ViewportFrame__BuildMarkup(placement, pixelsPerMm) {
        if (!placement || !placement.Slot) return '';

        var slot     =  placement.Slot;
        var frame    =  placement.Frame;
        var body     =  placement.Body;
        var pxPerMm  =  (typeof pixelsPerMm === 'number' && pixelsPerMm > 0) ? pixelsPerMm : 3.2;

        var frameStyle  =  ' style="left:'   + (frame.X * pxPerMm)        + 'px;' +
                                  'top:'     + (frame.Y * pxPerMm)        + 'px;' +
                                  'width:'   + (frame.WidthMm * pxPerMm)  + 'px;' +
                                  'height:'  + (frame.HeightMm * pxPerMm) + 'px"';

        var bodyStyle   =  ' style="left:'   + ((body.X - frame.X) * pxPerMm) + 'px;' +
                                  'top:'     + ((body.Y - frame.Y) * pxPerMm) + 'px;' +
                                  'width:'   + (body.WidthMm  * pxPerMm)      + 'px;' +
                                  'height:'  + (body.HeightMm * pxPerMm)      + 'px"';

        return '<div class="' + CSS_FRAME + '" ' + ATTR_SLOT_KEY + '="' +
               VghLantern__ViewportFrame__Escape(slot.Key) + '"' + frameStyle + '>' +
               '<div class="' + CSS_FRAME_BODY + '"' + bodyStyle + '></div>' +
               '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Find the Drawable Body Element of a Rendered Slot
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ViewportFrame__FindBody(sheetElement, slotKey) {
        if (!sheetElement) return null;

        var frame  =  sheetElement.querySelector('[' + ATTR_SLOT_KEY + '="' + slotKey + '"]');
        return frame ? frame.querySelector('.' + CSS_FRAME_BODY) : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm     : VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm,
        VghLantern__DrawingEditor__ViewportFrame__BuildMarkup     : VghLantern__DrawingEditor__ViewportFrame__BuildMarkup,
        VghLantern__DrawingEditor__ViewportFrame__FindBody        : VghLantern__DrawingEditor__ViewportFrame__FindBody,
        VghLantern__DrawingEditor__ViewportFrame__SlotAttribute   : ATTR_SLOT_KEY
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__ViewportFrame  =  VghLantern__DrawingEditor__ViewportFrame;
