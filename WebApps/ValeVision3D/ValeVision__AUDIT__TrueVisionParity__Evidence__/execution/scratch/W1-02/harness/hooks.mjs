// Resolve hook for the W1-02 harness: the bare specifier 'three' maps to ValeVision's
// vendored three.js build, exactly as index.html's import map does in the browser.
import { pathToFileURL } from 'node:url';

const THREE_URL = pathToFileURL('D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.module.js').href;

export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'three') return { url: THREE_URL, shortCircuit: true };
    return nextResolve(specifier, context);
}
