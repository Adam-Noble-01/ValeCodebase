/* =============================================================================
   VGHLANTERN - SETTING OUT MODEL
   =============================================================================

   FILE       : VghLantern__Geometry__SettingOutModel__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - SettingOutModel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Publish the datums and construction triangles the factory works to
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - The single named home for lantern SETTING OUT: the level datums a saw is set
     to, and the construction triangles those levels are derived through.
   - ADDITIVE. It renames nothing and it changes no existing published number.
     SolvedSkeleton and GlazeBarSet stay exactly as they are; this module reads
     them and publishes a second, explicitly-named model beside them.
   - Every geometric entity here is built from REAL solved vertices - member end
     points from the SkeletonSolver - never from re-running the solver's own
     arithmetic. That is the whole point: a triangle drawn from actual member ends
     and labelled with the solver's reported scalar will visibly disagree when one
     of them is wrong.

   ---------------------------------------------------------------------------

   THE THREE CLASSES OF GEOMETRY, AND WHY THEY ARE NAMED APART

   The application handles three different kinds of geometry that had all been
   called some variation of "line" or "geometry" or "skeleton". They are now named
   so that no reader can confuse them:

       Datum          A named LEVEL or PLANE the factory cuts and sets to.
                      Top of builders upstand. Top of framework at eaves. Ridge.
                      Wrong by a millimetre means wrong metal.

       Construction   The DERIVATION triangles. Run, rise and hypotenuse. These
                      are not manufactured - they are how a datum's position is
                      arrived at, and the thing to inspect when a datum is wrong.

       Centreline     A member AXIS. The bridge between the two: construction
                      geometry positions a centreline, and a swept profile then
                      registers to it.

   Solid 3D mesh geometry is deliberately NOT in this module. It lives in Env3d
   and is named Solid3d throughout.

   ---------------------------------------------------------------------------

   ENTITY KEY GRAMMAR - three stages, delimited, same style as the config JSON:

       <Class>__<Family>__<Item>

       Class   : Datum | Construction | Centreline
       Family  : Deck | Upstand | Frame | Eaves | Ridge | Hip | HipEnd
                 | Roof | Glazing | GlazeBar | Transom
       Item    : Level | Plane | PitchTriangle | Run | Ring | Set

   So Datum__Upstand__TopLevel is unmistakably a level datum on the upstand, and
   Construction__Roof__PitchTriangle is unmistakably a derivation triangle.

   ---------------------------------------------------------------------------

   COORDINATE SPACE
   Model space millimetres, +Z up, exactly as the SkeletonSolver publishes. No
   environment conversion happens here - Env3d applies its own axis swap when it
   draws, and Env2d could consume this same model unchanged.

   ---------------------------------------------------------------------------

   THE WORKING DATUM IS THE TOP OF THE BUILDERS UPSTAND

   Geometry keeps solver coordinates, whose zero is the roof deck. Reported LEVELS
   are a separate question, and they are stated against the top of the builders
   upstand, because that is the surface Vale's framework lands on: the last thing
   built by others, the first thing Vale touches, and the level a fitter measures
   from on site.

   So on a 150 mm upstand with a 75 mm base frame:

       Ridge                        +469.7
       Top of framework at eaves     +75
       TOP OF BUILDERS UPSTAND         0     <-- datum
       Top of roof deck             -150

   Every datum carries BOTH LevelMm (solver coordinates, for checking against what
   the solver publishes) and RelativeLevelMm (working coordinates, for reading).
   A sloped datum has no single level and carries RelativeRangeMm instead.

   ---------------------------------------------------------------------------

   OUTPUT CONTRACT - SettingOutModel:

   {
       Meta        : { RoofForm, IsValid, ToleranceMm, LanternTitle,
                       DatumOrigin : { Key, Label, AbsoluteMm } },
       Datums      : [ {
                         Key, Label, Class, Family,
                         LevelMm,           solver coordinates
                         OriginMm,          where zero sits in those coordinates
                         RelativeLevelMm,   signed level from the datum, or null
                         RelativeRangeMm,   { MinMm, MaxMm } for a sloped datum
                         ReportedFrom : [ 'Meta.RidgeLevelMm', ... ],
                         Outlines     : [ [ pt, pt, pt, pt ] ],   closed rings
                         RunLines     : [ [ pt, pt ] ],
                         Planes       : [ { Key, Points[] } ]
                     } ],
       Triangles   : [ {
                         Key, Label, Class, Family, Corners : { Foot, Head, Corner },
                         Measured : { RunMm, RiseMm, HypotenuseMm, PitchDegrees },
                         Reported : { ... same fields, or null where unpublished }
                     } ],
       Centrelines : [ { Key, Label, Class, Family, Role, Segments : [ [a,b] ] } ],
       Checks      : [ { Key, Label, MeasuredMm, ReportedMm, DeltaMm,
                         ToleranceMm, Status, Detail } ],
       Warnings    : [ string ]
   }

   Check Status is 'pass' | 'fail' | 'unpublished'. 'unpublished' means the solver
   reports no counterpart to compare against, which is itself worth surfacing.

   ============================================================================= */

// =============================================================================
// REGION | Setting Out Model Module
// =============================================================================

const VghLantern__Geometry__SettingOutModel = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Entity Class Names
    // ------------------------------------------------------------
    const CLASS_DATUM         =  'Datum';                                    // <-- A level or plane the factory works to
    const CLASS_CONSTRUCTION  =  'Construction';                             // <-- A derivation triangle
    const CLASS_CENTRELINE    =  'Centreline';                               // <-- A member axis
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Solved Member Id Vocabulary
    // ------------------------------------------------------------
    // These ids are the SkeletonSolver's own, assigned by PushRing / PushMember.
    // Reading members by id rather than by role is deliberate: role alone cannot
    // distinguish the upstand base ring from the upstand top ring, and the whole
    // value of this module rests on knowing exactly which vertex is which.
    const ID_RING_UPSTAND_BASE  =  'upstandBase';                            // <-- _0.._3, at deck level
    const ID_RING_UPSTAND_TOP   =  'upstandTop';                             // <-- _0.._3, at top of builders upstand
    const ID_RING_FRAME_TOP     =  'frameTop';                               // <-- _0.._3, at top of base frame
    const ID_RING_EAVES         =  'eaves';                                  // <-- _0.._3, at eaves level, projected out
    const ID_RING_REVEAL_TOP    =  'revealTop';                              // <-- _0.._3, inner face of the upstand
    const ID_MEMBER_RIDGE       =  'ridge_0';                                // <-- Absent on a Pyramid
    const ID_MEMBER_HIP         =  'hip';                                    // <-- _0.._3
    const ID_ANCHOR_APEX        =  'finial_apex';                            // <-- Pyramid stands in for the ridge

    const RING_EDGE_COUNT       =  4;                                        // <-- Every ring is four members
    const RING_EDGE_LONG_A      =  0;                                        // <-- eaves_0 is a long edge
    const RING_EDGE_SHORT_A     =  1;                                        // <-- eaves_1 is a short, hip end edge
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Member and Face Role Keys
    // ------------------------------------------------------------
    const ROLE_GLAZING_BAR    =  'glazingBar';
    const ROLE_TRANSOM        =  'transom';
    const ROLE_HIP            =  'hip';
    const ROLE_RIDGE          =  'ridge';
    const ROLE_EAVES          =  'eaves';
    const FACE_ROLE_GLAZING   =  'glazingFace';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Check Status and Geometry Guards
    // ------------------------------------------------------------
    const STATUS_PASS         =  'pass';
    const STATUS_FAIL         =  'fail';
    const STATUS_UNPUBLISHED  =  'unpublished';                              // <-- Nothing published to compare against

    const DEFAULT_TOLERANCE_MM  =  0.5;                                      // <-- Used only if config has not resolved
    const DEGENERATE_LENGTH_MM  =  0.001;                                    // <-- Below this a run is treated as zero
    const RADIANS_TO_DEGREES    =  180 / Math.PI;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Point and Vector Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Copy a Solver Point
    // ------------------------------------------------------------
    // Copied rather than referenced so nothing downstream can mutate the solved
    // skeleton by editing a setting-out entity.
    function VghLantern__SettingOutModel__Point(source) {
        if (!source) return { x: 0, y: 0, z: 0 };
        return { x: Number(source.x) || 0, y: Number(source.y) || 0, z: Number(source.z) || 0 };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Midpoint of Two Points
    // ------------------------------------------------------------
    function VghLantern__SettingOutModel__Midpoint(a, b) {
        return {
            x : ((Number(a.x) || 0) + (Number(b.x) || 0)) / 2,
            y : ((Number(a.y) || 0) + (Number(b.y) || 0)) / 2,
            z : ((Number(a.z) || 0) + (Number(b.z) || 0)) / 2
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Plan Distance Between Two Points, Ignoring Level
    // ------------------------------------------------------------
    // The RUN of a construction triangle is by definition a plan measurement.
    function VghLantern__SettingOutModel__PlanRun(a, b) {
        const dx  =  (Number(b.x) || 0) - (Number(a.x) || 0);
        const dy  =  (Number(b.y) || 0) - (Number(a.y) || 0);
        return Math.sqrt(dx * dx + dy * dy);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Straight Line Distance Between Two Points
    // ------------------------------------------------------------
    function VghLantern__SettingOutModel__Distance(a, b) {
        const dx  =  (Number(b.x) || 0) - (Number(a.x) || 0);
        const dy  =  (Number(b.y) || 0) - (Number(a.y) || 0);
        const dz  =  (Number(b.z) || 0) - (Number(a.z) || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Solved Skeleton Lookups
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Index Every Member by Its Solver Id
    // ------------------------------------------------------------
    function VghLantern__SettingOutModel__IndexMembersById(skeleton) {
        const index  =  {};
        const list   =  (skeleton && skeleton.Members) || [];

        for (let i = 0; i < list.length; i++) {
            if (list[i] && list[i].Id) index[list[i].Id]  =  list[i];
        }
        return index;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Collect a Four Member Ring as an Ordered Closed Outline
    // ------------------------------------------------------------
    // Returns the ring's four corner points in walk order, or null when the ring
    // was not emitted - the base rings are all conditional on a non-zero height.
    function VghLantern__SettingOutModel__RingOutline(memberIndex, idPrefix) {
        const points  =  [];

        for (let i = 0; i < RING_EDGE_COUNT; i++) {
            const member  =  memberIndex[idPrefix + '_' + i];
            if (!member) return null;                                        // <-- Partial ring is no ring
            points.push(VghLantern__SettingOutModel__Point(member.Start));
        }
        return points;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Average Level of a Ring, and Its Spread
    // ------------------------------------------------------------
    // The spread is reported as well as the level: a ring whose four corners are
    // not at one height is a defect no single averaged number would reveal.
    function VghLantern__SettingOutModel__RingLevel(outline) {
        if (!outline || outline.length === 0) return null;

        let minZ  =  outline[0].z;
        let maxZ  =  outline[0].z;
        let sum   =  0;

        for (let i = 0; i < outline.length; i++) {
            sum   +=  outline[i].z;
            minZ  =   Math.min(minZ, outline[i].z);
            maxZ  =   Math.max(maxZ, outline[i].z);
        }

        return { LevelMm : sum / outline.length, SpreadMm : maxZ - minZ };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Ridge Head Point
    // ------------------------------------------------------------
    // A Pyramid collapses the ridge to a point and emits no ridge member at all,
    // so the apex anchor stands in. Returning the form alongside the point lets
    // the caller label a Pyramid honestly rather than drawing a zero length ridge.
    function VghLantern__SettingOutModel__RidgeHead(skeleton, memberIndex) {
        const ridge  =  memberIndex[ID_MEMBER_RIDGE];

        if (ridge) {
            return {
                Start    : VghLantern__SettingOutModel__Point(ridge.Start),
                End      : VghLantern__SettingOutModel__Point(ridge.End),
                Centre   : VghLantern__SettingOutModel__Midpoint(ridge.Start, ridge.End),
                IsApex   : false,
                Member   : ridge
            };
        }

        const anchors  =  (skeleton && skeleton.FinialAnchors) || [];
        for (let i = 0; i < anchors.length; i++) {
            if (anchors[i] && anchors[i].Id === ID_ANCHOR_APEX) {
                const apex  =  VghLantern__SettingOutModel__Point(anchors[i].Position);
                return { Start : apex, End : apex, Centre : apex, IsApex : true, Member : null };
            }
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Datum Origin
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Level Everything Is Set Out From
    // ------------------------------------------------------------
    // THE TOP OF THE BUILDERS UPSTAND IS ZERO.
    //
    // The solver works in a model space whose zero is the roof deck, because that
    // is where it starts building upward from. That is an implementation origin,
    // not a working one. On site, the top of the builders upstand is the surface
    // Vale's framework lands on - it is the last thing built by others and the
    // first thing Vale touches - so it is the level a fitter measures from and the
    // level a saw is set to.
    //
    // Nothing is moved. Model geometry keeps its solver coordinates exactly, and
    // only the REPORTED levels are expressed against this origin. A 150 mm upstand
    // therefore puts the roof deck at -150 and the top of the framework at +75.
    function VghLantern__SettingOutModel__DatumOriginMm(skeleton) {
        const base   =  skeleton.Base || {};
        const value  =  Number(base.UpstandTopLevelMm);

        return isFinite(value) ? value : 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Express Every Datum Against the Working Origin
    // ------------------------------------------------------------
    // Run as a single pass after the datums are built, so no builder has to carry
    // the origin around and no datum can be left in solver coordinates by accident.
    //
    // A sloped datum has no single level, so it reports a RANGE instead. The
    // glazing plane is the case: it runs from the eaves up to the ridge, and
    // stating both ends is more use than stating neither.
    function VghLantern__SettingOutModel__ApplyDatumOrigin(datums, originMm) {
        for (let i = 0; i < datums.length; i++) {
            const datum  =  datums[i];

            datum.OriginMm         =  originMm;
            datum.RelativeLevelMm  =  (datum.LevelMm === null || datum.LevelMm === undefined || isNaN(Number(datum.LevelMm)))
                ? null
                : Number(datum.LevelMm) - originMm;

            datum.RelativeRangeMm  =  null;
            if (!Array.isArray(datum.Planes) || datum.Planes.length === 0) continue;

            let minZ  =  Infinity;
            let maxZ  =  -Infinity;

            for (let p = 0; p < datum.Planes.length; p++) {
                const points  =  datum.Planes[p].Points || [];
                for (let v = 0; v < points.length; v++) {
                    minZ  =  Math.min(minZ, points[v].z);
                    maxZ  =  Math.max(maxZ, points[v].z);
                }
            }

            if (minZ !== Infinity) {
                datum.RelativeRangeMm  =  { MinMm : minZ - originMm, MaxMm : maxZ - originMm };
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Check Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Measured Against Reported Check
    // ------------------------------------------------------------
    // reportedValue of null or undefined yields status 'unpublished' rather than a
    // pass, because "nothing to compare against" and "compared and agreed" are
    // very different answers to the question this module exists to ask.
    function VghLantern__SettingOutModel__Check(key, label, measuredValue, reportedValue, toleranceMm, detail) {
        const measured  =  Number(measuredValue);

        if (reportedValue === null || reportedValue === undefined || isNaN(Number(reportedValue))) {
            return {
                Key         : key,
                Label       : label,
                MeasuredMm  : measured,
                ReportedMm  : null,
                DeltaMm     : null,
                ToleranceMm : toleranceMm,
                Status      : STATUS_UNPUBLISHED,
                Detail      : detail || ''
            };
        }

        const reported  =  Number(reportedValue);
        const delta     =  measured - reported;

        return {
            Key         : key,
            Label       : label,
            MeasuredMm  : measured,
            ReportedMm  : reported,
            DeltaMm     : delta,
            ToleranceMm : toleranceMm,
            Status      : Math.abs(delta) <= toleranceMm ? STATUS_PASS : STATUS_FAIL,
            Detail      : detail || ''
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Setting Out Tolerance From App Config
    // ------------------------------------------------------------
    function VghLantern__SettingOutModel__ToleranceMm() {
        const StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return DEFAULT_TOLERANCE_MM;

        const appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        const env3d      =  appConfig ? appConfig['VghLantern__Env3d__Config'] : null;
        const setOut     =  env3d ? env3d['VghLantern__Env3d__Config__SetOut'] : null;
        const value      =  setOut ? Number(setOut.CheckToleranceMm) : NaN;

        return isNaN(value) ? DEFAULT_TOLERANCE_MM : value;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Datum Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Level Datum Entity
    // ------------------------------------------------------------
    function VghLantern__SettingOutModel__Datum(key, family, label, levelMm, reportedFrom) {
        return {
            Key          : key,
            Label        : label,
            Class        : CLASS_DATUM,
            Family       : family,
            LevelMm      : levelMm,
            ReportedFrom : reportedFrom || [],
            Outlines     : [],                                               // <-- Closed rings traced at this level
            RunLines     : [],                                               // <-- Open runs, the ridge being the case
            Planes       : []                                                // <-- Sloped planes, the glazing being the case
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Every Level Datum From the Solved Rings
    // ------------------------------------------------------------
    // Each datum takes its LEVEL from the solver's published scalar and its
    // OUTLINE from the real ring members. Publishing both is what makes the level
    // checkable rather than merely displayable.
    function VghLantern__SettingOutModel__BuildDatums(skeleton, memberIndex, ridgeHead, checks, toleranceMm) {
        const meta    =  skeleton.Meta || {};
        const base    =  skeleton.Base || {};
        const datums  =  [];

        // DECK LEVEL | The zero the whole lantern is set out from
        const upstandBaseRing  =  VghLantern__SettingOutModel__RingOutline(memberIndex, ID_RING_UPSTAND_BASE);
        if (upstandBaseRing) {
            const datum  =  VghLantern__SettingOutModel__Datum(
                'Datum__Deck__Level', 'Deck', 'Top of Roof Deck',
                Number(base.UpstandBaseLevelMm), ['Base.UpstandBaseLevelMm']
            );
            datum.Outlines.push(upstandBaseRing);
            datums.push(datum);

            const measured  =  VghLantern__SettingOutModel__RingLevel(upstandBaseRing);
            checks.push(VghLantern__SettingOutModel__Check(
                'Check__Deck__Level', 'Deck level',
                measured.LevelMm, base.UpstandBaseLevelMm, toleranceMm,
                'Measured from the upstandBase ring corners.'
            ));
        }

        // TOP OF BUILDERS UPSTAND | Where site-built work stops and Vale starts
        const upstandTopRing  =  VghLantern__SettingOutModel__RingOutline(memberIndex, ID_RING_UPSTAND_TOP);
        if (upstandTopRing) {
            const datum  =  VghLantern__SettingOutModel__Datum(
                'Datum__Upstand__TopLevel', 'Upstand', 'Top of Builders Upstand',
                Number(base.UpstandTopLevelMm), ['Base.UpstandTopLevelMm', 'Meta.UpstandTopLevelMm']
            );
            datum.Outlines.push(upstandTopRing);

            const revealTopRing  =  VghLantern__SettingOutModel__RingOutline(memberIndex, ID_RING_REVEAL_TOP);
            if (revealTopRing) datum.Outlines.push(revealTopRing);           // <-- Inner face, so the wall thickness reads

            datums.push(datum);

            const measured  =  VghLantern__SettingOutModel__RingLevel(upstandTopRing);
            checks.push(VghLantern__SettingOutModel__Check(
                'Check__Upstand__TopLevel', 'Top of builders upstand',
                measured.LevelMm, base.UpstandTopLevelMm, toleranceMm,
                'Measured from the upstandTop ring corners.'
            ));
            checks.push(VghLantern__SettingOutModel__Check(
                'Check__Upstand__TopLevelMetaAgrees', 'Upstand top, Meta agrees with Base',
                Number(base.UpstandTopLevelMm), meta.UpstandTopLevelMm, toleranceMm,
                'The only level published in both blocks. They must never diverge.'
            ));
        }

        // TOP OF FRAMEWORK AT EAVES | The roof springing line
        const frameTopRing  =  VghLantern__SettingOutModel__RingOutline(memberIndex, ID_RING_FRAME_TOP);
        const eavesRing     =  VghLantern__SettingOutModel__RingOutline(memberIndex, ID_RING_EAVES);

        if (frameTopRing || eavesRing) {
            const datum  =  VghLantern__SettingOutModel__Datum(
                'Datum__Frame__EavesTopLevel', 'Frame', 'Top of Framework at Eaves',
                Number(base.FrameTopLevelMm), ['Base.FrameTopLevelMm', 'Meta.EavesLevelMm']
            );

            // Both rings sit at this one level. Drawing both is deliberate: the gap
            // between them IS the eaves projection, and seeing them coincide is how
            // a zero-projection lantern announces itself.
            if (frameTopRing) datum.Outlines.push(frameTopRing);
            if (eavesRing)    datum.Outlines.push(eavesRing);
            datums.push(datum);

            if (eavesRing) {
                const measured  =  VghLantern__SettingOutModel__RingLevel(eavesRing);
                checks.push(VghLantern__SettingOutModel__Check(
                    'Check__Frame__EavesTopLevel', 'Top of framework at eaves',
                    measured.LevelMm, meta.EavesLevelMm, toleranceMm,
                    'Measured from the eaves ring corners.'
                ));
                checks.push(VghLantern__SettingOutModel__Check(
                    'Check__Frame__EavesAliasAgrees', 'Eaves level equals base frame top',
                    Number(meta.EavesLevelMm), base.FrameTopLevelMm, toleranceMm,
                    'One physical datum published under two names in two blocks. Env2d reads Meta.EavesLevelMm, Env3d reads Base.FrameTopLevelMm.'
                ));
            }
        }

        // RIDGE | A run, not a perimeter - a rectangle at ridge level would be air
        if (ridgeHead) {
            const datum  =  VghLantern__SettingOutModel__Datum(
                'Datum__Ridge__Level', 'Ridge',
                ridgeHead.IsApex ? 'Apex Level' : 'Ridge Level',
                Number(meta.RidgeLevelMm), ['Meta.RidgeLevelMm']
            );

            if (!ridgeHead.IsApex) {
                datum.RunLines.push([ridgeHead.Start, ridgeHead.End]);
            }
            datums.push(datum);

            checks.push(VghLantern__SettingOutModel__Check(
                'Check__Ridge__Level', ridgeHead.IsApex ? 'Apex level' : 'Ridge level',
                ridgeHead.Start.z, meta.RidgeLevelMm, toleranceMm,
                ridgeHead.IsApex
                    ? 'Pyramid: measured from the apex finial anchor, the ridge member is not emitted.'
                    : 'Measured from the ridge member end points.'
            ));
        }

        // GLAZING PLANE | What a glaze bar section registers to
        const glazingDatum  =  VghLantern__SettingOutModel__Datum(
            'Datum__Glazing__Plane', 'Glazing', 'Glazing Plane',
            null, ['skeleton.Faces[].Points']
        );

        const faces  =  skeleton.Faces || [];
        for (let i = 0; i < faces.length; i++) {
            if (!faces[i] || faces[i].Role !== FACE_ROLE_GLAZING) continue;
            if (!Array.isArray(faces[i].Points) || faces[i].Points.length < 3) continue;

            const planePoints  =  [];
            for (let p = 0; p < faces[i].Points.length; p++) {
                planePoints.push(VghLantern__SettingOutModel__Point(faces[i].Points[p]));
            }
            glazingDatum.Planes.push({
                Key           : 'Datum__Glazing__Plane__' + faces[i].Id,
                Label         : faces[i].SlopeKey || faces[i].Id,
                Points        : planePoints,
                PitchDegrees  : Number(faces[i].PitchDegrees)
            });
        }
        if (glazingDatum.Planes.length > 0) datums.push(glazingDatum);

        return datums;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction Triangle Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Right Angled Construction Triangle
    // ------------------------------------------------------------
    // foot is the low corner, head the high corner. The right angle corner is the
    // vertical projection of head down to foot level, which is what makes run and
    // rise readable straight off the drawing.
    function VghLantern__SettingOutModel__Triangle(key, family, label, foot, head, reported) {
        const corner  =  { x : head.x, y : head.y, z : foot.z };

        const runMm   =  VghLantern__SettingOutModel__PlanRun(foot, head);
        const riseMm  =  head.z - foot.z;
        const hypMm   =  VghLantern__SettingOutModel__Distance(foot, head);

        return {
            Key      : key,
            Label    : label,
            Class    : CLASS_CONSTRUCTION,
            Family   : family,
            Corners  : { Foot : foot, Head : head, Corner : corner },
            Measured : {
                RunMm        : runMm,
                RiseMm       : riseMm,
                HypotenuseMm : hypMm,
                PitchDegrees : runMm > DEGENERATE_LENGTH_MM
                    ? Math.atan2(riseMm, runMm) * RADIANS_TO_DEGREES
                    : 90
            },
            Reported : reported || null
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Every Construction Triangle From Solved Vertices
    // ------------------------------------------------------------
    function VghLantern__SettingOutModel__BuildTriangles(skeleton, memberIndex, ridgeHead, checks, toleranceMm) {
        const meta       =  skeleton.Meta || {};
        const triangles  =  [];
        if (!ridgeHead) return triangles;

        // ROOF PITCH TRIANGLE | Common rafter on a long slope.
        // Foot is the midpoint of a long eaves edge; head is the ridge centre. Both
        // sit on the lantern centreline in plan, so the run is the true half span.
        const longEaves  =  memberIndex[ID_RING_EAVES + '_' + RING_EDGE_LONG_A];
        if (longEaves) {
            const foot  =  VghLantern__SettingOutModel__Midpoint(longEaves.Start, longEaves.End);
            const head  =  VghLantern__SettingOutModel__Point(ridgeHead.Centre);

            const triangle  =  VghLantern__SettingOutModel__Triangle(
                'Construction__Roof__PitchTriangle', 'Roof', 'Roof Pitch Triangle',
                foot, head,
                {
                    RunMm        : null,                                     // <-- The solver publishes no run scalar
                    RiseMm       : Number(meta.RiseMm),
                    HypotenuseMm : Number(meta.ShortRafterLengthMm),
                    PitchDegrees : Number(meta.PitchDegrees)
                }
            );
            triangles.push(triangle);

            checks.push(VghLantern__SettingOutModel__Check(
                'Check__Roof__Rise', 'Roof rise',
                triangle.Measured.RiseMm, meta.RiseMm, toleranceMm,
                'Ridge level less eaves level, measured from real end points.'
            ));
            checks.push(VghLantern__SettingOutModel__Check(
                'Check__Roof__RafterLength', 'Common rafter length',
                triangle.Measured.HypotenuseMm, meta.ShortRafterLengthMm, toleranceMm,
                'Hypotenuse of the roof pitch triangle.'
            ));
            checks.push(VghLantern__SettingOutModel__Check(
                'Check__Roof__Pitch', 'Roof pitch',
                triangle.Measured.PitchDegrees, meta.PitchDegrees, toleranceMm,
                'Degrees, compared against the same tolerance as a millimetre. Tighten CheckToleranceMm if that is too loose for angles.'
            ));
        }

        // HIP END PITCH TRIANGLE | Common rafter on a hip end
        const shortEaves  =  memberIndex[ID_RING_EAVES + '_' + RING_EDGE_SHORT_A];
        if (shortEaves && !ridgeHead.IsApex) {
            const foot  =  VghLantern__SettingOutModel__Midpoint(shortEaves.Start, shortEaves.End);
            const head  =  VghLantern__SettingOutModel__Point(ridgeHead.End);

            const triangle  =  VghLantern__SettingOutModel__Triangle(
                'Construction__HipEnd__PitchTriangle', 'HipEnd', 'Hip End Pitch Triangle',
                foot, head,
                {
                    RunMm        : null,
                    RiseMm       : Number(meta.RiseMm),
                    HypotenuseMm : Number(meta.LongRafterLengthMm),
                    PitchDegrees : Number(meta.LongSlopePitchDeg)
                }
            );
            triangles.push(triangle);

            checks.push(VghLantern__SettingOutModel__Check(
                'Check__HipEnd__RafterLength', 'Hip end rafter length',
                triangle.Measured.HypotenuseMm, meta.LongRafterLengthMm, toleranceMm,
                'Hypotenuse of the hip end pitch triangle.'
            ));
        }

        // HIP PITCH TRIANGLES | One per corner, run measured on the plan diagonal
        const hipLengths  =  [];
        for (let i = 0; i < RING_EDGE_COUNT; i++) {
            const hip  =  memberIndex[ID_MEMBER_HIP + '_' + i];
            if (!hip) continue;

            const foot  =  VghLantern__SettingOutModel__Point(hip.Start);
            const head  =  VghLantern__SettingOutModel__Point(hip.End);

            const triangle  =  VghLantern__SettingOutModel__Triangle(
                'Construction__Hip__PitchTriangle__' + i, 'Hip', 'Hip Pitch Triangle ' + (i + 1),
                foot, head,
                {
                    RunMm        : null,
                    RiseMm       : Number(meta.RiseMm),
                    HypotenuseMm : Number(meta.HipLengthMm),
                    PitchDegrees : Number(meta.HipAngleDegrees)
                }
            );
            triangles.push(triangle);
            hipLengths.push(triangle.Measured.HypotenuseMm);
        }

        if (hipLengths.length > 0) {
            // Compared once against the reported scalar rather than four times, and
            // separately checked for equality between themselves. A rectangular
            // Pyramid is the case that separates these two questions.
            checks.push(VghLantern__SettingOutModel__Check(
                'Check__Hip__Length', 'Hip length',
                hipLengths[0], meta.HipLengthMm, toleranceMm,
                'Measured along hip_0 from its real end points.'
            ));

            let spread  =  0;
            for (let i = 1; i < hipLengths.length; i++) {
                spread  =  Math.max(spread, Math.abs(hipLengths[i] - hipLengths[0]));
            }
            checks.push(VghLantern__SettingOutModel__Check(
                'Check__Hip__AllFourEqual', 'All four hips equal',
                spread, 0, toleranceMm,
                'Largest difference between any hip and hip_0. Any spread means the ring or the hip pairing has drifted.'
            ));
        }

        return triangles;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Centreline Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Centreline Set From Members Matching a Role
    // ------------------------------------------------------------
    function VghLantern__SettingOutModel__CentrelineSet(key, family, label, role, memberList) {
        const segments  =  [];

        for (let i = 0; i < memberList.length; i++) {
            const member  =  memberList[i];
            if (!member || member.Role !== role) continue;

            segments.push([
                VghLantern__SettingOutModel__Point(member.Start),
                VghLantern__SettingOutModel__Point(member.End)
            ]);
        }

        if (segments.length === 0) return null;

        return {
            Key      : key,
            Label    : label,
            Class    : CLASS_CENTRELINE,
            Family   : family,
            Role     : role,
            Segments : segments
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Every Centreline Set
    // ------------------------------------------------------------
    // Glazing bars come from the bar layout pass rather than the skeleton, which is
    // why they are concatenated here rather than read from skeleton.Members.
    function VghLantern__SettingOutModel__BuildCentrelines(skeleton, barSet, checks, toleranceMm) {
        const members  =  (skeleton.Members || []).slice();
        const bars     =  (barSet && Array.isArray(barSet.Bars)) ? barSet.Bars : [];
        const all      =  members.concat(bars);
        const sets     =  [];

        const definitions  =  [
            ['Centreline__GlazeBar__Set',  'GlazeBar', 'Glaze Bar Centrelines', ROLE_GLAZING_BAR],
            ['Centreline__Transom__Set',   'Transom',  'Transom Centrelines',   ROLE_TRANSOM],
            ['Centreline__Ridge__Run',     'Ridge',    'Ridge Centreline',      ROLE_RIDGE],
            ['Centreline__Hip__Set',       'Hip',      'Hip Centrelines',       ROLE_HIP],
            ['Centreline__Eaves__Ring',    'Eaves',    'Eaves Centrelines',     ROLE_EAVES]
        ];

        for (let i = 0; i < definitions.length; i++) {
            const set  =  VghLantern__SettingOutModel__CentrelineSet(
                definitions[i][0], definitions[i][1], definitions[i][2], definitions[i][3], all
            );
            if (set) sets.push(set);
        }

        // Every glazing bar must start exactly on the eaves level. There is no
        // rebate, setback or profile allowance anywhere in the geometry layer, so
        // this is a zero tolerance identity rather than an approximation.
        const eavesLevelMm  =  Number((skeleton.Meta || {}).EavesLevelMm);
        let worstDelta      =  0;

        for (let i = 0; i < bars.length; i++) {
            if (!bars[i] || bars[i].Role !== ROLE_GLAZING_BAR) continue;

            const lowZ  =  Math.min(Number(bars[i].Start.z), Number(bars[i].End.z));
            worstDelta  =  Math.max(worstDelta, Math.abs(lowZ - eavesLevelMm));
        }

        if (bars.length > 0 && !isNaN(eavesLevelMm)) {
            checks.push(VghLantern__SettingOutModel__Check(
                'Check__GlazeBar__FootOnEaves', 'Glaze bar feet on eaves level',
                worstDelta, 0, toleranceMm,
                'Largest departure of any glazing bar foot from the eaves level.'
            ));
        }

        return sets;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Build Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Setting Out Model for a Solved Lantern
    // ------------------------------------------------------------
    // Returns null only when there is no solved geometry at all. An INVALID
    // skeleton still yields a model, deliberately: an invalid solve is exactly when
    // a reviewer most wants to see where the setting out went.
    function VghLantern__SettingOutModel__Build(skeleton, barSet, lantern) {
        if (!skeleton || !Array.isArray(skeleton.Members)) return null;

        const toleranceMm  =  VghLantern__SettingOutModel__ToleranceMm();
        const memberIndex  =  VghLantern__SettingOutModel__IndexMembersById(skeleton);
        const ridgeHead    =  VghLantern__SettingOutModel__RidgeHead(skeleton, memberIndex);
        const originMm     =  VghLantern__SettingOutModel__DatumOriginMm(skeleton);
        const meta         =  skeleton.Meta || {};
        const checks       =  [];
        const warnings     =  [];

        const datums       =  VghLantern__SettingOutModel__BuildDatums(skeleton, memberIndex, ridgeHead, checks, toleranceMm);
        const triangles    =  VghLantern__SettingOutModel__BuildTriangles(skeleton, memberIndex, ridgeHead, checks, toleranceMm);
        const centrelines  =  VghLantern__SettingOutModel__BuildCentrelines(skeleton, barSet, checks, toleranceMm);

        // Levels are stated against the working origin, not the solver's. Done in
        // one pass here so no datum can be left in solver coordinates by accident.
        VghLantern__SettingOutModel__ApplyDatumOrigin(datums, originMm);

        // Read highest first, so the block reads as a level schedule rather than as
        // a list in build order. Sloped datums have no single level and sort last.
        datums.sort(function(a, b) {
            const levelA  =  (a.RelativeLevelMm === null) ? -Infinity : a.RelativeLevelMm;
            const levelB  =  (b.RelativeLevelMm === null) ? -Infinity : b.RelativeLevelMm;
            return levelB - levelA;
        });

        // OVERALL HEIGHT | Published as a height but assigned a level. The two agree
        // only while the deck datum is zero, so the check states the assumption.
        const bounds  =  skeleton.Bounds;
        if (bounds) {
            checks.push(VghLantern__SettingOutModel__Check(
                'Check__Model__OverallHeight', 'Overall height',
                Number(bounds.MaxZ) - Number(bounds.MinZ), meta.OverallHeightMm, toleranceMm,
                'Meta.OverallHeightMm is assigned the ridge LEVEL, so it equals a height only while the deck datum is zero.'
            ));
        }

        for (let i = 0; i < checks.length; i++) {
            if (checks[i].Status === STATUS_FAIL) {
                warnings.push(checks[i].Label + ': measured ' + checks[i].MeasuredMm.toFixed(2) +
                    ' against reported ' + checks[i].ReportedMm.toFixed(2) +
                    ' (out by ' + checks[i].DeltaMm.toFixed(2) + ').');
            }
        }

        if (Array.isArray(meta.Warnings)) {
            for (let i = 0; i < meta.Warnings.length; i++) warnings.push(meta.Warnings[i]);
        }

        return {
            Meta : {
                RoofForm      : meta.RoofForm || '',
                IsValid       : meta.IsValid === true,
                ToleranceMm   : toleranceMm,
                DatumOrigin   : {
                    Key        : 'Datum__Upstand__TopLevel',
                    Label      : 'Top of Builders Upstand',
                    AbsoluteMm : originMm                                    // <-- Where zero sits in solver coordinates
                },
                LanternTitle  : (lantern && lantern['Lantern__Identity__Config'])
                    ? (lantern['Lantern__Identity__Config']['Lantern__Identity__Config__Title'] || '')
                    : '',
                IsApexForm    : !!(ridgeHead && ridgeHead.IsApex)
            },
            Datums      : datums,
            Triangles   : triangles,
            Centrelines : centrelines,
            Checks      : checks,
            Warnings    : warnings
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Summarise the Check Results
    // ------------------------------------------------------------
    // Surfaced by the 3D setting-out overlay so a reviewer sees at a glance whether
    // anything disagrees, without reading every row.
    function VghLantern__SettingOutModel__CheckSummary(settingOutModel) {
        const summary  =  { Total : 0, Passed : 0, Failed : 0, Unpublished : 0 };
        if (!settingOutModel || !Array.isArray(settingOutModel.Checks)) return summary;

        for (let i = 0; i < settingOutModel.Checks.length; i++) {
            summary.Total++;
            if      (settingOutModel.Checks[i].Status === STATUS_PASS)        summary.Passed++;
            else if (settingOutModel.Checks[i].Status === STATUS_FAIL)        summary.Failed++;
            else if (settingOutModel.Checks[i].Status === STATUS_UNPUBLISHED) summary.Unpublished++;
        }
        return summary;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SettingOutModel__Build         : VghLantern__SettingOutModel__Build,
        VghLantern__SettingOutModel__CheckSummary  : VghLantern__SettingOutModel__CheckSummary,

        VghLantern__SettingOutModel__StatusPass         : STATUS_PASS,
        VghLantern__SettingOutModel__StatusFail         : STATUS_FAIL,
        VghLantern__SettingOutModel__StatusUnpublished  : STATUS_UNPUBLISHED
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__SettingOutModel  =  VghLantern__Geometry__SettingOutModel;
