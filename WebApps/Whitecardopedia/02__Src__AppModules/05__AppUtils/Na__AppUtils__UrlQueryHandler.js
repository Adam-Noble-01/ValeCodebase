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
// - Also provides a "reopen editor after reload" flag used by the Project
//   Editor's auto clear-cache-and-reload flow, since a full page reload
//   cannot otherwise survive in the app's in-memory view-routing state
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2025 - Version 1.0.0
// - Initial implementation.
//
// 08-Jul-2026 - Version 1.1.0
// - Added na_set_reopen_editor_flag / na_get_and_clear_reopen_editor_flag so
//   a full page reload (triggered after a successful Project Editor save)
//   can land back on the Editor's selection view instead of the main gallery.
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


    // FUNCTION | Set a Flag to Re-Open the Project Editor After the Next Reload
    // ------------------------------------------------------------
    // A full page reload resets all in-memory React view state back to its
    // default (the main gallery) — there is no existing persistence for the
    // Editor/Time Analysis tool views. This stamps a query param onto the
    // CURRENT URL (preserving any other params) via replaceState, which
    // survives a reload and is untouched by any localStorage/sessionStorage/
    // Cache Storage purge, so the app can detect it on boot and navigate
    // straight back to the editor instead of the gallery.
    // ------------------------------------------------------------
    function na_set_reopen_editor_flag() {
        const url = new URL(window.location.href);                      // <-- Parse current URL
        url.searchParams.set('reopenEditor', '1');                      // <-- Stamp the flag, preserving other params
        window.history.replaceState({}, '', url.toString());            // <-- Update in place, no new history entry
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get and Clear the Re-Open Editor Flag
    // ------------------------------------------------------------
    // Returns true exactly once per reload when na_set_reopen_editor_flag()
    // was called before the reload, then strips the param from the URL so a
    // later manual refresh of the same tab doesn't re-trigger it.
    // ------------------------------------------------------------
    function na_get_and_clear_reopen_editor_flag() {
        const url  = new URL(window.location.href);
        const flag = url.searchParams.get('reopenEditor') === '1';       // <-- Check for the flag
        if (flag) {
            url.searchParams.delete('reopenEditor');                    // <-- Strip so a manual refresh won't re-trigger
            window.history.replaceState({}, '', url.toString());
        }
        return flag;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

