// =============================================================================
// W1-09 scratch - module load and behaviour parity for the four landed 49 modules
// =============================================================================
//
// Copies the LIVE ValeVision folder 49 (the four .js modules and the AppConfig JSON) and TrueVision's copies of
// the same files (scratch/W1-09/tv, read at b2aa9151) into two temporary ES-module trees, imports both, and checks:
//   1. every module evaluates in Node, and its export list equals TrueVision's;
//   2. ConfigState: with no config loaded every getter answers the shipped JSON's values (the fallbacks mirror the
//      JSON), Load() reads the landed JSON (fetch stood in by a disk read), the values do not move, and a failed
//      fetch warns with this app's console prefix;
//   3. RecordData: a record with no block gains Elevation__DepthFog, off, with the defaults; a settled record is
//      left alone (same object); Write settles End past Depth; FLOORPLAN key; identical answers to TrueVision's;
//   4. Maths and Shader: the same exports answer identically for a sweep of inputs (Shader: identical source).
//
// Usage: node module_load.mjs        Exit 0 = all checks passed.
// Writes only to the OS temp folder (removed at the end).
// =============================================================================

import { copyFileSync, mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE    = dirname(fileURLToPath(import.meta.url));
const VV_FOG  = resolve(HERE, '..', '..', '..', '..', '02__Src__AppModules', '49__System__ElevationDepthFog');
const TV_FOG  = join(HERE, 'tv', '02__Src__AppModules', '49__System__ElevationDepthFog');
const FILES   = [ 'Na__ElevationDepthFog__AppConfig__.json', 'Na__ElevationDepthFog__ConfigState__.js',
                  'Na__ElevationDepthFog__Maths__.js', 'Na__ElevationDepthFog__RecordData__.js',
                  'Na__ElevationDepthFog__Shader__.js' ];
const MODULES = [ 'ConfigState', 'Maths', 'RecordData', 'Shader' ];

let failures = 0, passes = 0;
function check(name, passed, detail) {
    if (passed) passes++; else failures++;
    console.log((passed ? '  PASS  ' : '  FAIL  ') + name + ((!passed && detail !== undefined) ? '  -> ' + JSON.stringify(detail) : ''));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function makeTree(fromDir, label) {
    const dir = mkdtempSync(join(tmpdir(), 'na-w1-09-' + label + '-'));
    writeFileSync(join(dir, 'package.json'), '{ "type": "module" }\n');
    FILES.forEach((f) => copyFileSync(join(fromDir, f), join(dir, f)));
    return dir;
}

// Console capture (to see the prefix a failed fetch warns with)
const warnings = [];
const realWarn = console.warn;
console.warn = (...args) => { warnings.push(args.map(String).join(' ')); };

// fetch stand-in: a file: URL is read from disk; 'fail' mode throws as an unreachable config would
let fetchMode = 'disk';
globalThis.fetch = async (url) => {
    if (fetchMode === 'fail') throw new TypeError('stand-in: config unreachable');
    const text = readFileSync(fileURLToPath(url), 'utf8');
    return { ok : true, status : 200, json : async () => JSON.parse(text) };
};

const vvDir = makeTree(VV_FOG, 'vv');
const tvDir = makeTree(TV_FOG, 'tv');
const load  = async (dir, name) => import(pathToFileURL(join(dir, 'Na__ElevationDepthFog__' + name + '__.js')).href);

try {
    const vv = {}, tv = {};
    for (const name of MODULES) { vv[name] = await load(vvDir, name); tv[name] = await load(tvDir, name); }

    console.log('\n1. Modules evaluate, exports equal TrueVision\'s');
    for (const name of MODULES) {
        check(name + ' evaluates with ' + Object.keys(vv[name]).length + ' exports', Object.keys(vv[name]).length > 0);
        check(name + ' export list equals TrueVision\'s', same(Object.keys(vv[name]).sort(), Object.keys(tv[name]).sort()),
              { vv : Object.keys(vv[name]).sort(), tv : Object.keys(tv[name]).sort() });
    }
    check('Maths has TrueVision\'s 18 exports', Object.keys(vv.Maths).length === 18, Object.keys(vv.Maths).length);

    console.log('\n2. ConfigState - fallbacks mirror the landed JSON; Load reads it; a failed fetch warns as ValeVision3D');
    const cfg   = vv.ConfigState;
    const json  = JSON.parse(readFileSync(join(VV_FOG, 'Na__ElevationDepthFog__AppConfig__.json'), 'utf8'));
    const before = { d : cfg.Na__ElevFogCfg__GetDefaults(), l : cfg.Na__ElevFogCfg__GetLimits(), a : cfg.Na__ElevFogCfg__GetAppearance(),
                     on : cfg.Na__ElevFogCfg__IsEnabled(), cap : cfg.Na__ElevFogCfg__GetLabel('Caption', '?') };
    const D = json.ElevationDepthFog__Defaults__Config, L = json.ElevationDepthFog__Limits__Config, A = json.ElevationDepthFog__Appearance__Config;
    check('fallback defaults = JSON defaults', same(before.d, { enabled : D.ElevationDepthFog__Defaults__Enabled, startDepthMm : D.ElevationDepthFog__Defaults__StartDepthMm,
          endDepthMm : D.ElevationDepthFog__Defaults__EndDepthMm, falloffPercent : D.ElevationDepthFog__Defaults__FalloffPercent }), before.d);
    check('fallback limits = JSON limits', same(before.l, { maxDepthMm : L.ElevationDepthFog__Limits__MaxDepthMm, minBandMm : L.ElevationDepthFog__Limits__MinBandMm,
          depthStepMm : L.ElevationDepthFog__Limits__DepthStepMm, falloffStepPercent : L.ElevationDepthFog__Limits__FalloffStepPercent,
          falloffEdgePercent : L.ElevationDepthFog__Limits__FalloffEdgePercent }), before.l);
    check('fallback appearance = JSON appearance', same(before.a, { colour : A.ElevationDepthFog__Appearance__Colour, maxOpacity : A.ElevationDepthFog__Appearance__MaxOpacity,
          edgeGuardPx : A.ElevationDepthFog__Appearance__EdgeGuardPx, emptyReachPx : A.ElevationDepthFog__Appearance__EmptyReachPx }), before.a);
    check('switched on before the fetch settles', before.on === true);
    const loaded = await cfg.Na__ElevFogCfg__Load();
    check('Load() reads the landed JSON and reports enabled', loaded === true && cfg.Na__ElevFogCfg__IsEnabled() === true);
    check('Load() is one fetch (the same promise twice)', cfg.Na__ElevFogCfg__Load() === cfg.Na__ElevFogCfg__Load());
    check('nothing moves once the JSON is read (defaults, limits, appearance)',
          same(before.d, cfg.Na__ElevFogCfg__GetDefaults()) && same(before.l, cfg.Na__ElevFogCfg__GetLimits()) && same(before.a, cfg.Na__ElevFogCfg__GetAppearance()));
    check('labels come from the JSON (Caption "Fog")', cfg.Na__ElevFogCfg__GetLabel('Caption', '?') === 'Fog');
    check('FormatLabel fills the readout', cfg.Na__ElevFogCfg__FormatLabel('ReadoutOn', '?', { start : 1000, end : 15000, falloff : 50 })
          === 'fog from 1000 to 15000 mm behind the plane - 50% by half way');

    // A failed fetch, on a fresh copy of ConfigState (module state is per URL, so a query string gives a new instance)
    fetchMode = 'fail';
    const fresh = await import(pathToFileURL(join(vvDir, 'Na__ElevationDepthFog__ConfigState__.js')).href + '?fail');
    const failed = await fresh.Na__ElevFogCfg__Load();
    check('a failed fetch still answers usable (true, built-in defaults)', failed === true && same(fresh.Na__ElevFogCfg__GetDefaults(), before.d));
    check('...and warns with [ValeVision3D], never [TrueVision3D]',
          warnings.some((w) => w.startsWith('[ValeVision3D] Elevation depth fog config unreadable')) && !warnings.some((w) => w.indexOf('[True' + 'Vision3D') !== -1), warnings);
    fetchMode = 'disk';

    console.log('\n3. RecordData - written on first read (off), left alone when settled, Write settles the band');
    const data = vv.RecordData, tvData = tv.RecordData;
    check('KEY_ELEVATION is Elevation__DepthFog', data.Na__ElevFogData__KEY_ELEVATION === 'Elevation__DepthFog');
    check('KEY_FLOORPLAN is FloorPlan__DepthFog', data.Na__ElevFogData__KEY_FLOORPLAN === 'FloorPlan__DepthFog');
    const record = { Elevation__Name : 'South West Elevation' };
    const first = data.Na__ElevFogData__Ensure(record, data.Na__ElevFogData__KEY_ELEVATION);
    check('a record with no block gains one, OFF, with the defaults', same(record.Elevation__DepthFog,
          { DepthFog__Enabled : false, DepthFog__StartDepthMm : 1000, DepthFog__EndDepthMm : 15000, DepthFog__FalloffPercent : 50 }), record.Elevation__DepthFog);
    check('...and Ensure answers the four settled values', same(first, { enabled : false, startDepthMm : 1000, endDepthMm : 15000, falloffPercent : 50 }), first);
    const held = record.Elevation__DepthFog;
    data.Na__ElevFogData__Read(record, data.Na__ElevFogData__KEY_ELEVATION);
    check('a settled record is left alone (the SAME block object)', record.Elevation__DepthFog === held);
    const wrote = data.Na__ElevFogData__Write(record, data.Na__ElevFogData__KEY_ELEVATION, { enabled : true, startDepthMm : 20000 });
    check('Write: Depth typed past End pushes End out by the least band', wrote.enabled === true && wrote.startDepthMm === 20000 && wrote.endDepthMm === 20100, wrote);
    check('...into the SAME block object', record.Elevation__DepthFog === held && held.DepthFog__EndDepthMm === 20100);
    check('a null record answers the defaults and writes nothing', same(data.Na__ElevFogData__Ensure(null, 'Elevation__DepthFog'), first));

    // Differential against TrueVision's RecordData on a sweep of stored blocks and patches
    const blocks = [ undefined, null, 'fog', [ 1 ], {}, { DepthFog__Enabled : true }, { DepthFog__Enabled : 1, DepthFog__StartDepthMm : 2500 },
                     { DepthFog__StartDepthMm : 9000, DepthFog__EndDepthMm : 3000 }, { DepthFog__StartDepthMm : -5, DepthFog__EndDepthMm : 999999, DepthFog__FalloffPercent : 250 },
                     { DepthFog__Enabled : true, DepthFog__StartDepthMm : 1200.6, DepthFog__EndDepthMm : 1250.2, DepthFog__FalloffPercent : 12.5 } ];
    const patches = [ null, {}, { enabled : true }, { enabled : 'yes' }, { startDepthMm : 50000 }, { endDepthMm : 10 }, { falloffPercent : -3 },
                      { enabled : false, startDepthMm : 0, endDepthMm : 0, falloffPercent : 100 }, { startDepthMm : NaN, endDepthMm : 'x' } ];
    let identical = 0, total = 0;
    for (const block of blocks) {
        for (const patch of patches) {
            const a = { Elevation__DepthFog : (block && typeof block === 'object') ? JSON.parse(JSON.stringify(block)) : block };
            const b = { Elevation__DepthFog : (block && typeof block === 'object') ? JSON.parse(JSON.stringify(block)) : block };
            const ra = [ data.Na__ElevFogData__Ensure(a, 'Elevation__DepthFog'), data.Na__ElevFogData__Write(a, 'Elevation__DepthFog', patch), a ];
            const rb = [ tvData.Na__ElevFogData__Ensure(b, 'Elevation__DepthFog'), tvData.Na__ElevFogData__Write(b, 'Elevation__DepthFog', patch), b ];
            total++; if (same(ra, rb)) identical++;
        }
    }
    check('RecordData answers exactly as TrueVision\'s (' + identical + '/' + total + ' block x patch cases)', identical === total);

    console.log('\n4. Maths and Shader - identical to TrueVision\'s');
    const m = vv.Maths, tm = tv.Maths;
    let mSame = 0, mTotal = 0;
    const settingsList = [ null, { enabled : true, startDepthMm : 1000, endDepthMm : 11000, falloffPercent : 50 },
                           { enabled : true, startDepthMm : 0, endDepthMm : 100, falloffPercent : 0 }, { enabled : false, startDepthMm : 1, endDepthMm : 2, falloffPercent : 100 } ];
    for (const s of settingsList) {
        for (const mm of [ -1000, 0, 999, 1000, 2500, 6000, 11000, 50000, NaN ]) {
            for (const edge of [ undefined, 0.5, 0, 49, 60 ]) {
                for (const ceil of [ undefined, 1, 0.8, 2, -1 ]) {
                    mTotal++; if (Object.is(m.Na__ElevFogMath__DensityAtDepth(mm, s, edge, ceil), tm.Na__ElevFogMath__DensityAtDepth(mm, s, edge, ceil))) mSame++;
                }
            }
        }
        mTotal++; if (m.Na__ElevFogMath__Token(s, { colour : '#ABCDEF', maxOpacity : 0.9 }) === tm.Na__ElevFogMath__Token(s, { colour : '#ABCDEF', maxOpacity : 0.9 })) mSame++;
    }
    for (const hex of [ '#ffffff', 'F4EFE6', 'fog', '', null, ' #000000 ' ]) { mTotal++; if (same(m.Na__ElevFogMath__ParseColour(hex), tm.Na__ElevFogMath__ParseColour(hex))) mSame++; }
    for (let v = -0.1; v <= 1.1; v += 0.05) { mTotal++; if (Object.is(m.Na__ElevFogMath__SrgbToLinear(v), tm.Na__ElevFogMath__SrgbToLinear(v))) mSame++; }
    check('Maths answers exactly as TrueVision\'s (' + mSame + '/' + mTotal + ' calls)', mSame === mTotal);
    check('Shader VERTEX source is TrueVision\'s, character for character', vv.Shader.Na__ElevFogShader__VERTEX === tv.Shader.Na__ElevFogShader__VERTEX);
    check('Shader FRAGMENT source is TrueVision\'s, character for character (v2.103.0 included)',
          vv.Shader.Na__ElevFogShader__FRAGMENT === tv.Shader.Na__ElevFogShader__FRAGMENT
          && vv.Shader.Na__ElevFogShader__FRAGMENT.indexOf('else                      premultiplied = min(premultiplied, vec3(alpha));') !== -1);
} catch (error) {
    failures++;
    console.log('  FAIL  unexpected error: ' + (error && error.stack || error));
} finally {
    console.warn = realWarn;
    rmSync(vvDir, { recursive : true, force : true });
    rmSync(tvDir, { recursive : true, force : true });
}

console.log('\n' + (failures === 0 ? 'ALL ' + passes + ' CHECKS PASSED.' : failures + ' check(s) FAILED, ' + passes + ' passed.'));
process.exit(failures === 0 ? 0 : 1);
