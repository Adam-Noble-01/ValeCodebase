/* =============================================================================
   VGHLANTERN - CREATION WIZARD | CONTROLLER
   =============================================================================

   FILE       : VghLantern__CreationWizard__Controller__.js
   NAMESPACE  : VghLantern
   MODULE     : System - CreationWizard - Controller
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Orchestrate wizard sessions and spawn the finished lantern
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - The brain of the Lantern Creation Wizard. Owns the session (which steps,
     which values, what is confirmed), drives the Overlay's state classes, and
     applies the finished answers onto a lantern.
   - Two entry points, both consulted by existing flows rather than replacing
     them: BeginFirstLantern runs after a new project lands in the editor and
     shapes the seeded lantern in place; BeginAdditionalLantern runs from the
     editor's + Add Lantern button and holds a fresh default lantern off to the
     side, only pushing it into the project when Create is pressed - so a
     cancelled wizard adds nothing and a cancelled first lantern keeps its
     seed defaults.
   - Both entry points return false when the wizard cannot or should not run
     (disabled in config, missing modules), which tells the caller to fall back
     to the legacy silent creation path. The wizard is therefore an overlay on
     the old behaviour, never a dependency of it.
   - Values are confirmed one step at a time (Next or Enter), each confirmation
     lighting the step's lamp and advancing to the first unconfirmed step;
     completed steps reopen from their summary row without losing anything.
   - The live preview redraws on every keystroke from draft values clamped to
     the editor bounds, so the sketch never draws an impossible lantern.

   ============================================================================= */

// =============================================================================
// REGION | Creation Wizard Controller Module
// =============================================================================

const VghLantern__CreationWizard__Controller = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Context Labels and Lantern Block Names
    // ------------------------------------------------------------
    const CFG_FILE            =  'Na__CreationWizard__Config.json';
    const CFG_BEHAVIOUR_KEY   =  'VghLantern__CreationWizard__Config__Behaviour';
    const CFG_CHROME_KEY      =  'VghLantern__CreationWizard__Config__Chrome';
    const CFG_CARDS_KEY       =  'VghLantern__CreationWizard__Config__FinialCards';
    const CFG_PREVIEW_KEY     =  'VghLantern__CreationWizard__Config__PreviewPane';
    const CFG_MESSAGES_KEY    =  'VghLantern__CreationWizard__Config__Messages';
    const PROJECT_LANTERNS    =  'VghLantern__ProjectFile__Lanterns';
    const FORM_BLOCK          =  'Lantern__Form__Config';
    const FIELD_ROOF_FORM     =  'Lantern__Form__Config__RoofForm';
    const BASE_BLOCK          =  'Lantern__BuildersUpstandAndBase__Config';
    const FIELD_UPSTAND_H     =  'Lantern__BuildersUpstandAndBase__Config__UpstandHeightMm';
    const FIELD_FRAME_H       =  'Lantern__BuildersUpstandAndBase__Config__FrameHeightMm';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Active Wizard Session
    // ------------------------------------------------------------
    // Null when the wizard is closed. TargetLantern is the seeded first lantern
    // (mutated only on Create) or the held-back new lantern (pushed on Create).
    let VghLantern__CreationWizard__Controller__Session  =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read One Named Block of the Wizard Config Section
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__ConfigBlock(blockKey) {
        var Steps  =  window.VghLantern__CreationWizard__Steps;
        if (!Steps) return {};
        var wizardCfg  =  Steps.VghLantern__CreationWizard__Steps__ConfigSection();
        return wizardCfg[blockKey] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Assemble the Overlay's String Bag from Config
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__BuildStrings() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var chromeCfg     =  VghLantern__CreationWizard__Controller__ConfigBlock(CFG_CHROME_KEY);
        var cardsCfg      =  VghLantern__CreationWizard__Controller__ConfigBlock(CFG_CARDS_KEY);
        var previewCfg    =  VghLantern__CreationWizard__Controller__ConfigBlock(CFG_PREVIEW_KEY);
        var Req           =  ConfigLoader.VghLantern__ConfigLoader__RequireString;

        return {
            StepCounterTemplate  : Req(chromeCfg,  'StepCounterTemplate',  CFG_FILE + ' -> ' + CFG_CHROME_KEY),
            NextButtonLabel      : Req(chromeCfg,  'NextButtonLabel',      CFG_FILE + ' -> ' + CFG_CHROME_KEY),
            CancelButtonLabel    : Req(chromeCfg,  'CancelButtonLabel',    CFG_FILE + ' -> ' + CFG_CHROME_KEY),
            CreateButtonLabel    : Req(chromeCfg,  'CreateButtonLabel',    CFG_FILE + ' -> ' + CFG_CHROME_KEY),
            AllCompleteHint      : Req(chromeCfg,  'AllCompleteHint',      CFG_FILE + ' -> ' + CFG_CHROME_KEY),
            EnterKeyHint         : Req(chromeCfg,  'EnterKeyHint',         CFG_FILE + ' -> ' + CFG_CHROME_KEY),
            NoFinialsLabel       : Req(cardsCfg,   'NoFinialsLabel',       CFG_FILE + ' -> ' + CFG_CARDS_KEY),
            NoFinialsPreviewText : Req(cardsCfg,   'NoFinialsPreviewText', CFG_FILE + ' -> ' + CFG_CARDS_KEY),
            NoComponentsMessage  : Req(cardsCfg,   'NoComponentsMessage',  CFG_FILE + ' -> ' + CFG_CARDS_KEY),
            PaneTitle            : Req(previewCfg, 'PaneTitle',            CFG_FILE + ' -> ' + CFG_PREVIEW_KEY),
            PlanLabel            : Req(previewCfg, 'PlanLabel',            CFG_FILE + ' -> ' + CFG_PREVIEW_KEY),
            ElevationLabel       : Req(previewCfg, 'ElevationLabel',       CFG_FILE + ' -> ' + CFG_PREVIEW_KEY),
            NoFinialCaption      : Req(previewCfg, 'NoFinialCaption',      CFG_FILE + ' -> ' + CFG_PREVIEW_KEY)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Session Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Find a Step Definition by Its Key
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__StepByKey(stepKey) {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        if (!session) return null;
        for (var i = 0; i < session.Steps.length; i++) {
            if (session.Steps[i].Key === stepKey) return session.Steps[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find the First Step Not Yet Confirmed
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__FirstIncompleteKey() {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        for (var i = 0; i < session.Steps.length; i++) {
            if (session.Completed[session.Steps[i].Key] !== true) return session.Steps[i].Key;
        }
        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Count the Confirmed Steps
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__CompletedCount() {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        var count    =  0;
        for (var i = 0; i < session.Steps.length; i++) {
            if (session.Completed[session.Steps[i].Key] === true) count++;
        }
        return count;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Push the Progress Bar and Counter to the Overlay
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__RefreshProgress() {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        var Overlay  =  window.VghLantern__CreationWizard__Overlay;
        if (!session || !Overlay) return;

        var total      =  session.Steps.length;
        var completed  =  VghLantern__CreationWizard__Controller__CompletedCount();

        var current  =  total;
        for (var i = 0; i < session.Steps.length; i++) {
            if (session.Steps[i].Key === session.ActiveKey) { current  =  i + 1; break; }
        }

        var counterText  =  session.Strings.StepCounterTemplate
            .replace('{current}', String(current))
            .replace('{total}',   String(total));

        Overlay.VghLantern__CreationWizard__Overlay__SetProgress((completed / total) * 100, counterText);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Make One Step Active in the Session and the Overlay
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__ActivateStep(stepKey) {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        var Overlay  =  window.VghLantern__CreationWizard__Overlay;
        if (!session || !Overlay) return;

        session.ActiveKey  =  stepKey;
        Overlay.VghLantern__CreationWizard__Overlay__SetActiveStep(stepKey);
        VghLantern__CreationWizard__Controller__RefreshProgress();
        VghLantern__CreationWizard__Controller__RenderPreview();             // <-- Re-render so the active step's dimension takes the red prompt
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Collapsed Summary Text for a Confirmed Step
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__SummaryText(step, value) {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        var Steps    =  window.VghLantern__CreationWizard__Steps;

        if (step.Kind === 'cards') {
            if (value === '') return session.Strings.NoFinialsLabel;
            var option  =  VghLantern__CreationWizard__Controller__FinialOptionById(value);
            return option ? option.Label : String(value);
        }

        if (step.Kind === 'text') {
            var text  =  String(value || '').trim();
            return text !== '' ? text : session.Messages.BlankNameSummary;
        }

        return Steps.VghLantern__CreationWizard__Steps__FormatValue(step, value);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find a Resolved Finial Option by Component Id
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__FinialOptionById(componentId) {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        if (!session || !componentId) return null;
        for (var i = 0; i < session.FinialOptions.length; i++) {
            if (String(session.FinialOptions[i].Value) === String(componentId)) return session.FinialOptions[i];
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Live Preview Assembly
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Redraw the Sketch and Captions from the Draft Values
    // ------------------------------------------------------------
    // Draft values are already clamped to the editor bounds, and the base band
    // heights come from the target lantern itself, so the sketch always shows
    // a lantern the app would genuinely accept.
    function VghLantern__CreationWizard__Controller__RenderPreview() {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        var Overlay  =  window.VghLantern__CreationWizard__Overlay;
        var Sketch   =  window.VghLantern__CreationWizard__PreviewSketch;
        var Steps    =  window.VghLantern__CreationWizard__Steps;
        if (!session || !Overlay || !Sketch || !Steps) return;

        var lantern   =  session.TargetLantern;
        var formCfg   =  lantern[FORM_BLOCK] || {};
        var baseCfg   =  lantern[BASE_BLOCK] || {};
        var finialId  =  session.PreviewValues.finial;

        var sketchSvg  =  Sketch.VghLantern__CreationWizard__PreviewSketch__Build({
            LengthMm        : Number(session.PreviewValues.length),
            DepthMm         : Number(session.PreviewValues.width),
            PitchDegrees    : Number(session.PreviewValues.pitch),
            RoofForm        : String(formCfg[FIELD_ROOF_FORM] || ''),
            UpstandHeightMm : Number(baseCfg[FIELD_UPSTAND_H]) || 0,
            FrameHeightMm   : Number(baseCfg[FIELD_FRAME_H]) || 0,
            FinialOption    : finialId ? VghLantern__CreationWizard__Controller__FinialOptionById(finialId) : null,
            ActiveKey       : session.ActiveKey,
            PlanLabel       : session.Strings.PlanLabel,
            ElevationLabel  : session.Strings.ElevationLabel
        });

        var captionParts  =  [];
        var lengthStep    =  VghLantern__CreationWizard__Controller__StepByKey('length');
        var widthStep     =  VghLantern__CreationWizard__Controller__StepByKey('width');
        var pitchStep     =  VghLantern__CreationWizard__Controller__StepByKey('pitch');
        var Fmt           =  Steps.VghLantern__CreationWizard__Steps__FormatValue;

        if (lengthStep && widthStep) {
            captionParts.push(Fmt(lengthStep, session.PreviewValues.length) + ' x ' + Fmt(widthStep, session.PreviewValues.width));
        }
        if (pitchStep) captionParts.push(Fmt(pitchStep, session.PreviewValues.pitch) + ' pitch');

        var subCaption  =  '';
        if (finialId === '')      subCaption  =  session.Strings.NoFinialCaption;
        else if (finialId) {
            var option   =  VghLantern__CreationWizard__Controller__FinialOptionById(finialId);
            subCaption   =  option ? option.Label : String(finialId);
        }

        Overlay.VghLantern__CreationWizard__Overlay__UpdatePreview(sketchSvg, captionParts.join('  |  '), subCaption);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Overlay Event Handlers
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Confirm a Step's Value and Advance the Flow
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__OnConfirmStep(stepKey, rawValue) {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        var Overlay  =  window.VghLantern__CreationWizard__Overlay;
        var Steps    =  window.VghLantern__CreationWizard__Steps;
        var step     =  VghLantern__CreationWizard__Controller__StepByKey(stepKey);
        if (!session || !step) return;

        var value  =  null;

        if (step.Kind === 'dimension') {
            var result  =  Steps.VghLantern__CreationWizard__Steps__ValidateDimension(step, rawValue);
            if (!result.Ok) {
                var bounds   =  step.Bounds || { Min : 0, Max : 0 };
                var message  =  session.Messages.DimensionRangeTemplate
                    .replace('{min}',  String(bounds.Min))
                    .replace('{max}',  String(bounds.Max))
                    .replace('{unit}', step.Unit);
                Overlay.VghLantern__CreationWizard__Overlay__ShowStepMessage(stepKey, message);
                return;
            }
            value  =  result.Value;
        }

        if (step.Kind === 'cards') {
            value  =  session.Values[stepKey];
            if (value === null || value === undefined) {
                Overlay.VghLantern__CreationWizard__Overlay__ShowStepMessage(stepKey, session.Messages.FinialChoiceRequired);
                return;
            }
        }

        if (step.Kind === 'text') {
            value  =  String(rawValue === null || rawValue === undefined ? '' : rawValue);
        }

        session.Values[stepKey]         =  value;
        session.PreviewValues[stepKey]  =  value;
        session.Completed[stepKey]      =  true;

        Overlay.VghLantern__CreationWizard__Overlay__MarkStepComplete(
            stepKey, VghLantern__CreationWizard__Controller__SummaryText(step, value));

        var nextKey  =  VghLantern__CreationWizard__Controller__FirstIncompleteKey();
        if (nextKey !== '') {
            VghLantern__CreationWizard__Controller__ActivateStep(nextKey);   // <-- Renders the preview with the next step's dimension prompted
        } else {
            session.ActiveKey  =  '';
            Overlay.VghLantern__CreationWizard__Overlay__SetAllComplete();
            VghLantern__CreationWizard__Controller__RefreshProgress();
            VghLantern__CreationWizard__Controller__RenderPreview();         // <-- Every dimension rests in Vale blue once nothing is being asked
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Record a Finial Card Selection
    // ------------------------------------------------------------
    // Selection is not confirmation: the card highlights and the preview grows
    // its finial immediately, but the step only completes on Next or Enter.
    function VghLantern__CreationWizard__Controller__OnCardSelect(stepKey, value) {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        var Overlay  =  window.VghLantern__CreationWizard__Overlay;
        if (!session) return;

        session.Values[stepKey]         =  String(value);
        session.PreviewValues[stepKey]  =  String(value);

        Overlay.VghLantern__CreationWizard__Overlay__SelectCard(stepKey, value);
        VghLantern__CreationWizard__Controller__RenderPreview();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Stream a Draft Input Value into the Live Preview
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__OnLiveInput(stepKey, rawValue) {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        var step     =  VghLantern__CreationWizard__Controller__StepByKey(stepKey);
        if (!session || !step || step.Kind !== 'dimension') return;

        var Steps   =  window.VghLantern__CreationWizard__Steps;
        var result  =  Steps.VghLantern__CreationWizard__Steps__ValidateDimension(step, rawValue);
        if (!result.Ok) return;                                              // <-- Half-typed values simply leave the sketch as it was

        session.PreviewValues[stepKey]  =  result.Value;
        VghLantern__CreationWizard__Controller__RenderPreview();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Reopen a Completed Step from Its Summary Row
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__OnReopen(stepKey) {
        var session  =  VghLantern__CreationWizard__Controller__Session;
        if (!session || session.Completed[stepKey] !== true) return;
        VghLantern__CreationWizard__Controller__ActivateStep(stepKey);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Dismiss the Wizard Without Creating Anything
    // ------------------------------------------------------------
    // The additional-lantern flow holds its new lantern outside the project
    // until Create, so cancelling here genuinely adds nothing; the first
    // lantern flow leaves the seeded defaults untouched.
    function VghLantern__CreationWizard__Controller__OnCancel() {
        var Overlay  =  window.VghLantern__CreationWizard__Overlay;
        if (Overlay) Overlay.VghLantern__CreationWizard__Overlay__Close();
        VghLantern__CreationWizard__Controller__Session  =  null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply Every Confirmed Value and Spawn the Lantern
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__OnCreate() {
        var session       =  VghLantern__CreationWizard__Controller__Session;
        var Overlay       =  window.VghLantern__CreationWizard__Overlay;
        var Steps         =  window.VghLantern__CreationWizard__Steps;
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!session || !Steps || !StateManager) return;
        if (VghLantern__CreationWizard__Controller__FirstIncompleteKey() !== '') return;

        Steps.VghLantern__CreationWizard__Steps__Apply(session.Steps, session.Values, session.TargetLantern);

        if (session.Mode === 'first') {
            // The seeded lantern is already lantern 0; reselecting it emits
            // lanternSelected, which rebuilds the panel and forces a fresh solve.
            StateManager.VghLantern__StateManager__MarkDirty();
            StateManager.VghLantern__StateManager__SetCurrentLanternIndex(0);
        } else {
            var Layout  =  window.VghLantern__LanternEditor__Layout;
            if (Layout && Layout.VghLantern__LanternEditor__Layout__AddLantern) {
                Layout.VghLantern__LanternEditor__Layout__AddLantern(session.TargetLantern);
            } else {
                // Same append-select contract as the editor's AddLantern, kept
                // here only for the day the wizard outlives that entry point.
                var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
                var lanterns  =  project ? project[PROJECT_LANTERNS] : null;
                if (!lanterns) return;
                lanterns.push(session.TargetLantern);
                StateManager.VghLantern__StateManager__MarkDirty();
                StateManager.VghLantern__StateManager__SetCurrentLanternIndex(lanterns.length - 1);
            }
        }

        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) {
            Toast.VghLantern__Toast__Show(
                session.Mode === 'first' ? session.Messages.CreatedToastFirst : session.Messages.CreatedToastAdditional,
                'success');
        }

        if (Overlay) Overlay.VghLantern__CreationWizard__Overlay__Close();
        VghLantern__CreationWizard__Controller__Session  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Session Construction and Entry Points
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Verify Every Module the Wizard Leans On Is Present
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__ModulesReady() {
        return !!(window.VghLantern__CreationWizard__Steps
               && window.VghLantern__CreationWizard__Overlay
               && window.VghLantern__CreationWizard__PreviewSketch
               && window.VghLantern__AppCore__StateManager
               && window.VghLantern__AppCore__ConfigLoader);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Session and Raise the Overlay
    // ------------------------------------------------------------
    function VghLantern__CreationWizard__Controller__OpenSession(mode, targetLantern, includeNameStep, title, subtitle) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var Steps         =  window.VghLantern__CreationWizard__Steps;
        var Overlay       =  window.VghLantern__CreationWizard__Overlay;

        var steps  =  Steps.VghLantern__CreationWizard__Steps__Build(includeNameStep);
        if (steps.length === 0) return false;

        var behaviourCfg  =  VghLantern__CreationWizard__Controller__ConfigBlock(CFG_BEHAVIOUR_KEY);
        var messagesCfg   =  VghLantern__CreationWizard__Controller__ConfigBlock(CFG_MESSAGES_KEY);
        var values        =  Steps.VghLantern__CreationWizard__Steps__ReadPrefill(steps, targetLantern);
        var ReqNum        =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber;
        var ReqStr        =  ConfigLoader.VghLantern__ConfigLoader__RequireString;

        VghLantern__CreationWizard__Controller__Session  =  {
            Mode           : mode,
            Steps          : steps,
            Values         : values,
            PreviewValues  : Object.assign({}, values),
            Completed      : {},
            ActiveKey      : '',
            TargetLantern  : targetLantern,
            FinialOptions  : Steps.VghLantern__CreationWizard__Steps__ResolveFinialOptions(),
            Strings        : VghLantern__CreationWizard__Controller__BuildStrings(),
            Messages       : {
                DimensionRangeTemplate : ReqStr(messagesCfg, 'DimensionRangeTemplate', CFG_FILE + ' -> ' + CFG_MESSAGES_KEY),
                FinialChoiceRequired   : ReqStr(messagesCfg, 'FinialChoiceRequired',   CFG_FILE + ' -> ' + CFG_MESSAGES_KEY),
                BlankNameSummary       : ReqStr(messagesCfg, 'BlankNameSummary',       CFG_FILE + ' -> ' + CFG_MESSAGES_KEY),
                CreatedToastFirst      : ReqStr(messagesCfg, 'CreatedToastFirst',      CFG_FILE + ' -> ' + CFG_MESSAGES_KEY),
                CreatedToastAdditional : ReqStr(messagesCfg, 'CreatedToastAdditional', CFG_FILE + ' -> ' + CFG_MESSAGES_KEY)
            }
        };

        var session  =  VghLantern__CreationWizard__Controller__Session;

        Overlay.VghLantern__CreationWizard__Overlay__Open({
            Title          : title,
            Subtitle       : subtitle,
            Steps          : steps,
            Values         : values,
            FinialOptions  : session.FinialOptions,
            Strings        : session.Strings,
            TransitionMs   : ReqNum(behaviourCfg, 'SectionTransitionMs', CFG_FILE + ' -> ' + CFG_BEHAVIOUR_KEY),
            FocusDelayMs   : ReqNum(behaviourCfg, 'AutoFocusDelayMs',    CFG_FILE + ' -> ' + CFG_BEHAVIOUR_KEY),
            Handlers       : {
                OnConfirmStep : VghLantern__CreationWizard__Controller__OnConfirmStep,
                OnCardSelect  : VghLantern__CreationWizard__Controller__OnCardSelect,
                OnLiveInput   : VghLantern__CreationWizard__Controller__OnLiveInput,
                OnReopen      : VghLantern__CreationWizard__Controller__OnReopen,
                OnCancel      : VghLantern__CreationWizard__Controller__OnCancel,
                OnCreate      : VghLantern__CreationWizard__Controller__OnCreate
            }
        });

        VghLantern__CreationWizard__Controller__ActivateStep(steps[0].Key);  // <-- Also draws the first preview render
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Begin the Wizard for a New Project's Seeded First Lantern
    // ------------------------------------------------------------
    // Called by the Document Management new-project flow after it lands in the
    // editor. Returns false when the wizard should not run, in which case the
    // seeded lantern simply stands as it always has.
    function VghLantern__CreationWizard__Controller__BeginFirstLantern() {
        if (!VghLantern__CreationWizard__Controller__ModulesReady()) return false;

        var Overlay  =  window.VghLantern__CreationWizard__Overlay;
        if (Overlay.VghLantern__CreationWizard__Overlay__IsOpen()) return true;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var behaviourCfg  =  VghLantern__CreationWizard__Controller__ConfigBlock(CFG_BEHAVIOUR_KEY);
        var BEHAVIOUR_LBL =  CFG_FILE + ' -> ' + CFG_BEHAVIOUR_KEY;
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(behaviourCfg, 'Enabled', BEHAVIOUR_LBL))            return false;
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(behaviourCfg, 'RunForFirstLantern', BEHAVIOUR_LBL)) return false;

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var project       =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var lanterns      =  project ? project[PROJECT_LANTERNS] : null;
        if (!Array.isArray(lanterns) || lanterns.length === 0) return false;

        var chromeCfg  =  VghLantern__CreationWizard__Controller__ConfigBlock(CFG_CHROME_KEY);
        var CHROME_LBL =  CFG_FILE + ' -> ' + CFG_CHROME_KEY;

        return VghLantern__CreationWizard__Controller__OpenSession(
            'first', lanterns[0], false,
            ConfigLoader.VghLantern__ConfigLoader__RequireString(chromeCfg, 'TitleFirstLantern', CHROME_LBL),
            ConfigLoader.VghLantern__ConfigLoader__RequireString(chromeCfg, 'SubtitleFirstLantern', CHROME_LBL));
    }
    // ------------------------------------------------------------


    // FUNCTION | Begin the Wizard for a Lantern Added to an Existing Project
    // ------------------------------------------------------------
    // Called by the editor's + Add Lantern path. The fresh default lantern is
    // built now but held outside the project until Create; the name step is
    // included because the project already holds at least one lantern.
    function VghLantern__CreationWizard__Controller__BeginAdditionalLantern() {
        if (!VghLantern__CreationWizard__Controller__ModulesReady()) return false;

        var Overlay  =  window.VghLantern__CreationWizard__Overlay;
        if (Overlay.VghLantern__CreationWizard__Overlay__IsOpen()) return true;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var behaviourCfg  =  VghLantern__CreationWizard__Controller__ConfigBlock(CFG_BEHAVIOUR_KEY);
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(behaviourCfg, 'Enabled', CFG_FILE + ' -> ' + CFG_BEHAVIOUR_KEY)) return false;

        var SchemaValidator  =  window.VghLantern__AppUtils__ProjectSchemaValidator;
        var StateManager     =  window.VghLantern__AppCore__StateManager;
        var project          =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var lanterns         =  project ? project[PROJECT_LANTERNS] : null;
        if (!SchemaValidator || !Array.isArray(lanterns)) return false;

        var pendingLantern  =  SchemaValidator.VghLantern__SchemaValidator__BuildDefaultLantern(lanterns.length);

        var chromeCfg  =  VghLantern__CreationWizard__Controller__ConfigBlock(CFG_CHROME_KEY);
        var CHROME_LBL =  CFG_FILE + ' -> ' + CFG_CHROME_KEY;

        return VghLantern__CreationWizard__Controller__OpenSession(
            'additional', pendingLantern, true,
            ConfigLoader.VghLantern__ConfigLoader__RequireString(chromeCfg, 'TitleAdditionalLantern', CHROME_LBL),
            ConfigLoader.VghLantern__ConfigLoader__RequireString(chromeCfg, 'SubtitleAdditionalLantern', CHROME_LBL));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__CreationWizard__Controller__BeginFirstLantern      : VghLantern__CreationWizard__Controller__BeginFirstLantern,
        VghLantern__CreationWizard__Controller__BeginAdditionalLantern : VghLantern__CreationWizard__Controller__BeginAdditionalLantern
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__CreationWizard__Controller  =  VghLantern__CreationWizard__Controller;
