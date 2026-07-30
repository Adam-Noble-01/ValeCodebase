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
    const DRAWING_VIEW_KEYS  =  ['ShowPlanView', 'ShowFrontElevation', 'ShowSideElevation', 'Show3dView'];
    const DOCUMENT_KEYS      =  ['ShowTakeoffSchedule', 'ShowComponentSchedule', 'ShowJobNotes'];
    const ALL_TOGGLE_KEYS    =  DRAWING_VIEW_KEYS.concat(DOCUMENT_KEYS);

    // Maps a view-state toggle onto the Drawing Editor slot key it controls, so the
    // preview can filter the sheet without knowing about toggle names. These keys
    // must match VghLantern__DrawingEditor__Config__ViewSlots exactly.
    const TOGGLE_TO_SLOT_KEY  =  {
        ShowPlanView       : 'plan',
        ShowFrontElevation : 'frontElevation',
        ShowSideElevation  : 'sideElevation',
        Show3dView         : 'threeDimensional'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Defaults
    // ------------------------------------------------------------
    const FALLBACK_PAPER_SIZE   =  'A4';
    const FALLBACK_ORIENTATION  =  'portrait';
    const FALLBACK_MARGIN_MM    =  12;
    const FALLBACK_PX_PER_MM    =  3.2;
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


    // HELPER FUNCTION | Coerce a Value to Boolean with a Fallback
    // ------------------------------------------------------------
    function VghLantern__DocumentState__ToBool(value, fallbackValue) {
        if (typeof value === 'boolean') return value;
        if (value === 'true')  return true;
        if (value === 'false') return false;
        return !!fallbackValue;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View State Resolution
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Seed View State from Config Defaults
    // ------------------------------------------------------------
    function VghLantern__DocumentState__SeedFromConfig() {
        var viewCfg  =  VghLantern__DocumentState__ViewConfig();
        var state    =  {};
        var i, key;

        for (i = 0; i < ALL_TOGGLE_KEYS.length; i++) {
            key  =  ALL_TOGGLE_KEYS[i];
            state[key]  =  VghLantern__DocumentState__ToBool(viewCfg['Default' + key], true);
        }

        return state;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Overlay the Persisted Per-User Toggles
    // ------------------------------------------------------------
    function VghLantern__DocumentState__ApplyPersistedOverride(targetState) {
        var viewCfg  =  VghLantern__DocumentState__ViewConfig();
        if (viewCfg.PersistViewState === false) return targetState;

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

        var pageCfg  =  VghLantern__DocumentState__PageConfig();

        VghLantern__DocumentState__ViewState    =  VghLantern__DocumentState__ApplyPersistedOverride(
                                                       VghLantern__DocumentState__SeedFromConfig()
                                                   );
        VghLantern__DocumentState__PaperSize    =  pageCfg.DefaultPaperSize   || FALLBACK_PAPER_SIZE;
        VghLantern__DocumentState__Orientation  =  pageCfg.DefaultOrientation || FALLBACK_ORIENTATION;

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


    // FUNCTION | List the Drawing Slot Keys Enabled for the Drawing Page
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__ListEnabledSlotKeys() {
        var state  =  VghLantern__DocPreview__DocumentState__GetViewState();
        var keys   =  [];
        var i, toggleKey;

        for (i = 0; i < DRAWING_VIEW_KEYS.length; i++) {
            toggleKey  =  DRAWING_VIEW_KEYS[i];
            if (state[toggleKey]) keys.push(TOGGLE_TO_SLOT_KEY[toggleKey]);
        }

        return keys;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Drawing Page Should Be Included
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__IncludesDrawingPage() {
        return VghLantern__DocPreview__DocumentState__ListEnabledSlotKeys().length > 0;
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


    // FUNCTION | Describe the Page Geometry in Paper Millimetres
    // ------------------------------------------------------------
    // orientationOverride lets the drawing page force landscape without disturbing
    // the document-wide orientation used by the specification pages.
    function VghLantern__DocPreview__DocumentState__DescribePage(orientationOverride) {
        VghLantern__DocumentState__EnsureInitialised();

        var pageCfg  =  VghLantern__DocumentState__PageConfig();
        var sizes    =  pageCfg.PaperSizesMm || FALLBACK_SIZES_MM;
        var size     =  sizes[VghLantern__DocumentState__PaperSize] || FALLBACK_SIZES_MM[FALLBACK_PAPER_SIZE];

        var orientation  =  orientationOverride || VghLantern__DocumentState__Orientation;
        var isLandscape  =  (orientation === 'landscape');

        var widthMm   =  isLandscape ? size.HeightMm : size.WidthMm;
        var heightMm  =  isLandscape ? size.WidthMm  : size.HeightMm;
        var marginMm  =  (typeof pageCfg.MarginMm === 'number') ? pageCfg.MarginMm : FALLBACK_MARGIN_MM;
        var pxPerMm   =  (typeof pageCfg.ScreenPixelsPerMm === 'number') ? pageCfg.ScreenPixelsPerMm : FALLBACK_PX_PER_MM;

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


    // FUNCTION | Get the Drawing Page Orientation
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__DrawingOrientation() {
        return VghLantern__DocumentState__PageConfig().DrawingSheetOrientation || 'landscape';
    }
    // ------------------------------------------------------------


    // FUNCTION | Reset Everything to Config Defaults
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocumentState__ResetToDefaults() {
        VghLantern__DocumentState__IsInitialised  =  false;
        VghLantern__DocumentState__ViewState      =  null;
        return VghLantern__DocPreview__DocumentState__GetViewState();
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
        DRAWING_VIEW_KEYS                                            : DRAWING_VIEW_KEYS,
        DOCUMENT_KEYS                                                : DOCUMENT_KEYS,
        VghLantern__DocPreview__DocumentState__GetViewState           : VghLantern__DocPreview__DocumentState__GetViewState,
        VghLantern__DocPreview__DocumentState__SetViewStatePartial    : VghLantern__DocPreview__DocumentState__SetViewStatePartial,
        VghLantern__DocPreview__DocumentState__ListEnabledSlotKeys    : VghLantern__DocPreview__DocumentState__ListEnabledSlotKeys,
        VghLantern__DocPreview__DocumentState__IncludesDrawingPage    : VghLantern__DocPreview__DocumentState__IncludesDrawingPage,
        VghLantern__DocPreview__DocumentState__IncludesSpecificationPage : VghLantern__DocPreview__DocumentState__IncludesSpecificationPage,
        VghLantern__DocPreview__DocumentState__SetPaperSize           : VghLantern__DocPreview__DocumentState__SetPaperSize,
        VghLantern__DocPreview__DocumentState__DescribePage           : VghLantern__DocPreview__DocumentState__DescribePage,
        VghLantern__DocPreview__DocumentState__DrawingOrientation     : VghLantern__DocPreview__DocumentState__DrawingOrientation,
        VghLantern__DocPreview__DocumentState__ResetToDefaults        : VghLantern__DocPreview__DocumentState__ResetToDefaults
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__DocumentState  =  VghLantern__DocPreview__DocumentState;
