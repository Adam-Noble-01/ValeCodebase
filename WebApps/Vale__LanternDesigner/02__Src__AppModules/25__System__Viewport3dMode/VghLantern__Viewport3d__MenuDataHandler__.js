/* =============================================================================
   VGHLANTERN - DEDICATED 3D VIEWPORT MODE | MENU DATA HANDLER
   =============================================================================

   FILE       : VghLantern__Viewport3d__MenuDataHandler__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Viewport3d - MenuDataHandler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load and persist the 3D View tools menu position and section state
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - Reads and writes the per-user menu config served from 08__LocalUserData via
     GET/POST /api/user-menu-config/{slug}, exactly as the Preview and Send menu
     does, but against the ModeViewport3d block.
   - Load is fire-and-forget: the menu paints from config defaults immediately and
     re-paints once the user file arrives. A missing user file is a 404, which is
     the normal first-run case and not an error.
   - Writes are debounced and merged, so dragging the menu across the viewport is
     one POST rather than one per frame.

   -----------------------------------------------------------------------------

   WHY EVERY WRITE RE-READS THE FILE FIRST

   One file holds the preferences for every mode, and the Flask endpoint REPLACES
   it with whatever is posted. Two modes each holding their own copy from load time
   would each post a file missing the other's later edits, and the second save of a
   session would silently undo the first. So a write here fetches the file as it
   stands, merges only this mode's block into it, and posts that. A mode can then
   only ever overwrite its own preferences.

   ============================================================================= */

// =============================================================================
// REGION | 3D Viewport Menu Data Handler Module
// =============================================================================

const VghLantern__Viewport3d__MenuDataHandler = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Endpoint and Config Keys
    // ------------------------------------------------------------
    const API_BASE             =  '/api/user-menu-config/';

    const MODE_BLOCK_KEY       =  'VghLantern__UserMenu__ModeViewport3d__Config';
    const MODE_FIELD_PREFIX    =  'VghLantern__UserMenu__ModeViewport3d__Config__';
    const APP_DEFAULTS_KEY     =  'VghLantern__UserMenu__AppDefaults__Config';
    const APP_DEFAULTS_PREFIX  =  'VghLantern__UserMenu__AppDefaults__Config__';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Persisted Field Names
    // ------------------------------------------------------------
    // Patch keys are the config field names with the prefix stripped, so there is
    // no translation table between what the menu reports and what lands on disk.
    const POSITION_KEYS  =  ['MenuPositionX', 'MenuPositionY'];

    const SECTION_KEYS   =  [
        'MenuSectionDisplayOpen',
        'MenuSectionCameraOpen',
        'MenuSectionCrossSectionOpen',
        'MenuSectionLanternOpen'
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Cached User Config and Pending Write
    // ------------------------------------------------------------
    let VghLantern__Viewport3dMenuData__UserBlock    =  null;                 // <-- This mode's block as loaded from disk
    let VghLantern__Viewport3dMenuData__IsLoaded     =  false;
    let VghLantern__Viewport3dMenuData__LoadPromise  =  null;                 // <-- Guards against parallel loads
    let VghLantern__Viewport3dMenuData__Pending      =  null;                 // <-- Merged patch awaiting the debounce
    let VghLantern__Viewport3dMenuData__TimerId      =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Merged App Config
    // ------------------------------------------------------------
    function VghLantern__Viewport3dMenuData__AppConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader || !ConfigLoader.VghLantern__ConfigLoader__GetMergedConfig) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetMergedConfig() || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Active User Slug
    // ------------------------------------------------------------
    function VghLantern__Viewport3dMenuData__ResolveUserSlug() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var defaults      =  VghLantern__Viewport3dMenuData__AppConfig()[APP_DEFAULTS_KEY] || {};
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            defaults, APP_DEFAULTS_PREFIX + 'SourceUserSlug',
            'VghLantern__AppConfig__Main__.json -> VghLantern__UserMenu__AppDefaults__Config'
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Save Debounce Interval
    // ------------------------------------------------------------
    function VghLantern__Viewport3dMenuData__ResolveDebounceMs() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var meta          =  VghLantern__Viewport3dMenuData__AppConfig()['VghLantern__UserMenu__Meta__Config'] || {};
        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            meta, 'VghLantern__UserMenu__Meta__Config__SaveDebounceMs',
            'VghLantern__AppData__UserMenuConfig__Defaults__.json -> VghLantern__UserMenu__Meta__Config'
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch the Whole User File as It Stands on Disk
    // ------------------------------------------------------------
    // Returns an empty object rather than null on a 404 or a dead server, so the
    // caller can merge into it and post a first file for a new user.
    async function VghLantern__Viewport3dMenuData__FetchUserFile(slug) {
        try {
            var response  =  await fetch(API_BASE + encodeURIComponent(slug));
            if (!response.ok) return {};                                       // <-- 404 is the normal first run

            var payload  =  await response.json();
            return (payload && payload.data) ? payload.data : {};

        } catch (e) {
            return {};
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load This Mode's Persisted Menu Block Once
    // ------------------------------------------------------------
    // Resolves either way. The 3D view must open whether or not the preferences
    // server is there, so a failure here is a shrug and a set of defaults.
    function VghLantern__Viewport3d__MenuDataHandler__EnsureLoaded() {
        if (VghLantern__Viewport3dMenuData__LoadPromise) return VghLantern__Viewport3dMenuData__LoadPromise;

        var slug  =  VghLantern__Viewport3dMenuData__ResolveUserSlug();

        VghLantern__Viewport3dMenuData__LoadPromise  =  (async function() {
            var userFile  =  await VghLantern__Viewport3dMenuData__FetchUserFile(slug);

            VghLantern__Viewport3dMenuData__UserBlock  =  userFile[MODE_BLOCK_KEY] || null;
            VghLantern__Viewport3dMenuData__IsLoaded   =  true;
            return VghLantern__Viewport3dMenuData__UserBlock;
        })();

        return VghLantern__Viewport3dMenuData__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Load Attempt Has Completed
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__MenuDataHandler__IsDataLoaded() {
        return VghLantern__Viewport3dMenuData__IsLoaded;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Menu Block Into a Menu State
    // ------------------------------------------------------------
    // Reports only the fields the block actually carries, so a partial block
    // states only what it knows and the caller keeps its existing value for the
    // rest. The two Persist switches are reported alongside, because a user who has
    // turned one off wants the menu to open where the config says every time.
    function VghLantern__Viewport3dMenuData__ReadBlock(block) {
        if (!block) return null;

        var state  =  {
            persistMenuPosition : block[MODE_FIELD_PREFIX + 'PersistMenuPosition']     !== false,
            persistSections     : block[MODE_FIELD_PREFIX + 'PersistMenuSectionState'] !== false
        };

        var i, fieldKey;

        for (i = 0; i < POSITION_KEYS.length; i++) {
            fieldKey  =  MODE_FIELD_PREFIX + POSITION_KEYS[i];
            if (typeof block[fieldKey] === 'number') state[POSITION_KEYS[i]]  =  block[fieldKey];
        }

        for (i = 0; i < SECTION_KEYS.length; i++) {
            fieldKey  =  MODE_FIELD_PREFIX + SECTION_KEYS[i];
            if (typeof block[fieldKey] === 'boolean') state[SECTION_KEYS[i]]  =  block[fieldKey];
        }

        return state;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Menu State the App Config Ships As Its Default
    // ------------------------------------------------------------
    // Read from the merged config rather than restated in the menu module, so which
    // sections a first run opens with is a JSON edit and not a code edit.
    function VghLantern__Viewport3d__MenuDataHandler__GetMenuStateDefaults() {
        return VghLantern__Viewport3dMenuData__ReadBlock(
            VghLantern__Viewport3dMenuData__AppConfig()[MODE_BLOCK_KEY] || null);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Persisted Menu State Override
    // ------------------------------------------------------------
    // Applied over the config defaults, so a user file written before a field
    // existed leaves that field on its configured value rather than on nothing.
    function VghLantern__Viewport3d__MenuDataHandler__GetMenuStateOverride() {
        var block  =  VghLantern__Viewport3dMenuData__UserBlock;
        if (!block) return null;
        if (block[MODE_FIELD_PREFIX + 'OverrideEnabled'] === false) return null;

        return VghLantern__Viewport3dMenuData__ReadBlock(block);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Persistence
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Merge a Patch Into a Menu Block
    // ------------------------------------------------------------
    // Position accepts null, which is how a menu returned to its docked corner
    // clears a stored position rather than pinning itself to the old coordinates.
    function VghLantern__Viewport3dMenuData__MergePatch(block, patch) {
        var i, patchKey;

        for (i = 0; i < POSITION_KEYS.length; i++) {
            patchKey  =  POSITION_KEYS[i];
            if (patchKey in patch) {
                block[MODE_FIELD_PREFIX + patchKey]  =  (typeof patch[patchKey] === 'number')
                    ? Math.round(patch[patchKey])
                    : null;
            }
        }

        for (i = 0; i < SECTION_KEYS.length; i++) {
            patchKey  =  SECTION_KEYS[i];
            if (typeof patch[patchKey] === 'boolean') {
                block[MODE_FIELD_PREFIX + patchKey]  =  patch[patchKey];
            }
        }

        return block;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Read the File, Merge This Mode's Block, Write It Back
    // ------------------------------------------------------------
    // See WHY EVERY WRITE RE-READS THE FILE FIRST in the header. The local cache is
    // refreshed from the merged block too, so a reload within the session reflects
    // what was actually saved.
    async function VghLantern__Viewport3dMenuData__WriteToServer(patch) {
        var slug  =  VghLantern__Viewport3dMenuData__ResolveUserSlug();

        try {
            var userFile  =  await VghLantern__Viewport3dMenuData__FetchUserFile(slug);
            if (!userFile[MODE_BLOCK_KEY]) userFile[MODE_BLOCK_KEY]  =  {};

            VghLantern__Viewport3dMenuData__UserBlock  =
                VghLantern__Viewport3dMenuData__MergePatch(userFile[MODE_BLOCK_KEY], patch);

            var response  =  await fetch(API_BASE + encodeURIComponent(slug), {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(userFile)
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);

        } catch (e) {
            // Preferences are a convenience, not data. Log and carry on - the web
            // demo build has no server behind this at all.
            console.warn('[VghLantern__Viewport3d__MenuDataHandler] Failed to persist menu preferences:', e.message);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Queue a Debounced Menu State Patch
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__MenuDataHandler__QueuePersistMenuPatch(patch) {
        if (!patch) return;

        VghLantern__Viewport3dMenuData__Pending  =  Object.assign({}, VghLantern__Viewport3dMenuData__Pending || {}, patch);

        if (VghLantern__Viewport3dMenuData__TimerId !== null) clearTimeout(VghLantern__Viewport3dMenuData__TimerId);

        VghLantern__Viewport3dMenuData__TimerId  =  setTimeout(function() {
            VghLantern__Viewport3dMenuData__TimerId  =  null;

            var pending  =  VghLantern__Viewport3dMenuData__Pending;
            VghLantern__Viewport3dMenuData__Pending  =  null;
            if (!pending) return;

            void VghLantern__Viewport3dMenuData__WriteToServer(pending);
        }, VghLantern__Viewport3dMenuData__ResolveDebounceMs());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Viewport3d__MenuDataHandler__EnsureLoaded            : VghLantern__Viewport3d__MenuDataHandler__EnsureLoaded,
        VghLantern__Viewport3d__MenuDataHandler__IsDataLoaded            : VghLantern__Viewport3d__MenuDataHandler__IsDataLoaded,
        VghLantern__Viewport3d__MenuDataHandler__GetMenuStateDefaults    : VghLantern__Viewport3d__MenuDataHandler__GetMenuStateDefaults,
        VghLantern__Viewport3d__MenuDataHandler__GetMenuStateOverride    : VghLantern__Viewport3d__MenuDataHandler__GetMenuStateOverride,
        VghLantern__Viewport3d__MenuDataHandler__QueuePersistMenuPatch   : VghLantern__Viewport3d__MenuDataHandler__QueuePersistMenuPatch
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Viewport3d__MenuDataHandler  =  VghLantern__Viewport3d__MenuDataHandler;
