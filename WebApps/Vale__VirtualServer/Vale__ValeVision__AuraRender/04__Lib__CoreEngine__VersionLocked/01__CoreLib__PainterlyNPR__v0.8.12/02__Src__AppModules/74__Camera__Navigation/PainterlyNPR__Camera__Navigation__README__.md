# 74__Camera__Navigation

**70-79 · Camera, views and sheets** · real code since v0.5.4

How the 3D camera is moved by hand: ValeVision 3D's orbit mode, without its orbit helper cube. Free navigation by
mouse, fingers and keys, attached to whatever element shows the drawing - PainterlyNPR's own sheet, and every
wrapper's view (ValeVision AURA's 3D Environment, through its engine host).

**Files** (v0.5.4)

- `Na__Navigation__Config.json` - the mappings: every button, wheel, finger and key binding, the speeds, the limits
  and the damping, each with its note (the AudioSPACE form)
- `PainterlyNPR__Navigation__Mappings__.mjs` - reads the config; MatchPointer, MatchKey, DampingFor (a constants module)
- `PainterlyNPR__Navigation__CameraMoves__.mjs` - what a gesture does to State.Camera: orbit, screen-space pan, dolly,
  zoom, the keyboard's move, the resets, the guards (zoom range, tilt, the floor)
- `PainterlyNPR__Navigation__MouseHandler__.mjs` - mouse and pen: drags, the accelerating wheel, the right button's menu
- `PainterlyNPR__Navigation__TouchHandler__.mjs` - fingers: one orbits, two pinch and pan, a tap is a tap
- `PainterlyNPR__Navigation__HotkeyHandler__.mjs` - W A S D, the arrows, Q and E (Alt finer, Shift moves the rig), R,
  + and -, 0
- `PainterlyNPR__Navigation__OrbitMode__.mjs` - the navigation mode: Attach(element, options) wires the three handlers
  to one session that applies the moves once an animation frame, eases fingers to a stop, and says when the camera
  settles

**The mappings** (ValeVision 3D v2.76, three.js r184 OrbitControls as ValeVision sets it up)

| Input | Does |
| :-- | :-- |
| Left drag | Orbit round the target |
| Right drag, or Ctrl / Shift / Cmd + left drag | Pan (what lies at the target stays under the pointer) |
| Ctrl / Shift / Cmd + right drag | Orbit |
| Middle drag | Dolly: up nearer, down further |
| Wheel | Zoom, accelerating on a long spin; a trackpad pinch too |
| One finger | Orbit |
| Two fingers | Pinch to zoom, drag to pan |
| W A S D / arrows | Move the camera level (it keeps looking at its target) |
| Q / E | Move it straight down / up |
| Shift + keys | Move the target too: the framing holds |
| Alt + keys | A fifth of the speed |
| R | Back to the last camera preset (Shift + R is the work mode's switch, v0.7.1: R's binding is NoShift) |
| + / - / 0 | Zoom in, out, back to the preset's framing |

The tilt runs from straight up to straight down (89.9 degrees), and the camera never goes below the ground. How near
and far it goes is the camera rig's Zoom range (70's config).

**Takes** pointer, wheel and key events on the host's element. **Gives** camera moves: State.Camera changed, Camera
bumped, the navigation preview requested (the drawing refines once it rests), and the host's callbacks.

**Hosts**

- PainterlyNPR's app: `80__System__HudOverlay/PainterlyNPR__Interface__Wire__.mjs` attaches it to the sheet, with the
  view lock (Locked), point placement (Allowed), a click on bare paper (OnTap) and the zoom readout (OnMove).
- ValeVision AURA: `Na__EngineHost__AttachNavigation` attaches it to the 3D Environment's canvas, its keys live only
  while that tab is open.

**Manifest:** §11 Camera and View Types.
