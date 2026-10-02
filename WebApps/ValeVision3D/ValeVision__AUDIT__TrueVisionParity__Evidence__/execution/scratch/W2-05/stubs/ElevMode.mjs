// W2-05 sim stub: the elevation mode controller, real module but a fake viewport state for the
// calls the Dev menu makes (no renderer in Node). It announces its changes on the real event.
import { Na__ElevMode__CHANGED_EVENT } from 'file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ModeController__.js?real';
export * from 'file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ModeController__.js?real';

const state = { active : null, edit : false };
const say = () => window.dispatchEvent(new CustomEvent(Na__ElevMode__CHANGED_EVENT, { detail : {} }));
export function Na__ElevationMode__EnterElevation(e) { globalThis.__sim.calls.push(['EnterElevation', e && e.Elevation__Id]); state.active = e || null; say(); return true; }
export function Na__ElevationMode__ExitElevation() { globalThis.__sim.calls.push(['ExitElevation']); state.active = null; state.edit = false; say(); return true; }
export function Na__ElevationMode__IsActive() { return state.active !== null; }
export function Na__ElevationMode__IsEngaged() { return state.active !== null; }
export function Na__ElevationMode__GetActiveElevation() { return state.active; }
export function Na__ElevationMode__IsEditMode() { return state.edit; }
export function Na__ElevationMode__SetEditMode(on) { state.edit = on === true; say(); return true; }
export function Na__ElevationMode__RefreshActive() { globalThis.__sim.calls.push(['RefreshActive', state.active && state.active.Elevation__Id]); return true; }
export function Na__ElevationMode__StoreActiveFraming() { if (state.active) { state.active.Elevation__CameraZoom = 2.5; state.active.Elevation__CameraTargetMm = { PosX : 1, PosY : 2, PosZ : 3 }; } return true; }
export function Na__ElevationMode__ApplyStyles(e) { globalThis.__sim.calls.push(['ApplyStyles', e && e.Elevation__Id]); say(); return true; }
