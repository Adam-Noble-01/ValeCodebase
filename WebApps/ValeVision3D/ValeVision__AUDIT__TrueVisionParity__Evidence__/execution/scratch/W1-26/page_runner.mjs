// W1-26 scratch: open one of the app's own test pages in headless Chromium with every request answered from
// disk (http://vv.test/<path> -> D:\10_CoreLib__ValeCodebase\<path>; the AD04 font host from the NaWeb pin;
// anything else aborted and listed), wait for window.__TEST_RESULT, print the page's #out text, screenshot it.
//   node page_runner.mjs <app-relative page path> [png name]
import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright');
const ROOT = 'D:\\10_CoreLib__ValeCodebase', HOST = 'http://vv.test', APP = '/WebApps/ValeVision3D/';
const AD04 = 'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/';
const NAWEB = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb', PIN = 'b2aa9151';
const HERE = dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png', '.ttf' : 'font/ttf' };
const rel = process.argv[2], png = process.argv[3] || 'page.png';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport : { width : 1700, height : 1400 } });
const aborted = [], consoleLines = [], missing = [];
await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(AD04)) {
        const name = decodeURIComponent(url.slice(AD04.length).split('?')[0]);
        return route.fulfill({ status : 200, headers : { 'content-type' : 'font/ttf', 'access-control-allow-origin' : '*' },
                               body : execFileSync('git', [ '-C', NAWEB, 'show', PIN + ':assets/AD04_-_LIBR_-_Common_-_Front-Files/' + name ], { maxBuffer : 1 << 26 }) });
    }
    if (!url.startsWith(HOST + '/')) { aborted.push(url); return route.abort(); }
    const path = decodeURIComponent(url.slice(HOST.length).split('?')[0]);
    const file = join(ROOT, ...path.split('/').filter(Boolean));
    if (existsSync(file) && statSync(file).isFile()) return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(file)] || 'application/octet-stream' }, body : readFileSync(file) });
    missing.push(path);
    return route.fulfill({ status : 404, body : 'not found' });
});
const page = await context.newPage();
page.on('console', (m) => consoleLines.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => consoleLines.push('pageerror: ' + e.message));
await page.goto(HOST + APP + rel);
await page.waitForFunction(() => window.__TEST_RESULT !== undefined, null, { timeout : 120000 });
const result = await page.evaluate(() => window.__TEST_RESULT);
const out = await page.evaluate(() => (document.getElementById('out') || {}).textContent || '');
if (!existsSync(join(HERE, 'png'))) mkdirSync(join(HERE, 'png'));
await page.screenshot({ path : join(HERE, 'png', png), fullPage : true });
await browser.close();
console.log(out);
console.log('\n__TEST_RESULT: ' + JSON.stringify(result, null, 1));
console.log('missing (404): ' + (missing.join(', ') || 'none'));
console.log('aborted off-machine: ' + (aborted.join(', ') || 'none'));
console.log('console warnings and errors:\n  ' + (consoleLines.filter((l) => /^(warning|error|pageerror)/.test(l)).join('\n  ') || 'none'));
