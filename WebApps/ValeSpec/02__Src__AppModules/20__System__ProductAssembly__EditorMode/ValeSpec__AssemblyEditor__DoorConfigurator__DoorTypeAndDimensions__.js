/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR: DOOR TYPE AND DIMENSIONS
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - DoorTypeAndDimensions
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Step 1 (Door Type) and Step 2 (Dimensions)
   CREATED    : 15-Apr-2026

  DESCRIPTION:
   - Step 1: Opening Direction toggle (Outward/Inward), Door Handing toggle (Left/Right), + Door Type dropdown
   - Step 2: Width + Height inputs with linked range sliders
   - Opening Direction stored as separate Assembly__DoorType__Config__OpeningDirection field
   - On dimension change: calls HingeCalculator and LockingCalculator
   - Registers summary callbacks with StepManager for collapsed display
   - Wizard progression via step Next buttons (no auto-skip between steps)
   - Expects canonical assembly schema values normalised by AppUtils ProjectSchemaValidator

   =============================================================================

   DEVELOPMENT LOG:
   17-Apr-2026
   - Dimensions step: DimensionsStepUserEngaged — set on width/height slider or committed text input; reset on door type change
   - RefreshFromAssembly syncs engagement when saved width/height differ from door-type profile defaults
   - ValeSpec__DoorTypeAndDimensions__ValidateDimensionsStepForAdvance for StepManager (blocks Next until user confirms dimensions vs untouched defaults)
   - Auto-advance from this module removed (wizard progression via Next only)

   ============================================================================= */

// =============================================================================
// REGION | Door Type and Dimensions Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions = (function() {

    // MODULE CONSTANTS | Config Path
    // ------------------------------------------------------------
    const CONFIG_PATH  =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/Na__AssemblyEditor__Config.json';
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let ValeSpec__DoorTypeAndDimensions__Step1BodyEl                 =  null;   // <-- Step 1 card body (Door Type)
    let ValeSpec__DoorTypeAndDimensions__Step2BodyEl                 =  null;   // <-- Step 2 card body (Dimensions)
    let ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput          =  null;   // <-- Assembly identity title input
    let ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward     =  null;   // <-- Outward Opening radio button
    let ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward      =  null;   // <-- Inward Opening radio button
    let ValeSpec__DoorTypeAndDimensions__DoorTypeSelect              =  null;   // <-- Door type dropdown
    let ValeSpec__DoorTypeAndDimensions__DoorHandingLeft             =  null;   // <-- Door Handing: Left radio button
    let ValeSpec__DoorTypeAndDimensions__DoorHandingRight            =  null;   // <-- Door Handing: Right radio button
    let ValeSpec__DoorTypeAndDimensions__WidthInput                  =  null;   // <-- Width numeric input
    let ValeSpec__DoorTypeAndDimensions__WidthSlider                 =  null;   // <-- Width range slider
    let ValeSpec__DoorTypeAndDimensions__HeightInput                 =  null;   // <-- Height numeric input
    let ValeSpec__DoorTypeAndDimensions__HeightSlider                =  null;   // <-- Height range slider
    let ValeSpec__DoorTypeAndDimensions__SliderConfig                =  null;   // <-- Slider limits from config
    let ValeSpec__DoorTypeAndDimensions__DoorPanelDefaultsConfig     =  null;   // <-- Door-type width/height defaults and limits
    let ValeSpec__DoorTypeAndDimensions__DoorConditionWarningsConfig =  null;   // <-- Threshold-driven condition messages
    let ValeSpec__DoorTypeAndDimensions__FixedPanelConfig            =  null;   // <-- Fixed panel dropdown options from config
    let ValeSpec__DoorTypeAndDimensions__DoorHandingConfig           =  null;   // <-- Door handing labels/defaults from config
    let ValeSpec__DoorTypeAndDimensions__FixedPanelSelect            =  null;   // <-- Fixed panel dropdown element
    let ValeSpec__DoorTypeAndDimensions__FixedPanelGroup             =  null;   // <-- Fixed panel form group (show/hide)
    let ValeSpec__DoorTypeAndDimensions__LastDoorConditionCode       =  null;   // <-- Prevents duplicate warning toast spam
    let ValeSpec__DoorTypeAndDimensions__DimensionCommitDelayMs      =  450;    // <-- Debounce delay for typed width/height commits
    let ValeSpec__DoorTypeAndDimensions__DimensionCommitTimer        =  null;   // <-- Pending debounce timer for typed commits
    let ValeSpec__DoorTypeAndDimensions__LastCommitSignature         =  '';     // <-- Suppress duplicate blur/change commits
    let ValeSpec__DoorTypeAndDimensions__LastCommitTimestampMs       =  0;      // <-- Last commit timestamp used with signature guard
    let ValeSpec__DoorTypeAndDimensions__DimensionsStepUserEngaged   =  false;  // <-- True once user adjusts dims or saved dims differ from profile defaults
    // ------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Loading and Basic State Utilities
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Determine if Door Type is Configured
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__IsDoorTypeConfigured(doorType) {
        if (!doorType || typeof doorType !== 'string') return false;
        var lower  =  doorType.trim().toLowerCase();
        return lower !== 'none' && lower !== '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Current Opening Direction from Toggle
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__GetOpeningDirection() {
        if (ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward && ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward.checked) {
            return 'Inward';
        }
        return 'Outward';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read Configured Default Door Handing
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__GetDefaultDoorHanding() {
        var cfg  =  ValeSpec__DoorTypeAndDimensions__DoorHandingConfig || {};
        var configured  =  cfg['AssemblyEditor__DoorHanding__Config__DefaultValue'] || 'Left';
        return configured === 'Right' ? 'Right' : 'Left';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Current Door Handing from Toggle
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__GetDoorHanding() {
        if (ValeSpec__DoorTypeAndDimensions__DoorHandingRight && ValeSpec__DoorTypeAndDimensions__DoorHandingRight.checked) {
            return 'Right';
        }
        return ValeSpec__DoorTypeAndDimensions__GetDefaultDoorHanding();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Slider Configuration
    // ------------------------------------------------------------
    async function ValeSpec__DoorTypeAndDimensions__LoadConfig() {
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) return;
            var data  =  await response.json();
            ValeSpec__DoorTypeAndDimensions__SliderConfig                  =  data['AssemblyEditor__Slider__Config']                || null;
            ValeSpec__DoorTypeAndDimensions__DoorPanelDefaultsConfig       =  data['AssemblyEditor__DoorPanelDefaults__Config']     || null;
            ValeSpec__DoorTypeAndDimensions__DoorConditionWarningsConfig   =  data['AssemblyEditor__DoorConditionWarnings__Config'] || null;
            ValeSpec__DoorTypeAndDimensions__FixedPanelConfig              =  data['AssemblyEditor__FixedPanel__Config']            || null;
            ValeSpec__DoorTypeAndDimensions__DoorHandingConfig             =  data['AssemblyEditor__DoorHanding__Config']           || null;
        } catch (e) {
            console.warn('[ValeSpec__DoorTypeAndDimensions] Config load failed:', e);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dimension Constraint and Profile Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Parse and Clamp Dimension Value
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__ClampDimensionValue(rawValue, minValue, maxValue, fallbackValue) {
        var parsed  =  parseInt(rawValue, 10);
        if (isNaN(parsed)) parsed  =  parseInt(fallbackValue, 10);
        if (isNaN(parsed)) parsed  =  minValue;
        return Math.max(minValue, Math.min(maxValue, parsed));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Door Panel Profile by Door Type
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__GetDoorPanelProfile(doorType) {
        var cfg         =  ValeSpec__DoorTypeAndDimensions__DoorPanelDefaultsConfig || {};
        var profileMap  =  cfg['AssemblyEditor__DoorPanelDefaults__Config__DoorTypeProfileMap'] || {};
        var profiles    =  cfg['AssemblyEditor__DoorPanelDefaults__Config__Profiles']            || {};
        var fallbackKey =  cfg['AssemblyEditor__DoorPanelDefaults__Config__FallbackProfileKey']  || 'DoubleDoors';

        var mappedKey  =  profileMap[doorType];
        var profileKey =  mappedKey || fallbackKey;
        var profile    =  profiles[profileKey] || profiles[fallbackKey] || null;

        if (profile) return profile;
        return {
            'AssemblyEditor__DoorPanelDefaults__Config__WidthDefaultMm'   : 1800,
            'AssemblyEditor__DoorPanelDefaults__Config__WidthMinMm'       : 600,
            'AssemblyEditor__DoorPanelDefaults__Config__WidthMaxMm'       : 4000,
            'AssemblyEditor__DoorPanelDefaults__Config__HeightDefaultMm'  : 2100,
            'AssemblyEditor__DoorPanelDefaults__Config__HeightMinMm'      : 1600,
            'AssemblyEditor__DoorPanelDefaults__Config__HeightMaxMm'      : 3000
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Door-Type Min/Max and Values to Inputs
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__ApplyDoorTypeDimensionProfile(doorType, widthValue, heightValue, useProfileDefaults, fallbackWidthValue, fallbackHeightValue, suppressTextInputWriteback) {
        var profile  =  ValeSpec__DoorTypeAndDimensions__GetDoorPanelProfile(doorType);

        var wMin  =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__WidthMinMm'],    10) || 600;
        var wMax  =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__WidthMaxMm'],    10) || 4000;
        var wDef  =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__WidthDefaultMm'],10) || 1800;
        var hMin  =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__HeightMinMm'],   10) || 1600;
        var hMax  =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__HeightMaxMm'],   10) || 3000;
        var hDef  =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__HeightDefaultMm'],10) || 2100;

        var widthFallback   =  parseInt(fallbackWidthValue, 10);
        var heightFallback  =  parseInt(fallbackHeightValue, 10);
        if (isNaN(widthFallback))  widthFallback  =  wDef;
        if (isNaN(heightFallback)) heightFallback =  hDef;

        var nextWidth   =  useProfileDefaults ? wDef : ValeSpec__DoorTypeAndDimensions__ClampDimensionValue(widthValue,  wMin, wMax, widthFallback);
        var nextHeight  =  useProfileDefaults ? hDef : ValeSpec__DoorTypeAndDimensions__ClampDimensionValue(heightValue, hMin, hMax, heightFallback);

        if (ValeSpec__DoorTypeAndDimensions__WidthInput) {
            ValeSpec__DoorTypeAndDimensions__WidthInput.min   =  wMin;
            ValeSpec__DoorTypeAndDimensions__WidthInput.max   =  wMax;
            ValeSpec__DoorTypeAndDimensions__WidthInput.step  =  1;
            if (!suppressTextInputWriteback) ValeSpec__DoorTypeAndDimensions__WidthInput.value  =  nextWidth;
        }
        if (ValeSpec__DoorTypeAndDimensions__WidthSlider) {
            ValeSpec__DoorTypeAndDimensions__WidthSlider.min    =  wMin;
            ValeSpec__DoorTypeAndDimensions__WidthSlider.max    =  wMax;
            ValeSpec__DoorTypeAndDimensions__WidthSlider.step   =  1;
            ValeSpec__DoorTypeAndDimensions__WidthSlider.value  =  nextWidth;
        }
        if (ValeSpec__DoorTypeAndDimensions__HeightInput) {
            ValeSpec__DoorTypeAndDimensions__HeightInput.min   =  hMin;
            ValeSpec__DoorTypeAndDimensions__HeightInput.max   =  hMax;
            ValeSpec__DoorTypeAndDimensions__HeightInput.step  =  1;
            if (!suppressTextInputWriteback) ValeSpec__DoorTypeAndDimensions__HeightInput.value  =  nextHeight;
        }
        if (ValeSpec__DoorTypeAndDimensions__HeightSlider) {
            ValeSpec__DoorTypeAndDimensions__HeightSlider.min    =  hMin;
            ValeSpec__DoorTypeAndDimensions__HeightSlider.max    =  hMax;
            ValeSpec__DoorTypeAndDimensions__HeightSlider.step   =  1;
            ValeSpec__DoorTypeAndDimensions__HeightSlider.value  =  nextHeight;
        }

        return { WidthMm: nextWidth, HeightMm: nextHeight };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sync Dimensions-Step Engagement vs Profile Defaults
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__SyncDimensionsStepEngagementFromDefaults(doorType, widthMm, heightMm) {
        var profile  =  ValeSpec__DoorTypeAndDimensions__GetDoorPanelProfile(doorType);
        var wDef     =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__WidthDefaultMm'], 10)   || 1800;
        var hDef     =  parseInt(profile['AssemblyEditor__DoorPanelDefaults__Config__HeightDefaultMm'], 10)  || 2100;
        var w        =  parseInt(widthMm, 10);
        var h        =  parseInt(heightMm, 10);
        if (isNaN(w)) w  =  wDef;
        if (isNaN(h)) h  =  hDef;
        if (w !== wDef || h !== hDef) {
            ValeSpec__DoorTypeAndDimensions__DimensionsStepUserEngaged  =  true;
        } else {
            ValeSpec__DoorTypeAndDimensions__DimensionsStepUserEngaged  =  false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dimension Input Event Handling and Debounce
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Clear Any Pending Delayed Dimension Commit
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__ClearPendingDimensionCommit() {
        if (ValeSpec__DoorTypeAndDimensions__DimensionCommitTimer) {
            clearTimeout(ValeSpec__DoorTypeAndDimensions__DimensionCommitTimer);
            ValeSpec__DoorTypeAndDimensions__DimensionCommitTimer  =  null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sync Slider Thumb from Typed Numeric Input
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__SyncSliderFromTextInput(textInputEl, sliderEl) {
        if (!textInputEl || !sliderEl) return;
        var parsedValue  =  parseInt(textInputEl.value, 10);
        if (isNaN(parsedValue)) return;

        var sliderMin  =  parseInt(sliderEl.min, 10);
        var sliderMax  =  parseInt(sliderEl.max, 10);
        if (isNaN(sliderMin)) sliderMin = parsedValue;
        if (isNaN(sliderMax)) sliderMax = parsedValue;

        var clampedPreviewValue  =  Math.max(sliderMin, Math.min(sliderMax, parsedValue));
        sliderEl.value  =  clampedPreviewValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Commit Dimension Inputs to Assembly Immediately
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__CommitDimensionInputsNow(commitReason) {
        ValeSpec__DoorTypeAndDimensions__ClearPendingDimensionCommit();

        var widthRaw      =  ValeSpec__DoorTypeAndDimensions__WidthInput  ? ValeSpec__DoorTypeAndDimensions__WidthInput.value  : '';
        var heightRaw     =  ValeSpec__DoorTypeAndDimensions__HeightInput ? ValeSpec__DoorTypeAndDimensions__HeightInput.value : '';
        var signature     =  widthRaw + '|' + heightRaw;
        var nowTimestamp  =  Date.now();
        var elapsedMs     =  nowTimestamp - ValeSpec__DoorTypeAndDimensions__LastCommitTimestampMs;
        var isDelayedCommit  =  (commitReason === 'delayed');

        if (elapsedMs < 80 && signature === ValeSpec__DoorTypeAndDimensions__LastCommitSignature) return;

        ValeSpec__DoorTypeAndDimensions__DimensionsStepUserEngaged  =  true;

        ValeSpec__DoorTypeAndDimensions__OnDimensionChange({
            suppressTextInputWriteback : isDelayedCommit && ValeSpec__DoorTypeAndDimensions__IsDimensionInputBeingEdited()
        });
        ValeSpec__DoorTypeAndDimensions__LastCommitSignature    =  signature;
        ValeSpec__DoorTypeAndDimensions__LastCommitTimestampMs  =  nowTimestamp;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Schedule Delayed Dimension Commit While Typing
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__ScheduleDelayedDimensionCommit() {
        ValeSpec__DoorTypeAndDimensions__ClearPendingDimensionCommit();
        ValeSpec__DoorTypeAndDimensions__DimensionCommitTimer  =  setTimeout(function() {
            ValeSpec__DoorTypeAndDimensions__DimensionCommitTimer  =  null;
            ValeSpec__DoorTypeAndDimensions__CommitDimensionInputsNow('delayed');
        }, ValeSpec__DoorTypeAndDimensions__DimensionCommitDelayMs);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Width/Height Typed Input Event
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__OnDimensionTextInputChanged(textInputEl, sliderEl) {
        ValeSpec__DoorTypeAndDimensions__SyncSliderFromTextInput(textInputEl, sliderEl); // <-- Keep slider responsive without forcing text value

        var parsedValue  =  parseInt(textInputEl ? textInputEl.value : '', 10);
        if (isNaN(parsedValue)) {
            ValeSpec__DoorTypeAndDimensions__ClearPendingDimensionCommit();               // <-- Keep empty/partial typing states stable until explicit commit
            return;
        }

        var minValue  =  parseInt(sliderEl ? sliderEl.min : '', 10);
        var maxValue  =  parseInt(sliderEl ? sliderEl.max : '', 10);
        var belowMin  =  !isNaN(minValue) && parsedValue < minValue;
        var aboveMax  =  !isNaN(maxValue) && parsedValue > maxValue;
        if (belowMin || aboveMax) {
            ValeSpec__DoorTypeAndDimensions__ClearPendingDimensionCommit();               // <-- Out-of-range values clamp only on Enter/blur/change commit
            return;
        }

        ValeSpec__DoorTypeAndDimensions__ScheduleDelayedDimensionCommit();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Width/Height Keydown for Immediate Enter Commit
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__OnDimensionTextInputKeydown(e) {
        if (!e) return;
        if (e.key !== 'Enter') return;
        e.preventDefault();
        ValeSpec__DoorTypeAndDimensions__CommitDimensionInputsNow('enter');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine If Width/Height Input Is Actively Edited
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__IsDimensionInputBeingEdited() {
        var activeEl       =  document.activeElement;
        var widthFocused   =  !!ValeSpec__DoorTypeAndDimensions__WidthInput  && activeEl === ValeSpec__DoorTypeAndDimensions__WidthInput;
        var heightFocused  =  !!ValeSpec__DoorTypeAndDimensions__HeightInput && activeEl === ValeSpec__DoorTypeAndDimensions__HeightInput;
        return widthFocused || heightFocused || !!ValeSpec__DoorTypeAndDimensions__DimensionCommitTimer;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Door Condition and Door Type Option Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Door Condition Rule Message
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__ResolveDoorCondition(doorType, width, height) {
        var cfg  =  ValeSpec__DoorTypeAndDimensions__DoorConditionWarningsConfig || {};

        var minHeight      =  parseInt(cfg['AssemblyEditor__DoorConditionWarnings__Config__MinDoorHeightMm'],      10) || 1600;
        var maxHeight      =  parseInt(cfg['AssemblyEditor__DoorConditionWarnings__Config__MaxDoorHeightMm'],      10) || 3000;
        var tallThreshold  =  parseInt(cfg['AssemblyEditor__DoorConditionWarnings__Config__TallDoorThresholdMm'],  10) || 2250;
        var maxSingle      =  parseInt(cfg['AssemblyEditor__DoorConditionWarnings__Config__MaxSingleDoorWidthMm'], 10) || 949;
        var maxDouble      =  parseInt(cfg['AssemblyEditor__DoorConditionWarnings__Config__MaxDoubleDoorWidthMm'], 10) || 1899;
        var wideLeaf       =  parseInt(cfg['AssemblyEditor__DoorConditionWarnings__Config__WideLeafThresholdMm'],  10) || 950;

        var msgThreeHinge  =  cfg['AssemblyEditor__DoorConditionWarnings__Config__ThreeHingeRuleMessage']      || '';
        var msgFourTall    =  cfg['AssemblyEditor__DoorConditionWarnings__Config__FourHingeTallRuleMessage']   || '';
        var msgDoubleTop   =  cfg['AssemblyEditor__DoorConditionWarnings__Config__DoubleTopRuleMessage']       || '';
        var msgReview      =  cfg['AssemblyEditor__DoorConditionWarnings__Config__SubjectToReviewRuleMessage'] || '';

        var isSingle       =  (doorType || '').indexOf('Single') !== -1;
        var standardMax    =  isSingle ? maxSingle : maxDouble;
        var wideThreshold  =  isSingle ? wideLeaf  : (wideLeaf * 2);

        if (height < minHeight || height > maxHeight) {
            return { Code: 'SUBJECT_TO_REVIEW',    Message: msgReview,     ShowToast: true  };
        }
        if (width >= wideThreshold) {
            return { Code: 'DOUBLE_TOP_4_HINGES',  Message: msgDoubleTop,  ShowToast: false };
        }
        if (height > tallThreshold && width <= standardMax) {
            return { Code: 'TALL_STANDARD_4_HINGES', Message: msgFourTall, ShowToast: false };
        }
        if (height <= tallThreshold && width <= standardMax) {
            return { Code: 'STANDARD_3_HINGES',    Message: msgThreeHinge, ShowToast: false };
        }
        return { Code: 'SUBJECT_TO_REVIEW',        Message: msgReview,     ShowToast: true  };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Door Type Options from AppConfig
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__GetDoorTypeOptions() {
        var ConfigLoader  =  window.ValeSpec__AppCore__ConfigLoader;
        if (!ConfigLoader) return ValeSpec__DoorTypeAndDimensions__GetDefaultDoorTypes();

        var section  =  ConfigLoader.ValeSpec__ConfigLoader__GetSection('DoorTypeOptions');
        if (!section) return ValeSpec__DoorTypeAndDimensions__GetDefaultDoorTypes();

        var types     =  section['ValeSpec__DoorType__Options__Config__DoorTypes'];
        var disabled  =  section['ValeSpec__DoorType__Options__Config__DisabledDoorTypes'] || [];
        if (!types || !types.length) return ValeSpec__DoorTypeAndDimensions__GetDefaultDoorTypes();

        var result  =  [];
        for (var i = 0; i < types.length; i++) {
            var t          =  types[i];
            var isDisabled =  false;
            for (var d = 0; d < disabled.length; d++) {
                if (disabled[d] === t) { isDisabled = true; break; }
            }
            result.push({
                Label   : isDisabled ? t + ' (Coming Soon)' : t,
                Value   : t,
                Enabled : !isDisabled
            });
        }
        return result;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Default Door Types Fallback
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__GetDefaultDoorTypes() {
        return [
            { Label: 'Double Doors',               Value: 'Double Doors',  Enabled: true  },
            { Label: 'Bifold Doors (Coming Soon)',  Value: 'Bifold Doors',  Enabled: false },
            { Label: 'Single Door',                 Value: 'Single Door',   Enabled: true  },
            { Label: 'Window Panel (Coming Soon)',  Value: 'Window Panel',  Enabled: false }
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Assembly State Change Handlers
// -----------------------------------------------------------------------------

    // FUNCTION | Commit Assembly Name Input to Current Assembly
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__CommitAssemblyTitleToAssembly() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager || !ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput) return;

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        var identityConfig  =  assembly['Assembly__Identity__Config'] || {};
        var currentTitle    =  (identityConfig['Assembly__Identity__Config__Title'] || '').trim();
        var nextTitle       =  ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput.value.trim();
        if (nextTitle === currentTitle) return;

        identityConfig['Assembly__Identity__Config__Title']  =  nextTitle;
        assembly['Assembly__Identity__Config']               =  identityConfig;
        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Assembly Name Input Change
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__OnAssemblyTitleInputChanged() {
        ValeSpec__DoorTypeAndDimensions__CommitAssemblyTitleToAssembly();
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Dimension Change - Recalculate Hinges and Locking
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__OnDimensionChange(options) {
        var StateManager       =  window.ValeSpec__AppCore__StateManager;
        var HingeCalculator    =  window.ValeSpec__MathUtils__HingeCalculator;
        var LockingCalculator  =  window.ValeSpec__MathUtils__LockingCalculator;
        var WarningSystem      =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (!StateManager) return;

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        var doorType          =  ValeSpec__DoorTypeAndDimensions__DoorTypeSelect ? ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.value : '';
        var openingDirection  =  ValeSpec__DoorTypeAndDimensions__GetOpeningDirection();
        var doorHanding       =  ValeSpec__DoorTypeAndDimensions__GetDoorHanding();
        var widthRaw          =  ValeSpec__DoorTypeAndDimensions__WidthInput  ? ValeSpec__DoorTypeAndDimensions__WidthInput.value  : 1800;
        var heightRaw         =  ValeSpec__DoorTypeAndDimensions__HeightInput ? ValeSpec__DoorTypeAndDimensions__HeightInput.value : 2100;

        var dimsCfgFallback  =  assembly['Assembly__Dimensions__Config'] || {};
        var widthFallback    =  dimsCfgFallback['Assembly__Dimensions__Config__WidthMm'];
        var heightFallback   =  dimsCfgFallback['Assembly__Dimensions__Config__HeightMm'];

        var suppressTextInputWriteback  =  !!(options && options.suppressTextInputWriteback);
        var constrained  =  ValeSpec__DoorTypeAndDimensions__ApplyDoorTypeDimensionProfile(
            doorType,
            widthRaw,
            heightRaw,
            false,
            widthFallback,
            heightFallback,
            suppressTextInputWriteback
        );
        var width   =  constrained.WidthMm;
        var height  =  constrained.HeightMm;

        if (!assembly['Assembly__DoorType__Config']) assembly['Assembly__DoorType__Config'] = {};
        assembly['Assembly__DoorType__Config']['Assembly__DoorType__Config__Type']             =  doorType;
        assembly['Assembly__DoorType__Config']['Assembly__DoorType__Config__OpeningDirection'] =  openingDirection;
        assembly['Handing']  =  doorHanding;

        if (!assembly['Assembly__Dimensions__Config']) assembly['Assembly__Dimensions__Config'] = {};
        assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__WidthMm']   =  width;
        assembly['Assembly__Dimensions__Config']['Assembly__Dimensions__Config__HeightMm']  =  height;

        if (!ValeSpec__DoorTypeAndDimensions__IsDoorTypeConfigured(doorType)) {
            delete assembly['Assembly__Hinge__Config'];         // <-- Remove implied defaults when assembly is unconfigured
            delete assembly['Assembly__Locking__Config'];       // <-- Locking spec is unknown until door type is selected
            delete assembly['Assembly__DoorCondition__Config']; // <-- No condition warning until a door type is selected
            delete assembly['Assembly__Opening__Config'];       // <-- No opening symbols until a door type is selected
            ValeSpec__DoorTypeAndDimensions__LastDoorConditionCode  =  null;
            StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
            return;
        }

        if (HingeCalculator) {
            var hingeResult  =  HingeCalculator.ValeSpec__HingeCalculator__CalculateHingesPerLeaf(doorType, width, height);
            if (!assembly['Assembly__Hinge__Config']) assembly['Assembly__Hinge__Config'] = {};
            assembly['Assembly__Hinge__Config']['Assembly__Hinge__Config__HingesPerLeaf']  =  hingeResult.count;
            assembly['Assembly__Hinge__Config']['Assembly__Hinge__Config__Hanging']        =  hingeResult.hanging;
        }

        var doorCondition  =  ValeSpec__DoorTypeAndDimensions__ResolveDoorCondition(doorType, width, height);
        if (!assembly['Assembly__DoorCondition__Config']) assembly['Assembly__DoorCondition__Config'] = {};
        assembly['Assembly__DoorCondition__Config']['Assembly__DoorCondition__Config__ConditionCode']  =  doorCondition.Code;
        assembly['Assembly__DoorCondition__Config']['Assembly__DoorCondition__Config__WarningMessage'] =  doorCondition.Message;
        assembly['Assembly__DoorCondition__Config']['Assembly__DoorCondition__Config__AppliesWarning'] =  !!doorCondition.ShowToast;

        if (doorCondition.ShowToast && doorCondition.Message && WarningSystem && doorCondition.Code !== ValeSpec__DoorTypeAndDimensions__LastDoorConditionCode) {
            WarningSystem.ValeSpec__WarningSystem__ShowWarningToast(doorCondition.Message, 'warning');
        }
        ValeSpec__DoorTypeAndDimensions__LastDoorConditionCode  =  doorCondition.Code;

        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly) {
            var activeWarnings  =  WarningSystem.ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly);
            if (WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings && ValeSpec__DoorTypeAndDimensions__Step2BodyEl) {
                WarningSystem.ValeSpec__WarningSystem__RenderInlineWarnings(ValeSpec__DoorTypeAndDimensions__Step2BodyEl, activeWarnings);
            }
        }

        if (LockingCalculator) {
            var lockResult  =  LockingCalculator.ValeSpec__LockingCalculator__CalculateLocking(doorType, height);
            if (!assembly['Assembly__Locking__Config']) assembly['Assembly__Locking__Config'] = {};
            assembly['Assembly__Locking__Config']['Assembly__Locking__Config__Points']  =  lockResult.points;
            assembly['Assembly__Locking__Config']['Assembly__Locking__Config__Type']    =  lockResult.type;
        }

        var fixedPanelValue  =  ValeSpec__DoorTypeAndDimensions__FixedPanelSelect ? ValeSpec__DoorTypeAndDimensions__FixedPanelSelect.value : 'none';
        if (!assembly['Assembly__Opening__Config']) assembly['Assembly__Opening__Config'] = {};
        assembly['Assembly__Opening__Config']['Assembly__Opening__Config__FixedPanel']  =  fixedPanelValue;

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Door Type Change
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__OnDoorTypeChange() {
        var doorType  =  ValeSpec__DoorTypeAndDimensions__DoorTypeSelect ? ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.value : '';
        ValeSpec__DoorTypeAndDimensions__DimensionsStepUserEngaged  =  false;

        ValeSpec__DoorTypeAndDimensions__ApplyDoorTypeDimensionProfile(doorType, null, null, true);
        ValeSpec__DoorTypeAndDimensions__UpdateFixedPanelVisibility();
        ValeSpec__DoorTypeAndDimensions__OnDimensionChange();

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) {
            if (!ValeSpec__DoorTypeAndDimensions__IsDoorTypeConfigured(doorType)) {
                StepManager.ValeSpec__StepManager__MarkCompleted('doorType', false);
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Opening Direction Toggle Change
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__OnOpeningDirectionChange() {
        ValeSpec__DoorTypeAndDimensions__UpdateToggleStyles();
        ValeSpec__DoorTypeAndDimensions__OnDimensionChange();
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Door Handing Toggle Change
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__OnDoorHandingChange() {
        ValeSpec__DoorTypeAndDimensions__UpdateDoorHandingToggleStyles();
        ValeSpec__DoorTypeAndDimensions__OnDimensionChange();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | UI State Helpers - Toggle, Panel Visibility
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Update Opening Direction Toggle Visual State
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__UpdateToggleStyles() {
        if (!ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward || !ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward) return;
        var outwardBtn  =  ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward.parentElement;
        var inwardBtn   =  ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward.parentElement;
        if (!outwardBtn || !inwardBtn) return;

        if (ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward.checked) {
            outwardBtn.classList.add('ValeSpec__ToggleBtn--active');
            inwardBtn.classList.remove('ValeSpec__ToggleBtn--active');
        } else {
            outwardBtn.classList.remove('ValeSpec__ToggleBtn--active');
            inwardBtn.classList.add('ValeSpec__ToggleBtn--active');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Door Handing Toggle Visual State
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__UpdateDoorHandingToggleStyles() {
        if (!ValeSpec__DoorTypeAndDimensions__DoorHandingLeft || !ValeSpec__DoorTypeAndDimensions__DoorHandingRight) return;
        var leftBtn   =  ValeSpec__DoorTypeAndDimensions__DoorHandingLeft.parentElement;
        var rightBtn  =  ValeSpec__DoorTypeAndDimensions__DoorHandingRight.parentElement;
        if (!leftBtn || !rightBtn) return;

        if (ValeSpec__DoorTypeAndDimensions__DoorHandingLeft.checked) {
            leftBtn.classList.add('ValeSpec__ToggleBtn--active');
            rightBtn.classList.remove('ValeSpec__ToggleBtn--active');
        } else {
            leftBtn.classList.remove('ValeSpec__ToggleBtn--active');
            rightBtn.classList.add('ValeSpec__ToggleBtn--active');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine if Door Type is Double
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__IsDoubleDoor(doorType) {
        if (!doorType) return false;
        var lower  =  doorType.toLowerCase();
        return lower.indexOf('double') !== -1 || lower.indexOf('bifold') !== -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Fixed Panel Dropdown Visibility
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__UpdateFixedPanelVisibility() {
        if (!ValeSpec__DoorTypeAndDimensions__FixedPanelGroup) return;
        var doorType      =  ValeSpec__DoorTypeAndDimensions__DoorTypeSelect ? ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.value : '';
        var isDouble      =  ValeSpec__DoorTypeAndDimensions__IsDoubleDoor(doorType);
        var isConfigured  =  ValeSpec__DoorTypeAndDimensions__IsDoorTypeConfigured(doorType);

        ValeSpec__DoorTypeAndDimensions__FixedPanelGroup.style.display  =  (isConfigured && isDouble) ? '' : 'none';

        if (!isDouble && ValeSpec__DoorTypeAndDimensions__FixedPanelSelect) {
            ValeSpec__DoorTypeAndDimensions__FixedPanelSelect.value  =  'none';         // <-- Reset to "none" for non-double doors
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Building - Step 1 Door Type and Step 2 Dimensions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Step 1 - Door Type
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__BuildDoorTypeStep() {
        var footerEl  =  ValeSpec__DoorTypeAndDimensions__Step1BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');

        // ASSEMBLY NAME INPUT
        var titleGroup  =  document.createElement('div');
        titleGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var titleLabel  =  document.createElement('label');
        titleLabel.textContent  =  'Assembly Name';
        titleLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__AssemblyTitle');

        ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput       =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput.type  =  'text';
        ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput.id    =  'ValeSpec__AssemblyEditor__AssemblyTitle';
        ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput.placeholder  =  'Enter a name for this assembly';

        ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput.addEventListener('input',  ValeSpec__DoorTypeAndDimensions__OnAssemblyTitleInputChanged);
        ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput.addEventListener('change', ValeSpec__DoorTypeAndDimensions__OnAssemblyTitleInputChanged);
        ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput.addEventListener('blur',   ValeSpec__DoorTypeAndDimensions__OnAssemblyTitleInputChanged);

        titleGroup.appendChild(titleLabel);
        titleGroup.appendChild(ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput);
        ValeSpec__DoorTypeAndDimensions__Step1BodyEl.insertBefore(titleGroup, footerEl);

        // DOOR TYPE DROPDOWN
        var typeGroup  =  document.createElement('div');
        typeGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var typeLabel  =  document.createElement('label');
        typeLabel.textContent  =  'Door Type';
        typeLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__DoorType');

        ValeSpec__DoorTypeAndDimensions__DoorTypeSelect     =  document.createElement('select');
        ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.id  =  'ValeSpec__AssemblyEditor__DoorType';

        var placeholder          =  document.createElement('option');
        placeholder.value        =  '';
        placeholder.textContent  =  '\u2014 Please Select \u2014';
        placeholder.disabled     =  true;
        placeholder.selected     =  true;
        placeholder.hidden       =  true;
        ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.appendChild(placeholder);

        var options  =  ValeSpec__DoorTypeAndDimensions__GetDoorTypeOptions();
        for (var i = 0; i < options.length; i++) {
            var opt          =  document.createElement('option');
            opt.value        =  options[i].Value;
            opt.textContent  =  options[i].Label;
            if (!options[i].Enabled) {
                opt.disabled  =  true;
                opt.title     =  'This option is not yet available';
            }
            ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.appendChild(opt);
        }

        ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.addEventListener('change', ValeSpec__DoorTypeAndDimensions__OnDoorTypeChange);

        typeGroup.appendChild(typeLabel);
        typeGroup.appendChild(ValeSpec__DoorTypeAndDimensions__DoorTypeSelect);
        ValeSpec__DoorTypeAndDimensions__Step1BodyEl.insertBefore(typeGroup, footerEl);

        var doorHandingCfg   =  ValeSpec__DoorTypeAndDimensions__DoorHandingConfig || {};
        var defaultHanding   =  ValeSpec__DoorTypeAndDimensions__GetDefaultDoorHanding();
        var handingLabelText =  doorHandingCfg['AssemblyEditor__DoorHanding__Config__Label']      || 'Door Handing';
        var leftOptionLabel  =  doorHandingCfg['AssemblyEditor__DoorHanding__Config__LeftLabel']  || 'Left (Current)';
        var rightOptionLabel =  doorHandingCfg['AssemblyEditor__DoorHanding__Config__RightLabel'] || 'Right';

        // OPENING DIRECTION TOGGLE
        var dirGroup  =  document.createElement('div');
        dirGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var dirLabel  =  document.createElement('label');
        dirLabel.textContent  =  'Opening Direction';
        dirGroup.appendChild(dirLabel);

        var toggleRow  =  document.createElement('div');
        toggleRow.className  =  'ValeSpec__ToggleBtnGroup';

        var outwardLabel  =  document.createElement('label');
        outwardLabel.className  =  'ValeSpec__ToggleBtn ValeSpec__ToggleBtn--active';
        ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward        =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward.type   =  'radio';
        ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward.name   =  'ValeSpec__AssemblyEditor__OpeningDirection';
        ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward.value  =  'Outward';
        ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward.checked  =  true;
        outwardLabel.appendChild(ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward);
        outwardLabel.appendChild(document.createTextNode(' Outward Opening'));

        var inwardLabel  =  document.createElement('label');
        inwardLabel.className  =  'ValeSpec__ToggleBtn';
        ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward        =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward.type   =  'radio';
        ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward.name   =  'ValeSpec__AssemblyEditor__OpeningDirection';
        ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward.value  =  'Inward';
        inwardLabel.appendChild(ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward);
        inwardLabel.appendChild(document.createTextNode(' Inward Opening'));

        toggleRow.appendChild(outwardLabel);
        toggleRow.appendChild(inwardLabel);
        dirGroup.appendChild(toggleRow);

        ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward.addEventListener('change', ValeSpec__DoorTypeAndDimensions__OnOpeningDirectionChange);
        ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward.addEventListener('change',  ValeSpec__DoorTypeAndDimensions__OnOpeningDirectionChange);

        ValeSpec__DoorTypeAndDimensions__Step1BodyEl.insertBefore(dirGroup, footerEl);

        // DOOR HANDING TOGGLE
        var handingGroup  =  document.createElement('div');
        handingGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';

        var handingLabel  =  document.createElement('label');
        handingLabel.textContent  =  handingLabelText;
        handingGroup.appendChild(handingLabel);

        var handingToggleRow  =  document.createElement('div');
        handingToggleRow.className  =  'ValeSpec__ToggleBtnGroup';

        var leftHandingLabel  =  document.createElement('label');
        leftHandingLabel.className  =  'ValeSpec__ToggleBtn';
        ValeSpec__DoorTypeAndDimensions__DoorHandingLeft        =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__DoorHandingLeft.type   =  'radio';
        ValeSpec__DoorTypeAndDimensions__DoorHandingLeft.name   =  'ValeSpec__AssemblyEditor__DoorHanding';
        ValeSpec__DoorTypeAndDimensions__DoorHandingLeft.value  =  'Left';
        ValeSpec__DoorTypeAndDimensions__DoorHandingLeft.checked  =  (defaultHanding !== 'Right');
        leftHandingLabel.appendChild(ValeSpec__DoorTypeAndDimensions__DoorHandingLeft);
        leftHandingLabel.appendChild(document.createTextNode(' ' + leftOptionLabel));

        var rightHandingLabel  =  document.createElement('label');
        rightHandingLabel.className  =  'ValeSpec__ToggleBtn';
        ValeSpec__DoorTypeAndDimensions__DoorHandingRight        =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__DoorHandingRight.type   =  'radio';
        ValeSpec__DoorTypeAndDimensions__DoorHandingRight.name   =  'ValeSpec__AssemblyEditor__DoorHanding';
        ValeSpec__DoorTypeAndDimensions__DoorHandingRight.value  =  'Right';
        ValeSpec__DoorTypeAndDimensions__DoorHandingRight.checked  =  (defaultHanding === 'Right');
        rightHandingLabel.appendChild(ValeSpec__DoorTypeAndDimensions__DoorHandingRight);
        rightHandingLabel.appendChild(document.createTextNode(' ' + rightOptionLabel));

        handingToggleRow.appendChild(leftHandingLabel);
        handingToggleRow.appendChild(rightHandingLabel);
        handingGroup.appendChild(handingToggleRow);

        ValeSpec__DoorTypeAndDimensions__DoorHandingLeft.addEventListener('change',  ValeSpec__DoorTypeAndDimensions__OnDoorHandingChange);
        ValeSpec__DoorTypeAndDimensions__DoorHandingRight.addEventListener('change', ValeSpec__DoorTypeAndDimensions__OnDoorHandingChange);

        ValeSpec__DoorTypeAndDimensions__Step1BodyEl.insertBefore(handingGroup, footerEl);
        ValeSpec__DoorTypeAndDimensions__UpdateDoorHandingToggleStyles();

        // FIXED PANEL DROPDOWN (visible only for double doors)
        ValeSpec__DoorTypeAndDimensions__FixedPanelGroup  =  document.createElement('div');
        ValeSpec__DoorTypeAndDimensions__FixedPanelGroup.className      =  'ValeSpec__AssemblyEditor__FormGroup';
        ValeSpec__DoorTypeAndDimensions__FixedPanelGroup.style.display  =  'none';

        var fixedLabel  =  document.createElement('label');
        fixedLabel.textContent  =  'Fixed Panel';
        fixedLabel.setAttribute('for', 'ValeSpec__AssemblyEditor__FixedPanel');

        ValeSpec__DoorTypeAndDimensions__FixedPanelSelect     =  document.createElement('select');
        ValeSpec__DoorTypeAndDimensions__FixedPanelSelect.id  =  'ValeSpec__AssemblyEditor__FixedPanel';

        var fpOptions  =  (ValeSpec__DoorTypeAndDimensions__FixedPanelConfig && ValeSpec__DoorTypeAndDimensions__FixedPanelConfig['AssemblyEditor__FixedPanel__Config__Options']) || [
            { Label: 'None \u2014 Both Panels Open', Value: 'none'  },
            { Label: 'Left Panel Fixed',              Value: 'left'  },
            { Label: 'Right Panel Fixed',             Value: 'right' }
        ];

        for (var fp = 0; fp < fpOptions.length; fp++) {
            var fpOpt          =  document.createElement('option');
            fpOpt.value        =  fpOptions[fp].Value;
            fpOpt.textContent  =  fpOptions[fp].Label;
            ValeSpec__DoorTypeAndDimensions__FixedPanelSelect.appendChild(fpOpt);
        }

        ValeSpec__DoorTypeAndDimensions__FixedPanelSelect.addEventListener('change', function() {
            ValeSpec__DoorTypeAndDimensions__OnDimensionChange();
        });

        ValeSpec__DoorTypeAndDimensions__FixedPanelGroup.appendChild(fixedLabel);
        ValeSpec__DoorTypeAndDimensions__FixedPanelGroup.appendChild(ValeSpec__DoorTypeAndDimensions__FixedPanelSelect);
        ValeSpec__DoorTypeAndDimensions__Step1BodyEl.insertBefore(ValeSpec__DoorTypeAndDimensions__FixedPanelGroup, footerEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step 2 - Dimensions
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__BuildDimensionsStep() {
        var cfg  =  ValeSpec__DoorTypeAndDimensions__SliderConfig;

        var wMin   =  (cfg && cfg['AssemblyEditor__Slider__Config__WidthMinMm'])      || 600;
        var wMax   =  (cfg && cfg['AssemblyEditor__Slider__Config__WidthMaxMm'])      || 4000;
        var wStep  =  (cfg && cfg['AssemblyEditor__Slider__Config__WidthStepMm'])     || 1;
        var wDef   =  (cfg && cfg['AssemblyEditor__Slider__Config__WidthDefaultMm'])  || 1800;
        var hMin   =  (cfg && cfg['AssemblyEditor__Slider__Config__HeightMinMm'])     || 1600;
        var hMax   =  (cfg && cfg['AssemblyEditor__Slider__Config__HeightMaxMm'])     || 3000;
        var hStep  =  (cfg && cfg['AssemblyEditor__Slider__Config__HeightStepMm'])    || 1;
        var hDef   =  (cfg && cfg['AssemblyEditor__Slider__Config__HeightDefaultMm']) || 2100;

        var commitDelayMs        =  (cfg && cfg['AssemblyEditor__Slider__Config__DimensionInputCommitDelayMs']) || 450;
        var parsedCommitDelayMs  =  parseInt(commitDelayMs, 10);
        ValeSpec__DoorTypeAndDimensions__DimensionCommitDelayMs  =  (!isNaN(parsedCommitDelayMs) && parsedCommitDelayMs >= 0) ? parsedCommitDelayMs : 450;

        var dimsRow  =  document.createElement('div');
        dimsRow.className  =  'ValeSpec__AssemblyEditor__FormRow';

        var widthGroup  =  document.createElement('div');
        widthGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';
        widthGroup.classList.add('ValeSpec__AssemblyEditor__SliderGroup');

        var widthLabel  =  document.createElement('label');
        widthLabel.textContent  =  'Width (mm)';

        ValeSpec__DoorTypeAndDimensions__WidthInput        =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__WidthInput.type   =  'number';
        ValeSpec__DoorTypeAndDimensions__WidthInput.id     =  'ValeSpec__AssemblyEditor__WidthInput';
        ValeSpec__DoorTypeAndDimensions__WidthInput.min    =  wMin;
        ValeSpec__DoorTypeAndDimensions__WidthInput.max    =  wMax;
        ValeSpec__DoorTypeAndDimensions__WidthInput.step   =  wStep;
        ValeSpec__DoorTypeAndDimensions__WidthInput.value  =  wDef;

        ValeSpec__DoorTypeAndDimensions__WidthSlider        =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__WidthSlider.type   =  'range';
        ValeSpec__DoorTypeAndDimensions__WidthSlider.id     =  'ValeSpec__AssemblyEditor__WidthRange';
        ValeSpec__DoorTypeAndDimensions__WidthSlider.min    =  wMin;
        ValeSpec__DoorTypeAndDimensions__WidthSlider.max    =  wMax;
        ValeSpec__DoorTypeAndDimensions__WidthSlider.step   =  wStep;
        ValeSpec__DoorTypeAndDimensions__WidthSlider.value  =  wDef;

        widthGroup.appendChild(widthLabel);
        widthGroup.appendChild(ValeSpec__DoorTypeAndDimensions__WidthInput);
        widthGroup.appendChild(ValeSpec__DoorTypeAndDimensions__WidthSlider);

        var heightGroup  =  document.createElement('div');
        heightGroup.className  =  'ValeSpec__AssemblyEditor__FormGroup';
        heightGroup.classList.add('ValeSpec__AssemblyEditor__SliderGroup');

        var heightLabel  =  document.createElement('label');
        heightLabel.textContent  =  'Height (mm)';

        ValeSpec__DoorTypeAndDimensions__HeightInput        =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__HeightInput.type   =  'number';
        ValeSpec__DoorTypeAndDimensions__HeightInput.id     =  'ValeSpec__AssemblyEditor__HeightInput';
        ValeSpec__DoorTypeAndDimensions__HeightInput.min    =  hMin;
        ValeSpec__DoorTypeAndDimensions__HeightInput.max    =  hMax;
        ValeSpec__DoorTypeAndDimensions__HeightInput.step   =  hStep;
        ValeSpec__DoorTypeAndDimensions__HeightInput.value  =  hDef;

        ValeSpec__DoorTypeAndDimensions__HeightSlider        =  document.createElement('input');
        ValeSpec__DoorTypeAndDimensions__HeightSlider.type   =  'range';
        ValeSpec__DoorTypeAndDimensions__HeightSlider.id     =  'ValeSpec__AssemblyEditor__HeightRange';
        ValeSpec__DoorTypeAndDimensions__HeightSlider.min    =  hMin;
        ValeSpec__DoorTypeAndDimensions__HeightSlider.max    =  hMax;
        ValeSpec__DoorTypeAndDimensions__HeightSlider.step   =  hStep;
        ValeSpec__DoorTypeAndDimensions__HeightSlider.value  =  hDef;

        heightGroup.appendChild(heightLabel);
        heightGroup.appendChild(ValeSpec__DoorTypeAndDimensions__HeightInput);
        heightGroup.appendChild(ValeSpec__DoorTypeAndDimensions__HeightSlider);

        dimsRow.appendChild(widthGroup);
        dimsRow.appendChild(heightGroup);

        ValeSpec__DoorTypeAndDimensions__WidthInput.addEventListener('input', function() {
            ValeSpec__DoorTypeAndDimensions__OnDimensionTextInputChanged(ValeSpec__DoorTypeAndDimensions__WidthInput, ValeSpec__DoorTypeAndDimensions__WidthSlider);
        });
        ValeSpec__DoorTypeAndDimensions__WidthInput.addEventListener('keydown', function(e) {
            ValeSpec__DoorTypeAndDimensions__OnDimensionTextInputKeydown(e);
        });
        ValeSpec__DoorTypeAndDimensions__WidthInput.addEventListener('focus', function() {
            ValeSpec__DoorTypeAndDimensions__WidthInput.select();
        });
        ValeSpec__DoorTypeAndDimensions__WidthInput.addEventListener('blur', function() {
            ValeSpec__DoorTypeAndDimensions__CommitDimensionInputsNow('blur');
        });
        ValeSpec__DoorTypeAndDimensions__WidthInput.addEventListener('change', function() {
            ValeSpec__DoorTypeAndDimensions__CommitDimensionInputsNow('change');
        });
        ValeSpec__DoorTypeAndDimensions__WidthSlider.addEventListener('input', function() {
            ValeSpec__DoorTypeAndDimensions__DimensionsStepUserEngaged  =  true;
            ValeSpec__DoorTypeAndDimensions__WidthInput.value  =  ValeSpec__DoorTypeAndDimensions__WidthSlider.value;
            ValeSpec__DoorTypeAndDimensions__OnDimensionChange();
        });
        ValeSpec__DoorTypeAndDimensions__HeightInput.addEventListener('input', function() {
            ValeSpec__DoorTypeAndDimensions__OnDimensionTextInputChanged(ValeSpec__DoorTypeAndDimensions__HeightInput, ValeSpec__DoorTypeAndDimensions__HeightSlider);
        });
        ValeSpec__DoorTypeAndDimensions__HeightInput.addEventListener('keydown', function(e) {
            ValeSpec__DoorTypeAndDimensions__OnDimensionTextInputKeydown(e);
        });
        ValeSpec__DoorTypeAndDimensions__HeightInput.addEventListener('focus', function() {
            ValeSpec__DoorTypeAndDimensions__HeightInput.select();
        });
        ValeSpec__DoorTypeAndDimensions__HeightInput.addEventListener('blur', function() {
            ValeSpec__DoorTypeAndDimensions__CommitDimensionInputsNow('blur');
        });
        ValeSpec__DoorTypeAndDimensions__HeightInput.addEventListener('change', function() {
            ValeSpec__DoorTypeAndDimensions__CommitDimensionInputsNow('change');
        });
        ValeSpec__DoorTypeAndDimensions__HeightSlider.addEventListener('input', function() {
            ValeSpec__DoorTypeAndDimensions__DimensionsStepUserEngaged  =  true;
            ValeSpec__DoorTypeAndDimensions__HeightInput.value  =  ValeSpec__DoorTypeAndDimensions__HeightSlider.value;
            ValeSpec__DoorTypeAndDimensions__OnDimensionChange();
        });

        var footerEl  =  ValeSpec__DoorTypeAndDimensions__Step2BodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        ValeSpec__DoorTypeAndDimensions__Step2BodyEl.insertBefore(dimsRow, footerEl);

        var selectedDoorType  =  ValeSpec__DoorTypeAndDimensions__DoorTypeSelect ? ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.value : '';
        ValeSpec__DoorTypeAndDimensions__ApplyDoorTypeDimensionProfile(selectedDoorType, wDef, hDef, true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Summary Callbacks, Refresh and Initialisation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Summary Callback for Step 1 (Door Type)
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__DoorTypeSummary() {
        var val  =  ValeSpec__DoorTypeAndDimensions__DoorTypeSelect ? ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.value : '';
        if (!ValeSpec__DoorTypeAndDimensions__IsDoorTypeConfigured(val)) return 'Not selected';
        var direction  =  ValeSpec__DoorTypeAndDimensions__GetOpeningDirection();
        var handing    =  ValeSpec__DoorTypeAndDimensions__GetDoorHanding();
        return direction + ' Opening ' + val + '  |  ' + handing + ' Handing';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Summary Callback for Step 2 (Dimensions)
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__DimensionsSummary() {
        var w  =  ValeSpec__DoorTypeAndDimensions__WidthInput   ? ValeSpec__DoorTypeAndDimensions__WidthInput.value   : '1800';
        var h  =  ValeSpec__DoorTypeAndDimensions__HeightInput   ? ValeSpec__DoorTypeAndDimensions__HeightInput.value  : '2100';
        return w + ' x ' + h + ' mm';
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Controls from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var identityCfg  =  assemblyData['Assembly__Identity__Config'] || {};
        var doorCfg  =  assemblyData['Assembly__DoorType__Config']   || {};
        var dimsCfg  =  assemblyData['Assembly__Dimensions__Config'] || {};

        var assemblyTitle      =  identityCfg['Assembly__Identity__Config__Title']             || '';
        var doorType          =  doorCfg['Assembly__DoorType__Config__Type']             || '';
        var openingDirection  =  doorCfg['Assembly__DoorType__Config__OpeningDirection'] || 'Outward';
        var handing           =  assemblyData['Handing'] || ValeSpec__DoorTypeAndDimensions__GetDefaultDoorHanding();
        var width             =  dimsCfg['Assembly__Dimensions__Config__WidthMm']        || 1800;
        var height            =  dimsCfg['Assembly__Dimensions__Config__HeightMm']       || 2100;

        if (
            ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput &&
            document.activeElement !== ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput
        ) {
            ValeSpec__DoorTypeAndDimensions__AssemblyTitleInput.value  =  assemblyTitle;
        }

        if (ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward && ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward) {
            if (openingDirection === 'Inward') {
                ValeSpec__DoorTypeAndDimensions__OpeningDirectionInward.checked   =  true;
            } else {
                ValeSpec__DoorTypeAndDimensions__OpeningDirectionOutward.checked  =  true;
            }
            ValeSpec__DoorTypeAndDimensions__UpdateToggleStyles();
        }

        if (ValeSpec__DoorTypeAndDimensions__DoorHandingLeft && ValeSpec__DoorTypeAndDimensions__DoorHandingRight) {
            if (handing === 'Right') {
                ValeSpec__DoorTypeAndDimensions__DoorHandingRight.checked  =  true;
            } else {
                ValeSpec__DoorTypeAndDimensions__DoorHandingLeft.checked   =  true;
            }
            ValeSpec__DoorTypeAndDimensions__UpdateDoorHandingToggleStyles();
        }

        if (ValeSpec__DoorTypeAndDimensions__DoorTypeSelect) {
            var hasDoorTypeOption  =  false;
            for (var i = 0; i < ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.options.length; i++) {
                if (ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.options[i].value === doorType) {
                    hasDoorTypeOption  =  true;
                    break;
                }
            }
            if (hasDoorTypeOption && doorType) {
                ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.value  =  doorType;
            } else {
                ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.selectedIndex  =  0;                // <-- Reset to "Please Select" placeholder
            }
            doorType  =  ValeSpec__DoorTypeAndDimensions__DoorTypeSelect.value;
        }

        var doorTypeCfg  =  assemblyData['Assembly__DoorType__Config'];
        if (doorTypeCfg && Object.prototype.hasOwnProperty.call(doorTypeCfg, 'Assembly__DoorType__Config__Quantity')) {
            delete doorTypeCfg['Assembly__DoorType__Config__Quantity']; // <-- Drop legacy key so next save omits it
        }

        if (!ValeSpec__DoorTypeAndDimensions__IsDimensionInputBeingEdited()) {
            var appliedDims  =  ValeSpec__DoorTypeAndDimensions__ApplyDoorTypeDimensionProfile(doorType, width, height, false, width, height);
            ValeSpec__DoorTypeAndDimensions__SyncDimensionsStepEngagementFromDefaults(doorType, appliedDims.WidthMm, appliedDims.HeightMm);
        }

        var openingCfg  =  assemblyData['Assembly__Opening__Config'] || {};
        var fixedPanel  =  openingCfg['Assembly__Opening__Config__FixedPanel'] || 'none';
        if (ValeSpec__DoorTypeAndDimensions__FixedPanelSelect) {
            ValeSpec__DoorTypeAndDimensions__FixedPanelSelect.value  =  fixedPanel;
        }
        ValeSpec__DoorTypeAndDimensions__UpdateFixedPanelVisibility();

        var warningCfg  =  assemblyData['Assembly__DoorCondition__Config'] || {};
        ValeSpec__DoorTypeAndDimensions__LastDoorConditionCode  =  warningCfg['Assembly__DoorCondition__Config__ConditionCode'] || null;

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly) {
            WarningSystem.ValeSpec__WarningSystem__RestoreWarningsFromAssembly(assemblyData, ValeSpec__DoorTypeAndDimensions__Step2BodyEl);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Validate Dimensions Step Before Advancing
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__ValidateDimensionsStepForAdvance() {
        var wEl  =  ValeSpec__DoorTypeAndDimensions__WidthInput;
        var hEl  =  ValeSpec__DoorTypeAndDimensions__HeightInput;

        var clearErrW  =  function(e) {
            e.target.classList.remove('ValeSpec__ValidationError');
            e.target.removeEventListener('input', clearErrW);
            e.target.removeEventListener('change', clearErrW);
        };
        var clearErrH  =  function(e) {
            e.target.classList.remove('ValeSpec__ValidationError');
            e.target.removeEventListener('input', clearErrH);
            e.target.removeEventListener('change', clearErrH);
        };

        if (ValeSpec__DoorTypeAndDimensions__DimensionsStepUserEngaged) {
            if (wEl) wEl.classList.remove('ValeSpec__ValidationError');
            if (hEl) hEl.classList.remove('ValeSpec__ValidationError');
            return true;
        }

        if (wEl) {
            wEl.classList.add('ValeSpec__ValidationError');
            wEl.addEventListener('input', clearErrW);
            wEl.addEventListener('change', clearErrW);
        }
        if (hEl) {
            hEl.classList.add('ValeSpec__ValidationError');
            hEl.addEventListener('input', clearErrH);
            hEl.addEventListener('change', clearErrH);
        }
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Register Summaries with StepManager
    // ------------------------------------------------------------
    function ValeSpec__DoorTypeAndDimensions__RegisterSummaries() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        StepManager.ValeSpec__StepManager__RegisterSummary('doorType',   ValeSpec__DoorTypeAndDimensions__DoorTypeSummary);
        StepManager.ValeSpec__StepManager__RegisterSummary('dimensions', ValeSpec__DoorTypeAndDimensions__DimensionsSummary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Door Type and Dimensions Steps
    // ------------------------------------------------------------
    async function ValeSpec__DoorTypeAndDimensions__Init(step1BodyEl, step2BodyEl) {
        ValeSpec__DoorTypeAndDimensions__Step1BodyEl  =  step1BodyEl;
        ValeSpec__DoorTypeAndDimensions__Step2BodyEl  =  step2BodyEl;
        if (!ValeSpec__DoorTypeAndDimensions__Step1BodyEl || !ValeSpec__DoorTypeAndDimensions__Step2BodyEl) return;

        await ValeSpec__DoorTypeAndDimensions__LoadConfig();

        var WarningSystem  =  window.ValeSpec__AssemblyEditor__WarningSystem;
        if (WarningSystem && WarningSystem.ValeSpec__WarningSystem__EnsureConfig) {
            await WarningSystem.ValeSpec__WarningSystem__EnsureConfig();        // <-- Preload warning rules so synchronous evaluation has rules available
        }

        ValeSpec__DoorTypeAndDimensions__BuildDoorTypeStep();
        ValeSpec__DoorTypeAndDimensions__BuildDimensionsStep();
        ValeSpec__DoorTypeAndDimensions__RegisterSummaries();

        console.log('[ValeSpec__DoorTypeAndDimensions] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__DoorTypeAndDimensions__Init                              : ValeSpec__DoorTypeAndDimensions__Init,
        ValeSpec__DoorTypeAndDimensions__RefreshFromAssembly               : ValeSpec__DoorTypeAndDimensions__RefreshFromAssembly,
        ValeSpec__DoorTypeAndDimensions__ValidateDimensionsStepForAdvance  : ValeSpec__DoorTypeAndDimensions__ValidateDimensionsStepForAdvance
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions  =  ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions;
