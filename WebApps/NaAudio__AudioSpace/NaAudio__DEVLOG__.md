# AudioSPACE Development Log
# =========================================================


# ---------------------------------------------------------
## NaAudio__AudioSpace v0.1.0 - 08-Aug-2026
### First light: the space exists, it makes a sound, and three of the manifest's modules are real

The initial build. Everything below is new.

This is the **environment**, not the DAW — a distinction worth stating plainly because the
thing renders convincingly enough to be mistaken for more than it is. The 3D space, the
audio engine and three spatial modules from the design manifest are real and working. The
four synthesis engines and the wider effect set are absent rather than stubbed, and the
help overlay says so on screen.

---

### The visual language

Kandinsky's *Composition A*, dialled a long way back. Flat geometric primitives on a warm
paper ground, thin dark linework, eight muted pigments used sparingly.

`Na__Palette__Config.json` is the single authority for colour across the 3D and the 2D
alike, and it carries an **AntiGlossRule** that `NaAudio__Env3d__MaterialLibrary` enforces
in code: metalness clamped to 0, roughness clamped to a floor, on every material the
library hands out. A specular highlight is the one thing that would break the
flat-pigment look, and a comment asking people not to do it is not a mechanism.

Colour is an **identity**, not decoration. A drum voice keeps its pigment on a sequencer
step, on a meter and on a patch cable, and the mapping lives in config rather than in
whichever module happened to draw it first.

#### The palette was wrong on the first pass, and the fix is worth recording
The first tune had five light terms summing to well over 2.5. Everything rendered pale —
every pigment pushed toward white, the whole composition beige mush, the pads invisible
against the floor. Cutting the fill terms hard, letting the key do the work, deepening the
pigments a step and dropping exposure to 0.94 fixed it. The lighting config now carries
that as a note, because it is the first place to look if the space ever looks pale again.

---

### The 3D environment

- **SceneManager** — five named scene groups, published as a vocabulary so no builder ever
  spells a group name as a literal. Draws **every frame**, unlike the sibling Lantern
  Designer's on-demand loop: something is always moving here, so an invalidate-driven loop
  would invalidate on every frame anyway, with the bookkeeping on top. Frame cost is
  managed by locking modules instead — which is the manifest's own strategy, and a
  user-facing decision about attention rather than a hidden optimisation.
- **CameraRig** — orbit with damping, four preset views, and an interruptible fly-to that
  keeps the current viewing angle. Arriving at a different angle than you left from is
  exactly the disorientation a spatially-navigated application cannot afford.
- **LightingRig** — four terms, one shadow caster. No HDRI: nothing in this space is
  metal, so image-based lighting would add nothing visible and cost a 25 MB download.
- **GroundStage** — floor, faint grid, centre datum marking the listener, and a **seeded**
  backdrop composition. Seeded so the composition is identical on every load; scenery that
  reshuffles on refresh cannot be learned, and spatial memory is the premise.
- **Interaction** — one raycaster and one set of pointer listeners for the whole
  application. Occlusion then works for free, which is impossible to get right with
  per-module raycasting. Four handle kinds: click, ground drag, axis drag, surface drag.

---

### The audio engine

- **AudioHost** — the only module that touches an `AudioContext` constructor. Owns the
  master chain: summing gain, limiter, analyser, destination. Nothing connects straight to
  destination.
- **Transport** — lookahead scheduling. A timer wakes every 25ms, plays nothing, and
  schedules everything inside the next 120ms stamped with **absolute audio times**. A late
  callback therefore still produces perfectly placed audio. Two clocks, kept apart on
  purpose: scheduling runs ahead on the audio clock, the visuals read the current playhead,
  and driving the animation from the scheduler would run the picture a tenth of a second
  ahead of the sound.
- **SamplePlayer** — a hard voice cap with oldest-voice stealing. Not a musical limit, a
  backstop: this is an instrument that invites stacking polyphony and building feedback
  paths, and without a cap that takes the tab down.
- **SynthVoice** — two detuned oscillators, an FM modulator, a resonant filter, an ADSR.
  Explicitly a **stand-in** for the manifest's engines; its parameter *names* are chosen to
  survive the eventual swap, so a real ChaosEngine drops in without touching the controller.
- **EffectRack** — convolution reverb, damped feedback delay, resonant filter. Three, not
  twelve, each chosen because its parameters map naturally onto a shape you can grab.

The whole layer is built to be **replaced**. The manifest names browser JavaScript as the
performance ceiling and a compiled core as the likely answer, so no spatial module holds an
`AudioContext`, reads `currentTime`, or connects to destination.

---

### The spatial module framework

The manifest specifies that every module lives in a bounding box that renders on all six
sides when locked. That is a property of *being* a module, so the **shell** — pad, cage,
selection ring, name plate, audio bus, placement handle — is framework-owned, and a module
type only ever fills the volume inside it.

A type is a plain object implementing `Build`, `Update`, `Schedule`, `OnLockChanged`,
`SetParameter`, `AudioInput`, `Dispose`. **`Update` and `Schedule` not being called while
locked *is* the lock mechanism** — a type cannot forget to check its own lock state.

The **PatchGraph** owns both halves of a cable: the Web Audio connection and the sagging
curve in the scene. `Connect()` does both or neither. The moment the picture and the
routing are two things they diverge, and the user's only way of understanding their own
patch becomes a lie.

---

### The three modules

**Circular Sequencer** — steps on a circle, marker sweeping at the project tempo, and a
**free division count**. That last one is the reason for the circle rather than a feature
added to it: three divisions of a bar *is* a triplet, seven is a seven, and neither needs a
tuplet mode bolted on. Four lanes, each a different geometric shape as well as a different
pigment — colour alone fails at distance and fails entirely for a colour vision deficiency.

**CubeMod** — six XY pads on the faces of one rotatable cube. Twelve dimensions where a
flat pad gives two, and the parameters are related *by position*, which is the manifest's
method-of-loci recall applied at the scale of a single device.

**DelayCloud** — an enclosure whose dimensions are the effect. Length is reverb decay,
width is delay time, height is damping; the mapping is declared in config, not written into
the module. Five spheres bounce inside it and every bounce is an audible tap, panned by
position and levelled by impact speed. It is also the only demo module that *processes*
audio, so it is the receiving end of the patch graph.

---

### The audio bank

86 samples across 7 kits, 9 loops, 10 impulse responses — **4.3 MB**, ingested from GitHub
under CC BY 3.0 and Apache-2.0.

The ingest script names **every single file that ships** rather than sweeping folders. The
upstream Tone.js audio repository alone is 333 MB and the Berklee collection is 2,398 files;
a sweep would drag all of it into a repository that has to stay servable as a static site.

Non-commercial material was **excluded on purpose** even where it was good, and the
exclusions are recorded next to the inclusions so the next person to look for them knows
they were considered.

The catalogue indexes are **generated from disk**, never hand-edited. A static host has no
directory listing, so an index is not a cache — it *is* the library, and a file absent from
it does not exist as far as the browser is concerned.

---

### Verified in a real browser

Booted in headless Chromium under Playwright and driven through the transport, the camera
presets, module selection, focus and lock. No page errors, no console errors, no failed
requests beyond the external font CDN, which is unreachable from the build sandbox.

Steady state with three working modules and the transport running: **~2.5ms frame time**,
14–22 live voices against a cap of 48, **zero stolen voices**.

#### One environment artefact worth knowing about
The diagnostics **Headroom** readout goes sharply negative in headless Chromium — it
oscillates between +120ms and −120ms. It is not an application fault. A probe of the raw
`AudioContext` clock in that environment shows `currentTime` advancing in bursts of up to
**500ms**, because a headless browser has no audio device and renders into a null sink. The
transport's catch-up guard handles it correctly by skipping the gap rather than firing a
burst of missed notes. On real hardware the clock advances in ~2.7ms render quanta and the
readout sits at its expected 95–120ms.

---

### Five bugs found and fixed during verification

- **CubeMod face plates were invisible.** They were oriented with `Object3D.lookAt`, which
  takes a **world-space** target — so aiming each plate at "its own normal" aimed all six at
  a point near the scene origin instead. The cube rendered as a plain bone box with no pads
  on it. Now spelled out as explicit Euler rotations, with the reason recorded next to them.
- **Module pads were invisible.** Built from a pigment's base tone, which is within a few
  percent of the floor colour. The pad is the module's drag handle *and* its click target,
  so an invisible pad is an unusable module rather than merely a subtle one. Now built from
  the deep tone.
- **A hard seam across the horizon.** Two causes, both now recorded in the fog config note:
  the fog colour did not match the scene background, and `FogFar` was further out than the
  floor plane's own edge, so the floor was only 40% fogged where it ran out.
- **Nothing in the 3D space could be clicked.** The HUD layer is pointer-transparent with
  its children opting back in, which was written as a blanket `#NaAudio__App__Hud > *`
  rule. That looked equivalent to naming them and was not: the help overlay is a
  full-viewport child that sets `pointer-events: none` on itself while hidden, and an id
  selector out-specifies a class one. The blanket rule won, an invisible sheet covered the
  entire viewport, and every pointer event was swallowed before the canvas saw it — with
  nothing visibly wrong to explain why. Each panel is now named explicitly.
- **A locked module threw every frame.** `ModuleStates.locked.CageColour` is `SlateBlue` —
  a pigment, chosen so a locked cage reads as a different *kind* of state rather than a
  darker one — but the shell resolved cage colours through the ink table only. The loud
  config accessor caught it immediately and by name, which is exactly what it is for.
  Cage colours now resolve from either family through `NaAudio__Palette__Resolve`.

#### Verified by measurement, not by eye
Locking is the manifest's central resource mechanism, so it was measured rather than
observed. Peak level on the sequencer's own bus across four seconds of playback:
**0.535 before the lock, 0.000 while locked, 0.189 after unlocking** — while a second,
never-locked module held steady at ~0.37 throughout, confirming the silence is the module
and not the master.

Selection, ground-plane drag with grid snap (−4.2, 1.8 → −4.0, 2.0), the fly-to focus, the
lock transition reaching full blend, and both patch cables reporting a live audio
connection were all confirmed the same way.

---

### Deliberately not built

- Rendered bounce and looped animation capture on lock — hooks marked in `LockState`
- Automatic locking — off, because until the bounce path exists an auto-locked module
  simply goes quiet, and a DAW that silences your work while you look away is not one
  anybody uses twice
- A timeline — the manifest names spatial/linear integration as open, and it is still open
- Saving — static build, no server; a save button that appeared to work would be a lie
- A PWA service worker — worth having for the audio bank, not yet worth the surface

---

#### Note on the development handle
`window.NaAudio__Dev` publishes a frozen, read-only handle onto the surface, the module
registry and the transport — but **only while `ShowDiagnostics` is true**, so it travels
with the readout it belongs beside. The application is ESM end to end and nothing is
global, which is correct and also leaves no way to reach any of it from the console or from
a browser-driven check. Nothing inside AudioSPACE reads it; the moment a module does, the
module graph stops being the module graph.

#### Added
- `NaAudio__App__.html`, `NaAudio__LocalServer__Localhost__.py`, launchers, `package.json`
- `02__Src__AppModules/` — 24 modules across AppCore, AppUtils, Env3d, Audio, Spatial, Hud
- `03__Style__AppStylesheets/` — 4 sheets, plus 2 module-local sheets
- `04__Src__Dependencies__VersionLocked/` — curated Three.js v0.184.0 drop and its index
- `05` / `06` / `08` — the shipped audio banks, their generated indexes and their READMEs
- `07__Data__MidiPatternLibrary/` — 4 seed patterns and the format README
- `09__Data__PatchLibrary/30__Patches__SpaceScene/` — the demo space, as data
- `20` to `25__Generated__` — user data folders, documented and gitignored
- `60__Dev__WebBuildUtils/` — the audio library index generator
- `61__Dev__AssetAuthoring__SampleLibraryIngest/` — the curated GitHub ingest
- `NaAudio__AudioLibrary__ATTRIBUTION__.md`, `NaAudio__README__.md`
