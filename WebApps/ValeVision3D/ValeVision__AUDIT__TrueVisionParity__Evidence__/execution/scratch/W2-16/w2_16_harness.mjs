// =============================================================================
// W2-16 scratch harness (not shipped) - acceptance checks on the candidate files
// =============================================================================
// Loads modules the way TrueVision's own tests do: the shipped text with its
// import statements replaced by named stubs (or by other REAL modules loaded the
// same way), so the code under test runs byte for byte.
//   node w2_16_harness.mjs [candidate-root]
// candidate-root: an app root holding the candidate files (default: ./overlay).
// The pre-image (the files before W2-16) is read from ./preimage for contrast.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(process.argv[2] || join(HERE, 'overlay'));
const SRC  = join(ROOT, '02__Src__AppModules');
const PRE  = join(HERE, 'preimage', '02__Src__AppModules');
const LE   = '51__System__LayoutEditor/';

// -----------------------------------------------------------------------------
// A browser just big enough
// -----------------------------------------------------------------------------
const dispatched = [];
const timers = new Map(); let timerId = 0;
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = {
    addEventListener : () => {}, removeEventListener : () => {},
    dispatchEvent : (e) => { dispatched.push(e.type); return true; },
    localStorage : { getItem : () => null, setItem : () => {}, removeItem : () => {} },
    setTimeout : (fn) => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout : (id) => { timers.delete(id); },
    setInterval : () => 0, clearInterval : () => {}
};
async function flush() {
    for (let round = 0; round < 10 && timers.size; round++) {
        const fns = [ ...timers.values() ]; timers.clear();
        for (const fn of fns) fn();
        await new Promise((r) => setImmediate(r));
    }
    await new Promise((r) => setImmediate(r));
}
function El(tag, cls) {
    const el = { tagName : tag, className : cls || '', style : {}, hidden : false, children : [], textContent : '', src : '', draggable : true, alt : null,
        attrs : {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; if (k === 'src') this.src = ''; },
        classList : { set : new Set(), toggle(c, f) { f ? this.set.add(c) : this.set.delete(c); }, add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, contains(c) { return this.set.has(c); } },
        appendChild(c) { this.children.push(c); return c; },
        get firstElementChild() { return this.children[0] || { style : {}, setAttribute() {} }; } };
    let html = '';
    Object.defineProperty(el, 'innerHTML', { get : () => html, set : (v) => { html = v; el.children = v ? [ { style : {}, setAttribute() {} } ] : []; } });
    return el;
}
globalThis.document = { createElement : (tag) => El(tag), body : El('body') };

// -----------------------------------------------------------------------------
// Loader: shipped text, imports replaced by stubs
// -----------------------------------------------------------------------------
const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let loadCount = 0;
const calls = {};               // name -> [args...] for recorded stubs
function rec(name, ret) { calls[name] = []; return (...a) => { calls[name].push(a); return typeof ret === 'function' ? ret(...a) : ret; }; }
async function load(file, stubs) {
    let src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const names = []; let m; IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        const list = m[1].trim(); if (list.charAt(0) !== '{') continue;
        list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
    }
    src = src.replace(IMPORT, '');
    if (/^\s*import\s+[\{\w*]/m.test(src)) throw new Error('an import survived in ' + file);
    const key = '__W216Stubs' + (++loadCount);
    globalThis[key] = stubs || {};
    const head = names.map((n) => 'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key + '["' + n + '"] : function () { return undefined; };').join('\n');
    const tmp = join(tmpdir(), 'W216__' + loadCount + '__.mjs');
    writeFileSync(tmp, head + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href + '?v=' + loadCount);
}
const cand = (rel) => join(SRC, rel);
const pre  = (rel) => join(PRE, rel);

let pass = 0, fail = 0;
function check(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    ok ? pass++ : fail++;
    console.log((ok ? '  PASS  ' : '  FAIL  ') + name);
    if (!ok) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
}

// -----------------------------------------------------------------------------
// Shared stubs
// -----------------------------------------------------------------------------
const CFG = {
    Na__LeCfg__GetLabel : (k, f) => f,
    Na__LeCfg__FormatLabel : (k, f, v) => String(f).replace(/\{(\w+)\}/g, (_, n) => (v && v[n] != null) ? v[n] : ''),
    Na__LeCfg__GetModelSourceSetup : () => ({ maxCachedPhases : 3 })
};

// =============================================================================
// A. MODEL SOURCE, DORMANT, over the REAL phase library (uninitialised)
// =============================================================================
console.log('\nA. Model Source dormant (real PhaseLibrary, never initialised)');
const PL = await load(join(SRC, '26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js'), {});
const before = dispatched.length;
const MS = await load(cand(LE + '20__System__Viewports/Na__LayoutEditor__ModelSource__.js'), Object.assign({}, PL, CFG, {
    Na__LeModel__UpdateViewport : rec('UpdateViewport', true),
    Na__SpStore__GetLayers : () => [],
    Na__LeVp2d__SitePlanStoreId : () => null
}));
check('the library has no groups', PL.Na__PhaseLib__GetGroups().length, 0);
check('Initialize only sets the cache limit (true) and announces nothing', [ MS.Na__LeSource__Initialize(), dispatched.length - before ], [ true, 0 ]);
check('HasChoices is false: the Model Source row and menu stay hidden', MS.Na__LeSource__HasChoices(), false);
const vps = [ { Viewport__Id : 'V1' }, { Viewport__Id : 'V2', Viewport__ModelSourceId : 'Existing' }, { Viewport__Id : 'V3', Viewport__ModelSourceId : '' }, null ];
check('Resolve().renderId is null for every viewport (stored id or not)', vps.map((v) => MS.Na__LeSource__Resolve(v).renderId), [ null, null, null, null ]);
check('...and every one is the live model, nothing missing, nothing explicit', vps.map((v) => { const r = MS.Na__LeSource__Resolve(v); return [ r.isLive, r.missing, r.explicit, r.groupId ]; }),
      vps.map(() => [ true, false, false, null ]));
check('StatusText is empty', vps.map((v) => MS.Na__LeSource__StatusText(MS.Na__LeSource__Resolve(v))), [ '', '', '', '' ]);
check('WaitFor(null) and WaitFor(undefined) resolve true at once', [ await MS.Na__LeSource__WaitFor(null), await MS.Na__LeSource__WaitFor(undefined) ], [ true, true ]);
check('MenuItems is empty (no Model items in the right-click menu)', MS.Na__LeSource__MenuItems({ Sheet__Id : 'S' }, vps[0], false), []);
check('CategoryKeys of an ordinary viewport is null (the live registry answers)', MS.Na__LeSource__CategoryKeys(vps[0]), null);
check('CategoryKeys of a site plan viewport is its (empty) store layers', MS.Na__LeSource__CategoryKeys({ Viewport__SitePlan : {} }), []);
check('Options: only Project Default', MS.Na__LeSource__Options(null), [ { value : '', label : 'Project Default' } ]);
MS.Na__LeSource__Ensure(MS.Na__LeSource__Resolve(vps[1]));
check('Ensure is a no-op, nothing written, nothing announced', [ calls.UpdateViewport.length, dispatched.length - before ], [ 0, 0 ]);

// =============================================================================
// B. 3D VIEWPORT KEYS: the stored snapshot fingerprint is unchanged
// =============================================================================
console.log('\nB. 3D viewport fingerprints, before vs after (stored snapshot keys)');
const ML_STUBS = { Na__ModelToggle__GetCategoryKeys : () => [ 'ValeVision__MainBuildingModel__Proposed', 'ValeVision__Vegetation' ], Na__SpStore__GetLayers : () => [], ...CFG };
const MLn = await load(cand(LE + '25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js'), ML_STUBS);
const MLp = await load(pre(LE + '25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js'), ML_STUBS);
const RasterToken = (vp, three) => (vp && vp.Viewport__CompositeWeights) ? 'W:' + JSON.stringify(vp.Viewport__CompositeWeights) + (three ? ':3d' : '') : '';
const V3_STUBS = (ml) => Object.assign({}, CFG, {
    Na__LeSnap__GetModelFingerprint : (id) => (id ? null : 'MODEL-FP'),
    Na__LeModelLayers__Token : ml.Na__LeModelLayers__Token,
    Na__LeComposite__RasterToken : RasterToken,
    Na__LeComposite__Weight : (vp, k) => (vp.Viewport__CompositeWeights && vp.Viewport__CompositeWeights[k] != null) ? vp.Viewport__CompositeWeights[k] : (k === 'enhanceWhitecard' ? 100 : 1),
    Na__SceneLighting__SceneToken : (s) => s.lightToken || '',
    Na__LeSource__Resolve : MS.Na__LeSource__Resolve, Na__LeSource__Ensure : MS.Na__LeSource__Ensure, Na__LeSource__WaitFor : MS.Na__LeSource__WaitFor, Na__LeSource__StatusText : MS.Na__LeSource__StatusText,
    Na__LeDraft__IsOn : () => false
});
const V3n = await load(cand(LE + '20__System__Viewports/Na__LayoutEditor__Viewport3d__.js'), V3_STUBS(MLn));
const V3p = await load(pre(LE + '20__System__Viewports/Na__LayoutEditor__Viewport3d__.js'), V3_STUBS(MLp));
const scene = (id, extra) => Object.assign({ PresentationMode__Scene__Id : id, PresentationMode__Scene__Name : 'Scene ' + id, PresentationMode__Scene__CameraPosition : { x : 1, y : 2, z : 3 } }, extra || {});
const vp3 = (extra) => Object.assign({ Viewport__Id : 'V', Viewport__Kind : '3d', Viewport__Styles : { whitecard : true, baseImage : true }, Viewport__ImageMm : { WidthMm : 200, HeightMm : 120 }, Viewport__ImageOffsetMm : { X : 0, Y : 0 }, Viewport__FrameMm : { X : 0, Y : 0, WidthMm : 200, HeightMm : 120 } }, extra || {});
const cases3 = [
    [ vp3(), scene('S1') ],
    [ vp3({ Viewport__ModelLayers : { ValeVision__Vegetation : false } }), scene('S2', { PresentationMode__Scene__ModelLayerVisibility : { a : 1 } }) ],
    [ vp3({ Viewport__CompositeWeights : { baseImage : 1.5 } }), scene('S3', { lightToken : 'sun-210' }) ],
    [ vp3({ Viewport__ModelSourceId : 'Existing', Viewport__Styles : { whitecard : false } }), scene('S4') ],
    [ vp3({ Viewport__ImageMm : { WidthMm : 100, HeightMm : 300 } }), scene('S5') ]
];
check('every case: the fingerprint is the same before and after', cases3.map(([v, s]) => V3n.Na__LeVp3d__Fingerprint(v, s) === V3p.Na__LeVp3d__Fingerprint(v, s)), cases3.map(() => true));
check('and is never null (no viewport waits for a design phase)', cases3.map(([v, s]) => V3n.Na__LeVp3d__Fingerprint(v, s) !== null), cases3.map(() => true));
check('Enhance 40 re-keys the 3D picture (the raster token joins the fingerprint)',
      V3n.Na__LeVp3d__Fingerprint(vp3({ Viewport__CompositeWeights : { enhanceWhitecard : 40 } }), scene('S1')) !== V3n.Na__LeVp3d__Fingerprint(vp3(), scene('S1')), true);

// =============================================================================
// C. 2D FRAMES: the frame stack, the underlay key, fog independence, Enhance
// =============================================================================
console.log('\nC. 2D frames: stack order, underlay keys, depth fog, Enhance, modifiers');
let modifierRows = [];
let fogWanted = null;
const render2d = [];
const ensureLinework = [];
const PLAN = { FloorPlan__Id : 'FloorPlan_001', FloorPlan__Name : 'Ground Floor Plan' };
const ELEV = { Elevation__Id : 'Elevation_001', Elevation__Name : 'South Elevation' };
const FAKE_VIEW = (kind) => (src, override, exclude, pose) => ({ kind, id : src.FloorPlan__Id || src.Elevation__Id, override, exclude, pose : pose === undefined ? 'NOT-PASSED' : pose,
    RecordHash : 'RH:' + (src.FloorPlan__Id || src.Elevation__Id) + ':' + JSON.stringify(override) + ':' + JSON.stringify(exclude) + (pose ? ':' + JSON.stringify(pose) : '') });
const COMMON2D = Object.assign({}, CFG, {
    Na__LeModel__ResolveViewportSource : (vp) => vp.Viewport__DrawingId === 'FloorPlan_001' ? { plan : PLAN } : (vp.Viewport__DrawingId === 'Elevation_001' ? { elevation : ELEV } : {}),
    Na__LeModel__IsSitePlanViewport : (vp) => !!(vp && vp.Viewport__SitePlan),
    Na__LeModelLayers__ExcludeTokens : () => [],
    Na__PlView__FromPlan : FAKE_VIEW('plan'), Na__PlView__FromElevation : FAKE_VIEW('elevation'),
    Na__PlView__CacheKey : (def, fp) => 'CK:' + def.RecordHash + ':' + fp,
    Na__LeDoors__PoseFor : (vp) => ({ Closed : [], Swings : true, SwingStepDegrees : 15 }),
    Na__LeDoors__ShutPoseFor : () => ({ Shut : true }),
    Na__LeDoors__SwingExcludeTokens : () => [],
    Na__LeDoors__RasterLayers : (vp) => vp.Viewport__ModelLayers || null,
    Na__LeSource__Resolve : MS.Na__LeSource__Resolve, Na__LeSource__Ensure : MS.Na__LeSource__Ensure, Na__LeSource__WaitFor : MS.Na__LeSource__WaitFor, Na__LeSource__StatusText : MS.Na__LeSource__StatusText,
    Na__LeSnap__GetPipelineFingerprint : (id) => (id ? null : 'PIPE-FP'),
    Na__LeSnap__Render2d : (...a) => { render2d.push(a); return Promise.resolve({ dataUrl : 'data:image/png;base64,AA' }); },
    Na__LeComposite__Weight : (vp, k) => (vp.Viewport__CompositeWeights && vp.Viewport__CompositeWeights[k] != null) ? vp.Viewport__CompositeWeights[k] : (k === 'enhanceWhitecard' ? 100 : 1),
    Na__LeComposite__RasterToken : RasterToken,
    Na__LeRaster__Get : () => 'medium', Na__LeRaster__Working : () => 'medium', Na__LeRaster__Export : () => 'high',
    Na__LeRaster__Fit : (w, h) => ({ w : Math.round(w * 4), h : Math.round(h * 4), samples : 2 }),
    Na__LeDraft__IsOn : () => false,
    Na__PlCfg__GetLineworkModifiers : () => modifierRows,
    Na__LeEdge__Effective : (vp, key) => ({ weight : 0.5, hex : '#555555', lineType : 'solid', patternMm : [] }),
    Na__LeVp2d__FogFor : () => fogWanted,
    Na__PlPipe__GetCached : () => null,
    Na__PlOwners__Has : () => true,
    Na__LeVp2d__StyleToken : () => 'ST'
});
async function build2d(root, isNew) {
    const ml   = isNew ? MLn : MLp;
    const base = Object.assign({}, COMMON2D, { Na__LeModelLayers__Token : ml.Na__LeModelLayers__Token, Na__LeModelLayers__IsOn : ml.Na__LeModelLayers__IsOn });
    const Win  = await load(root(LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js'), base);
    const Frm  = await load(root(LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js'), Object.assign({}, base, Win));
    const lin = Object.assign({}, base, {
        Na__LeVp2d__EnsureLinework : (...a) => { ensureLinework.push(a); return Promise.resolve({ visible : [ 0, 0, 1, 1 ] }); },
        Na__LeVp2d__PaintLinework : (state, viewport, key, classes) => {   // <-- What the real one leaves behind (Linework :PaintLinework)
            const win = Win.Na__LeVp2d__Window(viewport);
            state.lineworkKey = key + '|' + (viewport.Viewport__Styles.hiddenLines === true) + '|' + win.Denominator + '|' + state.masterPt + '|ST';
            state.lineworkSvg = { setAttribute() {}, style : {} }; state.classes = classes; state.classesKey = key;
        }
    });
    const V2 = await load(root(LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__.js'), Object.assign({}, lin, Win, Frm,
        { Na__LeVp2d__EnsureLinework : lin.Na__LeVp2d__EnsureLinework, Na__LeVp2d__PaintLinework : lin.Na__LeVp2d__PaintLinework, Na__LeVp2d__StyleToken : () => 'ST' }));
    return { Win, Frm, V2 };
}
const N = await build2d(cand, true);
const P = await build2d(pre, false);
const vp2 = (id, drawing, extra) => Object.assign({ Viewport__Id : id, Viewport__Kind : '2d', Viewport__DrawingId : drawing, Viewport__ScaleDenominator : 100,
    Viewport__FrameMm : { X : 10, Y : 10, WidthMm : 200, HeightMm : 150 }, Viewport__PanMm : { X : 0, Y : 0 },
    Viewport__Styles : { whitecard : true, glassOpaque : false, profileLinework : true, enhanceWhitecard : true, contextLayer : true, baseImage : true, projectedLinework : true, hiddenLines : false } }, extra || {});
const SHEET = { Sheet__Id : 'S1', Sheet__Lineweights : { ViewportPt : 0.3 } };

// C1. the frame stack
const body = El('div', 'na-le-frame__body');
const st = N.Frm.Na__LeVp2d__State(body, 'STACK');
check('the frame stack reads underlay, linework, fog, markup (then the empty and progress notes)', body.children.map((c) => c.className),
      [ 'na-le-frame__underlay', 'na-le-frame__linework', 'na-le-frame__fog', 'na-le-frame__markup', 'na-le-frame__empty', 'na-le-frame__progress' ]);
check('a new frame\'s fog layer starts hidden', st.fog.hidden, true);

// C2. Describe: Model Source and the door pose
const dPlan = N.Win.Na__LeVp2d__Describe(vp2('A', 'FloorPlan_001'));
const dElev = N.Win.Na__LeVp2d__Describe(vp2('B', 'Elevation_001'));
check('a plan is described with its doors open (the viewport\'s pose)', dPlan.definition.pose, { Closed : [], Swings : true, SwingStepDegrees : 15 });
check('an elevation is described with every door shut', dElev.definition.pose, { Shut : true });
check('Describe hands back Model Source\'s own answer: the live model', [ dPlan.modelSource.renderId, dPlan.modelSource.isLive ], [ null, true ]);
const pPlan = P.Win.Na__LeVp2d__Describe(vp2('A', 'FloorPlan_001'));
check('before W2-16 no pose was handed to the projection at all', pPlan.definition.pose, 'NOT-PASSED');

// C3. Underlay keys, before vs after, Fill by Fill
async function fillKey(M, vp) {
    const b = El('div');
    M.V2.Na__LeVp2d__Fill(b, SHEET, vp, 2);
    const state = M.Frm.Na__LeVp2d__States.get(vp.Viewport__Id);
    await flush();
    return state;
}
const stripPose = (k) => k.replace(/:\{"(Closed|Shut)"[^|]*?\}(?=\||$)/g, '');
modifierRows = [];
const kNe = (await fillKey(N, vp2('E1', 'Elevation_001'))).wantedKey;
const kPe = (await fillKey(P, vp2('E1', 'Elevation_001'))).wantedKey;
check('elevation underlay key: identical before and after but for the shut-door pose in its record hash', stripPose(kNe), kPe);
const kNp = (await fillKey(N, vp2('P1', 'FloorPlan_001'))).wantedKey;
const kPp = (await fillKey(P, vp2('P1', 'FloorPlan_001'))).wantedKey;
check('plan underlay key: identical before and after but for the open-door pose (plan doors)', stripPose(kNp), kPp);
modifierRows = [ { TagName : '76__LineworkModifier__FineDetail', OwnerKey : 'ValeVision__LineworkModifier__FineDetail' }, { TagName : '77__LineworkModifier__VeryFineDetail', OwnerKey : 'ValeVision__LineworkModifier__VeryFineDetail' } ];
const kNm = (await fillKey(N, vp2('E2', 'Elevation_001'))).wantedKey;
const kPm = (await fillKey(P, vp2('E2', 'Elevation_001'))).wantedKey;
check('with modifier rows configured the new key is the old one plus the modifier token (W2-13 F2)',
      stripPose(kNm), kPm + '|76__LineworkModifier__FineDetail:0.5:#555555|77__LineworkModifier__VeryFineDetail:0.5:#555555');

// C4. Depth fog on a sheet
modifierRows = [];
render2d.length = 0; ensureLinework.length = 0;
fogWanted = null;
const v = vp2('F1', 'Elevation_001');
let s1 = await fillKey(N, v);
const under1 = render2d.filter((a) => a.length < 11 || a[10] === undefined).length;
check('no fog: the fog layer stays hidden and no fog image is rendered (costs nothing)', [ s1.fog.hidden, render2d.filter((a) => a[10] !== undefined).length, s1.fogWantedKey ], [ true, 0, null ]);
const keyBefore = s1.wantedKey, lineBefore = s1.lineworkKey, ensureBefore = ensureLinework.length;
fogWanted = { token : 'fog:30:60', source : { Kind : 'fog-source' } };
N.V2.Na__LeVp2d__Fill(s1.body, SHEET, v, 2); await flush();
const fogRenders = render2d.filter((a) => a[10] !== undefined);
check('fog on: one fog image is rendered, with the fog source as Render2d\'s 11th argument', [ fogRenders.length, fogRenders[0] && fogRenders[0][10] ], [ 1, { Kind : 'fog-source' } ]);
check('fog on: the underlay is not rendered again and its key is unchanged', [ render2d.filter((a) => a[10] === undefined).length - under1, s1.wantedKey === keyBefore ], [ 0, true ]);
check('fog on: the linework is neither re-projected nor repainted', [ ensureLinework.length - ensureBefore, s1.lineworkKey === lineBefore ], [ 0, true ]);
check('fog on: the fog layer shows', s1.fog.hidden, false);
fogWanted = null;
N.V2.Na__LeVp2d__Fill(s1.body, SHEET, v, 2); await flush();
check('fog off again: the fog layer hides; underlay and linework untouched', [ s1.fog.hidden, render2d.filter((a) => a[10] === undefined).length - under1, ensureLinework.length - ensureBefore, s1.wantedKey === keyBefore ], [ true, 0, 0, true ]);

// C5. Enhance and modifiers in the raster weights
const wEnh = N.Frm.Na__LeVp2d__RasterWeights(vp2('W', 'Elevation_001', { Viewport__CompositeWeights : { enhanceWhitecard : 40 } }));
check('Enhance 40 reaches the 2D render as enhancePct 40', wEnh.enhancePct, 40);
const kEnh = (await fillKey(N, vp2('W2', 'Elevation_001', { Viewport__CompositeWeights : { enhanceWhitecard : 40 } }))).wantedKey;
const kDef = (await fillKey(N, vp2('W3', 'Elevation_001'))).wantedKey;
check('Enhance 40 re-keys the 2D underlay (the raster token)', kEnh.replace('W:{"enhanceWhitecard":40}', '') !== kEnh && kEnh !== kDef, true);
modifierRows = [ { TagName : '76__LineworkModifier__FineDetail', OwnerKey : 'ValeVision__LineworkModifier__FineDetail' } ];
const offVp = vp2('M', 'Elevation_001', { Viewport__ModelLayers : { ValeVision__LineworkModifier__FineDetail : false } });
check('a modifier row switched off in Model Layers leaves the base image (hidden in the raster rules)', N.Frm.Na__LeVp2d__RasterWeights(offVp).modifiers, [ { TagName : '76__LineworkModifier__FineDetail', hidden : true, widthFactor : 0.5, hex : '#555555' } ]);
check('...and its token says off, so the picture re-renders', N.Frm.Na__LeVp2d__RasterModifierToken(offVp), '76__LineworkModifier__FineDetail:off');
modifierRows = [];
check('no modifier rows: no modifiers, an empty token', [ N.Frm.Na__LeVp2d__RasterWeights(offVp).modifiers, N.Frm.Na__LeVp2d__RasterModifierToken(offVp) ], [ null, '' ]);

// =============================================================================
// D. EDGE STYLES: the Line scale override, the site plan prefix
// =============================================================================
console.log('\nD. Edge styles: Line scale and the site plan prefix');
const ES = await load(cand(LE + '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js'), Object.assign({}, CFG, {
    Na__LeModelLayers__EdgeDefault : (key) => (/LineworkModifier/.test(key) ? { weight : 0.5, colour : 'mid-grey', lineType : 'solid' } : (/Windows/.test(key) ? { weight : 0.6, colour : 'dark-grey', lineType : 'solid' } : { weight : 0.8, colour : 'black', lineType : 'dashed' })),
    Na__LeModelLayers__IsLoaded : () => true,
    Na__LeCfg__GetLineweightSetup : () => ({ viewportPt : 0.3 }), Na__LeCfg__PtToMm : (pt) => pt * 0.3528,
    Na__SpStore__GetLayers : () => [ { Layer__CategoryKey : 'ValeVision__SitePlan__RedLine', Layer__Style : { LineHex : '#E53935', LineType : 'dashed', LineWeightMm : 0.5, LineDashScale : 0.5 } } ]
}));
const eDash  = ES.Na__LeEdge__Effective({ Viewport__ProjectedEdges : {} }, 'ValeVision__MainBuildingModel__ProposedWalls');
const eHalf  = ES.Na__LeEdge__Effective({ Viewport__ProjectedEdges : { Edges__Categories : { ValeVision__MainBuildingModel__ProposedWalls : { Category__LineTypeScale : 0.5 } } } }, 'ValeVision__MainBuildingModel__ProposedWalls');
check('the dashed row has a dash pattern to scale', eDash.patternMm.length > 0, true);
check('a Line scale of 0.5 halves every dash and gap length', eHalf.patternMm, eDash.patternMm.map((mm) => mm * 0.5));
check('...and only those: weight, colour and line type are unchanged', [ eHalf.weight, eHalf.colour, eHalf.lineType ], [ eDash.weight, eDash.colour, eDash.lineType ]);
const eSite = ES.Na__LeEdge__Effective({ Viewport__ProjectedEdges : {} }, 'ValeVision__SitePlan__RedLine');
check('a ValeVision__SitePlan__ layer takes its default from the store (dormant with site plans)', [ eSite.colour, eSite.dashScale ], [ 'red', 0.5 ]);
check('a TrueVision__SitePlan__ key is not a site plan layer here', ES.Na__LeEdge__Effective({ Viewport__ProjectedEdges : {} }, 'TrueVision__SitePlan__RedLine').dashScale, 1);

// =============================================================================
// E. THE VECTOR HALF OF A MODIFIER ROW (the real StyleBands)
// =============================================================================
console.log('\nE. Linework: a modifier row switched off leaves the vectors');
const LW = await load(cand(LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js'), Object.assign({}, CFG, N.Win, {
    Na__LeVp2d__CLASS_ORDER : N.Frm.Na__LeVp2d__CLASS_ORDER, Na__LeVp2d__Linework : new Map(), Na__LeVp2d__PathCache : new Map(), Na__LeVp2d__SizeLayer : () => {},
    Na__LeCfg__GetLineworkSetup : () => ({ visibleWidthMm : 0.35, hiddenWidthMm : 0.18, authoredWidthMm : 0.25, sectionWidthMm : 0.5, hiddenDashMm : 1 }),
    Na__LeCfg__PtToMm : (pt) => pt * 0.3528,
    Na__LeComposite__Factor : () => 1,
    Na__PlCfg__GetAppearance : () => ({ StrokeColour : '#000000' }),
    Na__LeEdge__Effective : ES.Na__LeEdge__Effective, Na__LeEdge__AppliesToClasses : () => [ 'visible', 'hidden', 'authored' ], Na__LeEdge__SolidMeansClassDefault : () => true,
    Na__LeModelLayers__IsOn : MLn.Na__LeModelLayers__IsOn,
    Na__PlOwners__Read : (classes) => classes.__tags,
    Na__PlOwners__KeyFor : (keys, id) => keys[id]
}));
const classes = { visible : [ 0, 0, 1, 0,  0, 1, 1, 1,  2, 2, 3, 3,  4, 4, 5, 5 ], __tags : { Owners : { visible : [ 0, 1, 1, 2 ] },
    OwnerKeys : [ 'ValeVision__MainBuildingModel__ProposedWalls', 'ValeVision__LineworkModifier__FineDetail', 'ValeVision__MainBuildingModel__ProposedWindows' ] } };
const bandsOn  = LW.Na__LeVp2d__StyleBands({ Viewport__ProjectedEdges : {} }, 0.3, classes, false);
const bandsOff = LW.Na__LeVp2d__StyleBands({ Viewport__ProjectedEdges : {}, Viewport__ModelLayers : { ValeVision__LineworkModifier__FineDetail : false } }, 0.3, classes, false);
if (process.env.W216_DEBUG) console.log(JSON.stringify(bandsOn), JSON.stringify(bandsOff));
const drawn = (bands) => bands.flatMap((b) => b.indices ? Array.from(b.indices) : [ 0, 1, 2, 3 ]).sort();
check('with the row on, all four segments draw', drawn(bandsOn), [ 0, 1, 2, 3 ]);
check('with the Fine Detail row off, its two segments leave the vectors; the wall and the window stay', drawn(bandsOff), [ 0, 3 ]);
// TrueVision's own edge case, ported as it is (DR-37 (3)): when every segment LEFT in a class shares one
// style, StyleBands paints the class whole (indices null), switched-off segments included. Recorded, not failed.
const lone = { visible : [ 0, 0, 1, 0,  0, 1, 1, 1 ], __tags : { Owners : { visible : [ 0, 1 ] }, OwnerKeys : classes.__tags.OwnerKeys } };
const loneOff = LW.Na__LeVp2d__StyleBands({ Viewport__ProjectedEdges : {}, Viewport__ModelLayers : { ValeVision__LineworkModifier__FineDetail : false } }, 0.3, lone, false);
console.log('  NOTE  TrueVision edge case: one style left in a class -> indices ' + JSON.stringify(loneOff.map((b) => b.indices)) + ' (null = the whole class, the switched-off segment included)');

// =============================================================================
// F. A TRUEVISION-WRITTEN SITE PLAN VIEWPORT RECORD ROUND-TRIPS (the shipped SheetRecords)
// =============================================================================
console.log('\nF. A TrueVision-written Viewport__SitePlan record through this app\'s record normaliser');
const APPCFG = JSON.parse(readFileSync(join(SRC, LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'), 'utf8'));
const Val = (block, key, fallback) => { const bk = APPCFG['LayoutEditor__' + block + '__Config']; const v = bk ? bk['LayoutEditor__' + block + '__' + key] : undefined; return (v === undefined || v === null) ? fallback : v; };
const Num = (block, key, fallback) => { const v = Val(block, key, undefined); return (typeof v === 'number' && Number.isFinite(v)) ? v : fallback; };
const Setup = await load(join(SRC, LE + '03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js'), { Na__LeCfg__Val : Val, Na__LeCfg__Num : Num });
const Scale = await load(join(SRC, LE + '07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js'), { Na__LeCfg__GetScaleSetup : Setup.Na__LeCfg__GetScaleSetup });
const SpC   = await load(join(SRC, LE + '25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js'), { Na__LeScale__Coerce : Scale.Na__LeScale__Coerce });
const RC    = await load(join(SRC, LE + '25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js'), CFG);
const Rot   = await load(join(SRC, LE + '20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js'), {});
const Rec   = await load(join(SRC, LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js'), Object.assign({}, ES, RC, SpC, {
    Na__LeCfg__GetViewportSetup : Setup.Na__LeCfg__GetViewportSetup, Na__LeScale__Coerce : Scale.Na__LeScale__Coerce,
    Na__LeHatch__FIELD : 'Viewport__SitePlanHatches', Na__LeHatch__CAT_FIELD : 'Hatches__Categories',
    Na__LeVpRot__FIELD : Rot.Na__LeVpRot__FIELD, Na__LeVpRot__WrapDeg : Rot.Na__LeVpRot__WrapDeg
}));
const tvRecord = (prefix) => ({
    Viewport__Id : 'Viewport_010', Viewport__Kind : '2d', Viewport__Name : 'Block Plan', Viewport__LayerId : 'Layer_001', Viewport__ScaleDenominator : 500,
    Viewport__FrameMm : { X : 20, Y : 20, WidthMm : 240, HeightMm : 180 }, Viewport__PanMm : { X : 1200, Y : -800 },
    Viewport__SitePlan : { SitePlan__StoreId : 'existing', SitePlan__PlanType : 'location', SitePlan__Composites : { patterns : false } },
    Viewport__ProjectedEdges : { Edges__Categories : { [prefix + 'RedLine'] : { Category__FillHex : '#FFCC00', Category__LineTypeScale : 0.5 } } }
});
const once  = Rec.Na__LeRec__NormaliseViewport(tvRecord('ValeVision__SitePlan__'), 'Layer_001');
const twice = Rec.Na__LeRec__NormaliseViewport(JSON.parse(JSON.stringify(once)), 'Layer_001');
check('it is a site plan viewport here too', Rec.Na__LeRec__IsSitePlanViewport(once), true);
check('its Viewport__SitePlan block is kept exactly as TrueVision wrote it', once.Viewport__SitePlan, tvRecord('').Viewport__SitePlan);
check('its 1:500 survives (a site plan scale)', once.Viewport__ScaleDenominator, 500);
const red = (r, prefix) => { const e = r.Viewport__ProjectedEdges.Edges__Categories[prefix + 'RedLine']; return { fill : e.Category__FillHex, scale : e.Category__LineTypeScale }; };
check('its fill override and Line scale are kept under this app\'s category prefix', red(once, 'ValeVision__SitePlan__'), { fill : '#FFCC00', scale : 0.5 });
check('a second load leaves it byte-identical', JSON.stringify(twice), JSON.stringify(once));
const tvPrefix = Rec.Na__LeRec__NormaliseViewport(tvRecord('TrueVision__SitePlan__'), 'Layer_001');
check('the one difference: under TrueVision\'s own prefix the site-plan-only fill override is not this app\'s, so it goes (the Line scale stays)',
      red(tvPrefix, 'TrueVision__SitePlan__'), { scale : 0.5 });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
