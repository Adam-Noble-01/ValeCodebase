// =============================================================================
// W2-03 scratch harness - the fog layer and its 3D wiring on a recording renderer (not shipped)
// =============================================================================
// Runs the LANDED modules in Node through ValeVision's own import map (three r184),
// with a renderer that records every call instead of drawing. The pre-images of
// RenderPreset and TiledRenderer run beside the landed files ('?old', see
// harness/hooks.mjs), so "fog off renders byte-identical" is proved call for call.
//
//   node --import ./harness/register.mjs w2_03_unit.mjs
// =============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// -----------------------------------------------------------------------------
// Minimal browser surface (no DOM is drawn; the canvas is a recording stub)
// -----------------------------------------------------------------------------
const listeners = {};
globalThis.window = globalThis;
globalThis.addEventListener    = (t, f) => { (listeners[t] = listeners[t] || []).push(f); };
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent       = (e) => { (listeners[e.type] || []).forEach((f) => f(e)); return true; };
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(0), 0);
const drawImages = [];
globalThis.document = {
    hidden : true,
    activeElement : null,
    body : { classList : { add() {}, remove() {}, contains() { return false; }, toggle() {} }, appendChild() {} },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    createElement(tag) {
        const el = { tagName : tag, width : 0, height : 0, style : {}, children : [], classList : { add() {}, remove() {}, toggle() {} },
                     appendChild(c) { this.children.push(c); return c; }, addEventListener() {}, setAttribute() {} };
        if (tag === 'canvas') {
            el.getContext = () => ({
                fillStyle : '', fillRect() {}, clearRect() {},
                getImageData() { return { data : new Uint8ClampedArray([ 255, 0, 0, 255 ]) }; },
                drawImage(...args) { drawImages.push(args); }
            });
        }
        return el;
    }
};
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {                                       // <-- The modules' own JSON, read from disk
    const u = String(url);
    if (u.startsWith('file:')) {
        try { const text = readFileSync(fileURLToPath(u), 'utf8'); return { ok : true, status : 200, json : async () => JSON.parse(text), text : async () => text }; }
        catch { return { ok : false, status : 404, json : async () => ({}), text : async () => '' }; }
    }
    return realFetch(url, opts);
};
const warnings = [];
const realWarn = console.warn;
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); };

// -----------------------------------------------------------------------------
// Checks
// -----------------------------------------------------------------------------
const results = [];
const check = (name, pass, detail) => { results.push({ name, pass : !!pass, detail }); console.log((pass ? '  PASS  ' : '  FAIL  ') + name + (detail !== undefined && !pass ? '   ' + JSON.stringify(detail) : '')); };

const VV  = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/';
const M   = (rel) => pathToFileURL(VV + rel).href;
const THREE = await import('three');

const P_RL   = '02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js';
const P_ROW  = '02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__DevMenu__Row__.js';
const P_RP   = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js';
const P_TR   = '02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js';
const P_TP   = '02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TilePlan__.js';
const P_CLIP = '02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
const P_MC   = '02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ModeController__.js';

// -----------------------------------------------------------------------------
// The recording renderer
// -----------------------------------------------------------------------------
function Label(obj) {
    if (!obj) return 'null';
    if (obj.isScene) return 'scene';
    if (obj.isMesh && obj.material) return 'quad:' + (obj.material.name || obj.material.type);
    return obj.type || 'object';
}
function MakeRenderer(log) {
    const st = { target : null, autoClear : true, clearColor : new THREE.Color(0xffffff), clearAlpha : 1, w : 800, h : 600, ratio : 1 };
    const tname = (t) => t ? (t.texture && t.texture.name ? t.texture.name : 'target') : 'canvas';
    return {
        st,
        shadowMap  : { autoUpdate : true },
        get autoClear() { return st.autoClear; }, set autoClear(v) { st.autoClear = v; },
        domElement : { width : 800, height : 600, addEventListener() {}, removeEventListener() {} },
        getContext() { return { isContextLost : () => false }; },
        getRenderTarget() { return st.target; },
        setRenderTarget(t) { if (t === st.target) { log.rebinds = (log.rebinds || 0) + 1; return; } st.target = t; log.push('target>' + tname(t)); },   // <-- A re-bind of the bound target changes nothing (three r184: same framebuffer, same viewport); counted, not logged
        getClearAlpha() { return st.clearAlpha; },
        getClearColor(c) { return c.copy(st.clearColor); },
        setClearColor(c, a) { st.clearColor.set(c); if (a !== undefined) st.clearAlpha = a; },
        clear() { log.push('clear@' + tname(st.target)); },
        render(obj, cam) { log.push('render ' + Label(obj) + '@' + tname(st.target)); log.cams.push(cam); },
        getSize(v) { return v.set(st.w, st.h); },
        setSize(w, h) { st.w = w; st.h = h; },
        getPixelRatio() { return st.ratio; }, setPixelRatio(r) { st.ratio = r; },
        getDrawingBufferSize(v) { return v.set(st.w * st.ratio, st.h * st.ratio); },
        capabilities : { isWebGL2 : true }, getContextAttributes() { return {}; }
    };
}
const NewLog = () => { const l = []; l.cams = []; return l; };
const Snapshot = (r) => JSON.stringify({ t : r.st.target ? 'bound' : null, a : r.st.autoClear, c : r.st.clearColor.getHex(), al : r.st.clearAlpha, s : r.shadowMap.autoUpdate });

const ortho = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 40);
ortho.position.set(0, 1, 20); ortho.lookAt(0, 1, 0); ortho.updateProjectionMatrix(); ortho.updateMatrixWorld(true);
const persp = new THREE.PerspectiveCamera(50, 4 / 3, 0.1, 100);                  // <-- An ordinary 3D view: off the plane's normal
persp.position.set(8, 3, 20); persp.lookAt(0, 1, 0); persp.updateProjectionMatrix(); persp.updateMatrixWorld(true);
const perspHeadOn = new THREE.PerspectiveCamera(50, 4 / 3, 0.1, 100);            // <-- Exactly along the plane's normal (information only)
perspHeadOn.position.set(0, 1, 20); perspHeadOn.lookAt(0, 1, 0); perspHeadOn.updateProjectionMatrix(); perspHeadOn.updateMatrixWorld(true);

const scene = new THREE.Scene();
scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
const glass = new THREE.MeshBasicMaterial({ transparent : true, depthWrite : false, opacity : 0.3 });
scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), glass));

const FOG_ON  = { enabled : true,  startDepthMm : 1000, endDepthMm : 6000, falloffPercent : 50 };
const FOG_OFF = { enabled : false, startDepthMm : 1000, endDepthMm : 6000, falloffPercent : 50 };
const PLANE   = { normalX : 0, normalY : 0, normalZ : 1, distanceMm : 0 };
const Source  = (settings) => ({ getSettings : () => settings, getPlane : () => PLANE });

// -----------------------------------------------------------------------------
// 0. Link: every landed module loads and exports what it should
// -----------------------------------------------------------------------------
console.log('\n0. LINK');
const RL   = await import(M(P_RL));
const ROW  = await import(M(P_ROW));
const RP   = await import(M(P_RP));
const RPo  = await import(M(P_RP) + '?old');
const TR   = await import(M(P_TR));
const TRo  = await import(M(P_TR) + '?old');
const TP   = await import(M(P_TP));
const CLIP = await import(M(P_CLIP));
let MC = null, mcError = null;
try { MC = await import(M(P_MC)); } catch (e) { mcError = String(e && e.stack || e); }

check('0.1 RenderLayer exports exactly TrueVision\'s seven names',
      JSON.stringify(Object.keys(RL).sort()) === JSON.stringify([ 'Na__ElevFog__Dispose', 'Na__ElevFog__GetSource', 'Na__ElevFog__Initialise', 'Na__ElevFog__IsWanted', 'Na__ElevFog__RenderLayerFrame', 'Na__ElevFog__RenderOverlay', 'Na__ElevFog__SetSource' ]),
      Object.keys(RL));
check('0.2 DevMenu Row exports exactly Na__ElevFogRow__Build', JSON.stringify(Object.keys(ROW)) === JSON.stringify([ 'Na__ElevFogRow__Build' ]), Object.keys(ROW));
check('0.3 RenderPreset keeps its eight exports', Object.keys(RP).length === 8 && JSON.stringify(Object.keys(RP).sort()) === JSON.stringify(Object.keys(RPo).sort()), Object.keys(RP));
check('0.4 TiledRenderer exports RenderToCanvas and the TilePlan pair, no Na__StaticExport__ wrapper (F.8 C26)',
      JSON.stringify(Object.keys(TR).sort()) === JSON.stringify([ 'Na__StaticExport__RenderToCanvas', 'Na__TilePlan__ClampToDeviceLimits', 'Na__TilePlan__IsIosDevice' ]),
      Object.keys(TR));
check('0.5 the re-exports ARE the planner\'s functions (TV :541-542)',
      TR.Na__TilePlan__ClampToDeviceLimits === TP.Na__TilePlan__ClampToDeviceLimits && TR.Na__TilePlan__IsIosDevice === TP.Na__TilePlan__IsIosDevice);
check('0.6 the old wrappers answered the same as the re-exports (nothing a caller could notice)',
      JSON.stringify(TRo.Na__StaticExport__ClampToDeviceLimits(9000, 9000)) === JSON.stringify(TR.Na__TilePlan__ClampToDeviceLimits(9000, 9000))
      && TRo.Na__StaticExport__IsIosDevice() === TR.Na__TilePlan__IsIosDevice());
check('0.7 the elevation ModeController links with the fog import (Node load)', MC && typeof MC.Na__ElevationMode__EnterElevation === 'function', mcError);

// -----------------------------------------------------------------------------
// 1. The render layer on its own
// -----------------------------------------------------------------------------
console.log('\n1. RENDER LAYER');
{
    const log = NewLog();
    const r = MakeRenderer(log);
    check('1.1 RenderOverlay before Initialise draws nothing', RL.Na__ElevFog__RenderOverlay(ortho) === false && log.length === 0);
    check('1.2 Initialise({ renderer, scene })', RL.Na__ElevFog__Initialise({ renderer : r, scene }) === true);
    check('1.3 no source: false and not one renderer call', RL.Na__ElevFog__RenderOverlay(ortho) === false && log.length === 0 && RL.Na__ElevFog__IsWanted() === false);

    const prev = RL.Na__ElevFog__SetSource(Source(FOG_OFF));
    check('1.4 SetSource answers the source it replaced (null)', prev === null);
    const before = Snapshot(r);
    const offOut = RL.Na__ElevFog__RenderOverlay(ortho);
    check('1.5 a drawing with its fog OFF: false, no draw, no clear, renderer state handed back',
          offOut === false && !log.some((e) => e.startsWith('render') || e.startsWith('clear')) && Snapshot(r) === before, log);

    log.length = 0; log.cams.length = 0;
    RL.Na__ElevFog__SetSource(Source(FOG_ON));
    const glassBefore = glass.depthWrite;
    const onOut = RL.Na__ElevFog__RenderOverlay(ortho);
    const seq = log.filter((e) => !e.startsWith('target>canvas') || true);
    const iDepthTarget = log.indexOf('target>Na__ElevationDepthFog__DepthPrePass');
    const iScene  = log.indexOf('render scene@Na__ElevationDepthFog__DepthPrePass');
    const iQuad   = log.indexOf('render quad:Na__ElevationDepthFog__OverPicture@canvas');
    check('1.6 fog ON, parallel camera: depth pre-pass of the scene into its own target, then ONE source-over quad onto the canvas',
          onOut === true && iDepthTarget >= 0 && iScene > iDepthTarget && iQuad > iScene && log.filter((e) => e.startsWith('render quad')).length === 1, seq);
    check('1.7 the depth pre-pass and the fog read the camera they were given', log.cams[0] === ortho);
    check('1.8 the glass lent a depth write for the pre-pass only', glassBefore === false && glass.depthWrite === false);
    check('1.9 renderer state handed back (target, autoClear, clear colour and alpha, shadow auto-update)', Snapshot(r) === before);
    check('1.10 no clear of the canvas in the over-picture mode', !log.includes('clear@canvas'));

    log.length = 0; log.cams.length = 0;
    const perspOut = RL.Na__ElevFog__RenderOverlay(persp);
    check('1.11 a perspective camera gets no fog: false, no scene render, no quad', perspOut === false && !log.some((e) => e.startsWith('render')), log);
    check('1.12 ...and says so once, with the ValeVision3D prefix', warnings.some((w) => w.startsWith('[ValeVision3D] Elevation depth fog: the camera is not a parallel one')));
    log.length = 0;
    const headOn = RL.Na__ElevFog__RenderOverlay(perspHeadOn);
    console.log('  INFO  1.12b a perspective camera EXACTLY along the plane normal ' + (headOn ? 'passes' : 'fails') + ' the TrueVision five-sample parallel test (Maths SolveAffineDepth samples depth only at s = 0 and 1) - TrueVision behaviour, ported verbatim; in ValeVision no perspective camera reaches the layer (see 2.12)');

    log.length = 0;
    RL.Na__ElevFog__SetSource({ getSettings : () => { throw new Error('boom'); }, getPlane : () => PLANE });
    check('1.13 a source that throws: false, nothing drawn, ValeVision3D warning', RL.Na__ElevFog__RenderOverlay(ortho) === false && !log.some((e) => e.startsWith('render')) && warnings.some((w) => w.startsWith('[ValeVision3D] Elevation depth fog: the drawing could not say')));
    const last = RL.Na__ElevFog__SetSource(null);
    check('1.14 SetSource(null) clears it and answers the one it replaced', RL.Na__ElevFog__GetSource() === null && last && typeof last.getSettings === 'function');
    check('1.15 the adapter call is reached (TV :476 position) without a 41 import: the module source imports only 40 for sections',
          (() => { const s = readFileSync(VV + P_RL, 'utf8'); return !/from '\.\.\/41__/.test(s) && /Na__DrawView__SectionAdapter__RenderDepthInto\(camera\)/.test(s); })());
}

// -----------------------------------------------------------------------------
// 2. RenderPreset.RenderFrame - the screen and the card thumbnail
// -----------------------------------------------------------------------------
console.log('\n2. RENDER PRESET');
async function RunPreset(mod, fogSource, frameCamera, withComposer = true) {
    const log = NewLog();
    const r = MakeRenderer(log);
    RL.Na__ElevFog__Initialise({ renderer : r, scene });
    RL.Na__ElevFog__SetSource(fogSource);
    const composer = { passes : [ { isRenderPass : true, camera : persp } ], render() { log.push('composer.render'); } };
    const pipelineRef = { current : withComposer ? { composer } : null };
    mod.Na__DrawView__RenderPreset__Initialize({ renderer : r, scene, camera : persp, pipelineRef });
    CLIP.Na__SectionClipping__SetOverlayRenderer((cam) => { log.push('section.overlay'); log.cams.push(cam); });
    mod.Na__DrawView__RenderPreset__Enter({ camera : ortho, styles : {} });
    log.length = 0; log.cams.length = 0;
    const out = mod.Na__DrawView__RenderPreset__RenderFrame(frameCamera);
    const overrides = mod.Na__DrawView__RenderPreset__GetExportOverrides();
    mod.Na__DrawView__RenderPreset__Exit();
    CLIP.Na__SectionClipping__SetOverlayRenderer(null);
    RL.Na__ElevFog__SetSource(null);
    return { out, log : log.slice(), cams : log.cams.slice(), overrides, r };
}
{
    const oldNull = await RunPreset(RPo, null);
    const newNull = await RunPreset(RP, null);
    const newOff  = await RunPreset(RP, Source(FOG_OFF));
    const oldOff  = await RunPreset(RPo, Source(FOG_OFF));
    check('2.1 fog source null: the new frame is call-for-call the old frame', JSON.stringify(newNull.log) === JSON.stringify(oldNull.log) && newNull.out === true, { old : oldNull.log, now : newNull.log });
    check('2.2 a drawing with its fog OFF: call-for-call the old frame (byte-identical by construction)', JSON.stringify(newOff.log) === JSON.stringify(oldOff.log), { old : oldOff.log, now : newOff.log });
    check('2.3 ...which is composer then section overlay, nothing between', JSON.stringify(newOff.log) === JSON.stringify([ 'composer.render', 'section.overlay' ]), newOff.log);

    const on = await RunPreset(RP, Source(FOG_ON));
    const iC = on.log.indexOf('composer.render');
    const iQ = on.log.indexOf('render quad:Na__ElevationDepthFog__OverPicture@canvas');
    const iO = on.log.indexOf('section.overlay');
    check('2.4 fog ON: composer, THEN the fog (depth pre-pass + quad onto the canvas), THEN the section overlay - poche on top',
          iC === 0 && iQ > iC && iO > iQ && on.log.filter((e) => e === 'composer.render').length === 1 && on.log.filter((e) => e.startsWith('render quad')).length === 1, on.log);
    check('2.5 one fog draw per frame (DIV-1 single call; no second draw for the thumbnail)', on.log.filter((e) => e.startsWith('render scene@')).length === 1);
    check('2.6 the fog and the overlay both draw through the drawing camera', on.cams[0] === ortho && on.cams[on.cams.length - 1] === ortho);

    const plain = await RunPreset(RP, Source(FOG_ON), undefined, false);
    check('2.7 no composer yet (plain render): plain render, fog, overlay', plain.log[0] === 'render scene@canvas' && plain.log.indexOf('render quad:Na__ElevationDepthFog__OverPicture@canvas') > 0 && plain.log[plain.log.length - 1] === 'section.overlay', plain.log);

    const viaPersp = await RunPreset(RP, Source(FOG_ON), persp);
    check('2.8 a perspective camera handed to RenderFrame gets no fog', !viaPersp.log.some((e) => e.startsWith('render quad')), viaPersp.log);

    const tileCam = ortho.clone(); tileCam.setViewOffset(800, 600, 0, 0, 400, 300); tileCam.updateMatrixWorld(true);
    const ov = on.overrides;
    check('2.9 GetExportOverrides carries renderDepthFog beside VV\'s four members', ov && typeof ov.renderDepthFog === 'function' && typeof ov.renderProfileNormals === 'function' && typeof ov.resizeFrustum === 'function');
    {
        const log = NewLog(); const r = MakeRenderer(log);
        RL.Na__ElevFog__Initialise({ renderer : r, scene });
        RL.Na__ElevFog__SetSource(Source(FOG_ON));
        const drew = ov.renderDepthFog(tileCam);
        check('2.10 renderDepthFog(tileCamera): fog only (no overlay, no composer), through the tile camera', drew === true && log.cams[0] === tileCam && !log.includes('section.overlay') && !log.includes('composer.render'), log);
        RL.Na__ElevFog__SetSource(Source(FOG_OFF)); log.length = 0;
        check('2.11 renderDepthFog with the fog off draws nothing', ov.renderDepthFog(tileCam) === false && !log.some((e) => e.startsWith('render')));
        RL.Na__ElevFog__SetSource(null);
    }
    {
        // Who can hand the layer a camera: every RenderOverlay / RenderLayerFrame call site in the app's sources.
        const { readdirSync, statSync } = await import('node:fs');
        const sites = [];
        const walk = (dir) => { for (const n of readdirSync(dir)) { const p = dir + '/' + n; const st = statSync(p);
            if (st.isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(n)) { const t = readFileSync(p, 'utf8');
                const re = /Na__ElevFog__(RenderOverlay|RenderLayerFrame)\(/g; let m; while ((m = re.exec(t))) { const line = t.slice(0, m.index).split(String.fromCharCode(10)).length; const src = t.split(String.fromCharCode(10))[line - 1];
                    if (!/^\s*\/\//.test(src) && !/function Na__ElevFog__/.test(src)) sites.push(p.slice(VV.length) + ':' + line); } } } };
        walk(VV + '02__Src__AppModules');
        const rpOnly = sites.length === 2 && sites.every((x) => x.startsWith(P_RP + ':'));
        check('2.12 the only callers are the RenderPreset RenderFrame and its renderDepthFog member (both the drawing camera or a tile of it; no 3D-branch or loading-sequence call, DIV-1)', rpOnly, sites);
    }
}

// -----------------------------------------------------------------------------
// 3. TiledRenderer - image export, per tile
// -----------------------------------------------------------------------------
console.log('\n3. TILED RENDERER');
async function RunExport(mod, presetMod, fogSource, { samples = 1, w = 5000, h = 3000, threeD = false } = {}) {
    const log = NewLog();
    const r = MakeRenderer(log);
    RL.Na__ElevFog__Initialise({ renderer : r, scene });
    RL.Na__ElevFog__SetSource(fogSource);
    const composer = {
        passes : [ { isRenderPass : true, camera : persp } ], renderToScreen : true,
        readBuffer : { texture : new THREE.Texture() },
        render() { log.push('composer.render'); }, setPixelRatio() {}, setSize() {}
    };
    const state = { composer, renderProfileNormals() {}, setProfileLinesSize() {}, setFxaaSize() {} };
    presetMod.Na__DrawView__RenderPreset__Initialize({ renderer : r, scene, camera : persp, pipelineRef : { current : state } });
    presetMod.Na__DrawView__RenderPreset__Enter({ camera : ortho, styles : {} });
    CLIP.Na__SectionClipping__SetOverlayRenderer((cam) => { log.push('section.overlay'); });
    const overrides = threeD ? null : presetMod.Na__DrawView__RenderPreset__GetExportOverrides();
    log.length = 0;
    drawImages.length = 0;
    const result = await mod.Na__StaticExport__RenderToCanvas({
        renderer : r, scene, camera : persp, getRenderPipelineState : () => state,
        elevationOverrides : overrides, targetWidth : w, targetHeight : h, antiAliasSamples : samples
    });
    presetMod.Na__DrawView__RenderPreset__Exit();
    CLIP.Na__SectionClipping__SetOverlayRenderer(null);
    RL.Na__ElevFog__SetSource(null);
    return { log : log.slice(), tiles : drawImages.length, result };
}
function PerTile(log) {
    // Split the log at each section overlay: one chunk per tile.
    const chunks = []; let cur = [];
    for (const e of log) { cur.push(e); if (e === 'section.overlay') { chunks.push(cur); cur = []; } }
    return chunks;
}
{
    const on = await RunExport(TR, RP, Source(FOG_ON));
    const chunks = PerTile(on.log);
    check('3.1 a 5000 x 3000 drawing export runs several tiles', on.tiles >= 4, on.tiles);
    check('3.2 one section overlay per tile (drawn once, not twice)', chunks.length === on.tiles && on.log.filter((e) => e === 'section.overlay').length === on.tiles);
    check('3.3 every tile: composer, then the fog, then the overlay',
          chunks.every((c) => { const iC = c.indexOf('composer.render'), iQ = c.indexOf('render quad:Na__ElevationDepthFog__OverPicture@canvas'), iO = c.indexOf('section.overlay');
                                return iC >= 0 && iQ > iC && iO > iQ && c.filter((e) => e.startsWith('render quad:Na__ElevationDepthFog')).length === 1; }), chunks[0]);

    const ss = await RunExport(TR, RP, Source(FOG_ON), { samples : 4, w : 3000, h : 2000 });
    const sc = PerTile(ss.log);
    check('3.4 supersampled (4): four composer samples, the average presented, THEN the fog, then the overlay - per tile',
          sc.length === ss.tiles && sc.every((c) => {
              const comps = c.filter((e) => e === 'composer.render').length;
              const iFog  = c.indexOf('render quad:Na__ElevationDepthFog__OverPicture@canvas');
              const lastPresentLike = c.map((e, i) => (e.startsWith('render quad') && !e.includes('ElevationDepthFog') && e.endsWith('@canvas')) ? i : -1).filter((i) => i >= 0).pop();
              return comps === 4 && lastPresentLike !== undefined && iFog > lastPresentLike && c.indexOf('section.overlay') > iFog;
          }), sc[0]);

    const offNew = await RunExport(TR,  RP,  Source(FOG_OFF));
    const offOld = await RunExport(TRo, RPo, Source(FOG_OFF));
    check('3.5 fog OFF: the export is call-for-call the old exporter with the old preset (byte-identical)', JSON.stringify(offNew.log) === JSON.stringify(offOld.log) && offNew.tiles === offOld.tiles, { now : offNew.log.slice(0, 8), old : offOld.log.slice(0, 8) });
    const nullNew = await RunExport(TR, RP, null);
    check('3.6 no fog source: identical to fog off', JSON.stringify(nullNew.log) === JSON.stringify(offNew.log));
    const ssOffNew = await RunExport(TR,  RP,  Source(FOG_OFF), { samples : 4, w : 3000, h : 2000 });
    const ssOffOld = await RunExport(TRo, RPo, Source(FOG_OFF), { samples : 4, w : 3000, h : 2000 });
    check('3.7 fog OFF, supersampled: call-for-call the old exporter', JSON.stringify(ssOffNew.log) === JSON.stringify(ssOffOld.log));

    const td = await RunExport(TR, RP, Source(FOG_ON), { threeD : true });
    check('3.8 a 3D export never draws the fog, even with a fogged elevation\'s source set', !td.log.some((e) => e.includes('ElevationDepthFog')), td.log.slice(0, 6));
    const tdOld = await RunExport(TRo, RPo, Source(FOG_ON), { threeD : true });
    check('3.9 ...and is call-for-call the old 3D export', JSON.stringify(td.log) === JSON.stringify(tdOld.log));
}

// -----------------------------------------------------------------------------
// 4. ModeController wiring (static, the two TV lines and their closures)
// -----------------------------------------------------------------------------
console.log('\n4. MODE CONTROLLER (static)');
{
    const s = readFileSync(VV + P_MC, 'utf8');
    const reg = s.slice(s.indexOf('function Na__ElevMode__RegisterDrawingView'), s.indexOf('function Na__ElevMode__BuildExtentMm'));
    const exit = s.slice(s.indexOf('function Na__ElevationMode__ExitElevation'), s.indexOf('function Na__ElevationMode__SetEditMode'));
    check('4.1 RegisterDrawingView sets the source: closures over GetDepthFog / GetDepthFogPlane of the live record',
          /Na__ElevFog__SetSource\(\{\s*getSettings : \(\) => Na__ElevData__GetDepthFog\(elevation\),\s*getPlane    : \(\) => Na__ElevData__GetDepthFogPlane\(elevation\)\s*\}\);\s*\}\s*$/.test(reg.split('// ------------------------------------------------------------')[0]));
    check('4.2 ExitElevation clears it straight after the view is cleared (TV :643-644)', /Na__DrawView__ClearActiveView\(\);[^\n]*\n\s*Na__ElevFog__SetSource\(null\);/.test(exit));
    check('4.3 exactly two SetSource calls in the file (TV has two)', (s.match(/Na__ElevFog__SetSource\(/g) || []).length === 2);
    check('4.4 the PlanDim getter comes from ConfigState__ (F.8 C24), not Data__', /import \{ Na__PlanDim__Load \} from '\.\.\/44__System__PlanDimensions\/Na__PlanDimensions__ConfigState__\.js';/.test(s) && !/Na__PlanDimensions__Data__\.js/.test(s));
}

console.warn = realWarn;
const failed = results.filter((r) => !r.pass);
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed');
process.exit(failed.length ? 1 : 0);
