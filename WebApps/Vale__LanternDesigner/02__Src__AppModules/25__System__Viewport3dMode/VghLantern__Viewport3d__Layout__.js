/* =============================================================================
   VGHLANTERN - DEDICATED 3D VIEWPORT MODE | LAYOUT
   =============================================================================

   FILE       : VghLantern__Viewport3d__Layout__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Viewport3d - Layout
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Own the full-screen 3D View mode: surface lifecycle and overlay
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Mounts one Env3d surface into the full-bleed 3D View mode panel and holds the
     surface handle for the life of the session.
   - Renders the control overlay through Viewport3d__Controls and services its
     intents: camera presets, zoom-extents and lantern selection.
   - Attaches the Env3d hover inspector and feeds its payloads to
     Viewport3d__InspectorPanel, so hovering a member names it, counts its
     siblings and shades the rest of the model back.
   - Rebuilds the model whenever geometry is re-solved, and resizes the drawing
     buffer whenever the mode is entered or the window changes size.
   - Classic script; it waits for the ESM bootstrap to publish the pipeline rather
     than importing Three.js itself.

   -----------------------------------------------------------------------------

   RELATIONSHIP TO THE EDITOR'S 3D PANEL:
   Two separate surfaces, deliberately. The editor panel is a small check-as-you-go
   view sharing screen space with the controls; this mode is the full-screen review
   view. Sharing one surface between them would mean tearing down and re-mounting a
   GL context on every mode switch, which is both slower and visibly janky.

   WHY THE SURFACE IS KEPT ALIVE:
   Config decides via DisposeOnModeExit. Default is to keep it, so returning to the
   3D View is instant; machines short of GPU memory can flip it to dispose.

   ============================================================================= */

// =============================================================================
// REGION | Dedicated 3D Viewport Layout Module
// =============================================================================

const VghLantern__Viewport3d__Layout = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Identifiers
    // ------------------------------------------------------------
    const DOM_CONTAINER        =  'VghLantern__Viewport3d__Container';
    const DOM_CANVAS_HOST      =  'VghLantern__Viewport3d__CanvasHost';
    const DOM_CONTROLS_OVERLAY =  'VghLantern__Viewport3d__ControlsOverlay';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | CSS Class Names and Copy
    // ------------------------------------------------------------
    const CSS_PENDING        =  'VghLantern__Viewport3d__Pending';
    const CSS_EMPTY_STATE    =  'VghLantern__Viewport3d__EmptyState';

    const PENDING_MESSAGE    =  'Starting the 3D view...';
    const NO_LANTERN_MESSAGE =  'Select a lantern in the Lantern Editor to view it in 3D.';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Readiness Bridge
    // ------------------------------------------------------------
    const READY_EVENT_NAME   =  'vghlantern-env3d-ready';                     // <-- Dispatched by Env3d Bootstrap
    const RESIZE_DEBOUNCE_MS =  120;                                          // <-- Coalesces window resize storms into one buffer resize
    // ------------------------------------------------------------


    // MODULE VARIABLES | Surface and Lifecycle State
    // ------------------------------------------------------------
    let VghLantern__Viewport3dLayout__Surface       =  null;                  // <-- Opaque Env3d surface handle
    let VghLantern__Viewport3dLayout__IsSubscribed  =  false;                 // <-- Guards duplicate StateManager listeners
    let VghLantern__Viewport3dLayout__IsMounting    =  false;                 // <-- Prevents a second mount while the ESM stack resolves
    let VghLantern__Viewport3dLayout__ResizeTimerId =  null;                  // <-- Pending debounced resize handle
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and State Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Dedicated Viewport Mode Config Block
    // ------------------------------------------------------------
    function VghLantern__Viewport3dLayout__ModeConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var env3dCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Env3d') || {};
        return env3dCfg['VghLantern__Env3d__Config__DedicatedViewportMode'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run a Callback Once the 3D Pipeline Is Available
    // ------------------------------------------------------------
    function VghLantern__Viewport3dLayout__WhenPipelineReady(callback) {
        if (window.VghLantern__Env3d__RenderPipeline) {
            callback(window.VghLantern__Env3d__RenderPipeline);
            return;
        }

        if (typeof window.VghLantern__Env3d__WhenReady === 'function') {
            window.VghLantern__Env3d__WhenReady(callback);
            return;
        }

        window.addEventListener(READY_EVENT_NAME, function VghLantern__Viewport3dLayout__OnReady(ev) {
            window.removeEventListener(READY_EVENT_NAME, VghLantern__Viewport3dLayout__OnReady);
            callback(ev.detail.Pipeline);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Overlay Coordination
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Intent Callback Map Handed to the Overlay
    // ------------------------------------------------------------
    // The overlay reports intent; every decision about the live surface is made
    // here, which keeps the surface handle out of the overlay entirely.
    function VghLantern__Viewport3dLayout__BuildOverlayCallbacks() {
        return {
            OnPreset: function(presetKey) {
                var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
                var Controls  =  window.VghLantern__Viewport3d__Controls;
                if (!pipeline || !VghLantern__Viewport3dLayout__Surface) return;

                pipeline.VghLantern__Env3d__RenderPipeline__ApplyPreset(VghLantern__Viewport3dLayout__Surface, presetKey);
                if (Controls) Controls.VghLantern__Viewport3d__Controls__SetActivePreset(presetKey);
            },

            OnZoomExtents: function() {
                var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
                if (!pipeline || !VghLantern__Viewport3dLayout__Surface) return;
                pipeline.VghLantern__Env3d__RenderPipeline__ZoomExtents(VghLantern__Viewport3dLayout__Surface);
            },

            OnLanternSelected: function(lanternIndex) {
                var StateManager  =  window.VghLantern__AppCore__StateManager;
                if (!StateManager || typeof lanternIndex !== 'number' || isNaN(lanternIndex)) return;
                StateManager.VghLantern__StateManager__SetCurrentLanternIndex(lanternIndex); // <-- Solve and redraw follow from the state event
            }
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render the Control Overlay
    // ------------------------------------------------------------
    function VghLantern__Viewport3dLayout__RenderOverlay() {
        var Controls     =  window.VghLantern__Viewport3d__Controls;
        var overlayHost  =  document.getElementById(DOM_CONTROLS_OVERLAY);
        if (!Controls || !overlayHost) return;

        Controls.VghLantern__Viewport3d__Controls__Render(
            overlayHost, VghLantern__Viewport3dLayout__BuildOverlayCallbacks()
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Model Inspection
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Attach the Hover Inspector and Its Readout Panel
    // ------------------------------------------------------------
    // Two independent gates, both honoured. The pipeline decides whether the
    // feature exists at all; this mode decides whether it wants it. The panel is
    // only built once the pipeline confirms it has something to feed it, so a
    // disabled feature leaves no empty element in the DOM.
    function VghLantern__Viewport3dLayout__AttachInspector() {
        var pipeline   =  window.VghLantern__Env3d__RenderPipeline;
        var Panel      =  window.VghLantern__Viewport3d__InspectorPanel;
        var container  =  document.getElementById(DOM_CONTAINER);

        if (!pipeline || !Panel || !container) return;
        if (!VghLantern__Viewport3dLayout__Surface) return;
        var ConfigLoaderForInspector  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoaderForInspector.VghLantern__ConfigLoader__RequireBoolean(
                VghLantern__Viewport3dLayout__ModeConfig(), 'ShowHoverInspector',
                'Na__Env3d__Config.json -> VghLantern__Env3d__Config__DedicatedViewportMode')) {
            return;
        }
        if (!pipeline.VghLantern__Env3d__RenderPipeline__AttachInspector) return;

        var attached  =  pipeline.VghLantern__Env3d__RenderPipeline__AttachInspector(
            VghLantern__Viewport3dLayout__Surface,
            function(payload) {
                Panel.VghLantern__Viewport3d__InspectorPanel__Show(payload);
            }
        );

        if (attached) Panel.VghLantern__Viewport3d__InspectorPanel__Render(container);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Drop Any Active Inspector Target
    // ------------------------------------------------------------
    function VghLantern__Viewport3dLayout__ClearInspector() {
        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        var Panel     =  window.VghLantern__Viewport3d__InspectorPanel;

        if (pipeline && pipeline.VghLantern__Env3d__RenderPipeline__ClearInspector && VghLantern__Viewport3dLayout__Surface) {
            pipeline.VghLantern__Env3d__RenderPipeline__ClearInspector(VghLantern__Viewport3dLayout__Surface);
        }
        if (Panel) Panel.VghLantern__Viewport3d__InspectorPanel__Hide();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount and Redraw
// -----------------------------------------------------------------------------

    // FUNCTION | Rebuild the Model from the Currently Solved Geometry
    // ------------------------------------------------------------
    async function VghLantern__Viewport3d__Layout__Redraw() {
        var pipeline      =  window.VghLantern__Env3d__RenderPipeline;
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!pipeline || !StateManager || !VghLantern__Viewport3dLayout__Surface) return;

        await pipeline.VghLantern__Env3d__RenderPipeline__Render(
            VghLantern__Viewport3dLayout__Surface,
            StateManager.VghLantern__StateManager__GetSolvedSkeleton(),
            StateManager.VghLantern__StateManager__GetSolvedBarSet(),
            StateManager.VghLantern__StateManager__GetCurrentLantern()
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Mount the Surface Once the Pipeline Has Resolved
    // ------------------------------------------------------------
    async function VghLantern__Viewport3dLayout__MountWithPipeline(pipeline) {
        var canvasHost  =  document.getElementById(DOM_CANVAS_HOST);
        if (!canvasHost) return;

        canvasHost.innerHTML  =  '';                                          // <-- Clear the pending message before the canvas lands

        VghLantern__Viewport3dLayout__Surface  =  pipeline.VghLantern__Env3d__RenderPipeline__Mount(canvasHost);
        if (!VghLantern__Viewport3dLayout__Surface) return;

        var modeConfig  =  VghLantern__Viewport3dLayout__ModeConfig();
        if (modeConfig.DefaultPreset) {
            pipeline.VghLantern__Env3d__RenderPipeline__ApplyPreset(
                VghLantern__Viewport3dLayout__Surface, modeConfig.DefaultPreset
            );
        }

        VghLantern__Viewport3dLayout__RenderOverlay();                        // <-- Presets only exist once the pipeline is up

        var Controls  =  window.VghLantern__Viewport3d__Controls;
        if (Controls && modeConfig.DefaultPreset) {
            Controls.VghLantern__Viewport3d__Controls__SetActivePreset(modeConfig.DefaultPreset);
        }

        VghLantern__Viewport3dLayout__AttachInspector();                      // <-- Before the first draw, so the model is pickable as soon as it lands
        VghLantern__Viewport3dLayout__Subscribe();
        await VghLantern__Viewport3d__Layout__Redraw();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Binding
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Handle a Debounced Window Resize
    // ------------------------------------------------------------
    function VghLantern__Viewport3dLayout__OnWindowResize() {
        if (VghLantern__Viewport3dLayout__ResizeTimerId) {
            clearTimeout(VghLantern__Viewport3dLayout__ResizeTimerId);
        }

        VghLantern__Viewport3dLayout__ResizeTimerId  =  setTimeout(function() {
            VghLantern__Viewport3dLayout__ResizeTimerId  =  null;
            VghLantern__Viewport3d__Layout__Resize();
        }, RESIZE_DEBOUNCE_MS);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Subscribe to State and Window Events
    // ------------------------------------------------------------
    function VghLantern__Viewport3dLayout__Subscribe() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (VghLantern__Viewport3dLayout__IsSubscribed) return;

        if (StateManager) {
            StateManager.VghLantern__StateManager__On('geometrySolved', function() {
                void VghLantern__Viewport3d__Layout__Redraw();
            });

            StateManager.VghLantern__StateManager__On('projectChanged', function() {
                VghLantern__Viewport3dLayout__RenderOverlay();                // <-- Lantern selector contents follow the project
            });
        }

        window.addEventListener('resize', VghLantern__Viewport3dLayout__OnWindowResize);

        VghLantern__Viewport3dLayout__IsSubscribed  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | Enter the 3D View Mode
    // ------------------------------------------------------------
    // Idempotent. First entry mounts the surface; later entries only resize the
    // drawing buffer and repaint the overlay, because the panel was display:none
    // while another mode was active and so had zero measurable size.
    async function VghLantern__Viewport3d__Layout__Init() {
        var canvasHost  =  document.getElementById(DOM_CANVAS_HOST);
        if (!canvasHost) return;

        if (VghLantern__Viewport3dLayout__Surface) {
            VghLantern__Viewport3d__Layout__Resize();
            VghLantern__Viewport3dLayout__RenderOverlay();
            VghLantern__Viewport3dLayout__AttachInspector();                  // <-- Idempotent, and covers a first mount that raced the config load
            await VghLantern__Viewport3d__Layout__Redraw();
            return;
        }

        if (VghLantern__Viewport3dLayout__IsMounting) return;                 // <-- A mount is already waiting on the ESM stack
        VghLantern__Viewport3dLayout__IsMounting  =  true;

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var lantern       =  StateManager ? StateManager.VghLantern__StateManager__GetCurrentLantern() : null;

        canvasHost.innerHTML  =  lantern
            ? '<p class="' + CSS_PENDING + '">' + PENDING_MESSAGE + '</p>'
            : '<p class="' + CSS_EMPTY_STATE + '">' + NO_LANTERN_MESSAGE + '</p>';

        VghLantern__Viewport3dLayout__WhenPipelineReady(function(pipeline) {
            VghLantern__Viewport3dLayout__IsMounting  =  false;
            void VghLantern__Viewport3dLayout__MountWithPipeline(pipeline);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Resize the Drawing Buffer to the Host
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__Layout__Resize() {
        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !VghLantern__Viewport3dLayout__Surface) return;
        pipeline.VghLantern__Env3d__RenderPipeline__Resize(VghLantern__Viewport3dLayout__Surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Return the Live Surface Handle
    // ------------------------------------------------------------
    // The drawing editor prefers this surface for the sheet's 3D view, because the
    // full-screen mode is where a reviewer sets the angle they actually want.
    function VghLantern__Viewport3d__Layout__GetSurface() {
        return VghLantern__Viewport3dLayout__Surface;
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose the Surface and Release the GL Context
    // ------------------------------------------------------------
    function VghLantern__Viewport3d__Layout__Dispose() {
        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        var Panel     =  window.VghLantern__Viewport3d__InspectorPanel;

        if (pipeline && VghLantern__Viewport3dLayout__Surface) {
            pipeline.VghLantern__Env3d__RenderPipeline__Dispose(VghLantern__Viewport3dLayout__Surface);
        }
        if (Panel) Panel.VghLantern__Viewport3d__InspectorPanel__Dispose();

        VghLantern__Viewport3dLayout__Surface  =  null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Leave the 3D View Mode
    // ------------------------------------------------------------
    // Only tears the context down when config asks for it, so the common case keeps
    // returning to this mode instant. The inspector is released either way: this
    // surface is the one the Drawing Editor prefers for its sheet 3D views, and a
    // member left pinned in accent blue must not follow the user onto a drawing.
    function VghLantern__Viewport3d__Layout__OnModeExit() {
        var modeConfig  =  VghLantern__Viewport3dLayout__ModeConfig();

        VghLantern__Viewport3dLayout__ClearInspector();
        if (modeConfig.DisposeOnModeExit === true) VghLantern__Viewport3d__Layout__Dispose();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Viewport3d__Layout__Init       : VghLantern__Viewport3d__Layout__Init,
        VghLantern__Viewport3d__Layout__Redraw     : VghLantern__Viewport3d__Layout__Redraw,
        VghLantern__Viewport3d__Layout__Resize     : VghLantern__Viewport3d__Layout__Resize,
        VghLantern__Viewport3d__Layout__GetSurface : VghLantern__Viewport3d__Layout__GetSurface,
        VghLantern__Viewport3d__Layout__OnModeExit : VghLantern__Viewport3d__Layout__OnModeExit,
        VghLantern__Viewport3d__Layout__Dispose    : VghLantern__Viewport3d__Layout__Dispose
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Viewport3d__Layout  =  VghLantern__Viewport3d__Layout;
