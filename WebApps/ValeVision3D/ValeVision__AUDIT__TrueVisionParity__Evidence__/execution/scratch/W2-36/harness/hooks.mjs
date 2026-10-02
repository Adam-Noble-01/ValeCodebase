// W2-36 harness: every relative import of the panel under test becomes a generated stub module whose
// exports are read from globalThis.__W236 (the probe fills it before importing the panel). Nothing of the
// editor is loaded but the panel itself, so the probe sees exactly what the panel asks of its neighbours.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PANEL = process.env.W236_PANEL;   // file URL of the panel under test
let names = null;

function importNames() {
    if (names) return names;
    names = {};
    const src = readFileSync(fileURLToPath(PANEL), 'utf8');
    const re = /import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(src))) {
        const base = m[2].split('/').pop();
        names[base] = (names[base] || []).concat(m[1].split(',').map((s) => s.trim()).filter(Boolean));
    }
    return names;
}

export async function resolve(specifier, context, next) {
    if (context.parentURL === PANEL && (specifier.startsWith('./') || specifier.startsWith('../'))) {
        return { url : 'w236stub:' + specifier.split('/').pop(), shortCircuit : true };
    }
    return next(specifier, context);
}

export async function load(url, context, next) {
    if (url.startsWith('w236stub:')) {
        const base = url.slice('w236stub:'.length);
        const list = importNames()[base] || [];
        const source = list.map((n) => 'export const ' + n + ' = globalThis.__W236.get(' + JSON.stringify(n) + ', ' + JSON.stringify(base) + ');').join('\n');
        return { format : 'module', source, shortCircuit : true };
    }
    return next(url, context);
}
