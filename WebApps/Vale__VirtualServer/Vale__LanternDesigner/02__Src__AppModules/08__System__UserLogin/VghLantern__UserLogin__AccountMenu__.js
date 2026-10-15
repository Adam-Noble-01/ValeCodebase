/* =============================================================================
   VGHLANTERN - USER LOGIN | ACCOUNT MENU
   =============================================================================

   FILE       : VghLantern__UserLogin__AccountMenu__.js
   NAMESPACE  : VghLantern
   MODULE     : UserLogin - AccountMenu
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Lantern Designer's own items in the signed-in user's menu
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - The header avatar, the identity block, Change password and Sign out are drawn
     by the shared Vale sign-in (ValeUserLogin), in this app's header mount.
     This module hands it the items Lantern Designer adds:
       * Home Screen - back to the landing card from any mode. The loaded project
         is left exactly as it was, so leaving the landing screen again lands
         back on the same drawing.
       * Developer Tools (AppAdmin only) - the SketchUp and CAD exports.
   - The shared menu filters adminOnly items before it draws them, so an account
     that is not an AppAdmin has no Developer Tools markup at all; the actions
     check again here, because they are reachable from the public API.

   -----------------------------------------------------------------------------

   WHY THIS IS NOT CALLED "UserMenu":
   The VghLantern__UserMenu__ namespace already belongs to the per-user
   preference persistence (panel section states, last view, and so on), saved
   through api/user-menu-config. That is a different thing entirely.

   THE EXPORTS:
   They live in 80__System__SketchUpExport and 81__System__CadDxfExport and are
   called through window, exactly as the PDF export is. This menu knows which
   module to ask and nothing about what either one writes.

   -----------------------------------------------------------------------------

   DEVELOPMENT LOG:
   15-Oct-2026 - Version 2.0.0 (the Vale app server)
   - Menu items for the shared Vale sign-in instead of a menu drawn here. Switch
     User is gone: Sign out does the same and re-opens the card. Developer Tools
     follow the AppAdmin level, as in ValeVision 3D, instead of the prototype's
     Developer role.

   07-Aug-2026 - Version 1.0.0
   - Header initials avatar and menu over the prototype login.

   ============================================================================= */

// =============================================================================
// REGION | User Login Account Menu Module
// =============================================================================

const VghLantern__UserLogin__AccountMenu = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Menu Action Keys
    // ------------------------------------------------------------
    const ACTION_HOME_SCREEN  =  'home-screen';                               // <-- Back to the landing card, project untouched
    const ACTION_DEV_SKETCHUP =  'dev-sketchup-export';                       // <-- AppAdmin only: write the SketchUp build payload
    const ACTION_DEV_CAD      =  'dev-cad-export';                            // <-- AppAdmin only: write the layered DXF
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    // The exports own their own messages; this menu reads them so a failure the
    // exporter cannot raise itself - because it never loaded - still reads in
    // the exporter's own words rather than in a second set invented here.
    const EXPORT_MENU_CONFIG_KEY  =  'VghLantern__SketchUpExport__Config__Menu';
    const MENU_CONFIG_KEY         =  'VghLantern__UserLogin__Config__AccountMenu';
    const MENU_CONFIG_LABEL       =  'Na__UserLogin__Config.json -> VghLantern__UserLogin__Config__AccountMenu';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read One Menu String via the Strict Config Reader
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__ConfigString(key) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var appConfig     =  StateManager ? StateManager.VghLantern__StateManager__GetAppConfig() : null;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            (appConfig && appConfig[MENU_CONFIG_KEY]) || {}, key, MENU_CONFIG_LABEL);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One String From the Export Config Block
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__ExportMessage(key, fallbackText) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var appConfig     =  StateManager ? StateManager.VghLantern__StateManager__GetAppConfig() : null;
        var block         =  (appConfig && appConfig[EXPORT_MENU_CONFIG_KEY]) || {};
        return block[key] || fallbackText;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Menu Items and Actions
// -----------------------------------------------------------------------------

    // FUNCTION | The Items Lantern Designer Adds to the Shared Avatar Menu
    // ------------------------------------------------------------
    function VghLantern__UserLogin__AccountMenu__MenuItems() {
        var developerSection  =  VghLantern__AccountMenu__ConfigString('DeveloperMenuLabel');
        return [
            { id: ACTION_HOME_SCREEN, label: VghLantern__AccountMenu__ConfigString('HomeScreenLabel'),
              onClick: function() { VghLantern__AccountMenu__RunAction(ACTION_HOME_SCREEN); } },
            { id: ACTION_DEV_SKETCHUP, label: VghLantern__AccountMenu__ConfigString('DeveloperSketchUpLabel'),
              adminOnly: true, section: developerSection,
              onClick: function() { VghLantern__AccountMenu__RunAction(ACTION_DEV_SKETCHUP); } },
            { id: ACTION_DEV_CAD, label: VghLantern__AccountMenu__ConfigString('DeveloperCadLabel'),
              adminOnly: true, section: developerSection,
              onClick: function() { VghLantern__AccountMenu__RunAction(ACTION_DEV_CAD); } }
        ];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Route a Menu Item to Its Action
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__RunAction(actionKey) {
        if (actionKey === ACTION_HOME_SCREEN) {
            VghLantern__AccountMenu__GoToHomeScreen();
            return;
        }

        if (actionKey === ACTION_DEV_SKETCHUP || actionKey === ACTION_DEV_CAD) {
            VghLantern__AccountMenu__RunDeveloperAction(actionKey);
            return;
        }

        console.warn('[VghLantern AccountMenu] Unknown menu action:', actionKey);
    }
    // ------------------------------------------------------------


    // FUNCTION | Run One Developer Tools Export
    // ------------------------------------------------------------
    // The level is re-checked here rather than trusted from the menu. The shared
    // menu already leaves the items out for anyone who is not an AppAdmin, but
    // this routine is reachable from the public API and a second check is free.
    //
    // Both exports are fire and forget: they own their own toasts, so nothing
    // here waits on the promise or reports on its behalf beyond the case where
    // the module is absent entirely and can say nothing at all.
    function VghLantern__AccountMenu__RunDeveloperAction(actionKey) {
        var Login  =  window.ValeUserLogin;
        if (!Login || !Login.IsAppAdmin()) return;

        var Toast  =  window.VghLantern__AppNotifications__Toast;

        if (actionKey === ACTION_DEV_SKETCHUP) {
            var SketchUpWriter  =  window.VghLantern__SketchUpExport__FileWriter;
            if (!SketchUpWriter) {
                if (Toast) Toast.VghLantern__Toast__Show(
                    VghLantern__AccountMenu__ExportMessage('FailureMessage',
                        'The SketchUp exporter is not loaded.'), 'error');
                return;
            }
            SketchUpWriter.VghLantern__SketchUpExport__FileWriter__ExportCurrentLantern();
            return;
        }

        var CadWriter  =  window.VghLantern__CadDxfExport__FileWriter;
        if (!CadWriter) {
            if (Toast) Toast.VghLantern__Toast__Show(
                VghLantern__AccountMenu__ExportMessage('CadPendingMessage',
                    'The CAD export is not built yet.'), 'info');
            return;
        }
        CadWriter.VghLantern__CadDxfExport__FileWriter__ExportCurrentLantern();
    }
    // ------------------------------------------------------------


    // FUNCTION | Return to the Landing Screen
    // ------------------------------------------------------------
    // The loaded project is deliberately left in place. The landing screen
    // greys the nav tabs while it is showing, so nothing can be edited from
    // here, and leaving again lands back on the same project rather than
    // making the user reopen it from the library.
    function VghLantern__AccountMenu__GoToHomeScreen() {
        var ModeManager  =  window.VghLantern__AppCore__ModeManager;
        if (!ModeManager) return;

        if (ModeManager.VghLantern__ModeManager__GetCurrentMode() === ModeManager.MODE_LANDING_SCREEN) return;

        ModeManager.VghLantern__ModeManager__SwitchToMode(ModeManager.MODE_LANDING_SCREEN);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__UserLogin__AccountMenu__MenuItems  : VghLantern__UserLogin__AccountMenu__MenuItems
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__UserLogin__AccountMenu  =  VghLantern__UserLogin__AccountMenu;
