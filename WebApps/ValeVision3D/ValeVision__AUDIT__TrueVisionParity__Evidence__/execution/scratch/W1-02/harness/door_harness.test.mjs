// =============================================================================
// W1-02 HARNESS - DOOR MODULE: OLD (VV 1.7.1) vs NEW (this package) vs TV 1.9.0
// =============================================================================
//
// Scratch test for package W1-02 (not a shipped test). Runs one scripted
// scenario - left clicks on every kind of door, mid-animation reversal, a drag,
// Walk/Fly proximity along a path, the Video Studio speed scale and
// SnapAllClosed - against three isolated copies of the door module on real
// three.js r184, and compares every MOD transform and door state frame by frame:
//   - NEW must equal OLD everywhere (ValeVision behaviour unchanged), and
//   - NEW must equal TV 1.9.0 wherever TV has the same API (TV parity).
// Then it checks what changes on purpose (left button only) and the 1.9.0 API:
// DescribeDoors returns the registry's own records, ComputePanelLocalPose,
// GetLiveProgress, IsDoorOpen, FindAdrAncestor, ResolveHitPanel, MOD types,
// FindDoorGroups, and the export set (TV's set plus VV's four).
//
// Run: python make_trees.py [--live]; node --import ./register.mjs door_harness.test.mjs
// =============================================================================

import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const HERE  = dirname(fileURLToPath(import.meta.url));
const TREES = join(HERE, 'trees');
const D25   = '02__Src__AppModules/25__System__3dObject__InteractionSystem/';
const DOOR  = '3dObjectIInteraction__Animation__ClickToOpenDoors__.js';
const FIND  = 'Na__DoorAnimation__FindDoorGroups.js';
const WALK  = '3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js';

// ---------------------------------------------------------------------------
// Browser globals the leaves touch, and a quiet console
// ---------------------------------------------------------------------------
globalThis.window = new EventTarget();
let renderRequests = 0;
const realDispatch = window.dispatchEvent.bind(window);
window.dispatchEvent = (e) => { if (e.type === 'na-request-render') renderRequests++; return realDispatch(e); };

const realLog = console.log, realWarn = console.warn;
const captured = [];
console.log  = (...a) => captured.push(['log', a.join(' ')]);
console.warn = (...a) => captured.push(['warn', a.join(' ')]);
const out = (...a) => realLog(...a);

const THREE = await import('three');

let passes = 0, failures = 0;
function check(name, cond, detail) {
    if (cond) passes++;
    else { failures++; out('FAIL  ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const config = JSON.parse(readFileSync(join(TREES, 'new', 'door_config.json'), 'utf8').replace(/^﻿/, ''))
    ['3dObject__InteractionsSystem']['3dObject__Interaction__DoorAnimation'];

async function loadTree(tree) {
    const base = pathToFileURL(join(TREES, tree) + '/').href;
    const door = await import(base + D25 + DOOR);
    const walk = await import(base + D25 + WALK);
    let find = null;
    try { find = await import(base + D25 + FIND); } catch { find = null; }
    return { tree, door, walk, find };
}

// ---------------------------------------------------------------------------
// The test model: every door kind the engine knows, mesh and linework twins
// ---------------------------------------------------------------------------
const DOORS = [
    { adr : 'ADR002__InteriorDoor__Test', at : [0, 0, -5], parts : [
        { name : 'MOD001__ROT__90-Deg__DoorPanel', pos : [0, 0, 0], leaf : [0.4, 1, 0], w : 0.8 },
        { name : 'ROT001__RotationPoint__DoorHingeCentre', pos : [0, 0, 0] },
        { name : 'OuterShell', pos : [0, 0, 0], frame : true } ] },
    { adr : 'ADR010__ExteriorDoubleDoor__', at : [5, 0, -5], parts : [
        { name : 'MOD001__ROT__-90-Deg__ExteriorDoubleDoorPanel', pos : [0, 0, 0], leaf : [0.4, 1, 0], w : 0.8 },
        { name : 'ROT001__RotationPoint__ExteriorDoubleDoorHingeCentre', pos : [0, 0, 0] },
        { name : 'MOD002__ROT__90-Deg__ExteriorDoubleDoorPanel', pos : [1.6, 0, 0], leaf : [-0.4, 1, 0], w : 0.8 },
        { name : 'ROT002__RotationPoint__ExteriorDoubleDoorHingeCentre', pos : [1.6, 0, 0] } ] },
    { adr : 'ADR007__BifoldDoor', at : [10, 0, -5], parts : [
        { name : 'MOD001__ROT__-85-Deg__BifoldPanel', pos : [0, 0, 0], leaf : [0.4, 1, 0], w : 0.8 },
        { name : 'MOD002__ROT__-95-Deg__MVE__X-600-mm__BifoldPanel', pos : [0.8, 0, 0], leaf : [0.4, 1, 0], w : 0.8 },
        { name : 'MOD003__ROT__-85-Deg__MVE__X-1340-mm__BifoldPanel', pos : [1.6, 0, 0], leaf : [0.4, 1, 0], w : 0.8 },
        { name : 'ROT001__RotationPoint__BifoldHingeCentre', pos : [0, 0, 0] },
        { name : 'ROT002__RotationPoint__BifoldHingeCentre', pos : [0.8, 0, 0] },
        { name : 'ROT003__RotationPoint__BifoldHingeCentre', pos : [1.6, 0, 0] },
        { name : 'MVE001__MovementPoint__BifoldPanelTrack', pos : [0, 2, 0] } ] },
    { adr : 'ADR009__SlidingDoor', at : [15, 0, -5], parts : [
        { name : 'MOD001__MVE__X+1200-mm__SlidingPanel', pos : [0, 0, 0], leaf : [0.6, 1, 0], w : 1.2 },
        { name : 'MOD002__FIXED__SlidingPanel', pos : [1.2, 0, 0.06], leaf : [0.6, 1, 0], w : 1.2 },
        { name : 'ROT001__RotationPoint__SlidingDoorPlaceholder', pos : [0, 0, 0] },
        { name : 'MVE001__MovementPoint__SlidingPanelTrack', pos : [0, 2, 0] } ] },
    { adr : 'ADR011__InteriorDoor__Mirrored', at : [20, 0, -5], mirror : true, parts : [
        { name : 'MOD001__ROT__90-Deg__DoorPanel', pos : [0, 0, 0], leaf : [0.4, 1, 0], w : 0.8 },
        { name : 'ROT001__RotationPoint__DoorHingeCentre', pos : [0, 0, 0] } ] },
    { adr : 'ADR012__ExteriorDoubleDoor__WithFixed', at : [25, 0, -5], parts : [
        { name : 'MOD001__ROT__90-Deg__ExteriorDoubleDoorPanel', pos : [0, 0, 0], leaf : [0.4, 1, 0], w : 0.8 },
        { name : 'ROT001__RotationPoint__ExteriorDoubleDoorHingeCentre', pos : [0, 0, 0] },
        { name : 'MOD002__FIXED__ExteriorDoubleDoorPanel', pos : [0.8, 0, 0], leaf : [0.4, 1, 0], w : 0.8 } ] },
    { adr : 'ADR013__NoModifiers', at : [30, 0, -5], parts : [
        { name : 'OuterShell', pos : [0, 0, 0], frame : true } ] }
];

function buildModel(tag) {
    const root     = new THREE.Group(); root.name = 'ModelRoot__' + tag;
    const doorCat  = new THREE.Group(); doorCat.name = 'Storey__GroundFloor__ProposedDoors';
    const wallCat  = new THREE.Group(); wallCat.name = 'Storey__GroundFloor__ProposedWalls';
    const meshRoot = new THREE.Group(); meshRoot.name = 'Storey__GroundFloor__ProposedDoors__MeshModel__';     meshRoot.userData.Na__ModelType = 'mesh';
    const lineRoot = new THREE.Group(); lineRoot.name = 'Storey__GroundFloor__ProposedDoors__LineworkModel__'; lineRoot.userData.Na__ModelType = 'linework';
    const wallMesh = new THREE.Group(); wallMesh.name = 'Storey__GroundFloor__ProposedWalls__MeshModel__';     wallMesh.userData.Na__ModelType = 'mesh';
    const wall     = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)); wall.name = 'WallSolid'; wallMesh.add(wall);
    wallCat.add(wallMesh);
    doorCat.add(meshRoot, lineRoot);
    root.add(wallCat, doorCat);

    const leaves = new Map();                                                   // <-- 'ADR|MOD001' -> leaf mesh
    const adrs   = new Map();                                                   // <-- ADR name -> mesh ADR object
    for (const spec of DOORS) {
        for (const kind of [ 'mesh', 'linework' ]) {
            const holder = new THREE.Group(); holder.name = spec.mirror ? 'Mirror__Container' : 'Placement';
            holder.position.set(...spec.at);
            if (spec.mirror) holder.scale.set(-1, 1, 1);
            const adr = new THREE.Group(); adr.name = spec.adr;
            holder.add(adr);
            for (const part of spec.parts) {
                const node = new THREE.Group(); node.name = part.name; node.position.set(...part.pos);
                if (part.leaf || part.frame) {
                    const geo  = new THREE.BoxGeometry(part.w || 1, 2, 0.04);
                    const body = kind === 'mesh' ? new THREE.Mesh(geo) : new THREE.LineSegments(new THREE.EdgesGeometry(geo));
                    body.name = 'Geometry__' + part.name.split('__').slice(-1)[0];   // <-- Real GLB leaves are not named MOD...
                    if (part.leaf) body.position.set(...part.leaf);
                    node.add(body);
                    if (kind === 'mesh' && part.leaf) leaves.set(spec.adr + '|' + part.name.slice(0, 6), body);
                }
                adr.add(node);
            }
            (kind === 'mesh' ? meshRoot : lineRoot).add(holder);
            if (kind === 'mesh') adrs.set(spec.adr, adr);
        }
    }
    root.updateMatrixWorld(true);
    return { root, meshRoot, lineRoot, wall, leaves, adrs };
}

// ---------------------------------------------------------------------------
// Pointer events on a canvas stand-in
// ---------------------------------------------------------------------------
function makeCanvas() {
    const canvas = new EventTarget();
    canvas.listenerCount = 0;
    const add = canvas.addEventListener.bind(canvas);
    canvas.addEventListener = (type, fn, opts) => { canvas.listenerCount++; return add(type, fn, opts); };
    canvas.getBoundingClientRect = () => ({ left : 0, top : 0, width : 800, height : 600 });
    return canvas;
}

function pointer(type, x, y, button, pointerType) {
    const e = new Event(type);
    Object.defineProperties(e, {
        clientX     : { value : x }, clientY : { value : y },
        button      : { value : button }, pointerType : { value : pointerType || 'mouse' }
    });
    return e;
}

const FULL = (v) => Number(v).toPrecision(17);
const pose = (o) => [ ...o.position.toArray(), ...o.quaternion.toArray() ].map(FULL);

// ---------------------------------------------------------------------------
// One run: the scripted scenario on one tree, traced frame by frame
// ---------------------------------------------------------------------------
async function runScenario(ns, options) {
    const model  = buildModel(ns.tree);
    const scene  = new THREE.Scene(); scene.add(model.root); scene.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1000);
    const canvas = makeCanvas();
    const reg    = ns.door.Na__DoorAnim__DoorRegistry;
    const trace  = [];
    const aimMiss = [];
    const ray    = new THREE.Raycaster();
    const center = new THREE.Vector3();

    const snap = (label) => {
        const doors = [];
        reg.forEach((rec, name) => doors.push({
            name, state : rec.state, p : FULL(rec.currentProgress), a : FULL(rec.currentAngleRad),
            panels : rec.panels.map((pl) => ({ t : pl.type, s : pl.state, p : FULL(pl.currentProgress), near : pl.proximityIsNear,
                                               m : pl.modObjectMesh ? pose(pl.modObjectMesh) : null,
                                               l : pl.modObjectLinework ? pose(pl.modObjectLinework) : null }))
        }));
        trace.push({ label, active : ns.door.Na__DoorAnimation__HasActiveAnimations(), doors });
    };
    const frames = (n, label, dt = 1000 / 60) => {
        for (let i = 0; i < n; i++) { ns.door.Na__DoorAnimation__Update(dt); scene.updateMatrixWorld(true); snap(label + ' f' + i); }
    };
    // Aim the camera square at a leaf's current centre and click it (button, drag distance, pointer type)
    const click = (key, label, button = 0, dragPx = 0, pointerType = 'mouse') => {
        const leaf = model.leaves.get(key);
        new THREE.Box3().setFromObject(leaf).getCenter(center);
        camera.position.set(center.x, center.y, center.z + 5);
        camera.lookAt(center);
        camera.updateMatrixWorld(true);
        scene.updateMatrixWorld(true);
        ray.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hits = ray.intersectObjects([ ...model.leaves.values() ], false);
        if (!hits.length || hits[0].object !== leaf) aimMiss.push(label);
        canvas.dispatchEvent(pointer('pointerdown', 400, 300, button, pointerType));
        canvas.dispatchEvent(pointer('pointerup', 400 + dragPx, 300, button, pointerType));
        snap(label);
    };

    ns.door.Na__DoorAnimation__Initialize(scene, camera, canvas, [ model.meshRoot ], [ model.lineRoot ], config);
    const initialPoses = new Map();
    reg.forEach((rec) => rec.panels.forEach((pl) => initialPoses.set(pl.modObjectMesh, pose(pl.modObjectMesh))));
    snap('init');

    // Orbit clicks (left button): every door kind
    click('ADR002__InteriorDoor__Test|MOD001', 'click interior');                frames(45, 'interior opening');
    click('ADR002__InteriorDoor__Test|MOD001', 'click interior again');          frames(12, 'interior closing');
    click('ADR002__InteriorDoor__Test|MOD001', 'reverse mid-animation');         frames(45, 'interior reversing');
    click('ADR010__ExteriorDoubleDoor__|MOD001', 'click exterior left leaf');    frames(45, 'exterior left opening');
    click('ADR010__ExteriorDoubleDoor__|MOD002', 'click exterior right leaf');   frames(20, 'exterior right opening');
    click('ADR007__BifoldDoor|MOD002', 'click bifold slave');                    frames(120, 'bifold opening');
    click('ADR009__SlidingDoor|MOD001', 'click sliding leaf');                   frames(45, 'sliding opening');
    click('ADR009__SlidingDoor|MOD002', 'click sliding fixed leaf');             frames(45, 'sliding closing');
    click('ADR011__InteriorDoor__Mirrored|MOD001', 'click mirrored');            frames(45, 'mirrored opening');
    click('ADR012__ExteriorDoubleDoor__WithFixed|MOD001', 'click fixed-pair leaf'); frames(45, 'fixed-pair opening');
    click('ADR002__InteriorDoor__Test|MOD001', 'drag on interior (no click)', 0, 20); frames(3, 'after drag');
    click('ADR012__ExteriorDoubleDoor__WithFixed|MOD002', 'click fixed leaf of pair'); frames(45, 'fixed leaf of pair');

    // Walk/Fly proximity along a path past every door
    ns.walk.Na__DoorProximity__Initialize(1500);
    ns.walk.Na__DoorProximity__SetEnabled(true);
    const capsule = new THREE.Vector3();
    for (let x = -3; x <= 33; x += 0.5) {
        capsule.set(x, 1, -4.2);
        ns.walk.Na__DoorProximity__Update(capsule);
        frames(3, 'walk x=' + x);
    }
    ns.walk.Na__DoorProximity__SetEnabled(false);
    frames(150, 'settle');

    if (options.videoStudio) {
        const d = ns.door;
        trace.push({ label : 'base duration', value : d.Na__DoorAnimation__GetBaseDurationMs() });
        d.Na__DoorAnimation__SetSpeedScale(-3);
        trace.push({ label : 'speed after bad value', value : d.Na__DoorAnimation__GetSpeedScale() });
        d.Na__DoorAnimation__SetSpeedScale(0.5);
        trace.push({ label : 'speed', value : d.Na__DoorAnimation__GetSpeedScale() });
        click('ADR002__InteriorDoor__Test|MOD001', 'vs click interior');          frames(30, 'vs interior half speed');
        click('ADR007__BifoldDoor|MOD001', 'vs click bifold');                    frames(30, 'vs bifold half speed');
        click('ADR010__ExteriorDoubleDoor__|MOD001', 'vs click exterior leaf');   frames(10, 'vs exterior half speed');
        const moved = d.Na__DoorAnimation__SnapAllClosed();
        snap('vs snap all closed');
        trace.push({ label : 'snap moved', value : moved });
        trace.push({ label : 'snap again', value : d.Na__DoorAnimation__SnapAllClosed() });
        let back = true;
        reg.forEach((rec) => rec.panels.forEach((pl) => {
            if (JSON.stringify(pose(pl.modObjectMesh)) !== JSON.stringify(initialPoses.get(pl.modObjectMesh))) back = false;
        }));
        trace.push({ label : 'every MOD back at its initial pose', value : back });
        d.Na__DoorAnimation__SetSpeedScale(1);
    }

    return { trace, aimMiss, model, scene, camera, canvas, click, frames, snap, initialPoses };
}

function digest(trace) { return createHash('sha1').update(JSON.stringify(trace)).digest('hex').slice(0, 12); }

function firstDifference(a, b) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return { step : i, label : a[i].label, a : a[i], b : b[i] };
    return a.length === b.length ? null : { step : n, lengths : [ a.length, b.length ] };
}

// ---------------------------------------------------------------------------
// 1. Same scenario on the three trees
// ---------------------------------------------------------------------------
const OLD = await loadTree('old');
const NEW = await loadTree('new');
const TV  = await loadTree('tv');

captured.length = 0;
const runOld = await runScenario(OLD, { videoStudio : true });
const logOld = captured.splice(0);
const runNew = await runScenario(NEW, { videoStudio : true });
const logNew = captured.splice(0);
const runTv  = await runScenario(TV,  { videoStudio : false });
captured.length = 0;
const commonLength = runTv.trace.length;
const digests = { old : digest(runOld.trace), new : digest(runNew.trace), tv : digest(runTv.trace),
                  newShared : digest(runNew.trace.slice(0, commonLength)), steps : runOld.trace.length };

check('harness aim: every click hit its intended leaf (old)', runOld.aimMiss.length === 0, runOld.aimMiss);
check('harness aim: every click hit its intended leaf (new)', runNew.aimMiss.length === 0, runNew.aimMiss);
check('harness aim: every click hit its intended leaf (tv)',  runTv.aimMiss.length === 0,  runTv.aimMiss);

check('registry: 6 doors registered (the ADR without MODs skipped)', NEW.door.Na__DoorAnim__DoorRegistry.size === 6, NEW.door.Na__DoorAnim__DoorRegistry.size);

const diffOldNew = firstDifference(runOld.trace, runNew.trace);
check('NEW equals OLD on every frame (clicks, reversal, drag, proximity, speed scale, SnapAllClosed)', diffOldNew === null, diffOldNew);

const diffNewTv =firstDifference(runNew.trace.slice(0, commonLength), runTv.trace);
check('NEW equals TV 1.9.0 on every shared frame (speed scale 1.0)', diffNewTv === null, diffNewTv);
check('NEW log lines equal OLD log lines', JSON.stringify(logOld) === JSON.stringify(logNew),
      firstDifference(logOld.map((l) => ({ label : l.join(' ') })), logNew.map((l) => ({ label : l.join(' ') }))));

const traceNew = runNew.trace;
const byLabel  = (label) => traceNew.find((s) => s.label === label);
const door     = (s, name) => s.doors.find((d) => d.name === name);
check('a left click opens the interior door', door(byLabel('click interior'), 'ADR002__InteriorDoor__Test').state === 'OPENING');
check('the interior door ends open', door(byLabel('interior opening f44'), 'ADR002__InteriorDoor__Test').state === 'OPEN');
check('a drag does not toggle', door(byLabel('drag on interior (no click)'), 'ADR002__InteriorDoor__Test').state
                              === door(byLabel('fixed-pair opening f44'), 'ADR002__InteriorDoor__Test').state);
const ext = door(byLabel('exterior left opening f44'), 'ADR010__ExteriorDoubleDoor__');
check('exterior double: only the clicked leaf moves', ext.panels[0].s === 'OPEN' && ext.panels[1].s === 'CLOSED', ext.panels.map((p) => p.s));
check('bifold opens in lockstep over 1800 ms', door(byLabel('bifold opening f100'), 'ADR007__BifoldDoor').state === 'OPENING'
                                             && door(byLabel('bifold opening f119'), 'ADR007__BifoldDoor').state === 'OPEN');
check('walk proximity opened and closed doors along the path',
      traceNew.some((s) => s.label.startsWith('walk') && s.doors.some((d) => d.state === 'OPENING'))
      && door(byLabel('settle f149'), 'ADR009__SlidingDoor').state === 'CLOSED');
const vs = (label) => traceNew.find((s) => s.label === label).value;
check('Video Studio: base duration is the config value', vs('base duration') === config['3dObject__Interaction__DoorAnimation__AnimationDurationMs'], vs('base duration'));
check('Video Studio: a bad speed falls back to 1.0', vs('speed after bad value') === 1);
check('Video Studio: speed scale reads back', vs('speed') === 0.5);
check('Video Studio: SnapAllClosed moved the open doors and leaves', vs('snap moved') >= 3, vs('snap moved'));
check('Video Studio: a second SnapAllClosed moves nothing', vs('snap again') === 0);
check('Video Studio: every MOD back at its initial pose', vs('every MOD back at its initial pose') === true);
check('Video Studio: nothing animating after SnapAllClosed', byLabel('vs snap all closed').active === false);
const halfOld = door(runOld.trace.find((s) => s.label === 'vs interior half speed f29'), 'ADR002__InteriorDoor__Test').p;
const halfNew = door(byLabel('vs interior half speed f29'), 'ADR002__InteriorDoor__Test').p;
check('Video Studio: half speed matches 1.7.1 exactly', halfOld === halfNew, [ halfOld, halfNew ]);

// ---------------------------------------------------------------------------
// 2. Export set: TV 1.9.0's set plus ValeVision's four Video Studio names
// ---------------------------------------------------------------------------
const VV_FOUR  = [ 'Na__DoorAnimation__GetBaseDurationMs', 'Na__DoorAnimation__GetSpeedScale', 'Na__DoorAnimation__SetSpeedScale', 'Na__DoorAnimation__SnapAllClosed' ];
const newKeys  = Object.keys(NEW.door).sort();
const wantKeys = [ ...Object.keys(TV.door), ...VV_FOUR ].sort();
check('export set = TV 1.9.0 set + VV four', JSON.stringify(newKeys) === JSON.stringify(wantKeys), { newKeys, wantKeys });
check('export count 23', newKeys.length === 23, newKeys.length);
const oldKeys = Object.keys(OLD.door);
check('every 1.7.1 export kept', oldKeys.every((k) => newKeys.includes(k)), oldKeys.filter((k) => !newKeys.includes(k)));
const doorPoseNeeds = [ 'Na__DoorAnim__MOD_TYPE_ROT_ONLY', 'Na__DoorAnim__MOD_TYPE_FIXED', 'Na__DoorAnim__DescribeDoors',
                        'Na__DoorAnim__ComputePanelLocalPose', 'Na__DoorAnim__ApplyPanelTransform', 'Na__DoorAnim__GetLiveProgress' ];
check('the six names TV DoorPose imports are exported', doorPoseNeeds.every((k) => newKeys.includes(k)), doorPoseNeeds.filter((k) => !newKeys.includes(k)));
check('FindDoorGroups exports Na__DoorAnimation__FindDoorGroups only',
      JSON.stringify(Object.keys(NEW.find)) === JSON.stringify([ 'Na__DoorAnimation__FindDoorGroups' ]), Object.keys(NEW.find));
check('MOD type constants', NEW.door.Na__DoorAnim__MOD_TYPE_ROT_ONLY === 'ROT_ONLY' && NEW.door.Na__DoorAnim__MOD_TYPE_ROT_MVE === 'ROT_MVE'
                         && NEW.door.Na__DoorAnim__MOD_TYPE_MVE_ONLY === 'MVE_ONLY' && NEW.door.Na__DoorAnim__MOD_TYPE_FIXED === 'FIXED');

// ---------------------------------------------------------------------------
// 3. Left button only (TV 1.8.0): right and middle clicks no longer toggle
// ---------------------------------------------------------------------------
{
    const r = runNew, reg = NEW.door.Na__DoorAnim__DoorRegistry, rec = reg.get('ADR002__InteriorDoor__Test');
    check('precondition: interior door closed', rec.state === 'CLOSED', rec.state);
    r.click('ADR002__InteriorDoor__Test|MOD001', 'right click', 2);
    check('NEW: a stationary right click does not toggle', rec.state === 'CLOSED' && !NEW.door.Na__DoorAnimation__HasActiveAnimations(), rec.state);
    r.click('ADR002__InteriorDoor__Test|MOD001', 'middle click', 1);
    check('NEW: a stationary middle click does not toggle', rec.state === 'CLOSED', rec.state);
    // chord: left down, right down (cancels), left up
    r.canvas.dispatchEvent(pointer('pointerdown', 400, 300, 0));
    r.canvas.dispatchEvent(pointer('pointerdown', 400, 300, 2));
    r.canvas.dispatchEvent(pointer('pointerup', 400, 300, 0));
    check('NEW: a right press during a left press cancels the click', rec.state === 'CLOSED', rec.state);
    r.click('ADR002__InteriorDoor__Test|MOD001', 'touch tap', 0, 0, 'touch');
    check('NEW: a touch tap (button 0) still toggles', rec.state === 'OPENING', rec.state);
    r.frames(45, 'touch opening');
    r.click('ADR002__InteriorDoor__Test|MOD001', 'left click closes', 0);
    check('NEW: a left click still toggles', rec.state === 'CLOSING', rec.state);
    r.frames(45, 'left closing');

    const ro = runOld, recOld = OLD.door.Na__DoorAnim__DoorRegistry.get('ADR002__InteriorDoor__Test');
    check('precondition (old): interior door closed', recOld.state === 'CLOSED', recOld.state);
    ro.click('ADR002__InteriorDoor__Test|MOD001', 'old right click', 2);
    check('OLD 1.7.1 toggled on a right click (the defect TV 1.8.0 fixed)', recOld.state === 'OPENING', recOld.state);
    ro.frames(45, 'old settle');
}

// ---------------------------------------------------------------------------
// 4. DescribeDoors, ComputePanelLocalPose, GetLiveProgress and the 1.8.0 readers
// ---------------------------------------------------------------------------
{
    const d = NEW.door, reg = d.Na__DoorAnim__DoorRegistry, r = runNew;
    const groups = NEW.find.Na__DoorAnimation__FindDoorGroups(r.model.root);
    check('FindDoorGroups finds the door roots only (walls skipped)',
          groups.meshGroups.length === 1 && groups.meshGroups[0] === r.model.meshRoot
          && groups.lineworkGroups.length === 1 && groups.lineworkGroups[0] === r.model.lineRoot, groups);
    check('FindDoorGroups with no root answers empty arrays', JSON.stringify(NEW.find.Na__DoorAnimation__FindDoorGroups(null)) === '{"meshGroups":[],"lineworkGroups":[]}');

    const regBefore = new Map(reg);
    const listenersBefore = r.canvas.listenerCount;
    captured.length = 0;
    const live = d.Na__DoorAnim__DescribeDoors(groups.meshGroups, groups.lineworkGroups);
    check('DescribeDoors on the loaded model: one record per registered door', live.length === reg.size, [ live.length, reg.size ]);
    check('DescribeDoors returns the registry\'s own records for registered doors', live.every((rec) => reg.get(rec.adrName) === rec));
    check('DescribeDoors logs nothing', captured.length === 0, captured);

    const offScene = buildModel('offscene');
    const described = d.Na__DoorAnim__DescribeDoors([ offScene.meshRoot ], [ offScene.lineRoot ]);
    check('DescribeDoors off-scene: built records, not the registry\'s', described.length === 6 && described.every((rec) => reg.get(rec.adrName) !== rec));
    check('DescribeDoors off-scene: at rest', described.every((rec) => rec.state === 'CLOSED' && rec.currentProgress === 0));
    check('DescribeDoors off-scene: linework linked', described.every((rec) => rec.adrObjectLinework && rec.adrObjectLinework.name === rec.adrName));
    const again = d.Na__DoorAnim__DescribeDoors([ offScene.meshRoot ], [ offScene.lineRoot ]);
    check('DescribeDoors off-scene: built once, kept by its assembly object', again.length === described.length && again.every((rec, i) => rec === described[i]));
    check('DescribeDoors registers nothing', reg.size === regBefore.size && [ ...reg ].every(([ k, v ]) => regBefore.get(k) === v));
    check('DescribeDoors adds no listener', r.canvas.listenerCount === listenersBefore, [ listenersBefore, r.canvas.listenerCount ]);
    check('DescribeDoors with no groups answers []', JSON.stringify(d.Na__DoorAnim__DescribeDoors()) === '[]');
    check('DescribeDoors stays quiet', captured.length === 0, captured);

    // ComputePanelLocalPose: the pose ApplyPanelTransform writes, touching nothing
    let poseOk = true, untouched = true, restOk = true;
    reg.forEach((rec) => rec.panels.forEach((pl) => {
        for (const progress of [ 0, 0.25, 0.5, 1 ]) {
            const before = JSON.stringify(pose(pl.modObjectMesh));
            const p = new THREE.Vector3(), q = new THREE.Quaternion();
            d.Na__DoorAnim__ComputePanelLocalPose(pl, progress, p, q);
            if (JSON.stringify(pose(pl.modObjectMesh)) !== before) untouched = false;
            const dummy = new THREE.Object3D();
            d.Na__DoorAnim__ApplyPanelTransform(dummy, pl, progress);
            if (JSON.stringify(pose(dummy)) !== JSON.stringify([ ...p.toArray(), ...q.toArray() ].map(FULL))) poseOk = false;
            if (progress === 0 && (!p.equals(pl.initialPosition) || !q.equals(pl.initialQuaternion))) restOk = false;
        }
    }));
    check('ComputePanelLocalPose equals ApplyPanelTransform at 0, 0.25, 0.5, 1 for every panel', poseOk);
    check('ComputePanelLocalPose touches nothing', untouched);
    check('ComputePanelLocalPose at 0 is the initial transform', restOk);
    d.Na__DoorAnim__ApplyPanelTransform(null, reg.get('ADR002__InteriorDoor__Test').panels[0], 1);
    check('ApplyPanelTransform with no MOD is a no-op', true);

    // A door opened by a click stands exactly at ComputePanelLocalPose(panel, 1)
    const interior = reg.get('ADR002__InteriorDoor__Test');
    r.click('ADR002__InteriorDoor__Test|MOD001', 'open for pose check'); r.frames(45, 'open for pose check');
    const p1 = new THREE.Vector3(), q1 = new THREE.Quaternion();
    d.Na__DoorAnim__ComputePanelLocalPose(interior.panels[0], 1, p1, q1);
    check('an opened door stands at ComputePanelLocalPose(panel, 1)',
          JSON.stringify(pose(interior.panels[0].modObjectMesh)) === JSON.stringify([ ...p1.toArray(), ...q1.toArray() ].map(FULL)));
    check('IsDoorOpen reads an open door as open', d.Na__DoorAnim__IsDoorOpen(interior) === true);

    // GetLiveProgress
    r.click('ADR002__InteriorDoor__Test|MOD001', 'close for live progress'); r.frames(10, 'closing for live progress');
    check('GetLiveProgress: a lockstep panel reads its door', d.Na__DoorAnim__GetLiveProgress(interior, interior.panels[0]) === interior.currentProgress
                                                           && interior.currentProgress > 0 && interior.currentProgress < 1, interior.currentProgress);
    check('IsDoorOpen follows progress mid-animation', d.Na__DoorAnim__IsDoorOpen(interior) === (interior.currentProgress > 0.5));
    r.frames(45, 'closed for live progress');
    check('IsDoorOpen reads a closed door as closed', d.Na__DoorAnim__IsDoorOpen(interior) === false);
    const extRec = reg.get('ADR010__ExteriorDoubleDoor__');
    r.click('ADR010__ExteriorDoubleDoor__|MOD002', 'right leaf for live progress'); r.frames(8, 'right leaf moving');
    check('GetLiveProgress: an independent leaf reads its own progress',
          d.Na__DoorAnim__GetLiveProgress(extRec, extRec.panels[1]) === extRec.panels[1].currentProgress
          && d.Na__DoorAnim__GetLiveProgress(extRec, extRec.panels[0]) === extRec.panels[0].currentProgress
          && extRec.panels[1].currentProgress !== extRec.panels[0].currentProgress, extRec.panels.map((p) => p.currentProgress));
    r.frames(45, 'right leaf settled');
    check('GetLiveProgress: a record built outside the registry reads 0', described.every((rec) => rec.panels.every((pl) => d.Na__DoorAnim__GetLiveProgress(rec, pl) === 0)));
    check('GetLiveProgress clamps and guards', d.Na__DoorAnim__GetLiveProgress({ currentProgress : 1.7 }) === 1
                                          && d.Na__DoorAnim__GetLiveProgress({ currentProgress : -2 }) === 0
                                          && d.Na__DoorAnim__GetLiveProgress({ currentProgress : NaN }) === 0
                                          && d.Na__DoorAnim__GetLiveProgress(null) === 0);
    check('IsDoorOpen guards and reads state without progress', d.Na__DoorAnim__IsDoorOpen(null) === false
                                                              && d.Na__DoorAnim__IsDoorOpen({ state : 'OPENING' }) === true
                                                              && d.Na__DoorAnim__IsDoorOpen({ state : 'CLOSING' }) === false);

    // FindAdrAncestor and ResolveHitPanel (TV 1.8.0 exports)
    const rightLeaf = r.model.leaves.get('ADR010__ExteriorDoubleDoor__|MOD002');
    check('FindAdrAncestor walks a hit up to its ADR', d.Na__DoorAnim__FindAdrAncestor(rightLeaf) === r.model.adrs.get('ADR010__ExteriorDoubleDoor__'));
    check('FindAdrAncestor answers null off a door', d.Na__DoorAnim__FindAdrAncestor(r.model.wall) === null);
    check('ResolveHitPanel resolves a hit to its leaf', d.Na__DoorAnim__ResolveHitPanel(extRec, rightLeaf) === extRec.panels[1]);
    check('ResolveHitPanel answers null for a hit outside any MOD', d.Na__DoorAnim__ResolveHitPanel(extRec, r.model.adrs.get('ADR010__ExteriorDoubleDoor__')) === null
                                                                 && d.Na__DoorAnim__ResolveHitPanel(null, rightLeaf) === null);
}

console.log = realLog; console.warn = realWarn;
out('trace digests  old ' + digests.old + '  new ' + digests.new + '  |  tv ' + digests.tv + '  new (shared steps) ' + digests.newShared);
out('steps compared old/new ' + digests.steps + ', new/tv ' + commonLength + '; render requests ' + renderRequests);
out((failures === 0 ? 'PASS' : 'FAIL') + '  ' + passes + ' passed, ' + failures + ' failed');
process.exit(failures === 0 ? 0 : 1);
