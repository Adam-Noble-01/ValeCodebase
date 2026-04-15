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
   - Calls sub-renderers in z-order: panels, opening symbols, frame, ironmongery, dimensions
   - Wraps output in <svg> with computed viewBox including padding
   - Each layer wrapped in a named <g> group for DOM targeting
   - Provides RenderThumbnail for smaller document editor previews

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
    let ValeSpec__RenderPipeline__CachedConfig         =  null;               // <-- Cached config after first fetch
    var ValeSpec__RenderPipeline__PanelRenderer        =  null;               // <-- Lazy-loaded panel renderer
    var ValeSpec__RenderPipeline__OpeningRenderer       =  null;               // <-- Lazy-loaded opening symbol renderer
    var ValeSpec__RenderPipeline__FrameRenderer        =  null;               // <-- Lazy-loaded frame renderer
    var ValeSpec__RenderPipeline__IronmongeryRenderer   =  null;               // <-- Lazy-loaded ironmongery renderer
    var ValeSpec__RenderPipeline__DimensionRenderer    =  null;               // <-- Lazy-loaded dimension renderer
    // ------------------------------------------------------------


    // HELPER FUNCTION | Lazy-Load Sub-Renderer References
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__InitRenderers() {
        if (!ValeSpec__RenderPipeline__PanelRenderer)       ValeSpec__RenderPipeline__PanelRenderer        =  window.ValeSpec__SvgDrawing__DoorPanelRenderer;
        if (!ValeSpec__RenderPipeline__OpeningRenderer)     ValeSpec__RenderPipeline__OpeningRenderer      =  window.ValeSpec__SvgDrawing__OpeningSymbolRenderer;
        if (!ValeSpec__RenderPipeline__FrameRenderer)       ValeSpec__RenderPipeline__FrameRenderer        =  window.ValeSpec__SvgDrawing__DoorFrameRenderer;
        if (!ValeSpec__RenderPipeline__IronmongeryRenderer) ValeSpec__RenderPipeline__IronmongeryRenderer  =  window.ValeSpec__SvgDrawing__IronmongeryRenderer;
        if (!ValeSpec__RenderPipeline__DimensionRenderer)   ValeSpec__RenderPipeline__DimensionRenderer    =  window.ValeSpec__SvgDrawing__DimensionRenderer;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch and Cache SVG Drawing Config
    // ------------------------------------------------------------
    async function ValeSpec__RenderPipeline__LoadConfig() {
        if (ValeSpec__RenderPipeline__CachedConfig) return ValeSpec__RenderPipeline__CachedConfig; // <-- Return cached on subsequent calls

        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) throw new Error('SVG config fetch failed: ' + response.status);
            ValeSpec__RenderPipeline__CachedConfig  =  await response.json();
            return ValeSpec__RenderPipeline__CachedConfig;
        } catch (e) {
            console.error('[ValeSpec__SvgDrawing__RenderPipeline] Config load error:', e);
            return {};
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Assembly Dimensions from Data
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__ExtractDimensions(assemblyData) {
        var dimSection  =  assemblyData['Assembly__Dimensions__Config'] || {};
        return {
            width_mm   : dimSection['Assembly__Dimensions__Config__WidthMm']  || 1200,
            height_mm  : dimSection['Assembly__Dimensions__Config__HeightMm'] || 2100
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Door Type from Data
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__ExtractDoorType(assemblyData) {
        var typeSection  =  assemblyData['Assembly__DoorType__Config'] || {};
        return typeSection['Assembly__DoorType__Config__Type'] || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine if Door Type Is Configured
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__IsDoorTypeConfigured(doorType) {
        if (!doorType || typeof doorType !== 'string') return false;
        var lower  =  doorType.trim().toLowerCase();
        return lower !== 'none' && lower !== '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Lever Config and Look Up Hardware Data
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__ExtractHardwareData(assemblyData, hardwareIndex) {
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


    // HELPER FUNCTION | Extract Opening Config from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__ExtractOpeningConfig(assemblyData) {
        return assemblyData['Assembly__Opening__Config'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Numeric Value with Fallback
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__ParseNumber(value, fallbackValue) {
        var parsedValue  =  parseFloat(value);
        return isNaN(parsedValue) ? fallbackValue : parsedValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Viewport Padding Per Side
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__ResolveViewportPadding(vpConfig) {
        var basePadding  =  ValeSpec__RenderPipeline__ParseNumber(vpConfig['SvgDrawing__Viewport__Config__PaddingMm'], 120);
        return {
            top    : ValeSpec__RenderPipeline__ParseNumber(vpConfig['SvgDrawing__Viewport__Config__PaddingTopMm'], basePadding),
            right  : ValeSpec__RenderPipeline__ParseNumber(vpConfig['SvgDrawing__Viewport__Config__PaddingRightMm'], basePadding),
            bottom : ValeSpec__RenderPipeline__ParseNumber(vpConfig['SvgDrawing__Viewport__Config__PaddingBottomMm'], basePadding),
            left   : ValeSpec__RenderPipeline__ParseNumber(vpConfig['SvgDrawing__Viewport__Config__PaddingLeftMm'], basePadding)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compute ViewBox from Dimensions and Side Padding
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__ComputeViewBox(width_mm, height_mm, padding) {
        var minX   =  -padding.left;                            // <-- Extend left for dimension annotations
        var minY   =  -height_mm - padding.top;                // <-- Extend above top of frame (SVG Y-flip)
        var vbW    =  width_mm + padding.left + padding.right; // <-- Total viewBox width
        var vbH    =  height_mm + padding.top + padding.bottom;// <-- Total viewBox height

        return minX + ' ' + minY + ' ' + vbW + ' ' + vbH;
    }
    // ------------------------------------------------------------


    // FUNCTION | Ensure Config Is Loaded (call once at startup)
    // ------------------------------------------------------------
    async function ValeSpec__RenderPipeline__EnsureConfigLoaded() {
        if (!ValeSpec__RenderPipeline__CachedConfig) await ValeSpec__RenderPipeline__LoadConfig();
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Complete Assembly SVG
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__RenderAssembly(assemblyData, hardwareIndex, globalConfig) {
        ValeSpec__RenderPipeline__InitRenderers();

        var config  =  globalConfig || ValeSpec__RenderPipeline__CachedConfig || {};

        var dims      =  ValeSpec__RenderPipeline__ExtractDimensions(assemblyData);
        var doorType  =  ValeSpec__RenderPipeline__ExtractDoorType(assemblyData);
        if (!ValeSpec__RenderPipeline__IsDoorTypeConfigured(doorType)) return '';
        var hwResult  =  ValeSpec__RenderPipeline__ExtractHardwareData(assemblyData, hardwareIndex);

        var frameConfig    =  config['SvgDrawing__Frame__Config']        || {};
        var panelConfig    =  config['SvgDrawing__Panel__Config']        || {};
        var openingCfg     =  config['SvgDrawing__Opening__Config']      || {};
        var ironConfig     =  config['SvgDrawing__Ironmongery__Config']  || {};
        var dimConfig      =  config['SvgDrawing__Dimension__Config']    || {};
        var vpConfig       =  config['SvgDrawing__Viewport__Config']     || {};

        var openingConfig    =  ValeSpec__RenderPipeline__ExtractOpeningConfig(assemblyData);
        var viewportPadding  =  ValeSpec__RenderPipeline__ResolveViewportPadding(vpConfig);
        var viewBox          =  ValeSpec__RenderPipeline__ComputeViewBox(dims.width_mm, dims.height_mm, viewportPadding);

        var panelResult  =  ValeSpec__RenderPipeline__PanelRenderer.ValeSpec__DoorPanelRenderer__RenderPanels(doorType, dims.width_mm, dims.height_mm, panelConfig);

        var svg  =  '';
        svg += '<svg xmlns="http://www.w3.org/2000/svg"'
            + ' viewBox="' + viewBox + '"'
            + ' preserveAspectRatio="xMidYMid meet"'
            + ' style="width:100%;height:100%;">';

        svg += '<g id="ValeSpec__SvgDrawing__LayerPanels">';
        svg += panelResult.svg;
        svg += '</g>';

        if (ValeSpec__RenderPipeline__OpeningRenderer) {
            svg += '<g id="ValeSpec__SvgDrawing__LayerOpening">';
            svg += ValeSpec__RenderPipeline__OpeningRenderer.ValeSpec__OpeningSymbolRenderer__RenderOpeningSymbols(panelResult.panels, openingConfig, openingCfg);
            svg += '</g>';
        }

        svg += '<g id="ValeSpec__SvgDrawing__LayerFrame">';
        svg += ValeSpec__RenderPipeline__FrameRenderer.ValeSpec__DoorFrameRenderer__RenderFrame(dims.width_mm, dims.height_mm, frameConfig);
        svg += '</g>';

        svg += '<g id="ValeSpec__SvgDrawing__LayerIronmongery">';
        svg += ValeSpec__RenderPipeline__IronmongeryRenderer.ValeSpec__IronmongeryRenderer__RenderIronmongery(panelResult.panels, hwResult.hardwareData, hwResult.leverHeight_mm, ironConfig);
        svg += '</g>';

        svg += '<g id="ValeSpec__SvgDrawing__LayerDimensions">';
        svg += ValeSpec__RenderPipeline__DimensionRenderer.ValeSpec__DimensionRenderer__RenderDimensions(dims.width_mm, dims.height_mm, dimConfig);
        svg += '</g>';

        svg += '</svg>';

        return svg;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Thumbnail SVG for Document Editor
    // ------------------------------------------------------------
    function ValeSpec__RenderPipeline__RenderThumbnail(assemblyData, hardwareIndex, maxWidth, maxHeight) {
        ValeSpec__RenderPipeline__InitRenderers();

        var config  =  ValeSpec__RenderPipeline__CachedConfig || {};

        var dims      =  ValeSpec__RenderPipeline__ExtractDimensions(assemblyData);
        var doorType  =  ValeSpec__RenderPipeline__ExtractDoorType(assemblyData);
        if (!ValeSpec__RenderPipeline__IsDoorTypeConfigured(doorType)) return '';
        var hwResult  =  ValeSpec__RenderPipeline__ExtractHardwareData(assemblyData, hardwareIndex);

        var frameConfig    =  config['SvgDrawing__Frame__Config']        || {};
        var panelConfig    =  config['SvgDrawing__Panel__Config']        || {};
        var openingCfg     =  config['SvgDrawing__Opening__Config']      || {};
        var ironConfig     =  config['SvgDrawing__Ironmongery__Config']  || {};
        var vpConfig       =  config['SvgDrawing__Viewport__Config']     || {};

        var openingConfig    =  ValeSpec__RenderPipeline__ExtractOpeningConfig(assemblyData);
        var viewportPadding  =  ValeSpec__RenderPipeline__ResolveViewportPadding(vpConfig);
        var viewBox          =  ValeSpec__RenderPipeline__ComputeViewBox(dims.width_mm, dims.height_mm, viewportPadding);

        var widthAttr    =  maxWidth  ? ' width="'  + maxWidth  + '"' : '';
        var heightAttr   =  maxHeight ? ' height="' + maxHeight + '"' : '';

        var panelResult  =  ValeSpec__RenderPipeline__PanelRenderer.ValeSpec__DoorPanelRenderer__RenderPanels(doorType, dims.width_mm, dims.height_mm, panelConfig);

        var svg  =  '';
        svg += '<svg xmlns="http://www.w3.org/2000/svg"'
            + ' viewBox="' + viewBox + '"'
            + ' preserveAspectRatio="xMidYMid meet"'
            + widthAttr + heightAttr + '>';

        svg += '<g id="ValeSpec__SvgDrawing__ThumbLayerPanels">';
        svg += panelResult.svg;
        svg += '</g>';

        if (ValeSpec__RenderPipeline__OpeningRenderer) {
            svg += '<g id="ValeSpec__SvgDrawing__ThumbLayerOpening">';
            svg += ValeSpec__RenderPipeline__OpeningRenderer.ValeSpec__OpeningSymbolRenderer__RenderOpeningSymbols(panelResult.panels, openingConfig, openingCfg);
            svg += '</g>';
        }

        svg += '<g id="ValeSpec__SvgDrawing__ThumbLayerFrame">';
        svg += ValeSpec__RenderPipeline__FrameRenderer.ValeSpec__DoorFrameRenderer__RenderFrame(dims.width_mm, dims.height_mm, frameConfig);
        svg += '</g>';

        svg += '<g id="ValeSpec__SvgDrawing__ThumbLayerIronmongery">';
        svg += ValeSpec__RenderPipeline__IronmongeryRenderer.ValeSpec__IronmongeryRenderer__RenderIronmongery(panelResult.panels, hwResult.hardwareData, hwResult.leverHeight_mm, ironConfig);
        svg += '</g>';

        svg += '</svg>';

        return svg;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__RenderPipeline__EnsureConfigLoaded  : ValeSpec__RenderPipeline__EnsureConfigLoaded,
        ValeSpec__RenderPipeline__RenderAssembly      : ValeSpec__RenderPipeline__RenderAssembly,
        ValeSpec__RenderPipeline__RenderThumbnail     : ValeSpec__RenderPipeline__RenderThumbnail
    };

})();

// endregion ===================================================================

window.ValeSpec__SvgDrawing__RenderPipeline  =  ValeSpec__SvgDrawing__RenderPipeline;
