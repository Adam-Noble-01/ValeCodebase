/* =============================================================================
   VGHLANTERN - USER LOGIN | SESSION MANAGER
   =============================================================================

   FILE       : VghLantern__UserLogin__SessionManager__.js
   NAMESPACE  : VghLantern
   MODULE     : UserLogin - SessionManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Sign people in with their Vale account, the same one they use
                for ValeVision and ValeVision 3D
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - ONE SIGN-IN FOR EVERY VALE APP. The card, the forced first password change,
     the initials avatar and its menu are the shared module
     /AppAssets__CommonApplicationAssets/Shared__UserLogin/ (window.ValeUserLogin),
     talking to api/accounts/* on Lantern Designer's own API against the Vale
     users register. The session cookie covers the whole site, so signing in on
     the Gallery signs you in here too, and the other way round.
   - Sign-in is required: Lantern Designer is a staff tool, with nothing for a
     client to open. Start() resolves once someone is signed in, and Init waits
     for it before any project is read.
   - The signed-in person is published through StateManager in the shape the
     app always used ({ UserId, UserName, Role }), plus Level, LevelRank,
     Department and Email, so the landing greeting, the letter sign-off, the
     SketchUp export and the linework stamp read it unchanged.
   - What a person may do is decided by the API on every write (Employee and up
     save; a delete is the creator or Management); IsAppAdmin and HasLevel only
     shape the menus and buttons.

   -----------------------------------------------------------------------------

   DEVELOPMENT LOG:
   15-Oct-2026 - Version 2.0.0 (the Vale app server)
   - The shared Vale sign-in replaces the prototype gate: no more test accounts
     in Na__UserLogin__UserAccounts__.json, no cookie written by this file, and no
     login modal of its own. Sign out ends the session for every Vale app on this
     device and reloads, which re-opens the card.

   06-Aug-2026 - Version 1.0.0
   - Cookie-backed prototype gate over the test account list.

   ============================================================================= */

// =============================================================================
// REGION | User Login Session Manager Module
// =============================================================================

const VghLantern__UserLogin__SessionManager = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Where Things Are
    // ------------------------------------------------------------
    const LOGIN_MOUNT          =  '#VghLantern__AccountMenu__Mount';         // <-- The avatar sits in the header, right of the title
    const LOGIN_API_BASE       =  'api/';                                    // <-- /lantern-designer/api/accounts/...
    const LOGIN_APP_NAME       =  'Lantern Designer';
    const CONTENT_CONFIG_KEY   =  'VghLantern__UserLogin__Config__Content';  // <-- The card's logo
    const FALLBACK_LOGO_URL    =  '/AppAssets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Session State
    // ------------------------------------------------------------
    let VghLantern__UserLogin__CurrentUser  =  null;                         // <-- { UserId, UserName, Role, ... } or null
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Card's Logo From the Merged Config
    // ------------------------------------------------------------
    function VghLantern__UserLogin__LogoUrl() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var appConfig     =  StateManager ? StateManager.VghLantern__StateManager__GetAppConfig() : null;
        var content       =  (appConfig && appConfig[CONTENT_CONFIG_KEY]) || {};
        return content.LogoPath || FALLBACK_LOGO_URL;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Shared Sign-In's User in the Shape This App Reads
    // ------------------------------------------------------------
    function VghLantern__UserLogin__MapUser(user) {
        if (!user) return null;
        return {
            UserId     : user.code       || '',                              // <-- The permanent USR code
            UserName   : user.name       || '',
            Role       : user.role       || '',
            Level      : user.level      || '',
            LevelRank  : user.levelRank  || 99,
            Department : user.department || '',
            Email      : user.email      || ''
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Publish the Current User Through StateManager
    // ------------------------------------------------------------
    function VghLantern__UserLogin__PublishUser(user) {
        VghLantern__UserLogin__CurrentUser  =  VghLantern__UserLogin__MapUser(user);

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager && StateManager.VghLantern__StateManager__SetCurrentUser) {
            StateManager.VghLantern__StateManager__SetCurrentUser(VghLantern__UserLogin__CurrentUser);  // <-- Emits 'userChanged'
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Session Lifecycle - Start, Sign Out
// -----------------------------------------------------------------------------

    // FUNCTION | Start the Session: Resolves With the Signed-In User
    // ------------------------------------------------------------
    // Shows the shared card until someone signs in (and has chosen their own
    // password, if they arrived on a temporary one). Never rejects; resolves null
    // only if the shared module is missing, which leaves the app unable to load
    // any project, so the console says why.
    function VghLantern__UserLogin__SessionManager__Start() {
        var Login  =  window.ValeUserLogin;
        if (!Login || typeof Login.Init !== 'function') {
            console.error('[VghLantern__UserLogin] The shared Vale sign-in is not loaded (/AppAssets__CommonApplicationAssets/Shared__UserLogin/).');
            return Promise.resolve(null);
        }

        var AccountMenu  =  window.VghLantern__UserLogin__AccountMenu;
        var menuItems    =  (AccountMenu && AccountMenu.VghLantern__UserLogin__AccountMenu__MenuItems)
            ? AccountMenu.VghLantern__UserLogin__AccountMenu__MenuItems()
            : [];

        return new Promise(function(resolve) {
            Login.Init({
                appName   : LOGIN_APP_NAME,
                logoUrl   : VghLantern__UserLogin__LogoUrl(),
                apiBase   : LOGIN_API_BASE,
                mountEl   : LOGIN_MOUNT,
                required  : true,
                menuItems : menuItems,
                onReady   : function(user) {
                    VghLantern__UserLogin__PublishUser(user);
                    Login.OnChange(VghLantern__UserLogin__PublishUser);      // <-- A name or password change keeps the greeting current
                    console.log('[VghLantern__UserLogin] Signed in as ' + (user && user.name) + ' (' + (user && user.level) + ').');
                    resolve(VghLantern__UserLogin__CurrentUser);
                }
            }).catch(function(error) {
                console.error('[VghLantern__UserLogin] Sign-in could not start:', error);
            });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Sign Out of Every Vale App on This Device (the page reloads to the card)
    // ------------------------------------------------------------
    function VghLantern__UserLogin__SignOut() {
        var Login  =  window.ValeUserLogin;
        if (Login && Login.SignOut) Login.SignOut();
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Current Signed In User
    // ------------------------------------------------------------
    function VghLantern__UserLogin__GetCurrentUser() {
        return VghLantern__UserLogin__CurrentUser;
    }
    // ------------------------------------------------------------


    // FUNCTION | Test Whether a User Is Signed In
    // ------------------------------------------------------------
    function VghLantern__UserLogin__IsLoggedIn() {
        return !!VghLantern__UserLogin__CurrentUser;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Signed-In Person an AppAdmin? / At Least This Level?
    // ------------------------------------------------------------
    function VghLantern__UserLogin__IsAppAdmin() {
        return !!(window.ValeUserLogin && window.ValeUserLogin.IsAppAdmin());
    }

    function VghLantern__UserLogin__HasLevel(levelCode) {
        return !!(window.ValeUserLogin && window.ValeUserLogin.HasLevel(levelCode));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__UserLogin__SessionManager__Start  : VghLantern__UserLogin__SessionManager__Start,
        VghLantern__UserLogin__SignOut                : VghLantern__UserLogin__SignOut,
        VghLantern__UserLogin__GetCurrentUser         : VghLantern__UserLogin__GetCurrentUser,
        VghLantern__UserLogin__IsLoggedIn             : VghLantern__UserLogin__IsLoggedIn,
        VghLantern__UserLogin__IsAppAdmin             : VghLantern__UserLogin__IsAppAdmin,
        VghLantern__UserLogin__HasLevel               : VghLantern__UserLogin__HasLevel
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__UserLogin__SessionManager  =  VghLantern__UserLogin__SessionManager;
