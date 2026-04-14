/* =============================================================================
   VALESPEC - SVG DRAWING IRONMONGERY RENDERER
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__IronmongeryRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - IronmongeryRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Places hardware vector paths onto door panels
   CREATED    : 2026

   DESCRIPTION:
   - Reads HardwareItem__VectorData Paths array from hardware JSON data
   - Creates translated and optionally mirrored <g> groups per panel
   - Right-hand handle: offset x+32mm from panel origin at lever height
   - Left-hand handle: offset x + panelWidth - 64mm, ScaleX=-1 mirror
   - Iterates Line paths and renders each via CoordHelpers svgLine
   - Applies ironmongery stroke colour and width from config

   ============================================================================= */

// =============================================================================
// REGION | Ironmongery Renderer Module
// =============================================================================

const ValeSpec__SvgDrawing__IronmongeryRenderer = (function() {

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


    // HELPER FUNCTION | Render Vector Paths for a Single Hardware Item
    // ------------------------------------------------------------
    function _renderPaths(paths, strokeColor, strokeWidth) {
        var svg  =  '';

        for (var i = 0; i < paths.length; i++) {
            var path  =  paths[i];
            if (path.PathType !== 'Line') continue;    // <-- Only line segments supported

            var sx  =  path.Start_mm.X;                // <-- Start X in local coords
            var sy  =  path.Start_mm.Y;                // <-- Start Y in local coords
            var ex  =  path.End_mm.X;                  // <-- End X in local coords
            var ey  =  path.End_mm.Y;                  // <-- End Y in local coords

            svg += '<line'
                + ' x1="' + sx + '"'
                + ' y1="' + (-sy) + '"'
                + ' x2="' + ex + '"'
                + ' y2="' + (-ey) + '"'
                + ' stroke="'       + strokeColor  + '"'
                + ' stroke-width="' + strokeWidth  + '"'
                + ' />';
        }

        return svg;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Calculate Handle Transform for a Panel
    // ------------------------------------------------------------
    function _calcHandleTransform(panel, leverHeight_mm) {
        var panelSvgY  =  -panel.y - panel.height;    // <-- Y-flip for panel origin

        if (panel.hand === 'left') {
            var offsetX  =  panel.x + panel.width - 64;   // <-- Left-hand: inset 64mm from right edge
            var offsetY  =  panelSvgY + (panel.height - leverHeight_mm);  // <-- Y position from top of panel
            return {
                translate  : 'translate(' + offsetX + ',' + offsetY + ')',
                scale      : ' scale(-1,1)',           // <-- Mirror horizontally for left-hand
                transform  : 'translate(' + offsetX + ',' + offsetY + ') scale(-1,1)'
            };
        }

        var offsetX  =  panel.x + 32;                 // <-- Right-hand: offset 32mm from panel origin
        var offsetY  =  panelSvgY + (panel.height - leverHeight_mm);
        return {
            translate  : 'translate(' + offsetX + ',' + offsetY + ')',
            scale      : '',
            transform  : 'translate(' + offsetX + ',' + offsetY + ')'
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Ironmongery onto Panels
    // ------------------------------------------------------------
    function renderIronmongery(panels, hardwareData, leverHeight_mm, config) {
        if (!panels || !panels.length) return '';
        if (!hardwareData) return '';

        var vectorData  =  hardwareData['HardwareItem__VectorData'];
        if (!vectorData || !vectorData.Paths || !vectorData.Paths.length) return '';

        var ironConfig   =  config || {};
        var strokeColor  =  ironConfig['SvgDrawing__Ironmongery__Config__StrokeColor']   || '#172b3a';
        var strokeWidth  =  ironConfig['SvgDrawing__Ironmongery__Config__StrokeWidthMm'] || 1.2;
        var paths        =  vectorData.Paths;

        var svg  =  '';

        for (var p = 0; p < panels.length; p++) {
            var panel      =  panels[p];
            var handleTfm  =  _calcHandleTransform(panel, leverHeight_mm);

            svg += '<g transform="' + handleTfm.transform + '">';
            svg += _renderPaths(paths, strokeColor, strokeWidth);
            svg += '</g>';
        }

        return svg;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        renderIronmongery  : renderIronmongery
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__IronmongeryRenderer  =  ValeSpec__SvgDrawing__IronmongeryRenderer;
