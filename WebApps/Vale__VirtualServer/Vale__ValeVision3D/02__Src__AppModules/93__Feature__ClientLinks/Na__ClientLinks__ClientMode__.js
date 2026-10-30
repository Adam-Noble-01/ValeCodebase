// =============================================================================
// VALEVISION3D - CLIENT LINKS - THE CLIENT VIEWER (A PAGE OPENED FROM A CLIENT LINK)
// =============================================================================
//
// FILE       : Na__ClientLinks__ClientMode__.js
// NAMESPACE  : Na__ClientMode
// MODULE     : Feature - Client Links
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Open ValeVision 3D for a client: check the link with the server,
//              let this browser in, show the guest bubble and the simplified
//              menu, and say plainly when a link no longer works
// CREATED    : 28-Oct-2026
//
// DESCRIPTION:
// - A CLIENT LINK is /valevision/?project=<id>&share=<token> (made on the Share
//   Project Link form's External Client Sharing tab). index.html awaits
//   Na__ClientMode__Start() before the sign-in: on a client link the shared
//   sign-in is never started, so there is no Sign in pill and no gate.
// - THE SERVER DECIDES (ValeVision3D__Api__ClientLinks__.py): GET
//   api/projects/<id>/client-link checks the token and sets the cookie that
//   lets this browser read the project. A live link opens the model; an
//   expired or switched-off one shows "This link is no longer active" and the
//   app does not start behind it. A visit is counted once per browser session
//   (?view=1), as Theia counts one.
// - THE CLIENT'S VIEW (Adam, 28-Oct-2026):
//     Tools & Settings  Camera Settings, Enter Full Screen and App Settings
//                       only (Export Image and Toggle Model Layers TEMPORARILY
//                       REMOVED 29-Oct-2026, v2.79.5, based on J. Watchorn's
//                       comments, awaiting the directors). The menu items
//                       a client sees carry data-na-client-menu in index.html;
//                       every other item is hidden by the client styles, so a
//                       menu item added later stays hidden from clients until
//                       it is marked.
//     Hidden            the Dev Tools, the breadcrumb back to the Gallery, the
//                       Layout Editor's sheet tabs (its loader refuses on a
//                       client link), the Create Drawing page, the Sign in
//                       pill and the install card.
//     The guest bubble  the shared sign-in's guest state, as Theia's: "Shared
//                       with you by Vale Garden Houses", the link's end date,
//                       Take the tour again, How to look around, Install the
//                       app (not inside the app), Copy the link.
//     Their own app      Na__ClientLinks__AppManifest__ (index.html's head) makes
//                       the client's own manifest; Na__ClientLinks__InstallApp__
//                       offers it after their first press on the model.
//   <html class="na-client-mode"> is set by a script in index.html's head
//   before anything draws (the same rule as Na__DevGate__IsClientLink), so the
//   full menu never flashes up first.
// - NEVER AN ADMIN FEATURE: authoring is off on a client link whoever is signed
//   in on the device (Na__DevGate__IsAuthoringEnabled), and the server opens
//   reads only to a client link, never a write.
// - The first-launch tour (Na__ClientLinks__ClientTour__) starts once the model
//   is on screen (na-app-scene-ready).
// - PHONES AND TABLETS (v2.80.0): Na__ClientLinks__ClientLandscape__ puts them
//   in full screen and landscape where the browser allows, and shows "Turn
//   your phone sideways" while one is held upright.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 29-Oct-2026 - Version 1.2.1 (ValeVision3D v2.82.0)
// - No longer renames the Home Screen icon: the client's own manifest
//   (Na__ClientLinks__AppManifest__, in index.html's head) names it.
// - Starts Na__ClientLinks__InstallApp__ (the install card after the first
//   press on the model); the guest bubble's "Install the app" replaces "Full
//   screen on iPhone".
//
// 29-Oct-2026 - Version 1.2.0 (ValeVision3D v2.81.1)
// - iPhone: "Full screen on iPhone" in the guest bubble (the Home Screen card),
//   and the Home Screen icon is named after the project ("<title> 3D").
//
// 29-Oct-2026 - Version 1.1.0 (ValeVision3D v2.80.0)
// - Starts Na__ClientLinks__ClientLandscape__ once the link has opened.
//
// 28-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.77.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__DevGate__IsClientLink } from '../03__AppUtils/Na__AppUtils__DevGate__.js';
    import { Na__ClientLinks__Api, Na__ClientLinks__ApiPath, Na__ClientLinks__Copy, Na__ClientLinks__El, Na__ClientLinks__FormatDate,
             Na__ClientLinks__Icon } from './Na__ClientLinks__Helpers__.js';
    import { Na__ClientTour__MaybeStart, Na__ClientTour__Start } from './Na__ClientLinks__ClientTour__.js';
    import { Na__ClientLandscape__Start } from './Na__ClientLinks__ClientLandscape__.js';
    import { Na__InstallApp__Start, Na__InstallApp__Show, Na__InstallApp__CanOffer } from './Na__ClientLinks__InstallApp__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__ClientMode__HTML_CLASS    = 'na-client-mode';                        // <-- Also set by index.html's head script
    const Na__ClientMode__STOPPED_CLASS = 'na-client-mode--stopped';               // <-- A link that cannot open: nothing behind the message
    const Na__ClientMode__USER_SLOT     = '#naHeaderUserSlot';
    const Na__ClientMode__VIEW_KEY      = 'ValeVision3D__CountedClientViews';      // <-- sessionStorage: the tokens counted this browser session
    const Na__ClientMode__TOUR_DELAY_MS = 900;                                     // <-- After the model shows: the carousel has arrived

    let Na__ClientMode__Link = null;                                               // <-- { project: { id, code, title }, share: { expiresIso }, token }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Address's Project and Token
    // ------------------------------------------------------------
    function Na__ClientMode__Params() {
        const params = new URLSearchParams(window.location.search);
        return {
            projectId : (params.get('project') || params.get('project-folder') || '').trim(),
            token     : (params.get('share') || '').trim()
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Count a Visit Once per Browser Session (Theia's Na__Theia__FirstVisit)
    // ------------------------------------------------------------
    function Na__ClientMode__FirstVisit(token) {
        try {
            const seen = JSON.parse(window.sessionStorage.getItem(Na__ClientMode__VIEW_KEY) || '[]');
            if (seen.indexOf(token) >= 0) return false;
            seen.push(token);
            window.sessionStorage.setItem(Na__ClientMode__VIEW_KEY, JSON.stringify(seen.slice(-20)));
            return true;
        } catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Open the Help Panel (the toolbar's own Help button)
    // ------------------------------------------------------------
    function Na__ClientMode__OpenHelp() {
        const help = document.getElementById('naNavToolbarHelpBtn');
        if (help) help.click();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Guest Bubble (the shared sign-in's guest state, as Theia's)
    // ------------------------------------------------------------
    // share: the link's details from the server ({ expiresIso }), or null before
    // its answer. The link's label is staff's own note, so it is never shown.
    // ------------------------------------------------------------
    function Na__ClientMode__Guest(share) {
        if (!window.ValeUserLogin || typeof window.ValeUserLogin.Guest !== 'function') return;   // <-- An older shared sign-in: no bubble
        window.ValeUserLogin.Guest({
            mountEl   : Na__ClientMode__USER_SLOT,
            name      : 'Guest',
            detail    : 'View only',
            notes     : ['Shared with you by Vale Garden Houses.',
                         share && share.expiresIso ? `This link works until ${Na__ClientLinks__FormatDate(share.expiresIso)}.` : ''],
            menuItems : [
                { label : 'Take the tour again',         onClick : () => Na__ClientTour__Start() },
                { label : 'How to look around',          onClick : Na__ClientMode__OpenHelp },
                ...(Na__InstallApp__CanOffer() ? [{ label : 'Install the app', onClick : () => Na__InstallApp__Show(true) }] : []),
                { label : 'Copy the link to this project', onClick : () => Na__ClientLinks__Copy(window.location.href, 'Link copied') }
            ]
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Link That Cannot Open: a Plain Message in Place of the App
    // ------------------------------------------------------------
    function Na__ClientMode__Stop(title, text, action) {
        document.documentElement.classList.add(Na__ClientMode__STOPPED_CLASS);  // <-- The menu, the toolbar and the spinner go
        const old = document.getElementById('naClientModeMessage');
        if (old) old.remove();
        const box = Na__ClientLinks__El('div', 'na-client-message', null, { id: 'naClientModeMessage', role: 'alert' });
        const card = Na__ClientLinks__El('div', 'na-client-message__card');
        const badge = Na__ClientLinks__El('span', 'na-client-message__badge');
        badge.appendChild(Na__ClientLinks__Icon('link'));
        card.append(badge, Na__ClientLinks__El('h1', 'na-client-message__title', title), Na__ClientLinks__El('p', 'na-client-message__text', text));
        if (action) {
            const button = Na__ClientLinks__El('button', 'na-client-message__button', action.label, { type: 'button' });
            button.addEventListener('click', action.onClick);
            card.appendChild(button);
        }
        card.appendChild(Na__ClientLinks__El('p', 'na-client-message__foot', '© 2026 Vale Garden Houses. All rights reserved.'));
        box.appendChild(card);
        document.body.appendChild(box);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Tour, Once the Model Is on Screen
    // ------------------------------------------------------------
    function Na__ClientMode__ArmTour() {
        window.addEventListener('na-app-scene-ready', () => {
            setTimeout(() => Na__ClientTour__MaybeStart(), Na__ClientMode__TOUR_DELAY_MS);
        }, { once : true });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Start: null on a staff page; on a client link, the link once the server has let this browser in
    // ------------------------------------------------------------
    // A link that cannot open (expired, switched off, no such project) shows
    // its message and NEVER RESOLVES, so index.html's start-up stops there:
    // no model loads behind the message. A failed connection offers Try again.
    // ------------------------------------------------------------
    async function Na__ClientMode__Start() {
        if (!Na__DevGate__IsClientLink()) return null;
        document.documentElement.classList.add(Na__ClientMode__HTML_CLASS);
        const { projectId, token } = Na__ClientMode__Params();
        Na__ClientMode__Guest(null);                                           // <-- The guest bubble at once; its end date follows

        let answer = null;
        try {
            const query = new URLSearchParams({ share : token, path : Na__ClientLinks__ApiPath() });
            if (Na__ClientMode__FirstVisit(token)) query.set('view', '1');
            answer = await Na__ClientLinks__Api('GET', `projects/${encodeURIComponent(projectId)}/client-link?${query.toString()}`);
        } catch (error) {
            if (error.data && error.data.shareInvalid) {
                Na__ClientMode__Stop('This link is no longer active',
                    'It has expired or has been switched off. Please contact your designer at Vale Garden Houses for a new link.');
            } else if (error.status === 404) {
                Na__ClientMode__Stop('Project not found', 'There is no project at this address. Please check the link you were sent.');
            } else {
                Na__ClientMode__Stop('Your project could not be opened', error.message,
                                     { label : 'Try again', onClick : () => window.location.reload() });
            }
            return new Promise(() => {});                                       // <-- The app never starts behind the message
        }

        Na__ClientMode__Link = { project : answer.project || { id : projectId }, share : answer.share || {}, token };
        if (answer.project && answer.project.title) document.title = `${answer.project.title} · ValeVision 3D`;
        // The Home Screen name and launch address are Na__ClientLinks__AppManifest__'s alone (index.html's head)
        Na__ClientMode__Guest(Na__ClientMode__Link.share);
        Na__ClientLandscape__Start();                                           // <-- Phones and tablets: full screen and landscape
        Na__InstallApp__Start();                                                // <-- The client's own app, offered after their first press on the model
        Na__ClientMode__ArmTour();
        return Na__ClientMode__Link;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Open Client Link, or Null (a staff page, or not opened yet)
    // ------------------------------------------------------------
    function Na__ClientMode__GetLink() {
        return Na__ClientMode__Link;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ClientMode__Start,
        Na__ClientMode__GetLink
    };

// endregion -------------------------------------------------------------------
