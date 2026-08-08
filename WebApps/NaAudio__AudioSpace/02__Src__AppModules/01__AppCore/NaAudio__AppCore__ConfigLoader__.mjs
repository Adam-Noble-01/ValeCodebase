/* =============================================================================
   NAAUDIO - APP CORE | CONFIG LOADER
   =============================================================================

   FILE       : NaAudio__AppCore__ConfigLoader__.mjs
   NAMESPACE  : NaAudio
   MODULE     : AppCore - ConfigLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Fetch, validate and register every config document before boot
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Loads NaAudio__AppConfig__Main__.json first, reads its ConfigRegistry, then
     fetches every registered document in parallel and hands each one to
     NaAudio__AppUtils__ConfigAccess.
   - Also loads the generated library indexes named in the LibraryRegistry, which
     is how the sample bank learns what exists without a directory listing.
   - Fails hard and early. A required document that will not load aborts the boot
     with a message naming the file and the HTTP status, because the alternative -
     a 3D scene that mounts with half its numbers missing - produces symptoms that
     look like graphics bugs and cost hours.

   ---------------------------------------------------------------------------

   WHY THE APPLICATION ROOT IS DERIVED AND NOT ASSUMED

   The same tree is served three ways: from the localhost Python server at the
   project root, from GitHub Pages under a repository sub-path, and from the file
   system during quick checks. A leading-slash path works in exactly one of those.

   The root is therefore derived once, from this module's own URL - it is at a
   known depth below the application root - and every fetch is resolved against
   it. That keeps the app portable without a build step rewriting paths.

   ============================================================================= */

import {
    NaAudio__ConfigAccess__Register
} from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';

import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from './NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Config Loading
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Paths and Registry Keys
    // ------------------------------------------------------------
    const MAIN_CONFIG_PATH   =  '02__Src__AppModules/02__AppData/NaAudio__AppConfig__Main__.json';
    const MAIN_ROOT_KEY      =  'NaAudio__AppConfig__Main';

    const MODULE_DEPTH_BELOW_ROOT  =  3;                                     // <-- 02__Src__AppModules / 01__AppCore / this file
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Section Prefix Per Registered Document
    // ------------------------------------------------------------
    // Each config document names its subsections with a shared prefix. The loader
    // has to tell ConfigAccess what that prefix is, and deriving it from the root
    // key by appending '__' is a convention worth stating rather than inferring.
    const SECTION_PREFIX_SUFFIX  =  '__';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Resolved Application Root and Loaded Documents
    // ------------------------------------------------------------
    let applicationRootUrl  =  null;                                         // <-- Absolute URL ending in a slash
    let mainConfig          =  null;                                         // <-- The NaAudio__AppConfig__Main block
    const libraryIndexes    =  new Map();                                    // <-- Registry name -> { Index, LibraryRootUrl }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Path Resolution
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Application Root URL From This Module's Location
    // ------------------------------------------------------------
    export function NaAudio__ConfigLoader__ApplicationRoot() {
        if (applicationRootUrl) return applicationRootUrl;

        const here     =  new URL(import.meta.url);
        const segments =  here.pathname.split('/');
        segments.splice(segments.length - MODULE_DEPTH_BELOW_ROOT, MODULE_DEPTH_BELOW_ROOT);

        applicationRootUrl  =  new URL(segments.join('/') + '/', here.origin).href;
        return applicationRootUrl;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve an Application-Relative Path to an Absolute URL
    // ------------------------------------------------------------
    export function NaAudio__ConfigLoader__ResolvePath(relativePath) {
        return new URL(relativePath, NaAudio__ConfigLoader__ApplicationRoot()).href;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fetch Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch and Parse One JSON Document
    // ------------------------------------------------------------
    // cache: 'no-store' on every config read. The service worker treats config as
    // network-first, and without no-store on the network leg the browser's own HTTP
    // cache can quietly satisfy it with a stale copy - which presents as a change
    // to a JSON file having no effect, the single most confusing failure available.
    async function NaAudio__ConfigLoader__FetchJson(relativePath) {
        const url  =  NaAudio__ConfigLoader__ResolvePath(relativePath);

        let response;
        try {
            response  =  await fetch(url, { cache: 'no-store' });
        } catch (error) {
            throw new Error('[NaAudio ConfigLoader] Network failure fetching "' + relativePath + '": ' + error.message);
        }

        if (!response.ok) {
            throw new Error('[NaAudio ConfigLoader] HTTP ' + response.status + ' fetching "' + relativePath + '". Is the app being served over HTTP rather than opened from the file system?');
        }

        try {
            return await response.json();
        } catch (error) {
            throw new Error('[NaAudio ConfigLoader] "' + relativePath + '" is not valid JSON: ' + error.message);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Unwrap a Document's Single Top-Level Key
    // ------------------------------------------------------------
    function NaAudio__ConfigLoader__Unwrap(document, rootKey, relativePath) {
        const root  =  document[rootKey];
        if (!root || typeof root !== 'object') {
            throw new Error('[NaAudio ConfigLoader] "' + relativePath + '" has no top-level key "' + rootKey + '".');
        }
        return root;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Load Passes
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Load the Main Application Config
    // ------------------------------------------------------------
    async function NaAudio__ConfigLoader__LoadMain() {
        const document  =  await NaAudio__ConfigLoader__FetchJson(MAIN_CONFIG_PATH);
        mainConfig      =  NaAudio__ConfigLoader__Unwrap(document, MAIN_ROOT_KEY, MAIN_CONFIG_PATH);

        NaAudio__ConfigAccess__Register('appMain', mainConfig, MAIN_ROOT_KEY + SECTION_PREFIX_SUFFIX);
        return mainConfig;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Load Every Document Named in the Config Registry
    // ------------------------------------------------------------
    async function NaAudio__ConfigLoader__LoadRegisteredConfigs() {
        const registry  =  mainConfig[MAIN_ROOT_KEY + SECTION_PREFIX_SUFFIX + 'ConfigRegistry'];
        const entries   =  Object.entries(registry).filter(([, entry]) => entry && typeof entry === 'object' && entry.Path);

        const results  =  await Promise.all(entries.map(async ([shortName, entry]) => {
            try {
                const document  =  await NaAudio__ConfigLoader__FetchJson(entry.Path);
                const root      =  NaAudio__ConfigLoader__Unwrap(document, entry.RootKey, entry.Path);
                NaAudio__ConfigAccess__Register(shortName, root, entry.RootKey + SECTION_PREFIX_SUFFIX);
                return { shortName, ok: true };
            } catch (error) {
                if (entry.Required) throw error;                               // <-- Required means required
                console.warn('[NaAudio ConfigLoader] Optional config "' + shortName + '" failed to load:', error.message);
                return { shortName, ok: false };
            }
        }));

        return results;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Load the Generated Library Indexes
    // ------------------------------------------------------------
    // Held here rather than registered with ConfigAccess: an index is DATA that
    // grows with the library, not tuning values, and it is read through the sample
    // bank rather than by arbitrary modules.
    async function NaAudio__ConfigLoader__LoadLibraryIndexes() {
        const registry  =  mainConfig[MAIN_ROOT_KEY + SECTION_PREFIX_SUFFIX + 'LibraryRegistry'];
        const entries   =  Object.entries(registry).filter(([, entry]) => entry && typeof entry === 'object' && entry.IndexPath);

        await Promise.all(entries.map(async ([name, entry]) => {
            try {
                const index  =  await NaAudio__ConfigLoader__FetchJson(entry.IndexPath);
                libraryIndexes.set(name, {
                    Index          : index,
                    RootKey        : entry.RootKey,
                    LibraryRootUrl : NaAudio__ConfigLoader__ResolvePath(entry.LibraryRoot)
                });
            } catch (error) {
                if (entry.Required) throw error;
                console.warn('[NaAudio ConfigLoader] Optional library index "' + name + '" failed to load:', error.message);
            }
        }));

        return libraryIndexes;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Entry Points
// -----------------------------------------------------------------------------

    // FUNCTION | Load Everything the Application Needs Before It Can Boot
    // ------------------------------------------------------------
    export async function NaAudio__ConfigLoader__LoadAll() {
        NaAudio__EventBus__Publish(NaAudio__Event.BootStageChanged, {
            Stage   : 'config',
            Message : 'Reading configuration'
        });

        await NaAudio__ConfigLoader__LoadMain();
        await NaAudio__ConfigLoader__LoadRegisteredConfigs();

        NaAudio__EventBus__Publish(NaAudio__Event.BootStageChanged, {
            Stage   : 'library',
            Message : 'Reading audio library catalogue'
        });

        await NaAudio__ConfigLoader__LoadLibraryIndexes();

        return {
            MainConfig     : mainConfig,
            LibraryIndexes : libraryIndexes
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Named Library Index and Its Root URL
    // ------------------------------------------------------------
    export function NaAudio__ConfigLoader__LibraryIndex(name) {
        return libraryIndexes.get(name) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Runtime Section of the Main Config
    // ------------------------------------------------------------
    export function NaAudio__ConfigLoader__Runtime() {
        if (!mainConfig) return null;
        return mainConfig[MAIN_ROOT_KEY + SECTION_PREFIX_SUFFIX + 'Runtime'];
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Meta Section of the Main Config
    // ------------------------------------------------------------
    export function NaAudio__ConfigLoader__Meta() {
        if (!mainConfig) return null;
        return mainConfig[MAIN_ROOT_KEY + SECTION_PREFIX_SUFFIX + 'Meta'];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
