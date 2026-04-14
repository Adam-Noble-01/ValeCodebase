/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: HOOKS AND MISCELLANEOUS
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - HooksAndMisc
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Columns 6-7: Cabin hooks, counts, and miscellaneous checkboxes
   CREATED    : 2026

   DESCRIPTION:
   - Column 6: Cabin Hook size dropdown, hook count, eye count
   - Column 7: Miscellaneous checkboxes (N/A, Overhead Restrictors, etc.)
   - Hook size options loaded from AppConfig
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
    let _gridEl            =  null;                                         // <-- Parent grid element
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


    // HELPER FUNCTION | Build Cabin Hook Column (Column 6)
    // ------------------------------------------------------------
    function _buildCabinHookColumn() {
        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__FormGroup';

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

        var hookCountLabel  =  document.createElement('label');
        hookCountLabel.textContent  =  'Hook Count';
        hookCountLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__HookCount');
        hookCountLabel.style.marginTop  =  '8px';

        _hookCountInput       =  document.createElement('input');
        _hookCountInput.type  =  'number';
        _hookCountInput.id    =  'ValeSpec__AssemblyEditor__HookCount';
        _hookCountInput.min   =  0;
        _hookCountInput.max   =  20;
        _hookCountInput.value =  0;

        _hookCountInput.addEventListener('change', _onHookCountChange);

        var eyeCountLabel  =  document.createElement('label');
        eyeCountLabel.textContent  =  'Eye Count';
        eyeCountLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__EyeCount');
        eyeCountLabel.style.marginTop  =  '8px';

        _eyeCountInput       =  document.createElement('input');
        _eyeCountInput.type  =  'number';
        _eyeCountInput.id    =  'ValeSpec__AssemblyEditor__EyeCount';
        _eyeCountInput.min   =  0;
        _eyeCountInput.max   =  20;
        _eyeCountInput.value =  0;

        _eyeCountInput.addEventListener('change', _onEyeCountChange);

        group.appendChild(hookLabel);
        group.appendChild(_cabinHookSelect);
        group.appendChild(hookCountLabel);
        group.appendChild(_hookCountInput);
        group.appendChild(eyeCountLabel);
        group.appendChild(_eyeCountInput);
        _gridEl.appendChild(group);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Miscellaneous Column (Column 7)
    // ------------------------------------------------------------
    function _buildMiscColumn() {
        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var miscLabel  =  document.createElement('label');
        miscLabel.textContent  =  'Miscellaneous';

        group.appendChild(miscLabel);

        for (var i = 0; i < MISC_OPTIONS.length; i++) {
            var wrapper  =  document.createElement('label');
            wrapper.style.display    =  'flex';
            wrapper.style.alignItems =  'center';
            wrapper.style.gap        =  '6px';
            wrapper.style.fontSize   =  '0.82rem';
            wrapper.style.fontWeight =  '400';
            wrapper.style.cursor     =  'pointer';
            wrapper.style.marginTop  =  '4px';

            var checkbox       =  document.createElement('input');
            checkbox.type      =  'checkbox';
            checkbox.id        =  'ValeSpec__AssemblyEditor__' + MISC_OPTIONS[i].Key;
            checkbox.dataset.miscKey  =  MISC_OPTIONS[i].Key;

            checkbox.addEventListener('change', _onMiscCheckboxChange);

            var text  =  document.createTextNode(MISC_OPTIONS[i].Label);

            wrapper.appendChild(checkbox);
            wrapper.appendChild(text);
            group.appendChild(wrapper);

            _miscCheckboxes[MISC_OPTIONS[i].Key]  =  checkbox;
        }

        _gridEl.appendChild(group);
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


    // FUNCTION | Initialise Hooks and Miscellaneous Section
    // ------------------------------------------------------------
    function init(gridEl) {
        _gridEl  =  gridEl;
        if (!_gridEl) return;

        _buildCabinHookColumn();
        _buildMiscColumn();

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
