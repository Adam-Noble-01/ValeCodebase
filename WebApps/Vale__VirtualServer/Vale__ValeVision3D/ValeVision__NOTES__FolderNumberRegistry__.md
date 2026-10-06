# ValeVision 3D - Folder Number Registry

**Kept by:** the TrueVision parity programme's records package W0-06, then each wave's Parity Scribe (W0-99 to W6-04)
**Created:** 01-Oct-2026
**Decisions:** DR-03 registry (i) (VV plan D43), Q-REG (a) (D88), Q-63 default (D86), DR-02 (D42), DR-26 (D66) - all on their
defaults, unanswered by Adam on 01-Oct-2026 (`ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`, section 2A)

Every two-digit folder number at the top of `02__Src__AppModules/`, and the numbers inside the Layout Editor, the vendor
folder and the app root, with who may use each one. TrueVision is the numbering authority: a ValeVision folder that holds
the same system as a TrueVision folder takes TrueVision's exact `NN__Category__Name`, and a ValeVision-only folder never
takes a number TrueVision uses now or has used (K2 rulebook N1-N3). This file is how a new folder - in either app - picks
its number without colliding, and it is what the parity naming lint reads (`80__Testing__PrototypeEnvironment/
Na__Verify__ParityNaming__.mjs`, written by W0-04): a top-level module folder whose number is not registered here for
the app that uses it fails the lint.

Sources, read on 01-Oct-2026: TrueVision at commit `b2aa9151` (TrueVision3D v2.172.0, `git ls-tree`); ValeVision's working
tree after the drawing-folder renumber W0-02 (staged by `git mv`, not yet committed); ValeVision Gallery's working tree.
The rules are the audit's K2 rulebook (N1-N9) and its section 8 table, with R1 A.2.7's additions
(`ValeVision__AUDIT__TrueVisionParity__Evidence__/parity/report/`).

---

## 1. How to read it, and the rules

**Class** (exact words, one per number):

| Class | Meaning | May ValeVision use it? | May TrueVision use it? |
| --- | --- | --- | --- |
| `shared` | TrueVision names the folder and ValeVision mirrors it at the same number and name - now, or when the port that brings the folder lands. One shared number carries two engines on purpose (41, DIV-2). | Yes, with TrueVision's name | Yes (it owns the name) |
| `TV-only` | TrueVision's: a TrueVision folder ValeVision never ports (62 aside, see its row; 75, 76), or a number left free for TrueVision's growth. | No | Yes |
| `VV-reserved` | ValeVision's own systems (28, 29, 31, 60-64, 69, 71) and the ValeVision band 92-99. | Yes | No - a new TrueVision folder skips these |
| `legacy` | A ValeVision legacy tool due to retire (35, 91). Burnt once retired. | Only the folder already there | No |
| `burnt` | Used once and retired. Never reused by either app. | No | No |

**Rules** (K2 rulebook section 1, unchanged):

1. TrueVision is the numbering authority. A ValeVision folder holding a TrueVision system takes TrueVision's exact
   `NN__Category__Name`, at the top level, in Layout Editor subfolders and in nested subfolders (N1).
2. A ValeVision-only folder never takes a number TrueVision uses now or has used, TrueVision's devlog history included (N2).
3. A new ValeVision-only top-level folder takes the lowest free number in 93-99. A new TrueVision folder skips every
   `VV-reserved` and `legacy` number (N3). Legacy ValeVision tools live in the 9x band.
4. A folder's number never changes silently: a change is a dated row here, made by the package that moves the folder,
   and old paths stay as written in history documents (K2 section 13).
5. TrueVision holds the twin of this table as `TrueVision__NOTES__FolderNumberRegistry__.md` once the TrueVision-lane
   package WT-08 lands (held until Adam approves it, DR-36). Until then the rule binds ValeVision only; TrueVision itself
   reassigned its own 52 and 53 in v2.155.0 (TV devlog :1284).

**Machine reading.** Section 2.1 has exactly one row per number 01-99, each row starting `| NN |`, with these columns
in this order: number, TrueVision folder at `b2aa9151`, ValeVision folder now, ValeVision Gallery folder now, class, rule.
Folder cells hold back-quoted folder names or `-`. Section 3 has one row per Layout Editor number in use, starting
`| LE/NN |`, with the same column meaning (no ValeVision Gallery column). 00 is not a module-folder number in either app
(both app roots use 00 for archives: TrueVision `00__ArchivedVersions`, ValeVision `00__Archive`), so it has no row and a
`00__` folder under `02__Src__AppModules` is unregistered.

---

## 2. Top level: `02__Src__AppModules/`

### 2.1 Every number, 01-99

| No. | TrueVision (`b2aa9151`) | ValeVision (now) | ValeVision Gallery (now) | Class | Rule and note |
| --- | --- | --- | --- | --- | --- |
| 01 | `01__AppCore` | `01__AppCore` | `01__AppDependencies__VersionLocked` | shared | Shared: same system, same name and number in both apps. WCP's 01__AppDependencies__VersionLocked is ValeVision Gallery's own namespace (see section 2.3) |
| 02 | `02__AppData` | `02__AppData` | `02__AppCore` | shared | Shared: same system, same name and number in both apps. WCP's 02__AppCore is ValeVision Gallery's own namespace (see section 2.3) |
| 03 | `03__AppUtils` | `03__AppUtils` | `03__AppData` | shared | Shared. VV keeps VV-only utilities here (`R2SaveProjectJson`, `R2DrawingNotes` until W2-33, `ValeVision__HotkeyHandler`, `LoadingOverlay`, `ResilientLoad`); TV's `LocalProjectMirror__` lands with a VV body (W0-12, DIV-4). WCP's 03__AppData is ValeVision Gallery's own namespace (see section 2.3) |
| 04 | `04__MathUtils` | `04__MathUtils` | - | shared | Shared: same system, same name and number in both apps |
| 05 | `05__RenderPipeline` | `05__RenderPipeline` | `05__AppUtils` | shared | Shared. VV keeps its dual render engine subfolders `01__Engine__PureEngine/` and `02__Engine__MaxEngine/` (DIV-1); since W0-02 `Na__RenderEffect__2dProfileLines__.js` and `Na__RenderEffect__DistanceCulling__.js` sit here at TV's level (FR-08, FR-11). WCP's 05__AppUtils is ValeVision Gallery's own namespace (see section 2.3) |
| 06 | `06__Scene__LightingEffects` | `06__Scene__LightingEffects` | - | shared | Shared: same system, same name and number in both apps |
| 07 | `07__Scene__EnvironmentEffects` | `07__Scene__EnvironmentEffects` | - | shared | Shared: same system, same name and number in both apps |
| 08 | - | - | - | TV-only | TV growth: unowned in K2, assigned to TrueVision by Q-REG (a) (D88; R1 A.2.7); VV never takes it |
| 09 | - | - | - | TV-only | TV growth: unowned in K2, assigned to TrueVision by Q-REG (a) (D88; R1 A.2.7); VV never takes it |
| 10 | `10__NavigationAndCameras` | `10__NavigationAndCameras` | `10__Feature__ProjectGallery` | shared | Shared: same system, same name and number in both apps. WCP's 10__Feature__ProjectGallery is ValeVision Gallery's own namespace (see section 2.3) |
| 11 | `11__CameraUtils` | `11__CameraUtils` | `11__Feature__ProjectViewer` | shared | Shared: same system, same name and number in both apps. WCP's 11__Feature__ProjectViewer is ValeVision Gallery's own namespace (see section 2.3) |
| 12 | - | - | `12__Feature__ProjectEditor` | TV-only | TV growth: unowned in K2, assigned to TrueVision by Q-REG (a) (D88; R1 A.2.7); VV never takes it. WCP's 12__Feature__ProjectEditor is ValeVision Gallery's own namespace (see section 2.3) |
| 13 | - | - | `13__Feature__TimeAnalysis` | TV-only | TV growth: unowned in K2, assigned to TrueVision by Q-REG (a) (D88; R1 A.2.7); VV never takes it. WCP's 13__Feature__TimeAnalysis is ValeVision Gallery's own namespace (see section 2.3) |
| 14 | - | - | `14__Feature__Authentication` | TV-only | TV growth: unowned in K2, assigned to TrueVision by Q-REG (a) (D88; R1 A.2.7); VV never takes it. WCP's 14__Feature__Authentication is ValeVision Gallery's own namespace (see section 2.3) |
| 15 | `15__ModelLoader` | `15__ModelLoader` | `15__Feature__ShareKpiReport` | shared | Shared: same system, same name and number in both apps. WCP's 15__Feature__ShareKpiReport is ValeVision Gallery's own namespace (see section 2.3) |
| 16 | - | - | - | TV-only | TV growth: unowned in K2, assigned to TrueVision by Q-REG (a) (D88; R1 A.2.7); VV never takes it |
| 17 | - | - | - | TV-only | TV growth: unowned in K2, assigned to TrueVision by Q-REG (a) (D88; R1 A.2.7); VV never takes it |
| 18 | - | - | - | TV-only | TV growth: unowned in K2, assigned to TrueVision by Q-REG (a) (D88; R1 A.2.7); VV never takes it |
| 19 | - | - | - | TV-only | TV growth: unowned in K2, assigned to TrueVision by Q-REG (a) (D88; R1 A.2.7); VV never takes it |
| 20 | `20__System__MaterialsSystem` | `20__System__MaterialsSystem` | `20__Feature__Blockoutopedia` | shared | Shared: same system, same name and number in both apps. WCP's 20__Feature__Blockoutopedia is ValeVision Gallery's own namespace (see section 2.3) |
| 21 | `21__System__PresentationMode` | `21__System__PresentationMode` | - | shared | Shared: same system, same name and number in both apps |
| 22 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 23 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 24 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 25 | `25__System__3dObject__InteractionSystem` | `25__System__3dObject__InteractionSystem` | - | shared | Shared: same system, same name and number in both apps |
| 26 | `26__System__ToggleModelElements` | `26__System__ToggleModelElements` | - | shared | Shared: same system, same name and number in both apps |
| 27 | `27__System__ContextMenuSystem` | - | - | shared | TV folder; VV gains TV's folder with its port - partial content by design: the menu renderer only (W4-11; DR-44; R1 A.4 #12) |
| 28 | - | `28__System__GridLineSystem` | - | VV-reserved | VV-only `28__System__GridLineSystem` (3D grid lines); reserved for VV (DR-03 registry (i)) |
| 29 | - | `29__System__FogPlaneSystem` | - | VV-reserved | VV-only `29__System__FogPlaneSystem` (3D-view fog plane - not TV's 49 depth fog, which lands beside it); reserved for VV |
| 30 | `30__System__ImageExport` | `30__System__ImageExport` | - | shared | Shared: same system, same name and number in both apps |
| 31 | - | `31__System__VideoStudio` | - | VV-reserved | VV-only `31__System__VideoStudio`; reserved for VV |
| 32 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 33 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 34 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 35 | - | `35__System__PageLayoutSystem` | - | legacy | VV legacy `35__System__PageLayoutSystem` (the old Create Drawing / Layout View). Kept and reserved until W6-03 retires it (held until Adam confirms the removals, DR-03; D43), after W0-16 has copied jsPDF and Vale's Classic scan out of it; then BURNT, never reused (K2 TF-T19, FR-21). TV's copy of the same system lived at 90 |
| 36 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 37 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 38 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 39 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 40 | `40__System__DrawingViewCore` | `40__System__DrawingViewCore` | - | shared | Shared since W0-02 (01-Oct-2026): VV's DrawingViewCore moved here from 42 (FR-02); VV's legacy 2dElevationsView left 40 for 91 (FR-01) |
| 41 | `41__System__SectionCutEngine` | `41__System__CrossSectionView` | - | shared | SAME NUMBER, DIFFERENT ENGINE (DIV-2), kept on purpose: VV `41__System__CrossSectionView` (the live Cross Sections tool) against TV `41__System__SectionCutEngine`; no file in common, so neither renames (K2 N6, DR-26 / D66); TV's 41 is never ported (DR-41 / D81). See `02__Src__AppModules/41__System__CrossSectionView/README__CrossSectionView__.md` |
| 42 | `42__System__FloorPlanViews` | `42__System__FloorPlanViews` | - | shared | Shared since W0-02: VV's FloorPlanViews moved here from 43 (FR-03) |
| 43 | `43__System__PlanAnnotations` | `43__System__PlanAnnotations` | - | shared | Shared since W0-02: VV's PlanAnnotations moved here from 44 (FR-04) |
| 44 | `44__System__PlanDimensions` | `44__System__PlanDimensions` | - | shared | Shared since W0-02: VV's PlanDimensions moved here from 45 (FR-05) |
| 45 | `45__System__ElevationViews` | `45__System__ElevationViews` | - | shared | Shared since W0-02: VV's ElevationViews moved here from 46 (FR-06) |
| 46 | `46__System__NorthDirection` | `46__System__NorthDirection` | - | shared | Shared since W0-02: VV's NorthDirection moved here from 47 (FR-07), freeing 47 for TV's DrawingPlanes |
| 47 | `47__System__DrawingPlanes` | - | - | shared | TV folder; VV gains TV's folder with its port (W2-01, Drawing Planes; DR-02) |
| 48 | `48__System__CrossSectionViews` | - | - | shared | TV folder; VV gains TV's placeholder byte for byte with the Elevations Dev-menu rebuild (W2-05; DR-26) - not VV 41's twin, see 41 |
| 49 | `49__System__ElevationDepthFog` | `49__System__ElevationDepthFog` | - | shared | TV folder; VV gains TV's folder with its port (W1-09 leaves, W2-03 core; DR-15) |
| 50 | `50__System__ProjectedLinework` | `50__System__ProjectedLinework` | - | shared | Shared: same system, same name and number in both apps |
| 51 | `51__System__LayoutEditor` | `51__System__LayoutEditor` | - | shared | Shared. LE subfolder numbers are TV's (section 3); VV's one extra, `LE/01__Core__Loader`, is VV-reserved |
| 52 | `52__System__Layout__PublishedDocuments` | - | - | shared | TV folder; VV gains TV's folder with the publishing wave (W4-09, W4-17; DR-22). TV used 52 for SitePlanData until v2.155.0 (TV devlog :1284) |
| 53 | `53__Data__Layout__PublishedSchema` | - | - | shared | TV folder; VV gains TV's folder with the publishing wave (W4-01; DR-22). TV used 53 for ProjectQrCode until v2.155.0 (TV devlog :1284) |
| 54 | `54__Feature__ColourPalette` | `54__Feature__ColourPalette` | - | shared | TV folder; VV gains TV's folder (W1-37, Colour Palette; DR-20) |
| 55 | `55__Feature__SpellCheck` | - | - | shared | TV folder; VV gains TV's folder (W2-34, Spell Check; DR-20) |
| 56 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 57 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 58 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 59 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 60 | - | `60__Feature__FullScreenMode` | - | VV-reserved | VV-only `60__Feature__FullScreenMode` (twin of TV `76__System__FullscreenMode`, DR-44 keeps VV's); reserved for VV |
| 61 | - | `61__Feature__ShareProjectLink` | `61__Feature__PwaAppHelpers` | VV-reserved | VV-only `61__Feature__ShareProjectLink` (Vale client project links; not TV's document sharing LE/66, DR-43); reserved for VV. WCP's 61__Feature__PwaAppHelpers is ValeVision Gallery's own namespace (see section 2.3) |
| 62 | `62__Feature__AppInstallability` | `62__Feature__EmailWorkers` | `62__Feature__AppInstallability` | VV-reserved | VV `62__Feature__EmailWorkers` keeps 62 - a NOMINAL COLLISION, recorded: TV's and WCP's 62 is `62__Feature__AppInstallability`, which VV never ports (VV runs under WCP's PWA; K2 TF-T46). Moves to 92 only if Adam asks, after its tracked node_modules are removed (FR-22, W6-03; DR-03 default "62 unchanged"). WCP's 62 is the PWA ValeVision runs under (section 2.3) |
| 63 | - | `63__Feature__AppNotificationEmail` | - | VV-reserved | VV-only `63__Feature__AppNotificationEmail`; reserved for VV. Q-63 (D86): TV's UNMERGED branch `claude/westfarm-intro-notes-37b804` (commit `4db73420`, 22-Sep-2026; not in `b2aa9151` and not in TV HEAD on 01-Oct-2026) adds `63__System__LocalFileParity`. Nothing moves while it is unmerged. If it merges as 63 first, VV's folder moves to 93 with W6-03 (Q-63 (b)) and this row records it; recommended to Adam instead: rename the branch folder to a TV-growth number such as 65 before it merges (Q-63 (a)) |
| 64 | - | `64__Feature__BreadcrumbNav` | - | VV-reserved | VV-only `64__Feature__BreadcrumbNav`; reserved for VV |
| 65 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 66 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 67 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 68 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 69 | - | `69__System__SketchUpToValeVision__Utilities` | - | VV-reserved | VV-only `69__System__SketchUpToValeVision__Utilities`; reserved for VV |
| 70 | `70__System__DevTools` | `70__System__DevTools` | `70__System__DevTools` | shared | Shared: same system, same name and number in both apps. WCP's 70__System__DevTools is ValeVision Gallery's own namespace (see section 2.3) |
| 71 | - | `71__System__ExportRenderLayers` | - | VV-reserved | VV-only `71__System__ExportRenderLayers`; reserved for VV |
| 72 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 73 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 74 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 75 | `75__System__UserInstructionsSystem` | - | - | TV-only | TV-only, never in VV: `75__System__UserInstructionsSystem` is a 3D-tab extra outside drawing parity (DR-44) |
| 76 | `76__System__FullscreenMode` | - | - | TV-only | TV-only, never in VV: `76__System__FullscreenMode`; VV keeps its own full-screen feature at 60 (DR-44) |
| 77 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 78 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 79 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 80 | `80__CloudflareIntegration` | `80__CloudflareIntegration` (W0-12 facade, VV body) | - | shared | TV folder; VV gains TV's path with a VV body: the transport facade `Na__CloudflareIntegration__ApiClient__.js` (W0-12; DR-27, DIV-4). TV's worker folder at the app root is never copied (K2 N9) |
| 81 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 82 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 83 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 84 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 85 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 86 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 87 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 88 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 89 | - | - | - | TV-only | TV growth (K2 N3): free for TrueVision's next folders; VV never takes it |
| 90 | - | - | - | burnt | Burnt: TV's retired `90__System__PageLayoutSystem` (TrueVision3D v2.155.0, TV devlog :1287 at `b2aa9151`). Never reused by either app |
| 91 | - | `91__System__2dElevationsView` | - | legacy | VV legacy `91__System__2dElevationsView` (the Tools-menu Elevation View), moved here from 40 by W0-02 on 01-Oct-2026 (FR-01; DR-03 (a)) so TV's 40 DrawingViewCore could take 40. Retires with W6-03 (FR-25), then BURNT. 91 was never used by TV (K2 section 8 proof) |
| 92 | - | - | - | VV-reserved | VV band, reserved (empty): earmarked for `92__Feature__EmailWorkers` if Adam asks for the 62 move (FR-22, W6-03). Never used by TV (K2 section 8 proof) |
| 93 | - | - | - | VV-reserved | VV band, free: the lowest free number for the next VV-only top-level folder (K2 N3). Earmarked for `93__Feature__AppNotificationEmail` only if Q-63 (b) applies (see 63) |
| 94 | - | - | - | VV-reserved | VV band, free (future VV-only folders take the lowest free number in 93-99) |
| 95 | - | - | - | VV-reserved | VV band, free (future VV-only folders). Not to be confused with the app-root `95__SketchUpSisterTools__ToolsAndUtils/` (outside 02__Src__AppModules) |
| 96 | - | - | - | VV-reserved | VV band, free (future VV-only folders) |
| 97 | - | - | - | VV-reserved | VV band, free (future VV-only folders) |
| 98 | - | - | - | VV-reserved | VV band, free (future VV-only folders) |
| 99 | - | - | - | VV-reserved | VV band, free (future VV-only folders) |

Totals: shared 34, TV-only 44, VV-reserved 18, legacy 2, burnt 1 (99 numbers). TrueVision has 37 top-level folders at the pin, ValeVision 37 now, ValeVision Gallery 14.

### 2.2 The bands at a glance

| Band | Numbers |
| --- | --- |
| Shared now (same system, same name and number) | 01-07, 10, 11, 15, 20, 21, 25, 26, 30, 40, 42-46, 50, 51, 70; and 41 with two engines (DIV-2) |
| Shared, landing with its port | 27 (menu renderer only, W4-11), 47, 48, 49, 52, 53, 54, 55, 80 (VV facade body) |
| TrueVision folders ValeVision never ports | 75, 76; 62 (TrueVision's and ValeVision Gallery's AppInstallability - see 62) |
| TrueVision growth | 08, 09, 12-14, 16-19 (Q-REG (a)), 22-24, 32-34, 36-39, 56-59, 65-68, 72-74, 77-79, 81-89 |
| ValeVision-reserved | 28, 29, 31, 60, 61, 62 (nominal collision kept), 63, 64, 69, 71; the band 92-99 (92 earmarked, 93-99 free) |
| ValeVision legacy, burnt once retired | 35, 91 |
| Burnt | 90 |

### 2.3 ValeVision Gallery's numbers

ValeVision Gallery (`WebApps/ValeVisionGallery/02__Src__AppModules/`) is a separate Vale app with its own numbering: no
module ports between it and ValeVision or TrueVision, so its numbers do not bind either app and are listed in section
2.1 for the whole picture only. Two touch ValeVision:

- **62 `62__Feature__AppInstallability`** is the PWA ValeVision runs under: ValeVision's `index.html` loads its manifest,
  installability scripts and service-worker registrar from that folder, and the shared worker's one token is Adam's to
  bump (DR-07, D47). TrueVision's 62 has the same name and role for TrueVision. ValeVision's own 62 (EmailWorkers) is
  the recorded nominal collision.
- **61 `61__Feature__PwaAppHelpers`** shares a number, not a system, with ValeVision's 61 ShareProjectLink.

ValeVision Gallery's 12, 13 and 14 (ProjectEditor, TimeAnalysis, Authentication) sit on numbers this registry gives to
TrueVision's growth. That is not a collision - the apps' module trees are separate - but a module that ever moved
between ValeVision Gallery and ValeVision would have to take a number registered for ValeVision here.

---

## 3. Layout Editor subfolders: `02__Src__AppModules/51__System__LayoutEditor/`

TrueVision names every Layout Editor subfolder (K2 N4). The two apps aligned their subfolders on 15-Sep-2026 (ValeVision
v2.47.0, TrueVision v2.55.0); no Layout Editor folder is renumbered by this programme. ValeVision's only extra is
`LE/01__Core__Loader`. A future ValeVision-only Layout Editor subfolder would take a number in LE/91-99 (R1 A.2.7's
proposal); none exists. Numbers with no row are free for TrueVision.

| No. | TrueVision (`b2aa9151`) | ValeVision (now) | Class | Rule and note |
| --- | --- | --- | --- | --- |
| LE/01 | - | `01__Core__Loader` | VV-reserved | VV's lazy loader (Loader, LoadingScreen, Styles__Boot): a permanent VV divergence (DR-24 (a), D64). TV's own devlog reserves LE/01 for a loader (TV devlog :11718 at `b2aa9151`) |
| LE/03 | `03__Core__Config` | `03__Core__Config` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/05 | `05__Core__ModeController` | `05__Core__ModeController` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/07 | `07__Core__SheetData` | `07__Core__SheetData` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/10 | `10__Core__SheetSurface` | `10__Core__SheetSurface` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/15 | `15__Core__Markup` | `15__Core__Markup` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/20 | `20__System__Viewports` | `20__System__Viewports` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/21 | `21__System__SitePlanData` | - | shared | TV subfolder; VV gains it at TV's number: dormant site-plan client (W2-14; DR-08 (B)) |
| LE/25 | `25__System__RenderStyles` | `25__System__RenderStyles` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/26 | `26__System__DraftMode` | `26__System__DraftMode` | shared | TV subfolder; VV gains it at TV's number: Draft mode (W2-18) |
| LE/27 | `27__System__DrawingGrid` | `27__System__DrawingGrid` | shared | TV subfolder; VV gains it at TV's number: Drawing Grid (W2-18, W3-05) |
| LE/28 | `28__System__ObjectSnap` | - | shared | TV subfolder; VV gains it at TV's number: Object Snap (W2-42, W2-19); replaces VV's `30/Na__LayoutEditor__Snapping__.js` (FR-14, FR-15) |
| LE/30 | `30__System__SheetTools` | `30__System__SheetTools` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/31 | `31__System__DocumentKeys` | `31__System__DocumentKeys` | shared | TV subfolder; VV gains it at TV's number: Document keys (W1-30) |
| LE/32 | `32__System__OrthoMode` | `32__System__OrthoMode` | shared | TV subfolder; VV gains it at TV's number: Ortho mode (W2-18) |
| LE/33 | `33__System__DrawingAxes` | - | shared | TV subfolder; VV gains it at TV's number: Drawing Axes (W2-18) |
| LE/35 | `35__System__DrawingTools` | `35__System__DrawingTools` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/36 | `36__System__HatchPatternTools` | `36__System__HatchPatternTools` | shared | TV subfolder; VV gains it at TV's number: Hatch pattern tools (W1-17, W2-29) |
| LE/37 | `37__System__VectorTools` | `37__System__VectorTools` | shared | TV subfolder; VV gains it at TV's number: Vector tools (W2-27, W2-28, W2-41, W3-07) |
| LE/40 | `40__Ui__Panels` | `40__Ui__Panels` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/50 | `50__Feature__Specification` | `50__Feature__Specification` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/51 | `51__Feature__DrawingRegister` | `51__Feature__DrawingRegister` | shared | TV subfolder; VV gains it at TV's number: Drawing Register (W4-18, W4-10) |
| LE/52 | `52__Feature__StatementWriter` | - | shared | TV subfolder; VV gains it at TV's number: Statement Writer, switched off (W4-04..W4-16; DR-10) |
| LE/53 | `53__Feature__ProjectQrCode` | `53__Feature__ProjectQrCode` | shared | TV subfolder; VV gains it at TV's number: Project QR, switched off (W1-15; DR-12) |
| LE/54 | `54__Feature__SheetImages` | `54__Feature__SheetImages` | shared | TV subfolder; VV gains it at TV's number: Sheet Images (W1-16, W3-02, W3-18, W3-09) |
| LE/55 | `55__Feature__Scrapbook` | `55__Feature__Scrapbook` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/56 | `56__Feature__ScrapbookCustom` | `56__Feature__ScrapbookCustom` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/57 | `57__Feature__ScrapbookParametric` | `57__Feature__ScrapbookParametric` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/58 | `58__Feature__ScrapbookSpecification` | - | shared | TV subfolder; VV gains it at TV's number: Specification Scrapbook (W2-35) |
| LE/59 | `59__Feature__FloorAreas` | `59__Feature__FloorAreas` | shared | TV subfolder; VV gains it at TV's number: Floor Areas (W1-27, W3-10) |
| LE/60 | `60__Feature__PdfExport` | `60__Feature__PdfExport` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/65 | `65__Feature__DocumentPublishing` | - | shared | TV subfolder; VV gains it at TV's number: Document publishing (W4-03, W4-07) |
| LE/66 | `66__Feature__DocumentSharing` | - | shared | TV subfolder; VV gains it at TV's number: Document sharing (W4-07, W4-08) |
| LE/70 | `70__DevTools__DevMenu` | `70__DevTools__DevMenu` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |
| LE/80 | `80__Feature__WebViewer` | `80__Feature__WebViewer` | shared | Same name and number in both apps (aligned 15-Sep-2026: VV v2.47.0, TV v2.55.0) |

TrueVision has 34 Layout Editor subfolders at the pin; ValeVision has 18 now (17 shared, 1 VV-reserved), and gains the
17 TrueVision-only ones at TrueVision's numbers as their ports land.

---

## 4. Other numbered folders

| Where | Shared (TrueVision numbers, ValeVision mirrors) | TrueVision-only | ValeVision-only | Note |
| --- | --- | --- | --- | --- |
| Vendors `04__Lib__ThirdParty__VersionLocked/NN__Vendor__*` | 01 ThreeJs v0.184.0, 02 ThreeMeshBvh v0.9.9, 03 Clipper2Js v0.9.0, 04 ThreeEdgeProjection v0.0.10 (byte-identical in both apps, DIV-5 closed); 05 JsPdf v4.1.0 and 06 Html2Canvas v1.4.1 land in ValeVision with W0-16 (K2 TF-R05, TF-R06) | - | 07 PdfJs v3.11.174 (VV-first, W0-16; offering it to TrueVision is one of DR-42's back-ports, none of which happens on the default) | Index files keep each app's prefix: `Vale__Dependencies__*` / `TrueVision__Dependencies__*` (K2 N8) |
| Asset subfolders `01__AppAssets__<App>/NN__AppAssets__*` | 05 SkyDomes; 06 TitleBlocks (ValeVision gains it with W0-16, holding Vale's own Classic scan, never TrueVision's) | - | the unnumbered `MeasureToolIcons` | Each app's asset root carries its own token (K2 N7, N8) |
| App root | 01 (token swapped), 02, 03, 04, 50 (token swapped: `50__ValeVision__UserConfig/`, W0-18), 51 `51__LayoutEditor__UserScrapbookContent/`, 52 `52__LayoutEditor__HatchPatternLibrary/` (W1-17), 60 `60__DistributionEmails/`, 79 `79__Testing__GenerateObjects/`, 80 `80__Testing__PrototypeEnvironment/` | the second 80, `80__CloudflareIntegration/` (TrueVision's worker; ValeVision's worker stays in `WebApps/ValeVisionGallery/CloudflareWorker`, K2 N9); 90 `90__rubyScript__SketchUpSisterTools__ToolsAndUtils/` | `04__Lib__ThirdParty__Three/` (legacy, retires with W6-03, FR-23); 95 `95__SketchUpSisterTools__ToolsAndUtils/` | Archives at 00 in both: `00__ArchivedVersions/` (TrueVision), `00__Archive/` (ValeVision) |
| Project content beside `project.json` (R2 `VaApps/Projects/<folderId>/`, locally `WebApps/ValeVisionGallery/Projects/<yyyy>/<folder>/`) | `05__Layout__DrawingDocs__Images/`, `06__Layout__PublishedDocuments/`, `10__StatementDocs/` - TrueVision's relative names verbatim (K2 R3; DR-29 (A), D69) | - | the existing object names stay: `project.json`, `ValeVision__DrawingNotes__.json`, `LayoutEditor/Linework/`, `LayoutEditor/Snapshots/`, `PresentationMode/Thumbnails/` (K2 R2) | Nothing is written into the new folders on R2 until Adam has applied the W0-07 sync fix and deployed worker 1.6.0 (swarm rule R8) |

---

## 5. Changes

| Date | Change | By | Decision |
| --- | --- | --- | --- |
| 01-Oct-2026 | Registry created. Drawing folders renumbered to TrueVision's numbers in the working tree: 42 -> 40 DrawingViewCore, 43 -> 42 FloorPlanViews, 44 -> 43 PlanAnnotations, 45 -> 44 PlanDimensions, 46 -> 45 ElevationViews, 47 -> 46 NorthDirection, and the legacy 40 2dElevationsView -> 91. Numbers 08, 09, 12-14 and 16-19 registered as TrueVision growth. 63 kept VV-reserved while TrueVision's branch is unmerged | W0-02 (moves), W0-06 (registry) | DR-02 / D42, DR-03 / D43, Q-REG / D88, Q-63 / D86 |

