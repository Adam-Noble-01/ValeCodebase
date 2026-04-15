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
    let ValeSpec__DoorTypeAndDimensions__Step1BodyEl    =  null;   // <-- Step 1 card body (Door Type)
    let ValeSpec__DoorTypeAndDimensions__Step2BodyEl    =  null;   // <-- Step 2 card body (Qty & Dims)
    let ValeSpec__DoorTypeAndDimensions__DoorTypeSelect =  null;   // <-- Door type dropdown
    let ValeSpec__DoorTypeAndDimensions__QuantityInput  =  null;   // <-- Quantity numeric input
    let ValeSpec__DoorTypeAndDimensions__WidthInput     =  null;   // <-- Width numeric input
    let ValeSpec__DoorTypeAndDimensions__WidthSlider    =  null;   // <-- Width range slider
    let ValeSpec__DoorTypeAndDimensions__HeightInput    =  null;   // <-- Height numeric input
    let ValeSpec__DoorTypeAndDimensions__HeightSlider   =  null;   // <-- Height range slider
    let ValeSpec__DoorTypeAndDimensions__SliderConfig   =  null;   // <-- Slider limits from config
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Slider Configuration
    // ------------------------------------------------------------
    async function ValeSpec__DoorTypeAndDimensions__LoadConfig() {
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) return;
            var data  =  await response.json();
            ValeSpec__DoorTypeAndDimensions__SliderConfig  =  data['AssemblyEditor__Slider__Config'] || null;
        } catch (e) {
            console.warn('[ValeSpec__DoorTypeAndDimensions] Config load failed:', e);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Door Type Options from AppConfig
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__GetDoorTypeOptions() {
        var ConfigLoader  =  window.ValeSpec__AppCore__ConfigLoader;
        if (!ConfigLoader) return ValeSpec__DoorTypeAndDimensions__GetDefaultDoorTypes();

        var section  =  ConfigLoader.ValeSpec__ConfigLoader__GetSection('DoorTypeOptions');
        if (!section) return ValeSpec__DoorTypeAndDimensions__GetDefaultDoorTypes();

        var types  =  section['ValeSpec__DoorType__Options__Config__DoorTypes'];
        if (!types || !types.length) return ValeSpec__DoorTypeAndDimensions__GetDefaultDoorTypes();

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
    function ValeSpec__DoorTypeAndDimensions__GetDefaultDoorTypes() {
        return [
            { Label: 'Outward Opening Double Doors', Value: 'Outward Opening Double Doors', Enabled: true  },
            { Label: 'Inward Opening Double Doors',  Value: 'Inward Opening Double Doors',  Enabled: true  },
            { Label: 'Outward Opening Single Doors', Value: 'Outward Opening Single Doors', Enabled: true  },
            { Label: 'Inward Opening Single Doors',  Value: 'Inward Opening Single Doors',  Enabled: true  },
            { Label: 'Bi Fold Doors (v0.2.0)',       Value: 'Bi Fold Doors',                Enabled: false }
        ];
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Dimension Change - Recalculate Hinges and Locking
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__OnDimensionChange() {
        var StateManager       =  window.ValeSpec__AppCore__StateManager;
        var HingeCalculator    =  window.ValeSpec__MathUtils__HingeCalculator;
        var LockingCalculator  =  window.ValeSpec__MathUtils__LockingCalculator;
        if (!StateManager) return;

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        var doorType  =  ValeSpec__DoorTypeAndDimensions__DoorTypeSelect ? ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.value : '';
        var width     =  ValeSpec__DoorTypeAndDimensions__WidthInput  ? parseInt(ValeSpec__DoorTypeAndDimensions__WidthInput.value, 10)  : 1800;
        var height    =  ValeSpec__DoorTypeAndDimensions__HeightInput ? parseInt(ValeSpec__DoorTypeAndDimensions__HeightInput.value, 10) : 2100;

        if (!assembly['Assembly__DoorType__Config']) assembly['Assembly__DoorType__Config'] = {};
        assembly['Assembly__DoorType__Config']['Assembly__DoorType__Config__Type']  =  doorType;

        if (ValeSpec__DoorTypeAndDimensions__QuantityInput) {
            assembly['Assembly__DoorType__Config']['Assembly__DoorType__Config__Quantity']  =  parseInt(ValeSpec__DoorTypeAndDimensions__QuantityInput.value, 10);
        }

        if (!assembly['Assembly__Dimensions__Config']) assembly['Assembly__Dimensions__Config'] = {};
        assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__WidthMm']   =  width;
        assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__HeightMm']  =  height;

        if (HingeCalculator) {
            var hingeResult  =  HingeCalculator.ValeSpec__HingeCalculator__CalculateHingesPerLeaf(doorType, width, height);
            if (!assembly['Assembly__Hinge__Config']) assembly['Assembly__Hinge__Config'] = {};
            assembly['Assembly__Hinge__Config']['Assembly__Hinge__Config__HingesPerLeaf']  =  hingeResult.count;
            assembly['Assembly__Hinge__Config']['Assembly__Hinge__Config__Hanging']        =  hingeResult.hanging;
        }

        if (LockingCalculator) {
            var lockResult  =  LockingCalculator.ValeSpec__LockingCalculator__CalculateLocking(doorType, height);
            if (!assembly['Assembly__Locking__Config']) assembly['Assembly__Locking__Config'] = {};
            assembly['Assembly__Locking__Config']['Assembly__Locking__Config__Points']  =  lockResult.points;
            assembly['Assembly__Locking__Config']['Assembly__Locking__Config__Type']    =  lockResult.type;
        }

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Door Type Change
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__OnDoorTypeChange() {
        ValeSpec__DoorTypeAndDimensions__OnDimensionChange();

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) {
            StepManager.ValeSpec__StepManager__AdvanceFromStep('doorType');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Quantity Change
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__OnQuantityChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;
        assembly['Quantity']  =  parseInt(ValeSpec__DoorTypeAndDimensions__QuantityInput.value, 10);
        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 1 - Door Type
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__BuildDoorTypeStep() {
        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var label  =  document.createElement('label');
        label.textContent  =  'Door Type';
        label.setAttribute('for', 'ValeSpec__AssemblyEditor__DoorType');

        ValeSpec__DoorTypeAndDimensions__DoorTypeSelect     =  document.createElement('select');
        ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.id  =  'ValeSpec__AssemblyEditor__DoorType';

        var options  =  ValeSpec__DoorTypeAndDimensions__GetDoorTypeOptions();
        for (var i = 0; i < options.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  options[i].Value;
            opt.textContent  =  options[i].Label;
            if (!options[i].Enabled) {
                opt.disabled  =  true;
                opt.title     =  'Bi Fold configuration is not yet supported';
            }
            ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.appendChild(opt);
        }

        ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.addEventListener('change', ValeSpec__DoorTypeAndDimensions__OnDoorTypeChange);

        group.appendChild(label);
        group.appendChild(ValeSpec__DoorTypeAndDimensions__DoorTypeSelect);

        var footerEl  =  ValeSpec__DoorTypeAndDimensions__Step1BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__DoorTypeAndDimensions__Step1BodyEl.insertBefore(group, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 2 - Quantity and Dimensions
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__BuildDimensionsStep() {
        var cfg    =  ValeSpec__DoorTypeAndDimensions__SliderConfig;

        var wMin   =  (cfg && cfg['AssemblyEditor__Slider__Config__WidthMinMm'])     || 600;
        var wMax   =  (cfg && cfg['AssemblyEditor__Slider__Config__WidthMaxMm'])     || 4000;
        var wStep  =  (cfg && cfg['AssemblyEditor__Slider__Config__WidthStepMm'])    || 1;
        var wDef   =  (cfg && cfg['AssemblyEditor__Slider__Config__WidthDefaultMm']) || 1800;
        var hMin   =  (cfg && cfg['AssemblyEditor__Slider__Config__HeightMinMm'])     || 1800;
        var hMax   =  (cfg && cfg['AssemblyEditor__Slider__Config__HeightMaxMm'])     || 3000;
        var hStep  =  (cfg && cfg['AssemblyEditor__Slider__Config__HeightStepMm'])    || 1;
        var hDef   =  (cfg && cfg['AssemblyEditor__Slider__Config__HeightDefaultMm']) || 2100;

        var qtyGroup  =  document.createElement('div');
        qtyGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var qtyLabel  =  document.createElement('label');
        qtyLabel.textContent  =  'Quantity';
        qtyLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__Quantity');

        ValeSpec__DoorTypeAndDimensions__QuantityInput       =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__QuantityInput.type  =  'number';
        ValeSpec__DoorTypeAndDimensions__QuantityInput.id    =  'ValeSpec__AssemblyEditor__Quantity';
        ValeSpec__DoorTypeAndDimensions__QuantityInput.min   =  1;
        ValeSpec__DoorTypeAndDimensions__QuantityInput.max   =  50;
        ValeSpec__DoorTypeAndDimensions__QuantityInput.value =  1;

        ValeSpec__DoorTypeAndDimensions__QuantityInput.addEventListener('change', ValeSpec__DoorTypeAndDimensions__OnQuantityChange);

        qtyGroup.appendChild(qtyLabel);
        qtyGroup.appendChild(ValeSpec__DoorTypeAndDimensions__QuantityInput);

        var dimsRow  =  document.createElement('div');
        dimsRow.className  =  'ValeSpec__AssemblyEditor__FormRow';

        var widthGroup  =  document.createElement('div');
        widthGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var widthLabel  =  document.createElement('label');
        widthLabel.textContent  =  'Width (mm)';

        ValeSpec__DoorTypeAndDimensions__WidthInput       =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__WidthInput.type  =  'number';
        ValeSpec__DoorTypeAndDimensions__WidthInput.id    =  'ValeSpec__AssemblyEditor__WidthInput';
        ValeSpec__DoorTypeAndDimensions__WidthInput.min   =  wMin;
        ValeSpec__DoorTypeAndDimensions__WidthInput.max   =  wMax;
        ValeSpec__DoorTypeAndDimensions__WidthInput.step  =  wStep;
        ValeSpec__DoorTypeAndDimensions__WidthInput.value =  wDef;

        ValeSpec__DoorTypeAndDimensions__WidthSlider       =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__WidthSlider.type  =  'range';
        ValeSpec__DoorTypeAndDimensions__WidthSlider.id    =  'ValeSpec__AssemblyEditor__WidthRange';
        ValeSpec__DoorTypeAndDimensions__WidthSlider.min   =  wMin;
        ValeSpec__DoorTypeAndDimensions__WidthSlider.max   =  wMax;
        ValeSpec__DoorTypeAndDimensions__WidthSlider.step  =  wStep;
        ValeSpec__DoorTypeAndDimensions__WidthSlider.value =  wDef;

        widthGroup.appendChild(widthLabel);
        widthGroup.appendChild(ValeSpec__DoorTypeAndDimensions__WidthInput);
        widthGroup.appendChild(ValeSpec__DoorTypeAndDimensions__WidthSlider);

        var heightGroup  =  document.createElement('div');
        heightGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var heightLabel  =  document.createElement('label');
        heightLabel.textContent  =  'Height (mm)';

        ValeSpec__DoorTypeAndDimensions__HeightInput       =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__HeightInput.type  =  'number';
        ValeSpec__DoorTypeAndDimensions__HeightInput.id    =  'ValeSpec__AssemblyEditor__HeightInput';
        ValeSpec__DoorTypeAndDimensions__HeightInput.min   =  hMin;
        ValeSpec__DoorTypeAndDimensions__HeightInput.max   =  hMax;
        ValeSpec__DoorTypeAndDimensions__HeightInput.step  =  hStep;
        ValeSpec__DoorTypeAndDimensions__HeightInput.value =  hDef;

        ValeSpec__DoorTypeAndDimensions__HeightSlider       =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__HeightSlider.type  =  'range';
        ValeSpec__DoorTypeAndDimensions__HeightSlider.id    =  'ValeSpec__AssemblyEditor__HeightRange';
        ValeSpec__DoorTypeAndDimensions__HeightSlider.min   =  hMin;
        ValeSpec__DoorTypeAndDimensions__HeightSlider.max   =  hMax;
        ValeSpec__DoorTypeAndDimensions__HeightSlider.step  =  hStep;
        ValeSpec__DoorTypeAndDimensions__HeightSlider.value =  hDef;

        heightGroup.appendChild(heightLabel);
        heightGroup.appendChild(ValeSpec__DoorTypeAndDimensions__HeightInput);
        heightGroup.appendChild(ValeSpec__DoorTypeAndDimensions__HeightSlider);

        dimsRow.appendChild(widthGroup);
        dimsRow.appendChild(heightGroup);

        ValeSpec__DoorTypeAndDimensions__WidthInput.addEventListener('input', function() {
            ValeSpec__DoorTypeAndDimensions__WidthSlider.value  =  ValeSpec__DoorTypeAndDimensions__WidthInput.value;
            ValeSpec__DoorTypeAndDimensions__OnDimensionChange();
        });
        ValeSpec__DoorTypeAndDimensions__WidthSlider.addEventListener('input', function() {
            ValeSpec__DoorTypeAndDimensions__WidthInput.value  =  ValeSpec__DoorTypeAndDimensions__WidthSlider.value;
            ValeSpec__DoorTypeAndDimensions__OnDimensionChange();
        });
        ValeSpec__DoorTypeAndDimensions__HeightInput.addEventListener('input', function() {
            ValeSpec__DoorTypeAndDimensions__HeightSlider.value  =  ValeSpec__DoorTypeAndDimensions__HeightInput.value;
            ValeSpec__DoorTypeAndDimensions__OnDimensionChange();
        });
        ValeSpec__DoorTypeAndDimensions__HeightSlider.addEventListener('input', function() {
            ValeSpec__DoorTypeAndDimensions__HeightInput.value  =  ValeSpec__DoorTypeAndDimensions__HeightSlider.value;
            ValeSpec__DoorTypeAndDimensions__OnDimensionChange();
        });

        var footerEl  =  ValeSpec__DoorTypeAndDimensions__Step2BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__DoorTypeAndDimensions__Step2BodyEl.insertBefore(qtyGroup, footerEl);
        ValeSpec__DoorTypeAndDimensions__Step2BodyEl.insertBefore(dimsRow, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 1 (Door Type)
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__DoorTypeSummary() {
        var val  =  ValeSpec__DoorTypeAndDimensions__DoorTypeSelect ? ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.value : '';
        return val || 'Not selected';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 2 (Qty & Dims)
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__DimensionsSummary() {
        var qty  =  ValeSpec__DoorTypeAndDimensions__QuantityInput ? ValeSpec__DoorTypeAndDimensions__QuantityInput.value : '1';
        var w    =  ValeSpec__DoorTypeAndDimensions__WidthInput    ? ValeSpec__DoorTypeAndDimensions__WidthInput.value    : '1800';
        var h    =  ValeSpec__DoorTypeAndDimensions__HeightInput   ? ValeSpec__DoorTypeAndDimensions__HeightInput.value   : '2100';
        return qty + 'x  |  ' + w + ' x ' + h + ' mm';
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var doorCfg  =  assemblyData['Assembly__DoorType__Config']   || {};
        var dimsCfg  =  assemblyData['Assembly__Dimensions__Config'] || {};

        var doorType  =  doorCfg['Assembly__DoorType__Config__Type']       || '';
        var quantity  =  doorCfg['Assembly__DoorType__Config__Quantity']    || 1;
        var width     =  dimsCfg['Assembly__Dimensions__Config__WidthMm']  || 1800;
        var height    =  dimsCfg['Assembly__Dimensions__Config__HeightMm'] || 2100;

        if (ValeSpec__DoorTypeAndDimensions__DoorTypeSelect) ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.value  =  doorType;
        if (ValeSpec__DoorTypeAndDimensions__QuantityInput)  ValeSpec__DoorTypeAndDimensions__QuantityInput.value   =  quantity;
        if (ValeSpec__DoorTypeAndDimensions__WidthInput)  { ValeSpec__DoorTypeAndDimensions__WidthInput.value   =  width;  ValeSpec__DoorTypeAndDimensions__WidthSlider.value  =  width;  }
        if (ValeSpec__DoorTypeAndDimensions__HeightInput) { ValeSpec__DoorTypeAndDimensions__HeightInput.value  =  height; ValeSpec__DoorTypeAndDimensions__HeightSlider.value =  height; }
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summaries with StepManager
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__RegisterSummaries() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        StepManager.ValeSpec__StepManager__RegisterSummary('doorType',   ValeSpec__DoorTypeAndDimensions__DoorTypeSummary);
        StepManager.ValeSpec__StepManager__RegisterSummary('dimensions', ValeSpec__DoorTypeAndDimensions__DimensionsSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Door Type and Dimensions Steps
    // ------------------------------------------------------------
    async function ValeSpec__DoorTypeAndDimensions__Init(step1BodyEl, step2BodyEl) {
        ValeSpec__DoorTypeAndDimensions__Step1BodyEl  =  step1BodyEl;
        ValeSpec__DoorTypeAndDimensions__Step2BodyEl  =  step2BodyEl;
        if (!ValeSpec__DoorTypeAndDimensions__Step1BodyEl || !ValeSpec__DoorTypeAndDimensions__Step2BodyEl) return;

        await ValeSpec__DoorTypeAndDimensions__LoadConfig();
        ValeSpec__DoorTypeAndDimensions__BuildDoorTypeStep();
        ValeSpec__DoorTypeAndDimensions__BuildDimensionsStep();
        ValeSpec__DoorTypeAndDimensions__RegisterSummaries();

        console.log('[ValeSpec__DoorTypeAndDimensions] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__DoorTypeAndDimensions__Init                : ValeSpec__DoorTypeAndDimensions__Init,
        ValeSpec__DoorTypeAndDimensions__RefreshFromAssembly : ValeSpec__DoorTypeAndDimensions__RefreshFromAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions  =  ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions;
