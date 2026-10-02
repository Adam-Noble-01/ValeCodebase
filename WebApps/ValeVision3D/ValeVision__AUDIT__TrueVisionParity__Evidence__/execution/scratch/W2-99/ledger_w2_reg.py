"""W2-99 - the Module Register rows Wave 2 changed (ValeVision3D v2.71.4).

Each of the 196 rows of a Wave-2-touched module (rows_w2.json) is rewritten from the file's own PORT NOTE as it now
stands (portnote_fields_w2.json) by one generic rule, or by an explicit entry below where the wave replayed hunks, edited
a configuration, kept a ValeVision-only module or left part of TrueVision's file for a later package. Old cells are kept
as "[was: ...]" (K2 section 13: history is not rewritten). Columns: 0 VV path, 1 TV path, 2 TV source ver, 3 TV current
ver, 4 Parity, 5 Divergences and seams, 6 Open TV versions, 7 Loaded by, 8 Transport, 9 Checked, 10 Packages,
11 Blocked by (refreshed separately for every row)."""
import re

REL = 'v2.71.4'
PIN = 'read at b2aa9151'

ASCII = {'—': '-', '–': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '→': '->',
         '×': 'x', '…': '...', ' ': ' ', '≥': '>=', '≤': '<=', '°': ' deg'}


def clean(s):
    s = ''.join(ASCII.get(ch, ch) for ch in s)
    s = s.encode('ascii', 'replace').decode('ascii').replace('?', '?')
    s = s.replace('|', '/').replace('\t', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def short(s, n):
    s = clean(s)
    if len(s) <= n:
        return s
    cut = s[:n]
    for sep in ('. ', '; '):
        k = cut.rfind(sep)
        if k > n * 0.45:
            return cut[:k + (1 if sep == '. ' else 0)].rstrip(' ;')
    k = cut.rfind(' ')
    return cut[:k].rstrip(' ,;') + ' ...'


def was(new, old):
    old = old.strip()
    if old in ('', '-') or old == new:
        return new
    return '%s [was: %s]' % (new, old)


def app(old, add):
    old = old.strip()
    return add if old in ('', '-') else '%s; %s' % (old, add)


def pk_add(cell, names):
    have = [p.strip() for p in cell.split(',') if p.strip() and p.strip() != '-']
    return ', '.join(have + [n for n in names if n not in have]) or '-'


R = lambda new: (lambda old: was(new, old))
A = lambda add: (lambda old: app(old, add))
SET = lambda new: (lambda old: new)


def src_head(sv):
    """The Source version line up to the first '(TrueVision3D ...)' group, else a short form."""
    sv = clean(sv)
    m = re.match(r'^(.*?\(TrueVision3D [^)]*\))', sv)
    if m and len(m.group(1)) <= 200:
        return m.group(1)
    return short(sv, 200)


def modver(sv):
    m = re.match(r'^\s*(\d+\.\d+\.\d+)', sv or '')
    return m.group(1) if m else None


def pks(p):
    return ', '.join(p)


def first_sentence(s):
    s = clean(s)
    k = s.find('. ')
    return s[:k] if 0 < k < 160 else s


def bullets(s):
    """A PORT NOTE Divergences block (bullets joined by the extractor) as one cell: '- A. - B.' -> 'A.; B.'"""
    s = clean(s)
    s = re.sub(r'^-\s+', '', s)
    s = re.sub(r'\s-\s(?=[A-Z(])', '; ', s)
    return s.replace('.; ', '; ')


# ---------------------------------------------------------------------------------------------------------------------
# Explicit rows: hunk replays, configurations, ValeVision-only modules, partial takes
# ---------------------------------------------------------------------------------------------------------------------
LS = '51__System__LayoutEditor/'
OVR = {
    '01__AppCore/Na__AppFlow__LoadingSequence.js': {
        4: A("W2-07 (v2.71.4): TrueVision v2.58.2's render-loop guards replayed - the engine-hold stand-down, the "
             "thrown-frame catch, the 2.5 s refinement watchdog and ArmNextFrame with the stranded-burst recovery in the "
             "tick's finally; planFrame with no timestamp; VV module 1.7.3"),
        5: A("W2-07: the engine-hold gate also asks this sequence's own hold set and remembers the frame "
             "(PendingWhilePaused; K2 E2)"),
        6: A("after W2-07: v2.58.2's remainder is in; nothing of TrueVision's 1.3.x waits for a package (the "
             "design-phase start-up stays out, DR-09 (a))"),
    },
    '02__AppData/Na__AppConfig__Main.json': {
        4: A("W2-08 (v2.71.4): RenderEffect__ProfileLines' Drawing2d keys as TrueVision v2.27.0 and v2.30.2 left them - "
             "Drawing2dEdgeWidth removed with its Drawing2dEdgeWidthMoved note, Drawing2d__Description renamed; "
             "Enabled, EdgeColor and EdgeThresholdNormal keep this app's values (S09 V05)"),
        5: A("W2-08: TrueVision's 2D outline colour 3355443 and threshold 0.2 not taken (ValeVision's look values)"),
    },
    '03__AppUtils/Na__AppUtils__R2DrawingNotes__.js': {
        4: R("VV-only; RETIRED - deleted by W2-33 (v2.71.4): no importer once the specification transport went onto "
             "the facade verbatim (W2-30); a backup is in the package's scratch (K2 FR-18)"),
        7: R('- (deleted)'),
    },
    '05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js': {
        2: R("1.13.0 (TrueVision3D v2.161.0, 28-Sep-2026; %s) - the snapshot renderer's nested LineworkModifier rules "
             "only (commit 6076ec10, unlogged) (W2-13)" % PIN),
        4: R("VV-only module, adapted - TrueVision's modifier rules replayed into it (DR-31 (3), D-S04a-08): "
             "SetLineworkBaseOverride(widthPx, modifiers) and the new export ModifierRuleFor (W2-13, v2.71.4); VV "
             "module 1.2.0"),
        5: A("W2-13: the rules ride SetLineworkBaseOverride (DIV-1), because the tiled exporter re-applies every "
             "linework width from this module; TrueVision's renderer writes the widths itself"),
    },
    '05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js': {
        3: R('1.0.3'),
    },
    '30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js': {
        2: R("- (VV-authored 1.0.0; TrueVision's 2.x was rebuilt from VV 1.2.0; its 2.1.0 read at b2aa9151 for the "
             "route's design, W2-12)"),
        4: R("diverged (a VV-authored twin: every tile through the live composer, DIV-1) - W2-03 (v2.71.4): the "
             "per-tile renderDepthFog between the composer and the section overlay (1.5.0); W2-12 (v2.71.4): "
             "TrueVision's renderFrame route, opt-in, for a sheet viewport's fog image only, with its target-route "
             "supersampler (1.6.0; D-S04a-05 (a) reverses TrueVision's back-port note on purpose)"),
        5: A("W2-12: on the route the composer and every buffer stay sized as for the picture (TrueVision drops the "
             "composer); renderDepthFog and the section overlay are skipped there"),
        6: R("none to take: a twin, not a port (W2-03, W2-12)"),
    },
    '40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js': {
        4: A("W2-03 (v2.71.4): the depth fog - RenderFrame draws Na__ElevFog__RenderOverlay between the composer and "
             "the section overlay, and GetExportOverrides gains renderDepthFog for the tiled exporter (TrueVision "
             "RenderPreset 1.1.0's call taken as a position, DIV-1); VV module 1.4.0"),
    },
    '40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js': {
        2: R("1.0.0 (TrueVision3D v2.21.0, 10-Sep-2026; %s) for the twin's 13 names; the six calls of R6 F.8 C25 "
             "mirror TrueVision's Serialize and Apply (v2.21.0) and its engine's SetModelRoot and RenderDepthInto "
             "(v2.94.0) (W2-02)" % PIN),
        4: A("W2-02 (v2.71.4): the six section calls - Serialize, Apply, GetOutlineWidthPx, SetOutlineWidthPx, "
             "SetModelRoot (a no-op while design phases are dormant, DR-09) and RenderDepthInto - over the live Cross "
             "Sections tool; 19 exports; VV module 1.3.0"),
        6: R("none for ValeVision (a VV-bodied twin); TrueVision's twin lacks the six until WT-02 (held)"),
    },
    '40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js': {
        4: A("W2-04, W2-05 (v2.71.4): comments only - the 2.x Dev menus hand in their draft guard's SaveBlock as the "
             "bake's save; module 1.0.3"),
    },
    '41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js': {
        4: A("W2-02 (v2.71.4): one additive export, Na__CrossSection__RenderDepthInto (the cap root alone into the bound "
             "depth target, nothing cleared), for the section adapter's depth pre-pass"),
    },
    '41__System__CrossSectionView/Na__UiFeature__CrossSectionView__DevControls.js': {
        4: A("W2-05 (v2.71.4): its gate ids renamed naCrossSectionToolDev*, so TrueVision's 48 placeholder keeps "
             "naCrossSectionDev* (DR-26); module 1.0.1"),
    },
    '42__System__FloorPlanViews/Na__FloorPlan__AppConfig__.json': {
        4: A("W2-04 (v2.71.4): TrueVision's 2.0.0 labels with this app's (BakeThumbnailsLabel, the Ground Floor, Styles "
             "and Exclusions labels; GroundFloorPlanLabel now '+ Ground Floor'); TrueVision's unused 1.x labels kept"),
    },
    '42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css': {
        4: A("W2-04 (v2.71.4): the Style Toggles region under the row's Advanced fold and a Ground Floor Quick Action "
             "region (D11); every TrueVision rule unchanged"),
    },
    '45__System__ElevationViews/Na__Elevation__AppConfig__.json': {
        4: A("W2-05 (v2.71.4): TrueVision's text with this app's description, SceneGroup targets (D28) and the labels "
             "whose features stay; 13 labels of the 1.x editor dropped (no reader)"),
    },
    '45__System__ElevationViews/Na__Elevation__ModeController__.js': {
        2: R("1.1.0 (TrueVision3D v2.94.0, 20-Sep-2026; %s) - its depth-fog source hook replayed onto the 1.0.0 port "
             "(W2-03)" % PIN),
        4: A("W2-03 (v2.71.4): TrueVision 1.1.0's fog-source hook replayed (DR-32 keeps this app's controller); module "
             "1.1.3"),
        6: R("none for the drawing system (1.1.0's hook taken; the rest is DR-32's seam)"),
    },
    '45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js': {
        4: A("W2-05 (v2.71.4): the two ValeVision-only setters (SetAzimuthDeg, SetSeededFrom) retired with the 1.x "
             "editor (D89); exclusion tokens trimmed on save as the floor plans' are (OC-11)"),
    },
    '45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css': {
        4: A("W2-05 (v2.71.4): verbatim again - the Compass Preset Strip left with the 1.x editor"),
    },
    '50__System__ProjectedLinework/Na__ProjectedLinework__AppConfig__.json': {
        4: R("adapted - TrueVision's config as v2.159.0 and v2.160.0 left it (the rule switches, the Storeys block, the "
             "LineworkModifiers owner keys) with this app's BuildToken '2026-10-02-tv-parity' (DR-31 (4)) and "
             "ValeVision__ owner keys (W2-06, v2.71.4)"),
        5: A("W2-06: the BuildToken forces a re-bake of every live project (DR-31 (4), Adam's checklist)"),
    },
    LS + '01__Core__Loader/Na__LayoutEditor__Loader__.js': {
        4: A("Wave 2 (v2.71.4): Styles__ObjectSnap linked straight after Main__Paper (W2-19, 1.1.5); the Draft mode, "
             "Drawing Grid and Drawing Axes sheets linked (W2-18, 1.1.6); ImportEditor binds Model Source as a "
             "seventh literal part, modelSource (W2-17, 1.1.7)"),
    },
    LS + '03__Core__Config/Na__LayoutEditor__AppConfig__.json': {
        4: A("Wave 2 (v2.71.4): LayoutEditor__Sheet__SitePlanDrawingsEnabled false and its note, a ValeVision-only gate "
             "(DR-08 (B)), and SitePlanNoData naming the project's own store folders (W2-14); 'patterns' joins "
             "LayoutEditor__Panels__AccordionSections (W2-29); TextManyNote, DimManyNote and ShapeManyNote say what "
             "the panels do (tv-defect rows, W2-36); the parity test's allow-list rows by W2-14 and W2-36 (gate item "
             "4.3)"),
    },
    LS + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js': {
        4: A("Wave 2 (v2.71.4): Clear from ObjectSnap Search (W2-19, 1.18.5); the hatch library in the ready chain and "
             "the Patterns panel registered (W2-29, 1.18.6); the specification lockstep's StartWatch, StopWatch and "
             "Mount (W2-31, 1.18.7); the left column's Document and Specification tabs and section (W2-35, 1.18.8); "
             "Model Source and the site plan composites panel at TrueVision's sites (W2-16, 1.18.9)"),
        6: A("after Wave 2: W3-05, W3-07, W3-09, W3-10, W3-11, W4-09, W4-10 and W4-13 still carry feature hunks"),
    },
    LS + '10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css': {
        4: A("Wave 2 (v2.71.4), each at TrueVision's position and verbatim: the hover tooltip and menu flyout rules "
             "(W2-20); the snap-marker rules out to Styles__ObjectSnap, with TrueVision's region title and note "
             "(W2-19); the grip-state, band and box rules (W2-24); the VIEWPORT CARRY region, inert (W2-25)"),
        5: R("the header block only, and TrueVision's re-worded text-editor--multiline comment not yet taken"),
        6: R("that one comment (TrueVision :398-399) - W5-02's stylesheet convergence"),
    },
    LS + '20__System__Viewports/Na__LayoutEditor__ViewportIdentity__Config__.json': {
        4: R("verbatim - byte-identical to TrueVision's at b2aa9151 (W2-10, v2.71.4): the Phase block (v2.80.0, dormant "
             "under DR-09 (a)) and Words__GenericPlan (v2.87.0)"),
    },
    LS + '25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__Config__.json': {
        4: R("verbatim - byte-identical to TrueVision's Meta 1.2.0 (W2-16, v2.71.4): the accents and Weight__Max 10.00 "
             "of commit 55014c6a"),
    },
    LS + '25__System__RenderStyles/Na__LayoutEditor__ModelLayers__Config__.json': {
        4: R("adapted (a merge) - TrueVision's Meta 1.2.0 linework-modifiers group (rows 76-79 as ValeVision__"
             "LineworkModifier__*) and Fallback__StoreyElementPrefix as ValeVision__MainBuildingModel__, over this "
             "app's own keys and coarse Existing and Proposed rows (W2-13, v2.71.4)"),
    },
    LS + '25__System__RenderStyles/Na__LayoutEditor__RenderComposites__Config__.json': {
        4: R("adapted - every layer row and Meta value TrueVision's Meta 1.4.0 (the percent Enhance Whitecard row, "
             "Meta__EnhanceStrength, the depthFog row and Meta__DepthFog; W2-09, W2-12, v2.71.4); this app's "
             "Meta__WhyWeightsHere, Meta__BaseImageWeight and Meta__PortedFrom kept"),
    },
    LS + '25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js': {
        2: R("1.13.0 (TrueVision3D v2.161.0, 28-Sep-2026; %s) - every hunk from 1.6.0 to 1.13.0 replayed (W2-15)" % PIN),
        4: A("W2-15 (v2.71.4): TrueVision's 1.6.0-1.13.0 hunks under DIV-1 - design phases (dormant), plan door poses "
             "and storeys, the fog image through W2-12's route, Enhance strength, the modifier rules through "
             "LineworkSettings, the section calls through the adapter; Context Layer off hides a tag-split existing "
             "building whole; VV module 1.8.0"),
        5: A("W2-15: Na__LeSnap__ContextKeys reproduces TrueVision's token semantics over ModelToggle's exact-key "
             "setter; CONTEXT_CATEGORIES keep SceneEntourageSilhouette (WT-04); the header line 'TrueVision has no "
             "per-scene lighting' (:135) is stale and no later package owns it (WP-S04a-12; W6-01)"),
        6: R("none (every TrueVision hunk to 1.13.0 is in, W2-15)"),
    },
    LS + '30__System__SheetTools/Na__LayoutEditor__AxisLock__.js': {
        4: A("W2-25 (v2.71.4): header only - TrueVision's INTEGRATION lines naming ViewportSnapMove; code unchanged"),
    },
    LS + '30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js': {
        4: A("W2-19 (v2.71.4): Toggle and IsEnabled from the object snap controller (TrueVision's line); module 1.2.1"),
    },
    LS + '30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js': {
        4: A("W2-19 (v2.71.4): Toggle from the object snap controller (TrueVision's line); module 1.3.1"),
    },
    LS + '30__System__SheetTools/Na__LayoutEditor__Snapping__.js': {
        4: A("W2-19 (v2.71.4): rewritten as the shim - it imports only ObjectSnap Search and State; SetEnabled and "
             "Toggle dropped with their three importers repointed; module 2.0.0"),
    },
    LS + '40__Ui__Panels/Na__LayoutEditor__Panel__Layers__.js': {
        2: R("1.3.0 (TrueVision3D v2.154.0, 23-Sep-2026; %s) - the 1.1.1 labels and the Off half of 1.3.0 (W2-36)" % PIN),
        4: A("W2-36 (v2.71.4): the 'area' and 'image' labels (1.1.1) and one red for Off and Unlock (1.3.0's Off half); "
             "VV module 1.1.2"),
        6: R("1.2.0 and 1.3.0's Ref half (the reference layers' switch) - W3-13"),
    },
    LS + '40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js': {
        2: R("1.9.0 (TrueVision3D v2.126.0, 21-Sep-2026; %s) - the 1.8.1 and 1.8.2 hunks (W2-36)" % PIN),
        4: A("W2-36 (v2.71.4): Edges off with several selected no longer recolours fills (1.8.1), pictures left out "
             "(1.8.2); VV module 1.8.2"),
        6: R("Draw at scale (1.6.0), the hatch block (v2.90.0) and 1.9.0's pattern rows - W3-12"),
    },
    LS + '40__Ui__Panels/Na__LayoutEditor__Toolbar__.js': {
        4: A("W2-19 (v2.71.4): Snap a plain toggle over the object snap controller (CHANGED_EVENT, IsEnabled, Toggle); "
             "the split button and its menu wait for W5-01; module 1.9.5"),
        5: R("Snap a plain toggle over the controller, with this app's words (the split button and menu are W5-01's); "
             "this app's Select and Move hover texts (DR-40 item 7); TrueVision's controls for features not yet here "
             "are absent"),
    },
    LS + '50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js': {
        4: R("adapted - TrueVision 1.3.0 less 1.1.0's IsMoveAuto term, held for W3-03 (DR-40 item 7) (W2-32, v2.71.4)"),
        6: R("1.1.0's IsMoveAuto line only - W3-03 restores it"),
    },
    LS + '50__Feature__Specification/Na__LayoutEditor__SpecEditor__Bar__.js': {
        2: R("1.3.0 (TrueVision3D v2.163.0, 29-Sep-2026; %s) - taken whole less 1.4.0's Share button (W2-31)" % PIN),
        4: R("adapted - TrueVision 1.3.0 whole (disk-first status, file hover, the out-of-step alert) with the "
             "document-code seam (OC-09, DR-11) (W2-31, v2.71.4)"),
        6: R("1.4.0 (v2.166.0, Share in Read) - W4-08, which re-applies the document-code seam"),
    },
    LS + '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css': {
        2: R("no version of its own - the sheet as TrueVision3D v2.163.0 left it (29-Sep-2026; %s) - taken whole "
             "(W2-31)" % PIN),
        4: R("adapted - TrueVision's sheet whole with The Lockstep Question region; the dead .na-le-tabs__tab--spec "
             "rule stays out (W1-34's seam) (W2-31, v2.71.4)"),
        6: R("none (taken whole at b2aa9151)"),
    },
    LS + '57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Config__.json': {
        4: A("W2-37 (v2.71.4): TrueVision's Meta 1.8.0 numbering with the engine's 1.4.0-1.7.0 keys (the bar to the "
             "right, the underline past the words, the base point); the CabinetInfill, ProjectQr, AreaSchedule and "
             "SiteLegend blocks and tiles wait for W3-14 (gate item 4.1: three tests red until then)"),
    },
    LS + '57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js': {
        6: R("1.5.0 (v2.123.0) and 1.5.1 (v2.138.0) - W3-13"),
    },
    LS + '70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js': {
        4: A("W2-17 (v2.71.4): TrueVision 1.2.0's live-phase bake filter through the loaded editor's modelSource; the "
             "PORT NOTE refreshed to the VV-authored form; module 1.4.2"),
        6: R("none to take: TrueVision's 1.2.0 behaviour is in; its direct editor imports stay out (DR-24 (a))"),
    },
}

# Configurations and a README that landed at TrueVision's paths (3.5): no PORT NOTE of their own.
LANDED_CFG = {
    '47__System__DrawingPlanes/Na__DrawingPlanes__AppConfig__.json':
        ('W2-40', 'v2.82.0', "verbatim - byte for byte (the bounds tokens are TrueVision's and already match "
                             "ValeVision's models)"),
    LS + '26__System__DraftMode/Na__LayoutEditor__DraftMode__Config__.json':
        ('W2-18', 'v2.111.0', "adapted - one Meta__Research value reworded for ValeVision; every key TrueVision's"),
    LS + '27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__Config__.json':
        ('W2-18', 'v2.114.0', "verbatim - byte for byte (DR-40 item 5: TrueVision's grid defaults)"),
    LS + '28__System__ObjectSnap/Na__LayoutEditor__MoveAnchor__Config__.json':
        ('W2-25', 'v2.149.0', "verbatim - byte for byte; inert with its module"),
    LS + '28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Config__.json':
        ('W2-42', 'v2.129.0', "verbatim - byte for byte"),
    LS + '32__System__OrthoMode/Na__LayoutEditor__OrthoMode__Config__.json':
        ('W2-18', 'v2.113.0', "verbatim - byte for byte; inert with its controller"),
    LS + '33__System__DrawingAxes/Na__LayoutEditor__DrawingAxes__Config__.json':
        ('W2-18', 'v2.131.0', "verbatim - byte for byte; inert with its controller"),
    LS + '37__System__VectorTools/Na__LayoutEditor__VectorTools__Config__.json':
        ('W2-27', 'v2.150.0', "verbatim, with one added Meta__PortedFrom line (the JSON form of a PORT NOTE)"),
    LS + '58__Feature__ScrapbookSpecification/Na__LayoutEditor__ScrapbookSpecification__Config__.json':
        ('W2-35', 'v2.144.0', "adapted - Meta__Data and Meta__Editing name this app's files; Meta__PortedFrom added; "
                              "every key, number and label TrueVision's"),
    '55__Feature__SpellCheck/Na__SpellCheck__Config__.json':
        ('W2-34', 'v2.144.0', "adapted - the Vale dictionary file and route, the descriptions and eight labels; "
                              "Meta__PortedFrom added; every other key TrueVision's"),
    '55__Feature__SpellCheck/README__SpellCheck__.md':
        ('W2-34', 'v2.144.0', "adapted - this app's name, dictionary, server and blueprint; a provenance paragraph in "
                              "place of TrueVision's closing line"),
}
for _rel, (_pk, _tvrel, _par) in LANDED_CFG.items():
    OVR[_rel] = {
        2: R("TrueVision's file at b2aa9151 (TrueVision3D %s) - taken whole (%s)" % (_tvrel, _pk)),
        4: R("%s - landed %s, %s" % (_par, _pk, REL)),
        6: R('none (taken whole at b2aa9151)'),
    }
    if _rel.endswith('.md'):
        OVR[_rel][7] = R('- (a README; nothing loads it)')

HUNKLIKE = re.compile(r'hunk|not yet whole|moved code|shim|less one|^new\b', re.I)


def generic(x, loaded_by):
    """The spec for a row whose file Wave 2 took whole (or landed new) at TrueVision's path."""
    f, pk = x['f'], x['pk']
    cells = x['cells']
    sv = f.get('Source version', '')
    par = f.get('Parity', '')
    div = f.get('Divergences', '')
    mv = modver(sv)
    spec = {}
    if sv:
        spec[2] = R('%s - taken whole (%s)' % (src_head(sv), pks(pk)))
    tvcur = cells[3].strip()
    if x['landed']:
        spec[0] = SET('`%s`' % x['rel'])
        spec[1] = SET('same path')
        spec[4] = R('%s - landed %s, %s' % (short(first_sentence(par), 150), pks(pk), REL))
        spec[5] = A('%s: %s' % (pks(pk), short(bullets(div), 220) if div else 'banner and PORT NOTE only'))
    else:
        what = 'TrueVision %s taken whole' % mv if mv else 'taken whole'
        spec[4] = R('%s - %s (%s, %s)' % (short(first_sentence(par), 150), what, pks(pk), REL))
        if div:
            spec[5] = R(short(bullets(div), 240))
    if mv and tvcur not in ('', '-') and tvcur != mv:
        spec[6] = R('%s at b2aa9151 is newer than the %s taken - see the file\'s PORT NOTE' % (tvcur, mv))
    else:
        spec[6] = R('none (TV %s taken whole at b2aa9151)' % mv if mv else 'none (taken whole at b2aa9151)')
    return spec


def spec_for(x, loaded_by):
    """The column functions for one row; loaded_by is the importer cell for the module ('-' when nothing imports it)."""
    rel = x['rel']
    if rel in OVR:
        spec = dict(OVR[rel])
        if x['landed']:
            spec.setdefault(0, SET('`%s`' % rel))
            spec.setdefault(1, SET('same path'))
    else:
        par = x['f'].get('Parity', '')
        if HUNKLIKE.search(par) or not x['f'].get('Source version'):
            raise SystemExit('no explicit entry for a row the generic rule does not fit: %s (%s)' % (rel, par[:60]))
        spec = generic(x, loaded_by)
    if 7 not in spec:
        if loaded_by == '-':
            spec[7] = R('- (nothing imports it yet)')
        else:
            spec[7] = R(loaded_by)
    spec[10] = lambda old, pk=x['pk']: pk_add(old, pk)
    return spec
