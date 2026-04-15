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
   - On change calls StateManager.ValeSpec__StateManager__SetGlobalFinish()
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
    let ValeSpec__GlobalSettings__ContainerEl  =  null;  // <-- Global bar container
    let ValeSpec__GlobalSettings__FinishSelect =  null;  // <-- Finish dropdown
    let ValeSpec__GlobalSettings__OtherInput   =  null;  // <-- Free text input for 'Other'
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Global Context Bar
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__BuildFinishDropdown() {
        ValeSpec__GlobalSettings__ContainerEl.classList.add('ValeSpec__AssemblyEditor__GlobalBar');

        var icon  =  document.createElement('span');
        icon.textContent    =  '\u2699';
        icon.style.fontSize =  '1.1rem';

        var label  =  document.createElement('label');
        label.textContent  =  'Ironmongery Finish';
        label.setAttribute('for', 'ValeSpec__AssemblyEditor__GlobalFinish');

        ValeSpec__GlobalSettings__FinishSelect     =  document.createElement('select');
        ValeSpec__GlobalSettings__FinishSelect.id  =  'ValeSpec__AssemblyEditor__GlobalFinish';

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

        ValeSpec__GlobalSettings__ContainerEl.appendChild(icon);
        ValeSpec__GlobalSettings__ContainerEl.appendChild(label);
        ValeSpec__GlobalSettings__ContainerEl.appendChild(ValeSpec__GlobalSettings__FinishSelect);
        ValeSpec__GlobalSettings__ContainerEl.appendChild(ValeSpec__GlobalSettings__OtherInput);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Finish Dropdown Change
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__OnFinishChange() {
        var value  =  ValeSpec__GlobalSettings__FinishSelect.value;

        if (value === 'Other') {
            ValeSpec__GlobalSettings__OtherInput.style.display  =  '';
            ValeSpec__GlobalSettings__OtherInput.focus();
            return;
        }

        ValeSpec__GlobalSettings__OtherInput.style.display  =  'none';
        ValeSpec__GlobalSettings__OtherInput.value          =  '';

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.ValeSpec__StateManager__SetGlobalFinish(value);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Other Free Text Change
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__OnOtherInputChange() {
        var value  =  ValeSpec__GlobalSettings__OtherInput.value.trim();
        if (!value) return;

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.ValeSpec__StateManager__SetGlobalFinish(value);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Global Settings
    // ------------------------------------------------------------
    function ValeSpec__GlobalSettings__Init(container) {
        ValeSpec__GlobalSettings__ContainerEl  =  container;
        if (!ValeSpec__GlobalSettings__ContainerEl) return;

        ValeSpec__GlobalSettings__BuildFinishDropdown();

        console.log('[ValeSpec__GlobalSettings] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__GlobalSettings__Init  : ValeSpec__GlobalSettings__Init
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__GlobalSettings  =  ValeSpec__AssemblyEditor__GlobalSettings;
