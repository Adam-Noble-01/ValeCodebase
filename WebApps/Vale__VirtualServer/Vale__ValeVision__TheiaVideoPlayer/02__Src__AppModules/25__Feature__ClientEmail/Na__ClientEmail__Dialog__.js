// =============================================================================
// VALEVISION THEIA - FEATURE - CLIENT EMAIL DIALOG (APP ADMINS)
// =============================================================================
//
// FILE       : Na__ClientEmail__Dialog__.js
// NAMESPACE  : Na__ClientEmail
// MODULE     : Feature - Client Email
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Make the email that invites a client to watch their project's
//              videos: ask who it is to, which client link it carries and any
//              special notes, then download it as HTML to paste into Outlook
// CREATED    : 22-Oct-2026
//
// DESCRIPTION:
// - OPENED FROM THE ACCOUNT MENU: "Create email HTML…" under Developer tools,
//   App Admins only, with a project open (Na__AppCore__TheiaApp__).
// - THE ASKS, as ValeVision 3D's email form: who it is addressed to ("Mr and
//   Mrs Holt", or names separated by commas) and optional special notes.
// - THE CLIENT LINK (Adam, 22-Oct-2026): by default a new client link that
//   never expires, labelled "<addressee> - Email 22-Oct-26" so the Share dialog
//   shows who has it. The project's active client links can be picked instead;
//   one ending within 30 days is flagged. A new link becomes the choice once it
//   is made, so making the email again (a typo fixed) reuses it.
// - THE RESULT: the HTML downloads (ValeVisionTheia__ClientEmail__<id>__<date>__.html),
//   then the dialog offers the subject line to copy, and Open the email: a new
//   tab to press Ctrl+A, Ctrl+C in and paste into a new Outlook email.
// - A LOCAL COPY OF THEIA (not app.valegardenhouses.com) is flagged: a link
//   made there exists only on that PC, so the client could not open it.
// - The activity ledger gets link.email: the file, the link, who it is to.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 22-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__Api__Get, Na__Api__Post } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__IconButton, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Date } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import { Na__Share__Copy } from '../22__Feature__ShareLinks/Na__ShareLinks__Dialog__.js';
    import { Na__ClientEmail__BuildHtml, Na__ClientEmail__FileName, Na__ClientEmail__IsLiveSite, Na__ClientEmail__JoinNames,
             Na__ClientEmail__ProjectFacts, Na__ClientEmail__Subject } from './Na__ClientEmail__Builder__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__ClientEmail__NEW_LINK   = 'new';                                    // <-- The dropdown's "make a new link" choice
    const Na__ClientEmail__SOON_DAYS  = 30;                                       // <-- A link ending within this many days is flagged
    const Na__ClientEmail__MAKE_LABEL = 'Generate & download email';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A New Link's Label, as the Share Dialog Lists It ("Mr and Mrs Holt - Email 22-Oct-26")
    // ------------------------------------------------------------
    function Na__ClientEmail__NewLabel(addressee) {
        const day = Na__Format__Date(new Date().toISOString()).replace(/-\d{2}(\d{2})$/, '-$1');   // <-- 22-Oct-2026 -> 22-Oct-26
        return `${Na__ClientEmail__JoinNames(addressee).slice(0, 96)} - Email ${day}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whole Days Until a Link Ends (null: it never does)
    // ------------------------------------------------------------
    function Na__ClientEmail__DaysLeft(expiresIso) {
        if (!expiresIso) return null;
        const ms = new Date(expiresIso).getTime() - Date.now();
        return isNaN(ms) ? null : Math.max(0, Math.ceil(ms / 86400000));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | How Many Videos a Link Shows: every playable one, or its own few
    // ------------------------------------------------------------
    function Na__ClientEmail__VideoCount(link, playable) {
        const own = (link && link.videoIds) || [];
        if (!own.length) return playable.length;
        const ids = new Set(playable.map((v) => v.id));
        return own.filter((id) => ids.has(id)).length || own.length;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Link as the Dropdown Lists It ("Mr A . Holt (Gary Hood, every video, opened 39 times)")
    // ------------------------------------------------------------
    function Na__ClientEmail__LinkText(link) {
        const ids = link.videoIds || [];
        const bits = [link.createdBy,
                      ids.length ? `${ids.length} video${ids.length === 1 ? '' : 's'}` : 'every video',
                      `opened ${link.viewCount} time${link.viewCount === 1 ? '' : 's'}`];
        if (link.expiresIso) bits.push(`ends ${Na__Format__Date(link.expiresIso)}`);
        return `${link.label || 'No label'} (${bits.filter(Boolean).join(', ')})`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Download an Address Under a File Name
    // ------------------------------------------------------------
    function Na__ClientEmail__Download(url, filename) {
        const anchor = Na__Dom__El('a', null, null, { href: url, download: filename });
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dialog
// -----------------------------------------------------------------------------

    // FUNCTION | Open the Dialog: { project, videos (the project's playable videos) }
    // ------------------------------------------------------------
    function Na__ClientEmail__Open(context) {
        const project = context.project;
        const playable = (context.videos || []).filter((v) => v.visible !== false && v.playable !== false && v.file);
        const facts = Na__ClientEmail__ProjectFacts(project);
        let links = [];                                                       // <-- The project's active client links, newest first
        let emailUrl = '';                                                    // <-- The last email made, as a blob: address

        const backdrop = Na__Dom__El('div', 'theia-dialog__backdrop');
        const dialog = Na__Dom__El('div', 'theia-dialog theia-email', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Client email' });
        const close = () => {
            backdrop.remove();
            document.removeEventListener('keydown', onKey);
            if (emailUrl) { const last = emailUrl; setTimeout(() => URL.revokeObjectURL(last), 60000); }   // <-- A tab just opened on it still loads
        };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });

        // HEAD | The title, the project, what it makes
        const head = Na__Dom__El('div', 'theia-dialog__head');
        head.appendChild(Na__Dom__El('h2', 'theia-dialog__title', `Client email for ${facts.name}`));
        const x = Na__Dom__IconButton('close', 'theia-dialog__close', null, 'Close');
        x.addEventListener('click', close);
        head.appendChild(x);
        dialog.appendChild(head);
        dialog.appendChild(Na__Dom__El('p', 'theia-email__project',
            `Project code ${facts.code} · ${playable.length} video${playable.length === 1 ? '' : 's'} a client can watch`));
        dialog.appendChild(Na__Dom__El('p', 'theia-share__help',
            'Makes the email that invites the client to watch this project\'s videos, as HTML to paste into Outlook. ' +
            'It carries a client link: the player and the videos only, no sign-in.'));
        if (!Na__ClientEmail__IsLiveSite()) {
            dialog.appendChild(Na__Dom__El('p', 'theia-email__local',
                'This is a local copy of Theia. A new client link made here exists only on this PC, so the client could not open it: ' +
                'make emails to send on app.valegardenhouses.com.'));
        }

        // FORM | Addressed to, the client link, special notes
        const form = Na__Dom__El('form', 'theia-email__form');
        const dear = Na__Dom__El('input', 'theia-field', null, { type: 'text', id: 'theiaEmailDear', maxlength: '100', autocomplete: 'off',
                                                               placeholder: 'e.g. Mr and Mrs Holt' });
        const choice = Na__Dom__El('select', 'theia-field', null, { id: 'theiaEmailLink' });
        choice.appendChild(Na__Dom__El('option', null, 'New client link (never expires)', { value: Na__ClientEmail__NEW_LINK }));
        const linkNote = Na__Dom__El('p', 'theia-email__note');
        const notes = Na__Dom__El('textarea', 'theia-field theia-field--area', null, { id: 'theiaEmailNotes', rows: '4',
                                  placeholder: 'Shown to the client in a card above the button. Leave blank to leave it out.' });
        const actions = Na__Dom__El('div', 'theia-email__actions');
        const cancel = Na__Dom__El('button', 'theia-button theia-button--outline', 'Cancel', { type: 'button' });
        const make = Na__Dom__El('button', 'theia-button theia-button--primary', Na__ClientEmail__MAKE_LABEL, { type: 'submit' });
        cancel.addEventListener('click', close);
        actions.append(cancel, make);
        form.append(Na__Dom__El('label', 'theia-label', 'Addressed to (Dear …)', { for: 'theiaEmailDear' }), dear,
                    Na__Dom__El('label', 'theia-label', 'Client link', { for: 'theiaEmailLink' }), choice, linkNote,
                    Na__Dom__El('label', 'theia-label', 'Special notes (optional)', { for: 'theiaEmailNotes' }), notes,
                    actions);
        const done = Na__Dom__El('div', 'theia-email__done', null, { hidden: true });
        dialog.append(form, done);


        // SUB FUNCTION | Say What the Chosen Link Means (and flag one ending soon)
        // ------------------------------------------------------------
        const showLinkNote = () => {
            const link = links.find((l) => l.token === choice.value);
            linkNote.classList.remove('is-warn');
            if (!link) {
                linkNote.textContent = dear.value.trim()
                    ? `A new link is made with the email. It never expires, and Share lists it as "${Na__ClientEmail__NewLabel(dear.value)}".`
                    : 'A new link is made with the email. It never expires, and Share lists it under who the email is to and today\'s date.';
                return;
            }
            const days = Na__ClientEmail__DaysLeft(link.expiresIso);
            if (days === null) {
                linkNote.textContent = 'This link never expires.';
                return;
            }
            const when = days === 0 ? 'today' : days === 1 ? 'in 1 day' : `in ${days} days`;
            linkNote.textContent = `This link ends on ${Na__Format__Date(link.expiresIso)} (${when}), and the email says so.`;
            if (days <= Na__ClientEmail__SOON_DAYS) {
                linkNote.classList.add('is-warn');
                linkNote.textContent += ' A new link never expires.';
            }
        };
        choice.addEventListener('change', showLinkNote);
        dear.addEventListener('input', () => { if (choice.value === Na__ClientEmail__NEW_LINK) showLinkNote(); });
        // ------------------------------------------------------------


        // SUB FUNCTION | A Link in the Dropdown (before another option, or last)
        // ------------------------------------------------------------
        const addOption = (link, before) => {
            const option = Na__Dom__El('option', null, Na__ClientEmail__LinkText(link), { value: link.token });
            choice.insertBefore(option, before || null);
            return option;
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The Project's Active Client Links, Newest First
        // ------------------------------------------------------------
        const loadLinks = async () => {
            try {
                const answer = await Na__Api__Get(`projects/${encodeURIComponent(project.id)}/shares`);
                const fresh = (answer.links || []).filter((l) => l.state === 'active' && !links.some((k) => k.token === l.token));
                links = links.concat(fresh);
                fresh.forEach((l) => addOption(l));
                showLinkNote();
            } catch (error) {
                Na__Toast__Show(`The project's client links could not be loaded (a new link still can be): ${error.message}`, { error: true });
            }
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | What Was Made: the File, the Subject Line to Copy, the Email to Open
        // ------------------------------------------------------------
        const showDone = (filename, subject) => {
            Na__Dom__Clear(done).hidden = false;
            const title = Na__Dom__El('div', 'theia-email__done-title');
            title.append(Na__Dom__Icon('check'), Na__Dom__El('span', null, 'Email downloaded'));
            done.appendChild(title);
            done.appendChild(Na__Dom__El('p', 'theia-share__help',
                `${filename}. Open the email, press Ctrl+A then Ctrl+C, and paste it into a new Outlook email.`));
            done.appendChild(Na__Dom__El('label', 'theia-label', 'Subject line', { for: 'theiaEmailSubject' }));
            const row = Na__Dom__El('div', 'theia-share__link');
            const field = Na__Dom__El('input', 'theia-field theia-share__url', null, { type: 'text', id: 'theiaEmailSubject', readonly: true });
            field.value = subject;
            field.addEventListener('focus', () => field.select());
            const copy = Na__Dom__IconButton('copy', 'theia-button theia-button--outline', 'Copy', 'Copy the subject line');
            copy.addEventListener('click', () => Na__Share__Copy(subject, 'Subject line copied'));
            row.append(field, copy);
            done.appendChild(row);
            const open = Na__Dom__El('button', 'theia-button theia-button--primary theia-email__open', 'Open the email', { type: 'button' });
            open.addEventListener('click', () => window.open(emailUrl, '_blank'));
            done.appendChild(open);
            cancel.textContent = 'Close';
        };
        // ------------------------------------------------------------


        // EVENT HANDLER | Generate: the link (made if new), the email, the download
        // ------------------------------------------------------------
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const addressee = dear.value.trim();
            if (!addressee) {
                Na__Toast__Show('Who is the email to? Fill in "Addressed to".', { error: true });
                dear.focus();
                return;
            }
            if (!playable.length) {
                Na__Toast__Show('This project has no videos a client can watch yet.', { error: true });
                return;
            }
            make.disabled = true;
            make.textContent = 'Making the email…';
            try {
                let link = links.find((l) => l.token === choice.value);
                if (!link) {
                    ({ link } = await Na__Api__Post(`projects/${encodeURIComponent(project.id)}/shares`,
                                                    { label: Na__ClientEmail__NewLabel(addressee), expiresDays: 0, videoIds: [] }));
                    links.unshift(link);
                    addOption(link, choice.options[1]).selected = true;               // <-- Making the email again reuses this link
                    showLinkNote();
                }
                const videoCount = Na__ClientEmail__VideoCount(link, playable);
                const html = await Na__ClientEmail__BuildHtml({ project, addressee, notes: notes.value, token: link.token,
                                                                videoCount, expiresIso: link.expiresIso });
                const filename = Na__ClientEmail__FileName(project, new Date());
                if (emailUrl) URL.revokeObjectURL(emailUrl);
                emailUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
                window.ValeActivity && window.ValeActivity.Log('link.email', { project: project.id, target: filename, link: link.token,
                                                                               detail: { For: addressee, Link: link.label || 'No label' } });   // <-- Activity ledger
                Na__ClientEmail__Download(emailUrl, filename);
                showDone(filename, Na__ClientEmail__Subject(project, videoCount));
                Na__Toast__Show('Email downloaded');
            } catch (error) {
                console.error('[Theia] Client email failed:', error);
                Na__Toast__Show(error.message || 'The email could not be made.', { error: true });
            } finally {
                make.disabled = false;
                make.textContent = Na__ClientEmail__MAKE_LABEL;
            }
        });
        // ------------------------------------------------------------

        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);
        showLinkNote();
        loadLinks();
        dear.focus();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__ClientEmail__Open };

// endregion -------------------------------------------------------------------
