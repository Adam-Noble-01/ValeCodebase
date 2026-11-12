// =============================================================================
// VALEVISION GALLERY - GALLERY VIEW IMAGE EFFECTS
// =============================================================================
//
// FILE       : GalleryView__ImageEffects.js
// NAMESPACE  : ValeVision Gallery
// MODULE     : GalleryView__ImageEffects
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Image effect utilities for gallery preview thumbnails
// CREATED    : 2025
//
// DESCRIPTION:
// - Determines appropriate image effects based on project input type
// - Applies white overlay to Hand Drawn Concept projects (reduces starkness),
//   only once the job is finished and more than 3 months old (11-Nov-2026):
//   ongoing jobs and recent ones show their thumbnail clean
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
        HAND_DRAWN_OVERLAY_MIN_AGE_MONTHS : 3,                           // <-- Overlay only on jobs older than this
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


    // FUNCTION | Determine if a Hand Drawn Project Gets the White Overlay
    // ------------------------------------------------------------
    // Ongoing jobs (no delivered date yet) and jobs whose latest schedule date
    // is within the last 3 months show their thumbnail clean (Adam, 11-Nov-2026).
    function shouldShowHandDrawnOverlay(projectData) {
        if (!isHandDrawnProject(projectData)) {
            return false;                                                // <-- Not hand drawn: never
        }
        const schedule  = projectData?.scheduleData || {};
        const fulfilled = parseProjectDate(schedule.dateFulfilled);      // <-- Null while ongoing
        if (!fulfilled) {
            return false;                                                // <-- Ongoing job: no overlay
        }
        const received  = parseProjectDate(schedule.dateReceived);
        const latest    = (received && received > fulfilled) ? received : fulfilled;
        const cutoff    = new Date();
        cutoff.setHours(0, 0, 0, 0);
        cutoff.setMonth(cutoff.getMonth() - IMAGE_EFFECT_CONFIG.HAND_DRAWN_OVERLAY_MIN_AGE_MONTHS);
        return latest < cutoff;                                          // <-- Older than 3 months: overlay
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

