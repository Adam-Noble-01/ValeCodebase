// W1-20 scratch harness: the sheet model's units at TrueVision's level in ValeVision, proved against TrueVision's
// own units, against ValeVision's units before this package, through ValeVision's real facade and Sheets unit,
// and on ValeVision's own sheets.
//
//   node harness_w1_20.mjs --new <dir: the ten units after W1-20> --old <dir: the nine units before W1-20>
//                          --tv <dir: TrueVision's ten units at the pin> [--scales "[20,50,100,200]"] [--out <dir>]
//
// HOW IT LOADS. Node module hooks serve ValeVision's app root under a pretend address (http://w120.test/vv/), so
// every module is the file on disk, loaded as shipped: the real SheetRecords 1.39.0 (W1-19), the config units over
// the real AppConfig JSON, ScaleManager, SheetLayout, EdgeStyles, RenderComposites, HatchPatterns,
// SitePlanComposites, ViewportRotation, the margin leaves, the Sheets unit 1.1.0 and the facade 1.18.0. The sheet
// model's units are served per variant - ?variant=new|old|tv - each variant a graph of its own (its own State), so
// one scenario runs on ValeVision after this package, before it, and on TrueVision's files, side by side, over ONE
// shared SheetRecords. Common is shared (SheetRecords, Sheets and the facade import it). Imports with no variant
// (the facade's, the Sheets unit's) get --new. Only what reaches the browser, the network or a drawing's own data
// is a stand-in: ProjectData (the drawings block of the test's world), ProjectRecord, the presentation block,
// PanelHost, ModelToggle's controls, and the plan and elevation readers ResolveViewportSource asks.
//
// --scales stands in for W1-22's config row (DR-17's 1:200): it replaces Scales AvailableScaleDenominators in
// the AppConfig JSON as fetched. Without it the config is today's.
//
// Exit 0 = everything held. Writes only to the OS temp folder and to --out.

import { register } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';

// -----------------------------------------------------------------------------
// Options
// -----------------------------------------------------------------------------
const ARGS = {};
for (let i = 2; i < process.argv.length; i += 2) ARGS[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
for (const need of [ 'new', 'old', 'tv' ]) if (!ARGS[need] || !existsSync(ARGS[need])) { console.error('missing --' + need); process.exit(2); }
const HERE      = dirname(fileURLToPath(import.meta.url));
const APP_ROOT  = resolve(HERE, '..', '..', '..', '..');                                  // scratch/W1-20 -> app root
const WCP_PROJ  = resolve(APP_ROOT, '..', 'Whitecardopedia', 'Projects', '2026');
const BASE      = 'http://w120.test/vv/';
const DATA_REL  = '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/';
const UNITS     = [ 'State', 'Layers', 'Shapes', 'Viewports', 'TextAndDimensions', 'Leaders', 'Groups', 'AreaGroups', 'DrawOrder', 'Common' ];
const VARIANT_UNITS = UNITS.filter((u) => u !== 'Common');
const unitFile  = (u) => 'Na__LayoutEditor__SheetModel__' + u + '__.js';
const SCALES    = ARGS.scales ? JSON.parse(ARGS.scales) : null;
const OUT_DIR   = ARGS.out || null;
if (OUT_DIR && !existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive : true });

// -----------------------------------------------------------------------------
// The world the stand-ins answer from
// -----------------------------------------------------------------------------
globalThis.W120 = {
    token  : '2026/3047__Doous',
    code   : '3047',
    common : { Client : 'Mr J. Doous', SiteAddress : '1 Example Lane, Hamford' },
    active : { PresentationMode__SavedCameraScenes__Scenes : [
        { PresentationMode__Scene__Id : 'Scene_001', PresentationMode__Scene__Name : 'North Elevation View', PresentationMode__Scene__ElevationId : 'Elevation_001' },
        { PresentationMode__Scene__Id : 'Scene_002', PresentationMode__Scene__Name : 'Garden View' } ] },
    plans      : { Plan_001 : { FloorPlan__Id : 'Plan_001', FloorPlan__Name : 'Ground Floor Plan' } },
    elevations : { Elevation_001 : { Elevation__Id : 'Elevation_001', Elevation__Name : 'North Elevation' } },
    block  : { LayoutEditor__DrawingsData__Sheets : [] },
    saves  : 0
};

const STUBS = {
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js': [
        'const W = globalThis.W120;',
        "const Na__DrawData__SHEETS_KEY    = 'LayoutEditor__DrawingsData__Sheets';",
        "const Na__DrawData__LOADED_EVENT  = 'na-layouteditor-drawingsdata-loaded';",
        "const Na__DrawData__CHANGED_EVENT = 'na-layouteditor-drawingsdata-changed';",
        'function Na__DrawData__GetBlock()        { return W.block; }',
        'async function Na__DrawData__Save()      { W.saves++; return true; }',
        'function Na__DrawData__GetProjectCode()  { return W.token; }',
        'function Na__DrawData__GetDocumentCode() { return W.code; }',
        'function Na__DrawData__GetCommonFields() { return Object.assign({ Client : "", SiteAddress : "" }, W.common); }',
        'function Na__DrawData__SetCommonField(key, value) { W.common[key] = value; return true; }',
        'export { Na__DrawData__SHEETS_KEY, Na__DrawData__LOADED_EVENT, Na__DrawData__CHANGED_EVENT, Na__DrawData__GetBlock, Na__DrawData__Save,',
        '         Na__DrawData__GetProjectCode, Na__DrawData__GetDocumentCode, Na__DrawData__GetCommonFields, Na__DrawData__SetCommonField };'
    ].join('\n'),
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js': [
        'async function Na__LeRecord__Fetch() { return { Client : "", SiteAddress : "" }; }',
        'function Na__LeRecord__Reset() {}',
        'function Na__LeRecord__ComposeClientName(v) { return typeof v === "string" ? v : ""; }',
        'export { Na__LeRecord__Fetch, Na__LeRecord__Reset, Na__LeRecord__ComposeClientName };'
    ].join('\n'),
    '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js': [
        'function Na__PresentationMode__ProjectJson__GetActiveConfig() { return globalThis.W120.active; }',
        'export { Na__PresentationMode__ProjectJson__GetActiveConfig };'
    ].join('\n'),
    '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js': [
        'function Na__LePanels__OnControl() {} function Na__LePanels__Row() { return null; }',
        'function Na__LePanels__Input() { return null; } function Na__LePanels__Select() { return null; }',
        'function Na__LePanels__GetContext() { return { showToast : (m) => { (globalThis.W120.toasts = globalThis.W120.toasts || []).push(m); } }; }',
        'export { Na__LePanels__OnControl, Na__LePanels__Row, Na__LePanels__Input, Na__LePanels__Select, Na__LePanels__GetContext };'
    ].join('\n'),
    '02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js': [
        'function Na__ModelToggle__GetCategoryKeys() { return []; }',
        'export { Na__ModelToggle__GetCategoryKeys };'
    ].join('\n'),
    '02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js': [
        'function Na__FpData__GetPlanById(_, id) { return globalThis.W120.plans[id] || null; }',
        'export { Na__FpData__GetPlanById };'
    ].join('\n'),
    '02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js': [
        'function Na__ElevData__GetElevationById(_, id) { return globalThis.W120.elevations[id] || null; }',
        'export { Na__ElevData__GetElevationById };'
    ].join('\n')
};

// -----------------------------------------------------------------------------
// Module hooks
// -----------------------------------------------------------------------------
const SCRATCH = mkdtempSync(join(tmpdir(), 'w1-20-harness-'));
const HOOKS = [
    "import { readFileSync } from 'node:fs';",
    "let S = null;",
    "export async function initialize(data) { S = data; }",
    "function variantOf(url) { const q = url.split('?')[1]; return q ? new URLSearchParams(q).get('variant') : null; }",
    "export async function resolve(specifier, context, nextResolve) {",
    "    const parentFull = context.parentURL || '';",
    "    const parent = parentFull.split('?')[0];",
    "    if (specifier.startsWith(S.base)) return { url : specifier, shortCircuit : true };",
    "    if (parent.startsWith(S.base) && (specifier.startsWith('./') || specifier.startsWith('../'))) {",
    "        let url = new URL(specifier, parent).href;",
    "        const v = variantOf(parentFull);",
    "        const name = url.split('/').pop();",
    "        if (v && url.startsWith(S.base + S.dataRel) && S.variantUnits.includes(name)) url += '?variant=' + v;",
    "        return { url, shortCircuit : true };",
    "    }",
    "    return nextResolve(specifier, context);",
    "}",
    "export async function load(url, context, nextLoad) {",
    "    if (!url.startsWith(S.base)) return nextLoad(url, context);",
    "    const [ path, query ] = url.slice(S.base.length).split('?');",
    "    const v = query ? new URLSearchParams(query).get('variant') : null;",
    "    const name = path.split('/').pop();",
    "    if (path.startsWith(S.dataRel) && S.unitNames.includes(name)) {",
    "        return { format : 'module', source : readFileSync(S.dirs[v || 'new'] + S.sep + name, 'utf8'), shortCircuit : true };",
    "    }",
    "    if (Object.prototype.hasOwnProperty.call(S.stubs, path)) return { format : 'module', source : S.stubs[path], shortCircuit : true };",
    "    return { format : 'module', source : readFileSync(S.root + path.split('/').join(S.sep), 'utf8'), shortCircuit : true };",
    "}"
].join('\n');
writeFileSync(join(SCRATCH, 'hooks.mjs'), HOOKS);
register(pathToFileURL(join(SCRATCH, 'hooks.mjs')).href, { parentURL : import.meta.url,
    data : { base : BASE, root : APP_ROOT + sep, sep, stubs : STUBS, dataRel : DATA_REL,
             unitNames : UNITS.map(unitFile), variantUnits : VARIANT_UNITS.map(unitFile),
             dirs : { new : resolve(ARGS.new), old : resolve(ARGS.old), tv : resolve(ARGS.tv) } } });

// A browser just big enough; every announcement is kept, and fetch() reads the pretend address from disk.
const EVENTS = [];
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent(e) { EVENTS.push({ type : e.type, detail : e.detail }); return true; },
    localStorage : { getItem : () => null, setItem() {}, removeItem() {} }, setTimeout, clearTimeout, location : { search : '', hostname : 'localhost' } };
const FETCHED = [];
globalThis.fetch = async (input) => {
    const url = String(input && input.href ? input.href : input);
    if (!url.startsWith(BASE)) return { ok : false, status : 404, json : async () => null, text : async () => '' };
    const rel  = url.slice(BASE.length).split('?')[0];
    const file = join(APP_ROOT, ...rel.split('/'));
    FETCHED.push(rel);
    if (!existsSync(file)) return { ok : false, status : 404, json : async () => null, text : async () => '' };
    let text = readFileSync(file, 'utf8');
    if (SCALES && rel.endsWith('/Na__LayoutEditor__AppConfig__.json')) {
        const cfg = JSON.parse(text);
        cfg.LayoutEditor__Scales__Config.LayoutEditor__Scales__AvailableScaleDenominators = SCALES;   // <-- W1-22's 1:200 row, when asked
        text = JSON.stringify(cfg);
    }
    return { ok : true, status : 200, json : async () => JSON.parse(text), text : async () => text };
};
const quietWarn = console.warn; const WARNINGS = [];
console.warn = (...a) => { WARNINGS.push(a.map(String).join(' ')); };

// -----------------------------------------------------------------------------
// Checks
// -----------------------------------------------------------------------------
let pass = 0, fail = 0;
const FAILS = [];
function check(label, ok, detail) {
    if (ok) { pass++; console.log('  PASS  ' + label); return true; }
    fail++; FAILS.push(label);
    console.log('  FAIL  ' + label + (detail === undefined ? '' : '\n        ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1600)));
    return false;
}
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const J = (v) => JSON.stringify(v === undefined ? '__undefined__' : v);
const SANE = (v) => J(v).replace(/"Edges__UpdatedIso":"[^"]*"/g, '"Edges__UpdatedIso":"T"');   // <-- the one clock-stamped field
function diffPaths(a, b, path, out) {
    out = out || []; path = path || '';
    if (J(a) === J(b)) return out;
    if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
        new Set([ ...Object.keys(a), ...Object.keys(b) ]).forEach((k) => diffPaths(a[k], b[k], path + (Array.isArray(a) ? '[' + k + ']' : '.' + k), out));
        return out;
    }
    out.push({ path, a, b });
    return out;
}
function section(title) { console.log('\n=== ' + title); }
const heard = () => EVENTS.splice(0, EVENTS.length).filter((e) => e.type === 'na-layouteditor-sheets-changed').map((e) => e.detail.reason);

// -----------------------------------------------------------------------------
// Load
// -----------------------------------------------------------------------------
const CFG  = await import(BASE + '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js');
await CFG.Na__LeCfg__Ready();
const EDGE = await import(BASE + '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js');
if (typeof EDGE.Na__LeEdge__Ready === 'function') await EDGE.Na__LeEdge__Ready();
const R    = await import(BASE + DATA_REL + 'Na__LayoutEditor__SheetRecords__.js');
const SCALE = await import(BASE + DATA_REL + 'Na__LayoutEditor__ScaleManager__.js');
async function loadVariant(v) {
    const m = {};
    for (const u of UNITS) {
        if (v === 'old' && u === 'AreaGroups') continue;
        m[u] = await import(BASE + DATA_REL + unitFile(u) + '?variant=' + v);
    }
    return m;
}
const V = { new : await loadVariant('new'), old : await loadVariant('old'), tv : await loadVariant('tv') };
console.log('loaded: config ready; the real SheetRecords; three variants of the sheet model units; scales '
    + J(SCALE.Na__LeScale__ListDenominators()) + (SCALES ? ' (W1-22 row emulated)' : ' (today\'s config)'));

// -----------------------------------------------------------------------------
// A. Links and exports
// -----------------------------------------------------------------------------
section('A. Links and exports');
const names = (m) => Object.keys(m).sort();
for (const u of UNITS) {
    check(u + ': exports exactly TrueVision\'s names (' + names(V.tv[u]).length + ')', J(names(V.new[u])) === J(names(V.tv[u])),
        { onlyNew : names(V.new[u]).filter((n) => !names(V.tv[u]).includes(n)), onlyTv : names(V.tv[u]).filter((n) => !names(V.new[u]).includes(n)) });
    if (V.old[u]) check(u + ': every name the unit exported before is still exported', names(V.old[u]).every((n) => names(V.new[u]).includes(n)),
        names(V.old[u]).filter((n) => !names(V.new[u]).includes(n)));
}
const FACADE = await import(BASE + DATA_REL + 'Na__LayoutEditor__SheetModel__.js');
const SHEETS = await import(BASE + DATA_REL + 'Na__LayoutEditor__SheetModel__Sheets__.js');
check('the facade 1.18.0 links over the new units and re-exports ' + names(FACADE).length + ' names, every one defined',
    names(FACADE).length > 80 && names(FACADE).every((n) => FACADE[n] !== undefined), names(FACADE).filter((n) => FACADE[n] === undefined));
check('the Sheets unit 1.1.0 links over the new State and the shared Common', typeof SHEETS.Na__LeModel__GetSheets === 'function');
check('AreaGroups links with nothing importing it yet (G2 checks every module) and holds the areas reason',
    V.new.AreaGroups.Na__LeModel__AREAS_REASON === 'areas' && typeof V.new.AreaGroups.Na__LeModel__AddAreaGroup === 'function');

// -----------------------------------------------------------------------------
// The fixture: a sheet as ValeVision stores it after W1-19, normalised by the real SheetRecords
// -----------------------------------------------------------------------------
const L = (id, name, type, order, extra) => Object.assign({ Layer__Id : id, Layer__Name : name, Layer__Type : type, Layer__Visible : true, Layer__Locked : false, Layer__Order : order }, extra || {});
function fixture() {
    const s = {
        Sheet__Id : 'Sheet_001', Sheet__Name : 'Elevations', Sheet__Order : 1, Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape', Sheet__LayerStack : 2,
        Sheet__Fields : {},
        Sheet__Layers : [ L('Layer_002', 'Text', 'annotation', 1), L('Layer_003', 'Dimensions', 'dimension', 2), L('Layer_004', 'Vectors', 'vector', 3),
                          L('Layer_005', 'Floor Areas', 'area', 4), L('Layer_006', 'Construction Lines', 'mixed', 5), L('Layer_001', 'Viewports', 'viewport', 6) ],
        Sheet__Viewports : [
            { Viewport__Id : 'Viewport_001', Viewport__Kind : '2d', Viewport__LayerId : 'Layer_001', Viewport__DrawingId : 'Elevation_001', Viewport__SceneId : 'Scene_001',
              Viewport__FrameMm : { X : 30, Y : 25, WidthMm : 180, HeightMm : 120 }, Viewport__ScaleDenominator : 50,
              Viewport__ProjectedEdges : { Edges__UpdatedIso : '2026-09-29T10:00:00Z', Edges__Categories : {
                  Walls : { Category__EdgeWeightFactor : 2, Category__EdgeColour : 'ink', Category__EdgeLineType : 'solid', Category__LineTypeScale : 2.5 } } } },
            { Viewport__Id : 'Viewport_002', Viewport__Kind : '3d', Viewport__LayerId : 'Layer_001', Viewport__SceneId : 'Scene_002',
              Viewport__FrameMm : { X : 220, Y : 25, WidthMm : 150, HeightMm : 120 }, Viewport__ScaleDenominator : 100 }
        ],
        Sheet__Annotations : [
            { Annotation__Id : 'Text_001', Annotation__LayerId : 'Layer_002', Annotation__Text : 'North Elevation', Annotation__PosXMm : 40, Annotation__PosYMm : 160 },
            { Annotation__Id : 'Text_002', Annotation__LayerId : 'Layer_002', Annotation__Text : 'Scale 1:50', Annotation__PosXMm : 40, Annotation__PosYMm : 166 } ],
        Sheet__Dimensions : [
            { Dimension__Id : 'Dim_001', Dimension__LayerId : 'Layer_003', Dimension__ViewportId : 'Viewport_001', Dimension__StartXMm : 40, Dimension__StartYMm : 140, Dimension__EndXMm : 120, Dimension__EndYMm : 140 },
            { Dimension__Id : 'Dim_002', Dimension__LayerId : 'Layer_003', Dimension__StartXMm : 40, Dimension__StartYMm : 30, Dimension__EndXMm : 40, Dimension__EndYMm : 130, Dimension__Orientation : 'vertical' } ],
        Sheet__Shapes : [
            { Shape__Id : 'Shape_001', Shape__LayerId : 'Layer_004', Shape__Points : [ [ 30, 20 ], [ 210, 20 ] ] },
            { Shape__Id : 'Shape_002', Shape__LayerId : 'Layer_006', Shape__Points : [ [ 30, 22 ], [ 210, 22 ] ], Shape__StrokeColour : '#ff0000' },
            { Shape__Id : 'Shape_003', Shape__LayerId : 'Layer_006', Shape__Points : [ [ 50, 50 ], [ 80, 50 ], [ 80, 70 ], [ 50, 70 ] ], Shape__Closed : true,
              Shape__Area : { Area__Name : 'Kitchen', Area__Group : 'Ground Floor' } } ],
        Sheet__Leaders : [
            { Leader__Id : 'Leader_001', Leader__LayerId : 'Layer_002', Leader__Type : 'bubble', Leader__Text : 'EX01', Leader__TipXMm : 90, Leader__TipYMm : 60, Leader__AnchorXMm : 100, Leader__AnchorYMm : 50 },
            { Leader__Id : 'Leader_002', Leader__LayerId : 'Layer_002', Leader__Type : 'text', Leader__Text : 'Brick', Leader__TipXMm : 60, Leader__TipYMm : 60, Leader__AnchorXMm : 70, Leader__AnchorYMm : 40 } ],
        Sheet__Groups : [
            { Group__Id : 'Group_001', Group__Members : [ { kind : 'viewport', id : 'Viewport_001' }, { kind : 'leader', id : 'Leader_001' }, { kind : 'dimension', id : 'Dim_001' }, { kind : 'annotation', id : 'Text_001' } ] },
            { Group__Id : 'Group_002', Group__Members : [ { kind : 'leader', id : 'Leader_002' }, { kind : 'dimension', id : 'Dim_002' } ] } ],
        Sheet__AreaGroups : [ { AreaGroup__Name : 'Ground Floor', AreaGroup__Colour : '#eeeeee' } ],
        Sheet__MarginNotes : { Enabled : true, WidthMm : 90, RegionsOn : true,
            Regions : [ { Region__Id : 'Region_001', Region__FrameMm : { X : 20, Y : 180, WidthMm : 120, HeightMm : 60 }, Region__Title : 'Notes', Region__Overspill : true,
                          Region__Groups : [ 'SpecGroup_002' ], Region__Borders : { Top : true, Right : true, Bottom : true, Left : false } } ],
            LeaderlessOn : true, LeaderlessGroups : [ 'SpecGroup_004', 'SpecGroup_001' ] }
    };
    R.Na__LeRec__NormaliseSheet(s, 0);
    return s;
}
const reload = (sheet) => { const c = clone(sheet); R.Na__LeRec__NormaliseSheet(c, 0); return c; };
const members = (sheet, gid) => { const g = (sheet.Sheet__Groups || []).find((x) => x.Group__Id === gid); return g ? g.Group__Members.map((m) => m.kind + ':' + m.id) : null; };
const layerOf = (sheet, list, key, id, field) => { const r = (sheet[list] || []).find((x) => x[key] === id); return r ? r[field] : undefined; };
const shapeLayer = (sheet, id) => layerOf(sheet, 'Sheet__Shapes', 'Shape__Id', id, 'Shape__LayerId');
const hasLayer = (sheet, id) => (sheet.Sheet__Layers || []).some((l) => l.Layer__Id === id);

// -----------------------------------------------------------------------------
// B. The same script on ValeVision's new units and on TrueVision's: every answer, every sheet and every
//    announcement identical (and how ValeVision's units before this package differ)
// -----------------------------------------------------------------------------
section('B. One script, three variants: new = TrueVision, step by step');
function script(M) {
    const trace = [];
    let s = fixture();
    const step = (name, fn) => {
        heard();
        let out;
        try { out = fn(); } catch (error) { out = { threw : String(error && error.message || error) }; }
        trace.push({ name, out : SANE(out), sheet : SANE(s), said : J(heard()) });
    };
    const id = (o) => (o && typeof o === 'object') ? (o.Shape__Id || o.Layer__Id || o.Viewport__Id || o.Dimension__Id || o.Leader__Id || o.Group__Id || o.Annotation__Id || null) : o;
    M.State.Na__LeModel__AssignActiveSheetId('Sheet_001');
    M.State.Na__LeModel__AssignSelectionItems([]);
    step('State constants', () => [ M.State.Na__LeModel__LAYER_TYPES, M.State.Na__LeModel__STYLE_KEYS, M.State.Na__LeModel__DRAWING_ARCHITECTURAL, M.State.Na__LeModel__DRAWING_SITEPLAN ]);
    step('State Revision moves with an announcement', () => { const a = M.State.Na__LeModel__Revision; M.State.Na__LeModel__Touch('test', 'Sheet_001'); return M.State.Na__LeModel__Revision - a; });
    step('Layers GetLayers', () => M.Layers.Na__LeModel__GetLayers(s).map((l) => l.Layer__Name));
    step('Layers LayerIndexAboveDrawings', () => M.Layers.Na__LeModel__LayerIndexAboveDrawings(s));
    step('Layers GetLayerByName', () => id(M.Layers.Na__LeModel__GetLayerByName(s, ' construction  LINES ')));
    step('Layers LayerIndexLike', () => M.Layers.Na__LeModel__LayerIndexLike(s, [ 'Text', 'Guides', 'Dimensions' ], 1));
    step('Layers CreateLayer silent at the top', () => id(M.Layers.Na__LeModel__CreateLayer(s, { name : 'Guides', type : 'mixed', index : 0, silent : true })));
    step('Layers UpdateLayer to reference trims the selection', () => {
        M.State.Na__LeModel__AssignSelectionItems([ { kind : 'shape', id : 'Shape_002' }, { kind : 'shape', id : 'Shape_001' } ]);
        M.Layers.Na__LeModel__UpdateLayer(s, 'Layer_006', { selectable : false });
        return M.State.Na__LeModel__SelectionItems;
    });
    step('Layers IsLayerSelectable / IsItemPickable', () => [ M.Layers.Na__LeModel__IsLayerSelectable(s, 'Layer_006'), M.Layers.Na__LeModel__IsItemPickable(s, { kind : 'shape', id : 'Shape_002' }),
                                                          M.Layers.Na__LeModel__IsItemPickable(s, { kind : 'group', id : 'Group_001' }) ]);
    step('Layers UpdateLayer back to selectable, silent', () => M.Layers.Na__LeModel__UpdateLayer(s, 'Layer_006', { selectable : true }, true));
    step('Layers ItemLayerId for each kind', () => [ 'viewport:Viewport_001', 'annotation:Text_001', 'dimension:Dim_001', 'shape:Shape_002', 'leader:Leader_001', 'group:Group_001' ]
        .map((k) => M.Layers.Na__LeModel__ItemLayerId(s, { kind : k.split(':')[0], id : k.split(':')[1] })));
    step('Layers MoveToLayer', () => M.Layers.Na__LeModel__MoveToLayer(s, [ { kind : 'shape', id : 'Shape_001' }, { kind : 'annotation', id : 'Text_002' }, { kind : 'group', id : 'Group_002' } ], 'Layer_006'));
    step('Layers ReorderLayer', () => M.Layers.Na__LeModel__ReorderLayer(s, 'Layer_006', 1));
    step('Shapes InsertShape, a dead layer id', () => id(M.Shapes.Na__LeModel__InsertShape(s, { Shape__LayerId : 'Layer_999', Shape__Points : [ [ 1, 1 ], [ 9, 9 ] ] }, true)));
    step('Shapes InsertShape, a room on a dead layer', () => id(M.Shapes.Na__LeModel__InsertShape(s, { Shape__LayerId : 'Layer_998', Shape__Closed : true,
        Shape__Points : [ [ 0, 0 ], [ 10, 0 ], [ 10, 10 ] ], Shape__Area : { Area__Name : 'Hall', Area__Group : 'Ground Floor' } }, true)));
    step('Shapes InsertShape, a picture with no Images layer', () => id(M.Shapes.Na__LeModel__InsertShape(s, { Shape__LayerId : null, Shape__Points : [ [ 0, 0 ], [ 40, 0 ], [ 40, 30 ], [ 0, 30 ] ],
        Shape__Image : { Image__File : 'abc123.png', Image__Folder : '3047_D01', Image__PixelW : 4000, Image__PixelH : 3000 } }, false)));
    step('Shapes InsertShape after another shape', () => id(M.Shapes.Na__LeModel__InsertShape(s, { Shape__LayerId : 'Layer_004', Shape__Points : [ [ 2, 2 ], [ 3, 3 ] ] }, true, 'Shape_001')));
    step('Shapes CreateShape with hatch, curve and holes', () => id(M.Shapes.Na__LeModel__CreateShape(s, [ [ 0, 0 ], [ 100, 0 ], [ 100, 100 ], [ 0, 100 ], [ 20, 20 ], [ 40, 20 ], [ 40, 40 ] ],
        { closed : true, hatch : { Hatch__PatternKey : 'ConstructionHatch__Brickwork', Hatch__Scale : 2 }, curve : { Curve__Kind : 'circle' }, holes : [ 4 ], fillColour : '#cccccc' })));
    step('Shapes UpdateShape qr, area, curve, holes, hatch', () => {
        const last = s.Sheet__Shapes[s.Sheet__Shapes.length - 1].Shape__Id;
        M.Shapes.Na__LeModel__UpdateShape(s, last, { hatch : { Hatch__RotationDeg : 30 }, curve : null, holes : [], qr : { Qr__MarginMm : 2 } }, true);
        M.Shapes.Na__LeModel__UpdateShape(s, 'Shape_003', { area : { Area__Label : 'both' } });
        return [ M.Shapes.Na__LeModel__ShapeLayerType(s.Sheet__Shapes.find((x) => x.Shape__Id === 'Shape_003')), last ];
    });
    step('Shapes AnnounceShapes', () => M.Shapes.Na__LeModel__AnnounceShapes(s, 'Shape_001'));
    step('Viewports CreateViewport with rotation and model source', () => id(M.Viewports.Na__LeModel__CreateViewport(s, { kind : '2d', drawingId : 'Plan_001', rect : { X : 30, Y : 160, WidthMm : 100, HeightMm : 80 },
        scaleDenominator : 100, rotationDeg : 450, modelSourceId : 'Group_Proposed' })));
    step('Viewports UpdateViewport: rotation, swings, frame, doors, fog, edges, weights, model source, scale 1:200', () => {
        M.Viewports.Na__LeModel__UpdateViewport(s, 'Viewport_001', { rotationDeg : -90, hideSwings : true, showFrame : false, closedDoors : [ 'ADR002__Door', 'ADR001__Door' ],
            styles : { depthFog : false }, projectedEdges : { Doors : { Category__EdgeWeightFactor : 1, Category__LineTypeScale : 0.5 } }, compositeWeights : { Unknown : 2 },
            modelSourceId : 'Group_Existing', scaleDenominator : 200 });
        return M.Viewports.Na__LeModel__GetViewportById(s, 'Viewport_001');
    });
    step('Viewports UpdateViewport hideSwings null', () => M.Viewports.Na__LeModel__UpdateViewport(s, 'Viewport_001', { hideSwings : null }, true));
    step('Viewports a site plan viewport and its patch keys', () => {
        const vp = M.Viewports.Na__LeModel__CreateViewport(s, { kind : '2d', rect : { X : 250, Y : 160, WidthMm : 100, HeightMm : 80 }, scaleDenominator : 500, sitePlan : { SitePlan__StoreId : 'Existing' } });
        M.Viewports.Na__LeModel__UpdateViewport(s, vp.Viewport__Id, { sitePlanStoreId : 'Proposed', sitePlanPlanType : 'block', sitePlanComposites : { fills : false },
            sitePlanHatch : { categoryKey : 'ValeVision__SitePlan__Wood', changes : { Hatch__Scale : 0.5 } }, scaleDenominator : 1250 });
        return [ M.Viewports.Na__LeModel__IsSitePlanViewport(vp), vp ];
    });
    step('Viewports ResolveViewportSource', () => s.Sheet__Viewports.map((v) => { const r = M.Viewports.Na__LeModel__ResolveViewportSource(v); return [ r.kind, r.label, !!r.plan, !!r.elevation, !!r.scene ]; }));
    step('Viewports InsertViewport silent', () => id(M.Viewports.Na__LeModel__InsertViewport(s, s.Sheet__Viewports[1], true)));
    step('TextAndDimensions CreateDimension at scale, round up, line pt, dash, extensions', () => id(M.TextAndDimensions.Na__LeModel__CreateDimension(s, { x : 10, y : 10 }, { x : 60, y : 10 },
        { atScale : true, roundUp : true, linePt : 0.35, dash : { LineStyle__Kind : 'dashed' }, startExtensionMm : 3, endExtensionMm : 4, extensionsLinked : false, viewportId : 'Viewport_001' })));
    step('TextAndDimensions UpdateDimension', () => M.TextAndDimensions.Na__LeModel__UpdateDimension(s, 'Dim_002', { roundUp : true, linePt : null, dash : { LineStyle__Kind : 'dotted' }, atScale : false, endExtensionMm : 2 }));
    step('TextAndDimensions annotation create, insert, update', () => {
        const a = M.TextAndDimensions.Na__LeModel__CreateAnnotation(s, 10, 200, { text : 'Hello', rotationDeg : 370 });
        const b = M.TextAndDimensions.Na__LeModel__InsertAnnotation(s, a, true);
        M.TextAndDimensions.Na__LeModel__UpdateAnnotation(s, b.Annotation__Id, { text : 'World', rotationDeg : 0 });
        return [ id(a), id(b) ];
    });
    step('Leaders create, insert, update', () => {
        const a = M.Leaders.Na__LeModel__CreateLeader(s, { x : 5, y : 5 }, { x : 15, y : 15 }, { type : 'bubble', text : 'EX02', specNoteId : ' Note_007 ' });
        const b = M.Leaders.Na__LeModel__InsertLeader(s, Object.assign({}, a, { Leader__LayerId : 'Layer_404' }), true);
        M.Leaders.Na__LeModel__UpdateLeader(s, b.Leader__Id, { specNoteId : null, text : 'EX03' });
        return [ id(a), id(b), b.Leader__LayerId ];
    });
    step('Groups InsertGroup, AddGroupMember', () => {
        const g = M.Groups.Na__LeModel__InsertGroup(s, { Group__Members : [ { kind : 'shape', id : 'Shape_002' }, { kind : 'shape', id : 'Shape_003' } ] }, true);
        return [ id(g), M.Groups.Na__LeModel__AddGroupMember(s, g.Group__Id, { kind : 'leader', id : 'Leader_003' }), M.Groups.Na__LeModel__AddGroupMember(s, g.Group__Id, { kind : 'leader', id : 'Leader_001' }) ];
    });
    step('Delete a shape elsewhere: every group keeps its viewport, leader and dimension members', () => [ M.Shapes.Na__LeModel__DeleteShape(s, 'Shape_001'), members(s, 'Group_001'), members(s, 'Group_002') ]);
    step('DeleteLeader prunes', () => [ M.Leaders.Na__LeModel__DeleteLeader(s, 'Leader_002'), members(s, 'Group_002') ]);
    step('DeleteDimension prunes', () => [ M.TextAndDimensions.Na__LeModel__DeleteDimension(s, 'Dim_001'), members(s, 'Group_001') ]);
    step('DeleteViewport prunes', () => [ M.Viewports.Na__LeModel__DeleteViewport(s, 'Viewport_001'), members(s, 'Group_001') ]);
    step('DeleteItems silent', () => M.Groups.Na__LeModel__DeleteItems(s, [ { kind : 'annotation', id : 'Text_002' }, { kind : 'shape', id : 'Shape_404' } ], true));
    step('AreaGroups add, rename, colour, move, delete, announce', () => {
        const A = M.AreaGroups;
        if (!A) return 'no AreaGroups unit';
        return [ A.Na__LeModel__AddAreaGroup(s, ' First   Floor ', '#ddd'), A.Na__LeModel__AddAreaGroup(s, 'ground floor'),
                 A.Na__LeModel__RenameAreaGroup(s, 'Ground Floor', 'Ground'), A.Na__LeModel__SetAreaGroupColour(s, 'ground', '#fafafa'),
                 A.Na__LeModel__MoveAreaGroup(s, 'First Floor', -1), A.Na__LeModel__DeleteAreaGroup(s, 'Ground', true), A.Na__LeModel__AnnounceAreas(s),
                 A.Na__LeModel__GetAreaGroups(s), A.Na__LeModel__AreaGroupKey('  A   b ') ];
    });
    step('DrawOrder CanArrange and Arrange', () => [ M.DrawOrder.Na__LeModel__CanArrange(s, 'shape', 'Shape_002', 'back'),
                                                     M.DrawOrder.Na__LeModel__Arrange(s, 'shape', 'Shape_002', 'back'),
                                                     M.DrawOrder.Na__LeModel__CanArrange(s, 'shape', 'Shape_002', 'back') ]);
    step('Layers DeleteLayer re-homes a vector, a room and a picture', () => {
        const pic = s.Sheet__Shapes.find((x) => x.Shape__Image);
        if (pic) pic.Shape__LayerId = 'Layer_006';
        M.Layers.Na__LeModel__DeleteLayer(s, 'Layer_006');
        return s.Sheet__Shapes.map((x) => x.Shape__Id + '@' + x.Shape__LayerId);
    });
    step('Reload (a JSON copy through the real SheetRecords)', () => reload(s));
    return trace;
}
const T = { new : script(V.new), tv : script(V.tv), old : script(V.old) };
const mismatched = T.new.map((row, k) => ({ row, tv : T.tv[k] })).filter((x) => x.row.out !== x.tv.out || x.row.sheet !== x.tv.sheet || x.row.said !== x.tv.said);
check('new = TrueVision on all ' + T.new.length + ' steps: every answer, the sheet after each, and every announcement', mismatched.length === 0,
    mismatched.slice(0, 3).map((x) => ({ step : x.row.name, out : [ x.row.out.slice(0, 300), x.tv.out.slice(0, 300) ], said : [ x.row.said, x.tv.said ],
                                        sheet : diffPaths(JSON.parse(x.row.sheet), JSON.parse(x.tv.sheet)).slice(0, 4) })));
const threwNew = T.new.filter((r) => r.out.indexOf('"threw"') !== -1).map((r) => r.name + ': ' + r.out);
check('no step throws on the new units', threwNew.length === 0, threwNew);
const oldDiffers = T.old.map((row, k) => ({ name : row.name, differs : row.out !== T.new[k].out || row.sheet !== T.new[k].sheet || row.said !== T.new[k].said, threw : row.out.indexOf('"threw"') !== -1 }));
console.log('  (before this package: ' + oldDiffers.filter((d) => d.differs).length + ' of ' + oldDiffers.length + ' steps answer differently, '
    + oldDiffers.filter((d) => d.threw).length + ' of them because the function did not exist)');

// -----------------------------------------------------------------------------
// C. Acceptance 1: groups that hold a leader, a dimension or a viewport; a deleted layer's vectors
// -----------------------------------------------------------------------------
section('C. Acceptance 1 - groups survive a delete elsewhere and a reload; a deleted layer\'s vector goes to Vectors');
for (const v of [ 'new', 'old' ]) {
    const M = V[v];
    M.State.Na__LeModel__AssignActiveSheetId('Sheet_001');
    const s = fixture();
    const before = [ members(s, 'Group_001'), members(s, 'Group_002') ];
    M.Shapes.Na__LeModel__DeleteShape(s, 'Shape_002');                                       // <-- a delete elsewhere: the prune runs
    const afterShape = [ members(s, 'Group_001'), members(s, 'Group_002') ];
    M.Groups.Na__LeModel__DeleteItems(s, [ { kind : 'annotation', id : 'Text_002' } ]);       // <-- and a multi-item delete elsewhere
    const afterItems = [ members(s, 'Group_001'), members(s, 'Group_002') ];
    const back = reload(s);
    W120.block = { LayoutEditor__DrawingsData__Sheets : [ clone(s) ] };                       // <-- the same through the Sheets unit's GetSheets
    const viaSheets = SHEETS.Na__LeModel__GetSheets()[0];
    const afterReload = [ members(back, 'Group_001'), members(back, 'Group_002'), members(viaSheets, 'Group_001'), members(viaSheets, 'Group_002') ];
    if (v === 'new') {
        check('new: a group holding a viewport, a leader, a dimension and a note keeps all four through a shape delete elsewhere', J(afterShape) === J(before), { before, afterShape });
        check('new: and through a DeleteItems elsewhere', J(afterItems) === J(before), { before, afterItems });
        check('new: and through a reload (SheetRecords 1.39.0 keeps the kinds; the Sheets unit\'s GetSheets the same)',
            J(afterReload) === J([ before[0], before[1], before[0], before[1] ]), afterReload);
    } else {
        check('before (control): the old PruneGroups dropped those members on the first delete - the bug this package closes',
            J(afterShape[0]) === J([ 'annotation:Text_001' ]) || members(s, 'Group_001') === null, { afterShape });
        console.log('        old after a shape delete elsewhere: Group_001 ' + J(afterShape[0]) + ', Group_002 ' + J(afterShape[1]));
    }
}
{
    const M = V.new;
    const s = fixture();
    M.Leaders.Na__LeModel__DeleteLeader(s, 'Leader_001');
    check('new: DeleteLeader takes the leader out of its group, the rest stay', J(members(s, 'Group_001')) === J([ 'viewport:Viewport_001', 'dimension:Dim_001', 'annotation:Text_001' ]), members(s, 'Group_001'));
    M.TextAndDimensions.Na__LeModel__DeleteDimension(s, 'Dim_002');
    check('new: DeleteDimension prunes, and a group left with one member dissolves', members(s, 'Group_002') === null, s.Sheet__Groups);
    M.Viewports.Na__LeModel__DeleteViewport(s, 'Viewport_001');
    check('new: DeleteViewport prunes too', J(members(s, 'Group_001')) === J([ 'dimension:Dim_001', 'annotation:Text_001' ]), members(s, 'Group_001'));
    const o = fixture();
    V.old.Leaders.Na__LeModel__DeleteLeader(o, 'Leader_001');
    console.log('        old DeleteLeader left Group_001 ' + J(members(o, 'Group_001')) + ' (no prune: the dead leader stays named)');
}
for (const v of [ 'new', 'old', 'tv' ]) {
    const M = V[v];
    const s = fixture();
    M.Layers.Na__LeModel__DeleteLayer(s, 'Layer_006');                                        // <-- Construction Lines held a line and a room
    const line = shapeLayer(s, 'Shape_002'), room = shapeLayer(s, 'Shape_003');
    if (v === 'old') {
        check('before (control): the old DeleteLayer left the vector on the deleted layer', line === 'Layer_006' && !hasLayer(s, 'Layer_006'), { line, room });
    } else {
        check(v + ': deleting a layer that holds a vector moves the vector to the Vectors layer (Layer_004)', line === 'Layer_004' && hasLayer(s, line), { line });
        check(v + ': and a measured room on it to the Floor Areas layer (Layer_005)', room === 'Layer_005', { room });
    }
}
{
    const s = fixture();
    s.Sheet__Layers = s.Sheet__Layers.filter((l) => l.Layer__Id !== 'Layer_005');            // <-- no Floor Areas layer
    s.Sheet__Shapes.push({ Shape__Id : 'Shape_004', Shape__LayerId : 'Layer_006', Shape__Points : [ [ 0, 0 ], [ 40, 0 ], [ 40, 30 ], [ 0, 30 ] ], Shape__Closed : true,
        Shape__Image : { Image__File : 'abc.png', Image__Folder : '3047_D01', Image__PixelW : 4000, Image__PixelH : 3000 } });
    R.Na__LeRec__NormaliseSheet(s, 0);
    V.new.Layers.Na__LeModel__DeleteLayer(s, 'Layer_006');
    check('new: with no Floor Areas or Images layer, the room and the picture fall back as SheetRecords says (Vectors), never to a dead id',
        [ 'Shape_002', 'Shape_003', 'Shape_004' ].every((id) => hasLayer(s, shapeLayer(s, id))), s.Sheet__Shapes.map((x) => x.Shape__Id + '@' + x.Shape__LayerId));
}

// -----------------------------------------------------------------------------
// D. Acceptance 2: what survives a reload; a scrapbook drop naming a missing layer
// -----------------------------------------------------------------------------
section('D. Acceptance 2 - margin regions, leaderless groups, depthFog, LineTypeScale and 1:200 survive a reload; a drop on a missing layer');
{
    const M = V.new;
    const s = fixture();
    const regions = clone(s.Sheet__MarginNotes.Regions), leaderless = clone(s.Sheet__MarginNotes.LeaderlessGroups);
    check('the fixture holds margin regions and leaderless groups after its first normalise', regions.length === 1 && leaderless.length === 2, s.Sheet__MarginNotes);
    // Edits through every unit, then a reload two ways
    M.Viewports.Na__LeModel__UpdateViewport(s, 'Viewport_001', { styles : { depthFog : false } });
    M.Viewports.Na__LeModel__UpdateViewport(s, 'Viewport_002', { styles : { depthFog : true } });
    M.Viewports.Na__LeModel__UpdateViewport(s, 'Viewport_001', { projectedEdges : { Doors : { Category__EdgeWeightFactor : 1, Category__EdgeColour : 'ink', Category__EdgeLineType : 'solid', Category__LineTypeScale : 0.5 } } });
    const asked = M.Viewports.Na__LeModel__UpdateViewport(s, 'Viewport_001', { scaleDenominator : 200 });
    const scaleNow = M.Viewports.Na__LeModel__GetViewportById(s, 'Viewport_001').Viewport__ScaleDenominator;
    M.Layers.Na__LeModel__CreateLayer(s, { name : 'Guides', type : 'mixed' });
    M.Shapes.Na__LeModel__CreateShape(s, [ [ 0, 0 ], [ 5, 5 ] ], {});
    M.Leaders.Na__LeModel__CreateLeader(s, { x : 1, y : 1 }, { x : 2, y : 2 }, {});
    const back = reload(s);
    W120.block = { LayoutEditor__DrawingsData__Sheets : [ clone(s) ] };
    const via = SHEETS.Na__LeModel__GetSheets()[0];
    for (const [ how, r ] of [ [ 'a JSON reload', back ], [ 'the Sheets unit\'s GetSheets', via ] ]) {
        const vp1 = r.Sheet__Viewports.find((x) => x.Viewport__Id === 'Viewport_001');
        const vp2 = r.Sheet__Viewports.find((x) => x.Viewport__Id === 'Viewport_002');
        const cats = vp1.Viewport__ProjectedEdges && vp1.Viewport__ProjectedEdges.Edges__Categories;
        check(how + ': the margin regions survive, byte for byte', J(r.Sheet__MarginNotes.Regions) === J(regions), r.Sheet__MarginNotes.Regions);
        check(how + ': the leaderless groups survive, in their order', J(r.Sheet__MarginNotes.LeaderlessGroups) === J(leaderless) && r.Sheet__MarginNotes.LeaderlessOn !== false, r.Sheet__MarginNotes);
        check(how + ': depthFog survives, off where it was switched off and on where on', vp1.Viewport__Styles.depthFog === false && vp2.Viewport__Styles.depthFog === true, [ vp1.Viewport__Styles, vp2.Viewport__Styles ]);
        check(how + ': Category__LineTypeScale survives on both categories (2.5 and 0.5)', cats && cats.Walls && cats.Walls.Category__LineTypeScale === 2.5 && cats.Doors && cats.Doors.Category__LineTypeScale === 0.5, cats);
        if (SCALES && SCALES.indexOf(200) !== -1) {
            check(how + ': with 1:200 configured (W1-22\'s row), a 1:200 viewport is set and survives', asked === true && scaleNow === 200 && vp1.Viewport__ScaleDenominator === 200, { scaleNow, after : vp1.Viewport__ScaleDenominator });
        } else {
            console.log('        ' + how + ': 1:200 is not on today\'s list ' + J(SCALE.Na__LeScale__ListDenominators()) + ', so the viewport reads 1:' + vp1.Viewport__ScaleDenominator + ' (W1-22 adds 1:200; run with --scales)');
        }
        check(how + ': the groups, the area groups and the layer stack are kept', J(members(r, 'Group_001')) === J(members(s, 'Group_001')) && J(r.Sheet__AreaGroups) === J(s.Sheet__AreaGroups) && r.Sheet__LayerStack === 2,
            { groups : r.Sheet__Groups, areas : r.Sheet__AreaGroups, stack : r.Sheet__LayerStack });
    }
}
for (const v of [ 'new', 'tv', 'old' ]) {
    const M = V[v];
    const s = fixture();
    const drop = { Shape__Id : 'Shape_777', Shape__LayerId : 'Layer_999', Shape__Points : [ [ 0, 0 ], [ 20, 0 ] ], Shape__StrokeColour : '#000000' };   // <-- a scrapbook item's record, its layer from another project
    const vec  = M.Shapes.Na__LeModel__InsertShape(s, clone(drop), false);
    const room = M.Shapes.Na__LeModel__InsertShape(s, Object.assign(clone(drop), { Shape__Closed : true, Shape__Points : [ [ 0, 0 ], [ 9, 0 ], [ 9, 9 ] ], Shape__Area : { Area__Name : 'Store' } }), false);
    if (v === 'old') {
        check('before (control): the old InsertShape kept the dead id "Layer_999" on the record', vec.Shape__LayerId === 'Layer_999', vec.Shape__LayerId);
    } else {
        check(v + ': a scrapbook drop naming a missing layer lands with Shape__LayerId set to an existing layer (Vectors)', vec.Shape__LayerId === 'Layer_004' && hasLayer(s, vec.Shape__LayerId), vec.Shape__LayerId);
        check(v + ': a room in the drop goes to the Floor Areas layer', room.Shape__LayerId === 'Layer_005', room.Shape__LayerId);
    }
}

// -----------------------------------------------------------------------------
// E. Through ValeVision's own facade (1.18.0) and Sheets unit (1.1.0), as the editor calls them today
// -----------------------------------------------------------------------------
section('E. Through the facade 1.18.0 and the Sheets unit 1.1.0, over the new units');
{
    W120.block = { LayoutEditor__DrawingsData__Sheets : [] };
    heard();
    const sheet = FACADE.Na__LeModel__CreateSheet({ name : 'Test Sheet' });
    check('CreateSheet: a new sheet carries TrueVision\'s five layers, the layer stack and announces once', J(FACADE.Na__LeModel__GetLayers(sheet).map((l) => l.Layer__Name)) === J([ 'Text', 'Dimensions', 'Vectors', 'Floor Areas', 'Viewports' ])
        && sheet.Sheet__LayerStack === 2 && J(heard()) === J([ 'sheet-created' ]), FACADE.Na__LeModel__GetLayers(sheet).map((l) => l.Layer__Name));
    const vp   = FACADE.Na__LeModel__CreateViewport(sheet, { kind : '2d', drawingId : 'Elevation_001', rect : { X : 30, Y : 30, WidthMm : 150, HeightMm : 100 }, scaleDenominator : 50 });
    const dim  = FACADE.Na__LeModel__CreateDimension(sheet, { x : 40, y : 140 }, { x : 120, y : 140 }, { viewportId : vp.Viewport__Id });
    const lead = FACADE.Na__LeModel__CreateLeader(sheet, { x : 80, y : 60 }, { x : 100, y : 40 }, { type : 'bubble', text : 'EX01' });
    const line = FACADE.Na__LeModel__CreateShape(sheet, [ [ 10, 10 ], [ 50, 10 ] ], {});
    const other = FACADE.Na__LeModel__CreateShape(sheet, [ [ 10, 20 ], [ 50, 20 ] ], {});
    const grp  = FACADE.Na__LeModel__InsertGroup(sheet, { Group__Members : [ { kind : 'viewport', id : vp.Viewport__Id }, { kind : 'leader', id : lead.Leader__Id },
                                                                          { kind : 'dimension', id : dim.Dimension__Id }, { kind : 'shape', id : line.Shape__Id } ] });
    FACADE.Na__LeModel__DeleteShape(sheet, other.Shape__Id);
    check('a group of a viewport, a leader, a dimension and a line survives a delete elsewhere', (FACADE.Na__LeModel__GetGroupById(sheet, grp.Group__Id) || {}).Group__Members.length === 4,
        FACADE.Na__LeModel__GetGroupById(sheet, grp.Group__Id));
    W120.block = clone(W120.block);                                                            // <-- a reload: the stored JSON, read back
    const again = FACADE.Na__LeModel__GetSheets()[0];
    check('and a reload (the facade\'s GetSheets over the stored JSON)', J(FACADE.Na__LeModel__GetGroupById(again, grp.Group__Id).Group__Members.map((m) => m.kind)) === J([ 'viewport', 'leader', 'dimension', 'shape' ]),
        FACADE.Na__LeModel__GetGroupById(again, grp.Group__Id));
    const mixed = FACADE.Na__LeModel__CreateLayer(again, { name : 'Construction Lines', type : 'mixed' });
    FACADE.Na__LeModel__UpdateShape(again, line.Shape__Id, { layerId : mixed.Layer__Id });
    FACADE.Na__LeModel__DeleteLayer(again, mixed.Layer__Id);
    const vectors = FACADE.Na__LeModel__GetLayers(again).find((l) => l.Layer__Type === 'vector');
    check('deleting a layer that holds a vector moves it to the Vectors layer, through the facade', FACADE.Na__LeModel__GetShapeById(again, line.Shape__Id).Shape__LayerId === vectors.Layer__Id,
        FACADE.Na__LeModel__GetShapeById(again, line.Shape__Id).Shape__LayerId);
    const dropped = FACADE.Na__LeModel__InsertShape(again, { Shape__LayerId : 'Layer_404', Shape__Points : [ [ 0, 0 ], [ 3, 3 ] ] });
    check('a drop naming a missing layer lands on an existing one, through the facade', dropped.Shape__LayerId === vectors.Layer__Id, dropped.Shape__LayerId);
    FACADE.Na__LeModel__SetActiveSheetId(again.Sheet__Id);
    FACADE.Na__LeModel__SetSelectionItems([ { kind : 'group', id : grp.Group__Id } ]);
    heard();
    const gone = FACADE.Na__LeModel__DeleteItems(again, [ { kind : 'group', id : grp.Group__Id } ]);
    check('DeleteItems of the group record: one record, one announcement, the members stay', gone === 1 && J(heard()) === J([ 'groups' ]) && !!FACADE.Na__LeModel__GetLeaderById(again, lead.Leader__Id), gone);
}

// -----------------------------------------------------------------------------
// F. ValeVision's own sheets (WebApps/Whitecardopedia/Projects, read only)
// -----------------------------------------------------------------------------
section('F. ValeVision\'s four local sheets: the new units and TrueVision\'s agree on every layer delete');
{
    const found = [];
    for (const folder of [ '3047__Doous', '44371__Gill', '57994__Harris__Scheme-02' ]) {
        const file = join(WCP_PROJ, folder, 'project.json');
        if (!existsSync(file)) continue;
        const data = JSON.parse(readFileSync(file, 'utf8'));
        ((data.LayoutEditor__DrawingsData || {}).LayoutEditor__DrawingsData__Sheets || []).forEach((sheet, index) => found.push({ folder, index, sheet }));
    }
    check('four sheets found', found.length === 4, found.map((f) => f.folder + '/' + f.sheet.Sheet__Id));
    for (const it of found) {
        const base = clone(it.sheet); R.Na__LeRec__NormaliseSheet(base, it.index);
        const pruneNew = clone(base), pruneOld = clone(base);
        check(it.folder + ' ' + it.sheet.Sheet__Id + ': PruneGroups changes nothing, old or new (no groups stored here)',
            V.new.Groups.Na__LeModel__PruneGroups(pruneNew) === false && V.old.Groups.Na__LeModel__PruneGroups(pruneOld) === false && J(pruneNew) === J(base));
        const agree = base.Sheet__Layers.map((layer) => {
            const a = clone(base), b = clone(base);
            V.new.Layers.Na__LeModel__DeleteLayer(a, layer.Layer__Id);
            V.tv.Layers.Na__LeModel__DeleteLayer(b, layer.Layer__Id);
            const dead = (a.Sheet__Shapes || []).filter((x) => !hasLayer(a, x.Shape__LayerId)).length;
            return { layer : layer.Layer__Name, same : SANE(a) === SANE(b), dead };
        });
        check(it.folder + ' ' + it.sheet.Sheet__Id + ': deleting each layer in turn, new = TrueVision and no vector is left on a dead layer',
            agree.every((x) => x.same && x.dead === 0), agree);
    }
}

// -----------------------------------------------------------------------------
// Result
// -----------------------------------------------------------------------------
console.warn = quietWarn;
if (WARNINGS.length) console.log('\nwarnings printed by the modules: ' + WARNINGS.length + ' (first: ' + WARNINGS[0] + ')');
console.log('fetched: ' + [ ...new Set(FETCHED) ].join(', '));
if (OUT_DIR) {
    writeFileSync(join(OUT_DIR, 'script_trace__new.json'), JSON.stringify(T.new, null, 1));
    writeFileSync(join(OUT_DIR, 'script_trace__tv.json'), JSON.stringify(T.tv, null, 1));
    writeFileSync(join(OUT_DIR, 'script_trace__old.json'), JSON.stringify(T.old, null, 1));
}
console.log('\n' + pass + ' passed, ' + fail + ' failed' + (fail ? ': ' + FAILS.join(' | ') : ''));
process.exit(fail ? 1 : 0);
