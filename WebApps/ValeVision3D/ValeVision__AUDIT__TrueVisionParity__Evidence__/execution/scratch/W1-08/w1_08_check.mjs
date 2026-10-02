// =============================================================================
// W1-08 scratch check - floor plan storey level and TrueVision's data-module convention
// =============================================================================
//
// Loads the REAL modules - the floor plan data module, its ConfigState, the
// StoreyLevel leaf, the StoreyRow, the shipped AppConfig and ValeVision's own
// Na__DrawView__ProjectData__ (TV 1.6.0 as W1-05 landed it) - into a scratch
// module tree in the OS temp folder. Only ProjectData's four imports that reach
// a server or the page (presentation scene data, the project loader, the
// Cloudflare facade, the local mirror) are stubbed, by name. A second tree holds
// the OLD ValeVision data module and ConfigState (the pre-images) over its own
// ProjectData, so every call shape ValeVision's callers use can be compared.
//
// Usage:
//   node w1_08_check.mjs                 candidates (scratch/W1-08/candidates)
//   node w1_08_check.mjs --live          the files in the live tree
//   node w1_08_check.mjs --data <file>   override the data module (mutation check)
//   node w1_08_check.mjs --quiet         print failures and the summary only
//
// Exit 0 = every check passed; 1 = at least one failed; 2 = could not run.
// =============================================================================

import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE   = dirname(fileURLToPath(import.meta.url));
const VV     = resolve(HERE, '..', '..', '..', '..');                               // <-- ValeVision3D app root
const SRC    = join(VV, '02__Src__AppModules');
const FP     = '42__System__FloorPlanViews';
const args   = process.argv.slice(2);
const LIVE   = args.includes('--live');
const QUIET  = args.includes('--quiet');
const dataAt = args.indexOf('--data');
const FROM   = LIVE ? join(SRC, FP) : join(HERE, 'candidates');
const PRE    = join(HERE, 'preimage');

let failures = 0, passes = 0;
function check(name, passed, detail) {
    if (passed) passes++; else failures++;
    if (!passed || !QUIET) console.log((passed ? '  PASS  ' : '  FAIL  ') + name + ((!passed && detail !== undefined) ? '  -> ' + JSON.stringify(detail) : ''));
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const same  = (a, b) => JSON.stringify(a) === JSON.stringify(b);


// -----------------------------------------------------------------------------
// Scratch module trees
// -----------------------------------------------------------------------------

// ProjectData is another package's hot file (W1-05 -> W1-12), so its imports are read from the file as it
// stands and every module it imports is stubbed BY NAME: the names this check relies on get a body that
// behaves (no localhost, no Worker, no network, the fixture's presentation block); any other name it may
// gain answers null. Nothing in ProjectData's own code is replaced.
const PROJECT_DATA = join(SRC, '40__System__DrawingViewCore', 'Na__DrawView__ProjectData__.js');
const KNOWN_BODIES = {
    Na__PresentationMode__ProjectJson__GetActiveConfig : 'function () { return globalThis.__naActiveConfig || null; }',
    Na__AppUtils__GetProjectCodeFromUrl : 'function () { return null; }',
    Na__AppUtils__IsRunningOnLocalhost  : 'function () { return false; }',
    Na__CfApi__IsConfigured             : 'function () { return false; }',
    Na__CfApi__MergeAndSaveKeys         : 'async function () { (globalThis.__naNetwork = globalThis.__naNetwork || []).push("merge-keys"); return { ok : false, error : "stub" }; }',
    Na__LocalMirror__MergeKeys          : 'async function () { (globalThis.__naNetwork = globalThis.__naNetwork || []).push("local-merge"); return { ok : false, skipped : true }; }',
    Na__LocalMirror__DrawingsFingerprint : 'async function () { return { ok : false, skipped : true }; }'
};
function projectDataStubs() {
    const text = readFileSync(PROJECT_DATA, 'utf8');
    const byModule = new Map();
    const pattern = /import\s*\{([^}]*)\}\s*from\s*'\.\.\/([^']+)'/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const names = match[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0]).filter(Boolean);
        const rel = match[2];
        if (!byModule.has(rel)) byModule.set(rel, new Set());
        names.forEach((n) => byModule.get(rel).add(n));
    }
    const stubs = {};
    byModule.forEach((names, rel) => {
        stubs[rel] = [ ...names ].map((n) => 'export const ' + n + ' = ' + (KNOWN_BODIES[n] || 'function () { return null; }') + ';').join('\n') + '\n';
    });
    return stubs;
}
const STUBS = projectDataStubs();

function makeTree(label, files) {
    const root = mkdtempSync(join(tmpdir(), 'na-w1-08-' + label + '-'));
    writeFileSync(join(root, 'package.json'), '{ "type" : "module" }\n');
    const put = (rel, from, text) => {
        const target = join(root, '02__Src__AppModules', rel);
        mkdirSync(dirname(target), { recursive : true });
        if (text !== undefined) writeFileSync(target, text); else copyFileSync(from, target);
    };
    Object.entries(STUBS).forEach(([ rel, text ]) => put(rel, null, text));
    put('40__System__DrawingViewCore/Na__DrawView__ProjectData__.js', join(SRC, '40__System__DrawingViewCore', 'Na__DrawView__ProjectData__.js'));
    put('04__MathUtils/Na__Math__Units.js', join(SRC, '04__MathUtils', 'Na__Math__Units.js'));
    Object.entries(files).forEach(([ name, from ]) => put(FP + '/' + name, from));
    return root;
}

const NEW_FILES = {
    'Na__FloorPlan__ProjectJson__Data__.js'  : dataAt !== -1 ? resolve(args[dataAt + 1]) : join(FROM, 'Na__FloorPlan__ProjectJson__Data__.js'),
    'Na__FloorPlan__ConfigState__.js'        : join(FROM, 'Na__FloorPlan__ConfigState__.js'),
    'Na__FloorPlan__StoreyLevel__.js'        : join(FROM, 'Na__FloorPlan__StoreyLevel__.js'),
    'Na__FloorPlan__DevMenu__StoreyRow__.js' : join(FROM, 'Na__FloorPlan__DevMenu__StoreyRow__.js'),
    'Na__FloorPlan__AppConfig__.json'        : join(FROM, 'Na__FloorPlan__AppConfig__.json')
};
const OLD_FILES = {
    'Na__FloorPlan__ProjectJson__Data__.js'  : join(PRE, 'Na__FloorPlan__ProjectJson__Data__.js'),
    'Na__FloorPlan__ConfigState__.js'        : join(PRE, 'Na__FloorPlan__ConfigState__.js'),
    'Na__FloorPlan__AppConfig__.json'        : join(PRE, 'Na__FloorPlan__AppConfig__.json')
};


// -----------------------------------------------------------------------------
// The page, as far as these modules reach it
// -----------------------------------------------------------------------------

globalThis.window = new EventTarget();
globalThis.fetch  = async (input) => {
    const url = (input instanceof URL) ? input : new URL(String(input));
    if (url.protocol !== 'file:') throw new Error('no network in this check: ' + url.href);
    const text = readFileSync(fileURLToPath(url), 'utf8');
    return { ok : true, status : 200, json : async () => JSON.parse(text), text : async () => text };
};
function makeElement(tag) {
    const el = {
        tagName : tag.toUpperCase(), children : [], listeners : {}, className : '', textContent : '', hidden : false,
        appendChild(child) { this.children.push(child); if (this.options && child.tagName === 'OPTION') { this.options.push(child); if (this.value === '') this.value = child.value; } return child; },
        addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
        fire(type) { (this.listeners[type] || []).forEach((fn) => fn({ type, target : this })); }
    };
    if (tag === 'select') {
        el.options = [];
        let value = '';
        Object.defineProperty(el, 'value', { get() { return value; }, set(v) { value = el.options.some((o) => o.value === v) ? v : ''; } });   // <-- A browser keeps only an offered value
    }
    return el;
}
globalThis.document = { createElement : makeElement };
const events = [];
window.addEventListener('na-floorplan-storey-changed', (e) => events.push(clone(e.detail)));


// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function drawingsBlock() {
    return {
        LayoutEditor__DrawingsData__Description : 'fixture',
        LayoutEditor__DrawingsData__Version : 1,
        LayoutEditor__DrawingsData__FloorPlans : [
            { FloorPlan__Id : 'FloorPlan_001', FloorPlan__Name : 'Ground Floor Plan', FloorPlan__Order : 1, FloorPlan__Enabled : true,
              FloorPlan__FloorDatumMm : 0, FloorPlan__CutOffsetMm : 1200, FloorPlan__ViewDepthMm : null, FloorPlan__SceneId : 'Scene_010',
              FloorPlan__CameraZoom : 1.5, FloorPlan__CameraTargetMm : { PosX : 1000, PosZ : -2000 }, FloorPlan__Annotations : [ { a : 1 } ],
              FloorPlan__Dimensions : [ { d : 1 } ],
              FloorPlan__Styles : { Styles__ProjectedLinework : true, Styles__ProfileLinework : true, Styles__GlassOpaque : false, Styles__Whitecard : true, Styles__HiddenLines : false },
              FloorPlan__ExcludeCategoryTokens : [ 'Landscape' ], FloorPlan__LineworkAsset : { Asset__Path : 'x.json' } },
            { FloorPlan__Id : 'FloorPlan_002', FloorPlan__Name : 'Roof Plan', FloorPlan__FloorDatumMm : 4800, FloorPlan__SceneId : 'Scene_011' },
            { FloorPlan__Id : 'FloorPlan_003', FloorPlan__Name : 'Floor Plan 3', FloorPlan__FloorDatumMm : 0, FloorPlan__CutOffsetMm : 1200 },
            { FloorPlan__Id : 'Bad', FloorPlan__Name : '' , FloorPlan__FloorDatumMm : 0 }
        ],
        LayoutEditor__DrawingsData__Elevations : [],
        LayoutEditor__DrawingsData__Sheets : []
    };
}
function presentationConfig() {
    return {
        PresentationMode__SavedCameraScenes__Description : 'fixture',
        PresentationMode__SavedCameraScenes__Scenes : [
            { PresentationMode__Scene__Id : 'Scene_010', PresentationMode__Scene__FloorPlanId : 'FloorPlan_001' },
            { PresentationMode__Scene__Id : 'Scene_011', PresentationMode__Scene__FloorPlanId : 'FloorPlan_002' },
            { PresentationMode__Scene__Id : 'Scene_012' }
        ],
        PresentationMode__SavedCameraScenes__Groups : [ { Group__Id : 'Group_004', Group__Name : 'Floor Plans' } ]
    };
}


// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------

const roots = [];
try {
    const T1 = makeTree('new', NEW_FILES); roots.push(T1);
    const T2 = makeTree('old', OLD_FILES); roots.push(T2);
    const at = (root, rel) => pathToFileURL(join(root, '02__Src__AppModules', rel)).href;

    const D    = await import(at(T1, '40__System__DrawingViewCore/Na__DrawView__ProjectData__.js'));
    const FpD  = await import(at(T1, FP + '/Na__FloorPlan__ProjectJson__Data__.js'));
    const Cfg  = await import(at(T1, FP + '/Na__FloorPlan__ConfigState__.js'));
    const Lvl  = await import(at(T1, FP + '/Na__FloorPlan__StoreyLevel__.js'));
    const Row  = await import(at(T1, FP + '/Na__FloorPlan__DevMenu__StoreyRow__.js'));
    const D0   = await import(at(T2, '40__System__DrawingViewCore/Na__DrawView__ProjectData__.js'));
    const Old  = await import(at(T2, FP + '/Na__FloorPlan__ProjectJson__Data__.js'));
    const Cfg0 = await import(at(T2, FP + '/Na__FloorPlan__ConfigState__.js'));

    console.log('W1-08 check - ' + (LIVE ? 'LIVE tree' : 'candidates') + (dataAt !== -1 ? ' (data module ' + args[dataAt + 1] + ')' : ''));

    // A | EXPORTS --------------------------------------------------------------
    const TV_DATA_EXPORTS = [ 'GetStyles', 'SetStyle', 'GetExcludeTokens', 'SetExcludeTokens', 'GetLineworkAsset', 'SetLineworkAsset',
        'FLOOR_PLANS_KEY', 'SCENE_PLAN_ID_KEY', 'GetFloorPlans', 'GetEnabledFloorPlans', 'GetPlanById', 'GetPlanForScene', 'IsFloorPlanScene',
        'GetCutHeightMm', 'STOREY_CHANGED_EVENT', 'GetStoreyLevel', 'IsStoreyLevelSet', 'GetStoreyLevelChoices', 'SetStoreyLevel',
        'GetViewDepthMm', 'GetSavedView', 'SetSavedView', 'NextPlanId', 'CreatePlan', 'DeletePlan', 'RenumberOrder', 'LinkPlanToScene',
        'FindSceneForPlan', 'GetClientDimensionsEnabled', 'SetClientDimensionsEnabled', 'GetAnnotations', 'SetAnnotations' ].map((n) => 'Na__FpData__' + n);
    const dataNames = Object.keys(FpD).sort();
    check('A1 the data module exports TrueVision 1.1.0\'s 32 names plus ValeVision\'s STYLE_KEYS, nothing else',
          same(dataNames, [ ...TV_DATA_EXPORTS, 'Na__FpData__STYLE_KEYS' ].sort()), dataNames);
    const storeyApi = [ 'GetStoreyLevel', 'IsStoreyLevelSet', 'GetStoreyLevelChoices', 'SetStoreyLevel' ].map((n) => 'Na__FpData__' + n);
    check('A2 GetStoreyLevel, IsStoreyLevelSet, GetStoreyLevelChoices and SetStoreyLevel are exported functions',
          storeyApi.every((n) => typeof FpD[n] === 'function'));
    check('A3 STOREY_CHANGED_EVENT is na-floorplan-storey-changed', FpD.Na__FpData__STOREY_CHANGED_EVENT === 'na-floorplan-storey-changed', FpD.Na__FpData__STOREY_CHANGED_EVENT);
    const VV_CALLERS_USE = [ 'GetFloorPlans', 'GetCutHeightMm', 'GetViewDepthMm', 'GetStyles', 'GetExcludeTokens', 'LinkPlanToScene', 'FindSceneForPlan',
        'GetSavedView', 'SetSavedView', 'GetAnnotations', 'GetClientDimensionsEnabled', 'GetPlanForScene', 'IsFloorPlanScene', 'SetStyle',
        'SetExcludeTokens', 'SetClientDimensionsEnabled', 'CreatePlan', 'DeletePlan', 'GetPlanById' ].map((n) => 'Na__FpData__' + n);
    check('A4 every name this app\'s 9 importers use is still exported', VV_CALLERS_USE.every((n) => n in FpD), VV_CALLERS_USE.filter((n) => !(n in FpD)));
    check('A5 every name the old module exported is still exported (nothing removed)', Object.keys(Old).every((n) => n in FpD), Object.keys(Old).filter((n) => !(n in FpD)));
    check('A6 ConfigState exports TrueVision 1.1.0\'s 12 names', same(Object.keys(Cfg).sort(), [ 'Load', 'IsEnabled', 'GetDatumRangeMm', 'GetCutOffsetMm',
          'GetDefaultViewDepthMm', 'GetCameraSetup', 'GetNavigationSetup', 'GetTransitionSetup', 'GetSceneGroupTarget', 'GetStoreyLevelSetup', 'GetLabel',
          'FormatLabel' ].map((n) => 'Na__FpCfg__' + n).sort()), Object.keys(Cfg));
    check('A7 StoreyLevel exports its 12 names and StoreyRow Build and Refresh', Object.keys(Lvl).length === 12
          && same(Object.keys(Row).sort(), [ 'Na__FpStoreyRow__Build', 'Na__FpStoreyRow__Refresh' ]));

    // G | CONFIG STATE: the storey setup before and after the config is in -----
    const before = Cfg.Na__FpCfg__GetStoreyLevelSetup();
    check('G1 before the config loads the storeys are the built-in five, and not kept', before.levels.length === 5
          && Cfg.Na__FpCfg__GetStoreyLevelSetup() !== before);
    const enabled = await Cfg.Na__FpCfg__Load();
    await Cfg0.Na__FpCfg__Load();
    const after = Cfg.Na__FpCfg__GetStoreyLevelSetup();
    check('G2 the config loads (FloorPlanViews__Enabled) and its storey setup is made once and kept', enabled === true
          && after === Cfg.Na__FpCfg__GetStoreyLevelSetup());
    check('G3 the shipped storeys equal the built-in fallback', same(after, Lvl.Na__FpLevel__Setup(null)));
    check('G4 the six storey labels come from the shipped config', Cfg.Na__FpCfg__GetLabel('StoreyFieldLabel', 'x') === 'Storey'
          && Cfg.Na__FpCfg__GetLabel('StoreyConfirmLabel', 'x') === 'Confirm'
          && Cfg.Na__FpCfg__FormatLabel('StoreyGuessedFromHeight', 'x', { cut : '1,600' }) === 'Guessed from the cut height (1,600 mm). Choose one to fix it.');
    check('G5 this app\'s own labels survive (Ground Floor Plan quick action, Styles, Exclusions, Bake)',
          Cfg.Na__FpCfg__GetLabel('GroundFloorPlanLabel', 'x') === '+ Add Ground Floor Plan' && Cfg.Na__FpCfg__GetLabel('StylesTitle', 'x') === 'Styles'
          && Cfg.Na__FpCfg__GetLabel('ExclusionsPlaceholder', 'x') === 'Default list' && Cfg.Na__FpCfg__GetLabel('BakeThumbnailsLabel', 'x') === 'Bake Missing Thumbnails');

    // B | ACCEPTANCE 2: CreatePlan(presentationConfig, {}) ---------------------
    const presentation = presentationConfig();
    globalThis.__naActiveConfig = presentation;
    D.Na__DrawData__Load(drawingsBlock(), '2026/TEST__Fixture', presentation);
    const presBefore = JSON.stringify(presentation);
    const created = FpD.Na__FpData__CreatePlan(presentation, {});
    const livePlans = D.Na__DrawData__GetFloorPlansArray();
    check('B1 CreatePlan(presentationConfig, {}) adds the plan to LayoutEditor__DrawingsData__FloorPlans',
          !!created && livePlans.includes(created) && D.Na__DrawData__GetBlock().LayoutEditor__DrawingsData__FloorPlans === livePlans, created);
    check('B2 ... and leaves the presentation object exactly as it was (no new keys)', JSON.stringify(presentation) === presBefore,
          Object.keys(presentation));
    check('B3 the new plan is FloorPlan_004, fifth in the array, named from the config\'s format', created.FloorPlan__Id === 'FloorPlan_004'
          && livePlans.length === 5 && created.FloorPlan__Name === 'Floor Plan 5', created);
    check('B4 a new plan carries no storey key (absent = still a guess)', !('FloorPlan__StoreyLevel' in created));
    check('B5 the other readers ignore a presentation object too: GetFloorPlans / GetPlanById / NextPlanId read the drawings block',
          FpD.Na__FpData__GetFloorPlans(presentation).length === 4 && FpD.Na__FpData__GetPlanById(presentation, 'FloorPlan_004') === created
          && FpD.Na__FpData__NextPlanId(presentation) === 'FloorPlan_005' && JSON.stringify(presentation) === presBefore);
    const orphan = FpD.Na__FpData__DeletePlan(presentation, 'FloorPlan_004');
    check('B6 DeletePlan(presentationConfig, id) removes it from the drawings block and nothing from the presentation',
          orphan === null && !livePlans.includes(created) && JSON.stringify(presentation) === presBefore);
    const decoy = { LayoutEditor__DrawingsData__FloorPlans : [ { FloorPlan__Id : 'Decoy', FloorPlan__Name : 'Decoy', FloorPlan__FloorDatumMm : 0 } ] };
    check('B7 a block handed in as the first argument is not read (TrueVision\'s convention: records always from the live block)',
          FpD.Na__FpData__GetFloorPlans(decoy).every((p) => p.FloorPlan__Id !== 'Decoy') && FpD.Na__FpData__GetPlanById(decoy, 'Decoy') === null);

    // C | ACCEPTANCE 3: the storey ----------------------------------------------
    const blockBefore = JSON.stringify(D.Na__DrawData__GetBlock());
    const roof = FpD.Na__FpData__GetPlanById(null, 'FloorPlan_002');
    const roofText = JSON.stringify(roof);
    const roofLevel = FpD.Na__FpData__GetStoreyLevel(roof);
    check('C1 GetStoreyLevel on "Roof Plan" (cut 6000) answers roof, from its name, guessed', roofLevel && roofLevel.key === 'roof'
          && roofLevel.from === 'name' && roofLevel.guessed === true && roofLevel.title === 'Roof Plan' && FpD.Na__FpData__GetCutHeightMm(roof) === 6000, roofLevel);
    check('C2 ... and writes nothing: the record and the whole drawings block are byte-identical', JSON.stringify(roof) === roofText
          && JSON.stringify(D.Na__DrawData__GetBlock()) === blockBefore && !('FloorPlan__StoreyLevel' in roof));
    check('C3 IsStoreyLevelSet is false for a guess', FpD.Na__FpData__IsStoreyLevelSet(roof) === false);
    const choices = FpD.Na__FpData__GetStoreyLevelChoices();
    check('C4 GetStoreyLevelChoices offers the five in Adam\'s order', choices.map((c) => c.key).join() === 'ground,first,second,roof,basement', choices);
    events.length = 0;
    const changed = FpD.Na__FpData__SetStoreyLevel(roof, 'first');
    check('C5 SetStoreyLevel stores the key and dispatches na-floorplan-storey-changed with { planId, key }', changed === true
          && roof.FloorPlan__StoreyLevel === 'first' && same(events, [ { planId : 'FloorPlan_002', key : 'first' } ]), events);
    check('C6 a chosen storey beats the name, and IsStoreyLevelSet says so', FpD.Na__FpData__GetStoreyLevel(roof).key === 'first'
          && FpD.Na__FpData__GetStoreyLevel(roof).from === 'set' && FpD.Na__FpData__IsStoreyLevelSet(roof) === true);
    events.length = 0;
    check('C7 setting what is held, or a key that names no storey, changes nothing and announces nothing',
          FpD.Na__FpData__SetStoreyLevel(roof, 'first') === false && FpD.Na__FpData__SetStoreyLevel(roof, 'mezzanine') === false
          && roof.FloorPlan__StoreyLevel === 'first' && events.length === 0);
    check('C8 a key is matched whatever its case or padding', FpD.Na__FpData__SetStoreyLevel(roof, '  ROOF ') === true && roof.FloorPlan__StoreyLevel === 'roof');
    events.length = 0;
    check('C9 nothing hands the plan back to the guess: the key is deleted (absent, never \'\') and announced with key \'\'',
          FpD.Na__FpData__SetStoreyLevel(roof, '') === true && !('FloorPlan__StoreyLevel' in roof) && same(events, [ { planId : 'FloorPlan_002', key : '' } ]));
    const plan3 = FpD.Na__FpData__GetPlanById(null, 'FloorPlan_003');
    const low = FpD.Na__FpData__GetStoreyLevel(plan3);
    plan3.FloorPlan__FloorDatumMm = 2800;
    const high = FpD.Na__FpData__GetStoreyLevel(plan3);
    plan3.FloorPlan__FloorDatumMm = 0;
    check('C10 an unchosen plan follows its cut: 1200 ground, 4000 first, from its height', low.key === 'ground' && high.key === 'first'
          && low.from === 'height' && high.from === 'height');
    check('C11 GetStoreyLevel of nothing is null and SetStoreyLevel of nothing is false', FpD.Na__FpData__GetStoreyLevel(null) === null
          && FpD.Na__FpData__SetStoreyLevel(null, 'roof') === false);

    // D | VALEVISION'S EXTRAS ----------------------------------------------------
    check('D1 STYLE_KEYS is exported: the five style keys, frozen', !!FpD.Na__FpData__STYLE_KEYS && typeof FpD.Na__FpData__STYLE_KEYS === 'object'
          && Object.isFrozen(FpD.Na__FpData__STYLE_KEYS)
          && same(Object.values(FpD.Na__FpData__STYLE_KEYS), [ 'Styles__ProjectedLinework', 'Styles__ProfileLinework', 'Styles__GlassOpaque', 'Styles__Whitecard', 'Styles__HiddenLines' ]));
    check('D2 FloorPlan__Dimensions is seeded empty on read, and an existing list is kept', Array.isArray(plan3.FloorPlan__Dimensions)
          && plan3.FloorPlan__Dimensions.length === 0 && FpD.Na__FpData__GetPlanById(null, 'FloorPlan_001').FloorPlan__Dimensions.length === 1);
    const fresh = FpD.Na__FpData__CreatePlan(null, { name : 'Ground Floor Plan' });
    check('D3 ... and on a new plan', Array.isArray(fresh.FloorPlan__Dimensions) && fresh.FloorPlan__Dimensions.length === 0);
    FpD.Na__FpData__DeletePlan(null, fresh.FloorPlan__Id);
    check('D4 SetExcludeTokens trims and drops empties; null restores the default; GetExcludeTokens hands back a copy',
          FpD.Na__FpData__SetExcludeTokens(plan3, [ ' Landscape ', '', '  ', 'Walls' ]) && same(plan3.FloorPlan__ExcludeCategoryTokens, [ 'Landscape', 'Walls' ])
          && FpD.Na__FpData__GetExcludeTokens(plan3) !== plan3.FloorPlan__ExcludeCategoryTokens
          && FpD.Na__FpData__SetExcludeTokens(plan3, 'nonsense') && plan3.FloorPlan__ExcludeCategoryTokens === null);

    // E | EVERY CALL SHAPE THIS APP USES, OLD MODULE AGAINST NEW --------------------
    const presOld = presentationConfig();
    const presNew = presentationConfig();
    D.Na__DrawData__Load(drawingsBlock(), '2026/TEST__Fixture', presNew);
    D0.Na__DrawData__Load(drawingsBlock(), '2026/TEST__Fixture', presOld);
    const run = (M, P, config) => {
        const out = {};
        out.ids        = M.Na__FpData__GetFloorPlans().map((p) => [ p.FloorPlan__Id, p.FloorPlan__Order, p.FloorPlan__Enabled ]);
        out.idsNull    = M.Na__FpData__GetFloorPlans(null).map((p) => p.FloorPlan__Id);
        out.enabled    = M.Na__FpData__GetEnabledFloorPlans(null).map((p) => p.FloorPlan__Id);
        const p1       = M.Na__FpData__GetPlanById(null, 'FloorPlan_001');
        const p2       = M.Na__FpData__GetPlanById(null, 'FloorPlan_002');
        out.byScene    = (M.Na__FpData__GetPlanForScene(null, config.PresentationMode__SavedCameraScenes__Scenes[1]) || {}).FloorPlan__Id;
        out.isScene    = config.PresentationMode__SavedCameraScenes__Scenes.map((s) => M.Na__FpData__IsFloorPlanScene(s));
        out.cut        = [ M.Na__FpData__GetCutHeightMm(p1), M.Na__FpData__GetCutHeightMm(p2) ];
        out.depth      = [ M.Na__FpData__GetViewDepthMm(p1), M.Na__FpData__GetViewDepthMm(p2) ];
        out.view       = [ M.Na__FpData__GetSavedView(p1), M.Na__FpData__GetSavedView(p2) ];
        M.Na__FpData__SetSavedView(p2, 2, 10.4, -20.6);
        out.view2      = M.Na__FpData__GetSavedView(p2);
        out.styles     = [ M.Na__FpData__GetStyles(p1), M.Na__FpData__GetStyles(p2) ];
        M.Na__FpData__SetStyle(p2, 'whitecard', false);
        out.styles2    = M.Na__FpData__GetStyles(p2);
        out.badStyle   = M.Na__FpData__SetStyle(p2, 'nonsense', true);
        out.tokens     = [ M.Na__FpData__GetExcludeTokens(p1), M.Na__FpData__GetExcludeTokens(p2) ];
        M.Na__FpData__SetExcludeTokens(p2, [ ' A ', 'b', '' ]);
        out.tokens2    = M.Na__FpData__GetExcludeTokens(p2);
        out.dims0      = M.Na__FpData__GetClientDimensionsEnabled();
        M.Na__FpData__SetClientDimensionsEnabled(null, true);
        out.dims1      = M.Na__FpData__GetClientDimensionsEnabled();
        M.Na__FpData__SetClientDimensionsEnabled(null, false);
        out.dims2      = M.Na__FpData__GetClientDimensionsEnabled();
        out.ann        = M.Na__FpData__GetAnnotations(p2).length;
        M.Na__FpData__SetAnnotations(p2, [ { z : 1 } ]);
        out.ann2       = M.Na__FpData__GetAnnotations(p2);
        out.scene      = (M.Na__FpData__FindSceneForPlan(config, p1) || {}).PresentationMode__Scene__Id;
        out.next       = M.Na__FpData__NextPlanId(null);
        const made     = M.Na__FpData__CreatePlan(null, { name : ' Ground Floor Plan ', floorDatumMm : 0 });
        out.made       = { id : made.FloorPlan__Id, name : made.FloorPlan__Name, order : made.FloorPlan__Order, datum : made.FloorPlan__FloorDatumMm,
                           cut : made.FloorPlan__CutOffsetMm, depth : made.FloorPlan__ViewDepthMm, scene : made.FloorPlan__SceneId };
        M.Na__FpData__LinkPlanToScene(made, config.PresentationMode__SavedCameraScenes__Scenes[2]);
        out.linked     = [ made.FloorPlan__SceneId, config.PresentationMode__SavedCameraScenes__Scenes[2].PresentationMode__Scene__FloorPlanId ];
        out.deleted    = M.Na__FpData__DeletePlan(null, made.FloorPlan__Id);
        out.order      = M.Na__FpData__GetFloorPlans().map((p) => p.FloorPlan__Order);
        out.madeStyles = M.Na__FpData__GetStyles(made);
        return out;
    };
    const oldOut = run(Old, D0, presOld);
    const newOut = run(FpD, D, presNew);
    const differs = Object.keys(oldOut).filter((k) => !same(oldOut[k], newOut[k]));
    check('E1 every call shape this app uses answers the same through the old and the new module', differs.length === 0,
          differs.map((k) => ({ [k] : { old : oldOut[k], new : newOut[k] } })));
    check('E2 the presentation objects come out the same (the scene link is written either way)', same(presOld, presNew));
    // The records themselves: the old module also wrote Styles defaults and null exclusion / asset slots on every
    // read; TrueVision's writes Styles only when they are first read or set. Every reader takes absent as the default.
    const strip = (block) => clone(block).LayoutEditor__DrawingsData__FloorPlans.map((p) => {
        const s = p.FloorPlan__Styles;
        const defaults = { Styles__ProjectedLinework : false, Styles__ProfileLinework : true, Styles__GlassOpaque : false, Styles__Whitecard : true, Styles__HiddenLines : false };
        if (s && same(s, defaults)) delete p.FloorPlan__Styles;
        if (p.FloorPlan__ExcludeCategoryTokens === null) delete p.FloorPlan__ExcludeCategoryTokens;
        if (p.FloorPlan__LineworkAsset === null) delete p.FloorPlan__LineworkAsset;
        return p;
    });
    const canon = (value) => Array.isArray(value) ? value.map(canon)
        : (value && typeof value === 'object') ? Object.keys(value).sort().reduce((o, k) => { o[k] = canon(value[k]); return o; }, {}) : value;
    check('E3 the saved records differ only by the old module\'s default-valued Styles / null slots written on read (key order aside: a key written later sits later)',
          same(canon(strip(D0.Na__DrawData__GetBlock())), canon(strip(D.Na__DrawData__GetBlock()))), { old : strip(D0.Na__DrawData__GetBlock()), new : strip(D.Na__DrawData__GetBlock()) });
    const p3old = Old.Na__FpData__GetPlanById(null, 'FloorPlan_003'), p3new = FpD.Na__FpData__GetPlanById(null, 'FloorPlan_003');
    check('E4 (recorded) a never-styled record: old module wrote FloorPlan__Styles on read, new leaves it until GetStyles',
          'FloorPlan__Styles' in p3old && !('FloorPlan__Styles' in p3new) && same(Old.Na__FpData__GetStyles(p3old), FpD.Na__FpData__GetStyles(p3new))
          && 'FloorPlan__Styles' in p3new);
    check('E5 no save was attempted by any of it (no Worker or local write)', !(globalThis.__naNetwork || []).length, globalThis.__naNetwork);

    // F | THE STOREY ROW ---------------------------------------------------------------
    D.Na__DrawData__Load(drawingsBlock(), '2026/TEST__Fixture', presentationConfig());
    const roofPlan = FpD.Na__FpData__GetPlanById(null, 'FloorPlan_002');
    const plan1    = FpD.Na__FpData__GetPlanById(null, 'FloorPlan_003');
    const picks = [];
    const rowEl = Row.Na__FpStoreyRow__Build(roofPlan, (key) => picks.push(key));
    const rowEl1 = Row.Na__FpStoreyRow__Build(plan1, (key) => picks.push(key));
    const parts = (el) => ({ row : el.children[0], label : el.children[0].children[0], select : el.children[0].children[1], note : el.children[1],
                             words : el.children[1].children[0], confirm : el.children[1].children[1] });
    const r = parts(rowEl), r1 = parts(rowEl1);
    check('F1 the row: a label for the select, five options, the storey shown', rowEl.className === 'na-fp-dev__storey' && r.label.htmlFor === r.select.id
          && r.select.id === 'naFpStorey__FloorPlan_002' && r.select.options.map((o) => o.value).join() === 'ground,first,second,roof,basement'
          && r.select.value === 'roof' && r.label.textContent === 'Storey');
    check('F2 a guess from the name says so, with Confirm', r.note.hidden === false && r.words.textContent === 'Guessed from the plan\'s name. Choose one to fix it.'
          && r.note.className === 'na-fp-dev__empty na-fp-dev__storey-note' && r.confirm.textContent === 'Confirm');
    check('F3 a guess from the height names the cut', r1.select.value === 'ground' && r1.words.textContent === 'Guessed from the cut height (1,200 mm). Choose one to fix it.', r1.words.textContent);
    r.select.value = 'first'; r.select.fire('change');
    check('F4 a pick writes the record, then tells the editor, and the words go', roofPlan.FloorPlan__StoreyLevel === 'first' && same(picks, [ 'first' ]) && r.note.hidden === true);
    r1.confirm.fire('click');
    check('F5 Confirm stores the guess as the choice', plan1.FloorPlan__StoreyLevel === 'ground' && same(picks, [ 'first', 'ground' ]) && r1.note.hidden === true);
    r1.confirm.fire('click');
    check('F6 Confirm on a chosen storey does nothing', same(picks, [ 'first', 'ground' ]));
    delete roofPlan.FloorPlan__StoreyLevel;
    const refreshed = Row.Na__FpStoreyRow__Refresh(rowEl);
    check('F7 Refresh re-reads the plan (back to the guess); Refresh of anything else is false', refreshed === true && r.select.value === 'roof'
          && r.note.hidden === false && Row.Na__FpStoreyRow__Refresh({}) === false && Row.Na__FpStoreyRow__Refresh(null) === false);
} catch (error) {
    console.log('  COULD NOT RUN: ' + (error && error.stack || error));
    roots.forEach((root) => rmSync(root, { recursive : true, force : true }));
    process.exit(2);
}

roots.forEach((root) => rmSync(root, { recursive : true, force : true }));
console.log(failures === 0 ? '\n  PASS - ' + passes + ' checks passed.' : '\n  FAIL - ' + failures + ' of ' + (passes + failures) + ' check(s) failed.');
process.exit(failures === 0 ? 0 : 1);
