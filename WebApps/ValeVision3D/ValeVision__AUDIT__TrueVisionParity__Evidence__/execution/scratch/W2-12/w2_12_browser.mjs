// =============================================================================
// W2-12 scratch harness - the frame routine route on pixels, real WebGL, headless Chromium (not shipped)
// =============================================================================
// Built on W2-03's fog harness (same scratch elevation, same renderer flags, no server:
// Chromium asks for http://vv.test/<path> and the route answers from the disk).
//
//   ROOM   x -3.5..-1.5, y 0..2, z -1..1   - cut by a real section at z = 0 (poche by the overlay)
//   NEAR   x -3.5..-1.5, y 2.5..3.5, front 0.3 m behind the plane   (before Depth)
//   MID    x -0.75..0.75, y 0..2, front 2.75 m behind               (inside the fade)
//   FAR    x 1.5..3.5, y 0..2, front 11 m behind                    (past End)
// Fog: Depth 1000, End 6000, Fall-off 50. Export 2 x the 160 x 100 canvas (40 px per metre).
//
//   node w2_12_browser.mjs          the landed TiledRenderer
//   node w2_12_browser.mjs --old    TiledRenderer served from its PRE-IMAGE (backup/): only the
//                                   scenarios without renderFrame, so the two runs' hashes prove
//                                   "a bake without the option is byte-identical"
// =============================================================================

import { createRequire } from 'node:module';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require      = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright');

const ROOT    = 'D:\\10_CoreLib__ValeCodebase';
const HOST    = 'http://vv.test';
const APP     = '/WebApps/ValeVision3D/';
const PAGE    = APP + '__w2_12_route__.html';
const SCRATCH = dirname(fileURLToPath(import.meta.url));
const OLD     = process.argv.includes('--old');
const P_TR    = '02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js';
const P_RP    = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js';
const OVERLAY = OLD ? { [P_TR] : join(SCRATCH, 'backup', P_TR.split('/').join('__')) } : {};
if (!existsSync(join(SCRATCH, 'logs'))) mkdirSync(join(SCRATCH, 'logs'));

const TYPES = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png' };

const PAGE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>W2-12 route</title>
<script type="importmap">
{ "imports": {
    "three": "./04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.module.js",
    "three/addons/": "./04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/"
} }
</script></head><body style="margin:0;background:#fff">
<script type="module">
import * as THREE from 'three';
import * as Fog from './02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js';
import * as Preset from './${P_RP}';
import * as Tiled from './${P_TR}';
import * as Tool from './02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js';
import * as Adapter from './02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js';
import * as Clip from './02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';

const OLD = ${OLD ? 'true' : 'false'};
const out = { checks : [], info : {}, hashes : {} };
const check = (name, pass, detail) => out.checks.push({ name, pass : !!pass, detail : detail === undefined ? '' : detail });
const Hash = (data) => { let h = 2166136261 >>> 0; for (let i = 0; i < data.length; i++) { h ^= data[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16) + ':' + data.length; };
try {
    const W = 160, H = 100;
    const renderer = new THREE.WebGLRenderer({ antialias : false, alpha : true, stencil : true, depth : true, logarithmicDepthBuffer : true, preserveDrawingBuffer : true });
    renderer.setPixelRatio(1); renderer.setSize(W, H);
    document.body.appendChild(renderer.domElement);
    const gl = renderer.getContext();

    const scene = new THREE.Scene();
    const modelRoot = new THREE.Group(); modelRoot.name = 'Scratch__ModelRoot'; scene.add(modelRoot);
    const grey = new THREE.MeshBasicMaterial({ color : 0x404040 });
    const Box = (x0, x1, y0, y1, z0, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), grey); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); modelRoot.add(m); return m; };
    Box(-3.5, -1.5, 0, 2, -1, 1); Box(-3.5, -1.5, 2.5, 3.5, -0.8, -0.3); Box(-0.75, 0.75, 0, 2, -3.5, -2.75); Box(1.5, 3.5, 0, 2, -12, -11);
    modelRoot.updateMatrixWorld(true);

    const ortho = new THREE.OrthographicCamera(-4, 4, 2.5, -2.5, 0.1, 40);
    ortho.position.set(0, 2, 20); ortho.lookAt(0, 2, 0); ortho.updateProjectionMatrix(); ortho.updateMatrixWorld(true);
    const persp = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    persp.position.set(6, 4, 18); persp.lookAt(0, 1, -2); persp.updateProjectionMatrix(); persp.updateMatrixWorld(true);
    const controls = { enabled : true, target : new THREE.Vector3(), update() {} };

    Tool.Na__CrossSection__Initialize(scene, persp, renderer, controls, { current : { invalidateProfileLinesCache() {} } }, modelRoot);
    await new Promise((r) => setTimeout(r, 200));
    Adapter.Na__DrawView__SectionAdapter__SuspendLiveTool();
    Adapter.Na__DrawView__SectionAdapter__UpsertVerticalPlane('W2-12__Cut', 0, 1, 0, null);
    Adapter.Na__DrawView__SectionAdapter__SetActivePlane('W2-12__Cut');

    Fog.Na__ElevFog__Initialise({ renderer, scene });
    await new Promise((r) => setTimeout(r, 100));
    Preset.Na__DrawView__RenderPreset__Initialize({ renderer, scene, camera : persp, pipelineRef : { current : null } });
    Preset.Na__DrawView__RenderPreset__Enter({ camera : ortho, styles : {} });

    const FOG_ON  = { enabled : true,  startDepthMm : 1000, endDepthMm : 6000, falloffPercent : 50 };
    const FOG_OFF = { enabled : false, startDepthMm : 1000, endDepthMm : 6000, falloffPercent : 50 };
    const PLANE   = { normalX : 0, normalY : 0, normalZ : 1, distanceMm : 0 };
    const Source  = (s) => ({ getSettings : () => s, getPlane : () => PLANE });

    const Export = async ({ source = null, samples = 1, frame = null, threeD = false }) => {
        Fog.Na__ElevFog__SetSource(source);
        const overrides = threeD ? null : Preset.Na__DrawView__RenderPreset__GetExportOverrides();
        let fogCalls = 0, overlayCalls = 0, frames = 0;
        if (overrides && typeof overrides.renderDepthFog === 'function') { const f = overrides.renderDepthFog; overrides.renderDepthFog = (c) => { fogCalls++; return f(c); }; }
        const ovl = Clip.Na__SectionClipping__GetOverlayRenderer();
        Clip.Na__SectionClipping__SetOverlayRenderer((c) => { overlayCalls++; if (ovl) ovl(c); });
        const opts = { renderer, scene, camera : persp, getRenderPipelineState : () => null, elevationOverrides : overrides,
                       targetWidth : 2 * W, targetHeight : 2 * H, antiAliasSamples : samples };
        if (frame) opts.renderFrame = (cam) => { frames++; return frame(cam); };
        try {
            const res = await Tiled.Na__StaticExport__RenderToCanvas(opts);
            const img = res.canvas.getContext('2d').getImageData(0, 0, res.width, res.height).data;
            return { img, w : res.width, h : res.height, fogCalls, overlayCalls, frames, samples : res.antiAliasSamples,
                     targetAfter : renderer.getRenderTarget(), sizeAfter : renderer.getSize(new THREE.Vector2()).toArray() };
        } finally {
            Clip.Na__SectionClipping__SetOverlayRenderer(ovl);
            Fog.Na__ElevFog__SetSource(null);
        }
    };

    // WITHOUT renderFrame - hashed in both runs (landed and --old)
    const plain = {
        sheetFogOff1  : await Export({ source : Source(FOG_OFF) }),
        sheetFogOff4  : await Export({ source : Source(FOG_OFF), samples : 4 }),
        sheetNoSrc1   : await Export({}),
        drawingFogOn1 : await Export({ source : Source(FOG_ON) }),
        drawingFogOn4 : await Export({ source : Source(FOG_ON), samples : 4 }),
        threeD1       : await Export({ threeD : true }),
        threeD4       : await Export({ threeD : true, samples : 4 })
    };
    for (const k of Object.keys(plain)) out.hashes[k] = Hash(plain[k].img);
    check('P.1 every export without renderFrame ran (one tile each, section overlay once per tile on the 2D ones)',
          Object.keys(plain).every((k) => plain[k].img.length === 4 * 2 * W * 2 * H) && plain.sheetFogOff1.overlayCalls === 1 && plain.drawingFogOn1.fogCalls === 1, Object.fromEntries(Object.entries(plain).map(([ k, v ]) => [ k, { fog : v.fogCalls, ovl : v.overlayCalls } ])));

    if (!OLD) {
        // THE ROUTE - the sheet's fog image (the frame SnapshotRenderer will hand over in W2-15)
        const fog1 = await Export({ source : Source(FOG_ON), frame : (cam) => Fog.Na__ElevFog__RenderLayerFrame(cam) });
        const fog4 = await Export({ source : Source(FOG_ON), samples : 4, frame : (cam) => Fog.Na__ElevFog__RenderLayerFrame(cam) });
        const fogOff = await Export({ source : Source(FOG_OFF), frame : (cam) => Fog.Na__ElevFog__RenderLayerFrame(cam) });
        out.hashes.fogImage1 = Hash(fog1.img); out.hashes.fogImage4 = Hash(fog4.img);
        const PxTop = (img, x, y, w) => { const i = (y * w + x) * 4; return [ img[i], img[i + 1], img[i + 2], img[i + 3] ]; };
        const at = (wx, wy) => [ Math.round((wx + 4) * 40), Math.round((4.5 - wy) * 40) ];
        const pts = { cap : [ -2.5, 1 ], near : [ -2.5, 3 ], mid : [ 0, 1 ], far : [ 2.5, 1 ], paper : [ 0, 4 ] };
        const S = {};
        for (const [ k, [ wx, wy ] ] of Object.entries(pts)) {
            const [ x, y ] = at(wx, wy);
            S[k] = { pic : PxTop(plain.sheetFogOff1.img, x, y, 2 * W), fogged : PxTop(plain.drawingFogOn1.img, x, y, 2 * W), fog1 : PxTop(fog1.img, x, y, 2 * W), fog4 : PxTop(fog4.img, x, y, 2 * W),
                     pic4 : PxTop(plain.sheetFogOff4.img, x, y, 2 * W), fogged4 : PxTop(plain.drawingFogOn4.img, x, y, 2 * W) };
        }
        out.info.samples = S;
        check('R.1 the route draws one frame per tile, and never the composer path\\'s extras: no per-tile fog, no section overlay',
              fog1.frames === 1 && fog1.fogCalls === 0 && fog1.overlayCalls === 0 && fog4.frames === 4 && fog4.fogCalls === 0 && fog4.overlayCalls === 0,
              { f1 : [ fog1.frames, fog1.fogCalls, fog1.overlayCalls ], f4 : [ fog4.frames, fog4.fogCalls, fog4.overlayCalls ] });
        const Veil = (px) => px[3] <= 2 && px[0] === 255 && px[1] === 255 && px[2] === 255;   // <-- TrueVision's deliberate paper-white veil (Shader NA_VEIL, two 8-bit steps): never alpha 0
        check('R.2 the fog image is the fog alone on a transparent ground: only the shader\\'s paper-white veil at the poche, the near block and open paper',
              Veil(S.cap.fog1) && Veil(S.near.fog1) && Veil(S.paper.fog1), { cap : S.cap.fog1, near : S.near.fog1, paper : S.paper.fog1 });
        check('R.3 ...full past End, part-way inside the fade', S.far.fog1[3] >= 250 && S.mid.fog1[3] > 20 && S.mid.fog1[3] < 235, { far : S.far.fog1, mid : S.mid.fog1 });
        const Over = (fog, pic) => [ 0, 1, 2 ].map((i) => Math.round(fog[i] * fog[3] / 255 + pic[i] * (1 - fog[3] / 255)));
        const close = (a, b, tol) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
        out.info.composite = { mid : Over(S.mid.fog1, S.mid.pic), far : Over(S.far.fog1, S.far.pic), midFogged : S.mid.fogged, farFogged : S.far.fogged };
        check('R.4 registration: the fog image laid over the unfogged picture gives the fogged drawing at the same pixels (mid, far)',
              close(Over(S.mid.fog1, S.mid.pic), S.mid.fogged.slice(0, 3), 4) && close(Over(S.far.fog1, S.far.pic), S.far.fogged.slice(0, 3), 2), out.info.composite);
        check('R.5 supersampled (4): the same fog, averaged through the sample target (far full, near and paper clear, mid as the 4-sample fogged drawing)',
              S.far.fog4[3] >= 250 && Veil(S.near.fog4) && Veil(S.paper.fog4) && close(Over(S.mid.fog4, S.mid.pic4), S.mid.fogged4.slice(0, 3), 4),
              { far : S.far.fog4, mid : S.mid.fog4, comp : Over(S.mid.fog4, S.mid.pic4), fogged4 : S.mid.fogged4 });
        check('R.5b ...and on the supersampled road (linear buffer, sRGB on present) the fog stays paper WHITE, never the grey a colour a step under its alpha gives',
              S.mid.fog4.slice(0, 3).every((v) => v === 255) && S.far.fog4.slice(0, 3).every((v) => v === 255), { mid : S.mid.fog4, far : S.far.fog4 });
        let anyAlpha = 0; for (let i = 3; i < fogOff.img.length; i += 4) if (fogOff.img[i] !== 0) anyAlpha++;
        check('R.6 a drawing with its fog off gives an entirely transparent image', anyAlpha === 0, anyAlpha);
        check('R.7 the canvas is bound again and the renderer back at its own size after the route (1 and 4 samples)',
              fog1.targetAfter === null && fog4.targetAfter === null && fog1.sizeAfter.join() === W + ',' + H && fog4.sizeAfter.join() === W + ',' + H, { t1 : !!fog1.targetAfter, t4 : !!fog4.targetAfter, s : fog4.sizeAfter });
        const after = await Export({ source : Source(FOG_OFF) });
        check('R.8 a picture baked straight after the route is pixel-identical to one baked before it (nothing left behind)', Hash(after.img) === out.hashes.sheetFogOff1);
        out.info.glError = gl.getError();
        check('R.9 no WebGL error', out.info.glError === 0, out.info.glError);
    }
    Preset.Na__DrawView__RenderPreset__Exit();
    out.info.mode = OLD ? 'OLD (pre-image TiledRenderer)' : 'landed';
} catch (error) {
    check('X.0 the page ran', false, String(error && error.stack || error));
}
window.__W212 = out;
</script></body></html>`;

const aborted = [];
const served  = new Set();
const browser = await chromium.launch({ headless : true, args : [ '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist' ] });
const page    = await browser.newPage();
const consoleLines = [];
page.on('console', (m) => consoleLines.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => consoleLines.push('pageerror: ' + e.message));
await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== HOST) { aborted.push(url.href); return route.abort(); }
    if (url.pathname === PAGE) return route.fulfill({ status : 200, contentType : TYPES['.html'], body : PAGE_HTML });
    const appRel = url.pathname.startsWith(APP) ? decodeURIComponent(url.pathname.slice(APP.length)) : null;
    const file   = appRel && OVERLAY[appRel] ? OVERLAY[appRel] : join(ROOT, decodeURIComponent(url.pathname));
    if (!existsSync(file)) return route.fulfill({ status : 404, contentType : TYPES['.json'], body : '{"error":"not found"}' });
    served.add(appRel || url.pathname);
    return route.fulfill({ status : 200, contentType : TYPES[extname(file).toLowerCase()] || 'application/octet-stream', body : readFileSync(file) });
});
await page.goto(HOST + PAGE);
await page.waitForFunction(() => !!window.__W212, null, { timeout : 240000 });
const out = await page.evaluate(() => window.__W212);
await browser.close();

const passed = out.checks.filter((c) => c.pass).length;
for (const c of out.checks) console.log((c.pass ? 'PASS ' : 'FAIL ') + c.name + (c.pass || c.detail === '' ? '' : '   -> ' + JSON.stringify(c.detail)));
console.log('');
console.log('mode    : ' + (out.info.mode || '?') + '; served ' + served.size + ' files; aborted ' + aborted.length);
console.log('hashes  : ' + JSON.stringify(out.hashes));
console.log('info    : ' + JSON.stringify(out.info));
const errors = consoleLines.filter((l) => /^(error|pageerror)/.test(l));
console.log('console : ' + consoleLines.length + ' line(s), ' + errors.length + ' error(s)' + (errors.length ? ' ' + JSON.stringify(errors.slice(0, 5)) : ''));
console.log('RESULT: ' + passed + '/' + out.checks.length + (passed === out.checks.length && out.checks.length > 0 ? ' PASS' : ' FAIL'));
writeFileSync(join(SCRATCH, 'logs', 'browser' + (OLD ? '__old' : '') + '.json'), JSON.stringify({ when : new Date().toISOString(), old : OLD, out, aborted, console : consoleLines }, null, 2));
process.exit(passed === out.checks.length && out.checks.length > 0 ? 0 : 1);
