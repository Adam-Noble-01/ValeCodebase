/* =============================================================================
   VGHLANTERN - LANDING SCREEN CONTROLLER
   =============================================================================

   FILE       : VghLantern__LandingScreen__Controller__.js
   NAMESPACE  : VghLantern
   MODULE     : LandingScreen - Controller
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Boot landing card with typewriter greeting and entry buttons
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - Renders the landing card: logo, greeting, entry buttons and footer
   - Types the greeting character by character with the signed in user's name
   - Locks every navigation tab (greyed, unclickable) while this mode is
     active; the lock lifts the moment any other mode is entered
   - View Project Library switches to the Projects tab; Create New Project
     opens the database-first new project modal owned by ProjectActions
   - Sign out clears the session and re-opens the login gate over this screen

   -----------------------------------------------------------------------------

   WHY THE TAB LOCK IS A NAV BAR CLASS RATHER THAN PER-TAB DISABLING:
   Init's UpdateNavTabStates rewrites each tab's --disabled class on every
   'projectChanged' event, so any per-tab class this module set would be
   overwritten by the next project event. One modifier class on the nav bar
   container greys and mutes everything below it without touching the
   per-tab state machine, and removing it restores exactly what the project
   gating had decided underneath.

   ============================================================================= */

// =============================================================================
// REGION | Landing Screen Controller Module
// =============================================================================

const VghLantern__LandingScreen__Controller = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Targets and Mode Key
    // ------------------------------------------------------------
    const LANDING_CONTAINER_ID  =  'VghLantern__LandingScreen__Container';   // <-- Panel content root in the app shell
    const LANDING_MODE_KEY      =  'LandingScreen';                          // <-- ModeManager mode id for this screen
    const NAV_BAR_ID            =  'VghLantern__App__NavigationBar';         // <-- Tab bar the landing lock class goes on
    const NAV_LOCK_CLASS        =  'VghLantern__App__NavigationBar--landingLocked'; // <-- Greys every tab while landing is active
    const GREETING_TEXT_ID      =  'VghLantern__LandingScreen__GreetingText';       // <-- Span the typewriter writes into
    const GREETING_CARET_ID     =  'VghLantern__LandingScreen__GreetingCaret';      // <-- Blinking caret span
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const CONTENT_CONFIG_KEY      =  'VghLantern__LandingScreen__Config__Content';
    const CONTENT_CONFIG_LABEL    =  'Na__LandingScreen__Config.json -> VghLantern__LandingScreen__Config__Content';
    const BEHAVIOUR_CONFIG_KEY    =  'VghLantern__LandingScreen__Config__Behaviour';
    const BEHAVIOUR_CONFIG_LABEL  =  'Na__LandingScreen__Config.json -> VghLantern__LandingScreen__Config__Behaviour';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Typewriter State
    // ------------------------------------------------------------
    let VghLantern__LandingScreen__TypewriterTimerId  =  null;               // <-- Pending character timeout, cancelled on re-render
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access and Markup Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Landing Screen Config Section
    // ------------------------------------------------------------
    function VghLantern__LandingScreen__ConfigSection(sectionKey) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig[sectionKey] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for HTML Interpolation
    // ------------------------------------------------------------
    function VghLantern__LandingScreen__Escape(textValue) {
        return String(textValue == null ? '' : textValue)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Signed In User from StateManager
    // ------------------------------------------------------------
    function VghLantern__LandingScreen__CurrentUser() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager || !StateManager.VghLantern__StateManager__GetCurrentUser) return null;
        return StateManager.VghLantern__StateManager__GetCurrentUser();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Render the Landing Card
    // ------------------------------------------------------------
    // Re-runs on every mode entry and on every user change while the mode is
    // active, so it rebuilds from scratch and restarts the greeting.
    function VghLantern__LandingScreen__Render() {
        VghLantern__LandingScreen__CancelTypewriter();                       // <-- Every rebuild kills the old chain, signed in or not

        var container  =  document.getElementById(LANDING_CONTAINER_ID);
        if (!container) {
            console.warn('[VghLantern LandingScreen] Container not found: #' + LANDING_CONTAINER_ID);
            return;
        }

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var content       =  VghLantern__LandingScreen__ConfigSection(CONTENT_CONFIG_KEY);
        var esc           =  VghLantern__LandingScreen__Escape;
        var currentUser   =  VghLantern__LandingScreen__CurrentUser();

        var logoPath          =  ConfigLoader.VghLantern__ConfigLoader__RequireString(content, 'LogoPath',           CONTENT_CONFIG_LABEL);
        var logoAlt           =  ConfigLoader.VghLantern__ConfigLoader__RequireString(content, 'LogoAltText',        CONTENT_CONFIG_LABEL);
        var libraryLabel      =  ConfigLoader.VghLantern__ConfigLoader__RequireString(content, 'BtnLibraryLabel',    CONTENT_CONFIG_LABEL);
        var newProjectLabel   =  ConfigLoader.VghLantern__ConfigLoader__RequireString(content, 'BtnNewProjectLabel', CONTENT_CONFIG_LABEL);
        var versionTemplate   =  ConfigLoader.VghLantern__ConfigLoader__RequireString(content, 'VersionLabelTemplate', CONTENT_CONFIG_LABEL);
        var copyrightText     =  ConfigLoader.VghLantern__ConfigLoader__RequireString(content, 'CopyrightText',      CONTENT_CONFIG_LABEL);
        var signedInPrefix    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(content, 'SignedInAsPrefix',   CONTENT_CONFIG_LABEL);
        var signOutLabel      =  ConfigLoader.VghLantern__ConfigLoader__RequireString(content, 'SignOutLabel',       CONTENT_CONFIG_LABEL);

        var appSection    =  VghLantern__LandingScreen__ConfigSection('VghLantern__Application__Config');
        var appVersion    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
            appSection, 'VghLantern__Application__Config__AppVersion', 'VghLantern__AppConfig__Main__.json -> VghLantern__Application__Config');
        var versionLabel  =  versionTemplate.replace('{AppVersion}', appVersion);

        var cardHtml  =  '';
        cardHtml     +=  '<div class="VghLantern__LandingScreen__Card">';
        cardHtml     +=      '<img class="VghLantern__LandingScreen__Logo" src="' + esc(logoPath) + '" alt="' + esc(logoAlt) + '">';
        cardHtml     +=      '<p class="VghLantern__LandingScreen__Greeting">';
        cardHtml     +=          '<span id="' + GREETING_TEXT_ID + '"></span>';
        cardHtml     +=          '<span id="' + GREETING_CARET_ID + '" class="VghLantern__LandingScreen__Caret"></span>';
        cardHtml     +=      '</p>';
        cardHtml     +=      '<div class="VghLantern__LandingScreen__Actions">';
        cardHtml     +=          '<button id="VghLantern__LandingScreen__BtnLibrary" class="VghLantern__LandingScreen__BtnOutline">' + esc(libraryLabel) + '</button>';
        cardHtml     +=          '<button id="VghLantern__LandingScreen__BtnNewProject" class="VghLantern__LandingScreen__BtnOutline">' + esc(newProjectLabel) + '</button>';
        cardHtml     +=      '</div>';
        cardHtml     +=      '<div class="VghLantern__LandingScreen__Footer">';
        cardHtml     +=          '<p class="VghLantern__LandingScreen__Version">' + esc(versionLabel) + '</p>';
        cardHtml     +=          '<div class="VghLantern__LandingScreen__Rule"></div>';
        cardHtml     +=          '<p class="VghLantern__LandingScreen__Copyright">' + esc(copyrightText) + '</p>';
        if (currentUser) {
            cardHtml +=          '<p class="VghLantern__LandingScreen__SignedInRow">';
            cardHtml +=              esc(signedInPrefix) + ' ' + esc(currentUser.UserName) + '. ';
            cardHtml +=              '<button id="VghLantern__LandingScreen__BtnSignOut" class="VghLantern__LandingScreen__SignOutLink">' + esc(signOutLabel) + '</button>';
            cardHtml +=          '</p>';
        }
        cardHtml     +=      '</div>';
        cardHtml     +=  '</div>';

        container.innerHTML  =  cardHtml;
        VghLantern__LandingScreen__BindCardActions();

        if (currentUser) {
            VghLantern__LandingScreen__StartTypewriter(currentUser.UserName); // <-- No user yet means the login gate is still covering us
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind the Card's Buttons and Sign Out Link
    // ------------------------------------------------------------
    function VghLantern__LandingScreen__BindCardActions() {
        var libraryBtn     =  document.getElementById('VghLantern__LandingScreen__BtnLibrary');
        var newProjectBtn  =  document.getElementById('VghLantern__LandingScreen__BtnNewProject');
        var signOutBtn     =  document.getElementById('VghLantern__LandingScreen__BtnSignOut');

        if (libraryBtn) {
            libraryBtn.addEventListener('click', function() {
                var ModeManager  =  window.VghLantern__AppCore__ModeManager;
                if (ModeManager) ModeManager.VghLantern__ModeManager__SwitchToMode(ModeManager.MODE_DOC_MANAGEMENT);
            });
        }

        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', function() {
                var ProjectActions  =  window.VghLantern__DocManagement__ProjectActions;
                if (ProjectActions && ProjectActions.VghLantern__ProjectActions__OnNewProjectClick) {
                    ProjectActions.VghLantern__ProjectActions__OnNewProjectClick(); // <-- The database-first modal; it navigates on success
                }
            });
        }

        if (signOutBtn) {
            signOutBtn.addEventListener('click', function() {
                var SessionManager  =  window.VghLantern__UserLogin__SessionManager;
                var LoginModal      =  window.VghLantern__UserLogin__LoginModal;
                if (SessionManager) SessionManager.VghLantern__UserLogin__SignOut();
                if (LoginModal)     LoginModal.VghLantern__UserLogin__LoginModal__Show();
            });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Typewriter Greeting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Cancel Any Typewriter Chain Still Running
    // ------------------------------------------------------------
    // Called on every card rebuild: a sign-out mid-type would otherwise leave
    // the old chain running against the rebuilt card's identically-id'd span,
    // resuming the signed-out user's greeting.
    function VghLantern__LandingScreen__CancelTypewriter() {
        if (VghLantern__LandingScreen__TypewriterTimerId) {
            clearTimeout(VghLantern__LandingScreen__TypewriterTimerId);
            VghLantern__LandingScreen__TypewriterTimerId  =  null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Write the Greeting Character by Character
    // ------------------------------------------------------------
    function VghLantern__LandingScreen__StartTypewriter(userName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var content       =  VghLantern__LandingScreen__ConfigSection(CONTENT_CONFIG_KEY);
        var behaviour     =  VghLantern__LandingScreen__ConfigSection(BEHAVIOUR_CONFIG_KEY);

        var greetingTemplate  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(content,   'GreetingTemplate',       CONTENT_CONFIG_LABEL);
        var startDelayMs      =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(behaviour, 'TypewriterStartDelayMs', BEHAVIOUR_CONFIG_LABEL);
        var charDelayMs       =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(behaviour, 'TypewriterCharDelayMs',  BEHAVIOUR_CONFIG_LABEL);
        var caretSettleMs     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(behaviour, 'CaretSettleDelayMs',     BEHAVIOUR_CONFIG_LABEL);

        var greetingText  =  greetingTemplate.replace('{UserName}', function() {
            return userName || '';                                           // <-- Function form: a $ in a user name is not a replacement pattern
        });

        VghLantern__LandingScreen__CancelTypewriter();                       // <-- A re-render mid-write starts the line over

        var writeNextChar  =  function(charIndex) {
            var textEl  =  document.getElementById(GREETING_TEXT_ID);
            if (!textEl) return;                                             // <-- The card was replaced; this run is obsolete

            textEl.textContent  =  greetingText.substring(0, charIndex);

            if (charIndex < greetingText.length) {
                VghLantern__LandingScreen__TypewriterTimerId  =  setTimeout(function() {
                    writeNextChar(charIndex + 1);
                }, charDelayMs);
                return;
            }

            VghLantern__LandingScreen__TypewriterTimerId  =  setTimeout(function() {
                var settledCaret  =  document.getElementById(GREETING_CARET_ID);
                if (settledCaret) settledCaret.classList.add('VghLantern__LandingScreen__Caret--settled');
                VghLantern__LandingScreen__TypewriterTimerId  =  null;
            }, caretSettleMs);                                               // <-- Let the caret blink a moment, then fade it away
        };

        VghLantern__LandingScreen__TypewriterTimerId  =  setTimeout(function() {
            writeNextChar(0);
        }, startDelayMs);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Navigation Lock and Initialisation
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Apply or Release the Nav Tab Lock for a Mode
    // ------------------------------------------------------------
    function VghLantern__LandingScreen__UpdateNavLock(modeId) {
        var navBar  =  document.getElementById(NAV_BAR_ID);
        if (!navBar) return;

        if (modeId === LANDING_MODE_KEY) {
            navBar.classList.add(NAV_LOCK_CLASS);                            // <-- Every tab greyed and unclickable on the landing screen
        } else {
            navBar.classList.remove(NAV_LOCK_CLASS);                         // <-- Underlying project gating shows through again
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise - Subscribe to Mode and User Changes
    // ------------------------------------------------------------
    // Bound once at boot, before the default mode switch fires, so the boot
    // entry into the landing screen applies the lock like any other entry.
    function VghLantern__LandingScreen__Init() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.VghLantern__StateManager__On('modeChanged', function(modeId) {
            VghLantern__LandingScreen__UpdateNavLock(modeId);
        });

        StateManager.VghLantern__StateManager__On('userChanged', function() {
            var ModeManager  =  window.VghLantern__AppCore__ModeManager;
            var currentMode  =  ModeManager ? ModeManager.VghLantern__ModeManager__GetCurrentMode() : null;
            if (currentMode === LANDING_MODE_KEY) {
                VghLantern__LandingScreen__Render();                         // <-- Fresh sign in re-types the greeting with the new name
            }
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
        VghLantern__LandingScreen__Init    : VghLantern__LandingScreen__Init,
        VghLantern__LandingScreen__Render  : VghLantern__LandingScreen__Render
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LandingScreen__Controller  =  VghLantern__LandingScreen__Controller;
