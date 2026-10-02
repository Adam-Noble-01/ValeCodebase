// W0-16 scratch: run the browser harnesses headless, with every request answered from disk.
//
// No server is started: a headless Chromium (Playwright, from the npx cache already on this machine)
// asks for http://vv.test/<path> and the route handler below answers from D:\10_CoreLib__ValeCodebase\<path>,
// the layout the test pages document ("serve the ValeCodebase ROOT"). Any other host is aborted, so
// nothing leaves the machine. Read-only on the tree. Results: harness_results.json beside this file.
//
// Usage: node run_harnesses.mjs [playwright module path]

import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require   = createRequire(import.meta.url);
const PW_PATH   = process.argv[2] || 'C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(PW_PATH);

const ROOT    = 'D:\\10_CoreLib__ValeCodebase';
const HOST    = 'http://vv.test';
const APP     = '/WebApps/ValeVision3D/';
const SCRATCH = dirname(fileURLToPath(import.meta.url));
const VIRTUAL = { [APP + '__W0_16__ClassicPdfHarness__.html'] : join(SCRATCH, 'classic_pdf_harness.html'),
                  [APP + '__W0_16__VendorLoadHarness__.html'] : join(SCRATCH, 'vendor_load_harness.html') };

// Image Export's hand-over, as Na__UiFeature__ImageExport__Controls.js does it (:618-631): the opener
// holds the rendered picture on window.__Na__PageLayout__PendingImage and opens the legacy layout page,
// which reads it, loads its title block and posts Na__PageLayout__Ready back.
const OPENER_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>W0-16 opener</title></head><body>
<script>
window.__ready = false;
window.addEventListener('message', (e) => { if (e.data && e.data.type === 'Na__PageLayout__Ready') window.__ready = true; });
const c = document.createElement('canvas'); c.width = 1600; c.height = 900;
const g = c.getContext('2d'); g.fillStyle = '#c8d2dc'; g.fillRect(0, 0, 1600, 900); g.fillStyle = '#2b3440'; g.fillRect(200, 150, 1200, 600);
window.__Na__PageLayout__PendingImage = { dataUrl : c.toDataURL('image/png'), width : 1600, height : 900, aspectRatio : '16:9' };
window.__popup = window.open(new URL('./02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html', window.location.href).href, '_blank');
</script></body></html>`;
const VIRTUAL_TEXT = { [APP + '__W0_16__ImageExportOpener__.html'] : OPENER_HTML };

const TYPES = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png', '.svg' : 'image/svg+xml',
                '.webp' : 'image/webp', '.jpg' : 'image/jpeg', '.ttf' : 'font/ttf', '.woff2' : 'font/woff2', '.glb' : 'model/gltf-binary',
                '.hdr' : 'application/octet-stream', '.pdf' : 'application/pdf', '.md' : 'text/markdown; charset=utf-8' };

async function runPage(browser, path, done, timeoutMs) {
    const context  = await browser.newContext();
    const requests = [];
    await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== HOST) { requests.push({ url : url.href, status : 'aborted (off-machine)' }); return route.abort(); }
        const pathname = decodeURIComponent(url.pathname);
        if (VIRTUAL_TEXT[pathname]) {
            requests.push({ url : pathname, status : 200 });
            return route.fulfill({ status : 200, headers : { 'content-type' : 'text/html; charset=utf-8' }, body : VIRTUAL_TEXT[pathname] });
        }
        const file = VIRTUAL[pathname] || join(ROOT, pathname.replace(/\//g, '\\'));
        if (existsSync(file) && statSync(file).isFile()) {
            requests.push({ url : pathname, status : 200 });
            return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(file).toLowerCase()] || 'application/octet-stream' }, body : readFileSync(file) });
        }
        requests.push({ url : pathname, status : 404 });
        return route.fulfill({ status : 404, body : 'not found' });
    });
    const page    = await context.newPage();
    const console_ = [];
    page.on('console', (msg) => console_.push(msg.type() + ': ' + msg.text()));
    page.on('pageerror', (err) => console_.push('pageerror: ' + err.message));
    page.on('dialog', (dialog) => { console_.push('dialog: ' + dialog.message()); dialog.dismiss().catch(() => {}); });
    let finished = true, error = null, popup = null;
    context.on('page', (p) => {
        popup = p;
        p.on('console', (msg) => console_.push('popup ' + msg.type() + ': ' + msg.text()));
        p.on('pageerror', (err) => console_.push('popup pageerror: ' + err.message));
    });
    try {
        await page.goto(HOST + path, { waitUntil : 'load', timeout : timeoutMs });
        await page.waitForFunction(done, null, { timeout : timeoutMs, polling : 250 });
    } catch (e) { finished = false; error = String(e.message || e).split('\n')[0]; }
    let popupState = null;
    if (popup) {
        popupState = await popup.evaluate(() => ({ url : location.pathname, jsPdf : !!(window.jspdf && window.jspdf.jsPDF),
            errorOverlayShown : Array.from(document.querySelectorAll('[class*="error"]')).some((n) => getComputedStyle(n).display !== 'none' && n.offsetParent !== null) }))
            .catch((e) => ({ evalError : String(e) }));
    }
    const out = await page.evaluate(() => {
        const node = document.getElementById('out');
        return { text : node ? node.textContent : null, w016 : window.__W0_16 || null, testResult : window.__TEST_RESULT || null,
                 jsPdf : !!(window.jspdf && window.jspdf.jsPDF), scripts : Array.from(document.scripts).map((s) => s.src).filter(Boolean) };
    }).catch((e) => ({ evalError : String(e) }));
    await context.close();
    return { path, finished, error, out, popup : popupState, requests, console : console_ };
}

const browser = await chromium.launch({ headless : true });
const results = {};
try {
    results.specificationPdf = await runPage(browser, APP + '80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html',
        () => { const t = (document.getElementById('out') || {}).textContent || ''; return t.indexOf('DONE') !== -1 || t.indexOf('ERROR') !== -1; }, 90000);
    results.titleBlockCells = await runPage(browser, APP + '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html',
        () => !!window.__TEST_RESULT || ((document.getElementById('out') || {}).textContent || '').indexOf('ERROR') !== -1, 90000);
    results.classicPdf = await runPage(browser, APP + '__W0_16__ClassicPdfHarness__.html',
        () => !!window.__W0_16, 120000);
    results.legacyPageLayout = await runPage(browser, APP + '02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html',
        () => document.readyState === 'complete', 30000);
    results.legacyPageLayout.note = 'opened bare: no picture on window.opener, so the page stops before its title block (expected)';
    results.imageExportHandOver = await runPage(browser, APP + '__W0_16__ImageExportOpener__.html',
        () => window.__ready === true, 60000);
    results.vendorLoad = await runPage(browser, APP + '__W0_16__VendorLoadHarness__.html',
        () => !!window.__W0_16, 90000);
} finally {
    await browser.close();
}

writeFileSync(join(SCRATCH, 'harness_results.json'), JSON.stringify(results, null, 2));

// SUMMARY
const summary = [];
const jsPdfOf  = (r) => r.requests.filter((q) => /jspdf\.umd\.js$/.test(q.url));
const scanOf   = (r) => r.requests.filter((q) => /TitleBlock__ClassicScan__A3__\.png$|PageLayoutSystem__TitleBlock__A3__\.png$/.test(q.url));
const n404     = (r) => r.requests.filter((q) => q.status === 404);
const has35    = (r) => r.requests.filter((q) => q.url.indexOf('35__System__PageLayoutSystem') !== -1);
for (const [name, r] of Object.entries(results)) {
    summary.push('== ' + name + '  finished=' + r.finished + (r.error ? '  error=' + r.error : ''));
    summary.push('   jsPDF requests : ' + JSON.stringify(jsPdfOf(r)));
    summary.push('   scan requests  : ' + JSON.stringify(scanOf(r)));
    const v67 = r.requests.filter((q) => /06__Vendor__Html2Canvas|07__Vendor__PdfJs/.test(q.url));
    if (v67.length) summary.push('   06/07 requests : ' + JSON.stringify(v67));
    summary.push('   35 requests    : ' + has35(r).length + '   404s: ' + JSON.stringify(n404(r).map((q) => q.url)));
    summary.push('   window.jspdf   : ' + (r.out && r.out.jsPdf) + (r.popup ? '   popup: ' + JSON.stringify(r.popup) : ''));
    if (r.out && r.out.text) summary.push('   out: ' + r.out.text.split('\n').join('\n        '));
    const errs = r.console.filter((c) => /^(error|pageerror)/.test(c));
    if (errs.length) summary.push('   console errors: ' + errs.join(' | '));
}
console.log(summary.join('\n'));
