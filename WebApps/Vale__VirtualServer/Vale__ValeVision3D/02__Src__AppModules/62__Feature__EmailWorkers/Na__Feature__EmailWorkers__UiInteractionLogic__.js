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
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 28-Oct-2026 - One Download, one Send (ValeVision3D v2.79.4)
// - Both act on the email chosen on the form's cards (form.getEmailType():
//   'link' or 'notice'); the type chooser and Send app notification are gone.
//   The toasts and the two payload builders are as they were.
//
// 28-Oct-2026 - Where it went (ValeVision3D v2.79.0, client emails sent)
// - Both sends say where the email went, from the server's answer (sentTo):
//   "Email successfully sent to derek@..., roger@... and 2 more." The server now
//   takes 30 sends an hour here (was 10) and refuses an address outside Vale
//   with a pointer to the External tab's Client email.
//
// 28-Oct-2026 - The External Client Sharing tab (ValeVision3D v2.77.0)
// - The form opens on its Internal tab (unchanged). The External tab is built
//   by 93__Feature__ClientLinks the first time it is chosen, and fetches the
//   project's client links afresh each time it is shown.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__Feature__EmailWorkers__CreateFormOverlay } from './Na__Feature__EmailWorkers__FormOverlay__.js';
    import { Na__Feature__EmailWorkers__CreateAutocompleteController } from './Na__Feature__EmailWorkers__AddressBook__Autocomplete__.js';
    import { Na__Feature__EmailWorkers__CreateApiClient } from './Na__Feature__EmailWorkers__ApiClient__.js';
    import { Na__Feature__EmailWorkers__BuildSendPayload } from './Na__Feature__EmailWorkers__PayloadBuilder__.js';
    import { Na__Feature__ShareProjectLink__DownloadHtmlFile } from '../61__Feature__ShareProjectLink/Na__Feature__ShareProjectLink__DownloadEmail__Logic__.js';
    import { Na__Feature__AppNotificationEmail__BuildSendPayload } from '../63__Feature__AppNotificationEmail/Na__Feature__AppNotificationEmail__PayloadBuilder__.js';
    import { Na__ClientLinks__ShareTab__Build } from '../93__Feature__ClientLinks/Na__ClientLinks__ShareTab__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialise Feature
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | May the Signed-In User Send? (Employee or above: the server checks too)
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__CanSend() {
        return !!(window.ValeUserLogin && window.ValeUserLogin.HasLevel('Employee'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Where an Email Went, From the Server's Answer ("a@x.com, b@x.com and 2 more")
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__SentToText(sendResult, selectedRecipients) {
        const sentTo = Array.isArray(sendResult?.sentTo) && sendResult.sentTo.length
            ? sendResult.sentTo
            : selectedRecipients.map((item) => item.email);
        const shown = sentTo.slice(0, 3).join(', ');
        return sentTo.length > 3 ? `${shown} and ${sentTo.length - 3} more` : shown;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Email Workers Config Data File
    // ------------------------------------------------------------
    async function Na__Feature__EmailWorkers__LoadFeatureConfig() {
        try {
            const configUrl = new URL('./Na__Feature__EmailWorkers__Config.json', import.meta.url);
            const response = await fetch(configUrl, { cache: 'no-cache' });
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

        // STAFF ONLY | Email goes to Vale staff, sent as the signed-in user: a
        // client viewing a project link never sees the menu item.
        menuItem.hidden = !Na__Feature__EmailWorkers__CanSend();
        if (window.ValeUserLogin) window.ValeUserLogin.OnChange(() => { menuItem.hidden = !Na__Feature__EmailWorkers__CanSend(); });

        const featureConfig   = await Na__Feature__EmailWorkers__LoadFeatureConfig();
        const apiClient       = Na__Feature__EmailWorkers__CreateApiClient(featureConfig);
        const form            = Na__Feature__EmailWorkers__CreateFormOverlay(rootElement);

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


        // SUB FUNCTION | Load the Address Book From the Server (Non-Blocking)
        // ------------------------------------------------------------
        // Every active Vale user with an email address, from the users
        // register (GET api/email/contacts, signed in).
        // ------------------------------------------------------------
        const ensureContactsLoaded = async () => {
            if (contactsLoadState === 'loaded' || contactsLoadState === 'loading') return;
            contactsLoadState = 'loading';

            try {
                const contactsArray = await apiClient.fetchContacts();
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

        // EXTERNAL CLIENT SHARING TAB | Built on first use, refreshed every time it is shown
        // ------------------------------------------------------------
        let clientShareTab = null;
        form.onTabChange = (name) => {
            if (name !== 'external') return;
            if (!clientShareTab) clientShareTab = Na__ClientLinks__ShareTab__Build(form.externalPanel, { onClose : closeOverlay });
            clientShareTab.show();
        };
        // ------------------------------------------------------------

        // SUB FUNCTION | Generate & Download Legacy Link Email HTML
        // ------------------------------------------------------------
        const generateAndDownloadLinkEmail = async () => {
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
                showToast('Link email HTML downloaded.');
            } catch (error) {
                console.error('[ValeVision3D] Generate link email download failed:', error);
                showToast(error?.message || 'Could not generate link email HTML.', true);
            }
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Generate & Download App Notification Email HTML
        // ------------------------------------------------------------
        // Test path for the notification pipeline: produces the exact HTML the
        // Send app notification button would email, without sending anything.
        // ------------------------------------------------------------
        const generateAndDownloadNotificationEmail = async () => {
            try {
                const selectedRecipients = autocomplete.getRecipients();
                const payload = await Na__Feature__AppNotificationEmail__BuildSendPayload({
                    selectedRecipients,
                    notesRaw                  : form.getNotesValue(),
                    recipientNamesRawOverride : form.getGreetingNamesValue()
                });
                if (!String(payload.greetingNamesRaw || '').trim()) {
                    showToast('Please add greeting names for the first line (comma separated).', true);
                    return;
                }

                Na__Feature__ShareProjectLink__DownloadHtmlFile(payload.downloadFilename, payload.htmlBody);
                showToast('App notification email HTML downloaded.');
            } catch (error) {
                console.error('[ValeVision3D] Generate app notification download failed:', error);
                showToast(error?.message || 'Could not generate app notification email HTML.', true);
            }
        };
        // ------------------------------------------------------------


        // EVENT HANDLER | Download Email: the email chosen on the cards, as an HTML file
        // ------------------------------------------------------------
        form.btnGenerate.addEventListener('click', () => {
            if (form.getEmailType() === 'notice') generateAndDownloadNotificationEmail();
            else generateAndDownloadLinkEmail();
        });
        // ------------------------------------------------------------


        // EVENT HANDLER | Send Email: the email chosen on the cards (the project link email, or the
        //                 new project notice, which carries no project link)
        // ------------------------------------------------------------
        form.btnSend.addEventListener('click', async () => {
            const isNotice = form.getEmailType() === 'notice';
            const selectedRecipients = autocomplete.getRecipients();
            if (selectedRecipients.length === 0) {
                showToast('Please add at least one recipient.', true);
                return;
            }

            if (!Na__Feature__EmailWorkers__CanSend()) {
                showToast('Sign in with your Vale account to send email.', true);
                return;
            }

            try {
                form.setBusy(form.btnSend, 'Sending...');

                const build = isNotice ? Na__Feature__AppNotificationEmail__BuildSendPayload : Na__Feature__EmailWorkers__BuildSendPayload;
                const payload = await build({
                    selectedRecipients,
                    notesRaw                  : form.getNotesValue(),
                    recipientNamesRawOverride : form.getGreetingNamesValue()
                });

                const sendResult = await apiClient.sendEmail(payload);
                showToast(`${isNotice ? 'New project notice' : 'Email'} successfully sent to `
                        + `${Na__Feature__EmailWorkers__SentToText(sendResult, selectedRecipients)}.`);
                autocomplete.clear();
                form.notesInput.value = '';
                closeOverlay();
            } catch (error) {
                console.error('[ValeVision3D] Send email failed:', error);
                showToast(error?.message || 'Email send failed.', true);
            } finally {
                form.setBusy(form.btnSend, null);
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
