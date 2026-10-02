// =============================================================================
// W2-15 scratch harness - module hooks (not shipped)
// =============================================================================
// - 'three' and 'three/addons/...' go to ValeVision's vendored three.js r184,
//   as index.html's import map sends them.
// - The SnapshotRenderer is loaded at its LIVE url with a query that picks the
//   source: ?w215=old  -> scratch/W2-15/preimage   (the file before W2-15)
//                ?w215=new  -> scratch/W2-15/candidate (the file W2-15 lands)
//                ?w215=live -> the live file on disk
//   so its relative imports resolve against the live tree either way.
// - Every import the SnapshotRenderer makes is replaced by a RECORDING FAKE
//   (w215fake:<real url>) exporting the real module's names, except the
//   modules listed in REAL, which load for real and are shared by both
//   copies: three, the section adapter and the Cross Sections tool (so both
//   copies cut, save and restore the same real tool), and the design-phase
//   library (real and uninitialised, as ValeVision3D runs it).
// =============================================================================

import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const VV        = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/';
const VENDOR    = VV + '04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/';
const THREE_URL = pathToFileURL(VENDOR + 'build/three.module.js').href;
const ADDONS    = pathToFileURL(VENDOR + 'examples/jsm/').href;
const HERE      = dirname(fileURLToPath(import.meta.url));
const SNAP      = pathToFileURL(VV + '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js').href;
const SOURCES   = {
    old : join(HERE, '..', 'preimage',  'Na__LayoutEditor__SnapshotRenderer__.js'),
    new : process.env.W215_NEWFILE || join(HERE, '..', 'candidate', 'Na__LayoutEditor__SnapshotRenderer__.js')   // <-- W215_NEWFILE: a planted-fault copy (w2_15_mutants.py)
};
const REAL = new Set([
    'Na__DrawView__SectionAdapter__.js',
    'Na__CrossSectionView__SystemLogic.js',
    'Na__ModelGroup__PhaseLibrary__.js'
]);
const ENHANCE = 'Na__LayoutEditor__Enhance__.js';

export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'three') return { url : THREE_URL, shortCircuit : true };
    if (specifier.startsWith('three/addons/')) return { url : ADDONS + specifier.slice('three/addons/'.length), shortCircuit : true };
    const parent = context.parentURL || '';
    const fromSnap    = parent.startsWith(SNAP + '?w215=');
    const fromEnhance = parent.startsWith('w215enh:');
    if ((fromSnap || fromEnhance) && (specifier.startsWith('./') || specifier.startsWith('../'))) {
        const base   = fromEnhance ? parent.slice('w215enh:'.length) : SNAP;
        const target = new URL(specifier, base).href;
        const name   = basename(fileURLToPath(target));
        if (fromSnap && name === ENHANCE && process.env.W215_REAL_ENHANCE === '1') return { url : 'w215enh:' + target, shortCircuit : true };
        if (fromSnap && REAL.has(name)) return nextResolve(specifier, { ...context, parentURL : SNAP });
        return { url : 'w215fake:' + target, shortCircuit : true };
    }
    if (specifier.startsWith('w215enh:') || specifier.startsWith('w215fake:')) return { url : specifier, shortCircuit : true };
    return nextResolve(specifier, context);
}

function ExportNames(source) {
    const names = [];
    const block = /export\s*\{([^}]*)\}/g;
    let m;
    while ((m = block.exec(source)) !== null) {
        m[1].split(',').forEach((raw) => {
            const part = raw.replace(/\/\/[^\n]*/g, '').trim();
            if (!part) return;
            const as = part.split(/\s+as\s+/);
            names.push((as[1] || as[0]).trim());
        });
    }
    const decl = /export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/g;
    while ((m = decl.exec(source)) !== null) names.push(m[1]);
    return [ ...new Set(names) ].filter((n) => /^[A-Za-z_$][\w$]*$/.test(n));
}

export async function load(url, context, nextLoad) {
    if (url.startsWith(SNAP + '?w215=')) {
        const which = new URL(url).searchParams.get('w215');
        if (which === 'live') return { format : 'module', source : readFileSync(fileURLToPath(SNAP), 'utf8'), shortCircuit : true };
        return { format : 'module', source : readFileSync(SOURCES[which], 'utf8'), shortCircuit : true };
    }
    if (url.startsWith('w215enh:')) {
        return { format : 'module', source : readFileSync(fileURLToPath(url.slice('w215enh:'.length)), 'utf8'), shortCircuit : true };
    }
    if (url.startsWith('w215fake:')) {
        const real  = url.slice('w215fake:'.length);
        const names = ExportNames(readFileSync(fileURLToPath(real), 'utf8'));
        const mod   = basename(fileURLToPath(real));
        const lines = names.map((n) => 'export const ' + n + ' = globalThis.__W215.bind(' + JSON.stringify(mod) + ', ' + JSON.stringify(n) + ');');
        return { format : 'module', source : lines.join('\n') + '\n', shortCircuit : true };
    }
    return nextLoad(url, context);
}
