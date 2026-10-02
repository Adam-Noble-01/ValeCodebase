// W2-06 scratch harness: acceptance item 4 (first half) - a view definition built OUTSIDE the Layout Editor (no
// fourth argument) carries DoorPose null, and its RecordHash, Fingerprint and CacheKey equal the ones the old
// ValeVision ViewDefinition 1.0.0 computes for the same record. Both versions run against the SAME stub data
// modules (so the comparison isolates ViewDefinition's own code), over every plan and elevation record in the
// local project.json files that carry drawings, plus synthetic records covering styles, overrides and tokens.
//
// usage: node hash_harness.mjs <old ViewDefinition .js> <new ViewDefinition .js>

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [ oldPath, newPath ] = process.argv.slice(2);

const STUBS = {
    units : `export function Na__Math__ConvertMmToUnits(mm) { return Number(mm) / 1000; }`,
    fp    : `
        const flagsOf = (r) => { const s = (r && r.FloorPlan__Styles) || {}; return {
            projectedLinework : s.Styles__ProjectedLinework !== false, hiddenLines : s.Styles__HiddenLines === true, glassOpaque : s.Styles__GlassOpaque === true }; };
        export function Na__FpData__GetFloorPlans() { return globalThis.__PLANS || []; }
        export function Na__FpData__GetCutHeightMm(p) { return Number(p.FloorPlan__CutHeightMm ?? 1200); }
        export function Na__FpData__GetViewDepthMm(p) { const v = p.FloorPlan__ViewDepthMm; return v == null ? null : Number(v); }
        export function Na__FpData__GetStyles(p) { return flagsOf(p); }
        export function Na__FpData__GetExcludeTokens(p) { return Array.isArray(p.FloorPlan__ExcludeCategoryTokens) ? p.FloorPlan__ExcludeCategoryTokens.slice() : null; }`,
    el    : `
        const flagsOf = (r) => { const s = (r && r.Elevation__Styles) || {}; return {
            projectedLinework : s.Styles__ProjectedLinework !== false, hiddenLines : s.Styles__HiddenLines === true, glassOpaque : s.Styles__GlassOpaque === true }; };
        export function Na__ElevData__GetElevations() { return globalThis.__ELEVS || []; }
        export function Na__ElevData__GetAxes(e) { const a = (Number(e.Elevation__AzimuthDeg) || 0) * Math.PI / 180;
            return { Right : { x : Math.cos(a), y : 0, z : -Math.sin(a) }, Up : { x : 0, y : 1, z : 0 }, Normal : { x : Math.sin(a), y : 0, z : Math.cos(a) } }; }
        export function Na__ElevData__GetPlaneDistanceMm(e) { const o = e.Elevation__PlaneOriginMm || {}; return Number(o.x || 0) + Number(o.z || 0); }
        export function Na__ElevData__GetViewDepthMm(e) { const v = e.Elevation__ViewDepthMm; return v == null ? null : Number(v); }
        export function Na__ElevData__IsSection(e) { return e.Elevation__Mode === 'section'; }
        export function Na__ElevData__GetStyles(e) { return flagsOf(e); }
        export function Na__ElevData__GetExcludeTokens(e) { return Array.isArray(e.Elevation__ExcludeCategoryTokens) ? e.Elevation__ExcludeCategoryTokens.slice() : null; }`,
    fpMode : `export function Na__FloorPlanMode__GetActivePlan() { return null; }`,
    elMode : `export function Na__ElevationMode__GetActiveElevation() { return null; }`,
    cfg    : `export function Na__PlCfg__GetDefaultExclusionTokens() { return ['Planting', 'Trees', 'People', 'Vehicles', 'Furniture', 'Decor']; }`
};

function stage(label, src) {
    const dir = join(HERE, 'tmp', 'hash_' + label);
    mkdirSync(dir, { recursive : true });
    for (const [ name, text ] of Object.entries(STUBS)) writeFileSync(join(dir, name + '.mjs'), text);
    let code = readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
    const map = [
        [ /from '\.\.\/04__MathUtils\/Na__Math__Units\.js'/, "from './units.mjs'" ],
        [ /from '\.\.\/42__System__FloorPlanViews\/Na__FloorPlan__ProjectJson__Data__\.js'/, "from './fp.mjs'" ],
        [ /from '\.\.\/45__System__ElevationViews\/Na__Elevation__ProjectJson__Data__\.js'/, "from './el.mjs'" ],
        [ /from '\.\.\/42__System__FloorPlanViews\/Na__FloorPlan__ModeController__\.js'/, "from './fpMode.mjs'" ],
        [ /from '\.\.\/45__System__ElevationViews\/Na__Elevation__ModeController__\.js'/, "from './elMode.mjs'" ],
        [ /from '\.\/Na__ProjectedLinework__ConfigAccess__\.js'/, "from './cfg.mjs'" ]
    ];
    for (const [ re, to ] of map) {
        if (!re.test(code)) throw new Error(label + ': import not found ' + re);
        code = code.replace(re, to);
    }
    if (/from '\.\.?\//.test(code.replace(/from '\.\/(units|fp|el|fpMode|elMode|cfg)\.mjs'/g, ''))) throw new Error(label + ': an unmapped relative import is left');
    writeFileSync(join(dir, 'ViewDefinition.mjs'), code);
    return import(pathToFileURL(join(dir, 'ViewDefinition.mjs')).href);
}

// Records: every plan and elevation in the local project.json files, plus synthetic variants.
const PROJECTS = 'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/Projects/2026';
const plans = [], elevs = [];
for (const name of readdirSync(PROJECTS)) {
    const file = join(PROJECTS, name, 'project.json');
    if (!existsSync(file)) continue;
    let data; try { data = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    const dd = data.LayoutEditor__DrawingsData || {};
    (dd.LayoutEditor__DrawingsData__FloorPlans || []).forEach((p) => plans.push(p));
    (dd.LayoutEditor__DrawingsData__Elevations || []).forEach((e) => elevs.push(e));
}
const realCounts = { plans : plans.length, elevations : elevs.length };
for (let i = 0; i < 8; i++) {
    plans.push({ FloorPlan__Id : 'syn-p' + i, FloorPlan__Name : 'P' + i, FloorPlan__CutHeightMm : 900 + i * 700, FloorPlan__ViewDepthMm : i % 2 ? 3000 : null,
        FloorPlan__Styles : { Styles__GlassOpaque : i % 2 === 0, Styles__HiddenLines : i % 3 === 0, Styles__ProjectedLinework : i !== 5 },
        FloorPlan__ExcludeCategoryTokens : i % 4 === 0 ? [ 'Furniture', '=ValeVision__Vegetation' ] : null });
    elevs.push({ Elevation__Id : 'syn-e' + i, Elevation__Name : 'E' + i, Elevation__AzimuthDeg : i * 45, Elevation__Mode : i % 2 ? 'section' : 'elevation',
        Elevation__PlaneOriginMm : { x : i * 1000, y : 0, z : -i * 500 }, Elevation__ViewDepthMm : i % 3 ? 8000 : null,
        Elevation__Styles : { Styles__GlassOpaque : i % 2 === 1, Styles__HiddenLines : i % 2 === 0 },
        Elevation__ExcludeCategoryTokens : i % 3 === 0 ? [ 'People' ] : null });
}
globalThis.__PLANS = plans; globalThis.__ELEVS = elevs;

const OLD = await stage('old', oldPath);
const NEW = await stage('new', newPath);
const OVERRIDES = [ undefined, null, { glassOpaque : true }, { hiddenLines : true, glassOpaque : false }, { projectedLinework : false } ];
const EXTRA = [ undefined, null, [ '=ValeVision__MainBuildingModel__Existing' ] ];
const FPS = [ undefined, 'no-model', 'abc123-ff' ];

let checks = 0, failures = 0;
function same(label, a, b) { checks++; if (a !== b) { failures++; if (failures < 20) console.log('  FAIL ' + label + ': ' + a + ' != ' + b); } }

for (const [ kind, list, oldFn, newFn ] of [ [ 'plan', plans, OLD.Na__PlView__FromPlan, NEW.Na__PlView__FromPlan ],
                                              [ 'elevation', elevs, OLD.Na__PlView__FromElevation, NEW.Na__PlView__FromElevation ] ]) {
    for (const record of list) {
        for (const over of OVERRIDES) for (const extra of EXTRA) {
            const a = oldFn(record, over, extra);
            const b = newFn(record, over, extra);
            const id = kind + ' ' + (record.FloorPlan__Id || record.Elevation__Id);
            checks++; if (b.DoorPose !== null) { failures++; console.log('  FAIL ' + id + ': DoorPose not null'); }
            same(id + ' RecordHash', a.RecordHash, b.RecordHash);
            same(id + ' Styles', JSON.stringify(a.Styles), JSON.stringify(b.Styles));
            const { DoorPose, ...rest } = b;
            same(id + ' definition (bar DoorPose)', JSON.stringify(a), JSON.stringify(rest));
            for (const fp of FPS) {
                same(id + ' Fingerprint', OLD.Na__PlView__Fingerprint(a, fp), NEW.Na__PlView__Fingerprint(b, fp));
                same(id + ' CacheKey', OLD.Na__PlView__CacheKey(a, fp), NEW.Na__PlView__CacheKey(b, fp));
            }
        }
    }
}
// The bake set and the active drawing, as the pipeline and the Dev menu build them (no pose).
const allOld = OLD.Na__PlView__FromAllDrawings(), allNew = NEW.Na__PlView__FromAllDrawings();
same('FromAllDrawings length', allOld.length, allNew.length);
allNew.forEach((d, i) => { checks++; if (d.DoorPose !== null) failures++; same('FromAllDrawings ' + i + ' RecordHash', allOld[i].RecordHash, d.RecordHash); });
// A posed definition (Layout Editor only) must hash differently - the pose is folded in.
const p0 = plans[0];
checks++; if (NEW.Na__PlView__FromPlan(p0, null, null, { Closed : [], Swings : true }).RecordHash === NEW.Na__PlView__FromPlan(p0).RecordHash) { failures++; console.log('  FAIL posed plan hashes like the unposed one'); }
checks++; if (NEW.Na__PlView__FromElevation(elevs[0], null, null, { Shut : true }).RecordHash === NEW.Na__PlView__FromElevation(elevs[0]).RecordHash) { failures++; console.log('  FAIL shut elevation hashes like the unposed one'); }

console.log('records: real ' + JSON.stringify(realCounts) + ', all plans ' + plans.length + ', all elevations ' + elevs.length);
console.log(failures === 0 ? 'PASS - ' + checks + ' checks' : 'FAIL - ' + failures + ' of ' + checks + ' checks');
process.exit(failures === 0 ? 0 : 1);
