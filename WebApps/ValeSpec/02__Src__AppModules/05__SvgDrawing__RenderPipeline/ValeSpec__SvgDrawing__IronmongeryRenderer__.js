/* =============================================================================
   VALESPEC - SVG DRAWING IRONMONGERY RENDERER
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__IronmongeryRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - IronmongeryRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Places hardware vector paths onto door panels
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Reads HardwareItem__VectorData Paths array from the full hardware data
   - Uses HardwareItem__PanelPlacement transforms from the data file
   - Right-hand handle: placed using RightHand__Transform offsets
   - Left-hand handle: placed using LeftHand__Transform with horizontal mirror
   - All handles are modelled as right-handed; left is mirrored via scale(-1,1)
   - Each handle rendered into a translated <g> group on the panel
   - For double doors: both panels get a handle (dual by default)

   ============================================================================= */

// =============================================================================
// REGION | Ironmongery Renderer Module
// =============================================================================

const ValeSpec__SvgDrawing__IronmongeryRenderer = (function() {

    // HELPER FUNCTION | Render Vector Line Paths as SVG Markup
    // ------------------------------------------------------------
    function ValeSpec__IronmongeryRenderer__RenderPaths(paths, strokeColor, strokeWidth, fillColor) {
        var svg  =  '';

        // Render polygons first so they appear under the linework
        for (var i = 0; i < paths.length; i++) {
            var path  =  paths[i];
            if (path.PathType !== 'Polygon') continue;

            var pointsStr = '';
            for (var j = 0; j < path.Vertices_mm.length; j++) {
                var v = path.Vertices_mm[j];
                pointsStr += v.X + ',' + (-v.Y) + ' ';
            }

            svg += '<polygon'
                + ' points="' + pointsStr.trim() + '"'
                + ' fill="' + (fillColor || 'none') + '"'
                + ' />';
        }

        // Render lines on top
        for (var i = 0; i < paths.length; i++) {
            var path  =  paths[i];
            if (path.PathType !== 'Line') continue;

            var sx  =  path.Start_mm.X;
            var sy  =  -path.Start_mm.Y;               // <-- Y-flip: data Y-up to SVG Y-down
            var ex  =  path.End_mm.X;
            var ey  =  -path.End_mm.Y;                 // <-- Y-flip

            svg += '<line'
                + ' x1="' + sx + '"'
                + ' y1="' + sy + '"'
                + ' x2="' + ex + '"'
                + ' y2="' + ey + '"'
                + ' stroke="'       + strokeColor  + '"'
                + ' stroke-width="' + strokeWidth  + '"'
                + ' stroke-linecap="round"'
                + ' />';
        }

        return svg;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build SVG Transform for Handle Placement on a Panel
    // ------------------------------------------------------------
    function ValeSpec__IronmongeryRenderer__BuildHandleTransform(panel, placement, leverHeight_mm) {
        var panelHand   =  panel && panel.hand ? panel.hand : 'right';                     // <-- Panel side defines hinge/meeting geometry
        var handleHand  =  panel && panel.handleHand ? panel.handleHand : panelHand;       // <-- Handle profile can swap by handing
        var useLeftProfile  =  (handleHand === 'left');
        var isLeftPanel     =  (panelHand === 'left');

        var transform  =  useLeftProfile
            ? placement['LeftHand__Transform']  || {}
            : placement['RightHand__Transform'] || {};

        var magnitudeX_mm  =  Math.abs(transform['OffsetX_mm'] || 0);                      // <-- Profile chooses set-out amount only
        var offsetX_mm     =  isLeftPanel ? -magnitudeX_mm : magnitudeX_mm;                // <-- Panel side chooses inward direction
        var offsetY_mm  =  leverHeight_mm || transform['OffsetY_mm'] || 1000;

        var panelOriginSvgY  =  -panel.y - panel.height;

        if (isLeftPanel) {
            var anchorX  =  panel.x + panel.width + offsetX_mm;
            var anchorY  =  panelOriginSvgY + (panel.height - offsetY_mm);
            return 'translate(' + anchorX + ',' + anchorY + ') scale(-1,1)';
        }

        var anchorX  =  panel.x + offsetX_mm;
        var anchorY  =  panelOriginSvgY + (panel.height - offsetY_mm);
        return 'translate(' + anchorX + ',' + anchorY + ')';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Ironmongery onto Panels
    // ------------------------------------------------------------
    function ValeSpec__IronmongeryRenderer__RenderIronmongery(panels, hardwareData, leverHeight_mm, config, fillColor) {
        if (!panels || !panels.length) return '';
        if (!hardwareData) return '';

        var vectorData  =  hardwareData['HardwareItem__VectorData'];
        if (!vectorData || !vectorData['Paths'] || !vectorData['Paths'].length) return '';

        var placement    =  hardwareData['HardwareItem__PanelPlacement']
                         || (hardwareData['ValeSpec__HardwareItemData'] || {})['HardwareItem__PanelPlacement']
                         || {};

        var ironConfig   =  config || {};
        var strokeColor  =  ironConfig['SvgDrawing__Ironmongery__Config__StrokeColor']   || '#172b3a';
        var strokeWidth  =  ironConfig['SvgDrawing__Ironmongery__Config__StrokeWidthMm'] || 1.2;
        var paths        =  vectorData['Paths'];

        var pathsSvg  =  ValeSpec__IronmongeryRenderer__RenderPaths(paths, strokeColor, strokeWidth, fillColor);

        var svg  =  '';

        for (var p = 0; p < panels.length; p++) {
            var panel      =  panels[p];
            var transform  =  ValeSpec__IronmongeryRenderer__BuildHandleTransform(panel, placement, leverHeight_mm);

            svg += '<g transform="' + transform + '">';
            svg += pathsSvg;
            svg += '</g>';
        }

        return svg;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__IronmongeryRenderer__RenderIronmongery  : ValeSpec__IronmongeryRenderer__RenderIronmongery
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__IronmongeryRenderer  =  ValeSpec__SvgDrawing__IronmongeryRenderer;
