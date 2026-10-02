// W1-19 scratch harness: SheetRecords 1.39.0 in ValeVision, proved against TrueVision's file and against
// ValeVision's own sheets.
//
//   node harness_w1_19.mjs --tv <TV SheetRecords at the pin> --old <VV SheetRecords before W1-19>
//                          --new <VV SheetRecords after W1-19> [--r2 <dir of R2 project.json copies>]
//                          [--out <dir for the evidence JSON>]
//
// HOW IT LOADS. Node module hooks serve ValeVision's app root under a pretend address
// (http://w119.test/vv/), so every module is the file on disk, loaded exactly as shipped. SheetRecords is
// served three times, once per variant (?variant=tv|old|new), all three resolving their imports against
// ValeVision's SheetRecords path - so the three share ONE copy of every dependency: ValeVision's real config
// units over its real AppConfig JSON, its ScaleManager, SheetLayout, the margin leaves, ShapeRings,
// EdgeStyles with ModelLayers, RenderComposites, HatchPatterns, SitePlanComposites, GradientTool,
// LineStyleTool, SheetImages Geometry, ViewportRotation, the DrawingCode leaf and the real Common unit.
// Only what reaches the browser or the network is a stand-in: ProjectData (the project token, the document
// code and the pack's common fields, from the test's world), ProjectRecord, the presentation block,
// PanelHost and ModelToggle's controls. fetch() reads the pretend address from disk.
//
// WHAT IT PROVES.
//   A. Exports: the new file exports exactly TrueVision's names plus Na__LeRec__SheetShortCode, and every
//      name ValeVision's current importers take from it.
//   B. Golden fixture (every field of S03b b2 rows 1-44, plus edge cases): the new file normalises it
//      byte-identical to TrueVision's file, every exported function agrees on every case - apart from the
//      documented seams, each of which is shown to be exactly what the PORT NOTE says.
//   C. ValeVision's four local sheets: each restacks once, a second normalise is byte-identical, and against
//      ValeVision's CURRENT normaliser the only changes are the S03b-V04 whitelist.
//   D. (with --r2) the same on the R2 copies of the same projects.
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
for (const need of [ 'tv', 'old', 'new' ]) if (!ARGS[need] || !existsSync(ARGS[need])) { console.error('missing --' + need); process.exit(2); }
const HERE     = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, '..', '..', '..', '..');                                   // scratch/W1-19 -> app root
const WCP_PROJECTS = resolve(APP_ROOT, '..', 'Whitecardopedia', 'Projects');
const BASE     = 'http://w119.test/vv/';
const REC_REL  = '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js';
const OUT_DIR  = ARGS.out || null;
if (OUT_DIR && !existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive : true });

// -----------------------------------------------------------------------------
// The world the stand-ins answer from
// -----------------------------------------------------------------------------
globalThis.W119 = {
    token  : '2026/3047__Doous',                                                          // <-- ?project= as the gallery opens it
    code   : '3047',                                                                      // <-- the loaded project.json's projectCode
    common : { Client : 'Mr J. Doous', SiteAddress : '1 Example Lane, Hamford' },
    active : { projectName : 'Doous Residence' },
    loaded : new Set()
};

const STUBS = {
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js': [
        'const W = globalThis.W119;',
        'function Na__DrawData__GetProjectCode()  { return W.token; }',
        'function Na__DrawData__GetDocumentCode() { return W.code; }',
        'function Na__DrawData__GetCommonFields() { return Object.assign({ Client : "", SiteAddress : "" }, W.common); }',
        'function Na__DrawData__SetCommonField(key, value) { W.common[key] = value; return true; }',
        'export { Na__DrawData__GetProjectCode, Na__DrawData__GetDocumentCode, Na__DrawData__GetCommonFields, Na__DrawData__SetCommonField };'
    ].join('\n'),
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js': [
        'async function Na__LeRecord__Fetch() { return { Client : "", SiteAddress : "" }; }',
        'function Na__LeRecord__Reset() {}',
        'function Na__LeRecord__ComposeClientName(v) { return typeof v === "string" ? v : ""; }',
        'export { Na__LeRecord__Fetch, Na__LeRecord__Reset, Na__LeRecord__ComposeClientName };'
    ].join('\n'),
    '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js': [
        'function Na__PresentationMode__ProjectJson__GetActiveConfig() { return globalThis.W119.active; }',
        'export { Na__PresentationMode__ProjectJson__GetActiveConfig };'
    ].join('\n'),
    '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js': [
        'function Na__LePanels__OnControl() {} function Na__LePanels__Row() { return null; }',
        'function Na__LePanels__Input() { return null; } function Na__LePanels__Select() { return null; }',
        'export { Na__LePanels__OnControl, Na__LePanels__Row, Na__LePanels__Input, Na__LePanels__Select };'
    ].join('\n'),
    '02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js': [
        'function Na__ModelToggle__GetCategoryKeys() { return []; }',
        'export { Na__ModelToggle__GetCategoryKeys };'
    ].join('\n')
};
const VARIANTS = { tv : resolve(ARGS.tv), old : resolve(ARGS.old), new : resolve(ARGS.new) };

// -----------------------------------------------------------------------------
// Module hooks
// -----------------------------------------------------------------------------
const SCRATCH = mkdtempSync(join(tmpdir(), 'w1-19-harness-'));
const HOOKS = [
    "import { readFileSync } from 'node:fs';",
    "let S = null;",
    "export async function initialize(data) { S = data; }",
    "export async function resolve(specifier, context, nextResolve) {",
    "    const parent = (context.parentURL || '').split('?')[0];",
    "    if (specifier.startsWith(S.base)) return { url : specifier, shortCircuit : true };",
    "    if (parent.startsWith(S.base) && (specifier.startsWith('./') || specifier.startsWith('../'))) {",
    "        return { url : new URL(specifier, parent).href, shortCircuit : true };",
    "    }",
    "    return nextResolve(specifier, context);",
    "}",
    "export async function load(url, context, nextLoad) {",
    "    if (!url.startsWith(S.base)) return nextLoad(url, context);",
    "    const [ path, query ] = url.slice(S.base.length).split('?');",
    "    const variant = query ? new URLSearchParams(query).get('variant') : null;",
    "    if (variant) return { format : 'module', source : readFileSync(S.variants[variant], 'utf8'), shortCircuit : true };",
    "    if (Object.prototype.hasOwnProperty.call(S.stubs, path)) return { format : 'module', source : S.stubs[path], shortCircuit : true };",
    "    return { format : 'module', source : readFileSync(S.root + path.split('/').join(S.sep), 'utf8'), shortCircuit : true };",
    "}"
].join('\n');
writeFileSync(join(SCRATCH, 'hooks.mjs'), HOOKS);
register(pathToFileURL(join(SCRATCH, 'hooks.mjs')).href, { parentURL : import.meta.url,
    data : { base : BASE, root : APP_ROOT + sep, sep, stubs : STUBS, variants : VARIANTS } });

// A browser just big enough, and fetch() that reads the pretend address from disk.
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = globalThis.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    localStorage : { getItem : () => null, setItem() {}, removeItem() {} }, setTimeout, clearTimeout, location : { search : '', hostname : 'localhost' } };
const FETCHED = [];
globalThis.fetch = async (input) => {
    const url = String(input && input.href ? input.href : input);
    if (!url.startsWith(BASE)) return { ok : false, status : 404, json : async () => null, text : async () => '' };
    const file = join(APP_ROOT, ...url.slice(BASE.length).split('?')[0].split('/'));
    FETCHED.push(url.slice(BASE.length));
    if (!existsSync(file)) return { ok : false, status : 404, json : async () => null, text : async () => '' };
    const text = readFileSync(file, 'utf8');
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
    console.log('  FAIL  ' + label + (detail === undefined ? '' : '\n        ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500)));
    return false;
}
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const J = (v) => JSON.stringify(v === undefined ? '__undefined__' : v);
function diffPaths(a, b, path, out) {
    out = out || []; path = path || '';
    if (J(a) === J(b)) return out;
    if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
        const keys = new Set([ ...Object.keys(a), ...Object.keys(b) ]);
        keys.forEach((k) => diffPaths(a[k], b[k], path + (Array.isArray(a) ? '[' + k + ']' : '.' + k), out));
        return out;
    }
    out.push({ path, a, b });
    return out;
}
function section(title) { console.log('\n=== ' + title); }

// -----------------------------------------------------------------------------
// Load
// -----------------------------------------------------------------------------
const CFG  = await import(BASE + '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js');
await CFG.Na__LeCfg__Ready();
const EDGE = await import(BASE + '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js');
const SPC  = await import(BASE + '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js');
const LEAF = await import(BASE + '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js');
const R = {};
for (const v of [ 'tv', 'old', 'new' ]) R[v] = await import(BASE + REC_REL + '?variant=' + v);
console.log('loaded: config ready (' + Object.keys(CFG).length + ' names), three SheetRecords variants; fetched before edge Ready: ' + FETCHED.join(', '));

// -----------------------------------------------------------------------------
// A. Exports
// -----------------------------------------------------------------------------
section('A. Exports');
const names = (m) => Object.keys(m).sort();
const tvNames = names(R.tv), newNames = names(R.new), oldNames = names(R.old);
check('the new file exports every TrueVision name (' + tvNames.length + ')', tvNames.every((n) => newNames.includes(n)), tvNames.filter((n) => !newNames.includes(n)));
check('and one name more, ValeVision\'s Na__LeRec__SheetShortCode (K2 X2)', J(newNames.filter((n) => !tvNames.includes(n))) === J([ 'Na__LeRec__SheetShortCode' ]), newNames.filter((n) => !tvNames.includes(n)));
const IMPORTERS_TAKE = [ 'Na__LeRec__BuildFields', 'Na__LeRec__DefaultLayerId', 'Na__LeRec__DrawingNumber', 'Na__LeRec__Find', 'Na__LeRec__KIND_2D',
    'Na__LeRec__KIND_3D', 'Na__LeRec__LAYER_TYPES', 'Na__LeRec__MarginNotes', 'Na__LeRec__NextId', 'Na__LeRec__NormaliseAnnotation',
    'Na__LeRec__NormaliseDimension', 'Na__LeRec__NormaliseGroup', 'Na__LeRec__NormaliseLayer', 'Na__LeRec__NormaliseLeader',
    'Na__LeRec__NormaliseMarginNotes', 'Na__LeRec__NormaliseShape', 'Na__LeRec__NormaliseSheet', 'Na__LeRec__NormaliseViewport',
    'Na__LeRec__STYLE_KEYS', 'Na__LeRec__SheetShortCode', 'Na__LeRec__StripSheetCode' ];
check('every name ValeVision\'s current importers take is still exported (' + IMPORTERS_TAKE.length + ')', IMPORTERS_TAKE.every((n) => newNames.includes(n)), IMPORTERS_TAKE.filter((n) => !newNames.includes(n)));
check('every name the old file exported is still exported', oldNames.every((n) => newNames.includes(n)), oldNames.filter((n) => !newNames.includes(n)));
console.log('  ' + newNames.length + ' names exported (TrueVision ' + tvNames.length + ', before ' + oldNames.length + ')');

// -----------------------------------------------------------------------------
// B. Golden fixture
// -----------------------------------------------------------------------------
const L = (id, name, type, order, extra) => Object.assign({ Layer__Id : id, Layer__Name : name, Layer__Type : type, Layer__Visible : true, Layer__Locked : false, Layer__Order : order }, extra || {});
const SITE_TV = 'TrueVision__SitePlan__', SITE_VV = 'ValeVision__SitePlan__';
const frame = { X : 30, Y : 25, WidthMm : 180, HeightMm : 120 };
function goldenSheets(sitePrefix) {
    const edges = (prefix) => ({
        Edges__UpdatedIso : '2026-09-29T10:00:00Z',
        Edges__Categories : {
            'Walls'               : { Category__Label : 'Walls', Category__EdgeWeightFactor : 2, Category__EdgeColour : 'ink', Category__EdgeLineType : 'solid', Category__LineTypeScale : 2.5 },
            'Windows'             : { Category__EdgeWeightFactor : 1, Category__EdgeColour : 'not-a-colour', Category__EdgeLineType : 'not-a-type', Category__LineTypeScale : 99, Category__FillHex : '#aabbcc' },
            'Doors'               : { Category__EdgeWeightFactor : 'x', Category__LineTypeScale : -1 },
            [prefix + 'Roads']    : { Category__Label : 'Roads', Category__EdgeWeightFactor : 1, Category__EdgeColour : 'ink', Category__EdgeLineType : 'solid', Category__FillHex : '#a1b2c3' },
            [prefix + 'Water']    : { Category__EdgeWeightFactor : 1, Category__FillHex : 'blue', Category__LineTypeScale : 0.05 },
            'Broken'              : 'not an entry'
        }
    });
    return [
        {   // ROWS 1-6, 13-17, 18-30, 44: an old-seed sheet carrying every viewport field
            Sheet__Id : 'Sheet_001', Sheet__Name : 'D01 - Elevations', Sheet__Order : 1, Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape',
            Sheet__TitleBlockStyle : 'modern', Sheet__DrawingType : 'elevation',
            Sheet__Fields : { Sheet__Fields__DrawingNumber : 'D01', Sheet__Fields__Title : 'D01 - Elevations', Sheet__Fields__Phase : ' S2 ', Sheet__Fields__Revision : 'B' },
            Sheet__Layers : [ L('Layer_001', 'Viewports', 'viewport', 1), L('Layer_002', 'Text', 'annotation', 2), L('Layer_003', 'Dimensions', 'dimension', 3),
                              L('Layer_004', 'Vectors', 'vector', 4), L('Layer_005', 'Floor Areas', 'area', 5, { Layer__Selectable : false }),
                              L('Layer_006', 'Images', 'image', 6, { Layer__Selectable : true }), L('Layer_007', 'Odd', 'weird', 7, { Layer__Selectable : 'no' }) ],
            Sheet__Viewports : [
                { Viewport__Id : 'Viewport_001', Viewport__Kind : '2d', Viewport__LayerId : 'Layer_001', Viewport__SceneId : 'Scene_001', Viewport__DrawingId : 'Elevation_001',
                  Viewport__FrameMm : frame, Viewport__ScaleDenominator : 200, Viewport__RotationDeg : 270, Viewport__ShowFrame : false,
                  Viewport__ClosedDoors : [ ' ADR002__Door ', 'ADR001__Door', 'ADR001__Door', '', 7, 'ADR003__Pair::MOD1' ], Viewport__HideSwings : true,
                  Viewport__ModelSourceId : '  Group_Proposed  ', Viewport__Styles : { depthFog : false, whitecard : true, nonsense : true },
                  Viewport__ProjectedEdges : edges(sitePrefix), Viewport__CompositeWeights : { Unknown : 3 },
                  Viewport__SnapshotAsset : { Asset__Path : 'LayoutEditor/Snapshots/a.webp', Asset__Fingerprint : 'abc', Asset__PixelWidth : 4000 },
                  Viewport__ImageZoom : 1, Viewport__ModelLayers : { Trees : false, Walls : true } },
                { Viewport__Id : 'Viewport_002', Viewport__Kind : '3d', Viewport__LayerId : 'Layer_001', Viewport__ScaleDenominator : 1250, Viewport__RotationDeg : -180.5,
                  Viewport__ShowFrame : true, Viewport__ClosedDoors : 'ADR001', Viewport__HideSwings : 'yes', Viewport__ModelSourceId : '   ',
                  Viewport__Styles : {}, Viewport__SnapshotAsset : { Asset__Path : 'LayoutEditor/Snapshots/b.webp', Asset__Samples : 16, Asset__PixelWidth : 'big' },
                  Viewport__SitePlanHatches : { Hatches__Categories : { Wood : { Hatch__PatternKey : 'X' } } } },
                { Viewport__Id : 'Viewport_003', Viewport__Kind : '2d', Viewport__LayerId : 'Layer_001', Viewport__DrawingId : 'Plan_009', Viewport__ScaleDenominator : 500,
                  Viewport__RotationDeg : 0.25,
                  Viewport__SitePlan : { SitePlan__StoreId : '', SitePlan__PlanType : 'auto', SitePlan__Composites : { fills : false, patterns : true, linework : 'no', retired : false } },
                  Viewport__SitePlanHatches : { Hatches__Categories : {
                      Wood  : { Hatch__PatternKey : 'SitePlanHatch__MixedWoodland', Hatch__Scale : 0.5, Hatch__RotationDeg : 15, Hatch__Filled : false, Hatch__StrokePt : 0.4, Hatch__Colour : '#737373' },
                      Grass : { Hatch__PatternKey : '', Hatch__StrokePt : 0, Hatch__Colour : 'green', Hatch__Filled : true },
                      Empty : { Hatch__StrokePt : null, Hatch__Colour : null }, Junk : 'x' } },
                  Viewport__ProjectedEdges : edges(sitePrefix) },
                { Viewport__Id : 'Viewport_004', Viewport__LayerId : 'Layer_999', Viewport__ScaleDenominator : 1250,
                  Viewport__SitePlan : { SitePlan__StoreId : 'Proposed', SitePlan__PlanType : 'location', SitePlan__Composites : 'all' }, Viewport__SnapshotAsset : 'bad' }
            ],
            Sheet__Annotations : [ { Annotation__Id : 'Annotation_001', Annotation__LayerId : 'Layer_002', Annotation__Text : 'Note' }, { Annotation__Id : 'Annotation_002', Annotation__LayerId : 'Layer_404' } ],
            Sheet__Dimensions : [
                { Dimension__Id : 'Dimension_001', Dimension__LayerId : 'Layer_003', Dimension__AtScale : true, Dimension__StartExtensionMm : 3, Dimension__EndExtensionMm : 0,
                  Dimension__ExtensionsLinked : false, Dimension__RoundUp : true, Dimension__LinePt : 99, Dimension__LineStyle : { LineStyle__Kind : 'dashed', LineStyle__Scale : 2 } },
                { Dimension__Id : 'Dimension_002', Dimension__LayerId : 'Layer_003', Dimension__AtScale : 'yes', Dimension__StartExtensionMm : -1, Dimension__EndExtensionMm : 'x',
                  Dimension__ExtensionsLinked : true, Dimension__RoundUp : 'true', Dimension__LinePt : 0.01, Dimension__LineStyle : null },
                { Dimension__Id : 'Dimension_003', Dimension__AtScale : false, Dimension__LinePt : 'thick', Dimension__LineStyle : 'dotted', Dimension__TickLengthMm : 50, Dimension__TextDXMm : 2 }
            ],
            Sheet__Leaders : [ { Leader__Id : 'Leader_001', Leader__LayerId : 'Layer_002', Leader__Type : 'bubble', Leader__SpecNoteId : '  Note_007 ' } ],
            Sheet__Shapes : [],
            Sheet__Groups : [ { Group__Id : 'Group_001', Group__Members : [
                { kind : 'viewport', id : 'Viewport_001' }, { kind : 'shape', id : 'Shape_001' }, { kind : 'annotation', id : 'Annotation_001' },
                { kind : 'leader', id : 'Leader_001' }, { kind : 'dimension', id : 'Dimension_001' }, { kind : 'group', id : 'Group_002' },
                { kind : 'leader', id : 'Leader_001' }, { kind : 'sheet', id : 'Sheet_001' }, { kind : 'shape', id : '' }, 'junk', null ] },
                { Group__Members : 'none' }, null ]
        },
        {   // ROWS 7-12, 37-43: a site plan sheet with a margin, floor area groups and every shape kind
            Sheet__Id : 'Sheet_002', Sheet__Name : 'Site Plan', Sheet__DrawingType : 'siteplan', Sheet__Order : 2, Sheet__PaperSize : 'A2', Sheet__Orientation : 'portrait',
            Sheet__LayerStack : 2,
            Sheet__Fields : { Sheet__Fields__DocumentId : '  3047_S1_D02 ', Sheet__Fields__Phase : '' },
            Sheet__Layers : [ L('Layer_002', 'Text', 'annotation', 1), L('Layer_001', 'Viewports', 'viewport', 2), L('Layer_003', 'Dimensions', 'dimension', 3) ],
            Sheet__AreaGroups : [ { AreaGroup__Name : '  Ground   Floor ', AreaGroup__Colour : ' #eeeeee ' }, { AreaGroup__Name : 'ground floor' }, { AreaGroup__Name : '' }, 'junk',
                                  { AreaGroup__Name : 'First Floor', AreaGroup__Colour : '' } ],
            Sheet__MarginNotes : { Enabled : true, WidthMm : 90, TextSizeMm : 2.2, IncludeGeneral : false,
                RegionsOn : true, Regions : [ { Region__Id : 'Region_001', Region__FrameMm : { X : 20, Y : 20, WidthMm : 120, HeightMm : 90 }, Region__Title : ' Notes ', Region__Overspill : true,
                    Region__Groups : [ 'SpecGroup_002', 'SpecGroup_002', '' ], Region__Borders : { Top : false } }, { Region__Id : 'Region_002', Region__FrameMm : { X : 1, Y : 1, WidthMm : 2, HeightMm : 2 } }, 'junk' ],
                LeaderlessOn : 'yes', LeaderlessGroups : [ 'SpecGroup_004', 'SpecGroup_004', '', 'SpecGroup_001' ] },
            Sheet__Viewports : [ { Viewport__Id : 'Viewport_001', Viewport__LayerId : 'Layer_001', Viewport__SitePlan : { SitePlan__StoreId : 'Existing', SitePlan__PlanType : 'block' }, Viewport__ScaleDenominator : 2500 } ],
            Sheet__Annotations : [], Sheet__Dimensions : [], Sheet__Leaders : [],
            Sheet__Shapes : [
                { Shape__Id : 'Shape_001', Shape__LayerId : 'Layer_002', Shape__Points : [ [ 0, 0 ], [ 50, 0 ], [ 50, 40 ], [ 0, 40 ] ], Shape__Closed : true,
                  Shape__Hatch : { Hatch__PatternKey : 'ConstructionHatch__Brickwork', Hatch__Scale : 2, Hatch__RotationDeg : 45, Hatch__Colour : '#960000', Hatch__StrokePt : 0.75, Hatch__Junk : 1 },
                  Shape__Curve : { Curve__Kind : 'arc', Curve__Radius : 5 }, Shape__Gradient : { Gradient__StartColour : '#112233', Gradient__BlendPct : 140 },
                  Shape__LineStyle : { LineStyle__Kind : 'dotted' } },
                { Shape__Id : 'Shape_002', Shape__Points : [ [ 0, 0 ], [ 10, 0 ], [ 10, 10 ], [ 0, 10 ] ], Shape__Qr : { Qr__MarginMm : -3, Qr__Matrix : [ 1 ] }, Shape__Stroked : false,
                  Shape__Hatch : { Hatch__PatternKey : '' }, Shape__Curve : { Curve__Kind : 'spline' } },
                { Shape__Id : 'Shape_003', Shape__Points : [ [ 0, 0 ], [ 30, 0 ], [ 30, 20 ] ], Shape__Stroked : false,
                  Shape__Area : { Area__Name : '  Kitchen   Diner ', Area__Group : ' Ground Floor ', Area__ScaleDenominator : '50', Area__Label : 'both', Area__TextSizeMm : 99, Area__LabelDXMm : 0, Area__LabelDYMm : 'x' } },
                { Shape__Id : 'Shape_004', Shape__Points : [ [ 0, 0 ], [ 40, 0 ], [ 40, 10 ], [ 0, 10 ] ], Shape__Stroked : true, Shape__FillColour : '#ffffff', Shape__Gradient : { Gradient__EndColour : '#000000' },
                  Shape__Hatch : { Hatch__PatternKey : 'ConstructionHatch__Brickwork' }, Shape__Qr : { Qr__MarginMm : 2 }, Shape__Area : { Area__Name : 'Room' },
                  Shape__Image : { Image__File : '  abc123.png ', Image__Folder : ' 3047_D02 ', Image__PixelW : 4000, Image__PixelH : 'x', Image__Crop : { L : 0.1, T : 0.0, R : 0.9, B : 1.2 },
                                   Image__Frame : false, Image__Alpha : true, Image__Name : ' Photo.png ', Image__SourceW : 8000, Image__SourceH : 0 } },
                { Shape__Id : 'Shape_005', Shape__Points : [ [ 0, 0 ], [ 100, 0 ], [ 100, 100 ], [ 0, 100 ], [ 20, 20 ], [ 40, 20 ], [ 40, 40 ], [ 20, 40 ], [ 60, 60 ], [ 70, 60 ] ],
                  Shape__Holes : [ 8, 4, 4, 'x', 99 ] },
                { Shape__Id : 'Shape_006', Shape__Points : [ [ 0, 0 ], [ 10, 0 ], [ 10, 10 ] ], Shape__Holes : [] },
                { Shape__Id : 'Shape_007', Shape__Points : [ [ 0, 0 ], [ 10, 0 ], [ 10, 10 ], [ 0, 10 ], [ 2, 2 ], [ 4, 2 ], [ 4, 4 ] ], Shape__Qr : {}, Shape__Holes : [ 4 ] },
                { Shape__Id : 'Shape_008', Shape__Points : [ [ 0, 0 ], [ 10, 0 ] ], Shape__Stroked : false, Shape__FillColour : '#ff0000' },
                { Shape__Id : 'Shape_009', Shape__LayerId : 'Layer_777', Shape__Points : [ [ 0, 0 ], [ 1, 1 ] ], Shape__Image : { Image__File : '' } },
                { Shape__Id : 'Shape_010', Shape__LayerId : 'Layer_778', Shape__Points : [ [ 0, 0 ], [ 9, 0 ], [ 9, 9 ] ], Shape__Area : { Area__Name : 'Hall' } }
            ],
            Sheet__Groups : []
        },
        {   // ROW 4: a brand new sheet - the TrueVision seed
            Sheet__Id : 'Sheet_003', Sheet__Name : '', Sheet__Fields : null
        },
        {   // ROW 5: a stack mark that is not 2 restacks; a typed empty number; an empty Floor Areas layer under the drawings
            Sheet__Id : 'Sheet_004', Sheet__Name : 'L2 - Second Floor', Sheet__Order : 4, Sheet__LayerStack : 1,
            Sheet__Fields : { Sheet__Fields__DrawingNumber : '', Sheet__Fields__DocumentId : '   ' },
            Sheet__Layers : [ L('Layer_001', 'Viewports', 'viewport', 1), L('Layer_002', 'Text', 'annotation', 2), L('Layer_005', 'Floor Areas', 'area', 3) ],
            Sheet__Viewports : [ { Viewport__Id : 'Viewport_001', Viewport__LayerId : 'Layer_001' } ]
        },
        {   // RB05-style: one viewport and three EMPTY layers under it - restacked
            Sheet__Id : 'Sheet_005', Sheet__Name : 'Plans', Sheet__Order : 5,
            Sheet__Layers : [ L('Layer_001', 'Viewports', 'viewport', 1), L('Layer_002', 'Text', 'annotation', 2), L('Layer_003', 'Dimensions', 'dimension', 3), L('Layer_004', 'Vectors', 'vector', 4) ],
            Sheet__Viewports : [ { Viewport__Id : 'Viewport_001', Viewport__LayerId : 'Layer_001' } ]
        },
        {   // Already in order: left alone, and marked
            Sheet__Id : 'Sheet_006', Sheet__Name : 'Already Ordered', Sheet__Order : 6,
            Sheet__Layers : [ L('Layer_002', 'Text', 'annotation', 1), L('Layer_004', 'Vectors', 'vector', 2), L('Layer_001', 'Viewports', 'viewport', 3) ],
            Sheet__Viewports : [ { Viewport__Id : 'Viewport_001', Viewport__LayerId : 'Layer_001' } ],
            Sheet__Annotations : [ { Annotation__Id : 'Annotation_001', Annotation__LayerId : 'Layer_002' } ]
        }
    ];
}

function withWorld(world, fn) {
    const was = { token : W119.token, code : W119.code };
    Object.assign(W119, world);
    try { return fn(); } finally { Object.assign(W119, was); }
}
function normaliseAll(variant, sheets) {
    const list = clone(sheets);
    list.forEach((s, i) => { if (s && typeof s === 'object') R[variant].Na__LeRec__NormaliseSheet(s, i); });
    return list;
}
const renameKeys = (value, from, to) => JSON.parse(JSON.stringify(value).split(from).join(to));

section('B. Golden fixture against TrueVision\'s file (pin b2aa9151)');
const evidence = {};
for (const edgeState of [ 'edge config not yet loaded', 'edge config loaded' ]) {
    if (edgeState === 'edge config loaded') await EDGE.Na__LeEdge__Ready();
    await SPC.Na__LeSpComp__Ready?.();
    const label = ' (' + edgeState + ')';
    // B1 SEAM-NEUTRAL: the token is the code and no category carries a site plan prefix: byte for byte.
    const neutral = goldenSheets('Neutral__');
    const outTv  = withWorld({ token : '3047', code : '3047' }, () => normaliseAll('tv', neutral));
    const outNew = withWorld({ token : '3047', code : '3047' }, () => normaliseAll('new', neutral));
    check('B1 seam-neutral golden fixture: NormaliseSheet byte-identical, all ' + neutral.length + ' sheets' + label, J(outTv) === J(outNew), diffPaths(outTv, outNew).slice(0, 8));
    // B2 SECOND PASS: a normalised sheet normalises to itself in both.
    const again = withWorld({ token : '3047', code : '3047' }, () => normaliseAll('new', outNew));
    check('B2 a second normalise of the new output is byte-identical' + label, J(again) === J(outNew), diffPaths(outNew, again).slice(0, 8));
    // B3 THE PREFIX SEAM: ValeVision's prefix on the VV side is TrueVision's prefix on the TV side, and nothing else moves.
    const tvSite  = withWorld({ token : '3047', code : '3047' }, () => normaliseAll('tv',  goldenSheets(SITE_TV)));
    const newSite = withWorld({ token : '3047', code : '3047' }, () => normaliseAll('new', goldenSheets(SITE_VV)));
    check('B3 prefix seam: VV with ValeVision__SitePlan__ categories = TV with TrueVision__SitePlan__ categories, token swapped' + label,
        J(renameKeys(newSite, SITE_VV, SITE_TV)) === J(tvSite), diffPaths(renameKeys(newSite, SITE_VV, SITE_TV), tvSite).slice(0, 8));
    // B4 THE SAME INPUT, TrueVision's token: the only differences are the prefixed categories (VV treats them as ordinary ones).
    const newTvTok = withWorld({ token : '3047', code : '3047' }, () => normaliseAll('new', goldenSheets(SITE_TV)));
    const d4 = diffPaths(tvSite, newTvTok);
    check('B4 same input with TrueVision__SitePlan__ keys: every difference sits on a site plan edge category (the prefix seam)' + label,
        d4.length > 0 && d4.every((d) => /Viewport__ProjectedEdges\.Edges__Categories\.TrueVision__SitePlan__/.test(d.path)), d4.slice(0, 8).map((d) => d.path));
    // B5 THE DOCUMENT CODE SEAM: with the gallery token, records are still identical; only DocumentId moves.
    const tok = { token : '2026/3047__Doous', code : '3047' };
    const recTv  = withWorld(tok, () => normaliseAll('tv', neutral));
    const recNew = withWorld(tok, () => normaliseAll('new', neutral));
    check('B5 with the gallery token the RECORDS are still byte-identical (the token never reaches a record)' + label, J(recTv) === J(recNew), diffPaths(recTv, recNew).slice(0, 5));
    if (edgeState === 'edge config loaded') { evidence.goldenInput = neutral; evidence.goldenOutTv = outTv; evidence.goldenOutVv = outNew; evidence.siteOutTv = tvSite; evidence.siteOutVv = newSite; }
}

// B6 Every exported function, called directly on its own cases.
section('B6. Every exported function, case by case');
const sheetsForCalls = withWorld({ token : '3047', code : '3047' }, () => normaliseAll('tv', goldenSheets('Neutral__')));
const RAW = goldenSheets('Neutral__');
const calls = [];
const add = (fn, args, note) => calls.push({ fn, args, note });
RAW[0].Sheet__Layers.forEach((l, i) => add('Na__LeRec__NormaliseLayer', [ l, i ]));
RAW.forEach((s) => (s.Sheet__Viewports || []).forEach((v) => add('Na__LeRec__NormaliseViewport', [ v, 'Layer_001' ])));
RAW[0].Sheet__Annotations.forEach((a) => add('Na__LeRec__NormaliseAnnotation', [ a, 'Layer_002' ]));
add('Na__LeRec__NormaliseAnnotation', [ {}, 'Layer_009' ]);
RAW[0].Sheet__Dimensions.forEach((d) => add('Na__LeRec__NormaliseDimension', [ d, 'Layer_003' ]));
add('Na__LeRec__NormaliseDimension', [ { Dimension__LinePt : 0.5, Dimension__LineStyle : { LineStyle__Kind : 'solid' } }, 'Layer_003' ]);
RAW[1].Sheet__Shapes.forEach((s) => add('Na__LeRec__NormaliseShape', [ s, 'Layer_004' ]));
RAW[1].Sheet__Shapes.forEach((s) => add('Na__LeRec__NormaliseShapeArea', [ s ]));
RAW[1].Sheet__Shapes.forEach((s) => add('Na__LeRec__NormaliseShapeImage', [ Object.assign({ Shape__Points : [] }, s) ]));
RAW[0].Sheet__Leaders.forEach((l) => add('Na__LeRec__NormaliseLeader', [ l, 'Layer_002' ]));
add('Na__LeRec__NormaliseLeader', [ { Leader__FillColour : null, Leader__SpecNoteId : '' }, 'Layer_002' ]);
RAW[0].Sheet__Groups.forEach((g) => add('Na__LeRec__NormaliseGroup', [ g ]));
RAW.forEach((s) => { add('Na__LeRec__NormaliseAreaGroups', [ s ]); add('Na__LeRec__NormaliseMarginNotes', [ s ]); add('Na__LeRec__MarginNotes', [ s ]);
    add('Na__LeRec__IsSitePlanSheet', [ s ]); add('Na__LeRec__NormaliseLayerStack', [ s ]); });
add('Na__LeRec__NormaliseLayerStack', [ null ]); add('Na__LeRec__NormaliseLayerStack', [ { Sheet__Layers : 'x' } ]);
add('Na__LeRec__MarginNotes', [ null ]); add('Na__LeRec__NormaliseAreaGroups', [ null ]);
sheetsForCalls.forEach((s) => {
    [ 'viewport', 'annotation', 'dimension', 'vector', 'area', 'image', 'mixed', 'nothing' ].forEach((t) => add('Na__LeRec__DefaultLayerId', [ s, t ]));
    add('Na__LeRec__DrawingNumber', [ s ]); add('Na__LeRec__Phase', [ s ]); add('Na__LeRec__DocumentId', [ s ], 'seam'); add('Na__LeRec__BuildFields', [ s ], 'seam');
});
add('Na__LeRec__DefaultLayerId', [ null, 'vector' ]); add('Na__LeRec__DrawingNumber', [ null ]); add('Na__LeRec__Phase', [ null ]);
RAW.forEach((s) => (s.Sheet__Viewports || []).forEach((v) => add('Na__LeRec__IsSitePlanViewport', [ v ])));
add('Na__LeRec__IsSitePlanViewport', [ null ]); add('Na__LeRec__IsSitePlanViewport', [ { Viewport__SitePlan : [] } ]);
const NUMBERS = [ 'PS01_T02_D03', 'D03', 'd3', 'A-101', 'A 101', 'A_101', '3047-01', '3047_D01', '2026/3047__Doous-01', '  D21  ', 'D1.5', 'X', '', null, undefined, 7, 'D', '01', 'AB-', 'L2', 'S1_D02' ];
NUMBERS.forEach((n) => add('Na__LeRec__ShortCode', [ n ]));
const NAMES = [ 'D03 - 3D Images', 'D21 - Floor Plans', 'L2 - Second Floor', '3D Images', '1:50 Details', 'D1.5 Details', 'D03', 'D03 -', 'd04: Notes', ' D05 · Roof ', 'D06 | Site', 'D07 – Plans', '', null, 'A-101 - Doors' ];
NAMES.forEach((name) => NUMBERS.forEach((n) => add('Na__LeRec__StripSheetCode', [ name, n ])));
const PARTS = [ '3047', '', '2026/3047__Doous', ' 3047 ', null ];
PARTS.forEach((p) => [ '', 'S1', ' T02 ', null ].forEach((ph) => [ 'D01', '', null, 'A-101' ].forEach((d) => add('Na__LeRec__ComposeDocumentId', [ p, ph, d ]))));
[ [ [], 'Sheet_', 'Sheet__Id' ], [ [ { Sheet__Id : 'Sheet_009' }, { Sheet__Id : 'x' }, null ], 'Sheet_', 'Sheet__Id' ] ].forEach((a) => add('Na__LeRec__NextId', a));
[ [ 3, 1 ], [ NaN, 1 ], [ '3', 1 ], [ Infinity, 2 ] ].forEach((a) => add('Na__LeRec__Num', a));
add('Na__LeRec__Find', [ [ { a : 'x' }, null, { a : 'y' } ], 'a', 'y' ]);

let compared = 0, identical = 0, seamOnly = 0;
const unexpected = [];
for (const world of [ { token : '3047', code : '3047' }, { token : '2026/3047__Doous', code : '3047' } ]) {
    for (const c of calls) {
        const run = (v) => withWorld(world, () => { const args = clone(c.args); let result; try { result = R[v][c.fn](...args); } catch (e) { result = { threw : String(e && e.message) }; } return { result, args }; });
        const a = run('tv'), b = run('new');
        compared++;
        if (J(a) === J(b)) { identical++; continue; }
        // The document-code seam: only DocumentId (direct, or BuildFields' DocumentId) may move, and only to the code.
        if (c.note === 'seam' && world.token !== world.code) {
            const sheet = c.args[0];
            const want  = withWorld(world, () => R.tv.Na__LeRec__ComposeDocumentId(world.code, R.tv.Na__LeRec__Phase(sheet), R.tv.Na__LeRec__DrawingNumber(sheet)));
            const got   = c.fn === 'Na__LeRec__DocumentId' ? b.result : b.result.DocumentId;
            const rest  = c.fn === 'Na__LeRec__BuildFields' ? diffPaths(a.result, b.result).filter((d) => d.path !== '.DocumentId') : [];
            if (got === want && rest.length === 0 && J(a.args) === J(b.args)) { seamOnly++; continue; }
        }
        unexpected.push({ fn : c.fn, world, a, b });
    }
}
check('B6 ' + compared + ' direct calls over two worlds: ' + identical + ' identical, ' + seamOnly + ' differ only by the document-code seam, 0 otherwise',
    unexpected.length === 0, unexpected.slice(0, 4));
check('B6 the document-code seam is real: with the gallery token, a never-numbered sheet\'s DocumentId reads 3047_D01 here and would read 2026/3047__Doous_D01 in TrueVision\'s file',
    withWorld({ token : '2026/3047__Doous', code : '3047' }, () => R.new.Na__LeRec__DocumentId({ Sheet__Order : 1, Sheet__Fields : {} }) === '3047_D01'
        && R.tv.Na__LeRec__DocumentId({ Sheet__Order : 1, Sheet__Fields : {} }) === '2026/3047__Doous_D01'));
check('B6 the leaf seam is behaviour-neutral: ShortCode and StripSheetCode equal the leaf\'s and TrueVision\'s on ' + (NUMBERS.length + NAMES.length * NUMBERS.length) + ' cases',
    NUMBERS.every((n) => R.new.Na__LeRec__ShortCode(n) === LEAF.Na__LeCode__ShortCode(n) && R.new.Na__LeRec__ShortCode(n) === R.tv.Na__LeRec__ShortCode(n))
    && NAMES.every((name) => NUMBERS.every((n) => R.new.Na__LeRec__StripSheetCode(name, n) === R.tv.Na__LeRec__StripSheetCode(name, n))));
const ssc = (sheet) => R.new.Na__LeRec__SheetShortCode(sheet);
check('B6 Na__LeRec__SheetShortCode answers exactly as the old file did (the stored number alone) on every golden sheet and edge case',
    [ ...RAW, ...sheetsForCalls, null, {}, { Sheet__Fields : { Sheet__Fields__DrawingNumber : 'PS01_T02_D03' } }, { Sheet__Fields : { Sheet__Fields__DrawingNumber : 7 } } ]
        .every((s) => ssc(clone(s)) === R.old.Na__LeRec__SheetShortCode(clone(s))));
console.log('  ' + compared + ' calls compared; identical ' + identical + '; document-code seam ' + seamOnly);

// -----------------------------------------------------------------------------
// C / D. ValeVision's own sheets
// -----------------------------------------------------------------------------
const WHITELIST = [
    /^\.Sheet__LayerStack$/,                                                                   // added, 2
    /^\.Sheet__Viewports\[\d+\]\.Viewport__ModelSourceId$/,                                     // added, null
    /^\.Sheet__Viewports\[\d+\]\.Viewport__SnapshotAsset\.Asset__Samples$/,                     // added, null
    /^\.Sheet__Viewports\[\d+\]\.Viewport__Styles\.depthFog$/                                   // added, the configured default
];
function layerKey(sheet) { return (sheet.Sheet__Layers || []).slice().sort((a, b) => a.Layer__Order - b.Layer__Order).map((l) => l.Layer__Name + '(' + l.Layer__Type + ')'); }
function withoutOrder(sheet) {
    const s = clone(sheet);
    s.Sheet__Layers = (s.Sheet__Layers || []).map((l) => { const c = Object.assign({}, l); delete c.Layer__Order; return c; }).sort((a, b) => (a.Layer__Id < b.Layer__Id ? -1 : 1));
    return s;
}
function projectSheets(dir, label) {
    const found = [];
    for (const folder of [ '3047__Doous', '44371__Gill', '57994__Harris__Scheme-02' ]) {
        const file = join(dir, folder, 'project.json');
        if (!existsSync(file)) { found.push({ folder, missing : true }); continue; }
        const data  = JSON.parse(readFileSync(file, 'utf8'));
        const block = data.LayoutEditor__DrawingsData || {};
        (block.LayoutEditor__DrawingsData__Sheets || []).forEach((sheet, index) => found.push({ folder, index, sheet, code : String(data.projectCode || ''), label }));
    }
    return found;
}
async function runOwnSheets(dir, label) {
    section(label);
    const report = [];
    const items = projectSheets(dir, label);
    items.filter((it) => it.missing).forEach((it) => console.log('  (no project.json for ' + it.folder + ')'));
    const sheets = items.filter((it) => !it.missing);
    check(label + ': four sheets found', sheets.length === 4, sheets.map((s) => s.folder + '/' + (s.sheet && s.sheet.Sheet__Id)));
    for (const it of sheets) {
        const tag = it.folder + ' ' + it.sheet.Sheet__Id;
        const world = { token : '2026/' + it.folder, code : it.code };
        const raw = it.sheet;
        const old = withWorld(world, () => { const s = clone(raw); R.old.Na__LeRec__NormaliseSheet(s, it.index); return s; });
        let restacked = null;
        const neu = withWorld(world, () => { const s = clone(raw); R.new.Na__LeRec__NormaliseSheet(s, it.index); return s; });
        const probe = clone(raw); withWorld(world, () => { probe.Sheet__Layers.forEach(R.new.Na__LeRec__NormaliseLayer); probe.Sheet__Layers.sort((a, b) => a.Layer__Order - b.Layer__Order); restacked = R.new.Na__LeRec__NormaliseLayerStack(probe); });
        const twice = withWorld(world, () => { const s = clone(neu); R.new.Na__LeRec__NormaliseSheet(s, it.index); return s; });
        const thrice = withWorld(world, () => { const s = clone(twice); R.new.Na__LeRec__NormaliseSheet(s, it.index); return s; });
        const tvOut = withWorld({ token : it.code, code : it.code }, () => { const s = clone(raw); R.tv.Na__LeRec__NormaliseSheet(s, it.index); return s; });
        const vvOut = withWorld({ token : it.code, code : it.code }, () => { const s = clone(raw); R.new.Na__LeRec__NormaliseSheet(s, it.index); return s; });
        const rest = diffPaths(withoutOrder(old), withoutOrder(neu));
        const outside = rest.filter((d) => !WHITELIST.some((rx) => rx.test(d.path)));
        const before = layerKey(old), after = layerKey(neu);
        check(tag + ': the restack fires once (markup layers were under the drawings)', restacked === true && neu.Sheet__LayerStack === 2, { restacked, stack : neu.Sheet__LayerStack });
        check(tag + ': a second and a third normalise are byte-identical', J(twice) === J(neu) && J(thrice) === J(neu), diffPaths(neu, twice).slice(0, 5));
        check(tag + ': against ValeVision\'s CURRENT normaliser only the whitelist changes (S03b-V04)', outside.length === 0, outside.slice(0, 6));
        check(tag + ': the restack moves the Viewports layer(s) to the bottom and keeps the rest in order',
            J(after) === J(before.filter((n) => !/\(viewport\)$/.test(n)).concat(before.filter((n) => /\(viewport\)$/.test(n)))), { before, after });
        check(tag + ': this app\'s file and TrueVision\'s normalise the sheet byte-identically', J(tvOut) === J(vvOut), diffPaths(tvOut, vvOut).slice(0, 5));
        const added = rest.map((d) => d.path.replace(/\[\d+\]/g, '[]') + ' = ' + JSON.stringify(d.b));
        const fieldsOld = withWorld(world, () => R.old.Na__LeRec__BuildFields(old));
        const fieldsNew = withWorld(world, () => R.new.Na__LeRec__BuildFields(neu));
        report.push({ sheet : tag, layersBefore : before, layersAfter : after, whitelistChanges : [ ...new Set(added) ],
            drawingNumber : { before : fieldsOld.DrawingNumber, after : fieldsNew.DrawingNumber }, documentId : fieldsNew.DocumentId,
            tabShortCode : { before : R.old.Na__LeRec__SheetShortCode(old), after : R.new.Na__LeRec__SheetShortCode(neu) } });
    }
    report.forEach((r) => console.log('  ' + r.sheet + ': ' + r.layersBefore.join(' > ') + '  ==>  ' + r.layersAfter.join(' > ')
        + '\n      whitelist: ' + r.whitelistChanges.join('; ')
        + '\n      title block Drawing No. default: "' + r.drawingNumber.before + '" -> "' + r.drawingNumber.after + '"; DocumentId "' + r.documentId + '"; tab code "' + r.tabShortCode.before + '" -> "' + r.tabShortCode.after + '"'));
    return report;
}
evidence.localSheets = await runOwnSheets(WCP_PROJECTS + sep + '2026', 'C. ValeVision\'s four local sheets (WebApps/Whitecardopedia/Projects, read only)');
if (ARGS.r2) evidence.r2Sheets = await runOwnSheets(resolve(ARGS.r2), 'D. The R2 copies of the same projects (read-only GETs from the CDN)');

// -----------------------------------------------------------------------------
// Result
// -----------------------------------------------------------------------------
console.warn = quietWarn;
if (WARNINGS.length) console.log('\nwarnings printed by the modules: ' + WARNINGS.length + ' (first: ' + WARNINGS[0] + ')');
console.log('fetched: ' + [ ...new Set(FETCHED) ].join(', '));
if (OUT_DIR) {
    writeFileSync(join(OUT_DIR, 'golden_fixture__input.json'), JSON.stringify(evidence.goldenInput, null, 1));
    writeFileSync(join(OUT_DIR, 'golden_fixture__out_tv.json'), JSON.stringify(evidence.goldenOutTv, null, 1));
    writeFileSync(join(OUT_DIR, 'golden_fixture__out_vv.json'), JSON.stringify(evidence.goldenOutVv, null, 1));
    writeFileSync(join(OUT_DIR, 'own_sheets__report.json'), JSON.stringify({ local : evidence.localSheets, r2 : evidence.r2Sheets || null }, null, 1));
}
console.log('\n' + pass + ' passed, ' + fail + ' failed' + (fail ? ': ' + FAILS.join(' | ') : ''));
process.exit(fail ? 1 : 0);
