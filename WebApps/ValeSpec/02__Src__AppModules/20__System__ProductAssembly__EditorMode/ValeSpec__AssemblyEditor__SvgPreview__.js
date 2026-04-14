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
    let _containerEl     =  null;                                           // <-- Parent container from Layout
    let _viewportEl      =  null;                                           // <-- SVG viewport wrapper div
    let _widthSliderEl   =  null;                                           // <-- Width range input
    let _heightSliderEl  =  null;                                           // <-- Height range input
    let _widthValueEl    =  null;                                           // <-- Width numeric display
    let _heightValueEl   =  null;                                           // <-- Height numeric display
    let _sliderConfig    =  null;                                           // <-- Slider limits from config
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Slider Configuration
    // ------------------------------------------------------------
    async function _loadSliderConfig() {
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) return null;
            var data  =  await response.json();
            _sliderConfig  =  data['AssemblyEditor__Slider__Config'] || null;
            return _sliderConfig;
        } catch (e) {
            console.warn('[ValeSpec__SvgPreview] Could not load slider config:', e);
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build SVG Viewport Element
    // ------------------------------------------------------------
    function _buildViewport() {
        _viewportEl  =  document.createElement('div');
        _viewportEl.className  =  'ValeSpec__AssemblyEditor__SvgViewport';
        _viewportEl.id         =  'ValeSpec__AssemblyEditor__SvgViewport';
        _containerEl.appendChild(_viewportEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create Single Slider Group
    // ------------------------------------------------------------
    function _createSliderGroup(labelText, id, cfg) {
        var min      =  (cfg && cfg['Min'])     || 600;
        var max      =  (cfg && cfg['Max'])     || 4000;
        var step     =  (cfg && cfg['Step'])    || 1;
        var defVal   =  (cfg && cfg['Default']) || 1800;

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


    // HELPER FUNCTION | Build Dimension Sliders
    // ------------------------------------------------------------
    function _buildSliders() {
        var wrapper  =  document.createElement('div');
        wrapper.className  =  'ValeSpec__AssemblyEditor__PreviewSliders';

        var widthCfg   =  _sliderConfig ? {
            Min: _sliderConfig['AssemblyEditor__Slider__Config__WidthMinMm']  || 600,
            Max: _sliderConfig['AssemblyEditor__Slider__Config__WidthMaxMm']  || 4000,
            Step: _sliderConfig['AssemblyEditor__Slider__Config__WidthStepMm'] || 1,
            Default: _sliderConfig['AssemblyEditor__Slider__Config__WidthDefaultMm'] || 1800
        } : null;
        var heightCfg  =  _sliderConfig ? {
            Min: _sliderConfig['AssemblyEditor__Slider__Config__HeightMinMm']  || 1800,
            Max: _sliderConfig['AssemblyEditor__Slider__Config__HeightMaxMm']  || 3000,
            Step: _sliderConfig['AssemblyEditor__Slider__Config__HeightStepMm'] || 1,
            Default: _sliderConfig['AssemblyEditor__Slider__Config__HeightDefaultMm'] || 2100
        } : null;

        var widthParts   =  _createSliderGroup('Width (mm)', 'ValeSpec__AssemblyEditor__WidthSlider', widthCfg);
        var heightParts  =  _createSliderGroup('Height (mm)', 'ValeSpec__AssemblyEditor__HeightSlider', heightCfg);

        _widthSliderEl   =  widthParts.input;
        _heightSliderEl  =  heightParts.input;
        _widthValueEl    =  widthParts.valueSpan;
        _heightValueEl   =  heightParts.valueSpan;

        wrapper.appendChild(widthParts.group);
        wrapper.appendChild(heightParts.group);
        _containerEl.appendChild(wrapper);

        _widthSliderEl.addEventListener('input', _onWidthChange);
        _heightSliderEl.addEventListener('input', _onHeightChange);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Width Slider Change
    // ------------------------------------------------------------
    function _onWidthChange() {
        var value  =  parseInt(_widthSliderEl.value, 10);
        _widthValueEl.textContent  =  value + ' mm';
        _pushDimensionUpdate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Height Slider Change
    // ------------------------------------------------------------
    function _onHeightChange() {
        var value  =  parseInt(_heightSliderEl.value, 10);
        _heightValueEl.textContent  =  value + ' mm';
        _pushDimensionUpdate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push Dimension Update to StateManager
    // ------------------------------------------------------------
    function _pushDimensionUpdate() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__Dimensions__Config']) assembly['Assembly__Dimensions__Config'] = {};
        assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__WidthMm']   =  parseInt(_widthSliderEl.value, 10);
        assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__HeightMm']  =  parseInt(_heightSliderEl.value, 10);
        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Assembly SVG into Viewport
    // ------------------------------------------------------------
    function render(assemblyData) {
        if (!_viewportEl) return;

        var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
        var StateManager    =  window.ValeSpec__AppCore__StateManager;
        var hwIndex         =  StateManager ? StateManager.getState().hardwareIndex : null;

        if (RenderPipeline && assemblyData) {
            try {
                var svgMarkup  =  RenderPipeline.renderAssembly(assemblyData, hwIndex);
                _viewportEl.innerHTML  =  svgMarkup || '';
                _bindDimensionClicks();
            } catch (e) {
                _viewportEl.innerHTML  =  '<p style="color:var(--Vale_TextSubtle); padding:20px;">SVG render error: ' + e.message + '</p>';
                console.error('[ValeSpec__SvgPreview] Render error:', e);
            }
        } else {
            _viewportEl.innerHTML  =  '<p style="color:var(--Vale_TextSubtle); padding:20px;">Select an assembly to preview</p>';
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bind Click Handlers to SVG Dimension Text
    // ------------------------------------------------------------
    function _bindDimensionClicks() {
        if (!_viewportEl) return;

        var dimTexts  =  _viewportEl.querySelectorAll('text[data-dimension]');
        for (var i = 0; i < dimTexts.length; i++) {
            dimTexts[i].addEventListener('click', _onDimensionTextClick);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Click on SVG Dimension Text
    // ------------------------------------------------------------
    function _onDimensionTextClick(e) {
        e.stopPropagation();

        var textEl     =  e.currentTarget;
        var dimType    =  textEl.getAttribute('data-dimension');
        var curValue   =  textEl.getAttribute('data-value');

        var rect  =  textEl.getBoundingClientRect();

        var existingInput  =  _viewportEl.parentElement.querySelector('.ValeSpec__AssemblyEditor__DimEditInput');
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

        var containerRect  =  _viewportEl.parentElement.getBoundingClientRect();
        input.style.position  =  'absolute';
        input.style.left      =  (rect.left - containerRect.left + rect.width / 2 - 50) + 'px';
        input.style.top       =  (rect.top  - containerRect.top  + rect.height / 2 - 14) + 'px';
        input.style.width     =  '100px';
        input.style.zIndex    =  '100';

        _viewportEl.parentElement.style.position  =  'relative';
        _viewportEl.parentElement.appendChild(input);

        input.focus();
        input.select();

        function _commitValue() {
            var newVal  =  parseInt(input.value, 10);
            if (isNaN(newVal)) { input.remove(); return; }

            if (dimType === 'width') {
                newVal  =  Math.max(600, Math.min(4000, newVal));
            } else {
                newVal  =  Math.max(1800, Math.min(3000, newVal));
            }

            var StateManager  =  window.ValeSpec__AppCore__StateManager;
            if (!StateManager) { input.remove(); return; }

            var assembly  =  StateManager.getCurrentAssembly();
            if (!assembly) { input.remove(); return; }

            if (!assembly['Assembly__Dimensions__Config']) assembly['Assembly__Dimensions__Config'] = {};

            if (dimType === 'width') {
                assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__WidthMm']  =  newVal;
                if (_widthSliderEl) { _widthSliderEl.value = newVal; _widthValueEl.textContent = newVal + ' mm'; }
            } else {
                assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__HeightMm']  =  newVal;
                if (_heightSliderEl) { _heightSliderEl.value = newVal; _heightValueEl.textContent = newVal + ' mm'; }
            }

            StateManager.updateCurrentAssembly(assembly);
            input.remove();
        }

        input.addEventListener('blur', _commitValue);
        input.addEventListener('keydown', function(ev) {
            if (ev.key === 'Enter')  { ev.preventDefault(); _commitValue(); }
            if (ev.key === 'Escape') { input.remove(); }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Assembly Updated Event
    // ------------------------------------------------------------
    function _onAssemblyUpdated(assemblyData) {
        if (assemblyData && _widthSliderEl && _heightSliderEl) {
            var dims   =  assemblyData['Assembly__Dimensions__Config'] || {};
            var width  =  dims['Assembly__Dimensions__Config__WidthMm']  || _widthSliderEl.value;
            var height =  dims['Assembly__Dimensions__Config__HeightMm'] || _heightSliderEl.value;
            _widthSliderEl.value       =  width;
            _heightSliderEl.value      =  height;
            _widthValueEl.textContent  =  width + ' mm';
            _heightValueEl.textContent =  height + ' mm';
        }
        render(assemblyData);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise SVG Preview
    // ------------------------------------------------------------
    async function init(container) {
        _containerEl  =  container;
        if (!_containerEl) return;

        await _loadSliderConfig();
        _buildViewport();
        _buildSliders();

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.on('assemblyUpdated', _onAssemblyUpdated);
        }

        _doInitialRender();

        console.log('[ValeSpec__SvgPreview] Initialised.');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Perform Initial Render on First Load
    // ------------------------------------------------------------
    function _doInitialRender() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var assembly      =  StateManager ? StateManager.getCurrentAssembly() : null;

        if (assembly) {
            render(assembly);
            return;
        }

        var defaultAssembly  =  {
            'Assembly__Dimensions__Config': {
                'Assembly__Dimensions__Config__WidthMm'  : parseInt(_widthSliderEl.value, 10)  || 1800,
                'Assembly__Dimensions__Config__HeightMm' : parseInt(_heightSliderEl.value, 10) || 2100
            },
            'Assembly__DoorType__Config': {
                'Assembly__DoorType__Config__Type': 'Outward Opening Double Doors'
            }
        };
        render(defaultAssembly);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        init    : init,
        render  : render
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__SvgPreview  =  ValeSpec__AssemblyEditor__SvgPreview;
