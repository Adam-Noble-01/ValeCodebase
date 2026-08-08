/* =============================================================================
   NAAUDIO - AUDIO ENGINE | EFFECT RACK
   =============================================================================

   FILE       : NaAudio__Engine__EffectRack__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Engine - EffectRack
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Convolution reverb, damped feedback delay and a resonant filter
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Three effects, each built as a self-contained unit with an input node, an output
     node and a set of named normalised parameters.
   - Three and no more, chosen because each one has a parameter set that maps
     naturally onto a shape a user can grab in 3D. That is the whole selection
     criterion at this stage of the build.

   ---------------------------------------------------------------------------

   WHY NOT STUB OUT THE MANIFEST'S FULL EFFECT LIST

   The design manifest names a dozen spatial effects - SpatialReverb, WaveFold,
   FractalEcho, DimensionMatrix and the rest. It would be easy to create a file per
   name and leave each one empty.

   That would be worse than not having them. An empty module in a code base reads as
   'implemented' to everyone including its author six months later, and the honest
   signal - that these are designed but not built - is lost the moment the file
   exists. The three here are real, and the rest are in the manifest where they
   belong until somebody builds them.

   ---------------------------------------------------------------------------

   THE FEEDBACK CEILING IS A HARD LIMIT

   A delay whose feedback reaches 1.0 is an oscillator: the signal circulates without
   losing energy and grows without bound. MaxFeedback in config is well below unity
   and this module CLAMPS to it rather than trusting callers.

   This is not defensive coding for its own sake. The DelayCloud maps feedback onto a
   box the user resizes by dragging, and a user exploring the far corner of that box
   at listening level, on headphones, must not be able to produce a runaway. The
   damping filter in the feedback path serves the same end from the other direction -
   it bleeds high frequencies on each pass, so a long tail decays into something dull
   rather than accumulating into a scream.

   ============================================================================= */

import { AudioSection }                        from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import {
    NaAudio__MusicalMaths__MapNormalised,
    NaAudio__MusicalMaths__MapNormalisedExponential,
    NaAudio__MusicalMaths__Clamp
} from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';
import * as AudioHost                          from './NaAudio__Engine__AudioHost__.mjs';

// =============================================================================
// REGION | Effect Rack
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Ramp Times
    // ------------------------------------------------------------
    const PARAM_RAMP_SECONDS  =  0.03;                                       // <-- Standard parameter ramp
    const TIME_RAMP_SECONDS   =  0.12;                                       // <-- Delay time only. See the note in SetDelayTime.
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shared Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Write an AudioParam With a Ramp
    // ------------------------------------------------------------
    function NaAudio__EffectRack__RampParam(audioParam, target, rampSeconds) {
        const now   =  AudioHost.NaAudio__AudioHost__Now();
        const ramp  =  (rampSeconds === undefined) ? PARAM_RAMP_SECONDS : rampSeconds;

        audioParam.cancelScheduledValues(now);
        audioParam.setValueAtTime(audioParam.value, now);
        audioParam.linearRampToValueAtTime(target, now + ramp);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Wet and Dry Crossfade Pair
    // ------------------------------------------------------------
    // Every effect here is a send-return with its own wet and dry legs rather than an
    // insert. That is what lets a wet mix of zero be genuinely bypassed - the wet leg
    // is silent, so its convolver or delay line contributes nothing at all.
    function NaAudio__EffectRack__BuildWetDry(context, initialWet) {
        const input     =  context.createGain();
        const dryGain   =  context.createGain();
        const wetGain   =  context.createGain();
        const output    =  context.createGain();

        dryGain.gain.value  =  1 - initialWet;
        wetGain.gain.value  =  initialWet;

        input.connect(dryGain);
        dryGain.connect(output);
        wetGain.connect(output);

        return { Input: input, DryGain: dryGain, WetGain: wetGain, Output: output };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Convolution Reverb
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Convolution Reverb Unit
    // ------------------------------------------------------------
    // The impulse response buffer is supplied by the caller, decoded through the
    // sample bank. A convolver with no buffer passes silence, so a unit created before
    // its response has loaded is simply dry until it arrives - which is the right
    // behaviour and needs no special case.
    export function NaAudio__EffectRack__CreateReverb(impulseBuffer) {
        const context  =  AudioHost.NaAudio__AudioHost__Context();
        const config   =  AudioSection('EffectRack').Reverb;

        const chain  =  NaAudio__EffectRack__BuildWetDry(context, config.DefaultWetMix);

        // A short pre-delay before the convolver. Without it the reverb onset sits
        // exactly on top of the dry transient and smears it; a few milliseconds of gap
        // lets the attack read clearly with the space arriving just behind it.
        const preDelay  =  context.createDelay(0.5);
        preDelay.delayTime.value  =  config.PreDelaySeconds;

        const convolver  =  context.createConvolver();
        convolver.normalize  =  true;                                         // <-- Without this, a hot impulse response is deafening
        if (impulseBuffer) convolver.buffer  =  impulseBuffer;

        chain.Input.connect(preDelay);
        preDelay.connect(convolver);
        convolver.connect(chain.WetGain);

        return {
            Kind       : 'reverb',
            Input      : chain.Input,
            Output     : chain.Output,
            Nodes      : { preDelay, convolver, dryGain: chain.DryGain, wetGain: chain.WetGain },
            Parameters : { wetMix: config.DefaultWetMix, decay: 0.5 }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Reverb Unit's Wet Mix From a Normalised Value
    // ------------------------------------------------------------
    export function NaAudio__EffectRack__SetReverbWet(unit, normalised) {
        if (!unit || unit.Kind !== 'reverb') return;

        const config  =  AudioSection('EffectRack').Reverb;
        const wet     =  NaAudio__MusicalMaths__MapNormalised(normalised, config.MinWetMix, config.MaxWetMix);

        // Equal-power crossfade. A linear wet and dry pair dips in level through the
        // middle of its travel, which on a reverb send reads as the sound receding
        // rather than as it becoming more spacious.
        NaAudio__EffectRack__RampParam(unit.Nodes.wetGain.gain, Math.sin(wet * Math.PI / 2));
        NaAudio__EffectRack__RampParam(unit.Nodes.dryGain.gain, Math.cos(wet * Math.PI / 2));

        unit.Parameters.wetMix  =  normalised;
    }
    // ------------------------------------------------------------


    // FUNCTION | Swap a Reverb Unit's Impulse Response
    // ------------------------------------------------------------
    // How the DelayCloud's box volume becomes an audible room size: a larger box
    // selects a longer impulse response. Swapping the buffer cuts the current tail
    // dead, so the caller dips the wet mix across the swap when it matters.
    export function NaAudio__EffectRack__SetReverbImpulse(unit, impulseBuffer) {
        if (!unit || unit.Kind !== 'reverb' || !impulseBuffer) return;
        unit.Nodes.convolver.buffer  =  impulseBuffer;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Damped Feedback Delay
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Delay Unit
    // ------------------------------------------------------------
    // The feedback loop:
    //
    //     input -> delay -> damping filter -> feedbackGain -> back into delay
    //                   \-> wetGain -> output
    //
    // The damping filter INSIDE the loop is what makes the delay musical rather than
    // mechanical. Each repeat loses its high frequencies, so a long tail decays into
    // something soft and distant - the way a real echo behaves - instead of repeating
    // an identical bright copy until it stops.
    export function NaAudio__EffectRack__CreateDelay() {
        const context  =  AudioHost.NaAudio__AudioHost__Context();
        const config   =  AudioSection('EffectRack').Delay;

        const chain  =  NaAudio__EffectRack__BuildWetDry(context, 0.5);

        const delayNode  =  context.createDelay(config.MaxTimeSeconds + 0.1);  // <-- Max capacity must exceed the max usable time
        delayNode.delayTime.value  =  config.DefaultTimeSeconds;

        const damping  =  context.createBiquadFilter();
        damping.type            =  'lowpass';
        damping.frequency.value =  config.DampingCutoffHz;
        damping.Q.value         =  0.4;

        const feedbackGain  =  context.createGain();
        feedbackGain.gain.value  =  Math.min(config.DefaultFeedback, config.MaxFeedback);

        chain.Input.connect(delayNode);
        delayNode.connect(damping);
        damping.connect(feedbackGain);
        feedbackGain.connect(delayNode);                                       // <-- The loop closes here
        delayNode.connect(chain.WetGain);

        return {
            Kind       : 'delay',
            Input      : chain.Input,
            Output     : chain.Output,
            Nodes      : { delayNode, damping, feedbackGain, dryGain: chain.DryGain, wetGain: chain.WetGain },
            Parameters : { time: 0.5, feedback: config.DefaultFeedback, damping: 0.5, wetMix: 0.5 }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Delay Unit's Time From a Normalised Value
    // ------------------------------------------------------------
    // Ramped over a longer window than every other parameter here, deliberately.
    // Changing a delay line's length is a change to a read pointer into a circular
    // buffer; done quickly it produces a pitch-shifted glitch on whatever is currently
    // in the line. A slower ramp turns that into a tape-style slide, which is a
    // musical result rather than an artefact.
    export function NaAudio__EffectRack__SetDelayTime(unit, normalised) {
        if (!unit || unit.Kind !== 'delay') return;

        const config   =  AudioSection('EffectRack').Delay;
        const seconds  =  NaAudio__MusicalMaths__MapNormalisedExponential(normalised, config.MinTimeSeconds, config.MaxTimeSeconds);

        NaAudio__EffectRack__RampParam(unit.Nodes.delayNode.delayTime, seconds, TIME_RAMP_SECONDS);
        unit.Parameters.time  =  normalised;
        return seconds;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Delay Unit's Time to an Exact Number of Seconds
    // ------------------------------------------------------------
    // For tempo-synced use, where the caller already has a musical value from
    // NaAudio__Transport__SnapDelayToTempo and must not have it re-mapped.
    export function NaAudio__EffectRack__SetDelaySeconds(unit, seconds) {
        if (!unit || unit.Kind !== 'delay') return;

        const config   =  AudioSection('EffectRack').Delay;
        const clamped  =  NaAudio__MusicalMaths__Clamp(seconds, config.MinTimeSeconds, config.MaxTimeSeconds);

        NaAudio__EffectRack__RampParam(unit.Nodes.delayNode.delayTime, clamped, TIME_RAMP_SECONDS);
        return clamped;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Delay Unit's Feedback From a Normalised Value
    // ------------------------------------------------------------
    // Clamped to MaxFeedback here rather than trusting the caller. See the hard limit
    // note in the file header - this is the one clamp in the engine that exists to
    // protect a listener rather than to protect the code.
    export function NaAudio__EffectRack__SetDelayFeedback(unit, normalised) {
        if (!unit || unit.Kind !== 'delay') return;

        const config   =  AudioSection('EffectRack').Delay;
        const feedback =  NaAudio__MusicalMaths__MapNormalised(normalised, 0, config.MaxFeedback);

        NaAudio__EffectRack__RampParam(unit.Nodes.feedbackGain.gain, Math.min(feedback, config.MaxFeedback));
        unit.Parameters.feedback  =  normalised;
        return feedback;
    }
    // ------------------------------------------------------------


    // FUNCTION | Open or Drain a Delay Unit's Feedback Tail
    // ------------------------------------------------------------
    // Draining ramps the feedback path to silence; opening restores whatever the unit's
    // own feedback parameter says. The stored parameter is never touched, so a module can
    // drain and reopen without losing the setting the user dialled in.
    //
    // WHY THIS EXISTS
    //
    // A feedback delay does not stop when its source stops - it recirculates what is
    // already inside it. At the ceiling of 0.82 that is a loop losing under a fifth of its
    // energy per pass, which at a third of a second per pass is still plainly audible
    // half a minute later.
    //
    // So a DelayCloud carried on making noise after the transport stopped, indefinitely
    // and at a level that fluctuated rather than decaying, which reads exactly like a DAW
    // that ignores the stop button. Draining the feedback lets the tail die over its own
    // couple of repeats instead - a musical stop rather than a hard cut, and one that
    // costs nothing while it is open.
    export function NaAudio__EffectRack__SetDelayTailOpen(unit, isOpen, seconds) {
        if (!unit || unit.Kind !== 'delay') return;

        const config    =  AudioSection('EffectRack').Delay;
        const feedback  =  isOpen
            ? Math.min(NaAudio__MusicalMaths__MapNormalised(unit.Parameters.feedback, 0, config.MaxFeedback), config.MaxFeedback)
            : 0;

        NaAudio__EffectRack__RampParam(unit.Nodes.feedbackGain.gain, feedback, seconds);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Delay Unit's Damping From a Normalised Value
    // ------------------------------------------------------------
    // Zero is heavily damped and one is open. Inverted relative to the name because
    // the parameter is driven by a box HEIGHT in the DelayCloud, and a taller box
    // reading as a brighter space is the intuitive direction.
    export function NaAudio__EffectRack__SetDelayDamping(unit, normalised) {
        if (!unit || unit.Kind !== 'delay') return;

        const cutoff  =  NaAudio__MusicalMaths__MapNormalisedExponential(normalised, 420, 12000);
        NaAudio__EffectRack__RampParam(unit.Nodes.damping.frequency, cutoff);

        unit.Parameters.damping  =  normalised;
        return cutoff;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Delay Unit's Wet Mix
    // ------------------------------------------------------------
    export function NaAudio__EffectRack__SetDelayWet(unit, normalised) {
        if (!unit || unit.Kind !== 'delay') return;

        const wet  =  NaAudio__MusicalMaths__Clamp(normalised, 0, 1);
        NaAudio__EffectRack__RampParam(unit.Nodes.wetGain.gain, Math.sin(wet * Math.PI / 2));
        NaAudio__EffectRack__RampParam(unit.Nodes.dryGain.gain, Math.cos(wet * Math.PI / 2));

        unit.Parameters.wetMix  =  wet;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resonant Filter
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Filter Unit
    // ------------------------------------------------------------
    // An insert rather than a send-return, because a filter with a dry path alongside
    // it is not a filter - the dry leg carries exactly the frequencies the filter was
    // asked to remove.
    export function NaAudio__EffectRack__CreateFilter(filterType) {
        const context  =  AudioHost.NaAudio__AudioHost__Context();
        const config   =  AudioSection('EffectRack').Filter;

        const filter  =  context.createBiquadFilter();
        filter.type            =  filterType || config.Types[0];
        filter.frequency.value =  config.DefaultCutoffHz;
        filter.Q.value         =  config.DefaultQ;

        return {
            Kind       : 'filter',
            Input      : filter,
            Output     : filter,                                              // <-- One node; input and output are the same object
            Nodes      : { filter },
            Parameters : { cutoff: 0.7, q: 0.1 }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Filter Unit's Cutoff From a Normalised Value
    // ------------------------------------------------------------
    export function NaAudio__EffectRack__SetFilterCutoff(unit, normalised) {
        if (!unit || unit.Kind !== 'filter') return;

        const cutoff  =  NaAudio__MusicalMaths__MapNormalisedExponential(normalised, 60, 16000);
        NaAudio__EffectRack__RampParam(unit.Nodes.filter.frequency, cutoff);

        unit.Parameters.cutoff  =  normalised;
        return cutoff;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Filter Unit's Resonance From a Normalised Value
    // ------------------------------------------------------------
    export function NaAudio__EffectRack__SetFilterQ(unit, normalised) {
        if (!unit || unit.Kind !== 'filter') return;

        const q  =  NaAudio__MusicalMaths__MapNormalised(normalised, 0.4, 16.0);
        NaAudio__EffectRack__RampParam(unit.Nodes.filter.Q, q);

        unit.Parameters.q  =  normalised;
        return q;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Teardown
// -----------------------------------------------------------------------------

    // FUNCTION | Destroy an Effect Unit
    // ------------------------------------------------------------
    // A feedback loop must be broken before the nodes are dropped. A disconnected
    // delay whose feedback path is still intact keeps circulating whatever was in the
    // line, and it is no longer reachable to be silenced.
    export function NaAudio__EffectRack__Destroy(unit) {
        if (!unit) return;

        if (unit.Nodes.feedbackGain) {
            unit.Nodes.feedbackGain.gain.value  =  0;
            try { unit.Nodes.feedbackGain.disconnect(); } catch (error) { /* already gone */ }
        }

        for (const node of Object.values(unit.Nodes)) {
            try { node.disconnect(); } catch (error) { /* already disconnected */ }
        }

        try { unit.Input.disconnect(); unit.Output.disconnect(); } catch (error) { /* already disconnected */ }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
