// =============================================================================
// W1-16 | End-to-end: the Sheet Images render set as a browser loads it
// =============================================================================
//
// THE MODULES AT THEIR BROWSER URLS. ValeVision's landed files - Setup,
// Source, Paint, Painter, Geometry, Pdf, Encode - load with the transport
// facade and the ProjectLoader they import, through Node module hooks that
// serve them at http://localhost:8000/ValeVision3D/... (the Flask server) and
// https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/...
// (GitHub Pages), so import.meta.url, and every URL built from it, is the
// real one (the technique of W0-12's Na__Test__TransportFacade__). fetch is a
// stub: the master index is Whitecardopedia's local copy (read only), the
// Sheet Images config is answered as each case says, and every picture URL
// is recorded and answered 404, so every candidate is tried.
//
// WHAT IT PROVES (W1-16 acceptance): with the config unreadable - a 404, a
// network error, or Flask's catch-all answering index.html - no Noble
// Architecture address is ever built or fetched (only this app's own CDN,
// cdn.noble-architecture.com/VaApps/), and the order of sources is
// TrueVision's: on the live site the CDN, then the GitHub Pages copy; on
// localhost the Flask copy, then the CDN. With the config readable the same.
// Every Setup reader answers the same with and without the config (TV's
// rule: each fallback equals the shipped config). The render set links and
// runs: Paint pushes a 'picture' primitive the Painter draws, Pdf prepares a
// sheet, Encode refuses what it should.
//
// THE CONTROL. The same case with TrueVision's own Setup (read at the pin
// with git, held in memory only) must FAIL the Noble Architecture check -
// proof the check bites.
//
// Writes nothing (no file, no network). Usage: node e2e_sources.mjs
// =============================================================================

import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { register } from 'node:module';
import { execFileSync } from 'node:child_process';

const APP_ROOT    = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/';
const INDEX_FILE  = 'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json';
const FEATURE     = '02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/';
const CONFIG_FILE = APP_ROOT + FEATURE + 'Na__LayoutEditor__SheetImages__Config__.json';
const FLASK_ORIGIN = 'http://localhost:8000';
const FLASK_BASE   = FLASK_ORIGIN + '/ValeVision3D/';
const PAGES_ORIGIN = 'https://adam-noble-01.github.io';
const PAGES_BASE   = PAGES_ORIGIN + '/ValeCodebase/WebApps/ValeVision3D/';
const VV_PAGES     = PAGES_ORIGIN + '/ValeCodebase/WebApps';
const CDN          = 'https://cdn.noble-' + 'architecture.com/VaApps/Projects';
const NA_HOST      = 'noble-' + 'architecture.com';
const TV           = 'True' + 'Vision';
const FOLDER       = '3047_D01';
const FILE         = 'Kitchen__0123456789.webp';
const INSIDE       = '2026/3047__Doous/05__Layout__DrawingDocs__Images/' + FOLDER + '/' + FILE;

// TrueVision's Setup at the pin, in memory only (the control case)
const TV_SETUP = execFileSync('git', [ '-C', 'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb', 'show',
    'b2aa9151:na-apps/30__' + TV + '__CoreAppCode/' + FEATURE + 'Na__LayoutEditor__SheetImages__Setup__.js' ]).toString('utf8');

// -----------------------------------------------------------------------------
// Checks
// -----------------------------------------------------------------------------

let failures = 0, passes = 0;
function check(name, passed, detail) {
    if (passed) passes++; else failures++;
    console.log((passed ? '  PASS  ' : '  FAIL  ') + name + (passed || detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 700)));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const naAddresses = (urls) => urls.filter((u) => u.toLowerCase().includes(NA_HOST) && !u.startsWith('https://cdn.' + NA_HOST + '/VaApps/'));

// -----------------------------------------------------------------------------
// Module hooks: the app's files at their browser URLs, fresh per case
// -----------------------------------------------------------------------------

const SCRATCH = mkdtempSync(join(tmpdir(), 'na-w1-16-e2e-'));
const HOOKS = [
    "import { readFileSync } from 'node:fs';",
    "import { fileURLToPath } from 'node:url';",
    "let state = { appRootUrl : '', bases : [], tvSetup : '' };",
    "export async function initialize(data) { state = data; }",
    "function baseOf(url) { return state.bases.find((base) => url.startsWith(base)) || null; }",
    "function caseOf(url) { try { return new URL(url).searchParams.get('case'); } catch (error) { return null; } }",
    "export async function resolve(specifier, context, nextResolve) {",
    "    const parent = context.parentURL || '';",
    "    let target = null;",
    "    if (specifier.startsWith('http://') || specifier.startsWith('https://')) target = specifier;",
    "    else if (baseOf(parent) && (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/'))) target = new URL(specifier, parent).href;",
    "    if (target && baseOf(target)) {",
    "        const url = new URL(target);",
    "        const parentCase = caseOf(parent);",
    "        if (parentCase && !url.searchParams.has('case')) url.searchParams.set('case', parentCase);",
    "        return { url : url.href, shortCircuit : true };",
    "    }",
    "    return nextResolve(specifier, context);",
    "}",
    "export async function load(url, context, nextLoad) {",
    "    const plain = url.split('?')[0];",
    "    const base = baseOf(plain);",
    "    if (!base) return nextLoad(url, context);",
    "    const kase = caseOf(url) || '';",
    "    if (kase.startsWith('tv') && plain.endsWith('Na__LayoutEditor__SheetImages__Setup__.js')) return { format : 'module', source : state.tvSetup, shortCircuit : true };",
    "    return { format : 'module', source : readFileSync(fileURLToPath(state.appRootUrl + plain.slice(base.length)), 'utf8'), shortCircuit : true };",
    "}"
].join('\n');
const HOOKS_FILE = join(SCRATCH, 'hooks.mjs');
writeFileSync(HOOKS_FILE, HOOKS);
register(pathToFileURL(HOOKS_FILE).href, { parentURL : import.meta.url,
    data : { appRootUrl : pathToFileURL(APP_ROOT).href, bases : [ FLASK_BASE, PAGES_BASE ], tvSetup : TV_SETUP } });

// -----------------------------------------------------------------------------
// The page, the console and fetch
// -----------------------------------------------------------------------------

const warnings = [];
console.warn = (...parts) => { warnings.push(parts.map((p) => (p && p.message) || String(p)).join(' ')); };
globalThis.document = { visibilityState : 'visible', createElement : () => ({ width : 0, height : 0, getContext : () => null }) };
globalThis.window = { location : null, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
                      setTimeout : (f, ms) => setTimeout(f, ms), clearTimeout : (t) => clearTimeout(t), crypto : globalThis.crypto };

function SetPage(host) {
    const search = '?project=2026/3047__Doous';
    window.location = host === 'pages'
        ? { hostname : 'adam-noble-01.github.io', port : '', search, origin : PAGES_ORIGIN, href : PAGES_BASE + 'index.html' + search }
        : { hostname : 'localhost', port : '8000', search, origin : FLASK_ORIGIN, href : FLASK_BASE + 'index.html' + search };
}

function MakeFetch(world) {
    return async (input) => {
        const url = String(input && input.url ? input.url : input);
        world.requests.push(url);
        if (url.endsWith('Na__MasterIndex__ProjectLocations__.json')) return new Response(readFileSync(INDEX_FILE, 'utf8'), { status : 200, headers : { 'Content-Type' : 'application/json' } });
        if (url.split('?')[0].endsWith('Na__LayoutEditor__SheetImages__Config__.json')) {
            world.configAsked++;
            if (world.config === '404')     return new Response('Not Found', { status : 404 });
            if (world.config === 'network') throw new TypeError('Failed to fetch');
            if (world.config === 'html')    return new Response('<!doctype html><title>index</title>', { status : 200, headers : { 'Content-Type' : 'text/html' } });
            return new Response(readFileSync(CONFIG_FILE, 'utf8'), { status : 200, headers : { 'Content-Type' : 'application/json' } });
        }
        world.pictures.push(url);
        return new Response('Not Found', { status : 404, headers : { 'Content-Type' : 'text/plain' } });
    };
}

let caseNumber = 0;
async function OpenCase(host, config, tvSetup) {
    caseNumber++;
    SetPage(host);
    const world = { config, configAsked : 0, requests : [], pictures : [] };
    globalThis.fetch = MakeFetch(world);
    const base = (host === 'pages' ? PAGES_BASE : FLASK_BASE);
    const tag  = '?case=' + (tvSetup ? 'tv' : 'vv') + caseNumber;
    const loader = await import(base + '02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js' + tag);
    await loader.Na__AppUtils__InitMasterIndex();
    const mods = {};
    for (const part of [ 'Setup', 'Geometry', 'Painter', 'Paint', 'Source', 'Pdf', 'Encode' ]) {
        mods[part] = await import(base + FEATURE + 'Na__LayoutEditor__SheetImages__' + part + '__.js' + tag);
    }
    await mods.Setup.Na__LeImgCfg__Ready();
    return { world, mods };
}

function Readers(Setup) {
    return { storage : Setup.Na__LeImgCfg__Storage(), placement : Setup.Na__LeImgCfg__Placement(), frame : Setup.Na__LeImgCfg__Frame(),
             crop : Setup.Na__LeImgCfg__Crop(), pdf : Setup.Na__LeImgCfg__Pdf(), sources : Setup.Na__LeImgCfg__Sources(),
             label : Setup.Na__LeImgCfg__Label('Missing', 'Picture not found: {file}', { file : 'a.webp' }) };   // <-- Paint's own fallback
}

async function LoadPicture(mods) {
    const before = mods.Source.Na__LeImgSrc__State(FOLDER, FILE);
    const blob = await mods.Source.Na__LeImgSrc__Blob(FOLDER, FILE);
    return { before, blob, after : mods.Source.Na__LeImgSrc__State(FOLDER, FILE) };
}

// -----------------------------------------------------------------------------
// The cases
// -----------------------------------------------------------------------------

const expected = {
    pages : [ CDN + '/' + INSIDE, VV_PAGES + '/Whitecardopedia/Projects/' + INSIDE ],
    flask : [ FLASK_ORIGIN + '/Whitecardopedia/Projects/' + INSIDE, CDN + '/' + INSIDE ]
};

console.log('W1-16 - Sheet Images render set at its browser URLs');
let readable = null;
for (const host of [ 'pages', 'flask' ]) {
    for (const config of [ 'readable', '404', 'network', 'html' ]) {
        warnings.length = 0;
        const { world, mods } = await OpenCase(host, config, false);
        const readers = Readers(mods.Setup);
        if (config === 'readable' && host === 'pages') readable = readers;
        const picture = await LoadPicture(mods);
        const label = host + ', config ' + config;
        console.log('\n  ' + label);
        check('the config was asked for once', world.configAsked === 1, world.configAsked);
        check('Pages base: this app\'s', readers.sources.pagesBaseUrl === VV_PAGES, readers.sources.pagesBaseUrl);
        check('every reader answers as with the shipped config (each fallback equals it)', !readable || same(readers, readable), { readers, readable });
        check('the picture was looked for in TrueVision\'s order: ' + (host === 'pages' ? 'CDN, then GitHub Pages' : 'the Flask copy, then the CDN'),
              same(world.pictures, expected[host]), world.pictures);
        check('no Noble Architecture address built or fetched (this app\'s CDN only)', naAddresses(world.requests).length === 0, naAddresses(world.requests));
        check('loading, then missing, never a blob', picture.before === 'loading' && picture.blob === null && picture.after === 'missing', picture);
        check('warnings carry [ValeVision3D LayoutEditor], none TrueVision\'s', warnings.length > 0 && warnings.every((w) => w.includes('[ValeVision3D LayoutEditor]') && !w.includes('[' + TV + '3D')), warnings);
        if (config !== 'readable') check('the config warning says the built-in settings are used', warnings.some((w) => /Sheet Images config unavailable/.test(w)), warnings);
        if (config === 'readable' && host === 'pages') {
            // THE RENDER SET RUNS: Paint -> Painter, Pdf, Encode
            const shape = { Shape__Id : 'Shape_001', Shape__Points : mods.Geometry.Na__LeImgGeo__RectPoints(10, 20, 160, 90),
                            Shape__Image : { Image__File : FILE, Image__Folder : FOLDER, Image__PixelW : 3840, Image__PixelH : 2160 } };
            const list = [];
            const pushed = mods.Paint.Na__LeImgDraw__Push(list, shape);
            const prim = list[0] || {};
            check('Paint pushes one picture primitive: missing, captioned, bronze frame, soft shadow',
                  pushed === true && prim.Kind === 'picture' && prim.State === 'missing' && prim.Caption === 'Picture not found: ' + FILE
                  && prim.Frame && prim.Frame.Colour === '#555041' && prim.Shadow && /^naLeImgShadow_/.test(prim.Shadow.FilterId), prim);
            const svg = mods.Painter.Na__LeImgPaint__Svg(prim);
            check('the Painter draws it as the pale placeholder with its name and the frame rule',
                  /stroke-dasharray="1.2 0.8"/.test(svg) && svg.includes('Picture not found: ' + FILE) && /stroke="#555041"/.test(svg) && !/<image/.test(svg), svg.slice(0, 300));
            const prepared = await mods.Pdf.Na__LeImgPdf__Prepare({ Sheet__Shapes : [ shape ] });
            check('Pdf prepares the sheet and reports the missing picture, never rejecting', same(prepared, { prepared : 0, missing : [ FILE ] }), prepared);
            check('Encode takes a PNG and refuses a PDF and a 200 MB file',
                  mods.Encode.Na__LeImgEnc__Refusal({ type : 'image/png', size : 1000, name : 'a.png' }) === null
                  && same(mods.Encode.Na__LeImgEnc__Refusal({ type : 'application/pdf', size : 10, name : 'a.pdf' }), { reason : 'type' })
                  && same(mods.Encode.Na__LeImgEnc__Refusal({ type : 'image/png', size : 200 * 1048576, name : 'a.png' }), { reason : 'size', limitMb : 100 }));
        }
    }
}

// -----------------------------------------------------------------------------
// The control: TrueVision's Setup in the same place must be caught
// -----------------------------------------------------------------------------

console.log('\n  control: ' + TV + '\'s own Setup (pin b2aa9151), live site, config unreadable');
{
    const { world, mods } = await OpenCase('pages', '404', true);
    await LoadPicture(mods);
    const caught = naAddresses(world.requests);
    check('the Noble Architecture check bites: ' + TV + '\'s fallback sends the live site to its own website', caught.length === 1 && caught[0].startsWith('https://www.' + NA_HOST + '/Whitecardopedia/Projects/'), world.requests);
}

console.log('\n' + (failures ? failures + ' check(s) FAILED, ' : '') + passes + ' passed');
process.exit(failures ? 1 : 0);
