// W2-05 scratch: ValeVision's import map, with the Cross Section Tool gate's three heavy or writing
// dependencies redirected to recording stubs (the gate's own module and the 48 module stay real).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const html = readFileSync(join(VV, 'index.html'), 'utf8');
const m    = html.match(/<script type="importmap">\s*([\s\S]*?)<\/script>/);
const map  = JSON.parse(m[1]).imports;
const base = pathToFileURL(VV + '/').href;
const S05  = pathToFileURL('D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W2-05/stubs/').href;

const REDIRECTS = {
    '41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js' : S05 + 'SectLogic.mjs',
    '03__AppUtils/Na__AppUtils__ConfirmDialog.js'                       : S05 + 'GateConfirm.mjs',
    '03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js'                 : S05 + 'GateR2Save.mjs'
};

export async function resolve(specifier, context, nextResolve) {
    if (map[specifier]) return { url : new URL(map[specifier], base).href, shortCircuit : true };
    const prefix = Object.keys(map).filter((k) => k.endsWith('/') && specifier.startsWith(k)).sort((a, b) => b.length - a.length)[0];
    if (prefix) return { url : new URL(map[prefix] + specifier.slice(prefix.length), base).href, shortCircuit : true };
    const out = await nextResolve(specifier, context);
    if (out.url.includes('?real')) return out;
    for (const suffix of Object.keys(REDIRECTS)) {
        if (out.url.endsWith('02__Src__AppModules/' + suffix)) return { url : REDIRECTS[suffix], shortCircuit : true };
    }
    return out;
}
