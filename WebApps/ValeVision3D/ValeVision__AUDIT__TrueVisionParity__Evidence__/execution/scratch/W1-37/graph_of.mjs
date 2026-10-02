// Walk the static import graph of one module (relative specifiers only) and list bare specifiers met on the way.
// Usage: node graph_of.mjs <module path>
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

const start = resolve(process.argv[2]);
const seen  = new Set();
const bare  = new Map();
const missing = [];
const stack = [ start ];
const importRe = /(?:^|\n)\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!existsSync(file)) { missing.push(file); continue; }
    const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of text.matchAll(importRe)) {
        const spec = m[1];
        if (spec.startsWith('.') || spec.startsWith('/')) stack.push(resolve(dirname(file), spec));
        else { if (!bare.has(spec)) bare.set(spec, []); bare.get(spec).push(relative(dirname(start), file)); }
    }
}
console.log('modules: ' + seen.size);
console.log('missing: ' + (missing.length ? missing.join(', ') : 'none'));
console.log('bare specifiers: ' + (bare.size ? '' : 'none'));
bare.forEach((files, spec) => console.log('  ' + spec + '  <- ' + files.slice(0, 5).join(', ') + (files.length > 5 ? ' ...' : '')));
