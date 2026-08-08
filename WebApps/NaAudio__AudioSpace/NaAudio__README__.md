# AudioSPACE

**Spatial Music Production Environment** — v0.2.0, Environment Prototype

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

## Build and Play

The space has two modes and is never in neither. **Tab** switches; the coloured rule across
the top edge and the switch beneath it say which is on.

| | **Play** *(default)* | **Build** |
|---|---|---|
| Module controls | live | frozen |
| Module pads | pinned | draggable |
| Floor grid | quiet | emphasised |

The reason is a failure mode rather than a feature: a control and a module occupy the same
pixels, so reaching to move a sequencer and reprogramming its pattern instead is a single
gesture — one with no undo and no visible symptom. Separating the two makes that
impossible in either direction.

It is enforced in one place. Every interaction handle carries `ClickModes` and `DragModes`,
and `NaAudio__Env3d__Interaction` refuses to pick a handle whose modes exclude the current
one. A dead handle does not merely ignore its click, it stops occluding — so in Build a
click passes *through* a sequencer step and lands on the pad underneath, which is what
makes dragging a densely-covered module possible at all.

Mode is not a HUD concern that modules consult. `NaAudio__AppCore__ModeManager` is the
authority, it publishes `ModeChanged` on the bus, and the HUD indicator is just another
subscriber.

---

## The sequencer control bank

The small square on the near corner of the sequencer pad doubles the base width and
reveals five sliders — real 3D knobs on real rails, grabbed and dragged, not sprites.

| Slider | Does |
|---|---|
| **Cycle** | Revolution length, detented to 4 / 2 / 1 / ½ / ¼ bars |
| **Feel** | Step placement — regular, on-beat, triplet, dotted |
| **Wobble** | How far a step may drift from its slot |
| **Chance** | How often that drift happens |
| **Bank** | Four kit positions (a placeholder for a kit browser) |

Two things about this are worth knowing before changing it.

**Where a step sits is where it plays.** The scheduler and the geometry both call
`NaAudio__CircularSequencer__StepFraction`. Feel and Wobble move the *fraction*, and the
block and the trigger follow it together — there is no second copy of the timing to drift
out of agreement with the picture.

**Wobble draws its dice in a fixed order.** For each step the chance roll is drawn *before*
the amount roll, from the same seeded stream. So raising the depth changes how far the
wobbling steps move without reshuffling *which* steps wobble — the groove deepens instead
of becoming a different groove. Reversing those two draws would silently destroy that, and
it would look like a bug in the ear rather than in the code.

A drifting step also detunes slightly flat, in proportion to how late it is, because a
record platter losing speed drops pitch as well as time.

Lit steps are opaque and silent ones nearly transparent, and a triangle outside the rings
points at the start of the cycle.

---

## What this build actually is

It is the **environment**, not the DAW. That distinction is worth being blunt about,
because the thing renders convincingly enough to be mistaken for more than it is.

### Built and working

- The 3D space — renderer, camera rig with preset views and fly-to focus, lighting,
  ground stage, backdrop composition, pointer interaction with hover, click and three
  kinds of drag
- **Build and Play modes**, gating every handle in the scene rather than every module
  checking for itself
- A **lookahead audio scheduler** on the audio clock, with sample playback, a hard voice
  cap and voice stealing
- **Three spatial modules from the manifest**, real and audible:
  - **Circular Sequencer** — steps on a circle, free division count, four lanes, one
    geometric shape per drum voice, plus an expanding control bank of five 3D sliders
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
- **Per-step velocity.** The sequencer sizes its step blocks from a velocity value that is
  wired end to end and pinned at full — `StepVelocitySizeMin/Max` are already in the config
  and already applied. What is missing is the gesture that sets it.
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
│   ├── 01__AppCore/                           EventBus, ConfigLoader, ModeManager, Init
│   ├── 02__AppData/                           app config, palette config
│   ├── 03__AppUtils/                          ConfigAccess, MusicalMaths, SeededRandom
│   ├── 05__Env3d__ThreeRenderPipeline/        scene, camera, lighting, materials, shapes,
│   │                                          lines, labels, interaction, palette,
│   │                                          ControlFactory (3D sliders and buttons)
│   ├── 10__Audio__WebAudioEngine/             AudioHost, Transport, SamplePlayer,
│   │                                          SynthVoice, EffectRack
│   ├── 15__Audio__SampleLibraryLoader/        catalogue queries and the decode cache
│   ├── 20__System__SpatialModuleFramework/    ModuleBase, ModuleRegistry, LockState, PatchGraph
│   ├── 25__Module__CircularSequencer/
│   ├── 26__Module__CubeMod/
│   ├── 27__Module__DelayCloud/
│   └── 40__System__HudOverlay/                BootGate, TransportBar, ModeIndicator,
│                                              Inspector, Help, Diagnostics
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

**Never assign `material.opacity` on a module.** `ApplyPresentation` multiplies a module's
body opacity into whatever each material already carries in
`userData.NaAudio__BaseOpacity`, which is how the sequencer's transparent inactive steps
survive a hover. Write per-material opacity through
`NaAudio__ModuleBase__SetMaterialOpacity` and nowhere else — a direct assignment is erased
on the next presentation pass, silently and only sometimes.

**A `SpriteMaterial` on a `Mesh` throws.** Flat deck legends use
`NaAudio__Materials__OwnedFlatLabel` (a `MeshBasicMaterial`); only actual sprites get
`SpriteMaterial`. The sprite shader's centre and rotation uniforms are never supplied by
the mesh render path, and the failure surfaces far away as a null read inside
`setValueV2f`.

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
| `NaAudio__Env3d__Interaction__.mjs` | Why one central raycaster, why the four-pixel drag threshold matters, and why a mode-dead handle stops occluding |
| `NaAudio__AppCore__ModeManager__.mjs` | Why the mode is core rather than HUD state, and why Play is the default |
| `NaAudio__Hud__ModeIndicator__.mjs` | Why the mode is stated three times over in an otherwise deliberately quiet interface |
| `NaAudio__Module__CircularSequencer__.mjs` | The grid templates, and the draw order that keeps wobble stable as depth rises |
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
