/* =============================================================================
   NAAUDIO - SPATIAL MODULE | CIRCULAR SEQUENCER
   =============================================================================

   FILE       : NaAudio__Module__CircularSequencer__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Module - CircularSequencer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Rhythms arranged on a circle, with a free division count
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - The design manifest's first named interaction tool, built as specified: steps sit
     on a circle, a marker sweeps round like a clock hand at the project tempo, and the
     number of divisions is freely adjustable rather than locked to sixteen.
   - Four concentric lanes, one per drum voice, each lane a different geometric SHAPE as
     well as a different pigment.

   ---------------------------------------------------------------------------

   WHY A FREE DIVISION COUNT IS THE WHOLE POINT

   A conventional step sequencer is a grid, and a grid quietly imposes powers of two.
   Getting a triplet out of one means either a tuplet mode bolted onto the side, or
   drawing sixteenths and deleting two out of every three.

   A circle has no such bias. Three divisions of a bar IS a triplet - not an
   approximation of one. Seven divisions is a seven, which no grid sequencer expresses
   without a fight. The division count being free is not a feature added to the circle;
   it is the reason for the circle.

   ---------------------------------------------------------------------------

   SHAPE CARRIES MEANING, NOT JUST COLOUR

   Each lane draws its steps as a different primitive - cylinder, box, cone,
   octahedron - and the manifest asks for exactly this. Colour alone is not enough for
   two reasons: it fails at distance in a space the user is orbiting around, and it
   fails entirely for anyone with a colour vision deficiency. Shape survives both.

   ---------------------------------------------------------------------------

   HOW A STEP GETS ITS SOUND

   Scheduling and animation are deliberately separated.

   The SCHEDULER is handed a beat window by the transport, works out which steps fall
   inside it, and fires each sample at an absolute audio time - ahead of real time, so
   the audio hardware places it exactly.

   The ANIMATION reads the transport's current playhead every frame and pulses whichever
   step the marker has just passed. It never reads the scheduler.

   Driving the animation from the scheduler would run the visuals a lookahead window
   ahead of the sound - a tenth of a second of visible lead, which is easily enough to
   see and feels badly wrong. Keeping them apart is what makes a step flash at the same
   moment it is heard.

   ============================================================================= */

import * as THREE from 'three';

import * as Palette          from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Materials        from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__MaterialLibrary__.mjs';
import * as Shapes           from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__ShapeFactory__.mjs';
import * as Lines            from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__LineFactory__.mjs';
import {
    NaAudio__Env3d__Interaction__Register,
    NaAudio__Env3d__HandleKind
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';
import * as ModuleBase       from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleBase__.mjs';
import * as SampleBank       from '../15__Audio__SampleLibraryLoader/NaAudio__Library__SampleBank__.mjs';
import * as SamplePlayer     from '../10__Audio__WebAudioEngine/NaAudio__Engine__SamplePlayer__.mjs';
import {
    NaAudio__Transport__PlayheadBeats,
    NaAudio__Transport__BeatsPerBar,
    NaAudio__Transport__IsRunning
} from '../10__Audio__WebAudioEngine/NaAudio__Engine__Transport__.mjs';
import {
    NaAudio__MusicalMaths__Clamp,
    NaAudio__MusicalMaths__SwingOffsetSeconds
} from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';

// =============================================================================
// REGION | Circular Sequencer
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Type Name and Geometry Layout
    // ------------------------------------------------------------
    export const NaAudio__CircularSequencer__TypeName  =  'CircularSequencer';

    const LANE_VOICE_ROLES  =  ['kick', 'snare', 'hihat', 'tomLow'];          // <-- Lane index to voice role; lane 0 is the outermost
    const STEP_HEIGHT       =  0.10;                                          // <-- How far a step stands off its lane ring

    const ANGLE_OFFSET      =  -Math.PI / 2;                                  // <-- Division zero sits at twelve o'clock

    const SCRATCH_COLOUR    =  new THREE.Color();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Layout Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Radius of a Lane
    // ------------------------------------------------------------
    // Lane 0 is the outermost and works inward, so the first and most important voice
    // is on the biggest circle with the most room between its steps.
    function NaAudio__CircularSequencer__LaneRadius(defaults, laneIndex) {
        return defaults.RingRadius - laneIndex * defaults.LaneSpacing;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Angle of a Division
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__StepAngle(stepIndex, divisions) {
        return (stepIndex / divisions) * Math.PI * 2 + ANGLE_OFFSET;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Place a Step Mesh at Its Division
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__PlaceStep(mesh, radius, stepIndex, divisions) {
        const angle  =  NaAudio__CircularSequencer__StepAngle(stepIndex, divisions);
        mesh.position.set(Math.cos(angle) * radius, STEP_HEIGHT, Math.sin(angle) * radius);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pattern Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build an Empty Lane Pattern
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__EmptyPattern(divisions) {
        return new Array(divisions).fill(false);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Pattern Out of the Module Settings
    // ------------------------------------------------------------
    // A pattern in a space file is a string of characters - 'x...x...x...x...' - rather
    // than an array of booleans. It is legible at a glance when the file is opened in an
    // editor, which an array of sixteen true and false values is not.
    function NaAudio__CircularSequencer__PatternFromString(text, divisions) {
        const pattern  =  NaAudio__CircularSequencer__EmptyPattern(divisions);
        if (typeof text !== 'string') return pattern;

        for (let i = 0; i < divisions && i < text.length; i++) {
            const character  =  text[i];
            pattern[i]  =  (character === 'x' || character === 'X' || character === '1');
        }
        return pattern;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a Pattern Back to a String
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__PatternToString(pattern) {
        let text  =  '';
        for (let i = 0; i < pattern.length; i++) text += pattern[i] ? 'x' : '.';
        return text;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry Build
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Lane Rings and Division Ticks
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__BuildRings(module, state) {
        const defaults  =  module.Defaults;

        for (let lane = 0; lane < state.LaneCount; lane++) {
            const radius  =  NaAudio__CircularSequencer__LaneRadius(defaults, lane);

            const ring  =  new THREE.Mesh(
                Shapes.NaAudio__Env3d__ShapeFactory__FlatTorus(radius, 0.006),
                Materials.NaAudio__Materials__Line('InkGhost', 0.42)
            );
            ring.position.y  =  STEP_HEIGHT;
            module.BodyGroup.add(ring);
        }

        // Ticks on the outermost lane only. One set of radial marks is enough to make
        // the division count legible; four concentric sets is a moiré pattern.
        const outer  =  NaAudio__CircularSequencer__LaneRadius(defaults, 0);
        const ticks  =  Lines.NaAudio__Env3d__LineFactory__BuildRadialTicks(
            state.Divisions, outer + 0.05, outer + 0.15, 'InkFaint', 0.5
        );
        ticks.position.y  =  STEP_HEIGHT;
        module.BodyGroup.add(ticks);

        state.Ticks  =  ticks;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Central Hub
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__BuildHub(module, state) {
        const defaults  =  module.Defaults;

        const hub  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__UnitCylinder(),
            Materials.NaAudio__Materials__OwnedBody('Bone', 'Base')
        );
        hub.scale.set(defaults.HubRadius * 2, 0.06, defaults.HubRadius * 2);
        hub.position.y  =  STEP_HEIGHT;
        hub.castShadow  =  true;

        ModuleBase.NaAudio__ModuleBase__RegisterFadeMaterial(module, hub.material);
        module.BodyGroup.add(hub);

        state.Hub  =  hub;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Sweeping Playhead Marker
    // ------------------------------------------------------------
    // A flat bar pivoted at the hub. Built as a child of a pivot group so the animation
    // is one rotation write per frame rather than a position recompute.
    function NaAudio__CircularSequencer__BuildMarker(module, state) {
        const defaults  =  module.Defaults;

        const pivot  =  new THREE.Group();
        pivot.position.y  =  STEP_HEIGHT + 0.012;                             // <-- Just above the lane rings so it reads as passing over them

        const bar  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__Bar(defaults.MarkerWidth / defaults.MarkerLength),
            Materials.NaAudio__Materials__Line('Ink', 0.72)
        );
        bar.geometry.computeBoundingBox();
        bar.scale.set(defaults.MarkerLength, defaults.MarkerLength, 1);
        bar.rotation.x  =  -Math.PI / 2;                                      // <-- Authored in XY, laid flat
        bar.position.x  =  defaults.MarkerLength / 2;                         // <-- Pivot at one end, not the middle

        pivot.add(bar);
        module.BodyGroup.add(pivot);

        state.MarkerPivot  =  pivot;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Lane's Step Meshes
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__BuildLaneSteps(module, state, laneIndex) {
        const defaults   =  module.Defaults;
        const radius     =  NaAudio__CircularSequencer__LaneRadius(defaults, laneIndex);
        const voiceRole  =  LANE_VOICE_ROLES[laneIndex] || 'perc';
        const shapeName  =  defaults.StepShapesByLane[laneIndex % defaults.StepShapesByLane.length];

        const lane  =  state.Lanes[laneIndex];

        for (let step = 0; step < state.Divisions; step++) {
            // Each step owns its material. It has to: a step pulses its own emissive
            // and scale on trigger, and a shared material would flash all sixteen at
            // once.
            const material  =  Materials.NaAudio__Materials__OwnedVoiceRoleBody(voiceRole, 'Base');
            const mesh      =  new THREE.Mesh(Shapes.NaAudio__Env3d__ShapeFactory__UnitSolid(shapeName), material);

            const baseSize  =  defaults.StepBaseSize;
            mesh.scale.setScalar(baseSize);
            NaAudio__CircularSequencer__PlaceStep(mesh, radius, step, state.Divisions);
            mesh.castShadow  =  true;

            ModuleBase.NaAudio__ModuleBase__RegisterFadeMaterial(module, material);

            // A step is a click target. Registered as a Click handle rather than a drag
            // so it can never be nudged - and because the pad underneath is the module's
            // drag handle, a drag starting on a step would be ambiguous.
            const unregister  =  NaAudio__Env3d__Interaction__Register(mesh, {
                Kind     : NaAudio__Env3d__HandleKind.Click,
                ModuleId : module.ModuleId,
                Cursor   : 'pointer',
                Data     : { Lane: laneIndex, Step: step },
                OnClick  : function (handle) {
                    NaAudio__CircularSequencer__ToggleStep(module, handle.Data.Lane, handle.Data.Step);
                },
                OnHover  : function (isHovered, handle) {
                    const target  =  state.Lanes[handle.Data.Lane].Meshes[handle.Data.Step];
                    target.userData.NaAudio__Hovered  =  isHovered;
                }
            });

            module.Unregisters.push(unregister);

            lane.Meshes.push(mesh);
            lane.PulseAmount.push(0);
            module.BodyGroup.add(mesh);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sample Binding
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Bind Each Lane to a Sample From the Chosen Kit
    // ------------------------------------------------------------
    // A lane binds to a ROLE, and the kit answers with whatever sample fills it. That
    // indirection is what lets the whole kit be swapped under a pattern without any lane
    // losing its binding - which is exactly how a drum machine should behave.
    function NaAudio__CircularSequencer__BindKit(module, state) {
        const kitId  =  module.Settings.KitId || 'KIT_Cr78';
        state.KitId  =  kitId;

        const assetIds  =  [];

        for (let lane = 0; lane < state.LaneCount; lane++) {
            const voiceRole  =  LANE_VOICE_ROLES[lane] || 'perc';
            const entry      =  SampleBank.NaAudio__SampleBank__KitVoice(kitId, voiceRole);

            state.Lanes[lane].VoiceRole  =  voiceRole;
            state.Lanes[lane].AssetId    =  entry ? entry.AssetId : null;

            if (entry) assetIds.push(entry.AssetId);
        }

        // Decoded ahead of the first play rather than on demand. The scheduler runs in a
        // timing-critical path and cannot await anything, so a sample that has not
        // decoded by the time its step comes round is simply silent - which presents as
        // a pattern with holes in it for the first bar.
        SampleBank.NaAudio__SampleBank__LoadMany(assetIds);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Step Editing
// -----------------------------------------------------------------------------

    // FUNCTION | Toggle One Step On or Off
    // ------------------------------------------------------------
    export function NaAudio__CircularSequencer__ToggleStep(module, laneIndex, stepIndex) {
        const state  =  module.TypeState;
        const lane   =  state.Lanes[laneIndex];
        if (!lane) return;

        lane.Pattern[stepIndex]  =  !lane.Pattern[stepIndex];
        NaAudio__CircularSequencer__ApplyStepAppearance(module, laneIndex, stepIndex);

        module.Settings.Patterns  =  state.Lanes.map((entry) => NaAudio__CircularSequencer__PatternToString(entry.Pattern));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Set a Step's Resting Size for Its On or Off State
    // ------------------------------------------------------------
    // An active step is nearly twice the size of an inactive one. Size rather than
    // brightness, because size survives being seen from across the space at a shallow
    // angle and a brightness difference does not.
    function NaAudio__CircularSequencer__ApplyStepAppearance(module, laneIndex, stepIndex) {
        const state     =  module.TypeState;
        const defaults  =  module.Defaults;
        const lane      =  state.Lanes[laneIndex];
        const mesh      =  lane.Meshes[stepIndex];
        if (!mesh) return;

        const isActive  =  lane.Pattern[stepIndex];
        const size      =  defaults.StepBaseSize * (isActive ? defaults.StepActiveSizeFactor : 1.0);

        mesh.userData.NaAudio__RestingScale  =  size;
        mesh.scale.setScalar(size);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Type Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | The Circular Sequencer Type Implementation
    // ------------------------------------------------------------
    export const NaAudio__Module__CircularSequencer  =  {

        // BUILD | Construct the sequencer's geometry and bind its kit
        // ------------------------------------------------------------
        Build : function (module) {
            const defaults  =  module.Defaults;

            const divisions  =  NaAudio__MusicalMaths__Clamp(
                module.Settings.Divisions || defaults.Divisions,
                defaults.DivisionsMin, defaults.DivisionsMax
            );

            const laneCount  =  Math.min(module.Settings.LaneCount || defaults.LaneCount, LANE_VOICE_ROLES.length);

            const state  =  {
                Divisions    : Math.round(divisions),
                LaneCount    : laneCount,
                KitId        : null,
                Lanes        : [],
                MarkerPivot  : null,
                Hub          : null,
                Ticks        : null,
                LastStepFired: -1,                                            // <-- Guards the animation against pulsing a step twice
                Gain         : (module.Settings.Gain === undefined) ? 0.85 : module.Settings.Gain
            };

            const patternStrings  =  module.Settings.Patterns || [];

            for (let lane = 0; lane < laneCount; lane++) {
                state.Lanes.push({
                    VoiceRole   : LANE_VOICE_ROLES[lane] || 'perc',
                    AssetId     : null,
                    Pattern     : NaAudio__CircularSequencer__PatternFromString(patternStrings[lane], state.Divisions),
                    Meshes      : [],
                    PulseAmount : []
                });
            }

            module.TypeState  =  state;

            NaAudio__CircularSequencer__BuildRings(module, state);
            NaAudio__CircularSequencer__BuildHub(module, state);
            NaAudio__CircularSequencer__BuildMarker(module, state);

            for (let lane = 0; lane < laneCount; lane++) {
                NaAudio__CircularSequencer__BuildLaneSteps(module, state, lane);
                for (let step = 0; step < state.Divisions; step++) {
                    NaAudio__CircularSequencer__ApplyStepAppearance(module, lane, step);
                }
            }

            NaAudio__CircularSequencer__BindKit(module, state);
        },
        // ------------------------------------------------------------


        // SCHEDULE | Fire the steps falling inside one lookahead window
        // ------------------------------------------------------------
        // The window is in BEATS and the pattern is in DIVISIONS OF A BAR, so the two
        // have to be reconciled. Working in absolute step indices - step 37 of the
        // sequence, not step 5 of bar 2 - is what makes that reconciliation a single
        // floor operation and keeps it correct across a bar line.
        Schedule : function (module, window) {
            const state  =  module.TypeState;
            if (!state) return;

            const stepsPerBeat   =  state.Divisions / window.BeatsPerBar;
            const firstStep      =  Math.ceil(window.FromBeat * stepsPerBeat - 0.000001);
            const lastStep       =  Math.floor(window.ToBeat * stepsPerBeat - 0.000001);

            const swing          =  module.Settings.Swing || 0;
            const secondsPerStep =  window.SecondsPerBar / state.Divisions;

            for (let absoluteStep = firstStep; absoluteStep <= lastStep; absoluteStep++) {
                if (absoluteStep < 0) continue;

                const stepIndex  =  ((absoluteStep % state.Divisions) + state.Divisions) % state.Divisions;
                const beat       =  absoluteStep / stepsPerBeat;
                const audioTime  =  window.AudioTimeAtBeat(beat)
                                  + NaAudio__MusicalMaths__SwingOffsetSeconds(stepIndex, secondsPerStep, swing);

                for (let lane = 0; lane < state.LaneCount; lane++) {
                    const laneState  =  state.Lanes[lane];
                    if (!laneState.Pattern[stepIndex]) continue;
                    if (!laneState.AssetId) continue;

                    const buffer  =  SampleBank.NaAudio__SampleBank__Buffer(laneState.AssetId);
                    if (!buffer) continue;                                    // <-- Not decoded yet; silent for this pass, never blocking

                    SamplePlayer.NaAudio__SamplePlayer__Play(buffer, {
                        AtTime      : audioTime,
                        Destination : module.Bus.Output,
                        Gain        : state.Gain
                    });
                }
            }
        },
        // ------------------------------------------------------------


        // UPDATE | Sweep the marker and decay the step pulses
        // ------------------------------------------------------------
        Update : function (module, delta) {
            const state     =  module.TypeState;
            const defaults  =  module.Defaults;
            if (!state) return;

            // THE MARKER
            // Driven from the transport's CURRENT playhead, never from the scheduler -
            // see the note in the file header on why those must stay apart.
            if (NaAudio__Transport__IsRunning()) {
                const beats          =  NaAudio__Transport__PlayheadBeats();
                const barPosition    =  (beats / NaAudio__Transport__BeatsPerBar()) % 1;   // <-- Fraction of the way round the circle
                state.MarkerPivot.rotation.y  =  -barPosition * Math.PI * 2;

                // Pulse whichever step the marker has just crossed. Compared against the
                // last fired index so a frame that spans no step boundary does nothing,
                // and a frame that spans several still only pulses the newest.
                const currentStep  =  Math.floor(barPosition * state.Divisions);
                if (currentStep !== state.LastStepFired) {
                    state.LastStepFired  =  currentStep;

                    for (let lane = 0; lane < state.LaneCount; lane++) {
                        if (state.Lanes[lane].Pattern[currentStep]) {
                            state.Lanes[lane].PulseAmount[currentStep]  =  1.0;
                        }
                    }
                }
            }

            // THE PULSE DECAY
            // One pass over every step. Cheap because it is arithmetic on numbers already
            // in cache, and it touches a material only for steps that are actually
            // pulsing or hovered.
            const decayRate  =  delta / Math.max(defaults.StepPulseDecaySeconds, 0.0001);
            const pulseScale =  defaults.StepTriggerPulseFactor;

            for (let lane = 0; lane < state.LaneCount; lane++) {
                const laneState  =  state.Lanes[lane];

                for (let step = 0; step < state.Divisions; step++) {
                    const pulse  =  laneState.PulseAmount[step];
                    const mesh   =  laneState.Meshes[step];
                    const hover  =  mesh.userData.NaAudio__Hovered === true;

                    if (pulse <= 0 && !hover) continue;

                    const resting  =  mesh.userData.NaAudio__RestingScale || defaults.StepBaseSize;
                    const boost    =  Math.max(pulse, hover ? 0.35 : 0);

                    mesh.scale.setScalar(resting * (1 + (pulseScale - 1) * boost));

                    const base  =  mesh.material.userData.NaAudio__BaseColour;
                    if (base) {
                        Palette.NaAudio__Palette__Flash(base, boost * 0.55, SCRATCH_COLOUR);
                        mesh.material.color.copy(SCRATCH_COLOUR);
                    }

                    if (pulse > 0) {
                        laneState.PulseAmount[step]  =  Math.max(pulse - decayRate, 0);
                    }
                }
            }
        },
        // ------------------------------------------------------------


        // ON LOCK CHANGED | Nothing to silence beyond the framework's bus ramp
        // ------------------------------------------------------------
        // A sequencer holds no sustained voices of its own - every hit is a one-shot that
        // ends on its own. The framework has already ramped the bus and stopped calling
        // Schedule, so there is nothing left to do. The marker freezes where it is, which
        // is the honest representation of a stopped module until the manifest's looped
        // animation capture is built.
        OnLockChanged : function (module, isLocked) {
            const state  =  module.TypeState;
            if (state && isLocked) state.LastStepFired  =  -1;                 // <-- So unlocking does not skip the step it stopped on
        },
        // ------------------------------------------------------------


        // AUDIO INPUT | A sequencer takes no audio in
        // ------------------------------------------------------------
        // Absent on purpose rather than returning null. NaAudio__PatchGraph__Connect
        // warns when a cable arrives at a module with no AudioInput, which is the correct
        // and visible outcome for patching audio into a source.
        // ------------------------------------------------------------


        // SET PARAMETER | Named writes from a cable or the HUD
        // ------------------------------------------------------------
        SetParameter : function (module, parameterName, value) {
            const state  =  module.TypeState;
            if (!state) return;

            switch (parameterName) {
                case 'gain':
                    state.Gain  =  NaAudio__MusicalMaths__Clamp(value, 0, 1);
                    break;

                case 'swing':
                    module.Settings.Swing  =  NaAudio__MusicalMaths__Clamp(value, 0, 1);
                    break;

                default:
                    break;                                                     // <-- Unknown parameters are ignored, not thrown
            }
        },
        // ------------------------------------------------------------


        // DISPOSE | Nothing beyond what the framework owns
        // ------------------------------------------------------------
        // Meshes, geometries and materials are all in module.BodyGroup and are disposed
        // by the scene manager. The interaction handles were pushed onto
        // module.Unregisters and are released by the shell.
        Dispose : function (module) {
            module.TypeState  =  null;
        }
        // ------------------------------------------------------------
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
