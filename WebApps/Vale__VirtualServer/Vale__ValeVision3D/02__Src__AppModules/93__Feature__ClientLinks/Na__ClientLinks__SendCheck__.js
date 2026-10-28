// =============================================================================
// VALEVISION3D - CLIENT LINKS - SEND CHECK (THIS EMAIL IS GOING OUTSIDE VALE)
// =============================================================================
//
// FILE       : Na__ClientLinks__SendCheck__.js
// NAMESPACE  : Na__ClientLinks
// MODULE     : Feature - Client Links
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The modal between Send email and a client's inbox: what is going
//              where, the checks to make, a tick box that unlocks Send, then the
//              send itself and a plain answer: sent to whom, or why not
// CREATED    : 28-Oct-2026
//
// DESCRIPTION:
// - Adam, 28-Oct-2026: a modal that says the email is going out of Vale and asks
//   whether everything is correct and the spelling is good, to remind staff to
//   be diligent with external correspondence; a tick box unlocks Send (asked
//   first).
// - ONE MODAL, FOUR STATES:
//     CHECK     "This email is going outside Vale": To in large type, CC (you),
//               the subject, the greeting, the project, the client link, the
//               special notes as typed; the checklist; Preview email (the very
//               email, in a new tab); "I have checked this email ..." unlocks
//               Send email.
//     SENDING   every button off; Escape and the backdrop wait.
//     SENT      "Email sent": successfully sent to <the address>, who was
//               copied in, the client emails left this hour; Done.
//     NOT SENT  the server's reason in red; Try again where trying again could
//               help (never after the hourly limit), else Go back and edit.
//               Nothing typed is lost.
// - THE SEND IS THE CALLER'S (options.send resolves the server's answer). The
//   answer is checked here: ok, and every address in sentTo, else the modal says
//   the send was not confirmed and offers no retry (it may have gone).
//   options.onSent(answer) runs the moment it is confirmed.
// - Enter never sends by itself: the focus starts on the panel, Tab reaches the
//   tick box first, and Enter presses only the button with the focus. Escape and
//   the backdrop are Go back. No key reaches the model behind.
// - At 9998: above the Share Project Link form (3100), below the toast and the
//   confirm dialog (9999), so the success toast shows over it.
//
// INTEGRATION:
// - Opened by Na__ClientLinks__ShareTab__ (the Client email panel's Send email).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 28-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.79.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__ClientLinks__Clear, Na__ClientLinks__El, Na__ClientLinks__Icon, Na__ClientLinks__IconButton } from './Na__ClientLinks__Helpers__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__ClientLinks__SEND_CHECKS = [
        'The email address is right, letter for letter.',
        'The names after "Dear" are spelt correctly.',
        'The special notes read well, with no spelling or grammar mistakes.',
        'It is the right project, and the right client link, for this client.'
    ];
    const Na__ClientLinks__SEND_TICK   = 'I have checked this email, and it is ready to go to the client.';
    const Na__ClientLinks__SEND_LABEL  = 'Send email';
    const Na__ClientLinks__SEND_LOCAL  = 'This is a local copy of ValeVision 3D: the client link in this email exists only on this PC, '
                                       + 'so the client could not open it. Send client emails from app.valegardenhouses.com.';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Line of the Summary: (label, text or element)
    // ------------------------------------------------------------
    function Na__ClientLinks__SendRow(label, value) {
        const row = Na__ClientLinks__El('div', 'na-client-send__row');
        row.appendChild(Na__ClientLinks__El('div', 'na-client-send__row-label', label));
        const cell = Na__ClientLinks__El('div', 'na-client-send__row-value');
        if (value instanceof Node) cell.appendChild(value);
        else cell.textContent = String(value || '');
        row.appendChild(cell);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Addresses, One a Line, in Large Type
    // ------------------------------------------------------------
    function Na__ClientLinks__SendAddresses(addresses) {
        const list = Na__ClientLinks__El('ul', 'na-client-send__addresses');
        addresses.forEach((address) => list.appendChild(Na__ClientLinks__El('li', null, address)));
        return list;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Head: a Badge, the Title and the Line Under It (text or element)
    // ------------------------------------------------------------
    function Na__ClientLinks__SendHead(icon, badgeClass, title, lead) {
        const head = Na__ClientLinks__El('div', 'na-client-send__head');
        const badge = Na__ClientLinks__El('span', `na-client-send__badge${badgeClass ? ' ' + badgeClass : ''}`);
        badge.appendChild(Na__ClientLinks__Icon(icon));
        const titles = Na__ClientLinks__El('div', 'na-client-send__titles');
        titles.appendChild(Na__ClientLinks__El('h2', 'na-client-send__title', title, { id: 'naClientSendTitle' }));
        if (lead) titles.appendChild(lead instanceof Node ? lead : Na__ClientLinks__El('p', 'na-client-send__lead', lead));
        head.append(badge, titles);
        return head;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Modal
// -----------------------------------------------------------------------------

    // FUNCTION | Open the Check: (options) -> Promise<{ sent, answer }>, once the modal closes
    // ------------------------------------------------------------
    // options: to [addresses], subject, greeting, projectText, linkText, notes,
    //          sender { name, email }, isLive, html (for Preview),
    //          send() -> Promise<the server's answer>, onSent(answer)
    // ------------------------------------------------------------
    function Na__ClientLinks__SendCheck__Open(options) {
        const opts = options || {};
        const to = Array.isArray(opts.to) ? opts.to.map((address) => String(address).toLowerCase()) : [];

        return new Promise((resolve) => {
            const returnFocus = document.activeElement;
            let state = 'check';                                                  // <-- check | sending | sent
            let result = { sent : false, answer : null };
            let previewUrl = '';

            const root = Na__ClientLinks__El('div', 'na-client-send', null, { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'naClientSendTitle' });
            const backdrop = Na__ClientLinks__El('div', 'na-client-send__backdrop');
            const panel = Na__ClientLinks__El('div', 'na-client-send__panel', null, { tabindex: '-1' });
            root.append(backdrop, panel);


            // CHECK | What is going where, the checks, the tick box
            // ------------------------------------------------------------
            panel.appendChild(Na__ClientLinks__SendHead('alert', null, 'This email is going outside Vale',
                'It goes to your client from Vale\'s apps address, with you copied in, and their replies come to you. '
                + 'This is external correspondence: please check everything before it goes.'));
            if (!opts.isLive) panel.appendChild(Na__ClientLinks__El('p', 'na-client-send__warn', Na__ClientLinks__SEND_LOCAL));

            const sender = opts.sender || {};
            const summary = Na__ClientLinks__El('div', 'na-client-send__summary');
            summary.append(
                Na__ClientLinks__SendRow(to.length === 1 ? 'To' : `To (${to.length})`, Na__ClientLinks__SendAddresses(to)),
                Na__ClientLinks__SendRow('CC', sender.email ? `${sender.name || 'You'} (you), ${sender.email}` : 'You'),
                Na__ClientLinks__SendRow('Subject', opts.subject),
                Na__ClientLinks__SendRow('Opens with', opts.greeting),
                Na__ClientLinks__SendRow('Project', opts.projectText),
                Na__ClientLinks__SendRow('Client link', opts.linkText),
                Na__ClientLinks__SendRow('Special notes', opts.notes
                    ? Na__ClientLinks__El('div', 'na-client-send__notes', opts.notes)
                    : Na__ClientLinks__El('span', 'na-client-send__none', 'None'))
            );
            panel.appendChild(summary);

            const checks = Na__ClientLinks__El('ul', 'na-client-send__checklist');
            Na__ClientLinks__SEND_CHECKS.forEach((text) => {
                const item = Na__ClientLinks__El('li');
                item.append(Na__ClientLinks__Icon('check'), Na__ClientLinks__El('span', null, text));
                checks.appendChild(item);
            });
            panel.append(Na__ClientLinks__El('p', 'na-client-send__checks-title', 'Before you send, check:'), checks);

            const tickRow = Na__ClientLinks__El('label', 'na-client-send__tick');
            const tick = Na__ClientLinks__El('input', null, null, { type: 'checkbox' });
            tickRow.append(tick, Na__ClientLinks__El('span', null, Na__ClientLinks__SEND_TICK));
            const error = Na__ClientLinks__El('div', 'na-client-send__error', null, { role: 'alert', hidden: true });
            panel.append(tickRow, error);

            const actions = Na__ClientLinks__El('div', 'na-client-send__actions');
            const back = Na__ClientLinks__El('button', 'na-client-share__btn', 'Go back and edit', { type: 'button' });
            const preview = Na__ClientLinks__IconButton('eye', 'na-client-share__btn na-client-share__btn--outline', 'Preview email',
                                                        'Open the email in a new tab, exactly as the client will see it');
            const send = Na__ClientLinks__IconButton('send', 'na-client-share__btn na-client-share__btn--primary', Na__ClientLinks__SEND_LABEL,
                                                     'Send the email to the client');
            const sendLabel = send.lastChild;
            send.disabled = true;                                                 // <-- Off until the tick box is ticked
            actions.append(back, preview, send);
            panel.appendChild(actions);
            // ------------------------------------------------------------


            // SUB FUNCTION | Close: Back to the Form (or Done), the Answer to the Caller
            // ------------------------------------------------------------
            const close = () => {
                if (state === 'sending') return;
                window.removeEventListener('keydown', onKey, true);
                root.remove();
                if (previewUrl) {
                    const url = previewUrl;
                    setTimeout(() => URL.revokeObjectURL(url), 60000);            // <-- The preview tab has long since read it
                }
                try {
                    if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
                } catch (_) { /* the form may have gone */ }
                resolve(result);
            };
            // ------------------------------------------------------------


            // SUB FUNCTION | Sending: Every Button Off (and back as it was)
            // ------------------------------------------------------------
            const setSending = (on) => {
                state = on ? 'sending' : 'check';
                root.classList.toggle('is-sending', on);
                [back, preview, tick].forEach((el) => { el.disabled = on; });
                send.disabled = on || !tick.checked;
                sendLabel.textContent = on ? 'Sending…' : Na__ClientLinks__SEND_LABEL;
                if (on) error.hidden = true;
            };
            // ------------------------------------------------------------


            // SUB FUNCTION | Not Sent: the Reason, and Try Again Only Where It Could Help
            // ------------------------------------------------------------
            const showError = (err) => {
                const status = err && typeof err.status === 'number' ? err.status : 0;
                const retry = !(err && err.noRetry) && (status === 0 || status === 502 || status === 504);
                Na__ClientLinks__Clear(error).hidden = false;
                error.append(Na__ClientLinks__El('strong', null, (err && err.title) || 'The email was not sent.'), ' ',
                             (err && err.message) || 'Something went wrong.');
                if (status === 0 && !(err && err.noRetry)) {
                    error.append(' If you are not sure whether it went, look for your copy in your inbox before trying again.');
                }
                send.hidden = !retry;
                sendLabel.textContent = 'Try again';
                (retry ? send : back).focus();
            };
            // ------------------------------------------------------------


            // SUB FUNCTION | Sent: Where It Went, Said Plainly
            // ------------------------------------------------------------
            const showSent = (answer) => {
                state = 'sent';
                root.classList.remove('is-sending');
                root.classList.add('is-sent');
                const sentTo = answer.sentTo;
                const lead = Na__ClientLinks__El('p', 'na-client-send__lead');
                if (sentTo.length === 1) lead.append('Your email was successfully sent to ', Na__ClientLinks__El('strong', null, sentTo[0]), '.');
                else lead.textContent = `Your email was successfully sent to these ${sentTo.length} addresses:`;
                Na__ClientLinks__Clear(panel).appendChild(Na__ClientLinks__SendHead('check', 'na-client-send__badge--ok', 'Email sent', lead));
                if (sentTo.length > 1) panel.appendChild(Na__ClientLinks__SendAddresses(sentTo));
                const cc = Array.isArray(answer.cc) ? answer.cc : [];
                if (cc.length) {
                    panel.appendChild(Na__ClientLinks__El('p', 'na-client-send__fine',
                        `You were copied in at ${cc.join(', ')}, so it is in your inbox too. The client's replies come to you.`));
                }
                if (answer.outside && typeof answer.remainingQuota === 'number' && answer.limitPerHour) {
                    const left = answer.remainingQuota;
                    panel.appendChild(Na__ClientLinks__El('p', 'na-client-send__fine',
                        `You can send ${left} more client email${left === 1 ? '' : 's'} this hour (${answer.limitPerHour} an hour).`));
                }
                const doneRow = Na__ClientLinks__El('div', 'na-client-send__actions');
                const done = Na__ClientLinks__El('button', 'na-client-share__btn na-client-share__btn--primary', 'Done', { type: 'button' });
                done.addEventListener('click', close);
                doneRow.appendChild(done);
                panel.appendChild(doneRow);
                done.focus();
            };
            // ------------------------------------------------------------


            // SUB FUNCTION | Keys: Escape Goes Back, Tab Stays in the Modal, Nothing Reaches the Model
            // ------------------------------------------------------------
            const onKey = (event) => {
                event.stopPropagation();
                if (event.key === 'Escape') {
                    event.preventDefault();
                    close();
                    return;
                }
                if (event.key !== 'Tab') return;
                const items = [...panel.querySelectorAll('button, input, a[href]')].filter((el) => !el.disabled && !el.hidden && el.offsetParent !== null);
                if (!items.length) {
                    event.preventDefault();
                    return;
                }
                const first = items[0];
                const last = items[items.length - 1];
                if (!panel.contains(document.activeElement) || document.activeElement === panel) {
                    event.preventDefault();
                    (event.shiftKey ? last : first).focus();
                } else if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            };
            // ------------------------------------------------------------


            // EVENT HANDLERS | The Tick Box, Go Back, Preview, Send
            // ------------------------------------------------------------
            tick.addEventListener('change', () => { send.disabled = !tick.checked; });
            back.addEventListener('click', close);
            backdrop.addEventListener('click', close);

            preview.addEventListener('click', () => {
                if (!previewUrl) previewUrl = URL.createObjectURL(new Blob([opts.html || ''], { type: 'text/html;charset=utf-8' }));
                window.open(previewUrl, '_blank');
            });

            send.addEventListener('click', async () => {
                if (state !== 'check' || !tick.checked) return;
                setSending(true);
                let answer = null;
                try {
                    answer = await opts.send();
                } catch (err) {
                    setSending(false);
                    showError(err);
                    return;
                }
                const sentTo = Array.isArray(answer && answer.sentTo) ? answer.sentTo.map((address) => String(address).toLowerCase()) : [];
                if (!answer || answer.ok !== true || !to.length || !to.every((address) => sentTo.includes(address))) {
                    setSending(false);                                            // <-- It may have gone: say so, and no Try again
                    showError({ status: 0, noRetry: true, title: 'The send was not confirmed.',
                                message: 'The server did not say the email went to every address. Look for your copy in your inbox before sending it again.' });
                    return;
                }
                result = { sent : true, answer };
                try {
                    if (typeof opts.onSent === 'function') opts.onSent(answer);
                } catch (err) {
                    console.error('[ValeVision3D] After a client email was sent:', err);
                }
                showSent(answer);
            });
            // ------------------------------------------------------------

            window.addEventListener('keydown', onKey, true);                       // <-- First in line: the viewer's own keys never see one
            document.body.appendChild(root);
            panel.focus();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__ClientLinks__SendCheck__Open };

// endregion -------------------------------------------------------------------
