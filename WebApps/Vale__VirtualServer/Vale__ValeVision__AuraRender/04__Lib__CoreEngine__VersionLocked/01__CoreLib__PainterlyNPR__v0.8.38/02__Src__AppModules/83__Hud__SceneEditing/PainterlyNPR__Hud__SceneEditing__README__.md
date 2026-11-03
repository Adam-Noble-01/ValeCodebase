# 83__Hud__SceneEditing

**80-89 · System, Hud, Export** · real code since v0.7.0 (30-Oct-2026)

Selecting what is on the sheet and doing things to it: the selection and its outline, the right-click menu's contents, the edits behind them, the Move Tool (v0.8.10) and the Rotate Tool (v0.8.37). The menu itself is 80's ContextMenu; undo and redo are 84's (or a wrapper's).

Adam, 30-Oct-2026: "the insert system is beautiful but create a select and context menu for delete / swap etc and other options, build a custom context menu and disable the standard browser right click menu".

## Files

| File | Lines | What it is |
|---|---|---|
| `PainterlyNPR__SceneEdit__Selection__.mjs` | ~425 | `Editing` (the gate: only while the asset library is out; Actions re-exports it), `PickAt` (the object under a point of the page from the truth buffers: its key, its plop, the class drawn at that pixel, the ray through it); `TargetOf` (an object, or one face of it); the selection (a plop as a whole, or one of the cottage's objects, held by key so it outlives every rebuild); the outline, read from the truth buffers so only what can be seen is outlined, redrawn after each readback (`Cpu.Serial`, 22); the hover outline for a carried swatch or the brush |
| `PainterlyNPR__SceneEdit__Actions__.mjs` | ~380 | A plop taken out (its materials with it), copied beside itself (to the right as the camera sees it, a new shape for a plant, its materials copied), turned, sized, grown again, swapped (the same spot and Uid) or moved; a material given to an object, a face, a whole plop or the selection, or taken off; a click on the sheet (`Tap`): select, or paint with the brush |
| `PainterlyNPR__SceneEdit__Menus__.mjs` | ~390 | The provider 80's ContextMenu asks: the menu over a plop, an object, the sky, an asset card, a material swatch, a placed row or a given row; Undo and Redo rows named from 84's history or a wrapper's; the brush's hover outline; the keys; `Wire(options)`, a wrapper's Scope, Active and History |
| `PainterlyNPR__SceneEdit__MoveTool__.mjs` | ~605 | The Move Tool (v0.8.10): M on a selected plop carries it over the ground with 82's drop marker, Shift shows its gimbal (SketchUp's red, green, blue) and lifts or lowers it, a press on the red or green arrow with Shift carries it along that arrow, a click or a drag let go sets it down (one rebuild, one undo step), Esc or M leaves it; 10 mm steps |
| `PainterlyNPR__SceneEdit__RotateTool__.mjs` | ~455 | The Rotate Tool (v0.8.37): R on a selected plop swings it round its foot with the pointer, a protractor on the ground to read it by, Shift for steps, a click or a drag let go sets it (one rebuild, one undo step), Esc or R leaves it |
| `Na__SceneEditing__Config.json` | | The outline's colours and width; a turn's degrees, a size step, a copy's gap, how many swaps the menu lists; the Move Tool's step, gimbal sizes and limits; the Rotate Tool's steps and protractor |
| `PainterlyNPR__Hud__Styles__SceneEditing__.css` | | The outline's canvas over the sheet; the cell cursor while the brush is up; the Move Tool's trail, gimbal and readout, and its cursors; the Rotate Tool's protractor |

## What a click does

- **Left click** (the navigation's `OnTap`: a press that never became a drag): with a material's brush up, gives its class to what is under the pointer (Shift for the other of object and face); otherwise selects it - a plop as a whole, or the object. On the sky with nothing selected it says nothing; with something selected it lets it go.
- **Right click** (no move: a moved right press was a pan): selects what it lands on and opens its menu. Text fields keep the browser's menu.
- **Keys**, never while typing: Delete or Backspace takes the selected plop out (the cottage's own objects stay); Escape lets the selection go, after the brush, a placement and a move have had their turn; Ctrl + D copies the selected plop; M moves it; R turns it, and is the camera's reset (74) with no plop selected. Ctrl + Z and Ctrl + Y are 84's.

## The Move Tool (v0.8.10)

Adam, 30-Oct-2026: "adding a new Move Tool you press m when an asset is selected and you can move it around show a gimbal for the move tool", then, asked how: "Ground only, pressing shift allows for up and down movement, show only show the giumbal when shift is held otherwise show that same graphic and effect that appears on the insert"; 10 mm; a ghost while it moves, the drawing redrawn once on release.

- **M** (or the menu's Move, or a placed row's Move) on a selected plop, with the library out. The plop's foot keeps its place under the pointer as it moves (it never jumps), over the level it stands at; 82's drop marker shows its footprint and height there, a dashed trail runs back to where it stood, and the distance reads beside it. A view along the ground (an elevation) carries it across the view, its depth kept.
- **Shift** shows the gimbal at the foot: red +X, green -Z (SketchUp's green, as a SketchUp model arrives), blue up, each the same size on screen at any zoom. The pointer lifts or lowers the plop along blue, on a dashed rail; Shift with a press on the red or green arrow carries it along that arrow for the press.
- **A click, or a drag let go**, sets it down: `State.Assets` changed once, one rebuild, one undo step. **Enter** sets it down where it is shown; **Esc** or **M** leaves it where it was. Nothing is rebuilt before that.
- While it is on, a left press on the drawing is the tool's (prevented, so the navigation never orbits); right-drag pans, the middle button dollies and the wheel zooms. It ends when the selection changes, the plop goes or something else moves it (an undo), or the library is folded away.
- Steps of `SnapM` (10 mm) along each axis from where it stood: a click that never moved leaves it exactly there.

## The Rotate Tool (v0.8.37)

Adam, 03-Nov-2026: "Add a Rotation tool (R) key so i can test, tool should function like m key does for move".

- **R** (or the menu's Rotate) on a selected plop, with the library out. **With the library folded or nothing selected, R is still the camera's reset (74):** the navigation hears R too and is wired first, so Menus takes the key in the capture phase, and only when there is a plop to turn. Shift + R stays the work mode's, Ctrl + R the reload guard's.
- **Swing the pointer round the foot.** The turn is what the pointer sweeps round the foot on the page, so it never jumps, can go round more than once and is finer further out. Anticlockwise on the page is anticlockwise from above (clockwise for a plop above the eye, seen from underneath). Nearer the foot than `MinRadiusPx` the turn holds, so passing over it does nothing.
- **Why not a point on the ground:** the views a drawing is looked at from are shallow (9 degrees in the app's first), and there the ground is a flat ellipse whose near side swings the direction wildly and whose far side runs out at the horizon. On the page it keeps one pace in every view, an elevation's too. Both ends of a sweep are measured round the foot as it stands now, so a pan, a zoom or a long status line shifting the sheet is no turn.
- A **protractor** on the ground at the foot, the same size on the page at any zoom and never inside the footprint: ticks every `TickDeg`, a dashed line where its front stood, a blue hand where it is shown, the swept part filled, its footprint's box at that turn, 82's drop marker, a dotted lever from the foot to the pointer, and the turn in words beside it.
- **A click, or a drag let go**, sets it: `State.Assets` changed once, one rebuild, one undo step. **Enter** sets it as shown; **Esc** or **R** leaves it as it was, and so does a click with no sweep. Nothing is rebuilt before that.
- Steps of `SnapDeg` (1 degree) from where it stood, `ShiftSnapDeg` (15) while Shift is held.
- While it is on, a left press on the drawing is the tool's; right-drag pans, the middle button dollies and the wheel zooms. It ends when the selection changes, the plop goes or something else changes it (an undo), or the library is folded away. M takes over from R and R from M.
- **Turned this way a plop becomes `Rigid` (16)**, as by the menu's Turn or a placed row's Turn: its masses' lumps and squash go round with it from then on.

## In a wrapper (v0.8.10)

`SceneEdit__Wire({ Scope, Active, History })`: **Scope** (an element, a list or a function) keeps the right-click menu to the wrapper's places for the engine (ValeVision AURA: the 3D Environment's drawing and the Assets drawer); everywhere else the browser's menu and the wrapper's own are untouched. **Active** says when the keys (Delete, Esc, Ctrl + D, M, R) are the engine's (AURA: its 3D Environment tab). **History** (`Label('Undo' or 'Redo')`, `Undo()`, `Redo()`) makes the menu's Undo and Redo the wrapper's own. The drawing's menu answers only for the drawing itself (`Ui.Canvas` or the sheet), so a wrapper's own overlay grips keep theirs. The app wires none of them.

## The menus

| Over | Items |
|---|---|
| A plop | Move (M), Rotate (R), Turn anticlockwise and clockwise, Bigger, Smaller, Grow a new shape (plants), Copy beside it, Swap for (its type, then its collection), Give this part, Give this face (not a plant), Give all of it, Take its materials off, Paint with its class, Undo, Redo, Take it out of the drawing |
| One of the cottage's objects | Give this object, Give this face (not a plant), Take this face's material off, Take its materials off, Paint with its class, Undo, Redo |
| The sky | Let the selection go, Put the brush down, Open or fold the asset library, Undo, Redo |
| An asset card | Place it, Swap the selection for it |
| A material swatch | Paint with it (or put the brush down), Give it to the selection |
| A placed row, a given row | The plop's menu; select what it was given to, take it off |

**Takes** the truth buffers' readback (22), the scene package (10), `State.Assets` and `State.Materials`. **Gives** edits to them through the drawer's `AssetsChanged` (82), so the settings object, and with it 84's history, holds every one.

**Manifest:** §03 (Scene mode: select, place, edit), §14 (interaction).
