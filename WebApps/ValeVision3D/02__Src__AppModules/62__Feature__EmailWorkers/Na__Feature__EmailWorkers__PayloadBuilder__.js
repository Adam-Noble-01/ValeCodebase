// =============================================================================
// VALEVISION3D - EMAIL WORKERS - PAYLOAD BUILDER
// =============================================================================
//
// FILE       : Na__Feature__EmailWorkers__PayloadBuilder__.js
// NAMESPACE  : Na__Feature__EmailWorkers
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build send-email payload from current project share context
// CREATED    : 09-Apr-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__Feature__ShareProjectLink__GetShareContext } from '../61__Feature__ShareProjectLink/Na__Feature__ShareProjectLink__UrlGeneratorLogic__.js';
    import { Na__Feature__ShareProjectLink__BuildEmailHtml } from '../61__Feature__ShareProjectLink/Na__Feature__ShareProjectLink__GenerateEmail__Logic__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Subject Builder
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Default Email Subject for Project
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__BuildEmailSubject(displayProjectId) {
        const safeProjectId = String(displayProjectId || 'Project').trim();
        return `ValeVision3D Share - ${safeProjectId}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sanitize Project Id Segment for Filename
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__SanitizeFilenamePart(text) {
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

    // FUNCTION | Build Send Payload from Inputs and Share Context
    // ------------------------------------------------------------
    async function Na__Feature__EmailWorkers__BuildSendPayload(options) {
        const selectedRecipients = Array.isArray(options?.selectedRecipients) ? options.selectedRecipients : [];
        const notesRaw = String(options?.notesRaw || '');
        const recipientNamesRawOverride = String(options?.recipientNamesRawOverride || '').trim();

        const share = Na__Feature__ShareProjectLink__GetShareContext();
        if (!share.ok) {
            throw new Error('No project in URL (?project=...) - cannot send email.');
        }

        const recipientNamesCsv = selectedRecipients
            .map((item) => String(item?.name || item?.email || '').trim())
            .filter(Boolean)
            .join(', ');
        const greetingNamesRaw = recipientNamesRawOverride || recipientNamesCsv;

        const htmlBody = await Na__Feature__ShareProjectLink__BuildEmailHtml({
            recipientsRaw    : greetingNamesRaw,
            specialNotesRaw  : notesRaw,
            displayProjectId : share.displayProjectId,
            projectUrl       : share.projectUrl
        });
        const stamp = new Date().toISOString().slice(0, 10);
        const safeId = Na__Feature__EmailWorkers__SanitizeFilenamePart(share.displayProjectId);
        const downloadFilename = `ValeVision3D_Share_${safeId}_${stamp}.html`;

        return {
            to              : selectedRecipients.map((item) => String(item?.email || '').trim()).filter(Boolean),
            subject         : Na__Feature__EmailWorkers__BuildEmailSubject(share.displayProjectId),
            htmlBody,
            downloadFilename,
            projectUrl      : share.projectUrl,
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
        Na__Feature__EmailWorkers__BuildSendPayload
    };

// endregion -------------------------------------------------------------------
