/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR SVG PREVIEW
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__SvgPreview__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - SvgPreview
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : SVG viewport management and dimension slider controls
   CREATED    : 2026

   DESCRIPTION:
   - Creates SVG viewport element inside preview panel
   - Width and height sliders below the SVG sync with assembly dimensions
   - Subscribes to 'assemblyUpdated' for reactive re-rendering
   - Delegates actual SVG drawing to ValeSpec__SvgDrawing__RenderPipeline

   ============================================================================= */

// =============================================================================
// REGION | Assembly Editor SVG Preview Module
// =============================================================================

const ValeSpec__AssemblyEditor__SvgPreview = (function() {

    // MODULE CONSTANTS | Config Path
    // ------------------------------------------------------------
    const CONFIG_PATH  =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/Na__AssemblyEditor__Config.json';
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let ValeSpec__SvgPreview__ContainerEl    =  null;   // <-- Parent container from Layout
    let ValeSpec__SvgPreview__ViewportEl     =  null;   // <-- SVG viewport wrapper div
    let ValeSpec__SvgPreview__WidthSliderEl  =  null;   // <-- Width range input
    let ValeSpec__SvgPreview__HeightSliderEl =  null;   // <-- Height range input
    let ValeSpec__SvgPreview__WidthValueEl   =  null;   // <-- Width numeric display
    let ValeSpec__SvgPreview__HeightValueEl  =  null;   // <-- Height numeric display
    let ValeSpec__SvgPreview__SliderConfig   =  null;   // <-- Slider limits from config
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Slider Configuration
    // ------------------------------------------------------------
    async function ValeSpec__SvgPreview__LoadSliderConfig() {
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) return null;
            var data  =  await response.json();
            ValeSpec__SvgPreview__SliderConfig  =  data['AssemblyEditor__Slider__Config'] || null;
            return ValeSpec__SvgPreview__SliderConfig;
        } catch (e) {
            console.warn('[ValeSpec__SvgPreview] Could not load slider config:', e);
            return null;
        }
    }
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


    // HELPER FUNCTION | Create Single Slider Group
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__CreateSliderGroup(labelText, id, cfg) {
        var min     =  (cfg && cfg['Min'])     || 600;
        var max     =  (cfg && cfg['Max'])     || 4000;
        var step    =  (cfg && cfg['Step'])    || 1;
        var defVal  =  (cfg && cfg['Default']) || 1800;

        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__SliderGroup';

        var label  =  document.createElement('label');
        label.textContent  =  labelText;
        label.setAttribute('for', id);

        var input  =  document.createElement('input');
        input.type   =  'range';
        input.id     =  id;
        input.min    =  min;
        input.max    =  max;
        input.step   =  step;
        input.value  =  defVal;

        var valueSpan  =  document.createElement('span');
        valueSpan.className    =  'ValeSpec__AssemblyEditor__SliderValue';
        valueSpan.id           =  id + '__Value';
        valueSpan.textContent  =  defVal + ' mm';

        group.appendChild(label);
        group.appendChild(input);
        group.appendChild(valueSpan);

        return { group: group, input: input, valueSpan: valueSpan };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push Dimension Update to StateManager
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__PushDimensionUpdate() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__Dimensions__Config']) assembly['Assembly__Dimensions__Config'] = {};
        assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__WidthMm']   =  parseInt(ValeSpec__SvgPreview__WidthSliderEl.value, 10);
        assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__HeightMm']  =  parseInt(ValeSpec__SvgPreview__HeightSliderEl.value, 10);
        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Dimension Sliders
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__BuildSliders() {
        var wrapper  =  document.createElement('div');
        wrapper.className  =  'ValeSpec__AssemblyEditor__PreviewSliders';

        var cfg  =  ValeSpec__SvgPreview__SliderConfig;

        var widthCfg   =  cfg ? {
            Min: cfg['AssemblyEditor__Slider__Config__WidthMinMm']     || 600,
            Max: cfg['AssemblyEditor__Slider__Config__WidthMaxMm']     || 4000,
            Step: cfg['AssemblyEditor__Slider__Config__WidthStepMm']   || 1,
            Default: cfg['AssemblyEditor__Slider__Config__WidthDefaultMm'] || 1800
        } : null;
        var heightCfg  =  cfg ? {
            Min: cfg['AssemblyEditor__Slider__Config__HeightMinMm']     || 1800,
            Max: cfg['AssemblyEditor__Slider__Config__HeightMaxMm']     || 3000,
            Step: cfg['AssemblyEditor__Slider__Config__HeightStepMm']   || 1,
            Default: cfg['AssemblyEditor__Slider__Config__HeightDefaultMm'] || 2100
        } : null;

        var widthParts   =  ValeSpec__SvgPreview__CreateSliderGroup('Width (mm)',  'ValeSpec__AssemblyEditor__WidthSlider',  widthCfg);
        var heightParts  =  ValeSpec__SvgPreview__CreateSliderGroup('Height (mm)', 'ValeSpec__AssemblyEditor__HeightSlider', heightCfg);

        ValeSpec__SvgPreview__WidthSliderEl   =  widthParts.input;
        ValeSpec__SvgPreview__HeightSliderEl  =  heightParts.input;
        ValeSpec__SvgPreview__WidthValueEl    =  widthParts.valueSpan;
        ValeSpec__SvgPreview__HeightValueEl   =  heightParts.valueSpan;

        wrapper.appendChild(widthParts.group);
        wrapper.appendChild(heightParts.group);
        ValeSpec__SvgPreview__ContainerEl.appendChild(wrapper);

        ValeSpec__SvgPreview__WidthSliderEl.addEventListener('input', function() {
            ValeSpec__SvgPreview__WidthValueEl.textContent  =  parseInt(ValeSpec__SvgPreview__WidthSliderEl.value, 10) + ' mm';
            ValeSpec__SvgPreview__PushDimensionUpdate();
        });
        ValeSpec__SvgPreview__HeightSliderEl.addEventListener('input', function() {
            ValeSpec__SvgPreview__HeightValueEl.textContent  =  parseInt(ValeSpec__SvgPreview__HeightSliderEl.value, 10) + ' mm';
            ValeSpec__SvgPreview__PushDimensionUpdate();
        });
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

        if (dimType === 'width') {
            input.min  =  600;
            input.max  =  4000;
        } else {
            input.min  =  1800;
            input.max  =  3000;
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

        function commitValue() {
            var newVal  =  parseInt(input.value, 10);
            if (isNaN(newVal)) { input.remove(); return; }

            if (dimType === 'width') {
                newVal  =  Math.max(600, Math.min(4000, newVal));
            } else {
                newVal  =  Math.max(1800, Math.min(3000, newVal));
            }

            var StateManager  =  window.ValeSpec__AppCore__StateManager;
            if (!StateManager) { input.remove(); return; }

            var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
            if (!assembly) { input.remove(); return; }

            if (!assembly['Assembly__Dimensions__Config']) assembly['Assembly__Dimensions__Config'] = {};

            if (dimType === 'width') {
                assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__WidthMm']  =  newVal;
                if (ValeSpec__SvgPreview__WidthSliderEl) { ValeSpec__SvgPreview__WidthSliderEl.value = newVal; ValeSpec__SvgPreview__WidthValueEl.textContent = newVal + ' mm'; }
            } else {
                assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__HeightMm']  =  newVal;
                if (ValeSpec__SvgPreview__HeightSliderEl) { ValeSpec__SvgPreview__HeightSliderEl.value = newVal; ValeSpec__SvgPreview__HeightValueEl.textContent = newVal + ' mm'; }
            }

            StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
            input.remove();
        }

        input.addEventListener('blur', commitValue);
        input.addEventListener('keydown', function(ev) {
            if (ev.key === 'Enter')  { ev.preventDefault(); commitValue(); }
            if (ev.key === 'Escape') { input.remove(); }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Assembly Updated Event
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__OnAssemblyUpdated(assemblyData) {
        if (assemblyData && ValeSpec__SvgPreview__WidthSliderEl && ValeSpec__SvgPreview__HeightSliderEl) {
            var dims    =  assemblyData['Assembly__Dimensions__Config'] || {};
            var width   =  dims['Assembly__Dimensions__Config__WidthMm']  || ValeSpec__SvgPreview__WidthSliderEl.value;
            var height  =  dims['Assembly__Dimensions__Config__HeightMm'] || ValeSpec__SvgPreview__HeightSliderEl.value;
            ValeSpec__SvgPreview__WidthSliderEl.value        =  width;
            ValeSpec__SvgPreview__HeightSliderEl.value       =  height;
            ValeSpec__SvgPreview__WidthValueEl.textContent   =  width + ' mm';
            ValeSpec__SvgPreview__HeightValueEl.textContent  =  height + ' mm';
        }
        ValeSpec__SvgPreview__Render(assemblyData);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Perform Initial Render on First Load
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__DoInitialRender() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var assembly      =  StateManager ? StateManager.ValeSpec__StateManager__GetCurrentAssembly() : null;

        if (assembly) {
            ValeSpec__SvgPreview__Render(assembly);
            return;
        }

        var defaultAssembly  =  {
            'Assembly__Dimensions__Config': {
                'Assembly__Dimensions__Config__WidthMm'  : parseInt(ValeSpec__SvgPreview__WidthSliderEl.value, 10)  || 1800,
                'Assembly__Dimensions__Config__HeightMm' : parseInt(ValeSpec__SvgPreview__HeightSliderEl.value, 10) || 2100
            },
            'Assembly__DoorType__Config': {
                'Assembly__DoorType__Config__Type': 'Outward Opening Double Doors'
            }
        };
        ValeSpec__SvgPreview__Render(defaultAssembly);
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Assembly SVG into Viewport
    // ------------------------------------------------------------
    function ValeSpec__SvgPreview__Render(assemblyData) {
        if (!ValeSpec__SvgPreview__ViewportEl) return;

        var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
        var StateManager    =  window.ValeSpec__AppCore__StateManager;
        var hwIndex         =  StateManager ? StateManager.ValeSpec__StateManager__GetState().hardwareIndex : null;

        if (RenderPipeline && assemblyData) {
            try {
                var svgMarkup  =  RenderPipeline.ValeSpec__RenderPipeline__RenderAssembly(assemblyData, hwIndex);
                ValeSpec__SvgPreview__ViewportEl.innerHTML  =  svgMarkup || '';
                ValeSpec__SvgPreview__BindDimensionClicks();
            } catch (e) {
                ValeSpec__SvgPreview__ViewportEl.innerHTML  =  '<p style="color:var(--Vale_TextSubtle); padding:20px;">SVG render error: ' + e.message + '</p>';
                console.error('[ValeSpec__SvgPreview] Render error:', e);
            }
        } else {
            ValeSpec__SvgPreview__ViewportEl.innerHTML  =  '<p style="color:var(--Vale_TextSubtle); padding:20px;">Select an assembly to preview</p>';
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise SVG Preview
    // ------------------------------------------------------------
    async function ValeSpec__SvgPreview__Init(container) {
        ValeSpec__SvgPreview__ContainerEl  =  container;
        if (!ValeSpec__SvgPreview__ContainerEl) return;

        await ValeSpec__SvgPreview__LoadSliderConfig();
        ValeSpec__SvgPreview__BuildViewport();
        ValeSpec__SvgPreview__BuildSliders();

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
