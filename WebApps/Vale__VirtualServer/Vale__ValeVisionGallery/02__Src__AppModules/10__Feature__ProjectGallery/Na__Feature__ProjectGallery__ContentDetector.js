// =============================================================================
// VALEVISION GALLERY - PROJECT CONTENT DETECTOR
// =============================================================================
//
// FILE       : projectContentDetector.js
// NAMESPACE  : ValeVision Gallery
// MODULE     : ProjectContentDetector
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Detect content types available for projects (watercolor, 3D models, videos)
// CREATED    : 2025
//
// DESCRIPTION:
// - Detects if project contains watercolor artwork (ART20 images)
// - Detects if project contains 3D model content (ValeVision GLB models)
// - Detects if project has ValeVision Theia videos (videoCount from the Gallery API)
// - Used by gallery view to display content indicator icons
// - Provides consistent content detection logic across application
//
// 18-Aug-2026: the legacy sketchUpModel URL check was removed. ValeVision3D
// GLB models are now the only source of 3D content. See DEVLOG v0.6.15.
//
// 07-Oct-2026: hasVideoContent() for ValeVision Theia. The Gallery API puts
// videoCount on every project record (the videos staff can watch in Theia).
//
// 30-Oct-2026: canUseAura() and canOpenAura() for ValeVision AURA, the pen and
// wash drawings app: Managers and App Admins only for now (Adam: employees must
// not see it yet).
//
// 30-Oct-2026 (later): projects are switched on for AURA one by one, in the
// Project Editor (auraEnabled; Adam: "Make all projects NOT available for Aura
// unless I enable in the project form per project"). canOpenAura() needs the
// switch and the level, on the card and the project page alike; the switch
// replaces the card's old 3D model test.
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


    // FUNCTION | Check if Project Has ValeVision Theia Videos
    // ------------------------------------------------------------
    function hasVideoContent(projectData) {
        return !!projectData && Number(projectData.videoCount) > 0;         // <-- From the Gallery API (ValeShared__TheiaVideo__)
    }
    // ---------------------------------------------------------------


    // FUNCTION | May This Person Use ValeVision AURA? (Managers and App Admins only, for now)
    // ------------------------------------------------------------
    // The shared sign-in's HasLevel('Management') passes AppAdmin and Management
    // and refuses Employee and Affiliate. AURA and its API check again: hiding the
    // link is not the lock.
    // ------------------------------------------------------------
    function canUseAura() {
        return !!(window.ValeUserLogin && typeof window.ValeUserLogin.HasLevel === 'function' && window.ValeUserLogin.HasLevel('Management'));
    }
    // ---------------------------------------------------------------


    // FUNCTION | Is This Project Switched On for ValeVision AURA? (the Project Editor's tick box)
    // ------------------------------------------------------------
    // auraEnabled comes from the Gallery API on every record; a project that
    // was never ticked has it false. AURA's API refuses the others too.
    // ------------------------------------------------------------
    function isSwitchedOnForAura(projectData) {
        return !!projectData && projectData.auraEnabled === true;
    }

    function canOpenAura(projectData) {
        return canUseAura() && isSwitchedOnForAura(projectData);            // <-- Switched on in the Project Editor, and a Manager or App Admin looking
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

