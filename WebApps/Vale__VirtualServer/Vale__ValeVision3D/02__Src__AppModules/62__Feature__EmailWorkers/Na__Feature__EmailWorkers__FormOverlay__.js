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
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 28-Oct-2026 - Pictures and one choice (ValeVision3D v2.79.4)
// - Adam: "Make these easier to understand, use graphics". The Internal tab
//   picks its email on two picture cards (Project link email: the link icon;
//   New project notice: the bell), first under the hint. One row of actions:
//   Cancel, Download Email (the download icon) and Send email on the right,
//   bigger (the paper plane). Both act on the chosen card, so the pop-up
//   "which email type" chooser and the second Send button are gone.
//   getEmailType() and setBusy(button, words) for the UI logic.
//
// 28-Oct-2026 - Vale addresses only, said (ValeVision3D v2.79.0, client emails sent)
// - The Internal tab's hint says a client is emailed from External Client
//   Sharing: the server refuses an address outside Vale from this tab.
//
// 28-Oct-2026 - Two tabs (ValeVision3D v2.77.0, client links)
// - "Internal Vale Company Sharing" (the default, every time the form opens)
//   holds the form exactly as it was: address book, greeting, notes, emails.
// - "External Client Sharing" is an empty panel here; the client links module
//   (93__Feature__ClientLinks/Na__ClientLinks__ShareTab__) fills it the first
//   time it is chosen. selectTab(name) switches; onTabChange(name) is called.
// - The panel is 560px wide (was 520px) so both tab names fit on one line.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__ClientLinks__Icon } from '../93__Feature__ClientLinks/Na__ClientLinks__Helpers__.js';

// endregion -------------------------------------------------------------------


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

        // TABS | Internal (the form as it always was) and External (client links)
        // ------------------------------------------------------------
        const tabs = document.createElement('div');
        tabs.className = 'na-email-workers-overlay__tabs';
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Who the project is shared with');

        const makeTab = (name, icon, label, panelId) => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.id = `naShareTab__${name}`;
            tab.className = 'na-email-workers-overlay__tab';
            tab.dataset.tab = name;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-controls', panelId);
            tab.appendChild(Na__ClientLinks__Icon(icon, 'na-email-workers-overlay__tab-icon'));
            const text = document.createElement('span');
            text.textContent = label;
            tab.appendChild(text);
            return tab;
        };
        const tabInternal = makeTab('internal', 'staff', 'Internal Vale Company Sharing', 'naShareTabPanel__internal');
        const tabExternal = makeTab('external', 'client', 'External Client Sharing', 'naShareTabPanel__external');
        tabs.appendChild(tabInternal);
        tabs.appendChild(tabExternal);

        const makeTabPanel = (name, tab) => {
            const tabPanel = document.createElement('div');
            tabPanel.id = `naShareTabPanel__${name}`;
            tabPanel.className = `na-email-workers-overlay__tabpanel na-email-workers-overlay__tabpanel--${name}`;
            tabPanel.setAttribute('role', 'tabpanel');
            tabPanel.setAttribute('aria-labelledby', tab.id);
            return tabPanel;
        };
        const internalPanel = makeTabPanel('internal', tabInternal);
        const externalPanel = makeTabPanel('external', tabExternal);
        // ------------------------------------------------------------

        const hint = document.createElement('p');
        hint.className = 'na-email-workers-overlay__hint';
        hint.textContent = 'Type a person or email to search the internal address book, then send directly from ValeVision3D. '
                         + 'Vale addresses only: to email a client, use External Client Sharing.';

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

        // EMAIL TYPE | Two picture cards: which email goes (Adam, v2.79.4; was a pop-up chooser and two Send buttons)
        // ------------------------------------------------------------
        const typeField = document.createElement('fieldset');
        typeField.className = 'na-email-workers-overlay__field na-email-workers-overlay__types';

        const typeLegend = document.createElement('legend');
        typeLegend.className = 'na-email-workers-overlay__label';
        typeLegend.textContent = 'Which email?';
        typeField.appendChild(typeLegend);

        const makeTypeCard = (value, icon, name, text) => {
            const card = document.createElement('label');
            card.className = 'na-email-workers-overlay__type';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `${antiAutofillToken}-type`;
            radio.value = value;
            radio.className = 'na-email-workers-overlay__type-radio';
            const badge = document.createElement('span');
            badge.className = 'na-email-workers-overlay__type-badge';
            badge.appendChild(Na__ClientLinks__Icon(icon));
            const words = document.createElement('span');
            words.className = 'na-email-workers-overlay__type-text';
            const strong = document.createElement('strong');
            strong.textContent = name;
            const small = document.createElement('span');
            small.textContent = text;
            words.append(strong, small);
            const tick = document.createElement('span');
            tick.className = 'na-email-workers-overlay__type-tick';
            tick.appendChild(Na__ClientLinks__Icon('check'));
            card.append(radio, badge, words, tick);
            typeField.appendChild(card);
            return radio;
        };
        const typeLink = makeTypeCard('link', 'link', 'Project link email',
                                      'A button that opens this project in ValeVision 3D.');
        makeTypeCard('notice', 'bell', 'New project notice',
                     'Says the project is now in the ValeVision app. No link: it points to the install guide.');
        typeLink.checked = true;
        // ------------------------------------------------------------

        // ACTIONS | Cancel, Download Email, then Send email on the right (the main one)
        // ------------------------------------------------------------
        const actions = document.createElement('div');
        actions.className = 'na-email-workers-overlay__actions';

        const makeButton = (kind, icon, label) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `na-email-workers-overlay__btn na-email-workers-overlay__btn--${kind}`;
            if (icon) button.appendChild(Na__ClientLinks__Icon(icon, 'na-email-workers-overlay__btn-icon'));
            const text = document.createElement('span');
            text.textContent = label;
            button.appendChild(text);
            return button;
        };
        const btnCancel = makeButton('secondary', null, 'Cancel');
        const btnGenerate = makeButton('secondary', 'download', 'Download Email');
        btnGenerate.title = 'Download the chosen email as an HTML file, to paste into Outlook';
        const btnSend = makeButton('primary', 'send', 'Send email');
        btnSend.classList.add('na-email-workers-overlay__btn--send');
        btnSend.title = 'Send the chosen email to the recipients';
        // ------------------------------------------------------------

        recipientsField.appendChild(recipientsLabel);
        recipientsField.appendChild(recipientsContainer);

        greetingField.appendChild(greetingLabel);
        greetingField.appendChild(greetingInput);

        notesField.appendChild(notesLabel);
        notesField.appendChild(notesInput);

        actions.appendChild(btnCancel);
        actions.appendChild(btnGenerate);
        actions.appendChild(btnSend);

        internalPanel.appendChild(hint);
        internalPanel.appendChild(typeField);
        internalPanel.appendChild(recipientsField);
        internalPanel.appendChild(greetingField);
        internalPanel.appendChild(notesField);
        internalPanel.appendChild(actions);

        panel.appendChild(antiAutofillTrapUser);
        panel.appendChild(antiAutofillTrapPass);
        panel.appendChild(title);
        panel.appendChild(tabs);
        panel.appendChild(internalPanel);
        panel.appendChild(externalPanel);

        overlay.appendChild(backdrop);
        overlay.appendChild(panel);
        host.appendChild(overlay);

        panel.addEventListener('click', (event) => event.stopPropagation());

        // SUB FUNCTION | Show One Tab: 'internal' or 'external' (then onTabChange(name))
        // ------------------------------------------------------------
        function selectTab(name) {
            const external = name === 'external';
            [[tabInternal, internalPanel, !external], [tabExternal, externalPanel, external]].forEach(([tab, tabPanel, on]) => {
                tab.classList.toggle('is-active', on);
                tab.setAttribute('aria-selected', on ? 'true' : 'false');
                tab.tabIndex = on ? 0 : -1;
                tabPanel.hidden = !on;
            });
            if (typeof api.onTabChange === 'function') api.onTabChange(external ? 'external' : 'internal');
        }
        // ------------------------------------------------------------

        [tabInternal, tabExternal].forEach((tab) => {
            tab.addEventListener('click', () => selectTab(tab.dataset.tab));
            tab.addEventListener('keydown', (event) => {                         // <-- The tab pattern: arrows move between the two
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                const next = tab === tabInternal ? tabExternal : tabInternal;
                selectTab(next.dataset.tab);
                next.focus();
            });
        });

        function show() {
            overlay.classList.add('is-visible');
            selectTab('internal');                                              // <-- Internal is the default tab, every time
            recipientInput.focus();
        }

        function hide() {
            overlay.classList.remove('is-visible');
        }

        function getEmailType() {                                               // <-- 'link' (the project link email) or 'notice'
            const chosen = typeField.querySelector('input:checked');
            return chosen ? chosen.value : 'link';
        }

        function setBusy(button, words) {                                       // <-- Words while working; null puts the label back
            const text = button.lastChild;
            if (!button.dataset.label) button.dataset.label = text.textContent;
            button.disabled = Boolean(words);
            text.textContent = words || button.dataset.label;
        }

        function getNotesValue() {
            return notesInput.value;
        }

        function getGreetingNamesValue() {
            return greetingInput.value;
        }

        const api = {
            overlay,
            backdrop,
            panel,
            externalPanel,
            selectTab,
            onTabChange : null,                                                 // <-- Set by the UI logic: fills the External tab on first use
            btnCancel,
            btnGenerate,
            btnSend,
            getEmailType,
            setBusy,
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
        selectTab('internal');
        return api;
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
