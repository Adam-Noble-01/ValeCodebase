# 80__System__HudOverlay

**80-89 · Workspace, project and export** · real code since v0.5.0

The workspace: since v0.7.2 one column of fold-down sections in ValeVision AURA's order (camera, paper and finish, light, pen, wash, sky, art direction, export), each holding its groups as nested folds; before, tabs.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__Interface__CameraControls__Config.json` - The View Lock's Icons
- `Na__Interface__Controls__Config.json` - The Range Controls
- `Na__Interface__ContextMenu__Config.json` - The Right-Click Menu (v0.7.0): when a right press counts as a click, and how the menu sits on the page
- `Na__Interface__Folds__Config.json` - Folds, Info Bubbles and Section Switches
- `Na__Interface__Panel__Config.json` - The Panel
- `PainterlyNPR__Hud__Styles__ContextMenu__.css` - The right-click menu (v0.7.0): a card of warm paper, its items, shortcuts, swatches, headings and submenus
- `PainterlyNPR__Hud__Styles__InfoBubbles__.css` - A group's descriptions behind an "i", and its on / off eye
- `PainterlyNPR__Hud__Styles__Panel__.css` - The panel's head, fold-down sections, groups and fields, the range controls and the buttons
- `PainterlyNPR__Hud__Styles__Pen__.css` - The Pen tab: folding groups, presets and hatch points
- `PainterlyNPR__Hud__Styles__ViewLock__.css` - The padlock beside the zoom: plain when open, a muted red when locked
- `PainterlyNPR__Hud__Styles__ZoomAndFolds__.css` - The camera's zoom under the sheet, and the panel and the render graph folding away
- `PainterlyNPR__Interface__CameraControls__.mjs` - The sheet under the pointer, the camera's zoom and its view lock, and the hover readout from the truth buffers
- `PainterlyNPR__Interface__ContextMenu__.mjs` - The app's own right-click menu in place of the browser's (v0.7.0): the browser's cancelled everywhere but in text fields; what it holds asked of the providers registered (83's for the sheet and the drawer); a right press that moved was a pan and opens nothing (Windows sends the menu event after the release, other systems on the press, so then it waits for the release); submenus, the keyboard (arrows, Enter, Escape), the menu key and Shift + F10
- `PainterlyNPR__Interface__Controls__.mjs` - The range controls - which state each sets and which inputs it dirties - kept in step with the state, the Pen's and the vegetation's presets, a slider's move (`SetControl`) and the panel's menus (`ChoiceValue`, `SetChoice`), v0.8.1; null-safe throughout, so a wrapper's own panel (AURA's, built from this panel's config) applies presets and menus through them
- `PainterlyNPR__Interface__Dom__.mjs` - The interface's elements and interaction state, the two selector helpers, state by path, and the status line
- `PainterlyNPR__Interface__Folds__.mjs` - The panel and the render graph fold away; every group's descriptions wait behind an "i", and its eye switches the section off and on
- `PainterlyNPR__Interface__Formats__.mjs` - How a readout writes a number, from a format held as data in a config: per cent, times, millimetres, degrees, signed, words for the ends of a range, and the few readouts only code can write
- `PainterlyNPR__Interface__Panel__.mjs` - Build the control panel from its description in Na__Interface__Panel__Config.json - the fold-down sections, groups, folds, sliders, menus and hints - before the interface is wired
- `PainterlyNPR__Interface__Wire__.mjs` - Wire the whole interface once, at boot: folds, sections, ranges, selects, presets, cameras, the seed, points, the keyboard, the pointer on the sheet, export

**Belongs here**

- Scene, Style, Paper, Art Direction, Export.
- Concise defaults; complex control in expandable, well-named groups; never an exposed node graph.

**Takes** application state. **Gives** the interface.

**Manifest:** §03 Modes and Workspace Philosophy.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Interface* (`PainterlyNPR__Interface__*`).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
