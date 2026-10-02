// W2-05 scratch: the Cross Section Tool Dev item (VV's own per-project gate, 41 DevControls) still reveals, opens,
// enables and saves under its renamed ids, beside TrueVision's Cross Sections placeholder (48) holding the ids the
// gate gave up; the two never answer each other's clicks. Markup is built from the LANDED index.html's own lines.
// Run: node --import ./register_gate.mjs gate_sim.mjs
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { installDom, fileFetch, StubElement } from '../W2-04/dom_stubs.mjs';

installDom();
globalThis.__sim = { cloudSaves : [], dialogs : [], calls : [] };
const sim = globalThis.__sim;
fileFetch(async (url) => {
    if (url === 'http://localhost:8000/api/projects/2026/3047__Doous') return { ok : true, status : 200, json : async () => ({ projectCode : '2026/3047__Doous' }) };
    return { ok : false, status : 404, json : async () => ({}), text : async () => '' };
});
const toasts = [];
const showToast = (m, e) => toasts.push([String(m), e === true]);
let checks = 0;
const ok = (label) => { checks++; console.log('  PASS', label); };
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0)); };

// MARKUP | the ids exactly as the landed index.html carries them
const page = readFileSync('D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/index.html', 'utf8');
const idsIn = (fromMarker, toMarker) => { const a = page.indexOf(fromMarker); const b = page.indexOf(toMarker, a); return [ ...page.slice(a, b).matchAll(/id="([^"]+)"/g) ].map((x) => x[1]); };
const gateIds = idsIn('CROSS SECTION TOOL (per-project feature gate)', 'PRESENTATION MODE SCENES');
const xsecIds = idsIn('CROSS SECTIONS (localhost dev only, placeholder, TV 48)', 'NORTH DIRECTION');
assert.deepEqual(gateIds, [ 'naCrossSectionToolDevItem', 'naCrossSectionToolDevToggle', 'naCrossSectionToolDevPanel', 'naCrossSectionToolDevEnableCheck', 'naCrossSectionToolDevSave' ]);
assert.deepEqual(xsecIds, [ 'naCrossSectionDevItem', 'naCrossSectionDevToggle', 'naCrossSectionDevPanel' ]);
const el = (tag, id, parent) => { const e = new StubElement(tag); e.id = id; parent.appendChild(e); return e; };
const gItem = el('li', gateIds[0], document.body); gItem.style.display = 'none';
const gToggle = el('button', gateIds[1], gItem); const gPanel = el('div', gateIds[2], gItem);
const gCheck = el('input', gateIds[3], gPanel); gCheck.type = 'checkbox'; const gSave = el('button', gateIds[4], gPanel);
const xItem = el('li', xsecIds[0], document.body); xItem.style.display = 'none';
const xToggle = el('button', xsecIds[1], xItem); const xPanel = el('div', xsecIds[2], xItem);
ok('the landed index.html gives the gate ' + JSON.stringify(gateIds) + ' and the 48 panel ' + JSON.stringify(xsecIds));

const VVM = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/';
const gate = await import(pathToFileURL(VVM + '41__System__CrossSectionView/Na__UiFeature__CrossSectionView__DevControls.js').href);
const xsec = await import(pathToFileURL(VVM + '48__System__CrossSectionViews/Na__CrossSection__DevMenu__Editor__.js').href);

gate.Na__UiFeature__InitializeCrossSectionDevControls({ showToast });
assert.equal(xsec.Na__CrossSection__DevMenu__Initialize(), true);
assert.equal(gItem.style.display, ''); assert.equal(xItem.style.display, '');
ok('both initialise on localhost and both items are revealed');

gToggle.click(); await settle();
assert.ok(gPanel.classList.contains('is-open')); assert.ok(!xPanel.classList.contains('is-open'));
xToggle.click(); await settle();
assert.ok(xPanel.classList.contains('is-open')); assert.equal(xPanel.children[0].classList.contains('na-draw-dev__panel-head'), true);
gToggle.click(); await settle();
assert.ok(!gPanel.classList.contains('is-open')); assert.ok(xPanel.classList.contains('is-open'));
ok('each toggle opens and closes only its own panel (no DOM id collision)');

gCheck.checked = true; gCheck.dispatch('change'); await settle();
assert.deepEqual(sim.calls[sim.calls.length - 1], [ 'SetFeatureEnabled', true ]);
gSave.click(); await settle();
assert.equal(sim.dialogs.length, 1); assert.ok(/ENABLE/.test(sim.dialogs[0].message));
assert.deepEqual(sim.cloudSaves[0], { projectCode : '2026/3047__Doous', CrossSection__Config : { CrossSection__Enabled : true, CrossSection__FillColor : '#f0f0f0', CrossSection__LineColor : '#323232', CrossSection__LineWidthPx : 2 } });
assert.ok(toasts.some((t) => t[0] === 'Cross section tool enabled for this project.'));
gate.Na__UiFeature__SyncCrossSectionDevCheckbox(false);
assert.equal(gCheck.checked, false);
ok('Enable For This Project switches the tool on live; Save Cross Section Config asks, then writes CrossSection__Config { Enabled true, style } through the R2-first save; the project-load sync still finds the checkbox');

console.log('\n' + checks + ' checks, ALL PASSED');
process.exit(0);
