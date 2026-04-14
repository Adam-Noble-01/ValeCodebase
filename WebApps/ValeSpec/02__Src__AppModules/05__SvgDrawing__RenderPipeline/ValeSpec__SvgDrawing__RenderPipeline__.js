/* =============================================================================
   VALESPEC - SVG DRAWING RENDER PIPELINE
   =============================================================================

   FILE       : ValeSpec__SvgDrawing__RenderPipeline__.js
   NAMESPACE  : ValeSpec
   MODULE     : SvgDrawing - RenderPipeline
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Orchestrates sub-renderers into a complete SVG assembly drawing
   CREATED    : 2026

   DESCRIPTION:
   - Fetches and caches Na__SvgDrawing__Config.json on first call
   - Extracts assembly dimensions, door type, and lever config from data
   - Calls sub-renderers in z-order: panels, frame, ironmongery, dimensions
   - Wraps output in <svg> with computed viewBox including padding
   - Each layer wrapped in a named <g> group for DOM targeting
   - Provides renderThumbnail for smaller document editor previews

   ============================================================================= */

// =============================================================================
// REGION | Render Pipeline Module
// =============================================================================

const ValeSpec__SvgDrawing__RenderPipeline = (function() {

    // MODULE CONSTANTS | Config File Path
    // ------------------------------------------------------------
    const CONFIG_PATH  =  '02__Src__AppModules/05__SvgDrawing__RenderPipeline/Na__SvgDrawing__Config.json';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Cached Config and Dependencies
    // ------------------------------------------------------------
    let _cachedConfig          =  null;                // <-- Cached config after first fetch
    var PanelRenderer          =  null;                // <-- Lazy-loaded panel renderer
    var FrameRenderer          =  null;                // <-- Lazy-loaded frame renderer
    var IronmongeryRenderer    =  null;                // <-- Lazy-loaded ironmongery renderer
    var DimensionRenderer      =  null;                // <-- Lazy-loaded dimension renderer
    // ------------------------------------------------------------


    // HELPER FUNCTION | Lazy-Load Sub-Renderer References
    // ------------------------------------------------------------
    function _initRenderers() {
        if (!PanelRenderer)       PanelRenderer        =  window.ValeSpec__SvgDrawing__DoorPanelRenderer;
        if (!FrameRenderer)       FrameRenderer        =  window.ValeSpec__SvgDrawing__DoorFrameRenderer;
        if (!IronmongeryRenderer) IronmongeryRenderer   =  window.ValeSpec__SvgDrawing__IronmongeryRenderer;
        if (!DimensionRenderer)   DimensionRenderer     =  window.ValeSpec__SvgDrawing__DimensionRenderer;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch and Cache SVG Drawing Config
    // ------------------------------------------------------------
    async function _loadConfig() {
        if (_cachedConfig) return _cachedConfig;       // <-- Return cached on subsequent calls

        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) throw new Error('SVG config fetch failed: ' + response.status);
            _cachedConfig  =  await response.json();
            return _cachedConfig;
        } catch (e) {
            console.error('[ValeSpec__SvgDrawing__RenderPipeline] Config load error:', e);
            return {};
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Assembly Dimensions from Data
    // ------------------------------------------------------------
    function _extractDimensions(assemblyData) {
        var dimSection  =  assemblyData['Assembly__Dimensions__Config'] || {};
        return {
            width_mm   : dimSection['Assembly__Dimensions__Config__WidthMm']  || 1200,
            height_mm  : dimSection['Assembly__Dimensions__Config__HeightMm'] || 2100
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Door Type from Data
    // ------------------------------------------------------------
    function _extractDoorType(assemblyData) {
        var typeSection  =  assemblyData['Assembly__DoorType__Config'] || {};
        return typeSection['Assembly__DoorType__Config__Type'] || 'Outward Opening Double Doors';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Lever Config and Look Up Hardware Data
    // ------------------------------------------------------------
    function _extractHardwareData(assemblyData, hardwareIndex) {
        var leverSection  =  assemblyData['Assembly__Lever__Config'] || {};
        var leverType     =  leverSection['Assembly__Lever__Config__Type'] || null;

        if (!leverType || !hardwareIndex) return { hardwareData: null, leverHeight_mm: 1000 };

        var leverHeight  =  leverSection['Assembly__Lever__Config__HeightMm'] || 1000;

        if (hardwareIndex[leverType]) {
            return { hardwareData: hardwareIndex[leverType], leverHeight_mm: leverHeight };
        }

        var handleName  =  leverType + ' Lever Handle';
        if (hardwareIndex[handleName]) {
            return { hardwareData: hardwareIndex[handleName], leverHeight_mm: leverHeight };
        }

        var keys  =  Object.keys(hardwareIndex);
        for (var i = 0; i < keys.length; i++) {
            var item  =  hardwareIndex[keys[i]];
            if (item && item['HardwareItem__Name'] && item['HardwareItem__Name'].indexOf(leverType) !== -1) {
                return { hardwareData: item, leverHeight_mm: leverHeight };
            }
        }

        return { hardwareData: null, leverHeight_mm: leverHeight };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compute ViewBox from Dimensions and Padding
    // ------------------------------------------------------------
    function _computeViewBox(width_mm, height_mm, padding) {
        var minX    =  -padding;                       // <-- Extend left for dimension annotations
        var minY    =  -height_mm - padding;           // <-- Extend above top of frame (SVG Y-flip)
        var vbW     =  width_mm + (padding * 2);       // <-- Total viewBox width
        var vbH     =  height_mm + (padding * 2);      // <-- Total viewBox height

        return minX + ' ' + minY + ' ' + vbW + ' ' + vbH;
    }
    // ------------------------------------------------------------


    // FUNCTION | Ensure Config Is Loaded (call once at startup)
    // ------------------------------------------------------------
    async function ensureConfigLoaded() {
        if (!_cachedConfig) await _loadConfig();
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Complete Assembly SVG
    // ------------------------------------------------------------
    function renderAssembly(assemblyData, hardwareIndex, globalConfig) {
        _initRenderers();

        var config  =  globalConfig || _cachedConfig || {};

        var dims      =  _extractDimensions(assemblyData);
        var doorType  =  _extractDoorType(assemblyData);
        var hwResult  =  _extractHardwareData(assemblyData, hardwareIndex);

        var frameConfig   =  config['SvgDrawing__Frame__Config']        || {};
        var panelConfig   =  config['SvgDrawing__Panel__Config']        || {};
        var ironConfig    =  config['SvgDrawing__Ironmongery__Config']  || {};
        var dimConfig     =  config['SvgDrawing__Dimension__Config']    || {};
        var vpConfig      =  config['SvgDrawing__Viewport__Config']     || {};

        var padding   =  vpConfig['SvgDrawing__Viewport__Config__PaddingMm'] || 120;
        var viewBox   =  _computeViewBox(dims.width_mm, dims.height_mm, padding);

        var panelResult  =  PanelRenderer.renderPanels(doorType, dims.width_mm, dims.height_mm, panelConfig);

        var svg  =  '';
        svg += '<svg xmlns="http://www.w3.org/2000/svg"'
            + ' viewBox="' + viewBox + '"'
            + ' preserveAspectRatio="xMidYMid meet"'
            + ' style="width:100%;height:100%;">';

        svg += '<g id="ValeSpec__SvgDrawing__LayerPanels">';
        svg += panelResult.svg;
        svg += '</g>';

        svg += '<g id="ValeSpec__SvgDrawing__LayerFrame">';
        svg += FrameRenderer.renderFrame(dims.width_mm, dims.height_mm, frameConfig);
        svg += '</g>';

        svg += '<g id="ValeSpec__SvgDrawing__LayerIronmongery">';
        svg += IronmongeryRenderer.renderIronmongery(panelResult.panels, hwResult.hardwareData, hwResult.leverHeight_mm, ironConfig);
        svg += '</g>';

        svg += '<g id="ValeSpec__SvgDrawing__LayerDimensions">';
        svg += DimensionRenderer.renderDimensions(dims.width_mm, dims.height_mm, dimConfig);
        svg += '</g>';

        svg += '</svg>';

        return svg;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Thumbnail SVG for Document Editor
    // ------------------------------------------------------------
    function renderThumbnail(assemblyData, hardwareIndex, maxWidth, maxHeight) {
        _initRenderers();

        var config  =  _cachedConfig || {};

        var dims      =  _extractDimensions(assemblyData);
        var doorType  =  _extractDoorType(assemblyData);
        var hwResult  =  _extractHardwareData(assemblyData, hardwareIndex);

        var frameConfig   =  config['SvgDrawing__Frame__Config']        || {};
        var panelConfig   =  config['SvgDrawing__Panel__Config']        || {};
        var ironConfig    =  config['SvgDrawing__Ironmongery__Config']  || {};
        var vpConfig      =  config['SvgDrawing__Viewport__Config']     || {};

        var padding   =  vpConfig['SvgDrawing__Viewport__Config__PaddingMm'] || 120;
        var viewBox   =  _computeViewBox(dims.width_mm, dims.height_mm, padding);

        var widthAttr   =  maxWidth  ? ' width="'  + maxWidth  + '"' : '';
        var heightAttr  =  maxHeight ? ' height="' + maxHeight + '"' : '';

        var panelResult  =  PanelRenderer.renderPanels(doorType, dims.width_mm, dims.height_mm, panelConfig);

        var svg  =  '';
        svg += '<svg xmlns="http://www.w3.org/2000/svg"'
            + ' viewBox="' + viewBox + '"'
            + ' preserveAspectRatio="xMidYMid meet"'
            + widthAttr + heightAttr + '>';

        svg += '<g id="ValeSpec__SvgDrawing__ThumbLayerPanels">';
        svg += panelResult.svg;
        svg += '</g>';

        svg += '<g id="ValeSpec__SvgDrawing__ThumbLayerFrame">';
        svg += FrameRenderer.renderFrame(dims.width_mm, dims.height_mm, frameConfig);
        svg += '</g>';

        svg += '<g id="ValeSpec__SvgDrawing__ThumbLayerIronmongery">';
        svg += IronmongeryRenderer.renderIronmongery(panelResult.panels, hwResult.hardwareData, hwResult.leverHeight_mm, ironConfig);
        svg += '</g>';

        svg += '</svg>';

        return svg;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ensureConfigLoaded : ensureConfigLoaded,
        renderAssembly     : renderAssembly,
        renderThumbnail    : renderThumbnail
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__RenderPipeline  =  ValeSpec__SvgDrawing__RenderPipeline;
