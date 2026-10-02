// W1 integrator gate (extra check): does every module this wave touched LINK and EVALUATE in a real browser, with
// this app's own import map and page DOM? G1 / G2 prove specifiers and named imports statically; this proves the
// modules instantiate (no missing export at link time, no throw at top level, no TDZ in an import cycle).
//
// No server is started or touched: a headless Chromium (Playwright from the npx cache) asks for http://vv.test/<path>
// and the route handler answers GETs from D:\10_CoreLib__ValeCodebase\<path>. Any other host, and any non-GET request,
// is aborted and recorded, so nothing leaves the machine and nothing is written anywhere. The page itself is VIRTUAL
// (never written to disk): this app's index.html with its PWA scripts and its boot module taken out (the 3D app is not
// started) and a sweep module put in their place, which import()s each module in turn and records the outcome.
// Results: link_sweep_c2_results.json beside this file. (Continuation gate copy: see adapt_link_sweep_c2.py.)
//
// Usage: node link_sweep.mjs [playwright module path]

import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const PW_PATH = process.argv[2] || 'C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(PW_PATH);

const ROOT    = 'D:\\10_CoreLib__ValeCodebase';
const HOST    = 'http://vv.test';
const APP     = '/WebApps/ValeVision3D/';
const PAGE    = APP + '__W1GATE__LinkSweep__.html';
const SCRATCH = dirname(fileURLToPath(import.meta.url));
const TYPES   = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                  '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png', '.svg' : 'image/svg+xml',
                  '.webp' : 'image/webp', '.jpg' : 'image/jpeg', '.ttf' : 'font/ttf', '.woff2' : 'font/woff2', '.woff' : 'font/woff', '.pdf' : 'application/pdf',
                  '.glb' : 'model/gltf-binary', '.wasm' : 'application/wasm' };

// ---- the module list: every W1-touched .js under 02__Src__AppModules, then the Layout Editor hubs the loader imports
const cross = JSON.parse(readFileSync(join(SCRATCH, 'crosscheck_c2.json'), 'utf8'));
const CONT = new Set(cross.filter((r) => r.touched_in_cont).map((r) => r.path.slice('WebApps/ValeVision3D/'.length)));
const w1 = cross.filter((r) => r.code !== ' D' && /\.js$/.test(r.path) && r.path.startsWith('WebApps/ValeVision3D/02__Src__AppModules/'))
                .map((r) => r.path.slice('WebApps/ValeVision3D/'.length));
const LE = '02__Src__AppModules/51__System__LayoutEditor/';
const hubs = [ '01__Core__Loader/Na__LayoutEditor__Loader__.js', '05__Core__ModeController/Na__LayoutEditor__ModeController__.js', '07__Core__SheetData/Na__LayoutEditor__SheetModel__.js',
               '50__Feature__Specification/Na__LayoutEditor__SpecData__.js', '03__Core__Config/Na__LayoutEditor__ConfigState__.js',
               '20__System__Viewports/Na__LayoutEditor__Viewport3d__.js', '60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js',
               '05__Core__ModeController/Na__LayoutEditor__TabStrip__.js', '70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js' ].map((p) => LE + p);
const modules = Array.from(new Set(hubs.concat(w1)));

// ---- the virtual page
const indexLines = readFileSync(join(ROOT, 'WebApps', 'ValeVision3D', 'index.html'), 'utf8').split('\n');
const keep = [];
let inBoot = false;
indexLines.forEach((line) => {
    if (/<script src="\.\.\/Whitecardopedia\/02__Src__AppModules\/62__Feature__AppInstallability\//.test(line)) return;   // PWA scripts out
    if (/<script type="module">/.test(line)) { inBoot = true; return; }                                                      // boot module out
    if (inBoot) { if (/<\/script>/.test(line)) inBoot = false; return; }
    keep.push(line);
});
const sweep = `<script type="module">
    const MODULES = ${JSON.stringify(modules)};
    const CONT = new Set(${JSON.stringify(Array.from(CONT))});
    window.__SWEEP = { current : null, results : [] };
    for (const p of MODULES) {
        window.__SWEEP.current = p;
        const t0 = performance.now();
        try { const ns = await import('./' + p); window.__SWEEP.results.push({ p, ok : true, cont : CONT.has(p), exports : Object.keys(ns).length, ms : Math.round(performance.now() - t0) }); }
        catch (e) { window.__SWEEP.results.push({ p, ok : false, cont : CONT.has(p), error : String(e && e.message || e), ms : Math.round(performance.now() - t0) }); }
    }
    window.__SWEEP.current = null;
    window.__SWEEP_DONE = true;
</script>`;
const bodyClose = keep.lastIndexOf(keep.find((l) => /<\/body>/.test(l)));
const html = keep.map((l, i) => (i === keep.findIndex((x) => /<\/body>/.test(x)) ? sweep + '\n' + l : l)).join('\n');

const browser = await chromium.launch({ headless : true });
const requests = [], log = [];
let result = null;
try {
    const context = await browser.newContext();
    await context.route('**/*', async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.origin !== HOST) { requests.push({ method : req.method(), url : url.href, status : 'aborted (off-machine)' }); return route.abort(); }
        if (req.method() !== 'GET' && req.method() !== 'HEAD') { requests.push({ method : req.method(), url : url.pathname, status : 'aborted (non-GET)' }); return route.abort(); }
        const pathname = decodeURIComponent(url.pathname);
        if (pathname === PAGE) { requests.push({ method : 'GET', url : pathname, status : 'virtual page' }); return route.fulfill({ status : 200, headers : { 'content-type' : TYPES['.html'] }, body : html }); }
        const file = join(ROOT, pathname.replace(/\//g, '\\'));
        if (existsSync(file) && statSync(file).isFile()) {
            requests.push({ method : 'GET', url : pathname, status : 200 });
            return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(file).toLowerCase()] || 'application/octet-stream' }, body : readFileSync(file) });
        }
        requests.push({ method : 'GET', url : pathname + url.search, status : 404 });
        return route.fulfill({ status : 404, headers : { 'content-type' : 'application/json' }, body : '{"error":"not found (gate sandbox)"}' });
    });
    const page = await context.newPage();
    page.on('console', (msg) => log.push({ type : msg.type(), text : msg.text() }));
    page.on('pageerror', (err) => log.push({ type : 'pageerror', text : err.message }));
    page.on('dialog', (dialog) => { log.push({ type : 'dialog', text : dialog.message() }); dialog.dismiss().catch(() => {}); });
    await page.goto(HOST + PAGE, { waitUntil : 'load', timeout : 120000 });
    await page.waitForFunction(() => window.__SWEEP_DONE === true, null, { timeout : 240000, polling : 250 }).catch((e) => log.push({ type : 'runner', text : 'timeout: ' + e.message.split('\n')[0] }));
    await page.waitForTimeout(3000);   // let late console lines and fetches settle
    result = await page.evaluate(() => window.__SWEEP);
    await context.close();
} finally {
    await browser.close();
}

const out = { page : PAGE, modules : modules.length, result, requests, console : log };
writeFileSync(join(SCRATCH, 'link_sweep_c2_results.json'), JSON.stringify(out, null, 2));
const ok = (result && result.results || []).filter((r) => r.ok), bad = (result && result.results || []).filter((r) => !r.ok);
const n404 = requests.filter((q) => q.status === 404), off = requests.filter((q) => String(q.status).indexOf('aborted') === 0);
console.log('link sweep: ' + modules.length + ' module(s) asked (' + ok.concat(bad).filter((r) => r.cont).length + ' touched in the continuation), ' + ok.length + ' linked and evaluated, ' + bad.length + ' failed' + (result && result.current ? ' (stuck at ' + result.current + ')' : ''));
bad.forEach((r) => console.log('  FAIL  ' + r.p + '  ' + r.error));
console.log('requests: ' + requests.length + ' (' + requests.filter((q) => q.status === 200).length + ' from disk, ' + n404.length + ' 404, ' + off.length + ' aborted)');
n404.forEach((q) => console.log('  404   ' + q.url));
off.forEach((q) => console.log('  ' + q.status + '  ' + q.method + ' ' + q.url));
const errs = log.filter((c) => c.type === 'error' || c.type === 'pageerror');
console.log('console errors / page errors: ' + errs.length + '; warnings: ' + log.filter((c) => c.type === 'warning').length + '; all console lines: ' + log.length);
errs.forEach((c) => console.log('  ' + c.type + ': ' + c.text.slice(0, 400)));
