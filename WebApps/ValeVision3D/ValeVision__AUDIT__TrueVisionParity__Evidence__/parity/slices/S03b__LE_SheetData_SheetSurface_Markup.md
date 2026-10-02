# S03b - Layout Editor core: sheet data and records, sheet surface and title blocks, markup geometry

> **Verified 01-Oct-2026 by the adversarial verifier.** No finding refuted. Corrections are inline and marked
> **[Verifier]**; 5 findings (S03b-V01 to V05) and decision D-S03b-11 are added; WP-S03b-02, -03, -06, -07 and -09
> are re-issued with corrected scope and acceptance (WP-...R in the verifier JSON). See `## Verification` at the end.

Slice report for the TrueVision (TV, lead) -> ValeVision (VV, target) parity programme. Prepared 01-Oct-2026,
read-only. TV git HEAD b2aa9151 (DEVLOG top v2.172.0, 29-Sep-2026); VV git HEAD 7b4e593a (DEVLOG top v2.71.0,
28-Sep-2026).

Path shorthand: `TV/` = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode`,
`VV/` = `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D`, `TVM/` and `VVM/` = their `02__Src__AppModules`,
`LE/` = `51__System__LayoutEditor/`, `WCP/` = `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia`.
Line numbers are `file:line` in the CURRENT working trees. "TV vX" is the app DEVLOG version; "SheetRecords 1.33.0" is
the per-file DEVELOPMENT LOG version.

Working files produced for this slice (scratch only): `scratchpad/parity/work_s03b/` - `diffs/*.diff` (whitespace-blind
VV->TV diff of every shared file), `devlogs.txt` (every per-file DEVELOPMENT LOG entry in both apps), `exports.txt`
(export and import closure diff), `codediff.py` (comment-free code drift), `setupkeys.py` (config reader key diff).

---------------------------------------------------------------------------------------------------------------------

## (a) Scope

| Folder | TV files | VV files | Shared | TV-only | VV-only | TV lines | VV lines |
|---|---|---|---|---|---|---|---|
| `LE/07__Core__SheetData` | 22 | 20 | 19 | 3 | 1 | 9,253 | 6,043 |
| `LE/10__Core__SheetSurface` | 12 | 11 | 11 | 1 | 0 | 6,062 | 4,117 |
| `LE/15__Core__Markup` | 9 | 6 | 6 | 3 | 0 | 4,586 | 3,151 |
| **Total** | **43** | **37** | **36** | **7** | **1** | **19,901** | **13,311** |

- TV-only: `07/Na__LayoutEditor__SheetModel__AreaGroups__.js`, `07/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js`,
  `07/Na__LayoutEditor__SheetRecords__NoteRegions__.js`, `10/Na__LayoutEditor__TitleBlock__QrCell__.js`,
  `15/Na__LayoutEditor__DimensionRounding__.js`, `15/Na__LayoutEditor__PaintOrder__.js`, `15/Na__LayoutEditor__ShapeRings__.js`.
- VV-only: `07/Na__LayoutEditor__DrawingCode__.js`.
- Code drift with comments stripped and the known seams neutralised (console prefix, DrawingViewCore/drawing folder
  numbers): **6 shared files are code-identical** (DrawingScale, SheetLayout, SheetModel__Common, SheetModel__DrawOrder,
  TitleBlock__Classic, Styles__Surfaces.css); 30 differ.
- **Correction to `ref/drift_all.tsv`:** it labels `ScaleManager`, `SheetModel__Leaders` and `Controls__TouchScreen`
  "header-only". All three carry CODE changes (12, 2 and 1 code lines): the site plan scale list and `IsListed`; the
  `PruneGroups` import and call in `DeleteLeader` (TV L73, L191); the pinch `gesture` argument (TV L235).

Sources read: drift rows; port-note markers; every per-file DEVELOPMENT LOG in both apps; a `git diff --no-index -w` of
all 36 shared files; headers/imports/exports of all 7 TV-only files (and the bodies of SheetRecords, its two leaves,
PaintOrder, DimensionRounding, ShapeRings headers, QrCell header); TV DEVLOG entries v2.38 to v2.160 (v2.70, v2.71,
v2.145, v2.146, v2.148 in full); `TV/TrueVision__NOTES__DrawingNumberingSchema__.md`; `TV/TrueVision__PLAN__FloorAreas__.md`
sections 3 and 6-8; `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` sections 3, 4.1 and 10.3; the VV
ledger (sections at L1-60, L107-245, L321-342, L1113-1246); VV plan decisions D01-D40; the three VV projects in the
local mirror that hold sheets (`WCP/Projects/2026/3047__Doous`, `44371__Gill`, `57994__Harris__Scheme-02`, 4 sheets);
TV git history for undocumented changes in these folders.

NOT examined in depth (owned by other slices, consulted only for wiring): the TV-only feature folders (20 ViewportRotation
and VectorQuality, 21 SitePlanData, 25 SitePlanComposites, 36 HatchPatternTools, 50 NoteRegions layout, 51 DrawingRegister,
53 ProjectQrCode, 54 SheetImages, 59 FloorAreas, 60 PdfFonts), config files, panels, sheet tools, the loader, transport.
R2 data was not inspected (read-only brief, no credentials): every statement about "VV data" is about the local mirror.

---------------------------------------------------------------------------------------------------------------------

## (b) Narrative findings by sub-system

### b1. The shape of the gap

TV moved the three core folders through roughly 70 app releases after VV's last return trips (TV v2.79/v2.80 on
19-20 Sep is where VV's ports stop for these files). The single most important file, `07/Na__LayoutEditor__SheetRecords__.js`,
is at **TV 1.39.0 (1,763 lines) vs VV 1.15.0 (836 lines)**: 24 per-file versions, every one a schema addition. Almost
every TV feature of the last ten days (v2.94 to v2.160) touches these folders, so they are the spine every other slice's
port hangs from.

Three facts dominate the plan:

1. **The schema must lead.** VV's normalisers do not merely ignore TV-era fields; several of them DROP or COERCE them on
   the next load (b3). Any VV feature port that writes one of those fields before SheetRecords is ported loses its data
   on the next normalise and save.
2. **Paint order needs a migration first.** TV made the Layers list the paint order for everything (TV v2.106.0,
   PaintOrder, SheetSurface 1.7.0, MarkupBridge 1.15.0). Every VV sheet seeded today has the Viewports layer at the TOP
   of the list (`VVM/LE/07/Na__LayoutEditor__SheetRecords__.js:665-671`); 3 of the 4 sheets in the local mirror are
   still in that order and the 4th (`3047__Doous` Sheet_001) has its Vectors layer under Viewports. Turning paint order on
   without TV's one-time `RestackLegacyLayers` would bury every note, dimension and vector under the drawings.
3. **Drawing numbering is a business decision, not a port.** VV's hand-typed "Drawing No." and its VV-only
   `DrawingCode` leaf sit exactly where TV v2.71.0 replaced the number with three composed facts (sequence, phase,
   project). It needs Adam's decision (D-S03b-01) before SheetRecords, Sheets, the title block rows, History and the PDF
   file name can be made identical.

### b2. Sheet record schema - field-level table

Status words for "VV today" (what VV 1.15.0's normalisers do with a record TV wrote):
**same** = identical rule; **PRESERVED** = VV never touches the key, so it survives a save, but nothing in VV reads it;
**DROPPED** = VV rebuilds the object without it (data loss on the next normalise + save); **COERCED** = VV changes the
value; **MUTATED** = VV changes a different field because of it; **absent** = VV neither writes nor reads it.

TV lines are `TVM/LE/07/Na__LayoutEditor__SheetRecords__.js`; VV lines are `VVM/LE/07/Na__LayoutEditor__SheetRecords__.js`.

| # | Record | Field | TV default / normaliser rule | VV today | TV source |
|---|---|---|---|---|---|
| 1 | Layer | `Layer__Type` = `'area'` | kept (Floor Areas layer); LAYER_TYPES TV:426 | **COERCED to 'mixed'** (VV:213, VV:277) | 1.25.0 / v2.104.0 |
| 2 | Layer | `Layer__Type` = `'image'` | kept (Images layer) | **COERCED to 'mixed'** | 1.27.0 / v2.116.0 |
| 3 | Layer | `Layer__Selectable` | stored only as false (reference layer), else deleted TV:506 | PRESERVED; picks/snaps still hit it | 1.28.0 / v2.123.0 |
| 4 | Sheet | `Sheet__Layers` seed | 5 layers top-first: Text, Dimensions, Vectors, Floor Areas, Viewports (same ids) TV:1430-1438 | 4 layers, Viewports first VV:665-671 | 1.25.0 + 1.26.0 / v2.104-v2.106 |
| 5 | Sheet | `Sheet__LayerStack` | `2`; absent triggers RestackLegacyLayers ONCE TV:1347-1374, 1482-1490 | PRESERVED; never restacked | 1.26.0 / v2.106.0 |
| 6 | Sheet | items on a deleted layer | RehomeOrphans to the kind's layer TV:1386-1397 | absent (orphans stay) | 1.26.0 / v2.106.0 |
| 7 | Sheet | `Sheet__DrawingType` | only `'siteplan'` kept, else deleted TV:1422 | PRESERVED; no tab group | 1.15.0 / v2.48.0 |
| 8 | Sheet | `Sheet__AreaGroups` | `[{AreaGroup__Name, AreaGroup__Colour}]`, trimmed <=120, case-blind dedupe, removed when empty TV:760-777 | PRESERVED raw | 1.25.0 / v2.104.0 |
| 9 | Sheet | `Sheet__MarginNotes.RegionsOn` | true only (leaf NoteRegions) TV:1291 | **DROPPED** (6-key rebuild VV:594-601) | 1.36.0 / v2.143.0 |
| 10 | Sheet | `Sheet__MarginNotes.Regions[]` | `Region__Id`, `Region__FrameMm` (>= RegionMinSizeMm), `Region__Title`, `Region__Overspill`, `Region__Groups`, `Region__Borders{Top,Right,Bottom,Left}` | **DROPPED** | 1.36.0 / v2.143.0 |
| 11 | Sheet | `Sheet__MarginNotes.LeaderlessOn` | true only (leaf LeaderlessNotes) TV:1292 | **DROPPED** | 1.37.0 / v2.147.0 |
| 12 | Sheet | `Sheet__MarginNotes.LeaderlessGroups[]` | group ids in print order, no repeats, only when non-empty | **DROPPED** | 1.37.0 / v2.147.0 |
| 13 | Fields | `Sheet__Fields__DrawingNumber` (unset) | register series: prefix + padded `Sheet__Order` ("D04") TV:1532-1538 | `projectCode + '-' + order` ("3047-01") VV:730-735 | 1.21.0 + v2.71.0 |
| 14 | Fields | `Sheet__Fields__Phase` | read; default `DrawingRegister DefaultPhase` (T01) TV:1550-1554 | absent (key PRESERVED if present) | v2.71.0 |
| 15 | Fields | `Sheet__Fields__DocumentId` | escape hatch; else composed `{project}_{phase}_{drawing}` TV:1575-1608 | absent | v2.71.0 |
| 16 | Fields | `BuildFields` keys | adds `Phase`, `DocumentId` TV:1693-1705 | no Phase / DocumentId VV:778-788 | v2.71.0 |
| 17 | Fields | tab short code | `ShortCode(DrawingNumber(sheet))` incl. default (TV Sheets:428) | `ShortCode(StoredNumber)` only (VV Sheets:278, leaf) | v2.71.0 |
| 18 | Viewport | `Viewport__Styles.depthFog` | from `Viewport__DefaultStyles` (on) TV:1019 | **DROPPED** (8-key rebuild VV:415-424) | 1.23.0 / v2.94.0 |
| 19 | Viewport | `Viewport__ScaleDenominator` | on [20,50,100,200], or the site plan list for a site plan viewport TV:971 | **COERCED**: 200, 500, 1250 become 50 (VV ScaleManager:66-71) | ScaleManager 1.1.0 / v2.48.0; config v2.140.0 |
| 20 | Viewport | `Viewport__RotationDeg` | wrapped (-180, 180], deleted when level TV:968-970 | PRESERVED raw; drawn level | 1.32.0 / v2.138.0 |
| 21 | Viewport | `Viewport__ShowFrame` | only false kept TV:1033 | PRESERVED; frame still drawn | 1.7.0 / v2.38.0 |
| 22 | Viewport | `Viewport__ClosedDoors` | trimmed, unique, sorted, deleted when empty TV:1038-1042 | PRESERVED raw | 1.10.0 / v2.42.0 |
| 23 | Viewport | `Viewport__HideSwings` | boolean only TV:1048 | PRESERVED | 1.34.0 / v2.140.0 |
| 24 | Viewport | `Viewport__ModelSourceId` | trimmed string or null, ALWAYS written TV:954-955 | absent (VV has no model groups; ledger L412, L637) | 1.4.0 / v2.32.0 |
| 25 | Viewport | `Viewport__SitePlan` {`SitePlan__StoreId`, `SitePlan__PlanType`, `SitePlan__Composites`} | site plan viewport only; forces 2D and `DrawingId` null; deck pruned vs config TV:936-949, 645-661 | PRESERVED raw | 1.16.0 / v2.48.0 + v2.89.0 |
| 26 | Viewport | `Viewport__SitePlanHatches.Hatches__Categories` | site plan viewport only; PatternKey, Scale, RotationDeg, Filled(false), StrokePt, Colour TV:606-629 | PRESERVED | 1.16.0, 1.30.0 / v2.126.0 |
| 27 | Viewport | `Viewport__ProjectedEdges...Category__LineTypeScale` | 0.1-10, kept, blocks pruning TV:543-558 | **DROPPED** (4-key rebuild VV:320-325) | TV commit 55014c6a, 29-Sep (NO file-log entry) |
| 28 | Viewport | `...Category__FillHex` | site plan categories only, upper-case #RRGGBB TV:559-562 | **DROPPED** | same commit |
| 29 | Viewport | site plan edge categories (`TrueVision__SitePlan__*`) | never pruned as default TV:548 | pruned when equal to the built-in fallback VV:316 | 1.16.0 |
| 30 | Viewport | `Viewport__SnapshotAsset.Asset__Samples` | number or null TV:1062 | PRESERVED if present, never null-filled | TV commit 5665508c, 17-Sep (NO file-log entry) |
| 31 | Dimension | `Dimension__AtScale` | boolean or deleted TV:1115 | PRESERVED unvalidated; VV MarkupBridge ignores it, VV Measurements box honours it | 1.8.0 / v2.40.0 |
| 32 | Dimension | `Dimension__StartExtensionMm`, `Dimension__EndExtensionMm` | number >= 0 or deleted TV:1133-1136 | PRESERVED; full lines drawn | 1.9.0 / v2.41.0 |
| 33 | Dimension | `Dimension__ExtensionsLinked` | only false TV:1137 | PRESERVED | 1.9.0 / v2.41.0 |
| 34 | Dimension | `Dimension__RoundUp` | only true TV:1116 | PRESERVED; not rounded | 1.33.0 / v2.139.0 |
| 35 | Dimension | `Dimension__LinePt` | clamped to Lineweights min/max, else deleted TV:1120-1125 | PRESERVED; ignored | 1.39.0 / v2.152.0 |
| 36 | Dimension | `Dimension__LineStyle` | `Na__LeDash__Normalise`, deleted when solid TV:1126-1129 | PRESERVED; ignored | 1.39.0 / v2.152.0 |
| 37 | Shape | `Shape__Hatch` {PatternKey, Scale, RotationDeg, Colour, StrokePt} | kept only when a pattern is named TV:681-693 | PRESERVED; not painted | v2.90.0; 1.30.0 / v2.126.0 |
| 38 | Shape | `Shape__Qr` {Qr__MarginMm} | kept when an object TV:844-852 | PRESERVED; not painted | 1.24.0 / v2.100.0 |
| 39 | Shape | `Shape__Curve` {Curve__Kind circle or arc} | kept when it names a kind TV:794-799 | PRESERVED | 1.31.0 / v2.130.0 |
| 40 | Shape | `Shape__Area` {Area__Name, Group, ScaleDenominator, Label, TextSizeMm, LabelDXMm, LabelDYMm}; holds Closed | TV:720-743 | PRESERVED raw; no label | 1.25.0 / v2.104.0, v2.125.0 |
| 41 | Shape | `Shape__Image` {File, Folder, PixelW, PixelH, Crop, Frame, Alpha, Name, SourceW, SourceH}; proportions enforced; clears stroke, fill, gradient, hatch, qr, area | TV:876-906 | PRESERVED; drawn as an empty stroked outline | 1.27.0 / v2.116.0; 1.29.0 / v2.121.0 |
| 42 | Shape | `Shape__Holes` (ring starts) | plain closed vectors only, cleaned by ShapeRings TV:818-826 | PRESERVED; painted as ONE run with stray edges between rings | 1.38.0 / v2.150.0 |
| 43 | Shape | visibility guard | a QR box, a room or a picture counts as painting TV:1185-1188 | **MUTATED**: `Shape__Stroked` forced true on an unfilled picture, QR box or room VV:532-534 | 1.24.0-1.27.0 |
| 44 | Group | `Group__Members[].kind` | viewport, shape, annotation, leader, dimension, group TV:431 | **DROPPED**: viewport, leader and dimension members VV:218 | 1.35.0 / v2.141.0, v2.142.0 |

Identical in both apps (no action beyond the whole-file port): every Annotation field (incl. `Annotation__RotationDeg`
via the model), every Leader field (incl. `Leader__SpecNoteId`), Layer Name/Visible/Locked/Order, Sheet Name (with
StripSheetCode), Order, PaperSize, Orientation, TitleBlockStyle, Fields, Lineweights, the six MarginNotes keys and their
2.2 mm / 9 pt migration, Group ids, Viewport Kind/Name/LayerId/SceneId/DrawingId/FrameMm/PanMm/ImageMm/ImageOffsetMm/
ImageZoom/ModelLayers/CompositeWeights/MarkupMode/ShowScaleLabel/Locked, the remaining Dimension fields
(TickLengthMm, TextDXMm/TextDYMm, Orientation), the remaining Shape fields, BuildFields Client/SiteAddress (Common),
Status and Scale ("1:50 @ ISO A2").

**Documentation drift inside TV**: rows 27-30 have no per-file DEVELOPMENT LOG entry - TV SheetRecords still says 1.39.0
although commit 55014c6a (29-Sep, "Minor") changed `NormaliseProjectedEdges`. Port from the FILE, not from the log.

### b3. Round trip and migration

**TV-era data through VV's current SheetRecords** (relevant whenever a VV feature port lands ahead of the schema, and
for anything copied between the apps): rows 1, 2, 9-12, 18, 19, 27-29, 44 are lossy; row 43 changes how a picture or
QR box looks; the rest survive but are inert. Hence the rule for the whole programme: **SheetRecords (WP-S03b-03) lands
before, or in the same change as, any feature that writes rows 1-44** - regions and leaderless notes (50 slice), floor
areas (59), sheet images (54), reference layers and the Layer flyout (40/30), viewport rotation (20), depth fog (49/42),
hatch tools (36), boolean vectors (37), dimension panel rows (40), group-with-viewport (30).

**VV data through TV's SheetRecords** (what porting the schema does to VV's own projects), measured on the 4 sheets in
the local mirror:

| Effect | 3047__Doous S001 | 44371__Gill S001 | 57994__Harris S001 | 57994__Harris S002 |
|---|---|---|---|---|
| Layer order before | Text, Dimensions, Viewports, Vectors | Viewports, Text, Dimensions, Vectors | Viewports, Text, Dimensions, Vectors | same |
| RestackLegacyLayers fires (markup layer under a viewport layer) | yes | yes | yes | yes |
| Order after (top first) | Text, Dimensions, Vectors, Viewports | Text, Dimensions, Vectors, Viewports | same | same |
| Visible change while VV still paints all markup over all viewports | none | none | none | none |
| `Viewport__ModelSourceId: null` added to every viewport | yes (byte change, harmless) | yes | yes | - |
| **[Verifier]** `Asset__Samples: null` added to every snapshot asset (TV SheetRecords L1062) | yes (Viewport_002) | - (no asset) | - (no asset) | - |
| **[Verifier]** `Viewport__Styles.depthFog` added once `LayoutEditor__Viewport__DefaultStyles.depthFog` is configured (TV L1019) | yes | yes | yes | - |
| **[Verifier]** Layers PANEL lists Viewports at the bottom after the restack (the sheet and the PDF do not change) | yes | yes | yes | yes |
| Title block Drawing No. if TV's default lands | "3047-01" becomes "D01" | "44371-01" becomes "D01" | "57994-01" / "-02" become "D01" / "D02" | |
| Tab label if TV's short-code rule lands | "Elevations Test" becomes "D01 - Elevations Test" | | | |

No local VV sheet stores `Sheet__Fields__DrawingNumber`, so adopting TV's numbering is lossless locally; R2 must be
checked before TV's `RenumberSheets` is allowed to run in VV (it overwrites every sheet's number on create, duplicate,
delete and reorder - the hazard TV v2.70.0 records for PS01).

### b4. Drawing numbering: VV `DrawingCode` leaf vs TV's numbering

| Concern | TV (v2.70.0 + v2.71.0) | VV (v2.61.0 port of TV v2.70.0) |
|---|---|---|
| Who writes the number | `51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js` (`Na__LeRegNum__Plan`, `Apply`), called by `SheetModel__Sheets__` `RenumberSheets` (TV Sheets:260) on create (329), duplicate (348), delete (362), reorder (404), reading the `LayoutEditor__DrawingRegister` block through `Na__CfApi__GetLoadedProjectData` (TV transport) | the user, typing in the Sheet panel's "Drawing No." row (ledger L335: every title block row stays editable in VV) |
| Stored value | `Sheet__Fields__DrawingNumber` = the sequence alone ("D01") | any string |
| Unnumbered default | prefix + padded order, register setup (TV SheetRecords:1532-1538) | `projectCode-order` (VV SheetRecords:730-735) |
| Phase / Document ID | `Sheet__Fields__Phase` (T01-T04, NA stages); `DocumentId` composed `{project}_{phase}_{drawing}`; escape hatch `Sheet__Fields__DocumentId` | none |
| Title block cell | Row key `DocumentId`, label "Document ID" (TV AppConfig TitleBlock Rows) | Row key `DrawingNumber`, label "Drawing No." (VV AppConfig); Classic anchors likewise |
| Tab short code | cut from `DrawingNumber` incl. the default, so every tab has one | cut from the STORED number only (`Na__LeCode__StoredNumber`), so an unnumbered VV tab shows its name alone |
| Where the string rules live | inside SheetRecords (ShortCode TV:1633, StripSheetCode TV:1657) | `VVM/LE/07/Na__LayoutEditor__DrawingCode__.js` (no imports): StoredNumber, ShortCode, StripSheetCode, Compose - identical regexes; SheetRecords re-exports them (VV:194-198, 748-753); the loader facade imports the leaf so tabs draw before the editor loads (`VVM/LE/01__Core__Loader/Na__LayoutEditor__Loader__.js:90, 541-548`) |
| Tab label | `GetTabLabel` (TV Sheets:462) - body identical to VV's (VV Sheets:297) | same, plus `Na__LeLoad__GetTabLabel` pre-load |
| PDF file name | `code : fields.DocumentId` (`TVM/LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js:477`) | `code : fields.DrawingNumber` (VV PdfExporter:248) |
| History | register-updated rewrite keeps Title, DrawingNumber, Phase, DocumentId, Revision, Status (TV History:233-251) | none (no register; ledger L219-220) |

**Assessment.** The leaf is a legitimate VV structure (the lazy loader needs the rules before the editor bundle
exists) and its behaviour is TV's v2.70.0 behaviour, made "stricter" (ledger L338). What VV lacks is TV v2.71.0
(ledger L339: "not ported - needs Adam's decision on whether ValeVision gets a register at all").

**Recommendation.** (1) Decide D-S03b-01 (register + Document ID for Vale, with Vale's own phase list). (2) Whatever the
answer, keep the leaf and make it the ONE implementation in both apps: extend it with two pure functions TV needs -
`DefaultNumber(order, prefix, digits)` and `ComposeDocumentId(format, project, phase, drawing)` - and back-port it to TV
so `SheetRecords` imports the same leaf in both trees (D-S03b-02). TV's `SheetRecords` then differs from VV's only by its
header. (3) Until a register exists in VV, `RenumberSheets` must be a no-op in VV (no `LayoutEditor__DrawingRegister`
block = no renumber), or it will stamp "D01".."Dnn" over hand-typed numbers.

**[Verifier]** Two qualifications. (a) The leaf's own PORT NOTE (`VVM/LE/07/Na__LayoutEditor__DrawingCode__.js:38-39`)
says *offer to TrueVision3D only if its tab strip is ever made lazy; until then the split would buy it nothing* - so
the back-port in (2) rests only on the identical-SheetRecords goal and is Adam's call (D-S03b-02), not a given.
(b) The no-op in (3) is a deliberate VV seam: TV's `RenumberSheets` (TV Sheets:260-272) does NOT no-op without a
register block - it falls back to the config numbering (prefix D, start 1, 2 digits) and renumbers every sheet.

### b5. AutoSave, History, ProjectRecord and the late start

- **AutoSave** VV 1.3.0 vs TV 1.5.0 (`07/Na__LayoutEditor__AutoSave__.js`, 437 vs 647 lines).
  - TV 1.4.0 / v2.145.0: `Na__LeAuto__Key` returns null until `Na__DrawData__IsLoaded()` (TV:218) - a change announced
    before the project's sheets arrive can never write the empty block over a waiting draft.
  - TV 1.5.0 / v2.146.0 (guard layer 1): every draft records `base` (`Na__DrawData__GetBase`); `JudgeDraft` (TV:314)
    restores silently only a draft grown from the drawings loaded, otherwise `AskAboutDraft` (TV:369) asks Apply Draft /
    Discard Draft / Decide Later through `Na__PresentationMode__DevMenu__Confirm` with `altLabel` (VV's Modal is 1.0.0
    with no `altLabel`; TV's is 1.2.0); nothing writes the draft while asking; `register-updated` ignored (TV:176).
  - `Suspend` / `Resume` / `DiscardSavedDraft` (TV:620-635) serve the Drawing Register's transactions; harmless without one.
  - `PublishUnsavedFlag` (TV:565) sets `window.TrueVision__Pwa__HasUnsavedWork`. VV's port note says VV has no worker;
    the ledger (L135-166) shows VV IS controlled by the shared `WebApps/Na__Pwa__ServiceWorker__.js` through
    Whitecardopedia's registrar on https and on 127.0.0.1/localhost. Decision D-S03b-07.
  - Guard layers 2 and 3 of v2.146.0 (the save judged before R2, every overwritten file kept) are transport: TV did them in
    `40__System__DrawingViewCore/Na__DrawView__ProjectData__` 1.6.0, `Na__AppUtils__LocalProjectMirror__` 1.2.0 and the
    local Python server. VV's equivalents are `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js` (1.2.0, no
    `GetBase`, `WhenBaseKnown`, `SAVED_ISO_KEY`, `IsLoaded`), `VVM/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js`
    (R2 first via whitecardopedia-editor-api, then Flask mirror POST `/api/projects/{code}`) and `WCP/server.py`. The
    AutoSave port is blocked on at least `IsLoaded`, `GetBase`, `WhenBaseKnown`, `SAVED_ISO_KEY` [Verifier: `GetBlock` struck - VV already exports `Na__DrawData__GetBlock`, `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js:199`, export L477].
- **History** VV "1.3.0/1.4.0" (two 1.3.0 entries in VV's log, the newest 1.4.0 listed second) vs TV 1.7.0.
  - `'margin'` is missing from VV's `STEP_REASONS` (`VVM/LE/07/Na__LayoutEditor__History__.js:140`) while VV's Sheets unit
    announces it (`Na__LeModel__Touch('margin', ...)`, VV Sheets:351). An unlisted reason is not a step AND leaves the
    baseline stale, so the next step swallows the margin change and one Ctrl+Z undoes both. Known and open in the ledger
    (L219). TV History 1.4.0 (14-Sep).
  - `'areas'` (TV 1.7.0, floor areas) and the `'register-updated'` rewrite of kept steps (TV 1.6.0; incl. Status) arrive
    with Floor Areas and the Drawing Register.
- **ProjectRecord** - permanent divergence. VV 1.0.0 reads `clientDrawingName` and `siteAddress` from the active
  project.json config; TV reads NA Project Admin documents over `80__CloudflareIntegration` (and TV 1.1.0 / v2.88.0 adds a
  PlanVision fallback). Both are facts about each business (ledger L195-202). Keep VV.
- **The late start** (TV SheetModel 1.35.0 / v2.145.0). TV's model listens on the drawings CHANGED event only and, if
  `Na__DrawData__IsLoaded()`, announces the load on a microtask (`TVM/LE/07/Na__LayoutEditor__SheetModel__.js:752-775`).
  VV's model listens on BOTH `LOADED_EVENT` and `CHANGED_EVENT` (`VVM/LE/07/Na__LayoutEditor__SheetModel__.js:506-507`),
  and VV's ProjectData dispatches CHANGED from inside its LOADED handler (`VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js:446-455, 208-216`):
  a load after the editor exists is heard twice, the second hearing clearing the dirty flag a draft restore just set
  (the bug TV v2.145.0 measured). Because VV lazy-loads the editor, the FIRST load is instead announced by the loader's
  synthetic event (`VVM/LE/01__Core__Loader/Na__LayoutEditor__Loader__.js:307-311, 339`), which dispatches the model's
  own event and so **bypasses the model's `reload()`** - and `reload()` is the only caller of `Na__LeModel__SeedCommonFields`
  (grep: SheetModel:504 only). **Consequence (likely VV bug, code-traced, not run): the Common client / site address
  seed never runs on the first project load of a session in VV.** Porting TV's Initialize fixes it, and the loader's
  `AnnounceProjectLoad` must then be removed, or the load is announced twice.
  **[Verifier]** Confirmed by code trace, and one more symptom: `Na__LeCommon__Record` is filled only by that seed
  (`SheetModel__Common__.js:266-282`), so on the first open the Sheet panel's project-record offer (`RecordOffer`) is
  empty too. VV's ModeController initialises the model, History, AutoSave, Spec and SpecLinks in one synchronous
  pass (`ModeController__.js:831-835`), so TV's microtask announce works unchanged in VV.

### b6. Sheet model units

| Unit | VV -> TV | What VV lacks (TV per-file version / app version) |
|---|---|---|
| State | 1.1.0 -> 1.2.0 | `Revision` counter moved on every Dispatch (1.2.0 / v2.136.0); `DRAWING_ARCHITECTURAL`, `DRAWING_SITEPLAN` |
| Sheets | 1.1.0 -> 1.4.0 | normalise once per announcement (`IsNormalised`, `NoteNormalised`, 1.2.0 / v2.136.0: 1.3 ms per read on 15 sheets, 8 reads per pointer move); site plan tab groups and `NextOrder`/`RenumberSheets`; `GetPhase`, `GetDocumentId`, `ComposeDocumentId` (v2.71.0); `AddNoteRegion`, `UpdateNoteRegion`, `DeleteNoteRegion`, `regionsOn` (1.3.0 / v2.143.0); `leaderlessOn`, `leaderlessGroup`, `leaderlessMove` (1.4.0 / v2.147.0). VV keeps `AnnounceRestore` here (VV Sheets:237) where TV has it in the facade (TV SheetModel:681) - move it with the facade |
| Layers | 1.0.0 -> 1.4.0 | **DeleteLayer re-homes SHAPES** (1.1.0; VV live bug: `VVM/LE/07/Na__LayoutEditor__SheetModel__Layers__.js:115-127` re-homes viewports, text, dimensions and leaders but not vectors, which keep a dead layer id - also trap 8 of `TV/TrueVision__PLAN__FloorAreas__.md`); `LayerIndexAboveDrawings`, `CreateLayer opts.index`, corrected list-order comments (1.2.0 / v2.106.0); picture re-homing (1.2.1 / v2.116.0); `IsLayerSelectable`, `UpdateLayer selectable`, `DropUnpickable`, `ItemLayerId`, `MoveToLayer` (1.3.0 / v2.123.0); `GetLayerByName`, `LayerIndexLike`, `IsItemPickable`, silent Create/Update (1.4.0 / v2.127.0) |
| Shapes | 1.0.0 -> 1.6.0 | `qr` patch (1.1.0 / v2.100.0); `area` patch, `ShapeLayerType`, `ShapeLayerId` (1.2.0 / v2.104.0); above-drawings layer creation (1.2.1); `image` (1.3.0 / v2.116.0); InsertShape keeps any layer the sheet has and WRITES the fallback (1.4.0; VV latent bug at `...SheetModel__Shapes__.js:93-99`, masked for pastes by `Na__LeClip__LayerFor`); `afterId`, `curve`, `AnnounceShapes` (1.5.0 / v2.130.0); `holes` (1.6.0 / v2.150.0); `hatch` patch and `Shape__Hatch` on create |
| Viewports | 1.1.0 -> 1.4.0 | `modelSourceId`, `sitePlan`, `modelLayers` create options; `showFrame`, `closedDoors`, `hideSwings`, `modelSourceId`, `rotationDeg`, `sitePlanStoreId`, `sitePlanPlanType`, `sitePlanComposites`, `sitePlanHatch` patch keys; `InsertViewport silent`; `DeleteViewport` prunes groups (1.4.0); `IsSitePlanViewport`; site plan `ResolveViewportSource` |
| TextAndDimensions | 1.1.0 -> 1.2.0 | `atScale`, `startExtensionMm`, `endExtensionMm`, `extensionsLinked`, `roundUp`, `linePt`, `dash` on Create/Update; DeleteDimension prunes groups |
| Leaders | 1.1.0 -> 1.2.0 | DeleteLeader prunes groups (2 code lines) |
| Groups | 1.1.0 -> 1.3.0 | `AddGroupMember` (1.2.0 / v2.130.0); `PruneGroups` knows viewport, leader, dimension (1.3.0 / v2.141.0) - must land with SheetRecords GROUP_KINDS and markup `Groups` KINDS, or the first delete strips those members |
| AreaGroups | absent -> 1.0.0 | whole unit (Floor Areas) |
| DrawOrder, Common | identical code | header re-sync only |
| Facade | 1.18.0 -> 1.35.1 | late-start announcement and CHANGED-only listener (1.35.0); `Save` passes a `report` and reports local/steps (1.11.0, 1.29.0 - inert with VV's DrawData.Save); `FinishRegisterDeletion`, `NotifyRegister`; re-exports of everything above |

### b7. Title blocks

- **Cells** VV 1.0.0 (= TV 1.1.0 code) -> TV 1.2.0: `Na__LeTitleCells__Widen` (TV v2.109.0) - every fixed cell a fifth
  wider on A2/A1, paid only out of the Drawing Title's spare room. Pure, verbatim.
- **Modern** VV 1.2.0 -> TV 1.5.0: QR cell solve/build (1.3.0 / v2.81.0); the floor (1.4.0 - already in VV's 1.2.0 per
  ledger L118); `ValuePrefix` ("Revision A") and `RowWidthFactorByPaper` (1.5.0 / v2.109.0). VV seam: the logo stand-in
  text `'VALE GARDEN HOUSES'` (VV Modern:202) vs TV `LOGO_FALLBACK_TEXT = 'NOBLE ARCHITECTURE'` (TV Modern:146). Move it to
  config so the module is byte-identical (D-S03b-09). Fields are read by row key, so `DocumentId` vs `DrawingNumber` is a
  config matter (D-S03b-01).
- **QrCell** (TV-only, 479 lines, v2.81.0): generic layout code (mirrors the logo cell; compact form on A4; no code, no
  cell). Everything NA-specific sits in `TVM/LE/53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json`:
  `ProjectQr__Link__BaseUrl` = `https://www.noble-architecture.com/q/` (L10), `IndexUrl` `../../../../../q/index.json`
  (L18) written by NA's ProjectVision build script, heading "Navigate This Building in 3D". The "Project Portal" block
  is a separate Parametric Scrapbook element (57 slice). **Answer: the QR cell is not NA-specific; its link is.** Port
  QrCell verbatim with VV's 53 config `ProjectQr__Enabled: false` (the strip stays exactly as today) until Adam picks a VV
  target (D-S03b-03) - e.g. VV's own `?project=` share URL (`VVM/61__Feature__ShareProjectLink/`).
  **[Verifier]** Switching the QR off does NOT make QrCell portable on its own: 53 `Na__ProjectQr__Symbol__` imports
  `Na__ProjectQr__ProjectLink__`, which imports `Na__AppUtils__GetProjectFolderFromUrl` and `Na__AppUtils__GetYearFromUrl`
  - two functions VV's `03__AppUtils/Na__AppUtils__ProjectLoader.js` does not export (export block L535-548). A missing
  named export fails the whole editor module graph at link time. VV needs its own ProjectLink first (S03b-V02); VV's
  config must also set `LayoutEditor__TitleBlock__QrCellEnabled` false (TV ships true).
- **Classic** - code identical. The real Vale scan is the one only VV may print; TV's
  `TV/01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png` is a **PLACEHOLDER image**
  (inspected), which is how TV honours TD04 while keeping the module - TD04's text ("not ported") is stale. VV's scan
  still lives in the legacy `VVM/35__System__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png`; mirror TV's asset
  convention: `VV/01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png` (VV has
  `05__AppAssets__SkyDomes` already) and repoint `LayoutEditor__TitleBlock__ClassicScanAssets`. Never copy TV's placeholder.
  Per-size Vale layouts exist in `VVM/35__System__PageLayoutSystem/03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/`
  (A1/A2 PDFs) - candidates for VV D26's "per-size scans".

### b8. Sheet surface, chrome and the paint order

- **PaintOrder** (TV-only, v2.106.0): `Plan(sheet)` = viewport steps, the sheet's own paper (border, title block, notes
  margin) directly above the frontmost shown viewport, and each layer's markup; hidden layers left out; unknown-layer items
  frontmost. Consumers: SheetSurface (stack), MarkupBridge (paint and hit test layer by layer), PdfExporter (60 slice),
  web viewer (80 slice).
- **SheetSurface** VV 1.6.0 -> TV 1.13.0: the stack of frames and SVG slots in one stacking context (1.7.0 / v2.106.0);
  zoom gesture hold and `ZOOM_SETTLED_EVENT` (1.8.0 / v2.111.0); `GetSheetChrome` for snapping (1.9.0 / v2.114.0);
  VectorQuality notes (1.10.0 / v2.136.0); frames placed by translate, not left/top, so a drawing is painted where it is at
  any zoom (1.11.0 / v2.137.0); turned frames (1.12.0 / v2.138.0); per-slot fade so an open group's viewports stay
  full strength (1.13.0 / v2.142.0); `ShowPublished` for the published-documents viewer (v2.155.0).
- **SheetChrome** VV "1.5.0" (code includes TV 1.8.0's `FitCaptionFont`, ledger L1167) -> TV 1.14.0: `ShowFrame` guard
  (1.4.0 / v2.38.0); hatch fill pass and `HatchDef` (1.2.0 hatch half / v2.90.0, 1.12.0 / v2.126.0); Open Sans in the PDF
  via `PdfFonts` (1.7.0); `qr` primitive (1.9.0 / v2.81.0); `BuildViewportFrame` (1.10.0 / v2.106.0); `picture`
  primitive (1.11.0 / v2.116.0); turned groups (1.13.0 / v2.138.0); holed polylines, even-odd SVG and PDF (1.14.0 / v2.150.0).
  VV's PDFs set text in Helvetica (ledger L1169); with PdfFonts they match the screen's Open Sans (VV's `--Vale_FontFamily`
  is also Open Sans, `VV/03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css:35`).

### b9. Markup geometry

- **MarkupBridge** VV 1.10.0 -> TV 1.20.0. Beyond the painting refactor (1.15.0), VV has a **live inconsistency**: VV's
  `DimensionValueMm` multiplies by the host 2D viewport's scale only (`VVM/LE/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js:478-487`),
  while VV's Measurements box reads `Na__LeDrawScale__DimensionDenominator` (`VVM/LE/30__System__SheetTools/Na__LayoutEditor__Measurements__.js:358, 369, 422`)
  which honours `Dimension__AtScale` (and VV's Custom Scrapbook writes that key on every copied dimension,
  `...ScrapbookCustom__.js:437`). A dimension with AtScale true off any viewport, or false on one, prints one figure and
  reports another. TV fixed it in MarkupBridge 1.7.0 (v2.40.0). Other deltas: extension lines and the ghost (1.8.0 /
  v2.41.0), broken-bubble halos via options (1.13.0), floor area labels (1.14.0 / v2.104.0), reference layers skipped by
  HitTest (1.16.0 / v2.123.0), Import From Scene on a turned viewport (1.17.0 / v2.138.0), round up to 5 mm with the
  asterisk (1.18.0 / v2.139.0), `DimensionBounds` (1.19.0 / v2.141.0), own line pt and dash (1.20.0 / v2.152.0).
- **DimensionRounding** (TV-only, v2.139.0) - pure leaf, rounds the PRINTED figure up to `RoundUpStepMm` (5) and says
  whether it moved (the asterisk is `RoundUpMarker`).
  **[Verifier]** Its TV PORT NOTE: *ValeVision: not yet ported - it waits for Adam's sign-off* (D-S03b-11). Opt-in:
  TV ships `LayoutEditor__Dimensions__DefaultRoundUp: false`.
- **DimensionGeometry** VV 1.2.0 -> TV 1.6.0: `Skeleton(..., extension)` with G1/G2 ghosts (1.2.0 / v2.41.0) and
  `spec.dashArray` (1.6.0 / v2.152.0). VV's 1.2.0 already has the text-leader arc work.
- **LeaderGeometry** VV "1.0.0" (code already has TV 1.1.0's `SetCodeResolver`) -> TV 1.3.0: `SetBrokenResolver`/`IsBroken`
  and the red halo (1.2.0), `SetNoteResolver`/`NoteFor` (1.3.0 / v2.144.0). Registered by `50__Feature__Specification/SpecLinks`
  (TV SpecLinks:164, 356); read by TV `SheetTools__ContextMenu__`, `SheetTools__NoteTooltip__`, `SheetTools__PointerDrag__`.
  **[Verifier]** TV SpecLinks imports the resolvers at L91 and registers all three at L355-357 (L164 is the doc
  comment); VV SpecLinks registers only `SetCodeResolver` (L77, L315). TV's LeaderGeometry PORT NOTE: *Later versions
  wait for their own sign-off* (D-S03b-11).
- **ShapeGeometry** VV 1.5.0 -> TV 1.9.0: `Shape__Qr` painted inside its box (1.6.0 / v2.100.0) in the portal grey (1.8.0 /
  v2.120.0); `Shape__Image` as a picture primitive (1.7.0 / v2.116.0); holes (1.9.0 / v2.150.0); hatch hit test.
- **ShapeRings** (TV-only, v2.150.0; 1.1.0 FacesFromRings v2.160.0) - pure leaf; its own port note warns that a reader
  that does not know `Shape__Holes` "paints a holed vector as one run: the outline and its holes joined by a stray edge".
  **[Verifier]** The same PORT NOTE says the VV port *waits for Adam's sign-off* (D-S03b-11). SheetRecords 1.38.0+,
  ShapeGeometry 1.9.0 and SheetChrome 1.14.0 import it, so the sign-off gates WP-S03b-03 and -06 as well.
- **Groups** (markup) VV 1.2.0 -> TV 1.4.0: `KINDS` += leader, dimension (1.3.0 / v2.141.0), viewport (1.4.0 / v2.142.0),
  with their bounds (`Na__LeVpRot__Bounds`, `Na__LeMarkup__DimensionBounds`).
- **MeasureParse** VV 1.0.0 -> TV 1.1.0: `Array` (3x, /3) for Ctrl-drag copy arrays (v2.119.0, `SheetTools__CopyDrag__`).

### b10. Navigation and controls

- **Navigation** VV 1.1.0 -> TV 1.3.0: `ZoomAbout(..., gesture)` (1.2.0 / v2.111.0); authoring ceiling `AuthoringZoomMax`
  64 (6400 %) through `Na__DevGate__IsAuthoringEnabled`, readers keep 800 % (1.3.0 / v2.135.0). VV has DevGate.
- **Controls__Pc** VV 1.1.0 -> TV 1.4.0: one wheel zoom per animation frame (1.2.0 / v2.111.0); Page Up / Page Down turn
  the drawings via `STEP_SHEET_EVENT` (1.3.0 / v2.112.0) answered by the mode controller (TV ModeController:319, 616,
  1219) with key map entries `Nav__PreviousSheet` / `Nav__NextSheet` (`TVM/LE/03__Core__Config/Na__Hotkeys__DrawingTabs__.json:219-240, 1011-1016`);
  `TakeKeyboard` - a press on the stage takes the focus so M, V, Escape and arrows stop going to the last panel control
  (1.4.0 / v2.115.0, "M Was Never Stuck"), with `Na__KeyScope__ControlKeepsKey` from the TV-only `TVM/03__AppUtils/Na__AppUtils__KeyScope__.js`.
  **[Verifier]** KeyScope (1.1.0; TV v2.110.0 *Three Tool Sets, Three Keyboards*, plus v2.115.0) also gates TV's 3D
  hotkeys (`TVM/10__NavigationAndCameras/Na__Hotkeys__Manager.js:167`). VV's 3D hotkeys live in a different module,
  `VVM/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` (initialised at `VV/Index.html:1792`), which listens on
  window with no scope test and binds R, B, T, Y, V, 1-9, PageUp and PageDown (`02__AppData/Na__ValeVision__HotkeysDictionary__.json`);
  VV's Controls__Pc also listens on window (L360). The KeyScope port must gate that handler too (S03b-V01).
- **Controls__TouchScreen** VV 1.0.0 -> TV 1.1.0: the pinch is a gesture step (one argument).

### b11. Stylesheets

- `Styles__Main.css`: TV keeps the tab strip and the Dev section here (ledger L1153); VV moved both to
  `VVM/LE/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css` because the strip is drawn before the editor loads. VV's
  Boot sheet has the scroller and arrows but **not** TV v2.158.0's Drawings menu tab (`.na-le-tabs__caret`,
  `.na-le-tabs__menu`, `__menu-row`, `__menu-divider`; TV Styles__Main:63-262 is the whole Tab Strip region). Port Main minus those two regions; carry
  the v2.158.0 rules into Boot with the tab strip slice.
- `Styles__Main__Paper.css`: TV adds the stack/slot rules, the zooming hold, the vector hold, the depth fog overlay, the
  transparent frame body (a floor area under a plan shows through), 2 px rubber band, hover tooltip, menu flyout/hint/mixed
  ring (Layer flyout), grip states (green bound, ring online, blue free), viewport carry; and REMOVES the `.na-le-osnap*`
  snap-marker rules (moved to `28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css`, imported by TV's CSS
  index right after Paper, `TV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:166`). VV's own
  `30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (VV-only) depends on those rules, and VV's vertex-insert
  diamond on the `rotate(45deg)` TV moved inline. Port per region, with the owning module.
- `Styles__Surfaces.css`: identical tokens.

### b12. Inconsistencies found on the way (for the ledger owner)

1. VV per-file logs under-report: ScaleManager says 1.0.0, the code is TV 1.2.0 (ledger L1166); SheetChrome says 1.5.0,
   the code is TV 1.8.0 (ledger L1167); LeaderGeometry says 1.0.0, the code has TV 1.1.0's `SetCodeResolver`. VV History
   has two 1.3.0 entries with 1.4.0 between them.
2. TV SheetRecords' header stops at 1.39.0 (23-Sep) though commit 55014c6a (29-Sep) changed it (rows 27-29 of b2);
   `Asset__Samples` (commit 5665508c, 17-Sep) is logged nowhere in SheetRecords.
3. Ledger L126 names `53__System__ProjectQrCode`; TV moved it to `LE/53__Feature__ProjectQrCode` in v2.155.0 (commit
   b24f33a9). TV's own `LayoutEditor__TitleBlock__QrCellNote` still says `02__Src__AppModules/53__Feature__ProjectQrCode/`.
4. Ledger rows saying "this tree has no PWA worker" (L340, L384, L404, L420 ...) and VV AutoSave's PORT NOTE
   ("ValeVision has no service worker") contradict ledger L135-166.
5. TV realign plan TD04 / 10.3 says `TitleBlock__Classic__` is not ported; TV has it, with a placeholder scan.
6. `ref/drift_all.tsv` header-only labels for ScaleManager, Leaders and TouchScreen (section a).
7. **[Verifier]** TV SheetSurface gained `ShowPublished` in v2.155.0 (commit b24f33a9, +50 lines) with no per-file log
   entry (its log stops at 1.13.0).
8. **[Verifier]** TV PaintOrder has no PORT NOTE block.
9. **[Verifier]** TV's own logs repeat versions too: History has two 1.3.0 entries (14-Sep, 19-Sep), MarkupBridge two 1.12.0.
10. **[Verifier]** TV `Na__LeCfg__GetDrawingRegisterSetup`'s `pdfJsScriptPath` fallback is NA's
    `/na-apps/20__PlanVision__CoreAppCode/...` path - it must not be copied into VV with the config reader.

---------------------------------------------------------------------------------------------------------------------

## (c) Module-by-module table

All paths are under `02__Src__AppModules/51__System__LayoutEditor/` in both apps (identical relative path unless shown).
State: `ident` = code-identical (header only); `drift` = shared, VV behind; `tv-only`; `vv-only`.
Actions use the programme vocabulary (port_verbatim, port_adapted, port_whole_reapply_vv, keep_vv_divergence ...).
"Seams" = what to re-apply on a whole-file port, beyond the header and the `[TrueVision3D` -> `[ValeVision3D` console prefix.
Folder seams: `../../40__System__DrawingViewCore/` -> `../../42__...`, `42__System__FloorPlanViews` -> `43__`,
`43__System__PlanAnnotations` -> `44__`, `44__System__PlanDimensions` -> `45__`, `45__System__ElevationViews` -> `46__`.

### 07__Core__SheetData

| TV file | TV ver | VV ver | State | What VV lacks / does differently (TV versions) | Action | VV adaptation (seams) | Depends on |
|---|---|---|---|---|---|---|---|
| `Na__LayoutEditor__SheetRecords__.js` | 1.39.0 (+29-Sep edges) | 1.15.0 | drift (385 code lines added) | Schema rows 1-44 of b2: area/image layer types (1.25/1.27), reference layers (1.28), paint-order seed + LayerStack restack + orphans (1.26), Shape Hatch/Qr/Curve/Area/Image/Holes (v2.90, 1.24, 1.31, 1.25, 1.27/1.29, 1.38), site plan records (1.15/1.16/1.30), viewport depthFog/rotation/frame/doors/swings/model source (1.23, 1.32, 1.7, 1.10, 1.34, 1.4), dimension AtScale/extension/round-up/line pt+style (1.8, 1.9, 1.33, 1.39), group kinds (1.35), margin regions + leaderless (1.36, 1.37), DrawingNumber default / Phase / DocumentId (v2.71), edge LineTypeScale/FillHex | port_whole_reapply_vv | DrawingCode leaf imports for ShortCode/StripSheetCode (until D-S03b-02); DrawingNumber default + short-code policy per D-S03b-01; keep exporting `Na__LeRec__SheetShortCode` until the Sheets unit is ported; path 40->42 | WP-S03b-02 leaves; `20/ViewportRotation`, `36/HatchPatterns`, `25/SitePlanComposites`, `54/SheetImages__Geometry` (all import-free or near); config `GetDrawingRegisterSetup`, `GetLineweightSetup`; D-S03b-01 |
| `Na__LayoutEditor__SheetRecords__NoteRegions__.js` | 1.0.0 | - | tv-only | Overspill note regions on the margin record (v2.143.0) | port_verbatim | none (header) | config `GetMarginNotesSetup` region keys (regionMinSizeMm, regionBordersDefault, ...) |
| `Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js` | 1.0.0 | - | tv-only | Leaderless notes on the margin record (v2.147.0); no imports | port_verbatim | none | - |
| `Na__LayoutEditor__DrawingCode__.js` | - | 1.0.0 | vv-only | Leaf for the lazy loader: StoredNumber, ShortCode, StripSheetCode, Compose (TV keeps these inside SheetRecords) | keep_vv_divergence + backport_to_tv | extend with pure `DefaultNumber`, `ComposeDocumentId` if D-S03b-01 adopts v2.71 | D-S03b-01, D-S03b-02 |
| `Na__LayoutEditor__SheetModel__.js` (facade) | 1.35.1 | 1.18.0 | drift | CHANGED-only listener + late-start microtask announce (1.35.0 / v2.145.0); `AnnounceRestore` defined here (VV has it in Sheets); `Save(showToast)` builds a `report` (1.11.0, 1.29.0); `FinishRegisterDeletion`, `NotifyRegister`; re-exports for every new unit API (1.26.0-1.34.0) | port_whole_reapply_vv | path 40->42; remove the loader's `Na__LeLoad__AnnounceProjectLoad` in the same change | 42 ProjectData `Na__DrawData__IsLoaded`; all units below |
| `Na__LayoutEditor__SheetModel__State__.js` | 1.2.0 | 1.1.0 | drift | `Revision` (1.2.0 / v2.136.0); drawing type constants | port_whole_reapply_vv | path 40->42 | SheetRecords |
| `Na__LayoutEditor__SheetModel__Sheets__.js` | 1.4.0 | 1.1.0 | drift | normalise-once (1.2.0 / v2.136.0); site plan tab groups, `NextOrder`, `RenumberSheets` (v2.48, v2.70); Phase/DocumentId API (v2.71); note regions (1.3.0); leaderless notes (1.4.0); `AnnounceRestore` leaves this unit | port_whole_reapply_vv | `RenumberSheets` must read the register block through a VV accessor (no `80__CloudflareIntegration`) and be a no-op without a `LayoutEditor__DrawingRegister` block; D-S03b-01 | facade (atomic), SheetRecords, State, NoteRegions + LeaderlessNotes leaves, `51__Feature__DrawingRegister/...Register__Numbering__` (or adapter), config `GetDrawingRegisterSetup` |
| `Na__LayoutEditor__SheetModel__Layers__.js` | 1.4.0 | 1.0.0 | drift | DeleteLayer re-homes shapes (1.1.0, VV bug); above-drawings index (1.2.0 / v2.106); picture re-home (1.2.1); reference layers + MoveToLayer (1.3.0 / v2.123); by-name lookup, LayerIndexLike, silent writes (1.4.0 / v2.127) | port_verbatim | none | SheetRecords, State (`ActiveSheetId`, `SelectionItems`, `AssignSelectionItems`) |
| `Na__LayoutEditor__SheetModel__Shapes__.js` | 1.6.0 | 1.0.0 | drift | qr/area/image/curve/holes/hatch patches; ShapeLayerType/Id; InsertShape writes its fallback layer (VV latent bug); afterId; AnnounceShapes (1.1.0-1.6.0, v2.100-v2.150) | port_verbatim | none | Layers 1.2.0+ (`LayerIndexAboveDrawings`), SheetRecords |
| `Na__LayoutEditor__SheetModel__Viewports__.js` | 1.4.0 | 1.1.0 | drift | site plan handling; rotation, hide swings, doors, frame, model source patch keys; silent insert; prune on delete | port_whole_reapply_vv | paths 42->43 (FloorPlanViews), 45->46 (ElevationViews) | SheetRecords, Groups unit 1.3.0, `20/ViewportRotation` (FIELD), `36/HatchPatterns` + `25/SitePlanComposites` (field names), config label `SitePlanViewportName` |
| `Na__LayoutEditor__SheetModel__TextAndDimensions__.js` | 1.2.0 | 1.1.0 | drift | atScale, extension, roundUp, linePt, dash on Create/Update (v2.40, v2.41, v2.139, v2.152); prune on delete | port_verbatim | none | SheetRecords, Groups unit |
| `Na__LayoutEditor__SheetModel__Leaders__.js` | 1.2.0 | 1.1.0 | drift (tsv says header-only) | DeleteLeader prunes groups (2 code lines) | port_verbatim | none | Groups unit |
| `Na__LayoutEditor__SheetModel__Groups__.js` | 1.3.0 | 1.1.0 | drift | AddGroupMember (1.2.0 / v2.130); PruneGroups knows viewport/leader/dimension (1.3.0 / v2.141) | port_verbatim | none | SheetRecords GROUP_KINDS (atomic), markup Groups KINDS |
| `Na__LayoutEditor__SheetModel__AreaGroups__.js` | 1.0.0 | - | tv-only | Floor area group list CRUD, the areas reason (v2.104.0) | port_verbatim (with Floor Areas) | none | SheetRecords `NormaliseAreaGroups`; D-S03b-04 |
| `Na__LayoutEditor__SheetModel__DrawOrder__.js` | 1.0.0 | 1.0.0 | ident | - | no_action (header re-sync) | - | - |
| `Na__LayoutEditor__SheetModel__Common__.js` | 1.0.0 | 1.0.0 | ident | - (headers say different CREATED dates) | no_action | path 40->42 already | - |
| `Na__LayoutEditor__AutoSave__.js` | 1.5.0 | 1.3.0 | drift | key waits for IsLoaded (1.4.0 / v2.145); draft judged against base, Apply/Discard/Decide Later (1.5.0 / v2.146); Suspend/Resume/DiscardSavedDraft; register-updated ignored; PWA flag | port_whole_reapply_vv | path 40->42; PWA flag name per D-S03b-07 | 42 ProjectData 1.5.0/1.6.0 (`IsLoaded`, `GetBase`, `WhenBaseKnown`, `SAVED_ISO_KEY` [Verifier: `GetBlock` struck - VV already exports `Na__DrawData__GetBlock`, `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js:199`, export L477]); `21/...DevMenu__Modal__` 1.2.0 (`altLabel`); labels DraftApplied/DraftDiscarded/DraftLeftAside; transport guard (WCP/server.py fingerprint) |
| `Na__LayoutEditor__History__.js` | 1.7.0 | "1.4.0" | drift | margin step (1.4.0, VV bug, ledger L219); areas step (1.7.0); register-updated rewrite incl. Status/Phase/DocumentId (1.6.0) | port_verbatim | none | D-S03b-06; AreaGroups; Drawing Register (rewrite inert without it) |
| `Na__LayoutEditor__ProjectRecord__.js` | 1.1.0 | 1.0.0 | drift (by design) | TV reads NA Project Admin + PlanVision over TV transport | keep_vv_divergence | VV reads `clientDrawingName` / `siteAddress` from project.json | - |
| `Na__LayoutEditor__Assets__.js` | 1.0.1 | 1.0.0 | drift (by design) | TV: folder from URL + DevGate upload gate | keep_vv_divergence | VV: `NormalizeProjectFolderId(projectCode)` -> `VaApps/Projects/{folderId}/`, localhost upload gate (data path per VV DevGate header) | - |
| `Na__LayoutEditor__ScaleManager__.js` | 1.2.1 | "1.0.0" (code = TV 1.2.0) | drift (tsv says header-only) | site plan list (1.1.0 / v2.48.0) incl. `IsListed`; 1:200 is config (v2.140.0) | port_verbatim | site plan list inert without site plan viewports; 1:200 per D-S03b-05 | config Scales keys |
| `Na__LayoutEditor__SheetLayout__.js` | 1.2.0 | 1.2.0 | ident | - | no_action | - | - |
| `Na__LayoutEditor__DrawingScale__.js` | 1.0.0 | 1.0.0 | ident | - | no_action | - | - |

### 10__Core__SheetSurface

| TV file | TV ver | VV ver | State | What VV lacks / does differently (TV versions) | Action | VV adaptation (seams) | Depends on |
|---|---|---|---|---|---|---|---|
| `Na__LayoutEditor__SheetSurface__.js` | 1.13.0 | 1.6.0 | drift | stack (1.7.0 / v2.106), zoom gesture + settle event (1.8.0 / v2.111), GetSheetChrome (1.9.0 / v2.114), vector quality (1.10.0 / v2.136), translate placement (1.11.0 / v2.137), rotation (1.12.0 / v2.138), scoped frames (1.13.0 / v2.142), ShowPublished (v2.155) | port_verbatim | none | PaintOrder, MarkupBridge 1.15.0+, SheetChrome `BuildViewportFrame`, `20/VectorQuality`, `20/ViewportRotation`, config `GetVectorQualitySetup` (for 20 VectorQuality), `GetNavigationSetup` [Verifier: `50/SpecMargin` Push and `30/EditScope` `IsInside` struck - both already in VV with TV's signatures, EditScope L336/L582, SpecMargin L320] (zoomSettleMs, holdPaperWhileZooming); restack already landed |
| `Na__LayoutEditor__SheetChrome__.js` | 1.14.0 | "1.5.0" (code has 1.8.0) | drift | ShowFrame (1.4.0 / v2.38), hatch (1.2.0 / v2.90, 1.12.0 / v2.126), PdfFonts (1.7.0), qr (1.9.0 / v2.81), BuildViewportFrame (1.10.0), picture (1.11.0 / v2.116), turned group (1.13.0), holes (1.14.0 / v2.150) | port_verbatim | none | `36/HatchPatterns`, `60/PdfFonts`, `53/ProjectQr__Painter`, `54/SheetImages__Painter`, `20/ViewportRotation`, ShapeRings; `35/GradientTool` `DrawPdf(..., holes)` |
| `Na__LayoutEditor__TitleBlock__Modern__.js` | 1.5.0 | 1.2.0 | drift | QR cell (1.3.0 / v2.81), ValuePrefix + paper factor (1.5.0 / v2.109) | port_whole_reapply_vv | logo stand-in text "VALE GARDEN HOUSES" (better: config key, D-S03b-09) | Cells 1.2.0, QrCell, config `qrCell*`, `rowWidthFactorByPaper`, Rows `ValuePrefix` |
| `Na__LayoutEditor__TitleBlock__Cells__.js` | 1.2.0 | 1.0.0 (= TV 1.1.0) | drift | `Widen` (v2.109) | port_verbatim | none | - |
| `Na__LayoutEditor__TitleBlock__QrCell__.js` | 1.0.0 | - | tv-only | The QR end cell (v2.81) | port_verbatim | VV 53 config `ProjectQr__Enabled: false` until D-S03b-03 | `53/ProjectQr__Symbol` (+Encoder, ProjectLink - [Verifier] a VV ProjectLink is required, S03b-V02), SheetChrome `PushQr` |
| `Na__LayoutEditor__TitleBlock__Classic__.js` | 1.0.0 | 1.0.0 | ident | - | no_action | asset relocation (finding S03b-F36) | - |
| `Na__LayoutEditor__Navigation__.js` | 1.3.0 | 1.1.0 | drift | gesture argument (1.2.0 / v2.111); authoring zoom ceiling (1.3.0 / v2.135) | port_verbatim | none (VV has DevGate) | SheetSurface `NoteZoomGesture`; config `authoringZoomMax` |
| `Na__LayoutEditor__Controls__Pc__.js` | 1.4.0 | 1.1.0 | drift | wheel batching (1.2.0), Page Up/Down (1.3.0 / v2.112), TakeKeyboard (1.4.0 / v2.115) | port_verbatim | header names VV's key map file | `03__AppUtils/Na__AppUtils__KeyScope__.js` (TV-only), `05/ModeController` (STEP_SHEET_EVENT listener, TakeKeyboard on entry), key map `Nav__PreviousSheet` / `Nav__NextSheet`; [Verifier] VV's 3D hotkey handler gated on KeyScope (S03b-V01) |
| `Na__LayoutEditor__Controls__TouchScreen__.js` | 1.1.0 | 1.0.0 | drift (tsv says header-only) | pinch is a gesture step | port_verbatim | header names VV's key map file | Navigation 1.2.0 |
| `Na__LayoutEditor__Styles__Main__.css` | - | - | drift | tab strip incl. v2.158 Drawings menu, Dev section (TV keeps here; VV keeps in Boot) | port_adapted [Verifier: was port_whole_reapply_vv; F39 is right] | leave Tab Strip + Dev Menu regions out; carry v2.158 rules to `01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css` | tab strip slice |
| `Na__LayoutEditor__Styles__Main__Paper__.css` | - | - | drift | stack/slots, zooming, vector hold, fog, transparent frame, scoped per-slot fade, rubber band 2 px, hover tooltip, menu flyout, grip states, carry; osnap rules removed | port_adapted (by region, with owners) | keep `.na-le-osnap*` until VV's snap marker moves to 28 ObjectSnap; keep the diamond's rotate until Grips PlaceBox lands | owners: SheetSurface, VectorQuality, depth fog, LayerMenu, HoverTooltip, Grips, ViewportSnapMove, ObjectSnap CSS |
| `Na__LayoutEditor__Styles__Surfaces__.css` | - | - | ident | - | no_action | VV links it first in `Na__LeLoad__STYLESHEETS` | - |

### 15__Core__Markup

| TV file | TV ver | VV ver | State | What VV lacks / does differently (TV versions) | Action | VV adaptation (seams) | Depends on |
|---|---|---|---|---|---|---|---|
| `Na__LayoutEditor__MarkupBridge__.js` | 1.20.0 | 1.10.0 | drift | AtScale value via DrawingScale (1.7.0 / v2.40, VV inconsistency); extension lines (1.8.0 / v2.41); halo options (1.13.0); floor area labels (1.14.0 / v2.104); layer-stacked paint/hit (1.15.0 / v2.106); reference layers (1.16.0 / v2.123); rotated import (1.17.0 / v2.138); round up (1.18.0 / v2.139); DimensionBounds (1.19.0 / v2.141); line pt/dash (1.20.0 / v2.152) | port_whole_reapply_vv | paths 42->43, 43->44, 44->45, 45->46 | PaintOrder, DimensionRounding, DimensionGeometry 1.6.0, LeaderGeometry 1.3.0, ShapeGeometry 1.9.0, `59/FloorAreas__Paint` (-> FloorAreas__), `35/LineStyleTool` `PatternMm`, SheetModel 1.30.0+ (`IsLayerSelectable`), config dimension `roundUpStepMm`, `roundUpMarker` |
| `Na__LayoutEditor__DimensionGeometry__.js` | 1.6.0 | 1.2.0 | drift | extension skeleton + ghosts (1.2.0 / v2.41); dash array (1.6.0 / v2.152) | port_verbatim | none | SheetChrome PushPolyline (any version) |
| `Na__LayoutEditor__DimensionRounding__.js` | 1.0.0 | - | tv-only | round up to 5 mm (v2.139) - pure | port_verbatim [Verifier: after Adam's sign-off, D-S03b-11] | none | - |
| `Na__LayoutEditor__LeaderGeometry__.js` | 1.3.0 | "1.0.0" (code has 1.1.0) | drift | broken resolver + halo (1.2.0); note resolver (1.3.0 / v2.144) | port_verbatim [Verifier: later versions wait for sign-off, D-S03b-11] | none | `50/SpecLinks` registering the resolvers; sheet tools reading NoteFor/IsBroken |
| `Na__LayoutEditor__ShapeGeometry__.js` | 1.9.0 | 1.5.0 | drift | Shape__Qr (1.6.0 / v2.100), image (1.7.0 / v2.116), portal grey (1.8.0 / v2.120), holes (1.9.0 / v2.150), hatch hit | port_verbatim | none | ShapeRings, SheetChrome `PushQr`, `53/ProjectQr__Symbol`, `54/SheetImages__Paint` (-> Source -> TV CfApi: needs VV transport); [Verifier] 53 Symbol needs a VV ProjectLink (S03b-V02) |
| `Na__LayoutEditor__ShapeRings__.js` | 1.1.0 | - | tv-only | holed vectors (v2.150), FacesFromRings (v2.160) - pure | port_verbatim [Verifier: after Adam's sign-off, D-S03b-11] | none | - |
| `Na__LayoutEditor__PaintOrder__.js` | 1.0.0 | - | tv-only | the Layers list is the paint order (v2.106) | port_verbatim (inert until SheetSurface/MarkupBridge use it) | none | SheetModel `GetLayers`; restack (SheetRecords 1.26.0) BEFORE any consumer |
| `Na__LayoutEditor__Groups__.js` | 1.4.0 | 1.2.0 | drift | KINDS + leader, dimension (1.3.0 / v2.141), viewport (1.4.0 / v2.142); their bounds | port_verbatim | none | MarkupBridge `DimensionBounds`, `20/ViewportRotation` `Bounds`, SheetModel `GetViewportById`; SheetRecords GROUP_KINDS + Groups unit (atomic) |
| `Na__LayoutEditor__MeasureParse__.js` | 1.1.0 | 1.0.0 | drift | `Array` (v2.119) | port_verbatim | none | consumer `30/SheetTools__CopyDrag__` |

---------------------------------------------------------------------------------------------------------------------

## (d) Wiring notes

### d1. Import closure: what must exist in VV before a TV file can be dropped in

Imports a TV slice file makes that VV cannot resolve today (from `work_s03b/exports.txt`). "Leaf" = the dependency itself
imports nothing (or only config / ScaleManager), so it can be ported ahead, inert.

| TV slice file | Needs in VV first (not present today) | Leaf? | Owning slice |
|---|---|---|---|
| SheetRecords | `20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js` (`FIELD`, `WrapDeg`) | yes, no imports | 20 Viewports |
| SheetRecords, Viewports unit, SheetChrome | `36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js` (`FIELD`, `CAT_FIELD`; Chrome: `Get`, `SvgPaint`, `DrawPdf`) | yes, no imports (997 lines) | 36 Hatch tools |
| SheetRecords, Viewports unit | `25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js` (field names, `DeckKeys`, `DeckDefault`) | imports ScaleManager only | 25/21 site plan |
| SheetRecords | `54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Geometry__.js` (`NormaliseCrop`, `Enforce`) | yes, no imports | 54 Sheet Images |
| SheetRecords, SheetChrome, ShapeGeometry | `15__Core__Markup/Na__LayoutEditor__ShapeRings__.js` | yes | this slice (WP-S03b-02) |
| SheetRecords, Sheets unit | `07/...SheetRecords__NoteRegions__.js`, `...LeaderlessNotes__.js` | yes | this slice (WP-S03b-02) |
| SheetRecords, Sheets unit | config `Na__LeCfg__GetDrawingRegisterSetup` | config | 03 config |
| Sheets unit | `51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js`; `80__CloudflareIntegration/...ApiClient__` `Na__CfApi__GetLoadedProjectData` | Numbering: no imports; CfApi: TV transport, NEVER port | 51 register / VV transport adapter |
| Facade, AutoSave | `42__System__DrawingViewCore/Na__DrawView__ProjectData__.js` `IsLoaded` (1.5.0), `GetBase`, `WhenBaseKnown`, `SAVED_ISO_KEY` (1.6.0) | no (core) | 42 DrawingViewCore / transport |
| AutoSave | `21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js` 1.2.0 (`altLabel`, `'alt'` answer) | no | 21 |
| SheetChrome | `60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js` (Open Sans TTFs) | imports config | 60 PDF |
| SheetChrome | `53__Feature__ProjectQrCode/Na__ProjectQr__Painter__.js` | yes | 53 QR |
| SheetChrome | `54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Painter__.js` | yes | 54 |
| ShapeGeometry, QrCell | `53/Na__ProjectQr__Symbol__.js` -> `Encoder`, `ProjectLink`, `03__AppUtils/...ProjectLoader` | ProjectLink imports `Na__AppUtils__GetProjectFolderFromUrl` and `Na__AppUtils__GetYearFromUrl`, which VV's ProjectLoader does NOT export: a link-time failure of the editor graph even with the QR off [Verifier, S03b-V02] | 53 |
| ShapeGeometry | `54/Na__LayoutEditor__SheetImages__Paint__.js` -> Geometry, Painter, Setup, **Source -> `80__CloudflareIntegration`** | Source needs a VV transport adapter | 54 + transport |
| MarkupBridge | `59__Feature__FloorAreas/Na__LayoutEditor__FloorAreas__Paint__.js` -> `FloorAreas__.js` (849 lines; DrawingScale, SheetModel, ViewportRotation, FloorAreas__Geometry) | no | 59 Floor Areas |
| SheetSurface | `20/Na__LayoutEditor__VectorQuality__.js` (imports the TV-only config reader `Na__LeCfg__GetVectorQualitySetup`) [Verifier: `30/EditScope` `Na__LeScope__IsInside` struck - VV exports it, EditScope L336/L582, body identical] | config only | 20 |
| Controls__Pc | `03__AppUtils/Na__AppUtils__KeyScope__.js` | yes, no imports | 03 AppUtils |
| Groups (markup) | `20/ViewportRotation` `Bounds` | yes | 20 |

Already present in VV and compatible: `35/GradientTool` (but `DrawPdf(doc, points, gradient)` lacks TV's 4th `holes`
argument - VV GradientTool:532 vs TV:544), `35/LineStyleTool` (`Na__LeDash__Normalise`, `PatternMm`), `25/EdgeStyles`,
`25/RenderComposites`, `50/SpecMargin` (VV has it; TV's adds `SpecMargin__Column__` and region/leaderless reading),
`30/EditScope` (WITH `IsInside` - [Verifier] correction: VV EditScope L336, exported L582), `03/DevGate`, `07/DrawingScale`, `50/SpecMargin` `Push(list, sheet, layout)` (same signature as TV).

### d2. Hot files outside the slice (edited by these ports)

- `VVM/LE/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js` - `GetDimensionSetup` gains `roundUpStepMm`,
  `roundUpMarker`, `defaultRoundUp`, `defaultAtScale`, `defaultExtensionMm`; `GetShapeSetup` `defaultAtScale`;
  `GetLeaderSetup` `noteTooltip`, `noteTooltipMs`; `GetEditScopeSetup` `autoMoveOnSelect`, `autoMoveKinds`.
- `VVM/LE/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js` - `GetMarginNotesSetup` region keys
  (`regionMinSizeMm`, `regionPaddingMm`, `regionOverspillTitle`, `regionGroupsTitle`, `regionBordersDefault`,
  `regionGripPx`); `GetNavigationSetup` (`authoringZoomMax`, `zoomSettleMs`, `holdPaperWhileZooming`);
  `GetDrawingRegisterSetup` (37 keys incl. `prefix`, `digits`, `start`, `phases`, `defaultPhase`, `documentCodeFmt`).
- `VVM/LE/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js` - `GetTitleBlockSetup` (16 `qrCell*` keys,
  `rowWidthFactorByPaper`), `GetViewportSetup` (`rotateStepDeg`, `rotateDetentDeg`, `rotateGripOffsetPx`),
  `GetScaleSetup` (`sitePlanDenominators`, `sitePlanDefaultDenominator`) and the fallback scale list (1:200).
- `VVM/LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` - labels `DraftApplied`, `DraftDiscarded`,
  `DraftLeftAside`, `SavedLocalMessage`, `SavedLocalFailedMessage`, `SitePlanViewportName`; Dimensions `RoundUpStepMm`,
  `RoundUpMarker`; Navigation `AuthoringZoomMax`, `ZoomSettleMs`, `HoldPaperWhileZooming`; MarginNotes `Region*`;
  `LayoutEditor__DrawingRegister__Config` (`DocumentCodeFormat`, `Phases`, `DefaultPhase`); TitleBlock `Rows`
  (`ValuePrefix`, `DocumentId` row per D-S03b-01), `RowWidthFactorByPaper`, `QrCell*`, `ClassicScanAssets`,
  `ClassicFieldAnchors` (key rename per D-S03b-01); `Viewport__DefaultStyles.depthFog`; Scales list.
- `VVM/LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` (TV name `Na__Hotkeys__DrawingTabs__.json`) -
  `Nav__PreviousSheet` (PageUp), `Nav__NextSheet` (PageDown).
- `VVM/LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` - listen for `Na__LePc__STEP_SHEET_EVENT`
  and call `Na__LePc__TakeKeyboard` when a drawing is opened (TV ModeController:319, 616, 1219); `'areas'` routing
  with Floor Areas.
- **[Verifier]** `VVM/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` (initialised at `VV/Index.html:1792`) and
  `VVM/02__AppData/Na__ValeVision__HotkeysDictionary__.json` - VV's 3D hotkeys must ask KeyScope, as TV's
  `10__NavigationAndCameras/Na__Hotkeys__Manager.js:167` does (S03b-V01).
- **[Verifier]** A VV `53__Feature__ProjectQrCode/Na__ProjectQr__ProjectLink__.js` (QR slice), or VV implementations of
  `GetProjectFolderFromUrl` / `GetYearFromUrl` in `VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js` (S03b-V02).
- **[Verifier]** `ConfigState__SheetSetup__.js` - the TV-only reader `Na__LeCfg__GetVectorQualitySetup` (20 VectorQuality);
  `GetPdfSetup` font keys (60 PdfFonts); never copy `GetDrawingRegisterSetup`'s NA PlanVision `pdfJsScriptPath` fallback.
- `VVM/LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` - delete `Na__LeLoad__AnnounceProjectLoad` (L299-311) and its
  call (L339) when the TV facade's late-start lands; `Na__LeLoad__STYLESHEETS` (L125-134) gains the ObjectSnap stylesheet
  when the Paper CSS loses the `.na-le-osnap*` rules; `Na__LeLoad__GetTabLabel`/`GetShortCode`/`GetDrawingNumber`
  (L541-548) follow D-S03b-01.
- `VVM/LE/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css` - TV v2.158.0 tab menu rules.
- `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js` - `IsLoaded`; `GetBase`, `WhenBaseKnown`,
  `SAVED_ISO_KEY`, `LearnBase`, `CheckBase`; `Save(showToast, report)` (optional `report.local`).
- `VVM/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js` - pass the drawings base to the Flask mirror (phase 2).
- `WCP/server.py` - `GET /api/projects/<code>/drawings-fingerprint`, a base check (409) on `POST /api/projects/<code>`,
  backup-before-overwrite (TV v2.146.0 layers 2 and 3); register-block storage if D-S03b-01 adopts the register.
- `VVM/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js` - `altLabel`, `altIsDestructive`.
- `VVM/LE/35__System__DrawingTools/Na__LayoutEditor__GradientTool__.js` - `DrawPdf(..., holes)`.
- `VVM/LE/50__Feature__Specification/Na__LayoutEditor__SpecLinks__.js` - register `SetBrokenResolver`, `SetNoteResolver`.
- `VVM/LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` - paint by `Na__LePaint__Plan`,
  `BuildLayerPrimitives`, `BuildViewportFrame`, `ShapeRings`; `code : fields.DocumentId` per D-S03b-01 (VV L248).
- `WCP/02__Src__AppModules/62__Feature__AppInstallability/...Registrar...` - only if D-S03b-07 adopts a PWA unsaved flag.

### d3. Atomic sets and order

1. **Leaves first** (WP-S03b-02 and the other slices' leaves in d1): inert until imported.
2. **Schema** (WP-S03b-03): SheetRecords + State + Layers + Shapes + Viewports + TextAndDimensions + Leaders + Groups
   units + AreaGroups. GROUP_KINDS (SheetRecords), PruneGroups (Groups unit) and the three per-kind delete prunes must land
   together. The restack migration runs from here on (invisible while VV still paints all markup over all viewports).
3. **Facade + Sheets + History** (WP-S03b-04): atomic (`AnnounceRestore` moves from Sheets to the facade); with the
   loader's `AnnounceProjectLoad` removed in the same change; needs 42 `IsLoaded`.
4. **Chrome and geometry** (WP-S03b-06), then **paint order** (WP-S03b-07: PaintOrder consumers + SheetSurface +
   MarkupBridge + markup Groups + Paper CSS stack regions + PdfExporter). Never ship 4 before 2.
5. **Title blocks** (WP-S03b-08) after SheetChrome 1.9.0 (`PushQr`).
6. **Navigation/controls** (WP-S03b-09) after SheetSurface 1.8.0 (`NoteZoomGesture`).
7. **AutoSave guards** (WP-S03b-05) after 3, with 42 ProjectData 1.5.0/1.6.0 and the Flask route.
8. **[Verifier] Sign-off gates** (D-S03b-11): DimensionRounding and ShapeRings say in their TV PORT NOTEs that the VV
   port waits for Adam's sign-off, and LeaderGeometry's later versions likewise. ShapeRings is imported by SheetRecords
   1.38.0+, so step 2 waits for that sign-off too.

### d4. Who consumes the new exports (other slices)

| New export | TV consumers outside these folders |
|---|---|
| `Na__LeModel__MoveToLayer` | `30/Na__LayoutEditor__LayerMenu__` |
| `IsItemPickable`, `GetLayerByName`, `LayerIndexLike`, `ShapeLayerType` | `30/Na__LayoutEditor__ItemClipboard__` |
| `IsLayerSelectable` | `28/ObjectSnap__Sources__`, `30/EditScope__`, `30/SelectionBox__`, `30/SheetTools__HitResolution__`, `30/SheetTools__NoteTooltip__`, `35` drawing tools |
| `AddGroupMember`, `AnnounceShapes` | `30/EditScope__`, `37/VectorTools__`, `37/VectorTools__Targets__` |
| `AddNoteRegion` / Update / Delete | `50/Na__LayoutEditor__NoteRegions__Tool__` |
| `GetAreaGroups` and the AreaGroups API | `59/FloorAreas__`, `__Menu__`, `__Table__`, `Panel__FloorAreas__` |
| `GetDocumentId`, `GetPhase` | `51/Register__Pdf__`, `65/Publish__`, `66/Share__*`, `80/WebViewer` |
| `NotifyRegister`, `FinishRegisterDeletion`, `Na__LeAuto__Suspend`/`Resume` | `51/Register__Transactions__` |
| `Na__LeSurface__ZOOM_SETTLED_EVENT` | `26/DraftMode`, `27/DrawingGrid`, `28/ObjectSnap__Marker`, `30/Grips`, `30/Measurements`, `30/SheetTools`, `33/DrawingAxes` |
| `Na__LeSurface__GetSheetChrome` | `28/ObjectSnap__Sources__` |
| `Na__LeSurface__ShowPublished` | `80/Na__LayoutEditor__WebViewer__` |
| `Na__LePaint__Plan`, `Na__LeMarkup__BuildLayerPrimitives`, `Na__LeChrome__BuildViewportFrame` | `60/PdfExporter__`, `65/Publish__Sheet__`, `65/Publish__Viewports__` |
| `Na__LeRings__*` | `35/GradientTool`, `60/PdfExporter`, `65/Publish__Viewports__`, `37` vector tools |
| `Na__LeRec__DrawnNoteRegions`, `ListedLeaderlessGroups` | `50/NoteRegions__`, `50/SpecMargin__`, `50/Panel__MarginNotes__Leaderless__` |
| `Na__LeLeadGeo__NoteFor`, `IsBroken` | `30/SheetTools__ContextMenu__`, `30/SheetTools__NoteTooltip__`, `30/SheetTools__PointerDrag__` |
| `Na__LeMParse__Array` | `30/Measurements__` (the count typed after a Ctrl-drag copy, `SheetTools__CopyDrag__`) |

### d5. Service worker token

Ledger L161-166: VV is served by the shared `WebApps/Na__Pwa__ServiceWorker__.js` (Whitecardopedia registrar) on https,
stale-while-revalidate for shell JS. Every package here adds cross-module exports; an installed client could link a new
importer against an old exporter until the next load. Bumping `PWA_SW_VERSION_TOKEN`
(`WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`) evicts every
Vale app's caches, so it is Adam's call per release - flag it in each package's hand-over.

---------------------------------------------------------------------------------------------------------------------

## (e) UI notes

What a VV user will see change when these packages land (all TV behaviour, to be matched exactly):

- **Sheets look the same until paint order lands**, then the Layers list really is the stack: a layer dragged under the
  Viewports layer draws under the drawing; a floor area under a plan tints the room through the linework (transparent
  frame body); a viewport's own frame and caption stack with it (TV v2.106.0).
- **Zooming**: wheel and pinch scale the composited paper and redraw once when the gesture rests; authoring sessions zoom
  to 6400 % (readers 800 %); a drawing is painted exactly on its snap points at any zoom (TV v2.111, v2.135, v2.137).
- **Keyboard**: Page Up / Page Down turn the drawings; clicking the paper takes the keyboard back from a panel control,
  so M, V, Escape and the arrows work after using a tick box or list (TV v2.112, v2.115).
- **[Verifier] 3D keys under a drawing**: once VV's 3D hotkey handler asks KeyScope, R, B, T, Y, V, 1-9 and the Page keys
  typed on a drawing stop reaching the hidden 3D model (today VV's handler hears them on every tab; code-traced).
- **Title block**: "Revision A" instead of "A"; on A2/A1 every cell but the Drawing Title a fifth wider; optional QR end
  cell (compact on A4); "Document ID" instead of "Drawing No." only if D-S03b-01 says so (TV v2.81, v2.109, v2.71).
- **Tabs** gain a short code ("D01 - Elevations") if TV's numbering is adopted; the TV v2.158.0 Drawings menu tab (caret,
  dropdown of every drawing) belongs to the tab strip slice but its CSS sits in this slice's Styles__Main in TV.
- **Viewports** can hide their frame and caption, turn on the page, and close doors / hide swings on plans (inert in VV
  until 20/PlanDoors etc. are ported; the records are kept from WP-S03b-03 on).
- **Dimensions**: round up to 5 mm with an asterisk, own line weight and dashed lines, fixed-length extension lines with a
  dashed ghost while selected; printed figure always equals the Measurements box (TV v2.139, v2.152, v2.41, v2.40).
- **Bubbles** linked to a deleted specification note wear a red halo on screen (never in a PDF); hover shows the note.
- **Vectors** with holes, hatches, QR boxes, pictures and measured rooms paint (with their feature slices).
- **PDF** text set in Open Sans instead of Helvetica (matches the screen and VV's `--Vale_FontFamily`).
- **Undo** covers notes-margin changes (today it silently swallows them into the next step).
- **Drafts**: a draft older than the saved drawings is offered (Apply / Discard / Decide Later) instead of silently put
  back; restored work stays dirty and the close guard holds.
- The "top nav bar animation" Adam named is not in these folders: the ledger records it as ported verbatim (Contextual
  top bar fold, TV v2.83.0 -> VV v2.70.0, ledger L1235-1246) - the UI slice should confirm it.

---------------------------------------------------------------------------------------------------------------------

## (f) Decisions needed (for Adam)

| Id | Question | Options | Recommendation | Blocks |
|---|---|---|---|---|
| D-S03b-01 | How does a ValeVision drawing get its number? TV v2.71.0 splits it into a register-written sequence (`D01`), a per-sheet phase (`T01`-`T04`, NA's stages) and a composed Document ID (`PS01_T02_D01`) printed in a "Document ID" cell and used for the PDF name. VV prints a hand-typed "Drawing No." and defaults to `3047-01`. | **A** adopt fully: Drawing Register (`51__Feature__DrawingRegister`), Vale's own phase list, `{project}_{phase}_{drawing}` with VV's numeric project codes (`3047_T01_D01`). **B** compose the Document ID but keep the number hand-typed (no register; `RenumberSheets` off). **C** keep VV's model (permanent divergence in SheetRecords, Sheets, Rows, History, PdfExporter). | **A** - the only route to an identical editor; lossless on the local mirror (no VV sheet stores a number). Adam supplies Vale's phases and format; check R2 for typed numbers before the register's renumber is enabled. | WP-S03b-03 (DrawingNumber default), WP-S03b-04 (RenumberSheets), WP-S03b-08 (Rows key), PdfExporter, tab labels |
| D-S03b-02 | Where do the tab-code string rules live? [Verifier: the leaf's own PORT NOTE offers it to TV only if TV's tab strip is ever made lazy, so option A is justified only by the identical-SheetRecords goal.] | **A** keep VV's `Na__LayoutEditor__DrawingCode__.js` and back-port it to TV, so both SheetRecords import one leaf. **B** keep the leaf VV-only (SheetRecords differs forever). | **A** - and grow the leaf with pure `DefaultNumber(order, prefix, digits)` and `ComposeDocumentId(format, ...)` so the loader can show TV-style codes before the editor loads. | WP-S03b-03, WP-S03b-04 |
| D-S03b-03 | Should Vale drawings carry the QR end cell, and what does it open? TV's link is `https://www.noble-architecture.com/q/?{projectCode}` through NA's resolver. | **A** enable with a VV URL (VV's `?project=` share link, or a Vale short resolver). **B** port the code with `ProjectQr__Enabled: false` (strip unchanged). **C** do not port QrCell (Modern stays divergent). | **B** now, **A** once a VV target and resolver exist; never ship NA's link. | WP-S03b-08 |
| D-S03b-04 | Do Floor Areas come to VV? (TV's floor area plan, phase 9, waits for Adam's sign-off of TV.) | **A** port 59 + AreaGroups + `'areas'` step + Floor Areas seed layer. **B** not yet: VV seeds 4 layers (adapt SheetRecords) and keeps `'area'` coerced. | **A** - SheetRecords seeds the Floor Areas layer on every new sheet and keeps `'area'` layers; without the feature that is an empty layer users cannot use. | WP-S03b-03 seed, MarkupBridge (FloorAreas Paint import) |
| D-S03b-05 | Add 1:200 to VV's scales (VV plan D27 says 1:20, 1:50, 1:100)? | yes (config only) / no | yes - TV v2.140.0; without it a TV-era 1:200 viewport is coerced to 1:50 | WP-S03b-10 |
| D-S03b-06 | Make a notes-margin change an undo step in VV (ledger L219: "open - wants its own decision")? | yes / no | yes - today the change is not a step AND leaves the baseline stale, so the next Ctrl+Z undoes two things | WP-S03b-01 / WP-S03b-04 |
| D-S03b-07 | VV IS under the shared Whitecardopedia service worker (ledger L135-166). Should unsaved sheets hold its update reload, as TV's do? | **A** publish a neutral `window.Na__Pwa__HasUnsavedWork` from AutoSave in both apps and have both registrars read it. **B** publish TV's `TrueVision__Pwa__HasUnsavedWork` name in VV (NA-named). **C** keep not publishing. | **A** - back-port the neutral name to TV; needs a change to the Whitecardopedia registrar (outside VV). | WP-S03b-05 |
| D-S03b-08 | TV-only record code with no VV feature behind it (site plan sheets/viewports/scales, model source, hatch overrides): port inert, or strip? | port verbatim (inert) / strip in VV | port verbatim - keeps SheetRecords, Viewports and ScaleManager identical; note that every VV viewport gains `Viewport__ModelSourceId: null` on its next save | WP-S03b-03, WP-S03b-10 |
| D-S03b-09 | Move the title block's logo stand-in text into config (`LayoutEditor__TitleBlock__LogoFallbackText`) in both apps, so `TitleBlock__Modern__` is byte-identical? | yes / keep a code seam | yes (back-port the key to TV with "NOBLE ARCHITECTURE") | WP-S03b-08 |
| D-S03b-10 | Move the real Vale Classic scan out of legacy `35__System__PageLayoutSystem` into `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png` (TV's convention) and correct TV plan TD04 (TV keeps Classic with a placeholder)? | yes / no | yes; never copy TV's placeholder PNG | WP-S03b-08, WP-S03b-12 |
| D-S03b-11 **[Verifier]** | Three TV PORT NOTEs say the ValeVision port waits for Adam's sign-off: DimensionRounding (round up to 5 mm with an asterisk; opt-in, `DefaultRoundUp` false), ShapeRings (vectors with holes; imported by SheetRecords 1.38.0+, ShapeGeometry 1.9.0, SheetChrome 1.14.0) and LeaderGeometry 1.2.0/1.3.0 (broken-bubble halo, note resolver). Sign them off for VV? | **A** all three now. **B** ShapeRings only (needed for an identical SheetRecords), hold the other two. **C** hold all three (SheetRecords, ShapeGeometry and SheetChrome keep holes seams). | **A** - each is inert or opt-in until a VV user acts; B and C leave seams in three core files | WP-S03b-02, WP-S03b-03, WP-S03b-06 |

---------------------------------------------------------------------------------------------------------------------

## (g) Proposed work packages

Every package ends with `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` and
`Na__Verify__ModuleGraph__.mjs` green in VV, a VV DEVLOG entry, ledger rows, and a note to Adam about the PWA token (d5).
Whole-file ports re-apply only the seams named in section (c).

### WP-S03b-01 - Immediate VV correctness fixes (optional bridge) - S
- Scope: four TV-identical edits in VV ahead of the whole-file ports: `'margin'` in `Na__LeHist__STEP_REASONS` (if
  D-S03b-06); `DeleteLayer` re-homes shapes (TV Layers 1.1.0); `DimensionValueMm` through
  `Na__LeDrawScale__DimensionDenominator` (TV MarkupBridge 1.7.0); `InsertShape` writes its fallback layer id (TV
  Shapes 1.4.0, the write only).
- Files: `VVM/LE/07/...History__.js`, `...SheetModel__Layers__.js`, `...SheetModel__Shapes__.js`, `VVM/LE/15/...MarkupBridge__.js`.
- Acceptance: a margin width change and a text edit undo as two steps; deleting a layer that holds a vector leaves the
  vector on Vectors and listed; a dimension with `Dimension__AtScale: true` and no host viewport prints the figure the
  Measurements box reads; a scrapbook drop naming a missing layer lands on an existing layer. Skip if WP-S03b-03/04/07
  are less than one release away (they supersede these lines).

### WP-S03b-02 - Pure leaves - S
- **[Verifier]** Gate: ShapeRings and DimensionRounding wait for Adam's sign-off (their TV PORT NOTEs; D-S03b-11).
  NoteRegions, LeaderlessNotes (*Nothing here is app-specific*), PaintOrder and MeasureParse can go now. Re-issued as WP-S03b-02R.
- Scope: port verbatim `15/ShapeRings` 1.1.0, `15/DimensionRounding` 1.0.0, `15/PaintOrder` 1.0.0 (inert),
  `07/SheetRecords__LeaderlessNotes` 1.0.0, `07/SheetRecords__NoteRegions` 1.0.0; `15/MeasureParse` 1.1.0 whole file.
- Hot files: `ConfigState__EditorSetup__.js` (`GetMarginNotesSetup` region keys), `Na__LayoutEditor__AppConfig__.json` (MarginNotes `Region*`).
- Acceptance: modules load with no consumer; `Na__Test__DimensionRoundUp__` passes; ShapeRings checks from
  `Na__Test__VectorBooleans__` pass; NoteRegions/LeaderlessNotes normalise a fixture margin record exactly as TV's do.

### WP-S03b-03 - Sheet record schema and model units to TV - XL
- **[Verifier]** Acceptance (2) corrected: compared with VV's CURRENT normalised output (not the file on disk - 3047__Doous
  on disk has no `Sheet__Groups`/`Sheet__Leaders` and older Styles), the changes are the restack (`Layer__Order`,
  `Sheet__LayerStack: 2`), `Viewport__ModelSourceId: null` on every viewport, `Asset__Samples: null` on every snapshot asset
  (3047__Doous Viewport_002) and `Viewport__Styles.depthFog` once `DefaultStyles.depthFog` is configured (S03b-V04).
  Added dependency: D-S03b-11 (SheetRecords imports ShapeRings). Re-issued as WP-S03b-03R.
- Scope: `07/SheetRecords` (TV file incl. the 29-Sep edge fields), `SheetModel__State__`, `__Layers__`, `__Shapes__`,
  `__Viewports__`, `__TextAndDimensions__`, `__Leaders__`, `__Groups__`, new `__AreaGroups__` (per D-S03b-04); header
  re-sync of `__DrawOrder__`, `__Common__`. VV seams: DrawingCode imports, DrawingNumber default (D-S03b-01), keep
  `Na__LeRec__SheetShortCode` exported until WP-S03b-04, folder paths 40->42, 42->43, 45->46.
- Depends on: WP-S03b-02; other slices' leaves `20/ViewportRotation`, `36/HatchPatterns`, `25/SitePlanComposites`,
  `54/SheetImages__Geometry`; config readers (d2).
- Hot files: `ConfigState__ToolSetup__.js`, `ConfigState__SheetSetup__.js`, `ConfigState__EditorSetup__.js`,
  `Na__LayoutEditor__AppConfig__.json` (`Viewport__DefaultStyles.depthFog`, `DrawingRegister__Config`).
- Acceptance: (1) golden fixture carrying every b2 row normalises in VV byte-identical to TV (diff only the VV seams);
  (2) the 4 local VV sheets restack once (Viewports to the bottom), gain `Sheet__LayerStack: 2`, and normalise
  idempotently; [Verifier: see the corrected list above - not only] the new `Viewport__ModelSourceId: null` changes; (3) screen and PDF of those sheets
  unchanged; (4) a group holding a leader, a dimension or a viewport survives a delete elsewhere and a reload; (5)
  margin regions and leaderless groups survive a reload.
- Tests to port: `Na__Test__LayerStack__.test.mjs`, model parts of `Na__Test__LayerMenu__.test.mjs` and
  `Na__Test__HideSwings__.test.mjs`, records part of `Na__Test__HatchLineControls__.test.mjs`.

### WP-S03b-04 - Facade, Sheets unit, History and the late start - L
- Scope: `SheetModel__` facade 1.35.1, `SheetModel__Sheets__` 1.4.0, `History__` 1.7.0 as one change; delete the
  loader's `Na__LeLoad__AnnounceProjectLoad`; `RenumberSheets` behind a VV accessor for the register block and a no-op
  without one (D-S03b-01).
- Depends on: WP-S03b-03; `42/ProjectData` `Na__DrawData__IsLoaded`; D-S03b-01, D-S03b-02, D-S03b-06.
- Hot files: `VVM/LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`, `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js`,
  `VVM/LE/07/Na__LayoutEditor__DrawingCode__.js`, `Na__LayoutEditor__AppConfig__.json` (save labels).
- Acceptance: first editor open in a session announces 'loaded' once and runs `SeedCommonFields` (a pack whose sheets
  share a client seeds `CommonClient`); a second drawings load is heard once and a restored draft stays dirty; `GetSheets`
  does not renormalise between announcements; sheet create/duplicate/delete/reorder leaves every stored
  `Sheet__Fields__DrawingNumber` untouched while no register block exists; undo of a vector delete still writes nothing.
- Tests to port: `Na__Test__SheetsNormaliseOnce__.test.mjs`; late-start half of `Na__Test__DraftRestore__.test.mjs`.

### WP-S03b-05 - Draft guard and the project-file guards - M (with the transport slice)
- Scope: `AutoSave__` 1.5.0 (key waits for the sheets, base on every draft, JudgeDraft, Apply/Discard/Decide Later,
  Suspend/Resume/DiscardSavedDraft, PWA flag per D-S03b-07); `21/DevMenu__Modal__` 1.2.0; `42/ProjectData` 1.6.0
  (`GetBase`, `WhenBaseKnown`, `LearnBase`, `CheckBase`, `SAVED_ISO_KEY`); base header through
  `R2SaveProjectJson`; `WCP/server.py` fingerprint route, 409 on a stale base, backup before overwrite.
- Hot files: `VVM/42.../Na__DrawView__ProjectData__.js`, `VVM/21.../Na__PresentationMode__DevMenu__Modal__.js`,
  `VVM/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js`, `WCP/server.py`, `Na__LayoutEditor__AppConfig__.json`.
- Acceptance: `Na__Test__DraftRestore__` (27 checks) and `Na__Test__DraftGuard__` (11) pass against VV modules; a Python
  test of `WCP/server.py` mirrors `Na__Test__ProjectDataSaveGuard__` (32 checks: stable fingerprint, stale base refused,
  file untouched, no backup on refusal, backups capped); two windows on `3047__Doous`: the second save is refused before R2.

### WP-S03b-06 - Chrome primitives and markup geometry - L
- **[Verifier]** Add prerequisite: a VV ProjectLink for 53 (S03b-V02) - ShapeGeometry 1.6.0+ links 53 Symbol -> ProjectLink.
  LeaderGeometry 1.2.0/1.3.0 and the ShapeRings parts wait for D-S03b-11. Risk: the measuring and PDF face moves from
  Helvetica to Open Sans; VV's row widths (ledger L121) and its TitleBlockCells fixture (ledger L127) are Helvetica
  numbers - re-measure in the same change (S03b-V05). Re-issued as WP-S03b-06R.
- Scope: `10/SheetChrome` 1.14.0, `15/ShapeGeometry` 1.9.0, `15/DimensionGeometry` 1.6.0, `15/LeaderGeometry` 1.3.0.
- Depends on: WP-S03b-02, WP-S03b-03; `36/HatchPatterns`, `60/PdfFonts` (+ TTFs), `53/ProjectQr__Painter` and
  `__Symbol` (VV config, disabled), `54/SheetImages__Painter` and `__Paint` (Source on VV transport), `20/ViewportRotation`.
- Hot files: `VVM/LE/35__System__DrawingTools/Na__LayoutEditor__GradientTool__.js` (holes), `VVM/LE/50__Feature__Specification/Na__LayoutEditor__SpecLinks__.js` (resolvers).
- Acceptance: PDF of each local sheet identical but for Open Sans embedding; `Viewport__ShowFrame: false` hides frame and
  caption on screen and in the PDF; a holed fixture vector shows its hole on screen and in the PDF; a QR primitive paints
  when 53 is enabled in a test config; a bubble whose note is deleted shows the red halo on screen only.
- Tests to port: `Na__Test__HatchLineControls__.test.mjs`, `Na__Test__TitleBlockScaleCell__.html`, chrome part of
  `Na__Test__ViewportRotation__.test.mjs`.

### WP-S03b-07 - Paint order: the Layers list is the stack - L
- **[Verifier]** `50/SpecMargin` push is already in VV with TV's signature; it is not a prerequisite. Re-issued as WP-S03b-07R.
- Scope: consumers of `PaintOrder` - `15/MarkupBridge` 1.20.0, `15/Groups` 1.4.0, `10/SheetSurface` 1.13.0, the Paper
  CSS stack, zoom, fog, frame and per-slot fade regions, and `60/PdfExporter`'s paint loop - in ONE change.
- Depends on: WP-S03b-03 (restack has run), WP-S03b-04, WP-S03b-06; `20/VectorQuality` (+ config reader `Na__LeCfg__GetVectorQualitySetup`), [Verifier: `30/EditScope` `IsInside` struck - already in VV],
  `50/SpecMargin` push, `59/FloorAreas__Paint` (or D-S03b-04 stub).
- Hot files: `VVM/LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js`, [Verifier: `VVM/LE/30__System__SheetTools/Na__LayoutEditor__EditScope__.js` struck - nothing to add there], `ConfigState__SheetSetup__.js` (GetVectorQualitySetup),
  `VVM/LE/10/...Styles__Main__Paper__.css`, `ConfigState__EditorSetup__.js` (navigation keys).
- Acceptance: every local VV sheet looks identical on screen and in the PDF before and after (pixel diff at Fit); a markup
  layer dragged under Viewports draws under the drawing on screen and in the PDF; clicks find the top-most item; a
  reference layer passes clicks through; an open group keeps its viewports at full strength; the printed figure of an
  AtScale dimension equals the Measurements box; a wheel zoom adds `na-le-paper--zooming` and settles once.
- Tests to port: paint-plan half of `Na__Test__LayerStack__`, `Na__Test__PaintedOnThePoint__` (with its CSS deps),
  bounds part of `Na__Test__GroupMoveSnapping__.test.cjs`.

### WP-S03b-08 - Title blocks - M
- **[Verifier]** Also: VV config sets `LayoutEditor__TitleBlock__QrCellEnabled` false (TV ships true), and the 53 leaves need
  a VV ProjectLink before Modern 1.5.0 / QrCell link (S03b-V02). The 'QR on (test config)' acceptance needs that VV link.
- Scope: `TitleBlock__Cells` 1.2.0, `TitleBlock__Modern` 1.5.0 (logo stand-in from config, D-S03b-09), new
  `TitleBlock__QrCell` 1.0.0, Rows `ValuePrefix` and `RowWidthFactorByPaper`, QR cell keys, Classic asset relocation
  (D-S03b-10), row key per D-S03b-01.
- Depends on: WP-S03b-06 (`PushQr`), 53 Symbol and VV config.
- Hot files: `Na__LayoutEditor__AppConfig__.json`, `ConfigState__SheetSetup__.js`, new `VV/01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/`,
  VV's `53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json`.
- Acceptance: `Na__Test__TitleBlockCells__` (VV fixture + Widen cases) passes; A3 strip unchanged with QR off except
  "Revision A"; A2/A1 fixed cells a fifth wider with the Drawing Title uncut; A4 portrait drops the prefix before
  cutting the date; QR on (test config): 56 mm cell, compact on A4, decodes to the VV URL; Classic prints the Vale scan
  from the new path; no VV file contains `noble-architecture.com`.
- Tests to port: `Na__Test__TitleBlockCells__.test.mjs` and `.html` (update), `Na__Test__ProjectQr__.test.mjs` (53 slice).

### WP-S03b-09 - Navigation and controls - M
- **[Verifier]** Missing hot files: `VVM/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js`, `VV/Index.html` (the
  hotkey callbacks at L1792) and `VVM/02__AppData/Na__ValeVision__HotkeysDictionary__.json` - VV's 3D hotkeys must ask
  KeyScope (S03b-V01). Extra acceptance: with a drawing open, R, B, T, Y, V, 1-9, PageUp and PageDown do nothing to the
  3D view; on the 3D tab they work as today. Coordinate with the keyboard/mode-controller slice. Re-issued as WP-S03b-09R.
- Scope: `Navigation` 1.3.0, `Controls__Pc` 1.4.0, `Controls__TouchScreen` 1.1.0, new `03__AppUtils/Na__AppUtils__KeyScope__.js`.
- Depends on: WP-S03b-07 (`NoteZoomGesture`); mode controller listeners; key map entries.
- Hot files: `VVM/LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, `VVM/LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json`,
  `ConfigState__EditorSetup__.js`, `ConfigState__KeyMap__.js`.
- Acceptance: `Na__Test__AuthoringZoomMax__`, `Na__Test__SheetPagingWalkExit__`, `Na__Test__DrawingTabKeys__` pass on VV;
  after ticking a panel checkbox a click on the paper and M picks Move; Page Down turns to the next drawing and stops at
  the last; a touchpad gives one zoom per frame.

### WP-S03b-10 - Scale list and header re-sync - S
- Scope: `ScaleManager` 1.2.1 verbatim; 1:200 per D-S03b-05; header-only re-sync of DrawingScale, SheetLayout,
  SheetModel__Common, DrawOrder, TitleBlock__Classic, Styles__Surfaces; PORT NOTEs of Assets and ProjectRecord stating the
  permanent divergences.
- Hot files: `ConfigState__SheetSetup__.js` (fallback scale list), `Na__LayoutEditor__AppConfig__.json` (Scales).
- Acceptance: existing 1:20/50/100 viewports unchanged; a 1:200 viewport survives a reload when configured.

### WP-S03b-11 - Stylesheets - M
- Scope: `Styles__Main` without its Tab Strip and Dev Menu regions; the TV v2.158.0 tab menu rules into Boot;
  `Styles__Main__Paper` regions not taken by WP-S03b-07, each with its owner (ObjectSnap 28, Grips, LayerMenu,
  HoverTooltip, ViewportSnapMove, VectorQuality, depth fog).
- Hot files: `VVM/LE/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css`, the loader's `Na__LeLoad__STYLESHEETS`,
  `VVM/LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (VV-only, until replaced).
- Acceptance: VV's snap marker keeps its styling at every step; tab strip rules exist once (Boot); no unintended visual change.

### WP-S03b-12 - Ledger and documentation - S
- **[Verifier]** Also ask Adam to log TV SheetSurface's v2.155.0 `ShowPublished`, give TV PaintOrder a PORT NOTE, and
  correct the 11 ledger rows that say 'this tree has no PWA worker' (L340, L384, L404, L420, L429, L439, L452, L522, L542, L569, L615).
- Scope: ledger rows for every pair here; fix the VV per-file logs (ScaleManager 1.2.0, SheetChrome 1.8.0, LeaderGeometry
  1.1.0, History numbering); the "no PWA worker" rows; the QR folder name; ask Adam to log TV SheetRecords' 29-Sep edge
  fields and to correct TD04.
- Hot files: `VV/ValeVision__PARITY__TrueVisionLedger__.md`, `VV/ValeVision__DEVLOG__.md` (TV docs only with Adam's OK).
- Acceptance: every S03b file pair has a ledger row with its state; no row contradicts L135-166.

---------------------------------------------------------------------------------------------------------------------

## Verification (adversarial verifier, 01-Oct-2026)

**Result.** The slice is accurate and unusually well evidenced. **No finding is refuted.** Every one of the 51 findings
was checked at least for its key claim; all 14 critical and high findings (F01, F02, F03, F04, F06, F08, F10, F16, F17,
F23, F24, F25, F26, F42) were checked line by line. Factual errors found: three small "VV lacks" sub-claims that are false
(`Na__DrawData__GetBlock`, `Na__LeScope__IsInside` and `Na__LeMargin__Push` all exist in VV), one wrong acceptance line
(WP-S03b-03: "no field other than Viewport__ModelSourceId changes"), and one action-table mismatch (Styles__Main). The
material OMISSIONS were wiring and process, not schema: the VV 3D hotkey handler, the 53 ProjectLink link-time gap,
and three TV PORT NOTEs that make the VV port wait for Adam's sign-off.

**How it was checked.**
- Inventory: every file in LE/07, LE/10 and LE/15 of both apps listed on disk and against `tree_tv.tsv`, `tree_vv.tsv`
  and `drift_all.tsv`: TV 43 files / 19,901 lines, VV 37 / 13,311, 36 shared, 7 TV-only, 1 VV-only - section (a) is exact.
- Code drift: comment-stripped, seam-neutralised diff of all 36 shared files (`scratchpad/parity/verify_s03b/codediff2.py`):
  the six code-identical files and the three tsv mislabels (ScaleManager 12 lines, Leaders 2, TouchScreen 1) confirmed;
  the VV-only lines in every port_verbatim candidate are superseded TV code, not VV adaptations.
- Schema: all 44 rows of b2 opened at the cited TV and VV lines; an automated key-set diff of the two SheetRecords finds no
  TV-only record key outside the table. Commits 55014c6a (29-Sep: LineTypeScale, FillHex; no log entry) and 5665508c
  (17-Sep: Asset__Samples) confirmed with `git show`.
- Local data: `WCP/Projects` has 4 projects with a drawings block (57079__Mordaunt's holds no sheets), 4 sheets in all,
  with the layer orders in b3. RestackLegacyLayers traced: it fires once on all 4. VV's SheetSurface `LayerRank`,
  PdfExporter and Snapping rank viewports only against each other and paint markup over them, so the restack is invisible
  on the sheet and in the PDF (the Layers panel order does change).
- Import closure: every import of every TV in-scope file resolved against the VV tree after the 40->42 and 42..45->43..46
  seams (`verify_s03b/v3/import_closure.py`, output `import_closure_out.txt`). This confirmed d1 except EditScope `IsInside`
  (present in VV) and found the 53 ProjectLink gap (S03b-V02).
- Config: every `Na__LeCfg__Get*Setup` key set diffed (`verify_s03b/v3/setupkeys_cmp.py`) - F43 confirmed; four more
  readers/keys added to it.
- Port signals: the PORT NOTE of every TV in-scope file read (S03b-V03, D-S03b-11); KeyScope's PORT NOTE says VV's own
  hotkey handler needs the same leaf (S03b-V01).
- Documents: TV DEVLOG entries v2.38-v2.160 located (index lines match the citations); VV ledger L92-166, L321-342,
  L1160-1172, L1235-1246; TV realign plan TD02/TD04 and 10.3; FloorAreas plan section 7 and its ledger; numbering notes;
  VV plan D27 and D31; TV Classic scan image opened (it is a PLACEHOLDER).
- Bugs re-traced in code: margin undo (History L140 vs Sheets L351), DeleteLayer orphans (Layers L115-127), InsertShape
  fallback (Shapes L89-103; pastes masked by `Na__LeClip__LayerFor`), AtScale print vs Measurements box (MarkupBridge
  L478-487 vs DrawingScale L174-180, Measurements L358/369/422, ScrapbookCustom L437), Common seed bypass (SheetModel
  L497-507, Loader L307-311/L339, ProjectData L208-216/L446-455; one caller of SeedCommonFields).

**Corrected (inline above and in the verifier JSON).** F16 (GetBlock not a prerequisite); F24, F42, d1, (c), WP-S03b-07
(EditScope `IsInside` and SpecMargin `Push` already in VV; GetVectorQualitySetup needed); F05 (action -> needs_decision: the
leaf's PORT NOTE conditions any back-port); F08 (the RenumberSheets no-op is a VV seam - TV falls back to config numbering);
F27, F29, F31, F01 (sign-off gates); F30, F35 (ProjectLink; QrCellEnabled); F38 (VV 3D hotkey gate); F07 (record-offer
symptom); F17 (CheckBase before phase 1; VV already GETs the live file; WCP route naming); F23 (Open Sans re-measure);
F25 (implements VV's D31; more consumers); F41, F43, F47, F49 (additions); b3 table and WP-S03b-03 acceptance; the
Styles__Main action in (c).

**Added.** S03b-V01 (VV 3D hotkeys are not scope-aware; KeyScope must gate them), S03b-V02 (53 ProjectLink link-time gap),
S03b-V03 (PORT NOTE sign-off gates), S03b-V04 (whitelist of normaliser-added keys for the schema acceptance), S03b-V05
(Helvetica to Open Sans re-measurement); decision D-S03b-11; work packages WP-S03b-02R, -03R, -06R, -07R, -09R replace the
originals (same scope, corrected dependencies, hot files and acceptance).

**Coverage map (every in-scope file has an owner).** 07: SheetRecords F01-F03; NoteRegions and LeaderlessNotes F15;
SheetModel facade F06-F07; State F09; Sheets F08; Layers F10; Shapes F11; Viewports F12; TextAndDimensions, Leaders and
Groups unit F13; AreaGroups F14/F45; History F18; AutoSave F16/F46; ProjectRecord F19; Assets F20; ScaleManager F21;
DrawingScale, SheetLayout, Common, DrawOrder F22; DrawingCode (VV-only) F04-F05. 10: SheetSurface F24; SheetChrome F23;
Navigation F37; Controls__Pc and TouchScreen F38/V01; Cells and Modern F34; QrCell F35/V02; Classic F22/F36;
Styles__Main F39; Styles__Main__Paper F40; Styles__Surfaces F22. 15: MarkupBridge F26; DimensionGeometry F28;
DimensionRounding F27/V03; LeaderGeometry F29/V03; ShapeGeometry F30/V02; ShapeRings F31/V03; PaintOrder F25; markup
Groups F32; MeasureParse F33.

**Still unverified.** R2 data (no credentials) - every data statement is about the local mirror only; runtime
behaviour of F07, F26 and S03b-V01 is code-traced, not run (in particular whether VV's carousel guard already blocks
PageUp/PageDown while a drawing is open); the region-by-region CSS claims of F39/F40 beyond the tab-menu selectors, the
osnap rule counts and the stylesheet import lines; the bodies of other slices' modules (20, 25, 36, 51, 53, 54, 59, 60),
read only for their imports and exports; the test check counts (taken from the TV DEVLOG, tests not run); the est_lines
figures.

### Verifier-added findings in full

**S03b-V01 - VV's 3D hotkeys are global: the KeyScope port must gate VV's own handler (wiring, high).** TV's KeyScope
(`TVM/03__AppUtils/Na__AppUtils__KeyScope__.js` 1.1.0, TV v2.110.0 *Three Tool Sets, Three Keyboards*) exists because
the 3D model's keys answered under every tab (its header: *T on a drawing picked the Text tool AND put the hidden model
into Walk mode*); TV's 3D hotkey manager returns unless the MODEL scope is live (`TVM/10__NavigationAndCameras/Na__Hotkeys__Manager.js:84, 167`)
and the mode controller feeds the scope (`ModeController:389, 654-655, 1182`). Its PORT NOTE: *ValeVision's own hotkey
handler and its Layout Editor have the same shape, so the same leaf fits.* VV's 3D hotkeys are
`VVM/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` (initialised at `VV/Index.html:1792`): one window keydown
listener that skips only focused inputs (L53, L91-101) and binds R, B, T, Y, V, PageUp, PageDown, 1-9, Backspace and
Shift+F (`VVM/02__AppData/Na__ValeVision__HotkeysDictionary__.json`); VV's Controls__Pc also listens on window (L360),
with no stopPropagation. Code-traced, not run: letters typed on a VV drawing very likely also act on the hidden model
today (the Index.html callbacks guard only on walk-enabled / carousel-visible / not-flying), and Controls__Pc 1.3.0's
Page Up/Down would join them. Fix in WP-S03b-09R: VV's handler (or its Index.html callbacks) returns unless
`Na__KeyScope__Is(MODEL)` and uses `Na__KeyScope__IsTypingTarget`; VV keeps its own file names.

**S03b-V02 - 53 ProjectLink needs two ProjectLoader functions VV lacks (wiring, high).** TV
`LE/53__Feature__ProjectQrCode/Na__ProjectQr__ProjectLink__.js` imports `Na__AppUtils__GetProjectCodeFromUrl`,
`GetProjectFolderFromUrl` and `GetYearFromUrl` (L85-89); 53 Symbol imports ProjectLink (L80); ShapeGeometry 1.6.0+
(L123) and TitleBlock__QrCell import Symbol; Modern 1.3.0+ imports QrCell. VV's ProjectLoader exports
`GetProjectCodeFromUrl` but not the other two (export block L535-548; VV names a project by `?project=` and resolves its
folder through the master index). A missing named export stops the browser linking the editor graph, whatever
`ProjectQr__Enabled` says. The QR slice must give VV its own ProjectLink (or VV implementations of the two functions)
before WP-S03b-06R/08 link ShapeGeometry, QrCell or Modern 1.5.0; `Na__Verify__ModuleGraph__` catches it.

**S03b-V03 - Three TV PORT NOTEs make the VV port wait for Adam's sign-off (decision, medium).** DimensionRounding:
*ValeVision: not yet ported - it waits for Adam's sign-off.* ShapeRings: the same (with its stray-edge warning).
LeaderGeometry: *1.0.0 ported ... Later versions wait for their own sign-off.* SheetRecords 1.38.0+ imports
`Na__LeRings__Clean`, and ShapeGeometry 1.9.0 and SheetChrome 1.14.0 import ShapeRings, so the gate reaches WP-S03b-03
and -06. By contrast NoteRegions and LeaderlessNotes say *Nothing here is app-specific*, AreaGroups *goes with the rest
of Floor Areas* (D-S03b-04). Decision D-S03b-11.

**S03b-V04 - The schema acceptance must whitelist every key TV's normaliser adds (test, medium).** Against VV's CURRENT
normalised records, TV's SheetRecords adds: the restack (`Layer__Order`, `Sheet__LayerStack: 2`, L1438/L1482-1490),
`Viewport__ModelSourceId: null` (L954-955), `Asset__Samples: null` on every snapshot asset (L1062; 3047__Doous
Viewport_002) and `Viewport__Styles.depthFog` once `DefaultStyles.depthFog` is configured (L1019). The files on disk
are older than VV's own normaliser (3047__Doous has no `Sheet__Groups`/`Sheet__Leaders`), so compare VV-before (VV's
NormaliseSheet) with VV-after (TV's), never with the raw file. Tell Adam the Layers panel order changes once per old sheet.

**S03b-V05 - Helvetica to Open Sans moves VV's title block measurements (ui, low).** VV's SheetChrome measures and prints
in jsPDF Helvetica; the ledger records VV's row widths as re-measured in Helvetica (L121) and VV's
`Na__Test__TitleBlockCells__` fixture as Helvetica numbers (L127). TV SheetChrome 1.7.0+ measures and embeds Open Sans
through 60 PdfFonts, so WP-S03b-06R re-measures every paper size and updates the VV fixture; the SpecPdf Helvetica
divergence (ledger L1169) goes to the 50 slice.

**Re-issued work packages (verifier JSON):** WP-S03b-02R (leaves now: NoteRegions, LeaderlessNotes, PaintOrder,
MeasureParse; ShapeRings and DimensionRounding after D-S03b-11), WP-S03b-03R (corrected acceptance 2, adds D-S03b-11),
WP-S03b-06R (adds the VV ProjectLink, D-S03b-11 and the Open Sans re-measure), WP-S03b-07R (drops EditScope IsInside and
SpecMargin from prerequisites and hot files, adds GetVectorQualitySetup), WP-S03b-09R (adds VV's 3D hotkey handler,
Index.html and the 3D hotkey dictionary as hot files, and a 3D-keys acceptance).
