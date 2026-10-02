// W2-04 sim stub: the local mirror facade, real but for the Flask write and fingerprint.
export * from 'file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js?real';
export async function Na__LocalMirror__MergeKeys(keys) {
    (globalThis.__sim.localSaves).push(JSON.parse(JSON.stringify(keys)));
    return { ok : true, skipped : false };
}
export async function Na__LocalMirror__DrawingsFingerprint() { return { ok : false, skipped : true }; }
