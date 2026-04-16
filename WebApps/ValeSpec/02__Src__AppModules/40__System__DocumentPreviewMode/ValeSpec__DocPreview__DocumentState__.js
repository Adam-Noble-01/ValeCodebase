/* =============================================================================
   VALESPEC - DOCUMENT PREVIEW DOCUMENT STATE
   =============================================================================

   FILE       : ValeSpec__DocPreview__DocumentState__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - DocumentState
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Shared view-state and config resolver for preview + PDF parity
   CREATED    : 16-Apr-2026

   DESCRIPTION:
   - Stores current Document Preview view-state (diagram mode + section toggles)
   - Resolves defaults from DocPreview config sections in app config
   - Exposes shared style tokens used by HTML preview and PDF exporter
   - Keeps one source of truth for rendering options and style mappings

   ============================================================================= */

// =============================================================================
// REGION | Document State Module
// =============================================================================

const ValeSpec__DocPreview__DocumentState = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Diagram Mode Identifiers
    // ------------------------------------------------------------
    const DIAGRAM_MODE_SMALL  =  'small';
    const DIAGRAM_MODE_LARGE  =  'large';
    const DIAGRAM_MODE_NONE   =  'none';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback View-State Defaults
    // ------------------------------------------------------------
    const DEFAULT_VIEW_STATE  =  {
        diagramMode       : DIAGRAM_MODE_SMALL,
        showFullSchedule  : true,
        showSummary       : true,
        showJobNotes      : true
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | In-Memory View State
    // ------------------------------------------------------------
    let ValeSpec__DocumentState__ViewState      =  null;
    let ValeSpec__DocumentState__IsInitialised  =  false;
    let ValeSpec__DocumentState__IsMenuEventBound = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get App Config from StateManager
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__GetAppConfig() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return {};
        var state  =  StateManager.ValeSpec__StateManager__GetState();
        return (state && state.appConfig) ? state.appConfig : {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Named Config Section
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__GetSection(sectionName) {
        var appConfig  =  ValeSpec__DocumentState__GetAppConfig();
        return appConfig[sectionName] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalize Diagram Mode
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__NormaliseDiagramMode(rawMode) {
        var mode  =  String(rawMode || '').toLowerCase().trim();
        if (mode === DIAGRAM_MODE_LARGE) return DIAGRAM_MODE_LARGE;
        if (mode === DIAGRAM_MODE_NONE) return DIAGRAM_MODE_NONE;
        return DIAGRAM_MODE_SMALL;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Boolean with Fallback
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__ToBool(value, fallbackValue) {
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return !!fallbackValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Persisted View-State Overrides
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__ResolvePersistedViewStateOverride() {
        var MenuDataHandler  =  window.ValeSpec__DocPreview__MenuDataHandler;
        if (!MenuDataHandler) return null;
        if (!MenuDataHandler.ValeSpec__MenuDataHandler__IsDataLoaded) return null;
        if (!MenuDataHandler.ValeSpec__MenuDataHandler__IsDataLoaded()) return null;
        if (!MenuDataHandler.ValeSpec__MenuDataHandler__GetDocPreviewViewStateOverride) return null;
        return MenuDataHandler.ValeSpec__MenuDataHandler__GetDocPreviewViewStateOverride();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Persisted Overrides to View-State
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__ApplyPersistedViewStateOverride(targetViewState) {
        var persistedOverride  =  ValeSpec__DocumentState__ResolvePersistedViewStateOverride();
        if (!persistedOverride) return targetViewState;
        targetViewState.diagramMode       =  ValeSpec__DocumentState__NormaliseDiagramMode(persistedOverride.diagramMode);
        targetViewState.showFullSchedule  =  ValeSpec__DocumentState__ToBool(persistedOverride.showFullSchedule, targetViewState.showFullSchedule);
        targetViewState.showSummary       =  ValeSpec__DocumentState__ToBool(persistedOverride.showSummary, targetViewState.showSummary);
        targetViewState.showJobNotes      =  ValeSpec__DocumentState__ToBool(persistedOverride.showJobNotes, targetViewState.showJobNotes);
        return targetViewState;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Queue Persisted View-State Save
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__QueuePersistedViewStateSave() {
        var MenuDataHandler  =  window.ValeSpec__DocPreview__MenuDataHandler;
        if (!MenuDataHandler) return;
        if (!MenuDataHandler.ValeSpec__MenuDataHandler__QueuePersistDocPreviewViewPatch) return;
        MenuDataHandler.ValeSpec__MenuDataHandler__QueuePersistDocPreviewViewPatch({
            diagramMode       : ValeSpec__DocumentState__ViewState.diagramMode,
            showFullSchedule  : ValeSpec__DocumentState__ViewState.showFullSchedule,
            showSummary       : ValeSpec__DocumentState__ViewState.showSummary,
            showJobNotes      : ValeSpec__DocumentState__ViewState.showJobNotes
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Subscribe to User Menu Config Loaded Event
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__SubscribeToMenuConfigLoadEvent() {
        if (ValeSpec__DocumentState__IsMenuEventBound) return;
        ValeSpec__DocumentState__IsMenuEventBound  =  true;

        var MenuDataHandler  =  window.ValeSpec__DocPreview__MenuDataHandler;
        if (MenuDataHandler && MenuDataHandler.ValeSpec__MenuDataHandler__EnsureLoaded) {
            MenuDataHandler.ValeSpec__MenuDataHandler__EnsureLoaded();
        }

        window.addEventListener('ValeSpec__UserMenuConfigLoaded', function() {
            var wasInitialised = ValeSpec__DocumentState__IsInitialised;
            if (!wasInitialised) return;
            ValeSpec__DocumentState__IsInitialised  =  false;
            ValeSpec__DocumentState__ViewState      =  null;
            ValeSpec__DocumentState__GetViewState();

            var StateManager  =  window.ValeSpec__AppCore__StateManager;
            var PageRenderer  =  window.ValeSpec__DocPreview__PageRenderer;
            if (!StateManager || !PageRenderer) return;
            var state  =  StateManager.ValeSpec__StateManager__GetState();
            if (state && state.currentMode === 'DocumentPreview') {
                PageRenderer.ValeSpec__PageRenderer__Render();
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ensure View-State Is Initialised
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__EnsureInitialised() {
        if (ValeSpec__DocumentState__IsInitialised) return;

        var viewCfg  =  ValeSpec__DocumentState__GetSection('DocPreview__ViewState__Config');

        ValeSpec__DocumentState__ViewState  =  {
            diagramMode       : ValeSpec__DocumentState__NormaliseDiagramMode(
                                    viewCfg['DocPreview__ViewState__Config__DefaultDiagramMode']
                                 || DEFAULT_VIEW_STATE.diagramMode
                                ),
            showFullSchedule  : ValeSpec__DocumentState__ToBool(
                                    viewCfg['DocPreview__ViewState__Config__ShowFullScheduleByDefault'],
                                    DEFAULT_VIEW_STATE.showFullSchedule
                                ),
            showSummary       : ValeSpec__DocumentState__ToBool(
                                    viewCfg['DocPreview__ViewState__Config__ShowSummaryByDefault'],
                                    DEFAULT_VIEW_STATE.showSummary
                                ),
            showJobNotes      : ValeSpec__DocumentState__ToBool(
                                    viewCfg['DocPreview__ViewState__Config__ShowJobNotesByDefault'],
                                    DEFAULT_VIEW_STATE.showJobNotes
                                )
        };
        ValeSpec__DocumentState__ApplyPersistedViewStateOverride(ValeSpec__DocumentState__ViewState);

        ValeSpec__DocumentState__IsInitialised  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Shared Style Tokens
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Text Token or Fallback
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__ResolveToken(rawValue, fallbackValue) {
        var value  =  String(rawValue || '').trim();
        return value || fallbackValue;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Shared DocPreview Style Tokens
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__ResolveStyleTokens() {
        var specCfg    =  ValeSpec__DocumentState__GetSection('DocPreview__SpecTable__Config');
        var styleCfg   =  ValeSpec__DocumentState__GetSection('DocPreview__StyleTokens__Config');
        var sectionCfg =  ValeSpec__DocumentState__GetSection('DocPreview__Section__Config');

        return {
            tableHeaderBg     : ValeSpec__DocumentState__ResolveToken(
                                    specCfg['DocPreview__SpecTable__Config__HeaderBackground'],
                                    '#172b3a'
                                ),
            tableHeaderFg     : ValeSpec__DocumentState__ResolveToken(
                                    specCfg['DocPreview__SpecTable__Config__HeaderTextColor'],
                                    '#ffffff'
                                ),
            tableAltRowBg     : ValeSpec__DocumentState__ResolveToken(
                                    specCfg['DocPreview__SpecTable__Config__AltRowBackground'],
                                    '#f5f5f5'
                                ),
            warningBg         : ValeSpec__DocumentState__ResolveToken(
                                    styleCfg['DocPreview__StyleTokens__Config__WarningBackground'],
                                    'rgba(211, 47, 47, 0.07)'
                                ),
            warningBorder     : ValeSpec__DocumentState__ResolveToken(
                                    styleCfg['DocPreview__StyleTokens__Config__WarningBorder'],
                                    'rgba(211, 47, 47, 0.35)'
                                ),
            warningTitle      : ValeSpec__DocumentState__ResolveToken(
                                    styleCfg['DocPreview__StyleTokens__Config__WarningTitle'],
                                    '#b71c1c'
                                ),
            warningText       : ValeSpec__DocumentState__ResolveToken(
                                    styleCfg['DocPreview__StyleTokens__Config__WarningText'],
                                    '#c62828'
                                ),
            sectionTitle01    : ValeSpec__DocumentState__ResolveToken(
                                    sectionCfg['DocPreview__Section__Config__Section01Title'],
                                    'Section 01 | Full Ironmongery Schedule'
                                ),
            sectionTitle02    : ValeSpec__DocumentState__ResolveToken(
                                    sectionCfg['DocPreview__Section__Config__Section02Title'],
                                    'Section 02 | Ironmongery Schedule Summary'
                                ),
            sectionTitle03    : ValeSpec__DocumentState__ResolveToken(
                                    sectionCfg['DocPreview__Section__Config__Section03Title'],
                                    'Section 03 | Warnings Section'
                                ),
            sectionTitle04    : ValeSpec__DocumentState__ResolveToken(
                                    sectionCfg['DocPreview__Section__Config__Section04Title'],
                                    'Section 04 | Special Job Notes Section'
                                )
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Get Current View-State Snapshot
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__GetViewState() {
        ValeSpec__DocumentState__EnsureInitialised();
        return {
            diagramMode       : ValeSpec__DocumentState__ViewState.diagramMode,
            showFullSchedule  : ValeSpec__DocumentState__ViewState.showFullSchedule,
            showSummary       : ValeSpec__DocumentState__ViewState.showSummary,
            showJobNotes      : ValeSpec__DocumentState__ViewState.showJobNotes
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Patch View-State Values
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__SetViewStatePartial(patch) {
        ValeSpec__DocumentState__EnsureInitialised();
        patch  =  patch || {};

        if (Object.prototype.hasOwnProperty.call(patch, 'diagramMode')) {
            ValeSpec__DocumentState__ViewState.diagramMode  =  ValeSpec__DocumentState__NormaliseDiagramMode(patch.diagramMode);
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'showFullSchedule')) {
            ValeSpec__DocumentState__ViewState.showFullSchedule  =  !!patch.showFullSchedule;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'showSummary')) {
            ValeSpec__DocumentState__ViewState.showSummary  =  !!patch.showSummary;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'showJobNotes')) {
            ValeSpec__DocumentState__ViewState.showJobNotes  =  !!patch.showJobNotes;
        }

        ValeSpec__DocumentState__QueuePersistedViewStateSave();
        return ValeSpec__DocumentState__GetViewState();
    }
    // ------------------------------------------------------------


    // FUNCTION | Reset View-State to Config Defaults
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__ResetToDefaults() {
        ValeSpec__DocumentState__IsInitialised  =  false;
        ValeSpec__DocumentState__ViewState      =  null;
        return ValeSpec__DocumentState__GetViewState();
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Shared Style Tokens
    // ------------------------------------------------------------
    function ValeSpec__DocumentState__GetStyleTokens() {
        return ValeSpec__DocumentState__ResolveStyleTokens();
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        DIAGRAM_MODE_SMALL                             : DIAGRAM_MODE_SMALL,
        DIAGRAM_MODE_LARGE                             : DIAGRAM_MODE_LARGE,
        DIAGRAM_MODE_NONE                              : DIAGRAM_MODE_NONE,
        ValeSpec__DocumentState__GetViewState          : ValeSpec__DocumentState__GetViewState,
        ValeSpec__DocumentState__SetViewStatePartial   : ValeSpec__DocumentState__SetViewStatePartial,
        ValeSpec__DocumentState__ResetToDefaults       : ValeSpec__DocumentState__ResetToDefaults,
        ValeSpec__DocumentState__GetStyleTokens        : ValeSpec__DocumentState__GetStyleTokens
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Boot
// -----------------------------------------------------------------------------

    // BOOT | Bind Menu Config Load Event Subscription
    // ------------------------------------------------------------
    ValeSpec__DocumentState__SubscribeToMenuConfigLoadEvent();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__DocumentState  =  ValeSpec__DocPreview__DocumentState;
