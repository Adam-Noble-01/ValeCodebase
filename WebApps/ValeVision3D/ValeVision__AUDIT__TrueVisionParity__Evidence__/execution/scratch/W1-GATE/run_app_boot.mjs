// W1 integrator gate (extra check): boot the real app headless on Adam's running Flask server and record what breaks.
//   http://localhost:8000/ValeVision3D/index.html?project=2026/3047__Doous
// READ-ONLY: the route handler lets through only GET / HEAD requests to localhost:8000; every non-GET request and every
// other host (the R2 worker, CDNs, fonts) is aborted and recorded, service workers are blocked, nothing is clicked and
// no save is triggered. No server is started, stopped or restarted. Results: app_boot_results.json beside this file.
//
// Usage: node run_app_boot.mjs [seconds to watch, default 75] [playwright module path]

import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const WATCH_S = Number(process.argv[2] || 75);
const PW_PATH = process.argv[3] || 'C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(PW_PATH);
const ORIGIN  = 'http://localhost:8000';
const PAGE    = '/ValeVision3D/index.html?project=2026/3047__Doous';
const SCRATCH = dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch({ headless : true, args : [ '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist' ] });
const requests = [], log = [], events = [];
let snapshot = null, error = null;
try {
    const context = await browser.newContext({ serviceWorkers : 'block', viewport : { width : 1400, height : 900 } });
    await context.route('**/*', async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.origin !== ORIGIN) { requests.push({ method : req.method(), url : url.href.slice(0, 200), status : 'aborted (off-machine)' }); return route.abort(); }
        if (req.method() !== 'GET' && req.method() !== 'HEAD') { requests.push({ method : req.method(), url : url.pathname, status : 'aborted (non-GET)' }); return route.abort(); }
        const response = await route.fetch().catch(() => null);
        if (!response) { requests.push({ method : req.method(), url : url.pathname + url.search, status : 'fetch failed' }); return route.abort(); }
        requests.push({ method : req.method(), url : url.pathname + url.search, status : response.status() });
        return route.fulfill({ response });
    });
    const page = await context.newPage();
    page.on('console', (msg) => log.push({ t : Date.now(), type : msg.type(), text : msg.text().slice(0, 600) }));
    page.on('pageerror', (err) => log.push({ t : Date.now(), type : 'pageerror', text : String(err.message).slice(0, 600) }));
    page.on('dialog', (dialog) => { log.push({ t : Date.now(), type : 'dialog', text : dialog.message() }); dialog.dismiss().catch(() => {}); });
    await page.addInitScript(() => {
        window.__GATE_EVENTS = [];
        [ 'na-app-scene-ready', 'na-drawings-data-loaded' ].forEach((n) => window.addEventListener(n, () => window.__GATE_EVENTS.push(n)));
        document.addEventListener('na-app-scene-ready', () => window.__GATE_EVENTS.push('doc:na-app-scene-ready'));
    });
    const t0 = Date.now();
    await page.goto(ORIGIN + PAGE, { waitUntil : 'load', timeout : 120000 });
    await page.waitForTimeout(WATCH_S * 1000);
    snapshot = await page.evaluate(() => ({
        title : document.title,
        events : window.__GATE_EVENTS,
        canvases : document.querySelectorAll('canvas').length,
        bodyClasses : document.body.className,
        loadingVisible : Array.from(document.querySelectorAll('[id*="loading" i], [class*="loading" i]')).filter((n) => n.offsetParent !== null).map((n) => (n.id || n.className).toString().slice(0, 60)).slice(0, 8),
        tabStrip : !!document.querySelector('.na-le-tabs'),
    })).catch((e) => ({ evalError : String(e) }));
    snapshot.watchedSeconds = Math.round((Date.now() - t0) / 1000);
    await context.close();
} catch (e) { error = String(e.message || e).split('\n')[0]; }
finally { await browser.close(); }

writeFileSync(join(SCRATCH, 'app_boot_results.json'), JSON.stringify({ page : PAGE, error, snapshot, requests, console : log }, null, 2));
const bad = requests.filter((q) => typeof q.status === 'number' && q.status >= 400);
const aborted = requests.filter((q) => typeof q.status !== 'number');
console.log('boot ' + PAGE + (error ? '  ERROR ' + error : '') + '  watched ' + (snapshot && snapshot.watchedSeconds) + ' s');
console.log('snapshot: ' + JSON.stringify(snapshot));
console.log('requests: ' + requests.length + '; 2xx/3xx ' + requests.filter((q) => typeof q.status === 'number' && q.status < 400).length + '; 4xx/5xx ' + bad.length + '; aborted ' + aborted.length);
bad.forEach((q) => console.log('  ' + q.status + '  ' + q.method + ' ' + q.url));
const offHosts = {};
aborted.forEach((q) => { const k = q.status + ' ' + q.method + ' ' + (q.url.startsWith('http') ? new URL(q.url).host : q.url); offHosts[k] = (offHosts[k] || 0) + 1; });
Object.entries(offHosts).forEach(([k, n]) => console.log('  ' + k + '  x' + n));
const errs = log.filter((c) => c.type === 'error' || c.type === 'pageerror');
console.log('console: ' + log.length + ' line(s); errors ' + errs.length + '; warnings ' + log.filter((c) => c.type === 'warning').length);
errs.forEach((c) => console.log('  ' + c.type + ': ' + c.text.slice(0, 300)));
