// W2-05 scratch: ValeVision's import map plus redirects of a few modules to "same module, a few
// functions swapped" stubs. W2-04's stubs are reused for transport, the modal, the thumbnail capture
// and the linework bake; this package's own stubs swap the elevation mode controller's viewport, the
// adapter's live cut distance and the render-loop's RequestRender (all recorded).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const html = readFileSync(join(VV, 'index.html'), 'utf8');
const m    = html.match(/<script type="importmap">\s*([\s\S]*?)<\/script>/);
const map  = JSON.parse(m[1]).imports;
const base = pathToFileURL(VV + '/').href;
const EXEC = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/';
const S04  = pathToFileURL(EXEC + 'W2-04/stubs/').href;
const S05  = pathToFileURL(EXEC + 'W2-05/stubs/').href;

const REDIRECTS = {
    '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js'        : S04 + 'CfApi.mjs',
    '03__AppUtils/Na__AppUtils__LocalProjectMirror__.js'                         : S04 + 'LocalMirror.mjs',
    '21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js'     : S04 + 'Modal.mjs',
    '21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js'  : S04 + 'Thumb.mjs',
    '50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js'      : S04 + 'PlStore.mjs',
    '45__System__ElevationViews/Na__Elevation__ModeController__.js'              : S05 + 'ElevMode.mjs',
    '40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js'              : S05 + 'SectionAdapter.mjs',
    '05__RenderPipeline/Na__RenderLoop__Invalidation.js'                         : S05 + 'Invalidation.mjs'
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
