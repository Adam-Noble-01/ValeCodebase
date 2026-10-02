// =============================================================================
// W1-26 scratch - measure title block text the way SheetChrome 1.14.0 measures it (not shipped)
// =============================================================================
// This app's vendored jsPDF 4.1.0, this app's LIVE PdfFonts module (its one import, GetPdfSetup,
// answered from the live Layout Editor config exactly as SheetSetup maps it) and the REAL Open Sans
// cuts the configured host serves (www.noble-architecture.com/assets/AD04_..., answered here from the
// same files in the NaWeb repository at b2aa9151 - nothing leaves the machine, nothing is written).
// MeasureTextMm is SheetChrome 1.14.0's: ApplyPdfFont (PdfFonts SetFont, else Helvetica), the font
// size in points, getTextWidth, plus tracking x characters.
//
//   node measure_opensans.mjs            prints the Vale fixture, TrueVision's PS01 fixture (to prove
//                                        the harness measures as TrueVision's test did) and the statuses
//   node measure_opensans.mjs --json     the same as JSON
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const VV     = 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D';
const LE     = join(VV, '02__Src__AppModules', '51__System__LayoutEditor');
const NAWEB  = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const PIN    = 'b2aa9151';
const HOST   = 'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/';
const JSON_OUT = process.argv.includes('--json');

globalThis.window = globalThis;
const require = createRequire(import.meta.url);
const JsPdf   = require(join(VV, '04__Lib__ThirdParty__VersionLocked', '05__Vendor__JsPdf__v4.1.0', 'jspdf.umd.js')).jsPDF;

const ttfCache = new Map();
globalThis.fetch = async (url) => {
    const href = String(url);
    if (!href.startsWith(HOST)) return { ok : false, status : 404, arrayBuffer : async () => new ArrayBuffer(0) };
    const name = decodeURIComponent(href.slice(HOST.length));
    if (!ttfCache.has(name)) ttfCache.set(name, execFileSync('git', [ '-C', NAWEB, 'show', PIN + ':assets/AD04_-_LIBR_-_Common_-_Front-Files/' + name ], { maxBuffer : 1 << 24 }));
    const bytes = ttfCache.get(name);
    return { ok : true, status : 200, arrayBuffer : async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
};
const quietWarn = console.warn; console.warn = () => {};

const cfg = JSON.parse(readFileSync(join(LE, '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json'), 'utf8'));
const pdf = cfg.LayoutEditor__Pdf__Config;
function GetPdfSetup() {
    const cuts = (Array.isArray(pdf.LayoutEditor__Pdf__Fonts) ? pdf.LayoutEditor__Pdf__Fonts : []).map((cut) => ({ style : String(cut.Style || 'normal'), weight : cut.Weight, fileName : String(cut.FileName) }));
    return { author : pdf.LayoutEditor__Pdf__Author, creator : pdf.LayoutEditor__Pdf__Creator, fontFamily : pdf.LayoutEditor__Pdf__FontFamily,
             fontBasePath : pdf.LayoutEditor__Pdf__FontBasePath, fontCdnBase : pdf.LayoutEditor__Pdf__FontCdnBase, fonts : cuts };
}

const TMP = mkdtempSync(join(tmpdir(), 'W1-26__measure__'));
let src = readFileSync(join(LE, '60__Feature__PdfExport', 'Na__LayoutEditor__PdfFonts__.js'), 'utf8').replace(/\r\n/g, '\n');
src = src.replace(/^[ \t]*import\s+\{[\s\S]*?\}\s+from\s+'[^']+';[^\n]*$/gm, '');
globalThis.__W126 = { GetPdfSetup };
writeFileSync(join(TMP, 'PdfFonts.mjs'), 'const Na__LeCfg__GetPdfSetup = globalThis.__W126.GetPdfSetup;\n' + src, 'utf8');
const fonts = await import(pathToFileURL(join(TMP, 'PdfFonts.mjs')).href);
const loaded = await fonts.Na__LePdfFonts__EnsureLoaded();
console.warn = quietWarn;

// SheetChrome 1.14.0's measurer, line for line
const MM_PER_POINT = 25.4 / 72;
const doc = new JsPdf({ unit : 'mm', format : [ 210, 297 ] });
fonts.Na__LePdfFonts__Install(doc);
const PdfWeight = (w) => (w === 'bold') ? 'bold' : ((typeof w === 'number' && w >= 600) ? 'bold' : 'normal');
function ApplyPdfFont(d, weight) { if (!fonts.Na__LePdfFonts__SetFont(d, weight)) d.setFont('helvetica', PdfWeight(weight)); }
function MeasureTextMm(text, fontMm, weight, trackingMm) {
    const value = String(text === undefined || text === null ? '' : text);
    if (value === '') return 0;
    const tracking = (typeof trackingMm === 'number' && trackingMm > 0) ? trackingMm * value.length : 0;
    ApplyPdfFont(doc, weight);
    doc.setFontSize(fontMm / MM_PER_POINT);
    return doc.getTextWidth(value) + tracking;
}
function MeasureHelvetica(text, fontMm, weight, trackingMm) {
    const value = String(text);
    const tracking = (trackingMm > 0) ? trackingMm * value.length : 0;
    doc.setFont('helvetica', PdfWeight(weight)); doc.setFontSize(fontMm / MM_PER_POINT);
    return doc.getTextWidth(value) + tracking;
}

const style = cfg.LayoutEditor__Style__Config;
const tb    = cfg.LayoutEditor__TitleBlock__Config;
const S = {
    labelMm : tb.LayoutEditor__TitleBlock__FontSizeLabelMm, valueMm : tb.LayoutEditor__TitleBlock__FontSizeValueMm, pad : tb.LayoutEditor__TitleBlock__FieldPaddingHMm,
    labelWeight : style.LayoutEditor__Style__TitleLabelWeight, valueWeight : style.LayoutEditor__Style__TitleValueWeight,
    track : style.LayoutEditor__Style__TitleLabelTrackingMm, upper : style.LayoutEditor__Style__TitleLabelUppercase
};
const r2 = (n) => Math.round(n * 100) / 100;
const label = (l, m) => (m || MeasureTextMm)(S.upper ? String(l).toUpperCase() : String(l), S.labelMm, S.labelWeight, S.track);
const value = (v, m) => (m || MeasureTextMm)(v, S.valueMm, S.valueWeight);
const need  = (l, v, m) => r2(Math.max(label(l, m), value(v, m)) + S.pad * 2);
const floor = (l, m) => r2(label(l, m) + S.pad * 2);

const VALE = [
    [ 'Client', 'Client', 'Mordaunt' ],
    [ 'SiteAddress', 'Site Address', 'The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE' ],
    [ 'Title', 'Drawing Title', 'Permitted Development Compliance - Existing Conditions & Design Proposal Elevations' ],
    [ 'DocumentId', 'Document ID', '57079_D12' ],
    [ 'Revision', 'Rev', 'B' ],
    [ 'Scale', 'Scale', '1:50 @ ISO A2' ],
    [ 'Date', 'Date', '19 Sep 2026' ],
    [ 'DrawnBy', 'Drawn By', 'Vale Garden Houses' ],
    [ 'Status', 'Status', 'FOR PLANNING' ]
];
const TV_PS01 = [
    [ 'Client', 'Client', 'Mr P. Samra', 15.31, 8.36 ],
    [ 'SiteAddress', 'Site Address', '255 Musters Road, West Bridgford, Nottinghamshire, NG2 7DD', 67.01, 13.88 ],
    [ 'Title', 'Drawing Title', 'Permitted Development Compliance - Existing Conditions & Design Proposal Elevations', 91.61, 15.25 ],
    [ 'DocumentId', 'Document ID', 'PS01_T01_D02', 17.61, 14.37 ],
    [ 'Revision', 'Rev', 'B', 5.78, 5.78 ],
    [ 'Scale', 'Scale', '1:50 @ ISO A2', 17.02, 7.67 ],
    [ 'Date', 'Date', '19 Sep 2026', 15.28, 6.94 ],
    [ 'DrawnBy', 'Drawn By', 'A. Noble', 11.46, 11.39 ],
    [ 'Status', 'Status', 'FOR PLANNING', 18.62, 8.80 ]
];
const TV_STATUS = { 'PRELIMINARY' : 16.70, 'FOR INFORMATION' : 22.62, 'FOR COMMENT' : 18.72, 'FOR COORDINATION' : 24.19, 'FOR APPROVAL' : 18.53, 'FOR PLANNING' : 18.62,
                    'FOR BUILDING CONTROL' : 28.58, 'FOR PRICING' : 16.13, 'FOR TENDER' : 15.84, 'FOR CONSTRUCTION' : 24.29, 'AS BUILT' : 11.97, 'SUPERSEDED' : 16.36 };
const EXTRA = [ 'Revision B', '1:20, 1:50 & 1:100 @ ISO A3', '1:20 & 1:50 & 1:100 @ ISO A3', '1:50 & 1:100 @ ISO A2', '1:100 & 1:200 @ ISO A2',
                '99999_D100', '57079_D100', '3047_D01', 'Proposed Orangery - Elevations', 'Mr & Mrs Featherstonehaugh', 'Elevations' ];

const out = { fontsLoaded : loaded, jspdf : JsPdf.version, style : S, vale : {}, valeFloors : {}, valeHelvetica : {}, tvCheck : [], statuses : {}, statusesHelvetica : {}, extra : {} };
VALE.forEach(([ k, l, v ]) => { out.vale[k] = need(l, v); out.valeFloors[k] = floor(l); out.valeHelvetica[k] = need(l, v, MeasureHelvetica); });
TV_PS01.forEach(([ k, l, v, n, f ]) => { const gotN = need(l, v), gotF = floor(l); out.tvCheck.push({ key : k, need : gotN, tvNeed : n, floor : gotF, tvFloor : f, same : gotN === n && gotF === f }); });
Object.keys(TV_STATUS).forEach((s) => { out.statuses[s] = need('Status', s); out.statusesHelvetica[s] = need('Status', s, MeasureHelvetica); });
EXTRA.forEach((t) => { out.extra[t] = { valuePlusPad : r2(value(t) + S.pad * 2), text : r2(value(t)), helveticaPlusPad : r2(value(t, MeasureHelvetica) + S.pad * 2) }; });
out.tvStatusSame = Object.keys(TV_STATUS).every((s) => out.statuses[s] === TV_STATUS[s]);

rmSync(TMP, { recursive : true, force : true });
if (JSON_OUT) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
console.log('jsPDF ' + out.jspdf + ', Open Sans cuts loaded: ' + loaded + '; labels ' + S.labelMm + ' mm ' + S.labelWeight + ' tracked ' + S.track + (S.upper ? ' upper' : '') + ', values ' + S.valueMm + ' mm ' + S.valueWeight + ', padding ' + S.pad + ' x 2');
console.log('\nTRUEVISION\'S PS01 FIXTURE (proves the harness measures as TrueVision\'s test did)');
out.tvCheck.forEach((c) => console.log('  ' + c.key.padEnd(12) + ' need ' + c.need.toFixed(2).padStart(6) + ' (TV ' + c.tvNeed.toFixed(2) + ')   floor ' + c.floor.toFixed(2).padStart(6) + ' (TV ' + c.tvFloor.toFixed(2) + ')   ' + (c.same ? 'same' : 'DIFFERENT')));
console.log('  statuses: ' + (out.tvStatusSame ? 'all twelve the same as TrueVision\'s' : 'DIFFERENT'));
console.log('\nTHE VALE FIXTURE (Open Sans | Helvetica, need = wider of label and value + padding; floor = label + padding)');
VALE.forEach(([ k, l, v ]) => console.log('  ' + k.padEnd(12) + ' need ' + out.vale[k].toFixed(2).padStart(6) + ' | ' + out.valeHelvetica[k].toFixed(2).padStart(6) + '   floor ' + out.valeFloors[k].toFixed(2).padStart(6) + '   "' + v + '"'));
console.log('\nSTATUSES (Open Sans | Helvetica)');
Object.keys(TV_STATUS).forEach((s) => console.log('  ' + out.statuses[s].toFixed(2).padStart(6) + ' | ' + out.statusesHelvetica[s].toFixed(2).padStart(6) + '  ' + s));
console.log('\nOTHER VALUES (value + padding, Open Sans | Helvetica)');
EXTRA.forEach((t) => console.log('  ' + out.extra[t].valuePlusPad.toFixed(2).padStart(6) + ' | ' + out.extra[t].helveticaPlusPad.toFixed(2).padStart(6) + '  "' + t + '"'));
