/* =============================================================================
   NAAUDIO - SPATIAL MODULE | DELAY CLOUD
   =============================================================================

   FILE       : NaAudio__Module__DelayCloud__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Module - DelayCloud
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : An enclosure whose dimensions ARE the delay and reverb parameters
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - The manifest's DelayCloud: a 3D box the user resizes by hand, with sample spheres
     bouncing inside it, where the box dimensions control the effect.
   - Length sets reverb decay, width sets delay time, height sets the damping filter -
     exactly the mapping the manifest specifies, declared in
     Na__SpatialModules__Config.json rather than written into this file.
   - It is also the only demonstration module that PROCESSES audio rather than
     generating it, so it is the receiving end of the patch graph.

   ---------------------------------------------------------------------------

   THE SHAPE YOU SEE IS THE SHAPE YOU HEAR

   This is the module that most directly answers the manifest's complaint about soulless
   DAW interfaces. A conventional delay is three numbered knobs whose relationship to
   each other is invisible. Here the three numbers are the three dimensions of a box the
   user grabs by its corner handles.

   That gives something the knobs cannot: the parameters are visible SIMULTANEOUSLY and
   in proportion. A long thin space is legible at a glance as a long slow decay with fast
   repeats, without reading a single value.

   ---------------------------------------------------------------------------

   THE SPHERES ARE THE VISUALISATION, AND ALSO A TRIGGER SOURCE

   Spheres fall under a gentle gravity and bounce off the walls. They are not decoration:
   each bounce is a discrete audible tap, so the rhythm of the bouncing IS the rhythm of
   the delay taps, and a taller box audibly slows both together.

   Gravity is set well below the real value in config. Earth-rate falling inside a 1.5
   metre box produces a bounce rate far too fast to hear as separate events, which would
   turn the whole effect into a buzz.

   BounceTapMinInterval guards the other end: a sphere that loses energy and settles into
   a corner would otherwise machine-gun taps at frame rate.

   ---------------------------------------------------------------------------

   WHY THE PHYSICS IS EULER AND NOT ANYTHING BETTER

   Positions integrate with plain semi-implicit Euler at frame rate. That is not accurate
   physics and it does not need to be - five spheres in a box, where the goal is
   pleasing motion and audible bounce timing rather than simulation fidelity.

   The frame delta IS clamped upstream by the scene manager, which matters here more than
   anywhere else in the application: an unclamped multi-second delta after a backgrounded
   tab would move every sphere straight through a wall and lose them.

   ============================================================================= */

import * as THREE from 'three';

import * as Palette          from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Materials        from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__MaterialLibrary__.mjs';
import * as Shapes           from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__ShapeFactory__.mjs';
import {
    NaAudio__Env3d__Interaction__Register,
    NaAudio__Env3d__HandleKind
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';
import { NaAudio__Mode }     from '../01__AppCore/NaAudio__AppCore__ModeManager__.mjs';
import * as ModuleBase       from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleBase__.mjs';
import * as EffectRack       from '../10__Audio__WebAudioEngine/NaAudio__Engine__EffectRack__.mjs';
import * as SampleBank       from '../15__Audio__SampleLibraryLoader/NaAudio__Library__SampleBank__.mjs';
import * as SamplePlayer     from '../10__Audio__WebAudioEngine/NaAudio__Engine__SamplePlayer__.mjs';
import * as AudioHost        from '../10__Audio__WebAudioEngine/NaAudio__Engine__AudioHost__.mjs';
import { NaAudio__SeededRandom__Create }  from '../03__AppUtils/NaAudio__AppUtils__SeededRandom__.mjs';
import { NaAudio__MusicalMaths__Clamp }   from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';

// =============================================================================
// REGION | Delay Cloud
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Type Name and Sphere Palette
    // ------------------------------------------------------------
    export const NaAudio__DelayCloud__TypeName  =  'DelayCloud';

    const SPHERE_PIGMENTS  =  ['MillennialPink', 'ClayOrange', 'SageGreen', 'SlateBlue', 'Ochre'];

    const HANDLE_AXES  =  {
        x : new THREE.Vector3(1, 0, 0),
        y : new THREE.Vector3(0, 1, 0),
        z : new THREE.Vector3(0, 0, 1)
    };

    const SCRATCH_COLOUR  =  new THREE.Color();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Enclosure Geometry
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Translucent Enclosure and Its Edge Lines
    // ------------------------------------------------------------
    // Both are built at unit size and SCALED, never rebuilt. Resizing is a drag, so a
    // geometry rebuild would run on every frame of it - and the edge extraction in
    // particular is not cheap.
    function NaAudio__DelayCloud__BuildEnclosure(module, state) {
        const walls  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__UnitBox(),
            Materials.NaAudio__Materials__Glass('SlateBlue')
        );
        walls.renderOrder  =  2;                                              // <-- Transparent, so it must draw after the spheres inside it
        state.Group.add(walls);

        const edgeSource  =  new THREE.BoxGeometry(1, 1, 1);
        const edges       =  new THREE.LineSegments(
            new THREE.EdgesGeometry(edgeSource),
            Materials.NaAudio__Materials__Line('InkSoft', 0.55)
        );
        edgeSource.dispose();
        state.Group.add(edges);

        state.Walls  =  walls;
        state.Edges  =  edges;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Three Axis Resize Handles
    // ------------------------------------------------------------
    // One handle per axis rather than eight corner handles. A corner drag changes two
    // dimensions at once, which makes it impossible to hear what a single parameter is
    // doing - and hearing exactly that is the entire purpose of this module.
    function NaAudio__DelayCloud__BuildHandles(module, state) {
        const defaults  =  module.Defaults;

        for (const axis of defaults.HandleAxes) {
            const handle  =  new THREE.Mesh(
                Shapes.NaAudio__Env3d__ShapeFactory__UnitOctahedron(),
                Materials.NaAudio__Materials__OwnedBody('Terracotta', 'Base')
            );
            handle.scale.setScalar(defaults.HandleSize);
            handle.castShadow  =  true;

            ModuleBase.NaAudio__ModuleBase__RegisterFadeMaterial(module, handle.material);
            state.Group.add(handle);
            state.Handles[axis]  =  handle;

            const unregister  =  NaAudio__Env3d__Interaction__Register(handle, {
                Kind     : NaAudio__Env3d__HandleKind.DragAxis,
                ModuleId : module.ModuleId,
                Axis     : HANDLE_AXES[axis],
                Cursor   : 'ew-resize',
                Data     : { Axis: axis },

                // Play-mode only, like every other control. Resizing the box IS setting
                // the effect, so it is emphatically not a layout operation.
                ClickModes : [NaAudio__Mode.Play],
                DragModes  : [NaAudio__Mode.Play],

                OnDragStart : function (context) {
                    state.DragStartSize  =  state.BoxSize.clone();
                    state.ActiveAxis     =  context.Data.Axis;
                },

                OnDrag : function (context) {
                    // Total travel along the axis, doubled: the handle sits on one face
                    // and the box grows from its centre, so a handle moved by one unit
                    // has to widen the box by two.
                    const travel  =  context.Total.dot(HANDLE_AXES[context.Data.Axis]) * 2;

                    const next  =  state.DragStartSize.clone();
                    next[context.Data.Axis] += travel;

                    NaAudio__DelayCloud__SetBoxSize(module, state, next);
                },

                OnDragEnd : function () {
                    state.ActiveAxis  =  null;
                }
            });

            module.Unregisters.push(unregister);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Enclosure Size and Push It Into the Effects
    // ------------------------------------------------------------
    // The single place where the box shape becomes audio parameters. The mapping is read
    // from the DimensionMap in config, so it can be re-tuned - or a fourth dimension
    // added - without editing this file.
    export function NaAudio__DelayCloud__SetBoxSize(module, state, size) {
        const defaults  =  module.Defaults;
        const minimum   =  defaults.BoxSizeMin;
        const maximum   =  defaults.BoxSizeMax;

        state.BoxSize.set(
            NaAudio__MusicalMaths__Clamp(size.x, minimum.x, maximum.x),
            NaAudio__MusicalMaths__Clamp(size.y, minimum.y, maximum.y),
            NaAudio__MusicalMaths__Clamp(size.z, minimum.z, maximum.z)
        );

        state.Walls.scale.copy(state.BoxSize);
        state.Edges.scale.copy(state.BoxSize);

        // Handles sit on the positive face of their own axis, so they visibly travel with
        // the wall they are moving.
        const half  =  state.BoxSize.clone().multiplyScalar(0.5);
        if (state.Handles.x) state.Handles.x.position.set(half.x, 0, 0);
        if (state.Handles.y) state.Handles.y.position.set(0, half.y, 0);
        if (state.Handles.z) state.Handles.z.position.set(0, 0, half.z);

        NaAudio__DelayCloud__ApplyDimensionsToAudio(module, state);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Translate Box Dimensions Into Effect Parameters
    // ------------------------------------------------------------
    function NaAudio__DelayCloud__ApplyDimensionsToAudio(module, state) {
        const defaults  =  module.Defaults;
        const minimum   =  defaults.BoxSizeMin;
        const maximum   =  defaults.BoxSizeMax;

        for (const entry of defaults.DimensionMap) {
            const axis        =  entry.Axis;
            const span        =  Math.max(maximum[axis] - minimum[axis], 0.0001);
            const normalised  =  NaAudio__MusicalMaths__Clamp((state.BoxSize[axis] - minimum[axis]) / span, 0, 1);

            state.Parameters[entry.Parameter]  =  normalised;

            switch (entry.Parameter) {
                case 'reverbDecay':
                    // Box length selects the room, not a decay knob - a convolution
                    // reverb's decay IS its impulse response. Longer box, larger room.
                    NaAudio__DelayCloud__SelectImpulseForSize(state, normalised);
                    if (state.Reverb) EffectRack.NaAudio__EffectRack__SetReverbWet(state.Reverb, 0.18 + normalised * 0.5);
                    break;

                case 'delayTime':
                    if (state.Delay) EffectRack.NaAudio__EffectRack__SetDelayTime(state.Delay, normalised);
                    break;

                case 'damping':
                    if (state.Delay) EffectRack.NaAudio__EffectRack__SetDelayDamping(state.Delay, normalised);
                    break;

                default:
                    break;
            }
        }
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Choose the Impulse Response Matching the Box Size
    // ------------------------------------------------------------
    // Stepped rather than continuous, because impulse responses are discrete files. The
    // guard against re-selecting the same one matters: swapping a convolver's buffer cuts
    // its current tail dead, so doing it on every frame of a drag would produce a
    // stuttering rasp instead of a room growing.
    function NaAudio__DelayCloud__SelectImpulseForSize(state, normalised) {
        if (!state.Reverb || state.ImpulseIds.length === 0) return;

        const index  =  Math.min(
            Math.floor(normalised * state.ImpulseIds.length),
            state.ImpulseIds.length - 1
        );

        if (index === state.CurrentImpulseIndex) return;

        const buffer  =  SampleBank.NaAudio__SampleBank__Buffer(state.ImpulseIds[index]);
        if (!buffer) return;                                                  // <-- Not decoded yet; keep the current room

        EffectRack.NaAudio__EffectRack__SetReverbImpulse(state.Reverb, buffer);
        state.CurrentImpulseIndex  =  index;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Spheres
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Bouncing Spheres
    // ------------------------------------------------------------
    // Start positions and velocities come from a SEEDED random stream, so a saved space
    // reopens with the spheres arranged as they were rather than scattered afresh.
    function NaAudio__DelayCloud__BuildSpheres(module, state) {
        const defaults  =  module.Defaults;
        const random    =  NaAudio__SeededRandom__Create(state.Seed);

        for (let i = 0; i < defaults.SphereCount; i++) {
            const pigment  =  SPHERE_PIGMENTS[i % SPHERE_PIGMENTS.length];

            const mesh  =  new THREE.Mesh(
                Shapes.NaAudio__Env3d__ShapeFactory__UnitSphere(),
                Materials.NaAudio__Materials__OwnedBody(pigment, 'Base')
            );
            mesh.scale.setScalar(defaults.SphereRadius * 2);
            mesh.castShadow  =  true;
            mesh.renderOrder =  1;                                            // <-- Before the transparent walls

            ModuleBase.NaAudio__ModuleBase__RegisterFadeMaterial(module, mesh.material);
            state.Group.add(mesh);

            const speed  =  defaults.SphereSpeedInitial;

            state.Spheres.push({
                Mesh        : mesh,
                Position    : new THREE.Vector3(random.Spread(0.4), random.Range(0.0, 0.5), random.Spread(0.4)),
                Velocity    : new THREE.Vector3(random.Spread(speed), random.Spread(speed * 0.4), random.Spread(speed)),
                LastTapAt   : 0,
                Pulse       : 0,
                AssetId     : null,
                Pigment     : pigment
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Integrate One Sphere and Report Whether It Bounced
    // ------------------------------------------------------------
    // Semi-implicit Euler: velocity first, then position. Slightly more stable than the
    // explicit form for the same cost, which is the only reason to prefer it here.
    function NaAudio__DelayCloud__StepSphere(module, state, sphere, delta) {
        const defaults     =  module.Defaults;
        const radius       =  defaults.SphereRadius;
        const restitution  =  defaults.SphereRestitution;

        sphere.Velocity.y += defaults.SphereGravity * delta;
        sphere.Position.addScaledVector(sphere.Velocity, delta);

        let bounced  =  false;

        for (const axis of ['x', 'y', 'z']) {
            const limit  =  state.BoxSize[axis] / 2 - radius;

            if (sphere.Position[axis] >  limit) {
                sphere.Position[axis]  =  limit;
                sphere.Velocity[axis]  =  -sphere.Velocity[axis] * restitution;
                bounced  =  true;
            } else if (sphere.Position[axis] < -limit) {
                sphere.Position[axis]  =  -limit;
                sphere.Velocity[axis]  =  -sphere.Velocity[axis] * restitution;
                bounced  =  true;
            }
        }

        // A sphere that has lost nearly all its energy is nudged back up rather than
        // being allowed to settle. Without this, every sphere ends up resting on the
        // floor within a minute and the module goes visually and audibly dead - and
        // restoring energy is the honest choice for something whose job is to be a
        // perpetual visualisation rather than a simulation.
        if (Math.abs(sphere.Velocity.y) < 0.18 && sphere.Position.y < -state.BoxSize.y / 2 + radius * 2.2) {
            sphere.Velocity.y  =  defaults.SphereSpeedInitial * 0.85;
        }

        sphere.Mesh.position.copy(sphere.Position);
        return bounced;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fire a Tap on a Bounce
    // ------------------------------------------------------------
    // Played at 'now' rather than at a scheduled beat, because a bounce is a physical
    // event that has just happened on screen - quantising it would break the link between
    // what is seen and what is heard, which is the whole point of the module.
    function NaAudio__DelayCloud__Tap(module, state, sphere) {
        const defaults  =  module.Defaults;
        if (!defaults.BounceTriggersTap) return;

        const now  =  AudioHost.NaAudio__AudioHost__Now();
        if (now - sphere.LastTapAt < defaults.BounceTapMinInterval) return;    // <-- Guards a sphere settled in a corner
        sphere.LastTapAt  =  now;

        const buffer  =  sphere.AssetId ? SampleBank.NaAudio__SampleBank__Buffer(sphere.AssetId) : null;
        if (!buffer) return;

        // Pan follows the sphere's actual position in the box, so a bounce off the left
        // wall is heard on the left. Gain follows impact speed, so a fast bounce is
        // louder - which is what makes the visual and the audio read as one event.
        const pan     =  NaAudio__MusicalMaths__Clamp(sphere.Position.x / Math.max(state.BoxSize.x / 2, 0.0001), -1, 1);
        const impact  =  NaAudio__MusicalMaths__Clamp(sphere.Velocity.length() / 3.0, 0.12, 1.0);

        SamplePlayer.NaAudio__SamplePlayer__Play(buffer, {
            AtTime      : now,
            Destination : state.InputGain,                                     // <-- Into the effect chain, not straight to the bus
            Gain        : impact * 0.55,
            Pan         : pan
        });

        sphere.Pulse  =  1.0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Type Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | The DelayCloud Type Implementation
    // ------------------------------------------------------------
    export const NaAudio__Module__DelayCloud  =  {

        // BUILD | Construct the enclosure, the spheres and the effect chain
        // ------------------------------------------------------------
        Build : function (module) {
            const defaults  =  module.Defaults;

            const group  =  new THREE.Group();
            group.position.y  =  defaults.BoxCentreHeight;

            const state  =  {
                Group              : group,
                Walls              : null,
                Edges              : null,
                Handles            : {},
                Spheres            : [],
                BoxSize            : new THREE.Vector3(defaults.BoxSize.x, defaults.BoxSize.y, defaults.BoxSize.z),
                DragStartSize      : null,
                ActiveAxis         : null,
                Seed               : module.Settings.Seed || 4471,
                Parameters         : {},

                InputGain          : null,
                Delay              : null,
                Reverb             : null,
                ImpulseIds         : [],
                CurrentImpulseIndex: -1
            };

            module.TypeState  =  state;
            module.BodyGroup.add(group);

            NaAudio__DelayCloud__BuildEnclosure(module, state);
            NaAudio__DelayCloud__BuildHandles(module, state);
            NaAudio__DelayCloud__BuildSpheres(module, state);

            // THE EFFECT CHAIN
            //     input -> delay -> reverb -> module bus
            // Delay before reverb, so the repeats are placed in the room rather than the
            // room being repeated. The other order is a legitimate effect but it is a
            // much stranger default.
            state.InputGain  =  AudioHost.NaAudio__AudioHost__CreateGain(1.0);
            state.Delay      =  EffectRack.NaAudio__EffectRack__CreateDelay();
            state.Reverb     =  EffectRack.NaAudio__EffectRack__CreateReverb(null);

            state.InputGain.connect(state.Delay.Input);
            state.Delay.Output.connect(state.Reverb.Input);
            state.Reverb.Output.connect(module.Bus.Output);

            NaAudio__DelayCloud__LoadAssets(module, state);
            NaAudio__DelayCloud__SetBoxSize(module, state, state.BoxSize);
        },
        // ------------------------------------------------------------


        // UPDATE | Integrate the spheres and decay their pulses
        // ------------------------------------------------------------
        Update : function (module, delta) {
            const state  =  module.TypeState;
            if (!state) return;

            for (let i = 0; i < state.Spheres.length; i++) {
                const sphere  =  state.Spheres[i];

                if (NaAudio__DelayCloud__StepSphere(module, state, sphere, delta)) {
                    NaAudio__DelayCloud__Tap(module, state, sphere);
                }

                if (sphere.Pulse > 0) {
                    sphere.Pulse  =  Math.max(sphere.Pulse - delta * 4.0, 0);

                    const base  =  sphere.Mesh.material.userData.NaAudio__BaseColour;
                    if (base) {
                        Palette.NaAudio__Palette__Flash(base, sphere.Pulse * 0.6, SCRATCH_COLOUR);
                        sphere.Mesh.material.color.copy(SCRATCH_COLOUR);
                    }

                    sphere.Mesh.scale.setScalar(module.Defaults.SphereRadius * 2 * (1 + sphere.Pulse * 0.45));
                }
            }
        },
        // ------------------------------------------------------------


        // AUDIO INPUT | Where a patch cable arriving here connects
        // ------------------------------------------------------------
        // The presence of this function is what makes DelayCloud a valid cable
        // destination - NaAudio__PatchGraph__Connect looks for exactly this and warns
        // when it is absent. Returning the pre-effect gain rather than the module bus is
        // the important part: connecting to the bus would route incoming audio straight
        // past the delay and the reverb, and the cable would appear to do nothing.
        AudioInput : function (module) {
            const state  =  module.TypeState;
            return state ? state.InputGain : null;
        },
        // ------------------------------------------------------------


        // ON LOCK CHANGED | Kill the feedback tail on lock
        // ------------------------------------------------------------
        // The framework's bus ramp mutes the OUTPUT, but a delay's feedback loop keeps
        // circulating behind it. Unlocking would then release whatever had been going
        // round in there all along, which is startling. The wet mix is pulled down so the
        // loop drains instead.
        OnLockChanged : function (module, isLocked) {
            const state  =  module.TypeState;
            if (!state || !state.Delay) return;

            if (isLocked) {
                EffectRack.NaAudio__EffectRack__SetDelayWet(state.Delay, 0);
            } else {
                EffectRack.NaAudio__EffectRack__SetDelayWet(state.Delay, 0.5);
            }
        },
        // ------------------------------------------------------------


        // SET PARAMETER | Named writes from a cable or the HUD
        // ------------------------------------------------------------
        // Writing a dimension parameter resizes the BOX, not just the effect. A
        // modulation cable driving delayTime visibly widens the enclosure, so the picture
        // never disagrees with the sound.
        SetParameter : function (module, parameterName, value) {
            const state  =  module.TypeState;
            if (!state) return;

            const defaults  =  module.Defaults;
            const entry     =  defaults.DimensionMap.find((candidate) => candidate.Parameter === parameterName);

            if (entry) {
                const minimum  =  defaults.BoxSizeMin[entry.Axis];
                const maximum  =  defaults.BoxSizeMax[entry.Axis];

                const next  =  state.BoxSize.clone();
                next[entry.Axis]  =  minimum + (maximum - minimum) * NaAudio__MusicalMaths__Clamp(value, 0, 1);

                NaAudio__DelayCloud__SetBoxSize(module, state, next);
                return;
            }

            if (parameterName === 'feedback' && state.Delay) {
                EffectRack.NaAudio__EffectRack__SetDelayFeedback(state.Delay, value);
            }
        },
        // ------------------------------------------------------------


        // DISPOSE | Break the feedback loops
        // ------------------------------------------------------------
        // Effect units are Web Audio nodes and are invisible to the scene manager's group
        // clear. A delay left connected in a feedback loop keeps circulating after the
        // module is gone, unreachable and unsilenceable.
        Dispose : function (module) {
            const state  =  module.TypeState;
            if (!state) return;

            if (state.Delay)  EffectRack.NaAudio__EffectRack__Destroy(state.Delay);
            if (state.Reverb) EffectRack.NaAudio__EffectRack__Destroy(state.Reverb);
            if (state.InputGain) { try { state.InputGain.disconnect(); } catch (error) { /* already gone */ } }

            module.TypeState  =  null;
        }
        // ------------------------------------------------------------
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Asset Loading
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Load the Bounce Samples and the Impulse Response Set
    // ------------------------------------------------------------
    // Asynchronous and fire-and-forget. Build must not await - it is called during the
    // scene construction pass - so the module builds silent and starts making sound as
    // its assets arrive. That is a better failure mode than a blank space while audio
    // downloads.
    function NaAudio__DelayCloud__LoadAssets(module, state) {
        const declaredSamples  =  module.Settings.BounceAssetIds || [];

        // Falls back to whatever percussive material the catalogue actually holds, so the
        // demo space still sounds even if the shipped bank is swapped out.
        const fallback  =  SampleBank.NaAudio__SampleBank__CategorySamples('60__Fx__ObjectHits')
                                     .slice(0, state.Spheres.length)
                                     .map((entry) => entry.AssetId);

        const assetIds  =  declaredSamples.length > 0 ? declaredSamples : fallback;

        for (let i = 0; i < state.Spheres.length; i++) {
            state.Spheres[i].AssetId  =  assetIds[i % Math.max(assetIds.length, 1)] || null;
        }

        SampleBank.NaAudio__SampleBank__LoadMany(assetIds);

        // The impulse response set, ordered small room to large, so box length maps
        // monotonically onto perceived room size.
        state.ImpulseIds  =  SampleBank.NaAudio__SampleBank__ImpulseResponses()
                                       .filter((entry) => entry.CategoryId === '10__Ir__Rooms')
                                       .map((entry) => entry.AssetId);

        SampleBank.NaAudio__SampleBank__LoadMany(state.ImpulseIds).then(function () {
            state.CurrentImpulseIndex  =  -1;                                  // <-- Force a reselect now the buffers exist
            NaAudio__DelayCloud__ApplyDimensionsToAudio(module, state);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
