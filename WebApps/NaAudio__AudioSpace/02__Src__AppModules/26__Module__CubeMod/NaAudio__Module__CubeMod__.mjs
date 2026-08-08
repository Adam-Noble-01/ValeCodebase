/* =============================================================================
   NAAUDIO - SPATIAL MODULE | CUBE MOD
   =============================================================================

   FILE       : NaAudio__Module__CubeMod__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Module - CubeMod
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Six XY pads on the faces of a rotatable cube - twelve dimensions
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - The manifest's CubeMod, built as specified: parameters mapped to the six faces of
     a rotatable cube instead of a flat XY pad, each face an independent pad, rotating
     the cube to bring a different pair of parameters to hand.
   - Underneath it is a NaAudio__Engine__SynthVoice, so the twelve axes drive something
     genuinely audible rather than moving numbers around.

   ---------------------------------------------------------------------------

   WHY A CUBE RATHER THAN SIX SLIDERS

   The manifest's stated frustration is controlling a complex synth through only two
   inputs. The obvious answer - more XY pads - runs out of screen and out of attention.

   A cube gets six pads into the volume of one, and it gets something a bank of pads
   cannot: the parameters are RELATED BY POSITION. Filter is the front face and drive is
   the bottom face, always, and after a few sessions a hand goes to a parameter by
   rotating in a remembered direction rather than by reading a label. That is the
   method-of-loci recall the manifest is built on, applied at the scale of a single
   device instead of a whole project.

   ---------------------------------------------------------------------------

   THE ROTATION ALWAYS SNAPS SQUARE

   A cube left resting at an arbitrary angle has no usable front face - every pad is
   foreshortened and the drag axes no longer line up with the screen. So a rotation
   drag always settles to the nearest ninety degrees, eased rather than snapped, and
   the face that ends up front is the one being edited.

   ---------------------------------------------------------------------------

   WHY THE PUCK IS ON THE FACE AND NOT IN A PANEL

   Each face carries a small puck showing where that pad currently sits. It is the only
   readout, and it is deliberately ON the control rather than in a HUD panel beside it.
   A value that lives somewhere other than the thing it belongs to forces the eye to
   travel, and in a 3D space the panel would be in screen space while the control is in
   world space - so they would never quite agree about which face was which.

   ============================================================================= */

import * as THREE from 'three';

import * as Palette          from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Materials        from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__MaterialLibrary__.mjs';
import * as Shapes           from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__ShapeFactory__.mjs';
import {
    NaAudio__Env3d__Interaction__Register,
    NaAudio__Env3d__HandleKind
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';
import * as ModuleBase       from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleBase__.mjs';
import * as SynthVoice       from '../10__Audio__WebAudioEngine/NaAudio__Engine__SynthVoice__.mjs';
import {
    NaAudio__MusicalMaths__Clamp,
    NaAudio__MusicalMaths__NoteNameToMidi,
    NaAudio__MusicalMaths__ScaleDegreeToMidi
} from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';

// =============================================================================
// REGION | Cube Mod
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Type Name and Face Geometry
    // ------------------------------------------------------------
    export const NaAudio__CubeMod__TypeName  =  'CubeMod';

    const HALF_PI_C  =  Math.PI / 2;                                          // <-- Declared before FACE_FRAMES, which uses it

    // Face name to its outward normal, the two local axes a drag on it maps to, and the
    // Euler rotation that turns a PlaneGeometry to face outward along that normal.
    //
    // The rotation is spelled out rather than solved with Object3D.lookAt, and that is
    // not a style preference. lookAt takes a WORLD-space target: the plates are children
    // of a cube group nested inside a module positioned metres away from the origin, so
    // aiming each plate at 'its own normal' aimed all six of them at a point near the
    // scene origin instead. Every face ended up misoriented and the cube rendered as a
    // plain bone box with no pads visible on it at all.
    //
    // AxisX and AxisY are the drag directions, chosen so that on every face dragging
    // right increases X and dragging up increases Y for somebody looking at that face.
    const FACE_FRAMES  =  {
        front  : { Normal: new THREE.Vector3( 0,  0,  1), AxisX: new THREE.Vector3( 1, 0, 0), AxisY: new THREE.Vector3(0,  1,  0), Rotation: new THREE.Euler(          0,          0, 0) },
        back   : { Normal: new THREE.Vector3( 0,  0, -1), AxisX: new THREE.Vector3(-1, 0, 0), AxisY: new THREE.Vector3(0,  1,  0), Rotation: new THREE.Euler(          0,   Math.PI, 0) },
        right  : { Normal: new THREE.Vector3( 1,  0,  0), AxisX: new THREE.Vector3( 0, 0,-1), AxisY: new THREE.Vector3(0,  1,  0), Rotation: new THREE.Euler(          0,  HALF_PI_C, 0) },
        left   : { Normal: new THREE.Vector3(-1,  0,  0), AxisX: new THREE.Vector3( 0, 0, 1), AxisY: new THREE.Vector3(0,  1,  0), Rotation: new THREE.Euler(          0, -HALF_PI_C, 0) },
        top    : { Normal: new THREE.Vector3( 0,  1,  0), AxisX: new THREE.Vector3( 1, 0, 0), AxisY: new THREE.Vector3(0,  0, -1), Rotation: new THREE.Euler(-HALF_PI_C,          0, 0) },
        bottom : { Normal: new THREE.Vector3( 0, -1,  0), AxisX: new THREE.Vector3( 1, 0, 0), AxisY: new THREE.Vector3(0,  0,  1), Rotation: new THREE.Euler( HALF_PI_C,          0, 0) }
    };

    const FACE_PIGMENTS  =  {
        front  : 'MillennialPink',
        right  : 'SageGreen',
        back   : 'SlateBlue',
        left   : 'Ochre',
        top    : 'ClayOrange',
        bottom : 'Plum'
    };

    const SCRATCH_LOCAL      =  new THREE.Vector3();
    const SCRATCH_QUATERNION =  new THREE.Quaternion();
    const SCRATCH_COLOUR  =  new THREE.Color();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Face Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build One Face Plate and Its Puck
    // ------------------------------------------------------------
    // The plate is a flat square standing just off the cube body. It exists separately
    // from the cube mesh for two reasons: it can be pigmented per face, and it gives the
    // raycaster a single unambiguous object per face rather than requiring a face-index
    // lookup into a shared box geometry.
    function NaAudio__CubeMod__BuildFace(module, state, faceName, mapping) {
        const defaults  =  module.Defaults;
        const frame     =  FACE_FRAMES[faceName];
        const size      =  defaults.CubeSize;
        const standoff  =  size / 2 + defaults.FaceInset;

        const plate  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__UnitSquare(),
            Materials.NaAudio__Materials__OwnedBody(FACE_PIGMENTS[faceName], 'Base')
        );
        plate.scale.setScalar(size * 0.94);
        plate.position.copy(frame.Normal).multiplyScalar(standoff);
        plate.rotation.copy(frame.Rotation);                                   // <-- Local rotation, not a world-space lookAt
        plate.castShadow  =  false;

        ModuleBase.NaAudio__ModuleBase__RegisterFadeMaterial(module, plate.material);

        // THE PUCK
        // Parented to the plate, so it inherits the plate's orientation and only ever
        // needs a 2D position written into it. Working out its world position from the
        // cube's rotation on every drag would be the same maths done the hard way.
        const puck  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__UnitCircle(),
            Materials.NaAudio__Materials__OwnedBody(FACE_PIGMENTS[faceName], 'Deep')
        );
        puck.scale.setScalar(defaults.PuckRadius * 2);
        puck.position.z  =  0.008;                                            // <-- Just off the plate; coplanar would z-fight
        plate.add(puck);

        ModuleBase.NaAudio__ModuleBase__RegisterFadeMaterial(module, puck.material);

        const faceState  =  {
            Name    : faceName,
            Plate   : plate,
            Puck    : puck,
            Frame   : frame,
            AxisX   : mapping.AxisX,
            AxisY   : mapping.AxisY,
            Label   : mapping.Label,
            ValueX  : 0.5,
            ValueY  : 0.5
        };

        NaAudio__CubeMod__RegisterFaceHandle(module, state, faceState);

        state.Faces.push(faceState);
        state.CubeGroup.add(plate);

        return faceState;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Register a Face as a Draggable XY Pad
    // ------------------------------------------------------------
    // DragSurface, so the interaction module builds its drag plane from the face that
    // was actually hit. That is what makes the drag track the pointer correctly whatever
    // angle the cube is currently at - projecting onto a fixed plane would make the pad
    // feel slippery as soon as the cube was rotated even slightly.
    function NaAudio__CubeMod__RegisterFaceHandle(module, state, faceState) {
        const unregister  =  NaAudio__Env3d__Interaction__Register(faceState.Plate, {
            Kind     : NaAudio__Env3d__HandleKind.DragSurface,
            ModuleId : module.ModuleId,
            Cursor   : 'crosshair',
            Data     : faceState,

            OnDragStart : function () {
                state.ActiveFace       =  faceState;
                faceState.DragStartX   =  faceState.ValueX;                    // <-- The drag is measured from where the puck already was
                faceState.DragStartY   =  faceState.ValueY;
            },

            OnDrag : function (context) {
                NaAudio__CubeMod__DragFace(module, state, faceState, context.Total);
            },

            OnDragEnd : function () {
                state.ActiveFace  =  null;
                NaAudio__CubeMod__SnapRotation(state);                         // <-- Settle square after any interaction
            },

            OnClick : function () {
                NaAudio__CubeMod__TurnToFace(state, faceState);
            }
        });

        module.Unregisters.push(unregister);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Cube Body
    // ------------------------------------------------------------
    function NaAudio__CubeMod__BuildCube(module, state) {
        const defaults  =  module.Defaults;

        const body  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__UnitBox(),
            Materials.NaAudio__Materials__OwnedBody('Bone', 'Base')
        );
        body.scale.setScalar(defaults.CubeSize);
        body.castShadow     =  true;
        body.receiveShadow  =  true;

        ModuleBase.NaAudio__ModuleBase__RegisterFadeMaterial(module, body.material);
        state.CubeGroup.add(body);

        state.Body  =  body;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dragging and Rotation
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Apply a Drag on a Face to Its Two Parameters
    // ------------------------------------------------------------
    // The drag arrives as a world-space DIRECTION along the face's own plane, measured
    // from where the pointer first grabbed. It is rotated into the cube's local frame by
    // the inverse of the cube's world orientation, then split along the face's two axes.
    //
    // Rotating rather than calling worldToLocal is the correct operation and not a
    // micro-optimisation: worldToLocal transforms a POINT, so it would apply the cube's
    // translation to a vector that has no origin, and the pad would jump by the module's
    // distance from the scene origin the moment it was touched.
    function NaAudio__CubeMod__DragFace(module, state, faceState, worldTotal) {
        const defaults  =  module.Defaults;
        const span      =  defaults.CubeSize;                                 // <-- A full face width of travel spans the whole 0 to 1 range

        state.CubeGroup.getWorldQuaternion(SCRATCH_QUATERNION);
        SCRATCH_QUATERNION.invert();

        SCRATCH_LOCAL.copy(worldTotal).applyQuaternion(SCRATCH_QUATERNION);

        const deltaX  =  SCRATCH_LOCAL.dot(faceState.Frame.AxisX) / span;
        const deltaY  =  SCRATCH_LOCAL.dot(faceState.Frame.AxisY) / span;

        const nextX  =  NaAudio__MusicalMaths__Clamp((faceState.DragStartX || 0) + deltaX, 0, 1);
        const nextY  =  NaAudio__MusicalMaths__Clamp((faceState.DragStartY || 0) + deltaY, 0, 1);

        NaAudio__CubeMod__SetFaceValues(module, faceState, nextX, nextY);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Face's Two Values and Push Them to the Synth
    // ------------------------------------------------------------
    export function NaAudio__CubeMod__SetFaceValues(module, faceState, valueX, valueY) {
        faceState.ValueX  =  NaAudio__MusicalMaths__Clamp(valueX, 0, 1);
        faceState.ValueY  =  NaAudio__MusicalMaths__Clamp(valueY, 0, 1);

        const halfExtent  =  module.Defaults.CubeSize * 0.40;                  // <-- Puck travel, inset from the plate edge
        faceState.Puck.position.x  =  (faceState.ValueX - 0.5) * halfExtent * 2;
        faceState.Puck.position.y  =  (faceState.ValueY - 0.5) * halfExtent * 2;

        const voice  =  module.TypeState.Voice;
        if (voice) {
            SynthVoice.NaAudio__SynthVoice__SetParameter(voice, faceState.AxisX, faceState.ValueX);
            SynthVoice.NaAudio__SynthVoice__SetParameter(voice, faceState.AxisY, faceState.ValueY);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Turn the Cube to Bring a Face to the Front
    // ------------------------------------------------------------
    // Clicking a face without dragging turns it toward the viewer. This is the cheap
    // version of the manifest's 'rotating the cube provides access to different sets of
    // controls' - the user does not have to orbit the camera to reach the back.
    function NaAudio__CubeMod__TurnToFace(state, faceState) {
        const normal  =  faceState.Frame.Normal;

        // Only the yaw is solved. Pitching the cube to bring the top or bottom face
        // forward would leave the four side faces at unusable angles, so those two are
        // reached by orbiting the camera instead.
        if (Math.abs(normal.y) > 0.5) return;

        state.TargetYaw  =  Math.atan2(-normal.x, -normal.z);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Settle the Cube's Rotation to the Nearest Quarter Turn
    // ------------------------------------------------------------
    function NaAudio__CubeMod__SnapRotation(state) {
        state.TargetYaw  =  Math.round(state.CubeGroup.rotation.y / HALF_PI_C) * HALF_PI_C;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Type Implementation
// -----------------------------------------------------------------------------

    // FUNCTION | The CubeMod Type Implementation
    // ------------------------------------------------------------
    export const NaAudio__Module__CubeMod  =  {

        // BUILD | Construct the cube, its faces and its synth voice
        // ------------------------------------------------------------
        Build : function (module) {
            const defaults  =  module.Defaults;

            const cubeGroup  =  new THREE.Group();
            cubeGroup.position.y  =  defaults.CubeCentreHeight;

            const state  =  {
                CubeGroup   : cubeGroup,
                Body        : null,
                Faces       : [],
                ActiveFace  : null,
                TargetYaw   : 0,
                Voice       : null,
                NoteDegree  : 0,
                RootMidi    : NaAudio__MusicalMaths__NoteNameToMidi(module.Settings.RootNote || 'C2') || 36,
                ScaleName   : module.Settings.Scale || 'pentatonicMinor',
                PulseAmount : 0
            };

            module.TypeState  =  state;
            module.BodyGroup.add(cubeGroup);

            NaAudio__CubeMod__BuildCube(module, state);

            const faceMap  =  defaults.FaceParameterMap;
            for (let i = 0; i < faceMap.length; i++) {
                NaAudio__CubeMod__BuildFace(module, state, faceMap[i].Face, faceMap[i]);
            }

            // THE SYNTH
            // Built after the faces so the initial face values can be pushed straight
            // into it, which means the cube's visible puck positions and the sound agree
            // from the first frame rather than after the first drag.
            state.Voice  =  SynthVoice.NaAudio__SynthVoice__Create(module.Bus.Output);
            SynthVoice.NaAudio__SynthVoice__SetNote(state.Voice, state.RootMidi);

            const initial  =  module.Settings.FaceValues || {};
            for (let i = 0; i < state.Faces.length; i++) {
                const faceState  =  state.Faces[i];
                const saved      =  initial[faceState.Name];

                NaAudio__CubeMod__SetFaceValues(
                    module, faceState,
                    saved ? saved.x : SynthVoice.NaAudio__SynthVoice__Parameter(state.Voice, faceState.AxisX),
                    saved ? saved.y : SynthVoice.NaAudio__SynthVoice__Parameter(state.Voice, faceState.AxisY)
                );
            }
        },
        // ------------------------------------------------------------


        // SCHEDULE | Play a note on every beat, walking up the scale
        // ------------------------------------------------------------
        // A CubeMod is a controller, not a sequencer, but a controller with nothing to
        // control is silent and therefore impossible to evaluate. So it plays a simple
        // walking figure of its own, which the twelve axes then shape - and shaping a
        // continuously sounding note is precisely the demonstration this module exists
        // to give.
        Schedule : function (module, window) {
            const state  =  module.TypeState;
            if (!state || !state.Voice) return;
            if (module.Settings.SelfPlay === false) return;

            const firstBeat  =  Math.ceil(window.FromBeat - 0.000001);
            const lastBeat   =  Math.floor(window.ToBeat - 0.000001);

            for (let beat = firstBeat; beat <= lastBeat; beat++) {
                if (beat < 0) continue;

                const degree  =  Math.floor(beat) % 8;
                const midi    =  NaAudio__MusicalMaths__ScaleDegreeToMidi(degree, state.RootMidi, state.ScaleName);

                SynthVoice.NaAudio__SynthVoice__SetNote(state.Voice, midi);
                SynthVoice.NaAudio__SynthVoice__Trigger(
                    state.Voice, window.AudioTimeAtBeat(beat), 0.65, window.SecondsPerBeat * 0.6
                );

                state.PulseAmount  =  1.0;                                     // <-- Read by Update to flash the cube body
            }
        },
        // ------------------------------------------------------------


        // UPDATE | Ease the rotation toward its target and decay the pulse
        // ------------------------------------------------------------
        Update : function (module, delta) {
            const state     =  module.TypeState;
            const defaults  =  module.Defaults;
            if (!state) return;

            // ROTATION EASE
            // While a face is being dragged the cube is held still. Letting it continue
            // rotating under the pointer would move the pad out from under the hand
            // mid-drag, which feels like the control fighting back.
            if (!state.ActiveFace) {
                const rate      =  NaAudio__MusicalMaths__Clamp(delta / Math.max(defaults.RotationSnapSeconds, 0.0001), 0, 1);
                const current   =  state.CubeGroup.rotation.y;
                let   difference =  state.TargetYaw - current;

                // Take the short way round. Without this, snapping from just under a full
                // turn back to zero spins the cube the long way through three quarters of
                // a revolution.
                while (difference >  Math.PI) difference -= Math.PI * 2;
                while (difference < -Math.PI) difference += Math.PI * 2;

                state.CubeGroup.rotation.y  =  current + difference * rate;
            }

            // PULSE DECAY on the cube body, so a triggered note is visible as well as
            // audible even when every face is left alone.
            if (state.PulseAmount > 0) {
                state.PulseAmount  =  Math.max(state.PulseAmount - delta * 3.2, 0);

                const base  =  state.Body.material.userData.NaAudio__BaseColour;
                if (base) {
                    Palette.NaAudio__Palette__Flash(base, state.PulseAmount * 0.42, SCRATCH_COLOUR);
                    state.Body.material.color.copy(SCRATCH_COLOUR);
                }

                const swell  =  1 + state.PulseAmount * 0.045;
                state.Body.scale.setScalar(defaults.CubeSize * swell);
            }
        },
        // ------------------------------------------------------------


        // ON LOCK CHANGED | Silence the continuously running voice
        // ------------------------------------------------------------
        // Unlike the sequencer this module DOES hold a sustained voice, and its
        // oscillators run continuously. The framework's bus ramp mutes its output, but
        // the envelope has to be closed too or the voice sits at its sustain level
        // waiting to be heard the moment the module unlocks.
        OnLockChanged : function (module, isLocked) {
            const state  =  module.TypeState;
            if (!state || !state.Voice) return;

            if (isLocked) SynthVoice.NaAudio__SynthVoice__Silence(state.Voice, 0.12);
        },
        // ------------------------------------------------------------


        // SET PARAMETER | Named writes from a cable or the HUD
        // ------------------------------------------------------------
        // Any synth parameter name is addressable directly, so a modulation cable can
        // drive a CubeMod axis without knowing which face it happens to live on. The
        // matching face puck is moved to follow, because a parameter that changes with no
        // visible cause is exactly the opacity this whole application exists to remove.
        SetParameter : function (module, parameterName, value) {
            const state  =  module.TypeState;
            if (!state || !state.Voice) return;

            SynthVoice.NaAudio__SynthVoice__SetParameter(state.Voice, parameterName, value);

            for (let i = 0; i < state.Faces.length; i++) {
                const faceState  =  state.Faces[i];

                if (faceState.AxisX === parameterName) {
                    NaAudio__CubeMod__SetFaceValues(module, faceState, value, faceState.ValueY);
                } else if (faceState.AxisY === parameterName) {
                    NaAudio__CubeMod__SetFaceValues(module, faceState, faceState.ValueX, value);
                }
            }
        },
        // ------------------------------------------------------------


        // AUDIO INPUT | CubeMod is a source, not a processor
        // ------------------------------------------------------------
        // Deliberately absent. See the equivalent note in the circular sequencer.
        // ------------------------------------------------------------


        // DISPOSE | Tear down the synth voice
        // ------------------------------------------------------------
        // The voice holds running oscillators, which are NOT in the scene graph and are
        // therefore invisible to the scene manager's group clear. Without this they keep
        // running, silently, for the lifetime of the page.
        Dispose : function (module) {
            const state  =  module.TypeState;
            if (state && state.Voice) SynthVoice.NaAudio__SynthVoice__Destroy(state.Voice);
            module.TypeState  =  null;
        }
        // ------------------------------------------------------------
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
