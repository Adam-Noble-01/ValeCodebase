# =============================================================================
# ScanToMermaid__DEVLOG__.md
# =============================================================================
# Description : Development log for the Vale scan to Mermaid skill
# Author      : Adam Noble
# Created     : 04-Aug-2026
# Last Update : 04-Aug-2026
# Version     : 1.2.0
# =============================================================================

## Version History

# -----------------------------------------------------------------------------

### 1.2.0 - 04-Aug-2026 | Diagram Image Export

#### Added
- **Download PNG and Download SVG buttons** on every built document. The diagram
  is baked client side, so both work offline in the self-contained file. PNG is
  rendered at 2x for slide use; SVG is a true vector at roughly 51KB against the
  PNG's 531KB.
- Export clones the live SVG, gives it an explicit size, adds a 24px white margin
  and a white background rect, then serialises it. The PNG path draws that through
  a canvas at `ValeMermaid__PngScale`.

#### Changed
- **`htmlLabels` set to `false`.** This is what makes export possible at all — a
  Mermaid HTML label is a `foreignObject`, and browsers will not rasterise a
  `foreignObject` to canvas, so the PNG would have come out blank or the draw
  would have thrown. Native SVG text rasterises correctly.
- **Edge label backgrounds replaced with a painted halo.** Turning off HTML labels
  loses the background rectangle that masked the connector behind label text, so
  connectors began striking through the words. A `paint-order: stroke fill` halo
  in the label colour is injected into the SVG itself rather than the page CSS,
  which means it travels with the exported SVG as well as showing on screen.

#### Confirmed working
- Instrumented headless run of the real built document: standalone SVG 2348 x 1127,
  canvas 4696 x 2253, 531KB PNG, 51KB SVG, and **592,659 non-white pixels** in the
  rasterised output — the pixel count is the check that matters, since a broken
  `foreignObject` export produces a perfectly valid but entirely blank PNG.

#### Notes
- **The vendored `mermaid.min.js` contains the literal string `</body>` twice.**
  Any post-processing of a built document that does a naive
  `html.replace('</body>', ...)` will inject content into the middle of the minified
  library and break it with `Uncaught SyntaxError: Invalid or unexpected token`.
  This bit during testing and cost real time — the first three diagnostic runs were
  measuring a corruption the harness itself had introduced, not a fault in the
  build. Anchor on the last occurrence with `rfind`. The builder itself is not
  affected, because it substitutes a template token rather than searching for a tag.

# -----------------------------------------------------------------------------

### 1.1.0 - 04-Aug-2026 | Diagram Legibility Pass

First render was reviewed and rejected as too chaotic — long sweeping connectors
across dead space, and edge labels that read as extra nodes. Diagnosed by
rendering variants through headless Chrome and comparing them directly rather
than guessing.

#### Fixed
- **Shared terminals were the noodle source.** A single `File Close` node
  declared at top level, exited to by both phase 1 and phase 2, was stranded in
  the margin by Dagre with both exits routed to it as long arcs across the full
  height of the diagram. Duplicating the terminal inside each phase removed both
  arcs entirely: 3124 x 1107 (2.82:1, two sweeping arcs) became 2288 x 1081
  (2.12:1, none). Rule recorded in `Reference__MermaidAuthoring__.md`.
- **Edge labels read as nodes.** The label backing rectangle was white while the
  subgraph fill was `#f5f5f5`, so every label showed as a visible box. Cluster
  fill is now white and subgraphs are grouped by outline instead, so the label
  mask disappears against its background. Making labels transparent was tried
  first and rejected — the connector then runs visibly through the text.
- **`curve` changed from `basis` to `linear`.** Basis swings wide of the direct
  path and reads as a noodle even on short edges.
- **Long edge labels shortened.** A label such as "Maximum of 5 days to produce
  sufficient design from having necessary info" occupies a rank of its own and
  reads as a node. Labels are now kept under about 25 characters, with the full
  sheet wording preserved in a "Flow timings and conditions" notes section so
  nothing is lost.
- Added `edgeLabelBackground` to the theme variables the page derives from CSS,
  so the label mask stays tied to the stylesheet like every other colour.
- Node and rank spacing raised to 50 and 60.

#### Notes
- Duplicating a terminal means the diagram shows two `File Close` boxes where the
  sheet drew one. This is ordinary flowchart practice but it is a departure from
  the original, so it is raised as a review flag rather than done silently.
- Chrome headless at `--virtual-time-budget=25000` is a reliable way to render and
  inspect a built document, and is how these variants were compared. Worth reaching
  for again rather than trusting a browser pane screenshot.

# -----------------------------------------------------------------------------

### 1.0.0 - 04-Aug-2026 | Initial Release

Built to convert scanned hand-drawn process sheets into Vale branded Mermaid
documents. Validated end to end against `PdfToDiagram__Test__.pdf`, a single A1
landscape pencil sheet scanned on a Sharp BP-60C31 and wrapped in an A4 PDF —
9921 x 7015px, zero selectable text.

#### Added
- **Image pre-processor.** `ScanToMermaid__ImagePreprocessor__Main__.py` accepts
  PDF, PNG, JPEG or TIFF, or a folder of them. For PDFs it lifts the embedded
  scan at native resolution via PyMuPDF rather than re-rasterising, so a scan
  placed in a PDF is never resampled twice. Falls back to rendering at `--dpi`
  when a page is a genuine composite rather than a plain scan.
- **Levels pipeline.** Greyscale, then percentile-based auto white and black
  point detection, then a gamma of 0.43 matching the Photoshop Levels preset,
  then an optional unsharp mask. On the test sheet this resolved a black point of
  42.0 against a white point of 255.0.
- **Detail tiling.** A 3x2 overlapping tile grid at 8% overlap alongside the
  whole-sheet reading copy. This turned out to matter more than the levels
  adjustment — whole-sheet resolution shows the shape of the flow but not the
  words, and the tiles are what make the handwriting legible.
- **Document builder.** `ScanToMermaid__DocumentBuilder__Main__.py` bakes a
  transcription JSON into a self-contained HTML with the Mermaid renderer, the
  Vale logo and the processed scan all inlined as data URIs. No install, no
  internet, no dev server. Also emits a Markdown twin using the GitHub raw URL
  for the logo, the bare `.mmd`, and a Vale headed `00__Index__.html` when more
  than one sheet is built.
- **Theme system.** `Vale__MermaidTheme__.css` governs both the page chrome and
  the diagram. The builder parses the `--ValeMermaid_*` custom properties to
  generate the Mermaid `classDef` block, and the page reads the same properties
  at render time for the base theme. No colour is hard-coded in the Python. A
  project copy in `99__Style__MermaidTheme/` overrides the skill default and is
  seeded automatically on first build.
- **Semantic node classes.** `valeStart`, `valeProcess`, `valeDecision`,
  `valeStop`, `valeSla`, `valeDone` mapped onto the existing Vale status tokens.
- **Transcription confidence flagging.** Doubtful readings are marked inline with
  a dotted underline and hover note, and collected into a collapsible review
  table with a count in the summary.

#### Confirmed working
- Full pipeline run on `PdfToDiagram__Test__.pdf` produced a 4.1MB self-contained
  HTML rendering 16 nodes, 19 edges, 3 phase subgraphs and 16 edge labels with
  zero Mermaid errors and no horizontal page overflow.
- Comment divider widths verified programmatically against
  `ValeSpec__Build__HardwareDataIndex__.py` — header 79, region 79, function
  underline 66, endregion 79. All match.

#### Notes
- **Layout strategy was measured, not assumed.** Three renderings of the same
  16-node flow: flat `TD` gave 794 x 2062 (0.39:1, a tall ribbon), flat `LR` gave
  4783 x 313 (15.31:1, an unreadable strip), and `TD` with phase subgraphs each
  set to `direction LR` gave 2945 x 910 (3.24:1). The phased form is the default
  for any largely linear process over about eight nodes, and the finding is
  recorded in `Reference__MermaidAuthoring__.md`.
- Nodes that several phases exit to, such as a file-close state, must be declared
  at top level rather than inside a subgraph, or the cross-phase edges drag into
  that box and ruin the packing.
- Mermaid renders a syntax error as a visible error block rather than throwing, so
  a broken diagram will pass an unattended build silently. The skill instructs
  opening the built HTML to confirm.

#### Files
- `SKILL.md` - skill definition and three-step workflow
- `02__Src__AppModules/10__System__ImagePreprocessor/ScanToMermaid__ImagePreprocessor__Main__.py`
- `02__Src__AppModules/30__System__DocumentBuilder/ScanToMermaid__DocumentBuilder__Main__.py`
- `03__Style__MermaidTheme/Vale__MermaidTheme__.css`
- `04__Src__Dependencies__VersionLocked/01__Vendor__MermaidJs__v11.16.0/mermaid.min.js`
- `90__Reference__SkillGuides/Reference__TranscriptionMethod__.md`
- `90__Reference__SkillGuides/Reference__MermaidAuthoring__.md`

# =============================================================================
# End of File
# =============================================================================
