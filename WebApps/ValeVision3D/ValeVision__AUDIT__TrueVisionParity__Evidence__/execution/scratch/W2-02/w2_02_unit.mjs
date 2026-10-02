// =============================================================================
// W2-02 scratch harness - the section adapter's six calls, in Node (not shipped)
// =============================================================================
// Loads the REAL Cross Sections tool and the REAL section adapter (live tree, or
// the staged copies at their live URLs with W202_STAGED=1) on a scratch scene: a
// 2 x 3 x 2 m box room standing on y = 0 and a 0.5 m plinth beside it. The
// renderer is a recorder (Node has no WebGL): it proves WHAT RenderDepthInto
// draws and with which renderer state; the pixel proof is w2_02_depth_browser.mjs.
//
//   node --import ./harness/register.mjs w2_02_unit.mjs            (live tree)
//   set W202_STAGED=1 & node --import ./harness/register.mjs ...   (staged copies)
//
// Reads only; writes nothing outside this folder (no file at all, in fact).
// =============================================================================

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const VV      = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/';
const VVM     = VV + '02__Src__AppModules/';
const ADAPTER = pathToFileURL(VVM + '40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js').href;
const TOOL    = pathToFileURL(VVM + '41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js').href;
const NAWEB   = 'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb';
const PIN     = 'b2aa9151';

// -----------------------------------------------------------------------------
// Results
// -----------------------------------------------------------------------------
const results = [];
function check(name, cond, detail) {
    results.push({ name, pass : !!cond, detail : detail === undefined ? '' : detail });
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

// -----------------------------------------------------------------------------
// Browser stand-ins the tool touches (window events, document, fetch, canvas)
// -----------------------------------------------------------------------------
const winEvents = new EventTarget();
globalThis.window = {
    addEventListener    : winEvents.addEventListener.bind(winEvents),
    removeEventListener : winEvents.removeEventListener.bind(winEvents),
    dispatchEvent       : winEvents.dispatchEvent.bind(winEvents),
    innerWidth : 1280, innerHeight : 800, devicePixelRatio : 1,
    setTimeout, clearTimeout
};
const ctx2d = new Proxy({}, { get : (t, k) => (k in t ? t[k] : () => {}), set : (t, k, v) => { t[k] = v; return true; } });
globalThis.document = {
    body          : { classList : { add() {}, remove() {} } },
    createElement : () => ({ width : 0, height : 0, getContext : () => ctx2d, style : {} })
};
const TOOL_CONFIG = readFileSync(VVM + '41__System__CrossSectionView/Na__CrossSectionView__Config.json', 'utf8');
globalThis.fetch = async (url) => {                                               // <-- The tool's config, read from disk as the page would fetch it
    if (String(url).endsWith('Na__CrossSectionView__Config.json')) return { ok : true, status : 200, json : async () => JSON.parse(TOOL_CONFIG) };
    return { ok : false, status : 404, json : async () => ({}) };
};
const warnings = [];
const realWarn = console.warn;
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); };
const realLog = console.log;
console.log = () => {};                                                           // <-- The tool narrates every section; quiet

// -----------------------------------------------------------------------------
// The recording renderer
// -----------------------------------------------------------------------------
function MakeRecorder() {
    const r = {
        calls : [], autoClear : true, localClippingEnabled : false, target : 'DEPTH-TARGET', throwOnce : false,
        domElement : { addEventListener() {}, removeEventListener() {}, style : {},
                       getBoundingClientRect : () => ({ left : 0, top : 0, width : 1280, height : 800 }) },
        getRenderTarget() { r.calls.push([ 'getRenderTarget' ]); return r.target; },
        setRenderTarget(t) { r.calls.push([ 'setRenderTarget', t ]); r.target = t; },
        clear(...a) { r.calls.push([ 'clear', ...a ]); },
        clearDepth() { r.calls.push([ 'clearDepth' ]); },
        clearColor() { r.calls.push([ 'clearColor' ]); },
        clearStencil() { r.calls.push([ 'clearStencil' ]); },
        render(object, camera) {
            r.calls.push([ 'render', object, camera, r.autoClear, r.target ]);
            if (r.throwOnce) { r.throwOnce = false; throw new Error('planted render failure'); }
        }
    };
    return r;
}

// -----------------------------------------------------------------------------
// Load the modules
// -----------------------------------------------------------------------------
const THREE   = await import('three');
const tool    = await import(TOOL);
const adapter = await import(ADAPTER);

const SIX = [ 'Na__DrawView__SectionAdapter__Serialize', 'Na__DrawView__SectionAdapter__Apply',
              'Na__DrawView__SectionAdapter__GetOutlineWidthPx', 'Na__DrawView__SectionAdapter__SetOutlineWidthPx',
              'Na__DrawView__SectionAdapter__SetModelRoot', 'Na__DrawView__SectionAdapter__RenderDepthInto' ];

// -----------------------------------------------------------------------------
// 0. Module shape: 13 + 6, the 13 equal to TrueVision3D's twin at the pin
// -----------------------------------------------------------------------------
const tvAdapter = execFileSync('git', [ '-C', NAWEB, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js' ]).toString('utf8');
const tvBlock   = tvAdapter.slice(tvAdapter.lastIndexOf('export {'));
const tvNames   = (tvBlock.match(/Na__DrawView__SectionAdapter__\w+/g) || []);
const vvNames   = Object.keys(adapter).sort();
check('0.1 TrueVision3D twin at the pin exports 13 names', tvNames.length === 13, tvNames.length);
check('0.2 adapter exports exactly 19 names (13 + 6)', vvNames.length === 19, vvNames.length);
check('0.3 every TrueVision3D twin name is exported', tvNames.every((n) => typeof adapter[n] === 'function'));
check('0.4 the six F.8 C25 names are exported, as functions', SIX.every((n) => typeof adapter[n] === 'function'));
check('0.5 nothing else is exported', same(vvNames, [ ...tvNames, ...SIX ].sort()), vvNames.filter((n) => !tvNames.includes(n) && !SIX.includes(n)));
check('0.6 the tool exports Na__CrossSection__RenderDepthInto', typeof tool.Na__CrossSection__RenderDepthInto === 'function');
check('0.7 the tool export list grew by exactly that one name (36)', Object.keys(tool).length === 36, Object.keys(tool).length);
// The consumers' import lines once W2-03 / W2-15 point them at the adapter resolve to this file
const fromRenderLayer = new URL('../40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js', pathToFileURL(VVM + '49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js')).href;
const fromSnapshot    = new URL('../../40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js', pathToFileURL(VVM + '51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js')).href;
check('0.8 49 RenderLayer\'s adapter specifier resolves to this file', fromRenderLayer === ADAPTER);
check('0.9 SnapshotRenderer\'s adapter specifier resolves to this file', fromSnapshot === ADAPTER);

// -----------------------------------------------------------------------------
// The scratch scene
// -----------------------------------------------------------------------------
const scene     = new THREE.Scene();
const modelRoot = new THREE.Group();
modelRoot.name  = 'Scratch__ModelRoot';
scene.add(modelRoot);
const room = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), new THREE.MeshStandardMaterial({ side : THREE.DoubleSide }));
room.position.set(0, 1.5, 0);                                                     // <-- 2 x 3 x 2 m, floor at y = 0, roof at 3 m
modelRoot.add(room);
const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), new THREE.MeshStandardMaterial());
plinth.position.set(2, 0.25, 0);                                                  // <-- Wholly below any 1.5 m cut: never capped
modelRoot.add(plinth);
modelRoot.updateMatrixWorld(true);
const camera   = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 20);
camera.position.set(0, 10, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
const controls = { enabled : true, target : new THREE.Vector3(), update() {} };
let invalidations = 0;
const pipelineRef = { current : { invalidateProfileLinesCache() { invalidations++; } } };
const renderer = MakeRecorder();

// Before Initialize, and before any section ever existed (no cap root yet)
check('1.1 RenderDepthInto before the tool is initialised: false, nothing drawn', adapter.Na__DrawView__SectionAdapter__RenderDepthInto(camera) === false && renderer.calls.length === 0);

tool.Na__CrossSection__Initialize(scene, camera, renderer, controls, pipelineRef, modelRoot);
await new Promise((resolve) => setTimeout(resolve, 0));                           // <-- The config fetch settles
check('1.2 RenderDepthInto with no cap root yet: false, nothing drawn', adapter.Na__DrawView__SectionAdapter__RenderDepthInto(camera) === false && renderer.calls.filter((c) => c[0] === 'render').length === 0);

// The author's own state: the tool on, their colours and 3.5 px width, two sections, a slice depth
tool.Na__CrossSection__ApplyProjectConfig({ CrossSection__Enabled : true, CrossSection__FillColor : '#aabbcc', CrossSection__LineColor : '#112233', CrossSection__LineWidthPx : 3.5 });
const idA = tool.Na__CrossSection__AddSectionFromHit(new THREE.Vector3(0.3, 1, 0), new THREE.Vector3(-1, 0, 0), 'UPRIGHT');
const idB = tool.Na__CrossSection__AddSectionFromHit(new THREE.Vector3(0, 2.2, 0), new THREE.Vector3(0, -1, 0), 'PLAN');
tool.Na__CrossSection__SetSectionGizmoVisible(idB, false);
tool.Na__CrossSection__SetSliceDepthM(1.2);
check('1.3 the author\'s scratch state stands (2 sections, 3.5 px)', idA !== null && idB !== null && tool.Na__CrossSection__GetSections().length === 2 && tool.Na__CrossSection__GetAppearance().lineWidthPx === 3.5);
const authorSnapshot = tool.Na__CrossSection__SerializeSections();

// -----------------------------------------------------------------------------
// 2. Serialize / Apply: the tool's own pair, around a 3D render
// -----------------------------------------------------------------------------
check('2.1 Serialize equals the tool\'s SerializeSections', same(adapter.Na__DrawView__SectionAdapter__Serialize(), tool.Na__CrossSection__SerializeSections()));
const sceneBinding = { gizmosVisible : true, sliceDepthM : null, sections : [ { name : 'Scene cut', mode : 'PLAN', normalXyz : [ 0, -1, 0 ], positionMm : -1800, enabled : true, gizmoVisible : true } ] };

function Render3dDirect() {                                                       // <-- VV SnapshotRenderer Render3d today (41 imports)
    const saved = tool.Na__CrossSection__SerializeSections();
    tool.Na__CrossSection__ApplySerializedSections(sceneBinding);               // <-- What posing a scene with its own cut does to the tool
    const during = tool.Na__CrossSection__SerializeSections();
    tool.Na__CrossSection__ApplySerializedSections(saved);
    return { during, after : tool.Na__CrossSection__SerializeSections() };
}
function Render3dAdapter() {                                                      // <-- The same through the adapter (what W2-15 lands)
    const saved = adapter.Na__DrawView__SectionAdapter__Serialize();
    tool.Na__CrossSection__ApplySerializedSections(sceneBinding);
    const during = adapter.Na__DrawView__SectionAdapter__Serialize();
    const applied = adapter.Na__DrawView__SectionAdapter__Apply(saved);
    return { during, applied, after : adapter.Na__DrawView__SectionAdapter__Serialize() };
}
const direct  = Render3dDirect();
tool.Na__CrossSection__ApplySerializedSections(authorSnapshot);
const through = Render3dAdapter();
check('2.2 a scene\'s cut really replaced the sections mid-render', direct.during.sections.length === 1 && through.during.sections.length === 1);
check('2.3 Apply answers true and the author\'s sections come back exactly', through.applied === true && same(through.after, authorSnapshot), through.after.sections.map((s) => s.name + '@' + s.positionMm));
check('2.4 the adapter path ends byte-identical to the direct path', same(through.after, direct.after));
check('2.5 Apply(null) / Apply(undefined) answer false and change nothing',
      adapter.Na__DrawView__SectionAdapter__Apply(null) === false && adapter.Na__DrawView__SectionAdapter__Apply(undefined) === false && same(tool.Na__CrossSection__SerializeSections(), authorSnapshot));

// -----------------------------------------------------------------------------
// 3. The outline width
// -----------------------------------------------------------------------------
const widths = () => tool.Na__CrossSection__GetClippingDiagnostics().perSection.map((s) => s.outlineWidthPx);
check('3.1 GetOutlineWidthPx equals the tool\'s appearance width', adapter.Na__DrawView__SectionAdapter__GetOutlineWidthPx() === tool.Na__CrossSection__GetAppearance().lineWidthPx && adapter.Na__DrawView__SectionAdapter__GetOutlineWidthPx() === 3.5);
check('3.2 SetOutlineWidthPx(4.25) answers true and every outline takes it', adapter.Na__DrawView__SectionAdapter__SetOutlineWidthPx(4.25) === true && tool.Na__CrossSection__GetAppearance().lineWidthPx === 4.25 && widths().every((w) => w === 4.25), widths());
const refused = [ NaN, undefined, null, 0, -2, 'abc', Infinity, {} ].map((v) => adapter.Na__DrawView__SectionAdapter__SetOutlineWidthPx(v));
check('3.3 a width that is not a positive number answers false and changes nothing', refused.every((r) => r === false) && tool.Na__CrossSection__GetAppearance().lineWidthPx === 4.25 && widths().every((w) => w === 4.25), refused);
check('3.4 a numeric string is read as the tool reads it', adapter.Na__DrawView__SectionAdapter__SetOutlineWidthPx('3') === true && tool.Na__CrossSection__GetAppearance().lineWidthPx === 3);
check('3.5 the tool keeps its 0.5 px floor', adapter.Na__DrawView__SectionAdapter__SetOutlineWidthPx(0.2) === true && tool.Na__CrossSection__GetAppearance().lineWidthPx === 0.5);
tool.Na__CrossSection__SetLineWidth(3.5);

// The Render2d section sequence exactly as VV's SnapshotRenderer runs it today, direct and through the adapter
function Render2dSection(useAdapter, order) {
    const get = () => useAdapter ? adapter.Na__DrawView__SectionAdapter__GetOutlineWidthPx() : tool.Na__CrossSection__GetAppearance().lineWidthPx;
    const set = (px) => useAdapter ? adapter.Na__DrawView__SectionAdapter__SetOutlineWidthPx(px) : tool.Na__CrossSection__SetLineWidth(px);
    let sectionWas = null;
    if (order === 'tv') sectionWas = get();                                      // <-- TrueVision3D reads it before anything (TV :877)
    adapter.Na__DrawView__SectionAdapter__SuspendLiveTool();
    if (order === 'vv') sectionWas = get();                                      // <-- VV reads it after the tool is parked (VV :563)
    set(1.25);                                                                    // <-- The viewport's Section Outline weight, before the cut is built
    adapter.Na__DrawView__SectionAdapter__UpsertHorizontalPlane('W2-02__Cut', 1500, null);
    adapter.Na__DrawView__SectionAdapter__SetActivePlane('W2-02__Cut');
    const cutWidth = widths();                                                    // <-- What the picture is drawn with
    adapter.Na__DrawView__SectionAdapter__RemovePlane('W2-02__Cut');
    if (order === 'tv' && sectionWas !== null) set(sectionWas);                  // <-- TV :956, before Release
    adapter.Na__DrawView__SectionAdapter__Release();
    if (order === 'vv' && sectionWas !== null) set(sectionWas);                  // <-- VV :597, after Release
    return { cutWidth, sectionWas, after : tool.Na__CrossSection__SerializeSections(), feature : tool.Na__CrossSection__IsFeatureEnabled() };
}
tool.Na__CrossSection__ApplySerializedSections(authorSnapshot);
const r2dDirect  = Render2dSection(false, 'vv');
tool.Na__CrossSection__ApplySerializedSections(authorSnapshot);
const r2dAdapter = Render2dSection(true, 'vv');
check('3.6 the drawing cut is drawn at the viewport weight (1.25 px) both ways', same(r2dDirect.cutWidth, [ 1.25 ]) && same(r2dAdapter.cutWidth, [ 1.25 ]), [ r2dDirect.cutWidth, r2dAdapter.cutWidth ]);
check('3.7 the 2D-render width sequence ends identical through the adapter', same(r2dAdapter, r2dDirect), { direct : r2dDirect.after.lineWidthPx, adapter : r2dAdapter.after.lineWidthPx });
tool.Na__CrossSection__ApplySerializedSections(authorSnapshot);
const r2dTvOrder = Render2dSection(true, 'tv');
const followUp = { vvOrderEndsAt : r2dAdapter.after.lineWidthPx, tvOrderEndsAt : r2dTvOrder.after.lineWidthPx, authorWidth : authorSnapshot.lineWidthPx };
tool.Na__CrossSection__ApplySerializedSections(authorSnapshot);

// -----------------------------------------------------------------------------
// 4. SetModelRoot: a no-op
// -----------------------------------------------------------------------------
const otherRoot = new THREE.Group();
const otherMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
otherRoot.add(otherMesh);
const diagBefore = tool.Na__CrossSection__GetClippingDiagnostics();
const snapBefore = tool.Na__CrossSection__SerializeSections();
const invBefore  = invalidations;
const smr1 = adapter.Na__DrawView__SectionAdapter__SetModelRoot(otherRoot);
const smr2 = adapter.Na__DrawView__SectionAdapter__SetModelRoot(null);
check('4.1 SetModelRoot answers false (nothing re-pointed)', smr1 === false && smr2 === false);
check('4.2 the tool still cuts the live model only', same(tool.Na__CrossSection__GetClippingDiagnostics(), diagBefore) && otherMesh.material.clippingPlanes === null, tool.Na__CrossSection__GetClippingDiagnostics().modelMaterialsClipped);
check('4.3 sections, appearance and caches untouched', same(tool.Na__CrossSection__SerializeSections(), snapBefore) && invalidations === invBefore);

// -----------------------------------------------------------------------------
// 5. RenderDepthInto: the cap root alone, into the bound target
// -----------------------------------------------------------------------------
adapter.Na__DrawView__SectionAdapter__SuspendLiveTool();                          // <-- A drawing takes the tool: the author's two sections are parked
const upserted = adapter.Na__DrawView__SectionAdapter__UpsertHorizontalPlane('W2-02__DepthCut', 1500, null);
adapter.Na__DrawView__SectionAdapter__SetActivePlane('W2-02__DepthCut');
const live = tool.Na__CrossSection__GetSections();
const cut  = tool.Na__CrossSection__GetSectionById(live[0] && live[0].id);
check('5.1 the drawing plan cut at 1500 mm is the one section cutting', upserted === true && live.length === 1 && !!cut);
tool.Na__CrossSection__SetSectionGizmoVisible(cut.id, true);                      // <-- Show its gizmo, so leaving it out is a real exclusion

const pos = cut.capMesh.geometry.getAttribute('position');
let onPlane = true; let area = 0;
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    if (Math.abs(a.y - 1.5) > 1e-9 || Math.abs(b.y - 1.5) > 1e-9 || Math.abs(c.y - 1.5) > 1e-9) onPlane = false;
    area += new THREE.Triangle(a, b, c).getArea();
}
check('5.2 the cap is the room\'s cut face: on the plane, the full 2 x 2 m section, nothing of the plinth', cut.capMesh.visible === true && pos.count > 0 && onPlane && Math.abs(area - 4) < 1e-6, { vertices : pos.count, area });

renderer.calls.length = 0; renderer.autoClear = true; renderer.target = 'DEPTH-TARGET';
const drew = adapter.Na__DrawView__SectionAdapter__RenderDepthInto(camera);
const renders = renderer.calls.filter((k) => k[0] === 'render');
const drawn   = renders.length ? renders[0][1] : null;
check('5.3 RenderDepthInto answers true and draws exactly once', drew === true && renders.length === 1, renderer.calls.map((k) => k[0]));
check('5.4 ... with the caller\'s camera', renders.length === 1 && renders[0][2] === camera);
check('5.5 ... with autoClear off during the draw', renders.length === 1 && renders[0][3] === false);
check('5.6 ... into the target the caller bound (no setRenderTarget, no clear)', renders.length === 1 && renders[0][4] === 'DEPTH-TARGET' && renderer.calls.every((k) => k[0] === 'render'), renderer.calls.map((k) => k[0]));
check('5.7 autoClear handed back as found (true)', renderer.autoClear === true);
check('5.8 what is drawn is the cap root', !!drawn && drawn.name === 'Na__CrossSectionView__CapRoot');
const drawnMeshes = []; if (drawn) drawn.traverse((o) => { if (o !== drawn) drawnMeshes.push(o); });
check('5.9 ... holding exactly the cut\'s fill and outline', same(drawnMeshes.map((o) => o.name).sort(), [ cut.capMesh.name, cut.outlineMesh.name ].sort()), drawnMeshes.map((o) => o.name));
const gizmoRoot = drawn && drawn.parent ? drawn.parent.children.find((o) => o.name === 'Na__CrossSectionView__GizmoRoot') : null;
let gizmoInside = false; if (drawn) drawn.traverse((o) => { if (/Gizmo/.test(o.name)) gizmoInside = true; });
check('5.10 the visible gizmo sits in the helper root beside it, never drawn', !!gizmoRoot && gizmoRoot.visible === true && cut.gizmoGroup.visible === true && cut.gizmoGroup.parent === gizmoRoot && !gizmoInside);
check('5.11 the model is not drawn by it (the caller drew the model already)', renders.every((k) => k[1] !== scene && k[1] !== modelRoot));

renderer.calls.length = 0; renderer.autoClear = false;
adapter.Na__DrawView__SectionAdapter__RenderDepthInto(camera);
check('5.12 autoClear handed back as found (false)', renderer.autoClear === false && renderer.calls.length === 1);

renderer.calls.length = 0; renderer.autoClear = true; renderer.throwOnce = true;
let threw = false;
try { adapter.Na__DrawView__SectionAdapter__RenderDepthInto(camera); } catch (e) { threw = /planted/.test(e.message); }
check('5.13 a failing draw still hands autoClear back (and the caller sees the error)', threw && renderer.autoClear === true);

renderer.calls.length = 0;
check('5.14 no camera: false, nothing drawn', adapter.Na__DrawView__SectionAdapter__RenderDepthInto(null) === false && adapter.Na__DrawView__SectionAdapter__RenderDepthInto(undefined) === false && renderer.calls.length === 0);

tool.Na__CrossSection__SetSectionEnabled(cut.id, false);                         // <-- The eye off: nothing cutting
renderer.calls.length = 0;
check('5.15 a section switched off cuts nothing, so nothing is drawn', adapter.Na__DrawView__SectionAdapter__RenderDepthInto(camera) === false && renderer.calls.length === 0);
tool.Na__CrossSection__SetSectionEnabled(cut.id, true);

adapter.Na__DrawView__SectionAdapter__RemovePlane('W2-02__DepthCut');
renderer.calls.length = 0;
check('5.16 a plain elevation (tool held, no plane): false, nothing drawn', adapter.Na__DrawView__SectionAdapter__RenderDepthInto(camera) === false && renderer.calls.length === 0);

adapter.Na__DrawView__SectionAdapter__Release();
check('5.17 Release hands the author\'s sections back exactly', same(tool.Na__CrossSection__SerializeSections(), authorSnapshot));

// -----------------------------------------------------------------------------
// 6. The overlay is untouched: it still clears depth and draws the whole overlay scene
// -----------------------------------------------------------------------------
renderer.calls.length = 0; renderer.autoClear = true;
const overlay = (await import(pathToFileURL(VVM + '05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js').href)).Na__SectionClipping__GetOverlayRenderer();
overlay(camera);
const ovRender = renderer.calls.find((k) => k[0] === 'render');
check('6.1 RenderOverlay unchanged: target null, clearDepth, the overlay scene', same(renderer.calls.map((k) => k[0]), [ 'setRenderTarget', 'clearDepth', 'render' ]) && renderer.calls[0][1] === null && ovRender && ovRender[1].name === 'Na__CrossSectionView__OverlayScene' && renderer.autoClear === true);

// -----------------------------------------------------------------------------
// Report
// -----------------------------------------------------------------------------
console.log = realLog; console.warn = realWarn;
const bad = warnings.filter((w) => /TrueVision3D|could not be registered|aborted/.test(w));
check('7.1 no unexpected warning (no [TrueVision3D, no failed cut)', bad.length === 0, bad);
const passed = results.filter((r) => r.pass).length;
for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.pass || r.detail === '' ? '' : '   -> ' + JSON.stringify(r.detail)));
console.log('');
console.log('modules : ' + (process.env.W202_STAGED === '1' ? 'STAGED copies at their live URLs' : 'live tree'));
console.log('follow-up (W2-15, information): the 2D-render width sequence in VV\'s order ends at ' + followUp.vvOrderEndsAt
            + ' px, in TrueVision3D\'s order at ' + followUp.tvOrderEndsAt + ' px; the author\'s own width is ' + followUp.authorWidth + ' px');
console.log('warnings seen (' + warnings.length + '): ' + JSON.stringify(warnings.slice(0, 6)));
console.log('RESULT: ' + passed + '/' + results.length + (passed === results.length ? ' PASS' : ' FAIL'));
process.exit(passed === results.length ? 0 : 1);
