// W1-22 scratch harness: the Document ID row, the title block cells, the 1:200 scale and the header re-syncs,
// proved on ValeVision's real module graph against the same graph before this package.
//
//   node harness_w1_22.mjs --pre <dir of W1-22's pre-images> --tvrec <TrueVision SheetRecords at the pin>
//                          --wcp <Whitecardopedia Projects dir> [--stage <dir of W1-22's staged files>] [--out <dir>]
//
// HOW IT LOADS. Node module hooks serve ValeVision's app root under pretend addresses, one per variant, so
// each variant is its own module graph (its own config cache):
//   new    the app as it will be (--stage files over the app root) or as it is (no --stage: the landed files)
//   old    the app before W1-22 (--pre files over the app root)
//   none   new, with the Layout Editor config unreadable (404): the SheetSetup fallbacks answer
//   phase  new, with a test config holding a Vale stage list (S1 Survey, default S1) and the format
//          {project}_{phase}_{drawing} - what DR-11 becomes once Adam supplies Vale's stages
// REAL: the config units over the AppConfig JSON (fetched from disk), SheetRecords and its leaves, Common,
// ScaleManager, SheetLayout, SheetChrome, TitleBlock Modern 1.2.0 / Classic / Cells, GradientTool, the
// DrawingCode leaf, ShapeRings, EdgeStyles and ModelLayers. STAND-INS (only what reaches the network, the
// page or the 3D model): ProjectData (the token, the document code and the pack's common fields from the
// harness's world), ProjectRecord, the presentation block, PanelHost, ModelToggle, and - for SheetChrome
// only, which asks it three names about viewport frames this harness never draws - the SheetModel facade.
// jsPDF 4.1.0 (the vendored copy) is loaded so the chrome measures text in Helvetica as the app does.
// TrueVision's SheetRecords at the pin is loaded the way its own tests load modules (import lines swapped
// for stubs) beside this app's, for the v2.71.0 ComposeDocumentId cases.
//
// Exit 0 = every check held. Writes only to the OS temp folder and to --out.

import { register, createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';

// -----------------------------------------------------------------------------
// Options
// -----------------------------------------------------------------------------
const ARGS = {};
for (let i = 2; i < process.argv.length; i += 2) ARGS[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
for (const need of [ 'pre', 'tvrec', 'wcp' ]) if (!ARGS[need] || !existsSync(ARGS[need])) { console.error('missing --' + need); process.exit(2); }
const HERE     = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, '..', '..', '..', '..');                                   // scratch/W1-22 -> app root
const LE       = '02__Src__AppModules/51__System__LayoutEditor/';
const CFG_JSON = LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json';
const OUT_DIR  = ARGS.out || null;
if (OUT_DIR && !existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive : true });

function overlay(dir) {                                                                    // every file under dir, by app-relative path
    const map = {};
    if (!dir) return map;
    const walk = (d, rel) => readdirSync(d).forEach((name) => {
        const full = join(d, name); const r = rel ? rel + '/' + name : name;
        if (statSync(full).isDirectory()) walk(full, r); else map[r] = full;
    });
    walk(resolve(dir), '');
    delete map['manifest.json'];
    return map;
}
const STAGE = overlay(ARGS.stage || null);
const PRE   = overlay(ARGS.pre);
const BASES = { new : 'http://w122.test/new/', old : 'http://w122.test/old/', none : 'http://w122.test/none/', phase : 'http://w122.test/phase/' };
const OVERLAYS = { new : STAGE, old : PRE, none : STAGE, phase : STAGE };

// THE PHASE CONFIG: the new config with a Vale stage list (test only, never shipped)
const fileFor = (variant, rel) => (OVERLAYS[variant][rel] || join(APP_ROOT, ...rel.split('/')));
const PHASE_CONFIG = (() => {
    const cfg = JSON.parse(readFileSync(fileFor('new', CFG_JSON), 'utf8'));
    const reg = cfg.LayoutEditor__DrawingRegister__Config;
    reg.LayoutEditor__DrawingRegister__DocumentCodeFormat = '{project}_{phase}_{drawing}';
    reg.LayoutEditor__DrawingRegister__Phases = [ { Code : 'S1', Name : 'Survey' }, { Code : 'S2', Name : 'Design' } ];
    reg.LayoutEditor__DrawingRegister__DefaultPhase = 'S1';
    return JSON.stringify(cfg);
})();

// -----------------------------------------------------------------------------
// The world the stand-ins answer from
// -----------------------------------------------------------------------------
globalThis.W122 = { token : '2026/3047__Doous', code : '3047', common : { Client : '', SiteAddress : '' }, active : { projectName : 'Doous' } };

const STUBS = {
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js': [
        'const W = globalThis.W122;',
        'function Na__DrawData__GetProjectCode()  { return W.token; }',
        'function Na__DrawData__GetDocumentCode() { return W.code; }',
        'function Na__DrawData__GetCommonFields() { return Object.assign({ Client : "", SiteAddress : "" }, W.common); }',
        'function Na__DrawData__SetCommonField(key, value) { W.common[key] = value; return true; }',
        'export { Na__DrawData__GetProjectCode, Na__DrawData__GetDocumentCode, Na__DrawData__GetCommonFields, Na__DrawData__SetCommonField };'
    ].join('\n'),
    [LE + '07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js']: [
        'async function Na__LeRecord__Fetch() { return { Client : "", SiteAddress : "" }; }',
        'function Na__LeRecord__Reset() {}',
        'function Na__LeRecord__ComposeClientName(v) { return typeof v === "string" ? v : ""; }',
        'export { Na__LeRecord__Fetch, Na__LeRecord__Reset, Na__LeRecord__ComposeClientName };'
    ].join('\n'),
    '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js': [
        'function Na__PresentationMode__ProjectJson__GetActiveConfig() { return globalThis.W122.active; }',
        'export { Na__PresentationMode__ProjectJson__GetActiveConfig };'
    ].join('\n'),
    [LE + '40__Ui__Panels/Na__LayoutEditor__PanelHost__.js']: [
        'function Na__LePanels__OnControl() {} function Na__LePanels__Row() { return null; }',
        'function Na__LePanels__Input() { return null; } function Na__LePanels__Select() { return null; }',
        'export { Na__LePanels__OnControl, Na__LePanels__Row, Na__LePanels__Input, Na__LePanels__Select };'
    ].join('\n'),
    '02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js': [
        'function Na__ModelToggle__GetCategoryKeys() { return []; }',
        'export { Na__ModelToggle__GetCategoryKeys };'
    ].join('\n'),
    [LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__.js']: [                 // <-- SheetChrome's three names about frames (never drawn here)
        "const Na__LeModel__KIND_2D = '2d';",
        'function Na__LeModel__ResolveViewportSource() { return null; }',
        'function Na__LeModel__IsLayerVisible() { return true; }',
        'export { Na__LeModel__KIND_2D, Na__LeModel__ResolveViewportSource, Na__LeModel__IsLayerVisible };'
    ].join('\n')
};

// -----------------------------------------------------------------------------
// Module hooks
// -----------------------------------------------------------------------------
const SCRATCH = mkdtempSync(join(tmpdir(), 'w1-22-harness-'));
const HOOKS = [
    "import { readFileSync } from 'node:fs';",
    'let S = null;',
    'export async function initialize(data) { S = data; }',
    'function baseOf(url) { for (const [ v, b ] of Object.entries(S.bases)) if (url.startsWith(b)) return [ v, b ]; return null; }',
    'export async function resolve(specifier, context, nextResolve) {',
    "    const parent = (context.parentURL || '').split('?')[0];",
    '    if (baseOf(specifier)) return { url : specifier, shortCircuit : true };',
    "    if (baseOf(parent) && (specifier.startsWith('./') || specifier.startsWith('../'))) return { url : new URL(specifier, parent).href, shortCircuit : true };",
    '    return nextResolve(specifier, context);',
    '}',
    'export async function load(url, context, nextLoad) {',
    '    const hit = baseOf(url);',
    '    if (!hit) return nextLoad(url, context);',
    "    const path = url.slice(hit[1].length).split('?')[0];",
    "    if (Object.prototype.hasOwnProperty.call(S.stubs, path)) return { format : 'module', source : S.stubs[path], shortCircuit : true };",
    "    const file = S.overlays[hit[0]][path] || (S.root + path.split('/').join(S.sep));",
    "    return { format : 'module', source : readFileSync(file, 'utf8'), shortCircuit : true };",
    '}'
].join('\n');
writeFileSync(join(SCRATCH, 'hooks.mjs'), HOOKS);
register(pathToFileURL(join(SCRATCH, 'hooks.mjs')).href, { parentURL : import.meta.url,
    data : { bases : BASES, overlays : OVERLAYS, root : APP_ROOT + sep, sep, stubs : STUBS } });

// A browser just big enough, jsPDF for measuring, and fetch() that reads the pretend addresses from disk.
const require = createRequire(import.meta.url);
const JSPDF = require(join(APP_ROOT, '04__Lib__ThirdParty__VersionLocked', '05__Vendor__JsPdf__v4.1.0', 'jspdf.umd.js'));   // <-- Before the window stand-in: the UMD binds atob from its global
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    localStorage : { getItem : () => null, setItem() {}, removeItem() {} }, setTimeout, clearTimeout, location : { search : '', hostname : 'localhost' } };
globalThis.window.jspdf = { jsPDF : JSPDF.jsPDF };
const FETCHED = [];
globalThis.fetch = async (input) => {
    const url = String(input && input.href ? input.href : input);
    const hit = Object.entries(BASES).find(([ , b ]) => url.startsWith(b));
    if (!hit) return { ok : false, status : 404, json : async () => null, text : async () => '' };
    const rel = url.slice(hit[1].length).split('?')[0];
    FETCHED.push(hit[0] + ':' + rel);
    if (hit[0] === 'none' && rel === CFG_JSON) return { ok : false, status : 404, json : async () => null, text : async () => '' };
    if (hit[0] === 'phase' && rel === CFG_JSON) return { ok : true, status : 200, json : async () => JSON.parse(PHASE_CONFIG), text : async () => PHASE_CONFIG };
    const file = fileFor(hit[0], rel);
    if (!existsSync(file)) return { ok : false, status : 404, json : async () => null, text : async () => '' };
    const text = readFileSync(file, 'utf8');
    return { ok : true, status : 200, json : async () => JSON.parse(text), text : async () => text };
};
const WARNINGS = []; console.warn = (...a) => { WARNINGS.push(a.map(String).join(' ')); };

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
const J = (v) => JSON.stringify(v === undefined ? '__undefined__' : v);
const clone = (v) => JSON.parse(JSON.stringify(v));
function section(title) { console.log('\n=== ' + title); }
const EVIDENCE = {};

// -----------------------------------------------------------------------------
// Load every variant
// -----------------------------------------------------------------------------
const M = {};
for (const variant of Object.keys(BASES)) {
    const at = (rel) => BASES[variant] + rel;
    const CFG = await import(at(LE + '03__Core__Config/Na__LayoutEditor__ConfigState__.js'));
    await CFG.Na__LeCfg__Ready();
    const EDGE = await import(at(LE + '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js'));
    if (typeof EDGE.Na__LeEdge__Ready === 'function') await EDGE.Na__LeEdge__Ready();
    M[variant] = {
        CFG,
        REC     : await import(at(LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js')),
        SCALE   : await import(at(LE + '07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js')),
        LAYOUT  : await import(at(LE + '07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js')),
        CHROME  : await import(at(LE + '10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js')),
        CLASSIC : await import(at(LE + '10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Classic__.js')),
        CELLS   : await import(at(LE + '10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Cells__.js')),
        FNAME   : await import(at(LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js'))
    };
}
console.log('loaded four variants (' + Object.keys(BASES).join(', ') + '); config fetches: ' + FETCHED.filter((f) => f.endsWith('AppConfig__.json')).join(', '));

// -----------------------------------------------------------------------------
// A. The config: the Document ID row, the Rev prefix, 1:200 and the anchors
// -----------------------------------------------------------------------------
section('A. The shipped config and the SheetSetup fallbacks (TrueVision\'s rows, 1:200, the anchors)');
const TV_CONFIG = JSON.parse(readFileSync(join(HERE, 'tv', ...CFG_JSON.split('/')), 'utf8'));
const TV_ROWS   = TV_CONFIG.LayoutEditor__TitleBlock__Config.LayoutEditor__TitleBlock__Rows;
const rowsOf    = (v) => M[v].CFG.Na__LeCfg__GetTitleBlockSetup().rows;
const keysOf    = (rows) => rows.map((r) => r.Key);
check('new: the title block rows are TrueVision\'s, every key, label, width, Flex and the Rev cell\'s ValuePrefix', J(rowsOf('new')) === J(TV_ROWS), rowsOf('new'));
check('new: the fourth cell is DocumentId "Document ID"; no DrawingNumber row', J(rowsOf('new')[3]) === J({ Key : 'DocumentId', Label : 'Document ID', WidthMm : 24 }) && !keysOf(rowsOf('new')).includes('DrawingNumber'));
check('none (config unreadable): the SheetSetup fallback rows are TrueVision\'s too', J(rowsOf('none')) === J(TV_ROWS), rowsOf('none'));
check('control old: DrawingNumber "Drawing No." and no Rev prefix (W0-15\'s withhold)', rowsOf('old')[3].Key === 'DrawingNumber' && !('ValuePrefix' in rowsOf('old')[4]));
const scalesOf = (v) => M[v].CFG.Na__LeCfg__GetScaleSetup().denominators;
check('new: the architectural scales are 1:20, 1:50, 1:100 and 1:200 (DR-17)', J(scalesOf('new')) === J([ 20, 50, 100, 200 ]), scalesOf('new'));
check('none: the fallback list is the same four', J(scalesOf('none')) === J([ 20, 50, 100, 200 ]), scalesOf('none'));
check('control old: 1:20, 1:50, 1:100', J(scalesOf('old')) === J([ 20, 50, 100 ]), scalesOf('old'));
check('a new viewport still starts at 1:50', M.new.CFG.Na__LeCfg__GetScaleSetup().defaultDenominator === 50);
const anchorsOf = (v) => Object.keys(M[v].CFG.Na__LeCfg__GetTitleBlockSetup().classicFieldAnchors.A3 || {});
check('new: the Classic A3 anchors are TrueVision\'s (DocumentId; the VV-only DrawingNumber anchor gone)', J(anchorsOf('new')) === J(Object.keys(TV_CONFIG.LayoutEditor__TitleBlock__Config.LayoutEditor__TitleBlock__ClassicFieldAnchors.A3)), anchorsOf('new'));
check('control old: both anchors, at the same point', anchorsOf('old').includes('DocumentId') && anchorsOf('old').includes('DrawingNumber'));
const reg = M.new.CFG.Na__LeCfg__GetDrawingRegisterSetup();
EVIDENCE.registerSetup = { documentCodeFmt : reg.documentCodeFmt, defaultPhase : reg.defaultPhase, phases : reg.phases, prefix : reg.prefix, digits : reg.digits,
                           logoAspect : reg.letterheadLogoAspect !== undefined ? reg.letterheadLogoAspect : reg.logoAspect, pdfJs : [ reg.pdfJsScriptPath, reg.pdfJsWorkerPath ] };
check('the register values are DR-11\'s default: {project}_{drawing}, no phase list, no default phase, D and two digits',
      reg.documentCodeFmt === '{project}_{drawing}' && Array.isArray(reg.phases) && reg.phases.length === 0 && !reg.defaultPhase && reg.prefix === 'D' && Number(reg.digits) === 2, EVIDENCE.registerSetup);
check('the letterhead logo aspect is the Vale logo\'s 4.5 and PDF.js is this app\'s vendor copy (07)',
      EVIDENCE.registerSetup.logoAspect === 4.5 && EVIDENCE.registerSetup.pdfJs.every((p) => typeof p === 'string' && p.indexOf('./04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/') === 0), EVIDENCE.registerSetup);
const qr = M.new.CFG.Na__LeCfg__GetTitleBlockSetup().qrCellEnabled;
check('the title block QR cell stays switched off in the shipped config (DR-12)', qr === false, qr);

// -----------------------------------------------------------------------------
// B. TrueVision v2.71.0's ComposeDocumentId cases, on this app's records and on TrueVision's at the pin
// -----------------------------------------------------------------------------
section('B. v2.71.0 ComposeDocumentId cases (this app\'s SheetRecords and TrueVision\'s, imports swapped for stubs)');
const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let loadCount = 0;
async function loadStubbed(file, stubs) {                                                  // TrueVision's test loader, as Na__Test__HideSwings__ has it
    let src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const names = []; let m; IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        const list = m[1].trim();
        if (list.charAt(0) !== '{') continue;
        list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
    }
    src = src.replace(IMPORT, '');
    const key = '__W122Stubs' + (++loadCount);
    globalThis[key] = stubs;
    const head = names.map((n) => 'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key + '["' + n + '"] : function () { return undefined; };').join('\n');
    const tmp = join(SCRATCH, 'stubbed__' + loadCount + '.mjs');
    writeFileSync(tmp, head + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href);
}
const REG = { fmt : '{project}_{phase}_{drawing}', prefix : 'D', digits : 2, defaultPhase : '' };
const stubs = { Na__LeCfg__GetDrawingRegisterSetup : () => ({ documentCodeFmt : REG.fmt, prefix : REG.prefix, digits : REG.digits, defaultPhase : REG.defaultPhase }),
                Na__DrawData__GetDocumentCode : () => globalThis.W122.code, Na__DrawData__GetProjectCode : () => globalThis.W122.code,
                Na__LeCode__ShortCode : () => '', Na__LeCode__StoredNumber : () => '', Na__LeCode__StripSheetCode : (n) => n };
const vvRecFile = fileFor('new', LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js');
const VVR = await loadStubbed(vvRecFile, stubs);
const TVR = await loadStubbed(resolve(ARGS.tvrec), stubs);
const CASES = [
    [ 'all three parts',                  '{project}_{phase}_{drawing}', [ '3047', 'S1', 'D01' ], '3047_S1_D01' ],
    [ 'the project missing',              '{project}_{phase}_{drawing}', [ '', 'S1', 'D01' ],     'S1_D01' ],
    [ 'the phase missing',                '{project}_{phase}_{drawing}', [ '3047', '', 'D01' ],   '3047_D01' ],
    [ 'the drawing missing',              '{project}_{phase}_{drawing}', [ '3047', 'S1', '' ],    '3047_S1' ],
    [ 'all three missing',                '{project}_{phase}_{drawing}', [ '', '', '' ],          '' ],
    [ 'null and undefined parts',         '{project}_{phase}_{drawing}', [ null, undefined, 'D01' ], 'D01' ],
    [ 'untrimmed input',                  '{project}_{phase}_{drawing}', [ ' 3047 ', ' S1 ', ' D01 ' ], '3047_S1_D01' ],
    [ 'another separator',                '{project}-{phase}-{drawing}', [ '3047', 'S1', 'D01' ], '3047-S1-D01' ],
    [ 'another order',                    '{drawing}/{project}',         [ '3047', 'S1', 'D01' ], 'D01/3047' ],
    [ 'a leading literal',                'DWG-{project}_{drawing}',     [ '3047', 'S1', 'D01' ], 'DWG-3047_D01' ],
    [ 'a leading literal, project empty', 'DWG-{project}_{drawing}',     [ '', 'S1', 'D01' ],     'DWG-D01' ],
    [ 'a trailing literal',               '{project}_{drawing}-PL',      [ '3047', 'S1', 'D01' ], '3047_D01-PL' ],
    [ 'this app\'s shipped format',        '{project}_{drawing}',         [ '3047', '', 'D01' ],   '3047_D01' ],
    [ 'this app\'s format ignores a phase', '{project}_{drawing}',         [ '3047', 'S1', 'D01' ], '3047_D01' ],
    [ 'a five-digit code at D100',        '{project}_{drawing}',         [ '57994', '', 'D100' ], '57994_D100' ]
];
const caseRows = [];
CASES.forEach(([ name, fmt, parts, want ]) => {
    REG.fmt = fmt;
    const vv = VVR.Na__LeRec__ComposeDocumentId(...parts);
    const tv = TVR.Na__LeRec__ComposeDocumentId(...parts);
    caseRows.push({ name, fmt, parts, vv, tv, want });
    check(name + ': ' + fmt + ' -> "' + want + '" (TrueVision\'s file gives the same)', vv === want && tv === want, { vv, tv, want });
});
EVIDENCE.composeCases = caseRows;
REG.fmt = '{project}_{drawing}'; globalThis.W122.code = '3047';
const unnumbered = { Sheet__Id : 'Sheet_001', Sheet__Order : 1, Sheet__Fields : {} };
check('a never-numbered sheet: DrawingNumber "D01", no phase, DocumentId "3047_D01" (this app and TrueVision\'s file alike)',
      J([ VVR.Na__LeRec__DrawingNumber(unnumbered), VVR.Na__LeRec__Phase(unnumbered), VVR.Na__LeRec__DocumentId(unnumbered) ]) === J([ 'D01', '', '3047_D01' ])
      && VVR.Na__LeRec__DocumentId(unnumbered) === TVR.Na__LeRec__DocumentId(unnumbered),
      [ VVR.Na__LeRec__DrawingNumber(unnumbered), VVR.Na__LeRec__Phase(unnumbered), VVR.Na__LeRec__DocumentId(unnumbered), TVR.Na__LeRec__DocumentId(unnumbered) ]);
check('a typed Sheet__Fields__DocumentId wins for its sheet alone', VVR.Na__LeRec__DocumentId({ Sheet__Order : 2, Sheet__Fields : { Sheet__Fields__DocumentId : ' ABC-1 ' } }) === 'ABC-1');

// -----------------------------------------------------------------------------
// C. A never-numbered pack on the real graph: <code>_D01, and <code>_<phase>_D01 once Vale has stages
// -----------------------------------------------------------------------------
section('C. A never-numbered pack on the real graph (DR-11; never NA\'s T01-T04)');
globalThis.W122.code = '3047';
const pack = [ { Sheet__Id : 'Sheet_001', Sheet__Name : 'Plans', Sheet__Order : 1, Sheet__Fields : {}, Sheet__Viewports : [], Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape' },
               { Sheet__Id : 'Sheet_002', Sheet__Name : 'Elevations', Sheet__Order : 2, Sheet__Fields : {}, Sheet__Viewports : [], Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape' } ];
const ids = (v) => pack.map((s) => M[v].REC.Na__LeRec__BuildFields(s).DocumentId);
check('shipped config: the pack composes 3047_D01, 3047_D02', J(ids('new')) === J([ '3047_D01', '3047_D02' ]), ids('new'));
check('with a Vale stage list (test config: S1 by default): 3047_S1_D01, 3047_S1_D02 - a config change, no code', J(ids('phase')) === J([ '3047_S1_D01', '3047_S1_D02' ]), ids('phase'));
check('no composed id names one of TrueVision\'s job stages', ids('new').concat(ids('phase')).every((id) => !/(^|_)T0[1-4](_|$)/.test(id)));
const cfgText = readFileSync(fileFor('new', CFG_JSON), 'utf8');
const regBlock = JSON.stringify(JSON.parse(cfgText).LayoutEditor__DrawingRegister__Config);
check('the shipped register block holds none of TrueVision\'s job stages (T01-T04) as a phase or default', !/"Code"\s*:\s*"T0[1-4]"/.test(regBlock) && !/"LayoutEditor__DrawingRegister__DefaultPhase"\s*:\s*"T0[1-4]"/.test(regBlock));
const tabs = pack.map((s) => { const n = M.new.REC.Na__LeRec__DrawingNumber(s); return M.new.REC.Na__LeRec__ShortCode(n) + ' - ' + s.Sheet__Name; });
check('its tabs\' short codes, cut from the drawing number with its default: "D01 - Plans", "D02 - Elevations"', J(tabs) === J([ 'D01 - Plans', 'D02 - Elevations' ]), tabs);

// -----------------------------------------------------------------------------
// D. The three local projects with sheets load unchanged; what their title blocks now print
// -----------------------------------------------------------------------------
section('D. 2026/3047__Doous, 2026/44371__Gill, 2026/57994__Harris__Scheme-02 load unchanged');
const PROJECTS = [ '2026/3047__Doous', '2026/44371__Gill', '2026/57994__Harris__Scheme-02' ];
EVIDENCE.projects = [];
for (const folder of PROJECTS) {
    const data = JSON.parse(readFileSync(join(resolve(ARGS.wcp), ...folder.split('/'), 'project.json'), 'utf8'));
    globalThis.W122.token = folder; globalThis.W122.code = String(data.projectCode); globalThis.W122.active = { projectName : data.projectName || '' };
    const sheets = (data.LayoutEditor__DrawingsData || {}).LayoutEditor__DrawingsData__Sheets || [];
    const norm = (v) => sheets.map((s) => M[v].REC.Na__LeRec__NormaliseSheet(clone(s)));
    const before = norm('old'), after = norm('new'), again = after.map((s) => M.new.REC.Na__LeRec__NormaliseSheet(clone(s)));
    check(folder + ': ' + sheets.length + ' sheet(s) normalise byte-identically before and after this package', J(before) === J(after));
    check(folder + ': and a second load (normalise again) is byte-identical', J(again) === J(after));
    const scales = sheets.flatMap((s) => (s.Sheet__Viewports || []).map((v) => v.Viewport__ScaleDenominator));
    check(folder + ': no stored scale is one the list gained (1:200), so nothing reads differently', !scales.includes(200), scales);
    const fields = sheets.map((s) => { const f = M.new.REC.Na__LeRec__BuildFields(s); return { sheet : s.Sheet__Id, DrawingNumber : f.DrawingNumber, DocumentId : f.DocumentId, Scale : f.Scale }; });
    const want = sheets.map((s) => data.projectCode + '_D' + String(s.Sheet__Order).padStart(2, '0'));
    check(folder + ': each title block\'s Document ID reads ' + want.join(', '), J(fields.map((f) => f.DocumentId)) === J(want), fields);
    EVIDENCE.projects.push({ folder, projectCode : data.projectCode, sheets : fields });
}

// -----------------------------------------------------------------------------
// E. The modern strip (TitleBlock Modern 1.2.0 as shipped here): identical but for the Document ID cell
// -----------------------------------------------------------------------------
section('E. The modern strip, QR off: every primitive as before except the number cell\'s label and value');
EVIDENCE.strips = [];
for (const folder of PROJECTS) {
    const data = JSON.parse(readFileSync(join(resolve(ARGS.wcp), ...folder.split('/'), 'project.json'), 'utf8'));
    globalThis.W122.token = folder; globalThis.W122.code = String(data.projectCode); globalThis.W122.active = { projectName : data.projectName || '' };
    for (const raw of (data.LayoutEditor__DrawingsData || {}).LayoutEditor__DrawingsData__Sheets || []) {
        const strip = (v) => {
            const s = M[v].REC.Na__LeRec__NormaliseSheet(clone(raw));
            const layout = M[v].LAYOUT.Na__LeLayout__Solve(s);
            const prims = M[v].CHROME.Na__LeChrome__Build(layout, s, { fields : M[v].REC.Na__LeRec__BuildFields(s), includeFrames : false });
            return { prims, band : layout.TitleBlock };
        };
        const a = strip('old'), b = strip('new');
        const diffs = [];
        const n = Math.max(a.prims.length, b.prims.length);
        for (let i = 0; i < n; i++) if (J(a.prims[i]) !== J(b.prims[i])) diffs.push({ i, old : a.prims[i], new : b.prims[i] });
        const texts = diffs.map((d) => [ d.old && d.old.Text, d.new && d.new.Text ]);
        const onlyCell = diffs.length > 0 && diffs.every((d) => d.old && d.new && d.old.Kind === 'text' && d.new.Kind === 'text' && d.old.X === d.new.X && d.old.BaselineY === d.new.BaselineY && d.old.FontMm === d.new.FontMm);
        const label = folder + ' ' + raw.Sheet__Id + ' (' + raw.Sheet__PaperSize + ' ' + raw.Sheet__Orientation + ')';
        check(label + ': ' + a.prims.length + ' primitives either side; only ' + diffs.length + ' text runs differ, at the same place and size', a.prims.length === b.prims.length && onlyCell && diffs.length === 2, diffs);
        check(label + ': and they are DRAWING NO. / D0n becoming DOCUMENT ID / ' + data.projectCode + '_D0n', J(texts.map((t) => t[0])) === J([ 'DRAWING NO.', 'D0' + raw.Sheet__Order ]) && J(texts.map((t) => t[1])) === J([ 'DOCUMENT ID', data.projectCode + '_D0' + raw.Sheet__Order ]), texts);
        const rules = (p) => p.filter((x) => x.Kind === 'line').map((x) => [ x.X1, x.Y1, x.X2, x.Y2 ]);
        check(label + ': every cell divider is where it was (' + rules(b.prims).length + ' rules)', J(rules(a.prims)) === J(rules(b.prims)));
        EVIDENCE.strips.push({ sheet : label, primitives : b.prims.length, changed : texts });
    }
}

// -----------------------------------------------------------------------------
// F. The Classic style: one value at the number anchor (the interim overlap closed)
// -----------------------------------------------------------------------------
section('F. The Classic title block paints one value at the number anchor');
globalThis.W122.code = '3047';
const classicSheet = { Sheet__Id : 'Sheet_001', Sheet__Name : 'Plans', Sheet__Order : 1, Sheet__Fields : {}, Sheet__Viewports : [], Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape', Sheet__TitleBlockStyle : 'classic' };
const classicTexts = (v) => {
    const s = M[v].REC.Na__LeRec__NormaliseSheet(clone(classicSheet));
    const layout = M[v].LAYOUT.Na__LeLayout__Solve(s);
    const list = [];
    M[v].CLASSIC.Na__LeTitleClassic__Build(list, layout, M[v].REC.Na__LeRec__BuildFields(s), M[v].CFG.Na__LeCfg__GetStyleSetup(), () => 'data:image/png;base64,AA==');
    return list.filter((p) => p.Kind === 'text' && Math.abs(p.X - 330) < 1e-6 && Math.abs(p.BaselineY - 289) < 1e-6).map((p) => p.Text);
};
check('new: one text run at (330, 289), the Document ID 3047_D01', J(classicTexts('new')) === J([ '3047_D01' ]), classicTexts('new'));
check('control old: two runs printed over each other there, D01 and 3047_D01 (since W1-19 gave the fields a DocumentId)', classicTexts('old').length === 2 && classicTexts('old').includes('D01') && classicTexts('old').includes('3047_D01'), classicTexts('old'));

// -----------------------------------------------------------------------------
// G. 1:200 on the real graph
// -----------------------------------------------------------------------------
section('G. 1:200 is a scale like the others (DR-17)');
const S = M.new.SCALE, SO = M.old.SCALE;
check('the Viewport panel builds four scale buttons: 1:20, 1:50, 1:100, 1:200', J(S.Na__LeScale__ListDenominators().map((d) => S.Na__LeScale__FormatLabel(d))) === J([ '1:20', '1:50', '1:100', '1:200' ]));
check('an architectural viewport keeps 1:200 (control old: coerced to 1:50)', S.Na__LeScale__Coerce(200) === 200 && SO.Na__LeScale__Coerce(200) === 50);
check('the toggle runs on from 1:100 to 1:200 and back round to 1:20', S.Na__LeScale__Next(100) === 200 && S.Na__LeScale__Next(200) === 20);
check('the title block names it with its paper, alone and in a mix', J([ S.Na__LeScale__SheetLabel([ 200 ], 'A3'), S.Na__LeScale__SheetLabel([ 200, 100 ], 'A2') ]) === J([ '1:200 @ ISO A3', '1:100 & 1:200 @ ISO A2' ]));
const vp = { Viewport__Id : 'Viewport_001', Viewport__Kind : '2d', Viewport__LayerId : 'Layer_001', Viewport__ScaleDenominator : 200, Viewport__FrameMm : { X : 10, Y : 10, WidthMm : 100, HeightMm : 80 } };
const once1 = M.new.REC.Na__LeRec__NormaliseViewport(clone(vp), 'Layer_001');
const twice = M.new.REC.Na__LeRec__NormaliseViewport(clone(once1), 'Layer_001');
check('a saved 1:200 viewport survives a load and a reload (1:150, on no list, still falls to 1:50)', once1.Viewport__ScaleDenominator === 200 && twice.Viewport__ScaleDenominator === 200 && J(twice) === J(once1)
      && M.new.REC.Na__LeRec__NormaliseViewport(Object.assign(clone(vp), { Viewport__ScaleDenominator : 150 }), 'Layer_001').Viewport__ScaleDenominator === 50);
check('control old: the same record lost its scale on load (1:50)', M.old.REC.Na__LeRec__NormaliseViewport(clone(vp), 'Layer_001').Viewport__ScaleDenominator === 50);
const sheet200 = { Sheet__Id : 'Sheet_009', Sheet__Name : 'Street', Sheet__Order : 9, Sheet__Fields : {}, Sheet__PaperSize : 'A2', Sheet__Orientation : 'landscape', Sheet__Viewports : [ vp, Object.assign(clone(vp), { Viewport__Id : 'Viewport_002', Viewport__ScaleDenominator : 100 }) ] };
check('a sheet with a 1:100 and a 1:200 viewport: its Scale cell reads "1:100 & 1:200 @ ISO A2"', M.new.REC.Na__LeRec__BuildFields(M.new.REC.Na__LeRec__NormaliseSheet(clone(sheet200))).Scale === '1:100 & 1:200 @ ISO A2');

// -----------------------------------------------------------------------------
// H. The re-synced modules link and answer as before (header-only ports)
// -----------------------------------------------------------------------------
section('H. The header re-syncs link and answer exactly as before');
const exportsOf = (mod) => Object.keys(mod).sort();
check('Cells exports Cell, Solve and now Widen; nothing it exported before is gone', J(exportsOf(M.new.CELLS)) === J([ 'Na__LeTitleCells__Cell', 'Na__LeTitleCells__Solve', 'Na__LeTitleCells__Widen' ]) && exportsOf(M.old.CELLS).every((n) => n in M.new.CELLS), exportsOf(M.new.CELLS));
check('SheetLayout, Classic and PdfFilename link and export what they did', [ 'LAYOUT', 'CLASSIC', 'FNAME' ].every((k) => J(exportsOf(M.new[k])) === J(exportsOf(M.old[k]))), [ 'LAYOUT', 'CLASSIC', 'FNAME' ].map((k) => [ k, exportsOf(M.new[k]).length ]));
// THE CODE BELOW THE HEADER, byte for byte (line endings aside): the five header re-syncs change only their header.
const HEADER_ONLY = [ '07__Core__SheetData/Na__LayoutEditor__DrawingScale__.js', '07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js',
                      '10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Classic__.js', '60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js',
                      '10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css' ];
const body = (variant, rel) => {
    const text = readFileSync(fileFor(variant, LE + rel), 'utf8').split('\r\n').join('\n');
    let end;
    if (rel.endsWith('.css')) end = text.indexOf('\n */\n') + 5;
    else { const rule = text.indexOf('\n// ====', text.indexOf('DEVELOPMENT LOG:')); end = text.indexOf('\n', rule + 1) + 1; }
    if (end <= 5) throw new Error('no header end found in ' + rel);
    const rest = text.slice(end);
    return rel.endsWith('.css') ? rest.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim() : rest;   // <-- A stylesheet: its rules (TrueVision's token comment says "three" grounds where this app's said "two")
};
HEADER_ONLY.forEach((rel) => check(rel.split('/').pop() + ': everything below the header is unchanged', body('new', rel) === body('old', rel) && body('new', rel).length > 200, body('new', rel).length));
const fileName = (v) => M[v].FNAME.Na__LeFileName__Build({ code : '3047_D01', name : 'D01 - Floor Plans', paper : 'A2', revision : 'B', projectCode : '3047', date : new Date(2026, 9, 2) });
check('PdfFilename names a sheet the same way (3047_D01__FloorPlans__A2__RevB__02-Oct-2026__.pdf with the shipped pattern)', fileName('new') === fileName('old') && fileName('new').indexOf('3047_D01__FloorPlans__A2__RevB__02-Oct-2026') === 0, [ fileName('new'), fileName('old') ]);

// -----------------------------------------------------------------------------
// Result
// -----------------------------------------------------------------------------
if (OUT_DIR) writeFileSync(join(OUT_DIR, 'harness_w1_22__results.json'), JSON.stringify({ pass, fail, fails : FAILS, evidence : EVIDENCE, warnings : WARNINGS }, null, 1));
console.log('\n' + pass + ' passed, ' + fail + ' failed' + (WARNINGS.length ? ' (' + WARNINGS.length + ' console warnings: ' + WARNINGS.slice(0, 3).join(' | ') + ')' : ''));
process.exit(fail === 0 ? 0 : 1);
