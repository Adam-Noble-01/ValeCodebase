/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | RENDER PIPELINE
   =============================================================================

   FILE       : VghLantern__Env2d__RenderPipeline__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - RenderPipeline
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The single public entry point into the 2D SVG environment
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Everything outside this folder talks to the 2D environment through this file
     and nothing else. Viewport hosts, the drawing editor and the document
     preview all call the same three functions.
   - Owns the mount/render/dispose lifecycle for a 2D surface: it creates the
     viewport instance, attaches pan and zoom, delegates drawing to the correct
     view renderer, and binds the dimension editor afterwards.
   - Never computes geometry. It consumes the SolvedSkeleton and GlazeBarSet the
     geometry brain publishes, exactly as the 3D pipeline does.

   ---------------------------------------------------------------------------

   PUBLIC LIFECYCLE:

     Mount(hostEl, viewKey)          -> surface        create an SVG surface
     Render(surface, skeleton, bars, lantern)          draw / redraw it
     Dispose(surface)                                  tear it down

   A surface is an opaque handle. Callers hold it and pass it back; they never
   reach into its internals.

   ============================================================================= */

// =============================================================================
// REGION | 2D Render Pipeline Module
// =============================================================================

const VghLantern__Env2d__RenderPipeline = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Empty State and View Keys
    // ------------------------------------------------------------
    const CSS_EMPTY_STATE  =  'VghLantern__Env2d__EmptyState';                // <-- Shown when nothing is solved
    const VIEW_PLAN        =  'plan';

    const EMPTY_MESSAGE_NO_LANTERN  =  'Select or create a lantern to see the drawing.';
    const EMPTY_MESSAGE_INVALID     =  'The current configuration cannot be drawn - check the warnings.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Empty State Handling
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Show or Clear an Empty State Message on a Host
    // ------------------------------------------------------------
    function VghLantern__Env2d__RenderPipeline__SetEmptyState(hostEl, messageText) {
        if (!hostEl) return;

        var existing  =  hostEl.querySelector('.' + CSS_EMPTY_STATE);

        if (!messageText) {
            if (existing) existing.parentNode.removeChild(existing);
            return;
        }

        if (existing) {
            existing.textContent  =  messageText;
            return;
        }

        var el  =  document.createElement('p');
        el.className    =  CSS_EMPTY_STATE;
        el.textContent  =  messageText;
        hostEl.appendChild(el);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Surface Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Mount a 2D Drawing Surface Into a Host Element
    // ------------------------------------------------------------
    // Replaces any previous surface in the same host, so repeated mode entries
    // never stack SVG roots.
    function VghLantern__Env2d__RenderPipeline__Mount(hostElement, viewKey) {
        if (!hostElement) return null;

        var ViewportInstance  =  window.VghLantern__Env2d__ViewportInstance;
        var ViewportControls  =  window.VghLantern__Env2d__ViewportControls;
        if (!ViewportInstance) {
            console.error('[VghLantern__Env2d__RenderPipeline] ViewportInstance module unavailable.');
            return null;
        }

        var resolvedViewKey  =  viewKey || VIEW_PLAN;
        var instance         =  ViewportInstance.VghLantern__Env2d__ViewportInstance__CreateFresh(hostElement, resolvedViewKey);
        if (!instance) return null;

        var controls  =  ViewportControls
            ? ViewportControls.VghLantern__Env2d__ViewportControls__Attach(instance, null)
            : null;

        return {
            Instance     : instance,
            Controls     : controls,
            HostElement  : hostElement,
            ViewKey      : resolvedViewKey,
            HasFitOnce   : false
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch an Existing Surface to a Different View
    // ------------------------------------------------------------
    // Remounting rather than mutating keeps the projector, the fit extents and
    // the dimension bindings consistent with the new view in one step.
    function VghLantern__Env2d__RenderPipeline__SetView(surface, viewKey) {
        if (!surface) return null;
        if (surface.ViewKey === viewKey) return surface;

        var hostElement  =  surface.HostElement;
        VghLantern__Env2d__RenderPipeline__Dispose(surface);
        return VghLantern__Env2d__RenderPipeline__Mount(hostElement, viewKey);
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose a Surface and Detach Its Listeners
    // ------------------------------------------------------------
    function VghLantern__Env2d__RenderPipeline__Dispose(surface) {
        if (!surface) return;

        var DimensionEditor  =  window.VghLantern__Env2d__DimensionEditor;
        if (DimensionEditor) DimensionEditor.VghLantern__Env2d__DimensionEditor__Cancel();

        if (surface.Controls && surface.Controls.Detach) surface.Controls.Detach();
        if (surface.Instance && surface.Instance.Destroy) surface.Instance.Destroy();

        VghLantern__Env2d__RenderPipeline__SetEmptyState(surface.HostElement, null);

        surface.Instance  =  null;
        surface.Controls  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Dispatch
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Choose the Renderer for a View Key
    // ------------------------------------------------------------
    function VghLantern__Env2d__RenderPipeline__RendererFor(viewKey) {
        if (viewKey === VIEW_PLAN) {
            var Plan  =  window.VghLantern__Env2d__PlanViewRenderer;
            return Plan ? Plan.VghLantern__Env2d__PlanViewRenderer__Render : null;
        }

        var Elevation  =  window.VghLantern__Env2d__ElevationViewRenderer;
        if (Elevation && Elevation.VghLantern__Env2d__ElevationViewRenderer__IsElevation(viewKey)) {
            return Elevation.VghLantern__Env2d__ElevationViewRenderer__Render;
        }

        return null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fit the Viewport on the First Render Only
    // ------------------------------------------------------------
    // Refitting on every render would fight the user's pan and zoom, so the fit
    // happens once per surface and afterwards only on explicit request.
    function VghLantern__Env2d__RenderPipeline__FitIfNeeded(surface, skeleton) {
        if (surface.HasFitOnce) return;

        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        if (!CoordHelpers) return;

        var extents  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton(skeleton, surface.ViewKey);
        if (!extents) return;

        if (surface.Controls && surface.Controls.SetFitExtents) surface.Controls.SetFitExtents(extents);
        if (surface.Controls && surface.Controls.ZoomExtents) {
            surface.Controls.ZoomExtents();
        } else {
            surface.Instance.FitToExtents(extents);
        }

        surface.HasFitOnce  =  true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render or Redraw a Surface
    // ------------------------------------------------------------
    async function VghLantern__Env2d__RenderPipeline__Render(surface, skeleton, barSet, lantern) {
        if (!surface || !surface.Instance) return false;

        var DimensionEditor  =  window.VghLantern__Env2d__DimensionEditor;

        // Cancel first: the node the open input is anchored to is about to go.
        if (DimensionEditor) DimensionEditor.VghLantern__Env2d__DimensionEditor__Cancel();

        if (!lantern || !skeleton) {
            surface.Instance.ClearAllLayers();
            VghLantern__Env2d__RenderPipeline__SetEmptyState(surface.HostElement, EMPTY_MESSAGE_NO_LANTERN);
            return false;
        }

        VghLantern__Env2d__RenderPipeline__SetEmptyState(surface.HostElement, null);
        VghLantern__Env2d__RenderPipeline__FitIfNeeded(surface, skeleton);

        var renderFn  =  VghLantern__Env2d__RenderPipeline__RendererFor(surface.ViewKey);
        if (!renderFn) {
            VghLantern__Env2d__RenderPipeline__SetEmptyState(surface.HostElement, 'No renderer for view "' + surface.ViewKey + '".');
            return false;
        }

        var didRender;
        try {
            didRender  =  await renderFn(surface.Instance, skeleton, barSet, lantern);
        } catch (e) {
            console.error('[VghLantern__Env2d__RenderPipeline] Render failed for ' + surface.ViewKey + ':', e);
            VghLantern__Env2d__RenderPipeline__SetEmptyState(surface.HostElement, EMPTY_MESSAGE_INVALID);
            return false;
        }

        if (!didRender) {
            VghLantern__Env2d__RenderPipeline__SetEmptyState(surface.HostElement, EMPTY_MESSAGE_INVALID);
            return false;
        }

        // The view label sits in the overlay layer, which the renderers clear.
        VghLantern__Env2d__RenderPipeline__ApplyViewLabel(surface);

        // Binding last, once the dimension nodes exist in the live DOM.
        if (DimensionEditor) DimensionEditor.VghLantern__Env2d__DimensionEditor__Bind(surface.Instance);

        return true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place the Corner View Label If Config Allows
    // ------------------------------------------------------------
    function VghLantern__Env2d__RenderPipeline__ApplyViewLabel(surface) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var viewportCfg   =  (env2d && env2d['VghLantern__Env2d__Config__Viewport']) || {};

        if (viewportCfg.ShowViewLabel === false) return;

        var views    =  (env2d && env2d['VghLantern__Env2d__Config__Views']) || {};
        var viewCfg  =  views[surface.ViewKey] || {};
        var label    =  viewCfg.Label || surface.ViewKey;

        surface.Instance.SetViewLabel(label);
    }
    // ------------------------------------------------------------


    // FUNCTION | Force a Zoom Extents on a Surface
    // ------------------------------------------------------------
    function VghLantern__Env2d__RenderPipeline__ZoomExtents(surface, skeleton) {
        if (!surface || !surface.Instance) return;

        surface.HasFitOnce  =  false;
        if (skeleton) VghLantern__Env2d__RenderPipeline__FitIfNeeded(surface, skeleton);
    }
    // ------------------------------------------------------------


    // FUNCTION | Serialise a Surface to Standalone SVG Markup
    // ------------------------------------------------------------
    // The drawing editor and PDF export consume this rather than screenshotting,
    // so sheet output stays true vector at any scale.
    function VghLantern__Env2d__RenderPipeline__ToSvgMarkup(surface) {
        if (!surface || !surface.Instance || !surface.Instance.Root) return '';
        return new XMLSerializer().serializeToString(surface.Instance.Root);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Env2d__RenderPipeline__Mount        : VghLantern__Env2d__RenderPipeline__Mount,
        VghLantern__Env2d__RenderPipeline__Render       : VghLantern__Env2d__RenderPipeline__Render,
        VghLantern__Env2d__RenderPipeline__SetView      : VghLantern__Env2d__RenderPipeline__SetView,
        VghLantern__Env2d__RenderPipeline__ZoomExtents  : VghLantern__Env2d__RenderPipeline__ZoomExtents,
        VghLantern__Env2d__RenderPipeline__ToSvgMarkup  : VghLantern__Env2d__RenderPipeline__ToSvgMarkup,
        VghLantern__Env2d__RenderPipeline__Dispose      : VghLantern__Env2d__RenderPipeline__Dispose
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__RenderPipeline  =  VghLantern__Env2d__RenderPipeline;
