/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR GLOBAL SETTINGS
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__GlobalSettings__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - GlobalSettings
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Persistent global context bar pinned above the step wizard
   CREATED    : 2026

   DESCRIPTION:
   - Renders global finish selector as a persistent header bar
   - Options: Unlacquered Brass, Satin Nickel, Bronze, Other (free text)
   - On change calls StateManager.setGlobalFinish()
   - Cascades finish to all assemblies in the project
   - Styled as a prominent context bar above the step progression

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
    let _containerEl       =  null;                                         // <-- Global bar container
    let _finishSelect      =  null;                                         // <-- Finish dropdown
    let _otherInput        =  null;                                         // <-- Free text input for 'Other'
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Global Context Bar
    // ------------------------------------------------------------
    function _buildFinishDropdown() {
        _containerEl.classList.add('ValeSpec__AssemblyEditor__GlobalBar');

        var icon  =  document.createElement('span');
        icon.textContent    =  '\u2699';
        icon.style.fontSize =  '1.1rem';

        var label  =  document.createElement('label');
        label.textContent  =  'Ironmongery Finish';
        label.setAttribute('for', 'ValeSpec__AssemblyEditor__GlobalFinish');

        _finishSelect     =  document.createElement('select');
        _finishSelect.id  =  'ValeSpec__AssemblyEditor__GlobalFinish';

        for (var i = 0; i < FINISH_OPTIONS.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  FINISH_OPTIONS[i].Value;
            opt.textContent  =  FINISH_OPTIONS[i].Label;
            _finishSelect.appendChild(opt);
        }

        _otherInput              =  document.createElement('input');
        _otherInput.type         =  'text';
        _otherInput.id           =  'ValeSpec__AssemblyEditor__GlobalFinishOther';
        _otherInput.placeholder  =  'Specify finish...';
        _otherInput.style.display  =  'none';

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            var state  =  StateManager.getState();
            if (state.globalIronmongeryFinish) {
                var matchFound  =  false;
                for (var j = 0; j < FINISH_OPTIONS.length; j++) {
                    if (FINISH_OPTIONS[j].Value === state.globalIronmongeryFinish) {
                        matchFound  =  true;
                        break;
                    }
                }
                if (matchFound) {
                    _finishSelect.value  =  state.globalIronmongeryFinish;
                } else {
                    _finishSelect.value      =  'Other';
                    _otherInput.value        =  state.globalIronmongeryFinish;
                    _otherInput.style.display  =  '';
                }
            }
        }

        _finishSelect.addEventListener('change', _onFinishChange);
        _otherInput.addEventListener('change', _onOtherInputChange);

        _containerEl.appendChild(icon);
        _containerEl.appendChild(label);
        _containerEl.appendChild(_finishSelect);
        _containerEl.appendChild(_otherInput);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Finish Dropdown Change
    // ------------------------------------------------------------
    function _onFinishChange() {
        var value  =  _finishSelect.value;

        if (value === 'Other') {
            _otherInput.style.display  =  '';
            _otherInput.focus();
            return;
        }

        _otherInput.style.display  =  'none';
        _otherInput.value          =  '';

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.setGlobalFinish(value);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Other Free Text Change
    // ------------------------------------------------------------
    function _onOtherInputChange() {
        var value  =  _otherInput.value.trim();
        if (!value) return;

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.setGlobalFinish(value);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Global Settings
    // ------------------------------------------------------------
    function init(container) {
        _containerEl  =  container;
        if (!_containerEl) return;

        _buildFinishDropdown();

        console.log('[ValeSpec__GlobalSettings] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        init  : init
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__GlobalSettings  =  ValeSpec__AssemblyEditor__GlobalSettings;
