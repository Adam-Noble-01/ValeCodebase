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
// PROJECT DATA FETCHING | Load Project JSON
// --------------------------------------------------------

// FUNCTION | FetchProjectJson - Load project.json from Whitecardopedia
// --------------------------------------------------------
async function fetchProjectJson(projectCode) {
    const projectJsonUrl = `../Whitecardopedia/Projects/2025/${projectCode}/project.json`;  // <-- Build relative path to project.json
    
    try {
        console.log(`[Dynamic Loader] Fetching project data for: ${projectCode}`);
        console.log(`[Dynamic Loader] URL: ${projectJsonUrl}`);
        
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
// MODEL URL EXTRACTION | Get Model URL from Project Data
// --------------------------------------------------------

// FUNCTION | GetModelUrl - Extract model URL from project.json
// --------------------------------------------------------
function getModelUrl(projectJson) {
    const modelUrl = projectJson.valeVision_ModelUrl;                 // <-- Get model URL field
    
    if (!modelUrl) {
        throw new Error('No valeVision_ModelUrl found in project.json');  // <-- Handle missing URL
    }
    
    if (Array.isArray(modelUrl)) {
        console.log(`[Dynamic Loader] Multiple model URLs found, using first: ${modelUrl[0]}`);
        return modelUrl[0];                                           // <-- Use first model if multiple
    }
    
    console.log(`[Dynamic Loader] Model URL: ${modelUrl}`);
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

