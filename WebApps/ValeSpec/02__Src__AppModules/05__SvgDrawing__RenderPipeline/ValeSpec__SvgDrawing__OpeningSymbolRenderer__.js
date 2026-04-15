/* =============================================================================
   VALESPEC - SVG DRAWING OPENING SYMBOL RENDERER
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__OpeningSymbolRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - OpeningSymbolRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draws door opening direction symbols on panel elevations
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Renders two grey dashed lines per operable panel forming a triangle
   - Both lines start at handle-side corners and converge at hinge-stile midpoint
   - Follows standard architectural elevation convention for door swings
   - Renders grey dotted X markers on fixed (non-opening) panels
   - Fixed X runs both diagonals corner-to-corner across the panel
   - Uses CoordHelpers DataToSvg for Y-flip coordinate conversion
   - Config-driven stroke colours, widths, and dash patterns

   ============================================================================= */

// =============================================================================
// REGION | Opening Symbol Renderer Module
// =============================================================================

const ValeSpec__SvgDrawing__OpeningSymbolRenderer = (function() {

    // MODULE VARIABLES | Module Dependencies
    // ------------------------------------------------------------
    var ValeSpec__OpeningSymbolRenderer__CoordsRef  =  null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Lazy-Load CoordHelpers Reference
    // ------------------------------------------------------------
    function ValeSpec__OpeningSymbolRenderer__GetCoords() {
        if (!ValeSpec__OpeningSymbolRenderer__CoordsRef) ValeSpec__OpeningSymbolRenderer__CoordsRef  =  window.ValeSpec__SvgDrawing__CoordHelpers;
        return ValeSpec__OpeningSymbolRenderer__CoordsRef;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Dashed SVG Line with Y-Flip
    // ------------------------------------------------------------
    function ValeSpec__OpeningSymbolRenderer__DashedLine(x1, y1, x2, y2, stroke, strokeWidth, dashArray) {
        var Coords  =  ValeSpec__OpeningSymbolRenderer__GetCoords();
        var p1      =  Coords.ValeSpec__CoordHelpers__DataToSvg(x1, y1);
        var p2      =  Coords.ValeSpec__CoordHelpers__DataToSvg(x2, y2);

        return '<line'
            + ' x1="'              + p1.x        + '"'
            + ' y1="'              + p1.y        + '"'
            + ' x2="'              + p2.x        + '"'
            + ' y2="'              + p2.y        + '"'
            + ' stroke="'          + (stroke      || '#888') + '"'
            + ' stroke-width="'    + (strokeWidth || 2)      + '"'
            + ' stroke-dasharray="' + (dashArray  || '10,6') + '"'
            + ' fill="none"'
            + ' />';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Swing Triangle for an Operable Panel
    // ------------------------------------------------------------
    function ValeSpec__OpeningSymbolRenderer__RenderSwingTriangle(panel, config) {
        var strokeColor  =  config['SvgDrawing__Opening__Config__SwingStrokeColor']   || '#888888';
        var strokeWidth  =  config['SvgDrawing__Opening__Config__SwingStrokeWidthMm'] || 2.5;
        var dashArray    =  config['SvgDrawing__Opening__Config__SwingDashArray']      || '18,10';

        var apexX, apexY;
        var handleBotX, handleBotY, handleTopX, handleTopY;

        var hingeMidY  =  panel.y + (panel.height / 2);  // <-- Midpoint of hinge stile

        if (panel.hand === 'left') {
            apexX       =  panel.x;                       // <-- Apex: centre of left (hinge) stile
            apexY       =  hingeMidY;
            handleBotX  =  panel.x + panel.width;         // <-- Handle side: bottom-right corner
            handleBotY  =  panel.y;
            handleTopX  =  panel.x + panel.width;         // <-- Handle side: top-right corner
            handleTopY  =  panel.y + panel.height;
        } else {
            apexX       =  panel.x + panel.width;         // <-- Apex: centre of right (hinge) stile
            apexY       =  hingeMidY;
            handleBotX  =  panel.x;                       // <-- Handle side: bottom-left corner
            handleBotY  =  panel.y;
            handleTopX  =  panel.x;                       // <-- Handle side: top-left corner
            handleTopY  =  panel.y + panel.height;
        }

        var svg  =  '';
        svg += ValeSpec__OpeningSymbolRenderer__DashedLine(handleBotX, handleBotY, apexX, apexY, strokeColor, strokeWidth, dashArray);
        svg += ValeSpec__OpeningSymbolRenderer__DashedLine(handleTopX, handleTopY, apexX, apexY, strokeColor, strokeWidth, dashArray);
        return svg;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Fixed X Marker for a Non-Opening Panel
    // ------------------------------------------------------------
    function ValeSpec__OpeningSymbolRenderer__RenderFixedX(panel, config) {
        var strokeColor  =  config['SvgDrawing__Opening__Config__FixedStrokeColor']   || '#888888';
        var strokeWidth  =  config['SvgDrawing__Opening__Config__FixedStrokeWidthMm'] || 2;
        var dashArray    =  config['SvgDrawing__Opening__Config__FixedDashArray']      || '6,6';

        var svg  =  '';

        svg += ValeSpec__OpeningSymbolRenderer__DashedLine(
            panel.x,               panel.y,                     // <-- Bottom-left corner
            panel.x + panel.width, panel.y + panel.height,      // <-- Top-right corner
            strokeColor, strokeWidth, dashArray
        );

        svg += ValeSpec__OpeningSymbolRenderer__DashedLine(
            panel.x + panel.width, panel.y,                     // <-- Bottom-right corner
            panel.x,               panel.y + panel.height,      // <-- Top-left corner
            strokeColor, strokeWidth, dashArray
        );

        return svg;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Opening Symbols for All Panels
    // ------------------------------------------------------------
    function ValeSpec__OpeningSymbolRenderer__RenderOpeningSymbols(panels, openingConfig, svgOpeningConfig) {
        if (!panels || !panels.length) return '';

        var config      =  svgOpeningConfig || {};
        var openCfg     =  openingConfig    || {};
        var fixedPanel  =  openCfg['Assembly__Opening__Config__FixedPanel'] || 'none';
        var svg         =  '';

        for (var i = 0; i < panels.length; i++) {
            var panel  =  panels[i];

            if (fixedPanel !== 'none' && panel.hand === fixedPanel) {
                svg += ValeSpec__OpeningSymbolRenderer__RenderFixedX(panel, config);    // <-- Panel is fixed, draw X
            } else {
                svg += ValeSpec__OpeningSymbolRenderer__RenderSwingTriangle(panel, config);    // <-- Panel opens, draw swing triangle
            }
        }

        return svg;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__OpeningSymbolRenderer__RenderOpeningSymbols  : ValeSpec__OpeningSymbolRenderer__RenderOpeningSymbols
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__OpeningSymbolRenderer  =  ValeSpec__SvgDrawing__OpeningSymbolRenderer;
