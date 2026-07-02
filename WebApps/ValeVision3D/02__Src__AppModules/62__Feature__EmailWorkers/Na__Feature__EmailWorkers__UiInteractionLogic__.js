// =============================================================================
// VALEVISION3D - EMAIL WORKERS - UI INTERACTION
// =============================================================================
//
// FILE       : Na__Feature__EmailWorkers__UiInteractionLogic__.js
// NAMESPACE  : Na__Feature__EmailWorkers
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Wire Tools menu and modal send-email workflow
// CREATED    : 09-Apr-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__Feature__EmailWorkers__CreateFormOverlay } from './Na__Feature__EmailWorkers__FormOverlay__.js';
    import { Na__Feature__EmailWorkers__CreateAutocompleteController } from './Na__Feature__EmailWorkers__AddressBook__Autocomplete__.js';
    import { Na__Feature__EmailWorkers__CreateApiClient } from './Na__Feature__EmailWorkers__ApiClient__.js';
    import { Na__Feature__EmailWorkers__BuildSendPayload } from './Na__Feature__EmailWorkers__PayloadBuilder__.js';
    import { Na__Feature__EmailWorkers__FetchAndDecryptContacts } from './Na__Feature__EmailWorkers__AddressBook__Decryptor__.js';
    import { Na__Feature__EmailWorkers__EnsureAuthorized } from './Na__Feature__EmailWorkers__AuthManager__.js';
    import { Na__Feature__ShareProjectLink__DownloadHtmlFile } from '../61__Feature__ShareProjectLink/Na__Feature__ShareProjectLink__DownloadEmail__Logic__.js';
    import { Na__Feature__AppNotificationEmail__BuildSendPayload } from '../63__Feature__AppNotificationEmail/Na__Feature__AppNotificationEmail__PayloadBuilder__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialise Feature
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load Email Workers Config Data File
    // ------------------------------------------------------------
    async function Na__Feature__EmailWorkers__LoadFeatureConfig() {
        try {
            const configUrl = new URL('./Na__Feature__EmailWorkers__Config.json', import.meta.url);
            const response = await fetch(configUrl);
            if (!response.ok) {
                throw new Error(`EmailWorkers config fetch failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn('[ValeVision3D] Email workers config load fallback to defaults:', error);
            return {};
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Send Email UI Feature
    // ------------------------------------------------------------
    async function Na__Feature__EmailWorkers__Initialize(options) {
        const showToast = typeof options?.showToast === 'function'
            ? options.showToast
            : () => {};
        const rootElement = options?.rootElement || document.getElementById('root');

        const menuButton = document.getElementById('naSendEmailMenuButton');
        const menuItem = document.getElementById('naSendEmailMenuItem');
        if (!menuButton || !menuItem) {
            console.warn('[ValeVision3D] Send email: menu controls not found');
            return;
        }

        const featureConfig   = await Na__Feature__EmailWorkers__LoadFeatureConfig();
        const apiClient       = Na__Feature__EmailWorkers__CreateApiClient(featureConfig);
        const form            = Na__Feature__EmailWorkers__CreateFormOverlay(rootElement);
        const sourceConfig    = featureConfig?.EmailWorkers__Config || {};
        const contactsCdnUrl  = String(sourceConfig.EmailWorkers__Config__ContactsCdnUrl || '').trim();
        const contactsKeyB64  = String(sourceConfig.EmailWorkers__Config__ContactsDecryptKeyB64 || '').trim();

        const autocomplete = Na__Feature__EmailWorkers__CreateAutocompleteController({
            hostContainer    : form.panel,
            recipientInput   : form.recipientInput,
            chipsContainer   : form.chipsContainer,
            suggestionsList  : form.suggestionsList
        });

        let contactsLoadState = 'idle';                                         // <-- idle | loading | loaded | failed

        // SUB FUNCTION | Sync Menu Chevron with Overlay State
        // ------------------------------------------------------------
        const setMenuOpenVisual = (isOpen) => {
            menuItem.classList.toggle('is-email-overlay-open', Boolean(isOpen));
            menuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Load Address Book from CDN (Non-Blocking)
        // ------------------------------------------------------------
        const ensureContactsLoaded = async () => {
            if (contactsLoadState === 'loaded' || contactsLoadState === 'loading') return;
            contactsLoadState = 'loading';

            try {
                if (!contactsCdnUrl || !contactsKeyB64) {
                    throw new Error('Contacts CDN URL or decrypt key not configured.');
                }
                const contactsArray = await Na__Feature__EmailWorkers__FetchAndDecryptContacts(contactsCdnUrl, contactsKeyB64);
                autocomplete.setAddressBook(contactsArray);
                contactsLoadState = 'loaded';
            } catch (error) {
                contactsLoadState = 'failed';
                console.warn('[ValeVision3D] Contacts load failed:', error?.message);
                showToast(
                    'Address book unavailable — type email addresses manually.',
                    true
                );
            }
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Open Overlay
        // ------------------------------------------------------------
        const openOverlay = () => {
            form.show();
            setMenuOpenVisual(true);
            ensureContactsLoaded();                                            // <-- Load contacts in background, don't block overlay
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Close Overlay
        // ------------------------------------------------------------
        const closeOverlay = () => {
            setMenuOpenVisual(false);
            form.hide();
        };
        // ------------------------------------------------------------

        menuButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const isVisible = form.overlay.classList.contains('is-visible');
            if (isVisible) {
                closeOverlay();
                return;
            }
            openOverlay();
        });

        form.backdrop.addEventListener('click', closeOverlay);
        form.btnCancel.addEventListener('click', closeOverlay);

        form.btnGenerate.addEventListener('click', async () => {
            try {
                const selectedRecipients = autocomplete.getRecipients();
                const payload = await Na__Feature__EmailWorkers__BuildSendPayload({
                    selectedRecipients,
                    notesRaw                  : form.getNotesValue(),
                    recipientNamesRawOverride : form.getGreetingNamesValue()
                });
                if (!String(payload.greetingNamesRaw || '').trim()) {
                    showToast('Please add greeting names for the first line (comma separated).', true);
                    return;
                }

                Na__Feature__ShareProjectLink__DownloadHtmlFile(payload.downloadFilename, payload.htmlBody);
                showToast('Email HTML downloaded.');
            } catch (error) {
                console.error('[ValeVision3D] Generate email download failed:', error);
                showToast(error?.message || 'Could not generate email HTML.', true);
            }
        });

        // EVENT HANDLER | Send App Notification Email (New Pipeline - No Project Link)
        // ------------------------------------------------------------
        form.btnSendNotification.addEventListener('click', async () => {
            const selectedRecipients = autocomplete.getRecipients();
            if (selectedRecipients.length === 0) {
                showToast('Please add at least one recipient.', true);
                return;
            }

            let authToken;
            try {
                authToken = await Na__Feature__EmailWorkers__EnsureAuthorized(apiClient, rootElement, showToast);
            } catch (authError) {
                if (authError?.message === 'Authorization cancelled.') return;
                showToast(authError?.message || 'Authorization failed.', true);
                return;
            }

            try {
                form.btnSendNotification.disabled = true;
                form.btnSendNotification.textContent = 'Sending...';

                const payload = await Na__Feature__AppNotificationEmail__BuildSendPayload({
                    selectedRecipients,
                    notesRaw                  : form.getNotesValue(),
                    recipientNamesRawOverride : form.getGreetingNamesValue()
                });

                const sendResult = await apiClient.sendEmail(payload, authToken);
                const sentCount = Number(sendResult?.sentCount || selectedRecipients.length);
                showToast(`App notification sent to ${sentCount} recipient${sentCount === 1 ? '' : 's'}.`);
                autocomplete.clear();
                form.notesInput.value = '';
                closeOverlay();
            } catch (error) {
                console.error('[ValeVision3D] Send app notification failed:', error);
                showToast(error?.message || 'App notification send failed. Check API access and credentials.', true);
            } finally {
                form.btnSendNotification.disabled = false;
                form.btnSendNotification.textContent = 'Send app notification';
            }
        });
        // ------------------------------------------------------------


        // EVENT HANDLER | Send Legacy Share-Link Email (Kept As-Is By Design)
        // ------------------------------------------------------------
        form.btnSend.addEventListener('click', async () => {
            const selectedRecipients = autocomplete.getRecipients();
            if (selectedRecipients.length === 0) {
                showToast('Please add at least one recipient.', true);
                return;
            }

            let authToken;
            try {
                authToken = await Na__Feature__EmailWorkers__EnsureAuthorized(apiClient, rootElement, showToast);
            } catch (authError) {
                if (authError?.message === 'Authorization cancelled.') return;
                showToast(authError?.message || 'Authorization failed.', true);
                return;
            }

            try {
                form.btnSend.disabled = true;
                form.btnSend.textContent = 'Sending...';

                const payload = await Na__Feature__EmailWorkers__BuildSendPayload({
                    selectedRecipients,
                    notesRaw                  : form.getNotesValue(),
                    recipientNamesRawOverride : form.getGreetingNamesValue()
                });

                const sendResult = await apiClient.sendEmail(payload, authToken);
                const sentCount = Number(sendResult?.sentCount || selectedRecipients.length);
                showToast(`Email sent to ${sentCount} recipient${sentCount === 1 ? '' : 's'}.`);
                autocomplete.clear();
                form.notesInput.value = '';
                closeOverlay();
            } catch (error) {
                console.error('[ValeVision3D] Send email failed:', error);
                showToast(error?.message || 'Email send failed. Check API access and credentials.', true);
            } finally {
                form.btnSend.disabled = false;
                form.btnSend.textContent = 'Send email';
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__EmailWorkers__Initialize
    };

// endregion -------------------------------------------------------------------
