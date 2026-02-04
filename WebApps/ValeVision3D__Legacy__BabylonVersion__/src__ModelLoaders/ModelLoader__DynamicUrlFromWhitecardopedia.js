// =============================================================================
// VALEVISION3D - DYNAMIC MODEL LOADER FROM WHITECARDOPEDIA
// =============================================================================
//
// FILE       : ModelLoader__DynamicUrlFromWhitecardopedia.js
// NAMESPACE  : ValeVision3D
// MODULE     : Dynamic Model Loader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load models dynamically based on Whitecardopedia project data
// CREATED    : 2025
//
// DESCRIPTION:
// - Parses URL parameters to get project code from Whitecardopedia
// - Fetches project.json from Whitecardopedia relative path
// - Extracts valeVision_ModelUrl from project data
// - Loads model using existing GLB loader function
// - Handles multiple model URLs (uses first one)
// - Provides error handling and fallback support
//
// =============================================================================

// #Region ------------------------------------------------
// URL PARAMETER PARSING | Extract Project Information
// --------------------------------------------------------

// FUNCTION | GetProjectCodeFromUrl - Extract project code from URL parameter
// --------------------------------------------------------
function getProjectCodeFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);   // <-- Parse URL query string
    return urlParams.get('project');                                  // <-- Get 'project' parameter value
}
// --------------------------------------------------------

// #endregion ---------------------------------------------

// #Region ------------------------------------------------
// ENVIRONMENT DETECTION | Detect Localhost vs Static Deployment
// --------------------------------------------------------

// FUNCTION | IsRunningOnLocalhost - Detect if running on Flask development server
// --------------------------------------------------------
function isRunningOnLocalhost() {
    const hostname = window.location.hostname;                        // <-- Get current hostname
    const port = window.location.port;                                // <-- Get current port
    
    // CHECK FOR LOCALHOST INDICATORS
    const isLocalhost = hostname === 'localhost' ||                   // <-- Check for localhost
                        hostname === '127.0.0.1' ||                   // <-- Check for 127.0.0.1
                        port === '8000';                              // <-- Check for Flask port
    
    console.log(`[Dynamic Loader] Environment: ${isLocalhost ? 'Localhost (Flask)' : 'Static (GitHub Pages)'}`);
    return isLocalhost;                                               // <-- Return detection result
}
// --------------------------------------------------------

// #endregion ---------------------------------------------

// #Region ------------------------------------------------
// PROJECT DATA FETCHING | Load Project JSON
// --------------------------------------------------------

// FUNCTION | FetchProjectJson - Load project.json from Whitecardopedia
// --------------------------------------------------------
async function fetchProjectJson(projectCode) {
    try {
        console.log(`[Dynamic Loader] Fetching project data for: ${projectCode}`);
        
        // DETERMINE URL BASED ON ENVIRONMENT
        let projectJsonUrl;
        
        if (isRunningOnLocalhost()) {
            // LOCALHOST MODE - Use Flask API endpoint
            projectJsonUrl = `http://localhost:8000/api/projects/${projectCode}`;  // <-- API endpoint
            console.log(`[Dynamic Loader] Using API endpoint: ${projectJsonUrl}`);
        } else {
            // STATIC MODE - Use relative file path
            projectJsonUrl = `../Whitecardopedia/Projects/2025/${projectCode}/project.json`;  // <-- Relative path
            console.log(`[Dynamic Loader] Using relative path: ${projectJsonUrl}`);
        }
        
        const response = await fetch(projectJsonUrl);                 // <-- Fetch project.json
        
        if (!response.ok) {
            throw new Error(`Failed to fetch project.json: ${response.status} ${response.statusText}`);  // <-- Handle HTTP errors
        }
        
        const projectData = await response.json();                    // <-- Parse JSON response
        console.log(`[Dynamic Loader] Project data loaded:`, projectData);
        
        return projectData;                                           // <-- Return parsed project data
        
    } catch (error) {
        console.error(`[Dynamic Loader] Error fetching project.json:`, error);
        throw error;                                                  // <-- Rethrow for upstream handling
    }
}
// --------------------------------------------------------

// #endregion ---------------------------------------------

// #Region ------------------------------------------------
// VERSION PARSING | Extract and Compare Semantic Versions
// --------------------------------------------------------

// HELPER FUNCTION | ParseVersionFromUrl - Extract version number from URL
// --------------------------------------------------------
function parseVersionFromUrl(url) {
    const versionMatch = url.match(/__(\d+)\.(\d+)\.(\d+)__\.glb$/);  // <-- Match version pattern
    if (versionMatch) {
        return {
            major: parseInt(versionMatch[1]),                         // <-- Major version
            minor: parseInt(versionMatch[2]),                         // <-- Minor version
            patch: parseInt(versionMatch[3]),                         // <-- Patch version
            string: `${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}`  // <-- Full version string
        };
    }
    return null;                                                      // <-- No version found
}
// --------------------------------------------------------


// HELPER FUNCTION | CompareVersions - Compare two semantic versions
// --------------------------------------------------------
function compareVersions(v1, v2) {
    if (v1.major !== v2.major) return v1.major - v2.major;           // <-- Compare major version
    if (v1.minor !== v2.minor) return v1.minor - v2.minor;           // <-- Compare minor version
    return v1.patch - v2.patch;                                       // <-- Compare patch version
}
// --------------------------------------------------------


// FUNCTION | GetLatestVersionUrl - Select latest version from array of URLs
// --------------------------------------------------------
function getLatestVersionUrl(urlArray) {
    if (!Array.isArray(urlArray) || urlArray.length === 0) {
        return null;                                                  // <-- Invalid array
    }
    
    if (urlArray.length === 1) {
        return urlArray[0];                                           // <-- Single URL, return it
    }
    
    let latestUrl = urlArray[0];                                      // <-- Start with first URL
    let latestVersion = parseVersionFromUrl(latestUrl);               // <-- Parse first version
    
    // ITERATE THROUGH ALL URLs TO FIND LATEST
    for (let i = 1; i < urlArray.length; i++) {
        const currentUrl = urlArray[i];                               // <-- Current URL
        const currentVersion = parseVersionFromUrl(currentUrl);       // <-- Parse current version
        
        if (currentVersion && latestVersion) {
            if (compareVersions(currentVersion, latestVersion) > 0) { // <-- Current is newer
                latestUrl = currentUrl;                               // <-- Update latest URL
                latestVersion = currentVersion;                       // <-- Update latest version
            }
        }
    }
    
    console.log(`[Dynamic Loader] Latest version selected: ${latestVersion?.string || 'unknown'}`);
    return latestUrl;                                                 // <-- Return latest version URL
}
// --------------------------------------------------------

// #endregion ---------------------------------------------

// #Region ------------------------------------------------
// MODEL URL EXTRACTION | Get Model URL from Project Data
// --------------------------------------------------------

// FUNCTION | GetModelUrl - Extract model URL from project.json with version selection
// --------------------------------------------------------
function getModelUrl(projectJson) {
    const modelUrl = projectJson.valeVision_ModelUrl;                 // <-- Get model URL field
    
    if (!modelUrl) {
        throw new Error('No valeVision_ModelUrl found in project.json');  // <-- Handle missing URL
    }
    
    if (Array.isArray(modelUrl)) {
        console.log(`[Dynamic Loader] Multiple model URLs found (${modelUrl.length}), selecting latest version...`);
        const latestUrl = getLatestVersionUrl(modelUrl);              // <-- Get latest version
        console.log(`[Dynamic Loader] Selected URL: ${latestUrl}`);
        return latestUrl;                                             // <-- Return latest version
    }
    
    console.log(`[Dynamic Loader] Single model URL: ${modelUrl}`);
    return modelUrl;                                                  // <-- Return single URL
}
// --------------------------------------------------------

// #endregion ---------------------------------------------

// #Region ------------------------------------------------
// DYNAMIC MODEL LOADING | Main Orchestration Function
// --------------------------------------------------------

// FUNCTION | LoadModelDynamically - Main dynamic loading orchestration
// --------------------------------------------------------
async function loadModelDynamically(projectCode) {
    try {
        console.log(`[Dynamic Loader] Starting dynamic model load for project: ${projectCode}`);
        
        // FETCH PROJECT DATA
        const projectData = await fetchProjectJson(projectCode);      // <-- Load project.json
        
        // EXTRACT MODEL URL
        const modelUrl = getModelUrl(projectData);                    // <-- Get model URL
        
        // VALIDATE URL
        if (!modelUrl || typeof modelUrl !== 'string' || modelUrl.length === 0) {
            throw new Error('Invalid model URL extracted from project data');  // <-- Validate URL
        }
        
        // LOAD MODEL USING EXISTING GLB LOADER
        console.log(`[Dynamic Loader] Loading model from CDN: ${modelUrl}`);
        await loadGLBModel(modelUrl);                                 // <-- Call existing loader with URL
        
        console.log(`[Dynamic Loader] Model loaded successfully`);
        return true;                                                  // <-- Return success
        
    } catch (error) {
        console.error(`[Dynamic Loader] Failed to load model dynamically:`, error);
        throw error;                                                  // <-- Rethrow for upstream handling
    }
}
// --------------------------------------------------------

// #endregion ---------------------------------------------

// #Region ------------------------------------------------
// NOTES | Usage Instructions
// --------------------------------------------------------

// USAGE:
// This dynamic loader is called by the main orchestration script when
// a URL parameter '?project=<code>' is detected.
//
// Example URL:
// ValeVision3D/index.html?project=VE-61058__Staley
//
// The loader will:
// 1. Extract 'VE-61058__Staley' from URL
// 2. Fetch ../Whitecardopedia/Projects/2025/VE-61058__Staley/project.json
// 3. Extract valeVision_ModelUrl field
// 4. Pass URL to loadGLBModel() function
// 5. Model loads and renders in scene
//
// Error Handling:
// - If project.json not found → Falls back to basic loader
// - If valeVision_ModelUrl is null → Throws error, triggers fallback
// - If model URL fails to load → Error handled by loadGLBModel()
//
// #endregion ---------------------------------------------

