// =============================================================================
// W2-02 scratch harness - RenderDepthInto in real WebGL, headless Chromium (not shipped)
// =============================================================================
// The acceptance item "RenderDepthInto fills a depth target with the cap faces of
// an active section and nothing else (unit check with a scratch scene)", proved on
// pixels. No server is started (the W1-26/W1-28 method): Chromium asks for
// http://vv.test/<path> and the route answers from D:\10_CoreLib__ValeCodebase\<path>
// (with --staged, this package's two files come from ./staged at their live paths).
// The test page itself is answered from memory. Every other request is aborted.
//
// The scratch scene, as the depth fog's pre-pass meets it (TV RenderLayer :465-479):
// a 2 x 3 x 2 m room on y = 0 and a 0.5 m plinth beside it, seen straight down by an
// orthographic camera (6 x 6 m, near 0.1, far 20, from y = 10). A drawing plan cut at
// 1500 mm is made through the section adapter; its gizmo is then made VISIBLE, so
// leaving it out of the depth is a real exclusion. Depth target exactly as TV's
// EnsureDepthTarget builds it (RGBA8 colour, FloatType DepthTexture, Nearest).
//   P1  model only                                   -> depth1
//   P2  model, then Adapter.RenderDepthInto(camera)  -> depth2   (the fog's order)
//   P3  model, then the tool's WHOLE overlay scene   -> depth3   (contrast: gizmos too)
//
//   node w2_02_depth_browser.mjs [--staged]      results: logs/depth_browser[__staged].json
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
const PAGE    = APP + '__w2_02_depth__.html';
const SCRATCH = dirname(fileURLToPath(import.meta.url));
const STAGED  = process.argv.includes('--staged');
const OVERLAY = STAGED ? {
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js'      : join(SCRATCH, 'staged', 'Na__DrawView__SectionAdapter__.js'),
    '02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js' : join(SCRATCH, 'staged', 'Na__CrossSectionView__SystemLogic.js')
} : {};
if (!existsSync(join(SCRATCH, 'logs'))) mkdirSync(join(SCRATCH, 'logs'));

const TYPES = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png' };

// -----------------------------------------------------------------------------
// The test page (answered from memory)
// -----------------------------------------------------------------------------
const PAGE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>W2-02 depth</title>
<script type="importmap">
{ "imports": {
    "three": "./04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.module.js",
    "three/addons/": "./04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/"
} }
</script></head><body style="margin:0;background:#fff">
<script type="module">
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import * as Tool from './02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js';
import * as Adapter from './02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js';

const out = { checks : [], info : {} };
const check = (name, pass, detail) => out.checks.push({ name, pass : !!pass, detail : detail === undefined ? '' : detail });
try {
    const W = 192, H = 192, NEAR = 0.1, FAR = 20, EYE = 10;
    const renderer = new THREE.WebGLRenderer({ antialias : false, alpha : true });
    renderer.setPixelRatio(1); renderer.setSize(W, H);
    document.body.appendChild(renderer.domElement);
    out.info.webgl2 = renderer.capabilities.isWebGL2 !== false;

    const scene = new THREE.Scene();
    const modelRoot = new THREE.Group(); modelRoot.name = 'Scratch__ModelRoot'; scene.add(modelRoot);
    const room = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), new THREE.MeshBasicMaterial({ color : 0xdddddd, side : THREE.DoubleSide }));
    room.position.set(0, 1.5, 0); modelRoot.add(room);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), new THREE.MeshBasicMaterial({ color : 0xbbbbbb }));
    plinth.position.set(2, 0.25, 0); modelRoot.add(plinth);
    modelRoot.updateMatrixWorld(true);

    const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, NEAR, FAR);
    camera.position.set(0, EYE, 0); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    const controls = { enabled : true, target : new THREE.Vector3(), update() {} };
    const pipelineRef = { current : { invalidateProfileLinesCache() {} } };

    Tool.Na__CrossSection__Initialize(scene, camera, renderer, controls, pipelineRef, modelRoot);
    await new Promise((r) => setTimeout(r, 150));                                  // <-- The tool's config fetch settles

    // A drawing takes the tool and cuts a plan at 1500 mm, through the adapter
    Adapter.Na__DrawView__SectionAdapter__SuspendLiveTool();
    const upserted = Adapter.Na__DrawView__SectionAdapter__UpsertHorizontalPlane('W2-02__DepthCut', 1500, null);
    Adapter.Na__DrawView__SectionAdapter__SetActivePlane('W2-02__DepthCut');
    const live = Tool.Na__CrossSection__GetSections();
    const cut  = Tool.Na__CrossSection__GetSectionById(live[0] && live[0].id);
    check('B.1 the drawing cut exists, one section, its cap built', upserted === true && live.length === 1 && cut && cut.capMesh.visible === true);
    Tool.Na__CrossSection__SetSectionGizmoVisible(cut.id, true);                  // <-- Make the gizmo visible: its exclusion is then real
    const overlayScene = cut.capMesh.parent.parent;
    check('B.2 the gizmo is visible and lives beside the cap root in the overlay scene',
          cut.gizmoGroup.visible === true && overlayScene && overlayScene.name === 'Na__CrossSectionView__OverlayScene' && cut.gizmoGroup.parent.parent === overlayScene);

    // The depth target, exactly as TrueVision3D's depth fog builds it
    const depthTarget = new THREE.WebGLRenderTarget(W, H, {
        minFilter : THREE.NearestFilter, magFilter : THREE.NearestFilter, format : THREE.RGBAFormat, type : THREE.UnsignedByteType,
        depthBuffer : true, stencilBuffer : false, depthTexture : new THREE.DepthTexture(W, H, THREE.FloatType)
    });
    const readTarget = new THREE.WebGLRenderTarget(W, H, { minFilter : THREE.NearestFilter, magFilter : THREE.NearestFilter, type : THREE.FloatType, depthBuffer : false });
    const copy = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms : { tDepth : { value : depthTarget.depthTexture } },
        vertexShader : 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader : 'uniform sampler2D tDepth; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tDepth, vUv).x, 0.0, 0.0, 1.0); }',
        depthTest : false, depthWrite : false
    }));
    const ReadDepth = () => {
        renderer.setRenderTarget(readTarget);
        renderer.autoClear = true;
        copy.render(renderer);
        const buf = new Float32Array(W * H * 4);
        renderer.readRenderTargetPixels(readTarget, 0, 0, W, H, buf);
        const d = new Float32Array(W * H);
        for (let i = 0; i < W * H; i++) d[i] = buf[i * 4];
        return d;
    };
    const Begin = () => {
        renderer.setRenderTarget(depthTarget);
        renderer.autoClear = true;
        renderer.setClearColor(0x000000, 0);
        renderer.clear(true, true, true);
        renderer.render(scene, camera);                                            // <-- The model, under its own (clipped) materials
    };

    // P1 - the model alone
    Begin();
    const depth1 = ReadDepth();

    // P2 - the model, then the cut faces through the adapter, exactly where the fog's pre-pass calls it
    Begin();
    const autoClearIn = renderer.autoClear;
    const drew = Adapter.Na__DrawView__SectionAdapter__RenderDepthInto(camera);
    const boundAfter = renderer.getRenderTarget();
    const autoClearOut = renderer.autoClear;
    const depth2 = ReadDepth();
    check('B.3 RenderDepthInto answers true, leaves the depth target bound and autoClear as found',
          drew === true && boundAfter === depthTarget && autoClearIn === true && autoClearOut === true, { drew, sameTarget : boundAfter === depthTarget, autoClearIn, autoClearOut });

    // P3 - contrast: the model, then the tool's whole overlay scene (caps AND gizmos), no clear
    Begin();
    renderer.autoClear = false;
    renderer.render(overlayScene, camera);
    renderer.autoClear = true;
    const depth3 = ReadDepth();
    const glError = renderer.getContext().getError();
    check('B.4 no WebGL error', glError === 0, glError);

    // Classify every pixel by the world point under its centre
    const toY = (d) => EYE - (NEAR + d * (FAR - NEAR));                         // <-- Orthographic depth is linear in distance
    const v = new THREE.Vector3();
    const px = 6 / W;                                                              // <-- Metres per pixel
    const band = 3 * px;                                                           // <-- The outline's fat line and the room's raster edge
    const stats = { interior : 0, band : 0, plinth : 0, empty : 0, interiorCapOk : 0, interiorFloorOk : 0, bandNearerOrSame : 0,
                    plinthSame : 0, emptySame : 0, emptyClear : 0, outsideDiffer : 0, gizmoOnly : 0, capYs : [], floorYs : [], plinthYs : [] };
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        v.set(((i + 0.5) / W) * 2 - 1, ((j + 0.5) / H) * 2 - 1, 0).unproject(camera);
        const k = j * W + i, d1 = depth1[k], d2 = depth2[k], d3 = depth3[k];
        const inRoom   = Math.abs(v.x) < 1 - band && Math.abs(v.z) < 1 - band;
        const nearRoom = Math.abs(v.x) < 1 + band && Math.abs(v.z) < 1 + band;
        const inPlinth = Math.abs(v.x - 2) < 0.4 - band && Math.abs(v.z) < 0.4 - band;
        const nearPlinth = Math.abs(v.x - 2) < 0.4 + band && Math.abs(v.z) < 0.4 + band;
        if (inRoom) {
            stats.interior++;
            if (Math.abs(toY(d2) - 1.5006) < 2e-3) stats.interiorCapOk++;           // <-- The cap sits 0.6 mm proud of the plane (CapOffsetMm)
            if (Math.abs(toY(d1) - 0) < 2e-3) stats.interiorFloorOk++;              // <-- Without it: the floor of the room behind the cut
            if (stats.capYs.length < 3) { stats.capYs.push(toY(d2)); stats.floorYs.push(toY(d1)); }
        } else if (nearRoom) {
            stats.band++;
            if (d2 <= d1) stats.bandNearerOrSame++;
        } else if (inPlinth) {
            stats.plinth++;
            if (d2 === d1) stats.plinthSame++;
            if (stats.plinthYs.length < 3) stats.plinthYs.push(toY(d1));
        } else if (!nearPlinth) {
            stats.empty++;
            if (d2 === d1) stats.emptySame++;
            if (d2 === 1) stats.emptyClear++;
            if (d3 !== d2) stats.gizmoOnly++;                                      // <-- Written by the overlay scene, i.e. by a gizmo, never by RenderDepthInto
        }
        if (!nearRoom && d2 !== d1) stats.outsideDiffer++;
    }
    out.info.stats = stats;
    check('B.5 inside the room, the model alone gives the floor behind the cut (y = 0)', stats.interior > 1000 && stats.interiorFloorOk === stats.interior, [ stats.interiorFloorOk, stats.interior ]);
    check('B.6 inside the room, RenderDepthInto gives the cut face ON the plane (y = 1.5006)', stats.interiorCapOk === stats.interior, [ stats.interiorCapOk, stats.interior ]);
    check('B.7 at the room edge (outline band) it only ever writes nearer', stats.bandNearerOrSame === stats.band, [ stats.bandNearerOrSame, stats.band ]);
    check('B.8 the plinth (no cut) keeps the model depth bit for bit: nothing cleared', stats.plinth > 50 && stats.plinthSame === stats.plinth, [ stats.plinthSame, stats.plinth ]);
    check('B.9 empty paper stays at the cleared depth: nothing else written', stats.empty > 1000 && stats.emptySame === stats.empty && stats.emptyClear === stats.empty, [ stats.emptySame, stats.emptyClear, stats.empty ]);
    check('B.10 away from the room nothing at all differs from the model-only depth', stats.outsideDiffer === 0, stats.outsideDiffer);
    check('B.11 the gizmo WOULD have written depth had the overlay scene been drawn (exclusion is real)', stats.gizmoOnly > 0, stats.gizmoOnly);

    // The same call with nothing cutting: a plain elevation
    Adapter.Na__DrawView__SectionAdapter__RemovePlane('W2-02__DepthCut');
    Begin();
    const drewPlain = Adapter.Na__DrawView__SectionAdapter__RenderDepthInto(camera);
    const depth4 = ReadDepth();
    Begin();                                                                       // <-- The same model render with no call at all
    const depth5 = ReadDepth();
    let plainDiffer = 0; for (let i = 0; i < W * H; i++) if (depth4[i] !== depth5[i]) plainDiffer++;
    check('B.12 a plain elevation (tool held, no plane): false, and not one depth value written', drewPlain === false && plainDiffer === 0, { drewPlain, plainDiffer });
    Adapter.Na__DrawView__SectionAdapter__Release();
    out.info.sectionsAfterRelease = Tool.Na__CrossSection__GetSections().length;
} catch (error) {
    check('B.0 the page ran', false, String(error && error.stack || error));
}
window.__W202 = out;
</script></body></html>`;

// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------
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
await page.waitForFunction(() => !!window.__W202, null, { timeout : 120000 });
const out = await page.evaluate(() => window.__W202);
await browser.close();

const passed = out.checks.filter((c) => c.pass).length;
for (const c of out.checks) console.log((c.pass ? 'PASS ' : 'FAIL ') + c.name + (c.pass || c.detail === '' ? '' : '   -> ' + JSON.stringify(c.detail)));
console.log('');
console.log('modules : ' + (STAGED ? 'STAGED copies at their live paths' : 'live tree') + '; served ' + served.size + ' files; aborted ' + aborted.length + (aborted.length ? ' ' + JSON.stringify(aborted) : ''));
console.log('info    : ' + JSON.stringify(out.info));
const errors = consoleLines.filter((l) => /^(error|pageerror)/.test(l));
console.log('console : ' + consoleLines.length + ' line(s), ' + errors.length + ' error(s)' + (errors.length ? ' ' + JSON.stringify(errors.slice(0, 5)) : ''));
console.log('RESULT: ' + passed + '/' + out.checks.length + (passed === out.checks.length && out.checks.length > 0 ? ' PASS' : ' FAIL'));
writeFileSync(join(SCRATCH, 'logs', 'depth_browser' + (STAGED ? '__staged' : '') + '.json'), JSON.stringify({ when : new Date().toISOString(), staged : STAGED, out, aborted, console : consoleLines }, null, 2));
process.exit(passed === out.checks.length && out.checks.length > 0 ? 0 : 1);
