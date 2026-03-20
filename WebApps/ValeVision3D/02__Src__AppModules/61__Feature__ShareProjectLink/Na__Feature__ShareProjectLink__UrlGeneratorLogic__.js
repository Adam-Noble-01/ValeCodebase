// =============================================================================
// VALEVISION3D - SHARE PROJECT LINK - URL GENERATOR
// =============================================================================
//
// FILE       : Na__Feature__ShareProjectLink__UrlGeneratorLogic__.js
// NAMESPACE  : Na__Feature__ShareProjectLink
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build absolute ValeVision3D share URLs from ?project= state
// CREATED    : Mar-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import {
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__NormalizeProjectFolderId
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Share URL Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Share URL for Current App Origin and Path
    // ------------------------------------------------------------
    function Na__Feature__ShareProjectLink__BuildProjectUrl(rawProjectCode) {
        const base = new URL(window.location.href);
        base.search = '';
        base.hash = '';
        const params = new URLSearchParams();
        params.set('project', rawProjectCode);
        base.search = params.toString();
        return base.toString();
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Share Context from Current Page (or Missing State)
    // ------------------------------------------------------------
    function Na__Feature__ShareProjectLink__GetShareContext() {
        const rawProjectCode = Na__AppUtils__GetProjectCodeFromUrl();
        if (!rawProjectCode || !String(rawProjectCode).trim()) {
            return {
                ok           : false,
                reason       : 'no_project',
                rawProjectCode : null,
                displayProjectId : null,
                projectUrl   : null
            };
        }
        const trimmed = String(rawProjectCode).trim();
        const displayProjectId = Na__AppUtils__NormalizeProjectFolderId(trimmed) || trimmed;
        const projectUrl = Na__Feature__ShareProjectLink__BuildProjectUrl(trimmed);
        return {
            ok               : true,
            reason           : null,
            rawProjectCode   : trimmed,
            displayProjectId,
            projectUrl
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__ShareProjectLink__BuildProjectUrl,
        Na__Feature__ShareProjectLink__GetShareContext
    };

// endregion -------------------------------------------------------------------
