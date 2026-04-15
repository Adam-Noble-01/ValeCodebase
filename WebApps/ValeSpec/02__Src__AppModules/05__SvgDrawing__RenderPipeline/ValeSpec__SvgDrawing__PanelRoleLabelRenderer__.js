/* =============================================================================
   VALESPEC - SVG DRAWING PANEL ROLE LABEL RENDERER
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__PanelRoleLabelRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - PanelRoleLabelRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Renders MASTER / SLAVE overlays centred on paired door panels
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Draws bordered label boxes centred on each paired panel
   - Label text is role-driven via panel metadata (master/slave)
   - Intended for double and bifold door outputs only
   - Config-driven colours, font size, padding, radius, and text labels
   - Uses CoordHelpers conversion to honour SVG Y-axis inversion

   ============================================================================= */

// =============================================================================
// REGION | Panel Role Label Renderer Module
// =============================================================================

const ValeSpec__SvgDrawing__PanelRoleLabelRenderer = (function() {

    // MODULE VARIABLES | Module Dependencies
    // ------------------------------------------------------------
    var ValeSpec__PanelRoleLabelRenderer__CoordsRef  =  null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Lazy-Load CoordHelpers Reference
    // ------------------------------------------------------------
    function ValeSpec__PanelRoleLabelRenderer__GetCoords() {
        if (!ValeSpec__PanelRoleLabelRenderer__CoordsRef) ValeSpec__PanelRoleLabelRenderer__CoordsRef  =  window.ValeSpec__SvgDrawing__CoordHelpers;
        return ValeSpec__PanelRoleLabelRenderer__CoordsRef;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Numeric Config Value
    // ------------------------------------------------------------
    function ValeSpec__PanelRoleLabelRenderer__ParseNumber(value, fallbackValue) {
        var parsed  =  parseFloat(value);
        return isNaN(parsed) ? fallbackValue : parsed;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine if Door Type Is Paired-Panel
    // ------------------------------------------------------------
    function ValeSpec__PanelRoleLabelRenderer__IsPairedDoorType(doorType) {
        if (!doorType || typeof doorType !== 'string') return false;
        var lower  =  doorType.toLowerCase();
        return lower.indexOf('double') !== -1 || lower.indexOf('bifold') !== -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Panel Role Text from Metadata
    // ------------------------------------------------------------
    function ValeSpec__PanelRoleLabelRenderer__ResolveLabelText(panel, config) {
        var role        =  panel && panel.role ? String(panel.role).toLowerCase() : '';
        var masterText  =  config['SvgDrawing__PanelRoleLabel__Config__MasterText'] || 'MASTER';
        var slaveText   =  config['SvgDrawing__PanelRoleLabel__Config__SlaveText']  || 'SLAVE';
        if (role === 'master') return masterText;
        if (role === 'slave')  return slaveText;
        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Label Box and Text for One Panel
    // ------------------------------------------------------------
    function ValeSpec__PanelRoleLabelRenderer__RenderPanelLabel(panel, labelText, config) {
        var Coords  =  ValeSpec__PanelRoleLabelRenderer__GetCoords();
        var fontSize    =  ValeSpec__PanelRoleLabelRenderer__ParseNumber(config['SvgDrawing__PanelRoleLabel__Config__FontSizeMm'], 120);
        var textColor   =  config['SvgDrawing__PanelRoleLabel__Config__TextColor']   || '#1f5da3';
        var borderColor =  config['SvgDrawing__PanelRoleLabel__Config__BorderColor'] || '#1f5da3';
        var borderWidth =  ValeSpec__PanelRoleLabelRenderer__ParseNumber(config['SvgDrawing__PanelRoleLabel__Config__BorderWidthMm'], 3);
        var fillColor   =  config['SvgDrawing__PanelRoleLabel__Config__FillColor']   || 'none';
        var fillOpacity =  ValeSpec__PanelRoleLabelRenderer__ParseNumber(config['SvgDrawing__PanelRoleLabel__Config__FillOpacity'], 0);
        var cornerRadius = ValeSpec__PanelRoleLabelRenderer__ParseNumber(config['SvgDrawing__PanelRoleLabel__Config__CornerRadiusMm'], 8);
        var padX        =  ValeSpec__PanelRoleLabelRenderer__ParseNumber(config['SvgDrawing__PanelRoleLabel__Config__PaddingXmm'], 26);
        var padY        =  ValeSpec__PanelRoleLabelRenderer__ParseNumber(config['SvgDrawing__PanelRoleLabel__Config__PaddingYmm'], 14);
        var minBoxWidth =  ValeSpec__PanelRoleLabelRenderer__ParseNumber(config['SvgDrawing__PanelRoleLabel__Config__MinimumBoxWidthMm'], 300);
        var widthFactor =  ValeSpec__PanelRoleLabelRenderer__ParseNumber(config['SvgDrawing__PanelRoleLabel__Config__EstimatedCharacterWidthFactor'], 0.58);
        var offsetY     =  ValeSpec__PanelRoleLabelRenderer__ParseNumber(config['SvgDrawing__PanelRoleLabel__Config__CenterOffsetYmm'], 0);

        var centerX  =  panel.x + (panel.width / 2);
        var centerY  =  panel.y + (panel.height / 2) + offsetY;

        var estimatedTextWidth  =  labelText.length * fontSize * widthFactor;
        var boxWidth   =  Math.max(minBoxWidth, estimatedTextWidth + (padX * 2));
        var boxHeight  =  Math.max(fontSize + (padY * 2), 120);
        var boxX       =  centerX - (boxWidth / 2);
        var boxY       =  centerY - (boxHeight / 2);
        var svgY       =  -(boxY + boxHeight);

        var svg  =  '';
        svg += '<rect'
            + ' x="' + boxX + '"'
            + ' y="' + svgY + '"'
            + ' width="' + boxWidth + '"'
            + ' height="' + boxHeight + '"'
            + ' rx="' + cornerRadius + '"'
            + ' ry="' + cornerRadius + '"'
            + ' fill="' + fillColor + '"'
            + ' fill-opacity="' + fillOpacity + '"'
            + ' stroke="' + borderColor + '"'
            + ' stroke-width="' + borderWidth + '"'
            + ' />';

        svg += Coords.ValeSpec__CoordHelpers__SvgText(centerX, centerY, labelText, fontSize, textColor, 'middle');
        return svg;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Role Labels for Paired Panels
    // ------------------------------------------------------------
    function ValeSpec__PanelRoleLabelRenderer__RenderPanelRoleLabels(panels, doorType, config) {
        if (!panels || !panels.length) return '';
        if (!ValeSpec__PanelRoleLabelRenderer__IsPairedDoorType(doorType)) return '';

        var labelConfig  =  config || {};
        var svg  =  '';

        for (var i = 0; i < panels.length; i++) {
            var panel  =  panels[i];
            var labelText  =  ValeSpec__PanelRoleLabelRenderer__ResolveLabelText(panel, labelConfig);
            if (!labelText) continue;
            svg += ValeSpec__PanelRoleLabelRenderer__RenderPanelLabel(panel, labelText, labelConfig);
        }

        return svg;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__PanelRoleLabelRenderer__RenderPanelRoleLabels  : ValeSpec__PanelRoleLabelRenderer__RenderPanelRoleLabels
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__PanelRoleLabelRenderer  =  ValeSpec__SvgDrawing__PanelRoleLabelRenderer;
