/* =============================================================================
   VGHLANTERN - GLAZE BAR LAYOUT
   =============================================================================

   FILE       : VghLantern__Geometry__GlazeBarLayout__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - GlazeBarLayout
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Divide the solved roof slopes into glazing bars and transoms
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Consumes a SolvedSkeleton from VghLantern__Geometry__SkeletonSolver plus the
     lantern's glazing bar config, and returns the bar centreline set.
   - Pure data out. Bars are centrelines only - the swept profile is applied by
     the render environments (SVG trace in 2D, extrusion in 3D).
   - Kept separate from the skeleton solve because bar division changes far more
     often than the roof form, and because the drawing/specification takeoff
     needs bar lengths independently of the skeleton.

   ---------------------------------------------------------------------------

   LAYOUT RULES (Vale convention - the hip wrap):
   - One set-out  : a single pitch measured along the long eaves drives the whole
                    lantern. The hip ends are not set out independently, they are
                    wrapped from the same offsets, which is what makes every bar
                    land exactly on a hip or ridge point.
   - Long slopes  : bars run square to the eaves, up the slope. A bar inboard of
                    the ridge ends terminates on the ridge; a bar outboard of
                    them terminates on the hip, walked in plan by
                    VghLantern__GlazeBarLayout__HipShortOffset.
   - Hip ends     : no radial fan. Each outboard bar turns on the hip and
                    continues square to the short eaves, out to the short eaves
                    edge at constant short offset. That second leg is emitted as
                    its own bar record - physically a separate mitred member -
                    carrying the hip end face's SlopeKey. Both legs share the hip
                    point exactly, so convergence is by construction rather than
                    by tolerance. Each end also carries a centre bar on the
                    lantern centreline, in line with the ridge - it cannot fall
                    out of the set-out because no long slope bar terminates at
                    the ridge end point itself.
   - Pyramid      : the ridge collapses to a point, so every bar is outboard and
                    wraps. The same code path handles it with no special casing,
                    including a non-square plan where the hips are not at 45
                    degrees.

   OUTPUT CONTRACT - GlazeBarSet:

   {
       Meta : {
           DivisionMode         : 'count' | 'spacing',
           LongSlopeBarCount, ShortSlopeBarCount,
           ResolvedLongSpacingMm, ResolvedShortSpacingMm,
           TotalBarLengthMm, TransomEnabled, TotalTransomLengthMm
       },
       Bars     : [ { Id, Role, SlopeKey, Start, End, LengthMm } ],
       Warnings : []
   }

   Bar roles : 'glazingBar' | 'transom'

   ShortSlopeBarCount is derived, not entered - it is the number of wrapped hip
   end legs on one hip end face. Both spacing values report the single set-out
   pitch and are kept as separate keys only for the existing consumers.

   ============================================================================= */

// =============================================================================
// REGION | Glaze Bar Layout Module
// =============================================================================

const VghLantern__Geometry__GlazeBarLayout = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Division Modes and Layout Guards
    // ------------------------------------------------------------
    const DIVISION_MODE_COUNT    =  'count';                                 // <-- User states how many bars per slope
    const DIVISION_MODE_SPACING  =  'spacing';                               // <-- User states a target spacing and count is derived
    const MAX_BARS_PER_SLOPE     =  40;                                      // <-- Hard ceiling matching the schema clamp
    const MIN_PANE_WIDTH_MM      =  120;                                     // <-- Below this a pane is unbuildable
    const TRANSOM_HEIGHT_FACTOR  =  0.5;                                     // <-- Transom sits at half the slope rise
    const HIP_CENTRE_MERGE_FACTOR  =  0.5;                                   // <-- A leg within half a pane of the centreline merges into it
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Slope Frame Extraction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Recover the Canonical Long/Short Frame from a Skeleton
    // ------------------------------------------------------------
    // The skeleton publishes half extents per world axis plus which axis is
    // long. This rebuilds the canonical u/v frame the layout maths works in.
    function VghLantern__GlazeBarLayout__ReadFrame(skeleton) {
        var meta       =  skeleton.Meta;
        var halfWidth  =  meta.EavesHalfWidthMm;
        var halfDepth  =  meta.EavesHalfDepthMm;

        var halfLong        =  Math.max(halfWidth, halfDepth);
        var halfShort       =  Math.min(halfWidth, halfDepth);
        var ridgeHalfLength =  meta.RidgeLengthMm / 2;

        return {
            MapTo             : window.VghLantern__Geometry__SkeletonSolver
                                    .VghLantern__SkeletonSolver__BuildAxisMapper(meta.LongAxis),
            HalfLongMm        : halfLong,
            HalfShortMm       : halfShort,
            RidgeHalfLengthMm : ridgeHalfLength,
            EndSlopeRunMm     : halfLong - ridgeHalfLength,                  // <-- Plan run of one hip end, ridge end to short eaves
            EavesLevelMm      : meta.EavesLevelMm,
            RiseMm            : meta.RiseMm
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Height Above Eaves at a Given Short-Axis Offset
    // ------------------------------------------------------------
    // On a long slope the roof rises linearly as v travels from the eaves edge
    // toward the ridge line at v = 0.
    function VghLantern__GlazeBarLayout__LevelAtShortOffset(frame, absShortOffsetMm) {
        if (frame.HalfShortMm <= 0) return frame.EavesLevelMm;
        var travelled  =  (frame.HalfShortMm - Math.abs(absShortOffsetMm)) / frame.HalfShortMm;
        return frame.EavesLevelMm + (frame.RiseMm * travelled);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Height Above Eaves at a Given Long-Axis Offset
    // ------------------------------------------------------------
    // On a hip end the roof rises linearly as u travels from the short eaves
    // edge toward the ridge end. Agrees exactly with the long slope level at
    // the hip, so a wrapped bar has no step at its corner.
    function VghLantern__GlazeBarLayout__LevelAtLongOffset(frame, absLongOffsetMm) {
        if (frame.EndSlopeRunMm <= 0) return frame.EavesLevelMm;
        var travelled  =  (frame.HalfLongMm - Math.abs(absLongOffsetMm)) / frame.EndSlopeRunMm;
        return frame.EavesLevelMm + (frame.RiseMm * travelled);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Short Offset Where a Constant-u Bar Meets the Hip
    // ------------------------------------------------------------
    // Walks the hip in plan rather than assuming it sits at 45 degrees, so a
    // rectangular Pyramid - where the ridge collapses and the hip run no longer
    // equals the short half span - resolves correctly from the same code path.
    // Returns zero for bars inboard of the ridge ends, which reach the ridge.
    function VghLantern__GlazeBarLayout__HipShortOffset(frame, absLongOffsetMm) {
        var overhang  =  Math.abs(absLongOffsetMm) - frame.RidgeHalfLengthMm; // <-- Distance outboard of the ridge end
        if (overhang <= 0 || frame.EndSlopeRunMm <= 0) return 0;              // <-- Inboard bars reach the ridge
        return frame.HalfShortMm * (overhang / frame.EndSlopeRunMm);          // <-- Walk the hip in plan
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Long Offset Where the Hip Reaches a Given Short Offset
    // ------------------------------------------------------------
    // The inverse of HipShortOffset. Used to stop a constant-v member where the
    // hips close in on the long slope.
    function VghLantern__GlazeBarLayout__HipLongOffset(frame, absShortOffsetMm) {
        if (frame.HalfShortMm <= 0) return frame.RidgeHalfLengthMm;
        return frame.RidgeHalfLengthMm
             + (frame.EndSlopeRunMm * (Math.abs(absShortOffsetMm) / frame.HalfShortMm));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Smallest Short Offset a Wrap Leg May Sit At
    // ------------------------------------------------------------
    // The ridge end never coincides with the set-out, so the innermost wrap leg can
    // land arbitrarily close to the centre bar and leave a sliver pane. Any leg
    // nearer than half a pane is merged into the centre bar instead. Measured along
    // v, which is the set-out pitch projected onto the hip.
    function VghLantern__GlazeBarLayout__CentreMergeLimit(frame, spacingMm) {
        if (frame.EndSlopeRunMm <= 0) return MIN_PANE_WIDTH_MM;
        var hipStep  =  frame.HalfShortMm * (spacingMm / frame.EndSlopeRunMm); // <-- Gap between adjacent legs
        return Math.max(MIN_PANE_WIDTH_MM, hipStep * HIP_CENTRE_MERGE_FACTOR);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Count Wrap Legs on One Hip, After the Centre Merge
    // ------------------------------------------------------------
    // Counts only the offsets that actually yield a leg, so the reported hip end
    // count matches the bars emitted.
    function VghLantern__GlazeBarLayout__CountOutboardOffsets(frame, offsets, mergeLimitMm) {
        var count  =  0;
        var i;
        for (i = 0; i < offsets.length; i++) {
            if (VghLantern__GlazeBarLayout__HipShortOffset(frame, offsets[i]) >= mergeLimitMm) count++;
        }
        return count / 2;                                                     // <-- Offsets are symmetric, so halve for one end
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Division Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve a Bar Count for an Edge from the Division Mode
    // ------------------------------------------------------------
    function VghLantern__GlazeBarLayout__ResolveBarCount(divisionMode, edgeLengthMm, requestedCount, targetSpacingMm) {
        var count;

        if (divisionMode === DIVISION_MODE_SPACING) {
            var spacing  =  Math.max(1, Number(targetSpacingMm) || 0);
            count        =  Math.max(0, Math.round(edgeLengthMm / spacing) - 1);
        } else {
            count  =  Math.max(0, Math.round(Number(requestedCount) || 0));
        }

        return Math.min(MAX_BARS_PER_SLOPE, count);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Evenly Spaced Division Offsets Across a Centred Edge
    // ------------------------------------------------------------
    // Returns bar positions for an edge running from -halfLength to +halfLength.
    // A count of n yields n bars splitting the edge into n+1 equal panes.
    // Measured outwards from the centre rather than in from the near end, so a
    // mirrored pair is exactly equal and opposite. Accumulating from one end
    // instead leaves the pair differing in the last bits, which is enough to make
    // a bar sitting on a threshold survive at one hip end and be culled at the
    // other - a visible asymmetry.
    function VghLantern__GlazeBarLayout__DivisionOffsets(halfLengthMm, barCount) {
        var offsets  =  [];
        if (barCount < 1 || halfLengthMm <= 0) return offsets;

        var paneWidth  =  (halfLengthMm * 2) / (barCount + 1);
        var centreIdx  =  (barCount + 1) / 2;                                 // <-- Index of the centreline, whole or half
        var i;
        for (i = 1; i <= barCount; i++) {
            offsets.push((i - centreIdx) * paneWidth);
        }
        return offsets;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Slope Bar Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Push a Bar onto the Collection
    // ------------------------------------------------------------
    function VghLantern__GlazeBarLayout__PushBar(bars, id, role, slopeKey, startPt, endPt) {
        var Solver  =  window.VghLantern__Geometry__SkeletonSolver;
        var length  =  Solver.VghLantern__SkeletonSolver__Distance(startPt, endPt);
        if (length <= 0) return;

        bars.push({
            Id       : id,
            Role     : role,
            SlopeKey : slopeKey,
            Start    : startPt,
            End      : endPt,
            LengthMm : length
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Lay Bars onto One Long Slope
    // ------------------------------------------------------------
    // shortSign selects which long slope: -1 for the -v side, +1 for the +v side.
    function VghLantern__GlazeBarLayout__BuildLongSlopeBars(bars, frame, shortSign, offsets, slopeKey) {
        var i, longOffset, endShortOffset, startPt, endPt;

        for (i = 0; i < offsets.length; i++) {
            longOffset  =  offsets[i];

            // Inboard of the ridge ends the bar reaches the ridge (v = 0).
            // Outboard it stops on the hip, walked in plan by the helper.
            endShortOffset  =  VghLantern__GlazeBarLayout__HipShortOffset(frame, longOffset);

            startPt  =  frame.MapTo(longOffset, shortSign * frame.HalfShortMm, frame.EavesLevelMm);
            endPt    =  frame.MapTo(
                longOffset,
                shortSign * endShortOffset,
                VghLantern__GlazeBarLayout__LevelAtShortOffset(frame, endShortOffset)
            );

            VghLantern__GlazeBarLayout__PushBar(bars, 'bar_' + slopeKey + '_' + i, 'glazingBar', slopeKey, startPt, endPt);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Wrap the Outboard Bars Around One Hip End
    // ------------------------------------------------------------
    // Vale convention: a bar that cannot reach the ridge turns on the hip and
    // continues square to the SHORT eaves out to the short eaves edge. Driven by
    // the same long-slope offset list, so the leg springs from exactly the point
    // the long slope bar terminated on and the hip junction is exact by
    // construction. shortSign selects which hip of the end, longSign which end.
    function VghLantern__GlazeBarLayout__BuildHipEndBars(bars, frame, longSign, shortSign, offsets, slopeKey, mergeLimitMm) {
        var hipKey  =  shortSign < 0 ? 'n' : 'p';                            // <-- Keeps ids unique across the two hips of one end
        var i, absLongOffset, shortOffset, hipLongOffset, level, startPt, endPt;

        for (i = 0; i < offsets.length; i++) {
            hipLongOffset  =  offsets[i];
            if (hipLongOffset * longSign <= 0) continue;                      // <-- Belongs to the opposite hip end

            absLongOffset  =  Math.abs(hipLongOffset);
            shortOffset    =  VghLantern__GlazeBarLayout__HipShortOffset(frame, absLongOffset);
            if (shortOffset < mergeLimitMm) continue;                          // <-- Reached the ridge, or merges into the centre bar

            level  =  VghLantern__GlazeBarLayout__LevelAtLongOffset(frame, absLongOffset);

            startPt  =  frame.MapTo(hipLongOffset, shortSign * shortOffset, level);
            endPt    =  frame.MapTo(longSign * frame.HalfLongMm, shortSign * shortOffset, frame.EavesLevelMm);

            VghLantern__GlazeBarLayout__PushBar(bars, 'bar_hip_' + slopeKey + '_' + hipKey + '_' + i, 'glazingBar', slopeKey, startPt, endPt);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Lay the Centre Bar of One Hip End
    // ------------------------------------------------------------
    // A Vale hip end always carries a bar on the lantern centreline, in line with
    // the ridge and square to the short eaves. It cannot fall out of the wrap set
    // because no long slope bar terminates at the ridge end point itself, so it is
    // laid explicitly. On a pyramid it springs from the apex.
    function VghLantern__GlazeBarLayout__BuildHipEndCentreBar(bars, frame, longSign, slopeKey) {
        var startPt  =  frame.MapTo(longSign * frame.RidgeHalfLengthMm, 0, frame.EavesLevelMm + frame.RiseMm);
        var endPt    =  frame.MapTo(longSign * frame.HalfLongMm,        0, frame.EavesLevelMm);

        VghLantern__GlazeBarLayout__PushBar(bars, 'bar_hipcentre_' + slopeKey, 'glazingBar', slopeKey, startPt, endPt);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Lay a Horizontal Transom Across Both Long Slopes
    // ------------------------------------------------------------
    function VghLantern__GlazeBarLayout__BuildTransoms(bars, frame) {
        var shortOffset  =  frame.HalfShortMm * (1 - TRANSOM_HEIGHT_FACTOR);
        var level        =  VghLantern__GlazeBarLayout__LevelAtShortOffset(frame, shortOffset);

        // The transom cannot run past where the hips close in on the slope.
        var halfExtent  =  VghLantern__GlazeBarLayout__HipLongOffset(frame, shortOffset);
        if (halfExtent <= 0) return;

        var signs  =  [-1, 1];
        var i;
        for (i = 0; i < signs.length; i++) {
            VghLantern__GlazeBarLayout__PushBar(
                bars,
                'transom_' + i,
                'transom',
                signs[i] < 0 ? 'short-' : 'short+',
                frame.MapTo(-halfExtent, signs[i] * shortOffset, level),
                frame.MapTo( halfExtent, signs[i] * shortOffset, level)
            );
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Layout Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Lay Glazing Bars onto a Solved Skeleton
    // ------------------------------------------------------------
    function VghLantern__GlazeBarLayout__Layout(skeleton, lantern) {
        if (!skeleton || !skeleton.Meta || !lantern) return null;

        var barsCfg  =  lantern['Lantern__GlazingBars__Config'] || {};
        var frame    =  VghLantern__GlazeBarLayout__ReadFrame(skeleton);
        var warnings =  [];
        var bars     =  [];

        var divisionMode  =  barsCfg['Lantern__GlazingBars__Config__DivisionMode'] === DIVISION_MODE_SPACING
            ? DIVISION_MODE_SPACING
            : DIVISION_MODE_COUNT;

        var targetSpacing  =  barsCfg['Lantern__GlazingBars__Config__TargetSpacingMm'];

        var longCount  =  VghLantern__GlazeBarLayout__ResolveBarCount(
            divisionMode, frame.HalfLongMm * 2,
            barsCfg['Lantern__GlazingBars__Config__BarCountLongSlope'], targetSpacing
        );

        // One set-out for the whole lantern. The hip ends are wrapped from this
        // same offset list, so the hip end count is derived rather than entered.
        var resolvedSpacing  =  (frame.HalfLongMm * 2) / (longCount + 1);      // <-- Single set-out pitch, long slopes and hip ends alike

        var offsets     =  VghLantern__GlazeBarLayout__DivisionOffsets(frame.HalfLongMm, longCount);
        var mergeLimit  =  VghLantern__GlazeBarLayout__CentreMergeLimit(frame, resolvedSpacing);
        var wrapCount   =  VghLantern__GlazeBarLayout__CountOutboardOffsets(frame, offsets, mergeLimit);
        var shortCount  =  longCount > 0 ? (wrapCount * 2) + 1 : 0;           // <-- Both hips of one end, plus that end's centre bar

        VghLantern__GlazeBarLayout__BuildLongSlopeBars(bars, frame, -1, offsets, 'short-');
        VghLantern__GlazeBarLayout__BuildLongSlopeBars(bars, frame,  1, offsets, 'short+');

        VghLantern__GlazeBarLayout__BuildHipEndBars(bars, frame, -1, -1, offsets, 'long-', mergeLimit);
        VghLantern__GlazeBarLayout__BuildHipEndBars(bars, frame, -1,  1, offsets, 'long-', mergeLimit);
        VghLantern__GlazeBarLayout__BuildHipEndBars(bars, frame,  1, -1, offsets, 'long+', mergeLimit);
        VghLantern__GlazeBarLayout__BuildHipEndBars(bars, frame,  1,  1, offsets, 'long+', mergeLimit);

        if (longCount > 0) {
            VghLantern__GlazeBarLayout__BuildHipEndCentreBar(bars, frame, -1, 'long-');
            VghLantern__GlazeBarLayout__BuildHipEndCentreBar(bars, frame,  1, 'long+');
        }

        var transomEnabled  =  barsCfg['Lantern__GlazingBars__Config__HorizontalTransomEnabled'] === true;
        if (transomEnabled) VghLantern__GlazeBarLayout__BuildTransoms(bars, frame);

        if (resolvedSpacing < MIN_PANE_WIDTH_MM) {
            warnings.push('Resolved pane width is below ' + MIN_PANE_WIDTH_MM + ' mm - reduce the bar count.');
        }

        // A shallow hip end compresses the set-out, so the hip end panes can be
        // unbuildable even when the long slope panes are comfortable.
        var hipStep  =  frame.EndSlopeRunMm > 0
            ? frame.HalfShortMm * (resolvedSpacing / frame.EndSlopeRunMm)
            : resolvedSpacing;
        if (wrapCount >= 1 && hipStep < MIN_PANE_WIDTH_MM) {
            warnings.push('Hip end panes are only ' + Math.round(hipStep) + ' mm wide - the plan is too shallow for this bar count.');
        }

        var totalBarLength      =  0;
        var totalTransomLength  =  0;
        var i;
        for (i = 0; i < bars.length; i++) {
            if (bars[i].Role === 'transom') {
                totalTransomLength  +=  bars[i].LengthMm;
            } else {
                totalBarLength      +=  bars[i].LengthMm;
            }
        }

        return {
            Meta : {
                DivisionMode            : divisionMode,
                LongSlopeBarCount       : longCount,
                ShortSlopeBarCount      : shortCount,
                ResolvedLongSpacingMm   : resolvedSpacing,
                ResolvedShortSpacingMm  : resolvedSpacing,
                TotalBarLengthMm        : totalBarLength,
                TransomEnabled          : transomEnabled,
                TotalTransomLengthMm    : totalTransomLength
            },
            Bars      : bars,
            Warnings  : warnings
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
        VghLantern__GlazeBarLayout__Layout           : VghLantern__GlazeBarLayout__Layout,
        VghLantern__GlazeBarLayout__ResolveBarCount  : VghLantern__GlazeBarLayout__ResolveBarCount,
        VghLantern__GlazeBarLayout__DivisionOffsets  : VghLantern__GlazeBarLayout__DivisionOffsets
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__GlazeBarLayout  =  VghLantern__Geometry__GlazeBarLayout;
