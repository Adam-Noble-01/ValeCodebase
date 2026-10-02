// W1-06 scratch: walk the static import graph of one module (relative specifiers followed, bare ones listed).
// Usage: node graph_of.mjs <app-relative module path>
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

const APP = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const start = resolve(APP, process.argv[2]);
const seen = new Set();
const bare = new Map();
const missing = [];

function walk(file) {
    if (seen.has(file)) return;
    seen.add(file);
    if (!existsSync(file)) { missing.push(relative(APP, file)); return; }
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');
    for (const m of code.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
        const spec = m[1];
        if (spec.startsWith('.') || spec.startsWith('/')) walk(resolve(dirname(file), spec));
        else { if (!bare.has(spec)) bare.set(spec, []); bare.get(spec).push(relative(APP, file)); }
    }
}
walk(start);
console.log('modules : ' + seen.size);
console.log('bare    : ' + (bare.size ? [ ...bare.entries() ].map(([ s, f ]) => s + ' <- ' + f.slice(0, 3).join(', ')).join('\n          ') : 'none'));
console.log('missing : ' + (missing.length ? missing.join(', ') : 'none'));
