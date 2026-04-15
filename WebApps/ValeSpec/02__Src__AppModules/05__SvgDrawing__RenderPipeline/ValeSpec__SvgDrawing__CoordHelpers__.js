/* =============================================================================
   VALESPEC - SVG DRAWING COORDINATE HELPERS
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__CoordHelpers__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - CoordHelpers
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Shared coordinate utilities for mm-based SVG rendering
   CREATED    : 2026

   DESCRIPTION:
   - All renderers work in mm with a bottom-left origin, Y-up coordinate system
   - The Y-flip is applied at render time when generating SVG markup
   - Rectangles: svgY = -y - h  (bottom-left origin to top-left SVG origin)
   - Points:     svgY = -dataY  (invert Y axis for SVG coordinate space)
   - Provides SvgRect, SvgLine, SvgText, and DataToSvg conversion helpers

   ============================================================================= */

// =============================================================================
// REGION | Coordinate Helpers Module
// =============================================================================

const ValeSpec__SvgDrawing__CoordHelpers = (function() {

    // HELPER FUNCTION | Convert Data Coordinates to SVG Coordinates
    // ------------------------------------------------------------
    function ValeSpec__CoordHelpers__DataToSvg(dataX, dataY) {
        return {
            x  :  dataX,        // <-- X passes through unchanged
            y  :  -dataY        // <-- Y-flip: data Y-up to SVG Y-down
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Generate SVG Rect String with Y-Flip
    // ------------------------------------------------------------
    function ValeSpec__CoordHelpers__SvgRect(x, y, w, h, fill, stroke, strokeWidth) {
        var svgX  =  x;         // <-- X origin unchanged
        var svgY  =  -y - h;    // <-- Y-flip for rect: bottom-left to top-left

        return '<rect'
            + ' x="'            + svgX        + '"'
            + ' y="'            + svgY        + '"'
            + ' width="'        + w           + '"'
            + ' height="'       + h           + '"'
            + ' fill="'         + (fill   || 'none') + '"'
            + ' stroke="'       + (stroke || 'none') + '"'
            + ' stroke-width="' + (strokeWidth || 0) + '"'
            + ' />';
    }
    // ------------------------------------------------------------


    // FUNCTION | Generate SVG Line String with Y-Flip
    // ------------------------------------------------------------
    function ValeSpec__CoordHelpers__SvgLine(x1, y1, x2, y2, stroke, strokeWidth) {
        var p1  =  ValeSpec__CoordHelpers__DataToSvg(x1, y1);  // <-- Convert start point
        var p2  =  ValeSpec__CoordHelpers__DataToSvg(x2, y2);  // <-- Convert end point

        return '<line'
            + ' x1="'           + p1.x        + '"'
            + ' y1="'           + p1.y        + '"'
            + ' x2="'           + p2.x        + '"'
            + ' y2="'           + p2.y        + '"'
            + ' stroke="'       + (stroke || '#000') + '"'
            + ' stroke-width="' + (strokeWidth || 1) + '"'
            + ' />';
    }
    // ------------------------------------------------------------


    // FUNCTION | Generate SVG Text Element with Y-Flip
    // ------------------------------------------------------------
    function ValeSpec__CoordHelpers__SvgText(x, y, text, fontSize, fill, anchor, rotation) {
        var pt        =  ValeSpec__CoordHelpers__DataToSvg(x, y);   // <-- Convert anchor point
        var anchorVal =  anchor   || 'middle';                       // <-- Default text-anchor
        var fillVal   =  fill     || '#000';                         // <-- Default text colour
        var sizeVal   =  fontSize || 14;                             // <-- Default font size

        var transform  =  '';
        if (rotation) {
            transform  =  ' transform="rotate(' + rotation + ' ' + pt.x + ' ' + pt.y + ')"';
        }

        return '<text'
            + ' x="'               + pt.x      + '"'
            + ' y="'               + pt.y      + '"'
            + ' font-size="'       + sizeVal   + '"'
            + ' fill="'            + fillVal   + '"'
            + ' text-anchor="'     + anchorVal + '"'
            + ' dominant-baseline="middle"'
            + transform
            + '>' + text + '</text>';
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__CoordHelpers__DataToSvg  : ValeSpec__CoordHelpers__DataToSvg,
        ValeSpec__CoordHelpers__SvgRect    : ValeSpec__CoordHelpers__SvgRect,
        ValeSpec__CoordHelpers__SvgLine    : ValeSpec__CoordHelpers__SvgLine,
        ValeSpec__CoordHelpers__SvgText    : ValeSpec__CoordHelpers__SvgText
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__CoordHelpers  =  ValeSpec__SvgDrawing__CoordHelpers;
