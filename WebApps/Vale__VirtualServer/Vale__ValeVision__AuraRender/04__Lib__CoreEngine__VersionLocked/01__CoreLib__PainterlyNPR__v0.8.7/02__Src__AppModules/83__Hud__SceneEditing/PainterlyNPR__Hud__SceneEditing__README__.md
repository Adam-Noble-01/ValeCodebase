# 83__Hud__SceneEditing

**80-89 · System, Hud, Export** · real code since v0.7.0 (30-Oct-2026)

Selecting what is on the sheet and doing things to it: the selection and its outline, the right-click menu's contents, and the edits behind them. The menu itself is 80's ContextMenu; undo and redo are 84's.

Adam, 30-Oct-2026: "the insert system is beautiful but create a select and context menu for delete / swap etc and other options, build a custom context menu and disable the standard browser right click menu".

## Files

| File | Lines | What it is |
|---|---|---|
| `PainterlyNPR__SceneEdit__Selection__.mjs` | ~370 | `PickAt` (the object under a point of the page from the truth buffers: its key, its plop, the class drawn at that pixel, the ray through it); `TargetOf` (an object, or one face of it); the selection (a plop as a whole, or one of the cottage's objects, held by key so it outlives every rebuild); the outline, read from the truth buffers so only what can be seen is outlined, redrawn after each readback (`Cpu.Serial`, 22); the hover outline for a carried swatch or the brush |
| `PainterlyNPR__SceneEdit__Actions__.mjs` | ~370 | A plop taken out (its materials with it), copied beside itself (to the right as the camera sees it, a new shape for a plant, its materials copied), turned, sized, grown again, swapped (the same spot and Uid) or moved; a material given to an object, a face, a whole plop or the selection, or taken off; a click on the sheet (`Tap`): select, or paint with the brush |
| `PainterlyNPR__SceneEdit__Menus__.mjs` | ~300 | The provider 80's ContextMenu asks: the menu over a plop, an object, the sky, an asset card, a material swatch, a placed row or a given row; Undo and Redo rows named from 84's history; the brush's hover outline; the keys |
| `Na__SceneEditing__Config.json` | | The outline's colours and width; a turn's degrees, a size step, a copy's gap, how many swaps the menu lists |
| `PainterlyNPR__Hud__Styles__SceneEditing__.css` | | The outline's canvas over the sheet; the cell cursor while the brush is up |

## What a click does

- **Left click** (the navigation's `OnTap`: a press that never became a drag): with a material's brush up, gives its class to what is under the pointer (Shift for the other of object and face); otherwise selects it - a plop as a whole, or the object. On the sky with nothing selected it says nothing; with something selected it lets it go.
- **Right click** (no move: a moved right press was a pan): selects what it lands on and opens its menu. Text fields keep the browser's menu.
- **Keys**, never while typing: Delete or Backspace takes the selected plop out (the cottage's own objects stay); Escape lets the selection go, after the brush and a placement have had their turn; Ctrl + D copies the selected plop. Ctrl + Z and Ctrl + Y are 84's.

## The menus

| Over | Items |
|---|---|
| A plop | Move, Turn anticlockwise and clockwise, Bigger, Smaller, Grow a new shape (plants), Copy beside it, Swap for (its type, then its collection), Give this part, Give this face (not a plant), Give all of it, Take its materials off, Paint with its class, Undo, Redo, Take it out of the drawing |
| One of the cottage's objects | Give this object, Give this face (not a plant), Take this face's material off, Take its materials off, Paint with its class, Undo, Redo |
| The sky | Let the selection go, Put the brush down, Open or fold the asset library, Undo, Redo |
| An asset card | Place it, Swap the selection for it |
| A material swatch | Paint with it (or put the brush down), Give it to the selection |
| A placed row, a given row | The plop's menu; select what it was given to, take it off |

**Takes** the truth buffers' readback (22), the scene package (10), `State.Assets` and `State.Materials`. **Gives** edits to them through the drawer's `AssetsChanged` (82), so the settings object, and with it 84's history, holds every one.

**Manifest:** §03 (Scene mode: select, place, edit), §14 (interaction).
