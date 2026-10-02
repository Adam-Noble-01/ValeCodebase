// W0-04 regression proof for the ModuleGraph string fix (scratch; reads only).
// Extracts StripComments (unchanged) from the pre-image harness and MaskStrings from the patched preview,
// then runs the OLD specifier extraction (1.0.0) and the NEW one (1.1.0) over every .js/.mjs file:
//   - ValeVision: 02__Src__AppModules (node_modules skipped), 04__Lib__ThirdParty__VersionLocked, index.html (working tree)
//   - TrueVision: the same folders and Index.html at the pin b2aa9151 (git cat-file --batch)
// and reports every file whose specifier list differs. Usage: node regress_specifiers.mjs
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const VV = 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D';
const NAWEB = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const PIN = 'b2aa9151';
const PREFIX = 'na-apps/30__TrueVision__CoreAppCode/';

const preimage = readFileSync(join(HERE, 'preimage', 'Na__Verify__ModuleGraph__.mjs'), 'utf8').replace(/\r\n/g, '\n');
const patched  = readFileSync(join(HERE, 'preview__Na__Verify__ModuleGraph__.mjs'), 'utf8').replace(/\r\n/g, '\n');

function extract(text, name) {
    const start = text.indexOf('    function ' + name + '(');
    const end   = text.indexOf('\n    // ------------------------------------------------------------', start);
    if (start === -1 || end === -1) throw new Error('cannot find ' + name);
    return new Function('return (' + text.slice(start, end).trim() + ');')();
}
const StripComments = extract(preimage, 'Na__Verify__StripComments');
const MaskStrings   = extract(patched, 'Na__Verify__MaskStrings');
const OLD = /(?:^|[\s;}])(?:import|export)\s*(?:[\s\S]*?\sfrom\s*)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const NEW = /(?:^|[\s;}])(?:import|export)\s*(?:[\s\S]*?\sfrom\s*)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/gd;

function oldSpecs(text) {
    const source = StripComments(text);
    const out = [];
    OLD.lastIndex = 0;
    let m;
    while ((m = OLD.exec(source)) !== null) { const s = m[1] || m[2]; if (s) out.push(s); }
    return out;
}
function newSpecs(text) {
    const source = StripComments(text);
    const masked = MaskStrings(source);
    if (masked.length !== source.length) throw new Error('MaskStrings changed the length');
    const out = [];
    NEW.lastIndex = 0;
    let m;
    while ((m = NEW.exec(masked)) !== null) {
        const span = m.indices[1] || m.indices[2];
        const s = span ? source.slice(span[0], span[1]) : null;
        if (s) out.push(s);
    }
    return out;
}

function walk(dir, acc) {
    for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === '.wrangler' || name === '.git') continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, acc);
        else if (/\.m?js$/.test(name)) acc.push(full);
    }
    return acc;
}

function compare(label, files) {
    let differ = 0;
    const lines = [];
    for (const [name, text] of files) {
        const a = oldSpecs(text), b = newSpecs(text);
        if (a.join('\n') === b.join('\n')) continue;
        differ++;
        const onlyOld = a.filter((s) => !b.includes(s));
        const onlyNew = b.filter((s) => !a.includes(s));
        lines.push('  ' + name + '\n      old only: ' + JSON.stringify(onlyOld).slice(0, 300) + '\n      new only: ' + JSON.stringify(onlyNew).slice(0, 300)
                   + (onlyOld.length === 0 && onlyNew.length === 0 ? '\n      (same specifiers, different order/count: old ' + a.length + ', new ' + b.length + ')' : ''));
    }
    const report = label + ': ' + files.length + ' files, ' + differ + ' with a different specifier list\n' + lines.join('\n');
    console.log(report);
    return report;
}

// ValeVision, working tree
const vvFiles = [ ...walk(join(VV, '02__Src__AppModules'), []), ...walk(join(VV, '04__Lib__ThirdParty__VersionLocked'), []) ];
const vv = vvFiles.map((p) => [ relative(VV, p).split('\\').join('/'), readFileSync(p, 'utf8') ]);
vv.push([ 'index.html', readFileSync(join(VV, 'index.html'), 'utf8') ]);
const r1 = compare('ValeVision (working tree)', vv);

// TrueVision, at the pin
const names = execFileSync('git', [ '-C', NAWEB, 'ls-tree', '-r', '--name-only', PIN, '--', PREFIX + '02__Src__AppModules', PREFIX + '04__Lib__ThirdParty__VersionLocked', PREFIX + 'Index.html' ], { maxBuffer : 256 * 1024 * 1024 })
    .toString('utf8').split('\n').filter((n) => n && (/\.m?js$/.test(n) || /Index\.html$/.test(n)) && n.indexOf('/node_modules/') === -1);
const buffer = execFileSync('git', [ '-C', NAWEB, 'cat-file', '--batch' ], { input : names.map((n) => PIN + ':' + n).join('\n') + '\n', maxBuffer : 1024 * 1024 * 1024 });
const tv = [];
let at = 0;
for (const n of names) {
    const nl = buffer.indexOf(0x0a, at);
    const head = buffer.slice(at, nl).toString('utf8');
    at = nl + 1;
    if (/ missing$/.test(head)) continue;
    const size = Number(head.split(' ')[2]);
    tv.push([ n.slice(PREFIX.length), buffer.slice(at, at + size).toString('utf8') ]);
    at += size + 1;
}
const r2 = compare('TrueVision at ' + PIN, tv);
writeFileSync(join(HERE, 'regress_specifiers.txt'), r1 + '\n\n' + r2 + '\n');
