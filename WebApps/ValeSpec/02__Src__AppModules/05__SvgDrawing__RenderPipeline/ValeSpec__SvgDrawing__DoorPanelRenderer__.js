/* =============================================================================
   VALESPEC - SVG DRAWING DOOR PANEL RENDERER
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__DoorPanelRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - DoorPanelRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draws door panels within the frame based on door type
   CREATED    : 2026

   DESCRIPTION:
   - Renders filled rectangles for single or double door configurations
   - Double Doors: two panels each width/2, meeting in the centre
   - Single Door: one panel filling the full frame interior
   - Returns both SVG markup and a panels metadata array for downstream use
   - Panel origins are bottom-left corner in mm coordinate space

   ============================================================================= */

// =============================================================================
// REGION | Door Panel Renderer Module
// =============================================================================

const ValeSpec__SvgDrawing__DoorPanelRenderer = (function() {

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


    // HELPER FUNCTION | Determine if Door Type is Double
    // ------------------------------------------------------------
    function _isDoubleDoor(doorType) {
        if (!doorType) return false;
        var lower  =  doorType.toLowerCase();
        return lower.indexOf('double') !== -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render a Single Panel Rectangle
    // ------------------------------------------------------------
    function _renderPanelRect(x, y, w, h, config) {
        var fillColor    =  config['SvgDrawing__Panel__Config__FillColor']     || '#e8e4df';
        var strokeColor  =  config['SvgDrawing__Panel__Config__StrokeColor']   || '#172b3a';
        var strokeWidth  =  config['SvgDrawing__Panel__Config__StrokeWidthMm'] || 2;

        return _coords().svgRect(x, y, w, h, fillColor, strokeColor, strokeWidth);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Double Door Panels
    // ------------------------------------------------------------
    function _buildDoublePanels(width_mm, height_mm, config) {
        var halfWidth  =  width_mm / 2;                // <-- Each panel is half the frame width
        var svg        =  '';
        var panels     =  [];

        svg += _renderPanelRect(0, 0, halfWidth, height_mm, config);
        panels.push({
            x       : 0,
            y       : 0,
            width   : halfWidth,
            height  : height_mm,
            hand    : 'left'                           // <-- Left panel opens left
        });

        svg += _renderPanelRect(halfWidth, 0, halfWidth, height_mm, config);
        panels.push({
            x       : halfWidth,
            y       : 0,
            width   : halfWidth,
            height  : height_mm,
            hand    : 'right'                          // <-- Right panel opens right
        });

        return { svg: svg, panels: panels };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Single Door Panel
    // ------------------------------------------------------------
    function _buildSinglePanel(width_mm, height_mm, config, hand) {
        var svg     =  '';
        var panels  =  [];

        svg += _renderPanelRect(0, 0, width_mm, height_mm, config);
        panels.push({
            x       : 0,
            y       : 0,
            width   : width_mm,
            height  : height_mm,
            hand    : hand || 'right'                  // <-- Default hand for single doors
        });

        return { svg: svg, panels: panels };
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Door Panels
    // ------------------------------------------------------------
    function renderPanels(doorType, width_mm, height_mm, config) {
        var panelConfig  =  config || {};

        if (_isDoubleDoor(doorType)) {
            return _buildDoublePanels(width_mm, height_mm, panelConfig);
        }

        return _buildSinglePanel(width_mm, height_mm, panelConfig);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        renderPanels  : renderPanels
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__DoorPanelRenderer  =  ValeSpec__SvgDrawing__DoorPanelRenderer;
