// =============================================================================
// W1-25 scratch harness - Na__LayoutEditor__PdfFonts__ in Node (not shipped)
// =============================================================================
// Runs the PdfFonts module (the candidate, or the live file with --live) against
// this app's own vendored jsPDF 4.1.0 and the REAL Open Sans cuts the configured
// host serves (www.noble-architecture.com/assets/AD04_..., answered here from the
// same files in the NaWeb repository at b2aa9151 - byte for byte TrueVision's
// CommonFonts cuts; nothing leaves the machine). Its one import, GetPdfSetup, is
// answered from the candidate (or live) Layout Editor config with SheetSetup's own
// mapping. Writes PDFs to pdf/ for w1_25_pdfcheck.py and prints PASS / FAIL lines.
//
//   node w1_25_fonts_unit.mjs [--live]
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const HERE   = dirname(fileURLToPath(import.meta.url));
const VV     = resolve(HERE, '..', '..', '..', '..');
const LIVE   = process.argv.includes('--live');
const SOURCE = LIVE ? join(VV, '02__Src__AppModules', '51__System__LayoutEditor', '60__Feature__PdfExport', 'Na__LayoutEditor__PdfFonts__.js')
                    : join(HERE, 'candidate', 'Na__LayoutEditor__PdfFonts__.js');
const CONFIG = LIVE ? join(VV, '02__Src__AppModules', '51__System__LayoutEditor', '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json')
                    : join(HERE, 'candidate', 'Na__LayoutEditor__AppConfig__.json');
const JSPDF  = join(VV, '04__Lib__ThirdParty__VersionLocked', '05__Vendor__JsPdf__v4.1.0', 'jspdf.umd.js');
const OUTDIR = join(HERE, 'pdf');
if (!existsSync(OUTDIR)) mkdirSync(OUTDIR);
const NAWEB  = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const PIN    = 'b2aa9151';
const HOST   = 'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/';

let passed = 0, failed = 0;
const check = (label, ok, detail) => { if (ok) passed++; else failed++; console.log((ok ? '  PASS  ' : '  FAIL  ') + label + (detail ? '  (' + detail + ')' : '')); };

// -----------------------------------------------------------------------------
// The browser bits: window, btoa, a fetch that answers the configured host
// -----------------------------------------------------------------------------
globalThis.window = globalThis;
const require   = createRequire(import.meta.url);
const RealJsPdf = require(JSPDF).jsPDF;

const pinTtf = new Map();
function ttfAtPin(fileName) {
    if (!pinTtf.has(fileName)) {
        pinTtf.set(fileName, execFileSync('git', [ '-C', NAWEB, 'show', PIN + ':assets/AD04_-_LIBR_-_Common_-_Front-Files/' + fileName ], { maxBuffer : 16 * 1024 * 1024 }));
    }
    return pinTtf.get(fileName);
}

let fetchLog = [];
let fetchMode = { failAll : false, failNames : [] };
globalThis.fetch = async (url) => {
    const href = String(url);
    fetchLog.push(href);
    if (!href.startsWith(HOST)) return { ok : false, status : 404, arrayBuffer : async () => new ArrayBuffer(0) };
    const name = decodeURIComponent(href.slice(HOST.length));
    if (fetchMode.failAll || fetchMode.failNames.includes(name)) return { ok : false, status : 404, arrayBuffer : async () => new ArrayBuffer(0) };
    const bytes = ttfAtPin(name);
    return { ok : true, status : 200, arrayBuffer : async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
};

const warnings = [];
const realWarn = console.warn;
console.warn = (...args) => { warnings.push(args.map((a) => (a && a.message) ? a.message : String(a)).join(' ')); };

// -----------------------------------------------------------------------------
// GetPdfSetup from the config, exactly as ConfigState__SheetSetup__ maps it
// -----------------------------------------------------------------------------
const cfg   = JSON.parse(readFileSync(CONFIG, 'utf8'));
const pdf   = cfg.LayoutEditor__Pdf__Config;
function GetPdfSetup() {
    const cuts = (Array.isArray(pdf.LayoutEditor__Pdf__Fonts) ? pdf.LayoutEditor__Pdf__Fonts : []).map((cut) => ({
        style : String(cut.Style || 'normal'), weight : cut.Weight, fileName : String(cut.FileName) }));
    return { author : pdf.LayoutEditor__Pdf__Author, creator : pdf.LayoutEditor__Pdf__Creator,
             fontFamily : pdf.LayoutEditor__Pdf__FontFamily, fontBasePath : pdf.LayoutEditor__Pdf__FontBasePath,
             fontCdnBase : pdf.LayoutEditor__Pdf__FontCdnBase, fonts : cuts };
}

// -----------------------------------------------------------------------------
// A fresh copy of the module per scenario (its import answered from globalThis)
// -----------------------------------------------------------------------------
const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\})\s+from\s+'([^']+)';[ \t]*(?:\/\/[^\n]*)?$/gm;
const TMP = mkdtempSync(join(tmpdir(), 'W1-25__fonts__'));
let copies = 0;
async function freshModule() {
    let src = readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n');
    const imports = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) imports.push(m[2] + ' -> ' + m[1].replace(/\s+/g, ' '));
    src = src.replace(IMPORT, '');
    globalThis.__W125 = { Na__LeCfg__GetPdfSetup : GetPdfSetup };
    const file = join(TMP, 'PdfFonts__' + (++copies) + '.mjs');
    writeFileSync(file, 'const Na__LeCfg__GetPdfSetup = globalThis.__W125.Na__LeCfg__GetPdfSetup;\n' + src, 'utf8');
    const mod = await import(pathToFileURL(file).href);
    return { mod, imports };
}

const fontNames = (doc) => Object.keys(doc.getFontList());

async function main() {
    console.log('W1-25 PdfFonts unit harness - ' + (LIVE ? 'LIVE file' : 'candidate') + ' (jsPDF ' + RealJsPdf.version + ')');
    const setup = GetPdfSetup();
    check('config: FontFamily OpenSans, both bases the AD04 host, three cuts', setup.fontFamily === 'OpenSans' && setup.fontBasePath === HOST && setup.fontCdnBase === HOST && setup.fonts.length === 3,
          setup.fonts.map((c) => c.style + ':' + c.fileName).join(', '));

    // --- 1. The happy path --------------------------------------------------------
    let { mod, imports } = await freshModule();
    check('the module imports exactly one name, GetPdfSetup from the ConfigState barrel', imports.length === 1 && /03__Core__Config\/Na__LayoutEditor__ConfigState__\.js -> \{ Na__LeCfg__GetPdfSetup \}/.test(imports[0]), imports.join(' | '));
    check('exports: EnsureLoaded, Install, SetFont', [ 'Na__LePdfFonts__EnsureLoaded', 'Na__LePdfFonts__Install', 'Na__LePdfFonts__SetFont' ].every((n) => typeof mod[n] === 'function') && Object.keys(mod).length === 3, Object.keys(mod).join(', '));
    fetchLog = [];
    const blank = new RealJsPdf({ unit : 'mm', format : [ 210, 297 ] });
    check('Install before the cuts load answers false (nothing to install)', mod.Na__LePdfFonts__Install(blank) === false);
    check('SetFont before the cuts load answers false (the caller falls back)', mod.Na__LePdfFonts__SetFont(blank, 'normal') === false);
    const [ a, b ] = await Promise.all([ mod.Na__LePdfFonts__EnsureLoaded(), mod.Na__LePdfFonts__EnsureLoaded() ]);
    check('EnsureLoaded resolves true (two callers at once share one load)', a === true && b === true);
    check('three fetches, one per cut, each from the configured host only (base and CDN are one address)', fetchLog.length === 3 && fetchLog.every((u) => u.startsWith(HOST)), fetchLog.map((u) => u.slice(HOST.length)).join(', '));
    fetchLog = [];
    check('EnsureLoaded again: true at once, no fetch', (await mod.Na__LePdfFonts__EnsureLoaded()) === true && fetchLog.length === 0);

    const doc = new RealJsPdf({ orientation : 'portrait', unit : 'mm', format : [ 210, 297 ], compress : true, putOnlyUsedFonts : true });
    check('Install(doc) answers true', mod.Na__LePdfFonts__Install(doc) === true);
    const list = doc.getFontList();
    check('the document knows OpenSans in light, normal and bold', Array.isArray(list.OpenSans) && [ 'light', 'normal', 'bold' ].every((s) => list.OpenSans.includes(s)), JSON.stringify(list.OpenSans));
    check('Install(doc) a second time: true, nothing added twice', mod.Na__LePdfFonts__Install(doc) === true && JSON.stringify(doc.getFontList().OpenSans) === JSON.stringify(list.OpenSans));
    check('Install on something that is not a jsPDF document answers false', mod.Na__LePdfFonts__Install({}) === false && mod.Na__LePdfFonts__Install(null) === false);

    const picks = [ [ 'bold', 'bold' ], [ 'normal', 'normal' ], [ 'light', 'light' ], [ 600, 'bold' ], [ 700, 'bold' ], [ 400, 'normal' ], [ 500, 'normal' ], [ 300, 'light' ], [ 200, 'light' ], [ '600', 'bold' ], [ 'semibold', 'normal' ], [ undefined, 'normal' ] ];
    const got = picks.map(([ weight, want ]) => {
        const ok = mod.Na__LePdfFonts__SetFont(doc, weight);
        const f  = doc.getFont();
        return { weight, want, ok, name : f.fontName, style : f.fontStyle };
    });
    check('SetFont maps weights to the cuts as TrueVision does (<=300 light, >=600 bold, else normal)', got.every((g) => g.ok && g.name === 'OpenSans' && g.style === g.want),
          got.map((g) => String(g.weight) + '->' + g.style).join(' '));

    // A page of text in every cut, and one Helvetica line (the fallback face)
    const lines = [
        [ 'normal', 'Regular: Proposed Orangery - Elevations, Rev B, 1:50 @ ISO A2' ],
        [ 'bold',   'SemiBold: PROJECT SPECIFICATION 3047_SPEC' ],
        [ 'light',  'Light: Vale Garden Houses Limited - Page 1 of 2' ],
        [ 'normal', 'Unicode: café, naïve, – en dash, “quotes”, £1,250, 25 m², ½ inch, © 2026' ]
    ];
    let y = 20;
    lines.forEach(([ weight, text ]) => { mod.Na__LePdfFonts__SetFont(doc, weight); doc.setFontSize(11); doc.text(text, 15, y); y += 10; });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text('Helvetica: the fallback face, unembedded', 15, y);
    const bytes = Buffer.from(doc.output('arraybuffer'));
    writeFileSync(join(OUTDIR, 'unit__opensans__' + (LIVE ? 'live' : 'candidate') + '.pdf'), bytes);
    check('a document with text set through SetFont writes (' + bytes.length + ' bytes)', bytes.length > 2000);

    // putOnlyUsedFonts: a document with the cuts installed but no text set in them carries no Open Sans
    const unused = new RealJsPdf({ unit : 'mm', format : [ 210, 297 ], compress : true, putOnlyUsedFonts : true });
    mod.Na__LePdfFonts__Install(unused);
    unused.setFont('helvetica', 'normal'); unused.text('Only Helvetica is set here', 15, 20);
    const unusedBytes = Buffer.from(unused.output('arraybuffer'));
    writeFileSync(join(OUTDIR, 'unit__installed_unused__' + (LIVE ? 'live' : 'candidate') + '.pdf'), unusedBytes);
    check('cuts installed but never set: putOnlyUsedFonts leaves Open Sans out (' + unusedBytes.length + ' bytes)', unusedBytes.toString('latin1').indexOf('OpenSans') === -1);

    // --- 2. Every fetch fails -------------------------------------------------------
    ({ mod } = await freshModule());
    fetchMode = { failAll : true, failNames : [] };
    fetchLog = []; warnings.length = 0;
    const down = await mod.Na__LePdfFonts__EnsureLoaded();
    check('host down: EnsureLoaded resolves false, never rejects', down === false);
    check('host down: one warning per cut, with this app\'s console prefix', warnings.filter((w) => w.startsWith('[ValeVision3D LayoutEditor] PDF font unavailable: ')).length === 3 && !warnings.some((w) => w.indexOf('TrueVision') !== -1), warnings.length + ' warnings');
    const docDown = new RealJsPdf({ unit : 'mm', format : [ 210, 297 ] });
    check('host down: Install false, SetFont false (Helvetica remains)', mod.Na__LePdfFonts__Install(docDown) === false && mod.Na__LePdfFonts__SetFont(docDown, 'normal') === false);
    fetchMode = { failAll : false, failNames : [] };
    fetchLog = [];
    const back = await mod.Na__LePdfFonts__EnsureLoaded();
    check('host back: the next EnsureLoaded tries again and succeeds', back === true && fetchLog.length === 3);

    // --- 3. One cut missing ---------------------------------------------------------
    ({ mod } = await freshModule());
    fetchMode = { failAll : false, failNames : [ 'AD04_03_-_Standard-Font_-_Open-Sans-Light.ttf' ] };
    warnings.length = 0;
    const part = await mod.Na__LePdfFonts__EnsureLoaded();
    const docPart = new RealJsPdf({ unit : 'mm', format : [ 210, 297 ] });
    mod.Na__LePdfFonts__Install(docPart);
    mod.Na__LePdfFonts__SetFont(docPart, 'light');
    check('Light missing: loads the other two, and a light run sets Regular', part === true && docPart.getFont().fontName === 'OpenSans' && docPart.getFont().fontStyle === 'normal' && JSON.stringify(docPart.getFontList().OpenSans) === JSON.stringify([ 'normal', 'bold' ]), JSON.stringify(docPart.getFontList().OpenSans));
    check('Light missing: one warning naming the file', warnings.length === 1 && warnings[0].indexOf('AD04_03_-_Standard-Font_-_Open-Sans-Light.ttf') !== -1);
    fetchMode = { failAll : false, failNames : [] };

    console.warn = realWarn;
    console.log('');
    console.log('W1-25 PdfFonts unit harness: ' + passed + ' passed, ' + failed + ' failed');
    process.exitCode = failed ? 1 : 0;
}

main().catch((error) => { console.warn = realWarn; console.log('HARNESS ERROR: ' + (error && error.stack || error)); process.exitCode = 2; });
