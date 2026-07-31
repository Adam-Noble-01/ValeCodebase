/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | COMPONENT LOADER - GLB
   =============================================================================

   FILE       : VghLantern__Env3d__ComponentLoader__Glb__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - ComponentLoader Glb
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load and place GLB components at solved finial anchor points
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Places discrete components - finials, finial bases, cresting, vents - at the
     anchor points published by the SkeletonSolver.
   - The 3D counterpart of Env2d's FinialRenderer. Both read the same component
     library entry; this one uses Na__Asset__Glb3d__Url while the 2D renderer uses
     Na__Asset__Profile2D.
   - Caches loaded GLB scenes and clones per placement, so four identical finials
     cost one network fetch and one parse.
   - A missing or absent GLB yields a proportional placeholder rather than an
     empty anchor, matching the 2D fallback behaviour.

   ---------------------------------------------------------------------------

   SCALE CONVENTION:
   GLBs exported by the SketchUp CAD object builder are authored in millimetres.
   The importer applies the standard mm-to-world scale so a 300 mm finial arrives
   300 mm tall in a metre-unit scene.

   ============================================================================= */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld,
    VghLantern__Env3d__ConfigAccess__RequireNumber,
    VghLantern__Env3d__ConfigAccess__RequireBoolean
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import { VghLantern__Env3d__MaterialLibrary__Component } from './VghLantern__Env3d__MaterialLibrary__.mjs';
import { VghLantern__Env3d__PickIndex__RegisterWhole } from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | GLB Component Loader Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and Cache
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Anchor Roles and Asset Field Names
    // ------------------------------------------------------------
    const ANCHOR_ROLE_FINIAL       =  'finial';                              // <-- Ridge end and apex finials
    const ANCHOR_ROLE_FINIAL_BASE  =  'finialBase';                          // <-- Base block under a finial
    const ANCHOR_ROLE_CRESTING     =  'cresting';                            // <-- Ridge cresting runs

    const ASSET_FIELD_GLB          =  'Na__Asset__Glb3d__Url';               // <-- Heavier meshes live as GLB files
    const ASSET_FIELD_HAS_3D       =  'Na__Asset__Has3d';                    // <-- Gate flag from the component index

    const FINISH_BLOCK             =  'Lantern__FinishAndGlazing__Config';   // <-- Frame finish tints placeholder components
    const FINISH_FIELD             =  'Lantern__FinishAndGlazing__Config__FrameFinish';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Loader Instance and Scene Cache
    // ------------------------------------------------------------
    let VghLantern__Env3d__ComponentLoader__Loader     =  null;              // <-- Lazily constructed GLTFLoader
    let VghLantern__Env3d__ComponentLoader__SceneCache  =  {};               // <-- assetId to loaded THREE.Group
    let VghLantern__Env3d__ComponentLoader__PendingMap  =  {};               // <-- assetId to in-flight Promise
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Asset Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Shared GLTFLoader Instance
    // ------------------------------------------------------------
    function VghLantern__Env3d__ComponentLoader__GetLoader() {
        if (!VghLantern__Env3d__ComponentLoader__Loader) {
            VghLantern__Env3d__ComponentLoader__Loader  =  new GLTFLoader();
        }
        return VghLantern__Env3d__ComponentLoader__Loader;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Component Asset Record
    // ------------------------------------------------------------
    async function VghLantern__Env3d__ComponentLoader__ReadAsset(assetId) {
        const ComponentLoader  =  window.VghLantern__AppData__ComponentIndexLoader;
        if (!ComponentLoader || !assetId) return null;

        try {
            return await ComponentLoader.VghLantern__ComponentIndexLoader__LoadAsset(assetId);
        } catch (err) {
            console.warn('[VghLantern Env3d] Component asset unavailable:', assetId, err);
            return null;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Load a GLB Scene, Deduplicating Concurrent Requests
    // ------------------------------------------------------------
    function VghLantern__Env3d__ComponentLoader__LoadGlb(assetId, glbUrl) {
        if (VghLantern__Env3d__ComponentLoader__SceneCache[assetId]) {
            return Promise.resolve(VghLantern__Env3d__ComponentLoader__SceneCache[assetId]);
        }
        if (VghLantern__Env3d__ComponentLoader__PendingMap[assetId]) {
            return VghLantern__Env3d__ComponentLoader__PendingMap[assetId];    // <-- Four finials, one fetch
        }

        const promise  =  new Promise(function(resolve) {
            VghLantern__Env3d__ComponentLoader__GetLoader().load(
                glbUrl,
                function(gltf) {
                    VghLantern__Env3d__ComponentLoader__SceneCache[assetId]  =  gltf.scene;
                    delete VghLantern__Env3d__ComponentLoader__PendingMap[assetId];
                    resolve(gltf.scene);
                },
                undefined,
                function(err) {
                    console.warn('[VghLantern Env3d] GLB load failed:', glbUrl, err);
                    delete VghLantern__Env3d__ComponentLoader__PendingMap[assetId];
                    resolve(null);                                             // <-- Resolve null so a placeholder is used
                }
            );
        });

        VghLantern__Env3d__ComponentLoader__PendingMap[assetId]  =  promise;
        return promise;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placement Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Proportional Placeholder Component
    // ------------------------------------------------------------
    // Deliberately a plain turned form rather than a box: it reads as "a finial
    // belongs here, not yet specified" without pretending to be a real product.
    function VghLantern__Env3d__ComponentLoader__BuildPlaceholder(finishName) {
        const heightWorld =  VghLantern__Env3d__ConfigAccess__MmToWorld(VghLantern__Env3d__ConfigAccess__RequireNumber('ComponentLoader', 'PlaceholderHeightMm'));
        const radiusWorld =  VghLantern__Env3d__ConfigAccess__MmToWorld(VghLantern__Env3d__ConfigAccess__RequireNumber('ComponentLoader', 'PlaceholderRadiusMm'));

        const geometry  =  new THREE.CylinderGeometry(radiusWorld * 0.35, radiusWorld, heightWorld, 12, 1);
        geometry.translate(0, heightWorld / 2, 0);                            // <-- Sit the base on the anchor point

        const mesh  =  new THREE.Mesh(geometry, VghLantern__Env3d__MaterialLibrary__Component(finishName));
        mesh.name   =  'VghLantern__Env3d__ComponentPlaceholder';
        mesh.userData.VghLantern__IsPlaceholder  =  true;                     // <-- Reported by the inspector as unmodelled
        return mesh;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clone and Scale a Cached GLB Scene
    // ------------------------------------------------------------
    function VghLantern__Env3d__ComponentLoader__InstanceFromScene(sourceScene) {
        const instance  =  sourceScene.clone(true);

        if (VghLantern__Env3d__ConfigAccess__RequireBoolean('ComponentLoader', 'ScaleGlbFromMillimetres')) {
            const scale  =  VghLantern__Env3d__ConfigAccess__MmToWorld(1);     // <-- Source authored in mm
            instance.scale.setScalar(scale);
        }

        instance.name  =  'VghLantern__Env3d__ComponentInstance';
        return instance;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Resolve the Object to Place at One Anchor
    // ------------------------------------------------------------
    // An unassigned anchor yields nothing - the user has not chosen a component
    // there. A chosen component with a missing GLB yields the placeholder, which
    // is the case worth flagging visually.
    async function VghLantern__Env3d__ComponentLoader__ResolveObject(componentId, finishName) {
        if (!componentId) return null;

        const asset  =  await VghLantern__Env3d__ComponentLoader__ReadAsset(componentId);
        const glbUrl =  asset ? asset[ASSET_FIELD_GLB] : null;
        const has3d  =  asset ? asset[ASSET_FIELD_HAS_3D] === true : false;

        if (glbUrl && has3d) {
            const scene  =  await VghLantern__Env3d__ComponentLoader__LoadGlb(componentId, glbUrl);
            if (scene) return VghLantern__Env3d__ComponentLoader__InstanceFromScene(scene);
        }

        if (!VghLantern__Env3d__ConfigAccess__RequireBoolean('ComponentLoader', 'PlaceholderOnMissingGlb')) return null;
        return VghLantern__Env3d__ComponentLoader__BuildPlaceholder(finishName);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Anchor Population
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Component Id Assigned to an Anchor Role
    // ------------------------------------------------------------
    // Finials and their bases are configured in the Finials block; cresting sits
    // with the ridge because it is a ridge-mounted run rather than a point item.
    function VghLantern__Env3d__ComponentLoader__ComponentIdForRole(lantern, anchorRole) {
        if (!lantern) return '';

        if (anchorRole === ANCHOR_ROLE_FINIAL || anchorRole === ANCHOR_ROLE_FINIAL_BASE) {
            const finialBlock  =  lantern['Lantern__Finials__Config'];
            if (!finialBlock) return '';
            if (finialBlock['Lantern__Finials__Config__Enabled'] !== true) return '';

            return anchorRole === ANCHOR_ROLE_FINIAL
                ? (finialBlock['Lantern__Finials__Config__FinialComponentId']     || '')
                : (finialBlock['Lantern__Finials__Config__FinialBaseComponentId'] || '');
        }

        if (anchorRole === ANCHOR_ROLE_CRESTING) {
            const ridgeBlock  =  lantern['Lantern__RidgeAndHips__Config'];
            if (!ridgeBlock) return '';
            if (ridgeBlock['Lantern__RidgeAndHips__Config__CrestingEnabled'] !== true) return '';

            return ridgeBlock['Lantern__RidgeAndHips__Config__CrestingComponentId'] || '';
        }

        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Lantern's Frame Finish
    // ------------------------------------------------------------
    function VghLantern__Env3d__ComponentLoader__FinishName(lantern) {
        if (!lantern) return '';

        const block  =  lantern[FINISH_BLOCK];
        return block ? (block[FINISH_FIELD] || '') : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Populate Every Finial Anchor With Its Component
    // ------------------------------------------------------------
    export async function VghLantern__Env3d__ComponentLoader__Glb__Build(targetGroup, skeleton, lantern) {
        if (!targetGroup || !skeleton) return;

        if (!VghLantern__Env3d__ConfigAccess__RequireBoolean('ComponentLoader', 'Enabled')) return;

        const anchors  =  skeleton.FinialAnchors;
        if (!Array.isArray(anchors) || anchors.length === 0) return;

        const finishName  =  VghLantern__Env3d__ComponentLoader__FinishName(lantern);

        for (let i = 0; i < anchors.length; i++) {
            const anchor   =  anchors[i];
            if (!anchor || !anchor.Position) continue;

            const componentId  =  VghLantern__Env3d__ComponentLoader__ComponentIdForRole(lantern, anchor.Role);
            const object3d     =  await VghLantern__Env3d__ComponentLoader__ResolveObject(componentId, finishName);
            if (!object3d) continue;

            const world  =  VghLantern__Env3d__ConfigAccess__PointToWorld(anchor.Position);
            object3d.position.set(world.x, world.y, world.z);
            object3d.userData.VghLantern__AnchorId  =  anchor.Id;

            // A placed component is its own object rather than one of a merged set,
            // so it registers whole. The record carries what the inspector cannot
            // recover from the scene graph: which asset was asked for, and whether
            // what landed is the real model or the stand-in.
            VghLantern__Env3d__PickIndex__RegisterWhole(object3d, 'component', anchor.Role, {
                Anchor        : anchor,
                ComponentId   : componentId,
                IsPlaceholder : object3d.userData.VghLantern__IsPlaceholder === true
            });

            targetGroup.add(object3d);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear the GLB Scene Cache
    // ------------------------------------------------------------
    // Called when the component library is rebuilt during authoring, so a freshly
    // exported GLB is picked up without a page reload.
    export function VghLantern__Env3d__ComponentLoader__Glb__ClearCache() {
        VghLantern__Env3d__ComponentLoader__SceneCache  =  {};
        VghLantern__Env3d__ComponentLoader__PendingMap  =  {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
