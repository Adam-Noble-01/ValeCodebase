// =============================================================================
// WHITECARDOPEDIA - LOCALHOST DETECTOR UTILITY
// =============================================================================
//
// FILE       : localhostDetector.js
// NAMESPACE  : Whitecardopedia
// MODULE     : LocalhostDetector
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Detect if application is running on localhost with Flask server
// CREATED    : 2025
//
// DESCRIPTION:
// - Utility for detecting localhost environment
// - Pings Flask API to confirm localhost server is running
// - Enables/disables Project Editor tool based on environment
// - Provides user feedback for static web version
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Localhost Detection Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Check If Running on Localhost with Flask Server
    // ------------------------------------------------------------
    async function isLocalhost() {
        try {
            const response = await fetch('/api/check-localhost');           // <-- Ping Flask API endpoint
            
            if (!response.ok) {
                return false;                                               // <-- Server not responding
            }
            
            const data = await response.json();                             // <-- Parse JSON response
            return data.isLocalhost === true;                               // <-- Return localhost status
            
        } catch (error) {
            console.log('Not running on localhost:', error);               // <-- Log detection failure
            return false;                                                   // <-- Default to false
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Show Alert for Static Web Version
    // ------------------------------------------------------------
    function showLocalhostRequiredAlert() {
        alert(
            'OI! You Need To Run On Local Host To Edit Project Details' + '\n' +
            'This tool is NOT yet available in the Web Version'
        );                                                                  // <-- Display alert message
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

