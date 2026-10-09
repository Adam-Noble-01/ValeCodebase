// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - USER SESSION (THE SHARED VALE SIGN-IN)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__UserSession__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : User Session
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Who is using the Create Drawing page, and may they save or delete
//              layouts for the job
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - THE SAME SIGN-IN AS VALEVISION 3D: the shared bubble
//   (/AppAssets__CommonApplicationAssets/Shared__UserLogin/, window.ValeUserLogin)
//   in the header, talking to ValeVision 3D's API. The cookie covers the whole
//   site, so whoever is signed in on the 3D tab is signed in here already.
// - NO WALL: a client's link opens ValeVision 3D without an account, and Create
//   Drawing works for them as before (lay out, export a PDF). Saving needs an
//   account, so a "Sign in" pill sits in the header instead.
// - WHO MAY: saving needs the API's save level (Employee and up: any staff
//   account; the list's answer names it, so the page follows the server);
//   deleting needs the layout's creator or Management and up. The server checks
//   both on every write; this only decides what the menu offers.
// - ApiFetch goes through ValeUserLogin.Fetch, so a 401 opens the sign-in card.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.0.0
// - Initial build with the saved layouts (ValeVision3D v2.75.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Page Events
    // ------------------------------------------------------------
    import { Na__PageLayout__Emit } from './Na__PageLayoutSystem__UiNotify__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Where Things Are
    // ------------------------------------------------------------
    const Na__PageLayout__Session__API_BASE  = new URL('../../api/', import.meta.url).href;   // <-- <app>/api/ wherever the app is served
    const Na__PageLayout__Session__MOUNT     = '#naLayoutUserSlot';
    const Na__PageLayout__Session__LOGO_URL  = '/AppAssets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
    const Na__PageLayout__Session__APP_NAME  = 'ValeVision 3D';
    const Na__PageLayout__Session__DELETE_ANY = 'Management';
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Save Level the API Answered With (Employee Until It Says)
    // ------------------------------------------------------------
    let Na__PageLayout__Session__SaveLevel = 'Employee';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | The API's Address for a Route ('projects/64135__Holt/page-layouts')
    // ------------------------------------------------------------
    function Na__PageLayout__ApiUrl(path) {
        return Na__PageLayout__Session__API_BASE + String(path || '').replace(/^\/+/, '');
    }
    // ------------------------------------------------------------


    // FUNCTION | Start the Sign-In: Resolves With the User, or Null (Never Rejects)
    // ------------------------------------------------------------
    function Na__PageLayout__UserSession__Start() {
        const login = window.ValeUserLogin;
        if (!login || typeof login.Init !== 'function') {
            console.warn('[PageLayout] The shared Vale sign-in is not loaded: layouts cannot be saved on this page.');
            return Promise.resolve(null);
        }
        return new Promise((resolve) => {
            let started = false;
            login.Init({
                appName   : Na__PageLayout__Session__APP_NAME,
                logoUrl   : Na__PageLayout__Session__LOGO_URL,
                apiBase   : Na__PageLayout__Session__API_BASE,
                mountEl   : Na__PageLayout__Session__MOUNT,
                required  : false,                                          // <-- Clients use Create Drawing too: no wall
                menuItems : [],
                onReady   : (user) => {
                    started = true;
                    login.OnChange((now) => Na__PageLayout__Emit('user', { user : now || null }));
                    resolve(user || null);
                }
            }).catch((error) => {
                console.warn('[PageLayout] Sign-in could not start:', error);
                if (!started) resolve(null);
            });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Signed-In User Now, or Null
    // ------------------------------------------------------------
    function Na__PageLayout__User() {
        return (window.ValeUserLogin && window.ValeUserLogin.User()) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remember the Save Level the API Answered With
    // ------------------------------------------------------------
    function Na__PageLayout__SetSaveLevel(level) {
        if (typeof level === 'string' && level) Na__PageLayout__Session__SaveLevel = level;
    }
    // ------------------------------------------------------------


    // FUNCTION | May the Person Here Save Layouts?
    // ------------------------------------------------------------
    function Na__PageLayout__CanSave() {
        const login = window.ValeUserLogin;
        const user  = Na__PageLayout__User();
        return !!user && !user.mustChangePassword && !!login && login.HasLevel(Na__PageLayout__Session__SaveLevel);
    }
    // ------------------------------------------------------------


    // FUNCTION | May the Person Here Delete This Layout? (Its Creator, or Management and Up)
    // ------------------------------------------------------------
    function Na__PageLayout__CanDelete(record) {
        const login = window.ValeUserLogin;
        const user  = Na__PageLayout__User();
        if (!user || !record || !Na__PageLayout__CanSave()) return false;
        return record.PageLayouts__Layout__CreatedBy === user.code || (!!login && login.HasLevel(Na__PageLayout__Session__DELETE_ANY));
    }
    // ------------------------------------------------------------


    // FUNCTION | Fetch From the API as the Person Here (a 401 Opens the Sign-In Card)
    // ------------------------------------------------------------
    function Na__PageLayout__ApiFetch(url, init) {
        const login = window.ValeUserLogin;
        if (login && typeof login.Fetch === 'function') return login.Fetch(url, init);
        return fetch(url, Object.assign({ credentials : 'same-origin' }, init || {}));
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Sign-In Card (the Shared Module Opens It on the 401 From accounts/me)
    // ------------------------------------------------------------
    function Na__PageLayout__ShowSignIn() {
        Na__PageLayout__ApiFetch(Na__PageLayout__ApiUrl('accounts/me'), { cache : 'no-store' }).catch(() => {});
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | User Session API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__ApiUrl,
        Na__PageLayout__UserSession__Start,
        Na__PageLayout__User,
        Na__PageLayout__SetSaveLevel,
        Na__PageLayout__CanSave,
        Na__PageLayout__CanDelete,
        Na__PageLayout__ApiFetch,
        Na__PageLayout__ShowSignIn
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
