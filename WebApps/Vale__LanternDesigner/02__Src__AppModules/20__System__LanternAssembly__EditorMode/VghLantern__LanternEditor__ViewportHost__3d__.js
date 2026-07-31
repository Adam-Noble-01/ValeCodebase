/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | 3D VIEWPORT HOST
   =============================================================================

   FILE       : VghLantern__LanternEditor__ViewportHost__3d__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - ViewportHost3d
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Host the editor's optional in-panel 3D preview
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds the chrome around the in-editor 3D panel: camera preset buttons and a
     zoom-extents control.
   - Mounts one Env3d surface and keeps it in step with StateManager, rebuilding the
     model on geometrySolved.
   - Classic script, so it can never import the ESM 3D stack directly. It waits for
     the bootstrap to publish the pipeline, then mounts.

   -----------------------------------------------------------------------------

   WHY THE READINESS DANCE:
   The 3D stack is an ES module and module scripts are deferred, so the pipeline is
   not on window while classic scripts run. Rather than block the whole app on the
   Three.js parse, this host mounts whenever the pipeline becomes available. That
   also means the heavy 3D stack is only ever paid for once, and only if the user
   opens a 3D surface at all.

   WHY THE PANEL IS OPT-IN:
   Editor config defaults the panel off. A staff member sizing a lantern on the plan
   view should not be paying for a WebGL context and a full material library on a
   laptop; they turn it on when they want to check how it reads in the round.

   ============================================================================= */

// =============================================================================
// REGION | 3D Viewport Host Module
// =============================================================================

const VghLantern__LanternEditor__ViewportHost__3d = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names and Data Attributes
    // ------------------------------------------------------------
    const CSS_WRAP        =  'VghLantern__Editor__Viewport3d';
    const CSS_CANVAS      =  'VghLantern__Editor__Viewport3dCanvas';
    const CSS_TOOLBAR     =  'VghLantern__Editor__ViewportToolbar';
    const CSS_TOOL_BTN    =  'VghLantern__Editor__ViewportToolBtn';
    const CSS_PENDING     =  'VghLantern__Editor__Viewport3dPending';

    const ATTR_PRESET     =  'data-vgh-preset';
    const ATTR_TOOL       =  'data-vgh-tool';

    const TOOL_ZOOM_EXTENTS  =  'zoomExtents';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Readiness Bridge Names
    // ------------------------------------------------------------
    const READY_EVENT_NAME  =  'vghlantern-env3d-ready';                     // <-- Dispatched by Env3d Bootstrap
    const PENDING_MESSAGE   =  'Starting the 3D view...';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Host and Surface References
    // ------------------------------------------------------------
    let VghLantern__ViewportHost3d__HostElement    =  null;                  // <-- Panel this host was mounted into
    let VghLantern__ViewportHost3d__CanvasElement  =  null;                  // <-- Element the Env3d surface lives in
    let VghLantern__ViewportHost3d__Surface        =  null;                  // <-- Opaque Env3d surface handle
    let VghLantern__ViewportHost3d__IsSubscribed   =  false;                 // <-- Guards duplicate StateManager listeners
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pipeline Readiness Bridge
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Run a Callback Once the 3D Pipeline Is Available
    // ------------------------------------------------------------
    // Three routes, in order of how early this may be called: already published,
    // the bootstrap's queue helper, or the raw ready event if even that has not
    // been assigned yet.
    function VghLantern__ViewportHost3d__WhenPipelineReady(callback) {
        if (window.VghLantern__Env3d__RenderPipeline) {
            callback(window.VghLantern__Env3d__RenderPipeline);
            return;
        }

        if (typeof window.VghLantern__Env3d__WhenReady === 'function') {
            window.VghLantern__Env3d__WhenReady(callback);
            return;
        }

        window.addEventListener(READY_EVENT_NAME, function VghLantern__ViewportHost3d__OnReady(ev) {
            window.removeEventListener(READY_EVENT_NAME, VghLantern__ViewportHost3d__OnReady);
            callback(ev.detail.Pipeline);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Editor 3D Viewport Config Block
    // ------------------------------------------------------------
    function VghLantern__ViewportHost3d__ViewportConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var editorCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('LanternEditor') || {};
        return editorCfg['VghLantern__LanternEditor__Config__Viewport3d'] || {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Chrome Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Attribute and Content Use
    // ------------------------------------------------------------
    function VghLantern__ViewportHost3d__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Preset and Tool Overlay Markup
    // ------------------------------------------------------------
    // Preset list comes from the camera rig, so adding a preset to Env3d config
    // surfaces it here with no change to this module.
    function VghLantern__ViewportHost3d__BuildToolbarMarkup(pipeline) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var viewportCfg   =  VghLantern__ViewportHost3d__ViewportConfig();
        var VIEWPORT_LABEL =  'Na__LanternEditor__Config.json -> VghLantern__LanternEditor__Config__Viewport3d';
        var html          =  '<div class="' + CSS_TOOLBAR + '">';

        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(viewportCfg, 'ShowPresetButtons', VIEWPORT_LABEL) && pipeline.VghLantern__Env3d__RenderPipeline__ListPresets) {
            var presets  =  pipeline.VghLantern__Env3d__RenderPipeline__ListPresets() || [];
            var i, preset, presetKey, presetLabel;

            for (i = 0; i < presets.length; i++) {
                preset       =  presets[i];
                presetKey    =  typeof preset === 'string' ? preset : preset.Key;
                presetLabel  =  typeof preset === 'string' ? preset : (preset.Label || preset.Key);

                html  +=  '<button type="button" class="' + CSS_TOOL_BTN + '"' +
                          ' ' + ATTR_PRESET + '="' + VghLantern__ViewportHost3d__Escape(presetKey) + '"' +
                          ' title="' + VghLantern__ViewportHost3d__Escape(presetLabel) + '">' +
                          VghLantern__ViewportHost3d__Escape(presetLabel) +
                          '</button>';
            }
        }

        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(viewportCfg, 'ShowZoomExtents', VIEWPORT_LABEL)) {
            html  +=  '<button type="button" class="' + CSS_TOOL_BTN + '" ' + ATTR_TOOL + '="' + TOOL_ZOOM_EXTENTS + '"' +
                      ' title="Zoom to fit">Fit</button>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount and Redraw
// -----------------------------------------------------------------------------

    // FUNCTION | Rebuild the 3D Model from the Currently Solved Geometry
    // ------------------------------------------------------------
    async function VghLantern__ViewportHost3d__Redraw() {
        var pipeline      =  window.VghLantern__Env3d__RenderPipeline;
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!pipeline || !StateManager || !VghLantern__ViewportHost3d__Surface) return;

        await pipeline.VghLantern__Env3d__RenderPipeline__Render(
            VghLantern__ViewportHost3d__Surface,
            StateManager.VghLantern__StateManager__GetSolvedSkeleton(),
            StateManager.VghLantern__StateManager__GetSolvedBarSet(),
            StateManager.VghLantern__StateManager__GetCurrentLantern()
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Chrome and Mount the Env3d Surface
    // ------------------------------------------------------------
    async function VghLantern__ViewportHost3d__MountWithPipeline(pipeline) {
        var hostElement  =  VghLantern__ViewportHost3d__HostElement;
        if (!hostElement) return;

        hostElement.innerHTML  =  '<div class="' + CSS_CANVAS + '"></div>' +
                                  VghLantern__ViewportHost3d__BuildToolbarMarkup(pipeline);

        VghLantern__ViewportHost3d__CanvasElement  =  hostElement.querySelector('.' + CSS_CANVAS);

        VghLantern__ViewportHost3d__Surface  =  pipeline.VghLantern__Env3d__RenderPipeline__Mount(
            VghLantern__ViewportHost3d__CanvasElement
        );
        if (!VghLantern__ViewportHost3d__Surface) return;

        var viewportCfg  =  VghLantern__ViewportHost3d__ViewportConfig();
        if (viewportCfg.DefaultPreset && pipeline.VghLantern__Env3d__RenderPipeline__ApplyPreset) {
            pipeline.VghLantern__Env3d__RenderPipeline__ApplyPreset(VghLantern__ViewportHost3d__Surface, viewportCfg.DefaultPreset);
        }

        VghLantern__ViewportHost3d__Subscribe();
        await VghLantern__ViewportHost3d__Redraw();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Binding
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Bind Delegated Preset and Tool Clicks
    // ------------------------------------------------------------
    function VghLantern__ViewportHost3d__BindDelegated() {
        if (!VghLantern__ViewportHost3d__HostElement) return;

        VghLantern__ViewportHost3d__HostElement.addEventListener('click', function(ev) {
            var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
            if (!pipeline || !VghLantern__ViewportHost3d__Surface) return;

            var presetEl  =  ev.target.closest('[' + ATTR_PRESET + ']');
            if (presetEl) {
                pipeline.VghLantern__Env3d__RenderPipeline__ApplyPreset(
                    VghLantern__ViewportHost3d__Surface, presetEl.getAttribute(ATTR_PRESET)
                );
                return;
            }

            var toolEl  =  ev.target.closest('[' + ATTR_TOOL + ']');
            if (toolEl && toolEl.getAttribute(ATTR_TOOL) === TOOL_ZOOM_EXTENTS) {
                pipeline.VghLantern__Env3d__RenderPipeline__ZoomExtents(VghLantern__ViewportHost3d__Surface);
            }
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Subscribe to the State Events This Host Reacts To
    // ------------------------------------------------------------
    function VghLantern__ViewportHost3d__Subscribe() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager || VghLantern__ViewportHost3d__IsSubscribed) return;

        StateManager.VghLantern__StateManager__On('geometrySolved', function() {
            void VghLantern__ViewportHost3d__Redraw();
        });

        VghLantern__ViewportHost3d__IsSubscribed  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | Mount the 3D Viewport Host Into a Panel
    // ------------------------------------------------------------
    // Returns as soon as the pending state is on screen; the surface arrives when
    // the ESM stack resolves, so a slow first parse never stalls mode entry.
    function VghLantern__ViewportHost3d__Mount(hostElement) {
        if (!hostElement) return;

        var isFirstMount  =  VghLantern__ViewportHost3d__HostElement !== hostElement;

        hostElement.classList.add(CSS_WRAP);
        hostElement.innerHTML  =  '<p class="' + CSS_PENDING + '">' + PENDING_MESSAGE + '</p>';

        VghLantern__ViewportHost3d__HostElement  =  hostElement;
        if (isFirstMount) VghLantern__ViewportHost3d__BindDelegated();         // <-- One listener per host element, not per mount

        VghLantern__ViewportHost3d__WhenPipelineReady(function(pipeline) {
            void VghLantern__ViewportHost3d__MountWithPipeline(pipeline);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Notify the Surface That Its Host Was Resized
    // ------------------------------------------------------------
    // WebGL cannot infer its drawing buffer size from CSS, so a panel toggle or a
    // split-layout change has to be announced explicitly.
    function VghLantern__ViewportHost3d__Resize() {
        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;
        if (!pipeline || !VghLantern__ViewportHost3d__Surface) return;
        pipeline.VghLantern__Env3d__RenderPipeline__Resize(VghLantern__ViewportHost3d__Surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Return the Live Surface Handle
    // ------------------------------------------------------------
    // The drawing editor captures a snapshot from this surface for the 3D view on
    // the sheet, so the sheet matches the angle the user chose.
    function VghLantern__ViewportHost3d__GetSurface() {
        return VghLantern__ViewportHost3d__Surface;
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose the Mounted Surface and Release the GL Context
    // ------------------------------------------------------------
    function VghLantern__ViewportHost3d__Dispose() {
        var pipeline  =  window.VghLantern__Env3d__RenderPipeline;

        if (pipeline && VghLantern__ViewportHost3d__Surface) {
            pipeline.VghLantern__Env3d__RenderPipeline__Dispose(VghLantern__ViewportHost3d__Surface);
        }

        VghLantern__ViewportHost3d__Surface        =  null;
        VghLantern__ViewportHost3d__CanvasElement  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ViewportHost3d__Mount       : VghLantern__ViewportHost3d__Mount,
        VghLantern__ViewportHost3d__Redraw      : VghLantern__ViewportHost3d__Redraw,
        VghLantern__ViewportHost3d__Resize      : VghLantern__ViewportHost3d__Resize,
        VghLantern__ViewportHost3d__GetSurface  : VghLantern__ViewportHost3d__GetSurface,
        VghLantern__ViewportHost3d__Dispose     : VghLantern__ViewportHost3d__Dispose
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__ViewportHost__3d  =  VghLantern__LanternEditor__ViewportHost__3d;
