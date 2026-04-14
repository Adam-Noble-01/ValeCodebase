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
            } catch (e) {
                _viewportEl.innerHTML  =  '<p style="color:var(--Vale_TextSubtle); padding:20px;">SVG render error: ' + e.message + '</p>';
                console.error('[ValeSpec__SvgPreview] Render error:', e);
            }
        } else {
            _viewportEl.innerHTML  =  '<p style="color:var(--Vale_TextSubtle); padding:20px;">Select an assembly to preview</p>';
        }
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

        console.log('[ValeSpec__SvgPreview] Initialised.');
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
