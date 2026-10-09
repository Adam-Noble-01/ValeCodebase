// =============================================================================
// VALEVISION3D - APPLICATION UTILITIES - CONFIRM DIALOG
// =============================================================================
//
// FILE       : Na__AppUtils__ConfirmDialog.js
// NAMESPACE  : Na__AppUtils
// MODULE     : ConfirmDialog
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Shared in-app confirmation modal for destructive / persistent actions
// CREATED    : 29-Apr-2026
//
// DESCRIPTION:
// - Provides a single shared modal dialog used by destructive / persistent
//   dev actions (Save Camera, Save Orbit Max, Save Fog, Save Grid Position)
//   to gate writes behind an explicit user confirmation.
// - Returns a Promise<boolean> resolving to true on Confirm, false on Cancel
//   / backdrop click / Escape.
// - Falls back to native window.confirm() if the modal DOM is not present,
//   so callers can rely on the API in any environment.
// - Single dialog instance reused across callsites; if a previous call is
//   still open when a new Show() is invoked, the previous one auto-resolves
//   false to prevent listener / promise leaks.
// - Choose() is the three-way form (ValeVision3D v2.76.0): Cancel, an
//   alternate (the safe way on, e.g. Save and Start New) and the confirm (e.g.
//   Discard and Start New). It resolves 'confirm', 'alternate' or 'cancel'.
//   Enter presses the button with the focus (the alternate, else Cancel), never
//   a destructive confirm by default; Escape and the backdrop cancel.
// - Choose({ typeToConfirm : 'delete' }) is the hardest form (v2.76.2): a box
//   takes the focus, and the confirm button stays off until the word is typed.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.2.0 (ValeVision3D v2.76.2)
// - Choose({ typeToConfirm }): a box for a word (delete), the confirm button off
//   until it is typed. First used by deleting a saved drawing, which is final.
//
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.0)
// - Choose(): an optional third button (#naConfirmDialogAlternate), first used by
//   Create Drawing when the open drawing has changes not on the Vale Cloud.
//
// 29-Apr-2026 - Version 1.0.0
// - Initial implementation alongside Dev Tools menu reorganisation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM IDs
    // ------------------------------------------------------------
    const Na__ConfirmDialog__RootId         = 'naConfirmDialog';
    const Na__ConfirmDialog__BackdropId     = 'naConfirmDialogBackdrop';
    const Na__ConfirmDialog__TitleId        = 'naConfirmDialogTitle';
    const Na__ConfirmDialog__MessageId      = 'naConfirmDialogMessage';
    const Na__ConfirmDialog__ConfirmBtnId   = 'naConfirmDialogConfirm';
    const Na__ConfirmDialog__CancelBtnId    = 'naConfirmDialogCancel';
    const Na__ConfirmDialog__AlternateBtnId = 'naConfirmDialogAlternate';   // <-- Choose() only; put away otherwise
    const Na__ConfirmDialog__InputId        = 'naConfirmDialogInput';       // <-- Choose() with typeToConfirm only
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Choose() Answers
    // ------------------------------------------------------------
    const Na__ConfirmDialog__CHOICE_CONFIRM   = 'confirm';
    const Na__ConfirmDialog__CHOICE_ALTERNATE = 'alternate';
    const Na__ConfirmDialog__CHOICE_CANCEL    = 'cancel';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Default Labels
    // ------------------------------------------------------------
    const Na__ConfirmDialog__DefaultConfirmLabel = 'Confirm';
    const Na__ConfirmDialog__DefaultCancelLabel  = 'Cancel';
    const Na__ConfirmDialog__DefaultTitle        = 'Confirm';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Active Dialog Lifecycle Handles
    // ------------------------------------------------------------
    let Na__ConfirmDialog__ActiveCleanup = null;                      // <-- Cleanup function for currently open dialog
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Required DOM References
    // ------------------------------------------------------------
    function Na__ConfirmDialog__ResolveDom() {
        const root       = document.getElementById(Na__ConfirmDialog__RootId);
        if (!root) return null;                                        // <-- Modal markup missing — caller falls back

        const backdrop   = document.getElementById(Na__ConfirmDialog__BackdropId);
        const titleEl    = document.getElementById(Na__ConfirmDialog__TitleId);
        const messageEl  = document.getElementById(Na__ConfirmDialog__MessageId);
        const confirmBtn = document.getElementById(Na__ConfirmDialog__ConfirmBtnId);
        const cancelBtn  = document.getElementById(Na__ConfirmDialog__CancelBtnId);

        if (!titleEl || !messageEl || !confirmBtn || !cancelBtn) return null;
        return { root, backdrop, titleEl, messageEl, confirmBtn, cancelBtn };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Destructive Styling Flag
    // ------------------------------------------------------------
    function Na__ConfirmDialog__ApplyDestructiveFlag(confirmBtn, isDestructive) {
        if (isDestructive) {
            confirmBtn.classList.add('na-confirm-dialog__confirm--destructive');
        } else {
            confirmBtn.classList.remove('na-confirm-dialog__confirm--destructive');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Close Active Dialog (Cancel-Equivalent)
    // ------------------------------------------------------------
    function Na__ConfirmDialog__ForceCloseActive() {
        if (typeof Na__ConfirmDialog__ActiveCleanup === 'function') {
            Na__ConfirmDialog__ActiveCleanup(false);                   // <-- Auto-cancel any prior open dialog
        }
        Na__ConfirmDialog__ActiveCleanup = null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Show Confirmation Dialog (Returns Promise<boolean>)
    // ------------------------------------------------------------
    function Na__AppUtils__ConfirmDialog__Show(options) {
        const opts = options || {};
        const title         = typeof opts.title === 'string'        ? opts.title        : Na__ConfirmDialog__DefaultTitle;
        const message       = typeof opts.message === 'string'      ? opts.message      : '';
        const confirmLabel  = typeof opts.confirmLabel === 'string' ? opts.confirmLabel : Na__ConfirmDialog__DefaultConfirmLabel;
        const cancelLabel   = typeof opts.cancelLabel === 'string'  ? opts.cancelLabel  : Na__ConfirmDialog__DefaultCancelLabel;
        const isDestructive = opts.isDestructive !== false;            // <-- Default true so dev saves get the warm accent

        // Auto-cancel any currently open dialog so listeners cannot leak
        Na__ConfirmDialog__ForceCloseActive();

        const dom = Na__ConfirmDialog__ResolveDom();
        if (!dom) {
            // FALLBACK | Native confirm if modal markup is unavailable
            const fallbackText = title + (message ? `\n\n${message}` : '');
            return Promise.resolve(window.confirm(fallbackText));
        }

        // POPULATE | Title, message, button labels, destructive flag
        dom.titleEl.textContent      = title;
        dom.messageEl.textContent    = message;
        dom.confirmBtn.textContent   = confirmLabel;
        dom.cancelBtn.textContent    = cancelLabel;
        Na__ConfirmDialog__ApplyDestructiveFlag(dom.confirmBtn, isDestructive);

        // SHOW | Open modal
        dom.root.classList.add('is-open');
        dom.root.setAttribute('aria-hidden', 'false');

        return new Promise((resolve) => {
            const onConfirm = () => cleanup(true);
            const onCancel  = () => cleanup(false);
            const onKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cleanup(false);                                    // <-- Esc cancels
                } else if (event.key === 'Enter') {
                    event.preventDefault();
                    cleanup(true);                                     // <-- Enter confirms
                }
            };

            const cleanup = (result) => {
                dom.confirmBtn.removeEventListener('click', onConfirm);
                dom.cancelBtn.removeEventListener('click', onCancel);
                if (dom.backdrop) dom.backdrop.removeEventListener('click', onCancel);
                document.removeEventListener('keydown', onKeyDown);

                dom.root.classList.remove('is-open');
                dom.root.setAttribute('aria-hidden', 'true');

                Na__ConfirmDialog__ActiveCleanup = null;
                resolve(!!result);
            };

            // BIND | All cancel + confirm pathways
            dom.confirmBtn.addEventListener('click', onConfirm);
            dom.cancelBtn.addEventListener('click', onCancel);
            if (dom.backdrop) dom.backdrop.addEventListener('click', onCancel);
            document.addEventListener('keydown', onKeyDown);

            // FOCUS | Cancel button by default so accidental Enter still cancels-friendly path
            try { dom.cancelBtn.focus(); } catch (_) { /* focus failures are non-fatal */ }

            Na__ConfirmDialog__ActiveCleanup = cleanup;                // <-- Track for auto-cancel on next Show()
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Show a Three-Way Question (Returns Promise<'confirm' | 'alternate' | 'cancel'>)
    // ------------------------------------------------------------
    // options: title, message, confirmLabel, alternateLabel, cancelLabel,
    // isDestructive, typeToConfirm. With no alternateLabel it is Show() with
    // named answers. typeToConfirm (e.g. 'delete'): a box for the word, and
    // the confirm button stays off until it is typed (any case); Enter in the
    // box confirms only then.
    // ------------------------------------------------------------
    function Na__AppUtils__ConfirmDialog__Choose(options) {
        const opts = options || {};
        const title          = typeof opts.title === 'string'          ? opts.title          : Na__ConfirmDialog__DefaultTitle;
        const message        = typeof opts.message === 'string'        ? opts.message        : '';
        const confirmLabel   = typeof opts.confirmLabel === 'string'   ? opts.confirmLabel   : Na__ConfirmDialog__DefaultConfirmLabel;
        const alternateLabel = typeof opts.alternateLabel === 'string' ? opts.alternateLabel : '';
        const cancelLabel    = typeof opts.cancelLabel === 'string'    ? opts.cancelLabel    : Na__ConfirmDialog__DefaultCancelLabel;
        const typeToConfirm  = typeof opts.typeToConfirm === 'string'  ? opts.typeToConfirm.trim().toLowerCase() : '';
        const isDestructive  = opts.isDestructive !== false;

        Na__ConfirmDialog__ForceCloseActive();                          // <-- Auto-cancel any currently open dialog

        const dom          = Na__ConfirmDialog__ResolveDom();
        const alternateBtn = document.getElementById(Na__ConfirmDialog__AlternateBtnId);
        const input        = document.getElementById(Na__ConfirmDialog__InputId);
        if (!dom || (typeToConfirm && !input)) {
            // FALLBACK | The browser's own box: the word typed into a prompt, or a plain confirm (two buttons)
            const fallbackText = title + (message ? `\n\n${message}` : '');
            if (typeToConfirm) {
                const typed = window.prompt(`${fallbackText}\n\nType ${typeToConfirm} to confirm.`, '');
                return Promise.resolve(String(typed || '').trim().toLowerCase() === typeToConfirm ? Na__ConfirmDialog__CHOICE_CONFIRM : Na__ConfirmDialog__CHOICE_CANCEL);
            }
            return Promise.resolve(window.confirm(fallbackText) ? Na__ConfirmDialog__CHOICE_CONFIRM : Na__ConfirmDialog__CHOICE_CANCEL);
        }
        const hasAlternate = !!alternateBtn && !!alternateLabel;
        const matches      = () => !typeToConfirm || String(input.value || '').trim().toLowerCase() === typeToConfirm;

        // POPULATE | Title, message, the three labels, the word box, destructive flag
        dom.titleEl.textContent    = title;
        dom.messageEl.textContent  = message;
        dom.confirmBtn.textContent = confirmLabel;
        dom.cancelBtn.textContent  = cancelLabel;
        if (alternateBtn) {
            alternateBtn.textContent   = alternateLabel;
            alternateBtn.style.display = hasAlternate ? '' : 'none';    // <-- style, not hidden: the button class sets its own display
        }
        if (input) {
            input.value         = '';
            input.placeholder   = typeToConfirm ? `Type ${typeToConfirm}` : '';
            input.setAttribute('aria-label', typeToConfirm ? `Type ${typeToConfirm} to confirm` : '');
            input.style.display = typeToConfirm ? '' : 'none';
        }
        dom.confirmBtn.disabled = !matches();                            // <-- Off until the word is typed
        Na__ConfirmDialog__ApplyDestructiveFlag(dom.confirmBtn, isDestructive);

        // SHOW | Open modal
        dom.root.classList.add('is-open');
        dom.root.setAttribute('aria-hidden', 'false');

        return new Promise((resolve) => {
            const onConfirm   = () => { if (matches()) cleanup(Na__ConfirmDialog__CHOICE_CONFIRM); };
            const onAlternate = () => cleanup(Na__ConfirmDialog__CHOICE_ALTERNATE);
            const onCancel    = () => cleanup(Na__ConfirmDialog__CHOICE_CANCEL);
            const onInput     = () => { dom.confirmBtn.disabled = !matches(); };
            const onInputKey  = (event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                if (matches()) cleanup(Na__ConfirmDialog__CHOICE_CONFIRM);   // <-- Enter in the box: only once the word is there
            };
            const onKeyDown   = (event) => {
                if (event.key !== 'Escape') return;                    // <-- Enter presses the focused button itself
                event.preventDefault();
                cleanup(Na__ConfirmDialog__CHOICE_CANCEL);
            };

            const cleanup = (choice) => {
                dom.confirmBtn.removeEventListener('click', onConfirm);
                dom.cancelBtn.removeEventListener('click', onCancel);
                if (alternateBtn) {
                    alternateBtn.removeEventListener('click', onAlternate);
                    alternateBtn.style.display = 'none';               // <-- Show() never sees it
                }
                if (input) {
                    input.removeEventListener('input', onInput);
                    input.removeEventListener('keydown', onInputKey);
                    input.value         = '';
                    input.style.display = 'none';                      // <-- Show() never sees it either
                }
                dom.confirmBtn.disabled = false;
                if (dom.backdrop) dom.backdrop.removeEventListener('click', onCancel);
                document.removeEventListener('keydown', onKeyDown);

                dom.root.classList.remove('is-open');
                dom.root.setAttribute('aria-hidden', 'true');

                Na__ConfirmDialog__ActiveCleanup = null;
                resolve(choice);
            };

            // BIND | All three answers, the word box, the backdrop and Escape
            dom.confirmBtn.addEventListener('click', onConfirm);
            dom.cancelBtn.addEventListener('click', onCancel);
            if (hasAlternate) alternateBtn.addEventListener('click', onAlternate);
            if (typeToConfirm) {
                input.addEventListener('input', onInput);
                input.addEventListener('keydown', onInputKey);
            }
            if (dom.backdrop) dom.backdrop.addEventListener('click', onCancel);
            document.addEventListener('keydown', onKeyDown);

            // FOCUS | The word box when there is one; else the safe way on, else Cancel: Enter never discards by default
            try { (typeToConfirm ? input : (hasAlternate ? alternateBtn : dom.cancelBtn)).focus(); } catch (_) { /* focus failures are non-fatal */ }

            Na__ConfirmDialog__ActiveCleanup = () => cleanup(Na__ConfirmDialog__CHOICE_CANCEL);   // <-- A later Show() or Choose() cancels this one
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Confirm Dialog API
    // ------------------------------------------------------------
    export {
        Na__AppUtils__ConfirmDialog__Show,
        Na__AppUtils__ConfirmDialog__Choose
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
