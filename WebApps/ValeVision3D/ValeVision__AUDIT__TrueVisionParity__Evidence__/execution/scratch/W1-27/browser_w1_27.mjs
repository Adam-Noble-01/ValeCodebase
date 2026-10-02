// =============================================================================
// W1-27 scratch harness driver - the Floor Areas core modules in headless Chromium (not shipped)
// =============================================================================
// No server is started (W0-16 / W1-25 / W1-26's method): Chromium asks for http://w127.test/app/<path> and
// the route below answers it from the tree under test:
//   vv   this app's live tree (D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D), W1-27's files landed
//   tv   TrueVision's tree at the pin, read file by file with git show b2aa9151:na-apps/30__TrueVision__CoreAppCode/...
// The page (page_w1_27.mjs, beside this file) is served at the app root of either tree. The configured font
// host (www.noble-architecture.com/assets/AD04_...) is answered from the NaWeb repository at the pin, as W1-26
// did; the project master index gets an empty list; every other off-machine request is aborted and listed.
// Read-only on both trees. Results: logs/browser__<scenario>.json.
//
//   node browser_w1_27.mjs [vv] [tv]        (default: both)
// =============================================================================

import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\adamw\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright');

const VV       = 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D';
const NAWEB    = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const PIN      = 'b2aa9151';
const TVAPP    = 'na-apps/30__TrueVision__CoreAppCode/';
const HOST     = 'http://w127.test';
const APP      = '/app/';
const AD04     = 'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/';
const INDEXURL = 'https://cdn.noble-architecture.com/VaApps/Index/Na__MasterIndex__ProjectLocations__.json';
const SCRATCH  = dirname(fileURLToPath(import.meta.url));
if (!existsSync(join(SCRATCH, 'logs'))) mkdirSync(join(SCRATCH, 'logs'));

// --overlay <dir>  serve a file from <dir> (app-relative layout) in place of the tree's own - a planted fault
// --tag <text>     added to the result file's name: logs/browser__<scenario><tag>.json
const ARGV = process.argv.slice(2);
const opt  = (name) => { const at = ARGV.indexOf(name); return at !== -1 ? ARGV[at + 1] : null; };
const OVERLAY = opt('--overlay');
const TAG     = opt('--tag') || '';
const WANT = ARGV.filter((a, i) => !a.startsWith('--') && !(i > 0 && ARGV[i - 1].startsWith('--')));
const SCENARIOS = WANT.length ? WANT : [ 'vv', 'tv' ];
const TYPES = { '.html' : 'text/html; charset=utf-8', '.js' : 'application/javascript; charset=utf-8', '.mjs' : 'application/javascript; charset=utf-8',
                '.json' : 'application/json; charset=utf-8', '.css' : 'text/css; charset=utf-8', '.png' : 'image/png', '.svg' : 'image/svg+xml',
                '.webp' : 'image/webp', '.jpg' : 'image/jpeg', '.ttf' : 'font/ttf', '.woff2' : 'font/woff2' };

const gitCache = new Map();
function gitShow(spec) {
    if (!gitCache.has(spec)) {
        try { gitCache.set(spec, execFileSync('git', [ '-C', NAWEB, 'show', spec ], { maxBuffer : 1 << 28, stdio : [ 'ignore', 'pipe', 'ignore' ] })); }
        catch (e) { gitCache.set(spec, null); }
    }
    return gitCache.get(spec);
}
function readTree(scenario, rel) {
    if (OVERLAY) {
        const planted = join(OVERLAY, ...rel.split('/'));
        if (existsSync(planted) && statSync(planted).isFile()) return readFileSync(planted);
    }
    if (scenario === 'tv') return gitShow(PIN + ':' + TVAPP + rel);
    const file = join(VV, ...rel.split('/'));
    return (existsSync(file) && statSync(file).isFile()) ? readFileSync(file) : null;
}

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
    'three-edge-projection/worker' : './04__Lib__ThirdParty__VersionLocked/04__Vendor__ThreeEdgeProjection__v0.0.10/src/worker/index.js',
    'three-edge-projection/webgpu' : './04__Lib__ThirdParty__VersionLocked/04__Vendor__ThreeEdgeProjection__v0.0.10/src/webgpu/index.js'
} });
const PAGE = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>W1-27 harness</title>' +
             '<script type="importmap">' + IMPORTMAP + '</script>' +
             '<script src="./04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js"></script>' +
             '</head><body><pre id="out">running</pre><script type="module" src="./__w127_page__.mjs"></script></body></html>';

const browser = await chromium.launch();
const summary = {};
for (const scenario of SCENARIOS) {
    const context = await browser.newContext({ viewport : { width : 1400, height : 900 } });
    const aborted = [], served = new Set(), missing = [], consoleLines = [];
    await context.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith(AD04)) {
            const body = gitShow(PIN + ':assets/AD04_-_LIBR_-_Common_-_Front-Files/' + decodeURIComponent(url.slice(AD04.length).split('?')[0]));
            return body ? route.fulfill({ status : 200, headers : { 'content-type' : 'font/ttf', 'access-control-allow-origin' : '*' }, body })
                        : route.fulfill({ status : 404, body : '' });
        }
        if (url.split('?')[0] === INDEXURL) return route.fulfill({ status : 200, headers : { 'content-type' : 'application/json', 'access-control-allow-origin' : '*' }, body : JSON.stringify({ projects : [] }) });
        const common = url.indexOf('/01__Assets__NaApps__CommonAssets/NaApps__CommonFonts/');
        if (scenario === 'tv' && common !== -1) {                                // TrueVision's own font host: the same Open Sans blobs as AD04's, from the repository at the pin
            const body = gitShow(PIN + ':na-apps' + decodeURIComponent(url.slice(common).split('?')[0]));
            return body ? route.fulfill({ status : 200, headers : { 'content-type' : 'font/ttf', 'access-control-allow-origin' : '*' }, body })
                        : route.fulfill({ status : 404, body : '' });
        }
        if (!url.startsWith(HOST + APP)) { aborted.push(url); return route.abort(); }
        const rel = decodeURIComponent(url.slice((HOST + APP).length).split('?')[0].split('#')[0]);
        if (rel === '__w127__.html') return route.fulfill({ status : 200, headers : { 'content-type' : TYPES['.html'] }, body : PAGE });
        if (rel === '__w127_page__.mjs') return route.fulfill({ status : 200, headers : { 'content-type' : TYPES['.mjs'] }, body : readFileSync(join(SCRATCH, 'page_w1_27.mjs')) });
        const body = readTree(scenario, rel);
        if (!body) { missing.push(rel); return route.fulfill({ status : 404, body : 'not found' }); }
        served.add(rel);
        return route.fulfill({ status : 200, headers : { 'content-type' : TYPES[extname(rel)] || 'application/octet-stream' }, body });
    });
    const page = await context.newPage();
    page.on('console', (m) => consoleLines.push(m.type() + ': ' + m.text()));
    page.on('pageerror', (e) => consoleLines.push('pageerror: ' + e.message));
    await page.goto(HOST + APP + '__w127__.html?project=2026/3047__Doous');
    try {
        await page.waitForFunction(() => window.__W127 && window.__W127.done === true, null, { timeout : 240000 });
    } catch (timeout) {
        const partial = await page.evaluate(() => window.__W127 ? { phase : window.__W127.phase, steps : window.__W127.steps, errors : window.__W127.errors } : 'no __W127');
        console.log('== ' + scenario + ': TIMEOUT ' + JSON.stringify(partial) + '\n   ' + consoleLines.slice(-30).join('\n   '));
        await context.close();
        continue;
    }
    const R = await page.evaluate(() => window.__W127);
    R.scenario = scenario;
    R.aborted = aborted;
    R.missing = missing;
    R.served = served.size;
    R.servedFloorAreas = [ ...served ].filter((p) => p.indexOf('59__Feature__FloorAreas') !== -1).sort();
    R.consoleLines = consoleLines;
    writeFileSync(join(SCRATCH, 'logs', 'browser__' + scenario + TAG + '.json'), JSON.stringify(R, null, 1));
    summary[scenario] = { steps : R.steps.length, errors : R.errors, served : served.size, missing : missing.length, aborted : aborted.length,
                          pageErrors : consoleLines.filter((l) => l.startsWith('pageerror')).length };
    console.log('== ' + scenario + ': ' + R.steps.length + ' step(s) [' + R.steps.join(', ') + ']; ' + R.errors.length + ' error(s); served ' + served.size +
                ' file(s), ' + missing.length + ' 404(s)' + (missing.length ? ' (' + missing.slice(0, 6).join(', ') + ')' : '') +
                ', aborted ' + aborted.length + (aborted.length ? ' (' + [ ...new Set(aborted.map((u) => u.split('/').slice(0, 3).join('/'))) ].join(', ') + ')' : ''));
    R.errors.forEach((e) => console.log('   ERROR ' + e));
    await context.close();
}
await browser.close();
writeFileSync(join(SCRATCH, 'logs', 'browser__summary' + TAG + '.json'), JSON.stringify(summary, null, 1));
