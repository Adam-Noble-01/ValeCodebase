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
   - Origin         : centre of the lantern footprint, at kerb BASE level.
   - +X              : the width axis.
   - +Y              : the depth axis.
   - +Z              : vertically up.
   - Kerb base       : z = 0
   - Kerb top/eaves  : z = kerbHeightMm
   - Ridge / apex    : z = kerbHeightMm + riseMm

   The long axis is whichever of width/depth is greater once the eaves
   projection is added. The ridge always runs along the long axis.

   ---------------------------------------------------------------------------

   OUTPUT CONTRACT - SolvedSkeleton:

   {
       Meta : {
           RoofForm, IsValid, Warnings[],
           WidthMm, DepthMm, EavesProjectionMm, KerbHeightMm,
           EavesHalfWidthMm, EavesHalfDepthMm,
           LongAxis            : 'x' | 'y',
           PitchDegrees, RiseMm, RidgeLengthMm,
           ShortRafterLengthMm, LongRafterLengthMm,
           HipLengthMm, HipAngleDegrees,
           EavesLevelMm, RidgeLevelMm, OverallHeightMm
       },
       Members         : [ { Id, Role, Start, End, LengthMm } ],
       Faces           : [ { Id, Role, SlopeKey, Points[], AreaSqMm, PitchDegrees } ],
       FinialAnchors   : [ { Id, Role, Position } ],
       Bounds          : { MinX, MaxX, MinY, MaxY, MinZ, MaxZ }
   }

   Member roles : 'kerb' | 'kerbPost' | 'eaves' | 'ridge' | 'hip' | 'verge'
   Face roles   : 'glazingFace'
   SlopeKey     : 'long+' | 'long-' | 'short+' | 'short-' for slope identification

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


    // SUB FUNCTION | Emit the Kerb Rectangle, Posts and Eaves Rectangle
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__EmitBaseMembers(members, mapTo, kerbHalfLong, kerbHalfShort, eavesHalfLong, eavesHalfShort, kerbHeightMm) {
        var i;

        var kerbBase  =  [
            mapTo(-kerbHalfLong, -kerbHalfShort, 0),
            mapTo( kerbHalfLong, -kerbHalfShort, 0),
            mapTo( kerbHalfLong,  kerbHalfShort, 0),
            mapTo(-kerbHalfLong,  kerbHalfShort, 0)
        ];
        var kerbTop  =  [
            mapTo(-kerbHalfLong, -kerbHalfShort, kerbHeightMm),
            mapTo( kerbHalfLong, -kerbHalfShort, kerbHeightMm),
            mapTo( kerbHalfLong,  kerbHalfShort, kerbHeightMm),
            mapTo(-kerbHalfLong,  kerbHalfShort, kerbHeightMm)
        ];
        var eavesRing  =  [
            mapTo(-eavesHalfLong, -eavesHalfShort, kerbHeightMm),
            mapTo( eavesHalfLong, -eavesHalfShort, kerbHeightMm),
            mapTo( eavesHalfLong,  eavesHalfShort, kerbHeightMm),
            mapTo(-eavesHalfLong,  eavesHalfShort, kerbHeightMm)
        ];

        for (i = 0; i < 4; i++) {
            VghLantern__SkeletonSolver__PushMember(members, 'kerb_' + i, 'kerb',
                kerbTop[i], kerbTop[(i + 1) % 4]);

            VghLantern__SkeletonSolver__PushMember(members, 'eaves_' + i, 'eaves',
                eavesRing[i], eavesRing[(i + 1) % 4]);

            if (kerbHeightMm > 0) {
                VghLantern__SkeletonSolver__PushMember(members, 'kerbPost_' + i, 'kerbPost',
                    kerbBase[i], kerbTop[i]);
            }
        }

        return eavesRing;
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
        var eavesHalfLong   =  context.EavesHalfLongMm;
        var eavesHalfShort  =  context.EavesHalfShortMm;
        var eavesLevel      =  context.EavesLevelMm;
        var ridgeLevel      =  context.RidgeLevelMm;
        var ridgeHalfLength =  context.RidgeHalfLengthMm;
        var pitchSet        =  context.PitchSet;

        var eavesRing  =  VghLantern__SkeletonSolver__EmitBaseMembers(
            members, mapTo,
            context.KerbHalfLongMm, context.KerbHalfShortMm,
            eavesHalfLong, eavesHalfShort,
            context.KerbHeightMm
        );

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

    // SUB FUNCTION | Read the Lantern Config into a Flat Solve Context
    // ------------------------------------------------------------
    function VghLantern__SkeletonSolver__BuildContext(lantern, warnings) {
        var PitchCalculator  =  window.VghLantern__Geometry__RoofPitchCalculator;

        var formCfg   =  lantern['Lantern__Form__Config']        || {};
        var dimsCfg   =  lantern['Lantern__Dimensions__Config']  || {};
        var pitchCfg  =  lantern['Lantern__RoofPitch__Config']   || {};
        var kerbCfg   =  lantern['Lantern__KerbAndBase__Config'] || {};

        var roofForm       =  formCfg['Lantern__Form__Config__RoofForm'] || ROOF_FORM_HIPPED_RIDGE;
        var widthMm        =  Number(dimsCfg['Lantern__Dimensions__Config__WidthMm']) || 0;
        var depthMm        =  Number(dimsCfg['Lantern__Dimensions__Config__DepthMm']) || 0;
        var eavesProjMm    =  Number(dimsCfg['Lantern__Dimensions__Config__EavesProjectionMm']) || 0;
        var kerbHeightMm   =  Number(kerbCfg['Lantern__KerbAndBase__Config__KerbHeightMm']) || 0;

        var eavesHalfX  =  (widthMm / 2) + eavesProjMm;
        var eavesHalfY  =  (depthMm / 2) + eavesProjMm;

        var longAxis        =  eavesHalfX >= eavesHalfY ? 'x' : 'y';
        var eavesHalfLong   =  Math.max(eavesHalfX, eavesHalfY);
        var eavesHalfShort  =  Math.min(eavesHalfX, eavesHalfY);
        var kerbHalfLong    =  longAxis === 'x' ? widthMm / 2 : depthMm / 2;
        var kerbHalfShort   =  longAxis === 'x' ? depthMm / 2 : widthMm / 2;

        // A pyramid collapses the ridge to a point; every other form keeps it.
        var ridgeHalfLength  =  roofForm === ROOF_FORM_PYRAMID
            ? 0
            : Math.max(0, eavesHalfLong - eavesHalfShort);

        var pitchSet  =  PitchCalculator.VghLantern__RoofPitch__ResolvePitchSet(
            pitchCfg['Lantern__RoofPitch__Config__DriveMode'] === 'rise' ? 'rise' : 'angle',
            eavesHalfShort,
            eavesHalfLong - ridgeHalfLength,
            pitchCfg['Lantern__RoofPitch__Config__PitchDegrees'],
            pitchCfg['Lantern__RoofPitch__Config__RidgeRiseMm']
        );

        return {
            RoofForm           : roofForm,
            WidthMm            : widthMm,
            DepthMm            : depthMm,
            EavesProjectionMm  : eavesProjMm,
            KerbHeightMm       : kerbHeightMm,
            LongAxis           : longAxis,
            MapTo              : VghLantern__SkeletonSolver__BuildAxisMapper(longAxis),
            EavesHalfLongMm    : eavesHalfLong,
            EavesHalfShortMm   : eavesHalfShort,
            KerbHalfLongMm     : kerbHalfLong,
            KerbHalfShortMm    : kerbHalfShort,
            RidgeHalfLengthMm  : ridgeHalfLength,
            EavesLevelMm       : kerbHeightMm,
            RidgeLevelMm       : kerbHeightMm + pitchSet.RiseMm,
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
        if (context.PitchSet.RiseMm <= 0) {
            context.Warnings.push('Resolved ridge rise is zero - the roof would be flat.');
            isValid  =  false;
        }
        if (context.EavesProjectionMm > context.KerbHalfShortMm) {
            context.Warnings.push('Eaves projection exceeds half the short span - check the overhang.');
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
                KerbHeightMm         : context.KerbHeightMm,
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
                EavesLevelMm         : context.EavesLevelMm,
                RidgeLevelMm         : context.RidgeLevelMm,
                OverallHeightMm      : context.RidgeLevelMm
            },
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
