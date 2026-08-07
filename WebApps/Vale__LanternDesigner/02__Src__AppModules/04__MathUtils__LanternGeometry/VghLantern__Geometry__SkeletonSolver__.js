/* =============================================================================
   VGHLANTERN - SKELETON SOLVER
   =============================================================================

   FILE       : VghLantern__Geometry__SkeletonSolver__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - SkeletonSolver
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Solve a lantern configuration into pure millimetre skeleton data
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - This is the SINGLE geometry brain of the application. Nothing else in the
     codebase computes lantern geometry.
   - Consumes one normalised lantern config block from the project schema and
     returns a SolvedSkeleton object expressed entirely in millimetres.
   - Both render environments are pure consumers of this output:
       05__Env2d__SvgRenderPipeline  projects it to plan / elevation
       06__Env3d__ThreeRenderPipeline  builds meshes along it
     Neither environment computes geometry and neither imports the other.
   - Contains no DOM access, no config file reads, no state mutation. Given the
     same lantern block it always returns the same result.

   ---------------------------------------------------------------------------

   COORDINATE CONVENTION (authoritative for the whole application):
   - Units          : millimetres throughout.
   - Origin         : centre of the lantern footprint, at builders upstand BASE level.
   - +X              : the width axis.
   - +Y              : the depth axis.
   - +Z              : vertically up.
   - Builders Upstand base : z = 0
   - Builders Upstand top  : z = upstandHeightMm   (the +/-0000 seating benchmark)
   - Head beam top         : z = upstandHeightMm + headBeamHeightMm (96)
   - EAVES DATUM           : z = upstandHeightMm + eavesDatumRiseMm (100)
   - Ridge / apex          : z = eaves datum + riseMm

   The long axis is whichever of width/depth is greater. The ridge always runs
   along the long axis.

   ---------------------------------------------------------------------------

   THE BASE ASSEMBLY - UPSTAND THEN HEAD BEAM:
   The lantern sits on a two-part base, stacked and sharing one outer face:

     UPSTAND    the studwork upstand built on the roof by others. A hollow
                rectangular prism: outer face = the lantern's width x depth,
                wall thickness = the builders upstand thickness, and the hole
                through it is the reveal the daylight comes down. Width and
                depth are ALWAYS measured to the OUTER face.
     HEAD BEAM  the Vale Sapele base frame seated directly atop the upstand,
                outer face flush with the upstand outer face. A fixed product
                section - 125mm wide x 96mm tall (46_1001) - so its size is
                read from the base frame system, never from a slider. Its
                underside on the upstand top is the +/-0000 benchmark every
                level on a sheet is measured from.

   THE EAVES DATUM: the roof does NOT spring from the outer envelope. The
   eaves datum ring sits on the head beam INNER face plane - inset one head
   beam width (125mm) from each stated face - at +100mm above the seating
   benchmark. Glaze bar datum lines pass through that ring; the aluminium
   eaves extrusion (46_1002) and lead flashing (46_1003) are swept around the
   assembly relative to it. The retired EavesProjectionMm field is carried in
   Meta for reporting but has no geometric effect.

   ---------------------------------------------------------------------------

   OUTPUT CONTRACT - SolvedSkeleton:

   {
       Meta : {
           RoofForm, IsValid, Warnings[],
           WidthMm, DepthMm, EavesProjectionMm (retired, reported only),
           UpstandHeightMm, UpstandThicknessMm, FrameHeightMm,
           HeadBeamWidthMm, HeadBeamHeightMm, EavesDatumRiseMm,
           EavesHalfWidthMm, EavesHalfDepthMm  (the EAVES DATUM ring half extents),
           LongAxis            : 'x' | 'y',
           PitchDegrees, RiseMm, RidgeLengthMm,
           ShortRafterLengthMm, LongRafterLengthMm,
           HipLengthMm, HipAngleDegrees,
           UpstandTopLevelMm, FrameTopLevelMm, EavesLevelMm, RidgeLevelMm, OverallHeightMm
       },
       Base : {
           UpstandHeightMm, UpstandThicknessMm, FrameHeightMm,
           UpstandBaseLevelMm, UpstandTopLevelMm, FrameTopLevelMm,
           OuterHalfWidthMm, OuterHalfDepthMm,
           InnerHalfWidthMm, InnerHalfDepthMm,
           RevealWidthMm, RevealDepthMm,
           OuterPerimeterMm, InnerPerimeterMm,
           HasReveal
       },
       Members         : [ { Id, Role, Start, End, LengthMm } ],
       Faces           : [ { Id, Role, SlopeKey, Points[], AreaSqMm, PitchDegrees } ],
       FinialAnchors   : [ { Id, Role, Position } ],
       Bounds          : { MinX, MaxX, MinY, MaxY, MinZ, MaxZ }
   }

   Member roles : 'buildersUpstand' | 'buildersUpstandPost' | 'buildersUpstandReveal' | 'frame' 
                | 'eaves' | 'ridge' | 'hip' | 'verge'
   Face roles   : 'glazingFace'
   SlopeKey     : 'long+' | 'long-' | 'short+' | 'short-' for slope identification

   'buildersUpstandReveal' members trace the inner face of the upstand. They are the hole
   through the base, not a section, so they carry no profile and are drawn as an
   annotation line rather than swept into a solid.

   Glazing bars are NOT solved here - they are laid out onto Faces by
   VghLantern__Geometry__GlazeBarLayout, which consumes this output.

   ============================================================================= */

// =============================================================================
// REGION | Skeleton Solver Module
// =============================================================================

const VghLantern__Geometry__SkeletonSolver = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Roof Form Keys and Solver Guards
    // ------------------------------------------------------------
    const ROOF_FORM_HIPPED_RIDGE  =  'Hipped Ridge';                         // <-- Ridge with four hips - the default Vale form
    const ROOF_FORM_PYRAMID       =  'Pyramid';                              // <-- Four hips meeting at a single apex
    const ROOF_FORM_GABLE         =  'Gable';                                // <-- Not yet solved - see NotImplemented branch
    const ROOF_FORM_MONO_PITCH    =  'Mono Pitch';                           // <-- Not yet solved - see NotImplemented branch

    const MIN_PLAN_DIMENSION_MM   =  300;                                    // <-- Below this a lantern cannot be built
    const AREA_EPSILON            =  1e-6;                                   // <-- Degenerate face rejection threshold
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Base Assembly Fallbacks and Guards
    // ------------------------------------------------------------
    // Used only when a lantern block reaches the solver without the field, which
    // a schema-normalised project never does. They match the schema defaults so a
    // hand-edited file solves to the same geometry the editor would produce.
    const FALLBACK_UPSTAND_HEIGHT_MM     =  150;                                // <-- Standard Vale upstand height
    const FALLBACK_UPSTAND_THICKNESS_MM  =  110;                                // <-- Standard studwork upstand wall thickness
    const MIN_REVEAL_DIMENSION_MM     =  100;                                // <-- Below this the hole is not a usable reveal
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Head Beam and Eaves Datum Fallbacks
    // ------------------------------------------------------------
    // The live numbers come from the base frame system index through
    // VghLantern__Geometry__BaseFrameAssembly. These mirror that index exactly
    // and exist only so a solve that somehow runs before the module chain is
    // complete produces the same lantern.
    const FALLBACK_HEAD_BEAM_WIDTH_MM   =  125;                              // <-- 46_1001 standard section width
    const FALLBACK_HEAD_BEAM_HEIGHT_MM  =  96;                               // <-- 46_1001 standard section height
    const FALLBACK_DATUM_RISE_MM        =  100;                              // <-- Eaves datum above the seating benchmark
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Head Beam and Datum Numbers (synchronous)
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__DatumGeometry() {
        var Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        if (Assembly) return Assembly.VghLantern__BaseFrameAssembly__DatumGeometry();

        return {
            HeadBeamWidthMm           : FALLBACK_HEAD_BEAM_WIDTH_MM,
            HeadBeamHeightMm          : FALLBACK_HEAD_BEAM_HEIGHT_MM,
            EavesDatumRiseAboveSeatMm : FALLBACK_DATUM_RISE_MM
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Vector and Polygon Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Millimetre Point
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__Point(x, y, z) {
        return { x: x, y: y, z: z };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Straight Line Distance Between Two Points
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__Distance(a, b) {
        var dx  =  b.x - a.x;
        var dy  =  b.y - a.y;
        var dz  =  b.z - a.z;
        return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Area of a Planar Polygon in 3D via Newell's Method
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__PolygonArea(points) {
        if (!points || points.length < 3) return 0;

        var nx  =  0, ny  =  0, nz  =  0;
        var i, current, next;

        for (i = 0; i < points.length; i++) {
            current  =  points[i];
            next     =  points[(i + 1) % points.length];
            nx      +=  (current.y - next.y) * (current.z + next.z);
            ny      +=  (current.z - next.z) * (current.x + next.x);
            nz      +=  (current.x - next.x) * (current.y + next.y);
        }

        var magnitude  =  Math.sqrt((nx * nx) + (ny * ny) + (nz * nz)) / 2;
        return magnitude < AREA_EPSILON ? 0 : magnitude;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Canonical Axis Mapping
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Canonical-to-World Axis Mapper
    // ------------------------------------------------------------
    // The solve runs in a canonical frame where u is the LONG axis and v is the
    // SHORT axis. This mapper emits world X/Y so the rest of the app never has
    // to reason about which physical axis is longer.
    function VghLantern__SkeletonSolver__BuildAxisMapper(longAxis) {
        if (longAxis === 'y') {
            return function(u, v, z) { return VghLantern__SkeletonSolver__Point(v, u, z); };
        }
        return function(u, v, z) { return VghLantern__SkeletonSolver__Point(u, v, z); };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Member and Face Emitters
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Push a Skeleton Member onto the Collection
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__PushMember(members, id, role, startPt, endPt) {
        members.push({
            Id       : id,
            Role     : role,
            Start    : startPt,
            End      : endPt,
            LengthMm : VghLantern__SkeletonSolver__Distance(startPt, endPt)
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push a Glazing Face onto the Collection
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__PushFace(faces, id, slopeKey, points, pitchDegrees) {
        var area  =  VghLantern__SkeletonSolver__PolygonArea(points);
        if (area <= 0) return;                                               // <-- Skip degenerate faces silently

        faces.push({
            Id            : id,
            Role          : 'glazingFace',
            SlopeKey      : slopeKey,
            Points        : points,
            AreaSqMm      : area,
            PitchDegrees  : pitchDegrees
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Corner Ring in the Canonical Long/Short Frame
    // ------------------------------------------------------------
    // Corner order is fixed at [-L-S, +L-S, +L+S, -L+S]. Every consumer of a ring
    // relies on that order - the hip pairing in particular - so it is defined
    // once here rather than repeated per caller.
    function VghLantern__SkeletonSolver__Ring(mapTo, halfLong, halfShort, levelMm) {
        return [
            mapTo(-halfLong, -halfShort, levelMm),
            mapTo( halfLong, -halfShort, levelMm),
            mapTo( halfLong,  halfShort, levelMm),
            mapTo(-halfLong,  halfShort, levelMm)
        ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push the Four Perimeter Rails of a Ring
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__PushRing(members, idPrefix, role, ringPoints) {
        var i;
        for (i = 0; i < 4; i++) {
            VghLantern__SkeletonSolver__PushMember(members, idPrefix + '_' + i, role,
                ringPoints[i], ringPoints[(i + 1) % 4]);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push the Four Corner Posts Between Two Rings
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__PushPosts(members, idPrefix, role, lowerRing, upperRing) {
        var i;
        for (i = 0; i < 4; i++) {
            VghLantern__SkeletonSolver__PushMember(members, idPrefix + '_' + i, role,
                lowerRing[i], upperRing[i]);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Emit the Builders Upstand Box, the Frame on Top of It and the Eaves Ring
    // ------------------------------------------------------------
    // The builders upstand and the frame share one footprint and one wall thickness, so they
    // are emitted as one stacked assembly. The reveal is traced once, from the
    // upstand base straight through to the frame top, because the inner face is
    // continuous - there is no step between builders upstand and frame to draw.
    function VghLantern__SkeletonSolver__EmitBaseMembers(members, context) {
        var mapTo      =  context.MapTo;
        var outerLong  =  context.UpstandHalfLongMm;
        var outerShort =  context.UpstandHalfShortMm;
        var upstandTopMm  =  context.UpstandTopLevelMm;
        var frameTopMm =  context.FrameTopLevelMm;

        var outerBase      =  VghLantern__SkeletonSolver__Ring(mapTo, outerLong, outerShort, 0);
        var outerUpstandTop   =  VghLantern__SkeletonSolver__Ring(mapTo, outerLong, outerShort, upstandTopMm);
        var outerFrameTop  =  VghLantern__SkeletonSolver__Ring(mapTo, outerLong, outerShort, frameTopMm);

        // BUILDERS UPSTAND - site-built studwork (not Vale manufacture).
        VghLantern__SkeletonSolver__PushRing(members, 'upstandTop', 'buildersUpstand', outerUpstandTop);
        if (context.UpstandHeightMm > 0) {
            VghLantern__SkeletonSolver__PushRing(members, 'upstandBase', 'buildersUpstand', outerBase);
            VghLantern__SkeletonSolver__PushPosts(members, 'buildersUpstandPost', 'buildersUpstandPost', outerBase, outerUpstandTop);
        }

        // FRAME - the Sapele head beam seated on the builders upstand. Closed as
        // a box in its own right, exactly as the upstand below it is, so an
        // elevation reads a complete rectangle one head beam height tall across
        // the full width or depth rather than two unterminated rails. Its base
        // ring sits on the upstand top - the +/-0000 seating benchmark.
        if (context.FrameHeightMm > 0) {
            VghLantern__SkeletonSolver__PushRing(members, 'frameBase', 'frame', outerUpstandTop);
            VghLantern__SkeletonSolver__PushRing(members, 'frameTop',  'frame', outerFrameTop);
            VghLantern__SkeletonSolver__PushPosts(members, 'framePost', 'frame', outerUpstandTop, outerFrameTop);
        }

        // REVEAL - the hole through the base, offset inward by the builders upstand thickness.
        if (context.HasReveal) {
            var innerBase  =  VghLantern__SkeletonSolver__Ring(mapTo, context.InnerHalfLongMm, context.InnerHalfShortMm, 0);
            var innerTop   =  VghLantern__SkeletonSolver__Ring(mapTo, context.InnerHalfLongMm, context.InnerHalfShortMm, frameTopMm);

            VghLantern__SkeletonSolver__PushRing(members, 'revealBase', 'buildersUpstandReveal', innerBase);
            VghLantern__SkeletonSolver__PushRing(members, 'revealTop',  'buildersUpstandReveal', innerTop);
            VghLantern__SkeletonSolver__PushPosts(members, 'revealPost', 'buildersUpstandReveal', innerBase, innerTop);
        }

        // EAVES DATUM - the ring the roof springs from: the head beam inner face
        // plane, 100mm above the seating benchmark. Inboard of the outer
        // envelope, not oversailing it.
        var eavesRing  =  VghLantern__SkeletonSolver__Ring(mapTo, context.EavesHalfLongMm, context.EavesHalfShortMm, context.EavesLevelMm);
        VghLantern__SkeletonSolver__PushRing(members, 'eaves', 'eaves', eavesRing);

        return eavesRing;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Describe the Base Assembly as a Prism for the 3D Environment
    // ------------------------------------------------------------
    // Half extents are published per WORLD axis so a consumer never has to
    // reason about which physical axis the solver treated as long.
    function VghLantern__SkeletonSolver__BuildBaseBlock(context) {
        var outerHalfX  =  context.WidthMm / 2;
        var outerHalfY  =  context.DepthMm / 2;
        var innerHalfX  =  Math.max(0, outerHalfX - context.UpstandThicknessMm);
        var innerHalfY  =  Math.max(0, outerHalfY - context.UpstandThicknessMm);

        return {
            UpstandHeightMm      : context.UpstandHeightMm,
            UpstandThicknessMm   : context.UpstandThicknessMm,
            FrameHeightMm     : context.FrameHeightMm,
            UpstandBaseLevelMm   : 0,
            UpstandTopLevelMm    : context.UpstandTopLevelMm,
            FrameTopLevelMm   : context.FrameTopLevelMm,
            OuterHalfWidthMm  : outerHalfX,
            OuterHalfDepthMm  : outerHalfY,
            InnerHalfWidthMm  : innerHalfX,
            InnerHalfDepthMm  : innerHalfY,
            RevealWidthMm     : context.HasReveal ? innerHalfX * 2 : 0,
            RevealDepthMm     : context.HasReveal ? innerHalfY * 2 : 0,
            OuterPerimeterMm  : (outerHalfX + outerHalfY) * 4,
            InnerPerimeterMm  : context.HasReveal ? (innerHalfX + innerHalfY) * 4 : 0,
            HasReveal         : context.HasReveal
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Roof Form Solvers
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Solve a Hipped Roof - Ridge Length Zero Gives a Pyramid
    // ------------------------------------------------------------
    // Both the Hipped Ridge and Pyramid forms are the same construction; a
    // pyramid is simply the degenerate case where the ridge collapses to a
    // point. Solving them together keeps one code path correct.
    function VghLantern__SkeletonSolver__SolveHipped(context) {
        var members  =  [];
        var faces    =  [];
        var anchors  =  [];

        var mapTo           =  context.MapTo;
        var ridgeLevel      =  context.RidgeLevelMm;
        var ridgeHalfLength =  context.RidgeHalfLengthMm;
        var pitchSet        =  context.PitchSet;

        var eavesRing  =  VghLantern__SkeletonSolver__EmitBaseMembers(members, context);

        var ridgeNeg  =  mapTo(-ridgeHalfLength, 0, ridgeLevel);
        var ridgePos  =  mapTo( ridgeHalfLength, 0, ridgeLevel);

        if (ridgeHalfLength > 0) {
            VghLantern__SkeletonSolver__PushMember(members, 'ridge_0', 'ridge', ridgeNeg, ridgePos);
        }

        // Hips run from each eaves corner to the nearest ridge end. eavesRing is
        // ordered [-L-S, +L-S, +L+S, -L+S] so the ridge end pairing alternates.
        var hipTargets  =  [ridgeNeg, ridgePos, ridgePos, ridgeNeg];
        var i;
        for (i = 0; i < 4; i++) {
            VghLantern__SkeletonSolver__PushMember(members, 'hip_' + i, 'hip', eavesRing[i], hipTargets[i]);
        }

        // Long slopes are trapezoidal (or triangular when the ridge collapses).
        VghLantern__SkeletonSolver__PushFace(faces, 'face_long_neg', 'short-',
            [eavesRing[0], eavesRing[1], ridgePos, ridgeNeg], pitchSet.PitchDegrees);

        VghLantern__SkeletonSolver__PushFace(faces, 'face_long_pos', 'short+',
            [eavesRing[3], ridgeNeg, ridgePos, eavesRing[2]], pitchSet.PitchDegrees);

        // Hip-end slopes are always triangular.
        VghLantern__SkeletonSolver__PushFace(faces, 'face_end_neg', 'long-',
            [eavesRing[0], ridgeNeg, eavesRing[3]], pitchSet.LongSlopePitchDegrees);

        VghLantern__SkeletonSolver__PushFace(faces, 'face_end_pos', 'long+',
            [eavesRing[1], eavesRing[2], ridgePos], pitchSet.LongSlopePitchDegrees);

        if (ridgeHalfLength > 0) {
            anchors.push({ Id: 'finial_ridge_neg', Role: 'ridgeEnd', Position: ridgeNeg });
            anchors.push({ Id: 'finial_ridge_pos', Role: 'ridgeEnd', Position: ridgePos });
        } else {
            anchors.push({ Id: 'finial_apex', Role: 'apex', Position: ridgeNeg });
        }

        return { Members: members, Faces: faces, FinialAnchors: anchors };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Solve a Gable or Mono Pitch Roof - Not Yet Implemented
    // ------------------------------------------------------------
    // These forms are disabled in VghLantern__RoofForm__Options__Config. The
    // branch exists so an out-of-date project file degrades to a readable
    // hipped solve with a visible warning rather than rendering nothing.
    //
    // TODO (next implementation pass):
    //   Gable      - full-length ridge, vertical gable ends, verge members
    //                replacing hips, two rectangular glazing faces.
    //   Mono Pitch - single slope from a low eaves to a high eaves, rise driven
    //                by the FULL short span rather than half of it.
    function VghLantern__SkeletonSolver__SolveNotImplemented(context, roofForm) {
        var result  =  VghLantern__SkeletonSolver__SolveHipped(context);
        context.Warnings.push('Roof form "' + roofForm + '" is not yet solved - showing a hipped approximation.');
        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Solve Context Assembly
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Numeric Config Field with a Documented Fallback
    // ------------------------------------------------------------
    // A missing field falls back; a present-but-zero field is honoured, so a
    // deliberate zero (no frame, for instance) is never quietly overridden.
    function VghLantern__SkeletonSolver__ReadNumber(configBlock, fieldKey, fallbackValue) {
        var value  =  Number(configBlock[fieldKey]);
        return isFinite(value) ? value : fallbackValue;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Read the Lantern Config into a Flat Solve Context
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__BuildContext(lantern, warnings) {
        var PitchCalculator  =  window.VghLantern__Geometry__RoofPitchCalculator;

        var formCfg   =  lantern['Lantern__Form__Config']        || {};
        var dimsCfg   =  lantern['Lantern__Dimensions__Config']  || {};
        var pitchCfg  =  lantern['Lantern__RoofPitch__Config']   || {};
        var upstandCfg   =  lantern['Lantern__BuildersUpstandAndBase__Config'] || {};

        var roofForm       =  formCfg['Lantern__Form__Config__RoofForm'] || ROOF_FORM_HIPPED_RIDGE;
        var widthMm        =  Number(dimsCfg['Lantern__Dimensions__Config__WidthMm']) || 0;
        var depthMm        =  Number(dimsCfg['Lantern__Dimensions__Config__DepthMm']) || 0;
        var eavesProjMm    =  Number(dimsCfg['Lantern__Dimensions__Config__EavesProjectionMm']) || 0;   // <-- Retired field, reported only

        // BASE ASSEMBLY - width and depth are measured to the OUTER builders upstand face.
        var upstandHeightMm     =  Math.max(0, VghLantern__SkeletonSolver__ReadNumber(upstandCfg, 'Lantern__BuildersUpstandAndBase__Config__UpstandHeightMm',    FALLBACK_UPSTAND_HEIGHT_MM));
        var upstandThicknessMm  =  Math.max(0, VghLantern__SkeletonSolver__ReadNumber(upstandCfg, 'Lantern__BuildersUpstandAndBase__Config__UpstandThicknessMm', FALLBACK_UPSTAND_THICKNESS_MM));

        // HEAD BEAM AND EAVES DATUM - fixed product numbers, never user driven.
        // The retired FrameHeightMm slider value is deliberately not read: the
        // base frame is the 46_1001 head beam and its height is the product's.
        var datumGeometry     =  VghLantern__SkeletonSolver__DatumGeometry();
        var headBeamWidthMm   =  datumGeometry.HeadBeamWidthMm;
        var headBeamHeightMm  =  datumGeometry.HeadBeamHeightMm;
        var datumRiseMm       =  datumGeometry.EavesDatumRiseAboveSeatMm;

        var upstandTopLevelMm  =  upstandHeightMm;
        var frameTopLevelMm    =  upstandHeightMm + headBeamHeightMm;
        var eavesDatumLevelMm  =  upstandHeightMm + datumRiseMm;

        // The roof springs from the eaves datum ring: the head beam INNER face
        // plane, one beam width inboard of each stated face.
        var eavesHalfX  =  (widthMm / 2) - headBeamWidthMm;
        var eavesHalfY  =  (depthMm / 2) - headBeamWidthMm;

        var longAxis        =  eavesHalfX >= eavesHalfY ? 'x' : 'y';
        var eavesHalfLong   =  Math.max(eavesHalfX, eavesHalfY);
        var eavesHalfShort  =  Math.min(eavesHalfX, eavesHalfY);
        var upstandHalfLong    =  longAxis === 'x' ? widthMm / 2 : depthMm / 2;
        var upstandHalfShort   =  longAxis === 'x' ? depthMm / 2 : widthMm / 2;

        var innerHalfLong   =  upstandHalfLong  - upstandThicknessMm;
        var innerHalfShort  =  upstandHalfShort - upstandThicknessMm;
        var hasReveal       =  (innerHalfShort * 2) >= MIN_REVEAL_DIMENSION_MM
                            && (innerHalfLong  * 2) >= MIN_REVEAL_DIMENSION_MM;

        // A pyramid collapses the ridge to a point; every other form keeps it.
        var ridgeHalfLength  =  roofForm === ROOF_FORM_PYRAMID
            ? 0
            : Math.max(0, eavesHalfLong - eavesHalfShort);

        var pitchSet  =  PitchCalculator.VghLantern__RoofPitch__ResolvePitchSet(
            eavesHalfShort,
            eavesHalfLong - ridgeHalfLength,
            pitchCfg['Lantern__RoofPitch__Config__PitchDegrees']
        );

        return {
            RoofForm           : roofForm,
            WidthMm            : widthMm,
            DepthMm            : depthMm,
            EavesProjectionMm  : eavesProjMm,
            UpstandHeightMm       : upstandHeightMm,
            UpstandThicknessMm    : upstandThicknessMm,
            HeadBeamWidthMm    : headBeamWidthMm,
            HeadBeamHeightMm   : headBeamHeightMm,
            EavesDatumRiseMm   : datumRiseMm,
            FrameHeightMm      : headBeamHeightMm,
            LongAxis           : longAxis,
            MapTo              : VghLantern__SkeletonSolver__BuildAxisMapper(longAxis),
            EavesHalfLongMm    : eavesHalfLong,
            EavesHalfShortMm   : eavesHalfShort,
            UpstandHalfLongMm     : upstandHalfLong,
            UpstandHalfShortMm    : upstandHalfShort,
            InnerHalfLongMm    : innerHalfLong,
            InnerHalfShortMm   : innerHalfShort,
            HasReveal          : hasReveal,
            RidgeHalfLengthMm  : ridgeHalfLength,
            UpstandTopLevelMm     : upstandTopLevelMm,
            FrameTopLevelMm    : frameTopLevelMm,
            EavesLevelMm       : eavesDatumLevelMm,
            RidgeLevelMm       : eavesDatumLevelMm + pitchSet.RiseMm,
            PitchSet           : pitchSet,
            Warnings           : warnings
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Validate the Solve Context and Collect Warnings
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__ValidateContext(context) {
        var isValid  =  true;

        if (context.WidthMm < MIN_PLAN_DIMENSION_MM || context.DepthMm < MIN_PLAN_DIMENSION_MM) {
            context.Warnings.push('Width and depth must each be at least ' + MIN_PLAN_DIMENSION_MM + ' mm.');
            isValid  =  false;
        }
        if (context.EavesHalfShortMm <= 0) {
            context.Warnings.push('The plan is too small for the ' + Math.round(context.HeadBeamWidthMm)
                + ' mm head beam each side - no glazed opening remains inside the eaves datum.');
            isValid  =  false;
        }
        if (context.PitchSet.RiseMm <= 0) {
            context.Warnings.push('The roof pitch resolves to no rise at all - the roof would be flat.');
            isValid  =  false;
        }
        if (!context.HasReveal) {
            context.Warnings.push('A builders upstand thickness of ' + Math.round(context.UpstandThicknessMm)
                + ' mm leaves no usable reveal at this size - the upstand is solid through.');
        }

        return isValid;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Derive an Axis Aligned Bounding Box from Solved Members
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__ComputeBounds(members) {
        var bounds  =  {
            MinX : Infinity, MaxX : -Infinity,
            MinY : Infinity, MaxY : -Infinity,
            MinZ : Infinity, MaxZ : -Infinity
        };

        function absorb(pt) {
            if (pt.x < bounds.MinX) bounds.MinX  =  pt.x;
            if (pt.x > bounds.MaxX) bounds.MaxX  =  pt.x;
            if (pt.y < bounds.MinY) bounds.MinY  =  pt.y;
            if (pt.y > bounds.MaxY) bounds.MaxY  =  pt.y;
            if (pt.z < bounds.MinZ) bounds.MinZ  =  pt.z;
            if (pt.z > bounds.MaxZ) bounds.MaxZ  =  pt.z;
        }

        var i;
        for (i = 0; i < members.length; i++) {
            absorb(members[i].Start);
            absorb(members[i].End);
        }

        if (!members.length) {
            bounds  =  { MinX: 0, MaxX: 0, MinY: 0, MaxY: 0, MinZ: 0, MaxZ: 0 };
        }

        return bounds;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Solve Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Solve a Lantern Config Block into a SolvedSkeleton
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__Solve(lantern) {
        if (!lantern || typeof lantern !== 'object') return null;

        var warnings  =  [];
        var context   =  VghLantern__SkeletonSolver__BuildContext(lantern, warnings);
        var isValid   =  VghLantern__SkeletonSolver__ValidateContext(context);

        var solved;
        if (context.RoofForm === ROOF_FORM_GABLE || context.RoofForm === ROOF_FORM_MONO_PITCH) {
            solved  =  VghLantern__SkeletonSolver__SolveNotImplemented(context, context.RoofForm);
        } else {
            solved  =  VghLantern__SkeletonSolver__SolveHipped(context);
        }

        var pitchSet  =  context.PitchSet;

        return {
            Meta : {
                RoofForm             : context.RoofForm,
                IsValid              : isValid,
                Warnings             : warnings,
                WidthMm              : context.WidthMm,
                DepthMm              : context.DepthMm,
                EavesProjectionMm    : context.EavesProjectionMm,
                UpstandHeightMm         : context.UpstandHeightMm,
                UpstandThicknessMm      : context.UpstandThicknessMm,
                FrameHeightMm        : context.FrameHeightMm,
                HeadBeamWidthMm      : context.HeadBeamWidthMm,
                HeadBeamHeightMm     : context.HeadBeamHeightMm,
                EavesDatumRiseMm     : context.EavesDatumRiseMm,
                LongAxis             : context.LongAxis,
                EavesHalfWidthMm     : context.LongAxis === 'x' ? context.EavesHalfLongMm : context.EavesHalfShortMm,
                EavesHalfDepthMm     : context.LongAxis === 'x' ? context.EavesHalfShortMm : context.EavesHalfLongMm,
                PitchDegrees         : pitchSet.PitchDegrees,
                RiseMm               : pitchSet.RiseMm,
                RidgeLengthMm        : context.RidgeHalfLengthMm * 2,
                ShortRafterLengthMm  : pitchSet.ShortRafterLengthMm,
                LongRafterLengthMm   : pitchSet.LongRafterLengthMm,
                LongSlopePitchDeg    : pitchSet.LongSlopePitchDegrees,
                HipLengthMm          : pitchSet.HipLengthMm,
                HipAngleDegrees      : pitchSet.HipAngleDegrees,
                UpstandTopLevelMm       : context.UpstandTopLevelMm,
                FrameTopLevelMm      : context.FrameTopLevelMm,
                EavesLevelMm         : context.EavesLevelMm,
                RidgeLevelMm         : context.RidgeLevelMm,
                OverallHeightMm      : context.RidgeLevelMm
            },
            Base           : VghLantern__SkeletonSolver__BuildBaseBlock(context),
            Members        : solved.Members,
            Faces          : solved.Faces,
            FinialAnchors  : solved.FinialAnchors,
            Bounds         : VghLantern__SkeletonSolver__ComputeBounds(solved.Members)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Filter Solved Members by Role
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__MembersByRole(skeleton, roleKey) {
        if (!skeleton || !skeleton.Members) return [];

        var out  =  [];
        var i;
        for (i = 0; i < skeleton.Members.length; i++) {
            if (skeleton.Members[i].Role === roleKey) out.push(skeleton.Members[i]);
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Sum the Length of Every Member with a Given Role
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__TotalLengthForRole(skeleton, roleKey) {
        var members  =  VghLantern__SkeletonSolver__MembersByRole(skeleton, roleKey);
        var total    =  0;
        var i;
        for (i = 0; i < members.length; i++) total  +=  members[i].LengthMm;
        return total;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SkeletonSolver__Solve               : VghLantern__SkeletonSolver__Solve,
        VghLantern__SkeletonSolver__MembersByRole       : VghLantern__SkeletonSolver__MembersByRole,
        VghLantern__SkeletonSolver__TotalLengthForRole  : VghLantern__SkeletonSolver__TotalLengthForRole,
        VghLantern__SkeletonSolver__PolygonArea         : VghLantern__SkeletonSolver__PolygonArea,
        VghLantern__SkeletonSolver__BuildAxisMapper     : VghLantern__SkeletonSolver__BuildAxisMapper,
        VghLantern__SkeletonSolver__Distance            : VghLantern__SkeletonSolver__Distance
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__SkeletonSolver  =  VghLantern__Geometry__SkeletonSolver;
