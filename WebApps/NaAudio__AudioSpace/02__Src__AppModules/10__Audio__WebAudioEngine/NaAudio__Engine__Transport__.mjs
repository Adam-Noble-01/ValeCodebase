/* =============================================================================
   NAAUDIO - AUDIO ENGINE | TRANSPORT
   =============================================================================

   FILE       : NaAudio__Engine__Transport__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Engine - Transport
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The clock. Lookahead scheduling for everything that makes a sound
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - One clock for the whole application. Every spatial module that produces timed
     audio registers a scheduler callback here and is handed absolute audio times to
     place its events at.
   - Also publishes a continuous playhead position for the visuals, so a sweeping
     marker and the note it triggers come from the same source of truth.

   ---------------------------------------------------------------------------

   THE LOOKAHEAD PATTERN, AND WHY IT IS THE ONLY WORKABLE ONE

   The naive approach is a setInterval that plays a note each time it fires. It does
   not work, and it cannot be made to work. JavaScript timers are throttled in
   background tabs, delayed by garbage collection, and delayed by any long frame -
   and every one of those delays lands directly on the note as audible jitter.

   The pattern used here instead:

       * A timer wakes every SchedulerIntervalMs. It plays nothing.
       * It asks the audio clock what time it is, then schedules every event falling
         inside the next LookaheadSeconds, each stamped with an ABSOLUTE audio time.
       * The audio hardware plays them at exactly those times, regardless of what
         JavaScript was doing in the meantime.

   A late timer callback therefore produces perfectly placed audio - it simply
   schedules a slightly shorter window next time. Only a callback later than the
   whole lookahead window drops anything, which is why that value matters more than
   any other number in the engine.

   ---------------------------------------------------------------------------

   TWO CLOCKS, ON PURPOSE

   Scheduling uses the AUDIO clock, ahead of real time. The visuals use a PLAYHEAD
   position derived from that same clock but read at the current instant, without the
   lookahead offset.

   They must stay separate. Animating from the scheduling position would run the
   visuals a tenth of a second ahead of the sound, which is easily enough to see and
   is deeply unpleasant. Scheduling from the visual position would put every note
   slightly in the past and drop it.

   ============================================================================= */

import { AudioNumber }              from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import {
    NaAudio__MusicalMaths__SecondsPerBeat,
    NaAudio__MusicalMaths__SecondsPerBar,
    NaAudio__MusicalMaths__Clamp
} from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';
import * as AudioHost                from './NaAudio__Engine__AudioHost__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Transport
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Clock and Scheduler State
    // ------------------------------------------------------------
    let currentBpm         =  96;                                            // <-- Overwritten from config on Initialise
    let beatsPerBar        =  4;

    let isRunning          =  false;
    let startAudioTime     =  0;                                             // <-- Audio clock reading when the transport last started
    let startBeatPosition  =  0;                                             // <-- Beat position it started from, so pausing and resuming keeps place
    let scheduledUntil     =  0;                                             // <-- Audio time everything has been scheduled up to
    let schedulerHandle    =  0;

    let lastPublishedBar   =  -1;

    const CALLBACKS  =  new Map();                                           // <-- Owner id -> scheduler callback
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Transport Defaults From Config
    // ------------------------------------------------------------
    export function NaAudio__Transport__Initialise() {
        currentBpm   =  AudioNumber('Transport', 'DefaultBpm');
        beatsPerBar  =  AudioNumber('Transport', 'BeatsPerBar');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Position Conversions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert an Audio Time to a Beat Position
    // ------------------------------------------------------------
    function NaAudio__Transport__BeatAtAudioTime(audioTime) {
        if (!isRunning) return startBeatPosition;
        const elapsed  =  audioTime - startAudioTime;
        return startBeatPosition + elapsed / NaAudio__MusicalMaths__SecondsPerBeat(currentBpm);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Beat Position to an Audio Time
    // ------------------------------------------------------------
    function NaAudio__Transport__AudioTimeAtBeat(beatPosition) {
        return startAudioTime + (beatPosition - startBeatPosition) * NaAudio__MusicalMaths__SecondsPerBeat(currentBpm);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Beat Position Right Now, For the Visuals
    // ------------------------------------------------------------
    // Fractional and continuous - beat 6.37 is a real answer. A sequencer marker
    // reads this every frame and sweeps smoothly rather than jumping between steps.
    export function NaAudio__Transport__PlayheadBeats() {
        return NaAudio__Transport__BeatAtAudioTime(AudioHost.NaAudio__AudioHost__Now());
    }
    // ------------------------------------------------------------


    // FUNCTION | The Bar and Beat Right Now
    // ------------------------------------------------------------
    export function NaAudio__Transport__PlayheadBarBeat() {
        const beats  =  NaAudio__Transport__PlayheadBeats();
        return {
            Bar          : Math.floor(beats / beatsPerBar),
            Beat         : beats % beatsPerBar,
            BeatsPerBar  : beatsPerBar,
            TotalBeats   : beats
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scheduler Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Register a Scheduler Callback
    // ------------------------------------------------------------
    // The callback receives a window and must schedule every event it owns that
    // falls inside it:
    //
    //     callback({ FromBeat, ToBeat, AudioTimeAtBeat, SecondsPerBeat, Bpm })
    //
    // AudioTimeAtBeat is handed in rather than exported, so a module cannot
    // accidentally compute an event time against a stale tempo. The window is
    // half-open - FromBeat inclusive, ToBeat exclusive - so an event exactly on a
    // boundary is scheduled once and never twice.
    export function NaAudio__Transport__RegisterScheduler(ownerId, callback) {
        if (typeof callback !== 'function') {
            throw new Error('[NaAudio Transport] RegisterScheduler for "' + ownerId + '" was passed a non-function.');
        }
        CALLBACKS.set(ownerId, callback);

        return function NaAudio__Transport__UnregisterScheduler() {
            CALLBACKS.delete(ownerId);
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Count of Registered Schedulers
    // ------------------------------------------------------------
    export function NaAudio__Transport__SchedulerCount() {
        return CALLBACKS.size;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Scheduler Tick
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Schedule Everything Inside the Lookahead Window
    // ------------------------------------------------------------
    function NaAudio__Transport__Tick() {
        if (!isRunning) return;

        const now        =  AudioHost.NaAudio__AudioHost__Now();
        const lookahead  =  AudioNumber('Transport', 'LookaheadSeconds');
        const horizon    =  now + lookahead;

        if (scheduledUntil < now) {
            // The scheduler fell more than a whole window behind - a long stall, or
            // the tab was in the background. Catching up by scheduling the missed
            // events would fire a burst of notes all at once, so the gap is skipped
            // and the window restarts from the present instant.
            scheduledUntil  =  now;
        }

        if (horizon <= scheduledUntil) return;                                // <-- Window already covered; nothing to do

        const fromBeat  =  NaAudio__Transport__BeatAtAudioTime(scheduledUntil);
        const toBeat    =  NaAudio__Transport__BeatAtAudioTime(horizon);

        const window  =  {
            FromBeat        : fromBeat,
            ToBeat          : toBeat,
            AudioTimeAtBeat : NaAudio__Transport__AudioTimeAtBeat,
            SecondsPerBeat  : NaAudio__MusicalMaths__SecondsPerBeat(currentBpm),
            SecondsPerBar   : NaAudio__MusicalMaths__SecondsPerBar(currentBpm, beatsPerBar),
            BeatsPerBar     : beatsPerBar,
            Bpm             : currentBpm
        };

        for (const [ownerId, callback] of CALLBACKS) {
            try {
                callback(window);
            } catch (error) {
                console.error('[NaAudio Transport] Scheduler "' + ownerId + '" threw and was unregistered:', error);
                CALLBACKS.delete(ownerId);                                     // <-- A scheduler throwing 40 times a second would bury the console
            }
        }

        scheduledUntil  =  horizon;

        NaAudio__Transport__PublishBarIfAdvanced(fromBeat);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Publish a Bar Event When the Bar Number Changes
    // ------------------------------------------------------------
    // Bar rate, not beat rate. Publishing every beat would put four bus traversals
    // per bar through the event system for something only the HUD reads, and the
    // event bus is explicitly not for anything approaching audio rate.
    function NaAudio__Transport__PublishBarIfAdvanced(beatPosition) {
        const bar  =  Math.floor(beatPosition / beatsPerBar);
        if (bar === lastPublishedBar) return;

        lastPublishedBar  =  bar;
        NaAudio__EventBus__Publish(NaAudio__Event.TransportBarAdvanced, { Bar: bar });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Start and Stop
// -----------------------------------------------------------------------------

    // FUNCTION | Start the Transport
    // ------------------------------------------------------------
    export function NaAudio__Transport__Start() {
        if (isRunning) return;
        if (!AudioHost.NaAudio__AudioHost__IsUnlocked()) {
            console.warn('[NaAudio Transport] Start ignored: the audio context is not unlocked yet.');
            return;
        }

        const now  =  AudioHost.NaAudio__AudioHost__Now();

        isRunning        =  true;
        startAudioTime   =  now;
        scheduledUntil   =  now;
        lastPublishedBar =  -1;

        const intervalMs  =  AudioNumber('Transport', 'SchedulerIntervalMs');
        schedulerHandle   =  setInterval(NaAudio__Transport__Tick, intervalMs);
        NaAudio__Transport__Tick();                                           // <-- Fill the first window immediately rather than waiting a tick

        NaAudio__EventBus__Publish(NaAudio__Event.TransportStarted, { Bpm: currentBpm, AudioTime: now });
    }
    // ------------------------------------------------------------


    // FUNCTION | Stop the Transport and Rewind to the Start
    // ------------------------------------------------------------
    export function NaAudio__Transport__Stop() {
        if (!isRunning) return;

        const now  =  AudioHost.NaAudio__AudioHost__Now();

        clearInterval(schedulerHandle);
        schedulerHandle    =  0;
        isRunning          =  false;
        startBeatPosition  =  0;                                              // <-- Stop rewinds. Pause is a separate operation.

        NaAudio__EventBus__Publish(NaAudio__Event.TransportStopped, { AudioTime: now });
    }
    // ------------------------------------------------------------


    // FUNCTION | Pause the Transport, Keeping the Playhead Position
    // ------------------------------------------------------------
    export function NaAudio__Transport__Pause() {
        if (!isRunning) return;

        const beats  =  NaAudio__Transport__PlayheadBeats();

        clearInterval(schedulerHandle);
        schedulerHandle    =  0;
        isRunning          =  false;
        startBeatPosition  =  beats;

        NaAudio__EventBus__Publish(NaAudio__Event.TransportStopped, {
            AudioTime : AudioHost.NaAudio__AudioHost__Now()
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle Between Running and Stopped
    // ------------------------------------------------------------
    export function NaAudio__Transport__Toggle() {
        if (isRunning) NaAudio__Transport__Stop(); else NaAudio__Transport__Start();
        return isRunning;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Transport Is Running
    // ------------------------------------------------------------
    export function NaAudio__Transport__IsRunning() {
        return isRunning;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tempo
// -----------------------------------------------------------------------------

    // FUNCTION | Set the Tempo
    // ------------------------------------------------------------
    // Rebases the clock so the playhead does not jump. Changing BPM without
    // rebasing recomputes the whole elapsed history at the new rate, which teleports
    // the playhead - a tempo nudge from 96 to 120 would jump several bars.
    //
    // Already-scheduled events inside the lookahead window keep their old spacing.
    // That is correct: they are in the audio hardware's queue and pulling them back
    // is not possible. It is also inaudible, being at most a tenth of a second of
    // material.
    export function NaAudio__Transport__SetBpm(bpm) {
        const minimum  =  AudioNumber('Transport', 'MinBpm');
        const maximum  =  AudioNumber('Transport', 'MaxBpm');
        const clamped  =  NaAudio__MusicalMaths__Clamp(bpm, minimum, maximum);

        if (isRunning) {
            const now  =  AudioHost.NaAudio__AudioHost__Now();
            startBeatPosition  =  NaAudio__Transport__BeatAtAudioTime(now);     // <-- Rebase before the rate changes
            startAudioTime     =  now;
            scheduledUntil     =  Math.max(scheduledUntil, now);
        }

        currentBpm  =  clamped;
        NaAudio__EventBus__Publish(NaAudio__Event.TransportTempoChanged, { Bpm: clamped });
        return clamped;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Current Tempo
    // ------------------------------------------------------------
    export function NaAudio__Transport__Bpm() {
        return currentBpm;
    }
    // ------------------------------------------------------------


    // FUNCTION | Beats Per Bar
    // ------------------------------------------------------------
    export function NaAudio__Transport__BeatsPerBar() {
        return beatsPerBar;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Configured Swing Amount
    // ------------------------------------------------------------
    export function NaAudio__Transport__SwingAmount() {
        return AudioNumber('Transport', 'SwingAmount');
    }
    // ------------------------------------------------------------


    // FUNCTION | Snap a Delay Time to the Nearest Tempo-Synced Division
    // ------------------------------------------------------------
    // Divisions are declared in the effect rack config as fractions of a beat, so a
    // dial that lands near a musical value snaps onto it rather than sitting a few
    // milliseconds off and smearing the groove.
    export function NaAudio__Transport__SnapDelayToTempo(seconds, divisions) {
        const secondsPerBeat  =  NaAudio__MusicalMaths__SecondsPerBeat(currentBpm);

        let nearest       =  seconds;
        let nearestDelta  =  Infinity;

        for (let i = 0; i < divisions.length; i++) {
            const candidate  =  divisions[i] * secondsPerBeat;
            const delta      =  Math.abs(candidate - seconds);
            if (delta < nearestDelta) {
                nearestDelta  =  delta;
                nearest       =  candidate;
            }
        }
        return nearest;
    }
    // ------------------------------------------------------------


    // FUNCTION | Audio Clock Drift Behind the Scheduler
    // ------------------------------------------------------------
    // For the diagnostics readout: how much of the lookahead window is still unspent.
    // A number that trends toward zero while the transport runs means the scheduler
    // is not keeping up and steps are about to start dropping.
    export function NaAudio__Transport__LookaheadHeadroom() {
        if (!isRunning) return AudioNumber('Transport', 'LookaheadSeconds');
        return scheduledUntil - AudioHost.NaAudio__AudioHost__Now();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
