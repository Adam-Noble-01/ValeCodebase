/* =============================================================================
   VGHLANTERN - USER LOGIN | LOGIN MODAL
   =============================================================================

   FILE       : VghLantern__UserLogin__LoginModal__.js
   NAMESPACE  : VghLantern
   MODULE     : UserLogin - LoginModal
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Sign in gate shown over the landing screen until a session exists
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - Builds its own overlay DOM appended to document.body, shown at boot when
     the SessionManager restored no cookie session
   - User name and password fields with an inline red validation message
   - Enter submits from either field; the button shows a signing in state
   - Cannot be dismissed without signing in - it is a gate, not a dialog
   - Reuses the shared VghLantern__Modal__ input and button classes so the
     gate reads as the same family as every other dialog in the app

   -----------------------------------------------------------------------------

   WHY THIS DOES NOT USE #VghLantern__Modal__Root:
   The shared modal root is rewritten by whichever feature speaks last
   (project modals, component detail view). The login gate must survive all
   of them and sit above them, so it owns a separate overlay with a higher
   stacking level, the same pattern the standalone WebDemoMode notice uses.

   ============================================================================= */

// =============================================================================
// REGION | User Login Modal Module
// =============================================================================

const VghLantern__UserLogin__LoginModal = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids and Classes
    // ------------------------------------------------------------
    const LOGIN_ROOT_ID        =  'VghLantern__UserLogin__Root';             // <-- Overlay element appended to body
    const LOGIN_VISIBLE_CLASS  =  'VghLantern__UserLogin__Overlay--visible'; // <-- Shown-state class
    const LOGIN_USER_INPUT_ID  =  'VghLantern__UserLogin__InputUserName';    // <-- User name field
    const LOGIN_PASS_INPUT_ID  =  'VghLantern__UserLogin__InputPassword';    // <-- Password field
    const LOGIN_MSG_ID         =  'VghLantern__UserLogin__ValidationMsg';    // <-- Inline error line
    const LOGIN_BTN_ID         =  'VghLantern__UserLogin__BtnSignIn';        // <-- Submit button
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const COPY_CONFIG_KEY       =  'VghLantern__UserLogin__Config__Copy';    // <-- All user-facing strings
    const COPY_CONFIG_LABEL     =  'Na__UserLogin__Config.json -> VghLantern__UserLogin__Config__Copy';
    const CONTENT_CONFIG_KEY    =  'VghLantern__UserLogin__Config__Content'; // <-- Logo artwork for the sign in card
    const CONTENT_CONFIG_LABEL  =  'Na__UserLogin__Config.json -> VghLantern__UserLogin__Config__Content';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Submit Guard
    // ------------------------------------------------------------
    let VghLantern__LoginModal__IsSubmitting  =  false;                      // <-- Blocks a double submit while a sign in resolves
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access and Markup Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Login Copy Config Block
    // ------------------------------------------------------------
    function VghLantern__LoginModal__CopyConfig() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig[COPY_CONFIG_KEY] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Copy String via the Strict Config Reader
    // ------------------------------------------------------------
    function VghLantern__LoginModal__CopyString(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__LoginModal__CopyConfig(), key, COPY_CONFIG_LABEL);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for HTML Interpolation
    // ------------------------------------------------------------
    function VghLantern__LoginModal__Escape(textValue) {
        return String(textValue == null ? '' : textValue)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Overlay Construction and Visibility
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Overlay DOM Once and Append to Body
    // ------------------------------------------------------------
    function VghLantern__LoginModal__EnsureBuilt() {
        if (document.getElementById(LOGIN_ROOT_ID)) return;

        var esc  =  VghLantern__LoginModal__Escape;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var appConfig     =  StateManager ? StateManager.VghLantern__StateManager__GetAppConfig() : null;
        var contentCfg    =  (appConfig && appConfig[CONTENT_CONFIG_KEY]) || {};
        var logoPath      =  ConfigLoader.VghLantern__ConfigLoader__RequireString(contentCfg, 'LogoPath',    CONTENT_CONFIG_LABEL);
        var logoAlt       =  ConfigLoader.VghLantern__ConfigLoader__RequireString(contentCfg, 'LogoAltText', CONTENT_CONFIG_LABEL);

        var dialogHtml  =  '';
        dialogHtml     +=  '<div class="VghLantern__UserLogin__Dialog">';
        dialogHtml     +=      '<img class="VghLantern__UserLogin__Logo" src="' + esc(logoPath) + '" alt="' + esc(logoAlt) + '">';
        dialogHtml     +=      '<h3 class="VghLantern__UserLogin__Title">' + esc(VghLantern__LoginModal__CopyString('ModalTitle')) + '</h3>';
        dialogHtml     +=      '<p class="VghLantern__UserLogin__Subtitle">' + esc(VghLantern__LoginModal__CopyString('ModalSubtitle')) + '</p>';
        dialogHtml     +=      '<label class="VghLantern__Modal__Label" for="' + LOGIN_USER_INPUT_ID + '">' + esc(VghLantern__LoginModal__CopyString('UserNameLabel')) + '</label>';
        dialogHtml     +=      '<input id="' + LOGIN_USER_INPUT_ID + '" class="VghLantern__Modal__Input" type="text"';
        dialogHtml     +=          ' autocomplete="off" data-vghlantern-noautofill="true"';
        dialogHtml     +=          ' placeholder="' + esc(VghLantern__LoginModal__CopyString('UserNamePlaceholder')) + '">';
        dialogHtml     +=      '<label class="VghLantern__Modal__Label" for="' + LOGIN_PASS_INPUT_ID + '">' + esc(VghLantern__LoginModal__CopyString('PasswordLabel')) + '</label>';
        dialogHtml     +=      '<input id="' + LOGIN_PASS_INPUT_ID + '" class="VghLantern__Modal__Input" type="password"';
        dialogHtml     +=          ' autocomplete="off" data-vghlantern-noautofill="true"';
        dialogHtml     +=          ' placeholder="' + esc(VghLantern__LoginModal__CopyString('PasswordPlaceholder')) + '">';
        dialogHtml     +=      '<div id="' + LOGIN_MSG_ID + '" class="VghLantern__Modal__ValidationMsg"></div>';
        dialogHtml     +=      '<button id="' + LOGIN_BTN_ID + '" class="VghLantern__Modal__BtnPrimary VghLantern__UserLogin__BtnSignIn">';
        dialogHtml     +=          esc(VghLantern__LoginModal__CopyString('SignInLabel'));
        dialogHtml     +=      '</button>';
        dialogHtml     +=  '</div>';

        var rootEl  =  document.createElement('div');
        rootEl.id         =  LOGIN_ROOT_ID;
        rootEl.className  =  'VghLantern__UserLogin__Overlay';
        rootEl.innerHTML  =  dialogHtml;
        document.body.appendChild(rootEl);

        VghLantern__LoginModal__BindEvents();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Submit and Enter Key Handlers
    // ------------------------------------------------------------
    function VghLantern__LoginModal__BindEvents() {
        var signInBtn  =  document.getElementById(LOGIN_BTN_ID);
        var userInput  =  document.getElementById(LOGIN_USER_INPUT_ID);
        var passInput  =  document.getElementById(LOGIN_PASS_INPUT_ID);

        if (signInBtn) signInBtn.addEventListener('click', VghLantern__LoginModal__OnSubmit);

        var submitOnEnter  =  function(keyEvent) {
            if (keyEvent.key === 'Enter') {
                keyEvent.preventDefault();
                VghLantern__LoginModal__OnSubmit();
            }
        };
        if (userInput) userInput.addEventListener('keydown', submitOnEnter);
        if (passInput) passInput.addEventListener('keydown', submitOnEnter);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Login Gate
    // ------------------------------------------------------------
    // Fields and the error line are cleared on every show: a reshown gate
    // after sign out must not present the previous user's name.
    function VghLantern__LoginModal__Show() {
        VghLantern__LoginModal__EnsureBuilt();

        var rootEl  =  document.getElementById(LOGIN_ROOT_ID);
        if (rootEl) rootEl.classList.add(LOGIN_VISIBLE_CLASS);

        var userInput  =  document.getElementById(LOGIN_USER_INPUT_ID);
        var passInput  =  document.getElementById(LOGIN_PASS_INPUT_ID);
        if (userInput) userInput.value  =  '';
        if (passInput) passInput.value  =  '';
        VghLantern__LoginModal__ShowMessage('');

        if (userInput) userInput.focus();                                    // <-- Land the caret ready to type a name
    }
    // ------------------------------------------------------------


    // FUNCTION | Hide the Login Gate
    // ------------------------------------------------------------
    function VghLantern__LoginModal__Hide() {
        var rootEl  =  document.getElementById(LOGIN_ROOT_ID);
        if (rootEl) rootEl.classList.remove(LOGIN_VISIBLE_CLASS);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Submit Flow
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Show the Inline Validation Message
    // ------------------------------------------------------------
    function VghLantern__LoginModal__ShowMessage(messageText) {
        var target  =  document.getElementById(LOGIN_MSG_ID);
        if (target) target.textContent  =  messageText;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Toggle the Submitting State on the Form Controls
    // ------------------------------------------------------------
    function VghLantern__LoginModal__SetSubmitting(isSubmitting) {
        VghLantern__LoginModal__IsSubmitting  =  isSubmitting;

        var signInBtn  =  document.getElementById(LOGIN_BTN_ID);
        if (signInBtn) {
            signInBtn.disabled     =  isSubmitting;
            signInBtn.textContent  =  VghLantern__LoginModal__CopyString(isSubmitting ? 'SigningInLabel' : 'SignInLabel');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Attempt Sign In from the Field Values
    // ------------------------------------------------------------
    async function VghLantern__LoginModal__OnSubmit() {
        if (VghLantern__LoginModal__IsSubmitting) return;                    // <-- A sign in is already resolving

        var SessionManager  =  window.VghLantern__UserLogin__SessionManager;
        if (!SessionManager) return;

        var userInput  =  document.getElementById(LOGIN_USER_INPUT_ID);
        var passInput  =  document.getElementById(LOGIN_PASS_INPUT_ID);
        var userName   =  userInput ? userInput.value.trim() : '';
        var password   =  passInput ? passInput.value        : '';

        if (!userName || !password) {
            VghLantern__LoginModal__ShowMessage(VghLantern__LoginModal__CopyString('ErrorMissingFields'));
            return;
        }

        VghLantern__LoginModal__ShowMessage('');
        VghLantern__LoginModal__SetSubmitting(true);

        var result  =  await SessionManager.VghLantern__UserLogin__SignIn(userName, password);
        VghLantern__LoginModal__SetSubmitting(false);

        if (result && result.Ok) {
            if (passInput) passInput.value  =  '';                           // <-- Never keep a password sitting in the DOM
            VghLantern__LoginModal__Hide();
            return;
        }

        var errorKey  =  (result && result.Error === 'accounts-unavailable')
            ? 'ErrorAccountsUnavailable'
            : 'ErrorUnknownUser';
        VghLantern__LoginModal__ShowMessage(VghLantern__LoginModal__CopyString(errorKey));

        if (passInput) { passInput.value  =  ''; passInput.focus(); }        // <-- Clear the wrong password and retry from there
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Initialise - Show the Gate When No Session Was Restored
    // ------------------------------------------------------------
    // Runs once at boot, after the SessionManager has had its chance to
    // restore a cookie session. Signing out later re-opens the gate via
    // the landing screen's sign out link calling Show directly.
    function VghLantern__UserLogin__LoginModal__Init() {
        var SessionManager  =  window.VghLantern__UserLogin__SessionManager;
        var isLoggedIn      =  !!(SessionManager && SessionManager.VghLantern__UserLogin__IsLoggedIn());

        if (!isLoggedIn) VghLantern__LoginModal__Show();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__UserLogin__LoginModal__Init  : VghLantern__UserLogin__LoginModal__Init,
        VghLantern__UserLogin__LoginModal__Show  : VghLantern__LoginModal__Show,
        VghLantern__UserLogin__LoginModal__Hide  : VghLantern__LoginModal__Hide
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__UserLogin__LoginModal  =  VghLantern__UserLogin__LoginModal;
