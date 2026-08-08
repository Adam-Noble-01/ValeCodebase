/* =============================================================================
   NAAUDIO - HUD OVERLAY | TRANSPORT BAR
   =============================================================================

   FILE       : NaAudio__Hud__TransportBar__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Hud - TransportBar
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Play, stop, tempo, camera views and the master meter
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - The one piece of flat 2D interface in an application that is otherwise entirely
     spatial, and it is kept deliberately small.
   - Also owns the keyboard bindings, because a transport is the thing a producer
     operates without looking.

   ---------------------------------------------------------------------------

   WHY A 2D BAR AT ALL, IN A 3D DAW

   The manifest's whole argument is against flat nested interface, so a floating panel
   needs justifying. The line drawn here: anything belonging to a MODULE is in the space,
   on the module. Anything belonging to the SESSION - is it playing, how fast, where am I
   looking - is on this bar.

   Session state is not spatial. Putting a play button somewhere in the world means the
   user has to find it, and 'where did I leave the transport' is not an interesting
   spatial memory problem, it is just an obstacle. It also has to be reachable while the
   camera is anywhere, which by definition means screen space.

   ---------------------------------------------------------------------------

   THE KEYBOARD IS THE REAL INTERFACE

   The manifest names hotkey-driven navigation as what professional use will need. The
   bar exists so a first-time user can find everything; the shortcuts exist so a
   returning user never touches it.

   Space toggles the transport. 1 to 4 fly to the preset views. F frames the selection.
   L locks it. Every one of them is listed on the bar and in the help overlay, because a
   shortcut nobody is told about does not exist.

   ============================================================================= */

import * as Transport   from '../10__Audio__WebAudioEngine/NaAudio__Engine__Transport__.mjs';
import * as AudioHost   from '../10__Audio__WebAudioEngine/NaAudio__Engine__AudioHost__.mjs';
import * as SamplePlayer from '../10__Audio__WebAudioEngine/NaAudio__Engine__SamplePlayer__.mjs';
import {
    NaAudio__Env3d__CameraRig__ApplyPreset,
    NaAudio__Env3d__CameraRig__FocusObject,
    NaAudio__Env3d__CameraRig__PresetList
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__CameraRig__.mjs';
import {
    NaAudio__ModuleRegistry__Selected
} from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleRegistry__.mjs';
import { NaAudio__LockState__Toggle }  from '../20__System__SpatialModuleFramework/NaAudio__Spatial__LockState__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Subscribe
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Transport Bar
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Element References
    // ------------------------------------------------------------
    let barElement       =  null;
    let playButton       =  null;
    let bpmInput         =  null;
    let bpmReadout       =  null;
    let positionReadout  =  null;
    let meterFill        =  null;
    let voiceReadout     =  null;

    let attachedSurface  =  null;
    let meterTimer       =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Bar Button
    // ------------------------------------------------------------
    function NaAudio__TransportBar__Button(label, title, onClick, extraClass) {
        const button  =  document.createElement('button');
        button.className    =  'NaAudio__Transport__Button' + (extraClass ? ' ' + extraClass : '');
        button.textContent  =  label;
        button.title        =  title;
        button.addEventListener('click', onClick);
        return button;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Labelled Readout
    // ------------------------------------------------------------
    function NaAudio__TransportBar__Readout(labelText, initialValue) {
        const wrapper  =  document.createElement('div');
        wrapper.className  =  'NaAudio__Transport__Readout';

        const label  =  document.createElement('span');
        label.className    =  'NaAudio__Transport__ReadoutLabel';
        label.textContent  =  labelText;

        const value  =  document.createElement('span');
        value.className    =  'NaAudio__Transport__ReadoutValue';
        value.textContent  =  initialValue;

        wrapper.appendChild(label);
        wrapper.appendChild(value);

        return { Wrapper: wrapper, Value: value };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Transport Bar
    // ------------------------------------------------------------
    export function NaAudio__TransportBar__Build(mountElement, surface) {
        attachedSurface  =  surface;

        barElement  =  document.createElement('div');
        barElement.className  =  'NaAudio__Transport';

        // TRANSPORT GROUP
        const transportGroup  =  document.createElement('div');
        transportGroup.className  =  'NaAudio__Transport__Group';

        playButton  =  NaAudio__TransportBar__Button('Play', 'Start and stop the transport  (Space)', NaAudio__TransportBar__TogglePlay, 'NaAudio__Transport__Button--primary');
        transportGroup.appendChild(playButton);
        transportGroup.appendChild(NaAudio__TransportBar__Button('Stop', 'Stop and rewind to the start', NaAudio__TransportBar__Stop));

        // TEMPO GROUP
        const tempoGroup  =  document.createElement('div');
        tempoGroup.className  =  'NaAudio__Transport__Group';

        const tempoLabel  =  document.createElement('span');
        tempoLabel.className    =  'NaAudio__Transport__ReadoutLabel';
        tempoLabel.textContent  =  'Tempo';

        bpmInput  =  document.createElement('input');
        bpmInput.type       =  'range';
        bpmInput.className  =  'NaAudio__Transport__Slider';
        bpmInput.min        =  '40';
        bpmInput.max        =  '200';
        bpmInput.step       =  '1';
        bpmInput.value      =  String(Transport.NaAudio__Transport__Bpm());
        bpmInput.title      =  'Project tempo in beats per minute';
        bpmInput.addEventListener('input', function () {
            Transport.NaAudio__Transport__SetBpm(parseInt(bpmInput.value, 10));
        });

        bpmReadout  =  document.createElement('span');
        bpmReadout.className    =  'NaAudio__Transport__ReadoutValue';
        bpmReadout.textContent  =  Transport.NaAudio__Transport__Bpm() + ' BPM';

        tempoGroup.appendChild(tempoLabel);
        tempoGroup.appendChild(bpmInput);
        tempoGroup.appendChild(bpmReadout);

        // POSITION AND VOICES
        const stateGroup  =  document.createElement('div');
        stateGroup.className  =  'NaAudio__Transport__Group';

        const position  =  NaAudio__TransportBar__Readout('Position', '1 . 1');
        positionReadout =  position.Value;
        stateGroup.appendChild(position.Wrapper);

        const voices    =  NaAudio__TransportBar__Readout('Voices', '0');
        voiceReadout    =  voices.Value;
        stateGroup.appendChild(voices.Wrapper);

        // MASTER METER
        const meterGroup  =  document.createElement('div');
        meterGroup.className  =  'NaAudio__Transport__Group';

        const meterLabel  =  document.createElement('span');
        meterLabel.className    =  'NaAudio__Transport__ReadoutLabel';
        meterLabel.textContent  =  'Master';

        const meterTrack  =  document.createElement('div');
        meterTrack.className  =  'NaAudio__Transport__Meter';

        meterFill  =  document.createElement('div');
        meterFill.className  =  'NaAudio__Transport__MeterFill';
        meterTrack.appendChild(meterFill);

        meterGroup.appendChild(meterLabel);
        meterGroup.appendChild(meterTrack);

        // CAMERA GROUP
        const cameraGroup  =  document.createElement('div');
        cameraGroup.className  =  'NaAudio__Transport__Group NaAudio__Transport__Group--right';

        const presets  =  NaAudio__Env3d__CameraRig__PresetList();
        for (let i = 0; i < presets.length; i++) {
            const preset  =  presets[i];
            cameraGroup.appendChild(NaAudio__TransportBar__Button(
                preset.Label,
                'Fly to the ' + preset.Label.toLowerCase() + ' view  (' + (i + 1) + ')',
                function () { NaAudio__Env3d__CameraRig__ApplyPreset(attachedSurface, preset.Key); },
                'NaAudio__Transport__Button--quiet'
            ));
        }

        barElement.appendChild(transportGroup);
        barElement.appendChild(tempoGroup);
        barElement.appendChild(stateGroup);
        barElement.appendChild(meterGroup);
        barElement.appendChild(cameraGroup);

        mountElement.appendChild(barElement);

        NaAudio__TransportBar__SubscribeToEvents();
        NaAudio__TransportBar__BindKeyboard();
        NaAudio__TransportBar__StartMeter();

        return barElement;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Transport Control
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Toggle the Transport
    // ------------------------------------------------------------
    function NaAudio__TransportBar__TogglePlay() {
        Transport.NaAudio__Transport__Toggle();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Stop the Transport and Release Every Voice
    // ------------------------------------------------------------
    // Stopping the clock alone leaves long tails and looping beds ringing on, which reads
    // as the stop button not working. Releasing every voice is what makes stop mean stop.
    function NaAudio__TransportBar__Stop() {
        Transport.NaAudio__Transport__Stop();
        SamplePlayer.NaAudio__SamplePlayer__ReleaseAll(0.08);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Follow Transport and Tempo Events
    // ------------------------------------------------------------
    function NaAudio__TransportBar__SubscribeToEvents() {
        NaAudio__EventBus__Subscribe(NaAudio__Event.TransportStarted, function () {
            playButton.textContent  =  'Pause';
            playButton.classList.add('NaAudio__Transport__Button--active');
        });

        NaAudio__EventBus__Subscribe(NaAudio__Event.TransportStopped, function () {
            playButton.textContent  =  'Play';
            playButton.classList.remove('NaAudio__Transport__Button--active');
        });

        NaAudio__EventBus__Subscribe(NaAudio__Event.TransportTempoChanged, function (payload) {
            bpmReadout.textContent  =  payload.Bpm + ' BPM';
            if (bpmInput.value !== String(payload.Bpm)) bpmInput.value  =  String(payload.Bpm);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Metering and Position
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Drive the Meter and Position Readouts on a Timer
    // ------------------------------------------------------------
    // A timer rather than a frame hook, deliberately. These readouts change slowly, and a
    // DOM text write is a layout invalidation - doing three of them at 120Hz makes the
    // browser's layout engine a measurable cost in a scene that has real work to do.
    function NaAudio__TransportBar__StartMeter() {
        const intervalMs  =  1000 / 20;

        meterTimer  =  setInterval(function () {
            if (!AudioHost.NaAudio__AudioHost__IsUnlocked()) return;

            const level  =  AudioHost.NaAudio__AudioHost__MasterLevel();
            meterFill.style.width  =  Math.round(level * 100) + '%';

            // Turns terracotta when the limiter is actually working. Silent limiting is
            // how a mix quietly ends up squashed with nobody noticing.
            const reduction  =  AudioHost.NaAudio__AudioHost__LimiterReduction();
            meterFill.classList.toggle('NaAudio__Transport__MeterFill--limiting', reduction < -0.6);

            const position  =  Transport.NaAudio__Transport__PlayheadBarBeat();
            positionReadout.textContent  =  (Math.floor(position.Bar) + 1) + ' . ' + (Math.floor(position.Beat) + 1);

            voiceReadout.textContent  =  String(SamplePlayer.NaAudio__SamplePlayer__VoiceCount());
        }, intervalMs);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keyboard
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Bind the Keyboard Shortcuts
    // ------------------------------------------------------------
    function NaAudio__TransportBar__BindKeyboard() {
        window.addEventListener('keydown', function (event) {
            // Never steal a key from a field the user is typing into. Without this guard,
            // space in the tempo box toggles playback instead of typing.
            const target  =  event.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;

            switch (event.code) {
                case 'Space':
                    event.preventDefault();                                    // <-- Or the page scrolls as well as playing
                    NaAudio__TransportBar__TogglePlay();
                    break;

                case 'Digit1': NaAudio__TransportBar__ApplyPresetByIndex(0); break;
                case 'Digit2': NaAudio__TransportBar__ApplyPresetByIndex(1); break;
                case 'Digit3': NaAudio__TransportBar__ApplyPresetByIndex(2); break;
                case 'Digit4': NaAudio__TransportBar__ApplyPresetByIndex(3); break;

                case 'KeyF': NaAudio__TransportBar__FocusSelection();   break;
                case 'KeyL': NaAudio__TransportBar__LockSelection();    break;

                default: break;
            }
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fly to a Preset View by Index
    // ------------------------------------------------------------
    function NaAudio__TransportBar__ApplyPresetByIndex(index) {
        const presets  =  NaAudio__Env3d__CameraRig__PresetList();
        if (index >= presets.length) return;
        NaAudio__Env3d__CameraRig__ApplyPreset(attachedSurface, presets[index].Key);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Frame the Selected Module
    // ------------------------------------------------------------
    function NaAudio__TransportBar__FocusSelection() {
        const module  =  NaAudio__ModuleRegistry__Selected();
        if (!module) return;
        NaAudio__Env3d__CameraRig__FocusObject(attachedSurface, module.BodyGroup, module.ModuleId);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Toggle the Lock on the Selected Module
    // ------------------------------------------------------------
    function NaAudio__TransportBar__LockSelection() {
        const module  =  NaAudio__ModuleRegistry__Selected();
        if (!module) return;
        NaAudio__LockState__Toggle(module);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
