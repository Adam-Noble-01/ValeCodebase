// =============================================================================
// W2-02 scratch harness - module hooks (not shipped)
// =============================================================================
// resolve: the bare specifiers 'three' and 'three/addons/...' go to ValeVision's
//          vendored three.js r184, exactly as index.html's import map sends them.
// load   : with W202_STAGED=1, the two files this package edits are read from
//          ../staged/ but keep their LIVE url, so their relative imports still
//          resolve against the live tree (a pre-landing run of the same checks).
// =============================================================================

import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const VV        = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/';
const VENDOR    = VV + '04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/';
const THREE_URL = pathToFileURL(VENDOR + 'build/three.module.js').href;
const ADDONS    = pathToFileURL(VENDOR + 'examples/jsm/').href;
const HERE      = dirname(fileURLToPath(import.meta.url));

const STAGED = {
    [pathToFileURL(VV + '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js').href]      : join(HERE, '..', 'staged', 'Na__DrawView__SectionAdapter__.js'),
    [pathToFileURL(VV + '02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js').href] : join(HERE, '..', 'staged', 'Na__CrossSectionView__SystemLogic.js')
};

export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'three') return { url : THREE_URL, shortCircuit : true };
    if (specifier.startsWith('three/addons/')) return { url : ADDONS + specifier.slice('three/addons/'.length), shortCircuit : true };
    return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
    if (process.env.W202_STAGED === '1' && STAGED[url]) {
        return { format : 'module', source : readFileSync(STAGED[url], 'utf8'), shortCircuit : true };
    }
    return nextLoad(url, context);
}
