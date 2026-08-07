/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | 2D VIEWPORT HOST
   =============================================================================

   FILE       : VghLantern__LanternEditor__ViewportHost__2d__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - ViewportHost2d
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Host the editor's 2D drawing surface, its view tabs and its toolbar
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds the chrome around the 2D surface inside the Lantern Editor: a plan /
     front elevation / side elevation tab strip per pane, and the viewport toolbar.
   - Optionally splits into a dual view so plan and an elevation can be compared at
     once, with its own tab strip on the lower pane and a draggable share handle.
   - Mounts one or two Env2d surfaces and keeps them in step with StateManager,
     redrawing on geometrySolved and remounting the primary on activeView2dChanged.
   - Owns no geometry and no drawing code. Every line on screen is produced by the
     Env2d pipeline from the solved skeleton.

   -----------------------------------------------------------------------------

   WHY THE HOST AND THE PIPELINE ARE SEPARATE MODULES:
   The same Env2d pipeline draws the editor preview, the drawing sheet viewports
   and the component index thumbnails. Those three surfaces need entirely different
   chrome. Keeping the chrome here means the pipeline never grows a mode-specific
   branch, and the dedicated 3D mode can reuse the identical arrangement in its own
   host without inheriting editor tabs.

   THE VIEW KEY IS STATE, NOT LOCAL:
   The active 2D view lives in StateManager because the hotkeys (1 / 2 / 3) set it
   globally and the drawing editor reads it when placing a view. This host is a
   subscriber to that value, never its owner. Dual-view secondary selection stays
   local - it is editor chrome only and must not affect sheet placement.

   VIEWS CHANGE FROM THE TAB STRIPS AND NOWHERE ELSE:
   Both panes carry the same three-button strip. Nothing on the drawing surface
   itself selects a view - a click on the canvas is a pan, a wheel is a zoom, and
   neither may reach the tab handler. The tab listener therefore matches the tab
   class, never the view-key attribute: the Env2d root carries that same attribute
   to identify itself, so an attribute match would turn every pan into a view
   switch on pointer-up.

   ONE DRAWING SCALE, TWO INDEPENDENT VIEWPORTS:
   Fitting each pane to its own extents puts a 5000 x 2500 plan and a 5000 x 820
   elevation on wildly different scales, which reads as a mistake rather than as
   two views of one lantern. The panes are therefore fitted, then re-framed onto
   the tighter of the two scales, at init and on every framing action. Afterwards
   each pane pans and zooms entirely on its own - the shared scale is a starting
   point, not a lock.

   ============================================================================= */

// =============================================================================
// REGION | 2D Viewport Host Module
// =============================================================================

const VghLantern__LanternEditor__ViewportHost__2d = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names and Data Attributes
    // ------------------------------------------------------------
    const CSS_WRAP            =  'VghLantern__Editor__Viewport2d';
    const CSS_TABS            =  'VghLantern__Editor__ViewTabs';
    const CSS_TABS_SECONDARY  =  'VghLantern__Editor__ViewTabs--secondary';
    const CSS_TAB             =  'VghLantern__Editor__ViewTab';
    const CSS_TAB_ACTIVE      =  'VghLantern__Editor__ViewTab--active';
    const CSS_CANVAS          =  'VghLantern__Editor__Viewport2dCanvas';
    const CSS_TOOLBAR         =  'VghLantern__Editor__ViewportToolbar';
    const CSS_TOOL_BTN        =  'VghLantern__Editor__ViewportToolBtn';
    const CSS_TOOL_BTN_ACTIVE =  'VghLantern__Editor__ViewportToolBtn--active';
    const CSS_PANES           =  'VghLantern__Editor__Viewport2dPanes';
    const CSS_PANES_DUAL      =  'VghLantern__Editor__Viewport2dPanes--dual';
    const CSS_PANES_DUAL_HORZ =  'VghLantern__Editor__Viewport2dPanes--dualHorizontal';
    const CSS_PANE            =  'VghLantern__Editor__Viewport2dPane';
    const CSS_PANE_PRIMARY    =  'VghLantern__Editor__Viewport2dPane--primary';
    const CSS_PANE_SECONDARY  =  'VghLantern__Editor__Viewport2dPane--secondary';
    const CSS_RESIZE_HANDLE   =  'VghLantern__Editor__ResizeHandle';
    const CSS_RESIZE_COL      =  'VghLantern__Editor__ResizeHandle--col';
    const CSS_RESIZE_ROW      =  'VghLantern__Editor__ResizeHandle--row';
    const CSS_RESIZE_DRAG     =  'VghLantern__Editor__ResizeHandle--dragging';
    const CSS_HIDDEN          =  'VghLantern__Editor__Hidden';
    const CSS_BODY_RESIZING   =  'VghLantern__Editor__IsResizing';
    const CSS_BODY_RESIZE_ROW =  'VghLantern__Editor__IsResizing--row';

    const ATTR_VIEW_KEY       =  'data-vgh-view';
    const ATTR_TAB_STRIP      =  'data-vgh-tabstrip';
    const ATTR_TOOL           =  'data-vgh-tool';
    const ATTR_ACTION         =  'data-vgh-action';
    const ATTR_RESIZE         =  'data-vgh-resize';

    const STRIP_PRIMARY       =  'primary';
    const STRIP_SECONDARY     =  'secondary';

    const TOOL_ZOOM_EXTENTS   =  'zoomExtents';
    const ACTION_TOGGLE_DUAL  =  'toggleDual2d';
    const RESIZE_DUAL_2D      =  'dual2d';

    const VAR_DUAL_SHARE      =  '--VghLantern_Editor2dDualSharePct';

    const VIEWPORT_CFG_LABEL  =  'Na__LanternEditor__Config.json -> VghLantern__LanternEditor__Config__Viewport2d';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback View Tabs and Dual Defaults
    // ------------------------------------------------------------
    // Used only if the editor config has not resolved. The keys match the Env2d
    // view keys exactly, because a mismatch would mount a surface with no renderer.
    const FALLBACK_VIEW_TABS  =  [
        { Key : 'plan',           Label : 'Plan' },
        { Key : 'frontElevation', Label : 'Front Elevation' },
        { Key : 'sideElevation',  Label : 'Side Elevation' }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Host and Surface References
    // ------------------------------------------------------------
    let VghLantern__ViewportHost2d__HostElement       =  null;               // <-- Panel this host was mounted into
    let VghLantern__ViewportHost2d__PrimaryCanvas     =  null;               // <-- Primary Env2d host element
    let VghLantern__ViewportHost2d__SecondaryCanvas   =  null;               // <-- Secondary Env2d host element
    let VghLantern__ViewportHost2d__PrimarySurface    =  null;               // <-- Opaque Env2d surface handle
    let VghLantern__ViewportHost2d__SecondarySurface  =  null;               // <-- Opaque Env2d surface handle when dual
    let VghLantern__ViewportHost2d__IsSubscribed      =  false;              // <-- Guards duplicate StateManager listeners
    let VghLantern__ViewportHost2d__IsDualVisible     =  false;              // <-- Dual pane currently shown
    let VghLantern__ViewportHost2d__PrimaryViewKey    =  null;               // <-- View the primary surface is actually showing
    let VghLantern__ViewportHost2d__SecondaryViewKey  =  'frontElevation';        // <-- Overwritten on Mount() from config
    let VghLantern__ViewportHost2d__DualSharePct      =  50;                      // <-- Overwritten on Mount() from config
    let VghLantern__ViewportHost2d__ActiveResize      =  null;               // <-- Live dual-share drag state
    let VghLantern__ViewportHost2d__HasEqualisedOnce  =  false;              // <-- Framing settled; later redraws leave the user's zoom alone
    let VghLantern__ViewportHost2d__IsFitQueued       =  false;              // <-- Coalesces framing requests onto one frame
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and State Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Editor Config Block
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__EditorConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('LanternEditor') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Viewport2d Config Block
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__ViewportConfig() {
        var editorCfg  =  VghLantern__ViewportHost2d__EditorConfig();
        return editorCfg['VghLantern__LanternEditor__Config__Viewport2d'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Configured View Tab List
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__ViewTabs() {
        var editorCfg  =  VghLantern__ViewportHost2d__EditorConfig();
        var tabs       =  editorCfg['VghLantern__LanternEditor__Config__ViewTabs'];
        if (!Array.isArray(tabs) || tabs.length === 0) return FALLBACK_VIEW_TABS;
        return tabs;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Active 2D View Key from State
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__ActiveViewKey() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return FALLBACK_VIEW_TABS[0].Key;
        return StateManager.VghLantern__StateManager__GetState().activeView2d || FALLBACK_VIEW_TABS[0].Key;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp a Number Between Inclusive Bounds
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__Clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pick a Sensible Secondary View Distinct From Primary
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__DefaultSecondaryFor(primaryKey) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var viewportCfg   =  VghLantern__ViewportHost2d__ViewportConfig();
        var preferred     =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
            viewportCfg, 'DualViewSecondaryDefault', VIEWPORT_CFG_LABEL
        );
        if (preferred !== primaryKey) return preferred;

        var tabs  =  VghLantern__ViewportHost2d__ViewTabs();
        var i;
        for (i = 0; i < tabs.length; i++) {
            if (tabs[i].Key !== primaryKey) return tabs[i].Key;
        }
        return preferred;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Breathing Room Added to the Shared Drawing Scale
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__FitMarginFactor() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var viewportCfg   =  VghLantern__ViewportHost2d__ViewportConfig();
        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            viewportCfg, 'ViewFitMarginFactor', VIEWPORT_CFG_LABEL
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Chrome Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Attribute and Content Use
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a View Tab Strip for One Pane
    // ------------------------------------------------------------
    // Both panes get the same strip. Only the primary one advertises the hotkeys,
    // because 1 / 2 / 3 set the global active view and that is the upper pane.
    function VghLantern__ViewportHost2d__BuildTabsMarkup(activeViewKey, stripRole) {
        var tabs         =  VghLantern__ViewportHost2d__ViewTabs();
        var isSecondary  =  stripRole === STRIP_SECONDARY;
        var ariaLabel    =  isSecondary ? 'Lower 2D view' : 'Upper 2D view';
        var html         =  '<div class="' + CSS_TABS + (isSecondary ? ' ' + CSS_TABS_SECONDARY : '') + '"' +
                            ' ' + ATTR_TAB_STRIP + '="' + stripRole + '"' +
                            ' role="tablist" aria-label="' + ariaLabel + '">';
        var i, tab, isActive, hotkeyHint;

        for (i = 0; i < tabs.length; i++) {
            tab         =  tabs[i];
            isActive    =  tab.Key === activeViewKey;
            hotkeyHint  =  (tab.Hotkey && !isSecondary) ? ' (' + VghLantern__ViewportHost2d__Escape(tab.Hotkey) + ')' : '';

            html  +=  '<button type="button" class="' + CSS_TAB + (isActive ? ' ' + CSS_TAB_ACTIVE : '') + '"' +
                      ' ' + ATTR_VIEW_KEY + '="' + VghLantern__ViewportHost2d__Escape(tab.Key) + '"' +
                      ' role="tab" aria-selected="' + (isActive ? 'true' : 'false') + '"' +
                      ' title="' + VghLantern__ViewportHost2d__Escape(tab.Label) + hotkeyHint + '">' +
                      VghLantern__ViewportHost2d__Escape(tab.Label) +
                      '</button>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Viewport Toolbar Markup
    // ------------------------------------------------------------
    // Split 2D sits beside Fit so both viewport tools share one floating cluster.
    function VghLantern__ViewportHost2d__BuildToolbarMarkup(isDualVisible) {
        return '<div class="' + CSS_TOOLBAR + '">' +
                   '<button type="button" class="' + CSS_TOOL_BTN + (isDualVisible ? ' ' + CSS_TOOL_BTN_ACTIVE : '') + '"' +
                   ' ' + ATTR_ACTION + '="' + ACTION_TOGGLE_DUAL + '"' +
                   ' aria-pressed="' + (isDualVisible ? 'true' : 'false') + '"' +
                   ' title="Split 2D view to show plan and elevation together">Split 2D</button>' +
                   '<button type="button" class="' + CSS_TOOL_BTN + '" ' + ATTR_TOOL + '="' + TOOL_ZOOM_EXTENTS + '"' +
                   ' title="Zoom to fit (F)">Fit</button>' +
               '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Dual-Pane Scaffold Markup
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__BuildPanesMarkup(isDualVisible, secondaryKey) {
        var viewportCfg   =  VghLantern__ViewportHost2d__ViewportConfig();
        var isHorizontal  =  viewportCfg.DualViewOrientation === 'horizontal';
        var handleOrient  =  isHorizontal ? CSS_RESIZE_COL : CSS_RESIZE_ROW;
        var panesClass    =  CSS_PANES + (isDualVisible ? ' ' + CSS_PANES_DUAL : '') +
                             (isDualVisible && isHorizontal ? ' ' + CSS_PANES_DUAL_HORZ : '');
        var dualHidden    =  isDualVisible ? '' : ' ' + CSS_HIDDEN;

        return '<div class="' + panesClass + '">' +
                   '<div class="' + CSS_PANE + ' ' + CSS_PANE_PRIMARY + '">' +
                       '<div class="' + CSS_CANVAS + '" data-vgh-pane="primary"></div>' +
                   '</div>' +
                   '<div class="' + CSS_RESIZE_HANDLE + ' ' + handleOrient + dualHidden + '"' +
                   ' ' + ATTR_RESIZE + '="' + RESIZE_DUAL_2D + '"' +
                   ' role="separator" title="Drag to resize"></div>' +
                   '<div class="' + CSS_PANE + ' ' + CSS_PANE_SECONDARY + dualHidden + '">' +
                       VghLantern__ViewportHost2d__BuildTabsMarkup(secondaryKey, STRIP_SECONDARY) +
                       '<div class="' + CSS_CANVAS + '" data-vgh-pane="secondary"></div>' +
                   '</div>' +
               '</div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount and Redraw
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Mount an Env2d Surface Into a Canvas Element
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__MountSurfaceInto(canvasElement, viewKey) {
        var Pipeline  =  window.VghLantern__Env2d__RenderPipeline;
        if (!Pipeline || !canvasElement) return null;

        return Pipeline.VghLantern__Env2d__RenderPipeline__Mount(canvasElement, viewKey);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Dispose One Surface Handle Safely
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__DisposeSurface(surface) {
        var Pipeline  =  window.VghLantern__Env2d__RenderPipeline;
        if (Pipeline && surface) Pipeline.VghLantern__Env2d__RenderPipeline__Dispose(surface);
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Redraw All Mounted Surfaces from Solved Geometry
    // ------------------------------------------------------------
    async function VghLantern__ViewportHost2d__Redraw() {
        var Pipeline      =  window.VghLantern__Env2d__RenderPipeline;
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!Pipeline || !StateManager) return;

        var skeleton  =  StateManager.VghLantern__StateManager__GetSolvedSkeleton();
        var barSet    =  StateManager.VghLantern__StateManager__GetSolvedBarSet();
        var lantern   =  StateManager.VghLantern__StateManager__GetCurrentLantern();

        if (VghLantern__ViewportHost2d__PrimarySurface) {
            await Pipeline.VghLantern__Env2d__RenderPipeline__Render(
                VghLantern__ViewportHost2d__PrimarySurface, skeleton, barSet, lantern
            );
        }

        if (VghLantern__ViewportHost2d__SecondarySurface) {
            await Pipeline.VghLantern__Env2d__RenderPipeline__Render(
                VghLantern__ViewportHost2d__SecondarySurface, skeleton, barSet, lantern
            );
        }

        VghLantern__ViewportHost2d__QueueFraming();                          // <-- No-op once the framing has settled
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Switch the Primary Surface to a Different View
    // ------------------------------------------------------------
    async function VghLantern__ViewportHost2d__ApplyViewKey(viewKey) {
        var Pipeline  =  window.VghLantern__Env2d__RenderPipeline;
        if (!Pipeline || !VghLantern__ViewportHost2d__PrimarySurface || !viewKey) return;

        // Re-emitting the current view is not a change. Rebuilding the surface for
        // it would throw away the user's pan and zoom for no reason at all.
        if (viewKey === VghLantern__ViewportHost2d__PrimaryViewKey) {
            VghLantern__ViewportHost2d__MarkActiveTab(viewKey, STRIP_PRIMARY);
            return;
        }

        VghLantern__ViewportHost2d__PrimarySurface  =  Pipeline.VghLantern__Env2d__RenderPipeline__SetView(
            VghLantern__ViewportHost2d__PrimarySurface, viewKey
        );
        VghLantern__ViewportHost2d__PrimaryViewKey  =  viewKey;
        VghLantern__ViewportHost2d__HasEqualisedOnce  =  false;              // <-- A fresh surface needs a fresh shared scale

        VghLantern__ViewportHost2d__MarkActiveTab(viewKey, STRIP_PRIMARY);

        // Keep the dual panes useful: if the user picks the view the lower pane is
        // already showing, nudge that pane onto another one. It redraws both
        // surfaces itself, so this call is the whole of the work left to do.
        if (VghLantern__ViewportHost2d__IsDualVisible &&
            VghLantern__ViewportHost2d__SecondaryViewKey === viewKey) {
            await VghLantern__ViewportHost2d__SetSecondaryView(
                VghLantern__ViewportHost2d__DefaultSecondaryFor(viewKey)
            );
            return;
        }

        await VghLantern__ViewportHost2d__Redraw();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Switch or Mount the Secondary Surface
    // ------------------------------------------------------------
    async function VghLantern__ViewportHost2d__SetSecondaryView(viewKey) {
        var Pipeline  =  window.VghLantern__Env2d__RenderPipeline;
        if (!Pipeline || !viewKey) return;

        var isChange  =  viewKey !== VghLantern__ViewportHost2d__SecondaryViewKey;

        VghLantern__ViewportHost2d__SecondaryViewKey  =  viewKey;
        VghLantern__ViewportHost2d__MarkActiveTab(viewKey, STRIP_SECONDARY);

        if (!VghLantern__ViewportHost2d__IsDualVisible || !VghLantern__ViewportHost2d__SecondaryCanvas) return;

        if (VghLantern__ViewportHost2d__SecondarySurface) {
            if (!isChange) return;                                           // <-- Already showing it; leave the user's zoom alone
            VghLantern__ViewportHost2d__SecondarySurface  =  Pipeline.VghLantern__Env2d__RenderPipeline__SetView(
                VghLantern__ViewportHost2d__SecondarySurface, viewKey
            );
        } else {
            VghLantern__ViewportHost2d__SecondarySurface  =  VghLantern__ViewportHost2d__MountSurfaceInto(
                VghLantern__ViewportHost2d__SecondaryCanvas, viewKey
            );
        }

        VghLantern__ViewportHost2d__HasEqualisedOnce  =  false;              // <-- A fresh surface needs a fresh shared scale
        await VghLantern__ViewportHost2d__Redraw();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move the Active Class Onto the Named Tab of One Strip
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__MarkActiveTab(viewKey, stripRole) {
        if (!VghLantern__ViewportHost2d__HostElement) return;

        var strip  =  VghLantern__ViewportHost2d__HostElement.querySelector(
            '[' + ATTR_TAB_STRIP + '="' + stripRole + '"]'
        );
        if (!strip) return;

        var tabs  =  strip.querySelectorAll('.' + CSS_TAB);
        var i, isActive;

        for (i = 0; i < tabs.length; i++) {
            isActive  =  tabs[i].getAttribute(ATTR_VIEW_KEY) === viewKey;
            tabs[i].classList.toggle(CSS_TAB_ACTIVE, isActive);
            tabs[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply Dual Pane Visibility and Mount Secondary On First Show
    // ------------------------------------------------------------
    async function VghLantern__ViewportHost2d__ApplyDualVisibility(isVisible) {
        var hostElement  =  VghLantern__ViewportHost2d__HostElement;
        if (!hostElement) return;

        var panesEl       =  hostElement.querySelector('.' + CSS_PANES);
        var secondaryPane =  hostElement.querySelector('.' + CSS_PANE_SECONDARY);
        var handleEl      =  hostElement.querySelector('[' + ATTR_RESIZE + '="' + RESIZE_DUAL_2D + '"]');
        var dualBtn       =  hostElement.querySelector('[' + ATTR_ACTION + '="' + ACTION_TOGGLE_DUAL + '"]');
        var viewportCfg   =  VghLantern__ViewportHost2d__ViewportConfig();
        var isHorizontal  =  viewportCfg.DualViewOrientation === 'horizontal';

        VghLantern__ViewportHost2d__IsDualVisible  =  !!isVisible;

        if (panesEl) {
            panesEl.classList.toggle(CSS_PANES_DUAL, isVisible);
            panesEl.classList.toggle(CSS_PANES_DUAL_HORZ, isVisible && isHorizontal);
            panesEl.style.setProperty(VAR_DUAL_SHARE, VghLantern__ViewportHost2d__DualSharePct + '%');
        }

        if (secondaryPane) secondaryPane.classList.toggle(CSS_HIDDEN, !isVisible);
        if (handleEl) {
            handleEl.classList.toggle(CSS_HIDDEN, !isVisible);
            handleEl.classList.toggle(CSS_RESIZE_COL, isHorizontal);
            handleEl.classList.toggle(CSS_RESIZE_ROW, !isHorizontal);
        }
        if (dualBtn) {
            dualBtn.classList.toggle(CSS_TOOL_BTN_ACTIVE, isVisible);
            dualBtn.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
        }

        if (isVisible) {
            if (VghLantern__ViewportHost2d__SecondaryViewKey === VghLantern__ViewportHost2d__ActiveViewKey()) {
                VghLantern__ViewportHost2d__SecondaryViewKey  =
                    VghLantern__ViewportHost2d__DefaultSecondaryFor(VghLantern__ViewportHost2d__ActiveViewKey());
            }

            // A second pane appearing halves the height of the first, so the pair
            // is framed again from scratch rather than left on a stale scale.
            VghLantern__ViewportHost2d__HasEqualisedOnce  =  false;
            await VghLantern__ViewportHost2d__SetSecondaryView(VghLantern__ViewportHost2d__SecondaryViewKey);
            return;
        }

        VghLantern__ViewportHost2d__SecondarySurface  =
            VghLantern__ViewportHost2d__DisposeSurface(VghLantern__ViewportHost2d__SecondarySurface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shared Drawing Scale
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Collect Every Surface Currently Mounted
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__MountedSurfaces() {
        var surfaces  =  [];
        if (VghLantern__ViewportHost2d__PrimarySurface)   surfaces.push(VghLantern__ViewportHost2d__PrimarySurface);
        if (VghLantern__ViewportHost2d__SecondarySurface) surfaces.push(VghLantern__ViewportHost2d__SecondarySurface);
        return surfaces;
    }
    // ------------------------------------------------------------


    // FUNCTION | Fit Every Pane, Then Put Them All on One Drawing Scale
    // ------------------------------------------------------------
    // Each pane is fitted to the solved geometry first, which gives each its own
    // scale. The tightest of those is then applied to all of them, so a plan and
    // an elevation of the same lantern are drawn the same size across, exactly as
    // they would be on a sheet. Taking the tightest, never the loosest, means no
    // pane is pushed past its own frame by the shared value.
    function VghLantern__ViewportHost2d__ApplySharedScale() {
        var Pipeline      =  window.VghLantern__Env2d__RenderPipeline;
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!Pipeline || !StateManager) return false;

        var skeleton  =  StateManager.VghLantern__StateManager__GetSolvedSkeleton();
        var surfaces  =  VghLantern__ViewportHost2d__MountedSurfaces();
        if (!skeleton || surfaces.length === 0) return false;

        var sharedScale  =  Infinity;
        var i, scale;

        for (i = 0; i < surfaces.length; i++) {
            Pipeline.VghLantern__Env2d__RenderPipeline__ZoomExtents(surfaces[i], skeleton);
            scale  =  Pipeline.VghLantern__Env2d__RenderPipeline__GetViewScale(surfaces[i]);
            if (scale > 0 && scale < sharedScale) sharedScale  =  scale;
        }

        // Zero scales mean the panes have no size yet - the editor is mid-layout or
        // off screen. Reporting failure leaves the caller's retry flag down so the
        // next redraw tries again rather than baking in a meaningless frame.
        if (!isFinite(sharedScale) || sharedScale <= 0) return false;

        // Everything annotated sits outside the skeleton the fit measured, so the
        // shared scale steps back a little further before it is applied.
        sharedScale  =  sharedScale * (1 - VghLantern__ViewportHost2d__FitMarginFactor());
        if (!(sharedScale > 0)) return false;

        for (i = 0; i < surfaces.length; i++) {
            Pipeline.VghLantern__Env2d__RenderPipeline__ApplyViewScale(surfaces[i], sharedScale);
        }

        return true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Queue the Framing Pass for the Next Frame
    // ------------------------------------------------------------
    // Deferred by one frame deliberately. The editor applies the 3D split share
    // immediately after this host mounts, so a fit measured now would be measured
    // against a pane width that is about to change out from under it.
    function VghLantern__ViewportHost2d__QueueFraming() {
        if (VghLantern__ViewportHost2d__HasEqualisedOnce) return;
        if (VghLantern__ViewportHost2d__IsFitQueued) return;

        VghLantern__ViewportHost2d__IsFitQueued  =  true;

        window.requestAnimationFrame(function() {
            VghLantern__ViewportHost2d__IsFitQueued  =  false;
            if (VghLantern__ViewportHost2d__HasEqualisedOnce) return;
            VghLantern__ViewportHost2d__HasEqualisedOnce  =  VghLantern__ViewportHost2d__ApplySharedScale();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dual Share Resize
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Push Live Dual Share Into the CSS Variable
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__SetDualShare(sharePct) {
        var ConfigLoader   =  window.VghLantern__AppCore__ConfigLoader;
        var viewportCfg    =  VghLantern__ViewportHost2d__ViewportConfig();
        var VIEWPORT_LABEL =  'Na__LanternEditor__Config.json -> VghLantern__LanternEditor__Config__Viewport2d';
        var minPct         =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(viewportCfg, 'DualViewShareMinPct', VIEWPORT_LABEL);
        var maxPct         =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(viewportCfg, 'DualViewShareMaxPct', VIEWPORT_LABEL);
        var panesEl      =  VghLantern__ViewportHost2d__HostElement
            ? VghLantern__ViewportHost2d__HostElement.querySelector('.' + CSS_PANES)
            : null;

        VghLantern__ViewportHost2d__DualSharePct  =  VghLantern__ViewportHost2d__Clamp(sharePct, minPct, maxPct);
        if (panesEl) panesEl.style.setProperty(VAR_DUAL_SHARE, VghLantern__ViewportHost2d__DualSharePct + '%');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply a Drag Delta for the Dual Share Handle
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__ApplyDualResizeDrag(clientX, clientY) {
        var drag     =  VghLantern__ViewportHost2d__ActiveResize;
        var panesEl  =  VghLantern__ViewportHost2d__HostElement
            ? VghLantern__ViewportHost2d__HostElement.querySelector('.' + CSS_PANES)
            : null;
        if (!drag || !panesEl) return;

        var rect  =  panesEl.getBoundingClientRect();
        var sharePct;

        if (drag.IsHorizontal) {
            sharePct  =  ((rect.right - clientX) / rect.width) * 100;
        } else {
            sharePct  =  ((rect.bottom - clientY) / rect.height) * 100;
        }

        VghLantern__ViewportHost2d__SetDualShare(sharePct);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | End the Dual Share Drag
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__EndDualResizeDrag() {
        var drag  =  VghLantern__ViewportHost2d__ActiveResize;
        if (!drag) return;

        if (drag.HandleEl) drag.HandleEl.classList.remove(CSS_RESIZE_DRAG);
        document.body.classList.remove(CSS_BODY_RESIZING, CSS_BODY_RESIZE_ROW);
        VghLantern__ViewportHost2d__ActiveResize  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Binding
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Route a Tab Click to the Pane Its Strip Belongs To
    // ------------------------------------------------------------
    // The upper strip writes to StateManager because the active 2D view is global -
    // the hotkeys and the drawing editor both read it. The lower strip is editor
    // chrome only and stays local, so it must never touch that state.
    function VghLantern__ViewportHost2d__OnTabClicked(tabEl) {
        var viewKey  =  tabEl.getAttribute(ATTR_VIEW_KEY);
        var stripEl  =  tabEl.closest('[' + ATTR_TAB_STRIP + ']');
        if (!viewKey) return;

        if (stripEl && stripEl.getAttribute(ATTR_TAB_STRIP) === STRIP_SECONDARY) {
            void VghLantern__ViewportHost2d__SetSecondaryView(viewKey);
            return;
        }

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager) StateManager.VghLantern__StateManager__SetActiveView2d(viewKey);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Delegated Tab, Dual Toggle and Toolbar Clicks
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__BindDelegated() {
        if (!VghLantern__ViewportHost2d__HostElement) return;

        VghLantern__ViewportHost2d__HostElement.addEventListener('click', function(ev) {
            // Matched by tab class, never by the view-key attribute: the Env2d root
            // carries that attribute too, so an attribute match would make every
            // pan on the drawing surface end in a view switch.
            var tabEl  =  ev.target.closest('.' + CSS_TAB);
            if (tabEl) {
                VghLantern__ViewportHost2d__OnTabClicked(tabEl);
                return;
            }

            var actionEl  =  ev.target.closest('[' + ATTR_ACTION + '="' + ACTION_TOGGLE_DUAL + '"]');
            if (actionEl) {
                void VghLantern__ViewportHost2d__ApplyDualVisibility(!VghLantern__ViewportHost2d__IsDualVisible);
                return;
            }

            var toolEl  =  ev.target.closest('[' + ATTR_TOOL + ']');
            if (toolEl && toolEl.getAttribute(ATTR_TOOL) === TOOL_ZOOM_EXTENTS) {
                VghLantern__ViewportHost2d__ZoomExtents();
            }
        });

        VghLantern__ViewportHost2d__HostElement.addEventListener('pointerdown', function(ev) {
            var handleEl  =  ev.target.closest('[' + ATTR_RESIZE + '="' + RESIZE_DUAL_2D + '"]');
            if (!handleEl || handleEl.classList.contains(CSS_HIDDEN)) return;

            var isHorizontal  =  handleEl.classList.contains(CSS_RESIZE_COL);

            VghLantern__ViewportHost2d__ActiveResize  =  {
                HandleEl     : handleEl,
                IsHorizontal : isHorizontal
            };

            handleEl.classList.add(CSS_RESIZE_DRAG);
            document.body.classList.add(CSS_BODY_RESIZING);
            if (!isHorizontal) document.body.classList.add(CSS_BODY_RESIZE_ROW);

            function onMove(moveEv) {
                VghLantern__ViewportHost2d__ApplyDualResizeDrag(moveEv.clientX, moveEv.clientY);
            }

            function onUp() {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);
                VghLantern__ViewportHost2d__EndDualResizeDrag();
            }

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onUp);

            if (handleEl.setPointerCapture) handleEl.setPointerCapture(ev.pointerId);
            ev.preventDefault();
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Subscribe to the State Events This Host Reacts To
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__Subscribe() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager || VghLantern__ViewportHost2d__IsSubscribed) return;

        StateManager.VghLantern__StateManager__On('geometrySolved', function() {
            void VghLantern__ViewportHost2d__Redraw();
        });

        StateManager.VghLantern__StateManager__On('activeView2dChanged', function(viewKey) {
            void VghLantern__ViewportHost2d__ApplyViewKey(viewKey);
        });

        VghLantern__ViewportHost2d__IsSubscribed  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | Mount the 2D Viewport Host Into a Panel
    // ------------------------------------------------------------
    async function VghLantern__ViewportHost2d__Mount(hostElement) {
        if (!hostElement) return;

        var ConfigLoader   =  window.VghLantern__AppCore__ConfigLoader;
        var viewportCfg    =  VghLantern__ViewportHost2d__ViewportConfig();
        var activeViewKey  =  VghLantern__ViewportHost2d__ActiveViewKey();
        var isFirstMount   =  VghLantern__ViewportHost2d__HostElement !== hostElement;

        VghLantern__ViewportHost2d__DualSharePct      =
            ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
                viewportCfg, 'DualViewSharePct', VIEWPORT_CFG_LABEL
            );
        VghLantern__ViewportHost2d__SecondaryViewKey  =
            VghLantern__ViewportHost2d__DefaultSecondaryFor(activeViewKey);
        VghLantern__ViewportHost2d__IsDualVisible  =
            ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(
                viewportCfg, 'DualViewEnabledByDefault', VIEWPORT_CFG_LABEL
            );
        VghLantern__ViewportHost2d__PrimaryViewKey    =  activeViewKey;
        VghLantern__ViewportHost2d__HasEqualisedOnce  =  false;              // <-- Fresh surfaces, so the framing is computed again

        hostElement.classList.add(CSS_WRAP);
        hostElement.innerHTML  =
            VghLantern__ViewportHost2d__BuildTabsMarkup(activeViewKey, STRIP_PRIMARY) +
            VghLantern__ViewportHost2d__BuildPanesMarkup(
                VghLantern__ViewportHost2d__IsDualVisible,
                VghLantern__ViewportHost2d__SecondaryViewKey
            ) +
            VghLantern__ViewportHost2d__BuildToolbarMarkup(VghLantern__ViewportHost2d__IsDualVisible);

        VghLantern__ViewportHost2d__HostElement      =  hostElement;
        VghLantern__ViewportHost2d__PrimaryCanvas    =  hostElement.querySelector('[data-vgh-pane="primary"]');
        VghLantern__ViewportHost2d__SecondaryCanvas  =  hostElement.querySelector('[data-vgh-pane="secondary"]');

        var panesEl  =  hostElement.querySelector('.' + CSS_PANES);
        if (panesEl) panesEl.style.setProperty(VAR_DUAL_SHARE, VghLantern__ViewportHost2d__DualSharePct + '%');

        if (isFirstMount) VghLantern__ViewportHost2d__BindDelegated();
        VghLantern__ViewportHost2d__Subscribe();

        VghLantern__ViewportHost2d__PrimarySurface  =
            VghLantern__ViewportHost2d__DisposeSurface(VghLantern__ViewportHost2d__PrimarySurface);
        VghLantern__ViewportHost2d__SecondarySurface  =
            VghLantern__ViewportHost2d__DisposeSurface(VghLantern__ViewportHost2d__SecondarySurface);

        VghLantern__ViewportHost2d__PrimarySurface  =  VghLantern__ViewportHost2d__MountSurfaceInto(
            VghLantern__ViewportHost2d__PrimaryCanvas, activeViewKey
        );

        if (VghLantern__ViewportHost2d__IsDualVisible) {
            await VghLantern__ViewportHost2d__ApplyDualVisibility(true);
        } else {
            await VghLantern__ViewportHost2d__Redraw();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Zoom All Mounted Surfaces to Fit, Back Onto One Drawing Scale
    // ------------------------------------------------------------
    // The Fit button is the way back to the framing the editor opened with, so it
    // reproduces it exactly rather than fitting each pane in isolation.
    function VghLantern__ViewportHost2d__ZoomExtents() {
        VghLantern__ViewportHost2d__HasEqualisedOnce  =  VghLantern__ViewportHost2d__ApplySharedScale();
    }
    // ------------------------------------------------------------


    // FUNCTION | Return the Live Primary Surface Handle
    // ------------------------------------------------------------
    // The drawing editor serialises this surface to SVG rather than re-solving,
    // so the sheet always shows precisely what the user approved on screen.
    function VghLantern__ViewportHost2d__GetSurface() {
        return VghLantern__ViewportHost2d__PrimarySurface;
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose All Mounted Surfaces
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__Dispose() {
        VghLantern__ViewportHost2d__PrimarySurface    =
            VghLantern__ViewportHost2d__DisposeSurface(VghLantern__ViewportHost2d__PrimarySurface);
        VghLantern__ViewportHost2d__SecondarySurface  =
            VghLantern__ViewportHost2d__DisposeSurface(VghLantern__ViewportHost2d__SecondarySurface);

        VghLantern__ViewportHost2d__PrimaryCanvas    =  null;
        VghLantern__ViewportHost2d__SecondaryCanvas  =  null;
        VghLantern__ViewportHost2d__PrimaryViewKey   =  null;
        VghLantern__ViewportHost2d__HasEqualisedOnce =  false;                // <-- The next mount frames from scratch
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ViewportHost2d__Mount        : VghLantern__ViewportHost2d__Mount,
        VghLantern__ViewportHost2d__Redraw       : VghLantern__ViewportHost2d__Redraw,
        VghLantern__ViewportHost2d__ZoomExtents  : VghLantern__ViewportHost2d__ZoomExtents,
        VghLantern__ViewportHost2d__GetSurface   : VghLantern__ViewportHost2d__GetSurface,
        VghLantern__ViewportHost2d__Dispose      : VghLantern__ViewportHost2d__Dispose
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__ViewportHost__2d  =  VghLantern__LanternEditor__ViewportHost__2d;
