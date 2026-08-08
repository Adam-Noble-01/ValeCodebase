# NaAudio Loop Library

Bar-length audio that ships with AudioSPACE — drum breaks, atmospheric beds and tonal
chord loops. One-shots live in `05__Data__AudioSampleLibrary`.

---

## Read this first

`NaAudio__LoopLibraryIndex__.json` **is** the library. A static host has no directory
listing, so a loop absent from the index does not exist as far as the browser is
concerned — see the same note, at more length, in the sample library README.

```
python 60__Dev__WebBuildUtils/NaAudio__BuildUtil__AudioLibraryIndex__.py
```

---

## Folder structure

```
06__Data__AudioLoopLibrary/
├── NaAudio__LoopLibraryIndex__.json     ← GENERATED — never hand-edit
├── NaAudio__LoopLibrary__README__.md
├── 10__Loops__Breakbeat/
├── 20__Loops__Atmospheric/
└── 30__Loops__Tonal/
```

File naming: `NaAudio__Loop__{AssetId}__{ShortName}__.mp3`

| Prefix | Category |
|---|---|
| `LOP_BRK…` | Breakbeat |
| `LOP_ATM…` | Atmospheric |
| `LOP_TON…` | Tonal |

---

## Tempo is declared, not measured

An audio file carries no tempo. `SuggestedBpm`, `BarCount` and `MusicalKey` come from the
`LOOP_HINTS` table inside the build utility — they were read off the source material by
hand and typed in.

That is worth being blunt about, because the alternative looks tempting and is not: beat
detection on a four-bar atmospheric pad is unreliable enough that a wrong answer would
silently put every loop slightly out of time, which is far worse than a declared value
somebody can correct in one place.

A loop with a null `SuggestedBpm` is played at its recorded rate and is **not**
tempo-synced. That is the honest behaviour for material whose tempo nobody has
established.

---

## Nothing plays these yet

None of the three demonstration modules in this build binds a loop. The library is here
because the shape of the catalogue had to be settled early — the index schema, the naming,
the tempo hints and the licence trail all needed to exist before a module could rely on
them.

A loop player module is straightforward once one is wanted: read `SuggestedBpm`, set the
buffer source's `playbackRate` to `projectBpm / suggestedBpm`, and start it on a bar line
from the transport window. `NaAudio__SamplePlayer__Play` already takes `Loop`, `LoopStart`
and `LoopEnd`.

---

## Licensing

Every loop here is Apache-2.0, from GoogleChromeLabs / web-audio-samples. Full record in
[`NaAudio__AudioLibrary__ATTRIBUTION__.md`](../NaAudio__AudioLibrary__ATTRIBUTION__.md).

Note that the obvious upstream loop collection — `Tonejs/audio` `loop/` — is **not** here
and was excluded on purpose: it is CC BY-NC-SA, and a non-commercial clause cannot enter a
bank that may ship commercially.
