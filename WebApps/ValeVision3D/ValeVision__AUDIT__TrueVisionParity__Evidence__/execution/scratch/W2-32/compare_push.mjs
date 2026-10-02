// W2-32 scratch: VV SpecMargin 1.3.0 (backup) against the ported 1.5.0, on
// sheets with no regions and no leaderless groups. Push primitives, Plan and
// the Report fields 1.3.0 had must be identical. Same loader as the tests.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = { addEventListener : () => {}, removeEventListener : () => {}, dispatchEvent : () => true, localStorage : { getItem : () => null, setItem : () => {}, removeItem : () => {} }, setTimeout, clearTimeout };

const HERE = dirname(fileURLToPath(import.meta.url));
const VV   = resolve(HERE, '..', '..', '..', '..');
const SRC  = join(VV, '02__Src__AppModules');
const LE   = '51__System__LayoutEditor/';
const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let n = 0;
async function load(abs, stubs) {
    let src = readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
    const names = []; let m; IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) { const l = m[1].trim(); if (l[0] !== '{') continue; l.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop())); }
    src = src.replace(IMPORT, '');
    if (/^\s*import\s/m.test(src)) throw new Error('import survived in ' + abs);
    const key = '__Cmp' + (++n); globalThis[key] = stubs || {};
    const head = names.map((x) => 'const ' + x + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + x + '") ? globalThis.' + key + '["' + x + '"] : function () { return undefined; };').join('\n');
    const tmp = join(tmpdir(), 'W2-32__cmp__' + n + '.mjs'); writeFileSync(tmp, head + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href);
}
const le = (p) => join(SRC, LE + p);

const CONFIG = JSON.parse(readFileSync(le('03__Core__Config/Na__LayoutEditor__AppConfig__.json'), 'utf8'));
const Val = (b, k, f) => { const B = CONFIG['LayoutEditor__' + b + '__Config']; const v = B ? B['LayoutEditor__' + b + '__' + k] : undefined; return (v === undefined || v === null) ? f : v; };
const Num = (b, k, f) => { const v = Val(b, k, undefined); return (typeof v === 'number' && Number.isFinite(v)) ? v : f; };
const Setup = await load(le('03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js'), { Na__LeCfg__Val : Val, Na__LeCfg__Num : Num });
const PAPERS = { A3 : { Label : 'ISO A3', WidthMm : 420, HeightMm : 297 }, A2 : { Label : 'ISO A2', WidthMm : 594, HeightMm : 420 }, A4 : { Label : 'ISO A4', WidthMm : 297, HeightMm : 210 } };
const cfg = {
    Na__LeCfg__GetMarginNotesSetup : Setup.Na__LeCfg__GetMarginNotesSetup,
    Na__LeCfg__GetStyleSetup       : () => ({ inkColour : '#172b3a', mutedTextColour : '#6c757d', paperColour : '#ffffff' }),
    Na__LeCfg__GetTextSetup        : () => ({ fontFamily : 'Open Sans' }),
    Na__LeCfg__GetSheetSetup       : () => ({ marginMm : 5, blockGapMm : 4, borderStrokeMm : 0.5, paperSizes : PAPERS, defaultPaperSize : 'A3', defaultOrientation : 'landscape', screenPixelsPerMm : 3.2 }),
    Na__LeCfg__GetTitleBlockSetup  : () => ({ heightMm : 20, defaultStyle : 'modern' }),
    Na__LeCfg__PtToMm              : (pt) => pt * 25.4 / 72
};
const chrome = {
    Na__LeChrome__MeasureTextMm : (t, f, w, tr) => { const v = String(t == null ? '' : t); if (!v) return 0; return (v.length * f * (w === 'bold' ? 0.56 : 0.52)) + ((typeof tr === 'number' && tr > 0) ? tr * v.length : 0); },
    Na__LeChrome__PushRect : (l, x, y, w, h, sc, sm, fc) => l.push(['rect', x, y, w, h, sc || null, typeof sm === 'number' ? sm : 0, fc || null]),
    Na__LeChrome__PushLine : (l, x1, y1, x2, y2, sc, sm) => l.push(['line', x1, y1, x2, y2, sc, sm]),
    Na__LeChrome__PushText : (l, s) => l.push(['text', s])
};
const Layout    = await load(le('07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js'), cfg);
const RegionRec = await load(le('07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js'), cfg);
const LeadRec   = await load(le('07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js'), {});
const Records   = await load(le('07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js'), Object.assign({}, cfg, RegionRec, LeadRec));

// Two specifications: the tests' (3 groups, 15 notes, long bodies) and 3047__Doous's own.
let SPEC;
const BODY = 'Walls in coursed natural stone to match the existing, laid in lime mortar and pointed flush, with every opening dressed in cut ashlar.\nSecond typed line kept.';
function specOf(groups) { const entries = []; groups.forEach((g, gi) => (g.Group__Notes || []).forEach((note, i) => entries.push({ group : g, groupIndex : gi, index : i, order : entries.length, code : note.Note__Code, note }))); return { groups, entries }; }
const synth = specOf([ [ 'GN', 'General Notes', true, 4 ], [ 'SN', 'Structural Notes', false, 6 ], [ 'FN', 'Finishes', false, 5 ] ].map(([ p, t, gen, c ], gi) => ({ Group__Id : 'SpecGroup_00' + (gi + 1), Group__Prefix : p, Group__Title : t, Group__IsGeneral : gen, Group__Notes : Array.from({ length : c }, (_, i) => ({ Note__Id : 'SpecNote_' + p + i, Note__Code : p + String(i + 1).padStart(2, '0'), Note__Title : 'Note ' + p + (i + 1), Note__Body : i % 3 === 2 ? '' : BODY.repeat(1 + (i % 2)) })) })));
const doousDir = resolve(VV, '..', 'Whitecardopedia', 'Projects', '2026', '3047__Doous');
const doous = existsSync(join(doousDir, 'ValeVision__DrawingNotes__.json')) ? specOf(JSON.parse(readFileSync(join(doousDir, 'ValeVision__DrawingNotes__.json'), 'utf8')).ProjectSpecification__Groups) : null;
let LINKED = new Set();
const spec = {
    Na__LeSpec__IsLoaded : () => process.env.W232_LOADING !== '1',
    Na__LeSpec__ListNotes : () => SPEC.entries,
    Na__LeSpec__GetGroupById : (id) => SPEC.groups.find((g) => g.Group__Id === id) || null,
    Na__LeSpecLink__LinkedNoteIds : () => LINKED
};
const common = Object.assign({}, cfg, chrome, Layout, Records, RegionRec, LeadRec, spec);
const SPECDIR = le('50__Feature__Specification/');
const Old     = await load(join(HERE, 'backup', 'Na__LayoutEditor__SpecMargin__.js'), common);
const Column  = await load(SPECDIR + 'Na__LayoutEditor__SpecMargin__Column__.js', common);
const Regions = await load(SPECDIR + 'Na__LayoutEditor__NoteRegions__.js', Object.assign({}, common, Column));
const New     = await load(SPECDIR + 'Na__LayoutEditor__SpecMargin__.js', Object.assign({}, common, Column, Regions));

let cases = 0, same = 0, PRIMS = 0; const diffs = []; const NEWKEYS = new Set(); const BUCKET = {};
const OLDKEYS = [ 'on', 'settings', 'rect', 'total', 'linked', 'general', 'pending', 'shown', 'overflow' ];
for (const [ specName, S ] of [ [ 'synthetic', synth ], [ '3047__Doous', doous ] ]) {
    if (!S) continue;
    SPEC = S;
    const linkedSets = [ [], S.entries.filter((e) => !e.group.Group__IsGeneral).map((e) => e.note.Note__Id), S.entries.filter((e, i) => i % 2 === 0).map((e) => e.note.Note__Id) ];
    for (const linked of linkedSets) for (const paper of [ [ 'A3', 'landscape' ], [ 'A3', 'portrait' ], [ 'A2', 'landscape' ], [ 'A4', 'landscape' ] ])
    for (const enabled of [ true, false ]) for (const width of [ 40, 55.2, 90, 140 ]) for (const textMm of [ 1.5, 2, 3 ])
    for (const includeGeneral of [ true, false ]) for (const groupHeadings of [ false, true ]) for (const heading of [ null, 'NOTES', 'Specification notes for this sheet' ]) {
        LINKED = new Set(linked);
        const sheet = { Sheet__Id : 'Sheet_001', Sheet__PaperSize : paper[0], Sheet__Orientation : paper[1], Sheet__MarginNotes : { Enabled : enabled, WidthMm : width, Heading : heading, TextSizeMm : textMm, IncludeGeneral : includeGeneral, GroupHeadings : groupHeadings } };
        Records.Na__LeRec__NormaliseMarginNotes(sheet);
        const a = [], b = [];
        Old.Na__LeMargin__Push(a, sheet, null); New.Na__LeMargin__Push(b, sheet, null);
        const ra = Old.Na__LeMargin__Report(sheet, null), rb = New.Na__LeMargin__Report(sheet, null);
        const pick = (r) => OLDKEYS.map((k) => r[k]);
        const extra = [ rb.marginLost === rb.overflow, rb.marginOverflow === rb.overflow, rb.inRegions === 0, rb.unlisted === 0 || !enabled, rb.leaderless === 0 ];
        const po = Old.Na__LeMargin__Plan(sheet, null), pn = New.Na__LeMargin__Plan(sheet, null);
        const planSame = (po === null && pn === null) || (po && pn && Object.keys(po).every((k) => JSON.stringify(po[k]) === JSON.stringify(pn[k])) && Object.keys(pn).filter((k) => !(k in po)).every((k) => !pn[k]));
        if (po && pn) Object.keys(pn).filter((k) => !(k in po)).forEach((k) => NEWKEYS.add(k + '=' + JSON.stringify(pn[k])));
        const why = [ JSON.stringify(a) === JSON.stringify(b), JSON.stringify(pick(ra)) === JSON.stringify(pick(rb)), !!planSame ];
        const ok = why.every(Boolean) && extra.every(Boolean);
        if (!ok) { const k = 'heading=' + heading + ' width=' + width + ' why=' + why.join('/') + ' oldHeadingRuns=' + a.filter((p) => p[0] === 'text' && p[1].Text && String(p[1].Text).toUpperCase() === String(p[1].Text) && /SPEC/i.test(p[1].Text)).length; BUCKET[k] = (BUCKET[k] || 0) + 1; }
        PRIMS += a.length; cases++; if (ok) same++; else if (diffs.length < 5) diffs.push({ why, specName, linked : linked.length, paper, enabled, width, textMm, includeGeneral, groupHeadings, heading, prims : [ a.length, b.length ], reportOld : pick(ra), reportNew : pick(rb), extra });
    }
}
console.log('cases', cases, 'identical', same, 'primitives compared', PRIMS);
console.log(JSON.stringify(BUCKET, null, 1));
console.log('keys new in the 1.5.0 plan (values seen):', [ ...NEWKEYS ].join(', '));
if (diffs.length) console.log(JSON.stringify(diffs, null, 1));
process.exit(cases === same ? 0 : 1);
