/* =============================================================================
   VGHLANTERN - MODE MANAGER
   =============================================================================

   FILE       : VghLantern__AppCore__ModeManager__.js
   NAMESPACE  : VghLantern
   MODULE     : AppCore - ModeManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Mode switching between the seven application views
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Manages visibility of mode panel sections.
   - Maintains a navigation stack for back-navigation.
   - Updates navigation bar active tab state.
   - Applies the full-bleed panel variant to viewport-driven modes so a canvas
     or SVG surface fills the content area without panel padding.
   - Coordinates with StateManager for mode tracking.

   MODES (in nav order):
   Projects / Lantern Editor / 3D View / Drawing Editor / Specification /
   Preview & Send  ... plus right-aligned Component Index.

   ============================================================================= */

// =============================================================================
// REGION | Mode Manager Module
// =============================================================================

const VghLantern__AppCore__ModeManager = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Mode Identifiers
    // ------------------------------------------------------------
    const MODE_DOC_MANAGEMENT   =  'DocManagement';                          // <-- Project manager table
    const MODE_LANTERN_EDITOR   =  'LanternEditor';                          // <-- 2D configurator + control panel
    const MODE_VIEWPORT_3D      =  'Viewport3d';                             // <-- Dedicated full-screen 3D view
    const MODE_DRAWING_EDITOR   =  'DrawingEditor';                          // <-- Sheet composition
    const MODE_SPECIFICATION    =  'Specification';                          // <-- Schedules and takeoff
    const MODE_CLIENT_DOCUMENT  =  'ClientDocument';                          // <-- Welcome letter and terms
    const MODE_DOC_PREVIEW      =  'DocumentPreview';                         // <-- Paginated preview + PDF
    const MODE_COMPONENT_INDEX  =  'ComponentIndex';                          // <-- Finial / profile gallery
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Mode Descriptor Table
    // ------------------------------------------------------------
    // PanelId      : DOM id of the section in VghLantern__App__.html
    // IsFullBleed  : strip panel padding so a viewport can fill the area
    const VghLantern__ModeManager__ModeDescriptors  =  {
        'DocManagement'    : { PanelId : 'VghLantern__App__ModeDocManagement',   IsFullBleed : false },
        'LanternEditor'    : { PanelId : 'VghLantern__App__ModeLanternEditor',   IsFullBleed : true  },
        'Viewport3d'       : { PanelId : 'VghLantern__App__ModeViewport3d',      IsFullBleed : true  },
        'DrawingEditor'    : { PanelId : 'VghLantern__App__ModeDrawingEditor',   IsFullBleed : true  },
        'Specification'    : { PanelId : 'VghLantern__App__ModeSpecification',   IsFullBleed : false },
        'ClientDocument'   : { PanelId : 'VghLantern__App__ModeClientDocument',  IsFullBleed : false },
        'DocumentPreview'  : { PanelId : 'VghLantern__App__ModeDocPreview',      IsFullBleed : false },
        'ComponentIndex'   : { PanelId : 'VghLantern__App__ModeComponentIndex',  IsFullBleed : false }
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Navigation State
    // ------------------------------------------------------------
    let VghLantern__ModeManager__NavigationStack  =  [];
    let VghLantern__ModeManager__CurrentMode      =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panel and Tab Visibility Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Hide All Mode Panels
    // ------------------------------------------------------------
    function VghLantern__ModeManager__HideAllPanels() {
        var panels  =  document.querySelectorAll('.VghLantern__App__ModePanel');
        for (var i = 0; i < panels.length; i++) {
            panels[i].classList.remove('VghLantern__App__ModePanel--active');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply the Full-Bleed Variant to a Panel
    // ------------------------------------------------------------
    function VghLantern__ModeManager__ApplyFullBleed(panelEl, isFullBleed) {
        if (!panelEl) return;
        if (isFullBleed) {
            panelEl.classList.add('VghLantern__App__ModePanel--fullBleed');
        } else {
            panelEl.classList.remove('VghLantern__App__ModePanel--fullBleed');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Navigation Bar Active Tab
    // ------------------------------------------------------------
    function VghLantern__ModeManager__UpdateNavTabs(modeId) {
        var tabs  =  document.querySelectorAll('.VghLantern__App__NavTab');
        for (var i = 0; i < tabs.length; i++) {
            var tab  =  tabs[i];
            if (tab.dataset.mode === modeId) {
                tab.classList.add('VghLantern__App__NavTab--active');
            } else {
                tab.classList.remove('VghLantern__App__NavTab--active');
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mode Switching
// -----------------------------------------------------------------------------

    // FUNCTION | Switch to a Specific Mode
    // ------------------------------------------------------------
    function VghLantern__ModeManager__SwitchToMode(modeId, addToHistory) {
        var descriptor  =  VghLantern__ModeManager__ModeDescriptors[modeId];
        if (!descriptor) {
            console.warn('[VghLantern__ModeManager] Unknown mode:', modeId);
            return;
        }

        if (addToHistory !== false && VghLantern__ModeManager__CurrentMode) {
            VghLantern__ModeManager__NavigationStack.push(VghLantern__ModeManager__CurrentMode);
        }

        VghLantern__ModeManager__HideAllPanels();

        var panel  =  document.getElementById(descriptor.PanelId);
        if (panel) {
            panel.classList.add('VghLantern__App__ModePanel--active');
            VghLantern__ModeManager__ApplyFullBleed(panel, descriptor.IsFullBleed);
        }

        VghLantern__ModeManager__CurrentMode  =  modeId;
        VghLantern__ModeManager__UpdateNavTabs(modeId);

        if (window.VghLantern__AppCore__StateManager) {
            window.VghLantern__AppCore__StateManager.VghLantern__StateManager__SetCurrentMode(modeId);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Navigate Back to Previous Mode
    // ------------------------------------------------------------
    function VghLantern__ModeManager__NavigateBack() {
        if (VghLantern__ModeManager__NavigationStack.length === 0) return;
        var previousMode  =  VghLantern__ModeManager__NavigationStack.pop();
        VghLantern__ModeManager__SwitchToMode(previousMode, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Mode
    // ------------------------------------------------------------
    function VghLantern__ModeManager__GetCurrentMode() {
        return VghLantern__ModeManager__CurrentMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Can Navigate Back
    // ------------------------------------------------------------
    function VghLantern__ModeManager__CanGoBack() {
        return VghLantern__ModeManager__NavigationStack.length > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Test Whether a Mode Renders Full Bleed
    // ------------------------------------------------------------
    function VghLantern__ModeManager__IsFullBleedMode(modeId) {
        var descriptor  =  VghLantern__ModeManager__ModeDescriptors[modeId];
        return !!(descriptor && descriptor.IsFullBleed);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        MODE_DOC_MANAGEMENT                       : MODE_DOC_MANAGEMENT,
        MODE_LANTERN_EDITOR                       : MODE_LANTERN_EDITOR,
        MODE_VIEWPORT_3D                          : MODE_VIEWPORT_3D,
        MODE_DRAWING_EDITOR                       : MODE_DRAWING_EDITOR,
        MODE_SPECIFICATION                        : MODE_SPECIFICATION,
        MODE_CLIENT_DOCUMENT                      : MODE_CLIENT_DOCUMENT,
        MODE_DOC_PREVIEW                          : MODE_DOC_PREVIEW,
        MODE_COMPONENT_INDEX                      : MODE_COMPONENT_INDEX,

        VghLantern__ModeManager__SwitchToMode      : VghLantern__ModeManager__SwitchToMode,
        VghLantern__ModeManager__NavigateBack      : VghLantern__ModeManager__NavigateBack,
        VghLantern__ModeManager__GetCurrentMode    : VghLantern__ModeManager__GetCurrentMode,
        VghLantern__ModeManager__CanGoBack         : VghLantern__ModeManager__CanGoBack,
        VghLantern__ModeManager__IsFullBleedMode   : VghLantern__ModeManager__IsFullBleedMode
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppCore__ModeManager  =  VghLantern__AppCore__ModeManager;
