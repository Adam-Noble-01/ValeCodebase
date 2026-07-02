// =============================================================================
// VALEVISION3D - APP NOTIFICATION EMAIL - PAYLOAD BUILDER
// =============================================================================
//
// FILE       : Na__Feature__AppNotificationEmail__PayloadBuilder__.js
// NAMESPACE  : Na__Feature__AppNotificationEmail
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build app-notification send payload from current project context
// CREATED    : Jul-2026
//
// DESCRIPTION:
// - Mirrors the legacy 62__Feature__EmailWorkers payload builder shape so the
//   same Cloudflare Worker /api/email/send endpoint handles both systems with
//   zero server-side changes (the worker just takes { to, subject, htmlBody }).
// - Only the share context (project id) is reused from the legacy stack; the
//   email HTML itself comes from the new notification generator.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__Feature__ShareProjectLink__GetShareContext } from '../61__Feature__ShareProjectLink/Na__Feature__ShareProjectLink__UrlGeneratorLogic__.js';
    import {
        Na__Feature__AppNotificationEmail__BuildNotificationEmailHtml,
        Na__Feature__AppNotificationEmail__BuildNotificationEmailSubject
    } from './Na__Feature__AppNotificationEmail__GenerateEmail__Logic__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Filename Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Sanitize Project Id Segment for Filename
    // ------------------------------------------------------------
    function Na__Feature__AppNotificationEmail__SanitizeFilenamePart(text) {
        return String(text || 'project')
            .replace(/[^\w\-]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .slice(0, 80) || 'project';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Build Notification Send Payload from Inputs and Share Context
    // ------------------------------------------------------------
    async function Na__Feature__AppNotificationEmail__BuildSendPayload(options) {
        const selectedRecipients = Array.isArray(options?.selectedRecipients) ? options.selectedRecipients : [];
        const notesRaw = String(options?.notesRaw || '');
        const recipientNamesRawOverride = String(options?.recipientNamesRawOverride || '').trim();

        const share = Na__Feature__ShareProjectLink__GetShareContext();
        if (!share.ok) {
            throw new Error('No project in URL (?project=...) - cannot send app notification.');
        }

        const recipientNamesCsv = selectedRecipients
            .map((item) => String(item?.name || item?.email || '').trim())
            .filter(Boolean)
            .join(', ');
        const greetingNamesRaw = recipientNamesRawOverride || recipientNamesCsv;

        const htmlBody = await Na__Feature__AppNotificationEmail__BuildNotificationEmailHtml({
            recipientsRaw    : greetingNamesRaw,
            specialNotesRaw  : notesRaw,
            displayProjectId : share.displayProjectId
        });
        const stamp = new Date().toISOString().slice(0, 10);
        const safeId = Na__Feature__AppNotificationEmail__SanitizeFilenamePart(share.displayProjectId);
        const downloadFilename = `ValeVision3D_AppNotification_${safeId}_${stamp}.html`;

        return {
            to              : selectedRecipients.map((item) => String(item?.email || '').trim()).filter(Boolean),
            subject         : Na__Feature__AppNotificationEmail__BuildNotificationEmailSubject(share.displayProjectId),
            htmlBody,
            downloadFilename,
            displayProjectId: share.displayProjectId,
            greetingNamesRaw,
            specialNotesRaw : notesRaw
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__AppNotificationEmail__BuildSendPayload
    };

// endregion -------------------------------------------------------------------
