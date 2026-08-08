# NaAudio Sample Library

One-shot audio that ships with AudioSPACE. Drum kits, a multisampled piano, synth hits
and struck objects. Loops live in `06__Data__AudioLoopLibrary`; impulse responses live in
`08__Data__ImpulseResponseLibrary`.

---

## Read this first

A static host has **no directory listing**. A browser cannot ask what is in a folder, so
`NaAudio__SampleLibraryIndex__.json` is not a cache or a convenience — it **is** the
library as far as the running application is concerned.

**An audio file that is not in the index does not exist.** Drop an mp3 into a bank folder
without regenerating, and it will be plainly visible on disk and completely unselectable
in the app. That failure mode is baffling if you do not know this rule, which is why it
is the first thing in this file.

```
python 60__Dev__WebBuildUtils/NaAudio__BuildUtil__AudioLibraryIndex__.py
```

---

## Folder structure

```
05__Data__AudioSampleLibrary/
├── NaAudio__SampleLibraryIndex__.json     ← GENERATED — never hand-edit
├── NaAudio__SampleLibrary__README__.md
├── 10__Drums__ElectronicKits/
│   ├── KIT__Cr78/          KIT__Linn/        KIT__Kpr77/
│   └── KIT__Techno/        KIT__FourOpFm/
├── 20__Drums__AcousticKit/
│   └── KIT__AcousticStudio/
├── 30__Perc__HandDrums/
│   ├── KIT__Bongos/
│   └── (loose one-shots)
├── 40__Tonal__GrandPiano/
├── 50__Tonal__SynthOneShots/
└── 60__Fx__ObjectHits/
```

File naming: `NaAudio__Sample__{AssetId}__{ShortName}__.mp3`

The build utility parses that pattern to derive identity, and the folder supplies the
classification. A file that does not match the pattern is skipped with a warning rather
than being silently included under a guessed name.

---

## Asset ids

| Prefix | Meaning | Example |
|---|---|---|
| `SMP_DRM…` | Drum kit voice | `SMP_DRM10101` — kit block 101, voice 01 |
| `SMP_PRC…` | Loose percussion | `SMP_PRC0311` |
| `SMP_PNO…` | Grand piano sample point | `SMP_PNO0410` |
| `SMP_SYN…` | Synth one-shot | `SMP_SYN0503` |
| `SMP_FXH…` | Object hit or effect | `SMP_FXH0612` |

Ids are stable and are stored inside saved spaces. **Renaming one breaks every space that
references it**, so an id is retired rather than reused.

---

## Bank kinds

The `BankKind` field on each category tells the runtime how to treat the folder.

| Kind | Behaviour |
|---|---|
| `kit` | Holds one sub-folder per kit. Each kit is bound to a sequencer as a unit. |
| `multisample` | Pitched sample points. The player resamples between them. |
| `pool` | A flat bag of one-shots the user picks from individually. |

---

## Voice roles — why a lane binds to a role, not a file

A sequencer lane binds to a **VoiceRole** — `kick`, `snare`, `hihat`, `tomLow`, `tomMid`,
`tomHigh` — and the chosen kit answers with whatever sample fills it.

That indirection is the whole point. It means the entire kit can be swapped underneath a
pattern and every lane still points at something sensible, which is exactly how a drum
machine should behave. Binding a lane directly to an asset id would make a kit change a
manual re-patch of every lane.

Roles also carry colour: `Na__Palette__Config.json` maps each role to a pigment, so a
kick is the same terracotta on a sequencer step, on a meter and on a patch cable.

---

## The grand piano is sampled at minor thirds

`40__Tonal__GrandPiano` holds C, D♯, F♯ and A in each octave from C2 to C6 — seventeen
files rather than sixty-one.

The sample player covers the gaps by resampling the nearest point, which is a real-time
playback-rate change and therefore audibly stretches the sound if pushed too far. A
minor-third spacing means no note is ever more than one semitone from a recorded one,
which is inaudible. Octave spacing would be a quarter of the download and would sound
obviously wrong at the extremes.

Octave numbering: **middle C is C4**, MIDI 60. Some libraries call it C3. The build
utility derives `MidiNote` on the C4 convention and
`NaAudio__AppUtils__MusicalMaths` agrees with it.

---

## Licensing

Every file here is CC BY 3.0 or Apache-2.0. Full attribution, and the record of what was
deliberately excluded and why, is in
[`NaAudio__AudioLibrary__ATTRIBUTION__.md`](../NaAudio__AudioLibrary__ATTRIBUTION__.md)
at the project root.

**Adding material means adding its attribution.** An asset with no licence record is an
asset nobody can safely ship.
