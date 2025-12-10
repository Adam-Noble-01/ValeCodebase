// =============================================================================
// WHITECARDOPEDIA - PROJECT URL HELPER UTILITY
// =============================================================================
//
// FILE       : projectUrlHelper.js
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectUrlHelper
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : URL generation and parsing utilities for deep linking
// CREATED    : 2025
//
// DESCRIPTION:
// - Utility functions for building and parsing project URLs
// - Supports year-based URL structure (projects2025/55876)
// - Browser history API integration for seamless navigation
// - Shareable URL generation with base domain detection
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | URL Building Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Build Project URL Path
    // ------------------------------------------------------------
    function buildProjectUrl(projectCode, year = '2025') {
        return `projects${year}/${projectCode}`;                          // <-- Construct URL path
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Current Base URL
    // ------------------------------------------------------------
    function getBaseUrl() {
        const { protocol, hostname, port, pathname } = window.location;   // <-- Destructure location
        
        // CONSTRUCT BASE URL WITH PORT IF NON-STANDARD
        let base = `${protocol}//${hostname}`;                            // <-- Start with protocol and hostname
        
        if (port && port !== '80' && port !== '443') {
            base += `:${port}`;                                           // <-- Add port if non-standard
        }
        
        // ADD BASE PATH (for GitHub Pages subdirectories)
        const pathParts = pathname.split('/').filter(p => p);             // <-- Split and filter empty
        
        // CHECK IF WE'RE IN A SUBDIRECTORY (e.g., /ValeCodebase/WebApps/Whitecardopedia)
        if (pathParts.length > 0) {
            // DETECT GITHUB PAGES PATTERN
            if (hostname.includes('github.io')) {
                // INCLUDE REPO AND SUBDIRECTORY PATH
                const basePath = pathParts.slice(0, -1).join('/');        // <-- Remove last segment (e.g., projects2025)
                if (basePath) {
                    base += `/${basePath}`;                               // <-- Add base path
                }
            } else {
                // LOCAL OR CUSTOM DOMAIN - Use directory structure
                const basePath = pathParts.slice(0, -1).join('/');        // <-- Remove last segment
                if (basePath) {
                    base += `/${basePath}`;                               // <-- Add base path
                }
            }
        }
        
        return base;                                                      // <-- Return base URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Shareable Full URL
    // ------------------------------------------------------------
    function getShareableUrl(projectCode, year = '2025') {
        const baseUrl = getBaseUrl();                                     // <-- Get base URL
        const projectPath = buildProjectUrl(projectCode, year);           // <-- Build project path
        return `${baseUrl}/${projectPath}`;                               // <-- Combine into full URL
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | URL Parsing Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Parse Project URL from Current Location
    // ------------------------------------------------------------
    function parseProjectUrl(url = window.location.pathname) {
        // PATTERN: /projects2025/55876 or /ValeCodebase/WebApps/Whitecardopedia/projects2025/55876
        const pattern = /projects(\d{4})\/(\d+)/;                         // <-- Match pattern
        const match = url.match(pattern);                                 // <-- Extract matches
        
        if (match) {
            return {
                year        : match[1],                                   // <-- Extracted year (2025)
                projectCode : match[2],                                   // <-- Extracted project code (55876)
                isValid     : true                                        // <-- Valid project URL
            };
        }
        
        return {
            year        : null,                                           // <-- No year found
            projectCode : null,                                           // <-- No code found
            isValid     : false                                           // <-- Invalid project URL
        };
    }
    // ---------------------------------------------------------------


    // FUNCTION | Check if Current URL is Project Deep Link
    // ------------------------------------------------------------
    function isProjectDeepLink() {
        const parsed = parseProjectUrl();                                 // <-- Parse current URL
        return parsed.isValid;                                            // <-- Return validity flag
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Browser History API Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Update Browser URL Without Page Reload
    // ------------------------------------------------------------
    function updateBrowserUrl(projectCode, year = '2025', title = 'Whitecardopedia') {
        const projectPath = buildProjectUrl(projectCode, year);           // <-- Build project path
        const baseUrl = getBaseUrl();                                     // <-- Get base URL
        const fullPath = `${baseUrl}/${projectPath}`;                     // <-- Construct full path
        
        // GET RELATIVE PATH FOR HISTORY API
        const relativePath = `/${projectPath}`;                           // <-- Relative path from base
        
        window.history.pushState(
            { projectCode, year },                                        // <-- State object
            title,                                                        // <-- Page title
            relativePath                                                  // <-- URL path
        );
    }
    // ---------------------------------------------------------------


    // FUNCTION | Navigate to Gallery View
    // ------------------------------------------------------------
    function navigateToGallery() {
        const baseUrl = getBaseUrl();                                     // <-- Get base URL
        
        window.history.pushState(
            { view: 'gallery' },                                          // <-- State object
            'Whitecardopedia - Project Gallery',                          // <-- Page title
            '/'                                                           // <-- Root path
        );
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Current URL State
    // ------------------------------------------------------------
    function getCurrentUrlState() {
        return window.history.state || {};                                // <-- Return current state or empty object
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Validation Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Validate Project Code Format
    // ------------------------------------------------------------
    function isValidProjectCode(projectCode) {
        // PROJECT CODE SHOULD BE NUMERIC (e.g., "55876", "61557")
        return /^\d+$/.test(projectCode);                                 // <-- Test numeric pattern
    }
    // ---------------------------------------------------------------


    // FUNCTION | Validate Year Format
    // ------------------------------------------------------------
    function isValidYear(year) {
        // YEAR SHOULD BE 4 DIGITS (e.g., "2025", "2026")
        const yearNum = parseInt(year, 10);                               // <-- Parse as integer
        return /^\d{4}$/.test(year) && yearNum >= 2025 && yearNum <= 2050;  // <-- Valid range
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

