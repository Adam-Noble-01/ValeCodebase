// W0 integrator gate: run VV's two browser harnesses headless, the way W0-16 did (scratch/W0-16/run_harnesses.mjs,
// trimmed to the two shipped harness pages). No server is started: a headless Chromium (Playwright, from the npx
// cache already on this machine) asks for http://vv.test/<path> and the route handler answers from
// D:\10_CoreLib__ValeCodebase\<path> - the "serve the ValeCodebase ROOT" layout the test pages document. Any other
// host is aborted, so nothing leaves the machine. Read-only on the tree. Results: html_harness_results.json beside
// this file.
//
// Usage: node run_html_harnesses.mjs [playwright module path]

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
const SCRATCH = dirname(fileURLToPath(import.meta.url));
const TYPES   = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                  '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png', '.svg' : 'image/svg+xml',
                  '.webp' : 'image/webp', '.jpg' : 'image/jpeg', '.ttf' : 'font/ttf', '.woff2' : 'font/woff2', '.pdf' : 'application/pdf' };

async function runPage(browser, path, done, timeoutMs) {
    const context  = await browser.newContext();
    const requests = [];
    await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== HOST) { requests.push({ url : url.href, status : 'aborted (off-machine)' }); return route.abort(); }
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
    const out = await page.evaluate(() => {
        const node = document.getElementById('out');
        return { text : node ? node.textContent : null, testResult : window.__TEST_RESULT || null,
                 jsPdf : !!(window.jspdf && window.jspdf.jsPDF), scripts : Array.from(document.scripts).map((s) => s.src).filter(Boolean) };
    }).catch((e) => ({ evalError : String(e) }));
    await context.close();
    return { path, finished, error, out, requests, console : log };
}

const browser = await chromium.launch({ headless : true });
const results = {};
try {
    results.specificationPdf = await runPage(browser, APP + '80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html',
        () => { const t = (document.getElementById('out') || {}).textContent || ''; return t.indexOf('DONE') !== -1 || t.indexOf('ERROR') !== -1; }, 90000);
    results.titleBlockCells = await runPage(browser, APP + '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html',
        () => !!window.__TEST_RESULT || ((document.getElementById('out') || {}).textContent || '').indexOf('ERROR') !== -1, 90000);
} finally {
    await browser.close();
}
writeFileSync(join(SCRATCH, 'html_harness_results.json'), JSON.stringify(results, null, 2));

for (const [name, r] of Object.entries(results)) {
    const n404 = r.requests.filter((q) => q.status === 404).map((q) => q.url);
    const off  = r.requests.filter((q) => String(q.status).indexOf('aborted') === 0).map((q) => q.url);
    const jspdf = r.requests.filter((q) => /jspdf\.umd\.js$/.test(q.url));
    console.log('== ' + name + '  finished=' + r.finished + (r.error ? '  error=' + r.error : '') + '  requests=' + r.requests.length
                + '  404s=' + JSON.stringify(n404) + '  off-machine=' + off.length);
    console.log('   jsPDF requests: ' + JSON.stringify(jspdf) + '   window.jspdf: ' + (r.out && r.out.jsPdf));
    const text = (r.out && r.out.text) || '';
    const lines = text.split('\n').filter((l) => l.trim());
    console.log('   out (last 4 lines): ' + lines.slice(-4).join(' | '));
    const errs = r.console.filter((c) => /^(error|pageerror)/.test(c));
    if (errs.length) console.log('   console errors: ' + errs.join(' | '));
}
