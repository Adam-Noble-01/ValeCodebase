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
   - Places discrete components - finials, finial bases, cresting - at the anchor
     points published by the SkeletonSolver: the two ridge ends on a hipped or
     gabled roof, or the single apex on a pyramid.
   - The 3D counterpart of Env2d's FinialRenderer. Both read the same component
     library entry, and both place a component by putting its LOCAL ORIGIN on the
     anchor, because every asset is authored about its origin point group.

   ---------------------------------------------------------------------------

   GEOMETRY SOURCE ORDER:
   1. Na__Asset__Mesh3D    inline indexed mesh from the unified export. Preferred:
                           it arrives with the same file the 2D views came from,
                           so the two environments cannot drift apart.
   2. Na__Asset__Glb3D__Url an external GLB, for assets not yet re-exported.
   3. Placeholder          a plain turned form, so a chosen-but-unmodelled
                           component reads as "not specified yet" rather than as
                           an empty ridge end.

   ANCHOR ROLE VERSUS COMPONENT ROLE:
   The solver names an anchor by WHERE it is on the roof - 'ridgeEnd', 'apex'.
   The lantern names a component by WHAT goes there - 'finial', 'finialBase',
   'cresting'. Those two vocabularies are joined by ANCHOR_ROLE_TO_COMPONENT_ROLE
   below. They were previously compared directly, which silently matched nothing
   and left every ridge end empty in the 3D view.

   SCALE CONVENTION:
   Both sources are authored in millimetres. Inline meshes are converted as they
   are built; GLBs take the standard mm-to-world scale on import, so a 300 mm
   finial arrives 300 mm tall in a metre-unit scene.

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

import {
    VghLantern__Env3d__MeshJson__BuildMesh,
    VghLantern__Env3d__MeshJson__ClearCache
} from './VghLantern__Env3d__ComponentLoader__MeshJson__.mjs';

// =============================================================================
// REGION | GLB Component Loader Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and Cache
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Anchor Roles and Asset Field Names
    // ------------------------------------------------------------
    const COMPONENT_ROLE_FINIAL       =  'finial';                           // <-- Ridge end and apex finials
    const COMPONENT_ROLE_FINIAL_BASE  =  'finialBase';                       // <-- Base block under a finial
    const COMPONENT_ROLE_CRESTING     =  'cresting';                         // <-- Ridge cresting runs

    // The solver's anchor vocabulary mapped onto the lantern's component
    // vocabulary. Both ridge ends and a pyramid apex take a finial.
    const ANCHOR_ROLE_TO_COMPONENT_ROLE  =  {
        'ridgeEnd'   : COMPONENT_ROLE_FINIAL,
        'apex'       : COMPONENT_ROLE_FINIAL,
        'finial'     : COMPONENT_ROLE_FINIAL,
        'finialBase' : COMPONENT_ROLE_FINIAL_BASE,
        'cresting'   : COMPONENT_ROLE_CRESTING
    };

    const ANCHOR_ROLE_RIDGE_END    =  'ridgeEnd';
    const ANCHOR_ROLE_APEX         =  'apex';

    const ASSET_FIELD_GLB          =  'Na__Asset__Glb3D__Url';               // <-- Heavier meshes live as GLB files
    const ASSET_FIELD_GLB_LEGACY   =  'Na__Asset__Glb3d__Url';               // <-- Earlier files used this casing
    const ASSET_FIELD_MESH_3D      =  'Na__Asset__Mesh3D';                   // <-- Inline mesh from the unified export
    const ASSET_FIELD_HAS_3D       =  'Na__Asset__Has3d';                    // <-- Gate flag from the component index

    const FINIALS_BLOCK            =  'Lantern__Finials__Config';
    const FIELD_AT_RIDGE_ENDS      =  'Lantern__Finials__Config__PlaceAtRidgeEnds';
    const FIELD_AT_APEX            =  'Lantern__Finials__Config__PlaceAtApex';

    const FINISH_BLOCK             =  'Lantern__FinishAndGlazing__Config';   // <-- Frame finish tints every component
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
    // there. A chosen component with no usable geometry yields the placeholder,
    // which is the case worth flagging visually.
    async function VghLantern__Env3d__ComponentLoader__ResolveObject(componentId, finishName) {
        if (!componentId) return null;

        const asset  =  await VghLantern__Env3d__ComponentLoader__ReadAsset(componentId);

        // 1. Inline mesh from the unified export - the same file the 2D views
        //    are drawn from, so the two environments cannot disagree.
        const meshBlock  =  asset ? asset[ASSET_FIELD_MESH_3D] : null;
        if (meshBlock) {
            const mesh  =  VghLantern__Env3d__MeshJson__BuildMesh(
                componentId, meshBlock, VghLantern__Env3d__MaterialLibrary__Component(finishName));
            if (mesh) return mesh;
        }

        // 2. External GLB, for assets not yet re-exported to the unified schema.
        const glbUrl  =  asset ? (asset[ASSET_FIELD_GLB] || asset[ASSET_FIELD_GLB_LEGACY]) : null;
        const has3d   =  asset ? asset[ASSET_FIELD_HAS_3D] === true : false;

        if (glbUrl && has3d) {
            const scene  =  await VghLantern__Env3d__ComponentLoader__LoadGlb(componentId, glbUrl);
            if (scene) return VghLantern__Env3d__ComponentLoader__InstanceFromScene(scene);
        }

        // 3. Stand-in.
        if (!VghLantern__Env3d__ConfigAccess__RequireBoolean('ComponentLoader', 'PlaceholderOnMissingGlb')) return null;
        return VghLantern__Env3d__ComponentLoader__BuildPlaceholder(finishName);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Anchor Population
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Component Id Assigned to an Anchor
    // ------------------------------------------------------------
    // Translates the solver's anchor role into the lantern's component role
    // first, then reads whichever config block owns that role. Finials and their
    // bases are configured in the Finials block; cresting sits with the ridge
    // because it is a ridge-mounted run rather than a point item.
    function VghLantern__Env3d__ComponentLoader__ComponentIdForRole(lantern, anchorRole) {
        if (!lantern) return '';

        const componentRole  =  ANCHOR_ROLE_TO_COMPONENT_ROLE[anchorRole];
        if (!componentRole) return '';

        if (componentRole === COMPONENT_ROLE_FINIAL || componentRole === COMPONENT_ROLE_FINIAL_BASE) {
            const finialBlock  =  lantern[FINIALS_BLOCK];
            if (!finialBlock) return '';
            if (finialBlock['Lantern__Finials__Config__Enabled'] !== true) return '';

            return componentRole === COMPONENT_ROLE_FINIAL
                ? (finialBlock['Lantern__Finials__Config__FinialComponentId']     || '')
                : (finialBlock['Lantern__Finials__Config__FinialBaseComponentId'] || '');
        }

        if (componentRole === COMPONENT_ROLE_CRESTING) {
            const ridgeBlock  =  lantern['Lantern__RidgeAndHips__Config'];
            if (!ridgeBlock) return '';
            if (ridgeBlock['Lantern__RidgeAndHips__Config__CrestingEnabled'] !== true) return '';

            return ridgeBlock['Lantern__RidgeAndHips__Config__CrestingComponentId'] || '';
        }

        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether the User Wants a Component at This Anchor
    // ------------------------------------------------------------
    // Place at Ridge Ends and Place at Apex are user choices, so an anchor the
    // solver published is not automatically an anchor that gets a component.
    function VghLantern__Env3d__ComponentLoader__AnchorWanted(lantern, anchor) {
        const finialBlock  =  lantern ? lantern[FINIALS_BLOCK] : null;
        if (!finialBlock) return true;

        if (anchor.Role === ANCHOR_ROLE_RIDGE_END) return finialBlock[FIELD_AT_RIDGE_ENDS] !== false;
        if (anchor.Role === ANCHOR_ROLE_APEX)      return finialBlock[FIELD_AT_APEX]       !== false;

        return true;
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
            if (!VghLantern__Env3d__ComponentLoader__AnchorWanted(lantern, anchor)) continue;

            const componentId  =  VghLantern__Env3d__ComponentLoader__ComponentIdForRole(lantern, anchor.Role);
            const object3d     =  await VghLantern__Env3d__ComponentLoader__ResolveObject(componentId, finishName);
            if (!object3d) continue;

            // Local origin onto the anchor, and nothing else. The asset was
            // authored about its origin point in SketchUp, so any component that
            // reaches below its origin - a spigot buried in the ridge - lands
            // correctly without a per-asset seating offset.
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


    // FUNCTION | Clear Every Component Geometry Cache
    // ------------------------------------------------------------
    // Called when the component library is rebuilt during authoring, so a freshly
    // exported GLB is picked up without a page reload.
    // All three caches go together - GLB scenes, built mesh geometry, and the
    // asset JSON bodies - because a half-cleared set would rebuild new geometry
    // from a stale file.
    export function VghLantern__Env3d__ComponentLoader__Glb__ClearCache() {
        VghLantern__Env3d__ComponentLoader__SceneCache  =  {};
        VghLantern__Env3d__ComponentLoader__PendingMap  =  {};

        VghLantern__Env3d__MeshJson__ClearCache();

        const AssetCache  =  window.VghLantern__AppData__ComponentAssetCache;
        if (AssetCache) AssetCache.VghLantern__ComponentAssetCache__ClearAll();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
