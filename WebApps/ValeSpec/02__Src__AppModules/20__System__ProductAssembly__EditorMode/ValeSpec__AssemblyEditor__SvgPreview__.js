/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR SVG PREVIEW
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__SvgPreview__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - SvgPreview
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : SVG viewport management and interactive dimension editing
   CREATED    : 2026

   DESCRIPTION:
   - Creates SVG viewport element inside preview panel
   - Subscribes to 'assemblyUpdated' for reactive re-rendering
   - Supports click-to-edit on rendered SVG dimension annotations
   - Delegates actual SVG drawing to ValeSpec__SvgDrawing__RenderPipeline

   ============================================================================= */

// =============================================================================
// REGION | Assembly Editor SVG Preview Module
// =============================================================================

const ValeSpec__AssemblyEditor__SvgPreview = (function() {

    // MODULE CONSTANTS | Config File Paths
    // ------------------------------------------------------------
    const ASSEMBLY_EDITOR_CONFIG_PATH  =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/Na__AssemblyEditor__Config.json';
    const SVG_DRAWING_CONFIG_PATH      =  '02__Src__AppModules/05__SvgDrawing__RenderPipeline/Na__SvgDrawing__Config.json';
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let ValeSpec__SvgPreview__ContainerEl    =  null;   // <-- Parent container from Layout
    let ValeSpec__SvgPreview__ViewportEl     =  null;   // <-- SVG viewport wrapper div
    let ValeSpec__SvgPreview__DoorPanelDefaultsConfig  =  null;   // <-- Door-type width/height min/max defaults
    let ValeSpec__SvgPreview__ViewportPaddingTopMm     =  150;    // <-- Top render-space padding from SVG config
    let ValeSpec__SvgPreview__ViewportPaddingRightMm   =  200;    // <-- Right render-space padding from SVG config
    let ValeSpec__SvgPreview__ViewportPaddingBottomMm  =  200;    // <-- Bottom render-space padding from SVG config
    let ValeSpec__SvgPreview__ViewportPaddingLeftMm    =  200;    // <-- Left render-space padding from SVG config
    let ValeSpec__SvgPreview__CurrentAspectRatio       =  0.88;   // <-- Last applied card aspect ratio
    let ValeSpec__SvgPreview__ResizeObserver           =  null;    // <-- Preview panel resize observer
    let ValeSpec__SvgPreview__WindowResizeHandler      =  null;    // <-- Window resize fallback handler
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build SVG Viewport Element
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__BuildViewport() {
        ValeSpec__SvgPreview__ViewportEl  =  document.createElement('div');
        ValeSpec__SvgPreview__ViewportEl.className  =  'ValeSpec__AssemblyEditor__SvgViewport';
        ValeSpec__SvgPreview__ViewportEl.id         =  'ValeSpec__AssemblyEditor__SvgViewport';
        ValeSpec__SvgPreview__ContainerEl.appendChild(ValeSpec__SvgPreview__ViewportEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Numeric Value with Fallback
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__ParseNumber(value, fallbackValue) {
        var parsedValue  =  parseFloat(value);
        return isNaN(parsedValue) ? fallbackValue : parsedValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Local Preview Config
    // ------------------------------------------------------------
    async function ValeSpec__SvgPreview__EnsureConfigLoaded() {
        if (ValeSpec__SvgPreview__DoorPanelDefaultsConfig) return;
        try {
            var assemblyResponse  =  await fetch(ASSEMBLY_EDITOR_CONFIG_PATH);
            if (assemblyResponse.ok) {
                var assemblyData  =  await assemblyResponse.json();
                ValeSpec__SvgPreview__DoorPanelDefaultsConfig  =  assemblyData['AssemblyEditor__DoorPanelDefaults__Config'] || null;
            }

            var svgResponse  =  await fetch(SVG_DRAWING_CONFIG_PATH);
            if (svgResponse.ok) {
                var svgData    =  await svgResponse.json();
                var viewportConfig  =  svgData['SvgDrawing__Viewport__Config'] || {};
                var basePadding  =  ValeSpec__SvgPreview__ParseNumber(viewportConfig['SvgDrawing__Viewport__Config__PaddingMm'], 200);
                ValeSpec__SvgPreview__ViewportPaddingTopMm     =  ValeSpec__SvgPreview__ParseNumber(viewportConfig['SvgDrawing__Viewport__Config__PaddingTopMm'], basePadding);
                ValeSpec__SvgPreview__ViewportPaddingRightMm   =  ValeSpec__SvgPreview__ParseNumber(viewportConfig['SvgDrawing__Viewport__Config__PaddingRightMm'], basePadding);
                ValeSpec__SvgPreview__ViewportPaddingBottomMm  =  ValeSpec__SvgPreview__ParseNumber(viewportConfig['SvgDrawing__Viewport__Config__PaddingBottomMm'], basePadding);
                ValeSpec__SvgPreview__ViewportPaddingLeftMm    =  ValeSpec__SvgPreview__ParseNumber(viewportConfig['SvgDrawing__Viewport__Config__PaddingLeftMm'], basePadding);
            }
        } catch (e) {
            console.warn('[ValeSpec__SvgPreview] Config load failed:', e);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Door Type Profile
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__GetDoorPanelProfileForType(doorType) {
        var cfg         =  ValeSpec__SvgPreview__DoorPanelDefaultsConfig || {};
        var profileMap  =  cfg['AssemblyEditor__DoorPanelDefaults__Config__DoorTypeProfileMap'] || {};
        var profiles    =  cfg['AssemblyEditor__DoorPanelDefaults__Config__Profiles'] || {};
        var fallbackKey =  cfg['AssemblyEditor__DoorPanelDefaults__Config__FallbackProfileKey'] || 'DoubleDoors';
        var profileKey  =  profileMap[doorType] || fallbackKey;
        var profile     =  profiles[profileKey] || profiles[fallbackKey];
        if (profile) return profile;

        return {
            'AssemblyEditor__DoorPanelDefaults__Config__WidthDefaultMm' : 1800,
            'AssemblyEditor__DoorPanelDefaults__Config__WidthMinMm'   : 600,
            'AssemblyEditor__DoorPanelDefaults__Config__WidthMaxMm'   : 4000,
            'AssemblyEditor__DoorPanelDefaults__Config__HeightDefaultMm' : 2100,
            'AssemblyEditor__DoorPanelDefaults__Config__HeightMinMm'  : 1600,
            'AssemblyEditor__DoorPanelDefaults__Config__HeightMaxMm'  : 3000
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Default Preview Aspect Ratio
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__GetDefaultAspectRatio() {
        var profile          =  ValeSpec__SvgPreview__GetDoorPanelProfileForType('Double Doors');
        var widthDefaultMm   =  ValeSpec__SvgPreview__ParseNumber(profile['AssemblyEditor__DoorPanelDefaults__Config__WidthDefaultMm'], 1800);
        var heightDefaultMm  =  ValeSpec__SvgPreview__ParseNumber(profile['AssemblyEditor__DoorPanelDefaults__Config__HeightDefaultMm'], 2100);
        var viewBoxWidthMm   =  widthDefaultMm + ValeSpec__SvgPreview__ViewportPaddingLeftMm + ValeSpec__SvgPreview__ViewportPaddingRightMm;
        var viewBoxHeightMm  =  heightDefaultMm + ValeSpec__SvgPreview__ViewportPaddingTopMm + ValeSpec__SvgPreview__ViewportPaddingBottomMm;
        if (viewBoxWidthMm <= 0 || viewBoxHeightMm <= 0) return 0.88;

        return viewBoxWidthMm / viewBoxHeightMm;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fit Viewport Card to Available Preview Space
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__ApplyViewportFit(aspectRatio) {
        if (!ValeSpec__SvgPreview__ContainerEl || !ValeSpec__SvgPreview__ViewportEl) return;

        var ratio  =  ValeSpec__SvgPreview__ParseNumber(aspectRatio, ValeSpec__SvgPreview__GetDefaultAspectRatio());
        if (ratio <= 0) ratio = 0.88;

        var styles        =  window.getComputedStyle(ValeSpec__SvgPreview__ContainerEl);
        var paddingLeft   =  ValeSpec__SvgPreview__ParseNumber(styles.paddingLeft, 0);
        var paddingRight  =  ValeSpec__SvgPreview__ParseNumber(styles.paddingRight, 0);
        var paddingTop    =  ValeSpec__SvgPreview__ParseNumber(styles.paddingTop, 0);
        var paddingBottom =  ValeSpec__SvgPreview__ParseNumber(styles.paddingBottom, 0);

        var availableWidth   =  ValeSpec__SvgPreview__ContainerEl.clientWidth  - paddingLeft - paddingRight;
        var availableHeight  =  ValeSpec__SvgPreview__ContainerEl.clientHeight - paddingTop  - paddingBottom;
        if (availableWidth <= 0 || availableHeight <= 0) return;

        var fittedWidth   =  Math.min(availableWidth, availableHeight * ratio);
        var fittedHeight  =  fittedWidth / ratio;

        ValeSpec__SvgPreview__CurrentAspectRatio       =  ratio;
        ValeSpec__SvgPreview__ViewportEl.style.width   =  Math.max(0, fittedWidth) + 'px';
        ValeSpec__SvgPreview__ViewportEl.style.height  =  Math.max(0, fittedHeight) + 'px';
        ValeSpec__SvgPreview__ViewportEl.style.aspectRatio  =  ratio.toString();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fit Viewport using Current SVG ViewBox
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__FitViewportToContent() {
        if (!ValeSpec__SvgPreview__ViewportEl) return;

        var svgEl      =  ValeSpec__SvgPreview__ViewportEl.querySelector('svg');
        var ratio      =  ValeSpec__SvgPreview__CurrentAspectRatio || ValeSpec__SvgPreview__GetDefaultAspectRatio();
        var hasViewBox =  !!(svgEl && svgEl.viewBox && svgEl.viewBox.baseVal);

        if (hasViewBox && svgEl.viewBox.baseVal.height > 0) {
            ratio  =  svgEl.viewBox.baseVal.width / svgEl.viewBox.baseVal.height;
        } else {
            ratio  =  ValeSpec__SvgPreview__GetDefaultAspectRatio();
        }

        ValeSpec__SvgPreview__ApplyViewportFit(ratio);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bind Resize Hooks for Adaptive Preview
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__BindResizeHandlers() {
        if (!ValeSpec__SvgPreview__ContainerEl) return;

        if (!ValeSpec__SvgPreview__WindowResizeHandler) {
            ValeSpec__SvgPreview__WindowResizeHandler  =  function() {
                ValeSpec__SvgPreview__FitViewportToContent();
            };
            window.addEventListener('resize', ValeSpec__SvgPreview__WindowResizeHandler);
        }

        if (!ValeSpec__SvgPreview__ResizeObserver && window.ResizeObserver) {
            ValeSpec__SvgPreview__ResizeObserver  =  new ResizeObserver(function() {
                ValeSpec__SvgPreview__FitViewportToContent();
            });
            ValeSpec__SvgPreview__ResizeObserver.observe(ValeSpec__SvgPreview__ContainerEl);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine if Assembly Door Type is Configured
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__IsAssemblyConfigured(assemblyData) {
        if (!assemblyData) return false;
        var doorTypeCfg  =  assemblyData['Assembly__DoorType__Config'] || {};
        var doorType     =  doorTypeCfg['Assembly__DoorType__Config__Type'];
        if (!doorType || typeof doorType !== 'string') return false;
        var lower  =  doorType.trim().toLowerCase();
        return lower !== 'none' && lower !== '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Canvas Guidance Message
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__RenderCanvasGuide() {
        if (!ValeSpec__SvgPreview__ViewportEl) return;
        var html  =  '<div class="ValeSpec__AssemblyEditor__CanvasGuide">';
        html     +=      '<div class="ValeSpec__AssemblyEditor__CanvasGuideTitle">Assembly preview not started</div>';
        html     +=      '<div class="ValeSpec__AssemblyEditor__CanvasGuideText">Begin by selecting Door Type in the configuration menu.</div>';
        html     +=  '</div>';
        ValeSpec__SvgPreview__ViewportEl.innerHTML  =  html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bind Click Handlers to SVG Dimension Text
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__BindDimensionClicks() {
        if (!ValeSpec__SvgPreview__ViewportEl) return;

        var dimTexts  =  ValeSpec__SvgPreview__ViewportEl.querySelectorAll('text[data-dimension]');
        for (var i = 0; i < dimTexts.length; i++) {
            dimTexts[i].addEventListener('click', ValeSpec__SvgPreview__OnDimensionTextClick);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Click on SVG Dimension Text
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__OnDimensionTextClick(e) {
        e.stopPropagation();

        var textEl    =  e.currentTarget;
        var dimType   =  textEl.getAttribute('data-dimension');
        var curValue  =  textEl.getAttribute('data-value');

        var rect  =  textEl.getBoundingClientRect();

        var existingInput  =  ValeSpec__SvgPreview__ViewportEl.parentElement.querySelector('.ValeSpec__AssemblyEditor__DimEditInput');
        if (existingInput) existingInput.remove();

        var input  =  document.createElement('input');
        input.type       =  'number';
        input.className  =  'ValeSpec__AssemblyEditor__DimEditInput';
        input.value      =  curValue;
        input.step       =  1;

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var assemblyData  =  StateManager ? StateManager.ValeSpec__StateManager__GetCurrentAssembly() : null;
        var doorTypeCfg   =  assemblyData ? (assemblyData['Assembly__DoorType__Config'] || {}) : {};
        var doorType      =  doorTypeCfg['Assembly__DoorType__Config__Type'] || 'None';
        var profile       =  ValeSpec__SvgPreview__GetDoorPanelProfileForType(doorType);

        var widthMin      =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__WidthMinMm'], 10)   || 600;
        var widthMax      =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__WidthMaxMm'], 10)   || 4000;
        var heightMin     =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__HeightMinMm'], 10)  || 1600;
        var heightMax     =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__HeightMaxMm'], 10)  || 3000;

        if (dimType === 'width') {
            input.min  =  widthMin;
            input.max  =  widthMax;
        } else {
            input.min  =  heightMin;
            input.max  =  heightMax;
        }

        var containerRect  =  ValeSpec__SvgPreview__ViewportEl.parentElement.getBoundingClientRect();
        input.style.position  =  'absolute';
        input.style.left      =  (rect.left - containerRect.left + rect.width / 2 - 50) + 'px';
        input.style.top       =  (rect.top  - containerRect.top  + rect.height / 2 - 14) + 'px';
        input.style.width     =  '100px';
        input.style.zIndex    =  '100';

        ValeSpec__SvgPreview__ViewportEl.parentElement.style.position  =  'relative';
        ValeSpec__SvgPreview__ViewportEl.parentElement.appendChild(input);

        input.focus();
        input.select();

        var isFinalized  =  false;

        function finalizeInlineEdit() {
            if (isFinalized) return;
            isFinalized  =  true;
            input.removeEventListener('blur', commitValue);
            input.removeEventListener('keydown', onInputKeydown);
            if (input.parentNode) input.remove();
        }

        function commitValue() {
            if (isFinalized) return;

            var newVal  =  parseInt(input.value, 10);
            if (isNaN(newVal)) { finalizeInlineEdit(); return; }

            if (dimType === 'width') {
                newVal  =  Math.max(widthMin, Math.min(widthMax, newVal));
            } else {
                newVal  =  Math.max(heightMin, Math.min(heightMax, newVal));
            }

            if (!StateManager) { finalizeInlineEdit(); return; }

            var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
            if (!assembly) { finalizeInlineEdit(); return; }

            if (!assembly['Assembly__Dimensions__Config']) assembly['Assembly__Dimensions__Config'] = {};

            if (dimType === 'width') {
                assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__WidthMm']  =  newVal;
            } else {
                assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__HeightMm']  =  newVal;
            }

            StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
            finalizeInlineEdit();
        }

        function onInputKeydown(ev) {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                input.blur();
                return;
            }

            if (ev.key === 'Escape') {
                ev.preventDefault();
                finalizeInlineEdit();
            }
        }

        input.addEventListener('blur', commitValue);
        input.addEventListener('keydown', onInputKeydown);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Assembly Updated Event
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__OnAssemblyUpdated(assemblyData) {
        ValeSpec__SvgPreview__Render(assemblyData);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Perform Initial Render on First Load
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__DoInitialRender() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var assembly      =  StateManager ? StateManager.ValeSpec__StateManager__GetCurrentAssembly() : null;
        ValeSpec__SvgPreview__Render(assembly);
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Assembly SVG into Viewport
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__Render(assemblyData) {
        if (!ValeSpec__SvgPreview__ViewportEl) return;

        var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
        var StateManager    =  window.ValeSpec__AppCore__StateManager;
        var hwIndex         =  StateManager ? StateManager.ValeSpec__StateManager__GetState().hardwareIndex : null;

        if (!assemblyData) {
            ValeSpec__SvgPreview__ViewportEl.innerHTML  =  '<p style="color:var(--Vale_TextSubtle); padding:20px;">Select an assembly to preview.</p>';
            ValeSpec__SvgPreview__FitViewportToContent();
            return;
        }

        if (!ValeSpec__SvgPreview__IsAssemblyConfigured(assemblyData)) {
            ValeSpec__SvgPreview__RenderCanvasGuide();
            ValeSpec__SvgPreview__FitViewportToContent();
            return;
        }

        if (RenderPipeline) {
            try {
                var svgMarkup  =  RenderPipeline.ValeSpec__RenderPipeline__RenderAssembly(assemblyData, hwIndex);
                ValeSpec__SvgPreview__ViewportEl.innerHTML  =  svgMarkup || '';
                ValeSpec__SvgPreview__BindDimensionClicks();
                ValeSpec__SvgPreview__FitViewportToContent();
            } catch (e) {
                ValeSpec__SvgPreview__ViewportEl.innerHTML  =  '<p style="color:var(--Vale_TextSubtle); padding:20px;">SVG render error: ' + e.message + '</p>';
                console.error('[ValeSpec__SvgPreview] Render error:', e);
                ValeSpec__SvgPreview__FitViewportToContent();
            }
        } else {
            ValeSpec__SvgPreview__ViewportEl.innerHTML  =  '<p style="color:var(--Vale_TextSubtle); padding:20px;">Drawing pipeline unavailable.</p>';
            ValeSpec__SvgPreview__FitViewportToContent();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise SVG Preview
    // ------------------------------------------------------------
    async function ValeSpec__SvgPreview__Init(container) {
        ValeSpec__SvgPreview__ContainerEl  =  container;
        if (!ValeSpec__SvgPreview__ContainerEl) return;

        await ValeSpec__SvgPreview__EnsureConfigLoaded();
        ValeSpec__SvgPreview__BuildViewport();
        ValeSpec__SvgPreview__BindResizeHandlers();

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.ValeSpec__StateManager__On('assemblyUpdated', ValeSpec__SvgPreview__OnAssemblyUpdated);
        }

        ValeSpec__SvgPreview__DoInitialRender();

        console.log('[ValeSpec__SvgPreview] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__SvgPreview__Init   : ValeSpec__SvgPreview__Init,
        ValeSpec__SvgPreview__Render : ValeSpec__SvgPreview__Render
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__SvgPreview  =  ValeSpec__AssemblyEditor__SvgPreview;
