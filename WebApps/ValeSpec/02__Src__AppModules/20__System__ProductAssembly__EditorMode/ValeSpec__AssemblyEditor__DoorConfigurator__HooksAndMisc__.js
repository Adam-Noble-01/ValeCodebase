/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: HOOKS AND MISCELLANEOUS
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - HooksAndMisc
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Step 5 (Cabin Hooks) and Step 6 (Miscellaneous)
   CREATED    : 2026

   DESCRIPTION:
   - Step 5: Cabin Hook size dropdown, hook count, eye count
   - Step 6: Miscellaneous checkboxes (N/A, Overhead Restrictors, etc.)
   - Hook size options loaded from AppConfig
   - Registers summary callbacks with StepManager
   - Updates assembly via StateManager on change

   ============================================================================= */

// =============================================================================
// REGION | Hooks and Miscellaneous Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc = (function() {

    // MODULE CONSTANTS | Miscellaneous Checkbox Options
    // ------------------------------------------------------------
    const MISC_OPTIONS  =  [
        { Label: 'N/A',                    Key: 'Misc_NA'                   },
        { Label: 'Overhead Restrictors',   Key: 'Misc_OverheadRestrictors'  },
        { Label: 'Letter Plate',           Key: 'Misc_LetterPlate'          },
        { Label: 'Cat Flap',               Key: 'Misc_CatFlap'              },
        { Label: 'Other',                  Key: 'Misc_Other'                }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let ValeSpec__HooksAndMisc__Step5BodyEl      =  null;   // <-- Step 5 card body (Hooks)
    let ValeSpec__HooksAndMisc__Step6BodyEl      =  null;   // <-- Step 6 card body (Misc)
    let ValeSpec__HooksAndMisc__CabinHookSelect  =  null;   // <-- Cabin hook size dropdown
    let ValeSpec__HooksAndMisc__HookCountInput   =  null;   // <-- Hook count numeric input
    let ValeSpec__HooksAndMisc__EyeCountInput    =  null;   // <-- Eye count numeric input
    let ValeSpec__HooksAndMisc__MiscCheckboxes   =  {};     // <-- Map of Key -> checkbox element
    let ValeSpec__HooksAndMisc__MiscOtherInput   =  null;   // <-- Free text input shown when 'Other' is checked
    let ValeSpec__HooksAndMisc__MiscOtherGroupEl =  null;   // <-- Form group wrapper for Other text input
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Cabin Hook Options from AppConfig
    // ------------------------------------------------------------
    function ValeSpec__HooksAndMisc__GetCabinHookOptions() {
        var ConfigLoader  =  window.ValeSpec__AppCore__ConfigLoader;
        var sourceOptions =  ['4"', '6"', '10"', '12"', '18"'];
        if (!ConfigLoader) return sourceOptions.map(function(item) { return { Label: item, Value: item }; });

        var section  =  ConfigLoader.ValeSpec__ConfigLoader__GetSection('CabinHookOptions');
        if (section) {
            sourceOptions  =  section['ValeSpec__CabinHook__Options__Config__Sizes'] || sourceOptions;
        }

        var result  =  [];
        for (var i = 0; i < sourceOptions.length; i++) {
            var item   =  sourceOptions[i];
            var label  =  '';
            var value  =  '';

            if (typeof item === 'string') {
                label  =  item.trim();
                value  =  label;
            } else if (item && typeof item === 'object') {
                label  =  String(item.Label || item.Value || '').trim();
                value  =  String(item.Value !== undefined ? item.Value : label).trim();
            }

            if (!label) continue;
            result.push({ Label: label, Value: value || label });
        }

        return result;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push All Hook/Misc Updates to StateManager
    // ------------------------------------------------------------
    function ValeSpec__HooksAndMisc__PushUpdate() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__CabinHooks__Config']) assembly['Assembly__CabinHooks__Config'] = {};
        assembly['Assembly__CabinHooks__Config']['Assembly__CabinHooks__Config__Size']       =  ValeSpec__HooksAndMisc__CabinHookSelect.value || '';
        assembly['Assembly__CabinHooks__Config']['Assembly__CabinHooks__Config__HookCount']  =  parseInt(ValeSpec__HooksAndMisc__HookCountInput.value, 10);
        assembly['Assembly__CabinHooks__Config']['Assembly__CabinHooks__Config__EyeCount']   =  parseInt(ValeSpec__HooksAndMisc__EyeCountInput.value, 10);

        var miscItems  =  [];
        for (var key in ValeSpec__HooksAndMisc__MiscCheckboxes) {
            if (ValeSpec__HooksAndMisc__MiscCheckboxes[key].checked) miscItems.push(key);
        }
        if (miscItems.length === 0) miscItems.push('N/A');
        if (!assembly['Assembly__Miscellaneous__Config']) assembly['Assembly__Miscellaneous__Config'] = {};
        assembly['Assembly__Miscellaneous__Config']['Assembly__Miscellaneous__Config__Items']  =  miscItems;
        if (ValeSpec__HooksAndMisc__MiscCheckboxes['Misc_Other'] && ValeSpec__HooksAndMisc__MiscCheckboxes['Misc_Other'].checked) {
            assembly['Assembly__Miscellaneous__Config']['Assembly__Miscellaneous__Config__OtherText']  =  ValeSpec__HooksAndMisc__MiscOtherInput ? ValeSpec__HooksAndMisc__MiscOtherInput.value.trim() : '';
        } else {
            delete assembly['Assembly__Miscellaneous__Config']['Assembly__Miscellaneous__Config__OtherText'];
        }

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle Visibility of Misc Other Text Input
    // ------------------------------------------------------------
    function ValeSpec__HooksAndMisc__UpdateMiscOtherVisibility() {
        if (!ValeSpec__HooksAndMisc__MiscOtherGroupEl) return;
        var isOtherChecked  =  !!(ValeSpec__HooksAndMisc__MiscCheckboxes['Misc_Other'] && ValeSpec__HooksAndMisc__MiscCheckboxes['Misc_Other'].checked);
        ValeSpec__HooksAndMisc__MiscOtherGroupEl.style.display  =  isOtherChecked ? '' : 'none';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 5 - Cabin Hooks
    // ------------------------------------------------------------
    function ValeSpec__HooksAndMisc__BuildHooksStep() {
        var hookGroup  =  document.createElement('div');
        hookGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var hookLabel  =  document.createElement('label');
        hookLabel.textContent  =  'Cabin Hook Size';
        hookLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__CabinHookSize');

        ValeSpec__HooksAndMisc__CabinHookSelect     =  document.createElement('select');
        ValeSpec__HooksAndMisc__CabinHookSelect.id  =  'ValeSpec__AssemblyEditor__CabinHookSize';

        var hookOptions  =  ValeSpec__HooksAndMisc__GetCabinHookOptions();
        for (var i = 0; i < hookOptions.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  hookOptions[i].Value;
            opt.textContent  =  hookOptions[i].Label;
            ValeSpec__HooksAndMisc__CabinHookSelect.appendChild(opt);
        }

        var noneOpt          =  document.createElement('option');
        noneOpt.value        =  '';
        noneOpt.textContent  =  'None';
        ValeSpec__HooksAndMisc__CabinHookSelect.appendChild(noneOpt);               // <-- Keep None at end of list

        ValeSpec__HooksAndMisc__CabinHookSelect.addEventListener('change', ValeSpec__HooksAndMisc__PushUpdate);

        hookGroup.appendChild(hookLabel);
        hookGroup.appendChild(ValeSpec__HooksAndMisc__CabinHookSelect);

        var countsRow  =  document.createElement('div');
        countsRow.className  =  'ValeSpec__AssemblyEditor__FormRow';
        countsRow.style.marginTop  =  '12px';

        var hookCountGroup  =  document.createElement('div');
        hookCountGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var hookCountLabel  =  document.createElement('label');
        hookCountLabel.textContent  =  'Hook Count';
        hookCountLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__HookCount');

        ValeSpec__HooksAndMisc__HookCountInput       =  document.createElement('input');
        ValeSpec__HooksAndMisc__HookCountInput.type  =  'number';
        ValeSpec__HooksAndMisc__HookCountInput.id    =  'ValeSpec__AssemblyEditor__HookCount';
        ValeSpec__HooksAndMisc__HookCountInput.min   =  0;
        ValeSpec__HooksAndMisc__HookCountInput.max   =  20;
        ValeSpec__HooksAndMisc__HookCountInput.value =  0;

        ValeSpec__HooksAndMisc__HookCountInput.addEventListener('change', ValeSpec__HooksAndMisc__PushUpdate);

        hookCountGroup.appendChild(hookCountLabel);
        hookCountGroup.appendChild(ValeSpec__HooksAndMisc__HookCountInput);

        var eyeCountGroup  =  document.createElement('div');
        eyeCountGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var eyeCountLabel  =  document.createElement('label');
        eyeCountLabel.textContent  =  'Eye Count';
        eyeCountLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__EyeCount');

        ValeSpec__HooksAndMisc__EyeCountInput       =  document.createElement('input');
        ValeSpec__HooksAndMisc__EyeCountInput.type  =  'number';
        ValeSpec__HooksAndMisc__EyeCountInput.id    =  'ValeSpec__AssemblyEditor__EyeCount';
        ValeSpec__HooksAndMisc__EyeCountInput.min   =  0;
        ValeSpec__HooksAndMisc__EyeCountInput.max   =  20;
        ValeSpec__HooksAndMisc__EyeCountInput.value =  0;

        ValeSpec__HooksAndMisc__EyeCountInput.addEventListener('change', ValeSpec__HooksAndMisc__PushUpdate);

        eyeCountGroup.appendChild(eyeCountLabel);
        eyeCountGroup.appendChild(ValeSpec__HooksAndMisc__EyeCountInput);

        countsRow.appendChild(hookCountGroup);
        countsRow.appendChild(eyeCountGroup);

        var footerEl  =  ValeSpec__HooksAndMisc__Step5BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__HooksAndMisc__Step5BodyEl.insertBefore(hookGroup, footerEl);
        ValeSpec__HooksAndMisc__Step5BodyEl.insertBefore(countsRow, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 6 - Miscellaneous
    // ------------------------------------------------------------
    function ValeSpec__HooksAndMisc__BuildMiscStep() {
        var miscGroup  =  document.createElement('div');
        miscGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var miscLabel  =  document.createElement('label');
        miscLabel.textContent  =  'Select Applicable Items';
        miscGroup.appendChild(miscLabel);

        for (var i = 0; i < MISC_OPTIONS.length; i++) {
            var wrapper  =  document.createElement('label');
            wrapper.className  =  'ValeSpec__AssemblyEditor__CheckboxRow';

            var checkbox              =  document.createElement('input');
            checkbox.type             =  'checkbox';
            checkbox.id               =  'ValeSpec__AssemblyEditor__' + MISC_OPTIONS[i].Key;
            checkbox.dataset.miscKey  =  MISC_OPTIONS[i].Key;

            checkbox.addEventListener('change', function(e) {
                var key  =  e.target.dataset.miscKey;

                if (key === 'Misc_NA' && e.target.checked) {
                    for (var k in ValeSpec__HooksAndMisc__MiscCheckboxes) {
                        if (k !== 'Misc_NA') ValeSpec__HooksAndMisc__MiscCheckboxes[k].checked  =  false;
                    }
                } else if (key !== 'Misc_NA' && e.target.checked) {
                    if (ValeSpec__HooksAndMisc__MiscCheckboxes['Misc_NA']) ValeSpec__HooksAndMisc__MiscCheckboxes['Misc_NA'].checked  =  false;
                }

                ValeSpec__HooksAndMisc__UpdateMiscOtherVisibility();
                ValeSpec__HooksAndMisc__PushUpdate();
            });

            var text  =  document.createTextNode(MISC_OPTIONS[i].Label);
            wrapper.appendChild(checkbox);
            wrapper.appendChild(text);
            miscGroup.appendChild(wrapper);

            ValeSpec__HooksAndMisc__MiscCheckboxes[MISC_OPTIONS[i].Key]  =  checkbox;
        }

        ValeSpec__HooksAndMisc__MiscOtherGroupEl  =  document.createElement('div');
        ValeSpec__HooksAndMisc__MiscOtherGroupEl.className  =  'ValeSpec__AssemblyEditor__FormGroup';
        ValeSpec__HooksAndMisc__MiscOtherGroupEl.style.marginTop  =  '10px';
        ValeSpec__HooksAndMisc__MiscOtherGroupEl.style.display    =  'none';

        var miscOtherLabel  =  document.createElement('label');
        miscOtherLabel.textContent  =  'Other Details';
        miscOtherLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__MiscOtherText');

        ValeSpec__HooksAndMisc__MiscOtherInput       =  document.createElement('input');
        ValeSpec__HooksAndMisc__MiscOtherInput.type  =  'text';
        ValeSpec__HooksAndMisc__MiscOtherInput.id    =  'ValeSpec__AssemblyEditor__MiscOtherText';
        ValeSpec__HooksAndMisc__MiscOtherInput.placeholder  =  'Enter other miscellaneous item...';
        ValeSpec__HooksAndMisc__MiscOtherInput.addEventListener('input', ValeSpec__HooksAndMisc__PushUpdate);

        ValeSpec__HooksAndMisc__MiscOtherGroupEl.appendChild(miscOtherLabel);
        ValeSpec__HooksAndMisc__MiscOtherGroupEl.appendChild(ValeSpec__HooksAndMisc__MiscOtherInput);
        miscGroup.appendChild(ValeSpec__HooksAndMisc__MiscOtherGroupEl);

        var footerEl  =  ValeSpec__HooksAndMisc__Step6BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__HooksAndMisc__Step6BodyEl.insertBefore(miscGroup, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 5 (Hooks)
    // ------------------------------------------------------------
    function ValeSpec__HooksAndMisc__HooksSummary() {
        var size   =  ValeSpec__HooksAndMisc__CabinHookSelect ? ValeSpec__HooksAndMisc__CabinHookSelect.value : '';
        var label  =  '';
        var hooks  =  ValeSpec__HooksAndMisc__HookCountInput  ? ValeSpec__HooksAndMisc__HookCountInput.value  : '0';
        var eyes   =  ValeSpec__HooksAndMisc__EyeCountInput   ? ValeSpec__HooksAndMisc__EyeCountInput.value   : '0';
        if (!size) return 'None';
        if (ValeSpec__HooksAndMisc__CabinHookSelect && ValeSpec__HooksAndMisc__CabinHookSelect.selectedIndex >= 0) {
            label  =  ValeSpec__HooksAndMisc__CabinHookSelect.options[ValeSpec__HooksAndMisc__CabinHookSelect.selectedIndex].textContent || '';
        }
        return (label || size) + '  |  ' + hooks + ' hooks, ' + eyes + ' eyes';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 6 (Misc)
    // ------------------------------------------------------------
    function ValeSpec__HooksAndMisc__MiscSummary() {
        var selected  =  [];
        for (var key in ValeSpec__HooksAndMisc__MiscCheckboxes) {
            if (ValeSpec__HooksAndMisc__MiscCheckboxes[key].checked) {
                for (var j = 0; j < MISC_OPTIONS.length; j++) {
                    if (MISC_OPTIONS[j].Key === key) {
                        if (key === 'Misc_Other') {
                            var otherText  =  ValeSpec__HooksAndMisc__MiscOtherInput ? ValeSpec__HooksAndMisc__MiscOtherInput.value.trim() : '';
                            selected.push(otherText ? ('Other: ' + otherText) : 'Other');
                        } else {
                            selected.push(MISC_OPTIONS[j].Label);
                        }
                        break;
                    }
                }
            }
        }
        return selected.length > 0 ? selected.join(', ') : 'N/A';
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__HooksAndMisc__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var hooksCfg  =  assemblyData['Assembly__CabinHooks__Config']    || {};
        var miscCfg   =  assemblyData['Assembly__Miscellaneous__Config'] || {};

        if (ValeSpec__HooksAndMisc__CabinHookSelect) {
            ValeSpec__HooksAndMisc__CabinHookSelect.value  =  hooksCfg['Assembly__CabinHooks__Config__Size'] !== undefined ? String(hooksCfg['Assembly__CabinHooks__Config__Size']) : '';
        }
        if (ValeSpec__HooksAndMisc__HookCountInput) {
            ValeSpec__HooksAndMisc__HookCountInput.value   =  hooksCfg['Assembly__CabinHooks__Config__HookCount'] || 0;
        }
        if (ValeSpec__HooksAndMisc__EyeCountInput) {
            ValeSpec__HooksAndMisc__EyeCountInput.value    =  hooksCfg['Assembly__CabinHooks__Config__EyeCount'] || 0;
        }

        var miscItems  =  miscCfg['Assembly__Miscellaneous__Config__Items'] || ['N/A'];
        for (var key in ValeSpec__HooksAndMisc__MiscCheckboxes) {
            ValeSpec__HooksAndMisc__MiscCheckboxes[key].checked  =  miscItems.indexOf(key) !== -1;
        }

        if (ValeSpec__HooksAndMisc__MiscOtherInput) {
            ValeSpec__HooksAndMisc__MiscOtherInput.value  =  miscCfg['Assembly__Miscellaneous__Config__OtherText'] || '';
        }
        ValeSpec__HooksAndMisc__UpdateMiscOtherVisibility();
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summaries with StepManager
    // ------------------------------------------------------------
    function ValeSpec__HooksAndMisc__RegisterSummaries() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        StepManager.ValeSpec__StepManager__RegisterSummary('hooks', ValeSpec__HooksAndMisc__HooksSummary);
        StepManager.ValeSpec__StepManager__RegisterSummary('misc',  ValeSpec__HooksAndMisc__MiscSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Hooks and Miscellaneous Steps
    // ------------------------------------------------------------
    function ValeSpec__HooksAndMisc__Init(step5BodyEl, step6BodyEl) {
        ValeSpec__HooksAndMisc__Step5BodyEl  =  step5BodyEl;
        ValeSpec__HooksAndMisc__Step6BodyEl  =  step6BodyEl;
        if (!ValeSpec__HooksAndMisc__Step5BodyEl || !ValeSpec__HooksAndMisc__Step6BodyEl) return;

        ValeSpec__HooksAndMisc__BuildHooksStep();
        ValeSpec__HooksAndMisc__BuildMiscStep();
        ValeSpec__HooksAndMisc__RegisterSummaries();

        console.log('[ValeSpec__HooksAndMisc] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__HooksAndMisc__Init                : ValeSpec__HooksAndMisc__Init,
        ValeSpec__HooksAndMisc__RefreshFromAssembly : ValeSpec__HooksAndMisc__RefreshFromAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc  =  ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc;
