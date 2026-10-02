// List every module in the static import graph of one module (relative specifiers), app-root relative.
// Usage: node graph_list.mjs <module path>
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

const VV    = 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D';
const start = resolve(process.argv[2]);
const seen  = new Set();
const stack = [ start ];
const importRe = /(?:^|\n)\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
while (stack.length) {
    const file = stack.pop();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of text.matchAll(importRe)) if (m[1].startsWith('.')) stack.push(resolve(dirname(file), m[1]));
}
Array.from(seen).map((f) => relative(VV, f).split('\\').join('/')).sort().forEach((f) => console.log(f));
