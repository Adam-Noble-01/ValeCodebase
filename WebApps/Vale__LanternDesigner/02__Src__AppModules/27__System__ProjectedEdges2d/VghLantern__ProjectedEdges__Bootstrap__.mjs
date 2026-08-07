/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | BOOTSTRAP
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__Bootstrap__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - Bootstrap
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Attach the experiment to the 2D pipeline without editing it
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - The only file in this folder that touches anything outside it, and it does so
     by wrapping rather than by editing.
   - Env2d__RenderPipeline publishes its API as an object on window. This module
     replaces two of its function properties with wrappers that call the originals
     unchanged and then notify this module. Nothing in the 2D environment knows
     this feature exists.

   ---------------------------------------------------------------------------

   WHY WRAPPING RATHER THAN A CALL SITE

   Zero coupling in both directions. Deleting this folder and the two include lines
   that reference it - the script tag in VghLantern__App__.html and the stylesheet
   import in the CoreUi index - returns the application to exactly its previous
   behaviour, with no orphan calls left in Env2d, no unused layer in the viewport
   stack, and nothing to unpick.

   Every consumer reaches the pipeline through the published object
   (window.VghLantern__Env2d__RenderPipeline.Render), and the pipeline never calls
   Render or Dispose internally, so replacing the properties reaches every caller
   and misses none.

   THE ALTERNATIVE, should tighter coupling ever be wanted: an explicit call at the
   end of Env2d__RenderPipeline__Render, and the layer added to the Env2d
   LAYER_ORDER stack. That buys a clearer call graph at the cost of Env2d, the
   Drawing Editor toolbar and the CoreUi stylesheet each holding a reference to a
   feature none of them need to know about.

   ---------------------------------------------------------------------------

   KNOWN LIMIT OF THE FIRST COMPOSE ON A DRAWING SHEET

   The Drawing Editor serialises its sheet frames to markup immediately after
   PlaceAll returns, and the projection is still computing at that moment. The blue
   linework therefore appears on screen straight away but reaches an exported PDF
   only from the second compose onward, once the result is cached and paints
   synchronously. Left as is on purpose: making the sheet wait would put the most
   expensive operation in the application on the critical path of every redraw,
   which is the opposite of what this experiment is testing.

   ============================================================================= */

import {
    VghLantern__ProjectedEdges__ConfigAccess__Ready,
    VghLantern__ProjectedEdges__ConfigAccess__IsEnabled
} from './VghLantern__ProjectedEdges__ConfigAccess__.mjs';

import {
    VghLantern__ProjectedEdges__Pipeline__Sync,
    VghLantern__ProjectedEdges__Pipeline__Detach,
    VghLantern__ProjectedEdges__Pipeline__Show,
    VghLantern__ProjectedEdges__Pipeline__Hide,
    VghLantern__ProjectedEdges__Pipeline__Status,
    VghLantern__ProjectedEdges__Pipeline__BuildDebugApi
} from './VghLantern__ProjectedEdges__Pipeline__.mjs';

import {
    VghLantern__ProjectedEdges__ToolbarButton__Attach,
    VghLantern__ProjectedEdges__ToolbarButton__Sync,
    VghLantern__ProjectedEdges__ToolbarButton__ForceRender
} from './VghLantern__ProjectedEdges__ToolbarButton__.mjs';

// =============================================================================
// REGION | Projected Edges Bootstrap
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Attachment Targets and Guards
    // ------------------------------------------------------------
    const ENV2D_GLOBAL_NAME  =  'VghLantern__Env2d__RenderPipeline';
    const RENDER_FN_NAME     =  'VghLantern__Env2d__RenderPipeline__Render';
    const DISPOSE_FN_NAME    =  'VghLantern__Env2d__RenderPipeline__Dispose';

    const DEBUG_GLOBAL_NAME   =  'VghLantern__ProjectedEdges__Debug';
    const PUBLIC_GLOBAL_NAME  =  'VghLantern__ProjectedEdges';
    const INSTALLED_FLAG     =  '__VghLantern__ProjectedEdges__Installed';    // <-- Stamped on the Env2d object, so a double load cannot double wrap

    const ATTACH_RETRY_MS    =  50;                                           // <-- Module scripts are deferred and Env2d is a classic script, so it is normally already there
    const ATTACH_MAX_TRIES   =  40;                                           // <-- Two seconds of patience before giving up loudly
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pipeline Attachment
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Wrap the 2D Render and Dispose Functions
    // ------------------------------------------------------------
    // The originals are called and their answer returned untouched. The experiment
    // is notified afterwards, inside a try, so a fault anywhere in this folder can
    // never take a drawing down with it.
    function VghLantern__ProjectedEdges__Bootstrap__Wrap(env2dPipeline) {
        const originalRender   =  env2dPipeline[RENDER_FN_NAME];
        const originalDispose  =  env2dPipeline[DISPOSE_FN_NAME];

        env2dPipeline[RENDER_FN_NAME]  =  async function(surface, skeleton, barSet, lantern) {
            const didRender  =  await originalRender(surface, skeleton, barSet, lantern);

            try {
                VghLantern__ProjectedEdges__Pipeline__Sync(surface, skeleton, barSet, lantern, didRender);

                // The button has to follow the geometry. A dimension edit invalidates
                // what was rendered, and the control must stop offering to hide
                // linework that has just cleared itself off the drawing.
                VghLantern__ProjectedEdges__ToolbarButton__Sync();
            } catch (overlayError) {
                console.error('[VghLantern ProjectedEdges] Overlay hook failed:', overlayError);
            }

            return didRender;
        };

        env2dPipeline[DISPOSE_FN_NAME]  =  function(surface) {
            try {
                VghLantern__ProjectedEdges__Pipeline__Detach(surface);
            } catch (detachError) {
                console.error('[VghLantern ProjectedEdges] Overlay detach failed:', detachError);
            }

            return originalDispose(surface);
        };

        env2dPipeline[INSTALLED_FLAG]  =  true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Wait for the 2D Pipeline and Attach to It
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__Bootstrap__Attach(attempt) {
        const env2dPipeline  =  window[ENV2D_GLOBAL_NAME];

        if (env2dPipeline && typeof env2dPipeline[RENDER_FN_NAME] === 'function') {
            if (env2dPipeline[INSTALLED_FLAG] === true) return;               // <-- Already wrapped by an earlier load
            VghLantern__ProjectedEdges__Bootstrap__Wrap(env2dPipeline);
            return;
        }

        if (attempt >= ATTACH_MAX_TRIES) {
            console.warn('[VghLantern ProjectedEdges] Env2d render pipeline never appeared; the projection overlay is inactive.');
            return;
        }

        window.setTimeout(function() {
            VghLantern__ProjectedEdges__Bootstrap__Attach(attempt + 1);
        }, ATTACH_RETRY_MS);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boot
// -----------------------------------------------------------------------------

    // MODULE INITIALISATION | Attach, Publish the Debug Helpers, Announce
    // ------------------------------------------------------------
    // Attachment happens immediately and does not wait on the config fetch. A render
    // that lands before the config resolves is handled inside the pipeline, which
    // awaits readiness before deciding anything, so nothing is missed and nothing is
    // done twice.
    VghLantern__ProjectedEdges__Bootstrap__Attach(0);

    window[DEBUG_GLOBAL_NAME]  =  VghLantern__ProjectedEdges__Pipeline__BuildDebugApi();

    // ------------------------------------------------------
    // The public handle, for the parts of the application that are classic
    // scripts rather than modules and so cannot import any of this: the
    // hotkey action map, and the gate in front of Preview and Send.
    //
    // Deliberately small. Everything on it is something another module has a
    // real need to do, and nothing on it exposes the pipeline's internals -
    // the console helpers live on their own global and are a separate promise
    // to nobody.
    // ------------------------------------------------------
    window[PUBLIC_GLOBAL_NAME]  =  {

        // Render whatever is missing, show the result, and resolve only once the
        // linework exists. Safe to call when everything is already in hand: it
        // returns almost immediately having done nothing.
        VghLantern__ProjectedEdges__ForceRender : function() {
            return VghLantern__ProjectedEdges__ToolbarButton__ForceRender();
        },

        // What the caller would need to decide whether a drawing is ready to issue.
        VghLantern__ProjectedEdges__Status : function() {
            return VghLantern__ProjectedEdges__Pipeline__Status();
        },

        VghLantern__ProjectedEdges__Show : VghLantern__ProjectedEdges__Pipeline__Show,
        VghLantern__ProjectedEdges__Hide : VghLantern__ProjectedEdges__Pipeline__Hide
    };

    // The toolbar button waits for config, because its labels and its very presence
    // are config values. The render hook above deliberately does not.
    void VghLantern__ProjectedEdges__ConfigAccess__Ready().then(function() {
        VghLantern__ProjectedEdges__ToolbarButton__Attach();

        console.log('[VghLantern ProjectedEdges] Loaded, enabled: ' +
                    VghLantern__ProjectedEdges__ConfigAccess__IsEnabled() +
                    '. Nothing is projected until the Drawing Editor render button is pressed. ' +
                    'Console helpers on window.' + DEBUG_GLOBAL_NAME + '.');
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
