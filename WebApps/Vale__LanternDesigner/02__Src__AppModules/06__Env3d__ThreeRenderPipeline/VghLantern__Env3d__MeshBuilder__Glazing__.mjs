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
   - Triangulates each solved glazing face into a flat translucent panel.
   - Panels are inset from the face plane by the configured amount so the frame
     reads as frame rather than sitting coplanar with the glass and z-fighting.
   - Draws whole slopes rather than individual panes between bars. At review
     scale the bar meshes already delineate the panes, so per-pane glass would
     multiply geometry for no visual gain.

   ---------------------------------------------------------------------------

   TRIANGULATION APPROACH:
   Solver faces are convex quads or triangles, so a fan from the first vertex is
   both correct and cheap. There is no need for a general polygon tessellator, and
   deliberately not using one keeps this module dependency free.

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
    // Derived from the first three vertices, then flipped if it points inward,
    // using the face centroid relative to the model centre as the outward test.
    function VghLantern__Env3d__GlazingBuilder__FaceNormal(worldPoints) {
        const edgeA  =  new THREE.Vector3().subVectors(worldPoints[1], worldPoints[0]);
        const edgeB  =  new THREE.Vector3().subVectors(worldPoints[2], worldPoints[0]);
        const normal =  new THREE.Vector3().crossVectors(edgeA, edgeB).normalize();

        // A roof slope always faces upward to some degree, so a downward normal
        // means the winding is reversed for our purposes.
        if (normal.y < 0) normal.negate();
        return normal;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Face's Model Points to Inset World Points
    // ------------------------------------------------------------
    function VghLantern__Env3d__GlazingBuilder__InsetFacePoints(face, insetWorld) {
        const worldPoints  =  [];

        for (let i = 0; i < face.Points.length; i++) {
            const pt  =  VghLantern__Env3d__ConfigAccess__PointToWorld(face.Points[i]);
            worldPoints.push(new THREE.Vector3(pt.x, pt.y, pt.z));
        }

        if (insetWorld === 0 || worldPoints.length < MIN_FACE_POINTS) return worldPoints;

        const normal  =  VghLantern__Env3d__GlazingBuilder__FaceNormal(worldPoints);
        for (let i = 0; i < worldPoints.length; i++) {
            worldPoints[i].addScaledVector(normal, -insetWorld);              // <-- Push the glass back under the frame
        }
        return worldPoints;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fan Triangulate a Convex Face Into a Vertex List
    // ------------------------------------------------------------
    function VghLantern__Env3d__GlazingBuilder__FanTriangles(worldPoints, sink) {
        for (let i = 1; i < worldPoints.length - 1; i++) {
            sink.push(worldPoints[0], worldPoints[i], worldPoints[i + 1]);
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

        const insetWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(VghLantern__Env3d__ConfigAccess__RequireNumber('MeshBuilders', 'GlazingInsetMm'));
        const vertices    =  [];
        const spans       =  [];

        for (let i = 0; i < skeleton.Faces.length; i++) {
            const face  =  skeleton.Faces[i];
            if (!face || face.Role !== FACE_ROLE_GLAZING) continue;
            if (!Array.isArray(face.Points) || face.Points.length < MIN_FACE_POINTS) continue;

            // Recorded either side of the fan so each face knows which triangles of
            // the shared buffer are its own, which is what lets the hover inspector
            // name one slope out of a mesh holding all four.
            const triangleStart  =  vertices.length / VERTICES_PER_TRIANGLE;

            const worldPoints  =  VghLantern__Env3d__GlazingBuilder__InsetFacePoints(face, insetWorld);
            VghLantern__Env3d__GlazingBuilder__FanTriangles(worldPoints, vertices);

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
