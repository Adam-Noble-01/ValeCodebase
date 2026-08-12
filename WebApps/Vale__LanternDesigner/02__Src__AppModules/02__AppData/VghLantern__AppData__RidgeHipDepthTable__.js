/* =============================================================================
   VGHLANTERN - RIDGE AND HIP TIMBER DEPTH TABLE
   =============================================================================

   FILE       : VghLantern__AppData__RidgeHipDepthTable__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - RidgeHipDepthTable
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Resolve the ridge and hip beam depths a lantern's pitch calls for
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - Owns VghLantern__RidgeHipSystem__TimberDepthTable__.json and answers, for a
     given roof pitch and a pair of user overrides, how deep the ridge beam and
     the hip beam are.
   - Small and shared on purpose. The ridge system and the hip system are
     otherwise independent - either could be reused on a roof form the other has
     no part in - but the two DEPTHS are one decision and cannot be split.

   WHY THE TWO DEPTHS ARE ONE DECISION:
   - Where the hips meet the ridge they all die into the octagonal ridge block,
     plumb cut against its facets. The tabulated depths are chosen so the
     undersides of those cuts finish at the same height on the block face: on the
     22.5 degree standard the ridge underside lands 241.0mm below the ridge datum
     and the hip underside 241.7mm. Pick the two depths from separate rules and
     that agreement is the first thing to go, at the one junction in the roof
     where four moulded beams meet in plain sight.

   WHY ROWS ARE SNAPPED RATHER THAN INTERPOLATED:
   - These are stock joinery sections. A 21 degree roof does not make a 232mm
     beam orderable, so the pitch snaps to the nearest tabulated row and that
     row's depths are used. The snapped row travels with the answer so a
     specification can quote the standard it was built to.

   IMPORTANT:
   - LoadTable must have resolved before Resolve answers anything but the
     authored fallback. The ridge and hip system loaders both await it as part of
     their own load, so any build that has drawn geometry has it.

   ============================================================================= */

// =============================================================================
// REGION | Ridge and Hip Depth Table Module
// =============================================================================

const VghLantern__AppData__RidgeHipDepthTable = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Table Source Path
    // ------------------------------------------------------------
    const TABLE_PATH  =  '06__Data__LanternProfileLibrary/VghLantern__RidgeHipSystem__TimberDepthTable__.json';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Table Field Names
    // ------------------------------------------------------------
    const KEY_META      =  'VghLantern__RidgeHipTimberDepth__Meta';
    const KEY_AUTHORED  =  'VghLantern__RidgeHipTimberDepth__AuthoredStandard';
    const KEY_ROWS      =  'VghLantern__RidgeHipTimberDepth__Rows';
    const KEY_OVERRIDE  =  'VghLantern__RidgeHipTimberDepth__Override';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Authored Fallback
    // ------------------------------------------------------------
    // Mirrors the 22.5 degree row. Used only when the table has not loaded, in
    // which case the sections are drawn exactly as exported and no vertex moves -
    // which is a visibly reasonable lantern rather than a broken one.
    const FALLBACK  =  {
        AuthoredRoofPitchDegrees : 22.5,
        AuthoredRidgeDepthMm     : 230,
        AuthoredHipDepthMm       : 205,
        MinAdjustmentMm          : -100,
        MaxAdjustmentMm          : 100,
        MinResultingDepthMm      : 120
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Memoised Table
    // ------------------------------------------------------------
    let VghLantern__RidgeHipDepthTable__Data         =  null;                // <-- Parsed table
    let VghLantern__RidgeHipDepthTable__LoadPromise  =  null;                // <-- In-flight load shared by concurrent callers
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Table Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Timber Depth Table (memoised)
    // ------------------------------------------------------------
    function VghLantern__RidgeHipDepthTable__LoadTable() {
        if (VghLantern__RidgeHipDepthTable__LoadPromise) return VghLantern__RidgeHipDepthTable__LoadPromise;

        VghLantern__RidgeHipDepthTable__LoadPromise  =  (async function() {
            try {
                var response  =  await fetch(TABLE_PATH, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                VghLantern__RidgeHipDepthTable__Data  =  await response.json();
                console.log('[VghLantern__RidgeHipDepthTable] Timber depth table loaded ('
                    + VghLantern__RidgeHipDepthTable__Rows().length + ' pitch rows).');

            } catch (error) {
                console.error('[VghLantern__RidgeHipDepthTable] Table could not be loaded:', error.message);
                VghLantern__RidgeHipDepthTable__Data  =  null;
            }

            return VghLantern__RidgeHipDepthTable__Data;
        })();

        return VghLantern__RidgeHipDepthTable__LoadPromise;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Tabulated Rows, Empty Before the Table Loads
    // ------------------------------------------------------------
    function VghLantern__RidgeHipDepthTable__Rows() {
        var data  =  VghLantern__RidgeHipDepthTable__Data;
        return (data && Array.isArray(data[KEY_ROWS])) ? data[KEY_ROWS] : [];
    }
    // ------------------------------------------------------------


    // FUNCTION | The Authored Standard the Assets Were Exported At
    // ------------------------------------------------------------
    function VghLantern__RidgeHipDepthTable__AuthoredStandard() {
        var data  =  VghLantern__RidgeHipDepthTable__Data;
        var block =  data ? data[KEY_AUTHORED] : null;
        if (!block) return { AuthoredRoofPitchDegrees : FALLBACK.AuthoredRoofPitchDegrees,
                             AuthoredRidgeDepthMm     : FALLBACK.AuthoredRidgeDepthMm,
                             AuthoredHipDepthMm       : FALLBACK.AuthoredHipDepthMm };

        return {
            AuthoredRoofPitchDegrees : Number(block.AuthoredRoofPitchDegrees),
            AuthoredRidgeDepthMm     : Number(block.AuthoredRidgeDepthMm),
            AuthoredHipDepthMm       : Number(block.AuthoredHipDepthMm)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Override Bounds the Editor Slider Is Built From
    // ------------------------------------------------------------
    function VghLantern__RidgeHipDepthTable__OverrideBounds() {
        var data   =  VghLantern__RidgeHipDepthTable__Data;
        var block  =  data ? data[KEY_OVERRIDE] : null;
        if (!block) return { Min : FALLBACK.MinAdjustmentMm, Max : FALLBACK.MaxAdjustmentMm, Step : 5,
                             MinResultingDepthMm : FALLBACK.MinResultingDepthMm };

        return {
            Min                 : Number(block.MinAdjustmentMm),
            Max                 : Number(block.MaxAdjustmentMm),
            Step                : Number(block.StepMm) || 5,
            MinResultingDepthMm : Number(block.MinResultingDepthMm) || FALLBACK.MinResultingDepthMm
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Standards Note Carried on Every Specification Row
    // ------------------------------------------------------------
    function VghLantern__RidgeHipDepthTable__StandardsNote() {
        var data  =  VghLantern__RidgeHipDepthTable__Data;
        var meta  =  data ? data[KEY_META] : null;
        return (meta && meta.StandardsNote) ? meta.StandardsNote : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Depth Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Tabulated Row Nearest a Pitch
    // ------------------------------------------------------------
    // Nearest rather than bracketing, because the rows are stock sizes and the
    // gap between them is a manufacturing decision rather than a curve to sample.
    // A pitch below the shallowest row lands on the shallowest row and one above
    // the steepest lands on the steepest, which the ten degree lower limit of the
    // pitch slider makes a real case rather than a theoretical one.
    function VghLantern__RidgeHipDepthTable__NearestRow(pitchDegrees) {
        var rows  =  VghLantern__RidgeHipDepthTable__Rows();
        if (rows.length === 0) return null;

        var pitch    =  Number(pitchDegrees);
        var best     =  rows[0];
        var bestGap  =  Math.abs(Number(rows[0].PitchDegrees) - pitch);
        var i, gap;

        for (i = 1; i < rows.length; i++) {
            gap  =  Math.abs(Number(rows[i].PitchDegrees) - pitch);
            if (gap < bestGap) { best  =  rows[i]; bestGap  =  gap; }
        }
        return best;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Both Beam Depths for a Pitch and a Pair of Overrides
    // ------------------------------------------------------------
    // Returns:
    //   {
    //     PitchDegrees          the pitch asked about
    //     SnappedPitchDegrees   the tabulated row it was answered from
    //     WasSnapped            true when those two differ
    //     Ridge / Hip : {
    //       StandardDepthMm     what the table says
    //       AdjustmentMm        the override actually applied, after clamping
    //       RequestedAdjustmentMm
    //       DepthMm             the depth built
    //       AuthoredDepthMm     what the exported section measures
    //       DeltaFromAuthoredMm the stretch, signed along section +y
    //       WasClamped          true when the override hit a limit
    //     }
    //   }
    //
    // DeltaFromAuthoredMm is the number the stretch actually consumes, and it is
    // NEGATIVE for a deeper beam: section +y runs up out of the roof, so making a
    // beam deeper pushes its moulded bottom further down.
    function VghLantern__RidgeHipDepthTable__Resolve(pitchDegrees, ridgeAdjustmentMm, hipAdjustmentMm) {
        var authored  =  VghLantern__RidgeHipDepthTable__AuthoredStandard();
        var bounds    =  VghLantern__RidgeHipDepthTable__OverrideBounds();
        var row       =  VghLantern__RidgeHipDepthTable__NearestRow(pitchDegrees);

        var standardRidge  =  row ? Number(row.RidgeDepthMm) : authored.AuthoredRidgeDepthMm;
        var standardHip    =  row ? Number(row.HipDepthMm)   : authored.AuthoredHipDepthMm;

        return {
            PitchDegrees        : Number(pitchDegrees),
            SnappedPitchDegrees : row ? Number(row.PitchDegrees) : authored.AuthoredRoofPitchDegrees,
            WasSnapped          : row ? Math.abs(Number(row.PitchDegrees) - Number(pitchDegrees)) > 0.001 : false,
            TableLoaded         : row !== null,

            Ridge : VghLantern__RidgeHipDepthTable__ResolveOne(
                standardRidge, ridgeAdjustmentMm, authored.AuthoredRidgeDepthMm, bounds),

            Hip   : VghLantern__RidgeHipDepthTable__ResolveOne(
                standardHip, hipAdjustmentMm, authored.AuthoredHipDepthMm, bounds)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve One Beam Depth Against Its Override
    // ------------------------------------------------------------
    // The override is clamped twice: once to the plus or minus 100mm the slider
    // offers, and once to the shallowest depth the section can physically reach.
    // A beam stretched below MinResultingDepthMm has no parallel flank left above
    // its 24mm moulding, and the next millimetre of stretch would start pulling
    // the moulding through itself.
    function VghLantern__RidgeHipDepthTable__ResolveOne(standardDepthMm, requestedAdjustmentMm, authoredDepthMm, bounds) {
        var requested  =  Number(requestedAdjustmentMm) || 0;
        var applied    =  Math.max(bounds.Min, Math.min(bounds.Max, requested));
        var depth      =  standardDepthMm + applied;

        if (depth < bounds.MinResultingDepthMm) {
            depth    =  bounds.MinResultingDepthMm;
            applied  =  depth - standardDepthMm;
        }

        return {
            StandardDepthMm       : standardDepthMm,
            RequestedAdjustmentMm : requested,
            AdjustmentMm          : applied,
            DepthMm               : depth,
            AuthoredDepthMm       : authoredDepthMm,
            DeltaFromAuthoredMm   : -(depth - authoredDepthMm),               // <-- Negative deepens: section +y runs up
            WasClamped            : Math.abs(applied - requested) > 0.001
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__RidgeHipDepthTable__LoadTable         : VghLantern__RidgeHipDepthTable__LoadTable,
        VghLantern__RidgeHipDepthTable__Resolve           : VghLantern__RidgeHipDepthTable__Resolve,
        VghLantern__RidgeHipDepthTable__AuthoredStandard  : VghLantern__RidgeHipDepthTable__AuthoredStandard,
        VghLantern__RidgeHipDepthTable__OverrideBounds    : VghLantern__RidgeHipDepthTable__OverrideBounds,
        VghLantern__RidgeHipDepthTable__StandardsNote     : VghLantern__RidgeHipDepthTable__StandardsNote
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__RidgeHipDepthTable  =  VghLantern__AppData__RidgeHipDepthTable;
