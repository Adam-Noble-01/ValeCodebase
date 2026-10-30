// =============================================================================
// VALEVISION3D - CLIENT LINKS - THE EXTERNAL CLIENT SHARING TAB
// =============================================================================
//
// FILE       : Na__ClientLinks__ShareTab__.js
// NAMESPACE  : Na__ClientLinks
// MODULE     : Feature - Client Links
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The Share Project Link form's second tab: make, list, copy and
//              switch off the links a client opens the 3D model with, and make
//              the email that sends one
// CREATED    : 28-Oct-2026
//
// DESCRIPTION:
// - THEIA'S CLIENT LINK PANEL, IDENTICALLY (Na__ShareLinks__Dialog__ 1.1.0): a
//   green-edged panel with a person badge, "Client link", the tag "Safe to send
//   to clients" and how many links are active; inside, who it is for, when it
//   expires, Create client link (the new link shows and is copied at once), and
//   the project's client links with who made them, when, how often they were
//   opened, and Copy / Switch off. Switching a link off is immediate.
// - THEIA'S CLIENT EMAIL, IN A SECOND PANEL (Na__ClientEmail__Dialog__ 1.0.0;
//   Adam, 28-Oct-2026): addressed to (Dear ...), the client link (a new one by
//   default, never expiring, labelled "<addressee> - Email 28-Oct-26"; or one
//   of the project's live links, one ending within 30 days flagged), special
//   notes, then Download Email: the subject line to copy and Open the
//   email, to paste into Outlook.
// - SEND EMAIL (1.1.0, Adam, 28-Oct-2026): the client email goes straight to
//   the client. The client's address (up to 10, checked as typed), then Send
//   email: the link is made if new, the email is built with the sender's
//   sign-off (Kind regards, name, role), and the send check opens
//   (Na__ClientLinks__SendCheck__: what goes where, the checklist, a tick box
//   that unlocks Send, then "Email sent to <address>"). The server sends it
//   from Vale's apps address with the sender CC'd (api/email/send with the
//   project and the link). A sent email leaves its record in the panel and the
//   form clear for the next. Download Email stays, for pasting into Outlook.
// - TWO BUTTONS, EACH WITH ITS PICTURE (1.1.1): Send email (the paper plane)
//   and Download Email (the Gold Standards' download: an arrow into a tray).
// - ONE PANEL OPEN AT A TIME, as Theia's two. The client email panel (first,
//   green, 1.1.3) opens with the tab; the client link panel is second, navy.
// - The plain project link (a staff link) stays on the Internal tab.
// - The server decides who may do what (ValeVision3D__Api__ClientLinks__.py):
//   Employee and up make links and switch off their own; Management and App
//   Admins switch off anyone's. The page only offers what it was told it may.
//
// INTEGRATION:
// - Built once by Na__Feature__EmailWorkers__UiInteractionLogic__ into the
//   form's External Client Sharing tab; show() each time the tab is chosen.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 28-Oct-2026 - Version 1.1.3 (ValeVision3D v2.79.3)
// - Adam: the Client email panel first and green (it sends to the client),
//   the Client link panel second, in navy. The email panel opens with the tab.
//
// 28-Oct-2026 - Version 1.1.2 (ValeVision3D v2.79.2)
// - Adam: the second button is Download Email, and Send email moves to the
//   right, bigger and easier to see and press than the download.
//
// 28-Oct-2026 - Version 1.1.1 (ValeVision3D v2.79.1)
// - Adam: "one to send the email and one to download email html", with
//   graphics. The second button is Download email HTML (was Generate &
//   download email) and carries the download icon, as Send email carries the
//   paper plane; the busy words go in its label, so the icon stays.
//
// 28-Oct-2026 - Version 1.1.0 (ValeVision3D v2.79.0, client emails sent)
// - The Client email panel sends: the client's address, Send email (primary),
//   the send check, the sent record. Generate & download is the second button.
//   "Addressed to" and the notes are spell-checked (en-GB).
//
// 28-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.77.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppUtils__GetProjectCodeFromUrl, Na__AppUtils__GetProjectLocation } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    import { Na__ClientLinks__Api, Na__ClientLinks__Clear, Na__ClientLinks__Copy, Na__ClientLinks__El, Na__ClientLinks__FormatDate,
             Na__ClientLinks__Icon, Na__ClientLinks__IconButton, Na__ClientLinks__IsLiveSite, Na__ClientLinks__PageUrl,
             Na__ClientLinks__ParseAddresses, Na__ClientLinks__Toast } from './Na__ClientLinks__Helpers__.js';
    import { Na__ClientLinks__BuildEmailHtml, Na__ClientLinks__EmailFileName, Na__ClientLinks__EmailSubject,
             Na__ClientLinks__JoinNames, Na__ClientLinks__ProjectFacts } from './Na__ClientLinks__ClientEmail__Builder__.js';
    import { Na__ClientLinks__SendCheck__Open } from './Na__ClientLinks__SendCheck__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__ClientLinks__EXPIRY_DAYS   = [0, 7, 30, 90, 365];                    // <-- Theia's TheiaConfig__Share__ExpiryOptionsDays
    const Na__ClientLinks__NEW_LINK      = 'new';                                  // <-- The email dropdown's "make a new link" choice
    const Na__ClientLinks__SOON_DAYS     = 30;                                     // <-- A link ending within this many days is flagged
    const Na__ClientLinks__MAKE_LABEL    = 'Download Email';
    const Na__ClientLinks__SEND_LABEL    = 'Send email';
    const Na__ClientLinks__MAX_TO        = 10;                                     // <-- Client addresses in one send (the server's MAX_CLIENT_RECIPIENTS)
    const Na__ClientLinks__TO_NOTE       = 'Two or more? Separate them with commas (up to 10). You are copied in, and replies come to you.';
    const Na__ClientLinks__CLIENT_SUB    = 'For clients and anyone outside Vale: the 3D model to look around, no gallery, no editing, no sign-in.';
    const Na__ClientLinks__LOCAL_WARNING = 'This is a local copy of ValeVision 3D. A client link made here exists only on this PC, so a client '
                                         + 'could not open it: make links to send on app.valegardenhouses.com.';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | This Page's Project Id (the library folder once known, else the address's)
    // ------------------------------------------------------------
    function Na__ClientLinks__ProjectId() {
        const location = Na__AppUtils__GetProjectLocation();
        return (location && location.folder) || String(Na__AppUtils__GetProjectCodeFromUrl() || '').trim();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Link Row: the URL, read-only, and Copy (Theia's Na__Share__LinkRow)
    // ------------------------------------------------------------
    function Na__ClientLinks__LinkRow(url, copiedMessage) {
        const row = Na__ClientLinks__El('div', 'na-client-share__link');
        const field = Na__ClientLinks__El('input', 'na-client-share__field na-client-share__url', null, { type: 'text', readonly: true, 'aria-label': 'Link' });
        field.value = url;
        field.addEventListener('focus', () => field.select());
        const copy = Na__ClientLinks__IconButton('copy', 'na-client-share__btn na-client-share__btn--primary', 'Copy', 'Copy the link');
        copy.addEventListener('click', () => Na__ClientLinks__Copy(url, copiedMessage));
        row.append(field, copy);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Collapsed Panel: { kind, icon, title, tag, sub } -> { panel, body, sub } (Theia's Na__Share__Panel)
    // ------------------------------------------------------------
    function Na__ClientLinks__Panel(spec) {
        const panel = Na__ClientLinks__El('details', `na-client-share__panel na-client-share__panel--${spec.kind}`);
        const summary = Na__ClientLinks__El('summary', 'na-client-share__summary');
        const badge = Na__ClientLinks__El('span', 'na-client-share__badge');
        badge.appendChild(Na__ClientLinks__Icon(spec.icon));
        const text = Na__ClientLinks__El('span', 'na-client-share__summary-text');
        const title = Na__ClientLinks__El('span', 'na-client-share__summary-title');
        title.append(Na__ClientLinks__El('span', null, spec.title), Na__ClientLinks__El('span', 'na-client-share__tag', spec.tag));
        const sub = Na__ClientLinks__El('span', 'na-client-share__summary-sub', spec.sub);
        text.append(title, sub);
        const chevron = Na__ClientLinks__El('span', 'na-client-share__chevron');
        chevron.appendChild(Na__ClientLinks__Icon('down'));
        summary.append(badge, text, chevron);
        const body = Na__ClientLinks__El('div', 'na-client-share__body');
        panel.append(summary, body);
        return { panel, body, sub };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A New Email Link's Label, as the List Shows It ("Mr and Mrs Holt - Email 28-Oct-26")
    // ------------------------------------------------------------
    function Na__ClientLinks__EmailLinkLabel(addressee) {
        const day = Na__ClientLinks__FormatDate(new Date().toISOString()).replace(/-\d{2}(\d{2})$/, '-$1');   // <-- 28-Oct-2026 -> 28-Oct-26
        return `${Na__ClientLinks__JoinNames(addressee).slice(0, 96)} - Email ${day}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whole Days Until a Link Ends (null: it never does)
    // ------------------------------------------------------------
    function Na__ClientLinks__DaysLeft(expiresIso) {
        if (!expiresIso) return null;
        const ms = new Date(expiresIso).getTime() - Date.now();
        return isNaN(ms) ? null : Math.max(0, Math.ceil(ms / 86400000));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Link as the Email's Dropdown Lists It ("Mr A . Holt (Gary Hood, opened 39 times, ends 22-Nov-2026)")
    // ------------------------------------------------------------
    function Na__ClientLinks__LinkText(link) {
        const bits = [link.createdBy, `opened ${link.viewCount} time${link.viewCount === 1 ? '' : 's'}`];
        if (link.expiresIso) bits.push(`ends ${Na__ClientLinks__FormatDate(link.expiresIso)}`);
        return `${link.label || 'No label'} (${bits.filter(Boolean).join(', ')})`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Download an Address Under a File Name
    // ------------------------------------------------------------
    function Na__ClientLinks__Download(url, filename) {
        const anchor = Na__ClientLinks__El('a', null, null, { href: url, download: filename });
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Signed-In Sender: { name, role, email } (the sign-off and the CC), or Null
    // ------------------------------------------------------------
    function Na__ClientLinks__Sender() {
        const login = window.ValeUserLogin;
        const user = login && typeof login.User === 'function' ? login.User() : null;
        if (!user || typeof login.HasLevel !== 'function' || !login.HasLevel('Employee')) return null;   // <-- The server checks too
        return {
            name  : String(user.name || `${user.first || ''} ${user.last || ''}`).trim(),
            role  : String(user.role || '').trim(),
            email : String(user.email || '').trim().toLowerCase()
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Tab
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Tab Into Its Panel: (host, { onClose }) -> { show }
    // ------------------------------------------------------------
    function Na__ClientLinks__ShareTab__Build(host, options) {
        const opts = options || {};
        let project = null;                                                    // <-- { id, code, title } from the API
        let links = [];                                                        // <-- Every link of the project, newest first
        let emailUrl = '';                                                     // <-- The last email made, as a blob: address
        let loading = null;

        const root = Na__ClientLinks__El('div', 'na-client-share');
        host.appendChild(root);

        // CLIENT LINK PANEL | Safe to send: the 3D model only, no account
        const clientPanel = Na__ClientLinks__Panel({ kind: 'client', icon: 'client', title: 'Client link', tag: 'Safe to send to clients',
                                                     sub: Na__ClientLinks__CLIENT_SUB });
        // CLIENT EMAIL PANEL | The email that sends a client link
        const emailPanel = Na__ClientLinks__Panel({ kind: 'email', icon: 'mail', title: 'Client email', tag: 'Send to the client',
                                                    sub: 'Sends the client an email inviting them to view their project in 3D, with a client link in it.' });
        const panels = [clientPanel, emailPanel];
        panels.forEach((p) => p.panel.addEventListener('toggle', () => {
            if (!p.panel.open) return;
            panels.forEach((other) => { if (other !== p) other.panel.open = false; });   // <-- One panel on show at a time
            if (p === clientPanel) label.focus();
            else toBox.focus();
        }));
        root.append(emailPanel.panel, clientPanel.panel);                     // <-- The email first (green), the link second (Adam, 1.1.3)

        const actions = Na__ClientLinks__El('div', 'na-client-share__actions');
        const close = Na__ClientLinks__El('button', 'na-client-share__btn', 'Close', { type: 'button' });
        close.addEventListener('click', () => { if (typeof opts.onClose === 'function') opts.onClose(); });
        actions.appendChild(close);
        root.appendChild(actions);


        // CLIENT LINK | The form, the new link, the project's links
        // ------------------------------------------------------------
        const client = clientPanel.body;
        if (!Na__ClientLinks__IsLiveSite()) client.appendChild(Na__ClientLinks__El('p', 'na-client-share__warn', Na__ClientLinks__LOCAL_WARNING));
        const form = Na__ClientLinks__El('form', 'na-client-share__form');
        const label = Na__ClientLinks__El('input', 'na-client-share__field', null, { type: 'text', maxlength: '120', autocomplete: 'off',
                                                                                    placeholder: 'Who is it for? e.g. Mr and Mrs Holt', 'aria-label': 'Who the link is for' });
        const expiry = Na__ClientLinks__El('select', 'na-client-share__field', null, { 'aria-label': 'Expires' });
        Na__ClientLinks__EXPIRY_DAYS.forEach((days) => {
            expiry.appendChild(Na__ClientLinks__El('option', null, days ? `Expires after ${days} days` : 'Never expires', { value: String(days) }));
        });
        const create = Na__ClientLinks__El('button', 'na-client-share__btn na-client-share__btn--primary', 'Create client link', { type: 'submit' });
        const made = Na__ClientLinks__El('div', 'na-client-share__made');
        form.append(label, expiry, create, made);
        client.appendChild(form);
        const listBox = Na__ClientLinks__El('div', 'na-client-share__list');
        client.appendChild(listBox);


        // CLIENT EMAIL | The client's address, addressed to, the client link, special notes; Send, or download
        // ------------------------------------------------------------
        const email = emailPanel.body;
        email.appendChild(Na__ClientLinks__El('p', 'na-client-share__help',
            'Sends the client the email that invites them to view this project in ValeVision 3D. It carries a client link: the 3D model ' +
            'only, no sign-in. It goes from Vale\'s apps address with you copied in, and their replies come to you. Or download it to ' +
            'paste into Outlook.'));
        if (!Na__ClientLinks__IsLiveSite()) {
            email.appendChild(Na__ClientLinks__El('p', 'na-client-share__warn',
                'This is a local copy of ValeVision 3D. A new client link made here exists only on this PC, so the client could not open it: ' +
                'make emails to send on app.valegardenhouses.com.'));
        }
        const emailForm = Na__ClientLinks__El('form', 'na-client-share__form na-client-share__form--email');
        const toBox = Na__ClientLinks__El('input', 'na-client-share__field', null, { type: 'text', id: 'naClientEmailTo', maxlength: '600', autocomplete: 'off',
                                                                                    inputmode: 'email', autocapitalize: 'none', spellcheck: 'false',
                                                                                    placeholder: 'e.g. holt@example.co.uk' });
        const toNote = Na__ClientLinks__El('p', 'na-client-share__note', Na__ClientLinks__TO_NOTE);
        const dear = Na__ClientLinks__El('input', 'na-client-share__field', null, { type: 'text', id: 'naClientEmailDear', maxlength: '100', autocomplete: 'off',
                                                                                   spellcheck: 'true', lang: 'en-GB', placeholder: 'e.g. Mr and Mrs Holt' });
        const choice = Na__ClientLinks__El('select', 'na-client-share__field', null, { id: 'naClientEmailLink' });
        choice.appendChild(Na__ClientLinks__El('option', null, 'New client link (never expires)', { value: Na__ClientLinks__NEW_LINK }));
        const linkNote = Na__ClientLinks__El('p', 'na-client-share__note');
        const notes = Na__ClientLinks__El('textarea', 'na-client-share__field na-client-share__field--area', null, { id: 'naClientEmailNotes', rows: '4',
                                          spellcheck: 'true', lang: 'en-GB',
                                          placeholder: 'Shown to the client in a card above the button. Leave blank to leave it out.' });
        const send = Na__ClientLinks__IconButton('send', 'na-client-share__btn na-client-share__btn--primary', Na__ClientLinks__SEND_LABEL,
                                                 'Check the email, then send it to the client');
        send.type = 'submit';                                                  // <-- Enter in a box opens the send check; only its own Send sends
        const sendLabel = send.lastChild;
        const make = Na__ClientLinks__IconButton('download', 'na-client-share__btn na-client-share__btn--outline', Na__ClientLinks__MAKE_LABEL,
                                                 'Download the email as an HTML file, to paste into Outlook');
        const makeLabel = make.lastChild;
        const emailActions = Na__ClientLinks__El('div', 'na-client-share__email-actions');
        emailActions.append(make, send);                                       // <-- Send on the right, the bigger target (Adam, 1.1.2)
        emailForm.append(Na__ClientLinks__El('label', 'na-client-share__label', 'Client email address', { for: 'naClientEmailTo' }), toBox, toNote,
                         Na__ClientLinks__El('label', 'na-client-share__label', 'Addressed to (Dear …)', { for: 'naClientEmailDear' }), dear,
                         Na__ClientLinks__El('label', 'na-client-share__label', 'Client link', { for: 'naClientEmailLink' }), choice, linkNote,
                         Na__ClientLinks__El('label', 'na-client-share__label', 'Special notes (optional)', { for: 'naClientEmailNotes' }), notes,
                         emailActions);
        const done = Na__ClientLinks__El('div', 'na-client-share__done', null, { hidden: true });
        email.append(emailForm, done);


        // SUB FUNCTION | The Panel's Line: How Many Links Are Active
        // ------------------------------------------------------------
        const showActiveCount = () => {
            const active = links.filter((l) => l.state === 'active').length;
            clientPanel.sub.textContent = Na__ClientLinks__CLIENT_SUB + (active ? ` ${active} active link${active === 1 ? '' : 's'} for this project.` : '');
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Say What the Email's Chosen Link Means (and flag one ending soon)
        // ------------------------------------------------------------
        const showLinkNote = () => {
            const link = links.find((l) => l.state === 'active' && l.token === choice.value);
            linkNote.classList.remove('is-warn');
            if (!link) {
                linkNote.textContent = dear.value.trim()
                    ? `A new link is made with the email. It never expires, and the Client link list shows it as "${Na__ClientLinks__EmailLinkLabel(dear.value)}".`
                    : 'A new link is made with the email. It never expires, and the Client link list shows it under who the email is to and today\'s date.';
                return;
            }
            const days = Na__ClientLinks__DaysLeft(link.expiresIso);
            if (days === null) {
                linkNote.textContent = 'This link never expires.';
                return;
            }
            const when = days === 0 ? 'today' : days === 1 ? 'in 1 day' : `in ${days} days`;
            linkNote.textContent = `This link ends on ${Na__ClientLinks__FormatDate(link.expiresIso)} (${when}), and the email says so.`;
            if (days <= Na__ClientLinks__SOON_DAYS) {
                linkNote.classList.add('is-warn');
                linkNote.textContent += ' A new link never expires.';
            }
        };
        choice.addEventListener('change', showLinkNote);
        dear.addEventListener('input', () => { if (choice.value === Na__ClientLinks__NEW_LINK) showLinkNote(); });
        // ------------------------------------------------------------


        // SUB FUNCTION | The Email's Dropdown: a New Link, Then the Project's Active Links (the choice kept)
        // ------------------------------------------------------------
        const fillChoice = () => {
            const kept = choice.value;
            while (choice.options.length > 1) choice.remove(1);
            links.filter((l) => l.state === 'active').forEach((l) => {
                choice.appendChild(Na__ClientLinks__El('option', null, Na__ClientLinks__LinkText(l), { value: l.token }));
            });
            choice.value = [...choice.options].some((o) => o.value === kept) ? kept : Na__ClientLinks__NEW_LINK;
            showLinkNote();
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | One Row of the Project's Links
        // ------------------------------------------------------------
        const linkRow = (link) => {
            const row = Na__ClientLinks__El('div', `na-client-share__row is-${link.state}`);
            const info = Na__ClientLinks__El('div', 'na-client-share__row-info');
            info.appendChild(Na__ClientLinks__El('div', 'na-client-share__row-label', link.label || 'No label'));
            const bits = [`By ${link.createdBy}`, Na__ClientLinks__FormatDate(link.createdIso),
                          `opened ${link.viewCount} time${link.viewCount === 1 ? '' : 's'}`];
            if (link.state === 'revoked') bits.push(`switched off ${Na__ClientLinks__FormatDate(link.revokedIso)}`);
            else if (link.state === 'expired') bits.push('expired');
            else if (link.expiresIso) bits.push(`expires ${Na__ClientLinks__FormatDate(link.expiresIso)}`);
            info.appendChild(Na__ClientLinks__El('div', 'na-client-share__row-meta', bits.filter(Boolean).join(' · ')));
            row.appendChild(info);
            if (link.state !== 'active') return row;
            const url = Na__ClientLinks__PageUrl({ project: project.id, share: link.token });
            const copy = Na__ClientLinks__IconButton('copy', 'na-client-share__btn na-client-share__btn--outline na-client-share__btn--small', 'Copy', 'Copy this link');
            copy.addEventListener('click', () => Na__ClientLinks__Copy(url, 'Client link copied'));
            row.appendChild(copy);
            if (link.canRevoke) {
                const off = Na__ClientLinks__El('button', 'na-client-share__btn na-client-share__btn--danger na-client-share__btn--small', 'Switch off', { type: 'button' });
                off.addEventListener('click', async () => {
                    const sure = await Na__AppUtils__ConfirmDialog__Show({
                        title         : 'Switch off this client link?',
                        message       : `The link for "${link.label || 'no label'}" stops working at once. Whoever has it will be asked for a new one.`,
                        confirmLabel  : 'Switch off',
                        isDestructive : true
                    });
                    if (!sure) return;
                    try {
                        await Na__ClientLinks__Api('POST', `projects/${encodeURIComponent(project.id)}/shares/${encodeURIComponent(link.token)}/revoke`);
                        Na__ClientLinks__Toast('Link switched off');
                        loadLinks();
                    } catch (error) { Na__ClientLinks__Toast(error.message, true); }
                });
                row.appendChild(off);
            }
            return row;
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The Project's Client Links (also fills the email's dropdown)
        // ------------------------------------------------------------
        const loadLinks = () => {
            if (loading) return loading;
            Na__ClientLinks__Clear(listBox).appendChild(Na__ClientLinks__El('div', 'na-client-share__help', 'Loading links…'));
            loading = (async () => {
                try {
                    const answer = await Na__ClientLinks__Api('GET', `projects/${encodeURIComponent(Na__ClientLinks__ProjectId())}/shares`);
                    project = answer.project || project;
                    links = answer.links || [];
                    Na__ClientLinks__Clear(listBox);
                    showActiveCount();
                    fillChoice();
                    if (!links.length) return;
                    listBox.appendChild(Na__ClientLinks__El('h4', 'na-client-share__subheading', 'Client links for this project'));
                    links.forEach((link) => listBox.appendChild(linkRow(link)));
                } catch (error) {
                    Na__ClientLinks__Clear(listBox).appendChild(Na__ClientLinks__El('div', 'na-client-share__help', `Links could not be loaded: ${error.message}`));
                } finally {
                    loading = null;
                }
            })();
            return loading;
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | What the Email Made: the File, the Subject Line to Copy, the Email to Open
        // ------------------------------------------------------------
        const showDone = (filename, subject) => {
            Na__ClientLinks__Clear(done).hidden = false;
            const title = Na__ClientLinks__El('div', 'na-client-share__done-title');
            title.append(Na__ClientLinks__Icon('check'), Na__ClientLinks__El('span', null, 'Email downloaded'));
            done.appendChild(title);
            done.appendChild(Na__ClientLinks__El('p', 'na-client-share__help',
                `${filename}. Open the email, press Ctrl+A then Ctrl+C, and paste it into a new Outlook email.`));
            done.appendChild(Na__ClientLinks__El('label', 'na-client-share__label', 'Subject line', { for: 'naClientEmailSubject' }));
            const row = Na__ClientLinks__El('div', 'na-client-share__link');
            const field = Na__ClientLinks__El('input', 'na-client-share__field na-client-share__url', null, { type: 'text', id: 'naClientEmailSubject', readonly: true });
            field.value = subject;
            field.addEventListener('focus', () => field.select());
            const copy = Na__ClientLinks__IconButton('copy', 'na-client-share__btn na-client-share__btn--outline', 'Copy', 'Copy the subject line');
            copy.addEventListener('click', () => Na__ClientLinks__Copy(subject, 'Subject line copied'));
            row.append(field, copy);
            done.appendChild(row);
            const open = Na__ClientLinks__El('button', 'na-client-share__btn na-client-share__btn--primary na-client-share__open', 'Open the email', { type: 'button' });
            open.addEventListener('click', () => window.open(emailUrl, '_blank'));
            done.appendChild(open);
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | What Was Sent: to Whom, When, Who Was Copied In (the panel's record of it)
        // ------------------------------------------------------------
        const showSent = (answer) => {
            Na__ClientLinks__Clear(done).hidden = false;
            const title = Na__ClientLinks__El('div', 'na-client-share__done-title');
            title.append(Na__ClientLinks__Icon('check'), Na__ClientLinks__El('span', null, 'Email sent'));
            done.appendChild(title);
            const now = new Date();
            const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const line = Na__ClientLinks__El('p', 'na-client-share__sent');
            line.append('Successfully sent to ', Na__ClientLinks__El('strong', null, answer.sentTo.join(', ')),
                        ` at ${time} on ${Na__ClientLinks__FormatDate(now.toISOString())}.`);
            done.appendChild(line);
            const cc = Array.isArray(answer.cc) ? answer.cc : [];
            if (cc.length) done.appendChild(Na__ClientLinks__El('p', 'na-client-share__note', `You were copied in (${cc.join(', ')}).`));
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Say What Is Wrong in the Client Email Address Box (null: the usual note)
        // ------------------------------------------------------------
        const showToNote = (parsed) => {
            toNote.classList.remove('is-warn');
            toNote.textContent = Na__ClientLinks__TO_NOTE;
            if (!parsed) return;
            if (parsed.bad.length) {
                toNote.classList.add('is-warn');
                toNote.textContent = parsed.bad.length === 1
                    ? `"${parsed.bad[0]}" is not a whole email address. Check it, letter for letter.`
                    : `These are not whole email addresses: ${parsed.bad.map((part) => `"${part}"`).join(', ')}. Check them, letter for letter.`;
            } else if (parsed.list.length > Na__ClientLinks__MAX_TO) {
                toNote.classList.add('is-warn');
                toNote.textContent = `At most ${Na__ClientLinks__MAX_TO} addresses in one email (${parsed.list.length} here).`;
            }
        };
        toBox.addEventListener('blur', () => showToNote(toBox.value.trim() ? Na__ClientLinks__ParseAddresses(toBox.value) : null));
        toBox.addEventListener('input', () => {
            if (toNote.classList.contains('is-warn')) showToNote(Na__ClientLinks__ParseAddresses(toBox.value));   // <-- A warning clears as it is put right
        });
        // ------------------------------------------------------------


        // SUB FUNCTION | Both Buttons Off While the Email Is Made (Send's words say what is happening)
        // ------------------------------------------------------------
        const setEmailBusy = (busy, words) => {
            send.disabled = busy;
            make.disabled = busy;
            sendLabel.textContent = busy && words ? words : Na__ClientLinks__SEND_LABEL;
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The Email's Link: the Chosen Live One, or a New One Made Now (then chosen)
        // ------------------------------------------------------------
        const ensureLink = async (addressee) => {
            const chosen = links.find((l) => l.state === 'active' && l.token === choice.value);
            if (chosen) return chosen;
            const answer = await Na__ClientLinks__Api('POST', `projects/${encodeURIComponent(Na__ClientLinks__ProjectId())}/shares`,
                                                      { label: Na__ClientLinks__EmailLinkLabel(addressee), expiresDays: 0 });
            project = answer.project || project;
            links.unshift(answer.link);
            fillChoice();
            choice.value = answer.link.token;                                    // <-- Making or sending again (a typo fixed) reuses this link
            showLinkNote();
            loadLinks();
            return answer.link;
        };
        // ------------------------------------------------------------


        // EVENT HANDLER | Create a Client Link
        // ------------------------------------------------------------
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            create.disabled = true;
            try {
                const answer = await Na__ClientLinks__Api('POST', `projects/${encodeURIComponent(Na__ClientLinks__ProjectId())}/shares`,
                                                          { label: label.value.trim(), expiresDays: Number(expiry.value) });
                project = answer.project || project;
                const url = Na__ClientLinks__PageUrl({ project: project.id, share: answer.link.token });
                Na__ClientLinks__Clear(made).append(Na__ClientLinks__El('div', 'na-client-share__help', 'Send this link to the client:'),
                                                    Na__ClientLinks__LinkRow(url, 'Client link copied'));
                Na__ClientLinks__Copy(url, 'Client link copied');
                label.value = '';
                loadLinks();
            } catch (error) {
                Na__ClientLinks__Toast(error.message, true);
            } finally {
                create.disabled = false;
            }
        });
        // ------------------------------------------------------------


        // EVENT HANDLER | Send Email: the Address Checked, the Link (made if new), the Email Signed Off, the Send Check
        // ------------------------------------------------------------
        emailForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const parsed = Na__ClientLinks__ParseAddresses(toBox.value);
            showToNote(toBox.value.trim() ? parsed : null);
            if (!parsed.list.length || parsed.bad.length || parsed.list.length > Na__ClientLinks__MAX_TO) {
                Na__ClientLinks__Toast(parsed.bad.length ? `"${parsed.bad[0]}" is not a whole email address.`
                    : parsed.list.length ? `At most ${Na__ClientLinks__MAX_TO} addresses in one email.`
                    : 'Who is the email going to? Fill in the client email address.', true);
                toBox.focus();
                return;
            }
            const addressee = dear.value.trim();
            if (!addressee) {
                Na__ClientLinks__Toast('Who is the email to? Fill in "Addressed to".', true);
                dear.focus();
                return;
            }
            const sender = Na__ClientLinks__Sender();
            if (!sender) {
                Na__ClientLinks__Toast('Sign in with your Vale account to send email.', true);
                return;
            }
            setEmailBusy(true, 'Getting it ready…');
            let check = null;
            try {
                const isNew = !links.some((l) => l.state === 'active' && l.token === choice.value);
                const link = await ensureLink(addressee);
                const subject = Na__ClientLinks__EmailSubject(project);
                const html = await Na__ClientLinks__BuildEmailHtml({ project, addressee, notes: notes.value, token: link.token,
                                                                     expiresIso: link.expiresIso, signOff: sender });
                const facts = Na__ClientLinks__ProjectFacts(project);
                const ends = link.expiresIso ? `ends ${Na__ClientLinks__FormatDate(link.expiresIso)}` : 'never expires';
                check = {
                    to          : parsed.list,
                    subject,
                    greeting    : `Dear ${Na__ClientLinks__JoinNames(addressee)},`,
                    projectText : `${facts.name} (${facts.code})`,
                    linkText    : `${isNew ? 'New: ' : ''}${link.label || 'No label'} (${ends})`,
                    notes       : notes.value.trim(),
                    sender,
                    isLive      : Na__ClientLinks__IsLiveSite(),
                    html,
                    send        : () => Na__ClientLinks__Api('POST', 'email/send', { to: parsed.list, subject, htmlBody: html,
                                                                                    project: project.id, share: link.token }),
                    onSent      : (answer) => {
                        showSent(answer);
                        Na__ClientLinks__Toast(`Email sent to ${answer.sentTo.join(', ')}`);
                        toBox.value = '';                                         // <-- A clean form for the next client: nothing goes twice by accident
                        dear.value = '';
                        notes.value = '';
                        choice.value = Na__ClientLinks__NEW_LINK;
                        showLinkNote();
                        showToNote(null);
                        loadLinks();
                    }
                };
            } catch (error) {
                console.error('[ValeVision3D] Client email failed:', error);
                Na__ClientLinks__Toast(error.message || 'The email could not be made.', true);
                return;
            } finally {
                setEmailBusy(false);
            }
            await Na__ClientLinks__SendCheck__Open(check);                         // <-- The check, the send and the answer: the modal's
        });
        // ------------------------------------------------------------


        // EVENT HANDLER | Download Email: the Link (made if new), the Email, the Download
        // ------------------------------------------------------------
        make.addEventListener('click', async () => {
            const addressee = dear.value.trim();
            if (!addressee) {
                Na__ClientLinks__Toast('Who is the email to? Fill in "Addressed to".', true);
                dear.focus();
                return;
            }
            setEmailBusy(true);
            makeLabel.textContent = 'Making the email…';
            try {
                const link = await ensureLink(addressee);
                const html = await Na__ClientLinks__BuildEmailHtml({ project, addressee, notes: notes.value, token: link.token,
                                                                     expiresIso: link.expiresIso });
                const filename = Na__ClientLinks__EmailFileName(project, new Date());
                if (emailUrl) URL.revokeObjectURL(emailUrl);
                emailUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
                window.ValeActivity && window.ValeActivity.Log('link.email', { project: project.id, target: filename, link: link.token,
                                                                               detail: { For: addressee, Link: link.label || 'No label' } });   // <-- Activity ledger
                Na__ClientLinks__Download(emailUrl, filename);
                showDone(filename, Na__ClientLinks__EmailSubject(project));
                Na__ClientLinks__Toast('Email downloaded');
            } catch (error) {
                console.error('[ValeVision3D] Client email failed:', error);
                Na__ClientLinks__Toast(error.message || 'The email could not be made.', true);
            } finally {
                setEmailBusy(false);
                makeLabel.textContent = Na__ClientLinks__MAKE_LABEL;
            }
        });
        // ------------------------------------------------------------


        // FUNCTION | The Tab Is On Show: open the client link panel the first time, fetch the links afresh
        // ------------------------------------------------------------
        const show = () => {
            if (!clientPanel.panel.open && !emailPanel.panel.open) emailPanel.panel.open = true;
            loadLinks();
            showLinkNote();
            setTimeout(() => (emailPanel.panel.open ? toBox : label).focus(), 0);
        };
        // ------------------------------------------------------------

        return { show };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__ClientLinks__ShareTab__Build };

// endregion -------------------------------------------------------------------
