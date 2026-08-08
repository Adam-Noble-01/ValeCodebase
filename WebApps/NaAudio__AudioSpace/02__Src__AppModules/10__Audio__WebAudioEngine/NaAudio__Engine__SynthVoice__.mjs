/* =============================================================================
   NAAUDIO - AUDIO ENGINE | SYNTH VOICE
   =============================================================================

   FILE       : NaAudio__Engine__SynthVoice__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Engine - SynthVoice
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A small parameterised synth voice for the CubeMod demonstration
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Two detuned oscillators, an FM modulator, a resonant filter and an ADSR, with
     every one of those exposed as a named normalised parameter.
   - The parameter surface is the point. CubeMod maps twelve of these names onto the
     six faces of a cube, and the mapping lives in Na__SpatialModules__Config.json -
     so the controller and the sound source are connected by config, not by code.

   ---------------------------------------------------------------------------

   WHAT THIS IS NOT

   The design manifest describes four synthesis engines: ChaosEngine, Contemplation-
   Engine, FluxEngine and HarmonyEngine. This is none of them.

   It is a stand-in, and it exists for one reason: a controller demonstration needs
   something with real, audible, continuously variable parameters underneath it, or
   there is no way to tell whether the controller works. Building four engines to
   prove a cube can be dragged would have been the wrong order of work.

   The parameter NAMES are chosen to survive the eventual replacement. Everything
   downstream of this file - the cube face map in config, the patch cables, the space
   file format - addresses parameters by name and normalised value. A real ChaosEngine
   implementing the same names drops in without touching the controller.

   ---------------------------------------------------------------------------

   ALL PARAMETERS ARE NORMALISED 0 TO 1

   Every Set call takes 0 to 1 and maps it internally, exponentially where the ear
   hears exponentially - filter cutoff, FM ratio, envelope times.

   This is what makes a physical controller work. A cube face is a square with no
   units; it can only ever express a fraction of a range. Doing the mapping here also
   means the ranges live in config as real Hz and real seconds, where they can be read
   and reasoned about, rather than being buried in the controller as magic numbers.

   ============================================================================= */

import { AudioSection, AudioString }              from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import {
    NaAudio__MusicalMaths__MidiToFrequency,
    NaAudio__MusicalMaths__MapNormalised,
    NaAudio__MusicalMaths__MapNormalisedExponential,
    NaAudio__MusicalMaths__Clamp
} from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';
import * as AudioHost  from './NaAudio__Engine__AudioHost__.mjs';

// =============================================================================
// REGION | Synth Voice
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Parameter Vocabulary
    // ------------------------------------------------------------
    // These names are the contract with everything upstream. The cube face map in
    // Na__SpatialModules__Config.json uses them verbatim, and a saved space stores
    // them, so renaming one is a breaking change to the file format.
    export const NaAudio__SynthParameter  =  Object.freeze({
        FilterCutoff : 'filterCutoff',
        FilterQ      : 'filterQ',
        FmRatio      : 'fmRatio',
        FmIndex      : 'fmIndex',
        DetuneCents  : 'detuneCents',
        OscMix       : 'oscMix',
        Attack       : 'attack',
        Release      : 'release',
        DelaySend    : 'delaySend',
        ReverbSend   : 'reverbSend',
        DriveAmount  : 'driveAmount',
        OutputGain   : 'outputGain'
    });
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Parameter Smoothing
    // ------------------------------------------------------------
    const PARAM_RAMP_SECONDS  =  0.02;                                       // <-- Every parameter write is ramped over this
    const PARAM_RAMP_NOTE     =  'Dragging a cube face writes a parameter on every frame. Assigning an AudioParam value directly produces a step per frame, which on a filter cutoff is an audible zipper noise. A 20ms ramp removes it and is far too short to feel like lag.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parameter Mapping
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Map a Normalised Parameter to Its Real Value
    // ------------------------------------------------------------
    function NaAudio__SynthVoice__MapParameter(parameterName, normalised) {
        const config  =  AudioSection('SynthVoice');
        const value   =  NaAudio__MusicalMaths__Clamp(normalised, 0, 1);

        switch (parameterName) {
            case NaAudio__SynthParameter.FilterCutoff:
                return NaAudio__MusicalMaths__MapNormalisedExponential(value, config.FilterCutoffHzMin, config.FilterCutoffHzMax);

            case NaAudio__SynthParameter.FilterQ:
                return NaAudio__MusicalMaths__MapNormalised(value, config.FilterQMin, config.FilterQMax);

            case NaAudio__SynthParameter.FmRatio:
                return NaAudio__MusicalMaths__MapNormalisedExponential(value, config.FmRatioMin, config.FmRatioMax);

            case NaAudio__SynthParameter.FmIndex:
                return value * value * config.FmIndexMax;                      // <-- Squared: FM index is very sensitive at the bottom of its range

            case NaAudio__SynthParameter.DetuneCents:
                return NaAudio__MusicalMaths__MapNormalised(value, 0, config.DefaultDetuneCents * 6);

            case NaAudio__SynthParameter.Attack:
                return NaAudio__MusicalMaths__MapNormalisedExponential(value, config.EnvelopeAttackMin, config.EnvelopeAttackMax);

            case NaAudio__SynthParameter.Release:
                return NaAudio__MusicalMaths__MapNormalisedExponential(value, config.EnvelopeReleaseMin, config.EnvelopeReleaseMax);

            default:
                return value;                                                  // <-- Mixes, sends and gains are already 0 to 1
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write an AudioParam With a Short Ramp
    // ------------------------------------------------------------
    function NaAudio__SynthVoice__RampParam(audioParam, target) {
        const now  =  AudioHost.NaAudio__AudioHost__Now();
        audioParam.cancelScheduledValues(now);
        audioParam.setValueAtTime(audioParam.value, now);
        audioParam.linearRampToValueAtTime(target, now + PARAM_RAMP_SECONDS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Soft Clipping Curve for the WaveShaper
    // ------------------------------------------------------------
    // A hyperbolic tangent curve. Chosen over a hard clip because it saturates
    // progressively - at low drive it merely thickens, at high drive it distorts -
    // which is the wave folding character the design manifest asks for rather than
    // the fizzy digital crunch a hard clip gives.
    function NaAudio__SynthVoice__BuildDriveCurve(amount) {
        const resolution  =  AudioSection('EffectRack').WaveShaper.CurveResolution;
        const curve       =  new Float32Array(resolution);
        const drive       =  1 + amount * 24;                                 // <-- 1 is linear, 25 is heavily folded

        for (let i = 0; i < resolution; i++) {
            const x  =  (i / (resolution - 1)) * 2 - 1;
            curve[i]  =  Math.tanh(x * drive) / Math.tanh(drive);              // <-- Normalised so drive does not also raise the level
        }
        return curve;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Voice Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Synth Voice
    // ------------------------------------------------------------
    // The graph:
    //
    //     modulator -> modulatorGain --+
    //                                  v (frequency)
    //     oscillatorA ------------------> mixA --+
    //     oscillatorB ------------------> mixB --+--> filter -> shaper -> envelope -> output
    //
    // The oscillators run continuously and the ENVELOPE gates them. Starting and
    // stopping oscillators per note is possible but costs a node rebuild each time,
    // and this voice is monophonic and permanently attached to one controller, so a
    // continuously running core is both cheaper and simpler.
    export function NaAudio__SynthVoice__Create(destination) {
        const context  =  AudioHost.NaAudio__AudioHost__Context();
        const config   =  AudioSection('SynthVoice');

        const oscillatorA  =  context.createOscillator();
        const oscillatorB  =  context.createOscillator();
        const modulator    =  context.createOscillator();

        oscillatorA.type  =  AudioString('SynthVoice', 'DefaultWaveform');
        oscillatorB.type  =  AudioString('SynthVoice', 'DefaultWaveform');
        modulator.type    =  'sine';                                          // <-- An FM modulator is always a sine; anything else is unpredictable

        const mixA          =  context.createGain();
        const mixB          =  context.createGain();
        const modulatorGain =  context.createGain();

        mixA.gain.value          =  0.5;
        mixB.gain.value          =  0.5;
        modulatorGain.gain.value =  0;

        const filter  =  context.createBiquadFilter();
        filter.type            =  AudioString('SynthVoice', 'FilterType');
        filter.frequency.value =  config.FilterCutoffHzMax * 0.5;
        filter.Q.value         =  config.FilterQMin;

        const shaper  =  context.createWaveShaper();
        shaper.curve       =  NaAudio__SynthVoice__BuildDriveCurve(0);
        shaper.oversample  =  '2x';

        const envelope  =  context.createGain();
        envelope.gain.value  =  0;

        const output  =  context.createGain();
        output.gain.value  =  0.7;

        modulator.connect(modulatorGain);
        modulatorGain.connect(oscillatorA.frequency);                          // <-- Frequency modulation, not amplitude
        modulatorGain.connect(oscillatorB.frequency);

        oscillatorA.connect(mixA);
        oscillatorB.connect(mixB);
        mixA.connect(filter);
        mixB.connect(filter);

        filter.connect(shaper);
        shaper.connect(envelope);
        envelope.connect(output);
        output.connect(destination || AudioHost.NaAudio__AudioHost__MasterInput());

        const now  =  AudioHost.NaAudio__AudioHost__Now();
        oscillatorA.start(now);
        oscillatorB.start(now);
        modulator.start(now);

        const voice  =  {
            Nodes : { oscillatorA, oscillatorB, modulator, mixA, mixB, modulatorGain, filter, shaper, envelope, output },
            State : {
                BaseMidi   : 48,
                Parameters : {}                                               // <-- Normalised values, as last set
            },
            IsReleased : false
        };

        NaAudio__SynthVoice__SetNote(voice, 48);
        NaAudio__SynthVoice__ApplyDefaults(voice);

        return voice;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply the Configured Default Parameter Values
    // ------------------------------------------------------------
    function NaAudio__SynthVoice__ApplyDefaults(voice) {
        NaAudio__SynthVoice__SetParameter(voice, NaAudio__SynthParameter.FilterCutoff, 0.62);
        NaAudio__SynthVoice__SetParameter(voice, NaAudio__SynthParameter.FilterQ,      0.18);
        NaAudio__SynthVoice__SetParameter(voice, NaAudio__SynthParameter.FmRatio,      0.30);
        NaAudio__SynthVoice__SetParameter(voice, NaAudio__SynthParameter.FmIndex,      0.12);
        NaAudio__SynthVoice__SetParameter(voice, NaAudio__SynthParameter.DetuneCents,  0.18);
        NaAudio__SynthVoice__SetParameter(voice, NaAudio__SynthParameter.OscMix,       0.50);
        NaAudio__SynthVoice__SetParameter(voice, NaAudio__SynthParameter.Attack,       0.16);
        NaAudio__SynthVoice__SetParameter(voice, NaAudio__SynthParameter.Release,      0.34);
        NaAudio__SynthVoice__SetParameter(voice, NaAudio__SynthParameter.DriveAmount,  0.14);
        NaAudio__SynthVoice__SetParameter(voice, NaAudio__SynthParameter.OutputGain,   0.70);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parameters
// -----------------------------------------------------------------------------

    // FUNCTION | Set a Named Parameter From a Normalised Value
    // ------------------------------------------------------------
    export function NaAudio__SynthVoice__SetParameter(voice, parameterName, normalised) {
        if (!voice) return;

        const clamped  =  NaAudio__MusicalMaths__Clamp(normalised, 0, 1);
        const mapped   =  NaAudio__SynthVoice__MapParameter(parameterName, clamped);
        const nodes    =  voice.Nodes;

        voice.State.Parameters[parameterName]  =  clamped;

        switch (parameterName) {
            case NaAudio__SynthParameter.FilterCutoff:
                NaAudio__SynthVoice__RampParam(nodes.filter.frequency, mapped);
                break;

            case NaAudio__SynthParameter.FilterQ:
                NaAudio__SynthVoice__RampParam(nodes.filter.Q, mapped);
                break;

            case NaAudio__SynthParameter.FmRatio:
                NaAudio__SynthVoice__RampParam(nodes.modulator.frequency, NaAudio__MusicalMaths__MidiToFrequency(voice.State.BaseMidi) * mapped);
                break;

            case NaAudio__SynthParameter.FmIndex:
                NaAudio__SynthVoice__RampParam(nodes.modulatorGain.gain, mapped);
                break;

            case NaAudio__SynthParameter.DetuneCents:
                NaAudio__SynthVoice__RampParam(nodes.oscillatorB.detune, mapped);
                break;

            case NaAudio__SynthParameter.OscMix:
                // Equal-power crossfade rather than linear. A linear crossfade dips
                // audibly in level at the midpoint, which is exactly where a mix
                // control spends most of its life.
                NaAudio__SynthVoice__RampParam(nodes.mixA.gain, Math.cos(clamped * Math.PI / 2));
                NaAudio__SynthVoice__RampParam(nodes.mixB.gain, Math.sin(clamped * Math.PI / 2));
                break;

            case NaAudio__SynthParameter.DriveAmount:
                // A curve rebuild is a 2048-float array allocation, so it is skipped
                // unless the drive has moved meaningfully. Dragging a face would
                // otherwise rebuild it sixty times a second for inaudible changes.
                if (Math.abs((voice.State.LastDrive || 0) - clamped) > 0.01) {
                    nodes.shaper.curve      =  NaAudio__SynthVoice__BuildDriveCurve(clamped);
                    voice.State.LastDrive   =  clamped;
                }
                break;

            case NaAudio__SynthParameter.OutputGain:
                NaAudio__SynthVoice__RampParam(nodes.output.gain, mapped);
                break;

            case NaAudio__SynthParameter.Attack:
            case NaAudio__SynthParameter.Release:
            case NaAudio__SynthParameter.DelaySend:
            case NaAudio__SynthParameter.ReverbSend:
                break;                                                         // <-- Read at trigger time, or by the effect rack; nothing to write now

            default:
                console.warn('[NaAudio SynthVoice] Unknown parameter "' + parameterName + '".');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Named Parameter's Normalised Value
    // ------------------------------------------------------------
    export function NaAudio__SynthVoice__Parameter(voice, parameterName) {
        if (!voice) return 0;
        const value  =  voice.State.Parameters[parameterName];
        return (value === undefined) ? 0 : value;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Voice's Base Note
    // ------------------------------------------------------------
    export function NaAudio__SynthVoice__SetNote(voice, midiNote) {
        if (!voice) return;

        voice.State.BaseMidi  =  midiNote;
        const frequency  =  NaAudio__MusicalMaths__MidiToFrequency(midiNote);

        NaAudio__SynthVoice__RampParam(voice.Nodes.oscillatorA.frequency, frequency);
        NaAudio__SynthVoice__RampParam(voice.Nodes.oscillatorB.frequency, frequency);

        // The FM modulator tracks the carrier, so its ratio stays constant across the
        // keyboard. A fixed modulator frequency would make the timbre change character
        // completely from note to note.
        const ratio  =  NaAudio__SynthVoice__MapParameter(NaAudio__SynthParameter.FmRatio,
                        NaAudio__SynthVoice__Parameter(voice, NaAudio__SynthParameter.FmRatio));
        NaAudio__SynthVoice__RampParam(voice.Nodes.modulator.frequency, frequency * ratio);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Gating
// -----------------------------------------------------------------------------

    // FUNCTION | Trigger the Voice's Envelope at an Absolute Audio Time
    // ------------------------------------------------------------
    export function NaAudio__SynthVoice__Trigger(voice, atTime, velocity, holdSeconds) {
        if (!voice || voice.IsReleased) return;

        const config   =  AudioSection('SynthVoice');
        const now      =  AudioHost.NaAudio__AudioHost__Now();
        const startAt  =  Math.max(atTime === undefined ? now : atTime, now);

        const attack   =  NaAudio__SynthVoice__MapParameter(NaAudio__SynthParameter.Attack,  NaAudio__SynthVoice__Parameter(voice, NaAudio__SynthParameter.Attack));
        const release  =  NaAudio__SynthVoice__MapParameter(NaAudio__SynthParameter.Release, NaAudio__SynthVoice__Parameter(voice, NaAudio__SynthParameter.Release));

        const peak     =  Math.max((velocity === undefined ? 1.0 : velocity), 0.0001);
        const sustain  =  peak * config.EnvelopeSustain;
        const hold     =  (holdSeconds === undefined) ? config.EnvelopeDecay : holdSeconds;

        const gain  =  voice.Nodes.envelope.gain;

        gain.cancelScheduledValues(startAt);
        gain.setValueAtTime(Math.max(gain.value, 0.0001), startAt);
        gain.linearRampToValueAtTime(peak, startAt + attack);
        gain.linearRampToValueAtTime(sustain, startAt + attack + config.EnvelopeDecay);
        gain.setValueAtTime(sustain, startAt + attack + hold);
        gain.linearRampToValueAtTime(0.0001, startAt + attack + hold + release);
    }
    // ------------------------------------------------------------


    // FUNCTION | Silence the Voice Immediately With a Ramp
    // ------------------------------------------------------------
    // Used by the lock state. Silences without tearing the voice down, so unlocking
    // brings it straight back rather than having to rebuild the graph.
    export function NaAudio__SynthVoice__Silence(voice, rampSeconds) {
        if (!voice) return;

        const now   =  AudioHost.NaAudio__AudioHost__Now();
        const ramp  =  (rampSeconds === undefined) ? 0.08 : rampSeconds;
        const gain  =  voice.Nodes.envelope.gain;

        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(0.0001, now + ramp);
    }
    // ------------------------------------------------------------


    // FUNCTION | Destroy the Voice
    // ------------------------------------------------------------
    export function NaAudio__SynthVoice__Destroy(voice) {
        if (!voice || voice.IsReleased) return;
        voice.IsReleased  =  true;

        const now  =  AudioHost.NaAudio__AudioHost__Now();

        try {
            voice.Nodes.oscillatorA.stop(now + 0.1);
            voice.Nodes.oscillatorB.stop(now + 0.1);
            voice.Nodes.modulator.stop(now + 0.1);
        } catch (error) {
            // Already stopped.
        }

        NaAudio__SynthVoice__Silence(voice, 0.05);

        setTimeout(() => {
            for (const node of Object.values(voice.Nodes)) {
                try { node.disconnect(); } catch (error) { /* already disconnected */ }
            }
        }, 200);                                                              // <-- After the stop lands, or the tail is cut off with a click
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
