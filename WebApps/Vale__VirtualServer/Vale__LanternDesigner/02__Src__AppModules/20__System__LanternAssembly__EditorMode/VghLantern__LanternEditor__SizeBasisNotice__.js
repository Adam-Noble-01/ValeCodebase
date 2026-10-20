/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SIZE BASIS NOTICE
   =============================================================================

   FILE       : VghLantern__LanternEditor__SizeBasisNotice__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - SizeBasisNotice
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Explain why a drawing dimension cannot be typed while the eaves
                datum or internal upstand governs the size, and take the user to
                where it can be changed
   CREATED    : 20-Oct-2026

   DESCRIPTION:
   - Adam's brief: "If advanced dimensions are used if the user tried to edit the
     dynamic dimensions on the drawings it should show a modal explaining this is
     not possible when using Advanced dimensions and have a button to open the
     section in the main configuration tab and it should take the user there and
     highlight the section with a animation." The mistake it heads off: typing the
     exterior length on the drawing of a lantern set out to the eaves datum looks
     like it worked, and quietly takes the lantern off the size it was set out to.
   - Called by VghLantern__Env2d__DimensionEditor when a click lands on a dimension
     VghLantern__Geometry__PlanSizeBasis has locked, on the editor's own 2D panes
     and on the Drawing Editor's sheet alike, because both bind the same editor.
   - The button opens Form and Size in the Lantern Editor, scrolls the Set Out To
     cards into view and pulses them. The reveal is asked for BEFORE the mode switch:
     the control panel holds it until it is next drawn on screen, which is the
     render the switch causes, so the order of the two calls never matters.
   - The words are config (Na__LanternEditor__Config.json -> VghLantern__
     LanternEditor__Config__SizeBasisNotice); the basis is named by the plan
     size diagrams module, so the notice and the card can never call it two things.

   ============================================================================= */

// =============================================================================
// REGION | Size Basis Notice Module
// =============================================================================

const VghLantern__LanternEditor__SizeBasisNotice = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Where the Set Out To Cards Live
    // ------------------------------------------------------------
    // A section key and a descriptor key, not tunables: they name code, so they
    // move only when the section file moves them.
    // Reference: VghLantern__LanternEditor__Section__FormAndSize__.js
    const REVEAL_SECTION_KEY  =  'formAndSize';
    const REVEAL_CONTROL_KEY  =  'sizeBasis';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Context Label
    // ------------------------------------------------------------
    const NOTICE_CONFIG_LABEL  =  'Na__LanternEditor__Config.json -> VghLantern__LanternEditor__Config__SizeBasisNotice';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe HTML Insertion
    // ------------------------------------------------------------
    // ConfirmModal inserts its Message as HTML, so anything interpolated into it
    // is escaped here, even text that today comes only from this codebase.
    function VghLantern__SizeBasisNotice__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Notice Copy From Config
    // ------------------------------------------------------------
    function VghLantern__SizeBasisNotice__ReadConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var editorCfg     =  ConfigLoader ? (ConfigLoader.VghLantern__ConfigLoader__GetSection('LanternEditor') || {}) : {};
        var noticeCfg     =  editorCfg['VghLantern__LanternEditor__Config__SizeBasisNotice'] || {};

        function str(key) { return ConfigLoader.VghLantern__ConfigLoader__RequireString(noticeCfg, key, NOTICE_CONFIG_LABEL); }

        return {
            Title        : str('Title'),
            Message      : str('Message'),
            ConfirmLabel : str('ConfirmLabel'),
            CancelLabel  : str('CancelLabel')
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Phrase Naming the Basis This Lantern Is Set Out To
    // ------------------------------------------------------------
    function VghLantern__SizeBasisNotice__BasisPhrase() {
        var StateManager   =  window.VghLantern__AppCore__StateManager;
        var PlanSizeBasis  =  window.VghLantern__Geometry__PlanSizeBasis;
        var SizeDiagrams   =  window.VghLantern__AppData__PlanSizeBasisDiagrams;
        if (!StateManager || !PlanSizeBasis || !SizeDiagrams) return '';

        var lantern  =  StateManager.VghLantern__StateManager__GetCurrentLantern();
        var basis    =  PlanSizeBasis.VghLantern__PlanSizeBasis__GoverningBasis(lantern);

        return SizeDiagrams.VghLantern__PlanSizeBasisDiagrams__BasisText(basis).Phrase;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Notice and Navigation
// -----------------------------------------------------------------------------

    // FUNCTION | Take the User to the Set Out To Cards and Point at Them
    // ------------------------------------------------------------
    function VghLantern__SizeBasisNotice__OpenSetOutTo() {
        var ControlPanel  =  window.VghLantern__LanternEditor__ControlPanel;
        var ModeManager   =  window.VghLantern__AppCore__ModeManager;

        if (ControlPanel && ControlPanel.VghLantern__ControlPanel__RevealControl) {
            ControlPanel.VghLantern__ControlPanel__RevealControl(REVEAL_SECTION_KEY, REVEAL_CONTROL_KEY);
        }

        if (ModeManager && ModeManager.VghLantern__ModeManager__GetCurrentMode() !== ModeManager.MODE_LANTERN_EDITOR) {
            ModeManager.VghLantern__ModeManager__SwitchToMode(ModeManager.MODE_LANTERN_EDITOR);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Explain Why a Locked Dimension Cannot Be Typed
    // ------------------------------------------------------------
    // dimensionKey is the ConstraintResolver key the user clicked. Every locked key
    // gets the same notice, because every one of them is the same lantern size.
    function VghLantern__SizeBasisNotice__ShowLockedDimension(dimensionKey) {
        var ConfirmModal  =  window.VghLantern__AppCore__ConfirmModal;
        var copy          =  VghLantern__SizeBasisNotice__ReadConfig();
        var phrase        =  VghLantern__SizeBasisNotice__BasisPhrase();

        var message  =  VghLantern__SizeBasisNotice__Escape(copy.Message)
            .replace('{basis}', '<strong>' + VghLantern__SizeBasisNotice__Escape(phrase) + '</strong>');

        if (!ConfirmModal || !ConfirmModal.VghLantern__ConfirmModal__Show) {
            console.warn('[VghLantern__SizeBasisNotice] Locked dimension "' + dimensionKey + '": ' + copy.Message);
            return;
        }

        ConfirmModal.VghLantern__ConfirmModal__Show({
            Title        : copy.Title,
            Message      : message,
            ConfirmLabel : copy.ConfirmLabel,
            CancelLabel  : copy.CancelLabel,
            Danger       : false,
            OnConfirm    : VghLantern__SizeBasisNotice__OpenSetOutTo
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SizeBasisNotice__ShowLockedDimension : VghLantern__SizeBasisNotice__ShowLockedDimension,
        VghLantern__SizeBasisNotice__OpenSetOutTo   : VghLantern__SizeBasisNotice__OpenSetOutTo
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__SizeBasisNotice  =  VghLantern__LanternEditor__SizeBasisNotice;
