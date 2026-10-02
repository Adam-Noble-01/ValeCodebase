// W3-16 scratch probe: what the PDF name builder makes of the Document ID and the document code.
globalThis.window = globalThis.window || { location : { search : '?project=2026/3047__Doous', href : 'http://localhost/ValeVision3D/index.html?project=2026/3047__Doous' }, addEventListener() {}, dispatchEvent() {} };
const mod = await import('file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js');
const build = mod.Na__LeFileName__Build;
const cases = [
    { label : 'TV hunk + VV seam', parts : { code : '3047_D01', name : 'D01 - Floor Plans', paper : 'A3', revision : 'A', projectCode : '3047' } },
    { label : 'before (DrawingNumber)', parts : { code : 'D01', name : 'D01 - Floor Plans', paper : 'A3', revision : 'A', projectCode : '2026/3047__Doous' } },
    { label : 'no document code at all', parts : { code : 'D01', name : 'D01 - Floor Plans', paper : 'A3', revision : 'A', projectCode : null } }
];
for (const c of cases) console.log(c.label.padEnd(26), '->', build(c.parts));
