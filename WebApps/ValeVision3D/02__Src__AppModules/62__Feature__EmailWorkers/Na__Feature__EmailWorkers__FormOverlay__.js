// =============================================================================
// VALEVISION3D - EMAIL WORKERS - FORM OVERLAY
// =============================================================================
//
// FILE       : Na__Feature__EmailWorkers__FormOverlay__.js
// NAMESPACE  : Na__Feature__EmailWorkers
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Modal UI for recipient selection and send-email actions
// CREATED    : 09-Apr-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Overlay Factory
// -----------------------------------------------------------------------------

    // FUNCTION | Create Email Send Overlay Under Root Element
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__CreateFormOverlay(rootElement) {
        const host = rootElement && rootElement.nodeType === Node.ELEMENT_NODE
            ? rootElement
            : document.body;
        const antiAutofillToken = `naEmailWorkers-${Date.now().toString(36)}`;

        // SUB HELPER FUNCTION | Apply Anti-Autofill Attributes to User Inputs
        // ------------------------------------------------------------
        const applyAntiAutofillAttributes = (inputElement, fieldSuffix) => {
            inputElement.setAttribute('autocomplete', 'new-password');
            inputElement.setAttribute('autocorrect', 'off');
            inputElement.setAttribute('autocapitalize', 'none');
            inputElement.setAttribute('spellcheck', 'false');
            inputElement.setAttribute('data-lpignore', 'true');                 // <-- LastPass ignore hint
            inputElement.setAttribute('data-1p-ignore', 'true');                // <-- 1Password ignore hint
            inputElement.setAttribute('data-form-type', 'other');               // <-- Generic non-login field hint
            inputElement.name = `${antiAutofillToken}-${fieldSuffix}`;          // <-- Non-semantic name to avoid profile matching
            inputElement.readOnly = true;                                        // <-- Released on focus (blocks eager autofill)
            inputElement.addEventListener('focus', () => {
                inputElement.readOnly = false;
            }, { once: true });
        };
        // ------------------------------------------------------------

        const overlay = document.createElement('div');
        overlay.className = 'na-email-workers-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'naEmailWorkersOverlayTitle');

        const backdrop = document.createElement('div');
        backdrop.className = 'na-email-workers-overlay__backdrop';
        backdrop.tabIndex = -1;

        const panel = document.createElement('div');
        panel.className = 'na-email-workers-overlay__panel';

        const antiAutofillTrapUser = document.createElement('input');
        antiAutofillTrapUser.type = 'text';
        antiAutofillTrapUser.name = `${antiAutofillToken}-trap-user`;
        antiAutofillTrapUser.autocomplete = 'username';
        antiAutofillTrapUser.tabIndex = -1;
        antiAutofillTrapUser.style.position = 'absolute';
        antiAutofillTrapUser.style.left = '-9999px';
        antiAutofillTrapUser.setAttribute('aria-hidden', 'true');

        const antiAutofillTrapPass = document.createElement('input');
        antiAutofillTrapPass.type = 'password';
        antiAutofillTrapPass.name = `${antiAutofillToken}-trap-pass`;
        antiAutofillTrapPass.autocomplete = 'new-password';
        antiAutofillTrapPass.tabIndex = -1;
        antiAutofillTrapPass.style.position = 'absolute';
        antiAutofillTrapPass.style.left = '-9999px';
        antiAutofillTrapPass.setAttribute('aria-hidden', 'true');

        const title = document.createElement('h2');
        title.id = 'naEmailWorkersOverlayTitle';
        title.className = 'na-email-workers-overlay__title';
        title.textContent = 'Share Project Link';

        const hint = document.createElement('p');
        hint.className = 'na-email-workers-overlay__hint';
        hint.textContent = 'Type a person or email to search the internal address book, then send directly from ValeVision3D.';

        const recipientsField = document.createElement('div');
        recipientsField.className = 'na-email-workers-overlay__field';

        const recipientsLabel = document.createElement('label');
        recipientsLabel.className = 'na-email-workers-overlay__label';
        recipientsLabel.htmlFor = 'naEmailWorkersRecipientsInput';
        recipientsLabel.textContent = 'Recipients';

        const recipientsContainer = document.createElement('div');
        recipientsContainer.className = 'na-email-workers-overlay__recipients-container';

        const chipsContainer = document.createElement('div');
        chipsContainer.className = 'na-email-workers-overlay__chips';

        const recipientInput = document.createElement('input');
        recipientInput.id = 'naEmailWorkersRecipientsInput';
        recipientInput.className = 'na-email-workers-overlay__recipient-input';
        recipientInput.type = 'text';
        recipientInput.placeholder = 'Start typing a name or email...';
        applyAntiAutofillAttributes(recipientInput, 'recipients');

        const suggestionsList = document.createElement('div');
        suggestionsList.className = 'na-email-workers-overlay__suggestions';
        suggestionsList.style.display = 'none';

        recipientsContainer.appendChild(chipsContainer);
        recipientsContainer.appendChild(recipientInput);
        recipientsContainer.appendChild(suggestionsList);

        const greetingField = document.createElement('div');
        greetingField.className = 'na-email-workers-overlay__field';

        const greetingLabel = document.createElement('label');
        greetingLabel.className = 'na-email-workers-overlay__label';
        greetingLabel.htmlFor = 'naEmailWorkersGreetingNamesInput';
        greetingLabel.textContent = 'Greeting names (first line)';

        const greetingInput = document.createElement('input');
        greetingInput.id = 'naEmailWorkersGreetingNamesInput';
        greetingInput.className = 'na-email-workers-overlay__input';
        greetingInput.type = 'text';
        greetingInput.placeholder = 'e.g. Derek, Roger, Sally';
        applyAntiAutofillAttributes(greetingInput, 'greeting');

        const notesField = document.createElement('div');
        notesField.className = 'na-email-workers-overlay__field';

        const notesLabel = document.createElement('label');
        notesLabel.className = 'na-email-workers-overlay__label';
        notesLabel.htmlFor = 'naEmailWorkersNotesInput';
        notesLabel.textContent = 'Special notes (optional)';

        const notesInput = document.createElement('textarea');
        notesInput.id = 'naEmailWorkersNotesInput';
        notesInput.className = 'na-email-workers-overlay__textarea';
        notesInput.rows = 4;
        notesInput.placeholder = 'Optional message appended to the generated email.';
        applyAntiAutofillAttributes(notesInput, 'notes');

        const actions = document.createElement('div');
        actions.className = 'na-email-workers-overlay__actions';

        const btnCancel = document.createElement('button');
        btnCancel.type = 'button';
        btnCancel.className = 'na-email-workers-overlay__btn na-email-workers-overlay__btn--secondary';
        btnCancel.textContent = 'Cancel';

        const btnGenerate = document.createElement('button');
        btnGenerate.type = 'button';
        btnGenerate.className = 'na-email-workers-overlay__btn na-email-workers-overlay__btn--secondary';
        btnGenerate.textContent = 'Generate & download email';

        const btnSend = document.createElement('button');
        btnSend.type = 'button';
        btnSend.className = 'na-email-workers-overlay__btn na-email-workers-overlay__btn--primary';
        btnSend.textContent = 'Send email';

        recipientsField.appendChild(recipientsLabel);
        recipientsField.appendChild(recipientsContainer);

        greetingField.appendChild(greetingLabel);
        greetingField.appendChild(greetingInput);

        notesField.appendChild(notesLabel);
        notesField.appendChild(notesInput);

        actions.appendChild(btnCancel);
        actions.appendChild(btnGenerate);
        actions.appendChild(btnSend);

        panel.appendChild(antiAutofillTrapUser);
        panel.appendChild(antiAutofillTrapPass);
        panel.appendChild(title);
        panel.appendChild(hint);
        panel.appendChild(recipientsField);
        panel.appendChild(greetingField);
        panel.appendChild(notesField);
        panel.appendChild(actions);

        overlay.appendChild(backdrop);
        overlay.appendChild(panel);
        host.appendChild(overlay);

        panel.addEventListener('click', (event) => event.stopPropagation());

        function show() {
            overlay.classList.add('is-visible');
            recipientInput.focus();
        }

        function hide() {
            overlay.classList.remove('is-visible');
        }

        function getNotesValue() {
            return notesInput.value;
        }

        function getGreetingNamesValue() {
            return greetingInput.value;
        }

        return {
            overlay,
            backdrop,
            panel,
            btnCancel,
            btnGenerate,
            btnSend,
            recipientInput,
            chipsContainer,
            suggestionsList,
            greetingInput,
            notesInput,
            show,
            hide,
            getNotesValue,
            getGreetingNamesValue
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__EmailWorkers__CreateFormOverlay
    };

// endregion -------------------------------------------------------------------
