// =============================================================================
// VALEVISION3D - VEGETATION LINEWORK PROTOTYPE - THE DEMO
// =============================================================================
//
// FILE       : Na__VegLine__Demo__.js
// NAMESPACE  : Na__VegDemo
// MODULE     : Prototype - Vegetation Linework
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The isolated demo: the real PureEngine composer and refiner, a made
//              up whitecard, an Assets drawer, a Line Rules panel and five views
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - Adam, 04-Nov-2026: "First build an isolated demo to show me how they could look,
//   once i'm happy with the aaethetic we will build out a new assets system and tools
//   for placement in / saving ValeVision 3D like with the NPR Renderer".
// - ISOLATED, BUT THE REAL RENDERER. Nothing here touches the app. It reads the app's
//   config and imports its PureEngine composer and progressive refiner read only, so
//   what is judged here is what a project would show: same line colour and weight,
//   same lights, same profile lines, same 16 sample settle.
// - THE DRAWER FOLLOWS NPR'S. PainterlyNPR's Assets drawer has a card per asset, a
//   Rendered / Proxy picture toggle, and click a card then click the sheet to place.
//   Its pictures here are drawn live by the same contour code, on a 2D canvas.
//
// USE:
// - A view in the address: ?view=lineup | elevation | closeup | perspective | birdseye
//   and ?mode=rendered | proxy | both. ?clean=1 hides the panels, for a clean picture.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 04-Nov-2026 - Version 0.1.0
// - Initial build for the isolated aesthetic demo. Since Stage 1 it reads the library
//   and the app's vegetation config, and draws through the real engine.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The App's Own Pipeline, Read Only
    // @delegate: ../02__Src__AppModules/05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js
    // @delegate: ../02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js
    // ------------------------------------------------------------
    import { Na__RenderPipeline__PureEngine__SetupComposer } from '../02__Src__AppModules/05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js';
    import {
        Na__ProgressiveRefine__Create,
        Na__Refine__FRAME_PRESENT,
        Na__Refine__FRAME_REFINE
    } from '../02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Prototype
    // ------------------------------------------------------------
    import { Na__VegBuild__BuildPlant } from '../02__Src__AppModules/24__System__Vegetation/01__Core__Engine/Na__Vegetation__BushBuilder__.js';
    import { Na__VegContour__CreateOut, Na__VegContour__ResetOut, Na__VegContour__DrawBush } from '../02__Src__AppModules/24__System__Vegetation/01__Core__Engine/Na__Vegetation__Contour__.js';
    import { Na__VegData__LoadConfig, Na__VegData__DefaultsFromConfig } from '../02__Src__AppModules/24__System__Vegetation/02__Core__Data/Na__Vegetation__SceneData__.js';
    import { Na__VegLib__LoadAllAssets } from '../02__Src__AppModules/24__System__Vegetation/02__Core__Data/Na__Vegetation__Library__.js';
    import { Na__VegLayer__Create } from '../02__Src__AppModules/24__System__Vegetation/03__System__SceneLayer/Na__Vegetation__SceneLayer__.js';
    import { Na__VegBed__Build, Na__VegBed__SHELF_ORIGIN_X } from './Na__VegLine__TestBed__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Files and Line-Up
    // ------------------------------------------------------------
    const Na__VegDemo__APP_CONFIG_URL = '../02__Src__AppModules/02__AppData/Na__AppConfig__Main.json';
    const Na__VegDemo__TESTBED_URL    = './Na__VegLine__TestBed__Config__.json';
    const Na__VegDemo__LINEUP_COLS    = 5;
    const Na__VegDemo__LINEUP_PITCH   = 2350;                                  // <-- Mm between specimens on a shelf: a drift is 1.8 m long
    const Na__VegDemo__LINEUP_ROWS_Y  = [5200, 2300, 0];                       // <-- Each row's shelf height, top row first
    const Na__VegDemo__LENS_DISTANCE_M = 150;                                  // <-- Far enough to read as parallel, near enough that the depth bias stays centimetres
    const Na__VegDemo__CLICK_PX       = 5;                                     // <-- Moved further than this, a press was an orbit
    const Na__VegDemo__CARD_W         = 244;
    const Na__VegDemo__CARD_H         = 118;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Views
    // ------------------------------------------------------------
    // A "lens" view is a long lens from far off: as near parallel as an elevation,
    // through the same perspective camera the composer was built with. widthM is
    // how much it takes in across. The others use the app's default lens.
    // ------------------------------------------------------------
    const Na__VegDemo__VIEWS = [
        { Id : 'lineup',      Label : 'Line-Up',     Lens : true,  Target : [Na__VegBed__SHELF_ORIGIN_X / 1000 + 4.4, 3.75, 0], Dir : [0, 0, 1],        WidthM : 20.5 },
        { Id : 'elevation',   Label : 'Elevation',   Lens : true,  Target : [-0.4, 5.3, 3],                                     Dir : [0, 0, 1],        WidthM : 26.0 },
        { Id : 'closeup',     Label : 'Close-Up',    Lens : true,  Target : [4.75, 1.95, 3],                                    Dir : [0, 0, 1],        WidthM : 9.0 },
        { Id : 'perspective', Label : 'Perspective', Lens : false, Target : [-0.6, 3.4, 1.2],                                   Eye : [-15.5, 3.0, 24.0], Fov : 29.8628 },
        { Id : 'birdseye',    Label : "Bird's-Eye",  Lens : false, Target : [0, 1.1, 1.2],                                      Eye : [-17.0, 15.0, 22.0], Fov : 29.8628 }
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Line Rules Panel
    // ------------------------------------------------------------
    const Na__VegDemo__SLIDERS = [
        { Key : 'LineWeightPx',      Label : 'Line weight',    Min : 0.4, Max : 2.0, Step : 0.05, Kind : 'weight' },
        { Key : 'InnerWeightShare',  Label : 'Inner weight',   Min : 0.4, Max : 1.0, Step : 0.05, Kind : 'weight' },
        { Key : 'InnerArcsFactor',   Label : 'Inner arcs',     Min : 0.0, Max : 2.5, Step : 0.05, Kind : 'draw', Target : 'interiorFactor' },
        { Key : 'HooksFactor',       Label : 'Hooks',          Min : 0.0, Max : 2.0, Step : 0.05, Kind : 'draw', Target : 'tailFactor' },
        { Key : 'CurlsFactor',       Label : 'Curls',          Min : 0.0, Max : 3.0, Step : 0.05, Kind : 'draw', Target : 'curlFactor' },
        { Key : 'PenLiftsFactor',    Label : 'Pen lifts',      Min : 0.0, Max : 4.0, Step : 0.05, Kind : 'draw', Target : 'breakFactor' },
        { Key : 'ScallopSizeFactor', Label : 'Scallop size',   Min : 0.6, Max : 1.6, Step : 0.05, Kind : 'build', Target : 'scallop' },
        { Key : 'SmallBumpsFactor',  Label : 'Small bumps',    Min : 0.0, Max : 2.5, Step : 0.05, Kind : 'build', Target : 'nubs' }
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | The Demo's One State Object
    // ------------------------------------------------------------
    const Na__VegDemo__State = {
        renderer : null, scene : null, camera : null, controls : null, pipeline : null, refiner : null,
        layer : null, bed : null, recipes : [], defaults : null, plopSerial : 0,
        framePending : false, wakeTimer : 0, lastFrameAt : 0, viewId : '', mode : 'rendered',
        cardPictures : 'rendered', cardSeeds : {}, cardOut : null, armedAssetId : null, selected : null,
        pressX : 0, pressY : 0, labelEls : [], cardEls : {}, values : {}, sliderEls : {},
        statsEl : null, recordEl : null, recordBox : null, hintEl : null, viewButtons : {}, modeButtons : {}, cardModeButtons : {}
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Make an Element
    // ------------------------------------------------------------
    function Na__VegDemo__El(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A New Seed
    // ------------------------------------------------------------
    function Na__VegDemo__NewSeed() {
        return 1 + Math.floor(Math.random() * 999998);                         // <-- Only a new seed is ever chosen at random; drawing from one never is
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find a Recipe
    // ------------------------------------------------------------
    function Na__VegDemo__Recipe(assetId) {
        for (let k = 0; k < Na__VegDemo__State.recipes.length; k++) {
            if (Na__VegDemo__State.recipes[k].Asset__Id === assetId) return Na__VegDemo__State.recipes[k];
        }
        return Na__VegDemo__State.recipes[0];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Plop's Saved Record, as It Would Be Written to a Project
    // ------------------------------------------------------------
    function Na__VegDemo__PlopRecord(plop) {
        return {
            Plop__Uid        : plop.uid,
            Plop__AssetId    : plop.assetId,
            Plop__Seed       : plop.seed,
            Plop__PositionMm : plop.positionMm,
            Plop__YawDeg     : plop.yawDeg,
            Plop__SizeMm     : plop.sizeMm
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Render Loop
// -----------------------------------------------------------------------------

    // FUNCTION | Ask for a Frame
    // ------------------------------------------------------------
    // On demand, as the app's loop is: nothing moves, nothing draws.
    // ------------------------------------------------------------
    function Na__VegDemo__Invalidate() {
        const S = Na__VegDemo__State;
        delete document.documentElement.dataset.naVegSettled;                  // <-- Set again once the picture is finished: see the end of Frame
        if (S.framePending) return;
        S.framePending = true;
        requestAnimationFrame(Na__VegDemo__Frame);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Effect Chain (profile normals, then the composer)
    // ------------------------------------------------------------
    function Na__VegDemo__DrawChain() {
        const S = Na__VegDemo__State;
        S.pipeline.renderProfileNormals();
        S.pipeline.composer.render();
    }
    // ------------------------------------------------------------


    // FUNCTION | One Frame
    // ------------------------------------------------------------
    function Na__VegDemo__Frame(now) {
        const S = Na__VegDemo__State;
        S.framePending = false;
        const deltaMs = now - S.lastFrameAt;
        S.lastFrameAt = now;

        S.controls.update();

        // THE LINES FOR THIS VIEW | Only worked out if the camera or a rule changed
        const changed = S.layer.update(S.camera, window.innerWidth, window.innerHeight);
        if (changed) {
            S.refiner.reset();
            Na__VegDemo__RefreshStats();
        }
        Na__VegDemo__PlaceLabels();

        const plan = S.refiner.planFrame({ camera : S.camera, sceneBusy : false });
        let didDraw = false;
        if (plan === Na__Refine__FRAME_PRESENT) {
            didDraw = S.refiner.presentAgain(null);
        } else if (plan === Na__Refine__FRAME_REFINE) {
            didDraw = S.refiner.renderChunk({
                camera      : S.camera,
                composer    : S.pipeline.composer,
                fxaaPass    : S.pipeline.fxaaPassRef,
                drawChain   : Na__VegDemo__DrawChain,
                drawOverlay : null,
                onSample    : null
            });
        }
        if (!didDraw) {
            S.refiner.noteNormalFrame(now, deltaMs);
            Na__VegDemo__DrawChain();
        }

        // SETTLE | Come back for the rest of the 16 samples, then stop
        const pending = S.refiner.getPendingWork();
        if (pending.wanted) {
            if (pending.delayMs <= 0) {
                Na__VegDemo__Invalidate();
            } else {
                clearTimeout(S.wakeTimer);
                S.wakeTimer = setTimeout(Na__VegDemo__Invalidate, pending.delayMs);
            }
        } else {
            document.documentElement.dataset.naVegSettled = '1';               // <-- For a scripted capture: the picture is finished
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Follow the Window
    // ------------------------------------------------------------
    function Na__VegDemo__OnResize() {
        const S = Na__VegDemo__State;
        const w = window.innerWidth, h = window.innerHeight;
        S.camera.aspect = w / h;
        S.camera.updateProjectionMatrix();
        S.renderer.setSize(w, h);
        S.pipeline.composer.setSize(w, h);
        S.pipeline.setProfileLinesSize(w, h);
        S.pipeline.setFxaaSize(w, h);
        S.lineResolution.set(w, h);

        // A LONG LENS KEEPS WHAT IT TAKES IN ACROSS | The camera stays wherever it was orbited to
        let view = null;
        Na__VegDemo__VIEWS.forEach((v) => { if (v.Id === S.viewId) view = v; });
        if (view && view.Lens) {
            S.camera.fov = Na__VegDemo__LensFov(view);
            S.camera.updateProjectionMatrix();
        }
        Na__VegDemo__Invalidate();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Views
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Field of View That Takes In a Long Lens View's Width
    // ------------------------------------------------------------
    function Na__VegDemo__LensFov(view) {
        const aspect = window.innerWidth / window.innerHeight;
        const wantH  = view.WidthM / aspect;
        return (2 * Math.atan(wantH / 2 / Na__VegDemo__LENS_DISTANCE_M) * 180) / Math.PI;
    }
    // ------------------------------------------------------------


    // FUNCTION | Go to a View
    // ------------------------------------------------------------
    function Na__VegDemo__ApplyView(viewId) {
        const S = Na__VegDemo__State;
        let view = Na__VegDemo__VIEWS[0];
        Na__VegDemo__VIEWS.forEach((v) => { if (v.Id === viewId) view = v; });
        S.viewId = view.Id;

        const cam = S.camera;
        if (view.Lens) {
            const distance = Na__VegDemo__LENS_DISTANCE_M;
            cam.fov = Na__VegDemo__LensFov(view);
            cam.position.set(
                view.Target[0] + view.Dir[0] * distance,
                view.Target[1] + view.Dir[1] * distance,
                view.Target[2] + view.Dir[2] * distance
            );
        } else {
            cam.fov = view.Fov;
            cam.position.set(view.Eye[0], view.Eye[1], view.Eye[2]);
        }
        cam.near = 0.1;
        cam.far  = 1000;
        cam.updateProjectionMatrix();
        S.controls.target.set(view.Target[0], view.Target[1], view.Target[2]);
        S.controls.update();

        Object.keys(S.viewButtons).forEach((key) => {
            S.viewButtons[key].classList.toggle('na-veg-bar__btn--active', key === view.Id);
        });
        Na__VegDemo__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Rendered, Proxy or Both
    // ------------------------------------------------------------
    function Na__VegDemo__ApplyMode(mode) {
        const S = Na__VegDemo__State;
        S.mode = mode;
        S.layer.setMode(mode);
        Object.keys(S.modeButtons).forEach((key) => {
            S.modeButtons[key].classList.toggle('na-veg-bar__btn--active', key === mode);
        });
        Na__VegDemo__Invalidate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keep the Line-Up's Row Names Beside Their Shelves
    // ------------------------------------------------------------
    function Na__VegDemo__PlaceLabels() {
        const S = Na__VegDemo__State;
        const showing = S.viewId === 'lineup';
        S.labelEls.forEach((label) => {
            label.el.style.display = showing ? '' : 'none';
            if (!showing) return;
            const p = new THREE.Vector3(label.x, label.y, label.z).project(S.camera);
            label.el.style.left = ((p.x * 0.5 + 0.5) * window.innerWidth) + 'px';
            label.el.style.top  = ((-p.y * 0.5 + 0.5) * window.innerHeight) + 'px';
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plops
// -----------------------------------------------------------------------------

    // FUNCTION | Set Out the First Plops: the Test Bed's, and the Line-Up
    // ------------------------------------------------------------
    function Na__VegDemo__BuildStartingPlops(config) {
        const S = Na__VegDemo__State;
        const plops = [];

        config.VegetationLinework__TestBed__Plops.forEach((row) => {
            S.plopSerial++;
            plops.push({
                uid        : 'A' + String(S.plopSerial).padStart(4, '0'),
                assetId    : row.Plop__AssetId,
                seed       : row.Plop__Seed,
                positionMm : row.Plop__PositionMm.slice(),
                yawDeg     : row.Plop__YawDeg,
                sizeMm     : row.Plop__SizeMm ? row.Plop__SizeMm.slice() : null
            });
        });

        // THE LINE-UP | Each asset five times from one recipe: the proof it does not repeat
        S.recipes.forEach((recipe, row) => {
            const shelfY = Na__VegDemo__LINEUP_ROWS_Y[row];
            for (let c = 0; c < Na__VegDemo__LINEUP_COLS; c++) {
                S.plopSerial++;
                plops.push({
                    uid        : 'A' + String(S.plopSerial).padStart(4, '0'),
                    assetId    : recipe.Asset__Id,
                    seed       : 2000 + row * 1013 + c * 7919,
                    positionMm : [Na__VegBed__SHELF_ORIGIN_X + c * Na__VegDemo__LINEUP_PITCH, shelfY, 0],
                    yawDeg     : recipe.Asset__Masses.Masses__Layout === 'Run' ? c * 6 - 12 : c * 47,  // <-- A drift keeps its long side to the eye
                    sizeMm     : null
                });
            }

            const el = Na__VegDemo__El('div', 'na-veg-label');
            el.appendChild(Na__VegDemo__El('div', 'na-veg-label__name', recipe.Asset__Name));
            el.appendChild(Na__VegDemo__El('div', 'na-veg-label__note', recipe.Asset__Id + ': five seeds, one recipe'));
            document.body.appendChild(el);
            S.labelEls.push({ el, x : (Na__VegBed__SHELF_ORIGIN_X - 1300) / 1000, y : shelfY / 1000 - 0.06, z : 0.7 });
        });

        return plops;
    }
    // ------------------------------------------------------------


    // FUNCTION | New Seeds for Every Plop
    // ------------------------------------------------------------
    function Na__VegDemo__ReseedAll() {
        const S = Na__VegDemo__State;
        S.layer.plops().forEach((plop) => { plop.seed = Na__VegDemo__NewSeed(); });
        S.layer.refreshPlops();
        Na__VegDemo__RefreshRecord();
        Na__VegDemo__Invalidate();
    }
    // ------------------------------------------------------------


    // HANDLER | A Press and Release on the Canvas: Place, Select or Nothing
    // ------------------------------------------------------------
    function Na__VegDemo__OnCanvasClick(event) {
        const S = Na__VegDemo__State;
        const ndc = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(ndc, S.camera);

        if (S.armedAssetId) {
            // PLACING | On what the pointer first meets, if it faces up: as NPR, click a
            // card and then the sheet. A front-on view shows nothing facing up, so it says
            // so. Proper placement tools are the next stage, once the look is agreed.
            const hits = ray.intersectObject(S.bed.mesh, false);
            const hit  = hits.length > 0 ? hits[0] : null;
            if (!hit || !hit.face || hit.face.normal.y < 0.6) {
                S.hintEl.textContent = 'That spot does not face up. Use Perspective or Bird\'s-Eye to drop one on a planter.';
                return;
            }
            const p = hit.point;
            S.plopSerial++;
            const plop = {
                uid        : 'A' + String(S.plopSerial).padStart(4, '0'),
                assetId    : S.armedAssetId,
                seed       : Na__VegDemo__NewSeed(),
                positionMm : [Math.round(p.x * 1000), Math.round(p.y * 1000), Math.round(p.z * 1000)],
                yawDeg     : Math.floor(Math.random() * 360),
                sizeMm     : null
            };
            S.layer.plops().push(plop);
            S.layer.refreshPlops();
            S.selected = plop;
            Na__VegDemo__RefreshRecord();
            Na__VegDemo__Invalidate();
            return;
        }

        S.selected = S.layer.pick(ray.ray.origin, ray.ray.direction);
        Na__VegDemo__RefreshRecord();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Arm or Disarm a Card
    // ------------------------------------------------------------
    function Na__VegDemo__ArmCard(assetId) {
        const S = Na__VegDemo__State;
        S.armedAssetId = (S.armedAssetId === assetId) ? null : assetId;
        Object.keys(S.cardEls).forEach((key) => {
            S.cardEls[key].card.classList.toggle('na-veg-card--armed', key === S.armedAssetId);
        });
        S.hintEl.textContent = S.armedAssetId
            ? 'Click the model to drop one. Esc or the card again to stop.'
            : 'Click a card, then click the model to drop one.';
        document.body.classList.toggle('na-veg-placing', !!S.armedAssetId);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Drawer's Cards
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Draw One Card's Picture from the Same Code as the Scene
    // ------------------------------------------------------------
    // A flat front view on a 2D canvas: no second GL context for three pictures, and
    // proof that these are vector lines that can go anywhere.
    // ------------------------------------------------------------
    function Na__VegDemo__DrawCard(recipe) {
        const S     = Na__VegDemo__State;
        const entry = S.cardEls[recipe.Asset__Id];
        const dpr   = Math.min(window.devicePixelRatio || 1, 2);
        const w     = Na__VegDemo__CARD_W, h = Na__VegDemo__CARD_H;
        const canvas = entry.canvas;
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width  = w + 'px';
        canvas.style.height = h + 'px';

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.lineCap = 'round';

        const size   = recipe.Asset__Size;
        const widthM = size.Size__WidthMm / 1000, highM = size.Size__HeightMm / 1000;
        const px     = Math.min((w - 34) / (widthM * 1.08), (h - 26) / (highM * 1.08));
        const ox     = w / 2, oy = h - 14;

        if (S.cardPictures === 'proxy') {
            // THE PROXY | A faceted dome, the same 108 triangles the scene places
            const rx = (widthM / 2) * px, ry = highM * px;
            ctx.fillStyle   = '#e6ede1';
            ctx.strokeStyle = '#5f7a66';
            ctx.lineWidth   = 1;
            ctx.beginPath();
            for (let a = 0; a <= 32; a++) {
                const t = (Math.PI * a) / 32;
                const x = ox - Math.cos(t) * rx, y = oy - Math.sin(t) * ry;
                if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            for (let ring = 1; ring < 5; ring++) {
                const lat = (Math.PI * 0.5 * ring) / 5;
                const y = oy - Math.sin(lat) * ry, half = Math.cos(lat) * rx;
                ctx.beginPath();
                ctx.moveTo(ox - half, y);
                ctx.lineTo(ox + half, y);
                ctx.stroke();
            }
            [-0.62, -0.25, 0.25, 0.62].forEach((share) => {
                ctx.beginPath();
                for (let a = 0; a <= 16; a++) {
                    const t = (Math.PI * 0.5 * a) / 16;
                    const x = ox + Math.cos(t) * rx * share, y = oy - Math.sin(t) * ry;
                    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            });
        } else {
            // RENDERED | Flat parallel, from this card's own seed. A card has no depth test,
            // so it paints in order: the bush's own lines already hide themselves, a blade
            // behind the bush is left out, and a blade in front covers what it crosses.
            const bush = Na__VegBuild__BuildPlant(recipe, {
                seed : S.cardSeeds[recipe.Asset__Id], positionMm : [0, 0, 0], yawDeg : 0, sizeMm : null
            }, S.layer.factors);
            const frontBlades = bush.blades.filter((blade) => blade.p[2] >= 0);
            bush.blades = [];

            if (!S.cardOut) S.cardOut = Na__VegContour__CreateOut(60000, 30000, 60000);
            const out  = S.cardOut;
            const view = {
                eyeX : 0, eyeY : 0, eyeZ : 30, fwdX : 0, fwdY : 0, fwdZ : -1, upX : 0, upY : 1, upZ : 0, rightX : 1, rightY : 0, rightZ : 0,
                isOrtho : true, focalPx : px, halfWidthPx : 1e5, halfHeightPx : 1e5
            };
            const stroke = (buffer, count) => {
                ctx.beginPath();
                for (let k = 0; k < count; k++) {
                    const b = k * 6;
                    ctx.moveTo(ox + buffer[b] * px, oy - buffer[b + 1] * px);
                    ctx.lineTo(ox + buffer[b + 3] * px, oy - buffer[b + 4] * px);
                }
                ctx.stroke();
            };

            Na__VegContour__ResetOut(out);
            Na__VegContour__DrawBush(bush, view, S.layer.style, out);
            ctx.strokeStyle = '#141414';
            ctx.lineWidth = 0.9;
            stroke(out.outer, out.outerCount);
            ctx.lineWidth = 0.75;
            stroke(out.inner, out.innerCount);

            // THE FRONT BLADES | Their own fill first, then their lines
            bush.count  = 0;
            bush.blades = frontBlades;
            Na__VegContour__ResetOut(out);
            Na__VegContour__DrawBush(bush, view, S.layer.style, out);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            for (let v = 0; v + 2 < out.fillCount; v += 3) {
                ctx.moveTo(ox + out.fill[v * 3] * px, oy - out.fill[v * 3 + 1] * px);
                ctx.lineTo(ox + out.fill[v * 3 + 3] * px, oy - out.fill[v * 3 + 4] * px);
                ctx.lineTo(ox + out.fill[v * 3 + 6] * px, oy - out.fill[v * 3 + 7] * px);
                ctx.closePath();
            }
            ctx.fill();
            ctx.lineWidth = 0.9;
            stroke(out.outer, out.outerCount);
            ctx.lineWidth = 0.75;
            stroke(out.inner, out.innerCount);
        }

        ctx.strokeStyle = '#141414';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(10, oy);
        ctx.lineTo(w - 10, oy);
        ctx.stroke();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Redraw Every Card
    // ------------------------------------------------------------
    function Na__VegDemo__DrawAllCards() {
        Na__VegDemo__State.recipes.forEach(Na__VegDemo__DrawCard);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building the Page
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Panel's Title, Which Folds the Panel Away from the View
    // ------------------------------------------------------------
    function Na__VegDemo__MakeFoldTitle(panel, text) {
        const title = Na__VegDemo__El('button', 'na-veg-panel__title', text);
        title.type  = 'button';
        title.title = 'Fold this panel away';
        title.addEventListener('click', () => panel.classList.toggle('na-veg-panel--folded'));
        return title;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Toolbar: Views, Then Rendered / Proxy / Both
    // ------------------------------------------------------------
    function Na__VegDemo__BuildToolbar() {
        const S   = Na__VegDemo__State;
        const bar = Na__VegDemo__El('div', 'na-veg-bar');

        Na__VegDemo__VIEWS.forEach((view) => {
            const button = Na__VegDemo__El('button', 'na-veg-bar__btn', view.Label);
            button.type = 'button';
            button.addEventListener('click', () => Na__VegDemo__ApplyView(view.Id));
            S.viewButtons[view.Id] = button;
            bar.appendChild(button);
        });

        bar.appendChild(Na__VegDemo__El('span', 'na-veg-bar__divider'));

        [['rendered', 'Rendered'], ['proxy', 'Proxy'], ['both', 'Both']].forEach((pair) => {
            const button = Na__VegDemo__El('button', 'na-veg-bar__btn', pair[1]);
            button.type = 'button';
            button.addEventListener('click', () => Na__VegDemo__ApplyMode(pair[0]));
            S.modeButtons[pair[0]] = button;
            bar.appendChild(button);
        });

        bar.appendChild(Na__VegDemo__El('span', 'na-veg-bar__divider'));

        const seeds = Na__VegDemo__El('button', 'na-veg-bar__btn na-veg-bar__btn--strong', 'New Seeds');
        seeds.type = 'button';
        seeds.title = 'Every plop draws again from a new seed: same rules, different bushes';
        seeds.addEventListener('click', Na__VegDemo__ReseedAll);
        bar.appendChild(seeds);

        document.body.appendChild(bar);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Assets Drawer
    // ------------------------------------------------------------
    function Na__VegDemo__BuildDrawer() {
        const S      = Na__VegDemo__State;
        const drawer = Na__VegDemo__El('aside', 'na-veg-panel na-veg-panel--left');

        const head = Na__VegDemo__El('div', 'na-veg-panel__head');
        head.appendChild(Na__VegDemo__MakeFoldTitle(drawer, 'Assets'));
        const toggle = Na__VegDemo__El('div', 'na-veg-toggle');
        [['rendered', 'Rendered'], ['proxy', 'Proxy']].forEach((pair) => {
            const button = Na__VegDemo__El('button', 'na-veg-toggle__btn', pair[1]);
            button.type = 'button';
            button.classList.toggle('na-veg-toggle__btn--active', pair[0] === S.cardPictures);
            button.addEventListener('click', () => {
                S.cardPictures = pair[0];
                Object.keys(S.cardModeButtons).forEach((key) => {
                    S.cardModeButtons[key].classList.toggle('na-veg-toggle__btn--active', key === pair[0]);
                });
                Na__VegDemo__DrawAllCards();
            });
            S.cardModeButtons[pair[0]] = button;
            toggle.appendChild(button);
        });
        head.appendChild(toggle);
        drawer.appendChild(head);

        const list = Na__VegDemo__El('div', 'na-veg-panel__scroll');
        list.appendChild(Na__VegDemo__El('div', 'na-veg-panel__section', 'Vegetation: Shrubs'));

        S.recipes.forEach((recipe) => {
            const card = Na__VegDemo__El('button', 'na-veg-card');
            card.type = 'button';
            card.title = recipe.Asset__Description;
            const canvas = Na__VegDemo__El('canvas', 'na-veg-card__picture');
            card.appendChild(canvas);
            card.appendChild(Na__VegDemo__El('div', 'na-veg-card__name', recipe.Asset__Name));
            const size = recipe.Asset__Size;
            card.appendChild(Na__VegDemo__El('div', 'na-veg-card__meta',
                recipe.Asset__Id + '  |  ' + size.Size__WidthMm + ' x ' + size.Size__HeightMm + ' mm'));
            card.addEventListener('click', () => Na__VegDemo__ArmCard(recipe.Asset__Id));
            S.cardEls[recipe.Asset__Id] = { card, canvas };
            S.cardSeeds[recipe.Asset__Id] = 500 + recipe.Asset__Id.charCodeAt(9) * 37;
            list.appendChild(card);
        });

        S.hintEl = Na__VegDemo__El('div', 'na-veg-panel__hint', 'Click a card, then click the model to drop one.');
        list.appendChild(S.hintEl);

        const box = Na__VegDemo__El('div', 'na-veg-record');
        box.appendChild(Na__VegDemo__El('div', 'na-veg-panel__section', 'What a plop saves'));
        S.recordEl = Na__VegDemo__El('pre', 'na-veg-record__json', 'Click a bush in the model.');
        box.appendChild(S.recordEl);
        const actions = Na__VegDemo__El('div', 'na-veg-record__actions');
        const again = Na__VegDemo__El('button', 'na-veg-small-btn', 'New seed');
        again.type = 'button';
        again.addEventListener('click', () => {
            if (!S.selected) return;
            S.selected.seed = Na__VegDemo__NewSeed();
            S.layer.refreshPlops();
            Na__VegDemo__RefreshRecord();
            Na__VegDemo__Invalidate();
        });
        const remove = Na__VegDemo__El('button', 'na-veg-small-btn', 'Remove');
        remove.type = 'button';
        remove.addEventListener('click', () => {
            if (!S.selected) return;
            const plops = S.layer.plops();
            plops.splice(plops.indexOf(S.selected), 1);
            S.selected = null;
            S.layer.refreshPlops();
            Na__VegDemo__RefreshRecord();
            Na__VegDemo__Invalidate();
        });
        actions.appendChild(again);
        actions.appendChild(remove);
        box.appendChild(actions);
        S.recordBox = box;
        list.appendChild(box);

        drawer.appendChild(list);
        document.body.appendChild(drawer);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Line Rules Panel
    // ------------------------------------------------------------
    function Na__VegDemo__BuildRulesPanel() {
        const S     = Na__VegDemo__State;
        const panel = Na__VegDemo__El('aside', 'na-veg-panel na-veg-panel--right');
        const head  = Na__VegDemo__El('div', 'na-veg-panel__head');
        head.appendChild(Na__VegDemo__MakeFoldTitle(panel, 'Line Rules'));
        const reset = Na__VegDemo__El('button', 'na-veg-small-btn', 'Reset');
        reset.type = 'button';
        reset.addEventListener('click', Na__VegDemo__ResetRules);
        head.appendChild(reset);
        panel.appendChild(head);

        const body = Na__VegDemo__El('div', 'na-veg-panel__scroll');
        Na__VegDemo__SLIDERS.forEach((slider) => {
            const row = Na__VegDemo__El('label', 'na-veg-slider');
            const top = Na__VegDemo__El('div', 'na-veg-slider__top');
            top.appendChild(Na__VegDemo__El('span', 'na-veg-slider__label', slider.Label));
            const value = Na__VegDemo__El('span', 'na-veg-slider__value');
            top.appendChild(value);
            row.appendChild(top);

            const input = Na__VegDemo__El('input', 'na-veg-slider__input');
            input.type = 'range';
            input.min  = slider.Min;
            input.max  = slider.Max;
            input.step = slider.Step;
            input.addEventListener('input', () => {
                Na__VegDemo__ApplySlider(slider, Number(input.value));
                value.textContent = Number(input.value).toFixed(2);
            });
            input.addEventListener('change', () => {
                if (slider.Kind === 'build') Na__VegDemo__DrawAllCards();
            });
            S.sliderEls[slider.Key] = { input, value };
            row.appendChild(input);
            body.appendChild(row);
        });

        S.statsEl = Na__VegDemo__El('div', 'na-veg-stats');
        body.appendChild(Na__VegDemo__El('div', 'na-veg-panel__section', 'This view'));
        body.appendChild(S.statsEl);

        panel.appendChild(body);
        document.body.appendChild(panel);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Act on One Slider
    // ------------------------------------------------------------
    function Na__VegDemo__ApplySlider(slider, value) {
        const S = Na__VegDemo__State;
        S.values[slider.Key] = value;
        if (slider.Kind === 'weight') {
            S.layer.setLineWeights(S.values.LineWeightPx, S.values.LineWeightPx * S.values.InnerWeightShare);
        } else if (slider.Kind === 'draw') {
            S.layer.style[slider.Target] = value;
            S.layer.markDirty();
            Na__VegDemo__DrawAllCards();
        } else {
            S.layer.factors[slider.Target] = value;
            S.layer.rebuildAll();
        }
        Na__VegDemo__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Put Every Slider Back to the Recipe File's Values
    // ------------------------------------------------------------
    function Na__VegDemo__ResetRules() {
        const S = Na__VegDemo__State;
        Na__VegDemo__SLIDERS.forEach((slider) => {
            const value = S.defaults['Vegetation__LineRules__' + slider.Key];
            const parts = S.sliderEls[slider.Key];
            parts.input.value = value;
            parts.value.textContent = Number(value).toFixed(2);
            Na__VegDemo__ApplySlider(slider, value);
        });
        Na__VegDemo__DrawAllCards();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refresh the Numbers Under the Sliders
    // ------------------------------------------------------------
    function Na__VegDemo__RefreshStats() {
        const S = Na__VegDemo__State;
        if (!S.statsEl) return;
        const st = S.layer.stats;
        const rows = S.mode === 'proxy'
            ? [
                ['Plops', S.layer.plops().length],
                ['Proxy triangles', Math.round(st.proxyTris)],
                ['Lines drawn', 0]
            ]
            : [
                ['Bushes in view', st.bushes],
                ['Balls', st.lobes],
                ['Line segments', st.outer + st.inner],
                ['Fill triangles', Math.round(st.fillTris)],
                ['Lines worked out in', st.drawMs.toFixed(1) + ' ms'],
                ['All plops built in', st.buildMs.toFixed(0) + ' ms']
            ];
        while (S.statsEl.firstChild) S.statsEl.removeChild(S.statsEl.firstChild);
        rows.forEach((row) => {
            const line = Na__VegDemo__El('div', 'na-veg-stats__row');
            line.appendChild(Na__VegDemo__El('span', '', row[0]));
            line.appendChild(Na__VegDemo__El('span', 'na-veg-stats__value', String(row[1])));
            S.statsEl.appendChild(line);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show the Selected Plop's Record
    // ------------------------------------------------------------
    function Na__VegDemo__RefreshRecord() {
        const S = Na__VegDemo__State;
        if (!S.selected) {
            S.recordEl.textContent = 'Click a bush in the model.';
            return;
        }
        const text = JSON.stringify(Na__VegDemo__PlopRecord(S.selected), null, 1);
        S.recordEl.textContent = text + '\n\n' + text.replace(/\s+/g, ' ').length + ' bytes. No lines are saved.';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Start
// -----------------------------------------------------------------------------

    // FUNCTION | Start the Demo
    // ------------------------------------------------------------
    async function Na__VegDemo__Start() {
        const S = Na__VegDemo__State;

        // THE REAL DATA | Assets from the library, line rules from the app's config, as a
        // project's own object starts. Only where the test bed's plants stand is the demo's.
        const [appConfig, testBedConfig, vegetationConfig, recipes] = await Promise.all([
            fetch(Na__VegDemo__APP_CONFIG_URL).then((r) => r.json()),
            fetch(Na__VegDemo__TESTBED_URL).then((r) => r.json()),
            Na__VegData__LoadConfig(),
            Na__VegLib__LoadAllAssets()
        ]);
        S.recipes  = recipes;
        S.defaults = Na__VegData__DefaultsFromConfig(vegetationConfig).Vegetation__SceneData__LineRules;
        Na__VegDemo__SLIDERS.forEach((slider) => { S.values[slider.Key] = S.defaults['Vegetation__LineRules__' + slider.Key]; });

        // THE RENDERER | As index.html makes it
        const canvas = document.getElementById('renderCanvas');
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias              : true,
            alpha                  : true,
            stencil                : true,
            depth                  : true,
            powerPreference        : 'high-performance',
            logarithmicDepthBuffer : true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type    = THREE.PCFShadowMap;
        renderer.outputColorSpace  = THREE.SRGBColorSpace;
        renderer.toneMapping       = THREE.NoToneMapping;
        renderer.toneMappingExposure = 1;
        S.renderer = renderer;

        // THE SCENE | White, with the config's own lights
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        const light = appConfig.Scene__Default__LightingConfig;
        scene.add(new THREE.AmbientLight(0xffffff, light.Scene__Default__LightingConfig__AmbientIntensity));
        const sun = new THREE.DirectionalLight(0xffffff, light.Scene__Default__LightingConfig__DirectionalIntensity);
        sun.position.set(
            light.Scene__Default__LightingConfig__DirectionalPosXMm / 1000,
            light.Scene__Default__LightingConfig__DirectionalPosYMm / 1000,
            light.Scene__Default__LightingConfig__DirectionalPosZMm / 1000
        );
        sun.castShadow = true;
        sun.shadow.mapSize.width  = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.bias = -0.0001;
        scene.add(sun);
        S.scene = scene;

        const camera = new THREE.PerspectiveCamera(29.8628, window.innerWidth / window.innerHeight, 0.1, 1000);
        S.camera = camera;
        S.lineResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);

        const controls = new OrbitControls(camera, canvas);
        controls.enableDamping = false;
        controls.maxPolarAngle = Math.PI * 0.5;                                // <-- Never under the ground; level is allowed, for an elevation
        controls.addEventListener('change', Na__VegDemo__Invalidate);
        S.controls = controls;

        // THE REAL COMPOSER AND THE REAL REFINER
        S.pipeline = Na__RenderPipeline__PureEngine__SetupComposer(renderer, scene, camera, appConfig.RenderEffect__ProfileLines, null, controls.target);
        S.refiner  = Na__ProgressiveRefine__Create({ renderer, config : appConfig.RenderEffect__ProgressiveRefine });

        // THE TEST BED AND THE PLOPS
        S.bed = Na__VegBed__Build({
            scene,
            appConfig,
            resolution  : S.lineResolution,
            shelves     : Na__VegDemo__LINEUP_ROWS_Y.map((y) => ({ yMm : y })),
            shelfSpanMm : (Na__VegDemo__LINEUP_COLS - 1) * Na__VegDemo__LINEUP_PITCH
        });
        S.layer = Na__VegLayer__Create({
            scene,
            recipes     : S.recipes,
            lineRules   : S.defaults,
            lineColour  : appConfig.models.RenderConfig__Linework.RenderConfig__Linework__EdgeColor,
            resolution  : S.lineResolution
        });

        Na__VegDemo__BuildToolbar();
        Na__VegDemo__BuildDrawer();
        document.body.appendChild(Na__VegDemo__El('div', 'na-veg-keys', 'Drag: orbit  |  Right drag: pan  |  Wheel: zoom  |  Click a bush: what it saves'));
        Na__VegDemo__BuildRulesPanel();
        Na__VegDemo__SLIDERS.forEach((slider) => {
            const parts = S.sliderEls[slider.Key];
            parts.input.value = S.values[slider.Key];
            parts.value.textContent = Number(S.values[slider.Key]).toFixed(2);
        });

        S.layer.setPlops(Na__VegDemo__BuildStartingPlops(testBedConfig));
        S.pipeline.invalidateProfileLinesCache();                              // <-- New meshes and fat lines joined the scene
        Na__VegDemo__DrawAllCards();

        // POINTER | A press that did not move is a click; anything else was the orbit's
        canvas.addEventListener('pointerdown', (event) => {
            S.pressX = event.clientX;
            S.pressY = event.clientY;
        });
        canvas.addEventListener('pointerup', (event) => {
            if (event.button !== 0) return;
            if (Math.hypot(event.clientX - S.pressX, event.clientY - S.pressY) > Na__VegDemo__CLICK_PX) return;
            Na__VegDemo__OnCanvasClick(event);
        });
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && S.armedAssetId) Na__VegDemo__ArmCard(S.armedAssetId);
        });
        window.addEventListener('resize', Na__VegDemo__OnResize);

        // WHERE TO START | The address can name a view and a mode, so a view can be shared
        const params = new URLSearchParams(window.location.search);
        if (params.get('clean') === '1') document.body.classList.add('na-veg-clean');  // <-- No panels: a clean picture of the view
        Na__VegDemo__ApplyMode(params.get('mode') || 'rendered');
        Na__VegDemo__ApplyView(params.get('view') || 'closeup');
        Na__VegDemo__Invalidate();

        document.documentElement.dataset.naVegReady = '1';
    }
    // ------------------------------------------------------------


    Na__VegDemo__Start().catch((error) => {
        console.error('[ValeVision3D VegetationLinework] The demo did not start:', error);
        const note = Na__VegDemo__El('div', 'na-veg-error', 'The demo did not start: ' + error.message);
        document.body.appendChild(note);
    });

// endregion -------------------------------------------------------------------
