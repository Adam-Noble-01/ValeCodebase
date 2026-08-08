# AudioSPACE

**Spatial Music Production Environment** — v0.1.0, Environment Prototype

A 3D environment for building a piece of music as a *place* rather than as a list of
tracks. Everything you can see is a control; everything that makes a sound is somewhere.

Built against **AudioSPACE Concept Manifest 1.0.0**.

---

## Run it

```
Start__NaAudio__Localhost__8010__.bat          Windows, double-click
python NaAudio__LocalServer__Localhost__.py --open    anywhere else
```

Then <http://127.0.0.1:8010/NaAudio__App__.html>.

A server is not optional. ES modules are blocked under `file://`, so opening the HTML
directly gives a blank page and a CORS error.

Port **8010** is reserved for AudioSPACE. 8001–8006 belong to the sibling Vale apps.

---

## What this build actually is

It is the **environment**, not the DAW. That distinction is worth being blunt about,
because the thing renders convincingly enough to be mistaken for more than it is.

### Built and working

- The 3D space — renderer, camera rig with preset views and fly-to focus, lighting,
  ground stage, backdrop composition, pointer interaction with hover, click and three
  kinds of drag
- A **lookahead audio scheduler** on the audio clock, with sample playback, a hard voice
  cap and voice stealing
- **Three spatial modules from the manifest**, real and audible:
  - **Circular Sequencer** — steps on a circle, free division count, four lanes, one
    geometric shape per drum voice
  - **CubeMod** — six XY pads on the faces of a rotatable cube, twelve axes, driving a
    small synth voice
  - **DelayCloud** — an enclosure whose dimensions *are* the delay and reverb parameters,
    with bouncing spheres that trigger taps
- **Patch cables** that are the routing, not a picture of it
- The **working / locked dual state**, with real CPU and audio consequences
- A catalogued starter bank — 86 samples across 7 kits, 9 loops, 10 impulse responses

### Designed but not built

Absent rather than stubbed out, deliberately — an empty module reads as "implemented" to
everyone including its author six months later.

- The four synthesis engines: ChaosEngine, ContemplationEngine, FluxEngine, HarmonyEngine.
  CubeMod drives a stand-in voice whose *parameter names* are chosen to survive the swap.
- The wider effect and modulator set: WaveFold, FractalEcho, DimensionMatrix, GravityMix,
  PulseField, HarmonicCloud, SoundFabric and the rest.
- **Rendered bounce and looped animation capture on lock.** A locked module currently falls
  silent and freezes. The hooks and the reasoning are marked in
  `NaAudio__Spatial__LockState__.mjs`.
- A **timeline**. The manifest names spatial/linear integration as an open question. It
  is still open.
- **Saving.** Nothing is written to disk — this is a static build with no server behind it.

---

## Project structure

```
NaAudio__AudioSpace/
├── NaAudio__App__.html                        the shell — one canvas, one HUD, one script
├── NaAudio__LocalServer__Localhost__.py       static server, correct MIME types, range support
├── Start__NaAudio__Localhost__8010__.bat/.ps1
├── NaAudio__AudioLibrary__ATTRIBUTION__.md    licence record for every shipped audio file
│
├── 01__AppAssets__NaAudio/                    icons and app imagery
├── 02__Src__AppModules/
│   ├── 01__AppCore/                           EventBus, ConfigLoader, Init
│   ├── 02__AppData/                           app config, palette config
│   ├── 03__AppUtils/                          ConfigAccess, MusicalMaths, SeededRandom
│   ├── 05__Env3d__ThreeRenderPipeline/        scene, camera, lighting, materials, shapes,
│   │                                          lines, labels, interaction, palette
│   ├── 10__Audio__WebAudioEngine/             AudioHost, Transport, SamplePlayer,
│   │                                          SynthVoice, EffectRack
│   ├── 15__Audio__SampleLibraryLoader/        catalogue queries and the decode cache
│   ├── 20__System__SpatialModuleFramework/    ModuleBase, ModuleRegistry, LockState, PatchGraph
│   ├── 25__Module__CircularSequencer/
│   ├── 26__Module__CubeMod/
│   ├── 27__Module__DelayCloud/
│   └── 40__System__HudOverlay/                BootGate, TransportBar, Inspector, Help, Diagnostics
├── 03__Style__AppStylesheets/                 one index, @importing module-local sheets
├── 04__Src__Dependencies__VersionLocked/      curated Three.js v0.184.0 drop
│
├── 05__Data__AudioSampleLibrary/              ┐
├── 06__Data__AudioLoopLibrary/                │ SHIPPED — version controlled,
├── 07__Data__MidiPatternLibrary/              │ read-only at runtime
├── 08__Data__ImpulseResponseLibrary/          │
├── 09__Data__PatchLibrary/                    ┘  (holds the boot space)
│
├── 20__Generated__UserAudioSamples/           ┐
├── 21__Generated__UserAudioLoops/             │ GENERATED — user data, gitignored,
├── 22__Generated__UserMidiPatterns/           │ empty until there is a server
├── 23__Generated__UserPatches/                │
├── 24__Generated__UserSpaceProjects/          │
├── 25__Generated__RenderedBounces/            ┘
│
├── 60__Dev__WebBuildUtils/                    audio library index generator
└── 61__Dev__AssetAuthoring__SampleLibraryIngest/   curated ingest from GitHub
```

### The shipped / generated split

Every loader resolves its root from `NaAudio__AppConfig__Main__LibraryRegistry` or
`…__UserDataRegistry`, never from a hardcoded path. The generated folders are empty now,
and exist now, because that split is very expensive to introduce late.

---

## Rules that will bite you if you do not know them

**The catalogue index *is* the library.** A static host has no directory listing. An audio
file not in `NaAudio__SampleLibraryIndex__.json` is invisible to the app no matter how
plainly it sits on disk. After adding audio:

```
python 60__Dev__WebBuildUtils/NaAudio__BuildUtil__AudioLibraryIndex__.py
```

**No tuning value is a literal.** Everything numeric comes through
`NaAudio__AppUtils__ConfigAccess`, which throws loudly on a missing key rather than
falling back. There is deliberately no fallback table — see the note in that file.

**Colour lives in one place.** `Na__Palette__Config.json` is the authority for the 3D and
the 2D alike. `NaAudio__CoreUi__Styles__Variables__.css` mirrors it by hand because a
browser cannot read a custom property out of JSON. Change one, change the other.

**Nothing is glossy.** `NaAudio__Env3d__MaterialLibrary` clamps metalness to 0 and
roughness to a floor on every material it hands out. That is enforced in code, not just
asked for in a comment.

**The boot gate cannot be deleted.** Every browser suspends a fresh `AudioContext` until a
real user gesture. Without it the app is silent with no error anywhere. It can be *moved*
onto some other first interaction; it cannot be attached to nothing.

---

## Where the interesting decisions are written down

Each module's header explains what it does and, more usefully, what it refuses to do.
The ones worth reading first:

| File | Explains |
|---|---|
| `NaAudio__Engine__Transport__.mjs` | Why lookahead scheduling is the only workable pattern, and why there are two clocks |
| `NaAudio__Engine__AudioHost__.mjs` | Why every module talks through this layer — it is built to be replaced by a compiled core |
| `NaAudio__Spatial__ModuleBase__.mjs` | The shell/type split, and why not calling `Update` *is* the lock mechanism |
| `NaAudio__Spatial__LockState__.mjs` | Exactly which parts of the manifest's lock spec are built and which are not |
| `NaAudio__Env3d__SceneManager__.mjs` | Why this loop draws every frame where the Lantern Designer's does not |
| `NaAudio__Env3d__Interaction__.mjs` | Why one central raycaster, and why the four-pixel drag threshold matters |
| `NaAudio__Hud__ModuleInspector__.mjs` | Why the inspector exposes no parameters at all |

---

## Rebuilding the sample bank

```
python 61__Dev__AssetAuthoring__SampleLibraryIngest/NaAudio__AssetAuthoring__SampleLibraryIngest__.py --clone
python 60__Dev__WebBuildUtils/NaAudio__BuildUtil__AudioLibraryIndex__.py
```

The ingest script names every single file that ships, rather than sweeping folders. The
upstream repositories run to hundreds of megabytes; the shipped bank is 4.3 MB because
somebody chose each byte of it.

Everything shipped is CC BY 3.0 or Apache-2.0. Non-commercial material was excluded on
purpose, and the exclusions are recorded alongside the inclusions.

---

## Dependencies

**Three.js v0.184.0**, MIT, vendored as a curated file drop — nine files, 2.2 MB, listed in
`NaAudio__Dependencies__ImportMap__Index__.json`. There is no build step and no
`node_modules` at runtime; the import map in the HTML shell resolves the bare specifiers.

The audio engine has **no dependency at all** — it is the browser's own Web Audio API,
which is a deliberate stance given that layer is expected to be replaced.
