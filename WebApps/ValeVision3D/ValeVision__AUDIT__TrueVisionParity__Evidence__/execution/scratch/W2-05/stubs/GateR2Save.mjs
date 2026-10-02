// W2-05 gate sim stub: the R2-first project save, real module but the save itself recorded.
export * from 'file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js?real';
export async function Na__AppUtils__R2SaveProjectJson(projectData, projectCode) {
    globalThis.__sim.cloudSaves.push({ projectCode, CrossSection__Config : JSON.parse(JSON.stringify(projectData.CrossSection__Config)) });
    return true;
}
