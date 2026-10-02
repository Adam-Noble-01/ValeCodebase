// W2-05 gate sim stub: the confirm dialog (answers yes, recorded) and the R2-first project save (recorded).
export async function Na__AppUtils__ConfirmDialog__Show(options) { globalThis.__sim.dialogs.push(options); return true; }
export async function Na__AppUtils__R2SaveProjectJson(projectData, projectCode) {
    globalThis.__sim.cloudSaves.push({ projectCode, CrossSection__Config : JSON.parse(JSON.stringify(projectData.CrossSection__Config)) });
    return true;
}
