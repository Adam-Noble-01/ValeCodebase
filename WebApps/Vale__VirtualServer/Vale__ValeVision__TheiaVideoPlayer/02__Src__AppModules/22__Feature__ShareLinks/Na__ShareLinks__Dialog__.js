// =============================================================================
// VALEVISION THEIA - FEATURE - SHARE LINKS DIALOG
// =============================================================================
//
// FILE       : Na__ShareLinks__Dialog__.js
// NAMESPACE  : Na__Share
// MODULE     : Feature - Share Links
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Make the two kinds of link: a staff link (signed-in Vale staff), and
//              a client link (no account: the player and the videos, nothing else)
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - STAFF LINK: /theia/?project=<id>, optionally at this video and this moment.
//   It opens only for someone signed in to Vale; it is built here, nothing is
//   stored.
// - CLIENT LINK: made by the API (a random token), with a label saying who it is
//   for, an optional expiry, and all of the project's videos or a chosen few.
//   It opens Theia's view-only page: no gallery, no editing, no sign-in.
// - The project's client links are listed with who made them, when, how often
//   they were opened, and Copy / Switch off. Switching a link off is immediate.
// - TWO PANELS, BOTH CLOSED WHEN THE DIALOG OPENS (Adam, 08-Oct-2026: sales must
//   never send a client the wrong kind). Client link first: a person icon, green,
//   "Safe to send to clients", with the client links inside it. Staff link
//   second: a lock icon, amber, "Vale staff only", and a line saying a client
//   cannot open it. Opening one closes the other; Copy says which kind it copied.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 08-Oct-2026 - Version 1.1.0
// - The two kinds of link in two collapsed panels, each with its own icon,
//   colour and tag; Client link first.
//
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Dialog
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Api__Get, Na__Api__Post } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__IconButton, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Clock, Na__Format__Date } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';


    // HELPER FUNCTION | The App's Own Address (…/theia/) With a Query
    // ------------------------------------------------------------
    function Na__Share__Url(query) {
        const base = new URL('../../', import.meta.url);
        base.search = new URLSearchParams(query).toString();
        return base.href;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Copy, With a Fallback the Person Can Copy By Hand
    // ------------------------------------------------------------
    async function Na__Share__Copy(text, copiedMessage) {
        const done = copiedMessage || 'Link copied';
        try {
            await navigator.clipboard.writeText(text);
            Na__Toast__Show(done);
            return true;
        } catch (error) { /* no clipboard permission, or not a secure page: the older way next */ }
        try {
            const area = Na__Dom__El('textarea', null, null, { readonly: true, 'aria-hidden': 'true' });
            area.value = text;
            area.style.cssText = 'position: fixed; left: -9999px; top: 0; opacity: 0;';
            document.body.appendChild(area);
            area.select();
            const copied = document.execCommand('copy');
            area.remove();
            if (copied) { Na__Toast__Show(done); return true; }
        } catch (error) { /* then show it to copy by hand */ }
        Na__Toast__Show(`Copy this link: ${text}`, { error: true });   // <-- Never a prompt(): some browsers and app windows refuse it
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Link Row: the URL, read-only, and Copy
    // ------------------------------------------------------------
    function Na__Share__LinkRow(url, copiedMessage) {
        const row = Na__Dom__El('div', 'theia-share__link');
        const field = Na__Dom__El('input', 'theia-field theia-share__url', null, { type: 'text', readonly: true, 'aria-label': 'Link' });
        field.value = url;
        field.addEventListener('focus', () => field.select());
        const copy = Na__Dom__IconButton('copy', 'theia-button theia-button--primary', 'Copy', 'Copy the link');
        copy.addEventListener('click', () => Na__Share__Copy(url, copiedMessage));
        row.append(field, copy);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Collapsed Panel: { kind, icon, title, tag, sub } -> { panel, body, sub }
    // ------------------------------------------------------------
    function Na__Share__Panel(spec) {
        const panel = Na__Dom__El('details', `theia-share__panel theia-share__panel--${spec.kind}`);
        const summary = Na__Dom__El('summary', 'theia-share__summary');
        const badge = Na__Dom__El('span', 'theia-share__badge');
        badge.appendChild(Na__Dom__Icon(spec.icon));
        const text = Na__Dom__El('span', 'theia-share__summary-text');
        const title = Na__Dom__El('span', 'theia-share__summary-title');
        title.append(Na__Dom__El('span', null, spec.title), Na__Dom__El('span', 'theia-share__tag', spec.tag));
        const sub = Na__Dom__El('span', 'theia-share__summary-sub', spec.sub);
        text.append(title, sub);
        const chevron = Na__Dom__El('span', 'theia-share__chevron');
        chevron.appendChild(Na__Dom__Icon('down'));
        summary.append(badge, text, chevron);
        const body = Na__Dom__El('div', 'theia-share__body');
        panel.append(summary, body);
        return { panel, body, sub };
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Dialog: { project, videos, video, time }
    // ------------------------------------------------------------
    function Na__Share__Open(context) {
        const { project, videos, video, time } = context;
        const backdrop = Na__Dom__El('div', 'theia-dialog__backdrop');
        const dialog = Na__Dom__El('div', 'theia-dialog', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Share' });
        const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });

        const head = Na__Dom__El('div', 'theia-dialog__head');
        head.appendChild(Na__Dom__El('h2', 'theia-dialog__title', `Share ${project.title}`));
        const x = Na__Dom__IconButton('close', 'theia-dialog__close', null, 'Close');
        x.addEventListener('click', close);
        head.appendChild(x);
        dialog.appendChild(head);

        // CLIENT LINK PANEL | Safe to send: the videos only, no account
        const clientPanel = Na__Share__Panel({ kind: 'client', icon: 'client', title: 'Client link', tag: 'Safe to send to clients',
                                               sub: 'For clients and anyone outside Vale: the player and the videos only, no gallery, no editing, no sign-in.' });
        // STAFF LINK PANEL | Signed-in Vale staff only
        const staffPanel = Na__Share__Panel({ kind: 'staff', icon: 'staff', title: 'Staff link', tag: 'Vale staff only',
                                              sub: 'Needs a Vale sign-in. Never send it to a client.' });
        [clientPanel, staffPanel].forEach((p) => p.panel.addEventListener('toggle', () => {
            if (!p.panel.open) return;
            [clientPanel, staffPanel].forEach((other) => { if (other !== p) other.panel.open = false; });   // <-- One kind of link on show at a time
            if (p === clientPanel) label.focus();
        }));
        dialog.append(clientPanel.panel, staffPanel.panel);

        // STAFF LINK | Signed-in Vale staff only
        const staff = staffPanel.body;
        staff.appendChild(Na__Dom__El('p', 'theia-share__help', 'For Vale colleagues. It opens Theia with the gallery and every tool, after signing in.'));
        staff.appendChild(Na__Dom__El('p', 'theia-share__warn', 'Not for clients: this link asks for a Vale sign-in, so a client cannot open it. Use a client link instead.'));
        const atVideo = Na__Dom__El('input', null, null, { type: 'checkbox', id: 'theiaShareAtVideo', checked: true });
        const atTime = Na__Dom__El('input', null, null, { type: 'checkbox', id: 'theiaShareAtTime' });
        const optionVideo = Na__Dom__El('label', 'theia-check', null, { for: 'theiaShareAtVideo' });
        optionVideo.append(atVideo, Na__Dom__El('span', null, `Open at "${video.title}"`));
        const optionTime = Na__Dom__El('label', 'theia-check', null, { for: 'theiaShareAtTime' });
        optionTime.append(atTime, Na__Dom__El('span', null, `Start at ${Na__Format__Clock(time)}`));
        const staffLink = Na__Dom__El('div');
        const staffUrl = () => {
            const q = { project: project.id };
            if (atVideo.checked) q.video = video.id;
            if (atVideo.checked && atTime.checked && time >= 1) q.t = String(Math.floor(time));
            Na__Dom__Clear(staffLink).appendChild(Na__Share__LinkRow(Na__Share__Url(q), 'Staff link copied (Vale staff only)'));
        };
        atVideo.addEventListener('change', () => { atTime.disabled = !atVideo.checked; staffUrl(); });
        atTime.addEventListener('change', staffUrl);
        atTime.disabled = time < 1;
        staff.append(optionVideo, optionTime, staffLink);
        staffUrl();

        // CLIENT LINK | No account: the videos only
        const client = clientPanel.body;                                     // <-- Its summary already says what it is
        const form = Na__Dom__El('form', 'theia-share__form');
        const label = Na__Dom__El('input', 'theia-field', null, { type: 'text', maxlength: '120', placeholder: 'Who is it for? e.g. Mr and Mrs Holt', 'aria-label': 'Who the link is for' });
        const expiry = Na__Dom__El('select', 'theia-field', null, { 'aria-label': 'Expires' });
        (Na__AppConfig__Get('Share__ExpiryOptionsDays', [0, 7, 30, 90, 365]) || [0]).forEach((days) => {
            const o = Na__Dom__El('option', null, days ? `Expires after ${days} days` : 'Never expires', { value: String(days) });
            expiry.appendChild(o);
        });
        const which = Na__Dom__El('div', 'theia-share__which');
        const all = Na__Dom__El('input', null, null, { type: 'radio', name: 'theiaShareWhich', id: 'theiaShareAll', checked: true });
        const some = Na__Dom__El('input', null, null, { type: 'radio', name: 'theiaShareWhich', id: 'theiaShareSome' });
        const allLabel = Na__Dom__El('label', 'theia-check', null, { for: 'theiaShareAll' });
        allLabel.append(all, Na__Dom__El('span', null, 'Every video (and any added later)'));
        const someLabel = Na__Dom__El('label', 'theia-check', null, { for: 'theiaShareSome' });
        someLabel.append(some, Na__Dom__El('span', null, 'Only these:'));
        const picks = Na__Dom__El('div', 'theia-share__picks');
        const shareable = videos.filter((v) => v.visible !== false && v.playable !== false);
        shareable.forEach((v) => {
            const box = Na__Dom__El('input', null, null, { type: 'checkbox', value: v.id, id: `theiaPick_${v.id}`, checked: v.id === video.id });
            const l = Na__Dom__El('label', 'theia-check', null, { for: `theiaPick_${v.id}` });
            l.append(box, Na__Dom__El('span', null, v.title));
            picks.appendChild(l);
        });
        const syncPicks = () => { picks.hidden = !some.checked; };
        all.addEventListener('change', syncPicks); some.addEventListener('change', syncPicks); syncPicks();
        which.append(allLabel, someLabel, picks);
        const create = Na__Dom__El('button', 'theia-button theia-button--primary', 'Create client link', { type: 'submit' });
        const made = Na__Dom__El('div', 'theia-share__made');
        form.append(label, expiry, which, create, made);
        client.appendChild(form);

        const listBox = Na__Dom__El('div', 'theia-share__list');
        client.appendChild(listBox);

        // THE PROJECT'S CLIENT LINKS
        const loadLinks = async () => {
            Na__Dom__Clear(listBox).appendChild(Na__Dom__El('div', 'theia-share__help', 'Loading links…'));
            try {
                const { links } = await Na__Api__Get(`projects/${encodeURIComponent(project.id)}/shares`);
                Na__Dom__Clear(listBox);
                const active = links.filter((l) => l.state === 'active').length;
                clientPanel.sub.textContent = 'For clients and anyone outside Vale: the player and the videos only, no gallery, no editing, no sign-in.'
                                            + (active ? ` ${active} active link${active === 1 ? '' : 's'} for this project.` : '');
                if (!links.length) return;
                listBox.appendChild(Na__Dom__El('h4', 'theia-share__subheading', 'Client links for this project'));
                links.forEach((link) => {
                    const row = Na__Dom__El('div', `theia-share__row is-${link.state}`);
                    const info = Na__Dom__El('div', 'theia-share__row-info');
                    info.appendChild(Na__Dom__El('div', 'theia-share__row-label', link.label || 'No label'));
                    const bits = [`By ${link.createdBy}`, Na__Format__Date(link.createdIso),
                                  link.videoIds.length ? `${link.videoIds.length} video${link.videoIds.length === 1 ? '' : 's'}` : 'every video',
                                  `opened ${link.viewCount} time${link.viewCount === 1 ? '' : 's'}`];
                    if (link.state === 'revoked') bits.push(`switched off ${Na__Format__Date(link.revokedIso)}`);
                    else if (link.state === 'expired') bits.push('expired');
                    else if (link.expiresIso) bits.push(`expires ${Na__Format__Date(link.expiresIso)}`);
                    info.appendChild(Na__Dom__El('div', 'theia-share__row-meta', bits.join(' · ')));
                    row.appendChild(info);
                    if (link.state === 'active') {
                        const url = Na__Share__Url({ project: project.id, share: link.token });
                        const copy = Na__Dom__IconButton('copy', 'theia-button theia-button--outline theia-button--small', 'Copy', 'Copy this link');
                        copy.addEventListener('click', () => Na__Share__Copy(url, 'Client link copied'));
                        row.appendChild(copy);
                        if (link.canRevoke) {
                            const off = Na__Dom__El('button', 'theia-button theia-button--danger theia-button--small', 'Switch off', { type: 'button' });
                            off.addEventListener('click', async () => {
                                if (!window.confirm(`Switch off the link for "${link.label || 'no label'}"? It stops working at once.`)) return;
                                try {
                                    await Na__Api__Post(`projects/${encodeURIComponent(project.id)}/shares/${encodeURIComponent(link.token)}/revoke`);
                                    Na__Toast__Show('Link switched off');
                                    loadLinks();
                                } catch (error) { Na__Toast__Show(error.message, { error: true }); }
                            });
                            row.appendChild(off);
                        }
                    }
                    listBox.appendChild(row);
                });
            } catch (error) {
                Na__Dom__Clear(listBox).appendChild(Na__Dom__El('div', 'theia-share__help', `Links could not be loaded: ${error.message}`));
            }
        };

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const videoIds = some.checked ? [...picks.querySelectorAll('input:checked')].map((b) => b.value) : [];
            if (some.checked && !videoIds.length) { Na__Toast__Show('Tick at least one video.', { error: true }); return; }
            create.disabled = true;
            try {
                const { link } = await Na__Api__Post(`projects/${encodeURIComponent(project.id)}/shares`,
                                                     { label: label.value.trim(), expiresDays: Number(expiry.value), videoIds });
                const url = Na__Share__Url({ project: project.id, share: link.token });
                Na__Dom__Clear(made).append(Na__Dom__El('div', 'theia-share__help', 'Send this link to the client:'), Na__Share__LinkRow(url, 'Client link copied'));
                Na__Share__Copy(url, 'Client link copied');
                label.value = '';
                loadLinks();
            } catch (error) {
                Na__Toast__Show(error.message, { error: true });
            } finally {
                create.disabled = false;
            }
        });

        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);
        loadLinks();
        clientPanel.panel.querySelector('summary').focus();                  // <-- Both panels closed: the person chooses
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Share__Open, Na__Share__Copy, Na__Share__Url };

// endregion -------------------------------------------------------------------
