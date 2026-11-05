// =============================================================================
// VALEVISION 3D MCP - WHAT THE SERVER RUNS INSIDE THE APP'S PAGE
// =============================================================================
//
// FILE       : Na__ValeVisionMcp__PageHelpers__.js
// PURPOSE    : A small object on the page, window.Na__VvMcp, through which the tools read
//              and move the real app: the camera, saved scenes, the plants, the surface
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - IT ADDS NOTHING TO THE APP. It is put on an agent's headless page by Playwright, and is
//   never served or loaded by index.html. It reaches the app by importing the same module
//   URLs the app did, so it gets the same instances, and calls their own exports.
// - THE CAMERA COMES FROM Na__DrawView__Transitions__, initialised at boot on every project.
// - THE SURFACE COMES FROM Na__Vegetation__SurfacePick__, whose BVH filter takes only what is
//   really on the screen, so a probe finds what a click would.
//
// FRAMES:
// - Everything in and out is integer mm in three.js axes, Y up. The world is metres, so it
//   converts once, here. A bearing is not used.
//
// =============================================================================

(() => {
    if (window.Na__VvMcp) return true;

    const ROOT = new URL('02__Src__AppModules/', document.baseURI).href;
    const load = (rel) => import(ROOT + rel);
    const toMm = (metres) => Math.round(metres * 1000);
    const toM  = (mm) => mm / 1000;

    const RUNTIME   = '24__System__Vegetation/03__System__SceneLayer/Na__Vegetation__Runtime__.js';
    const SCENEDATA = '24__System__Vegetation/02__Core__Data/Na__Vegetation__SceneData__.js';
    const PICK      = '24__System__Vegetation/20__System__Tools/Na__Vegetation__SurfacePick__.js';
    const TRANS     = '40__System__DrawingViewCore/Na__DrawView__Transitions__.js';
    const RENDER    = '05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    const SCENES    = '21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    const APPLY     = '21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js';

    async function core() {
        const trans = await load(TRANS);
        const camera = trans.Na__DrawView__Transitions__GetCamera();
        const controls = trans.Na__DrawView__Transitions__GetControls();
        if (!camera) throw new Error('the app has no camera yet: has the project finished loading?');
        return { camera, controls };
    }

    async function requestRender() {
        (await load(RENDER)).Na__RenderLoop__RequestRender();
    }

    function cameraState(camera, controls) {
        return {
            position_mm : [toMm(camera.position.x), toMm(camera.position.y), toMm(camera.position.z)],
            target_mm   : controls ? [toMm(controls.target.x), toMm(controls.target.y), toMm(controls.target.z)] : null,
            fov_deg     : Math.round(camera.fov * 100) / 100
        };
    }

    window.Na__VvMcp = {

        async getCamera() {
            const { camera, controls } = await core();
            return cameraState(camera, controls);
        },

        async setCamera(view) {
            const { camera, controls } = await core();
            if (view.position_mm) camera.position.set(toM(view.position_mm[0]), toM(view.position_mm[1]), toM(view.position_mm[2]));
            if (view.target_mm && controls) controls.target.set(toM(view.target_mm[0]), toM(view.target_mm[1]), toM(view.target_mm[2]));
            if (view.fov_deg) { camera.fov = view.fov_deg; camera.updateProjectionMatrix(); }
            if (controls) controls.update();
            await requestRender();
            return cameraState(camera, controls);
        },

        async listScenes() {
            const scenes = (await load(SCENES)).Na__PresentationMode__ProjectJson__GetSortedScenes();
            return scenes.map((scene) => ({ id : scene.PresentationMode__Scene__Id, name : scene.PresentationMode__Scene__Name }));
        },

        async gotoScene(wanted) {
            const scenes = (await load(SCENES)).Na__PresentationMode__ProjectJson__GetSortedScenes();
            const low = String(wanted).toLowerCase();
            const scene = scenes.find((row) => row.PresentationMode__Scene__Id === wanted || row.PresentationMode__Scene__Name === wanted)
                || scenes.find((row) => String(row.PresentationMode__Scene__Name || '').toLowerCase().includes(low));
            if (!scene) throw new Error('no saved scene matches "' + wanted + '". Saved: ' + scenes.map((row) => row.PresentationMode__Scene__Name).join(', '));
            const { camera, controls } = await core();
            (await load(APPLY)).Na__PresentationMode__Camera__ApplySceneCameraState(camera, controls, scene);
            await requestRender();
            return Object.assign({ scene : scene.PresentationMode__Scene__Name }, cameraState(camera, controls));
        },

        // WHAT A PICTURE SHOWS | Everything but the WebGL canvas and what holds it goes
        async hideUi(hidden) {
            const trans = await load(TRANS);
            const canvases = Array.from(document.querySelectorAll('canvas')).filter((c) => c.width > 0 && c.clientWidth > 0);
            const main = canvases.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
            if (!main || !trans) return false;
            const keep = new Set();
            for (let node = main; node; node = node.parentElement) keep.add(node);
            document.querySelectorAll('body *').forEach((node) => {
                if (keep.has(node)) return;
                if (hidden) {
                    if (node.dataset.naMcpVisibility === undefined) node.dataset.naMcpVisibility = node.style.visibility;
                    node.style.visibility = 'hidden';
                } else if (node.dataset.naMcpVisibility !== undefined) {
                    node.style.visibility = node.dataset.naMcpVisibility;
                    delete node.dataset.naMcpVisibility;
                }
            });
            return true;
        },

        async problems() {
            const overlay = window.ValeVision__TestServer__Overlay;
            const state = overlay ? overlay.ValeVision__TestServer__State : null;
            return {
                signedInAs : state && state.Me ? state.Me.level : null,
                browser    : state ? state.Browser.map((row) => row.Kind + ': ' + String(row.Text).slice(0, 240)) : []
            };
        },

        // THE PLANTS
        async vegetation() {
            const data = await load(SCENEDATA);
            const current = data.Na__VegData__Current();
            if (!current) return { enabled : false };
            const run = await load(RUNTIME);
            const slider = document.getElementById('naVegetationTransparencySlider');
            const wanted = run.Na__VegRun__WantedPlants();
            const counts = {};
            wanted.forEach((plop) => { counts[plop.Vegetation__Plop__AssetId] = (counts[plop.Vegetation__Plop__AssetId] || 0) + 1; });
            return {
                enabled                    : current.Vegetation__SceneData__Enabled === true,
                shown                      : run.Na__VegRun__IsShown(),
                transparencyPercentOnPage  : slider ? Number(slider.value) : null,
                transparencyPercentInRecord: current.Vegetation__SceneData__DefaultTransparencyPercent,
                plantsWanted               : wanted.length,
                plantsByAsset              : counts,
                unsavedChanges             : data.Na__VegData__IsDirty(),
                stats                      : run.Na__VegRun__GetStats()
            };
        },

        async setVegetation(change) {
            const run = await load(RUNTIME);
            if (change.shown !== undefined) run.Na__VegRun__SetShown(change.shown === true);
            if (change.transparency_percent !== undefined) {
                run.Na__VegRun__SetTransparency(change.transparency_percent);
                const slider = document.getElementById('naVegetationTransparencySlider');
                if (slider) slider.value = String(change.transparency_percent);
            }
            await requestRender();
            return this.vegetation();
        },

        // THE SURFACE | The first real surface below a height, at each plan spot
        async probe(spots, fromHeightMm) {
            const run = await load(RUNTIME);
            const context = run.Na__VegRun__GetContext();
            if (!context) throw new Error('a probe uses the vegetation system\'s pick, so this project needs vegetation switched on');
            const pick = await load(PICK);
            pick.Na__VegPick__Initialize(context);
            await pick.Na__VegPick__Prepare();
            return spots.map((spot) => {
                const hit = pick.Na__VegPick__Under(toM(spot[0]), toM(fromHeightMm), toM(spot[1]));
                if (!hit) return { at_mm : spot, y_mm : null };
                const object = hit.object || null;
                const material = object && object.material ? (Array.isArray(object.material) ? object.material[0] : object.material) : null;
                return {
                    at_mm    : spot,
                    y_mm     : toMm(hit.point.y),
                    object   : object ? object.name : null,
                    material : material ? material.name : null
                };
            });
        }
    };
    return true;
})();
