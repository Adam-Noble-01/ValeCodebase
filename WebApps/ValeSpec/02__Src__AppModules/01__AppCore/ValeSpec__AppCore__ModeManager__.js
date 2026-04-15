/* =============================================================================
   VALESPEC - MODE MANAGER
   =============================================================================

   FILE       : ValeSpec__AppCore__ModeManager__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppCore - ModeManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Mode switching between the four application views
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Manages visibility of mode panel sections
   - Maintains a navigation stack for back-navigation
   - Updates navigation bar active tab state
   - Coordinates with StateManager for mode tracking

   ============================================================================= */

// =============================================================================
// REGION | Mode Manager Module
// =============================================================================

const ValeSpec__AppCore__ModeManager = (function() {

    // MODULE CONSTANTS | Mode Identifiers
    // ------------------------------------------------------------
    const MODE_DOC_MANAGEMENT   =  'DocManagement';
    const MODE_ASSEMBLY_EDITOR  =  'AssemblyEditor';
    const MODE_DOC_EDITOR       =  'DocumentEditor';
    const MODE_DOC_PREVIEW      =  'DocumentPreview';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Mode Panel DOM IDs
    // ------------------------------------------------------------
    const ValeSpec__ModeManager__ModePanelIds  =  {
        'DocManagement'    : 'ValeSpec__App__ModeDocManagement',
        'AssemblyEditor'   : 'ValeSpec__App__ModeAssemblyEditor',
        'DocumentEditor'   : 'ValeSpec__App__ModeDocEditor',
        'DocumentPreview'  : 'ValeSpec__App__ModeDocPreview'
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Navigation State
    // ------------------------------------------------------------
    let ValeSpec__ModeManager__NavigationStack  =  [];
    let ValeSpec__ModeManager__CurrentMode      =  null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hide All Mode Panels
    // ------------------------------------------------------------
    function ValeSpec__ModeManager__HideAllPanels() {
        var panels  =  document.querySelectorAll('.ValeSpec__App__ModePanel');
        for (var i = 0; i < panels.length; i++) {
            panels[i].classList.remove('ValeSpec__App__ModePanel--active');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Navigation Bar Active Tab
    // ------------------------------------------------------------
    function ValeSpec__ModeManager__UpdateNavTabs(modeId) {
        var tabs  =  document.querySelectorAll('.ValeSpec__App__NavTab');
        for (var i = 0; i < tabs.length; i++) {
            var tab  =  tabs[i];
            if (tab.dataset.mode === modeId) {
                tab.classList.add('ValeSpec__App__NavTab--active');
            } else {
                tab.classList.remove('ValeSpec__App__NavTab--active');
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch to a Specific Mode
    // ------------------------------------------------------------
    function ValeSpec__ModeManager__SwitchToMode(modeId, addToHistory) {
        if (!ValeSpec__ModeManager__ModePanelIds[modeId]) {
            console.warn('[ValeSpec__ModeManager] Unknown mode:', modeId);
            return;
        }

        if (addToHistory !== false && ValeSpec__ModeManager__CurrentMode) {
            ValeSpec__ModeManager__NavigationStack.push(ValeSpec__ModeManager__CurrentMode);
        }

        ValeSpec__ModeManager__HideAllPanels();

        var panelId  =  ValeSpec__ModeManager__ModePanelIds[modeId];
        var panel    =  document.getElementById(panelId);
        if (panel) {
            panel.classList.add('ValeSpec__App__ModePanel--active');
        }

        ValeSpec__ModeManager__CurrentMode  =  modeId;
        ValeSpec__ModeManager__UpdateNavTabs(modeId);

        if (window.ValeSpec__AppCore__StateManager) {
            window.ValeSpec__AppCore__StateManager.ValeSpec__StateManager__SetCurrentMode(modeId);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Navigate Back to Previous Mode
    // ------------------------------------------------------------
    function ValeSpec__ModeManager__NavigateBack() {
        if (ValeSpec__ModeManager__NavigationStack.length === 0) return;
        var previousMode  =  ValeSpec__ModeManager__NavigationStack.pop();
        ValeSpec__ModeManager__SwitchToMode(previousMode, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Mode
    // ------------------------------------------------------------
    function ValeSpec__ModeManager__GetCurrentMode() {
        return ValeSpec__ModeManager__CurrentMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Can Navigate Back
    // ------------------------------------------------------------
    function ValeSpec__ModeManager__CanGoBack() {
        return ValeSpec__ModeManager__NavigationStack.length > 0;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        MODE_DOC_MANAGEMENT                    : MODE_DOC_MANAGEMENT,
        MODE_ASSEMBLY_EDITOR                   : MODE_ASSEMBLY_EDITOR,
        MODE_DOC_EDITOR                        : MODE_DOC_EDITOR,
        MODE_DOC_PREVIEW                       : MODE_DOC_PREVIEW,
        ValeSpec__ModeManager__SwitchToMode    : ValeSpec__ModeManager__SwitchToMode,
        ValeSpec__ModeManager__NavigateBack    : ValeSpec__ModeManager__NavigateBack,
        ValeSpec__ModeManager__GetCurrentMode  : ValeSpec__ModeManager__GetCurrentMode,
        ValeSpec__ModeManager__CanGoBack       : ValeSpec__ModeManager__CanGoBack
    };

})();

// endregion ===================================================================

window.ValeSpec__AppCore__ModeManager  =  ValeSpec__AppCore__ModeManager;
