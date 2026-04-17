/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: HINGES
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__Hinges__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - Hinges
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Hinge Specifications step for the wizard
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Hinge specifications step: Hinge Style segmented toggle (Decorative/Basic), same control chrome as Door Type step; Hinge Projection dropdown (4/5/6/8 inch options)
   - Read-only display of hinge count and vertical spacing
   - Selecting 8-inch projection triggers WarningSystem
   - Registers summary callbacks with StepManager

   ============================================================================= */

// =============================================================================
// REGION | Hinges Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__Hinges = (function() {

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
    let ValeSpec__Hinges__StepHingeBodyEl   =  null;   // <-- Hinge Specifications step card body
    let ValeSpec__Hinges__HingeProjectionSel =  null;   // <-- Hinge projection dropdown
    let ValeSpec__Hinges__StyleDecorative    =  null;   // <-- Hinge style decorative radio (ValeSpec__ToggleBtnGroup)
    let ValeSpec__Hinges__StyleBasic         =  null;   // <-- Hinge style basic radio
    let ValeSpec__Hinges__SpacingDisplay     =  null;   // <-- Hinge spacing display element
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Hinge Style Segmented Toggle Active State
    // ------------------------------------------------------------
    function ValeSpec__Hinges__UpdateHingeStyleToggleStyles() {
        if (!ValeSpec__Hinges__StyleDecorative || !ValeSpec__Hinges__StyleBasic) return;
        var decBtn  =  ValeSpec__Hinges__StyleDecorative.parentElement;
        var basBtn  =  ValeSpec__Hinges__StyleBasic.parentElement;
        if (!decBtn || !basBtn) return;

        if (ValeSpec__Hinges__StyleBasic.checked) {
            decBtn.classList.remove('ValeSpec__ToggleBtn--active');
            basBtn.classList.add('ValeSpec__ToggleBtn--active');
        } else {
            decBtn.classList.add('ValeSpec__ToggleBtn--active');
            basBtn.classList.remove('ValeSpec__ToggleBtn--active');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Current Hinge Style from Toggle
    // ------------------------------------------------------------
    function ValeSpec__Hinges__GetHingeStyle() {
        if (ValeSpec__Hinges__StyleBasic && ValeSpec__Hinges__StyleBasic.checked) {
            return 'Basic';
        }
        return 'Decorative';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Assembly Hinge Configuration
    // ------------------------------------------------------------
    function ValeSpec__Hinges__UpdateAssemblyHinge() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;
        if (!assembly['Assembly__Hinge__Config']) assembly['Assembly__Hinge__Config'] = {};
        
        var projectionVal = parseInt(ValeSpec__Hinges__HingeProjectionSel.value, 10);
        if (!isNaN(projectionVal)) {
            assembly['Assembly__Hinge__Config']['Assembly__Hinge__Config__Projection']  =  projectionVal;
        }
        
        assembly['Assembly__Hinge__Config']['Assembly__Hinge__Config__Style'] = ValeSpec__Hinges__GetHingeStyle();

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
            var activeWarnings  =  WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
            if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__Hinges__StepHingeBodyEl) {
                WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__Hinges__StepHingeBodyEl, activeWarnings);
            }
        }

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
        ValeSpec__Hinges__UpdateSpacingDisplay();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Hinge Projection Change
    // ------------------------------------------------------------
    function ValeSpec__Hinges__OnHingeProjectionChange() {
        var value  =  parseInt(ValeSpec__Hinges__HingeProjectionSel.value, 10);

        if (value === 8) {
            var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
            if (WarningSystem) {
                WarningSystem.ValeSpec__WarningSystem__ShowHingeProjectionWarning().then(function(confirmed) {
                    if (!confirmed) {
                        ValeSpec__Hinges__HingeProjectionSel.value  =  5;
                    }
                    ValeSpec__Hinges__UpdateAssemblyHinge();
                });
                return;
            }
        }

        ValeSpec__Hinges__UpdateAssemblyHinge();

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) {
            StepManager.ValeSpec__StepManager__AdvanceFromStep('hinges');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Hinge Style Change
    // ------------------------------------------------------------
    function ValeSpec__Hinges__OnHingeStyleChange() {
        ValeSpec__Hinges__UpdateHingeStyleToggleStyles();
        ValeSpec__Hinges__UpdateAssemblyHinge();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Hinge Spacing Display
    // ------------------------------------------------------------
    function ValeSpec__Hinges__UpdateSpacingDisplay() {
        if (!ValeSpec__Hinges__SpacingDisplay) return;
        
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;
        
        var height = assembly['Assembly__Dimensions__Config'] && assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__HeightMm'] 
                     ? assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__HeightMm'] 
                     : 0;
                     
        var hingeCfg = assembly['Assembly__Hinge__Config'] || {};
        var count = hingeCfg['Assembly__Hinge__Config__HingesPerLeaf'] || 0;
        
        if (height > 0 && count > 0) {
            var HingeCalculator = window.ValeSpec__MathUtils__HingeCalculator;
            if (HingeCalculator && HingeCalculator.ValeSpec__HingeCalculator__CalculateHingePositions) {
                var positions = HingeCalculator.ValeSpec__HingeCalculator__CalculateHingePositions(height, count);
                var displayHtml = '<strong>Hinge Spacing (' + count + ' hinges per leaf):</strong><br/>';
                var reversedPositions = positions.slice().reverse();
                for (var i = 0; i < reversedPositions.length; i++) {
                    var label = '';
                    if (i === 0) label = '  (Bottom)';
                    if (i === reversedPositions.length - 1) label = '  (Top)';
                    displayHtml += 'Hinge ' + (i+1) + ': ' + Math.round(reversedPositions[i]) + ' mm' + label + '<br/>';
                }
                ValeSpec__Hinges__SpacingDisplay.innerHTML = displayHtml;
            } else {
                ValeSpec__Hinges__SpacingDisplay.innerHTML = '<strong>Hinge Spacing:</strong><br/>' + count + ' hinges per leaf';
            }
        } else {
            ValeSpec__Hinges__SpacingDisplay.innerHTML = '<strong>Hinge Spacing:</strong><br/>Pending dimensions...';
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Hinge Specifications Step
    // ------------------------------------------------------------
    function ValeSpec__Hinges__BuildHingeStep() {
        // Hinge Style Toggle
        var styleGroup = document.createElement('div');
        styleGroup.className = 'ValeSpec__AssemblyEditor__FormGroup';
        
        var styleLabel = document.createElement('label');
        styleLabel.textContent = 'Hinge Style';
        styleGroup.appendChild(styleLabel);

        var toggleRow = document.createElement('div');
        toggleRow.className = 'ValeSpec__ToggleBtnGroup';

        var decLabel = document.createElement('label');
        decLabel.className = 'ValeSpec__ToggleBtn ValeSpec__ToggleBtn--active';
        ValeSpec__Hinges__StyleDecorative = document.createElement('input');
        ValeSpec__Hinges__StyleDecorative.type = 'radio';
        ValeSpec__Hinges__StyleDecorative.name = 'ValeSpec__AssemblyEditor__HingeStyle';
        ValeSpec__Hinges__StyleDecorative.value = 'Decorative';
        ValeSpec__Hinges__StyleDecorative.checked = true;
        ValeSpec__Hinges__StyleDecorative.addEventListener('change', ValeSpec__Hinges__OnHingeStyleChange);
        decLabel.appendChild(ValeSpec__Hinges__StyleDecorative);
        decLabel.appendChild(document.createTextNode(' Decorative'));

        var basicLabel = document.createElement('label');
        basicLabel.className = 'ValeSpec__ToggleBtn';
        ValeSpec__Hinges__StyleBasic = document.createElement('input');
        ValeSpec__Hinges__StyleBasic.type = 'radio';
        ValeSpec__Hinges__StyleBasic.name = 'ValeSpec__AssemblyEditor__HingeStyle';
        ValeSpec__Hinges__StyleBasic.value = 'Basic';
        ValeSpec__Hinges__StyleBasic.addEventListener('change', ValeSpec__Hinges__OnHingeStyleChange);
        basicLabel.appendChild(ValeSpec__Hinges__StyleBasic);
        basicLabel.appendChild(document.createTextNode(' Basic'));

        toggleRow.appendChild(decLabel);
        toggleRow.appendChild(basicLabel);
        styleGroup.appendChild(toggleRow);

        // Hinge Projection Dropdown
        var projGroup  =  document.createElement('div');
        projGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';
        projGroup.style.marginTop = '12px';

        var projLabel  =  document.createElement('label');
        projLabel.textContent  =  'Hinge Projection';
        projLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__HingeProjection');

        ValeSpec__Hinges__HingeProjectionSel     =  document.createElement('select');
        ValeSpec__Hinges__HingeProjectionSel.id  =  'ValeSpec__AssemblyEditor__HingeProjection';

        var hingePlaceholder          =  document.createElement('option');
        hingePlaceholder.value        =  '';
        hingePlaceholder.textContent  =  '\u2014 Please Select \u2014';
        hingePlaceholder.disabled     =  true;
        hingePlaceholder.selected     =  true;
        hingePlaceholder.hidden       =  true;
        ValeSpec__Hinges__HingeProjectionSel.appendChild(hingePlaceholder);

        for (var i = 0; i < HINGE_PROJECTIONS.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  HINGE_PROJECTIONS[i].Value;
            opt.textContent  =  HINGE_PROJECTIONS[i].Label;
            ValeSpec__Hinges__HingeProjectionSel.appendChild(opt);
        }

        ValeSpec__Hinges__HingeProjectionSel.addEventListener('change', ValeSpec__Hinges__OnHingeProjectionChange);

        projGroup.appendChild(projLabel);
        projGroup.appendChild(ValeSpec__Hinges__HingeProjectionSel);
        
        // Hinge Spacing Display
        var spacingGroup = document.createElement('div');
        spacingGroup.className = 'ValeSpec__AssemblyEditor__FormGroup';
        spacingGroup.style.marginTop = '12px';
        
        ValeSpec__Hinges__SpacingDisplay = document.createElement('div');
        ValeSpec__Hinges__SpacingDisplay.className = 'ValeSpec__AssemblyEditor__ReadOnlyDisplay';
        ValeSpec__Hinges__SpacingDisplay.style.padding = '8px';
        ValeSpec__Hinges__SpacingDisplay.style.backgroundColor = 'var(--ValeBackgroundLight)';
        ValeSpec__Hinges__SpacingDisplay.style.border = '1px solid var(--ValeBorderColor)';
        ValeSpec__Hinges__SpacingDisplay.style.borderRadius = '4px';
        ValeSpec__Hinges__SpacingDisplay.style.fontSize = '0.9em';
        ValeSpec__Hinges__SpacingDisplay.innerHTML = '<strong>Hinge Spacing:</strong><br/>Pending dimensions...';
        
        spacingGroup.appendChild(ValeSpec__Hinges__SpacingDisplay);

        var footerEl  =  ValeSpec__Hinges__StepHingeBodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__Hinges__StepHingeBodyEl.insertBefore(styleGroup, footerEl);
        ValeSpec__Hinges__StepHingeBodyEl.insertBefore(projGroup, footerEl);
        ValeSpec__Hinges__StepHingeBodyEl.insertBefore(spacingGroup, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Hinge Step
    // ------------------------------------------------------------
    function ValeSpec__Hinges__HingeSummary() {
        var val  =  ValeSpec__Hinges__HingeProjectionSel ? ValeSpec__Hinges__HingeProjectionSel.value : '';
        var style = ValeSpec__Hinges__GetHingeStyle();
        return (val ? val + ' inch projection' : 'Not set') + ' | ' + style;
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__Hinges__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var hingeCfg  =  assemblyData['Assembly__Hinge__Config'] || {};

        if (ValeSpec__Hinges__HingeProjectionSel && hingeCfg['Assembly__Hinge__Config__Projection'] !== undefined) {
            ValeSpec__Hinges__HingeProjectionSel.value  =  hingeCfg['Assembly__Hinge__Config__Projection'];
        }
        
        var style = hingeCfg['Assembly__Hinge__Config__Style'] || 'Decorative';
        if (style === 'Basic' && ValeSpec__Hinges__StyleBasic) {
            ValeSpec__Hinges__StyleBasic.checked = true;
        } else if (ValeSpec__Hinges__StyleDecorative) {
            ValeSpec__Hinges__StyleDecorative.checked = true;
        }
        ValeSpec__Hinges__UpdateHingeStyleToggleStyles();

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly) {
            WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly(assemblyData, ValeSpec__Hinges__StepHingeBodyEl);
        }
        
        ValeSpec__Hinges__UpdateSpacingDisplay();
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summaries with StepManager
    // ------------------------------------------------------------
    function ValeSpec__Hinges__RegisterSummaries() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        StepManager.ValeSpec__StepManager__RegisterSummary('hinges', ValeSpec__Hinges__HingeSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Hinge Step
    // ------------------------------------------------------------
    function ValeSpec__Hinges__Init(hingeStepBodyEl) {
        ValeSpec__Hinges__StepHingeBodyEl  =  hingeStepBodyEl;
        if (!ValeSpec__Hinges__StepHingeBodyEl) return;

        ValeSpec__Hinges__BuildHingeStep();
        ValeSpec__Hinges__RegisterSummaries();

        console.log('[ValeSpec__Hinges] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__Hinges__Init                : ValeSpec__Hinges__Init,
        ValeSpec__Hinges__RefreshFromAssembly : ValeSpec__Hinges__RefreshFromAssembly,
        ValeSpec__Hinges__UpdateSpacingDisplay: ValeSpec__Hinges__UpdateSpacingDisplay
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__Hinges  =  ValeSpec__AssemblyEditor__DoorConfigurator__Hinges;
