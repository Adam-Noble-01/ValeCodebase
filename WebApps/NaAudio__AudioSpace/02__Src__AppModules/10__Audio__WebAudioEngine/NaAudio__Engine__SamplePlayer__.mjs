/* =============================================================================
   NAAUDIO - AUDIO ENGINE | SAMPLE PLAYER
   =============================================================================

   FILE       : NaAudio__Engine__SamplePlayer__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Engine - SamplePlayer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Fire decoded buffers at exact audio times, with a hard voice cap
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - One function does the work: play a decoded buffer, at an absolute audio time,
     into a destination node, at a gain, a pan and a playback rate.
   - Also holds the voice ledger and the voice cap, because those are properties of
     the engine and not of any one spatial module.

   ---------------------------------------------------------------------------

   ONE BUFFER SOURCE PER NOTE, AND WHY THAT IS CORRECT

   An AudioBufferSourceNode is single-use by design: once started it cannot be
   restarted, and it is garbage collected after it ends. That looks wasteful and is
   not - the nodes are extremely cheap, and the browser's audio thread is built
   around exactly this pattern. Trying to pool and reuse them fights the API and
   produces subtle timing bugs for no measurable gain.

   ---------------------------------------------------------------------------

   THE VOICE CAP IS A SAFETY MECHANISM

   MaxConcurrentVoices is not a musical limit, it is a backstop. This is an
   experimental instrument: the user is invited to stack polyphony, build feedback
   paths and see what happens. A sequencer left running with a division count in the
   thirties across four lanes, or a DelayCloud whose spheres have settled into a
   corner, will attempt to start voices faster than they finish.

   With no cap that takes the tab down. With a cap the oldest voice is stolen and the
   result is merely a bit thin, which is a recoverable situation the user can hear
   and react to.

   ---------------------------------------------------------------------------

   WHY EVERY NOTE GETS ITS OWN ENVELOPE

   Every voice runs through a gain node with a short attack ramp and a short release
   ramp. The attack is a fraction of a millisecond, the release a handful.

   Both are essential. A buffer started at full gain from silence begins mid-waveform
   and clicks; a buffer stopped abruptly ends mid-waveform and clicks harder. On a
   drum hit a click is disguised by the transient, but on a piano note or a pad it is
   glaring, and no amount of mixing hides it.

   ============================================================================= */

import { AudioNumber }                          from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import { NaAudio__MusicalMaths__CentsToRatio }  from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';
import * as AudioHost                            from './NaAudio__Engine__AudioHost__.mjs';

// =============================================================================
// REGION | Sample Player
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Voice Ledger
    // ------------------------------------------------------------
    // An array rather than a Set, because voice stealing needs the OLDEST voice and
    // insertion order is what gives that for free.
    const LIVE_VOICES  =  [];                                                // <-- { Source, Envelope, StartedAt, EndsAt }
    let   totalStarted  =  0;
    let   totalStolen   =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Voice Ledger
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Drop Voices That Have Finished
    // ------------------------------------------------------------
    // Swept by elapsed time rather than by relying on the onended callback alone.
    // onended does fire, but it is queued to the main thread and can arrive a frame
    // or two late; during a dense passage that is long enough for the ledger to
    // overcount and start stealing voices that are already gone.
    function NaAudio__SamplePlayer__SweepFinished(now) {
        for (let i = LIVE_VOICES.length - 1; i >= 0; i--) {
            if (LIVE_VOICES[i].EndsAt <= now) LIVE_VOICES.splice(i, 1);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Steal the Oldest Voice to Make Room
    // ------------------------------------------------------------
    // Released with a short ramp rather than stopped dead, so voice stealing sounds
    // like a note ducking out rather than like a click.
    function NaAudio__SamplePlayer__StealOldest(now) {
        const oldest  =  LIVE_VOICES.shift();
        if (!oldest) return;

        const release  =  AudioNumber('SamplePlayer', 'DefaultRelease');

        try {
            oldest.Envelope.gain.cancelScheduledValues(now);
            oldest.Envelope.gain.setValueAtTime(oldest.Envelope.gain.value, now);
            oldest.Envelope.gain.linearRampToValueAtTime(0.0001, now + release);
            oldest.Source.stop(now + release + 0.005);
        } catch (error) {
            // A source that already ended throws on stop. Harmless, and not worth a
            // state check on a path that runs on every stolen voice.
        }

        totalStolen += 1;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Playback
// -----------------------------------------------------------------------------

    // FUNCTION | Play a Decoded Buffer at an Absolute Audio Time
    // ------------------------------------------------------------
    // options:
    //   AtTime          absolute audio time. Defaults to now. THIS IS THE IMPORTANT ONE -
    //                   a scheduler must always pass the time the transport gave it
    //                   rather than letting it default, or the lookahead is wasted.
    //   Destination     node to connect into. Defaults to the master input.
    //   Gain            0 to 1, linear
    //   Pan             -1 to 1
    //   PlaybackRate    1.0 is unaltered; used for pitch shifting a multisample
    //   DetuneCents     fine pitch offset, combined with PlaybackRate
    //   Offset          seconds into the buffer to start from
    //   Duration        seconds to play; defaults to the whole buffer
    //   Loop            whether to loop the buffer
    //   Attack          override the default attack ramp
    //   Release         override the default release ramp
    //
    // Returns the voice record, or null if there was nothing to play.
    export function NaAudio__SamplePlayer__Play(buffer, options) {
        if (!buffer) return null;
        if (!AudioHost.NaAudio__AudioHost__IsUnlocked()) return null;

        const context   =  AudioHost.NaAudio__AudioHost__Context();
        const settings  =  options || {};
        const now       =  AudioHost.NaAudio__AudioHost__Now();

        // A time in the past is clamped to now rather than rejected. A scheduler that
        // fell behind should still make its sound, just late - dropping it silently
        // would present as a stuttering pattern with no explanation.
        const startAt   =  Math.max(settings.AtTime === undefined ? now : settings.AtTime, now);

        NaAudio__SamplePlayer__SweepFinished(now);

        const cap  =  AudioNumber('SamplePlayer', 'MaxConcurrentVoices');
        while (LIVE_VOICES.length >= cap) {
            NaAudio__SamplePlayer__StealOldest(now);
        }

        const source  =  context.createBufferSource();
        source.buffer =  buffer;

        const rate      =  (settings.PlaybackRate === undefined) ? 1.0 : settings.PlaybackRate;
        const detune    =  settings.DetuneCents || 0;
        source.playbackRate.value  =  rate * NaAudio__MusicalMaths__CentsToRatio(detune);

        if (settings.Loop) {
            source.loop  =  true;
            if (settings.LoopStart !== undefined) source.loopStart  =  settings.LoopStart;
            if (settings.LoopEnd   !== undefined) source.loopEnd    =  settings.LoopEnd;
        }

        const envelope  =  context.createGain();
        const peakGain  =  (settings.Gain === undefined) ? 1.0 : Math.max(settings.Gain, 0);
        const attack    =  (settings.Attack  === undefined) ? AudioNumber('SamplePlayer', 'DefaultAttack')  : settings.Attack;
        const release   =  (settings.Release === undefined) ? AudioNumber('SamplePlayer', 'DefaultRelease') : settings.Release;

        envelope.gain.setValueAtTime(0.0001, startAt);
        envelope.gain.linearRampToValueAtTime(Math.max(peakGain, 0.0001), startAt + attack);

        let tail  =  envelope;

        if (settings.Pan !== undefined && settings.Pan !== 0) {
            const panner  =  context.createStereoPanner();
            panner.pan.value  =  Math.max(-1, Math.min(1, settings.Pan));
            envelope.connect(panner);
            tail  =  panner;
        }

        const destination  =  settings.Destination || AudioHost.NaAudio__AudioHost__MasterInput();
        source.connect(envelope);
        tail.connect(destination);

        // WHEN THE VOICE ENDS
        // Looping voices have no natural end, so they are only ever ended by an
        // explicit Release call. A one-shot ends at its own duration divided by the
        // playback rate, which is what resampling does to a buffer's real length.
        const naturalSeconds  =  settings.Duration !== undefined
            ? settings.Duration
            : (buffer.duration - (settings.Offset || 0)) / Math.max(source.playbackRate.value, 0.0001);

        const offset  =  settings.Offset || 0;

        if (settings.Loop) {
            source.start(startAt, offset);
        } else {
            const releaseAt  =  startAt + naturalSeconds;
            envelope.gain.setValueAtTime(Math.max(peakGain, 0.0001), Math.max(releaseAt - release, startAt + attack));
            envelope.gain.linearRampToValueAtTime(0.0001, releaseAt);
            source.start(startAt, offset, settings.Duration);
        }

        const voice  =  {
            Source    : source,
            Envelope  : envelope,
            StartedAt : startAt,
            EndsAt    : settings.Loop ? Infinity : (startAt + naturalSeconds + release)
        };

        LIVE_VOICES.push(voice);
        totalStarted += 1;

        source.onended  =  function () {
            const index  =  LIVE_VOICES.indexOf(voice);
            if (index >= 0) LIVE_VOICES.splice(index, 1);
            try { source.disconnect(); envelope.disconnect(); } catch (error) { /* already torn down */ }
        };

        return voice;
    }
    // ------------------------------------------------------------


    // FUNCTION | Release a Voice With a Ramp
    // ------------------------------------------------------------
    // The only way to end a looping voice. Ramped rather than stopped, for the same
    // reason every other gain change in this engine is ramped.
    export function NaAudio__SamplePlayer__Release(voice, releaseSeconds) {
        if (!voice) return;

        const now      =  AudioHost.NaAudio__AudioHost__Now();
        const release  =  (releaseSeconds === undefined) ? AudioNumber('SamplePlayer', 'DefaultRelease') : releaseSeconds;

        try {
            voice.Envelope.gain.cancelScheduledValues(now);
            voice.Envelope.gain.setValueAtTime(voice.Envelope.gain.value, now);
            voice.Envelope.gain.linearRampToValueAtTime(0.0001, now + release);
            voice.Source.stop(now + release + 0.005);
            voice.EndsAt  =  now + release;
        } catch (error) {
            // Already ended.
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Release Every Live Voice
    // ------------------------------------------------------------
    // Called on transport stop and on a module lock. Without it, a stopped transport
    // leaves long piano tails and looping beds ringing on indefinitely, which reads
    // as the stop button not working.
    export function NaAudio__SamplePlayer__ReleaseAll(releaseSeconds) {
        const voices  =  LIVE_VOICES.slice();
        for (let i = 0; i < voices.length; i++) {
            NaAudio__SamplePlayer__Release(voices[i], releaseSeconds);
        }
        LIVE_VOICES.length  =  0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Diagnostics
// -----------------------------------------------------------------------------

    // FUNCTION | Current Voice Count
    // ------------------------------------------------------------
    export function NaAudio__SamplePlayer__VoiceCount() {
        NaAudio__SamplePlayer__SweepFinished(AudioHost.NaAudio__AudioHost__Now());
        return LIVE_VOICES.length;
    }
    // ------------------------------------------------------------


    // FUNCTION | Voice Statistics
    // ------------------------------------------------------------
    // A stolen count that climbs while the transport runs is the single clearest
    // signal that something in the space is over-triggering, so it is surfaced rather
    // than kept internal.
    export function NaAudio__SamplePlayer__Statistics() {
        return {
            Live    : NaAudio__SamplePlayer__VoiceCount(),
            Cap     : AudioNumber('SamplePlayer', 'MaxConcurrentVoices'),
            Started : totalStarted,
            Stolen  : totalStolen
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
