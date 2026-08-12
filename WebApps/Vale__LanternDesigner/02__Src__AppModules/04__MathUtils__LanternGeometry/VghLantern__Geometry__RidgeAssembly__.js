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

   Nothing else in the stack does. The core is a welded spine and the blocking,
   flashing and capping are the weathering above it, and all of them run the full
   ridge datum length and carry on over the block. The overhang past the block
   centre is declared as zero in the system index rather than assumed here, so
   the day a real capping overhang is dimensioned it is one number in a data file
   and no code at all.

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
        var member  =  VghLantern__RidgeAssembly__RidgeMember(skeleton);
        if (!member) return null;

        var direction  =  VghLantern__RidgeAssembly__PlanDirection(member);
        var inset      =  VghLantern__RidgeAssembly__BlockGeometry().FacetInsetMm;

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
    // The beam dies into the block; the spine and the covering above it run the
    // full ridge datum length and pass over it. Answered per part rather than
    // decided at the call site so the mesh builder holds one loop.
    function VghLantern__RidgeAssembly__EndPlanesForPart(partKey, skeleton) {
        if (partKey !== 'beam') return null;
        return VghLantern__RidgeAssembly__BeamEndPlanes(skeleton);
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
        VghLantern__RidgeAssembly__BeamEndPlanes     : VghLantern__RidgeAssembly__BeamEndPlanes,
        VghLantern__RidgeAssembly__EndPlanesForPart  : VghLantern__RidgeAssembly__EndPlanesForPart,
        VghLantern__RidgeAssembly__StretchBlockMesh  : VghLantern__RidgeAssembly__StretchBlockMesh,
        VghLantern__RidgeAssembly__BlockCacheKey     : VghLantern__RidgeAssembly__BlockCacheKey
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__RidgeAssembly  =  VghLantern__Geometry__RidgeAssembly;
