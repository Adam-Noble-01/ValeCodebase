// W2-04 sim stub: the VV transport facade, real but for the R2 write (recorded, answered ok).
export * from 'file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js?real';
export function Na__CfApi__IsConfigured() { return true; }
export async function Na__CfApi__MergeAndSaveKeys(keys) {
    (globalThis.__sim.cloudSaves).push(JSON.parse(JSON.stringify(keys)));
    return { ok : true };
}
