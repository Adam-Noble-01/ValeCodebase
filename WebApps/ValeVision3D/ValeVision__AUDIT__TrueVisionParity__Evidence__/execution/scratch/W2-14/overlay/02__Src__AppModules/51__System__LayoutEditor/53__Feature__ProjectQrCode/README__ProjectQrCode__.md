# Project QR Code

One QR code per project, printed automatically on every document in the pack, so
anybody holding a drawing can point a phone at it and be standing in the 3D model.

The code is the same on every sheet of a project and different for every project.
Nothing is typed, chosen or exported by hand: a document asks this system for the
symbol of the project on screen and paints what it is given.

> **In ValeVision the system is switched off.** TrueVision prints a code that opens its
> own resolver. ValeVision has no resolver yet, so it ships with the system off and no
> address at all until Adam picks one (decision DR-12; package W5-05 switches it on). No
> document is given a symbol, so none draws a code or the note beside it. Nothing imports
> this folder yet either: the title block's QR cell, the shape painter and the parametric
> scrapbook's Project Portal block arrive with their own packages.

## Off three times over

1. **The switches.** `Na__ProjectQr__Config__.json` ships `ProjectQr__Enabled : false`, and
   the title block's own switch, `LayoutEditor__TitleBlock__QrCellEnabled`, is false in
   `03__Core__Config/Na__LayoutEditor__AppConfig__.json`.
2. **It fails closed.** `Na__ProjectQr__IsEnabled` is true only when the config was read and
   says true. TrueVision's is true when the file cannot be read, because its built-in
   fallbacks carry a working address. Here a fetch that failed - offline, a stale cached
   copy, a server answering a missing file with the app's page - must never put a code on a
   Vale drawing.
3. **There is nothing to encode.** `ProjectQr__Link__BaseUrl` is empty, and so is the built-in
   fallback in `Na__ProjectQr__Symbol__.js` (an empty value in the file reads as absent there,
   so the fallback is what an empty base actually gives). And a project's code is a permanent
   resolver key that no master-index entry has yet. No base and no key: no address.

`80__Testing__PrototypeEnvironment/Na__Test__ProjectQr__.test.mjs` proves all three on every
run (its sections 4 and 7).

## What is printed, and what happens when it is scanned

The printed address is not the app's address. A short address is printed, and a flat page
outside the app looks the project's key up in an index and sends the phone on to the
project's full address:

```
printed on the drawing     <resolver>?<key>                                short
        |
        v   the resolver page looks the key up in its index
        |
opened on the phone        .../WebApps/ValeVision3D/?project=<folderId>    long
```

**Why.** How many modules a QR symbol has is decided by how long its address is, and how
big each module prints is what decides whether a phone can read it. The title block's code
is the strip's height less two modules of quiet zone above and below, so in the 10 mm strip:

| Address | Bytes | Symbol | Module |
|---|---|---|---|
| TrueVision's printed address | 42 | version 3, 29 modules | **0.303 mm** |
| The Vale candidate DR-12 names: a `q/` page on ValeCodebase's GitHub Pages, beside the Lantern Designer's `t/` terms resolver, with a four or five character key | 52-53 | version 4, 33 modules | 0.270 mm |
| The same, keyed by the address bar's `?project=` token (`2026/57994__Harris__Scheme-02`) | 79 | version 5, 37 modules | 0.244 mm |
| A short domain of Vale's own | about 21 | version 2, 25 modules | 0.345 mm |
| An app's full address (TrueVision's first attempt, 19-Sep-2026) | 135 | version 8, 49 modules | 0.19 mm - unreadable |

The print floor, `ProjectQr__Symbol__MinModuleMm`, is TrueVision's 0.28 mm, so the GitHub
Pages candidate would be reported by the print-size guard: DR-12 pairs that address with a
0.265 mm floor. TrueVision's full address needed a 20 mm title block, which Adam judged "too
tall, too portrait-feeling, and stretched"; the short address is what let the strip stay at
10 mm.

## The key: permanent, and never the address bar's token

A printed code outlives any rename, so the key it carries must never change.

- **Not the `?project=` token.** Whitecardopedia opens ValeVision with the whole folder id
  (`?project=2026/3047__Doous`): a version 5 symbol, and it changes when the project is
  renamed.
- **Not the bare project code.** Thirteen Vale projects share their code with a sibling
  scheme (`2026/63592__Bressard-Kayode` and `2026/63592__Bressard-Kayode__Scheme-02`), and a
  rename can rewrite a code.
- **A permanent `qrKey` on the project's master-index entry**, written once by the index
  writer (`WebApps/Whitecardopedia/Tools__DevUtils/AutomationUtil__R2Common__Lib__.py`) and
  kept by the worker's rename handler (`CloudflareHandler__ProjectRename__.js`) - DR-12's
  recommendation, which package W5-05 builds.

`Na__QrLink__CurrentProject()` answers `{ projectCode, projectFolder, year }`: the folder and
four-digit year of the master-index entry the address bar names (through the project
loader's `Na__AppUtils__GetProjectFolderFromUrl` and `Na__AppUtils__GetYearFromUrl`), and that
entry's `qrKey` as `projectCode`, read from the index the loader already holds
(`Na__AppUtils__InitMasterIndex`). All three are empty until the loader's index has settled,
and for a project it does not list. No key, no code.

## The three things that must never break, once a code is printed

1. **The resolver's folder must never be moved, renamed or removed.** A code on an issued
   drawing sits in a site bag or a planning file for years.
2. **The resolver's index is written by the index writer, never by hand,** and it follows a
   rename or a delete in the same breath as the master index, because a *stale* entry is
   worse than a missing one. It has to be **published** to take effect.
3. **If the printed pattern ever changes, the resolver must go on answering the old one.**

The resolver is also what keeps old paper alive when the *app* moves: the ValeVision address
lives in that one page, and changing it there re-points every code ever printed.

Once `ProjectQr__Link__IndexUrl` is set, this system reads the index once per project on the
authoring machine and warns on the console if the project on screen is missing from it, or
is listed under another folder or year - because a drawing exported then would carry a code
that opens nothing. It reads `projects[<key>]` as `{ projectFolder, projectYear }`, with the
year in four digits, as the project loader answers it (`2026`).

## Switching it on (package W5-05, once Adam has picked the resolver)

1. Build the resolver outside the app - a port of TrueVision's flat page: text-node
   rendering; `?<key>`, `?p=`, `?project=` and `#<key>` accepted; a relative
   `location.replace` to `WebApps/ValeVision3D/?project=<folderId>` - and its index.
2. Give every master-index entry its permanent `qrKey`, and keep it through a rename.
3. In `Na__ProjectQr__Config__.json`: `ProjectQr__Enabled : true`, `ProjectQr__Link__BaseUrl`,
   `ProjectQr__Link__IndexUrl`, and `ProjectQr__Symbol__MinModuleMm` if the address is longer
   than 42 bytes. In `Na__LayoutEditor__AppConfig__.json`:
   `LayoutEditor__TitleBlock__QrCellEnabled : true`.
4. Rewrite section 4 of `Na__Test__ProjectQr__.test.mjs` against the resolver's index; run
   `Na__Test__ProjectQr__Decode__.py` on its cases; print one drawing and scan it with a phone
   before a pack goes out.

Leave the built-in fallbacks in `Na__ProjectQr__Symbol__.js` empty: the system must go on
failing closed. A sheet painted before the config has landed draws no code, so check that a
sheet already on screen picks the code up when it lands (`na-projectqr-ready`).

## Files

| File | What it does |
|---|---|
| `Na__ProjectQr__Symbol__.js` | **The one door in.** Config, the cached symbol for the project on screen, the note's words, the index check and the print-size check. Fails closed. |
| `Na__ProjectQr__Encoder__.js` | Text to QR matrix. First-party, no dependencies: byte mode, level M, versions 1-10. TrueVision's, which it ported from the Lantern Designer. |
| `Na__ProjectQr__Painter__.js` | The symbol as **one vector path**: an SVG group, a whole SVG document, or straight into jsPDF. |
| `Na__ProjectQr__ProjectLink__.js` | Builds the address from the config's pattern and the project on screen: its master-index entry, and that entry's permanent key. |
| `Na__ProjectQr__Config__.json` | The address, the symbol's colours, quiet zone and smallest readable module, and the words. Switched off, with no address. |

Where a document *puts* the code is that document's business. The drawing title
block's cell is `51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js`,
sized by the `QrCell...` keys of `LayoutEditor__TitleBlock__Config`.

## Putting the code on another document

```js
import { Na__ProjectQr__GetSymbol, Na__ProjectQr__GetNote, Na__ProjectQr__GetSetup, Na__ProjectQr__CheckPrint }
    from '../53__Feature__ProjectQrCode/Na__ProjectQr__Symbol__.js';

const symbol = Na__ProjectQr__GetSymbol();            // null: no project, or switched off - draw NOTHING, not even the note
if (symbol) {
    const colours = Na__ProjectQr__GetSetup().symbol;
    const note    = Na__ProjectQr__GetNote('drawing register');   // { heading, body, compact }
    Na__ProjectQr__CheckPrint(symbol, sizeMm, clearMarginMm, 'Drawing register');   // warns once if a phone could not read it
    // ...then one of the three painters below
}
```

| The document draws with | Use |
|---|---|
| Sheet chrome primitives (drawing sheets, the Specification PDF) | `Na__LeChrome__PushQr(list, x, y, sizeMm, symbol, colours.darkColour, colours.lightColour)` |
| Raw jsPDF (the Drawing Register PDF) | `Na__QrPaint__DrawPdf(doc, symbol, x, y, sizeMm, dark, light)` |
| HTML (the Specification's reading view) | `Na__QrPaint__SvgDocument(symbol, { title, cssClass })` - its viewBox carries its own quiet zone |
| **A code drawn ON a sheet, by a person** | Not this API at all - a `Shape__Qr` block on a vector. See below |

**A code a person places on a drawing does not go through this API.** A shape record may
carry `Shape__Qr : { Qr__MarginMm }`, and `Na__LayoutEditor__ShapeGeometry__` then draws
the shape as it always did and pushes the symbol inside its box, that far in from it:

```js
Shape__Points : [ [0, 0], [B, 0], [B, B], [0, B] ],   Shape__Closed : true,
Shape__Qr     : { Qr__MarginMm : 2.1 }
```

The block names no project and holds no matrix, so the shape carries whatever project it
is looked at in - which is what lets the parametric scrapbook's **Project Portal** block
be dragged onto any sheet, copied, saved to the Custom Scrapbook and dropped into another
project. The margin there is a FRACTION of the code (0.07), not a size, so the quiet zone
stays at two modules whatever size the code is drawn at; `Na__LeShapeGeo__PushQr` reports
the printed size to `CheckPrint` the way a cell does. One record, one filled path, no
seams - never 217 rectangles as 217 shapes.

**A vector's code is grey, not black.** `Na__LeShapeGeo__PushQr` paints it in
`GetSetup().symbol.portalDarkColour` - the config's `PortalDarkColour`, `#595959`,
hsl(0, 0%, 35%) - where every document's own code, the title block's included, keeps
`darkColour` black. Adam, 21-Sep-2026: softer, "so that they don't look so stark on the
page". The Portal block can afford it and the title block cannot: at 15 mm and up its module
is 0.52 mm or more, against the title block's 0.30, so a mono laser's halftone dots are a far
smaller part of each module. The colour is chosen at painting time, never stored on the
record, so a block already on a sheet follows the config with nothing to rebuild.

Rules for whoever does it:

- **x, y and sizeMm are the symbol edge to edge.** Keep `quietZoneModules` of clear
  paper round it; rules and type both count as not clear.
- **Size it from the module, not the other way round.** Aim for 0.30 mm a module or
  more: an A4 register has room for a 12 mm code, which is 0.41 mm.
- **Never rasterise it.** The painters draw one filled path, so a viewer cannot leave
  hairlines between modules and the code stays sharp at any zoom.
- **No symbol, no note.** A sentence telling people to scan a code that is not there
  is worse than neither.

## How it was proved

The encoder is first-party, so TrueVision proved it three ways, none of which is "it looks
like a QR code":

1. **A decoder written separately from it**, in `80__Testing__PrototypeEnvironment/Na__Test__ProjectQr__.test.mjs`:
   the format and version information must be valid BCH codewords, every Reed-Solomon
   syndrome must be zero, and the payload must come back as the exact string that went
   in - for every version from 1 to 10 at its longest and shortest payload. The Lantern
   original was never exercised above version 4; versions 7 up (the version information
   block, the two-group interleave) are first proved here.
2. **OpenCV's decoder**, which nobody here wrote (`Na__Test__ProjectQr__Decode__.py`):
   every case reads, and in every run there has never been a wrong read. Since
   21-Sep-2026 every case is read in both inks the config paints a code in - the black
   and the Portal block's `#595959` - and the grey reads in exactly as many renderings
   as the black.
3. **Real exported PDFs.** Title blocks were exported through the app's own chrome and
   jsPDF options on A1, A2, A3 and A4, rasterised by PyMuPDF at 200 to 600 dpi and read
   by OpenCV. Every clean render decoded to the exact address (a tight crop from 200 dpi,
   the whole corner of the sheet from 300 dpi); each code is one filled path of 217
   rectangles; 80 renderings, no wrong read. A 3 module quiet zone was tried against
   the shipped 2 under identical noise and read *less* often (155 of 384 against 172),
   so the tight margin stayed.

What has **not** been done is a phone pointed at a sheet of paper. OpenCV is a far
fussier reader than a phone, and the module is larger than Lantern Designer's, which
scans - but print one drawing and scan it before the first pack goes out.

In ValeVision the same test runs TrueVision's decoder (section 1), painter (5) and colour
(6) checks unchanged; holds the title block's floor (3); proves the address rules on the Vale
candidate address and shows why the key cannot be the address bar's token (2); holds the
system off (4); and proves that it fails closed and reads the project from the master index
(7). `Na__Test__ProjectQr__Decode__.py` reads every case it dumps back with OpenCV, in both
inks.

---

Ported from TrueVision3D's `README__ProjectQrCode__.md` (as of TrueVision3D v2.120.0, read at
HEAD b2aa9151) by parity package W1-15 on 02-Oct-2026, and rewritten for ValeVision: the
switched-off state, the key, and the resolver still to be chosen. The call shapes, the
Project Portal block's rules and TrueVision's proofs are TrueVision's text.
