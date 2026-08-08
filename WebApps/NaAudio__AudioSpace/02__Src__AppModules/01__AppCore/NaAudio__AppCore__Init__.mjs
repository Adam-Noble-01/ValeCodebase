/* =============================================================================
   NAAUDIO - APP CORE | INIT
   =============================================================================

   FILE       : NaAudio__AppCore__Init__.mjs
   NAMESPACE  : NaAudio
   MODULE     : AppCore - Init
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The boot sequence. The only module that knows the whole application
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Entry point. Loaded once by NaAudio__App__.html and orchestrates every other
     module.
   - The one place in the application allowed to know about all four subsystems at
     once. Everything else talks through the event bus, the config accessor or a
     direct call to a single neighbour.

   ---------------------------------------------------------------------------

   THE BOOT SEQUENCE, AND WHY IT IS IN THIS ORDER

       1. HUD SHELL          The boot gate goes up first, so a slow config load has
                             something to report into rather than a blank page.

       2. CONFIG             Every config document and every library index. Nothing
                             below this can run without it - the palette, the scene,
                             the engine all read their numbers from here.

       3. VISUAL SPACE       Renderer, camera, lights, ground, backdrop. Built BEFORE
                             the audio, so the gate lifts onto a space that already
                             exists rather than onto a blank canvas that then fills in.

       4. MODULE TYPES       Registered but not instantiated. A catalogue of what can
                             exist.

       5. SPACE FILE         Fetched and held. Not built yet - building a module means
                             building audio nodes, and there is still no context.

       6. GATE OPENS         The user clicks. That gesture, and nothing else, unlocks
                             the AudioContext.

       7. AUDIO GRAPH        Context, master bus, transport.

       8. MODULE INSTANCES   Now they can be built, because now they can have audio.

       9. PATCH CABLES       After every module exists, because a cable needs both ends.

   Steps 6 and 7 cannot be moved earlier and steps 8 and 9 cannot be swapped. Everything
   else is a matter of taste.

   ============================================================================= */

import {
    NaAudio__Event,
    NaAudio__EventBus__Publish,
    NaAudio__EventBus__Subscribe
} from './NaAudio__AppCore__EventBus__.mjs';
import {
    NaAudio__ModeManager__BindKeyboard,
    NaAudio__ModeManager__IsBuild
} from './NaAudio__AppCore__ModeManager__.mjs';
import {
    NaAudio__ConfigLoader__LoadAll,
    NaAudio__ConfigLoader__ResolvePath,
    NaAudio__ConfigLoader__Runtime,
    NaAudio__ConfigLoader__Meta
} from './NaAudio__AppCore__ConfigLoader__.mjs';

import * as SceneManager  from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__SceneManager__.mjs';
import * as CameraRig     from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__CameraRig__.mjs';
import * as LightingRig   from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__LightingRig__.mjs';
import * as GroundStage   from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__GroundStage__.mjs';
import * as GroundField   from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__GroundField__.mjs';
import * as Palette       from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Labels        from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Labels3d__.mjs';
import { NaAudio__Env3d__Interaction__Attach }  from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';

import * as AudioHost     from '../10__Audio__WebAudioEngine/NaAudio__Engine__AudioHost__.mjs';
import * as Transport     from '../10__Audio__WebAudioEngine/NaAudio__Engine__Transport__.mjs';
import * as SamplePlayer  from '../10__Audio__WebAudioEngine/NaAudio__Engine__SamplePlayer__.mjs';
import * as SampleBank    from '../15__Audio__SampleLibraryLoader/NaAudio__Library__SampleBank__.mjs';

import * as ModuleRegistry from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleRegistry__.mjs';
import * as PatchGraph     from '../20__System__SpatialModuleFramework/NaAudio__Spatial__PatchGraph__.mjs';
import * as WiringController from '../20__System__SpatialModuleFramework/NaAudio__Spatial__WiringController__.mjs';

import { NaAudio__Module__CircularSequencer, NaAudio__CircularSequencer__TypeName } from '../25__Module__CircularSequencer/NaAudio__Module__CircularSequencer__.mjs';
import { NaAudio__Module__CubeMod,           NaAudio__CubeMod__TypeName }           from '../26__Module__CubeMod/NaAudio__Module__CubeMod__.mjs';
import { NaAudio__Module__DelayCloud,        NaAudio__DelayCloud__TypeName }        from '../27__Module__DelayCloud/NaAudio__Module__DelayCloud__.mjs';
import { NaAudio__Module__OutputPost,        NaAudio__OutputPost__TypeName }        from '../28__Module__OutputPost/NaAudio__Module__OutputPost__.mjs';

import * as BootGate        from '../40__System__HudOverlay/NaAudio__Hud__BootGate__.mjs';
import * as TransportBar    from '../40__System__HudOverlay/NaAudio__Hud__TransportBar__.mjs';
import * as ModuleInspector from '../40__System__HudOverlay/NaAudio__Hud__ModuleInspector__.mjs';
import * as HelpOverlay     from '../40__System__HudOverlay/NaAudio__Hud__HelpOverlay__.mjs';
import * as Diagnostics     from '../40__System__HudOverlay/NaAudio__Hud__Diagnostics__.mjs';
import * as ModeIndicator   from '../40__System__HudOverlay/NaAudio__Hud__ModeIndicator__.mjs';
import * as ModulePalette   from '../40__System__HudOverlay/NaAudio__Hud__ModulePalette__.mjs';

// =============================================================================
// REGION | Application Boot
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Mount Element Ids
    // ------------------------------------------------------------
    const VIEWPORT_ID  =  'NaAudio__App__Viewport';
    const HUD_ID       =  'NaAudio__App__Hud';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Boot State
    // ------------------------------------------------------------
    let surface        =  null;
    let spaceDocument  =  null;
    let bootStartedAt  =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visual Space
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the 3D Environment
    // ------------------------------------------------------------
    function NaAudio__Init__BuildVisualSpace() {
        NaAudio__EventBus__Publish(NaAudio__Event.BootStageChanged, {
            Stage   : 'space',
            Message : 'Building the space'
        });

        Palette.NaAudio__Palette__Prime();                                    // <-- Fail loudly here on a bad hex, not silently later
        GroundField.NaAudio__Env3d__GroundField__Prime();                     // <-- Allocates the source buffer the ground materials will point at

        const viewport  =  document.getElementById(VIEWPORT_ID);
        surface         =  SceneManager.NaAudio__Env3d__SceneManager__Create(viewport);

        CameraRig.NaAudio__Env3d__CameraRig__Attach(surface);
        LightingRig.NaAudio__Env3d__LightingRig__Build(surface);
        GroundStage.NaAudio__Env3d__GroundStage__Build(surface);               // <-- Binds the floor and grid to the field

        NaAudio__Env3d__Interaction__Attach(surface);

        // The ground field, repacked once per frame. It runs before the label sweep for
        // no reason other than that the islands are the thing most obviously wrong if the
        // hook order ever stops being what somebody expected.
        SceneManager.NaAudio__Env3d__SceneManager__AddUpdateHook(surface, function () {
            GroundField.NaAudio__Env3d__GroundField__Update();
        });

        // The label fade sweep. One hook over the shell group per frame, rather than each
        // module registering its own - see the note in NaAudio__Env3d__Labels3d.
        SceneManager.NaAudio__Env3d__SceneManager__AddUpdateHook(surface, function () {
            Labels.NaAudio__Env3d__Labels3d__UpdateFade(
                surface.Camera,
                surface.Groups[SceneManager.NaAudio__Env3d__SceneGroup.ModuleShells]
            );
        });

        SceneManager.NaAudio__Env3d__SceneManager__StartLoop(surface);
        return surface;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Register Every Spatial Module Type
    // ------------------------------------------------------------
    // Types are registered here rather than self-registering on import, because a module
    // file that registers itself as a side effect of being imported is invisible in the
    // boot sequence - and the order things enter the registry stops being knowable.
    function NaAudio__Init__RegisterModuleTypes() {
        ModuleRegistry.NaAudio__ModuleRegistry__RegisterType(NaAudio__CircularSequencer__TypeName, NaAudio__Module__CircularSequencer);
        ModuleRegistry.NaAudio__ModuleRegistry__RegisterType(NaAudio__CubeMod__TypeName,           NaAudio__Module__CubeMod);
        ModuleRegistry.NaAudio__ModuleRegistry__RegisterType(NaAudio__DelayCloud__TypeName,        NaAudio__Module__DelayCloud);
        ModuleRegistry.NaAudio__ModuleRegistry__RegisterType(NaAudio__OutputPost__TypeName,        NaAudio__Module__OutputPost);

        ModuleRegistry.NaAudio__ModuleRegistry__Attach(surface);
        PatchGraph.NaAudio__PatchGraph__Attach(surface);
        WiringController.NaAudio__WiringController__Attach(surface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Space Loading
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Fetch the Boot Space Document
    // ------------------------------------------------------------
    // Fetched during boot but not built until after the audio unlocks. A missing space
    // file is survivable - the environment still comes up, empty - so this reports and
    // returns null rather than aborting the boot.
    async function NaAudio__Init__FetchBootSpace() {
        const runtime  =  NaAudio__ConfigLoader__Runtime();
        if (!runtime || !runtime.BootSpacePath) return null;

        try {
            const response  =  await fetch(NaAudio__ConfigLoader__ResolvePath(runtime.BootSpacePath), { cache: 'no-store' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return await response.json();
        } catch (error) {
            console.error('[NaAudio Init] Could not load the boot space "' + runtime.BootSpacePath + '":', error.message);
            return null;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Space Once Audio Is Available
    // ------------------------------------------------------------
    // Modules first, then cables. A cable needs both of its endpoints to exist, and a
    // space file is free to list a cable before the modules it joins.
    function NaAudio__Init__BuildSpace() {
        if (!spaceDocument) return;

        const meta  =  spaceDocument['NaAudio__Space__Meta'];
        if (meta && typeof meta.Bpm === 'number') {
            Transport.NaAudio__Transport__SetBpm(meta.Bpm);
        }

        ModuleRegistry.NaAudio__ModuleRegistry__LoadSpace(spaceDocument);
        PatchGraph.NaAudio__PatchGraph__LoadFromSpace(spaceDocument);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Audio Start
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Unlock Audio and Build Everything That Needs It
    // ------------------------------------------------------------
    // Called from inside the boot gate's click handler, so the AudioContext is created
    // and resumed within a real user gesture. Moving any part of this off the gesture -
    // behind a timer, or after an unrelated await - loses the gesture and leaves the
    // context suspended with no error anywhere.
    async function NaAudio__Init__StartAudio() {
        await AudioHost.NaAudio__AudioHost__Unlock();

        Transport.NaAudio__Transport__Initialise();
        SampleBank.NaAudio__SampleBank__BuildCatalogue();

        NaAudio__Init__BuildSpace();

        const runtime  =  NaAudio__ConfigLoader__Runtime();
        if (runtime && runtime.AutoStartTransport === true) {
            Transport.NaAudio__Transport__Start();
        }

        NaAudio__Init__BindPageVisibility();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Stop the Transport When the Tab Is Hidden
    // ------------------------------------------------------------
    // A hidden tab has its timers throttled to roughly once a second, which is far longer
    // than the lookahead window - so the scheduler falls behind, the transport
    // catch-up guard skips the gap, and the user returns to a pattern that has silently
    // jumped position. Stopping is the honest outcome.
    //
    // The audio context is NOT suspended. Its clock is what every scheduled event is
    // stamped against, and suspending it would freeze that clock underneath any tail
    // still ringing.
    function NaAudio__Init__BindPageVisibility() {
        document.addEventListener('visibilitychange', function () {
            if (document.hidden && Transport.NaAudio__Transport__IsRunning()) {
                Transport.NaAudio__Transport__Stop();
                SamplePlayer.NaAudio__SamplePlayer__ReleaseAll(0.12);
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boot
// -----------------------------------------------------------------------------

    // FUNCTION | Boot the Application
    // ------------------------------------------------------------
    export async function NaAudio__AppCore__Init__Boot() {
        bootStartedAt  =  performance.now();

        const hudMount  =  document.getElementById(HUD_ID);

        // The gate goes up before anything else, so a slow config load reports progress
        // rather than showing a blank page.
        BootGate.NaAudio__BootGate__Build(hudMount, null);

        try {
            await NaAudio__ConfigLoader__LoadAll();

            const appMeta  =  NaAudio__ConfigLoader__Meta();
            const runtime  =  NaAudio__ConfigLoader__Runtime();

            NaAudio__Init__BuildVisualSpace();
            NaAudio__Init__RegisterModuleTypes();

            spaceDocument  =  await NaAudio__Init__FetchBootSpace();

            // THE HUD
            // Built after the space, because the transport bar reads the camera presets
            // and the inspector subscribes to selection - both of which need a live
            // surface behind them.
            TransportBar.NaAudio__TransportBar__Build(hudMount, surface);
            ModuleInspector.NaAudio__ModuleInspector__Build(hudMount);
            ModeIndicator.NaAudio__ModeIndicator__Build(hudMount);
            HelpOverlay.NaAudio__HelpOverlay__Build(hudMount, appMeta);

            NaAudio__ModeManager__BindKeyboard();
            NaAudio__Init__BindModeToGround();

            if (runtime && runtime.ShowDiagnostics) {
                Diagnostics.NaAudio__Diagnostics__Build(hudMount, surface);
                NaAudio__Init__PublishDevHandle();
            }

            // AFTER the diagnostics readout, deliberately. Both live down the left edge,
            // and the palette drops itself below the readout with a CSS sibling rule -
            // which only matches a PRECEDING sibling, so the order here is what makes the
            // two stack instead of overlapping.
            ModulePalette.NaAudio__ModulePalette__Build(hudMount, surface);

            BootGate.NaAudio__BootGate__OnEnter(function () {
                return NaAudio__Init__StartAudio().then(function () {
                    HelpOverlay.NaAudio__HelpOverlay__ShowIfFirstVisit(runtime ? runtime.ShowHelpOnFirstBoot : false);
                });
            });

            NaAudio__EventBus__Publish(NaAudio__Event.BootComplete, {
                DurationMs : Math.round(performance.now() - bootStartedAt)
            });

        } catch (error) {
            console.error('[NaAudio Init] Boot failed:', error);
            NaAudio__EventBus__Publish(NaAudio__Event.BootFailed, {
                Stage : 'boot',
                Error : error.message
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Let the Ground Answer the Mode
    // ------------------------------------------------------------
    // Build mode lifts the ground grid; Play mode drops it back. A layout being
    // rearranged wants a visible measure under it, and the same grid while playing is
    // a distraction from the instruments.
    //
    // This is the third of the three mode signals - the rule across the top edge, the
    // pointer cursor, and the floor itself. Together the mode is knowable without
    // reading anything, which matters because acting in the wrong mode is the one
    // failure a modal interface has to design against.
    function NaAudio__Init__BindModeToGround() {
        const applyGrid  =  function () {
            GroundStage.NaAudio__Env3d__GroundStage__SetGridEmphasis(
                surface,
                NaAudio__ModeManager__IsBuild()
            );
        };

        NaAudio__EventBus__Subscribe(NaAudio__Event.ModeChanged, applyGrid);
        applyGrid();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Live 3D Surface
    // ------------------------------------------------------------
    // Nothing in the application uses this - every module is handed the surface it needs.
    // It exists for the console and for automated checks.
    export function NaAudio__AppCore__Init__Surface() {
        return surface;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Publish a Development Handle on the Window
    // ------------------------------------------------------------
    // The application is ESM end to end and nothing is global, which is correct and also
    // means there is no way to reach any of it from the console or from a browser-driven
    // test. This publishes one read-only handle, and only when ShowDiagnostics is on - so
    // it travels with the readout it belongs beside and is off in any build that has
    // turned diagnostics off.
    //
    // Nothing inside the application may read this. It is an outward-facing window for
    // inspection, not an inward-facing service locator - the moment a module reaches for
    // it, the module graph stops being the module graph.
    function NaAudio__Init__PublishDevHandle() {
        window.NaAudio__Dev  =  Object.freeze({
            Surface        : NaAudio__AppCore__Init__Surface,
            Modules        : ModuleRegistry.NaAudio__ModuleRegistry__Modules,
            Module         : ModuleRegistry.NaAudio__ModuleRegistry__Module,
            Select         : ModuleRegistry.NaAudio__ModuleRegistry__Select,
            Cables         : PatchGraph.NaAudio__PatchGraph__Cables,
            Connect        : PatchGraph.NaAudio__PatchGraph__Connect,
            Disconnect     : PatchGraph.NaAudio__PatchGraph__Disconnect,
            Wiring         : WiringController,
            Palette        : ModulePalette,
            Transport      : Transport,
            SampleBank     : SampleBank,
            MasterLevel    : AudioHost.NaAudio__AudioHost__MasterLevel,       // <-- Lets a check prove a patch is audible, not merely drawn
            Note           : 'Development handle. Published only while ShowDiagnostics is true. Nothing inside AudioSPACE reads this.'
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Entry
// -----------------------------------------------------------------------------

    // FUNCTION | Start on DOM Ready
    // ------------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', NaAudio__AppCore__Init__Boot);
    } else {
        NaAudio__AppCore__Init__Boot();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
