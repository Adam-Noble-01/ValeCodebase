/* =============================================================================
   VGHLANTERN - USER LOGIN | ACCOUNT MENU
   =============================================================================

   FILE       : VghLantern__UserLogin__AccountMenu__.js
   NAMESPACE  : VghLantern
   MODULE     : UserLogin - AccountMenu
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Header avatar button and the signed in user's menu
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Renders a circular initials avatar into the header mount point
   - Clicking the avatar opens a menu carrying the signed in user's identity
     block plus Home Screen, Switch User and Sign Out
   - Home Screen returns to the landing card from anywhere in the app; the
     loaded project is left exactly as it was, so leaving the landing screen
     again lands back on the same drawing
   - Switch User and Sign Out both clear the session and re-arm the login
     gate over the landing screen, which is the only way to change user
     without restarting the application
   - The avatar is present only while a user is signed in; with no session
     the login gate is covering the app and there is nobody to identify

   -----------------------------------------------------------------------------

   WHY THIS IS NOT CALLED "UserMenu":
   The VghLantern__UserMenu__ namespace already belongs to the per-user
   preference persistence written to 08__LocalUserData (panel section states,
   last view, and so on). That is a different thing entirely, so this module
   takes the AccountMenu name rather than overloading a namespace whose config
   keys already ship in VghLantern__AppData__UserMenuConfig__Defaults__.json.

   WHY SWITCH USER AND SIGN OUT SHARE ONE ROUTINE:
   Both end the session and re-open the gate; the difference is only which
   mental model the user arrived with. Two labels over one routine is honest
   about that, and cheaper than two code paths that must never drift apart.

   -----------------------------------------------------------------------------

   THE DEVELOPER TOOLS SECTION:
   An account whose Role is listed in DeveloperMenuRoles gets an extra section
   carrying the SketchUp and CAD exports. The gate is on rendering, not just on
   visibility: an account outside the list never has the section built and never
   has its actions bound, so there is no hidden item to reach by other means.

   The exports live in 80__System__SketchUpExport and 81__System__CadDxfExport
   and are called through window, exactly as the PDF export is. This menu knows
   which module to ask and nothing about what either one writes.

   ============================================================================= */

// =============================================================================
// REGION | User Login Account Menu Module
// =============================================================================

const VghLantern__UserLogin__AccountMenu = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids and Classes
    // ------------------------------------------------------------
    const MENU_MOUNT_ID     =  'VghLantern__AccountMenu__Mount';              // <-- Wrapper in the header; this module owns its contents
    const MENU_AVATAR_ID    =  'VghLantern__AccountMenu__Avatar';             // <-- Circular initials button
    const MENU_PANEL_ID     =  'VghLantern__AccountMenu__Panel';              // <-- Dropdown panel
    const MENU_OPEN_CLASS   =  'VghLantern__AccountMenu--open';               // <-- Open state lives on the mount, not the panel
    const MENU_ACTION_ATTR  =  'data-account-action';                         // <-- Item action key read by the delegated handler
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Menu Action Keys
    // ------------------------------------------------------------
    const ACTION_HOME_SCREEN  =  'home-screen';                               // <-- Back to the landing card, project untouched
    const ACTION_SWITCH_USER  =  'switch-user';                               // <-- End the session, re-arm the gate
    const ACTION_SIGN_OUT     =  'sign-out';                                  // <-- Same routine, different wording
    const ACTION_DEV_SKETCHUP =  'dev-sketchup-export';                       // <-- Developer only: write the SketchUp build payload
    const ACTION_DEV_CAD      =  'dev-cad-export';                            // <-- Developer only: write the layered DXF
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Export Config Section Key
    // ------------------------------------------------------------
    // The exports own their own messages; this menu reads them so a failure the
    // exporter cannot raise itself - because it never loaded - still reads in
    // the exporter's own words rather than in a second set invented here.
    const EXPORT_MENU_CONFIG_KEY  =  'VghLantern__SketchUpExport__Config__Menu';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const MENU_CONFIG_KEY    =  'VghLantern__UserLogin__Config__AccountMenu';
    const MENU_CONFIG_LABEL  =  'Na__UserLogin__Config.json -> VghLantern__UserLogin__Config__AccountMenu';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Menu State
    // ------------------------------------------------------------
    let VghLantern__AccountMenu__IsOpen         =  false;                     // <-- Mirrors the open class on the mount
    let VghLantern__AccountMenu__DismissBound   =  false;                     // <-- Document listeners are bound exactly once
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access and Markup Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Account Menu Config Block
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__Config() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig[MENU_CONFIG_KEY] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Menu String via the Strict Config Reader
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__ConfigString(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__AccountMenu__Config(), key, MENU_CONFIG_LABEL);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Menu Number via the Strict Config Reader
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__ConfigNumber(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__AccountMenu__Config(), key, MENU_CONFIG_LABEL);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Menu Array via the Strict Config Reader
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__ConfigArray(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireArray(
            VghLantern__AccountMenu__Config(), key, MENU_CONFIG_LABEL);
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


    // HELPER FUNCTION | Escape Text for HTML Interpolation
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__Escape(textValue) {
        return String(textValue == null ? '' : textValue)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Signed In User from StateManager
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__CurrentUser() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager || !StateManager.VghLantern__StateManager__GetCurrentUser) return null;
        return StateManager.VghLantern__StateManager__GetCurrentUser();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Derive Avatar Initials from a Display Name
    // ------------------------------------------------------------
    // "Adam Noble" reads as AN. A name longer than the letter budget keeps its
    // first names from the front and always spends the last slot on the final
    // word, because that is the name a colleague scans the header for.
    function VghLantern__AccountMenu__Initials(userName, maxLetters) {
        var tokens  =  String(userName == null ? '' : userName).trim().split(/\s+/);
        var words   =  [];
        for (var t = 0; t < tokens.length; t++) {
            if (tokens[t]) words.push(tokens[t]);
        }
        if (words.length === 0) return '';

        var letters  =  '';
        if (words.length <= maxLetters) {
            for (var w = 0; w < words.length; w++) letters += words[w].charAt(0);
            return letters.toUpperCase();
        }

        for (var f = 0; f < maxLetters - 1; f++) letters += words[f].charAt(0);
        letters += words[words.length - 1].charAt(0);                         // <-- Surname always takes the last slot
        return letters.toUpperCase();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Render the Avatar Button and Its Menu Panel
    // ------------------------------------------------------------
    // Re-runs on every 'userChanged' event, so it rebuilds from scratch: a
    // sign out empties the mount, a sign in fills it with the new initials.
    function VghLantern__AccountMenu__Render() {
        var mount  =  document.getElementById(MENU_MOUNT_ID);
        if (!mount) {
            console.warn('[VghLantern AccountMenu] Mount not found: #' + MENU_MOUNT_ID);
            return;
        }

        VghLantern__AccountMenu__IsOpen  =  false;                            // <-- The panel about to be discarded cannot stay "open"
        mount.classList.remove(MENU_OPEN_CLASS);

        var currentUser  =  VghLantern__AccountMenu__CurrentUser();
        if (!currentUser) {
            mount.innerHTML  =  '';                                          // <-- No session; the login gate is covering the app
            return;
        }

        var esc            =  VghLantern__AccountMenu__Escape;
        var maxInitials    =  VghLantern__AccountMenu__ConfigNumber('AvatarMaxInitials');
        var titleTemplate  =  VghLantern__AccountMenu__ConfigString('AvatarTitleTemplate');
        var roleFallback   =  VghLantern__AccountMenu__ConfigString('RoleFallbackText');
        var homeLabel      =  VghLantern__AccountMenu__ConfigString('HomeScreenLabel');
        var switchLabel    =  VghLantern__AccountMenu__ConfigString('SwitchUserLabel');
        var signOutLabel   =  VghLantern__AccountMenu__ConfigString('SignOutLabel');

        var userName   =  currentUser.UserName || '';
        var userRole   =  currentUser.Role || roleFallback;                   // <-- An account with no role still gets a second line
        var initials   =  VghLantern__AccountMenu__Initials(userName, maxInitials);
        var titleText  =  titleTemplate.replace('{UserName}', function() {
            return userName;                                                 // <-- Function form: a $ in a user name is not a replacement pattern
        });

        var menuHtml  =  '';
        menuHtml     +=  '<button id="' + MENU_AVATAR_ID + '" type="button" class="VghLantern__AccountMenu__Avatar"';
        menuHtml     +=      ' title="' + esc(titleText) + '" aria-label="' + esc(titleText) + '"';
        menuHtml     +=      ' aria-haspopup="true" aria-expanded="false" aria-controls="' + MENU_PANEL_ID + '">';
        menuHtml     +=      esc(initials);
        menuHtml     +=  '</button>';

        menuHtml     +=  '<div id="' + MENU_PANEL_ID + '" class="VghLantern__AccountMenu__Panel" role="menu">';
        menuHtml     +=      '<div class="VghLantern__AccountMenu__Identity">';
        menuHtml     +=          '<span class="VghLantern__AccountMenu__IdentityAvatar">' + esc(initials) + '</span>';
        menuHtml     +=          '<span class="VghLantern__AccountMenu__IdentityText">';
        menuHtml     +=              '<span class="VghLantern__AccountMenu__IdentityName">' + esc(userName) + '</span>';
        menuHtml     +=              '<span class="VghLantern__AccountMenu__IdentityRole">' + esc(userRole) + '</span>';
        menuHtml     +=          '</span>';
        menuHtml     +=      '</div>';
        menuHtml     +=      '<div class="VghLantern__AccountMenu__Rule"></div>';
        menuHtml     +=      '<button type="button" role="menuitem" class="VghLantern__AccountMenu__Item" ' + MENU_ACTION_ATTR + '="' + ACTION_HOME_SCREEN + '">' + esc(homeLabel) + '</button>';
        menuHtml     +=      '<button type="button" role="menuitem" class="VghLantern__AccountMenu__Item" ' + MENU_ACTION_ATTR + '="' + ACTION_SWITCH_USER + '">' + esc(switchLabel) + '</button>';
        menuHtml     +=      VghLantern__AccountMenu__DeveloperSectionHtml(currentUser);
        menuHtml     +=      '<div class="VghLantern__AccountMenu__Rule"></div>';
        menuHtml     +=      '<button type="button" role="menuitem" class="VghLantern__AccountMenu__Item VghLantern__AccountMenu__Item--danger" ' + MENU_ACTION_ATTR + '="' + ACTION_SIGN_OUT + '">' + esc(signOutLabel) + '</button>';
        menuHtml     +=  '</div>';

        mount.innerHTML  =  menuHtml;
        VghLantern__AccountMenu__BindMountActions();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Developer Tools Section, or Nothing
    // ------------------------------------------------------------
    // Returns an empty string for every account outside the configured roles,
    // which is what makes the gate real rather than cosmetic: an account that
    // does not qualify has no markup for the section at all, so there is no
    // hidden button and no action key sitting in the DOM to be found.
    function VghLantern__AccountMenu__DeveloperSectionHtml(currentUser) {
        if (!VghLantern__AccountMenu__IsDeveloper(currentUser)) return '';

        var esc             =  VghLantern__AccountMenu__Escape;
        var sectionLabel    =  VghLantern__AccountMenu__ConfigString('DeveloperMenuLabel');
        var sketchUpLabel   =  VghLantern__AccountMenu__ConfigString('DeveloperSketchUpLabel');
        var cadLabel        =  VghLantern__AccountMenu__ConfigString('DeveloperCadLabel');

        var html  =  '';
        html     +=  '<div class="VghLantern__AccountMenu__Rule"></div>';
        html     +=  '<div class="VghLantern__AccountMenu__SectionLabel">' + esc(sectionLabel) + '</div>';
        html     +=  '<button type="button" role="menuitem" class="VghLantern__AccountMenu__Item VghLantern__AccountMenu__Item--nested" '
                  +      MENU_ACTION_ATTR + '="' + ACTION_DEV_SKETCHUP + '">' + esc(sketchUpLabel) + '</button>';
        html     +=  '<button type="button" role="menuitem" class="VghLantern__AccountMenu__Item VghLantern__AccountMenu__Item--nested" '
                  +      MENU_ACTION_ATTR + '="' + ACTION_DEV_CAD + '">' + esc(cadLabel) + '</button>';

        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether This Account's Role Admits the Developer Section
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__IsDeveloper(currentUser) {
        if (!currentUser || !currentUser.Role) return false;

        var allowedRoles  =  VghLantern__AccountMenu__ConfigArray('DeveloperMenuRoles');
        var i;

        for (i = 0; i < allowedRoles.length; i++) {
            if (allowedRoles[i] === currentUser.Role) return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind the Avatar Toggle and the Delegated Item Clicks
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__BindMountActions() {
        var avatarBtn  =  document.getElementById(MENU_AVATAR_ID);
        var panelEl    =  document.getElementById(MENU_PANEL_ID);

        if (avatarBtn) {
            avatarBtn.addEventListener('click', function() {
                VghLantern__AccountMenu__Toggle();
            });
        }

        if (panelEl) {
            panelEl.addEventListener('click', function(clickEvent) {
                var itemEl  =  clickEvent.target.closest('[' + MENU_ACTION_ATTR + ']');
                if (!itemEl || !panelEl.contains(itemEl)) return;
                VghLantern__AccountMenu__RunAction(itemEl.getAttribute(MENU_ACTION_ATTR));
            });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Open, Close and Dismissal
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Reflect the Open State on the Mount and the Avatar
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__SetOpen(isOpen) {
        var mount      =  document.getElementById(MENU_MOUNT_ID);
        var avatarBtn  =  document.getElementById(MENU_AVATAR_ID);
        if (!mount) return;

        VghLantern__AccountMenu__IsOpen  =  isOpen;

        if (isOpen) {
            mount.classList.add(MENU_OPEN_CLASS);
        } else {
            mount.classList.remove(MENU_OPEN_CLASS);
        }

        if (avatarBtn) avatarBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    // ------------------------------------------------------------


    // FUNCTION | Close the Menu
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__Close() {
        if (!VghLantern__AccountMenu__IsOpen) return;
        VghLantern__AccountMenu__SetOpen(false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle the Menu Open or Closed
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__Toggle() {
        VghLantern__AccountMenu__SetOpen(!VghLantern__AccountMenu__IsOpen);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind the Document Level Dismissers Once
    // ------------------------------------------------------------
    // Bound to the document rather than an overlay element: an open menu must
    // close on a click anywhere else in the app, including inside a viewport
    // canvas that swallows its own events, and the render cycle replaces the
    // panel often enough that per-panel listeners would leak.
    function VghLantern__AccountMenu__BindDismissers() {
        if (VghLantern__AccountMenu__DismissBound) return;
        VghLantern__AccountMenu__DismissBound  =  true;

        document.addEventListener('click', function(clickEvent) {
            if (!VghLantern__AccountMenu__IsOpen) return;

            var mount  =  document.getElementById(MENU_MOUNT_ID);
            if (mount && mount.contains(clickEvent.target)) return;          // <-- Clicks inside the menu are its own business

            VghLantern__AccountMenu__Close();
        });

        document.addEventListener('keydown', function(keyEvent) {
            if (keyEvent.key === 'Escape') VghLantern__AccountMenu__Close();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Menu Actions
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Route a Menu Item Click to Its Action
    // ------------------------------------------------------------
    function VghLantern__AccountMenu__RunAction(actionKey) {
        VghLantern__AccountMenu__Close();

        if (actionKey === ACTION_HOME_SCREEN) {
            VghLantern__AccountMenu__GoToHomeScreen();
            return;
        }

        if (actionKey === ACTION_SWITCH_USER || actionKey === ACTION_SIGN_OUT) {
            VghLantern__AccountMenu__EndSession();
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
    // The role is re-checked here rather than trusted from the render. The
    // markup gate already means a non-developer has no button, but this routine
    // is reachable from the public API and a second check costs one array walk.
    //
    // Both exports are fire and forget: they own their own toasts, so nothing
    // here waits on the promise or reports on its behalf beyond the case where
    // the module is absent entirely and can say nothing at all.
    function VghLantern__AccountMenu__RunDeveloperAction(actionKey) {
        if (!VghLantern__AccountMenu__IsDeveloper(VghLantern__AccountMenu__CurrentUser())) return;

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


    // FUNCTION | End the Session and Re-Arm the Login Gate
    // ------------------------------------------------------------
    // Order matters. The landing screen is entered first so the gate opens
    // over the boot card rather than over whatever drawing was on screen;
    // the sign out then publishes a null user, which re-renders the landing
    // card without a greeting and empties this menu's mount.
    function VghLantern__AccountMenu__EndSession() {
        var ModeManager     =  window.VghLantern__AppCore__ModeManager;
        var SessionManager  =  window.VghLantern__UserLogin__SessionManager;
        var LoginModal      =  window.VghLantern__UserLogin__LoginModal;

        if (ModeManager && ModeManager.VghLantern__ModeManager__GetCurrentMode() !== ModeManager.MODE_LANDING_SCREEN) {
            ModeManager.VghLantern__ModeManager__SwitchToMode(ModeManager.MODE_LANDING_SCREEN);
        }

        if (SessionManager) SessionManager.VghLantern__UserLogin__SignOut();
        if (LoginModal)     LoginModal.VghLantern__UserLogin__LoginModal__Show();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Initialise - Subscribe to User Changes and Draw the Avatar
    // ------------------------------------------------------------
    // The immediate render covers a cookie session that was restored before
    // this subscription existed, so the avatar is correct whichever order the
    // login modules are initialised in.
    function VghLantern__UserLogin__AccountMenu__Init() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        VghLantern__AccountMenu__BindDismissers();

        StateManager.VghLantern__StateManager__On('userChanged', function() {
            VghLantern__AccountMenu__Render();                               // <-- Sign in fills the mount, sign out empties it
        });

        VghLantern__AccountMenu__Render();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__UserLogin__AccountMenu__Init   : VghLantern__UserLogin__AccountMenu__Init,
        VghLantern__UserLogin__AccountMenu__Render : VghLantern__AccountMenu__Render,
        VghLantern__UserLogin__AccountMenu__Close  : VghLantern__AccountMenu__Close
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__UserLogin__AccountMenu  =  VghLantern__UserLogin__AccountMenu;
