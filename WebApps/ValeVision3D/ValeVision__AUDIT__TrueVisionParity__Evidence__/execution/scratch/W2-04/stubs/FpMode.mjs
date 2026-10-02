// W2-04 sim stub: the floor plan mode controller, real module but a fake viewport state for the
// calls the Dev menu makes (no renderer in Node). It announces its changes on the real event.
import { Na__FpMode__CHANGED_EVENT } from 'file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js?real';
export * from 'file:///D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js?real';

const state = { active : null, edit : false };
const say = () => window.dispatchEvent(new CustomEvent(Na__FpMode__CHANGED_EVENT, { detail : {} }));
export function Na__FloorPlanMode__EnterPlan(plan) { globalThis.__sim.calls.push(['EnterPlan', plan && plan.FloorPlan__Id]); state.active = plan || null; say(); return true; }
export function Na__FloorPlanMode__ExitPlan() { globalThis.__sim.calls.push(['ExitPlan']); state.active = null; state.edit = false; say(); return true; }
export function Na__FloorPlanMode__IsActive() { return state.active !== null; }
export function Na__FloorPlanMode__GetActivePlan() { return state.active; }
export function Na__FloorPlanMode__IsEditMode() { return state.edit; }
export function Na__FloorPlanMode__SetEditMode(on) { state.edit = on === true; say(); return true; }
export function Na__FloorPlanMode__StoreActiveFraming() { if (state.active) { state.active.FloorPlan__CameraZoom = 2.5; state.active.FloorPlan__CameraTargetMm = { PosX : 1, PosZ : 2 }; } return true; }
export function Na__FloorPlanMode__ApplyStyles(plan) { globalThis.__sim.calls.push(['ApplyStyles', plan && plan.FloorPlan__Id]); say(); return true; }
