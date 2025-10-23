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


    // FUNCTION | Parse Image Filename to Extract Details
    // ------------------------------------------------------------
    function parseImageFileName(filename) {
        const artPattern = /^IMG(\d{2})_ART(\d{2})__/;                   // <-- Pattern for ART images
        const normalPattern = /^IMG(\d{2})__/;                           // <-- Pattern for normal images
        
        const artMatch = filename.match(artPattern);                     // <-- Check for ART pattern
        if (artMatch) {
            return {
                imageNumber : artMatch[1],                               // <-- Image number (01, 02, etc.)
                artCode     : artMatch[2],                               // <-- ART code (00, 05, 10, 20)
                isArtImage  : true                                       // <-- Flag as ART image
            };
        }
        
        const normalMatch = filename.match(normalPattern);               // <-- Check for normal pattern
        if (normalMatch) {
            return {
                imageNumber : normalMatch[1],                            // <-- Image number
                artCode     : null,                                      // <-- No ART code
                isArtImage  : false                                      // <-- Flag as normal image
            };
        }
        
        return null;                                                     // <-- Return null if no match
    }
    // ---------------------------------------------------------------

    // -----------------------------------------------------------------------------
    // REGION | ART Image Loading Functions
    // -----------------------------------------------------------------------------

    // FUNCTION | Get ART Code Label Description
    // ------------------------------------------------------------
    function getArtCodeLabel(artCode) {
        const ART_CODE_LABELS = {
            '00' : 'Preliminary Sketch',                                 // <-- ART00 label
            '05' : '2D CAD Drafting',                                    // <-- ART05 label
            '10' : 'Hand Drawn Technical Pen Linework',                  // <-- ART10 label
            '20' : 'Hand Drawn Watercolour Painting'                     // <-- ART20 label
        };
        
        return ART_CODE_LABELS[artCode] || 'Artistic Rendering';         // <-- Return label or default
    }
    // ---------------------------------------------------------------


    // FUNCTION | Find All Possible ART Image Pairs for Whitecard Image
    // ------------------------------------------------------------
    function findArtPairForImage(projectData, whitecardImage) {
        const parsed = parseImageFileName(whitecardImage);               // <-- Parse whitecard filename
        
        if (!parsed || parsed.isArtImage) {
            return [];                                                   // <-- Return empty array if invalid or ART image
        }
        
        // CHECK IF FILENAME CONTAINS __Whitecard PATTERN
        if (!whitecardImage.includes('__Whitecard.')) {
            console.log(`[ART Detection] No __Whitecard pattern found in: ${whitecardImage}`);  // <-- Debug log
            return [];                                                   // <-- Return empty array
        }
        
        const imageNumber = parsed.imageNumber;                          // <-- Get image number
        const candidates = [];                                           // <-- Initialize candidates array
        
        // DEFINE ART CODE MAPPINGS (code to descriptor in filename)
        const artCodeMappings = {
            '20' : 'Watercolour',                                        // <-- ART20 watercolour descriptor
            '10' : 'TechnicalPen',                                       // <-- ART10 technical pen descriptor
            '05' : 'CAD',                                                // <-- ART05 CAD descriptor
            '00' : 'Sketch'                                              // <-- ART00 sketch descriptor
        };
        
        // BUILD ALL POSSIBLE ART CANDIDATES
        for (const [artCode, descriptor] of Object.entries(artCodeMappings)) {
            // CONSTRUCT ART FILENAME
            // Pattern: IMG01__Harris__Scheme-01__Whitecard.png
            // Becomes: IMG01_ART20__Harris__Scheme-01__Watercolour.png
            const artFilename = whitecardImage
                .replace(/^(IMG\d{2})__/, `$1_ART${artCode}__`)          // <-- Insert ART code after IMG##
                .replace(/__Whitecard\./, `__${descriptor}.`);           // <-- Replace Whitecard with descriptor
            
            console.log(`[ART Detection] Creating candidate: ${artFilename}`);  // <-- Debug log
            
            candidates.push({
                filename : artFilename,                                  // <-- ART filename
                artCode  : artCode,                                      // <-- ART code
                label    : getArtCodeLabel(artCode),                     // <-- ART label
                url      : `${projectData.basePath}/${artFilename}`      // <-- Full ART image URL
            });
        }
        
        console.log(`[ART Detection] Found ${candidates.length} candidates for: ${whitecardImage}`);  // <-- Debug log
        return candidates;                                               // <-- Return all candidates for testing
    }
    // ---------------------------------------------------------------

    // endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------

