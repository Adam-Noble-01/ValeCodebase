/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: MISCELLANEOUS
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - Miscellaneous
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Step 7 (Miscellaneous) controls and persistence
   CREATED    : 2026

   DESCRIPTION:
   - Renders miscellaneous checkbox options from Na__AssemblyEditor__Config.json
   - Handles N/A exclusivity and conditional Other text input
   - Persists updates to Assembly__Miscellaneous__Config via StateManager
   - Registers misc summary callback with StepManager
   - Exposes FlushToAssembly() for explicit save pipeline sync

   ============================================================================= */

// =============================================================================
// REGION | Miscellaneous Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous = (function() {

    // MODULE CONSTANTS | Config Path and Fallbacks
    // ------------------------------------------------------------
    const CONFIG_PATH                =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/Na__AssemblyEditor__Config.json';
    const OTHER_TEXT_COMMIT_DELAY_MS =  2000;                                                    // <-- Wait after typing stops before persisting Other text
    const FALLBACK_CFG =  {
        NaOptionKey      : 'Misc_NA',
        OtherOptionKey   : 'Misc_Other',
        DefaultItems     : ['Misc_NA'],
        OtherLabel       : 'Other Details',
        OtherPlaceholder : 'Enter other miscellaneous item...',
        Options          : [
            { Label: 'N/A',                    Key: 'Misc_NA'                  },
            { Label: 'Overhead Restrictors',   Key: 'Misc_OverheadRestrictors' },
            { Label: 'Letter Plate',           Key: 'Misc_LetterPlate'         },
            { Label: 'Cat Flap',               Key: 'Misc_CatFlap'             },
            { Label: 'Other',                  Key: 'Misc_Other'               }
        ]
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM and Config State
    // ------------------------------------------------------------
    let ValeSpec__Miscellaneous__StepBodyEl              =  null;   // <-- Step card body for misc section
    let ValeSpec__Miscellaneous__Checkboxes              =  {};     // <-- Map of option key -> checkbox element
    let ValeSpec__Miscellaneous__OtherInput              =  null;   // <-- Free text input shown when Other is checked
    let ValeSpec__Miscellaneous__OtherGroupEl            =  null;   // <-- Form group wrapper for Other input
    let ValeSpec__Miscellaneous__Config                  =  null;   // <-- Miscellaneous config subsection
    let ValeSpec__Miscellaneous__OtherTextCommitTimer    =  null;   // <-- Pending delayed commit timer for Other text
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Miscellaneous Config
    // ------------------------------------------------------------
    async function ValeSpec__Miscellaneous__LoadConfig() {
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) return;
            var data  =  await response.json();
            ValeSpec__Miscellaneous__Config  =  data['AssemblyEditor__Miscellaneous__Config'] || null;
        } catch (e) {
            console.warn('[ValeSpec__Miscellaneous] Config load failed:', e);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Miscellaneous UI Config
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__GetResolvedUiConfig() {
        var cfg  =  ValeSpec__Miscellaneous__Config || {};
        var options  =  cfg['AssemblyEditor__Miscellaneous__Config__Options'];
        if (!options || !options.length) options  =  FALLBACK_CFG.Options;

        return {
            NaOptionKey      : cfg['AssemblyEditor__Miscellaneous__Config__NaOptionKey']      || FALLBACK_CFG.NaOptionKey,
            OtherOptionKey   : cfg['AssemblyEditor__Miscellaneous__Config__OtherOptionKey']   || FALLBACK_CFG.OtherOptionKey,
            DefaultItems     : cfg['AssemblyEditor__Miscellaneous__Config__DefaultItems']      || FALLBACK_CFG.DefaultItems,
            OtherLabel       : cfg['AssemblyEditor__Miscellaneous__Config__OtherLabel']        || FALLBACK_CFG.OtherLabel,
            OtherPlaceholder : cfg['AssemblyEditor__Miscellaneous__Config__OtherPlaceholder']  || FALLBACK_CFG.OtherPlaceholder,
            Options          : options
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle Visibility of Other Text Input
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__UpdateOtherVisibility() {
        if (!ValeSpec__Miscellaneous__OtherGroupEl) return;
        var uiCfg           =  ValeSpec__Miscellaneous__GetResolvedUiConfig();
        var otherOptionKey  =  uiCfg.OtherOptionKey;
        var showOtherInput  =  !!(ValeSpec__Miscellaneous__Checkboxes[otherOptionKey] && ValeSpec__Miscellaneous__Checkboxes[otherOptionKey].checked);
        ValeSpec__Miscellaneous__OtherGroupEl.style.display  =  showOtherInput ? '' : 'none';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clear Pending Delayed Other Text Commit
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__ClearPendingOtherTextCommit() {
        if (ValeSpec__Miscellaneous__OtherTextCommitTimer) {
            clearTimeout(ValeSpec__Miscellaneous__OtherTextCommitTimer);
            ValeSpec__Miscellaneous__OtherTextCommitTimer  =  null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Commit Other Text Immediately
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__CommitOtherTextNow() {
        ValeSpec__Miscellaneous__ClearPendingOtherTextCommit();
        ValeSpec__Miscellaneous__PushUpdate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Schedule Delayed Other Text Commit
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__ScheduleOtherTextCommit() {
        ValeSpec__Miscellaneous__ClearPendingOtherTextCommit();
        ValeSpec__Miscellaneous__OtherTextCommitTimer  =  setTimeout(function() {
            ValeSpec__Miscellaneous__OtherTextCommitTimer  =  null;
            ValeSpec__Miscellaneous__PushUpdate();
        }, OTHER_TEXT_COMMIT_DELAY_MS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine If Other Text Input Is Being Edited
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__IsOtherTextBeingEdited() {
        var activeEl      =  document.activeElement;
        var isFocused     =  !!ValeSpec__Miscellaneous__OtherInput && activeEl === ValeSpec__Miscellaneous__OtherInput;
        var hasPendingCommit  =  !!ValeSpec__Miscellaneous__OtherTextCommitTimer;
        return isFocused || hasPendingCommit;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Label by Misc Option Key
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__ResolveLabelForKey(key) {
        var uiCfg    =  ValeSpec__Miscellaneous__GetResolvedUiConfig();
        var options  =  uiCfg.Options || [];
        for (var i = 0; i < options.length; i++) {
            if (options[i] && options[i].Key === key) {
                return options[i].Label || key;
            }
        }
        return key;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Persist Misc Controls to Current Assembly
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__PushUpdate() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        var uiCfg          =  ValeSpec__Miscellaneous__GetResolvedUiConfig();
        var defaultItems   =  uiCfg.DefaultItems && uiCfg.DefaultItems.length ? uiCfg.DefaultItems : FALLBACK_CFG.DefaultItems;
        var otherOptionKey =  uiCfg.OtherOptionKey;

        var miscItems  =  [];
        for (var key in ValeSpec__Miscellaneous__Checkboxes) {
            if (ValeSpec__Miscellaneous__Checkboxes[key].checked) miscItems.push(key);
        }
        if (miscItems.length === 0) miscItems  =  defaultItems.slice();

        if (!assembly['Assembly__Miscellaneous__Config']) assembly['Assembly__Miscellaneous__Config'] = {};
        assembly['Assembly__Miscellaneous__Config']['Assembly__Miscellaneous__Config__Items']  =  miscItems;

        if (ValeSpec__Miscellaneous__Checkboxes[otherOptionKey] && ValeSpec__Miscellaneous__Checkboxes[otherOptionKey].checked) {
            assembly['Assembly__Miscellaneous__Config']['Assembly__Miscellaneous__Config__OtherText']  =  ValeSpec__Miscellaneous__OtherInput ? ValeSpec__Miscellaneous__OtherInput.value : '';
        } else {
            delete assembly['Assembly__Miscellaneous__Config']['Assembly__Miscellaneous__Config__OtherText'];
        }

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Misc Checkbox Change
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__OnCheckboxChanged(event) {
        ValeSpec__Miscellaneous__ClearPendingOtherTextCommit();

        var uiCfg         =  ValeSpec__Miscellaneous__GetResolvedUiConfig();
        var naOptionKey   =  uiCfg.NaOptionKey;
        var selectedKey   =  event.target.dataset.miscKey;

        if (selectedKey === naOptionKey && event.target.checked) {
            for (var key in ValeSpec__Miscellaneous__Checkboxes) {
                if (key !== naOptionKey) ValeSpec__Miscellaneous__Checkboxes[key].checked  =  false;
            }
        } else if (selectedKey !== naOptionKey && event.target.checked) {
            if (ValeSpec__Miscellaneous__Checkboxes[naOptionKey]) {
                ValeSpec__Miscellaneous__Checkboxes[naOptionKey].checked  =  false;
            }
        }

        ValeSpec__Miscellaneous__UpdateOtherVisibility();
        ValeSpec__Miscellaneous__PushUpdate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Miscellaneous Step Controls
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__BuildStep() {
        var uiCfg    =  ValeSpec__Miscellaneous__GetResolvedUiConfig();
        var options  =  uiCfg.Options || [];

        var miscGroup  =  document.createElement('div');
        miscGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var miscLabel  =  document.createElement('label');
        miscLabel.textContent  =  'Select Applicable Items';
        miscGroup.appendChild(miscLabel);

        for (var i = 0; i < options.length; i++) {
            if (!options[i] || !options[i].Key) continue;

            var wrapper  =  document.createElement('label');
            wrapper.className  =  'ValeSpec__AssemblyEditor__CheckboxRow';

            var checkbox              =  document.createElement('input');
            checkbox.type             =  'checkbox';
            checkbox.id               =  'ValeSpec__AssemblyEditor__' + options[i].Key;
            checkbox.dataset.miscKey  =  options[i].Key;
            checkbox.addEventListener('change', ValeSpec__Miscellaneous__OnCheckboxChanged);

            wrapper.appendChild(checkbox);
            wrapper.appendChild(document.createTextNode(options[i].Label || options[i].Key));
            miscGroup.appendChild(wrapper);

            ValeSpec__Miscellaneous__Checkboxes[options[i].Key]  =  checkbox;
        }

        ValeSpec__Miscellaneous__OtherGroupEl  =  document.createElement('div');
        ValeSpec__Miscellaneous__OtherGroupEl.className  =  'ValeSpec__AssemblyEditor__FormGroup';
        ValeSpec__Miscellaneous__OtherGroupEl.style.marginTop  =  '10px';
        ValeSpec__Miscellaneous__OtherGroupEl.style.display    =  'none';

        var otherLabel  =  document.createElement('label');
        otherLabel.textContent  =  uiCfg.OtherLabel;
        otherLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__MiscOtherText');

        ValeSpec__Miscellaneous__OtherInput              =  document.createElement('textarea');
        ValeSpec__Miscellaneous__OtherInput.id           =  'ValeSpec__AssemblyEditor__MiscOtherText';
        ValeSpec__Miscellaneous__OtherInput.placeholder  =  uiCfg.OtherPlaceholder;
        ValeSpec__Miscellaneous__OtherInput.rows         =  4;
        ValeSpec__Miscellaneous__OtherInput.addEventListener('input', ValeSpec__Miscellaneous__ScheduleOtherTextCommit);
        ValeSpec__Miscellaneous__OtherInput.addEventListener('blur', ValeSpec__Miscellaneous__CommitOtherTextNow);

        ValeSpec__Miscellaneous__OtherGroupEl.appendChild(otherLabel);
        ValeSpec__Miscellaneous__OtherGroupEl.appendChild(ValeSpec__Miscellaneous__OtherInput);
        miscGroup.appendChild(ValeSpec__Miscellaneous__OtherGroupEl);

        var footerEl  =  ValeSpec__Miscellaneous__StepBodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__Miscellaneous__StepBodyEl.insertBefore(miscGroup, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Misc Step
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__Summary() {
        var uiCfg          =  ValeSpec__Miscellaneous__GetResolvedUiConfig();
        var otherOptionKey =  uiCfg.OtherOptionKey;
        var selected       =  [];

        for (var key in ValeSpec__Miscellaneous__Checkboxes) {
            if (!ValeSpec__Miscellaneous__Checkboxes[key].checked) continue;

            if (key === otherOptionKey) {
                var otherText  =  ValeSpec__Miscellaneous__OtherInput ? ValeSpec__Miscellaneous__OtherInput.value.trim() : '';
                selected.push(otherText ? ('Other: ' + otherText) : 'Other');
            } else {
                selected.push(ValeSpec__Miscellaneous__ResolveLabelForKey(key));
            }
        }

        if (!selected.length) {
            var fallbackLabel  =  ValeSpec__Miscellaneous__ResolveLabelForKey(uiCfg.NaOptionKey);
            return fallbackLabel || 'N/A';
        }

        return selected.join(', ');
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Misc Controls from Assembly
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var miscCfg   =  assemblyData['Assembly__Miscellaneous__Config'] || {};
        var uiCfg     =  ValeSpec__Miscellaneous__GetResolvedUiConfig();
        var items     =  miscCfg['Assembly__Miscellaneous__Config__Items'] || uiCfg.DefaultItems || FALLBACK_CFG.DefaultItems;
        var naKey     =  uiCfg.NaOptionKey;

        for (var key in ValeSpec__Miscellaneous__Checkboxes) {
            var isSelected  =  items.indexOf(key) !== -1;

            if (!isSelected && key === naKey) {
                isSelected  =  items.indexOf('N/A') !== -1;                        // <-- Backward compatibility for legacy plain-string value
            }
            ValeSpec__Miscellaneous__Checkboxes[key].checked  =  isSelected;
        }

        if (ValeSpec__Miscellaneous__OtherInput && !ValeSpec__Miscellaneous__IsOtherTextBeingEdited()) {
            ValeSpec__Miscellaneous__OtherInput.value  =  miscCfg['Assembly__Miscellaneous__Config__OtherText'] || '';
        }
        ValeSpec__Miscellaneous__UpdateOtherVisibility();
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Misc Summary with StepManager
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__RegisterSummary() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;
        StepManager.ValeSpec__StepManager__RegisterSummary('misc', ValeSpec__Miscellaneous__Summary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Flush Current Misc Values to Assembly
    // ------------------------------------------------------------
    function ValeSpec__Miscellaneous__FlushToAssembly() {
        ValeSpec__Miscellaneous__CommitOtherTextNow();
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Miscellaneous Step
    // ------------------------------------------------------------
    async function ValeSpec__Miscellaneous__Init(stepBodyEl) {
        ValeSpec__Miscellaneous__StepBodyEl  =  stepBodyEl;
        if (!ValeSpec__Miscellaneous__StepBodyEl) return;

        await ValeSpec__Miscellaneous__LoadConfig();
        ValeSpec__Miscellaneous__BuildStep();
        ValeSpec__Miscellaneous__RegisterSummary();

        console.log('[ValeSpec__Miscellaneous] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__Miscellaneous__Init                : ValeSpec__Miscellaneous__Init,
        ValeSpec__Miscellaneous__RefreshFromAssembly : ValeSpec__Miscellaneous__RefreshFromAssembly,
        ValeSpec__Miscellaneous__FlushToAssembly     : ValeSpec__Miscellaneous__FlushToAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous  =  ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous;
