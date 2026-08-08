/* =============================================================================
   NAAUDIO - APP UTILS | MUSICAL MATHS
   =============================================================================

   FILE       : NaAudio__AppUtils__MusicalMaths__.mjs
   NAMESPACE  : NaAudio
   MODULE     : AppUtils - MusicalMaths
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Note, pitch, tempo and scale conversions used across the engine
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Pure functions. No state, no audio nodes, no Three.js. Safe to import from
     the audio engine, the spatial modules and the HUD alike.
   - Holds every conversion that would otherwise be written inline three times
     with three slightly different constants - the classic source of an
     instrument that is a few cents out of tune with the one beside it.

   ---------------------------------------------------------------------------

   CONVENTIONS FIXED HERE:
       MIDI 69   = A4 = 440 Hz             (concert pitch, not 432 or 442)
       MIDI 60   = C4 = middle C           (Yamaha / scientific octave numbering)
       Beat      = one quarter note
       Bar       = BeatsPerBar quarter notes, from the transport config

   The octave numbering matters and is worth stating: some sample libraries call
   middle C 'C3'. The Salamander piano set this application ships uses C4, and
   NaAudio__BuildUtil__AudioLibraryIndex derives its MidiNote field on the same
   assumption, so the two agree.

   ============================================================================= */

// =============================================================================
// REGION | Musical Maths
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Pitch Reference and Note Names
    // ------------------------------------------------------------
    const CONCERT_PITCH_HZ    =  440.0;                                      // <-- A4
    const CONCERT_PITCH_MIDI  =  69;                                         // <-- MIDI number of A4
    const SEMITONES_PER_OCT   =  12;
    const CENTS_PER_SEMITONE  =  100;

    const NOTE_NAMES_SHARP    =  ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const NOTE_SEMITONES  =  {
        'C'  : 0,  'C#' : 1,  'DB' : 1,
        'D'  : 2,  'D#' : 3,  'EB' : 3,
        'E'  : 4,  'FB' : 4,
        'F'  : 5,  'F#' : 6,  'GB' : 6,
        'G'  : 7,  'G#' : 8,  'AB' : 8,
        'A'  : 9,  'A#' : 10, 'BB' : 10,
        'B'  : 11, 'CB' : 11
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Scale Interval Sets
    // ------------------------------------------------------------
    // Semitone offsets from the root. Used by the harmony helpers so a module can
    // quantise a free gesture onto something musical rather than chromatic.
    export const NaAudio__MusicalMaths__Scales  =  {
        chromatic       : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        major           : [0, 2, 4, 5, 7, 9, 11],
        naturalMinor    : [0, 2, 3, 5, 7, 8, 10],
        harmonicMinor   : [0, 2, 3, 5, 7, 8, 11],
        dorian          : [0, 2, 3, 5, 7, 9, 10],
        phrygian        : [0, 1, 3, 5, 7, 8, 10],
        lydian          : [0, 2, 4, 6, 7, 9, 11],
        mixolydian      : [0, 2, 4, 5, 7, 9, 10],
        pentatonicMajor : [0, 2, 4, 7, 9],
        pentatonicMinor : [0, 3, 5, 7, 10],
        blues           : [0, 3, 5, 6, 7, 10],
        wholeTone       : [0, 2, 4, 6, 8, 10]
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pitch Conversions
// -----------------------------------------------------------------------------

    // FUNCTION | MIDI Note Number to Frequency in Hertz
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__MidiToFrequency(midiNote) {
        return CONCERT_PITCH_HZ * Math.pow(2, (midiNote - CONCERT_PITCH_MIDI) / SEMITONES_PER_OCT);
    }
    // ------------------------------------------------------------


    // FUNCTION | Frequency in Hertz to Fractional MIDI Note Number
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__FrequencyToMidi(frequencyHz) {
        if (frequencyHz <= 0) return 0;                                       // <-- Silence has no pitch; 0 is safer than -Infinity
        return CONCERT_PITCH_MIDI + SEMITONES_PER_OCT * Math.log2(frequencyHz / CONCERT_PITCH_HZ);
    }
    // ------------------------------------------------------------


    // FUNCTION | Note Name to MIDI Note Number
    // ------------------------------------------------------------
    // Accepts 'C4', 'F#3', 'Bb2', 'Ds4' - the last because that is how a sharp is
    // spelled in a filename, where '#' is not welcome. Returns null on anything
    // unparseable rather than guessing, so a bad binding surfaces at load.
    export function NaAudio__MusicalMaths__NoteNameToMidi(noteName) {
        if (typeof noteName !== 'string') return null;

        const match  =  noteName.trim().match(/^([A-Ga-g])(#|b|s|S)?(-?\d+)$/);
        if (!match) return null;

        const letter      =  match[1].toUpperCase();
        const accidental  =  (match[2] || '').toUpperCase();
        const octave      =  parseInt(match[3], 10);

        const accidentalKey  =  (accidental === 'S') ? '#' : accidental;      // <-- 'Ds4' and 'D#4' are the same note
        const semitone       =  NOTE_SEMITONES[letter + accidentalKey];
        if (semitone === undefined) return null;

        return semitone + (octave + 1) * SEMITONES_PER_OCT;                   // <-- +1 because MIDI 0 is C-1
    }
    // ------------------------------------------------------------


    // FUNCTION | MIDI Note Number to Note Name
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__MidiToNoteName(midiNote) {
        const rounded   =  Math.round(midiNote);
        const semitone  =  ((rounded % SEMITONES_PER_OCT) + SEMITONES_PER_OCT) % SEMITONES_PER_OCT;
        const octave    =  Math.floor(rounded / SEMITONES_PER_OCT) - 1;
        return NOTE_NAMES_SHARP[semitone] + octave;
    }
    // ------------------------------------------------------------


    // FUNCTION | Playback Rate to Shift a Sample From One Pitch to Another
    // ------------------------------------------------------------
    // This is how the multisampled piano covers the gaps between its sample
    // points: the nearest recorded note is resampled by this ratio. Beyond a few
    // semitones it audibly stretches, which is why the bank is sampled at minor
    // thirds rather than at octaves.
    export function NaAudio__MusicalMaths__PlaybackRateForPitchShift(sourceMidi, targetMidi) {
        return Math.pow(2, (targetMidi - sourceMidi) / SEMITONES_PER_OCT);
    }
    // ------------------------------------------------------------


    // FUNCTION | Cents to a Playback Rate or Detune Ratio
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__CentsToRatio(cents) {
        return Math.pow(2, cents / (CENTS_PER_SEMITONE * SEMITONES_PER_OCT));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tempo Conversions
// -----------------------------------------------------------------------------

    // FUNCTION | Seconds Per Beat at a Tempo
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__SecondsPerBeat(bpm) {
        return 60.0 / bpm;
    }
    // ------------------------------------------------------------


    // FUNCTION | Seconds Per Bar at a Tempo
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__SecondsPerBar(bpm, beatsPerBar) {
        return (60.0 / bpm) * beatsPerBar;
    }
    // ------------------------------------------------------------


    // FUNCTION | Seconds Per Step for a Free Division of a Bar
    // ------------------------------------------------------------
    // The circular sequencer's whole premise is that the division count is free,
    // so a bar is divided by whatever number the user dialled in rather than by a
    // power of two. Seven divisions of a bar is a perfectly legal request here.
    export function NaAudio__MusicalMaths__SecondsPerDivision(bpm, beatsPerBar, divisions) {
        if (divisions <= 0) return 0;
        return NaAudio__MusicalMaths__SecondsPerBar(bpm, beatsPerBar) / divisions;
    }
    // ------------------------------------------------------------


    // FUNCTION | Swing Offset for a Step
    // ------------------------------------------------------------
    // Pushes every second subdivision later by a fraction of a step. Returns
    // seconds to add to the step's scheduled time; zero swing returns zero.
    export function NaAudio__MusicalMaths__SwingOffsetSeconds(stepIndex, secondsPerStep, swingAmount) {
        if (!swingAmount) return 0;
        return (stepIndex % 2 === 1) ? secondsPerStep * swingAmount * 0.5 : 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scale and Range Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Quantise a MIDI Note Onto a Scale
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__QuantiseToScale(midiNote, rootMidi, scaleName) {
        const intervals  =  NaAudio__MusicalMaths__Scales[scaleName] || NaAudio__MusicalMaths__Scales.chromatic;

        const offset      =  Math.round(midiNote) - rootMidi;
        const octave      =  Math.floor(offset / SEMITONES_PER_OCT);
        const inOctave    =  ((offset % SEMITONES_PER_OCT) + SEMITONES_PER_OCT) % SEMITONES_PER_OCT;

        let nearest       =  intervals[0];
        let nearestDelta  =  SEMITONES_PER_OCT;
        for (let i = 0; i < intervals.length; i++) {
            const delta  =  Math.abs(intervals[i] - inOctave);
            if (delta < nearestDelta) {
                nearestDelta  =  delta;
                nearest       =  intervals[i];
            }
        }

        return rootMidi + octave * SEMITONES_PER_OCT + nearest;
    }
    // ------------------------------------------------------------


    // FUNCTION | Nth Degree of a Scale as a MIDI Note
    // ------------------------------------------------------------
    // Degree may run past the end of the scale and wraps up an octave, so a module
    // can walk a scale indefinitely by incrementing one integer.
    export function NaAudio__MusicalMaths__ScaleDegreeToMidi(degree, rootMidi, scaleName) {
        const intervals  =  NaAudio__MusicalMaths__Scales[scaleName] || NaAudio__MusicalMaths__Scales.chromatic;
        const count      =  intervals.length;

        const octave     =  Math.floor(degree / count);
        const index      =  ((degree % count) + count) % count;

        return rootMidi + octave * SEMITONES_PER_OCT + intervals[index];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Linear Interpolation
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__Lerp(from, to, amount) {
        return from + (to - from) * amount;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp a Value Into a Range
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__Clamp(value, minimum, maximum) {
        return value < minimum ? minimum : (value > maximum ? maximum : value);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Map a Normalised 0 to 1 Value Onto a Range
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__MapNormalised(normalised, minimum, maximum) {
        const clamped  =  NaAudio__MusicalMaths__Clamp(normalised, 0, 1);
        return minimum + (maximum - minimum) * clamped;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Map a Normalised Value Onto a Range Exponentially
    // ------------------------------------------------------------
    // Frequency, delay time and filter cutoff are all heard logarithmically, so a
    // linear drag across a pad feels wrong on every one of them - the bottom half
    // of the travel does almost nothing. Every frequency-like parameter in
    // AudioSPACE maps through here.
    export function NaAudio__MusicalMaths__MapNormalisedExponential(normalised, minimum, maximum) {
        const clamped  =  NaAudio__MusicalMaths__Clamp(normalised, 0, 1);
        if (minimum <= 0) return NaAudio__MusicalMaths__MapNormalised(clamped, minimum, maximum);
        return minimum * Math.pow(maximum / minimum, clamped);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Decibels to a Linear Gain Multiplier
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__DecibelsToGain(decibels) {
        return Math.pow(10, decibels / 20);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Linear Gain to Decibels
    // ------------------------------------------------------------
    export function NaAudio__MusicalMaths__GainToDecibels(gain) {
        if (gain <= 0) return -Infinity;
        return 20 * Math.log10(gain);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
