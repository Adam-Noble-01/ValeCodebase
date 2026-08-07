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
   - Owns the drawing scale for the active sheet: the selected denominator and the
     available denominators.
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

   WHY THE FIT NEVER GOES FINER THAN THE PREFERRED SCALE:
   A Vale lantern drawing is a 1:50 drawing. A small lantern would fit its frame at
   1:20 and the old fit took it, because it walked the whole list from the finest end
   and stopped at the first that fitted - which is how a pack of drawings ended up
   with a different scale on every sheet. PreferredScaleDenominator is now the floor
   the fit starts at, so the only direction it can move is coarser, and only when the
   views genuinely will not fit.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Scale Manager Module
// =============================================================================

const VghLantern__DrawingEditor__ScaleManager = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Structural Guard When the Denominator List Is Missing
    // ------------------------------------------------------------
    // Only used if AvailableScaleDenominators is absent from JSON entirely - a
    // config authoring bug, not a value this module is entitled to define.
    const FALLBACK_DENOMINATORS  =  [10, 20, 50, 100];

    const LADDER_KEY_SHEET_SIZE  =  'SheetSizeKey';                           // <-- Rung field names, quoted once
    const LADDER_KEY_ORIENTATION =  'Orientation';
    const LADDER_KEY_DENOMINATOR =  'ScaleDenominator';

    const SCALES_LABEL  =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__Scales';
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

        if (!Array.isArray(list) || !list.length) {
            console.error('[VghLantern__ScaleManager] Missing or empty config key "AvailableScaleDenominators" (' +
                SCALES_LABEL + '). Add it to the JSON config - do not hardcode a fallback in JS.');
            return FALLBACK_DENOMINATORS.slice();
        }

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

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var scaleCfg      =  VghLantern__ScaleManager__ScaleConfig();

        VghLantern__ScaleManager__ActiveDenominator  =
            ConfigLoader.VghLantern__ConfigLoader__RequireNumber(scaleCfg, 'PreferredScaleDenominator', SCALES_LABEL);

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


    // HELPER FUNCTION | List the Denominators the Auto Fit May Choose From
    // ------------------------------------------------------------
    // The available list minus everything finer than the preferred scale. 1:10 and
    // 1:20 stay selectable by hand for a detail sheet; they are simply not something
    // the sheet drops to on its own.
    function VghLantern__ScaleManager__FitCandidates() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var available     =  VghLantern__ScaleManager__Denominators();
        var preferred     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__ScaleManager__ScaleConfig(), 'PreferredScaleDenominator', SCALES_LABEL);

        var candidates  =  available.filter(function(denominator) { return denominator >= preferred; });

        return candidates.length ? candidates : available;                        // <-- Preferred coarser than everything listed is a config bug, not a reason to draw nothing
    }
    // ------------------------------------------------------------


    // FUNCTION | Test Whether Every View Fits Its Frame at One Denominator
    // ------------------------------------------------------------
    // The whole of "does this sheet work at 1:N", exposed because the auto layout
    // ladder asks it of a paper size this module knows nothing about. requests is an
    // array of { Extents, FrameWidthMm, FrameHeightMm }, one per orthographic frame.
    function VghLantern__DrawingEditor__ScaleManager__RequestsFitAt(requests, denominator) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var padding       =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__ScaleManager__ScaleConfig(), 'AutoFitPaddingFactor', SCALES_LABEL);

        if (!Array.isArray(requests) || !requests.length) return true;            // <-- Nothing to fit is trivially fitted
        if (!denominator || denominator <= 0) return false;

        var i;
        for (i = 0; i < requests.length; i++) {
            if (!VghLantern__ScaleManager__ExtentFits(
                requests[i].Extents, requests[i].FrameWidthMm, requests[i].FrameHeightMm, denominator, padding
            )) return false;
        }

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Choose the Finest Permitted Denominator That Fits Every View
    // ------------------------------------------------------------
    // Used when the paper is fixed - either pinned by hand or because no ladder is
    // configured - so the scale is the only thing left to move. Walks from the
    // preferred scale upward and stops at the first that fits; the coarsest available
    // is returned when nothing does, because a small drawing beats a clipped one.
    function VghLantern__DrawingEditor__ScaleManager__FitToRequests(requests) {
        var candidates  =  VghLantern__ScaleManager__FitCandidates();

        if (!Array.isArray(requests) || !requests.length) return VghLantern__DrawingEditor__ScaleManager__GetDenominator();

        var i;
        for (i = 0; i < candidates.length; i++) {
            if (VghLantern__DrawingEditor__ScaleManager__RequestsFitAt(requests, candidates[i])) {
                return VghLantern__DrawingEditor__ScaleManager__SetDenominator(candidates[i]);
            }
        }

        return VghLantern__DrawingEditor__ScaleManager__SetDenominator(candidates[candidates.length - 1]);
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Auto Layout Ladder Rungs in Order
    // ------------------------------------------------------------
    // Each rung is a paper AND a scale to try together. Returned as plain objects so
    // the caller - which owns the paper - can solve each one; this module validates
    // only the half it owns, the denominator, and drops a rung quoting a scale that
    // is not selectable. Letting one through would set a scale SetDenominator then
    // refuses, leaving the sheet drawn at one scale and captioned with another.
    //
    // An empty result is not an error: it means no ladder is configured, and the
    // caller falls back to fitting the scale inside whatever paper it already has.
    function VghLantern__DrawingEditor__ScaleManager__ListAutoFitLadder() {
        var scaleCfg   =  VghLantern__ScaleManager__ScaleConfig();
        var configured =  scaleCfg.AutoFitLadder;
        if (!Array.isArray(configured) || !configured.length) return [];

        var available  =  VghLantern__ScaleManager__Denominators();
        var rungs      =  [];
        var i, rung, denominator;

        for (i = 0; i < configured.length; i++) {
            rung         =  configured[i] || {};
            denominator  =  parseFloat(rung[LADDER_KEY_DENOMINATOR]);

            if (isNaN(denominator) || available.indexOf(denominator) === -1) {
                console.error('[VghLantern__ScaleManager] AutoFitLadder rung ' + i + ' quotes scale 1:' +
                    rung[LADDER_KEY_DENOMINATOR] + ', which is not in AvailableScaleDenominators (' +
                    SCALES_LABEL + '). Rung skipped.');
                continue;
            }

            rungs.push({
                SheetSizeKey     : rung[LADDER_KEY_SHEET_SIZE],
                Orientation      : rung[LADDER_KEY_ORIENTATION],
                ScaleDenominator : denominator
            });
        }

        return rungs;
    }
    // ------------------------------------------------------------


    // FUNCTION | Test Whether Auto Fit Is Enabled
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ScaleManager__IsAutoFitEnabled() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(
            VghLantern__ScaleManager__ScaleConfig(), 'AutoFitEnabled', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__Scales');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Formatting
// -----------------------------------------------------------------------------

    // FUNCTION | Format the Scale for the Titleblock
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ScaleManager__FormatLabel() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var scaleCfg  =  VghLantern__ScaleManager__ScaleConfig();
        var prefix    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(scaleCfg, 'ScaleLabelPrefix', SCALES_LABEL);

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
        VghLantern__DrawingEditor__ScaleManager__GetDenominator     : VghLantern__DrawingEditor__ScaleManager__GetDenominator,
        VghLantern__DrawingEditor__ScaleManager__SetDenominator     : VghLantern__DrawingEditor__ScaleManager__SetDenominator,
        VghLantern__DrawingEditor__ScaleManager__ListDenominators   : VghLantern__DrawingEditor__ScaleManager__ListDenominators,
        VghLantern__DrawingEditor__ScaleManager__ListAutoFitLadder  : VghLantern__DrawingEditor__ScaleManager__ListAutoFitLadder,
        VghLantern__DrawingEditor__ScaleManager__RequestsFitAt      : VghLantern__DrawingEditor__ScaleManager__RequestsFitAt,
        VghLantern__DrawingEditor__ScaleManager__FitToRequests      : VghLantern__DrawingEditor__ScaleManager__FitToRequests,
        VghLantern__DrawingEditor__ScaleManager__IsAutoFitEnabled   : VghLantern__DrawingEditor__ScaleManager__IsAutoFitEnabled,
        VghLantern__DrawingEditor__ScaleManager__FormatLabel        : VghLantern__DrawingEditor__ScaleManager__FormatLabel
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__ScaleManager  =  VghLantern__DrawingEditor__ScaleManager;
