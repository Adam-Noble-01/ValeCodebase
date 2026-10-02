// =============================================================================
// W0-17 scratch - Node resolve hook that applies index.html's import map
// =============================================================================
// Bare specifiers ("three", "three/addons/...") resolve exactly as the browser
// resolves them from VV/index.html's <script type="importmap">, so the real
// VV modules can be imported under Node for the start-up order harness.
// Read-only: it never writes anything.
// =============================================================================

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';

const APP_ROOT = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const html     = readFileSync(resolvePath(APP_ROOT, 'index.html'), 'utf8');
const match    = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
const imports  = match ? JSON.parse(match[1]).imports : {};

const exact  = new Map();
const prefix = [];
for (const [key, value] of Object.entries(imports)) {
    const url = pathToFileURL(resolvePath(APP_ROOT, value)).href + (value.endsWith('/') ? '/' : '');
    if (key.endsWith('/')) prefix.push([key, url]);
    else exact.set(key, url);
}
prefix.sort((a, b) => b[0].length - a[0].length);

export async function resolve(specifier, context, nextResolve) {
    if (exact.has(specifier)) return { url: exact.get(specifier), shortCircuit: true };
    for (const [key, url] of prefix) {
        if (specifier.startsWith(key)) return { url: url + specifier.slice(key.length), shortCircuit: true };
    }
    return nextResolve(specifier, context);
}
