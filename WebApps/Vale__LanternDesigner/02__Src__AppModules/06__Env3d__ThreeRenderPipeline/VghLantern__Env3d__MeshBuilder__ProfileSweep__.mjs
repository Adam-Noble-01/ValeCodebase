/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - PROFILE SWEEP
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__ProfileSweep__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder ProfileSweep
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Extrude a 2D section outline along a skeleton member centreline
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - The 3D counterpart of Env2d's ProfileTraceRenderer, and the reason profiles
     are authored once as a 2D outline rather than modelled per instance.
   - Takes a Na__Asset__Profile2D outline in millimetres plus a start and end
     point in model space, and returns a capped extrusion oriented along that
     member.
   - Pure geometry construction. No scene access, no material assignment - the
     caller owns both.

   ---------------------------------------------------------------------------

   PROFILE ORIENTATION CONVENTION:
   A Profile2D outline is authored in its own local section plane:
       outline +x  ->  member local width  (horizontal, across the member)
       outline +y  ->  member local depth  (the member's up direction)
   The extrusion runs along the member's own length axis. So a glazing bar
   outline drawn 40 mm wide and 55 mm deep produces a bar 40 mm across the slope
   and 55 mm through the slope, whichever way the rafter happens to run.

   The up reference is world up (model +Z) projected perpendicular to the member,
   which is what makes a hip and a rafter both read correctly without per-role
   special casing. Members that are exactly vertical fall back to the model +Y
   axis for their up reference.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__Section,
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | Profile Sweep Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Geometry Guards and Fallback Section
    // ------------------------------------------------------------
    const MIN_MEMBER_LENGTH_MM  =  0.5;                                      // <-- Below this a member is degenerate
    const MIN_OUTLINE_POINTS    =  3;                                        // <-- A section needs at least a triangle
    const VERTICAL_DOT_LIMIT    =  0.999;                                    // <-- Above this the member is effectively vertical
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Outline Preparation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Rectangular Fallback Outline
    // ------------------------------------------------------------
    // Used when a member has no profile assigned yet, so the 3D view still shows
    // a solid member of roughly the right size rather than nothing at all.
    export function VghLantern__Env3d__ProfileSweep__FallbackOutline(widthMm, depthMm) {
        const config  =  VghLantern__Env3d__ConfigAccess__Section('MeshBuilders');
        const w       =  Number(widthMm) || Number(config.FallbackBarWidthMm) || 40;
        const d       =  Number(depthMm) || Number(config.FallbackBarDepthMm) || 55;
        const halfW   =  w / 2;

        return [
            { x: -halfW, y: 0 },
            { x:  halfW, y: 0 },
            { x:  halfW, y: d },
            { x: -halfW, y: d }
        ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert an Outline to a Three.js Shape in World Units
    // ------------------------------------------------------------
    function VghLantern__Env3d__ProfileSweep__OutlineToShape(outlinePoints) {
        if (!Array.isArray(outlinePoints) || outlinePoints.length < MIN_OUTLINE_POINTS) return null;

        const shape  =  new THREE.Shape();
        const first  =  outlinePoints[0];

        shape.moveTo(
            VghLantern__Env3d__ConfigAccess__MmToWorld(first.x),
            VghLantern__Env3d__ConfigAccess__MmToWorld(first.y)
        );

        for (let i = 1; i < outlinePoints.length; i++) {
            const pt  =  outlinePoints[i];
            if (!pt) continue;
            shape.lineTo(
                VghLantern__Env3d__ConfigAccess__MmToWorld(pt.x),
                VghLantern__Env3d__ConfigAccess__MmToWorld(pt.y)
            );
        }

        shape.closePath();
        return shape;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Member Orientation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Orientation Basis for a Member
    // ------------------------------------------------------------
    // Returns an orthonormal basis where the local Z axis runs along the member
    // and the local Y axis is the member's up direction.
    function VghLantern__Env3d__ProfileSweep__MemberBasis(startWorld, endWorld) {
        const along  =  new THREE.Vector3().subVectors(endWorld, startWorld).normalize();
        const worldUp =  new THREE.Vector3(0, 1, 0);

        // A vertical member cannot use world up as its reference, so switch axis.
        const upReference  =  Math.abs(along.dot(worldUp)) > VERTICAL_DOT_LIMIT
            ? new THREE.Vector3(0, 0, -1)
            : worldUp;

        const across  =  new THREE.Vector3().crossVectors(upReference, along).normalize();
        const up      =  new THREE.Vector3().crossVectors(along, across).normalize();

        return { Along : along, Across : across, Up : up };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Transform That Places a Swept Section
    // ------------------------------------------------------------
    function VghLantern__Env3d__ProfileSweep__MemberMatrix(startWorld, endWorld) {
        const basis   =  VghLantern__Env3d__ProfileSweep__MemberBasis(startWorld, endWorld);
        const matrix  =  new THREE.Matrix4();

        // Extrusion runs along local +Z, so map local Z onto the member direction.
        matrix.makeBasis(basis.Across, basis.Up, basis.Along);
        matrix.setPosition(startWorld);
        return matrix;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sweep Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Swept Mesh Geometry for One Member
    // ------------------------------------------------------------
    // startMm / endMm are model-space millimetre points from the SkeletonSolver.
    // Returns null when the member or outline is degenerate, so callers can fall
    // back to line mode rather than adding an invalid mesh.
    export function VghLantern__Env3d__ProfileSweep__BuildGeometry(outlinePoints, startMm, endMm) {
        const shape  =  VghLantern__Env3d__ProfileSweep__OutlineToShape(outlinePoints);
        if (!shape) return null;

        const startWorld  =  VghLantern__Env3d__ConfigAccess__PointToWorld(startMm);
        const endWorld    =  VghLantern__Env3d__ConfigAccess__PointToWorld(endMm);
        const startVec    =  new THREE.Vector3(startWorld.x, startWorld.y, startWorld.z);
        const endVec      =  new THREE.Vector3(endWorld.x,   endWorld.y,   endWorld.z);
        const lengthWorld =  startVec.distanceTo(endVec);

        if (lengthWorld < VghLantern__Env3d__ConfigAccess__MmToWorld(MIN_MEMBER_LENGTH_MM)) return null;

        const config    =  VghLantern__Env3d__ConfigAccess__Section('MeshBuilders');
        const geometry  =  new THREE.ExtrudeGeometry(shape, {
            depth          : lengthWorld,
            bevelEnabled   : false,
            steps          : Math.max(1, Number(config.SweepSegmentsPerMember) || 1),
            curveSegments  : 8
        });

        geometry.applyMatrix4(VghLantern__Env3d__ProfileSweep__MemberMatrix(startVec, endVec));
        geometry.computeVertexNormals();
        return geometry;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Swept Mesh for One Member
    // ------------------------------------------------------------
    export function VghLantern__Env3d__ProfileSweep__BuildMesh(outlinePoints, startMm, endMm, material, meshName) {
        const geometry  =  VghLantern__Env3d__ProfileSweep__BuildGeometry(outlinePoints, startMm, endMm);
        if (!geometry) return null;

        const mesh  =  new THREE.Mesh(geometry, material);
        mesh.name   =  meshName || 'VghLantern__Env3d__SweptMember';
        return mesh;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Merged Mesh for Many Members Sharing One Profile
    // ------------------------------------------------------------
    // Glazing bars are the volume case - dozens of identical sections. Merging
    // them into a single geometry keeps the draw call count flat as bar count
    // rises, which is what stops a heavily divided lantern from stuttering.
    export function VghLantern__Env3d__ProfileSweep__BuildMergedMesh(outlinePoints, members, material, meshName) {
        if (!Array.isArray(members) || members.length === 0) return null;

        const geometries  =  [];
        for (let i = 0; i < members.length; i++) {
            const member    =  members[i];
            const geometry  =  VghLantern__Env3d__ProfileSweep__BuildGeometry(outlinePoints, member.Start, member.End);
            if (geometry) geometries.push(geometry);
        }

        if (geometries.length === 0) return null;

        const merged  =  VghLantern__Env3d__ProfileSweep__MergeGeometries(geometries);
        for (let i = 0; i < geometries.length; i++) geometries[i].dispose();   // <-- Sources are no longer needed
        if (!merged) return null;

        const mesh  =  new THREE.Mesh(merged, material);
        mesh.name   =  meshName || 'VghLantern__Env3d__SweptMemberSet';
        return mesh;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Merge Position-Only Geometries Into One Buffer
    // ------------------------------------------------------------
    // Hand-rolled rather than pulled from BufferGeometryUtils, because every
    // extrusion here has an identical attribute layout and the merge is trivial.
    // Avoiding the addon keeps the vendored Three surface as small as possible.
    function VghLantern__Env3d__ProfileSweep__MergeGeometries(geometries) {
        let totalVertices  =  0;
        for (let i = 0; i < geometries.length; i++) {
            const nonIndexed  =  geometries[i].index ? geometries[i].toNonIndexed() : geometries[i];
            geometries[i].__nonIndexed  =  nonIndexed;
            totalVertices  +=  nonIndexed.attributes.position.count;
        }

        const positions  =  new Float32Array(totalVertices * 3);
        const normals    =  new Float32Array(totalVertices * 3);
        let cursor       =  0;

        for (let i = 0; i < geometries.length; i++) {
            const source  =  geometries[i].__nonIndexed;
            const pos     =  source.attributes.position.array;
            const norm    =  source.attributes.normal ? source.attributes.normal.array : null;

            positions.set(pos, cursor);
            if (norm) normals.set(norm, cursor);
            cursor  +=  pos.length;

            if (source !== geometries[i]) source.dispose();                   // <-- Dispose the temporary non-indexed copy
            delete geometries[i].__nonIndexed;
        }

        const merged  =  new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        merged.setAttribute('normal',   new THREE.BufferAttribute(normals, 3));
        return merged;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
