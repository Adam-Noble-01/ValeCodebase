// W1-26 scratch: which modules joined the app's module graph with this package, and the import chain that
// links ShapeGeometry through the Project QR Code Symbol and this app's ProjectLink to the ProjectLoader.
// A light walker (static imports, export-from, literal dynamic imports; relative specifiers only - the vendor
// libraries behind bare specifiers are left out of both sides alike) from index.html's module scripts, run
// on the live tree and on the live tree with this package's pre-images laid over it.
//   node graph_diff.mjs
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP  = 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D';
const PRE  = join(HERE, 'preimage');

function overlayOf(dir) {
    const map = {};
    const walk = (d, rel) => readdirSync(d).forEach((n) => { const f = join(d, n), r = rel ? rel + '/' + n : n; if (statSync(f).isDirectory()) walk(f, r); else if (n !== 'manifest.json') map[r] = f; });
    if (existsSync(dir)) walk(dir, '');
    return map;
}
const manifest = existsSync(join(PRE, 'manifest.json')) ? JSON.parse(readFileSync(join(PRE, 'manifest.json'), 'utf8')) : {};
const absentBefore = new Set(Object.keys(manifest).filter((k) => manifest[k] === null));

function blankStrings(src) {                                                             // keep quotes and offsets, blank string contents
    let out = '', i = 0, q = null;
    while (i < src.length) {
        const c = src[i];
        if (q) { if (c === '\\') { out += '  '; i += 2; continue; } if (c === q || (c === '\n' && q !== '`')) { out += c; q = null; } else out += (c === '\n' ? '\n' : ' '); i++; continue; }
        if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); const end = e === -1 ? src.length : e; out += ' '.repeat(end - i); i = end; continue; }
        if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const end = e === -1 ? src.length : e + 2; out += src.slice(i, end).replace(/[^\n]/g, ' '); i = end; continue; }
        if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
        out += c; i++;
    }
    return out;
}
function specifiers(src) {
    const blank = blankStrings(src), found = [];
    const re = /\b(?:import|export)\b[^;'"`]*?\bfrom\s*(['"])|\bimport\s*\(\s*(['"])|^\s*import\s*(['"])/gm;
    let m;
    while ((m = re.exec(blank)) !== null) {
        const at = m.index + m[0].length;                                                // just after the opening quote
        const close = src.indexOf(src[at - 1], at);
        if (close !== -1) found.push(src.slice(at, close));
    }
    return found;
}
function graph(overlay, hide) {
    const read = (abs) => { const rel = relative(APP, abs).split('\\').join('/'); return overlay[rel] ? readFileSync(overlay[rel], 'utf8') : readFileSync(abs, 'utf8'); };
    const exists = (abs) => { const rel = relative(APP, abs).split('\\').join('/'); if (hide.has(rel)) return false; return !!overlay[rel] || existsSync(abs); };
    const html = readFileSync(join(APP, 'index.html'), 'utf8');
    const entries = [ ...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g) ].map((m) => resolve(APP, m[1]));
    for (const m of html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)) {   // inline module scripts: the page itself is the entry
        for (const s of specifiers(m[1])) if (s.startsWith('.')) entries.push(resolve(APP, s));
    }
    const seen = new Set(), edges = new Map(), queue = entries.filter(exists);
    while (queue.length) {
        const file = queue.shift();
        if (seen.has(file)) continue;
        seen.add(file);
        if (!/\.(m?js)$/.test(file)) continue;
        const outs = [];
        for (const s of specifiers(read(file))) {
            if (!s.startsWith('.')) continue;
            const target = resolve(dirname(file), s);
            if (exists(target)) { outs.push(target); if (!seen.has(target)) queue.push(target); }
        }
        edges.set(file, outs);
    }
    return { seen, edges };
}
const after  = graph({}, new Set());
const before = graph(overlayOf(PRE), absentBefore);
const rel = (f) => relative(APP, f).split('\\').join('/');
const added = [ ...after.seen ].filter((f) => !before.seen.has(f)).map(rel).sort();
const gone  = [ ...before.seen ].filter((f) => !after.seen.has(f)).map(rel).sort();
console.log('app-relative modules reached (relative specifiers): before ' + before.seen.size + ', after ' + after.seen.size);
console.log('joined the graph (' + added.length + '):\n  ' + added.join('\n  '));
console.log('left the graph (' + gone.length + '):' + (gone.length ? '\n  ' + gone.join('\n  ') : ' none'));
// the chain ShapeGeometry -> Symbol -> ProjectLink -> ProjectLoader
const LE = join(APP, '02__Src__AppModules', '51__System__LayoutEditor');
const chain = [ join(LE, '15__Core__Markup', 'Na__LayoutEditor__ShapeGeometry__.js'), join(LE, '53__Feature__ProjectQrCode', 'Na__ProjectQr__Symbol__.js'),
                join(LE, '53__Feature__ProjectQrCode', 'Na__ProjectQr__ProjectLink__.js'), join(APP, '02__Src__AppModules', '03__AppUtils', 'Na__AppUtils__ProjectLoader.js') ];
for (let i = 0; i < chain.length - 1; i++) {
    const ok = after.seen.has(chain[i]) && (after.edges.get(chain[i]) || []).includes(chain[i + 1]);
    console.log((ok ? '  linked   ' : '  MISSING  ') + rel(chain[i]) + '  ->  ' + rel(chain[i + 1]));
}
// who brings ShapeGeometry into the app (one path from an entry point)
const parents = new Map();
for (const [ from, outs ] of after.edges) for (const to of outs) if (!parents.has(to)) parents.set(to, from);
let at = chain[0], path = [ rel(at) ];
while (parents.has(at) && path.length < 30) { at = parents.get(at); path.unshift(rel(at)); }
console.log('a path from the page to ShapeGeometry:\n  ' + path.join('\n  -> '));
