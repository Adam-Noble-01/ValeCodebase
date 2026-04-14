/* =============================================================================
   VALESPEC - MODE MANAGER
   =============================================================================

   FILE       : ValeSpec__AppCore__ModeManager__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppCore - ModeManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Mode switching between the four application views
   CREATED    : 2026

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
    const MODE_PANEL_IDS  =  {
        'DocManagement'    : 'ValeSpec__App__ModeDocManagement',
        'AssemblyEditor'   : 'ValeSpec__App__ModeAssemblyEditor',
        'DocumentEditor'   : 'ValeSpec__App__ModeDocEditor',
        'DocumentPreview'  : 'ValeSpec__App__ModeDocPreview'
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Navigation State
    // ------------------------------------------------------------
    let _navigationStack  =  [];
    let _currentMode      =  null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hide All Mode Panels
    // ------------------------------------------------------------
    function _hideAllPanels() {
        var panels  =  document.querySelectorAll('.ValeSpec__App__ModePanel');
        for (var i = 0; i < panels.length; i++) {
            panels[i].classList.remove('ValeSpec__App__ModePanel--active');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Navigation Bar Active Tab
    // ------------------------------------------------------------
    function _updateNavTabs(modeId) {
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
    function switchToMode(modeId, addToHistory) {
        if (!MODE_PANEL_IDS[modeId]) {
            console.warn('[ValeSpec__ModeManager] Unknown mode:', modeId);
            return;
        }

        if (addToHistory !== false && _currentMode) {
            _navigationStack.push(_currentMode);
        }

        _hideAllPanels();

        var panelId  =  MODE_PANEL_IDS[modeId];
        var panel    =  document.getElementById(panelId);
        if (panel) {
            panel.classList.add('ValeSpec__App__ModePanel--active');
        }

        _currentMode  =  modeId;
        _updateNavTabs(modeId);

        if (window.ValeSpec__AppCore__StateManager) {
            window.ValeSpec__AppCore__StateManager.setCurrentMode(modeId);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Navigate Back to Previous Mode
    // ------------------------------------------------------------
    function navigateBack() {
        if (_navigationStack.length === 0) return;
        var previousMode  =  _navigationStack.pop();
        switchToMode(previousMode, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Mode
    // ------------------------------------------------------------
    function getCurrentMode() {
        return _currentMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Can Navigate Back
    // ------------------------------------------------------------
    function canGoBack() {
        return _navigationStack.length > 0;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        MODE_DOC_MANAGEMENT    : MODE_DOC_MANAGEMENT,
        MODE_ASSEMBLY_EDITOR   : MODE_ASSEMBLY_EDITOR,
        MODE_DOC_EDITOR        : MODE_DOC_EDITOR,
        MODE_DOC_PREVIEW       : MODE_DOC_PREVIEW,
        switchToMode           : switchToMode,
        navigateBack           : navigateBack,
        getCurrentMode         : getCurrentMode,
        canGoBack              : canGoBack
    };

})();

// endregion ===================================================================

window.ValeSpec__AppCore__ModeManager  =  ValeSpec__AppCore__ModeManager;
