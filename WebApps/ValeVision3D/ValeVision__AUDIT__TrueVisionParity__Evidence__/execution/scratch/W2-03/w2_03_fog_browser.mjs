// =============================================================================
// W2-03 scratch harness - the depth fog on pixels, real WebGL, headless Chromium (not shipped)
// =============================================================================
// The on-screen and image-export acceptance items, as far as a script can see them,
// through the LANDED RenderPreset.RenderFrame and TiledRenderer (no server is started:
// Chromium asks for http://vv.test/<path> and the route answers from the disk).
//
// The scratch elevation: a parallel camera looking north (-z) at a plane through z = 0,
// normal +z (the viewer's side), renderer flags as index.html's (logarithmic depth).
//   ROOM   x -3.5..-1.5, y 0..2, z -1..1  - cut by a real section through the adapter at
//          z = 0, so its poche is drawn by the Cross Sections tool's overlay
//   NEAR   x -3.5..-1.5, y 2.5..3.5, front face 0.3 m behind the plane   (before Depth)
//   MID    x -0.75..0.75, y 0..2, front face 2.75 m behind               (inside the fade)
//   FAR    x 1.5..3.5, y 0..2, front face 11 m behind                    (past End)
// Fog: Depth 1000, End 6000, Fall-off 50.
//
//   node w2_03_fog_browser.mjs          the landed files
//   node w2_03_fog_browser.mjs --old    RenderPreset and TiledRenderer served from their
//                                       PRE-IMAGES (backup/), fog-off scenarios only, so
//                                       the two runs' hashes prove "fog off is byte-identical"
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
const PAGE    = APP + '__w2_03_fog__.html';
const SCRATCH = dirname(fileURLToPath(import.meta.url));
const OLD     = process.argv.includes('--old');
const P_RP    = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js';
const P_TR    = '02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js';
const OVERLAY = OLD ? {
    [P_RP] : join(SCRATCH, 'backup', P_RP.split('/').join('__')),
    [P_TR] : join(SCRATCH, 'backup', P_TR.split('/').join('__'))
} : {};
if (!existsSync(join(SCRATCH, 'logs'))) mkdirSync(join(SCRATCH, 'logs'));

const TYPES = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png' };

const PAGE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>W2-03 fog</title>
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
import * as Thumb from './02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js';
import * as Row from './02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__DevMenu__Row__.js';

const OLD = ${OLD ? 'true' : 'false'};
const out = { checks : [], info : {}, hashes : {} };
const check = (name, pass, detail) => out.checks.push({ name, pass : !!pass, detail : detail === undefined ? '' : detail });
const Hash = (data) => { let h = 2166136261 >>> 0; for (let i = 0; i < data.length; i++) { h ^= data[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16) + ':' + data.length; };
try {
    const W = 160, H = 100;                                                         // <-- 20 px per metre
    const renderer = new THREE.WebGLRenderer({ antialias : false, alpha : true, stencil : true, depth : true, logarithmicDepthBuffer : true, preserveDrawingBuffer : true });
    renderer.setPixelRatio(1); renderer.setSize(W, H);
    document.body.appendChild(renderer.domElement);
    const gl = renderer.getContext();

    const scene = new THREE.Scene();
    const modelRoot = new THREE.Group(); modelRoot.name = 'Scratch__ModelRoot'; scene.add(modelRoot);
    const grey = new THREE.MeshBasicMaterial({ color : 0x404040 });
    const Box = (x0, x1, y0, y1, z0, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), grey); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); modelRoot.add(m); return m; };
    Box(-3.5, -1.5, 0, 2, -1, 1);                                                   // ROOM (cut)
    Box(-3.5, -1.5, 2.5, 3.5, -0.8, -0.3);                                          // NEAR
    Box(-0.75, 0.75, 0, 2, -3.5, -2.75);                                            // MID
    Box(1.5, 3.5, 0, 2, -12, -11);                                                  // FAR
    modelRoot.updateMatrixWorld(true);

    const ortho = new THREE.OrthographicCamera(-4, 4, 2.5, -2.5, 0.1, 40);
    ortho.position.set(0, 2, 20); ortho.lookAt(0, 2, 0); ortho.updateProjectionMatrix(); ortho.updateMatrixWorld(true);
    const persp = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    persp.position.set(6, 4, 18); persp.lookAt(0, 1, -2); persp.updateProjectionMatrix(); persp.updateMatrixWorld(true);
    const controls = { enabled : true, target : new THREE.Vector3(), update() {} };

    Tool.Na__CrossSection__Initialize(scene, persp, renderer, controls, { current : { invalidateProfileLinesCache() {} } }, modelRoot);
    await new Promise((r) => setTimeout(r, 200));                                   // <-- The tool's config fetch settles
    Adapter.Na__DrawView__SectionAdapter__SuspendLiveTool();
    Adapter.Na__DrawView__SectionAdapter__UpsertVerticalPlane('W2-03__Cut', 0, 1, 0, null);
    Adapter.Na__DrawView__SectionAdapter__SetActivePlane('W2-03__Cut');

    Fog.Na__ElevFog__Initialise({ renderer, scene });
    await new Promise((r) => setTimeout(r, 100));                                   // <-- The fog config fetch settles
    Preset.Na__DrawView__RenderPreset__Initialize({ renderer, scene, camera : persp, pipelineRef : { current : null } });
    Preset.Na__DrawView__RenderPreset__Enter({ camera : ortho, styles : {} });

    const FOG_ON  = { enabled : true,  startDepthMm : 1000, endDepthMm : 6000, falloffPercent : 50 };
    const FOG_OFF = { enabled : false, startDepthMm : 1000, endDepthMm : 6000, falloffPercent : 50 };
    const PLANE   = { normalX : 0, normalY : 0, normalZ : 1, distanceMm : 0 };
    const Source  = (s) => ({ getSettings : () => s, getPlane : () => PLANE });

    const Read = () => { const b = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
    const Px = (buf, x, y, w, h) => { const i = ((h - 1 - y) * w + x) * 4; return [ buf[i], buf[i + 1], buf[i + 2], buf[i + 3] ]; };  // <-- y from the top, GL rows bottom-up
    const ToPx = (wx, wy) => [ Math.round((wx + 4) * 20), Math.round((4.5 - wy) * 20) ];
    const Frame = (source, camera) => { Fog.Na__ElevFog__SetSource(source); renderer.setRenderTarget(null); const okay = Preset.Na__DrawView__RenderPreset__RenderFrame(camera); const px = Read(); Fog.Na__ElevFog__SetSource(null); return { okay, px }; };

    // SCREEN | RenderFrame, as the render loop's drawing branch and the card thumbnail call it
    const f0 = Frame(null);
    const f1 = Frame(Source(FOG_OFF));
    out.hashes.frameNull = Hash(f0.px);
    out.hashes.frameOff  = Hash(f1.px);
    check('S.1 RenderFrame draws (preset active, plain render route)', f0.okay === true);
    check('S.2 a drawing with its fog OFF: every pixel equal to no fog source at all', out.hashes.frameNull === out.hashes.frameOff);

    const samples = {};
    if (!OLD) {
        const f2 = Frame(Source(FOG_ON));
        const at = { cap : ToPx(-2.5, 1), near : ToPx(-2.5, 3), mid : ToPx(0, 1), far : ToPx(2.5, 1), paper : ToPx(0, 4) };
        for (const k of Object.keys(at)) samples[k] = { off : Px(f0.px, at[k][0], at[k][1], W, H), on : Px(f2.px, at[k][0], at[k][1], W, H) };
        out.info.samples = samples;
        const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
        check('S.3 the poche (the cut room, drawn by the section overlay AFTER the fog) stays solid', same(samples.cap.on, samples.cap.off) && samples.cap.off[0] < 250, samples.cap);
        check('S.4 a surface in front of Depth (0.3 m behind the plane) is untouched', same(samples.near.on, samples.near.off) && samples.near.off[0] < 100, samples.near);
        check('S.5 a surface inside the fade (2.75 m) is lifted part of the way to the paper', samples.mid.on[0] > samples.mid.off[0] + 20 && samples.mid.on[0] < 245, samples.mid);
        check('S.6 a surface past End (11 m) has faded into the paper', samples.far.on[0] >= 250 && samples.far.off[0] < 100, samples.far);
        check('S.7 empty paper stays paper', same(samples.paper.on, samples.paper.off) && samples.paper.off[0] >= 254, samples.paper);
        let changedOutside = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const wx = x / 20 - 4;
            const inMidFar = (wx > -0.9 && wx < 0.9) || (wx > 1.35 && wx < 3.65);
            const a = Px(f0.px, x, y, W, H), b = Px(f2.px, x, y, W, H);
            if (!inMidFar && (Math.abs(a[0] - b[0]) > 1 || Math.abs(a[1] - b[1]) > 1 || Math.abs(a[2] - b[2]) > 1)) changedOutside++;
        }
        check('S.8 nothing outside the two blocks behind Depth changes at all (cap, near block, paper)', changedOutside === 0, changedOutside);

        const p0 = Frame(null, persp);
        const p2 = Frame(Source(FOG_ON), persp);
        check('S.9 a perspective camera gets no fog (every pixel as without a source)', Hash(p0.px) === Hash(p2.px));
        out.info.glError = gl.getError();
        check('S.10 no WebGL error', out.info.glError === 0, out.info.glError);

        // CARD THUMBNAIL | the presentation thumbnail renderer, through the frame hook the preset registers on Enter
        Thumb.Na__PresentationMode__Thumbnail__SetRenderContext(renderer, scene, persp, () => null);
        Fog.Na__ElevFog__SetSource(Source(FOG_ON));
        const blob = await Thumb.Na__PresentationMode__Thumbnail__RenderCurrentViewportToWebp(W);
        const tpx = Read();                                                         // <-- The frame the card was captured from (preserveDrawingBuffer)
        Fog.Na__ElevFog__SetSource(null);
        const tFar = Px(tpx, ...ToPx(2.5, 1), W, H), tMid = Px(tpx, ...ToPx(0, 1), W, H), tCap = Px(tpx, ...ToPx(-2.5, 1), W, H);
        out.info.thumbnail = { blob : blob ? blob.size : null, far : tFar, mid : tMid, cap : tCap };
        check('T.1 the card thumbnail is captured from the fogged frame (far faded, mid lifted, poche solid)',
              !!blob && tFar[0] >= 250 && Math.abs(tMid[0] - samples.mid.on[0]) <= 1 && Math.abs(tCap[0] - samples.cap.off[0]) <= 1, out.info.thumbnail);

        // DEV ROW | built inert (W2-05 places it); read / write / onChanged as TrueVision's contract says
        let rec = { enabled : false, startDepthMm : 1000, endDepthMm : 15000, falloffPercent : 50 }, changes = 0;
        const row = Row.Na__ElevFogRow__Build({ read : () => rec, write : (p) => { rec = Object.assign({}, rec, p); return rec; }, onChanged : () => { changes++; } });
        const inputs = row ? row.element.querySelectorAll('input') : [];
        const buttons = row ? row.element.querySelectorAll('button') : [];
        let flow = null;
        if (row && inputs.length === 3 && buttons.length === 2) {
            buttons[1].click();                                                     // <-- On
            inputs[0].value = '2.5'; inputs[0].dispatchEvent(new KeyboardEvent('keydown', { key : 'm', bubbles : true, cancelable : true }));   // <-- metres into a mm box
            flow = { enabled : rec.enabled, start : rec.startDepthMm, changes, readout : row.element.querySelector('.na-depthfog-dev__readout').textContent };
        }
        out.info.devRow = { built : !!row, inputs : inputs.length, buttons : buttons.length, flow };
        check('D.1 the Dev row builds (caption, Off/On, three number boxes, readout) and writes through its accessors',
              !!row && inputs.length === 3 && buttons.length === 2 && flow && flow.enabled === true && flow.start === 2500 && flow.changes === 2 && /2500/.test(flow.readout), out.info.devRow);
    }

    // EXPORT | the tiled renderer with the preset's export overrides, as the image export calls it
    const Export = async (source) => {
        Fog.Na__ElevFog__SetSource(source);
        const overrides = Preset.Na__DrawView__RenderPreset__GetExportOverrides();
        let fogCalls = 0, overlayCalls = 0;
        if (overrides && typeof overrides.renderDepthFog === 'function') { const f = overrides.renderDepthFog; overrides.renderDepthFog = (c) => { fogCalls++; return f(c); }; }
        const ovl = Clip.Na__SectionClipping__GetOverlayRenderer();
        Clip.Na__SectionClipping__SetOverlayRenderer((c) => { overlayCalls++; ovl(c); });
        try {
            const res = await Tiled.Na__StaticExport__RenderToCanvas({ renderer, scene, camera : persp, getRenderPipelineState : () => null,
                                                                       elevationOverrides : overrides, targetWidth : 2 * W, targetHeight : 2 * H });
            const img = res.canvas.getContext('2d').getImageData(0, 0, res.width, res.height).data;
            return { img, w : res.width, h : res.height, fogCalls, overlayCalls };
        } finally {
            Clip.Na__SectionClipping__SetOverlayRenderer(ovl);
            Fog.Na__ElevFog__SetSource(null);
        }
    };
    const e0 = await Export(Source(FOG_OFF));
    out.hashes.exportOff = Hash(e0.img);
    out.info.exportOff = { w : e0.w, h : e0.h, fogCalls : e0.fogCalls, overlayCalls : e0.overlayCalls };
    check('E.1 an export of the drawing runs one tile with one section overlay', e0.overlayCalls === 1, out.info.exportOff);
    if (!OLD) {
        const eN = await Export(null);
        check('E.2 export with the fog OFF: every pixel equal to no fog source', Hash(eN.img) === out.hashes.exportOff);
        const e2 = await Export(Source(FOG_ON));
        const PxTop = (img, x, y, w) => { const i = (y * w + x) * 4; return [ img[i], img[i + 1], img[i + 2], img[i + 3] ]; };   // <-- 2D canvas rows top-down
        const at2 = (wx, wy) => [ Math.round((wx + 4) * 40), Math.round((4.5 - wy) * 40) ];
        const ex = {};
        for (const [ k, wx, wy ] of [ [ 'cap', -2.5, 1 ], [ 'near', -2.5, 3 ], [ 'mid', 0, 1 ], [ 'far', 2.5, 1 ], [ 'paper', 0, 4 ] ]) {
            const [ x, y ] = at2(wx, wy); ex[k] = { off : PxTop(e0.img, x, y, e0.w), on : PxTop(e2.img, x, y, e2.w) };
        }
        out.info.exportSamples = ex; out.info.exportOn = { fogCalls : e2.fogCalls, overlayCalls : e2.overlayCalls };
        const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
        check('E.3 the export raster carries the fog: far block faded, mid lifted, near and paper untouched',
              ex.far.on[0] >= 250 && ex.far.off[0] < 100 && ex.mid.on[0] > ex.mid.off[0] + 20 && same(ex.near.on, ex.near.off) && same(ex.paper.on, ex.paper.off), ex);
        check('E.4 ...and the poche stays solid (the section overlay drawn after the fog)', same(ex.cap.on, ex.cap.off), ex.cap);
        check('E.5 per tile: the fog drawn once and the section overlay once', e2.fogCalls === 1 && e2.overlayCalls === 1, out.info.exportOn);
        check('E.6 the export matches the screen (same fogged colours at the same points)', Math.abs(ex.mid.on[0] - samples.mid.on[0]) <= 3 && Math.abs(ex.far.on[0] - samples.far.on[0]) <= 1, { exportMid : ex.mid.on, screenMid : samples.mid.on });
    }
    Preset.Na__DrawView__RenderPreset__Exit();
    out.info.mode = OLD ? 'OLD (pre-image RenderPreset and TiledRenderer)' : 'landed';
} catch (error) {
    check('X.0 the page ran', false, String(error && error.stack || error));
}
window.__W203 = out;
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
await page.waitForFunction(() => !!window.__W203, null, { timeout : 180000 });
const out = await page.evaluate(() => window.__W203);
await browser.close();

const passed = out.checks.filter((c) => c.pass).length;
for (const c of out.checks) console.log((c.pass ? 'PASS ' : 'FAIL ') + c.name + (c.pass || c.detail === '' ? '' : '   -> ' + JSON.stringify(c.detail)));
console.log('');
console.log('mode    : ' + (out.info.mode || '?') + '; served ' + served.size + ' files; aborted ' + aborted.length + (aborted.length ? ' ' + JSON.stringify(aborted) : ''));
console.log('hashes  : ' + JSON.stringify(out.hashes));
console.log('info    : ' + JSON.stringify(out.info));
const errors = consoleLines.filter((l) => /^(error|pageerror)/.test(l));
console.log('console : ' + consoleLines.length + ' line(s), ' + errors.length + ' error(s)' + (errors.length ? ' ' + JSON.stringify(errors.slice(0, 5)) : ''));
console.log('RESULT: ' + passed + '/' + out.checks.length + (passed === out.checks.length && out.checks.length > 0 ? ' PASS' : ' FAIL'));
writeFileSync(join(SCRATCH, 'logs', 'fog_browser' + (OLD ? '__old' : '') + '.json'), JSON.stringify({ when : new Date().toISOString(), old : OLD, out, aborted, console : consoleLines }, null, 2));
process.exit(passed === out.checks.length && out.checks.length > 0 ? 0 : 1);
