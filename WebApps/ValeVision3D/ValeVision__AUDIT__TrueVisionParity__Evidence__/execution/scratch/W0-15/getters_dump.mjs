// W0-15 scratch: load the real ConfigState units from a folder, answer their one
// fetch with the folder's own AppConfig (or a 404 for the fallback run), call
// every getter the barrel exports with no argument, and write the answers.
// Usage: node getters_dump.mjs <folder> <out.json> [--fallback]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = resolve(process.argv[2]);
const outPath = process.argv[3];
const FALLBACK = process.argv.indexOf('--fallback') !== -1;
globalThis.fetch = async (url) => {
    const name = String(url).split('/').pop();
    if (FALLBACK) return { ok : false, status : 404, json : async () => { throw new Error('404'); } };
    const text = readFileSync(resolve(dir, decodeURIComponent(name)), 'utf8');
    return { ok : true, status : 200, json : async () => JSON.parse(text) };
};
const warn = console.warn; console.warn = () => {};
const C = await import(pathToFileURL(resolve(dir, 'Na__LayoutEditor__ConfigState__.js')).href + '?v=' + Math.random());
C.Na__LeCfg__SetAppConfig({ LayoutEditor__Config : { LayoutEditor__Config__ReadOnlyOnWeb : true } });
await C.Na__LeCfg__Ready();
console.warn = warn;
const out = {};
Object.keys(C).sort().forEach((name) => {
    if (!/^Na__LeCfg__(Get|Is)/.test(name) || /^Na__LeCfg__IsCopyDragKey$|^Na__LeCfg__IsPointerModifierBound$/.test(name)) return;
    if (name === 'Na__LeCfg__GetLabel') return;
    try { out[name] = C[name](); } catch (e) { out[name] = 'THREW ' + e.message; }
});
out['GetLabel(SpecificationTab)'] = C.Na__LeCfg__GetLabel('SpecificationTab', '?');
out['GetLabel(MeasureOffsetAgain)'] = C.Na__LeCfg__GetLabel('MeasureOffsetAgain', '?fallback');
out['GetLabel(LayoutModeLabel)'] = C.Na__LeCfg__GetLabel('LayoutModeLabel', '?');
out['GetLabel(SitePlanNoData)'] = C.Na__LeCfg__GetLabel('SitePlanNoData', '?');
out['StatusToStore("")'] = C.Na__LeCfg__StatusToStore('');
out['PtToMm(1)'] = C.Na__LeCfg__PtToMm(1);
writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf8');
console.log('getters', Object.keys(out).length, '->', outPath);
