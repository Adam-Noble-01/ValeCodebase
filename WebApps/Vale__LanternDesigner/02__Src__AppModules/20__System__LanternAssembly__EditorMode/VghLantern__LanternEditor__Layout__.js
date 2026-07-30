/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | LAYOUT
   =============================================================================

   FILE       : VghLantern__LanternEditor__Layout__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Layout
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Assemble and coordinate the Lantern Editor mode
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds the editor scaffolding once: the global bar, the preview panel with its
     2D and optional 3D hosts, and the controls panel with its warnings strip.
   - Coordinates the four modules that fill those slots - ViewportHost2d,
     ViewportHost3d, ControlPanel and WarningSystem - without doing any of their
     work itself.
   - Applies every layout dimension from editor config as CSS custom properties, so
     the split proportions are configurable without touching the stylesheet.
   - Owns the lantern tab strip: which lantern of a multi-lantern project is being
     edited, and adding another one.
   - Owns the draggable resize handles between the 2D/3D preview panes and between
     the preview column and the controls column.

   -----------------------------------------------------------------------------

   WHY INIT AND REFRESH ARE SEPARATE:
   Init builds DOM and attaches delegated listeners; it must run exactly once or the
   listeners stack. Refresh redraws content and runs on every mode entry. AppCore
   awaits Init then calls Refresh, and Init is idempotent, so re-entry is safe.

   WHY THE 3D PANEL IS MOUNTED LAZILY:
   Mounting the 3D host creates a WebGL context and a material library. Doing that
   on editor entry would tax every session for a feature most sizing work never
   needs, so the panel is only mounted the first time it is actually shown.

   ============================================================================= */

// =============================================================================
// REGION | Lantern Editor Layout Module
// =============================================================================

const VghLantern__LanternEditor__Layout = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Host Element IDs From the App Shell
    // ------------------------------------------------------------
    const ID_CONTAINER      =  'VghLantern__LanternEditor__Container';
    const ID_GLOBAL_BAR     =  'VghLantern__LanternEditor__GlobalBar';
    const ID_SPLIT_LAYOUT   =  'VghLantern__LanternEditor__SplitLayout';
    const ID_PREVIEW_PANEL  =  'VghLantern__LanternEditor__PreviewPanel';
    const ID_CONTROLS_PANEL =  'VghLantern__LanternEditor__ControlsPanel';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_VIEWPORT_2D    =  'VghLantern__Editor__Viewport2dHost';
    const CSS_VIEWPORT_3D    =  'VghLantern__Editor__Viewport3dHost';
    const CSS_WARNINGS_HOST  =  'VghLantern__Editor__WarningsHost';
    const CSS_CONTROLS_HOST  =  'VghLantern__Editor__ControlsHost';

    const CSS_BAR_META       =  'VghLantern__Editor__BarMeta';
    const CSS_BAR_TITLE      =  'VghLantern__Editor__BarTitle';
    const CSS_BAR_SUBTITLE   =  'VghLantern__Editor__BarSubtitle';
    const CSS_BAR_ACTIONS    =  'VghLantern__Editor__BarActions';
    const CSS_LANTERN_TABS   =  'VghLantern__Editor__LanternTabs';
    const CSS_LANTERN_TAB    =  'VghLantern__Editor__LanternTab';
    const CSS_TAB_ACTIVE     =  'VghLantern__Editor__LanternTab--active';
    const CSS_BAR_BTN        =  'VghLantern__Editor__BarBtn';
    const CSS_BTN_ACTIVE     =  'VghLantern__Editor__BarBtn--active';

    const CSS_SPLIT_VERT     =  'VghLantern__Editor__Preview--splitVertical';
    const CSS_SPLIT_HORZ     =  'VghLantern__Editor__Preview--splitHorizontal';
    const CSS_HIDDEN         =  'VghLantern__Editor__Hidden';
    const CSS_EMPTY_STATE    =  'VghLantern__Editor__EmptyState';

    const CSS_RESIZE_HANDLE  =  'VghLantern__Editor__ResizeHandle';
    const CSS_RESIZE_COL     =  'VghLantern__Editor__ResizeHandle--col';
    const CSS_RESIZE_ROW     =  'VghLantern__Editor__ResizeHandle--row';
    const CSS_RESIZE_DRAG    =  'VghLantern__Editor__ResizeHandle--dragging';
    const CSS_BODY_RESIZING  =  'VghLantern__Editor__IsResizing';
    const CSS_BODY_RESIZE_ROW = 'VghLantern__Editor__IsResizing--row';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Data Attributes and Action Keys
    // ------------------------------------------------------------
    const ATTR_LANTERN_INDEX  =  'data-vgh-lantern-index';
    const ATTR_ACTION         =  'data-vgh-action';
    const ATTR_RESIZE         =  'data-vgh-resize';

    const ACTION_ADD_LANTERN  =  'addLantern';
    const ACTION_TOGGLE_3D    =  'toggle3d';

    const RESIZE_CONTROLS     =  'controls';                                  // <-- Preview column vs controls column
    const RESIZE_PREVIEW_3D   =  'preview3d';                                 // <-- 2D drawing vs in-editor 3D
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Layout CSS Custom Property Names
    // ------------------------------------------------------------
    // Written onto the container so config drives the split without the stylesheet
    // ever hardcoding a proportion.
    const VAR_CONTROLS_WIDTH   =  '--VghLantern_EditorControlsWidth';
    const VAR_PREVIEW_MIN      =  '--VghLantern_EditorPreviewMinWidth';
    const VAR_SPLIT_3D_SHARE   =  '--VghLantern_Editor3dSharePct';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Layout Values
    // ------------------------------------------------------------
    const FALLBACK_CONTROLS_MIN_PX      =  320;
    const FALLBACK_CONTROLS_MAX_PX      =  640;
    const FALLBACK_CONTROLS_WIDTH_PX    =  420;
    const FALLBACK_PREVIEW_MIN_PX      =  280;
    const FALLBACK_3D_SHARE_PCT        =  40;
    const FALLBACK_3D_SHARE_MIN_PCT    =  25;
    const FALLBACK_3D_SHARE_MAX_PCT    =  70;

    const EMPTY_PROJECT_MESSAGE          =  'No project loaded.';
    const CONTROLS_UNAVAILABLE_MESSAGE   =  'The control panel module failed to load.';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Build and Mount Flags
    // ------------------------------------------------------------
    let VghLantern__EditorLayout__IsBuilt         =  false;                  // <-- Scaffolding built and listeners bound
    let VghLantern__EditorLayout__Is3dMounted     =  false;                  // <-- 3D host has paid its WebGL cost
    // ------------------------------------------------------------


    // MODULE VARIABLES | Live Split Proportions
    // ------------------------------------------------------------
    // Seeded from config on Init, then overwritten by the resize handles for the
    // rest of the session so a drag is not wiped by the next Refresh.
    let VghLantern__EditorLayout__ControlsWidthPx  =  FALLBACK_CONTROLS_WIDTH_PX;
    let VghLantern__EditorLayout__Split3dSharePct  =  FALLBACK_3D_SHARE_PCT;
    let VghLantern__EditorLayout__ActiveResize     =  null;                  // <-- Live drag state, or null when idle
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and State Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Editor Config Block
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__EditorConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('LanternEditor') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Editor Layout Config Block
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__LayoutConfig() {
        return VghLantern__EditorLayout__EditorConfig()['VghLantern__LanternEditor__Config__Layout'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Lantern Array of the Current Project
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__Lanterns() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
        if (!project) return null;

        var lanterns  =  project['VghLantern__ProjectFile__Lanterns'];
        return Array.isArray(lanterns) ? lanterns : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scaffolding Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Attribute and Content Use
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp a Number Between Inclusive Bounds
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__Clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply the Configured Layout Proportions to the Container
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__ApplyLayoutVariables() {
        var container  =  document.getElementById(ID_CONTAINER);
        if (!container) return;

        var layoutCfg  =  VghLantern__EditorLayout__LayoutConfig();

        var controlsMin    =  Number(layoutCfg.ControlsPanelMinWidthPx)     || FALLBACK_CONTROLS_MIN_PX;
        var controlsMax    =  Number(layoutCfg.ControlsPanelMaxWidthPx)     || FALLBACK_CONTROLS_MAX_PX;
        var controlsWidth  =  Number(layoutCfg.ControlsPanelDefaultWidthPx) || FALLBACK_CONTROLS_WIDTH_PX;
        var previewMin     =  Number(layoutCfg.PreviewPanelMinWidthPx)      || FALLBACK_PREVIEW_MIN_PX;
        var split3dShare   =  Number(layoutCfg.Split3dSharePct)             || FALLBACK_3D_SHARE_PCT;

        // Seed live values from config only on the first apply; later calls keep
        // whatever the user last dragged to.
        if (!VghLantern__EditorLayout__IsBuilt) {
            VghLantern__EditorLayout__ControlsWidthPx  =  VghLantern__EditorLayout__Clamp(controlsWidth, controlsMin, controlsMax);
            VghLantern__EditorLayout__Split3dSharePct  =  split3dShare;
        }

        container.style.setProperty(VAR_CONTROLS_WIDTH,  VghLantern__EditorLayout__ControlsWidthPx + 'px');
        container.style.setProperty(VAR_PREVIEW_MIN,    previewMin + 'px');
        container.style.setProperty(VAR_SPLIT_3D_SHARE, VghLantern__EditorLayout__Split3dSharePct + '%');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Markup for One Resize Handle
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__BuildResizeHandleMarkup(resizeKind, orientationClass, isHidden) {
        var hiddenClass  =  isHidden ? ' ' + CSS_HIDDEN : '';
        return '<div class="' + CSS_RESIZE_HANDLE + ' ' + orientationClass + hiddenClass + '"' +
               ' ' + ATTR_RESIZE + '="' + resizeKind + '"' +
               ' role="separator" aria-orientation="' + (orientationClass === CSS_RESIZE_ROW ? 'horizontal' : 'vertical') + '"' +
               ' title="Drag to resize"></div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Preview and Controls Panel Children
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__BuildPanels() {
        var previewPanel   =  document.getElementById(ID_PREVIEW_PANEL);
        var controlsPanel  =  document.getElementById(ID_CONTROLS_PANEL);
        var splitLayout    =  document.getElementById(ID_SPLIT_LAYOUT);
        var layoutCfg      =  VghLantern__EditorLayout__LayoutConfig();
        var handlesOn      =  layoutCfg.ResizeHandlesEnabled !== false;
        var isHorizontal   =  layoutCfg.Split3dOrientation === 'horizontal';
        var preview3dOrient = isHorizontal ? CSS_RESIZE_COL : CSS_RESIZE_ROW;

        if (previewPanel) {
            previewPanel.innerHTML  =  '<div class="' + CSS_VIEWPORT_2D + '"></div>' +
                                       (handlesOn
                                           ? VghLantern__EditorLayout__BuildResizeHandleMarkup(RESIZE_PREVIEW_3D, preview3dOrient, true)
                                           : '') +
                                       '<div class="' + CSS_VIEWPORT_3D + ' ' + CSS_HIDDEN + '"></div>';
        }

        if (controlsPanel) {
            controlsPanel.innerHTML  =  '<div class="' + CSS_WARNINGS_HOST + '"></div>' +
                                        '<div class="' + CSS_CONTROLS_HOST + '"></div>';
        }

        // Insert the preview/controls handle between the two columns once, without
        // rebuilding the shell nodes AppCore already placed in the HTML.
        if (handlesOn && splitLayout && !splitLayout.querySelector('[' + ATTR_RESIZE + '="' + RESIZE_CONTROLS + '"]')) {
            var controlsHandle  =  document.createElement('div');
            controlsHandle.className  =  CSS_RESIZE_HANDLE + ' ' + CSS_RESIZE_COL;
            controlsHandle.setAttribute(ATTR_RESIZE, RESIZE_CONTROLS);
            controlsHandle.setAttribute('role', 'separator');
            controlsHandle.setAttribute('aria-orientation', 'vertical');
            controlsHandle.setAttribute('title', 'Drag to resize');
            splitLayout.insertBefore(controlsHandle, controlsPanel);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Bar
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Build a Display Label for One Lantern Tab
    // ------------------------------------------------------------
    // A lantern with no title still needs a stable, human label, so fall back to
    // its position in the schedule rather than showing a blank tab.
    function VghLantern__EditorLayout__LanternTabLabel(lantern, index) {
        var identity  =  lantern ? lantern['Lantern__Identity__Config'] : null;
        var title     =  identity ? (identity['Lantern__Identity__Config__Title'] || '') : '';
        return title !== '' ? title : 'Lantern ' + (index + 1);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Lantern Tab Strip Markup
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__BuildLanternTabsMarkup(lanterns, activeIndex) {
        var html  =  '<div class="' + CSS_LANTERN_TABS + '" role="tablist">';
        var i, isActive;

        for (i = 0; i < lanterns.length; i++) {
            isActive  =  i === activeIndex;

            html  +=  '<button type="button" class="' + CSS_LANTERN_TAB + (isActive ? ' ' + CSS_TAB_ACTIVE : '') + '"' +
                      ' ' + ATTR_LANTERN_INDEX + '="' + i + '" role="tab"' +
                      ' aria-selected="' + (isActive ? 'true' : 'false') + '">' +
                      VghLantern__EditorLayout__Escape(VghLantern__EditorLayout__LanternTabLabel(lanterns[i], i)) +
                      '</button>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Project Metadata Block Markup
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__BuildMetaMarkup(project) {
        var metadata  =  (project && project['VghLantern__ProjectFile__Metadata']) || {};
        var code      =  metadata['VghLantern__ProjectFile__Metadata__ProjectCode'] || '';
        var name      =  metadata['VghLantern__ProjectFile__Metadata__ProjectName'] || 'Untitled Project';
        var client    =  metadata['VghLantern__ProjectFile__Metadata__ClientName'] || '';

        var subtitle  =  [code, client].filter(function(part) { return part !== ''; }).join('  -  ');

        return '<div class="' + CSS_BAR_META + '">' +
                   '<span class="' + CSS_BAR_TITLE + '">' + VghLantern__EditorLayout__Escape(name) + '</span>' +
                   '<span class="' + CSS_BAR_SUBTITLE + '">' + VghLantern__EditorLayout__Escape(subtitle) + '</span>' +
               '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Global Bar
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__RenderGlobalBar() {
        var barEl  =  document.getElementById(ID_GLOBAL_BAR);
        if (!barEl) return;

        var layoutCfg  =  VghLantern__EditorLayout__LayoutConfig();
        if (layoutCfg.ShowGlobalBar === false) {
            barEl.classList.add(CSS_HIDDEN);
            return;
        }
        barEl.classList.remove(CSS_HIDDEN);

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        var state     =  StateManager.VghLantern__StateManager__GetState();
        var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var lanterns  =  VghLantern__EditorLayout__Lanterns();

        if (!project) {
            barEl.innerHTML  =  '<div class="' + CSS_BAR_META + '"><span class="' + CSS_BAR_TITLE + '">' +
                                EMPTY_PROJECT_MESSAGE + '</span></div>';
            return;
        }

        var html  =  VghLantern__EditorLayout__BuildMetaMarkup(project);

        if (layoutCfg.ShowLanternTabs !== false && lanterns) {
            html  +=  VghLantern__EditorLayout__BuildLanternTabsMarkup(lanterns, state.currentLanternIndex);
        }

        html  +=  '<div class="' + CSS_BAR_ACTIONS + '">' +
                      '<button type="button" class="' + CSS_BAR_BTN + '" ' + ATTR_ACTION + '="' + ACTION_ADD_LANTERN + '">+ Lantern</button>' +
                      '<button type="button" class="' + CSS_BAR_BTN + (state.is3dViewportVisible ? ' ' + CSS_BTN_ACTIVE : '') + '"' +
                      ' ' + ATTR_ACTION + '="' + ACTION_TOGGLE_3D + '" aria-pressed="' + (state.is3dViewportVisible ? 'true' : 'false') + '">3D</button>' +
                  '</div>';

        barEl.innerHTML  =  html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panel Content Coordination
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Render the Control Panel and Warnings Strip
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__RenderControlsPanel() {
        var controlsPanel  =  document.getElementById(ID_CONTROLS_PANEL);
        if (!controlsPanel) return;

        var warningsHost  =  controlsPanel.querySelector('.' + CSS_WARNINGS_HOST);
        var controlsHost  =  controlsPanel.querySelector('.' + CSS_CONTROLS_HOST);

        var ControlPanel  =  window.VghLantern__LanternEditor__ControlPanel;

        if (controlsHost && ControlPanel) {
            ControlPanel.VghLantern__ControlPanel__Render(controlsHost);       // <-- Renders its own empty state when nothing is selected
        } else if (controlsHost) {
            controlsHost.innerHTML  =  '<p class="' + CSS_EMPTY_STATE + '">' + CONTROLS_UNAVAILABLE_MESSAGE + '</p>';
        }

        VghLantern__EditorLayout__RenderWarnings(warningsHost);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render the Warning Strip From the Live Solve
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__RenderWarnings(warningsHost) {
        var WarningSystem  =  window.VghLantern__LanternEditor__WarningSystem;
        var StateManager   =  window.VghLantern__AppCore__StateManager;
        if (!warningsHost || !WarningSystem || !StateManager) return;

        WarningSystem.VghLantern__WarningSystem__Render(
            warningsHost,
            StateManager.VghLantern__StateManager__GetCurrentLantern(),
            StateManager.VghLantern__StateManager__GetSolvedSkeleton(),
            StateManager.VghLantern__StateManager__GetSolvedBarSet()
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Mount the 2D Viewport Host
    // ------------------------------------------------------------
    async function VghLantern__EditorLayout__Mount2dHost() {
        var ViewportHost2d  =  window.VghLantern__LanternEditor__ViewportHost__2d;
        var previewPanel    =  document.getElementById(ID_PREVIEW_PANEL);
        if (!ViewportHost2d || !previewPanel) return;

        var hostEl  =  previewPanel.querySelector('.' + CSS_VIEWPORT_2D);
        if (hostEl) await ViewportHost2d.VghLantern__ViewportHost2d__Mount(hostEl);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply the 3D Panel Visibility and Mount It On First Show
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__Apply3dVisibility(isVisible) {
        var previewPanel  =  document.getElementById(ID_PREVIEW_PANEL);
        if (!previewPanel) return;

        var hostEl     =  previewPanel.querySelector('.' + CSS_VIEWPORT_3D);
        var handleEl   =  previewPanel.querySelector('[' + ATTR_RESIZE + '="' + RESIZE_PREVIEW_3D + '"]');
        if (!hostEl) return;

        var layoutCfg    =  VghLantern__EditorLayout__LayoutConfig();
        var isHorizontal =  layoutCfg.Split3dOrientation === 'horizontal';

        previewPanel.classList.toggle(CSS_SPLIT_VERT, isVisible && !isHorizontal);
        previewPanel.classList.toggle(CSS_SPLIT_HORZ, isVisible && isHorizontal);
        hostEl.classList.toggle(CSS_HIDDEN, !isVisible);

        if (handleEl) {
            handleEl.classList.toggle(CSS_HIDDEN, !isVisible);
            handleEl.classList.toggle(CSS_RESIZE_COL, isHorizontal);
            handleEl.classList.toggle(CSS_RESIZE_ROW, !isHorizontal);
            handleEl.setAttribute('aria-orientation', isHorizontal ? 'vertical' : 'horizontal');
        }

        var ViewportHost3d  =  window.VghLantern__LanternEditor__ViewportHost__3d;
        if (!ViewportHost3d) return;

        if (isVisible && !VghLantern__EditorLayout__Is3dMounted) {
            ViewportHost3d.VghLantern__ViewportHost3d__Mount(hostEl);          // <-- First show pays the WebGL cost, once
            VghLantern__EditorLayout__Is3dMounted  =  true;
            return;
        }

        // Already mounted: the panel changed size, which WebGL cannot detect itself.
        if (VghLantern__EditorLayout__Is3dMounted) ViewportHost3d.VghLantern__ViewportHost3d__Resize();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resize Handles
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read Controls Width Clamp Bounds From Config
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__ControlsWidthBounds() {
        var layoutCfg  =  VghLantern__EditorLayout__LayoutConfig();
        return {
            Min  : Number(layoutCfg.ControlsPanelMinWidthPx) || FALLBACK_CONTROLS_MIN_PX,
            Max  : Number(layoutCfg.ControlsPanelMaxWidthPx) || FALLBACK_CONTROLS_MAX_PX
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read 3D Share Clamp Bounds From Config
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__Split3dShareBounds() {
        var layoutCfg  =  VghLantern__EditorLayout__LayoutConfig();
        return {
            Min  : Number(layoutCfg.Split3dShareMinPct) || FALLBACK_3D_SHARE_MIN_PCT,
            Max  : Number(layoutCfg.Split3dShareMaxPct) || FALLBACK_3D_SHARE_MAX_PCT
        };
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Push Live Controls Width Into the CSS Variable
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__SetControlsWidth(widthPx) {
        var container  =  document.getElementById(ID_CONTAINER);
        var bounds     =  VghLantern__EditorLayout__ControlsWidthBounds();
        var previewMin =  Number(VghLantern__EditorLayout__LayoutConfig().PreviewPanelMinWidthPx) || FALLBACK_PREVIEW_MIN_PX;
        var splitLayout = document.getElementById(ID_SPLIT_LAYOUT);

        // Keep enough room for the drawing pane so a fast drag cannot collapse it.
        if (splitLayout) {
            var maxFromPreview  =  splitLayout.clientWidth - previewMin - 4;  // <-- 4px = handle thickness
            bounds.Max  =  Math.min(bounds.Max, Math.max(bounds.Min, maxFromPreview));
        }

        VghLantern__EditorLayout__ControlsWidthPx  =  VghLantern__EditorLayout__Clamp(widthPx, bounds.Min, bounds.Max);
        if (container) container.style.setProperty(VAR_CONTROLS_WIDTH, VghLantern__EditorLayout__ControlsWidthPx + 'px');
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Push Live 3D Share Into the CSS Variable
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__SetSplit3dShare(sharePct) {
        var container  =  document.getElementById(ID_CONTAINER);
        var bounds     =  VghLantern__EditorLayout__Split3dShareBounds();

        VghLantern__EditorLayout__Split3dSharePct  =  VghLantern__EditorLayout__Clamp(sharePct, bounds.Min, bounds.Max);
        if (container) container.style.setProperty(VAR_SPLIT_3D_SHARE, VghLantern__EditorLayout__Split3dSharePct + '%');
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Notify Mounted Viewports That Their Host Resized
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__NotifyViewportResize() {
        var ViewportHost3d  =  window.VghLantern__LanternEditor__ViewportHost__3d;
        if (ViewportHost3d && VghLantern__EditorLayout__Is3dMounted) {
            ViewportHost3d.VghLantern__ViewportHost3d__Resize();
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply a Drag Delta for the Active Resize Handle
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__ApplyResizeDrag(clientX, clientY) {
        var drag  =  VghLantern__EditorLayout__ActiveResize;
        if (!drag) return;

        if (drag.Kind === RESIZE_CONTROLS) {
            var splitLayout  =  document.getElementById(ID_SPLIT_LAYOUT);
            if (!splitLayout) return;

            var splitRect  =  splitLayout.getBoundingClientRect();
            VghLantern__EditorLayout__SetControlsWidth(splitRect.right - clientX);
            VghLantern__EditorLayout__NotifyViewportResize();
            return;
        }

        if (drag.Kind === RESIZE_PREVIEW_3D) {
            var previewPanel  =  document.getElementById(ID_PREVIEW_PANEL);
            if (!previewPanel) return;

            var previewRect  =  previewPanel.getBoundingClientRect();
            var sharePct;

            if (drag.IsHorizontal) {
                sharePct  =  ((previewRect.right - clientX) / previewRect.width) * 100;
            } else {
                sharePct  =  ((previewRect.bottom - clientY) / previewRect.height) * 100;
            }

            VghLantern__EditorLayout__SetSplit3dShare(sharePct);
            VghLantern__EditorLayout__NotifyViewportResize();
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | End the Active Resize Drag
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__EndResizeDrag() {
        var drag  =  VghLantern__EditorLayout__ActiveResize;
        if (!drag) return;

        if (drag.HandleEl) drag.HandleEl.classList.remove(CSS_RESIZE_DRAG);
        document.body.classList.remove(CSS_BODY_RESIZING, CSS_BODY_RESIZE_ROW);

        VghLantern__EditorLayout__ActiveResize  =  null;
        VghLantern__EditorLayout__NotifyViewportResize();                     // <-- Final WebGL buffer sync after release
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Pointer Listeners for Both Resize Handles
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__BindResizeHandles() {
        var layoutCfg  =  VghLantern__EditorLayout__LayoutConfig();
        if (layoutCfg.ResizeHandlesEnabled === false) return;

        var container  =  document.getElementById(ID_CONTAINER);
        if (!container) return;

        function VghLantern__EditorLayout__OnResizeMove(ev) {
            if (!VghLantern__EditorLayout__ActiveResize) return;
            VghLantern__EditorLayout__ApplyResizeDrag(ev.clientX, ev.clientY);
        }

        function VghLantern__EditorLayout__OnResizeUp() {
            if (!VghLantern__EditorLayout__ActiveResize) return;
            document.removeEventListener('pointermove', VghLantern__EditorLayout__OnResizeMove);
            document.removeEventListener('pointerup', VghLantern__EditorLayout__OnResizeUp);
            document.removeEventListener('pointercancel', VghLantern__EditorLayout__OnResizeUp);
            VghLantern__EditorLayout__EndResizeDrag();
        }

        container.addEventListener('pointerdown', function(ev) {
            var handleEl  =  ev.target.closest('[' + ATTR_RESIZE + ']');
            if (!handleEl || handleEl.classList.contains(CSS_HIDDEN)) return;

            var kind          =  handleEl.getAttribute(ATTR_RESIZE);
            var isHorizontal  =  kind === RESIZE_CONTROLS || handleEl.classList.contains(CSS_RESIZE_COL);

            VghLantern__EditorLayout__ActiveResize  =  {
                Kind         : kind,
                HandleEl     : handleEl,
                IsHorizontal : isHorizontal
            };

            handleEl.classList.add(CSS_RESIZE_DRAG);
            document.body.classList.add(CSS_BODY_RESIZING);
            if (!isHorizontal) document.body.classList.add(CSS_BODY_RESIZE_ROW);

            document.addEventListener('pointermove', VghLantern__EditorLayout__OnResizeMove);
            document.addEventListener('pointerup', VghLantern__EditorLayout__OnResizeUp);
            document.addEventListener('pointercancel', VghLantern__EditorLayout__OnResizeUp);

            if (handleEl.setPointerCapture) handleEl.setPointerCapture(ev.pointerId);
            ev.preventDefault();
        });
    }
    // ------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lantern Selection
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Select the First Lantern If None Is Active
    // ------------------------------------------------------------
    // Entering the editor with nothing selected would show an empty control panel
    // for a project that plainly has a lantern in it, so default to the first.
    function VghLantern__EditorLayout__EnsureLanternSelected() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var lanterns      =  VghLantern__EditorLayout__Lanterns();
        if (!StateManager || !lanterns || lanterns.length === 0) return;

        var state  =  StateManager.VghLantern__StateManager__GetState();
        if (state.currentLanternIndex >= 0 && state.currentLanternIndex < lanterns.length) return;

        StateManager.VghLantern__StateManager__SetCurrentLanternIndex(0);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Append a Fresh Default Lantern and Select It
    // ------------------------------------------------------------
    // Mutates the lanterns array in place rather than calling SetCurrentProject,
    // which would clear the selection and force a needless full reload.
    function VghLantern__EditorLayout__AddLantern() {
        var StateManager     =  window.VghLantern__AppCore__StateManager;
        var SchemaValidator  =  window.VghLantern__AppUtils__ProjectSchemaValidator;
        var lanterns         =  VghLantern__EditorLayout__Lanterns();
        if (!StateManager || !SchemaValidator || !lanterns) return;

        var newIndex  =  lanterns.length;
        lanterns.push(SchemaValidator.VghLantern__SchemaValidator__BuildDefaultLantern(newIndex));

        StateManager.VghLantern__StateManager__MarkDirty();                   // <-- Triggers the autosave path in AppCore
        StateManager.VghLantern__StateManager__SetCurrentLanternIndex(newIndex);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Binding
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Bind Delegated Global Bar Clicks
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__BindGlobalBar() {
        var barEl  =  document.getElementById(ID_GLOBAL_BAR);
        if (!barEl) return;

        barEl.addEventListener('click', function(ev) {
            var StateManager  =  window.VghLantern__AppCore__StateManager;
            if (!StateManager) return;

            var tabEl  =  ev.target.closest('[' + ATTR_LANTERN_INDEX + ']');
            if (tabEl) {
                StateManager.VghLantern__StateManager__SetCurrentLanternIndex(Number(tabEl.getAttribute(ATTR_LANTERN_INDEX)));
                return;
            }

            var actionEl  =  ev.target.closest('[' + ATTR_ACTION + ']');
            if (!actionEl) return;

            var action  =  actionEl.getAttribute(ATTR_ACTION);
            if (action === ACTION_ADD_LANTERN) {
                VghLantern__EditorLayout__AddLantern();
                return;
            }
            if (action === ACTION_TOGGLE_3D) {
                var state  =  StateManager.VghLantern__StateManager__GetState();
                StateManager.VghLantern__StateManager__Set3dViewportVisible(!state.is3dViewportVisible);
            }
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Subscribe to the State Events This Layout Reacts To
    // ------------------------------------------------------------
    function VghLantern__EditorLayout__Subscribe() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.VghLantern__StateManager__On('projectChanged', function() {
            VghLantern__EditorLayout__EnsureLanternSelected();
            VghLantern__EditorLayout__RenderGlobalBar();
        });

        StateManager.VghLantern__StateManager__On('lanternSelected', function() {
            VghLantern__EditorLayout__RenderGlobalBar();
            VghLantern__EditorLayout__RenderControlsPanel();
        });

        // Warnings and tab labels both depend on the lantern's own fields, so a
        // slider edit has to refresh them; the viewport hosts redraw themselves.
        StateManager.VghLantern__StateManager__On('geometrySolved', function() {
            VghLantern__EditorLayout__RenderGlobalBar();
            var controlsPanel  =  document.getElementById(ID_CONTROLS_PANEL);
            if (controlsPanel) VghLantern__EditorLayout__RenderWarnings(controlsPanel.querySelector('.' + CSS_WARNINGS_HOST));
        });

        StateManager.VghLantern__StateManager__On('viewport3dVisibilityChanged', function(isVisible) {
            VghLantern__EditorLayout__Apply3dVisibility(isVisible);
            VghLantern__EditorLayout__RenderGlobalBar();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Editor Scaffolding Once
    // ------------------------------------------------------------
    async function VghLantern__LanternEditor__Layout__Init() {
        if (VghLantern__EditorLayout__IsBuilt) return;

        var splitLayout  =  document.getElementById(ID_SPLIT_LAYOUT);
        if (!splitLayout) {
            console.error('[VghLantern__LanternEditor__Layout] Editor shell DOM missing.');
            return;
        }

        VghLantern__EditorLayout__ApplyLayoutVariables();
        VghLantern__EditorLayout__BuildPanels();
        VghLantern__EditorLayout__BindGlobalBar();
        VghLantern__EditorLayout__BindResizeHandles();
        VghLantern__EditorLayout__Subscribe();

        VghLantern__EditorLayout__IsBuilt  =  true;

        await VghLantern__EditorLayout__Mount2dHost();
    }
    // ------------------------------------------------------------


    // FUNCTION | Redraw the Editor for the Current Project State
    // ------------------------------------------------------------
    function VghLantern__LanternEditor__Layout__Refresh() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;

        VghLantern__EditorLayout__EnsureLanternSelected();
        VghLantern__EditorLayout__RenderGlobalBar();
        VghLantern__EditorLayout__RenderControlsPanel();

        if (StateManager) {
            VghLantern__EditorLayout__Apply3dVisibility(StateManager.VghLantern__StateManager__GetState().is3dViewportVisible);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__LanternEditor__Layout__Init     : VghLantern__LanternEditor__Layout__Init,
        VghLantern__LanternEditor__Layout__Refresh  : VghLantern__LanternEditor__Layout__Refresh
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Layout  =  VghLantern__LanternEditor__Layout;
