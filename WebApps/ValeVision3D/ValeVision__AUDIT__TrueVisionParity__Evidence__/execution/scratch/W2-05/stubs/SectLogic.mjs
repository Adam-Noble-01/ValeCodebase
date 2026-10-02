// W2-05 gate sim stub: the Cross Section tool's system logic (a 1,700-line three.js module) reduced to the three
// calls the Dev gate makes, recorded.
const state = { enabled : false };
export function Na__CrossSection__SetFeatureEnabled(on) { globalThis.__sim.calls.push(['SetFeatureEnabled', on === true]); state.enabled = on === true; }
export function Na__CrossSection__IsFeatureEnabled() { return state.enabled; }
export function Na__CrossSection__GetAppearance() { return { fillColor : '#f0f0f0', lineColor : '#323232', lineWidthPx : 2 }; }
