// =============================================================================
// VALEVISION3D - VEGETATION - SCENE LAYER
// =============================================================================
//
// FILE       : Na__Vegetation__SceneLayer__.js
// NAMESPACE  : Na__VegLayer
// MODULE     : System - Vegetation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Hold the plants in the scene: the light proxies an artist works with,
//              and the lines and fill drawn from them for whichever camera is about
//              to render
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - THE PROXY / RENDERED SPLIT (Adam, 04-Nov-2026: "keep assets lightweight for
//   working with and have the renderer doo the work when it loads a view"). A plop
//   is one small record. The proxy is a 108 triangle dome. Everything else is
//   worked out for the camera, and none of it is ever saved.
// - FOUR DRAW CALLS, HOWEVER MANY PLANTS: outlines, inner lines, fill and proxies.
// - EACH PLANT OWNS A SLOT in the shared buffers, so one can be redrawn without
//   touching the rest and only what changed goes to the GPU. A slot with spare room is
//   written in place; one outgrown moves to the top of the buffer and leaves a blanked
//   hole, and the holes are squeezed out when the camera next rests. A blanked segment
//   has zero length, which the fat line shader turns into nothing at all. The buffers
//   start small and grow, so a handful of plants on a tablet costs a handful of memory.
// - WHICH PLANTS REDRAW, AND HOW, is worked out with the frame budget: a live frame may
//   do part of the job, and every other render does all of it. The three kinds of
//   drawing are set out in Na__Vegetation__FrameBudget__.js.
// - THE RENDER HOOK. Stills, tiles, thumbnails, video frames and sheet pictures each
//   call the effect chain in their own copy (note 10, trap T4), so nothing here is
//   called from them. scene.onBeforeRender fires inside every renderer.render, for
//   whichever camera is about to draw, including on paths nobody has written yet. A
//   render with the same view again is one comparison, and a frame has three of them.
// - NOT THROUGH A DRAWING. An orthographic camera sees no plants until the drawings
//   stage (plan, D04), so no existing plan, elevation or sheet moves. A camera that
//   has switched off layer 0 is an Export Render Layers pass, drawing only what it
//   classified for itself: no plants there either, and no work done for them.
// - THE SAME LINE AS THE MODEL. LineSegments2 and LineMaterial with the loader's own
//   log depth bias (Na__ModelLoader__MultiModel.js, UpgradeLineworkRoot), under a group
//   tagged as linework, so export line weights reach them as they reach a window.
// - HIDING. A fat line is never hidden with .visible: the profile line pre-pass
//   forces every cached fat line visible again (rule 10). Their counts are emptied
//   instead, and the root group's .visible stops the whole walk.
// - THE FILL'S NORMAL POINTS AT THE EYE, though its material is unlit. The profile
//   lines run a Sobel over a normal buffer with an override material, and a bush must
//   not outline every ball in it. So the whole fill shares ONE normal, an instanced
//   attribute of a single value, square to the camera, which is also exactly the colour
//   the normal buffer clears to: the Sobel sees nothing on a bush and nothing round it
//   against the sky. The walls' own edges behind it are still masked. A camera move
//   costs three numbers, however many plants there are.
// - UNDER MAXENGINE'S AO THE FILL MARKS ITSELF. It has to be in the normal and depth
//   passes for the reason above, and SSAO reading a stack of flat discs turns a bush
//   into a bunch of grapes; out of those passes (layer 1, as foliage goes) the walls'
//   edges run straight through it. Tried, and neither will do. So while AO is running it
//   writes alpha 0 and the AO pass leaves those pixels alone. Alpha 0 must never reach
//   the page, and the AO blur is what sets it back to 1: with AO off, it writes alpha 1.
// - DETAIL IS MEASURED AGAINST THE LINE WEIGHT, not raw pixels. An export draws its
//   lines heavier by its export scale, so it asks for the view at the size it would be
//   if its lines were the screen's. A 6000 px still therefore has the picture the screen
//   has, only sharper: the outline is sampled more finely, and nothing else changes.
//
// INTEGRATION:
// - Driven by Na__Vegetation__Runtime__.js in the app, and by the test bench in
//   85__EarlyStage__VegetationLinework, which draws through this same file.
// - options.host carries everything it needs from the app, so it imports nothing of
//   the app's: getLiveFrame, getExportScale, getClipList, requestFrame, isAoRunning,
//   registerOverlay, setOverlayWanted. Without a host every draw is a full one.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 04-Nov-2026 - Version 1.0.0 (ValeVision3D v2.84.0)
// - Moved in from the prototype's Na__VegLine__SceneLayer__.js, where the look was
//   agreed: Stage 2 of ValeVision__PLAN__VegetationSystem__.md. New here: the slots,
//   the budget, the render hook, section cuts, the single normal, the linework group,
//   buffers that grow, and proxies built only when someone asks to see them.
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
    import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
    import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Builder, Drawer, Budget and Rules
    // ------------------------------------------------------------
    import { Na__VegBuild__BuildPlant } from '../01__Core__Engine/Na__Vegetation__BushBuilder__.js';
    import {
        Na__VegContour__CreateOut,
        Na__VegContour__ResetOut,
        Na__VegContour__DrawBush
    } from '../01__Core__Engine/Na__Vegetation__Contour__.js';
    import {
        Na__VegBudget__ReadTuning,
        Na__VegBudget__MovingStyle,
        Na__VegBudget__NoteDrawn,
        Na__VegBudget__Rank,
        Na__VegBudget__Spend
    } from './Na__Vegetation__FrameBudget__.js';
    import {
        Na__VegData__LineRulesToStyle,
        Na__VegData__LineRulesToFactors
    } from '../02__Core__Data/Na__Vegetation__SceneData__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Buffer Sizes
    // ------------------------------------------------------------
    const Na__VegLayer__SCRATCH_OUTER = 200000;                                // <-- One plant, at the worst close up
    const Na__VegLayer__SCRATCH_INNER = 60000;
    const Na__VegLayer__SCRATCH_FILL  = 600000;
    const Na__VegLayer__START_OUTER   = 40000;                                 // <-- The shared buffers start here and grow
    const Na__VegLayer__START_INNER   = 10000;
    const Na__VegLayer__START_FILL    = 160000;
    const Na__VegLayer__MAX_OUTER     = 4000000;                               // <-- Past this a plant loses lines rather than the page its memory
    const Na__VegLayer__MAX_INNER     = 1500000;
    const Na__VegLayer__MAX_FILL      = 12000000;
    const Na__VegLayer__GROWTH        = 1.6;
    const Na__VegLayer__HEADROOM      = 1.25;                                  // <-- A slot's spare room: its plant's next view usually fits
    const Na__VegLayer__SLACK_ITEMS   = 8;
    const Na__VegLayer__USED_SHARE    = 0.55;                                  // <-- Squeezed when the camera rests with less than this of a buffer in use
    const Na__VegLayer__SQUEEZE_ITEMS = 4096;                                  // <-- Too small a buffer to be worth it
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Proxy Look
    // ------------------------------------------------------------
    const Na__VegLayer__PROXY_FILL    = 0xe6ede1;                              // <-- A pale sage, so a proxy is never mistaken for model
    const Na__VegLayer__PROXY_LINE    = 0x5f7a66;
    const Na__VegLayer__PROXY_RINGS   = 5;
    const Na__VegLayer__PROXY_SECTORS = 10;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Materials
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Number as GLSL Wants It
    // ------------------------------------------------------------
    function Na__VegLayer__GlslFloat(value) {
        const text = String(value);
        return (text.indexOf('.') >= 0 || text.indexOf('e') >= 0) ? text : text + '.0';
    }
    // ------------------------------------------------------------


    // FUNCTION | Make a Fat Line Material with the Loader's Depth Bias
    // ------------------------------------------------------------
    // @delegate: ../../15__ModelLoader/Na__ModelLoader__MultiModel.js
    // The same patch as UpgradeLineworkRoot, so plants' lines sit on their faces
    // exactly as a project's do: a share of log depth through a perspective camera, a
    // distance through an orthographic one.
    // ------------------------------------------------------------
    function Na__VegLayer__MakeLineMaterial(colour, widthPx, depthBias, orthoBiasMm, resolution) {
        const material = new LineMaterial({
            color               : colour,
            linewidth           : widthPx,
            resolution          : resolution,
            worldUnits          : false,
            depthTest           : true,
            depthWrite          : true,
            polygonOffset       : true,
            polygonOffsetFactor : -4,
            polygonOffsetUnits  : -4
        });
        const bias   = Na__VegLayer__GlslFloat(depthBias);
        const orthoB = Na__VegLayer__GlslFloat(orthoBiasMm / 1000);
        material.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader
                .replace('#include <logdepthbuf_pars_vertex>', `#include <logdepthbuf_pars_vertex>
                varying float vNaOrthoDepthPerUnit;`)
                .replace('#include <logdepthbuf_vertex>', `#include <logdepthbuf_vertex>
                vNaOrthoDepthPerUnit = abs( projectionMatrix[ 2 ][ 2 ] ) * 0.5;`);
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <logdepthbuf_pars_fragment>', `#include <logdepthbuf_pars_fragment>
                varying float vNaOrthoDepthPerUnit;`)
                .replace('#include <logdepthbuf_fragment>', `#include <logdepthbuf_fragment>
                #ifdef USE_LOGARITHMIC_DEPTH_BUFFER
                if (gl_FragDepth > 0.0) {
                    gl_FragDepth -= (vIsPerspective == 0.0) ? (${orthoB} * vNaOrthoDepthPerUnit) : ${bias};
                }
                #endif`);
        };
        material.customProgramCacheKey = () => 'naVegLineBias' + bias + orthoB;
        return material;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shared Buffers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Shared Buffer and Where Its Top Is
    // ------------------------------------------------------------
    // Items are line segments of 6 floats, or fill vertices of 3. attribute is what
    // uploads it, set when it is bound to a geometry. A slot's room is a whole number of
    // primitives, or every plant after it would come out shifted: a fill triangle is
    // three vertices read in threes from the start of the buffer.
    // ------------------------------------------------------------
    function Na__VegLayer__MakeArena(startItems, maxItems, floatsPerItem, itemsPerPrimitive) {
        return {
            array     : new Float32Array(startItems * floatsPerItem),
            cap       : startItems,
            maxCap    : maxItems,
            per       : floatsPerItem,
            primitive : itemsPerPrimitive,
            top       : 0,
            attribute : null,
            rebind    : null
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Room a Slot Takes for So Many Items
    // ------------------------------------------------------------
    function Na__VegLayer__RoomFor(arena, items) {
        if (items <= 0) return 0;
        const room = Math.ceil(items * Na__VegLayer__HEADROOM) + Na__VegLayer__SLACK_ITEMS;
        return Math.ceil(room / arena.primitive) * arena.primitive;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Make a Shared Buffer Hold at Least So Many Items
    // ------------------------------------------------------------
    // A GPU buffer cannot be resized, so growing means a new one and a new geometry
    // over it. False when it would pass the limit.
    // ------------------------------------------------------------
    function Na__VegLayer__EnsureRoom(arena, items) {
        if (items <= arena.cap) return true;
        if (items > arena.maxCap) return false;
        let cap = arena.cap;
        while (cap < items) cap = Math.ceil(cap * Na__VegLayer__GROWTH);
        cap = Math.min(cap, arena.maxCap);
        const bigger = new Float32Array(cap * arena.per);
        bigger.set(arena.array.subarray(0, arena.top * arena.per));
        arena.array = bigger;
        arena.cap   = cap;
        arena.rebind();
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Say Which Part of a Shared Buffer Must Go to the GPU
    // ------------------------------------------------------------
    function Na__VegLayer__MarkChanged(arena, at, items) {
        arena.attribute.addUpdateRange(at * arena.per, items * arena.per);
        arena.attribute.needsUpdate = true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write One Plant's Items into Its Slot
    // ------------------------------------------------------------
    // slot is { at, cap, n }. What is left of the last draw is blanked, so a plant that
    // now needs fewer segments leaves no old lines behind it.
    // ------------------------------------------------------------
    function Na__VegLayer__WriteSlot(arena, slot, source, count) {
        const per = arena.per;
        if (count > slot.cap) {
            const cap = Na__VegLayer__RoomFor(arena, count);
            if (!Na__VegLayer__EnsureRoom(arena, arena.top + cap)) return;     // <-- At the limit: this plant keeps its last lines
            if (slot.n > 0) {
                arena.array.fill(0, slot.at * per, (slot.at + slot.n) * per);
                Na__VegLayer__MarkChanged(arena, slot.at, slot.n);
            }
            slot.at  = arena.top;
            slot.cap = cap;
            slot.n   = 0;
            arena.top += cap;
        }
        if (count > 0) arena.array.set(source.subarray(0, count * per), slot.at * per);
        if (count < slot.n) arena.array.fill(0, (slot.at + count) * per, (slot.at + slot.n) * per);
        const touched = Math.max(count, slot.n);
        if (touched > 0) Na__VegLayer__MarkChanged(arena, slot.at, touched);
        slot.n = count;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Squeeze the Holes Out of a Shared Buffer
    // ------------------------------------------------------------
    // A fresh array rather than moving things in place: with a slot's room being worked
    // out again, one can land further up than it was. Only ever when the camera is at
    // rest, so one upload of the lot goes unnoticed.
    // ------------------------------------------------------------
    function Na__VegLayer__Compact(arena, plants, slotKey) {
        const per = arena.per;
        let needed = 0;
        plants.forEach((plant) => { needed += Na__VegLayer__RoomFor(arena, plant[slotKey].n); });

        const cap   = Math.max(arena.cap, Math.min(needed, arena.maxCap));
        const fresh = new Float32Array(cap * per);
        let top = 0;
        plants.forEach((plant) => {
            const slot = plant[slotKey];
            if (slot.n > 0) fresh.set(arena.array.subarray(slot.at * per, (slot.at + slot.n) * per), top * per);
            slot.at  = top;
            slot.cap = Na__VegLayer__RoomFor(arena, slot.n);
            top += slot.cap;
        });

        const sameSize = (cap === arena.cap);
        arena.array = fresh;
        arena.cap   = cap;
        arena.top   = top;
        if (sameSize) {
            arena.attribute.array = fresh;
            arena.attribute.clearUpdateRanges();
            Na__VegLayer__MarkChanged(arena, 0, top);
        } else {
            arena.rebind();
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Layer
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Layer
    // ------------------------------------------------------------
    // options: { scene, recipes, lineRules, lineColour, resolution, frameBudget, host }
    // ------------------------------------------------------------
    function Na__VegLayer__Create(options) {
        const scene   = options.scene;
        const host    = options.host || {};
        const tuning  = Na__VegBudget__ReadTuning(options.frameBudget);
        const scratch = Na__VegContour__CreateOut(Na__VegLayer__SCRATCH_OUTER, Na__VegLayer__SCRATCH_INNER, Na__VegLayer__SCRATCH_FILL);

        const rules    = options.lineRules;
        const advanced = rules.Vegetation__LineRules__Advanced;
        const style    = Na__VegData__LineRulesToStyle(rules);
        const factors  = Na__VegData__LineRulesToFactors(rules);
        const weightPx = rules.Vegetation__LineRules__LineWeightPx;
        const biasLog  = advanced.Vegetation__LineRulesAdvanced__DepthBias;
        const tone     = advanced.Vegetation__LineRulesAdvanced__FillTone;

        let recipes = options.recipes || [];

        // THE TREE | Only the lines sit under the linework tag: the profile pass must keep
        // the fill among its meshes (it masks the wall's edges), and it leaves anything
        // tagged linework out of them.
        const root = new THREE.Group();
        root.name = 'Na__Vegetation__Root';
        const lineGroup = new THREE.Group();
        lineGroup.name = 'Na__Vegetation__Lines';
        lineGroup.userData.Na__ModelType = 'linework';                         // <-- Export line weights reach what is under this tag (T14)
        root.add(lineGroup);

        // THE LINES
        const outerArena = Na__VegLayer__MakeArena(Na__VegLayer__START_OUTER, Na__VegLayer__MAX_OUTER, 6, 1);
        const innerArena = Na__VegLayer__MakeArena(Na__VegLayer__START_INNER, Na__VegLayer__MAX_INNER, 6, 1);
        const fillArena  = Na__VegLayer__MakeArena(Na__VegLayer__START_FILL, Na__VegLayer__MAX_FILL, 3, 3);

        const outerMaterial = Na__VegLayer__MakeLineMaterial(options.lineColour, weightPx, biasLog, 2, options.resolution);
        const innerMaterial = Na__VegLayer__MakeLineMaterial(options.lineColour, weightPx * rules.Vegetation__LineRules__InnerWeightShare, biasLog, 2, options.resolution);

        // SUB FUNCTION | A Fat Line Object over a Shared Buffer
        // ------------------------------------------------------------
        function makeLine(arena, material, name) {
            const line = new LineSegments2(new LineSegmentsGeometry(), material);
            line.name          = name;
            line.frustumCulled = false;                                        // <-- The bounds change with every view
            line.renderOrder   = 999;
            line.raycast       = () => {};                                     // <-- No pick of the model's stops on a plant
            arena.rebind = () => {
                const previous = line.geometry;
                const buffer   = new THREE.InstancedInterleavedBuffer(arena.array, 6, 1);
                buffer.setUsage(THREE.DynamicDrawUsage);
                const geometry = new LineSegmentsGeometry();
                geometry.setAttribute('instanceStart', new THREE.InterleavedBufferAttribute(buffer, 3, 0));
                geometry.setAttribute('instanceEnd', new THREE.InterleavedBufferAttribute(buffer, 3, 3));
                geometry.instanceCount = 0;
                line.geometry   = geometry;                                    // <-- A new geometry too: three caches its instance limit on the old
                arena.attribute = buffer;
                previous.dispose();
            };
            arena.rebind();
            lineGroup.add(line);
            return line;
        }
        // ------------------------------------------------------------

        const outerLine = makeLine(outerArena, outerMaterial, 'Na__Vegetation__OuterLines');
        const innerLine = makeLine(innerArena, innerMaterial, 'Na__Vegetation__InnerLines');

        // THE FILL | ONE TONE FROM EVERY SIDE. Unlit: a lit fill facing the eye went grey
        // whenever the camera came round away from the sun, and the planting looked dirty
        // against the walls. Set in working space, because the composer's route is raw.
        const fillMaterial = new THREE.MeshBasicMaterial({
            color : new THREE.Color().setRGB(tone, tone, tone, THREE.LinearSRGBColorSpace),
            side  : THREE.DoubleSide
        });
        const fillNormal = new THREE.InstancedBufferAttribute(new Float32Array([0, 0, 1]), 3, false, 1);
        fillNormal.setUsage(THREE.DynamicDrawUsage);

        const fillMesh = new THREE.Mesh(new THREE.BufferGeometry(), fillMaterial);
        fillMesh.name          = 'Na__Vegetation__Fill';
        fillMesh.frustumCulled = false;
        fillMesh.raycast       = () => {};
        fillArena.rebind = () => {
            const previous = fillMesh.geometry;
            const position = new THREE.BufferAttribute(fillArena.array, 3);
            position.setUsage(THREE.DynamicDrawUsage);
            const geometry = new THREE.InstancedBufferGeometry();
            geometry.setAttribute('position', position);
            geometry.setAttribute('normal', fillNormal);                       // <-- One value for all, read once per instance, and there is one instance
            geometry.instanceCount = 1;
            geometry.setDrawRange(0, 0);
            fillMesh.geometry   = geometry;
            fillArena.attribute = position;
            previous.dispose();
        };
        fillArena.rebind();
        root.add(fillMesh);

        // THE PROXIES | Merged, and built only when someone asks to see them. An aid, so
        // in the app they are an interactive overlay: no render but a live frame sees them.
        const proxyRoot = new THREE.Group();
        proxyRoot.name = 'Na__Vegetation__Proxies';
        const proxyMaterial = new THREE.MeshStandardMaterial({
            color               : Na__VegLayer__PROXY_FILL,
            roughness           : 1,
            metalness           : 0,
            side                : THREE.DoubleSide,
            polygonOffset       : true,
            polygonOffsetFactor : 2,
            polygonOffsetUnits  : 2
        });
        const proxyMesh = new THREE.Mesh(new THREE.BufferGeometry(), proxyMaterial);
        proxyMesh.name    = 'Na__Vegetation__ProxyFill';
        proxyMesh.visible = false;
        proxyMesh.raycast = () => {};
        proxyRoot.add(proxyMesh);

        const proxyLineMaterial = Na__VegLayer__MakeLineMaterial(Na__VegLayer__PROXY_LINE, 0.9, 0.00015, 2, options.resolution);
        proxyLineMaterial.visible = false;
        const proxyLine = new LineSegments2(new LineSegmentsGeometry(), proxyLineMaterial);
        proxyLine.name        = 'Na__Vegetation__ProxyLines';
        proxyLine.renderOrder = 998;
        proxyLine.raycast     = () => {};
        proxyRoot.add(proxyLine);
        root.add(proxyRoot);
        if (host.registerOverlay) host.registerOverlay(proxyRoot);

        scene.add(root);

        const state = {
            plops      : [],
            plants     : [],
            rank       : [],
            mode       : 'rendered',
            dirty      : true,
            fullNext   : true,                                                 // <-- The first live frame, and the one after any other render, draw the lot
            budgetFrame: 0,                                                    // <-- The live frame that last spent a budget
            stale      : 0,
            stamp      : 0,
            proxyDirty : true,
            shown      : true,
            failed     : false,
            exportScale: 1,
            drawStyle  : style,
            movingStyle: Na__VegBudget__MovingStyle(style, tuning),
            drawingExact : true,
            fillMasked : false,
            signature  : new Float64Array(21),
            hasView    : false,
            stats      : {
                plants : 0, lobes : 0, bushes : 0, outer : 0, inner : 0, fillTris : 0, proxyTris : 0, buildMs : 0,
                drawMs : 0, drawn : 0, waiting : 0, lastFullMs : 0, lastFullDrawn : 0, buffersMb : 0, compactions : 0,
                worstErrorPx : 0, kind : 'none'
            }
        };

        const view = {
            eyeX : 0, eyeY : 0, eyeZ : 0, fwdX : 0, fwdY : 0, fwdZ : -1, upX : 0, upY : 1, upZ : 0, rightX : 1, rightY : 0, rightZ : 0,
            isOrtho : false, focalPx : 1, halfWidthPx : 1, halfHeightPx : 1
        };
        const sizeVector = new THREE.Vector2();
        const nowMs      = () => performance.now();

        // SUB FUNCTION | Find an Asset's Recipe
        // ------------------------------------------------------------
        function findRecipe(assetId) {
            for (let k = 0; k < recipes.length; k++) {
                if (recipes[k].Asset__Id === assetId) return recipes[k];
            }
            return null;
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | A New Plant from a Plop, or Null If It Cannot Be Built
        // ------------------------------------------------------------
        function makePlant(plop) {
            const recipe = findRecipe(plop.assetId);
            const bush   = recipe ? Na__VegBuild__BuildPlant(recipe, plop, factors) : null;
            if (!bush) return null;
            return {
                plop,
                bush,
                outer         : { at : 0, cap : 0, n : 0 },
                inner         : { at : 0, cap : 0, n : 0 },
                fill          : { at : 0, cap : 0, n : 0 },
                lobes         : 0,
                everDrawn     : false,
                exactStamp    : 0,
                dirX          : 0,
                dirY          : 0,
                dirZ          : 0,
                radiusPx      : 0,
                drawnRadiusPx : 0,
                errorPx       : 0
            };
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Empty a Shared Buffer
        // ------------------------------------------------------------
        function clearArena(arena) {
            if (arena.top > 0) {
                arena.array.fill(0, 0, arena.top * arena.per);
                Na__VegLayer__MarkChanged(arena, 0, arena.top);
            }
            arena.top = 0;
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Rebuild Every Plant from Its Plop
        // ------------------------------------------------------------
        function rebuildPlants() {
            const t0 = nowMs();
            state.plants = state.plops.map(makePlant).filter(Boolean);
            clearArena(outerArena);
            clearArena(innerArena);
            clearArena(fillArena);
            state.stats.buildMs = nowMs() - t0;
            state.stats.plants  = state.plants.length;
            state.dirty      = true;
            state.proxyDirty = true;
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Rebuild the Merged Proxies
        // ------------------------------------------------------------
        function rebuildProxies() {
            state.proxyDirty = false;
            const parts = [], lines = [];
            const matrix = new THREE.Matrix4();
            const quat   = new THREE.Quaternion();
            const up     = new THREE.Vector3(0, 1, 0);

            state.plops.forEach((plop) => {
                const sizeM = plopSizeM(plop);
                if (!sizeM) return;
                const dome  = new THREE.SphereGeometry(1, Na__VegLayer__PROXY_SECTORS, Na__VegLayer__PROXY_RINGS, 0, Math.PI * 2, 0, Math.PI / 2);
                quat.setFromAxisAngle(up, ((plop.yawDeg || 0) * Math.PI) / 180);
                matrix.compose(
                    new THREE.Vector3(plop.positionMm[0] / 1000, plop.positionMm[1] / 1000, plop.positionMm[2] / 1000),
                    quat,
                    new THREE.Vector3(sizeM[0] / 2, sizeM[2], sizeM[1] / 2)
                );
                const edges = new THREE.EdgesGeometry(dome, 1);
                edges.applyMatrix4(matrix);
                dome.applyMatrix4(matrix);
                parts.push(dome);
                lines.push(edges.attributes.position.array);
            });

            proxyMesh.geometry.dispose();
            if (parts.length > 0) {
                proxyMesh.geometry = mergeGeometries(parts, false);
                state.stats.proxyTris = (proxyMesh.geometry.index ? proxyMesh.geometry.index.count : proxyMesh.geometry.attributes.position.count) / 3;
            } else {
                proxyMesh.geometry = new THREE.BufferGeometry();
                state.stats.proxyTris = 0;
            }

            let total = 0;
            lines.forEach((a) => { total += a.length; });
            const joined = new Float32Array(total);
            let at = 0;
            lines.forEach((a) => { joined.set(a, at); at += a.length; });

            proxyLine.geometry.dispose();
            const geometry = new LineSegmentsGeometry();
            if (total > 0) geometry.setPositions(joined);
            proxyLine.geometry = geometry;
            proxyLine.frustumCulled = false;
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Resolve a Plop's Size (Its Own, or Its Recipe's), in Metres
        // ------------------------------------------------------------
        function plopSizeM(plop) {
            const recipe = findRecipe(plop.assetId);
            if (!recipe) return null;
            const size = recipe.Asset__Size;
            const mm   = plop.sizeMm || [size.Size__WidthMm, size.Size__DepthMm, size.Size__HeightMm];
            return [mm[0] / 1000, mm[1] / 1000, mm[2] / 1000];
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Put the Draw Counts on the Objects
        // ------------------------------------------------------------
        function showCounts() {
            outerLine.geometry.instanceCount = outerArena.top;
            innerLine.geometry.instanceCount = innerArena.top;
            fillMesh.geometry.setDrawRange(0, fillArena.top);
            state.shown = true;
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Draw Nothing for This One Render
        // ------------------------------------------------------------
        function hideCounts() {
            outerLine.geometry.instanceCount = 0;
            innerLine.geometry.instanceCount = 0;
            fillMesh.geometry.setDrawRange(0, 0);
            state.shown = false;
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Is This the View the Plants Were Last Asked For?
        // ------------------------------------------------------------
        // Reads the camera's unjittered parts only, so a refiner's or a supersampler's
        // sub-pixel samples never redraw the lines. Keeps the new one when it is not.
        // ------------------------------------------------------------
        function isSameView(camera, widthPx, heightPx, exportScale) {
            const e = camera.matrixWorld.elements;
            const s = state.signature;
            let same = state.hasView;
            for (let k = 0; k < 16; k++) {
                if (s[k] !== e[k]) { s[k] = e[k]; same = false; }
            }
            const fov = camera.isOrthographicCamera ? 0 : camera.fov;
            const zoom = camera.zoom;
            if (s[16] !== fov)         { s[16] = fov;         same = false; }
            if (s[17] !== zoom)        { s[17] = zoom;        same = false; }
            if (s[18] !== widthPx)     { s[18] = widthPx;     same = false; }
            if (s[19] !== heightPx)    { s[19] = heightPx;    same = false; }
            if (s[20] !== exportScale) { s[20] = exportScale; same = false; }
            state.hasView = true;
            return same;
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Work Out the View the Drawer Wants
        // ------------------------------------------------------------
        function readView(camera, widthPx, heightPx, exportScale) {
            const e = camera.matrixWorld.elements;
            const halfH = (heightPx / exportScale) * 0.5;

            view.eyeX = e[12]; view.eyeY = e[13]; view.eyeZ = e[14];
            view.fwdX = -e[8]; view.fwdY = -e[9]; view.fwdZ = -e[10];
            view.upX = e[4]; view.upY = e[5]; view.upZ = e[6];
            view.rightX = e[0]; view.rightY = e[1]; view.rightZ = e[2];
            view.isOrtho = !!camera.isOrthographicCamera;
            view.focalPx = camera.isOrthographicCamera
                ? ((heightPx / exportScale) * camera.zoom) / (camera.top - camera.bottom)
                : (halfH * camera.zoom) / Math.tan((camera.fov * Math.PI) / 360);
            view.halfWidthPx  = (widthPx / exportScale) * 0.5;
            view.halfHeightPx = halfH;

            // ONLY THE SAMPLING FOLLOWS THE REAL PIXELS | See the header
            if (exportScale !== state.exportScale) {
                state.exportScale = exportScale;
                state.drawStyle   = (exportScale === 1) ? style : Object.assign({}, style, { segmentPx : style.segmentPx / exportScale });
            }

            // ALL FACING THE EYE | See the header: no Sobel lines on a plant
            const n = fillNormal.array;
            n[0] = -view.fwdX; n[1] = -view.fwdY; n[2] = -view.fwdZ;
            fillNormal.needsUpdate = true;
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Draw One Plant into Its Slots
        // ------------------------------------------------------------
        function drawPlant(plant) {
            Na__VegContour__ResetOut(scratch);
            Na__VegContour__DrawBush(plant.bush, view, state.drawingExact ? state.drawStyle : state.movingStyle, scratch);
            Na__VegLayer__WriteSlot(outerArena, plant.outer, scratch.outer, scratch.outerCount);
            Na__VegLayer__WriteSlot(innerArena, plant.inner, scratch.inner, scratch.innerCount);
            Na__VegLayer__WriteSlot(fillArena, plant.fill, scratch.fill, scratch.fillCount);
            plant.lobes = scratch.drawnLobes;
            Na__VegBudget__NoteDrawn(plant, view, state.stamp, state.drawingExact);
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Bring the Numbers Up to Date
        // ------------------------------------------------------------
        function noteStats(drawn, waiting, ms, wasFull) {
            let lobes = 0, bushes = 0, outerN = 0, innerN = 0, fillN = 0;
            for (let p = 0; p < state.plants.length; p++) {
                const plant = state.plants[p];
                outerN += plant.outer.n;
                innerN += plant.inner.n;
                fillN  += plant.fill.n;
                if (plant.radiusPx >= 0) { lobes += plant.lobes; bushes++; }
            }
            const stats = state.stats;
            stats.lobes    = lobes;
            stats.bushes   = bushes;
            stats.outer    = outerN;
            stats.inner    = innerN;
            stats.fillTris = fillN / 3;
            stats.drawMs   = ms;
            stats.drawn    = drawn;
            stats.waiting  = waiting;
            if (wasFull && drawn > 0) {
                stats.lastFullMs    = ms;
                stats.lastFullDrawn = drawn;
            }
            stats.buffersMb = (outerArena.array.byteLength + innerArena.array.byteLength + fillArena.array.byteLength) / 1048576;
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Squeeze the Holes Out, If There Are Enough to Matter
        // ------------------------------------------------------------
        function compactIfWasteful() {
            [[outerArena, 'outer'], [innerArena, 'inner'], [fillArena, 'fill']].forEach(([arena, key]) => {
                if (arena.top < Na__VegLayer__SQUEEZE_ITEMS) return;
                let used = 0;
                state.plants.forEach((plant) => { used += plant[key].n; });
                if (used < arena.top * Na__VegLayer__USED_SHARE) {
                    Na__VegLayer__Compact(arena, state.plants, key);
                    state.stats.compactions++;
                }
            });
        }
        // ------------------------------------------------------------


        // SUB FUNCTION | Bring the Plants Up to Date for a View
        // ------------------------------------------------------------
        // liveFrame numbers the live loop's own frames, the only kind with a budget, and
        // then only while the view is changing from one frame to the next. It is 0 on any
        // other render. Returns true when the picture changed.
        // ------------------------------------------------------------
        function syncToView(camera, widthPx, heightPx, exportScale, liveFrame) {
            const same   = isSameView(camera, widthPx, heightPx, exportScale);
            const isLive = liveFrame > 0;
            if (same && !state.dirty) {
                if (state.stale === 0) return false;                           // <-- Three of these a frame: one comparison each
                if (isLive && liveFrame === state.budgetFrame) return false;   // <-- The frame's later passes draw what its first drew. A LATER frame with this view means the camera has stopped
            }

            if (!same) readView(camera, widthPx, heightPx, exportScale);
            if (!same || state.dirty) state.stamp++;                           // <-- Every plant is now out of date for this view

            // WHICH KIND OF DRAWING | See the frame budget's header
            const isFull   = !isLive || state.fullNext || state.dirty;
            const isMoving = !isFull && !same;
            if (isLive) state.budgetFrame = liveFrame;
            state.dirty        = false;
            state.fullNext     = !isLive;                                      // <-- This render's lines belong to its own camera: the next live frame starts again
            state.drawingExact = !isMoving;

            const startedAt = nowMs();
            const count = Na__VegBudget__Rank(state.plants, view, state.stamp, tuning, state.rank);
            let budgetMs = null, minErrorPx = 0;
            if (isMoving) {
                budgetMs   = tuning.movingMs;
                minErrorPx = tuning.staleErrorPx;
            } else if (!isFull) {
                budgetMs   = tuning.settlingMs;
            }
            state.stats.worstErrorPx = (count > 0 && state.rank[0].everDrawn) ? state.rank[0].errorPx : 0;
            const drawn = Na__VegBudget__Spend(state.rank, count, budgetMs, minErrorPx, drawPlant, nowMs);

            // A MOVING FRAME'S DRAWING IS NEVER THE LAST WORD, so all of them still wait for the exact one
            state.stale = isMoving ? count : count - drawn;
            if (state.stale === 0) compactIfWasteful();
            showCounts();
            state.stats.kind = isFull ? 'full' : (isMoving ? 'moving' : 'settling');
            noteStats(drawn, state.stale, nowMs() - startedAt, isFull);

            // SOMETHING MUST COME BACK FOR THE REST | The loop idles when nothing asks. A
            // later task rather than now: this is the middle of a render, inside its tick.
            if (state.stale > 0 && host.requestFrame) queueMicrotask(host.requestFrame);
            return drawn > 0;
        }
        // ------------------------------------------------------------


        // FUNCTION | Draw the Plants for the Camera, If Anything Changed
        // ------------------------------------------------------------
        // For a caller that drives its own loop: the test bench. Always a full draw, at
        // the size it says. Returns true when the picture changed.
        // ------------------------------------------------------------
        function update(camera, widthPx, heightPx) {
            camera.updateMatrixWorld();
            if (state.mode === 'proxy') {
                state.dirty = true;
                hideCounts();
                return false;
            }
            if (!state.shown) showCounts();
            return syncToView(camera, widthPx, heightPx, 1, 0);
        }
        // ------------------------------------------------------------


        // FUNCTION | Run Inside Every renderer.render, for the Camera About to Draw
        // ------------------------------------------------------------
        function onBeforeSceneRender(renderer, camera) {
            if (state.failed || !root.visible) return;
            if (!camera.layers.isEnabled(0)) return;                           // <-- An export layer pass: not looking at plants
            if (camera.isOrthographicCamera) { hideCounts(); return; }         // <-- A drawing: plan, D04
            if (state.proxyDirty && state.mode !== 'rendered') rebuildProxies();

            const liveFrame = host.getLiveFrame ? host.getLiveFrame() : 0;
            if (state.mode === 'proxy' && liveFrame > 0) { hideCounts(); return; }   // <-- A proxy view is the live view only: every picture draws them rendered
            if (!state.shown) showCounts();

            // THE SIZE OF THE WHOLE PICTURE | A tile sees part of a bigger frame, and all
            // its tiles must draw the same lines or they would not join up.
            let widthPx, heightPx;
            const offset = camera.view;
            if (offset && offset.enabled) {
                widthPx  = offset.fullWidth;
                heightPx = offset.fullHeight;
            } else {
                renderer.getSize(sizeVector);
                widthPx  = sizeVector.x;
                heightPx = sizeVector.y;
            }
            const exportScale = host.getExportScale ? host.getExportScale() : 1;

            // SECTION CUTS | The list is the section system's own, or null with none
            if (host.getClipList) {
                const clip = host.getClipList();
                if (fillMaterial.clippingPlanes !== clip) {
                    fillMaterial.clippingPlanes  = clip;
                    outerMaterial.clippingPlanes = clip;
                    innerMaterial.clippingPlanes = clip;
                }
            }

            // THE FILL'S MARK | See the header. A program change, so only when it changes
            const wantsMask = host.isAoRunning ? host.isAoRunning() === true : false;
            if (wantsMask !== state.fillMasked) {
                state.fillMasked = wantsMask;
                fillMaterial.blending    = wantsMask ? THREE.NoBlending : THREE.NormalBlending;
                fillMaterial.opacity     = wantsMask ? 0 : 1;
                fillMaterial.needsUpdate = true;
            }

            syncToView(camera, widthPx, heightPx, exportScale, liveFrame);
        }
        // ------------------------------------------------------------


        // FUNCTION | Put the Layer in Front of Every Render of the Scene
        // ------------------------------------------------------------
        // A fault in here must never reach the model: plants are an extra. It says so
        // once, and the plants go, the model carries on.
        // ------------------------------------------------------------
        function installRenderHook() {
            scene.onBeforeRender = (renderer, _scene, camera) => {
                try {
                    onBeforeSceneRender(renderer, camera);
                } catch (error) {
                    state.failed = true;
                    root.visible = false;
                    console.warn('[ValeVision3D Vegetation] Drawing failed, so plants are off for this visit. The model is unaffected:', error);
                }
            };
        }
        // ------------------------------------------------------------


        // FUNCTION | Rendered, Proxy or Both
        // ------------------------------------------------------------
        function setMode(mode) {
            state.mode = mode;
            proxyMesh.visible         = (mode === 'proxy');
            proxyLineMaterial.visible = (mode !== 'rendered');
            proxyLineMaterial.depthTest = (mode === 'proxy');                  // <-- With both, the dome's lines show through the bush
            if (host.setOverlayWanted) host.setOverlayWanted(proxyRoot, mode !== 'rendered');
            if (state.proxyDirty && mode !== 'rendered') rebuildProxies();
            state.dirty = true;
        }
        // ------------------------------------------------------------


        // FUNCTION | Replace All the Plops
        // ------------------------------------------------------------
        function setPlops(plops) {
            state.plops = plops;
            rebuildPlants();
            if (state.mode !== 'rendered') rebuildProxies();
        }
        // ------------------------------------------------------------


        // FUNCTION | Add Plops, Leaving the Plants Already Drawn Alone
        // ------------------------------------------------------------
        function addPlops(plops) {
            const t0 = nowMs();
            plops.forEach((plop) => {
                state.plops.push(plop);
                const plant = makePlant(plop);
                if (plant) state.plants.push(plant);
            });
            state.stats.plants   = state.plants.length;
            state.stats.buildMs += nowMs() - t0;
            state.proxyDirty     = true;
            state.stale++;                                                     // <-- Not the view that changed: only these need drawing
            if (state.mode !== 'rendered') rebuildProxies();
        }
        // ------------------------------------------------------------


        // FUNCTION | Show or Hide All of It
        // ------------------------------------------------------------
        function setVisible(visible) {
            root.visible = (visible === true);
            state.dirty  = true;
        }
        // ------------------------------------------------------------


        // FUNCTION | Which Plop Does a Ray Hit? (a ray against each proxy dome)
        // ------------------------------------------------------------
        function pick(origin, direction) {
            let best = null, bestT = Infinity;
            state.plops.forEach((plop) => {
                const sizeM = plopSizeM(plop);
                if (!sizeM) return;
                const yaw   = ((plop.yawDeg || 0) * Math.PI) / 180;
                const c = Math.cos(yaw), s = Math.sin(yaw);
                const ox = origin.x - plop.positionMm[0] / 1000;
                const oy = origin.y - plop.positionMm[1] / 1000;
                const oz = origin.z - plop.positionMm[2] / 1000;

                // INTO THE UNIT SPHERE | Undo the place, the yaw, then the size
                const lox = (ox * c - oz * s) / (sizeM[0] / 2), loy = oy / sizeM[2], loz = (ox * s + oz * c) / (sizeM[1] / 2);
                const ldx = (direction.x * c - direction.z * s) / (sizeM[0] / 2), ldy = direction.y / sizeM[2], ldz = (direction.x * s + direction.z * c) / (sizeM[1] / 2);

                const qa = ldx * ldx + ldy * ldy + ldz * ldz;
                const qb = 2 * (lox * ldx + loy * ldy + loz * ldz);
                const qc = lox * lox + loy * loy + loz * loz - 1;
                const disc = qb * qb - 4 * qa * qc;
                if (disc < 0) return;
                const t = (-qb - Math.sqrt(disc)) / (2 * qa);
                if (t > 0 && t < bestT && (loy + ldy * t) >= -0.05) {
                    bestT = t;
                    best  = plop;
                }
            });
            return best;
        }
        // ------------------------------------------------------------


        return {
            root,
            style,
            factors,
            stats : state.stats,
            setMode,
            setPlops,
            addPlops,
            setVisible,
            update,
            pick,
            installRenderHook,
            plops : () => state.plops,

            // The app's recipes, once the project's own copies have been resolved
            setRecipes : (list) => { recipes = list; },

            // A plop changed: rebuild everything that is made from plops
            refreshPlops : () => { rebuildPlants(); if (state.mode !== 'rendered') rebuildProxies(); },

            // A panel slider that changes the balls themselves
            rebuildAll : () => { rebuildPlants(); },

            // A panel slider that only changes what is drawn from them
            markDirty : () => {
                state.drawStyle   = (state.exportScale === 1) ? style : Object.assign({}, style, { segmentPx : style.segmentPx / state.exportScale });
                state.movingStyle = Na__VegBudget__MovingStyle(style, tuning);
                state.dirty = true;
            },

            // The line weights system stashes a material's base width the first time it
            // scales one, and works from that from then on
            setLineWeights : (outerPx, innerPx) => {
                outerMaterial.linewidth = outerPx;
                innerMaterial.linewidth = innerPx;
                if (Number.isFinite(outerMaterial.userData.Na__LineworkSettings__BaseWidth)) outerMaterial.userData.Na__LineworkSettings__BaseWidth = outerPx;
                if (Number.isFinite(innerMaterial.userData.Na__LineworkSettings__BaseWidth)) innerMaterial.userData.Na__LineworkSettings__BaseWidth = innerPx;
                state.dirty = true;
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Scene Layer API
    // ------------------------------------------------------------
    export {
        Na__VegLayer__Create,
        Na__VegLayer__MakeLineMaterial
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
