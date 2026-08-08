# NaAudio Patch Library

Saved settings. Three kinds, at three scales.

```
09__Data__PatchLibrary/
├── NaAudio__PatchLibrary__README__.md
├── 10__Patches__Instrument/    one instrument module's parameters
├── 20__Patches__Effect/        one effect module's parameters
└── 30__Patches__SpaceScene/    a whole space: modules, positions, cables
```

| Kind | Prefix | Scale |
|---|---|---|
| Instrument | `INS_` | One module |
| Effect | `EFX_` | One module |
| Space | `SCN_` | Everything |

---

## The space file is the boot document

`30__Patches__SpaceScene/NaAudio__Space__SCN0001__DemoSpace__.json` is what AudioSPACE
opens with. It is named in `NaAudio__AppConfig__Main__Runtime.BootSpacePath`.

That the demo arrangement is **data and not a bootstrap function** matters for three
reasons, and only the first is tidiness:

1. A new arrangement is authored by editing JSON, not by editing code.
2. The save format and the load format are the same format from day one. A save path
   bolted on later is how a format ends up with fields the loader silently ignores.
3. The demo cannot drift out of step with the loader, because the loader is the only thing
   that has ever built it.

`NaAudio__ModuleRegistry__SerialiseSpace` and `NaAudio__PatchGraph__Serialise` already
write this shape back out, so round-tripping works — there is simply nowhere to write it
to yet. See the persistence note below.

---

## Space file shape

```json
{
  "NaAudio__Space__Meta"    : { "SpaceId", "Name", "Bpm", "MusicalKey", ... },
  "NaAudio__Space__Modules" : [ { "ModuleId", "TypeName", "DisplayName",
                                  "Position": {"x","z"}, "IsLocked", "Settings" } ],
  "NaAudio__Space__Cables"  : [ { "CableId", "FromModuleId", "ToModuleId",
                                  "SignalType", "TargetParameter", "Depth" } ]
}
```

**Modules load before cables, always.** A cable needs both of its endpoints to exist, and a
space file is free to list a cable before the modules it joins. `NaAudio__AppCore__Init`
enforces the order; do not merge the two passes.

`Position` carries `x` and `z` only. Height is not a placement axis — modules stand on the
ground plane, and the hover lift writes `y` at runtime.

`Settings` is passed through untouched to the module type. Its shape is the type's own
business, which is why a new module type needs no change to the space format.

---

## SignalType

| Type | Carried how |
|---|---|
| `audio` | A real Web Audio connection into the destination's `AudioInput` |
| `sidechain` | Same, into the same input |
| `modulation` | **Polled every frame** — source meter written into `TargetParameter` |
| `trigger` | Polled, not yet consumed by any module type |

Modulation cables cost more per frame than audio cables, because Web Audio has no path
from an analyser reading to an application-level parameter. That asymmetry is real and is
worth knowing before building a space with thirty of them.

---

## Persistence — nothing is saved yet

`PersistenceMode` in `NaAudio__AppConfig__Main__.json` is `sessionOnly`. This is a static
build with no server behind it: the browser **cannot** write into these folders, and a save
button that appeared to work would be a lie.

When a save path lands it writes into `23__Generated__UserPatches` and
`24__Generated__UserSpaceProjects`, which exist and are empty for exactly that reason.
This folder stays read-only and version-controlled — shipped patches, not user patches.
