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
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
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
        active  : 'is-active'
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
        Na__PageLayout__SavedList__SetBusy,
        Na__PageLayout__SavedList__WireFilter
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
