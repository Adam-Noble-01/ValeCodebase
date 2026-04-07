// =============================================================================
// WHITECARDOPEDIA - GALLERY VIEW IMAGE EFFECTS
// =============================================================================
//
// FILE       : GalleryView__ImageEffects.js
// NAMESPACE  : Whitecardopedia
// MODULE     : GalleryView__ImageEffects
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Image effect utilities for gallery preview thumbnails
// CREATED    : 2025
//
// DESCRIPTION:
// - Determines appropriate image effects based on project input type
// - Applies white overlay to Hand Drawn Concept projects (reduces starkness)
// - Applies contrast boost to CAD File projects (enhances clarity)
// - Returns CSS class names for styling in gallery thumbnails
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Image Effect Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Effect Configuration Values
    // ------------------------------------------------------------
    const IMAGE_EFFECT_CONFIG = {
        HAND_DRAWN_OVERLAY_OPACITY  : 0.30,                              // <-- 30% white overlay opacity
        CAD_CONTRAST_BOOST          : 1.20,                              // <-- 20% contrast boost (120% total)
        INPUT_TYPE_HAND_DRAWN       : 'Hand Drawn Concept',              // <-- Hand drawn input type string
        INPUT_TYPE_CAD              : 'CAD File',                        // <-- CAD file input type string
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Image Effect Detection Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Determine if Project Uses Hand Drawn Input
    // ------------------------------------------------------------
    function isHandDrawnProject(projectData) {
        const inputType = projectData?.productionData?.input;            // <-- Get input type from project data
        return inputType === IMAGE_EFFECT_CONFIG.INPUT_TYPE_HAND_DRAWN;  // <-- Check if hand drawn
    }
    // ---------------------------------------------------------------


    // FUNCTION | Determine if Project Uses CAD Input
    // ------------------------------------------------------------
    function isCadProject(projectData) {
        const inputType = projectData?.productionData?.input;            // <-- Get input type from project data
        return inputType === IMAGE_EFFECT_CONFIG.INPUT_TYPE_CAD;         // <-- Check if CAD file
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Image Effect CSS Class for Project
    // ------------------------------------------------------------
    function getImageEffectClass(projectData) {
        if (!projectData) {
            return '';                                                   // <-- Return empty string if no data
        }
        
        if (isHandDrawnProject(projectData)) {
            return 'gallery-image--hand-drawn';                          // <-- Hand drawn effect class
        }
        
        if (isCadProject(projectData)) {
            return 'gallery-image--cad';                                 // <-- CAD effect class
        }
        
        return '';                                                       // <-- No effect class for other types
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

