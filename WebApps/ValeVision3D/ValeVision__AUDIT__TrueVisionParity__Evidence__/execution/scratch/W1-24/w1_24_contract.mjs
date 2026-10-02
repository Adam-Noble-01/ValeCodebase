// =============================================================================
// W1-24 scratch harness - the PDF exporter's contract (not shipped)
// =============================================================================
// Drives Na__LayoutEditor__PdfExporter__.js for real with every import stubbed
// and recorded, and jsPDF replaced by a stand-in that records every call:
//
//   node w1_24_contract.mjs --set before|candidate|live [--out file.json]
//   node w1_24_contract.mjs compare a.json b.json      (default-path logs, after the two documented differences)
//
// Contract checks (C1-C16) - what this package ports:
//   pictures packed 'FAST' unless options.pictureCompression is a string;
//   options.strict throwing on a missing drawing source / a 3D render that failed,
//   the default path still exporting; BuildDocument / DrawViewport / ExportSheet
//   carrying the options; LoadLibrary split from EnsureJsPdf and exported;
//   ExportSheet awaiting the save (returnPromise) before its toast.
// Run on the pre-image they must FAIL where the package changes behaviour -
// that is the proof the checks bite.
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const VV   = resolve(HERE, '..', '..', '..', '..');
const LEAF = 'Na__LayoutEditor__PdfExporter__.js';
const LIVE = join(VV, '02__Src__AppModules', '51__System__LayoutEditor', '60__Feature__PdfExport', LEAF);

const argv = process.argv.slice(2);
const arg  = (name, dflt) => { const i = argv.indexOf(name); return i === -1 ? dflt : argv[i + 1]; };

// -----------------------------------------------------------------------------
// compare mode
// -----------------------------------------------------------------------------
if (argv[0] === 'compare') {
    const a = JSON.parse(readFileSync(argv[1], 'utf8'));
    const b = JSON.parse(readFileSync(argv[2], 'utf8'));
    const pick = (doc) => doc.events.filter((e) => e.s.startsWith('D'));       // <-- The default-path scenarios
    const la = pick(a), lb = pick(b);
    const norm = (e) => {
        if (e.k === 'doc.addImage') return { s : e.s, k : e.k, d : e.d.slice(0, 6) };    // <-- Drop alias and compression: the documented change
        if (e.k === 'doc.save')     return { s : e.s, k : e.k, d : e.d.slice(0, 1) };    // <-- Drop the returnPromise option: the documented change
        return e;
    };
    let first = -1;
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
        if (JSON.stringify(norm(la[i] || {})) !== JSON.stringify(norm(lb[i] || {}))) { first = i; break; }
    }
    const addA = la.filter((e) => e.k === 'doc.addImage').map((e) => e.d[7]);
    const addB = lb.filter((e) => e.k === 'doc.addImage').map((e) => e.d[7]);
    console.log(a.label + ' addImage compression arguments: ' + JSON.stringify(addA));
    console.log(b.label + ' addImage compression arguments: ' + JSON.stringify(addB));
    if (first === -1) {
        console.log('IDENTICAL after normalising: ' + la.length + ' default-path events (' + a.label + ' vs ' + b.label + ')');
        process.exit(0);
    }
    console.log('DIFFERENT at default-path event ' + first + ' of ' + la.length + ' / ' + lb.length);
    console.log('  ' + a.label + ': ' + JSON.stringify(la[first]));
    console.log('  ' + b.label + ': ' + JSON.stringify(lb[first]));
    process.exit(1);
}

const SET = arg('--set', 'candidate');
const OUT = arg('--out', join(HERE, 'logs', 'contract__' + SET + '.json'));
const SOURCE = arg('--file', null) || (SET === 'live' ? LIVE : join(HERE, SET, LEAF));   // <-- --file: a planted mutant (mutation_check.py)

// -----------------------------------------------------------------------------
// The event log
// -----------------------------------------------------------------------------
const events = [];
let scenario = '-';
const plain = (value, depth = 0) => {
    if (typeof value === 'function') return 'fn';
    if (value === undefined) return '(undefined)';
    if (value === null || typeof value !== 'object') return value;
    if (depth > 6) return '(deep)';
    if (value instanceof Error) return 'Error: ' + value.message;
    if (Array.isArray(value)) return value.map((v) => plain(v, depth + 1));
    const out = {};
    Object.keys(value).sort().forEach((k) => { out[k] = plain(value[k], depth + 1); });
    return out;
};
const rec = (kind, data) => { events.push({ s : scenario, k : kind, d : plain(data) }); };

const consoleLog = console.log;
process.on('unhandledRejection', (reason) => rec('unhandledRejection', String(reason)));   // <-- A save nobody awaits rejects into the void; recorded, not fatal
console.warn  = (...a) => rec('console.warn', a);
console.error = (...a) => rec('console.error', a);
const say = (...a) => consoleLog(...a);

// -----------------------------------------------------------------------------
// A browser to run in
// -----------------------------------------------------------------------------
const scripts = [];
globalThis.window = {
    setTimeout : (fn, ms) => setTimeout(fn, ms), clearTimeout : (t) => clearTimeout(t),
    addEventListener : () => {}, removeEventListener : () => {}, dispatchEvent : () => true
};
globalThis.document = {
    createElement : (tag) => ({ tagName : tag, src : '', async : false, onload : null, onerror : null }),
    head : { appendChild : (el) => { scripts.push(el); rec('document.head.appendChild', { tag : el.tagName, src : el.src, async : el.async }); return el; } }
};

// The jsPDF stand-in: records every call the exporter makes
let saveMode = 'resolve';                                                       // <-- 'resolve' | 'defer' | 'reject'
let saveDeferred = null;
function FakeJsPdf(options) {
    rec('new jsPDF', options);
    const doc = {};
    const method = (name, ret) => (...a) => { rec('doc.' + name, a); return ret === undefined ? doc : ret; };
    [ 'setProperties', 'saveGraphicsState', 'restoreGraphicsState', 'rect', 'clip', 'discardPath', 'setDrawColor',
      'setLineWidth', 'setLineCap', 'setLineDashPattern', 'line' ].forEach((n) => { doc[n] = method(n); });
    doc.addImage = (...a) => { rec('doc.addImage', a); return doc; };
    doc.save = (...a) => {
        rec('doc.save', a);
        const wantsPromise = !!(a[1] && a[1].returnPromise);
        if (!wantsPromise) return doc;
        if (saveMode === 'reject') return Promise.reject('save failed in the stand-in');
        if (saveMode === 'defer') return new Promise((res) => { saveDeferred = () => { rec('save.resolved', null); res(true); }; });
        return Promise.resolve(true);
    };
    return doc;
}

// -----------------------------------------------------------------------------
// Loading the exporter with its imports bound to stubs
// -----------------------------------------------------------------------------
const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\})\s+from\s+'([^']+)';[ \t]*(?:\/\/[^\n]*)?$/gm;
const TMP = mkdtempSync(join(tmpdir(), 'W1-24__contract__'));
let loadCount = 0;
const unstubbed = new Set();
globalThis.__W124Unstubbed = (name) => { unstubbed.add(name); rec('unstubbed', name); };
async function loadExporter(stubs) {
    let src = readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        m[1].trim().slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
    }
    src = src.replace(IMPORT, '');
    const key = '__W124Stubs' + (++loadCount);
    globalThis[key] = stubs;
    const head = names.map((n) => 'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key
        + '["' + n + '"] : function () { globalThis.__W124Unstubbed("' + n + '"); return undefined; };').join('\n');
    const file = join(TMP, loadCount + '__' + LEAF.replace(/\.js$/, '.mjs'));
    writeFileSync(file, head + '\n' + src, 'utf8');
    return import(pathToFileURL(file).href);
}

// -----------------------------------------------------------------------------
// The outside world, stubbed and recorded
// -----------------------------------------------------------------------------
const PNG_2D = 'data:image/png;base64,UNDERLAY2D';
const PNG_3D = 'data:image/png;base64,PICTURE3D';
const recFn = (name, ret) => (...a) => { rec(name, a); return typeof ret === 'function' ? ret(...a) : ret; };

const MODEL_SOURCE = { groupId : null, label : '', storedId : null, explicit : false, missing : false, isLive : true, renderId : null, status : 'live' };
const STUBS = {
    Na__LeCfg__GetPdfSetup          : () => ({ jsPdfScriptPath : './04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js', author : 'W1-24 author', creator : 'W1-24 creator' }),
    Na__LeCfg__GetLineworkSetup     : () => ({ minSegmentPaperMm : 0.05 }),
    Na__LeCfg__GetLabel             : (key, dflt) => dflt,
    Na__LeCfg__GetSpecificationSetup: () => ({ loadTimeoutMs : 40 }),
    Na__LeCfg__FormatLabel          : (key, dflt, vars) => String(dflt).replace('{count}', vars && vars.count),
    Na__LeFileName__Build           : recFn('FileName.Build', (parts) => 'W1-24__' + parts.code + '__' + parts.paper + '.pdf'),
    Na__LeScale__SheetLabel         : (scales) => '1:' + scales.join('/'),
    Na__LeLayout__Solve             : recFn('Layout.Solve', () => ({ Page : { Orientation : 'landscape', WidthMm : 420, HeightMm : 297, Label : 'A3', SizeKey : 'A3' }, TitleBlockStyle : 'classic' })),
    Na__LeModel__KIND_2D            : '2d',
    Na__LeModel__GetLayers          : (sheet) => sheet.Sheet__Layers,
    Na__LeModel__GetFields          : () => ({ DrawingNumber : 'D07', Revision : 'B' }),
    Na__LeModel__IsLayerVisible     : (sheet, layerId) => layerId !== 'hidden',
    Na__LeChrome__Build             : recFn('Chrome.Build', () => [ { Kind : 'image', X : 0, Y : 0 }, { Kind : 'rect', X : 5, Y : 5 } ]),
    Na__LeChrome__DrawToPdf         : (doc, prims) => rec('Chrome.DrawToPdf', prims.map((p) => p.Kind + '@' + p.X + ',' + p.Y)),
    Na__LeMarkup__BuildScenePrimitives : recFn('Markup.BuildScenePrimitives', () => [ { Kind : 'text', X : 1, BaselineY : 2 } ]),
    Na__LeMarkup__BuildSheetPrimitives : recFn('Markup.BuildSheetPrimitives', () => [ { Kind : 'line', X1 : 0, Y1 : 0, X2 : 1, Y2 : 1 } ]),
    Na__LeVp2d__Describe            : (v) => ({ source : v.Viewport__DrawingId, definition : v.__def || null, window : { Denominator : 50, OriginX : 0, OriginY : 0 }, modelSource : Object.assign({}, MODEL_SOURCE) }),
    Na__LeVp2d__EnsureLinework      : recFn('Vp2d.EnsureLinework', () => Promise.resolve({ visible : [ 0, 0, 1000, 1000, 1000, 0, 0, 1000 ] })),
    Na__LeVp2d__RenderForExport     : recFn('Vp2d.RenderForExport', (v) => Promise.resolve(v.__def ? { dataUrl : PNG_2D, widthPx : 10, heightPx : 10 } : null)),
    Na__LeVp2d__StyleBands          : recFn('Vp2d.StyleBands', () => [ { className : 'visible', colour : '#202020', widthMm : 0.25, dashMm : [] } ]),
    Na__LeVp3d__RenderForExport     : recFn('Vp3d.RenderForExport', (sheet, v) => Promise.resolve(v.__render === false ? null : PNG_3D)),
    Na__LeVp3d__ExportRectMm        : recFn('Vp3d.ExportRectMm', (v) => ({ X : 2, Y : 3, WidthMm : v.Viewport__FrameMm.WidthMm - 4, HeightMm : v.Viewport__FrameMm.HeightMm - 6 })),
    Na__DrawData__GetProjectCode    : () => '3047',
    Na__LeSpec__EnsureLoaded        : recFn('Spec.EnsureLoaded', () => Promise.resolve()),
    Na__LeMargin__Report            : recFn('Margin.Report', () => ({ on : false, overflow : 0 }))
};

// -----------------------------------------------------------------------------
// Sheets
// -----------------------------------------------------------------------------
const vp2d = (id, layer, def, extra) => Object.assign({ Viewport__Id : id, Viewport__Kind : '2d', Viewport__LayerId : layer, Viewport__DrawingId : 'Elevation_002', __def : def,
    Viewport__FrameMm : { X : 20, Y : 30, WidthMm : 180, HeightMm : 120 }, Viewport__Styles : { projectedLinework : true, hiddenLines : false }, Viewport__MarkupMode : 'scene', Viewport__ScaleDenominator : 50 }, extra || {});
const vp3d = (id, layer, render, extra) => Object.assign({ Viewport__Id : id, Viewport__Kind : '3d', Viewport__LayerId : layer, Viewport__SceneId : 'su_scene_1', __render : render,
    Viewport__FrameMm : { X : 220, Y : 30, WidthMm : 160, HeightMm : 110 }, Viewport__Styles : {}, Viewport__ScaleDenominator : 0 }, extra || {});
const layers = [ { Layer__Id : 'top' }, { Layer__Id : 'bottom' } ];
const SHEET_A = { Sheet__Id : 'A', Sheet__Name : 'Elevations Test', Sheet__Layers : layers, Sheet__Lineweights : { ViewportPt : 0.35 },
    Sheet__Viewports : [ vp2d('VA_2d', 'top', { Elevation__Id : 'Elevation_002' }), vp3d('VA_3d', 'bottom', true), vp2d('VA_hidden', 'hidden', { Elevation__Id : 'X' }) ] };
const SHEET_B = { Sheet__Id : 'B', Sheet__Name : 'Missing Source', Sheet__Layers : layers, Sheet__Viewports : [ vp2d('VB_nodef', 'top', null), vp3d('VB_3d', 'bottom', true) ] };
const SHEET_C = { Sheet__Id : 'C', Sheet__Name : 'Failed 3D', Sheet__Layers : layers, Sheet__Viewports : [ vp2d('VC_2d', 'top', { Elevation__Id : 'Elevation_002' }), vp3d('VC_3d', 'bottom', false) ] };

// -----------------------------------------------------------------------------
// Checks
// -----------------------------------------------------------------------------
const results = [];
const check = (id, label, ok, detail) => { results.push({ id, label, ok : !!ok, detail : ok ? undefined : detail }); };
const of = (s, k) => events.filter((e) => e.s === s && e.k === k);
const balanced = (s) => of(s, 'doc.saveGraphicsState').length === of(s, 'doc.restoreGraphicsState').length;
const settle = () => new Promise((r) => setTimeout(r, 0));
const errorOf = async (promise) => { try { await promise; return null; } catch (e) { return e; } };

async function main() {
    say('W1-24 contract harness - set: ' + SET + ' (' + SOURCE + ')');
    window.jspdf = { jsPDF : FakeJsPdf };
    const pdf = await loadExporter(STUBS);
    const exported = Object.keys(pdf).sort();
    rec('exports', exported);

    // ---- Default path (the scenarios compare mode reads; names start with D) ----
    scenario = 'D1 ExportSheet(sheet, toast) - two arguments, as Download PDF, the web viewer and the Dev menu call it';
    const toasts1 = [];
    const ok1 = await pdf.Na__LePdf__ExportSheet(SHEET_A, (text, isError) => { toasts1.push([ text, isError ]); rec('toast', [ text, isError ]); });
    rec('return', ok1);
    scenario = 'D2 BuildDocument(sheet) - no options';
    const built2 = await pdf.Na__LePdf__BuildDocument(SHEET_A);
    rec('return.filename', built2 && built2.filename);
    scenario = 'D3 BuildDocument(missing source) - no options';
    const e3 = await errorOf(pdf.Na__LePdf__BuildDocument(SHEET_B));
    rec('return.error', e3);
    scenario = 'D4 BuildDocument(3D render failed) - no options';
    const e4 = await errorOf(pdf.Na__LePdf__BuildDocument(SHEET_C));
    rec('return.error', e4);

    const sD1 = 'D1 ExportSheet(sheet, toast) - two arguments, as Download PDF, the web viewer and the Dev menu call it';
    const sD2 = 'D2 BuildDocument(sheet) - no options';
    const sD3 = 'D3 BuildDocument(missing source) - no options';
    const sD4 = 'D4 BuildDocument(3D render failed) - no options';
    const adds2 = of(sD2, 'doc.addImage');
    check('C1', 'exports: Na__LePdf__EnsureJsPdf, Na__LePdf__LoadLibrary, Na__LePdf__BuildDocument, Na__LePdf__ExportSheet',
          JSON.stringify(exported) === JSON.stringify([ 'Na__LePdf__BuildDocument', 'Na__LePdf__EnsureJsPdf', 'Na__LePdf__ExportSheet', 'Na__LePdf__LoadLibrary' ]), exported);
    check('C2', 'default path: the 2D underlay and the 3D picture each go in once, as PNG, packed FAST (alias left undefined)',
          adds2.length === 2 && adds2.every((e) => e.d.length === 8 && e.d[1] === 'PNG' && e.d[6] === '(undefined)' && e.d[7] === 'FAST'), adds2.map((e) => e.d));
    check('C3', 'default path: underlay on the frame, 3D picture at frame + ExportRectMm (positions unchanged)',
          adds2.length === 2 && JSON.stringify(adds2[0].d.slice(0, 6)) === JSON.stringify([ PNG_3D, 'PNG', 222, 33, 156, 104 ])
          && JSON.stringify(adds2[1].d.slice(0, 6)) === JSON.stringify([ PNG_2D, 'PNG', 20, 30, 180, 120 ]), adds2.map((e) => e.d.slice(0, 6)));
    check('C4', 'ExportSheet with two arguments exports: returns true, toasts "PDF downloaded."',
          ok1 === true && toasts1.length === 1 && toasts1[0][0] === 'PDF downloaded.' && toasts1[0][1] === false, { ok1, toasts1 });
    check('C5', 'ExportSheet hands the save { returnPromise : true }',
          of(sD1, 'doc.save').length === 1 && JSON.stringify(of(sD1, 'doc.save')[0].d) === JSON.stringify([ 'W1-24__D07__A3.pdf', { returnPromise : true } ]), of(sD1, 'doc.save').map((e) => e.d));
    check('C6', 'default path skips a missing drawing source and a failed 3D render and still builds the document',
          e3 === null && e4 === null && of(sD3, 'doc.addImage').length === 1 && of(sD4, 'doc.addImage').length === 1, { e3 : String(e3), e4 : String(e4) });
    check('C7', 'every clip opened is closed (default path)', [ sD1, sD2, sD3, sD4 ].every(balanced), [ sD1, sD2, sD3, sD4 ].map((s) => [ of(s, 'doc.saveGraphicsState').length, of(s, 'doc.restoreGraphicsState').length ]));
    check('C8', "VV's paint path kept: the viewports draw bottom layer first, hidden layers skipped, then sheet markup, then chrome",
          JSON.stringify(of(sD2, 'Vp3d.RenderForExport').length + ':' + of(sD2, 'Vp2d.RenderForExport').length) === JSON.stringify('1:1')
          && events.filter((e) => e.s === sD2 && (e.k === 'Vp3d.RenderForExport' || e.k === 'Vp2d.RenderForExport' || e.k === 'Markup.BuildSheetPrimitives')).map((e) => e.k).join(',') === 'Vp3d.RenderForExport,Vp2d.RenderForExport,Markup.BuildSheetPrimitives',
          events.filter((e) => e.s === sD2).map((e) => e.k));
    check('C9', "the linework is still asked for with the viewport's Model Source: EnsureLinework(definition, null, false, modelSource)",
          of(sD2, 'Vp2d.EnsureLinework').length === 1 && JSON.stringify(of(sD2, 'Vp2d.EnsureLinework')[0].d) === JSON.stringify(plain([ { Elevation__Id : 'Elevation_002' }, null, false, MODEL_SOURCE ])), of(sD2, 'Vp2d.EnsureLinework').map((e) => e.d));

    // ---- Options ----
    scenario = 'O1 BuildDocument(sheet, { pictureCompression : SLOW })';
    await pdf.Na__LePdf__BuildDocument(SHEET_A, { pictureCompression : 'SLOW' });
    scenario = 'O2 BuildDocument(sheet, { pictureCompression : 7 }) - not a string';
    await pdf.Na__LePdf__BuildDocument(SHEET_A, { pictureCompression : 7 });
    scenario = 'O3 BuildDocument(sheet, { strict : false, pictureCompression : FAST }) - the publisher shape';
    const e_o3 = await errorOf(pdf.Na__LePdf__BuildDocument(SHEET_B, { strict : false, pictureCompression : 'FAST' }));
    scenario = 'O4 BuildDocument(missing source, { strict : true })';
    const e_o4 = await errorOf(pdf.Na__LePdf__BuildDocument(SHEET_B, { strict : true }));
    rec('return.error', e_o4);
    scenario = 'O5 BuildDocument(3D render failed, { strict : true })';
    const e_o5 = await errorOf(pdf.Na__LePdf__BuildDocument(SHEET_C, { strict : true }));
    rec('return.error', e_o5);
    scenario = 'O6 ExportSheet(missing source, toast, { strict : true })';
    const toasts6 = [];
    const ok6 = await pdf.Na__LePdf__ExportSheet(SHEET_B, (text, isError) => { toasts6.push([ text, isError ]); });
    rec('return.no-options', ok6);
    toasts6.length = 0;
    const ok6s = await pdf.Na__LePdf__ExportSheet(SHEET_B, (text, isError) => { toasts6.push([ text, isError ]); }, { strict : true });
    rec('return.strict', ok6s);
    const s1 = 'O1 BuildDocument(sheet, { pictureCompression : SLOW })';
    const s2 = 'O2 BuildDocument(sheet, { pictureCompression : 7 }) - not a string';
    const s3 = 'O3 BuildDocument(sheet, { strict : false, pictureCompression : FAST }) - the publisher shape';
    const s4 = 'O4 BuildDocument(missing source, { strict : true })';
    const s5 = 'O5 BuildDocument(3D render failed, { strict : true })';
    const s6 = 'O6 ExportSheet(missing source, toast, { strict : true })';
    check('C10', 'options.pictureCompression (a string) is handed to jsPDF for every viewport picture',
          of(s1, 'doc.addImage').length === 2 && of(s1, 'doc.addImage').every((e) => e.d[7] === 'SLOW'), of(s1, 'doc.addImage').map((e) => e.d[7]));
    check('C11', 'a pictureCompression that is not a string falls back to FAST',
          of(s2, 'doc.addImage').length === 2 && of(s2, 'doc.addImage').every((e) => e.d[7] === 'FAST'), of(s2, 'doc.addImage').map((e) => e.d[7]));
    check('C12', 'strict false (the publisher shape) skips a missing source and builds',
          e_o3 === null && of(s3, 'doc.addImage').length === 1 && of(s3, 'doc.addImage')[0].d[7] === 'FAST', String(e_o3));
    check('C13', "strict: a 2D viewport with no drawing source throws 'A viewport drawing source is missing.' and closes its clip",
          e_o4 instanceof Error && e_o4.message === 'A viewport drawing source is missing.' && balanced(s4), { error : String(e_o4), balanced : balanced(s4) });
    check('C14', "strict: a 3D viewport whose render failed throws 'A 3D viewport could not be rendered.' and closes its clip",
          e_o5 instanceof Error && e_o5.message === 'A 3D viewport could not be rendered.' && balanced(s5), { error : String(e_o5), balanced : balanced(s5) });
    check('C15', 'ExportSheet hands its options to BuildDocument: strict on the missing source returns false, logs and toasts the failure; without options it exports',
          ok6 === true && ok6s === false && toasts6.length === 1 && toasts6[0][1] === true && toasts6[0][0] === 'PDF export failed - see console.'
          && of(s6, 'console.error').length === 1 && of(s6, 'console.error')[0].d[0] === '[ValeVision3D LayoutEditor] PDF export failed:'
          && of(s6, 'console.error')[0].d[1] === 'Error: A viewport drawing source is missing.', { ok6, ok6s, toasts6, errors : of(s6, 'console.error').map((e) => e.d) });

    // ---- The awaited save ----
    scenario = 'S1 ExportSheet waits for the save before it toasts';
    saveMode = 'defer';
    const toastsS = [];
    const pending = pdf.Na__LePdf__ExportSheet(SHEET_A, (text, isError) => { toastsS.push([ text, isError ]); rec('toast', [ text, isError ]); });
    let waited = 0;
    while (!saveDeferred && waited < 200) { await new Promise((r) => setTimeout(r, 5)); waited++; }
    await settle(); await settle();
    const toastsBeforeSave = toastsS.length;
    if (saveDeferred) saveDeferred();
    const okS = await pending;
    saveDeferred = null;
    scenario = 'S2 ExportSheet when the save rejects';
    saveMode = 'reject';
    const toastsR = [];
    const okR = await pdf.Na__LePdf__ExportSheet(SHEET_A, (text, isError) => { toastsR.push([ text, isError ]); });
    await settle();
    saveMode = 'resolve';
    check('C16', 'the toast waits for the save: nothing toasted while the save is pending, "PDF downloaded." after it resolves',
          toastsBeforeSave === 0 && okS === true && toastsS.length === 1 && toastsS[0][0] === 'PDF downloaded.', { toastsBeforeSave, okS, toastsS });
    check('C17', 'a save that fails is reported: false, failure toast, console error',
          okR === false && toastsR.length === 1 && toastsR[0][1] === true && of('S2 ExportSheet when the save rejects', 'console.error').length === 1, { okR, toastsR });

    // ---- jsPDF loading: fresh module instances each ----
    scenario = 'L1 LoadLibrary with jsPDF already on the page';
    const L1 = await loadExporter(STUBS);
    const hasLoad = typeof L1.Na__LePdf__LoadLibrary === 'function';
    window.jspdf = { jsPDF : FakeJsPdf };
    const n0 = scripts.length;
    const got1 = hasLoad ? await L1.Na__LePdf__LoadLibrary() : null;
    check('C18', 'LoadLibrary answers the jsPDF already on the page and injects nothing', hasLoad && got1 === FakeJsPdf && scripts.length === n0, { hasLoad, injected : scripts.length - n0 });

    scenario = 'L2 LoadLibrary and EnsureJsPdf together while jsPDF is absent';
    const L2 = await loadExporter(STUBS);
    window.jspdf = undefined;
    const n1 = scripts.length;
    const pA = hasLoad ? L2.Na__LePdf__LoadLibrary() : Promise.resolve(null);
    const pB = hasLoad ? L2.Na__LePdf__LoadLibrary() : Promise.resolve(null);
    const pC = L2.Na__LePdf__EnsureJsPdf();
    await settle();
    const injected2 = scripts.slice(n1);
    window.jspdf = { jsPDF : FakeJsPdf };
    injected2.forEach((s) => s.onload && s.onload());
    const [ rA, rB, rC ] = await Promise.all([ pA, pB, pC ]);
    check('C19', 'one script for every concurrent caller, async, at the configured jsPDF path; all resolve to the same constructor',
          hasLoad && injected2.length === 1 && injected2[0].async === true && injected2[0].src === STUBS.Na__LeCfg__GetPdfSetup().jsPdfScriptPath
          && rA === FakeJsPdf && rB === FakeJsPdf && rC === FakeJsPdf, { hasLoad, injected : injected2.length });

    scenario = 'L3 LoadLibrary when the script fails, then again';
    const L3 = await loadExporter(STUBS);
    window.jspdf = undefined;
    const n2 = scripts.length;
    const failing = hasLoad ? errorOf(L3.Na__LePdf__LoadLibrary()) : Promise.resolve(null);
    await settle();
    const s3scripts = scripts.slice(n2);
    s3scripts.forEach((s) => s.onerror && s.onerror());
    const failure = await failing;
    const retry = hasLoad ? L3.Na__LePdf__LoadLibrary() : Promise.resolve(null);
    await settle();
    const s3again = scripts.slice(n2 + s3scripts.length);
    window.jspdf = { jsPDF : FakeJsPdf };
    s3again.forEach((s) => s.onload && s.onload());
    const retried = await retry;
    check('C20', "a script that fails rejects with 'jsPDF failed to load from <path>' and the next call tries again",
          hasLoad && failure instanceof Error && failure.message === 'jsPDF failed to load from ' + STUBS.Na__LeCfg__GetPdfSetup().jsPdfScriptPath
          && s3again.length === 1 && retried === FakeJsPdf, { hasLoad, failure : String(failure), retries : s3again.length });

    scenario = 'L4 EnsureJsPdf when the script loads but jsPDF never registers';
    const L4 = await loadExporter(STUBS);
    window.jspdf = undefined;
    const n3 = scripts.length;
    const ensure = errorOf(L4.Na__LePdf__EnsureJsPdf());
    await settle();
    scripts.slice(n3).forEach((s) => s.onload && s.onload());
    const notRegistered = await ensure;
    check('C21', "EnsureJsPdf passes LoadLibrary's failure on: 'jsPDF did not register'",
          notRegistered instanceof Error && notRegistered.message === 'jsPDF did not register', String(notRegistered));
    window.jspdf = { jsPDF : FakeJsPdf };

    check('C22', 'no import of the exporter was left unstubbed', unstubbed.size === 0, [ ...unstubbed ]);

    // ---- Report ----
    const failed = results.filter((r) => !r.ok);
    results.forEach((r) => say((r.ok ? '  PASS ' : '  FAIL ') + r.id + ' ' + r.label + (r.ok ? '' : '\n         ' + JSON.stringify(r.detail).slice(0, 600))));
    say('RESULT: ' + (results.length - failed.length) + '/' + results.length + ' contract checks pass (' + SET + ')');
    writeFileSync(OUT, JSON.stringify({ label : SET, source : SOURCE, results, events }, null, 1), 'utf8');
    say('event log: ' + OUT + ' (' + events.length + ' events)');
    process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => { say('HARNESS ERROR: ' + (error && error.stack || error)); process.exitCode = 2; });
