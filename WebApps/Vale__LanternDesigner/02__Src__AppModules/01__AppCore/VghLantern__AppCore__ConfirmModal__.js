/* =============================================================================
   VGHLANTERN - APP CORE | CONFIRM MODAL
   =============================================================================

   FILE       : VghLantern__AppCore__ConfirmModal__.js
   NAMESPACE  : VghLantern
   MODULE     : AppCore - ConfirmModal
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Shared Cancel / Confirm dialog built on the app's single modal DOM
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Wraps the #VghLantern__Modal__Root overlay already declared in
     VghLantern__App__.html behind a single function call, so a destructive
     action anywhere in the app can ask for confirmation without hand-rolling
     modal markup and button wiring every time.
   - Danger variant swaps the confirm button to VghLantern__Modal__BtnDanger and
     is intended for irreversible actions (e.g. Delete Lantern); both button
     classes already exist for the Delete Project flow, so no new CSS is added.
   - Message is inserted as HTML, not text, so a caller can bold a lantern name.
     Callers are responsible for escaping any user-authored text they interpolate.
   - Prompt() is the same idea for a single text field - Cancel / Save instead of
     Cancel / Confirm - so a rename flow does not need its own hand-rolled input
     markup and button wiring either. OnConfirm receives the trimmed value.
   - This does not replace VghLantern__DocManagement__ProjectActions' own modal
     calls - that flow already works and was left untouched. New destructive
     actions elsewhere in the app should call this module instead of copying
     the modal wiring again.

   ============================================================================= */

// =============================================================================
// REGION | Confirm Modal Module
// =============================================================================

const VghLantern__AppCore__ConfirmModal = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Shared Modal DOM Target IDs
    // ------------------------------------------------------------
    const MODAL_ROOT_ID        =  'VghLantern__Modal__Root';                     // <-- Overlay element declared once in the shell
    const MODAL_TITLE_ID       =  'VghLantern__Modal__TitleEl';
    const MODAL_BODY_ID        =  'VghLantern__Modal__BodyEl';
    const MODAL_ACTIONS_ID     =  'VghLantern__Modal__ActionsEl';
    const MODAL_VISIBLE_CLASS  =  'VghLantern__Modal__Overlay--visible';
    const BTN_CANCEL_ID        =  'VghLantern__ConfirmModal__BtnCancel';
    const BTN_CONFIRM_ID       =  'VghLantern__ConfirmModal__BtnConfirm';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    // Also escapes quotes, unlike a text-content-only escape, because Prompt()
    // interpolates values into HTML attributes (value="...", placeholder="..."),
    // not just element text.
    function VghLantern__ConfirmModal__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Hide the Shared Modal
    // ------------------------------------------------------------
    function VghLantern__ConfirmModal__Hide() {
        var root  =  document.getElementById(MODAL_ROOT_ID);
        if (root) root.classList.remove(MODAL_VISIBLE_CLASS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show a Cancel / Confirm Dialog
    // ------------------------------------------------------------
    // options : { Title, Message, ConfirmLabel, CancelLabel, Danger, OnConfirm }
    // Only OnConfirm fires a callback; Cancel and the backdrop close silently.
    function VghLantern__ConfirmModal__Show(options) {
        var opts  =  options || {};

        var root       =  document.getElementById(MODAL_ROOT_ID);
        var titleEl    =  document.getElementById(MODAL_TITLE_ID);
        var bodyEl     =  document.getElementById(MODAL_BODY_ID);
        var actionsEl  =  document.getElementById(MODAL_ACTIONS_ID);
        if (!root || !titleEl || !bodyEl || !actionsEl) return;

        var confirmClass  =  opts.Danger ? 'VghLantern__Modal__BtnDanger' : 'VghLantern__Modal__BtnPrimary';
        var confirmLabel  =  opts.ConfirmLabel || 'Confirm';
        var cancelLabel   =  opts.CancelLabel  || 'Cancel';

        titleEl.textContent  =  opts.Title || 'Please Confirm';
        bodyEl.innerHTML     =  '<p>' + (opts.Message || '') + '</p>';
        actionsEl.innerHTML  =
            '<button id="' + BTN_CANCEL_ID + '" class="VghLantern__Modal__BtnSecondary">' +
                VghLantern__ConfirmModal__Escape(cancelLabel) + '</button>' +
            '<button id="' + BTN_CONFIRM_ID + '" class="' + confirmClass + '">' +
                VghLantern__ConfirmModal__Escape(confirmLabel) + '</button>';

        root.classList.add(MODAL_VISIBLE_CLASS);

        var cancelBtn   =  document.getElementById(BTN_CANCEL_ID);
        var confirmBtn  =  document.getElementById(BTN_CONFIRM_ID);

        if (cancelBtn) cancelBtn.addEventListener('click', VghLantern__ConfirmModal__Hide);

        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                VghLantern__ConfirmModal__Hide();
                if (typeof opts.OnConfirm === 'function') opts.OnConfirm();       // <-- Fires after the dialog is already closed
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Show a Cancel / Save Dialog With a Single Text Field
    // ------------------------------------------------------------
    // options : { Title, Label, InitialValue, Placeholder, MaxLength, ConfirmLabel, CancelLabel, OnConfirm }
    // OnConfirm receives the trimmed input value; Cancel and the backdrop close silently.
    function VghLantern__ConfirmModal__Prompt(options) {
        var opts  =  options || {};

        var root       =  document.getElementById(MODAL_ROOT_ID);
        var titleEl    =  document.getElementById(MODAL_TITLE_ID);
        var bodyEl     =  document.getElementById(MODAL_BODY_ID);
        var actionsEl  =  document.getElementById(MODAL_ACTIONS_ID);
        if (!root || !titleEl || !bodyEl || !actionsEl) return;

        var confirmLabel  =  opts.ConfirmLabel || 'Save';
        var cancelLabel   =  opts.CancelLabel  || 'Cancel';
        var inputId       =  'VghLantern__ConfirmModal__PromptInput';
        var maxAttr       =  opts.MaxLength > 0 ? ' maxlength="' + opts.MaxLength + '"' : '';

        titleEl.textContent  =  opts.Title || 'Please Enter a Value';
        bodyEl.innerHTML     =
            (opts.Label ? '<label class="VghLantern__Modal__Label" for="' + inputId + '">' +
                VghLantern__ConfirmModal__Escape(opts.Label) + '</label>' : '') +
            '<input id="' + inputId + '" class="VghLantern__Modal__Input" type="text" autocomplete="off"' +
                ' data-vghlantern-noautofill="true"' + maxAttr +
                ' placeholder="' + VghLantern__ConfirmModal__Escape(opts.Placeholder || '') + '"' +
                ' value="' + VghLantern__ConfirmModal__Escape(opts.InitialValue || '') + '">';
        actionsEl.innerHTML  =
            '<button id="' + BTN_CANCEL_ID + '" class="VghLantern__Modal__BtnSecondary">' +
                VghLantern__ConfirmModal__Escape(cancelLabel) + '</button>' +
            '<button id="' + BTN_CONFIRM_ID + '" class="VghLantern__Modal__BtnPrimary">' +
                VghLantern__ConfirmModal__Escape(confirmLabel) + '</button>';

        root.classList.add(MODAL_VISIBLE_CLASS);

        var inputEl     =  document.getElementById(inputId);
        var cancelBtn   =  document.getElementById(BTN_CANCEL_ID);
        var confirmBtn  =  document.getElementById(BTN_CONFIRM_ID);

        function submit() {
            VghLantern__ConfirmModal__Hide();
            if (typeof opts.OnConfirm === 'function') opts.OnConfirm(inputEl ? inputEl.value.trim() : '');
        }

        if (cancelBtn)  cancelBtn.addEventListener('click', VghLantern__ConfirmModal__Hide);
        if (confirmBtn) confirmBtn.addEventListener('click', submit);

        if (inputEl) {
            inputEl.addEventListener('keydown', function(ev) {
                if (ev.key !== 'Enter') return;
                ev.preventDefault();
                submit();                                                         // <-- Enter commits, same as a single-field OS rename prompt
            });
            inputEl.focus();
            inputEl.select();
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ConfirmModal__Show   : VghLantern__ConfirmModal__Show,
        VghLantern__ConfirmModal__Prompt : VghLantern__ConfirmModal__Prompt,
        VghLantern__ConfirmModal__Hide   : VghLantern__ConfirmModal__Hide
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppCore__ConfirmModal  =  VghLantern__AppCore__ConfirmModal;
