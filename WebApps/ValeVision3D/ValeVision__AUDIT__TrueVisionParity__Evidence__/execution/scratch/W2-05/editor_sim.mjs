// W2-05 scratch (read-only on the app): drive the LANDED Elevations Dev menu 2.1.0 and the Cross Sections
// placeholder (48) in Node, through ValeVision's own import map and real modules (draft guard, row shell,
// accordion, ProjectData's save and payload guard, the thumbnail bake, the 47 planes and their bounds, the
// auto names and north, the 49 fog row, the shared style rows), on Doous's own drawings and scenes (a copy
// in memory). Only these are swapped (hooks_w205.mjs): the R2 and Flask writes (recorded), the elevation
// mode controller's viewport (a fake on / off screen state), the modal (scripted, recorded), the thumbnail
// capture, the linework bake, the adapter's live cut and the render loop's RequestRender (recorded).
//
// Run: node --import ./register_w205.mjs editor_sim.mjs
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { installDom, fileFetch, StubElement } from '../W2-04/dom_stubs.mjs';

installDom();
globalThis.Element = StubElement;
globalThis.HTMLElement = StubElement;
globalThis.document.createElementNS = (ns, tag) => new StubElement(tag);
fileFetch(async () => ({ ok : false, status : 404, json : async () => ({}), text : async () => '' }));
globalThis.__sim = { cloudSaves : [], localSaves : [], dialogs : [], answers : [], calls : [], captures : [] };
const sim = globalThis.__sim;
const toasts = [];
const showToast = (m, e) => toasts.push([String(m), e === true]);

const VVM = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/';
const mod = (p) => import(pathToFileURL(VVM + p).href);
let checks = 0;
const ok = (label) => { checks++; console.log('  PASS', label); };
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const settle = async () => { for (let i = 0; i < 8; i++) await tick(0); };

// MODULES -----------------------------------------------------------------------------------------
const THREE   = await import('three');
const editor  = await mod('45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js');
const xsec    = await mod('48__System__CrossSectionViews/Na__CrossSection__DevMenu__Editor__.js');
const data    = await mod('40__System__DrawingViewCore/Na__DrawView__ProjectData__.js');
const scenes  = await mod('21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js');
const elData  = await mod('45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js');
const elCfg   = await mod('45__System__ElevationViews/Na__Elevation__ConfigState__.js');
const fogCfg  = await mod('49__System__ElevationDepthFog/Na__ElevationDepthFog__ConfigState__.js');
const north   = await mod('46__System__NorthDirection/Na__North__ProjectJson__Data__.js');
const northC  = await mod('46__System__NorthDirection/Na__North__ConfigState__.js');
const fold    = await mod('40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js');
const draft   = await mod('40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js');
const thumb   = await mod('40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js');
const overlay = await mod('47__System__DrawingPlanes/Na__DrawingPlanes__Overlay__.js');
const planeUi = await mod('47__System__DrawingPlanes/Na__DrawingPlanes__DevMenu__Controls__.js');
await elCfg.Na__ElevCfg__Load();
await fogCfg.Na__ElevFogCfg__Load();
await northC.Na__NorthCfg__Load();
console.log('[1] the landed editor, its row builders, the 48 placeholder and the drawing core link and evaluate');
assert.deepEqual(Object.keys(editor).sort(), [ 'Na__Elevation__DevMenu__Initialize', 'Na__Elevation__DevMenu__Refresh', 'Na__Elevation__DevMenu__SetModelRoot' ]);
assert.deepEqual(Object.keys(xsec), [ 'Na__CrossSection__DevMenu__Initialize' ]);
assert.equal(typeof elData.Na__ElevData__SetAzimuthDeg, 'undefined');
assert.equal(typeof elData.Na__ElevData__SetSeededFrom, 'undefined');
assert.ok(Array.isArray(Object.keys(elData.Na__ElevData__STYLE_KEYS)));
ok('editor (3 exports) and 48 (1 export) link through the import map with every real import; the data module no longer exports SetAzimuthDeg / SetSeededFrom; STYLE_KEYS stays (F.8 C20, DR-32)');

// THE PROJECT: Doous's drawings and scenes (a copy in memory; nothing on disk is written) ---------
const PROJECT = JSON.parse(readFileSync('D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/Projects/2026/3047__Doous/project.json', 'utf8'));
const pm = JSON.parse(JSON.stringify(PROJECT.PresentationMode__SavedCameraScenes));
scenes.Na__PresentationMode__ProjectJson__SetActiveConfig(pm, '2026/3047__Doous');
data.Na__DrawData__Load(JSON.parse(JSON.stringify(PROJECT.LayoutEditor__DrawingsData)), '2026/3047__Doous', pm);
await data.Na__DrawData__WhenBaseKnown();
const test = elData.Na__ElevData__GetElevations(null)[0];
assert.equal(test.Elevation__Name, 'TEST ELEVATION');
assert.equal(test.Elevation__SeededFrom, 'manual');
const groupOf = (sceneId) => (pm.PresentationMode__SavedCameraScenes__Scenes.find((s) => s.PresentationMode__Scene__Id === sceneId) || {}).PresentationMode__Scene__GroupId;

// THE MODEL: a building and a much larger landscape off to one side --------------------------------
const scene = new THREE.Scene();
const modelRoot = new THREE.Group(); scene.add(modelRoot);
const building = new THREE.Group(); building.name = 'ValeVision__MainBuildingModel__Proposed';
const box = new THREE.Mesh(new THREE.BoxGeometry(10.8, 6, 8), new THREE.MeshBasicMaterial()); box.position.set(15, 3, -15);
building.add(box); modelRoot.add(building);
const land = new THREE.Group(); land.name = 'ValeVision__LandscapeEnvironment';
const slab = new THREE.Mesh(new THREE.BoxGeometry(80, 0.2, 80), new THREE.MeshBasicMaterial()); slab.position.set(40, -0.1, -40);
land.add(slab); modelRoot.add(land);
scene.updateMatrixWorld(true);
const camera = new THREE.PerspectiveCamera(50, 1.25, 0.1, 2000); camera.position.set(30, 6, 30);
overlay.Na__PlaneOverlay__Initialize({ scene, modelRoot });
planeUi.Na__PlaneUi__Initialize({ showToast });

// THE DEV MENU MARKUP (index.html's ids) ---------------------------------------------------------------
const mount = (prefix) => {
    const item = new StubElement('li'); item.id = prefix + 'Item'; item.style.display = 'none';
    const toggle = new StubElement('button'); toggle.id = prefix + 'Toggle';
    const panel = new StubElement('div'); panel.id = prefix + 'Panel';
    item.appendChild(toggle); item.appendChild(panel); document.body.appendChild(item);
    return { item, toggle, panel };
};
const EL = mount('naElevationDev');
const XS = mount('naCrossSectionDev');
const panel = EL.panel;

console.log('[2] Initialize both as index.html does (elevation mode .then)');
assert.equal(editor.Na__Elevation__DevMenu__Initialize({ modelRoot, camera, showToast }), true);
assert.equal(xsec.Na__CrossSection__DevMenu__Initialize(), true);
assert.equal(EL.item.style.display, ''); assert.equal(XS.item.style.display, '');
ok('Elevations Initialize({ modelRoot, camera, showToast }) and Cross Sections Initialize() both true; both items revealed');

// HELPERS ----------------------------------------------------------------------------------------------
const rows = () => panel.children.filter((c) => c.classList.contains('na-fp-dev__row'));
const rowOf = (id) => rows().find((r) => { const e = elData.Na__ElevData__GetElevationById(null, id); const n = r.querySelector('.na-fp-dev__name'); return e && n && n.value === e.Elevation__Name; });
const chips = (row) => { const c = row.querySelector('.na-draw-dev__chips').children; return { active : !c[1].hidden, dirty : !c[2].hidden }; };
const btn = (row, which) => row.querySelector('.na-draw-dev__actions').children[{ preview : 0, annotate : 1, update : 2, revert : 3 }[which]];
const change = (el, value) => { el.value = String(value); el.dispatch('change'); };
const waitBake = async () => { for (let i = 0; i < 400 && thumb.Na__DrawThumb__IsBusy(); i++) await tick(5); assert.equal(thumb.Na__DrawThumb__IsBusy(), false, 'bake finished'); };
const lastCloud = () => sim.cloudSaves[sim.cloudSaves.length - 1];
const elIn = (payload, id) => payload.LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Elevations.find((e) => e.Elevation__Id === id);
const openRow = async (id) => { fold.Na__DrawFold__SetOpenId(id); await settle(); return rowOf(id); };

// [3] THE PANEL ----------------------------------------------------------------------------------------
console.log('[3] the panel: + in the head, no Save anywhere, Bake Missing in the foot');
EL.toggle.click(); await settle();
assert.ok(panel.classList.contains('is-open'));
const head = panel.children[0];
assert.ok(head.classList.contains('na-draw-dev__panel-head'));
assert.equal(head.lastChild.textContent, '+');
const allText = panel.all(() => true).map((n) => n._text).join('|');
assert.ok(!/Save Elevations|Save Thumbnail|Pick Face|Re-pick|Viewed from/.test(allText), 'no Save-all, no Save Thumbnail, no Pick Face, no Viewed from');
const foot = panel.children.find((c) => c.classList.contains('na-pm-dev__global-actions'));
assert.deepEqual(foot.children.map((b) => b.textContent), [ '+ Add Elevation', 'Seed N / E / S / W', 'Bake Missing Thumbnails' ]);
assert.equal(rows().length, 1);
ok('head = title + square +; foot = + Add Elevation, Seed N / E / S / W, Bake Missing Thumbnails; no Save Elevations / Save Thumbnail / Pick Face / "Viewed from" (TV s.2 items 1, 6, 9)');

// [4] THE ROW: identity, plane controls, type, plane, depth, FOG, Advanced (bearing + styles), actions --
console.log('[4] the open row reads as TrueVision\'s 2.1.0, with the fog block and the Advanced fold');
let row = await openRow(test.Elevation__Id);
assert.ok(row, 'TEST ELEVATION row');
assert.ok(draft.Na__DrawDraft__IsActive('elevation', test.Elevation__Id) && !draft.Na__DrawDraft__IsDirty(), 'opening the row begins a clean draft');
assert.ok(row.querySelector('.na-elev-dev__identity') && row.querySelector('.na-elev-dev__facing-sentence'));
const sentence0 = row.querySelector('.na-elev-dev__facing-sentence').textContent;
assert.ok(/north/i.test(sentence0), sentence0);
const captions = row.all((n) => n.classList && n.classList.contains('na-draw-dev__caption')).map((n) => n.textContent);
const fogBlock = row.querySelector('.na-depthfog-dev');
assert.ok(fogBlock, 'fog block present');
const body = fogBlock.parentNode;
const kids = body.children.map((c) => c.className);
const fogAt = body.children.indexOf(fogBlock), advAt = body.children.findIndex((c) => c.classList.contains('na-pm-dev__advanced'));
assert.ok(fogAt > 0 && advAt === fogAt + 1, 'fog directly above Advanced: ' + JSON.stringify(kids));
const depthRowAt = body.children.findIndex((c) => c.querySelector && c.querySelector('input') && c.querySelector('input').placeholder === 'Full');
assert.equal(depthRowAt, fogAt - 1, 'fog directly under View depth');
const adv = body.children[advAt];
assert.equal(adv.all((n) => n.tagName === 'INPUT' && n.type === 'checkbox').length, 4, 'four style toggles');
assert.equal(adv.all((n) => n.tagName === 'INPUT' && n.type === 'text').length, 1, 'the Exclude field');
assert.equal(adv.all((n) => n.tagName === 'INPUT' && n.type === 'number').length, 1, 'the model bearing');
const actionTexts = row.querySelector('.na-draw-dev__actions').children.map((b) => b.textContent);
assert.deepEqual(actionTexts, [ 'Preview', 'Annotate', 'Update Elevation', 'Revert' ]);
assert.ok(row.querySelector('.na-draw-dev__danger'), 'Delete below a rule');
assert.equal(btn(row, 'update').disabled, true); assert.equal(btn(row, 'revert').disabled, true);
ok('row: statement "' + sentence0.slice(0, 60) + '..."; captions ' + JSON.stringify(captions) + '; Fog under View depth, directly above Advanced (bearing + 4 style toggles + Exclude); actions ' + JSON.stringify(actionTexts) + '; Delete alone below the rule (TV s.2 items 1, 8, 10-12; DR-15; D33)');

// [5] + ADDS AN ELEVATION CENTRED ON THE BUILDING, saved at once, opened, its card baked ------------------
console.log('[5] + adds an elevation centred on the BUILDING, not the landscape');
const n5 = sim.cloudSaves.length, scenes5 = pm.PresentationMode__SavedCameraScenes__Scenes.length;
head.lastChild.click(); await settle();
const added = elData.Na__ElevData__GetElevations(null)[1];
assert.ok(added);
const origin = elData.Na__ElevData__GetPlaneOriginMm(added);
assert.deepEqual([ origin.xMm, origin.zMm ], [ 15000, -15000 ], JSON.stringify(origin));
assert.equal(pm.PresentationMode__SavedCameraScenes__Scenes.length, scenes5 + 1);
assert.equal(groupOf(added.Elevation__SceneId), 'Group_005', 'filed in Elevations');
assert.equal(fold.Na__DrawFold__GetOpenId(), added.Elevation__Id);
assert.ok(elIn(sim.cloudSaves[n5], added.Elevation__Id) && elIn(sim.localSaves[n5], added.Elevation__Id), 'saved at once, R2 + local');
await waitBake();
assert.equal(sim.captures[sim.captures.length - 1][0], added.Elevation__SceneId);
assert.equal(sim.cloudSaves.length, n5 + 2, 'the add saved once and the bake saved once');
ok('"' + added.Elevation__Name + '": plane through (15 000, -15 000) - the building\'s centre (the landscape would put it at about (40 000, -40 000)); card in Elevations; saved at once (R2 + local); opened; its card baked and the bake saved once through SaveBlock (TV s.2 items 7, 9; v2.82.0; v2.46.0 seam)');

// [6] AN EDIT IS A DRAFT; another save writes the last-updated record ------------------------------------
console.log('[6] a plane slider move lights NOT UPDATED; another save carries the last-updated record');
row = await openRow(added.Elevation__Id);
const before = JSON.parse(JSON.stringify(added));
const sliderX = row.querySelectorAll('.na-fp-dev__slider')[0];
sliderX.value = '16000'; sliderX.dispatch('input'); sliderX.dispatch('change'); await settle();
row = rowOf(added.Elevation__Id);
assert.equal(elData.Na__ElevData__GetPlaneOriginMm(added).xMm, 16000);
assert.equal(chips(row).dirty, true); assert.equal(btn(row, 'update').disabled, false);
const n6 = sim.cloudSaves.length;
assert.equal(await data.Na__DrawData__Save(showToast), true);
assert.equal(elIn(lastCloud(), added.Elevation__Id).Elevation__PlaneOriginMm.PosX ?? elIn(lastCloud(), added.Elevation__Id).Elevation__PlaneOriginMm.xMm, before.Elevation__PlaneOriginMm.PosX ?? before.Elevation__PlaneOriginMm.xMm);
assert.equal(sim.cloudSaves.length, n6 + 1);
ok('Plane X 15 000 -> 16 000: NOT UPDATED, Update awake; a Save from any other panel wrote the plane as last updated (TV s.2 items 5, 16)');

// [7] SECTION + UPDATE: the live cut through the adapter, the card moves to Cross Sections ON UPDATE -------
console.log('[7] Drawing type Section: live cut through the adapter; the card moves to Cross Sections when Update keeps it');
const choice = row.querySelector('.na-draw-dev__choice');
choice.children[1].click(); await settle();
assert.equal(added.Elevation__Mode, 'section');
assert.equal(groupOf(added.Elevation__SceneId), 'Group_005', 'a draft does not move the card');
btn(rowOf(added.Elevation__Id), 'preview').click(); await settle();
row = rowOf(added.Elevation__Id);
assert.equal(chips(row).active, true);
const sx = row.querySelectorAll('.na-fp-dev__slider')[0];
sx.value = '16500'; sx.dispatch('input'); sx.dispatch('change'); await settle();
const cuts = sim.calls.filter((c) => c[0] === 'SetPlaneDistanceMm');
assert.ok(cuts.length >= 2 && cuts[0][1] === 'ElevationCut__' + added.Elevation__Id && cuts.some((c) => c[3] === true) && cuts.some((c) => c[3] === false), JSON.stringify(cuts));
const d7 = sim.dialogs.length, n7 = sim.cloudSaves.length, cap7 = sim.captures.length;
sim.answers.push(true);
btn(rowOf(added.Elevation__Id), 'update').click(); await settle(); await tick(20); await settle();
const dlg = sim.dialogs[d7];
assert.ok(/^Update "/.test(dlg.title), dlg.title);
assert.ok(dlg.details.some((l) => l === 'Drawing type: elevation becomes section.'), JSON.stringify(dlg.details));
assert.ok(dlg.details.some((l) => /^Plane moved /.test(l)), JSON.stringify(dlg.details));
assert.equal(dlg.confirmLabel, 'Update Elevation');
const bakes = sim.calls.filter((c) => c[0] === 'BakeBeforeSave');
assert.equal(bakes[bakes.length - 1][1], n7, 'linework bake before the save');
assert.equal(sim.cloudSaves.length, n7 + 1, 'ONE save');
assert.equal(elIn(lastCloud(), added.Elevation__Id).Elevation__Mode, 'section');
assert.equal(groupOf(added.Elevation__SceneId), 'Group_006', 'the card moved to Cross Sections');
const savedScene = lastCloud().PresentationMode__SavedCameraScenes ? lastCloud().PresentationMode__SavedCameraScenes.PresentationMode__SavedCameraScenes__Scenes.find((s) => s.PresentationMode__Scene__Id === added.Elevation__SceneId) : null;
assert.ok(savedScene && savedScene.PresentationMode__Scene__GroupId === 'Group_006', 'the save carried the card in its new group');
assert.equal(sim.captures.length, cap7 + 1, 'on screen: its card re-captured');
assert.equal(draft.Na__DrawDraft__IsDirty(), false);
ok('live cut "ElevationCut__' + added.Elevation__Id + '" through Na__DrawView__SectionAdapter__SetPlaneDistanceMm (' + cuts.length + ' calls, live then exact; DIV-2); the card stayed in Elevations while a draft and moved to Cross Sections (Group_006) in the Update\'s ONE save, linework baked first, card re-captured (D28; TV s.2 items 2-4; D20)');

// [8] THE FOG BLOCK: On / Off with a render requested; a draft edit put into words; not a move ----------
console.log('[8] the fog block turns fog on and off, asks for a render, and is a draft edit');
row = rowOf(added.Elevation__Id);
let fogEl = row.querySelector('.na-depthfog-dev');
const fogChoice = fogEl.querySelector('.na-draw-dev__choice');
const renders0 = sim.calls.filter((c) => c[0] === 'RequestRender').length;
fogChoice.children[1].click(); await settle();
assert.equal(elData.Na__ElevData__GetDepthFog(added).enabled, true);
assert.equal(sim.calls.filter((c) => c[0] === 'RequestRender').length, renders0 + 1, 'one render asked for');
assert.equal(chips(rowOf(added.Elevation__Id)).dirty, true);
assert.ok(draft.Na__DrawDraft__Describe().some((l) => /^Fog: switched on - /.test(l)), JSON.stringify(draft.Na__DrawDraft__Describe()));
fogEl = rowOf(added.Elevation__Id).querySelector('.na-depthfog-dev');
const fogInputs = fogEl.all((n) => n.tagName === 'INPUT');
change(fogInputs[1], 9000); await settle();
assert.equal(elData.Na__ElevData__GetDepthFog(added).endDepthMm, 9000);
assert.equal(sim.calls.filter((c) => c[0] === 'RequestRender').length, renders0 + 2);
const d8 = sim.dialogs.length;
sim.answers.push(true);
btn(rowOf(added.Elevation__Id), 'update').click(); await settle(); await tick(20); await settle();
assert.equal(sim.dialogs[d8].isDestructive === true, false, 'a fog-only Update keeps the ordinary green dialog');
assert.equal(elIn(lastCloud(), added.Elevation__Id).Elevation__DepthFog.DepthFog__Enabled, true);
fogEl = rowOf(added.Elevation__Id).querySelector('.na-depthfog-dev');
const rendersOff = sim.calls.filter((c) => c[0] === 'RequestRender').length;
fogEl.querySelector('.na-draw-dev__choice').children[0].click(); await settle();
assert.equal(elData.Na__ElevData__GetDepthFog(added).enabled, false);
assert.equal(sim.calls.filter((c) => c[0] === 'RequestRender').length, rendersOff + 1);
assert.ok(draft.Na__DrawDraft__Describe().includes('Fog: switched off.'));
sim.answers.push(true);
btn(rowOf(added.Elevation__Id), 'revert').click(); await settle();
assert.equal(elData.Na__ElevData__GetDepthFog(added).enabled, true, 'Revert puts the kept fog back');
ok('On: fog on, RequestRender asked once, NOT UPDATED, "Fog: switched on - ..."; End 9000 another render; Update (green, not red: fog is not a move) saved it; Off: "Fog: switched off.", Revert put it back on (TV 2.1.0 onFogChange; DR-15)');

// [9] STYLE ROWS AND THE EXCLUSION TRIM (D33, OC-11) ------------------------------------------------------
console.log('[9] the Advanced fold\'s style toggles re-apply live; exclusion tokens are trimmed as the plans\'');
row = rowOf(added.Elevation__Id);
const advRow = row.querySelector('.na-pm-dev__advanced');
const applies0 = sim.calls.filter((c) => c[0] === 'ApplyStyles').length;
const wc = advRow.all((n) => n.tagName === 'INPUT' && n.type === 'checkbox')[3];
wc.checked = !wc.checked; wc.dispatch('change'); await settle();
assert.equal(sim.calls.filter((c) => c[0] === 'ApplyStyles').length, applies0 + 1);
assert.equal(chips(rowOf(added.Elevation__Id)).dirty, true);
assert.ok(draft.Na__DrawDraft__Describe().includes('Drawing styles have changed.'));
const ex = rowOf(added.Elevation__Id).querySelector('.na-pm-dev__advanced').all((n) => n.tagName === 'INPUT' && n.type === 'text')[0];
change(ex, ' Trees,  Hedges , ,Fences'); await settle();
assert.deepEqual(elData.Na__ElevData__GetExcludeTokens(added), [ 'Trees', 'Hedges', 'Fences' ]);
sim.answers.push(true);
btn(rowOf(added.Elevation__Id), 'revert').click(); await settle();
assert.equal(draft.Na__DrawDraft__IsDirty(), false);
assert.equal(elData.Na__ElevData__GetExcludeTokens(added), null);
ok('Whitecard toggled on the elevation on screen: Na__ElevationMode__ApplyStyles ran, NOT UPDATED, "Drawing styles have changed."; " Trees,  Hedges , ,Fences" stored ["Trees","Hedges","Fences"] as the plans store it (OC-11); Revert cleared both');

// [10] UPDATE WAITS FOR A RUNNING BAKE ----------------------------------------------------------------------
console.log('[10] Update is refused while a thumbnail bake is running');
const vd = rowOf(added.Elevation__Id).all((n) => n.tagName === 'INPUT' && n.placeholder === 'Full')[0];
change(vd, 4000); await settle();
const d10 = sim.dialogs.length;
thumb.Na__DrawThumb__Queue({ items : [ { drawing : test, sceneId : test.Elevation__SceneId, label : 'x' } ],
    adapter : { kind : 'elevation', enter : () => true, isShowing : () => true, getActive : () => null, exit : () => {}, storeFraming : () => {} }, save : async () => true, showToast });
btn(rowOf(added.Elevation__Id), 'update').click(); await tick(0);
assert.equal(sim.dialogs.length, d10, 'no dialog');
assert.ok(toasts[toasts.length - 1][0].startsWith('Thumbnails are still being baked'));
await waitBake();
sim.answers.push(true);
btn(rowOf(added.Elevation__Id), 'revert').click(); await settle();
ok('pressed during a bake: refused with a toast, no dialog; after it the row reverts cleanly');

// [11] LEAVING A CHANGED ROW ASKS ---------------------------------------------------------------------------
console.log('[11] leaving a changed row asks: Keep Editing stays, Discard puts it back');
const nm = rowOf(added.Elevation__Id).querySelector('.na-fp-dev__name');
const nameBefore = added.Elevation__Name;
nm.value = 'Coach House Section'; nm.dispatch('change'); await settle();
assert.equal(added.Elevation__Name, 'Coach House Section');
assert.equal(added[elData.Na__ElevData__STYLE_KEYS ? 'Elevation__NameIsAuto' : 'x'], false);
const d11 = sim.dialogs.length;
sim.answers.push(false);
rowOf(test.Elevation__Id).querySelector('.na-draw-dev__chips').parentNode.click(); await settle();
assert.ok(/^Discard the changes to /.test(sim.dialogs[d11].title), sim.dialogs[d11].title);
assert.equal(fold.Na__DrawFold__GetOpenId(), added.Elevation__Id);
sim.answers.push(false);
EL.toggle.click(); await settle();
assert.ok(panel.classList.contains('is-open'), 'the panel stays open');
sim.answers.push(true);
rowOf(test.Elevation__Id).querySelector('.na-draw-dev__chips').parentNode.click(); await settle();
assert.equal(fold.Na__DrawFold__GetOpenId(), test.Elevation__Id);
assert.equal(added.Elevation__Name, nameBefore);
ok('a typed name (Elevation__NameIsAuto false) is a draft: opening another row asked (Keep Editing kept it), closing the panel asked and stayed open, Discard put "' + nameBefore + '" back (TV s.2 items 13, 16)');

// [12] SEED N / E / S / W NAMED FROM NORTH, centred on the building, one bake run ----------------------------
console.log('[12] Seed N / E / S / W: named from the project\'s north, centred on the building, one bake run');
north.Na__NorthData__Set(90);
await settle();
const n12 = sim.cloudSaves.length, cap12 = sim.captures.length, d12 = sim.dialogs.length;
sim.answers.push(true);                                                                 // "Add four more elevations?"
foot.children[1].click(); await settle();
const seededFour = panel.children.find((c) => c.classList.contains('na-pm-dev__global-actions')) && elData.Na__ElevData__GetElevations(null).slice(2);
// the foot was rebuilt; press the live one if the stale one did nothing
if (seededFour.length === 0) { panel.children.find((c) => c.classList.contains('na-pm-dev__global-actions')).children[1].click(); await settle(); }
const four = elData.Na__ElevData__GetElevations(null).slice(2);
assert.equal(four.length, 4, 'four made');
assert.ok(/Add four more/.test(sim.dialogs[d12].title), 'asked first: the project already had elevations');
const names = four.map((e) => e.Elevation__Name).sort();
assert.deepEqual(names, [ 'East Elevation', 'North Elevation', 'South Elevation', 'West Elevation' ], JSON.stringify(names));
four.forEach((e) => { const o = elData.Na__ElevData__GetPlaneOriginMm(e); assert.deepEqual([ o.xMm, o.zMm ], [ 15000, -15000 ]); assert.equal(e.Elevation__SeededFrom, undefined); });
await waitBake();
assert.equal(sim.captures.length, cap12 + 4, 'four cards baked');
assert.equal(sim.cloudSaves.length, n12 + 2, 'the seed saved once and the bake run saved once');
ok('north at 90: the four are ' + JSON.stringify(names) + ', each through the building\'s centre (15 000, -15 000); asked first; one save, then ONE bake run (4 captures) and ONE save; no Elevation__SeededFrom written (TV s.2 item 9; v2.82.0; DR-32)');

// [13] Elevation__SeededFrom PRESERVED ON READ AND SAVE (DR-32) ----------------------------------------------
console.log('[13] Elevation__SeededFrom survives read and save');
const tIn = elIn(lastCloud(), test.Elevation__Id);
assert.equal(tIn.Elevation__SeededFrom, 'manual');
assert.equal(elIn(sim.localSaves[sim.localSaves.length - 1], test.Elevation__Id).Elevation__SeededFrom, 'manual');
assert.equal(elData.Na__ElevData__GetElevationById(null, test.Elevation__Id).Elevation__SeededFrom, 'manual');
ok('TEST ELEVATION keeps Elevation__SeededFrom "manual" in memory and in the last R2 and local saves (DR-32, F.8 C20)');

// [14] THE CROSS SECTIONS PLACEHOLDER (48) -----------------------------------------------------------------------
console.log('[14] the Cross Sections panel lists the project\'s Section-type elevations and follows CHANGED_EVENT');
XS.toggle.click(); await settle();
assert.ok(XS.panel.classList.contains('is-open'));
const xhead = XS.panel.children[0];
assert.ok(xhead.classList.contains('na-draw-dev__panel-head'));
assert.equal(xhead.lastChild.disabled, true, 'the + is switched off');
const listed = () => { const l = XS.panel.querySelector('.na-draw-dev__placeholder-list'); return l ? l.children.map((li) => li.textContent) : []; };
assert.deepEqual(listed(), [ added.Elevation__Name ]);
// make another a section through Elevations and keep it: the list follows the drawings' changed event
row = await openRow(four[0].Elevation__Id);
row.querySelector('.na-draw-dev__choice').children[1].click(); await settle();
sim.answers.push(true);
btn(rowOf(four[0].Elevation__Id), 'update').click(); await settle(); await tick(20); await settle();
assert.equal(groupOf(four[0].Elevation__SceneId), 'Group_006');
assert.deepEqual(listed().sort(), [ added.Elevation__Name, four[0].Elevation__Name ].sort(), JSON.stringify(listed()));
ok('placeholder: shared head with the + disabled, the note, and the list ' + JSON.stringify(listed()) + ' - it grew when an Update made "' + four[0].Elevation__Name + '" a section (Na__DrawData__CHANGED_EVENT); that card moved to Cross Sections too (DR-26, D28)');

// [15] DELETE ----------------------------------------------------------------------------------------------------
console.log('[15] Delete asks, removes the elevation and its card, and saves');
const d15 = sim.dialogs.length, n15 = sim.cloudSaves.length, sceneId15 = four[1].Elevation__SceneId, id15 = four[1].Elevation__Id;
await openRow(id15);
sim.answers.push(true);
rowOf(id15).querySelector('.na-draw-dev__danger').querySelector('.na-pm-dev__btn--danger').click(); await settle(); await tick(10); await settle();
assert.ok(/Delete/.test(sim.dialogs[d15].title));
assert.equal(elData.Na__ElevData__GetElevationById(null, id15), null);
assert.equal(groupOf(sceneId15), undefined);
assert.equal(sim.cloudSaves.length, n15 + 1);
assert.ok(!elIn(lastCloud(), id15));
ok('Delete asked, removed the elevation and its card, and saved (TV s.2 item 8)');

// [16] NO TRUEVISION IDENTITY IN WHAT A USER SEES --------------------------------------------------------------
const seen = toasts.map((t) => t[0]).join(' ') + JSON.stringify(sim.dialogs) + panel.all(() => true).map((n) => n._text + ' ' + n.title).join(' ') + XS.panel.all(() => true).map((n) => n._text + ' ' + n.title).join(' ');
assert.ok(!/TrueVision|Noble Architecture|NaProjectPortal|PS01/.test(seen));
ok('no TrueVision / Noble Architecture / NaProjectPortal / PS01 text in any toast, dialog or panel string shown');

console.log('\n' + checks + ' checks, ALL PASSED; R2 writes recorded ' + sim.cloudSaves.length + ', local ' + sim.localSaves.length + ', captures ' + sim.captures.length);
process.exit(0);
