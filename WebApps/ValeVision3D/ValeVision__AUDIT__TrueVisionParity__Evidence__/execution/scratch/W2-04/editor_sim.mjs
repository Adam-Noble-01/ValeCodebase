// W2-04 scratch (read-only on the app): drive the LANDED floor plan Dev menu 2.0.0 in Node, through
// ValeVision's own import map and real modules (draft guard, row shell, accordion, ProjectData's save
// and payload guard, the thumbnail bake, the 47 planes, the storey row), on Doous's own drawings and
// scenes. Only these are swapped (hooks_w204.mjs): the R2 and Flask writes (recorded), the floor plan
// mode controller's viewport (a fake on screen / off screen state), the modal (scripted answers,
// recorded), the thumbnail capture, the linework bake and the adapter's live cut (recorded).
//
// It checks the package's acceptance against TrueVision's DrawingMenus plan s.2, and every VV seam.
// Run: node --import ./register_w204.mjs editor_sim.mjs
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { installDom, fileFetch, StubElement, byId } from './dom_stubs.mjs';

installDom();
globalThis.Element = StubElement;
globalThis.HTMLElement = StubElement;
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
const settle = async () => { for (let i = 0; i < 6; i++) await tick(0); };

// MODULES -----------------------------------------------------------------------------------------
const THREE   = await import('three');
const editor  = await mod('42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js');
const data    = await mod('40__System__DrawingViewCore/Na__DrawView__ProjectData__.js');
const scenes  = await mod('21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js');
const fpData  = await mod('42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js');
const fpCfg   = await mod('42__System__FloorPlanViews/Na__FloorPlan__ConfigState__.js');
const fold    = await mod('40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js');
const draft   = await mod('40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js');
const thumb   = await mod('40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js');
const overlay = await mod('47__System__DrawingPlanes/Na__DrawingPlanes__Overlay__.js');
const planeUi = await mod('47__System__DrawingPlanes/Na__DrawingPlanes__DevMenu__Controls__.js');
await fpCfg.Na__FpCfg__Load();
console.log('[1] the landed editor, its row builders and the drawing core link and evaluate');
assert.deepEqual(Object.keys(editor).sort(), [ 'Na__FloorPlan__DevMenu__Initialize', 'Na__FloorPlan__DevMenu__Refresh', 'Na__FloorPlan__DevMenu__SetModelRoot' ]);
ok('editor links through the import map with every real import; its three exports are TrueVision\'s');

// THE PROJECT: Doous's drawings and scenes (a copy in memory; nothing on disk is written) ---------
const PROJECT = JSON.parse(readFileSync('D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/Projects/2026/3047__Doous/project.json', 'utf8'));
const pm = JSON.parse(JSON.stringify(PROJECT.PresentationMode__SavedCameraScenes));
scenes.Na__PresentationMode__ProjectJson__SetActiveConfig(pm, '2026/3047__Doous');
data.Na__DrawData__Load(JSON.parse(JSON.stringify(PROJECT.LayoutEditor__DrawingsData)), '2026/3047__Doous', pm);
await data.Na__DrawData__WhenBaseKnown();
assert.equal(fpData.Na__FpData__GetFloorPlans(null).length, 0);

// THE MODEL AND THE PLANES --------------------------------------------------------------------------
const scene = new THREE.Scene();
const modelRoot = new THREE.Group(); scene.add(modelRoot);
const g = new THREE.Group(); g.name = 'ValeVision__MainBuildingModel__ProposedWalls';
g.add(new THREE.Mesh(new THREE.BoxGeometry(10.8, 6, 8), new THREE.MeshBasicMaterial())); modelRoot.add(g);
scene.updateMatrixWorld(true);
const camera = new THREE.PerspectiveCamera(50, 1.25, 0.1, 2000); camera.position.set(30, 6, 30);
overlay.Na__PlaneOverlay__Initialize({ scene, modelRoot });
planeUi.Na__PlaneUi__Initialize({ showToast });

// THE DEV MENU MARKUP (index.html's ids) ---------------------------------------------------------------
const item = new StubElement('li'); item.id = 'naFloorPlanDevItem'; item.style.display = 'none';
const toggle = new StubElement('button'); toggle.id = 'naFloorPlanDevToggle';
const panel = new StubElement('div'); panel.id = 'naFloorPlanDevPanel';
item.appendChild(toggle); item.appendChild(panel); document.body.appendChild(item);

console.log('[2] Initialize as index.html does');
assert.equal(editor.Na__FloorPlan__DevMenu__Initialize({ modelRoot, camera, showToast }), true);
assert.equal(item.style.display, '');
ok('Initialize({ modelRoot, camera, showToast }) true; the menu item is revealed');

// HELPERS ----------------------------------------------------------------------------------------------
const rows = () => panel.children.filter((c) => c.classList.contains('na-fp-dev__row'));
const rowOf = (id) => rows().find((r) => r.querySelector('.na-fp-dev__name') && fpData.Na__FpData__GetPlanById(null, id) && r.querySelector('.na-fp-dev__name').value === fpData.Na__FpData__GetPlanById(null, id).FloorPlan__Name);
const chips = (row) => { const c = row.querySelector('.na-draw-dev__chips').children; return { active : !c[1].hidden, dirty : !c[2].hidden }; };
const btn = (row, cls) => row.querySelector('.na-draw-dev__actions').children[{ preview : 0, annotate : 1, update : 2, revert : 3 }[cls]];
const numberInputs = (row) => row.all((n) => n.tagName === 'INPUT' && n.type === 'number');
const change = (el, value) => { el.value = String(value); el.dispatch('change'); };
const waitBake = async () => { for (let i = 0; i < 400 && thumb.Na__DrawThumb__IsBusy(); i++) await tick(5); assert.equal(thumb.Na__DrawThumb__IsBusy(), false, 'bake finished'); };
const lastCloud = () => sim.cloudSaves[sim.cloudSaves.length - 1];
const planIn = (payload, id) => payload.LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__FloorPlans.find((p) => p.FloorPlan__Id === id);

// [3] THE PANEL ----------------------------------------------------------------------------------------
console.log('[3] the panel: + and Ground Floor in the head, no Save anywhere, Bake Missing in the foot');
toggle.click(); await settle();
assert.ok(panel.classList.contains('is-open'));
const head = panel.children[0];
assert.ok(head.classList.contains('na-draw-dev__panel-head'));
assert.deepEqual(head.children.map((c) => c.className), [ 'na-dropdown-menu__panel-title na-draw-dev__panel-title', 'na-pm-dev__btn na-fp-dev__quick-add', 'na-pm-dev__square-btn' ]);
assert.equal(head.children[1].textContent, '+ Ground Floor');
assert.equal(head.children[2].textContent, '+');
const allText = panel.all(() => true).map((n) => n._text).join('|');
assert.ok(!/Save Floor Plans|Save Thumbnail/.test(allText), 'no Save-all and no Save Thumbnail');
const foot = panel.children.find((c) => c.classList.contains('na-pm-dev__global-actions'));
assert.deepEqual(foot.children.map((b) => b.textContent), [ '+ Add Floor Plan', 'Seed From Model Storeys', 'Bake Missing Thumbnails' ]);
ok('head = title, "+ Ground Floor", square +; foot = + Add Floor Plan, Seed From Model Storeys, Bake Missing Thumbnails; no Save Floor Plans, no Save Thumbnail (TV s.2 items 1, 6, 9; D11)');

// [4] GROUND FLOOR QUICK ACTION: added, saved at once, opened, its card baked -------------------------------
console.log('[4] Ground Floor: added at floor level 0, saved at once, its row opened, its card baked');
const scenesBefore = pm.PresentationMode__SavedCameraScenes__Scenes.length;
head.children[1].click(); await settle();
const plans1 = fpData.Na__FpData__GetFloorPlans(null);
assert.equal(plans1.length, 1);
const gf = plans1[0];
assert.equal(gf.FloorPlan__Name, 'Ground Floor Plan');
assert.equal(gf.FloorPlan__FloorDatumMm, 0);
assert.equal(pm.PresentationMode__SavedCameraScenes__Scenes.length, scenesBefore + 1);
const gfScene = fpData.Na__FpData__FindSceneForPlan(pm, gf);
assert.ok(gfScene);
assert.equal(fold.Na__DrawFold__GetOpenId(), gf.FloorPlan__Id);
assert.ok(draft.Na__DrawDraft__IsActive('plan', gf.FloorPlan__Id) && !draft.Na__DrawDraft__IsDirty());
assert.ok(sim.cloudSaves.length >= 1);
assert.ok(planIn(sim.cloudSaves[0], gf.FloorPlan__Id));
assert.ok(planIn(sim.localSaves[0], gf.FloorPlan__Id));
ok('"Ground Floor Plan" at floor level 0 with its card; one save (R2 + local) holding it; its row is the open one and a clean draft (TV s.2 item 9; D11)');
await waitBake();
assert.deepEqual(sim.captures.map((c) => c[0]), [ gfScene.PresentationMode__Scene__Id ]);
assert.equal(sim.cloudSaves.length, 2, 'the bake saved once');
assert.equal(gfScene.PresentationMode__Scene__ThumbnailUrl, 'PresentationMode/Thumbnails/' + gfScene.PresentationMode__Scene__Id + '.webp');
assert.ok(sim.calls.some((c) => c[0] === 'EnterPlan' && c[1] === gf.FloorPlan__Id) && sim.calls.some((c) => c[0] === 'ExitPlan'));
ok('its card was baked: opened, captured (' + gfScene.PresentationMode__Scene__Id + '), put back, and the run saved once through SaveBlock (v2.46.0 seam)');

// A second plan, by the + (asks nothing: nothing is changed) ------------------------------------------------
head.children[2].click(); await settle(); await waitBake();
const second = fpData.Na__FpData__GetFloorPlans(null)[1];
assert.ok(second && fold.Na__DrawFold__GetOpenId() === second.FloorPlan__Id);
assert.equal(rows().length, 2);
assert.ok(fold.Na__DrawFold__IsOpen(second.FloorPlan__Id) && !fold.Na__DrawFold__IsOpen(gf.FloorPlan__Id));
ok('the + adds "' + second.FloorPlan__Name + '" and opens it; the Ground Floor row folds - one row open at a time (TV s.2 item 7)');

// [5] THE ROW: name, storey, plane controls, floor level, cut, depth, Advanced (styles), actions -----------
console.log('[5] the open row reads as TrueVision\'s, with the Advanced fold holding the style rows');
fold.Na__DrawFold__SetOpenId(gf.FloorPlan__Id); await settle();
let row = rowOf(gf.FloorPlan__Id);
const body = row.children.find((c) => c.className.includes('fold') || c.classList.contains('na-pm-dev__scene-body')) || row.children[1];
const adv = row.querySelector('.na-pm-dev__advanced');
assert.ok(adv, 'Advanced fold present');
const styleChecks = adv.all((n) => n.tagName === 'INPUT' && n.type === 'checkbox');
assert.equal(styleChecks.length, 4);
assert.ok(adv.all((n) => n.tagName === 'INPUT' && n.type === 'text').length === 1, 'the Exclude field');
const captions = row.all((n) => n.classList && n.classList.contains('na-draw-dev__caption')).map((n) => n.textContent);
assert.ok(captions.includes('Floor level'));
const actionTexts = row.querySelector('.na-draw-dev__actions').children.map((b) => b.textContent);
assert.deepEqual(actionTexts, [ 'Preview', 'Annotate', 'Update Floor Plan', 'Revert' ]);
assert.ok(row.querySelector('.na-draw-dev__danger'), 'Delete below a rule');
assert.equal(btn(row, 'update').disabled, true); assert.equal(btn(row, 'revert').disabled, true);
ok('row: captions ' + JSON.stringify(captions) + '; actions ' + JSON.stringify(actionTexts) + ' (Update and Revert asleep); Delete alone in the danger zone; Advanced holds 4 style toggles + Exclude (TV s.2 items 1, 8; D33)');

// [6] AN EDIT IS A DRAFT: NOT UPDATED, Update and Revert wake; the live cut goes through the adapter -------
console.log('[6] an edit lights NOT UPDATED; the live cut goes through the SectionAdapter');
assert.equal(chips(row).dirty, false);
const before = JSON.parse(JSON.stringify(gf));
const [cutInput, depthInput] = numberInputs(row);
change(cutInput, 1500); await settle();
row = rowOf(gf.FloorPlan__Id);
assert.equal(gf.FloorPlan__CutOffsetMm, 1500);
assert.equal(chips(row).dirty, true);
assert.equal(chips(rowOf(second.FloorPlan__Id)).dirty, false);
assert.equal(btn(row, 'update').disabled, false); assert.equal(btn(row, 'revert').disabled, false);
ok('cut above floor ' + before.FloorPlan__CutOffsetMm + ' -> 1500 mm: NOT UPDATED on that row only; Update and Revert awake (TV s.2 item 5)');
// Preview it, then drag the floor level slider: the live recut is the adapter's
btn(row, 'preview').click(); await settle();
row = rowOf(gf.FloorPlan__Id);
assert.equal(chips(row).active, true);
const slider = row.querySelector('.na-fp-dev__slider');
slider.value = '100'; slider.dispatch('input'); slider.dispatch('change'); await settle();
const cuts = sim.calls.filter((c) => c[0] === 'SetPlaneHeightMm');
assert.ok(cuts.length >= 2 && cuts[0][1] === 'FloorPlanCut__' + gf.FloorPlan__Id && cuts.some((c) => c[3] === true) && cuts.some((c) => c[3] === false));
assert.equal(cuts[cuts.length - 1][2], 100 + 1500);
ok('previewing: ON SCREEN chip; the floor level slider recuts live then exactly, through Na__DrawView__SectionAdapter__SetPlaneHeightMm (' + cuts.length + ' calls, last at ' + cuts[cuts.length - 1][2] + ' mm) (DIV-2 seam)');

// [7] ANOTHER SAVE WRITES THE LAST-UPDATED RECORD (the payload guard) ---------------------------------------
console.log('[7] Save Sheets (any Na__DrawData__Save) while the row is changed writes it as last updated');
const n7 = sim.cloudSaves.length;
assert.equal(await data.Na__DrawData__Save(showToast), true);
const guarded = planIn(lastCloud(), gf.FloorPlan__Id);
assert.equal(guarded.FloorPlan__CutOffsetMm, before.FloorPlan__CutOffsetMm);
assert.equal(guarded.FloorPlan__FloorDatumMm, before.FloorPlan__FloorDatumMm);
assert.equal(gf.FloorPlan__CutOffsetMm, 1500, 'the live record keeps the draft');
assert.equal(planIn(sim.localSaves[sim.localSaves.length - 1], gf.FloorPlan__Id).FloorPlan__CutOffsetMm, before.FloorPlan__CutOffsetMm);
assert.equal(sim.cloudSaves.length, n7 + 1);
ok('another panel\'s save wrote cut ' + guarded.FloorPlan__CutOffsetMm + ' / floor ' + guarded.FloorPlan__FloorDatumMm + ' (last updated) to R2 and local while the row shows 1500 / 100 (TV s.2 item 16, payload guard)');

// [8] UPDATE: the dialog names the changes and the sheets; linework bake first; one save; the card captured --
console.log('[8] Update: the dialog names what changed and the sheets drawn from it');
const sheets = data.Na__DrawData__GetSheetsArray();
sheets.push({ Sheet__Name : 'Ground Floor Plan', Sheet__Fields : { Sheet__Fields__DrawingNumber : 'D01' },
    Sheet__Viewports : [ { Viewport__Kind : '2d', Viewport__DrawingId : gf.FloorPlan__Id, Viewport__SceneId : gfScene.PresentationMode__Scene__Id } ] });
const d8 = sim.dialogs.length, n8 = sim.cloudSaves.length, cap8 = sim.captures.length;
sim.answers.push(true);
row = rowOf(gf.FloorPlan__Id);
btn(row, 'update').click(); await settle(); await tick(20); await settle();
const dlg = sim.dialogs[d8];
assert.ok(/^Update "Ground Floor Plan"\?$/.test(dlg.title));
assert.ok(dlg.details.some((l) => l === 'Floor level: 0 mm becomes 100 mm.'), JSON.stringify(dlg.details));
assert.ok(dlg.details.some((l) => /^Cut above floor: .* becomes 1[ ,]?500 mm\.$/.test(l)), JSON.stringify(dlg.details));
assert.ok(dlg.details.some((l) => /^The cut moves /.test(l)));
assert.ok(dlg.details.some((l) => /recaptured from the preview/.test(l)));
assert.ok(/D01/.test(dlg.footnote) && /may no longer line up/.test(dlg.footnote), dlg.footnote);
assert.equal(dlg.isDestructive, true); assert.equal(dlg.isCommit, true);
assert.equal(dlg.confirmLabel, 'Update Floor Plan');
ok('dialog: ' + JSON.stringify(dlg.details) + '; footnote names the sheet: "' + dlg.footnote.slice(0, 80) + '..."; red, because it moves a drawing a sheet draws from (TV s.2 item 2)');
const bakeCall = sim.calls.filter((c) => c[0] === 'BakeBeforeSave');
assert.equal(bakeCall.length, 1);
assert.equal(bakeCall[0][1], n8, 'the linework bake ran before the save');
assert.equal(sim.cloudSaves.length, n8 + 1, 'ONE save');
assert.equal(planIn(lastCloud(), gf.FloorPlan__Id).FloorPlan__CutOffsetMm, 1500);
assert.equal(planIn(lastCloud(), gf.FloorPlan__Id).FloorPlan__FloorDatumMm, 100);
assert.equal(sim.captures.length, cap8 + 1);
assert.equal(draft.Na__DrawDraft__IsDirty(), false);
row = rowOf(gf.FloorPlan__Id);
assert.equal(chips(row).dirty, false);
assert.ok(toasts.some((t) => /"Ground Floor Plan" updated\. Saved to R2 and the local project file\./.test(t[0])));
ok('confirmed: linework baked first (D20), then ONE save (R2 + local) carrying 1500 / 100, the card re-captured, NOT UPDATED cleared, toast says where it landed (TV s.2 items 3, 4)');

// [9] REVERT: restores in place, writes nothing ------------------------------------------------------------
console.log('[9] Revert puts the record back in place and writes nothing');
const sameObject = gf;
change(numberInputs(rowOf(gf.FloorPlan__Id))[1], 3000); await settle();
assert.equal(gf.FloorPlan__ViewDepthMm, 3000);
const n9 = sim.cloudSaves.length, d9 = sim.dialogs.length;
sim.answers.push(true);
btn(rowOf(gf.FloorPlan__Id), 'revert').click(); await settle();
assert.ok(/^Revert "Ground Floor Plan"\?$/.test(sim.dialogs[d9].title));
assert.ok(sim.dialogs[d9].details.some((l) => /^View depth: full becomes 3[ ,]?000 mm\.$/.test(l)), JSON.stringify(sim.dialogs[d9].details));
assert.equal(fpData.Na__FpData__GetPlanById(null, gf.FloorPlan__Id), sameObject, 'same object');
assert.ok(gf.FloorPlan__ViewDepthMm === null || gf.FloorPlan__ViewDepthMm === undefined);
assert.equal(gf.FloorPlan__CutOffsetMm, 1500);
assert.equal(sim.cloudSaves.length, n9, 'nothing written');
assert.equal(chips(rowOf(gf.FloorPlan__Id)).dirty, false);
ok('view depth 3000 -> Revert (asked, listing "View depth: full becomes 3000 mm."): the same record object is back at its last-updated state, nothing written (TV s.2 item 5)');

// [10] LEAVING A CHANGED ROW ASKS: keep editing, then discard ------------------------------------------------
console.log('[10] leaving a changed row asks: Keep Editing stays, Discard puts it back');
const nameInput = rowOf(gf.FloorPlan__Id).querySelector('.na-fp-dev__name');
nameInput.value = 'Ground Floor Plan - Proposed'; nameInput.dispatch('change'); await settle();
assert.equal(gf.FloorPlan__Name, 'Ground Floor Plan - Proposed');
const d10 = sim.dialogs.length;
sim.answers.push(false);                                                          // Keep Editing
rowOf(second.FloorPlan__Id).querySelector('.na-draw-dev__chips').parentNode.click(); await settle();
assert.ok(/^Discard the changes to "Ground Floor Plan"\?$/.test(sim.dialogs[d10].title), sim.dialogs[d10].title);
assert.equal(fold.Na__DrawFold__GetOpenId(), gf.FloorPlan__Id);
assert.equal(gf.FloorPlan__Name, 'Ground Floor Plan - Proposed');
sim.answers.push(false);                                                          // closing the panel: Keep Editing
toggle.click(); await settle();
assert.ok(panel.classList.contains('is-open'), 'the panel stays open');
sim.answers.push(true);                                                           // Discard
rowOf(second.FloorPlan__Id).querySelector('.na-draw-dev__chips').parentNode.click(); await settle();
assert.equal(fold.Na__DrawFold__GetOpenId(), second.FloorPlan__Id);
assert.equal(gf.FloorPlan__Name, 'Ground Floor Plan');
ok('opening another row with a changed name asked (Keep Editing kept it), closing the panel asked and stayed open, Discard put the name back and moved on (TV s.2 item 16 "leave prompt")');

// [11] STYLE ROWS: a draft edit; re-applied live to the plan on screen -----------------------------------
console.log('[11] the Advanced fold\'s style toggles are draft edits, re-applied live on screen');
fold.Na__DrawFold__SetOpenId(gf.FloorPlan__Id); await settle();
const applyBefore = sim.calls.filter((c) => c[0] === 'ApplyStyles').length;
const whitecard = rowOf(gf.FloorPlan__Id).querySelector('.na-pm-dev__advanced').all((n) => n.tagName === 'INPUT' && n.type === 'checkbox')[3];
whitecard.checked = !whitecard.checked; whitecard.dispatch('change'); await settle();
assert.equal(sim.calls.filter((c) => c[0] === 'ApplyStyles').length, applyBefore + 1);
assert.equal(chips(rowOf(gf.FloorPlan__Id)).dirty, true);
assert.ok(draft.Na__DrawDraft__Describe().includes('Drawing styles have changed.'));
sim.answers.push(true);
btn(rowOf(gf.FloorPlan__Id), 'revert').click(); await settle();
assert.equal(draft.Na__DrawDraft__IsDirty(), false);
ok('Whitecard toggled on the plan on screen: Na__FloorPlanMode__ApplyStyles ran, NOT UPDATED lit, Update would say "Drawing styles have changed."; Revert cleared it (D33 seam)');

// [12] UPDATE WAITS FOR A RUNNING BAKE ---------------------------------------------------------------------
console.log('[12] Update is refused while a thumbnail bake is running');
change(numberInputs(rowOf(gf.FloorPlan__Id))[0], 1400); await settle();
const d12 = sim.dialogs.length;
thumb.Na__DrawThumb__Queue({ items : [ { drawing : second, sceneId : fpData.Na__FpData__FindSceneForPlan(pm, second).PresentationMode__Scene__Id, label : 'x' } ],
    adapter : { kind : 'plan', enter : () => true, isShowing : () => true, getActive : () => null, exit : () => {}, storeFraming : () => {} }, save : async () => true, showToast });
btn(rowOf(gf.FloorPlan__Id), 'update').click(); await tick(0);
assert.equal(sim.dialogs.length, d12, 'no dialog');
assert.ok(toasts[toasts.length - 1][0].startsWith('Thumbnails are still being baked'));
await waitBake();
sim.answers.push(true);
btn(rowOf(gf.FloorPlan__Id), 'revert').click(); await settle();
ok('pressed during a bake: refused with a toast, no dialog; after the bake the row reverts cleanly');

// [13] THE CARD STATUS, CLIENT MEASURING, DELETE ------------------------------------------------------------
console.log('[13] Let clients measure saves at once; Delete asks, names the sheet and saves');
const n13 = sim.cloudSaves.length;
const clientCheck = panel.all((n) => n.tagName === 'INPUT' && n.type === 'checkbox' && n.className === 'na-dropdown-menu__checkbox')[0];
clientCheck.checked = true; clientCheck.dispatch('change'); await settle();
assert.equal(sim.cloudSaves.length, n13 + 1);
assert.equal(lastCloud().LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__ClientDimensionsEnabled ?? fpData.Na__FpData__GetClientDimensionsEnabled(pm), true);
ok('ticking "Let clients measure" saved at once (SaveBlock)');
const d13 = sim.dialogs.length, n13b = sim.cloudSaves.length;
sim.answers.push(true);
rowOf(gf.FloorPlan__Id).querySelector('.na-draw-dev__danger').querySelector('.na-pm-dev__btn--danger').click(); await settle(); await tick(10); await settle();
assert.ok(/Delete/.test(sim.dialogs[d13].title) && /D01/.test(JSON.stringify(sim.dialogs[d13])), JSON.stringify(sim.dialogs[d13]).slice(0, 300));
assert.equal(fpData.Na__FpData__GetPlanById(null, gf.FloorPlan__Id), null);
assert.equal(fpData.Na__FpData__FindSceneForPlan(pm, { FloorPlan__Id : gf.FloorPlan__Id, FloorPlan__SceneId : gfScene.PresentationMode__Scene__Id }), null);
assert.equal(sim.cloudSaves.length, n13b + 1);
assert.ok(!planIn(lastCloud(), gf.FloorPlan__Id));
ok('Delete asked (naming D01), removed the plan and its card, and saved (TV s.2 item 8)');

// [14] NO TRUEVISION IDENTITY IN WHAT A USER SEES ------------------------------------------------------------
const seen = toasts.map((t) => t[0]).join(' ') + JSON.stringify(sim.dialogs) + panel.all(() => true).map((n) => n._text + ' ' + n.title).join(' ');
assert.ok(!/TrueVision|Noble Architecture|NaProjectPortal/.test(seen));
ok('no TrueVision / Noble Architecture / NaProjectPortal text in any toast, dialog or panel string shown');

console.log('\n' + checks + ' checks, ALL PASSED; R2 writes recorded ' + sim.cloudSaves.length + ', local ' + sim.localSaves.length + ', captures ' + sim.captures.length);
process.exit(0);
