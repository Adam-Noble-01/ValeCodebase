// =============================================================================
// WHITECARDOPEDIA - PROJECT CONTENT DETECTOR
// =============================================================================
//
// FILE       : projectContentDetector.js
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectContentDetector
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Detect content types available for projects (watercolor, 3D models)
// CREATED    : 2025
//
// DESCRIPTION:
// - Detects if project contains watercolor artwork (ART20 images)
// - Detects if project contains 3D model content (SketchUp or ValeVision)
// - Used by gallery view to display content indicator icons
// - Provides consistent content detection logic across application
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Content Detection Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Check if Project Contains Watercolor Artwork
    // ------------------------------------------------------------
    function hasWatercolorContent(projectData) {
        if (!projectData || !projectData.allImages) return false;           // <-- Check if project data and images exist
        if (!Array.isArray(projectData.allImages)) return false;            // <-- Ensure allImages is an array
        
        return projectData.allImages.some(imageName => {
            return imageName && imageName.includes('_ART20__');             // <-- Check for ART20 watercolor images
        });
    }
    // ---------------------------------------------------------------


    // FUNCTION | Check if Project Contains 3D Model Content
    // ------------------------------------------------------------
    function has3DModelContent(projectData) {
        if (!projectData) return false;                                     // <-- Check if project data exists
        
        // SUB CHECK | Check ValeVision Model URL
        // ---------------------------------------------------------------
        const hasValeVisionModel = checkValeVisionModelUrl(projectData);    // <-- Check for ValeVision GLB model
        if (hasValeVisionModel) return true;                                // <-- Return true if ValeVision model exists
        // ---------------------------------------------------------------
        
        // SUB CHECK | Check SketchUp Model URL
        // ---------------------------------------------------------------
        const hasSketchUpModel = checkSketchUpModelUrl(projectData);        // <-- Check for SketchUp model link
        if (hasSketchUpModel) return true;                                  // <-- Return true if SketchUp model exists
        // ---------------------------------------------------------------
        
        return false;                                                       // <-- No 3D model content found
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Check if ValeVision Model URL is Valid
    // ---------------------------------------------------------------
    function checkValeVisionModelUrl(projectData) {
        const url = projectData.valeVision_ModelUrl;                        // <-- Get ValeVision model URL
        if (!url) return false;                                             // <-- Return false if no URL
        
        if (Array.isArray(url)) {
            return url.length > 0;                                          // <-- Check array has items
        }
        
        return typeof url === 'string' && url.length > 0;                   // <-- Check string is not empty
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Check if SketchUp Model URL is Valid
    // ---------------------------------------------------------------
    function checkSketchUpModelUrl(projectData) {
        const sketchUpModel = projectData.sketchUpModel;                    // <-- Get SketchUp model object
        if (!sketchUpModel || !sketchUpModel.url) return false;             // <-- Check if SketchUp model and URL exist
        
        const url = sketchUpModel.url;                                      // <-- Get URL string
        if (typeof url !== 'string') return false;                          // <-- Ensure URL is a string
        
        const invalidValues = ['nil', 'none', 'false', 'n/a'];              // <-- Invalid placeholder values
        const normalizedUrl = url.toLowerCase().trim();                     // <-- Normalize URL for comparison
        
        return !invalidValues.includes(normalizedUrl);                      // <-- Exclude invalid placeholder values
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

