/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR GLOBAL SETTINGS
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__GlobalSettings__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - GlobalSettings
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Step-based global finish controls within assembly wizard
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Renders global finish selector as a dedicated step card section
   - Options: Unlacquered Brass, Satin Nickel, Bronze, Other (free text)
   - On change calls StateManager.ValeSpec__StateManager__SetGlobalFinish() and can store per-assembly override when finish differs from project global
   - Project JSON stores a single global finish; mismatch path can apply finish to one assembly only
   - Registers StepManager summary and completion state for finish step

   =============================================================================

   DEVELOPMENT LOG:
   17-Apr-2026
   - Ironmongery finish: first selection sets project global; differing choice prompts mismatch modal — update all assemblies or store per-assembly override only
   - SvgPreview render forced after finish changes and assembly refresh so preview colour stays in sync
   - Step completion tracks global or assembly-specific finish; auto-advance removed (Next-driven wizard)

   ============================================================================= */

// =============================================================================
// REGION | Assembly Editor Global Settings Module
// =============================================================================

const ValeSpec__AssemblyEditor__GlobalSettings = (function() {

    // MODULE CONSTANTS | Finish Options
    // ------------------------------------------------------------
    const FINISH_OPTIONS  =  [
        { Label: 'Unlacquered Brass',  Value: 'Unlacquered Brass' },
        { Label: 'Satin Nickel',       Value: 'Satin Nickel'      },
        { Label: 'Bronze',             Value: 'Bronze'             },
        { Label: 'Other',              Value: 'Other'              }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let ValeSpec__GlobalSettings__ContainerEl  =  null;  // <-- Step body container
    let ValeSpec__GlobalSettings__FinishSelect =  null;  // <-- Finish dropdown
    let ValeSpec__GlobalSettings__OtherInput   =  null;  // <-- Free text input for 'Other'
    let ValeSpec__GlobalSettings__UserConfirmed =  false; // <-- Tracks explicit user confirmation for finish step completion
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Finish Controls in Step Body
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__BuildFinishDropdown() {
        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var label  =  document.createElement('label');
        label.textContent  =  'Ironmongery Finish';
        label.setAttribute('for', 'ValeSpec__AssemblyEditor__GlobalFinish');

        ValeSpec__GlobalSettings__FinishSelect     =  document.createElement('select');
        ValeSpec__GlobalSettings__FinishSelect.id  =  'ValeSpec__AssemblyEditor__GlobalFinish';

        var finishPlaceholder          =  document.createElement('option');
        finishPlaceholder.value        =  '';
        finishPlaceholder.textContent  =  '\u2014 Please Select \u2014';
        finishPlaceholder.disabled     =  true;
        finishPlaceholder.selected     =  true;
        finishPlaceholder.hidden       =  true;
        ValeSpec__GlobalSettings__FinishSelect.appendChild(finishPlaceholder);

        for (var i = 0; i < FINISH_OPTIONS.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  FINISH_OPTIONS[i].Value;
            opt.textContent  =  FINISH_OPTIONS[i].Label;
            ValeSpec__GlobalSettings__FinishSelect.appendChild(opt);
        }

        ValeSpec__GlobalSettings__OtherInput              =  document.createElement('input');
        ValeSpec__GlobalSettings__OtherInput.type         =  'text';
        ValeSpec__GlobalSettings__OtherInput.id           =  'ValeSpec__AssemblyEditor__GlobalFinishOther';
        ValeSpec__GlobalSettings__OtherInput.placeholder  =  'Specify finish...';
        ValeSpec__GlobalSettings__OtherInput.style.display  =  'none';
        ValeSpec__GlobalSettings__OtherInput.style.marginTop =  '8px';

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            var state  =  StateManager.ValeSpec__StateManager__GetState();
            if (state.globalIronmongeryFinish) {
                var matchFound  =  false;
                for (var j = 0; j < FINISH_OPTIONS.length; j++) {
                    if (FINISH_OPTIONS[j].Value === state.globalIronmongeryFinish) {
                        matchFound  =  true;
                        break;
                    }
                }
                if (matchFound) {
                    ValeSpec__GlobalSettings__FinishSelect.value  =  state.globalIronmongeryFinish;
                } else {
                    ValeSpec__GlobalSettings__FinishSelect.value        =  'Other';
                    ValeSpec__GlobalSettings__OtherInput.value          =  state.globalIronmongeryFinish;
                    ValeSpec__GlobalSettings__OtherInput.style.display  =  '';
                }
            }
        }

        ValeSpec__GlobalSettings__FinishSelect.addEventListener('change', ValeSpec__GlobalSettings__OnFinishChange);
        ValeSpec__GlobalSettings__OtherInput.addEventListener('change', ValeSpec__GlobalSettings__OnOtherInputChange);

        group.appendChild(label);
        group.appendChild(ValeSpec__GlobalSettings__FinishSelect);
        group.appendChild(ValeSpec__GlobalSettings__OtherInput);

        var footerEl  =  ValeSpec__GlobalSettings__ContainerEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        if (footerEl) {
            ValeSpec__GlobalSettings__ContainerEl.insertBefore(group, footerEl);
        } else {
            ValeSpec__GlobalSettings__ContainerEl.appendChild(group);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Selected Finish Label
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__GetResolvedFinishLabel() {
        if (!ValeSpec__GlobalSettings__FinishSelect) return '';
        if (ValeSpec__GlobalSettings__FinishSelect.value === 'Other') {
            return ValeSpec__GlobalSettings__OtherInput ? ValeSpec__GlobalSettings__OtherInput.value.trim() : '';
        }
        return ValeSpec__GlobalSettings__FinishSelect.value || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Finish Step Completion State
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__UpdateStepCompletion(isComplete) {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;
        StepManager.ValeSpec__StepManager__MarkCompleted('finish', !!isComplete);
        
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            var state = StateManager.ValeSpec__StateManager__GetState();
            var globalFinish = state.globalIronmongeryFinish;
            var assembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
            var assemblyFinish = '';
            if (assembly && assembly['Assembly__IronmongeryFinish__Config']) {
                assemblyFinish = assembly['Assembly__IronmongeryFinish__Config']['Assembly__IronmongeryFinish__Config__Finish'];
            }
            if (globalFinish || assemblyFinish) {
                StepManager.ValeSpec__StepManager__MarkCompleted('finish', true);
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Register Finish Step Summary Callback
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__RegisterSummary() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;
        StepManager.ValeSpec__StepManager__RegisterSummary('finish', function() {
            return ValeSpec__GlobalSettings__GetResolvedFinishLabel() || 'Not set';
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Finish Dropdown Change
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__OnFinishChange() {
        var value  =  ValeSpec__GlobalSettings__FinishSelect.value;
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;

        if (value === 'Other') {
            ValeSpec__GlobalSettings__OtherInput.style.display  =  '';
            ValeSpec__GlobalSettings__OtherInput.focus();
            ValeSpec__GlobalSettings__UserConfirmed  =  false;
            ValeSpec__GlobalSettings__UpdateStepCompletion(false);
            return;
        }

        ValeSpec__GlobalSettings__OtherInput.style.display  =  'none';
        ValeSpec__GlobalSettings__OtherInput.value          =  '';

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var WarningSystem =  window.ValeSpec__AssemblyEditor__WarningSystem;
        
        if (StateManager) {
            var state = StateManager.ValeSpec__StateManager__GetState();
            var globalFinish = state.globalIronmongeryFinish;
            
            if (!globalFinish) {
                StateManager.ValeSpec__StateManager__SetGlobalFinish(value);
            } else if (globalFinish !== value) {
                if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ShowIronmongeryMismatchWarning) {
                    WarningSystem.ValeSpec__WarningSystem__ShowIronmongeryMismatchWarning().then(function(confirmed) {
                        if (confirmed) {
                            // Update all others (set global finish, clear assembly specific)
                            StateManager.ValeSpec__StateManager__SetGlobalFinish(value);
                            var assembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
                            if (assembly && assembly['Assembly__IronmongeryFinish__Config']) {
                                delete assembly['Assembly__IronmongeryFinish__Config']['Assembly__IronmongeryFinish__Config__Finish'];
                                StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
                                if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
                                    WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
                                }
                            }
                        } else {
                            // Keep as assembly specific
                            var assembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
                            if (assembly) {
                                if (!assembly['Assembly__IronmongeryFinish__Config']) assembly['Assembly__IronmongeryFinish__Config'] = {};
                                assembly['Assembly__IronmongeryFinish__Config']['Assembly__IronmongeryFinish__Config__Finish'] = value;
                                StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
                                if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
                                    WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
                                }
                            }
                        }
                        ValeSpec__GlobalSettings__UserConfirmed  =  true;
                        ValeSpec__GlobalSettings__UpdateStepCompletion(true);
                        
                        var SvgPreview  =  window.ValeSpec__AssemblyEditor__SvgPreview;
                        var currentAssembly = StateManager ? StateManager.ValeSpec__StateManager__GetCurrentAssembly() : null;
                        if (SvgPreview && SvgPreview.ValeSpec__SvgPreview__Render && currentAssembly) {
                            SvgPreview.ValeSpec__SvgPreview__Render(currentAssembly);
                        }
                    });
                    return;
                } else {
                    var assembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
                    if (assembly) {
                        if (!assembly['Assembly__IronmongeryFinish__Config']) assembly['Assembly__IronmongeryFinish__Config'] = {};
                        assembly['Assembly__IronmongeryFinish__Config']['Assembly__IronmongeryFinish__Config__Finish'] = value;
                        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
                        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
                            var activeWarnings = WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
                            if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__GlobalSettings__ContainerEl) {
                                WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__GlobalSettings__ContainerEl, activeWarnings);
                            }
                        }
                    }
                }
            } else {
                var assembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
                if (assembly && assembly['Assembly__IronmongeryFinish__Config']) {
                    delete assembly['Assembly__IronmongeryFinish__Config']['Assembly__IronmongeryFinish__Config__Finish'];
                    StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
                    if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
                        var activeWarnings = WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
                        if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__GlobalSettings__ContainerEl) {
                            WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__GlobalSettings__ContainerEl, activeWarnings);
                        }
                    }
                }
            }
        }

        ValeSpec__GlobalSettings__UserConfirmed  =  !!value;
        ValeSpec__GlobalSettings__UpdateStepCompletion(ValeSpec__GlobalSettings__UserConfirmed);
        
        var SvgPreview  =  window.ValeSpec__AssemblyEditor__SvgPreview;
        var assembly = StateManager ? StateManager.ValeSpec__StateManager__GetCurrentAssembly() : null;
        if (SvgPreview && SvgPreview.ValeSpec__SvgPreview__Render && assembly) {
            SvgPreview.ValeSpec__SvgPreview__Render(assembly);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Other Free Text Change
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__OnOtherInputChange() {
        var value  =  ValeSpec__GlobalSettings__OtherInput.value.trim();
        if (!value) {
            ValeSpec__GlobalSettings__UserConfirmed  =  false;
            ValeSpec__GlobalSettings__UpdateStepCompletion(false);
            return;
        }

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var WarningSystem =  window.ValeSpec__AssemblyEditor__WarningSystem;

        if (StateManager) {
            var state = StateManager.ValeSpec__StateManager__GetState();
            var globalFinish = state.globalIronmongeryFinish;
            
            if (!globalFinish) {
                StateManager.ValeSpec__StateManager__SetGlobalFinish(value);
            } else if (globalFinish !== value) {
                if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ShowIronmongeryMismatchWarning) {
                    WarningSystem.ValeSpec__WarningSystem__ShowIronmongeryMismatchWarning().then(function(confirmed) {
                        if (confirmed) {
                            StateManager.ValeSpec__StateManager__SetGlobalFinish(value);
                            var assembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
                            if (assembly && assembly['Assembly__IronmongeryFinish__Config']) {
                                delete assembly['Assembly__IronmongeryFinish__Config']['Assembly__IronmongeryFinish__Config__Finish'];
                                StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
                                if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
                                    WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
                                }
                            }
                        } else {
                            var assembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
                            if (assembly) {
                                if (!assembly['Assembly__IronmongeryFinish__Config']) assembly['Assembly__IronmongeryFinish__Config'] = {};
                                assembly['Assembly__IronmongeryFinish__Config']['Assembly__IronmongeryFinish__Config__Finish'] = value;
                                StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
                                if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
                                    WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
                                }
                            }
                        }
                        ValeSpec__GlobalSettings__UserConfirmed  =  true;
                        ValeSpec__GlobalSettings__UpdateStepCompletion(true);
                        
                        var SvgPreview  =  window.ValeSpec__AssemblyEditor__SvgPreview;
                        var currentAssembly = StateManager ? StateManager.ValeSpec__StateManager__GetCurrentAssembly() : null;
                        if (SvgPreview && SvgPreview.ValeSpec__SvgPreview__Render && currentAssembly) {
                            SvgPreview.ValeSpec__SvgPreview__Render(currentAssembly);
                        }
                    });
                    return;
                } else {
                    var assembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
                    if (assembly) {
                        if (!assembly['Assembly__IronmongeryFinish__Config']) assembly['Assembly__IronmongeryFinish__Config'] = {};
                        assembly['Assembly__IronmongeryFinish__Config']['Assembly__IronmongeryFinish__Config__Finish'] = value;
                        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
                        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
                            var activeWarnings = WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
                            if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__GlobalSettings__ContainerEl) {
                                WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__GlobalSettings__ContainerEl, activeWarnings);
                            }
                        }
                    }
                }
            } else {
                var assembly = StateManager.ValeSpec__StateManager__GetCurrentAssembly();
                if (assembly && assembly['Assembly__IronmongeryFinish__Config']) {
                    delete assembly['Assembly__IronmongeryFinish__Config']['Assembly__IronmongeryFinish__Config__Finish'];
                    StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
                    if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
                        var activeWarnings = WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
                        if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__GlobalSettings__ContainerEl) {
                            WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__GlobalSettings__ContainerEl, activeWarnings);
                        }
                    }
                }
            }
        }

        ValeSpec__GlobalSettings__UserConfirmed  =  true;
        ValeSpec__GlobalSettings__UpdateStepCompletion(ValeSpec__GlobalSettings__UserConfirmed);
        
        var SvgPreview  =  window.ValeSpec__AssemblyEditor__SvgPreview;
        var assembly = StateManager ? StateManager.ValeSpec__StateManager__GetCurrentAssembly() : null;
        if (SvgPreview && SvgPreview.ValeSpec__SvgPreview__Render && assembly) {
            SvgPreview.ValeSpec__SvgPreview__Render(assembly);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var globalFinish = '';
        if (StateManager) {
            var state = StateManager.ValeSpec__StateManager__GetState();
            globalFinish = state.globalIronmongeryFinish || '';
        }

        var assemblyFinish = '';
        var finishCfg = assemblyData['Assembly__IronmongeryFinish__Config'];
        if (finishCfg && finishCfg['Assembly__IronmongeryFinish__Config__Finish']) {
            assemblyFinish = finishCfg['Assembly__IronmongeryFinish__Config__Finish'];
        }

        var targetFinish = assemblyFinish || globalFinish;

        if (targetFinish && ValeSpec__GlobalSettings__FinishSelect) {
            var matchFound  =  false;
            for (var j = 0; j < FINISH_OPTIONS.length; j++) {
                if (FINISH_OPTIONS[j].Value === targetFinish) {
                    matchFound  =  true;
                    break;
                }
            }
            if (matchFound) {
                ValeSpec__GlobalSettings__FinishSelect.value  =  targetFinish;
                ValeSpec__GlobalSettings__OtherInput.style.display = 'none';
            } else {
                ValeSpec__GlobalSettings__FinishSelect.value  =  'Other';
                ValeSpec__GlobalSettings__OtherInput.value    =  targetFinish;
                ValeSpec__GlobalSettings__OtherInput.style.display = '';
            }
            ValeSpec__GlobalSettings__UserConfirmed = true;
            ValeSpec__GlobalSettings__UpdateStepCompletion(true);
        } else {
            if (ValeSpec__GlobalSettings__FinishSelect) {
                ValeSpec__GlobalSettings__FinishSelect.value = '';
            }
            if (ValeSpec__GlobalSettings__OtherInput) {
                ValeSpec__GlobalSettings__OtherInput.value = '';
                ValeSpec__GlobalSettings__OtherInput.style.display = 'none';
            }
            ValeSpec__GlobalSettings__UserConfirmed = false;
            ValeSpec__GlobalSettings__UpdateStepCompletion(false);
        }
        
        var SvgPreview  =  window.ValeSpec__AssemblyEditor__SvgPreview;
        if (SvgPreview && SvgPreview.ValeSpec__SvgPreview__Render) {
            SvgPreview.ValeSpec__SvgPreview__Render(assemblyData);
        }

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly) {
            WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly(assemblyData, ValeSpec__GlobalSettings__ContainerEl);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Global Settings
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__Init(container) {
        ValeSpec__GlobalSettings__ContainerEl  =  container;
        if (!ValeSpec__GlobalSettings__ContainerEl) return;

        ValeSpec__GlobalSettings__BuildFinishDropdown();
        ValeSpec__GlobalSettings__RegisterSummary();
        ValeSpec__GlobalSettings__UserConfirmed  =  false;                 // <-- Default value does not count as user-confirmed completion
        ValeSpec__GlobalSettings__UpdateStepCompletion(false);

        console.log('[ValeSpec__GlobalSettings] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__GlobalSettings__Init  : ValeSpec__GlobalSettings__Init,
        ValeSpec__GlobalSettings__RefreshFromAssembly : ValeSpec__GlobalSettings__RefreshFromAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__GlobalSettings  =  ValeSpec__AssemblyEditor__GlobalSettings;
