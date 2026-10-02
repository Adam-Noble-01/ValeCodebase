// W1-13 scratch harness: acceptance 1 - every module W1-13 lands loads with no consumer.
// Each of the nine modules is evaluated in Node from the LIVE ValeVision tree: the five with no imports as they are
// (copied to a temporary .mjs), the four that import (PaintOrder, NoteRegions, ScaleManager, SitePlanComposites)
// through the TrueVision tests' stub loader, their imports answered by ValeVision's REAL units (the config readers
// over its AppConfig JSON, the Layers unit, the new ScaleManager). Each export list must equal TrueVision's at the
// pin, and each module answers a first question. MeasureParse 1.1.0 is also compared with ValeVision's 1.0.0 (the
// pre-port backup) on everything the Measurements box imports. Writes only into the OS temp folder.

import { readFileSync, writeFileSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC  = resolve(HERE, '..', '..', '..', '..', '02__Src__AppModules');
const LE   = '51__System__LayoutEditor/';
const NAWEB = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const TVAPP = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/';
const TMP  = mkdtempSync(join(tmpdir(), 'W1-13-load-'));
writeFileSync(join(TMP, 'package.json'), '{ "type" : "module" }');

const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let loadCount = 0;
async function load(path, stubs) {
    let src = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        const list = m[1].trim();
        if (list.charAt(0) !== '{') continue;
        list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
    }
    src = src.replace(IMPORT, '');
    if (/^\s*import\s/m.test(src)) throw new Error('an import survived in ' + path);
    const key = '__W113LoadStubs' + (++loadCount);
    globalThis[key] = stubs || {};
    const missing = names.filter((n) => !Object.prototype.hasOwnProperty.call(globalThis[key], n));
    const head = names.map((n) => 'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key + '["' + n + '"] : function () { return undefined; };').join('\n');
    const tmp = join(TMP, 'stubbed__' + loadCount + '__' + basename(path).replace(/\.js$/, '.mjs').replace(/\.before$/, '.mjs'));
    writeFileSync(tmp, head + '\n' + src, 'utf8');
    const mod = await import(pathToFileURL(tmp).href);
    return { mod, imported : names, unanswered : missing };
}
async function loadPlain(path) {
    const tmp = join(TMP, 'plain__' + basename(path).replace(/\.js$/, '.mjs'));
    copyFileSync(path, tmp);
    return { mod : await import(pathToFileURL(tmp).href), imported : [], unanswered : [] };
}
function tvExports(rel) {
    const text = execFileSync('git', [ '-C', NAWEB, 'show', 'b2aa9151:' + TVAPP + rel ], { encoding : 'utf8', maxBuffer : 64 * 1024 * 1024 });
    const block = text.match(/export\s*\{([\s\S]*?)\};/);
    return block[1].split(',').map((s) => s.trim()).filter(Boolean).sort();
}

let failures = 0;
function check(name, passed, detail) {
    if (!passed) failures++;
    console.log((passed ? '  PASS  ' : '  FAIL  ') + name + ((!passed && detail !== undefined) ? '  -> ' + JSON.stringify(detail) : ''));
}

// THE REAL CONFIG UNITS, over ValeVision's AppConfig JSON -----------------------------------------------------------
const CONFIG = JSON.parse(readFileSync(join(SRC, LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'), 'utf8'));
const Val = (block, key, fallback) => { const b = CONFIG['LayoutEditor__' + block + '__Config']; const v = b ? b['LayoutEditor__' + block + '__' + key] : undefined; return (v === undefined || v === null) ? fallback : v; };
const Num = (block, key, fallback) => { const v = Val(block, key, undefined); return (typeof v === 'number' && Number.isFinite(v)) ? v : fallback; };
const SheetSetup  = (await load(join(SRC, LE + '03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js'), { Na__LeCfg__Val : Val, Na__LeCfg__Num : Num })).mod;
const EditorSetup = (await load(join(SRC, LE + '03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js'), { Na__LeCfg__Val : Val, Na__LeCfg__Num : Num })).mod;
const LayersUnit  = (await load(join(SRC, LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__Layers__.js'), {})).mod;

console.log('ValeVision3D - W1-13 modules load with no consumer');

const MODULES = [
    { rel : LE + '15__Core__Markup/Na__LayoutEditor__ShapeRings__.js',                       plain : true },
    { rel : LE + '15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js',                plain : true },
    { rel : LE + '15__Core__Markup/Na__LayoutEditor__MeasureParse__.js',                     plain : true },
    { rel : LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js', plain : true },
    { rel : LE + '51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js',   plain : true },
    { rel : LE + '15__Core__Markup/Na__LayoutEditor__PaintOrder__.js',                       stubs : () => ({ Na__LeModel__GetLayers : LayersUnit.Na__LeModel__GetLayers }) },
    { rel : LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js',     stubs : () => ({ Na__LeCfg__GetMarginNotesSetup : EditorSetup.Na__LeCfg__GetMarginNotesSetup }) },
    { rel : LE + '07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js',                  stubs : () => ({ Na__LeCfg__GetScaleSetup : SheetSetup.Na__LeCfg__GetScaleSetup }) },
    { rel : LE + '25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js',       stubs : (got) => ({ Na__LeScale__Coerce : got['Na__LayoutEditor__ScaleManager__.js'].Na__LeScale__Coerce }) }
];
const got = {};
for (const entry of MODULES) {
    const path = join(SRC, entry.rel);
    try {
        const loaded = entry.plain ? await loadPlain(path) : await load(path, entry.stubs(got));
        got[basename(entry.rel)] = loaded.mod;
        const exported = Object.keys(loaded.mod).sort();
        const want = tvExports(entry.rel);
        check(basename(entry.rel) + ' evaluates; exports = TrueVision\'s ' + want.length + ' names'
              + (loaded.imported.length ? '; imports ' + loaded.imported.join(', ') + ' answered by ValeVision\'s real units' : '; no imports'),
              JSON.stringify(exported) === JSON.stringify(want) && loaded.unanswered.length === 0, { exported, want, unanswered : loaded.unanswered });
    } catch (error) {
        check(basename(entry.rel) + ' evaluates', false, String(error && error.stack || error));
    }
}

// A FIRST QUESTION OF EACH -------------------------------------------------------------------------------------------
const R = got['Na__LayoutEditor__ShapeRings__.js'];
const square = [ [0,0], [10,0], [10,10], [0,10], [3,3], [7,3], [7,7], [3,7] ];
check('ShapeRings: a square with a square hole - edges, area and the hole is outside',
      JSON.stringify([ R.Na__LeRings__Edges(8, [4], true).length, R.Na__LeRings__Area(square, [4]), R.Na__LeRings__Contains(square, [4], 5, 5), R.Na__LeRings__Contains(square, [4], 1, 1) ]) === JSON.stringify([ 8, 84, false, true ]));
const DR = got['Na__LayoutEditor__DimensionRounding__.js'];
check('DimensionRounding: 6,413 reads 6,415, marked', JSON.stringify(DR.Na__LeDimRound__Up(6413, 0, 5)) === JSON.stringify({ valueMm : 6415, rounded : true }));
const MP = got['Na__LayoutEditor__MeasureParse__.js'];
check('MeasureParse 1.1.0: 3x, /3 and a refusal', JSON.stringify([ MP.Na__LeMParse__Array('3x'), MP.Na__LeMParse__Array('/3'), MP.Na__LeMParse__Array('2.5x') ])
      === JSON.stringify([ { ok : true, mode : 'times', count : 3 }, { ok : true, mode : 'divide', count : 3 }, { ok : false, reason : 'count' } ]));
const LN = got['Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js'];
check('LeaderlessNotes: a tick joins the foot', JSON.stringify(LN.Na__LeRec__LeaderlessToggled([ 'a', 'b' ], 'c', true)) === JSON.stringify([ 'a', 'b', 'c' ]));
const RN = got['Na__LayoutEditor__Register__Numbering__.js'];
const sheets = [ { Sheet__Id : 'S1', Sheet__Name : 'One' }, { Sheet__Id : 'S2', Sheet__Name : 'Two' }, { Sheet__Id : 'S3', Sheet__Name : 'Three' } ];
const plan = RN.Na__LeRegNum__Plan(sheets, { DrawingRegister__Numbering__Prefix : 'D', DrawingRegister__Numbering__Start : 1, DrawingRegister__Numbering__Digits : 2, DrawingRegister__Numbering__Overrides : { S3 : 10 } });
RN.Na__LeRegNum__Apply(sheets, plan);
let refused = false;
try { RN.Na__LeRegNum__Plan(sheets, { DrawingRegister__Numbering__Prefix : '9', DrawingRegister__Numbering__Start : 1, DrawingRegister__Numbering__Digits : 2 }); } catch (error) { refused = true; }
check('Register Numbering: D01, D02, a jump to D10, written to DrawingNumber in order; a digit-led prefix refused',
      JSON.stringify(sheets.map((s) => [ s.Sheet__Order, s.Sheet__Fields.Sheet__Fields__DrawingNumber ])) === JSON.stringify([ [1, 'D01'], [2, 'D02'], [3, 'D10'] ]) && refused);
const PO = got['Na__LayoutEditor__PaintOrder__.js'];
const layered = { Sheet__Layers : [ { Layer__Id : 'Text', Layer__Order : 0 }, { Layer__Id : 'Vectors', Layer__Order : 1 }, { Layer__Id : 'Viewports', Layer__Order : 2 }, { Layer__Id : 'Hidden', Layer__Order : 3, Layer__Visible : false } ],
                  Sheet__Viewports : [ { Viewport__Id : 'V1', Viewport__LayerId : 'Viewports' }, { Viewport__Id : 'V2', Viewport__LayerId : 'Hidden' }, { Viewport__Id : 'V3', Viewport__LayerId : 'Gone' } ] };
const steps = PO.Na__LePaint__Plan(layered).map((s) => s.kind + (s.viewport ? ':' + s.viewport.Viewport__Id : '') + (s.layerId !== undefined ? '@' + s.layerId : ''));
check('PaintOrder: back to front over ValeVision\'s real GetLayers - hidden layer left out, unknown layer frontmost, paper over the frontmost drawing',
      JSON.stringify(steps) === JSON.stringify([ 'viewport:V1@Viewports', 'layer@Viewports', 'layer@Vectors', 'layer@Text', 'viewport:V3@null', 'sheet', 'layer@null' ]), steps);
const NR = got['Na__LayoutEditor__SheetRecords__NoteRegions__.js'];
const least = EditorSetup.Na__LeCfg__GetMarginNotesSetup().regionMinSizeMm;
const boxed = EditorSetup.Na__LeCfg__GetMarginNotesSetup().regionBordersDefault;
check('NoteRegions: a new region over ValeVision\'s config (least size ' + least + ' mm, borders ' + boxed + ')',
      JSON.stringify(NR.Na__LeRec__NewNoteRegion([], { X : 1, Y : 2, WidthMm : 3, HeightMm : 40 })) === JSON.stringify({ Region__Id : 'Region_001', Region__FrameMm : { X : 1, Y : 2, WidthMm : Math.max(least, 3), HeightMm : Math.max(least, 40) }, Region__Title : null, Region__Overspill : true, Region__Groups : [], Region__Borders : { Top : boxed, Right : boxed, Bottom : boxed, Left : boxed } }));
const SM = got['Na__LayoutEditor__ScaleManager__.js'];
check('ScaleManager 1.2.1: the architectural list is ValeVision\'s; the site plan list answers only when asked', JSON.stringify([ SM.Na__LeScale__ListDenominators(), SM.Na__LeScale__ListDenominators(true), SM.Na__LeScale__Coerce(1250), SM.Na__LeScale__Coerce(1250, true) ]) === JSON.stringify([ [20, 50, 100], [100, 200, 500, 1250, 2500, 5000], 50, 1250 ]));
const SP = got['Na__LayoutEditor__SitePlanComposites__.js'];
check('SitePlanComposites (dormant): the built-in decks before Ready, block at 1:500, location at 1:1250, greyscale by luminance',
      JSON.stringify([ SP.Na__LeSpComp__DeckKeys(), SP.Na__LeSpComp__PlanTypeForScale(500), SP.Na__LeSpComp__PlanTypeForScale(1250), SP.Na__LeSpComp__Greyscale('#336699') ]) === JSON.stringify([ [ 'fills', 'patterns', 'linework' ], 'block', 'location', '#5f5f5f' ]));
const realConfig = join(SRC, LE + '25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__Config__.json');
const fetched = [];
globalThis.fetch = async (url) => { fetched.push(String(url)); return String(url).endsWith('/Na__LayoutEditor__SitePlanComposites__Config__.json') ? { ok : true, status : 200, json : async () => JSON.parse(readFileSync(realConfig, 'utf8')) } : { ok : false, status : 404 }; };
await SP.Na__LeSpComp__Ready();
check('SitePlanComposites: Ready() reads the landed config file (three decks, labels from the file, 1:500 boundary)',
      fetched.length === 1 && JSON.stringify(SP.Na__LeSpComp__GetDecks().map((d) => d.label)) === JSON.stringify([ 'Solid Fills', 'Hatch Patterns', 'Linework' ])
      && SP.Na__LeSpComp__GetDecks()[0].note.indexOf('The base layer') === 0 && SP.Na__LeSpComp__BlockMaxDenominator() === 500, fetched);

// MEASUREPARSE 1.1.0 AGAINST VALEVISION'S 1.0.0, on everything the Measurements box imports --------------------------
const OLD = (await load(join(HERE, 'backup__Na__LayoutEditor__MeasureParse__.js.before'), {})).mod;
const inputs = [ '2500', '2,500', '2500mm', '250cm', '2.5m', '2.5 M', '-1200', '+50', '2,5', '12,500', '1,500,900', '900,600', '3000,2000', '3000 x 2000', 'x2000', '3000,', ',2000', '3000x', '1,500', '2.', '.5', '', '   ', 'abc', '5 ft', '10mmx', '3000;2000', '3000*2000', '4 x 5 x 6', null, undefined, 7, '2500 mm', '1e3', '3x', '/3' ];
let same = 0, total = 0;
const differ = [];
for (const text of inputs) {
    for (const fn of [ 'Na__LeMParse__Length', 'Na__LeMParse__Pair' ]) {
        total++;
        const a = JSON.stringify(OLD[fn](text)), b = JSON.stringify(MP[fn](text));
        if (a === b) same++; else differ.push(fn + '(' + JSON.stringify(text) + '): ' + a + ' -> ' + b);
    }
}
for (const v of [ 0, 1, -1, 2500, 2500.5, -0.0004, 1234567.891, NaN, Infinity ]) for (const o of [ undefined, {}, { precision : 1 }, { precision : 3, thousandsSep : '' }, { precision : 2, suffix : ' mm' }, { precision : 9, thousandsSep : ' ' } ]) {
    total++;
    const a = OLD.Na__LeMParse__Format(v, o), b = MP.Na__LeMParse__Format(v, o);
    if (a === b) same++; else differ.push('Format(' + v + ', ' + JSON.stringify(o) + '): ' + a + ' -> ' + b);
}
check('MeasureParse: Length, Pair and Format answer exactly as 1.0.0 did (' + same + '/' + total + ')', same === total, differ);
check('MeasureParse: REASON_UNIT unchanged', OLD.Na__LeMParse__REASON_UNIT === MP.Na__LeMParse__REASON_UNIT);

rmSync(TMP, { recursive : true, force : true });
console.log(failures ? ('\n' + failures + ' check(s) FAILED') : '\nEvery check passed.');
process.exit(failures ? 1 : 0);
