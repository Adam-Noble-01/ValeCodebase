/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - LANTERN INFO
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__LanternInfo__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - LanternInfo
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the lantern naming control and the Delete Lantern action
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Lantern Info accordion section, which is
     the identity home for whichever lantern tab is currently active.
   - Name overrides the sequential "Lantern 1" / "Lantern 2" label the tab strip
     and the specification schedule fall back to (see
     VghLantern__EditorLayout__LanternTabLabel). Leaving it blank restores the
     sequential label rather than printing an empty name downstream.
   - Delete Lantern only ever appears once a project holds more than one
     lantern - a project must always keep at least one - and routes through the
     shared ConfirmModal via the button's Confirm block before Layout actually
     removes it, so a stray click cannot destroy a lantern's configuration.

   ============================================================================= */

// =============================================================================
// REGION | Lantern Info Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__LanternInfo = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Identity Block Name
    // ------------------------------------------------------------
    const IDENTITY_BLOCK  =  'Lantern__Identity__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility and Action Predicates
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | True When the Project Holds More Than One Lantern
    // ------------------------------------------------------------
    // A button descriptor's VisibleWhen only ever receives the lantern it sits
    // on, not the project, so this reaches StateManager directly to count the
    // sibling array rather than asking ControlPanel to widen its contract.
    function VghLantern__Section__LanternInfo__HasMultipleLanterns() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return false;

        var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var lanterns  =  project ? project['VghLantern__ProjectFile__Lanterns'] : null;
        return Array.isArray(lanterns) && lanterns.length > 1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Delete the Active Lantern via the Editor Layout
    // ------------------------------------------------------------
    function VghLantern__Section__LanternInfo__DeleteActiveLantern() {
        var Layout  =  window.VghLantern__LanternEditor__Layout;
        if (Layout) Layout.VghLantern__LanternEditor__Layout__DeleteLantern();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Lantern Info Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__LanternInfo__Build() {
        return [
            {
                Key       : 'lanternTitle',
                Type      : 'text',
                Label     : 'Lantern Name',
                Block     : IDENTITY_BLOCK,
                Field     : 'Lantern__Identity__Config__Title',
                MaxLength : 80,
                Hint      : 'Overrides the default "Lantern 1" style label on the tab strip and on the specification schedule. Leave blank to use the sequential label.'
            },
            {
                Key   : 'dangerZoneHeading',
                Type  : 'heading',
                Label : 'Danger Zone'
            },
            {
                Key      : 'deleteLantern',
                Type     : 'button',
                Label    : 'Delete Lantern',
                Variant  : 'danger',
                Hint     : 'Permanently removes this lantern from the project. Only available when the project has more than one lantern.',
                VisibleWhen : VghLantern__Section__LanternInfo__HasMultipleLanterns,
                Action      : VghLantern__Section__LanternInfo__DeleteActiveLantern,
                Confirm     : {
                    Title        : 'Delete This Lantern?',
                    Message      : 'This permanently removes this lantern and all of its configuration from the project. This cannot be undone.',
                    ConfirmLabel : 'Delete Lantern'
                }
            }
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Section__LanternInfo__Build : VghLantern__Section__LanternInfo__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__LanternInfo  =  VghLantern__LanternEditor__Section__LanternInfo;
