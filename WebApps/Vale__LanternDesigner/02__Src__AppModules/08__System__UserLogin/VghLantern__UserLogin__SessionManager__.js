/* =============================================================================
   VGHLANTERN - USER LOGIN | SESSION MANAGER
   =============================================================================

   FILE       : VghLantern__UserLogin__SessionManager__.js
   NAMESPACE  : VghLantern
   MODULE     : UserLogin - SessionManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Cookie-backed sign in session over the test account list
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - Restores the signed in user from the session cookie at boot
   - Signs a user in against Na__UserLogin__UserAccounts__.json
   - Writes the session cookie with the configured lifetime (one month)
   - Publishes the current user through StateManager so UI reacts via
     the 'userChanged' event rather than polling this module
   - Sign out clears the cookie and the published user

   -----------------------------------------------------------------------------

   WHY A COOKIE RATHER THAN LOCALSTORAGE:
   The PWA cache purge routine wipes localStorage apart from the project
   prefixes, and the product decision is that a signed in user stays signed
   in for a month regardless of cache maintenance. A cookie survives that
   purge and carries its own expiry, so the one month lifetime lives in the
   browser rather than in code that has to check a stored date.

   ============================================================================= */

// =============================================================================
// REGION | User Login Session Manager Module
// =============================================================================

const VghLantern__UserLogin__SessionManager = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const SESSION_CONFIG_KEY    =  'VghLantern__UserLogin__Config__Session';                     // <-- Cookie name, lifetime and accounts path
    const SESSION_CONFIG_LABEL  =  'Na__UserLogin__Config.json -> VghLantern__UserLogin__Config__Session';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Session State
    // ------------------------------------------------------------
    let VghLantern__UserLogin__CurrentUser       =  null;                    // <-- { UserId, UserName, Role } or null when signed out
    let VghLantern__UserLogin__AccountsPromise   =  null;                    // <-- In-flight or resolved accounts fetch
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and Cookie Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Session Config Block from Merged App Config
    // ------------------------------------------------------------
    function VghLantern__UserLogin__SessionConfig() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig[SESSION_CONFIG_KEY] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Cookie Value by Name
    // ------------------------------------------------------------
    function VghLantern__UserLogin__ReadCookie(cookieName) {
        var pairs  =  document.cookie ? document.cookie.split('; ') : [];
        for (var i = 0; i < pairs.length; i++) {
            var separatorIndex  =  pairs[i].indexOf('=');
            if (separatorIndex < 0) continue;
            if (pairs[i].substring(0, separatorIndex) === cookieName) {
                return pairs[i].substring(separatorIndex + 1);
            }
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the Session Cookie with Configured Lifetime
    // ------------------------------------------------------------
    function VghLantern__UserLogin__WriteSessionCookie(userRecord) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__UserLogin__SessionConfig();
        var cookieName    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'CookieName',         SESSION_CONFIG_LABEL);
        var lifetimeDays  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(config, 'CookieLifetimeDays', SESSION_CONFIG_LABEL);

        var payload  =  {
            UserId     : userRecord.UserId,
            UserName   : userRecord.UserName,
            Role       : userRecord.Role || '',
            SignedInAt : new Date().toISOString()
        };

        var maxAgeSeconds  =  Math.round(lifetimeDays * 86400);
        document.cookie  =  cookieName + '=' + encodeURIComponent(JSON.stringify(payload)) +
            '; max-age=' + maxAgeSeconds + '; path=/; SameSite=Lax';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clear the Session Cookie
    // ------------------------------------------------------------
    function VghLantern__UserLogin__ClearSessionCookie() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__UserLogin__SessionConfig();
        var cookieName    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'CookieName', SESSION_CONFIG_LABEL);

        document.cookie  =  cookieName + '=; max-age=0; path=/; SameSite=Lax';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Publish the Current User Through StateManager
    // ------------------------------------------------------------
    function VghLantern__UserLogin__PublishUser(userData) {
        VghLantern__UserLogin__CurrentUser  =  userData;

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager && StateManager.VghLantern__StateManager__SetCurrentUser) {
            StateManager.VghLantern__StateManager__SetCurrentUser(userData);  // <-- Emits 'userChanged' for the landing screen greeting
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Account List Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch and Cache the Test Account Records
    // ------------------------------------------------------------
    function VghLantern__UserLogin__FetchAccounts() {
        if (VghLantern__UserLogin__AccountsPromise) return VghLantern__UserLogin__AccountsPromise;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__UserLogin__SessionConfig();
        var accountsPath  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'AccountsPath', SESSION_CONFIG_LABEL);

        VghLantern__UserLogin__AccountsPromise  =  fetch(accountsPath, { cache: 'no-store' })
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function(accountsData) {
                var records  =  accountsData['VghLantern__UserLogin__Accounts__Records'];
                if (!Array.isArray(records)) {
                    throw new Error('Accounts records key missing or not an array'); // <-- Authoring slip reports as unavailable, not wrong credentials
                }
                return records;
            })
            .catch(function(fetchError) {
                VghLantern__UserLogin__AccountsPromise  =  null;             // <-- Allow a retry on the next sign in attempt
                console.error('[VghLantern__UserLogin] Could not load the account list:', fetchError);
                return null;
            });

        return VghLantern__UserLogin__AccountsPromise;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Session Lifecycle - Restore, Sign In, Sign Out
// -----------------------------------------------------------------------------

    // FUNCTION | Initialise - Restore a Signed In User from the Cookie
    // ------------------------------------------------------------
    // Called once at boot after config load. The cookie is trusted as issued;
    // it only ever holds what a successful sign in wrote into it.
    function VghLantern__UserLogin__SessionManager__Init() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__UserLogin__SessionConfig();
        var cookieName    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'CookieName', SESSION_CONFIG_LABEL);

        var rawValue  =  VghLantern__UserLogin__ReadCookie(cookieName);
        if (!rawValue) return;                                               // <-- No session; the login modal takes it from here

        try {
            var payload  =  JSON.parse(decodeURIComponent(rawValue));
            if (payload && payload.UserName) {
                VghLantern__UserLogin__PublishUser({
                    UserId   : payload.UserId   || '',
                    UserName : payload.UserName,
                    Role     : payload.Role     || ''
                });
                console.log('[VghLantern__UserLogin] Session restored for ' + payload.UserName + '.');
            }
        } catch (parseError) {
            console.warn('[VghLantern__UserLogin] Discarding an unreadable session cookie:', parseError);
            VghLantern__UserLogin__ClearSessionCookie();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Sign In Against the Test Account List
    // ------------------------------------------------------------
    // Resolves { Ok: true, User } on success, { Ok: false, Error } otherwise
    // where Error is 'unknown-user' or 'accounts-unavailable'. User name
    // matching is case insensitive; the password match is exact.
    async function VghLantern__UserLogin__SignIn(userNameText, passwordText) {
        var accounts  =  await VghLantern__UserLogin__FetchAccounts();
        if (!accounts) return { Ok: false, Error: 'accounts-unavailable' };

        var userName  =  (userNameText || '').trim().toLowerCase();

        for (var i = 0; i < accounts.length; i++) {
            var account  =  accounts[i];
            if (!account || typeof account.UserName !== 'string') continue;

            if (account.UserName.trim().toLowerCase() === userName && account.Password === passwordText) {
                var userData  =  {
                    UserId   : account.UserId   || '',
                    UserName : account.UserName,
                    Role     : account.Role     || ''
                };
                VghLantern__UserLogin__WriteSessionCookie(userData);
                VghLantern__UserLogin__PublishUser(userData);
                console.log('[VghLantern__UserLogin] Signed in as ' + userData.UserName + '.');
                return { Ok: true, User: userData };
            }
        }

        return { Ok: false, Error: 'unknown-user' };                         // <-- Same answer for wrong name or wrong password
    }
    // ------------------------------------------------------------


    // FUNCTION | Sign Out - Clear the Cookie and Published User
    // ------------------------------------------------------------
    function VghLantern__UserLogin__SignOut() {
        VghLantern__UserLogin__ClearSessionCookie();
        VghLantern__UserLogin__PublishUser(null);
        console.log('[VghLantern__UserLogin] Signed out.');
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__UserLogin__SessionManager__Init  : VghLantern__UserLogin__SessionManager__Init,
        VghLantern__UserLogin__SignIn                : VghLantern__UserLogin__SignIn,
        VghLantern__UserLogin__SignOut               : VghLantern__UserLogin__SignOut,
        VghLantern__UserLogin__GetCurrentUser        : VghLantern__UserLogin__GetCurrentUser,
        VghLantern__UserLogin__IsLoggedIn            : VghLantern__UserLogin__IsLoggedIn
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__UserLogin__SessionManager  =  VghLantern__UserLogin__SessionManager;
