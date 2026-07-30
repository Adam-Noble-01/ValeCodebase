/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | VIEWPORT CONTROLS
   =============================================================================

   FILE       : VghLantern__Env2d__ViewportControls__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - ViewportControls
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Pan, zoom and fit interaction for a 2D viewport instance
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Attaches navigation behaviour to a ViewportInstance without the instance
     knowing anything about input devices.
   - Pointer-drag pans, wheel zooms about the cursor, double click fits to
     extents. Matches the navigation feel of the SketchUp Assembly Studio 2D
     preview so staff moving between tools do not have to relearn anything.
   - Zoom is applied by rewriting the viewBox rather than by a CSS transform, so
     stroke widths stay in true millimetres and printed output matches the screen.

   CONTROLLER API:
       ZoomBy(factor, anchorClientX, anchorClientY)
       ZoomExtents()
       SetFitExtents(extents)      remembers what "extents" means for this view
       Detach()

   ============================================================================= */

// =============================================================================
// REGION | Viewport Controls Module
// =============================================================================

const VghLantern__Env2d__ViewportControls = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Interaction Defaults
    // ------------------------------------------------------------
    const DEFAULT_MIN_SPAN_MM      =  50;                                    // <-- Tightest zoom-in span
    const DEFAULT_MAX_SPAN_MM      =  400000;                                // <-- Widest zoom-out span
    const DEFAULT_WHEEL_STEP       =  0.0016;                                // <-- Wheel delta to zoom factor
    const CSS_PANNING_CLASS        =  'VghLantern__Env2d__Svg--panning';     // <-- Applied to the root while dragging
    // ------------------------------------------------------------


    // MODULE VARIABLES | Active Controller Tracking
    // ------------------------------------------------------------
    // The zoom-extents hotkey is global but has to act on one viewport. Several
    // surfaces can be attached at once (editor 2D panel, drawing sheet views), so
    // "active" means the last one the user actually pointed at.
    let VghLantern__Env2d__ViewportControls__ActiveController  =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Viewport Section of the 2D Config
    // ------------------------------------------------------------
    function VghLantern__Env2d__ViewportControls__ReadConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var viewportCfg   =  (env2d && env2d['VghLantern__Env2d__Config__Viewport']) || {};

        return {
            FitPaddingFactor  : (typeof viewportCfg.FitPaddingFactor === 'number') ? viewportCfg.FitPaddingFactor : 0.14,
            WheelZoomStep     : (typeof viewportCfg.WheelZoomStep    === 'number') ? viewportCfg.WheelZoomStep    : DEFAULT_WHEEL_STEP,
            ButtonZoomStep    : (typeof viewportCfg.ButtonZoomStep   === 'number') ? viewportCfg.ButtonZoomStep   : 1.25,
            PanButton         : (typeof viewportCfg.PanButton        === 'number') ? viewportCfg.PanButton        : 0,
            DoubleClickFit    : viewportCfg.DoubleClickZoomExtents !== false
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Controller Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Attach Pan and Zoom Controls to a Viewport Instance
    // ------------------------------------------------------------
    function VghLantern__Env2d__ViewportControls__Attach(instance, fitExtents) {
        if (!instance || !instance.Root) return null;

        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;
        var config      =  VghLantern__Env2d__ViewportControls__ReadConfig();
        var rootEl      =  instance.Root;

        var storedFitExtents  =  fitExtents || null;
        var isPanning         =  false;
        var panStartUser      =  { x: 0, y: 0 };
        var panStartViewBox   =  null;


        // SUB FUNCTION | Zoom About a Client-Space Anchor Point
        // ---------------------------------------------------------------
        function VghLantern__Env2d__ViewportControls__ZoomBy(factor, anchorClientX, anchorClientY) {
            var box  =  instance.GetViewBox();

            var nextWidth   =  box.Width  / factor;
            var nextHeight  =  box.Height / factor;

            if (nextWidth < DEFAULT_MIN_SPAN_MM || nextWidth > DEFAULT_MAX_SPAN_MM) return;

            // Keep the model point under the cursor stationary on screen.
            var anchorUser  =  (typeof anchorClientX === 'number')
                ? SvgHelpers.VghLantern__Env2d__SvgHelpers__ClientToUser(rootEl, anchorClientX, anchorClientY)
                : { x: box.MinX + (box.Width / 2), y: box.MinY + (box.Height / 2) };

            var ratioX  =  (anchorUser.x - box.MinX) / box.Width;
            var ratioY  =  (anchorUser.y - box.MinY) / box.Height;

            instance.SetViewBox({
                MinX   : anchorUser.x - (nextWidth  * ratioX),
                MinY   : anchorUser.y - (nextHeight * ratioY),
                Width  : nextWidth,
                Height : nextHeight
            });
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Fit the View to the Stored Extents
        // ---------------------------------------------------------------
        function VghLantern__Env2d__ViewportControls__ZoomExtents() {
            instance.FitToExtents(storedFitExtents, config.FitPaddingFactor);
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Wheel Zoom
        // ---------------------------------------------------------------
        function VghLantern__Env2d__ViewportControls__OnWheel(e) {
            e.preventDefault();
            var factor  =  Math.exp(-e.deltaY * config.WheelZoomStep);
            VghLantern__Env2d__ViewportControls__ZoomBy(factor, e.clientX, e.clientY);
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Begin a Pan Drag
        // ---------------------------------------------------------------
        function VghLantern__Env2d__ViewportControls__OnPointerDown(e) {
            if (e.button !== config.PanButton) return;

            // A click landing on an editable dimension belongs to the editor.
            if (e.target && e.target.closest && e.target.closest('[data-vgh-dimension-key]')) return;

            isPanning        =  true;
            panStartUser     =  SvgHelpers.VghLantern__Env2d__SvgHelpers__ClientToUser(rootEl, e.clientX, e.clientY);
            panStartViewBox  =  instance.GetViewBox();

            rootEl.classList.add(CSS_PANNING_CLASS);
            if (rootEl.setPointerCapture) rootEl.setPointerCapture(e.pointerId);
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Continue a Pan Drag
        // ---------------------------------------------------------------
        function VghLantern__Env2d__ViewportControls__OnPointerMove(e) {
            if (!isPanning || !panStartViewBox) return;

            var currentUser  =  SvgHelpers.VghLantern__Env2d__SvgHelpers__ClientToUser(rootEl, e.clientX, e.clientY);

            instance.SetViewBox({
                MinX   : panStartViewBox.MinX - (currentUser.x - panStartUser.x),
                MinY   : panStartViewBox.MinY - (currentUser.y - panStartUser.y),
                Width  : panStartViewBox.Width,
                Height : panStartViewBox.Height
            });
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | End a Pan Drag
        // ---------------------------------------------------------------
        function VghLantern__Env2d__ViewportControls__OnPointerUp(e) {
            if (!isPanning) return;
            isPanning        =  false;
            panStartViewBox  =  null;
            rootEl.classList.remove(CSS_PANNING_CLASS);
            if (rootEl.releasePointerCapture && e.pointerId !== undefined) {
                try { rootEl.releasePointerCapture(e.pointerId); } catch (err) { /* capture already released */ }
            }
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Double Click Fit
        // ---------------------------------------------------------------
        function VghLantern__Env2d__ViewportControls__OnDoubleClick() {
            if (config.DoubleClickFit) VghLantern__Env2d__ViewportControls__ZoomExtents();
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Claim Active Status on Pointer Entry
        // ---------------------------------------------------------------
        function VghLantern__Env2d__ViewportControls__OnPointerEnter() {
            VghLantern__Env2d__ViewportControls__ActiveController  =  controller;
        }
        // ---------------------------------------------------------------


        rootEl.addEventListener('wheel',        VghLantern__Env2d__ViewportControls__OnWheel, { passive: false });
        rootEl.addEventListener('pointerdown',  VghLantern__Env2d__ViewportControls__OnPointerDown);
        rootEl.addEventListener('pointermove',  VghLantern__Env2d__ViewportControls__OnPointerMove);
        rootEl.addEventListener('pointerup',    VghLantern__Env2d__ViewportControls__OnPointerUp);
        rootEl.addEventListener('pointerleave', VghLantern__Env2d__ViewportControls__OnPointerUp);
        rootEl.addEventListener('pointerenter', VghLantern__Env2d__ViewportControls__OnPointerEnter);
        rootEl.addEventListener('dblclick',     VghLantern__Env2d__ViewportControls__OnDoubleClick);

        var controller  =  {
            ZoomBy          : VghLantern__Env2d__ViewportControls__ZoomBy,
            ZoomExtents     : VghLantern__Env2d__ViewportControls__ZoomExtents,
            ZoomIn          : function() { VghLantern__Env2d__ViewportControls__ZoomBy(config.ButtonZoomStep); },
            ZoomOut         : function() { VghLantern__Env2d__ViewportControls__ZoomBy(1 / config.ButtonZoomStep); },
            SetFitExtents   : function(extents) { storedFitExtents  =  extents; },
            Detach          : function() {
                rootEl.removeEventListener('wheel',        VghLantern__Env2d__ViewportControls__OnWheel);
                rootEl.removeEventListener('pointerdown',  VghLantern__Env2d__ViewportControls__OnPointerDown);
                rootEl.removeEventListener('pointermove',  VghLantern__Env2d__ViewportControls__OnPointerMove);
                rootEl.removeEventListener('pointerup',    VghLantern__Env2d__ViewportControls__OnPointerUp);
                rootEl.removeEventListener('pointerleave', VghLantern__Env2d__ViewportControls__OnPointerUp);
                rootEl.removeEventListener('pointerenter', VghLantern__Env2d__ViewportControls__OnPointerEnter);
                rootEl.removeEventListener('dblclick',     VghLantern__Env2d__ViewportControls__OnDoubleClick);

                if (VghLantern__Env2d__ViewportControls__ActiveController === controller) {
                    VghLantern__Env2d__ViewportControls__ActiveController  =  null;   // <-- Never leave the hotkey pointing at a dead surface
                }
            }
        };

        VghLantern__Env2d__ViewportControls__ActiveController  =  controller;         // <-- Newest surface is active until the pointer says otherwise
        return controller;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Active Controller Access
// -----------------------------------------------------------------------------

    // FUNCTION | Zoom the Active Viewport to Extents
    // ------------------------------------------------------------
    // Called by the global zoom-extents hotkey, which has no surface reference.
    function VghLantern__Env2d__ViewportControls__ZoomExtentsActive() {
        if (!VghLantern__Env2d__ViewportControls__ActiveController) return false;
        VghLantern__Env2d__ViewportControls__ActiveController.ZoomExtents();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Currently Active Controller
    // ------------------------------------------------------------
    function VghLantern__Env2d__ViewportControls__GetActive() {
        return VghLantern__Env2d__ViewportControls__ActiveController;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Env2d__ViewportControls__Attach            : VghLantern__Env2d__ViewportControls__Attach,
        VghLantern__Env2d__ViewportControls__ZoomExtentsActive : VghLantern__Env2d__ViewportControls__ZoomExtentsActive,
        VghLantern__Env2d__ViewportControls__GetActive         : VghLantern__Env2d__ViewportControls__GetActive
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__ViewportControls  =  VghLantern__Env2d__ViewportControls;
