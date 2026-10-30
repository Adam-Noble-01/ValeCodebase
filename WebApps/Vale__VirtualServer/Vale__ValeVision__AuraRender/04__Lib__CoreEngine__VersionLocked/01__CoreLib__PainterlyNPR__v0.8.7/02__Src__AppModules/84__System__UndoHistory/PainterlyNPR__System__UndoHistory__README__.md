# 84__System__UndoHistory

**80-89 · Workspace and HUD** · real code since v0.7.4 (30-Oct-2026)

Undo and redo for the whole drawing: the last 100 changes back and 100 forward again.

Adam, 30-Oct-2026: "Add a comprehensive user undo / redo caching system to both The NPR Demo Environment and Aura so to both apps to store 100 undos and 100 redos then add control +z and control + y as keyboard mappings". His calls: the camera is left out (Ctrl + Z never moves it, as in SketchUp); Undo and Redo buttons as well as the keys; kept for this visit only.

## Files

| File | Lines | What it is |
|---|---|---|
| `PainterlyNPR__Interface__UndoHistory__.mjs` | ~400 | The history: what a step is, when an edit has settled into one, undo and redo through the settings JSON, the names of steps, the keys and the meta strip's two buttons. Wired last by 80's Wire |
| `PainterlyNPR__UndoHistory__Store__.mjs` | ~190 | Where the steps are kept: each a whole snapshot, its larger parts stored once and shared (a hash names each part; the text decides), counted, so a step dropped off the end frees what only it held. Knows nothing of the app |
| `PainterlyNPR__UndoHistory__Styles__Buttons__.css` | ~90 | The two arrows in a pill beside the Rendered / Proxy switch; imported last by the stylesheet index |
| `Na__UndoHistory__Config.json` | | The depths (100 and 100), the settle times, the key bindings, the step names and the two icons |

## Working with it

- **Ctrl + Z** undoes, **Ctrl + Y** and **Ctrl + Shift + Z** redo (Cmd on a Mac), anywhere on the page; in a text box the keys are the box's own undo, on its words. The arrows in the meta strip do the same; their titles say what they would undo or redo ("Undo: Wash strength (Ctrl + Z)"), greyed when there is nothing.
- **A step** is the settings object (85, deterministic recall) without its camera: every slider, choice, preset and the seed, the art direction points, the placed assets and the materials given. Whatever is added to the settings object later is undone with nothing to add here. The camera, the work mode, the folds, the panel and the zoom are views, not edits.
- **When an edit is a step**: once nothing has changed for 350 ms and no pointer button is held, so a slider drag, a point dragged on the sheet or a held arrow key is one step; typing is one step until it pauses for 1.2 s or its box is left. A quiet look each second finds what no click announced (a save loaded after its click).
- **Undo** applies the step's settings object as loading a save does (`PainterlyNPR__Interface__ApplySettingsJson`), the camera left where it is; object-anchored points are placed again for that camera and a selected point stays selected. Every input bar Size and Scene moves, as on a load (a scene rebuild too when the plops or materials differ), so an undo refines as a loaded save does.
- **The 101st step** drops the oldest; a new edit after an undo clears the steps forward, as everywhere.

## For other modules

`PainterlyNPR__UndoHistory__Undo()`, `__Redo()`, `__CanUndo()`, `__CanRedo()` and `__Label('Undo' | 'Redo')` (the words for a menu row, or null). Never a step: the asset factory's stage (`Factory.Running`), a restore, and anything the drawing does while booting or settling after a restore, before the next key or press.

**Takes** the settings object and its apply (85), the points (65), the asset factory's running flag (88), the controls' labels (80's controls config). **Gives** undo and redo.

**Manifest:** §12 (dirty-state and determinism: a step is recall, so an undo draws exactly what was drawn).
