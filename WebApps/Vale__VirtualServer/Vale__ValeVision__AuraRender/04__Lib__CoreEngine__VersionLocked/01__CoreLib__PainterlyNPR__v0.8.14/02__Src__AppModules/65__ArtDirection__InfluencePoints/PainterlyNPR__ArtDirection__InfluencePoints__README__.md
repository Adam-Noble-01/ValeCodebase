# 65__ArtDirection__InfluencePoints

**65-69 · Art direction** · real code since v0.5.0

Art Direction Points: human taste without manual painting. A point is a non-destructive control field, not a dab of pixels.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__ArtDirection__Config.json` - Art Direction Points
- `Na__ArtDirection__PointControls__Config.json` - A Point's Contextual Controls
- `PainterlyNPR__ArtDirection__Points__.mjs` - Art Direction Points: their types, how one is made, anchored to what lies under it, re-placed for a new camera, and which the field holds
- `PainterlyNPR__ArtDirection__Styles__PointGroups__.css` - Elliptical points, the node fading back, and groups of points
- `PainterlyNPR__ArtDirection__Styles__PointHandles__.css` - The points' handles over the sheet
- `PainterlyNPR__ArtDirection__Styles__PointNode__.css` - Selecting and editing a point: the node's own sliders
- `PainterlyNPR__Interface__PointControls__.mjs` - A point's contextual controls, and every edit to one: select, set a value, remove, duplicate, switch off
- `PainterlyNPR__Interface__PointList__.mjs` - The points list in the Art direction tab: rows, groups, their eyes and names
- `PainterlyNPR__Interface__PointOverlay__.mjs` - The points over the sheet: handles and rings, the selected point's node of sliders, and the drags that move, size, flatten and turn a point

**Belongs here**

- Types: Focus / Preserve, Fade to Paper, Line Control, Wash Control, Detail Suppression, Protect, Material / Object Target.
- Anchors: Paper, Object, Material, Screen / View. A point stores its seed, target mode, settings and anchoring in the project file.
- Drop a point, adjust radius or direction, see three to six contextual controls.

**Takes** the user's points. **Gives** influence fields for `66`.

**Manifest:** §10 Point Types; Anchoring Modes.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Art Direction* - Focus, Fade to Paper, Line Control and (v0.2.0) Indication, which expresses or suppresses material indication by area, object or material - anchored to the paper or to an object.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
