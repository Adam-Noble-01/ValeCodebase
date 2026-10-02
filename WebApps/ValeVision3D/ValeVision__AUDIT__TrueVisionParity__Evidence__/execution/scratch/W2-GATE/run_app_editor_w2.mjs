// W1 integrator gate (continuation, extra check): boot the real app headless on Adam's running Flask server with a
// project whose Layout Mode is on and that has two sheets, open the first drawing through the tab strip's Drawings
// menu, step to the next with Page Down, and record what breaks (uncaught exceptions, console errors, 4xx/5xx).
//   http://localhost:8000/ValeVision3D/index.html?project=2026/57994__Harris__Scheme-02
// READ-ONLY: the route handler lets through only GET / HEAD requests to localhost:8000; every non-GET request and every
// other host (the R2 worker, the CDN, fonts, GitHub) is aborted and recorded, so nothing can be saved anywhere; service
// workers are blocked; the browser context is ephemeral (its localStorage drafts die with it). No server is started,
// stopped or restarted. Results: app_editor_w2_results.json beside this file.
//
// Usage: node run_app_editor_c2.mjs [playwright module path]

import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const PW_PATH = process.argv[2] || 'C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(PW_PATH);
const ORIGIN  = 'http://localhost:8000';
const PAGE    = '/ValeVision3D/index.html?project=2026/57994__Harris__Scheme-02';
const SCRATCH = dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch({ headless : true, args : [ '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist' ] });
const requests = [], log = [], steps = [];
let error = null;
const step = (name, data) => { steps.push({ t : new Date().toISOString().slice(11, 19), name, data }); console.log('step ' + name + ' ' + JSON.stringify(data).slice(0, 400)); };
try {
    const context = await browser.newContext({ serviceWorkers : 'block', viewport : { width : 1600, height : 950 } });
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
    await page.goto(ORIGIN + PAGE, { waitUntil : 'load', timeout : 120000 });
    await page.waitForFunction(() => (window.__GATE_EVENTS || []).some((e) => /na-app-scene-ready/.test(e)), null, { timeout : 150000, polling : 500 })
        .then(() => step('scene-ready', {})).catch((e) => step('scene-ready TIMEOUT', { e : String(e.message).split('\n')[0] }));
    const drawingsTab = await page.waitForSelector('.na-le-tabs__tab--drawings', { timeout : 60000 }).catch(() => null);
    step('tab strip', { drawingsTab : !!drawingsTab, tabs : await page.$$eval('.na-le-tabs__tab', (n) => n.map((x) => x.textContent.trim())).catch(() => []) });
    if (drawingsTab) {
        await drawingsTab.click();
        await page.waitForSelector('.na-le-tabs__menu-row', { timeout : 30000 }).catch(() => null);
        const rows = await page.$$eval('.na-le-tabs__menu-row', (n) => n.map((x) => ({ text : x.textContent.trim().replace(/\s+/g, ' '), title : x.title || '', cls : x.className })));
        step('drawings menu', { rows });
        const first = await page.$('.na-le-tabs__menu-row:not(.na-le-tabs__menu-row--add)');
        if (first) {
            await first.click();
            await page.waitForFunction(() => !!document.querySelector('.na-le-paper') && document.querySelectorAll('.na-le-paper__chrome, .na-le-paper svg').length > 0, null, { timeout : 90000, polling : 500 })
                .then(() => step('editor open', {})).catch((e) => step('editor open TIMEOUT', { e : String(e.message).split('\n')[0] }));
            await page.waitForTimeout(12000);
            const snap = await page.evaluate(() => {
                const chromeText = Array.from(document.querySelectorAll('.na-le-paper__chrome text, .na-le-paper svg text')).map((t) => t.textContent).join(' | ');
                return {
                    activeTab : (document.querySelector('.na-le-tabs__tab--active') || {}).textContent || null,
                    paper : !!document.querySelector('.na-le-paper'),
                    stack : document.querySelectorAll('.na-le-paper__stack').length,
                    frames : document.querySelectorAll('.na-le-frame').length,
                    documentIdLabel : /DOCUMENT ID/.test(chromeText),
                    revisionPrefix : /Revision [A-Z]/.test(chromeText),
                    chromeTextSample : chromeText.slice(0, 600),
                    unsavedFlag : typeof window.Na__Pwa__HasUnsavedWork,
                    colourInputs : document.querySelectorAll('input[type="color"]').length,
                    sliderBoxes : document.querySelectorAll('.na-le-row__rangebox, input.na-le-rangebox, .na-le-rangebox').length,
                    panelTabsWithTitle : Array.from(document.querySelectorAll('[class*="tab"][title]')).filter((b) => b.closest('.na-le-shell')).length,
                };
            }).catch((e) => ({ evalError : String(e) }));
            step('editor snapshot', snap);
            await page.mouse.click(800, 500);   // a press on the stage takes the keyboard (Controls__Pc 1.4.0 TakeKeyboard)
            await page.waitForTimeout(800);
            const before = await page.evaluate((() => { const t = Array.from(document.querySelectorAll('.na-le-paper__chrome text, .na-le-paper svg text')).map((x) => x.textContent.trim()); const i = t.indexOf('DOCUMENT ID'); const j = t.indexOf('DRAWING TITLE'); const a = document.activeElement; return { documentId : i >= 0 ? t[i + 1] : null, title : j >= 0 ? t[j + 1] : null, focus : a ? (a.tagName + '.' + String(a.className || '').split(' ')[0]) : null }; }));
            await page.keyboard.press('PageDown');
            await page.waitForTimeout(8000);
            const after = await page.evaluate((() => { const t = Array.from(document.querySelectorAll('.na-le-paper__chrome text, .na-le-paper svg text')).map((x) => x.textContent.trim()); const i = t.indexOf('DOCUMENT ID'); const j = t.indexOf('DRAWING TITLE'); const a = document.activeElement; return { documentId : i >= 0 ? t[i + 1] : null, title : j >= 0 ? t[j + 1] : null, focus : a ? (a.tagName + '.' + String(a.className || '').split(' ')[0]) : null }; }));
            const menuOpen = await page.evaluate(() => Array.from(document.querySelectorAll('.na-le-tabs__menu-row--open')).map((x) => x.textContent.trim()));
            step('page down', { before, after, openRowsInMenu : menuOpen, title : await page.title() });
            await page.waitForTimeout(5000);
        }
    }
    await context.close();
} catch (e) { error = String(e.message || e).split('\n')[0]; }
finally { await browser.close(); }

writeFileSync(join(SCRATCH, 'app_editor_w2_results.json'), JSON.stringify({ page : PAGE, error, steps, requests, console : log }, null, 2));
const bad = requests.filter((q) => typeof q.status === 'number' && q.status >= 400);
const aborted = requests.filter((q) => typeof q.status !== 'number');
console.log('boot ' + PAGE + (error ? '  ERROR ' + error : ''));
console.log('requests: ' + requests.length + '; 2xx/3xx ' + requests.filter((q) => typeof q.status === 'number' && q.status < 400).length + '; 4xx/5xx ' + bad.length + '; aborted ' + aborted.length);
bad.forEach((q) => console.log('  ' + q.status + '  ' + q.method + ' ' + q.url));
const offHosts = {};
aborted.forEach((q) => { const k = q.status + ' ' + q.method + ' ' + (q.url.startsWith('http') ? new URL(q.url).host : q.url); offHosts[k] = (offHosts[k] || 0) + 1; });
Object.entries(offHosts).forEach(([k, n]) => console.log('  ' + k + '  x' + n));
const perr = log.filter((c) => c.type === 'pageerror');
const errs = log.filter((c) => c.type === 'error');
console.log('console: ' + log.length + ' line(s); page errors (uncaught) ' + perr.length + '; console errors ' + errs.length + '; warnings ' + log.filter((c) => c.type === 'warning').length);
perr.forEach((c) => console.log('  PAGEERROR: ' + c.text.slice(0, 400)));
const distinct = {};
errs.forEach((c) => { const k = c.text.slice(0, 160); distinct[k] = (distinct[k] || 0) + 1; });
Object.entries(distinct).forEach(([k, n]) => console.log('  error x' + n + ': ' + k));
