// =============================================================================
// VALEVISION3D - APP UTILS - USER SESSION (THE SHARED VALE SIGN-IN)
// =============================================================================
//
// FILE       : Na__AppUtils__UserSession__.js
// NAMESPACE  : Na__UserSession
// MODULE     : App Utils - User Session
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Sign people in with their Vale account (email and password), show the
//              initials bubble top right, and say who may author
// CREATED    : 06-Oct-2026
//
// DESCRIPTION:
// - ONE SIGN-IN FOR EVERY VALE APP. The gate, the bubble and its menu are the
//   shared module /AppAssets__CommonApplicationAssets/Shared__UserLogin/
//   (window.ValeUserLogin, in Lantern Designer's style), talking to
//   api/accounts/* on ValeVision 3D's own API. The session cookie covers the
//   whole site, so signing in on the Gallery signs you in here too.
// - CLIENTS NEED NO ACCOUNT. A project link (?project=<id>) is what a client
//   is sent, so with a project the sign-in is OPTIONAL: the model opens at
//   once and staff use the "Sign in" pill in the header. Without a project
//   there is nothing to show a client, so the sign-in is required.
// - WHO AUTHORS: an AppAdmin (Na__AppUtils__DevGate__). The answer is fixed
//   for the page, so signing in or out as someone with a different answer
//   reloads the page and every panel is built for them.
// - The bubble's menu carries this app's own items: the Gallery, a link to
//   this project, and for app admins the Dev Tools and the client view.
//
// INTEGRATION:
// - index.html awaits Na__UserSession__Start() before any module asks the
//   authoring gate (DevGate resolves once, on its first ask).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 1.0.0
// - Created for the move to app.valegardenhouses.com: the Vale users register
//   replaces the email password overlay and the Gallery's PIN.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__DevGate__IsAuthoringEnabled } from './Na__AppUtils__DevGate__.js';   // <-- Asked only on a menu click, long after the gate has resolved

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Where Things Are
    // ------------------------------------------------------------
    const Na__UserSession__MOUNT        = '#naHeaderUserSlot';                   // <-- The bubble sits inside the header, right of the title
    const Na__UserSession__LOGO_URL     = '/AppAssets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
    const Na__UserSession__API_BASE     = new URL('../../api/', import.meta.url).href;   // <-- <app>/api/ wherever the app is served
    const Na__UserSession__GALLERY_URL  = '/project-gallery/';
    const Na__UserSession__DEV_MENU_ID  = 'naDevToolsMenu';                      // <-- The Dev Tools <details> in index.html
    const Na__UserSession__AUTHOR_LEVEL = 'AppAdmin';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The ?project= Token, or ''
    // ------------------------------------------------------------
    function Na__UserSession__ProjectToken() {
        try {
            const params = new URLSearchParams(window.location.search);
            return (params.get('project') || params.get('project-folder') || '').trim();
        } catch (error) { return ''; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is This User an Author?
    // ------------------------------------------------------------
    function Na__UserSession__IsAuthor(user) {
        return !!user && !!window.ValeUserLogin && window.ValeUserLogin.HasLevel(Na__UserSession__AUTHOR_LEVEL);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Short Message in the Corner (the app's toast is not built yet at sign-in)
    // ------------------------------------------------------------
    function Na__UserSession__Note(text) {
        const note = document.createElement('div');
        note.className = 'na-user-session__note';
        note.textContent = text;
        document.body.appendChild(note);
        setTimeout(() => note.remove(), 2600);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Bubble Menu's Own Items
    // ------------------------------------------------------------
    function Na__UserSession__MenuItems() {
        const items = [
            { id : 'gallery', label : 'Open ValeVision Gallery', onClick : () => { window.location.href = Na__UserSession__GALLERY_URL; } }
        ];
        if (Na__UserSession__ProjectToken()) {
            items.push({ id : 'copy-link', label : 'Copy link to this project', onClick : () => {
                const url = new URL(window.location.href);
                url.search = '?project=' + encodeURIComponent(Na__UserSession__ProjectToken());
                url.hash = '';
                navigator.clipboard.writeText(url.href)
                    .then(() => Na__UserSession__Note('Link copied'))
                    .catch(() => window.prompt('Copy this link:', url.href));
            } });
        }
        items.push({ id : 'dev-tools', label : 'Open Dev Tools', adminOnly : true, section : 'Developer tools', onClick : () => {
            const details = document.getElementById(Na__UserSession__DEV_MENU_ID);
            if (details) { details.open = true; details.scrollIntoView({ block : 'nearest' }); }
            else Na__UserSession__Note('Dev Tools are locked on this device (client view)');
        } });
        items.push({ id : 'client-view', label : 'Client view on / off', adminOnly : true, section : 'Developer tools', onClick : () => {
            const url = new URL(window.location.href);
            url.searchParams.set('authoring', Na__DevGate__IsAuthoringEnabled() ? 'off' : 'on');   // <-- Off: see exactly what a client sees
            window.location.href = url.href;                                     // <-- DevGate reads it, remembers it, and the page rebuilds
        } });
        return items;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Start the Session: Resolves With the Signed-In User, or Null for a Client Viewer
    // ------------------------------------------------------------
    // Never rejects. Without the shared login module (a page served without
    // /AppAssets__CommonApplicationAssets/) the app opens read-only.
    // ------------------------------------------------------------
    function Na__UserSession__Start() {
        const login = window.ValeUserLogin;
        if (!login || typeof login.Init !== 'function') {
            console.warn('[ValeVision3D] The shared Vale sign-in is not loaded: the app opens read-only.');
            return Promise.resolve(null);
        }
        const required = !Na__UserSession__ProjectToken();                     // <-- No project: staff only. A project link opens for anyone
        return new Promise((resolve) => {
            let started = false;
            login.Init({
                appName   : 'ValeVision 3D',
                logoUrl   : Na__UserSession__LOGO_URL,
                apiBase   : Na__UserSession__API_BASE,
                mountEl   : Na__UserSession__MOUNT,
                required  : required,
                menuItems : Na__UserSession__MenuItems(),
                onReady   : (user) => {
                    started = true;
                    const authorAtStart = Na__UserSession__IsAuthor(user);
                    login.OnChange((now) => {                                    // <-- A different answer to "may I author" rebuilds the page
                        if (Na__UserSession__IsAuthor(now) !== authorAtStart) window.location.reload();
                    });
                    resolve(user || null);
                }
            }).catch((error) => {
                console.warn('[ValeVision3D] Sign-in could not start:', error);
                if (!started) resolve(null);
            });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Signed-In User Now, or Null
    // ------------------------------------------------------------
    function Na__UserSession__User() {
        return (window.ValeUserLogin && window.ValeUserLogin.User()) || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__UserSession__Start,
        Na__UserSession__User
    };

// endregion -------------------------------------------------------------------
