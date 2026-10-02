// =============================================================================
// W1-23 scratch harness (not shipped; lives in execution/scratch/W1-23)
// =============================================================================
// Drives the seven W1-23 modules for real - SnapshotRenderer, the Viewport 2D
// units (Window, Frame, Linework, Viewport2d), Viewport3d and the PDF exporter -
// wired to each other, with everything outside them stubbed and recorded, over
// the 3047__Doous sheet read from the local project.json (read only).
//
//   node w1_23_harness.mjs --set before|candidate|live [--mix Leaf=set,...] [--out file.json]
//
// It writes an event log of everything the modules hand the outside world -
// every RenderToCanvas call (camera, view window, pixel size), every preset,
// section and width call, every linework projection and cache key, every
// viewport state key, every PDF drawing call, every console warning - for:
//   S1 the 2D viewport filled on screen (underlay and linework)
//   S2 the 3D viewport filled on screen
//   S3 the 3D viewport zoomed to 150% (a window of the picture)
//   S4 a 2D render still queued when its sheet is left (parked: skipped)
//   S5 a 3D render still queued when its sheet is left (parked: skipped)
//   S6 the PDF of the sheet, and of the sheet with its 3D viewport zoomed 150%
//   S7 a forced re-render of the 2D viewport
// Two sets that behave the same write the same log ("compare" mode diffs two).
// Then, when the SnapshotRenderer has TrueVision's signatures, the contract
// checks (C1-C5) of the new argument positions and the Describe stub run.
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const VV   = resolve(HERE, '..', '..', '..', '..');
const LE   = join(VV, '02__Src__AppModules', '51__System__LayoutEditor');
const PROJECT = resolve(VV, '..', 'Whitecardopedia', 'Projects', '2026', '3047__Doous', 'project.json');

const LIVE = {
    'Na__LayoutEditor__SnapshotRenderer__.js'     : join(LE, '25__System__RenderStyles', 'Na__LayoutEditor__SnapshotRenderer__.js'),
    'Na__LayoutEditor__Viewport2d__Window__.js'   : join(LE, '20__System__Viewports', 'Na__LayoutEditor__Viewport2d__Window__.js'),
    'Na__LayoutEditor__Viewport2d__Frame__.js'    : join(LE, '20__System__Viewports', 'Na__LayoutEditor__Viewport2d__Frame__.js'),
    'Na__LayoutEditor__Viewport2d__Linework__.js' : join(LE, '20__System__Viewports', 'Na__LayoutEditor__Viewport2d__Linework__.js'),
    'Na__LayoutEditor__Viewport2d__.js'           : join(LE, '20__System__Viewports', 'Na__LayoutEditor__Viewport2d__.js'),
    'Na__LayoutEditor__Viewport3d__.js'           : join(LE, '20__System__Viewports', 'Na__LayoutEditor__Viewport3d__.js'),
    'Na__LayoutEditor__PdfExporter__.js'          : join(LE, '60__Feature__PdfExport', 'Na__LayoutEditor__PdfExporter__.js')
};

// -----------------------------------------------------------------------------
// Arguments
// -----------------------------------------------------------------------------
const argv = process.argv.slice(2);
const arg  = (name, dflt) => { const i = argv.indexOf(name); return i === -1 ? dflt : argv[i + 1]; };

if (argv[0] === 'compare') {
    const a = JSON.parse(readFileSync(argv[1], 'utf8'));
    const b = JSON.parse(readFileSync(argv[2], 'utf8'));
    const la = a.events, lb = b.events;
    let first = -1;
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
        if (JSON.stringify(la[i]) !== JSON.stringify(lb[i])) { first = i; break; }
    }
    if (first === -1) {
        console.log('IDENTICAL: ' + la.length + ' events (' + a.label + ' vs ' + b.label + ')');
        process.exit(0);
    }
    console.log('DIFFERENT at event ' + first + ' of ' + la.length + ' / ' + lb.length + ' (' + a.label + ' vs ' + b.label + ')');
    console.log('  ' + a.label + ': ' + JSON.stringify(la[first]));
    console.log('  ' + b.label + ': ' + JSON.stringify(lb[first]));
    process.exit(1);
}

const SET = arg('--set', 'candidate');
const MIX = (arg('--mix', '') || '').split(',').filter(Boolean).map((s) => s.split('='));
const OUT = arg('--out', join(HERE, 'harness__' + SET + (MIX.length ? '__mix' : '') + '.json'));
const pathFor = (leaf) => {
    const mixed = MIX.find(([l]) => l === leaf);
    const which = mixed ? mixed[1] : SET;
    if (which === 'live') return LIVE[leaf];
    return join(HERE, which, leaf);
};

// -----------------------------------------------------------------------------
// The event log
// -----------------------------------------------------------------------------
const events = [];
let scenario = '-';
const plain = (value, depth = 0) => {
    if (typeof value === 'function') return 'fn';
    if (value === undefined) return '(undefined)';
    if (value === null || typeof value !== 'object') return value;
    if (depth > 6) return '(deep)';
    if (value.__tag) return '#' + value.__tag;
    if (ArrayBuffer.isView(value)) return 'typed[' + value.length + ']';
    if (Array.isArray(value)) return value.map((v) => plain(v, depth + 1));
    const out = {};
    Object.keys(value).sort().forEach((k) => { out[k] = plain(value[k], depth + 1); });
    return out;
};
const rec = (kind, data) => { events.push({ s : scenario, k : kind, d : plain(data) }); };

const unstubbed = new Set();
const consoleWarn = console.warn, consoleError = console.error, consoleLog = console.log;
console.warn  = (...a) => rec('console.warn', a.map((x) => (x instanceof Error ? 'Error: ' + x.message : x)));
console.error = (...a) => rec('console.error', a.map((x) => (x instanceof Error ? 'Error: ' + x.message : x)));
console.log   = () => {};                                                     // <-- The linework timing line carries milliseconds
const say = (...a) => consoleLog(...a);

// -----------------------------------------------------------------------------
// A browser to run in
// -----------------------------------------------------------------------------
class FakeEl {
    constructor(tag) { this.tagName = tag; this.className = ''; this.hidden = false; this.style = {}; this.textContent = ''; this._html = ''; this.children = []; this.attrs = {}; this.src = ''; this.alt = ''; this.draggable = true; this.firstElementChild = null; }
    appendChild(child) { this.children.push(child); return child; }
    set innerHTML(v) { this._html = String(v); this.children = []; this.firstElementChild = this._html ? new FakeEl('svg') : null; }
    get innerHTML() { return this._html; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
}
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = {
    setTimeout : (fn, ms) => setTimeout(fn, ms), clearTimeout : (t) => clearTimeout(t),
    setInterval : (fn, ms) => setInterval(fn, ms), clearInterval : (t) => clearInterval(t),
    addEventListener : () => {}, removeEventListener : () => {},
    dispatchEvent : (e) => { if (e && e.type === 'na-layouteditor-snapshot-queue') rec('queue', e.detail); return true; }
};
globalThis.document = { createElement : (tag) => new FakeEl(tag), head : { appendChild : () => {} } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// three.js, as much of it as the renderer touches
class V3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } clone() { return new V3(this.x, this.y, this.z); } copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; } }
class Quat { constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; } clone() { const q = new Quat(); Object.assign(q, this); return q; } copy(q) { Object.assign(this, q); return this; } }
class OrthographicCamera {
    constructor(l, r, t, b, n, f) { Object.assign(this, { left : l, right : r, top : t, bottom : b, near : n, far : f, zoom : 1, name : '' }); this.position = new V3(); this.up = new V3(0, 1, 0); this.lookedAt = null; }
    lookAt(x, y, z) { this.lookedAt = [ x, y, z ]; }
    updateProjectionMatrix() {}
    updateMatrixWorld() {}
}
class Box3 { setFromObject() { return this; } isEmpty() { return true; } getCenter(v) { return v; } }
const THREE = { OrthographicCamera, Box3, Vector3 : V3 };

const mainCamera = { __tag : 'MainCamera', position : new V3(1, 2, 3), quaternion : new Quat(), fov : 45, zoom : 1, updateProjectionMatrix() {} };
const controls   = { __tag : 'Controls', target : new V3(0, 0, 0), update() {} };
const profilePass = { __tag : 'ProfilePass', enabled : true };

// -----------------------------------------------------------------------------
// The project (read only)
// -----------------------------------------------------------------------------
const project  = JSON.parse(readFileSync(PROJECT, 'utf8'));
const drawings = project.LayoutEditor__DrawingsData;
const SHEET    = drawings.LayoutEditor__DrawingsData__Sheets[0];
const ELEVS    = drawings.LayoutEditor__DrawingsData__Elevations || [];
const PLANS    = drawings.LayoutEditor__DrawingsData__FloorPlans || [];
const SCENES   = (project.PresentationMode__SavedCameraScenes || {}).PresentationMode__SavedCameraScenes__Scenes || [];
const clone    = (o) => JSON.parse(JSON.stringify(o));

const hash = (text) => { let h = 5381; for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

// -----------------------------------------------------------------------------
// Loading a module with its imports bound to stubs or to other loaded modules
// -----------------------------------------------------------------------------
const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+?)\s+from\s+'([^']+)';[ \t]*(?:\/\/[^\n]*)?$/gm;
const TMP = mkdtempSync(join(tmpdir(), 'W1-23__harness__'));
let loadCount = 0;
async function load(leaf, stubs) {
    let src = readFileSync(pathFor(leaf), 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        const list = m[1].trim();
        if (list.charAt(0) === '{') {
            list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
        } else if (list.charAt(0) === '*') {
            names.push(list.split(/\s+as\s+/).pop().trim());
        } else {
            throw new Error(leaf + ': unexpected import form ' + list);
        }
    }
    src = src.replace(IMPORT, '');
    const key = '__W123Stubs' + (++loadCount);
    globalThis[key] = stubs;
    const head = names.map((n) => 'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key
        + '["' + n + '"] : function () { globalThis.__W123Unstubbed("' + leaf + ':' + n + '"); return undefined; };').join('\n');
    const file = join(TMP, loadCount + '__' + leaf.replace(/\.js$/, '.mjs'));
    writeFileSync(file, head + '\n' + src, 'utf8');
    return import(pathToFileURL(file).href);
}
globalThis.__W123Unstubbed = (name) => { unstubbed.add(name); rec('unstubbed', name); };

// -----------------------------------------------------------------------------
// The outside world, stubbed and recorded
// -----------------------------------------------------------------------------
let gate = null;                                                                // <-- When set, RenderToCanvas waits on it
let renderCalls = 0;
const recFn = (name, ret) => (...a) => { rec(name, a); return typeof ret === 'function' ? ret(...a) : ret; };

const resolveSource = (viewport) => {
    const id = viewport.Viewport__DrawingId;
    const elevation = ELEVS.find((e) => e.Elevation__Id === id) || null;
    const plan = PLANS.find((p) => p.FloorPlan__Id === id) || null;
    const scene = SCENES.find((s) => s.PresentationMode__Scene__Id === viewport.Viewport__SceneId)
        || { PresentationMode__Scene__Id : viewport.Viewport__SceneId, PresentationMode__Scene__Name : 'stand-in ' + viewport.Viewport__SceneId };
    return viewport.Viewport__Kind === '2d' ? { plan, elevation, scene : null } : { plan : null, elevation : null, scene };
};
const definitionFor = (kind, record, override, exclude) => ({
    Kind : kind, Record : record, ViewKey : kind + ':' + (record.Elevation__Id || record.FloorPlan__Id),
    RecordHash : hash(JSON.stringify([ record, override, exclude ]))
});
const lineworkSetup = { visibleWidthMm : 0.25, hiddenWidthMm : 0.18, authoredWidthMm : 0.25, sectionWidthMm : 0.35, hiddenDashMm : 1.2, minSegmentPaperMm : 0.01 };
const rasterFit = (w, h, profile) => ({ w : Math.round(w * profile.pixelsPerMm), h : Math.round(h * profile.pixelsPerMm), samples : profile.samples });
const working = { pixelsPerMm : 6, maxPixels : 8e6, samples : 2 };
const exporting = { pixelsPerMm : 12, maxPixels : 3e7, samples : 4 };
const weight = (viewport, key) => ({ profileLinework : 1.25, sectionOutline : 2, baseImage : 0.75 })[key] || null;
const cacheKey = (definition, modelFp) => { rec('PlView.CacheKey', { def : definition.ViewKey, hash : definition.RecordHash, modelFp }); return 'ck|' + definition.RecordHash + '|' + modelFp; };
const viewFingerprint = (definition, modelFp) => { rec('PlView.Fingerprint', { def : definition.ViewKey, modelFp }); return 'fp|' + definition.RecordHash + '|' + modelFp; };
const classesFor = () => ({
    visible  : new Float32Array([ 13000, -2500, 14000, -2500, 14000, -2500, 14000, -1500 ]),
    hidden   : new Float32Array([ 13200, -2400, 13800, -1600 ]),
    authored : new Float32Array([ 13100, -2300, 13900, -2300 ]),
    section  : new Float32Array([])
});

async function renderToCanvas(options) {
    renderCalls += 1;
    const cam = options.camera;
    rec('RenderToCanvas', {
        camera : cam === mainCamera ? 'main' : (cam && cam.name ? cam.name : 'other'),
        renderer : options.renderer, scene : options.scene,
        pipelineFn : typeof options.getRenderPipelineState,
        elevationOverrides : options.elevationOverrides, renderFrame : typeof options.renderFrame,
        antiAliasSamples : options.antiAliasSamples,
        viewWindow : Object.prototype.hasOwnProperty.call(options, 'viewWindow') ? options.viewWindow : '(absent)',
        targetWidth : options.targetWidth, targetHeight : options.targetHeight
    });
    if (gate) await gate.promise;
    const canvas = { __tag : 'Canvas', toDataURL : (type) => 'data:' + type + ';w=' + options.targetWidth + ';h=' + options.targetHeight };
    return { canvas, width : options.targetWidth, height : options.targetHeight };
}

// -----------------------------------------------------------------------------
// Load the seven, leaves first
// -----------------------------------------------------------------------------
const Snap = await load('Na__LayoutEditor__SnapshotRenderer__.js', {
    THREE,
    Na__LeEnhance__Apply : async (...a) => rec('Enhance.Apply', a),
    Na__Math__ConvertMmToUnits : (mm) => mm / 1000,
    Na__Math__ConvertUnitsToMm : (u) => u * 1000,
    Na__RenderLoop__RequestRender : () => rec('RequestRender', null),
    Na__DrawView__SectionAdapter__UpsertHorizontalPlane : recFn('Section.UpsertH'),
    Na__DrawView__SectionAdapter__UpsertVerticalPlane : recFn('Section.UpsertV'),
    Na__DrawView__SectionAdapter__SetActivePlane : recFn('Section.SetActive'),
    Na__DrawView__SectionAdapter__RemovePlane : recFn('Section.Remove'),
    Na__DrawView__SectionAdapter__SuspendLiveTool : recFn('Section.Suspend'),
    Na__DrawView__SectionAdapter__Release : recFn('Section.Release'),
    Na__DrawView__SectionAdapter__ReapplyClipping : recFn('Section.Reapply'),
    Na__DrawView__RenderPreset__Enter : (o) => rec('RenderPreset.Enter', {
        frustum : [ o.camera.left, o.camera.right, o.camera.top, o.camera.bottom, o.camera.near, o.camera.far ],
        position : [ o.camera.position.x, o.camera.position.y, o.camera.position.z ], lookedAt : o.camera.lookedAt,
        up : [ o.camera.up.x, o.camera.up.y, o.camera.up.z ], styles : o.styles, edgeWidthPx : o.edgeWidthPx }),
    Na__DrawView__RenderPreset__Exit : recFn('RenderPreset.Exit'),
    Na__DrawView__RenderPreset__GetExportOverrides : () => ({ __tag : 'ExportOverrides' }),
    Na__DrawView__MaterialPreset__Enter : recFn('MaterialPreset.Enter'),
    Na__DrawView__MaterialPreset__Exit : recFn('MaterialPreset.Exit'),
    Na__DrawView__Transitions__SuspendThreeD : recFn('Transitions.Suspend'),
    Na__DrawView__Transitions__ResumeThreeD : recFn('Transitions.Resume'),
    Na__DrawView__Transitions__IsSuspended : () => false,
    Na__FpCfg__GetCameraSetup : () => ({ heightAboveCutUnits : 2, nearUnits : 0.01, farUnits : 500 }),
    Na__FpData__GetCutHeightMm : () => 1200, Na__FpData__GetViewDepthMm : () => 3000,
    Na__FpData__GetSavedView : () => ({ targetXMm : null, targetZMm : null }),
    Na__ElevCfg__GetCameraSetup : () => ({ standOffUnits : 50, nearUnits : 0.01, farUnits : 500 }),
    Na__ElevData__GetAxes : () => ({ rightX : 1, rightZ : 0, normalX : 0, normalZ : 1 }),
    Na__ElevData__IsSection : () => false, Na__ElevData__GetPlaneDistanceMm : () => 5000,
    Na__ElevData__GetViewDepthMm : () => 20000, Na__ElevData__GetSavedView : () => ({ runMm : null, heightMm : null }),
    Na__PresentationMode__Camera__ApplySceneCameraState : (cam, ctl, sceneRecord) => rec('ApplySceneCamera', sceneRecord.PresentationMode__Scene__Id),
    Na__ModelToggle__CaptureVisibilityMap : () => ({ __tag : 'VisibilityMap' }),
    Na__ModelToggle__ApplySceneLayerVisibility : recFn('ModelToggle.ApplyMap'),
    Na__ModelToggle__SetCategoryVisibility : recFn('ModelToggle.SetCategory'),
    Na__CrossSection__SerializeSections : () => ({ __tag : 'Sections' }),
    Na__CrossSection__ApplySerializedSections : recFn('CrossSection.Apply'),
    Na__CrossSection__GetAppearance : () => ({ lineWidthPx : 1.5 }),
    Na__CrossSection__SetLineWidth : recFn('CrossSection.SetLineWidth'),
    Na__StaticExport__RenderToCanvas : renderToCanvas,
    Na__PlView__KIND_PLAN : 'plan',
    Na__PlView__Hash : hash,
    Na__PlStage__Describe : (root) => { rec('PlStage.Describe', root); return { Categories : [ { name : 'ValeVision__MainBuildingModel__Proposed', tris : 1200, stamp : 'st1' }, { name : 'ValeVision__Vegetation', tris : 300 } ], Fingerprint : 'pipeline-fp-123' }; },
    Na__LineworkSettings__SetLineworkBaseOverride : recFn('LineworkSettings.Override'),
    Na__SceneLighting__GetLive : () => null,
    Na__SceneLighting__Apply : recFn('SceneLighting.Apply'),
    Na__SceneLighting__ApplyDefaults : recFn('SceneLighting.Defaults')
});
const modelRoot = { __tag : 'ModelRoot' };
Snap.Na__LeSnap__Initialize({ renderer : { __tag : 'Renderer' }, scene : { __tag : 'Scene' }, camera : mainCamera, controls, pipelineRef : { current : { profileLinesPassRef : profilePass } }, modelRoot });

const Win = await load('Na__LayoutEditor__Viewport2d__Window__.js', {
    Na__LeModel__ResolveViewportSource : resolveSource,
    Na__LeModelLayers__ExcludeTokens : () => [],
    Na__PlView__FromPlan : (plan, override, exclude) => definitionFor('plan', plan, override, exclude),
    Na__PlView__FromElevation : (elevation, override, exclude) => definitionFor('elevation', elevation, override, exclude)
});
const Frame = await load('Na__LayoutEditor__Viewport2d__Frame__.js', {
    Na__LeCfg__GetLabel : (k, d) => d,
    Na__LeSnap__Render2d : Snap.Na__LeSnap__Render2d,
    Na__LeComposite__Weight : weight,
    Na__LeRaster__Working : () => working, Na__LeRaster__Fit : rasterFit,
    Na__LeVp2d__Window : Win.Na__LeVp2d__Window, Na__LeVp2d__Describe : Win.Na__LeVp2d__Describe
});
const Line = await load('Na__LayoutEditor__Viewport2d__Linework__.js', {
    Na__LeCfg__GetLineworkSetup : () => lineworkSetup, Na__LeCfg__PtToMm : (pt) => pt * 0.352778,
    Na__LeSnap__GetPipelineFingerprint : Snap.Na__LeSnap__GetPipelineFingerprint,
    Na__LeEdge__Effective : () => ({ hex : '#111111', weight : 1, lineType : 'solid', patternMm : [] }),
    Na__LeEdge__AppliesToClasses : () => [], Na__LeEdge__SolidMeansClassDefault : () => true, Na__LeEdge__Token : () => 'edgeTok',
    Na__LeComposite__Factor : () => 1, Na__LeComposite__Token : () => 'compTok',
    Na__PlCfg__GetAppearance : (name) => ({ StrokeColour : { visible : '#000000', hidden : '#777777', authored : '#222222', section : '#000000' }[name] }),
    Na__PlView__Fingerprint : viewFingerprint, Na__PlView__CacheKey : cacheKey,
    Na__PlPipe__GetCached : (definition, fp) => { rec('PlPipe.GetCached', { def : definition.ViewKey, fp }); return null; },
    // onPhase is recorded as the pipeline can see it: every reader in 50__System__ProjectedLinework asks only
    // typeof onPhase === 'function' (Projector :286, :323, :348, :472; CpuBackend :327; WebGpuBackend :417), so null
    // (TrueVision's PDF call shape) and undefined (the old one) are the same answer to it.
    Na__PlPipe__RenderDefinition : async (definition, options, abort, onPhase) => { rec('PlPipe.RenderDefinition', { def : definition.ViewKey, hash : definition.RecordHash, options, abort, onPhase : typeof onPhase === 'function' ? 'callable' : 'not callable' }); return { Classes : classesFor(), CacheKey : 'pipe-ck', Fingerprint : 'pipe-fp', Report : {} }; },
    Na__PlPipe__Remember : recFn('PlPipe.Remember'),
    Na__PlStore__LoadForDefinition : async (definition, fingerprint, key) => { rec('PlStore.Load', { def : definition.ViewKey, fingerprint, key }); return null; },
    Na__PlStore__RememberRender : recFn('PlStore.RememberRender'),
    Na__PlOverlay__BuildPathData : (segments) => 'path' + segments.length,
    Na__PlOwners__Read : () => null, Na__PlOwners__KeyFor : () => null, Na__PlOwners__Has : () => true,
    Na__LeVp2d__Window : Win.Na__LeVp2d__Window,
    Na__LeVp2d__CLASS_ORDER : Frame.Na__LeVp2d__CLASS_ORDER, Na__LeVp2d__Linework : Frame.Na__LeVp2d__Linework,
    Na__LeVp2d__PathCache : Frame.Na__LeVp2d__PathCache, Na__LeVp2d__SizeLayer : Frame.Na__LeVp2d__SizeLayer
});
const Vp2 = await load('Na__LayoutEditor__Viewport2d__.js', {
    Na__LeCfg__GetLabel : (k, d) => d,
    Na__LeModel__UpdateViewport : recFn('SheetModel.UpdateViewport', true),
    Na__LeChrome__ToSvgMarkup : () => '<svg/>',
    Na__LeMarkup__BuildScenePrimitives : () => [],
    Na__LeSnap__Render2d : Snap.Na__LeSnap__Render2d, Na__LeSnap__DrawingCentreMm : Snap.Na__LeSnap__DrawingCentreMm,
    Na__LeSnap__GetPipelineFingerprint : Snap.Na__LeSnap__GetPipelineFingerprint,
    Na__LeModelLayers__Token : () => 'mlTok', Na__LeComposite__RasterToken : () => null,
    Na__LeRaster__Get : () => 'medium', Na__LeRaster__Working : () => working, Na__LeRaster__Export : () => exporting, Na__LeRaster__Fit : rasterFit,
    Na__PlView__CacheKey : cacheKey,
    Na__PlPipe__GetCached : (definition) => { rec('PlPipe.GetCached', { def : definition.ViewKey }); return null; },
    Na__PlOwners__Has : () => true,
    ...Win, ...Frame, ...Line
});
const Vp3 = await load('Na__LayoutEditor__Viewport3d__.js', {
    Na__LeCfg__GetLabel : (k, d) => d,
    Na__LeModel__GetSheets : () => [ SHEET ], Na__LeModel__GetViewports : (s) => s.Sheet__Viewports,
    Na__LeModel__ResolveViewportSource : resolveSource,
    Na__LeModel__UpdateViewport : recFn('SheetModel.UpdateViewport', true),
    Na__LeSnap__Render3d : Snap.Na__LeSnap__Render3d, Na__LeSnap__IsReady : Snap.Na__LeSnap__IsReady,
    Na__LeSnap__GetModelFingerprint : Snap.Na__LeSnap__GetModelFingerprint,
    Na__SceneLighting__SceneToken : () => null,
    Na__LeModelLayers__Token : () => 'mlTok',
    Na__LeComposite__Weight : weight, Na__LeComposite__RasterToken : () => null,
    Na__LeRaster__Working : () => working, Na__LeRaster__Export : () => exporting, Na__LeRaster__Fit : rasterFit,
    Na__LeAssets__CanvasToBlob : async () => null, Na__LeAssets__BlobToDataUrl : async () => null,
    Na__LeAssets__ToPngDataUrl : (x) => x, Na__LeAssets__SnapshotPath : (s, v, k) => s + '/' + v + '/' + k,
    Na__LeAssets__CanUpload : () => false, Na__LeAssets__Upload : recFn('Assets.Upload', null), Na__LeAssets__Load : async () => null
});

class FakeDoc {
    constructor(o) { rec('jsPDF.new', o); }
    setProperties(o) { rec('pdf.setProperties', o); }
    addImage(...a) { rec('pdf.addImage', a); }
    setDrawColor(...a) { rec('pdf.setDrawColor', a); }
    setLineWidth(w) { rec('pdf.setLineWidth', w); }
    setLineCap(c) { rec('pdf.setLineCap', c); }
    setLineDashPattern(...a) { rec('pdf.setLineDashPattern', a); }
    line(...a) { rec('pdf.line', a.map((n) => Math.round(n * 1e6) / 1e6)); }
    saveGraphicsState() { rec('pdf.save', null); }
    restoreGraphicsState() { rec('pdf.restore', null); }
    rect(...a) { rec('pdf.rect', a); }
    clip() {}
    discardPath() {}
    save(name) { rec('pdf.saveFile', name); }
}
globalThis.window.jspdf = { jsPDF : FakeDoc };
const Pdf = await load('Na__LayoutEditor__PdfExporter__.js', {
    Na__LeCfg__GetPdfSetup : () => ({ author : 'a', creator : 'c', jsPdfScriptPath : 'jspdf' }),
    Na__LeCfg__GetLineworkSetup : () => lineworkSetup, Na__LeCfg__GetLabel : (k, d) => d,
    Na__LeCfg__GetSpecificationSetup : () => ({ loadTimeoutMs : 5 }), Na__LeCfg__FormatLabel : (k, d) => d,
    Na__LeFileName__Build : () => 'sheet.pdf', Na__LeScale__SheetLabel : () => '1:50',
    Na__LeLayout__Solve : () => ({ Page : { Orientation : 'landscape', WidthMm : 420, HeightMm : 297, Label : 'A3', SizeKey : 'A3' }, TitleBlockStyle : 'modern' }),
    Na__LeModel__KIND_2D : '2d', Na__LeModel__GetLayers : (s) => s.Sheet__Layers, Na__LeModel__GetFields : () => ({}),
    Na__LeModel__IsLayerVisible : () => true,
    Na__LeChrome__Build : () => [], Na__LeChrome__DrawToPdf : (doc, list) => rec('Chrome.DrawToPdf', list.length),
    Na__LeMarkup__BuildScenePrimitives : () => [], Na__LeMarkup__BuildSheetPrimitives : () => [],
    Na__LeVp2d__Describe : Vp2.Na__LeVp2d__Describe, Na__LeVp2d__EnsureLinework : Vp2.Na__LeVp2d__EnsureLinework,
    Na__LeVp2d__RenderForExport : Vp2.Na__LeVp2d__RenderForExport, Na__LeVp2d__StyleBands : Vp2.Na__LeVp2d__StyleBands,
    Na__LeVp3d__RenderForExport : Vp3.Na__LeVp3d__RenderForExport, Na__LeVp3d__ExportRectMm : Vp3.Na__LeVp3d__ExportRectMm,
    Na__DrawData__GetProjectCode : () => '3047',
    Na__LeSpec__EnsureLoaded : async () => true, Na__LeMargin__Report : () => ({ on : false, overflow : 0 })
});

const newSignatures = Snap.Na__LeSnap__Render2d.length === 11;
const labelOf = SET + (MIX.length ? ' + ' + MIX.map((x) => x.join('=')).join(',') : '');
say('W1-23 harness - set: ' + labelOf + ' (Render2d takes ' + Snap.Na__LeSnap__Render2d.length + ' arguments, Render3d ' + Snap.Na__LeSnap__Render3d.length + ')');

// -----------------------------------------------------------------------------
// Scenarios
// -----------------------------------------------------------------------------
const VP2 = SHEET.Sheet__Viewports.find((v) => v.Viewport__Kind === '2d');
const VP3 = SHEET.Sheet__Viewports.find((v) => v.Viewport__Kind === '3d');
const ppm = 3.5;
const state2 = (id) => Frame.Na__LeVp2d__States.get(id);
const keys2 = (st) => st ? { wantedKey : st.wantedKey, renderedKey : st.renderedKey, renderedWindow : st.renderedWindow, lineworkKey : st.lineworkKey, classesKey : st.classesKey, underlay : st.underlay.src, parked : !!st.parked } : null;

async function guarded(name, fn) {
    scenario = name;
    try { await fn(); } catch (error) { rec('THREW', String(error && error.message || error)); }
}

// S1 - the 2D viewport on screen
await guarded('S1', async () => {
    const body = new FakeEl('div');
    Vp2.Na__LeVp2d__Fill(body, SHEET, VP2, ppm);
    await wait(700);
    rec('state2', keys2(state2(VP2.Viewport__Id)));
});

// S2 - the 3D viewport on screen; S3 - zoomed to 150%
const states3 = new Map();
const keys3 = (st) => st ? { key : st.key, win : st.win, px : st.px, dataUrl : st.dataUrl, renderOk : st.renderOk, parked : !!st.parked } : null;
await guarded('S2', async () => {
    const body = new FakeEl('div');
    Vp3.Na__LeVp3d__Fill(body, SHEET, VP3, ppm);
    states3.set('S2', body);
    await wait(800);
    rec('fingerprint', Vp3.Na__LeVp3d__Fingerprint(VP3, resolveSource(VP3).scene));
    rec('img', { src : body.children[0].src, style : body.children[0].style, hidden : body.children[0].hidden });
});
const VP3Z = Object.assign(clone(VP3), { Viewport__Id : 'Viewport_Z150', Viewport__ImageZoom : 1.5 });
await guarded('S3', async () => {
    const body = new FakeEl('div');
    Vp3.Na__LeVp3d__Fill(body, SHEET, VP3Z, ppm);
    await wait(800);
    rec('fingerprint', Vp3.Na__LeVp3d__Fingerprint(VP3Z, resolveSource(VP3Z).scene));
    rec('exportRect', Vp3.Na__LeVp3d__ExportRectMm(VP3Z));
    rec('img', { src : body.children[0].src, style : body.children[0].style, hidden : body.children[0].hidden });
});

// S4 - a 2D render still queued when its sheet is left
await guarded('S4', async () => {
    let open; gate = { promise : new Promise((r) => { open = r; }) };
    const before = renderCalls;
    const A = Object.assign(clone(VP2), { Viewport__Id : 'Viewport_A', Viewport__PanMm : { X : 13000, Y : -2000 } });
    const B = Object.assign(clone(VP2), { Viewport__Id : 'Viewport_B', Viewport__PanMm : { X : 14000, Y : -2100 } });
    const bodyA = new FakeEl('div'), bodyB = new FakeEl('div');
    Vp2.Na__LeVp2d__Fill(bodyA, SHEET, A, ppm);
    await wait(450);                                                            // <-- A's underlay is rendering, held at the gate
    Vp2.Na__LeVp2d__Fill(bodyB, SHEET, B, ppm);
    await wait(450);                                                            // <-- B's underlay is queued behind it
    const parked = Vp2.Na__LeVp2d__Park('Viewport_B', bodyB);
    rec('parkedB', !!parked);
    gate = null; open();
    await wait(200);
    rec('renders', renderCalls - before);
    rec('stateA', keys2(state2('Viewport_A')));
    rec('stateB(parked)', parked ? keys2(parked) : null);
});

// S5 - a 3D render still queued when its sheet is left
await guarded('S5', async () => {
    let open; gate = { promise : new Promise((r) => { open = r; }) };
    const before = renderCalls;
    const C = Object.assign(clone(VP3), { Viewport__Id : 'Viewport_C', Viewport__ImageZoom : 1.5 });
    const D = Object.assign(clone(VP3), { Viewport__Id : 'Viewport_D', Viewport__ImageZoom : 1.5, Viewport__ImageOffsetMm : { X : -20, Y : -10 } });
    const bodyC = new FakeEl('div'), bodyD = new FakeEl('div');
    Vp3.Na__LeVp3d__Fill(bodyC, SHEET, C, ppm);
    await wait(550);
    Vp3.Na__LeVp3d__Fill(bodyD, SHEET, D, ppm);
    await wait(550);
    const parked = Vp3.Na__LeVp3d__Park('Viewport_D', bodyD);
    rec('parkedD', !!parked);
    gate = null; open();
    await wait(200);
    rec('renders', renderCalls - before);
    rec('stateD(parked)', parked ? keys3(parked) : null);
});

// S6 - the PDF of the sheet, then with its 3D viewport zoomed 150%
await guarded('S6', async () => {
    const built = await Pdf.Na__LePdf__BuildDocument(SHEET);
    rec('pdf', { filename : built.filename });
    const zoomed = clone(SHEET);
    zoomed.Sheet__Viewports.forEach((v) => { if (v.Viewport__Kind === '3d') v.Viewport__ImageZoom = 1.5; });
    const built2 = await Pdf.Na__LePdf__BuildDocument(zoomed);
    rec('pdf', { filename : built2.filename });
});

// S7 - a forced re-render of the 2D viewport
await guarded('S7', async () => {
    const ok = await Vp2.Na__LeVp2d__ForceRender(SHEET, VP2, (phase) => rec('onPhase', phase));
    rec('forced', ok);
    rec('state2', keys2(state2(VP2.Viewport__Id)));
});

scenario = 'end';
rec('unstubbed', Array.from(unstubbed).sort());
writeFileSync(OUT, JSON.stringify({ label : labelOf, events }, null, 1), 'utf8');
say('  scenarios S1-S7: ' + events.length + ' events -> ' + OUT);
say('  RenderToCanvas calls: ' + renderCalls + '; unstubbed names called: ' + (unstubbed.size ? Array.from(unstubbed).join(', ') : 'none'));

// -----------------------------------------------------------------------------
// Contract checks (TrueVision's argument positions and the Describe stub)
// -----------------------------------------------------------------------------
let failures = 0;
const check = (name, ok, detail) => { if (!ok) failures++; say((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || detail === undefined ? '' : '  -> ' + JSON.stringify(detail))); };
if (!newSignatures) {
    say('  contract checks skipped: this set has the old signatures');
} else {
    scenario = 'contract';
    const STUB = { groupId : null, label : '', storedId : null, explicit : false, missing : false, isLive : true, renderId : null, status : 'live' };
    // C1 - Describe's Model Source
    const twoD = SHEET.Sheet__Viewports.filter((v) => v.Viewport__Kind === '2d').concat([ Object.assign(clone(VP2), { Viewport__DrawingId : null, Viewport__Id : 'Viewport_NoDrawing' }) ]);
    twoD.forEach((vp) => {
        const d1 = Vp2.Na__LeVp2d__Describe(vp), d2 = Vp2.Na__LeVp2d__Describe(vp);
        let renderId = 'threw';
        try { renderId = d1.modelSource.renderId; } catch (e) { renderId = 'TypeError: ' + e.message; }
        check('C1 ' + vp.Viewport__Id + ': described.modelSource.renderId reads null (no TypeError)', renderId === null, renderId);
        check('C1 ' + vp.Viewport__Id + ': modelSource has Resolve\'s shape exactly', JSON.stringify(plain(d1.modelSource)) === JSON.stringify(plain(STUB)), d1.modelSource);
        check('C1 ' + vp.Viewport__Id + ': a new object each call; source, definition and window unchanged in shape', d1.modelSource !== d2.modelSource && Object.keys(d1).join() === 'source,definition,window,modelSource', Object.keys(d1));
    });
    // C2 - Render3d: (..., weights, modelSourceId, viewWindow, stillWanted)
    const scene = resolveSource(VP3).scene;
    const view = { u0 : 0.1, v0 : 0.2, u1 : 0.7, v1 : 0.8 };
    let n0 = renderCalls;
    const skipped3 = await Snap.Na__LeSnap__Render3d(scene, VP3.Viewport__Styles, 640, 360, null, 2, { modelEdgePx : 0.75 }, null, view, () => false);
    check('C2 Render3d: stillWanted in the tenth slot is asked (false -> null, nothing rendered)', skipped3 === null && renderCalls === n0, { result : skipped3, renders : renderCalls - n0 });
    n0 = renderCalls;
    const firstEvent = events.length;
    const done3 = await Snap.Na__LeSnap__Render3d(scene, VP3.Viewport__Styles, 640, 360, null, 2, { modelEdgePx : 0.75 }, null, view, () => true);
    const call3 = events.slice(firstEvent).find((e) => e.k === 'RenderToCanvas');
    check('C2 Render3d: the ninth slot is the view window the tiled renderer draws', !!done3 && renderCalls === n0 + 1 && call3 && JSON.stringify(call3.d.viewWindow) === JSON.stringify(plain(view)) && call3.d.targetWidth === 640, call3 && call3.d);
    // C3 - Render2d: (..., weights, modelSourceId, stillWanted, depthFog)
    const described = Vp2.Na__LeVp2d__Describe(VP2);
    n0 = renderCalls;
    const skipped2 = await Snap.Na__LeSnap__Render2d(described.definition, described.window, VP2.Viewport__Styles, 400, 300, null, 2, null, null, () => false);
    check('C3 Render2d: stillWanted in the tenth slot is asked (false -> null, nothing rendered)', skipped2 === null && renderCalls === n0, { result : skipped2 });
    n0 = renderCalls;
    const queueEvents = events.filter((e) => e.k === 'queue').length;
    const fogged = await Snap.Na__LeSnap__Render2d(described.definition, described.window, VP2.Viewport__Styles, 400, 300, null, 2, null, null, undefined, { getSettings : () => ({}), getPlane : () => null });
    check('C3 Render2d: a depth fog source (eleventh slot) answers null, renders nothing and queues nothing', fogged === null && renderCalls === n0 && events.filter((e) => e.k === 'queue').length === queueEvents && Snap.Na__LeSnap__GetOutstanding() === 0, { result : fogged, renders : renderCalls - n0 });
    n0 = renderCalls;
    const drawn2 = await Snap.Na__LeSnap__Render2d(described.definition, described.window, VP2.Viewport__Styles, 400, 300, null, 2, null, described.modelSource.renderId);
    check('C3 Render2d: with the design phase slot null and nothing after it, the picture is drawn', !!drawn2 && renderCalls === n0 + 1, drawn2);
    // C4 - the fingerprints and the model root take an optional design phase and answer for the live model
    const mf = [ Snap.Na__LeSnap__GetModelFingerprint(), Snap.Na__LeSnap__GetModelFingerprint(null), Snap.Na__LeSnap__GetModelFingerprint(undefined), Snap.Na__LeSnap__GetModelFingerprint('Scheme-01') ];
    const pf = [ Snap.Na__LeSnap__GetPipelineFingerprint(), Snap.Na__LeSnap__GetPipelineFingerprint(null), Snap.Na__LeSnap__GetPipelineFingerprint('Scheme-01') ];
    check('C4 GetModelFingerprint answers the live model\'s for any design phase', mf.every((x) => x === mf[0] && typeof x === 'string'), mf);
    check('C4 GetPipelineFingerprint answers the live model\'s for any design phase', pf.every((x) => x === 'pipeline-fp-123'), pf);
    check('C4 GetModelRoot answers the live root for any design phase', [ Snap.Na__LeSnap__GetModelRoot(), Snap.Na__LeSnap__GetModelRoot(null), Snap.Na__LeSnap__GetModelRoot('Scheme-01') ].every((r) => r === modelRoot));
    // C5 - EnsureLinework keys by the Model Source's fingerprint: the live one
    const mark = events.length;
    await Vp2.Na__LeVp2d__EnsureLinework(described.definition, null, true, described.modelSource);
    const withSource = events.slice(mark).filter((e) => e.k === 'PlView.CacheKey').map((e) => e.d.modelFp);
    const mark2 = events.length;
    await Vp2.Na__LeVp2d__EnsureLinework(described.definition, null, true);
    const without = events.slice(mark2).filter((e) => e.k === 'PlView.CacheKey').map((e) => e.d.modelFp);
    check('C5 EnsureLinework(definition, null, true, modelSource) keys exactly as EnsureLinework(definition, null, true)', withSource.length === 1 && JSON.stringify(withSource) === JSON.stringify(without) && withSource[0] === 'pipeline-fp-123', { withSource, without });
    say(failures ? '  ' + failures + ' contract check(s) FAILED' : '  every contract check passed');
}
process.exit(failures ? 1 : 0);
