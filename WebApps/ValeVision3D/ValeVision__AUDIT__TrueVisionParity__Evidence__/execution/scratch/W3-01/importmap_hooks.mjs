// Resolve bare specifiers through ValeVision3D's index.html import map (scratch test helper for W3-01).
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VV   = path.resolve(HERE, '../../../..');
const html = readFileSync(path.resolve(VV, 'index.html'), 'utf8');
const map  = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const base = pathToFileURL(VV + '/').href;

export async function resolve(specifier, context, next) {
    if (Object.prototype.hasOwnProperty.call(map, specifier)) return { url : new URL(map[specifier], base).href, shortCircuit : true };
    for (const key of Object.keys(map)) {
        if (key.endsWith('/') && specifier.startsWith(key)) return { url : new URL(map[key] + specifier.slice(key.length), base).href, shortCircuit : true };
    }
    return next(specifier, context);
}
