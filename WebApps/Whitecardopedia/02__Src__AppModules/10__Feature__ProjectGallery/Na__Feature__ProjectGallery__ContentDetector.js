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
// - Detects if project contains 3D model content (ValeVision GLB models)
// - Used by gallery view to display content indicator icons
// - Provides consistent content detection logic across application
//
// 18-Aug-2026: the legacy sketchUpModel URL check was removed. ValeVision3D
// GLB models are now the only source of 3D content. See DEVLOG v0.6.15.
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
        
        return checkValeVisionModelUrl(projectData);                        // <-- ValeVision GLB models are the only 3D source
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Check if ValeVision Model URL is Valid
    // ---------------------------------------------------------------
    // Checks multiple project.json formats in priority order:
    // v4: valeVision_ModelUrls (array) - preferred new format
    // v3: valeVision_ModelUrl_BaseMesh / _Linework (separate fields)
    // v2: valeVision_ModelUrl (array) - legacy array format
    // v1: valeVision_ModelUrl (string) - legacy single URL format
    // ---------------------------------------------------------------
    function checkValeVisionModelUrl(projectData) {
        if (!projectData) return false;                                     // <-- Guard against null/undefined
        
        // V4 FORMAT | New multi-model array (preferred)
        // ---------------------------------------------------------------
        if (Array.isArray(projectData.valeVision_ModelUrls) && projectData.valeVision_ModelUrls.length > 0) {
            return true;                                                    // <-- Return true if v4 array has items
        }
        // ---------------------------------------------------------------
        
        // V3 FORMAT | Layered BaseMesh + Linework pair
        // ---------------------------------------------------------------
        const baseMeshUrl  = projectData.valeVision_ModelUrl_BaseMesh || null;  // <-- Get base mesh URL
        const lineworkUrl  = projectData.valeVision_ModelUrl_Linework || null;  // <-- Get linework URL
        if (baseMeshUrl || lineworkUrl) {
            const hasBase = typeof baseMeshUrl === 'string' && baseMeshUrl.length > 0;      // <-- Check base mesh URL
            const hasLinework = typeof lineworkUrl === 'string' && lineworkUrl.length > 0;  // <-- Check linework URL
            if (hasBase || hasLinework) {
                return true;                                                // <-- Return true if any v3 URL exists
            }
        }
        // ---------------------------------------------------------------
        
        // V2/V1 FORMAT | Legacy single URL (array or string)
        // ---------------------------------------------------------------
        const url = projectData.valeVision_ModelUrl;                        // <-- Get legacy ValeVision model URL
        if (!url) return false;                                             // <-- Return false if no URL
        
        if (Array.isArray(url)) {
            return url.length > 0;                                          // <-- Check v2 array has items
        }
        
        return typeof url === 'string' && url.length > 0;                   // <-- Check v1 string is not empty
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------


// endregion -------------------------------------------------------------------

