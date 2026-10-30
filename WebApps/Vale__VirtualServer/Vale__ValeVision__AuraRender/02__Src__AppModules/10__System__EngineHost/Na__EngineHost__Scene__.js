// =============================================================================
// VALEVISION AURA - ENGINE HOST - THE PROJECT'S SCENE (ITS OWN MODEL)
// =============================================================================
//
// FILE       : Na__EngineHost__Scene__.js
// NAMESPACE  : Na__EngineHost
// MODULE     : Engine Host - Scene
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Draw the project's own model in place of the engine's demo
//              cottage: its AURA scene read from the API, its GLB files from
//              the library, handed to the engine as a base
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - A PROJECT'S SCENE (schema 1.0.0: AuraRender__SCHEMA__AuraScene__.md) lists
//   the model files copied into the project and the objects made from them.
//   This module reads it (api/projects/<id>/scene), fetches the files from the
//   project's ValeVision__AuraRender/Content__AuraScene__ModelFiles (behind the
//   library gate: signed-in staff), reads them with the engine's own GLB reader
//   and hands the engine a base in the cottage's place (PainterlyNPR's
//   ScenePackage SetBase and its Glb module). The engine then builds the
//   model with the drawing set's placed assets and given materials on top,
//   exactly as it builds the cottage, and keeps doing so on every rebuild.
// - THE FIRST METHOD OF MAKING AN AURA FILE (Adam: "copy all GLB files accross
//   and make them avaiblible to Auras tools"): the first time a project opens
//   with no scene and ValeVision 3D holds its whitecard, the API makes the scene
//   (the GLBs copied into the project's AURA folder) and AURA loads it. Later,
//   when ValeVision 3D's whitecard is newer, a note offers to bring the scene
//   up to date: object Ids are kept and the replaced files zipped.
// - IT RUNS BEFORE THE 3D ENVIRONMENT AND THE SHEETS MOUNT (AuraApp), so the
//   first live picture and every viewport's still are the project's model.
// - A PIN WITHOUT THE SEAM STILL LOADS: the build module is read through its
//   namespace and the Glb module imported only here, when needed, so an engine
//   from before GLB scenes keeps drawing the demo cottage and AURA says so. An
//   API from before the scene routes does the same.
// - Only this folder imports the engine (Na__EngineHost__PainterlyNpr__ says
//   why).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build, at Adam's word ("STOP GIVING UP": AURA loads the
//   whitecard model from ValeVision 3D).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import * as ScenePackage from 'PainterlyNPR/10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
    import { PainterlyNPR__AppCore__State as State } from 'PainterlyNPR/01__AppCore/PainterlyNPR__AppCore__State__.mjs';
    import { PainterlyNPR__RenderGraph__Bump, PainterlyNPR__RenderGraph__Request } from 'PainterlyNPR/20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
    import { Na__Api__Get, Na__Api__Post } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Engine's GLB Module (Imported Only When a Scene Is There)
    // ------------------------------------------------------------
    const Na__EngineHostScene__GLB_MODULE  =  'PainterlyNPR/10__Import__ScenePackage/PainterlyNPR__ScenePackage__Glb__.mjs';
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Scene Loaded, Where Its Files Are, and ValeVision 3D's Whitecard
    // ------------------------------------------------------------
    const Na__EngineHostScene__State  =  { scene: null, source: null, modelBase: '', loaded: false, counts: null };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading the Project's Scene
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch One Model File as Bytes (the library gate answers for the signed-in)
    // ------------------------------------------------------------
    async function Na__EngineHostScene__Fetch(url) {
        const response  =  await fetch(url, { credentials: 'same-origin' });          // <-- The browser's cache revalidates (the gate sends private, no-cache)
        if (!response.ok) throw new Error(`${response.status} for ${decodeURIComponent(url.split('/').pop())}`);
        return new Uint8Array(await response.arrayBuffer());
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Engine's Scene Source From AURA's Scene File
    // ------------------------------------------------------------
    // Objects in Id order, each with its file and node; every file read; each
    // mesh file paired with its linework twin (the pen's hard edges).
    function Na__EngineHostScene__Source(scene, glbs) {
        const byId   =  new Map(scene.AuraScene__ModelFiles.map((f) => [f.ModelFile__Id, f]));
        const twins  =  new Map();
        scene.AuraScene__ModelFiles.forEach((f) => {
            const twin  =  f.ModelFile__Kind === 'Mesh' && f.ModelFile__Twin ? byId.get(f.ModelFile__Twin) : null;
            if (twin && glbs.has(twin.ModelFile__FileName)) twins.set(f.ModelFile__FileName, twin.ModelFile__FileName);
        });
        const placement  =  scene.AuraScene__ModelPlacement || {};
        return {
            Placement :  { OffsetM: placement.OffsetM || [0, 0, 0], RotationDeg: placement.RotationDeg || 0 },
            Objects   :  scene.AuraScene__Objects.map((o) => {
                const file  =  byId.get(o.Object__ModelFile);
                const show  =  file && file.ModelFile__ShowByDefault !== false;
                return { Id: o.Object__Id, Name: o.Object__Name, Category: o.Object__Category, Material: o.Object__Material, Role: o.Object__Role,
                         File: file ? file.ModelFile__FileName : '', Node: o.Object__Node, Missing: o.Object__Missing === true || !show };
            }),
            Glbs      :  glbs,
            Twins     :  twins,
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Project's Scene: { Loaded } | { None, Reason } | { Unsupported, Reason }
    // ------------------------------------------------------------
    // Call after the engine boots and before the 3D Environment and the sheets
    // mount. say(text) reports progress to the loader. Never throws: whatever
    // goes wrong leaves the demo cottage drawn and says why.
    async function Na__EngineHost__SceneOpen(projectId, say) {
        const S    =  Na__EngineHostScene__State;
        const pid  =  encodeURIComponent(projectId);
        const tell =  (text) => { if (typeof say === 'function') say(text); };
        let answer;
        try {
            answer  =  await Na__Api__Get(`projects/${pid}/scene`);
            if (!answer.scene && answer.source && answer.source.Available) {
                tell('Making the AURA scene from ValeVision 3D\'s whitecard...');
                answer  =  await Na__Api__Post(`projects/${pid}/scene/import`, {});
            }
        } catch (error) {
            console.warn('[AURA Scene] No scene from the API:', error.message);
            return { None: true, Reason: error.status === 404 ? 'noApi' : 'error', Message: error.message };
        }
        S.scene      =  answer.scene || null;
        S.source     =  answer.source || null;
        S.modelBase  =  answer.modelBase || '';
        if (!S.scene) return { None: true, Reason: 'noWhitecard' };

        // The engine must have the seam (PainterlyNPR's GLB scenes); an older pin keeps the cottage
        if (typeof ScenePackage.PainterlyNPR__ScenePackage__SetBase !== 'function') return { Unsupported: true, Reason: 'The pinned engine has no SetBase' };
        let Glb;
        try {
            Glb  =  await import(Na__EngineHostScene__GLB_MODULE);
        } catch (error) {
            console.warn('[AURA Scene] The pinned engine has no GLB module:', error.message);
            return { Unsupported: true, Reason: 'The pinned engine has no GLB module' };
        }

        // The files: every one drawn and every linework twin, read with the engine's own reader
        const wanted  =  S.scene.AuraScene__ModelFiles.filter((f) => f.ModelFile__Use === 'Draw' || f.ModelFile__Use === 'SourceLinework');
        const total   =  wanted.reduce((sum, f) => sum + (f.ModelFile__Bytes || 0), 0);
        const mb      =  (bytes) => (bytes / 1048576).toFixed(1);
        const glbs    =  new Map();
        let done      =  0;
        try {
            tell(`Loading the AURA scene (${mb(total)} MB)...`);
            for (const f of wanted) {
                const bytes  =  await Na__EngineHostScene__Fetch(S.modelBase + encodeURIComponent(f.ModelFile__FileName));
                glbs.set(f.ModelFile__FileName, Glb.PainterlyNPR__ScenePackage__GlbRead(bytes));
                done += f.ModelFile__Bytes || bytes.byteLength;
                tell(`Loading the AURA scene (${mb(done)} of ${mb(total)} MB)...`);
            }
        } catch (error) {
            console.error('[AURA Scene] A model file could not be read:', error);
            return { None: true, Reason: 'files', Message: error.message };
        }

        // The base in the cottage's place, then the scene built with the drawing set's assets and materials
        try {
            tell('Building the scene...');
            ScenePackage.PainterlyNPR__ScenePackage__SetBase(Glb.PainterlyNPR__ScenePackage__GlbBase(Na__EngineHostScene__Source(S.scene, glbs)));
            ScenePackage.PainterlyNPR__ScenePackage__Reload(State.Assets || [], State.Materials || []);
            PainterlyNPR__RenderGraph__Bump('Scene');
            PainterlyNPR__RenderGraph__Request('Navigate');
        } catch (error) {
            console.error('[AURA Scene] The engine could not build the scene:', error);
            ScenePackage.PainterlyNPR__ScenePackage__SetBase(null);
            ScenePackage.PainterlyNPR__ScenePackage__Reload(State.Assets || [], State.Materials || []);
            PainterlyNPR__RenderGraph__Bump('Scene');
            return { None: true, Reason: 'build', Message: error.message };
        }
        S.loaded  =  true;
        S.counts  =  ScenePackage.PainterlyNPR__ScenePackage__Scene ? ScenePackage.PainterlyNPR__ScenePackage__Scene.Source || null : null;
        console.info('[AURA Scene] Loaded', S.counts);
        return { Loaded: true, Files: wanted.length, Megabytes: +mb(total), Counts: S.counts, Newer: !!(S.source && S.source.Newer) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Bring the Scene Up to Date From ValeVision 3D (then the page opens it again)
    // ------------------------------------------------------------
    async function Na__EngineHost__SceneImport(projectId) {
        const answer  =  await Na__Api__Post(`projects/${encodeURIComponent(projectId)}/scene/import`, {});
        Na__EngineHostScene__State.scene   =  answer.scene;
        Na__EngineHostScene__State.source  =  answer.source;
        return answer;
    }
    // ------------------------------------------------------------


    // FUNCTION | Say What Was Opened, Once the App Is Up (a note, never a dialog)
    // ------------------------------------------------------------
    function Na__EngineHost__SceneNotes(projectId, opened) {
        if (!opened) return;
        if (opened.Loaded && opened.Newer) {
            Na__Toast__Show('ValeVision 3D has a newer whitecard than this AURA scene.', { ms: 20000, action: { label: 'Update the scene', onClick: async () => {
                try {
                    await Na__EngineHost__SceneImport(projectId);
                    window.location.reload();
                } catch (error) {
                    Na__Toast__Show(`The scene could not be updated: ${error.message}`, { error: true });
                }
            } } });
        } else if (opened.None && opened.Reason === 'noWhitecard') {
            Na__Toast__Show('This project has no whitecard in ValeVision 3D yet, so AURA draws the demo cottage. Sync its GLBs from SketchUp, then open it again.', { ms: 12000 });
        } else if (opened.None && opened.Reason !== 'noApi') {
            Na__Toast__Show(`AURA could not open this project's scene (${opened.Message || opened.Reason}), so it draws the demo cottage.`, { error: true, ms: 12000 });
        } else if (opened.Unsupported) {
            Na__Toast__Show('This version of AURA\'s engine cannot draw a project\'s own model yet, so it draws the demo cottage.', { ms: 12000 });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | What Is Loaded (for the parameter dump and the status line)
    // ------------------------------------------------------------
    function Na__EngineHost__SceneInfo() {
        const S  =  Na__EngineHostScene__State;
        return { Loaded: S.loaded, Counts: S.counts, Import: S.scene ? S.scene.AuraScene__Source.ImportNumber : null, Source: S.source };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__EngineHost__SceneImport,
        Na__EngineHost__SceneInfo,
        Na__EngineHost__SceneNotes,
        Na__EngineHost__SceneOpen
    };

// endregion -------------------------------------------------------------------
