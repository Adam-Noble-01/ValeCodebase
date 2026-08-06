/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | DOCUMENT STATE
   =============================================================================

   FILE       : VghLantern__DocPreview__DocumentState__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - DocumentState
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Shared view state and page geometry for screen preview and PDF parity
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Single source of truth for what the output document contains and how big its
     pages are. Both the on-screen preview and the PDF exporter read from here.
   - View state layers three sources, lowest priority first: hardcoded fallback,
     Na__DocPreview__Config.json defaults, then the persisted per-user file.
   - Page geometry is authored in paper millimetres. The screen multiplies by a
     pixels-per-mm factor; the PDF uses the millimetres directly. That is what keeps
     preview and export the same document rather than two lookalikes.

   -----------------------------------------------------------------------------

   WHY THE TOGGLE KEYS ARE BARE NAMES:
   View state uses short keys ('ShowPlanView'), while config and the user file use
   fully namespaced ones. Translation happens once, here, at the boundary. Consumers
   downstream only ever see the short form.

   ============================================================================= */

// =============================================================================
// REGION | Document Preview Document State Module
// =============================================================================

const VghLantern__DocPreview__DocumentState = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Toggle Keys and Groupings
    // ------------------------------------------------------------
    // The drawing page is one switch. It used to be four, one per view, which meant
    // this module had to know the Drawing Editor's slot keys and the preview had to
    // filter the sheet as it rebuilt it. The sheet is now baked whole, so which views
    // it carries is decided where the sheet is composed.
    //
    // These switches are per-KIND, not per-lantern. A four-lantern pack is four
    // drawings under one Drawing Sheets switch, because a toolbar with a switch per
    // page would be a table of contents with checkboxes, and nobody wants to issue a
    // pack with lantern three's drawing missing.
    const LETTER_KEYS        =  ['ShowWelcomeLetter'];
    const SUMMARY_KEYS       =  ['ShowProjectSummary'];
    const DRAWING_VIEW_KEYS  =  ['ShowDrawingSheet'];
    const DRAWING_NOTE_KEYS  =  ['ShowDrawingNotes'];
    const DOCUMENT_KEYS      =  ['ShowTakeoffSchedule', 'ShowComponentSchedule', 'ShowJobNotes'];
    const DRAWING_TERMS_KEYS =  ['ShowDrawingTermsPages'];
    const TERMS_KEYS         =  ['ShowTermsPages'];
    const ALL_TOGGLE_KEYS    =  LETTER_KEYS.concat(SUMMARY_KEYS, DRAWING_VIEW_KEYS, DRAWING_NOTE_KEYS,
                                                   DOCUMENT_KEYS, DRAWING_TERMS_KEYS, TERMS_KEYS);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Page Kind Names
    // ------------------------------------------------------------
    // The vocabulary shared by PageOrder in config, the plan this module builds, and
    // the builder tables in the preview renderer and the PDF exporter. PER_LANTERN is
    // not a page: it is the marker in PageOrder saying "walk the schedule here".
    const KIND_WELCOME_LETTER   =  'welcomeLetter';
    const KIND_PROJECT_SUMMARY  =  'projectSummary';
    const KIND_PER_LANTERN      =  'perLantern';
    const KIND_LANTERN_DRAWING  =  'lanternDrawing';
    const KIND_LANTERN_NOTES    =  'lanternDrawingTerms';
    const KIND_LANTERN_SPEC     =  'lanternSpecification';
    const KIND_DRAWING_TERMS    =  'generalDrawingTerms';
    const KIND_TERMS            =  'terms';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Project Data Keys
    // ------------------------------------------------------------
    const PROJECT_LANTERNS  =  'VghLantern__ProjectFile__Lanterns';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Defaults
    // ------------------------------------------------------------
    // These have no config equivalent to fall back to - PaperSizesMm may be missing
    // the exact size key requested, and this is the last-resort geometry guard.
    const FALLBACK_SIZES_MM     =  {
        A4 : { WidthMm: 210, HeightMm: 297 },
        A3 : { WidthMm: 297, HeightMm: 420 }
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Resolved View State
    // ------------------------------------------------------------
    let VghLantern__DocumentState__ViewState      =  null;
    let VghLantern__DocumentState__PaperSize      =  null;
    let VghLantern__DocumentState__Orientation    =  null;
    let VghLantern__DocumentState__IsInitialised  =  false;
    let VghLantern__DocumentState__IsEventBound   =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the DocPreview Config Block
    // ------------------------------------------------------------
    function VghLantern__DocumentState__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Page Config Sub-Block
    // ------------------------------------------------------------
    function VghLantern__DocumentState__PageConfig() {
        return VghLantern__DocumentState__Config()['VghLantern__DocPreview__Config__Page'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the View State Config Sub-Block
    // ------------------------------------------------------------
    function VghLantern__DocumentState__ViewConfig() {
        return VghLantern__DocumentState__Config()['VghLantern__DocPreview__Config__ViewState'] || {};
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View State Resolution
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Seed View State from Config Defaults
    // ------------------------------------------------------------
    function VghLantern__DocumentState__SeedFromConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var VIEW_LABEL  =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__ViewState';
        var viewCfg  =  VghLantern__DocumentState__ViewConfig();
        var state    =  {};
        var i, key;

        for (i = 0; i < ALL_TOGGLE_KEYS.length; i++) {
            key  =  ALL_TOGGLE_KEYS[i];
            state[key]  =  ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(
                viewCfg, 'Default' + key, VIEW_LABEL);
        }

        return state;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Overlay the Persisted Per-User Toggles
    // ------------------------------------------------------------
    function VghLantern__DocumentState__ApplyPersistedOverride(targetState) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var viewCfg  =  VghLantern__DocumentState__ViewConfig();
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(
                viewCfg, 'PersistViewState', 'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__ViewState')) {
            return targetState;
        }

        var MenuDataHandler  =  window.VghLantern__DocPreview__MenuDataHandler;
        if (!MenuDataHandler) return targetState;
        if (!MenuDataHandler.VghLantern__DocPreview__MenuDataHandler__IsDataLoaded()) return targetState;

        var override  =  MenuDataHandler.VghLantern__DocPreview__MenuDataHandler__GetDocPreviewViewStateOverride();
        if (!override) return targetState;

        var i, key;
        for (i = 0; i < ALL_TOGGLE_KEYS.length; i++) {
            key  =  ALL_TOGGLE_KEYS[i];
            if (typeof override[key] === 'boolean') targetState[key]  =  override[key];
        }

        return targetState;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the View State Once
    // ------------------------------------------------------------
    function VghLantern__DocumentState__EnsureInitialised() {
        if (VghLantern__DocumentState__IsInitialised) return;

        // Kicked off here rather than at script load because resolving the user slug
        // needs the app config, which is not parsed yet when this file evaluates.
        var MenuDataHandler  =  window.VghLantern__DocPreview__MenuDataHandler;
        if (MenuDataHandler) MenuDataHandler.VghLantern__DocPreview__MenuDataHandler__EnsureLoaded();

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pageCfg  =  VghLantern__DocumentState__PageConfig();
        var PAGE_LABEL =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Page';

        VghLantern__DocumentState__ViewState    =  VghLantern__DocumentState__ApplyPersistedOverride(
                                                       VghLantern__DocumentState__SeedFromConfig()
                                                   );
        VghLantern__DocumentState__PaperSize    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(pageCfg, 'DefaultPaperSize',   PAGE_LABEL);
        VghLantern__DocumentState__Orientation  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(pageCfg, 'DefaultOrientation', PAGE_LABEL);

        VghLantern__DocumentState__IsInitialised  =  true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Re-Render When the Persisted Config Lands Late
    // ------------------------------------------------------------
    // The user file arrives after first paint. Rather than block rendering on it, the
    // mode paints from defaults and this re-resolves once the file is in.
    function VghLantern__DocumentState__BindLateLoadEvent() {
        if (VghLantern__DocumentState__IsEventBound) return;
        VghLantern__DocumentState__IsEventBound  =  true;

        window.addEventListener('VghLantern__UserMenuConfigLoaded', function() {
            if (!VghLantern__DocumentState__IsInitialised) return;

            VghLantern__DocumentState__IsInitialised  =  false;
            VghLantern__DocumentState__EnsureInitialised();

            var StateManager  =  window.VghLantern__AppCore__StateManager;
            var PageRenderer  =  window.VghLantern__DocPreview__PageRenderer;
            if (!StateManager || !PageRenderer) return;

            var state  =  StateManager.VghLantern__StateManager__GetState();
            if (state && state.currentMode === 'DocumentPreview') {
                PageRenderer.VghLantern__DocPreview__PageRenderer__Render();
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - View State
// -----------------------------------------------------------------------------

    // FUNCTION | Get a Snapshot of the Current View State
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__GetViewState() {
        VghLantern__DocumentState__EnsureInitialised();
        return Object.assign({}, VghLantern__DocumentState__ViewState);
    }
    // ------------------------------------------------------------


    // FUNCTION | Patch One or More View State Toggles
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__SetViewStatePartial(patch) {
        VghLantern__DocumentState__EnsureInitialised();
        patch  =  patch || {};

        var applied  =  {};
        var i, key;

        for (i = 0; i < ALL_TOGGLE_KEYS.length; i++) {
            key  =  ALL_TOGGLE_KEYS[i];
            if (Object.prototype.hasOwnProperty.call(patch, key)) {
                VghLantern__DocumentState__ViewState[key]  =  !!patch[key];
                applied[key]  =  VghLantern__DocumentState__ViewState[key];
            }
        }

        var MenuDataHandler  =  window.VghLantern__DocPreview__MenuDataHandler;
        if (MenuDataHandler && Object.keys(applied).length) {
            MenuDataHandler.VghLantern__DocPreview__MenuDataHandler__QueuePersistDocPreviewViewPatch(applied);
        }

        return VghLantern__DocPreview__DocumentState__GetViewState();
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Drawing Page Should Be Included
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__IncludesDrawingPage() {
        return !!VghLantern__DocPreview__DocumentState__GetViewState().ShowDrawingSheet;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Welcome Letter Page Should Be Included
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__IncludesWelcomeLetter() {
        return !!VghLantern__DocPreview__DocumentState__GetViewState().ShowWelcomeLetter;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Project Summary Page Should Be Included
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__IncludesProjectSummary() {
        return !!VghLantern__DocPreview__DocumentState__GetViewState().ShowProjectSummary;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Per-Lantern Drawing Notes Should Be Included
    // ------------------------------------------------------------
    // The switch for the SET of them. Whether any given lantern has one is answered by
    // whether that lantern has notes written against it, which is a content question
    // rather than a preference.
    function VghLantern__DocPreview__DocumentState__IncludesDrawingNotes() {
        return !!VghLantern__DocPreview__DocumentState__GetViewState().ShowDrawingNotes;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the General Drawing Terms Should Be Included
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__IncludesDrawingTermsPages() {
        return !!VghLantern__DocPreview__DocumentState__GetViewState().ShowDrawingTermsPages;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Terms Pages Should Be Included
    // ------------------------------------------------------------
    // The page-level switch only. Whether any terms SURVIVE that switch is the terms
    // document model's answer, because which sections are on is a project decision
    // rather than a per-user preference.
    function VghLantern__DocPreview__DocumentState__IncludesTermsPages() {
        return !!VghLantern__DocPreview__DocumentState__GetViewState().ShowTermsPages;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether Any Specification Content Is Included
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__IncludesSpecificationPage() {
        var state  =  VghLantern__DocPreview__DocumentState__GetViewState();
        var i;

        for (i = 0; i < DOCUMENT_KEYS.length; i++) {
            if (state[DOCUMENT_KEYS[i]]) return true;
        }

        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Page Geometry
// -----------------------------------------------------------------------------

    // FUNCTION | Set the Active Paper Size
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__SetPaperSize(sizeKey) {
        VghLantern__DocumentState__EnsureInitialised();

        var sizes  =  VghLantern__DocumentState__PageConfig().PaperSizesMm || FALLBACK_SIZES_MM;
        if (!sizes[sizeKey]) {
            console.warn('[VghLantern__DocPreview__DocumentState] Unknown paper size "' + sizeKey + '".');
            return VghLantern__DocumentState__PaperSize;
        }

        VghLantern__DocumentState__PaperSize  =  sizeKey;
        return VghLantern__DocumentState__PaperSize;
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe the Specification Page Geometry in Paper Millimetres
    // ------------------------------------------------------------
    // This describes the document pages only. The drawing sheet is not sized here:
    // it arrives from the Drawing Editor already solved onto its own paper, which is
    // what lets one exported file mix an A4 portrait schedule with an A1 landscape
    // drawing.
    function VghLantern__DocPreview__DocumentState__DescribePage() {
        VghLantern__DocumentState__EnsureInitialised();

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pageCfg  =  VghLantern__DocumentState__PageConfig();
        var PAGE_LABEL =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Page';
        var sizes    =  pageCfg.PaperSizesMm || FALLBACK_SIZES_MM;
        var size     =  sizes[VghLantern__DocumentState__PaperSize] || FALLBACK_SIZES_MM.A4;

        var orientation  =  VghLantern__DocumentState__Orientation;
        var isLandscape  =  (orientation === 'landscape');

        var widthMm   =  isLandscape ? size.HeightMm : size.WidthMm;
        var heightMm  =  isLandscape ? size.WidthMm  : size.HeightMm;
        var marginMm  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pageCfg, 'MarginMm', PAGE_LABEL);
        var pxPerMm   =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pageCfg, 'ScreenPixelsPerMm', PAGE_LABEL);

        return {
            PaperSize    : VghLantern__DocumentState__PaperSize,
            Orientation  : orientation,
            WidthMm      : widthMm,
            HeightMm     : heightMm,
            MarginMm     : marginMm,
            BodyWidthMm  : widthMm  - (marginMm * 2),
            BodyHeightMm : heightMm - (marginMm * 2),
            PxPerMm      : pxPerMm
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Current Project's Lantern Schedule
    // ------------------------------------------------------------
    function VghLantern__DocumentState__Lanterns() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return [];

        var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
        return (project && Array.isArray(project[PROJECT_LANTERNS])) ? project[PROJECT_LANTERNS] : [];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Append One Lantern's Run of Pages to a Plan
    // ------------------------------------------------------------
    // The per-lantern run, in PerLanternOrder. Each entry carries the lantern index it
    // was emitted for, which is what every builder downstream uses to fetch the right
    // baked sheet, the right takeoff and the right notes. Nothing downstream infers a
    // lantern from a page's position in the plan.
    //
    // A lantern with no drawing notes emits no notes page. That is a content question,
    // not a preference: the page exists because something was written on it.
    function VghLantern__DocumentState__PushLanternPages(plan, lantern, lanternIndex, viewState) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var TermsModel    =  window.VghLantern__Terms__DocumentModel;
        var pageCfg       =  VghLantern__DocumentState__PageConfig();

        var order  =  ConfigLoader.VghLantern__ConfigLoader__RequireArray(
            pageCfg, 'PerLanternOrder', 'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Page');

        var hasNotes  =  !!(TermsModel &&
            TermsModel.VghLantern__Terms__DocumentModel__LanternNoteTexts(lantern).length);

        var includes  =  {};
        includes[KIND_LANTERN_DRAWING]  =  function() { return !!viewState.ShowDrawingSheet; };
        includes[KIND_LANTERN_NOTES]    =  function() { return !!viewState.ShowDrawingNotes && hasNotes; };
        includes[KIND_LANTERN_SPEC]     =  function() {
            return VghLantern__DocPreview__DocumentState__IncludesSpecificationPage();
        };

        var i, kind;

        for (i = 0; i < order.length; i++) {
            kind  =  order[i];

            if (!includes[kind]) {
                console.warn('[VghLantern__DocPreview__DocumentState] Unknown page kind "' + kind +
                    '" in PerLanternOrder. Known kinds are: ' + Object.keys(includes).join(', ') + '.');
                continue;
            }

            if (includes[kind]()) plan.push({ Kind : kind, LanternIndex : lanternIndex });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Ordered Page Plan for the Whole Document
    // ------------------------------------------------------------
    // The single description of what the issued pack contains and in what order, read
    // by the on-screen preview and the PDF exporter alike so the two cannot diverge.
    //
    // Returns entries of { Kind, LanternIndex }, where LanternIndex is null for a page
    // that describes the job rather than a lantern. Order comes from
    // Config__Page.PageOrder, and an unknown kind in that array is skipped with a
    // warning rather than silently producing nothing.
    function VghLantern__DocPreview__DocumentState__BuildPagePlan() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pageCfg  =  VghLantern__DocumentState__PageConfig();
        var order    =  ConfigLoader.VghLantern__ConfigLoader__RequireArray(
            pageCfg, 'PageOrder', 'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Page');

        var viewState  =  VghLantern__DocPreview__DocumentState__GetViewState();
        var lanterns   =  VghLantern__DocumentState__Lanterns();

        var includes  =  {};
        includes[KIND_WELCOME_LETTER]   =  VghLantern__DocPreview__DocumentState__IncludesWelcomeLetter;
        includes[KIND_PROJECT_SUMMARY]  =  VghLantern__DocPreview__DocumentState__IncludesProjectSummary;
        includes[KIND_DRAWING_TERMS]    =  VghLantern__DocPreview__DocumentState__IncludesDrawingTermsPages;
        includes[KIND_TERMS]            =  VghLantern__DocPreview__DocumentState__IncludesTermsPages;

        var plan  =  [];
        var i, kind, lanternIndex;

        for (i = 0; i < order.length; i++) {
            kind  =  order[i];

            // The marker, not a page: this is where the lantern schedule is walked.
            if (kind === KIND_PER_LANTERN) {
                for (lanternIndex = 0; lanternIndex < lanterns.length; lanternIndex++) {
                    VghLantern__DocumentState__PushLanternPages(plan, lanterns[lanternIndex], lanternIndex, viewState);
                }
                continue;
            }

            if (!includes[kind]) {
                console.warn('[VghLantern__DocPreview__DocumentState] Unknown page kind "' + kind +
                    '" in PageOrder. Known kinds are: ' + Object.keys(includes).join(', ') + ', ' + KIND_PER_LANTERN + '.');
                continue;
            }

            if (includes[kind]()) plan.push({ Kind : kind, LanternIndex : null });
        }

        return plan;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Caption for One Page Kind
    // ------------------------------------------------------------
    // Used by the preview to label pages in the stage. A pack running to twenty pages
    // is unnavigable without them; the printed page is unaffected, because its own
    // masthead or titleblock identifies it.
    function VghLantern__DocPreview__DocumentState__PageKindLabel(kind) {
        var labels  =  VghLantern__DocumentState__PageConfig().PageKindLabels || {};
        return labels[kind] || kind;
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boot and Public API
// -----------------------------------------------------------------------------

    // BOOT | Bind the Late Config Arrival Handler
    // ------------------------------------------------------------
    VghLantern__DocumentState__BindLateLoadEvent();
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        LETTER_KEYS                                                  : LETTER_KEYS,
        SUMMARY_KEYS                                                 : SUMMARY_KEYS,
        DRAWING_VIEW_KEYS                                            : DRAWING_VIEW_KEYS,
        DRAWING_NOTE_KEYS                                            : DRAWING_NOTE_KEYS,
        DOCUMENT_KEYS                                                : DOCUMENT_KEYS,
        DRAWING_TERMS_KEYS                                           : DRAWING_TERMS_KEYS,
        TERMS_KEYS                                                   : TERMS_KEYS,
        ALL_TOGGLE_KEYS                                              : ALL_TOGGLE_KEYS,

        KIND_WELCOME_LETTER                                          : KIND_WELCOME_LETTER,
        KIND_PROJECT_SUMMARY                                         : KIND_PROJECT_SUMMARY,
        KIND_LANTERN_DRAWING                                         : KIND_LANTERN_DRAWING,
        KIND_LANTERN_NOTES                                           : KIND_LANTERN_NOTES,
        KIND_LANTERN_SPEC                                            : KIND_LANTERN_SPEC,
        KIND_DRAWING_TERMS                                           : KIND_DRAWING_TERMS,
        KIND_TERMS                                                   : KIND_TERMS,

        VghLantern__DocPreview__DocumentState__GetViewState           : VghLantern__DocPreview__DocumentState__GetViewState,
        VghLantern__DocPreview__DocumentState__SetViewStatePartial    : VghLantern__DocPreview__DocumentState__SetViewStatePartial,
        VghLantern__DocPreview__DocumentState__IncludesDrawingPage    : VghLantern__DocPreview__DocumentState__IncludesDrawingPage,
        VghLantern__DocPreview__DocumentState__IncludesWelcomeLetter  : VghLantern__DocPreview__DocumentState__IncludesWelcomeLetter,
        VghLantern__DocPreview__DocumentState__IncludesProjectSummary : VghLantern__DocPreview__DocumentState__IncludesProjectSummary,
        VghLantern__DocPreview__DocumentState__IncludesDrawingNotes   : VghLantern__DocPreview__DocumentState__IncludesDrawingNotes,
        VghLantern__DocPreview__DocumentState__IncludesDrawingTermsPages : VghLantern__DocPreview__DocumentState__IncludesDrawingTermsPages,
        VghLantern__DocPreview__DocumentState__IncludesTermsPages     : VghLantern__DocPreview__DocumentState__IncludesTermsPages,
        VghLantern__DocPreview__DocumentState__IncludesSpecificationPage : VghLantern__DocPreview__DocumentState__IncludesSpecificationPage,
        VghLantern__DocPreview__DocumentState__BuildPagePlan          : VghLantern__DocPreview__DocumentState__BuildPagePlan,
        VghLantern__DocPreview__DocumentState__PageKindLabel          : VghLantern__DocPreview__DocumentState__PageKindLabel,
        VghLantern__DocPreview__DocumentState__SetPaperSize           : VghLantern__DocPreview__DocumentState__SetPaperSize,
        VghLantern__DocPreview__DocumentState__DescribePage           : VghLantern__DocPreview__DocumentState__DescribePage
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__DocumentState  =  VghLantern__DocPreview__DocumentState;
