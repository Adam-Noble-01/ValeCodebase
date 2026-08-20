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

   THE SET-OUT IS ANCHORED TO THE END BLOCK, NOT TO THE EAVES

   This module used to normalise the target spacing across the WHOLE long eaves
   length and let the bars fall wherever that division put them. That is not how
   Vale set a lantern out, and it produced a roof where the bars drifted past the
   ridge end block by an arbitrary amount that changed with every width edit.

   The set-out now starts from the RIDGE SPAN - the distance between the two
   octagonal end blocks - and replicates that pitch outward towards the hips:

       1. Divide the ridge span into the whole number of panes that lands closest
          to the user's target spacing. That division is the resolved pitch.
       2. Place stations across the ridge span at that pitch.
       3. Replicate the same pitch outboard of each end block, towards the hips.
       4. The last pane at each end is whatever is left over. It is FLEXIBLE by
          design, and only intervened on when it gets too narrow to build - see
          MIN_END_PANE_WIDTH_MM below.

   Because the pitch divides the ridge span exactly, every station either lands
   on an end block or is a whole number of pitches away from one. The hip ends are
   then wrapped from that same station list, so the four-way convergence at the
   block is exact by construction rather than by tolerance.

   ---------------------------------------------------------------------------

   THE TWO SET-OUT MODES

   Both modes share the division above and differ only in where the stations sit
   relative to the end block. They are written as two separate functions rather
   than one function with a flag, because they are two different drawing office
   conventions and a reader should be able to see each one whole:

       Mode01  'Glaze Bar Locked Central To End Blocks'   (default)
               A station lands ON each end block centre. The long slope bar, the
               ridge and the hip end centre bar all converge on that point, which
               is the junction the block exists to make.
               -> VghLantern__GlazeBarLayout__Mode01__Stations

       Mode02  'Glazed Panel Central To End Blocks'
               Every station is offset half a pitch, so the block centre falls in
               the MIDDLE of a glazed pane rather than under a bar. There is no
               hip end centre bar in this mode - the pane straddles the hip end
               centreline exactly as it straddles the block on the long slopes.
               -> VghLantern__GlazeBarLayout__Mode02__Stations

   The mode is stored per lantern as
   Lantern__GlazingBars__Config__SetOutMode. The keys live on this module's public
   API; the labels, hints and menu diagrams live in
   VghLantern__AppData__GlazeBarSetOutModes, because they are presentation.

   ---------------------------------------------------------------------------

   LAYOUT RULES (Vale convention - the hip wrap):
   - One set-out  : a single pitch drives the whole lantern. The hip ends are not
                    set out independently, they are wrapped from the same station
                    list, which is what makes every bar land exactly on a hip or
                    block point.
   - Long slopes  : bars run square to the eaves, up the slope. A bar inboard of
                    the ridge ends terminates on the ridge; a bar outboard of
                    them terminates on the hip, walked in plan by
                    VghLantern__GlazeBarLayout__HipShortOffset.
   - Hip ends     : no radial fan. Each outboard bar turns on the hip and
                    continues square to the short eaves, out to the short eaves
                    edge at constant short offset. That second leg is emitted as
                    its own bar record - physically a separate mitred member -
                    carrying the hip end face's SlopeKey. Both legs share the hip
                    point exactly. In Mode01 each end also carries a centre bar on
                    the lantern centreline, in line with the ridge, because the
                    station on the block itself produces no wrap leg of its own.
   - Pyramid      : the ridge collapses to a point, so there is no span to divide
                    and no block to anchor to. The APEX is the convergence point
                    instead: the pitch is the target spacing as entered, Mode01
                    puts a station on the centreline through the apex and Mode02
                    offsets by half a pitch. Everything downstream is unchanged,
                    including a non-square plan where the hips are not at 45
                    degrees.

   OUTPUT CONTRACT - GlazeBarSet:

   {
       Meta : {
           LongSlopeBarCount, ShortSlopeBarCount,
           ResolvedLongSpacingMm, ResolvedShortSpacingMm,
           TotalBarLengthMm, TransomEnabled, TotalTransomLengthMm
       },
       SetOut   : { ...see below... },
       Bars     : [ { Id, Role, SlopeKey, Start, End, LengthMm, EavesEnd } ],
       Warnings : []
   }

   Bar roles : 'glazingBar' | 'transom'
   EavesEnd  : 'start' | 'end' | null - which endpoint sits on the eaves datum
               ring. LengthMm is the DATUM length between the solved endpoints;
               the per-part cut lengths at the eaves (core +42.5 along pitch,
               cap +170, trim plumb cut) are applied downstream from this stamp
               via VghLantern__Geometry__BaseFrameAssembly.

   ShortSlopeBarCount is derived, not entered - it is the number of bars on one
   hip end face. Both spacing values report the single set-out pitch and are kept
   as separate keys only for the existing consumers.

   SetOut is ADDITIVE and exists so that anything drawing or reporting the
   set-out reads the same station list the bars were built from, rather than
   re-deriving it and drifting:

   {
       ModeKey              : 'Mode01' | 'Mode02',
       DividesRidgeSpan     : true on a ridged roof, false on a pyramid,
       DivideSpanMm         : the ridge span that was divided, 0 on a pyramid,
       RidgePaneCount       : whole panes across that span, 0 on a pyramid,
       SpacingMm            : the resolved pitch, one number for the whole roof,
       LongAxis             : 'x' | 'y' - which world axis the long span runs on,
       LongAxisStationsMm   : bar offsets along the long axis, ascending, centred
                              on zero,
       ShortAxisStationsMm  : hip end leg offsets along the short axis, ascending,
                              centred on zero,
       LongAxisHalfSpanMm   : half the long eaves span, so a consumer can close
                              the chain out to the corner,
       ShortAxisHalfSpanMm  : half the short eaves span,
       EndPaneWidthMm       : the flexible end pane, measured along the long eaves
                              from the outermost bar to the eaves corner,
       EndPaneTrimmed       : true when an outermost bar was removed to keep that
                              pane buildable
   }

   ============================================================================= */

// =============================================================================
// REGION | Glaze Bar Layout Module
// =============================================================================

const VghLantern__Geometry__GlazeBarLayout = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Set-Out Mode Keys
    // ------------------------------------------------------------
    // The stored values of Lantern__GlazingBars__Config__SetOutMode. Deliberately
    // terse: the human labels are presentation and live with the menu diagrams in
    // VghLantern__AppData__GlazeBarSetOutModes, so a label reword never touches a
    // saved project file.
    const MODE_BAR_CENTRED   =  'Mode01';                                    // <-- Glaze Bar Locked Central To End Blocks
    const MODE_PANE_CENTRED  =  'Mode02';                                    // <-- Glazed Panel Central To End Blocks
    const MODE_DEFAULT       =  MODE_BAR_CENTRED;                            // <-- What an unset or unrecognised value resolves to
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Layout Guards
    // ------------------------------------------------------------
    const MAX_BARS_PER_SLOPE     =  80;                                      // <-- Runaway guard on the station walk, not a design limit: the widest lantern the schema allows at the tightest spacing it allows resolves to 61 stations, so a legal configuration can never reach this
    const MIN_PANE_WIDTH_MM      =  120;                                     // <-- Below this a pane is unbuildable
    const MIN_END_PANE_WIDTH_MM  =  200;                                     // <-- The flexible end pane is left alone above this. Below it the outermost bar is removed and one wider final pane accepted, because a sliver of glass in the corner of a hip is not a panel anybody can make
    const TRANSOM_HEIGHT_FACTOR  =  0.5;                                     // <-- Transom sits at half the slope rise
    const STATION_TOLERANCE_MM   =  0.5;                                     // <-- Below this an offset is treated as sitting on the centreline
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
            LongAxis          : meta.LongAxis,
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Set-Out - Shared Division
// -----------------------------------------------------------------------------
// Everything both modes agree on: what span gets divided, into how many panes,
// and how a half station list is mirrored into a symmetric one. The two modes
// then differ ONLY in where they put their stations relative to the end block.
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Normalise the Stored Set-Out Mode Value
    // ------------------------------------------------------------
    // Anything unrecognised - an empty field on a project saved before modes
    // existed, or a hand-edited typo - resolves to the default rather than
    // producing a lantern with no bars on it.
    function VghLantern__GlazeBarLayout__ResolveModeKey(rawValue) {
        return String(rawValue) === MODE_PANE_CENTRED ? MODE_PANE_CENTRED : MODE_DEFAULT;
    }
    // ------------------------------------------------------------


    // FUNCTION | Divide the Ridge Span into Whole Panes at the Target Spacing
    // ------------------------------------------------------------
    // The RIDGE SPAN is the divided span, not the eaves length. That is the whole
    // correction: the ridge is the run between the two end blocks, and normalising
    // to it is what lets the resolved pitch land a station on each block.
    //
    // A pyramid has no ridge span, so there is nothing to normalise against. The
    // target spacing is used as entered and the apex becomes the anchor instead.
    function VghLantern__GlazeBarLayout__ResolveDivision(frame, targetSpacingMm) {
        var target     =  Math.max(1, Number(targetSpacingMm) || 0);          // <-- Guard against a zero or junk spacing
        var ridgeSpan  =  frame.RidgeHalfLengthMm * 2;

        if (ridgeSpan <= STATION_TOLERANCE_MM) {
            return {
                DividesRidgeSpan : false,
                DivideSpanMm     : 0,
                RidgePaneCount   : 0,
                SpacingMm        : target
            };
        }

        var paneCount  =  Math.max(1, Math.round(ridgeSpan / target));        // <-- Closest whole division of the ridge

        return {
            DividesRidgeSpan : true,
            DivideSpanMm     : ridgeSpan,
            RidgePaneCount   : paneCount,
            SpacingMm        : ridgeSpan / paneCount
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mirror a Half Station List into a Symmetric One
    // ------------------------------------------------------------
    // Both modes generate one side and mirror it, so a pair is exactly equal and
    // opposite. Accumulating across the whole span instead leaves a mirrored pair
    // differing in the last bits, which is enough to make a bar sitting on a
    // threshold survive at one hip end and be culled at the other - a visible
    // asymmetry. A station on the centreline appears exactly once.
    function VghLantern__GlazeBarLayout__MirrorHalfSet(halfSet) {
        var positives  =  [];
        var hasCentre  =  false;
        var i, value;

        for (i = 0; i < halfSet.length; i++) {
            value  =  halfSet[i];
            if (Math.abs(value) <= STATION_TOLERANCE_MM) { hasCentre  =  true; continue; }
            if (value > 0) positives.push(value);
        }

        positives.sort(function(a, b) { return a - b; });

        var stations  =  [];
        for (i = positives.length - 1; i >= 0; i--) stations.push(-positives[i]);
        if (hasCentre) stations.push(0);
        for (i = 0; i < positives.length; i++) stations.push(positives[i]);

        return stations;                                                      // <-- Ascending, centred on zero
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Replicate the Pitch Outboard of the End Block
    // ------------------------------------------------------------
    // Shared by both modes because "carry on at the same pitch towards the hip"
    // is the same instruction either side of the half pitch offset. firstOffsetMm
    // is how far outboard of the block the first outboard station sits: zero one
    // whole pitch in Mode01, half a pitch in Mode02.
    function VghLantern__GlazeBarLayout__WalkOutboard(halfSet, frame, spacingMm, firstOffsetMm) {
        var anchor  =  frame.RidgeHalfLengthMm;
        var limit   =  frame.HalfLongMm;
        var step;
        var offset;

        for (step = 0; step < MAX_BARS_PER_SLOPE; step++) {
            offset  =  anchor + firstOffsetMm + (step * spacingMm);
            if (offset >= limit - STATION_TOLERANCE_MM) return;               // <-- Reached the eaves corner
            halfSet.push(offset);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep the Flexible End Pane Buildable
    // ------------------------------------------------------------
    // The pane between the outermost bar and the eaves corner is deliberately
    // flexible - it absorbs whatever the ridge division leaves over, and that is
    // correct. It only stops being correct when it gets so narrow that the glass
    // is not a panel anybody can make. At that point the outermost bar is removed
    // and ONE wider final pane accepted, which is the drawing office answer.
    //
    // Removed as a symmetric pair, never one end only, and never down to a slope
    // with no bars left on it at all.
    function VghLantern__GlazeBarLayout__TrimNarrowEndPane(frame, stations) {
        var result  =  {
            Stations       : stations,
            EndPaneWidthMm : frame.HalfLongMm,
            Trimmed        : false
        };
        if (stations.length === 0) return result;

        var outermost  =  Math.abs(stations[stations.length - 1]);
        result.EndPaneWidthMm  =  frame.HalfLongMm - outermost;

        if (result.EndPaneWidthMm >= MIN_END_PANE_WIDTH_MM) return result;
        if (stations.length < 3) return result;                               // <-- Trimming here would strip the slope bare

        result.Stations        =  stations.slice(1, stations.length - 1);
        result.EndPaneWidthMm  =  frame.HalfLongMm - Math.abs(result.Stations[result.Stations.length - 1]);
        result.Trimmed         =  true;

        return result;
    }
    // ------------------------------------------------------------


    // FUNCTION | Derive the Hip End Leg Offsets from the Long Axis Stations
    // ------------------------------------------------------------
    // The hip ends are never set out independently. Every long slope bar that
    // cannot reach the ridge turns on the hip and carries on square to the short
    // eaves, so the hip end station list is the long axis list walked onto the
    // hip in plan. Mode01 adds the centreline, which is where the end block sits
    // and where that mode's centre bar runs; Mode02 has no bar there by design.
    function VghLantern__GlazeBarLayout__HipEndStations(frame, longStations, modeKey) {
        var halfSet  =  [];
        var i, shortOffset;

        // Only the positive half of the long axis list is walked. The list is
        // symmetric, so taking both halves would offer every offset twice and the
        // mirror would then double every leg.
        for (i = 0; i < longStations.length; i++) {
            if (longStations[i] <= STATION_TOLERANCE_MM) continue;
            shortOffset  =  VghLantern__GlazeBarLayout__HipShortOffset(frame, longStations[i]);
            if (shortOffset <= STATION_TOLERANCE_MM) continue;                 // <-- Station reaches the ridge, so it turns no corner
            halfSet.push(shortOffset);
        }

        if (modeKey === MODE_BAR_CENTRED && longStations.length > 0) halfSet.push(0);

        return VghLantern__GlazeBarLayout__MirrorHalfSet(halfSet);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Set-Out Mode 01 - Glaze Bar Locked Central To End Blocks
// -----------------------------------------------------------------------------
// THE DEFAULT. A glaze bar station lands exactly ON each octagonal end block, so
// the long slope bar, the ridge and the hip end centre bar all converge on the
// one point the block exists to make. The pitch resolved from the ridge span is
// then replicated back outward, away from the ridge, towards each hip.
//
//        eaves corner                block            block                eaves corner
//             |                        |                |                       |
//        |----|----|----|----|----|----|----|----|----|----|----|----|----|-----|
//         flex                       <-------- ridge span --------->        flex
//                                     divided into whole panes
// -----------------------------------------------------------------------------

    // FUNCTION | Mode 01 Station List Along the Long Axis
    // ------------------------------------------------------------
    // Generated as one half and mirrored. The inboard walk steps back from the
    // block towards the lantern centreline: exactly paneCount steps span the
    // ridge, so half of them reach the centreline and the mirror completes the
    // span without accumulating any error across it.
    //
    // On a pyramid the anchor collapses to zero, which puts the first station on
    // the lantern centreline running straight up to the apex. That is the correct
    // pyramid set-out and needs no special casing.
    function VghLantern__GlazeBarLayout__Mode01__Stations(frame, division) {
        var spacing  =  division.SpacingMm;
        var anchor   =  frame.RidgeHalfLengthMm;                              // <-- The end block centre
        var halfSet  =  [];
        var step, offset;

        // INBOARD | From the block back across the ridge towards the centreline.
        var inboardSteps  =  Math.floor(division.RidgePaneCount / 2);
        for (step = 0; step <= inboardSteps; step++) {
            offset  =  anchor - (step * spacing);
            if (offset < -STATION_TOLERANCE_MM) break;
            halfSet.push(offset);
        }

        // OUTBOARD | The same pitch replicated away from the ridge, one whole
        // pitch clear of the block because the block itself already has a bar.
        VghLantern__GlazeBarLayout__WalkOutboard(halfSet, frame, spacing, spacing);

        return VghLantern__GlazeBarLayout__MirrorHalfSet(halfSet);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Set-Out Mode 02 - Glazed Panel Central To End Blocks
// -----------------------------------------------------------------------------
// The same ridge division, every station shifted half a pitch, so the end block
// falls in the MIDDLE of a glazed pane instead of under a bar. The half pane left
// inside the ridge span and the half pane left outside it are the two halves of
// one pane that reads continuously across the block.
//
// There is no hip end centre bar in this mode: the pane straddles the hip end
// centreline exactly as it straddles the block on the long slopes.
//
//        eaves corner                block            block                eaves corner
//             |                        |                |                       |
//        |--|----|----|----|----|----|-|-|----|----|----|-|--|----|----|----|---|
//         flex                       <-------- ridge span --------->        flex
// -----------------------------------------------------------------------------

    // FUNCTION | Mode 02 Station List Along the Long Axis
    // ------------------------------------------------------------
    // Identical division to Mode 01 and identical outboard replication. The only
    // difference is the half pitch offset applied to the anchor, which is what
    // moves the pane centre onto the block.
    //
    // The inboard walk takes one more step than Mode 01 for an odd pane count,
    // because shifting the stations by half a pitch shifts one of them onto the
    // lantern centreline rather than off the end of the walk.
    function VghLantern__GlazeBarLayout__Mode02__Stations(frame, division) {
        var spacing    =  division.SpacingMm;
        var halfPitch  =  spacing / 2;
        var anchor     =  frame.RidgeHalfLengthMm;                            // <-- The end block centre
        var halfSet    =  [];
        var step, offset;

        // INBOARD | The first station sits half a pitch inboard of the block, so
        // the pane it forms with its mirror is centred on the block.
        var inboardSteps  =  Math.ceil(division.RidgePaneCount / 2);
        for (step = 0; step < inboardSteps; step++) {
            offset  =  anchor - halfPitch - (step * spacing);
            if (offset < -STATION_TOLERANCE_MM) break;
            halfSet.push(offset);
        }

        // OUTBOARD | The same pitch replicated away from the ridge, starting half
        // a pitch outboard of the block to complete the pane centred on it.
        VghLantern__GlazeBarLayout__WalkOutboard(halfSet, frame, spacing, halfPitch);

        return VghLantern__GlazeBarLayout__MirrorHalfSet(halfSet);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Slope Bar Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Push a Bar onto the Collection
    // ------------------------------------------------------------
    // eavesEndKey says which endpoint sits on the eaves datum ring: 'start',
    // 'end' or null (transoms never touch it). Downstream consumers - the 3D
    // composite's per-part end cuts and the takeoff's per-part lengths - read
    // the stamp rather than re-deriving it from levels.
    function VghLantern__GlazeBarLayout__PushBar(bars, id, role, slopeKey, startPt, endPt, eavesEndKey) {
        var Solver  =  window.VghLantern__Geometry__SkeletonSolver;
        var length  =  Solver.VghLantern__SkeletonSolver__Distance(startPt, endPt);
        if (length <= 0) return;

        bars.push({
            Id       : id,
            Role     : role,
            SlopeKey : slopeKey,
            Start    : startPt,
            End      : endPt,
            LengthMm : length,
            EavesEnd : eavesEndKey === 'start' || eavesEndKey === 'end' ? eavesEndKey : null
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Lay Bars onto One Long Slope
    // ------------------------------------------------------------
    // shortSign selects which long slope: -1 for the -v side, +1 for the +v side.
    function VghLantern__GlazeBarLayout__BuildLongSlopeBars(bars, frame, shortSign, stations, slopeKey) {
        var i, longOffset, endShortOffset, startPt, endPt;

        for (i = 0; i < stations.length; i++) {
            longOffset  =  stations[i];

            // Inboard of the ridge ends the bar reaches the ridge (v = 0).
            // Outboard it stops on the hip, walked in plan by the helper.
            endShortOffset  =  VghLantern__GlazeBarLayout__HipShortOffset(frame, longOffset);

            startPt  =  frame.MapTo(longOffset, shortSign * frame.HalfShortMm, frame.EavesLevelMm);
            endPt    =  frame.MapTo(
                longOffset,
                shortSign * endShortOffset,
                VghLantern__GlazeBarLayout__LevelAtShortOffset(frame, endShortOffset)
            );

            VghLantern__GlazeBarLayout__PushBar(bars, 'bar_' + slopeKey + '_' + i, 'glazingBar', slopeKey, startPt, endPt, 'start');
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Wrap the Outboard Bars Around One Hip End
    // ------------------------------------------------------------
    // Vale convention: a bar that cannot reach the ridge turns on the hip and
    // continues square to the SHORT eaves out to the short eaves edge. Driven by
    // the same long axis station list, so the leg springs from exactly the point
    // the long slope bar terminated on and the hip junction is exact by
    // construction. shortSign selects which hip of the end, longSign which end.
    function VghLantern__GlazeBarLayout__BuildHipEndBars(bars, frame, longSign, shortSign, stations, slopeKey) {
        var hipKey  =  shortSign < 0 ? 'n' : 'p';                            // <-- Keeps ids unique across the two hips of one end
        var i, absLongOffset, shortOffset, hipLongOffset, level, startPt, endPt;

        for (i = 0; i < stations.length; i++) {
            hipLongOffset  =  stations[i];
            if (hipLongOffset * longSign <= 0) continue;                      // <-- Belongs to the opposite hip end

            absLongOffset  =  Math.abs(hipLongOffset);
            shortOffset    =  VghLantern__GlazeBarLayout__HipShortOffset(frame, absLongOffset);
            if (shortOffset <= STATION_TOLERANCE_MM) continue;                // <-- Station is on the end block itself, so it turns no corner

            level  =  VghLantern__GlazeBarLayout__LevelAtLongOffset(frame, absLongOffset);

            startPt  =  frame.MapTo(hipLongOffset, shortSign * shortOffset, level);
            endPt    =  frame.MapTo(longSign * frame.HalfLongMm, shortSign * shortOffset, frame.EavesLevelMm);

            VghLantern__GlazeBarLayout__PushBar(bars, 'bar_hip_' + slopeKey + '_' + hipKey + '_' + i, 'glazingBar', slopeKey, startPt, endPt, 'end');
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Lay the Centre Bar of One Hip End
    // ------------------------------------------------------------
    // MODE 01 ONLY. The station that lands on the end block produces no wrap leg
    // of its own - it terminates at the block rather than turning a corner - so
    // the bar that carries on from the block, down the hip end centreline to the
    // short eaves, is laid explicitly. On a pyramid it springs from the apex.
    //
    // Mode 02 has no bar here on purpose: its pane is centred on the block and
    // straddles this centreline.
    function VghLantern__GlazeBarLayout__BuildHipEndCentreBar(bars, frame, longSign, slopeKey) {
        var startPt  =  frame.MapTo(longSign * frame.RidgeHalfLengthMm, 0, frame.EavesLevelMm + frame.RiseMm);
        var endPt    =  frame.MapTo(longSign * frame.HalfLongMm,        0, frame.EavesLevelMm);

        VghLantern__GlazeBarLayout__PushBar(bars, 'bar_hipcentre_' + slopeKey, 'glazingBar', slopeKey, startPt, endPt, 'end');
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
                frame.MapTo( halfExtent, signs[i] * shortOffset, level),
                null
            );
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Set-Out Warnings
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Collect Every Buildability Warning for a Resolved Set-Out
    // ------------------------------------------------------------
    // Kept out of the entry point so the entry point reads as the sequence of
    // decisions it is, rather than as a solve interleaved with commentary.
    function VghLantern__GlazeBarLayout__CollectWarnings(frame, division, setOut, warnings) {
        if (division.SpacingMm < MIN_PANE_WIDTH_MM) {
            warnings.push('Resolved pane width is ' + Math.round(division.SpacingMm)
                + ' mm, below the ' + MIN_PANE_WIDTH_MM + ' mm minimum - increase the target spacing.');
        }

        // A shallow hip end compresses the set-out, so the hip end panes can be
        // unbuildable even when the long slope panes are comfortable.
        var hipStep  =  frame.EndSlopeRunMm > 0
            ? frame.HalfShortMm * (division.SpacingMm / frame.EndSlopeRunMm)
            : division.SpacingMm;

        if (setOut.ShortAxisStationsMm.length > 1 && hipStep < MIN_PANE_WIDTH_MM) {
            warnings.push('Hip end panes are only ' + Math.round(hipStep)
                + ' mm wide - the plan is too shallow for this bar spacing.');
        }

        // The long eaves end pane is trimmed back into range automatically. The
        // SHORT eaves end pane is not, because culling its leg would leave a long
        // slope bar terminating on a hip with nothing carrying on from it. On a
        // square plan the two end panes are the same station and this never
        // fires; on a markedly rectangular pyramid it can, and it is worth saying.
        var shortStations  =  setOut.ShortAxisStationsMm;
        if (shortStations.length > 0) {
            var shortEndPane  =  frame.HalfShortMm - Math.abs(shortStations[shortStations.length - 1]);
            if (shortEndPane < MIN_END_PANE_WIDTH_MM) {
                warnings.push('The end pane on the hip end is only ' + Math.round(shortEndPane)
                    + ' mm wide - adjust the target spacing or the plan proportions.');
            }
        }

        if (setOut.LongAxisStationsMm.length >= MAX_BARS_PER_SLOPE) {
            warnings.push('Bar count hit the ' + MAX_BARS_PER_SLOPE
                + ' per slope layout ceiling - the set-out has been truncated.');
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

        var modeKey  =  VghLantern__GlazeBarLayout__ResolveModeKey(barsCfg['Lantern__GlazingBars__Config__SetOutMode']);
        var division =  VghLantern__GlazeBarLayout__ResolveDivision(
            frame, barsCfg['Lantern__GlazingBars__Config__TargetSpacingMm']);

        // THE ONE BRANCH BETWEEN THE TWO MODES. Everything after this line is
        // identical for both, because a mode is nothing more than where its
        // stations sit - the bars, the wrap and the takeoff all follow from them.
        var stations  =  (modeKey === MODE_PANE_CENTRED)
            ? VghLantern__GlazeBarLayout__Mode02__Stations(frame, division)
            : VghLantern__GlazeBarLayout__Mode01__Stations(frame, division);

        var trim  =  VghLantern__GlazeBarLayout__TrimNarrowEndPane(frame, stations);
        stations  =  trim.Stations;

        var hipEndStations  =  VghLantern__GlazeBarLayout__HipEndStations(frame, stations, modeKey);

        VghLantern__GlazeBarLayout__BuildLongSlopeBars(bars, frame, -1, stations, 'short-');
        VghLantern__GlazeBarLayout__BuildLongSlopeBars(bars, frame,  1, stations, 'short+');

        VghLantern__GlazeBarLayout__BuildHipEndBars(bars, frame, -1, -1, stations, 'long-');
        VghLantern__GlazeBarLayout__BuildHipEndBars(bars, frame, -1,  1, stations, 'long-');
        VghLantern__GlazeBarLayout__BuildHipEndBars(bars, frame,  1, -1, stations, 'long+');
        VghLantern__GlazeBarLayout__BuildHipEndBars(bars, frame,  1,  1, stations, 'long+');

        // Mode 01 only - see BuildHipEndCentreBar for why Mode 02 has none.
        if (modeKey === MODE_BAR_CENTRED && stations.length > 0) {
            VghLantern__GlazeBarLayout__BuildHipEndCentreBar(bars, frame, -1, 'long-');
            VghLantern__GlazeBarLayout__BuildHipEndCentreBar(bars, frame,  1, 'long+');
        }

        var transomEnabled  =  barsCfg['Lantern__GlazingBars__Config__HorizontalTransomEnabled'] === true;
        if (transomEnabled) VghLantern__GlazeBarLayout__BuildTransoms(bars, frame);

        var setOut  =  {
            ModeKey              : modeKey,
            DividesRidgeSpan     : division.DividesRidgeSpan,
            DivideSpanMm         : division.DivideSpanMm,
            RidgePaneCount       : division.RidgePaneCount,
            SpacingMm            : division.SpacingMm,
            LongAxis             : frame.LongAxis,
            LongAxisStationsMm   : stations,
            ShortAxisStationsMm  : hipEndStations,
            LongAxisHalfSpanMm   : frame.HalfLongMm,
            ShortAxisHalfSpanMm  : frame.HalfShortMm,
            EndPaneWidthMm       : trim.EndPaneWidthMm,
            EndPaneTrimmed       : trim.Trimmed
        };

        VghLantern__GlazeBarLayout__CollectWarnings(frame, division, setOut, warnings);

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
                LongSlopeBarCount       : stations.length,
                ShortSlopeBarCount      : hipEndStations.length,
                ResolvedLongSpacingMm   : division.SpacingMm,
                ResolvedShortSpacingMm  : division.SpacingMm,
                TotalBarLengthMm        : totalBarLength,
                TransomEnabled          : transomEnabled,
                TotalTransomLengthMm    : totalTransomLength
            },
            SetOut    : setOut,
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
        VghLantern__GlazeBarLayout__Layout            : VghLantern__GlazeBarLayout__Layout,
        VghLantern__GlazeBarLayout__ResolveModeKey    : VghLantern__GlazeBarLayout__ResolveModeKey,
        VghLantern__GlazeBarLayout__ResolveDivision   : VghLantern__GlazeBarLayout__ResolveDivision,
        VghLantern__GlazeBarLayout__Mode01__Stations  : VghLantern__GlazeBarLayout__Mode01__Stations,
        VghLantern__GlazeBarLayout__Mode02__Stations  : VghLantern__GlazeBarLayout__Mode02__Stations,

        VGHLANTERN__GLAZEBAR__MODE_BAR_CENTRED   : MODE_BAR_CENTRED,
        VGHLANTERN__GLAZEBAR__MODE_PANE_CENTRED  : MODE_PANE_CENTRED,
        VGHLANTERN__GLAZEBAR__MODE_DEFAULT       : MODE_DEFAULT,
        VGHLANTERN__GLAZEBAR__MIN_END_PANE_MM    : MIN_END_PANE_WIDTH_MM
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__GlazeBarLayout  =  VghLantern__Geometry__GlazeBarLayout;
