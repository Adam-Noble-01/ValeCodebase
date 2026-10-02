// W2-28 scratch: resolve the bare specifiers of VV's index.html import map in node, as the browser does.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const html = readFileSync(path.join(VV, 'index.html'), 'utf8');
const map  = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const keys = Object.keys(map).sort((a, b) => b.length - a.length);

export async function resolve(specifier, context, next) {
    for (const key of keys) {
        const hit = key.endsWith('/') ? specifier.startsWith(key) : specifier === key;
        if (hit) {
            const rest = key.endsWith('/') ? specifier.slice(key.length) : '';
            return next(pathToFileURL(path.join(VV, map[key], rest)).href, context);
        }
    }
    return next(specifier, context);
}
