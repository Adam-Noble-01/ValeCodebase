// Scratch (W1-10, never shipped): open Na__Test__ElevationGeometry__.html in headless Chromium and read its checks.
//
//   node harness_run.cjs disk-candidates   every request answered from disk by Playwright's router (no server):
//                                          the live tree with W1-10's candidates laid over it
//   node harness_run.cjs disk-live         the same, the live tree only
//   node harness_run.cjs flask             Adam's running Whitecardopedia Flask server (read-only GETs)
//
// Uses the Playwright already in this machine's npx cache and its installed Chromium; starts no server.
'use strict';
const path = require('path');
const fs   = require('fs');
const { chromium } = require('C:/Users/adamw/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');

const MODE = process.argv[2] || 'disk-candidates';
const APP  = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const CAND = path.join(__dirname, 'candidates');
const PAGE = '80__Testing__PrototypeEnvironment/Na__Test__ElevationGeometry__.html';
const HOST = MODE === 'flask' ? 'http://localhost:8000' : 'http://vv.test';
const TYPES = { '.html' : 'text/html', '.js' : 'text/javascript', '.mjs' : 'text/javascript', '.json' : 'application/json', '.css' : 'text/css' };

function overlay(rel) {
    if (MODE !== 'disk-candidates') return null;
    const file = path.join(CAND, rel);
    return fs.existsSync(file) ? file : null;
}

(async () => {
    const browser = await chromium.launch({ headless : true });
    const context = await browser.newContext();
    const page    = await context.newPage();
    const requests = [], problems = [];
    page.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.type() + ': ' + msg.text()); });
    page.on('pageerror', (err) => problems.push('pageerror: ' + err.message));
    page.on('request', (req) => requests.push(req.method() + ' ' + req.url()));
    await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== HOST || route.request().method() !== 'GET') return route.abort();          // <-- Nothing else, and nothing but reads
        if (MODE === 'flask') return route.continue();
        const rel  = decodeURIComponent(url.pathname.replace(/^\/ValeVision3D\//, ''));
        const file = overlay(rel) || path.join(APP, rel);
        if (!path.resolve(file).startsWith(path.resolve(APP)) && !path.resolve(file).startsWith(path.resolve(CAND))) return route.abort();
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status : 404, body : 'not found' });
        return route.fulfill({ status : 200, body : fs.readFileSync(file), contentType : TYPES[path.extname(file)] || 'application/octet-stream' });
    });
    await page.goto(HOST + '/ValeVision3D/' + PAGE);
    let summary = null;
    try { await page.waitForSelector('#summary', { timeout : 60000 }); summary = await page.textContent('#summary'); }
    catch (e) { problems.push('no #summary: ' + e.message); }
    const lines = await page.$$eval('#out > *', (els) => els.map((e) => (e.tagName === 'H2' ? '## ' : (e.className === 'pass' ? 'PASS ' : e.className === 'fail' ? 'FAIL ' : '')) + e.textContent));
    const title = await page.title();
    await browser.close();
    const passCount = lines.filter((l) => l.startsWith('PASS PASS  ')).length;                       // <-- class + the page's own "PASS  " prefix
    const failCount = lines.filter((l) => l.startsWith('FAIL ')).length;
    console.log('mode ' + MODE + ' | title "' + title + '" | ' + passCount + ' PASS, ' + failCount + ' FAIL | summary: ' + summary);
    lines.forEach((l) => console.log('  ' + l));
    console.log('requests: ' + requests.length + ' (' + requests.filter((r) => !r.startsWith('GET ' + HOST)).length + ' to another origin)');
    if (problems.length) console.log('console/page problems:\n  ' + problems.join('\n  '));
    process.exit(summary === 'ALL CHECKS PASSED' && failCount === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
