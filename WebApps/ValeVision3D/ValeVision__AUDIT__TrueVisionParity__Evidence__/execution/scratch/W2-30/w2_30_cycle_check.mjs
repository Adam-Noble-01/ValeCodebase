// W2-30 scratch check: AutoSave's direct import of SpecData__Document__ gains no cycle, and no new
// cycle runs through any file this package wrote. Static imports only (import ... from '<relative>').
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP  = path.resolve(HERE, '..', '..', '..', '..');
const LE   = path.join(APP, '02__Src__AppModules', '51__System__LayoutEditor');
const SPEC = path.join(LE, '50__Feature__Specification');
const IMPORT = /^[ \t]*(?:import|export)\s+(?:[\s\S]*?)\s+from\s+'([^']+)';/gm;

const edges = new Map();
function importsOf(file) {
    if (edges.has(file)) return edges.get(file);
    const list = [];
    edges.set(file, list);
    if (!fs.existsSync(file)) return list;
    const src = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = IMPORT.exec(src))) { if (m[1].startsWith('.')) list.push(path.resolve(path.dirname(file), m[1])); }
    return list;
}
function closure(start) {
    const seen = new Set();
    const stack = [ start ];
    while (stack.length) { const f = stack.pop(); if (seen.has(f)) continue; seen.add(f); importsOf(f).forEach((g) => stack.push(g)); }
    return seen;
}
const rel = (f) => path.relative(APP, f).split(path.sep).join('/');
const AUTOSAVE = path.join(LE, '07__Core__SheetData', 'Na__LayoutEditor__AutoSave__.js');
const DOCUMENT = path.join(SPEC, 'Na__LayoutEditor__SpecData__Document__.js');
const MINE = [ 'State', 'Document', 'Draft', 'Editing', 'Lockstep', 'Transport' ].map((u) => path.join(SPEC, 'Na__LayoutEditor__SpecData__' + u + '__.js'))
    .concat([ path.join(SPEC, 'Na__LayoutEditor__SpecData__.js'), path.join(SPEC, 'Na__LayoutEditor__SpecLinks__.js'),
              path.join(LE, '52__Feature__StatementWriter', '01__Core__Data', 'Na__LayoutEditor__Statement__Lockstep__.js') ]);

let failures = 0;
const check = (name, ok, detail) => { if (!ok) failures++; console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '\n        ' + detail)); };

check('AutoSave imports SpecData__Document__ directly', importsOf(AUTOSAVE).includes(DOCUMENT));
const docClosure = closure(DOCUMENT);
check('SpecData__Document__ never reaches AutoSave (no cycle through that import)', !docClosure.has(AUTOSAVE));
console.log('        Document\'s closure: ' + [ ...docClosure ].map(rel).join(', '));
// THE EDGES THIS PACKAGE ADDED (import specifiers new against the preimage): none may close a cycle.
const PRE = path.join(HERE, 'preimage');
const specifiers = (file) => { const s = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; const out = new Set(); let m; while ((m = IMPORT.exec(s))) out.add(m[1]); return out; };
MINE.forEach((file) => {
    const before = specifiers(path.join(PRE, path.relative(APP, file)));
    const added  = [ ...specifiers(file) ].filter((s) => !before.has(s) && s.startsWith('.')).map((s) => path.resolve(path.dirname(file), s));
    const closing = added.filter((target) => closure(target).has(file));
    check(rel(file) + ': ' + added.length + ' new import edge(s), none closes a cycle', closing.length === 0, closing.map(rel).join(', '));
});
// For the record: cycles that already ran through a file before this package (its edges unchanged).
MINE.forEach((file) => {
    const back = [ ...closure(file) ].filter((f) => f !== file && closure(f).has(file) && !f.startsWith(SPEC));
    if (back.length) console.log('  INFO  ' + rel(file) + ' already sat on a cycle outside the folder (' + back.length + ' module(s)), through import edges this package did not change');
});
console.log('\n  ' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILED'));
process.exit(failures ? 1 : 0);
