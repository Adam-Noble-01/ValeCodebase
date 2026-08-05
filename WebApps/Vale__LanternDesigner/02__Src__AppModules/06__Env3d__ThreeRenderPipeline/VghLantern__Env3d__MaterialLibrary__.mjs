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
   - Every material property is read from Na__PbrMaterials__Config.json, which is
     the single source of truth for the palette and for the surface response.
     The 2D preview fill and the 3D tint come from the same HexColor field and
     can never drift apart.
   - Materials issued here are flagged shared in userData, which tells the
     SceneManager not to dispose them when a group is cleared.

   ---------------------------------------------------------------------------

   POWDER COAT VERSUS BARE METAL:
   A finish carrying ClearCoat above zero is built as a THREE.MeshPhysicalMaterial
   rather than a MeshStandardMaterial. That is what separates powder coated
   aluminium - a matt pigment layer under a thin lacquer, so low metalness with a
   distinct surface sheen - from natural lead, which is real metal and takes high
   metalness with a broken, roughened reflection instead.

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

import {
    VghLantern__Env3d__ProceduralTextures__Noise,
    VghLantern__Env3d__ProceduralTextures__DisposeAll
} from './VghLantern__Env3d__ProceduralTextures__.mjs';

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
    const ROLE_GRP            =  'grp';                                      // <-- Glass reinforced plastic: kerb and flat roof

    const FIXED_COLOUR_ROLES  =  [ROLE_GLAZING, ROLE_SKELETON_LINE, ROLE_BUILDERS_UPSTAND, ROLE_GRP];

    const PBR_CONFIG_KEY      =  'VghLantern__PbrMaterials__Config';         // <-- Palette and surface response SSOT
    const PBR_FINISHES_KEY    =  'VghLantern__PbrMaterials__Config__Finishes';
    const PBR_DEFAULTS_KEY    =  'VghLantern__PbrMaterials__Config__FinishDefaults';
    const PBR_ROLES_KEY       =  'VghLantern__PbrMaterials__Config__RoleMaterials';
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

    // HELPER FUNCTION | Read the PBR Materials Config Root
    // ------------------------------------------------------------
    function VghLantern__Env3d__MaterialLibrary__PbrConfig() {
        const StateManager  =  window.VghLantern__AppCore__StateManager;
        const appConfig     =  StateManager ? StateManager.VghLantern__StateManager__GetAppConfig() : null;
        return appConfig ? (appConfig[PBR_CONFIG_KEY] || null) : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Named Role Material Block
    // ------------------------------------------------------------
    function VghLantern__Env3d__MaterialLibrary__RoleBlock(roleName) {
        const config  =  VghLantern__Env3d__MaterialLibrary__PbrConfig();
        const roles   =  config ? config[PBR_ROLES_KEY] : null;
        return (roles && roles[roleName]) ? roles[roleName] : {};
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Finish Name to Its Full PBR Profile
    // ------------------------------------------------------------
    // The palette is config, never a local copy. An unknown or empty finish name
    // falls back to the documented neutral coated aluminium, which deliberately
    // matches no real product so a mis-stored finish is visible rather than
    // silently plausible.
    export function VghLantern__Env3d__MaterialLibrary__FinishProfile(finishName) {
        const config    =  VghLantern__Env3d__MaterialLibrary__PbrConfig();
        const defaults  =  (config && config[PBR_DEFAULTS_KEY]) || {};

        const fallbackProfile  =  {
            HexColor           : defaults.FallbackHexColor  || '#8d9095',
            RenderAlbedoHex    : defaults.FallbackHexColor  || '#8d9095',
            Roughness          : (typeof defaults.FallbackRoughness === 'number') ? defaults.FallbackRoughness : 0.5,
            Metalness          : (typeof defaults.FallbackMetalness === 'number') ? defaults.FallbackMetalness : 0.08,
            ClearCoat          : 0,
            ClearCoatRoughness : 0,
            EnvMapIntensity    : 1
        };

        if (!finishName || !config) return fallbackProfile;

        const finishList  =  config[PBR_FINISHES_KEY];
        if (!Array.isArray(finishList)) return fallbackProfile;

        for (let i = 0; i < finishList.length; i++) {
            const finish  =  finishList[i];
            if (!finish || finish.Name !== finishName) continue;

            return {
                HexColor           : finish.HexColor || fallbackProfile.HexColor,
                // The colour the 3D surface is actually built with. A finish may
                // declare a render albedo distinct from its swatch, because a
                // paint chip photographed under studio light is not the same
                // quantity as diffuse albedo - the gap is widest on dark colours.
                // The swatch above still drives the 2D fill and the schedule.
                RenderAlbedoHex    : finish.RenderAlbedoHex || finish.HexColor || fallbackProfile.HexColor,
                Roughness          : (typeof finish.Roughness === 'number') ? finish.Roughness : fallbackProfile.Roughness,
                Metalness          : (typeof finish.Metalness === 'number') ? finish.Metalness : fallbackProfile.Metalness,
                ClearCoat          : (typeof finish.ClearCoat === 'number') ? finish.ClearCoat : 0,
                ClearCoatRoughness : (typeof finish.ClearCoatRoughness === 'number') ? finish.ClearCoatRoughness : 0,
                EnvMapIntensity    : (typeof finish.EnvMapIntensity === 'number') ? finish.EnvMapIntensity : 1
            };
        }

        return fallbackProfile;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Finish Name to Its Hex Colour
    // ------------------------------------------------------------
    // Kept as its own accessor because the 2D preview and the specification
    // schedule want the colour without the surface response.
    export function VghLantern__Env3d__MaterialLibrary__FinishColour(finishName) {
        return VghLantern__Env3d__MaterialLibrary__FinishProfile(finishName).HexColor;
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

    // HELPER FUNCTION | Build a Finish-Driven Surface (Frame and Components)
    // ------------------------------------------------------------
    // ClearCoat above zero promotes the material to MeshPhysicalMaterial, which
    // is the difference between a powder coated surface and a bare metal one.
    function VghLantern__Env3d__MaterialLibrary__BuildFinishSurface(profile) {
        const common  =  {
            color           : new THREE.Color(profile.RenderAlbedoHex || profile.HexColor),
            roughness       : profile.Roughness,
            metalness       : profile.Metalness,
            envMapIntensity : profile.EnvMapIntensity
        };

        if (profile.ClearCoat > 0) {
            return new THREE.MeshPhysicalMaterial(Object.assign({}, common, {
                clearcoat          : profile.ClearCoat,
                clearcoatRoughness : profile.ClearCoatRoughness
            }));
        }

        return new THREE.MeshStandardMaterial(common);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Glazing Surface
    // ------------------------------------------------------------
    // Ported from ValeVision3D MaxEngine so the two apps render glass the same
    // way. The move that matters is BrightnessMultiplier: the base colour is
    // taken almost to black, which kills the diffuse term and leaves the
    // environment reflection as the only thing you see. A pane painted as flat
    // translucent blue reads as tinted acrylic however the opacity is tuned; a
    // pane that is black plus a sharp reflection reads as glass.
    function VghLantern__Env3d__MaterialLibrary__BuildGlazing() {
        const glazing  =  VghLantern__Env3d__MaterialLibrary__RoleBlock('Glazing');

        const material  =  new THREE.MeshStandardMaterial({
            color        : new THREE.Color(glazing.HexColor || '#e6f0ff'),
            transparent  : true,
            opacity      : (typeof glazing.Opacity === 'number')   ? glazing.Opacity   : 0.2,
            roughness    : (typeof glazing.Roughness === 'number') ? glazing.Roughness : 0.03,
            metalness    : (typeof glazing.Metalness === 'number') ? glazing.Metalness : 0,
            depthWrite   : glazing.DepthWrite === true,                      // <-- Off by default: stops panes z-fighting each other
            side         : glazing.DoubleSided === false ? THREE.FrontSide : THREE.DoubleSide
        });

        if (typeof glazing.BrightnessMultiplier === 'number') {
            material.color.multiplyScalar(glazing.BrightnessMultiplier);
        }

        material.envMapIntensity  =  (typeof glazing.EnvMapIntensity === 'number') ? glazing.EnvMapIntensity : 1.0;
        return material;
    }
    // ------------------------------------------------------------


    // FUNCTION | Compensate Glazing Reflection for the Scene Environment Dial
    // ------------------------------------------------------------
    // Glass inherits scene.environment rather than carrying its own map, because
    // the glazing material is shared across every 3D surface while each surface
    // has a radiance map belonging to its own GL context - one material cannot
    // hold the right texture for all of them.
    //
    // The cost of inheriting is that scene.environmentIntensity multiplies
    // through, so dimming the frame would dim the reflection in the glass with
    // it. Dividing that factor back out here keeps the configured
    // EnvMapIntensity meaning what it says - the effective reflection strength
    // of the glass - and leaves frame and glass independently tunable.
    export function VghLantern__Env3d__MaterialLibrary__ApplyEnvironmentToGlazing(sceneEnvironmentIntensity) {
        const glazing  =  VghLantern__Env3d__MaterialLibrary__Get(ROLE_GLAZING, null);
        if (!glazing) return;

        const block      =  VghLantern__Env3d__MaterialLibrary__RoleBlock('Glazing');
        const configured =  (typeof block.EnvMapIntensity === 'number') ? block.EnvMapIntensity : 1.0;
        const sceneScale =  (typeof sceneEnvironmentIntensity === 'number' && sceneEnvironmentIntensity > 0.001)
            ? sceneEnvironmentIntensity
            : 1.0;

        glazing.envMapIntensity  =  configured / sceneScale;
        glazing.needsUpdate      =  true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the GRP Surface for the Kerb and Flat Roof Areas
    // ------------------------------------------------------------
    // GRP is laid wet over ply and rolled out by hand, so it is never optically
    // flat. Left untextured it renders as a perfect prism and reads as CAD
    // rather than as a built kerb, which undersells the one part of the model
    // that is meant to look like site work. A procedural noise bump map breaks
    // the highlight up without shipping an image file.
    function VghLantern__Env3d__MaterialLibrary__BuildGrp() {
        const grp  =  VghLantern__Env3d__MaterialLibrary__RoleBlock('Grp');

        const material  =  new THREE.MeshStandardMaterial({
            color           : new THREE.Color(grp.HexColor || '#c3c1ba'),
            roughness       : (typeof grp.Roughness === 'number') ? grp.Roughness : 0.58,
            metalness       : (typeof grp.Metalness === 'number') ? grp.Metalness : 0,
            envMapIntensity : (typeof grp.EnvMapIntensity === 'number') ? grp.EnvMapIntensity : 0.75
        });

        if (grp.BumpEnabled === false) return material;

        try {
            const noise  =  VghLantern__Env3d__ProceduralTextures__Noise({
                PixelSize   : grp.NoisePixelSize,
                BaseLattice : grp.NoiseBaseLattice,
                Octaves     : grp.NoiseOctaves,
                Persistence : grp.NoisePersistence,
                Contrast    : grp.NoiseContrast,
                Seed        : grp.NoiseSeed
            });

            // The mesh is an ExtrudeGeometry, whose UVs are in world units, so
            // repeat is tiles per metre and the grain holds its real size on a
            // 900 mm lantern and a 5 m one alike.
            const repeat  =  (typeof grp.BumpRepeat === 'number') ? grp.BumpRepeat : 26;
            noise.repeat.set(repeat, repeat);

            material.bumpMap    =  noise;
            material.bumpScale  =  (typeof grp.BumpScale === 'number') ? grp.BumpScale : 0.0022;

        } catch (error) {
            // A canvas that will not allocate is a reason to render the kerb
            // plain, never a reason to fail the whole scene build.
            console.warn('[VghLantern Env3d] GRP noise texture could not be generated - kerb renders untextured:', error);
        }

        return material;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Material for a Role
    // ------------------------------------------------------------
    function VghLantern__Env3d__MaterialLibrary__Build(roleKey, finishName) {
        let material;

        if (INSPECTOR_ROLES.indexOf(roleKey) !== -1) {
            material  =  VghLantern__Env3d__MaterialLibrary__BuildInspector(
                roleKey, VghLantern__Env3d__MaterialLibrary__InspectorColour(roleKey));

        } else if (roleKey === ROLE_GLAZING) {
            material  =  VghLantern__Env3d__MaterialLibrary__BuildGlazing();

        } else if (roleKey === ROLE_SKELETON_LINE) {
            const line  =  VghLantern__Env3d__MaterialLibrary__RoleBlock('SkeletonLine');
            material  =  new THREE.LineBasicMaterial({
                color : new THREE.Color(line.HexColor || '#172b3a')
            });

        } else if (roleKey === ROLE_GRP) {
            material  =  VghLantern__Env3d__MaterialLibrary__BuildGrp();

        } else if (roleKey === ROLE_BUILDERS_UPSTAND) {
            // The kerb declares which material it is finished in rather than
            // carrying a colour, so changing the whole kerb finish is one config
            // key rather than a colour edit in two places.
            const upstand  =  VghLantern__Env3d__MaterialLibrary__RoleBlock('BuildersUpstand');
            if (upstand.UsesMaterial === 'Grp') return VghLantern__Env3d__MaterialLibrary__Get(ROLE_GRP, null);

            material  =  new THREE.MeshStandardMaterial({
                color     : new THREE.Color(upstand.HexColor || '#d9d5cf'),
                roughness : (typeof upstand.Roughness === 'number') ? upstand.Roughness : 0.72,
                metalness : (typeof upstand.Metalness === 'number') ? upstand.Metalness : 0
            });

        } else {
            // Frame and library components both wear the lantern's chosen finish,
            // because a Vale component is supplied coated to match its lantern.
            material  =  VghLantern__Env3d__MaterialLibrary__BuildFinishSurface(
                VghLantern__Env3d__MaterialLibrary__FinishProfile(finishName));
        }

        material.name                         =  'VghLantern__Env3d__Material__' + roleKey;
        material.userData.VghLantern__Shared  =  true;                        // <-- SceneManager must not dispose this on clear
        return material;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Cached Material for a Role and Finish
    // ------------------------------------------------------------
    // The cache key carries the finish NAME rather than its colour, because two
    // finishes can share a hex value and still differ in roughness, metalness or
    // clear coat - keying on colour alone would hand the second one the first
    // one's surface.
    export function VghLantern__Env3d__MaterialLibrary__Get(roleKey, finishName) {
        const isFinishDriven  =  INSPECTOR_ROLES.indexOf(roleKey) === -1
                              && FIXED_COLOUR_ROLES.indexOf(roleKey) === -1;

        const cacheKey  =  roleKey + '|' + (isFinishDriven ? (finishName || 'default') : 'role-fixed');

        if (VghLantern__Env3d__MaterialLibrary__Cache[cacheKey]) {
            return VghLantern__Env3d__MaterialLibrary__Cache[cacheKey];
        }

        const material  =  VghLantern__Env3d__MaterialLibrary__Build(roleKey, finishName);
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

    // Glass reinforced plastic. Exposed in its own right as well as through the
    // kerb, so a flat roof area added later asks for it directly rather than
    // borrowing the kerb's accessor and inheriting a name that stops being true.
    export function VghLantern__Env3d__MaterialLibrary__Grp() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_GRP, null);
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

        // The generated bump maps are only ever held by materials issued here,
        // so their lifetime is this cache's lifetime.
        VghLantern__Env3d__ProceduralTextures__DisposeAll();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
