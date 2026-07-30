/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | BOOTSTRAP
   =============================================================================

   FILE       : VghLantern__Env3d__Bootstrap__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - Bootstrap
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Bridge the ESM-only 3D stack into the classic-script application
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - The ONLY module script in the application, and the only file that crosses the
     ESM / classic-script boundary.
   - Every other app module is a classic script publishing to window, following the
     ValeSpec loading model. Three.js is ESM only, so rather than compromise either
     side, the whole 3D stack lives behind this single bridge.
   - Imports the render pipeline, then publishes it as
     window.VghLantern__Env3d__RenderPipeline and fires 'vghlantern-env3d-ready'.

   ---------------------------------------------------------------------------

   HOW CONSUMERS SHOULD USE THIS:
   Module scripts are deferred, so the 3D pipeline is NOT available while classic
   scripts are still executing. Consumers must either guard defensively:

       if (window.VghLantern__Env3d__RenderPipeline) { ... }

   or await readiness:

       VghLantern__Env3d__WhenReady(function(pipeline) { ... });

   The second form is preferred for anything that must run once, such as mounting
   a 3D panel that was already open when the page loaded.

   ---------------------------------------------------------------------------

   WHY THE WINDOW GLOBAL RATHER THAN IMPORTS EVERYWHERE:
   Converting the whole application to ESM would mean rewriting every module and
   diverging from ValeSpec, which is the template staff familiarity depends on.
   One bridge file is a far smaller cost than an architecture split.

   ============================================================================= */

import * as VghLantern__Env3d__RenderPipeline from './VghLantern__Env3d__RenderPipeline__.mjs';

// =============================================================================
// REGION | 3D Environment Bootstrap
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Global Names and Ready Event
    // ------------------------------------------------------------
    const GLOBAL_PIPELINE_NAME  =  'VghLantern__Env3d__RenderPipeline';      // <-- What classic scripts look for
    const GLOBAL_READY_FLAG     =  'VghLantern__Env3d__IsReady';             // <-- Synchronous availability check
    const READY_EVENT_NAME      =  'vghlantern-env3d-ready';                 // <-- Dispatched on window once published
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Publication
// -----------------------------------------------------------------------------

    // FUNCTION | Publish the 3D Pipeline to the Window Scope
    // ------------------------------------------------------------
    function VghLantern__Env3d__Bootstrap__Publish() {
        window[GLOBAL_PIPELINE_NAME]  =  VghLantern__Env3d__RenderPipeline;
        window[GLOBAL_READY_FLAG]     =  true;

        window.dispatchEvent(new CustomEvent(READY_EVENT_NAME, {
            detail : { Pipeline : VghLantern__Env3d__RenderPipeline }
        }));

        console.log('[VghLantern Env3d] 3D render pipeline ready.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Register a Callback for When the 3D Stack Is Ready
    // ------------------------------------------------------------
    // Fires immediately if already ready, otherwise once on the ready event. This
    // is published as a plain global so classic scripts can call it directly.
    function VghLantern__Env3d__WhenReady(callback) {
        if (typeof callback !== 'function') return;

        if (window[GLOBAL_READY_FLAG] === true) {
            callback(window[GLOBAL_PIPELINE_NAME]);
            return;
        }

        window.addEventListener(READY_EVENT_NAME, function VghLantern__Env3d__Bootstrap__OnReady(ev) {
            window.removeEventListener(READY_EVENT_NAME, VghLantern__Env3d__Bootstrap__OnReady);
            callback(ev.detail.Pipeline);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boot
// -----------------------------------------------------------------------------

    // MODULE INITIALISATION | Publish Immediately on Load
    // ------------------------------------------------------------
    window.VghLantern__Env3d__WhenReady  =  VghLantern__Env3d__WhenReady;    // <-- Available before Publish, so callers can queue
    VghLantern__Env3d__Bootstrap__Publish();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
