/* =============================================================================
   VGHLANTERN - BASE FRAME ASSEMBLY GEOMETRY
   =============================================================================

   FILE       : VghLantern__Geometry__BaseFrameAssembly__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - BaseFrameAssembly
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Pure geometry for the Vale base frame and the eaves datum
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - The one place the eaves datum construction is reasoned about. Both render
     environments consume this module's answers; neither re-derives them.
   - THE DATUM: the Sapele head beam (125 wide x 96 tall) seats atop the
     builders upstand with its outer face flush with the upstand outer face,
     so the stated Length/Width envelope is unchanged. The head beam underside
     is the +/-0000 seating benchmark. The EAVES DATUM POINT sits on the head
     beam inner face plane (125mm inboard of each stated face), 100mm above
     the benchmark. The roof springs from the ring of those points.
   - SECTION FRAME: all three base frame assets (46_1001 head beam, 46_1002
     eaves extrusion, 46_1003 lead flashing) are authored about that datum:
     section 0,0 is the datum point, -x runs outboard, +y runs up.
   - PITCH TRANSFORMS: the eaves extrusion is authored unrotated and is rotated
     about the datum origin to the roof pitch before sweeping. The head beam
     and flashing weathered tops were exported cut for a reference pitch; at
     any other pitch their top construction is re-sloped about the datum while
     the seating, outer face, rebate and outer chamfer construction stay fixed.
   - EAVES INTERFACE: the glaze bar core extends 42.5mm and the cap 170mm
     along the pitch past the datum; the timber trim stops with a vertical
     plumb cut whose plane is 18mm horizontally inboard of the datum point.
     Those numbers come from the base frame system index, answered
     synchronously by VghLantern__AppData__BaseFrameSystemLoader.
   - Contains no DOM access and no fetches. Faces passed in are never mutated;
     transformed copies are returned.

   ============================================================================= */

// =============================================================================
// REGION | Base Frame Assembly Geometry Module
// =============================================================================

const VghLantern__Geometry__BaseFrameAssembly = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Numeric Guards
    // ------------------------------------------------------------
    const DEG_TO_RAD               =  Math.PI / 180;
    const VERTEX_MATCH_TOLERANCE   =  0.02;                                  // <-- mm - exported coords carry three decimals
    const MIN_INTERSECT_ANGLE_DEG  =  1;                                     // <-- Below this two construction lines are as good as parallel
    const EAVES_LEVEL_TOLERANCE    =  0.5;                                   // <-- mm - matches the setting out check tolerance
    const OUTER_FACE_MIN_Y         =  -92;                                   // <-- The lap face keeps 8mm of outer face above the beam bottom (-100)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Datum Fallbacks
    // ------------------------------------------------------------
    // Mirror the base frame system index. Used only if the loader is absent,
    // which a correctly ordered script load never allows.
    const FALLBACK_HEAD_BEAM_WIDTH_MM   =  125;
    const FALLBACK_HEAD_BEAM_HEIGHT_MM  =  96;
    const FALLBACK_DATUM_RISE_MM        =  100;
    const FALLBACK_CORE_EXTENSION_MM    =  42.5;
    const FALLBACK_CAP_EXTENSION_MM     =  170;
    const FALLBACK_TRIM_PLUMB_INSET_MM  =  18;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loader Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Base Frame System Loader, if Present
    // ------------------------------------------------------------
    function VghLantern__BaseFrameAssembly__Loader() {
        return window.VghLantern__AppData__BaseFrameSystemLoader || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Datum Construction Numbers (synchronous)
    // ------------------------------------------------------------
    function VghLantern__BaseFrameAssembly__DatumGeometry() {
        var loader  =  VghLantern__BaseFrameAssembly__Loader();
        if (loader) return loader.VghLantern__BaseFrameSystemLoader__DatumGeometry();

        return {
            HeadBeamWidthMm            : FALLBACK_HEAD_BEAM_WIDTH_MM,
            HeadBeamHeightMm           : FALLBACK_HEAD_BEAM_HEIGHT_MM,
            EavesDatumRiseAboveSeatMm  : FALLBACK_DATUM_RISE_MM
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Glaze Bar Eaves Interface Numbers (synchronous)
    // ------------------------------------------------------------
    function VghLantern__BaseFrameAssembly__EavesInterface() {
        var loader  =  VghLantern__BaseFrameAssembly__Loader();
        if (loader) return loader.VghLantern__BaseFrameSystemLoader__EavesInterface();

        return {
            GlazeBarCoreExtensionAlongPitchMm  : FALLBACK_CORE_EXTENSION_MM,
            GlazeBarCapExtensionAlongPitchMm   : FALLBACK_CAP_EXTENSION_MM,
            GlazeBarTrimPlumbCutInsetMm        : FALLBACK_TRIM_PLUMB_INSET_MM
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Vector Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Rotate a 2D Point About the Origin (CCW positive)
    // ------------------------------------------------------------
    function VghLantern__BaseFrameAssembly__Rotate(point, cosA, sinA) {
        return {
            x : (point.x * cosA) - (point.y * sinA),
            y : (point.x * sinA) + (point.y * cosA)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Intersect Two 2D Lines Given Point and Direction
    // ------------------------------------------------------------
    // Returns null when the lines are within MIN_INTERSECT_ANGLE_DEG of
    // parallel - the caller treats that as "this re-slope has run out of road".
    function VghLantern__BaseFrameAssembly__IntersectLines(pointA, dirA, pointB, dirB) {
        var cross  =  (dirA.x * dirB.y) - (dirA.y * dirB.x);
        var lenA   =  Math.hypot(dirA.x, dirA.y);
        var lenB   =  Math.hypot(dirB.x, dirB.y);

        if (lenA === 0 || lenB === 0) return null;
        if (Math.abs(cross / (lenA * lenB)) < Math.sin(MIN_INTERSECT_ANGLE_DEG * DEG_TO_RAD)) return null;

        var dx  =  pointB.x - pointA.x;
        var dy  =  pointB.y - pointA.y;
        var t   =  ((dx * dirB.y) - (dy * dirB.x)) / cross;

        return {
            x : pointA.x + (dirA.x * t),
            y : pointA.y + (dirA.y * t)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Deep Copy a Stitched Face List, Points Transformed
    // ------------------------------------------------------------
    // transformPoint receives {x,y} and returns {x,y}. Rings and Triangles are
    // index data over the point list, so they carry across untouched.
    function VghLantern__BaseFrameAssembly__MapFaces(faces, transformPoint) {
        var out  =  [];
        var i, j, face, points;

        for (i = 0; i < faces.length; i++) {
            face    =  faces[i];
            points  =  [];
            for (j = 0; j < face.Points.length; j++) {
                points.push(transformPoint(face.Points[j]));
            }
            out.push({
                Points    : points,
                Rings     : face.Rings,
                Triangles : face.Triangles,
                AreaSqMm  : face.AreaSqMm,
                HoleCount : face.HoleCount
            });
        }
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Does a Point Match a Reference Vertex
    // ------------------------------------------------------------
    function VghLantern__BaseFrameAssembly__Matches(point, reference) {
        return Math.abs(point.x - reference.X) <= VERTEX_MATCH_TOLERANCE
            && Math.abs(point.y - reference.Y) <= VERTEX_MATCH_TOLERANCE;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Direction From One Reference Vertex to Another
    // ------------------------------------------------------------
    function VghLantern__BaseFrameAssembly__RefDir(fromRef, toRef) {
        return { x: toRef.X - fromRef.X, y: toRef.Y - fromRef.Y };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pitch Transforms on Section Faces
// -----------------------------------------------------------------------------

    // FUNCTION | Rotate a Section About the Datum Origin (eaves extrusion)
    // ------------------------------------------------------------
    // The extrusion is authored unrotated; positive rotation tips the outboard
    // (-x) side of the section DOWN, which is what a roof pitch does to it.
    function VghLantern__BaseFrameAssembly__RotateFaces(faces, pitchDegrees) {
        var angle  =  Number(pitchDegrees) * DEG_TO_RAD;
        var cosA   =  Math.cos(angle);
        var sinA   =  Math.sin(angle);

        return VghLantern__BaseFrameAssembly__MapFaces(faces, function(pt) {
            return VghLantern__BaseFrameAssembly__Rotate(pt, cosA, sinA);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Reference Pitch the Assets Were Exported At
    // ------------------------------------------------------------
    // Read off the head beam's inner seating face: datum inner top corner down
    // to the top of the rebate. That face carries the rotated extrusion, so its
    // slope IS the pitch the workshop model was cut for.
    function VghLantern__BaseFrameAssembly__ReferencePitchDegrees(reference) {
        var beam  =  reference.HeadBeam;
        var rise  =  beam.InnerTopCorner.Y - beam.RebateOuterTop.Y;
        var run   =  beam.InnerTopCorner.X - beam.RebateOuterTop.X;
        return Math.atan2(rise, run) / DEG_TO_RAD;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply a Vertex Move Map to a Face List
    // ------------------------------------------------------------
    // moves is a list of { From: {X,Y}, To: {x,y} }. Every point matching a
    // From (within tolerance) is replaced by its To; everything else passes
    // through untouched. Topology (Rings, Triangles) is index data and is
    // preserved, which is why re-sloping moves vertices instead of rebuilding
    // the loop.
    function VghLantern__BaseFrameAssembly__ApplyMoves(faces, moves) {
        return VghLantern__BaseFrameAssembly__MapFaces(faces, function(pt) {
            var i;
            for (i = 0; i < moves.length; i++) {
                if (VghLantern__BaseFrameAssembly__Matches(pt, moves[i].From)) {
                    return { x: moves[i].To.x, y: moves[i].To.y };
                }
            }
            return { x: pt.x, y: pt.y };
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parameter of a Point Along a Reference Segment
    // ------------------------------------------------------------
    // 0 at fromRef, 1 at toRef. Used to decide whether a re-intersection landed
    // ON the fixed construction segment or ran past its foot.
    function VghLantern__BaseFrameAssembly__ParamAlong(point, fromRef, toRef) {
        var dx   =  toRef.X - fromRef.X;
        var dy   =  toRef.Y - fromRef.Y;
        var len2 =  (dx * dx) + (dy * dy);
        if (len2 <= 0) return 0;
        return (((point.x - fromRef.X) * dx) + ((point.y - fromRef.Y) * dy)) / len2;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Solve the Beam Top Construction for One Pitch Delta
    // ------------------------------------------------------------
    // The whole top construction (seat face, rebate, lap face) rotates about
    // the datum origin by the delta, then re-anchors against the parts of the
    // beam that never move:
    //   - the seat face re-intersects the inner face plane (x = 0)
    //   - the lap face re-intersects the fixed outer chamfer. When the pitch
    //     is steep enough that the lap line passes BELOW the chamfer foot
    //     (about 28 degrees and up), the chamfer is CONSUMED: the lap runs
    //     straight to the outer face and the chamfer collapses to that point.
    // Returns null when a required intersection degenerates, else the solved
    // vertex set plus the rotated lap line for the flashing to reuse.
    function VghLantern__BaseFrameAssembly__SolveBeamTop(deltaDegrees, reference) {
        var beam   =  reference.HeadBeam;
        var angle  =  deltaDegrees * DEG_TO_RAD;
        var cosA   =  Math.cos(angle);
        var sinA   =  Math.sin(angle);

        function rot(ref) { return VghLantern__BaseFrameAssembly__Rotate({ x: ref.X, y: ref.Y }, cosA, sinA); }
        function rotDir(dir) { return VghLantern__BaseFrameAssembly__Rotate(dir, cosA, sinA); }

        var rebateOuterTop  =  rot(beam.RebateOuterTop);
        var rebateBase      =  rot(beam.RebateBase);

        // Seat face back onto the inner face plane.
        var seatDir   =  rotDir(VghLantern__BaseFrameAssembly__RefDir(beam.RebateOuterTop, beam.InnerTopCorner));
        var innerTop  =  VghLantern__BaseFrameAssembly__IntersectLines(
            rebateOuterTop, seatDir, { x: 0, y: 0 }, { x: 0, y: 1 });
        if (!innerTop) return null;

        // Lap face against the fixed chamfer, or straight to the outer face.
        var lapDir        =  rotDir(VghLantern__BaseFrameAssembly__RefDir(beam.RebateBase, beam.ChamferTop));
        var chamferPoint  =  { x: beam.ChamferBase.X, y: beam.ChamferBase.Y };
        var chamferDir    =  VghLantern__BaseFrameAssembly__RefDir(beam.ChamferBase, beam.ChamferTop);

        var chamferHit  =  VghLantern__BaseFrameAssembly__IntersectLines(rebateBase, lapDir, chamferPoint, chamferDir);
        var chamferTop, chamferBase;

        // The chamfer hit is only real when it sits OUTBOARD of the lap's own
        // start AND above the chamfer foot. Once the lap steepens past the
        // chamfer angle the line pair still crosses - far inboard, above the
        // beam - and that phantom point must fall through to the outer face
        // branch, not be taken as a chamfer.
        var chamferHitIsValid  =  chamferHit
            && chamferHit.x <= rebateBase.x
            && VghLantern__BaseFrameAssembly__ParamAlong(chamferHit, beam.ChamferBase, beam.ChamferTop) > 0.001;

        if (chamferHitIsValid) {
            chamferTop   =  chamferHit;
            chamferBase  =  chamferPoint;
        } else {
            var outerHit  =  VghLantern__BaseFrameAssembly__IntersectLines(
                rebateBase, lapDir, chamferPoint, { x: 0, y: 1 });
            if (!outerHit) return null;
            chamferTop   =  outerHit;                                        // <-- Chamfer consumed: lap meets the outer face
            chamferBase  =  outerHit;                                        // <-- Collapsed - the vertex pair coincides
        }

        return {
            InnerTop       : innerTop,
            RebateOuterTop : rebateOuterTop,
            RebateBase     : rebateBase,
            ChamferTop     : chamferTop,
            ChamferBase    : chamferBase,
            RotatePoint    : rot,
            RotateDir      : rotDir
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Pitch Delta, Floored at the Outer Face
    // ------------------------------------------------------------
    // A fixed 96mm beam cannot carry an arbitrarily steep top: past a point the
    // lap face would exit through the beam's bottom. The delta is bisected down
    // until the outer face corner keeps OUTER_FACE_MIN_Y of timber below the
    // datum frame - beyond that the extrusion still rotates to the true pitch
    // and only the timber top stops steepening.
    function VghLantern__BaseFrameAssembly__ResolveDelta(pitchDegrees, reference) {
        var refPitch   =  VghLantern__BaseFrameAssembly__ReferencePitchDegrees(reference);
        var requested  =  Number(pitchDegrees) - refPitch;

        function solvedOuterY(delta) {
            var solved  =  VghLantern__BaseFrameAssembly__SolveBeamTop(delta, reference);
            return solved ? Math.min(solved.ChamferTop.y, solved.ChamferBase.y) : -Infinity;
        }

        if (solvedOuterY(requested) >= OUTER_FACE_MIN_Y) {
            return { Delta: requested, RefPitch: refPitch, WasClamped: false };
        }

        var low   =  Math.min(0, requested);                                  // <-- The exported geometry itself is always legal
        var high  =  requested;
        var i, mid;

        for (i = 0; i < 32; i++) {
            mid  =  (low + high) / 2;
            if (solvedOuterY(mid) >= OUTER_FACE_MIN_Y) { low  =  mid; } else { high  =  mid; }
        }

        return { Delta: low, RefPitch: refPitch, WasClamped: true };
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Slope the Head Beam Top for a Roof Pitch
    // ------------------------------------------------------------
    // Returns { Faces, AppliedPitchDegrees, WasClamped }. Topology is
    // preserved: vertices move, the loop and its triangulation do not. When the
    // chamfer is consumed its two vertices coincide, which a swept solid
    // tolerates as zero-area wall quads.
    function VghLantern__BaseFrameAssembly__ReslopeHeadBeamFaces(faces, pitchDegrees, reference) {
        var beam      =  reference.HeadBeam;
        var resolved  =  VghLantern__BaseFrameAssembly__ResolveDelta(pitchDegrees, reference);
        var solved    =  VghLantern__BaseFrameAssembly__SolveBeamTop(resolved.Delta, reference);

        if (!solved) {
            return { Faces: faces, AppliedPitchDegrees: resolved.RefPitch, WasClamped: true };
        }

        var moved  =  VghLantern__BaseFrameAssembly__ApplyMoves(faces, [
            { From: beam.InnerTopCorner, To: solved.InnerTop },
            { From: beam.RebateOuterTop, To: solved.RebateOuterTop },
            { From: beam.RebateBase,     To: solved.RebateBase },
            { From: beam.ChamferTop,     To: solved.ChamferTop },
            { From: beam.ChamferBase,    To: solved.ChamferBase }
        ]);

        return {
            Faces               : moved,
            AppliedPitchDegrees : resolved.RefPitch + resolved.Delta,
            WasClamped          : resolved.WasClamped
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Slope the Lead Flashing Top for a Roof Pitch
    // ------------------------------------------------------------
    // The flashing lies on the beam's lap face, so it takes the identical
    // rotation and the identical anchors: its underside junction IS the beam's
    // solved chamfer top, its own chamfer-foot vertex IS the beam's solved
    // chamfer base, and its outer surface re-anchors against the fixed
    // chamfer-parallel lap run - or, when that is consumed, against its own
    // down-leg outer face. The leg over the upstand never moves.
    function VghLantern__BaseFrameAssembly__ReslopeFlashingFaces(faces, pitchDegrees, reference) {
        var beam      =  reference.HeadBeam;
        var flash     =  reference.LeadFlashing;
        var resolved  =  VghLantern__BaseFrameAssembly__ResolveDelta(pitchDegrees, reference);
        var solved    =  VghLantern__BaseFrameAssembly__SolveBeamTop(resolved.Delta, reference);

        if (!solved) {
            return { Faces: faces, AppliedPitchDegrees: resolved.RefPitch, WasClamped: true };
        }

        var underTop  =  solved.RotatePoint(flash.UnderTop);
        var outerTop  =  solved.RotatePoint(flash.OuterTop);
        var outerDir  =  solved.RotateDir(VghLantern__BaseFrameAssembly__RefDir(flash.OuterTop, flash.OuterMid));

        var lapFootPoint  =  { x: flash.OuterChamferFoot.X, y: flash.OuterChamferFoot.Y };
        var lapFootDir    =  VghLantern__BaseFrameAssembly__RefDir(flash.OuterChamferFoot, flash.OuterMid);

        var outerHit  =  VghLantern__BaseFrameAssembly__IntersectLines(outerTop, outerDir, lapFootPoint, lapFootDir);
        var outerMid, outerFoot;

        var outerHitIsValid  =  outerHit
            && outerHit.x <= outerTop.x
            && VghLantern__BaseFrameAssembly__ParamAlong(outerHit, flash.OuterChamferFoot, flash.OuterMid) > 0.001;

        if (outerHitIsValid) {
            outerMid   =  outerHit;
            outerFoot  =  lapFootPoint;
        } else {
            var legDir  =  VghLantern__BaseFrameAssembly__RefDir(flash.OuterChamferFoot, flash.OuterLegBottom);
            var legHit  =  VghLantern__BaseFrameAssembly__IntersectLines(outerTop, outerDir, lapFootPoint, legDir);
            if (!legHit) {
                return { Faces: faces, AppliedPitchDegrees: resolved.RefPitch, WasClamped: true };
            }
            outerMid   =  legHit;                                            // <-- Lap run consumed: lead dresses straight onto its leg
            outerFoot  =  legHit;
        }

        var moved  =  VghLantern__BaseFrameAssembly__ApplyMoves(faces, [
            { From: flash.UnderTop,         To: underTop },
            { From: flash.OuterTop,         To: outerTop },
            { From: flash.UnderMid,         To: solved.ChamferTop },
            { From: beam.ChamferBase,       To: solved.ChamferBase },
            { From: flash.OuterMid,         To: outerMid },
            { From: flash.OuterChamferFoot, To: outerFoot }
        ]);

        return {
            Faces               : moved,
            AppliedPitchDegrees : resolved.RefPitch + resolved.Delta,
            WasClamped          : resolved.WasClamped
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Transform Every Resolved Part's Section for a Roof Pitch
    // ------------------------------------------------------------
    // Takes the loader's resolved parts (pristine faces) and returns the same
    // records with Faces replaced by pitch-correct copies:
    //   headBeam / leadFlashing  ->  weathered top re-sloped about the datum
    //   eavesExtrusion           ->  whole section rotated to the pitch
    // Without a reslope reference the sections pass through as exported.
    function VghLantern__BaseFrameAssembly__SectionsForPitch(parts, pitchDegrees) {
        var loader     =  VghLantern__BaseFrameAssembly__Loader();
        var reference  =  loader ? loader.VghLantern__BaseFrameSystemLoader__ReslopeReference() : null;
        var out        =  [];
        var i, part, result, faces, clamped;

        for (i = 0; i < parts.length; i++) {
            part     =  parts[i];
            faces    =  part.Faces;
            clamped  =  false;

            if (part.RotatesWithRoofPitch) {
                faces  =  VghLantern__BaseFrameAssembly__RotateFaces(faces, pitchDegrees);

            } else if (part.ReslopesWithRoofPitch && reference) {
                result   =  (part.PartKey === 'leadFlashing')
                    ? VghLantern__BaseFrameAssembly__ReslopeFlashingFaces(faces, pitchDegrees, reference)
                    : VghLantern__BaseFrameAssembly__ReslopeHeadBeamFaces(faces, pitchDegrees, reference);
                faces    =  result.Faces;
                clamped  =  result.WasClamped;

                if (clamped) {
                    console.warn('[VghLantern__BaseFrameAssembly] Pitch ' + pitchDegrees
                        + ' deg exceeds the head beam top re-slope range - timber top clamped at '
                        + result.AppliedPitchDegrees.toFixed(1) + ' deg.');
                }
            }

            out.push({
                PartKey          : part.PartKey,
                PartName         : part.PartName,
                AssetId          : part.AssetId,
                ElementType      : part.ElementType,
                SpecMaterial     : part.SpecMaterial,
                InheritsFrameFinish : part.InheritsFrameFinish,
                SectionAreaSqMm  : part.SectionAreaSqMm,
                WasClamped       : clamped,
                Faces            : faces
            });
        }
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Datum Ring Resolution
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Eaves Datum Ring From a Solved Skeleton
    // ------------------------------------------------------------
    // The solver already places Meta.EavesHalfWidthMm/EavesHalfDepthMm on the
    // datum ring and Meta.EavesLevelMm at the datum level, so this is a pure
    // repackaging into sweep-ready sides. Corner order matches the solver ring
    // convention and winds CCW viewed from above, so each side's outward
    // normal is its direction rotated -90 degrees in plan.
    //
    // Returns:
    // {
    //   DatumLevelMm, SeatLevelMm, PitchDegrees,
    //   HalfWidthMm, HalfDepthMm,
    //   Corners : [ {x,y} x4 ],
    //   Sides   : [ { Start:{x,y}, End:{x,y}, Direction:{x,y}, Outward:{x,y}, LengthMm } x4 ],
    //   PerimeterMm
    // }
    function VghLantern__BaseFrameAssembly__DatumRing(skeleton) {
        if (!skeleton || !skeleton.Meta) return null;

        var meta   =  skeleton.Meta;
        var halfX  =  Number(meta.EavesHalfWidthMm) || 0;
        var halfY  =  Number(meta.EavesHalfDepthMm) || 0;
        if (halfX <= 0 || halfY <= 0) return null;

        var corners  =  [
            { x: -halfX, y: -halfY },
            { x:  halfX, y: -halfY },
            { x:  halfX, y:  halfY },
            { x: -halfX, y:  halfY }
        ];

        var sides  =  [];
        var i, start, end, dx, dy, length;

        for (i = 0; i < 4; i++) {
            start   =  corners[i];
            end     =  corners[(i + 1) % 4];
            dx      =  end.x - start.x;
            dy      =  end.y - start.y;
            length  =  Math.hypot(dx, dy);

            sides.push({
                Start     : start,
                End       : end,
                Direction : { x: dx / length, y: dy / length },
                Outward   : { x: dy / length, y: -(dx / length) },
                LengthMm  : length
            });
        }

        return {
            DatumLevelMm : Number(meta.EavesLevelMm) || 0,
            SeatLevelMm  : Number(meta.UpstandTopLevelMm) || 0,
            PitchDegrees : Number(meta.PitchDegrees) || 0,
            HalfWidthMm  : halfX,
            HalfDepthMm  : halfY,
            Corners      : corners,
            Sides        : sides,
            PerimeterMm  : (halfX + halfY) * 4
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Glaze Bar Eaves End Treatments
// -----------------------------------------------------------------------------

    // FUNCTION | Find a Bar's Eaves End
    // ------------------------------------------------------------
    // Prefers the EavesEnd stamp the layout writes ('start' | 'end' | null);
    // falls back to whichever endpoint sits on the datum level. Returns
    // 'start', 'end' or null (a transom never touches the eaves).
    function VghLantern__BaseFrameAssembly__EavesEndOf(bar, eavesLevelMm) {
        if (bar.EavesEnd === 'start' || bar.EavesEnd === 'end') return bar.EavesEnd;
        if (bar.EavesEnd === null) return null;

        var level  =  Number(eavesLevelMm);
        if (!isFinite(level)) return null;

        if (Math.abs(bar.Start.z - level) <= EAVES_LEVEL_TOLERANCE) return 'start';
        if (Math.abs(bar.End.z   - level) <= EAVES_LEVEL_TOLERANCE) return 'end';
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Slope Angle of One Bar, From Its Own Geometry
    // ------------------------------------------------------------
    function VghLantern__BaseFrameAssembly__BarPitchDegrees(bar) {
        var dz    =  Math.abs(bar.End.z - bar.Start.z);
        var plan  =  Math.hypot(bar.End.x - bar.Start.x, bar.End.y - bar.Start.y);
        if (plan <= 0) return 90;
        return Math.atan2(dz, plan) / DEG_TO_RAD;
    }
    // ------------------------------------------------------------


    // FUNCTION | Per-Part Length Delta at the Eaves End of a Bar
    // ------------------------------------------------------------
    // Positive lengthens the part past the bar's datum foot, negative shortens
    // it. Core and cap are square-cut extensions measured along the pitch, so
    // their deltas are the raw interface numbers. The trim stops at a vertical
    // plumb plane 18mm horizontally inboard of the datum; its reported delta is
    // to the LONG POINT (the bottom arris of the plumb cut), the ordering
    // length of the sawn piece:
    //     delta = (trimDepth x sin(pitch) - inset) / cos(pitch)
    // A bar with no eaves end gets zero for every part.
    function VghLantern__BaseFrameAssembly__PartLengthDeltaMm(partKey, bar, eavesLevelMm, trimDepthMm) {
        if (VghLantern__BaseFrameAssembly__EavesEndOf(bar, eavesLevelMm) === null) return 0;

        var interface_  =  VghLantern__BaseFrameAssembly__EavesInterface();

        if (partKey === 'core') return interface_.GlazeBarCoreExtensionAlongPitchMm;
        if (partKey === 'cap')  return interface_.GlazeBarCapExtensionAlongPitchMm;

        if (partKey === 'trim') {
            var pitchRad  =  VghLantern__BaseFrameAssembly__BarPitchDegrees(bar) * DEG_TO_RAD;
            var cosP      =  Math.cos(pitchRad);
            if (cosP <= 0) return 0;

            var depth  =  Math.max(0, Number(trimDepthMm) || 0);
            return ((depth * Math.sin(pitchRad)) - interface_.GlazeBarTrimPlumbCutInsetMm) / cosP;
        }

        return 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Trim Plumb Cut Plane at a Bar's Eaves End
    // ------------------------------------------------------------
    // Returns { Point:{x,y,z}, Normal:{x,y,z} } in model mm, or null when the
    // bar has no eaves end. The plane is vertical, its normal is the bar's
    // horizontal up-slope direction, and it sits the interface inset inboard
    // of the datum foot. Geometry on the normal's positive side (up-slope)
    // survives the cut.
    function VghLantern__BaseFrameAssembly__TrimPlumbPlane(bar, eavesLevelMm) {
        var endKey  =  VghLantern__BaseFrameAssembly__EavesEndOf(bar, eavesLevelMm);
        if (endKey === null) return null;

        var foot   =  endKey === 'start' ? bar.Start : bar.End;
        var other  =  endKey === 'start' ? bar.End   : bar.Start;

        var hx    =  other.x - foot.x;
        var hy    =  other.y - foot.y;
        var hLen  =  Math.hypot(hx, hy);
        if (hLen <= 0) return null;

        var inset  =  VghLantern__BaseFrameAssembly__EavesInterface().GlazeBarTrimPlumbCutInsetMm;
        var nx     =  hx / hLen;
        var ny     =  hy / hLen;

        return {
            Point  : { x: foot.x + (nx * inset), y: foot.y + (ny * inset), z: foot.z },
            Normal : { x: nx, y: ny, z: 0 }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Extended Eaves Endpoint for a Square-Cut Part
    // ------------------------------------------------------------
    // Returns a new endpoint extensionMm further down the slope beyond the
    // bar's datum foot, or null when the bar has no eaves end.
    function VghLantern__BaseFrameAssembly__ExtendedEavesPoint(bar, eavesLevelMm, extensionMm) {
        var endKey  =  VghLantern__BaseFrameAssembly__EavesEndOf(bar, eavesLevelMm);
        if (endKey === null) return null;

        var foot   =  endKey === 'start' ? bar.Start : bar.End;
        var other  =  endKey === 'start' ? bar.End   : bar.Start;

        var dx   =  foot.x - other.x;
        var dy   =  foot.y - other.y;
        var dz   =  foot.z - other.z;
        var len  =  Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
        if (len <= 0) return null;

        var scale  =  Number(extensionMm) / len;
        return {
            EndKey : endKey,
            Point  : { x: foot.x + (dx * scale), y: foot.y + (dy * scale), z: foot.z + (dz * scale) }
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
        VghLantern__BaseFrameAssembly__DatumGeometry        : VghLantern__BaseFrameAssembly__DatumGeometry,
        VghLantern__BaseFrameAssembly__EavesInterface       : VghLantern__BaseFrameAssembly__EavesInterface,
        VghLantern__BaseFrameAssembly__DatumRing            : VghLantern__BaseFrameAssembly__DatumRing,
        VghLantern__BaseFrameAssembly__SectionsForPitch     : VghLantern__BaseFrameAssembly__SectionsForPitch,
        VghLantern__BaseFrameAssembly__RotateFaces          : VghLantern__BaseFrameAssembly__RotateFaces,
        VghLantern__BaseFrameAssembly__ReslopeHeadBeamFaces : VghLantern__BaseFrameAssembly__ReslopeHeadBeamFaces,
        VghLantern__BaseFrameAssembly__ReslopeFlashingFaces : VghLantern__BaseFrameAssembly__ReslopeFlashingFaces,
        VghLantern__BaseFrameAssembly__EavesEndOf           : VghLantern__BaseFrameAssembly__EavesEndOf,
        VghLantern__BaseFrameAssembly__BarPitchDegrees      : VghLantern__BaseFrameAssembly__BarPitchDegrees,
        VghLantern__BaseFrameAssembly__PartLengthDeltaMm    : VghLantern__BaseFrameAssembly__PartLengthDeltaMm,
        VghLantern__BaseFrameAssembly__TrimPlumbPlane       : VghLantern__BaseFrameAssembly__TrimPlumbPlane,
        VghLantern__BaseFrameAssembly__ExtendedEavesPoint   : VghLantern__BaseFrameAssembly__ExtendedEavesPoint
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__BaseFrameAssembly  =  VghLantern__Geometry__BaseFrameAssembly;
