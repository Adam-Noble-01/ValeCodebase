// =============================================================================
// W1-25 scratch harness - the real app modules in headless Chromium (not shipped)
// =============================================================================
// No server is started (W0-16's method): Playwright's Chromium asks for
// http://vv.test/<path> and the route below answers from D:\10_CoreLib__ValeCodebase\<path>.
// The configured font host, https://www.noble-architecture.com/assets/AD04_..., is answered
// from the same files in the NaWeb repository at b2aa9151 (the site's own source, the same
// bytes the live host serves - HEAD-checked 02-Oct: 200, font/ttf, ACAO *), with the live
// host's CORS header. Every other off-machine request is aborted and listed. Read-only on
// the tree. Nothing is downloaded: the PDFs are built in memory and handed back as base64.
//
//   node w1_25_browser.mjs <scenario> [...]     scenarios: live, preview, control
//     live     the tree as it stands
//     preview  the tree with SheetChrome answered by TrueVision's 1.14.0 at the pin
//              (what W1-26 lands), to show the PDFs once the chrome chooses Open Sans
//     control  the tree with this package's pre-images of Fonts.css, SpecPdf and
//              SpecDocument (what was there before W1-25)
//   Each scenario runs the repository's Na__Test__SpecificationPdf__.html and this
//   package's harness page; results in logs/browser__<scenario>.json, PDFs in pdf/.
// =============================================================================

import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require   = createRequire(import.meta.url);
const PW_PATH   = 'C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(PW_PATH);

const ROOT     = 'D:\\10_CoreLib__ValeCodebase';
const NAWEB    = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const PIN      = 'b2aa9151';
const HOST     = 'http://vv.test';
const APP      = '/WebApps/ValeVision3D/';
const FONTHOST = 'https://www.noble-architecture.com';
const AD04     = '/assets/AD04_-_LIBR_-_Common_-_Front-Files/';
const SCRATCH  = dirname(fileURLToPath(import.meta.url));
const LE       = APP + '02__Src__AppModules/51__System__LayoutEditor/';
for (const d of [ 'pdf', 'logs' ]) if (!existsSync(join(SCRATCH, d))) mkdirSync(join(SCRATCH, d));

const TYPES = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png', '.svg' : 'image/svg+xml',
                '.webp' : 'image/webp', '.jpg' : 'image/jpeg', '.ttf' : 'font/ttf', '.woff2' : 'font/woff2' };

const git = (spec) => execFileSync('git', [ '-C', NAWEB, 'show', spec ], { maxBuffer : 64 * 1024 * 1024 });
const tvApp = (rel) => git(PIN + ':na-apps/30__TrueVision__CoreAppCode/' + rel);

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
} }, null, 1);

const HARNESS = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>W1-25 harness</title>
<link rel="stylesheet" href="./03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css">
<link rel="stylesheet" href="./02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css">
<link rel="stylesheet" href="./02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css">
<style>
  .w125-ref { font-family : 'Open Sans', sans-serif; font-size : 40px; white-space : nowrap; display : inline-block; }
  #probes { position : absolute; top : 0; left : 0; }
  .w125-probe-host .na-toast { opacity : 1; }
</style>
<script type="importmap">${IMPORTMAP}</script>
<script>
  // Every fetch() the modules make, in order, so a step can say which fetches it caused
  window.__W125Fetches = [];
  (function () { const real = window.fetch.bind(window); window.fetch = function (url, init) { window.__W125Fetches.push(String(url && url.url ? url.url : url)); return real(url, init); }; })();
</script>
<script src="./04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js"></script>
</head><body>
<div id="probes" class="w125-probe-host">
  <div><span class="w125-ref" id="ref400" style="font-weight:400">Toast saved - Medium heading 0123</span></div>
  <div><span class="w125-ref" id="ref500" style="font-weight:500">Toast saved - Medium heading 0123</span></div>
  <div><span class="w125-ref" id="ref600" style="font-weight:600">Toast saved - Medium heading 0123</span></div>
  <div class="na-toast is-visible" id="probeToast">Camera settings saved</div>
  <div class="na-dropdown-menu"><span class="na-dropdown-menu__value-unit" id="probeUnit">mm</span></div>
  <div class="camera-lens-label" id="probeLens">Lens 35 mm</div>
</div>
<div class="na-le-spec__desk" id="desk"></div>
<pre id="out">running...</pre>
<script type="module">
import './02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
import { Na__LeCfg__Ready, Na__LeCfg__GetStyleSetup, Na__LeCfg__GetPdfSetup, Na__LeCfg__GetTitleBlockSetup } from './02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js';
const out = [];
const say = (line) => { out.push(line); document.getElementById('out').textContent = out.join('\\n'); };
const b64 = (ab) => { const u = new Uint8Array(ab); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const R = window.__W125 = { steps : [] };
(async () => {
  try {
    // 1. FONTS - the screen faces
    await document.fonts.ready;
    const before = document.fonts.check('500 1em "Open Sans"');
    await document.fonts.load('500 1em "Open Sans"');
    await document.fonts.load('400 1em "Open Sans"');
    await document.fonts.load('600 1em "Open Sans"');
    await document.fonts.ready;
    R.fonts = {
      checkBeforeLoad : before,
      check500 : document.fonts.check('500 1em "Open Sans"'),
      faces : Array.from(document.fonts).filter((f) => /Open Sans/.test(f.family)).map((f) => ({ weight : String(f.weight), status : f.status, style : f.style })),
      widths : { w400 : document.getElementById('ref400').getBoundingClientRect().width, w500 : document.getElementById('ref500').getBoundingClientRect().width, w600 : document.getElementById('ref600').getBoundingClientRect().width },
      computed : [ 'probeToast', 'probeUnit', 'probeLens' ].map((id) => { const cs = getComputedStyle(document.getElementById(id)); return { id, weight : cs.fontWeight, family : cs.fontFamily }; })
    };
    R.steps.push('fonts');

    // 2. CONFIG and the project, as the app has them: ?project= is the folder id, project.json registered with the facade
    await Na__LeCfg__Ready();
    const style = Na__LeCfg__GetStyleSetup();
    const pdfSetup = Na__LeCfg__GetPdfSetup();
    R.config = { styleFontFamily : style.fontFamily, pdfFontFamily : pdfSetup.fontFamily, fontBasePath : pdfSetup.fontBasePath, fontCdnBase : pdfSetup.fontCdnBase, fonts : pdfSetup.fonts };
    const SRC = './02__Src__AppModules/';

    // 2b. THE FIRST PDF CALL OF A SESSION - EnsureJsPdf, as the first drawing tab's PreloadMetrics makes it: which fetches does it cause
    const exporterFirst = await import(SRC + '51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js');
    const fontFetches = () => window.__W125Fetches.filter((u) => u.indexOf('/AD04_') !== -1);
    const beforeEnsure = fontFetches().length;
    await exporterFirst.Na__LePdf__EnsureJsPdf();
    R.ensureJsPdf = { fontFetchesBefore : beforeEnsure, fontFetchesCaused : fontFetches().slice(beforeEnsure).map((u) => u.split('/').pop()) };
    const facade   = await import(SRC + '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js');
    const drawData = await import(SRC + '40__System__DrawingViewCore/Na__DrawView__ProjectData__.js');
    const project  = await (await fetch('/WebApps/Whitecardopedia/Projects/2026/3047__Doous/project.json')).json();
    facade.Na__CfApi__SetLoadedProjectData(project);
    R.identity = { token : drawData.Na__DrawData__GetProjectCode(), documentCode : drawData.Na__DrawData__GetDocumentCode(), displayName : facade.Na__CfApi__GetProjectDisplayName() };

    // 3. THE SPECIFICATION - loaded the way the transport loads it (its own code = the token)
    const SPEC = SRC + '51__System__LayoutEditor/50__Feature__Specification/';
    const specState = await import(SPEC + 'Na__LayoutEditor__SpecData__State__.js');
    const specDoc   = await import(SPEC + 'Na__LayoutEditor__SpecData__Document__.js');
    const specData  = await import(SPEC + 'Na__LayoutEditor__SpecData__.js');
    const specPdf   = await import(SPEC + 'Na__LayoutEditor__SpecPdf__.js');
    const specPages = await import(SPEC + 'Na__LayoutEditor__SpecDocument__.js');
    const raw = await (await fetch('/WebApps/Whitecardopedia/Projects/2026/3047__Doous/ValeVision__DrawingNotes__.json')).json();
    specState.Na__LeSpec__SetProjectCode(drawData.Na__DrawData__GetProjectCode());
    specState.Na__LeSpec__SetDoc(specDoc.Na__LeSpec__Normalise(raw));
    specState.Na__LeSpec__SetStatus(specState.Na__LeSpec__STATUS_READY);
    specState.Na__LeSpec__SetEditable(true);
    specData.Na__LeSpec__SetRevision('B');
    const built = await specPdf.Na__LeSpecPdf__BuildDocument();
    R.spec = { filename : specPdf.Na__LeSpecPdf__Filename(), pages : built.pages, fontList : built.doc.getFontList().OpenSans || null,
               pdf : b64(built.doc.output('arraybuffer')) };
    R.steps.push('spec pdf');

    // 4. THE READING MODE'S PAGES (SpecDocument): the first page's facts and running head
    const desk = document.getElementById('desk');
    const laid = specPages.Na__LeSpecDoc__Render(desk);
    const first = desk.querySelector('.na-le-spec-sheet');
    R.specDoc = { pages : laid.pages,
      meta : Array.from(desk.querySelectorAll('.na-le-spec-doc__meta-item')).map((item) => [ item.querySelector('dt').textContent, item.querySelector('dd').textContent ]),
      project : (desk.querySelector('.na-le-spec-doc__project') || {}).textContent || '',
      running : first ? first.querySelector('.na-le-spec-sheet__running').getAttribute('data-na-spec-paint') : null,
      issue   : first ? first.querySelector('.na-le-spec-sheet__issue').getAttribute('data-na-spec-paint') : null,
      font    : getComputedStyle(desk).getPropertyValue('--na-spec-font') };
    R.steps.push('spec document');

    // 5. A SHEET - Download PDF's own builder on a sheet of the title-block test's shape
    const chrome   = await import(SRC + '51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js');
    const exporter = await import(SRC + '51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js');
    await chrome.Na__LeChrome__LoadAsset(Na__LeCfg__GetTitleBlockSetup().logoAssetPath);
    const sheet = {
      Sheet__Id : 'Sheet_W125', Sheet__Name : 'D02 - Proposed Elevations', Sheet__Order : 2, Sheet__PaperSize : 'A3', Sheet__Orientation : 'landscape',
      Sheet__TitleBlockStyle : 'modern', Sheet__CommonFields : false,
      Sheet__Fields : { Sheet__Fields__Client : 'Mr & Mrs Doous', Sheet__Fields__SiteAddress : 'The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE',
                        Sheet__Fields__Title : 'Proposed Orangery - Elevations', Sheet__Fields__DocumentId : '3047_D02', Sheet__Fields__Revision : 'B', Sheet__Fields__Status : 'FOR PLANNING' },
      Sheet__Layers : [], Sheet__Viewports : [], Sheet__Annotations : [], Sheet__Dimensions : [], Sheet__Shapes : [], Sheet__Leaders : [], Sheet__Groups : []
    };
    const sheetBuilt = await exporter.Na__LePdf__BuildDocument(sheet);
    R.sheet = { filename : sheetBuilt.filename, fontList : sheetBuilt.doc.getFontList().OpenSans || null, pdf : b64(sheetBuilt.doc.output('arraybuffer')) };
    R.steps.push('sheet pdf');
    say('DONE');
  } catch (error) {
    R.error = String(error && error.stack || error);
    say('ERROR: ' + R.error);
  }
  R.done = true;
})();
</script></body></html>`;

// -----------------------------------------------------------------------------
// One page in a fresh context, every request answered from disk, the pin or not at all
// -----------------------------------------------------------------------------
async function runPage(browser, path, overrides, done, collect, timeoutMs) {
    const context  = await browser.newContext({ viewport : { width : 1400, height : 1000 } });
    const requests = [];
    await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === FONTHOST && url.pathname.startsWith(AD04)) {
            const name  = decodeURIComponent(url.pathname.slice(AD04.length));
            const bytes = git(PIN + ':assets/AD04_-_LIBR_-_Common_-_Front-Files/' + name);
            requests.push({ url : url.href, status : 200, answered : 'configured font host (bytes from the NaWeb repository at ' + PIN + ')', type : route.request().resourceType() });
            return route.fulfill({ status : 200, headers : { 'content-type' : 'font/ttf', 'access-control-allow-origin' : '*' }, body : bytes });
        }
        if (url.origin !== HOST) { requests.push({ url : url.href, status : 'aborted (off-machine)', type : route.request().resourceType() }); return route.abort(); }
        const pathname = decodeURIComponent(url.pathname);
        if (overrides[pathname]) {
            requests.push({ url : pathname, status : 200, answered : overrides[pathname].label });
            return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(pathname).toLowerCase()] || 'application/octet-stream' }, body : overrides[pathname].body });
        }
        const file = join(ROOT, pathname.replace(/\//g, '\\'));
        if (existsSync(file) && statSync(file).isFile()) {
            requests.push({ url : pathname, status : 200 });
            return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(file).toLowerCase()] || 'application/octet-stream' }, body : readFileSync(file) });
        }
        requests.push({ url : pathname, status : 404 });
        return route.fulfill({ status : 404, body : 'not found' });
    });
    const page = await context.newPage();
    const consoleLines = [];
    page.on('console', (msg) => consoleLines.push(msg.type() + ': ' + msg.text()));
    page.on('pageerror', (err) => consoleLines.push('pageerror: ' + err.message));
    let finished = true, error = null, result = null;
    try {
        await page.goto(HOST + path, { waitUntil : 'load', timeout : timeoutMs });
        await page.waitForFunction(done, null, { timeout : timeoutMs, polling : 250 });
        result = await collect(page);
    } catch (e) { finished = false; error = String(e.message || e).split('\n')[0]; }
    await context.close();
    return { path, finished, error, result, requests, console : consoleLines };
}

// The face Chromium actually used for an element's text (DevTools: CSS.getPlatformFontsForNode)
async function platformFonts(page, selectors) {
    const client = await page.context().newCDPSession(page);
    await client.send('DOM.enable');
    await client.send('CSS.enable');
    const { root } = await client.send('DOM.getDocument', { depth : -1 });
    const outFonts = {};
    for (const sel of selectors) {
        const { nodeId } = await client.send('DOM.querySelector', { nodeId : root.nodeId, selector : sel });
        if (!nodeId) { outFonts[sel] = null; continue; }
        const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId });
        outFonts[sel] = fonts;
    }
    return outFonts;
}

function overridesFor(scenario) {
    const o = {};
    if (scenario === 'preview') {
        o[LE + '10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js'] = { label : 'TrueVision SheetChrome 1.14.0 at ' + PIN + ' (what W1-26 lands)',
            body : tvApp('02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js') };
    }
    // MUTANTS - each takes one W1-25 line out of a live file, to prove the checks bite
    const mutate = (rel, from, to, label) => {
        const text = readFileSync(join(ROOT, (APP + rel).replace(/\//g, '\\')), 'utf8');
        if (text.split(from).length !== 2) throw new Error('mutant anchor not found once: ' + label);
        o[APP + rel] = { label : 'MUTANT ' + label, body : Buffer.from(text.replace(from, to), 'utf8') };
    };
    const EXPORTER = '02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js';
    const SPECPDF  = '02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js';
    if (scenario === 'mutant-exporter-install') mutate(EXPORTER, '        Na__LePdfFonts__Install(doc);', '        // (mutant) no Install', 'exporter without Install(doc)');
    if (scenario === 'mutant-exporter-ensure')  mutate(EXPORTER, '        await Na__LePdfFonts__EnsureLoaded();', '        // (mutant) no EnsureLoaded', 'EnsureJsPdf without EnsureLoaded');
    if (scenario === 'mutant-specpdf-install')  mutate(SPECPDF, '        Na__LePdfFonts__Install(doc);', '        // (mutant) no Install', 'SpecPdf without Install(doc)');
    if (scenario === 'mutant-specpdf-code')     mutate(SPECPDF, "Na__DrawData__GetDocumentCode() || '';", "(new URLSearchParams(location.search).get('project') || '');", 'SpecPdf reading the ?project= token');
    if (scenario === 'control') {
        const pre = (name) => readFileSync(join(SCRATCH, 'preimage', name));
        o[APP + '03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css'] = { label : 'pre-image (before W1-25)', body : pre('Na__CoreUi__Styles__Fonts__.css') };
        o[LE + '50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js'] = { label : 'pre-image (before W1-25)', body : pre('Na__LayoutEditor__SpecPdf__.js') };
        o[LE + '50__Feature__Specification/Na__LayoutEditor__SpecDocument__.js'] = { label : 'pre-image (before W1-25)', body : pre('Na__LayoutEditor__SpecDocument__.js') };
    }
    return o;
}

const browser = await chromium.launch({ headless : true });
try {
    for (const scenario of process.argv.slice(2)) {
        const overrides = overridesFor(scenario);
        const results = { scenario, overrides : Object.fromEntries(Object.entries(overrides).map(([ k, v ]) => [ k, v.label ])) };

        // A. The repository's own test page, re-run (Na__Test__SpecificationPdf__.html)
        results.specificationPdfPage = await runPage(browser, APP + '80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html', overrides,
            () => { const t = (document.getElementById('out') || {}).textContent || ''; return t.indexOf('DONE') !== -1 || t.indexOf('ERROR') !== -1; },
            async (page) => page.evaluate(async () => {
                const text = document.getElementById('out').textContent;
                let pdf = null;
                if (window.__SPEC_BLOB) {
                    const u = new Uint8Array(await window.__SPEC_BLOB.arrayBuffer()); let s = '';
                    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
                    pdf = btoa(s);
                }
                return { text, pdf };
            }), 120000);
        if (results.specificationPdfPage.result && results.specificationPdfPage.result.pdf) {
            writeFileSync(join(SCRATCH, 'pdf', 'w125rerun__' + scenario + '__specpage.pdf'), Buffer.from(results.specificationPdfPage.result.pdf, 'base64'));
            results.specificationPdfPage.result.pdf = '(written to pdf/w125rerun__' + scenario + '__specpage.pdf)';
        }

        // B. This package's harness page, opened as the gallery opens a project
        const harnessPath = APP + '__W1_25__Harness__.html';
        overrides[harnessPath] = { label : 'the W1-25 harness page', body : Buffer.from(HARNESS, 'utf8') };
        results.harness = await runPage(browser, harnessPath + '?project=' + encodeURIComponent('2026/3047__Doous'), overrides,
            () => !!(window.__W125 && window.__W125.done),
            async (page) => {
                const r = await page.evaluate(() => window.__W125);
                r.platformFonts = await platformFonts(page, [ '#probeToast', '#probeUnit', '#probeLens', '#ref400', '#ref500', '#ref600' ]);
                return r;
            }, 180000);
        const r = results.harness.result;
        if (r && r.spec && r.spec.pdf) { writeFileSync(join(SCRATCH, 'pdf', 'w125rerun__' + scenario + '__spec.pdf'), Buffer.from(r.spec.pdf, 'base64')); r.spec.pdf = '(pdf/w125rerun__' + scenario + '__spec.pdf)'; }
        if (r && r.sheet && r.sheet.pdf) { writeFileSync(join(SCRATCH, 'pdf', 'w125rerun__' + scenario + '__sheet.pdf'), Buffer.from(r.sheet.pdf, 'base64')); r.sheet.pdf = '(pdf/w125rerun__' + scenario + '__sheet.pdf)'; }

        writeFileSync(join(SCRATCH, 'logs', 'w125rerun__' + scenario + '.json'), JSON.stringify(results, null, 2));
        const fontReqs = (x) => x.requests.filter((q) => q.url.indexOf('noble-architecture.com') !== -1).map((q) => q.url.split('/').pop() + ' [' + (q.type || '') + ']');
        const offMachine = (x) => x.requests.filter((q) => q.status === 'aborted (off-machine)').map((q) => q.url);
        const n404 = (x) => x.requests.filter((q) => q.status === 404).map((q) => q.url);
        const errors = (x) => x.console.filter((c) => /^(error|pageerror)/.test(c));
        console.log('==== ' + scenario + ' ====');
        for (const [ name, x ] of [ [ 'Na__Test__SpecificationPdf__.html', results.specificationPdfPage ], [ 'harness', results.harness ] ]) {
            console.log('  ' + name + ': finished=' + x.finished + (x.error ? ' error=' + x.error : ''));
            console.log('    font requests : ' + JSON.stringify(fontReqs(x)));
            console.log('    off-machine   : ' + JSON.stringify(offMachine(x)) + '   404s: ' + JSON.stringify(n404(x)));
            if (errors(x).length) console.log('    console errors: ' + errors(x).join(' | ').slice(0, 1500));
            const warns = x.console.filter((c) => /^warning/.test(c));
            if (warns.length) console.log('    console warnings: ' + warns.join(' | ').slice(0, 1500));
        }
        if (results.specificationPdfPage.result) console.log('    spec page out:\n      ' + results.specificationPdfPage.result.text.split('\n').join('\n      '));
        if (r) {
            const show = Object.assign({}, r);
            console.log('    harness: ' + JSON.stringify(show, null, 1).split('\n').join('\n      '));
        }
    }
} finally {
    await browser.close();
}
