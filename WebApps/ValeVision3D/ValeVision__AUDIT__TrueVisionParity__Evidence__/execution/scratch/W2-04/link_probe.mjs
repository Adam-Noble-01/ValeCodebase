// W2-04 scratch: can the landed floor plan editor link and evaluate in Node through VV's import map?
import { pathToFileURL } from 'node:url';
import { installDom, fileFetch } from './dom_stubs.mjs';
installDom();
fileFetch(async (s) => ({ ok : false, status : 404, json : async () => ({}), text : async () => '' }));
const VV = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/';
for (const f of ['42__System__FloorPlanViews/Na__FloorPlan__DevMenu__RowBuilders__.js', '42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js']) {
    try {
        const m = await import(pathToFileURL(VV + f).href);
        console.log('LINKED', f, Object.keys(m));
    } catch (e) {
        console.log('FAILED', f, e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : e);
    }
}
