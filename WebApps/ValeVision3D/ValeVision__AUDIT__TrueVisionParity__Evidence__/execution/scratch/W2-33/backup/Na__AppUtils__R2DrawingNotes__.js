// =============================================================================
// VALEVISION3D - APP UTILS - R2 DRAWING NOTES
// =============================================================================
//
// FILE       : Na__AppUtils__R2DrawingNotes__.js
// NAMESPACE  : Na__AppUtils
// MODULE     : R2DrawingNotes
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Two-phase read/write for ValeVision__DrawingNotes__.json beside project.json
// CREATED    : 14-Sep-2026
//
// DESCRIPTION:
// - Sibling drawing-notes file at VaApps/Projects/{folderId}/{fileName} on R2
//   and Whitecardopedia/Projects/{folderId}/{fileName} on disk.
// - ReadCloud prefers a worker GET (fresh R2) when editor-config is available,
//   otherwise the public CDN. Production reads go through the CDN.
// - Write is two-phase like Na__AppUtils__R2SaveProjectJson__: worker POST then
//   Flask POST. Never throws.
// - ReadLocal is Flask GET on localhost only.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Sep-2026 - Version 1.0.0
// - Initial implementation for Layout Editor drawing notes.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader and Worker Config
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__NormalizeProjectFolderId,
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__R2BaseUrl_Fallback
    } from './Na__AppUtils__ProjectLoader.js';
    import { Na__AppUtils__R2FetchWorkerConfig } from './Na__AppUtils__R2SaveProjectJson__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Allowlisted Filename and Flask Suffix
    // ------------------------------------------------------------
    const Na__R2Notes__DEFAULT_FILE = 'ValeVision__DrawingNotes__.json';   // <-- Always this file on disk and R2
    const Na__R2Notes__FLASK_SUFFIX = 'drawing-notes';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Allowlisted Notes Filename
    // ------------------------------------------------------------
    function Na__R2Notes__FileName(fileName) {
        return (typeof fileName === 'string' && fileName.trim()) ? fileName.trim() : Na__R2Notes__DEFAULT_FILE;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Project Code and Folder Id for This Session
    // ------------------------------------------------------------
    function Na__R2Notes__Ids() {
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
        const folderId    = Na__AppUtils__NormalizeProjectFolderId(projectCode);
        return { projectCode : projectCode, folderId : folderId };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Flask Drawing-Notes URL (localhost)
    // ------------------------------------------------------------
    // Uses the year/folder id so /api/projects/2026/3047__Doous/drawing-notes
    // hits the same disk path as project.json, not a numeric-only folder.
    // ------------------------------------------------------------
    function Na__R2Notes__FlaskUrl(folderId) {
        return `${window.location.origin}/api/projects/${folderId}/${Na__R2Notes__FLASK_SUFFIX}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse a JSON Fetch: { ok, data, missing, error }
    // ------------------------------------------------------------
    async function Na__R2Notes__ParseJsonResponse(response) {
        if (response.status === 404 || response.status === 403) {
            let missing = true;
            try {
                const body = await response.json();
                if (body && body.missing === false) missing = false;
            } catch (e) { /* a 404 with no body is still missing */ }
            return { ok : true, data : null, missing : missing, error : null };
        }
        if (!response.ok) return { ok : false, data : null, missing : false, error : 'HTTP ' + response.status };
        try {
            const data = await response.json();
            return { ok : true, data : (data && typeof data === 'object') ? data : null, missing : false, error : null };
        } catch (error) {
            return { ok : false, data : null, missing : false, error : (error && error.message) || 'invalid JSON' };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | CDN URL for the Notes File
    // ------------------------------------------------------------
    function Na__R2Notes__CdnUrl(folderId, fileName) {
        const r2Base = Na__AppUtils__R2BaseUrl_Fallback || 'https://cdn.noble-architecture.com/VaApps/Projects';
        return `${r2Base}/${folderId}/${fileName}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Worker Drawing-Notes URL
    // ------------------------------------------------------------
    function Na__R2Notes__WorkerUrl(workerApiBaseUrl, folderId) {
        return `${workerApiBaseUrl}/projects/${encodeURIComponent(folderId)}/${Na__R2Notes__FLASK_SUFFIX}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | GET the Notes File from the Worker
    // ------------------------------------------------------------
    async function Na__R2Notes__WorkerGet(workerConfig, folderId) {
        const response = await fetch(Na__R2Notes__WorkerUrl(workerConfig.workerApiBaseUrl, folderId), {
            method  : 'GET',
            headers : { 'X-Editor-Api-Key' : workerConfig.apiKey },
            cache   : 'no-store'
        });
        return Na__R2Notes__ParseJsonResponse(response);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | GET the Notes File from the CDN
    // ------------------------------------------------------------
    async function Na__R2Notes__CdnGet(folderId, fileName) {
        try {
            const response = await fetch(Na__R2Notes__CdnUrl(folderId, fileName), { cache : 'no-store' });
            return Na__R2Notes__ParseJsonResponse(response);
        } catch (error) {
            return { ok : false, data : null, missing : false, error : (error && error.message) || 'CDN unreachable' };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | POST the Notes File to Flask (localhost mirror)
    // ------------------------------------------------------------
    async function Na__R2Notes__FlaskPost(folderId, dataObject) {
        const response = await fetch(Na__R2Notes__FlaskUrl(folderId), {
            method  : 'POST',
            headers : { 'Content-Type' : 'application/json' },
            body    : JSON.stringify(dataObject)
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Flask responded ${response.status}`);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Cloud Copy (worker GET when configured, else CDN)
    // ------------------------------------------------------------
    async function Na__R2Notes__ReadCloud(fileName) {
        const name = Na__R2Notes__FileName(fileName);
        const ids  = Na__R2Notes__Ids();
        if (!ids.folderId) return { ok : false, data : null, missing : false, error : 'no project folder in the URL' };

        try {
            const workerConfig = await Na__AppUtils__R2FetchWorkerConfig();
            if (workerConfig && workerConfig.workerApiBaseUrl && workerConfig.apiKey) {
                try {
                    return await Na__R2Notes__WorkerGet(workerConfig, ids.folderId);
                } catch (workerError) {
                    console.warn('[ValeVision3D] Drawing notes: worker GET failed, falling back to CDN:', (workerError && workerError.message) || workerError);
                }
            }
            return await Na__R2Notes__CdnGet(ids.folderId, name);
        } catch (error) {
            return { ok : false, data : null, missing : false, error : (error && error.message) || 'unreachable' };
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Two-Phase Write: Worker POST then Flask POST. Never throws.
    // ------------------------------------------------------------
    async function Na__R2Notes__Write(fileName, dataObject) {
        const ids = Na__R2Notes__Ids();
        if (!ids.folderId || !ids.projectCode) return { ok : false, localOk : false, error : 'no project folder in the URL' };
        if (!dataObject || typeof dataObject !== 'object') return { ok : false, localOk : false, error : 'notes data must be an object' };

        try {
            const workerConfig = await Na__AppUtils__R2FetchWorkerConfig();
            if (!workerConfig || !workerConfig.workerApiBaseUrl || !workerConfig.apiKey) {
                return { ok : false, localOk : false, error : 'Worker config unavailable' };
            }

            const response = await fetch(Na__R2Notes__WorkerUrl(workerConfig.workerApiBaseUrl, ids.folderId), {
                method  : 'POST',
                headers : {
                    'Content-Type'     : 'application/json',
                    'X-Editor-Api-Key' : workerConfig.apiKey
                },
                body    : JSON.stringify(dataObject)
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                return { ok : false, localOk : false, error : errorBody.error || `Worker responded ${response.status}` };
            }

            let localOk = true;
            try {
                await Na__R2Notes__FlaskPost(ids.folderId, dataObject);
            } catch (mirrorError) {
                localOk = false;
                console.warn('[ValeVision3D] Drawing notes: local Flask mirror failed after R2 write:', (mirrorError && mirrorError.message) || mirrorError);
            }
            return { ok : true, localOk : localOk, error : localOk ? null : 'Local mirror failed' };
        } catch (error) {
            return { ok : false, localOk : false, error : (error && error.message) || 'unreachable' };
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Write the Local Flask Copy Only (seed / adopt, never R2)
    // ------------------------------------------------------------
    async function Na__R2Notes__WriteLocal(dataObject) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return { ok : false, skipped : true, error : null };
        if (!dataObject || typeof dataObject !== 'object') return { ok : false, skipped : false, error : 'notes data must be an object' };
        const ids = Na__R2Notes__Ids();
        if (!ids.folderId) return { ok : false, skipped : false, error : 'no project folder in the URL' };
        try {
            await Na__R2Notes__FlaskPost(ids.folderId, dataObject);
            return { ok : true, skipped : false, error : null };
        } catch (error) {
            return { ok : false, skipped : false, error : (error && error.message) || 'Flask unreachable' };
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Local Flask Copy (localhost only)
    // ------------------------------------------------------------
    async function Na__R2Notes__ReadLocal(fileName) {
        void fileName;                                                          // <-- Flask always serves the allowlisted file
        if (!Na__AppUtils__IsRunningOnLocalhost()) return { ok : true, data : null, missing : true, error : null };
        const ids = Na__R2Notes__Ids();
        if (!ids.folderId) return { ok : false, data : null, missing : false, error : 'no project folder in the URL' };
        try {
            const response = await fetch(Na__R2Notes__FlaskUrl(ids.folderId), { cache : 'no-store' });
            return await Na__R2Notes__ParseJsonResponse(response);
        } catch (error) {
            return { ok : false, data : null, missing : false, error : (error && error.message) || 'Flask unreachable' };
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | R2 Drawing Notes API
    // ------------------------------------------------------------
    export {
        Na__R2Notes__ReadCloud,
        Na__R2Notes__Write,
        Na__R2Notes__WriteLocal,
        Na__R2Notes__ReadLocal
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
