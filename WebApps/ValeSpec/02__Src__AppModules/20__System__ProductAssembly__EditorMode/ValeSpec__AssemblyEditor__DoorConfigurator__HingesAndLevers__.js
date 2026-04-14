/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: HINGES AND LEVERS
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - HingesAndLevers
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Columns 4-5: Hinge projection, lever type, lever height, handing
   CREATED    : 2026

   DESCRIPTION:
   - Column 4: Hinge Projection dropdown (4/5/6/8 inch options)
   - Column 5: Lever Type dropdown (global), Lever Height input
   - Selecting 8-inch projection triggers WarningSystem
   - Single Door handing prompt (Left/Right radio buttons)
   - Lever selection is global — applies to all assemblies

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
    let _gridEl               =  null;                                      // <-- Parent grid element
    let _hingeProjectionSel   =  null;                                      // <-- Hinge projection dropdown
    let _leverTypeSelect      =  null;                                      // <-- Lever type dropdown
    let _leverHeightInput     =  null;                                      // <-- Lever height numeric input
    let _handingPromptEl      =  null;                                      // <-- Handing prompt container
    let _handingLeftRadio     =  null;                                      // <-- Left-hand radio button
    let _handingRightRadio    =  null;                                      // <-- Right-hand radio button
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Lever Type Options from AppConfig
    // ------------------------------------------------------------
    function _getLeverTypeOptions() {
        var ConfigLoader  =  window.ValeSpec__AppCore__ConfigLoader;
        if (!ConfigLoader) return [];

        var section  =  ConfigLoader.getSection('LeverTypeOptions');
        if (!section) return [];

        return section['ValeSpec__LeverType__Options__Config__Types'] || [
            { Label: 'Scroll Lever Handle',  Value: 'Scroll'  },
            { Label: 'Plain Lever Handle',   Value: 'Plain'   },
            { Label: 'Knob Handle',          Value: 'Knob'    }
        ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Hinge Projection Column (Column 4)
    // ------------------------------------------------------------
    function _buildHingeProjectionColumn() {
        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var label  =  document.createElement('label');
        label.textContent  =  'Hinge Projection';
        label.setAttribute('for', 'ValeSpec__AssemblyEditor__HingeProjection');

        _hingeProjectionSel     =  document.createElement('select');
        _hingeProjectionSel.id  =  'ValeSpec__AssemblyEditor__HingeProjection';

        for (var i = 0; i < HINGE_PROJECTIONS.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  HINGE_PROJECTIONS[i].Value;
            opt.textContent  =  HINGE_PROJECTIONS[i].Label;
            _hingeProjectionSel.appendChild(opt);
        }

        _hingeProjectionSel.addEventListener('change', _onHingeProjectionChange);

        group.appendChild(label);
        group.appendChild(_hingeProjectionSel);
        _gridEl.appendChild(group);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Lever Type and Height Column (Column 5)
    // ------------------------------------------------------------
    function _buildLeverColumn() {
        var group  =  document.createElement('div');
        group.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var leverLabel  =  document.createElement('label');
        leverLabel.textContent  =  'Lever Type';
        leverLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__LeverType');

        _leverTypeSelect     =  document.createElement('select');
        _leverTypeSelect.id  =  'ValeSpec__AssemblyEditor__LeverType';

        var leverOptions  =  _getLeverTypeOptions();
        for (var i = 0; i < leverOptions.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  leverOptions[i].Value;
            opt.textContent  =  leverOptions[i].Label;
            _leverTypeSelect.appendChild(opt);
        }

        _leverTypeSelect.addEventListener('change', _onLeverTypeChange);

        var heightLabel  =  document.createElement('label');
        heightLabel.textContent  =  'Lever Height (mm)';
        heightLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__LeverHeight');
        heightLabel.style.marginTop  =  '8px';

        _leverHeightInput       =  document.createElement('input');
        _leverHeightInput.type  =  'number';
        _leverHeightInput.id    =  'ValeSpec__AssemblyEditor__LeverHeight';
        _leverHeightInput.min   =  800;
        _leverHeightInput.max   =  1200;
        _leverHeightInput.value =  1000;                                    // <-- Default 1000mm

        _leverHeightInput.addEventListener('change', _onLeverHeightChange);

        _handingPromptEl  =  document.createElement('div');
        _handingPromptEl.className  =  'ValeSpec__AssemblyEditor__HandingPrompt';
        _handingPromptEl.id         =  'ValeSpec__AssemblyEditor__HandingPrompt';

        var handingLabel  =  document.createElement('span');
        handingLabel.textContent    =  'Handing:';
        handingLabel.style.fontSize =  '0.78rem';

        var leftLabel  =  document.createElement('label');
        _handingLeftRadio       =  document.createElement('input');
        _handingLeftRadio.type  =  'radio';
        _handingLeftRadio.name  =  'ValeSpec__AssemblyEditor__Handing';
        _handingLeftRadio.value =  'Left';
        leftLabel.appendChild(_handingLeftRadio);
        leftLabel.appendChild(document.createTextNode(' Left'));

        var rightLabel  =  document.createElement('label');
        _handingRightRadio       =  document.createElement('input');
        _handingRightRadio.type  =  'radio';
        _handingRightRadio.name  =  'ValeSpec__AssemblyEditor__Handing';
        _handingRightRadio.value =  'Right';
        _handingRightRadio.checked  =  true;                               // <-- Default right-hand
        rightLabel.appendChild(_handingRightRadio);
        rightLabel.appendChild(document.createTextNode(' Right'));

        _handingPromptEl.appendChild(handingLabel);
        _handingPromptEl.appendChild(leftLabel);
        _handingPromptEl.appendChild(rightLabel);

        _handingLeftRadio.addEventListener('change', _onHandingChange);
        _handingRightRadio.addEventListener('change', _onHandingChange);

        group.appendChild(leverLabel);
        group.appendChild(_leverTypeSelect);
        group.appendChild(heightLabel);
        group.appendChild(_leverHeightInput);
        group.appendChild(_handingPromptEl);
        _gridEl.appendChild(group);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Hinge Projection Change
    // ------------------------------------------------------------
    function _onHingeProjectionChange() {
        var value  =  parseInt(_hingeProjectionSel.value, 10);

        if (value === 8) {
            var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
            if (WarningSystem) {
                WarningSystem.showHingeProjectionWarning().then(function(confirmed) {
                    if (!confirmed) {
                        _hingeProjectionSel.value  =  5;                    // <-- Revert to 5-inch
                    }
                    _updateAssemblyHinge();
                });
                return;
            }
        }

        _updateAssemblyHinge();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Assembly Hinge Projection
    // ------------------------------------------------------------
    function _updateAssemblyHinge() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;
        assembly['HingeProjection']  =  parseInt(_hingeProjectionSel.value, 10);
        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Lever Type Change (Global)
    // ------------------------------------------------------------
    function _onLeverTypeChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.setGlobalLeverType(_leverTypeSelect.value);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Lever Height Change
    // ------------------------------------------------------------
    function _onLeverHeightChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;
        assembly['LeverHeight_mm']  =  parseInt(_leverHeightInput.value, 10);
        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Handing Radio Change
    // ------------------------------------------------------------
    function _onHandingChange() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;
        assembly['Handing']  =  _handingLeftRadio.checked ? 'Left' : 'Right';
        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Handing Prompt Visibility
    // ------------------------------------------------------------
    function _updateHandingVisibility(doorType) {
        if (!_handingPromptEl) return;
        var isSingle  =  doorType && doorType.indexOf('Single') !== -1;
        if (isSingle) {
            _handingPromptEl.classList.add('ValeSpec__AssemblyEditor__HandingPrompt--visible');
        } else {
            _handingPromptEl.classList.remove('ValeSpec__AssemblyEditor__HandingPrompt--visible');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function refreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var hingeCfg   =  assemblyData['Assembly__Hinge__Config']    || {};
        var leverCfg   =  assemblyData['Assembly__Lever__Config']    || {};
        var doorCfg    =  assemblyData['Assembly__DoorType__Config'] || {};

        if (_hingeProjectionSel && hingeCfg['Assembly__Hinge__Config__Projection'] !== undefined) {
            _hingeProjectionSel.value  =  hingeCfg['Assembly__Hinge__Config__Projection'];
        }

        if (_leverHeightInput) {
            _leverHeightInput.value  =  leverCfg['Assembly__Lever__Config__HeightMm'] || 1000;
        }

        var handing  =  leverCfg['Assembly__Lever__Config__Handing'] || 'Dual';
        if (handing === 'Left' && _handingLeftRadio) {
            _handingLeftRadio.checked   =  true;
        } else if (_handingRightRadio) {
            _handingRightRadio.checked  =  true;
        }

        var doorType  =  doorCfg['Assembly__DoorType__Config__Type'] || '';
        _updateHandingVisibility(doorType);

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            var state  =  StateManager.getState();
            if (_leverTypeSelect && state.globalLeverType) {
                _leverTypeSelect.value  =  state.globalLeverType;
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Hinges and Levers Section
    // ------------------------------------------------------------
    function init(gridEl) {
        _gridEl  =  gridEl;
        if (!_gridEl) return;

        _buildHingeProjectionColumn();
        _buildLeverColumn();

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.on('assemblyUpdated', function(data) {
                if (data) {
                    var dt  =  (data['Assembly__DoorType__Config'] || {})['Assembly__DoorType__Config__Type'] || '';
                    _updateHandingVisibility(dt);
                }
            });
        }

        console.log('[ValeSpec__HingesAndLevers] Initialised.');
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

window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers  =  ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers;
