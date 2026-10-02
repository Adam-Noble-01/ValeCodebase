// =============================================================================
// W1-24 scratch harness - real PDFs through the real jsPDF 4.1.0 (not shipped)
// =============================================================================
// Runs Na__LePdf__BuildDocument with ValeVision's own vendored jsPDF
// (04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js)
// and every other import stubbed, over plan-like PNG pictures made here, and
// writes the PDFs for w1_24_pdfcheck.py (predictor, row filters, pixels) and
// for a look in Chrome's PDF viewer.
//
//   node w1_24_realpdf.mjs --set before|candidate|live [--big] [--compression SLOW] [--tag name]
//
//   small : a 2D viewport underlay (1100 x 760) and a 3D viewport picture (640 x 400)
//   --big : one 2D viewport underlay of 4518 x 5183 px - TrueVision's PS01 D01 case,
//           70,248,822 bytes decoded as RGB (over the 60,000,000 Chrome's viewer garbles)
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const VV   = resolve(HERE, '..', '..', '..', '..');
const LEAF = 'Na__LayoutEditor__PdfExporter__.js';
const LIVE = join(VV, '02__Src__AppModules', '51__System__LayoutEditor', '60__Feature__PdfExport', LEAF);
const JSPDF = join(VV, '04__Lib__ThirdParty__VersionLocked', '05__Vendor__JsPdf__v4.1.0', 'jspdf.umd.js');
const OUTDIR = join(HERE, 'pdf');
if (!existsSync(OUTDIR)) mkdirSync(OUTDIR);

const argv = process.argv.slice(2);
const arg  = (name, dflt) => { const i = argv.indexOf(name); return i === -1 ? dflt : argv[i + 1]; };
const SET  = arg('--set', 'candidate');
const BIG  = argv.includes('--big');
const COMPRESSION = arg('--compression', null);
const TAG  = arg('--tag', SET + (BIG ? '__big' : '__small') + (COMPRESSION ? '__' + COMPRESSION : ''));
const SOURCE = SET === 'live' ? LIVE : join(HERE, SET, LEAF);
const say = (...a) => console.log(...a);

// -----------------------------------------------------------------------------
// PNG pictures, made here (RGBA, opaque, as a canvas's toDataURL gives them)
// -----------------------------------------------------------------------------
function pngEncode(width, height, rgba) {
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0;                                              // <-- Filter None in the source file; jsPDF re-packs every row itself
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
    }
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([ Buffer.from(type, 'ascii'), data ]);
        const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
        return Buffer.concat([ len, td, crc ]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;      // <-- 8 bit RGBA
    return Buffer.concat([ Buffer.from([ 137, 80, 78, 71, 13, 10, 26, 10 ]), chunk('IHDR', ihdr),
                           chunk('IDAT', zlib.deflateSync(raw, { level : 6 })), chunk('IEND', Buffer.alloc(0)) ]);
}

// A plan-like underlay: white paper, a faint grid, shaded floors, hatched rooms,
// thick walls, furniture blocks - a whitecard plan's tones and edges.
function planPicture(width, height, seed) {
    const px = Buffer.alloc(width * height * 4, 255);
    let s = seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const set = (x, y, v) => { if (x < 0 || y < 0 || x >= width || y >= height) return; const i = (y * width + x) * 4; px[i] = v; px[i + 1] = v; px[i + 2] = Math.min(255, v + 4); px[i + 3] = 255; };
    const fill = (x0, y0, x1, y1, fn) => { for (let y = Math.max(0, y0); y < Math.min(height, y1); y++) for (let x = Math.max(0, x0); x < Math.min(width, x1); x++) { const v = fn(x, y); if (v !== null) set(x, y, v); } };
    const cell = Math.max(24, Math.round(width / 120));
    fill(0, 0, width, height, (x, y) => (x % cell === 0 || y % cell === 0) ? 236 : null);
    const rooms = Math.max(6, Math.round(width * height / 900000));
    for (let r = 0; r < rooms; r++) {
        const w = Math.round(width * (0.08 + rnd() * 0.22)), h = Math.round(height * (0.08 + rnd() * 0.22));
        const x0 = Math.round(rnd() * (width - w)), y0 = Math.round(rnd() * (height - h));
        const kind = r % 3;
        if (kind === 0) fill(x0, y0, x0 + w, y0 + h, (x, y) => 222 + Math.round(26 * (x - x0) / w));                 // <-- Shaded floor
        if (kind === 1) fill(x0, y0, x0 + w, y0 + h, (x, y) => ((x + y) % 11 === 0) ? 120 : null);                     // <-- Hatch
        if (kind === 2) fill(x0, y0, x0 + w, y0 + h, (x, y) => 240 - Math.round(30 * (y - y0) / h));                  // <-- Graded tile
        const wall = Math.max(3, Math.round(width / 700));
        fill(x0, y0, x0 + w, y0 + wall, () => 30); fill(x0, y0 + h - wall, x0 + w, y0 + h, () => 30);
        fill(x0, y0, x0 + wall, y0 + h, () => 30); fill(x0 + w - wall, y0, x0 + w, y0 + h, () => 30);
        for (let f = 0; f < 4; f++) {
            const fw = Math.round(w * 0.12), fh = Math.round(h * 0.1);
            const fx = x0 + Math.round(rnd() * (w - fw)), fy = y0 + Math.round(rnd() * (h - fh));
            fill(fx, fy, fx + fw, fy + fh, (x, y) => (x === fx || y === fy || x === fx + fw - 1 || y === fy + fh - 1) ? 70 : 205);
        }
    }
    return px;
}

// A 3D-render-like picture: a sky and ground gradient with a lit box
function renderPicture(width, height) {
    const px = Buffer.alloc(width * height * 4, 255);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const sky = y < height * 0.55;
        let v = sky ? 200 + Math.round(40 * y / height) : 150 + Math.round(60 * (height - y) / height);
        if (x > width * 0.3 && x < width * 0.7 && y > height * 0.3 && y < height * 0.8) v = 120 + Math.round(100 * (x - width * 0.3) / (width * 0.4));
        px[i] = v; px[i + 1] = Math.min(255, v + 6); px[i + 2] = Math.min(255, v + 12); px[i + 3] = 255;
    }
    return px;
}

const dataUrlOf = (png) => 'data:image/png;base64,' + png.toString('base64');

// -----------------------------------------------------------------------------
// The browser bits the exporter touches, and the real jsPDF
// -----------------------------------------------------------------------------
globalThis.window = globalThis;                                                  // <-- jsPDF takes atob, btoa and timers from its global object
globalThis.document = { createElement : () => ({}), head : { appendChild : () => { throw new Error('the harness never injects jsPDF'); } } };
const require = createRequire(import.meta.url);
const jspdfModule = require(JSPDF);
const RealJsPdf = jspdfModule.jsPDF;
window.jspdf = { jsPDF : RealJsPdf };

// -----------------------------------------------------------------------------
// The exporter with its imports stubbed (jsPDF is real)
// -----------------------------------------------------------------------------
const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\})\s+from\s+'([^']+)';[ \t]*(?:\/\/[^\n]*)?$/gm;
const TMP = mkdtempSync(join(tmpdir(), 'W1-24__realpdf__'));
async function loadExporter(stubs) {
    let src = readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) m[1].trim().slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => names.push(x.split(/\s+as\s+/).pop()));
    src = src.replace(IMPORT, '');
    globalThis.__W124Real = stubs;
    const head = names.map((n) => 'const ' + n + ' = globalThis.__W124Real["' + n + '"];').join('\n');
    const file = join(TMP, LEAF.replace(/\.js$/, '.mjs'));
    writeFileSync(file, head + '\n' + src, 'utf8');
    return import(pathToFileURL(file).href);
}

async function main() {
    const started = Date.now();
    say('W1-24 real-jsPDF harness - set ' + SET + ', ' + (BIG ? 'big' : 'small') + (COMPRESSION ? ', pictureCompression ' + COMPRESSION : '') + ' (jsPDF ' + (RealJsPdf.version || '?') + ')');
    let underlay, picture3d = null, page, frame2d, frame3d = null;
    if (BIG) {
        const w = 4518, h = 5183;
        const pngPath = join(OUTDIR, 'source__underlay_big.png');
        let png;
        if (existsSync(pngPath)) png = readFileSync(pngPath);
        else { png = pngEncode(w, h, planPicture(w, h, 4518)); writeFileSync(pngPath, png); }
        underlay = { png, w, h };
        page = { Orientation : 'portrait', WidthMm : 594, HeightMm : 841, Label : 'A1', SizeKey : 'A1' };
        frame2d = { X : 20, Y : 20, WidthMm : 554, HeightMm : Math.round(554 * h / w * 10) / 10 };
    } else {
        const w = 1100, h = 760, w3 = 640, h3 = 400;
        const pngPath = join(OUTDIR, 'source__underlay_small.png'), png3Path = join(OUTDIR, 'source__picture3d_small.png');
        const png = existsSync(pngPath) ? readFileSync(pngPath) : pngEncode(w, h, planPicture(w, h, 1100));
        const png3 = existsSync(png3Path) ? readFileSync(png3Path) : pngEncode(w3, h3, renderPicture(w3, h3));
        writeFileSync(pngPath, png); writeFileSync(png3Path, png3);
        underlay = { png, w, h };
        picture3d = { png : png3, w : w3, h : h3 };
        page = { Orientation : 'landscape', WidthMm : 420, HeightMm : 297, Label : 'A3', SizeKey : 'A3' };
        frame2d = { X : 15, Y : 20, WidthMm : 220, HeightMm : 152 };
        frame3d = { X : 245, Y : 20, WidthMm : 160, HeightMm : 100 };
    }
    say('  underlay PNG ' + underlay.w + ' x ' + underlay.h + ' (' + underlay.png.length + ' bytes; ' + (underlay.w * underlay.h * 3) + ' bytes decoded as RGB)');

    const stubs = {
        Na__LeCfg__GetPdfSetup          : () => ({ jsPdfScriptPath : 'unused', author : 'W1-24 harness', creator : 'ValeVision3D W1-24 harness' }),
        Na__LeCfg__GetLineworkSetup     : () => ({ minSegmentPaperMm : 0.05 }),
        Na__LeCfg__GetLabel             : (k, d) => d,
        Na__LeCfg__GetSpecificationSetup: () => ({ loadTimeoutMs : 10 }),
        Na__LeCfg__FormatLabel          : (k, d) => d,
        Na__LeFileName__Build           : (p) => 'W1-24__' + p.code + '.pdf',
        Na__LeScale__SheetLabel         : () => '1:50',
        Na__LeLayout__Solve             : () => ({ Page : page, TitleBlockStyle : 'modern' }),
        Na__LeModel__KIND_2D            : '2d',
        Na__LeModel__GetLayers          : (sheet) => sheet.Sheet__Layers,
        Na__LeModel__GetFields          : () => ({ DrawingNumber : 'D01', Revision : 'A' }),
        Na__LeModel__IsLayerVisible     : () => true,
        Na__LeChrome__Build             : () => [],
        Na__LeChrome__DrawToPdf         : () => {},
        Na__LeMarkup__BuildScenePrimitives : () => [],
        Na__LeMarkup__BuildSheetPrimitives : () => [],
        Na__LeVp2d__Describe            : (v) => ({ source : 'x', definition : { Elevation__Id : 'E' }, window : { Denominator : 50, OriginX : 0, OriginY : 0 }, modelSource : { renderId : null } }),
        Na__LeVp2d__EnsureLinework      : () => Promise.resolve(null),
        Na__LeVp2d__RenderForExport     : () => Promise.resolve({ dataUrl : dataUrlOf(underlay.png), widthPx : underlay.w, heightPx : underlay.h }),
        Na__LeVp2d__StyleBands          : () => [],
        Na__LeVp3d__RenderForExport     : () => Promise.resolve(picture3d ? dataUrlOf(picture3d.png) : null),
        Na__LeVp3d__ExportRectMm        : (v) => ({ X : 0, Y : 0, WidthMm : v.Viewport__FrameMm.WidthMm, HeightMm : v.Viewport__FrameMm.HeightMm }),
        Na__DrawData__GetProjectCode    : () => '3047',
        Na__LeSpec__EnsureLoaded        : () => Promise.resolve(),
        Na__LeMargin__Report            : () => ({ on : false, overflow : 0 })
    };
    const pdf = await loadExporter(stubs);
    const viewports = [ { Viewport__Id : 'V2d', Viewport__Kind : '2d', Viewport__LayerId : 'L', Viewport__FrameMm : frame2d,
                          Viewport__Styles : { projectedLinework : false }, Viewport__MarkupMode : 'none', Viewport__ScaleDenominator : 50 } ];
    if (frame3d) viewports.push({ Viewport__Id : 'V3d', Viewport__Kind : '3d', Viewport__LayerId : 'L', Viewport__FrameMm : frame3d, Viewport__Styles : {}, Viewport__ScaleDenominator : 0 });
    const sheet = { Sheet__Id : 'S', Sheet__Name : 'W1-24 ' + TAG, Sheet__Layers : [ { Layer__Id : 'L' } ], Sheet__Viewports : viewports };
    const options = COMPRESSION ? { pictureCompression : COMPRESSION } : undefined;
    const built = options ? await pdf.Na__LePdf__BuildDocument(sheet, options) : await pdf.Na__LePdf__BuildDocument(sheet);
    const bytes = Buffer.from(built.doc.output('arraybuffer'));
    const out = join(OUTDIR, TAG + '.pdf');
    writeFileSync(out, bytes);
    const parms = (bytes.toString('latin1').match(/\/DecodeParms\s*<<[^>]*>>/g) || []);
    say('  wrote ' + out + ' (' + bytes.length + ' bytes) in ' + ((Date.now() - started) / 1000).toFixed(1) + ' s');
    parms.forEach((p) => say('  ' + p));
}

main().catch((error) => { say('HARNESS ERROR: ' + (error && error.stack || error)); process.exitCode = 2; });
