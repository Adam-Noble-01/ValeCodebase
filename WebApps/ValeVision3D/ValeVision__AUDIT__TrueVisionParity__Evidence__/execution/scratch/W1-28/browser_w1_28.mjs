// =============================================================================
// W1-28 scratch harness - the paint order in the real Layout Editor modules, headless Chromium (not shipped)
// =============================================================================
// No server is started (W1-26's method): Chromium asks for http://vv.test/<path> and the route below answers
// from D:\10_CoreLib__ValeCodebase\<path>, with an OVERLAY of app files per scenario. The font host is answered
// from TrueVision's repository at b2aa9151 (the AD04 files this app's config names). Every other off-machine
// request is aborted and listed. Read-only on every tree: the projects' project.json are read as copies in
// memory and nothing is ever saved; PNGs and PDFs are written under this folder only.
//
// The viewport PICTURES are deterministic stand-ins (the two viewport modules are served as stubs in BOTH
// scenarios): a 2D frame is an opaque blue-grey card with a cross ('opaque', like a Base Image) or the cross
// alone ('lines', like a vector-only drawing); a 3D frame is always an opaque sand card. What is compared is
// how the sheet stacks them with its chrome and markup - the subject of this package.
//
//   node browser_w1_28.mjs --old <dir|live> --new <dir|live> [scenario ...]     scenarios: old new (default both)
//   Results: logs/browser__<scenario>.json, png/<scenario>__*.png, pdf/<scenario>__*.pdf
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
for (const d of [ 'pdf', 'png', 'logs' ]) if (!existsSync(join(SCRATCH, d))) mkdirSync(join(SCRATCH, d));

const ARGS = process.argv.slice(2);
const opt  = (name) => { const at = ARGS.indexOf(name); return at !== -1 ? ARGS[at + 1] : null; };
const NEW_DIR = opt('--new') || 'live';
const OLD_DIR = opt('--old') || 'live';
const WANT    = ARGS.filter((a, i) => !a.startsWith('--') && !(i > 0 && ARGS[i - 1].startsWith('--')));
const SCENARIOS = WANT.length ? WANT : [ 'old', 'new' ];

const TYPES = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png', '.svg' : 'image/svg+xml',
                '.webp' : 'image/webp', '.jpg' : 'image/jpeg', '.ttf' : 'font/ttf', '.woff2' : 'font/woff2' };

function overlayOf(dir) {                                                                  // app-relative path -> file
    const map = {};
    if (!dir || dir === 'live') return map;
    const walk = (d, rel) => readdirSync(d).forEach((name) => {
        const full = join(d, name); const r = rel ? rel + '/' + name : name;
        if (statSync(full).isDirectory()) walk(full, r); else map[r] = full;
    });
    walk(resolve(dir), '');
    return map;
}
const OVERLAYS = { old : overlayOf(OLD_DIR), new : overlayOf(NEW_DIR) };

const ttfCache = new Map();
function ad04(name) {
    if (!ttfCache.has(name)) ttfCache.set(name, execFileSync('git', [ '-C', NAWEB, 'show', PIN + ':assets/AD04_-_LIBR_-_Common_-_Front-Files/' + name ], { maxBuffer : 1 << 26 }));
    return ttfCache.get(name);
}

// -----------------------------------------------------------------------------
// The viewport stand-ins, served at the two modules' own paths in both scenarios
// -----------------------------------------------------------------------------
const STUB_COMMON = `
const W = () => window.__W128 || {};
function Card(body, is3d) {
    body.innerHTML = '';
    const opaque = is3d || (W().vpMode !== 'lines' && W().vpMode !== 'clear');   // <-- 'clear': a 2D frame with nothing in it at all
    const card = document.createElement('div');
    card.className = 'w128-card';
    card.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;' + (opaque ? 'background:' + (is3d ? '#e5d6c8' : '#c8d6e5') + ';' : '');
    if (W().vpMode !== 'flat' && W().vpMode !== 'clear') card.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;left:0;top:0">'
        + '<path d="M0 0 L100 100 M100 0 L0 100 M0 50 L100 50 M50 0 L50 100" stroke="#1f2a33" stroke-width="1.5" fill="none" vector-effect="non-scaling-stroke"/></svg>';
    body.appendChild(card);
    return true;
}
`;
const STUB_2D = STUB_COMMON + `
export function Na__LeVp2d__Fill(body, sheet, viewport, ppm) { return Card(body, false); }
export function Na__LeVp2d__Release(id, body) { if (body) body.innerHTML = ''; }
export function Na__LeVp2d__Park(id, body) { return { id : id }; }
export function Na__LeVp2d__Restore(id, state) { }
export function Na__LeVp2d__Describe(viewport) {
    return { source : null, definition : { Axis2Sign : 1 }, modelSource : null,
             window : { Denominator : viewport.Viewport__ScaleDenominator || 50, OriginX : 0, OriginY : 0, ToLocal : () => ({ x : 0, y : 0 }), ToPaper : () => ({ x : 0, y : 0 }) } };
}
export async function Na__LeVp2d__EnsureLinework() { return null; }
export async function Na__LeVp2d__RenderForExport(viewport) { return (W().vpMode === 'lines' || W().vpMode === 'clear') ? null : { dataUrl : W().picture('#c8d6e5') }; }
export function Na__LeVp2d__StyleBands() { return []; }
`;
const STUB_3D = STUB_COMMON + `
export function Na__LeVp3d__Fill(body, sheet, viewport, ppm) { return Card(body, true); }
export function Na__LeVp3d__Release(id, body) { if (body) body.innerHTML = ''; }
export function Na__LeVp3d__Park(id, body) { return { id : id }; }
export function Na__LeVp3d__Restore(id, state) { }
export async function Na__LeVp3d__RenderForExport(sheet, viewport) { return W().picture('#e5d6c8'); }
export function Na__LeVp3d__ExportRectMm(viewport) { const f = viewport.Viewport__FrameMm; return { X : 0, Y : 0, WidthMm : f.WidthMm, HeightMm : f.HeightMm }; }
`;
const STUBS = {
    [LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__.js'] : STUB_2D,
    [LE + '20__System__Viewports/Na__LayoutEditor__Viewport3d__.js'] : STUB_3D
};

// -----------------------------------------------------------------------------
// The harness page (virtual, at the app root so './' is the app root)
// -----------------------------------------------------------------------------
const STYLESHEETS = [
    '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
    LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css',
    LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css',
    LE + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css'
].map((h) => '<link rel="stylesheet" href="./' + h + '">').join('\n');

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

const PAGE = String.raw`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>W1-28 harness</title>
${STYLESHEETS}
<script type="importmap">${IMPORTMAP}</script>
<style> html, body { margin:0; padding:0; background:#fff; } #stage { width:1700px; height:1150px; } #out { white-space:pre; font:12px monospace; } </style>
<script src="./04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js"></script>
<script src="./04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.min.js"></script>
</head><body><div class="na-le-stage" id="stage" tabindex="0"></div><pre id="out">running...</pre>
<script type="module">
import './02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
const SRC = './02__Src__AppModules/';
const LE  = SRC + '51__System__LayoutEditor/';
const R = window.__W128R = { steps : [], errors : [], shots : [] };
const H = window.__W128 = { vpMode : 'opaque' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const b64 = (ab) => { const u = new Uint8Array(ab); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const step = async (name, fn) => { try { R[name] = await fn(); R.steps.push(name); } catch (e) { R.errors.push(name + ': ' + (e && e.stack || e)); } };
const J = (v) => JSON.parse(JSON.stringify(v));
// A deterministic picture for the PDF's viewport stand-ins (same bytes in both scenarios)
const pictures = new Map();
H.picture = (colour) => {
  const flat = H.vpMode === 'flat' || H.vpMode === 'clear';
  const key = colour + (flat ? ':flat' : '');
  if (!pictures.has(key)) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = colour; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#1f2a33'; g.lineWidth = 3;
    if (!flat) { g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 256); g.moveTo(256, 0); g.lineTo(0, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke(); }
    pictures.set(key, c.toDataURL('image/png'));
  }
  return pictures.get(key);
};
(async () => {
  const CFG     = await import(LE + '03__Core__Config/Na__LayoutEditor__ConfigState__.js');
  const REC     = await import(LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js');
  const MODEL   = await import(LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__.js');
  const LAYOUT  = await import(LE + '07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js');
  const CHROME  = await import(LE + '10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js');
  const SURFACE = await import(LE + '10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js');
  const MARKUP  = await import(LE + '15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js');
  const GROUPS  = await import(LE + '15__Core__Markup/Na__LayoutEditor__Groups__.js');
  const SCALE   = await import(LE + '07__Core__SheetData/Na__LayoutEditor__DrawingScale__.js');
  const SCOPE   = await import(LE + '30__System__SheetTools/Na__LayoutEditor__EditScope__.js');
  const PDF     = await import(LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js');
  const VQ      = await import(LE + '20__System__Viewports/Na__LayoutEditor__VectorQuality__.js');
  const FACADE  = await import(SRC + '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js');
  await CFG.Na__LeCfg__Ready();
  R.scenario = new URLSearchParams(location.search).get('scenario');
  R.surfaceExports = Object.keys(SURFACE).sort();
  R.markupExports  = Object.keys(MARKUP).sort();
  VQ.Na__LeVectorQ__Set('high');                                                  // <-- Never held while the sheets are photographed (the at-rest check sets its own levels)
  await document.fonts.ready;
  for (const w of [ 300, 400, 600 ]) await document.fonts.load(w + ' 20px "Open Sans"');
  await CHROME.Na__LeChrome__LoadAsset(CFG.Na__LeCfg__GetTitleBlockSetup().logoAssetPath);

  const stage = document.getElementById('stage');
  SURFACE.Na__LeSurface__Mount(stage, { editable : true });
  const PPM = () => SURFACE.Na__LeSurface__GetPixelsPerMm();
  const fit = (s) => { const l = LAYOUT.Na__LeLayout__Solve(s); return Math.min((stage.clientWidth - 40) / (l.Page.WidthMm * PPM()), (stage.clientHeight - 40) / (l.Page.HeightMm * PPM())); };
  const show = async (s, zoom) => {
    SURFACE.Na__LeSurface__SetSheet(s);
    SURFACE.Na__LeSurface__SetZoom(zoom === 'fit' ? fit(s) : zoom);
    const els = SURFACE.Na__LeSurface__GetElements();
    els.stage.scrollLeft = els.stage.clientWidth - 20; els.stage.scrollTop = els.stage.clientHeight - 20;   // <-- the paper sits a whole stage in; bring it to the corner
    await frame(); await sleep(60);
  };
  // Ask the test runner for a picture of the paper: it screenshots the element and stores the PNG
  const shoot = async (name) => { R.shots.push(name); window.__W128shot = name; await new Promise((r) => { window.__W128shotDone = r; }); };
  const pdfPng = async (doc, pxPerMm) => {                                         // the PDF rasterised by PDF.js
    const bytes = doc.output('arraybuffer');
    const pdfjs = window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = './04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.worker.min.js';
    const pdf = await pdfjs.getDocument({ data : new Uint8Array(bytes.slice(0)) }).promise;
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale : pxPerMm * 25.4 / 72 });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await page.render({ canvasContext : c.getContext('2d'), viewport : vp, background : '#ffffff' }).promise;
    return { pdf : b64(bytes), png : c.toDataURL('image/png').split(',')[1], width : c.width, height : c.height };
  };
  const stackInfo = () => {
    const els = SURFACE.Na__LeSurface__GetElements();
    const paper = els.paper;
    const kids = Array.from(paper.children).map((el) => el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className);
    const stack = paper.querySelector(':scope > .na-le-paper__stack');
    const layers = [];
    const host = stack || paper;
    Array.from(host.children).forEach((el) => {
      const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className;
      if (el.classList.contains('na-le-paper__viewports')) Array.from(el.children).forEach((f) => layers.push({ frame : f.getAttribute('data-na-viewport-id'), z : f.style.zIndex || getComputedStyle(f).zIndex }));
      else layers.push({ cls : cls, z : el.style.zIndex || getComputedStyle(el).zIndex });
    });
    return { paperChildren : kids, hasStack : !!stack, layers };
  };

  // 1. THE LOCAL SHEETS, as they are (each normalised, so restacked once as W1-19 does on load)
  const SHEETS = [];
  await step('load', async () => {
    const out = [];
    for (const folder of [ '2026/3047__Doous', '2026/44371__Gill', '2026/57994__Harris__Scheme-02' ]) {
      const project = await (await fetch('/WebApps/Whitecardopedia/Projects/' + folder + '/project.json')).json();
      const raws = ((project.LayoutEditor__DrawingsData || {}).LayoutEditor__DrawingsData__Sheets || []);
      raws.forEach((raw) => { SHEETS.push({ folder, project, raw }); out.push(folder + ' ' + raw.Sheet__Id); });
    }
    return out;
  });

  await step('localSheets', async () => {
    const out = [];
    for (const entry of SHEETS) {
      FACADE.Na__CfApi__SetLoadedProjectData(entry.project);
      const s = REC.Na__LeRec__NormaliseSheet(J(entry.raw));
      const tag = entry.folder.split('/')[1] + '__' + s.Sheet__Id;
      const rec = { tag, layers : (s.Sheet__Layers || []).slice().sort((a, b) => a.Layer__Order - b.Layer__Order).map((l) => l.Layer__Name) };
      for (const mode of (new URLSearchParams(location.search).get('modes') || 'opaque,lines').split(',')) {
        H.vpMode = mode;
        await show(s, 'fit');
        await shoot(tag + '__' + mode + '__fit');
        if (mode !== 'lines') { await show(s, 1); await shoot(tag + '__' + mode + '__z1'); rec.stack = stackInfo(); }
        const built = await PDF.Na__LePdf__BuildDocument(J(s), null);
        const r = await pdfPng(built.doc, 3);
        rec['pdf_' + mode] = { file : built.filename, width : r.width, height : r.height };
        R['pdf__' + tag + '__' + mode] = r;
      }
      out.push(rec);
    }
    H.vpMode = 'opaque';
    SURFACE.Na__LeSurface__SetSheet(null);
    return out;
  });

  // A SYNTHETIC SHEET for the checks below: one 2D viewport and one 3D viewport on the Viewports layer, a
  // magenta vector over the 2D one, a text item, an AtScale dimension off every viewport, and a group
  // holding the 2D viewport with the text.
  const synthetic = (order) => REC.Na__LeRec__NormaliseSheet({
    Sheet__Id : 'Sheet_901', Sheet__Name : 'Paint order', Sheet__Order : 1, Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape', Sheet__Fields : {},
    Sheet__LayerStack : 2,
    Sheet__Layers : order.map((n, i) => ({ Layer__Id : { Text : 'Layer_002', Dimensions : 'Layer_003', Vectors : 'Layer_004', Viewports : 'Layer_001' }[n], Layer__Name : n,
                                            Layer__Type : { Text : 'annotation', Dimensions : 'dimension', Vectors : 'vector', Viewports : 'viewport' }[n], Layer__Visible : true, Layer__Locked : false, Layer__Order : i + 1 })),
    Sheet__Viewports : [
      { Viewport__Id : 'Viewport_001', Viewport__Kind : '2d', Viewport__Name : 'PLAN', Viewport__ScaleDenominator : 50, Viewport__FrameMm : { X : 30, Y : 30, WidthMm : 150, HeightMm : 110 }, Viewport__LayerId : 'Layer_001' },
      { Viewport__Id : 'Viewport_002', Viewport__Kind : '3d', Viewport__Name : 'VIEW', Viewport__ScaleDenominator : 50, Viewport__FrameMm : { X : 200, Y : 30, WidthMm : 150, HeightMm : 110 }, Viewport__LayerId : 'Layer_001' } ],
    Sheet__Shapes : [ { Shape__Id : 'Shape_901', Shape__LayerId : 'Layer_004', Shape__Points : [ [ 120, 80 ], [ 230, 80 ], [ 230, 170 ], [ 120, 170 ] ], Shape__Closed : true,
                        Shape__Stroked : false, Shape__FillColour : '#ff00ff', Shape__FillOpacity : 1 } ],
    Sheet__Annotations : [ { Annotation__Id : 'Anno_901', Annotation__LayerId : 'Layer_002', Annotation__PosXMm : 40, Annotation__PosYMm : 60, Annotation__Text : 'NOTE', Annotation__SizeMm : 5 } ],
    Sheet__Dimensions : [ { Dimension__Id : 'Dim_901', Dimension__LayerId : 'Layer_003', Dimension__StartXMm : 40, Dimension__StartYMm : 200, Dimension__EndXMm : 80, Dimension__EndYMm : 200,
                            Dimension__OffsetMm : 6, Dimension__AtScale : true, Dimension__Orientation : 'horizontal' },
                          { Dimension__Id : 'Dim_902', Dimension__LayerId : 'Layer_003', Dimension__ViewportId : 'Viewport_001', Dimension__StartXMm : 40, Dimension__StartYMm : 120, Dimension__EndXMm : 70, Dimension__EndYMm : 120,
                            Dimension__OffsetMm : 6, Dimension__AtScale : false, Dimension__Orientation : 'horizontal' } ],
    Sheet__Groups : [ { Group__Id : 'Group_901', Group__Members : [ { kind : 'viewport', id : 'Viewport_001' }, { kind : 'annotation', id : 'Anno_901' } ] } ]
  });
  const MAGENTA_AT = { x : 150, y : 100 };                                       // <-- inside the 2D frame and the vector
  const MAGENTA_OUT = { x : 125, y : 160 };                                      // <-- the vector outside every frame
  if (new URLSearchParams(location.search).get('only') === 'local') { R.done = true; return; }

  // 2. A MARKUP LAYER UNDER THE VIEWPORTS LAYER: on screen and in the PDF
  await step('underViewports', async () => {
    const out = {};
    for (const [ name, order ] of [ [ 'over', [ 'Text', 'Dimensions', 'Vectors', 'Viewports' ] ], [ 'under', [ 'Text', 'Dimensions', 'Viewports', 'Vectors' ] ] ]) {
      for (const mode of [ 'opaque', 'lines' ]) {
        H.vpMode = mode;
        const s = synthetic(order);
        await show(s, 1);
        await shoot('synthetic__' + name + '__' + mode);
        const built = await PDF.Na__LePdf__BuildDocument(J(s), null);
        R['pdf__synthetic__' + name + '__' + mode] = await pdfPng(built.doc, 3);
        out[name + '_' + mode] = { layers : s.Sheet__Layers.slice().sort((a, b) => a.Layer__Order - b.Layer__Order).map((l) => l.Layer__Name), stack : stackInfo() };
      }
    }
    H.vpMode = 'opaque';
    return out;
  });

  // 3. CLICKS: the top-most item answers; a reference layer passes the click through
  await step('hits', async () => {
    const base = synthetic([ 'Text', 'Dimensions', 'Vectors', 'Viewports' ]);
    // A second vector on the TEXT layer (above Vectors), FIRST in the array so the old kind-order would have found the later one
    const s = J(base);
    s.Sheet__Shapes.unshift({ Shape__Id : 'Shape_top', Shape__LayerId : 'Layer_002', Shape__Points : [ [ 140, 90 ], [ 160, 90 ], [ 160, 110 ], [ 140, 110 ] ], Shape__Closed : true, Shape__Stroked : true, Shape__StrokeColour : '#000000', Shape__FillColour : '#00ff00', Shape__FillOpacity : 1 });
    const top = MARKUP.Na__LeMarkup__HitTest(s, { x : 150, y : 100 }, 1.5);
    const ref = J(s); ref.Sheet__Layers.find((l) => l.Layer__Id === 'Layer_002').Layer__Selectable = false;
    const through = MARKUP.Na__LeMarkup__HitTest(ref, { x : 150, y : 100 }, 1.5);
    const low = J(s); low.Sheet__Layers.forEach((l) => { if (l.Layer__Id === 'Layer_002') l.Layer__Order = 5; });    // <-- Text to the bottom of the list
    const fromBelow = MARKUP.Na__LeMarkup__HitTest(low, { x : 150, y : 100 }, 1.5);
    return { top, referencePassesThrough : through, textLayerAtBottom : fromBelow };
  });

  // 4. AN OPEN GROUP keeps its viewports at full strength
  await step('openGroup', async () => {
    const s = synthetic([ 'Text', 'Dimensions', 'Vectors', 'Viewports' ]);
    MODEL.Na__LeModel__SetSelection(null);
    await show(s, 1);
    const entered = SCOPE.Na__LeScope__Enter(s, { kind : 'group', id : 'Group_901' });
    SURFACE.Na__LeSurface__RefreshNow('scope');
    await frame(); await sleep(250);                                              // <-- the fade's 120 ms transition
    const frames = Array.from(document.querySelectorAll('.na-le-frame')).map((f) => ({ id : f.getAttribute('data-na-viewport-id'), inScope : f.classList.contains('na-le-frame--in-scope'),
                                                                                   opacity : getComputedStyle(f).opacity, effective : (function eff(el) { let o = 1; while (el && el !== document.body) { o *= parseFloat(getComputedStyle(el).opacity); el = el.parentElement; } return +o.toFixed(3); })(f) }));
    const slots = Array.from(document.querySelectorAll('.na-le-paper svg')).map((el) => ({ cls : el.className.baseVal, opacity : getComputedStyle(el).opacity }));
    await shoot('synthetic__openGroup');
    SCOPE.Na__LeScope__Clear(); SURFACE.Na__LeSurface__RefreshNow('scope');
    return { entered, frames, slots, scopeExport : typeof SCOPE.Na__LeScope__IsInside };
  });

  // 5. THE FIGURE AN AtScale DIMENSION PRINTS against what the Measurements box reads
  await step('atScale', async () => {
    const s = synthetic([ 'Text', 'Dimensions', 'Vectors', 'Viewports' ]);
    return s.Sheet__Dimensions.map((d) => {
      const spanMm = Math.abs(d.Dimension__EndXMm - d.Dimension__StartXMm);
      const measure = spanMm * SCALE.Na__LeDrawScale__DimensionDenominator(s, d);     // <-- the Measurements box's denominator for a dimension (Measurements :358, :369, :422)
      return { id : d.Dimension__Id, atScale : d.Dimension__AtScale, host : d.Dimension__ViewportId || null, printed : MARKUP.Na__LeMarkup__FormatDimension(d, MARKUP.Na__LeMarkup__DimensionValueMm(s, d)),
               measurementsBox : MARKUP.Na__LeMarkup__FormatDimension(Object.assign({}, d, { Dimension__OverrideText : '' }), measure) };
    });
  });

  // 6. ZOOM: a gesture settles once; a single zoom settles at once
  await step('zoom', async () => {
    const s = synthetic([ 'Text', 'Dimensions', 'Vectors', 'Viewports' ]);
    await show(s, 1);
    const events = [];
    const onZoom = () => events.push('zoom'), onSettled = () => events.push('settled');
    window.addEventListener(SURFACE.Na__LeSurface__ZOOM_EVENT, onZoom);
    if (SURFACE.Na__LeSurface__ZOOM_SETTLED_EVENT) window.addEventListener(SURFACE.Na__LeSurface__ZOOM_SETTLED_EVENT, onSettled);
    const paper = SURFACE.Na__LeSurface__GetElements().paper;
    const out = { hasGesture : typeof SURFACE.Na__LeSurface__NoteZoomGesture === 'function' };
    SURFACE.Na__LeSurface__SetZoom(1.1);
    out.single = events.slice(); events.length = 0;
    if (out.hasGesture) {
      for (const z of [ 1.2, 1.3, 1.4, 1.5 ]) { SURFACE.Na__LeSurface__NoteZoomGesture(); SURFACE.Na__LeSurface__SetZoom(z); await sleep(40); }
      out.duringClass = paper.classList.contains('na-le-paper--zooming');
      out.during = events.slice();
      await sleep(CFG.Na__LeCfg__GetNavigationSetup().zoomSettleMs + 150);
      out.afterClass = paper.classList.contains('na-le-paper--zooming');
      out.after = events.slice();
    }
    window.removeEventListener(SURFACE.Na__LeSurface__ZOOM_EVENT, onZoom);
    if (SURFACE.Na__LeSurface__ZOOM_SETTLED_EVENT) window.removeEventListener(SURFACE.Na__LeSurface__ZOOM_SETTLED_EVENT, onSettled);
    return out;
  });

  // 7. VECTOR QUALITY through the surface: Medium holds while redraws come and lets go; High never; Low from Ready
  await step('vectorQuality', async () => {
    const s = synthetic([ 'Text', 'Dimensions', 'Vectors', 'Viewports' ]);
    await show(s, 1);
    const held = () => document.body.classList.contains('na-le-vector-hold');
    const out = {};
    VQ.Na__LeVectorQ__Set('medium');
    out.mediumAtRest = held();
    let last = 0;
    for (let i = 0; i < 6; i++) { SURFACE.Na__LeSurface__Refresh('markup'); await frame(); last = performance.now(); out['mediumHeldAfterRedraw' + i] = held(); await sleep(400); }
    out.mediumWhileRedrawing = held();                                            // <-- 2.4 s of redraws 400 ms apart: never let go between them
    const frameWillChange = getComputedStyle(document.querySelector('.na-le-frame--2d')).willChange;
    out.frameWillChangeWhileHeld = frameWillChange;
    await sleep(Math.max(0, 1000 - (performance.now() - last)));
    out.mediumAt1000msAfterLast = held();
    await sleep(Math.max(0, 1450 - (performance.now() - last)));
    out.mediumAt1450msAfterLast = held();
    await shoot('synthetic__rest__medium');
    VQ.Na__LeVectorQ__Set('high');
    for (let i = 0; i < 3; i++) { SURFACE.Na__LeSurface__Refresh('markup'); await frame(); out['highHeldAfterRedraw' + i] = held(); await sleep(100); }
    out.highWhileRedrawing = held();
    await sleep(1400);
    await shoot('synthetic__rest__high');
    VQ.Na__LeVectorQ__Set('low');                                                 // <-- remembered in this browser
    document.body.classList.remove('na-le-vector-hold');                          // <-- as a fresh page would start
    SURFACE.Na__LeSurface__Mount(stage, { editable : true });                     // <-- Ready runs on mount
    out.lowFromReady = held();
    VQ.Na__LeVectorQ__Set('high');
    out.highAfter = held();
    await show(s, 1);
    return out;
  });

  R.done = true;
  document.getElementById('out').textContent += '\ndone';
})().catch((e) => { R.errors.push('top: ' + (e && e.stack || e)); R.done = true; });
</script></body></html>`;

// -----------------------------------------------------------------------------
// Run each scenario in its own page
// -----------------------------------------------------------------------------
const browser = await chromium.launch();
const summary = {};
for (const scenario of SCENARIOS) {
    const overlay = OVERLAYS[scenario] || {};
    const context = await browser.newContext({ viewport : { width : 1800, height : 1300 }, deviceScaleFactor : 1 });
    const aborted = [], served = new Set(), consoleLines = [];
    await context.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith(AD04)) {
            const name = decodeURIComponent(url.slice(AD04.length).split('?')[0]);
            try { return route.fulfill({ status : 200, headers : { 'content-type' : 'font/ttf', 'access-control-allow-origin' : '*' }, body : ad04(name) }); }
            catch (e) { return route.fulfill({ status : 404, body : '' }); }
        }
        if (url.split('?')[0] === INDEXURL) return route.fulfill({ status : 200, headers : { 'content-type' : 'application/json', 'access-control-allow-origin' : '*' }, body : JSON.stringify({ projects : [] }) });
        if (!url.startsWith(HOST + '/')) { aborted.push(url); return route.abort(); }
        const path = decodeURIComponent(url.slice(HOST.length).split('?')[0].split('#')[0]);
        if (path === APP + '__w128__.html') return route.fulfill({ status : 200, headers : { 'content-type' : TYPES['.html'] }, body : PAGE });
        if (path.startsWith(APP)) {
            const rel = path.slice(APP.length);
            served.add(rel);
            if (STUBS[rel]) return route.fulfill({ status : 200, headers : { 'content-type' : TYPES['.js'] }, body : STUBS[rel] });
            if (overlay[rel]) return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(rel)] || 'application/octet-stream' }, body : readFileSync(overlay[rel]) });
        }
        if (route.request().method() !== 'GET') { aborted.push('NON-GET ' + url); return route.abort(); }
        const file = join(ROOT, ...path.split('/').filter(Boolean));
        if (existsSync(file) && statSync(file).isFile()) return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(file)] || 'application/octet-stream' }, body : readFileSync(file) });
        return route.fulfill({ status : 404, body : 'not found' });
    });
    const page = await context.newPage();
    page.on('console', (m) => consoleLines.push(m.type() + ': ' + m.text()));
    page.on('pageerror', (e) => consoleLines.push('pageerror: ' + e.message));
    await page.goto(HOST + APP + '__w128__.html?project=2026/57994__Harris__Scheme-02&scenario=' + scenario + (opt('--query') ? '&' + opt('--query') : ''));
    // SHOTS: the page asks for a picture of the paper and waits
    const shots = [];
    let finished = false;
    const started = Date.now();
    while (!finished && Date.now() - started < 300000) {
        const state = await page.evaluate(() => ({ shot : window.__W128shot || null, done : !!(window.__W128R && window.__W128R.done) }));
        if (state.shot) {
            const png = join(SCRATCH, 'png', scenario + '__' + state.shot + '.png');
            await page.locator('.na-le-paper').screenshot({ path : png, animations : 'disabled' });
            shots.push(png);
            await page.evaluate(() => { window.__W128shot = null; const done = window.__W128shotDone; window.__W128shotDone = null; if (done) done(); });
            continue;
        }
        if (state.done) { finished = true; break; }
        if (consoleLines.some((l) => l.startsWith('pageerror')) && Date.now() - started > 15000) break;   // <-- the module graph never linked
        await page.waitForTimeout(50);
    }
    if (!finished) { console.log('== ' + scenario + ': TIMEOUT; console:\n   ' + consoleLines.slice(-30).join('\n   ')); await context.close(); continue; }
    const R = await page.evaluate(() => window.__W128R);
    await context.close();
    // PDFs and their rasters out to disk; keep the JSON light
    for (const key of Object.keys(R)) {
        if (!key.startsWith('pdf__')) continue;
        const name = key.slice(5);
        writeFileSync(join(SCRATCH, 'pdf', scenario + '__' + name + '.pdf'), Buffer.from(R[key].pdf, 'base64'));
        writeFileSync(join(SCRATCH, 'png', scenario + '__pdf__' + name + '.png'), Buffer.from(R[key].png, 'base64'));
        R[key] = { width : R[key].width, height : R[key].height };
    }
    R.aborted = aborted; R.console = consoleLines; R.overlayFiles = Object.keys(overlay).length; R.shotFiles = shots;
    writeFileSync(join(SCRATCH, 'logs', 'browser__' + scenario + '.json'), JSON.stringify(R, null, 1));
    summary[scenario] = { steps : R.steps, errors : R.errors, aborted : aborted.length, consoleErrors : consoleLines.filter((l) => /^(error|pageerror)/.test(l)) };
    console.log('== ' + scenario + ': steps ' + R.steps.join(', ') + (R.errors.length ? '\n   ERRORS: ' + R.errors.join('\n   ') : '') +
                '\n   shots ' + shots.length + ', aborted ' + aborted.length + (aborted.length ? ' (' + [ ...new Set(aborted.map((u) => u.split('/').slice(0, 3).join('/'))) ].join(', ') + ')' : '') +
                '\n   console errors: ' + (summary[scenario].consoleErrors.join(' | ') || 'none'));
}
await browser.close();
