// W1 integrator gate (continuation, extra check): run this app's three PDF harness pages headless, the way their
// USAGE says ("serve the ValeCodebase root"), with nothing leaving the machine and no server touched:
//   Na__Test__SpecificationPdf__.html   (W0-16's page; now drives W1-25's SpecPdf 1.0.0 and PdfFonts 1.0.0)
//   Na__Test__TitleBlockCells__.html    (W1-22 changed it: nine sheets, the Document ID fixture)
//   Na__Test__TitleBlockScaleCell__.html (W1-26 ported it: six sheets)
// A headless Chromium (Playwright from the npx cache) asks for http://vv.test/<path>; GETs are answered from
// D:\10_CoreLib__ValeCodebase\<path>. The configured font host (www.noble-architecture.com/assets/AD04_...) is
// answered IN MEMORY from the same four AD04 cuts in the NaWeb repository at the pin (git show b2aa9151:assets/...,
// byte-identical to the host's files - W1-25 / W1-26 records), so PdfFonts can embed Open Sans exactly as the app
// does; every other host and every non-GET request is aborted and recorded. Read-only. Results:
// html_pages_c2_results.json beside this file.
//
// Usage: node run_html_pages_c2.mjs [playwright module path]

import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const PW_PATH = process.argv[2] || 'C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(PW_PATH);

const ROOT    = 'D:\\10_CoreLib__ValeCodebase';
const NAWEB   = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const PIN     = 'b2aa9151';
const AD04    = 'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/';
const HOST    = 'http://vv.test';
const APP     = '/WebApps/ValeVision3D/';
const SCRATCH = dirname(fileURLToPath(import.meta.url));
const TYPES   = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                  '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png', '.svg' : 'image/svg+xml',
                  '.webp' : 'image/webp', '.jpg' : 'image/jpeg', '.ttf' : 'font/ttf', '.woff2' : 'font/woff2', '.pdf' : 'application/pdf' };
const ttf = new Map();

async function runPage(browser, path, done, timeoutMs) {
    const context  = await browser.newContext({ serviceWorkers : 'block' });
    const requests = [];
    await context.route('**/*', async (route) => {
        const req = route.request();
        const href = req.url();
        const url = new URL(href);
        if (req.method() !== 'GET' && req.method() !== 'HEAD') { requests.push({ url : href, status : 'aborted (non-GET)' }); return route.abort(); }
        if (href.startsWith(AD04)) {
            const name = decodeURIComponent(href.slice(AD04.length).split('?')[0]);
            if (!/^AD04_0[1-4]_-_Standard-Font_-_Open-Sans-[A-Za-z]+\.ttf$/.test(name)) { requests.push({ url : href, status : 'aborted (unknown font)' }); return route.abort(); }
            if (!ttf.has(name)) ttf.set(name, execFileSync('git', [ '-C', NAWEB, 'show', PIN + ':assets/AD04_-_LIBR_-_Common_-_Front-Files/' + name ], { maxBuffer : 1 << 26 }));
            requests.push({ url : href, status : 'font from the pin' });
            return route.fulfill({ status : 200, headers : { 'content-type' : 'font/ttf', 'access-control-allow-origin' : '*' }, body : ttf.get(name) });
        }
        if (url.origin !== HOST) { requests.push({ url : href, status : 'aborted (off-machine)' }); return route.abort(); }
        const pathname = decodeURIComponent(url.pathname);
        const file = join(ROOT, pathname.replace(/\//g, '\\'));
        if (existsSync(file) && statSync(file).isFile()) {
            requests.push({ url : pathname, status : 200 });
            return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(file).toLowerCase()] || 'application/octet-stream' }, body : readFileSync(file) });
        }
        requests.push({ url : pathname, status : 404 });
        return route.fulfill({ status : 404, body : 'not found' });
    });
    const page = await context.newPage();
    const log  = [];
    page.on('console', (msg) => log.push(msg.type() + ': ' + msg.text()));
    page.on('pageerror', (err) => log.push('pageerror: ' + err.message));
    page.on('dialog', (dialog) => { log.push('dialog: ' + dialog.message()); dialog.dismiss().catch(() => {}); });
    let finished = true, error = null;
    try {
        await page.goto(HOST + path, { waitUntil : 'load', timeout : timeoutMs });
        await page.waitForFunction(done, null, { timeout : timeoutMs, polling : 250 });
    } catch (e) { finished = false; error = String(e.message || e).split('\n')[0]; }
    await page.waitForTimeout(1500);
    const out = await page.evaluate(() => {
        const node = document.getElementById('out');
        const tr = window.__TEST_RESULT;
        return { text : node ? node.textContent : null, testResult : tr === undefined ? null : (typeof tr === 'string' ? tr : JSON.stringify(tr).slice(0, 4000)),
                 jsPdf : !!(window.jspdf && window.jspdf.jsPDF) };
    }).catch((e) => ({ evalError : String(e) }));
    await context.close();
    return { path, finished, error, out, requests, console : log };
}

const browser = await chromium.launch({ headless : true });
const results = {};
const T = APP + '80__Testing__PrototypeEnvironment/';
const doneOut = (word) => new Function('return (((document.getElementById("out") || {}).textContent || "").indexOf(' + JSON.stringify(word) + ') !== -1) || (((document.getElementById("out") || {}).textContent || "").indexOf("ERROR") !== -1);');
try {
    results.specificationPdf    = await runPage(browser, T + 'Na__Test__SpecificationPdf__.html', doneOut('DONE'), 120000);
    results.titleBlockCells     = await runPage(browser, T + 'Na__Test__TitleBlockCells__.html', () => !!window.__TEST_RESULT || ((document.getElementById('out') || {}).textContent || '').indexOf('ERROR') !== -1, 120000);
    results.titleBlockScaleCell = await runPage(browser, T + 'Na__Test__TitleBlockScaleCell__.html', () => !!window.__TEST_RESULT || ((document.getElementById('out') || {}).textContent || '').indexOf('ERROR') !== -1, 120000);
} finally {
    await browser.close();
}
writeFileSync(join(SCRATCH, 'html_pages_c2_results.json'), JSON.stringify(results, null, 2));

for (const [name, r] of Object.entries(results)) {
    const n404 = r.requests.filter((q) => q.status === 404).map((q) => q.url);
    const off  = r.requests.filter((q) => String(q.status).indexOf('aborted') === 0).map((q) => q.url);
    const fonts = r.requests.filter((q) => q.status === 'font from the pin').map((q) => q.url.slice(AD04.length));
    console.log('== ' + name + '  finished=' + r.finished + (r.error ? '  error=' + r.error : '') + '  requests=' + r.requests.length
                + '  404s=' + JSON.stringify(n404) + '  aborted=' + JSON.stringify(off) + '  fonts=' + JSON.stringify(fonts));
    const text = (r.out && r.out.text) || '';
    const lines = text.split('\n').filter((l) => l.trim());
    console.log('   out (last 5 lines): ' + lines.slice(-5).join(' | '));
    const errs = r.console.filter((c) => /^(error|pageerror|warning)/.test(c));
    if (errs.length) console.log('   console errors / warnings: ' + errs.join(' | '));
}
