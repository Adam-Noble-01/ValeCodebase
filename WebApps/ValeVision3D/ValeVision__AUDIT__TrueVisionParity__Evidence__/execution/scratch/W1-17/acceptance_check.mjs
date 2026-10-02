// =============================================================================
// W1-17 ACCEPTANCE CHECK - the hatch module and its library, against TrueVision's at the pin
// =============================================================================
//
//   node acceptance_check.mjs <VV app root> [--http <base>]
//
// - Loads TrueVision's HatchPatterns (scratch/W1-17/tv, read at b2aa9151, with
//   TrueVision's own library beside it) and ValeVision's (under <VV app root>,
//   with the library landed there), each as its own fresh module.
// - Exports: identical name lists.
// - Library load: Na__LeHatch__Ready() on each, with fetch answered from disk
//   (the module's own file: URLs). Packs, order, every parsed pattern: identical;
//   Construction Materials first and Brickwork the first pattern.
// - --http <base>: ValeVision's load again with every request the module makes
//   sent to <base> (e.g. http://localhost:8000/ValeVision3D/) through the real
//   fetch: every status must be 200 and the result identical.
// - Painting: SvgPaint, SwatchMarkup, TilePolylines, TileMarks, PatternDef and
//   DrawPdf (a recording jsPDF stand-in, plain and holed) for every pattern:
//   identical output from both modules.
// - Console: the same lines, the app token apart.
// Exit 0 = every check passed. Reads only; writes nothing.
// =============================================================================

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const HERE    = dirname(fileURLToPath(import.meta.url));
const MOD_REL = '02__Src__AppModules/51__System__LayoutEditor/36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js';
const vvRoot  = process.argv[2];
const httpAt  = process.argv.indexOf('--http');
const httpBase = httpAt > 0 ? process.argv[httpAt + 1] : null;
if (!vvRoot || !existsSync(join(vvRoot, MOD_REL))) { console.error('usage: node acceptance_check.mjs <VV app root> [--http <base>]'); process.exit(2); }

let passed = 0, failed = 0;
function check(name, ok, detail) {
    if (ok) { passed++; console.log('  PASS  ' + name); }
    else    { failed++; console.log('  FAIL  ' + name + (detail ? '\n        ' + detail : '')); }
}

// FETCH | answered from disk, or relayed to an HTTP base, with a log
// ------------------------------------------------------------
const realFetch = globalThis.fetch;
let   requests  = [];
let   mode      = { kind : 'disk', appRootHref : null, base : null };
globalThis.fetch = async (url, options) => {
    const href = String(url);
    if (mode.kind === 'http') {
        if (!href.startsWith(mode.appRootHref)) { requests.push({ href, status : 'outside-root' }); return { ok : false, status : 0, json : async () => null }; }
        const target = mode.base + href.slice(mode.appRootHref.length);
        const response = await realFetch(target, options);
        requests.push({ href : target, status : response.status, cache : options && options.cache });
        return response;
    }
    let path;
    try { path = fileURLToPath(href); } catch (e) { requests.push({ href, status : 'bad-url' }); return { ok : false, status : 0, json : async () => null }; }
    if (!existsSync(path)) { requests.push({ href, status : 404 }); return { ok : false, status : 404, json : async () => null }; }
    const text = await readFile(path, 'utf8');
    requests.push({ href, status : 200, cache : options && options.cache });
    return { ok : true, status : 200, json : async () => JSON.parse(text) };
};

// CONSOLE | captured per load
// ------------------------------------------------------------
const realLog = console.log, realWarn = console.warn;
let lines = [];
function captureOn()  { lines = []; console.log = (...a) => lines.push('log: ' + a.join(' ')); console.warn = (...a) => lines.push('warn: ' + a.join(' ')); }
function captureOff() { console.log = realLog; console.warn = realWarn; }

// LOAD | a fresh module instance each time (query string makes a new module record)
// ------------------------------------------------------------
let loadCount = 0;
async function load(root) {
    const href = pathToFileURL(join(root, MOD_REL)).href + '?load=' + (++loadCount);
    return import(href);
}
function packsJson(mod) {
    return JSON.stringify(mod.Na__LeHatch__GetPacks(), (key, value) => (/Cache$/.test(key) ? undefined : value));
}

// A RECORDING jsPDF STAND-IN
// ------------------------------------------------------------
function fakeDoc() {
    const calls = [];
    const rec = (name) => (...args) => { calls.push(name + '(' + args.map((a) => typeof a === 'number' ? Math.round(a * 1e6) / 1e6 : JSON.stringify(a)).join(',') + ')'); };
    const doc = { calls };
    [ 'saveGraphicsState', 'restoreGraphicsState', 'moveTo', 'lineTo', 'close', 'clip', 'discardPath', 'setDrawColor',
      'setLineWidth', 'setLineCap', 'setLineJoin', 'setLineDashPattern', 'setGState', 'line' ].forEach((n) => { doc[n] = rec(n); });
    doc.GState = (o) => ({ gstate : o });
    return doc;
}

async function main() {
    const tvRoot = join(HERE, 'tv');
    console.log('W1-17 acceptance check');
    console.log('  TrueVision (pin b2aa9151): ' + join(tvRoot, MOD_REL));
    console.log('  ValeVision               : ' + join(vvRoot, MOD_REL));
    console.log('');

    // EXPORTS
    const tv = await load(tvRoot);
    const vv = await load(vvRoot);
    const tvNames = Object.keys(tv).sort(), vvNames = Object.keys(vv).sort();
    check('exports identical (' + tvNames.length + ' names)', JSON.stringify(tvNames) === JSON.stringify(vvNames) && tvNames.length === 21,
          'TV ' + tvNames.join(',') + '\n        VV ' + vvNames.join(','));
    check('nothing loaded at import (IsLoaded false, no request, no console line)', !vv.Na__LeHatch__IsLoaded() && requests.length === 0);

    // LIBRARY LOAD FROM DISK
    mode = { kind : 'disk' };
    requests = []; captureOn(); await tv.Na__LeHatch__Ready(); captureOff();
    const tvLines = lines.slice(), tvRequests = requests.slice();
    requests = []; captureOn(); await vv.Na__LeHatch__Ready(); captureOff();
    const vvLines = lines.slice(), vvRequests = requests.slice();

    check('ValeVision library loads: every request answered (' + vvRequests.length + ' files, all 200)', vvRequests.length === 22 && vvRequests.every((r) => r.status === 200),
          JSON.stringify(vvRequests.filter((r) => r.status !== 200)));
    check('every request asks cache:no-store, as TrueVision\'s', vvRequests.every((r) => r.cache === 'no-store'));
    const packs = vv.Na__LeHatch__GetPacks();
    check('two packs, Construction Materials first, Site Plan second',
          packs.length === 2 && packs[0].Pack__Key === 'ConstructionMaterialHatches' && packs[1].Pack__Key === 'SitePlanHatches',
          JSON.stringify(packs.map((p) => p.Pack__Key)));
    check('14 + 5 patterns (19)', packs[0].Pack__Patterns.length === 14 && packs[1].Pack__Patterns.length === 5);
    check('the first pattern of the first pack is Brickwork (what Hatch with nothing chosen takes)',
          packs[0].Pack__Patterns[0].Pattern__Key === 'ConstructionHatch__Brickwork');
    check('Construction pack swatch ink #333333; Site Plan pack none', packs[0].Pack__SwatchInk === '#333333' && packs[1].Pack__SwatchInk === null);
    check('packs, order and every parsed pattern identical to TrueVision\'s', packsJson(tv) === packsJson(vv));
    check('request sequence identical to TrueVision\'s (same files, same order, serial)',
          JSON.stringify(tvRequests.map((r) => r.href.slice(r.href.indexOf('52__LayoutEditor__HatchPatternLibrary')))) ===
          JSON.stringify(vvRequests.map((r) => r.href.slice(r.href.indexOf('52__LayoutEditor__HatchPatternLibrary')))));
    check('console: one line, "[ValeVision3D] Hatch patterns: 19 pattern(s) in 2 pack(s)."',
          vvLines.length === 1 && vvLines[0] === 'log: [ValeVision3D] Hatch patterns: 19 pattern(s) in 2 pack(s).', JSON.stringify(vvLines));
    check('console identical to TrueVision\'s but for the app token',
          JSON.stringify(tvLines.map((l) => l.replace('[TrueVision3D', '[APP'))) === JSON.stringify(vvLines.map((l) => l.replace('[ValeVision3D', '[APP'))));

    // PAINTING PARITY, every pattern
    const keys = packs.flatMap((p) => p.Pack__Patterns.map((q) => q.Pattern__Key));
    let svgSame = 0, swatchSame = 0, polySame = 0, marksSame = 0, defSame = 0, pdfSame = 0, pdfHoleSame = 0, pdfDrawn = 0;
    for (const key of keys) {
        const a = tv.Na__LeHatch__Get(key), b = vv.Na__LeHatch__Get(key);
        const opts = { scale : 1.5, rotationDeg : 30, colour : '#123456', strokePt : 0.5 };
        if (tv.Na__LeHatch__SvgPaint({ pattern : a, ...opts }).defs === vv.Na__LeHatch__SvgPaint({ pattern : b, ...opts }).defs) svgSame++;
        if (tv.Na__LeHatch__SwatchMarkup(a, 80, 40, '#333333') === vv.Na__LeHatch__SwatchMarkup(b, 80, 40, '#333333')) swatchSame++;
        if (JSON.stringify(tv.Na__LeHatch__TilePolylines(a)) === JSON.stringify(vv.Na__LeHatch__TilePolylines(b))) polySame++;
        if (JSON.stringify(tv.Na__LeHatch__TileMarks(key)) === JSON.stringify(vv.Na__LeHatch__TileMarks(key))) marksSame++;
        if (tv.Na__LeHatch__PatternDef('p', a, { denominator : 500, scale : 2 }) === vv.Na__LeHatch__PatternDef('p', b, { denominator : 500, scale : 2 })) defSame++;
        const square = [[10, 10], [60, 10], [60, 50], [10, 50]];
        const da = fakeDoc(), db = fakeDoc();
        const ra = tv.Na__LeHatch__DrawPdf(da, square, { pattern : a, scale : 1, rotationDeg : 15 });
        const rb = vv.Na__LeHatch__DrawPdf(db, square, { pattern : b, scale : 1, rotationDeg : 15 });
        if (ra === rb && JSON.stringify(da.calls) === JSON.stringify(db.calls)) pdfSame++;
        if (rb === true && db.calls.some((c) => c.startsWith('line('))) pdfDrawn++;
        const holed = square.concat([[25, 20], [45, 20], [45, 40], [25, 40]]);
        const ha = fakeDoc(), hb = fakeDoc();
        const qa = tv.Na__LeHatch__DrawPdf(ha, holed, { pattern : a, holes : [4], strokePt : 0.35, colour : '#960000' });
        const qb = vv.Na__LeHatch__DrawPdf(hb, holed, { pattern : b, holes : [4], strokePt : 0.35, colour : '#960000' });
        if (qa === qb && JSON.stringify(ha.calls) === JSON.stringify(hb.calls) && hb.calls.includes('clip("evenodd")')) pdfHoleSame++;
    }
    const n = keys.length;
    check('SvgPaint identical for all ' + n + ' patterns', svgSame === n, svgSame + '/' + n);
    check('SwatchMarkup identical for all ' + n + ' patterns', swatchSame === n, swatchSame + '/' + n);
    check('TilePolylines identical for all ' + n + ' patterns', polySame === n, polySame + '/' + n);
    check('TileMarks identical for all ' + n + ' patterns', marksSame === n, marksSame + '/' + n);
    check('PatternDef (a site plan at 1:500) identical for all ' + n + ' patterns', defSame === n, defSame + '/' + n);
    check('DrawPdf call log identical for all ' + n + ' patterns, and every one stamps lines', pdfSame === n && pdfDrawn === n, pdfSame + '/' + n + ', drawn ' + pdfDrawn);
    check('DrawPdf with a hole (even-odd clip) identical for all ' + n + ' patterns', pdfHoleSame === n, pdfHoleSame + '/' + n);
    const lim = [ vv.Na__LeHatch__ClampStrokePt(''), vv.Na__LeHatch__ClampStrokePt(0), vv.Na__LeHatch__ClampStrokePt(99), vv.Na__LeHatch__CleanColour('red'), vv.Na__LeHatch__Token(null) ];
    check('clamps and token as TrueVision\'s (null, null, 20, null, hatch:none)', JSON.stringify(lim) === JSON.stringify([ null, null, 20, null, 'hatch:none' ]));

    // OVER HTTP (the local Flask server)
    if (httpBase) {
        const fresh = await load(vvRoot);
        const appRootHref = new URL('../../../', pathToFileURL(join(vvRoot, MOD_REL))).href;
        mode = { kind : 'http', appRootHref, base : httpBase.endsWith('/') ? httpBase : httpBase + '/' };
        requests = []; captureOn(); await fresh.Na__LeHatch__Ready(); captureOff();
        const httpLines = lines.slice();
        console.log('');
        console.log('  over HTTP: ' + mode.base);
        requests.forEach((r) => console.log('        ' + r.status + '  ' + r.href));
        check('HTTP: every file the module asks for answers 200 (' + requests.length + ')', requests.length === 22 && requests.every((r) => r.status === 200),
              JSON.stringify(requests.filter((r) => r.status !== 200)));
        check('HTTP: HatchLibrary__Index__.json is the first request and answers 200',
              requests.length > 0 && /52__LayoutEditor__HatchPatternLibrary\/HatchLibrary__Index__\.json$/.test(requests[0].href) && requests[0].status === 200);
        check('HTTP: the library the module loads is identical to the disk load', packsJson(fresh) === packsJson(vv));
        check('HTTP: console line as on disk', JSON.stringify(httpLines) === JSON.stringify(vvLines), JSON.stringify(httpLines));
    }

    console.log('');
    console.log('RESULT: ' + (failed ? 'FAIL' : 'PASS') + ' (' + passed + ' passed, ' + failed + ' failed)');
    process.exit(failed ? 1 : 0);
}

main().catch((error) => { captureOff(); console.error(error); process.exit(1); });
