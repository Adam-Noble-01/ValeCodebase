// W2-40 scratch: a Node resolve hook that applies ValeVision's own import map (read out of
// index.html), so the ported modules can be linked and evaluated in Node exactly as the
// browser would resolve their bare specifiers ('three', 'three/addons/...').
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const html = readFileSync(join(VV, 'index.html'), 'utf8');
const m    = html.match(/<script type="importmap">\s*([\s\S]*?)<\/script>/);
const map  = JSON.parse(m[1]).imports;
const base = pathToFileURL(VV + '/').href;

export async function resolve(specifier, context, nextResolve) {
    if (map[specifier]) return { url : new URL(map[specifier], base).href, shortCircuit : true };
    const prefix = Object.keys(map).filter((k) => k.endsWith('/') && specifier.startsWith(k)).sort((a, b) => b.length - a.length)[0];
    if (prefix) return { url : new URL(map[prefix] + specifier.slice(prefix.length), base).href, shortCircuit : true };
    return nextResolve(specifier, context);
}
