// Exports VV (pre-image) has that TV (pin) lacks, per file; and who imports them in VV.
import fs from 'node:fs';
import path from 'node:path';
const HERE = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W2-16';
const VV = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
function strip(t) { return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1'); }
function exportsOf(t) {
  const s = strip(t); const out = new Set();
  for (const m of s.matchAll(/export\s*\{([^}]*)\}/g)) for (const part of m[1].split(',')) { const p = part.trim(); if (!p) continue; out.add(p.match(/(\S+)$/)[1]); }
  for (const m of s.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) out.add(m[1]);
  return out;
}
const LE = '02__Src__AppModules/51__System__LayoutEditor/';
const files = ['20__System__Viewports/Na__LayoutEditor__Viewport2d__.js','20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js','20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js','20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js','20__System__Viewports/Na__LayoutEditor__Viewport3d__.js','20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js','25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js','25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js','40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js'];
for (const f of files) {
  const vv = exportsOf(fs.readFileSync(path.join(HERE, 'preimage', LE + f), 'utf8'));
  const tv = exportsOf(fs.readFileSync(path.join(HERE, 'tv', LE + f), 'utf8'));
  const vvOnly = [...vv].filter(x => !tv.has(x));
  const tvOnly = [...tv].filter(x => !vv.has(x));
  console.log(f.split('/').pop(), 'VV', vv.size, 'TV', tv.size, '| VV-only:', vvOnly.join(', ') || '-', '| TV-only:', tvOnly.join(', ') || '-');
}
