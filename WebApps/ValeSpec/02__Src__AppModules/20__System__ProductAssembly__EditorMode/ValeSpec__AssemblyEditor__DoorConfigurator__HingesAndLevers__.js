/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: HINGES AND LEVERS
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - HingesAndLevers
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Step 3 (Hinge Projection) and Step 4 (Lever Specification)
   CREATED    : 2026

   DESCRIPTION:
   - Step 3: Hinge Projection dropdown (4/5/6/8 inch options)
   - Step 4: Lever Type dropdown (global), Lever Height input, Handing prompt
   - Selecting 8-inch projection triggers WarningSystem
   - Single Door handing prompt (Left/Right radio buttons)
   - Lever selection is global — applies to all assemblies
   - Registers summary callbacks with StepManager

   ============================================================================= */

// =============================================================================
// REGION | Hinges and Levers Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers = (function() {

    // MODULE CONSTANTS | Hinge Projection Options
    // ------------------------------------------------------------
    const HINGE_PROJECTIONS  =  [
        { Label: '4 inch',  Value: 4 },
        { Label: '5 inch',  Value: 5 },
        { Label: '6 inch',  Value: 6 },
        { Label: '8 inch',  Value: 8 }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let _step3BodyEl          =  null;                                      // <-- Step 3 card body (Hinges)
    let _step4BodyEl          =  null;                                      // <-- Step 4 card body (Levers)
    let _hingeProjectionSel   =  null;                                      // <-- Hinge projection dropdown
    let _leverTypeSelect      =  null;                                      // <-- Lever type dropdown
    let _leverHeightInput     =  null;                                      // <-- Lever height numeric input
    let _handingPromptEl      =  null;                                      // <-- Handing prompt container
    let _handingLeftRadio     =  null;                                      // <-- Left-hand radio button
    let _handingRightRadio    =  null;                                      // <-- Right-hand radio button
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Lever Type Options from Hardware Index
    // ------------------------------------------------------------
    function _getLeverTypeOptions() {
        var HwLoader  =  window.ValeSpec__AppData__HardwareIndexLoader;
        if (HwLoader) {
            var handles  =  HwLoader.getAllLeverHandles();
            if (handles && handles.length > 0) {
                var result  =  [];
                for (var i = 0; i < handles.length; i++) {
                    var name  =  handles[i]['HardwareItem__Name'] || '';
                    if (name) {
                        result.push({ Label: name, Value: name });
                    }
                }
                if (result.length > 0) return result;
            }
        }

        return [
            { Label: 'Scroll Lever Handle',  Value: 'Scroll Lever Handle'  },
            { Label: 'Plain Lever Handle',   Value: 'Plain Lever Handle'   },
            { Label: 'Newton Lever Handle',  Value: 'Newton Lever Handle'  }
        ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 3 - Hinge Projection
    // ------------------------------------------------------------
    function _buildHingeStep() {
        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var label  =  document.createElement('label');
        label.textContent  =  'Hinge Projection';
        label.setAttribute('for', 'ValeSpec__AssemblyEditor__HingeProjection');

        _hingeProjectionSel     =  document.createElement('select');
        _hingeProjectionSel.id  =  'ValeSpec__AssemblyEditor__HingeProjection';

        for (var i = 0; i < HINGE_PROJECTIONS.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  HINGE_PROJECTIONS[i].Value;
            opt.textContent  =  HINGE_PROJECTIONS[i].Label;
            _hingeProjectionSel.appendChild(opt);
        }

        _hingeProjectionSel.addEventListener('change', _onHingeProjectionChange);

        group.appendChild(label);
        group.appendChild(_hingeProjectionSel);

        var footerEl  =  _step3BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        _step3BodyEl.insertBefore(group, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 4 - Lever Specification
    // ------------------------------------------------------------
    function _buildLeverStep() {
        var leverGroup  =  document.createElement('div');
        leverGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var leverLabel  =  document.createElement('label');
        leverLabel.textContent  =  'Lever Type';
        leverLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__LeverType');

        _leverTypeSelect     =  document.createElement('select');
        _leverTypeSelect.id  =  'ValeSpec__AssemblyEditor__LeverType';

        var leverOptions  =  _getLeverTypeOptions();
        for (var i = 0; i < leverOptions.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  leverOptions[i].Value;
            opt.textContent  =  leverOptions[i].Label;
            _leverTypeSelect.appendChild(opt);
        }

        _leverTypeSelect.addEventListener('change', _onLeverTypeChange);

        leverGroup.appendChild(leverLabel);
        leverGroup.appendChild(_leverTypeSelect);

        var heightGroup  =  document.createElement('div');
        heightGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';
        heightGroup.style.marginTop  =  '12px';

        var heightLabel  =  document.createElement('label');
        heightLabel.textContent  =  'Lever Height (mm)';
        heightLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__LeverHeight');

        _leverHeightInput       =  document.createElement('input');
        _leverHeightInput.type  =  'number';
        _leverHeightInput.id    =  'ValeSpec__AssemblyEditor__LeverHeight';
        _leverHeightInput.min   =  800;
        _leverHeightInput.max   =  1200;
        _leverHeightInput.value =  1000;

        _leverHeightInput.addEventListener('change', _onLeverHeightChange);

        heightGroup.appendChild(heightLabel);
        heightGroup.appendChild(_leverHeightInput);

        _handingPromptEl  =  document.createElement('div');
        _handingPromptEl.className  =  'ValeSpec__AssemblyEditor__HandingPrompt';
        _handingPromptEl.id         =  'ValeSpec__AssemblyEditor__HandingPrompt';

        var handingLabel  =  document.createElement('span');
        handingLabel.textContent    =  'Handing:';
        handingLabel.style.fontSize =  '0.78rem';

        var leftLabel  =  document.createElement('label');
        _handingLeftRadio       =  document.createElement('input');
        _handingLeftRadio.type  =  'radio';
        _handingLeftRadio.name  =  'ValeSpec__AssemblyEditor__Handing';
        _handingLeftRadio.value =  'Left';
        leftLabel.appendChild(_handingLeftRadio);
        leftLabel.appendChild(document.createTextNode(' Left'));

        var rightLabel  =  document.createElement('label');
        _handingRightRadio       =  document.createElement('input');
        _handingRightRadio.type  =  'radio';
        _handingRightRadio.name  =  'ValeSpec__AssemblyEditor__Handing';
        _handingRightRadio.value =  'Right';
        _handingRightRadio.checked  =  true;
        rightLabel.appendChild(_handingRightRadio);
        rightLabel.appendChild(document.createTextNode(' Right'));

        _handingPromptEl.appendChild(handingLabel);
        _handingPromptEl.appendChild(leftLabel);
        _handingPromptEl.appendChild(rightLabel);

        _handingLeftRadio.addEventListener('change', _onHandingChange);
        _handingRightRadio.addEventListener('change', _onHandingChange);

        var footerEl  =  _step4BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        _step4BodyEl.insertBefore(leverGroup, footerEl);
        _step4BodyEl.insertBefore(heightGroup, footerEl);
        _step4BodyEl.insertBefore(_handingPromptEl, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Hinge Projection Change
    // ------------------------------------------------------------
    function _onHingeProjectionChange() {
        var value  =  parseInt(_hingeProjectionSel.value, 10);

        if (value === 8) {
            var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
            if (WarningSystem) {
                WarningSystem.showHingeProjectionWarning().then(function(confirmed) {
                    if (!confirmed) {
                        _hingeProjectionSel.value  =  5;
                    }
                    _updateAssemblyHinge();
                });
                return;
            }
        }

        _updateAssemblyHinge();

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) {
            StepManager.advanceFromStep('hinges');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Assembly Hinge Projection
    // ------------------------------------------------------------
    function _updateAssemblyHinge() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;
        assembly['HingeProjection']  =  parseInt(_hingeProjectionSel.value, 10);
        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Lever Type Change (Global + Assembly)
    // ------------------------------------------------------------
    function _onLeverTypeChange() {
        var leverName     =  _leverTypeSelect.value;
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.setGlobalLeverType(leverName);

        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__Lever__Config']) assembly['Assembly__Lever__Config'] = {};
        assembly['Assembly__Lever__Config']['Assembly__Lever__Config__Type']      =  leverName;
        assembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm']  =  parseInt(_leverHeightInput.value, 10) || 1000;

        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Lever Height Change
    // ------------------------------------------------------------
    function _onLeverHeightChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__Lever__Config']) assembly['Assembly__Lever__Config'] = {};
        assembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm']  =  parseInt(_leverHeightInput.value, 10);

        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Handing Radio Change
    // ------------------------------------------------------------
    function _onHandingChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;
        assembly['Handing']  =  _handingLeftRadio.checked ? 'Left' : 'Right';
        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Handing Prompt Visibility
    // ------------------------------------------------------------
    function _updateHandingVisibility(doorType) {
        if (!_handingPromptEl) return;
        var isSingle  =  doorType && doorType.indexOf('Single') !== -1;
        if (isSingle) {
            _handingPromptEl.classList.add('ValeSpec__AssemblyEditor__HandingPrompt--visible');
        } else {
            _handingPromptEl.classList.remove('ValeSpec__AssemblyEditor__HandingPrompt--visible');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 3 (Hinges)
    // ------------------------------------------------------------
    function _hingeSummary() {
        var val  =  _hingeProjectionSel ? _hingeProjectionSel.value : '';
        return val ? val + ' inch projection' : 'Not set';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 4 (Levers)
    // ------------------------------------------------------------
    function _leverSummary() {
        var type    =  _leverTypeSelect   ? _leverTypeSelect.options[_leverTypeSelect.selectedIndex].text : '';
        var height  =  _leverHeightInput  ? _leverHeightInput.value : '1000';
        return type + '  |  ' + height + ' mm';
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function refreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var hingeCfg   =  assemblyData['Assembly__Hinge__Config']    || {};
        var leverCfg   =  assemblyData['Assembly__Lever__Config']    || {};
        var doorCfg    =  assemblyData['Assembly__DoorType__Config'] || {};

        if (_hingeProjectionSel && hingeCfg['Assembly__Hinge__Config__Projection'] !== undefined) {
            _hingeProjectionSel.value  =  hingeCfg['Assembly__Hinge__Config__Projection'];
        }

        if (_leverHeightInput) {
            _leverHeightInput.value  =  leverCfg['Assembly__Lever__Config__HeightMm'] || 1000;
        }

        var leverType  =  leverCfg['Assembly__Lever__Config__Type'] || '';
        if (_leverTypeSelect && leverType) {
            _leverTypeSelect.value  =  leverType;
        } else {
            var StateManager  =  window.ValeSpec__AppCore__StateManager;
            if (StateManager) {
                var state  =  StateManager.getState();
                if (_leverTypeSelect && state.globalLeverType) {
                    _leverTypeSelect.value  =  state.globalLeverType;
                }
            }
        }

        var handing  =  leverCfg['Assembly__Lever__Config__Handing'] || 'Dual';
        if (handing === 'Left' && _handingLeftRadio) {
            _handingLeftRadio.checked   =  true;
        } else if (_handingRightRadio) {
            _handingRightRadio.checked  =  true;
        }

        var doorType  =  doorCfg['Assembly__DoorType__Config__Type'] || '';
        _updateHandingVisibility(doorType);
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summaries with StepManager
    // ------------------------------------------------------------
    function _registerSummaries() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        StepManager.registerSummary('hinges', _hingeSummary);
        StepManager.registerSummary('levers', _leverSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Hinges and Levers Steps
    // ------------------------------------------------------------
    function init(step3BodyEl, step4BodyEl) {
        _step3BodyEl  =  step3BodyEl;
        _step4BodyEl  =  step4BodyEl;
        if (!_step3BodyEl || !_step4BodyEl) return;

        _buildHingeStep();
        _buildLeverStep();
        _registerSummaries();

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.on('assemblyUpdated', function(data) {
                if (data) {
                    var dt  =  (data['Assembly__DoorType__Config'] || {})['Assembly__DoorType__Config__Type'] || '';
                    _updateHandingVisibility(dt);
                }
            });
        }

        console.log('[ValeSpec__HingesAndLevers] Initialised.');
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

window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers  =  ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers;
