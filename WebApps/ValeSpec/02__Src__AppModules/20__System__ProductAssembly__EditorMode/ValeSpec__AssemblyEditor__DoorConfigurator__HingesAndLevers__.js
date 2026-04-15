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
    let ValeSpec__HingesAndLevers__Step3BodyEl        =  null;   // <-- Step 3 card body (Hinges)
    let ValeSpec__HingesAndLevers__Step4BodyEl        =  null;   // <-- Step 4 card body (Levers)
    let ValeSpec__HingesAndLevers__HingeProjectionSel =  null;   // <-- Hinge projection dropdown
    let ValeSpec__HingesAndLevers__LeverTypeSelect    =  null;   // <-- Lever type dropdown
    let ValeSpec__HingesAndLevers__LeverHeightInput   =  null;   // <-- Lever height numeric input
    let ValeSpec__HingesAndLevers__HandingPromptEl    =  null;   // <-- Handing prompt container
    let ValeSpec__HingesAndLevers__HandingLeftRadio   =  null;   // <-- Left-hand radio button
    let ValeSpec__HingesAndLevers__HandingRightRadio  =  null;   // <-- Right-hand radio button
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Lever Type Options from Hardware Index
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__GetLeverTypeOptions() {
        var names  =  [];

        var HwLoader  =  window.ValeSpec__AppData__HardwareIndexLoader;
        if (HwLoader) {
            var handles  =  HwLoader.ValeSpec__HardwareIndexLoader__GetAllLeverHandles();
            if (handles && handles.length > 0) {
                for (var i = 0; i < handles.length; i++) {
                    var name  =  handles[i]['HardwareItem__Name'] || '';
                    if (name) {
                        names.push(name.trim());
                    }
                }
            }
        }

        if (!names.length) {
            names  =  [
                'Scroll Lever Handle',
                'Plain Lever Handle',
                'Newton Lever Handle',
                'None'
            ];
        }

        var deduped  =  [];
        var seen     =  {};
        for (var j = 0; j < names.length; j++) {
            var label  =  names[j];
            var key    =  label.toLowerCase();
            if (seen[key]) continue;
            seen[key]  =  true;
            deduped.push({ Label: label, Value: label });
        }

        deduped.sort(function(a, b) {
            function rank(label) {
                var lower  =  label.toLowerCase();
                if (lower.indexOf('scroll') !== -1) return 0;                           // <-- Keep Scroll first
                if (lower === 'none' || lower.indexOf('none') !== -1) return 2;         // <-- Keep None at end
                return 1;
            }
            var rankA  =  rank(a.Label);
            var rankB  =  rank(b.Label);
            if (rankA !== rankB) return rankA - rankB;
            return a.Label.localeCompare(b.Label);
        });

        return deduped;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Assembly Hinge Projection
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__UpdateAssemblyHinge() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;
        if (!assembly['Assembly__Hinge__Config']) assembly['Assembly__Hinge__Config'] = {};
        assembly['Assembly__Hinge__Config']['Assembly__Hinge__Config__Projection']  =  parseInt(ValeSpec__HingesAndLevers__HingeProjectionSel.value, 10);
        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Handing Prompt Visibility
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__UpdateHandingVisibility(doorType) {
        if (!ValeSpec__HingesAndLevers__HandingPromptEl) return;
        var isSingle  =  doorType && doorType.indexOf('Single') !== -1;
        if (isSingle) {
            ValeSpec__HingesAndLevers__HandingPromptEl.classList.add('ValeSpec__AssemblyEditor__HandingPrompt--visible');
        } else {
            ValeSpec__HingesAndLevers__HandingPromptEl.classList.remove('ValeSpec__AssemblyEditor__HandingPrompt--visible');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Hinge Projection Change
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__OnHingeProjectionChange() {
        var value  =  parseInt(ValeSpec__HingesAndLevers__HingeProjectionSel.value, 10);

        if (value === 8) {
            var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
            if (WarningSystem) {
                WarningSystem.ValeSpec__WarningSystem__ShowHingeProjectionWarning().then(function(confirmed) {
                    if (!confirmed) {
                        ValeSpec__HingesAndLevers__HingeProjectionSel.value  =  5;
                    }
                    ValeSpec__HingesAndLevers__UpdateAssemblyHinge();
                });
                return;
            }
        }

        ValeSpec__HingesAndLevers__UpdateAssemblyHinge();

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) {
            StepManager.ValeSpec__StepManager__AdvanceFromStep('hinges');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Lever Type Change (Global + Assembly)
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__OnLeverTypeChange() {
        var leverName     =  ValeSpec__HingesAndLevers__LeverTypeSelect.value;
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.ValeSpec__StateManager__SetGlobalLeverType(leverName);

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__Lever__Config']) assembly['Assembly__Lever__Config'] = {};
        assembly['Assembly__Lever__Config']['Assembly__Lever__Config__Type']      =  leverName;
        assembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm']  =  parseInt(ValeSpec__HingesAndLevers__LeverHeightInput.value, 10) || 1000;

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Lever Height Change
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__OnLeverHeightChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__Lever__Config']) assembly['Assembly__Lever__Config'] = {};
        assembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm']  =  parseInt(ValeSpec__HingesAndLevers__LeverHeightInput.value, 10);

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Handing Radio Change
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__OnHandingChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;
        assembly['Handing']  =  ValeSpec__HingesAndLevers__HandingLeftRadio.checked ? 'Left' : 'Right';
        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 3 - Hinge Projection
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__BuildHingeStep() {
        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var label  =  document.createElement('label');
        label.textContent  =  'Hinge Projection';
        label.setAttribute('for', 'ValeSpec__AssemblyEditor__HingeProjection');

        ValeSpec__HingesAndLevers__HingeProjectionSel     =  document.createElement('select');
        ValeSpec__HingesAndLevers__HingeProjectionSel.id  =  'ValeSpec__AssemblyEditor__HingeProjection';

        var hingePlaceholder          =  document.createElement('option');
        hingePlaceholder.value        =  '';
        hingePlaceholder.textContent  =  '\u2014 Please Select \u2014';
        hingePlaceholder.disabled     =  true;
        hingePlaceholder.selected     =  true;
        hingePlaceholder.hidden       =  true;
        ValeSpec__HingesAndLevers__HingeProjectionSel.appendChild(hingePlaceholder);

        for (var i = 0; i < HINGE_PROJECTIONS.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  HINGE_PROJECTIONS[i].Value;
            opt.textContent  =  HINGE_PROJECTIONS[i].Label;
            ValeSpec__HingesAndLevers__HingeProjectionSel.appendChild(opt);
        }

        ValeSpec__HingesAndLevers__HingeProjectionSel.addEventListener('change', ValeSpec__HingesAndLevers__OnHingeProjectionChange);

        group.appendChild(label);
        group.appendChild(ValeSpec__HingesAndLevers__HingeProjectionSel);

        var footerEl  =  ValeSpec__HingesAndLevers__Step3BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__HingesAndLevers__Step3BodyEl.insertBefore(group, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 4 - Lever Specification
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__BuildLeverStep() {
        var leverGroup  =  document.createElement('div');
        leverGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var leverLabel  =  document.createElement('label');
        leverLabel.textContent  =  'Lever Type';
        leverLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__LeverType');

        ValeSpec__HingesAndLevers__LeverTypeSelect     =  document.createElement('select');
        ValeSpec__HingesAndLevers__LeverTypeSelect.id  =  'ValeSpec__AssemblyEditor__LeverType';

        var leverPlaceholder          =  document.createElement('option');
        leverPlaceholder.value        =  '';
        leverPlaceholder.textContent  =  '\u2014 Please Select \u2014';
        leverPlaceholder.disabled     =  true;
        leverPlaceholder.selected     =  true;
        leverPlaceholder.hidden       =  true;
        ValeSpec__HingesAndLevers__LeverTypeSelect.appendChild(leverPlaceholder);

        var leverOptions  =  ValeSpec__HingesAndLevers__GetLeverTypeOptions();
        for (var i = 0; i < leverOptions.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  leverOptions[i].Value;
            opt.textContent  =  leverOptions[i].Label;
            ValeSpec__HingesAndLevers__LeverTypeSelect.appendChild(opt);
        }

        ValeSpec__HingesAndLevers__LeverTypeSelect.addEventListener('change', ValeSpec__HingesAndLevers__OnLeverTypeChange);

        leverGroup.appendChild(leverLabel);
        leverGroup.appendChild(ValeSpec__HingesAndLevers__LeverTypeSelect);

        var heightGroup  =  document.createElement('div');
        heightGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';
        heightGroup.style.marginTop  =  '12px';

        var heightLabel  =  document.createElement('label');
        heightLabel.textContent  =  'Lever Height (mm)';
        heightLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__LeverHeight');

        ValeSpec__HingesAndLevers__LeverHeightInput       =  document.createElement('input');
        ValeSpec__HingesAndLevers__LeverHeightInput.type  =  'number';
        ValeSpec__HingesAndLevers__LeverHeightInput.id    =  'ValeSpec__AssemblyEditor__LeverHeight';
        ValeSpec__HingesAndLevers__LeverHeightInput.min   =  800;
        ValeSpec__HingesAndLevers__LeverHeightInput.max   =  1200;
        ValeSpec__HingesAndLevers__LeverHeightInput.value =  1000;

        ValeSpec__HingesAndLevers__LeverHeightInput.addEventListener('change', ValeSpec__HingesAndLevers__OnLeverHeightChange);

        heightGroup.appendChild(heightLabel);
        heightGroup.appendChild(ValeSpec__HingesAndLevers__LeverHeightInput);

        ValeSpec__HingesAndLevers__HandingPromptEl  =  document.createElement('div');
        ValeSpec__HingesAndLevers__HandingPromptEl.className  =  'ValeSpec__AssemblyEditor__HandingPrompt';
        ValeSpec__HingesAndLevers__HandingPromptEl.id         =  'ValeSpec__AssemblyEditor__HandingPrompt';

        var handingLabel  =  document.createElement('span');
        handingLabel.textContent    =  'Handing:';
        handingLabel.style.fontSize =  '0.78rem';

        var leftLabel  =  document.createElement('label');
        ValeSpec__HingesAndLevers__HandingLeftRadio       =  document.createElement('input');
        ValeSpec__HingesAndLevers__HandingLeftRadio.type  =  'radio';
        ValeSpec__HingesAndLevers__HandingLeftRadio.name  =  'ValeSpec__AssemblyEditor__Handing';
        ValeSpec__HingesAndLevers__HandingLeftRadio.value =  'Left';
        leftLabel.appendChild(ValeSpec__HingesAndLevers__HandingLeftRadio);
        leftLabel.appendChild(document.createTextNode(' Left'));

        var rightLabel  =  document.createElement('label');
        ValeSpec__HingesAndLevers__HandingRightRadio          =  document.createElement('input');
        ValeSpec__HingesAndLevers__HandingRightRadio.type     =  'radio';
        ValeSpec__HingesAndLevers__HandingRightRadio.name     =  'ValeSpec__AssemblyEditor__Handing';
        ValeSpec__HingesAndLevers__HandingRightRadio.value    =  'Right';
        ValeSpec__HingesAndLevers__HandingRightRadio.checked  =  true;
        rightLabel.appendChild(ValeSpec__HingesAndLevers__HandingRightRadio);
        rightLabel.appendChild(document.createTextNode(' Right'));

        ValeSpec__HingesAndLevers__HandingPromptEl.appendChild(handingLabel);
        ValeSpec__HingesAndLevers__HandingPromptEl.appendChild(leftLabel);
        ValeSpec__HingesAndLevers__HandingPromptEl.appendChild(rightLabel);

        ValeSpec__HingesAndLevers__HandingLeftRadio.addEventListener('change',  ValeSpec__HingesAndLevers__OnHandingChange);
        ValeSpec__HingesAndLevers__HandingRightRadio.addEventListener('change', ValeSpec__HingesAndLevers__OnHandingChange);

        var footerEl  =  ValeSpec__HingesAndLevers__Step4BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__HingesAndLevers__Step4BodyEl.insertBefore(leverGroup, footerEl);
        ValeSpec__HingesAndLevers__Step4BodyEl.insertBefore(heightGroup, footerEl);
        ValeSpec__HingesAndLevers__Step4BodyEl.insertBefore(ValeSpec__HingesAndLevers__HandingPromptEl, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 3 (Hinges)
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__HingeSummary() {
        var val  =  ValeSpec__HingesAndLevers__HingeProjectionSel ? ValeSpec__HingesAndLevers__HingeProjectionSel.value : '';
        return val ? val + ' inch projection' : 'Not set';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 4 (Levers)
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__LeverSummary() {
        var type    =  ValeSpec__HingesAndLevers__LeverTypeSelect   ? ValeSpec__HingesAndLevers__LeverTypeSelect.options[ValeSpec__HingesAndLevers__LeverTypeSelect.selectedIndex].text : '';
        var height  =  ValeSpec__HingesAndLevers__LeverHeightInput  ? ValeSpec__HingesAndLevers__LeverHeightInput.value : '1000';
        return type + '  |  ' + height + ' mm';
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var hingeCfg  =  assemblyData['Assembly__Hinge__Config']    || {};
        var leverCfg  =  assemblyData['Assembly__Lever__Config']    || {};
        var doorCfg   =  assemblyData['Assembly__DoorType__Config'] || {};

        if (ValeSpec__HingesAndLevers__HingeProjectionSel && hingeCfg['Assembly__Hinge__Config__Projection'] !== undefined) {
            ValeSpec__HingesAndLevers__HingeProjectionSel.value  =  hingeCfg['Assembly__Hinge__Config__Projection'];
        }

        if (ValeSpec__HingesAndLevers__LeverHeightInput) {
            ValeSpec__HingesAndLevers__LeverHeightInput.value  =  leverCfg['Assembly__Lever__Config__HeightMm'] || 1000;
        }

        var leverType  =  leverCfg['Assembly__Lever__Config__Type'] || '';
        if (ValeSpec__HingesAndLevers__LeverTypeSelect && leverType) {
            ValeSpec__HingesAndLevers__LeverTypeSelect.value  =  leverType;
        } else {
            var StateManager  =  window.ValeSpec__AppCore__StateManager;
            if (StateManager) {
                var state  =  StateManager.ValeSpec__StateManager__GetState();
                if (ValeSpec__HingesAndLevers__LeverTypeSelect && state.globalLeverType) {
                    ValeSpec__HingesAndLevers__LeverTypeSelect.value  =  state.globalLeverType;
                }
            }
        }

        var handing  =  leverCfg['Assembly__Lever__Config__Handing'] || 'Dual';
        if (handing === 'Left' && ValeSpec__HingesAndLevers__HandingLeftRadio) {
            ValeSpec__HingesAndLevers__HandingLeftRadio.checked   =  true;
        } else if (ValeSpec__HingesAndLevers__HandingRightRadio) {
            ValeSpec__HingesAndLevers__HandingRightRadio.checked  =  true;
        }

        var doorType  =  doorCfg['Assembly__DoorType__Config__Type'] || '';
        ValeSpec__HingesAndLevers__UpdateHandingVisibility(doorType);
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summaries with StepManager
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__RegisterSummaries() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        StepManager.ValeSpec__StepManager__RegisterSummary('hinges', ValeSpec__HingesAndLevers__HingeSummary);
        StepManager.ValeSpec__StepManager__RegisterSummary('levers', ValeSpec__HingesAndLevers__LeverSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Hinges and Levers Steps
    // ------------------------------------------------------------
    function ValeSpec__HingesAndLevers__Init(step3BodyEl, step4BodyEl) {
        ValeSpec__HingesAndLevers__Step3BodyEl  =  step3BodyEl;
        ValeSpec__HingesAndLevers__Step4BodyEl  =  step4BodyEl;
        if (!ValeSpec__HingesAndLevers__Step3BodyEl || !ValeSpec__HingesAndLevers__Step4BodyEl) return;

        ValeSpec__HingesAndLevers__BuildHingeStep();
        ValeSpec__HingesAndLevers__BuildLeverStep();
        ValeSpec__HingesAndLevers__RegisterSummaries();

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.ValeSpec__StateManager__On('assemblyUpdated', function(data) {
                if (data) {
                    var dt  =  (data['Assembly__DoorType__Config'] || {})['Assembly__DoorType__Config__Type'] || '';
                    ValeSpec__HingesAndLevers__UpdateHandingVisibility(dt);
                }
            });
        }

        console.log('[ValeSpec__HingesAndLevers] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__HingesAndLevers__Init                : ValeSpec__HingesAndLevers__Init,
        ValeSpec__HingesAndLevers__RefreshFromAssembly : ValeSpec__HingesAndLevers__RefreshFromAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers  =  ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers;
