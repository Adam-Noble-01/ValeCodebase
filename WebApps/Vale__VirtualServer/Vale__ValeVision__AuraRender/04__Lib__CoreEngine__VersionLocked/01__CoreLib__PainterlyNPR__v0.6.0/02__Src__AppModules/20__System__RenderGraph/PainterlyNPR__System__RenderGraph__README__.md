# 20__System__RenderGraph

**20-29 · Render graph and truth buffers** · real code since v0.5.0

The render graph: modular, profiled and explicit about dependencies.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__RenderGraph__Config.json` - The Render Graph's Passes
- `PainterlyNPR__RenderGraph__Graph__.mjs` - The passes in order, their input versions and keys, and the two ways the graph runs: the navigation preview at once, refinement when the camera rests
- `PainterlyNPR__RenderGraph__PassRegistry__.mjs` - What each pass runs, and what to wait on for its time

**Belongs here**

- Passes declare inputs and outputs; each has a cache key, a quality tier and timing.
- The dirty-state strategy: a camera change invalidates projected buffers; a style change never re-imports; a paper change never re-runs geometry; a moved point re-runs only its field and composites.
- Progressive refinement: the navigation preview while moving, full refinement after idle, passes displayed in a predictable order.
- Job tokens: a newer request cancels an older job, so a late result never replaces the right view (§17).

**Takes** a resolved settings object (`06`). **Gives** an ordered, cached run of passes.

**Manifest:** §05 Core Principle; §12 Render Graph and Dirty-State Strategy.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Render Graph* (`PainterlyNPR__RenderGraph__*`) - the pass registry, cache keys, job tokens and per-pass timing all run.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
