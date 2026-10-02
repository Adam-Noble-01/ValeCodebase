// =============================================================================
// W1-26 scratch harness - the real Layout Editor modules in headless Chromium (not shipped)
// =============================================================================
// No server is started (W0-16 / W1-25's method): Chromium asks for http://vv.test/<path> and the route
// below answers from D:\10_CoreLib__ValeCodebase\<path>, with an OVERLAY of app files per scenario. The
// configured font host (www.noble-architecture.com/assets/AD04_...) is answered from the same files in the
// NaWeb repository at b2aa9151. Every other off-machine request is aborted and listed. Read-only on the
// tree; PDFs and SVGs are built in memory, handed back as text/base64 and written under this folder.
//
//   node browser_w1_26.mjs --new <dir|live> --old <dir|live> [scenario ...]
//     scenarios: old  new  qron      (default: all three)
//     old    the app before W1-26 (its pre-images, or the live tree before landing)
//     new    the app with W1-26 (the candidates, or the live tree after landing)
//     qron   new, with a TEST config only: TitleBlock QrCellEnabled true, the Project QR Code system
//            switched on with a .test resolver, and a master index giving 2026/3047__Doous a stand-in key
//   Results: logs/browser__<scenario>.json, pdf/<scenario>__*.pdf, svg/<scenario>__*.svg
// =============================================================================

import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require   = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright');

const ROOT     = 'D:\\10_CoreLib__ValeCodebase';
const NAWEB    = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const PIN      = 'b2aa9151';
const HOST     = 'http://vv.test';
const APP      = '/WebApps/ValeVision3D/';
const AD04     = 'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/';
const INDEXURL = 'https://cdn.noble-architecture.com/VaApps/Index/Na__MasterIndex__ProjectLocations__.json';
const SCRATCH  = dirname(fileURLToPath(import.meta.url));
const LE       = '02__Src__AppModules/51__System__LayoutEditor/';
for (const d of [ 'pdf', 'svg', 'logs' ]) if (!existsSync(join(SCRATCH, d))) mkdirSync(join(SCRATCH, d));

const ARGS = process.argv.slice(2);
const opt  = (name) => { const at = ARGS.indexOf(name); return at !== -1 ? ARGS[at + 1] : null; };
const NEW_DIR = opt('--new') || 'live';
const OLD_DIR = opt('--old') || 'live';
const WANT    = ARGS.filter((a, i) => !a.startsWith('--') && !(i > 0 && ARGS[i - 1].startsWith('--')));
const SCENARIOS = WANT.length ? WANT : [ 'old', 'new', 'qron' ];

const TYPES = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png', '.svg' : 'image/svg+xml',
                '.webp' : 'image/webp', '.jpg' : 'image/jpeg', '.ttf' : 'font/ttf', '.woff2' : 'font/woff2' };

function overlayOf(dir) {                                                                  // app-relative path -> file
    const map = {};
    if (!dir || dir === 'live') return map;
    const walk = (d, rel) => readdirSync(d).forEach((name) => {
        const full = join(d, name); const r = rel ? rel + '/' + name : name;
        if (statSync(full).isDirectory()) walk(full, r); else if (name !== 'manifest.json') map[r] = full;
    });
    walk(resolve(dir), '');
    return map;
}
const OVERLAYS = { old : overlayOf(OLD_DIR), new : overlayOf(NEW_DIR), qron : overlayOf(NEW_DIR) };

// THE QR-ON TEST CONFIG (never shipped): the three switches a Vale resolver would need
function qronFiles(overlay) {
    const read = (rel) => readFileSync(overlay[rel] || join(ROOT, 'WebApps', 'ValeVision3D', ...rel.split('/')), 'utf8');
    const le = JSON.parse(read(LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'));
    le.LayoutEditor__TitleBlock__Config.LayoutEditor__TitleBlock__QrCellEnabled = true;
    const qr = JSON.parse(read(LE + '53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json'));
    qr.ProjectQr__Enabled = true;
    qr.ProjectQr__Link__Config.ProjectQr__Link__BaseUrl = 'https://qr.example.test/q/';
    qr.ProjectQr__Link__Config.ProjectQr__Link__IndexUrl = '';
    return { [LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'] : JSON.stringify(le),
             [LE + '53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json'] : JSON.stringify(qr) };
}
const TEST_INDEX = JSON.stringify({ projects : [
    { folderId : '2026/3047__Doous', projectCode : '3047', year : '2026', qrKey : 'test-key-3047' },
    { folderId : '2026/44371__Gill', projectCode : '44371', year : '2026' },
    { folderId : '2026/57994__Harris__Scheme-02', projectCode : '57994', year : '2026' } ] });

const ttfCache = new Map();
function ad04(name) {
    if (!ttfCache.has(name)) ttfCache.set(name, execFileSync('git', [ '-C', NAWEB, 'show', PIN + ':assets/AD04_-_LIBR_-_Common_-_Front-Files/' + name ], { maxBuffer : 1 << 26 }));
    return ttfCache.get(name);
}

// -----------------------------------------------------------------------------
// The harness page (virtual, at the app root so './' is the app root)
// -----------------------------------------------------------------------------
const IMPORTMAP = JSON.stringify({ imports : {
    'three'                        : './04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.module.js',
    'three/addons/'                : './04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/',
    'three/webgpu'                 : './04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.webgpu.js',
    'three/tsl'                    : './04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.tsl.js',
    'three-mesh-bvh'               : './04__Lib__ThirdParty__VersionLocked/02__Vendor__ThreeMeshBvh__v0.9.9/src/index.js',
    'three-mesh-bvh/worker'        : './04__Lib__ThirdParty__VersionLocked/02__Vendor__ThreeMeshBvh__v0.9.9/src/workers/index.js',
    'three-mesh-bvh/webgpu'        : './04__Lib__ThirdParty__VersionLocked/02__Vendor__ThreeMeshBvh__v0.9.9/src/webgpu/index.js',
    'clipper2-js'                  : './04__Lib__ThirdParty__VersionLocked/03__Vendor__Clipper2Js__v0.9.0/fesm2020/clipper2-js.mjs',
    'three-edge-projection'        : './04__Lib__ThirdParty__VersionLocked/04__Vendor__ThreeEdgeProjection__v0.0.10/src/index.js',
    'three-edge-projection/webgpu' : './04__Lib__ThirdParty__VersionLocked/04__Vendor__ThreeEdgeProjection__v0.0.10/src/webgpu/index.js'
} });

const PAGE = String.raw`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>W1-26 harness</title>
<link rel="stylesheet" href="./03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css">
<style> body { background:#fff; } #host svg { display:block; width:1600px; height:auto; } #out { white-space:pre; font:12px monospace; } </style>
<script type="importmap">${IMPORTMAP}</script>
<script src="./04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js"></script>
</head><body><div id="host"></div><pre id="out">running...</pre>
<script type="module">
import './02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
const SRC = './02__Src__AppModules/';
const LE  = SRC + '51__System__LayoutEditor/';
const R = window.__W126 = { steps : [], errors : [] };
const say = (l) => { document.getElementById('out').textContent += '\n' + l; };
const b64 = (ab) => { const u = new Uint8Array(ab); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const step = async (name, fn) => { try { R[name] = await fn(); R.steps.push(name); } catch (e) { R.errors.push(name + ': ' + (e && e.stack || e)); } };
const J = (v) => JSON.parse(JSON.stringify(v));
(async () => {
  const CFG    = await import(LE + '03__Core__Config/Na__LayoutEditor__ConfigState__.js');
  const REC    = await import(LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js');
  const LAYOUT = await import(LE + '07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js');
  const CHROME = await import(LE + '10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js');
  const MARKUP = await import(LE + '15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js');
  const SHAPE  = await import(LE + '15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js');
  const LEAD   = await import(LE + '15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js');
  const DIM    = await import(LE + '15__Core__Markup/Na__LayoutEditor__DimensionGeometry__.js');
  const FONTS  = await import(LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js');
  const FACADE = await import(SRC + '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js');
  await CFG.Na__LeCfg__Ready();
  R.scenario = new URLSearchParams(location.search).get('scenario');
  window.__W126svg = (list, w, h) => CHROME.Na__LeChrome__ToSvgMarkup(list, w, h);
  R.chromeExports = Object.keys(CHROME).sort();

  // FONTS: the screen's (CSS index -> AD04) and the PDF's (PdfFonts, as the editor waits for them before a first drawing)
  await step('fonts', async () => {
    await document.fonts.ready;
    for (const w of [ 300, 400, 600 ]) await document.fonts.load(w + ' 20px "Open Sans"');
    const pdfLoaded = await FONTS.Na__LePdfFonts__EnsureLoaded();
    const style = CFG.Na__LeCfg__GetStyleSetup();
    // Which face does the chrome measure in? Compare its width of a probe with jsPDF's own Helvetica and OpenSans.
    const probe = 'Mr & Mrs Featherstonehaugh';
    const doc = new window.jspdf.jsPDF({ unit : 'mm', format : [ 210, 297 ] });
    FONTS.Na__LePdfFonts__Install(doc);
    const w = (face) => { doc.setFont(face, 'normal'); doc.setFontSize(2.2 / (25.4 / 72)); return doc.getTextWidth(probe); };
    return { screen400 : document.fonts.check('400 20px "Open Sans"'), pdfLoaded, styleFont : style.fontFamily,
             chromeMm : CHROME.Na__LeChrome__MeasureTextMm(probe, 2.2, 'normal'), helveticaMm : w('helvetica'), openSansMm : w('OpenSans') };
  });

  // HELPERS
  const pdfOf = (wMm, hMm, lists) => {
    const doc = new window.jspdf.jsPDF({ unit : 'mm', format : [ wMm, hMm ], orientation : wMm > hMm ? 'landscape' : 'portrait', compress : false, putOnlyUsedFonts : true });
    lists.forEach((list) => CHROME.Na__LeChrome__DrawToPdf(doc, list));
    return b64(doc.output('arraybuffer'));
  };
  const svgWidths = (markup, prims) => {                                        // the screen's own text widths, in paper mm
    const host = document.getElementById('host'); host.innerHTML = markup;
    const texts = Array.from(host.querySelectorAll('text'));
    const flat = []; (function walk(list) { list.forEach((p) => { if (p.Kind === 'group') walk(p.Children || []); else if (p.Kind === 'text') flat.push(p); }); })(prims);
    const rows = texts.map((t, i) => {
      const p = flat[i] || {};
      return { text : t.textContent, screenMm : t.getComputedTextLength(), chromeMm : CHROME.Na__LeChrome__MeasureTextMm(p.Text, p.FontMm, p.Weight, p.TrackingMm), fontMm : p.FontMm, weight : p.Weight, trackingMm : p.TrackingMm || 0 };
    });
    host.innerHTML = '';
    return rows;
  };
  const textsIn = (prims, y0, y1) => { const out = []; (function walk(list) { list.forEach((p) => { if (p.Kind === 'group') walk(p.Children || []); else if (p.Kind === 'text' && p.BaselineY >= y0 && p.BaselineY <= y1) out.push([ p.Text, +p.X.toFixed(3), +p.BaselineY.toFixed(3), p.FontMm, p.Weight ]); }); })(prims); return out; };
  const linesIn = (prims, y0, y1) => prims.filter((p) => p.Kind === 'line' && p.Y1 >= y0 - 0.01 && p.Y2 <= y1 + 0.01 && Math.abs(p.X1 - p.X2) < 1e-9).map((p) => +p.X1.toFixed(3));
  const raster = (markup, wMm, hMm, pxPerMm, points) => new Promise((done) => {    // the screen's pixels at given paper points
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = Math.round(wMm * pxPerMm); c.height = Math.round(hMm * pxPerMm);
      const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      done(points.map(([ x, y ]) => Array.from(g.getImageData(Math.round(x * pxPerMm), Math.round(y * pxPerMm), 1, 1).data)));
    };
    img.onerror = () => done(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup.replace('<svg ', '<svg width="' + (wMm * pxPerMm) + '" height="' + (hMm * pxPerMm) + '" '));
  });

  // 0. THE LOGO, loaded before any sheet is built (as a session that has drawn once has it)
  await step('logo', async () => ({ loaded : !!(await CHROME.Na__LeChrome__LoadAsset(CFG.Na__LeCfg__GetTitleBlockSetup().logoAssetPath)) }));

  // 1. THE LOCAL SHEETS: chrome (title block and frames) and markup, screen and PDF
  await step('sheets', async () => {
    const out = [];
    for (const folder of [ '2026/3047__Doous', '2026/44371__Gill', '2026/57994__Harris__Scheme-02' ]) {
      const project = await (await fetch('/WebApps/Whitecardopedia/Projects/' + folder + '/project.json')).json();
      FACADE.Na__CfApi__SetLoadedProjectData(project);
      for (const raw of ((project.LayoutEditor__DrawingsData || {}).LayoutEditor__DrawingsData__Sheets || [])) {
        const s = REC.Na__LeRec__NormaliseSheet(J(raw));
        const layout = LAYOUT.Na__LeLayout__Solve(s);
        const fields = REC.Na__LeRec__BuildFields(s);
        const chrome = CHROME.Na__LeChrome__Build(layout, s, { fields : fields, includeFrames : true });
        let markup = [];
        try { markup = MARKUP.Na__LeMarkup__BuildSheetPrimitives(s, layout, null) || []; } catch (e) { R.errors.push('markup ' + folder + ': ' + e); }
        const page = layout.Page, band = layout.TitleBlock;
        const svg = CHROME.Na__LeChrome__ToSvgMarkup(chrome.concat(markup), page.WidthMm, page.HeightMm, 'na-le-test');
        out.push({ folder, sheet : s.Sheet__Id, paper : s.Sheet__PaperSize, orientation : s.Sheet__Orientation, page : [ page.WidthMm, page.HeightMm ],
                   fields, band : [ band.X, band.Y, band.WidthMm, band.HeightMm ],
                   bandTexts : textsIn(chrome, band.Y, band.Y + band.HeightMm), dividers : linesIn(chrome, band.Y, band.Y + band.HeightMm),
                   chromeCount : chrome.length, markupCount : markup.length, chrome : J(chrome), markup : J(markup),
                   widths : svgWidths(svg, chrome.concat(markup)), svg, pdf : pdfOf(page.WidthMm, page.HeightMm, [ chrome, markup ]) });
      }
    }
    return out;
  });

  // 2. A HIDDEN FRAME: Viewport__ShowFrame false takes the frame and its caption off the screen and the PDF
  await step('showFrame', async () => {
    const vp = (show) => ({ Viewport__Id : 'Vp_1', Viewport__Kind : '2d', Viewport__Name : 'PROPOSED FRONT ELEVATION', Viewport__ScaleDenominator : 50,
                            Viewport__FrameMm : { X : 20, Y : 20, WidthMm : 150, HeightMm : 90 }, Viewport__LayerId : 'Layer_001', Viewport__ShowFrame : show });
    const sheetOf = (show) => REC.Na__LeRec__NormaliseSheet({ Sheet__Id : 'Sheet_009', Sheet__Name : 'Frames', Sheet__Order : 9, Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape',
                                                              Sheet__Fields : {}, Sheet__Viewports : [ vp(show) ] });
    const res = {};
    for (const show of [ true, false ]) {
      const s = sheetOf(show); const layout = LAYOUT.Na__LeLayout__Solve(s);
      const frames = CHROME.Na__LeChrome__Build(layout, s, { fields : {}, includeTitleBlock : false });
      const svg = CHROME.Na__LeChrome__ToSvgMarkup(frames, layout.Page.WidthMm, layout.Page.HeightMm);
      res[show ? 'shown' : 'hidden'] = { normalisedShowFrame : s.Sheet__Viewports[0].Viewport__ShowFrame, prims : frames.length, kinds : frames.map((p) => p.Kind),
                                         svgHasCaption : svg.indexOf('PROPOSED FRONT ELEVATION') !== -1, svgRects : (svg.match(/<rect /g) || []).length,
                                         viewportFrame : typeof CHROME.Na__LeChrome__BuildViewportFrame === 'function' ? CHROME.Na__LeChrome__BuildViewportFrame(s, s.Sheet__Viewports[0]).length : null,
                                         svg, pdf : pdfOf(layout.Page.WidthMm, layout.Page.HeightMm, [ frames ]) };
    }
    return res;
  });

  // 3. A HOLED VECTOR: the hole stays bare on the screen (even-odd SVG) and in the PDF (f*)
  await step('holes', async () => {
    const shape = { Shape__Id : 'Shape_h', Shape__Points : [ [ 20, 20 ], [ 80, 20 ], [ 80, 80 ], [ 20, 80 ], [ 40, 40 ], [ 60, 40 ], [ 60, 60 ], [ 40, 60 ] ],
                    Shape__Holes : [ 4 ], Shape__Closed : true, Shape__Stroked : true, Shape__StrokeColour : '#000000', Shape__StrokePt : 0.5, Shape__FillColour : '#2f6fd0' };
    const normal = REC.Na__LeRec__NormaliseShape(J(shape), 'Layer_001');
    const list = []; SHAPE.Na__LeShapeGeo__Push(list, shape);
    const svg = CHROME.Na__LeChrome__ToSvgMarkup(list, 100, 100);
    const pts = [ [ 50, 50 ], [ 30, 50 ], [ 10, 10 ] ];                          // the hole's middle, the ring, outside
    return { normalisedHoles : normal ? normal.Shape__Holes : null, primitive : J(list), svg, svgEvenOdd : svg.indexOf('fill-rule="evenodd"') !== -1, subpaths : (svg.match(/Z/g) || []).length,
             containsHole : SHAPE.Na__LeShapeGeo__Contains(shape, { x : 50, y : 50 }), containsRing : SHAPE.Na__LeShapeGeo__Contains(shape, { x : 30, y : 50 }),
             screenPixels : await raster(svg, 100, 100, 4, pts), pdf : pdfOf(100, 100, [ list ]) };
  });

  // 4. THE 'qr' PRIMITIVE: a symbol in a square, vector on both surfaces (the chrome alone, any config)
  await step('qrPrimitive', async () => {
    if (typeof CHROME.Na__LeChrome__PushQr !== 'function') return { pushQr : false };
    const ENC = await import(LE + '53__Feature__ProjectQrCode/Na__ProjectQr__Encoder__.js');
    const symbol = ENC.Na__QrEnc__Encode('https://qr.example.test/q/?test-key-3047');
    const list = []; CHROME.Na__LeChrome__PushQr(list, 10, 10, 30, symbol, '#000000', '#ffffff');
    const svg = CHROME.Na__LeChrome__ToSvgMarkup(list, 50, 50);
    return { pushQr : true, kind : list[0] && list[0].Kind, size : symbol && symbol.Size, svgPaths : (svg.match(/<path /g) || []).length, svg,
             screenPixels : await raster(svg, 50, 50, 8, [ [ 11, 11 ], [ 25, 25 ], [ 45, 45 ] ]), pdf : pdfOf(50, 50, [ list ]) };
  });

  // 5. THE PROJECT QR CODE IN THE SHIPPED (or test) CONFIG: a Shape__Qr box and the title block's end cell
  await step('qrConfig', async () => {
    const LOADER = await import(SRC + '03__AppUtils/Na__AppUtils__ProjectLoader.js');
    const SYM    = await import(LE + '53__Feature__ProjectQrCode/Na__ProjectQr__Symbol__.js');
    const LINK   = await import(LE + '53__Feature__ProjectQrCode/Na__ProjectQr__ProjectLink__.js');
    await SYM.Na__ProjectQr__Ready();
    await LOADER.Na__AppUtils__InitMasterIndex();
    LINK.Na__QrLink__CurrentProject(); await new Promise((r) => setTimeout(r, 50));
    const symbol = SYM.Na__ProjectQr__GetSymbol();
    const tb = CFG.Na__LeCfg__GetTitleBlockSetup();
    const box = { Shape__Id : 'Shape_q', Shape__Points : [ [ 10, 10 ], [ 40, 10 ], [ 40, 40 ], [ 10, 40 ] ], Shape__Closed : true, Shape__Stroked : true,
                  Shape__StrokeColour : '#000000', Shape__StrokePt : 0.25, Shape__Qr : { Qr__MarginMm : 2 } };
    const list = []; SHAPE.Na__LeShapeGeo__Push(list, box);
    const cells = {};
    for (const [ paper, orientation ] of [ [ 'A1', 'landscape' ], [ 'A2', 'landscape' ], [ 'A3', 'landscape' ], [ 'A4', 'landscape' ], [ 'A4', 'portrait' ] ]) {
      const s = REC.Na__LeRec__NormaliseSheet({ Sheet__Id : 'Sheet_q', Sheet__Name : 'QR', Sheet__Order : 1, Sheet__PaperSize : paper, Sheet__Orientation : orientation, Sheet__Fields : {}, Sheet__Viewports : [] });
      const layout = LAYOUT.Na__LeLayout__Solve(s);
      const prims = CHROME.Na__LeChrome__Build(layout, s, { fields : REC.Na__LeRec__BuildFields(s), includeFrames : false });
      const qr = prims.filter((p) => p.Kind === 'qr');
      const band = layout.TitleBlock;
      const rules = linesIn(prims, band.Y, band.Y + band.HeightMm);
      cells[paper + ' ' + orientation] = { qrPrims : qr.length, qrSizeMm : qr[0] ? +qr[0].SizeMm.toFixed(3) : null,
                                           endCellMm : qr[0] ? +((band.X + band.WidthMm) - Math.max(...rules)).toFixed(3) : null,
                                           texts : textsIn(prims, band.Y, band.Y + band.HeightMm).map((t) => t[0]),
                                           pdf : (paper === 'A3' || paper === 'A4') ? pdfOf(layout.Page.WidthMm, layout.Page.HeightMm, [ prims ]) : null };
    }
    return { enabled : SYM.Na__ProjectQr__IsEnabled(), qrCellEnabled : tb.qrCellEnabled, url : SYM.Na__ProjectQr__GetUrl(), symbolSize : symbol ? symbol.Size : null,
             boxKinds : list.map((p) => p.Kind), cells, logoFallbackText : tb.logoFallbackText === undefined ? '(no reader)' : tb.logoFallbackText };
  });

  // 6. THE BROKEN-LINK HALO: on screen only when the caller asks; never in a PDF
  await step('halo', async () => {
    if (typeof LEAD.Na__LeLeadGeo__SetBrokenResolver !== 'function') return { resolver : false };
    const leader = REC.Na__LeRec__NormaliseLeader({ Leader__Id : 'Leader_1', Leader__Type : LEAD.Na__LeLeadGeo__TYPE_BUBBLE, Leader__TipXMm : 20, Leader__TipYMm : 60, Leader__AnchorXMm : 60, Leader__AnchorYMm : 30, Leader__Text : 'EX01', Leader__SpecNoteId : 'Note_gone' }, 'Layer_001');
    LEAD.Na__LeLeadGeo__SetBrokenResolver((l) => l.Leader__SpecNoteId === 'Note_gone');
    const onScreen = []; LEAD.Na__LeLeadGeo__Push(onScreen, leader, { showBrokenHalos : true });
    const forPdf   = []; LEAD.Na__LeLeadGeo__Push(forPdf, leader);
    LEAD.Na__LeLeadGeo__SetBrokenResolver(null);
    const red = (list) => list.filter((p) => p.StrokeColour === '#d92d20').length;
    const svgOn = CHROME.Na__LeChrome__ToSvgMarkup(onScreen, 100, 100), svgOff = CHROME.Na__LeChrome__ToSvgMarkup(forPdf, 100, 100);
    return { resolver : true, isBroken : true, redOnScreen : red(onScreen), redForPdf : red(forPdf), svgOnHasRed : svgOn.indexOf('#d92d20') !== -1, svgOffHasRed : svgOff.indexOf('#d92d20') !== -1,
             pdf : pdfOf(100, 100, [ forPdf ]) };
  });

  // 8. EVERY PAPER, WITH A VALE SHEET'S VALUES: the Rev prefix, a fifth more on A2/A1, the prefix dropped on A4 portrait
  await step('papers', async () => {
    const out = {};
    const fields = { Sheet__Fields__Client : 'Mordaunt', Sheet__Fields__SiteAddress : 'The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE',
                     Sheet__Fields__Title : 'Proposed Orangery - Elevations', Sheet__Fields__DocumentId : '57079_D02', Sheet__Fields__Revision : 'B', Sheet__Fields__Status : 'FOR PLANNING' };
    for (const [ paper, orientation ] of [ [ 'A1', 'landscape' ], [ 'A2', 'landscape' ], [ 'A2', 'portrait' ], [ 'A3', 'landscape' ], [ 'A3', 'portrait' ], [ 'A4', 'landscape' ], [ 'A4', 'portrait' ] ]) {
      const s = REC.Na__LeRec__NormaliseSheet({ Sheet__Id : 'Sheet_p', Sheet__Name : 'Elevations', Sheet__Order : 2, Sheet__PaperSize : paper, Sheet__Orientation : orientation,
                                                Sheet__CommonFields : false, Sheet__Fields : J(fields), Sheet__Viewports : [ { Viewport__Id : 'Vp_0', Viewport__Kind : '2d', Viewport__ScaleDenominator : 50 } ] });
      const layout = LAYOUT.Na__LeLayout__Solve(s);
      const f = REC.Na__LeRec__BuildFields(s);
      const prims = CHROME.Na__LeChrome__Build(layout, s, { fields : f, includeFrames : false });
      const band = layout.TitleBlock;
      const texts = textsIn(prims, band.Y, band.Y + band.HeightMm).map((x) => x[0]);
      const rules = linesIn(prims, band.Y, band.Y + band.HeightMm);
      const widths = rules.slice(1).map((x, i) => +(x - rules[i]).toFixed(3));
      out[paper + ' ' + orientation] = { strip : +band.WidthMm.toFixed(3), texts, widths, cut : texts.filter((x) => /\.\.\.$/.test(x)), fields : { Date : f.Date, Scale : f.Scale, Revision : f.Revision } };
      // THE PREFIX RULE, solved by hand with the cells module and the chrome's own measure (new tree only)
      const CELLS = await import(LE + '10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Cells__.js');
      if (typeof CELLS.Na__LeTitleCells__Widen === 'function') {
        const setup = CFG.Na__LeCfg__GetTitleBlockSetup(), style = CFG.Na__LeCfg__GetStyleSetup();
        const logoW = Math.min(setup.logoCellWidthMm, band.WidthMm / 3);
        const stripW = band.WidthMm - logoW;
        const factor = (setup.rowWidthFactorByPaper || {})[paper] > 1 ? setup.rowWidthFactorByPaper[paper] : 1;
        const solve = (bare) => CELLS.Na__LeTitleCells__Solve(stripW, CELLS.Na__LeTitleCells__Widen(stripW, setup.rows.map((row) => {
          let label = String(row.Label || row.Key || ''); if (style.titleLabelUppercase) label = label.toUpperCase();
          const raw = f[row.Key] !== undefined && f[row.Key] !== null ? String(f[row.Key]) : '';
          const value = (!bare && row.ValuePrefix && raw) ? row.ValuePrefix + ' ' + raw : raw;
          const labelMm = CHROME.Na__LeChrome__MeasureTextMm(label, setup.fontSizeLabelMm, style.titleLabelWeight, style.titleLabelTrackingMm);
          const valueMm = CHROME.Na__LeChrome__MeasureTextMm(value, setup.fontSizeValueMm, style.titleValueWeight);
          return CELLS.Na__LeTitleCells__Cell(row, Math.max(labelMm, valueMm) + setup.fieldPaddingHMm * 2, labelMm + setup.fieldPaddingHMm * 2);
        }), factor));
        const keys = setup.rows.map((r) => r.Key);
        const prefixed = solve(false), bare = solve(true);
        out[paper + ' ' + orientation].prefixRule = { keys, prefixed : prefixed.map((x) => +x.toFixed(3)), bare : bare.map((x) => +x.toFixed(3)) };
      }
    }
    return out;
  });

  // 7. DIMENSION GEOMETRY: a plain spec is what it always was; a length and a dash are new and opt-in
  await step('dimension', async () => {
    const sk = DIM.Na__LeDimGeo__Skeleton({ x : 10, y : 50 }, { x : 90, y : 50 }, -10, 1.5, 2, DIM.Na__LeDimGeo__ALIGNED);
    const sk2 = DIM.Na__LeDimGeo__Skeleton({ x : 10, y : 50 }, { x : 90, y : 50 }, -10, 1.5, 2, DIM.Na__LeDimGeo__ALIGNED, { startMm : 4, endMm : 4 });
    return { plainX1 : sk.X1, plainHasGhost : !!sk.G1, cutX1 : sk2.X1, cutG1 : sk2.G1 || null };
  });

  R.done = true;
  say('done');
})().catch((e) => { R.errors.push('top: ' + (e && e.stack || e)); R.done = true; });
</script></body></html>`;

// -----------------------------------------------------------------------------
// Run each scenario in its own page
// -----------------------------------------------------------------------------
const browser = await chromium.launch();
const summary = {};
for (const scenario of SCENARIOS) {
    const overlay = OVERLAYS[scenario] || {};
    const extra = scenario === 'qron' ? qronFiles(overlay) : {};
    const context = await browser.newContext({ viewport : { width : 2600, height : 1200 } });
    const aborted = [], served = new Set(), consoleLines = [];
    await context.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith(AD04)) {
            const name = decodeURIComponent(url.slice(AD04.length).split('?')[0]);
            try { return route.fulfill({ status : 200, headers : { 'content-type' : 'font/ttf', 'access-control-allow-origin' : '*' }, body : ad04(name) }); }
            catch (e) { return route.fulfill({ status : 404, body : '' }); }
        }
        if (url.split('?')[0] === INDEXURL) {
            return route.fulfill({ status : 200, headers : { 'content-type' : 'application/json', 'access-control-allow-origin' : '*' }, body : scenario === 'qron' ? TEST_INDEX : JSON.stringify({ projects : [] }) });
        }
        if (!url.startsWith(HOST + '/')) { aborted.push(url); return route.abort(); }
        const path = decodeURIComponent(url.slice(HOST.length).split('?')[0].split('#')[0]);
        if (path === APP + '__w126__.html') return route.fulfill({ status : 200, headers : { 'content-type' : TYPES['.html'] }, body : PAGE });
        if (path.startsWith(APP)) {
            const rel = path.slice(APP.length);
            served.add(rel);
            if (Object.prototype.hasOwnProperty.call(extra, rel)) return route.fulfill({ status : 200, headers : { 'content-type' : TYPES['.json'] }, body : extra[rel] });
            if (overlay[rel]) return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(rel)] || 'application/octet-stream' }, body : readFileSync(overlay[rel]) });
        }
        const file = join(ROOT, ...path.split('/').filter(Boolean));
        if (existsSync(file) && statSync(file).isFile()) return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(file)] || 'application/octet-stream' }, body : readFileSync(file) });
        return route.fulfill({ status : 404, body : 'not found' });
    });
    const page = await context.newPage();
    page.on('console', (m) => consoleLines.push(m.type() + ': ' + m.text()));
    page.on('pageerror', (e) => consoleLines.push('pageerror: ' + e.message));
    await page.goto(HOST + APP + '__w126__.html?project=2026/3047__Doous&scenario=' + scenario);
    try {
        await page.waitForFunction(() => window.__W126 && window.__W126.done === true, null, { timeout : 120000 });
    } catch (timeout) {
        const partial = await page.evaluate(() => window.__W126 ? { steps : window.__W126.steps, errors : window.__W126.errors } : 'no __W126 (the module script never ran)');
        console.log('== ' + scenario + ': TIMEOUT. state: ' + JSON.stringify(partial) + '\n   console:\n   ' + consoleLines.slice(-40).join('\n   ') +
                    '\n   aborted: ' + aborted.slice(0, 20).join(' | ') + '\n   served: ' + served.size);
        await context.close();
        continue;
    }
    const R = await page.evaluate(() => window.__W126);
    // THE STRIP AS THE SCREEN DRAWS IT: each local sheet's title block band, inline SVG in this page (so the
    // page's own Open Sans), 4 px to the millimetre, saved as PNG for a pixel comparison before / after.
    if (!existsSync(join(SCRATCH, 'png'))) mkdirSync(join(SCRATCH, 'png'));
    for (const s of (R.sheets || [])) {
        const [ bx, by, bw, bh ] = s.band;
        const strip = s.chrome.filter((p) => p.Kind !== 'image');                       // the logo image comes and goes with the asset cache; the band is the subject
        const markup = await page.evaluate(([ list, x, y, w, h ]) => {
            const shifted = JSON.parse(JSON.stringify(list)).map((p) => { for (const k of [ 'Y', 'Y1', 'Y2', 'BaselineY' ]) if (typeof p[k] === 'number') p[k] -= y; for (const k of [ 'X', 'X1', 'X2' ]) if (typeof p[k] === 'number') p[k] -= x; return p; });
            return window.__W126svg ? window.__W126svg(shifted, w, h) : null;
        }, [ strip, bx, by, bw, bh ]);
        if (!markup) continue;
        await page.evaluate(([ m, w ]) => { const host = document.getElementById('host'); host.innerHTML = m; const svg = host.querySelector('svg'); svg.style.width = (w * 4) + 'px'; svg.style.height = 'auto'; }, [ markup, bw ]);
        const png = join(SCRATCH, 'png', scenario + '__' + s.folder.split('/')[1] + '__' + s.sheet + '__band.png');
        await page.locator('#host svg').screenshot({ path : png });
        s.bandPng = png;
    }
    await context.close();

    // Write the PDFs and SVGs out, keep the JSON light
    const pdfs = [];
    const keep = (name, b64) => { if (!b64) return null; const f = join(SCRATCH, 'pdf', scenario + '__' + name + '.pdf'); writeFileSync(f, Buffer.from(b64, 'base64')); pdfs.push(f); return f; };
    const svg = (name, text) => { if (!text) return null; const f = join(SCRATCH, 'svg', scenario + '__' + name + '.svg'); writeFileSync(f, text, 'utf8'); return f; };
    (R.sheets || []).forEach((s) => { const n = s.folder.split('/')[1] + '__' + s.sheet; s.pdf = keep(n, s.pdf); s.svg = svg(n, s.svg); });
    if (R.showFrame) for (const k of [ 'shown', 'hidden' ]) if (R.showFrame[k]) { R.showFrame[k].pdf = keep('frame_' + k, R.showFrame[k].pdf); R.showFrame[k].svg = svg('frame_' + k, R.showFrame[k].svg); }
    if (R.holes) { R.holes.pdf = keep('holes', R.holes.pdf); R.holes.svg = svg('holes', R.holes.svg); }
    if (R.qrPrimitive && R.qrPrimitive.pdf) { R.qrPrimitive.pdf = keep('qr_primitive', R.qrPrimitive.pdf); R.qrPrimitive.svg = svg('qr_primitive', R.qrPrimitive.svg); }
    if (R.qrConfig && R.qrConfig.cells) for (const [ k, c ] of Object.entries(R.qrConfig.cells)) c.pdf = keep('qrcell_' + k.replace(/ /g, '_'), c.pdf);
    if (R.halo && R.halo.pdf) R.halo.pdf = keep('halo_pdf', R.halo.pdf);
    R.aborted = aborted; R.console = consoleLines; R.overlayFiles = Object.keys(overlay).length;
    (R.sheets || []).forEach((s) => { delete s.widthsRaw; });
    writeFileSync(join(SCRATCH, 'logs', 'browser__' + scenario + '.json'), JSON.stringify(R, null, 1));
    summary[scenario] = { steps : R.steps, errors : R.errors, aborted : aborted.length, consoleErrors : consoleLines.filter((l) => /^(error|pageerror)/.test(l)) };
    console.log('== ' + scenario + ': steps ' + R.steps.join(', ') + (R.errors.length ? '\n   ERRORS: ' + R.errors.join('\n   ') : '') +
                '\n   aborted ' + aborted.length + (aborted.length ? ' (' + [ ...new Set(aborted.map((u) => u.split('/').slice(0, 3).join('/'))) ].join(', ') + ')' : '') +
                '\n   console errors: ' + (summary[scenario].consoleErrors.join(' | ') || 'none'));
}
await browser.close();
