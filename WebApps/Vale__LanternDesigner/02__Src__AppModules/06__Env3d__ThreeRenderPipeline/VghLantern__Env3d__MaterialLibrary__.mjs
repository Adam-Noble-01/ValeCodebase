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
   distinct surface sheen - from bare mill aluminium, which is real metal and takes
   high metalness with a broken, roughened reflection instead.

   Patination oiled lead uses that same promotion for the opposite reason. Its
   clear coat is not a lacquer over pigment but an oil film over genuine metal, so
   it carries a high metalness AND a coat: two real layers, modelled as two.

   ---------------------------------------------------------------------------

   MATERIAL ROLES:
       frame            all structural members: base frame, eaves, ridge, hip
       glazing          translucent glass faces
       buildersUpstand  builders upstand and base, usually a slightly different tone to frame
       component        library components, coated to match the frame
       skeletonLine     line-mode fallback when a profile is unavailable
       grp              glass reinforced plastic: the kerb and any flat roof
       millAluminium    the concealed glaze bar core, never coated
       glazeBarCap      the glaze bar cap, from the cap finish palette
       glazeBarTrim     the glaze bar trim, from the joinery finish palette

   THREE PALETTES, NOT ONE:
   Three elements are specified separately and each reads its own array out of
   Na__PbrMaterials__Config.json - the frame from Finishes, the glaze bar cap from
   CapFinishes and the glaze bar trim from JoineryFinishes. ROLE_PALETTE_KEY is
   the whole of that mapping; everything else about resolving a finish is shared.

   The cap does not follow the frame. The frame is painted joinery and the outside
   of the roof carries lead flashing, so the frame colour has no bearing on what
   the capping above it is finished in.

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
    VghLantern__Env3d__ProceduralTextures__BrushedGrain,
    VghLantern__Env3d__ProceduralTextures__WoodGrain,
    VghLantern__Env3d__ProceduralTextures__PatinatedLead,
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
    const ROLE_MILL_ALUMINIUM =  'millAluminium';                            // <-- Bare extrusion: the concealed glaze bar core
    const ROLE_LEAD_FLASHING  =  'leadFlashing';                             // <-- Patination oiled leadwork on the base frame
    const ROLE_SAPELE_HARDWOOD =  'sapeleHardwood';                          // <-- The head beam: bare sealed hardwood, never the frame paint

    const ROLE_BAR_CAP        =  'glazeBarCap';                              // <-- Glaze bar cap, finished from its own palette
    const ROLE_BAR_TRIM       =  'glazeBarTrim';                             // <-- Glaze bar trim, finished from the joinery palette

    // These roles are made of what they are made of. A concealed core, a sheet of
    // glass or a GRP kerb has no finish to choose, so asking for one of them with
    // a finish name returns the same material either way.
    //
    // The two glaze bar roles are NOT in this list. They used to be - the cap
    // followed the frame and the trim was always bare douglas fir - but both are
    // now specified in their own right, so each caches per finish name like the
    // frame does. Bare douglas fir did not disappear with the fixed trim: it is
    // the Timber role BLOCK, reached through the joinery palette's Natural Douglas
    // Fir entry, which delegates to it rather than restating its numbers.
    const FIXED_COLOUR_ROLES  =  [ROLE_GLAZING, ROLE_SKELETON_LINE, ROLE_BUILDERS_UPSTAND, ROLE_GRP, ROLE_MILL_ALUMINIUM, ROLE_LEAD_FLASHING, ROLE_SAPELE_HARDWOOD];

    const PBR_CONFIG_KEY      =  'VghLantern__PbrMaterials__Config';         // <-- Palette and surface response SSOT
    const PBR_FINISHES_KEY    =  'VghLantern__PbrMaterials__Config__Finishes';
    const PBR_CAP_KEY         =  'VghLantern__PbrMaterials__Config__CapFinishes';
    const PBR_JOINERY_KEY     =  'VghLantern__PbrMaterials__Config__JoineryFinishes';
    const PBR_DEFAULTS_KEY    =  'VghLantern__PbrMaterials__Config__FinishDefaults';
    const PBR_ROLES_KEY       =  'VghLantern__PbrMaterials__Config__RoleMaterials';

    // Which palette each finish-driven role picks its named finish out of. The
    // frame and the library components share one because a Vale component is
    // supplied coated to match the lantern it belongs to.
    const ROLE_PALETTE_KEY    =  {
        frame        : PBR_FINISHES_KEY,
        component    : PBR_FINISHES_KEY,
        glazeBarCap  : PBR_CAP_KEY,
        glazeBarTrim : PBR_JOINERY_KEY
    };
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


    // HELPER FUNCTION | The Profile Used When a Finish Name Resolves to Nothing
    // ------------------------------------------------------------
    // The documented neutral coated aluminium, which deliberately matches no real
    // product so a mis-stored finish is visible rather than silently plausible.
    function VghLantern__Env3d__MaterialLibrary__FallbackProfile() {
        const config    =  VghLantern__Env3d__MaterialLibrary__PbrConfig();
        const defaults  =  (config && config[PBR_DEFAULTS_KEY]) || {};

        return {
            HexColor           : defaults.FallbackHexColor  || '#8d9095',
            RenderAlbedoHex    : defaults.FallbackHexColor  || '#8d9095',
            Roughness          : (typeof defaults.FallbackRoughness === 'number') ? defaults.FallbackRoughness : 0.5,
            Metalness          : (typeof defaults.FallbackMetalness === 'number') ? defaults.FallbackMetalness : 0.08,
            ClearCoat          : 0,
            ClearCoatRoughness : 0,
            EnvMapIntensity    : 1,
            FlatShading        : false,
            UsesMaterial       : ''
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Finish Name Against a Named Palette
    // ------------------------------------------------------------
    // The palettes are config, never a local copy. paletteKey names which of the
    // three arrays to search - the frame finishes, the glaze bar cap finishes or
    // the interior joinery finishes - so one lookup serves all three and a fourth
    // palette is a constant rather than another copy of this function.
    //
    // An entry may delegate with UsesMaterial instead of carrying its own numbers,
    // which is how Natural Douglas Fir points at the Timber role block rather than
    // restating it. The delegation is passed back rather than followed here,
    // because it names a ROLE block and this function only knows about palettes.
    export function VghLantern__Env3d__MaterialLibrary__PaletteProfile(paletteKey, finishName) {
        const config    =  VghLantern__Env3d__MaterialLibrary__PbrConfig();
        const fallback  =  VghLantern__Env3d__MaterialLibrary__FallbackProfile();

        if (!finishName || !config) return fallback;

        const finishList  =  config[paletteKey];
        if (!Array.isArray(finishList)) return fallback;

        for (let i = 0; i < finishList.length; i++) {
            const finish  =  finishList[i];
            if (!finish || finish.Name !== finishName) continue;

            return {
                HexColor           : finish.HexColor || fallback.HexColor,
                // The colour the 3D surface is actually built with. A finish may
                // declare a render albedo distinct from its swatch, because a
                // paint chip photographed under studio light is not the same
                // quantity as diffuse albedo - the gap is widest on dark colours.
                // The swatch above still drives the 2D fill and the schedule.
                RenderAlbedoHex    : finish.RenderAlbedoHex || finish.HexColor || fallback.HexColor,
                Roughness          : (typeof finish.Roughness === 'number') ? finish.Roughness : fallback.Roughness,
                Metalness          : (typeof finish.Metalness === 'number') ? finish.Metalness : fallback.Metalness,
                ClearCoat          : (typeof finish.ClearCoat === 'number') ? finish.ClearCoat : 0,
                ClearCoatRoughness : (typeof finish.ClearCoatRoughness === 'number') ? finish.ClearCoatRoughness : 0,
                EnvMapIntensity    : (typeof finish.EnvMapIntensity === 'number') ? finish.EnvMapIntensity : 1,
                FlatShading        : finish.FlatShading === true,
                UsesMaterial       : finish.UsesMaterial || ''
            };
        }

        return fallback;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Frame Finish Name to Its Full PBR Profile
    // ------------------------------------------------------------
    // The frame palette specifically. Kept as its own named entry point because it
    // is what almost every caller wants and because it predates the other two.
    export function VghLantern__Env3d__MaterialLibrary__FinishProfile(finishName) {
        return VghLantern__Env3d__MaterialLibrary__PaletteProfile(PBR_FINISHES_KEY, finishName);
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

    // HELPER FUNCTION | Build a Finish-Driven Surface (Frame, Components, Bar Parts)
    // ------------------------------------------------------------
    // ClearCoat above zero promotes the material to MeshPhysicalMaterial, which is
    // the difference between a coated surface and a bare metal one. It carries a
    // second job on the joinery paints: at around 0.06 with a high clearcoat
    // roughness it is the soft broad sheen of an eggshell rather than the thin
    // lacquer of a powder coat, which is the same mechanism turned right down.
    //
    // FlatShading is honoured here because the glaze bar parts are welded, indexed
    // solids built for a boolean pass. Their hard arrises have to come from the
    // shading model rather than from splitting vertices, which would break exactly
    // the property the weld exists to provide.
    function VghLantern__Env3d__MaterialLibrary__BuildFinishSurface(profile) {
        const common  =  {
            color           : new THREE.Color(profile.RenderAlbedoHex || profile.HexColor),
            roughness       : profile.Roughness,
            metalness       : profile.Metalness,
            envMapIntensity : profile.EnvMapIntensity,
            flatShading     : profile.FlatShading === true
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


    // HELPER FUNCTION | Build a Plain Config-Driven Standard Surface
    // ------------------------------------------------------------
    // For the materials that are simply what they are - bare douglas fir, a
    // concealed extrusion - and need neither a finish lookup nor a procedural
    // texture. Every value comes from the named role block, so adding another such
    // material is a config entry rather than a new builder.
    //
    // Reached two ways: directly, for a role that has no finish to choose, and via
    // a palette entry's UsesMaterial, which is how an offered finish can BE one of
    // these role blocks instead of restating it.
    //
    // FlatShading is honoured here because these surfaces clothe the glaze bar
    // solids, which are welded and indexed so that a boolean can use them. Hard
    // arrises therefore have to come from the shading model rather than from
    // splitting vertices, which would break exactly the property the weld exists
    // to provide.
    function VghLantern__Env3d__MaterialLibrary__BuildPlainSurface(blockName) {
        const block  =  VghLantern__Env3d__MaterialLibrary__RoleBlock(blockName);

        return new THREE.MeshStandardMaterial({
            color           : new THREE.Color(block.HexColor || '#a8abae'),
            roughness       : (typeof block.Roughness === 'number')       ? block.Roughness       : 0.5,
            metalness       : (typeof block.Metalness === 'number')       ? block.Metalness       : 0,
            envMapIntensity : (typeof block.EnvMapIntensity === 'number') ? block.EnvMapIntensity : 1,
            flatShading     : block.FlatShading === true
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Bare Mill Finish Aluminium
    // ------------------------------------------------------------
    // The concealed glaze bar core, and the one material in the model that is
    // deliberately NOT the lantern's finish. In the structural view it is the
    // only thing on screen, so the whole point of it is to be unmistakably bare
    // metal rather than one more grey.
    //
    // Three things do that work, and none of them is the colour:
    //   metalness 1      kills the diffuse term entirely, so the surface is
    //                    reflection alone - the single biggest difference
    //                    between metal and coated metal
    //   envMapIntensity  well above the powder coat's, because bare aluminium
    //                    returns the sky where a coating scatters it
    //   the grain map    die lines running the length of the extrusion, which
    //                    stretch the highlight along the bar
    //
    // The grain is a ROUGHNESS map first and a bump map second. Roughness is
    // what carries anisotropy in a standard PBR model - the shader has no true
    // anisotropy term - and relief on a real die line is microns deep, far too
    // shallow to read as texture.
    function VghLantern__Env3d__MaterialLibrary__BuildMillAluminium() {
        const metal  =  VghLantern__Env3d__MaterialLibrary__RoleBlock('MillAluminium');

        const material  =  new THREE.MeshStandardMaterial({
            color           : new THREE.Color(metal.HexColor || '#c7ccd1'),
            roughness       : (typeof metal.Roughness === 'number')       ? metal.Roughness       : 0.30,
            metalness       : (typeof metal.Metalness === 'number')       ? metal.Metalness       : 1.0,
            envMapIntensity : (typeof metal.EnvMapIntensity === 'number') ? metal.EnvMapIntensity : 1.6,
            flatShading     : metal.FlatShading === true
        });

        if (metal.GrainEnabled === false) return material;

        try {
            const grain  =  VghLantern__Env3d__ProceduralTextures__BrushedGrain({
                PixelSize     : metal.GrainPixelSize,
                LineDensity   : metal.GrainLineDensity,
                LineContrast  : metal.GrainLineContrast,
                Wander        : metal.GrainWander,
                WanderLattice : metal.GrainWanderLattice,
                Seed          : metal.GrainSeed
            });

            // The mesh carries UVs in world units with U across the section and V
            // along the bar, so the repeat is tiles per world unit and V is held
            // at one to keep the grain running unbroken down the length.
            const repeatU  =  (typeof metal.GrainRepeatU === 'number') ? metal.GrainRepeatU : 4;
            const repeatV  =  (typeof metal.GrainRepeatV === 'number') ? metal.GrainRepeatV : 1;

            // Three multiplies the map through the scalar, so the scalar has to
            // become the TOP of the wanted band and the map's mid grey then lands
            // mid band. Setting roughness and the map independently is the usual
            // way this goes wrong: the material ends up darker and flatter than
            // either value suggests.
            const roughMin  =  (typeof metal.GrainRoughnessMin === 'number') ? metal.GrainRoughnessMin : 0.16;
            const roughMax  =  (typeof metal.GrainRoughnessMax === 'number') ? metal.GrainRoughnessMax : 0.46;

            const grainMap  =  grain.clone();                                 // <-- Cloned so this material owns its own repeat without disturbing the cached source
            grainMap.needsUpdate  =  true;
            grainMap.wrapS  =  THREE.RepeatWrapping;
            grainMap.wrapT  =  THREE.RepeatWrapping;
            grainMap.repeat.set(repeatU, repeatV);

            material.roughness     =  roughMax;
            material.roughnessMap  =  grainMap;
            material.userData.VghLantern__RoughnessFloor  =  roughMin;        // <-- Recorded for anyone tuning the band later

            if (typeof metal.GrainBumpScale === 'number' && metal.GrainBumpScale > 0) {
                material.bumpMap    =  grainMap;
                material.bumpScale  =  metal.GrainBumpScale;
            }

        } catch (error) {
            // A canvas that will not allocate is a reason to render the metal
            // plain, never a reason to fail the whole scene build.
            console.warn('[VghLantern Env3d] Brushed grain could not be generated - core renders untextured:', error);
        }

        return material;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Sapele Hardwood, the Head Beam's Own Material
    // ------------------------------------------------------------
    // The head beam (46_1001) is a fixed Vale product section - Sapele, factory
    // sealed - and unlike the frame, the ridge or the hips it does NOT follow
    // the lantern's chosen paint finish. It gets its own role, the same way
    // the bare mill aluminium core does.
    //
    // Interlocked-grain hardwoods read by their COLOUR figure, not their
    // sheen, so unlike every other grained role here the map is a diffuse
    // colour map (WoodGrain) rather than a roughness map. Roughness stays a
    // flat config value; only the colour carries the ribbon stripe.
    function VghLantern__Env3d__MaterialLibrary__BuildSapeleHardwood() {
        const timber  =  VghLantern__Env3d__MaterialLibrary__RoleBlock('SapeleHardwood');

        const material  =  new THREE.MeshStandardMaterial({
            color           : new THREE.Color(timber.BaseColorHex || '#8a4a34'),
            roughness       : (typeof timber.Roughness === 'number')       ? timber.Roughness       : 0.52,
            metalness       : (typeof timber.Metalness === 'number')       ? timber.Metalness       : 0.0,
            envMapIntensity : (typeof timber.EnvMapIntensity === 'number') ? timber.EnvMapIntensity : 0.6,
            flatShading     : timber.FlatShading === true
        });

        if (timber.GrainEnabled === false) return material;

        try {
            const grain  =  VghLantern__Env3d__ProceduralTextures__WoodGrain({
                PixelSize     : timber.GrainPixelSize,
                LineDensity   : timber.GrainLineDensity,
                LineContrast  : timber.GrainLineContrast,
                Wander        : timber.GrainWander,
                WanderLattice : timber.GrainWanderLattice,
                BaseColorHex  : timber.BaseColorHex,
                DarkColorHex  : timber.DarkColorHex,
                LightColorHex : timber.LightColorHex,
                Seed          : timber.GrainSeed
            });

            const repeatU  =  (typeof timber.GrainRepeatU === 'number') ? timber.GrainRepeatU : 4;
            const repeatV  =  (typeof timber.GrainRepeatV === 'number') ? timber.GrainRepeatV : 0.85;

            const grainMap  =  grain.clone();                                 // <-- Cloned so this material owns its own repeat without disturbing the cached source
            grainMap.needsUpdate  =  true;
            grainMap.colorSpace   =  THREE.SRGBColorSpace;                    // <-- Stated explicitly rather than trusted to clone() - this is the one map in the library that is colour, not a scalar quantity, and a silent fall back to linear would wash the timber out
            grainMap.wrapS  =  THREE.RepeatWrapping;
            grainMap.wrapT  =  THREE.RepeatWrapping;
            grainMap.repeat.set(repeatU, repeatV);

            // The map already carries the true tri-tone colour, so the base
            // colour must go to white - otherwise the tint multiplies through
            // and the timber renders darker than every configured tone.
            material.map  =  grainMap;
            material.color.set('#ffffff');

        } catch (error) {
            // A canvas that will not allocate is a reason to render the beam
            // plain, never a reason to fail the whole scene build.
            console.warn('[VghLantern Env3d] Wood grain could not be generated - head beam renders untextured:', error);
        }

        return material;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Newly Installed Patination Oiled Leadwork
    // ------------------------------------------------------------
    // The cover flashing that encircles the base frame, and the one surface on
    // the model that a viewer has strong expectations about: everybody has seen
    // leadwork, and a flat grey prism where the flashing should be reads as
    // wrong long before anyone can say why.
    //
    // What it is: milled lead, dressed down over the upstand by hand, wiped over
    // with patination oil the same day so it never blooms into the chalky white
    // carbonate of neglected leadwork. Newly oiled lead is dark, faintly wet, and
    // covered in the broad smeary strokes the cloth left. Those strokes are the
    // whole tell, and no single roughness value can produce them.
    //
    // TWO LAYERS, NOT ONE:
    // The oil is a real film sitting over a real metal, so it is built as one -
    // a clearcoat over a metallic base - rather than being averaged into the
    // base roughness. That is what separates it from the powder coats, where the
    // clearcoat sits over a matt PIGMENT and the metalness stays near zero. Here
    // there is genuine metal underneath, and the sheen is on top of it.
    //
    // WHY EVERY SCALAR ENDS UP AT 1.0:
    // THREE multiplies each map through its matching scalar. The maps below carry
    // ABSOLUTE values rather than modulations around a mid point, because four
    // quantities all keyed to one oil-thickness field is exactly the situation in
    // which a leftover scalar quietly halves one of them and the surface comes out
    // darker and flatter than any configured number suggests. Neutralising the
    // scalars keeps the config values meaning precisely what they say. They are
    // still set from config first, so if texture generation fails the fallback is
    // a sensible plain oiled lead rather than a white full-metal one.
    function VghLantern__Env3d__MaterialLibrary__BuildLeadFlashing() {
        const lead  =  VghLantern__Env3d__MaterialLibrary__RoleBlock('LeadFlashing');

        const common  =  {
            color           : new THREE.Color(lead.HexColor || '#565a61'),
            roughness       : (typeof lead.Roughness === 'number')       ? lead.Roughness       : 0.52,
            metalness       : (typeof lead.Metalness === 'number')       ? lead.Metalness       : 0.62,
            envMapIntensity : (typeof lead.EnvMapIntensity === 'number') ? lead.EnvMapIntensity : 0.85,
            flatShading     : lead.FlatShading !== false
        };

        // Same promotion rule the finishes use: a clear coat above zero is what
        // makes a material physical rather than standard.
        const coat  =  (typeof lead.ClearCoat === 'number') ? lead.ClearCoat : 0;

        const material  =  (coat > 0)
            ? new THREE.MeshPhysicalMaterial(Object.assign({}, common, {
                  clearcoat          : coat,
                  clearcoatRoughness : (typeof lead.ClearCoatRoughness === 'number') ? lead.ClearCoatRoughness : 0.40
              }))
            : new THREE.MeshStandardMaterial(common);

        if (lead.ProceduralEnabled === false) return material;

        try {
            const maps  =  VghLantern__Env3d__ProceduralTextures__PatinatedLead({
                PixelSize          : lead.PixelSize,
                RepeatU            : lead.RepeatU,
                RepeatV            : lead.RepeatV,
                Anisotropy         : lead.Anisotropy,

                OilStrokeCount     : lead.OilStrokeCount,
                OilDragCount       : lead.OilDragCount,
                OilDragWeight      : lead.OilDragWeight,
                OilMeanderLattice  : lead.OilMeanderLattice,
                OilMeanderOctaves  : lead.OilMeanderOctaves,
                OilMeanderWeight   : lead.OilMeanderWeight,
                OilContrast        : lead.OilContrast,
                OilBias            : lead.OilBias,

                BloomLattice       : lead.BloomLattice,
                BloomOctaves       : lead.BloomOctaves,
                BloomPersistence   : lead.BloomPersistence,

                DressLattice       : lead.DressLattice,
                DressOctaves       : lead.DressOctaves,
                DressPersistence   : lead.DressPersistence,

                ToothLattice       : lead.ToothLattice,
                ToothOctaves       : lead.ToothOctaves,
                ToothPersistence   : lead.ToothPersistence,

                OiledHex           : lead.OiledHex,
                OxideHex           : lead.OxideHex,
                MottleStrength     : lead.MottleStrength,
                ToothTint          : lead.ToothTint,

                RoughnessOiled     : lead.RoughnessOiled,
                RoughnessDry       : lead.RoughnessDry,
                RoughnessMottle    : lead.RoughnessMottle,

                MetalnessOiled     : lead.MetalnessOiled,
                MetalnessDry       : lead.MetalnessDry,

                DressRelief        : lead.DressRelief,
                ToothRelief        : lead.ToothRelief,
                WipeRelief         : lead.WipeRelief,

                CoatOiled          : lead.CoatOiled,
                CoatDry            : lead.CoatDry,
                CoatRoughnessOiled : lead.CoatRoughnessOiled,
                CoatRoughnessDry   : lead.CoatRoughnessDry,

                Seed               : lead.Seed
            });

            // Record what the plain surface would have been, so anyone tuning the
            // material later can see the fallback the scalars below overwrote.
            material.userData.VghLantern__LeadPlainSurface  =  {
                Color              : common.color.getHexString(),
                Roughness          : common.roughness,
                Metalness          : common.metalness,
                ClearCoat          : coat,
                ClearCoatRoughness : material.clearcoatRoughness
            };

            // COLOUR - the map carries the full oiled-to-oxide range, so the tint
            // it multiplies through has to be white or the flashing renders twice
            // as dark as either the map or the config colour describes.
            material.map  =  maps.Albedo;
            material.color.set('#ffffff');

            // HEIGHT, ROUGHNESS, METALNESS - one texture, three channels. THREE
            // reads bump from red, roughness from green and metalness from blue,
            // so this is one GPU upload doing three jobs and the three maps cannot
            // drift out of step with each other.
            material.bumpMap       =  maps.Surface;
            material.bumpScale     =  (typeof lead.BumpScale === 'number') ? lead.BumpScale : 0.0018;
            material.roughnessMap  =  maps.Surface;
            material.metalnessMap  =  maps.Surface;
            material.roughness     =  1.0;
            material.metalness     =  1.0;

            // THE OIL FILM - only reachable on the physical material. Clearcoat
            // reads red and clearcoat roughness reads green, both already spoken
            // for above, which is why the film needs its own texture.
            //
            // Note the coat follows the geometric normal rather than the bumped
            // one: THREE perturbs the base normal from bumpMap but has no bump
            // equivalent for the coat layer. On relief this shallow the difference
            // is not visible; it would need a clearcoatNormalMap to correct.
            if (material.isMeshPhysicalMaterial) {
                material.clearcoatMap           =  maps.OilFilm;
                material.clearcoatRoughnessMap  =  maps.OilFilm;
                material.clearcoat              =  1.0;
                material.clearcoatRoughness     =  1.0;
            }

        } catch (error) {
            // A canvas that will not allocate is a reason to render the flashing
            // plain, never a reason to fail the whole scene build.
            console.warn('[VghLantern Env3d] Lead surface maps could not be generated - flashing renders plain:', error);
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

        } else if (roleKey === ROLE_MILL_ALUMINIUM) {
            material  =  VghLantern__Env3d__MaterialLibrary__BuildMillAluminium();

        } else if (roleKey === ROLE_LEAD_FLASHING) {
            material  =  VghLantern__Env3d__MaterialLibrary__BuildLeadFlashing();

        } else if (roleKey === ROLE_SAPELE_HARDWOOD) {
            material  =  VghLantern__Env3d__MaterialLibrary__BuildSapeleHardwood();

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
            // Every remaining role is finish-driven: the frame, the library
            // components that are supplied coated to match it, and the two glaze
            // bar parts that carry finishes of their own. Which palette the name
            // is looked up in is the only thing that differs between them.
            const paletteKey  =  ROLE_PALETTE_KEY[roleKey] || PBR_FINISHES_KEY;
            const profile     =  VghLantern__Env3d__MaterialLibrary__PaletteProfile(paletteKey, finishName);

            // A palette entry may delegate to a role block rather than carry its
            // own surface, which is how Natural Douglas Fir resolves to the same
            // timber every unpainted trim has always been built from instead of
            // restating those numbers in a second place.
            material  =  profile.UsesMaterial
                ? VghLantern__Env3d__MaterialLibrary__BuildPlainSurface(profile.UsesMaterial)
                : VghLantern__Env3d__MaterialLibrary__BuildFinishSurface(profile);
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

    // The concealed glaze bar core. Bare mill extrusion, never coated, because it
    // is never seen once the cap and trim are on - so it takes no finish name.
    export function VghLantern__Env3d__MaterialLibrary__MillAluminium() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_MILL_ALUMINIUM, null);
    }

    export function VghLantern__Env3d__MaterialLibrary__LeadFlashing() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_LEAD_FLASHING, null);
    }

    // The head beam. Fixed Sapele hardwood, never the frame paint - takes no
    // finish name for the same reason the mill aluminium core does not.
    export function VghLantern__Env3d__MaterialLibrary__SapeleHardwood() {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_SAPELE_HARDWOOD, null);
    }

    // The two finished faces of a glaze bar, each specified in its own right. The
    // cap does NOT follow the frame: the frame is painted joinery and the outside
    // of the roof is dressed in lead flashing, so what the frame is painted has no
    // bearing on the capping above it.
    export function VghLantern__Env3d__MaterialLibrary__GlazeBarCap(capFinishName) {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_BAR_CAP, capFinishName);
    }

    export function VghLantern__Env3d__MaterialLibrary__GlazeBarTrim(trimFinishName) {
        return VghLantern__Env3d__MaterialLibrary__Get(ROLE_BAR_TRIM, trimFinishName);
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
