# NaAudio MIDI Pattern Library

Rhythmic and melodic patterns, stored as JSON rather than as binary `.mid` files.

---

## Why JSON and not .mid

Standard MIDI files are a good interchange format and a poor authoring format. They are
binary, so a pattern cannot be read, reviewed or diffed without a tool; and their timing
model is ticks-per-quarter-note, which quietly assumes a power-of-two grid.

That second point is the deciding one. The circular sequencer's whole premise is a **free
division count** — seven divisions across a bar is a first-class pattern here, and
expressing it in a tick-based format means either a tuplet encoding or a rounding error.
`PAT_DRM0002` in `10__Patterns__Drum` is exactly that case, and it is in the library
specifically so the format has to keep supporting it.

So patterns are authored as JSON in the terms the application actually thinks in:
divisions of a bar, scale degrees, voice roles.

**`.mid` import and export are still wanted** — nobody works in isolation, and a producer
will expect to drag a pattern out into a DAW. That belongs at the boundary, as a converter
either side of this format, not as the storage format itself.

---

## Folder structure

```
07__Data__MidiPatternLibrary/
├── NaAudio__MidiPatternLibrary__README__.md
├── 10__Patterns__Drum/       step patterns, one lane per voice role
├── 20__Patterns__Melodic/    single-line note sequences
└── 30__Patterns__Chord/      stacked degrees, one chord per bar
```

File naming: `NaAudio__Pattern__{PatternId}__{ShortName}__.json`

| Prefix | Category |
|---|---|
| `PAT_DRM…` | Drum |
| `PAT_MEL…` | Melodic |
| `PAT_CHD…` | Chord |

There is **no generated index** for this library, unlike the three audio banks. Patterns
are small text files, and nothing loads them at runtime yet — an index would be a
maintenance burden with nothing reading it. Add one when a pattern browser needs it.

---

## The three schemas

A pattern carries `NaAudio__Pattern__Meta` plus exactly one body block.

### Drum — `NaAudio__Pattern__Lanes`

```json
{ "VoiceRole": "kick", "Steps": "x...x...x...x...", "Velocity": 1.00 }
```

One character per division: `x` is a hit, `.` is a rest. `Steps` must be exactly
`Divisions` characters long.

The string form is deliberate. A sixteen-element array of booleans is unreadable in an
editor; `x...x...x...x...` is a picture of the rhythm, and a wrong pattern is visible at a
glance rather than needing to be counted out.

A lane names a **VoiceRole**, not an asset id, so a pattern is portable across every kit —
see the voice-role note in the sample library README.

### Melodic — `NaAudio__Pattern__Notes`

```json
{ "Beat": 2.0, "Degree": 4, "Length": 0.6, "Velocity": 0.66 }
```

`Beat` is a position in beats from the start, fractional allowed. `Degree` is a **scale
degree, not a semitone** — it is resolved against the pattern's `RootNote` and `Scale` by
`NaAudio__MusicalMaths__ScaleDegreeToMidi`, which wraps past the end of the scale and
climbs an octave. That means transposing or re-moding a pattern is a metadata change
rather than a rewrite.

### Chord — `NaAudio__Pattern__Chords`

```json
{ "Bar": 1, "Degrees": [5, 0, 2], "Length": 3.6, "Velocity": 0.58, "Label": "VI" }
```

Same degree convention, stacked. `Label` is the roman numeral, for reading only.

---

## Nothing loads these yet

No module reads this library in the current build. The demo space's sequencer pattern is
written inline in its own `Settings` block, which is the right place for a pattern that
belongs to one space.

The library exists because the format needed settling before a pattern browser or a
`HarmonyEngine` could be built against it — and because getting the free-division case
into the schema early is what stops it being retrofitted badly later.
