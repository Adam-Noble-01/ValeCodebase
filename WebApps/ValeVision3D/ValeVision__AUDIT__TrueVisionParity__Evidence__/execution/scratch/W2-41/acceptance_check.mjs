// W2-41 acceptance harness: the four modules import cleanly against VV's real dependency modules, export exactly
// TrueVision's names, and add no global when imported, and have no top-level call or page access (static scan).
// Run from anywhere: node acceptance_check.mjs
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const D    = '02__Src__AppModules/51__System__LayoutEditor/37__System__VectorTools/';
const FILES = { OffsetTool: 'Na__LayoutEditor__VectorTools__OffsetTool__.js', BooleanTool: 'Na__LayoutEditor__VectorTools__BooleanTool__.js',
                adapter: 'Na__LayoutEditor__VectorTools__.js', Panel: 'Na__LayoutEditor__Panel__VectorTools__.js' };
const NAMES = Object.keys(FILES);

let pass = 0, fail = 0;
function check(ok, label) { if (ok) { pass++; console.log('  PASS ' + label); } else { fail++; console.log('  FAIL ' + label); } }

// Pass 1: no browser at all (as G2 / node import does)
const exportsTv = {};
for (const n of NAMES) {
    const file = FILES[n];
    const text = readFileSync(path.join(HERE, 'tv', D, file), 'utf8');
    const m = text.match(/export\s*\{([^}]*)\}/s);
    exportsTv[n] = m[1].split(',').map(s => s.replace(/\/\/.*$/m, '').trim()).filter(Boolean).map(s => s.split(/\s+as\s+/).pop()).sort();
}

const before = new Set(Object.keys(globalThis));
for (const n of NAMES) {
    const url = pathToFileURL(path.join(VV, D, FILES[n])).href;
    let mod = null, err = null;
    try { mod = await import(url); } catch (e) { err = e; }
    check(!err, n + ': imports in node against VV\'s real dependencies' + (err ? ' - ' + err.message : ''));
    if (mod) {
        const have = Object.keys(mod).sort();
        check(JSON.stringify(have) === JSON.stringify(exportsTv[n]), n + ': exports equal TrueVision\'s (' + have.length + ')');
    }
}
const added = Object.keys(globalThis).filter(k => !before.has(k));
check(added.length === 0, 'no global added by importing the four' + (added.length ? ': ' + added.join(', ') : ''));

// Pass 2: the four modules' own top level, scanned: every statement outside a function is an import, an export
// block, a const / let declaration or a comment - nothing that runs against the page
for (const n of NAMES) {
    const text = readFileSync(path.join(VV, D, FILES[n]), 'utf8');
    const bad = /^\s{0,4}(?:window|document|globalThis|localStorage|sessionStorage|addEventListener|setTimeout|setInterval|fetch)\b/m.test(text)
             || /^\s{4}Na__[A-Za-z0-9_]+\s*\(/m.test(text);
    check(!bad, n + ': no top-level call or page access');
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + ' (' + pass + ' pass, ' + fail + ' fail)');
process.exit(fail ? 1 : 0);
