# AudioSPACE Development Log
# =========================================================


# ---------------------------------------------------------
## NaAudio__AudioSpace v0.2.0 - 08-Aug-2026
### Build and Play modes, and a control bank for the circular sequencer

The v0.1.0 build had a fault that only shows up once somebody actually uses it: a module
and its controls occupy the same pixels, so reaching to *move* a sequencer reprograms it
instead. One gesture, no undo, no symptom — the pattern is simply different afterwards and
nothing says so. This release is mostly about making that impossible.

---

### Two modes

**Play** is the default and is what v0.1.0 always was, minus the hazard: controls are live,
modules are pinned. **Build** inverts it — pads drag, every control in the scene is frozen,
and the floor grid comes up to say so.

`NaAudio__AppCore__ModeManager__.mjs` is new and holds the mode. It is deliberately in
AppCore rather than in the HUD: the mode governs the interaction layer, and a HUD panel
owning state that the 3D pipeline must obey is the wrong direction of dependency. It
publishes `ModeChanged`, and the indicator, the ground grid and anything else are all just
subscribers.

#### It is enforced in one place, not in twenty
Every handle registered with `NaAudio__Env3d__Interaction` may now carry `ClickModes` and
`DragModes`. Omitting them means "live in both", so nothing pre-existing had to change.
`NaAudio__Env3d__Interaction__IsHandleLive` is checked inside the pick loop, and that
placement is the whole trick:

> A handle that is dead in the current mode is skipped by the raycast rather than picked
> and ignored — **so it stops occluding.** In Build, a click passes *through* a sequencer
> step and lands on the pad beneath it.

Had the check sat at the callback instead, Build mode would have been unusable on exactly
the modules that need it most: a densely-stepped sequencer is almost entirely covered by
its own controls, and there would have been nowhere left to grab it.

The cursor is part of the same mechanism — `grab` only where a drag is actually live, so
the pointer answers "can I move this" before the user commits to finding out.

#### The indicator is louder than anything else in this interface
`NaAudio__Hud__ModeIndicator__.mjs` states the mode three times over: a switch naming both
options, a full-width coloured rule along the top edge, and the cursor. That is more than
this deliberately quiet interface would normally allow, and it is the right trade — a modal
interface's one serious failure is acting in the mode you are not in, and here that failure
is silent in both directions. The rule matters most of the three: it sits in peripheral
vision permanently, so the mode is known without being read.

**Tab** toggles, with `preventDefault` — otherwise the browser walks focus out of the
canvas and the next keystroke goes somewhere else entirely.

---

### The circular sequencer grew controls

A small square on the near corner of the pad doubles the base width and reveals a bank of
five sliders. Folding it away again restores the original footprint.
`NaAudio__ModuleBase__SetBaseWidthFactor` rebuilds the pad and cage at the new width and
shifts the whole thing by half the growth, so the module's *contents* stay exactly where
they were — the base opens outward rather than the sequencer jumping sideways.

`NaAudio__Env3d__ControlFactory__.mjs` is new and builds both the sliders and the button.
The knob is a real object on a real rail, dragged along a world axis, and where the slider
is detented the knob still follows the hand continuously and settles onto the nearest
position on release. Quantising the knob's *position* instead would make it feel like it
were fighting the pointer.

| Slider | Detents | Notes |
|---|---|---|
| **Cycle** | 4 / 2 / 1 / ½ / ¼ bars | Revolution length as musical time, not as a tempo number |
| **Feel** | regular, on-beat, triplet, dotted | Where the steps sit on the circle |
| **Wobble** | continuous | How far a step may drift from its slot |
| **Chance** | continuous | How often that drift happens |
| **Bank** | 4 kits | Placeholder for a kit browser; the kits behind it are real |

#### One function owns where a step is
Both the scheduler and the geometry call
`NaAudio__CircularSequencer__StepFraction`. Feel and Wobble move the fraction, and the
block and the trigger follow it together. Where a step *sits* is where it *plays* — with
two copies of that arithmetic the picture and the ear would eventually disagree, and that
class of bug is close to undebuggable because both halves look correct in isolation.

#### Wobble draws its dice in a fixed order
Per step, the chance roll is drawn from the seeded stream **before** the amount roll. So
raising the depth changes how far the wobbling steps move without reshuffling *which* steps
wobble — the groove deepens rather than becoming a different groove. Swapping those two
draws would destroy that silently, and it would present as a bug in the ear rather than
anywhere in the code.

A late step also detunes flat in proportion to its lateness, because a record platter
losing speed drops pitch as well as time. That is what makes it read as *wobble* rather
than as timing jitter.

#### Reading the pattern at a glance
Lit steps are opaque, silent ones nearly transparent. Growth alone was not enough — at
plan distance every step still read as active. A triangle outside the rings now points at
the start of the cycle, which a circle otherwise has no way of telling you.

Step blocks are already sized from a per-step velocity that is wired end to end and pinned
at full; `StepVelocitySizeMin/Max` are in config and applied. Only the gesture to set it is
missing.

---

### Six things that went wrong on the way

- **The start marker threw `Unknown pigment "Ink"`.** It asked the body-material path for
  an ink colour. Added `NaAudio__Materials__FlatMarker` — unlit `MeshBasicMaterial` via the
  palette's `Resolve` helper, which is correct for a mark printed on the floor anyway,
  since a floor mark should not shade.
- **Step transparency did nothing.** `ApplyPresentation` was **assigning**
  `material.opacity`, wiping every per-step value on the next pass. It now stores
  `userData.NaAudio__BaseOpacity` and *multiplies* the module's body opacity into it.
  `NaAudio__ModuleBase__SetMaterialOpacity` is the one sanctioned write path. Measured
  after: active 1.0, inactive 0.22.
- **A `SpriteMaterial` on a `Mesh`** threw `Cannot read properties of undefined (reading
  'x')` from deep inside `setValueV2f`. The sprite shader's centre and rotation uniforms
  are never supplied by the mesh render path. Added
  `NaAudio__Materials__OwnedFlatLabel`, a `MeshBasicMaterial`.
- **Five slider labels overlapped.** Camera-facing sprites in a receding row converge, and
  staggering their heights only helps at some angles. Replaced with flat legends printed
  on the deck like panel markings — they also stopped being labels for the distance-fade
  sweep, which is why `BuildFlat` is deliberately not stamped `NaAudio__IsLabel`.
- **A Build-mode drag test reported STUCK.** Not an app bug: in Play the pad drag correctly
  falls through to OrbitControls, which orbits the camera and moves the module *on screen*.
  The test was re-using stale screen coordinates across the mode switch. Re-projecting after
  switching gave the correct MOVED.
- **`SyntaxError: Unexpected token ')'`** from an over-greedy replacement while converting
  the control builders to arrow functions. Mentioned only because it cost more time than a
  stray paren has any right to.

#### Added
- `01__AppCore/NaAudio__AppCore__ModeManager__.mjs`
- `05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__ControlFactory__.mjs`
- `40__System__HudOverlay/NaAudio__Hud__ModeIndicator__.mjs`

#### Changed
- `NaAudio__Env3d__Interaction__.mjs` — `ClickModes` / `DragModes` on every handle, checked
  inside the pick loop
- `NaAudio__Spatial__ModuleBase__.mjs` — mode-gated pad drag, multiplied opacity,
  `SetMaterialOpacity`, `SetBaseWidthFactor`
- `NaAudio__Module__CircularSequencer__.mjs` — grid templates, wobble, kit switching, the
  control bank, the start marker, step transparency
- `NaAudio__Env3d__MaterialLibrary__.mjs` — `FlatMarker`, `OwnedFlatLabel`
- `NaAudio__Env3d__Labels3d__.mjs` — `BuildFlat`
- `NaAudio__Env3d__GroundStage__.mjs` — `SetGridEmphasis`
- `NaAudio__AppCore__EventBus__.mjs` — `ModeChanged`
- `Na__SpatialModules__Config.json` — the `Modes` block and the sequencer's new keys
- `NaAudio__CoreUi__Styles__BaseLayout__.css` — the mode rule and switch
- `NaAudio__Hud__HelpOverlay__.mjs`, `NaAudio__README__.md` — the modes and the control bank


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
