/* =============================================================================
   NAAUDIO - AUDIO ENGINE | AUDIO HOST
   =============================================================================

   FILE       : NaAudio__Engine__AudioHost__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Engine - AudioHost
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Own the AudioContext and the master bus, and nothing else
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - The only module in AudioSPACE that touches an AudioContext constructor. Every
     other module asks this one for the context, for the current audio time, or for
     a node to connect to.
   - Owns the master bus: a summing gain, a limiter, an analyser tap, and the
     destination. Nothing connects straight to destination, ever.

   ---------------------------------------------------------------------------

   WHY EVERYTHING GOES THROUGH HERE

   The design manifest is explicit that browser JavaScript is the known performance
   ceiling for this application and that a compiled core - C++ or Rust - is likely
   to be necessary. That makes the audio layer a thing to be REPLACED, not a thing
   to be built once.

   Every spatial module therefore talks to the graph exclusively through this module
   and through the transport. None of them holds an AudioContext reference, none of
   them reads currentTime directly, none of them connects to destination. When the
   core is swapped for AudioWorklets or a WASM engine, this file and the transport
   change, and not one spatial module does.

   ---------------------------------------------------------------------------

   THE MASTER CHAIN, AND WHY THE LIMITER IS NOT OPTIONAL

       module outputs -> MasterGain -> Limiter -> AnalyserTap -> destination

   MasterGain sits well below unity. This is headroom, not loudness: a dozen sample
   voices and three synth voices summing at unity clips instantly, and clipping in a
   browser is a hard digital crunch with no character to it.

   The limiter is a DynamicsCompressor at a high ratio. It exists because this is an
   experimental instrument - the user is explicitly encouraged to build feedback
   paths, stack polyphony and see what happens. Occasionally something will be far
   too loud, and it will happen while somebody is wearing headphones. The limiter
   should idle almost all the time and catch that.

   ============================================================================= */

import { AudioNumber, AudioString, AudioBool, AudioSection }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Audio Host
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | The Context and Master Chain
    // ------------------------------------------------------------
    let audioContext   =  null;
    let masterGain     =  null;
    let limiterNode    =  null;
    let analyserNode   =  null;
    let isUnlocked     =  false;
    let analyserBuffer =  null;                                              // <-- Reused; a meter read allocates nothing
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Context Creation
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Construct the AudioContext From Config
    // ------------------------------------------------------------
    function NaAudio__AudioHost__CreateContext() {
        const ContextClass  =  window.AudioContext || window.webkitAudioContext;
        if (!ContextClass) {
            throw new Error('[NaAudio AudioHost] This browser has no Web Audio API. AudioSPACE cannot run.');
        }

        const options  =  { latencyHint: AudioString('Context', 'LatencyHint') };

        const sampleRate  =  AudioSection('Context').SampleRate;
        if (typeof sampleRate === 'number' && sampleRate > 0) {
            options.sampleRate  =  sampleRate;                                 // <-- Only if config explicitly asks; null lets the hardware decide
        }

        return new ContextClass(options);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Master Bus Chain
    // ------------------------------------------------------------
    function NaAudio__AudioHost__BuildMasterChain(context) {
        masterGain  =  context.createGain();
        masterGain.gain.value  =  AudioNumber('Context', 'MasterGain');

        limiterNode  =  context.createDynamicsCompressor();
        limiterNode.threshold.value  =  AudioNumber('Context', 'LimiterThresholdDb');
        limiterNode.knee.value       =  AudioNumber('Context', 'LimiterKneeDb');
        limiterNode.ratio.value      =  AudioNumber('Context', 'LimiterRatio');
        limiterNode.attack.value     =  AudioNumber('Context', 'LimiterAttack');
        limiterNode.release.value    =  AudioNumber('Context', 'LimiterRelease');

        analyserNode  =  context.createAnalyser();
        analyserNode.fftSize                =  AudioNumber('Metering', 'AnalyserFftSize');
        analyserNode.smoothingTimeConstant  =  AudioNumber('Metering', 'AnalyserSmoothing');

        analyserBuffer  =  new Float32Array(analyserNode.fftSize);

        masterGain.connect(limiterNode);
        limiterNode.connect(analyserNode);
        analyserNode.connect(context.destination);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Unlock
// -----------------------------------------------------------------------------

    // FUNCTION | Create and Unlock the AudioContext From a User Gesture
    // ------------------------------------------------------------
    // MUST be called from inside a real user gesture handler. Every browser
    // suspends a fresh AudioContext until one arrives, and the boot gate in the HUD
    // exists solely to supply it. Calling this from a timer or a promise chain
    // detached from the gesture leaves the context suspended and everything silent
    // with no error anywhere.
    export async function NaAudio__AudioHost__Unlock() {
        if (isUnlocked) return audioContext;

        if (!audioContext) {
            audioContext  =  NaAudio__AudioHost__CreateContext();
            NaAudio__AudioHost__BuildMasterChain(audioContext);
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        isUnlocked  =  true;

        NaAudio__EventBus__Publish(NaAudio__Event.AudioUnlocked, {
            SampleRate  : audioContext.sampleRate,
            BaseLatency : audioContext.baseLatency || 0
        });

        return audioContext;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Context Exists and Is Running
    // ------------------------------------------------------------
    export function NaAudio__AudioHost__IsUnlocked() {
        return isUnlocked && !!audioContext && audioContext.state === 'running';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Graph Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fail Clearly When the Context Is Not Yet Unlocked
    // ------------------------------------------------------------
    function NaAudio__AudioHost__RequireContext(caller) {
        if (!audioContext) {
            throw new Error('[NaAudio AudioHost] ' + caller + ' was called before the audio context was unlocked. Everything that builds audio nodes must wait for NaAudio__Event.AudioUnlocked.');
        }
        return audioContext;
    }
    // ------------------------------------------------------------


    // FUNCTION | The AudioContext
    // ------------------------------------------------------------
    export function NaAudio__AudioHost__Context() {
        return NaAudio__AudioHost__RequireContext('Context()');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Node Everything Connects Into
    // ------------------------------------------------------------
    // The master summing gain, not the destination. A module connecting straight to
    // destination bypasses the limiter and the meter, which is exactly the path that
    // produces a painfully loud surprise.
    export function NaAudio__AudioHost__MasterInput() {
        NaAudio__AudioHost__RequireContext('MasterInput()');
        return masterGain;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Current Audio Clock Time in Seconds
    // ------------------------------------------------------------
    // The ONLY clock in the application that matters. performance.now() and
    // Date.now() are wall clocks that drift against the audio hardware; anything
    // scheduled against them is audibly late sooner or later.
    export function NaAudio__AudioHost__Now() {
        return audioContext ? audioContext.currentTime : 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Context Sample Rate
    // ------------------------------------------------------------
    export function NaAudio__AudioHost__SampleRate() {
        return audioContext ? audioContext.sampleRate : 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Node Construction Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Gain Node at a Given Level
    // ------------------------------------------------------------
    export function NaAudio__AudioHost__CreateGain(level) {
        const context  =  NaAudio__AudioHost__RequireContext('CreateGain()');
        const gain     =  context.createGain();
        gain.gain.value  =  (level === undefined) ? 1.0 : level;
        return gain;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Module Output Bus
    // ------------------------------------------------------------
    // Every spatial module gets one of these. It is what the lock state silences and
    // what a patch cable's meter reads, so a module never has to expose its internal
    // graph to have either of those things work.
    export function NaAudio__AudioHost__CreateModuleBus(level) {
        const context  =  NaAudio__AudioHost__RequireContext('CreateModuleBus()');

        const output    =  context.createGain();
        output.gain.value  =  (level === undefined) ? 1.0 : level;

        const analyser  =  context.createAnalyser();
        analyser.fftSize                =  AudioNumber('Metering', 'AnalyserFftSize');
        analyser.smoothingTimeConstant  =  AudioNumber('Metering', 'AnalyserSmoothing');

        output.connect(analyser);                                             // <-- Tap in parallel; the analyser is not in the audio path
        output.connect(masterGain);

        return {
            Output       : output,
            Analyser     : analyser,
            MeterBuffer  : new Float32Array(analyser.fftSize)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Normalised RMS Level From an Analyser
    // ------------------------------------------------------------
    // Returns 0 to 1 against the configured meter floor. RMS rather than peak,
    // because the visuals want to show how much energy is present rather than
    // flickering on every transient.
    export function NaAudio__AudioHost__ReadLevel(analyser, buffer) {
        if (!analyser) return 0;

        const samples  =  buffer || analyserBuffer;
        analyser.getFloatTimeDomainData(samples);

        let sum  =  0;
        for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];

        const rms  =  Math.sqrt(sum / samples.length);
        if (rms <= 0) return 0;

        const floorDb  =  AudioNumber('Metering', 'MeterFloorDb');
        const db       =  20 * Math.log10(rms);

        return Math.max(0, Math.min(1, (db - floorDb) / -floorDb));
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Master Bus Level
    // ------------------------------------------------------------
    export function NaAudio__AudioHost__MasterLevel() {
        return NaAudio__AudioHost__ReadLevel(analyserNode, analyserBuffer);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read How Hard the Limiter Is Working, in Decibels
    // ------------------------------------------------------------
    // Surfaced on the diagnostics readout. A reduction that sits below a decibel or
    // two continuously means the master gain is set too hot and the limiter has
    // stopped being a safety net and started being the sound.
    export function NaAudio__AudioHost__LimiterReduction() {
        return limiterNode ? limiterNode.reduction : 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Master Control and Teardown
// -----------------------------------------------------------------------------

    // FUNCTION | Set the Master Output Level With a Short Ramp
    // ------------------------------------------------------------
    // Ramped, never assigned. Writing gain.value directly produces a step
    // discontinuity in the signal, which is an audible click at any level above
    // very quiet.
    export function NaAudio__AudioHost__SetMasterGain(level, rampSeconds) {
        if (!masterGain) return;

        const now   =  NaAudio__AudioHost__Now();
        const ramp  =  (rampSeconds === undefined) ? 0.02 : rampSeconds;

        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(Math.max(level, 0.0001), now + ramp);
    }
    // ------------------------------------------------------------


    // FUNCTION | Suspend the Context
    // ------------------------------------------------------------
    // Used when the tab is hidden. A suspended context stops advancing its clock, so
    // the transport must be stopped rather than left running across a suspend.
    export async function NaAudio__AudioHost__Suspend() {
        if (audioContext && audioContext.state === 'running') await audioContext.suspend();
    }
    // ------------------------------------------------------------


    // FUNCTION | Resume the Context
    // ------------------------------------------------------------
    export async function NaAudio__AudioHost__Resume() {
        if (audioContext && audioContext.state === 'suspended') await audioContext.resume();
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Configured Unlock Gesture Is Required
    // ------------------------------------------------------------
    // Read by the boot gate. Config-driven so the gate can be reasoned about, but
    // note that setting this false does not remove the browser's own requirement -
    // it only removes our gate, and the context stays suspended.
    export function NaAudio__AudioHost__RequiresGesture() {
        return AudioBool('Context', 'ResumeRequiresGesture');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
