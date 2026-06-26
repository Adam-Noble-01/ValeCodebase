// =============================================================================
// VALEVISION3D - APP UTILS - R2 SAVE PROJECT JSON
// =============================================================================
//
// FILE       : Na__AppUtils__R2SaveProjectJson__.js
// NAMESPACE  : Na__AppUtils
// MODULE     : R2SaveProjectJson
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Shared two-phase R2-first save utility for all Dev menu save functions
// CREATED    : 26-Jun-2026
//
// DESCRIPTION:
// - Encapsulates the two-phase save contract used by all ValeVision3D Dev menu
//   modules that write to project.json.
// - Phase 1 (SSOT): Writes to R2 via the Cloudflare Worker whitecardopedia-editor-api.
//   Uses the full folderId resolved from the master index via
//   Na__AppUtils__NormalizeProjectFolderId so the R2 key is always correct.
// - Phase 2 (Mirror): Writes to local disk via Flask /api/projects/{projectCode}.
//   Only runs if Phase 1 succeeds. Failure is non-fatal (R2 is the SSOT).
// - Worker config (URL + API key) is fetched from Flask GET /api/editor-config
//   on first call, then cached in a module-level variable.
//
// SINGLE CONSUMER RULE:
// - All Dev menu save functions in ValeVision3D MUST route through this utility.
// - Do NOT re-implement the two-phase pattern inline in individual save files.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 26-Jun-2026 - Version 1.1.0
// - Added green success toast after Phase 1 R2 write.
// - Changed Phase 2 mirror failure toast to isError=true (red) — requires attention.
//
// 26-Jun-2026 - Version 1.0.0
// - Initial implementation.
// - Replaces the GET-merge-POST-to-Flask pattern in:
//   Na__UiFeature__NavigationModes__DevControls.js
//   Na__FogPlaneSystem__SaveSettings.js
//   Na__UiFeature__SaveCameraSettings.js
//   Na__UiFeature__OrbitMaxDistance__DevControls.js
//   Na__UiFeature__RenderEngine__DevControls.js
//   Na__GridLineSystem__UiElement.js
//   Na__PresentationMode__DevMenu__SceneEditor.js
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__NormalizeProjectFolderId
    } from './Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State — Cached Worker Config
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Worker Config Cache
    // ------------------------------------------------------------
    let Na__R2Save__CachedWorkerConfig    = null;    // <-- { workerApiBaseUrl, apiKey } once fetched
    let Na__R2Save__ConfigFetchPromise    = null;    // <-- In-flight fetch promise (prevents duplicate requests)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Worker Config Loader
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Worker Config from Flask (Lazy, Memoised)
    // ------------------------------------------------------------
    async function na_fetch_worker_config() {
        if (Na__R2Save__CachedWorkerConfig) {
            return Na__R2Save__CachedWorkerConfig;                           // <-- Return cached config
        }

        if (Na__R2Save__ConfigFetchPromise) {
            return Na__R2Save__ConfigFetchPromise;                           // <-- Return in-flight promise
        }

        Na__R2Save__ConfigFetchPromise = (async () => {
            try {
                const response = await fetch(`${window.location.origin}/api/editor-config`);
                if (!response.ok) {
                    console.warn('[R2Save] Worker config endpoint returned', response.status);
                    return null;                                             // <-- Not fatal; caller checks for null
                }
                const config = await response.json();
                if (!config.workerApiBaseUrl || !config.apiKey) {
                    console.warn('[R2Save] Worker config missing required fields.');
                    return null;
                }
                Na__R2Save__CachedWorkerConfig = config;                     // <-- Cache for all subsequent callers
                return config;
            } catch (err) {
                console.warn('[R2Save] Could not fetch worker config:', err.message);
                return null;
            } finally {
                Na__R2Save__ConfigFetchPromise = null;                       // <-- Clear in-flight promise on settle
            }
        })();

        return Na__R2Save__ConfigFetchPromise;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save Phases
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Phase 1 — Write to R2 via Worker (SSOT)
    // ------------------------------------------------------------
    async function na_phase1_write_to_r2(workerApiBaseUrl, apiKey, folderId, projectData) {
        const encodedFolderId = encodeURIComponent(folderId);                // <-- Encode folderId slashes for URL path
        const workerUrl       = `${workerApiBaseUrl}/projects/${encodedFolderId}`;

        const response = await fetch(workerUrl, {
            method  : 'POST',
            headers : {
                'Content-Type'     : 'application/json',
                'X-Editor-Api-Key' : apiKey                                  // <-- Worker auth header
            },
            body    : JSON.stringify(projectData)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Worker responded ${response.status}`);
        }

        return await response.json();                                        // <-- Return Worker success payload
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Phase 2 — Mirror to Local Disk via Flask (Best-Effort)
    // ------------------------------------------------------------
    async function na_phase2_mirror_to_local(projectCode, projectData) {
        const response = await fetch(`${window.location.origin}/api/projects/${projectCode}`, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify(projectData)
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

    // FUNCTION | R2-First Two-Phase Save for Dev Menu Functions
    // ------------------------------------------------------------
    // Callers pass projectData (already merged by the caller) and projectCode
    // (from Na__AppUtils__GetProjectCodeFromUrl or a known project code string).
    // The full folderId for the R2 key is resolved internally from the master index.
    //
    // Returns: { r2Success: boolean, localSuccess: boolean }
    // Throws:  Only on Phase 1 (R2) failure — Phase 2 failure is non-fatal.
    // ------------------------------------------------------------
    async function Na__AppUtils__R2SaveProjectJson(projectData, projectCode, showToast) {
        const toast = showToast || (() => {});

        // RESOLVE FULL FOLDER ID FOR R2 KEY
        const folderId = Na__AppUtils__NormalizeProjectFolderId(projectCode); // <-- e.g. '2026/63592__Bressard-Kayode'
        if (!folderId) {
            throw new Error(`Could not resolve folderId for projectCode: ${projectCode}`);
        }

        // FETCH WORKER CONFIG (LAZY, CACHED)
        const workerConfig = await na_fetch_worker_config();
        if (!workerConfig) {
            throw new Error('Worker config unavailable — check Flask is running and Token__CloudflareAPI.env has EDITOR_WORKER_URL and EDITOR_API_KEY.');
        }

        // PHASE 1 | R2 WRITE (SSOT — must succeed before Phase 2)
        await na_phase1_write_to_r2(
            workerConfig.workerApiBaseUrl,
            workerConfig.apiKey,
            folderId,
            projectData
        );
        toast('Saved to R2 ✓', false);                                       // <-- GREEN: R2 write confirmed

        // PHASE 2 | LOCAL MIRROR (best-effort, non-fatal on failure)
        let localSuccess = true;
        try {
            await na_phase2_mirror_to_local(projectCode, projectData);
        } catch (mirrorError) {
            localSuccess = false;
            console.warn('[R2Save] Local mirror failed after R2 write:', mirrorError.message);
            toast('Local mirror failed — restart Flask to resync', true);    // <-- RED: needs attention
        }

        return { r2Success: true, localSuccess };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | R2 Save Utility API
    // ------------------------------------------------------------
    export {
        Na__AppUtils__R2SaveProjectJson
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
