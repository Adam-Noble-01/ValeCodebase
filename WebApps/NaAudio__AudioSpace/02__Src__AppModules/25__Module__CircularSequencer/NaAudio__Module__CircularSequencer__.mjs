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
   - The design manifest's first named interaction tool: steps on a circle, a marker
     sweeping round like a clock hand, and a division count that is free rather than
     locked to sixteen.
   - Four concentric lanes, one per drum voice, each lane a different geometric SHAPE
     as well as a different pigment.
   - Expands to reveal a bank of physical controls: cycle length, timing feel, two
     wobble controls and a sound bank selector.

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

   WHERE A STEP SITS IS WHERE IT PLAYS

   The timing feel and the wobble both move steps in TIME. Both therefore also move the
   step's mesh around the ring, by exactly the same amount.

   That is a hard rule for this module, not a nicety. The premise of the whole
   application is that the picture is the instrument - so a sequencer whose visible
   step positions did not match its audible ones would be actively lying, and worse,
   would be teaching the user to distrust everything else in the space. If a timing
   feature cannot be drawn, it does not go in.

   ---------------------------------------------------------------------------

   TRANSPARENCY CARRIES THE PATTERN

   An inactive step is transparent; an active one is solid. Size alone was tried first
   and is not enough - at working distance a ring of sixteen small solid shapes still
   reads as sixteen active steps, and the pattern was only legible from directly
   overhead. Opacity separates them at any angle.

   ---------------------------------------------------------------------------

   SCHEDULING AND ANIMATION ARE SEPARATE, ON PURPOSE

   The SCHEDULER is handed a beat window by the transport and fires each sample at an
   absolute audio time, ahead of real time. The ANIMATION reads the transport's current
   playhead every frame. Driving the animation from the scheduler would run the visuals
   a lookahead window ahead of the sound - easily enough to see, and deeply wrong.

   ============================================================================= */

import * as THREE from 'three';

import * as Palette          from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Materials        from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__MaterialLibrary__.mjs';
import * as Shapes           from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__ShapeFactory__.mjs';
import * as Lines            from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__LineFactory__.mjs';
import * as Controls         from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__ControlFactory__.mjs';
import {
    NaAudio__Env3d__Interaction__Register,
    NaAudio__Env3d__HandleKind
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';
import { NaAudio__Mode }     from '../01__AppCore/NaAudio__AppCore__ModeManager__.mjs';
import * as ModuleBase       from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleBase__.mjs';
import * as SampleBank       from '../15__Audio__SampleLibraryLoader/NaAudio__Library__SampleBank__.mjs';
import * as SamplePlayer     from '../10__Audio__WebAudioEngine/NaAudio__Engine__SamplePlayer__.mjs';
import {
    NaAudio__Transport__PlayheadBeats,
    NaAudio__Transport__BeatsPerBar,
    NaAudio__Transport__IsRunning
} from '../10__Audio__WebAudioEngine/NaAudio__Engine__Transport__.mjs';
import { NaAudio__SeededRandom__Create } from '../03__AppUtils/NaAudio__AppUtils__SeededRandom__.mjs';
import { NaAudio__MusicalMaths__Clamp }  from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';

// =============================================================================
// REGION | Circular Sequencer
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Type Name and Geometry Layout
    // ------------------------------------------------------------
    export const NaAudio__CircularSequencer__TypeName  =  'CircularSequencer';

    const LANE_VOICE_ROLES  =  ['kick', 'snare', 'hihat', 'tomLow'];          // <-- Lane 0 is the outermost
    const STEP_HEIGHT       =  0.10;                                          // <-- How far a step stands off its lane ring

    const ANGLE_OFFSET      =  -Math.PI / 2;                                  // <-- Division zero sits at twelve o'clock

    const SCRATCH_COLOUR    =  new THREE.Color();
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Timing Feel Templates
    // ------------------------------------------------------------
    // Each returns a step's position within the cycle as a 0 to 1 fraction. Used for
    // BOTH the scheduled time and the drawn angle, which is what keeps the two honest.
    const GRID_TEMPLATES  =  {

        // Even spacing. The reference.
        regular : (stepIndex, divisions) => stepIndex / divisions,

        // Every step pulled fully onto its nearest beat. Groups the pattern into
        // machine-gun bursts on the pulse - crude, deliberate, and instantly audible
        // as a different thing rather than as a subtle shuffle.
        onBeat : (stepIndex, divisions, beatsPerCycle) => {
            const raw   =  stepIndex / divisions;
            const beat  =  Math.round(raw * beatsPerCycle);
            return NaAudio__MusicalMaths__Clamp(beat / beatsPerCycle, 0, 0.9999);
        },

        // Classic triplet swing: the second of every pair lands two thirds of the way
        // through, rather than halfway.
        triplet : (stepIndex, divisions) => {
            const pair    =  Math.floor(stepIndex / 2);
            const isOff   =  (stepIndex % 2) === 1;
            const base    =  (pair * 2) / divisions;
            const span    =  2 / divisions;
            return base + (isOff ? span * (2 / 3) : 0);
        },

        // Harder swing. The off-step is pushed to three quarters, which is the dotted
        // feel - noticeably stiffer and more lurching than the triplet.
        dotted : (stepIndex, divisions) => {
            const pair    =  Math.floor(stepIndex / 2);
            const isOff   =  (stepIndex % 2) === 1;
            const base    =  (pair * 2) / divisions;
            const span    =  2 / divisions;
            return base + (isOff ? span * 0.75 : 0);
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Timing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Step's Position Within the Cycle, 0 to 1
    // ------------------------------------------------------------
    // The single source of truth for where a step is in time. Both the scheduler and
    // the geometry call it, which is what guarantees they agree.
    function NaAudio__CircularSequencer__StepFraction(state, stepIndex, beatsPerCycle) {
        const template  =  GRID_TEMPLATES[state.GridFeel] || GRID_TEMPLATES.regular;
        const base      =  template(stepIndex, state.Divisions, beatsPerCycle);
        return base + NaAudio__CircularSequencer__WobbleOffset(state, stepIndex);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Wobble Offset for One Step, as a Cycle Fraction
    // ------------------------------------------------------------
    // Wow and flutter. Seeded from the module seed and the step index, so a given step
    // always wobbles the same way - a fresh random per playback would make the pattern
    // impossible to learn, which is the opposite of groove.
    //
    // Cached per step because this is called from the scheduler AND from the geometry
    // rebuild, and the two must agree exactly or the picture stops matching the sound.
    function NaAudio__CircularSequencer__WobbleOffset(state, stepIndex) {
        if (state.WobbleDepth <= 0) return 0;

        const cached  =  state.WobbleCache[stepIndex];
        if (cached !== undefined) return cached;

        const random  =  NaAudio__SeededRandom__Create(state.Seed + stepIndex * 2654435761);

        // Two draws, and the order matters: the chance draw comes first so that raising
        // the depth does not change WHICH steps wobble, only how far. Otherwise every
        // nudge of the depth control reshuffles the groove.
        const fires   =  random.Next() < state.WobbleChance;
        const amount  =  random.Spread(1.0);

        const offset  =  fires
            ? amount * state.WobbleDepth * state.WobbleMaxOffset / state.Divisions
            : 0;

        state.WobbleCache[stepIndex]  =  offset;
        return offset;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clear the Wobble Cache
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__ClearWobbleCache(state) {
        state.WobbleCache  =  {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Playback Rate Detune a Wobbled Step Carries
    // ------------------------------------------------------------
    // A real platter that changes speed changes pitch. Without this the wobble reads as
    // a timing bug rather than as a machine, which is exactly the wrong impression.
    function NaAudio__CircularSequencer__WobbleDetune(state, stepIndex) {
        if (state.WobbleDepth <= 0) return 0;

        const offset  =  NaAudio__CircularSequencer__WobbleOffset(state, stepIndex);
        if (offset === 0) return 0;

        const normalised  =  offset * state.Divisions / Math.max(state.WobbleMaxOffset, 0.0001);
        return -normalised * state.WobblePitchCents;                          // <-- Late means slow means flat
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Layout Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Radius of a Lane
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__LaneRadius(defaults, laneIndex) {
        return defaults.RingRadius - laneIndex * defaults.LaneSpacing;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Place a Step Mesh at Its Timing Position
    // ------------------------------------------------------------
    // Angle comes from the step's TIME fraction, never from its index. That is the rule
    // the module header states, expressed in one line.
    function NaAudio__CircularSequencer__PlaceStep(state, mesh, radius, stepIndex, beatsPerCycle) {
        const fraction  =  NaAudio__CircularSequencer__StepFraction(state, stepIndex, beatsPerCycle);
        const angle     =  fraction * Math.PI * 2 + ANGLE_OFFSET;
        mesh.position.set(Math.cos(angle) * radius, STEP_HEIGHT, Math.sin(angle) * radius);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Reposition Every Step After a Timing Change
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__RepositionSteps(module) {
        const state         =  module.TypeState;
        const defaults      =  module.Defaults;
        const beatsPerCycle =  state.CycleBars * NaAudio__Transport__BeatsPerBar();

        for (let lane = 0; lane < state.LaneCount; lane++) {
            const radius  =  NaAudio__CircularSequencer__LaneRadius(defaults, lane);
            const meshes  =  state.Lanes[lane].Meshes;

            for (let step = 0; step < meshes.length; step++) {
                NaAudio__CircularSequencer__PlaceStep(state, meshes[step], radius, step, beatsPerCycle);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pattern Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Pattern Out of the Module Settings
    // ------------------------------------------------------------
    // A pattern in a space file is a string - 'x...x...x...x...' - rather than an array
    // of booleans, because it is a picture of the rhythm when the file is opened in an
    // editor and an array of sixteen true and false values is not.
    function NaAudio__CircularSequencer__PatternFromString(text, divisions) {
        const pattern  =  new Array(divisions).fill(false);
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
// REGION | Ring Geometry
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Lane Rings and Division Ticks
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__BuildRings(module, state) {
        const defaults  =  module.Defaults;

        for (let lane = 0; lane < state.LaneCount; lane++) {
            const ring  =  new THREE.Mesh(
                Shapes.NaAudio__Env3d__ShapeFactory__FlatTorus(NaAudio__CircularSequencer__LaneRadius(defaults, lane), 0.006),
                Materials.NaAudio__Materials__Line('InkGhost', 0.42)
            );
            ring.position.y  =  STEP_HEIGHT;
            module.BodyGroup.add(ring);
        }

        // Ticks on the outermost lane only. One set of radial marks makes the division
        // count legible; four concentric sets is a moire pattern.
        const outer  =  NaAudio__CircularSequencer__LaneRadius(defaults, 0);
        const ticks  =  Lines.NaAudio__Env3d__LineFactory__BuildRadialTicks(
            state.Divisions, outer + 0.05, outer + 0.15, 'InkFaint', 0.5
        );
        ticks.position.y  =  STEP_HEIGHT;
        module.BodyGroup.add(ticks);

        state.Ticks  =  ticks;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Start Point Indicator
    // ------------------------------------------------------------
    // A triangle just outside the outer ring, pointing inward at division zero.
    //
    // A circle has no inherent beginning. While the marker sweeps you can infer one, but
    // the moment the transport stops the pattern becomes an undifferentiated ring and
    // there is no way to tell which step is the downbeat - which makes editing guesswork.
    function NaAudio__CircularSequencer__BuildStartMarker(module, state) {
        const defaults  =  module.Defaults;
        if (!defaults.StartMarkerEnabled) return;

        const marker  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__UnitTriangle(),
            Materials.NaAudio__Materials__FlatMarker('InkSoft', 0.85)
        );

        const radius  =  NaAudio__CircularSequencer__LaneRadius(defaults, 0) + defaults.StartMarkerStandoff;
        marker.scale.setScalar(defaults.StartMarkerSize);
        marker.position.set(0, STEP_HEIGHT + 0.004, -radius);                  // <-- Twelve o'clock, matching ANGLE_OFFSET

        marker.rotation.x  =  -Math.PI / 2;                                    // <-- Authored in XY, laid flat on the floor
        marker.rotation.z  =  Math.PI;                                         // <-- Apex turned to point inward, at the ring

        marker.userData.NaAudio__Pickable  =  false;
        module.BodyGroup.add(marker);

        state.StartMarker  =  marker;
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
    function NaAudio__CircularSequencer__BuildMarker(module, state) {
        const defaults  =  module.Defaults;

        const pivot  =  new THREE.Group();
        pivot.position.y  =  STEP_HEIGHT + 0.012;                             // <-- Just above the rings, so it reads as passing over them

        const bar  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__Bar(defaults.MarkerWidth / defaults.MarkerLength),
            Materials.NaAudio__Materials__Line('Ink', 0.72)
        );
        bar.scale.set(defaults.MarkerLength, defaults.MarkerLength, 1);
        bar.rotation.x  =  -Math.PI / 2;
        bar.position.x  =  defaults.MarkerLength / 2;                         // <-- Pivot at one end, not the middle

        pivot.add(bar);
        module.BodyGroup.add(pivot);

        state.MarkerPivot  =  pivot;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Lane's Step Meshes
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__BuildLaneSteps(module, state, laneIndex) {
        const defaults      =  module.Defaults;
        const radius        =  NaAudio__CircularSequencer__LaneRadius(defaults, laneIndex);
        const voiceRole     =  LANE_VOICE_ROLES[laneIndex] || 'perc';
        const shapeName     =  defaults.StepShapesByLane[laneIndex % defaults.StepShapesByLane.length];
        const beatsPerCycle =  state.CycleBars * NaAudio__Transport__BeatsPerBar();

        const lane  =  state.Lanes[laneIndex];

        for (let step = 0; step < state.Divisions; step++) {
            // Each step owns its material: it pulses its own colour and carries its own
            // opacity, and a shared instance would flash all sixteen at once.
            const material  =  Materials.NaAudio__Materials__OwnedVoiceRoleBody(voiceRole, 'Base');
            material.transparent  =  true;                                     // <-- Inactive steps are ghosted, so every step needs an alpha
            material.depthWrite   =  true;

            const mesh  =  new THREE.Mesh(Shapes.NaAudio__Env3d__ShapeFactory__UnitSolid(shapeName), material);
            mesh.castShadow  =  true;

            NaAudio__CircularSequencer__PlaceStep(state, mesh, radius, step, beatsPerCycle);
            ModuleBase.NaAudio__ModuleBase__RegisterFadeMaterial(module, material);

            // A step is a click target, and a Click handle rather than a drag one so it
            // can never be nudged. Play mode only - in Build mode the whole ring becomes
            // invisible to the picker, which is the point of the modes.
            const unregister  =  NaAudio__Env3d__Interaction__Register(mesh, {
                Kind       : NaAudio__Env3d__HandleKind.Click,
                ModuleId   : module.ModuleId,
                Cursor     : 'pointer',
                ClickModes : [NaAudio__Mode.Play],
                DragModes  : [NaAudio__Mode.Play],
                Data       : { Lane: laneIndex, Step: step },

                OnClick : function (handle) {
                    NaAudio__CircularSequencer__ToggleStep(module, handle.Data.Lane, handle.Data.Step);
                },
                OnHover : function (isHovered, handle) {
                    state.Lanes[handle.Data.Lane].Meshes[handle.Data.Step].userData.NaAudio__Hovered  =  isHovered;
                }
            });

            module.Unregisters.push(unregister);

            lane.Meshes.push(mesh);
            lane.PulseAmount.push(0);
            lane.Velocity.push(1.0);                                           // <-- Reserved; see the velocity note below
            module.BodyGroup.add(mesh);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Step Appearance
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Set a Step's Resting Size and Opacity
    // ------------------------------------------------------------
    // Two signals, because one is not enough. Size survives being seen at a shallow
    // angle from across the space; opacity survives being seen from anywhere at all.
    // Together an active step is unmistakable and an inactive one recedes.
    //
    // VELOCITY: the size already multiplies through lane.Velocity, and every step
    // carries 1.0. The scaling path is therefore finished - what is missing is only the
    // interaction that changes the number. A vertical drag on a step is the obvious
    // candidate, and it needs the drag threshold tuned so it cannot be mistaken for the
    // toggle click that shares the same object.
    function NaAudio__CircularSequencer__ApplyStepAppearance(module, laneIndex, stepIndex) {
        const state     =  module.TypeState;
        const defaults  =  module.Defaults;
        const lane      =  state.Lanes[laneIndex];
        const mesh      =  lane.Meshes[stepIndex];
        if (!mesh) return;

        const isActive  =  lane.Pattern[stepIndex];
        const velocity  =  lane.Velocity[stepIndex];

        const velocityScale  =  defaults.StepVelocitySizeMin
                              + (defaults.StepVelocitySizeMax - defaults.StepVelocitySizeMin) * velocity;

        const size  =  isActive
            ? defaults.StepBaseSize * defaults.StepActiveSizeFactor * velocityScale
            : defaults.StepBaseSize;

        mesh.userData.NaAudio__RestingScale  =  size;
        mesh.scale.setScalar(size);

        ModuleBase.NaAudio__ModuleBase__SetMaterialOpacity(
            module, mesh.material,
            isActive ? defaults.StepActiveOpacity : defaults.StepInactiveOpacity
        );
    }
    // ------------------------------------------------------------


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


    // SUB FUNCTION | Reapply Every Step's Appearance
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__RefreshAllSteps(module) {
        const state  =  module.TypeState;
        for (let lane = 0; lane < state.LaneCount; lane++) {
            for (let step = 0; step < state.Divisions; step++) {
                NaAudio__CircularSequencer__ApplyStepAppearance(module, lane, step);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Expansion and the Control Bank
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Corner Expand Button
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__BuildExpandButton(module, state) {
        const defaults  =  module.Defaults;
        if (!defaults.ExpandButtonEnabled) return;

        const button  =  Controls.NaAudio__Env3d__ControlFactory__BuildButton({
            Label       : 'Expand',
            Pigment     : 'Terracotta',
            Width       : defaults.ExpandButtonSize,
            Depth       : defaults.ExpandButtonSize,
            ModuleId    : module.ModuleId,
            Unregisters : module.Unregisters,
            OnPress     : function () { NaAudio__CircularSequencer__ToggleExpanded(module); }
        });

        // Front-right corner of the collapsed base, inset so it reads as belonging to
        // the plate rather than floating off its edge.
        const halfWidth  =  module.CageSize.x / 2 - defaults.ExpandButtonInset;
        const halfDepth  =  module.CageSize.z / 2 - defaults.ExpandButtonInset;
        button.Group.position.set(halfWidth, 0.06, halfDepth);

        module.BodyGroup.add(button.Group);
        state.ExpandButton  =  button;
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle the Module Between Compact and Expanded
    // ------------------------------------------------------------
    // Widens the module's base along X and reveals the control bank in the new half.
    // The controls are built once at construction and only shown or hidden here -
    // rebuilding them would drop their values and re-register six interaction handles
    // on every press.
    export function NaAudio__CircularSequencer__ToggleExpanded(module) {
        const state     =  module.TypeState;
        const defaults  =  module.Defaults;

        state.IsExpanded  =  !state.IsExpanded;
        module.Settings.IsExpanded  =  state.IsExpanded;

        const factor  =  state.IsExpanded ? defaults.ExpandedWidthFactor : 1.0;
        ModuleBase.NaAudio__ModuleBase__SetBaseWidthFactor(module, factor);

        if (state.ControlBank) state.ControlBank.visible  =  state.IsExpanded;

        // The ring stays put and the base grows to one side, so the controls appear
        // beside the sequencer rather than the sequencer jumping across its own pad.
        NaAudio__CircularSequencer__PositionControlBank(module);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place the Control Bank in the Expanded Half
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__PositionControlBank(module) {
        const state     =  module.TypeState;
        const defaults  =  module.Defaults;
        if (!state.ControlBank) return;

        const originalWidth  =  module.BaseWidth || module.CageSize.x;
        state.ControlBank.position.set(originalWidth * 0.5 + defaults.ControlBankInset, 0.06, 0);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Five Controls
    // ------------------------------------------------------------
    function NaAudio__CircularSequencer__BuildControlBank(module, state) {
        const defaults  =  module.Defaults;
        if (!defaults.ControlBankEnabled) return;

        const bank  =  new THREE.Group();
        bank.name   =  'NaAudio__Sequencer__ControlBank';
        bank.visible =  state.IsExpanded;

        const spacing  =  defaults.ControlSliderSpacing;
        const length   =  defaults.ControlSliderLength;

        // SUB HELPER | Add one control at the next slot along the bank
        // ------------------------------------------------------------
        let slot  =  0;
        const place  =  function (build) {
            const control  =  build(slot);
            control.Group.position.set(0, 0, (slot - 2) * spacing);            // <-- Five slots centred on the bank
            bank.add(control.Group);
            slot += 1;
            return control;
        };
        // ------------------------------------------------------------

        state.CycleSlider  =  place((slotIndex) => Controls.NaAudio__Env3d__ControlFactory__BuildSlider({
            SlotIndex    : slotIndex,
            Label        : 'Cycle',
            Length       : length,
            Pigment      : 'SlateBlue',
            Detents      : defaults.CycleDetents,
            DetentIndex  : state.CycleIndex,
            ModuleId     : module.ModuleId,
            Unregisters  : module.Unregisters,
            OnChange     : function (value, detent, index) {
                state.CycleBars   =  value;
                state.CycleIndex  =  index;
                module.Settings.CycleIndex  =  index;
                NaAudio__CircularSequencer__RepositionSteps(module);
            }
        }));

        state.GridSlider  =  place((slotIndex) => Controls.NaAudio__Env3d__ControlFactory__BuildSlider({
            SlotIndex    : slotIndex,
            Label        : 'Feel',
            Length       : length,
            Pigment      : 'SageGreen',
            Detents      : defaults.GridDetents,
            DetentIndex  : state.GridIndex,
            ModuleId     : module.ModuleId,
            Unregisters  : module.Unregisters,
            OnChange     : function (value, detent, index) {
                state.GridFeel   =  value;
                state.GridIndex  =  index;
                module.Settings.GridIndex  =  index;
                NaAudio__CircularSequencer__RepositionSteps(module);
            }
        }));

        state.WobbleDepthSlider  =  place((slotIndex) => Controls.NaAudio__Env3d__ControlFactory__BuildSlider({
            SlotIndex    : slotIndex,
            Label        : 'Wobble',
            Length       : length,
            Pigment      : 'Plum',
            Value        : state.WobbleDepth,
            ModuleId     : module.ModuleId,
            Unregisters  : module.Unregisters,
            OnChange     : function (value) {
                state.WobbleDepth  =  value;
                NaAudio__CircularSequencer__ClearWobbleCache(state);
                module.Settings.WobbleDepth  =  value;
                NaAudio__CircularSequencer__RepositionSteps(module);
            }
        }));

        state.WobbleChanceSlider  =  place((slotIndex) => Controls.NaAudio__Env3d__ControlFactory__BuildSlider({
            SlotIndex    : slotIndex,
            Label        : 'Chance',
            Length       : length,
            Pigment      : 'MillennialPink',
            Value        : state.WobbleChance,
            ModuleId     : module.ModuleId,
            Unregisters  : module.Unregisters,
            OnChange     : function (value) {
                state.WobbleChance  =  value;
                NaAudio__CircularSequencer__ClearWobbleCache(state);
                module.Settings.WobbleChance  =  value;
                NaAudio__CircularSequencer__RepositionSteps(module);
            }
        }));

        state.KitSelector  =  place((slotIndex) => Controls.NaAudio__Env3d__ControlFactory__BuildSlider({
            SlotIndex    : slotIndex,
            Label        : 'Bank',
            Length       : length,
            Pigment      : 'Ochre',
            Detents      : defaults.KitDetents,
            DetentIndex  : state.KitIndex,
            ModuleId     : module.ModuleId,
            Unregisters  : module.Unregisters,
            OnChange     : function (value, detent, index) {
                state.KitIndex  =  index;
                module.Settings.KitId  =  value;
                NaAudio__CircularSequencer__BindKit(module, state, value);
            }
        }));

        module.BodyGroup.add(bank);
        state.ControlBank  =  bank;

        NaAudio__CircularSequencer__PositionControlBank(module);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sample Binding
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Bind Each Lane to a Sample From the Chosen Kit
    // ------------------------------------------------------------
    // A lane binds to a ROLE and the kit answers with whatever fills it, which is what
    // lets the whole kit be swapped under a pattern without a lane losing its binding.
    function NaAudio__CircularSequencer__BindKit(module, state, kitId) {
        state.KitId  =  kitId || module.Settings.KitId || 'KIT_Cr78';

        const assetIds  =  [];

        for (let lane = 0; lane < state.LaneCount; lane++) {
            const voiceRole  =  LANE_VOICE_ROLES[lane] || 'perc';
            const entry      =  SampleBank.NaAudio__SampleBank__KitVoice(state.KitId, voiceRole);

            state.Lanes[lane].VoiceRole  =  voiceRole;
            state.Lanes[lane].AssetId    =  entry ? entry.AssetId : null;

            if (entry) assetIds.push(entry.AssetId);
        }

        // Decoded ahead of the first play. The scheduler cannot await anything, so a
        // sample that has not decoded by the time its step comes round is simply silent -
        // which presents as a pattern with holes in it for the first bar.
        SampleBank.NaAudio__SampleBank__LoadMany(assetIds);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Type Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | The Circular Sequencer Type Implementation
    // ------------------------------------------------------------
    export const NaAudio__Module__CircularSequencer  =  {

        // BUILD | Construct the sequencer, its controls and its kit binding
        // ------------------------------------------------------------
        Build : function (module) {
            const defaults  =  module.Defaults;

            const divisions  =  Math.round(NaAudio__MusicalMaths__Clamp(
                module.Settings.Divisions || defaults.Divisions,
                defaults.DivisionsMin, defaults.DivisionsMax
            ));

            const laneCount   =  Math.min(module.Settings.LaneCount || defaults.LaneCount, LANE_VOICE_ROLES.length);
            const cycleIndex  =  (module.Settings.CycleIndex === undefined) ? defaults.CycleDefaultIndex : module.Settings.CycleIndex;
            const gridIndex   =  (module.Settings.GridIndex  === undefined) ? defaults.GridDefaultIndex  : module.Settings.GridIndex;
            const kitIndex    =  (module.Settings.KitIndex   === undefined) ? defaults.KitDefaultIndex   : module.Settings.KitIndex;

            const state  =  {
                Divisions     : divisions,
                LaneCount     : laneCount,
                Lanes         : [],

                CycleIndex    : cycleIndex,
                CycleBars     : defaults.CycleDetents[cycleIndex].Value,
                GridIndex     : gridIndex,
                GridFeel      : defaults.GridDetents[gridIndex].Value,
                KitIndex      : kitIndex,
                KitId         : null,

                WobbleDepth     : (module.Settings.WobbleDepth  === undefined) ? defaults.WobbleDepthDefault  : module.Settings.WobbleDepth,
                WobbleChance    : (module.Settings.WobbleChance === undefined) ? defaults.WobbleChanceDefault : module.Settings.WobbleChance,
                WobbleMaxOffset : defaults.WobbleMaxOffsetFraction,
                WobblePitchCents: defaults.WobblePitchCents,
                WobbleCache     : {},
                Seed            : module.Settings.Seed || 8821,

                IsExpanded    : module.Settings.IsExpanded === true,
                ControlBank   : null,
                ExpandButton  : null,

                MarkerPivot   : null,
                Hub           : null,
                Ticks         : null,
                StartMarker   : null,

                LastStepFired : -1,
                Gain          : (module.Settings.Gain === undefined) ? 0.85 : module.Settings.Gain
            };

            const patternStrings  =  module.Settings.Patterns || [];

            for (let lane = 0; lane < laneCount; lane++) {
                state.Lanes.push({
                    VoiceRole   : LANE_VOICE_ROLES[lane] || 'perc',
                    AssetId     : null,
                    Pattern     : NaAudio__CircularSequencer__PatternFromString(patternStrings[lane], divisions),
                    Meshes      : [],
                    PulseAmount : [],
                    Velocity    : []
                });
            }

            module.TypeState  =  state;

            NaAudio__CircularSequencer__BuildRings(module, state);
            NaAudio__CircularSequencer__BuildStartMarker(module, state);
            NaAudio__CircularSequencer__BuildHub(module, state);
            NaAudio__CircularSequencer__BuildMarker(module, state);

            for (let lane = 0; lane < laneCount; lane++) {
                NaAudio__CircularSequencer__BuildLaneSteps(module, state, lane);
            }
            NaAudio__CircularSequencer__RefreshAllSteps(module);

            NaAudio__CircularSequencer__BuildExpandButton(module, state);
            NaAudio__CircularSequencer__BuildControlBank(module, state);

            NaAudio__CircularSequencer__BindKit(module, state, defaults.KitDetents[kitIndex].Value);

            if (state.IsExpanded) {
                ModuleBase.NaAudio__ModuleBase__SetBaseWidthFactor(module, defaults.ExpandedWidthFactor);
                NaAudio__CircularSequencer__PositionControlBank(module);
            }
        },
        // ------------------------------------------------------------


        // SCHEDULE | Fire the steps falling inside one lookahead window
        // ------------------------------------------------------------
        // Worked in absolute cycle indices rather than in bars, so the arithmetic stays
        // a single floor operation and stays correct across a cycle boundary whatever
        // the cycle length happens to be.
        Schedule : function (module, window) {
            const state  =  module.TypeState;
            if (!state) return;

            const beatsPerCycle  =  state.CycleBars * window.BeatsPerBar;
            const firstCycle     =  Math.floor(window.FromBeat / beatsPerCycle);
            const lastCycle      =  Math.floor(window.ToBeat   / beatsPerCycle);

            for (let cycle = firstCycle; cycle <= lastCycle; cycle++) {
                if (cycle < 0) continue;

                for (let step = 0; step < state.Divisions; step++) {
                    // The SAME fraction the geometry used to place this step. One
                    // function, two consumers - which is what makes the picture true.
                    const fraction  =  NaAudio__CircularSequencer__StepFraction(state, step, beatsPerCycle);
                    const beat      =  (cycle + fraction) * beatsPerCycle;

                    if (beat < window.FromBeat || beat >= window.ToBeat) continue;

                    const detune  =  NaAudio__CircularSequencer__WobbleDetune(state, step);

                    for (let lane = 0; lane < state.LaneCount; lane++) {
                        const laneState  =  state.Lanes[lane];
                        if (!laneState.Pattern[step] || !laneState.AssetId) continue;

                        const buffer  =  SampleBank.NaAudio__SampleBank__Buffer(laneState.AssetId);
                        if (!buffer) continue;                                 // <-- Not decoded yet; silent this pass, never blocking

                        SamplePlayer.NaAudio__SamplePlayer__Play(buffer, {
                            AtTime      : window.AudioTimeAtBeat(beat),
                            Destination : module.Bus.Output,
                            Gain        : state.Gain * laneState.Velocity[step],
                            DetuneCents : detune
                        });
                    }
                }
            }
        },
        // ------------------------------------------------------------


        // UPDATE | Sweep the marker, decay the pulses, spring the button
        // ------------------------------------------------------------
        Update : function (module, delta) {
            const state     =  module.TypeState;
            const defaults  =  module.Defaults;
            if (!state) return;

            if (state.ExpandButton) state.ExpandButton.Update(delta);

            // THE MARKER
            // Driven from the transport's CURRENT playhead, never from the scheduler.
            if (NaAudio__Transport__IsRunning()) {
                const beatsPerCycle  =  state.CycleBars * NaAudio__Transport__BeatsPerBar();
                const cyclePosition  =  (NaAudio__Transport__PlayheadBeats() / beatsPerCycle) % 1;
                state.MarkerPivot.rotation.y  =  -cyclePosition * Math.PI * 2;

                // Pulse whichever step the marker has just crossed. Compared against its
                // TIMING fraction rather than its index, so a swung or wobbled step
                // flashes when it actually sounds rather than when an even grid would
                // have put it.
                for (let step = 0; step < state.Divisions; step++) {
                    const fraction  =  NaAudio__CircularSequencer__StepFraction(state, step, beatsPerCycle);
                    const crossed   =  state.LastCyclePosition !== undefined
                        && NaAudio__CircularSequencer__HasCrossed(state.LastCyclePosition, cyclePosition, fraction);

                    if (!crossed) continue;

                    for (let lane = 0; lane < state.LaneCount; lane++) {
                        if (state.Lanes[lane].Pattern[step]) state.Lanes[lane].PulseAmount[step]  =  1.0;
                    }
                }
                state.LastCyclePosition  =  cyclePosition;
            }

            // THE PULSE DECAY
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

                    // A hovered inactive step lifts out of its ghost so the user can see
                    // what they are about to switch on.
                    if (!laneState.Pattern[step]) {
                        ModuleBase.NaAudio__ModuleBase__SetMaterialOpacity(
                            module, mesh.material,
                            hover ? Math.min(defaults.StepInactiveOpacity + 0.35, 1) : defaults.StepInactiveOpacity
                        );
                    }

                    if (pulse > 0) laneState.PulseAmount[step]  =  Math.max(pulse - decayRate, 0);
                }
            }
        },
        // ------------------------------------------------------------


        // ON LOCK CHANGED | Nothing to silence beyond the framework's bus ramp
        // ------------------------------------------------------------
        OnLockChanged : function (module, isLocked) {
            const state  =  module.TypeState;
            if (state && isLocked) {
                state.LastStepFired       =  -1;
                state.LastCyclePosition   =  undefined;                        // <-- So unlocking does not pulse the whole ring at once
            }
        },
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

                case 'wobbleDepth':
                    state.WobbleDepth  =  NaAudio__MusicalMaths__Clamp(value, 0, 1);
                    NaAudio__CircularSequencer__ClearWobbleCache(state);
                    if (state.WobbleDepthSlider) state.WobbleDepthSlider.SetFraction(state.WobbleDepth, false);
                    NaAudio__CircularSequencer__RepositionSteps(module);
                    break;

                case 'wobbleChance':
                    state.WobbleChance  =  NaAudio__MusicalMaths__Clamp(value, 0, 1);
                    NaAudio__CircularSequencer__ClearWobbleCache(state);
                    if (state.WobbleChanceSlider) state.WobbleChanceSlider.SetFraction(state.WobbleChance, false);
                    NaAudio__CircularSequencer__RepositionSteps(module);
                    break;

                default:
                    break;                                                     // <-- Unknown parameters are ignored, not thrown
            }
        },
        // ------------------------------------------------------------


        // DISPOSE | Nothing beyond what the framework owns
        // ------------------------------------------------------------
        Dispose : function (module) {
            module.TypeState  =  null;
        }
        // ------------------------------------------------------------
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether the Playhead Crossed a Fraction This Frame
    // ------------------------------------------------------------
    // Handles the wrap at the end of a cycle, where the position goes from 0.98 back to
    // 0.01 and a naive comparison would miss every step near the top of the circle.
    function NaAudio__CircularSequencer__HasCrossed(previous, current, target) {
        if (current >= previous) return target > previous && target <= current;
        return target > previous || target <= current;                         // <-- Wrapped past zero
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
