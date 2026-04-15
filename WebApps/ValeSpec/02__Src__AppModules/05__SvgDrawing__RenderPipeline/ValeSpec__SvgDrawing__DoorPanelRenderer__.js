/* =============================================================================
   VALESPEC - SVG DRAWING DOOR PANEL RENDERER
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__DoorPanelRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - DoorPanelRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draws door panels within the frame based on door type
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Renders filled rectangles for single, double, or bifold-style paired panel configurations
   - Double/Bifold: two panels each width/2, meeting in the centre
   - Single Door: one panel filling the full frame interior
   - Uses Door Handing to assign panel metadata for swing, handles, and role labels
   - Returns both SVG markup and a panels metadata array for downstream use
   - Panel origins are bottom-left corner in mm coordinate space

   ============================================================================= */

// =============================================================================
// REGION | Door Panel Renderer Module
// =============================================================================

const ValeSpec__SvgDrawing__DoorPanelRenderer = (function() {

    // MODULE VARIABLES | Module Dependencies
    // ------------------------------------------------------------
    var ValeSpec__DoorPanelRenderer__CoordsRef  =  null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Lazy-Load CoordHelpers Reference
    // ------------------------------------------------------------
    function ValeSpec__DoorPanelRenderer__GetCoords() {
        if (!ValeSpec__DoorPanelRenderer__CoordsRef) ValeSpec__DoorPanelRenderer__CoordsRef  =  window.ValeSpec__SvgDrawing__CoordHelpers;
        return ValeSpec__DoorPanelRenderer__CoordsRef;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine if Door Type Uses Paired Panels
    // ------------------------------------------------------------
    function ValeSpec__DoorPanelRenderer__IsDoubleDoor(doorType) {
        if (!doorType) return false;
        var lower  =  doorType.toLowerCase();
        return lower.indexOf('double') !== -1 || lower.indexOf('bifold') !== -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalise Door Handing Value
    // ------------------------------------------------------------
    function ValeSpec__DoorPanelRenderer__NormaliseHanding(doorHanding) {
        return doorHanding === 'Right' ? 'Right' : 'Left';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render a Single Panel Rectangle
    // ------------------------------------------------------------
    function ValeSpec__DoorPanelRenderer__RenderPanelRect(x, y, w, h, config) {
        var fillColor    =  config['SvgDrawing__Panel__Config__FillColor']     || '#e8e4df';
        var strokeColor  =  config['SvgDrawing__Panel__Config__StrokeColor']   || '#172b3a';
        var strokeWidth  =  config['SvgDrawing__Panel__Config__StrokeWidthMm'] || 2;

        return ValeSpec__DoorPanelRenderer__GetCoords().ValeSpec__CoordHelpers__SvgRect(x, y, w, h, fillColor, strokeColor, strokeWidth);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Double Door Panels
    // ------------------------------------------------------------
    function ValeSpec__DoorPanelRenderer__BuildDoublePanels(width_mm, height_mm, config, doorHanding) {
        var halfWidth  =  width_mm / 2;                    // <-- Each panel is half the frame width
        var handing    =  ValeSpec__DoorPanelRenderer__NormaliseHanding(doorHanding);
        var leftRole   =  handing === 'Right' ? 'slave'  : 'master';
        var rightRole  =  handing === 'Right' ? 'master' : 'slave';
        var leftHandleHand   =  handing === 'Right' ? 'right' : 'left';   // <-- Right handing swaps handle positioning only
        var rightHandleHand  =  handing === 'Right' ? 'left'  : 'right';  // <-- Preserve panel swing side for opening symbols
        var svg        =  '';
        var panels     =  [];

        svg += ValeSpec__DoorPanelRenderer__RenderPanelRect(0, 0, halfWidth, height_mm, config);
        panels.push({
            x           : 0,
            y           : 0,
            width       : halfWidth,
            height      : height_mm,
            hand        : 'left',                          // <-- Swing metadata remains panel-side based
            handleHand  : leftHandleHand,                 // <-- Handle orientation can flip by handing
            panelKey    : 'left',
            role        : leftRole
        });

        svg += ValeSpec__DoorPanelRenderer__RenderPanelRect(halfWidth, 0, halfWidth, height_mm, config);
        panels.push({
            x           : halfWidth,
            y           : 0,
            width       : halfWidth,
            height      : height_mm,
            hand        : 'right',                         // <-- Swing metadata remains panel-side based
            handleHand  : rightHandleHand,                // <-- Handle orientation can flip by handing
            panelKey    : 'right',
            role        : rightRole
        });

        return { svg: svg, panels: panels };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Single Door Panel
    // ------------------------------------------------------------
    function ValeSpec__DoorPanelRenderer__BuildSinglePanel(width_mm, height_mm, config, doorHanding) {
        var handing  =  ValeSpec__DoorPanelRenderer__NormaliseHanding(doorHanding);
        var hand     =  handing === 'Right' ? 'left' : 'right';     // <-- Left handing remains the current single-door orientation
        var svg     =  '';
        var panels  =  [];

        svg += ValeSpec__DoorPanelRenderer__RenderPanelRect(0, 0, width_mm, height_mm, config);
        panels.push({
            x           : 0,
            y           : 0,
            width       : width_mm,
            height      : height_mm,
            hand        : hand,
            handleHand  : hand,
            panelKey    : 'single',
            role        : null
        });

        return { svg: svg, panels: panels };
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Door Panels
    // ------------------------------------------------------------
    function ValeSpec__DoorPanelRenderer__RenderPanels(doorType, width_mm, height_mm, config, doorHanding) {
        var panelConfig  =  config || {};
        var handing      =  ValeSpec__DoorPanelRenderer__NormaliseHanding(doorHanding);

        if (ValeSpec__DoorPanelRenderer__IsDoubleDoor(doorType)) {
            return ValeSpec__DoorPanelRenderer__BuildDoublePanels(width_mm, height_mm, panelConfig, handing);
        }

        return ValeSpec__DoorPanelRenderer__BuildSinglePanel(width_mm, height_mm, panelConfig, handing);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__DoorPanelRenderer__IsDoubleDoor  : ValeSpec__DoorPanelRenderer__IsDoubleDoor,
        ValeSpec__DoorPanelRenderer__RenderPanels  : ValeSpec__DoorPanelRenderer__RenderPanels
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__DoorPanelRenderer  =  ValeSpec__SvgDrawing__DoorPanelRenderer;
