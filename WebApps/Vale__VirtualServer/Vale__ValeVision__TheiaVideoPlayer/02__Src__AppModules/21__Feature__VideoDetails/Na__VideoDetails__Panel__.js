// =============================================================================
// VALEVISION THEIA - FEATURE - VIDEO DETAILS (TITLE, DESCRIPTION, EDIT, SHARE)
// =============================================================================
//
// FILE       : Na__VideoDetails__Panel__.js
// NAMESPACE  : Na__Details
// MODULE     : Feature - Video Details
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Under the player: the video's title and description, its length and
//              quality; Share for staff; Edit for managers
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - EDIT (Management and AppAdmin): the title and description become fields;
//   Save writes them through the API, which also writes them into the path in
//   ValeVision 3D's Video Studio when the video came from there - the two apps
//   stay in step. A save made from an out-of-date page is refused (409) and the
//   page shows what is on the server now.
// - LAYOUT: one heading line, "64135 - Holt | Exterior" (project number and
//   name, then the video's title), with the length, quality and publish date
//   inline after it and the Edit / Share buttons at the right; the description
//   under it. The details sit in the player's stage, one card with the video.
// - Managers also see a video's flags: hidden, below 2K, a file missing on this
//   server, a file that would not open, other sizes of it nobody uses.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.1.0
// - On Adam's note ("the player and the text underneath don't feel like one
//   element"): the heading is "64135 - Holt | Exterior" on one line, the length,
//   quality and publish date follow it inline, and the stage is one card.
//
// 07-Oct-2026 - Version 1.0.0
// - Initial build. The title row and its buttons were lined up with the player,
//   in Open Sans SemiBold, the same day on Adam's notes.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Details
// -----------------------------------------------------------------------------

    import { Na__Dom__El, Na__Dom__IconButton, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Duration, Na__Format__Scheme, Na__Format__Date } from '../03__AppUtils/Na__AppUtils__Format__.js';


    // FUNCTION | Build: { can, showScheme, projectLine() -> text, onSave({title, description}) -> Promise, onShare() }
    // ------------------------------------------------------------
    function Na__Details__Build(container, options) {
        const opts = options || {};
        container.classList.add('theia-details');
        let video = null;

        const view = () => {
            Na__Dom__Clear(container);
            if (!video) return;
            const projectLine = typeof opts.projectLine === 'function' ? opts.projectLine() : '';
            const head = Na__Dom__El('div', 'theia-details__head');
            const lead = Na__Dom__El('div', 'theia-details__lead');               // <-- The heading and its facts, one line
            const heading = Na__Dom__El('h1', 'theia-details__title');
            if (projectLine) {                                                   // <-- "64135 - Holt | Exterior"
                heading.append(Na__Dom__El('span', 'theia-details__project', projectLine),
                               Na__Dom__El('span', 'theia-details__sep', '|', { 'aria-hidden': 'true' }));
            }
            heading.appendChild(Na__Dom__El('span', 'theia-details__name', video.title));
            lead.appendChild(heading);
            head.appendChild(lead);

            const actions = Na__Dom__El('div', 'theia-details__actions');
            if (opts.can && opts.can.edit) {
                const edit = Na__Dom__IconButton('edit', 'theia-button theia-button--outline', 'Edit', 'Edit the title and description');
                edit.addEventListener('click', editMode);
                actions.appendChild(edit);
            }
            if (opts.can && opts.can.share) {
                const share = Na__Dom__IconButton('share', 'theia-button theia-button--outline', 'Share', 'Share these videos');
                share.addEventListener('click', () => opts.onShare());
                actions.appendChild(share);
            }
            if (actions.childNodes.length) head.appendChild(actions);
            container.appendChild(head);

            // META | Length, quality, scheme, and for managers when it was published:
            // inline after the heading, wrapping under it only when the row is full
            const meta = Na__Dom__El('div', 'theia-details__meta');
            meta.appendChild(Na__Dom__El('span', null, Na__Format__Duration(video.durationMs)));
            if (video.file) {
                meta.appendChild(Na__Dom__El('span', 'theia-details__quality', video.file.quality, { title: `${video.file.width} × ${video.file.height}` }));
            }
            if (opts.showScheme && opts.showScheme()) meta.appendChild(Na__Dom__El('span', null, Na__Format__Scheme(video.scheme)));
            if (opts.can && opts.can.edit && video.publishedIso) meta.appendChild(Na__Dom__El('span', null, `Published ${Na__Format__Date(video.publishedIso)}`));
            Array.from(meta.children).slice(1).forEach((item) =>                 // <-- A dot between facts, outside the 4K badge's box
                meta.insertBefore(Na__Dom__El('span', 'theia-details__dot', '·', { 'aria-hidden': 'true' }), item));
            lead.appendChild(meta);

            if (video.description) {
                const body = Na__Dom__El('div', 'theia-details__description');
                video.description.split(/\n{2,}/).forEach((para) => body.appendChild(Na__Dom__El('p', null, para)));
                container.appendChild(body);
            }

            const flags = [];
            if (video.visible === false) flags.push('Hidden: clients and staff do not see this video.');
            if (video.belowMinimum) flags.push('Below 2K: nobody but managers can play it. Publish it again at 2K or 4K.');
            (video.missingFiles || []).forEach((f) => flags.push(`Not on this server yet: ${f}`));
            (video.problems || []).forEach((p) => flags.push(p));
            (video.unusedFiles || []).forEach((f) => flags.push(`Another size of this video, not used (it can be deleted): ${f}`));
            if (flags.length) {
                const box = Na__Dom__El('div', 'theia-details__flags');
                flags.forEach((f) => box.appendChild(Na__Dom__El('div', 'theia-details__flag', f)));
                container.appendChild(box);
            }
        };

        const editMode = () => {
            Na__Dom__Clear(container);
            const form = Na__Dom__El('form', 'theia-details__form');
            const title = Na__Dom__El('input', 'theia-field', null, { type: 'text', maxlength: '140', 'aria-label': 'Title', required: true });
            title.value = video.title;
            const description = Na__Dom__El('textarea', 'theia-field theia-field--area', null, { rows: '5', maxlength: '4000', 'aria-label': 'Description',
                                                                                             placeholder: 'A sentence or two for the client about this video' });
            description.value = video.description || '';
            const note = Na__Dom__El('div', 'theia-details__note',
                video.source === 'ValeVision3D' ? 'Saved here and in ValeVision 3D\'s Video Studio.' : 'Saved for everyone who watches this video.');
            const status = Na__Dom__El('div', 'theia-details__status', null, { role: 'status' });
            const save = Na__Dom__El('button', 'theia-button theia-button--primary', 'Save', { type: 'submit' });
            const cancel = Na__Dom__El('button', 'theia-button theia-button--outline', 'Cancel', { type: 'button' });
            const actions = Na__Dom__El('div', 'theia-details__form-actions');
            actions.append(save, cancel, status);
            form.append(Na__Dom__El('label', 'theia-label', 'Title'), title, Na__Dom__El('label', 'theia-label', 'Description'), description, note, actions);
            cancel.addEventListener('click', view);
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                save.disabled = true;
                status.textContent = 'Saving…';
                try {
                    await opts.onSave({ title: title.value.trim(), description: description.value.trim() });
                } catch (error) {
                    status.textContent = error.message || 'Could not save.';
                    save.disabled = false;
                }
            });
            container.appendChild(form);
            title.focus();
        };

        return {
            render(next) { video = next; view(); },
            current() { return video; }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Details__Build };

// endregion -------------------------------------------------------------------
