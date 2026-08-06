/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | MENU DATA HANDLER
   =============================================================================

   FILE       : VghLantern__DocPreview__MenuDataHandler__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - MenuDataHandler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load and persist per-user Preview and Send menu preferences
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Reads and writes the per-user menu config served from 08__LocalUserData via
     GET/POST /api/user-menu-config/{slug}.
   - Load is fire-and-forget: the mode renders from config defaults immediately and
     re-renders once the user file arrives. A missing user file is a 404, which is
     the normal first-run case and not an error.
   - Writes are debounced and merged, so flicking four toggles is one POST.

   -----------------------------------------------------------------------------

   KEY CONTRACT:
   The persisted block is VghLantern__UserMenu__ModeDocumentPreview__Config and its
   toggle keys are identical to the DocPreview view-state keys. That symmetry is
   deliberate - no key translation layer means no place for the two to drift.

   ============================================================================= */

// =============================================================================
// REGION | Document Preview Menu Data Handler Module
// =============================================================================

const VghLantern__DocPreview__MenuDataHandler = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Endpoint, Config Keys and Timings
    // ------------------------------------------------------------
    const API_BASE            =  '/api/user-menu-config/';

    const PREVIEW_BLOCK_KEY   =  'VghLantern__UserMenu__ModeDocumentPreview__Config';
    const PREVIEW_FIELD_PREFIX=  'VghLantern__UserMenu__ModeDocumentPreview__Config__';
    const APP_DEFAULTS_KEY    =  'VghLantern__UserMenu__AppDefaults__Config';
    const APP_DEFAULTS_PREFIX =  'VghLantern__UserMenu__AppDefaults__Config__';

    const LOADED_EVENT_NAME   =  'VghLantern__UserMenuConfigLoaded';


    // The toggle keys shared by the view state, the persisted user file and the
    // app-level defaults block. One list, three consumers.
    // A user file written before the drawing views collapsed into one Drawing Sheet
    // switch still carries the four old keys. They are simply not read, and the one
    // key that replaced them falls back to its config default, so an old file heals
    // itself the first time the user touches a toggle.
    // Page-level switches only. The per-section terms switches are deliberately not
    // here: which terms a quotation is issued under is a property of the quotation,
    // so it lives on the project file rather than in a user's preferences.
    const TOGGLE_KEYS  =  [
        'ShowWelcomeLetter',
        'ShowProjectSummary',
        'ShowDrawingSheet',
        'ShowDrawingNotes',
        'ShowTakeoffSchedule',
        'ShowComponentSchedule',
        'ShowJobNotes',
        'ShowDrawingTermsPages',
        'ShowTermsPages'
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Cached User Config and Pending Write
    // ------------------------------------------------------------
    let VghLantern__MenuData__UserConfig    =  null;                           // <-- Whole user file as loaded from disk
    let VghLantern__MenuData__IsLoaded      =  false;
    let VghLantern__MenuData__LoadPromise   =  null;                           // <-- Guards against parallel loads
    let VghLantern__MenuData__PendingPatch  =  null;                           // <-- Merged patch awaiting the debounce
    let VghLantern__MenuData__WriteTimerId  =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Merged App Config
    // ------------------------------------------------------------
    function VghLantern__MenuData__AppConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader || !ConfigLoader.VghLantern__ConfigLoader__GetMergedConfig) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetMergedConfig() || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Active User Slug
    // ------------------------------------------------------------
    function VghLantern__MenuData__ResolveUserSlug() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var defaults      =  VghLantern__MenuData__AppConfig()[APP_DEFAULTS_KEY] || {};
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            defaults, APP_DEFAULTS_PREFIX + 'SourceUserSlug',
            'VghLantern__AppConfig__Main__.json -> VghLantern__UserMenu__AppDefaults__Config'
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Save Debounce Interval
    // ------------------------------------------------------------
    function VghLantern__MenuData__ResolveDebounceMs() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var meta          =  VghLantern__MenuData__AppConfig()['VghLantern__UserMenu__Meta__Config'] || {};
        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            meta, 'VghLantern__UserMenu__Meta__Config__SaveDebounceMs',
            'VghLantern__AppData__UserMenuConfig__Defaults__.json -> VghLantern__UserMenu__Meta__Config'
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load the User Menu Config Once
    // ------------------------------------------------------------
    // Resolves either way. A 404 means this user has never saved preferences, which
    // is the expected first run - the caller falls back to config defaults.
    function VghLantern__DocPreview__MenuDataHandler__EnsureLoaded() {
        if (VghLantern__MenuData__LoadPromise) return VghLantern__MenuData__LoadPromise;

        var slug  =  VghLantern__MenuData__ResolveUserSlug();

        VghLantern__MenuData__LoadPromise  =  (async function() {
            try {
                var response  =  await fetch(API_BASE + encodeURIComponent(slug));
                if (!response.ok) {
                    VghLantern__MenuData__IsLoaded  =  true;                   // <-- Loaded, just empty
                    return null;
                }

                var payload  =  await response.json();
                VghLantern__MenuData__UserConfig  =  (payload && payload.data) ? payload.data : null;
                VghLantern__MenuData__IsLoaded    =  true;

                window.dispatchEvent(new CustomEvent(LOADED_EVENT_NAME, { detail: { userSlug: slug } }));
                return VghLantern__MenuData__UserConfig;

            } catch (e) {
                // The server being down must not stop the preview rendering.
                console.warn('[VghLantern__DocPreview__MenuDataHandler] User menu config unavailable:', e.message);
                VghLantern__MenuData__IsLoaded  =  true;
                return null;
            }
        })();

        return VghLantern__MenuData__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Load Attempt Has Completed
    // ------------------------------------------------------------
    function VghLantern__DocPreview__MenuDataHandler__IsDataLoaded() {
        return VghLantern__MenuData__IsLoaded;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Persisted View State Override
    // ------------------------------------------------------------
    // Returns only the toggle keys actually present in the user file, so a partial
    // file overrides only what it specifies and config defaults cover the rest.
    function VghLantern__DocPreview__MenuDataHandler__GetDocPreviewViewStateOverride() {
        if (!VghLantern__MenuData__UserConfig) return null;

        var block  =  VghLantern__MenuData__UserConfig[PREVIEW_BLOCK_KEY];
        if (!block) return null;
        if (block[PREVIEW_FIELD_PREFIX + 'OverrideEnabled'] === false) return null;
        if (block[PREVIEW_FIELD_PREFIX + 'PersistViewState'] === false) return null;

        var override  =  {};
        var found     =  false;
        var i, fieldKey;

        for (i = 0; i < TOGGLE_KEYS.length; i++) {
            fieldKey  =  PREVIEW_FIELD_PREFIX + TOGGLE_KEYS[i];
            if (typeof block[fieldKey] === 'boolean') {
                override[TOGGLE_KEYS[i]]  =  block[fieldKey];
                found  =  true;
            }
        }

        return found ? override : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Persistence
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Merge a Patch Into the Cached User Config
    // ------------------------------------------------------------
    function VghLantern__MenuData__ApplyPatchToCache(patch) {
        if (!VghLantern__MenuData__UserConfig) VghLantern__MenuData__UserConfig  =  {};
        if (!VghLantern__MenuData__UserConfig[PREVIEW_BLOCK_KEY]) VghLantern__MenuData__UserConfig[PREVIEW_BLOCK_KEY]  =  {};

        var block  =  VghLantern__MenuData__UserConfig[PREVIEW_BLOCK_KEY];
        var i;

        for (i = 0; i < TOGGLE_KEYS.length; i++) {
            if (typeof patch[TOGGLE_KEYS[i]] === 'boolean') {
                block[PREVIEW_FIELD_PREFIX + TOGGLE_KEYS[i]]  =  patch[TOGGLE_KEYS[i]];
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | POST the Cached User Config to the Server
    // ------------------------------------------------------------
    async function VghLantern__MenuData__WriteToServer() {
        var slug  =  VghLantern__MenuData__ResolveUserSlug();

        try {
            var response  =  await fetch(API_BASE + encodeURIComponent(slug), {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(VghLantern__MenuData__UserConfig)
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);

        } catch (e) {
            // Preferences are a convenience, not data. Log and carry on.
            console.warn('[VghLantern__DocPreview__MenuDataHandler] Failed to persist menu preferences:', e.message);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Queue a Debounced View State Patch
    // ------------------------------------------------------------
    function VghLantern__DocPreview__MenuDataHandler__QueuePersistDocPreviewViewPatch(patch) {
        if (!patch) return;

        VghLantern__MenuData__PendingPatch  =  Object.assign({}, VghLantern__MenuData__PendingPatch || {}, patch);

        if (VghLantern__MenuData__WriteTimerId !== null) clearTimeout(VghLantern__MenuData__WriteTimerId);

        VghLantern__MenuData__WriteTimerId  =  setTimeout(function() {
            VghLantern__MenuData__WriteTimerId  =  null;
            var pending  =  VghLantern__MenuData__PendingPatch;
            VghLantern__MenuData__PendingPatch  =  null;

            if (!pending) return;
            VghLantern__MenuData__ApplyPatchToCache(pending);
            void VghLantern__MenuData__WriteToServer();
        }, VghLantern__MenuData__ResolveDebounceMs());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DocPreview__MenuDataHandler__EnsureLoaded                       : VghLantern__DocPreview__MenuDataHandler__EnsureLoaded,
        VghLantern__DocPreview__MenuDataHandler__IsDataLoaded                       : VghLantern__DocPreview__MenuDataHandler__IsDataLoaded,
        VghLantern__DocPreview__MenuDataHandler__GetDocPreviewViewStateOverride     : VghLantern__DocPreview__MenuDataHandler__GetDocPreviewViewStateOverride,
        VghLantern__DocPreview__MenuDataHandler__QueuePersistDocPreviewViewPatch    : VghLantern__DocPreview__MenuDataHandler__QueuePersistDocPreviewViewPatch
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__MenuDataHandler  =  VghLantern__DocPreview__MenuDataHandler;
