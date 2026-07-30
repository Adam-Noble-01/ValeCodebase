/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | SCALE MANAGER
   =============================================================================

   FILE       : VghLantern__DrawingEditor__ScaleManager__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - ScaleManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Resolve the drawing scale for a sheet and convert model mm to paper mm
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Owns the drawing scale for the active sheet: the selected denominator, the
     available denominators, and the conversion between model millimetres and paper
     millimetres.
   - Picks a best-fit denominator from the configured list given the model extents
     of every view and the paper space each frame has to work in.
   - Formats the scale label exactly as it should read in the titleblock.

   -----------------------------------------------------------------------------

   WHY ONE SCALE FOR THE WHOLE SHEET:
   A Vale drawing quotes a single scale. Fitting each frame to its own best scale
   would produce a sheet where the plan and the elevation are at different scales
   with one number in the titleblock, which is worse than a slightly small view.
   Config can turn that off per project type, but the default is uniform.

   WHY DENOMINATORS RATHER THAN A FREE FACTOR:
   Joinery staff read drawings with a scale rule. 1:23.7 is unusable even if it fits
   the frame perfectly, so the fit routine only ever chooses from the standard list.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Scale Manager Module
// =============================================================================

const VghLantern__DrawingEditor__ScaleManager = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallbacks Used Only Before Config Resolves
    // ------------------------------------------------------------
    const FALLBACK_DENOMINATORS  =  [10, 20, 50, 100];
    const FALLBACK_PREFERRED     =  20;
    const FALLBACK_PADDING       =  1.08;
    const FALLBACK_LABEL_PREFIX  =  'Scale 1:';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Active Scale State
    // ------------------------------------------------------------
    let VghLantern__ScaleManager__ActiveDenominator  =  null;                 // <-- Null means "not yet resolved"; first read seeds from config
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Drawing Editor Scale Config Block
    // ------------------------------------------------------------
    function VghLantern__ScaleManager__ScaleConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        return drawingCfg['VghLantern__DrawingEditor__Config__Scales'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Sorted List of Available Denominators
    // ------------------------------------------------------------
    // Sorted ascending so the fit routine can walk from finest to coarsest and stop
    // at the first that fits, which is by definition the largest drawn view.
    function VghLantern__ScaleManager__Denominators() {
        var scaleCfg  =  VghLantern__ScaleManager__ScaleConfig();
        var list      =  scaleCfg.AvailableScaleDenominators;

        if (!Array.isArray(list) || !list.length) return FALLBACK_DENOMINATORS.slice();

        return list.slice().sort(function(a, b) { return a - b; });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scale Selection
// -----------------------------------------------------------------------------

    // FUNCTION | Get the Active Scale Denominator
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ScaleManager__GetDenominator() {
        if (VghLantern__ScaleManager__ActiveDenominator !== null) return VghLantern__ScaleManager__ActiveDenominator;

        var scaleCfg   =  VghLantern__ScaleManager__ScaleConfig();
        var preferred  =  scaleCfg.PreferredScaleDenominator;

        VghLantern__ScaleManager__ActiveDenominator  =  (typeof preferred === 'number' && preferred > 0)
            ? preferred
            : FALLBACK_PREFERRED;

        return VghLantern__ScaleManager__ActiveDenominator;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Active Scale Denominator
    // ------------------------------------------------------------
    // Silently ignores a denominator not on the configured list, so a stale value
    // from a saved project can never put the sheet on an unreadable scale.
    function VghLantern__DrawingEditor__ScaleManager__SetDenominator(denominator) {
        var parsed  =  parseFloat(denominator);
        if (isNaN(parsed) || parsed <= 0) return VghLantern__DrawingEditor__ScaleManager__GetDenominator();

        var available  =  VghLantern__ScaleManager__Denominators();
        if (available.indexOf(parsed) === -1) return VghLantern__DrawingEditor__ScaleManager__GetDenominator();

        VghLantern__ScaleManager__ActiveDenominator  =  parsed;
        return VghLantern__ScaleManager__ActiveDenominator;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Selectable Scale Denominators
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ScaleManager__ListDenominators() {
        return VghLantern__ScaleManager__Denominators();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fitting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Test Whether One Extent Fits a Frame at a Denominator
    // ------------------------------------------------------------
    function VghLantern__ScaleManager__ExtentFits(extents, frameWidthMm, frameHeightMm, denominator, paddingFactor) {
        if (!extents || !frameWidthMm || !frameHeightMm) return true;             // <-- Nothing to fit is trivially fitted

        var drawnWidthMm   =  (extents.Width  / denominator) * paddingFactor;
        var drawnHeightMm  =  (extents.Height / denominator) * paddingFactor;

        return drawnWidthMm <= frameWidthMm && drawnHeightMm <= frameHeightMm;
    }
    // ------------------------------------------------------------


    // FUNCTION | Choose the Finest Denominator That Fits Every View
    // ------------------------------------------------------------
    // requests is an array of { Extents, FrameWidthMm, FrameHeightMm }, one per
    // orthographic frame on the sheet. Returns the chosen denominator; the coarsest
    // available is returned when nothing fits, because a small drawing beats a
    // clipped one.
    function VghLantern__DrawingEditor__ScaleManager__FitToRequests(requests) {
        var scaleCfg    =  VghLantern__ScaleManager__ScaleConfig();
        var available   =  VghLantern__ScaleManager__Denominators();
        var padding     =  (typeof scaleCfg.AutoFitPaddingFactor === 'number') ? scaleCfg.AutoFitPaddingFactor : FALLBACK_PADDING;

        if (!Array.isArray(requests) || !requests.length) return VghLantern__DrawingEditor__ScaleManager__GetDenominator();

        var i, j, denominator, allFit;
        for (i = 0; i < available.length; i++) {
            denominator  =  available[i];
            allFit       =  true;

            for (j = 0; j < requests.length; j++) {
                if (!VghLantern__ScaleManager__ExtentFits(
                    requests[j].Extents, requests[j].FrameWidthMm, requests[j].FrameHeightMm, denominator, padding
                )) {
                    allFit  =  false;
                    break;
                }
            }

            if (allFit) return VghLantern__DrawingEditor__ScaleManager__SetDenominator(denominator);
        }

        return VghLantern__DrawingEditor__ScaleManager__SetDenominator(available[available.length - 1]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Test Whether Auto Fit Is Enabled
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ScaleManager__IsAutoFitEnabled() {
        return VghLantern__ScaleManager__ScaleConfig().AutoFitEnabled !== false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Conversion and Formatting
// -----------------------------------------------------------------------------

    // FUNCTION | Convert Model Millimetres to Paper Millimetres
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ScaleManager__ModelMmToPaperMm(modelMm) {
        var denominator  =  VghLantern__DrawingEditor__ScaleManager__GetDenominator();
        return modelMm / denominator;
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert Paper Millimetres to Model Millimetres
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ScaleManager__PaperMmToModelMm(paperMm) {
        var denominator  =  VghLantern__DrawingEditor__ScaleManager__GetDenominator();
        return paperMm * denominator;
    }
    // ------------------------------------------------------------


    // FUNCTION | Format the Scale for the Titleblock
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ScaleManager__FormatLabel() {
        var scaleCfg  =  VghLantern__ScaleManager__ScaleConfig();
        var prefix    =  scaleCfg.ScaleLabelPrefix || FALLBACK_LABEL_PREFIX;

        return prefix + String(VghLantern__DrawingEditor__ScaleManager__GetDenominator());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__ScaleManager__GetDenominator    : VghLantern__DrawingEditor__ScaleManager__GetDenominator,
        VghLantern__DrawingEditor__ScaleManager__SetDenominator    : VghLantern__DrawingEditor__ScaleManager__SetDenominator,
        VghLantern__DrawingEditor__ScaleManager__ListDenominators  : VghLantern__DrawingEditor__ScaleManager__ListDenominators,
        VghLantern__DrawingEditor__ScaleManager__FitToRequests     : VghLantern__DrawingEditor__ScaleManager__FitToRequests,
        VghLantern__DrawingEditor__ScaleManager__IsAutoFitEnabled  : VghLantern__DrawingEditor__ScaleManager__IsAutoFitEnabled,
        VghLantern__DrawingEditor__ScaleManager__ModelMmToPaperMm  : VghLantern__DrawingEditor__ScaleManager__ModelMmToPaperMm,
        VghLantern__DrawingEditor__ScaleManager__PaperMmToModelMm  : VghLantern__DrawingEditor__ScaleManager__PaperMmToModelMm,
        VghLantern__DrawingEditor__ScaleManager__FormatLabel       : VghLantern__DrawingEditor__ScaleManager__FormatLabel
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__ScaleManager  =  VghLantern__DrawingEditor__ScaleManager;
