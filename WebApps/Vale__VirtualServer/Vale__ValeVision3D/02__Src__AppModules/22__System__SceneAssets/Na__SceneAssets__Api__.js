// =============================================================================
// VALEVISION3D - PLACED ASSETS - THE SERVER'S FOUR ROUTES
// =============================================================================
//
// FILE       : Na__SceneAssets__Api__.js
// NAMESPACE  : Na__SceneApi
// MODULE     : System - Placed Assets
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Ask the server what staff are working on, save a window's changes, approve
//              what is waiting, and put someone's changes back
// CREATED    : 05-Nov-2026
//
// DESCRIPTION:
// - Adam, 05-Nov-2026: "Employees should be able to create entourage and foliage. So we need a
//   system and way of tracking ownership of those assets and changes, so who inserted what etc".
// - THE SERVER DECIDES EVERYTHING. What is an admin's, what waits and what a person may put back
//   are all decided in Server__Api/Api__ValeVision3D/ValeVision3D__Api__SceneAssets__Logic__.py.
//   This file only carries the words. Its header says why the record stays what clients read.
// - IT NEVER REJECTS. Every call resolves to { ok, error, ... }, as the local mirror's do, and a
//   refusal is the error's words for a toast.
// - STAFF ONLY. Nothing on a client's path imports this file, and the server refuses a client link.
//
// INTEGRATION:
// - Called by ../23__System__Entourage/02__Core__Data/Na__Entourage__SceneData__.js,
//   ../24__System__Vegetation/02__Core__Data/Na__Vegetation__SceneData__.js and
//   ./Na__SceneAssets__ChangesPanel__.js.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 05-Nov-2026 - Version 1.0.0 (ValeVision3D v2.89.0)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Where the API Is, and Which Project This Is
    // ------------------------------------------------------------
    import { Na__AppUtils__ApiUrl, Na__AppUtils__GetProjectFolderFromUrl } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Calls
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Route's Address, for the Open Project, or Null
    // ------------------------------------------------------------
    function Na__SceneApi__Url(route) {
        const folder = Na__AppUtils__GetProjectFolderFromUrl();
        return folder ? Na__AppUtils__ApiUrl('projects/' + encodeURIComponent(folder) + '/scene-assets/' + route) : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ask, and Say What Came Back. Never Rejects
    // ------------------------------------------------------------
    async function Na__SceneApi__Ask(url, options) {
        if (!url) return { ok : false, error : 'no project for this page' };
        try {
            const response = await fetch(url, Object.assign({ credentials : 'same-origin', cache : 'no-store' }, options));
            const answer   = await response.json().catch(() => null);
            if (response.ok && answer) return answer;
            if (response.status === 401) return { ok : false, status : 401, error : 'sign in to save (your session has ended)' };
            return { ok : false, status : response.status, error : (answer && answer.error) || 'the server refused (' + response.status + ')' };
        } catch (error) {
            return { ok : false, error : 'the server did not answer (' + ((error && error.message) || 'no answer') + ')' };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Send a Body
    // ------------------------------------------------------------
    function Na__SceneApi__Post(route, body) {
        return Na__SceneApi__Ask(Na__SceneApi__Url(route), {
            method  : 'POST',
            headers : { 'Content-Type' : 'application/json' },
            body    : JSON.stringify(body)
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | What Staff Work On, and Who Did What
    // ------------------------------------------------------------
    // system: 'Entourage' or 'Vegetation'. Resolves to { ok, object, summary, me, isAdmin }.
    // object is null on a project with nothing yet.
    // ------------------------------------------------------------
    function Na__SceneApi__ReadWorking(system) {
        const url = Na__SceneApi__Url('working');
        return Na__SceneApi__Ask(url ? url + '?system=' + encodeURIComponent(system) : null, {});
    }
    // ------------------------------------------------------------


    // FUNCTION | Save This Window's Changes
    // ------------------------------------------------------------
    // base: the object as this window read it. object: as it is now. The server finds what
    // changed between the two, so somebody else's work since is never overwritten.
    // Resolves to { ok, object, summary, counts, renamed, approvedNow }.
    // ------------------------------------------------------------
    function Na__SceneApi__Save(system, base, object) {
        return Na__SceneApi__Post('save', { system, base, object });
    }
    // ------------------------------------------------------------


    // FUNCTION | Approve What Is Waiting: Everyone's, or One Person's
    // ------------------------------------------------------------
    function Na__SceneApi__Approve(system, byCode) {
        return Na__SceneApi__Post('approve', { system, by : byCode || '' });
    }
    // ------------------------------------------------------------


    // FUNCTION | Put Someone's Changes Back: Your Own, or Anyone's for an Admin
    // ------------------------------------------------------------
    // Resolves to { ok, object, summary, restored, leftAlone }.
    // ------------------------------------------------------------
    function Na__SceneApi__Revert(system, ofCode) {
        return Na__SceneApi__Post('revert', { system, of : ofCode || '' });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Placed Assets API
    // ------------------------------------------------------------
    export {
        Na__SceneApi__ReadWorking,
        Na__SceneApi__Save,
        Na__SceneApi__Approve,
        Na__SceneApi__Revert
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
