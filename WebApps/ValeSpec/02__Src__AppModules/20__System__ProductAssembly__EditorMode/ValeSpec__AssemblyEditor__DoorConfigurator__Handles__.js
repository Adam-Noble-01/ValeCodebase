/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: HANDLES
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__Handles__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - Handles
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Handle Specifications step for the wizard
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Handle specifications step: Handle Type dropdown, Handle Height input
   - First choice sets project global handle type; differing choice can stay assembly-only (LeverMismatch modal)
   - Registers summary callbacks with StepManager
   - Assembly JSON continues to use Assembly__Lever__Config keys for file compatibility

   =============================================================================

   DEVELOPMENT LOG:
   17-Apr-2026
   - Handle type placeholder option no longer disabled so empty selection stays valid in the DOM (browsers were selecting first real option)
   - ValeSpec__Handles__ValidateHandlesStepForAdvance for StepManager Next validation and ValeSpec__ValidationError styling
   - Global vs assembly handle type with optional LeverMismatch modal (WarningSystem); explicit SvgPreview refresh after changes

   ============================================================================= */

// =============================================================================
// REGION | Handles Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__Handles = (function() {

    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let ValeSpec__Handles__StepHandleBodyEl   =  null;   // <-- Handle Specifications step card body
    let ValeSpec__Handles__HandleTypeSelect   =  null;   // <-- Handle type dropdown
    let ValeSpec__Handles__HandleHeightInput  =  null;   // <-- Handle height numeric input
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Handle Type Options from Hardware Index
    // ------------------------------------------------------------
    function ValeSpec__Handles__GetHandleTypeOptions() {
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


    // HELPER FUNCTION | Handle Handle Type Change (Global + Assembly)
    // ------------------------------------------------------------
    function ValeSpec__Handles__OnHandleTypeChange() {
        var handleName    =  ValeSpec__Handles__HandleTypeSelect.value;
        if (!handleName) return; // <-- Placeholder row — no persistence until a product is chosen

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var WarningSystem =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (!StateManager) return;

        var state = StateManager.ValeSpec__StateManager__GetState();
        var globalHandleType = state.globalHandleType;
        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        if (!globalHandleType) {
            StateManager.ValeSpec__StateManager__SetGlobalHandleType(handleName);
            if (!assembly['Assembly__Lever__Config']) assembly['Assembly__Lever__Config'] = {};
            assembly['Assembly__Lever__Config']['Assembly__Lever__Config__Type']      =  handleName;
            assembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm']  =  parseInt(ValeSpec__Handles__HandleHeightInput.value, 10) || 1000;
            StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
        } else if (globalHandleType !== handleName) {
            if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ShowLeverMismatchWarning) {
                WarningSystem.ValeSpec__WarningSystem__ShowLeverMismatchWarning().then(function(confirmed) {
                    if (confirmed) {
                        StateManager.ValeSpec__StateManager__SetGlobalHandleType(handleName);
                        var currentAssembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
                        if (currentAssembly) {
                            if (!currentAssembly['Assembly__Lever__Config']) currentAssembly['Assembly__Lever__Config'] = {};
                            currentAssembly['Assembly__Lever__Config']['Assembly__Lever__Config__Type'] = handleName;
                            currentAssembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm'] = parseInt(ValeSpec__Handles__HandleHeightInput.value, 10) || 1000;
                            StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(currentAssembly);
                            if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
                                var activeWarnings = WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(currentAssembly);
                                if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__Handles__StepHandleBodyEl) {
                                    WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__Handles__StepHandleBodyEl, activeWarnings);
                                }
                            }
                        }
                    } else {
                        var currentAssembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
                        if (currentAssembly) {
                            if (!currentAssembly['Assembly__Lever__Config']) currentAssembly['Assembly__Lever__Config'] = {};
                            currentAssembly['Assembly__Lever__Config']['Assembly__Lever__Config__Type'] = handleName;
                            currentAssembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm'] = parseInt(ValeSpec__Handles__HandleHeightInput.value, 10) || 1000;
                            StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(currentAssembly);
                            if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
                                var activeWarnings = WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(currentAssembly);
                                if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__Handles__StepHandleBodyEl) {
                                    WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__Handles__StepHandleBodyEl, activeWarnings);
                                }
                            }
                        }
                    }
                });
                return;
            } else {
                if (!assembly['Assembly__Lever__Config']) assembly['Assembly__Lever__Config'] = {};
                assembly['Assembly__Lever__Config']['Assembly__Lever__Config__Type']      =  handleName;
                assembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm']  =  parseInt(ValeSpec__Handles__HandleHeightInput.value, 10) || 1000;
                StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
            }
        } else {
            if (!assembly['Assembly__Lever__Config']) assembly['Assembly__Lever__Config'] = {};
            assembly['Assembly__Lever__Config']['Assembly__Lever__Config__Type']      =  handleName;
            assembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm']  =  parseInt(ValeSpec__Handles__HandleHeightInput.value, 10) || 1000;
            StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
        }

        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
            var activeWarnings  =  WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
            if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__Handles__StepHandleBodyEl) {
                WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__Handles__StepHandleBodyEl, activeWarnings);
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Handle Height Change
    // ------------------------------------------------------------
    function ValeSpec__Handles__OnHandleHeightChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__Lever__Config']) assembly['Assembly__Lever__Config'] = {};
        assembly['Assembly__Lever__Config']['Assembly__Lever__Config__HeightMm']  =  parseInt(ValeSpec__Handles__HandleHeightInput.value, 10);

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
            var activeWarnings  =  WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
            if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__Handles__StepHandleBodyEl) {
                WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__Handles__StepHandleBodyEl, activeWarnings);
            }
        }

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Handle Specifications Step
    // ------------------------------------------------------------
    function ValeSpec__Handles__BuildHandleStep() {
        var handleGroup  =  document.createElement('div');
        handleGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var handleLabel  =  document.createElement('label');
        handleLabel.textContent  =  'Handle Type';
        handleLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__HandleType');

        ValeSpec__Handles__HandleTypeSelect     =  document.createElement('select');
        ValeSpec__Handles__HandleTypeSelect.id  =  'ValeSpec__AssemblyEditor__HandleType';

        var handlePlaceholder          =  document.createElement('option');
        handlePlaceholder.value        =  '';
        handlePlaceholder.textContent  =  'Please select field';
        handlePlaceholder.selected     =  true;
        ValeSpec__Handles__HandleTypeSelect.appendChild(handlePlaceholder);

        var handleOptions  =  ValeSpec__Handles__GetHandleTypeOptions();
        for (var i = 0; i < handleOptions.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  handleOptions[i].Value;
            opt.textContent  =  handleOptions[i].Label;
            ValeSpec__Handles__HandleTypeSelect.appendChild(opt);
        }

        ValeSpec__Handles__HandleTypeSelect.addEventListener('change', ValeSpec__Handles__OnHandleTypeChange);

        handleGroup.appendChild(handleLabel);
        handleGroup.appendChild(ValeSpec__Handles__HandleTypeSelect);

        var heightGroup  =  document.createElement('div');
        heightGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';
        heightGroup.style.marginTop  =  '12px';

        var heightLabel  =  document.createElement('label');
        heightLabel.textContent  =  'Handle Height (mm)';
        heightLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__HandleHeight');

        ValeSpec__Handles__HandleHeightInput       =  document.createElement('input');
        ValeSpec__Handles__HandleHeightInput.type  =  'number';
        ValeSpec__Handles__HandleHeightInput.id    =  'ValeSpec__AssemblyEditor__HandleHeight';
        ValeSpec__Handles__HandleHeightInput.min   =  800;
        ValeSpec__Handles__HandleHeightInput.max   =  1200;
        ValeSpec__Handles__HandleHeightInput.value =  1000;

        ValeSpec__Handles__HandleHeightInput.addEventListener('change', ValeSpec__Handles__OnHandleHeightChange);

        heightGroup.appendChild(heightLabel);
        heightGroup.appendChild(ValeSpec__Handles__HandleHeightInput);

        var footerEl  =  ValeSpec__Handles__StepHandleBodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__Handles__StepHandleBodyEl.insertBefore(handleGroup, footerEl);
        ValeSpec__Handles__StepHandleBodyEl.insertBefore(heightGroup, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Handle Step
    // ------------------------------------------------------------
    function ValeSpec__Handles__HandleSummary() {
        var sel     =  ValeSpec__Handles__HandleTypeSelect;
        var height  =  ValeSpec__Handles__HandleHeightInput  ? ValeSpec__Handles__HandleHeightInput.value : '1000';
        if (!sel || !sel.value) {
            return 'Not set  |  ' + height + ' mm';
        }
        var type  =  sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
        return type + '  |  ' + height + ' mm';
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__Handles__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var handleCfg =  assemblyData['Assembly__Lever__Config'] || {};

        if (ValeSpec__Handles__HandleHeightInput) {
            ValeSpec__Handles__HandleHeightInput.value  =  handleCfg['Assembly__Lever__Config__HeightMm'] || 1000;
        }

        var handleType  =  handleCfg['Assembly__Lever__Config__Type'] || '';
        if (ValeSpec__Handles__HandleTypeSelect && handleType) {
            ValeSpec__Handles__HandleTypeSelect.value  =  handleType;
        } else {
            var StateManager  =  window.ValeSpec__AppCore__StateManager;
            if (StateManager) {
                var state  =  StateManager.ValeSpec__StateManager__GetState();
                if (ValeSpec__Handles__HandleTypeSelect && state.globalHandleType) {
                    ValeSpec__Handles__HandleTypeSelect.value  =  state.globalHandleType;
                }
            }
        }

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly) {
            WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly(assemblyData, ValeSpec__Handles__StepHandleBodyEl);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Validate Handle Type Before Advancing Step
    // ------------------------------------------------------------
    function ValeSpec__Handles__ValidateHandlesStepForAdvance() {
        var sel  =  ValeSpec__Handles__HandleTypeSelect;
        if (!sel) return false;

        var val  =  sel.value;
        if (typeof val === 'string') val = val.trim();

        var clearError  =  function(e) {
            e.target.classList.remove('ValeSpec__ValidationError');
            e.target.removeEventListener('change', clearError);
        };

        if (!val) {
            sel.classList.add('ValeSpec__ValidationError');
            sel.addEventListener('change', clearError);
            return false;
        }

        sel.classList.remove('ValeSpec__ValidationError');
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summaries with StepManager
    // ------------------------------------------------------------
    function ValeSpec__Handles__RegisterSummaries() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        StepManager.ValeSpec__StepManager__RegisterSummary('handles', ValeSpec__Handles__HandleSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Handle Step
    // ------------------------------------------------------------
    function ValeSpec__Handles__Init(handleStepBodyEl) {
        ValeSpec__Handles__StepHandleBodyEl  =  handleStepBodyEl;
        if (!ValeSpec__Handles__StepHandleBodyEl) return;

        ValeSpec__Handles__BuildHandleStep();
        ValeSpec__Handles__RegisterSummaries();

        console.log('[ValeSpec__Handles] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__Handles__Init                           : ValeSpec__Handles__Init,
        ValeSpec__Handles__RefreshFromAssembly            : ValeSpec__Handles__RefreshFromAssembly,
        ValeSpec__Handles__ValidateHandlesStepForAdvance  : ValeSpec__Handles__ValidateHandlesStepForAdvance
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__Handles  =  ValeSpec__AssemblyEditor__DoorConfigurator__Handles;
