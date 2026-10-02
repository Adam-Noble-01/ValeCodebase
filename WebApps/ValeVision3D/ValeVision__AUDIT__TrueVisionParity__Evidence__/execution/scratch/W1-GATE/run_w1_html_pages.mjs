// W1 integrator gate (extra check): run the two browser test pages this wave added, headless, the way each page's
// header says to serve it - on Adam's running Flask server (http://localhost:8000/ValeVision3D/...). READ-ONLY: the route
// handler lets through only GET / HEAD requests to localhost:8000 and aborts (and records) anything else, so nothing
// can be written to the server, R2 or the disk; no server is started, stopped or restarted. Results:
// w1_html_pages_results.json beside this file.
//
//   Na__Test__ProjectRecordAddress__.html  (W1-12)  - expects "ALL 15 CASES PASS" (window.__TEST_RESULT)
//   Na__Test__ElevationGeometry__.html      (W1-10)  - expects "ALL CHECKS PASSED"
//
// Usage: node run_w1_html_pages.mjs [playwright module path]

import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const PW_PATH = process.argv[2] || 'C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(PW_PATH);
const ORIGIN  = 'http://localhost:8000';
const SCRATCH = dirname(fileURLToPath(import.meta.url));

async function runPage(browser, path, done, timeoutMs) {
    const context  = await browser.newContext({ serviceWorkers : 'block' });
    const requests = [];
    await context.route('**/*', async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.origin !== ORIGIN) { requests.push({ method : req.method(), url : url.href, status : 'aborted (off-machine)' }); return route.abort(); }
        if (req.method() !== 'GET' && req.method() !== 'HEAD') { requests.push({ method : req.method(), url : url.pathname, status : 'aborted (non-GET)' }); return route.abort(); }
        const response = await route.fetch().catch((e) => null);
        if (!response) { requests.push({ method : req.method(), url : url.pathname + url.search, status : 'fetch failed' }); return route.abort(); }
        requests.push({ method : req.method(), url : url.pathname + url.search, status : response.status() });
        return route.fulfill({ response });
    });
    const page = await context.newPage();
    const log  = [];
    page.on('console', (msg) => log.push(msg.type() + ': ' + msg.text()));
    page.on('pageerror', (err) => log.push('pageerror: ' + err.message));
    page.on('dialog', (dialog) => { log.push('dialog: ' + dialog.message()); dialog.dismiss().catch(() => {}); });
    let finished = true, error = null;
    try {
        await page.goto(ORIGIN + path, { waitUntil : 'load', timeout : timeoutMs });
        await page.waitForFunction(done, null, { timeout : timeoutMs, polling : 250 });
    } catch (e) { finished = false; error = String(e.message || e).split('\n')[0]; }
    const out = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('.sum, #summary, .summary, h2, #out'));
        return { summary : nodes.map((n) => (n.textContent || '').trim().split('\n')[0]).filter(Boolean).slice(0, 6),
                 testResult : window.__TEST_RESULT ? { pass : window.__TEST_RESULT.pass, fail : window.__TEST_RESULT.fail } : null,
                 bodyTail : (document.body.innerText || '').trim().split('\n').slice(-3) };
    }).catch((e) => ({ evalError : String(e) }));
    await context.close();
    return { path, finished, error, out, requests, console : log };
}

const browser = await chromium.launch({ headless : true });
const results = {};
try {
    results.projectRecordAddress = await runPage(browser, '/ValeVision3D/80__Testing__PrototypeEnvironment/Na__Test__ProjectRecordAddress__.html',
        () => !!window.__TEST_RESULT, 90000);
    results.elevationGeometry = await runPage(browser, '/ValeVision3D/80__Testing__PrototypeEnvironment/Na__Test__ElevationGeometry__.html',
        () => /ALL CHECKS PASSED|CHECK\(S\) FAILED/.test(document.body.innerText || ''), 90000);
} finally {
    await browser.close();
}
writeFileSync(join(SCRATCH, 'w1_html_pages_results.json'), JSON.stringify(results, null, 2));
for (const [name, r] of Object.entries(results)) {
    const bad = r.requests.filter((q) => typeof q.status !== 'number' || q.status >= 400);
    console.log('== ' + name + '  finished=' + r.finished + (r.error ? '  error=' + r.error : '') + '  requests=' + r.requests.length
                + '  non-2xx/3xx or aborted=' + JSON.stringify(bad.map((q) => q.status + ' ' + q.method + ' ' + q.url)));
    console.log('   result: ' + JSON.stringify(r.out && (r.out.testResult || r.out.summary)) + '   tail: ' + JSON.stringify(r.out && r.out.bodyTail));
    const errs = r.console.filter((c) => /^(error|pageerror)/.test(c));
    console.log('   console errors: ' + (errs.length ? errs.join(' | ') : 'none'));
}
