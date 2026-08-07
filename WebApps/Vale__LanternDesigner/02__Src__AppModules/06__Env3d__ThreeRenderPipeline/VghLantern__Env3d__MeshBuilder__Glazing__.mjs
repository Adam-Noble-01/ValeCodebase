/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - GLAZING
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__Glazing__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder Glazing
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build translucent glass faces from solved skeleton faces
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds each solved glazing face as a translucent SLAB of the configured
     thickness, not a single plane.
   - The slab is seated on the GLAZE BAR DATUM the way the real unit is. Its
     INNER face sits GlazingInnerFaceOffsetMm ABOVE the datum, which is the
     depth of the core's glazing leg and the setting tape the pane beds onto,
     and the unit's thickness is then measured outward from that bedding face.
   - Draws whole slopes rather than individual panes between bars. At review
     scale the bar meshes already delineate the panes, so per-pane glass would
     multiply geometry for no visual gain.

   ---------------------------------------------------------------------------

   WHY THE GLASS HAS THICKNESS:
   A sealed unit is 28 mm over its two panes, the spacer and the seals, and that
   depth is doing visual work. A single plane has no edge to catch light where it
   meets a bar, and only one surface to reflect from, which is a large part of
   why flat-plane glass reads as a tinted sheet however well the material is
   tuned. The slab gives a visible edge at every junction and a second reflection
   off the back face.

   Extrusion runs OUTWARD from the bedding face, because that is the face the bar
   actually locates. The pane sits down on the core's glazing leg and everything
   above it is unit thickness, so changing the thickness moves the OUTER surface
   up under the cap and leaves the bedding face exactly where the bar put it -
   which is how a thicker unit behaves on the real roof.

   EVERY FACE IS GLASS:
   Outer cap, inner cap and edge band are all part of one buffer and so all wear
   the glazing material. This matters more than it sounds: an untextured reverse
   or edge face would read as flat grey wherever the frame does not cover it,
   which on a lantern is every eaves and ridge junction and the whole underside
   seen from indoors.

   TRIANGULATION AND WINDING:
   Solver faces are convex quads or triangles, so a fan from the first vertex is
   both correct and cheap - no general tessellator, no dependency. A slab does
   need its winding to be right, though, where a plane did not: computeVertexNormals
   derives normals from winding, so a reversed cap would light as though the sky
   were underneath the roof. The point ring is therefore normalised to an
   outward winding once, and every cap and wall is built consistently from it.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld,
    VghLantern__Env3d__ConfigAccess__RequireNumber
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import { VghLantern__Env3d__MaterialLibrary__Glazing } from './VghLantern__Env3d__MaterialLibrary__.mjs';
import { VghLantern__Env3d__PickIndex__Register, VghLantern__Env3d__PickIndex__ModeTriangle } from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Glazing Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Face Filtering and Geometry Guards
    // ------------------------------------------------------------
    const FACE_ROLE_GLAZING     =  'glazingFace';                            // <-- Only glazing faces get glass
    const MIN_FACE_POINTS       =  3;                                        // <-- A face needs at least a triangle
    const VERTICES_PER_TRIANGLE =  3;                                        // <-- The vertex sink is a flat triangle list
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Face Geometry Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compute the Outward Normal of a Face
    // ------------------------------------------------------------
    // Derived from the first three vertices, then flipped if it points inward.
    // A roof slope always faces upward to some degree, so a downward normal means
    // the winding runs the other way for our purposes.
    function VghLantern__Env3d__GlazingBuilder__FaceNormal(worldPoints) {
        const edgeA  =  new THREE.Vector3().subVectors(worldPoints[1], worldPoints[0]);
        const edgeB  =  new THREE.Vector3().subVectors(worldPoints[2], worldPoints[0]);
        const normal =  new THREE.Vector3().crossVectors(edgeA, edgeB).normalize();

        if (normal.y < 0) normal.negate();
        return normal;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extend a Face's Eaves Edge Down to the Cap Ends
    // ------------------------------------------------------------
    // The solved face stops on the eaves datum ring, but the real glass runs
    // down the slope past the datum with the bars, ending level with the glaze
    // bar cap ends (the cap extension along the pitch, from the base frame
    // system).
    //
    // HOW THE CORNERS MOVE - this is the part that keeps the hips closed.
    // Every eaves vertex slides along its OWN upslope boundary edge, extended:
    // for a corner that edge is the hip (or the pane's ridge-end edge), so the
    // pane's mitred side stays collinear with the hip line rather than
    // swinging sideways. The slide distance is scaled so the movement's
    // down-slope component is exactly the cap extension - the whole eaves edge
    // lands parallel to the datum, one extension down the pitch, at the cap
    // end level. On an equal-pitch hip the two adjacent panes extend along the
    // same 3D hip line by the same amount, so their extended corners COINCIDE
    // and no gap can open. Points above the eaves never move; the solved face
    // is not touched, so set-out and area takeoff keep the datum geometry.
    function VghLantern__Env3d__GlazingBuilder__ExtendPointsToCapEnds(face, skeleton) {
        const points    =  face.Points;
        const Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        const meta      =  skeleton.Meta || {};
        const eavesMm   =  Number(meta.EavesLevelMm);
        if (!Assembly || !isFinite(eavesMm)) return points;

        const extensionMm  =  Number(Assembly.VghLantern__BaseFrameAssembly__EavesInterface().GlazeBarCapExtensionAlongPitchMm) || 0;
        if (extensionMm <= 0) return points;

        const count    =  points.length;
        const onEaves  =  points.map(function(pt) { return Math.abs(pt.z - eavesMm) <= 0.5; });
        const eavesPts =  points.filter(function(pt, i) { return onEaves[i]; });
        if (eavesPts.length < 2 || eavesPts.length >= count) return points;

        // In-plane down-slope unit for this face: horizontal outward normal of
        // the eaves edge (away from the centroid) pitched down by the face
        // pitch. Used to scale each vertex's slide and as the fallback
        // direction if a boundary edge ever degenerates.
        const pitchRad  =  (Number(face.PitchDegrees) || 0) * (Math.PI / 180);

        let cx = 0, cy = 0;
        for (let i = 0; i < count; i++) { cx += points[i].x; cy += points[i].y; }
        cx /= count; cy /= count;

        const ex  =  eavesPts[1].x - eavesPts[0].x;
        const ey  =  eavesPts[1].y - eavesPts[0].y;
        const el  =  Math.hypot(ex, ey);
        if (el <= 0) return points;

        let nx  =  ey / el;
        let ny  =  -ex / el;
        if (((eavesPts[0].x - cx) * nx) + ((eavesPts[0].y - cy) * ny) < 0) { nx = -nx; ny = -ny; }

        const slopeDir  =  {
            x : nx * Math.cos(pitchRad),
            y : ny * Math.cos(pitchRad),
            z : -Math.sin(pitchRad)
        };

        return points.map(function(pt, i) {
            if (!onEaves[i]) return pt;

            // The upslope neighbour on the polygon boundary - the hip end or
            // ridge end this vertex's side edge runs up to.
            const prev   =  points[(i + count - 1) % count];
            const next   =  points[(i + 1) % count];
            const upper  =  !onEaves[(i + count - 1) % count] ? prev
                         :  !onEaves[(i + 1) % count]         ? next
                         :  null;

            let dirX  =  slopeDir.x, dirY  =  slopeDir.y, dirZ  =  slopeDir.z;

            if (upper) {
                const ux   =  pt.x - upper.x;
                const uy   =  pt.y - upper.y;
                const uz   =  pt.z - upper.z;
                const ul   =  Math.hypot(ux, uy, uz);
                if (ul > 0) { dirX = ux / ul; dirY = uy / ul; dirZ = uz / ul; }
            }

            // Scale so the slide's down-slope component equals the extension.
            const denom  =  (dirX * slopeDir.x) + (dirY * slopeDir.y) + (dirZ * slopeDir.z);
            const slide  =  denom > 0.1 ? extensionMm / denom : extensionMm;

            return { x: pt.x + (dirX * slide), y: pt.y + (dirY * slide), z: pt.z + (dirZ * slide) };
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Face's Model Points to Offset World Points
    // ------------------------------------------------------------
    // The solved face plane IS the glaze bar datum - the same section zero the
    // composite bar is built about - so offsetWorld is measured from that datum
    // along the face's OUTWARD normal. Positive lifts the ring out through the
    // roof towards the cap, negative drops it inside towards the trim.
    //
    // The returned ring is wound so that a fan across it faces OUTWARD. A slab
    // has an inside and an outside, so unlike a single plane its winding has to
    // be right: computeVertexNormals reads winding, and a reversed cap would
    // light as though the sky were underneath the roof.
    function VghLantern__Env3d__GlazingBuilder__OffsetFacePoints(face, offsetWorld) {
        const worldPoints  =  [];

        for (let i = 0; i < face.Points.length; i++) {
            const pt  =  VghLantern__Env3d__ConfigAccess__PointToWorld(face.Points[i]);
            worldPoints.push(new THREE.Vector3(pt.x, pt.y, pt.z));
        }

        if (worldPoints.length < MIN_FACE_POINTS) return worldPoints;

        const outward  =  VghLantern__Env3d__GlazingBuilder__FaceNormal(worldPoints);

        // FaceNormal may have flipped the raw winding normal to point up. When it
        // did, the point order itself is reversed relative to outward, so reverse
        // it once here and every cap and wall built from it is consistent.
        const edgeA  =  new THREE.Vector3().subVectors(worldPoints[1], worldPoints[0]);
        const edgeB  =  new THREE.Vector3().subVectors(worldPoints[2], worldPoints[0]);
        const raw    =  new THREE.Vector3().crossVectors(edgeA, edgeB);
        if (raw.dot(outward) < 0) worldPoints.reverse();

        if (offsetWorld !== 0) {
            for (let i = 0; i < worldPoints.length; i++) {
                worldPoints[i].addScaledVector(outward, offsetWorld);          // <-- Lift the ring clear of the bar datum
            }
        }
        return worldPoints;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fan Triangulate a Convex Ring Into a Vertex List
    // ------------------------------------------------------------
    function VghLantern__Env3d__GlazingBuilder__FanTriangles(ring, sink) {
        for (let i = 1; i < ring.length - 1; i++) {
            sink.push(ring[0], ring[i], ring[i + 1]);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fan Triangulate a Ring With Reversed Winding
    // ------------------------------------------------------------
    // The back face of the slab, wound so its normal points the other way.
    function VghLantern__Env3d__GlazingBuilder__FanTrianglesReversed(ring, sink) {
        for (let i = 1; i < ring.length - 1; i++) {
            sink.push(ring[0], ring[i + 1], ring[i]);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Glazing Slab From an Outward-Wound Ring
    // ------------------------------------------------------------
    // The ring handed in is the OUTER face of the unit and the body is built
    // back inward from it. The caller places that ring at the bedding offset
    // PLUS the thickness, so the inner ring lands exactly on the bedding face
    // above the bar datum whatever the thickness is set to.
    //
    // Emits the outer cap, the inner cap and the edge band. All three are part of
    // the same buffer and so wear the same glass material - a slab whose reverse
    // and edge faces were untextured would show as flat grey wherever the frame
    // does not cover it, which on a lantern is every eaves and ridge junction.
    function VghLantern__Env3d__GlazingBuilder__BuildSlab(outerRing, outward, thicknessWorld, sink) {
        if (thicknessWorld <= 0) {
            VghLantern__Env3d__GlazingBuilder__FanTriangles(outerRing, sink);
            return;
        }

        const innerRing  =  outerRing.map(function(point) {
            return point.clone().addScaledVector(outward, -thicknessWorld);
        });

        VghLantern__Env3d__GlazingBuilder__FanTriangles(outerRing, sink);           // <-- Outer face, normals outward
        VghLantern__Env3d__GlazingBuilder__FanTrianglesReversed(innerRing, sink);   // <-- Inner face, normals inward

        // EDGE BAND | One quad per ring edge, wound so its normal points away
        // from the slab body rather than into it.
        for (let i = 0; i < outerRing.length; i++) {
            const next   =  (i + 1) % outerRing.length;
            const outerA =  outerRing[i];
            const outerB =  outerRing[next];
            const innerA =  innerRing[i];
            const innerB =  innerRing[next];

            sink.push(outerA, innerA, innerB);
            sink.push(outerA, innerB, outerB);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Glazing Assembly
// -----------------------------------------------------------------------------

    // FUNCTION | Build Every Glazing Face Into the Glazing Group
    // ------------------------------------------------------------
    export function VghLantern__Env3d__MeshBuilder__Glazing__Build(targetGroup, skeleton) {
        if (!targetGroup || !skeleton || !Array.isArray(skeleton.Faces)) return;

        const innerFaceWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(VghLantern__Env3d__ConfigAccess__RequireNumber('MeshBuilders', 'GlazingInnerFaceOffsetMm'));
        const thicknessWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(VghLantern__Env3d__ConfigAccess__RequireNumber('MeshBuilders', 'GlazingThicknessMm'));
        const outerFaceWorld  =  innerFaceWorld + thicknessWorld;             // <-- Ring goes in at the outer face; the slab closes back down onto the bedding face
        const vertices        =  [];
        const spans           =  [];

        for (let i = 0; i < skeleton.Faces.length; i++) {
            const face  =  skeleton.Faces[i];
            if (!face || face.Role !== FACE_ROLE_GLAZING) continue;
            if (!Array.isArray(face.Points) || face.Points.length < MIN_FACE_POINTS) continue;

            // Recorded either side of the fan so each face knows which triangles of
            // the shared buffer are its own, which is what lets the hover inspector
            // name one slope out of a mesh holding all four.
            const triangleStart  =  vertices.length / VERTICES_PER_TRIANGLE;

            // The glass runs past the datum to the cap ends; the pick record
            // stays the solved face so the inspector reports datum geometry.
            const extendedFace  =  { Points : VghLantern__Env3d__GlazingBuilder__ExtendPointsToCapEnds(face, skeleton) };

            const worldPoints  =  VghLantern__Env3d__GlazingBuilder__OffsetFacePoints(extendedFace, outerFaceWorld);
            const outward      =  VghLantern__Env3d__GlazingBuilder__FaceNormal(worldPoints);
            VghLantern__Env3d__GlazingBuilder__BuildSlab(worldPoints, outward, thicknessWorld, vertices);

            spans.push({
                Record    : face,
                SpanStart : triangleStart,
                SpanCount : (vertices.length / VERTICES_PER_TRIANGLE) - triangleStart
            });
        }

        if (vertices.length === 0) return;

        const positions  =  new Float32Array(vertices.length * 3);
        for (let i = 0; i < vertices.length; i++) {
            positions[i * 3]      =  vertices[i].x;
            positions[i * 3 + 1]  =  vertices[i].y;
            positions[i * 3 + 2]  =  vertices[i].z;
        }

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.computeVertexNormals();

        const mesh      =  new THREE.Mesh(geometry, VghLantern__Env3d__MaterialLibrary__Glazing());
        mesh.name       =  'VghLantern__Env3d__Glazing';
        mesh.renderOrder =  1;                                                // <-- Transparent geometry draws after the frame

        VghLantern__Env3d__PickIndex__Register(mesh, 'glazing', FACE_ROLE_GLAZING, spans, VghLantern__Env3d__PickIndex__ModeTriangle);
        targetGroup.add(mesh);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
