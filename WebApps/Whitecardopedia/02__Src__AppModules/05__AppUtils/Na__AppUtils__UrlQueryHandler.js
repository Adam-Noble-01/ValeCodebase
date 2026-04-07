// =============================================================================
// WHITECARDOPEDIA - URL QUERY HANDLER UTILITY
// =============================================================================
//
// FILE       : urlQueryHandler.js
// NAMESPACE  : Whitecardopedia
// MODULE     : URLQueryHandler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : URL query parameter management for project sharing
// CREATED    : 2025
//
// DESCRIPTION:
// - Handles URL query parameters for direct project linking
// - Enables sharing specific projects via URL (?id=12345)
// - Manages browser history for proper back/forward navigation
// - Compatible with static GitHub Pages hosting
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | URL Query Parameter Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Get Project ID from URL Query String
    // ------------------------------------------------------------
    function getProjectIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);  // <-- Parse URL query string
        const projectId = urlParams.get('id');                          // <-- Extract 'id' parameter
        return projectId;                                               // <-- Return project ID or null
    }
    // ---------------------------------------------------------------


    // FUNCTION | Generate Sharing Link for Project
    // ------------------------------------------------------------
    function generateSharingLink(projectCode) {
        const baseUrl = window.location.origin + window.location.pathname;  // <-- Get base URL without query
        return `${baseUrl}?id=${projectCode}`;                          // <-- Build full sharing URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Update Browser URL with Project ID
    // ------------------------------------------------------------
    function updateUrlWithProjectId(projectCode) {
        const newUrl = generateSharingLink(projectCode);                // <-- Generate new URL
        window.history.pushState({ projectCode }, '', newUrl);          // <-- Update URL without reload
    }
    // ---------------------------------------------------------------


    // FUNCTION | Clear Project ID from URL
    // ------------------------------------------------------------
    function clearProjectIdFromUrl() {
        const baseUrl = window.location.origin + window.location.pathname;  // <-- Get base URL
        window.history.pushState({}, '', baseUrl);                      // <-- Remove query parameters
    }
    // ---------------------------------------------------------------


    // FUNCTION | Copy Sharing Link to Clipboard
    // ------------------------------------------------------------
    async function copyShareLinkToClipboard(projectCode) {
        const shareUrl = generateSharingLink(projectCode);              // <-- Generate sharing URL
        
        try {
            await navigator.clipboard.writeText(shareUrl);              // <-- Copy to clipboard
            return { success: true, url: shareUrl };                    // <-- Return success status
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);       // <-- Log error
            return { success: false, url: shareUrl, error };            // <-- Return failure status
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

