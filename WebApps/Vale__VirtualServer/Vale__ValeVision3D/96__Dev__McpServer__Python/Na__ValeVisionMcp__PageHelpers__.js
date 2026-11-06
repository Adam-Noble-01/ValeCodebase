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
    const ENT_RUN   = '23__System__Entourage/03__System__SceneLayer/Na__Entourage__Runtime__.js';
    const ENT_DATA  = '23__System__Entourage/02__Core__Data/Na__Entourage__SceneData__.js';
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

        // WHERE A POINT IN THE MODEL IS ON SCREEN | Integer mm, three.js axes, to client pixels
        async worldToScreen(pointMm) {
            const { camera } = await core();
            const three = await import('three');
            const v = new three.Vector3(toM(pointMm[0]), toM(pointMm[1]), toM(pointMm[2])).project(camera);
            const canvases = Array.from(document.querySelectorAll('canvas')).filter((c) => c.clientWidth > 0).sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight));
            const box = canvases[0].getBoundingClientRect();
            const x = box.left + (v.x * 0.5 + 0.5) * box.width, y = box.top + (-v.y * 0.5 + 0.5) * box.height;
            return { x : Math.round(x * 10) / 10, y : Math.round(y * 10) / 10, inView : v.z < 1 && x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight };
        },

        // WHAT IS REALLY ON SCREEN | Its words, its state, and what is cut off
        async uiRead(selector, includeBoxes) {
            const scope = selector ? document.querySelector(selector) : document.body;
            if (!scope) throw new Error('nothing matches ' + selector);
            const shows = (el) => {
                const r = el.getBoundingClientRect();
                if (r.width <= 0 || r.height <= 0) return false;
                const s = getComputedStyle(el);
                if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
                return r.bottom > 0 && r.right > 0 && r.left < window.innerWidth && r.top < window.innerHeight;
            };
            const words = (el) => (el.innerText || el.value || el.title || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 90);
            const selectors = 'button, a[href], input, select, textarea, summary, [role=button], [role=menuitem], .na-veg-panel__section, .na-veg-panel__hint, .na-dropdown-menu__panel-title';
            const rows = [], clipped = [];
            Array.from(scope.querySelectorAll(selectors)).filter(shows).forEach((el) => {
                const r = el.getBoundingClientRect();
                const row = { tag : el.tagName.toLowerCase(), text : words(el) };
                if (el.id) row.id = el.id;
                if (el.disabled) row.disabled = true;
                if (el.type === 'checkbox' || el.type === 'radio') row.checked = el.checked;
                else if (el.tagName === 'INPUT' || el.tagName === 'SELECT') row.value = el.value;
                if (includeBoxes) row.box = [r.left, r.top, r.width, r.height].map(Math.round);
                rows.push(row);
                if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && el.tagName !== 'INPUT') clipped.push({ text : row.text, id : el.id || '', overBy : el.scrollWidth - el.clientWidth });
                const holder = el.closest('.na-veg-panel, .na-ent-menu, .na-dropdown-menu__panel');
                if (holder) {
                    const h = holder.getBoundingClientRect();
                    if (r.right > h.right + 1 || r.left < h.left - 1) clipped.push({ text : row.text, id : el.id || '', runsPast : holder.id || holder.className.split(' ')[0], byPx : Math.round(Math.max(r.right - h.right, h.left - r.left)) });
                }
            });
            const panels = Array.from(document.querySelectorAll('.na-veg-panel, .na-ent-menu')).filter(shows);
            const sideways = Array.from(scope.querySelectorAll('.na-veg-panel, .na-veg-panel__scroll, .na-ent-menu, .na-ent-swaps')).filter(shows)
                .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollLeft > 0)
                .map((el) => ({ id : el.id || el.className.split(' ')[0], overBy : el.scrollWidth - el.clientWidth, scrolledBy : el.scrollLeft }));
            const messages = Array.from(document.querySelectorAll('[class*=toast], [class*=Toast], [id*=toast], [id*=Toast]')).filter(shows).map((el) => words(el)).filter(Boolean);
            const menu = document.getElementById('naToolsMenu');
            return { rows, clipped, sideways, openPanels : panels.map((el) => el.id || el.className), messages, toolsMenuOpen : !!(menu && menu.open) };
        },

        // WHAT A PERSON IS OFFERED | Each section of Tools & Settings, and the rows inside those named
        async menuRows(sectionIds) {
            const menu = document.getElementById('naToolsMenu');
            if (menu) menu.open = true;
            const shown = (el) => !!el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none';
            const sections = menu ? Array.from(menu.querySelectorAll(':scope .na-dropdown-menu__item')).filter((li) => shown(li) && li.offsetParent !== null)
                .map((li) => { const b = li.querySelector('button, summary'); return b ? b.innerText.trim().replace(/\s+/g, ' ').replace(/ ?\u25BE$/, '') : ''; }).filter(Boolean) : [];
            const inside = {};
            (sectionIds || []).forEach((id) => {
                const panel = document.getElementById(id);
                if (!panel) return;
                const item = panel.closest('.na-dropdown-menu__item');
                if (item && !shown(item)) { inside[id] = null; return; }
                inside[id] = Array.from(panel.querySelectorAll('button, input, .na-dropdown-menu__panel-title')).map((el) => (el.id ? el.id + ': ' : '') + (el.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean);
            });
            if (menu) menu.open = false;
            return { menu : sections, inside };
        },

        // WHAT IS OPEN | The sections unfolded in Tools & Settings, the plants' and people's panels
        // with their open section (v2.91.0), and the tool that has the model's clicks. The tool host
        // is read only while one of those panels is open, when the page has loaded it already, so
        // this never fetches a staff module. Not resource timing: its list stops at 250, and the app
        // loads more modules than that.
        async panels() {
            const menu = document.getElementById('naToolsMenu');
            const unfolded = Array.from(document.querySelectorAll('#naToolsMenu .na-dropdown-menu__panel.is-open')).map((el) => el.id).filter(Boolean);
            const open = Array.from(document.querySelectorAll('aside.na-veg-panel')).map((panel) => {
                const heads = Array.from(panel.querySelectorAll('.na-scene-hub__head'));
                const opened = heads.find((head) => head.getAttribute('aria-expanded') === 'true');
                const title = panel.querySelector('.na-veg-panel__title');
                return {
                    id       : panel.id,
                    side     : panel.classList.contains('na-veg-panel--left') ? 'left' : 'right',
                    title    : title ? title.textContent.trim() : '',
                    folded   : panel.classList.contains('na-veg-panel--folded'),
                    sections : heads.map((head) => head.dataset.section),
                    open     : opened ? opened.dataset.section : ''
                };
            });
            let tool = null;
            if (open.length > 0) {
                const current = (await load('24__System__Vegetation/20__System__Tools/Na__Vegetation__ToolHost__.js')).Na__VegTools__Current();
                tool = current ? (current.name || 'unnamed') : null;
            }
            return { toolsMenuOpen : !!(menu && menu.open), unfolded, panels : open, toolOnModel : tool };
        },

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
            const wanted = run.Na__VegRun__GetSceneData() ? run.Na__VegRun__WantedPlants() : [];   // <-- With nothing planted yet the layer has not been made
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

        // THE PEOPLE
        async entourage() {
            const data = await load(ENT_DATA);
            const current = data.Na__EntData__Current();
            if (!current) return { enabled : false };
            const run = await load(ENT_RUN);
            const slider = document.getElementById('naEntourageTransparencySlider');
            const figures = current.Entourage__SceneData__Figures;
            const counts = {};
            figures.forEach((figure) => { counts[figure.Entourage__Figure__AssetId] = (counts[figure.Entourage__Figure__AssetId] || 0) + 1; });
            return {
                enabled                    : current.Entourage__SceneData__Enabled === true,
                shown                      : run.Na__EntRun__IsShown(),
                transparencyPercentOnPage  : slider ? Number(slider.value) : null,
                transparencyPercentInRecord: current.Entourage__SceneData__DefaultTransparencyPercent,
                figures                    : figures.length,
                figuresByAsset             : counts,
                unsavedChanges             : data.Na__EntData__IsDirty(),
                stats                      : run.Na__EntRun__GetStats()
            };
        },

        async setEntourage(change) {
            const run = await load(ENT_RUN);
            if (change.shown !== undefined) run.Na__EntRun__SetShown(change.shown === true);
            if (change.transparency_percent !== undefined) {
                run.Na__EntRun__SetTransparency(change.transparency_percent);
                const slider = document.getElementById('naEntourageTransparencySlider');
                if (slider) slider.value = String(change.transparency_percent);
            }
            await requestRender();
            return this.entourage();
        },

        // THE SURFACE | The first real surface below a height, at each plan spot
        async probe(spots, fromHeightMm) {
            const run = await load(RUNTIME);
            const door = await load('24__System__Vegetation/Na__Vegetation__.js');
            if (door.Na__Vegetation__IsActive()) await door.Na__Vegetation__EnsureStarted();        // <-- With nothing planted yet the layer has not been made
            const context = run.Na__VegRun__GetContext();
            if (!context) throw new Error('a probe uses the vegetation system\'s pick, and vegetation is off for this project or for this person');
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
