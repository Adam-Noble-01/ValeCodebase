// =============================================================================
// VALEVISION3D - VEGETATION - THE PROJECT'S SCENE DATA
// =============================================================================
//
// FILE       : Na__Vegetation__SceneData__.js
// NAMESPACE  : Na__VegData
// MODULE     : System - Vegetation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The one object a project holds for its plants: what a new one
//              contains, reading one safely, turning it into what the engine
//              wants, and saving it back
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - Adam, 04-Nov-2026: "save all parameters to a new json object with nested keys
//   eetc in my style per file that we enable the vegeation on". So it is one key,
//   Vegetation__SceneData, in that project's ProjectData__<id>__.json, and a project
//   without vegetation does not have it at all.
// - THE RECORD'S DIALECT: every key stands alone and greppable, System__Record__Field,
//   lists taking the singular (Vegetation__SceneData__Plops holds Vegetation__Plop__Uid).
// - EVERY PARAMETER IS WRITTEN, not only what differs from a default, as Adam asked. A
//   later change of default therefore never alters a finished project.
// - A READ NEVER LOSES ANYTHING. A missing key takes its default; a key this version
//   does not know is kept, so an older page saving never strips a newer one's data.
// - SWITCHED OFF KEEPS EVERYTHING. Enabled false is not deleted data (plan, section 2).
// - SAVING IS A MERGE, never a whole-record POST (note 13, section 4.5): this key only,
//   under the server's lock. The server decides again who may (AppAdmin).
// - THE KEY IS WRITTEN WHOLE, so a save first asks whether it is still what this window
//   read. A SketchUp sync (Cloud Sync's Sync Vegetation) or another window may have
//   changed it, and a stale window would otherwise put those plants back or lose them,
//   and the next sync would take that as a change made here. The sync compares from its
//   side too. It is a comparison and not a lock: the plan asked for a guard in the API,
//   whose file holds other sessions' open work. A revision of every save is kept.
// - THE RECORD'S FILE IS MACHINE WRITTEN. The API rewrites it with json.dumps(indent=4)
//   on every save, so nothing here tries to lay it out.
//
// FRAMES:
// - Positions, sizes and paths are integer mm in three.js axes, as every saved value
//   is. Na__VegBuild converts them to metres once, on the way into the world.
//
// INTEGRATION:
// - Opened by Na__Vegetation__.js when a project is enabled.
// - Defaults from ../Na__Vegetation__AppConfig__.json, whose keys are the same keys.
// - No static imports, so it costs nothing until needed and runs in Node for checks.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 04-Nov-2026 - Version 1.2.0 (ValeVision3D v2.86.0)
// - A plop's scale reaches the builder, and counts in its key only when it is not 1, so a
//   plant saved before it existed keeps its key. PlopSizeMm says what a plant really
//   measures. The asset browser's Plant scale saves with the other tools' settings.
//
// 04-Nov-2026 - Version 1.1.0 (ValeVision3D v2.85.0)
// - The tools' settings join the object, so every parameter saves with the project. A plop
//   for the builder carries its identity and a key saying what it would draw. Uids, a
//   palette's items with their recipes, and Remove All, which takes the key out. A save
//   compares with the server first.
//
// 04-Nov-2026 - Version 1.0.1 (ValeVision3D v2.84.0)
// - A plop for the builder carries its asset's id, so the scene layer can find its recipe.
//
// 04-Nov-2026 - Version 1.0.0 (ValeVision3D v2.83.0)
// - Initial build: Stage 1 of ValeVision__PLAN__VegetationSystem__.md.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Record's Key, the Config, the Events
    // ------------------------------------------------------------
    const Na__VegData__K_ROOT       = 'Vegetation__SceneData';                 // <-- Joins ProjectData__EditorOwnedKeys__Keys, so a SketchUp sync keeps it
    const Na__VegData__CONFIG_URL   = new URL('../Na__Vegetation__AppConfig__.json', import.meta.url);
    const Na__VegData__DIRTY_EVENT  = 'na-vegetation-dirty-changed';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | The Open Project's Object
    // ------------------------------------------------------------
    const Na__VegData__State = {
        configPromise : null,
        current       : null,
        dirty         : false,
        baseline      : 'null'                                                 // <-- The object on the server as this window last knew it, as one string
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pure Functions (no page needed)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Config Block's Values, Without Its Words
    // ------------------------------------------------------------
    // JSON has no comments, so a config block explains itself in __Description and
    // ...Note keys. Those belong in the config, and must not be copied into a project.
    // ------------------------------------------------------------
    function Na__VegData__ValuesOf(block) {
        const values = {};
        Object.keys(block).forEach((key) => {
            if (key.endsWith('Description') || key.endsWith('Note')) return;
            values[key] = block[key];
        });
        return values;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is This a Plain Object? (Not a List, Not Null)
    // ------------------------------------------------------------
    function Na__VegData__IsPlain(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Object as One String, Whatever Order Its Keys Came In
    // ------------------------------------------------------------
    // No key and a null under the key are the same thing: no vegetation.
    // ------------------------------------------------------------
    function Na__VegData__Canon(value) {
        const tidy = (item) => {
            if (Array.isArray(item)) return item.map(tidy);
            if (!Na__VegData__IsPlain(item)) return item;
            const sorted = {};
            Object.keys(item).sort().forEach((key) => { sorted[key] = tidy(item[key]); });
            return sorted;
        };
        return JSON.stringify(value === undefined ? null : tidy(value));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What a New Path Starts From, Laid Out as a Path Is
    // ------------------------------------------------------------
    function Na__VegData__LinearDefaults(config) {
        const values = Na__VegData__ValuesOf(config.Vegetation__LinearToolDefaults__Config);
        const main = {}, advanced = {};
        Object.keys(values).forEach((key) => {
            if (key.startsWith('Vegetation__PathAdvanced__')) advanced[key] = values[key];
            else main[key] = values[key];
        });
        main.Vegetation__Path__Advanced = advanced;
        return main;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Whole New Object from the App's Config, Every Parameter Present
    // ------------------------------------------------------------
    function Na__VegData__DefaultsFromConfig(config) {
        const scene = config.Vegetation__SceneData__Config;
        const rules = Na__VegData__ValuesOf(config.Vegetation__LineRules__Config);
        rules.Vegetation__LineRules__Advanced = Na__VegData__ValuesOf(config.Vegetation__LineRulesAdvanced__Config);
        return {
            Vegetation__SceneData__SchemaVersion              : scene.Vegetation__SceneData__SchemaVersion,
            Vegetation__SceneData__Enabled                    : false,
            Vegetation__SceneData__ShowByDefault              : scene.Vegetation__SceneData__ShowByDefault,
            Vegetation__SceneData__DefaultTransparencyPercent : scene.Vegetation__SceneData__DefaultTransparencyPercent,
            Vegetation__SceneData__ShowOnLiveDrawings         : scene.Vegetation__SceneData__ShowOnLiveDrawings,
            Vegetation__SceneData__LineRules                  : rules,
            Vegetation__SceneData__Tools                      : {
                Vegetation__Tools__Linear : Na__VegData__LinearDefaults(config),
                Vegetation__Tools__Brush  : Na__VegData__ValuesOf(config.Vegetation__BrushDefaults__Config),
                Vegetation__Tools__Place  : Na__VegData__ValuesOf(config.Vegetation__PlaceDefaults__Config)
            },
            Vegetation__SceneData__Assets                     : {},
            Vegetation__SceneData__Palettes                   : [],
            Vegetation__SceneData__Paths                      : [],
            Vegetation__SceneData__Plops                      : []
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Saved Object Laid Over the Defaults
    // ------------------------------------------------------------
    // Returns a new object. A saved value always wins, false and 0 included, so a
    // key is only filled in when truly absent. A saved list or map is taken whole. A
    // nested block merges key by key, and a key the defaults never heard of is kept.
    // ------------------------------------------------------------
    function Na__VegData__Normalise(raw, config) {
        const lay = (saved, defaults) => {
            const merged = {};
            Object.keys(defaults).forEach((key) => {
                const hasSaved = Na__VegData__IsPlain(saved) && saved[key] !== undefined;
                if (Na__VegData__IsPlain(defaults[key]) && Object.keys(defaults[key]).length > 0) {
                    merged[key] = lay(hasSaved ? saved[key] : null, defaults[key]);
                } else {
                    merged[key] = hasSaved ? saved[key] : defaults[key];
                }
            });
            if (Na__VegData__IsPlain(saved)) {
                Object.keys(saved).forEach((key) => {
                    if (merged[key] === undefined) merged[key] = saved[key];   // <-- From a later version: never stripped
                });
            }
            return merged;
        };
        return JSON.parse(JSON.stringify(lay(raw, Na__VegData__DefaultsFromConfig(config))));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Line Rules, as the Contour Drawer Wants Them
    // ------------------------------------------------------------
    // @delegate: ../01__Core__Engine/Na__Vegetation__Contour__.js
    // ------------------------------------------------------------
    function Na__VegData__LineRulesToStyle(lineRules) {
        const advanced = lineRules.Vegetation__LineRules__Advanced;
        return {
            segmentPx      : advanced.Vegetation__LineRulesAdvanced__SegmentPx,
            lodSkipPx      : advanced.Vegetation__LineRulesAdvanced__LodSkipPx,
            lodInteriorPx  : advanced.Vegetation__LineRulesAdvanced__LodInnerArcsPx,
            lodTailPx      : advanced.Vegetation__LineRulesAdvanced__LodHooksPx,
            lodCurlPx      : advanced.Vegetation__LineRulesAdvanced__LodCurlsPx,
            lodBladePx     : advanced.Vegetation__LineRulesAdvanced__LodBladesPx,
            interiorFactor : lineRules.Vegetation__LineRules__InnerArcsFactor,
            tailFactor     : lineRules.Vegetation__LineRules__HooksFactor,
            curlFactor     : lineRules.Vegetation__LineRules__CurlsFactor,
            breakFactor    : lineRules.Vegetation__LineRules__PenLiftsFactor
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Two Line Rules That Change the Plant Itself, as the Builder Wants Them
    // ------------------------------------------------------------
    // @delegate: ../01__Core__Engine/Na__Vegetation__BushBuilder__.js
    // ------------------------------------------------------------
    function Na__VegData__LineRulesToFactors(lineRules) {
        return {
            scallop : lineRules.Vegetation__LineRules__ScallopSizeFactor,
            nubs    : lineRules.Vegetation__LineRules__SmallBumpsFactor
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Saved Plop, as the Builder Wants It
    // ------------------------------------------------------------
    function Na__VegData__PlopToBuild(plop) {
        return {
            assetId    : plop.Vegetation__Plop__AssetId,
            seed       : plop.Vegetation__Plop__Seed,
            positionMm : plop.Vegetation__Plop__PositionMm,
            yawDeg     : plop.Vegetation__Plop__YawDeg,
            sizeMm     : plop.Vegetation__Plop__SizeMm || null,
            scale      : plop.Vegetation__Plop__Scale || 1,
            ends       : plop.Vegetation__Plop__Ends || null,
            uid        : plop.Vegetation__Plop__Uid || '',
            pathUid    : plop.Vegetation__Plop__PathUid || '',
            strokeUid  : plop.Vegetation__Plop__StrokeUid || '',
            key        : Na__VegData__PlopKey(plop)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Plop Would Draw, as One String
    // ------------------------------------------------------------
    // Two plops with the same key are the same plant, wherever they came from, so a
    // plant already in the scene need not be built again.
    // ------------------------------------------------------------
    function Na__VegData__PlopKey(plop) {
        const key = [
            plop.Vegetation__Plop__AssetId,
            plop.Vegetation__Plop__Seed,
            plop.Vegetation__Plop__PositionMm,
            plop.Vegetation__Plop__YawDeg,
            plop.Vegetation__Plop__SizeMm || ''
        ].join('|');
        const zoom = plop.Vegetation__Plop__Scale;
        const ends = plop.Vegetation__Plop__Ends;
        return key + ((zoom && zoom !== 1) ? '|x' + zoom : '') + (ends ? '|' + ends : '');
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Plant Really Measures, in Mm
    // ------------------------------------------------------------
    // Its saved size is what it was fitted to, and its scale is on top of that, the whole
    // plant (BushBuilder's header). fallbackMm: its asset's size, for a plant that saves none.
    // ------------------------------------------------------------
    function Na__VegData__PlopSizeMm(plop, fallbackMm) {
        const size = plop.Vegetation__Plop__SizeMm || fallbackMm;
        const zoom = plop.Vegetation__Plop__Scale > 0 ? plop.Vegetation__Plop__Scale : 1;
        return zoom === 1 ? size : size.map((mm) => Math.round(mm * zoom));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Next Free Uid in a List, Such as A0007 or P0002
    // ------------------------------------------------------------
    function Na__VegData__NextUid(prefix, list, uidKey) {
        let highest = 0;
        (list || []).forEach((row) => {
            const text = String(row[uidKey] || '');
            if (!text.startsWith(prefix)) return;
            const number = parseInt(text.slice(prefix.length), 10);
            if (number > highest) highest = number;
        });
        return prefix + String(highest + 1).padStart(4, '0');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Stroke Uids in Use, Newest Last
    // ------------------------------------------------------------
    function Na__VegData__NextStrokeUid(plops) {
        const rows = [];
        const seen = new Set();
        (plops || []).forEach((plop) => {
            const uid = plop.Vegetation__Plop__StrokeUid;
            if (uid && !seen.has(uid)) { seen.add(uid); rows.push({ Uid : uid }); }
        });
        return Na__VegData__NextUid('S', rows, 'Uid');
    }
    // ------------------------------------------------------------


    // FUNCTION | A Palette by Its Uid, or Null
    // ------------------------------------------------------------
    function Na__VegData__FindPalette(sceneData, paletteUid) {
        return (sceneData.Vegetation__SceneData__Palettes || []).find((palette) => palette.Vegetation__Palette__Uid === paletteUid) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Path by Its Uid, or Null
    // ------------------------------------------------------------
    function Na__VegData__FindPath(sceneData, pathUid) {
        return (sceneData.Vegetation__SceneData__Paths || []).find((path) => path.Vegetation__Path__Uid === pathUid) || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Open Project
// -----------------------------------------------------------------------------

    // FUNCTION | Read the App's Config, Once
    // ------------------------------------------------------------
    function Na__VegData__LoadConfig() {
        if (!Na__VegData__State.configPromise) {
            Na__VegData__State.configPromise = fetch(Na__VegData__CONFIG_URL)
                .then((response) => {
                    if (!response.ok) throw new Error('the vegetation config answered ' + response.status);
                    return response.json();
                })
                .catch((error) => {
                    Na__VegData__State.configPromise = null;                   // <-- A later call may retry
                    throw error;
                });
        }
        return Na__VegData__State.configPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Project's Object
    // ------------------------------------------------------------
    async function Na__VegData__Open(raw) {
        const config = await Na__VegData__LoadConfig();
        Na__VegData__State.current  = Na__VegData__Normalise(raw, config);
        Na__VegData__State.dirty    = false;
        Na__VegData__State.baseline = Na__VegData__Canon(raw && Object.keys(raw).length > 0 ? raw : null);
        return Na__VegData__State.current;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Open Project's Object, or Null
    // ------------------------------------------------------------
    function Na__VegData__Current() {
        return Na__VegData__State.current;
    }
    // ------------------------------------------------------------


    // FUNCTION | Has It Changed Since It Was Last Saved?
    // ------------------------------------------------------------
    function Na__VegData__IsDirty() {
        return Na__VegData__State.dirty;
    }
    // ------------------------------------------------------------


    // FUNCTION | Say Whether It Has Changed Since It Was Last Saved
    // ------------------------------------------------------------
    function Na__VegData__SetDirty(dirty) {
        if (Na__VegData__State.dirty === !!dirty) return;
        Na__VegData__State.dirty = !!dirty;
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(Na__VegData__DIRTY_EVENT, { detail : { dirty : Na__VegData__State.dirty } }));
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Object Out of the Project's File: Final
    // ------------------------------------------------------------
    // The one way anything here is deleted (Adam, v2.76.2: "Delete should mean delete"):
    // the key leaves the record. The revisions the server keeps are the way back, as for
    // any other save.
    // ------------------------------------------------------------
    async function Na__VegData__RemoveAll() {
        try {
            const gate = await import('../../03__AppUtils/Na__AppUtils__DevGate__.js');
            if (!gate.Na__DevGate__IsAuthoringEnabled()) return { ok : false, error : 'removing vegetation is for app admins' };

            const mirror = await import('../../03__AppUtils/Na__AppUtils__LocalProjectMirror__.js');
            const result = await mirror.Na__LocalMirror__MergeKeys({ _unset : [Na__VegData__K_ROOT] });
            if (result && result.ok) {
                Na__VegData__State.current  = null;
                Na__VegData__State.baseline = 'null';
                Na__VegData__SetDirty(false);
            }
            return result;
        } catch (error) {
            return { ok : false, error : (error && error.message) || 'the vegetation was not removed' };
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Object into the Project's File
    // ------------------------------------------------------------
    // Resolves as Na__LocalMirror__MergeKeys does, { ok, error, ... }, and never
    // rejects. The gate here only decides what the page offers: the server's own
    // AppAdmin check is what protects the file (note 14, section 6).
    // ------------------------------------------------------------
    async function Na__VegData__Save() {
        if (!Na__VegData__State.current) return { ok : false, error : 'this project has no vegetation to save' };
        try {
            const gate = await import('../../03__AppUtils/Na__AppUtils__DevGate__.js');
            if (!gate.Na__DevGate__IsAuthoringEnabled()) return { ok : false, error : 'saving vegetation is for app admins' };

            const mirror = await import('../../03__AppUtils/Na__AppUtils__LocalProjectMirror__.js');
            // STILL WHAT THIS WINDOW READ? | Not being able to ask is no reason to refuse: the write will say what is wrong
            const onServer = await mirror.Na__LocalMirror__ReadKey(Na__VegData__K_ROOT);
            if (onServer.ok && Na__VegData__Canon(onServer.value) !== Na__VegData__State.baseline) {
                return { ok : false, conflict : true, error : 'the planting was changed elsewhere since this window loaded it (a SketchUp sync, or another window): reload to pick that up' };
            }

            const sent   = Na__VegData__Canon(Na__VegData__State.current);
            const result = await mirror.Na__LocalMirror__MergeKeys({ [Na__VegData__K_ROOT] : Na__VegData__State.current });
            if (result && result.ok) {
                Na__VegData__State.baseline = sent;                            // <-- As sent: a change made during the save stays unsaved, and compares clean next time
                Na__VegData__SetDirty(false);
            }
            return result;
        } catch (error) {
            return { ok : false, error : (error && error.message) || 'the vegetation was not saved' };
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Scene Data API
    // ------------------------------------------------------------
    export {
        Na__VegData__K_ROOT,
        Na__VegData__DIRTY_EVENT,
        Na__VegData__DefaultsFromConfig,
        Na__VegData__Normalise,
        Na__VegData__LineRulesToStyle,
        Na__VegData__LineRulesToFactors,
        Na__VegData__PlopToBuild,
        Na__VegData__PlopKey,
        Na__VegData__PlopSizeMm,
        Na__VegData__NextUid,
        Na__VegData__NextStrokeUid,
        Na__VegData__FindPalette,
        Na__VegData__FindPath,
        Na__VegData__LoadConfig,
        Na__VegData__Open,
        Na__VegData__Current,
        Na__VegData__IsDirty,
        Na__VegData__SetDirty,
        Na__VegData__RemoveAll,
        Na__VegData__Save
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
