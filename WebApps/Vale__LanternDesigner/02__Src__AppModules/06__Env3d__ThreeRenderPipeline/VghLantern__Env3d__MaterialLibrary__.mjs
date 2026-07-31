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
       frame        all structural members: builders upstand, eaves, ridge, hip, bars
       glazing      translucent glass faces
       builders upstand         builders upstand and base, usually a slightly different tone to frame
       component    fallback for GLB components with no embedded material
       skeletonLine line-mode fallback when a profile is unavailable

   HOVER INSPECTOR ROLES:
       ghost / ghostGlazing                    the model receding behind a hover
       highlightSibling                        other instances of the hovered role
       highlightInstance / highlightGlazing    the one object under the cursor
       highlightLine                           line mode instance overlay

   These six take their colours from the HoverInspector config block, not from
   Materials, so the inspector's whole appearance is tuned from one place.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__RequireNumber,
    VghLantern__Env3d__ConfigAccess__RequireString,
    VghLantern__Env3d__ConfigAccess__RequireBoolean
} from './VghLantern__Env3d__ConfigAccess__.mjs';

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
    const ROLE_BUILDERS_UPSTAND           =  'buildersUpstand';                                     // <-- Builders Upstand and base upstand
    const ROLE_COMPONENT      =  'component';                                // <-- GLB fallback material
    const ROLE_SKELETON_LINE  =  'skeletonLine';                             // <-- Line-mode member fallback

    const FINISH_CONFIG_KEY   =  'VghLantern__Finish__Options__Config';      // <-- Palette lives in the app config SSOT
    const FINISH_LIST_KEY     =  'VghLantern__Finish__Options__Config__AvailableFinishes';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Hover Inspector Role Keys
    // ------------------------------------------------------------
    // These six carry no finish. They are the inspector's three shading tiers, and
    // their colours are read from the HoverInspector config block rather than from
    // Materials, so the whole feature is tuned from one place.
    const ROLE_GHOST              =  'ghost';                                // <-- Everything the cursor is not on
    const ROLE_GHOST_GLAZING      =  'ghostGlazing';                         // <-- Glass, faded further still
    const ROLE_HL_SIBLING         =  'highlightSibling';                     // <-- Other instances of the hovered role
    const ROLE_HL_INSTANCE        =  'highlightInstance';                    // <-- The single object under the cursor
    const ROLE_HL_GLAZING         =  'highlightGlazing';                     // <-- A hovered glazing panel
    const ROLE_HL_LINE            =  'highlightLine';                        // <-- Line mode instance overlay

    const INSPECTOR_ROLES  =  [ROLE_GHOST, ROLE_GHOST_GLAZING, ROLE_HL_SIBLING, ROLE_HL_INSTANCE, ROLE_HL_GLAZING, ROLE_HL_LINE];

    const INSPECTOR_COLOUR_FIELDS  =  {
        ghost              : 'GhostColour',
        ghostGlazing       : 'GhostGlazingColour',
        highlightSibling   : 'SiblingColour',
        highlightInstance  : 'InstanceColour',
        highlightGlazing   : 'GlazingHighlightColour',
        highlightLine      : 'InstanceColour'
    };
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
        const fallback  =  VghLantern__Env3d__ConfigAccess__RequireString('Materials', 'FrameColourFallback');

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
// REGION | Hover Inspector Material Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve an Inspector Role's Colour From Config
    // ------------------------------------------------------------
    function VghLantern__Env3d__MaterialLibrary__InspectorColour(roleKey) {
        const fieldName  =  INSPECTOR_COLOUR_FIELDS[roleKey];
        if (!fieldName) return '#cccccc';                                    // <-- Unknown role key, not a config gap

        return VghLantern__Env3d__ConfigAccess__RequireString('HoverInspector', fieldName);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build One of the Inspector's Shading Tier Materials
    // ------------------------------------------------------------
    // The ghost tier defaults to an opaque pale tone rather than a transparent one.
    // A scene with no order-independent transparency sorts translucent surfaces per
    // object, so ghosting fifty bars with real opacity makes bars behind bars flicker
    // as the camera turns. Fading by colour reads the same and stays stable. Drop
    // GhostOpacity below 1 in config if literal transparency is wanted.
    function VghLantern__Env3d__MaterialLibrary__BuildInspector(roleKey, hexColour) {
        if (roleKey === ROLE_HL_LINE) {
            return new THREE.LineBasicMaterial({ color : new THREE.Color(hexColour) });
        }

        if (roleKey === ROLE_GHOST_GLAZING || roleKey === ROLE_HL_GLAZING) {
            const opacity  =  (roleKey === ROLE_GHOST_GLAZING)
                ? VghLantern__Env3d__ConfigAccess__RequireNumber('HoverInspector', 'GhostGlazingOpacity')
                : VghLantern__Env3d__ConfigAccess__RequireNumber('HoverInspector', 'GlazingHighlightOpacity');

            return new THREE.MeshStandardMaterial({
                color       : new THREE.Color(hexColour),
                transparent : true,
                opacity     : opacity,
                roughness   : 0.08,
                metalness   : 0,
                depthWrite  : false,                                          // <-- Same rule the base glazing material follows
                side        : THREE.DoubleSide
            });
        }

        if (roleKey === ROLE_GHOST) {
            const opacity  =  VghLantern__Env3d__ConfigAccess__RequireNumber('HoverInspector', 'GhostOpacity');
            const faded    =  isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1;

            return new THREE.MeshStandardMaterial({
                color       : new THREE.Color(hexColour),
                roughness   : 0.92,                                           // <-- Flattened so the ghost tier carries no specular interest
                metalness   : 0,
                transparent : faded < 1,
                opacity     : faded
            });
        }

        if (roleKey === ROLE_HL_INSTANCE) {
            const material  =  new THREE.MeshStandardMaterial({
                color              : new THREE.Color(hexColour),
                emissive           : new THREE.Color(VghLantern__Env3d__ConfigAccess__RequireString('HoverInspector', 'InstanceEmissiveColour')),
                emissiveIntensity  : VghLantern__Env3d__ConfigAccess__RequireNumber('HoverInspector', 'InstanceEmissiveIntensity'),
                roughness          : 0.42,
                metalness          : 0.05
            });

            // The instance overlay is coincident with the merged mesh it was sliced
            // from, so it must win the depth test outright rather than by a fraction.
            material.polygonOffset        =  true;
            material.polygonOffsetFactor  =  -1;
            material.polygonOffsetUnits   =  -1;
            return material;
        }

        return new THREE.MeshStandardMaterial({
            color     : new THREE.Color(hexColour),
            roughness : 0.55,
            metalness : 0.05
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Material for a Role at a Colour
    // ------------------------------------------------------------
    function VghLantern__Env3d__MaterialLibrary__Build(roleKey, hexColour) {
        let material;

        if (INSPECTOR_ROLES.indexOf(roleKey) !== -1) {
            material  =  VghLantern__Env3d__MaterialLibrary__BuildInspector(roleKey, hexColour);

        } else if (roleKey === ROLE_GLAZING) {
            material  =  new THREE.MeshStandardMaterial({
                color        : new THREE.Color(VghLantern__Env3d__ConfigAccess__RequireString('Materials', 'GlazingColour')),
                transparent  : true,
                opacity      : VghLantern__Env3d__ConfigAccess__RequireNumber('Materials', 'GlazingOpacity'),
                roughness    : VghLantern__Env3d__ConfigAccess__RequireNumber('Materials', 'GlazingRoughness'),
                metalness    : 0,
                depthWrite   : false,                                        // <-- Stops glass panes z-fighting each other
                side         : VghLantern__Env3d__ConfigAccess__RequireBoolean('Materials', 'GlazingDoubleSided') ? THREE.DoubleSide : THREE.FrontSide
            });

        } else if (roleKey === ROLE_SKELETON_LINE) {
            material  =  new THREE.LineBasicMaterial({
                color : new THREE.Color(VghLantern__Env3d__ConfigAccess__RequireString('Materials', 'SkeletonLineColour'))
            });

        } else {
            // Only this branch consumes the finish colour; the fixed-colour roles
            // pass a sentinel string that must never reach the colour parser.
            material  =  new THREE.MeshStandardMaterial({
                color     : new THREE.Color(hexColour),
                roughness : VghLantern__Env3d__ConfigAccess__RequireNumber('Materials', 'FrameRoughness'),
                metalness : VghLantern__Env3d__ConfigAccess__RequireNumber('Materials', 'FrameMetalness')
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

        if (INSPECTOR_ROLES.indexOf(roleKey) !== -1) {
            hexColour     =  VghLantern__Env3d__MaterialLibrary__InspectorColour(roleKey);
        } else if (roleKey === ROLE_BUILDERS_UPSTAND) {
            hexColour     =  VghLantern__Env3d__ConfigAccess__RequireString('Materials', 'BuildersUpstandColour');
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

    export function VghLantern__Env3d__MaterialLibrary__BuildersUpstand() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_BUILDERS_UPSTAND, null);
    }

    export function VghLantern__Env3d__MaterialLibrary__Component(finishName) {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_COMPONENT, finishName);
    }

    export function VghLantern__Env3d__MaterialLibrary__SkeletonLine() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_SKELETON_LINE, null);
    }
    // ------------------------------------------------------------


    // FUNCTION | Accessors for the Hover Inspector Shading Tiers
    // ------------------------------------------------------------
    // Cached and shared like every other library material, so a hover swaps
    // material references and allocates nothing.
    export function VghLantern__Env3d__MaterialLibrary__Ghost() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_GHOST, null);
    }

    export function VghLantern__Env3d__MaterialLibrary__GhostGlazing() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_GHOST_GLAZING, null);
    }

    export function VghLantern__Env3d__MaterialLibrary__HighlightSibling() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_HL_SIBLING, null);
    }

    export function VghLantern__Env3d__MaterialLibrary__HighlightInstance() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_HL_INSTANCE, null);
    }

    export function VghLantern__Env3d__MaterialLibrary__HighlightGlazing() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_HL_GLAZING, null);
    }

    export function VghLantern__Env3d__MaterialLibrary__HighlightLine() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_HL_LINE, null);
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
