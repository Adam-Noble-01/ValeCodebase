// W2-04 sim stub: the thumbnail renderer, real but for the capture-and-upload (recorded, answered ok).
export * from 'file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js?real';
export async function Na__PresentationMode__Thumbnail__CaptureAndUpload(sceneId, second) {
    globalThis.__sim.captures.push([sceneId, second]);
    return { ok : true, relUrl : 'PresentationMode/Thumbnails/' + sceneId + '.webp' };
}
