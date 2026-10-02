// =============================================================================
// W1-11 scratch - North Show Compass harness (CompassGizmo 1.1.0, DevMenu Editor 1.1.0, AppConfig)
// =============================================================================
//
// Loads the REAL modules at their browser URLs through Node module hooks:
// three.js r184 from ValeVision's vendor folder, the render loop's real
// Invalidation and InteractiveOverlays (W1-01), the real North Compass,
// ConfigState, PickTool and Project Data, and the TARGET CompassGizmo and
// DevMenu Editor (candidate | live | pre). The North config is fetched from the
// target too. Stubbed by name only: the drawings data module (a fake drawings
// block), the authoring gate (on) and the drawing broker's camera (none).
//
// Each scenario gets a FRESH module graph (a ?s=<scenario> query carried down
// every app import), a fresh window and page, and the browser storage it is
// handed - so "reload" is a new graph over the storage the last visit left.
//
// Usage: node w1_11_north_harness.mjs [--target candidate|live|pre]
//        env W111_GIZMO / W111_EDITOR / W111_CONFIG: a planted-fault copy (mutation check)
// Exit 0 = every check passed; exit 1 = at least one failed.
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { register } from 'node:module';

const HERE     = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/';
const NORTH    = '02__Src__AppModules/46__System__NorthDirection/';
const GIZMO    = NORTH + 'Na__North__CompassGizmo__.js';
const EDITOR   = NORTH + 'Na__North__DevMenu__Editor__.js';
const CONFIG   = NORTH + 'Na__North__AppConfig__.json';
const OVERLAYS = '02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js';
const THREE_JS = '04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.module.js';
const BASE     = 'http://localhost:8000/ValeVision3D/';

const argTarget = process.argv.includes('--target') ? process.argv[process.argv.indexOf('--target') + 1] : 'candidate';
const pick = (rel, name, envKey) => process.env[envKey] ? process.env[envKey]
    : argTarget === 'live' ? APP_ROOT + rel
    : argTarget === 'pre'  ? join(HERE, 'preimage', name + '.bak')
    : join(HERE, 'candidate', name);
const TARGET = {
    [GIZMO]  : pick(GIZMO,  'Na__North__CompassGizmo__.js',    'W111_GIZMO'),
    [EDITOR] : pick(EDITOR, 'Na__North__DevMenu__Editor__.js', 'W111_EDITOR'),
    [CONFIG] : pick(CONFIG, 'Na__North__AppConfig__.json',     'W111_CONFIG')
};

// STUBS | by name, only where the real module would need the whole app
const STUBS = {
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js': [
        "export const Na__DrawData__CHANGED_EVENT = 'na-layouteditor-drawingsdata-changed';",
        'export function Na__DrawData__GetBlock() { return globalThis.__W111.block; }',
        'export function Na__DrawData__GetElevationsArray() { const b = globalThis.__W111.block; return (b && b.LayoutEditor__DrawingsData__Elevations) || []; }',
        'export async function Na__DrawData__Save(showToast, report) { globalThis.__W111.saves.push({ report : report }); return true; }'
    ].join('\n'),
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__DevGate__.js': 'export function Na__DevGate__IsAuthoringEnabled() { return true; }',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ActiveView__.js': 'export function Na__DrawView__GetCamera() { return null; }'
};

const HOOKS = [
    "import { readFileSync } from 'node:fs';",
    'let S = null;',
    'export async function initialize(d) { S = d; }',
    'function scenarioOf(url) { const q = url.indexOf("?"); return q < 0 ? "" : url.slice(q); }',
    'export async function resolve(spec, ctx, next) {',
    "    const parent = ctx.parentURL || '';",
    '    if (parent.startsWith(S.base)) {',
    "        if (spec === 'three') return { url : S.base + S.three, shortCircuit : true };",
    "        if (spec.startsWith('./') || spec.startsWith('../')) {",
    '            const url = new URL(spec, parent.split("?")[0]).href;',
    "            const app = url.startsWith(S.base + '02__Src__AppModules/');",
    '            return { url : app ? url + scenarioOf(parent) : url, shortCircuit : true };',
    '        }',
    "        throw new Error('bare import not mapped: ' + spec + ' from ' + parent);",
    '    }',
    '    if (spec.startsWith(S.base)) return { url : spec, shortCircuit : true };',
    '    return next(spec, ctx);',
    '}',
    'export async function load(url, ctx, next) {',
    '    if (!url.startsWith(S.base)) return next(url, ctx);',
    "    const rel = decodeURIComponent(url.slice(S.base.length).split('?')[0]);",
    "    if (S.stubs[rel] !== undefined) return { format : 'module', source : S.stubs[rel], shortCircuit : true };",
    "    const file = S.target[rel] || (S.root + rel);",
    "    return { format : 'module', source : readFileSync(file, 'utf8'), shortCircuit : true };",
    '}'
].join('\n');
const tmp = mkdtempSync(join(tmpdir(), 'na-w111-'));
writeFileSync(join(tmp, 'hooks.mjs'), HOOKS);
register(pathToFileURL(join(tmp, 'hooks.mjs')).href, { parentURL : import.meta.url, data : { base : BASE, root : APP_ROOT, target : TARGET, stubs : STUBS, three : THREE_JS } });

const out   = (s) => process.stdout.write(s + '\n');
const quiet = [];
console.log = (...a) => quiet.push(a.join(' '));
console.warn = (...a) => quiet.push(a.join(' '));
console.info = (...a) => quiet.push(a.join(' '));

let failures = 0, passes = 0;
function check(name, passed, detail) {
    if (passed) passes++; else failures++;
    out((passed ? '  PASS  ' : '  FAIL  ') + name + ((!passed && detail !== undefined) ? '  -> ' + JSON.stringify(detail) : ''));
}


// -----------------------------------------------------------------------------
// The page: a window that records listeners, a DOM just deep enough for the panel
// -----------------------------------------------------------------------------

function MakeStorage(store, refuse) {
    return {
        getItem(k) { if (refuse) throw new Error('SecurityError'); return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
        setItem(k, v) { if (refuse) throw new Error('SecurityError'); store[k] = String(v); },
        removeItem(k) { if (refuse) throw new Error('SecurityError'); delete store[k]; }
    };
}

function El(tag) {
    const classes = new Set(); const handlers = {}; const attrs = {};
    const el = {
        tag, children : [], style : {}, disabled : false, title : '', value : '', type : '', textContent : '',
        set innerHTML(v) { this.children = []; }, get innerHTML() { return ''; },
        set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); },
        get className() { return [ ...classes ].join(' '); },
        classList : {
            add : (c) => classes.add(c), remove : (c) => classes.delete(c), contains : (c) => classes.has(c),
            toggle : (c, f) => { const on = f === undefined ? !classes.has(c) : !!f; if (on) classes.add(c); else classes.delete(c); return on; }
        },
        setAttribute(k, v) { attrs[k] = String(v); }, getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
        appendChild(c) { this.children.push(c); return c; },
        addEventListener(t, fn) { (handlers[t] = handlers[t] || []).push(fn); },
        removeEventListener() {},
        click() { (handlers.click || []).forEach((fn) => fn({ type : 'click' })); },
        querySelector(sel) {
            const m = /^\[([\w-]+)="([^"]*)"\]$/.exec(sel);
            const walk = (node) => { for (const c of node.children) { if (m && c.getAttribute && c.getAttribute(m[1]) === m[2]) return c; const f = walk(c); if (f) return f; } return null; };
            return walk(this);
        },
        all() { const list = []; const walk = (n) => n.children.forEach((c) => { list.push(c); walk(c); }); walk(this); return list; }
    };
    return el;
}

function NewPage(storeObject, refuseStorage) {
    const listeners = new Map();
    globalThis.window = {
        localStorage : MakeStorage(storeObject, refuseStorage),
        dispatchEvent(e) { (listeners.get(e.type) || []).slice().forEach((fn) => fn(e)); return true; },
        addEventListener(t, fn) { if (!listeners.has(t)) listeners.set(t, []); listeners.get(t).push(fn); },
        removeEventListener(t, fn) { const l = listeners.get(t) || []; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); },
        confirm() { return true; }
    };
    const page = { naNorthDevItem : El('li'), naNorthDevToggle : El('button'), naNorthDevPanel : El('div') };
    page.naNorthDevItem.style.display = 'none';
    globalThis.document = { getElementById : (id) => page[id] || null, createElement : (t) => El(t), activeElement : null, hidden : false };
    if (typeof globalThis.CustomEvent !== 'function') globalThis.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i ? i.detail : undefined; } };
    return { page, listeners };
}

globalThis.fetch = async (url) => {
    const rel = decodeURIComponent(String(url).slice(BASE.length).split('?')[0]);
    const file = (rel === CONFIG) ? (globalThis.__W111.configFile || TARGET[CONFIG]) : (APP_ROOT + rel);
    let text;
    try { text = readFileSync(file, 'utf8'); } catch (e) { return { ok : false, status : 404, json : async () => ({}) }; }
    return { ok : true, status : 200, json : async () => JSON.parse(text) };
};


// -----------------------------------------------------------------------------
// One visit: a fresh graph, page and scene over the storage it is given
// -----------------------------------------------------------------------------

const NORTH_RECORD = { North__BearingDeg : 30, North__OriginMm : { PosX : 4000, PosY : 0, PosZ : -2000 }, North__SetIso : '2026-09-20T10:00:00.000Z' };
function BlockWithNorth() { return { LayoutEditor__DrawingsData__North : JSON.parse(JSON.stringify(NORTH_RECORD)), LayoutEditor__DrawingsData__Elevations : [ { Elevation__Id : 'e1', Elevation__Name : 'Front', Elevation__AzimuthDeg : 90 } ] }; }

async function Visit(scenario, opts) {
    globalThis.__W111 = { block : opts.block, saves : [], configFile : opts.configFile || null };
    const { page, listeners } = NewPage(opts.store, opts.refuseStorage === true);
    const q = '?s=' + scenario;
    const THREE    = await import(BASE + THREE_JS);
    const overlays = await import(BASE + OVERLAYS + q);
    const gizmo    = await import(BASE + GIZMO + q);
    const editor   = await import(BASE + EDITOR + q);
    const north    = await import(BASE + NORTH + 'Na__North__ProjectJson__Data__.js' + q);

    const scene = new THREE.Scene();
    const modelRoot = new THREE.Group();
    const house = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 8), new THREE.MeshBasicMaterial());
    house.position.set(2, 3, -1);
    modelRoot.add(house);
    scene.add(modelRoot);
    modelRoot.updateMatrixWorld(true);
    gizmo.Na__NorthGizmo__Initialize(scene);
    const toasts = [];
    const ready = await editor.Na__North__DevMenu__Initialize({ modelRoot : modelRoot, showToast : (m, e) => toasts.push({ m, e }) });

    const compass = () => scene.getObjectByName(gizmo.Na__NorthGizmo__GROUP_NAME) || null;
    // What a renderer draws: WebGLRenderer.projectObject recurses only through visible objects - scene.traverseVisible.
    const drawn = () => { const seen = new Set(); scene.traverseVisible((o) => seen.add(o)); return seen; };
    const compassDrawn = () => { const g = compass(); if (!g) return false; const seen = drawn(); return seen.has(g) || g.children.some((c) => seen.has(c)); };
    const inFrame = (fn) => { overlays.Na__InteractiveOverlays__BeginFrame(); try { return fn(); } finally { overlays.Na__InteractiveOverlays__EndFrame(); } };
    const toggle = () => page.naNorthDevToggle.click();
    const isOpen = () => page.naNorthDevPanel.classList.contains('is-open');
    const showButton = () => page.naNorthDevPanel.all().find((c) => c.tag === 'button' && c.textContent === 'Show Compass') || null;
    const changed = () => window.dispatchEvent(new CustomEvent('na-layouteditor-drawingsdata-changed', { detail : { reason : 'loaded' } }));
    return { THREE, overlays, gizmo, editor, north, scene, modelRoot, page, listeners, ready, toasts, compass, compassDrawn, inFrame, toggle, isOpen, showButton, changed };
}

const flush = () => new Promise((r) => setTimeout(r, 0));


// -----------------------------------------------------------------------------
// Static checks on the target texts
// -----------------------------------------------------------------------------

out('W1-11 North Show Compass harness - target: ' + argTarget + (process.env.W111_GIZMO || process.env.W111_EDITOR || process.env.W111_CONFIG ? ' (planted fault)' : ''));
out('');
out('Static');
const gizmoText  = readFileSync(TARGET[GIZMO], 'utf8');
const editorText = readFileSync(TARGET[EDITOR], 'utf8');
const configJson = JSON.parse(readFileSync(TARGET[CONFIG], 'utf8'));
const code = (t) => t.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
check('S1 gizmo never sets object.visible itself (the registry alone does)', !/\.visible\s*=(?!=)/.test(code(gizmoText)));
check('S2 gizmo registers its group with Na__InteractiveOverlays and unregisters it on dispose', /Na__InteractiveOverlays__Register\(Na__NorthGizmo__Group\)/.test(gizmoText) && /Na__InteractiveOverlays__Unregister\(Na__NorthGizmo__Group\)/.test(gizmoText));
check('S3 editor no longer hears na-layouteditor-mode-changed or na-layouteditor-snapshot-queue (DR-32)', !/na-layouteditor-mode-changed|na-layouteditor-snapshot-queue/.test(code(editorText)));
const gizmoBlock = configJson.NorthDirection__Gizmo__Config || {};
const labels = configJson.NorthDirection__Labels__Config || {};
check('S4 config: ShownByDefault false and the three Show Compass labels', gizmoBlock.NorthDirection__Gizmo__ShownByDefault === false
    && labels.NorthDirection__Labels__ShowCompassLabel === 'Show Compass'
    && typeof labels.NorthDirection__Labels__ShowCompassOnHint === 'string' && typeof labels.NorthDirection__Labels__ShowCompassOffHint === 'string',
    { ShownByDefault : gizmoBlock.NorthDirection__Gizmo__ShownByDefault, label : labels.NorthDirection__Labels__ShowCompassLabel });


// -----------------------------------------------------------------------------
// Visit A - first visit: nothing kept; the panel; the Show Compass toggle; renders while kept
// -----------------------------------------------------------------------------

out('');
out('A. First visit: the toggle, and renders while the compass is kept');
const store = {};
let ok = true;
try {
    const v = await Visit('A', { store, block : BlockWithNorth() });
    v.changed();
    check('A1 the section initialises and is revealed', v.ready === true && v.page.naNorthDevItem.style.display === '', { ready : v.ready });
    check('A2 nothing kept, panel shut: no compass in the scene', v.compass() === null && v.gizmo.Na__NorthGizmo__IsVisible() === false);
    v.toggle();
    check('A3 panel open: the compass is up (wanted) and in the scene', v.isOpen() && v.compass() !== null && v.gizmo.Na__NorthGizmo__IsVisible() === true);
    const btn = v.showButton();
    check('A4 Show Compass button: present, not pressed, enabled with north set, off hint', !!btn && btn.getAttribute('aria-pressed') === 'false' && btn.disabled === false && btn.title === labels.NorthDirection__Labels__ShowCompassOffHint,
        btn ? { pressed : btn.getAttribute('aria-pressed'), disabled : btn.disabled, title : btn.title } : 'no button');
    if (btn) btn.click();
    const btn2 = v.showButton();
    check('A5 pressed: kept in the browser ("true") and the button reads pressed with the on hint', store.Na__North__CompassShown === 'true' && !!btn2 && btn2.getAttribute('aria-pressed') === 'true'
        && btn2.className.includes('na-pm-dev__btn--primary') && btn2.title === labels.NorthDirection__Labels__ShowCompassOnHint, { stored : store.Na__North__CompassShown });
    v.toggle();
    check('A6 panel closed with Show Compass on: the compass stays (wanted, in the scene)', !v.isOpen() && v.compass() !== null && v.gizmo.Na__NorthGizmo__IsVisible() === true);
    const g = v.compass();
    check('A7 between frames the group is invisible: a sheet render / thumbnail / export draws no compass', !!g && g.visible === false && v.compassDrawn() === false);
    check('A8 inside a live 3D frame (BeginFrame) the compass is drawn, and invisible again after EndFrame', v.inFrame(() => v.compassDrawn()) === true && v.compassDrawn() === false && g.visible === false);
    window.dispatchEvent(new CustomEvent('na-layouteditor-mode-changed', { detail : { isActive : true, mode : 'sheet' } }));
    window.dispatchEvent(new CustomEvent('na-layouteditor-snapshot-queue', { detail : { outstanding : 2 } }));
    check('A9 a sheet opening and a snapshot queue no longer touch it (DR-32): still wanted, still not drawn between frames',
        v.gizmo.Na__NorthGizmo__IsVisible() === true && v.compass() === g && v.compassDrawn() === false
        && !v.listeners.has('na-layouteditor-mode-changed') && !v.listeners.has('na-layouteditor-snapshot-queue'));
    // A full model render path as the exporters run it: the scene drawn with a camera, between ticks.
    const cam = new v.THREE.PerspectiveCamera(50, 1.5, 0.1, 1000);
    const projected = []; v.scene.traverseVisible((o) => { if (o.isMesh || o.isLine) projected.push(o.name || o.type); });
    check('A10 the objects a render would project between frames are the model only (no compass part)', projected.length === 1 && projected[0] === 'Mesh', projected);
    void cam;
} catch (error) { ok = false; check('A visit ran', false, String(error && error.stack || error)); }


// -----------------------------------------------------------------------------
// Visit B - reload: Show Compass remembered, panel never opened
// -----------------------------------------------------------------------------

out('');
out('B. Reload with Show Compass on: the compass comes back with no panel opened');
try {
    const v = await Visit('B', { store, block : BlockWithNorth() });
    check('B1 the browser still holds the toggle', store.Na__North__CompassShown === 'true');
    check('B2 north already loaded at start-up: the compass is back up at once, panel never opened', v.gizmo.Na__NorthGizmo__IsVisible() === true && v.compass() !== null
        && !v.isOpen() && v.page.naNorthDevToggle.getAttribute('aria-expanded') === null);
    const g = v.compass();
    const lift = 0.04;   // LiftMm 40 -> metres
    check('B3 it stands where north was drawn, turned to the bearing, sized from the model', !!g && Math.abs(g.position.x - 4) < 1e-9 && Math.abs(g.position.y - lift) < 1e-9 && Math.abs(g.position.z + 2) < 1e-9
        && Math.abs(g.rotation.y + 30 * Math.PI / 180) < 1e-9 && Math.abs(g.scale.x - 0.75) < 1e-9, g ? { p : g.position.toArray(), ry : g.rotation.y, s : g.scale.x } : null);
    check('B4 registered: not drawn between frames, drawn inside one', v.compassDrawn() === false && v.inFrame(() => v.compassDrawn()) === true && v.compassDrawn() === false);
} catch (error) { check('B visit ran', false, String(error && error.stack || error)); }


// -----------------------------------------------------------------------------
// Visit C - reload where the drawings arrive after the section has started (the app's own order)
// -----------------------------------------------------------------------------

out('');
out('C. Reload, drawings block arriving after start-up');
try {
    const v = await Visit('C', { store, block : {} });
    check('C1 no north yet: nothing to point at, no compass', v.compass() === null && v.gizmo.Na__NorthGizmo__IsVisible() === false);
    globalThis.__W111.block = BlockWithNorth();
    v.changed();
    check('C2 the drawings land: the kept compass puts itself up, panel still shut', v.gizmo.Na__NorthGizmo__IsVisible() === true && v.compass() !== null && !v.isOpen());
    globalThis.__W111.block = {};
    v.changed();
    check('C3 a project without north replaces it: the compass goes, and is handed back invisible', v.compass() === null && v.gizmo.Na__NorthGizmo__IsVisible() === false);
} catch (error) { check('C visit ran', false, String(error && error.stack || error)); }


// -----------------------------------------------------------------------------
// Visit D - Show Compass off: up only while the panel is open; disposed on close
// -----------------------------------------------------------------------------

out('');
out('D. Show Compass off');
try {
    const offStore = { Na__North__CompassShown : 'false' };
    const v = await Visit('D', { store : offStore, block : BlockWithNorth() });
    v.changed();
    check('D1 stored off: no compass with the panel shut', v.compass() === null);
    v.toggle();
    const g = v.compass();
    check('D2 panel open: the compass is up', !!g && v.gizmo.Na__NorthGizmo__IsVisible() === true);
    v.toggle();
    check('D3 panel closed: disposed - out of the scene, unregistered, never drawn by a later frame', v.compass() === null && !!g && g.visible === false
        && v.inFrame(() => g.visible) === false && g.parent === null);
    v.toggle();
    const btn = v.showButton(); if (btn) btn.click();           // on
    const btn2 = v.showButton(); if (btn2) btn2.click();        // off again, panel still open
    check('D4 switched off with the panel open: still up (it does not vanish under the hand), stored "false"', v.gizmo.Na__NorthGizmo__IsVisible() === true && offStore.Na__North__CompassShown === 'false');
    v.toggle();
    check('D5 then closed: gone', v.compass() === null);
} catch (error) { check('D visit ran', false, String(error && error.stack || error)); }


// -----------------------------------------------------------------------------
// Visit E - the config default answers when the browser holds nothing
// -----------------------------------------------------------------------------

out('');
out('E. ShownByDefault');
try {
    const cfg = JSON.parse(readFileSync(TARGET[CONFIG], 'utf8'));
    cfg.NorthDirection__Gizmo__Config.NorthDirection__Gizmo__ShownByDefault = true;
    const file = join(tmp, 'config-shown.json');
    writeFileSync(file, JSON.stringify(cfg));
    const v = await Visit('E', { store : {}, block : BlockWithNorth(), configFile : file });
    v.changed();
    check('E1 nothing stored, config ShownByDefault true: kept without the panel ever opening', v.gizmo.Na__NorthGizmo__IsKept() === true && v.gizmo.Na__NorthGizmo__IsVisible() === true && !v.isOpen());
    const v2 = await Visit('E2', { store : {}, block : BlockWithNorth() });
    v2.changed();
    check('E2 nothing stored, the shipped config (false): not kept, no compass', v2.gizmo.Na__NorthGizmo__IsKept() === false && v2.compass() === null);
} catch (error) { check('E visit ran', false, String(error && error.stack || error)); }


// -----------------------------------------------------------------------------
// Visit F - no north set; storage refused; Clear North while kept
// -----------------------------------------------------------------------------

out('');
out('F. Edges');
try {
    const v = await Visit('F', { store : {}, block : {} });
    v.toggle();
    const btn = v.showButton();
    check('F1 north not set: Show Compass is there but disabled, and nothing is drawn', !!btn && btn.disabled === true && v.compass() === null);

    const v2 = await Visit('F2', { store : {}, block : BlockWithNorth(), refuseStorage : true });
    v2.changed();
    v2.toggle();
    const b2 = v2.showButton(); if (b2) b2.click();
    v2.toggle();
    check('F2 a browser that refuses storage still toggles for the visit', v2.gizmo.Na__NorthGizmo__IsKept() === true && v2.gizmo.Na__NorthGizmo__IsVisible() === true && !v2.isOpen());

    const keptStore = { Na__North__CompassShown : 'true' };
    const v3 = await Visit('F3', { store : keptStore, block : BlockWithNorth() });
    v3.toggle();
    const clear = v3.page.naNorthDevPanel.all().find((c) => c.tag === 'button' && c.textContent === 'Clear North');
    if (clear) clear.click();
    check('F3 Clear North while kept: the compass goes (nothing to point at)', !!clear && v3.compass() === null && v3.gizmo.Na__NorthGizmo__IsVisible() === false);
    const saveBtn = v3.page.naNorthDevPanel.all().find((c) => c.tag === 'button' && c.textContent === 'Save North');
    if (saveBtn) saveBtn.click();
    await flush();
    check('F4 Save North still goes through the drawings save (one call, TV call shape)', !!saveBtn && globalThis.__W111.saves.length === 1);
} catch (error) { check('F visit ran', false, String(error && error.stack || error)); }

// -----------------------------------------------------------------------------
// Visit G - a sheet opens while the panel is open (the Layout Editor shuts the 3D menus by class)
// -----------------------------------------------------------------------------

out('');
out('G. A sheet opens with the panel open and Show Compass off (TrueVision 1.1.0 behaviour, recorded)');
try {
    const v = await Visit('G', { store : { Na__North__CompassShown : 'false' }, block : BlockWithNorth() });
    v.toggle();
    const g = v.compass();
    // Na__LeMode__CloseModelMenus (identical in both apps): every open 3D panel loses is-open by class, then the sheet is announced.
    v.page.naNorthDevPanel.classList.remove('is-open');
    v.page.naNorthDevToggle.setAttribute('aria-expanded', 'false');
    window.dispatchEvent(new CustomEvent('na-layouteditor-mode-changed', { detail : { isActive : true, mode : 'sheet' } }));
    check('G1 the sheet\'s renders cannot see the compass the panel had up: not drawn between frames', !!g && v.compassDrawn() === false && g.visible === false);
    const stillWanted = v.gizmo.Na__NorthGizmo__IsVisible();
    out('  INFO  G2 after the class-only collapse the compass is still wanted: ' + stillWanted + ' (TrueVision 1.1.0 does the same - nothing tells the editor; it goes at its next sync)');
    v.toggle(); v.toggle();
    check('G3 the next open-and-close of the panel takes it down', v.compass() === null && v.gizmo.Na__NorthGizmo__IsVisible() === false);
} catch (error) { check('G visit ran', false, String(error && error.stack || error)); }

rmSync(tmp, { recursive : true, force : true });
out('');
out(failures === 0 ? '  PASS - ' + passes + '/' + passes + ' checks passed.' : '  FAIL - ' + failures + ' of ' + (passes + failures) + ' check(s) failed.');
process.exit(failures === 0 ? 0 : 1);
