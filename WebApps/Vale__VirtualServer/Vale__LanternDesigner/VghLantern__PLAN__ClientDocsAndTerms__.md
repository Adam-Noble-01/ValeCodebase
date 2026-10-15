# Vale Lantern Designer - Client Doc Editor and Terms & Conditions System

**Plan for review. Nothing has been built yet.**
Target version: `v0.5.0`
Author: Adam Noble - Noble Architecture
Date: 04-Aug-2026

---

## 1. What I found in the codebase

The app is a classic-script, IIFE-per-module, config-driven codebase with a very disciplined
separation of concerns. The parts this feature touches:

### 1.1 Boot and core

| Module | Role |
|---|---|
| `VghLantern__AppCore__ConfigLoader__.js` | Fetches `VghLantern__AppConfig__Main__.json`, then overlays each co-located `Na__*__Config.json`. Ten overlays registered today. `GetSection(name)` is the only read path. `RequireNumber / RequireString / RequireBoolean / RequireArray` log loudly and return a visibly wrong value rather than a plausible default. |
| `VghLantern__AppCore__StateManager__.js` | Single mutable state object plus an event emitter. Events used here: `projectChanged`, `lanternUpdated`, `geometrySolved`, `dirtyStateChanged`, `modeChanged`. |
| `VghLantern__AppCore__ModeManager__.js` | Mode descriptor table maps a mode id to a DOM panel id and a full-bleed flag. |
| `VghLantern__AppCore__Init__.js` | Boots config, libraries, server sync, then wires nav, one-time module inits, mode lifecycle, geometry lifecycle and debounced autosave. `OnModeEntered` is where each mode's render is triggered. |
| `VghLantern__AppUtils__ProjectSchemaValidator__.js` | The single authority on project file shape. Every create / load / save / sync path runs through it. New project blocks must be normalised here or they will not survive a round trip. |

### 1.2 The document pipeline (the important part)

This is already very well factored, and the plan leans on it rather than working around it.

```
                    VghLantern__PdfWriter__Document__Write(pages, options)
                                        |
        one ordered list of page descriptors, each carrying its own paper size
                                        |
      +--------------------+------------+-------------+--------------------+
      |                    |                          |                    |
 SpecificationPdfPainter  SheetPdfPainter        (new) LetterPdfPainter  (new) TermsPdfPainter
   Kind 'specification'   Kind 'drawingSheet'      Kind 'welcomeLetter'    Kind 'terms'
   A4 portrait, flows     A3 landscape, one page   A4 portrait, flows      A4 portrait, flows
```

Key facts that shape the design:

- **`VghLantern__PdfWriter__Document__.js` is the only place a PDF is created or saved.** A page
  descriptor is `{ Kind, WidthMm, HeightMm, Paint(doc, context) }`. `context.AddOverflowPage()` is
  the only sanctioned way a painter may extend the document, and it keeps the new page at the
  descriptor's own size and registered for the footer pass. Orientation is always derived from the
  dimensions, never passed in.
- **`VghLantern__DocPreview__PdfExporter__.js` paints nothing.** It decides which pages exist and in
  what order, then hands them to the writer. Adding a page kind is a small, local change here.
- **`VghLantern__DocPreview__DocumentState__.js`** owns the toggle keys and `ListPageKinds()`, which
  reads `Config__Page.PageOrder`. Preview and export both call it, so they cannot diverge.
- **`VghLantern__DocPreview__PageRenderer__.js`** renders the on-screen preview from the same
  `ListPageKinds()`, and reads the footer straight out of the PDF writer's config block.
- **`VghLantern__DocPreview__SpecificationPdfPainter__.js`** is the model for any new flowing painter:
  a cursor with `EnsureSpace`, `WriteHeading`, `WriteParagraph`, `WriteTable`. I will reuse its
  shape exactly.

### 1.3 The drawing sheet

```
SheetPdfLayout   solves every paper-millimetre rectangle (grid, notes, titleblock, slots)
      |
SheetChrome      turns that layout into ONE flat list of primitives (Rect / Line / Text / Image)
      |          and renders that same list two ways:
      +--> ToSvgMarkup()  -> the on-screen sheet overlay
      +--> DrawToPdf()    -> the exported page
      |
SheetSurface     builds the sheet DOM (Drawing Editor interactive, Preview & Send baked)
SheetPdfPainter  rasterises views at true 1:N and paints the chrome primitives
```

This "one description, two renderers" rule is the load-bearing idea of the drawing sheet, and the
QR block will be added as a first-class primitive rather than as an image, so it inherits it.

The notes block currently on the sheet is `Config__Annotations.GeneralNotes`, the three lines in
your screenshot, concatenated with any project job notes.

### 1.4 Persistence

- Project files are JSON on disk in `07__LocalProjectData/`, written through the stdlib HTTP server
  (`/api/projects/{code}`), mirrored in localStorage.
- Autosave is debounced and triggered by `MarkDirty()` or `lanternUpdated`. Any editor that mutates
  the project and calls `MarkDirty()` persists with no save button. This is exactly what the letter
  and terms editors need.
- Per-user UI preferences go to `08__LocalUserData` via `/api/user-menu-config/{slug}`.

### 1.5 Constraints I will respect

- **JSON trumps JS.** No magic numbers, no `|| 12` fallbacks. Every tunable goes in a
  `Na__*__Config.json`, read through `Require*`.
- **No new external dependencies.** `04__Src__Dependencies__VersionLocked` is a deliberate,
  CDN-independent set. There is no QR library, so I will write one (section 4.6).
- **No emojis, no em dashes** in any UI copy, notes or documents.
- Naming, region banners, comment style and the `// ---` rules all follow the existing files.

---

## 2. Decisions taken (from your answers)

| Decision | Choice |
|---|---|
| Terms numbering | Fixed section index from config, live renumber within a section. `1.01` is always a Critical term, `4.08` is always a Payment term. Toggling a section off does not renumber the others. |
| Editing surface | Block editor, one plain-text auto-growing textarea per paragraph / term, with add, delete, drag-reorder and per-block reset to template. No markdown parsing in the editor. |
| QR target | A working deep link. `{BaseUrl}?doc=terms&project={code}`. The app reads the query at boot and opens the Client Doc tab on the terms. `BaseUrl` is one JSON key, clearly marked as a placeholder. |
| Nav position | Projects / Lantern Editor / 3D View / Drawing Editor / Specification / **Client Doc** / Preview & Send. The tab sits immediately before Preview & Send. |
| Document page order | Independent of the tab position, and exactly as briefed: **1 Welcome Letter, 2 Drawing, 3 Specification, 4 Special Terms, 5 General Terms.** Special terms lead the terms document because critical and special are the project's own; the standard library sections follow. |

---

## 3. Two new system folders

You asked for the terms system to have a proper `System__` folder. It gets one, and the tab that
hosts it gets its own, because they are genuinely two things: a mode with an editing UI, and a
document engine with a content library.

```
02__Src__AppModules/
  37__System__ClientDocumentMode/          <-- the tab: editors, letter model, letter output
  38__System__TermsAndConditions/          <-- the engine: markdown library, numbering, output
    Na__Terms__Library/                    <-- the editable markdown docs
```

`37` and `38` sit between `35__System__SpecificationMode` and `40__System__DocumentPreviewMode`,
which matches both the nav order and the document order.

### 3.1 `37__System__ClientDocumentMode`

| File | Purpose |
|---|---|
| `Na__ClientDocument__Config.json` | Letter template paragraphs, salutation and sign-off defaults, editor limits, labels, letter typography for screen and PDF. |
| `VghLantern__ClientDoc__LetterModel__.js` | The letter as data. Materialises the template on first open, resolves tokens, returns an ordered block list. The only writer of the letter block onto the project. |
| `VghLantern__ClientDoc__BlockEditor__.js` | The reusable block editor widget: card, textarea, add, delete, drag-reorder, reset-to-template. Used three times (letter paragraphs, special terms, critical terms) so the interaction is authored once. |
| `VghLantern__ClientDoc__LetterEditor__.js` | Binds the block editor to the letter model, plus the salutation / sign-off fields. |
| `VghLantern__ClientDoc__TermsEditor__.js` | Critical terms panel, special terms panel, and the standard-section on/off toggles. Writes to the project, reads numbering from the Terms model. |
| `VghLantern__ClientDoc__LetterScreenRenderer__.js` | Print-faithful letter HTML for the editor preview pane and for Preview & Send. |
| `VghLantern__ClientDoc__LetterPdfPainter__.js` | `BuildPage()` returning a `welcomeLetter` page descriptor. Flows through `AddOverflowPage`. |
| `VghLantern__ClientDoc__Layout__.js` | The mode shell: header, edit column, live preview column, render lifecycle, one-time bindings. |
| `VghLantern__ClientDoc__Styles__Main__.css` | Mode styling, imported by the CSS index. |

### 3.2 `38__System__TermsAndConditions`

| File | Purpose |
|---|---|
| `Na__Terms__Config.json` | The section table (key, fixed number, label, source file, default enabled), the numbering format, the QR block copy and URL, and terms typography. |
| `Na__Terms__Library/Na__Terms__01__GeneralAndLegal__.md` | Standard section 3 content. |
| `Na__Terms__Library/Na__Terms__02__Payment__.md` | Standard section 4 content. |
| `Na__Terms__Library/Na__Terms__03__SiteAccess__.md` | Standard section 5 content. |
| `Na__Terms__Library/Na__Terms__04__BuildersUpstand__.md` | Standard section 6 content. |
| `VghLantern__Terms__MarkdownLoader__.js` | Fetches and caches each `.md` once per session, parses it into term records, reports a load failure rather than silently issuing an incomplete document. |
| `VghLantern__Terms__DocumentModel__.js` | **The numbering authority.** Assembles the full ordered, numbered, toggled terms document from config sections, the markdown library and the project's critical / special terms. |
| `VghLantern__Terms__ScreenRenderer__.js` | Print-faithful terms HTML for the editor preview and Preview & Send. |
| `VghLantern__Terms__PdfPainter__.js` | `BuildPage()` returning a `terms` page descriptor. |
| `VghLantern__Terms__QrLink__.js` | Resolves the QR target URL from config plus project code, and handles the inbound `?doc=terms&project=` deep link at boot. |
| `VghLantern__Terms__Styles__Main__.css` | Terms document styling. |

### 3.3 Additions to `03__AppUtils`

| File | Purpose |
|---|---|
| `VghLantern__AppUtils__QrEncoder__.js` | First-party QR encoder. Pure function, no DOM, no config: takes a string, returns a square boolean module matrix. |
| `VghLantern__AppUtils__DocumentTokens__.js` | Resolves `{{Token}}` placeholders from the project and lantern set. Shared by the letter template and the terms markdown, so a token means the same thing in both. |

---

## 4. Feature design

### 4.1 The Client Doc tab

Two-column mode, left edits and right previews live, in the same idiom as the Lantern Editor's
split layout.

```
+------------------------------------------------------------------------------+
|  Client Document                                              [ 2614 Epstein ]|
+---------------------------------+--------------------------------------------+
|  WELCOME LETTER                 |                                            |
|   Salutation   [ Dear Jeffrey ] |     ( live A4 preview of the letter,        |
|   +- Paragraph 1 -- ::  ↺  ✕ -+ |       then the numbered terms document,     |
|   | Thank you for your       | |       at the same paper size and type as   |
|   | invitation to quote ...  | |       the exported PDF )                    |
|   +--------------------------+ |                                            |
|          [ + Add paragraph ]    |                                            |
|   Sign off  [ Adam Noble      ] |                                            |
|             [ Design Manager  ] |                                            |
|                                 |                                            |
|  CRITICAL TERMS      (printed red)                                           |
|   +- 1.01 -------- ::  ✕ ----+ |                                            |
|   | Structural opening to be | |                                            |
|   | surveyed before order    | |                                            |
|   +--------------------------+ |                                            |
|          [ + Add critical term ]|                                            |
|                                 |                                            |
|  SPECIAL PROJECT TERMS                                                        |
|   +- 2.01 -------- ::  ✕ ----+ |                                            |
|          [ + Add special term ] |                                            |
|                                 |                                            |
|  STANDARD TERMS                 |                                            |
|   [x] 3  General and Legal   (14 terms)                                       |
|   [x] 4  Payment              (9 terms)                                       |
|   [x] 5  Site Access          (7 terms)                                       |
|   [x] 6  Builders Upstand     (6 terms)                                       |
+---------------------------------+--------------------------------------------+
```

The block editor card is one widget authored once in `VghLantern__ClientDoc__BlockEditor__.js`:

- Auto-growing textarea, plain text.
- Drag handle for reorder (HTML5 drag events, no library).
- Delete, with the existing `ConfirmModal` for a non-empty block.
- Reset-to-template, shown only on blocks that came from the template and have been edited.
- Debounced write to the project plus `MarkDirty()`, so it autosaves like the job notes editor.
  Same `focusout` flush so leaving mid-sentence never loses the sentence.

### 4.2 The welcome letter

The template lives in `Na__ClientDocument__Config.json` as an ordered array of paragraphs, each with
a `Key` and `Text`. Tokens resolve through `DocumentTokens`.

```json
"LetterTemplate": [
  { "Key": "thanks",    "Text": "Thank you for your invitation to quote for the roof lanterns at {{ProjectAddress}}." },
  { "Key": "scope",     "Text": "We are pleased to enclose our proposal covering {{LanternCount}}, together with the drawings and specification schedule for your review." },
  { "Key": "quality",   "Text": "..." },
  { "Key": "terms",     "Text": "Our quotation is issued subject to the terms and conditions that follow. Please read them in full before placing an order." },
  { "Key": "next",      "Text": "..." }
]
```

**Materialise on first open.** The first time the tab opens for a project, the resolved template is
written onto the project file as concrete blocks, each carrying its `TemplateKey`. From then on the
letter is that project's letter and does not silently change when the template is edited. Per-block
reset pulls the current template text back in on demand. This is deliberate: an issued document must
not mutate under you.

Tokens available in both the letter and the terms markdown:

`{{ProjectAddress}}` `{{ProjectName}}` `{{ProjectCode}}` `{{ClientName}}` `{{IssueDate}}`
`{{AuthorName}}` `{{LanternCount}}` `{{CompanyName}}`

An unresolved token renders as an empty string and raises a Preview & Send warning naming the token,
rather than printing `{{ProjectAddress}}` on a document that goes to a client.

`{{Vale-Legal-Team-To-Confirm}}` is a **reserved token** and is the one exception: it is never
resolved away. See section 6.3.

### 4.3 The terms markdown library

Deliberately minimal so the files are genuinely easy to edit:

```markdown
# Payment Terms

> Editor note lines start with a chevron and are never printed.
> Every clause below states its subject only. Vale's legal team supplies the wording.

Deposit percentage and the point at which it becomes payable. {{Vale-Legal-Team-To-Confirm}}

Balance payment trigger, whether that is despatch from works, delivery to site or
practical completion of the installation. {{Vale-Legal-Team-To-Confirm}}

Retention of title until payment is received in full. {{Vale-Legal-Team-To-Confirm}}

Interest and recovery costs on late payment. {{Vale-Legal-Team-To-Confirm}}
```

**No invented legal wording.** Each clause is a one-line statement of the subject the clause must
cover, followed by the reserved token. Nothing in the library reads as finished legal text, so
nothing can be mistaken for it. See section 6.3 for how the token behaves.

Rules:
1. The first `# ` line is the file's own title. Informational only; the config `Label` is what prints.
2. Every blank-line separated paragraph after that is **one term**. Multi-line paragraphs are fine.
3. Lines starting with `>` are editor notes and are skipped.
4. Nothing else is parsed. No bold, no nesting, no tables. Sub-clauses are a later addition if wanted.

Adding a term is adding a paragraph. Adding a whole section is a new `.md` plus one row in the
config section table.

### 4.4 Numbering

`VghLantern__Terms__DocumentModel__.js` is the only place a number is assigned.

```json
"Sections": [
  { "Key": "critical", "Number": 1, "Label": "Critical Project Terms",   "Source": "project:critical", "IsCritical": true },
  { "Key": "special",  "Number": 2, "Label": "Special Project Terms",    "Source": "project:special" },
  { "Key": "general",  "Number": 3, "Label": "General Terms and Legal",  "Source": "library:Na__Terms__01__GeneralAndLegal__.md" },
  { "Key": "payment",  "Number": 4, "Label": "Payment Terms",            "Source": "library:Na__Terms__02__Payment__.md" },
  { "Key": "access",   "Number": 5, "Label": "Access to Site Terms",     "Source": "library:Na__Terms__03__SiteAccess__.md" },
  { "Key": "upstand",  "Number": 6, "Label": "Builders Upstand Terms",   "Source": "library:Na__Terms__04__BuildersUpstand__.md" }
],
"NumberFormat"      : "{section}.{term}",
"TermNumberPadding" : 2
```

- Section number is fixed by config. It never moves.
- Term number is the one-based index within that section's enabled terms, zero padded to
  `TermNumberPadding`, so `4.08`.
- Adding, deleting or reordering a special term renumbers **that section** immediately, in the
  editor, in the preview and in the PDF, because all three read the same model. Nothing else moves.
- Switching a standard section off removes its terms from the document and leaves every other
  section's numbers untouched.
- Every term therefore has a unique, stable, citable number.

Critical terms print in `CriticalTermColour` (matching the existing `UserWarningColour`, `#d32f2f`)
in both the preview and the PDF, using the same colour-override path
`SpecificationPdfPainter` already uses for staff-authored warnings.

### 4.5 Document order and the toggles

`Na__DocPreview__Config.json` -> `Config__Page.PageOrder` becomes:

```json
"PageOrder" : ["welcomeLetter", "drawing", "specification", "terms"]
```

Which gives exactly the briefed running order:

| # | Page | Kind | Paper |
|---|---|---|---|
| 1 | Welcome Letter | `welcomeLetter` | A4 portrait, flows |
| 2 | Drawing | `drawingSheet` | A3 landscape (whatever the Drawing Editor is set to) |
| 3 | Specification | `specification` | A4 portrait, flows |
| 4 | Critical then Special Terms | `terms` | A4 portrait, flows |
| 5 | General, Payment, Access, Upstand Terms | `terms` | continues the same flow |

Pages 4 and 5 are one flowing `terms` descriptor, not two, because they are one continuously
numbered document. The section order inside it puts the project's own terms first.

> **Note this reverses the current default.** Today spec comes before the drawing. Your brief puts
> the drawing at 2 and the spec at 3, so the default changes. It is one JSON array.

**Preview & Send toolbar** gains a Terms group:

```
Document  [x] Welcome Letter  [x] Drawing Sheet  [x] Takeoff  [x] Components  [x] Job Notes
Terms     [x] Terms Pages  |  [x] Critical  [x] Special  [x] General  [x] Payment  [x] Access  [x] Upstand
```

**One store per toggle, no drift.** The page-level switches (`ShowWelcomeLetter`, `ShowTermsPages`)
are per-user UI preference and go to the existing user menu config, like every other toggle today.
The **per-section** toggles are document content, not a UI preference, so they live on the
**project file** and are edited by both surfaces. Flip a section off in Preview & Send and the
Client Doc tab shows it off, because there is one value.

### 4.6 The QR encoder

No QR library exists in the locked dependency set and pulling one in from a CDN would break the
offline PWA contract. `VghLantern__AppUtils__QrEncoder__.js` is a self-contained encoder:

- Byte mode, error correction level M, automatic smallest version for the payload.
- Galois field arithmetic for Reed-Solomon, the standard mask evaluation, format and version info.
- Returns `{ Size, Modules }` where `Modules` is a `Size x Size` boolean array. No DOM, no canvas,
  no config, no side effects. Roughly 380 lines including the region banners.

A typical payload (`http://localhost:8006/VghLantern__App__.html?doc=terms&project=2614`, 58 bytes)
lands on version 4, a 33 x 33 matrix.

**It renders as a chrome primitive, not an image.** `SheetChrome` gains `KIND_QR`, carrying the
module matrix and a paper-millimetre rectangle. Each renderer expands it, merging horizontal runs of
dark modules into single rectangles first (which cuts a 33 x 33 matrix from ~540 marks to ~150):

- SVG: a `<g>` of `<rect>` elements at millimetre coordinates.
- PDF: filled `doc.rect(...)` calls at the same coordinates.

The QR is therefore vector on paper, crisp at any zoom, and obeys the module's existing rule that
anything drawn on a sheet is described once and rendered twice.

### 4.7 The drawing sheet changes

**Before** (from your screenshot):

```
+-------------------------------------------------------------------------+
|  [ front elev ]                    |  [ side elev ]                      |
|  [ plan      ]                     |  [ 3D        ]                      |
|                                                                         |
|  NOTES                                                                   |
|  1. All dimensions in millimetres unless noted otherwise.               |
|  2. Do not scale from this drawing; work to figured dimensions.         |
|  3. Glazing to be installed in accordance with the specification.       |
|  +---------+---------+------+--------+---------+-----+-------+--------+ |
|  |  VALE   | PROJECT | CODE | CLIENT | DRG NO. | REV | SCALE | DATE   | |
|  +---------+---------+------+--------+---------+-----+-------+--------+ |
+-------------------------------------------------------------------------+
```

**After:**

```
+-------------------------------------------------------------------------+
|  [ front elev ]                    |  [ side elev ]                      |
|  [ plan      ]                     |  [ 3D        ]                      |
|                                                       +---------------+ |
|                                                       | TERMS AND     | |
|                                                       | CONDITIONS    | |
|  +------+--------+----+------+-------+---+-----+-----+ | It is manda-  | |
|  | VALE |PROJECT |CODE|CLIENT|DRG NO.|REV|SCALE|DATE | | tory to read  | |
|  +------+--------+----+------+-------+---+-----+-----+ | the full      | |
|                                                       | terms before  | |
|                     ( the field strip squeezes left ) | using these   | |
|                                                       | drawings.     | |
|                                                       |      [ QR ]   | |
|                                                       +---------------+ |
+-------------------------------------------------------------------------+
```

Concretely:

1. **`SheetPdfLayout__Solve` gains a `TermsCallout` rectangle**, anchored to the bottom-right of the
   content area with its own `WidthMm` and `HeightMm` from config. The titleblock strip's width is
   reduced by `TermsCallout.WidthMm + BlockGapMm`, which is what squeezes the existing fields left.
   Because the callout is taller than the 10 mm titleblock strip, the view grid's bottom becomes
   `min(titleBlock.Y, termsCallout.Y) - blockGapMm`, so nothing can overlap at any sheet size.
2. **`SheetChrome` gains `BuildTermsCallout`**, pushing the box, the heading, the wrapped mandatory
   reading copy and the `KIND_QR` primitive. It sits in the same primitive list as everything else,
   so the screen sheet and the PDF get it identically with no second implementation.
3. **The notes block is removed from the drawing entirely**, not emptied. It deletes cleanly:
   `AnnotationLayer` is reached only from `SheetManager` (note count) and `SheetChrome`
   (`BuildForSheet`), so the whole file goes, along with the `Notes` rectangle in `SheetPdfLayout`,
   `BuildNotes` in `SheetChrome`, the `Config__Annotations` block, and the four now-orphaned
   `SheetStyle` note keys. The full removal list is in section 5.2.

   **Job notes are not lost.** They are a separate thing: typed in the Specification tab, stored on
   `GlobalSettings.JobNotes`, and printed on the specification document under the existing
   `ShowJobNotes` toggle. That path is untouched. What goes is the drawing sheet's copy of them and
   the three standing general notes above them.
4. **The QR link is placeholder-marked in three places**: the config key note, a note printed
   beneath the QR in the callout itself, and the DEVLOG entry.

### 4.8 The deep link

`VghLantern__Terms__QrLink__.js` reads `?doc=terms&project=CODE` at boot. `Init.js` calls it once
after `SyncFromServer()` has populated the cache:

- Loads the named project if it is not already open.
- Switches to the Client Doc mode.
- Scrolls the preview column to the terms document.
- If the project code is unknown, raises a toast naming the code rather than failing silently.

`Na__Terms__Config.json`:

```json
"TermsQrBaseUrl"     : "http://localhost:8006/VghLantern__App__.html",
"TermsQrBaseUrlNote" : "PLACEHOLDER ADDRESS. This is a localhost development link so the QR is testable today. Replace with the hosted Vale client terms URL when the online portal exists. Changing this one key is the whole migration - nothing in JS knows the address.",
"TermsQrQueryPattern": "?doc=terms&project={projectCode}"
```

---

## 5. Full work list

### 5.1 New files (23)

```
02__Src__AppModules/03__AppUtils/
  VghLantern__AppUtils__QrEncoder__.js
  VghLantern__AppUtils__DocumentTokens__.js

02__Src__AppModules/37__System__ClientDocumentMode/
  Na__ClientDocument__Config.json
  VghLantern__ClientDoc__LetterModel__.js
  VghLantern__ClientDoc__BlockEditor__.js
  VghLantern__ClientDoc__LetterEditor__.js
  VghLantern__ClientDoc__TermsEditor__.js
  VghLantern__ClientDoc__LetterScreenRenderer__.js
  VghLantern__ClientDoc__LetterPdfPainter__.js
  VghLantern__ClientDoc__Layout__.js
  VghLantern__ClientDoc__Styles__Main__.css

02__Src__AppModules/38__System__TermsAndConditions/
  Na__Terms__Config.json
  VghLantern__Terms__MarkdownLoader__.js
  VghLantern__Terms__DocumentModel__.js
  VghLantern__Terms__ScreenRenderer__.js
  VghLantern__Terms__PdfPainter__.js
  VghLantern__Terms__QrLink__.js
  VghLantern__Terms__Styles__Main__.css

02__Src__AppModules/38__System__TermsAndConditions/Na__Terms__Library/
  Na__Terms__01__GeneralAndLegal__.md
  Na__Terms__02__Payment__.md
  Na__Terms__03__SiteAccess__.md
  Na__Terms__04__BuildersUpstand__.md
```

### 5.2 Modified files (14)

| File | Change |
|---|---|
| `VghLantern__App__.html` | New nav tab before Preview & Send, new mode panel section, new script tags in dependency order. |
| `VghLantern__CoreUi__Styles__Index__.css` | Two new `@import` lines. |
| `VghLantern__AppCore__ConfigLoader__.js` | Two overlay entries, two section variables, two `GetSection` keys. |
| `VghLantern__AppCore__ModeManager__.js` | `ClientDocument` mode descriptor and constant. |
| `VghLantern__AppCore__Init__.js` | Client Doc render hook in `OnModeEntered`, one-time init in `InitSystemModules`, mode-exit flush, deep-link check after server sync. |
| `VghLantern__AppUtils__ProjectSchemaValidator__.js` | Normalise the new `VghLantern__ProjectFile__ClientDocument` block. |
| `VghLantern__AppData__ProjectFileManager__.js` | Seed the new block in `BuildNewProjectData`. |
| `VghLantern__DocPreview__DocumentState__.js` | Two new toggle keys, terms section toggle accessors reading and writing the project, `ListPageKinds` handles the two new kinds. |
| `VghLantern__DocPreview__PageRenderer__.js` | Terms toolbar group, welcome letter page body, terms page body. |
| `VghLantern__DocPreview__PdfExporter__.js` | Build the `welcomeLetter` and `terms` page descriptors. |
| `VghLantern__DocPreview__DocIssueHandler__.js` | Errors for a failed terms library load, warnings for unresolved tokens and an empty letter. |
| `Na__DocPreview__Config.json` | New `PageOrder`, new toggle defaults and labels. |
| `Na__DrawingEditor__Config.json` | `Config__Annotations` block deleted whole. `SheetStyle.NotesTitleWeight`, `NotesTitleTrackingMm`, `NotesTitleUppercase` and `NoteWeight` deleted. New `TitleBlock.TermsCallout` block. |
| `VghLantern__DrawingEditor__SheetPdfLayout__.js` | Remove `MeasureNotes`, the `Notes` rectangle, the `noteCount` parameter, the `NoteMm` / `LineSpacing` font entries and the Notes line in the layout-shape header comment. Solve the `TermsCallout` rectangle, shorten the titleblock, take the grid bottom from `min(titleBlock.Y, termsCallout.Y)`. |
| `VghLantern__DrawingEditor__SheetChrome__.js` | Remove `BuildNotes`, the `Notes` context key, the `AnnotationLayer` lookup in `BuildForSheet` and the four note style keys. Add `KIND_QR` plus its SVG and PDF renderers, and `BuildTermsCallout`. |
| `VghLantern__DrawingEditor__SheetManager__.js` | Remove the note-count helper and the `noteCount` argument to `Solve`. |
| `Na__ServiceWorker__VghLantern.js` | `.md` added to the network-first data pattern so an edited terms file is never shadowed by cache, for the same reason JSON already is. Cache version token bumped. |
| `VghLantern__DEVLOG__.md` | `v0.5.0` entry. |

### 5.2b Deleted files (1)

```
02__Src__AppModules/30__System__DrawingEditorMode/
  VghLantern__DrawingEditor__AnnotationLayer__.js     <-- plus its script tag in VghLantern__App__.html
```

### 5.3 Project file schema addition

```json
"VghLantern__ProjectFile__ClientDocument": {
    "VghLantern__ProjectFile__ClientDocument__Description"      : "The client-facing welcome letter and the project's own terms. Standard terms are not stored here - they live in the markdown library and only their on/off state is a project decision.",
    "VghLantern__ProjectFile__ClientDocument__LetterSalutation" : "",
    "VghLantern__ProjectFile__ClientDocument__LetterBlocks"     : [],
    "VghLantern__ProjectFile__ClientDocument__SignOffName"      : "",
    "VghLantern__ProjectFile__ClientDocument__SignOffRole"      : "",
    "VghLantern__ProjectFile__ClientDocument__CriticalTerms"    : [],
    "VghLantern__ProjectFile__ClientDocument__SpecialTerms"     : [],
    "VghLantern__ProjectFile__ClientDocument__SectionToggles"   : {}
}
```

A letter block is `{ "Id": "...", "TemplateKey": "thanks" | null, "Text": "..." }`.
A term is `{ "Id": "...", "Text": "..." }`.
`SectionToggles` maps a section key to a boolean and holds **only** explicit overrides, so a section
added to config later comes in at its configured default on an existing project.

### 5.4 Build order

1. **Foundations.** `QrEncoder`, `DocumentTokens`, both config JSONs, the four markdown files.
   Nothing wired yet, nothing can break.
2. **The terms engine.** `MarkdownLoader`, `DocumentModel`, `ScreenRenderer`, `PdfPainter`,
   `QrLink`. Numbering testable in isolation from the console.
3. **The mode.** Schema block, ProjectFileManager seed, `LetterModel`, `BlockEditor`,
   `LetterEditor`, `TermsEditor`, `Layout`, CSS, the HTML panel, the nav tab, ModeManager,
   ConfigLoader, Init wiring.
4. **The output pipeline.** `LetterScreenRenderer`, `LetterPdfPainter`, then `DocumentState`,
   `PageRenderer`, `PdfExporter`, `DocIssueHandler` and the DocPreview config.
5. **The drawing sheet.** `SheetPdfLayout` rectangle, `SheetChrome` QR primitive and callout,
   drawing config, notes emptied.
6. **Housekeeping.** Service worker, DEVLOG.

Each stage leaves the app running. Stage 5 is the only one that changes an existing output, and it
is the last one in.

---

## 6. Rulings received

### 6.1 The notes block on the drawing - RIP OUT

Removed entirely, not emptied. The whole `AnnotationLayer` module, the `Notes` rectangle in
`SheetPdfLayout`, `BuildNotes` in `SheetChrome`, the `Config__Annotations` config block and the four
orphaned `SheetStyle` note keys all go. Removal list in section 5.2, deleted file in section 5.2b.

Job notes survive. They are stored on `GlobalSettings.JobNotes`, edited in the Specification tab and
printed on the specification document under the existing `ShowJobNotes` toggle. That path is not
touched.

### 6.2 Footer on the letter page - KEEP

The welcome letter and the terms pages both carry the standard footer and count toward
`Page {n} of {total}`. `SkipOnPageKinds` stays `["drawingSheet"]`.

### 6.3 Terms content - SUBJECT NOTES PLUS RESERVED TOKEN

No invented legal wording anywhere. Each clause in the four markdown files is a one-line statement
of what the clause must cover, followed by `{{Vale-Legal-Team-To-Confirm}}`.

The token is handled as a **reserved token** by `DocumentTokens`:

- It is never substituted or blanked. It prints literally, in the critical-term red
  (`#d32f2f`), on screen and in the PDF, so an unfinished clause is impossible to miss on a page.
- Every occurrence raises a Preview & Send **warning** (not an error) listing the clause numbers
  that still carry it, for example: `Terms 3.02, 3.07, 4.01 and 6 others await Vale legal wording.`
- It is a warning rather than a blocking error so the document is still previewable and exportable
  as an internal draft while the wording is being written. Making it blocking later is one entry in
  `Config__Issues.BlockExportOnError`, and the config key carries a note saying so.

Once Vale's legal team supplies wording, replacing a clause is editing one paragraph in one `.md`
file and deleting the token. The warning count falls to zero on its own.

### 6.4 Scope I am not building

Not in this pass, flag them if you want them added:

- Sub-clause nesting inside a term (`4.08.a`).
- A signature or acceptance page on the terms document.
- Emailing the bundle. The tab is called Client Doc Editor and it edits and exports.
- Rich text formatting in the letter. Per your answer, plain prose blocks.

---

## 7. Estimate

Roughly 3,100 lines of new JS, 470 lines of JSON config, 260 lines of CSS, and around 160 lines of
markdown terms content, plus about 400 lines of changes across the 17 modified files and one
deletion. The QR encoder is the single largest new file at roughly 380 lines.

---

## 8. Revision history of this plan

| Rev | Change |
|---|---|
| A | First issue. |
| B | Notes block ripped out entirely rather than emptied (6.1). Footer kept on the letter and terms pages (6.2). Terms markdown becomes subject notes plus the reserved `{{Vale-Legal-Team-To-Confirm}}` token, no invented legal wording (6.3). Document page order table added to 4.5, confirming tab position and page order are independent. |
| C | **Built. Three changes made during the build, all from review of the running app.** (1) The terms block is no longer a separate taller box above the titleblock, as drawn in 4.7. It is the right-hand CELL of the titleblock strip, mirroring the logo cell: same height, same label and value type, same baselines, same dividing rule. The QR is exactly as tall as the strip allows. `SheetPdfLayout` therefore no longer solves a `TermsCallout` rectangle at all - the titleblock keeps its full width and the cell is solved inside it by `SheetChrome`, alongside the logo cell. (2) The placeholder notice line under the code is gone; the placeholder status is recorded in config notes and the DEVLOG instead. (3) **New module not in this plan: `VghLantern__DocPreview__FlowPaginator__.js`.** The preview was putting a whole flowing document in one page shell and letting it overflow the paper. It now measures and cuts flowing bodies into real pages, so the terms document breaks where the PDF breaks and the on-screen footer can print the same "Page 2 of 7" the file will. This fixes the specification pages too, which had the same latent bug. |

---

**Approve this and I will build it in the six stages in section 5.4.**
