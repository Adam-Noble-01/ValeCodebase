// =============================================================================
// VALEVISION3D - RENDER EFFECT - ORNAMENT FADE
// =============================================================================
//
// FILE       : Na__RenderEffect__OrnamentFade__.js
// NAMESPACE  : Na__OrnamentFade
// MODULE     : Na__RenderEffect__OrnamentFade__
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Draw a model's ornament (a ridge cresting, its finials) with a lighter pen
//              the further off it is, so it stops reading as a black blob, and leave
//              every other line exactly as it was
// CREATED    : 10-Nov-2026
//
// DESCRIPTION:
// - Adam, 10-Nov-2026: "the linework bunches up and looks super eye grabbing when you zoom
//   back ... The aim is on areas of high detail to force less darkness to elimate bunched
//   up items reading as areas of black blobs ... the remainder of the orangery and
//   building must look exactly the same."
// - WHY A CRESTING IS A BLOB. Fat lines keep their pixel width however far off they are,
//   and the profile lines outline every sub-pixel bar. Each gives about half the darkness,
//   so both fade here.
// - WHAT IT DOES, ONCE, AFTER THE MODELS LOAD (Na__OrnamentFade__Attach):
//   1. MEASURES (the Core beside this file) which line segments are ornament. A category
//      with no node named as ornament is never measured, so most projects return at once
//      with nothing changed.
//   2. LIFTS THE ORNAMENT'S SEGMENTS INTO A FAT LINE OF THEIR OWN, a child of the line
//      they came from, on a copy of its material that blends. The rest of that line keeps
//      its own material and program, so the rest of the building is drawn by the very
//      shader it always was. A line that is ornament throughout takes the copy itself.
//   3. MARKS EVERY CORNER OF AN ORNAMENT MESH with how much of a profile edge to keep.
//      The profile pass (Na__RenderEffect__ProfileLines__.js) paints its flat colour with
//      the material patched here, which writes that share into the colour buffer's alpha,
//      and its Sobel multiplies each edge by the least alpha within a pixel and a half,
//      so the outline a cresting throws onto the wall behind fades with it. Everywhere
//      else that alpha is 1, as it always was.
// - HOW IT FADES. Per segment, by the line's width IN THE MODEL (its pixels over the
//   pixels a metre takes there), a figure a phone and a 4K screen agree on: nothing under
//   Fade__StartLineMm (about 7 m away on a desktop), all of it by Fade__FullLineMm (about
//   21 m). Small detail keeps Fade__DetailKeepShare of its ink; posts, rails and arches
//   Fade__StructureKeepShare. By blending: paler opaque lines over each other read as a
//   white box, thinner lines break into dots as the camera moves, dropped lines look
//   moth-eaten (all tried on the testing server, 10-Nov-2026).
// - PERSPECTIVE ONLY. The shaders test the projection, so plans, elevations, sections and
//   any orthographic view are never touched.
// - THE TUNABLES are Na__RenderEffect__OrnamentFade__Config__.json, fetched as this module
//   loads. The testing server's "Linework density test" panel moves them live through
//   Na__OrnamentFade__Set; nothing it does is saved.
//
// CONSUMERS: every reader of fat lines walks the tree and finds both objects, which
// together hold the original line's segments once each, the child following the line's
// own transform: projected linework (drawings), linework width and colour settings,
// distance culling, export render layers, the profile pass's own list of lines.
//
// FRAMES:
// - Points are three.js world space, metres, Y up, read from each line's own matrix.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Nov-2026 - Version 1.1.0
// - Adam: "add door handles and columns (pilasters) to the new linework culling system and
//   make it so anything in my SketchUp Library is known to ValeVision as one of these
//   assets". A node is ornament when the GLB Builder (2.15.0 on) wrote extras.Na__LibraryAsset
//   on it or a node above it, when its name starts with a library code (20_1001__...), or
//   when its name holds a word in Choose__SeedNames (Cresting, Column, Pilaster, Handle):
//   the last two serve the GLBs exported before.
// - Columns and pilasters fade further off (Fade__FurtherOffNames, Fade__FurtherOffScale):
//   Adam, "only when you zoom real far back for the pilasters".
// - Only a cresting carries in the busy flattened pieces round it (Choose__CarryInFromNames).
//   A category with no cresting measures its named parts alone, which is cheap.
// - A library part's mesh, flattened in with the rest, is found inside the box of its lines.
// - Doors, fixtures, furniture and decor are no longer skipped: library parts live there too.
// 10-Nov-2026 - Version 1.0.0
// - Built from the linework density test (80__Testing__LocalTestServer), measured on
//   60227__Thorpe at 11 to 51 m: the cresting lightens from 16 m out and no pixel outside
//   it changes. Unlike the test, a line that is ornament throughout takes the blending
//   material itself rather than being hidden beside a copy, so drawings never see a
//   segment twice, and the copy is a child of its line, so it follows a moving node.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
    import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Measuring
    // @delegate: ./Na__RenderEffect__OrnamentFade__Core__.js
    // ------------------------------------------------------------
    import {
        NA__ORNAMENTFADE__LEVELS,
        Na__OrnamentFade__FieldDefaults,
        Na__OrnamentFade__MeasureCurves,
        Na__OrnamentFade__BuildField,
        Na__OrnamentFade__CoverOfSegments,
        Na__OrnamentFade__CoverOfMesh,
        Na__OrnamentFade__OrnamentOf
    } from './Na__RenderEffect__OrnamentFade__Core__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Render Loop
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from './Na__RenderLoop__Invalidation.js';
    import { Na__SceneHooks__Add } from './Na__RenderLoop__SceneRenderHooks__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Settings Used When the Config Cannot Be Read (the same values)
    // ------------------------------------------------------------
    const Na__OrnamentFade__Defaults = {
        Enabled                     : true,
        Choose__SeedNames           : 'Cresting|Column|Pilaster|Handle',
        Choose__LibraryAssets       : true,                             // <-- A node the GLB Builder marked Na__LibraryAsset, or named with a library code
        Choose__LibraryExcludeTypes : '',                               // <-- Library types never to fade, e.g. 'Roof|Rainwater'
        Choose__CarryInFromNames    : 'Cresting',                       // <-- Only round these are busy flattened pieces carried in
        Choose__CompanionNames      : 'Finial|Spire|Urn',
        Choose__ExemptNames         : 'Note__',
        Choose__SkipCategories      : 'Vegetation|Entourage|Landscape|SiteBoundaries|Contextual|Linetype',
        Choose__CarryInMm           : 300,
        Choose__CarryInShare        : 0.03,
        Choose__CarryInSoftShare    : 0.02,
        Fade__StartLineMm           : 3,
        Fade__FullLineMm            : 9,
        Fade__DetailBelowPx         : 3,
        Fade__StructureAbovePx      : 30,
        Fade__DetailKeepShare       : 0,
        Fade__StructureKeepShare    : 0.7,
        Fade__BuildingAboveMm       : 800,
        Fade__ProfileKeepShare      : 0.5,
        Fade__ProfileBarMm          : 30,
        Fade__ProfileThinPx         : 2,
        Fade__ProfileWholePx        : 6,
        Fade__FurtherOffNames       : 'Column|Pilaster',                // <-- These fade from further off...
        Fade__FurtherOffScale       : 2,                                // <-- ...this many times the distance
        Show__Picked                : false                             // <-- Never in the config: the test panel's "show what was chosen"
    };
    const NA__ORNAMENTFADE__SPLIT_OF_TONE  = 0.5;                       // <-- Segments at this share of the threshold or over go in the blending object; the shader still decides
    const NA__ORNAMENTFADE__MEASURE_AGAIN  = ['Choose__SeedNames', 'Choose__LibraryAssets', 'Choose__LibraryExcludeTypes', 'Choose__CarryInFromNames', 'Choose__CompanionNames', 'Choose__ExemptNames', 'Choose__SkipCategories', 'Choose__CarryInMm', 'Choose__CarryInShare', 'Fade__BuildingAboveMm', 'Fade__FurtherOffNames', 'Fade__FurtherOffScale', 'Enabled'];
    const NA__ORNAMENTFADE__LIBRARY_CODE   = /^(?!00_)\d{2}_{1,2}\d{2,4}__/;   // <-- 20_1001__..., 20__1003__..., 03_85__...; 00 is the modelling helpers
    const NA__ORNAMENTFADE__BOX_PAD_M      = 0.01;                      // <-- A library part's mesh is found within its lines' box grown by this
    const NA__ORNAMENTFADE__CONFIG_URL     = new URL('./Na__RenderEffect__OrnamentFade__Config__.json', import.meta.url);
    // ------------------------------------------------------------

    // MODULE VARIABLES | What Is Attached
    // ------------------------------------------------------------
    let   Na__OrnamentFade__ConfigPromise = null;
    let   Na__OrnamentFade__Overrides     = {};                         // <-- Set by the test panel, on top of the config
    let   Na__OrnamentFade__Settings      = Object.assign({}, Na__OrnamentFade__Defaults);
    let   Na__OrnamentFade__Context       = null;                       // <-- { scene, modelRoot, getPipeline }
    const Na__OrnamentFade__State         = {
        Attached   : false,
        Splits     : [],                                                // <-- { source, sourceGeometry, quietGeometry, busy, sourceMaterial, whole }
        MeshParts  : [],                                                // <-- Geometries given the naOfPatch attribute
        LineRef    : null,                                              // <-- One blending material: its width and resolution feed the profile patch
        Unhook     : null,
        Stats      : null
    };
    const Na__OrnamentFade__Uniforms = {
        uNaOfEnabled    : { value : 0 },                                // <-- 1 only while ornament is attached: the profile pass reads it too
        uNaOfTone       : { value : 0.03 },
        uNaOfSoft       : { value : 0.02 },
        uNaOfRange      : { value : new THREE.Vector2(0.003, 0.009) },
        uNaOfFeaturePx  : { value : new THREE.Vector2(3, 30) },
        uNaOfKeep       : { value : new THREE.Vector2(0, 0.7) },
        uNaOfKeepAbove  : { value : 0.8 },
        uNaOfProfile    : { value : new THREE.Vector4(0.5, 0.03, 2, 6) },   // <-- keep, bar metres, thin px, whole px
        uNaOfLineRef    : { value : 0.8 },
        uNaOfResolution : { value : new THREE.Vector2(1, 1) },
        uNaOfShow       : { value : 0 }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Config
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Config Once (started as this module loads, so it is ready by the models)
    // ------------------------------------------------------------
    function Na__OrnamentFade__LoadConfig() {
        if (Na__OrnamentFade__ConfigPromise) return Na__OrnamentFade__ConfigPromise;
        Na__OrnamentFade__ConfigPromise = fetch(NA__ORNAMENTFADE__CONFIG_URL)
            .then((response) => (response.ok ? response.json() : null))
            .then((json) => {
                const settings = {};
                if (!json) return settings;
                Object.keys(json).forEach((key) => {
                    if (!key.startsWith('OrnamentFade__') || key.endsWith('__Description')) return;
                    settings[key.slice('OrnamentFade__'.length)] = json[key];   // <-- OrnamentFade__Fade__StartLineMm -> Fade__StartLineMm
                });
                return settings;
            })
            .catch((error) => {
                console.warn('[OrnamentFade] Config not read, using the built-in values:', error);
                return {};
            });
        return Na__OrnamentFade__ConfigPromise;
    }
    Na__OrnamentFade__LoadConfig();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shader Patches
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | How Busy a Thing Is, Shared by Both Materials
    // ------------------------------------------------------------
    // cover: its patch's mush at four line widths (the Core). What it IS does
    // not depend on the camera: the larger of the 8 mm and 16 mm figures. How
    // far off it is does: lineWorld, a line's width in the model, here.
    // ------------------------------------------------------------
    const NA__ORNAMENTFADE__GLSL = /* glsl */`
        float naOfBusy(vec4 cover, float lineWorld, float tone, float soft, vec2 range) {
            return smoothstep(tone, tone + soft, max(cover.y, cover.z)) * smoothstep(range.x, range.y, lineWorld);
        }
    `;
    // ------------------------------------------------------------

    // SUB FUNCTION | The Ornament's Own Line Material: a Copy That Blends
    // ------------------------------------------------------------
    // The loader's depth bias hook rides across by hand: three's Material.copy
    // does not carry an instance's onBeforeCompile. userData does come across,
    // so the linework width settings find their stashed base width on it.
    // ------------------------------------------------------------
    function Na__OrnamentFade__MakeBusyMaterial(source) {
        const material = source.clone();
        const earlier  = Object.prototype.hasOwnProperty.call(source, 'onBeforeCompile') ? source.onBeforeCompile : null;
        const uniforms = Na__OrnamentFade__Uniforms;
        material.onBeforeCompile = (shader, renderer) => {
            if (earlier) earlier.call(material, shader, renderer);
            Object.keys(uniforms).forEach((name) => { shader.uniforms[name] = uniforms[name]; });
            shader.vertexShader = shader.vertexShader
                .replace('attribute vec3 instanceEnd;', `attribute vec3 instanceEnd;
                    attribute vec4 instanceNaOfCover;
                    attribute vec2 instanceNaOfFeature;
                    uniform float uNaOfEnabled;
                    uniform float uNaOfTone;
                    uniform float uNaOfSoft;
                    uniform vec2  uNaOfRange;
                    uniform vec2  uNaOfFeaturePx;
                    uniform vec2  uNaOfKeep;
                    uniform float uNaOfKeepAbove;
                    flat varying float vNaOfVis;
                    flat varying float vNaOfPicked;
                    ${NA__ORNAMENTFADE__GLSL}`)
                .replace('vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );', `vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );
                    vNaOfVis = 1.0;
                    vNaOfPicked = smoothstep(uNaOfTone, uNaOfTone + uNaOfSoft, max(instanceNaOfCover.y, instanceNaOfCover.z));
                    if (uNaOfEnabled > 0.5 && projectionMatrix[ 2 ][ 3 ] == - 1.0) {                      // perspective only: a drawing is never touched
                        float naOfDepth = max(-0.5 * (start.z + end.z), 1e-4);
                        float naOfPpu   = resolution.y * projectionMatrix[ 1 ][ 1 ] * 0.5 / naOfDepth;      // pixels to a metre, here
                        float naOfHow   = naOfBusy(instanceNaOfCover, linewidth / naOfPpu / max(instanceNaOfFeature.y, 1.0), uNaOfTone, uNaOfSoft, uNaOfRange);   // y: fades this many times further off
                        if (naOfHow > 0.0001) {
                            float naOfStructure = smoothstep(uNaOfFeaturePx.x, uNaOfFeaturePx.y, instanceNaOfFeature.x * naOfPpu);   // 0: detail. 1: structure
                            float naOfBuilding  = smoothstep(0.6 * uNaOfKeepAbove, uNaOfKeepAbove, instanceNaOfFeature.x);          // 1: too long to be ornament
                            vNaOfVis = 1.0 - naOfHow * (1.0 - naOfBuilding) * (1.0 - mix(uNaOfKeep.x, uNaOfKeep.y, naOfStructure));
                        }
                    }`);
            shader.fragmentShader = shader.fragmentShader
                .replace('uniform float linewidth;', `uniform float linewidth;
                    uniform float uNaOfShow;
                    flat varying float vNaOfVis;
                    flat varying float vNaOfPicked;`)
                .replace('gl_FragColor = vec4( diffuseColor.rgb, alpha );', `
                    alpha *= vNaOfVis;
                    if (uNaOfShow > 0.5) { diffuseColor.rgb = mix(vec3(0.0, 0.45, 1.0), vec3(1.0, 0.0, 0.0), vNaOfPicked); alpha = 1.0; }
                    gl_FragColor = vec4( diffuseColor.rgb, alpha );`);
        };
        material.customProgramCacheKey = () => 'Na__OrnamentFade__Busy|' + (earlier ? earlier.toString() : '');
        material.transparent = true;                                          // <-- Blends over what is behind it. Depth is still written, as it was
        material.needsUpdate = true;
        return material;
    }
    // ------------------------------------------------------------

    // FUNCTION | The Profile Pass's Flat Material: Its Alpha Says How Much of an Edge to Draw
    // ------------------------------------------------------------
    // Called once by Na__RenderEffect__ProfileLines__Create on the flat material
    // every mesh wears in the profile colour pass. A mesh with no naOfPatch
    // attribute reads its default, w = 1, which means "not measured": alpha 1.
    // ------------------------------------------------------------
    function Na__OrnamentFade__PatchProfileFallback(material) {
        const earlier  = Object.prototype.hasOwnProperty.call(material, 'onBeforeCompile') ? material.onBeforeCompile : null;
        const uniforms = Na__OrnamentFade__Uniforms;
        material.defaultAttributeValues = Object.assign({}, material.defaultAttributeValues, { naOfPatch : [0, 0, 0, 1] });   // <-- Set explicitly, not left to the context's last value
        material.onBeforeCompile = (shader, renderer) => {
            if (earlier) earlier.call(material, shader, renderer);
            Object.keys(uniforms).forEach((name) => { shader.uniforms[name] = uniforms[name]; });
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', `#include <common>
                    attribute vec4 naOfPatch;
                    uniform float uNaOfEnabled;
                    uniform float uNaOfTone;
                    uniform float uNaOfSoft;
                    uniform vec2  uNaOfRange;
                    uniform vec4  uNaOfProfile;
                    uniform float uNaOfLineRef;
                    uniform vec2  uNaOfResolution;
                    varying float vNaOfVis;
                    ${NA__ORNAMENTFADE__GLSL}`)
                .replace('#include <project_vertex>', `#include <project_vertex>
                    vNaOfVis = 1.0;
                    if (uNaOfEnabled > 0.5 && projectionMatrix[ 2 ][ 3 ] == - 1.0 && naOfPatch.w < 0.5) {     // w is 0 on a measured mesh
                        float naOfPpu  = uNaOfResolution.y * projectionMatrix[ 1 ][ 1 ] * 0.5 / max(-mvPosition.z, 1e-4);
                        float naOfHow  = naOfBusy(naOfPatch, uNaOfLineRef / naOfPpu / max(naOfPatch.x, 1.0), uNaOfTone, uNaOfSoft, uNaOfRange);   // x: fades this many times further off
                        float naOfThin = 1.0 - smoothstep(uNaOfProfile.z, uNaOfProfile.w, uNaOfProfile.y * naOfPpu);   // 1: its bars are too thin to outline
                        vNaOfVis = 1.0 - naOfHow * naOfThin * (1.0 - uNaOfProfile.x);
                    }`);
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', `#include <common>
                    varying float vNaOfVis;`)
                .replace('#include <dithering_fragment>', `#include <dithering_fragment>
                    gl_FragColor.a = vNaOfVis;`);
        };
        material.customProgramCacheKey = () => 'Na__OrnamentFade__ProfileFallback';
        material.needsUpdate = true;
        return material;
    }
    // ------------------------------------------------------------

    // FUNCTION | The Switch the Profile Pass's Sobel Reads (one uniform object, shared)
    // ------------------------------------------------------------
    function Na__OrnamentFade__GetEnabledUniform() {
        return Na__OrnamentFade__Uniforms.uNaOfEnabled;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Measuring the Loaded Model
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Fat Line's Segments in World Metres, Six Numbers Each
    // ------------------------------------------------------------
    function Na__OrnamentFade__WorldPoints(object) {
        const start = object.geometry.attributes.instanceStart, end = object.geometry.attributes.instanceEnd;
        const points = new Float32Array(start.count * 6);
        const p = new THREE.Vector3();
        object.updateWorldMatrix(true, false);
        for (let i = 0; i < start.count; i++) {
            p.fromBufferAttribute(start, i).applyMatrix4(object.matrixWorld); points[i * 6] = p.x;     points[i * 6 + 1] = p.y; points[i * 6 + 2] = p.z;
            p.fromBufferAttribute(end, i).applyMatrix4(object.matrixWorld);   points[i * 6 + 3] = p.x; points[i * 6 + 4] = p.y; points[i * 6 + 5] = p.z;
        }
        return points;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | The Library Data the GLB Builder Wrote on a Node or One Above It
    // ------------------------------------------------------------
    function Na__OrnamentFade__LibraryOf(object, stopAt) {
        for (let node = object; node && node !== stopAt; node = node.parent) {
            const info = node.userData && node.userData.Na__LibraryAsset;
            if (info) return info;
        }
        return null;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | What One Fat Line Is: Seed, Companion, Exempt, Carries In, How Much Further Off
    // ------------------------------------------------------------
    // Ornament by any of: the GLB Builder's Na__LibraryAsset (newest exports),
    // a library code leading the node's name (older exports of a part placed
    // unrenamed), or a word in Choose__SeedNames (older exports of a renamed one).
    // ------------------------------------------------------------
    function Na__OrnamentFade__Mark(object, stopAt, settings, seeds, beside, exempt, carry, later, notTypes) {
        const name    = object.name || '';
        const library = settings.Choose__LibraryAssets ? Na__OrnamentFade__LibraryOf(object, stopAt) : null;
        const words   = [name, library ? library.Type : '', library ? library.Definition : ''].join(' ');
        const typeOut = !!(library && notTypes && library.Type && notTypes.test(library.Type));
        const seed    = !typeOut && (seeds.test(name) || !!library || (settings.Choose__LibraryAssets && NA__ORNAMENTFADE__LIBRARY_CODE.test(name)));
        return {
            seed,
            companion : beside.test(name),
            exempt    : exempt ? exempt.test(name) : false,
            carry     : carry.test(words),
            scale     : (later && later.test(words)) ? Math.max(1, Number(settings.Fade__FurtherOffScale) || 1) : 1
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | A Part's Box, Grown a Little: [minX, minY, minZ, maxX, maxY, maxZ]
    // ------------------------------------------------------------
    function Na__OrnamentFade__BoxOf(points) {
        if (points.length < 6) return null;
        const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
        for (let o = 0; o < points.length; o += 3) {
            for (let c = 0; c < 3; c++) {
                if (points[o + c] < box[c]) box[c] = points[o + c];
                if (points[o + c] > box[3 + c]) box[3 + c] = points[o + c];
            }
        }
        for (let c = 0; c < 3; c++) { box[c] -= NA__ORNAMENTFADE__BOX_PAD_M; box[3 + c] += NA__ORNAMENTFADE__BOX_PAD_M; }
        return box;
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | The Drawn Fat Lines of Every Category That Names Ornament, Measured
    // ------------------------------------------------------------
    // A category is one GLB's worth: a cresting and the roof it stands on are
    // measured together. One with no node named as a seed is not measured at
    // all: a companion counts only beside a seed, and nothing else ever does.
    // ------------------------------------------------------------
    function Na__OrnamentFade__MeasureModel(modelRoot, settings) {
        const skip   = settings.Choose__SkipCategories ? new RegExp(settings.Choose__SkipCategories, 'i') : null;
        const seeds  = new RegExp(settings.Choose__SeedNames || '(?!)', 'i');
        const beside = new RegExp(settings.Choose__CompanionNames || '(?!)', 'i');
        const exempt = settings.Choose__ExemptNames ? new RegExp(settings.Choose__ExemptNames, 'i') : null;
        const carry  = new RegExp(settings.Choose__CarryInFromNames || '(?!)', 'i');
        const later  = settings.Fade__FurtherOffNames ? new RegExp(settings.Fade__FurtherOffNames, 'i') : null;
        const notTypes = settings.Choose__LibraryExcludeTypes ? new RegExp(settings.Choose__LibraryExcludeTypes, 'i') : null;
        const groups = [];
        modelRoot.children.forEach((category) => {
            if (skip && skip.test(category.name)) return;
            const objects = [];
            category.children.forEach((root) => {
                if (root.userData.Na__ModelType !== 'linework') return;
                root.traverse((object) => {
                    if (!object.isLineSegments2 || !object.material || object.material.visible === false) return;   // <-- Projection-only lines are never drawn in 3D
                    if (!object.geometry || !object.geometry.attributes.instanceStart) return;
                    objects.push(object);
                });
            });
            const marks = objects.map((object) => Na__OrnamentFade__Mark(object, category, settings, seeds, beside, exempt, carry, later, notTypes));
            if (!marks.some((mark) => mark.seed && !mark.exempt)) return;      // <-- Nothing named here: nothing measured, nothing changed
            const carries = marks.some((mark) => mark.seed && mark.carry && !mark.exempt);

            const parts = [];
            objects.forEach((object, n) => {
                const mark = marks[n];
                if (!carries && !mark.seed && !mark.companion) return;        // <-- No cresting here: the named parts alone are measured
                const points = Na__OrnamentFade__WorldPoints(object);
                parts.push(Object.assign({
                    object, points,
                    sizes : Na__OrnamentFade__MeasureCurves(points, Na__OrnamentFade__FieldDefaults.Field__ChainAngleDeg).sizes
                }, mark));
            });
            const field = Na__OrnamentFade__BuildField(parts, { Field__SeedsOnly : true, Field__CarryInMm : settings.Choose__CarryInMm });
            parts.forEach((part) => { part.cover = Na__OrnamentFade__CoverOfSegments(field, part.points, part); });
            const named = new Map();                                          // <-- A seed's mesh carries the same node name as its lines: name -> how much further off it fades
            const boxes = [], boxScales = [];                                 // <-- Round each seed's lines: its flattened mesh is inside
            parts.forEach((part) => {
                if (part.seed !== true) return;
                named.set(part.object.name, part.scale);
                const box = Na__OrnamentFade__BoxOf(part.points);
                if (box) { boxes.push(box); boxScales.push(part.scale); }
            });
            groups.push({ category, parts, field, named, boxes, boxScales });
        });
        return groups;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lifting the Ornament Out Into Its Own Lines
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Fat-Line Geometry Holding Some of Another's Segments
    // ------------------------------------------------------------
    function Na__OrnamentFade__SubsetGeometry(geometry, picks) {
        const startData  = geometry.attributes.instanceStart.data.array;      // <-- Six numbers a segment: start and end, interleaved
        const colour     = geometry.attributes.instanceColorStart;
        const colourData = colour ? colour.data.array : null;
        const positions  = new Float32Array(picks.length * 6), colours = colourData ? new Float32Array(picks.length * 6) : null;
        for (let n = 0; n < picks.length; n++) {
            const from = picks[n] * 6;
            for (let c = 0; c < 6; c++) {
                positions[n * 6 + c] = startData[from + c];
                if (colours) colours[n * 6 + c] = colourData[from + c];
            }
        }
        const subset = new LineSegmentsGeometry();
        subset.setPositions(positions);
        if (colours) subset.setColors(colours);
        subset.computeBoundingBox();
        subset.computeBoundingSphere();
        return subset;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | The Fade's Two Per-Segment Attributes, for Some Segments of a Part
    // ------------------------------------------------------------
    function Na__OrnamentFade__SetSegmentAttributes(geometry, part, picks) {
        const cover = new Float32Array(picks.length * 4), feature = new Float32Array(picks.length * 2);
        for (let n = 0; n < picks.length; n++) {
            for (let k = 0; k < NA__ORNAMENTFADE__LEVELS; k++) cover[n * 4 + k] = part.cover[picks[n] * NA__ORNAMENTFADE__LEVELS + k];
            feature[n * 2]     = part.sizes[picks[n]];
            feature[n * 2 + 1] = part.scale || 1;                             // <-- How many times further off this part fades
        }
        geometry.setAttribute('instanceNaOfCover', new THREE.InstancedBufferAttribute(cover, 4));
        geometry.setAttribute('instanceNaOfFeature', new THREE.InstancedBufferAttribute(feature, 2));
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | One Fat Line: Its Ornament Drawn by a Blending Material, the Rest as It Was
    // ------------------------------------------------------------
    function Na__OrnamentFade__SplitPart(part, settings) {
        const count = part.sizes.length, keepAbove = settings.Fade__BuildingAboveMm / 1000;
        const least = settings.Choose__CarryInShare * NA__ORNAMENTFADE__SPLIT_OF_TONE;
        const busy = [], quiet = [];
        for (let i = 0; i < count; i++) {
            const picked = Na__OrnamentFade__OrnamentOf(part.cover, i) >= least && part.sizes[i] < keepAbove;
            (picked ? busy : quiet).push(i);
        }
        if (busy.length === 0) return null;

        const source = part.object;
        const split  = { source, sourceGeometry : source.geometry, sourceMaterial : source.material, quietGeometry : null, busy : null, whole : false, busySegments : busy.length };

        // ORNAMENT THROUGHOUT: the line itself takes the blending copy. Nothing is added,
        // so a reader of the tree sees the same object holding the same segments.
        if (quiet.length === 0) {
            Na__OrnamentFade__SetSegmentAttributes(source.geometry, part, busy);
            source.material = Na__OrnamentFade__MakeBusyMaterial(split.sourceMaterial);
            split.whole = true;
            return split;
        }

        // PART ORNAMENT: the ornament's segments go to a child on the copy, the rest stay
        const busyGeometry = Na__OrnamentFade__SubsetGeometry(source.geometry, busy);
        Na__OrnamentFade__SetSegmentAttributes(busyGeometry, part, busy);
        const busyObject = new LineSegments2(busyGeometry, Na__OrnamentFade__MakeBusyMaterial(split.sourceMaterial));
        busyObject.computeLineDistances();
        busyObject.name          = source.name;                               // <-- Same name: name-keyed rules (linework modifiers, door pairing) treat it as its line
        busyObject.frustumCulled = source.frustumCulled;
        busyObject.renderOrder   = source.renderOrder;
        busyObject.userData      = Object.assign({}, source.userData, { Na__OrnamentFade__Busy : true });
        source.add(busyObject);                                               // <-- A child at no offset: it follows its line wherever the line goes

        split.quietGeometry = Na__OrnamentFade__SubsetGeometry(source.geometry, quiet);
        source.geometry = split.quietGeometry;
        source.computeLineDistances();
        split.busy = busyObject;
        return split;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attach, Set, Detach
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Push the Settings Into the Shaders
    // ------------------------------------------------------------
    function Na__OrnamentFade__ApplyUniforms() {
        const s = Na__OrnamentFade__Settings, u = Na__OrnamentFade__Uniforms;
        u.uNaOfEnabled.value = (Na__OrnamentFade__State.Attached && s.Enabled && Na__OrnamentFade__State.Splits.length > 0) ? 1 : 0;
        u.uNaOfTone.value    = s.Choose__CarryInShare;
        u.uNaOfSoft.value    = s.Choose__CarryInSoftShare;
        u.uNaOfRange.value.set(s.Fade__StartLineMm / 1000, s.Fade__FullLineMm / 1000);
        u.uNaOfFeaturePx.value.set(s.Fade__DetailBelowPx, s.Fade__StructureAbovePx);
        u.uNaOfKeep.value.set(s.Fade__DetailKeepShare, s.Fade__StructureKeepShare);
        u.uNaOfKeepAbove.value = s.Fade__BuildingAboveMm / 1000;
        u.uNaOfProfile.value.set(s.Fade__ProfileKeepShare, s.Fade__ProfileBarMm / 1000, s.Fade__ProfileThinPx, s.Fade__ProfileWholePx);
        u.uNaOfShow.value    = s.Show__Picked ? 1 : 0;
    }
    // ------------------------------------------------------------

    // FUNCTION | Measure the Loaded Model and Start Drawing Its Ornament Lightly
    // ------------------------------------------------------------
    // context: { scene, modelRoot, getPipeline }. Called once by the loading
    // sequence after the models load; again by Set when a choice changes.
    // ------------------------------------------------------------
    async function Na__OrnamentFade__Attach(context) {
        if (context) Na__OrnamentFade__Context = context;
        const scene = Na__OrnamentFade__Context;
        if (!scene || !scene.modelRoot) return null;
        const config = await Na__OrnamentFade__LoadConfig();
        if (Na__OrnamentFade__State.Attached) Na__OrnamentFade__Detach();
        Na__OrnamentFade__Settings = Object.assign({}, Na__OrnamentFade__Defaults, config, Na__OrnamentFade__Overrides);
        const settings = Na__OrnamentFade__Settings, state = Na__OrnamentFade__State;
        state.Attached = true;
        state.Stats    = { Segments : 0, OrnamentSegments : 0, ObjectsChanged : 0, MeshCorners : 0, HeldBy : {}, Ms : { Measure : 0, SplitAndMeshes : 0 } };
        if (settings.Enabled !== true) { Na__OrnamentFade__ApplyUniforms(); return state.Stats; }

        try {
            const started  = performance.now();
            const groups   = Na__OrnamentFade__MeasureModel(scene.modelRoot, settings);
            const measured = performance.now();

            // 1. The ornament's lines, on their blending material
            groups.forEach((group) => group.parts.forEach((part) => {
                state.Stats.Segments += part.sizes.length;
                const split = Na__OrnamentFade__SplitPart(part, settings);
                if (!split) return;
                state.Splits.push(split);
                state.Stats.OrnamentSegments += split.busySegments;
                const own  = part.object.name.replace(/_ID\d+(_\d+)?$/, '').replace(/__\d+$/, '');
                const name = (own === '' || own === 'Linework') ? 'pieces the exporter flattened into the building' : own;   // <-- The flat node arrives named for its mesh, Linework
                state.Stats.HeldBy[name] = (state.Stats.HeldBy[name] || 0) + split.busySegments;
            }));
            state.Stats.ObjectsChanged = state.Splits.length;

            // 2. The meshes: how much of a profile edge to draw at every corner
            const corner = new THREE.Vector3(), seen = new Set();
            groups.forEach((group) => {
                group.category.children.forEach((root) => {
                    if (root.userData.Na__ModelType !== 'mesh') return;
                    root.traverse((mesh) => {
                        if (!mesh.isMesh || mesh.isLineSegments2 || !mesh.geometry || !mesh.geometry.attributes.position || seen.has(mesh.geometry)) return;
                        seen.add(mesh.geometry);                              // <-- A shared geometry takes its first placement's measure
                        const position = mesh.geometry.attributes.position;
                        const world = new Float32Array(position.count * 3);
                        mesh.updateWorldMatrix(true, false);
                        for (let i = 0; i < position.count; i++) {
                            corner.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
                            world[i * 3] = corner.x; world[i * 3 + 1] = corner.y; world[i * 3 + 2] = corner.z;
                        }
                        mesh.geometry.computeBoundingBox();
                        const meshBox = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
                        const near = [], nearScales = [];                     // <-- Only the named parts' boxes this mesh reaches
                        group.boxes.forEach((box, b) => {
                            if (box[0] <= meshBox.max.x && box[3] >= meshBox.min.x && box[1] <= meshBox.max.y && box[4] >= meshBox.min.y && box[2] <= meshBox.max.z && box[5] >= meshBox.min.z) { near.push(box); nearScales.push(group.boxScales[b]); }
                        });
                        const named = group.named.has(mesh.name);
                        const cover = Na__OrnamentFade__CoverOfMesh(group.field, world, mesh.geometry.index ? mesh.geometry.index.array : null, settings.Fade__BuildingAboveMm / 1000, named, near.length > 0 ? near : null);
                        let any = false;
                        for (let i = 0; i < cover.length && !any; i++) any = cover[i] > 0;
                        if (!any) return;                                     // <-- Nothing busy on it: no attribute, which the profile patch reads as quiet
                        for (let i = 0; i < position.count; i++) {
                            let scale = named ? group.named.get(mesh.name) : 1;   // <-- The first number carries how much further off it fades (the shader never reads that level)
                            for (let b = 0; b < near.length && !named; b++) {
                                const box = near[b];
                                if (world[i * 3] >= box[0] && world[i * 3 + 1] >= box[1] && world[i * 3 + 2] >= box[2] && world[i * 3] <= box[3] && world[i * 3 + 1] <= box[4] && world[i * 3 + 2] <= box[5]) scale = Math.max(scale, nearScales[b]);
                            }
                            cover[i * 4] = scale;
                            cover[i * 4 + 3] = 0;                             // <-- The fourth number is the "measured" flag, not a measure (a named part holds 1 in all four)
                        }
                        mesh.geometry.setAttribute('naOfPatch', new THREE.BufferAttribute(cover, 4));
                        state.MeshParts.push(mesh.geometry);
                        state.Stats.MeshCorners += position.count;
                    });
                });
            });
            state.Stats.Ms = { Measure : Math.round(measured - started), SplitAndMeshes : Math.round(performance.now() - measured) };

            // 3. The profile patch's two per-frame figures, from one blending material
            if (state.Splits.length > 0) {
                const first = state.Splits[0];
                state.LineRef = first.whole ? first.source.material : first.busy.material;
                state.Unhook = Na__SceneHooks__Add(scene.scene, () => {
                    const material = state.LineRef;
                    if (!material) return;
                    Na__OrnamentFade__Uniforms.uNaOfLineRef.value = material.linewidth;
                    if (material.resolution) Na__OrnamentFade__Uniforms.uNaOfResolution.value.copy(material.resolution);
                });
                const pipeline = scene.getPipeline ? scene.getPipeline() : null;
                if (pipeline && pipeline.invalidateProfileLinesCache) pipeline.invalidateProfileLinesCache();   // <-- New fat lines are hidden in the normal pass like the rest
            }
        } catch (error) {
            Na__OrnamentFade__Detach();                                       // <-- Never leave the model half changed
            throw error;
        }

        Na__OrnamentFade__ApplyUniforms();
        Na__RenderLoop__RequestRender();
        if (state.Stats.OrnamentSegments > 0) console.log('[OrnamentFade] ' + state.Stats.OrnamentSegments + ' of ' + state.Stats.Segments + ' segments drawn as ornament (' + (state.Stats.Ms.Measure + state.Stats.Ms.SplitAndMeshes) + ' ms)');
        return state.Stats;
    }
    // ------------------------------------------------------------

    // FUNCTION | Put Everything Back as It Was
    // ------------------------------------------------------------
    function Na__OrnamentFade__Detach() {
        const state = Na__OrnamentFade__State, scene = Na__OrnamentFade__Context;
        state.Splits.forEach((split) => {
            if (split.whole) {
                split.source.material.dispose();
                split.source.material = split.sourceMaterial;
                split.source.geometry.deleteAttribute('instanceNaOfCover');
                split.source.geometry.deleteAttribute('instanceNaOfFeature');
                return;
            }
            if (split.busy.parent) split.busy.parent.remove(split.busy);
            split.busy.geometry.dispose();
            split.busy.material.dispose();
            split.source.geometry = split.sourceGeometry;
            split.source.computeLineDistances();
            split.quietGeometry.dispose();
        });
        state.Splits = [];
        state.MeshParts.forEach((geometry) => geometry.deleteAttribute('naOfPatch'));
        state.MeshParts = [];
        state.LineRef = null;
        if (state.Unhook) { state.Unhook(); state.Unhook = null; }
        const pipeline = scene && scene.getPipeline ? scene.getPipeline() : null;
        if (pipeline && pipeline.invalidateProfileLinesCache) pipeline.invalidateProfileLinesCache();
        state.Attached = false;
        Na__OrnamentFade__ApplyUniforms();
        Na__RenderLoop__RequestRender();
        return { Detached : true };
    }
    // ------------------------------------------------------------

    // FUNCTION | Change Settings for This Page: a Fade Figure Is a Uniform, a Choice Is a Fresh Measure
    // ------------------------------------------------------------
    async function Na__OrnamentFade__Set(settings) {
        const before = Object.assign({}, Na__OrnamentFade__Settings);
        Object.assign(Na__OrnamentFade__Overrides, settings || {});
        Object.assign(Na__OrnamentFade__Settings, settings || {});
        const measureAgain = NA__ORNAMENTFADE__MEASURE_AGAIN.some((key) => before[key] !== Na__OrnamentFade__Settings[key]);
        if (!Na__OrnamentFade__State.Attached || measureAgain) return Na__OrnamentFade__Attach();
        Na__OrnamentFade__ApplyUniforms();
        Na__RenderLoop__RequestRender();
        return Na__OrnamentFade__State.Stats;
    }
    // ------------------------------------------------------------

    // FUNCTION | Read the Settings, the Defaults and What Was Found
    // ------------------------------------------------------------
    function Na__OrnamentFade__GetSettings() { return Object.assign({}, Na__OrnamentFade__Settings); }
    function Na__OrnamentFade__GetStats()    { return Na__OrnamentFade__State.Stats; }
    function Na__OrnamentFade__IsAttached()  { return Na__OrnamentFade__State.Attached; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__OrnamentFade__Attach,
        Na__OrnamentFade__Detach,
        Na__OrnamentFade__Set,
        Na__OrnamentFade__GetSettings,
        Na__OrnamentFade__GetStats,
        Na__OrnamentFade__IsAttached,
        Na__OrnamentFade__PatchProfileFallback,
        Na__OrnamentFade__GetEnabledUniform
    };

// endregion -------------------------------------------------------------------
