// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - TEST ENVIRONMENT - NODE MODULE HOOKS
// =============================================================================
//
// FILE       : tests/Na__TestEnv__EditorWorker__Hooks__.mjs
// NAMESPACE  : Na__TestEnv
// MODULE     : Editor Worker Test Environment - Module Hooks
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Let Node load the worker's source exactly as wrangler bundles it
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - THE WORKER IMPORTS A JSON FILE. CloudflareHelper__PathGuards__.js imports
//   ValeVision's app config without import attributes, which esbuild (and so
//   wrangler) bundles and Node refuses. load() hands Node the file as an ES
//   module whose default export is the parsed JSON - what the bundle holds.
// - THE WORKER'S .js FILES ARE ES MODULES with no package.json saying so;
//   load() tells Node so for every file under the worker's src folder.
// - THE CONFIG IS FOUND WHERE IT IS. In the live tree the import's relative
//   path reaches WebApps/ValeVision3D/02__Src__AppModules/02__AppData; in a
//   staged copy of the worker it does not, and resolve() falls back to the
//   path the test environment found by walking up.
// - A STAGED COPY HOLDS ONLY THE CHANGED FILES. When a worker module is not
//   beside the copy (an unchanged handler or helper), resolve() reads it from
//   the live worker the test environment found (data.liveSrcUrl). Beside the
//   live worker every module is found where it is and this never happens.
// - VARIANTS. An import URL carrying ?na-variant=<name> loads the whole worker
//   again, every module and the config fresh, with the config read from the
//   file data.variants[<name>] names: how a test proves the editor-owned key
//   list itself governs the merge guard (a key added to the list passes, a key
//   taken off it is refused) with no change to the worker's code.
//
// INTEGRATION:
// - Registered by Na__TestEnv__EditorWorker__R2Bucket__.mjs (Na__TestEnv__LoadWorker)
//   with data { srcUrl, configPath, variants }.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0
// - Initial implementation for the worker 1.6.0 node tests.
//
// =============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// -----------------------------------------------------------------------------
// REGION | State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | What the Test Environment Registered
    // ------------------------------------------------------------
    const Na__Hooks__CONFIG_FILE = 'Na__AppConfig__Main.json';
    const Na__Hooks__VARIANT     = 'na-variant';
    let Na__Hooks__State         = { srcUrl : '', liveSrcUrl : '', configPath : '', variants : {} };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Variant a URL Carries, or null
    // ------------------------------------------------------------
    function na_variant_of(url) {
        try {
            return new URL(url).searchParams.get(Na__Hooks__VARIANT);
        } catch {
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A URL With the Variant Added (unchanged when there is none)
    // ------------------------------------------------------------
    function na_with_variant(url, variant) {
        if (!variant) return url;
        const next = new URL(url);
        next.searchParams.set(Na__Hooks__VARIANT, variant);
        return next.href;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A URL Without Its Query
    // ------------------------------------------------------------
    function na_plain(url) {
        const cut = url.indexOf('?');
        return cut === -1 ? url : url.slice(0, cut);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hooks
// -----------------------------------------------------------------------------

    // FUNCTION | initialize - Receive the Paths From the Test Environment
    // ------------------------------------------------------------
    export async function initialize(data) {
        Na__Hooks__State = Object.assign({ srcUrl : '', liveSrcUrl : '', configPath : '', variants : {} }, data || {});
    }
    // ------------------------------------------------------------


    // FUNCTION | resolve - The Config Wherever It Is; Variants Spread to Every Worker Module
    // ------------------------------------------------------------
    export async function resolve(specifier, context, nextResolve) {
        const variant = context.parentURL ? na_variant_of(context.parentURL) : null;

        if (specifier.endsWith(Na__Hooks__CONFIG_FILE)) {
            let url;
            try {
                url = (await nextResolve(specifier, context)).url;
            } catch {
                url = pathToFileURL(Na__Hooks__State.configPath).href;          // <-- A staged worker: the config the environment found
            }
            return { url : na_with_variant(na_plain(url), variant), shortCircuit : true };
        }

        let result;
        try {
            result = await nextResolve(specifier, context);
        } catch (error) {
            // A STAGED COPY | The module is not beside it: read the live worker's
            const parent = context.parentURL ? na_plain(context.parentURL) : '';
            const { srcUrl, liveSrcUrl } = Na__Hooks__State;
            if (!liveSrcUrl || !parent.startsWith(srcUrl) || !(specifier.startsWith('./') || specifier.startsWith('../'))) throw error;
            const wanted = new URL(specifier, parent).href;
            if (!wanted.startsWith(srcUrl)) throw error;
            const live = liveSrcUrl + wanted.slice(srcUrl.length);
            if (!existsSync(fileURLToPath(live))) throw error;
            result = { url : live, format : 'module', shortCircuit : true };
        }
        const inWorker = result.url.startsWith(Na__Hooks__State.srcUrl)
            || (Na__Hooks__State.liveSrcUrl && result.url.startsWith(Na__Hooks__State.liveSrcUrl));
        if (variant && inWorker) {
            return Object.assign({}, result, { url : na_with_variant(result.url, variant) });
        }
        return result;
    }
    // ------------------------------------------------------------


    // FUNCTION | load - JSON as a Module, the Worker's .js as ES Modules
    // ------------------------------------------------------------
    export async function load(url, context, nextLoad) {
        const plain = na_plain(url);

        if (plain.startsWith('file:') && plain.endsWith(Na__Hooks__CONFIG_FILE)) {
            const variant = na_variant_of(url);
            const path    = (variant && Na__Hooks__State.variants[variant]) ? Na__Hooks__State.variants[variant] : fileURLToPath(plain);
            return { format : 'module', source : 'export default ' + readFileSync(path, 'utf8') + ';\n', shortCircuit : true };
        }

        const inWorker = (Na__Hooks__State.srcUrl && plain.startsWith(Na__Hooks__State.srcUrl))
            || (Na__Hooks__State.liveSrcUrl && plain.startsWith(Na__Hooks__State.liveSrcUrl));
        if (inWorker && plain.endsWith('.js')) {
            return { format : 'module', source : readFileSync(fileURLToPath(plain), 'utf8'), shortCircuit : true };
        }

        return nextLoad(url, context);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
