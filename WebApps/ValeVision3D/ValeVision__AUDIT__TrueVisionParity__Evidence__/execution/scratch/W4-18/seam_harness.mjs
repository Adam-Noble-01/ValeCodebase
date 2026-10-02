// W4-18 scratch harness (not a repo test): load ValeVision's ported Register__Pdf, Register__Preview and
// Register__Notes - and TrueVision's Register__Pdf at the pin, from scratch/W4-18/tv - with every import from
// outside the register answered by in-memory stand-ins, and prove the seams: the display name, the document code,
// the Vale office fallback, the yellow-as-amber box, the console prefix, the PDF.js vendor path; and that with
// the seams' inputs made equal, ValeVision's PDF draws exactly what TrueVision's draws.
//
//   node seam_harness.mjs      (from anywhere; exit 0 = every check passed)

import { register } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE     = dirname(fileURLToPath(import.meta.url));
const VV_REG   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/51__Feature__DrawingRegister';
const TV_REG   = join(HERE, 'tv');

const STUBS = {
    'Na__LayoutEditor__ConfigState__.js'          : [ 'Na__LeCfg__GetDrawingRegisterSetup', 'Na__LeCfg__GetPdfSetup', 'Na__LeCfg__GetTitleBlockSetup', 'Na__LeCfg__StatusToStore' ],
    'Na__LayoutEditor__SheetModel__.js'           : [ 'Na__LeModel__GetSheets', 'Na__LeModel__GetFields', 'Na__LeModel__GetTabLabel', 'Na__LeModel__GetDrawingNumber', 'Na__LeModel__GetPhase', 'Na__LeModel__GetDocumentId' ],
    'Na__LayoutEditor__SheetLayout__.js'          : [ 'Na__LeLayout__PaperSizeMm' ],
    'Na__LayoutEditor__PdfExporter__.js'          : [ 'Na__LePdf__EnsureJsPdf' ],
    'Na__LayoutEditor__PdfFonts__.js'             : [ 'Na__LePdfFonts__EnsureLoaded', 'Na__LePdfFonts__Install', 'Na__LePdfFonts__SetFont' ],
    'Na__LayoutEditor__PdfFilename__.js'          : [ 'Na__LeFileName__Build' ],
    'Na__DrawView__ProjectData__.js'              : [ 'Na__DrawData__GetProjectCode', 'Na__DrawData__GetDocumentCode' ],
    'Na__CloudflareIntegration__ApiClient__.js'   : [ 'Na__CfApi__GetLoadedProjectData', 'Na__CfApi__GetProjectDisplayName', 'Na__CfApi__MergeAndSaveKeys', 'Na__CfApi__ReadProjectData', 'Na__CfApi__ProjectFileLocation' ],
    'Na__AppUtils__LocalProjectMirror__.js'       : [ 'Na__LocalMirror__MergeKeys' ],
    'Na__AppUtils__ConfirmDialog.js'              : [ 'Na__AppUtils__ConfirmDialog__Show' ]
};

const HOOKS = `
    let STUBS = {};
    export async function initialize(data) { STUBS = data.stubs; }
    export async function resolve(specifier, context, next) {
        const tail = specifier.split('/').pop();
        if (STUBS[tail]) return { url : 'na-stub:' + tail, shortCircuit : true };
        return next(specifier, context);
    }
    export async function load(url, context, next) {
        if (url.startsWith('na-stub:')) {
            const tail = url.slice('na-stub:'.length);
            return { format : 'module', shortCircuit : true, source : STUBS[tail].map((name) =>
                'export const ' + name + ' = (...a) => globalThis.__NaStubs[' + JSON.stringify(name) + '](...a);').join('\\n') };
        }
        if (url.endsWith('.js')) return next(url, { ...context, format : 'module' });
        return next(url, context);
    }
`;
register('data:text/javascript,' + encodeURIComponent(HOOKS), { data : { stubs : STUBS } });

let failures = 0, passes = 0;
const check = (name, ok, detail) => { if (ok) passes++; else failures++; console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || detail === undefined ? '' : '  ->  ' + JSON.stringify(detail).slice(0, 400))); };

// ---------------------------------------------------------------- DOM / window stand-ins
class El extends EventTarget {
    constructor(tag) { super(); this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.dataset = {}; this.hidden = false; this.value = ''; this.textContent = ''; }
    append(...c) { c.forEach((x) => this.appendChild(x)); }
    appendChild(c) { this.children.push(c); c.parent = this; if (this.tagName === 'HEAD' && c.tagName === 'SCRIPT') W.scripts.push(c); return c; }
    replaceChildren(...c) { this.children = []; this.append(...c); }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getContext() { return { fillStyle : null, fillRect() {} }; }
    remove() {}
    find(t) { for (const c of this.children) { if (t(c)) return c; const d = c.find ? c.find(t) : null; if (d) return d; } return null; }
    all(t, out = []) { for (const c of this.children) { if (t(c)) out.push(c); if (c.all) c.all(t, out); } return out; }
}
const W = { scripts : [], warns : [] };
globalThis.document = { head : new El('head'), body : new El('body'), createElement : (t) => new El(t) };
const win = new EventTarget();
win.localStorage = { getItem : () => null, setItem() {}, removeItem() {} };
win.devicePixelRatio = 1;
win.TrueVision__Pwa__ProjectContext = { get : () => ({ displayName : 'NA PWA NAME (must never be read)' }) };
globalThis.window = win;
globalThis.fetch = async () => { throw new Error('offline harness'); };
const realWarn = console.warn;
console.warn = (...a) => { W.warns.push(a.map(String).join(' ')); };

// ---------------------------------------------------------------- the fake jsPDF (records every draw)
class FakePdf {
    constructor() { FakePdf.last = this; this.calls = []; this.pages = 1; this.props = null; }
    log(...a) { this.calls.push(a); }
    setFont(...a) { this.log('setFont', ...a); } setFontSize(p) { this.log('setFontSize', p); } setTextColor(c) { this.log('setTextColor', c); }
    setDrawColor(c) { this.log('setDrawColor', c); } setLineWidth(w) { this.log('setLineWidth', w); } line(...a) { this.log('line', ...a.map((n) => +n.toFixed(3))); }
    setFillColor(c) { this.log('setFillColor', c); } rect(...a) { this.log('rect', ...a.map((n) => (typeof n === 'number' ? +n.toFixed(3) : n))); }
    text(t, x, y) { this.log('text', t, +x.toFixed(3), +y.toFixed(3)); } setCharSpace(s) { this.log('setCharSpace', s); }
    getTextWidth(s) { return String(s).length * 1.7; }
    splitTextToSize(t, w) { const per = Math.max(1, Math.floor(w / 1.7)); const out = []; let s = String(t); while (s.length > per) { out.push(s.slice(0, per)); s = s.slice(per); } out.push(s); return out; }
    addImage(...a) { this.log('addImage', a[1]); } addPage() { this.pages++; this.log('addPage'); } setPage(n) { this.log('setPage', n); }
    getNumberOfPages() { return this.pages; } setProperties(p) { this.props = p; this.log('setProperties', p); }
    async save(name) { this.saved = name; }
}

// ---------------------------------------------------------------- the world the PDF reads
const S = {};
const cfg = {
    prefix : 'D', start : 1, digits : 2, pdfMarginMm : 14, pdfFontPt : 9,
    pdfJsScriptPath : './04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.min.js',
    pdfJsWorkerPath : './04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.worker.min.js',
    titlePt : 19, headingPt : 11, metaPt : 8.5, tableHeadPt : 7.5, notePt : 9, rowPadMm : 4, lineMm : 4.6, cellPadMm : 3.2, headRowMm : 9.5, columnMaxMm : 46,
    columns : [
        { key : 'drawingNo', heading : 'DWG No.', minMm : 15, align : 'left' }, { key : 'documentCode', heading : 'DOCUMENT CODE', minMm : 24, align : 'left' },
        { key : 'name', heading : 'DOCUMENT NAME', minMm : 40, align : 'left' }, { key : 'scale', heading : 'SCALE', minMm : 14, align : 'centre' },
        { key : 'size', heading : 'SIZE', minMm : 14, align : 'centre' }, { key : 'revision', heading : 'REV', minMm : 12, align : 'right' }
    ],
    phases : [], defaultPhase : '', documentCodeFmt : '{project}_{drawing}', registerSuffix : '_REGISTER', logoAspect : 4.5, collapseScale : true, emptyCell : '-',
    previewWidthPx : 794, previewMaxDpr : 3,
    ink : '#172b3a', muted : '#6c757d', accent : '#172b3a', header : '#eef1f4', stripe : '#f6f8fa', rule : '#d9dfe4',
    warnAmberFill : '#fff6e3', warnAmberInk : '#8a5a00', warnRedFill : '#fdf0f0', warnRedInk : '#9b3b3b'
};
const sheet = (id, n, name, rev, notes) => ({ id, n, name, rev, notes });
S.sheets = [ sheet('Sheet_a', 'D01', 'Floor Plans', 'A', []), sheet('Sheet_b', 'D02', 'Elevations', 'B', []) ];
S.revisions = {};
S.author = 'Vale Garden Houses Limited';
S.display = 'Doous Orangery';
S.projectCode = '2026/3047__Doous';
S.documentCode = '3047';
S.loaded = { projectCode : '3047', projectName : 'Doous' };
S.files = [];
globalThis.__NaStubs = {
    Na__LeCfg__GetDrawingRegisterSetup : () => cfg,
    Na__LeCfg__GetPdfSetup             : () => ({ author : S.author, creator : 'ValeVision3D Layout Editor' }),
    Na__LeCfg__GetTitleBlockSetup      : () => ({ logoAssetPath : '../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png' }),
    Na__LeCfg__StatusToStore           : (v) => v || null,
    Na__LeModel__GetSheets             : () => S.sheets.map((s) => ({ Sheet__Id : s.id, Sheet__Name : s.name, Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape', Sheet__Fields : { n : s.n, rev : s.rev } })),
    Na__LeModel__GetFields             : (s) => ({ Scale : '1:50 @ ISO A3', Revision : s.Sheet__Fields.rev, Status : '' , DrawingNumber : s.Sheet__Fields.n }),
    Na__LeModel__GetTabLabel           : (s) => s.Sheet__Fields.n + ' - ' + s.Sheet__Name,
    Na__LeModel__GetDrawingNumber      : (s) => s.Sheet__Fields.n,
    Na__LeModel__GetPhase              : () => '',
    Na__LeModel__GetDocumentId         : (s) => S.documentCode + '_' + s.Sheet__Fields.n,
    Na__LeLayout__PaperSizeMm          : () => ({ Label : 'A3', WidthMm : 420, HeightMm : 297 }),
    Na__LePdf__EnsureJsPdf             : async () => FakePdf,
    Na__LePdfFonts__EnsureLoaded       : async () => true,
    Na__LePdfFonts__Install            : () => true,
    Na__LePdfFonts__SetFont            : () => true,
    Na__LeFileName__Build              : (o) => { S.files.push(o); return o.projectCode + '_' + o.code + '.pdf'; },
    Na__DrawData__GetProjectCode       : () => S.projectCode,
    Na__DrawData__GetDocumentCode      : () => S.documentCode,
    Na__CfApi__GetLoadedProjectData    : () => ({ ...S.loaded, LayoutEditor__DrawingRegister : { DrawingRegister__Revisions : S.revisions } }),
    Na__CfApi__GetProjectDisplayName   : () => S.display,
    Na__CfApi__MergeAndSaveKeys        : async () => ({ ok : true }),
    Na__CfApi__ReadProjectData         : async () => ({ ok : true, data : {} }),
    Na__CfApi__ProjectFileLocation     : () => null,
    Na__LocalMirror__MergeKeys         : async () => ({ ok : true }),
    Na__AppUtils__ConfirmDialog__Show  : async () => true
};

const vvPdf  = await import(pathToFileURL(join(VV_REG, 'Na__LayoutEditor__Register__Pdf__.js')).href);
const tvPdf  = await import(pathToFileURL(join(TV_REG, 'Na__LayoutEditor__Register__Pdf__.js')).href);
const texts  = (doc) => doc.calls.filter((c) => c[0] === 'text').map((c) => c[1]);
const fills  = (doc) => doc.calls.filter((c) => c[0] === 'setFillColor').map((c) => c[1]);

console.log('W4-18 seam harness');
console.log('\n  -- Register__Pdf: project name (K2 K4, R3 C.4 S11) --');
check('Name = the loaded project\'s display name, never the PWA global', vvPdf.Na__LeRegPdf__ProjectName() === 'Doous Orangery');
S.display = '';
check('No display name -> Project__Name (TV key, kept), else the document code', vvPdf.Na__LeRegPdf__ProjectName() === '3047');
S.loaded.Project__Name = 'Typed name'; check('...Project__Name when it is set', vvPdf.Na__LeRegPdf__ProjectName() === 'Typed name'); delete S.loaded.Project__Name;
check('TrueVision\'s own copy reads the PWA global (the seam is real)', tvPdf.Na__LeRegPdf__ProjectName() === 'NA PWA NAME (must never be read)');
S.display = 'Doous Orangery';

console.log('\n  -- Register__Pdf: the document (DR-11, office name, DR-37 item 2) --');
S.revisions = {
    Sheet_a : [ { DrawingRegister__Revision__Code : 'A', DrawingRegister__Revision__Notes : 'Yellow note', DrawingRegister__Revision__Warning : 'yellow', DrawingRegister__Revision__WarningText : 'Awaiting the client' } ],
    Sheet_b : [ { DrawingRegister__Revision__Code : 'B', DrawingRegister__Revision__Notes : 'Red note',    DrawingRegister__Revision__Warning : 'red',    DrawingRegister__Revision__WarningText : 'Do not rely on' },
                { DrawingRegister__Revision__Code : 'C', DrawingRegister__Revision__Notes : 'Plain',       DrawingRegister__Revision__Warning : 'none',   DrawingRegister__Revision__WarningText : 'ignored text' } ]
};
const vvBuilt = await vvPdf.Na__LeRegPdf__BuildDocument(true);
const vvDoc   = FakePdf.last;
const vvText  = texts(vvDoc);
check('The register number is 3047_REGISTER (document code + suffix)', vvText.some((t) => t === '3047_REGISTER') && vvText.some((t) => String(t).includes('3047_REGISTER')));
check('No printed line carries the ?project= folder token',          !vvText.some((t) => String(t).includes('2026/')) && !JSON.stringify(vvDoc.props).includes('2026/'));
check('The file is named on the document code, code DR',             vvBuilt.filename === '3047_DR.pdf' && S.files[S.files.length - 1].projectCode === '3047' && S.files[S.files.length - 1].code === 'DR');
check('The title and running head carry the display name',           vvDoc.props.title === 'Doous Orangery — Drawing Register' && vvText.some((t) => String(t).includes('DOOUS ORANGERY')));
check('The footer office name is the configured author',             vvText.includes('VALE GARDEN HOUSES LIMITED'));
check('A yellow warning is boxed in the amber panel',               fills(vvDoc).includes(cfg.warnAmberFill));
check('A red warning is boxed in the red panel',                     fills(vvDoc).includes(cfg.warnRedFill));
check('A note with no warning prints no warning text',               !vvText.some((t) => String(t).includes('ignored text')));
const amberInk = vvDoc.calls.findIndex((c, i) => c[0] === 'setTextColor' && c[1] === cfg.warnAmberInk && vvDoc.calls[i + 1] && vvDoc.calls[i + 1][0] === 'text' && String(vvDoc.calls[i + 1][1]).includes('Awaiting'));
check('...and its text is set in the amber ink',                     amberInk >= 0);
check('The logo fetch failure is warned with the ValeVision prefix', W.warns.some((w) => w.startsWith('[ValeVision3D LayoutEditor] The register letterhead could not load the office logo.')) && !W.warns.some((w) => w.includes('[TrueVision3D')));

S.author = '';
await vvPdf.Na__LeRegPdf__BuildDocument(false);
check('With no configured author the office name is Vale\'s, never NA\'s', texts(FakePdf.last).includes('VALE GARDEN HOUSES LIMITED') && !texts(FakePdf.last).some((t) => /NOBLE/i.test(String(t))));
S.author = 'Vale Garden Houses Limited';

console.log('\n  -- Register__Pdf: TrueVision\'s copy, the same inputs --');
await tvPdf.Na__LeRegPdf__BuildDocument(true);
const tvYellow = FakePdf.last;
check('TrueVision boxes the red note but NOT the yellow one (DR-37 item 2 is real)', fills(tvYellow).includes(cfg.warnRedFill) && !fills(tvYellow).includes(cfg.warnAmberFill));
check('TrueVision\'s copy numbers itself by the ?project= token here', texts(tvYellow).some((t) => String(t).includes('2026/3047__Doous_REGISTER')));

// With the seams' inputs made equal (token = document code, PWA name = display name, no yellow note),
// both copies must draw the identical call list.
S.projectCode = '3047';
win.TrueVision__Pwa__ProjectContext = { get : () => ({ displayName : 'Doous Orangery' }) };
S.revisions.Sheet_a[0].DrawingRegister__Revision__Warning = 'amber';
await vvPdf.Na__LeRegPdf__BuildDocument(true); const vvSame = JSON.stringify(FakePdf.last.calls) + JSON.stringify(FakePdf.last.props);
await tvPdf.Na__LeRegPdf__BuildDocument(true); const tvSame = JSON.stringify(FakePdf.last.calls) + JSON.stringify(FakePdf.last.props);
check('Seam inputs equal: ValeVision draws exactly what TrueVision draws (' + JSON.parse(vvSame.slice(0, vvSame.lastIndexOf(']') + 1)).length + ' calls)', vvSame === tvSame);
check('Rows: ValeVision and TrueVision answer the same rows',       JSON.stringify(vvPdf.Na__LeRegPdf__Rows()) === JSON.stringify(tvPdf.Na__LeRegPdf__Rows()));

console.log('\n  -- Register__Preview: PDF.js from this app\'s vendor copy --');
const preview = await import(pathToFileURL(join(VV_REG, 'Na__LayoutEditor__Register__Preview__.js')).href);
const pages = [];
const fakeLib = {
    GlobalWorkerOptions : { workerSrc : null },
    getDocument : () => ({ promise : Promise.resolve({ numPages : 2, destroy : async () => {}, getPage : async (i) => ({
        getViewport : ({ scale }) => ({ width : 595.28 * scale, height : 841.89 * scale }),
        render : () => ({ promise : Promise.resolve(), cancel() {} }), cleanup() { pages.push(i); } }) }) })
};
const box = new El('div');
const rendering = preview.Na__LeRegPreview__Render(new Uint8Array([37, 80, 68, 70]), box, () => true);
await new Promise((r) => setImmediate(r));
const script = W.scripts[0];
check('No library on the page: one script is added, from the configured vendor path', W.scripts.length === 1 && script.src === cfg.pdfJsScriptPath && script.src.includes('07__Vendor__PdfJs__v3.11.174') && !script.src.includes('/na-apps/'));
window.pdfjsLib = fakeLib; script.onload();
await rendering;
check('The worker points at the vendored worker',                     fakeLib.GlobalWorkerOptions.workerSrc === cfg.pdfJsWorkerPath);
const canvases = box.all((c) => c.tagName === 'CANVAS');
check('Two pages painted at the page box width x device ratio (794 px at dpr 1)', canvases.length === 2 && canvases[0].width === 794 && canvases[1].attributes['aria-label'] === 'Drawing register page 2 of 2' && pages.join() === '1,2');
win.devicePixelRatio = 5;
const box2 = new El('div');
await preview.Na__LeRegPreview__Render(new Uint8Array([1]), box2, () => true);
check('The device ratio is clamped by the config (3 -> 2382 px)',      box2.all((c) => c.tagName === 'CANVAS')[0].width === 2382);
const box3 = new El('div');
await preview.Na__LeRegPreview__Render(new Uint8Array([1]), box3, () => false);
check('A render no longer current paints nothing',                    box3.children.length === 0);

console.log('\n  -- Register__Notes: the warning levels it offers --');
const reg   = await import(pathToFileURL(join(VV_REG, 'Na__LayoutEditor__Register__Data__.js')).href);
const notes = await import(pathToFileURL(join(VV_REG, 'Na__LayoutEditor__Register__Notes__.js')).href);
globalThis.__NaStubs.Na__LeModel__GetFields = (s) => ({ Revision : 'B' });
reg.Na__LeReg__Initialize({ editable : true, showToast : () => {} });
const holder = new El('div');
notes.Na__LeRegNotes__Build(holder, { Sheet__Id : 'Sheet_b' });
const select = holder.find((c) => c.tagName === 'SELECT');
check('Notes offer TrueVision\'s none / yellow / red (verbatim)',     select && select.children.map((o) => o.value).join() === 'none,yellow,red');
const add = holder.find((c) => c.tagName === 'BUTTON' && c.textContent === '+ Add revision entry');
add.dispatchEvent(new Event('click'));
const kept = reg.Na__LeReg__GetRevisions('Sheet_b');
check('+ Add revision entry keeps a new entry with the sheet\'s revision', kept.length === 3 && kept[2].DrawingRegister__Revision__Code === 'B' && kept[2].DrawingRegister__Revision__Warning === 'none');

console.warn = realWarn;
console.log(failures ? ('\n' + failures + ' FAILED, ' + passes + ' passed') : ('\nEvery check passed (' + passes + ').'));
process.exit(failures ? 1 : 0);
