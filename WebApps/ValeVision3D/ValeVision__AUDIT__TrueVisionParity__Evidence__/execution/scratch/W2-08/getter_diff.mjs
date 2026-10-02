// W2-08 - getter diff of Na__DrawCfg__* before and after the main-config edit (TV v2.30.2 method):
// every getter run four ways (neither call, Load alone, SetAppConfig alone, both), before vs after.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const VV      = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules';
const SCRATCH = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W2-08';
const MOD     = pathToFileURL(path.join(VV, '40__System__DrawingViewCore/Na__DrawView__ConfigState__.js')).href;
const SYSJSON = JSON.parse(readFileSync(path.join(VV, '40__System__DrawingViewCore/Na__DrawView__AppConfig__.json'), 'utf8'));
const BEFORE  = JSON.parse(readFileSync(path.join(SCRATCH, 'vv_before/Na__AppConfig__Main.json'), 'utf8'));
const AFTER   = JSON.parse(readFileSync(process.argv[2] || path.join(VV, '02__AppData/Na__AppConfig__Main.json'), 'utf8'));

globalThis.fetch = async () => ({ ok : true, status : 200, json : async () => structuredClone(SYSJSON) });

let n = 0;
async function run(appConfig, doSet, doLoad) {
    const m = await import(MOD + '?i=' + (n++));
    if (doSet)  m.Na__DrawCfg__SetAppConfig(structuredClone(appConfig));
    if (doLoad) await m.Na__DrawCfg__Load();
    const labels = {};
    for (const k of ['AddSceneRefusedMessage', 'DrawingsSavedMessage', 'DrawingsSaveFailedMessage', 'NoProjectMessage']) labels[k] = m.Na__DrawCfg__GetLabel(k, '<fb>');
    return {
        render     : m.Na__DrawCfg__GetRenderSetup(),
        material   : m.Na__DrawCfg__GetMaterialSetup(),
        section    : m.Na__DrawCfg__GetSectionSetup(),
        transition : m.Na__DrawCfg__GetTransitionSetup(),
        labels
    };
}

let diffs = 0;
for (const [name, set, load] of [['neither', false, false], ['Load', false, true], ['SetAppConfig', true, false], ['both', true, true]]) {
    const b = await run(BEFORE, set, load);
    const a = await run(AFTER,  set, load);
    for (const g of Object.keys(b)) for (const k of Object.keys(b[g])) {
        const same = JSON.stringify(b[g][k]) === JSON.stringify(a[g][k]);
        if (!same) { diffs++; console.log(`DIFF ${name} ${g}.${k}: ${JSON.stringify(b[g][k])} -> ${JSON.stringify(a[g][k])}`); }
    }
    if (name === 'both') console.log('both (app path):', JSON.stringify(a.render), JSON.stringify(a.transition));
}
console.log(diffs === 0 ? 'GETTER DIFF: 0 changes across 4 scenarios' : `GETTER DIFF: ${diffs} changes`);
process.exit(diffs === 0 ? 0 : 1);
