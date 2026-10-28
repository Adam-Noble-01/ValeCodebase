// =============================================================================
// VALEVISION3D - APP UTILS - AUTHORING GATE
// =============================================================================
//
// FILE       : Na__AppUtils__DevGate__.js
// NAMESPACE  : Na__DevGate
// MODULE     : App Utils - Authoring Gate
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Decide whether this session may AUTHOR: the Dev Tools menu, every save
//              button and the Layout Editor's editing surface ask this one question
// CREATED    : 12-Sep-2026
//
// DESCRIPTION:
// - AUTHORING BELONGS TO APP ADMINS. Since 06-Oct-2026 the answer comes from
//   who is signed in (the shared Vale sign-in, window.ValeUserLogin): a user at
//   permission level AppAdmin - Adam and Shane - authors; everyone else, and a
//   client opening a project link without an account, sees the read-only
//   viewer. It used to be "am I on localhost", which stopped meaning anything
//   once the app and its API moved onto one server.
// - This decides what the UI OFFERS. It is not the security: the server API
//   checks the signed-in user's level again on every write.
// - AN ADMIN CAN STILL PREVIEW THE CLIENT VIEW. ?authoring=off (or
//   Na__DevGate__Lock() in the console) locks authoring on this device, so the
//   read-only build - the Layout Editor's document viewer included - is seen
//   exactly as a client sees it; ?authoring=on (or Na__DevGate__Unlock())
//   lifts that lock again. Neither can unlock authoring for a non-admin.
// - Resolved ONCE per page load, after the sign-in has settled (index.html
//   awaits it before any module asks). Signing in or out later reloads the
//   page, so every panel is built for the right person.
// - A CLIENT LINK NEVER AUTHORS (28-Oct-2026). A page opened from a client link
//   (?project=<id>&share=<token>, 93__Feature__ClientLinks) answers "no" whoever
//   is signed in on the device, as Theia shows staff a client link's own view.
//   Na__DevGate__IsClientLink() is the one rule for "is this a client link",
//   read from the address; the Layout Editor's loader asks it too.
//
// INTEGRATION:
// - Lock / unlock: ?authoring=off|on, or Na__DevGate__Lock() / Na__DevGate__Unlock() on window.
// - Every dev panel, save button and the Layout Editor call Na__DevGate__IsAuthoringEnabled().
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 03__AppUtils/Na__AppUtils__DevGate__.js 1.1.0
// - Parity        : diverged (the same names; ValeVision's answer is the signed-in user's level)
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 28-Oct-2026 - Version 2.1.0 (ValeVision3D v2.77.0, client links)
// - Na__DevGate__IsClientLink(): a page opened from a client link. Authoring is
//   off on one, whoever is signed in.
//
// 06-Oct-2026 - Version 2.0.0 (the move to app.valegardenhouses.com)
// - Authoring is the signed-in user's AppAdmin level, not the hostname. The
//   device switch can only lock (preview the client view), never unlock.
//
// 18-Sep-2026 - Version 1.1.0
// - Tri-state stored flag: an explicit lock closes authoring on localhost too.
//
// 12-Sep-2026 - Version 1.0.0
// - Ported from TrueVision, where it was written for plan decision TD01.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Storage Key, URL Parameter and the Authoring Level
    // ------------------------------------------------------------
    const Na__DevGate__STORAGE_KEY  = 'ValeVision3D__AuthoringLocked';           // <-- 'true' = an admin chose the client view on this device
    const Na__DevGate__URL_PARAM    = 'authoring';
    const Na__DevGate__AUTHOR_LEVEL = 'AppAdmin';                                // <-- The server's AUTHOR_LEVEL (VALEVISION3D_AUTHOR_LEVEL)
    const Na__DevGate__SHARE_PARAM  = 'share';                                   // <-- A client link's token (93__Feature__ClientLinks)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Resolved Answer
    // ------------------------------------------------------------
    // Resolved ONCE, on first ask: a gate that changed its answer mid-session
    // would leave half the dev panels built and half not.
    // ------------------------------------------------------------
    let Na__DevGate__Resolved = null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Private
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is the Signed-In User an Author?
    // ------------------------------------------------------------
    function Na__DevGate__UserIsAuthor() {
        const login = window.ValeUserLogin;
        if (!login || typeof login.HasLevel !== 'function') return false;       // <-- No sign-in module: nobody authors
        try { return login.HasLevel(Na__DevGate__AUTHOR_LEVEL) === true; }
        catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read / Write the Device Lock (wrapped: storage can throw)
    // ------------------------------------------------------------
    function Na__DevGate__IsLockedHere() {
        try { return window.localStorage.getItem(Na__DevGate__STORAGE_KEY) === 'true'; }
        catch (error) { return false; }
    }
    function Na__DevGate__WriteLock(locked) {
        try {
            if (locked) window.localStorage.setItem(Na__DevGate__STORAGE_KEY, 'true');
            else window.localStorage.removeItem(Na__DevGate__STORAGE_KEY);
            return true;
        } catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply an ?authoring= Parameter, If Present
    // ------------------------------------------------------------
    function Na__DevGate__ApplyUrlParam() {
        try {
            const value = new URLSearchParams(window.location.search).get(Na__DevGate__URL_PARAM);
            if (value === null) return;
            const on = (value === 'on' || value === '1' || value === 'true');
            Na__DevGate__WriteLock(!on);
            console.log(`[ValeVision3D] Authoring ${on ? 'lock lifted' : 'locked (client view)'} by URL parameter on this device.`);
        } catch (error) { /* a URL that cannot be read changes nothing */ }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Was This Page Opened From a Client Link? (?project=<id>&share=<token>)
    // ------------------------------------------------------------
    // The same test as the head script that marks <html class="na-client-mode">
    // in index.html, so the styles and every module agree.
    // ------------------------------------------------------------
    function Na__DevGate__IsClientLink() {
        try {
            const params = new URLSearchParams(window.location.search);
            return !!(params.get(Na__DevGate__SHARE_PARAM) || '').trim()
                && !!(params.get('project') || params.get('project-folder') || '').trim();
        } catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // FUNCTION | May This Session Author?
    // ------------------------------------------------------------
    function Na__DevGate__IsAuthoringEnabled() {
        if (Na__DevGate__Resolved !== null) return Na__DevGate__Resolved;
        if (Na__DevGate__IsClientLink()) {
            Na__DevGate__Resolved = false;                                       // <-- A client link: the client's view, whoever is signed in
            return Na__DevGate__Resolved;
        }
        Na__DevGate__ApplyUrlParam();
        const author = Na__DevGate__UserIsAuthor();
        Na__DevGate__Resolved = author && !Na__DevGate__IsLockedHere();
        if (author && !Na__DevGate__Resolved) {
            console.log('[ValeVision3D] Authoring is locked on this device: this is the client view. Run Na__DevGate__Unlock() (or ?authoring=on) and reload to author again.');
        }
        return Na__DevGate__Resolved;
    }
    // ------------------------------------------------------------


    // FUNCTION | Lift / Set the Device Lock (takes effect on the next load)
    // ------------------------------------------------------------
    function Na__DevGate__Unlock() {
        const ok = Na__DevGate__WriteLock(false);
        console.log(Na__DevGate__UserIsAuthor()
            ? '[ValeVision3D] Authoring lock lifted. Reload to build the dev surfaces.'
            : '[ValeVision3D] Lock lifted, but authoring needs an app admin to be signed in.');
        return ok;
    }

    function Na__DevGate__Lock() {
        const ok = Na__DevGate__WriteLock(true);
        console.log('[ValeVision3D] Authoring locked on this device (client view). Reload to hide the dev surfaces.');
        return ok;
    }
    // ------------------------------------------------------------


    // FUNCTION | Expose the Two Switches on window for the Console
    // ------------------------------------------------------------
    function Na__DevGate__Initialize() {
        window.Na__DevGate__Unlock = Na__DevGate__Unlock;
        window.Na__DevGate__Lock   = Na__DevGate__Lock;
        Na__DevGate__IsAuthoringEnabled();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Authoring Gate API
    // ------------------------------------------------------------
    export {
        Na__DevGate__IsAuthoringEnabled,
        Na__DevGate__IsClientLink,
        Na__DevGate__Unlock,
        Na__DevGate__Lock,
        Na__DevGate__Initialize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
