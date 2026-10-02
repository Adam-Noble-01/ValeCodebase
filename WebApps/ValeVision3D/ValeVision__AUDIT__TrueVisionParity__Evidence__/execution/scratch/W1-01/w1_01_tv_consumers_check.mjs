// =============================================================================
// W1-01 scratch - acceptance 1: every name TrueVision's North CompassGizmo, the
// Drawing Planes files, the Layout Editor SnapshotRenderer and ModelSource
// import from the four W1-01 modules is exported by ValeVision's live module.
// =============================================================================
// TrueVision is read only at b2aa9151 (git show). The four ValeVision modules
// are LOADED (not grepped) from the live tree, through module hooks that stub
// their own imports, and their real export lists are compared.
//
// Usage: node w1_01_tv_consumers_check.mjs
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';

const NAWEB    = 'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb';
const TVAPP    = 'na-apps/30__TrueVision__CoreAppCode/';
const PIN      = 'b2aa9151';
const APP_ROOT = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const SRC      = '02__Src__AppModules/';
const BASE     = 'http://localhost:8000/ValeVision3D/';
const MODULES  = {
    [SRC + '05__RenderPipeline/Na__RenderLoop__Invalidation.js']                         : 'Invalidation',
    [SRC + '05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js']                : 'InteractiveOverlays',
    [SRC + '26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js']    : 'ModelToggle',
    [SRC + '26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js']          : 'PhaseLibrary'
};

const git = (...args) => execFileSync('git', [ '-C', NAWEB, ...args ], { encoding : 'utf8', maxBuffer : 64 * 1024 * 1024 });
const planes = git('ls-tree', '-r', '--name-only', PIN, TVAPP + SRC + '47__System__DrawingPlanes/').split('\n').filter((f) => f.endsWith('.js')).map((f) => f.slice(TVAPP.length));
const CONSUMERS = [
    SRC + '46__System__NorthDirection/Na__North__CompassGizmo__.js',
    ...planes,
    SRC + '51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js',
    SRC + '51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ModelSource__.js'
];

// LOAD THE FOUR LIVE MODULES (their own imports stubbed; PhaseLibrary gets ValeVision's real MultiModel)
const real = { [SRC + '15__ModelLoader/Na__ModelLoader__MultiModel.js'] : join(APP_ROOT, SRC, '15__ModelLoader/Na__ModelLoader__MultiModel.js') };
Object.keys(MODULES).forEach((rel) => { real[rel] = join(APP_ROOT, rel); });
const parseNamed = (source) => {
    const out = []; const re = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g; let m;
    while ((m = re.exec(source))) out.push({ names : m[1].split(',').map((p) => p.replace(/\/\/.*$/gm, '').trim()).filter(Boolean).map((p) => p.split(/\s+as\s+/)[0].trim()), spec : m[2] });
    const star = /import\s*\*\s*as\s+\w+\s*from\s*['"]([^'"]+)['"]/g;
    while ((m = star.exec(source))) out.push({ names : [], spec : m[1] });
    return out;
};
const stubs = {};
Object.entries(real).forEach(([ rel, file ]) => {
    parseNamed(readFileSync(file, 'utf8')).forEach(({ names, spec }) => {
        const tgt = (spec.startsWith('.')) ? new URL(spec, 'http://x/' + rel).pathname.slice(1) : '__bare__/' + spec;
        if (real[tgt]) return;
        const lines = stubs[tgt] ? [ stubs[tgt] ] : [ "function __s(p){const t=function(){};return new Proxy(t,{get(x,k){if(k==='then'||typeof k==='symbol')return undefined;return __s(p+'.'+String(k));},apply(){return __s(p+'()');},construct(){return __s('new '+p);},set(){return true;}});}", "export default __s('default');" ];
        names.forEach((n) => { if (!lines.join('\n').includes('export const ' + n + ' ')) lines.push('export const ' + n + " = __s('" + n + "');"); });
        stubs[tgt] = lines.join('\n');
    });
});
const tmp = mkdtempSync(join(tmpdir(), 'na-w101c-'));
writeFileSync(join(tmp, 'hooks.mjs'), [
    "import { readFileSync } from 'node:fs';", 'let S;', 'export async function initialize(d) { S = d; }',
    'export async function resolve(spec, ctx, next) { const p = ctx.parentURL || "";',
    '  if (p.startsWith(S.base)) { if (spec.startsWith(".")) return { url : new URL(spec, p).href, shortCircuit : true }; return { url : S.base + "__bare__/" + encodeURIComponent(spec), shortCircuit : true }; }',
    '  if (spec.startsWith(S.base)) return { url : spec, shortCircuit : true }; return next(spec, ctx); }',
    'export async function load(url, ctx, next) { if (!url.startsWith(S.base)) return next(url, ctx);',
    '  const rel = decodeURIComponent(url.slice(S.base.length).split("?")[0]);',
    '  if (S.real[rel]) return { format : "module", source : readFileSync(S.real[rel], "utf8"), shortCircuit : true };',
    '  if (S.stubs[rel]) return { format : "module", source : S.stubs[rel] + "\\n", shortCircuit : true };',
    '  throw new Error("no file and no stub for " + rel); }'
].join('\n'));
register(pathToFileURL(join(tmp, 'hooks.mjs')).href, { parentURL : import.meta.url, data : { base : BASE, real, stubs } });
globalThis.window = { dispatchEvent() { return true; }, addEventListener() {}, removeEventListener() {} };
const exportsOf = {};
for (const rel of Object.keys(MODULES)) exportsOf[rel] = new Set(Object.keys(await import(BASE + rel)));

// CHECK EVERY CONSUMER IMPORT FROM THE FOUR MODULES
let passed = 0, failed = 0;
const lines = [ 'W1-01 acceptance 1 - TrueVision consumers (read at ' + PIN + ') against the live ValeVision modules' ];
for (const consumer of CONSUMERS) {
    const source = git('show', PIN + ':' + TVAPP + consumer);
    parseNamed(source).forEach(({ names, spec }) => {
        if (!spec.startsWith('.')) return;
        const target = new URL(spec, 'http://x/' + consumer).pathname.slice(1);
        if (!MODULES[target]) return;
        names.forEach((name) => {
            const ok = exportsOf[target].has(name);
            if (ok) passed++; else failed++;
            lines.push('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + consumer.replace(SRC, '') + '  imports ' + name + '  from ' + MODULES[target]);
        });
    });
}
lines.push('', passed + ' imported name(s) resolved, ' + failed + ' missing');
rmSync(tmp, { recursive : true, force : true });
console.log(lines.join('\n'));
process.exit(failed === 0 && passed > 0 ? 0 : 1);
