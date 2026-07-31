/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MESH BUILDER - BUILDERS UPSTAND BOX
   =============================================================================

   FILE       : VghLantern__Env3d__MeshBuilder__BuildersUpstandBox__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MeshBuilder BuildersUpstandBox
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Extrude the base assembly into two solid hollow prisms
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds the base of the lantern as SOLIDS rather than swept members, because
     that is what it physically is: a site-built builders upstand on the roof with a
     hole through it, and the Vale base frame sitting on top of it.
     SCOPE: the upstand is prepared by others; Vale mounts the lantern onto it.
   - Reads the Base block of the SolvedSkeleton and nothing else. Every number
     here originates in VghLantern__Geometry__SkeletonSolver.
   - Two prisms, stacked, sharing one footprint and one wall thickness:
       upstand z = 0               to  z = UpstandTopLevelMm
       frame   z = UpstandTopLevelMm to z = FrameTopLevelMm
     The outer face of both is the lantern's stated width and depth, so the wall
     thickness only ever eats into the reveal.

   ---------------------------------------------------------------------------

   WHY EXTRUDE A SHAPE WITH A HOLE RATHER THAN SWEEP FOUR MEMBERS:
   Sweeping the four walls as separate sections leaves open mitres at the corners
   and gives no inner face to read the reveal against. A single Shape carrying a
   Path hole extrudes to a watertight box with the reveal cut clean through it,
   which is both what the builder sees on site and one draw call rather than
   four. When the thickness leaves no usable reveal the solver says so, and the
   prism is built solid instead of hollow.

   ORIENTATION:
   The footprint is authored in the shape plane as (model x, model y) and the
   extrusion runs along the shape's local +Z. The basis matrix then maps that
   local frame onto the Three.js world used everywhere in this environment:
       local X  ->  world  X    model width
       local Y  ->  world -Z    model depth
       local Z  ->  world  Y    model height, extruded upward
   That mapping is the same axis swap ConfigAccess__PointToWorld applies to a
   point, expressed as a basis so a whole geometry can be moved in one step.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__RequireBoolean
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__MaterialLibrary__Frame,
    VghLantern__Env3d__MaterialLibrary__BuildersUpstand
} from './VghLantern__Env3d__MaterialLibrary__.mjs';

import { VghLantern__Env3d__PickIndex__RegisterWhole } from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | Builders Upstand Box Mesh Builder Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Geometry Guards and Config Keys
    // ------------------------------------------------------------
    const MIN_PRISM_HEIGHT_MM   =  0.5;                                      // <-- Below this a prism is degenerate
    const MIN_FOOTPRINT_MM      =  1;                                        // <-- Below this there is no footprint to extrude

    const FINISH_BLOCK          =  'Lantern__FinishAndGlazing__Config';      // <-- Frame finish lives here
    const FINISH_FIELD          =  'Lantern__FinishAndGlazing__Config__FrameFinish';

    const OBJECT_NAME_UPSTAND      =  'VghLantern__Env3d__Base__BuildersUpstand';
    const OBJECT_NAME_FRAME     =  'VghLantern__Env3d__Base__Frame';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Footprint Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Trace a Centred Rectangle onto a Shape or Path
    // ------------------------------------------------------------
    // isClockwise reverses the winding, which is what a hole needs relative to
    // its outer contour.
    function VghLantern__Env3d__BuildersUpstandBox__TraceRectangle(target, halfWidthMm, halfDepthMm, isClockwise) {
        const halfW  =  VghLantern__Env3d__ConfigAccess__MmToWorld(halfWidthMm);
        const halfD  =  VghLantern__Env3d__ConfigAccess__MmToWorld(halfDepthMm);

        target.moveTo(-halfW, -halfD);

        if (isClockwise) {
            target.lineTo(-halfW,  halfD);
            target.lineTo( halfW,  halfD);
            target.lineTo( halfW, -halfD);
        } else {
            target.lineTo( halfW, -halfD);
            target.lineTo( halfW,  halfD);
            target.lineTo(-halfW,  halfD);
        }

        target.closePath();
        return target;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Base Footprint, Hollow When There Is a Reveal
    // ------------------------------------------------------------
    function VghLantern__Env3d__BuildersUpstandBox__Footprint(baseBlock) {
        if (baseBlock.OuterHalfWidthMm < MIN_FOOTPRINT_MM || baseBlock.OuterHalfDepthMm < MIN_FOOTPRINT_MM) return null;

        const shape  =  new THREE.Shape();
        VghLantern__Env3d__BuildersUpstandBox__TraceRectangle(shape, baseBlock.OuterHalfWidthMm, baseBlock.OuterHalfDepthMm, false);

        if (baseBlock.HasReveal) {
            const hole  =  new THREE.Path();
            VghLantern__Env3d__BuildersUpstandBox__TraceRectangle(hole, baseBlock.InnerHalfWidthMm, baseBlock.InnerHalfDepthMm, true);
            shape.holes.push(hole);
        }

        return shape;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Map the Extrusion Frame onto the Three.js World
    // ------------------------------------------------------------
    function VghLantern__Env3d__BuildersUpstandBox__PlacementMatrix(baseLevelMm) {
        const matrix  =  new THREE.Matrix4();

        matrix.makeBasis(
            new THREE.Vector3(1, 0,  0),                                      // <-- Shape x  ->  world x   (width)
            new THREE.Vector3(0, 0, -1),                                      // <-- Shape y  ->  world -z  (depth)
            new THREE.Vector3(0, 1,  0)                                       // <-- Extrude  ->  world y   (up)
        );
        matrix.setPosition(0, VghLantern__Env3d__ConfigAccess__MmToWorld(baseLevelMm), 0);

        return matrix;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Prism Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build One Prism of the Base Assembly
    // ------------------------------------------------------------
    function VghLantern__Env3d__BuildersUpstandBox__BuildPrism(baseBlock, baseLevelMm, heightMm, material, objectName) {
        if (heightMm < MIN_PRISM_HEIGHT_MM) return null;

        const shape  =  VghLantern__Env3d__BuildersUpstandBox__Footprint(baseBlock);
        if (!shape) return null;

        const geometry  =  new THREE.ExtrudeGeometry(shape, {
            depth         : VghLantern__Env3d__ConfigAccess__MmToWorld(heightMm),
            bevelEnabled  : false,
            steps         : 1,
            curveSegments : 1
        });

        geometry.applyMatrix4(VghLantern__Env3d__BuildersUpstandBox__PlacementMatrix(baseLevelMm));
        geometry.computeVertexNormals();

        const mesh  =  new THREE.Mesh(geometry, material);
        mesh.name   =  objectName;
        return mesh;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Lantern's Chosen Frame Finish
    // ------------------------------------------------------------
    function VghLantern__Env3d__BuildersUpstandBox__FinishName(lantern) {
        if (!lantern) return '';

        const block  =  lantern[FINISH_BLOCK];
        return block ? (block[FINISH_FIELD] || '') : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Build Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Builders Upstand and Frame Solids into a Group
    // ------------------------------------------------------------
    // The upstand takes the builders-upstand material (site studwork, not Vale
    // manufacture); the frame takes the lantern's own finish because it is.
    export function VghLantern__Env3d__MeshBuilder__BuildersUpstandBox__Build(targetGroup, skeleton, lantern) {
        if (!targetGroup || !skeleton || !skeleton.Base) return;

        if (!VghLantern__Env3d__ConfigAccess__RequireBoolean('MeshBuilders', 'BuildBaseAsSolid')) return; // <-- Line mode already drew the base rings

        const base  =  skeleton.Base;

        // Each prism is its own object, so it registers as a single pickable
        // instance carrying the whole Base block - both prisms describe the same
        // footprint and differ only in which height the inspector should read.
        const upstandMesh  =  VghLantern__Env3d__BuildersUpstandBox__BuildPrism(
            base, base.UpstandBaseLevelMm, base.UpstandHeightMm,
            VghLantern__Env3d__MaterialLibrary__BuildersUpstand(), OBJECT_NAME_UPSTAND
        );
        if (upstandMesh) {
            VghLantern__Env3d__PickIndex__RegisterWhole(upstandMesh, 'base', 'buildersUpstand', base);
            targetGroup.add(upstandMesh);
        }

        const frameMesh  =  VghLantern__Env3d__BuildersUpstandBox__BuildPrism(
            base, base.UpstandTopLevelMm, base.FrameHeightMm,
            VghLantern__Env3d__MaterialLibrary__Frame(VghLantern__Env3d__BuildersUpstandBox__FinishName(lantern)), OBJECT_NAME_FRAME
        );
        if (frameMesh) {
            VghLantern__Env3d__PickIndex__RegisterWhole(frameMesh, 'base', 'frame', base);
            targetGroup.add(frameMesh);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
