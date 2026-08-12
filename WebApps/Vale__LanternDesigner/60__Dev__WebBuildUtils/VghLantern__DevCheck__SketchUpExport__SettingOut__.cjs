// Runs the real geometry brain and the real setting-out encoder against a real
// project lantern, and reports the linework the SketchUp payload would carry.
// No browser, no fetches: the loaders that need the network are absent and the
// geometry modules fall back to their documented constants, which is exactly the
// path they are written for.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const APP = path.join(__dirname, '..');
const MOD = path.join(APP, '02__Src__AppModules');

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

// -- merged app config, as the ConfigLoader would assemble it ----------------
const appConfig = Object.assign(
    {},
    readJson(path.join(MOD, '02__AppData/VghLantern__AppConfig__Main__.json')),
    readJson(path.join(MOD, '02__AppData/Na__PbrMaterials__Config.json')),
    readJson(path.join(MOD, '06__Env3d__ThreeRenderPipeline/Na__Env3d__Config.json')),
    readJson(path.join(MOD, '80__System__SketchUpExport/Na__SketchUpExport__Config.json'))
);

// -- the lantern under test --------------------------------------------------
const projectPath = path.join(APP, '07__LocalProjectData/VghLantern__ProjectFile__3010__Walkers_Palace__.json');
const project = readJson(projectPath);
const lantern = project['VghLantern__ProjectFile__Lanterns'][0];

// -- sandbox -----------------------------------------------------------------
const sandbox = { console, Math, JSON, Date, isNaN, parseInt, parseFloat, Number, String, Array, Object };
sandbox.window = sandbox;
sandbox.VghLantern__AppCore__StateManager = {
    VghLantern__StateManager__GetAppConfig: () => appConfig
};
sandbox.VghLantern__AppCore__ConfigLoader = {
    VghLantern__ConfigLoader__RequireNumber: (s, k) => (s && typeof s[k] === 'number') ? s[k] : 0,
    VghLantern__ConfigLoader__RequireString: (s, k) => (s && typeof s[k] === 'string') ? s[k] : '',
    VghLantern__ConfigLoader__RequireArray:  (s, k) => (s && Array.isArray(s[k])) ? s[k] : []
};
vm.createContext(sandbox);

const load = rel => vm.runInContext(fs.readFileSync(path.join(MOD, rel), 'utf8'), sandbox, { filename: rel });

[
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__RoofPitchCalculator__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__BaseFrameAssembly__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__SkeletonSolver__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__GlazeBarLayout__.js',
    '04__MathUtils__LanternGeometry/VghLantern__Geometry__SettingOutModel__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__SweepGeometry__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__PartFactory__.js',
    '80__System__SketchUpExport/VghLantern__SketchUpExport__Encoders__SettingOut__.js'
].forEach(load);

// -- solve -------------------------------------------------------------------
const skeleton = sandbox.VghLantern__Geometry__SkeletonSolver.VghLantern__SkeletonSolver__Solve(lantern);
const barSet   = sandbox.VghLantern__Geometry__GlazeBarLayout.VghLantern__GlazeBarLayout__Layout(skeleton, lantern);

const title = lantern['Lantern__Identity__Config']['Lantern__Identity__Config__Title'];
console.log(`Lantern: ${title}  ${skeleton.Meta.WidthMm} x ${skeleton.Meta.DepthMm} mm at ${skeleton.Meta.PitchDegrees} deg`);
console.log(`Solved: ${skeleton.Members.length} members, ${skeleton.Faces.length} faces, ${barSet.Bars.length} bars\n`);

// -- encode the setting out --------------------------------------------------
const result = sandbox.VghLantern__SketchUpExport__Encoders__SettingOut
    .VghLantern__SketchUpExport__Encoders__SettingOut(skeleton, barSet, lantern);

// -- report ------------------------------------------------------------------
const byGroup = {};
let totalPolylines = 0, totalPoints = 0;
result.Parts.forEach(part => {
    const g = part.GroupKey || '(ungrouped)';
    byGroup[g] = byGroup[g] || { entities: 0, polylines: 0 };
    byGroup[g].entities++;
    byGroup[g].polylines += part.Polylines.length;
    totalPolylines += part.Polylines.length;
    part.Polylines.forEach(pl => { totalPoints += pl.Points.length; });
});

console.log('LINEWORK BY CLASS');
Object.keys(byGroup).sort().forEach(g => {
    const t = result.Tags.find(t => t.Name.endsWith(g));
    const style = t ? `${t.LineStyle || 'Solid'}  rgb(${t.ColorRgb.join(',')})` : 'NO TAG';
    console.log(`  ${g.padEnd(28)} ${String(byGroup[g].entities).padStart(3)} groups, ${String(byGroup[g].polylines).padStart(4)} polylines   ${style}`);
});
console.log(`\n  ${result.Parts.length} entity groups, ${totalPolylines} polylines, ${totalPoints} points`);
console.log(`  ${result.Tags.length} setting out tags`);

// -- assertions --------------------------------------------------------------
let failures = 0;
const check = (label, ok, detail) => {
    console.log(`${ok ? 'PASS ' : 'FAIL '} ${label}${detail ? '  ' + detail : ''}`);
    if (!ok) failures++;
};

console.log('');
check('every part carries a tag key',
    result.Parts.every(p => p.TagKey && p.TagKey.length > 0));
check('every tag key resolves to a declared tag',
    result.Parts.every(p => result.Tags.some(t => t.Key === p.TagKey)));
check('every polyline has at least two points',
    result.Parts.every(p => p.Polylines.every(pl => pl.Points.length >= 2)));
check('no coordinate is NaN',
    result.Parts.every(p => p.Polylines.every(pl => pl.Points.every(pt =>
        pt.every(v => typeof v === 'number' && !isNaN(v))))));
check('construction triangles are closed 3-point rings',
    result.Parts.filter(p => p.Attributes.SetOutClass === 'Construction')
        .every(p => p.Polylines.every(pl => pl.Closed === true && pl.Points.length === 3)));
check('centrelines are open segments',
    result.Parts.filter(p => p.Attributes.SetOutClass === 'Centreline')
        .every(p => p.Polylines.every(pl => pl.Closed === false)));

const triangles = result.Parts.filter(p => p.Attributes.SetOutClass === 'Construction');
check('every triangle carries its measured run, rise and hypotenuse',
    triangles.every(p => typeof p.Attributes.MeasuredRunMm === 'number'
                      && typeof p.Attributes.MeasuredRiseMm === 'number'
                      && typeof p.Attributes.MeasuredHypotMm === 'number'),
    `(${triangles.length} triangles)`);

// Pythagoras on each triangle's own emitted corners: the geometry written to the
// file must agree with the numbers written beside it.
let worstDelta = 0;
triangles.forEach(p => {
    const [foot, corner, head] = p.Polylines[0].Points;
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    worstDelta = Math.max(worstDelta,
        Math.abs(d(foot, corner) - p.Attributes.MeasuredRunMm),
        Math.abs(d(corner, head) - p.Attributes.MeasuredRiseMm),
        Math.abs(d(head, foot)   - p.Attributes.MeasuredHypotMm));
});
check('emitted triangle corners agree with their stated run, rise and hypotenuse',
    worstDelta < 0.01, `(worst ${worstDelta.toFixed(4)} mm)`);

if (result.Checks) {
    console.log('');
    console.log(`DATUM CHECKS  ${result.Checks.CheckSummary}`);
    check('all datum checks agree', result.Checks.AllChecksAgree === true,
        `(${result.Checks.ChecksFailed} failed, ${result.Checks.ChecksUnpublished} unpublished)`);
}

// -- Na__DataLib construction linework standard -------------------------------
// The colours in the SketchUp standard were transposed from this application's
// own setting-out styles. Nothing enforces that at runtime, so it is enforced
// here: a colour changed in one place and not the other is a silent divergence
// that would only surface as a wrong-coloured datum in a model months later.
const DATALIB = 'C:/Users/adamw/AppData/Roaming/SketchUp/SketchUp 2026/SketchUp/Plugins/Na__Common__DataLib__CoreSuEntityStandards';
console.log('');

if (!fs.existsSync(DATALIB)) {
    console.log('SKIP  Na__DataLib is not installed on this machine - standard cross-check skipped.');
} else {
    const edgeSsot = readJson(path.join(DATALIB, 'Na__DataLib__CoreIndex__EdgeMaterials__.json'));
    const tagsSsot = readJson(path.join(DATALIB, 'Na__DataLib__CoreIndex__Tags__.json'));
    const standard = (edgeSsot['Na__DataLib__CoreIndex__ConstructionLinework'] || {})['MTE300__ConstructionLineSeries__'];

    if (!standard) {
        console.log('SKIP  DataLib carries no ConstructionLinework object yet.');
    } else {
        const byStyleKey = {};
        Object.values(standard).forEach(e => { byStyleKey[e.SourceStyleKey] = e; });

        const appStyles = appConfig['VghLantern__Env3d__Config']['VghLantern__Env3d__Config__SetOut'].LineStyles;
        const legalDashes = tagsSsot.LineStyleReference.AvailableLineStyles;
        const PATTERN_TO_DASH = { solid: 'Solid Basic', dotted: 'Dot', dashed: 'Dash', dashDot: 'Dash dot' };

        const appKeys = Object.keys(appStyles);
        check('every app setting out style has a DataLib standard entry',
            appKeys.every(k => byStyleKey[k]),
            `(${appKeys.filter(k => !byStyleKey[k]).join(', ') || 'none missing'})`);

        const colourMismatches = appKeys.filter(k => byStyleKey[k] &&
            byStyleKey[k].HexValue.toUpperCase() !== appStyles[k].Colour.toUpperCase());
        check('DataLib colours match the app colours', colourMismatches.length === 0,
            colourMismatches.length ? `(${colourMismatches.join(', ')})` : `(${appKeys.length} classes)`);

        const dashMismatches = appKeys.filter(k => byStyleKey[k] &&
            byStyleKey[k].Layout__LineStyleName !== PATTERN_TO_DASH[appStyles[k].Pattern]);
        check('DataLib line types match the app patterns', dashMismatches.length === 0,
            dashMismatches.length ? `(${dashMismatches.join(', ')})` : '');

        const illegal = Object.values(standard)
            .map(e => e.Layout__LineStyleName)
            .filter(n => !legalDashes.includes(n));
        check('every line style name is legal per LineStyleReference',
            illegal.length === 0,
            illegal.length ? `(illegal: ${[...new Set(illegal)].join(', ')})` : `(checked against ${legalDashes.length} names)`);

        const swapOff = tagsSsot.ExportExclusions.AdvancedSwapOffTagNames || [];
        const unprotected = Object.values(standard)
            .map(e => e.Tag__SketchUpName)
            .filter(t => !swapOff.includes(t));
        check('every setting out tag is protected from the Edge Painter swap-off',
            unprotected.length === 0,
            unprotected.length ? `(unprotected: ${unprotected.join(', ')})` : '');

        // The exporter's own fallback mapping must not drift from the standard.
        const exportCfg = appConfig['VghLantern__SketchUpExport__Config__SettingOut'].PatternToLineStyle;
        check('exporter fallback dash mapping matches the standard',
            Object.keys(PATTERN_TO_DASH).every(p => exportCfg[p] === PATTERN_TO_DASH[p]),
            `(${JSON.stringify(exportCfg)})`);
    }
}

console.log('');
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
