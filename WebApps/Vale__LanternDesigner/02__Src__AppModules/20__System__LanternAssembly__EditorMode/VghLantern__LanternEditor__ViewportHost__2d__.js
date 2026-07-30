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
   - Builds the chrome around the 2D surface inside the Lantern Editor: the plan /
     front elevation / side elevation tab strip and the viewport toolbar.
   - Optionally splits into a dual view so plan and an elevation can be compared at
     once, with an independent secondary view picker and a draggable share handle.
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
    const CSS_SECONDARY_BAR   =  'VghLantern__Editor__Viewport2dSecondaryBar';
    const CSS_SECONDARY_LABEL =  'VghLantern__Editor__Viewport2dSecondaryLabel';
    const CSS_SECONDARY_SELECT = 'VghLantern__Editor__Viewport2dSecondarySelect';
    const CSS_RESIZE_HANDLE   =  'VghLantern__Editor__ResizeHandle';
    const CSS_RESIZE_COL      =  'VghLantern__Editor__ResizeHandle--col';
    const CSS_RESIZE_ROW      =  'VghLantern__Editor__ResizeHandle--row';
    const CSS_RESIZE_DRAG     =  'VghLantern__Editor__ResizeHandle--dragging';
    const CSS_HIDDEN          =  'VghLantern__Editor__Hidden';
    const CSS_BODY_RESIZING   =  'VghLantern__Editor__IsResizing';
    const CSS_BODY_RESIZE_ROW =  'VghLantern__Editor__IsResizing--row';

    const ATTR_VIEW_KEY       =  'data-vgh-view';
    const ATTR_TOOL           =  'data-vgh-tool';
    const ATTR_ACTION         =  'data-vgh-action';
    const ATTR_RESIZE         =  'data-vgh-resize';

    const TOOL_ZOOM_EXTENTS   =  'zoomExtents';
    const ACTION_TOGGLE_DUAL  =  'toggleDual2d';
    const RESIZE_DUAL_2D      =  'dual2d';

    const VAR_DUAL_SHARE      =  '--VghLantern_Editor2dDualSharePct';
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

    const FALLBACK_DUAL_SHARE_PCT      =  50;
    const FALLBACK_DUAL_SHARE_MIN_PCT  =  25;
    const FALLBACK_DUAL_SHARE_MAX_PCT  =  75;
    const FALLBACK_SECONDARY_VIEW      =  'frontElevation';
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
    let VghLantern__ViewportHost2d__SecondaryViewKey  =  FALLBACK_SECONDARY_VIEW;
    let VghLantern__ViewportHost2d__DualSharePct      =  FALLBACK_DUAL_SHARE_PCT;
    let VghLantern__ViewportHost2d__ActiveResize      =  null;               // <-- Live dual-share drag state
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
        var viewportCfg  =  VghLantern__ViewportHost2d__ViewportConfig();
        var preferred    =  viewportCfg.DualViewSecondaryDefault || FALLBACK_SECONDARY_VIEW;
        if (preferred !== primaryKey) return preferred;

        var tabs  =  VghLantern__ViewportHost2d__ViewTabs();
        var i;
        for (i = 0; i < tabs.length; i++) {
            if (tabs[i].Key !== primaryKey) return tabs[i].Key;
        }
        return preferred;
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


    // SUB FUNCTION | Build the View Tab Strip Markup
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__BuildTabsMarkup(activeViewKey) {
        var tabs  =  VghLantern__ViewportHost2d__ViewTabs();
        var html  =  '<div class="' + CSS_TABS + '" role="tablist">';
        var i, tab, isActive, hotkeyHint;

        for (i = 0; i < tabs.length; i++) {
            tab         =  tabs[i];
            isActive    =  tab.Key === activeViewKey;
            hotkeyHint  =  tab.Hotkey ? ' (' + VghLantern__ViewportHost2d__Escape(tab.Hotkey) + ')' : '';

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


    // SUB FUNCTION | Build the Secondary Pane View Picker Markup
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__BuildSecondaryBarMarkup(selectedKey) {
        var tabs  =  VghLantern__ViewportHost2d__ViewTabs();
        var html  =  '<div class="' + CSS_SECONDARY_BAR + '">' +
                     '<span class="' + CSS_SECONDARY_LABEL + '">Second view</span>' +
                     '<select class="' + CSS_SECONDARY_SELECT + '" aria-label="Secondary 2D view">';
        var i, tab;

        for (i = 0; i < tabs.length; i++) {
            tab   =  tabs[i];
            html +=  '<option value="' + VghLantern__ViewportHost2d__Escape(tab.Key) + '"' +
                     (tab.Key === selectedKey ? ' selected' : '') + '>' +
                     VghLantern__ViewportHost2d__Escape(tab.Label) + '</option>';
        }

        return html + '</select></div>';
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
                       VghLantern__ViewportHost2d__BuildSecondaryBarMarkup(secondaryKey) +
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
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Switch the Primary Surface to a Different View
    // ------------------------------------------------------------
    async function VghLantern__ViewportHost2d__ApplyViewKey(viewKey) {
        var Pipeline  =  window.VghLantern__Env2d__RenderPipeline;
        if (!Pipeline || !VghLantern__ViewportHost2d__PrimarySurface) return;

        VghLantern__ViewportHost2d__PrimarySurface  =  Pipeline.VghLantern__Env2d__RenderPipeline__SetView(
            VghLantern__ViewportHost2d__PrimarySurface, viewKey
        );

        // Keep the dual panes useful: if the user picks the same view as secondary,
        // nudge secondary onto another available view.
        if (VghLantern__ViewportHost2d__IsDualVisible &&
            VghLantern__ViewportHost2d__SecondaryViewKey === viewKey) {
            VghLantern__ViewportHost2d__SetSecondaryView(
                VghLantern__ViewportHost2d__DefaultSecondaryFor(viewKey)
            );
        }

        VghLantern__ViewportHost2d__MarkActiveTab(viewKey);
        await VghLantern__ViewportHost2d__Redraw();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Switch or Mount the Secondary Surface
    // ------------------------------------------------------------
    async function VghLantern__ViewportHost2d__SetSecondaryView(viewKey) {
        var Pipeline  =  window.VghLantern__Env2d__RenderPipeline;
        if (!Pipeline || !viewKey) return;

        VghLantern__ViewportHost2d__SecondaryViewKey  =  viewKey;

        var selectEl  =  VghLantern__ViewportHost2d__HostElement
            ? VghLantern__ViewportHost2d__HostElement.querySelector('.' + CSS_SECONDARY_SELECT)
            : null;
        if (selectEl) selectEl.value  =  viewKey;

        if (!VghLantern__ViewportHost2d__IsDualVisible || !VghLantern__ViewportHost2d__SecondaryCanvas) return;

        if (VghLantern__ViewportHost2d__SecondarySurface) {
            VghLantern__ViewportHost2d__SecondarySurface  =  Pipeline.VghLantern__Env2d__RenderPipeline__SetView(
                VghLantern__ViewportHost2d__SecondarySurface, viewKey
            );
        } else {
            VghLantern__ViewportHost2d__SecondarySurface  =  VghLantern__ViewportHost2d__MountSurfaceInto(
                VghLantern__ViewportHost2d__SecondaryCanvas, viewKey
            );
        }

        await VghLantern__ViewportHost2d__Redraw();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move the Active Class Onto the Named Tab
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__MarkActiveTab(viewKey) {
        if (!VghLantern__ViewportHost2d__HostElement) return;

        var tabs  =  VghLantern__ViewportHost2d__HostElement.querySelectorAll('.' + CSS_TAB);
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
            await VghLantern__ViewportHost2d__SetSecondaryView(VghLantern__ViewportHost2d__SecondaryViewKey);
            return;
        }

        VghLantern__ViewportHost2d__SecondarySurface  =
            VghLantern__ViewportHost2d__DisposeSurface(VghLantern__ViewportHost2d__SecondarySurface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dual Share Resize
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Push Live Dual Share Into the CSS Variable
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__SetDualShare(sharePct) {
        var viewportCfg  =  VghLantern__ViewportHost2d__ViewportConfig();
        var minPct       =  Number(viewportCfg.DualViewShareMinPct) || FALLBACK_DUAL_SHARE_MIN_PCT;
        var maxPct       =  Number(viewportCfg.DualViewShareMaxPct) || FALLBACK_DUAL_SHARE_MAX_PCT;
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

    // SUB FUNCTION | Bind Delegated Tab, Dual Toggle and Toolbar Clicks
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__BindDelegated() {
        if (!VghLantern__ViewportHost2d__HostElement) return;

        VghLantern__ViewportHost2d__HostElement.addEventListener('click', function(ev) {
            var tabEl  =  ev.target.closest('[' + ATTR_VIEW_KEY + ']');
            if (tabEl) {
                var StateManager  =  window.VghLantern__AppCore__StateManager;
                if (StateManager) StateManager.VghLantern__StateManager__SetActiveView2d(tabEl.getAttribute(ATTR_VIEW_KEY));
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

        VghLantern__ViewportHost2d__HostElement.addEventListener('change', function(ev) {
            if (!ev.target.classList.contains(CSS_SECONDARY_SELECT)) return;
            void VghLantern__ViewportHost2d__SetSecondaryView(ev.target.value);
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

        var viewportCfg    =  VghLantern__ViewportHost2d__ViewportConfig();
        var activeViewKey  =  VghLantern__ViewportHost2d__ActiveViewKey();
        var isFirstMount   =  VghLantern__ViewportHost2d__HostElement !== hostElement;

        VghLantern__ViewportHost2d__DualSharePct      =
            Number(viewportCfg.DualViewSharePct) || FALLBACK_DUAL_SHARE_PCT;
        VghLantern__ViewportHost2d__SecondaryViewKey  =
            VghLantern__ViewportHost2d__DefaultSecondaryFor(activeViewKey);
        VghLantern__ViewportHost2d__IsDualVisible  =
            viewportCfg.DualViewEnabledByDefault === true;

        hostElement.classList.add(CSS_WRAP);
        hostElement.innerHTML  =
            VghLantern__ViewportHost2d__BuildTabsMarkup(activeViewKey) +
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


    // FUNCTION | Zoom All Mounted Surfaces to Fit the Solved Geometry
    // ------------------------------------------------------------
    function VghLantern__ViewportHost2d__ZoomExtents() {
        var Pipeline      =  window.VghLantern__Env2d__RenderPipeline;
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!Pipeline || !StateManager) return;

        var skeleton  =  StateManager.VghLantern__StateManager__GetSolvedSkeleton();

        if (VghLantern__ViewportHost2d__PrimarySurface) {
            Pipeline.VghLantern__Env2d__RenderPipeline__ZoomExtents(
                VghLantern__ViewportHost2d__PrimarySurface, skeleton
            );
        }

        if (VghLantern__ViewportHost2d__SecondarySurface) {
            Pipeline.VghLantern__Env2d__RenderPipeline__ZoomExtents(
                VghLantern__ViewportHost2d__SecondarySurface, skeleton
            );
        }
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
