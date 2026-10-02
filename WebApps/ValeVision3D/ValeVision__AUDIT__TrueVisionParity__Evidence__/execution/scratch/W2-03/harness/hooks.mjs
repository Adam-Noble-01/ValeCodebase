// =============================================================================
// W2-03 scratch harness - module hooks (not shipped)
// =============================================================================
// resolve: 'three' and 'three/addons/...' go to ValeVision's vendored three.js
//          r184, exactly as index.html's import map sends them.
// load   : a LIVE module url carrying the query '?old' is answered with that
//          file's PRE-IMAGE from ../backup/ (the bytes this package found), so
//          the old and the new RenderPreset / TiledRenderer can run side by side
//          in one process; their relative imports resolve against the live tree
//          and share its module instances.
// =============================================================================

import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const VV        = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/';
const VENDOR    = VV + '04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/';
const THREE_URL = pathToFileURL(VENDOR + 'build/three.module.js').href;
const ADDONS    = pathToFileURL(VENDOR + 'examples/jsm/').href;
const HERE      = dirname(fileURLToPath(import.meta.url));
const VV_URL    = pathToFileURL(VV).href;

export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'three') return { url : THREE_URL, shortCircuit : true };
    if (specifier.startsWith('three/addons/')) return { url : ADDONS + specifier.slice('three/addons/'.length), shortCircuit : true };
    return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
    if (url.endsWith('?old') && url.startsWith(VV_URL)) {
        const rel    = decodeURIComponent(url.slice(VV_URL.length, -4));
        const backup = join(HERE, '..', 'backup', rel.split('/').join('__'));
        return { format : 'module', source : readFileSync(backup, 'utf8'), shortCircuit : true };
    }
    return nextLoad(url, context);
}
