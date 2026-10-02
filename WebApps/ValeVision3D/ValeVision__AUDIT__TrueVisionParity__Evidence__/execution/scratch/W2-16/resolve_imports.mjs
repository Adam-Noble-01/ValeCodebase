// Resolve every static import of the TV candidate files against VV (live tree),
// substituting this package's own candidate files where they replace VV ones.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const VV = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const SRC = process.argv[2] || path.join(HERE, 'tv');  // folder holding candidate texts at app-relative paths

const LE = '02__Src__AppModules/51__System__LayoutEditor/';
const MINE = [
  LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__.js',
  LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js',
  LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js',
  LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js',
  LE + '20__System__Viewports/Na__LayoutEditor__Viewport3d__.js',
  LE + '20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js',
  LE + '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js',
  LE + '25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js',
  LE + '40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js',
  LE + '20__System__Viewports/Na__LayoutEditor__ModelSource__.js',
  LE + '20__System__Viewports/Na__LayoutEditor__Viewport2d__SitePlan__.js',
  LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
];
const only = process.argv.slice(3);

function textOf(rel) {
  const c = path.join(SRC, rel);
  if (MINE.includes(rel) && fs.existsSync(c)) return fs.readFileSync(c, 'utf8');
  const v = path.join(VV, rel);
  if (fs.existsSync(v)) return fs.readFileSync(v, 'utf8');
  return null;
}
function stripComments(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}
function exportsOf(t) {
  const s = stripComments(t);
  const out = new Set();
  for (const m of s.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const p = part.trim(); if (!p) continue;
      const mm = p.match(/(?:\S+\s+as\s+)?(\S+)$/); out.add(mm[1]);
    }
  }
  for (const m of s.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) out.add(m[1]);
  return out;
}
function importsOf(t) {
  const s = stripComments(t);
  const res = [];
  for (const m of s.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const clause = m[1]; const spec = m[2];
    const names = [];
    const b = clause.match(/\{([\s\S]*)\}/);
    if (b) for (const part of b[1].split(',')) { const p = part.trim(); if (!p) continue; names.push(p.split(/\s+as\s+/)[0].trim()); }
    res.push({ spec, names, star: /\*\s+as/.test(clause) });
  }
  for (const m of s.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) res.push({ spec: m[1], names: [], dynamic: true });
  for (const m of s.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) res.push({ spec: m[1], names: [], bare: true });
  return res;
}

let fail = 0, checked = 0;
for (const rel of MINE) {
  if (only.length && !only.some(o => rel.includes(o))) continue;
  const t = textOf(rel);
  if (!t) { console.log('NO TEXT', rel); fail++; continue; }
  for (const imp of importsOf(t)) {
    if (!imp.spec.startsWith('.')) { continue; }
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), imp.spec));
    const tt = textOf(target);
    checked++;
    if (tt == null) { console.log('MISSING FILE  ', rel.split('/').pop(), '->', target); fail++; continue; }
    const ex = exportsOf(tt);
    const miss = imp.names.filter(n => !ex.has(n));
    if (miss.length) { console.log('MISSING NAMES ', rel.split('/').pop(), '->', target.split('/').pop(), miss.join(', ')); fail++; }
  }
}
console.log(`checked ${checked} import edges, ${fail} problems`);
process.exit(fail ? 1 : 0);
