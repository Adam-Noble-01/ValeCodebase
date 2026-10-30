# 40__Organic__GrammarFramework

**40-49 · Organic grammars** · real code since v0.5.0

The impression of a plant, never its mesh edges.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__OrganicGrammar__Config.json` - Organic Styles: How Each Kind of Plant Is Drawn
- `PainterlyNPR__OrganicGrammar__Framework__.mjs` - What every plant's grammar is made of: a mass projected to the sheet, marks in a kind's rhythm, contours traced on the truth buffers, runs, decoration and hand-length strokes
- `PainterlyNPR__OrganicGrammar__Plant__.mjs` - One organic object, by mass, in its kind's style: its outline in its hand, its shade, its leaves - and grass by blade
- `PainterlyNPR__OrganicGrammar__Styles__.mjs` - How each kind of plant is drawn: how much outline survives, how broken it is, and the interior rhythm at a density per square millimetre

**Belongs here**

- Broken silhouette fragments; internal rhythm strokes organised by a directional field; more marks in shadow, fewer on the lit side.
- Distance and focus simplification by priority, not by scaling the same detail down.
- Instance seeds: duplicated plants vary visibly yet re-render identically.
- Glyph libraries from `08__Data__StrokeLibrary`; tonal-art-map-inspired coherence where it helps.

**Takes** organic objects (`12`, `15`), light (`23`), discipline (`35`). **Gives** strokes for `33`.

**Manifest:** §07 Organic Stroke Grammar.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Organic Grammars* (`PainterlyNPR__OrganicGrammar__*`). Since v0.2.0 a grammar is styled by kind (`ORGANIC_STYLES`: how much outline survives, how broken it is, and the interior rhythm - arcs, upright spikes or drooping ticks - at a density per square millimetre), and a plant's flowers are dabs for the accent layer (`PainterlyNPR__OrganicGrammar__Flowers`), never drawn bloom by bloom.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
