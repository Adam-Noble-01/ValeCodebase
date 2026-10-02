// =============================================================================
// W2-12 scratch harness - the sheet fog leaf, the composites row and the tiled
// renderer's frame routine route, on a recording renderer (not shipped)
// =============================================================================
// Runs the LANDED modules in Node through ValeVision's own import map (three r184).
// The pre-image of TiledRenderer runs beside the landed file ('?old', see
// harness/hooks.mjs), so "without renderFrame every call renders exactly as before"
// is proved call for call; the composites module is loaded twice, once over the
// live config and once over the pre-image config, to prove the new row moves no key.
//
//   node --import ./harness/register.mjs w2_12_unit.mjs
// =============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

// -----------------------------------------------------------------------------
// Minimal browser surface
// -----------------------------------------------------------------------------
globalThis.window = globalThis;
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => true;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(0), 0);
const drawImages = [];
globalThis.document = {
    hidden : true, activeElement : null,
    body : { classList : { add() {}, remove() {}, contains() { return false; }, toggle() {} }, appendChild() {} },
    getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    createElement(tag) {
        const el = { tagName : tag, width : 0, height : 0, style : {}, children : [], classList : { add() {}, remove() {}, toggle() {} },
                     appendChild(c) { this.children.push(c); return c; }, addEventListener() {}, setAttribute() {} };
        if (tag === 'canvas') {
            el.getContext = () => ({ fillStyle : '', fillRect() {}, clearRect() {},
                getImageData() { return { data : new Uint8ClampedArray([ 255, 0, 0, 255 ]) }; },
                drawImage(...args) { drawImages.push(args.slice(1)); } });
        }
        return el;
    }
};
const CFG_REL   = '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__Config__.json';
const CFG_OLD   = join(HERE, 'backup', CFG_REL.split('/').join('__'));
let   cfgMode   = 'live';                                                       // <-- 'live' | 'old' | 'fail'
globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.endsWith('Na__LayoutEditor__RenderComposites__Config__.json') && cfgMode !== 'live') {
        if (cfgMode === 'fail') return { ok : false, status : 404, json : async () => ({}) };
        const text = readFileSync(CFG_OLD, 'utf8'); return { ok : true, status : 200, json : async () => JSON.parse(text) };
    }
    if (u.startsWith('file:')) {
        try { const text = readFileSync(fileURLToPath(u), 'utf8'); return { ok : true, status : 200, json : async () => JSON.parse(text), text : async () => text }; }
        catch { return { ok : false, status : 404, json : async () => ({}), text : async () => '' }; }
    }
    throw new Error('no network in this harness: ' + u);
};
const warnings = [];
const realWarn = console.warn;
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); };

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass : !!pass }); console.log((pass ? '  PASS  ' : '  FAIL  ') + name + (detail !== undefined && !pass ? '   ' + JSON.stringify(detail).slice(0, 1500) : '')); };

const VV = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/';
const M  = (rel) => pathToFileURL(VV + rel).href;
const THREE = await import('three');

const P_FOG  = '02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__DepthFog__.js';
const P_RC   = '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js';
const P_TR   = '02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js';
const P_RP   = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js';
const P_RL   = '02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js';
const P_CLIP = '02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
const P_DATA = '02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js';
const P_FCFG = '02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__ConfigState__.js';
const P_MATH = '02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__Maths__.js';

// =============================================================================
// 0. LINK
// =============================================================================
console.log('\n0. LINK');
const FOG  = await import(M(P_FOG));
const TR   = await import(M(P_TR));
const TRo  = await import(M(P_TR) + '?old');
const RP   = await import(M(P_RP));
const RL   = await import(M(P_RL));
const CLIP = await import(M(P_CLIP));
const DATA = await import(M(P_DATA));
const FCFG = await import(M(P_FCFG));
const MATH = await import(M(P_MATH));
check('0.1 the DepthFog leaf links in Node and exports exactly TrueVision\'s one name', JSON.stringify(Object.keys(FOG)) === JSON.stringify([ 'Na__LeVp2d__FogFor' ]), Object.keys(FOG));
check('0.2 TiledRenderer exports unchanged (RenderToCanvas + the TilePlan pair)', JSON.stringify(Object.keys(TR).sort()) === JSON.stringify(Object.keys(TRo).sort()), Object.keys(TR));
{
    const imports = (s) => s.split('\n').filter((l) => /^\s*import /.test(l) || /^\s*\} from /.test(l)).join('\n');
    const now = readFileSync(VV + P_TR, 'utf8'), old = readFileSync(join(HERE, 'backup', P_TR.split('/').join('__')), 'utf8');
    check('0.3 the route is generic: TiledRenderer\'s imports are unchanged (no 49, no Layout Editor import)', imports(now) === imports(old));
}

// =============================================================================
// 1. Na__LeVp2d__FogFor - TrueVision's leaf, as it answers here
// =============================================================================
console.log('\n1. VIEWPORT 2D DEPTH FOG LEAF');
await FCFG.Na__ElevFogCfg__Load();
{
    const Elev = (fog) => { const e = { Elevation__Id : 'E01', Elevation__AzimuthDeg : 0, Elevation__PlaneOriginMm : { PosX : 0, PosZ : 2500 } }; if (fog) DATA.Na__ElevData__SetDepthFog(e, fog); return e; };
    const vp   = (styles) => ({ Viewport__Styles : styles });
    const desc = (elevation) => ({ definition : { Kind : 'scratch' }, source : elevation === undefined ? null : { elevation } });
    const ON   = { enabled : true, startDepthMm : 1000, endDepthMm : 6000, falloffPercent : 50 };

    check('1.1 null for no viewport / no described / no definition',
          FOG.Na__LeVp2d__FogFor(null, desc(Elev(ON))) === null && FOG.Na__LeVp2d__FogFor(vp({}), null) === null && FOG.Na__LeVp2d__FogFor(vp({}), { definition : null, source : { elevation : Elev(ON) } }) === null);
    check('1.2 null when the viewport\'s Depth Fog row is unticked (styles.depthFog === false)', FOG.Na__LeVp2d__FogFor(vp({ depthFog : false }), desc(Elev(ON))) === null);
    check('1.3 null for a drawing that is not an elevation (a floor plan: no source.elevation)', FOG.Na__LeVp2d__FogFor(vp({}), desc(undefined)) === null && FOG.Na__LeVp2d__FogFor(vp({}), { definition : {}, source : {} }) === null);
    check('1.4 null for an elevation whose fog is off (every record\'s default)', FOG.Na__LeVp2d__FogFor(vp({ depthFog : true }), desc(Elev(null))) === null);

    const e  = Elev(ON);
    const a  = FOG.Na__LeVp2d__FogFor(vp({ depthFog : true }), desc(e));
    const b  = FOG.Na__LeVp2d__FogFor(vp({}), desc(e));                         // <-- A viewport saved before the row existed reads as ON
    const settings = DATA.Na__ElevData__GetDepthFog(e), plane = DATA.Na__ElevData__GetDepthFogPlane(e);
    const expect = MATH.Na__ElevFogMath__Token(settings, FCFG.Na__ElevFogCfg__GetAppearance()) + '@' + Math.round(plane.distanceMm) + ':' + plane.normalX.toFixed(5) + ':' + plane.normalZ.toFixed(5);
    check('1.5 fog on: { token, source } with TrueVision\'s token (fog maths token @ plane distance : normal x : normal z)', a && a.token === expect && typeof a.source.getSettings === 'function' && typeof a.source.getPlane === 'function', { got : a && a.token, expect });
    check('1.6 a viewport with no depthFog key reads as ON (same answer)', b && b.token === a.token);
    check('1.7 the source holds the values AS READ: the record edited afterwards does not move it',
          (() => { const before = JSON.stringify(a.source.getSettings()); DATA.Na__ElevData__SetDepthFog(e, { endDepthMm : 9000 }); return JSON.stringify(a.source.getSettings()) === before && a.source.getPlane().distanceMm === plane.distanceMm; })());
    const c = FOG.Na__LeVp2d__FogFor(vp({}), desc(e));
    check('1.8 ...and a fresh ask after the edit answers a new token (the fog image\'s key moves with its picture)', c && c.token !== a.token && c.source.getSettings().endDepthMm === 9000, c && c.token);
    const e2 = Elev(ON); DATA.Na__ElevData__SetPlaneOriginMm(e2, 0, 4000);
    const d = FOG.Na__LeVp2d__FogFor(vp({}), desc(e2));
    check('1.9 the token moves with the plane', d && a && d.token.split('@')[0] === a.token.split('@')[0] && d.token !== a.token, { a : a.token, d : d && d.token });
    check('1.10 the system switch is read (Na__ElevFogCfg__IsEnabled true with the shipped 49 config)', FCFG.Na__ElevFogCfg__IsEnabled() === true);
    check('1.11 the leaf source is TrueVision\'s with the banner and PORT NOTE only (see port_w2_12.py --check for the byte proof)',
          /^\/\/ VALEVISION3D - LAYOUT EDITOR - VIEWPORT 2D - DEPTH FOG$/m.test(readFileSync(VV + P_FOG, 'utf8')) && !/TRUEVISION3D/.test(readFileSync(VV + P_FOG, 'utf8')));
}

// =============================================================================
// 2. The composites config: the Depth Fog row, and nothing else moves
// =============================================================================
console.log('\n2. RENDER COMPOSITES CONFIG');
{
    cfgMode = 'live'; const RCn = await import(M(P_RC) + '?cfg=live'); await RCn.Na__LeComposite__Ready();
    cfgMode = 'old';  const RCo = await import(M(P_RC) + '?cfg=old');  await RCo.Na__LeComposite__Ready();
    cfgMode = 'fail'; const RCf = await import(M(P_RC) + '?cfg=fail'); await RCf.Na__LeComposite__Ready();
    cfgMode = 'live';
    const rn = RCn.Na__LeComposite__Rows(), ro = RCo.Na__LeComposite__Rows(), rf = RCf.Na__LeComposite__Rows();
    const fog = rn[0];
    check('2.1 the live config lists Depth Fog first (Order 5): a 2D-only toggle with no weight', fog.key === 'depthFog' && fog.label === 'Depth Fog' && fog.twoDOnly === true && fog.toggle === true && fog.order === 5 && fog.weight.kind === 'none', fog);
    check('2.2 every other row is exactly as before, in the same order', JSON.stringify(rn.slice(1)) === JSON.stringify(ro), { now : rn.slice(1).map((r) => r.key), old : ro.map((r) => r.key) });
    const ff = rf.find((r) => r.key === 'depthFog');
    check('2.3 the config row agrees with RenderComposites 1.3.0\'s built-in fallback row (W2-09 F4)',
          ff && rf[0].key === 'depthFog' && ff.label === fog.label && ff.twoDOnly === fog.twoDOnly && ff.toggle === fog.toggle && ff.weight.kind === 'none', ff);
    check('2.4 ToggleRows gains depthFog first; WeightRows unchanged (the row carries no weight)',
          JSON.stringify(RCn.Na__LeComposite__ToggleRows().map((r) => r.key)) === JSON.stringify([ 'depthFog' ].concat(RCo.Na__LeComposite__ToggleRows().map((r) => r.key)))
          && JSON.stringify(RCn.Na__LeComposite__WeightRows()) === JSON.stringify(RCo.Na__LeComposite__WeightRows()));
    const vps = [ {}, { Viewport__Styles : { depthFog : false } }, { Viewport__CompositeWeights : {} },
                  { Viewport__CompositeWeights : { baseImage : 1.5, profileLinework : 0.8, sectionOutline : 3, enhanceWhitecard : 40, projectedLinework : 1.2, hiddenLines : 0.6 } },
                  { Viewport__CompositeWeights : { depthFog : 2, unknownKey : 9 } }, { Viewport__CompositeWeights : { enhanceWhitecard : 100 } } ];
    let same = true; const diffs = [];
    for (const v of vps) for (const t3 of [ false, true ]) {
        const n = [ RCn.Na__LeComposite__RasterToken(v, t3), RCn.Na__LeComposite__Token(v) ], o = [ RCo.Na__LeComposite__RasterToken(v, t3), RCo.Na__LeComposite__Token(v) ];
        if (JSON.stringify(n) !== JSON.stringify(o)) { same = false; diffs.push({ v, n, o }); }
    }
    check('2.5 RasterToken (2D and 3D) and Token are identical for every viewport: no render key moves, no sheet re-bakes', same, diffs);
    let wsame = true;
    for (const v of vps) for (const r of ro) { if (RCn.Na__LeComposite__Weight(v, r.key) !== RCo.Na__LeComposite__Weight(v, r.key) || RCn.Na__LeComposite__IsOverridden(v, r.key) !== RCo.Na__LeComposite__IsOverridden(v, r.key)) wsame = false; }
    check('2.6 Weight and IsOverridden answer as before for every row and viewport', wsame);
    check('2.7 Row(depthFog) was null before (config fetched) and is the toggle row now', RCo.Na__LeComposite__Row('depthFog') === null && RCn.Na__LeComposite__Row('depthFog') && RCn.Na__LeComposite__Row('depthFog').weight.kind === 'none');
    const cfg = JSON.parse(readFileSync(VV + CFG_REL, 'utf8'));
    check('2.8 the config Meta is 1.4.0 with Meta__DepthFog after Meta__EnhanceStrength', cfg.LayoutEditor__RenderComposites__Meta.Meta__Version === '1.4.0'
          && Object.keys(cfg.LayoutEditor__RenderComposites__Meta).indexOf('Meta__DepthFog') === Object.keys(cfg.LayoutEditor__RenderComposites__Meta).indexOf('Meta__EnhanceStrength') + 1);
}

// =============================================================================
// 3. TiledRenderer - the opt-in frame routine route
// =============================================================================
console.log('\n3. TILED RENDERER');
function Label(obj) { if (!obj) return 'null'; if (obj.isScene) return 'scene'; if (obj.isMesh && obj.material) return 'quad:' + (obj.material.name || obj.material.type); return obj.type || 'object'; }
function MakeRenderer(log) {
    const st = { target : null, autoClear : true, clearColor : new THREE.Color(0xffffff), clearAlpha : 1, w : 800, h : 600, ratio : 2 };
    const tname = (t) => t ? (t.texture && t.texture.name ? t.texture.name : 'target') : 'canvas';
    return {
        st, tname, shadowMap : { autoUpdate : true },
        get autoClear() { return st.autoClear; }, set autoClear(v) { st.autoClear = v; },
        domElement : { width : 800, height : 600, addEventListener() {}, removeEventListener() {} },
        getContext() { return { isContextLost : () => false }; },
        getRenderTarget() { return st.target; },
        setRenderTarget(t) { if (t === st.target) return; st.target = t; log.push('target>' + tname(t)); },
        getClearAlpha() { return st.clearAlpha; }, getClearColor(c) { return c.copy(st.clearColor); },
        setClearColor(c, a) { st.clearColor.set(c); if (a !== undefined) st.clearAlpha = a; },
        clear() { log.push('clear@' + tname(st.target)); },
        render(obj, cam) { log.push('render ' + Label(obj) + '@' + tname(st.target)); },
        getSize(v) { return v.set(st.w, st.h); }, setSize(w, h) { st.w = w; st.h = h; log.push('size ' + w + 'x' + h); },
        getPixelRatio() { return st.ratio; }, setPixelRatio(r) { st.ratio = r; log.push('ratio ' + r); },
        getDrawingBufferSize(v) { return v.set(st.w * st.ratio, st.h * st.ratio); },
        capabilities : { isWebGL2 : true }, getContextAttributes() { return {}; }
    };
}
const scene = new THREE.Scene();
scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
const ortho = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 40);
ortho.position.set(0, 1, 20); ortho.lookAt(0, 1, 0); ortho.updateProjectionMatrix(); ortho.updateMatrixWorld(true);
const persp = new THREE.PerspectiveCamera(50, 4 / 3, 0.1, 100);
persp.position.set(8, 3, 20); persp.lookAt(0, 1, 0); persp.updateProjectionMatrix(); persp.updateMatrixWorld(true);
const PLANE = { normalX : 0, normalY : 0, normalZ : 1, distanceMm : 0 };
const FOG_ON = { enabled : true, startDepthMm : 1000, endDepthMm : 6000, falloffPercent : 50 };
const FOG_OFF = { enabled : false, startDepthMm : 1000, endDepthMm : 6000, falloffPercent : 50 };
const Source = (s) => ({ getSettings : () => s, getPlane : () => PLANE });

async function RunExport(mod, { fog = null, samples = 1, w = 5000, h = 3000, threeD = false, pipeline = true, renderFrame, frameKind = 'none', throwAt = -1 } = {}) {
    const log = []; const r = MakeRenderer(log);
    RL.Na__ElevFog__Initialise({ renderer : r, scene }); RL.Na__ElevFog__SetSource(fog);
    const fxaa = { enabled : true };
    const composer = { passes : [ { isRenderPass : true, camera : persp } ], renderToScreen : true, readBuffer : { texture : new THREE.Texture() },
                       render() { log.push('composer.render'); }, setPixelRatio(x) { log.push('composer.ratio ' + x); }, setSize(w2, h2) { log.push('composer.size ' + w2 + 'x' + h2); } };
    const state = pipeline ? { composer, fxaaPassRef : fxaa, renderProfileNormals() { log.push('normals3d'); }, setProfileLinesSize(a, b) { log.push('profile.size ' + a + 'x' + b); }, setFxaaSize(a, b) { log.push('fxaa.size ' + a + 'x' + b); } } : null;
    RP.Na__DrawView__RenderPreset__Initialize({ renderer : r, scene, camera : persp, pipelineRef : { current : state } });
    RP.Na__DrawView__RenderPreset__Enter({ camera : ortho, styles : {} });
    CLIP.Na__SectionClipping__SetOverlayRenderer(() => { log.push('section.overlay'); });
    const overrides = threeD ? null : RP.Na__DrawView__RenderPreset__GetExportOverrides();
    if (overrides && typeof overrides.renderDepthFog === 'function') { const f = overrides.renderDepthFog; overrides.renderDepthFog = (c) => { log.push('fog.over'); return f(c); }; }
    const seen = { cams : [], projections : [], toScreen : [], fxaa : [], targets : [] };
    let frames = 0;
    const probe = (cam) => {
        if (frames++ === throwAt) throw new Error('frame routine failed on purpose');
        seen.cams.push(cam); seen.projections.push(cam.projectionMatrix.elements.slice()); seen.toScreen.push(composer.renderToScreen); seen.fxaa.push(fxaa.enabled);
        seen.targets.push(r.tname(r.st.target)); log.push('frame@' + r.tname(r.st.target));
    };
    const rf = renderFrame !== undefined ? renderFrame : (frameKind === 'probe' ? probe : (frameKind === 'fog' ? (cam) => { seen.cams.push(cam); log.push('frame@' + r.tname(r.st.target)); return RL.Na__ElevFog__RenderLayerFrame(cam); } : undefined));
    const options = { renderer : r, scene, camera : persp, getRenderPipelineState : () => state, elevationOverrides : overrides, targetWidth : w, targetHeight : h, antiAliasSamples : samples };
    if (rf !== undefined) options.renderFrame = rf;
    log.length = 0; drawImages.length = 0;
    const projBefore = (threeD ? persp : ortho).projectionMatrix.elements.slice();
    let result = null, error = null;
    try { result = await mod.Na__StaticExport__RenderToCanvas(options); } catch (e) { error = e; }
    const after = { target : r.st.target, size : [ r.st.w, r.st.h ], ratio : r.st.ratio, shadow : r.shadowMap.autoUpdate, toScreen : composer.renderToScreen, fxaa : fxaa.enabled,
                    viewOffset : !!((threeD ? persp : ortho).view && (threeD ? persp : ortho).view.enabled), projSame : JSON.stringify(projBefore) === JSON.stringify((threeD ? persp : ortho).projectionMatrix.elements.slice()) };
    RP.Na__DrawView__RenderPreset__Exit(); CLIP.Na__SectionClipping__SetOverlayRenderer(null); RL.Na__ElevFog__SetSource(null);
    return { log : log.slice(), draws : drawImages.map((d) => d.join(',')), result, error, seen, after, overrides };
}
const Tiles = (x) => x.draws.length;
const Strip = (res) => res ? { w : res.width, h : res.height, c : res.wasClamped, s : res.antiAliasSamples } : null;
const Same = (a, b) => JSON.stringify(a.log) === JSON.stringify(b.log) && JSON.stringify(a.draws) === JSON.stringify(b.draws) && JSON.stringify(Strip(a.result)) === JSON.stringify(Strip(b.result)) && JSON.stringify(a.after) === JSON.stringify(b.after);

// 3A. Opt-in: without renderFrame the exporter is the pre-image, call for call
{
    const cases = [
        [ '2D drawing, fog on, 1 sample',          { fog : Source(FOG_ON) } ],
        [ '2D drawing, fog on, 4 samples',         { fog : Source(FOG_ON), samples : 4, w : 3000, h : 2000 } ],
        [ '2D drawing, fog off (a sheet bake)',    { fog : Source(FOG_OFF) } ],
        [ '2D drawing, no fog source, 8 samples',  { samples : 8, w : 2400, h : 1600 } ],
        [ '3D view, 1 sample',                     { threeD : true } ],
        [ '3D view, 4 samples',                    { threeD : true, samples : 4, w : 3000, h : 2000 } ],
        [ '2D drawing, no pipeline (plain render)', { pipeline : false } ]
    ];
    let n = 1;
    for (const [ name, opts ] of cases) {
        const now = await RunExport(TR, opts), old = await RunExport(TRo, opts);
        check('3A.' + (n++) + ' without renderFrame, ' + name + ': call-for-call, tile-for-tile the pre-image exporter', Same(now, old) && Tiles(now) > 0 && !now.error,
              { now : now.log.slice(0, 12), old : old.log.slice(0, 12), err : String(now.error) });
    }
    for (const junk of [ null, 'renderFrame', {}, 42 ]) {
        const now = await RunExport(TR, { fog : Source(FOG_ON), renderFrame : junk }), old = await RunExport(TRo, { fog : Source(FOG_ON) });
        check('3A.' + (n++) + ' renderFrame = ' + JSON.stringify(junk) + ' is not a function: the composer route, as before', Same(now, old));
    }
}

// 3B. The route, one sample per tile
{
    const x = await RunExport(TR, { fog : Source(FOG_ON), frameKind : 'probe' });
    const tiles = Tiles(x);
    check('3B.1 one frame routine call per tile, drawn straight onto the canvas', tiles >= 4 && x.log.filter((e) => e.startsWith('frame@')).length === tiles && x.seen.targets.every((t) => t === 'canvas'), { tiles, frames : x.log.filter((e) => e.startsWith('frame@')) });
    check('3B.2 the composer draws nothing, no section overlay, no per-tile depth fog on this route',
          !x.log.includes('composer.render') && !x.log.includes('section.overlay') && !x.log.includes('fog.over') && !x.log.some((e) => e.includes('ElevationDepthFog')), x.log.slice(0, 20));
    check('3B.3 the routine is handed the 2D drawing\'s own camera (the overrides\' ortho), offset per tile', x.seen.cams.every((c) => c === ortho) && new Set(x.seen.projections.map((p) => p.join(','))).size === tiles);
    const pic = await RunExport(TR, { fog : Source(FOG_OFF) });
    check('3B.4 registration: the same tiles, the same copy rectangles and the same per-tile projections as the picture',
          JSON.stringify(x.draws) === JSON.stringify(pic.draws), { fog : x.draws.slice(0, 2), pic : pic.draws.slice(0, 2) });
    const sizes = (l) => l.filter((e) => /^(size|ratio|composer\.(size|ratio)|profile\.size|fxaa\.size)/.test(e));
    check('3B.5 every buffer is sized and handed back exactly as for the picture (composer, profile, FXAA, renderer)', JSON.stringify(sizes(x.log)) === JSON.stringify(sizes(pic.log)), { fog : sizes(x.log), pic : sizes(pic.log) });
    check('3B.6 state handed back: target, size, ratio, shadow auto-update, composer to-screen, FXAA, no view offset, projection',
          x.after.target === null && x.after.size.join() === '800,600' && x.after.ratio === 2 && x.after.shadow === true && x.after.toScreen === true && x.after.fxaa === true && !x.after.viewOffset && x.after.projSame, x.after);
    check('3B.7 the result reports one sample and the export size', x.result && x.result.antiAliasSamples === 1 && x.result.width === 5000 && x.result.height === 3000);
}

// 3C. The route, supersampled
{
    const x = await RunExport(TR, { fog : Source(FOG_ON), samples : 4, w : 3000, h : 2000, frameKind : 'probe' });
    const tiles = Tiles(x);
    // Split at each present (the last accumulate is followed by the present quad onto the canvas)
    const chunks = []; let cur = [];
    for (const e of x.log) { cur.push(e); if (e === 'render quad:Na__Supersampler__Present@canvas') { chunks.push(cur); cur = []; } }
    const perTileOk = chunks.length === tiles && chunks.every((c) => {
        const frames = c.filter((e) => e.startsWith('frame@'));
        const acc    = c.filter((e) => e === 'render quad:Na__Supersampler__Accumulate@Na__Supersampler__Accumulation');
        return frames.length === 4 && frames.every((f) => f === 'frame@Na__Supersampler__Sample') && acc.length === 4
               && c.indexOf('frame@Na__Supersampler__Sample') < c.indexOf('render quad:Na__Supersampler__Accumulate@Na__Supersampler__Accumulation');
    });
    check('3C.1 per tile: four frames, each into the supersampler\'s own SAMPLE TARGET, each accumulated, then one present onto the canvas', perTileOk, chunks[0]);
    check('3C.2 the composer is never asked, nor its read buffer: no composer.render, no section overlay, no per-tile fog', !x.log.includes('composer.render') && !x.log.includes('section.overlay') && !x.log.includes('fog.over'));
    check('3C.3 the composer stays drawing to the screen and FXAA stays on throughout (this route leaves both alone)', x.seen.toScreen.every((v) => v === true) && x.seen.fxaa.every((v) => v === true));
    const perTile = []; for (let i = 0; i < x.seen.projections.length; i += 4) perTile.push(new Set(x.seen.projections.slice(i, i + 4).map((p) => p.join(','))).size);
    check('3C.4 each of a tile\'s four samples is jittered (four different projections), and the projection is handed back', perTile.every((n) => n === 4) && x.after.projSame, perTile);
    const pic = await RunExport(TR, { fog : Source(FOG_OFF), samples : 4, w : 3000, h : 2000 });
    check('3C.5 registration: the same tiles and copy rectangles as the supersampled picture', JSON.stringify(x.draws) === JSON.stringify(pic.draws));
    check('3C.6 state handed back (target, size, ratio, shadow auto-update, to-screen, FXAA, view offset)',
          x.after.target === null && x.after.size.join() === '800,600' && x.after.ratio === 2 && x.after.shadow === true && x.after.toScreen === true && x.after.fxaa === true && !x.after.viewOffset, x.after);
    check('3C.7 the result reports four samples', x.result && x.result.antiAliasSamples === 4);
    // Shadow maps: the first sample draws them, the rest reuse them (as the composer route)
    const shadowSeen = [];
    const y = await RunExport(TR, { fog : Source(FOG_ON), samples : 4, w : 1500, h : 1000, renderFrame : function () { shadowSeen.push(globalThis.__lastRenderer ? 0 : 0); } });
    check('3C.8 a frame routine that draws nothing still yields a clean run (present per tile, state back)', !y.error && y.after.target === null && y.after.shadow === true);
}

// 3D. The real fog layer as the frame routine (what SnapshotRenderer will pass for a sheet's fog image, W2-15)
{
    const x = await RunExport(TR, { fog : Source(FOG_ON), frameKind : 'fog' });
    const tiles = Tiles(x);
    check('3D.1 RenderLayerFrame through the route: per tile a depth pre-pass and one OWN-LAYER quad onto the canvas, nothing else',
          x.log.filter((e) => e === 'render scene@Na__ElevationDepthFog__DepthPrePass').length === tiles
          && x.log.filter((e) => /^render quad:Na__ElevationDepthFog__/.test(e)).length === tiles
          && !x.log.includes('composer.render') && !x.log.includes('section.overlay') && !x.log.includes('fog.over'), x.log.slice(0, 16));
    check('3D.2 the own-layer mode clears its target first (the fog alone on a transparent ground)', x.log.some((e) => e.startsWith('clear@')), x.log.slice(0, 16));
    const s = await RunExport(TR, { fog : Source(FOG_ON), frameKind : 'fog', samples : 4, w : 3000, h : 2000 });
    check('3D.3 supersampled: the fog quad lands in the sample target four times per tile, presented once',
          s.log.filter((e) => /^render quad:Na__ElevationDepthFog__.*@Na__Supersampler__Sample$/.test(e)).length === 4 * Tiles(s) && s.log.filter((e) => e === 'render quad:Na__Supersampler__Present@canvas').length === Tiles(s), s.log.slice(0, 20));
    const off = await RunExport(TR, { fog : null, frameKind : 'fog' });
    check('3D.4 with no fog source the routine draws no fog quad (an empty, transparent image)', !off.log.some((e) => /^render quad:Na__ElevationDepthFog__/.test(e)), off.log.slice(0, 10));
}

// 3E. A frame routine that throws: the error surfaces and everything is handed back
{
    for (const samples of [ 1, 4 ]) {
        const x = await RunExport(TR, { fog : Source(FOG_ON), samples, w : 3000, h : 2000, frameKind : 'probe', throwAt : samples === 1 ? 1 : 5 });
        check('3E.' + samples + ' a throwing routine (' + samples + ' sample' + (samples > 1 ? 's' : '') + '): rejects with its error and restores target, size, ratio, shadow, view offset',
              x.error && /on purpose/.test(x.error.message) && x.after.target === null && x.after.size.join() === '800,600' && x.after.ratio === 2 && x.after.shadow === true && !x.after.viewOffset, { err : String(x.error), after : x.after });
    }
}

// 3F. No pipeline, and a 3D camera through the route
{
    const a = await RunExport(TR, { fog : Source(FOG_ON), pipeline : false, frameKind : 'probe' });
    check('3F.1 no pipeline: the route still draws one frame per tile onto the canvas', Tiles(a) > 0 && a.log.filter((e) => e === 'frame@canvas').length === Tiles(a) && !a.log.some((e) => e.startsWith('render scene@canvas')));
    const b = await RunExport(TR, { fog : Source(FOG_ON), pipeline : false, samples : 4, w : 1500, h : 1000, frameKind : 'probe' });
    check('3F.2 no pipeline, supersampled: the route still supersamples through its own sample target', Tiles(b) > 0 && b.log.filter((e) => e === 'frame@Na__Supersampler__Sample').length === 4 * Tiles(b));
    const c = await RunExport(TR, { threeD : true });
    const cr = await RunExport(TR, { threeD : true, frameKind : 'probe' });
    check('3F.3 a 3D camera through the route: the main camera, per tile, no composer', cr.seen.cams.every((k) => k === persp) && cr.seen.cams.length === Tiles(cr) && !cr.log.includes('composer.render') && Tiles(cr) === Tiles(c));
}

console.warn = realWarn;
const failed = results.filter((r) => !r.pass);
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed');
process.exit(failed.length ? 1 : 0);
