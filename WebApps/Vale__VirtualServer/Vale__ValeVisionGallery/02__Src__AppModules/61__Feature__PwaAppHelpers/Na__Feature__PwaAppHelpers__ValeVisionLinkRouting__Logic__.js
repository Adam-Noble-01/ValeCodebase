// =============================================================================
// VALEVISION GALLERY - PWA APP HELPERS - VALEVISION LINK ROUTING LOGIC
// =============================================================================
//
// FILE       : Na__Feature__PwaAppHelpers__ValeVisionLinkRouting__Logic__.js
// NAMESPACE  : ValeVision Gallery
// MODULE     : Na__Feature__PwaAppHelpers__ValeVisionLinkRouting
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Route ValeVision links through in-app navigation policy
// CREATED    : 2026
//
// DESCRIPTION:
// - Builds ValeVision project URLs from ValeVision Gallery project context
// - Routes clicks via same-client navigation to avoid fresh browser windows
// - Exposes global helper API for React components and UI overlays
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | ValeVision 3D Link Routing Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | ValeVision 3D URL for a Project
    // ------------------------------------------------------------
    // Same origin, same URL on this PC's dev server and on the app server:
    // /valevision/?project=<library project id> (the folder name, e.g.
    // 64135__Washington), the id ValeVision 3D reads.
    // ------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__BuildValeVisionProjectUrl(projectId) {
        const safeId = encodeURIComponent(String(projectId || '').trim());
        return safeId ? `/valevision/?project=${safeId}` : null;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Open a Project in ValeVision 3D (same window)
    // ------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__NavigateToValeVisionProject(projectData) {
        const targetUrl = Na__Feature__PwaAppHelpers__BuildValeVisionProjectUrl(projectData && projectData.folderId);
        if (!targetUrl) return false;
        window.location.assign(targetUrl);
        return true;
    }
    // ---------------------------------------------------------------

    window.Na__Feature__PwaAppHelpers__ValeVisionLinkRouting = {
        buildValeVisionProjectUrl   : Na__Feature__PwaAppHelpers__BuildValeVisionProjectUrl,
        navigateToValeVisionProject : Na__Feature__PwaAppHelpers__NavigateToValeVisionProject
    };

// endregion -------------------------------------------------------------------
