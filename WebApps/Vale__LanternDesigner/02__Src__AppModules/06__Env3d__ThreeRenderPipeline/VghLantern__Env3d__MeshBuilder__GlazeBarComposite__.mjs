/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - GLAZE BAR COMPOSITE
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__GlazeBarComposite__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder GlazeBarComposite
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the real Vale three-part glaze bar along every bar datum
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - A Vale roof glaze bar is not one section. It is three parts sharing one
     datum, and the model now says so:

         Glaze Bar Cap    45_1021   powder coated aluminium, the decorative
                                    outer capping seen from outside the roof
         Glaze Bar Core   45_1011   mill finish aluminium, the concealed
                                    structural extrusion carrying the glass
         Glaze Bar Trim   45_1031   Douglas fir, the internal decorative
                          /1032     moulding seen from inside the room, in
                          /1033     45, 70 or 90 mm depth

   - Each part is extruded from its own authored cross-section along every bar
     datum the GlazeBarLayout produced, and lands in its own merged mesh. Three
     meshes rather than one is the whole point: each part is separately
     pickable, separately isolatable by element type, and separately countable.
   - Cap and trim are separately FINISHED too, each from its own palette and each
     stored on the lantern's glazing bars block. They face opposite ways - the cap
     out at the garden, the trim in at the room - so they are never one decision.
     The core takes no finish because it is never seen once the other two are on.

   ---------------------------------------------------------------------------

   WHY THIS DOES NOT USE THREE.ExtrudeGeometry

   The module this replaces swept a single outline with ExtrudeGeometry, which is
   the right tool for a shape that only has to be looked at. It is the wrong tool
   here. ExtrudeGeometry emits unwelded triangles with the cap vertices separate
   from the wall vertices, so the result is a shell that renders correctly and is
   not a solid: no edge is shared, so nothing downstream can tell inside from
   outside.

   That matters because these solids are going to be cut. The cutting list this
   tool exists to produce comes from booleans against the hip and ridge, and a
   boolean against a shell either fails outright or silently returns the wrong
   volume - which would surface as a specification table quietly under-reporting
   a bar length nobody re-measures.

   So the geometry is assembled by hand instead: one vertex per section point per
   end, walls raised ring by ring, both ends capped over those same vertices.
   Every edge is shared by exactly two triangles and every normal points out.

   ---------------------------------------------------------------------------

   SECTION FRAME AND THE DATUM

   All five assets are authored in one shared section frame, taken from the Top
   Plan view of a bar modelled running vertically:

       section +x  ->  across the bar
       section +y  ->  out through the roof: cap above, trim below
       section  0  ->  the glaze bar datum marked on the Vale anatomy drawing

   Because the frame is shared, the three parts assemble with no fitting: their
   solid areas do not overlap anywhere, which is checked rather than assumed.

   The datum is placed ON the skeleton polyline, so the cap stands proud of the
   setting-out line and the trim hangs inside it. SECTION_DATUM_OFFSET_MM shifts
   the whole composite along section +y if that convention ever has to move.

   ---------------------------------------------------------------------------

   KNOWN LIMITATION - END CUTS

   Bars are currently extruded square across their own axis at both ends, which
   is what the module this replaces did. Where a bar meets a hip or the ridge the
   true cut is a compound mitre, and until that is modelled a takeoff taken from
   these solids gives a bar's datum length rather than its cut length. The
   builder is shaped for it - BuildSolid already takes both end planes - so
   adding mitres is a matter of telling it which plane to use, not of rebuilding.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__MaterialLibrary__MillAluminium,
    VghLantern__Env3d__MaterialLibrary__GlazeBarCap,
    VghLantern__Env3d__MaterialLibrary__GlazeBarTrim
} from './VghLantern__Env3d__MaterialLibrary__.mjs';

import {
    VghLantern__Env3d__PickIndex__Register,
    VghLantern__Env3d__PickIndex__ModeTriangle
} from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Glaze Bar Composite Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Section Placement and Geometry Guards
    // ------------------------------------------------------------
    const SECTION_DATUM_OFFSET_MM  =  0;                                     // <-- Section y=0 sits on the skeleton polyline
    const MIN_MEMBER_LENGTH_MM     =  0.5;                                   // <-- Below this a bar is degenerate
    const VERTICAL_DOT_LIMIT       =  0.999;                                 // <-- Above this a member is effectively vertical
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Element Type Vocabulary
    // ------------------------------------------------------------
    // Mirrors Na__Asset__ValeSpec__ElementType in the asset files. Stamped onto
    // every mesh's userData so the 3D isolation toggle and the downstream
    // specification tables classify from one shared vocabulary rather than each
    // keeping its own list of what counts as structure.
    export const VghLantern__Env3d__ElementType  =  {
        Structural : 'Structural',
        Trim       : 'Trim',
        ByOthers   : 'By Others',
        Flashing   : 'Flashing',
        Glazing    : 'Glazing'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Three Parts of a Bar
    // ------------------------------------------------------------
    // PartKey matches the slot names published by the GlazeBarSystemLoader.
    const PART_CORE  =  'core';
    const PART_CAP   =  'cap';
    const PART_TRIM  =  'trim';

    const PART_ORDER  =  [PART_CORE, PART_CAP, PART_TRIM];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Member Orientation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Orientation Basis for a Bar
    // ------------------------------------------------------------
    // Local Z runs along the bar, local Y is the bar's up direction and local X
    // is across it. World up projected perpendicular to the bar is what makes a
    // common rafter and a hip-end bar both read correctly without either being a
    // special case: on any sloping member that projection is the slope normal,
    // which is exactly where the cap has to point.
    //
    // Kept identical to the convention the retired ProfileSweep used, so the new
    // composite lands in the same orientation the old single section did and no
    // other module has to be re-reasoned about.
    function VghLantern__Env3d__GlazeBarComposite__MemberBasis(startVec, endVec) {
        const along    =  new THREE.Vector3().subVectors(endVec, startVec).normalize();
        const worldUp  =  new THREE.Vector3(0, 1, 0);

        const upReference  =  Math.abs(along.dot(worldUp)) > VERTICAL_DOT_LIMIT
            ? new THREE.Vector3(0, 0, -1)
            : worldUp;

        const across  =  new THREE.Vector3().crossVectors(upReference, along).normalize();
        const up      =  new THREE.Vector3().crossVectors(along, across).normalize();

        return { Along : along, Across : across, Up : up };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Manifold Solid Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Cumulative Perimeter Distance at Every Section Vertex
    // ------------------------------------------------------------
    // Returns one distance per vertex of the flat ring array, in world units,
    // restarting at zero for each ring. This is the texture U coordinate: walking
    // it round the section lays the map across the bar rather than along it.
    //
    // The seam where a ring closes does not line up with a whole texture repeat,
    // so a fine grain shows one discontinuity somewhere on the perimeter. It
    // lands on an arris, where an extrusion's die lines genuinely do break.
    function VghLantern__Env3d__GlazeBarComposite__PerimeterDistances(face) {
        const points    =  face.Points;
        const distances =  new Array(points.length).fill(0);
        let r, ring, k, index, previous, running, dx, dy;

        for (r = 0; r < face.Rings.length; r++) {
            ring     =  face.Rings[r];
            running  =  0;

            for (k = 0; k < ring.Count; k++) {
                index  =  ring.Start + k;

                if (k > 0) {
                    previous  =  ring.Start + k - 1;
                    dx  =  points[index].x - points[previous].x;
                    dy  =  points[index].y - points[previous].y;
                    running  +=  VghLantern__Env3d__ConfigAccess__MmToWorld(Math.sqrt((dx * dx) + (dy * dy)));
                }
                distances[index]  =  running;
            }
        }

        return distances;
    }
    // ------------------------------------------------------------


    // FUNCTION | Extrude One Section Face Into a Closed Manifold Solid
    // ------------------------------------------------------------
    // face is a SectionLoopBuilder face: a flat vertex array, ring spans into it,
    // and a counter-clockwise triangulation addressing those same vertices.
    //
    // Vertex layout is two rings of the section, the near end first:
    //     index i          section point i at the start of the bar
    //     index i + count  the same point at the end of the bar
    // Walls are raised between them ring by ring, so every section edge appears
    // exactly once and produces exactly one quad. Both ends are then capped over
    // those same vertices, the near end wound backwards so it faces outwards.
    //
    // Returns positions in WORLD units already placed on the member, and an index
    // buffer in which every edge is shared by exactly two triangles.
    function VghLantern__Env3d__GlazeBarComposite__BuildSolid(face, startVec, endVec, targetPositions, targetIndices, targetUvs) {
        const points  =  face.Points;
        const count   =  points.length;
        if (count < 3) return 0;

        const basis   =  VghLantern__Env3d__GlazeBarComposite__MemberBasis(startVec, endVec);
        const baseIx  =  targetPositions.length / 3;
        const lengthWorld  =  startVec.distanceTo(endVec);

        // PERIMETER DISTANCE ROUND THE SECTION
        // Used as the U coordinate below, measured in world units so a texture
        // repeat is tiles per world unit and the grain holds its real size on a
        // bar of any length. Measured per ring, because each ring is a closed
        // loop in its own right.
        const perimeter  =  VghLantern__Env3d__GlazeBarComposite__PerimeterDistances(face);

        // BOTH RINGS OF VERTICES
        // Section x runs along the member's across axis, section y along its up
        // axis, and the ring is placed at whichever end it belongs to.
        //
        // UVs put U across the section and V along the bar. A texture that varies
        // in U and holds steady in V therefore lands as lines running the length
        // of the bar - which is what an extrusion's die lines are, and why the
        // brushed grain needs no special mapping to sit the right way round.
        const ends  =  [startVec, endVec];
        let e, i, sx, sy, origin;

        for (e = 0; e < ends.length; e++) {
            origin  =  ends[e];

            for (i = 0; i < count; i++) {
                sx  =  VghLantern__Env3d__ConfigAccess__MmToWorld(points[i].x);
                sy  =  VghLantern__Env3d__ConfigAccess__MmToWorld(points[i].y + SECTION_DATUM_OFFSET_MM);

                targetPositions.push(
                    origin.x + (basis.Across.x * sx) + (basis.Up.x * sy),
                    origin.y + (basis.Across.y * sx) + (basis.Up.y * sy),
                    origin.z + (basis.Across.z * sx) + (basis.Up.z * sy)
                );

                targetUvs.push(perimeter[i], e === 0 ? 0 : lengthWorld);
            }
        }

        // WALLS, ONE RING AT A TIME
        // Winding follows from the section winding, which SectionLoopBuilder has
        // already normalised: outer rings counter-clockwise, holes clockwise. The
        // same quad order therefore faces outwards on a boundary and inwards on a
        // hole, which is outwards from the solid in both cases.
        let r, ring, k, currentIx, nextIx, near0, near1, far0, far1;

        for (r = 0; r < face.Rings.length; r++) {
            ring  =  face.Rings[r];

            for (k = 0; k < ring.Count; k++) {
                currentIx  =  ring.Start + k;
                nextIx     =  ring.Start + ((k + 1) % ring.Count);

                near0  =  baseIx + currentIx;
                near1  =  baseIx + nextIx;
                far0   =  near0  + count;
                far1   =  near1  + count;

                targetIndices.push(near0, near1, far1);
                targetIndices.push(near0, far1,  far0);
            }
        }

        // END CAPS OVER THE SAME VERTICES
        // The far end takes the triangulation as authored. The near end takes it
        // reversed, so its normal points back down the bar rather than into it.
        const triangles  =  face.Triangles;
        let t;

        for (t = 0; t < triangles.length; t += 3) {
            targetIndices.push(
                baseIx + triangles[t + 2],
                baseIx + triangles[t + 1],
                baseIx + triangles[t]
            );
            targetIndices.push(
                baseIx + count + triangles[t],
                baseIx + count + triangles[t + 1],
                baseIx + count + triangles[t + 2]
            );
        }

        // Triangle count contributed, which the pick index needs as a span.
        return ((face.Rings.reduce(function(sum, span) { return sum + span.Count; }, 0)) * 2)
             + ((triangles.length / 3) * 2);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Extrude One Part Along Every Bar and Merge the Result
    // ------------------------------------------------------------
    // One buffer for the whole part rather than one mesh per bar. A divided
    // lantern carries dozens of bars and three parts each, so per-bar meshes
    // would put the draw call count into the hundreds for geometry that shares a
    // single material.
    //
    // memberSpansOut is filled with the triangle span each bar occupies, which is
    // what lets a raycast hit on the merged buffer still name the individual bar
    // it landed on.
    function VghLantern__Env3d__GlazeBarComposite__BuildPartMesh(faces, bars, material, meshName, memberSpansOut) {
        const positions  =  [];
        const indices    =  [];
        const uvs        =  [];
        const minLength  =  VghLantern__Env3d__ConfigAccess__MmToWorld(MIN_MEMBER_LENGTH_MM);

        let b, f, bar, startWorld, endWorld, startVec, endVec, triangleCursor, spanCount;
        triangleCursor  =  0;

        for (b = 0; b < bars.length; b++) {
            bar  =  bars[b];

            startWorld  =  VghLantern__Env3d__ConfigAccess__PointToWorld(bar.Start);
            endWorld    =  VghLantern__Env3d__ConfigAccess__PointToWorld(bar.End);
            startVec    =  new THREE.Vector3(startWorld.x, startWorld.y, startWorld.z);
            endVec      =  new THREE.Vector3(endWorld.x,   endWorld.y,   endWorld.z);

            if (startVec.distanceTo(endVec) < minLength) continue;            // <-- Degenerate bar, absent from the buffer and from the spans

            spanCount  =  0;
            for (f = 0; f < faces.length; f++) {
                spanCount  +=  VghLantern__Env3d__GlazeBarComposite__BuildSolid(faces[f], startVec, endVec, positions, indices, uvs);
            }
            if (spanCount === 0) continue;

            if (Array.isArray(memberSpansOut)) {
                memberSpansOut.push({ Record : bar, SpanStart : triangleCursor, SpanCount : spanCount });
            }
            triangleCursor  +=  spanCount;
        }

        if (indices.length === 0) return null;

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));       // <-- U across the section, V along the bar, both in world units
        geometry.setIndex(indices);
        geometry.computeVertexNormals();                                      // <-- Smooth normals; the part materials shade flat, so hard arrises survive
        geometry.computeBoundingSphere();

        const mesh  =  new THREE.Mesh(geometry, material);
        mesh.name   =  meshName;
        return mesh;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part Definition and Materials
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Material a Part Is Made In
    // ------------------------------------------------------------
    // Two of the three parts are finished, and they are finished separately,
    // because they face opposite ways. The cap is the external capping seen from
    // the garden and is powder coated; the trim is the internal moulding seen from
    // the room and is either bare douglas fir or painted joinery. The core between
    // them takes no finish at all, because once the other two are on it is never
    // seen and is left as bare mill extrusion.
    //
    // The cap does not follow the frame finish, which is what it used to do. The
    // frame is painted joinery and the outside of the roof is dressed in lead
    // flashing, so what the frame is painted says nothing about the capping.
    function VghLantern__Env3d__GlazeBarComposite__MaterialForPart(partKey, finishes) {
        if (partKey === PART_CAP)  return VghLantern__Env3d__MaterialLibrary__GlazeBarCap(finishes.Cap);
        if (partKey === PART_TRIM) return VghLantern__Env3d__MaterialLibrary__GlazeBarTrim(finishes.Trim);
        return VghLantern__Env3d__MaterialLibrary__MillAluminium();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Name the Finish a Part Was Built In
    // ------------------------------------------------------------
    // The same branch the material lookup takes, answered as a name so the hover
    // inspector can quote it. Empty for the core, which carries no finish.
    function VghLantern__Env3d__GlazeBarComposite__FinishForPart(partKey, finishes) {
        if (partKey === PART_CAP)  return finishes.Cap;
        if (partKey === PART_TRIM) return finishes.Trim;
        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stamp a Mesh With Its Specification Identity
    // ------------------------------------------------------------
    // Everything downstream reads the part from here rather than parsing the mesh
    // name: the isolation toggle filters on ElementType, the hover inspector
    // labels from PartName, and a takeoff can total SectionAreaSqMm against bar
    // length without going back to the asset file.
    function VghLantern__Env3d__GlazeBarComposite__StampUserData(mesh, part, finishName) {
        mesh.userData.VghLantern__PartKey         =  part.PartKey;
        mesh.userData.VghLantern__PartName        =  part.PartName;
        mesh.userData.VghLantern__AssetId         =  part.AssetId;
        mesh.userData.VghLantern__ElementType     =  part.ElementType;
        mesh.userData.VghLantern__SpecMaterial    =  part.SpecMaterial;
        mesh.userData.VghLantern__SectionAreaSqMm =  part.SectionAreaSqMm;

        // The chosen finish, empty on the core because a concealed extrusion has
        // none. SpecMaterial says what the part is MADE of and this says how it is
        // finished, which on a painted trim are two different answers: douglas fir,
        // in Railings eggshell.
        mesh.userData.VghLantern__PartFinish      =  finishName || '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Build Every Glaze Bar in the Set as a Three Part Composite
    // ------------------------------------------------------------
    // Returns a summary the takeoff and the warning system can read without
    // touching the scene graph. A missing system index is reported and yields an
    // empty summary rather than throwing: a lantern that cannot draw its bars
    // must still draw everything else.
    export async function VghLantern__Env3d__MeshBuilder__GlazeBarComposite__Build(targetGroup, barSet, lantern) {
        const summary  =  { Parts : [], BarCount : 0, Warnings : [] };
        if (!targetGroup || !barSet || !Array.isArray(barSet.Bars) || barSet.Bars.length === 0) return summary;

        const Loader  =  window.VghLantern__AppData__GlazeBarSystemLoader;
        if (!Loader) {
            summary.Warnings.push('Glaze bar system loader is not available - no bars built.');
            return summary;
        }

        let parts;
        try {
            parts  =  await Loader.VghLantern__GlazeBarSystemLoader__ResolveParts(lantern);
        } catch (error) {
            summary.Warnings.push('Glaze bar parts could not be resolved: ' + error.message);
            return summary;
        }

        if (!parts || parts.length === 0) {
            summary.Warnings.push('Glaze bar system resolved no parts.');
            return summary;
        }

        const bars        =  barSet.Bars;
        const finishes    =  VghLantern__Env3d__GlazeBarComposite__BarFinishes(lantern);
        summary.BarCount  =  bars.length;

        let p, part, material, spans, mesh;

        for (p = 0; p < PART_ORDER.length; p++) {
            part  =  VghLantern__Env3d__GlazeBarComposite__FindPart(parts, PART_ORDER[p]);
            if (!part || !part.Faces || part.Faces.length === 0) continue;

            material  =  VghLantern__Env3d__GlazeBarComposite__MaterialForPart(part.PartKey, finishes);
            spans     =  [];
            mesh      =  VghLantern__Env3d__GlazeBarComposite__BuildPartMesh(
                part.Faces, bars, material,
                'VghLantern__Env3d__GlazeBar__' + part.PartKey,
                spans
            );
            if (!mesh) continue;

            VghLantern__Env3d__GlazeBarComposite__StampUserData(mesh, part,
                VghLantern__Env3d__GlazeBarComposite__FinishForPart(part.PartKey, finishes));
            VghLantern__Env3d__PickIndex__Register(mesh, 'member', 'glazeBar__' + part.PartKey, spans, VghLantern__Env3d__PickIndex__ModeTriangle);
            targetGroup.add(mesh);

            summary.Parts.push({
                PartKey          : part.PartKey,
                PartName         : part.PartName,
                AssetId          : part.AssetId,
                ElementType      : part.ElementType,
                SpecMaterial     : part.SpecMaterial,
                SectionAreaSqMm  : part.SectionAreaSqMm,
                BuiltBarCount    : spans.length
            });
        }

        if (summary.Parts.length === 0) summary.Warnings.push('No glaze bar part produced geometry.');
        return summary;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find a Resolved Part by Its Slot Key
    // ------------------------------------------------------------
    function VghLantern__Env3d__GlazeBarComposite__FindPart(parts, partKey) {
        let i;
        for (i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].PartKey === partKey) return parts[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Two Finishes the Bar Is Specified With
    // ------------------------------------------------------------
    // Both live in the glazing bars block alongside the trim depth, because they
    // are decisions about the bar rather than about the lantern around it.
    //
    // An empty name is passed straight through rather than substituted here. The
    // material library answers an unknown finish with its documented neutral
    // fallback, which deliberately matches no real product - so a project that
    // somehow reached the renderer without being normalised shows as wrong rather
    // than as a plausible bar in the wrong colour.
    function VghLantern__Env3d__GlazeBarComposite__BarFinishes(lantern) {
        const block  =  lantern ? lantern['Lantern__GlazingBars__Config'] : null;
        if (!block) return { Cap : '', Trim : '' };

        return {
            Cap  : block['Lantern__GlazingBars__Config__CapFinish']  || '',
            Trim : block['Lantern__GlazingBars__Config__TrimFinish'] || ''
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
