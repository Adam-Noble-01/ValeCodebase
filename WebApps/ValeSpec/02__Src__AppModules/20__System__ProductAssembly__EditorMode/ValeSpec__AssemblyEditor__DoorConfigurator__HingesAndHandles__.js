/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: HINGES AND HANDLES
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndHandles__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - HingesAndHandles
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Hinge Projection step and Handle Specification step for the wizard
   CREATED    : 15-Apr-2026

  DESCRIPTION:
   - Hinge step: Hinge Projection dropdown (4/5/6/8 inch options)
   - Handle step: Handle Type dropdown (global), Handle Height input
   - Selecting 8-inch projection triggers WarningSystem
   - Handle selection is global — applies to all assemblies
   - Registers summary callbacks with StepManager
   - Assembly JSON continues to use Assembly__Lever__Config keys for file compatibility

   ============================================================================= */

// =============================================================================
// REGION | Hinges and Handles Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndHandles = (function() {

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
    let ValeSpec__HingesAndHandles__StepHingeBodyEl   =  null;   // <-- Hinge Projection step card body
    let ValeSpec__HingesAndHandles__StepHandleBodyEl   =  null;   // <-- Handle Specification step card body
    let ValeSpec__HingesAndHandles__HingeProjectionSel =  null;   // <-- Hinge projection dropdown
    let ValeSpec__HingesAndHandles__HandleTypeSelect   =  null;   // <-- Handle type dropdown
    let ValeSpec__HingesAndHandles__HandleHeightInput  =  null;   // <-- Handle height numeric input
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Handle Type Options from Hardware Index
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__GetHandleTypeOptions() {
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
    function ValeSpec__HingesAndHandles__UpdateAssemblyHinge() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;
        if (!assembly['Assembly__Hinge__Config']) assembly['Assembly__Hinge__Config'] = {};
        assembly['Assembly__Hinge__Config']['Assembly__Hinge__Config__Projection']  =  parseInt(ValeSpec__HingesAndHandles__HingeProjectionSel.value, 10);

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
            var activeWarnings  =  WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
            if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__HingesAndHandles__StepHingeBodyEl) {
                WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__HingesAndHandles__StepHingeBodyEl, activeWarnings);
            }
        }

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Hinge Projection Change
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__OnHingeProjectionChange() {
        var value  =  parseInt(ValeSpec__HingesAndHandles__HingeProjectionSel.value, 10);

        if (value === 8) {
            var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
            if (WarningSystem) {
                WarningSystem.ValeSpec__WarningSystem__ShowHingeProjectionWarning().then(function(confirmed) {
                    if (!confirmed) {
                        ValeSpec__HingesAndHandles__HingeProjectionSel.value  =  5;
                    }
                    ValeSpec__HingesAndHandles__UpdateAssemblyHinge();
                });
                return;
            }
        }

        ValeSpec__HingesAndHandles__UpdateAssemblyHinge();

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) {
            StepManager.ValeSpec__StepManager__AdvanceFromStep('hinges');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Handle Type Change (Global + Assembly)
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__OnHandleTypeChange() {
        var handleName    =  ValeSpec__HingesAndHandles__HandleTypeSelect.value;
        if (!handleName) return; // <-- Placeholder row — no persistence until a product is chosen

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.ValeSpec__StateManager__SetGlobalHandleType(handleName);

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__Lever__Config']) assembly['Assembly__Lever__Config'] = {};
        assembly['Assembly__Lever__Config']['Assembly__Lever__Config__Type']      =  handleName;
        assembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm']  =  parseInt(ValeSpec__HingesAndHandles__HandleHeightInput.value, 10) || 1000;

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
            var activeWarnings  =  WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
            if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__HingesAndHandles__StepHandleBodyEl) {
                WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__HingesAndHandles__StepHandleBodyEl, activeWarnings);
            }
        }

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Handle Height Change
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__OnHandleHeightChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__Lever__Config']) assembly['Assembly__Lever__Config'] = {};
        assembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm']  =  parseInt(ValeSpec__HingesAndHandles__HandleHeightInput.value, 10);

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
            var activeWarnings  =  WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
            if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__HingesAndHandles__StepHandleBodyEl) {
                WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__HingesAndHandles__StepHandleBodyEl, activeWarnings);
            }
        }

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Hinge Projection Step
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__BuildHingeStep() {
        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var label  =  document.createElement('label');
        label.textContent  =  'Hinge Projection';
        label.setAttribute('for', 'ValeSpec__AssemblyEditor__HingeProjection');

        ValeSpec__HingesAndHandles__HingeProjectionSel     =  document.createElement('select');
        ValeSpec__HingesAndHandles__HingeProjectionSel.id  =  'ValeSpec__AssemblyEditor__HingeProjection';

        var hingePlaceholder          =  document.createElement('option');
        hingePlaceholder.value        =  '';
        hingePlaceholder.textContent  =  '\u2014 Please Select \u2014';
        hingePlaceholder.disabled     =  true;
        hingePlaceholder.selected     =  true;
        hingePlaceholder.hidden       =  true;
        ValeSpec__HingesAndHandles__HingeProjectionSel.appendChild(hingePlaceholder);

        for (var i = 0; i < HINGE_PROJECTIONS.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  HINGE_PROJECTIONS[i].Value;
            opt.textContent  =  HINGE_PROJECTIONS[i].Label;
            ValeSpec__HingesAndHandles__HingeProjectionSel.appendChild(opt);
        }

        ValeSpec__HingesAndHandles__HingeProjectionSel.addEventListener('change', ValeSpec__HingesAndHandles__OnHingeProjectionChange);

        group.appendChild(label);
        group.appendChild(ValeSpec__HingesAndHandles__HingeProjectionSel);

        var footerEl  =  ValeSpec__HingesAndHandles__StepHingeBodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__HingesAndHandles__StepHingeBodyEl.insertBefore(group, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Handle Specification Step
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__BuildHandleStep() {
        var handleGroup  =  document.createElement('div');
        handleGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var handleLabel  =  document.createElement('label');
        handleLabel.textContent  =  'Handle Type';
        handleLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__HandleType');

        ValeSpec__HingesAndHandles__HandleTypeSelect     =  document.createElement('select');
        ValeSpec__HingesAndHandles__HandleTypeSelect.id  =  'ValeSpec__AssemblyEditor__HandleType';

        var handlePlaceholder          =  document.createElement('option');
        handlePlaceholder.value        =  '';
        handlePlaceholder.textContent  =  'Please select field';
        handlePlaceholder.disabled     =  true;
        handlePlaceholder.selected     =  true;
        ValeSpec__HingesAndHandles__HandleTypeSelect.appendChild(handlePlaceholder);

        var handleOptions  =  ValeSpec__HingesAndHandles__GetHandleTypeOptions();
        for (var i = 0; i < handleOptions.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  handleOptions[i].Value;
            opt.textContent  =  handleOptions[i].Label;
            ValeSpec__HingesAndHandles__HandleTypeSelect.appendChild(opt);
        }

        ValeSpec__HingesAndHandles__HandleTypeSelect.addEventListener('change', ValeSpec__HingesAndHandles__OnHandleTypeChange);

        handleGroup.appendChild(handleLabel);
        handleGroup.appendChild(ValeSpec__HingesAndHandles__HandleTypeSelect);

        var heightGroup  =  document.createElement('div');
        heightGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';
        heightGroup.style.marginTop  =  '12px';

        var heightLabel  =  document.createElement('label');
        heightLabel.textContent  =  'Handle Height (mm)';
        heightLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__HandleHeight');

        ValeSpec__HingesAndHandles__HandleHeightInput       =  document.createElement('input');
        ValeSpec__HingesAndHandles__HandleHeightInput.type  =  'number';
        ValeSpec__HingesAndHandles__HandleHeightInput.id    =  'ValeSpec__AssemblyEditor__HandleHeight';
        ValeSpec__HingesAndHandles__HandleHeightInput.min   =  800;
        ValeSpec__HingesAndHandles__HandleHeightInput.max   =  1200;
        ValeSpec__HingesAndHandles__HandleHeightInput.value =  1000;

        ValeSpec__HingesAndHandles__HandleHeightInput.addEventListener('change', ValeSpec__HingesAndHandles__OnHandleHeightChange);

        heightGroup.appendChild(heightLabel);
        heightGroup.appendChild(ValeSpec__HingesAndHandles__HandleHeightInput);

        var footerEl  =  ValeSpec__HingesAndHandles__StepHandleBodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__HingesAndHandles__StepHandleBodyEl.insertBefore(handleGroup, footerEl);
        ValeSpec__HingesAndHandles__StepHandleBodyEl.insertBefore(heightGroup, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Hinge Step
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__HingeSummary() {
        var val  =  ValeSpec__HingesAndHandles__HingeProjectionSel ? ValeSpec__HingesAndHandles__HingeProjectionSel.value : '';
        return val ? val + ' inch projection' : 'Not set';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Handle Step
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__HandleSummary() {
        var sel     =  ValeSpec__HingesAndHandles__HandleTypeSelect;
        var height  =  ValeSpec__HingesAndHandles__HandleHeightInput  ? ValeSpec__HingesAndHandles__HandleHeightInput.value : '1000';
        if (!sel || !sel.value) {
            return 'Not set  |  ' + height + ' mm';
        }
        var type  =  sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
        return type + '  |  ' + height + ' mm';
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var hingeCfg  =  assemblyData['Assembly__Hinge__Config'] || {};
        var handleCfg =  assemblyData['Assembly__Lever__Config'] || {};

        if (ValeSpec__HingesAndHandles__HingeProjectionSel && hingeCfg['Assembly__Hinge__Config__Projection'] !== undefined) {
            ValeSpec__HingesAndHandles__HingeProjectionSel.value  =  hingeCfg['Assembly__Hinge__Config__Projection'];
        }

        if (ValeSpec__HingesAndHandles__HandleHeightInput) {
            ValeSpec__HingesAndHandles__HandleHeightInput.value  =  handleCfg['Assembly__Lever__Config__HeightMm'] || 1000;
        }

        var handleType  =  handleCfg['Assembly__Lever__Config__Type'] || '';
        if (ValeSpec__HingesAndHandles__HandleTypeSelect && handleType) {
            ValeSpec__HingesAndHandles__HandleTypeSelect.value  =  handleType;
        } else {
            var StateManager  =  window.ValeSpec__AppCore__StateManager;
            if (StateManager) {
                var state  =  StateManager.ValeSpec__StateManager__GetState();
                if (ValeSpec__HingesAndHandles__HandleTypeSelect && state.globalHandleType) {
                    ValeSpec__HingesAndHandles__HandleTypeSelect.value  =  state.globalHandleType;
                }
            }
        }

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly) {
            WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly(assemblyData, ValeSpec__HingesAndHandles__StepHingeBodyEl);
            WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly(assemblyData, ValeSpec__HingesAndHandles__StepHandleBodyEl);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summaries with StepManager
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__RegisterSummaries() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        StepManager.ValeSpec__StepManager__RegisterSummary('hinges', ValeSpec__HingesAndHandles__HingeSummary);
        StepManager.ValeSpec__StepManager__RegisterSummary('handles', ValeSpec__HingesAndHandles__HandleSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Hinge and Handle Steps
    // ------------------------------------------------------------
    function ValeSpec__HingesAndHandles__Init(hingeStepBodyEl, handleStepBodyEl) {
        ValeSpec__HingesAndHandles__StepHingeBodyEl  =  hingeStepBodyEl;
        ValeSpec__HingesAndHandles__StepHandleBodyEl  =  handleStepBodyEl;
        if (!ValeSpec__HingesAndHandles__StepHingeBodyEl || !ValeSpec__HingesAndHandles__StepHandleBodyEl) return;

        ValeSpec__HingesAndHandles__BuildHingeStep();
        ValeSpec__HingesAndHandles__BuildHandleStep();
        ValeSpec__HingesAndHandles__RegisterSummaries();

        console.log('[ValeSpec__HingesAndHandles] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__HingesAndHandles__Init                : ValeSpec__HingesAndHandles__Init,
        ValeSpec__HingesAndHandles__RefreshFromAssembly : ValeSpec__HingesAndHandles__RefreshFromAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndHandles  =  ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndHandles;
