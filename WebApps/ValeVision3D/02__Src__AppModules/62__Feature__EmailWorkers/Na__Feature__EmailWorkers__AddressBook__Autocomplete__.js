// =============================================================================
// VALEVISION3D - EMAIL WORKERS - ADDRESS BOOK AUTOCOMPLETE
// =============================================================================
//
// FILE       : Na__Feature__EmailWorkers__AddressBook__Autocomplete__.js
// NAMESPACE  : Na__Feature__EmailWorkers
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Recipient chip input with address-book autocomplete suggestions
// CREATED    : 09-Apr-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Utility Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Normalize Contact Email for Comparison
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__NormalizeEmail(emailValue) {
        return String(emailValue || '').trim().toLowerCase();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Contact Label for Display
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__BuildContactLabel(contactItem) {
        const safeName = String(contactItem?.name || '').trim();
        const safeEmail = String(contactItem?.email || '').trim();
        if (safeName) return `${safeName} <${safeEmail}>`;
        return safeEmail;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Validate Basic Email Syntax
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__IsEmailSyntaxValid(emailValue) {
        return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[A-Za-z]{2,}$/.test(String(emailValue || '').trim());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Autocomplete Controller
// -----------------------------------------------------------------------------

    // FUNCTION | Create Recipients Autocomplete Controller
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__CreateAutocompleteController(elements) {
        const selectedRecipients = [];
        let addressBookContacts = [];

        // SUB FUNCTION | Render Selected Recipient Chips
        // ------------------------------------------------------------
        function renderSelectedChips() {
            elements.chipsContainer.innerHTML = '';

            selectedRecipients.forEach((recipientItem, index) => {
                const chipElement = document.createElement('button');
                chipElement.type = 'button';
                chipElement.className = 'na-email-workers-overlay__recipient-chip';
                chipElement.title = 'Remove recipient';

                const chipTextElement = document.createElement('span');
                chipTextElement.className = 'na-email-workers-overlay__recipient-chip-text';
                chipTextElement.textContent = Na__Feature__EmailWorkers__BuildContactLabel(recipientItem);

                const chipRemoveElement = document.createElement('span');
                chipRemoveElement.className = 'na-email-workers-overlay__recipient-chip-remove';
                chipRemoveElement.setAttribute('aria-hidden', 'true');
                chipRemoveElement.textContent = '×';

                chipElement.appendChild(chipTextElement);
                chipElement.appendChild(chipRemoveElement);
                chipElement.addEventListener('click', () => {
                    selectedRecipients.splice(index, 1);
                    renderSelectedChips();
                    renderSuggestions();
                });
                elements.chipsContainer.appendChild(chipElement);
            });
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Filter Address Book Suggestions
        // ------------------------------------------------------------
        function getFilteredSuggestions() {
            const currentInput = String(elements.recipientInput.value || '').trim().toLowerCase();
            if (!currentInput) return [];

            const selectedSet = new Set(selectedRecipients.map((item) => Na__Feature__EmailWorkers__NormalizeEmail(item.email)));
            return addressBookContacts
                .filter((contactItem) => {
                    const emailNormalized = Na__Feature__EmailWorkers__NormalizeEmail(contactItem.email);
                    if (selectedSet.has(emailNormalized)) return false;

                    const contactName = String(contactItem?.name || '').toLowerCase();
                    const contactEmail = String(contactItem?.email || '').toLowerCase();
                    return contactName.includes(currentInput) || contactEmail.includes(currentInput);
                })
                .slice(0, 8);
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Render Suggestion Dropdown
        // ------------------------------------------------------------
        function renderSuggestions() {
            const filteredSuggestions = getFilteredSuggestions();
            elements.suggestionsList.innerHTML = '';

            if (filteredSuggestions.length === 0) {
                elements.suggestionsList.style.display = 'none';
                return;
            }

            filteredSuggestions.forEach((contactItem) => {
                const suggestionButton = document.createElement('button');
                suggestionButton.type = 'button';
                suggestionButton.className = 'na-email-workers-overlay__suggestion';
                suggestionButton.textContent = Na__Feature__EmailWorkers__BuildContactLabel(contactItem);
                suggestionButton.addEventListener('click', () => {
                    addRecipient(contactItem);
                });
                elements.suggestionsList.appendChild(suggestionButton);
            });

            elements.suggestionsList.style.display = '';
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Add Recipient to Chip List
        // ------------------------------------------------------------
        function addRecipient(contactItem) {
            const safeEmail = Na__Feature__EmailWorkers__NormalizeEmail(contactItem?.email);
            if (!safeEmail) return;

            const alreadyAdded = selectedRecipients.some((item) => Na__Feature__EmailWorkers__NormalizeEmail(item.email) === safeEmail);
            if (alreadyAdded) {
                elements.recipientInput.value = '';
                renderSuggestions();
                return;
            }

            selectedRecipients.push({
                name  : String(contactItem?.name || '').trim(),
                email : safeEmail
            });
            elements.recipientInput.value = '';
            renderSelectedChips();
            renderSuggestions();
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Add Freeform Email from Input
        // ------------------------------------------------------------
        function addFreeformInputAsRecipient() {
            const rawInput = String(elements.recipientInput.value || '').trim();
            if (!rawInput) return false;

            const exactContact = addressBookContacts.find((contactItem) => {
                const contactLabel = Na__Feature__EmailWorkers__BuildContactLabel(contactItem).toLowerCase();
                const contactEmail = String(contactItem?.email || '').toLowerCase();
                const contactName = String(contactItem?.name || '').toLowerCase();
                const lowerInput = rawInput.toLowerCase();
                return lowerInput === contactEmail || lowerInput === contactName || lowerInput === contactLabel;
            });
            if (exactContact) {
                addRecipient(exactContact);
                return true;
            }

            if (Na__Feature__EmailWorkers__IsEmailSyntaxValid(rawInput)) {
                addRecipient({ name: '', email: rawInput });
                return true;
            }

            return false;
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Wire Input Events
        // ------------------------------------------------------------
        function wireInputEvents() {
            elements.recipientInput.addEventListener('input', () => {
                renderSuggestions();
            });

            elements.recipientInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
                    event.preventDefault();
                    const added = addFreeformInputAsRecipient();
                    if (!added) {
                        const firstSuggestion = getFilteredSuggestions()[0];
                        if (firstSuggestion) addRecipient(firstSuggestion);
                    }
                }
            });

            document.addEventListener('click', (event) => {
                const clickedInside = elements.hostContainer.contains(event.target);
                if (!clickedInside) {
                    elements.suggestionsList.style.display = 'none';
                }
            });
        }
        // ------------------------------------------------------------

        wireInputEvents();

        return {
            setAddressBook(rawContacts) {
                addressBookContacts = Array.isArray(rawContacts)
                    ? rawContacts
                        .map((item) => ({
                            name  : String(item?.name || '').trim(),
                            email : Na__Feature__EmailWorkers__NormalizeEmail(item?.email)
                        }))
                        .filter((item) => Boolean(item.email))
                    : [];
                renderSuggestions();
            },

            setSelectedRecipients(rawRecipients) {
                selectedRecipients.length = 0;
                (rawRecipients || []).forEach((item) => {
                    const safeEmail = Na__Feature__EmailWorkers__NormalizeEmail(item?.email);
                    if (!safeEmail) return;
                    selectedRecipients.push({
                        name  : String(item?.name || '').trim(),
                        email : safeEmail
                    });
                });
                renderSelectedChips();
            },

            clear() {
                selectedRecipients.length = 0;
                elements.recipientInput.value = '';
                renderSelectedChips();
                renderSuggestions();
            },

            getRecipients() {
                return selectedRecipients.map((item) => ({ ...item }));
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__EmailWorkers__CreateAutocompleteController
    };

// endregion -------------------------------------------------------------------
