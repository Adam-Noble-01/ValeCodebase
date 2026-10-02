// W2-04 scratch: ValeVision's import map (as W2-01's hook) plus redirects of a few modules to
// "same module, a few functions swapped" stubs in ./stubs/. A stub re-exports the real module
// (imported with a ?real suffix, which this hook passes straight through) and overrides only
// the functions the simulation needs to watch: transport, the mode controller, the modal, the
// thumbnail capture, the linework bake and the section adapter's cut.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const html = readFileSync(join(VV, 'index.html'), 'utf8');
const m    = html.match(/<script type="importmap">\s*([\s\S]*?)<\/script>/);
const map  = JSON.parse(m[1]).imports;
const base = pathToFileURL(VV + '/').href;
const STUBS = pathToFileURL('D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W2-04/stubs/').href;

const REDIRECTS = {
    '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js'        : 'CfApi.mjs',
    '03__AppUtils/Na__AppUtils__LocalProjectMirror__.js'                         : 'LocalMirror.mjs',
    '42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js'              : 'FpMode.mjs',
    '21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js'     : 'Modal.mjs',
    '21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js'  : 'Thumb.mjs',
    '50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js'      : 'PlStore.mjs',
    '40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js'              : 'SectionAdapter.mjs'
};

export async function resolve(specifier, context, nextResolve) {
    if (map[specifier]) return { url : new URL(map[specifier], base).href, shortCircuit : true };
    const prefix = Object.keys(map).filter((k) => k.endsWith('/') && specifier.startsWith(k)).sort((a, b) => b.length - a.length)[0];
    if (prefix) return { url : new URL(map[prefix] + specifier.slice(prefix.length), base).href, shortCircuit : true };
    const out = await nextResolve(specifier, context);
    if (out.url.includes('?real')) return out;
    for (const suffix of Object.keys(REDIRECTS)) {
        if (out.url.endsWith('02__Src__AppModules/' + suffix)) return { url : STUBS + REDIRECTS[suffix], shortCircuit : true };
    }
    return out;
}
