// =============================================================================
// VALEVISION3D - APP UTILS - SAVE PROJECT JSON
// =============================================================================
//
// FILE       : Na__AppUtils__SaveProjectJson__.js
// NAMESPACE  : Na__AppUtils
// MODULE     : SaveProjectJson
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The one save every Dev menu uses to write the project record to the server
// CREATED    : 06-Oct-2026
//
// DESCRIPTION:
// - The Dev menus (camera, orbit distance, navigation modes, render engine,
//   fog, grid, cross section, Video Studio, presentation scenes) read the
//   record fresh from the server (Na__AppUtils__ProjectRecordUrl), change their
//   own keys, and hand the whole record here. It is POSTed to the ValeVision 3D
//   API, which keeps the copy it replaces as a revision in the project's
//   ProjectData__Revisions folder.
// - ONE WRITE. This replaces Na__AppUtils__R2SaveProjectJson__.js, whose
//   Worker-then-Flask two phases ended with R2 on 06-Oct-2026.
// - Needs a signed-in user at the authoring level (the same people who see
//   the Dev Tools menu); the server checks it on every save.
//
// SINGLE CONSUMER RULE:
// - Every Dev menu save of the project record goes through this utility.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 1.0.0
// - Replaces the R2-first two-phase save (Na__AppUtils__R2SaveProjectJson__ 1.2.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The API's Address
    // ------------------------------------------------------------
    import { Na__AppUtils__ApiUrl } from './Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Where a Project's Record Is Read From and Saved To
    // ------------------------------------------------------------
    function Na__AppUtils__ProjectRecordUrl(projectCode) {
        return Na__AppUtils__ApiUrl(`projects/${String(projectCode).split('/').map(encodeURIComponent).join('/')}`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Whole Project Record to the Server
    // ------------------------------------------------------------
    // projectData: the record as the caller read it fresh, with its own keys
    // changed. Resolves { ok: true, rev } and shows a green toast; THROWS with
    // the server's words when the save is refused, so a caller's catch says so.
    // ------------------------------------------------------------
    async function Na__AppUtils__SaveProjectJson(projectData, projectCode, showToast) {
        const toast = showToast || (() => {});
        if (!projectCode) throw new Error('No project loaded.');

        const response = await fetch(Na__AppUtils__ProjectRecordUrl(projectCode), {
            method      : 'POST',
            credentials : 'same-origin',
            headers     : { 'Content-Type' : 'application/json' },
            body        : JSON.stringify(projectData)
        });
        const answer = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 401) throw new Error('Sign in to save.');
            throw new Error(answer.error || `The server refused the save (HTTP ${response.status}).`);
        }
        toast('Saved to the server ✓', false);
        return { ok : true, rev : answer.rev };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Save Utility API
    // ------------------------------------------------------------
    export {
        Na__AppUtils__SaveProjectJson,
        Na__AppUtils__ProjectRecordUrl
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
