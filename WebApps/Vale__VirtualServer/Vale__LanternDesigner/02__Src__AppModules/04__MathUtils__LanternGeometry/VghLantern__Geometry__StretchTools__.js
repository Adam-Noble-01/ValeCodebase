/* =============================================================================
   VGHLANTERN - GEOMETRY | STRETCH TOOLS
   =============================================================================

   FILE       : VghLantern__Geometry__StretchTools__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - StretchTools
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Resize authored sections and meshes by moving vertices, never by scaling
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - The Vale asset library holds ONE version of each section and component,
     authored for a 22.5 degree roof. Everything else is reached by transforming
     that asset. This module is the toolkit those transforms are built from.
   - Two families, one idea:
       2D  operates on a stitched face list from SectionLoopBuilder
       3D  operates on a Na__Asset__Mesh3D vertex list
   - Nothing here scales. That is the whole point of the module.

   ---------------------------------------------------------------------------

   WHY SCALING IS THE WRONG TOOL

   A ridge beam is 230mm deep at 22.5 degrees and 250mm at 40. The lazy answer
   is to scale the section by 250/230. It is wrong, and visibly so: the bottom
   24mm of that section is a moulding - an ogee, a bead and a half round nose -
   and scaling it by 1.087 flattens every one of those curves. The moulding is
   the only part of the beam anybody in the room can see.

   The real workshop answer is that the moulding is a fixed cutter profile and
   the flank above it is simply run longer. So that is what a STRETCH does: pick
   a split line, translate everything past it, and let the segments crossing the
   line lengthen. Topology never changes - the same rings, the same triangles,
   the same vertex count - so a stretched section extrudes into exactly the same
   manifold solid the authored one does.

   The same reasoning applies in 3D to the octagonal ridge block, whose straight
   prism must grow while its turned base stays a lathe profile.

   THE SAFETY THIS RELIES ON

   A stretch is only safe where the split line falls in a region with no vertex
   clustering, because a vertex sitting a hair the wrong side of the line tears
   away from its neighbours. Every split line this module is asked for is
   declared in a system index and sits in a long plain run: -217 on a ridge beam
   whose nearest other vertex is at -11, and -247 on a block whose prism has no
   intermediate vertices at all. The tolerance below is generous enough to catch
   coincident vertices on the line itself and far tighter than any real gap.

   WHAT ELSE IS IN HERE

   Two more vertex-move primitives that are not stretches but belong beside
   them, because they solve the same problem of adapting an authored asset:

       RotateSelection2d   swing a selection about a pivot - a folded lead wing
                           changing its fold angle without changing its length
       ApplyMoveMap2d      replace named vertices with solved positions - the
                           pattern BaseFrameAssembly already re-slopes the head
                           beam with, lifted here so it stops being private

   ============================================================================= */

// =============================================================================
// REGION | Stretch Tools Module
// =============================================================================

const VghLantern__Geometry__StretchTools = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Tolerances and Axis Vocabulary
    // ------------------------------------------------------------
    const SPLIT_TOLERANCE_MM   =  0.02;                                      // <-- Exported coords carry three decimals; this catches vertices authored on the line
    const VERTEX_MATCH_MM      =  0.02;                                      // <-- Same tolerance BaseFrameAssembly matches reslope reference vertices at
    const DEG_TO_RAD           =  Math.PI / 180;

    const SIDE_BELOW           =  'below';
    const SIDE_ABOVE           =  'above';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Mesh Block Field Names
    // ------------------------------------------------------------
    const FIELD_VERTICES  =  'Na__Geometry__Vertices';
    const FIELD_BBOX      =  'Na__Geometry__BoundingBox';

    const MESH_AXIS_FIELD  =  { x : 'PosX_mm', y : 'PosY_mm', z : 'PosZ_mm' };
    const MESH_BBOX_MIN    =  { x : 'Na__Geometry__MinX_mm', y : 'Na__Geometry__MinY_mm', z : 'Na__Geometry__MinZ_mm' };
    const MESH_BBOX_MAX    =  { x : 'Na__Geometry__MaxX_mm', y : 'Na__Geometry__MaxY_mm', z : 'Na__Geometry__MaxZ_mm' };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Selection Predicates
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether a Coordinate Falls on the Moving Side of a Split
    // ------------------------------------------------------------
    // Inclusive of the line itself in both directions. A vertex authored exactly
    // ON the split has to travel with the selection, otherwise the segment that
    // reaches it is left anchored and the moulding tears off the flank.
    function VghLantern__StretchTools__IsMovingSide(value, splitValue, side) {
        if (side === SIDE_ABOVE) return value >= (splitValue - SPLIT_TOLERANCE_MM);
        return value <= (splitValue + SPLIT_TOLERANCE_MM);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether Two Section Points Are the Same Point
    // ------------------------------------------------------------
    function VghLantern__StretchTools__Matches(point, reference) {
        return Math.abs(point.x - Number(reference.X)) <= VERTEX_MATCH_MM
            && Math.abs(point.y - Number(reference.Y)) <= VERTEX_MATCH_MM;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 2D Face Transforms
// -----------------------------------------------------------------------------

    // FUNCTION | Deep Copy a Stitched Face List With Every Point Transformed
    // ------------------------------------------------------------
    // Rings and Triangles are index data and are carried across by reference:
    // no transform in this module changes topology, so copying those arrays
    // would allocate a few thousand integers per rebuild for nothing.
    //
    // The source faces are never mutated. They are the memoised stitch of an
    // asset file shared by every lantern on screen, and a transform that wrote
    // through them would leave the next lantern building from a section already
    // adapted to somebody else's pitch.
    function VghLantern__StretchTools__MapFaces(faces, transform) {
        if (!Array.isArray(faces)) return [];

        var out  =  [];
        var f, face, points, mapped, i;

        for (f = 0; f < faces.length; f++) {
            face    =  faces[f];
            points  =  face.Points || [];
            mapped  =  new Array(points.length);

            for (i = 0; i < points.length; i++) {
                mapped[i]  =  transform({ x : points[i].x, y : points[i].y });
            }

            out.push({
                Points     : mapped,
                Rings      : face.Rings,
                Triangles  : face.Triangles,
                AreaSqMm   : face.AreaSqMm,
                HoleCount  : face.HoleCount
            });
        }

        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Stretch a Section Along One Axis About a Split Line
    // ------------------------------------------------------------
    // options:
    //     Axis        'x' or 'y'          the axis the split is measured on
    //     SplitValue  number              where the section divides
    //     Side        'below' or 'above'  which side travels
    //     DeltaMm     signed number       how far it travels, along Axis
    //
    // A ridge beam going from 230mm deep to 250mm is Axis 'y', SplitValue -217,
    // Side 'below', DeltaMm -20: the moulding drops 20mm and the flanks above it
    // lengthen to meet it. Positive delta on the same call makes the beam
    // shallower.
    //
    // A zero delta returns a copy rather than the original, so a caller can hold
    // one code path whether or not the lantern is at the authored pitch.
    function VghLantern__StretchTools__StretchFaces2d(faces, options) {
        var axis    =  (options && options.Axis) || 'y';
        var split   =  Number(options && options.SplitValue) || 0;
        var side    =  (options && options.Side) || SIDE_BELOW;
        var delta   =  Number(options && options.DeltaMm) || 0;

        return VghLantern__StretchTools__MapFaces(faces, function(pt) {
            if (VghLantern__StretchTools__IsMovingSide(pt[axis], split, side)) {
                pt[axis]  =  pt[axis] + delta;
            }
            return pt;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Rotate a Selection of Section Points About a Pivot
    // ------------------------------------------------------------
    // options:
    //     Pivot       { x, y }   the hinge, in section coordinates
    //     Degrees     number     counter-clockwise positive
    //     Selects     function   pt -> boolean, which points swing
    //
    // Written for folded sheet metal. When a roof pitch changes, a lead wing
    // changes the ANGLE it leaves the fold at and keeps its length exactly: the
    // sheet is folded, not stretched. Rotating the tip about the root is that
    // statement in arithmetic.
    function VghLantern__StretchTools__RotateSelection2d(faces, options) {
        var pivot    =  (options && options.Pivot)   || { x : 0, y : 0 };
        var degrees  =  Number(options && options.Degrees) || 0;
        var selects  =  (options && options.Selects) || function() { return true; };

        var angle  =  degrees * DEG_TO_RAD;
        var cosA   =  Math.cos(angle);
        var sinA   =  Math.sin(angle);

        return VghLantern__StretchTools__MapFaces(faces, function(pt) {
            if (!selects(pt)) return pt;

            var dx  =  pt.x - pivot.x;
            var dy  =  pt.y - pivot.y;

            return {
                x : pivot.x + (dx * cosA) - (dy * sinA),
                y : pivot.y + (dx * sinA) + (dy * cosA)
            };
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Replace Named Vertices With Solved Positions
    // ------------------------------------------------------------
    // moves is a list of { From : { X, Y }, To : { x, y } }. Every point matching
    // a From within tolerance becomes its To; everything else passes through.
    //
    // The move map is how a re-slope is expressed: a small solver works out where
    // a handful of named construction vertices belong at the new pitch, and this
    // puts them there without the section being rebuilt around them.
    function VghLantern__StretchTools__ApplyMoveMap2d(faces, moves) {
        if (!Array.isArray(moves) || moves.length === 0) {
            return VghLantern__StretchTools__MapFaces(faces, function(pt) { return pt; });
        }

        return VghLantern__StretchTools__MapFaces(faces, function(pt) {
            var i;
            for (i = 0; i < moves.length; i++) {
                if (VghLantern__StretchTools__Matches(pt, moves[i].From)) {
                    return { x : moves[i].To.x, y : moves[i].To.y };
                }
            }
            return pt;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Mirror a Move List Across the Section Centreline
    // ------------------------------------------------------------
    // Every ridge and hip section is symmetric about x = 0, and every index
    // declares its pitch adaptation for the positive x side only. This produces
    // the negative side rather than asking an author to keep two copies of the
    // same numbers in step.
    function VghLantern__StretchTools__MirrorMoves(moves) {
        var out  =  [];
        var i;

        for (i = 0; i < moves.length; i++) {
            out.push(moves[i]);
            out.push({
                From : { X : -Number(moves[i].From.X), Y : Number(moves[i].From.Y) },
                To   : { x : -Number(moves[i].To.x),   y : Number(moves[i].To.y) }
            });
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rotate One Point About a Pivot, Answering a Move Target
    // ------------------------------------------------------------
    // The arithmetic behind a folded wing, exposed so a caller can build a move
    // map out of rotations instead of rotating a whole selection. Rotating the
    // tip alone is what keeps the fold roll where it was authored.
    function VghLantern__StretchTools__RotatePointAbout(point, pivot, degrees) {
        var angle  =  Number(degrees) * DEG_TO_RAD;
        var cosA   =  Math.cos(angle);
        var sinA   =  Math.sin(angle);
        var dx     =  Number(point.X !== undefined ? point.X : point.x) - Number(pivot.X !== undefined ? pivot.X : pivot.x);
        var dy     =  Number(point.Y !== undefined ? point.Y : point.y) - Number(pivot.Y !== undefined ? pivot.Y : pivot.y);
        var px     =  Number(pivot.X !== undefined ? pivot.X : pivot.x);
        var py     =  Number(pivot.Y !== undefined ? pivot.Y : pivot.y);

        return {
            x : px + (dx * cosA) - (dy * sinA),
            y : py + (dx * sinA) + (dy * cosA)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Declared Pitch Adaptations
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Move Map a Declared Pitch Adaptation Calls For
    // ------------------------------------------------------------
    // adaptation is a PitchAdaptation block straight out of a system index, and
    // appliedAngleDegrees is the angle the section should now be cut at. The
    // caller resolves that angle, not this function: a ridge section follows the
    // roof pitch directly and a hip section follows the roof plane as it appears
    // in the hip's normal plane, and only the caller knows which it is holding.
    //
    // Two modes, both expressed for the POSITIVE x side only and mirrored here:
    //
    //   seatingCut   A face seated on the roof plane, pinned at its inner end.
    //                The outer corner slides vertically until the face takes the
    //                new angle, and any carried vertices travel the same
    //                distance so a moulded return above the corner stays rigid.
    //
    //   foldedWing   A folded lead sheet. Each wing tip rotates about its own
    //                root, which changes the fold angle and holds the wing's
    //                length and the sheet thickness exactly. Lead is folded, not
    //                stretched, and the difference shows on a takeoff.
    //
    // Returns [] for an unknown mode rather than throwing, so a section that
    // gains an adaptation this module has not learned yet is drawn as authored
    // instead of not drawn at all.
    function VghLantern__StretchTools__BuildPitchMoveMap(adaptation, appliedAngleDegrees) {
        if (!adaptation) return [];

        var authored  =  Number(adaptation.AuthoredAngleDegrees);
        var applied   =  Number(appliedAngleDegrees);
        if (!isFinite(authored) || !isFinite(applied)) return [];

        var moves  =  [];

        if (adaptation.Mode === 'seatingCut') {
            moves  =  VghLantern__StretchTools__SeatingCutMoves(adaptation, applied);
        } else if (adaptation.Mode === 'foldedWing') {
            moves  =  VghLantern__StretchTools__FoldedWingMoves(adaptation, applied - authored);
        } else {
            console.warn('[VghLantern__StretchTools] Unknown pitch adaptation mode "' + adaptation.Mode + '".');
            return [];
        }

        return adaptation.MirrorInX === false ? moves : VghLantern__StretchTools__MirrorMoves(moves);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Moves for a Seating Face Pinned at Its Inner End
    // ------------------------------------------------------------
    // The run is measured from the hinge out to the primary vertex, so the new
    // corner height falls straight out of the tangent. Everything carried moves
    // by the same vertical distance rather than being re-solved, which is what
    // keeps a rounded nose a rounded nose.
    function VghLantern__StretchTools__SeatingCutMoves(adaptation, appliedAngleDegrees) {
        var hinge    =  adaptation.Hinge;
        var primary  =  adaptation.PrimaryVertex;
        if (!hinge || !primary) return [];

        var run  =  Number(primary.X) - Number(hinge.X);
        if (Math.abs(run) < 1e-6) return [];

        var newY    =  Number(hinge.Y) - (Math.abs(run) * Math.tan(Number(appliedAngleDegrees) * DEG_TO_RAD));
        var deltaY  =  newY - Number(primary.Y);
        if (Math.abs(deltaY) < 1e-9) return [];

        var moves   =  [{ From : primary, To : { x : Number(primary.X), y : Number(primary.Y) + deltaY } }];
        var carried =  Array.isArray(adaptation.CarriedVertices) ? adaptation.CarriedVertices : [];
        var i;

        for (i = 0; i < carried.length; i++) {
            moves.push({ From : carried[i], To : { x : Number(carried[i].X), y : Number(carried[i].Y) + deltaY } });
        }

        return moves;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Moves for a Folded Sheet Changing Its Fold Angle
    // ------------------------------------------------------------
    // deltaDegrees is the increase in the seating angle. On the positive x side a
    // wing runs outward and DOWNWARD, so a steeper roof swings its tip clockwise
    // and the rotation is negated. The mirror pass restores the opposite sense on
    // the other side without a second sign to keep track of.
    function VghLantern__StretchTools__FoldedWingMoves(adaptation, deltaDegrees) {
        var wings  =  Array.isArray(adaptation.Wings) ? adaptation.Wings : [];
        if (wings.length === 0 || Math.abs(deltaDegrees) < 1e-9) return [];

        var moves  =  [];
        var i;

        for (i = 0; i < wings.length; i++) {
            if (!wings[i] || !wings[i].Root || !wings[i].Tip) continue;
            moves.push({
                From : wings[i].Tip,
                To   : VghLantern__StretchTools__RotatePointAbout(wings[i].Tip, wings[i].Root, -deltaDegrees)
            });
        }

        return moves;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 3D Mesh Transforms
// -----------------------------------------------------------------------------

    // FUNCTION | Stretch a Mesh Block Along One Axis About a Split Plane
    // ------------------------------------------------------------
    // options:
    //     Axis        'x', 'y' or 'z'     the axis the split plane is normal to
    //     SplitValue  number              where the mesh divides
    //     Side        'below' or 'above'  which side travels
    //     DeltaMm     signed number       how far it travels, along Axis
    //
    // Returns a SHALLOW COPY of the mesh block carrying a new vertex array and a
    // corrected bounding box. Faces and Edges address vertices by id and none of
    // those ids change, so those arrays are shared with the source rather than
    // duplicated - on the octagonal ridge block that is 2830 faces and 5568
    // edges not copied on every pitch change.
    //
    // Normals are carried across untouched. A stretch translates a rigid
    // selection and lengthens the walls between: no face changes its plane, so
    // no normal changes either. That is not true of a scale, which is one more
    // reason this module does not offer one.
    function VghLantern__StretchTools__StretchMesh3d(meshBlock, options) {
        if (!meshBlock) return null;

        var axis   =  (options && options.Axis) || 'z';
        var split  =  Number(options && options.SplitValue) || 0;
        var side   =  (options && options.Side) || SIDE_BELOW;
        var delta  =  Number(options && options.DeltaMm) || 0;

        var sourceVertices  =  meshBlock[FIELD_VERTICES];
        if (!Array.isArray(sourceVertices)) return meshBlock;

        var field   =  MESH_AXIS_FIELD[axis];
        var moved   =  new Array(sourceVertices.length);
        var copy    =  {};
        var key, i, vertex, shifted, value;

        for (key in meshBlock) {
            if (Object.prototype.hasOwnProperty.call(meshBlock, key)) copy[key]  =  meshBlock[key];
        }

        for (i = 0; i < sourceVertices.length; i++) {
            vertex  =  sourceVertices[i];
            value   =  Number(vertex[field]);

            if (delta !== 0 && VghLantern__StretchTools__IsMovingSide(value, split, side)) {
                shifted  =  {};
                for (key in vertex) {
                    if (Object.prototype.hasOwnProperty.call(vertex, key)) shifted[key]  =  vertex[key];
                }
                shifted[field]  =  value + delta;
                moved[i]  =  shifted;
            } else {
                moved[i]  =  vertex;                                          // <-- Unmoved vertices are shared, not copied
            }
        }

        copy[FIELD_VERTICES]  =  moved;
        copy[FIELD_BBOX]      =  VghLantern__StretchTools__StretchedBounds(meshBlock[FIELD_BBOX], axis, split, side, delta);

        return copy;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extend a Bounding Box to Cover a Stretch
    // ------------------------------------------------------------
    // Only the face of the box on the moving side travels. A downward stretch
    // takes the minimum down and leaves the maximum where it was, which is what
    // the block does: its top stays on the ridge datum and its base drops.
    function VghLantern__StretchTools__StretchedBounds(bounds, axis, split, side, delta) {
        if (!bounds || delta === 0) return bounds;

        var copy  =  {};
        var key;
        for (key in bounds) {
            if (Object.prototype.hasOwnProperty.call(bounds, key)) copy[key]  =  bounds[key];
        }

        var minKey  =  MESH_BBOX_MIN[axis];
        var maxKey  =  MESH_BBOX_MAX[axis];

        if (side === SIDE_ABOVE) {
            if (VghLantern__StretchTools__IsMovingSide(Number(copy[maxKey]), split, side)) copy[maxKey]  =  Number(copy[maxKey]) + delta;
            if (VghLantern__StretchTools__IsMovingSide(Number(copy[minKey]), split, side)) copy[minKey]  =  Number(copy[minKey]) + delta;
        } else {
            if (VghLantern__StretchTools__IsMovingSide(Number(copy[minKey]), split, side)) copy[minKey]  =  Number(copy[minKey]) + delta;
            if (VghLantern__StretchTools__IsMovingSide(Number(copy[maxKey]), split, side)) copy[maxKey]  =  Number(copy[maxKey]) + delta;
        }

        return copy;
    }
    // ------------------------------------------------------------


    // FUNCTION | Count the Vertices a 3D Stretch Would Move
    // ------------------------------------------------------------
    // A diagnostic rather than a transform. A split line that has drifted off a
    // plain run reports a wrong count long before anybody notices a torn mesh on
    // screen, and the number is cheap enough to log on every build.
    function VghLantern__StretchTools__CountMovingVertices3d(meshBlock, axis, splitValue, side) {
        var vertices  =  meshBlock ? meshBlock[FIELD_VERTICES] : null;
        if (!Array.isArray(vertices)) return 0;

        var field  =  MESH_AXIS_FIELD[axis || 'z'];
        var count  =  0;
        var i;

        for (i = 0; i < vertices.length; i++) {
            if (VghLantern__StretchTools__IsMovingSide(Number(vertices[i][field]), Number(splitValue), side || SIDE_BELOW)) count++;
        }
        return count;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__StretchTools__MapFaces              : VghLantern__StretchTools__MapFaces,
        VghLantern__StretchTools__StretchFaces2d        : VghLantern__StretchTools__StretchFaces2d,
        VghLantern__StretchTools__RotateSelection2d     : VghLantern__StretchTools__RotateSelection2d,
        VghLantern__StretchTools__ApplyMoveMap2d        : VghLantern__StretchTools__ApplyMoveMap2d,
        VghLantern__StretchTools__MirrorMoves           : VghLantern__StretchTools__MirrorMoves,
        VghLantern__StretchTools__RotatePointAbout      : VghLantern__StretchTools__RotatePointAbout,
        VghLantern__StretchTools__BuildPitchMoveMap     : VghLantern__StretchTools__BuildPitchMoveMap,
        VghLantern__StretchTools__StretchMesh3d         : VghLantern__StretchTools__StretchMesh3d,
        VghLantern__StretchTools__CountMovingVertices3d : VghLantern__StretchTools__CountMovingVertices3d
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__StretchTools  =  VghLantern__Geometry__StretchTools;
