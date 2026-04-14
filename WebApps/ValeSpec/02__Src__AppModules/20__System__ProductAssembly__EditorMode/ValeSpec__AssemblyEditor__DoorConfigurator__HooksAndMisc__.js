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
        { Label: 'Letter Plate',           Key: 'Misc_LetterPlate'         },
        { Label: 'Cat Flap',              Key: 'Misc_CatFlap'             }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let _step5BodyEl       =  null;                                         // <-- Step 5 card body (Hooks)
    let _step6BodyEl       =  null;                                         // <-- Step 6 card body (Misc)
    let _cabinHookSelect   =  null;                                         // <-- Cabin hook size dropdown
    let _hookCountInput    =  null;                                         // <-- Hook count numeric input
    let _eyeCountInput     =  null;                                         // <-- Eye count numeric input
    let _miscCheckboxes    =  {};                                           // <-- Map of Key -> checkbox element
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Cabin Hook Options from AppConfig
    // ------------------------------------------------------------
    function _getCabinHookOptions() {
        var ConfigLoader  =  window.ValeSpec__AppCore__ConfigLoader;
        if (!ConfigLoader) return [];

        var section  =  ConfigLoader.getSection('CabinHookOptions');
        if (!section) return [];

        return section['ValeSpec__CabinHook__Options__Config__Sizes'] || [
            { Label: '75 mm',   Value: 75  },
            { Label: '100 mm',  Value: 100 },
            { Label: '150 mm',  Value: 150 },
            { Label: '200 mm',  Value: 200 }
        ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 5 - Cabin Hooks
    // ------------------------------------------------------------
    function _buildHooksStep() {
        var hookGroup  =  document.createElement('div');
        hookGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var hookLabel  =  document.createElement('label');
        hookLabel.textContent  =  'Cabin Hook Size';
        hookLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__CabinHookSize');

        _cabinHookSelect     =  document.createElement('select');
        _cabinHookSelect.id  =  'ValeSpec__AssemblyEditor__CabinHookSize';

        var noneOpt          =  document.createElement('option');
        noneOpt.value        =  '';
        noneOpt.textContent  =  'None';
        _cabinHookSelect.appendChild(noneOpt);

        var hookOptions  =  _getCabinHookOptions();
        for (var i = 0; i < hookOptions.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  hookOptions[i].Value;
            opt.textContent  =  hookOptions[i].Label;
            _cabinHookSelect.appendChild(opt);
        }

        _cabinHookSelect.addEventListener('change', _onCabinHookChange);

        hookGroup.appendChild(hookLabel);
        hookGroup.appendChild(_cabinHookSelect);

        var countsRow  =  document.createElement('div');
        countsRow.className  =  'ValeSpec__AssemblyEditor__FormRow';
        countsRow.style.marginTop  =  '12px';

        var hookCountGroup  =  document.createElement('div');
        hookCountGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var hookCountLabel  =  document.createElement('label');
        hookCountLabel.textContent  =  'Hook Count';
        hookCountLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__HookCount');

        _hookCountInput       =  document.createElement('input');
        _hookCountInput.type  =  'number';
        _hookCountInput.id    =  'ValeSpec__AssemblyEditor__HookCount';
        _hookCountInput.min   =  0;
        _hookCountInput.max   =  20;
        _hookCountInput.value =  0;

        _hookCountInput.addEventListener('change', _onHookCountChange);

        hookCountGroup.appendChild(hookCountLabel);
        hookCountGroup.appendChild(_hookCountInput);

        var eyeCountGroup  =  document.createElement('div');
        eyeCountGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var eyeCountLabel  =  document.createElement('label');
        eyeCountLabel.textContent  =  'Eye Count';
        eyeCountLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__EyeCount');

        _eyeCountInput       =  document.createElement('input');
        _eyeCountInput.type  =  'number';
        _eyeCountInput.id    =  'ValeSpec__AssemblyEditor__EyeCount';
        _eyeCountInput.min   =  0;
        _eyeCountInput.max   =  20;
        _eyeCountInput.value =  0;

        _eyeCountInput.addEventListener('change', _onEyeCountChange);

        eyeCountGroup.appendChild(eyeCountLabel);
        eyeCountGroup.appendChild(_eyeCountInput);

        countsRow.appendChild(hookCountGroup);
        countsRow.appendChild(eyeCountGroup);

        var footerEl  =  _step5BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        _step5BodyEl.insertBefore(hookGroup, footerEl);
        _step5BodyEl.insertBefore(countsRow, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 6 - Miscellaneous
    // ------------------------------------------------------------
    function _buildMiscStep() {
        var miscGroup  =  document.createElement('div');
        miscGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var miscLabel  =  document.createElement('label');
        miscLabel.textContent  =  'Select Applicable Items';

        miscGroup.appendChild(miscLabel);

        for (var i = 0; i < MISC_OPTIONS.length; i++) {
            var wrapper  =  document.createElement('label');
            wrapper.className  =  'ValeSpec__AssemblyEditor__CheckboxRow';

            var checkbox       =  document.createElement('input');
            checkbox.type      =  'checkbox';
            checkbox.id        =  'ValeSpec__AssemblyEditor__' + MISC_OPTIONS[i].Key;
            checkbox.dataset.miscKey  =  MISC_OPTIONS[i].Key;

            checkbox.addEventListener('change', _onMiscCheckboxChange);

            var text  =  document.createTextNode(MISC_OPTIONS[i].Label);

            wrapper.appendChild(checkbox);
            wrapper.appendChild(text);
            miscGroup.appendChild(wrapper);

            _miscCheckboxes[MISC_OPTIONS[i].Key]  =  checkbox;
        }

        var footerEl  =  _step6BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        _step6BodyEl.insertBefore(miscGroup, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Cabin Hook Size Change
    // ------------------------------------------------------------
    function _onCabinHookChange() {
        _pushUpdate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Hook Count Change
    // ------------------------------------------------------------
    function _onHookCountChange() {
        _pushUpdate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Eye Count Change
    // ------------------------------------------------------------
    function _onEyeCountChange() {
        _pushUpdate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Miscellaneous Checkbox Change
    // ------------------------------------------------------------
    function _onMiscCheckboxChange(e) {
        var key  =  e.target.dataset.miscKey;

        if (key === 'Misc_NA' && e.target.checked) {
            for (var k in _miscCheckboxes) {
                if (k !== 'Misc_NA') _miscCheckboxes[k].checked  =  false;
            }
        } else if (key !== 'Misc_NA' && e.target.checked) {
            if (_miscCheckboxes['Misc_NA']) _miscCheckboxes['Misc_NA'].checked  =  false;
        }

        _pushUpdate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push All Hook/Misc Updates to StateManager
    // ------------------------------------------------------------
    function _pushUpdate() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;

        if (!assembly['Assembly__CabinHooks__Config']) assembly['Assembly__CabinHooks__Config'] = {};
        assembly['Assembly__CabinHooks__Config']['Assembly__CabinHooks__Config__Size']       =  _cabinHookSelect.value || '';
        assembly['Assembly__CabinHooks__Config']['Assembly__CabinHooks__Config__HookCount']  =  parseInt(_hookCountInput.value, 10);
        assembly['Assembly__CabinHooks__Config']['Assembly__CabinHooks__Config__EyeCount']   =  parseInt(_eyeCountInput.value, 10);

        var miscItems  =  [];
        for (var key in _miscCheckboxes) {
            if (_miscCheckboxes[key].checked) miscItems.push(key);
        }
        if (miscItems.length === 0) miscItems.push('N/A');
        if (!assembly['Assembly__Miscellaneous__Config']) assembly['Assembly__Miscellaneous__Config'] = {};
        assembly['Assembly__Miscellaneous__Config']['Assembly__Miscellaneous__Config__Items']  =  miscItems;

        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 5 (Hooks)
    // ------------------------------------------------------------
    function _hooksSummary() {
        var size   =  _cabinHookSelect ? _cabinHookSelect.value : '';
        var hooks  =  _hookCountInput  ? _hookCountInput.value  : '0';
        var eyes   =  _eyeCountInput   ? _eyeCountInput.value   : '0';
        if (!size) return 'None';
        return size + ' mm  |  ' + hooks + ' hooks, ' + eyes + ' eyes';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 6 (Misc)
    // ------------------------------------------------------------
    function _miscSummary() {
        var selected  =  [];
        for (var key in _miscCheckboxes) {
            if (_miscCheckboxes[key].checked) {
                for (var j = 0; j < MISC_OPTIONS.length; j++) {
                    if (MISC_OPTIONS[j].Key === key) {
                        selected.push(MISC_OPTIONS[j].Label);
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
    function refreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var hooksCfg  =  assemblyData['Assembly__CabinHooks__Config']    || {};
        var miscCfg   =  assemblyData['Assembly__Miscellaneous__Config'] || {};

        if (_cabinHookSelect) {
            _cabinHookSelect.value  =  hooksCfg['Assembly__CabinHooks__Config__Size'] || '';
        }
        if (_hookCountInput) {
            _hookCountInput.value   =  hooksCfg['Assembly__CabinHooks__Config__HookCount'] || 2;
        }
        if (_eyeCountInput) {
            _eyeCountInput.value    =  hooksCfg['Assembly__CabinHooks__Config__EyeCount'] || 2;
        }

        var miscItems  =  miscCfg['Assembly__Miscellaneous__Config__Items'] || ['N/A'];
        for (var key in _miscCheckboxes) {
            _miscCheckboxes[key].checked  =  miscItems.indexOf(key) !== -1;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summaries with StepManager
    // ------------------------------------------------------------
    function _registerSummaries() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        StepManager.registerSummary('hooks', _hooksSummary);
        StepManager.registerSummary('misc',  _miscSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Hooks and Miscellaneous Steps
    // ------------------------------------------------------------
    function init(step5BodyEl, step6BodyEl) {
        _step5BodyEl  =  step5BodyEl;
        _step6BodyEl  =  step6BodyEl;
        if (!_step5BodyEl || !_step6BodyEl) return;

        _buildHooksStep();
        _buildMiscStep();
        _registerSummaries();

        console.log('[ValeSpec__HooksAndMisc] Initialised.');
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

window.ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc  =  ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc;
