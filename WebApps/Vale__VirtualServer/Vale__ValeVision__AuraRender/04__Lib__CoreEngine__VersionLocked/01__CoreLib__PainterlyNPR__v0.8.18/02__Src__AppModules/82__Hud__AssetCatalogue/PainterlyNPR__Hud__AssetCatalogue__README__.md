# 82__Hud__AssetCatalogue

**80-89 · Workspace and HUD** · real code since v0.6.0 (30-Oct-2026)

The Assets drawer: the library pulled out on the left of the sheet, searched and filtered, its cards dragged onto the sheet.

Adam, 30-Oct-2026: "Add a pull out Assets menu here to the left ... Ensure catalogue has filters and search. in the catalogue add a toggle to switch between see rendered and see proxy".

## Files

| File | Lines | What it is |
|---|---|---|
| `PainterlyNPR__Interface__AssetDrawer__.mjs` | ~420 | The drawer: built into `<aside class="PainterlyNPR__AssetDrawer">`, its tab and body, the search, the collection and type chips, the Rendered / Proxy pictures toggle, the cards, the placed list (turn, move, take out) and the factory's buttons; `AssetsChanged` rebuilds the scene and redraws what reads it |
| `PainterlyNPR__Interface__MaterialTab__.mjs` | ~460 | The Materials tab (v0.7.0): the material library's swatches, three to a row, searched and grouped (Walls, Roofs, Joinery and glazing, Ground, Planting, Distance); Give to Object or Face; the brush (click a swatch, then click the sheet); a swatch dragged onto the sheet; the given list (select what it was given to, take it off, clear them all); the swatch factory's buttons |
| `PainterlyNPR__Interface__AssetDrop__.mjs` | ~270 | Drag a card onto the sheet, or click it and then the sheet: the ghost under the pointer, the drop marker (the asset's footprint on the ground and a line to its height), the ground under the pointer, Esc |
| `PainterlyNPR__Hud__Styles__AssetDrawer__.css` | ~390 | The drawer's column in the main grid, the drawer, cards, ghost and marker; imported last by the stylesheet index |
| `Na__AssetCatalogue__Config.json` | | What the drawer remembers per viewer (out or folded, which pictures, which tab), the drag threshold, the ghost and the marker, the Materials tab's words and its starting Give to |

## Working with it

- **Pull it out** by the Assets tab down the desk's left edge; fold it with Hide. Open or not, and which pictures (Rendered: RND, as drawn; Proxy: PXY), are remembered per viewer. The library is read the first time it opens, so boot never waits for it.
- **Drag** a card onto the sheet: it lands on the ground under the pointer. **Or click** a card, then click the sheet (as an art direction point is placed); Esc cancels. Dropped off the sheet, nothing is placed.
- **Where it lands**: the camera's ray through the pointer, met with the ground (y = 0). An elevation looks along the ground, so there the truth buffers' surface under the pointer is set down onto the ground.
- **The placed list**: every plop in the drawing (A0001 ...), each turned 45 degrees, moved (click the sheet where it should stand) or taken out. Each change rebuilds the scene (about 100 to 200 ms with the cottage) and bumps the render graph's Scene input: the truth buffers and everything after them re-run; paper and sky stay cached.
- **Pictures**: Render missing or Render all runs the asset factory (88) through the local server.
- **Two tabs** (v0.7.0): Objects (all of the above) and Materials. Each tab scrolls on its own, the head and the tabs stay put.
- **Materials**: click a swatch and it is the brush - each click on the sheet gives its class to what is under the pointer, outlined in terracotta before the click: the whole object, or with Give to Face the one face (as SketchUp's paint bucket; Shift flips it for one click; a drag still orbits); Esc or the swatch again puts it down. Drag a swatch onto the sheet and it is given where it is let go. The given list names each assignment; a click selects what it was given to, its cross takes it off. Render missing or Render all draws the swatches (88) into `07__Data__MaterialRecipes`. A class without a swatch shows its pigment, flat.
- **Every rebuild is told to the scene editing** (83, `PainterlyNPR__SceneEdit__Changed`): the selection is checked and its outline redrawn. A click on a placed row's name selects that plop; a plop taken out takes its materials with it.

## In a wrapper (v0.8.2)

ValeVision AURA mounts this drawer from its pinned copy: nothing of it is copied there (Adam: "dont duplicate code the npr repo remains definitive source"). What a wrapper needs is a seam here, never a change in its own copy.

- **Its places**: an aside of class `PainterlyNPR__AssetDrawer` (the drawer builds itself into it), `Ui.Root` (80 Dom: the drawer's open state, a carried card, an armed placement and the brush are marked on it), and `#PainterlyNPR__App__Sheet` holding `Ui.Canvas` (the drop marker and 83's outline lie over the drawing in it). A click on the drawing reaches the brush and the selection only through `PainterlyNPR__SceneEdit__Tap` (83), from the wrapper's navigation tap.
- **`BuildAssetDrawer({ Factory: false })`** leaves the factory's buttons out of both tabs: the pictures and swatches are drawn in this app and come with the pin.
- **`OnAssetsChanged(fn)`** tells the wrapper of every rebuild, so it saves its drawing and its own undo takes the step. Putting a drawing back is `AssetsChanged()` after setting `State.Assets` and `State.Materials` (copies).
- **The libraries** are read from the engine's own files (16, 17), so they must be pinned beside `02__Src__AppModules` as in this repository (AURA's sync carries their .json and .webp).
- **The right-click menu, the keys and the Move Tool** (v0.8.10): a wrapper wires 83's `SceneEdit__Wire({ Scope, Active, History })`, the menu kept to its places for the engine (the drawing and this drawer), the keys to when its tab is open, and the menu's Undo and Redo its own. A placed row's Move starts the Move Tool, which shows the carried plop by this module's drop marker (`AssetDrop__ShowMarker`).

## Pointer etiquette with the navigation (74)

Pointer events, not the browser's drag and drop, so mouse, pen and touch work alike and a real pointer can drive a test. No pointer capture: the drag follows window pointermove and pointerup. An armed placement takes the sheet's press in the capture phase (`stopImmediatePropagation`, `preventDefault`) before the navigation can start an orbit; the navigation listens in the bubble phase and yields to a prevented press.

**Takes** the catalogue (16), the material library (17), the camera (70), the truth buffers (21, 22), the scene editing's picking and giving (83). **Gives** plops in `State.Assets`, material assignments in `State.Materials` (through 83), a rebuilt scene, the factory's runs.

**Manifest:** §03 Scene mode (proxy placement); §12 (dirty-state).
