# 82__Hud__AssetCatalogue

**80-89 · Workspace and HUD** · real code since v0.6.0 (30-Oct-2026)

The Assets drawer: the library pulled out on the left of the sheet, searched and filtered, its cards dragged onto the sheet.

Adam, 30-Oct-2026: "Add a pull out Assets menu here to the left ... Ensure catalogue has filters and search. in the catalogue add a toggle to switch between see rendered and see proxy".

## Files

| File | Lines | What it is |
|---|---|---|
| `PainterlyNPR__Interface__AssetDrawer__.mjs` | ~420 | The drawer: built into `<aside class="PainterlyNPR__AssetDrawer">`, its tab and body, the search, the collection and type chips, the Rendered / Proxy pictures toggle, the cards, the placed list (turn, move, take out) and the factory's buttons; `AssetsChanged` rebuilds the scene and redraws what reads it |
| `PainterlyNPR__Interface__AssetDrop__.mjs` | ~270 | Drag a card onto the sheet, or click it and then the sheet: the ghost under the pointer, the drop marker (the asset's footprint on the ground and a line to its height), the ground under the pointer, Esc |
| `PainterlyNPR__Hud__Styles__AssetDrawer__.css` | ~390 | The drawer's column in the main grid, the drawer, cards, ghost and marker; imported last by the stylesheet index |
| `Na__AssetCatalogue__Config.json` | | What the drawer remembers per viewer, the drag threshold, the ghost and the marker |

## Working with it

- **Pull it out** by the Assets tab down the desk's left edge; fold it with Hide. Open or not, and which pictures (Rendered: RND, as drawn; Proxy: PXY), are remembered per viewer. The library is read the first time it opens, so boot never waits for it.
- **Drag** a card onto the sheet: it lands on the ground under the pointer. **Or click** a card, then click the sheet (as an art direction point is placed); Esc cancels. Dropped off the sheet, nothing is placed.
- **Where it lands**: the camera's ray through the pointer, met with the ground (y = 0). An elevation looks along the ground, so there the truth buffers' surface under the pointer is set down onto the ground.
- **The placed list**: every plop in the drawing (A0001 ...), each turned 45 degrees, moved (click the sheet where it should stand) or taken out. Each change rebuilds the scene (about 100 to 200 ms with the cottage) and bumps the render graph's Scene input: the truth buffers and everything after them re-run; paper and sky stay cached.
- **Pictures**: Render missing or Render all runs the asset factory (88) through the local server.

## Pointer etiquette with the navigation (74)

Pointer events, not the browser's drag and drop, so mouse, pen and touch work alike and a real pointer can drive a test. No pointer capture: the drag follows window pointermove and pointerup. An armed placement takes the sheet's press in the capture phase (`stopImmediatePropagation`, `preventDefault`) before the navigation can start an orbit; the navigation listens in the bubble phase and yields to a prevented press.

**Takes** the catalogue (16), the camera (70), the truth buffers (21, 22). **Gives** plops in `State.Assets`, a rebuilt scene, the factory's runs.

**Manifest:** §03 Scene mode (proxy placement); §12 (dirty-state).
