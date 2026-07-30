/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | MATERIAL LIBRARY
   =============================================================================

   FILE       : VghLantern__Env3d__MaterialLibrary__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - MaterialLibrary
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Shared, cached materials for every 3D lantern mesh
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - One material per finish/role combination, cached and reused across every
     mesh. A lantern with 60 glazing bars uses ONE frame material, not 60.
   - Frame colour is resolved from the lantern's chosen finish in the app config
     Finish options, so the 2D preview fill and the 3D tint come from the same
     HexColor field and can never drift apart.
   - Materials issued here are flagged shared in userData, which tells the
     SceneManager not to dispose them when a group is cleared.

   ---------------------------------------------------------------------------

   MATERIAL ROLES:
       frame        all structural members: kerb, eaves, ridge, hip, bars
       glazing      translucent glass faces
       kerb         kerb and base, usually a slightly different tone to frame
       component    fallback for GLB components with no embedded material
       skeletonLine line-mode fallback when a profile is unavailable

   ============================================================================= */

import * as THREE from 'three';

import { VghLantern__Env3d__ConfigAccess__Section } from './VghLantern__Env3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | 3D Material Library Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and Cache
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Role Keys and Cache Store
    // ------------------------------------------------------------
    const ROLE_FRAME          =  'frame';                                    // <-- All structural members
    const ROLE_GLAZING        =  'glazing';                                  // <-- Translucent glass faces
    const ROLE_KERB           =  'kerb';                                     // <-- Kerb and base upstand
    const ROLE_COMPONENT      =  'component';                                // <-- GLB fallback material
    const ROLE_SKELETON_LINE  =  'skeletonLine';                             // <-- Line-mode member fallback

    const FINISH_CONFIG_KEY   =  'VghLantern__Finish__Options__Config';      // <-- Palette lives in the app config SSOT
    const FINISH_LIST_KEY     =  'VghLantern__Finish__Options__Config__AvailableFinishes';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Material Cache Keyed by Role and Colour
    // ------------------------------------------------------------
    let VghLantern__Env3d__MaterialLibrary__Cache  =  {};                    // <-- 'role|#rrggbb' to THREE.Material
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Finish Colour Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve a Finish Name to Its Hex Colour
    // ------------------------------------------------------------
    // The palette is app config, never a local copy. An unknown or empty finish
    // name falls back to the neutral whitecard frame colour.
    export function VghLantern__Env3d__MaterialLibrary__FinishColour(finishName) {
        const materialsConfig  =  VghLantern__Env3d__ConfigAccess__Section('Materials');
        const fallback         =  materialsConfig.FrameColourFallback || '#f2efe9';

        if (!finishName) return fallback;

        const StateManager  =  window.VghLantern__AppCore__StateManager;
        const appConfig     =  StateManager ? StateManager.VghLantern__StateManager__GetAppConfig() : null;
        const finishBlock   =  appConfig ? appConfig[FINISH_CONFIG_KEY] : null;
        const finishList    =  finishBlock ? finishBlock[FINISH_LIST_KEY] : null;

        if (!Array.isArray(finishList)) return fallback;

        for (let i = 0; i < finishList.length; i++) {
            if (finishList[i] && finishList[i].Name === finishName) {
                return finishList[i].HexColor || fallback;
            }
        }
        return fallback;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Material for a Role at a Colour
    // ------------------------------------------------------------
    function VghLantern__Env3d__MaterialLibrary__Build(roleKey, hexColour) {
        const config  =  VghLantern__Env3d__ConfigAccess__Section('Materials');
        const colour  =  new THREE.Color(hexColour);

        let material;

        if (roleKey === ROLE_GLAZING) {
            material  =  new THREE.MeshStandardMaterial({
                color        : new THREE.Color(config.GlazingColour || '#a8c8d8'),
                transparent  : true,
                opacity      : Number(config.GlazingOpacity) || 0.22,
                roughness    : Number(config.GlazingRoughness) || 0.08,
                metalness    : 0,
                depthWrite   : false,                                        // <-- Stops glass panes z-fighting each other
                side         : config.GlazingDoubleSided === false ? THREE.FrontSide : THREE.DoubleSide
            });

        } else if (roleKey === ROLE_SKELETON_LINE) {
            material  =  new THREE.LineBasicMaterial({
                color : new THREE.Color(config.SkeletonLineColour || '#172b3a')
            });

        } else {
            material  =  new THREE.MeshStandardMaterial({
                color     : colour,
                roughness : Number(config.FrameRoughness) || 0.58,
                metalness : Number(config.FrameMetalness) || 0.05
            });
        }

        material.name                    =  'VghLantern__Env3d__Material__' + roleKey;
        material.userData.VghLantern__Shared  =  true;                        // <-- SceneManager must not dispose this on clear
        return material;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Cached Material for a Role and Finish
    // ------------------------------------------------------------
    export function VghLantern__Env3d__MaterialLibrary__Get(roleKey, finishName) {
        let hexColour;

        if (roleKey === ROLE_KERB) {
            const config  =  VghLantern__Env3d__ConfigAccess__Section('Materials');
            hexColour     =  config.KerbColour || '#d9d5cf';
        } else if (roleKey === ROLE_GLAZING || roleKey === ROLE_SKELETON_LINE) {
            hexColour     =  'role-fixed';                                    // <-- Colour comes from config, not the finish
        } else {
            hexColour     =  VghLantern__Env3d__MaterialLibrary__FinishColour(finishName);
        }

        const cacheKey  =  roleKey + '|' + hexColour;
        if (VghLantern__Env3d__MaterialLibrary__Cache[cacheKey]) {
            return VghLantern__Env3d__MaterialLibrary__Cache[cacheKey];
        }

        const material  =  VghLantern__Env3d__MaterialLibrary__Build(roleKey, hexColour);
        VghLantern__Env3d__MaterialLibrary__Cache[cacheKey]  =  material;
        return material;
    }
    // ------------------------------------------------------------


    // FUNCTION | Convenience Accessors for the Standard Roles
    // ------------------------------------------------------------
    export function VghLantern__Env3d__MaterialLibrary__Frame(finishName) {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_FRAME, finishName);
    }

    export function VghLantern__Env3d__MaterialLibrary__Glazing() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_GLAZING, null);
    }

    export function VghLantern__Env3d__MaterialLibrary__Kerb() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_KERB, null);
    }

    export function VghLantern__Env3d__MaterialLibrary__Component(finishName) {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_COMPONENT, finishName);
    }

    export function VghLantern__Env3d__MaterialLibrary__SkeletonLine() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_SKELETON_LINE, null);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cache Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Dispose Every Cached Material
    // ------------------------------------------------------------
    // Called only on full teardown. Clearing model groups does not touch this.
    export function VghLantern__Env3d__MaterialLibrary__DisposeAll() {
        const keys  =  Object.keys(VghLantern__Env3d__MaterialLibrary__Cache);

        for (let i = 0; i < keys.length; i++) {
            const material  =  VghLantern__Env3d__MaterialLibrary__Cache[keys[i]];
            if (material && typeof material.dispose === 'function') material.dispose();
        }
        VghLantern__Env3d__MaterialLibrary__Cache  =  {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
