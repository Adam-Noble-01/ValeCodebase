// =============================================================================
// VALEVISION3D - APP NOTIFICATION EMAIL - GENERATE EMAIL HTML
// =============================================================================
//
// FILE       : Na__Feature__AppNotificationEmail__GenerateEmail__Logic__.js
// NAMESPACE  : Na__Feature__AppNotificationEmail
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Fetch tokenised notification template and produce final email HTML
// CREATED    : Jul-2026
//
// DESCRIPTION:
// - Second-generation "project added to the app" notification email builder.
// - Deliberately self-contained (no imports from the legacy 61__Feature__
//   ShareProjectLink generator) so the legacy link-share email system stays
//   fully separated and can be retired independently later.
// - The email contains NO direct project link — recipients are steered to the
//   installed ValeVision 3D PWA, with an install-guide help link in the footer.
//
// TOKENS     : __RECIPIENT_NAMES_HTML__, __PROJECT_META_HTML__,
//              __SPECIAL_NOTES_BLOCK__, __INSTALL_GUIDE_URL__
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Production URLs (GitHub Pages - NEVER relative)
    // ------------------------------------------------------------
    // Emails are opened in Outlook / mail clients far away from wherever the
    // send happened (often a localhost dev session), so every URL that leaves
    // the app inside an email MUST be the hardcoded production URL — exactly
    // like the GH-Pages logo URL in the template. Do not derive these from
    // window.location.
    // ------------------------------------------------------------
    const NA_APP_NOTIFICATION_INSTALL_GUIDE_URL = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/install-guide.html';   // <-- Production install guide page

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Template Cache
// -----------------------------------------------------------------------------

    let Na__Feature__AppNotificationEmail__TemplatePromise = null;

    // HELPER FUNCTION | Load Raw Template Text (Once)
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__LoadTemplateText() {
        if (!Na__Feature__AppNotificationEmail__TemplatePromise) {
            const templateUrl = new URL(
                './Na__Feature__AppNotificationEmail__NotificationEmail__Template__.html',
                import.meta.url
            );
            Na__Feature__AppNotificationEmail__TemplatePromise = fetch(templateUrl).then((response) => {
                if (!response.ok) {
                    throw new Error(`App notification email template fetch failed: ${response.status}`);
                }
                return response.text();
            });
        }
        return Na__Feature__AppNotificationEmail__TemplatePromise;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | HTML Escaping and Recipient Formatting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for HTML Body Context
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__EscapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape URL for HTML Attribute (href)
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__EscapeHref(url) {
        return Na__Feature__AppNotificationEmail__EscapeHtml(url).replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Join Escaped Recipient Fragments (Oxford-style last join)
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__JoinRecipientNamesHtml(escapedParts) {
        if (escapedParts.length === 0) return '';
        if (escapedParts.length === 1) return escapedParts[0];
        if (escapedParts.length === 2) {
            return `${escapedParts[0]} &amp; ${escapedParts[1]}`;
        }
        const head = escapedParts.slice(0, -1).join(', ');
        const tail = escapedParts[escapedParts.length - 1];
        return `${head} &amp; ${tail}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Greeting Line HTML
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__BuildRecipientGreetingHtml(recipientsRaw) {
        const parts = String(recipientsRaw || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const escaped = parts.map(Na__Feature__AppNotificationEmail__EscapeHtml);
        const inner = Na__Feature__AppNotificationEmail__JoinRecipientNamesHtml(escaped);
        return `Hi <strong>${inner}</strong>,`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Normalised Folder Id into Code and Name
    // ------------------------------------------------------------
    // Expects e.g. "2026/62775__Slater" → code 62775, name Slater
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__ParseProjectFolderDisplay(displayProjectId) {
        const raw = String(displayProjectId || '').trim();
        const tail = raw.includes('/') ? raw.split('/').pop() : raw;
        const segments = String(tail || '').split('__');
        const projectCode = (segments[0] || '').trim() || '—';
        const projectName = segments.length > 1
            ? segments.slice(1).join('__').trim() || '—'
            : '—';
        return { projectCode, projectName };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Project Code / Name Block HTML
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__BuildProjectMetaHtml(displayProjectId) {
        const { projectCode, projectName } = Na__Feature__AppNotificationEmail__ParseProjectFolderDisplay(displayProjectId);
        const codeEsc = Na__Feature__AppNotificationEmail__EscapeHtml(projectCode);
        const nameEsc = Na__Feature__AppNotificationEmail__EscapeHtml(projectName);
        return `
                                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 14px; color: #172b3a; font-size: 15px; line-height: 1.55; font-family: Arial, sans-serif;">
                                            <tr>
                                                <td style="font-weight: 700; padding: 0 0 5px 0; vertical-align: baseline; white-space: nowrap;">Project Code</td>
                                                <td style="padding: 0 0 5px 0; vertical-align: baseline; white-space: nowrap;">&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                                <td style="padding: 0 0 5px 0; vertical-align: baseline;">${codeEsc}</td>
                                            </tr>
                                            <tr>
                                                <td style="font-weight: 700; padding: 0; vertical-align: baseline; white-space: nowrap;">Project Name</td>
                                                <td style="padding: 0; vertical-align: baseline; white-space: nowrap;">&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                                <td style="padding: 0; vertical-align: baseline;">${nameEsc}</td>
                                            </tr>
                                        </table>`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Optional Special Notes Card (Inline Block)
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__BuildSpecialNotesBlock(specialNotesRaw) {
        const trimmed = String(specialNotesRaw || '').trim();
        if (!trimmed) return '';

        const bodyHtml = Na__Feature__AppNotificationEmail__EscapeHtml(trimmed).replace(/\r\n|\n|\r/g, '<br>');
        return `
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; margin: 0 0 14px;">
                                            <tr>
                                                <td style="border-left: 4px solid #172b3a; padding: 12px 16px 12px 18px; background-color: #f8fafb; font-family: Arial, sans-serif;">
                                                    <p style="margin: 0 0 8px; padding: 0; color: #172b3a; font-size: 13px; font-weight: 700; line-height: 1.4;">
                                                        Special notes
                                                    </p>
                                                    <p style="margin: 0; padding: 0; color: #172b3a; font-size: 14px; line-height: 1.55;">
                                                        ${bodyHtml}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve Absolute Install Guide URL (Production - Hardcoded)
    // ------------------------------------------------------------
    // Always returns the production GitHub Pages URL regardless of where the
    // email was sent from (localhost dev sessions included) — recipients must
    // never receive a localhost link.
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__BuildInstallGuideUrl() {
        return NA_APP_NOTIFICATION_INSTALL_GUIDE_URL;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Plain-Text Subject for Outbound Notification Emails
    // ------------------------------------------------------------
    // Example display id "2026/55164__Quinn" → "ValeVision3D App | New Project Added | Quinn - 55164"
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__BuildNotificationEmailSubject(displayProjectId) {
        const { projectCode, projectName } = Na__Feature__AppNotificationEmail__ParseProjectFolderDisplay(displayProjectId);
        return `ValeVision3D App | New Project Added | ${projectName} - ${projectCode}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Final Notification Email HTML from Inputs
    // ------------------------------------------------------------
    async function Na__Feature__AppNotificationEmail__BuildNotificationEmailHtml(options) {
        const {
            recipientsRaw,
            specialNotesRaw,
            displayProjectId
        } = options;

        const template = await Na__Feature__AppNotificationEmail__LoadTemplateText();
        const recipientNamesHtml = Na__Feature__AppNotificationEmail__BuildRecipientGreetingHtml(recipientsRaw);
        const projectMetaHtml = Na__Feature__AppNotificationEmail__BuildProjectMetaHtml(displayProjectId);
        const installGuideUrlAttr = Na__Feature__AppNotificationEmail__EscapeHref(Na__Feature__AppNotificationEmail__BuildInstallGuideUrl());
        const notesBlock = Na__Feature__AppNotificationEmail__BuildSpecialNotesBlock(specialNotesRaw);

        return template
            .replaceAll('__RECIPIENT_NAMES_HTML__', recipientNamesHtml)
            .replaceAll('__PROJECT_META_HTML__', projectMetaHtml)
            .replaceAll('__INSTALL_GUIDE_URL__', installGuideUrlAttr)
            .replaceAll('__SPECIAL_NOTES_BLOCK__', notesBlock);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__AppNotificationEmail__BuildNotificationEmailHtml,
        Na__Feature__AppNotificationEmail__BuildNotificationEmailSubject,
        Na__Feature__AppNotificationEmail__BuildInstallGuideUrl
    };

// endregion -------------------------------------------------------------------
