// =============================================================================
// VALEVISION3D - TEST - LINEWORK MODIFIERS
// =============================================================================
//
// FILE       : Na__Test__LineworkModifiers__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Nested LineworkModifier Test (Model Layers Rows, Base Image Widths)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove a nested detail tag (SSOT 76-79) draws at its Model Layers row's weight and colour in
//              the base image, drops out when its row is off, picks the same edges the vectors pick, and
//              that a model with no such tag draws exactly as it did before
// CREATED    : 02-Oct-2026
//
// DESCRIPTION:
// - NO VALE MODEL CARRIES A MODIFIER TAG TODAY (the Doous linework GLBs hold
//   no 76-79 string anywhere, S04a-V), so the fixture is built here: a GLB
//   written byte by byte with linework nodes named the way the GlbBuilder
//   names them ('<Tag>::<Material>'), two of them duplicates, loaded through
//   three's own GLTFLoader so the names arrive exactly as the app sees them
//   (':' stripped, duplicates suffixed _1). Its line nodes are then upgraded
//   to fat lines the way the model loader does it - one LineMaterial per
//   node with vertex colours on and a depth-bias onBeforeCompile hook - under
//   a root tagged Na__ModelType 'linework'.
// - The modules run exactly as the app runs them: three and its addons from
//   the version-locked vendor folder (the import map's targets), the app's
//   own Na__RenderEffect__LineworkSettings__State.js, and folder 50's
//   StageSampler and ConfigAccess for the vector half. A module hook maps
//   the bare 'three' specifiers to the vendor files and reads the app's .js
//   files as ES modules (Node reads them as CommonJS otherwise).
// - The rules are built from the shipped configs exactly as the Layout
//   Editor's Viewport2d Frame builds them: one per folder-50 LineworkModifier
//   row, its weight and colour from the Model Layers row of its OwnerKey, the
//   colour alias resolved through the EdgeStyles config, hidden when the
//   viewport has switched that OwnerKey off.
// - What this cannot see: a picture. Widths, materials and visibility are
//   what the renderer draws from, and they are compared object for object;
//   the pixels, the Model Layers panel rows and the vector half's StyleBands
//   arrive with the viewport units (W2-16) and are checked in the app.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__LineworkModifiers__.test.mjs
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-13}}
// - Parity        : new (ValeVision-only test of the LineworkSettings extension, DR-31 (3), D-S04a-08)
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.0.0
// - Initial implementation with the LineworkSettings 1.2.0 modifier rules and
//   the Model Layers config's linework-modifiers group.
//
// =============================================================================

import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';


// -----------------------------------------------------------------------------
// REGION | Paths, the Module Hook and the Modules Under Test
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const APP_ROOT   = resolve(SCRIPT_DIR, '..');
    const MODULES    = join(APP_ROOT, '02__Src__AppModules');
    const VENDOR     = join(APP_ROOT, '04__Lib__ThirdParty__VersionLocked', '01__Vendor__ThreeJs__v0.184.0');
    const STYLES_DIR = join(MODULES, '51__System__LayoutEditor', '25__System__RenderStyles');
    const LINEWORK   = join(MODULES, '50__System__ProjectedLinework');

    const toUrl = (p) => pathToFileURL(p).href;
    const dirUrl = (p) => toUrl(p).replace(/\/?$/, '/');

    // MODULE HOOK | 'three' as the import map resolves it; the app's .js read as ES modules
    // ------------------------------------------------------------
    const HOOKS = `
        const THREE_URL  = ${JSON.stringify(toUrl(join(VENDOR, 'build', 'three.module.js')))};
        const ADDONS_URL = ${JSON.stringify(dirUrl(join(VENDOR, 'examples', 'jsm')))};
        const AS_MODULES = ${JSON.stringify([dirUrl(MODULES), dirUrl(VENDOR)])};
        export async function resolve(specifier, context, next) {
            if (specifier === 'three') return { url : THREE_URL, shortCircuit : true };
            if (specifier.startsWith('three/addons/')) return { url : ADDONS_URL + specifier.slice(13), shortCircuit : true };
            return next(specifier, context);
        }
        export async function load(url, context, next) {
            if (url.endsWith('.js') && AS_MODULES.some((root) => url.startsWith(root))) return next(url, { ...context, format : 'module' });
            return next(url, context);
        }`;
    register('data:text/javascript,' + encodeURIComponent(HOOKS));
    // ------------------------------------------------------------

    // GLOBALS | The browser surface the modules touch: window events only
    // ------------------------------------------------------------
    let renderRequests = 0;
    globalThis.window = new EventTarget();
    window.addEventListener('na-request-render', () => { renderRequests += 1; });
    // ------------------------------------------------------------

    const THREE        = await import('three');
    const { GLTFLoader }           = await import('three/addons/loaders/GLTFLoader.js');
    const { LineSegments2 }        = await import('three/addons/lines/LineSegments2.js');
    const { LineSegmentsGeometry } = await import('three/addons/lines/LineSegmentsGeometry.js');
    const { LineMaterial }         = await import('three/addons/lines/LineMaterial.js');
    const LS      = await import(toUrl(join(MODULES, '05__RenderPipeline', 'Na__RenderEffect__LineworkSettings__State.js')));
    const SAMPLER = await import(toUrl(join(LINEWORK, 'Na__ProjectedLinework__StageSampler__.js')));
    const PLCFG   = await import(toUrl(join(LINEWORK, 'Na__ProjectedLinework__ConfigAccess__.js')));

    const readJson = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, ''));
    const LAYERS_TEXT = readFileSync(join(STYLES_DIR, 'Na__LayoutEditor__ModelLayers__Config__.json'), 'utf8');
    const LAYERS      = JSON.parse(LAYERS_TEXT.replace(/^﻿/, ''));
    const EDGES       = readJson(join(STYLES_DIR, 'Na__LayoutEditor__EdgeStyles__Config__.json'));
    const PL_CONFIG   = readJson(join(LINEWORK, 'Na__ProjectedLinework__AppConfig__.json'));

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failures = 0;
    let checks   = 0;
    function check(name, passed, detail) {
        checks += 1;
        if (!passed) failures += 1;
        console.log((passed ? '  PASS  ' : '  FAIL  ') + name + ((!passed && detail !== undefined) ? '  -> ' + JSON.stringify(detail) : ''));
    }
    const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fixture - A Linework GLB With Nested Detail Tags
// -----------------------------------------------------------------------------

    // FIXTURE | Node names exactly as the GlbBuilder writes them ('<Tag>::<Material>')
    // ------------------------------------------------------------
    const FIXTURE_WALLS = [
        '21__ProposedBuilding__Walls::Brick',
        '21__ProposedBuilding__Walls::Brick',                         // <-- A duplicate: three suffixes it _1
        '76__LineworkModifier__FineDetail__Walls::Stone',
        '76__LineworkModifier__FineDetail__Walls::Stone',             // <-- A duplicate modifier node
        '77__LineworkModifier__FineDetail__WindowsAndJoinery::Oak',
        '78__LineworkModifier__VeryFineDetail__Walls::Render',
        '79__LineworkModifier__VeryFineDetail__WindowsAndJoinery::Glass'
    ];
    const FIXTURE_ROOFS = [
        '23__ProposedBuilding__Roofs::Slate',
        '23__ProposedBuilding__Roofs::Lead'
    ];
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a GLB: one root per category, one two-segment line node per name
    // ------------------------------------------------------------
    function Na__Test__BuildGlb(roots) {
        const floats = [];
        const gltf = {
            asset       : { version : '2.0', generator : 'Na__Test__LineworkModifiers fixture' },
            scene       : 0,
            scenes      : [{ nodes : [] }],
            nodes       : [],
            meshes      : [],
            accessors   : [],
            bufferViews : [],
            buffers     : []
        };
        let line = 0;
        roots.forEach((root) => {
            const children = [];
            root.names.forEach((name) => {
                const x = line * 0.5;
                const pos = [x, 0, 0, x, 3, 0, x, 3, 0, x + 0.4, 3, 0];
                const col = [0.2, 0.3, 0.4, 0.2, 0.3, 0.4, 0.2, 0.3, 0.4, 0.2, 0.3, 0.4];
                const posAt = floats.length * 4; floats.push(...pos);
                const colAt = floats.length * 4; floats.push(...col);
                const pv = gltf.bufferViews.push({ buffer : 0, byteOffset : posAt, byteLength : 48 }) - 1;
                const cv = gltf.bufferViews.push({ buffer : 0, byteOffset : colAt, byteLength : 48 }) - 1;
                const pa = gltf.accessors.push({ bufferView : pv, componentType : 5126, count : 4, type : 'VEC3', min : [x, 0, 0], max : [x + 0.4, 3, 0] }) - 1;
                const ca = gltf.accessors.push({ bufferView : cv, componentType : 5126, count : 4, type : 'VEC3' }) - 1;
                const mesh = gltf.meshes.push({ primitives : [{ attributes : { POSITION : pa, COLOR_0 : ca }, mode : 1 }] }) - 1;
                children.push(gltf.nodes.push({ name : name, mesh : mesh }) - 1);
                line += 1;
            });
            gltf.scenes[0].nodes.push(gltf.nodes.push({ name : root.name, children : children }) - 1);
        });
        const bin  = Buffer.from(new Float32Array(floats).buffer);
        gltf.buffers.push({ byteLength : bin.length });
        let json = Buffer.from(JSON.stringify(gltf), 'utf8');
        if (json.length % 4) json = Buffer.concat([json, Buffer.alloc(4 - (json.length % 4), 0x20)]);
        const binPadded = (bin.length % 4) ? Buffer.concat([bin, Buffer.alloc(4 - (bin.length % 4), 0)]) : bin;
        const header = Buffer.alloc(12);
        header.writeUInt32LE(0x46546C67, 0); header.writeUInt32LE(2, 4);
        header.writeUInt32LE(12 + 8 + json.length + 8 + binPadded.length, 8);
        const chunk = (type, body) => { const h = Buffer.alloc(8); h.writeUInt32LE(body.length, 0); h.writeUInt32LE(type, 4); return Buffer.concat([h, body]); };
        const glb = Buffer.concat([header, chunk(0x4E4F534A, json), chunk(0x004E4942, binPadded)]);
        return glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.length);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Upgrade Line Nodes to Fat Lines as the Model Loader Does
    // ------------------------------------------------------------
    // One LineMaterial per node, vertex colours on, the loader's width, and an
    // instance onBeforeCompile hook standing in for its depth bias.
    // ------------------------------------------------------------
    function Na__Test__UpgradeToFatLines(root) {
        const lines = [];
        root.traverse((o) => { if (o.isLineSegments) lines.push(o); });
        lines.forEach((node) => {
            const geometry = new LineSegmentsGeometry();
            geometry.setPositions(Array.from(node.geometry.getAttribute('position').array));
            geometry.setColors(Array.from(node.geometry.getAttribute('color').array));
            const material = new LineMaterial({ color : 0xffffff, linewidth : 1.0, vertexColors : true, worldUnits : false, resolution : new THREE.Vector2(1920, 1080) });
            material.onBeforeCompile = function Na__Test__DepthBiasHook(shader) { shader.naDepthBias = true; };
            const fat = new LineSegments2(geometry, material);
            fat.name     = node.name;
            fat.visible  = node.visible;
            fat.userData = { ...node.userData };
            node.parent.add(fat);
            node.parent.remove(node);
        });
        root.userData.Na__ModelType = 'linework';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Every Fat Line's Material, Width, Colour and Visibility
    // ------------------------------------------------------------
    function Na__Test__Snapshot(scene) {
        const out = new Map();
        scene.traverse((o) => {
            if (!o.isLineSegments2) return;
            out.set(o, { material : o.material, width : o.material.linewidth, hex : o.material.color.getHexString(), vertexColors : o.material.vertexColors, visible : o.visible });
        });
        return out;
    }
    function Na__Test__SameSnapshot(a, b) {
        if (a.size !== b.size) return 'size ' + a.size + ' vs ' + b.size;
        for (const [node, x] of a) {
            const y = b.get(node);
            if (!y) return 'missing ' + node.name;
            if (x.material !== y.material || !near(x.width, y.width) || x.hex !== y.hex || x.vertexColors !== y.vertexColors || x.visible !== y.visible) {
                return node.name + ' ' + JSON.stringify({ was : { w : x.width, hex : x.hex, v : x.visible, same : x.material === y.material }, now : { w : y.width, hex : y.hex, v : y.visible } });
            }
        }
        return '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Rules, Built the Way the Viewport2d Frame Builds Them
// -----------------------------------------------------------------------------

    const LAYER_ROWS = new Map();
    LAYERS.LayoutEditor__ModelLayers__Groups.forEach((g) => (g.Group__Layers || []).forEach((l) => LAYER_ROWS.set(l.Layer__CategoryKey, l)));
    const HEX = new Map(EDGES.LayoutEditor__EdgeStyles__Colours.map((c) => [c.Colour__Alias, c.Colour__Hex]));

    // HELPER FUNCTION | One Rule per Modifier Row: { TagName, hidden, widthFactor, hex } (+ OwnerKey for the checks)
    // ------------------------------------------------------------
    function Na__Test__Rules(offKeys) {
        const off = new Set(offKeys || []);
        return PLCFG.Na__PlCfg__GetLineworkModifiers().map((row) => {
            const layer = LAYER_ROWS.get(row.OwnerKey) || {};
            return {
                TagName     : row.TagName,
                hidden      : off.has(row.OwnerKey),
                widthFactor : Number.isFinite(layer.Layer__EdgeWeightFactor) ? layer.Layer__EdgeWeightFactor : 1,
                hex         : HEX.get(layer.Layer__EdgeColour),
                OwnerKey    : row.OwnerKey
            };
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Run
// -----------------------------------------------------------------------------

    console.log('ValeVision3D - Linework Modifiers (Model Layers rows, base image widths)');

    // 1. THE MODEL LAYERS CONFIG
    // ------------------------------------------------------------
    console.log('\n  The Model Layers config');
    const groups   = LAYERS.LayoutEditor__ModelLayers__Groups.map((g) => g.Group__Id);
    const modGroup = LAYERS.LayoutEditor__ModelLayers__Groups.find((g) => g.Group__Id === 'linework-modifiers');
    check('the config is Meta 1.2.0 reading SSOT 2.4.0', LAYERS.LayoutEditor__ModelLayers__Meta.Meta__Version === '1.2.0' && LAYERS.LayoutEditor__ModelLayers__Meta.Meta__SsotVersionRead === '2.4.0');
    check('a linework-modifiers group sits between Annotation and Scene Context', !!modGroup && groups.indexOf('linework-modifiers') === groups.indexOf('annotation') + 1 && groups.indexOf('context') === groups.indexOf('linework-modifiers') + 1, groups);
    check('the group is listed always (Group__AlwaysShow)', !!modGroup && modGroup.Group__AlwaysShow === true);
    const fine     = LAYER_ROWS.get('ValeVision__LineworkModifier__FineDetail');
    const veryFine = LAYER_ROWS.get('ValeVision__LineworkModifier__VeryFineDetail');
    check('Fine Detail: tags 76 and 77, weight 0.50, dark grey, solid',
        !!fine && JSON.stringify(fine.Layer__TagNumbers) === '[76,77]' && fine.Layer__EdgeWeightFactor === 0.5 && fine.Layer__EdgeColour === 'dark-grey' && fine.Layer__EdgeLineType === 'solid' && fine.Layer__Label === 'Fine Detail Linework', fine);
    check('Very Fine Detail: tags 78 and 79, weight 0.25, mid grey, solid',
        !!veryFine && JSON.stringify(veryFine.Layer__TagNumbers) === '[78,79]' && veryFine.Layer__EdgeWeightFactor === 0.25 && veryFine.Layer__EdgeColour === 'mid-grey' && veryFine.Layer__EdgeLineType === 'solid' && veryFine.Layer__Label === 'Very Fine Detail Linework', veryFine);
    check('the group holds exactly those two rows', !!modGroup && modGroup.Group__Layers.length === 2 && modGroup.Group__Layers.every((l) => l.Layer__CategoryKey.startsWith('ValeVision__LineworkModifier__')));
    const plTags = PL_CONFIG.ProjectedLinework__LineworkModifiers__Config.ProjectedLinework__LineworkModifiers__Tags;
    check('every folder-50 modifier tag is listed under the Model Layers row of its OwnerKey',
        plTags.length === 4 && plTags.every((t) => LAYER_ROWS.has(t.OwnerKey) && LAYER_ROWS.get(t.OwnerKey).Layer__SketchUpTags.includes(t.TagName)), plTags);
    check('the folder-50 fallbacks equal the shipped modifier tags', JSON.stringify(PLCFG.Na__PlCfg__GetLineworkModifiers()) === JSON.stringify(plTags));
    check('no app-token literal from the other app in the config', LAYERS_TEXT.indexOf('True' + 'Vision__') === -1);
    check('ValeVision keeps its coarse building rows and its legacy group',
        LAYER_ROWS.has('ValeVision__MainBuildingModel__Existing') && LAYER_ROWS.has('ValeVision__MainBuildingModel__Proposed') && groups.includes('legacy') && LAYER_ROWS.has('ValeVision__LegacyModel'));
    const fb = LAYERS.LayoutEditor__ModelLayers__Fallback;
    check('the storey fallback prefix is ValeVision__MainBuildingModel__ and names real rows',
        fb.Fallback__StripPrefix === 'ValeVision__' && fb.Fallback__StoreyElementPrefix === 'ValeVision__MainBuildingModel__'
        && LAYER_ROWS.has(fb.Fallback__StoreyElementPrefix + 'ProposedWalls') && typeof fb.Fallback__StoreyElementNote === 'string', fb);
    // ------------------------------------------------------------

    // 2. THE FIXTURE LOADS AS THE APP SEES IT
    // ------------------------------------------------------------
    console.log('\n  The fixture GLB');
    const glb = Na__Test__BuildGlb([
        { name : 'ValeVision__MainBuildingModel__ProposedWalls', names : FIXTURE_WALLS },
        { name : 'ValeVision__MainBuildingModel__ProposedRoofs', names : FIXTURE_ROOFS }
    ]);
    const gltf = await new GLTFLoader().parseAsync(glb, '');
    const walls = gltf.scene.getObjectByName('ValeVision__MainBuildingModel__ProposedWalls');
    const roofs = gltf.scene.getObjectByName('ValeVision__MainBuildingModel__ProposedRoofs');
    Na__Test__UpgradeToFatLines(walls);
    Na__Test__UpgradeToFatLines(roofs);
    const scene = new THREE.Scene();
    scene.add(walls); scene.add(roofs);

    // GRID AND CUT OUTLINE | Fat lines under no linework root, which nothing here may touch
    const gridMaterial = new LineMaterial({ linewidth : 1.5, resolution : new THREE.Vector2(1920, 1080) });
    const grid = new LineSegments2(new LineSegmentsGeometry(), gridMaterial);
    grid.name = '76__LineworkModifier__FineDetail__WallsGrid';            // <-- A modifier-looking name outside linework: still untouched
    scene.add(grid);

    const names = []; walls.traverse((o) => { if (o.isLineSegments2) names.push(o.name); });
    check('three strips the ":" and suffixes duplicates, as the app loads them',
        JSON.stringify(names) === JSON.stringify([
            '21__ProposedBuilding__WallsBrick', '21__ProposedBuilding__WallsBrick_1',
            '76__LineworkModifier__FineDetail__WallsStone', '76__LineworkModifier__FineDetail__WallsStone_1',
            '77__LineworkModifier__FineDetail__WindowsAndJoineryOak',
            '78__LineworkModifier__VeryFineDetail__WallsRender',
            '79__LineworkModifier__VeryFineDetail__WindowsAndJoineryGlass']), names);
    const byName = (n) => scene.getObjectByName(n);
    const brick   = byName('21__ProposedBuilding__WallsBrick');
    const brick1  = byName('21__ProposedBuilding__WallsBrick_1');
    const stone   = byName('76__LineworkModifier__FineDetail__WallsStone');
    const stone1  = byName('76__LineworkModifier__FineDetail__WallsStone_1');
    const oak     = byName('77__LineworkModifier__FineDetail__WindowsAndJoineryOak');
    const render  = byName('78__LineworkModifier__VeryFineDetail__WallsRender');
    const glass   = byName('79__LineworkModifier__VeryFineDetail__WindowsAndJoineryGlass');
    // SHARED MATERIAL | Materials can be shared across nodes: an ordinary edge and a detail edge on one
    brick1.material = stone1.material;
    // ------------------------------------------------------------

    // 3. THE VECTORS AND THE BASE IMAGE PICK THE SAME EDGES
    // ------------------------------------------------------------
    console.log('\n  Vectors and base image agree');
    const rulesOn = Na__Test__Rules([]);
    const modifiers = PLCFG.Na__PlCfg__GetLineworkModifiers();
    const disagree = [];
    scene.traverse((o) => {
        if (!o.isLineSegments2 || o === grid) return;
        const vectorOwner = SAMPLER.Na__PlSampler__ModifierOwnerFor(o, modifiers);
        const rule        = LS.Na__LineworkSettings__ModifierRuleFor(o.name, rulesOn);
        if ((rule ? rule.OwnerKey : null) !== vectorOwner) disagree.push({ node : o.name, vector : vectorOwner, raster : rule && rule.OwnerKey });
    });
    check('every fixture edge resolves to the same owner in the StageSampler and in LineworkSettings', disagree.length === 0, disagree);
    check('the five detail nodes resolve, the four ordinary ones do not',
        [stone, stone1, oak, render, glass].every((n) => LS.Na__LineworkSettings__ModifierRuleFor(n.name, rulesOn))
        && [brick, brick1, byName('23__ProposedBuilding__RoofsSlate'), byName('23__ProposedBuilding__RoofsLead')].every((n) => !LS.Na__LineworkSettings__ModifierRuleFor(n.name, rulesOn)));
    // ------------------------------------------------------------

    // 4. THE RULE LOOKUP
    // ------------------------------------------------------------
    console.log('\n  ModifierRuleFor');
    const R = LS.Na__LineworkSettings__ModifierRuleFor;
    const pair = [{ TagName : 'A__Tag' }, { TagName : 'A__TagLonger' }];
    check('longest prefix wins whatever the list order', R('A__TagLongerX', pair) === pair[1] && R('A__TagLongerX', [pair[1], pair[0]]) === pair[1] && R('A__TagX', pair) === pair[0]);
    check('a prefix only - never a substring further in', R('x76__LineworkModifier__FineDetail__Walls', rulesOn) === null);
    check('no name, no list or an empty tag matches nothing', R('', rulesOn) === null && R(undefined, rulesOn) === null && R('A__Tag', null) === null && R('A__Tag', [{ TagName : '' }]) === null);
    // ------------------------------------------------------------

    // 5. NO RULE, NO TAG: NOTHING CHANGES
    // ------------------------------------------------------------
    console.log('\n  Unchanged without modifiers');
    LS.Na__LineworkSettings__Initialize(scene, () => null);
    const atRest = Na__Test__Snapshot(scene);
    check('the loader widths stand until something applies', [...atRest.values()].every((s) => s.width === 1 || s.width === 1.5));

    LS.Na__LineworkSettings__SetLineworkBaseOverride(3);
    const plain = Na__Test__Snapshot(scene);
    const plainOk = [...plain.entries()].every(([node, s]) => node === grid ? (s.width === 1.5 && s.material === gridMaterial) : (s.width === 3 && s.material === atRest.get(node).material && s.visible === true));
    check('override alone (the 1.1.0 call): every linework edge at 3 px on its own material, the grid untouched', plainOk);
    LS.Na__LineworkSettings__SetLineworkBaseOverride(3, []);
    check('an empty rule list draws exactly the same', Na__Test__SameSnapshot(plain, Na__Test__Snapshot(scene)) === '', Na__Test__SameSnapshot(plain, Na__Test__Snapshot(scene)));
    LS.Na__LineworkSettings__SetLineworkBaseOverride(3, null);
    check('a null rule list draws exactly the same', Na__Test__SameSnapshot(plain, Na__Test__Snapshot(scene)) === '');
    LS.Na__LineworkSettings__SetLineworkBaseOverride(null);
    check('clearing hands every edge its own base back', Na__Test__SameSnapshot(atRest, Na__Test__Snapshot(scene)) === '', Na__Test__SameSnapshot(atRest, Na__Test__Snapshot(scene)));

    // A MODEL WITH NO DETAIL TAG | the roofs alone, with the rules switched on
    const roofOnly = new THREE.Scene(); roofOnly.add(roofs);
    LS.Na__LineworkSettings__Initialize(roofOnly, () => null);
    LS.Na__LineworkSettings__SetLineworkBaseOverride(3);
    const roofPlain = Na__Test__Snapshot(roofOnly);
    LS.Na__LineworkSettings__SetLineworkBaseOverride(3, Na__Test__Rules(['ValeVision__LineworkModifier__FineDetail']));
    check('a model with no 76-79 tag: rules on, every material, width, colour and visibility identical', Na__Test__SameSnapshot(roofPlain, Na__Test__Snapshot(roofOnly)) === '', Na__Test__SameSnapshot(roofPlain, Na__Test__Snapshot(roofOnly)));
    LS.Na__LineworkSettings__SetLineworkBaseOverride(null);
    scene.add(roofs);
    LS.Na__LineworkSettings__Initialize(scene, () => null);
    // ------------------------------------------------------------

    // 6. RULES ON: WEIGHT AND COLOUR PER ROW
    // ------------------------------------------------------------
    console.log('\n  Every modifier row on');
    const fineHex     = HEX.get('dark-grey').replace('#', '').toLowerCase();
    const veryFineHex = HEX.get('mid-grey').replace('#', '').toLowerCase();
    LS.Na__LineworkSettings__SetLineworkBaseOverride(3, rulesOn);
    check('Fine Detail edges draw at 3 x 0.50 in dark grey with vertex colours off',
        [stone, stone1, oak].every((n) => near(n.material.linewidth, 1.5) && n.material.color.getHexString() === fineHex && n.material.vertexColors === false && n.visible));
    check('Very Fine Detail edges draw at 3 x 0.25 in mid grey',
        [render, glass].every((n) => near(n.material.linewidth, 0.75) && n.material.color.getHexString() === veryFineHex && n.material.vertexColors === false && n.visible));
    check('each detail node is on a material of its own, never its source',
        [stone, stone1, oak, render, glass].every((n) => n.material !== atRest.get(n).material && n.material.isLineMaterial));
    check('the ordinary edge sharing a material with a detail edge keeps 3 px and its own colour',
        brick1.material === atRest.get(brick1).material && near(brick1.material.linewidth, 3) && brick1.material.vertexColors === true && brick1.material.color.getHexString() === 'ffffff');
    check('every ordinary edge stays at 3 px on its own material', [brick, brick1, byName('23__ProposedBuilding__RoofsSlate'), byName('23__ProposedBuilding__RoofsLead')].every((n) => n.material === atRest.get(n).material && near(n.material.linewidth, 3)));
    check('the cloned material keeps the loader depth-bias hook and its program key',
        [stone, oak, render, glass].every((n) => n.material.onBeforeCompile === atRest.get(n).material.onBeforeCompile
            && n.material.customProgramCacheKey() === atRest.get(n).material.customProgramCacheKey()));
    check('the grid is untouched, modifier-looking name and all', grid.material === gridMaterial && grid.material.linewidth === 1.5);
    const clonesFirst = [stone, stone1, oak, render, glass].map((n) => n.material);
    // ------------------------------------------------------------

    // 7. RE-APPLYING NEVER COMPOUNDS: EXPORT SCALES AND THE USER FACTOR
    // ------------------------------------------------------------
    console.log('\n  Export scales and the user factor');
    LS.Na__LineworkSettings__SetExportScales(1, 2);
    LS.Na__LineworkSettings__SetExportScales(1, 2);
    check('export scale 2: detail 3 x 0.50 x 2, ordinary 3 x 2, applied twice without compounding',
        near(stone.material.linewidth, 3) && near(render.material.linewidth, 1.5) && near(brick.material.linewidth, 6) && near(brick1.material.linewidth, 6));
    check('re-applying re-uses the cached materials', [stone, stone1, oak, render, glass].every((n, i) => n.material === clonesFirst[i]));
    const requestsBefore = renderRequests;
    LS.Na__LineworkSettings__SetLineworkFactor(1.5);
    check('user factor 1.5 multiplies a detail edge like any edge (3 x 0.25 x 2 x 1.5)', near(glass.material.linewidth, 2.25) && near(brick.material.linewidth, 9) && renderRequests === requestsBefore + 1);
    LS.Na__LineworkSettings__SetLineworkFactor(1);
    LS.Na__LineworkSettings__SetExportScales(1, 1);
    check('scales back to 1: the render widths again', near(stone.material.linewidth, 1.5) && near(brick.material.linewidth, 3));
    LS.Na__LineworkSettings__SetLineworkBaseOverride(null);
    check('the render over: every node back on its own material at its own base width', Na__Test__SameSnapshot(atRest, Na__Test__Snapshot(scene)) === '', Na__Test__SameSnapshot(atRest, Na__Test__Snapshot(scene)));
    // ------------------------------------------------------------

    // 8. A ROW OFF TAKES ITS EDGES OUT OF THE PICTURE
    // ------------------------------------------------------------
    console.log('\n  A modifier row switched off');
    glass.visible = false;                                                    // <-- Hidden before the render by something else
    const atRestGlass = Na__Test__Snapshot(scene);
    LS.Na__LineworkSettings__SetLineworkBaseOverride(3, Na__Test__Rules(['ValeVision__LineworkModifier__FineDetail']));
    check('Fine Detail off: its three nodes are out of the picture', [stone, stone1, oak].every((n) => n.visible === false));
    check('Very Fine Detail still draws at 3 x 0.25', near(render.material.linewidth, 0.75) && render.visible === true);
    check('every ordinary edge still draws at 3 px', [brick, brick1].every((n) => n.visible && near(n.material.linewidth, 3)));
    LS.Na__LineworkSettings__SetExportScales(1, 2);
    check('a re-apply keeps them out, and nothing hidden comes back', [stone, stone1, oak].every((n) => n.visible === false) && near(brick.material.linewidth, 6));
    LS.Na__LineworkSettings__SetExportScales(1, 1);
    LS.Na__LineworkSettings__SetLineworkBaseOverride(3, Na__Test__Rules(['ValeVision__LineworkModifier__FineDetail', 'ValeVision__LineworkModifier__VeryFineDetail']));
    check('both rows off: every detail node is out', [stone, stone1, oak, render, glass].every((n) => n.visible === false));
    LS.Na__LineworkSettings__SetLineworkBaseOverride(null);
    check('clearing puts every node back exactly: own material, own base width, own visibility', Na__Test__SameSnapshot(atRestGlass, Na__Test__Snapshot(scene)) === '', Na__Test__SameSnapshot(atRestGlass, Na__Test__Snapshot(scene)));
    check('a node hidden before the render stays hidden', glass.visible === false);
    glass.visible = true;
    // ------------------------------------------------------------

    // 9. RULES LIVE ONLY WITH THE OVERRIDE
    // ------------------------------------------------------------
    console.log('\n  Rules without an override');
    LS.Na__LineworkSettings__SetLineworkBaseOverride(null, rulesOn);
    check('no override, no rules: nothing swapped, hidden or restyled', Na__Test__SameSnapshot(atRest, Na__Test__Snapshot(scene)) === '', Na__Test__SameSnapshot(atRest, Na__Test__Snapshot(scene)));
    // ------------------------------------------------------------

    // 10. A RULE WITHOUT A COLOUR KEEPS THE EDGE'S OWN
    // ------------------------------------------------------------
    LS.Na__LineworkSettings__SetLineworkBaseOverride(4, [{ TagName : '78__LineworkModifier__VeryFineDetail__Walls', hidden : false, widthFactor : 0.5 }]);
    check('a rule with no hex: own colour and vertex colours kept, width 4 x 0.5', render.material !== atRest.get(render).material && render.material.vertexColors === true && render.material.color.getHexString() === 'ffffff' && near(render.material.linewidth, 2));
    LS.Na__LineworkSettings__SetLineworkBaseOverride(4, [{ TagName : '78__LineworkModifier__VeryFineDetail__Walls', hidden : false, widthFactor : NaN, hex : '#123456' }]);
    check('a rule with no usable weight draws at the full override', near(render.material.linewidth, 4) && render.material.color.getHexString() === '123456');
    LS.Na__LineworkSettings__SetLineworkBaseOverride(null);
    check('and clearing restores it', render.material === atRest.get(render).material && near(render.material.linewidth, 1));
    // ------------------------------------------------------------

    console.log('\n  ' + checks + ' checks');
    console.log(failures === 0 ? '\n  PASS - every check passed.' : '\n  FAIL - ' + failures + ' check(s) failed.');
    process.exit(failures === 0 ? 0 : 1);

// endregion -------------------------------------------------------------------
