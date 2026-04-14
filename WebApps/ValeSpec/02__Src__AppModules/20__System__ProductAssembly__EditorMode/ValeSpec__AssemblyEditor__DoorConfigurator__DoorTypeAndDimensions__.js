/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: DOOR TYPE AND DIMENSIONS
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - DoorTypeAndDimensions
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Step 1 (Door Type) and Step 2 (Quantity & Dimensions)
   CREATED    : 2026

   DESCRIPTION:
   - Step 1: Door Type dropdown with full-width layout
   - Step 2: Quantity input, Width + Height inputs with linked range sliders
   - On dimension change: calls HingeCalculator and LockingCalculator
   - Registers summary callbacks with StepManager for collapsed display
   - Auto-advances to next step on primary selection change

   ============================================================================= */

// =============================================================================
// REGION | Door Type and Dimensions Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions = (function() {

    // MODULE CONSTANTS | Config Path
    // ------------------------------------------------------------
    const CONFIG_PATH  =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/Na__AssemblyEditor__Config.json';
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let _step1BodyEl       =  null;                                         // <-- Step 1 card body (Door Type)
    let _step2BodyEl       =  null;                                         // <-- Step 2 card body (Qty & Dims)
    let _doorTypeSelect    =  null;                                         // <-- Door type dropdown
    let _quantityInput     =  null;                                         // <-- Quantity numeric input
    let _widthInput        =  null;                                         // <-- Width numeric input
    let _widthSlider       =  null;                                         // <-- Width range slider
    let _heightInput       =  null;                                         // <-- Height numeric input
    let _heightSlider      =  null;                                         // <-- Height range slider
    let _sliderConfig      =  null;                                         // <-- Slider limits from config
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Slider Configuration
    // ------------------------------------------------------------
    async function _loadConfig() {
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) return;
            var data         =  await response.json();
            _sliderConfig    =  data['AssemblyEditor__Slider__Config'] || null;
        } catch (e) {
            console.warn('[ValeSpec__DoorTypeAndDimensions] Config load failed:', e);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Door Type Options from AppConfig
    // ------------------------------------------------------------
    function _getDoorTypeOptions() {
        var ConfigLoader  =  window.ValeSpec__AppCore__ConfigLoader;
        if (!ConfigLoader) return _getDefaultDoorTypes();

        var section  =  ConfigLoader.getSection('DoorTypeOptions');
        if (!section) return _getDefaultDoorTypes();

        var types  =  section['ValeSpec__DoorType__Options__Config__DoorTypes'];
        if (!types || !types.length) return _getDefaultDoorTypes();

        var result  =  [];
        for (var i = 0; i < types.length; i++) {
            var t  =  types[i];
            result.push({
                Label   : t,
                Value   : t,
                Enabled : (t !== 'Bi Fold Doors' && t !== 'None')
            });
        }
        return result;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Default Door Types Fallback
    // ------------------------------------------------------------
    function _getDefaultDoorTypes() {
        return [
            { Label: 'Outward Opening Double Doors', Value: 'Outward Opening Double Doors', Enabled: true  },
            { Label: 'Inward Opening Double Doors',  Value: 'Inward Opening Double Doors',  Enabled: true  },
            { Label: 'Outward Opening Single Doors', Value: 'Outward Opening Single Doors', Enabled: true  },
            { Label: 'Inward Opening Single Doors',  Value: 'Inward Opening Single Doors',  Enabled: true  },
            { Label: 'Bi Fold Doors (v0.2.0)',       Value: 'Bi Fold Doors',                Enabled: false }
        ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 1 - Door Type
    // ------------------------------------------------------------
    function _buildDoorTypeStep() {
        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var label  =  document.createElement('label');
        label.textContent  =  'Door Type';
        label.setAttribute('for', 'ValeSpec__AssemblyEditor__DoorType');

        _doorTypeSelect     =  document.createElement('select');
        _doorTypeSelect.id  =  'ValeSpec__AssemblyEditor__DoorType';

        var options  =  _getDoorTypeOptions();
        for (var i = 0; i < options.length; i++) {
            var opt        =  document.createElement('option');
            opt.value      =  options[i].Value;
            opt.textContent =  options[i].Label;
            if (!options[i].Enabled) {
                opt.disabled  =  true;
                opt.title     =  'Bi Fold configuration is not yet supported';
            }
            _doorTypeSelect.appendChild(opt);
        }

        _doorTypeSelect.addEventListener('change', _onDoorTypeChange);

        group.appendChild(label);
        group.appendChild(_doorTypeSelect);

        var footerEl  =  _step1BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        _step1BodyEl.insertBefore(group, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 2 - Quantity and Dimensions
    // ------------------------------------------------------------
    function _buildDimensionsStep() {
        var qtyGroup  =  document.createElement('div');
        qtyGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var qtyLabel  =  document.createElement('label');
        qtyLabel.textContent  =  'Quantity';
        qtyLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__Quantity');

        _quantityInput       =  document.createElement('input');
        _quantityInput.type  =  'number';
        _quantityInput.id    =  'ValeSpec__AssemblyEditor__Quantity';
        _quantityInput.min   =  1;
        _quantityInput.max   =  50;
        _quantityInput.value =  1;

        _quantityInput.addEventListener('change', _onQuantityChange);

        qtyGroup.appendChild(qtyLabel);
        qtyGroup.appendChild(_quantityInput);

        var widthCfg   =  _sliderConfig ? {
            Min: _sliderConfig['AssemblyEditor__Slider__Config__WidthMinMm']  || 600,
            Max: _sliderConfig['AssemblyEditor__Slider__Config__WidthMaxMm']  || 4000,
            Step: _sliderConfig['AssemblyEditor__Slider__Config__WidthStepMm'] || 1,
            Default: _sliderConfig['AssemblyEditor__Slider__Config__WidthDefaultMm'] || 1800
        } : {};
        var heightCfg  =  _sliderConfig ? {
            Min: _sliderConfig['AssemblyEditor__Slider__Config__HeightMinMm']  || 1800,
            Max: _sliderConfig['AssemblyEditor__Slider__Config__HeightMaxMm']  || 3000,
            Step: _sliderConfig['AssemblyEditor__Slider__Config__HeightStepMm'] || 1,
            Default: _sliderConfig['AssemblyEditor__Slider__Config__HeightDefaultMm'] || 2100
        } : {};

        var wMin  =  (widthCfg  && widthCfg['Min'])     || 600;
        var wMax  =  (widthCfg  && widthCfg['Max'])     || 4000;
        var wStep =  (widthCfg  && widthCfg['Step'])    || 1;
        var wDef  =  (widthCfg  && widthCfg['Default']) || 1800;
        var hMin  =  (heightCfg && heightCfg['Min'])     || 1800;
        var hMax  =  (heightCfg && heightCfg['Max'])     || 3000;
        var hStep =  (heightCfg && heightCfg['Step'])    || 1;
        var hDef  =  (heightCfg && heightCfg['Default']) || 2100;

        var dimsRow  =  document.createElement('div');
        dimsRow.className  =  'ValeSpec__AssemblyEditor__FormRow';

        var widthGroup  =  document.createElement('div');
        widthGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var widthLabel  =  document.createElement('label');
        widthLabel.textContent  =  'Width (mm)';

        _widthInput       =  document.createElement('input');
        _widthInput.type  =  'number';
        _widthInput.id    =  'ValeSpec__AssemblyEditor__WidthInput';
        _widthInput.min   =  wMin;
        _widthInput.max   =  wMax;
        _widthInput.step  =  wStep;
        _widthInput.value =  wDef;

        _widthSlider       =  document.createElement('input');
        _widthSlider.type  =  'range';
        _widthSlider.id    =  'ValeSpec__AssemblyEditor__WidthRange';
        _widthSlider.min   =  wMin;
        _widthSlider.max   =  wMax;
        _widthSlider.step  =  wStep;
        _widthSlider.value =  wDef;

        widthGroup.appendChild(widthLabel);
        widthGroup.appendChild(_widthInput);
        widthGroup.appendChild(_widthSlider);

        var heightGroup  =  document.createElement('div');
        heightGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var heightLabel  =  document.createElement('label');
        heightLabel.textContent  =  'Height (mm)';

        _heightInput       =  document.createElement('input');
        _heightInput.type  =  'number';
        _heightInput.id    =  'ValeSpec__AssemblyEditor__HeightInput';
        _heightInput.min   =  hMin;
        _heightInput.max   =  hMax;
        _heightInput.step  =  hStep;
        _heightInput.value =  hDef;

        _heightSlider       =  document.createElement('input');
        _heightSlider.type  =  'range';
        _heightSlider.id    =  'ValeSpec__AssemblyEditor__HeightRange';
        _heightSlider.min   =  hMin;
        _heightSlider.max   =  hMax;
        _heightSlider.step  =  hStep;
        _heightSlider.value =  hDef;

        heightGroup.appendChild(heightLabel);
        heightGroup.appendChild(_heightInput);
        heightGroup.appendChild(_heightSlider);

        dimsRow.appendChild(widthGroup);
        dimsRow.appendChild(heightGroup);

        _widthInput.addEventListener('input', function() {
            _widthSlider.value  =  _widthInput.value;
            _onDimensionChange();
        });
        _widthSlider.addEventListener('input', function() {
            _widthInput.value  =  _widthSlider.value;
            _onDimensionChange();
        });
        _heightInput.addEventListener('input', function() {
            _heightSlider.value  =  _heightInput.value;
            _onDimensionChange();
        });
        _heightSlider.addEventListener('input', function() {
            _heightInput.value  =  _heightSlider.value;
            _onDimensionChange();
        });

        var footerEl  =  _step2BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        _step2BodyEl.insertBefore(qtyGroup, footerEl);
        _step2BodyEl.insertBefore(dimsRow, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Door Type Change
    // ------------------------------------------------------------
    function _onDoorTypeChange() {
        _onDimensionChange();

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) {
            StepManager.advanceFromStep('doorType');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Quantity Change
    // ------------------------------------------------------------
    function _onQuantityChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;
        assembly['Quantity']  =  parseInt(_quantityInput.value, 10);
        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Dimension Change - Recalculate Hinges and Locking
    // ------------------------------------------------------------
    function _onDimensionChange() {
        var StateManager       =  window.ValeSpec__AppCore__StateManager;
        var HingeCalculator    =  window.ValeSpec__MathUtils__HingeCalculator;
        var LockingCalculator  =  window.ValeSpec__MathUtils__LockingCalculator;
        if (!StateManager) return;

        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;

        var doorType  =  _doorTypeSelect ? _doorTypeSelect.value : '';
        var width     =  _widthInput  ? parseInt(_widthInput.value, 10)  : 1800;
        var height    =  _heightInput ? parseInt(_heightInput.value, 10) : 2100;

        if (!assembly['Assembly__DoorType__Config']) assembly['Assembly__DoorType__Config'] = {};
        assembly['Assembly__DoorType__Config']['Assembly__DoorType__Config__Type']  =  doorType;

        if (_quantityInput) {
            assembly['Assembly__DoorType__Config']['Assembly__DoorType__Config__Quantity']  =  parseInt(_quantityInput.value, 10);
        }

        if (!assembly['Assembly__Dimensions__Config']) assembly['Assembly__Dimensions__Config'] = {};
        assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__WidthMm']   =  width;
        assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__HeightMm']  =  height;

        if (HingeCalculator) {
            var hingeResult  =  HingeCalculator.calculateHingesPerLeaf(doorType, width, height);
            if (!assembly['Assembly__Hinge__Config']) assembly['Assembly__Hinge__Config'] = {};
            assembly['Assembly__Hinge__Config']['Assembly__Hinge__Config__HingesPerLeaf']  =  hingeResult.count;
            assembly['Assembly__Hinge__Config']['Assembly__Hinge__Config__Hanging']        =  hingeResult.hanging;
        }

        if (LockingCalculator) {
            var lockResult  =  LockingCalculator.calculateLocking(doorType, height);
            if (!assembly['Assembly__Locking__Config']) assembly['Assembly__Locking__Config'] = {};
            assembly['Assembly__Locking__Config']['Assembly__Locking__Config__Points']  =  lockResult.points;
            assembly['Assembly__Locking__Config']['Assembly__Locking__Config__Type']    =  lockResult.type;
        }

        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 1 (Door Type)
    // ------------------------------------------------------------
    function _doorTypeSummary() {
        var val  =  _doorTypeSelect ? _doorTypeSelect.value : '';
        return val || 'Not selected';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 2 (Qty & Dims)
    // ------------------------------------------------------------
    function _dimensionsSummary() {
        var qty  =  _quantityInput ? _quantityInput.value : '1';
        var w    =  _widthInput    ? _widthInput.value    : '1800';
        var h    =  _heightInput   ? _heightInput.value   : '2100';
        return qty + 'x  |  ' + w + ' x ' + h + ' mm';
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function refreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var doorCfg  =  assemblyData['Assembly__DoorType__Config']   || {};
        var dimsCfg  =  assemblyData['Assembly__Dimensions__Config'] || {};

        var doorType  =  doorCfg['Assembly__DoorType__Config__Type']       || '';
        var quantity  =  doorCfg['Assembly__DoorType__Config__Quantity']    || 1;
        var width     =  dimsCfg['Assembly__Dimensions__Config__WidthMm']  || 1800;
        var height    =  dimsCfg['Assembly__Dimensions__Config__HeightMm'] || 2100;

        if (_doorTypeSelect) _doorTypeSelect.value  =  doorType;
        if (_quantityInput)  _quantityInput.value   =  quantity;
        if (_widthInput)  { _widthInput.value   =  width;  _widthSlider.value  =  width;  }
        if (_heightInput) { _heightInput.value  =  height; _heightSlider.value =  height; }
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summaries with StepManager
    // ------------------------------------------------------------
    function _registerSummaries() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        StepManager.registerSummary('doorType',   _doorTypeSummary);
        StepManager.registerSummary('dimensions', _dimensionsSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Door Type and Dimensions Steps
    // ------------------------------------------------------------
    async function init(step1BodyEl, step2BodyEl) {
        _step1BodyEl  =  step1BodyEl;
        _step2BodyEl  =  step2BodyEl;
        if (!_step1BodyEl || !_step2BodyEl) return;

        await _loadConfig();
        _buildDoorTypeStep();
        _buildDimensionsStep();
        _registerSummaries();

        console.log('[ValeSpec__DoorTypeAndDimensions] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        init                 : init,
        refreshFromAssembly  : refreshFromAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions  =  ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions;
