// =============================================================================
// W2-15 scratch harness - the SnapshotRenderer before and after the hunk replay (not shipped)
// =============================================================================
// Loads BOTH copies of Na__LayoutEditor__SnapshotRenderer__.js side by side
// (?w215=old the pre-image, ?w215=new the candidate; W215_NEW=live swaps the
// candidate for the live file after landing) with every import a recording
// fake, except three, the REAL section adapter over the REAL Cross Sections
// tool on a scratch scene, and the REAL design-phase library, uninitialised
// (DR-09). W215_REAL_ENHANCE=1 also loads the REAL Enhance module, whose two
// effect calls are then recorded.
//
//   node --import ./harness/register.mjs w2_15_unit.mjs
//
// Part A: features off - every scenario renders the same calls in the same
//         order, the same picture state and the same end state, old vs new
//         (the declared differences are normalised and each one is checked
//         on its own in part B).
// Part B: each replayed TrueVision3D hunk, on the new copy.
// Writes nothing (results to stdout).
// =============================================================================

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/';
const VVM  = VV + '02__Src__AppModules/';
const SNAP = pathToFileURL(VVM + '51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js').href;
const NEW  = process.env.W215_NEW === 'live' ? 'live' : 'new';
const REAL_ENHANCE = process.env.W215_REAL_ENHANCE === '1';

// -----------------------------------------------------------------------------
// Results
// -----------------------------------------------------------------------------
const results = [];
function check(name, cond, detail) { results.push({ name, pass : !!cond, detail : detail === undefined ? '' : detail }); }
const J = (v) => JSON.stringify(v);

// -----------------------------------------------------------------------------
// Browser stand-ins
// -----------------------------------------------------------------------------
const winEvents = new EventTarget();
globalThis.window = {
    addEventListener    : winEvents.addEventListener.bind(winEvents),
    removeEventListener : winEvents.removeEventListener.bind(winEvents),
    dispatchEvent       : winEvents.dispatchEvent.bind(winEvents),
    innerWidth : 1280, innerHeight : 800, devicePixelRatio : 1, location : { hostname : 'localhost', search : '' },
    setTimeout, clearTimeout
};
const ctx2d = new Proxy({}, { get : (t, k) => (k in t ? t[k] : () => {}), set : (t, k, v) => { t[k] = v; return true; } });
globalThis.document = {
    body          : { classList : { add() {}, remove() {} } },
    createElement : () => ({ width : 0, height : 0, getContext : () => ctx2d, style : {} }),
    getElementById : () => null
};
const TOOL_CONFIG = readFileSync(VVM + '41__System__CrossSectionView/Na__CrossSectionView__Config.json', 'utf8');
globalThis.fetch = async (url) => {
    if (String(url).endsWith('Na__CrossSectionView__Config.json')) return { ok : true, status : 200, json : async () => JSON.parse(TOOL_CONFIG) };
    return { ok : false, status : 404, json : async () => ({}) };
};
const warnings = [];
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); };
const realLog = console.log;
console.log = () => {};

// -----------------------------------------------------------------------------
// The fakes: one stateful world both copies act on
// -----------------------------------------------------------------------------
const W = {
    calls : [], impl : {}, consts : { Na__PlView__KIND_PLAN : 'PLAN' },
    bind(mod, name) {
        if (name in this.consts) return this.consts[name];
        const self = this;
        return function (...args) {
            self.calls.push({ mod, name, args });
            const f = self.impl[name];
            return typeof f === 'function' ? f(...args) : f;
        };
    }
};
globalThis.__W215 = W;

const S = {};                                                                     // <-- The fake world's state
function ResetWorld() {
    W.calls.length = 0;
    S.visibility   = { ValeVision__MainBuildingModel__Existing : true, ValeVision__MainBuildingModel__Proposed : true, ValeVision__SiteBoundaries : true, ValeVision__GroundFloorFurniture : true, ValeVision__SceneEntourageSilhouette : true, ValeVision__Vegetation : true };
    S.lighting     = 'VIEWER-LIGHT';
    S.suspended    = false;
    S.fog          = null;
    S.edge         = { px : null, modifiers : null };
    S.pictures     = [];
    S.throwRender  = false;
    S.doors        = 'AS-3D';
    S.phaseRootMat = 'LIVE';
}
const usableFog = (s) => !!s && typeof s.getSettings === 'function' && typeof s.getPlane === 'function';
Object.assign(W.impl, {
    // Units, render loop
    Na__Math__ConvertMmToUnits : (mm) => mm / 1000,
    Na__Math__ConvertUnitsToMm : (u) => u * 1000,
    // Presets, transitions
    Na__DrawView__RenderPreset__GetExportOverrides : () => ({ tag : 'EXPORT-OVERRIDES' }),
    Na__DrawView__Transitions__IsSuspended : () => S.suspended,
    Na__DrawView__Transitions__SuspendThreeD : () => { S.suspended = true; },
    Na__DrawView__Transitions__ResumeThreeD  : () => { S.suspended = false; },
    // Records and camera setups
    Na__FpCfg__GetCameraSetup   : () => ({ heightAboveCutUnits : 10, nearUnits : 0.1, farUnits : 100 }),
    Na__FpData__GetCutHeightMm  : () => 1500,
    Na__FpData__GetViewDepthMm  : () => null,
    Na__FpData__GetSavedView    : () => ({ targetXMm : 100, targetZMm : 200 }),
    Na__ElevCfg__GetCameraSetup : () => ({ standOffUnits : 10, nearUnits : 0.1, farUnits : 100 }),
    Na__ElevData__GetAxes       : () => ({ rightX : 1, rightZ : 0, normalX : 0, normalZ : 1 }),
    Na__ElevData__IsSection     : (record) => !!(record && record.section),
    Na__ElevData__GetPlaneDistanceMm : () => 800,
    Na__ElevData__GetViewDepthMm     : () => null,
    Na__ElevData__GetSavedView       : () => ({ runMm : 50, heightMm : 1200 }),
    // Scene pose and the category registry
    Na__PresentationMode__Camera__ApplySceneCameraState : (camera) => { camera.position.set(9, 9, 9); camera.fov = 33; S.lighting = 'SCENE-LIGHT'; },
    Na__ModelToggle__CaptureVisibilityMap       : () => ({ ...S.visibility }),
    Na__ModelToggle__ApplySceneLayerVisibility  : (map) => { Object.keys(map || {}).forEach((k) => { if (k in S.visibility) S.visibility[k] = !!map[k]; }); },
    Na__ModelToggle__SetCategoryVisibility      : (k, v) => { if (k in S.visibility) S.visibility[k] = v; },
    Na__ModelToggle__SetCategoryVisibleByKey    : (k, v) => { if (!(k in S.visibility)) return false; S.visibility[k] = v !== false; return true; },
    Na__ModelToggle__GetCategoryKeys            : () => Object.keys(S.visibility),
    Na__ModelToggle__BorrowRegistry             : () => ({ token : 1 }),
    Na__ModelToggle__RestoreRegistry            : () => true,
    // The tiled renderer: what the picture was drawn with
    Na__StaticExport__RenderToCanvas : async (o) => {
        const frame = typeof o.renderFrame === 'function' ? o.renderFrame('TILE-CAMERA') : null;
        S.pictures.push({
            keys       : Object.keys(o).filter((k) => !(k === 'renderFrame' && o.renderFrame === null)).sort(),
            camera     : CamTag(o.camera), overrides : o.elevationOverrides === undefined ? 'absent' : o.elevationOverrides,
            routine    : typeof o.renderFrame === 'function' ? 'frame-routine' : (o.renderFrame === null || o.renderFrame === undefined ? 'composer' : 'other:' + typeof o.renderFrame),
            routineRan : frame, aa : o.antiAliasSamples, viewWindow : o.viewWindow === undefined ? 'absent' : o.viewWindow,
            w : o.targetWidth, h : o.targetHeight, pipelineOk : typeof o.getRenderPipelineState === 'function' && o.getRenderPipelineState() === pipelineRef.current,
            fog        : S.fog ? S.fog.name : null,
            lighting   : S.lighting, suspended : S.suspended, visibility : { ...S.visibility }, edge : { ...S.edge }, doors : S.doors,
            sections   : ToolState(), ortho : o.elevationOverrides ? null : null
        });
        if (S.throwRender) throw new Error('planted render failure');
        return { canvas : { tag : 'CANVAS', toDataURL : () => 'data:image/png;base64,W215' }, width : o.targetWidth, height : o.targetHeight };
    },
    // Folder 50
    Na__PlView__Hash       : (s) => 'h' + [ ...String(s) ].reduce((a, c) => ((a * 31) + c.charCodeAt(0)) >>> 0, 7).toString(16),
    Na__PlStage__Describe  : (root) => ({ Categories : [ { name : 'A', tris : 10 }, { name : 'B', tris : 5, stamp : 's1' } ], Fingerprint : 'pipe-fp:' + (root ? root.name : 'none') }),
    Na__PlDoors__Apply     : (root, pose, cut) => { S.doors = 'POSED:' + J(pose) + ':' + J(cut); return { tag : 'DOOR-HANDLE' }; },
    Na__PlDoors__Restore   : (h) => { if (h) S.doors = 'AS-3D'; },
    // Widths
    Na__LineworkSettings__SetLineworkBaseOverride : (px, modifiers) => { S.edge = { px : px === null ? null : px, modifiers : modifiers === undefined ? null : modifiers }; },
    // Fog layer
    Na__ElevFog__SetSource        : (s) => { const was = S.fog; S.fog = usableFog(s) ? s : null; return was; },
    Na__ElevFog__RenderLayerFrame : (cam) => 'fog-frame:' + cam,
    // Lighting
    Na__SceneLighting__GetLive       : () => S.lighting,
    Na__SceneLighting__Apply         : (l) => { S.lighting = l; },
    Na__SceneLighting__ApplyDefaults : () => { S.lighting = 'DEFAULT-LIGHT'; },
    // Enhance (fake mode) / its effects and setup (real mode)
    Na__LeEnhance__Apply           : async (canvas) => canvas,
    Na__LeCfg__GetEnhanceSetup     : () => ({ levelsBlack : 20, levelsWhite : 235, levelsGamma : 1.2, sharpenEnabled : true, sharpenOpacity : 1, sharpenRadius : 2, sharpenBlendMode : 'overlay' }),
    Na__PostProcess__ApplyLevels   : async () => {},
    Na__PostProcess__ApplyHighPassSharpen : async () => {},
    // Material preset
    Na__DrawView__MaterialPreset__SetModelRoot : (r) => { S.phaseRootMat = r ? r.name : null; }
});

// -----------------------------------------------------------------------------
// Load: three, the real tool and adapter, the real phase library, both copies
// -----------------------------------------------------------------------------
const THREE   = await import('three');
const tool    = await import(pathToFileURL(VVM + '41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js').href);
const adapter = await import(pathToFileURL(VVM + '40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js').href);
const phase   = await import(pathToFileURL(VVM + '26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js').href);
const OLD     = await import(SNAP + '?w215=old');
const CAND    = await import(SNAP + '?w215=' + NEW);

function CamTag(c) {
    if (!c) return null;
    if (typeof c === 'string') return c;
    const r = (v) => Math.round(v * 1e6) / 1e6;
    const t = { name : c.name || c.type, pos : c.position.toArray().map(r) };
    if (c.isOrthographicCamera) Object.assign(t, { l : r(c.left), rgt : r(c.right), top : r(c.top), b : r(c.bottom), near : c.near, far : c.far, up : c.up.toArray().map(r), q : c.quaternion.toArray().map(r) });
    return t;
}
function ToolState() {
    const snap = tool.Na__CrossSection__SerializeSections();
    const diag = tool.Na__CrossSection__GetClippingDiagnostics();
    return { lineWidthPx : tool.Na__CrossSection__GetAppearance().lineWidthPx, sections : snap.sections.length, outlineWidths : diag.perSection.map((s) => s.outlineWidthPx), snapshot : snap };
}

// -----------------------------------------------------------------------------
// The scratch scene, the real tool and the author's sections
// -----------------------------------------------------------------------------
const scene     = new THREE.Scene();
const modelRoot = new THREE.Group(); modelRoot.name = 'LIVE-ROOT';
scene.add(modelRoot);
const room = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), new THREE.MeshStandardMaterial({ side : THREE.DoubleSide }));
room.position.set(0, 1.5, 0); modelRoot.add(room); modelRoot.updateMatrixWorld(true);
const camera   = new THREE.PerspectiveCamera(50, 1.5, 0.1, 100); camera.name = 'MAIN'; camera.position.set(1, 2, 3);
const controls = { enabled : true, target : new THREE.Vector3(0, 1, 0), update() {} };
let invalidations = 0;
const pass = { enabled : true };
const pipelineRef = { current : { profileLinesPassRef : pass, invalidateProfileLinesCache() { invalidations++; } } };
const recorder = { autoClear : true, localClippingEnabled : false, domElement : { addEventListener() {}, removeEventListener() {}, style : {}, getBoundingClientRect : () => ({ left : 0, top : 0, width : 1280, height : 800 }) },
                   getRenderTarget() { return null; }, setRenderTarget() {}, clear() {}, render() {} };
tool.Na__CrossSection__Initialize(scene, camera, recorder, controls, pipelineRef, modelRoot);
await new Promise((r) => setTimeout(r, 0));

function AuthorState(widthPx) {
    tool.Na__CrossSection__ApplyProjectConfig({ CrossSection__Enabled : true, CrossSection__FillColor : '#aabbcc', CrossSection__LineColor : '#112233', CrossSection__LineWidthPx : widthPx });
    tool.Na__CrossSection__ApplySerializedSections({ gizmosVisible : true, sliceDepthM : null, lineWidthPx : widthPx, sections : [
        { name : 'Author cut A', mode : 'UPRIGHT', normalXyz : [ -1, 0, 0 ], positionMm : 300, enabled : true, gizmoVisible : true },
        { name : 'Author cut B', mode : 'PLAN', normalXyz : [ 0, -1, 0 ], positionMm : -2200, enabled : true, gizmoVisible : false } ] });
    tool.Na__CrossSection__SetLineWidth(widthPx);
    return tool.Na__CrossSection__SerializeSections();
}

const ctx = { renderer : recorder, scene, camera, controls, pipelineRef, modelRoot };
check('0.1 both copies initialise', OLD.Na__LeSnap__Initialize(ctx) === true && CAND.Na__LeSnap__Initialize(ctx) === true);
check('0.2 the new copy exports exactly the old copy\'s 11 names (no TrueVision3D-only SetModelEdgeWidth pair)', J(Object.keys(CAND).sort()) === J(Object.keys(OLD).sort()) && Object.keys(CAND).length === 11, Object.keys(CAND));
check('0.3 the design-phase library is uninitialised (nothing live but the live model)', phase.Na__PhaseLib__IsLive(undefined) === true && phase.Na__PhaseLib__IsLive(null) === true && phase.Na__PhaseLib__GetReadyEntry('any') === null);

// -----------------------------------------------------------------------------
// Running one scenario on one copy
// -----------------------------------------------------------------------------
function Arg(v) {
    if (v === undefined) return '<undef>';
    if (typeof v === 'function') return '<fn>';
    if (v && v.isCamera) return CamTag(v);
    if (v && v.isObject3D) return 'OBJ:' + v.name;
    if (v && v.tag) return v.tag;
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype) {
        const o = {}; Object.keys(v).forEach((k) => { o[k] = Arg(v[k]); }); return o;   // <-- Each copy frames its OWN ortho camera: compared by what it is, not its uuid
    }
    return v;
}
function Normalise(calls) {
    const out = [];
    calls.forEach((c) => {
        let name = c.name; let args = c.args.map(Arg);
        if (c.mod === 'Na__ElevationDepthFog__RenderLayer__.js') return;                                  // <-- B checks the fog borrow on its own
        if (name === 'Na__PlDoors__Restore' && c.args[0] == null) return;                                 // <-- Restore(null) is a no-op (B checks)
        if (name === 'Na__ModelToggle__SetCategoryVisibility' && c.args[1] === false && c.args[2] === true) return;   // <-- The hides: compared by what the picture and the end state hold (B8-B10 check the calls)
        if (name === 'Na__ModelToggle__SetCategoryVisibleByKey' && c.args[1] === false) return;
        if (name === 'Na__ModelToggle__GetCategoryKeys') return;
        if (name === 'Na__LeEnhance__Apply' && c.args.length > 1 && c.args[1] == null) args = args.slice(0, 1);       // <-- none = full strength (Enhance 1.1.0)
        if (name === 'Na__LineworkSettings__SetLineworkBaseOverride' && c.args.length > 1 && c.args[1] === undefined) args = args.slice(0, 1);
        if (name === 'Na__StaticExport__RenderToCanvas' && args[0] && args[0].renderFrame === null) { const o = { ...args[0] }; delete o.renderFrame; args = [ o ]; }   // <-- renderFrame null is the tiled renderer's own default: the composer route (TiledRenderer 1.6.0 :324, :332; W2-12 3A.8)
        out.push({ name, args });
    });
    return out;
}
function FirstDiff(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (J(a[i]) !== J(b[i])) return { at : i, old : a[i], new : b[i], oldLen : a.length, newLen : b.length };
    return null;
}
function WithoutEdgeClears(seq) { return seq.filter((c) => !(c.name === 'Na__LineworkSettings__SetLineworkBaseOverride' && c.args[0] === null)); }
function EndState() {
    return { visibility : { ...S.visibility }, lighting : S.lighting, suspended : S.suspended, fog : S.fog ? S.fog.name : null, edge : { ...S.edge }, doors : S.doors,
             pass : pass.enabled, camera : CamTag(camera), target : controls.target.toArray(), tool : ToolState(),
             adapterCutting : adapter.Na__DrawView__SectionAdapter__IsCutting(), activePlane : adapter.Na__DrawView__SectionAdapter__GetActivePlaneId() };
}
async function Run(mod, scenario, authorWidth) {
    const author = AuthorState(authorWidth);
    ResetWorld();
    if (scenario.before) scenario.before();
    camera.position.set(1, 2, 3); camera.fov = 50; camera.zoom = 1; camera.quaternion.set(0, 0, 0, 1); camera.updateProjectionMatrix();
    controls.target.set(0, 1, 0); pass.enabled = scenario.passOn !== false;
    const inv0 = invalidations;
    const result = await scenario.run(mod);
    return { result, calls : W.calls.slice(), norm : Normalise(W.calls), pictures : S.pictures.slice(), end : EndState(), author, invalidations : invalidations - inv0 };
}

// -----------------------------------------------------------------------------
// Scenarios
// -----------------------------------------------------------------------------
const planDef = { Kind : 'PLAN', Record : { id : 'fp1' }, Cut : { HeightMm : 1500 } };
const elevDef = { Kind : 'ELEVATION', Record : { id : 'el1' } };
const sectDef = { Kind : 'ELEVATION', Record : { id : 'se1', section : true } };
const win     = { CentreX : 120, CentreY : -900, WidthMm : 4000, HeightMm : 3000 };
const scene1  = { id : 'scene-1', name : 'Front' };
const fogged  = { name : 'ELEVATION-ON-SCREEN', getSettings : () => ({}), getPlane : () => ({}) };

const OFF = [
    { id : 'A1', label : '2D plan, no weights, no styles', run : (m) => m.Na__LeSnap__Render2d(planDef, win, null, 800, 600, null, 1, null, null) },
    { id : 'A2', label : '2D elevation, Enhance, all three widths, context off, a Model Layers hide', run : (m) => m.Na__LeSnap__Render2d(elevDef, win, { enhanceWhitecard : true, contextLayer : false, profileLinework : true }, 1200.4, 900.6, { ValeVision__GroundFloorFurniture : false, ValeVision__Unloaded : false, ValeVision__SiteBoundaries : true }, 4, { profilePx : 1.5, sectionPx : 1.25, modelEdgePx : 0.8 }, null) },
    { id : 'A3', label : '2D section cut, section weight only, 4x AA', run : (m) => m.Na__LeSnap__Render2d(sectDef, win, { enhanceWhitecard : false }, 640, 480, null, 4, { sectionPx : 3 }, null, () => true) },
    { id : 'A4', label : '2D plan whose render throws', before : () => { S.throwRender = true; }, run : (m) => m.Na__LeSnap__Render2d(planDef, win, { enhanceWhitecard : true }, 400, 300, null, 1, { modelEdgePx : 2, sectionPx : 2 }, null) },
    { id : 'A5', label : '2D plan nobody wants any more', run : (m) => m.Na__LeSnap__Render2d(planDef, win, null, 400, 300, null, 1, null, null, () => false) },
    { id : 'A6', label : '2D elevation with the 3D suspension already on', before : () => { S.suspended = true; }, run : (m) => m.Na__LeSnap__Render2d(elevDef, win, {}, 400, 300, null, 1, { profilePx : 0, sectionPx : -1, modelEdgePx : NaN }, null) },
    { id : 'A7', label : '3D scene, Enhance, edge weight, profile off, view window, Model Layers', passOn : true, run : (m) => m.Na__LeSnap__Render3d(scene1, { enhanceWhitecard : true, profileLinework : false, contextLayer : false }, 1000, 700, { ValeVision__Vegetation : false }, 4, { modelEdgePx : 1.75 }, null, { u0 : 0.1, v0 : 0.2, u1 : 0.9, v1 : 1.1 }, () => true) },
    { id : 'A8', label : '3D scene, no weights, pass off before', passOn : false, run : (m) => m.Na__LeSnap__Render3d(scene1, null, 300, 200, null, 1, null, null, null) },
    { id : 'A9', label : '3D scene whose render throws', before : () => { S.throwRender = true; }, run : (m) => m.Na__LeSnap__Render3d(scene1, { enhanceWhitecard : true }, 300, 200, null, 1, { modelEdgePx : 1 }, null, null) },
    { id : 'A10', label : '3D scene nobody wants any more', run : (m) => m.Na__LeSnap__Render3d(scene1, null, 300, 200, null, 1, null, null, null, () => false) }
];

// -----------------------------------------------------------------------------
// Part A: features off, old vs new
// -----------------------------------------------------------------------------
for (const width of [ 2, 3.5 ]) {
    for (const sc of OFF) {
        const o = await Run(OLD, sc, width);
        const n = await Run(CAND, sc, width);
        const tag = sc.id + ' [author ' + width + ' px] ' + sc.label;
        check(tag + ': same result', J(o.result) === J(n.result), [ o.result, n.result ]);
        check(tag + ': same calls in the same order (line-width clears aside)', J(WithoutEdgeClears(o.norm)) === J(WithoutEdgeClears(n.norm)), FirstDiff(WithoutEdgeClears(o.norm), WithoutEdgeClears(n.norm)));
        check(tag + ': same line-width clears', J(o.norm.filter((c) => !WithoutEdgeClears([ c ]).length)) === J(n.norm.filter((c) => !WithoutEdgeClears([ c ]).length)));
        check(tag + ': the picture is drawn with exactly the same state', J(o.pictures) === J(n.pictures), { old : o.pictures, new : n.pictures });
        const sameEnd = J(o.end) === J(n.end);
        if (width === 2 || !/^A[1-6]$/.test(sc.id) || sc.id === 'A5' || !/sectionPx/.test(sc.run.toString())) {
            check(tag + ': the same end state', sameEnd, sameEnd ? '' : { old : o.end, new : n.end });
        } else {
            // A 2D render with a Section Outline weight on a project whose own width differs from the
            // drawing width: the declared fix (TV's order). Everything else must still match.
            const oe = { ...o.end, tool : { ...o.end.tool, lineWidthPx : 'x', outlineWidths : 'x', snapshot : { ...o.end.tool.snapshot, lineWidthPx : 'x' } } };
            const ne = { ...n.end, tool : { ...n.end.tool, lineWidthPx : 'x', outlineWidths : 'x', snapshot : { ...n.end.tool.snapshot, lineWidthPx : 'x' } } };
            check(tag + ': the same end state but the outline width', J(oe) === J(ne));
            check(tag + ': the author\'s own width comes back (new), where the old order left the drawing\'s', n.end.tool.lineWidthPx === 3.5 && n.end.tool.outlineWidths.every((w) => w === 3.5) && J(n.end.tool.snapshot) === J(n.author),
                  { oldEndsAt : o.end.tool.lineWidthPx, newEndsAt : n.end.tool.lineWidthPx, author : 3.5 });
        }
        check(tag + ': the author\'s sections are back', J(n.end.tool.snapshot.sections) === J(n.author.sections) && n.end.adapterCutting === o.end.adapterCutting);
        check(tag + ': no extra profile-line cache drop (no design phase staged)', n.invalidations === o.invalidations, [ o.invalidations, n.invalidations ]);
    }
}

// Fingerprints and the model root, old vs new
{
    ResetWorld();
    const pairs = [ [ 'GetModelFingerprint', [] ], [ 'GetModelFingerprint', [ null ] ], [ 'GetModelFingerprint', [ undefined ] ], [ 'GetPipelineFingerprint', [] ], [ 'GetPipelineFingerprint', [ null ] ], [ 'GetModelRoot', [] ], [ 'GetModelRoot', [ null ] ] ];
    OLD.Na__LeSnap__ResetFingerprints(); CAND.Na__LeSnap__ResetFingerprints();
    pairs.forEach(([ fn, args ]) => {
        const a = OLD['Na__LeSnap__' + fn](...args); const b = CAND['Na__LeSnap__' + fn](...args);
        check('A.F ' + fn + '(' + args.map(String).join(',') + ') answers as before', J(Arg(a)) === J(Arg(b)), [ Arg(a), Arg(b) ]);
    });
    const describesOld = W.calls.filter((c) => c.name === 'Na__PlStage__Describe').length;
    check('A.F the fingerprints are cached as before (two model walks per copy, then none)', describesOld === 4, describesOld);
    check('A.F DrawingCentreMm answers as before (plan, elevation)', J(OLD.Na__LeSnap__DrawingCentreMm(planDef)) === J(CAND.Na__LeSnap__DrawingCentreMm(planDef)) && J(OLD.Na__LeSnap__DrawingCentreMm(elevDef)) === J(CAND.Na__LeSnap__DrawingCentreMm(elevDef)));
    let fired = []; window.addEventListener(CAND.Na__LeSnap__QUEUE_EVENT, (e) => fired.push(e.detail.outstanding));
    check('A.F the queue event name is unchanged', CAND.Na__LeSnap__QUEUE_EVENT === OLD.Na__LeSnap__QUEUE_EVENT && CAND.Na__LeSnap__QUEUE_EVENT === 'na-layouteditor-snapshot-queue');
}

// -----------------------------------------------------------------------------
// Part B: the replayed hunks, on the new copy
// -----------------------------------------------------------------------------
function IndexOf(calls, pred, from = 0) { for (let i = from; i < calls.length; i++) if (pred(calls[i])) return i; return -1; }
const N = (name) => (c) => c.name === name;

// B1 - depth fog: an underlay is never fogged, and the source is handed back
for (const mod of [ [ 'old', OLD ], [ 'new', CAND ] ]) {
    const r = await Run(mod[1], { before : () => { S.fog = fogged; }, run : (m) => m.Na__LeSnap__Render2d(elevDef, win, { enhanceWhitecard : true }, 400, 300, null, 1, null, null) }, 2);
    if (mod[0] === 'old') check('B1.0 (contrast) the OLD copy draws the underlay with the on-screen elevation\'s fog in the fog layer', r.pictures[0].fog === 'ELEVATION-ON-SCREEN');
    else {
        check('B1.1 the new copy draws the underlay with NO fog source (underlay unfogged)', r.pictures[0].fog === null && r.pictures[0].routine === 'composer');
        check('B1.2 ... and hands the on-screen elevation its fog back afterwards', r.end.fog === 'ELEVATION-ON-SCREEN');
        const sets = r.calls.filter(N('Na__ElevFog__SetSource'));
        check('B1.3 ... borrowing it exactly once (null in, the old source back)', sets.length === 2 && sets[0].args[0] === null && sets[1].args[0] === fogged);
    }
}
{   // B1.4 a throwing underlay still hands the fog back
    const r = await Run(CAND, { before : () => { S.fog = fogged; S.throwRender = true; }, run : (m) => m.Na__LeSnap__Render2d(planDef, win, null, 400, 300, null, 1, null, null) }, 2);
    check('B1.4 a failing underlay render still hands the fog source back', r.result === null && r.end.fog === 'ELEVATION-ON-SCREEN' && warnings.some((w) => w.indexOf('[ValeVision3D LayoutEditor] 2D underlay render failed') === 0));
}
{   // B2 - the fog image
    const src = { name : 'VIEWPORT-FOG', getSettings : () => ({}), getPlane : () => ({}) };
    const r = await Run(CAND, { before : () => { S.fog = fogged; }, run : (m) => m.Na__LeSnap__Render2d(elevDef, win, { enhanceWhitecard : true, contextLayer : false }, 400, 300, { ValeVision__GroundFloorFurniture : false }, 4, { modelEdgePx : 0.6, sectionPx : 1.1, enhancePct : 40 }, null, null, src) }, 2);
    const p = r.pictures[0] || {};
    check('B2.1 a depth fog source renders the fog image (no longer answered null)', r.result && r.result.dataUrl === 'data:image/png;base64,W215');
    check('B2.2 ... through the tiled renderer\'s frame routine route, RenderLayerFrame per tile camera', p.routine === 'frame-routine' && p.routineRan === 'fog-frame:TILE-CAMERA');
    check('B2.3 ... with the viewport\'s fog source in the fog layer while it draws', p.fog === 'VIEWPORT-FOG');
    check('B2.4 ... through the same main camera and export overrides as the picture (DIV-1)', J(p.camera) === J(CamTag(camera)) && p.overrides && p.overrides.tag === 'EXPORT-OVERRIDES');
    check('B2.5 ... the same hides, widths and lighting as the picture', p.visibility.ValeVision__GroundFloorFurniture === false && p.visibility.ValeVision__SiteBoundaries === false && p.edge.px === 0.6 && p.lighting === 'DEFAULT-LIGHT');
    check('B2.6 ... and no Enhance pass on a fog image', r.calls.filter(N('Na__LeEnhance__Apply')).length === 0);
    check('B2.7 ... and the on-screen source is handed back', r.end.fog === 'ELEVATION-ON-SCREEN');
    const r2 = await Run(CAND, { before : () => { S.throwRender = true; }, run : (m) => m.Na__LeSnap__Render2d(elevDef, win, null, 400, 300, null, 1, null, null, null, src) }, 2);
    check('B2.8 a failing fog image says so in ValeVision3D\'s prefix and answers null', r2.result === null && warnings.some((w) => w.indexOf('[ValeVision3D LayoutEditor] 2D depth fog layer render failed') === 0));
}
if (!REAL_ENHANCE) {   // B3 - Enhance strength on both paths (the real-Enhance run proves the same through the pass itself, part C)
    const r2 = await Run(CAND, { run : (m) => m.Na__LeSnap__Render2d(planDef, win, { enhanceWhitecard : true }, 400, 300, null, 1, { enhancePct : 40 }, null) }, 2);
    const r3 = await Run(CAND, { run : (m) => m.Na__LeSnap__Render3d(scene1, { enhanceWhitecard : true }, 400, 300, null, 1, { enhancePct : 0, modelEdgePx : 1 }, null, null) }, 2);
    const e2 = r2.calls.filter(N('Na__LeEnhance__Apply')); const e3 = r3.calls.filter(N('Na__LeEnhance__Apply'));
    check('B3.1 Render2d hands Enhance the viewport\'s enhancePct (40)', e2.length === 1 && e2[0].args[1] === 40 && e2[0].args[0].tag === 'CANVAS');
    check('B3.2 Render3d hands Enhance the viewport\'s enhancePct (0)', e3.length === 1 && e3[0].args[1] === 0);
    const r4 = await Run(CAND, { run : (m) => m.Na__LeSnap__Render2d(planDef, win, { enhanceWhitecard : false }, 400, 300, null, 1, { enhancePct : 40 }, null) }, 2);
    check('B3.3 no Enhance when the style is off, whatever the strength', r4.calls.filter(N('Na__LeEnhance__Apply')).length === 0);
}
{   // B4 - the nested linework modifier rules
    const mods = [ { TagName : 'ValeVision__LineworkModifier__FineDetail', hidden : false, widthFactor : 0.5, hex : '#333333' } ];
    const r2 = await Run(CAND, { run : (m) => m.Na__LeSnap__Render2d(planDef, win, null, 400, 300, null, 1, { modelEdgePx : 0.9, modifiers : mods }, null) }, 2);
    const r3 = await Run(CAND, { run : (m) => m.Na__LeSnap__Render3d(scene1, null, 400, 300, null, 1, { modelEdgePx : 1.2, modifiers : mods }, null, null) }, 2);
    check('B4.1 Render2d hands LineworkSettings the edge width AND the rules', r2.pictures[0].edge.px === 0.9 && r2.pictures[0].edge.modifiers === mods);
    check('B4.2 Render3d likewise', r3.pictures[0].edge.px === 1.2 && r3.pictures[0].edge.modifiers === mods);
    check('B4.3 both clear the override (rules included) afterwards', r2.end.edge.px === null && r2.end.edge.modifiers === null && r3.end.edge.px === null && r3.end.edge.modifiers === null);
    const r5 = await Run(CAND, { run : (m) => m.Na__LeSnap__Render2d(planDef, win, null, 400, 300, null, 1, { modifiers : mods }, null) }, 2);
    check('B4.4 rules without an edge width set nothing (as TrueVision3D: no width, no modifier pass)', r5.calls.filter(N('Na__LineworkSettings__SetLineworkBaseOverride')).length === 0);
    // TrueVision3D's order: the widths are handed back after the presets exit
    const c2 = r2.calls; const c3 = r3.calls;
    const clear2 = IndexOf(c2, (c) => c.name === 'Na__LineworkSettings__SetLineworkBaseOverride' && c.args[0] === null);
    check('B4.5 Render2d clears the widths after the material and render presets exit (TrueVision3D :950-:952)', clear2 > IndexOf(c2, N('Na__DrawView__RenderPreset__Exit')) && IndexOf(c2, N('Na__DrawView__RenderPreset__Exit')) > IndexOf(c2, N('Na__DrawView__MaterialPreset__Exit')));
    const clear3 = IndexOf(c3, (c) => c.name === 'Na__LineworkSettings__SetLineworkBaseOverride' && c.args[0] === null);
    check('B4.6 Render3d clears them after the material preset exits (TrueVision3D :1040-:1041)', clear3 > IndexOf(c3, N('Na__DrawView__MaterialPreset__Exit')) && IndexOf(c3, N('Na__DrawView__MaterialPreset__Exit')) !== -1);
}
{   // B5 - the door pose
    const pose = { Closed : [ 'D1' ], Swings : true };
    const def  = { ...planDef, DoorPose : pose };
    const r = await Run(CAND, { run : (m) => m.Na__LeSnap__Render2d(def, win, null, 400, 300, null, 1, { sectionPx : 1.5 }, null) }, 2);
    const c = r.calls;
    const apply = c.filter(N('Na__PlDoors__Apply'));
    check('B5.1 a definition with a DoorPose stands the live model\'s doors at it, with the drawing\'s cut', apply.length === 1 && apply[0].args[0] === modelRoot && apply[0].args[1] === pose && apply[0].args[2] === planDef.Cut);
    check('B5.2 ... before the cut is built and the picture is taken', r.pictures[0].doors.indexOf('POSED:') === 0 && IndexOf(c, N('Na__PlDoors__Apply')) < IndexOf(c, N('Na__StaticExport__RenderToCanvas')));
    check('B5.3 ... and puts them back where the 3D view holds them afterwards', r.end.doors === 'AS-3D' && c.filter(N('Na__PlDoors__Restore')).length === 1 && c.filter(N('Na__PlDoors__Restore'))[0].args[0].tag === 'DOOR-HANDLE');
    const r2 = await Run(CAND, { run : (m) => m.Na__LeSnap__Render2d(planDef, win, null, 400, 300, null, 1, null, null) }, 2);
    check('B5.4 no DoorPose (every ValeVision3D caller today): the doors are never touched', r2.calls.filter(N('Na__PlDoors__Apply')).length === 0 && r2.pictures[0].doors === 'AS-3D');
    const r3 = await Run(CAND, { before : () => { S.throwRender = true; }, run : (m) => m.Na__LeSnap__Render2d(def, win, null, 400, 300, null, 1, null, null) }, 2);
    check('B5.5 a failing render still puts the doors back', r3.result === null && r3.end.doors === 'AS-3D');
}
{   // B6 - sections through the adapter: save and restore around a 3D render, the outline width
    const sceneCut = () => { tool.Na__CrossSection__ApplySerializedSections({ gizmosVisible : true, sliceDepthM : null, sections : [ { name : 'Scene cut', mode : 'PLAN', normalXyz : [ 0, -1, 0 ], positionMm : -1800, enabled : true, gizmoVisible : true } ] }); };
    W.impl.Na__PresentationMode__Camera__ApplySceneCameraState = (cam) => { cam.position.set(9, 9, 9); cam.fov = 33; S.lighting = 'SCENE-LIGHT'; sceneCut(); };
    const o = await Run(OLD,  { run : (m) => m.Na__LeSnap__Render3d(scene1, null, 400, 300, null, 1, null, null, null) }, 3.5);
    const n = await Run(CAND, { run : (m) => m.Na__LeSnap__Render3d(scene1, null, 400, 300, null, 1, null, null, null) }, 3.5);
    W.impl.Na__PresentationMode__Camera__ApplySceneCameraState = (cam) => { cam.position.set(9, 9, 9); cam.fov = 33; S.lighting = 'SCENE-LIGHT'; };
    check('B6.1 a scene\'s own cut is what the 3D picture is drawn with (old and new alike)', n.pictures[0].sections.sections === 1 && J(o.pictures[0].sections) === J(n.pictures[0].sections));
    check('B6.2 the author\'s sections come back exactly after the 3D render, through the adapter', J(n.end.tool.snapshot) === J(n.author) && J(o.end.tool) === J(n.end.tool));
    const r = await Run(CAND, { run : (m) => m.Na__LeSnap__Render2d(planDef, win, null, 400, 300, null, 1, { sectionPx : 1.25 }, null) }, 3.5);
    check('B6.3 the drawing cut is drawn at the viewport\'s Section Outline weight (1.25 px)', J(r.pictures[0].sections.outlineWidths) === J([ 1.25 ]) && r.pictures[0].sections.sections === 1);
    check('B6.4 the author\'s 3.5 px outline is theirs again afterwards (TrueVision3D\'s order)', r.end.tool.lineWidthPx === 3.5 && r.end.tool.outlineWidths.every((w) => w === 3.5) && J(r.end.tool.snapshot) === J(r.author));
    const src = readFileSync(new URL(SNAP).pathname.replace(/^\/([A-Z]:)/, '$1').replace(/\//g, '\\').replace(/Na__LayoutEditor__SnapshotRenderer__\.js$/, '') + 'Na__LayoutEditor__SnapshotRenderer__.js', 'utf8');
    const candSrc = readFileSync(new URL('./candidate/Na__LayoutEditor__SnapshotRenderer__.js', import.meta.url), 'utf8');
    const text = NEW === 'live' ? src : candSrc;
    const imports = (text.match(/from\s+'[^']+'/g) || []);
    check('B6.5 the new copy imports nothing from a 41 folder', imports.every((s) => s.indexOf('/41__') === -1) && imports.length > 0, imports.filter((s) => s.indexOf('/41__') !== -1));
    check('B6.6 ... and no TrueVision3D-only module (ProfileLines, SectionCut engine)', imports.every((s) => !/ProfileLines__|SectionCutEngine|SectionCut__/.test(s)));
    check('B6.7 the new copy has no TrueVision3D console prefix or banner', text.indexOf('[TrueVision3D') === -1 && text.indexOf('TRUEVISION3D') === -1);
}
{   // B7 - design phases, dormant
    const r = await Run(CAND, { run : (m) => m.Na__LeSnap__Render2d(planDef, win, null, 400, 300, null, 1, null, 'phase-proposed') }, 2);
    check('B7.1 a named design phase that is not loaded draws nothing (null), never the wrong model', r.result === null && r.pictures.length === 0 && r.calls.filter(N('Na__RenderLoop__Pause')).length === 0);
    const r3 = await Run(CAND, { run : (m) => m.Na__LeSnap__Render3d(scene1, null, 400, 300, null, 1, null, 'phase-proposed', null) }, 2);
    check('B7.2 Render3d likewise', r3.result === null && r3.pictures.length === 0);
    check('B7.3 GetModelRoot: null / undefined is the live root, an unloaded phase null', CAND.Na__LeSnap__GetModelRoot(null) === modelRoot && CAND.Na__LeSnap__GetModelRoot() === modelRoot && CAND.Na__LeSnap__GetModelRoot('phase-proposed') === null);
    check('B7.4 fingerprints of an unloaded phase answer null', CAND.Na__LeSnap__GetModelFingerprint('phase-proposed') === null && CAND.Na__LeSnap__GetPipelineFingerprint('phase-proposed') === null);
    ResetWorld();
    CAND.Na__LeSnap__GetModelFingerprint(); CAND.Na__LeSnap__GetPipelineFingerprint();
    const before = W.calls.filter(N('Na__PlStage__Describe')).length;
    CAND.Na__LeSnap__GetModelFingerprint();
    window.dispatchEvent(new CustomEvent(phase.Na__PhaseLib__CHANGED_EVENT, { detail : { kind : 'live' } }));
    CAND.Na__LeSnap__GetModelFingerprint();
    const after = W.calls.filter(N('Na__PlStage__Describe')).length;
    check('B7.5 a phase-library "live" change resets the live fingerprints (OnPhaseChanged)', after === before + 1, [ before, after ]);
    window.dispatchEvent(new CustomEvent(phase.Na__PhaseLib__CHANGED_EVENT, { detail : { kind : 'ready', groupId : 'nowhere' } }));
    check('B7.6 a "ready" for a phase that is not there reads nothing and throws nothing', W.calls.filter(N('Na__PlStage__Describe')).length === after);
}
{   // B8 - Model Layers hides use the exact-key setter, context the exact-key silent one
    const r = await Run(CAND, { run : (m) => m.Na__LeSnap__Render2d(planDef, win, { contextLayer : false }, 400, 300, { ValeVision__GroundFloorFurniture : false }, 1, null, null) }, 2);
    const ctxCalls = r.calls.filter(N('Na__ModelToggle__SetCategoryVisibility'));
    const keyCalls = r.calls.filter(N('Na__ModelToggle__SetCategoryVisibleByKey'));
    check('B8.1 Context Layer off: each LOADED context category, by exact key and silent', J(ctxCalls.map((c) => c.args[0]).sort()) === J([ 'ValeVision__MainBuildingModel__Existing', 'ValeVision__SceneEntourageSilhouette', 'ValeVision__SiteBoundaries', 'ValeVision__Vegetation' ]) && ctxCalls.every((c) => c.args[1] === false && c.args[2] === true), ctxCalls.map((c) => c.args));
    check('B8.2 Model Layers: SetCategoryVisibleByKey(key, false), as TrueVision3D', keyCalls.length === 1 && keyCalls[0].args[0] === 'ValeVision__GroundFloorFurniture' && keyCalls[0].args[1] === false);
    check('B8.3 every hide is put back from the one capture', J(r.end.visibility) === J({ ValeVision__MainBuildingModel__Existing : true, ValeVision__MainBuildingModel__Proposed : true, ValeVision__SiteBoundaries : true, ValeVision__GroundFloorFurniture : true, ValeVision__SceneEntourageSilhouette : true, ValeVision__Vegetation : true }));
}
{   // B9 - Context Layer off hides what TrueVision3D's token setter would, over every ValeVision3D category key
    const mm   = readFileSync(VVM + '15__ModelLoader/Na__ModelLoader__MultiModel.js', 'utf8');
    const cfg  = readFileSync(VVM + '51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__ModelLayers__Config__.json', 'utf8');
    const keys = [ ...new Set([ ...(mm.match(/ValeVision__[A-Za-z0-9_]+/g) || []), ...(cfg.match(/"ValeVision__[A-Za-z0-9_]+"/g) || []).map((s) => s.slice(1, -1)) ]) ].filter((k) => !/__$/.test(k)).sort();
    const tvSrc = execFileSync('git', [ '-C', 'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb', 'show', 'b2aa9151:na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js' ]).toString('utf8');
    const tvBlock = tvSrc.slice(tvSrc.indexOf('CONTEXT_CATEGORIES = ['), tvSrc.indexOf('];', tvSrc.indexOf('CONTEXT_CATEGORIES = [')));
    const tvContext = (tvBlock.match(/'TrueVision__[A-Za-z0-9_]+'/g) || []).map((s) => s.slice(1, -1).replace(/^TrueVision__/, 'ValeVision__'));
    const tvPlusSilhouette = [ ...tvContext, 'ValeVision__SceneEntourageSilhouette' ];                      // <-- The one declared list difference (WT-04)
    const tvToken = (universe) => universe.filter((k) => tvPlusSilhouette.some((t) => k.toLowerCase().indexOf(t.toLowerCase()) !== -1)).sort();   // <-- TV ModelToggle :444-:460, run over this app's keys
    const hiddenBy = async (mod, universe) => {
        const r = await Run(mod, { before : () => { S.visibility = Object.fromEntries(universe.map((k) => [ k, true ])); }, run : (m) => m.Na__LeSnap__Render2d(planDef, win, { contextLayer : false }, 400, 300, null, 1, null, null) }, 2);
        const pic = r.pictures[0].visibility;
        return { hidden : Object.keys(pic).filter((k) => pic[k] === false).sort(), restored : Object.values(r.end.visibility).every((v) => v === true) };
    };
    check('B9.0 TrueVision3D\'s list at the pin is the 7 keys (no silhouette)', tvContext.length === 7 && !tvContext.includes('ValeVision__SceneEntourageSilhouette'), tvContext);
    const all = await hiddenBy(CAND, keys);
    check('B9.1 every ValeVision3D category key loaded (' + keys.length + '): the new copy hides exactly TrueVision3D\'s token set', J(all.hidden) === J(tvToken(keys)) && all.restored, { hidden : all.hidden, tv : tvToken(keys) });
    const split = [ 'ValeVision__MainBuildingModel__Existing', 'ValeVision__MainBuildingModel__ExistingWalls', 'ValeVision__MainBuildingModel__ExistingRoofs', 'ValeVision__MainBuildingModel__Proposed', 'ValeVision__MainBuildingModel__ProposedWalls', 'ValeVision__SiteBoundaries' ];
    const so = await hiddenBy(OLD, split); const sn = await hiddenBy(CAND, split);
    check('B9.2 (contrast) an export split by tag: the OLD copy left the existing walls and roofs in the picture', !so.hidden.includes('ValeVision__MainBuildingModel__ExistingWalls') && so.hidden.includes('ValeVision__MainBuildingModel__Existing'), so.hidden);
    check('B9.3 ... the new copy takes them out with the existing building, and never the proposal', J(sn.hidden) === J([ 'ValeVision__MainBuildingModel__Existing', 'ValeVision__MainBuildingModel__ExistingRoofs', 'ValeVision__MainBuildingModel__ExistingWalls', 'ValeVision__SiteBoundaries' ]) && sn.restored, sn.hidden);
    // 3047__Doous's own categories (its project.json model list): old and new hide the same set
    const doous = readFileSync('D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/Projects/2026/3047__Doous/project.json', 'utf8');
    const doousKeys = [ ...new Set((doous.match(/__TrueVision__([A-Za-z0-9]+(?:__[A-Za-z0-9]+)*?)__(?:MeshModel|LineworkModel)__\.glb/g) || []).map((s) => 'ValeVision__' + s.replace(/^__TrueVision__/, '').replace(/__(MeshModel|LineworkModel)__\.glb$/, ''))) ].sort();
    const dO = await hiddenBy(OLD, doousKeys); const dN = await hiddenBy(CAND, doousKeys);
    check('B9.4 3047__Doous\'s ' + doousKeys.length + ' loaded categories: old and new hide exactly the same set', doousKeys.length >= 6 && J(dO.hidden) === J(dN.hidden) && dN.hidden.length === 2, { keys : doousKeys, old : dO.hidden, new : dN.hidden });
}

// -----------------------------------------------------------------------------
// Part C (W215_REAL_ENHANCE=1): Enhance strength 0 skips both passes, 100 is the old pass
// -----------------------------------------------------------------------------
if (REAL_ENHANCE) {
    const fx = (calls) => calls.filter((c) => /PostProcess__Apply/.test(c.name)).map((c) => ({ name : c.name, args : c.args.slice(1) }));
    const base = { run : null };
    const run = async (m, w, three) => Run(m, { run : (mm) => three ? mm.Na__LeSnap__Render3d(scene1, { enhanceWhitecard : true }, 400, 300, null, 1, w, null, null) : mm.Na__LeSnap__Render2d(planDef, win, { enhanceWhitecard : true }, 400, 300, null, 1, w, null) }, 2);
    for (const three of [ false, true ]) {
        const tag = three ? '3D' : '2D';
        const old0  = await run(OLD, null, three);
        const n100  = await run(CAND, { enhancePct : 100 }, three);
        const nNull = await run(CAND, null, three);
        const nNone = await run(CAND, { modelEdgePx : 1 }, three);
        const n0    = await run(CAND, { enhancePct : 0 }, three);
        const n40   = await run(CAND, { enhancePct : 40 }, three);
        check('C.' + tag + '.1 the old pass runs levels and sharpen', fx(old0.calls).length === 2, fx(old0.calls));
        check('C.' + tag + '.2 strength 100 is call-for-call the old pass', J(fx(n100.calls)) === J(fx(old0.calls)));
        check('C.' + tag + '.3 no weights / no enhancePct is the old pass too', J(fx(nNull.calls)) === J(fx(old0.calls)) && J(fx(nNone.calls)) === J(fx(old0.calls)));
        check('C.' + tag + '.4 strength 0 skips both passes', fx(n0.calls).length === 0);
        check('C.' + tag + '.5 strength 40 runs both at 40% (levels and sharpen opacity scaled)', fx(n40.calls).length === 2 && J(fx(n40.calls)) !== J(fx(old0.calls)));
    }
}

// -----------------------------------------------------------------------------
// Report
// -----------------------------------------------------------------------------
console.log = realLog;
let failed = 0;
results.forEach((r) => { if (!r.pass) failed++; console.log((r.pass ? '  PASS  ' : '  FAIL  ') + r.name + (r.pass || r.detail === '' ? '' : '\n        ' + J(r.detail).slice(0, 1500))); });
console.log('\n  ' + (results.length - failed) + '/' + results.length + ' checks pass (' + NEW + ' copy' + (REAL_ENHANCE ? ', real Enhance' : '') + ')');
process.exit(failed === 0 ? 0 : 1);
