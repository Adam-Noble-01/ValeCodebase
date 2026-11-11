// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - SAVED LAYOUTS LIST (SHARED)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__SavedList__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Saved Layouts List
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Draw a job's saved layouts as cards (thumbnail, name, who and when,
//              Open and Delete) and wire the Everyone / Mine choice: the same list
//              in the Drawing Editor's menu and in ValeVision 3D's Drawings menu
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - ONE LIST, TWO PLACES (Adam, 09-Oct-2026: "use this same menu, it's way better
//   and more intuitive"). The Drawing Editor's Saved Layouts section
//   (Na__PageLayoutSystem__SavedLayouts__Controls__) and the 3D app's Tools &
//   Settings > Drawings (Na__AppPages__SavedDrawings__) both draw it here, and
//   both load its stylesheet (Na__PageLayoutSystem__Styles__SavedList__.css), so
//   the two can never drift apart.
// - IT ONLY DRAWS. Reading the list, who may delete, and what Open and Delete do
//   belong to the caller: each document has its own session and its own page.
// - A LEAF: no imports and no state, so the 3D app imports it without bringing in
//   any of the page's other modules.
// - VERSIONS (v2.94.0, Adam: "ensure its easy to audit who created what when and what
//   the layout was"): each card says which version was exported last, by whom and
//   when, and folds out every version with its own thumbnail, who made it, when,
//   every export of it (Full layout, Image only) and Open. Both lists show them, so
//   colleagues see each other's exported drawings.
// - RECOVERY COPIES (RenderDrafts): drawings never saved, kept on this computer
//   (Na__PageLayoutSystem__RecoveryDraft__), as amber "Not saved" cards with Recover
//   and Discard.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.2.0 (ValeVision3D v2.94.0)
// - Versions on every card (the latest export, then all of them folded out with
//   Open), onOpenVersion and currentVersion; RenderDrafts for the recovery copies.
//
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.3)
// - The open button says Open Drawing (Reopen Drawing on the editor's own sheet):
//   OPEN_LABEL and REOPEN_LABEL, so both lists word it the same.
//
// 09-Oct-2026 - Version 1.0.0 (ValeVision3D v2.76.1)
// - Initial build: the cards and the filter moved out of
//   Na__PageLayoutSystem__SavedLayouts__Controls__ 1.3.1, unchanged in look, to be
//   shared with the 3D app's Drawings menu.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Classes (Na__PageLayoutSystem__Styles__SavedList__.css)
    // ------------------------------------------------------------
    const Na__PageLayout__SavedList__CLASS = Object.freeze({
        busy    : 'na-saved-list__list--busy',
        empty   : 'na-saved-list__empty',
        card    : 'na-saved-list__card',
        current : 'na-saved-list__card--current',
        thumb   : 'na-saved-list__thumb',
        body    : 'na-saved-list__body',
        name    : 'na-saved-list__name',
        meta    : 'na-saved-list__meta',
        actions : 'na-saved-list__actions',
        button  : 'na-saved-list__button',
        danger  : 'na-saved-list__button--danger',
        active  : 'is-active',
        issued  : 'na-saved-list__issued',
        pending : 'na-saved-list__issued--none',
        vers    : 'na-saved-list__versions',
        versSum : 'na-saved-list__versions-title',
        version : 'na-saved-list__version',
        versOn  : 'na-saved-list__version--current',
        vThumb  : 'na-saved-list__version-thumb',
        vBody   : 'na-saved-list__version-body',
        vName   : 'na-saved-list__version-name',
        vMeta   : 'na-saved-list__version-meta',
        vOpen   : 'na-saved-list__version-open',
        draft   : 'na-saved-list__card--draft',
        badge   : 'na-saved-list__badge'
    });
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Dates as the Practice Writes Them (09-Oct-2026 08:40)
    // ------------------------------------------------------------
    const Na__PageLayout__SavedList__MONTHS = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Card's Open Button (Adam, 09-Oct-2026: "Open Drawing")
    // ------------------------------------------------------------
    const Na__PageLayout__SavedList__OPEN_LABEL   = 'Open Drawing';
    const Na__PageLayout__SavedList__REOPEN_LABEL = 'Reopen Drawing';      // <-- The Drawing Editor's own sheet: back to the saved copy
    // ------------------------------------------------------------

    // MODULE CONSTANTS | What the List Says With Nothing to Show
    // ------------------------------------------------------------
    const Na__PageLayout__SavedList__EMPTY_ALL  = 'No layouts have been saved for this job yet.';
    const Na__PageLayout__SavedList__EMPTY_MINE = 'You have not saved a layout for this job yet.';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Versions' Words
    // ------------------------------------------------------------
    const Na__PageLayout__SavedList__OPEN_VERSION_LABEL = 'Open';
    const Na__PageLayout__SavedList__SHOWN_LABEL        = 'On the sheet';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Small Element With a Class and Text
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__Make(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined && text !== null) el.textContent = String(text);
        return el;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Layout's Versions, Newest First
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__Versions(record) {
        const list = Array.isArray(record && record.PageLayouts__Layout__Versions) ? record.PageLayouts__Layout__Versions : [];
        return list.filter((v) => v && Number.isInteger(v.Version__Number)).slice().sort((a, b) => b.Version__Number - a.Version__Number);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Version's Latest Export, or null
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__LastExport(version) {
        const exports = Array.isArray(version && version.Version__Exports) ? version.Version__Exports : [];
        return exports.length ? exports[exports.length - 1] : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What a Version's Exports Were: "Full layout, Image only x2"
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__ExportKinds(version) {
        const counts = {};
        (Array.isArray(version.Version__Exports) ? version.Version__Exports : []).forEach((e) => {
            const kind = String((e && e.Export__Kind) || 'PDF');
            counts[kind] = (counts[kind] || 0) + 1;
        });
        return Object.keys(counts).map((kind) => counts[kind] > 1 ? `${kind} x${counts[kind]}` : kind).join(', ');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Folded-Out List of a Layout's Versions (Thumbnail, Who, When, Exports, Open)
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__VersionList(record, versions, options) {
        const C       = Na__PageLayout__SavedList__CLASS;
        const id      = record.PageLayouts__Layout__Id;
        const details = Na__PageLayout__SavedList__Make('details', C.vers);
        const onSheet = id && id === options.currentId && Number.isInteger(options.currentVersion) ? options.currentVersion : 0;
        details.appendChild(Na__PageLayout__SavedList__Make('summary', C.versSum, `Versions (${versions.length})`));
        if (onSheet) details.open = true;                                   // <-- The version on the sheet is shown

        versions.forEach((version) => {
            const row = Na__PageLayout__SavedList__Make('div', C.version);
            if (version.Version__Number === onSheet) row.classList.add(C.versOn);

            const thumb = Na__PageLayout__SavedList__Make('img', C.vThumb);
            thumb.alt      = '';
            thumb.decoding = 'async';
            if (version.thumbnailUrl && typeof options.fileUrl === 'function') thumb.src = options.fileUrl(version.thumbnailUrl);
            row.appendChild(thumb);

            const body = Na__PageLayout__SavedList__Make('div', C.vBody);
            const name = version.Version__Name && version.Version__Name !== record.PageLayouts__Layout__Name ? `: ${version.Version__Name}` : '';
            body.appendChild(Na__PageLayout__SavedList__Make('div', C.vName, `Version ${version.Version__Number}${name}`));
            body.appendChild(Na__PageLayout__SavedList__Make('div', C.vMeta,
                `${Na__PageLayout__SavedList__FormatIso(version.Version__CreatedIso)}, ${version.Version__CreatedByName || version.Version__CreatedBy || 'unknown'}`));
            const kinds = Na__PageLayout__SavedList__ExportKinds(version);
            const last  = Na__PageLayout__SavedList__LastExport(version);
            const more  = last && (last.Export__By !== version.Version__CreatedBy || (version.Version__Exports || []).length > 1)
                ? `, last ${Na__PageLayout__SavedList__FormatIso(last.Export__Iso)} by ${last.Export__ByName || last.Export__By || 'unknown'}`
                : '';
            body.appendChild(Na__PageLayout__SavedList__Make('div', C.vMeta, `${kinds || 'PDF'}${more}`));
            if (last && last.Export__FileName) {
                const file = Na__PageLayout__SavedList__Make('div', `${C.vMeta} na-saved-list__version-file`, last.Export__FileName);
                file.title = last.Export__FileName;
                body.appendChild(file);
            }
            row.appendChild(body);

            if (typeof options.onOpenVersion === 'function') {
                const isShown = version.Version__Number === onSheet;
                const open    = Na__PageLayout__SavedList__Make('button', `${C.button} ${C.vOpen}`, isShown ? Na__PageLayout__SavedList__SHOWN_LABEL : Na__PageLayout__SavedList__OPEN_VERSION_LABEL);
                open.type  = 'button';
                open.title = `Put version ${version.Version__Number} on the sheet, as it was exported`;
                open.addEventListener('click', () => options.onOpenVersion(record, version.Version__Number));
                row.appendChild(open);
            }
            details.appendChild(row);
        });
        return details;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Card: Thumbnail, Name, Updated, Created, Open and Delete
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__Card(record, options) {
        const C    = Na__PageLayout__SavedList__CLASS;
        const id   = record.PageLayouts__Layout__Id;
        const card = Na__PageLayout__SavedList__Make('div', C.card);
        if (id && id === options.currentId) card.classList.add(C.current);

        const thumb = Na__PageLayout__SavedList__Make('img', C.thumb);
        thumb.alt      = '';
        thumb.decoding = 'async';                                            // <-- Not lazy: the list sits in a folded section, and Edge logs an "[Intervention]" for every deferred thumbnail
        if (record.thumbnailUrl && typeof options.fileUrl === 'function') thumb.src = options.fileUrl(record.thumbnailUrl);
        card.appendChild(thumb);

        const body = Na__PageLayout__SavedList__Make('div', C.body);
        body.appendChild(Na__PageLayout__SavedList__Make('div', C.name, record.PageLayouts__Layout__Name || 'Untitled'));
        const last = Na__PageLayout__SavedList__FormatIso(record.PageLayouts__Layout__UpdatedIso);
        body.appendChild(Na__PageLayout__SavedList__Make('div', C.meta,
            `Updated ${last ? last + ' ' : ''}by ${record.PageLayouts__Layout__UpdatedByName || record.PageLayouts__Layout__UpdatedBy || 'unknown'}`));
        body.appendChild(Na__PageLayout__SavedList__Make('div', C.meta,
            `Created by ${record.PageLayouts__Layout__CreatedByName || record.PageLayouts__Layout__CreatedBy || 'unknown'}`));

        // EXPORTED VERSIONS | The latest export on the card, every version folded out
        // ------------------------------------------------------------
        const versions = Na__PageLayout__SavedList__Versions(record);
        const latest   = versions[0] || null;
        const lastOut  = latest ? Na__PageLayout__SavedList__LastExport(latest) : null;
        body.appendChild(Na__PageLayout__SavedList__Make('div', latest ? C.issued : `${C.issued} ${C.pending}`, latest
            ? `Version ${latest.Version__Number} exported ${Na__PageLayout__SavedList__FormatIso(lastOut ? lastOut.Export__Iso : latest.Version__CreatedIso)} by ${(lastOut && (lastOut.Export__ByName || lastOut.Export__By)) || latest.Version__CreatedByName || 'unknown'}`
            : 'Not exported yet'));
        const versionList = versions.length ? Na__PageLayout__SavedList__VersionList(record, versions, options) : null;   // <-- Under the card, its full width

        const actions = Na__PageLayout__SavedList__Make('div', C.actions);
        const label   = (typeof options.openLabel === 'function' && options.openLabel(record)) || Na__PageLayout__SavedList__OPEN_LABEL;
        const openBtn = Na__PageLayout__SavedList__Make('button', C.button, label);
        openBtn.type = 'button';
        openBtn.addEventListener('click', () => { if (typeof options.onOpen === 'function') options.onOpen(record); });
        actions.appendChild(openBtn);
        if (typeof options.canDelete === 'function' && options.canDelete(record)) {
            const deleteBtn = Na__PageLayout__SavedList__Make('button', `${C.button} ${C.danger}`, 'Delete');
            deleteBtn.type = 'button';
            deleteBtn.addEventListener('click', () => { if (typeof options.onDelete === 'function') options.onDelete(record); });
            actions.appendChild(deleteBtn);
        }
        body.appendChild(actions);
        card.appendChild(body);
        if (versionList) card.appendChild(versionList);
        return card;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | An ISO Time as 09-Oct-2026 08:40 (Local), or ''
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__FormatIso(iso) {
        const date = new Date(iso);
        if (!iso || Number.isNaN(date.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(date.getDate())}-${Na__PageLayout__SavedList__MONTHS[date.getMonth()]}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Layouts the Choice Shows: 'all', or 'mine' (Made by This User Code)
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__Shown(layouts, filter, userCode) {
        const all = Array.isArray(layouts) ? layouts : [];
        return filter === 'mine' ? all.filter((record) => record.PageLayouts__Layout__CreatedBy === userCode) : all;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Line in Place of the Cards (Reading..., Sign in..., Nothing Yet)
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__Message(listBox, text) {
        if (!listBox) return;
        listBox.textContent = '';
        listBox.appendChild(Na__PageLayout__SavedList__Make('div', Na__PageLayout__SavedList__CLASS.empty, text));
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Cards
    // ------------------------------------------------------------
    // options:
    //   layouts    the records to show (already filtered: Shown)
    //   filter     'all' | 'mine' (only for the empty message)
    //   currentId  the layout open on the sheet: its card is outlined
    //   openLabel  (record) => OPEN_LABEL | REOPEN_LABEL (default: Open Drawing)
    //   canDelete  (record) => true when this person may delete it
    //   fileUrl    (relative) => the thumbnail's full address
    //   onOpen     (record) => ...
    //   onDelete   (record) => ...
    //   onOpenVersion  (record, number) => ... (no Open on the versions without it)
    //   currentVersion the version number on the sheet (with currentId), or 0
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__Render(listBox, options = {}) {
        if (!listBox) return;
        const layouts = Array.isArray(options.layouts) ? options.layouts : [];
        if (!layouts.length) {
            Na__PageLayout__SavedList__Message(listBox, options.filter === 'mine' ? Na__PageLayout__SavedList__EMPTY_MINE : Na__PageLayout__SavedList__EMPTY_ALL);
            return;
        }
        listBox.textContent = '';
        layouts.forEach((record) => listBox.appendChild(Na__PageLayout__SavedList__Card(record, options)));
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Recovery Copies Kept on This Computer (Nothing When There Are None)
    // ------------------------------------------------------------
    // drafts: Na__PageLayoutSystem__RecoveryDraft__ List records. options:
    // { title, onRecover(draft), onDiscard(draft) }. The thumbnails are this
    // browser's own blobs, shown through object URLs freed once drawn.
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__RenderDrafts(box, drafts, options = {}) {
        if (!box) return;
        const C    = Na__PageLayout__SavedList__CLASS;
        const list = Array.isArray(drafts) ? drafts : [];
        box.textContent = '';
        box.hidden      = !list.length;
        if (list.length && options.title) box.appendChild(Na__PageLayout__SavedList__Make('div', 'na-saved-list__drafts-title', options.title));
        list.forEach((draft) => {
            const card = Na__PageLayout__SavedList__Make('div', `${C.card} ${C.draft}`);
            const thumb = Na__PageLayout__SavedList__Make('img', C.thumb);
            thumb.alt = '';
            if (draft.Draft__Thumbnail instanceof Blob) {
                const url = URL.createObjectURL(draft.Draft__Thumbnail);
                thumb.addEventListener('load', () => URL.revokeObjectURL(url), { once : true });
                thumb.addEventListener('error', () => URL.revokeObjectURL(url), { once : true });
                thumb.src = url;
            }
            card.appendChild(thumb);

            const body = Na__PageLayout__SavedList__Make('div', C.body);
            const head = Na__PageLayout__SavedList__Make('div', C.name, draft.Draft__Name || 'Unsaved drawing');
            head.appendChild(Na__PageLayout__SavedList__Make('span', C.badge, 'Not saved'));
            body.appendChild(head);
            body.appendChild(Na__PageLayout__SavedList__Make('div', C.meta,
                `Kept on this computer ${Na__PageLayout__SavedList__FormatIso(draft.Draft__SavedIso)}`));
            body.appendChild(Na__PageLayout__SavedList__Make('div', C.meta, draft.Draft__LayoutId
                ? `Changes to ${draft.Draft__LayoutName || 'a saved drawing'}, not saved`
                : 'A new drawing, never saved'));

            const actions = Na__PageLayout__SavedList__Make('div', C.actions);
            const recover = Na__PageLayout__SavedList__Make('button', C.button, 'Recover');
            recover.type  = 'button';
            recover.title = 'Put this drawing back on the sheet, then save it';
            recover.addEventListener('click', () => { if (typeof options.onRecover === 'function') options.onRecover(draft); });
            actions.appendChild(recover);
            const discard = Na__PageLayout__SavedList__Make('button', `${C.button} ${C.danger}`, 'Discard');
            discard.type  = 'button';
            discard.addEventListener('click', () => { if (typeof options.onDiscard === 'function') options.onDiscard(draft); });
            actions.appendChild(discard);
            body.appendChild(actions);
            card.appendChild(body);
            box.appendChild(card);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Grey the List While a Save, Open or Delete Runs
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__SetBusy(listBox, isBusy) {
        if (listBox) listBox.classList.toggle(Na__PageLayout__SavedList__CLASS.busy, !!isBusy);
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire Everyone / Mine (Buttons With data-filter="all" | "mine")
    // ------------------------------------------------------------
    function Na__PageLayout__SavedList__WireFilter(filterBox, onChange) {
        if (!filterBox) return;
        const buttons = Array.from(filterBox.querySelectorAll('[data-filter]'));
        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter') === 'mine' ? 'mine' : 'all';
                buttons.forEach((other) => other.classList.toggle(Na__PageLayout__SavedList__CLASS.active, other === button));
                if (typeof onChange === 'function') onChange(filter);
            });
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Saved Layouts List API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__SavedList__OPEN_LABEL,
        Na__PageLayout__SavedList__REOPEN_LABEL,
        Na__PageLayout__SavedList__FormatIso,
        Na__PageLayout__SavedList__Shown,
        Na__PageLayout__SavedList__Message,
        Na__PageLayout__SavedList__Render,
        Na__PageLayout__SavedList__RenderDrafts,
        Na__PageLayout__SavedList__Versions,
        Na__PageLayout__SavedList__SetBusy,
        Na__PageLayout__SavedList__WireFilter
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
