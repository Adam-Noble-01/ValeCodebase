// W1-06 scratch: P4 pre-flight. For every TrueVision file this package takes (read at the pin, copies in
// scratch/W1-06/tv), resolve each static import against ValeVision's live tree: the file must exist and must
// export every name imported. Import specifiers are mapped through the seams this package re-applies
// (TrueVision's 41 SectionCutEngine SceneData -> ValeVision's 41 CrossSectionView SceneData).
// Reads only. Run from anywhere: node preflight_imports.mjs
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TV   = join(HERE, 'tv', '02__Src__AppModules');
const VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules';

const FILES = [
    '40__System__DrawingViewCore/Na__DrawView__DraftMaths__.js',
    '40__System__DrawingViewCore/Na__DrawView__DrawingUsage__.js',
    '40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js',
    '40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js',
    '40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js',
    '40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js',
    '21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js'
];

// Specifier seams (VV keeps its own 41 and reaches the re-stamp through the loader).
const SEAMS = {
    '../41__System__SectionCutEngine/Na__SectionCut__SceneData__.js' : '../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js'
};

function stripComments(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');
}

function exportsOf(src) {
    const names = new Set();
    const code  = stripComments(src);
    for (const m of code.matchAll(/export\s*\{([\s\S]*?)\}/g)) {
        m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((part) => {
            const as = part.split(/\s+as\s+/);
            names.add((as[1] || as[0]).trim());
        });
    }
    for (const m of code.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
    return names;
}

function importsOf(src) {
    const code = stripComments(src);
    const out  = [];
    for (const m of code.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g)) {
        const names = m[1].split(',').map((s) => s.trim()).filter(Boolean).map((p) => p.split(/\s+as\s+/)[0].trim());
        out.push({ spec : m[2], names });
    }
    for (const m of code.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push({ spec : m[1], names : [], dynamic : true });
    return out;
}

let failures = 0;
for (const rel of FILES) {
    const src = readFileSync(join(TV, rel), 'utf8');
    const from = dirname(join(VV, rel));
    console.log(rel);
    for (const imp of importsOf(src)) {
        const spec   = SEAMS[imp.spec] || imp.spec;
        const target = resolve(from, spec);
        const note   = (SEAMS[imp.spec] ? ' (seam: ' + imp.spec + ')' : '') + (imp.dynamic ? ' [dynamic import]' : '');
        if (!existsSync(target)) {
            console.log('   MISSING FILE ' + spec + note);
            if (!imp.dynamic) failures++;
            continue;
        }
        const have = exportsOf(readFileSync(target, 'utf8'));
        const lack = imp.names.filter((n) => !have.has(n));
        console.log('   ' + (lack.length ? 'LACKS ' + lack.join(', ') + ' in ' : 'ok    ') + spec + note + (imp.names.length ? '  {' + imp.names.join(', ') + '}' : ''));
        failures += lack.length;
    }
}
console.log(failures === 0 ? '\nPREFLIGHT CLEAN' : '\n' + failures + ' PROBLEM(S)');
process.exit(failures === 0 ? 0 : 1);
