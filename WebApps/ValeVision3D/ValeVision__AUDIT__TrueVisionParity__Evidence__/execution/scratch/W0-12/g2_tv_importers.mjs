// W0-12 scratch - acceptance 1 as G2 would see it once TrueVision's importers are ported.
// For every TrueVision module that imports the transport facade (git grep at the pin b2aa9151), take its import
// statements exactly as written, resolve each facade specifier from the importer's own path INSIDE THIS VV TREE
// (the same relative path: VV's folders carry TV's numbers since W0-02), and check with Na__Verify__Exports__'s own
// parsing rules (CollectNamedImports / CollectExports, comments stripped) that the file exists and exports each name.
// Reads TrueVision only through git show; writes nothing.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

const NAWEB  = 'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb';
const PIN    = 'b2aa9151';
const APP    = 'na-apps/30__TrueVision__CoreAppCode/';
const VV     = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const TARGETS = [ 'Na__CloudflareIntegration__ApiClient__.js', 'Na__AppUtils__LocalProjectMirror__.js' ];

// Na__Verify__Exports__.mjs's own rules, verbatim in effect
function StripComments(source) {
    let out = '', i = 0, quote = null;
    while (i < source.length) {
        const c = source[i], n = source[i + 1];
        if (quote) { out += c; if (c === '\\') { out += n ?? ''; i += 2; continue; } if (c === quote) quote = null; i += 1; continue; }
        if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i += 1; continue; }
        if (c === '/' && n === '/') { while (i < source.length && source[i] !== '\n') i += 1; continue; }
        if (c === '/' && n === '*') { i += 2; while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1; i += 2; out += ' '; continue; }
        out += c; i += 1;
    }
    return out;
}
function CollectNamedImports(source) {
    const results = [], pattern = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = pattern.exec(source)) !== null) {
        const names = m[1].split(',').map((p) => p.trim()).filter(Boolean).map((p) => p.split(/\s+as\s+/)[0].trim()).filter(Boolean);
        if (names.length) results.push({ names, from : m[2] });
    }
    return results;
}
function CollectExports(source) {
    const names = new Set(), block = /export\s*\{([^}]*)\}(?!\s*from)/g;
    let m;
    while ((m = block.exec(source)) !== null) m[1].split(',').map((p) => p.trim()).filter(Boolean).forEach((part) => { const pieces = part.split(/\s+as\s+/); names.add((pieces[1] || pieces[0]).trim()); });
    const decl = /export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/g;
    while ((m = decl.exec(source)) !== null) names.add(m[1]);
    return names;
}

const listing = execFileSync('git', [ '-C', NAWEB, 'grep', '-l', '-e', TARGETS[0].replace('.js', ''), '-e', TARGETS[1].replace('.js', ''), PIN, '--', APP + '02__Src__AppModules' ], { encoding : 'utf8' });
const importers = listing.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => line.slice(line.indexOf(':') + 1 + APP.length));
let failures = 0, statements = 0, names = 0;
for (const rel of importers) {
    const source  = execFileSync('git', [ '-C', NAWEB, 'show', PIN + ':' + APP + rel ], { encoding : 'utf8', maxBuffer : 64 * 1024 * 1024 });
    const imports = CollectNamedImports(StripComments(source)).filter((one) => TARGETS.some((target) => one.from.endsWith('/' + target) || one.from === './' + target));
    for (const one of imports) {
        statements += 1;
        const vvImporter = resolve(VV, rel);
        const target     = resolve(dirname(vvImporter), one.from);
        if (!existsSync(target)) { failures += 1; console.log('  FAIL  ' + rel + ' -> ' + one.from + ' : no such file in ValeVision (' + relative(VV, target) + ')'); continue; }
        const exported = CollectExports(StripComments(readFileSync(target, 'utf8')));
        for (const name of one.names) {
            names += 1;
            if (!exported.has(name)) { failures += 1; console.log('  FAIL  ' + rel + ' -> ' + name + ' : not exported by ' + relative(VV, target)); }
        }
    }
}
console.log(`TrueVision importers at ${PIN}: ${importers.length} files (the two facade files themselves among them), ${statements} import statements of the facade, ${names} names`);
console.log(failures === 0 ? 'PASS - every specifier resolves to the ValeVision facade file at the importer\'s own path, and every name is exported' : 'FAIL - ' + failures);
process.exit(failures === 0 ? 0 : 1);
