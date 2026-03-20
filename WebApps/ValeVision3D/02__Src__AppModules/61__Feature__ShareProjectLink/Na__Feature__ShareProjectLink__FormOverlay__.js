// =============================================================================
// VALEVISION3D - SHARE PROJECT LINK — FORM OVERLAY
// =============================================================================
//
// FILE       : Na__Feature__ShareProjectLink__FormOverlay__.js
// NAMESPACE  : Na__Feature__ShareProjectLink
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Modal form DOM for share-project email generation
// CREATED    : Mar-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Overlay Factory
// -----------------------------------------------------------------------------

    // FUNCTION | Create Share Form Overlay Under Root Element
    // ------------------------------------------------------------
    function Na__Feature__ShareProjectLink__CreateFormOverlay(rootElement) {
        const host = rootElement && rootElement.nodeType === Node.ELEMENT_NODE
            ? rootElement
            : document.body;

        const overlay = document.createElement('div');
        overlay.className = 'na-share-project-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'naShareProjectOverlayTitle');

        const backdrop = document.createElement('div');
        backdrop.className = 'na-share-project-overlay__backdrop';
        backdrop.tabIndex = -1;

        const panel = document.createElement('div');
        panel.className = 'na-share-project-overlay__panel';

        const title = document.createElement('h2');
        title.id = 'naShareProjectOverlayTitle';
        title.className = 'na-share-project-overlay__title';
        title.textContent = 'Share project link';

        const hint = document.createElement('p');
        hint.className = 'na-share-project-overlay__hint';
        hint.textContent = 'Enter recipient names separated by commas. An HTML email file will download for you to attach or paste into your mail client.';

        const fieldRecipients = document.createElement('div');
        fieldRecipients.className = 'na-share-project-overlay__field';
        const labelRecipients = document.createElement('label');
        labelRecipients.className = 'na-share-project-overlay__label';
        labelRecipients.htmlFor = 'naShareProjectRecipientsInput';
        labelRecipients.textContent = 'Address recipients';
        const inputRecipients = document.createElement('textarea');
        inputRecipients.id = 'naShareProjectRecipientsInput';
        inputRecipients.className = 'na-share-project-overlay__textarea';
        inputRecipients.rows = 2;
        inputRecipients.placeholder = 'e.g. Derek, Rodger, Sally';
        inputRecipients.setAttribute('autocomplete', 'off');
        fieldRecipients.appendChild(labelRecipients);
        fieldRecipients.appendChild(inputRecipients);

        const fieldNotes = document.createElement('div');
        fieldNotes.className = 'na-share-project-overlay__field';
        const labelNotes = document.createElement('label');
        labelNotes.className = 'na-share-project-overlay__label';
        labelNotes.htmlFor = 'naShareProjectNotesInput';
        labelNotes.textContent = 'Special notes (optional)';
        const inputNotes = document.createElement('textarea');
        inputNotes.id = 'naShareProjectNotesInput';
        inputNotes.className = 'na-share-project-overlay__textarea na-share-project-overlay__textarea--notes';
        inputNotes.rows = 4;
        inputNotes.placeholder = 'Message shown to recipients in the email (Vale blue accent card). Leave blank to omit.';
        inputNotes.setAttribute('autocomplete', 'off');
        fieldNotes.appendChild(labelNotes);
        fieldNotes.appendChild(inputNotes);

        const actions = document.createElement('div');
        actions.className = 'na-share-project-overlay__actions';
        const btnCancel = document.createElement('button');
        btnCancel.type = 'button';
        btnCancel.className = 'na-share-project-overlay__btn na-share-project-overlay__btn--secondary';
        btnCancel.textContent = 'Cancel';
        const btnGenerate = document.createElement('button');
        btnGenerate.type = 'button';
        btnGenerate.id = 'naShareProjectGenerateBtn';
        btnGenerate.className = 'na-share-project-overlay__btn na-share-project-overlay__btn--primary';
        btnGenerate.textContent = 'Generate & download email';
        actions.appendChild(btnCancel);
        actions.appendChild(btnGenerate);

        panel.appendChild(title);
        panel.appendChild(hint);
        panel.appendChild(fieldRecipients);
        panel.appendChild(fieldNotes);
        panel.appendChild(actions);

        overlay.appendChild(backdrop);
        overlay.appendChild(panel);
        host.appendChild(overlay);

        const stopPanelBubble = (event) => event.stopPropagation();

        panel.addEventListener('click', stopPanelBubble);

        // FUNCTION | Show Overlay
        // --------------------------------------------------------
        function show() {
            overlay.classList.add('is-visible');
            inputRecipients.focus();
        }
        // --------------------------------------------------------

        // FUNCTION | Hide Overlay
        // --------------------------------------------------------
        function hide() {
            overlay.classList.remove('is-visible');
        }
        // --------------------------------------------------------

        // FUNCTION | Read Current Field Values
        // --------------------------------------------------------
        function getValues() {
            return {
                recipientsRaw : inputRecipients.value,
                specialNotesRaw : inputNotes.value
            };
        }
        // --------------------------------------------------------

        // FUNCTION | Remove Overlay from DOM
        // --------------------------------------------------------
        function destroy() {
            overlay.remove();
        }
        // --------------------------------------------------------

        return {
            overlay,
            backdrop,
            panel,
            btnCancel,
            btnGenerate,
            inputRecipients,
            inputNotes,
            show,
            hide,
            getValues,
            destroy
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Feature__ShareProjectLink__CreateFormOverlay };

// endregion -------------------------------------------------------------------
