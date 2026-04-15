/* =============================================================================
   VALESPEC - SVG DRAWING DOOR FRAME RENDERER
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__DoorFrameRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - DoorFrameRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draws the outer door frame rectangle with drop shadow
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Renders a single rectangle from (0,0) to (width_mm, height_mm)
   - Applies double stroke weight from SvgDrawing__Frame__Config
   - Includes an SVG <filter> definition for configurable drop shadow
   - Uses CoordHelpers svgRect for Y-flip coordinate conversion

   ============================================================================= */

// =============================================================================
// REGION | Door Frame Renderer Module
// =============================================================================

const ValeSpec__SvgDrawing__DoorFrameRenderer = (function() {

    // MODULE VARIABLES | Module Dependencies
    // ------------------------------------------------------------
    var ValeSpec__DoorFrameRenderer__CoordsRef  =  null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Lazy-Load CoordHelpers Reference
    // ------------------------------------------------------------
    function ValeSpec__DoorFrameRenderer__GetCoords() {
        if (!ValeSpec__DoorFrameRenderer__CoordsRef) ValeSpec__DoorFrameRenderer__CoordsRef  =  window.ValeSpec__SvgDrawing__CoordHelpers;
        return ValeSpec__DoorFrameRenderer__CoordsRef;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build SVG Drop Shadow Filter Definition
    // ------------------------------------------------------------
    function ValeSpec__DoorFrameRenderer__BuildShadowFilter(config) {
        var blur    =  config['SvgDrawing__Frame__Config__ShadowBlurMm']    || 8;   // <-- Gaussian blur radius
        var offset  =  config['SvgDrawing__Frame__Config__ShadowOffsetMm']  || 3;   // <-- Shadow offset distance
        var color   =  config['SvgDrawing__Frame__Config__ShadowColor']     || 'rgba(0,0,0,0.20)';

        var svg  =  '';
        svg += '<defs>';
        svg +=   '<filter id="ValeSpec__SvgDrawing__DropShadow" x="-20%" y="-20%" width="140%" height="140%">';
        svg +=     '<feDropShadow dx="' + offset + '" dy="' + offset + '" stdDeviation="' + blur + '" flood-color="' + color + '" flood-opacity="1" />';
        svg +=   '</filter>';
        svg += '</defs>';

        return svg;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Outer Door Frame
    // ------------------------------------------------------------
    function ValeSpec__DoorFrameRenderer__RenderFrame(width_mm, height_mm, config) {
        var frameConfig   =  config || {};
        var strokeWidth   =  (frameConfig['SvgDrawing__Frame__Config__StrokeWidthMm'] || 4) * 2;  // <-- Double stroke weight for frame
        var strokeColor   =  frameConfig['SvgDrawing__Frame__Config__StrokeColor']    || '#172b3a';

        var svg  =  '';
        svg += ValeSpec__DoorFrameRenderer__BuildShadowFilter(frameConfig);
        svg += '<rect'
            + ' x="'            + 0              + '"'
            + ' y="'            + (-height_mm)   + '"'
            + ' width="'        + width_mm       + '"'
            + ' height="'       + height_mm      + '"'
            + ' fill="none"'
            + ' stroke="'       + strokeColor    + '"'
            + ' stroke-width="' + strokeWidth    + '"'
            + ' filter="url(#ValeSpec__SvgDrawing__DropShadow)"'
            + ' />';

        return svg;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__DoorFrameRenderer__RenderFrame  : ValeSpec__DoorFrameRenderer__RenderFrame
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__DoorFrameRenderer  =  ValeSpec__SvgDrawing__DoorFrameRenderer;
