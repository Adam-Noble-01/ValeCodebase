/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | SETTING OUT - LINE FACTORY
   =============================================================================

   FILE       : VghLantern__Env3d__SetOut__LineFactory__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - SetOut LineFactory
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build screen-thick coloured construction lines from model segments
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - The single place the vendored fat line addon is touched. Everything else in
     the setting-out stack hands this module millimetre point pairs and a style
     key, and receives a drawable object back.
   - A plain THREE.Line renders one hardware pixel wide on every platform that
     matters, which is unusable for linework you are meant to read. LineSegments2
     draws each segment as camera-facing quads, so a construction line holds its
     weight the way drawn linework does.

   ---------------------------------------------------------------------------

   STYLE KEYS COME STRAIGHT FROM THE ENTITY NAMES

   A setting-out entity carries Class and Family, so its style key is simply

       <Class>__<Family>          Centreline__GlazeBar, Datum__Ridge, ...

   There is no mapping table between geometry and appearance, because the naming
   scheme already carries the distinction. Adding a datum family to the config
   styles it; nothing here needs editing.

   ---------------------------------------------------------------------------

   VENDORED ADDON BEHAVIOUR THIS MODULE DELIBERATELY ACCOUNTS FOR

     - Both fat line classes default to a RANDOM material colour, so a material is
       always supplied explicitly.
     - LineMaterial.color and .resolution have setters that break on assignment -
       .color assigns raw into the uniform, .resolution calls copy on the operand.
       Both are therefore set through .set().
     - Segment colours are consumed in LINEAR space. Colours are built as
       THREE.Color from the config hex so the colour management conversion runs,
       rather than being packed into a raw vertex colour array by hand.
     - Line width is CSS pixels driven by the viewport uniform, which the addon
       refreshes per object per frame in onBeforeRender. Under on-demand rendering
       nothing has drawn yet at build time, so the resolution is also seeded here.
     - The bounding sphere carries no line-width margin, so a wide line can be
       culled while still partly on screen. Culling is switched off.
     - setPositions accepts only Float32Array or a plain Array. A Float32Array is
       kept by reference rather than copied.

   ============================================================================= */

import * as THREE from 'three';

import { LineSegments2 }        from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial }         from 'three/addons/lines/LineMaterial.js';

import {
    VghLantern__Env3d__ConfigAccess__Section,
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

// =============================================================================
// REGION | Setting Out Line Factory Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and Cache
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Buffer Layout and Object Naming
    // ------------------------------------------------------------
    const FLOATS_PER_SEGMENT  =  6;                                          // <-- Two endpoints of three floats
    const OBJECT_NAME_PREFIX  =  'VghLantern__Env3d__SetOut__';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Documented Style Fallbacks
    // ------------------------------------------------------------
    // Used only when a style key is absent from config, which is a config error
    // rather than a normal path - the line still draws, in an obvious magenta, so
    // the omission is visible rather than silent.
    const MISSING_STYLE_COLOUR   =  '#ff00ff';
    const MISSING_STYLE_WIDTH_PX =  2;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Material Cache Keyed by Appearance
    // ------------------------------------------------------------
    // Shared and reused across rebuilds the same way MaterialLibrary shares its
    // mesh materials, so a redraw allocates geometry only.
    let VghLantern__Env3d__SetOut__LineFactory__Cache  =  {};                // <-- 'colour|width|depthTest' to LineMaterial
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Style Resolution
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Style Record for a Setting Out Entity
    // ------------------------------------------------------------
    // The style key is composed from the entity's own Class and Family, so the
    // naming scheme and the appearance table can never drift apart.
    export function VghLantern__Env3d__SetOut__LineFactory__StyleKey(entity) {
        if (!entity) return '';
        return String(entity.Class) + '__' + String(entity.Family);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Style Record From the SetOut Config Block
    // ------------------------------------------------------------
    export function VghLantern__Env3d__SetOut__LineFactory__Style(styleKey) {
        const config  =  VghLantern__Env3d__ConfigAccess__Section('SetOut');
        const styles  =  config.LineStyles || {};
        const style   =  styles[styleKey];

        if (!style) {
            console.warn('[VghLantern Env3d SetOut] No line style for "' + styleKey +
                '". Add it to Na__Env3d__Config.json -> VghLantern__Env3d__Config__SetOut -> LineStyles.');
            return { Colour : MISSING_STYLE_COLOUR, WidthPx : MISSING_STYLE_WIDTH_PX, Pattern : 'solid', Label : styleKey };
        }
        return style;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Named Millimetre Dash Pattern
    // ------------------------------------------------------------
    // Returns null for a solid line type, which is what the stamper treats as
    // "do not cut this run".
    export function VghLantern__Env3d__SetOut__LineFactory__Pattern(patternKey) {
        if (!patternKey || patternKey === 'solid') return null;

        const config    =  VghLantern__Env3d__ConfigAccess__Section('SetOut');
        const patterns  =  config.LinePatternsMm || {};
        const pattern   =  patterns[patternKey];

        if (!Array.isArray(pattern) || pattern.length < 2) {
            console.warn('[VghLantern Env3d SetOut] No usable dash pattern "' + patternKey +
                '". Add it to Na__Env3d__Config.json -> VghLantern__Env3d__Config__SetOut -> LinePatternsMm.');
            return null;
        }
        return pattern;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Cached Fat Line Material for an Appearance
    // ------------------------------------------------------------
    // depthTest is off by default for setting-out linework: the whole construction
    // cage should read at once, including the far side, which is what makes it an
    // inspection aid rather than a decoration. renderOrder pairs with it so the
    // lines land after the solid pass.
    function VghLantern__Env3d__SetOut__LineFactory__Material(colourHex, widthPx, depthTest) {
        const cacheKey  =  colourHex + '|' + widthPx + '|' + (depthTest ? 'depth' : 'nodepth');
        if (VghLantern__Env3d__SetOut__LineFactory__Cache[cacheKey]) {
            return VghLantern__Env3d__SetOut__LineFactory__Cache[cacheKey];
        }

        // Colour is constructed rather than assigned after the fact. The addon's
        // colour setter writes raw into the uniform, so only the constructor path
        // runs the colour management conversion that keeps the hex looking right.
        const material  =  new LineMaterial({
            color       : new THREE.Color(colourHex),
            linewidth   : Number(widthPx) || MISSING_STYLE_WIDTH_PX,
            worldUnits  : false,                                              // <-- CSS pixels, so weight holds at any zoom
            dashed      : false,                                              // <-- Line types are stamped into geometry, not shaded
            depthTest   : depthTest === true,
            transparent : false,
            toneMapped  : false                                               // <-- Setting out is signal, not lit scenery
        });

        material.name  =  'VghLantern__Env3d__SetOut__Line__' + colourHex;
        material.userData.VghLantern__Shared  =  true;                        // <-- SceneManager must not dispose on group clear

        VghLantern__Env3d__SetOut__LineFactory__Cache[cacheKey]  =  material;
        return material;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Object Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Fat Line Object From Model Space Segment Pairs
    // ------------------------------------------------------------
    // segmentsMm is an array of [ startPointMm, endPointMm ] pairs in model space.
    // Returns null for an empty set so a caller can skip adding an empty object.
    export function VghLantern__Env3d__SetOut__LineFactory__Build(segmentsMm, styleKey, objectName) {
        if (!Array.isArray(segmentsMm) || segmentsMm.length === 0) return null;

        const config     =  VghLantern__Env3d__ConfigAccess__Section('SetOut');
        const style      =  VghLantern__Env3d__SetOut__LineFactory__Style(styleKey);
        const positions  =  new Float32Array(segmentsMm.length * FLOATS_PER_SEGMENT);

        let cursor  =  0;
        for (let i = 0; i < segmentsMm.length; i++) {
            const pair  =  segmentsMm[i];
            if (!pair || pair.length < 2) continue;

            const startWorld  =  VghLantern__Env3d__ConfigAccess__PointToWorld(pair[0]);
            const endWorld    =  VghLantern__Env3d__ConfigAccess__PointToWorld(pair[1]);

            positions[cursor++]  =  startWorld.x;
            positions[cursor++]  =  startWorld.y;
            positions[cursor++]  =  startWorld.z;
            positions[cursor++]  =  endWorld.x;
            positions[cursor++]  =  endWorld.y;
            positions[cursor++]  =  endWorld.z;
        }
        if (cursor === 0) return null;                                        // <-- Every pair was malformed

        const geometry  =  new LineSegmentsGeometry();
        geometry.setPositions(cursor === positions.length ? positions : positions.slice(0, cursor));

        const material  =  VghLantern__Env3d__SetOut__LineFactory__Material(
            style.Colour, style.WidthPx, config.DepthTest === true
        );

        const object3d  =  new LineSegments2(geometry, material);
        object3d.name           =  objectName || (OBJECT_NAME_PREFIX + styleKey);
        object3d.renderOrder    =  Number(config.RenderOrder) || 0;
        object3d.frustumCulled  =  false;                                     // <-- The bounding sphere carries no width margin

        object3d.userData.VghLantern__SetOut__StyleKey  =  styleKey;
        return object3d;
    }
    // ------------------------------------------------------------


    // FUNCTION | Seed the Line Width Resolution for a Surface
    // ------------------------------------------------------------
    // The addon refreshes this uniform per object per frame from the renderer
    // viewport, so on-screen drawing needs no help. It is seeded anyway because the
    // scene draws on demand: until something invalidates the surface nothing has
    // rendered, and the uniform still holds its one-by-one default, which would
    // render every line as a screen-filling slab if anything read it first.
    export function VghLantern__Env3d__SetOut__LineFactory__SeedResolution(surface) {
        if (!surface || !surface.HostElement) return;

        const widthPx   =  surface.HostElement.clientWidth;
        const heightPx  =  surface.HostElement.clientHeight;
        if (widthPx < 1 || heightPx < 1) return;

        const keys  =  Object.keys(VghLantern__Env3d__SetOut__LineFactory__Cache);
        for (let i = 0; i < keys.length; i++) {
            VghLantern__Env3d__SetOut__LineFactory__Cache[keys[i]].resolution.set(widthPx, heightPx);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose Every Cached Line Material
    // ------------------------------------------------------------
    // Called only on full teardown, matching MaterialLibrary. Clearing the setting
    // out group disposes geometry and leaves these alone.
    export function VghLantern__Env3d__SetOut__LineFactory__DisposeMaterials() {
        const keys  =  Object.keys(VghLantern__Env3d__SetOut__LineFactory__Cache);

        for (let i = 0; i < keys.length; i++) {
            const material  =  VghLantern__Env3d__SetOut__LineFactory__Cache[keys[i]];
            if (material && typeof material.dispose === 'function') material.dispose();
        }
        VghLantern__Env3d__SetOut__LineFactory__Cache  =  {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
