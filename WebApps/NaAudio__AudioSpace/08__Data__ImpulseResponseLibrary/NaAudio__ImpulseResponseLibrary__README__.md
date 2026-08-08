# NaAudio Impulse Response Library

Impulse responses for the convolution reverb in `NaAudio__Engine__EffectRack`.

---

## Read this first

`NaAudio__ImpulseResponseIndex__.json` **is** the library — a response absent from it does
not exist as far as the browser is concerned. Regenerate after any change:

```
python 60__Dev__WebBuildUtils/NaAudio__BuildUtil__AudioLibraryIndex__.py
```

---

## Folder structure

```
08__Data__ImpulseResponseLibrary/
├── NaAudio__ImpulseResponseIndex__.json     ← GENERATED — never hand-edit
├── NaAudio__ImpulseResponseLibrary__README__.md
├── 10__Ir__Rooms/           plausible spaces, ordered small to large
└── 20__Ir__Unnatural/       combs, springs, reversals, metallic blooms
```

File naming: `NaAudio__Ir__{AssetId}__{ShortName}__.mp3`

---

## Order matters in `10__Ir__Rooms`

The DelayCloud maps its box **length** onto this set: a longer box selects a later
response. The category is therefore ordered small room to large room, and that ordering is
load-bearing rather than cosmetic.

Insert a response out of order and dragging the box longer will make the space
audibly *smaller* at one point in its travel — which reads as a bug in the drag, not as a
mis-sorted file, and is correspondingly annoying to trace.

Ids sort in the intended order, so keeping new entries numerically in place is enough.

---

## Why the box selects a response rather than turning a decay knob

A convolution reverb has no decay parameter. Its decay **is** the impulse response, so
changing perceived room size means swapping the buffer.

That has a consequence worth knowing: swapping a convolver's buffer cuts its current tail
dead. `NaAudio__DelayCloud__SelectImpulseForSize` therefore steps between responses and
guards against re-selecting the one already loaded — without that guard, dragging the
handle would swap the buffer on every frame and produce a stuttering rasp instead of a
room growing.

---

## Licensing

Every response here is Apache-2.0, from GoogleChromeLabs / web-audio-samples. Full record
in [`NaAudio__AudioLibrary__ATTRIBUTION__.md`](../NaAudio__AudioLibrary__ATTRIBUTION__.md).
