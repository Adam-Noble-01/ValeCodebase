# AudioSPACE Development Log
# =========================================================


# ---------------------------------------------------------
## NaAudio__AudioSpace v0.3.2 - 08-Aug-2026
### Leads route around the instruments instead of straight through them

Dropping the leads onto the floor in v0.3.1 made the patch legible from above and
immediately made a second problem visible: a lead between two distant modules ran
straight across whatever lay between, so it passed through the middle of other
instruments. On the ground that reads worse than it did in the air, because a lead
crossing a pad looks like it is plugged into that module too.

`NaAudio__Spatial__CableRouter` now finds a path that goes around. Every module is an
obstacle except the two a lead is plugged into.

---

### Push-out relaxation, not a visibility graph

Start with the two-point line, find the segment penetrating an obstacle most deeply,
insert one waypoint on that obstacle's boundary on the side the line already favours,
repeat. One waypoint per pass with a re-scan from the start each time, so a waypoint
added to clear one module is itself checked against the rest.

It is not the shortest path. A visibility graph over tangent points would be, and would
cost a graph build and a Dijkstra per cable per frame for a result nobody can tell apart
at this scale - the paths differ by centimetres with four obstacles in play, and the
relaxed one is smoother because it was never a sequence of tangent arcs.

Modules are treated as circles around their LIVE base width, so an expanded sequencer
pushes leads clear of its workbench and not merely of its ring.

---

### The polyline is not the thing that gets drawn

Relaxing the straight line turned out to be only half the job, and it is the half that
does not hold. What gets swept is a centripetal Catmull-Rom THROUGH those points, and a
spline bows between its points - so a polyline clearing an obstacle comfortably can still
be drawn curving well inside it.

Measured, with a module moved into the middle of a run: the straight-line test passed
with no waypoint inserted at all, and the tube that got drawn ended up **54mm inside the
output post's footprint**.

So there is a second pass that assembles the actual curve - same class, same centripetal
parameterisation the cable factory uses, because checking a different curve to the one
that gets drawn is not checking anything - samples it, and pushes out whatever it finds.
The cheap straight-line pass is kept in front of it because it costs almost nothing and
leaves the expensive pass with less to do.

Measured after, worst clearance from any module a lead is not plugged into:

    boot layout                    1.675 m
    one module moved into a run    0.414 m
    modules packed to a 2.5m ring  0.210 m

All positive. Nothing crosses anything.

---

### Cost, and why the steady state is free

Routing every cable every frame is what lets a lead find its way around a module WHILE
that module is being dragged, rather than snapping to a new path once it lands. It is
also pointless when nothing has moved.

The patch graph now takes a one-number signature of the layout - every module's position
and live base width - and skips a cable entirely when the signature is unchanged and its
lead-out springs have stopped. Y is in the signature because the hover lift moves a
module a few centimetres and a lead has to stay in its socket while it rises.

Measured in the headless software renderer, which is noisy enough that the same
comparison spread across 3.5, 5.4 and 10.5 ms on repeat runs - so the absolute numbers
are not worth quoting. The useful signal is that idle and re-routing-every-frame are the
same to within the noise: **117.4 ms against 118.5 ms** median frame interval. With the
skip in, routing does not register.

---

### The caps are real and they are reported

Both the waypoint count and the iteration count are bounded. A cluster whose clearance
circles overlap into a ring encloses the space inside it and has no clear route at all -
and without a bound the loop would insert waypoints until the frame died. Forced into
exactly that, with three modules practically touching, the router hits its cap, draws the
lead crossing something, and says so once.

That is the honest outcome. A lead taking a bad line is a far smaller lie than a lead
that vanishes.

#### Added
- `20__System__SpatialModuleFramework/NaAudio__Spatial__CableRouter__.mjs`

#### Changed
- `NaAudio__Env3d__CableFactory__.mjs` - sweeps a supplied path through a centripetal
  Catmull-Rom rather than deciding its own two control points; springs the lead-outs only
- `NaAudio__Spatial__PatchGraph__.mjs` - routes each cable, and skips idle ones
- `NaAudio__Spatial__WiringController__.mjs` - the lead in hand routes on the same terms,
  so what you see while dragging is the line the finished cable will take
- `Na__SpatialModules__Config.json` - `CableObstacleClearance`, `CableRouteSmoothingMargin`,
  `CableRouteMaxWaypoints`, `CableRouteIterations`


# ---------------------------------------------------------
## NaAudio__AudioSpace v0.3.1 - 08-Aug-2026
### Stop means stop, leads lie on the floor, and every axis drag was lying about its distance

Four fixes from actually using the thing. One of them had been silently breaking every
axis drag in the application since the day they were written.

---

### Every DragAxis handle reported the same travel, forever

    total.copy(SCRATCH_AXIS).multiplyScalar(total.dot(SCRATCH_AXIS));

That line reads correctly and is wrong. JavaScript evaluates `total.copy(SCRATCH_AXIS)`
BEFORE it evaluates the argument, so by the time `total.dot(SCRATCH_AXIS)` runs, `total`
IS the axis and the dot product is axis-dot-axis - which is 1, always.

So every axis-constrained drag reported exactly one metre of travel in the positive
direction, no matter how far the pointer moved or which way. Measured before the fix, a
slider dragged left and a slider dragged right both wrote the identical value ten frames
running: `[1.163, 1.163, 1.163, ...]` for a rightward drag and `[2.163, 2.163, ...]` for
the leftward one that followed - the same +1.163 of travel added to a start point that
had already been clamped.

It presented as 'the sliders only drag one way and will not come back', which is exactly
what it was. It also silently broke the DelayCloud's resize handles, which are the same
handle kind: the box could only ever grow.

The dot products are now taken into locals first. Verified both directions from three
camera angles, plus a detented slider stepping 2 -> 4 -> 2.

---

### The sliders were vertical, and should never have been

Standing posts with knobs riding up and down them. Two things wrong, one cosmetic and one
fatal.

Cosmetic: a bank of five vertical posts reads as a row of aerials. Flat tracks lying on
the deck read as a mixing desk, which is what a control bank is.

Fatal: a vertical slider is dragged on a plane that CONTAINS the vertical axis and faces
the camera. Looking down at a deck - which is the only way anybody looks at a control
bank - that plane is nearly edge-on to the view, so the pointer ray meets it at a glancing
angle and, past the plane's horizon, does not meet it at all. Even with the dot-product
bug fixed, a vertical slider would have been unreliable from the one camera angle that
matters.

Tracks now run along X, the knob is a fader cap sliding left to right, and each row
carries its legend at the HEAD of its track so the bank reads like a channel strip.

---

### Leads run along the ground

Sockets used to sit at nearly half the cage height and stand off the cage, so every lead
left at chest height and arced across the space - a cat's cradle strung between the
instruments. Worse, the arcs crossed the airspace above other modules, so a busy space
was unreadable from any angle that was not directly overhead.

Sockets are now SMALL and sit on the rim of the module's own pad at a fixed low height,
and both cable control points sit at CableGroundHeight. A lead leaves its socket, meets
the floor and runs across it. The patch reads as one continuous ground plan of the signal
and nothing is hidden behind a cable.

The sag and its floor clamp are gone with the arc that needed them. The spring stayed but
moved: it used to chase a sag depth and now each control point chases its own target, so
dragging a module whips its leads along the floor rather than swinging them through the
air.

---

### The DelayCloud carried on playing after Stop

Two separate reasons, and fixing only the first was not enough.

Its spheres are a physics simulation whose bounces TRIGGER SAMPLES, which makes it the
one module type whose Update makes a sound. Every other module makes its sound from
Schedule, which the transport drives and which therefore stops when the transport stops.
This one is driven by the render loop, so it kept bouncing and kept playing. The spheres
now freeze with the transport - they represent taps of incoming audio, and there is no
incoming audio when nothing is playing.

That alone left it ringing. A feedback delay recirculates what is already inside it, and
at the ceiling of 0.82 that is a loop losing under a fifth of its energy per pass. Draining
the feedback on stop fixed the sustain but not the duration: measured, the tail was still
at **-35 dBFS eleven seconds after Stop**, decaying at about a decibel a second, because
the reverb behind it convolves against a room this module exists to let you make large.

So the module also gates its own output now, through a dedicated node rather than the
module bus - the bus is what the LOCK state silences, and two things ramping one gain
would fight. Both ramp rather than cut, because a gain step to zero on a ringing tail is
a worse artefact than the tail was. Measured after: **linear 0.0, meter 0.0** three
seconds after Stop and still silent at eleven.

Space was already bound to play and stop, and was verified working with focus on the
canvas and after clicking the Play button with the mouse - `preventDefault` on keydown
stops the focused button re-activating, so the two do not cancel out.

#### Changed
- `NaAudio__Env3d__Interaction__.mjs` - the axis-constraint evaluation order
- `NaAudio__Env3d__ControlFactory__.mjs` - horizontal tracks, fader caps, head legends
- `NaAudio__Env3d__CableFactory__.mjs` - ground run replaces the sag; per-control-point springs
- `NaAudio__Spatial__PortFactory__.mjs` - small sockets on the pad rim at a fixed low height
- `NaAudio__Module__DelayCloud__.mjs` - transport gating, tail drain and an output gate
- `NaAudio__Engine__EffectRack__.mjs` - `SetDelayTailOpen`
- `Na__SpatialModules__Config.json` - `CableGroundHeight`, `PortHeight`, `TailDrainSeconds`,
  smaller port sizes, wider control bank inset


# ---------------------------------------------------------
## NaAudio__AudioSpace v0.3.0 - 08-Aug-2026
### The ground becomes islands, the signal becomes visible, and patching becomes a gesture

Three changes that turn out to be one change. The ground now exists only where the music
does; the master output is an object standing in the space; and there is a third mode whose
whole job is patching. Each of them makes the space more of a PLACE and less of a diagram,
which is the only claim the manifest's spatial premise actually rests on.

---

### The ground is a field

A uniform dark slab from horizon to horizon says nothing. Now every module contributes a
soft circular influence to a scalar field, the influences SUM, and ground appears where the
sum clears a threshold. Everything outside fades to the background paper.

The summing is the whole design. Three modules in a triangle produce ONE triangular island
with soft blurred edges, because the sum in the middle clears the threshold even though no
single module reaches that far. Three separate discs would leave a hole in the centre and
read as three objects rather than one group. Zoomed out, a space now reads as clusters of
activity separated by empty paper - and the shape of each island describes the arrangement
that made it.

It reshapes continuously while a module is dragged, because the field is per fragment per
frame and there is no geometry to rebuild. That fluidity was the point of doing it this way
rather than with decals.

#### Injected into the stock materials, after the fog chunk
`NaAudio__Env3d__GroundField` uses `onBeforeCompile` on the floor and both grid materials
rather than supplying a `ShaderMaterial`. The floor receives the one shadow the rig casts,
and a hand-written material would have to reimplement shadow receiving, fog and tone mapping
to keep it - three things three.js already does correctly and none of them interesting to
own.

The splice sits immediately AFTER `#include <fog_fragment>`, and that position is
load-bearing. By then the fragment has been lit, tone mapped, converted to output colour
space and fogged, so the void colour is in the same space as the fog colour and the scene
background. Mixing any earlier tone-maps the void, it stops matching the background it is
pretending to be, and every island grows a faint visible rim.

#### The one place NaAudio__ is not the convention
GLSL ES reserves any identifier containing two consecutive underscores. `vNaAudio__FieldWorld`
is rejected outright by the compiler, along with every uniform beside it, and the whole scene
renders as an unlit black silhouette with the reason buried in a shader log. The in-shader
symbols are therefore `vNaAudioFieldWorld`, `uNaAudioFieldCount` and so on. It is documented
at the top of the constants block, because it looks like a mistake.

---

### Nothing reaches the speakers except through a cable

`CreateModuleBus` no longer connects the bus to the master. The only route out of the space
is a lead into an **Output Post** - a tapered post at the centre whose `AudioInput` returns
the master bus itself, and whose column is the master meter.

Before this, every module wired itself to the master on creation. That is the sane
prototype default and it made the signal flow a lie: the cables described part of the
routing and an invisible rule described the rest, so following a lead with your eye taught
you nothing about what you were hearing.

Now 'audible' is a property you can see. Series and parallel stop being concepts and become
what the leads happen to do - two instruments into the post are heard dry side by side, one
into an effect and the effect into the post is heard only processed, and nothing enforces
either arrangement.

Measured rather than assumed. Master peak with the demonstration patch intact **0.885**;
with the post's leads pulled **0.000**; repatched **0.751**.

The cost is that a newly added module is silent until it is patched. Unfamiliar for about
ten seconds, and then obviously right - it is how every piece of hardware on a desk behaves.
`LoadFromSpace` warns when a space has no route to any post, because that is the one broken
patch that looks completely normal and is completely silent.

---

### Leads that behave like leads

Cables were quadratic Beziers drawn as `THREE.Line`. Cheap, correct, and at any real orbit
distance they read as annotation over the space rather than objects in it - a hairline that
thins with distance and has no ends. The manifest's argument for spatial routing is that a
cable is a THING you can follow with your eye and reach for, and a hairline is not a thing.

`NaAudio__Env3d__CableFactory` now sweeps a tube along a cubic Bezier with a moulded plug at
each end. Three details do the work:

- **It leaves along the socket's own axis** before it droops. Without that the lead emerges
  sideways from the socket, which nothing physical does, and the plug at that end has to
  point somewhere arbitrary. This is the single detail that sells the whole thing.
- **The slack is a damped spring**, not a computed sag. Dragging a module makes the leads
  lag, overshoot and settle. That is the difference between a cable that moves and a cable
  that is redrawn.
- **Parallel transport, not a Frenet frame.** A Frenet normal flips through an inflection
  point and a sagging lead has one exactly in the middle, which shows up as the tube
  visibly twisting once per drag.

The tube is written by hand into a preallocated buffer with a static index buffer.
`THREE.TubeGeometry` builds a fresh geometry and allocates a `Vector3` per sample point per
call, and a dragged module with three leads would produce several hundred throwaway
geometries a second.

---

### Sockets, and a third mode to use them in

Every module now carries a visible input and output socket, built by the framework beside
the pad and the cage. Ports used to be positions and nothing else, on the reasoning that a
cable arriving somewhere already shows where it arrived. That was right while cables came
from a file; it stops being right the moment the user has to CREATE one, because then the
port is the target of a gesture and a target you cannot see is a target you cannot hit.

**Wiring** is the third mode. Modules pinned, every control frozen, sockets and leads the
only live things in the scene - so they can stay small and quiet rather than having to shout
over the controls beside them. Tab steps forward through Build, Play and Wiring; Shift+Tab
steps back, which stops mattering only if you never want the mode you just left.

`NaAudio__Spatial__WiringController` runs both patching gestures from ONE piece of state:

    drag start      hold the port
    drag release    on a socket, land. on nothing, keep holding.
    click           hold if nothing is held, land if something is.

'Release on nothing keeps holding' is what makes drag-to-patch and click-click-to-patch the
same machine rather than two half-implementations with two ways to be half-patched.
Direction is resolved rather than demanded - patch output-first or input-first and the
controller sorts it out.

Unplugging is a click on the LEAD, anywhere along its length, because a socket with three
leads in it cannot say which one a click meant.

---

### Three bugs, one of them serious

- **A hand-made cable silently destroyed one from the space file.** `cableCounter` starts at
  zero and knows nothing about ids supplied by a space document. The demonstration space
  names its cables CBL_0001 upward, so the first cable patched by hand was generated as
  CBL_0001 and `CABLES.set` overwrote the file's cable of that name - leaving its lead in
  the scene owned by nothing, its interaction handle registered, and its audio connection
  live with no record of it. The patch you could see and the patch you could hear parted
  company on the first connection anybody made. The generator now skips ids already in use,
  and an explicit duplicate is refused rather than allowed to replace what is there.
  Found by driving the UI; nothing about reading the code suggested it.

- **Every lead vanished into the floor at its midpoint.** Sag proportional to span, sockets
  under a metre up, and four-metre runs in the demonstration space. The rest sag is now
  clamped so the belly of the curve clears a configured floor clearance - against three
  quarters of the control-point displacement, which is what a cubic Bezier actually reaches
  at its midpoint.

- **The output post's collar wrote opacity onto a SHARED material.** `FlatMarker` is library
  owned and handed to every flat mark on the floor, so selecting the post would have
  brightened all of them. Added `OwnedFlatMarker`. Cloning the shared one is not the fix -
  `Material.copy` deep-copies userData, so the clone arrives carrying the shared stamp and
  the scene manager then refuses to dispose it for the rest of the session.

A fourth thing looked like a bug twice and was not: a drag test reported the ports
unreachable, because the preceding Play-mode drag correctly fell through to OrbitControls,
which orbited the camera and left the test projecting into a view that no longer existed.
The same class of test artefact as the Build-mode drag in v0.2.0.

### A second pass, once there was something to look at

Four more, all found by rendering the space and looking at it rather than by reading the
code. None of them would have surfaced in a unit test.

- **Every module had an input socket; only two modules take audio.** The port factory gave
  each module both sockets by default, so a sequencer and a CubeMod carried a green input
  you could drag a lead into - the connection was made, the lead was drawn, and it carried
  nothing. That is precisely the divergence between the picture and the routing that this
  file's header spends a paragraph arguing against. Sources now declare `HasInput: false`
  and get no input socket, and `Connect` REFUSES an audio cable into a module with no
  `AudioInput` rather than taking it and warning. Better no lead than a lead that is not
  true.

- **The name plate had become a lid.** A module label is world-scaled, and the fade only
  ever handled the far end - so closing on a module made its plate fill the screen while
  hanging directly over the thing it names. Harmless until the sequencer grew a control
  bank, at which point leaning in to work the sliders put a giant word 'Pulse' across
  them. Labels now fade at BOTH ends: hidden below five metres, full by nine. Working a
  module puts the camera three to six metres out; scanning the space for one by name
  happens from ten and beyond, so the two uses separate cleanly.

- **The lead in hand came out pale grey.** `PaintGhost` added cream emissive to an ochre
  barrel, which drives every channel toward white - a lead that has lost its colour rather
  than a lead that is lit. It now emits its own pigment, so it deepens into a glowing ochre
  and stays plainly distinct from the terracotta of a patched lead.

- **Slider deck legends overlapped.** The flat legends were 0.62 wide against a slider
  spacing of 0.60. Because they lie flat on the deck the overlap only appears once the
  camera drops to an oblique angle - fine in plan, a pile of stacked cards the moment
  anybody leans in to use the bank. The legend is now narrower than the gap it sits in.

Plugs also moved from `Ink` to `InkSoft`: at full ink a plug was the darkest thing in the
space by a wide margin, and two per lead turned a quiet patch into a scatter of black
lozenges that pulled the eye off the instruments.

#### Added
- `01__AppCore/NaAudio__AppCore__ModeManager__.mjs` - Wiring joins Build and Play
- `05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__GroundField__.mjs`
- `05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__CableFactory__.mjs`
- `20__System__SpatialModuleFramework/NaAudio__Spatial__PortFactory__.mjs`
- `20__System__SpatialModuleFramework/NaAudio__Spatial__WiringController__.mjs`
- `28__Module__OutputPost/NaAudio__Module__OutputPost__.mjs`

#### Changed
- `NaAudio__Engine__AudioHost__.mjs` - a module bus no longer connects itself to the master
- `NaAudio__Spatial__PatchGraph__.mjs` - tube cables, cable click-to-unplug, port normals,
  unique-id minting, the no-route-to-output warning
- `NaAudio__Spatial__ModuleBase__.mjs` - ports, ground influence, port offsets as the single
  authority for where a socket is
- `NaAudio__Env3d__Interaction__.mjs` - `HandleUnderPointer`, pointer-move hooks,
  `PointerAtHeight`
- `NaAudio__Env3d__LineFactory__.mjs` - cables moved out entirely
- `NaAudio__Env3d__MaterialLibrary__.mjs` - `OwnedCable` is now lit, plus `OwnedPlug`,
  `OwnedPort`, `OwnedFlatMarker`
- `NaAudio__Env3d__SceneManager__.mjs` - patch cables joined the pickable set
- `NaAudio__Env3d__GroundStage__.mjs` - binds the floor and grid to the field
- `NaAudio__Hud__ModeIndicator__.mjs` - the switch is driven off the published mode order
- `Na__Env3d__Config.json`, `Na__SpatialModules__Config.json`, the demonstration space,
  the help overlay, the stylesheet and the README


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
