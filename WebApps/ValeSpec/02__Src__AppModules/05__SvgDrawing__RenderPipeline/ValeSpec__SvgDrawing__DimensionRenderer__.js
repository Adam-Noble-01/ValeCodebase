/* =============================================================================
   VALESPEC - SVG DRAWING DIMENSION RENDERER
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__DimensionRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - DimensionRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draws red dimension annotations with architectural tick marks
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Width dimension below the frame with horizontal line, ticks, and label
   - Height dimension to the left with vertical line, ticks, and rotated label
   - Perpendicular extension (witness) lines from frame corners past the dimension line
   - Optional inset from each corner so witness lines do not start flush on the frame corner
   - Architectural 45-degree slash tick marks at line endpoints
   - Responsive font sizing scaled to door height with minimum floor
   - All coordinates in mm, Y-flip applied at render time via CoordHelpers

   ============================================================================= */

// =============================================================================
// REGION | Dimension Renderer Module
// =============================================================================

const ValeSpec__SvgDrawing__DimensionRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module State and Shared Dependencies
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Minimum Font Size
    // ------------------------------------------------------------
    const MIN_FONT_SIZE_MM  =  9;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Module Dependencies
    // ------------------------------------------------------------
    var ValeSpec__DimensionRenderer__CoordsRef  =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shared Helper Functions
// -----------------------------------------------------------------------------


    // HELPER FUNCTION | Lazy-Load CoordHelpers Reference
    // ------------------------------------------------------------
    function ValeSpec__DimensionRenderer__GetCoords() {
        if (!ValeSpec__DimensionRenderer__CoordsRef) ValeSpec__DimensionRenderer__CoordsRef  =  window.ValeSpec__SvgDrawing__CoordHelpers;
        return ValeSpec__DimensionRenderer__CoordsRef;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Config Length in mm (avoids string + number concat bugs)
    // ------------------------------------------------------------
    function ValeSpec__DimensionRenderer__ParseMm(value, fallback) {
        var n  =  parseFloat(value);
        return isNaN(n) ? fallback : n;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Calculate Responsive Font Size
    // ------------------------------------------------------------
    function ValeSpec__DimensionRenderer__CalcFontSize(height_mm, scaleFactor) {
        var scaled  =  height_mm * (scaleFactor || 0.02);  // <-- Scale font to door height
        return Math.max(scaled, MIN_FONT_SIZE_MM);         // <-- Enforce minimum readability
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render a Plain Line Segment (extension / witness lines)
    // ------------------------------------------------------------
    function ValeSpec__DimensionRenderer__RenderLineSegment(x1, y1, x2, y2, color, strokeWidth) {
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


    // HELPER FUNCTION | Render Architectural Tick Mark at a Point
    // ------------------------------------------------------------
    function ValeSpec__DimensionRenderer__RenderTick(cx, cy, tickSize, color, strokeWidth) {
        var half  =  tickSize / 2;
        var x1    =  cx - half;                            // <-- Tick extends 45deg from centre
        var y1    =  cy - half;
        var x2    =  cx + half;
        var y2    =  cy + half;

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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Width Dimension Rendering
// -----------------------------------------------------------------------------


    // SUB FUNCTION | Render Width Dimension Below Frame
    // ------------------------------------------------------------
    function ValeSpec__DimensionRenderer__RenderWidthDimension(width_mm, height_mm, config) {
        var lineColor    =  config['SvgDrawing__Dimension__Config__LineColor']           || '#cc3333';
        var textColor    =  config['SvgDrawing__Dimension__Config__TextColor']           || '#cc3333';
        var scaleFactor  =  config['SvgDrawing__Dimension__Config__FontSizeScaleFactor'] || 0.02;
        var tickSize     =  config['SvgDrawing__Dimension__Config__TickSizeMm']          || 15;
        var offset       =  config['SvgDrawing__Dimension__Config__OffsetFromFrameMm']   || 60;
        var pastDimMm    =  ValeSpec__DimensionRenderer__ParseMm(config['SvgDrawing__Dimension__Config__ExtensionPastDimensionLineMm'], 22);
        var cornerInset  =  ValeSpec__DimensionRenderer__ParseMm(config['SvgDrawing__Dimension__Config__ExtensionInsetFromCornerMm'], 10);
        var lineWidth    =  2;

        var fontSize  =  ValeSpec__DimensionRenderer__CalcFontSize(height_mm, scaleFactor);
        var dimY      =  -offset;                          // <-- Below the frame origin in data coords
        var svgDimY   =  -dimY;                            // <-- Y-flip for SVG space
        var dimXLeft    =  0;
        var dimXRight   =  width_mm;

        var svg  =  '';

        // Perpendicular extension lines (vertical): bottom corners down past the horizontal dimension line
        svg += ValeSpec__DimensionRenderer__RenderLineSegment(dimXLeft, cornerInset, dimXLeft, svgDimY + pastDimMm, lineColor, lineWidth);
        svg += ValeSpec__DimensionRenderer__RenderLineSegment(dimXRight, cornerInset, dimXRight, svgDimY + pastDimMm, lineColor, lineWidth);

        svg += '<line'
            + ' x1="' + 0        + '" y1="' + svgDimY + '"'
            + ' x2="' + width_mm + '" y2="' + svgDimY + '"'
            + ' stroke="'       + lineColor + '"'
            + ' stroke-width="' + lineWidth + '"'
            + ' />';

        svg += ValeSpec__DimensionRenderer__RenderTick(0, svgDimY, tickSize, lineColor, lineWidth);
        svg += ValeSpec__DimensionRenderer__RenderTick(width_mm, svgDimY, tickSize, lineColor, lineWidth);

        var labelX  =  width_mm / 2;                       // <-- Centre the label horizontally
        var labelY  =  svgDimY + fontSize + 8;             // <-- Position text below dimension line

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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Height Dimension Rendering
// -----------------------------------------------------------------------------


    // SUB FUNCTION | Render Height Dimension to Left of Frame
    // ------------------------------------------------------------
    function ValeSpec__DimensionRenderer__RenderHeightDimension(width_mm, height_mm, config) {
        var lineColor    =  config['SvgDrawing__Dimension__Config__LineColor']           || '#cc3333';
        var textColor    =  config['SvgDrawing__Dimension__Config__TextColor']           || '#cc3333';
        var scaleFactor  =  config['SvgDrawing__Dimension__Config__FontSizeScaleFactor'] || 0.02;
        var tickSize     =  config['SvgDrawing__Dimension__Config__TickSizeMm']          || 15;
        var offset       =  config['SvgDrawing__Dimension__Config__OffsetFromFrameMm']   || 60;
        var pastDimMm    =  ValeSpec__DimensionRenderer__ParseMm(config['SvgDrawing__Dimension__Config__ExtensionPastDimensionLineMm'], 22);
        var cornerInset  =  ValeSpec__DimensionRenderer__ParseMm(config['SvgDrawing__Dimension__Config__ExtensionInsetFromCornerMm'], 10);
        var lineWidth    =  2;

        var fontSize   =  ValeSpec__DimensionRenderer__CalcFontSize(height_mm, scaleFactor);
        var dimX       =  -offset;                         // <-- Left of the frame origin in data coords
        var svgTopY    =  -height_mm;                      // <-- Y-flip: top of frame in SVG space
        var svgBotY    =  0;                               // <-- Y-flip: bottom of frame in SVG space
        // Height witnesses need their own axis calculations: exact frame-height Y values, independent X extension
        var witnessStartX  =  -cornerInset;                // <-- Shift left to create the same small negative-X gap feel as the lower dim
        var witnessEndX    =  dimX - pastDimMm;            // <-- Continue past the vertical dim line like the width witnesses do
        var witnessTopY    =  svgTopY;                     // <-- Align with true frame top
        var witnessBotY    =  svgBotY;                     // <-- Align with true frame bottom

        var svg  =  '';

        // Horizontal witness: independent X-axis endpoints for the left-side height dimension
        svg += ValeSpec__DimensionRenderer__RenderLineSegment(witnessStartX, witnessTopY, witnessEndX, witnessTopY, lineColor, lineWidth);
        svg += ValeSpec__DimensionRenderer__RenderLineSegment(witnessStartX, witnessBotY, witnessEndX, witnessBotY, lineColor, lineWidth);

        svg += '<line'
            + ' x1="' + dimX + '" y1="' + svgTopY + '"'
            + ' x2="' + dimX + '" y2="' + svgBotY + '"'
            + ' stroke="'       + lineColor + '"'
            + ' stroke-width="' + lineWidth + '"'
            + ' />';

        svg += ValeSpec__DimensionRenderer__RenderTick(dimX, svgTopY, tickSize, lineColor, lineWidth);
        svg += ValeSpec__DimensionRenderer__RenderTick(dimX, svgBotY, tickSize, lineColor, lineWidth);

        var labelX    =  dimX - fontSize - 8;              // <-- Position text left of dimension line
        var labelY    =  -(height_mm / 2);                 // <-- Centre on the full assembly height
        var rotation  =  -90;                              // <-- Rotate text for vertical reading

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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hinge Dimension Rendering
// -----------------------------------------------------------------------------


    // SUB FUNCTION | Render Hinge Dimensions to Right of Frame
    // ------------------------------------------------------------
    function ValeSpec__DimensionRenderer__RenderHingeDimensions(width_mm, height_mm, hingePositions_mm, config) {
        if (!hingePositions_mm || hingePositions_mm.length === 0) return '';
        
        var lineColor    =  '#e69999'; // Less saturated version of #cc3333
        var textColor    =  '#e69999';
        var scaleFactor  =  config['SvgDrawing__Dimension__Config__FontSizeScaleFactor'] || 0.02;
        var tickSize     =  config['SvgDrawing__Dimension__Config__TickSizeMm']          || 15;
        var offset       =  config['SvgDrawing__Dimension__Config__OffsetFromFrameMm']   || 60;
        var pastDimMm    =  ValeSpec__DimensionRenderer__ParseMm(config['SvgDrawing__Dimension__Config__ExtensionPastDimensionLineMm'], 22);
        var cornerInset  =  ValeSpec__DimensionRenderer__ParseMm(config['SvgDrawing__Dimension__Config__ExtensionInsetFromCornerMm'], 10);
        var lineWidth    =  2;

        var fontSize   =  ValeSpec__DimensionRenderer__CalcFontSize(height_mm, scaleFactor) * 0.75; // 25% smaller
        var dimX       =  width_mm + offset;               // <-- Right of the frame
        
        var svg  =  '';
        
        // Sort positions from bottom to top (0 to height_mm)
        var sortedPositions = hingePositions_mm.slice().sort(function(a, b) { return a - b; });
        
        // Add top and bottom of frame to the list of points to dimension between
        var allPoints = [0].concat(sortedPositions).concat([height_mm]);
        
        // Draw the main vertical line
        var svgTopY = -height_mm;
        var svgBotY = 0;
        svg += '<line'
            + ' x1="' + dimX + '" y1="' + svgTopY + '"'
            + ' x2="' + dimX + '" y2="' + svgBotY + '"'
            + ' stroke="'       + lineColor + '"'
            + ' stroke-width="' + lineWidth + '"'
            + ' />';
            
        // Draw witnesses and ticks for each point
        for (var i = 0; i < allPoints.length; i++) {
            var y = allPoints[i];
            var svgY = -y;
            
            // Witness line
            var witnessStartX = width_mm + cornerInset;
            var witnessEndX   = dimX + pastDimMm;
            svg += ValeSpec__DimensionRenderer__RenderLineSegment(witnessStartX, svgY, witnessEndX, svgY, lineColor, lineWidth);
            
            // Tick
            svg += ValeSpec__DimensionRenderer__RenderTick(dimX, svgY, tickSize, lineColor, lineWidth);
        }
        
        // Draw labels between points
        for (var i = 0; i < allPoints.length - 1; i++) {
            var y1 = allPoints[i];
            var y2 = allPoints[i+1];
            var dist = y2 - y1;
            
            var midY = y1 + (dist / 2);
            var svgMidY = -midY;
            
            var labelX    =  dimX + fontSize + 8;              // <-- Position text right of dimension line
            var labelY    =  svgMidY;                          // <-- Centre between the two points
            var rotation  =  -90;                              // <-- Rotate text for vertical reading
            
            svg += '<text'
                + ' x="'               + labelX     + '"'
                + ' y="'               + labelY     + '"'
                + ' font-size="'       + fontSize   + '"'
                + ' fill="'            + textColor  + '"'
                + ' text-anchor="middle"'
                + ' dominant-baseline="middle"'
                + ' transform="rotate(' + rotation + ' ' + labelX + ' ' + labelY + ')"'
                + ' style="cursor:pointer;"'
                + '>' + Math.round(dist) + ' mm</text>';
        }

        return svg;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Render Entry Point and Exports
// -----------------------------------------------------------------------------


    // FUNCTION | Render All Dimension Annotations
    // ------------------------------------------------------------
    function ValeSpec__DimensionRenderer__RenderDimensions(width_mm, height_mm, config) {
        var dimConfig  =  config || {};

        var svg  =  '';
        svg += ValeSpec__DimensionRenderer__RenderWidthDimension(width_mm, height_mm, dimConfig);
        svg += ValeSpec__DimensionRenderer__RenderHeightDimension(width_mm, height_mm, dimConfig);

        return svg;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__DimensionRenderer__RenderDimensions       : ValeSpec__DimensionRenderer__RenderDimensions,
        ValeSpec__DimensionRenderer__RenderHingeDimensions  : ValeSpec__DimensionRenderer__RenderHingeDimensions
    };

})();

// endregion -------------------------------------------------------------------

// endregion ===================================================================

window.ValeSpec__SvgDrawing__DimensionRenderer  =  ValeSpec__SvgDrawing__DimensionRenderer;
