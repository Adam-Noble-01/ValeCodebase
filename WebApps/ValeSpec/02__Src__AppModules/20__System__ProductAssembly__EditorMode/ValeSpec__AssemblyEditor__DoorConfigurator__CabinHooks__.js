/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: CABIN HOOKS
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__CabinHooks__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - CabinHooks
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Step 6 (Cabin Hooks) controls and persistence
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Renders cabin hook size, hook count, and eye count controls
   - Sources options and defaults from Na__AssemblyEditor__Config.json
   - Persists updates to Assembly__CabinHooks__Config via StateManager
   - Registers hooks summary callback with StepManager
   - Exposes FlushToAssembly() for explicit save pipeline sync

   ============================================================================= */

// =============================================================================
// REGION | Cabin Hooks Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__CabinHooks = (function() {

    // MODULE CONSTANTS | Config Path and Fallbacks
    // ------------------------------------------------------------
    const CONFIG_PATH  =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/Na__AssemblyEditor__Config.json';
    const FALLBACK_CFG =  {
        SizeOptions       : ['4"', '6"', '10"', '12"', '18"'],
        IncludeNoneOption : true,
        NoneOptionLabel   : 'None',
        HookCountMin      : 0,
        HookCountMax      : 20,
        HookCountDefault  : 0,
        EyeCountMin       : 0,
        EyeCountMax       : 20,
        EyeCountDefault   : 0
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM and Config State
    // ------------------------------------------------------------
    let ValeSpec__CabinHooks__StepBodyEl      =  null;   // <-- Step card body for hooks section
    let ValeSpec__CabinHooks__CabinHookSelect =  null;   // <-- Cabin hook size dropdown
    let ValeSpec__CabinHooks__HookCountInput  =  null;   // <-- Hook count numeric input
    let ValeSpec__CabinHooks__EyeCountInput   =  null;   // <-- Eye count numeric input
    let ValeSpec__CabinHooks__Config          =  null;   // <-- Cabin hooks config subsection
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Cabin Hooks Config
    // ------------------------------------------------------------
    async function ValeSpec__CabinHooks__LoadConfig() {
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) return;
            var data  =  await response.json();
            ValeSpec__CabinHooks__Config  =  data['AssemblyEditor__CabinHooks__Config'] || null;
        } catch (e) {
            console.warn('[ValeSpec__CabinHooks] Config load failed:', e);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Cabin Hooks UI Config
    // ------------------------------------------------------------
    function ValeSpec__CabinHooks__GetResolvedUiConfig() {
        var cfg  =  ValeSpec__CabinHooks__Config || {};
        return {
            SizeOptions       : cfg['AssemblyEditor__CabinHooks__Config__SizeOptions']       || FALLBACK_CFG.SizeOptions,
            IncludeNoneOption : cfg['AssemblyEditor__CabinHooks__Config__IncludeNoneOption'] !== false,
            NoneOptionLabel   : cfg['AssemblyEditor__CabinHooks__Config__NoneOptionLabel']   || FALLBACK_CFG.NoneOptionLabel,
            HookCountMin      : parseInt(cfg['AssemblyEditor__CabinHooks__Config__HookCountMin'], 10),
            HookCountMax      : parseInt(cfg['AssemblyEditor__CabinHooks__Config__HookCountMax'], 10),
            HookCountDefault  : parseInt(cfg['AssemblyEditor__CabinHooks__Config__HookCountDefault'], 10),
            EyeCountMin       : parseInt(cfg['AssemblyEditor__CabinHooks__Config__EyeCountMin'], 10),
            EyeCountMax       : parseInt(cfg['AssemblyEditor__CabinHooks__Config__EyeCountMax'], 10),
            EyeCountDefault   : parseInt(cfg['AssemblyEditor__CabinHooks__Config__EyeCountDefault'], 10)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp Numeric Input Value
    // ------------------------------------------------------------
    function ValeSpec__CabinHooks__ClampInteger(rawValue, minValue, maxValue, fallbackValue) {
        var parsed  =  parseInt(rawValue, 10);
        if (isNaN(parsed)) parsed  =  fallbackValue;
        if (isNaN(parsed)) parsed  =  minValue;
        return Math.max(minValue, Math.min(maxValue, parsed));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Persist Hooks Controls to Current Assembly
    // ------------------------------------------------------------
    function ValeSpec__CabinHooks__PushUpdate() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        var uiCfg  =  ValeSpec__CabinHooks__GetResolvedUiConfig();
        var hookCountMin  =  isNaN(uiCfg.HookCountMin) ? FALLBACK_CFG.HookCountMin : uiCfg.HookCountMin;
        var hookCountMax  =  isNaN(uiCfg.HookCountMax) ? FALLBACK_CFG.HookCountMax : uiCfg.HookCountMax;
        var hookCountDef  =  isNaN(uiCfg.HookCountDefault) ? FALLBACK_CFG.HookCountDefault : uiCfg.HookCountDefault;
        var eyeCountMin   =  isNaN(uiCfg.EyeCountMin) ? FALLBACK_CFG.EyeCountMin : uiCfg.EyeCountMin;
        var eyeCountMax   =  isNaN(uiCfg.EyeCountMax) ? FALLBACK_CFG.EyeCountMax : uiCfg.EyeCountMax;
        var eyeCountDef   =  isNaN(uiCfg.EyeCountDefault) ? FALLBACK_CFG.EyeCountDefault : uiCfg.EyeCountDefault;

        var nextHookCount  =  ValeSpec__CabinHooks__ClampInteger(ValeSpec__CabinHooks__HookCountInput ? ValeSpec__CabinHooks__HookCountInput.value : hookCountDef, hookCountMin, hookCountMax, hookCountDef);
        var nextEyeCount   =  ValeSpec__CabinHooks__ClampInteger(ValeSpec__CabinHooks__EyeCountInput ? ValeSpec__CabinHooks__EyeCountInput.value : eyeCountDef, eyeCountMin, eyeCountMax, eyeCountDef);

        if (ValeSpec__CabinHooks__HookCountInput) ValeSpec__CabinHooks__HookCountInput.value  =  nextHookCount;
        if (ValeSpec__CabinHooks__EyeCountInput)  ValeSpec__CabinHooks__EyeCountInput.value   =  nextEyeCount;

        if (!assembly['Assembly__CabinHooks__Config']) assembly['Assembly__CabinHooks__Config'] = {};
        assembly['Assembly__CabinHooks__Config']['Assembly__CabinHooks__Config__Size']       =  ValeSpec__CabinHooks__CabinHookSelect ? (ValeSpec__CabinHooks__CabinHookSelect.value || '') : '';
        assembly['Assembly__CabinHooks__Config']['Assembly__CabinHooks__Config__HookCount']  =  nextHookCount;
        assembly['Assembly__CabinHooks__Config']['Assembly__CabinHooks__Config__EyeCount']   =  nextEyeCount;

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Cabin Hooks Step Controls
    // ------------------------------------------------------------
    function ValeSpec__CabinHooks__BuildStep() {
        var uiCfg  =  ValeSpec__CabinHooks__GetResolvedUiConfig();

        var hookCountMin  =  isNaN(uiCfg.HookCountMin) ? FALLBACK_CFG.HookCountMin : uiCfg.HookCountMin;
        var hookCountMax  =  isNaN(uiCfg.HookCountMax) ? FALLBACK_CFG.HookCountMax : uiCfg.HookCountMax;
        var hookCountDef  =  isNaN(uiCfg.HookCountDefault) ? FALLBACK_CFG.HookCountDefault : uiCfg.HookCountDefault;
        var eyeCountMin   =  isNaN(uiCfg.EyeCountMin) ? FALLBACK_CFG.EyeCountMin : uiCfg.EyeCountMin;
        var eyeCountMax   =  isNaN(uiCfg.EyeCountMax) ? FALLBACK_CFG.EyeCountMax : uiCfg.EyeCountMax;
        var eyeCountDef   =  isNaN(uiCfg.EyeCountDefault) ? FALLBACK_CFG.EyeCountDefault : uiCfg.EyeCountDefault;

        var hookGroup  =  document.createElement('div');
        hookGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var hookLabel  =  document.createElement('label');
        hookLabel.textContent  =  'Cabin Hook Size';
        hookLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__CabinHookSize');

        ValeSpec__CabinHooks__CabinHookSelect     =  document.createElement('select');
        ValeSpec__CabinHooks__CabinHookSelect.id  =  'ValeSpec__AssemblyEditor__CabinHookSize';

        var hookPlaceholder          =  document.createElement('option');
        hookPlaceholder.value        =  '';
        hookPlaceholder.textContent  =  '\u2014 Please Select \u2014';
        hookPlaceholder.disabled     =  true;
        hookPlaceholder.selected     =  true;
        hookPlaceholder.hidden       =  true;
        ValeSpec__CabinHooks__CabinHookSelect.appendChild(hookPlaceholder);

        var sourceOptions  =  uiCfg.SizeOptions || [];
        for (var i = 0; i < sourceOptions.length; i++) {
            var optionValue  =  '';
            var optionLabel  =  '';
            if (typeof sourceOptions[i] === 'string') {
                optionValue  =  sourceOptions[i].trim();
                optionLabel  =  optionValue;
            } else if (sourceOptions[i] && typeof sourceOptions[i] === 'object') {
                optionLabel  =  String(sourceOptions[i].Label || sourceOptions[i].Value || '').trim();
                optionValue  =  String(sourceOptions[i].Value !== undefined ? sourceOptions[i].Value : optionLabel).trim();
            }

            if (!optionLabel) continue;
            var opt          =  document.createElement('option');
            opt.value        =  optionValue || optionLabel;
            opt.textContent  =  optionLabel;
            ValeSpec__CabinHooks__CabinHookSelect.appendChild(opt);
        }

        if (uiCfg.IncludeNoneOption) {
            var noneOpt          =  document.createElement('option');
            noneOpt.value        =  '';
            noneOpt.textContent  =  uiCfg.NoneOptionLabel;
            ValeSpec__CabinHooks__CabinHookSelect.appendChild(noneOpt);
        }

        ValeSpec__CabinHooks__CabinHookSelect.addEventListener('change', ValeSpec__CabinHooks__PushUpdate);

        hookGroup.appendChild(hookLabel);
        hookGroup.appendChild(ValeSpec__CabinHooks__CabinHookSelect);

        var countsRow  =  document.createElement('div');
        countsRow.className  =  'ValeSpec__AssemblyEditor__FormRow';
        countsRow.style.marginTop  =  '12px';

        var hookCountGroup  =  document.createElement('div');
        hookCountGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var hookCountLabel  =  document.createElement('label');
        hookCountLabel.textContent  =  'Hook Count';
        hookCountLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__HookCount');

        ValeSpec__CabinHooks__HookCountInput       =  document.createElement('input');
        ValeSpec__CabinHooks__HookCountInput.type  =  'number';
        ValeSpec__CabinHooks__HookCountInput.id    =  'ValeSpec__AssemblyEditor__HookCount';
        ValeSpec__CabinHooks__HookCountInput.min   =  hookCountMin;
        ValeSpec__CabinHooks__HookCountInput.max   =  hookCountMax;
        ValeSpec__CabinHooks__HookCountInput.value =  hookCountDef;
        ValeSpec__CabinHooks__HookCountInput.addEventListener('input', ValeSpec__CabinHooks__PushUpdate);
        ValeSpec__CabinHooks__HookCountInput.addEventListener('change', ValeSpec__CabinHooks__PushUpdate);

        hookCountGroup.appendChild(hookCountLabel);
        hookCountGroup.appendChild(ValeSpec__CabinHooks__HookCountInput);

        var eyeCountGroup  =  document.createElement('div');
        eyeCountGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var eyeCountLabel  =  document.createElement('label');
        eyeCountLabel.textContent  =  'Eye Count';
        eyeCountLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__EyeCount');

        ValeSpec__CabinHooks__EyeCountInput       =  document.createElement('input');
        ValeSpec__CabinHooks__EyeCountInput.type  =  'number';
        ValeSpec__CabinHooks__EyeCountInput.id    =  'ValeSpec__AssemblyEditor__EyeCount';
        ValeSpec__CabinHooks__EyeCountInput.min   =  eyeCountMin;
        ValeSpec__CabinHooks__EyeCountInput.max   =  eyeCountMax;
        ValeSpec__CabinHooks__EyeCountInput.value =  eyeCountDef;
        ValeSpec__CabinHooks__EyeCountInput.addEventListener('input', ValeSpec__CabinHooks__PushUpdate);
        ValeSpec__CabinHooks__EyeCountInput.addEventListener('change', ValeSpec__CabinHooks__PushUpdate);

        eyeCountGroup.appendChild(eyeCountLabel);
        eyeCountGroup.appendChild(ValeSpec__CabinHooks__EyeCountInput);

        countsRow.appendChild(hookCountGroup);
        countsRow.appendChild(eyeCountGroup);

        var footerEl  =  ValeSpec__CabinHooks__StepBodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__CabinHooks__StepBodyEl.insertBefore(hookGroup, footerEl);
        ValeSpec__CabinHooks__StepBodyEl.insertBefore(countsRow, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Hooks Step
    // ------------------------------------------------------------
    function ValeSpec__CabinHooks__HooksSummary() {
        var size   =  ValeSpec__CabinHooks__CabinHookSelect ? ValeSpec__CabinHooks__CabinHookSelect.value : '';
        var hooks  =  ValeSpec__CabinHooks__HookCountInput  ? ValeSpec__CabinHooks__HookCountInput.value  : '0';
        var eyes   =  ValeSpec__CabinHooks__EyeCountInput   ? ValeSpec__CabinHooks__EyeCountInput.value   : '0';
        if (!size) return 'None';

        var label  =  '';
        if (ValeSpec__CabinHooks__CabinHookSelect && ValeSpec__CabinHooks__CabinHookSelect.selectedIndex >= 0) {
            label  =  ValeSpec__CabinHooks__CabinHookSelect.options[ValeSpec__CabinHooks__CabinHookSelect.selectedIndex].textContent || '';
        }
        return (label || size) + '  |  ' + hooks + ' hooks, ' + eyes + ' eyes';
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Cabin Hooks Controls from Assembly
    // ------------------------------------------------------------
    function ValeSpec__CabinHooks__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;
        var hooksCfg  =  assemblyData['Assembly__CabinHooks__Config'] || {};

        if (ValeSpec__CabinHooks__CabinHookSelect) {
            ValeSpec__CabinHooks__CabinHookSelect.value  =  hooksCfg['Assembly__CabinHooks__Config__Size'] !== undefined ? String(hooksCfg['Assembly__CabinHooks__Config__Size']) : '';
        }
        if (ValeSpec__CabinHooks__HookCountInput) {
            ValeSpec__CabinHooks__HookCountInput.value   =  hooksCfg['Assembly__CabinHooks__Config__HookCount'] !== undefined ? hooksCfg['Assembly__CabinHooks__Config__HookCount'] : ValeSpec__CabinHooks__HookCountInput.value;
        }
        if (ValeSpec__CabinHooks__EyeCountInput) {
            ValeSpec__CabinHooks__EyeCountInput.value    =  hooksCfg['Assembly__CabinHooks__Config__EyeCount'] !== undefined ? hooksCfg['Assembly__CabinHooks__Config__EyeCount'] : ValeSpec__CabinHooks__EyeCountInput.value;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Hooks Summary with StepManager
    // ------------------------------------------------------------
    function ValeSpec__CabinHooks__RegisterSummary() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;
        StepManager.ValeSpec__StepManager__RegisterSummary('hooks', ValeSpec__CabinHooks__HooksSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Flush Current Hooks Values to Assembly
    // ------------------------------------------------------------
    function ValeSpec__CabinHooks__FlushToAssembly() {
        ValeSpec__CabinHooks__PushUpdate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Cabin Hooks Step
    // ------------------------------------------------------------
    async function ValeSpec__CabinHooks__Init(stepBodyEl) {
        ValeSpec__CabinHooks__StepBodyEl  =  stepBodyEl;
        if (!ValeSpec__CabinHooks__StepBodyEl) return;

        await ValeSpec__CabinHooks__LoadConfig();
        ValeSpec__CabinHooks__BuildStep();
        ValeSpec__CabinHooks__RegisterSummary();

        console.log('[ValeSpec__CabinHooks] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__CabinHooks__Init                : ValeSpec__CabinHooks__Init,
        ValeSpec__CabinHooks__RefreshFromAssembly : ValeSpec__CabinHooks__RefreshFromAssembly,
        ValeSpec__CabinHooks__FlushToAssembly     : ValeSpec__CabinHooks__FlushToAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__CabinHooks  =  ValeSpec__AssemblyEditor__DoorConfigurator__CabinHooks;
