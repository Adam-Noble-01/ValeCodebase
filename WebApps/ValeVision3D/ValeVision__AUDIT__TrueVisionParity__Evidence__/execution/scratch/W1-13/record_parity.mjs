// W1-13 scratch harness: do ValeVision's ported margin record leaves (NoteRegions, LeaderlessNotes) normalise a
// fixture margin record EXACTLY as TrueVision's do?
//
//   A. TrueVision's own RECORD checks (lifted verbatim by make_record_checks.py) run twice:
//        VV side - ValeVision's two leaves from the live tree, ValeVision's config (its EditorSetup unit and its
//                  AppConfig JSON); TrueVision's SheetRecords at the pin stands in for the "shipped SheetRecords"
//                  that calls the leaves, because ValeVision's own SheetRecords 1.39.0 lands later (W1-19);
//        TV side - TrueVision's leaves, config and SheetRecords, all at the pin.
//   B. Differential: a corpus of margin records (the tests' fixtures plus edge cases) through NormaliseMarginNotes,
//      and every leaf function called directly - VV side against TV side, JSON-identical.
//   C. Information only: ValeVision's CURRENT SheetRecords (1.15.0) on the same corpus - what it keeps today.
//
// The loader is the TrueVision tests' own: each import is stubbed with what the caller hands in, else a function
// returning undefined. Writes only into the OS temp folder. Exit 0 = A and B all pass.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { NoteRegionsRecord, LeaderlessRecord } from './record_checks__generated.mjs';

const HERE   = dirname(fileURLToPath(import.meta.url));
const VV_SRC = resolve(HERE, '..', '..', '..', '..', '02__Src__AppModules');            // <-- scratch/W1-13 -> app root
const TV_SRC = resolve(HERE, 'tv', 'harness', '02__Src__AppModules');
const LE     = '51__System__LayoutEditor/';

globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = { addEventListener : () => {}, removeEventListener : () => {}, dispatchEvent : () => true,
                      localStorage : { getItem : () => null, setItem : () => {}, removeItem : () => {} }, setTimeout, clearTimeout };

const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let loadCount = 0;
async function load(root, relative, stubs) {
    let src = readFileSync(resolve(root, relative), 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        const list = m[1].trim();
        if (list.charAt(0) !== '{') continue;
        list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
    }
    const had = /^\s*import\s/m.test(src);
    src = src.replace(IMPORT, '');
    if (had && /^\s*import\s/m.test(src)) throw new Error('an import survived in ' + relative);
    const key = '__W113RecordStubs' + (++loadCount);
    globalThis[key] = stubs || {};
    const head = names.map((n) => 'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key + '["' + n + '"] : function () { return undefined; };').join('\n');
    const tmp = join(tmpdir(), 'W1-13__record_parity__' + loadCount + '__.mjs');
    writeFileSync(tmp, head + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
}

async function side(name, src, recordsRoot, recordsRel) {
    const CONFIG = JSON.parse(readFileSync(resolve(src, LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'), 'utf8'));
    const Val = (block, key, fallback) => { const b = CONFIG['LayoutEditor__' + block + '__Config']; const v = b ? b['LayoutEditor__' + block + '__' + key] : undefined; return (v === undefined || v === null) ? fallback : v; };
    const Num = (block, key, fallback) => { const v = Val(block, key, undefined); return (typeof v === 'number' && Number.isFinite(v)) ? v : fallback; };
    const Setup     = await load(src, LE + '03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js', { Na__LeCfg__Val : Val, Na__LeCfg__Num : Num });
    const cfg       = { Na__LeCfg__GetMarginNotesSetup : Setup.Na__LeCfg__GetMarginNotesSetup };
    const RegionRec = await load(src, LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js', cfg);
    const LeadRec   = await load(src, LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js', {});
    const Records   = await load(recordsRoot, recordsRel, Object.assign({}, cfg, RegionRec, LeadRec));
    return { name, Setup, RegionRec, LeadRec, Records };
}

const RECORDS_REL = LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js';
const VVS = await side('VV leaves + VV config (TV SheetRecords 1.39.0 as the caller)', VV_SRC, TV_SRC, RECORDS_REL);
const TVS = await side('TV leaves + TV config + TV SheetRecords (all at b2aa9151)', TV_SRC, TV_SRC, RECORDS_REL);

let failures = 0;
const results = {};

// A. TrueVision's own record checks, run on each side ------------------------------------------------------------------
for (const s of [ VVS, TVS ]) {
    let pass = 0, fail = 0;
    const check = (label, got, want) => {
        const ok = JSON.stringify(got) === JSON.stringify(want);
        if (ok) pass++; else fail++;
        console.log((ok ? '  PASS  ' : '  FAIL  ') + label);
        if (!ok) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
    };
    console.log('\n=== A. TrueVision\'s record checks, verbatim - ' + s.name);
    await NoteRegionsRecord({ Records : s.Records, RegionRec : s.RegionRec, LeadRec : s.LeadRec, Setup : s.Setup, check });
    await LeaderlessRecord({ Records : s.Records, RegionRec : s.RegionRec, LeadRec : s.LeadRec, Setup : s.Setup, check });
    console.log('  -> ' + pass + '/' + (pass + fail) + ' pass');
    results[s.name] = { pass, fail };
    failures += fail;
}

// B. Differential --------------------------------------------------------------------------------------------------------
const IN = 'SpecGroup_091', GN = 'SpecGroup_001', SN = 'SpecGroup_002', FN = 'SpecGroup_003';
const margin = (extra) => Object.assign({ Enabled : true, WidthMm : 90, Heading : null, TextSizeMm : 2, IncludeGeneral : true, GroupHeadings : false }, extra || {});
const region = (id, frame, extra) => Object.assign({ Region__Id : id, Region__FrameMm : frame, Region__Overspill : false, Region__Groups : [], Region__Borders : { Top : true, Right : true, Bottom : true, Left : true } }, extra || {});
const BIG = { X : 20, Y : 20, WidthMm : 220, HeightMm : 240 };
const CORPUS = [
    [ 'plain margin', margin() ],
    [ 'regions off, empty list', margin({ RegionsOn : false, Regions : [] }) ],
    [ 'regions kept, switch off', margin({ Regions : [ region('Region_004', { X : 1, Y : 2, WidthMm : 50, HeightMm : 60 }) ] }) ],
    [ 'messy regions (the TV test fixture)', margin({ RegionsOn : true, Regions : [
        region('Region_002', { X : 10, Y : 10, WidthMm : 3, HeightMm : 'tall' }, { Region__Title : '   ', Region__Groups : [ 'SpecGroup_002', 'SpecGroup_002', 'SpecGroup_999', '', 7 ] }),
        region('Region_002', { X : 10, Y : 10, WidthMm : 80, HeightMm : 80 }, { Region__Borders : { Top : false } }),
        'not a region', null, { Region__Id : 'Region_009' },
        region('', BIG, { Region__Overspill : true, Region__Title : 'Specification' }) ] }) ],
    [ 'leaderless off, empty list', margin({ LeaderlessOn : false, LeaderlessGroups : [] }) ],
    [ 'leaderless kept, switch off', margin({ LeaderlessGroups : [ IN ] }) ],
    [ 'messy leaderless (the TV test fixture)', margin({ LeaderlessOn : 'yes', LeaderlessGroups : [ SN, '', 7, null, IN, SN, 'SpecGroup_999', { id : FN } ] }) ],
    [ 'both, regions first', margin({ RegionsOn : true, Regions : [ region('Region_001', BIG) ], LeaderlessOn : true, LeaderlessGroups : [ IN ] }) ],
    [ 'regions not a list, switch a string', margin({ RegionsOn : 'true', Regions : { Region__Id : 'Region_001' } }) ],
    [ 'negative and huge frames, odd borders', margin({ RegionsOn : true, Regions : [
        region('Region_010', { X : -50, Y : 9999, WidthMm : -4, HeightMm : 1e9 }, { Region__Borders : { Top : 'yes', Right : 0, Bottom : false, Left : true, Extra : true } }),
        region('Region_7', null, { Region__Groups : 'SpecGroup_001', Region__Overspill : 'true', Region__Title : 7 }),
        region(' Region_011 ', { X : 0, Y : 0 }, { Region__Title : 'A typed title ' }) ] }) ],
    [ 'leaderless list a string, switch true', margin({ LeaderlessOn : true, LeaderlessGroups : 'SpecGroup_001' }) ],
    [ 'old 2.2 mm body, no width', { Enabled : 'yes', TextSizeMm : 2.2, RegionsOn : true, Regions : [ region('Region_001', { X : 5, Y : 5, WidthMm : 30, HeightMm : 30 }) ] } ],
    [ 'not an object', 'margin' ],
    [ 'null record', null ]
];
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
let compared = 0, mismatched = 0;
const same = (label, a, b) => {
    compared++;
    const ja = JSON.stringify(a), jb = JSON.stringify(b);
    if (ja !== jb) { mismatched++; console.log('  DIFF  ' + label + '\n        VV ' + ja + '\n        TV ' + jb); }
};
console.log('\n=== B. Differential: VV side against TV side');
const setupKeys = [ 'regionMinSizeMm', 'regionBordersDefault' ];
same('config the leaves read: ' + setupKeys.join(', '), setupKeys.map((k) => VVS.Setup.Na__LeCfg__GetMarginNotesSetup()[k]), setupKeys.map((k) => TVS.Setup.Na__LeCfg__GetMarginNotesSetup()[k]));
for (const [ label, raw ] of CORPUS) {
    const run = (s) => { const sheet = { Sheet__Id : 'Sheet_001', Sheet__MarginNotes : clone(raw) }; s.Records.Na__LeRec__NormaliseMarginNotes(sheet); return sheet; };
    const sv = run(VVS), st = run(TVS);
    same('NormaliseMarginNotes: ' + label, sv, st);
    same('NormaliseMarginNotes twice (idempotent): ' + label, run({ Records : { Na__LeRec__NormaliseMarginNotes : (s) => { VVS.Records.Na__LeRec__NormaliseMarginNotes(s); VVS.Records.Na__LeRec__NormaliseMarginNotes(s); } } }), st);
    same('NormaliseNoteRegions(raw, {}): ' + label, VVS.RegionRec.Na__LeRec__NormaliseNoteRegions(clone(raw), {}), TVS.RegionRec.Na__LeRec__NormaliseNoteRegions(clone(raw), {}));
    same('NormaliseLeaderlessNotes(raw, {}): ' + label, VVS.LeadRec.Na__LeRec__NormaliseLeaderlessNotes(clone(raw), {}), TVS.LeadRec.Na__LeRec__NormaliseLeaderlessNotes(clone(raw), {}));
    for (const reader of [ 'Na__LeRec__NoteRegionsOn', 'Na__LeRec__NoteRegions', 'Na__LeRec__DrawnNoteRegions' ]) {
        same(reader + ': ' + label, VVS.RegionRec[reader]({ Sheet__MarginNotes : clone(raw) }), TVS.RegionRec[reader]({ Sheet__MarginNotes : clone(raw) }));
    }
    for (const reader of [ 'Na__LeRec__LeaderlessOn', 'Na__LeRec__LeaderlessGroups', 'Na__LeRec__ListedLeaderlessGroups' ]) {
        same(reader + ': ' + label, VVS.LeadRec[reader]({ Sheet__MarginNotes : clone(raw) }), TVS.LeadRec[reader]({ Sheet__MarginNotes : clone(raw) }));
    }
}
const lists = [ [], [ region('Region_003', BIG) ], [ region('Region_001', BIG), region('Region_017', BIG) ], [ null, 'x', { Region__Id : 'Region_x9' } ] ];
const patches = [ undefined, {}, { title : 'T', overspill : false, groups : [ 'a', 'a', 'b' ], borders : { Top : false } }, { title : 5, overspill : 'no', groups : 'a', borders : 'none' } ];
const frames = [ { X : 1, Y : 2, WidthMm : 40, HeightMm : 50 }, { X : 'a', WidthMm : 1 }, null, undefined ];
lists.forEach((list, li) => patches.forEach((patch, pi) => frames.forEach((frame, fi) => {
    same('NewNoteRegion list ' + li + ' patch ' + pi + ' frame ' + fi, VVS.RegionRec.Na__LeRec__NewNoteRegion(clone(list), clone(frame), clone(patch)), TVS.RegionRec.Na__LeRec__NewNoteRegion(clone(list), clone(frame), clone(patch)));
})));
lists.forEach((list, li) => same('NextNoteRegionId list ' + li, VVS.RegionRec.Na__LeRec__NextNoteRegionId(clone(list)), TVS.RegionRec.Na__LeRec__NextNoteRegionId(clone(list))));
frames.forEach((frame, fi) => [ 5, 15, 40 ].forEach((min) => same('NoteRegionFrameOf frame ' + fi + ' min ' + min, VVS.RegionRec.Na__LeRec__NoteRegionFrameOf(clone(frame), min), TVS.RegionRec.Na__LeRec__NoteRegionFrameOf(clone(frame), min))));
[ null, {}, { Top : false, Left : 'x' }, 'none' ].forEach((b, bi) => [ true, false ].forEach((d) => same('NoteRegionBordersOf ' + bi + ' default ' + d, VVS.RegionRec.Na__LeRec__NoteRegionBordersOf(clone(b), d), TVS.RegionRec.Na__LeRec__NoteRegionBordersOf(clone(b), d))));
same('REGION_SIDES', VVS.RegionRec.Na__LeRec__REGION_SIDES, TVS.RegionRec.Na__LeRec__REGION_SIDES);
const glists = [ [], [ IN, SN, FN, GN ], [ SN, '', 7, SN, IN ], 'x' ];
const gids = [ IN, FN, '', 'SpecGroup_404', 7 ];
glists.forEach((gl, a) => gids.forEach((g, b) => [ true, false, 'yes' ].forEach((on) => same('LeaderlessToggled ' + a + '/' + b + '/' + on, VVS.LeadRec.Na__LeRec__LeaderlessToggled(clone(gl), g, on), TVS.LeadRec.Na__LeRec__LeaderlessToggled(clone(gl), g, on)))));
glists.forEach((gl, a) => gids.forEach((g, b) => [ -5, 0, 1, 2, 2.6, 99, NaN, '1' ].forEach((ix) => same('LeaderlessMoved ' + a + '/' + b + '/' + ix, VVS.LeadRec.Na__LeRec__LeaderlessMoved(clone(gl), g, ix), TVS.LeadRec.Na__LeRec__LeaderlessMoved(clone(gl), g, ix)))));
console.log('  -> ' + (compared - mismatched) + '/' + compared + ' identical');
failures += mismatched;

// C. Information only: ValeVision's current SheetRecords (1.15.0) on the same corpus ----------------------------------
console.log('\n=== C. Information only: ValeVision\'s CURRENT SheetRecords (1.15.0) with the new leaves beside it');
try {
    const cfgOnly = { Na__LeCfg__GetMarginNotesSetup : VVS.Setup.Na__LeCfg__GetMarginNotesSetup };
    const Current = await load(VV_SRC, RECORDS_REL, cfgOnly);
    let keeps = 0, drops = 0;
    for (const [ label, raw ] of CORPUS) {
        const a = { Sheet__Id : 'Sheet_001', Sheet__MarginNotes : clone(raw) };
        const b = { Sheet__Id : 'Sheet_001', Sheet__MarginNotes : clone(raw) };
        Current.Na__LeRec__NormaliseMarginNotes(a);
        TVS.Records.Na__LeRec__NormaliseMarginNotes(b);
        if (JSON.stringify(a) === JSON.stringify(b)) keeps++; else { drops++; console.log('  differs (expected until W1-19): ' + label); }
    }
    console.log('  -> ' + keeps + ' fixture(s) normalise as TrueVision does, ' + drops + ' differ: the 1.15.0 normaliser rebuilds the six margin keys and drops RegionsOn / Regions / LeaderlessOn / LeaderlessGroups (S03b b2 rows 9-12), so nothing reads the new leaves before W1-19.');
} catch (error) {
    console.log('  (could not run: ' + error.message + ')');
}

console.log('\nSUMMARY: A ' + Object.entries(results).map(([ k, v ]) => v.pass + '/' + (v.pass + v.fail) + ' [' + k + ']').join('; ') + '; B ' + (compared - mismatched) + '/' + compared + ' identical');
console.log(failures ? ('\n' + failures + ' problem(s)') : '\nEvery check passed.');
process.exit(failures ? 1 : 0);
