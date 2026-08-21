/* =============================================================================
   VGHLANTERN - RIDGE ASSEMBLY GEOMETRY
   =============================================================================

   FILE       : VghLantern__Geometry__RidgeAssembly__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - RidgeAssembly
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Pure geometry for the Vale ridge and the octagonal block it dies into
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - The one place the ridge construction is reasoned about. Both render
     environments and the takeoff consume this module's answers; none re-derives
     them.
   - THE DATUM: the ridge datum is the ridge centreline the skeleton solver
     publishes, running between the two ridge end points at RidgeLevelMm. Every
     ridge section is authored about it: section 0,0 sits on the datum, section
     -y hangs into the room and +y stacks out through the roof.
   - THE STACK, from the datum outwards:
         beam          -241 .. -11    Sapele, seen from the room
         core           -53.5 .. 63   mill aluminium spine
         blocking        23.9 .. 75   timber, substrate for the lead
         flashing         2.8 .. 77   lead, the weathering projection
         cappingBlock      77 .. 97   timber upstand, capped type only
         capping           56 .. 100  powder coated aluminium, capped type only
   - THE END CAP: a cast aluminium cap closes each end of that capping, placed on
     the ridge end point over the block. It occupies the same 56..100 band and
     presents a socket face 95mm in from the end whose section is the capping's
     own outline, so the capping is cut back to that plane and the finial seats on
     the cap's 100 top face rather than on thin air.
   - PITCH: the beam depth comes from the shared timber depth table and is
     reached by STRETCHING the authored section below its moulding, never by
     scaling it. The blocking's seating faces and the flashing's wings follow the
     roof pitch and are re-solved about declared hinges.
   - THE BLOCK: an octagonal turned block sits at each ridge end point with its
     origin on that point. The ridge beam and all four hip beams are plumb cut
     against its facets, 67.5mm from its centre. Its straight prism stretches in
     step with the ridge beam depth so the beam undersides keep their clearance
     above the turning.
   - Contains no DOM access and no fetches. Faces passed in are never mutated;
     transformed copies are returned.

   ---------------------------------------------------------------------------

   WHY THE BEAM IS CUT AND THE REST IS NOT

   The beam dies into the block: it is the member you see from inside the room
   and its moulded end has to finish clean on a flat facet, so it is plumb cut
   67.5mm short of the block centre at each end.

   The core, the blocking and the flashing do not. They are a welded spine and the
   weathering above it, they run the full ridge datum length and they carry on over
   the block. The overhang past the block centre is declared as zero in the system
   index rather than assumed here, so the day a real overhang is dimensioned it is
   one number in a data file and no code at all.

   The capping is the third case and is cut for a different reason again: not to
   die into the block below it, but to die into the end cap in front of it. That
   cut is a plumb plane like the beam's, taken at the end cap inset rather than the
   block facet inset, which is why EndPlanesForPart answers per part rather than
   the call site deciding.

   ============================================================================= */

// =============================================================================
// REGION | Ridge Assembly Geometry Module
// =============================================================================

const VghLantern__Geometry__RidgeAssembly = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Numeric Guards and Fallbacks
    // ------------------------------------------------------------
    const DEG_TO_RAD              =  Math.PI / 180;
    const MIN_RIDGE_LENGTH_MM     =  1;                                      // <-- Below this the ridge has collapsed to a pyramid apex
    const ROLE_RIDGE              =  'ridge';

    // Mirror the ridge system index. Used only if the loader is absent, which a
    // correctly ordered script load never allows.
    const FALLBACK_FACET_INSET_MM      =  67.5;
    const FALLBACK_BLOCK_SPLIT_Z_MM    =  -247;
    const FALLBACK_AUTHORED_PITCH_DEG  =  22.5;
    const FALLBACK_END_CAP_INSET_MM    =  95.0;

    const PART_KEY_BEAM     =  'beam';                                       // <-- Plumb cut into the block facet
    const PART_KEY_CAPPING  =  'capping';                                    // <-- Plumb cut into the end cap socket

    const ANCHOR_ROLE_RIDGE_END  =  'ridgeEnd';                              // <-- Cap with a ridge return
    const ANCHOR_ROLE_APEX       =  'apex';                                  // <-- Cap with none, four hips and no ridge

    const QUARTER_TURN_DEG  =  90;                                           // <-- Local +Y sits a quarter turn off local +X
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loader Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Modules This One Reads From, if Present
    // ------------------------------------------------------------
    function VghLantern__RidgeAssembly__Loader() {
        return window.VghLantern__AppData__RidgeSystemLoader || null;
    }
    function VghLantern__RidgeAssembly__DepthTable() {
        return window.VghLantern__AppData__RidgeHipDepthTable || null;
    }
    function VghLantern__RidgeAssembly__Stretch() {
        return window.VghLantern__Geometry__StretchTools || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Block Relationship Numbers (synchronous)
    // ------------------------------------------------------------
    function VghLantern__RidgeAssembly__BlockGeometry() {
        var loader  =  VghLantern__RidgeAssembly__Loader();
        var block   =  loader ? loader.VghLantern__RidgeSystemLoader__BlockRelationship() : null;

        return {
            FacetInsetMm     : block ? Number(block.FacetInsetMm)    : FALLBACK_FACET_INSET_MM,
            StretchSplitZMm  : block ? Number(block.StretchSplitZMm) : FALLBACK_BLOCK_SPLIT_Z_MM,
            AcrossFlatsMm    : block ? Number(block.AcrossFlatsMm)   : (FALLBACK_FACET_INSET_MM * 2),
            PrismTopZMm      : block ? Number(block.PrismTopZMm)     : -27
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The End Cap Relationship Numbers (synchronous)
    // ------------------------------------------------------------
    // The one number this module actually reasons with is the capping inset. The
    // seating band is carried alongside it because it is what makes the inset
    // legible: the cap fills the same 56..100 the capping section does, so cutting
    // the capping back to the cap's socket leaves no gap and no overlap.
    //
    // The fallback mirrors the index for a lantern whose data files have not
    // loaded, exactly as the block fallbacks do.
    function VghLantern__RidgeAssembly__EndCapGeometry() {
        var loader  =  VghLantern__RidgeAssembly__Loader();
        var cap     =  loader ? loader.VghLantern__RidgeSystemLoader__EndCapRelationship() : null;

        return {
            CappingInsetMm : cap ? Number(cap.CappingInsetMm) : FALLBACK_END_CAP_INSET_MM,
            SeatBaseZMm    : cap ? Number(cap.SeatBaseZMm)    : 56,
            SeatTopZMm     : cap ? Number(cap.SeatTopZMm)     : 100
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Depth Resolution
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Ridge and Hip Beam Depths for a Lantern
    // ------------------------------------------------------------
    // Answers the whole pair, not just the ridge, because the pair is one
    // decision and a caller holding half of it would be holding the half that
    // does not explain itself. The hip builder asks the same question of the same
    // function and gets the same answer.
    //
    // Falls back to the authored standard when the depth table is absent, which
    // draws every section exactly as exported: a lantern that has lost its data
    // files still shows a correct 22.5 degree ridge rather than nothing.
    function VghLantern__RidgeAssembly__DepthResolution(lantern, skeleton) {
        var Table  =  VghLantern__RidgeAssembly__DepthTable();
        var pitch  =  VghLantern__RidgeAssembly__PitchDegrees(skeleton);

        var ridgeAdjust  =  0;
        var hipAdjust    =  0;

        var ridgeLoader  =  VghLantern__RidgeAssembly__Loader();
        var hipLoader    =  window.VghLantern__AppData__HipSystemLoader || null;

        if (ridgeLoader) ridgeAdjust  =  ridgeLoader.VghLantern__RidgeSystemLoader__DepthAdjustmentMm(lantern);
        if (hipLoader)   hipAdjust    =  hipLoader.VghLantern__HipSystemLoader__DepthAdjustmentMm(lantern);

        if (!Table) {
            return {
                PitchDegrees        : pitch,
                SnappedPitchDegrees : FALLBACK_AUTHORED_PITCH_DEG,
                WasSnapped          : false,
                TableLoaded         : false,
                Ridge : { StandardDepthMm : 230, AdjustmentMm : 0, RequestedAdjustmentMm : ridgeAdjust, DepthMm : 230,
                          AuthoredDepthMm : 230, DeltaFromAuthoredMm : 0, WasClamped : false },
                Hip   : { StandardDepthMm : 205, AdjustmentMm : 0, RequestedAdjustmentMm : hipAdjust,   DepthMm : 205,
                          AuthoredDepthMm : 205, DeltaFromAuthoredMm : 0, WasClamped : false }
            };
        }

        return Table.VghLantern__RidgeHipDepthTable__Resolve(pitch, ridgeAdjust, hipAdjust);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Roof Pitch a Solved Skeleton Was Built At
    // ------------------------------------------------------------
    function VghLantern__RidgeAssembly__PitchDegrees(skeleton) {
        var meta   =  (skeleton && skeleton.Meta) || {};
        var pitch  =  Number(meta.PitchDegrees);
        return isFinite(pitch) && pitch > 0 ? pitch : FALLBACK_AUTHORED_PITCH_DEG;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Transforms
// -----------------------------------------------------------------------------

    // FUNCTION | Transform Every Resolved Part's Section for a Roof
    // ------------------------------------------------------------
    // options:
    //     PitchDegrees   the roof pitch the seating faces and wings follow
    //     BeamDeltaMm    the beam stretch, signed along section +y and negative
    //                    for a deeper beam
    //
    // Returns a NEW part list. Faces on the incoming parts are the loader's
    // memoised stitch shared by every lantern on screen and are never written
    // through - a transform that did would leave the next lantern building from a
    // section already adapted to somebody else's roof.
    //
    // A part with nothing to do passes its faces through by reference, so a build
    // at 22.5 degrees with no override allocates nothing at all.
    function VghLantern__RidgeAssembly__SectionsForPitch(parts, options) {
        if (!Array.isArray(parts)) return [];

        var Stretch  =  VghLantern__RidgeAssembly__Stretch();
        if (!Stretch) {
            console.error('[VghLantern__RidgeAssembly] StretchTools is not loaded - sections drawn as authored.');
            return parts;
        }

        var pitch      =  Number(options && options.PitchDegrees) || FALLBACK_AUTHORED_PITCH_DEG;
        var beamDelta  =  Number(options && options.BeamDeltaMm)  || 0;

        var out  =  [];
        var i, part, faces, moves, adaptation, applied;

        for (i = 0; i < parts.length; i++) {
            part   =  parts[i];
            faces  =  part.Faces;

            // DEPTH STRETCH | The beam only. Everything past the split line
            // travels and the flanks above it lengthen to meet it.
            if (part.DepthStretch && beamDelta !== 0) {
                faces  =  Stretch.VghLantern__StretchTools__StretchFaces2d(faces, {
                    Axis       : part.DepthStretch.StretchAxis || 'y',
                    SplitValue : Number(part.DepthStretch.SplitYMm),
                    Side       : part.DepthStretch.StretchSide || 'below',
                    DeltaMm    : beamDelta
                });
            }

            // PITCH ADAPTATION | The blocking's seating faces and the flashing's
            // wings. A ridge section follows the roof pitch directly, so the
            // applied angle IS the pitch expressed as a delta from the angle the
            // section was authored at.
            adaptation  =  part.PitchAdaptation;
            if (adaptation) {
                applied  =  VghLantern__RidgeAssembly__AppliedAngleDegrees(adaptation, pitch);
                moves    =  Stretch.VghLantern__StretchTools__BuildPitchMoveMap(adaptation, applied);
                if (moves.length > 0) faces  =  Stretch.VghLantern__StretchTools__ApplyMoveMap2d(faces, moves);
            }

            out.push({
                PartKey          : part.PartKey,
                PartName         : part.PartName,
                AssetId          : part.AssetId,
                ElementType      : part.ElementType,
                ElementRole      : part.ElementRole,
                SpecMaterial     : part.SpecMaterial,
                FinishPalette    : part.FinishPalette,
                FinishSource     : part.FinishSource,
                SectionAreaSqMm  : part.SectionAreaSqMm,
                Faces            : faces
            });
        }

        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Angle a Ridge Section Should Now Be Cut At
    // ------------------------------------------------------------
    // Worked as a delta from the authored standard rather than as an absolute,
    // for the same reason the base frame head beam re-slope is: at the pitch the
    // asset was drawn at, nothing moves and the CAD standard survives untouched.
    // Only a ridge section reaches here, and a ridge section follows the roof
    // pitch, so the delta is simply the pitch difference.
    //
    // The reference pitch comes from the shared depth table rather than a
    // constant here, so the one statement of "what pitch was this library drawn
    // at" lives in one file. The hip module reads the same number for the same
    // reason.
    function VghLantern__RidgeAssembly__AppliedAngleDegrees(adaptation, pitchDegrees) {
        var Table     =  VghLantern__RidgeAssembly__DepthTable();
        var reference =  Table
            ? Number(Table.VghLantern__RidgeHipDepthTable__AuthoredStandard().AuthoredRoofPitchDegrees)
            : FALLBACK_AUTHORED_PITCH_DEG;

        if (!isFinite(reference)) reference  =  FALLBACK_AUTHORED_PITCH_DEG;

        var authored  =  Number(adaptation.AuthoredAngleDegrees);
        return authored + (Number(pitchDegrees) - reference);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Ridge Resolution From a Solved Skeleton
// -----------------------------------------------------------------------------

    // FUNCTION | The Ridge Member of a Solved Skeleton
    // ------------------------------------------------------------
    // Null on a pyramid, where the ridge has collapsed to a point and there is no
    // ridge to build - only a block at the apex.
    function VghLantern__RidgeAssembly__RidgeMember(skeleton) {
        var members  =  (skeleton && skeleton.Members) || [];
        var i, member, length;

        for (i = 0; i < members.length; i++) {
            member  =  members[i];
            if (!member || member.Role !== ROLE_RIDGE) continue;

            length  =  Math.hypot(member.End.x - member.Start.x,
                                  member.End.y - member.Start.y,
                                  member.End.z - member.Start.z);
            if (length < MIN_RIDGE_LENGTH_MM) return null;
            return member;
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Plan Direction the Ridge Runs In
    // ------------------------------------------------------------
    // A unit vector in plan, from Start towards End. The block is rotated to it
    // so a facet faces square down the ridge whichever way round the solver mapped
    // the long axis, and the hips then land on the diagonal facets for free.
    function VghLantern__RidgeAssembly__PlanDirection(member) {
        if (!member) return { x : 1, y : 0 };

        var dx   =  member.End.x - member.Start.x;
        var dy   =  member.End.y - member.Start.y;
        var len  =  Math.hypot(dx, dy);
        if (len <= 0) return { x : 1, y : 0 };

        return { x : dx / len, y : dy / len };
    }
    // ------------------------------------------------------------


    // FUNCTION | Where Every Octagonal Block Sits
    // ------------------------------------------------------------
    // One placement per ridge end, or a single placement at the apex on a
    // pyramid. Each carries the point its origin goes on and the plan rotation
    // that squares its facets to the roof.
    //
    // The block origin is placed DIRECTLY on the point, with no vertical offset.
    // The asset hangs from 27mm below its own origin, which is where its top face
    // belongs relative to the ridge datum, so an offset here would be correcting
    // something that is already right.
    function VghLantern__RidgeAssembly__BlockPlacements(skeleton) {
        var member  =  VghLantern__RidgeAssembly__RidgeMember(skeleton);

        if (member) {
            var direction  =  VghLantern__RidgeAssembly__PlanDirection(member);
            var rotation   =  Math.atan2(direction.y, direction.x) / DEG_TO_RAD;

            return [
                { Id : 'ridgeBlock__start', Point : VghLantern__RidgeAssembly__Copy(member.Start), PlanRotationDegrees : rotation },
                { Id : 'ridgeBlock__end',   Point : VghLantern__RidgeAssembly__Copy(member.End),   PlanRotationDegrees : rotation }
            ];
        }

        // PYRAMID | The hips converge on one apex and there is no ridge. The block
        // still belongs there: it is the junction the hips die into, which is what
        // the block is for, and a pyramid apex is a four hip junction rather than
        // the six member junction a ridge end is.
        var apex  =  VghLantern__RidgeAssembly__ApexPoint(skeleton);
        if (!apex) return [];

        return [{ Id : 'ridgeBlock__apex', Point : apex, PlanRotationDegrees : 0 }];
    }
    // ------------------------------------------------------------


    // FUNCTION | Where Every Ridge End Cap Sits
    // ------------------------------------------------------------
    // The same points the blocks go on, because it is the same junction seen from
    // above the roof rather than below it, and the cap is authored about that same
    // datum. So the origin goes straight on the point with no vertical offset, and
    // the cap's own 56..100 band puts it exactly over the capping.
    //
    // THE ROTATION, AND WHY THERE IS NO MIRRORED INSTANCE
    // The asset's local +Y points back down the ridge towards the middle, at a
    // quarter turn from its local +X. Squaring local +Y onto the inward direction
    // therefore means turning the cap to the ridge bearing LESS a quarter turn at
    // the start end, and PLUS a quarter turn at the far end. The cap is symmetric
    // across its local X, so that 180 degrees between the two IS the mirror the
    // workshop drawing calls for - there is no reflected geometry to build, and
    // both ends share one buffer.
    //
    // Each placement carries the anchor role it was solved from, because the two
    // roles take DIFFERENT cap assets: a ridge end takes the cap with the capping
    // socket, an apex takes the pyramid variant that closes as a full octagon.
    function VghLantern__RidgeAssembly__EndCapPlacements(skeleton) {
        var member  =  VghLantern__RidgeAssembly__RidgeMember(skeleton);

        if (member) {
            var direction  =  VghLantern__RidgeAssembly__PlanDirection(member);
            var bearing    =  Math.atan2(direction.y, direction.x) / DEG_TO_RAD;

            return [
                { Id : 'ridgeEndCap__start', Role : ANCHOR_ROLE_RIDGE_END,
                  Point : VghLantern__RidgeAssembly__Copy(member.Start),
                  PlanRotationDegrees : bearing - QUARTER_TURN_DEG },
                { Id : 'ridgeEndCap__end',   Role : ANCHOR_ROLE_RIDGE_END,
                  Point : VghLantern__RidgeAssembly__Copy(member.End),
                  PlanRotationDegrees : bearing + QUARTER_TURN_DEG }
            ];
        }

        // PYRAMID | No ridge, so no capping and no socket for one to open onto.
        // The apex still takes a cap: it is what the finial seats on, and without
        // one the finial stands 100mm clear of everything. The pyramid variant is
        // the same cap with the ridge return closed off, so its rotation is a free
        // choice and is left at zero to match the block below it.
        var apex  =  VghLantern__RidgeAssembly__ApexPoint(skeleton);
        if (!apex) return [];

        return [{ Id : 'ridgeEndCap__apex', Role : ANCHOR_ROLE_APEX, Point : apex, PlanRotationDegrees : 0 }];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Apex a Pyramid's Hips Converge On
    // ------------------------------------------------------------
    function VghLantern__RidgeAssembly__ApexPoint(skeleton) {
        var anchors  =  (skeleton && skeleton.FinialAnchors) || [];
        var members  =  (skeleton && skeleton.Members) || [];
        var i;

        for (i = 0; i < anchors.length; i++) {
            if (anchors[i] && anchors[i].Role === 'apex') return VghLantern__RidgeAssembly__Copy(anchors[i].Position);
        }

        for (i = 0; i < members.length; i++) {
            if (members[i] && members[i].Role === 'hip') return VghLantern__RidgeAssembly__Copy(members[i].End);
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Copy a Solver Point
    // ------------------------------------------------------------
    function VghLantern__RidgeAssembly__Copy(point) {
        return { x : Number(point.x), y : Number(point.y), z : Number(point.z) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | End Treatments
// -----------------------------------------------------------------------------

    // FUNCTION | The Two Plumb Cut Planes the Ridge Beam Dies Into
    // ------------------------------------------------------------
    // Returns { Start, End }, each { Point:{x,y,z}, Normal:{x,y,z} } in model mm,
    // or null on a pyramid. Both planes are vertical with a horizontal normal
    // along the ridge, set the block's facet inset in from their own end.
    //
    // A ridge runs level, so a plumb cut across it is also a square cut and the
    // planes could have been expressed as shortened end points. They are planes
    // anyway, because the hip beam's identical treatment is NOT square and one
    // shared idea across the two is worth more than the arithmetic saved.
    function VghLantern__RidgeAssembly__BeamEndPlanes(skeleton) {
        return VghLantern__RidgeAssembly__PlumbEndPlanes(
            skeleton, VghLantern__RidgeAssembly__BlockGeometry().FacetInsetMm);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Two Plumb Cut Planes the Ridge Capping Dies Into
    // ------------------------------------------------------------
    // The same construction as the beam's, taken at the END CAP inset rather than
    // the block facet inset. The cap presents a flat socket face that distance in
    // from the ridge end point, and that face IS the capping's own section, so a
    // capping cut on this plane meets it with no fitting.
    //
    // Null on a pyramid. There is no ridge to run a capping along, so there is
    // nothing to cut, and the pyramid cap has no socket for one to enter.
    function VghLantern__RidgeAssembly__CappingEndPlanes(skeleton) {
        return VghLantern__RidgeAssembly__PlumbEndPlanes(
            skeleton, VghLantern__RidgeAssembly__EndCapGeometry().CappingInsetMm);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Pair of Plumb Cut Planes Set In From Both Ridge Ends
    // ------------------------------------------------------------
    // Two parts take this treatment at two different insets - the beam at the
    // block facet, the capping at the end cap socket - and they differ in nothing
    // else, so the construction is written once and the distance is the argument.
    function VghLantern__RidgeAssembly__PlumbEndPlanes(skeleton, insetMm) {
        var member  =  VghLantern__RidgeAssembly__RidgeMember(skeleton);
        if (!member) return null;

        var direction  =  VghLantern__RidgeAssembly__PlanDirection(member);
        var inset      =  Number(insetMm) || 0;

        return {
            Start : {
                Point  : { x : member.Start.x + (direction.x * inset),
                           y : member.Start.y + (direction.y * inset),
                           z : member.Start.z },
                Normal : { x : direction.x, y : direction.y, z : 0 }
            },
            End : {
                Point  : { x : member.End.x - (direction.x * inset),
                           y : member.End.y - (direction.y * inset),
                           z : member.End.z },
                Normal : { x : direction.x, y : direction.y, z : 0 }
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The End Planes One Named Part Takes
    // ------------------------------------------------------------
    // The beam dies into the block below it and the capping dies into the end cap
    // in front of it. The spine and the two concealed layers between them run the
    // full ridge datum length and pass over the block. Answered per part rather
    // than decided at the call site so the mesh builder and the SketchUp encoder
    // each hold one loop and cannot disagree about which parts get cut.
    function VghLantern__RidgeAssembly__EndPlanesForPart(partKey, skeleton) {
        if (partKey === PART_KEY_BEAM)    return VghLantern__RidgeAssembly__BeamEndPlanes(skeleton);
        if (partKey === PART_KEY_CAPPING) return VghLantern__RidgeAssembly__CappingEndPlanes(skeleton);
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Block Mesh Adaptation
// -----------------------------------------------------------------------------

    // FUNCTION | Stretch the Block Prism to Clear a Deeper Ridge Beam
    // ------------------------------------------------------------
    // beamDeltaMm is the ridge beam's own stretch, signed along section +y and
    // negative for a deeper beam. The block takes the identical number along its
    // own -Z, which is what holds the authored 6mm between the beam underside and
    // the top of the turning at every pitch.
    //
    // The turned base travels rigid and only the straight prism lengthens. A
    // lathe profile that got 9 percent taller would read as a different block,
    // and it is the part of this component anybody standing in the room is
    // actually looking at.
    function VghLantern__RidgeAssembly__StretchBlockMesh(meshBlock, beamDeltaMm) {
        if (!meshBlock) return null;

        var delta  =  Number(beamDeltaMm) || 0;
        if (delta === 0) return meshBlock;

        var Stretch  =  VghLantern__RidgeAssembly__Stretch();
        if (!Stretch) {
            console.error('[VghLantern__RidgeAssembly] StretchTools is not loaded - block drawn as authored.');
            return meshBlock;
        }

        return Stretch.VghLantern__StretchTools__StretchMesh3d(meshBlock, {
            Axis       : 'z',
            SplitValue : VghLantern__RidgeAssembly__BlockGeometry().StretchSplitZMm,
            Side       : 'below',
            DeltaMm    : delta
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Cache Key for a Stretched Block
    // ------------------------------------------------------------
    // The stretch is cheap but not free - 3432 vertices - and the block is
    // rebuilt on every slider drag. Two lanterns at the same ridge depth share a
    // buffer, and the depth is the only thing that changes about the mesh.
    function VghLantern__RidgeAssembly__BlockCacheKey(beamDeltaMm) {
        return 'ridgeBlock__' + (Number(beamDeltaMm) || 0).toFixed(2);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__RidgeAssembly__DepthResolution   : VghLantern__RidgeAssembly__DepthResolution,
        VghLantern__RidgeAssembly__PitchDegrees      : VghLantern__RidgeAssembly__PitchDegrees,
        VghLantern__RidgeAssembly__SectionsForPitch  : VghLantern__RidgeAssembly__SectionsForPitch,
        VghLantern__RidgeAssembly__RidgeMember       : VghLantern__RidgeAssembly__RidgeMember,
        VghLantern__RidgeAssembly__PlanDirection     : VghLantern__RidgeAssembly__PlanDirection,
        VghLantern__RidgeAssembly__BlockPlacements   : VghLantern__RidgeAssembly__BlockPlacements,
        VghLantern__RidgeAssembly__BlockGeometry     : VghLantern__RidgeAssembly__BlockGeometry,
        VghLantern__RidgeAssembly__EndCapPlacements  : VghLantern__RidgeAssembly__EndCapPlacements,
        VghLantern__RidgeAssembly__EndCapGeometry    : VghLantern__RidgeAssembly__EndCapGeometry,
        VghLantern__RidgeAssembly__BeamEndPlanes     : VghLantern__RidgeAssembly__BeamEndPlanes,
        VghLantern__RidgeAssembly__CappingEndPlanes  : VghLantern__RidgeAssembly__CappingEndPlanes,
        VghLantern__RidgeAssembly__EndPlanesForPart  : VghLantern__RidgeAssembly__EndPlanesForPart,
        VghLantern__RidgeAssembly__StretchBlockMesh  : VghLantern__RidgeAssembly__StretchBlockMesh,
        VghLantern__RidgeAssembly__BlockCacheKey     : VghLantern__RidgeAssembly__BlockCacheKey
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__RidgeAssembly  =  VghLantern__Geometry__RidgeAssembly;
