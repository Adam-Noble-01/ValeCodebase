// =============================================================================
// W2-09 SCRATCH ACCEPTANCE - old (this app's pre-port copies) against new (the port)
// =============================================================================
//
// Usage:
//   node acceptance_w2_09.mjs [--new <tree root>]      (default: the live ValeVision app root)
//
// What it proves, beside TrueVision's own 23-check test:
// - ENHANCE, AS VALEVISION CALLS IT TODAY. The snapshot renderer calls
//   Na__LeEnhance__Apply(canvas) with no strength until package W2-15 replays
//   the enhancePct hunk. Old 1.0.0 and new 1.1.0 must make the same calls with
//   the same parameters for every setup, so no picture changes in the interim.
//   Strength 100 must equal the old pass too; strength 0 makes no call.
// - RENDER COMPOSITES, FOR EVERY KEY BUT ENHANCE WHITECARD. Old 1.1.0 with the
//   old config and new 1.3.0 with the new config give the same Rows, Row,
//   Clamp, Weight, Factor, IsOverridden, RasterToken (2D and 3D) and Token, so
//   no other control, record or cache key moves.
// - THE PERCENT ROW. Through the real record path - SheetModel__Viewports'
//   compositeWeights merge and SheetRecords' NormaliseCompositeWeights, their
//   source text taken from the live files - typing 40 stores
//   Viewport__CompositeWeights { enhanceWhitecard: 40 } and moves both the 2D
//   and the 3D raster tokens; out-of-range input clamps to 0..100.
// - THE FALLBACK. With the config fetch failing, the new built-in inventory
//   answers the same for every shared key, and adds TrueVision's depthFog
//   toggle row (no weight, no token) and the percent Enhance row.
// =============================================================================

import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE    = dirname(fileURLToPath(import.meta.url));
const VV_APP  = 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D';
const argNew  = process.argv.indexOf('--new');
const NEW_APP = argNew > 0 ? resolve(process.argv[argNew + 1]) : VV_APP;
const STYLES  = join('02__Src__AppModules', '51__System__LayoutEditor', '25__System__RenderStyles');
const SHEETDATA = join(VV_APP, '02__Src__AppModules', '51__System__LayoutEditor', '07__Core__SheetData');

const OLD = {
    enhance : join(HERE, 'vv_before', 'Na__LayoutEditor__Enhance__.js'),
    comp    : join(HERE, 'vv_before', 'Na__LayoutEditor__RenderComposites__.js'),
    config  : join(HERE, 'vv_before', 'Na__LayoutEditor__RenderComposites__Config__.json')
};
const NEW = {
    enhance : join(NEW_APP, STYLES, 'Na__LayoutEditor__Enhance__.js'),
    comp    : join(NEW_APP, STYLES, 'Na__LayoutEditor__RenderComposites__.js'),
    config  : join(NEW_APP, STYLES, 'Na__LayoutEditor__RenderComposites__Config__.json')
};

let failures = 0, passes = 0;
function check(name, ok, detail) {
    if (ok) passes++; else failures++;
    console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (!ok && detail !== undefined ? '  -> ' + JSON.stringify(detail).slice(0, 400) : ''));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const SCRATCH = mkdtempSync(join(tmpdir(), 'na-w2-09-'));
writeFileSync(join(SCRATCH, 'package.json'), '{ "type": "module" }');


// -----------------------------------------------------------------------------
// ENHANCE: the module under recording stubs, old and new side by side
// -----------------------------------------------------------------------------

async function loadEnhance(tag, source) {
    const base   = join(SCRATCH, 'enhance-' + tag);
    const styles = join(base, '51__System__LayoutEditor', '25__System__RenderStyles');
    const config = join(base, '51__System__LayoutEditor', '03__Core__Config');
    const effect = join(base, '30__System__ImageExport');
    [ styles, config, effect ].forEach((d) => mkdirSync(d, { recursive : true }));
    writeFileSync(join(effect, 'Na__ImageExport__PostProcessEffects__Levels.js'),
        'export function Na__PostProcess__ApplyLevels(canvas, params) { canvas.calls.push({ effect : "levels", params : params }); return canvas; }\n');
    writeFileSync(join(effect, 'Na__ImageExport__PostProcessEffects__HighPassSharpen.js'),
        'export function Na__PostProcess__ApplyHighPassSharpen(canvas, params) { canvas.calls.push({ effect : "sharpen", params : params }); return canvas; }\n');
    writeFileSync(join(config, 'Na__LayoutEditor__ConfigState__.js'),
        'let SETUP = null;\nexport function Na__Test__Set(next) { SETUP = next; }\nexport function Na__LeCfg__GetEnhanceSetup() { return SETUP; }\n');
    copyFileSync(source, join(styles, 'Na__LayoutEditor__Enhance__.js'));
    const mod = await import(pathToFileURL(join(styles, 'Na__LayoutEditor__Enhance__.js')).href);
    const cfg = await import(pathToFileURL(join(config, 'Na__LayoutEditor__ConfigState__.js')).href);
    return async (setup, ...args) => {
        cfg.Na__Test__Set(setup);
        const canvas = { calls : [] };
        const back = await mod.Na__LeEnhance__Apply(canvas, ...args);
        return { same : back === canvas, calls : canvas.calls };
    };
}

const appCfg  = JSON.parse(readFileSync(join(VV_APP, '02__Src__AppModules', '51__System__LayoutEditor', '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json'), 'utf8'))['LayoutEditor__Enhance__Config'];
const SHIPPED = {
    levelsBlack : appCfg['LayoutEditor__Enhance__LevelsBlack'], levelsWhite : appCfg['LayoutEditor__Enhance__LevelsWhite'],
    levelsGamma : appCfg['LayoutEditor__Enhance__LevelsGamma'], sharpenEnabled : appCfg['LayoutEditor__Enhance__SharpenEnabled'],
    sharpenRadius : appCfg['LayoutEditor__Enhance__SharpenRadius'], sharpenBlendMode : appCfg['LayoutEditor__Enhance__SharpenBlendMode'],
    sharpenOpacity : appCfg['LayoutEditor__Enhance__SharpenOpacity']
};
const SETUPS = {
    shipped        : SHIPPED,
    awkward        : { levelsBlack : 20, levelsWhite : 180, levelsGamma : 1.4, sharpenEnabled : true,  sharpenRadius : 2.0, sharpenBlendMode : 'Overlay',    sharpenOpacity : 0.8 },
    sharpenOff     : { levelsBlack : 5,  levelsWhite : 210, levelsGamma : 0.9, sharpenEnabled : false, sharpenRadius : 3.0, sharpenBlendMode : 'soft-light', sharpenOpacity : 0.5 },
    halfOpacity    : { levelsBlack : 0,  levelsWhite : 205, levelsGamma : 1.0, sharpenEnabled : true,  sharpenRadius : 1.5, sharpenBlendMode : 'Overlay',    sharpenOpacity : 0.5 }
};

console.log('W2-09 acceptance - old (pre-port) against new (' + NEW_APP + ')');
console.log('');
console.log('Enhance - the call ValeVision makes today, Apply(canvas) with no strength');
const oldApply = await loadEnhance('old', OLD.enhance);
const newApply = await loadEnhance('new', NEW.enhance);
for (const [name, setup] of Object.entries(SETUPS)) {
    const a = await oldApply(setup);
    const b = await newApply(setup);
    check('setup "' + name + '": no strength makes the same calls with the same parameters', same(a, b), { old : a, new : b });
    const c = await newApply(setup, 100);
    check('setup "' + name + '": strength 100 makes the same calls as the old pass', same(a, c), { old : a, new100 : c });
    const z = await newApply(setup, 0);
    check('setup "' + name + '": strength 0 makes no call and hands the canvas back', z.calls.length === 0 && z.same, z);
}
check('no canvas is handed back as is (null canvas) - old and new agree',
      (await (async () => { const o = await import(pathToFileURL(join(SCRATCH, 'enhance-old', '51__System__LayoutEditor', '25__System__RenderStyles', 'Na__LayoutEditor__Enhance__.js')).href);
                             const n = await import(pathToFileURL(join(SCRATCH, 'enhance-new', '51__System__LayoutEditor', '25__System__RenderStyles', 'Na__LayoutEditor__Enhance__.js')).href);
                             return (await o.Na__LeEnhance__Apply(null)) === null && (await n.Na__LeEnhance__Apply(null)) === null; })()));


// -----------------------------------------------------------------------------
// RENDER COMPOSITES: old 1.1.0 + old config against new 1.3.0 + new config
// -----------------------------------------------------------------------------

async function loadComposites(tag, source, configPath, fetchOk) {
    const dir = join(SCRATCH, 'comp-' + tag, '51__System__LayoutEditor', '25__System__RenderStyles');
    mkdirSync(dir, { recursive : true });
    copyFileSync(source, join(dir, 'Na__LayoutEditor__RenderComposites__.js'));
    copyFileSync(configPath, join(dir, 'Na__LayoutEditor__RenderComposites__Config__.json'));
    globalThis.fetch = async (url) => fetchOk
        ? { ok : true, status : 200, json : async () => JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) }
        : { ok : false, status : 404, json : async () => null };
    const mod = await import(pathToFileURL(join(dir, 'Na__LayoutEditor__RenderComposites__.js')).href);
    const warn = console.warn; console.warn = () => {};
    await mod.Na__LeComposite__Ready();
    console.warn = warn;
    return mod;
}

// THE REAL RECORD PATH, from the live files' own text.
function extract(text, startMarker, endMarker) {
    const s = text.indexOf(startMarker);
    const e = text.indexOf(endMarker, s);
    if (s < 0 || e < 0) throw new Error('marker not found: ' + startMarker);
    return text.slice(s, e + endMarker.length);
}
const recText   = readFileSync(join(SHEETDATA, 'Na__LayoutEditor__SheetRecords__.js'), 'utf8').replace(/\r\n/g, '\n');
const modelText = readFileSync(join(SHEETDATA, 'Na__LayoutEditor__SheetModel__Viewports__.js'), 'utf8').replace(/\r\n/g, '\n');
const normaliseSrc = extract(recText, 'function Na__LeRec__NormaliseCompositeWeights(block) {', '\n    }\n');
const mergeSrc     = extract(modelText, 'if (patch.compositeWeights) {', '\n        }\n');
function recordPath(mod) {
    const normalise = new Function('Na__LeComposite__Row', 'Na__LeComposite__Clamp', normaliseSrc + '\nreturn Na__LeRec__NormaliseCompositeWeights;')(mod.Na__LeComposite__Row, mod.Na__LeComposite__Clamp);
    const merge     = new Function('Na__LeComposite__FIELD', 'Na__LeComposite__Clamp', 'return function (viewport, patch) {\n' + mergeSrc + '\n};')(mod.Na__LeComposite__FIELD, mod.Na__LeComposite__Clamp);
    return { normalise, merge };
}

function surface(mod, keys) {
    const values = [ undefined, null, NaN, -1, 0, 0.05, 0.1, 0.5, 1, 1.234567, 2, 2.5, 3, 4, 7.9, 8, 9, 50, 100, 400, '2', 'x' ];
    const views  = [ null, {}, { Viewport__CompositeWeights : null }, { Viewport__CompositeWeights : {} } ];
    keys.forEach((k) => values.forEach((v) => { const w = {}; w[k] = v; views.push({ Viewport__CompositeWeights : w }); }));
    views.push({ Viewport__CompositeWeights : { profileLinework : 2, sectionOutline : 3.5, baseImage : 1.25, projectedLinework : 1.5, hiddenLines : 0.5 } });
    views.push({ Viewport__CompositeWeights : { profileLinework : 2, unknownKey : 4 } });
    const out = {};
    keys.forEach((k) => {
        out[k] = {
            row     : mod.Na__LeComposite__Row(k),
            clamp   : values.map((v) => mod.Na__LeComposite__Clamp(k, v)),
            weight  : views.map((vp) => mod.Na__LeComposite__Weight(vp, k)),
            factor  : views.map((vp) => mod.Na__LeComposite__Factor(vp, k)),
            overrid : views.map((vp) => mod.Na__LeComposite__IsOverridden(vp, k))
        };
    });
    out.raster2d = views.map((vp) => mod.Na__LeComposite__RasterToken(vp));
    out.raster3d = views.map((vp) => mod.Na__LeComposite__RasterToken(vp, true));
    out.token    = views.map((vp) => mod.Na__LeComposite__Token(vp));
    return out;
}

const SHARED = [ 'projectedLinework', 'profileLinework', 'sectionOutline', 'hiddenLines', 'glassOpaque', 'whitecard', 'baseImage', 'contextLayer', 'nothingLikeThis' ];

for (const [label, fetchOk] of [ [ 'config fetched', true ], [ 'config fetch failed (built-in inventory)', false ] ]) {
    console.log('');
    console.log('Render Composites - ' + label);
    const oldMod = await loadComposites('old-' + fetchOk, OLD.comp, OLD.config, fetchOk);
    const newMod = await loadComposites('new-' + fetchOk, NEW.comp, NEW.config, fetchOk);

    check('the export lists are identical', same(Object.keys(oldMod).sort(), Object.keys(newMod).sort()), { old : Object.keys(oldMod), new : Object.keys(newMod) });
    check('FIELD is still Viewport__CompositeWeights', newMod.Na__LeComposite__FIELD === 'Viewport__CompositeWeights');

    const oldRows = oldMod.Na__LeComposite__Rows(), newRows = newMod.Na__LeComposite__Rows();
    const strip   = (rows) => rows.filter((r) => r.key !== 'enhanceWhitecard' && r.key !== 'depthFog');
    check('every row but Enhance Whitecard (and the fallback\'s Depth Fog) is identical, in the same order', same(strip(oldRows), strip(newRows)), { old : strip(oldRows), new : strip(newRows) });
    const fogRows = newRows.filter((r) => r.key === 'depthFog');
    if (fetchOk) check('the fetched config has no depthFog row yet (W2-12 adds it)', fogRows.length === 0, fogRows);
    else         check('the built-in inventory carries TrueVision\'s depthFog toggle first, with no weight',
                       newRows[0].key === 'depthFog' && newRows[0].toggle === true && newRows[0].twoDOnly === true && newRows[0].weight.kind === 'none', newRows[0]);
    const enh = newMod.Na__LeComposite__Row('enhanceWhitecard');
    check('Enhance Whitecard is a percent weight 0..100, default 100, step 5, labelled Strength, toggle kept',
          !!enh && enh.toggle === true && enh.twoDOnly === false && enh.weight.kind === 'percent' && enh.weight.value === 100 && enh.weight.min === 0
          && enh.weight.max === 100 && enh.weight.step === 5 && enh.weight.label === 'Strength' && enh.weight.twoDOnly !== true, enh);
    check('the old copy had no weight on it', oldMod.Na__LeComposite__Row('enhanceWhitecard').weight.kind === 'none');
    check('toggle rows: the same keys apart from the fallback\'s Depth Fog',
          same(oldMod.Na__LeComposite__ToggleRows().map((r) => r.key), newMod.Na__LeComposite__ToggleRows().map((r) => r.key).filter((k) => k !== 'depthFog')));
    const oldW = oldMod.Na__LeComposite__WeightRows().map((r) => r.key);
    const newW = newMod.Na__LeComposite__WeightRows().map((r) => r.key);
    check('weight rows: the old list plus Enhance Whitecard, in drawing order',
          same(newW.filter((k) => k !== 'enhanceWhitecard'), oldW) && newW.indexOf('enhanceWhitecard') === newW.indexOf('baseImage') - 1,
          { old : oldW, new : newW });

    const a = surface(oldMod, SHARED), b = surface(newMod, SHARED);
    SHARED.forEach((k) => check('key ' + k + ': Row, Clamp, Weight, Factor and IsOverridden answer identically', same(a[k], b[k]), { old : a[k], new : b[k] }));
    check('raster tokens (2D) identical for every viewport without an Enhance weight', same(a.raster2d, b.raster2d), { old : a.raster2d, new : b.raster2d });
    check('raster tokens (3D) identical for every viewport without an Enhance weight', same(a.raster3d, b.raster3d), { old : a.raster3d, new : b.raster3d });
    check('the full token identical for every viewport', same(a.token, b.token));

    // THE PERCENT ROW THROUGH THE REAL RECORD PATH ---------------------------
    const path = recordPath(newMod);
    const vp = { Viewport__CompositeWeights : null };
    path.merge(vp, { compositeWeights : { enhanceWhitecard : '40' } });          // <-- The panel hands the typed text over as it stands
    check('typing 40 stores Viewport__CompositeWeights { enhanceWhitecard: 40 }', same(vp.Viewport__CompositeWeights, { enhanceWhitecard : 40 }), vp);
    check('the normaliser keeps it on load and save', same(path.normalise(vp.Viewport__CompositeWeights), { enhanceWhitecard : 40 }));
    check('Weight reads it back as 40', newMod.Na__LeComposite__Weight(vp, 'enhanceWhitecard') === 40);
    check('IsOverridden lights the reset arrow', newMod.Na__LeComposite__IsOverridden(vp, 'enhanceWhitecard') === true);
    check('the 2D raster token moves to enhanceWhitecard:40', newMod.Na__LeComposite__RasterToken(vp) === 'enhanceWhitecard:40', newMod.Na__LeComposite__RasterToken(vp));
    check('the 3D raster token moves to enhanceWhitecard:40', newMod.Na__LeComposite__RasterToken(vp, true) === 'enhanceWhitecard:40', newMod.Na__LeComposite__RasterToken(vp, true));
    const mixed = { Viewport__CompositeWeights : { sectionOutline : 3, enhanceWhitecard : 40, projectedLinework : 2 } };
    check('beside a 2D-only pixel weight and a factor, 2D keys both raster weights and 3D only the Enhance one',
          newMod.Na__LeComposite__RasterToken(mixed) === 'enhanceWhitecard:40|sectionOutline:3' && newMod.Na__LeComposite__RasterToken(mixed, true) === 'enhanceWhitecard:40',
          [ newMod.Na__LeComposite__RasterToken(mixed), newMod.Na__LeComposite__RasterToken(mixed, true) ]);
    path.merge(vp, { compositeWeights : { enhanceWhitecard : '400' } });
    check('typing 400 clamps to 100', vp.Viewport__CompositeWeights.enhanceWhitecard === 100, vp);
    path.merge(vp, { compositeWeights : { enhanceWhitecard : '-5' } });
    check('typing -5 clamps to 0 (the pass then skips both effects)', vp.Viewport__CompositeWeights.enhanceWhitecard === 0, vp);
    path.merge(vp, { compositeWeights : { enhanceWhitecard : null } });
    check('the reset arrow (null) removes the override, and the tokens go back to empty',
          same(vp.Viewport__CompositeWeights, {}) && newMod.Na__LeComposite__RasterToken(vp) === '' && newMod.Na__LeComposite__RasterToken(vp, true) === '', vp);
    check('a stored legacy weight on the old copy was dropped by the normaliser (it had no weight kind)',
          recordPath(oldMod).normalise({ enhanceWhitecard : 40 }) === null);
    check('a viewport never touched still keys exactly as before (empty tokens)',
          newMod.Na__LeComposite__RasterToken({ Viewport__CompositeWeights : null }) === '' && newMod.Na__LeComposite__Token({}) === '');
}

rmSync(SCRATCH, { recursive : true, force : true });
console.log('');
console.log(failures === 0 ? '  PASS - ' + passes + '/' + passes + ' checks.' : '  FAIL - ' + failures + ' of ' + (passes + failures) + ' checks did not pass.');
process.exit(failures === 0 ? 0 : 1);
