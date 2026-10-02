// W2-01 scratch (read-only on the app): link the LANDED Drawing Planes overlay, grip and Dev-menu
// controls in Node through ValeVision's own import map (register.mjs), then drive them the way the
// Dev panels and the pointer will, on a model named the way ValeVision's loader names groups:
//   [1] the three new modules link and evaluate with every import (VV's own ProjectData, ActiveView,
//       Invalidation, InteractiveOverlays, Units and the W2-40 leaves); exports equal their export blocks
//   [2] the three Initialize calls index.html makes return true; nothing goes into the scene and no canvas
//       listener is attached while no plane is up (the live app, until W2-04/W2-05 register sources)
//   [3] a vertical plane spans the building plus overshoot (not the 80 m landscape); its bottom edge is
//       100 mm above the ground cut; a horizontal plane spans the building plus overshoot too
//   [4] the planes' root sits in the scene outside the model root and is invisible outside a frame
//       (Na__InteractiveOverlays: what keeps it out of thumbnails, sheet viewports and exports)
//   [5] a pointer drag on the plane's face moves it along its normal and lands the ABSOLUTE position on
//       the chosen increment (50 mm default, then 250 mm) from a start that is off the grid; Escape
//       mid-drag puts the plane back exactly; a release commits
//   [6] the Dev bar and row controls build (stub DOM) and the shown set is kept per project
// Run: node --import ./register.mjs planes_sim.mjs
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const VV  = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const DIR = join(VV, '02__Src__AppModules/47__System__DrawingPlanes');
const url = (f) => pathToFileURL(join(DIR, f)).href;
let checks = 0;
const ok = (label) => { checks++; console.log('  PASS', label); };

// BROWSER STUBS ------------------------------------------------------------------------------
const bus = new EventTarget();
const store = new Map();
class StubElement {
    constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.style = {}; this.dataset = {}; this.attributes = {}; this.listeners = {}; this.isConnected = true; this.textContent = ''; this.className = '';
        const self = this; this.classList = { set : new Set(), add(...c) { c.forEach((x) => this.set.add(x)); }, remove(...c) { c.forEach((x) => this.set.delete(x)); }, toggle(c, on) { if (on === undefined ? !this.set.has(c) : on) this.set.add(c); else this.set.delete(c); }, contains(c) { return this.set.has(c); } }; }
    appendChild(c) { this.children.push(c); return c; }
    append(...c) { c.forEach((x) => this.children.push(x)); }
    replaceChildren(...c) { this.children = c; }
    remove() { this.isConnected = false; }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k] ?? null; }
    removeAttribute(k) { delete this.attributes[k]; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter((x) => x !== f); }
    querySelector() { return null; }
    closest() { return null; }
    querySelectorAll() { return []; }
    click() { (this.listeners.click || []).forEach((f) => f({ preventDefault() {}, stopPropagation() {} })); }
    getContext() { return this.ctx || (this.ctx = { font : '', fillStyle : '', strokeStyle : '', lineWidth : 1, textAlign : '', textBaseline : '', measureText : (t) => ({ width : String(t).length * 36 }),
        fillText() {}, strokeText() {}, fillRect() {}, strokeRect() {}, clearRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {}, quadraticCurveTo() {}, fill() {}, stroke() {}, save() {}, restore() {}, scale() {}, translate() {}, roundRect() {} }); }
}
const byId = new Map();
globalThis.window = globalThis;
globalThis.addEventListener    = bus.addEventListener.bind(bus);
globalThis.removeEventListener = bus.removeEventListener.bind(bus);
globalThis.dispatchEvent       = bus.dispatchEvent.bind(bus);
globalThis.localStorage = { getItem : (k) => (store.has(k) ? store.get(k) : null), setItem : (k, v) => store.set(k, String(v)), removeItem : (k) => store.delete(k) };
globalThis.sessionStorage = { getItem : () => null, setItem : () => {}, removeItem : () => {} };
Object.defineProperty(globalThis, 'location', { value : { search : '?project=2026/3047__Doous', hostname : 'localhost', host : 'localhost:8000', origin : 'http://localhost:8000', protocol : 'http:', pathname : '/ValeVision3D/index.html', href : 'http://localhost:8000/ValeVision3D/index.html?project=2026/3047__Doous' }, configurable : true });
globalThis.document = {
    body : new StubElement('body'),
    createElement : (t) => new StubElement(t),
    getElementById : (id) => byId.get(id) || null,
    querySelector : () => null, querySelectorAll : () => [],
    addEventListener() {}, removeEventListener() {}
};
globalThis.document.body.appendChild = (c) => { if (c.id) byId.set(c.id, c); return c; };
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 0);
globalThis.cancelAnimationFrame  = (h) => clearTimeout(h);
globalThis.fetch = async (u) => {
    const s = String(u);
    if (s.startsWith('file:')) { const text = readFileSync(fileURLToPath(s), 'utf8'); return { ok : true, status : 200, json : async () => JSON.parse(text), text : async () => text }; }
    return { ok : false, status : 404, json : async () => ({}), text : async () => '' };
};

// [1] LINK AND EVALUATE -------------------------------------------------------------------------
console.log('[1] link and evaluate the three new modules through the import map');
const THREE   = await import('three');
const overlay = await import(url('Na__DrawingPlanes__Overlay__.js'));
const grip    = await import(url('Na__DrawingPlanes__Grip__.js'));
const ui      = await import(url('Na__DrawingPlanes__DevMenu__Controls__.js'));
const io      = await import(pathToFileURL(join(VV, '02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js')).href);
ok('Overlay, Grip and DevMenu Controls linked and evaluated (three r' + THREE.REVISION + ')');
const exportBlock = (file) => {
    const text = readFileSync(join(DIR, file), 'utf8');
    const m = text.match(/export\s*\{([\s\S]*?)\};/);
    return m[1].split(',').map((s) => s.replace(/\/\/.*$/m, '').trim()).filter(Boolean).sort();
};
for (const [file, mod] of [['Na__DrawingPlanes__Overlay__.js', overlay], ['Na__DrawingPlanes__Grip__.js', grip], ['Na__DrawingPlanes__DevMenu__Controls__.js', ui]]) {
    assert.deepEqual(Object.keys(mod).sort(), exportBlock(file));
    ok(file + ': ' + Object.keys(mod).length + ' exports, as its export block');
}

// THE MODEL (named as VV's loader names Doous: ValeVision__<Category> groups under the model root) ---
const scene = new THREE.Scene();
const modelRoot = new THREE.Group(); modelRoot.name = 'ModelRoot'; scene.add(modelRoot);
const box = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial()); m.position.set(x, y, z); return m; };
const group = (name, ...kids) => { const g = new THREE.Group(); g.name = name; kids.forEach((k) => g.add(k)); return g; };
// House x 9.6 .. 20.4 (10.8 m), z -4 .. 4 (8 m), y 0.05 .. 6.05; landscape slab 80 m square, y -5 .. 0.05
modelRoot.add(group('ValeVision__MainBuildingModel__ProposedWalls', box(10.8, 6, 8, 15, 3.05, 0)));
modelRoot.add(group('ValeVision__MainBuildingModel__ProposedRoofs', box(10.8, 0.2, 8, 15, 6.15, 0)));   // roof top 6.25
modelRoot.add(group('ValeVision__LandscapeEnvironment', box(80, 5.05, 80, 15, -2.475, 0)));
modelRoot.add(group('ValeVision__SiteBoundaries', box(60, 1, 0.1, 15, 0.55, 30)));
scene.updateMatrixWorld(true);

// [2] INITIALISE AS index.html DOES ------------------------------------------------------------
console.log('[2] the three index.html inits; inert while no plane is up');
const canvasListeners = [];
const canvas = new StubElement('canvas');
canvas.getBoundingClientRect = () => ({ left : 0, top : 0, width : 1000, height : 800 });
const origAdd = canvas.addEventListener.bind(canvas);
canvas.addEventListener = (t, f, cap) => { canvasListeners.push([t, cap]); origAdd(t, f); };
const renderer = { domElement : canvas };
const camera = new THREE.PerspectiveCamera(50, 1000 / 800, 0.1, 2000);
camera.position.set(30, 6, 30); camera.lookAt(15, 3, 0); camera.updateMatrixWorld(true);
const controls = { enabled : true };
const toasts = [];
const showToast = (m, e) => toasts.push([m, e]);
assert.equal(overlay.Na__PlaneOverlay__Initialize({ scene : scene, modelRoot : modelRoot }), true);
assert.equal(grip.Na__PlaneGrip__Initialize({ renderer, camera, controls, modelRoot, showToast }), true);
assert.equal(ui.Na__PlaneUi__Initialize({ showToast }), true);
await new Promise((r) => setTimeout(r, 20));
assert.equal(scene.children.length, 1, 'only the model root in the scene');
assert.equal(canvasListeners.length, 0);
assert.equal(overlay.Na__PlaneOverlay__HasPlanes(), false);
ok('Initialize x3 true; scene still holds only the model root; no canvas listener attached; no plane up');

// A SOURCE as the 2.x elevation editor will register it (W2-05), one front elevation facing +z
const elev = { id : 'Elevation_001', name : 'Front Elevation', positionMm : 6013 };   // off the 50 mm grid on purpose
const commits = [];
overlay.Na__PlaneOverlay__RegisterSource('elevation', {
    kind : overlay.Na__PlaneOverlay__KIND_VERTICAL,
    list : () => [elev], getId : (r) => r.id, getName : (r) => r.name,
    getAxes : () => ({ normalX : 0, normalZ : 1, rightX : 1, rightZ : 0 }),
    getPositionMm : (r) => r.positionMm, setPositionMm : (r, mm) => { r.positionMm = mm; },
    onCommit : (r) => commits.push(r.positionMm)
});
const plan = { id : 'FloorPlan_001', name : 'Ground Floor Plan', cutMm : 1600 };
overlay.Na__PlaneOverlay__RegisterSource('plan', {
    kind : overlay.Na__PlaneOverlay__KIND_HORIZONTAL, paletteOffset : 3,
    list : () => [plan], getId : (r) => r.id, getName : (r) => r.name,
    getPositionMm : (r) => r.cutMm, setPositionMm : (r, mm) => { r.cutMm = mm; }
});

// [3] SIZE AND GROUND ----------------------------------------------------------------------------
console.log('[3] sized from the building, standing 100 mm above the ground cut');
overlay.Na__PlaneOverlay__SetShown('elevation', 'Elevation_001', true);
overlay.Na__PlaneOverlay__SetShown('plan', 'FloorPlan_001', true);
const planes = overlay.Na__PlaneOverlay__GetPlanes();
assert.equal(planes.length, 2);
const ep = planes.find((p) => p.type === 'elevation').frame;
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
assert.ok(near(ep.width, 10.8 + 2 * 1.5), 'width ' + ep.width);
assert.ok(near(ep.origin.x, 9.6 - 1.5) && near(ep.origin.z, 6.013), 'origin ' + ep.origin.toArray());
assert.ok(near(ep.groundUnits, 0.05), 'ground ' + ep.groundUnits);
assert.ok(near(ep.origin.y, 0.15), 'bottom ' + ep.origin.y);
assert.ok(near(ep.origin.y + ep.height, 6.25 + 1.5), 'top ' + (ep.origin.y + ep.height));
ok('elevation plane: width ' + ep.width.toFixed(3) + ' m = 10.8 building + 2 x 1.5 overshoot (the landscape is 80 m); ground cut ' + ep.groundUnits.toFixed(3) + ', bottom edge ' + ep.origin.y.toFixed(3) + ' = cut + 0.100; top ' + (ep.origin.y + ep.height).toFixed(3) + ' = roof 6.25 + 1.5');
const hp = planes.find((p) => p.type === 'plan').frame;
ok('plan plane: ' + hp.width.toFixed(3) + ' x ' + hp.height.toFixed(3) + ' m (building 10.8 x 8 plus overshoot), at y ' + hp.origin.y.toFixed(3));
assert.ok(hp.width < 20 && hp.height < 20);

// [4] OUTSIDE THE MODEL ROOT, INVISIBLE OUTSIDE A FRAME ------------------------------------------
console.log('[4] the planes root: in the scene, outside the model root, hidden between frames');
const root = scene.children.find((c) => c !== modelRoot);
assert.ok(root && root.parent === scene);
let insideModel = false; modelRoot.traverse((c) => { if (c === root) insideModel = true; });
assert.equal(insideModel, false);
assert.equal(root.visible, false);
io.Na__InteractiveOverlays__BeginFrame(); const during = root.visible; io.Na__InteractiveOverlays__EndFrame();
assert.equal(during, true); assert.equal(root.visible, false);
ok('root "' + root.name + '" is a child of the scene, not the model root; visible only between BeginFrame and EndFrame (a thumbnail, sheet viewport or export render never calls BeginFrame)');
assert.ok(canvasListeners.some(([t, cap]) => t === 'pointerdown' && cap === true));
ok('a plane is up: the grip has attached its canvas pointerdown listener in the capture phase');

// [5] DRAG, SNAP, ESCAPE ---------------------------------------------------------------------------
console.log('[5] drag along the normal, absolute snap, Escape restores, release commits');
const fire = (target, type, init) => {
    const ev = { type, button : 0, buttons : init.buttons ?? 0, clientX : init.x, clientY : init.y, target : canvas, key : init.key,
                 preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} };
    if (target === canvas) (canvas.listeners[type] || []).forEach((f) => f(ev));
    else bus.dispatchEvent(Object.assign(new Event(type), ev));
    return ev;
};
// window listeners receive an Event; give them the fields the handlers read
const winFire = (type, init) => {
    const ev = new Event(type, { cancelable : true });
    Object.assign(ev, { button : 0, buttons : init.buttons ?? 0, clientX : init.x, clientY : init.y, key : init.key });
    Object.defineProperty(ev, 'target', { value : canvas });
    bus.dispatchEvent(ev);
};
const toScreen = (v) => { const p = v.clone().project(camera); return { x : (p.x + 1) / 2 * 1000, y : (1 - p.y) / 2 * 800 }; };
// Select the elevation so its face is grabbable, then press on the middle of the face
overlay.Na__PlaneOverlay__Select('elevation', 'Elevation_001');
const centre = ep.origin.clone().add(new THREE.Vector3(ep.width / 2, ep.height / 2, 0));
const s0 = toScreen(centre);
fire(canvas, 'pointerdown', { x : s0.x, y : s0.y, buttons : 1 });
assert.equal(grip.Na__PlaneGrip__IsDragging(), true, 'press on the face starts a drag');
assert.equal(controls.enabled, false);
ok('press on the face at (' + s0.x.toFixed(0) + ', ' + s0.y.toFixed(0) + ') px takes the drag; orbit suppressed');
// Move the pointer toward where the plane would be 1.2 m further along +z
const s1 = toScreen(centre.clone().add(new THREE.Vector3(0, 0, 1.2)));
winFire('pointermove', { x : s1.x, y : s1.y, buttons : 1 });
const live = elev.positionMm;
assert.notEqual(live, 6013);
assert.equal(live % 50, 0, 'absolute 50 mm grid: ' + live);
assert.ok(Math.abs(live - 7213) <= 25, 'about 1.2 m along the normal: ' + live);
ok('drag 1.2 m along the normal from 6 013 (off-grid): position ' + live + ' mm, a multiple of 50 (ABSOLUTE snap, not 6 013 + n x 50)');
assert.equal(overlay.Na__PlaneOverlay__GetPlanes().find((p) => p.type === 'elevation').frame.origin.z.toFixed(3), (live / 1000).toFixed(3));
ok('the plane follows the record live (frame z = ' + (live / 1000).toFixed(3) + ')');
winFire('keydown', { key : 'Escape' });
assert.equal(grip.Na__PlaneGrip__IsDragging(), false);
assert.equal(elev.positionMm, 6013);
assert.equal(controls.enabled, true);
ok('Escape mid-drag: position back to exactly 6 013 mm, orbit restored, onCommit re-derives (' + JSON.stringify(commits) + ')');
// The increment stepper: 50 -> 100 -> 250
overlay.Na__PlaneOverlay__StepSnapIncrement(1); overlay.Na__PlaneOverlay__StepSnapIncrement(1);
assert.equal(overlay.Na__PlaneOverlay__GetSnap().incrementMm, 250);
fire(canvas, 'pointerdown', { x : s0.x, y : s0.y, buttons : 1 });
winFire('pointermove', { x : s1.x, y : s1.y, buttons : 1 });
const live250 = elev.positionMm;
winFire('pointerup', { x : s1.x, y : s1.y });
assert.equal(live250 % 250, 0);
assert.equal(elev.positionMm, live250);
assert.equal(commits[commits.length - 1], live250);
ok('increment 250 mm: released at ' + live250 + ' mm (multiple of 250), committed once');
assert.deepEqual(JSON.parse(store.get('Na__DrawingPlanes__Snap')), { enabled : true, incrementMm : 250 });
ok('snap kept under Na__DrawingPlanes__Snap: ' + store.get('Na__DrawingPlanes__Snap'));

// [6] DEV BAR, ROW CONTROLS, KEPT SHOWN SET ---------------------------------------------------------
console.log('[6] the Dev bar and row controls build; the shown set is kept per project');
const bar = ui.Na__PlaneUi__BuildBar();
const row = ui.Na__PlaneUi__BuildRowControls('elevation', 'Elevation_001', {});
assert.ok(bar && row);
ok('BuildBar and BuildRowControls return elements (' + bar.tagName + ', ' + row.tagName + ')');
const shown = JSON.parse(store.get('Na__DrawingPlanes__Shown'));
assert.deepEqual(Object.keys(shown), ['2026/3047__Doous']);
ok('Na__DrawingPlanes__Shown is keyed by the ?project= folderId: ' + store.get('Na__DrawingPlanes__Shown'));

console.log('\n' + checks + ' checks passed.');
