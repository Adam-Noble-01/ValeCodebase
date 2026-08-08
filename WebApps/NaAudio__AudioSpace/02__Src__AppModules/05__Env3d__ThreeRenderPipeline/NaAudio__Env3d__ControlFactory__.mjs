/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | CONTROL FACTORY
   =============================================================================

   FILE       : NaAudio__Env3d__ControlFactory__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - ControlFactory
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Physical controls that live in the space - sliders, selectors, buttons
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Three controls, all built from the same shape vocabulary as everything else:
       * SLIDER   - a track with a knob the user grabs and moves along it
       * SELECTOR - a slider with named detents; snaps, and reports an index
       * BUTTON   - a low plate that depresses when pressed
   - Every control is a self-contained group with a value, a change callback and its
     own teardown. A module asks for one and positions it; it does not build one.

   ---------------------------------------------------------------------------

   WHY CONTROLS ARE OBJECTS IN THE SPACE AND NOT A PANEL

   The whole argument of the application is that a parameter should live on the thing
   it belongs to. A slider drawn in a HUD panel would work, would be easier, and would
   quietly undo that - given a flat slider and a 3D one for the same parameter, people
   use the flat one, and the spatial premise dies by convenience.

   So these are real geometry standing on the module's own base, grabbed with the same
   pointer that moves everything else.

   ---------------------------------------------------------------------------

   DETENTS SNAP, BUT THE KNOB FOLLOWS THE HAND FIRST

   A detented control tracks the pointer continuously WHILE dragging and settles onto
   the nearest detent on release. Snapping during the drag makes a control feel like it
   is fighting the hand - the knob lurches between positions and never sits where the
   pointer is.

   The VALUE, though, is quantised the whole time. So the sound changes in musical
   steps as you drag past them while the knob still moves smoothly, which is the
   behaviour a hardware detented control has.

   ---------------------------------------------------------------------------

   EVERY CONTROL IS PLAY-MODE ONLY

   Controls register with DragModes and ClickModes of Play. In Build mode they are
   invisible to the picker, so they cannot be nudged while a module is being moved and
   they do not stand between the pointer and the pad behind them.

   ============================================================================= */

import * as THREE from 'three';

import * as Palette      from './NaAudio__Env3d__PaletteLibrary__.mjs';
import * as Materials    from './NaAudio__Env3d__MaterialLibrary__.mjs';
import * as Shapes       from './NaAudio__Env3d__ShapeFactory__.mjs';
import * as Labels       from './NaAudio__Env3d__Labels3d__.mjs';
import {
    NaAudio__Env3d__Interaction__Register,
    NaAudio__Env3d__HandleKind
} from './NaAudio__Env3d__Interaction__.mjs';
import { NaAudio__Env3d__SceneManager__DisposeSubtree } from './NaAudio__Env3d__SceneManager__.mjs';
import { NaAudio__Mode } from '../01__AppCore/NaAudio__AppCore__ModeManager__.mjs';
import { NaAudio__MusicalMaths__Clamp } from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';

// =============================================================================
// REGION | Control Factory
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Control Geometry
    // ------------------------------------------------------------
    // Sized so a knob is comfortably clickable at working camera distance without the
    // control bank dominating the module it belongs to.
    const TRACK_WIDTH        =  0.055;
    const TRACK_DEPTH        =  0.030;
    const KNOB_WIDTH         =  0.190;
    const KNOB_HEIGHT        =  0.100;
    const KNOB_DEPTH         =  0.150;
    const DETENT_TICK_LENGTH =  0.070;
    const DETENT_TICK_INSET  =  0.055;

    const BUTTON_HEIGHT      =  0.055;
    const BUTTON_PRESS_DROP  =  0.028;                                       // <-- How far the plate sinks while held
    const BUTTON_RETURN_RATE =  8.0;                                         // <-- Per second; how quickly it springs back

    const LABEL_SCALE        =  0.62;                                        // <-- Panel legends are far smaller than module name plates
    const LABEL_DECK_HEIGHT  =  0.012;                                       // <-- Just off the deck, so it never z-fights with the pad
    const LABEL_DECK_OFFSET  =  0.34;                                        // <-- In front of the track, where a panel legend goes

    const SLIDE_AXIS         =  new THREE.Vector3(0, 1, 0);                  // <-- Sliders run vertically in module space

    const SCRATCH_COLOUR     =  new THREE.Color();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shared Parts
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build a Slider Track
    // ------------------------------------------------------------
    function NaAudio__ControlFactory__BuildTrack(length) {
        const track  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__UnitBox(),
            Materials.NaAudio__Materials__Body('Bone', 'Deep')
        );
        track.scale.set(TRACK_WIDTH, length, TRACK_DEPTH);
        track.position.y   =  length / 2;
        track.receiveShadow =  true;
        track.userData.NaAudio__Pickable  =  false;                          // <-- The knob is the target, never the track

        return track;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Detent Tick Marks Beside a Track
    // ------------------------------------------------------------
    // Thin lines rather than meshes: a detented control needs its positions readable
    // at a glance, and eight little boxes beside every slider would be more geometry
    // than the slider itself.
    function NaAudio__ControlFactory__BuildDetentTicks(length, count) {
        if (count < 2) return null;

        const points  =  [];
        for (let i = 0; i < count; i++) {
            const y  =  (i / (count - 1)) * length;
            points.push(DETENT_TICK_INSET, y, 0);
            points.push(DETENT_TICK_INSET + DETENT_TICK_LENGTH, y, 0);
        }

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

        const ticks  =  new THREE.LineSegments(geometry, Materials.NaAudio__Materials__Line('InkFaint', 0.62));
        ticks.userData.NaAudio__Pickable  =  false;
        return ticks;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Grabbable Knob
    // ------------------------------------------------------------
    function NaAudio__ControlFactory__BuildKnob(pigmentKey) {
        const knob  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__UnitBox(),
            Materials.NaAudio__Materials__OwnedBody(pigmentKey, 'Base')
        );
        knob.scale.set(KNOB_WIDTH, KNOB_HEIGHT, KNOB_DEPTH);
        knob.castShadow  =  true;

        return knob;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Print a Panel Legend on the Deck In Front of a Control
    // ------------------------------------------------------------
    // Flat on the deck rather than floating above the knob. Floating plates were tried
    // first and do not work in a row: five camera-facing labels converge to a point as
    // the bank recedes and pile on top of each other, and staggering their heights only
    // moves the problem to a different camera angle. See the note in
    // NaAudio__Env3d__Labels3d__BuildFlat.
    function NaAudio__ControlFactory__BuildLabel(control, labelText, valueText) {
        const label  =  Labels.NaAudio__Env3d__Labels3d__BuildFlat(labelText, valueText);
        if (!label) return null;

        label.position.set(0, LABEL_DECK_HEIGHT, LABEL_DECK_OFFSET);
        label.scale.multiplyScalar(LABEL_SCALE);
        control.add(label);

        return label;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Slider and Selector
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Slider or a Detented Selector
    // ------------------------------------------------------------
    // options:
    //   Label       name shown on the plate above it
    //   Length      travel of the track, in metres
    //   Pigment     knob pigment
    //   Detents     array of { Label, Value } - omit for a continuous slider
    //   Value       initial value; a 0 to 1 fraction, or a detent index if detented
    //   ModuleId    owning module
    //   Unregisters array the caller owns; the control pushes its teardown onto it
    //   OnChange    (value, detent) => void, called as the value changes
    //
    // Returns a control object carrying its group, a SetValue and its current value.
    export function NaAudio__Env3d__ControlFactory__BuildSlider(options) {
        const length    =  options.Length || 0.9;
        const detents   =  options.Detents || null;
        const pigment   =  options.Pigment || 'ClayOrange';

        const control  =  new THREE.Group();
        control.name   =  'NaAudio__Control__' + (options.Label || 'Slider');

        control.add(NaAudio__ControlFactory__BuildTrack(length));

        if (detents) {
            const ticks  =  NaAudio__ControlFactory__BuildDetentTicks(length, detents.length);
            if (ticks) control.add(ticks);
        }

        const knob  =  NaAudio__ControlFactory__BuildKnob(pigment);
        control.add(knob);

        const state  =  {
            Group      : control,
            Knob       : knob,
            Label      : null,
            Length     : length,
            Detents    : detents,
            Fraction   : 0,                                                   // <-- 0 to 1 along the track
            Value      : 0,
            DetentIndex: 0,
            DragStart  : 0,
            OnChange   : options.OnChange || null,
            LabelText  : options.Label || ''
        };

        state.Label       =  NaAudio__ControlFactory__BuildLabel(control, state.LabelText, '');
        state.LabelScale  =  LABEL_SCALE;

        // SUB HELPER | Write a fraction into the knob, the value and the plate
        // ------------------------------------------------------------
        state.SetFraction  =  function (fraction, notify) {
            state.Fraction  =  NaAudio__MusicalMaths__Clamp(fraction, 0, 1);

            if (detents) {
                const index  =  Math.round(state.Fraction * (detents.length - 1));
                state.DetentIndex  =  NaAudio__MusicalMaths__Clamp(index, 0, detents.length - 1);
                state.Value        =  detents[state.DetentIndex].Value;
            } else {
                state.Value  =  state.Fraction;
            }

            knob.position.y  =  state.Fraction * length;

            if (state.Label) {
                const valueText  =  detents
                    ? detents[state.DetentIndex].Label
                    : Math.round(state.Fraction * 100) + '%';
                NaAudio__ControlFactory__RelabelDeck(state, valueText);
            }

            if (notify && state.OnChange) {
                state.OnChange(state.Value, detents ? detents[state.DetentIndex] : null, state.DetentIndex);
            }
        };
        // ------------------------------------------------------------

        // SUB HELPER | Jump straight to a detent by index
        // ------------------------------------------------------------
        state.SetDetentIndex  =  function (index, notify) {
            if (!detents) return;
            const clamped  =  NaAudio__MusicalMaths__Clamp(index, 0, detents.length - 1);
            state.SetFraction(clamped / (detents.length - 1), notify);
        };
        // ------------------------------------------------------------

        NaAudio__ControlFactory__RegisterSliderHandle(state, options);

        // Initial value, applied without notifying - the module has not finished
        // building yet, and a change callback firing mid-construction would reach a
        // half-built module.
        if (detents && typeof options.DetentIndex === 'number') {
            state.SetDetentIndex(options.DetentIndex, false);
        } else {
            state.SetFraction(options.Value === undefined ? 0.5 : options.Value, false);
        }

        return state;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Rewrite a Deck Legend With a New Value
    // ------------------------------------------------------------
    // The flat legend is a Mesh carrying its own plane geometry, not a Sprite, so its
    // aspect ratio is baked into that geometry and a longer value string needs a new
    // one. The old plate is disposed through the scene manager, which also releases the
    // canvas texture behind it - a control dragged across its range rewrites this on
    // every detent, and an undisposed texture per rewrite is a real leak.
    function NaAudio__ControlFactory__RelabelDeck(state, valueText) {
        const replacement  =  Labels.NaAudio__Env3d__Labels3d__BuildFlat(state.LabelText, valueText);
        if (!replacement) return;

        replacement.position.copy(state.Label.position);
        replacement.scale.multiplyScalar(state.LabelScale);

        state.Group.add(replacement);
        NaAudio__Env3d__SceneManager__DisposeSubtree(state.Label);

        state.Label  =  replacement;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Register the Knob as an Axis Drag Handle
    // ------------------------------------------------------------
    function NaAudio__ControlFactory__RegisterSliderHandle(state, options) {
        const unregister  =  NaAudio__Env3d__Interaction__Register(state.Knob, {
            Kind       : NaAudio__Env3d__HandleKind.DragAxis,
            ModuleId   : options.ModuleId || null,
            Axis       : SLIDE_AXIS,
            Cursor     : 'ns-resize',

            // Controls are Play-mode only. In Build mode they vanish from the picker
            // entirely, so they cannot be knocked while a module is being positioned.
            ClickModes : [NaAudio__Mode.Play],
            DragModes  : [NaAudio__Mode.Play],

            OnDragStart : function () {
                state.DragStart  =  state.Fraction;
                NaAudio__ControlFactory__SetKnobHighlight(state.Knob, true);
            },

            OnDrag : function (context) {
                // The drag arrives in world space along the module's up axis, which is
                // the same as the slider's own axis - modules never tilt. Dividing by
                // the track length turns metres of travel into a fraction directly.
                const travel  =  context.Total.y / state.Length;
                state.SetFraction(state.DragStart + travel, true);
            },

            OnDragEnd : function () {
                NaAudio__ControlFactory__SetKnobHighlight(state.Knob, false);

                // Settle onto the nearest detent on release. The value was already
                // quantised throughout the drag; this only tidies the knob's resting
                // position so it sits on its tick rather than between two.
                if (state.Detents) state.SetDetentIndex(state.DetentIndex, false);
            }
        });

        if (options.Unregisters) options.Unregisters.push(unregister);
        state.Unregister  =  unregister;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Lift a Knob's Colour While It Is Held
    // ------------------------------------------------------------
    function NaAudio__ControlFactory__SetKnobHighlight(knob, isHeld) {
        const base  =  knob.material.userData.NaAudio__BaseColour;
        if (!base) return;

        if (isHeld) {
            Palette.NaAudio__Palette__Flash(base, 0.45, SCRATCH_COLOUR);
            knob.material.color.copy(SCRATCH_COLOUR);
        } else {
            knob.material.color.copy(base);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Button
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Press Plate
    // ------------------------------------------------------------
    // options:
    //   Label, Pigment, Width, Depth, ModuleId, Unregisters, OnPress
    //
    // Returns a control carrying its group and an Update to be driven each frame -
    // the plate springs back on its own rather than snapping, so it needs a tick.
    export function NaAudio__Env3d__ControlFactory__BuildButton(options) {
        const width    =  options.Width  || 0.28;
        const depth    =  options.Depth  || 0.28;
        const pigment  =  options.Pigment || 'Terracotta';

        const control  =  new THREE.Group();
        control.name   =  'NaAudio__Control__Button__' + (options.Label || '');

        const plate  =  new THREE.Mesh(
            Shapes.NaAudio__Env3d__ShapeFactory__UnitCylinder(),
            Materials.NaAudio__Materials__OwnedBody(pigment, 'Base')
        );
        plate.scale.set(width, BUTTON_HEIGHT, depth);
        plate.castShadow  =  true;
        control.add(plate);

        const state  =  {
            Group    : control,
            Plate    : plate,
            Press    : 0,                                                     // <-- 1 fully depressed, decays to 0
            IsOn     : options.IsOn === true,
            OnPress  : options.OnPress || null,
            Pigment  : pigment
        };

        const unregister  =  NaAudio__Env3d__Interaction__Register(plate, {
            Kind       : NaAudio__Env3d__HandleKind.Click,
            ModuleId   : options.ModuleId || null,
            Cursor     : 'pointer',
            ClickModes : [NaAudio__Mode.Play],
            DragModes  : [NaAudio__Mode.Play],

            OnClick : function () {
                state.Press  =  1.0;
                if (state.OnPress) state.OnPress(state);
            }
        });

        if (options.Unregisters) options.Unregisters.push(unregister);
        state.Unregister  =  unregister;

        // SUB HELPER | Let the plate rise back after a press
        // ------------------------------------------------------------
        state.Update  =  function (delta) {
            if (state.Press <= 0) return;

            state.Press  =  Math.max(state.Press - delta * BUTTON_RETURN_RATE, 0);
            plate.position.y  =  -state.Press * BUTTON_PRESS_DROP;

            const base  =  plate.material.userData.NaAudio__BaseColour;
            if (base) {
                Palette.NaAudio__Palette__Flash(base, state.Press * 0.5, SCRATCH_COLOUR);
                plate.material.color.copy(SCRATCH_COLOUR);
            }
        };
        // ------------------------------------------------------------

        return state;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
