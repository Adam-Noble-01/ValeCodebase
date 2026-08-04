---
name: vale-scan-to-mermaid
description: >-
  Turn a scanned hand-drawn diagram into a Vale Garden Houses branded Mermaid
  document. Use whenever the user wants to convert a sketch, flowchart, process
  diagram or whiteboard photo into a Mermaid chart — especially from a scanned
  PDF, PNG or JPEG where the page is an image with no selectable text. Covers
  pencil-lifting pre-processing, transcription with confidence flagging, Mermaid
  authoring with Vale semantic colours, and baking a self-contained HTML and
  Markdown document for presentations. Triggers on "PDF to diagram", "scan to
  Mermaid", "sketch to flowchart", "hand drawn diagram", "turn this drawing into
  a chart", or any mention of the James__MermaidDiagram working folder.
---

# Vale Scan To Mermaid

Convert a scanned hand-drawn sheet into a Vale-branded, presentation-ready
diagram document. The pipeline is three steps: **pre-process the scan**, **read
and transcribe it yourself**, then **bake the document**.

The two scripts do the mechanical work. The middle step — actually understanding
the drawing — is yours, and it is the step that decides whether the output is any
good.

## Project layout

Inputs and outputs sit in numbered sibling folders:

```
<project>/
    01__Input__Image/            <-- PNG / JPEG scans
    02__Input__PDF/              <-- PDF scans
    03__Processed__Image/        <-- written by step 1
    04__Output__Mermaid/         <-- .mmd files and the transcription JSON
    05__Output__Document/        <-- .html, .md and 00__Index__.html
    99__Style__MermaidTheme/     <-- per-project theme override, seeded on first run
```

## Step 1 — Pre-process the scan

Pencil on white paper scans faint. This lifts it before you try to read it.

```bash
python "02__Src__AppModules/10__System__ImagePreprocessor/ScanToMermaid__ImagePreprocessor__Main__.py" "<path to PDF, PNG, JPEG or folder>"
```

Greyscales, auto-detects the paper white, applies a gamma of **0.43** (matching
the Photoshop Levels preset), and optionally unsharp-masks. It writes three
things per page into `03__Processed__Image/`:

| Artefact | Purpose |
| --- | --- |
| `..._P01__Levels__.png` | Full resolution, embedded in the document |
| `..._P01__Levels__Read__.png` | Whole-sheet copy for grasping the structure |
| `..._P01__Levels__Tile__R1C1__.png` … | Overlapping detail tiles for reading handwriting |

Useful flags: `--gamma`, `--no-autowhite`, `--no-sharpen`, `--tiles 3x2`,
`--no-tiles`, `--dpi`, `--out`.

For PDFs the embedded scan is lifted at native resolution rather than
re-rasterised, so nothing is resampled twice.

## Step 2 — Read the sheet and write the transcription

**Read the `Read__` copy first** to grasp the overall structure, then **read every
tile** before transcribing. Do not skip the tiles — whole-sheet resolution is
enough to see the shape of a flow but not enough to read the words, and guessing
at handwriting you have not actually looked at is how errors get in.

Follow `90__Reference__SkillGuides/Reference__TranscriptionMethod__.md` for how to
read the sheet and when to flag something. Follow
`90__Reference__SkillGuides/Reference__MermaidAuthoring__.md` for layout strategy
and the Vale semantic classes.

Write a transcription JSON into `04__Output__Mermaid/<stem>__P01__Content__.json`:

```json
{
    "Document__Title"           : "Key Design Efficiency Flow",
    "Document__HeaderTitle"     : "Key Design Efficiency Flow",
    "Document__Subtitle"        : "One line describing what the sheet covers",
    "Document__SourceFile"      : "PdfToDiagram__Test__.pdf",
    "Document__SourcePage"      : 1,
    "Document__TranscribedDate" : "04-Aug-2026",
    "Diagram__MermaidDefinition": "flowchart TD\n    ...",
    "Notes__Sections"           : [
        { "Section__Title": "...", "Section__Items": ["...", "..."] }
    ],
    "Legend__Items"             : [ { "Legend__Label": "Site Visit" } ],
    "Review__Flags"             : [
        {
            "Flag__Location"    : "Where on the sheet",
            "Flag__Transcribed" : "What you wrote down",
            "Flag__Alternative" : "What else it might say",
            "Flag__Confidence"  : "low"
        }
    ],
    "Source__ProcessedImage"    : "..._P01__Levels__Read__.png"
}
```

Notes items accept inline HTML. Use `<span class="notes-emphasis">` for text that
was underlined on the sheet, and
`<span class="uncertain" title="why you are unsure">word</span>` for a doubtful
reading — it renders with a dotted underline and a hover explanation.

Transcribe **everything on the sheet**, not just the flowchart: numbered notes
panels, legends, marginal annotations and title boxes all carry meaning the
diagram alone does not.

## Step 3 — Bake the document

```bash
python "02__Src__AppModules/30__System__DocumentBuilder/ScanToMermaid__DocumentBuilder__Main__.py" "<path to the transcription JSON or a folder of them>"
```

Writes into `05__Output__Document/`:

- `<stem>.html` — self-contained, Vale-headed, Mermaid renderer inlined, logo and
  original scan embedded as data URIs. Works offline with no install. Print to PDF
  with Ctrl+P; the print stylesheet drops the collapsible sections and keeps the
  diagram whole. Carries **Download PNG** and **Download SVG** buttons that bake the
  rendered diagram out as an image — PNG at 2x for slides, SVG for anything that
  needs to scale. Both are generated in the browser, so they work offline too.
- `<stem>.md` — Markdown twin using the GitHub raw URL for the Vale logo, for
  README and wiki use.
- `00__Index__.html` — Vale-headed contents page, written automatically when more
  than one sheet is built.

It also writes the bare `.mmd` to `04__Output__Mermaid/`.

Flags: `--out`, `--project-root`, `--theme`, `--no-seed-theme`, `--no-scan`.

## Styling

`03__Style__MermaidTheme/Vale__MermaidTheme__.css` is the canonical theme. On the
first build it is copied to `<project>/99__Style__MermaidTheme/`, and that copy
wins from then on — so edit the project copy for a one-off job, and the skill copy
to change the house default.

The `--ValeMermaid_*` custom properties are not decoration. The builder parses
them to generate the Mermaid `classDef` block, and the page reads them again at
render time for the base theme. **Change a colour in the CSS and the diagram
changes** — there are no colours hard-coded in the Python.

## Verify before you hand it over

Open the built HTML and confirm the diagram actually rendered — a Mermaid syntax
error produces a visible error block, not a crash, so a broken diagram will
otherwise sail through unnoticed. Check the node count matches what you
transcribed, and report the review-flag count to the user so they know what to
spot-check.
