# 81__Hud__PassViewer

**80-89 · Workspace, project and export** · real code since v0.5.0

Every buffer viewable on its own.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__PassViewer__Config.json` - Buffer Views
- `PainterlyNPR__Hud__Styles__GraphStrip__.css` - The render graph along the foot: every pass a node, its state and its time
- `PainterlyNPR__Interface__GraphStrip__.mjs` - The render-graph strip along the foot: every pass a node with its state and time, a click to see its buffer, and the badge naming it
- `PainterlyNPR__PassViewer__Shader__.mjs` - The pass viewer's fragment shader: one branch per view
- `PainterlyNPR__PassViewer__ViewList__.mjs` - The buffer views: what each shows and how
- `PainterlyNPR__PassViewer__Views__.mjs` - Every buffer viewable on its own: draw a view into a target or the sheet, present it, milestones while refinement runs, and the strip's thumbnails

**Belongs here**

- Masks, object IDs, line priorities, depth, normals, wetness, pooling and final composites, independently.
- Show Influence for Art Direction Points.

**Takes** any pass output. **Gives** a diagnostic view.

**Manifest:** §15 ("Debug views should expose ..."); §10 Show Influence.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Pass Viewer* - the render-graph strip with live thumbnails; click a pass to see its buffer.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
