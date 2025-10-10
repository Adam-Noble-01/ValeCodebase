// =============================================================================
// WHITECARDOPEDIA - PROJECT LOADER UTILITY
// =============================================================================
//
// FILE       : projectLoader.js
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectLoader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dynamic project data loading utility
// CREATED    : 2025
//
// DESCRIPTION:
// - Utility functions for loading project data from folder structure
// - Reads masterConfig.json for project index
// - Loads individual project.json files for project metadata
// - Handles image path resolution for project galleries
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Project Loading Functions
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Project Loading State
    // ------------------------------------------------------------
    const PROJECT_LOADER_CONFIG = {
        masterConfigPath    : 'src/data/masterConfig.json',              // <-- Master configuration file path
        projectBasePath     : 'Projects/2025',                           // <-- Base path for projects
    };
    // ------------------------------------------------------------


    // FUNCTION | Load Master Configuration
    // ------------------------------------------------------------
    async function loadMasterConfig() {
        try {
            const response = await fetch(PROJECT_LOADER_CONFIG.masterConfigPath);  // <-- Fetch master config
            
            if (!response.ok) {
                throw new Error('Failed to load master configuration');  // <-- Handle fetch error
            }
            
            const config = await response.json();                        // <-- Parse JSON response
            return config;                                               // <-- Return configuration object
            
        } catch (error) {
            console.error('Error loading master config:', error);        // <-- Log error
            return null;                                                 // <-- Return null on error
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load Individual Project Data
    // ------------------------------------------------------------
    async function loadProjectData(folderId) {
        const projectPath = `${PROJECT_LOADER_CONFIG.projectBasePath}/${folderId}`;  // <-- Construct project path
        
        try {
            const response = await fetch(`${projectPath}/project.json`);  // <-- Fetch project metadata
            
            if (!response.ok) {
                throw new Error(`Failed to load project: ${folderId}`);  // <-- Handle fetch error
            }
            
            const projectData = await response.json();                   // <-- Parse JSON response
            projectData.folderId = folderId;                             // <-- Add folder ID to data
            projectData.basePath = projectPath;                          // <-- Add base path to data
            
            return projectData;                                          // <-- Return project data object
            
        } catch (error) {
            console.error(`Error loading project ${folderId}:`, error);  // <-- Log error
            return null;                                                 // <-- Return null on error
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load All Projects from Master Config
    // ------------------------------------------------------------
    async function loadAllProjects() {
        const masterConfig = await loadMasterConfig();                   // <-- Load master configuration
        
        if (!masterConfig || !masterConfig.projects) {
            return [];                                                   // <-- Return empty array on error
        }
        
        const projectPromises = masterConfig.projects
            .filter(project => project.enabled)                          // <-- Filter enabled projects only
            .map(project => loadProjectData(project.folderId));          // <-- Map to load promises
        
        const projects = await Promise.all(projectPromises);             // <-- Wait for all projects to load
        
        return projects.filter(project => project !== null);             // <-- Filter out failed loads
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Image URL for Project
    // ------------------------------------------------------------
    function getImageUrl(projectData, imageName) {
        return `${projectData.basePath}/${imageName}`;                   // <-- Construct full image URL
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Thumbnail Image for Project
    // ------------------------------------------------------------
    function getThumbnailImage(projectData) {
        if (!projectData.images || projectData.images.length === 0) {
            return null;                                                 // <-- Return null if no images
        }
        
        return getImageUrl(projectData, projectData.images[0]);          // <-- Return first image as thumbnail
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

