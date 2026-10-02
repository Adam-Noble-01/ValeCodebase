// W2-04 sim stub: the Presentation Scenes modal, answering from a script and recording what it was asked.
export * from 'file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js?real';
export async function Na__PresentationMode__DevMenu__Confirm(options) {
    globalThis.__sim.dialogs.push(options);
    const answer = globalThis.__sim.answers.length ? globalThis.__sim.answers.shift() : true;
    return answer;
}
