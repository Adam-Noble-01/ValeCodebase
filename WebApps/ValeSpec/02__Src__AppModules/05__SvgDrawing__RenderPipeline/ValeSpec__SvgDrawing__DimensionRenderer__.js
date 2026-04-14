/* =============================================================================
   VALESPEC - SVG DRAWING DIMENSION RENDERER
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__DimensionRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - DimensionRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draws red dimension annotations with architectural tick marks
   CREATED    : 2026

   DESCRIPTION:
   - Width dimension below the frame with horizontal line, ticks, and label
   - Height dimension to the left with vertical line, ticks, and rotated label
   - Architectural 45-degree slash tick marks at line endpoints
   - Responsive font sizing scaled to door height with minimum floor
   - All coordinates in mm, Y-flip applied at render time via CoordHelpers

   ============================================================================= */

// =============================================================================
// REGION | Dimension Renderer Module
// =============================================================================

const ValeSpec__SvgDrawing__DimensionRenderer = (function() {

    // MODULE CONSTANTS | Minimum Font Size
    // ------------------------------------------------------------
    const MIN_FONT_SIZE_MM  =  18;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Module Dependencies
    // ------------------------------------------------------------
    var Coords  =  null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Lazy-Load CoordHelpers Reference
    // ------------------------------------------------------------
    function _coords() {
        if (!Coords) Coords  =  window.ValeSpec__SvgDrawing__CoordHelpers;
        return Coords;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Calculate Responsive Font Size
    // ------------------------------------------------------------
    function _calcFontSize(height_mm, scaleFactor) {
        var scaled  =  height_mm * (scaleFactor || 0.04);  // <-- Scale font to door height
        return Math.max(scaled, MIN_FONT_SIZE_MM);         // <-- Enforce minimum readability
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Architectural Tick Mark at a Point
    // ------------------------------------------------------------
    function _renderTick(cx, cy, tickSize, color, strokeWidth) {
        var half  =  tickSize / 2;
        var x1  =  cx - half;                          // <-- Tick extends 45deg from centre
        var y1  =  cy - half;
        var x2  =  cx + half;
        var y2  =  cy + half;

        return '<line'
            + ' x1="' + x1 + '"'
            + ' y1="' + y1 + '"'
            + ' x2="' + x2 + '"'
            + ' y2="' + y2 + '"'
            + ' stroke="'       + color       + '"'
            + ' stroke-width="' + strokeWidth + '"'
            + ' />';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Width Dimension Below Frame
    // ------------------------------------------------------------
    function _renderWidthDimension(width_mm, height_mm, config) {
        var lineColor    =  config['SvgDrawing__Dimension__Config__LineColor']           || '#cc3333';
        var textColor    =  config['SvgDrawing__Dimension__Config__TextColor']           || '#cc3333';
        var scaleFactor  =  config['SvgDrawing__Dimension__Config__FontSizeScaleFactor'] || 0.04;
        var tickSize     =  config['SvgDrawing__Dimension__Config__TickSizeMm']          || 15;
        var offset       =  config['SvgDrawing__Dimension__Config__OffsetFromFrameMm']   || 60;
        var lineWidth    =  2;

        var fontSize  =  _calcFontSize(height_mm, scaleFactor);
        var dimY      =  -offset;                      // <-- Below the frame origin in data coords
        var svgDimY   =  -dimY;                        // <-- Y-flip for SVG space

        var svg  =  '';

        svg += '<line'
            + ' x1="' + 0        + '" y1="' + svgDimY + '"'
            + ' x2="' + width_mm + '" y2="' + svgDimY + '"'
            + ' stroke="'       + lineColor + '"'
            + ' stroke-width="' + lineWidth + '"'
            + ' />';

        svg += _renderTick(0, svgDimY, tickSize, lineColor, lineWidth);
        svg += _renderTick(width_mm, svgDimY, tickSize, lineColor, lineWidth);

        var labelX  =  width_mm / 2;                   // <-- Centre the label horizontally
        var labelY  =  svgDimY + fontSize + 8;         // <-- Position text below dimension line

        svg += '<text'
            + ' x="'               + labelX    + '"'
            + ' y="'               + labelY    + '"'
            + ' font-size="'       + fontSize  + '"'
            + ' fill="'            + textColor + '"'
            + ' text-anchor="middle"'
            + ' dominant-baseline="middle"'
            + ' data-dimension="width"'
            + ' data-value="'      + Math.round(width_mm) + '"'
            + ' style="cursor:pointer;"'
            + '>' + Math.round(width_mm) + ' mm</text>';

        return svg;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Height Dimension to Left of Frame
    // ------------------------------------------------------------
    function _renderHeightDimension(width_mm, height_mm, config) {
        var lineColor    =  config['SvgDrawing__Dimension__Config__LineColor']           || '#cc3333';
        var textColor    =  config['SvgDrawing__Dimension__Config__TextColor']           || '#cc3333';
        var scaleFactor  =  config['SvgDrawing__Dimension__Config__FontSizeScaleFactor'] || 0.04;
        var tickSize     =  config['SvgDrawing__Dimension__Config__TickSizeMm']          || 15;
        var offset       =  config['SvgDrawing__Dimension__Config__OffsetFromFrameMm']   || 60;
        var lineWidth    =  2;

        var fontSize  =  _calcFontSize(height_mm, scaleFactor);
        var dimX      =  -offset;                      // <-- Left of the frame origin in data coords
        var svgTopY   =  -height_mm;                   // <-- Y-flip: top of frame in SVG space
        var svgBotY   =  0;                            // <-- Y-flip: bottom of frame in SVG space

        var svg  =  '';

        svg += '<line'
            + ' x1="' + dimX + '" y1="' + svgTopY + '"'
            + ' x2="' + dimX + '" y2="' + svgBotY + '"'
            + ' stroke="'       + lineColor + '"'
            + ' stroke-width="' + lineWidth + '"'
            + ' />';

        svg += _renderTick(dimX, svgTopY, tickSize, lineColor, lineWidth);
        svg += _renderTick(dimX, svgBotY, tickSize, lineColor, lineWidth);

        var labelX  =  dimX - fontSize - 8;            // <-- Position text left of dimension line
        var labelY  =  -(height_mm / 2);               // <-- Centre vertically in SVG space
        var rotation  =  -90;                          // <-- Rotate text for vertical reading

        svg += '<text'
            + ' x="'               + labelX     + '"'
            + ' y="'               + labelY     + '"'
            + ' font-size="'       + fontSize   + '"'
            + ' fill="'            + textColor  + '"'
            + ' text-anchor="middle"'
            + ' dominant-baseline="middle"'
            + ' transform="rotate(' + rotation + ' ' + labelX + ' ' + labelY + ')"'
            + ' data-dimension="height"'
            + ' data-value="'      + Math.round(height_mm) + '"'
            + ' style="cursor:pointer;"'
            + '>' + Math.round(height_mm) + ' mm</text>';

        return svg;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render All Dimension Annotations
    // ------------------------------------------------------------
    function renderDimensions(width_mm, height_mm, config) {
        var dimConfig  =  config || {};

        var svg  =  '';
        svg += _renderWidthDimension(width_mm, height_mm, dimConfig);
        svg += _renderHeightDimension(width_mm, height_mm, dimConfig);

        return svg;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        renderDimensions  : renderDimensions
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__DimensionRenderer  =  ValeSpec__SvgDrawing__DimensionRenderer;
