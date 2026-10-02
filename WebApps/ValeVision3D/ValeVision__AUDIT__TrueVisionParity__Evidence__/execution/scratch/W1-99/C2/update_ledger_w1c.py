"""W1-99 Parity Scribe (Wave 1 continuation) - the continuation's pass over ValeVision__PARITY__TrueVisionLedger__.md
(ValeVision3D v2.71.3).

Appends within the structure W0-06 established (and W0-99 and part 1 of W1-99 filled); never touches the Archive
(section 9) or rewrites a history row - a correction is a dated note beside it:
  1.4  the continuation's service-worker line
  2.1  a dated note (folder 54 created)                          2.3  a dated note (LE/59 created)
  3    a dated note on the refreshed "Blocked by"; the rows the continuation changed (new state, old kept as
       [was: ...]); the TrueVision-only rows that landed now name their ValeVision path; eleven landed modules that
       nothing imported now name their importer; "Blocked by" refreshed from the end-of-continuation port-order map;
       dated notes on 3.8 (the "Not run" row; the SheetChrome / LeaderGeometry records item); new 3.9
  4    a dated intro bullet and count line; class flips (6 PORTED, 16 PARTIAL); dated notes on every row it carried
  5.1  a dated note          6  a dated note on the dimension-split row; the continuation's offers
  7    dated notes on two of part 1's rows; the TrueVision-side items the continuation queues for WT-08
  8.1  a dated note
Pure CRLF and ASCII, as the file is. The Archive (from '## 9.' to the end) and the preamble are proven byte-identical.

Usage: python -B update_ledger_w1c.py --build | --apply | --restore
"""
import collections, hashlib, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'W0-99'))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
import ledger_lib as L                                   # noqa: E402  (W0-99's read-only helpers)
import blocked_by_w1c as BB                              # noqa: E402
import importers as IMP                                  # noqa: E402  (part 1's "Loaded by" helper)

CAND = os.path.join(HERE, 'ledger__candidate.md')
PRE = os.path.join(HERE, 'preimage_records', 'ValeVision__PARITY__TrueVisionLedger__.md')
EXPECT = 'dbf77e3a611f5b519e411cffc4e5c48c3d160c03'     # W1-99 part 1's final SHA-1 (its Port Record)
REL = 'v2.71.3'
ARCHIVE_HEAD = '## 9. Archive - the ledger as it stood before 01-Oct-2026'
PIN = 'read at b2aa9151'


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def was(new, old):
    old = old.strip()
    if old in ('', '-') or old == new:
        return new
    return '%s [was: %s]' % (new, old)


def app(old, add):
    old = old.strip()
    return add if old in ('', '-') else '%s; %s' % (old, add)


def note(text):
    return '**[02-Oct-2026 note (W1-99, %s): %s]**' % (REL, text)


def sub(old_text, new_text):
    def fn(cell):
        if cell.count(old_text) != 1:
            raise SystemExit('sub anchor found %d times: %r in %r' % (cell.count(old_text), old_text, cell[:120]))
        return cell.replace(old_text, new_text)
    return fn


def pk_add(*names):
    def fn(cell):
        have = [p.strip() for p in cell.split(',') if p.strip() and p.strip() != '-']
        return ', '.join(have + [n for n in names if n not in have])
    return fn


R = lambda new: (lambda old: was(new, old))
A = lambda add: (lambda old: app(old, add))
SET = lambda new: (lambda old: new)
LOADED = lambda rel: (lambda old: was(IMP.loaded_by(rel), old))


def SRC(text):
    return R(text)


def whole(ver, tvrel, date, pkg, extra=''):
    return R('%s (TrueVision3D %s, %s; %s)%s - taken whole (%s)' % (ver, tvrel, date, PIN, extra, pkg))


def landed(rel, src, parity, seams, nothing_yet=None, transport=None, loaded=None, open_tv=None):
    """A TrueVision-only row (3.5) whose file the continuation landed at TrueVision's path."""
    spec = {
        0: SET('`%s`' % rel),
        1: SET('same path'),
        2: R(src),
        4: R(parity),
        5: A(seams),
        6: R(open_tv or 'none (taken whole at b2aa9151)'),
    }
    if loaded:
        spec[7] = R(loaded)
    else:
        lb = IMP.loaded_by(rel)
        if lb == '-':
            spec[7] = R('- (nothing imports it yet%s)' % (('; ' + nothing_yet) if nothing_yet else ''))
        else:
            spec[7] = R(lb + ((' - ' + nothing_yet) if nothing_yet else ''))
    if transport:
        spec[8] = R(transport)
    return spec


LE = '51__System__LayoutEditor/'
SD = LE + '07__Core__SheetData/'
SS = LE + '10__Core__SheetSurface/'
MK = LE + '15__Core__Markup/'
FA = LE + '59__Feature__FloorAreas/'
CP = '54__Feature__ColourPalette/'
NONE_WHOLE = lambda v: R('none (TV %s taken whole at b2aa9151)' % v)

FLIPS = {
    # ---------------- W1-07 ----------------
    SD + 'Na__LayoutEditor__AutoSave__.js': {
        2: whole('1.5.0', 'v2.146.0', '22-Sep-2026', 'W1-07',
                 ', with the register hooks its log does not record (git b6baf301, 32767407)'),
        4: R("adapted - TrueVision 1.5.0 taken whole, W0-08's unsaved-work flag re-applied (W1-07, v2.71.3): the "
             "late-start key (1.4.0), the base in every draft and the three-button draft question (1.5.0)"),
        5: R("banner and console prefix; the flag published as window.Na__Pwa__HasUnsavedWork with the DESCRIPTION's "
             "close-guard sentence and the 500 ms registrar comment (K2 K4; its reader is the staged W0-08 registrar, "
             "not deployed); Suspend, Resume and DiscardSavedDraft inert until the Drawing Register (W4-18)"),
        6: NONE_WHOLE('1.5.0'),
        7: LOADED(SD + 'Na__LayoutEditor__AutoSave__.js'),
    },
    # ---------------- W1-19 ----------------
    SD + 'Na__LayoutEditor__SheetRecords__.js': {
        2: whole('1.39.0', 'v2.152.0', '23-Sep-2026', 'W1-19',
                 ', with Asset__Samples (v2.58.2, git 5665508c) and the edge fields of git 55014c6a its log does not '
                 'record'),
        4: R("adapted - authored in ValeVision first, ported back whole from TrueVision 1.39.0 (W1-19, v2.71.3): every "
             "record field of v2.32.0-v2.152.0 kept; an old sheet's layers restacked once; the register-series "
             "DrawingNumber default, Phase, DocumentId and ComposeDocumentId"),
        5: R("the site plan category prefix ValeVision__SitePlan__ (DR-08 (B)); DocumentId's {project} from "
             "Na__DrawData__GetDocumentCode (DR-11, W1-12); ShortCode and StripSheetCode through the DrawingCode leaf "
             "(DR-24); Na__LeRec__SheetShortCode kept as a ValeVision-only export, with no importer since W1-21 (its "
             "removal is W6-01's)"),
        6: NONE_WHOLE('1.39.0'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetRecords__.js'),
    },
    SD + 'Na__LayoutEditor__DrawingCode__.js': {
        4: A("W1-19 (v2.71.3): its header brought to K2 H5 (Source version 1.21.0, TrueVision3D v2.70.0); StoredNumber's "
             "note names the register series; module 1.0.1, no code line changed. Its StoredNumber has no reader in the "
             "loader since W1-21 (W6-01 tidies the note)"),
        7: LOADED(SD + 'Na__LayoutEditor__DrawingCode__.js'),
        10: pk_add('W1-19'),
    },
    # ---------------- W1-20 ----------------
    SD + 'Na__LayoutEditor__SheetModel__State__.js': {
        2: whole('1.2.0', 'v2.136.0', '21-Sep-2026', 'W1-20'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.2.0 (W1-20, v2.71.3): "
             "Revision and the drawing type constants (dormant with site plans, DR-08 (B))"),
        5: R('banner, PORT NOTE and the console prefix only'),
        6: NONE_WHOLE('1.2.0'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__State__.js'),
    },
    SD + 'Na__LayoutEditor__SheetModel__Layers__.js': {
        2: whole('1.4.0', 'v2.127.0', '21-Sep-2026', 'W1-20'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.4.0 (W1-20, v2.71.3): "
             "DeleteLayer re-homes its vectors (the ValeVision bug), a layer made for a shape goes over the drawings, "
             "reference layers, MoveToLayer, layers by name, silent writes"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.4.0'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__Layers__.js'),
    },
    SD + 'Na__LayoutEditor__SheetModel__Shapes__.js': {
        2: whole('1.6.0', 'v2.150.0', '22-Sep-2026', 'W1-20',
                 ', with the v2.90.0 hatch its log does not record (git 62dade1c)'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.6.0 (W1-20, v2.71.3): qr, "
             "area, image, curve, holes and hatch shapes; InsertShape writes the layer it falls back to; afterId; "
             "AnnounceShapes"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.6.0'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__Shapes__.js'),
    },
    SD + 'Na__LayoutEditor__SheetModel__Viewports__.js': {
        2: whole('1.4.0', 'v2.142.0', '22-Sep-2026', 'W1-20',
                 ', with the site plan patch keys its log does not record (git bef15277; v2.89.0)'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.4.0 (W1-20, v2.71.3): site "
             "plan viewports (dormant, DR-08 (B)), the model source, frame, doors, swings and rotation keys; "
             "DeleteViewport prunes its groups"),
        5: R('banner, PORT NOTE and the console prefix only'),
        6: NONE_WHOLE('1.4.0'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__Viewports__.js'),
    },
    SD + 'Na__LayoutEditor__SheetModel__TextAndDimensions__.js': {
        2: whole('1.2.0', 'v2.142.0', '22-Sep-2026', 'W1-20',
                 ', with the v2.152.0 linePt and dash its log does not record (git b24f33a9)'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.2.0 (W1-20, v2.71.3): "
             "atScale, extension lines, roundUp, linePt and dash on create and update; DeleteDimension prunes its "
             "groups"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.2.0'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__TextAndDimensions__.js'),
    },
    SD + 'Na__LayoutEditor__SheetModel__Leaders__.js': {
        2: whole('1.2.0', 'v2.142.0', '22-Sep-2026', 'W1-20'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.2.0 (W1-20, v2.71.3): "
             "DeleteLeader prunes its groups"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.2.0'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__Leaders__.js'),
    },
    SD + 'Na__LayoutEditor__SheetModel__Groups__.js': {
        2: whole('1.3.0', 'v2.142.0', '22-Sep-2026', 'W1-20'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.3.0 (W1-20, v2.71.3): "
             "PruneGroups keeps viewport, leader and dimension members (with SheetRecords' GROUP_KINDS, W1-19); "
             "AddGroupMember"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.3.0'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__Groups__.js'),
    },
    SD + 'Na__LayoutEditor__SheetModel__AreaGroups__.js': landed(
        SD + 'Na__LayoutEditor__SheetModel__AreaGroups__.js',
        '1.0.0 (TrueVision3D v2.104.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-20)',
        'verbatim - landed W1-20, v2.71.3; linked through the facade 1.35.1 (W1-21); no caller until Floor Areas '
        '(W3-10, DR-14 (A))', 'W1-20: banner and PORT NOTE only'),
    SD + 'Na__LayoutEditor__SheetModel__DrawOrder__.js': {
        2: R('1.0.0 (TrueVision3D v2.55.0, 15-Sep-2026; read at b2aa9151) - header taken (W1-20)'),
        4: R("verbatim - authored in ValeVision first (its v2.47.0 split); TrueVision's header taken whole (W1-20, "
             "v2.71.3), the code already identical"),
        6: R('none (TV 1.0.0 at b2aa9151)'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__DrawOrder__.js'),
    },
    SD + 'Na__LayoutEditor__SheetModel__Common__.js': {
        2: R('1.0.0 (TrueVision3D v2.74.0, 19-Sep-2026; read at b2aa9151) - header taken (W1-20)'),
        4: R("verbatim - TrueVision's file, its header taken whole (W1-20, v2.71.3), the code already identical; "
             "TrueVision's file has no PORT NOTE, so one is inserted"),
        6: R('none (TV 1.0.0 at b2aa9151)'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__Common__.js'),
    },
    # ---------------- W1-21 ----------------
    SD + 'Na__LayoutEditor__SheetModel__.js': {
        2: whole('1.35.1', 'v2.147.0', '22-Sep-2026', 'W1-21',
                 ', with the register hooks its log does not record (git b6baf301, 32767407)'),
        3: R('1.35.1'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.35.1 (W1-21, v2.71.3): the "
             "late start, Save's report and its toast, AnnounceRestore, every unit API re-exported (116 exports)"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.35.1'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__.js'),
    },
    SD + 'Na__LayoutEditor__SheetModel__Sheets__.js': {
        2: whole('1.4.0', 'v2.147.0', '22-Sep-2026', 'W1-21'),
        4: R("adapted - authored in ValeVision first, ported back whole from TrueVision 1.4.0 (W1-21, v2.71.3): sheets "
             "normalised once per announcement, the site plan tab groups (dormant), RenumberSheets, Phase and "
             "DocumentId, the margin patch keys and the note region functions"),
        5: R("banner; RenumberSheets writes no drawing number without a LayoutEditor__DrawingRegister block (it still "
             "numbers Sheet__Order 1..n; DR-11; one line to delete once the register lands, W4-10)"),
        6: NONE_WHOLE('1.4.0'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetModel__Sheets__.js'),
        8: R('VV facade: Na__CfApi__GetLoadedProjectData (the register-block check, W1-21)'),
    },
    SD + 'Na__LayoutEditor__History__.js': {
        2: whole('1.7.0', 'v2.104.0', '21-Sep-2026', 'W1-21'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.7.0 (W1-21, v2.71.3): "
             "'margin' and 'areas' are undo steps (DR-40 item 4); the register-updated rewrite waits for the register"),
        5: R("banner and PORT NOTE; a '- Legacy :' marker for TrueVision's log, which gives 1.3.0 twice (W0-06's "
             "renumber superseded; the repeat is queued for WT-08, section 7)"),
        6: NONE_WHOLE('1.7.0'),
        7: LOADED(SD + 'Na__LayoutEditor__History__.js'),
    },
    LE + '01__Core__Loader/Na__LayoutEditor__Loader__.js': {
        4: A("W1-21 (v2.71.3): the late start - AnnounceProjectLoad deleted, the model announces a load itself; the "
             "DRAWING_SITEPLAN CheckNames row; GetDrawingNumber, GetShortCode and GetTabLabel read TrueVision's "
             "drawing-number rule (the stored number, else the register's series), so the Drawings menu reads "
             "'D01 - Name'; module 1.1.4"),
        5: R("ValeVision-only facade: TrueVision's names answered the same before and after the editor loads; CheckNames "
             "rows for the view names (W1-33) and the site-plan rule (W1-21)"),
        10: pk_add('W1-21'),
    },
    # ---------------- W1-22 ----------------
    SS + 'Na__LayoutEditor__TitleBlock__Cells__.js': {
        2: whole('1.2.0', 'v2.109.0', '21-Sep-2026', 'W1-22'),
        4: R("verbatim - TrueVision 1.2.0 taken whole (W1-22, v2.71.3): Widen, a fifth more for the fixed cells on A2 "
             "and A1, called by Modern 1.5.0 (W1-26)"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.2.0'),
        7: LOADED(SS + 'Na__LayoutEditor__TitleBlock__Cells__.js'),
    },
    SD + 'Na__LayoutEditor__DrawingScale__.js': {
        2: R('1.0.0 (TrueVision3D v2.40.0, 14-Sep-2026; read at b2aa9151) - header taken (W1-22)'),
        4: R("verbatim - the header brought level with TrueVision's (W1-22, v2.71.3); the code was already "
             "TrueVision's (ValeVision v2.35.0)"),
        6: R('none (TV 1.0.0 at b2aa9151)'),
        7: LOADED(SD + 'Na__LayoutEditor__DrawingScale__.js'),
    },
    SD + 'Na__LayoutEditor__SheetLayout__.js': {
        2: R('1.2.0 (TrueVision3D v2.36.0, 14-Sep-2026; read at b2aa9151) - header taken (W1-22)'),
        4: R("verbatim - authored in ValeVision first; the header brought level with TrueVision's (W1-22, v2.71.3), "
             "the code already identical"),
        6: R('none (TV 1.2.0 at b2aa9151)'),
        7: LOADED(SD + 'Na__LayoutEditor__SheetLayout__.js'),
    },
    SS + 'Na__LayoutEditor__TitleBlock__Classic__.js': {
        2: R('1.0.0 (TrueVision3D v2.21.0, 10-Sep-2026; read at b2aa9151) - header taken (W1-22)'),
        4: R("verbatim - the header brought level with TrueVision's (W1-22, v2.71.3); the code was already identical"),
        5: A("its scan is Vale's own, from this app's asset root (W0-16), never TrueVision's placeholder; the A3 "
             "DrawingNumber anchor gone from the config, so one value prints in the number box (W1-22)"),
        6: R('none (TV 1.0.0 at b2aa9151)'),
        7: LOADED(SS + 'Na__LayoutEditor__TitleBlock__Classic__.js'),
    },
    LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js': {
        2: R('1.0.0 (TrueVision3D v2.63.0, 17-Sep-2026; read at b2aa9151) - header taken (W1-22)'),
        4: R("verbatim - the header brought level with TrueVision's (W1-22, v2.71.3); it takes the code from its "
             "caller, so the Document ID file name is PdfExporter's line (no package before W3-16)"),
        6: R('none (TV 1.0.0 at b2aa9151)'),
        7: LOADED(LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js'),
    },
    SS + 'Na__LayoutEditor__Styles__Surfaces__.css': {
        2: R('the sheet as TrueVision3D v2.72.0 wrote it (19-Sep-2026; read at b2aa9151; no module version) - taken '
             'whole (W1-22)'),
        4: R("verbatim - TrueVision's sheet taken whole, its header and the 'three greys' comment included (W1-22, "
             "v2.71.3)"),
        5: R("banner and PORT NOTE ('- Legacy :' for the unversioned source); loaded first in the loader's "
             "STYLESHEETS, not from the CSS index (DR-24)"),
        6: R('none (taken whole at b2aa9151)'),
    },
    LE + '03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js': {
        4: A("W1-22, W1-26 (v2.71.3): the rows, scales and style font fallbacks TrueVision's again (DocumentId, the "
             "Rev cell's prefix, 1:200, Open Sans first); the ValeVision-only logoFallbackText reader (W1-26, outside "
             "its list - gate item 4.3)"),
        5: R("Vale logo, Drawn By, PDF author and creator fallbacks; the logo's stand-in text read from "
             "LayoutEditor__TitleBlock__LogoFallbackText (fallback VALE GARDEN HOUSES; DR-43, offered under DR-42 "
             "(9)); swing key ValeVision__Linetype__DoorSwings; PDF font fallbacks on the AD04 cuts (DR-21); "
             "qrCellEnabled's fallback stays TrueVision's true (the config ships false, DR-12)"),
        10: pk_add('W1-26 (outside its list)'),
    },
    LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json': {
        4: A("W1-22, W1-25, W1-26 (v2.71.3): the title block Rows and Classic anchors TrueVision's (DocumentId "
             "'Document ID', the Rev cell's 'Revision' prefix), 1:200 in Scales (DR-17), the four Style and Pdf "
             "values Open Sans first (DR-21); the ValeVision-only LogoFallbackText (Vale's, DR-43) and the QrCellNote's "
             "moved path (W1-26, outside its list - gate item 4.3); the gate took eight stale rows off the parity "
             "test's allow-list (FIX-C1, 66 seams)"),
        5: R("66 seams: brand 18, decision 12, identity 12, NA path 3, TrueVision defect 4, ValeVision-only 6, "
             "withheld 11 (each with its owner in the test's allow-list)"),
        10: pk_add('W1-26 (outside its list)'),
    },
    # ---------------- W1-25 ----------------
    LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js': landed(
        LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js',
        '1.0.0 (TrueVision3D v2.54.0, 14-Sep-2026, commit ffbaee21; read at b2aa9151) - taken whole (W1-25)',
        'verbatim - landed W1-25, v2.71.3; live: PdfExporter and SpecPdf install the cuts, SheetChrome measures with '
        'them (W1-26)',
        "W1-25: banner, PORT NOTE and three console prefixes; the config values ValeVision's (FontBasePath = "
        "FontCdnBase = the AD04 host, DR-21 (a))",
        transport='- (fetches the three AD04 Open Sans cuts from the configured host; no storage)'),
    LE + '50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js': {
        2: sub('still 1.0.0 at HEAD b2aa9151)', 'still 1.0.0 at HEAD b2aa9151) - taken whole (W1-25, v2.71.3)'),
        4: A("W1-25 (v2.71.3): TrueVision 1.0.0 taken whole - the Open Sans cuts installed (PdfFonts) and the save "
             "awaited - with the display-name and document-code seams (OC-09)"),
        5: R("the project name from the facade accessor (W0-12); the document code from Na__DrawData__GetDocumentCode "
             "(OC-09, DR-11), so it prints 3047_SPEC; the console prefix"),
        6: NONE_WHOLE('1.0.0'),
    },
    LE + '50__Feature__Specification/Na__LayoutEditor__SpecDocument__.js': {
        4: A("W1-25 by OC-09 (v2.71.3): the pages print Na__DrawData__GetDocumentCode() (Project, Document No., the "
             "running head), not the ?project= token; module 1.0.1"),
        5: R("the document code from W1-12's accessor (DR-11); the folder id, for the name, still from the ?project= "
             "token"),
        10: R('W1-25 (OC-09)'),
    },
    LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js': {
        4: A("W1-25 (v2.71.3): 1.4.0's font lines - EnsureJsPdf awaits the Open Sans cuts and BuildDocument installs "
             "them; W1-28 (v2.71.3): 1.7.0's paint plan (Na__LePaint__Plan: each viewport with its own frame and "
             "caption, the margin and title block over the frontmost drawings, each layer's markup); VV module 1.2.4"),
        5: R("StyleBands; the file name still passes fields.DrawingNumber and the ?project= code (TrueVision names it "
             "on the Document ID, its v2.71.0; no package before W3-16 - the W1 gate's item 4.2)"),
        6: R("1.2.0 (site plans), the file name on the Document ID, 1.6.0 (fog), 1.8.0 (Sheet Images), 1.9.0 (turned "
             "viewports), 1.10.0 (regions) and the rest of 1.12.0 (W3-06, W3-09, W3-11, W3-16)"),
    },
    # ---------------- W1-26 ----------------
    SS + 'Na__LayoutEditor__SheetChrome__.js': {
        2: whole('1.14.0', 'v2.150.0', '22-Sep-2026', 'W1-26'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.14.0 (W1-26, v2.71.3): "
             "text measured and printed in the embedded Open Sans (PdfFonts), the qr and picture primitives, hatches "
             "and their colour, hidden frames, turned groups and frames, BuildViewportFrame, holed vectors"),
        5: R("banner, PORT NOTE and the console prefix; the stale 1.5.0 header over 1.8.0 code is gone (S03b-12)"),
        6: NONE_WHOLE('1.14.0'),
        7: LOADED(SS + 'Na__LayoutEditor__SheetChrome__.js'),
    },
    MK + 'Na__LayoutEditor__ShapeGeometry__.js': {
        2: whole('1.9.0', 'v2.150.0', '22-Sep-2026', 'W1-26'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.9.0 (W1-26, v2.71.3): "
             "Shape__Qr in its box (off, DR-12), a room hit across its inside, Shape__Image, holes (even-odd)"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.9.0'),
        7: LOADED(MK + 'Na__LayoutEditor__ShapeGeometry__.js'),
    },
    MK + 'Na__LayoutEditor__DimensionGeometry__.js': {
        2: whole('1.6.0', 'v2.152.0', '23-Sep-2026', 'W1-26'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.6.0 (W1-26, v2.71.3): "
             "fixed-length extension lines (1.2.0) and dashed rules (1.6.0)"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.6.0'),
        7: LOADED(MK + 'Na__LayoutEditor__DimensionGeometry__.js'),
    },
    MK + 'Na__LayoutEditor__LeaderGeometry__.js': {
        2: whole('1.3.0', 'v2.144.0', '22-Sep-2026', 'W1-26'),
        4: R("verbatim - TrueVision 1.3.0 taken whole (W1-26, v2.71.3): 1.2.0's broken-link halo (unlogged, "
             "18-Sep) and 1.3.0's note resolver, both answering nothing until the specification registers its "
             "resolvers (W2-30); the stale 1.0.0 header is gone (S03b-12)"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.3.0'),
        7: LOADED(MK + 'Na__LayoutEditor__LeaderGeometry__.js'),
    },
    SS + 'Na__LayoutEditor__TitleBlock__Modern__.js': {
        2: whole('1.5.0', 'v2.109.0', '21-Sep-2026', 'W1-26 by OC-01'),
        4: R("adapted - authored in ValeVision first, ported back whole from TrueVision 1.5.0 (W1-26 by OC-01, "
             "v2.71.3): the Rev cell's 'Revision' prefix (dropped on A4 portrait before another value is cut), a "
             "fifth more on A2 and A1, the QR cell solved first and switched off (DR-12)"),
        5: R("the logo's stand-in text from config (setup.logoFallbackText; TrueVision's NOBLE ARCHITECTURE constant "
             "not carried; DR-43, K2 V1); otherwise TrueVision's"),
        6: NONE_WHOLE('1.5.0'),
        7: LOADED(SS + 'Na__LayoutEditor__TitleBlock__Modern__.js'),
        10: R('W1-26 (OC-01)'),
    },
    SS + 'Na__LayoutEditor__TitleBlock__QrCell__.js': dict(list(landed(
        SS + 'Na__LayoutEditor__TitleBlock__QrCell__.js',
        '1.0.0 (TrueVision3D v2.81.0, 20-Sep-2026; read at b2aa9151) - taken whole (W1-26 by OC-01)',
        'verbatim - landed W1-26 by OC-01, v2.71.3; switched off by config (QrCellEnabled false, ProjectQr__Enabled '
        'false; DR-12 (A))',
        "W1-26: banner and PORT NOTE (TrueVision's own note kept as a Lineage field)").items()) +
        [(10, R('W1-26 (OC-01)'))]),
    # ---------------- W1-27 ----------------
    FA + 'Na__LayoutEditor__FloorAreas__.js': landed(
        FA + 'Na__LayoutEditor__FloorAreas__.js',
        '1.2.2 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151) - taken whole (W1-27)',
        "verbatim - landed W1-27, v2.71.3; inert (DR-14 (A)): linked through FloorAreas Paint (MarkupBridge, W1-28), "
        "nothing calls Ready until W3-10",
        'W1-27: banner, PORT NOTE and the console prefix',
        transport='- (Ready fetches its own config JSON beside it)'),
    FA + 'Na__LayoutEditor__FloorAreas__Config__.json': landed(
        FA + 'Na__LayoutEditor__FloorAreas__Config__.json',
        "meta 1.0.0 (TrueVision3D v2.104.0, 21-Sep-2026; last changed by v2.148.0 and v2.150.0's commit a2e0a836; "
        "read at b2aa9151) - byte for byte (W1-27)",
        "verbatim - landed W1-27, v2.71.3, byte-identical to TrueVision's",
        'W1-27: none (app-neutral, no NA marker)',
        loaded='named by `Na__LayoutEditor__FloorAreas__.js` (fetched on Ready only, W3-10)'),
    FA + 'Na__LayoutEditor__FloorAreas__Geometry__.js': landed(
        FA + 'Na__LayoutEditor__FloorAreas__Geometry__.js',
        '1.1.0 (TrueVision3D v2.125.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-27)',
        'verbatim - landed W1-27, v2.71.3; Na__Test__FloorAreas__ proves it (47 checks)',
        'W1-27: banner and PORT NOTE only'),
    FA + 'Na__LayoutEditor__FloorAreas__Menu__.js': landed(
        FA + 'Na__LayoutEditor__FloorAreas__Menu__.js',
        '1.1.1 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151) - taken whole (W1-27)',
        "verbatim - landed W1-27, v2.71.3; inert until the hub's context menu (W3-03)",
        'W1-27: banner and PORT NOTE only', nothing_yet="the hub's ContextMenu 1.7.0 imports it with W3-03"),
    FA + 'Na__LayoutEditor__FloorAreas__Paint__.js': landed(
        FA + 'Na__LayoutEditor__FloorAreas__Paint__.js',
        '1.1.0 (TrueVision3D v2.125.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-27)',
        'verbatim - landed W1-27, v2.71.3; MarkupBridge 1.20.0 imports it (W1-28); no room exists until W3-10',
        'W1-27: banner and PORT NOTE only'),
    FA + 'Na__LayoutEditor__FloorAreas__Tool__.js': landed(
        FA + 'Na__LayoutEditor__FloorAreas__Tool__.js',
        '1.0.0 (TrueVision3D v2.104.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-27)',
        "verbatim - landed W1-27, v2.71.3; inert: it needs RectangleTool 1.3.0 and ShapeTool 1.7.0 (W2-26, W3-07) and "
        "the hub's dispatch (W3-03); the A key stays inert",
        'W1-27: banner and PORT NOTE only',
        nothing_yet='the hub (W3-03) and the Measurements box (W2-23) import it'),
    # ---------------- W1-28 ----------------
    SS + 'Na__LayoutEditor__SheetSurface__.js': {
        2: whole('1.13.0', 'v2.142.0', '22-Sep-2026', 'W1-28'),
        4: R("verbatim (code) - authored in ValeVision first, ported back whole from TrueVision 1.13.0 (W1-28, "
             "v2.71.3): the sheet is one stack in the Layers list's order, a zoom gesture settles once, frames are "
             "carried by a translate and turn, vector quality, MarkScopedFrames, ShowPublished, GetSheetChrome"),
        5: R("banner and PORT NOTE; NoteZoomGesture's comment names TrueVision's Draft Mode plan in words, not by its "
             "TrueVision__ file name (K2 K3)"),
        6: NONE_WHOLE('1.13.0'),
        7: LOADED(SS + 'Na__LayoutEditor__SheetSurface__.js'),
    },
    MK + 'Na__LayoutEditor__MarkupBridge__.js': {
        2: whole('1.20.0', 'v2.152.0', '23-Sep-2026', 'W1-28'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.20.0 (W1-28, v2.71.3): "
             "markup painted and hit tested a layer at a time in the Layers list's order, reference layers pass "
             "clicks, DimensionBounds, the room label (FloorAreas Paint), a dimension's own line weight and style"),
        5: R("banner and PORT NOTE; a '- Legacy :' marker for TrueVision's log, which names 1.12.0 twice"),
        6: NONE_WHOLE('1.20.0'),
        7: LOADED(MK + 'Na__LayoutEditor__MarkupBridge__.js'),
    },
    MK + 'Na__LayoutEditor__Groups__.js': {
        2: whole('1.4.0', 'v2.142.0', '22-Sep-2026', 'W1-28'),
        4: R("verbatim - TrueVision 1.4.0 taken whole (W1-28, v2.71.3): leaders, dimensions and viewports group too "
             "(its KINDS are SheetRecords' GROUP_KINDS)"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.4.0'),
        7: LOADED(MK + 'Na__LayoutEditor__Groups__.js'),
    },
    SS + 'Na__LayoutEditor__Styles__Main__Paper__.css': {
        2: R('the regions "Paper and Its Layers" and "Viewport Frames" as TrueVision3D v2.142.0 left them '
             '(22-Sep-2026; read at b2aa9151) - taken (W1-28)'),
        4: R("adapted - TrueVision's two stack regions verbatim (the layer stack, the zoom hold, the per-slot fade, "
             "clear frames, the vector hold rule, the fog image) (W1-28, v2.71.3); ValeVision's misplaced fade rule "
             "removed"),
        5: R("ValeVision's own snap-marker block and its grip, rubber-band, menu and dropper rules stay until their "
             "owners take TrueVision's"),
        6: R('the other regions stay with their packages (W2-20, W2-19, W2-24, W2-25, W5-02)'),
    },
    LE + '57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js': {
        2: R('1.2.0 (TrueVision3D v2.85.0, 20-Sep-2026) with 1.2.1\'s ScaleCell (v2.106.0, 21-Sep-2026; read at '
             'b2aa9151) - one hunk (W1-28)'),
        4: R("verbatim (1.2.1's code) - TrueVision's ScaleCell hunk replayed as an unavoidable importer update of the "
             "layer stack (W1-28, v2.71.3); VV module 1.0.1"),
        6: R("21-Sep 1.2.2 (a tie to a turned viewport; W2-37's whole take)"),
        10: pk_add('W1-28 (importer update)'),
    },
    # ---------------- W1-36 ----------------
    SS + 'Na__LayoutEditor__Navigation__.js': {
        2: whole('1.3.0', 'v2.135.0', '21-Sep-2026', 'W1-36'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.3.0 (W1-36, v2.71.3): a "
             "zoom gesture settles once, the authoring ceiling 6400% (800% for a reader), TrueVision's INTEGRATION "
             "(the stale v2.124.0 comment gone, OC-08)"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.3.0'),
        7: LOADED(SS + 'Na__LayoutEditor__Navigation__.js'),
    },
    SS + 'Na__LayoutEditor__Controls__Pc__.js': {
        2: whole('1.4.0', 'v2.115.0', '21-Sep-2026', 'W1-36'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.4.0 (W1-36, v2.71.3): one "
             "wheel zoom a frame, Page Up and Page Down (STEP_SHEET_EVENT), TakeKeyboard and ControlKeepsKey"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.4.0'),
        7: LOADED(SS + 'Na__LayoutEditor__Controls__Pc__.js'),
    },
    SS + 'Na__LayoutEditor__Controls__TouchScreen__.js': {
        2: whole('1.1.0', 'v2.111.0', '21-Sep-2026', 'W1-36'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.1.0 (W1-36, v2.71.3): a "
             "pinch step is a zoom gesture step"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.1.0'),
        7: LOADED(SS + 'Na__LayoutEditor__Controls__TouchScreen__.js'),
    },
    LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js': {
        2: sub('hunks only (W1-32, W1-33, W1-34)', 'hunks only (W1-32, W1-33, W1-34, W1-36)'),
        4: A("W1-36 (v2.71.3): the drawing tabs' keyboard - RestartSheetKeys both ways into a drawing, StepSheet and "
             "its STEP_SHEET_EVENT listener (Page Up and Page Down), TakeKeyboard and ReloadKeyMap; VV module 1.18.4"),
        6: sub('(W1-36 keys and paging; W2-16', '(W2-16'),
    },
    # ---------------- W1-37 ----------------
    '43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js': {
        2: whole('1.1.0', 'v2.126.0', '21-Sep-2026', 'W1-37'),
        4: R("adapted - TrueVision 1.1.0 taken whole, the ConfigState getter seam re-applied (W1-37, v2.71.3): the "
             "dimension colour opens the Colour Palette"),
        5: R("the ConfigState getter seam (F.8 C24): Na__PlanDim__GetTextSetup from 44's ConfigState__, the other five "
             "names from Data__ (TrueVision imports all six from Data__; WT-01 would remove it)"),
        6: NONE_WHOLE('1.1.0'),
        7: LOADED('43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js'),
    },
    CP + 'Na__ColourPalette__.js': landed(
        CP + 'Na__ColourPalette__.js',
        '1.0.0 (TrueVision3D v2.126.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-37)',
        "verbatim - landed W1-37, v2.71.3; live: the 3D tab's dimension colour (W1-37) and every panel colour field "
        "(W1-38)", "W1-37: banner, the DESCRIPTION's app name and PORT NOTE"),
    CP + 'Na__ColourPalette__Manager__.js': landed(
        CP + 'Na__ColourPalette__Manager__.js',
        '1.1.0 (TrueVision3D v2.133.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-37)',
        'verbatim - landed W1-37, v2.71.3', 'W1-37: banner, console prefix and PORT NOTE',
        transport='- (GETs its own config JSON beside it)'),
    CP + 'Na__ColourPalette__Picker__.js': landed(
        CP + 'Na__ColourPalette__Picker__.js',
        '1.1.0 (TrueVision3D v2.133.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-37)',
        'verbatim - landed W1-37, v2.71.3', 'W1-37: banner and PORT NOTE'),
    CP + 'Na__ColourPalette__Config__.json': landed(
        CP + 'Na__ColourPalette__Config__.json',
        '1.1.0 (TrueVision3D v2.133.0, 21-Sep-2026; read at b2aa9151) - taken whole (W1-37)',
        "adapted - landed W1-37, v2.71.3; every group, colour, display setting and label TrueVision's",
        "W1-37: Palette__MenuName 'Vale Garden Houses Standard' (DR-20) and Meta__Description; Meta__PortedFrom "
        "records the port",
        loaded='named by `Na__ColourPalette__Manager__.js` (fetched on the first Attach)'),
    CP + 'Na__ColourPalette__Styles__.css': landed(
        CP + 'Na__ColourPalette__Styles__.css',
        'the sheet as TrueVision3D v2.133.0 left it (21-Sep-2026, commit 7ab70638; read at b2aa9151; no module '
        'version) - taken whole (W1-37)',
        'verbatim (rules) - landed W1-37, v2.71.3; imported by the CSS index after Boot (UiParity check 5)',
        "W1-37: banner and PORT NOTE ('- Legacy :')"),
    CP + 'README__ColourPalette__.md': landed(
        CP + 'README__ColourPalette__.md',
        'TrueVision3D v2.126.0 (21-Sep-2026; read at b2aa9151) - taken (W1-37)',
        'adapted - landed W1-37, v2.71.3 (README wording: every colour field in ValeVision; a provenance paragraph)',
        'W1-37: the wording and the provenance', loaded='- (documentation)'),
    # ---------------- W1-38 ----------------
    LE + '40__Ui__Panels/Na__LayoutEditor__PanelHost__.js': {
        2: whole('1.6.0', 'v2.126.0', '21-Sep-2026', 'W1-38'),
        4: R("verbatim - authored in ValeVision first, ported back whole from TrueVision 1.6.0 (W1-38, v2.71.3): "
             "LinkedPairRow and ShowLink, the tab hover text, the slider's number box, every panel colour field "
             "handed to the Colour Palette"),
        5: R('banner and PORT NOTE only'),
        6: NONE_WHOLE('1.6.0'),
        7: LOADED(LE + '40__Ui__Panels/Na__LayoutEditor__PanelHost__.js'),
    },
    LE + '40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css': {
        2: R('the sheet as TrueVision3D v2.154.0 left it (23-Sep-2026, commit b24f33a9; read at b2aa9151; no module '
             'version) - taken whole (W1-38)'),
        4: R("verbatim - TrueVision's sheet taken whole (W1-38, v2.71.3): the Linked Pair region, the slider box and "
             "its suffix, wrapping and tight Scale buttons, the inline check, the Ref button and one red for Off, "
             "Unlock and Ref; UiParity check 4 passes"),
        5: R("banner and PORT NOTE; two comments speak for TrueVision (the register's code, the project admin record)"),
        6: R('none (taken whole at b2aa9151)'),
    },
}

# Rows whose module landed inert in part 1 and that the continuation linked: "Loaded by", and a dated parity line.
LOADED_ONLY = {
    SD + 'Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js':
        'linked in v2.71.3 through SheetRecords 1.39.0 and the Sheets unit (W1-19, W1-21): the margin record keeps its '
        'leaderless groups; the margin and its panel wait for W2-32',
    SD + 'Na__LayoutEditor__SheetRecords__NoteRegions__.js':
        'linked in v2.71.3 through SheetRecords 1.39.0 and the Sheets unit (W1-19, W1-21): the margin record keeps its '
        'regions; the regions UI waits for W2-22, W2-32 and W3-11',
    MK + 'Na__LayoutEditor__DimensionRounding__.js':
        'linked in v2.71.3: MarkupBridge 1.20.0 prints a rounded-up figure with it (W1-28); the tool and the panel wait '
        'for W2-26 and W3-12',
    MK + 'Na__LayoutEditor__PaintOrder__.js':
        'live since v2.71.3: MarkupBridge, SheetSurface and the PDF paint plan paint in its order (W1-28)',
    LE + '20__System__Viewports/Na__LayoutEditor__VectorQuality__.js':
        'live since v2.71.3: SheetSurface holds the 2D drawings at Medium while a sheet is redrawn (W1-28; DR-40 item 6); '
        'the toolbar control waits for W5-01',
    LE + '20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js':
        'linked in v2.71.3 by the records, the model, the chrome, the surface, Groups and Floor Areas (W1-19, W1-20, '
        'W1-26, W1-27, W1-28); no viewport turns until W3-06',
    LE + '25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js':
        'linked in v2.71.3 by the records and the model (W1-19, W1-20), still dormant (DR-08 (B))',
    LE + '36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js':
        'linked in v2.71.3 by the records, the model and the chrome (W1-19, W1-20, W1-26): a vector carrying a hatch '
        'draws it; no tool sets one until W2-29 and W3-12',
    LE + '51__Feature__DrawingRegister/Na__LayoutEditor__Register__Numbering__.js':
        "linked in v2.71.3: the Sheets unit's RenumberSheets runs through its Plan and Apply (W1-21); no number is "
        "written without a register block",
    LE + '53__Feature__ProjectQrCode/Na__ProjectQr__Painter__.js':
        "linked in v2.71.3 by SheetChrome's qr primitive (W1-26); still switched off",
    LE + '53__Feature__ProjectQrCode/Na__ProjectQr__Symbol__.js':
        'linked in v2.71.3 through ShapeGeometry and the QR cell (W1-26); still fails closed',
    LE + '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Paint__.js':
        'linked in v2.71.3 through ShapeGeometry (W1-26); no sheet carries a picture until W3-09',
    LE + '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Painter__.js':
        "linked in v2.71.3 through SheetChrome's picture primitive (W1-26); no sheet carries a picture until W3-09",
    LE + '53__Feature__ProjectQrCode/Na__ProjectQr__Encoder__.js':
        'linked in v2.71.3 through the Symbol, ShapeGeometry and the QR cell (W1-26); still switched off',
    LE + '53__Feature__ProjectQrCode/Na__ProjectQr__ProjectLink__.js':
        'linked in v2.71.3 through the Symbol (W1-26); still switched off',
    LE + '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Geometry__.js':
        'linked in v2.71.3 through SheetRecords 1.39.0 (W1-19); no sheet carries a picture until W3-09',
    LE + '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Setup__.js':
        'linked in v2.71.3 through the Sheet Images painter (W1-26); no sheet carries a picture until W3-09',
    LE + '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Source__.js':
        'linked in v2.71.3 through the Sheet Images paint (W1-26); no sheet carries a picture until W3-09',
}
for _rel, _text in LOADED_ONLY.items():
    assert _rel not in FLIPS, _rel
    FLIPS[_rel] = {4: A(_text), 7: LOADED(_rel)}

# -----------------------------------------------------------------------------
# Release Watermark: class flips, VV release, packages added, dated notes
# -----------------------------------------------------------------------------
WM = {
    'v2.32.0': {'vv_app': "VV v2.71.3 (part: the record key and the model's modelSourceId, W1-19, W1-20)", 'pk': ['W1-19', 'W1-20'],
                'note': "v2.71.3 added Viewport__ModelSourceId to the sheet records (W1-19) and modelSourceId to CreateViewport and UpdateViewport (W1-20); every viewport gains Viewport__ModelSourceId: null on its next save. Waiting: ModelSource whole (W2-16) and SnapshotRenderer's phase lines (W2-15). No confirmation line either way in TrueVision"},
    'v2.36.0': {'pk': ['W1-21', 'W1-22'],
                'note': "History 1.7.0, taken whole in v2.71.3, carries this release's 'margin' undo step (W1-21; DR-40 item 4) - the part TrueVision's entry said waited for Adam's sign-off; SheetLayout 1.2.0's header came level (W1-22)"},
    'v2.38.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.3 (part: the record key, the model's showFrame and the chrome's hidden frame, W1-19, W1-20, W1-26)", 'pk': ['W1-20'],
                'note': "landed in v2.71.3: Viewport__ShowFrame kept by the records (W1-19), UpdateViewport's showFrame (W1-20) and SheetChrome 1.14.0, where a hidden frame takes its caption with it on screen and in the PDF (W1-26). Waiting: the Viewport panel's Frame switch (W3-15). Waits for Adam's sign-off in TrueVision; ported under DR-01 (c), not confirmed"},
    'v2.39.0': {'cls': 'PORTED', 'vv_app': 'VV v2.71.3 (W1-21)', 'pk': ['W1-21'],
                'note': "PORTED in v2.71.3: the sheet model's Save hands the drawings save its report and says where the sheets went - 'Sheets saved to R2 and locally.', red when the local copy fails, 'Sheets saved to R2.' with no local server (W1-21) - beside ProjectData's local copy (W1-05, v2.71.2), the local-mirror facade (W0-12) and the toolbar's one combined toast (already here). The sync tools' editor-owned keys are ValeVision's own staged fix (W0-07, DR-06). Waits for Adam's sign-off in TrueVision; ported under DR-01 (c), not confirmed"},
    'v2.40.0': {'vv_app': "VV v2.71.3 (part: the record key and the model's atScale W1-19, W1-20; a dimension's value through DrawingScale, MarkupBridge W1-28; DrawingScale's header W1-22)", 'pk': ['W1-19', 'W1-20', 'W1-28'],
                'note': "landed in v2.71.3: Dimension__AtScale kept by the records and set by CreateDimension and UpdateDimension (W1-19, W1-20), MarkupBridge printing an at-scale dimension's figure through DrawingScale, so the PDF and the Measurements box agree (W1-28), and DrawingScale's header (W1-22). Waiting: the drawing tools and the Measurements box (W2-26, W2-23) and the panels (W3-12). Waits for Adam's sign-off in TrueVision"},
    'v2.41.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.3 (part: the record keys and the model W1-19, W1-20; DimensionGeometry's fixed-length lines W1-26; MarkupBridge W1-28; PanelHost's LinkedPairRow W1-38)", 'pk': ['W1-20', 'W1-28'],
                'note': "landed in v2.71.3: Dimension__StartExtensionMm, __EndExtensionMm and __ExtensionsLinked kept and set (W1-19, W1-20), fixed-length extension lines drawn by DimensionGeometry 1.6.0 and passed by MarkupBridge 1.20.0 (W1-26, W1-28), and PanelHost's LinkedPairRow and ShowLink with the Linked Pair region, inert (W1-38). Waiting: the Dimensions panel's Ext. lines row (W3-12), the dimension tool (W2-26), the eyedropper (W2-21) and the hub (W3-03). Waits for Adam's sign-off in TrueVision; ported under DR-01 (c), not confirmed"},
    'v2.42.0': {'vv_app': "VV v2.71.3 (part: the record key and the model's closedDoors, W1-19, W1-20)", 'pk': ['W1-19', 'W1-20'],
                'note': "v2.71.3 added Viewport__ClosedDoors to the records and UpdateViewport's closedDoors (W1-19, W1-20). Waiting: DoorPose and the plan doors (W2-06, W2-11, W2-16) and the Viewport panel (W3-15). Waits for Adam's sign-off in TrueVision"},
    'v2.48.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.3 (part: Sheet__DrawingType, the drawing type constants, the site plan tab groups and the numbered tab order, dormant, W1-19, W1-20, W1-21)', 'pk': ['W1-20', 'W1-21'],
                'note': "landed in v2.71.3, dormant (DR-08 (B)): Sheet__DrawingType kept by the records (W1-19), DRAWING_ARCHITECTURAL and DRAWING_SITEPLAN (W1-20), the Sheets unit's site plan tab groups and NextOrder, and RenumberSheets numbering Sheet__Order 1..n with a delete keeping a dragged order (W1-21); no ValeVision sheet is a site plan. Waiting: the site plan store (W2-14) and the Sheet panel (W4-10). No line either way in TrueVision"},
    'v2.49.0': {'vv_app': 'VV v2.71.3 (part: the site plan record keys and scales, IsSitePlanViewport and the site plan branch, dormant, W1-19, W1-20, W1-21)', 'pk': ['W1-19', 'W1-20', 'W1-21'],
                'note': "v2.71.3 added, dormant (DR-08 (B)): Viewport__SitePlan and the site plan scales in the records (W1-19), IsSitePlanViewport, the site plan branch of ResolveViewportSource and CreateViewport's sitePlan (W1-20) and the facade's re-export (W1-21). Waiting: the site plan store and viewports (W2-14, W2-16). The S11 verifier records Adam confirming site plan viewports in TrueVision"},
    'v2.54.0': {'pk': ['W1-25', 'W1-26'],
                'note': "the same release commit (ffbaee21) carried PdfFonts 1.0.0, PdfExporter 1.4.0's font lines and SheetChrome 1.7.0's measuring, which no TrueVision heading names: v2.71.3 took PdfFonts whole and the exporter's font lines (W1-25) and SheetChrome 1.14.0, measuring and printing in the embedded Open Sans (W1-26; DR-21 (a), the cuts from the AD04 host). No confirmation line in TrueVision"},
    'v2.58.2': {'vv_app': 'VV v2.71.3 (part: Asset__Samples kept by the records, W1-19)',
                'note': "v2.71.3 keeps Asset__Samples on a viewport record (SheetRecords 1.39.0; git 5665508c, not in that file's log) (W1-19). Waiting: the progressive render remainder (W2-07) and the viewports (W2-16). No confirmation line in TrueVision"},
    'v2.61.0': {'pk': ['W1-26'],
                'note': "v2.71.3 ported Na__Test__TitleBlockScaleCell__.html, the page this release made, with Vale fixture values (W1-26), and SheetLayout's header (W1-22)"},
    'v2.61.1': {'pk': ['W1-26'],
                'note': "v2.71.3 ported the captions this release added to the ScaleCell test page (W1-26) and PdfFonts, which its entry names (W1-25); FitCaptionFont was here since ValeVision v2.54.1"},
    'v2.63.0': {'pk': ['W1-25'],
                'note': "v2.71.3 took SpecPdf 1.0.0 whole with the two font lines and the awaited save ValeVision's v2.56.0 port left out (W1-25; the document code through W1-12's accessor, OC-09), and PdfFilename's header (W1-22). No confirmation line in TrueVision"},
    'v2.69.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.3 (part: PdfFonts and the awaited EnsureLoaded before Install in PdfExporter and SpecPdf, W1-25)',
                'note': "landed in v2.71.3: PdfFonts 1.0.0 and this release's rule - EnsureLoaded awaited before Install, or the font fails silently - in both ported callers, the sheet exporter and the specification (W1-25); the sheet model, Sheets and the records carry their parts (W1-19, W1-21). Waiting: the register's own PDF (W4-18). No confirmation line in TrueVision"},
    'v2.70.0': {'pk': ['W1-21'],
                'note': "v2.71.3 took the Sheets unit whole: RenumberSheets runs through the register's Plan and Apply (Register__Numbering, W1-13) but writes no drawing number without a LayoutEditor__DrawingRegister block (a ValeVision seam, DR-11) while the tab order is still numbered (W1-21); the tabs read the drawing number with its default, 'D01 - Name' (W1-19, W1-21)"},
    'v2.71.0': {'vv_app': "VV v2.71.3 (part: the record fields, the register-series default and ComposeDocumentId W1-19; GetPhase, GetDocumentId and History W1-21; the Document ID row W1-22)",
                'note': "landed in v2.71.3: Sheet__Fields__Phase and __DocumentId, the DrawingNumber default 'D01' from the register's series and ComposeDocumentId with ValeVision's {project}, the document code (DR-11) (W1-19); the Sheets unit's GetPhase, GetDocumentId and ComposeDocumentId and History tracking Phase and DocumentId (W1-21); the title block's DOCUMENT ID row in Rows, the Classic anchors and the SheetSetup fallback (W1-22) - a never-numbered sheet reads 3047_D01. Waiting: the sheet PDF's file name on the Document ID, which this entry names (the line came with TrueVision's commit 32767407; no package before W3-16, the W1 gate's item 4.2), and the register's Phase column and the Sheet panel's filter (W4-10, W4-18). No stage until Adam supplies Vale's (DR-11). Built to Adam's spec in TrueVision; no confirmation line"},
    'v2.72.0': {'pk': ['W1-22'],
                'note': "v2.71.3 took the surfaces stylesheet whole, its header and the 'three greys' comment included (W1-22); the tokens were here since ValeVision v2.60.0"},
    'v2.75.0': {'note': "v2.71.3 carried, from this release's batch commit 32767407, AutoSave's DiscardSavedDraft (W1-07), the sheet model's FinishRegisterDeletion (W1-21) and two comment wordings in the panels sheet (W1-38) - none of them the manifest work this row names. No confirmation line in TrueVision"},
    'v2.79.0': {'pk': ['W1-21', 'W1-22'],
                'note': "v2.71.3 took History 1.7.0 whole, carrying this release's 1.6.0 (Status joins the register-updated rewrite, inert without a register) (W1-21), and ported Na__Test__TitleBlockCells__ from this release's 1.0.0 with a Vale fixture, re-measured in Open Sans (W1-22, W1-26)"},
    'v2.81.0': {'cls': 'PORTED', 'vv_app': "VV v2.71.3 (the title-block QR cell, Modern and SheetChrome's qr primitive, switched off, W1-26)", 'pk': ['W1-26'],
                'note': "PORTED in v2.71.3, switched off (DR-12 (A)): TitleBlock__QrCell__ 1.0.0, the Modern title block that solves it first and SheetChrome's 'qr' primitive (W1-26, by OC-01), beside the Project QR system (W1-15, v2.71.2); QrCellEnabled and ProjectQr__Enabled are false and no address is configured, so no strip carries a cell. The q/ resolver this entry names is Noble Architecture's site and is never ported; a Vale resolver and the switch-on are W5-05's (held). 'Not yet signed off by Adam' in TrueVision"},
    'v2.89.0': {'vv_app': "VV v2.71.3 (part: the site plan composite record keys and the model's patch keys, dormant, W1-19, W1-20)", 'pk': ['W1-19', 'W1-20'],
                'note': "v2.71.3 added, dormant (DR-08 (B)): SitePlan__PlanType and __Composites kept by the records (W1-19) and UpdateViewport's sitePlanPlanType, sitePlanComposites and sitePlanHatch (W1-20). Waiting: Viewport2d__SitePlan (W2-16) and the site plan store (W2-14). Part of it held back for Adam's test in TrueVision"},
    'v2.90.0': {'vv_app': 'VV v2.71.3 (part: Shape__Hatch in the records, the model and the chrome, W1-19, W1-20, W1-26)', 'pk': ['W1-19', 'W1-20'],
                'note': "v2.71.3 added Shape__Hatch on any vector to the records (W1-19), CreateShape's and UpdateShape's hatch (W1-20; the Shapes log does not record it, git 62dade1c) and SheetChrome's hatch pass with ShapeGeometry (W1-26); the hatch module was here since v2.71.2. Waiting: the Patterns panel (W2-29) and Panel__Shapes (W3-12). No confirmation line in TrueVision"},
    'v2.91.0': {'vv_app': "VV v2.71.3 (part: PanelHost 1.5.0's tab hover text, W1-38)",
                'note': "v2.71.3 took PanelHost whole (1.6.0), so the column tabs show their hover text - the Properties hint and the Scrapbook's own (W1-38). Waiting: the Specification Scrapbook (W2-35, W2-30). No line records that Adam tried it in TrueVision"},
    'v2.93.0': {'note': "v2.71.3 carried only the panels sheet's composite-unit comment ('three kinds now'), with the sheet taken whole (W1-38); the Enhance strength waits for W2-09. 'NOT SIGNED OFF BY ADAM' in TrueVision"},
    'v2.94.0': {'vv_app': "VV v2.71.3 (part: the depthFog style key W1-19; the Paper sheet's fog image rules W1-28)", 'pk': ['W1-19', 'W1-28'],
                'note': "v2.71.3 added the depthFog viewport style to the records (W1-19) and the Paper sheet's .na-le-frame__fog rules (W1-28). Nothing draws fog yet: the render layer and wiring wait for W2-03, sheets for W2-12 and W2-16. TrueVision's fog plan: 'Awaiting Adam's test'"},
    'v2.95.0': {'vv_app': 'VV v2.71.3 (part: Open Sans Medium, W1-25)', 'pk': ['W1-25'],
                'note': "v2.71.3 added the Open Sans Medium (500) face to the fonts stylesheet, from the AD04 host (DR-21) (W1-25): toasts and the 500-weight menu items render in Medium. The writer stays off (DR-10). 'NOT CONFIRMED BY ADAM' in TrueVision"},
    'v2.100.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.3 (part: Shape__Qr in the records, the model and ShapeGeometry, switched off, W1-19, W1-20, W1-26)', 'pk': ['W1-19', 'W1-20', 'W1-26'],
                 'note': "landed in v2.71.3, switched off (DR-12 (A)): Shape__Qr kept by the records (W1-19), UpdateShape's qr (W1-20) and ShapeGeometry, which paints the project's code in its box only while the QR system is on (W1-26); the QR README's section was here since v2.71.2. Waiting: the Project Portal element (W2-38) and the parametric scrapbook (W2-37, W3-14). 'NOT YET TRIED BY ADAM' in TrueVision"},
    'v2.104.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.3 (part: the room records and the five-layer seed W1-19; Layers, Shapes and AreaGroups W1-20; the facade and the 'areas' step W1-21; the room hit W1-26; the Floor Areas core, inert, W1-27; the room label W1-28)", 'pk': ['W1-19', 'W1-21', 'W1-26', 'W1-28'],
                 'note': "landed in v2.71.3, inert (DR-14 (A)): 'area' layers, Shape__Area, Sheet__AreaGroups and the five-layer seed, Floor Areas a new sheet's fourth layer (W1-19); Shapes, Layers' DeleteLayer re-homing and AreaGroups 1.0.0 (W1-20); the facade's area names and History's 'areas' step (W1-21); ShapeGeometry's room hit (W1-26); FloorAreas, Geometry, Tool, Menu, Paint and the config with Na__Test__FloorAreas__ (W1-27); MarkupBridge's room label (W1-28). Waiting: the panel, table, label grip, stylesheet and wiring (W3-10) and the area schedule (W3-17); the A key stays inert. Adam has used Floor Areas in TrueVision (his notes drove v2.106.0, v2.125.0, v2.133.0 and v2.148.0); TrueVision's floor area plan keeps its ValeVision phase open until he signs it off"},
    'v2.106.0': {'vv_app': "VV v2.71.3 (part: the layer stack - SheetSurface, MarkupBridge, the PDF paint plan, the Paper regions, LinkNoodle 1.2.1 and Na__Test__LayerStack__ W1-28; the restack W1-19; Layers' LayerIndexAboveDrawings W1-20; BuildViewportFrame W1-26; FloorAreas 1.1.0 W1-27)", 'pk': ['W1-20', 'W1-26', 'W1-27'],
                 'note': "landed in v2.71.3 and LIVE: the Layers list is the sheet's paint order on screen and in the PDF - a layer dragged under the Viewports layer draws under the drawing, a click finds what is drawn on top, old sheets restacked once (W1-19, W1-28); a layer made for a shape goes over the drawings (W1-20). Waiting: the parametric scrapbook's halves (ScrapbookParametric, ViewportLink and the Project QR element: W2-37, W2-38). No line either way in TrueVision"},
    'v2.109.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.3 (part: Cells 1.2.0 and the Rows' Revision prefix W1-22; Modern 1.5.0 W1-26)", 'pk': ['W1-26'],
                 'note': "landed in v2.71.3: the Rev cell reads 'Revision A' (dropped on A4 portrait before another value is cut) and on A2 and A1 the fixed cells are a fifth wider, paid from the title's spare room - Cells 1.2.0's Widen, the Rows' ValuePrefix and Modern 1.5.0, with the title block test's Widen checks (W1-22, W1-26). Waiting: the Project Portal block's 20 mm (W2-38). 'NOT tried by Adam' in TrueVision"},
    'v2.111.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.3 (part: the zoom settle in SheetSurface and the Paper sheet W1-28; the wheel and pinch gesture steps W1-36)', 'pk': ['W1-36'],
                 'note': "landed in v2.71.3: SheetSurface's NoteZoomGesture and ZOOM_SETTLED_EVENT with the na-le-paper--zooming hold (W1-28), the wheel gathered into one zoom a frame and the pinch made a gesture step (Navigation, Controls__Pc, TouchScreen; W1-36). Waiting: the listeners TrueVision moved to ZOOM_SETTLED_EVENT - the margin grip, the Measurements box, the hub and Draft mode (their packages). 'Not ported. Goes with Draft mode, on Adam's sign-off' in TrueVision; ported under DR-01 (c)"},
    'v2.112.0': {'vv_app': "VV v2.71.3 (part: Page Up and Page Down - Controls__Pc and the mode controller's StepSheet; the Fly controls 1.0.1 release, OC-08; Na__Test__SheetPagingWalkExit__, W1-36)",
                 'note': "landed in v2.71.3: Page Down turns to the next drawing and stops at the last without scrolling the stage, Page Up goes back, and leaving Fly releases the render loop (W1-36, OC-08). Waiting: the register's Ctrl+S (W4-10). 'NOT tried by Adam; NOT in ValeVision' in TrueVision"},
    'v2.114.0': {'vv_app': "VV v2.71.3 (part: SheetSurface's GetSheetChrome W1-28; the Shapes unit W1-20)", 'pk': ['W1-20', 'W1-28'],
                 'note': "v2.71.3 added SheetSurface's GetSheetChrome (W1-28) and the Shapes unit's part (W1-20). Waiting: the grid, its panel and stylesheet (W2-18, W3-05). 'Adam has not tried it' in TrueVision"},
    'v2.115.0': {'vv_app': "VV v2.71.3 (part: TakeKeyboard and ControlKeepsKey in Controls__Pc; the mode controller's RestartSheetKeys, W1-36)",
                 'note': "landed in v2.71.3: a press on the stage takes the keyboard and a focused control keeps only the keys it uses (Controls__Pc 1.4.0), and coming back to a drawing restarts the sheet keyboard and re-reads the key file (RestartSheetKeys) (W1-36). Waiting: SheetTools Keyboard 1.10.0+ (W3-03); Na__Test__DrawingTabKeys__ is prepared and held for W3-03 (46 of 53 on this tree, 53 with TrueVision's keyboard). No confirmation line in TrueVision"},
    'v2.116.0': {'vv_app': "VV v2.71.3 (part: 'image' layers and Shape__Image W1-19; the units' image paths W1-20; the save steps' notes in the toast W1-21; the picture primitive and Shape__Image in the chrome W1-26)", 'pk': ['W1-19', 'W1-20', 'W1-21', 'W1-26'],
                 'note': "v2.71.3 added the records' 'image' layers and Shape__Image (W1-19), the units' image paths (W1-20), the save steps' notes in the Save Sheets toast (W1-21) and SheetChrome's 'picture' primitive with ShapeGeometry's Shape__Image (W1-26); five of the Sheet Images render leaves are now linked (Geometry, Paint, Painter, Setup, Source). Waiting: the editing set (W3-02), storage and publish (W3-18) and the switch-on (W3-09). Tried by Adam in TrueVision on his own server; no sign-off line"},
    'v2.120.0': {'vv_app': "VV v2.71.3 (part: ShapeGeometry's portalDarkColour W1-26)",
                 'note': "v2.71.3 took ShapeGeometry whole, which paints the Portal block's code in portalDarkColour (W1-26); the title-block cell landed with it, switched off. Waiting: the Portal block (W2-38). 'NOT tried by Adam' in TrueVision"},
    'v2.121.0': {'vv_app': 'VV v2.71.3 (part: Image__SourceW and __SourceH kept by the records, W1-19)', 'pk': ['W1-19'],
                 'note': "v2.71.3 keeps a picture's source size on its record (W1-19). Waiting: Publish (W3-18) and the switch-on (W3-09). 'NOT signed off by Adam' in TrueVision"},
    'v2.123.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.3 (part: Layer__Selectable, the units, the facade, MarkupBridge's pass-through and the Ref button rule, W1-19, W1-20, W1-21, W1-28, W1-38)", 'pk': ['W1-19', 'W1-21', 'W1-28', 'W1-38'],
                 'note': "landed in v2.71.3: Layer__Selectable kept (W1-19); Layers and Shapes' IsLayerSelectable, ItemLayerId and MoveToLayer, and hiding a layer takes its items out of the selection (W1-20); the facade's re-exports (W1-21); MarkupBridge skipping a reference layer's markup in the hit test (W1-28); the panels sheet's Ref button rule (W1-38). Waiting: the Layer flyout (W2-21), the Layers panel's Ref switch (W3-13), HitResolution's frame pass-through and the hub (W3-03). 'NOT tried by Adam' in TrueVision (v2.127.0 opens after the Layer flyout 'worked'; no sign-off)"},
    'v2.124.0': {'pk': ['W1-36'],
                 'note': "Navigation's INTEGRATION comment hunk came with its whole take in v2.71.3 (W1-36, OC-08); only the Eyedropper's comment waits (W2-21)"},
    'v2.125.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.3 (part: Geometry 1.1.0's label home, FloorAreas, Paint 1.1.0 and the label config, inert, W1-27; the room label keys W1-19)", 'pk': ['W1-19'],
                 'note': "landed in v2.71.3, inert (DR-14 (A)): a room's label starts at its box's middle (Geometry 1.1.0's LabelHome, FloorAreas' Measure home, Paint 1.1.0, the config's label keys and the test's label-home checks) (W1-27); Area__TextSizeMm, __LabelDXMm and __LabelDYMm kept by the records (W1-19). Waiting: the label grip (W3-10). 'NOT tried by Adam; NOT in ValeVision' in TrueVision - his request"},
    'v2.126.0': {'vv_app': "VV v2.71.3 (part: the Colour Palette W1-37; PanelHost 1.6.0's attach W1-38; the hatch's own line weight and colour in the records and the chrome W1-19, W1-26)", 'pk': ['W1-38', 'W1-19', 'W1-26'],
                 'note': "landed in v2.71.3 and LIVE: the colour palette above every colour field - the 3D tab's dimension colour on the Plan Annotations toolbar 1.1.0 (W1-37) and every Layout Editor panel colour field through PanelHost 1.6.0 (W1-38), named 'Vale Garden Houses Standard' with TrueVision's swatches (DR-20); a hatch's own line weight and colour kept and drawn (W1-19, W1-26). Waiting: the Patterns panel (W2-29), the Vectors panel (W3-12) and the PDF exporter's hatch colour (W3-16). 'NOT tried by Adam' in TrueVision"},
    'v2.127.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.3 (part: Layers 1.4.0 and the facade's re-exports, W1-20, W1-21)",
                 'note': "landed in v2.71.3: GetLayerByName, LayerIndexLike, IsItemPickable and silent layer writes (Layers 1.4.0, W1-20) with the facade's re-exports (W1-21). Waiting: the clipboard that brings a layer with a paste (W2-21) and the hub (W3-03). 'NOT tried by Adam' in TrueVision"},
    'v2.130.0': {'vv_app': "VV v2.71.3 (part: Shape__Curve W1-19; Shapes' afterId, curve and AnnounceShapes and Groups' AddGroupMember W1-20; the facade W1-21)", 'pk': ['W1-19', 'W1-20', 'W1-21'],
                 'note': "v2.71.3 added the vector tools' model half: Shape__Curve kept (W1-19), afterId, curve and AnnounceShapes in Shapes and AddGroupMember in Groups (W1-20), re-exported by the facade (W1-21). Waiting: the vector tools themselves (W2-27, W2-28, W2-41; switched on with W3-07). 'NOT tried by Adam' in TrueVision"},
    'v2.133.0': {'cls': 'PORTED', 'vv': 'VV v2.71.3 (W1-37, W1-38)',
                 'note': "PORTED in v2.71.3: the browser's colour mixer sits on top of the palette and Special is the green - the Picker and Manager 1.1.0 and the config 1.1.0 (W1-37), with Na__Test__ColourPalette__ 1.1.0, 55 of 55 (W1-38). 'NOT tried by Adam; NOT in ValeVision' in TrueVision"},
    'v2.135.0': {'cls': 'PORTED', 'vv': 'VV v2.71.3 (W1-36)',
                 'note': "PORTED in v2.71.3: an author zooms in to 6400% and a reader still stops at 800% - Navigation 1.3.0 (W1-36), over the AuthoringZoomMax key and its EditorSetup reader that came with W0-15 (v2.71.1); Na__Test__AuthoringZoomMax__ 12 of 12. 'NOT tried by Adam; NOT in ValeVision' in TrueVision"},
    'v2.136.0': {'vv_app': "VV v2.71.3 (part: SheetSurface's Ready and NoteRedraw, the Paper hold rule and Na__Test__VectorQuality__ W1-28; Sheets normalising once and its test W1-21; State's Revision W1-20)", 'pk': ['W1-20'],
                 'note': "landed in v2.71.3: vector quality Medium (DR-40 item 6) - while a sheet is redrawn its 2D drawings are held and drawn crisp 1.2 s after the last redraw (SheetSurface 1.10.0+, the Paper rule, VectorQuality linked; W1-28); sheets are normalised once per announcement, so a heavy sheet answers the pointer faster (W1-21); State's Revision (W1-20); the two TrueVision tests (the 1.0.1 of each in no release, git b1e0220f). Waiting: the toolbar's Vector control (W5-01) and the Measurements box and hub halves (W2-23, W3-03). The Vector control is 'NOT yet confirmed' by Adam in TrueVision"},
    'v2.137.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.3 (part: frames carried by a translate, SheetSurface, W1-28)',
                 'note': "landed in v2.71.3: viewport frames are carried by a translate, painted where they are to the sub-pixel (W1-28). Waiting: the snap marker (W2-42), the viewport snap move (W2-25) and the grips (W2-24). 'NOT tried by Adam' in TrueVision"},
    'v2.138.0': {'vv_app': "VV v2.71.3 (part: Viewport__RotationDeg and the model W1-19, W1-20; turned groups and frames in the chrome and the surface W1-26, W1-28; MarkupBridge's turned import W1-28; FloorAreas through a turned frame W1-27)", 'pk': ['W1-19', 'W1-20', 'W1-26', 'W1-27', 'W1-28'],
                 'note': "v2.71.3 added the turned-viewport record key and patch (W1-19, W1-20), SheetChrome's turned groups and frames (W1-26), SheetSurface's turned frames and MarkupBridge's turned import (W1-28) and FloorAreas' host through a turned frame (W1-27). Waiting: the handles, the turned window, the snap index and the panel (W3-06 after W3-03; W3-15). 'NOT tried by Adam' in TrueVision"},
    'v2.139.0': {'vv_app': 'VV v2.71.3 (part: Dimension__RoundUp W1-19; TextAndDimensions W1-20; MarkupBridge W1-28)', 'pk': ['W1-19', 'W1-20'],
                 'note': "v2.71.3 keeps and sets a dimension's round-up (W1-19, W1-20) and MarkupBridge prints the raised figure with its asterisk (W1-28). Waiting: the dimension tool and panel (W2-26, W3-12). 'NOT tried by Adam' in TrueVision"},
    'v2.140.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.3 (part: Viewport__HideSwings and the model W1-19, W1-20; 1:200 in Scales and the SheetSetup fallback W1-22; the wrapping toggle group W1-38)', 'pk': ['W1-19', 'W1-20', 'W1-38'],
                 'note': "landed in v2.71.3: 1:200 joins the scales - the config's AvailableScaleDenominators and the SheetSetup fallback (DR-17), and a 1:200 viewport keeps its scale on reload (W1-22); Viewport__HideSwings kept and set (W1-19, W1-20); the panels sheet's wrapping and tight Scale group and the inline check (W1-38). Waiting: the plan doors and their swings (W2-06, W2-11, W2-16) and the Viewport panel's Hide swings (W3-15). 'NOT tried by Adam; NOT in ValeVision' in TrueVision"},
    'v2.141.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.3 (part: GROUP_KINDS and PruneGroups W1-19, W1-20; markup Groups and MarkupBridge's DimensionBounds W1-28)", 'pk': ['W1-19', 'W1-20'],
                 'note': "landed in v2.71.3: a group keeps its leaders and dimensions through deletes and reloads (GROUP_KINDS, PruneGroups; W1-19, W1-20), and Ctrl+G groups them (Groups, DimensionBounds; W1-28). Waiting: a leader travelling with what it is moved with and the copy drag (EditScope, ItemClipboard, SelectionSet: W2-21; CopyDrag: W3-03). 'NOT tried by Adam' in TrueVision"},
    'v2.142.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.3 (part: viewports in groups and the single-delete prunes W1-19, W1-20; Groups 1.4.0, MarkScopedFrames and the per-slot fade W1-28)', 'pk': ['W1-19', 'W1-20'],
                 'note': "landed in v2.71.3: a viewport groups with its notes and an open group keeps its drawings at full strength (Groups 1.4.0, SheetSurface's MarkScopedFrames, the Paper per-slot fade; W1-28); the model's viewport members and the single-delete prunes (W1-19, W1-20). Waiting: what is placed inside an open group joining it and a press on a grouped viewport's frame selecting the group (W2-21, W3-03, W3-15, W3-02); until then copying a group pastes it without its dimensions and viewports. 'NOT tried by Adam' in TrueVision (he asked for the fix)"},
    'v2.143.0': {'vv_app': "VV v2.71.3 (part: the margin record and the model's note region functions, W1-19, W1-21)", 'pk': ['W1-19', 'W1-21'],
                 'note': "v2.71.3 keeps the overspill regions on the margin record (W1-19) and adds the Sheets unit's AddNoteRegion, UpdateNoteRegion and DeleteNoteRegion with the facade's re-exports, each one 'margin' undo step (W1-21). Waiting: the regions tool, grips, panel and column (W2-22, W2-32, W3-11). 'NOT tried by Adam' in TrueVision"},
    'v2.144.0': {'vv_app': "VV v2.71.3 (part: LeaderGeometry 1.3.0's note resolver, W1-26)", 'pk': ['W1-26'],
                 'note': "v2.71.3 took LeaderGeometry 1.3.0 whole: SetNoteResolver and NoteFor, and 1.2.0's broken-link halo, unlogged (18-Sep) (W1-26); both answer nothing until the specification registers its resolvers (W2-30). Waiting: the spell check, the specification scrapbook and the tooltips (W2-34, W2-35, W3-03). 'NOT tried by Adam' in TrueVision"},
    'v2.145.0': {'cls': 'PORTED', 'vv_app': 'VV v2.71.3 (W1-07, W1-21)',
                 'note': "PORTED in v2.71.3: the browser draft comes back after a reload, whichever arrives first - AutoSave 1.4.0's key waits for the sheets (W1-07) and the sheet model's late start announces a load that landed before the editor once (W1-21), over ProjectData's IsLoaded (W1-05, v2.71.2); Na__Test__DraftRestore__ 27 of 27. 'NOT tried by Adam; NOT in ValeVision' in TrueVision"},
    'v2.146.0': {'cls': 'PORTED', 'vv_app': 'VV v2.71.3 (W1-07)',
                 'note': "PORTED in v2.71.3: the three guards round the project file - a draft is judged before it goes back (AutoSave 1.5.0: Apply Draft, Discard Draft or Decide Later, nothing written while asking; W1-07, Na__Test__DraftGuard__ 11 of 11), a save is judged before it goes out (ProjectData 1.6.0, W1-05, v2.71.2) and every copy overwritten is kept (the local server, W0-09, v2.71.1). R2 is not judged, as in TrueVision (DR-30; the staged worker 1.6.0 can, W0-10). 'NOT tried in the app' in TrueVision"},
    'v2.147.0': {'vv_app': 'VV v2.71.3 (part: the leaderless groups on the margin record and in the model, W1-19, W1-21)',
                 'note': "v2.71.3 keeps the leaderless groups on the margin record (W1-19) and adds the Sheets unit's leaderless patch keys with the facade's re-exports (W1-21). Waiting: the margin's leaderless panel and column (W2-32). 'NOT tried by Adam' in TrueVision"},
    'v2.148.0': {'note': "v2.71.3 carried its Floor Areas config labels only (TablesNote, InsertProject; W1-27); the table and the schedule wait for W3-10 and W3-17. No status line in TrueVision (built at Adam's request)"},
    'v2.150.0': {'vv_app': 'VV v2.71.3 (part: Shape__Holes in the records and the model W1-19, W1-20; holed vectors drawn even-odd W1-26; Make refuses a holed vector W1-27)', 'pk': ['W1-19', 'W1-20', 'W1-26', 'W1-27'],
                 'note': "v2.71.3 keeps and sets a vector's holes (W1-19, W1-20) and draws a holed vector with its holes bare on screen and in the PDF (SheetChrome 1.14.0, ShapeGeometry 1.9.0; W1-26); Floor Areas refuses a holed vector (W1-27). Waiting: the Boolean tools (W2-27, W2-41, W3-07, W3-03). Adam tried the Boolean tools in TrueVision ('It works INCREDIBLE!', recorded in v2.151.0)"},
    'v2.152.0': {'vv_app': "VV v2.71.3 (part: Dimension__LinePt and __LineStyle W1-19, W1-20; DimensionGeometry 1.6.0 W1-26; MarkupBridge 1.20.0 W1-28)", 'pk': ['W1-19', 'W1-20'],
                 'note': "v2.71.3 keeps and sets a dimension's line weight and line style (W1-19; on create and update, unlogged in TrueVision's file log, W1-20), draws the dashed rules (W1-26) and passes them (W1-28). Waiting: the dimension tool, the panel and the eyedropper (W2-26, W3-12, W2-21). 'NOT tried by Adam' in TrueVision"},
    'v2.154.0': {'cls': 'PARTIAL', 'vv': "VV v2.71.3 (part: the panels sheet's one red for Off, Unlock and Ref, W1-38)", 'pk': ['W1-38'],
                 'note': "landed in v2.71.3: the panels sheet's rules - one faint red for a layer that is off, unlocked or a reference (W1-38); the locked layer's red is unchanged. Waiting: the Layers panel that sets them (W2-36, W3-13). Adam asked for it with a screenshot; no record he tried the result"},
    'v2.155.0': {'vv_app': "VV v2.71.3 (part: SheetSurface's ShowPublished W1-28; the ScaleCell page's jsPDF path W1-26)", 'pk': ['W1-28', 'W1-26'],
                 'note': "v2.71.3 added SheetSurface's ShowPublished (the publishing half; unlogged in its module, W1-28) and the ScaleCell test page at its moved jsPDF path (W1-26). Adam's confirmation in TrueVision covers this release's PDF exporter fix (v2.71.2), not these parts; publishing waits for Wave 4"},
}
EYEDROPPER_ROW = '| (unnumbered, 14-Sep) | 14-Sep-2026 | Eyedropper matches unlocked viewports'
EYEDROPPER_NOTE = ("v2.71.3 keeps Viewport__ShowFrame on the record (W1-19) and the chrome hides a frame and its caption when "
                   "it is off (W1-26); the eyedropper's frame trait waits for W2-21")

EXPECT_FLIP_COUNTS = {('NOT-CONSIDERED', 'PARTIAL'): 11, ('PENDING-SIGNOFF', 'PARTIAL'): 4, ('REOPENED', 'PARTIAL'): 1,
                      ('PARTIAL', 'PORTED'): 4, ('NOT-CONSIDERED', 'PORTED'): 2}
CONT = ['W1-07', 'W1-19', 'W1-20', 'W1-21', 'W1-22', 'W1-25', 'W1-26', 'W1-27', 'W1-28', 'W1-36', 'W1-37', 'W1-38']


def W(lines_text):
    return lines_text.strip('\n').split('\n')


S14_BULLET = W('''
- **Wave 1 continuation (ValeVision3D v2.71.3, 02-Oct-2026; W1-99).** The continuation adds 11 modules (AreaGroups,
  PdfFonts, TitleBlock__QrCell__, the five Floor Areas modules and the three Colour Palette modules), two configuration
  files, the palette's stylesheet and README, nine test files and a test page; it links 18 modules that landed inert
  earlier (the two record leaves, HatchPatterns, SitePlanComposites, ViewportRotation, Register__Numbering,
  DimensionRounding, PaintOrder, VectorQuality, the 53 QR Encoder, Painter, Symbol and ProjectLink, and the 54 Sheet
  Images Geometry, Paint, Painter, Setup and Source), so the app graph grows from 527 to 554 modules; and it adds
  exports to existing modules: the sheet model's facade +32, SheetRecords +11, Layers +7, the Sheets unit +7
  (AnnounceRestore moved to the facade), ShapeGeometry +6, MarkupBridge +5, SheetSurface +4, LeaderGeometry +4,
  AutoSave +3, State +3, Shapes +3, SheetChrome +2, Controls__Pc +2, PanelHost +2, Viewports +1, Groups +1 and the title
  block cells +1. A warm client holding a mix of old and new files can fail to link the editor (a new Modern, QR cell or
  ShapeGeometry with an old SheetChrome; the new facade with an old unit or an old SheetRecords; AutoSave with a
  pre-W1-05 ProjectData; the new mode controller with an old Controls__Pc), announce a load twice (an old loader with the
  new facade), or link and bury every note under the drawings (an old SheetSurface with the new Paper sheet). Bump
  needed: yes, once at deploy - the same consolidated W0/W1 bump (the prepared W0-08 package applied plus one
  shell-token bump, or a full bump); nothing extra. W6-02's precache refresh should add PdfFonts, TitleBlock__QrCell__,
  the 53 folder's four modules and its config, the five linked 54 modules, AreaGroups, Register__Numbering, the two
  record leaves, HatchPatterns, SitePlanComposites, ViewportRotation, DimensionRounding, PaintOrder, VectorQuality, the
  Floor Areas folder (with W3-10's panel, table, label grip and stylesheet) and the Colour Palette folder. Service worker
  token: shared Whitecardopedia worker - Adam's call; it was not bumped (`'2026-09-18-1'`).
''')

S21_NOTE = W('''
**02-Oct-2026 note (W1-99, ValeVision3D v2.71.3).** 54 now holds TrueVision's colour palette at its own number
(`54__Feature__ColourPalette`, W1-37: the door, Manager, Picker, config, stylesheet and README; live - the 3D tab's
dimension colour and every Layout Editor panel colour field open it, W1-38); 55 (spell check) is still to come with
W2-34. Inside 51 the Layout Editor gained LE/59 (Floor Areas, W1-27; section 2.3).
''')

S23_NOTE = W('''
**02-Oct-2026 note (W1-99, ValeVision3D v2.71.3).** The Wave 1 continuation created LE/59 FloorAreas (its core, inert
until W3-10; W1-27). ValeVision now has 28 (27 shared plus LE/01); 7 of TrueVision's 34 are still to come (21, 28, 33,
52, 58, 65, 66). The folder-number registry's ValeVision column was not touched in this pass either: it is not a scribe
file.
''')

S3_NOTE = W('''
**Refreshed 02-Oct-2026 by W1-99 for the Wave 1 continuation (ValeVision3D v2.71.3).** "Blocked by" now comes from the
same analysis re-run on the end-of-continuation working tree
(`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W1-99/C2/pom/port_order_map__endW1c.json`; part 1's
values stay in its map). The continuation cleared the blockers of {cleared} more TrueVision modules (`none` {none0} ->
{none1}; lists {list0} -> {list1}); the three modules that left the map's closure in part 1 keep `none`. Rows the
continuation changed carry their new state with the old kept as "[was: ...]"; the TrueVision-only rows of 3.5 that
landed name their ValeVision path, and the rows of the eighteen modules landed earlier that the continuation linked into
the app name their importer and say so; section 3.9 lists the changes by package.
''')

NOT_RUN_NOTE = note('all twelve ran in the Wave 1 continuation - 11 done, W1-36 partial; section 3.9')
RECORDS_LINE_OLD = "  whole-file takes are W1-26's, which did not run in this wave."
RECORDS_LINE_NOTE = note("SheetChrome and LeaderGeometry CLOSED by W1-26 (TrueVision's 1.14.0 and 1.3.0 taken whole "
                         "with their logs); History taken whole at 1.7.0 by W1-21 with TrueVision's own log, whose "
                         "repeated 1.3.0 is now TrueVision's (queued for WT-08) - section 3.9")


def S39(pkg_rows):
    def vkey(v):
        m = re.match(r'v(\d+)\.(\d+)\.(\d+)$', v)
        return (0, tuple(int(x) for x in m.groups())) if m else (1, (0, 0, 0))

    def rows4(p, fallback):
        vs = sorted(pkg_rows.get(p, []), key=vkey)
        if not vs:
            return fallback
        if len(vs) <= 6:
            return '4 (%s)' % ', '.join(vs)
        return '4 (%d rows)' % len(vs)
    return W('''
### 3.9 Wave 1 continuation (ValeVision3D v2.71.3): what each package changed

Written 02-Oct-2026 by the Wave 1 Parity Scribe (W1-99) from the twelve Port Records of the continuation
(`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/port_records/`) and the integrator's continuation gate
(`.../execution/gate_reports/W1.md`, PART 2, PASS_WITH_NOTES). "Rows" are the rows above that the package changed; work
that is not a module of this register (tests, the two stylesheets in `03__Style__AppStylesheets/`, the Fly controls) is
named in the second column.

| Package | What it changed | Rows | Elsewhere in this ledger |
|---|---|---|---|
| W1-07 | AutoSave 1.5.0 whole: no draft read or written until the project's sheets are in (1.4.0); a draft records the drawings it grew from and is asked about - Apply Draft, Discard Draft or Decide Later - when they were saved since (1.5.0); Suspend, Resume and DiscardSavedDraft inert until the register; W0-08's neutral unsaved-work flag re-applied; TrueVision's Na__Test__DraftGuard__ and Na__Test__DraftRestore__ | 3.1 AutoSave | %(W1-07)s |
| W1-19 | SheetRecords 1.39.0 whole: every record field of v2.32.0-v2.152.0 kept, an old sheet's layers restacked once, the register-series DrawingNumber default ("D01"), Phase, DocumentId and ComposeDocumentId with the document code (DR-11); the DrawingCode leaf's header (1.0.1) | 3.1 SheetRecords; 3.6 DrawingCode; 3.5 (now linked) the two record leaves, HatchPatterns, SitePlanComposites, ViewportRotation, the Sheet Images Geometry | %(W1-19)s |
| W1-20 | The sheet model's units whole: State 1.2.0, Layers 1.4.0, Shapes 1.6.0, Viewports 1.4.0, TextAndDimensions 1.2.0, Leaders 1.2.0, Groups 1.3.0; AreaGroups 1.0.0 (inert); DrawOrder and Common to TrueVision's headers. Deleting a layer re-homes its vectors; a group keeps viewport, leader and dimension members | 3.1 the nine units; 3.5 AreaGroups (landed) | %(W1-20)s |
| W1-21 | The facade 1.35.1, Sheets 1.4.0 and History 1.7.0 whole in one change with the loader's late start (the loader 1.1.4: the re-announcement gone, the site-plan CheckNames row, tabs read "D01 - Name"); RenumberSheets writes no number without a register block (a ValeVision seam); Save Sheets says where the sheets went; 'margin' and 'areas' undo steps; Na__Test__SheetsNormaliseOnce__ | 3.1 the facade, Sheets, History; 3.6 Loader; 3.5 (now linked) Register__Numbering | %(W1-21)s; 8.1 |
| W1-22 | The title block's Document ID row ("3047_D01") and the Rev cell's Revision prefix in Rows, the Classic anchors and the SheetSetup fallbacks TrueVision's; 1:200 (DR-17); Cells 1.2.0 (Widen); DrawingScale, SheetLayout, Classic, PdfFilename and the surfaces stylesheet to TrueVision's headers; Na__Test__TitleBlockCells__ with TrueVision's checks on a Vale fixture, and its page | 3.1 Cells, DrawingScale, SheetLayout, Classic, PdfFilename, Styles__Surfaces, ConfigState__SheetSetup; 3.2 the Layout Editor config | %(W1-22)s |
| W1-25 | PdfFonts 1.0.0 (new): the Open Sans cuts embedded in every PDF; PdfExporter 1.4.0's font lines; SpecPdf 1.0.0 whole (the fonts, the awaited save); the four Style and Pdf config values Open Sans first; `03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css` TrueVision's, with Open Sans Medium; OC-09: SpecPdf and SpecDocument print the document code (`3047_SPEC`) | 3.1 PdfExporter, SpecPdf, SpecDocument; 3.2 the Layout Editor config; 3.5 PdfFonts (landed) | %(W1-25)s; 8.1 |
| W1-26 | SheetChrome 1.14.0, ShapeGeometry 1.9.0, DimensionGeometry 1.6.0 and LeaderGeometry 1.3.0 whole: text measured and printed in the embedded Open Sans, the qr and picture primitives, hidden frames, holed vectors; by OC-01 TitleBlock__QrCell__ 1.0.0 (switched off) and Modern 1.5.0 ("Revision A", a fifth more on A2 and A1), its Vale stand-in text from config; outside its list (gate item 4.3) the LogoFallbackText key, its SheetSetup reader and two allow-list rows; Na__Test__TitleBlockScaleCell__.html; the title block test in Open Sans | 3.1 SheetChrome, ShapeGeometry, DimensionGeometry, LeaderGeometry, Modern, ConfigState__SheetSetup; 3.2 the Layout Editor config; 3.5 QrCell (landed); 3.5 (now linked) the 53 Encoder, Painter, Symbol and ProjectLink, the 54 Paint, Painter, Setup and Source | %(W1-26)s |
| W1-27 | Floor Areas' core, inert (LE/59 created): Geometry 1.1.0, FloorAreas 1.2.2, Tool 1.0.0, Menu 1.1.1, Paint 1.1.0 and the config, byte for byte; Na__Test__FloorAreas__ | 3.5 the six files of LE/59 (landed) | 2.3; %(W1-27)s |
| W1-28 | The paint order: SheetSurface 1.13.0, MarkupBridge 1.20.0 and markup Groups 1.4.0 whole, the Paper sheet's two stack regions, PdfExporter 1.7.0's paint plan, LinkNoodle 1.2.1's hunk (an importer update); vector quality Medium (DR-40 item 6); Na__Test__LayerStack__ and Na__Test__VectorQuality__ | 3.1 SheetSurface, MarkupBridge, Groups, the Paper sheet, PdfExporter, LinkNoodle; 3.5 (now linked) DimensionRounding, PaintOrder, VectorQuality | %(W1-28)s |
| W1-36 | PARTIAL: Navigation 1.3.0, Controls__Pc 1.4.0 and TouchScreen 1.1.0 whole; the mode controller's keyboard hunks (RestartSheetKeys, StepSheet, Page Up and Page Down; 1.18.4); OC-08's Fly controls 1.0.1 release (`10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js`, outside this register; 1.1.1); Na__Test__AuthoringZoomMax__ and Na__Test__SheetPagingWalkExit__; Na__Test__DrawingTabKeys__ prepared and held for W3-03 (gate item 4.1) | 3.1 Navigation, Controls__Pc, TouchScreen, the mode controller | %(W1-36)s |
| W1-37 | The Colour Palette (folder 54 created): the door, Manager, Picker, config ("Vale Garden Houses Standard", DR-20), stylesheet and README; the Plan Annotations toolbar 1.1.0 whole (its ConfigState getter seam); the palette region in `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` | 3.1 the Plan Annotations toolbar; 3.5 the six files of 54 (landed) | 2.1; %(W1-37)s |
| W1-38 | PanelHost 1.6.0 and the panels sheet whole (LinkedPairRow and ShowLink, the tab hover text, the slider's number box, every panel colour field to the palette, wrapping Scale buttons, the Ref button, one red); Na__Test__ColourPalette__ (55 of 55); UiParity check 4 passes | 3.1 PanelHost, Styles__Panels | %(W1-38)s |
| Gate | FIX-C1: eight stale rows off the AppConfig parity test's allow-list and RowsNote relabelled (`80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs` 1.0.4) | 3.2 the Layout Editor config | - |
| W1-99 | 80 release placeholders resolved to v2.71.3 in 68 files; this pass | none | this pass |

**The audit's records items, continued (WP-S03b-12, ValeVision's half; W1-99).** Checked against the files on
02-Oct-2026:

- Stale per-file logs: SheetChrome 1.8.0 and LeaderGeometry 1.1.0 - CLOSED by W1-26 (TrueVision's 1.14.0 and 1.3.0 taken
  whole with their logs). History - W1-21 took TrueVision's 1.7.0 whole with its log, so this app's renumbered 1.4.1
  (W0-06) is superseded and the repeated 1.3.0 is now TrueVision's own, carried under a '- Legacy :' marker (DR-34 (a))
  and queued for WT-08 (section 7); MarkupBridge's log repeats 1.12.0 the same way (W1-28).
- Every S03b file pair has its row and its state (the package's acceptance): the records, the sheet model's units and
  facade, History, AutoSave, the chrome and markup geometry, MarkupBridge, Groups, SheetSurface and the Paper sheet, the
  title block cells, Modern and the QR cell, DrawingScale, SheetLayout, Classic and the surfaces stylesheet each name
  above the version they took and their seams; no row contradicts section 1.4.
- TrueVision's halves of WP-S03b-12 (SheetSurface's ShowPublished log, PaintOrder's PORT NOTE, the SheetRecords edge
  fields, TD04) stay queued in section 7 (part 1's rows); the continuation's TrueVision-side notes join them there.
''' % {p: rows4(p, '-') for p in CONT})


def WM_INTRO(n_more, n_notes):
    return W('''
- **After the Wave 1 continuation (ValeVision3D v2.71.3, 02-Oct-2026; W1-99).** Six releases became PORTED: v2.39.0
  (Save Sheets says where the sheets went), v2.81.0 (the title-block QR cell, switched off), v2.133.0 (the palette's
  mixer), v2.135.0 (the authoring zoom ceiling), v2.145.0 (the draft after a reload) and v2.146.0 (the three guards round
  the project file). Sixteen more are now PARTIAL, each row saying what landed and what waits: 11 from NOT-CONSIDERED
  (v2.100.0, v2.104.0, v2.109.0, v2.123.0, v2.125.0, v2.127.0, v2.137.0, v2.140.0, v2.141.0, v2.142.0, v2.154.0), 4 from
  PENDING-SIGNOFF (v2.38.0, v2.41.0, v2.48.0, v2.111.0) and 1 from REOPENED (v2.69.0). %(more)s rows already PARTIAL gained
  more (the unnumbered eyedropper row among them), and dated notes on %(notes)s more name the record keys, headers, tests
  or commits the continuation took with no change of class. The newest fully ported release is now v2.146.0; the
  low-water stays v2.28.0. No release Adam has confirmed in TrueVision is among those the continuation carried (v2.155.0's
  confirmed part, the PDF exporter fix, came in v2.71.2); every release it carried is named as unconfirmed in the v2.71.3
  devlog entry (DR-01 (c)).
''' % {'more': n_more, 'notes': n_notes})


S51_NOTE = W('''
- **02-Oct-2026 note (W1-99, ValeVision3D v2.71.3).** The Wave 1 continuation also ran on every default: no answer to
  DR-01..DR-44 or the seven questions arrived. DR-40 items 7-10 stay held (no gesture was touched); items 4 (the
  'margin' and 'areas' undo steps, W1-21) and 6 (vector quality Medium, W1-28) came in on their defaults. Choices made
  inside packages, for Adam's eye: W1-21's RenumberSheets writes no drawing number without a Drawing Register block but
  still numbers the tab order (the literal no-op would leave gaps after a delete; one line either way); W1-26 put
  Modern's Vale brand seam in config (`LayoutEditor__TitleBlock__LogoFallbackText`, a SheetSetup reader and an
  allow-list row - three files outside its list; the W1 gate recommends ratifying it as an orchestrator correction) and
  left SheetSetup's qrCellEnabled fallback TrueVision's `true` (the config ships `false`); W1-22 kept a client's name and
  postal address out of RowsNote and gave DocumentIdNote the Vale measure; W1-25 serves every Open Sans face, Medium
  included, from the AD04 host (DR-21 (a)); W1-37 named the palette "Vale Garden Houses Standard" (DR-20); W1-36 held
  TrueVision's Na__Test__DrawingTabKeys__ for W3-03 (46 of 53 on this tree); W1-28's Doous D01 PDF now covers the 2D
  viewport's caption under a white vector, as the screen always did; W1-07 asks once about every pre-upgrade browser
  draft.
''')

DIM_SPLIT_NOTE = (' ' + note("the Plan Annotations toolbar 1.1.0 carries the same split as a seam - its GetTextSetup "
                             "import from 44's ConfigState__ (W1-37, F.8 C24)"))

S6_OFFERS = W('''

**Offers raised by the Wave 1 continuation (02-Oct-2026, ValeVision3D v2.71.3; W1-99).** None happens on DR-42's default
and TrueVision is not edited (DR-36 (a)); each is recorded so the TrueVision lane can take it with Adam's approval.

| Item | ValeVision source | Status in TrueVision (02-Oct-2026) | Evidence | Next |
|---|---|---|---|---|
| The logo's stand-in text as a config key with a reader | `51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json` `LayoutEditor__TitleBlock__LogoFallbackText` and `ConfigState__SheetSetup__.js`'s logoFallbackText reader (W1-26; DR-43) | OPEN - TrueVision's Modern carries the constant `Na__LeTitleModern__LOGO_FALLBACK_TEXT`; with the key there, Modern would be the same file in both apps below the header | W1-26 Port Record (F5); D-S03b-09 | WT-11 item 9 (held; DR-42 (9)) |
| A draft-guard case judging a base-less draft against an undefined base, for TrueVision's `Na__Test__DraftGuard__.test.cjs` | W1-07's scratch edge check (`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W1-07/judge_edge_check.cjs`; not shipped) | OPEN - TrueVision's test never reaches the case; one planted fault is caught only by the edge check | W1-07 Port Record (follow-up 7) | no package yet (DR-42) |
''')

QR_NOTE_ROW = '| `LE/03` AppConfig `LayoutEditor__TitleBlock__QrCellNote` |'
QR_NOTE_ADD = ' ' + note("reworded here by W1-26 - ValeVision's note names the moved path, a tv-defect row in the "
                         "AppConfig parity test")
ROW124 = '| The 124 TV files with "ValeVision : not yet ported" lines (row above) |'
ROW124_ADD = ' ' + note('the continuation ported about fifty more whole (section 3.9)')

S7_ROWS = W('''

**Added 02-Oct-2026 by the Wave 1 Parity Scribe for the continuation (W1-99, ValeVision3D v2.71.3)**: the TrueVision-side
notes in the continuation's Port Records. Items marked "code" change what TrueVision does and need a TrueVision-lane
package beyond WT-08's comment-only remit, each with Adam's approval.

| TrueVision record | What it says | What is true on 02-Oct-2026 | Draft wording for WT-08 |
|---|---|---|---|
| `LE/07/Na__LayoutEditor__SheetRecords__.js` DEVELOPMENT LOG | no entry for Asset__Samples (v2.58.2, git 5665508c) | In TrueVision's code; ValeVision takes it with SheetRecords 1.39.0 (W1-19) | "Log Asset__Samples under v2.58.2." (W1-19) |
| `LE/07/Na__LayoutEditor__SheetModel__Shapes__.js`, `__Viewports__.js` and `__TextAndDimensions__.js` DEVELOPMENT LOGs | no entries for the hatch on CreateShape and UpdateShape (v2.90.0, git 62dade1c), the site plan patch keys (sitePlanStoreId, git bef15277; v2.89.0's keys) or linePt and dash on CreateDimension and UpdateDimension (v2.152.0, git b24f33a9) | All in TrueVision's code; ValeVision takes the units whole (W1-20) | "Log each under its release; name bef15277 in the TV devlog records note." (W1-20) |
| `LE/07/Na__LayoutEditor__SheetModel__Common__.js` INTEGRATION | SheetRecords "reads Get()"; TrueVision's own History is not named | At the pin SheetRecords imports Get, Uses and KEYS, and History imports Get, Set and KEYS | "Name both importers and the names they take." (W1-20 F5) |
| `LE/07/Na__LayoutEditor__History__.js` DEVELOPMENT LOG | 1.3.0 twice (14-Sep and 19-Sep, the second below the first) | ValeVision carries the log verbatim under a '- Legacy :' marker (W1-21); its own copy had been renumbered 1.4.1 (W0-06) | "Renumber the second 1.3.0." (W1-21 F6) |
| `LE/07/Na__LayoutEditor__SheetModel__.js` and `LE/07/Na__LayoutEditor__AutoSave__.js` DEVELOPMENT LOGs; `Na__Test__SheetsNormaliseOnce__.test.mjs` and `Na__Test__VectorQuality__.test.mjs` | no entries for the Drawing Register's hooks - NotifyRegister, Suspend, Resume and the 'register-updated' ignore (git b6baf301), FinishRegisterDeletion and DiscardSavedDraft (git 32767407); the two tests' 1.0.1 (git b1e0220f) is in no release | In the code; ValeVision takes them whole (W1-07, W1-21, W1-28) | "Log the register hooks; name the tests' 1.0.1 in the TV devlog records note." (W1-07, W1-21 F6, W1-28) |
| `LE/15/Na__LayoutEditor__LeaderGeometry__.js`; `LE/15/Na__LayoutEditor__MarkupBridge__.js` DEVELOPMENT LOG | LeaderGeometry 1.2.0 (18-Sep, the halo) has no devlog heading and the PORT NOTE says "Later versions wait for their own sign-off"; MarkupBridge's log gives 1.12.0 twice (17-Sep, 14-Sep) and 1.13.0 (18-Sep) has no devlog heading | ValeVision carries LeaderGeometry 1.3.0 and MarkupBridge 1.20.0 whole (W1-26, W1-28; MarkupBridge under a '- Legacy :' marker) | "Back-port : done - ValeVision v2.71.3"; renumber the duplicate; name 1.2.0 and 1.13.0 in the TV devlog records note. (W1-26, W1-28) |
| `LE/60/Na__LayoutEditor__PdfExporter__.js` DEVELOPMENT LOG | no entry for Na__LePdf__Filename passing fields.DocumentId (named by the v2.71.0 entry; the line came with commit 32767407) | In TrueVision's code; ValeVision's exporter still passes the drawing number until a package takes the line (the W1 gate's item 4.2) | "Log the file name change in the exporter's own log." (W1-19 F2, W1-22 F1, W1-28 F3) |
| `LE/59/` the five Floor Areas modules' PORT NOTEs, the config and the test; `TrueVision__PLAN__FloorAreas__.md` phase 9 | "ValeVision : not yet ported"; Defaults__FillOpacity 0.5 -> 0.3 in no release (git d76d7638); the test's label-home checks are not in its log and the v2.125.0 entry counts 11 where the file adds 10; phase 9 open | ValeVision carries the five, the config and the test since v2.71.3, inert until W3-10 (W1-27) | "Back-port : done - ValeVision v2.71.3 (inert)"; log the opacity and the checks; phase 9 stays open until Adam signs Floor Areas off. (W1-27) |
| `54/` the three palette PORT NOTEs; `43/Na__PlanAnnotations__Toolbar__.js` | "ValeVision : not yet ported - it waits for Adam's sign-off"; the toolbar has no PORT NOTE | ValeVision carries the palette and the toolbar 1.1.0 since v2.71.3 (W1-37) | "Back-port : done - ValeVision v2.71.3"; give the toolbar a PORT NOTE. (W1-37) |
| `LE/40/Na__LayoutEditor__PanelHost__.js`; the panels' live slider handlers, Panel__Leaders :418-419 and Panel__Shapes :628-629 (code) | no log entry for the slider's number box (git d76d7638); PORT NOTE "Parity : verbatim" (10-Sep); while a slider moves, the suffix shows the whole reading ("40%") | ValeVision carries PanelHost 1.6.0 whole (W1-38) and the same mid-edit reading | "Log the slider box; refresh the PORT NOTE"; the one-line fix per panel is code, for a TrueVision-lane package with Adam's approval (WT-04). (W1-38) |
| TrueVision's devlog (the records note above) | - | Also unnamed by any heading: the PdfFonts commit (ffbaee21), LeaderGeometry 1.2.0 and MarkupBridge 1.13.0 (18-Sep), the site plan store id (bef15277) | Add them to the one records note. (W1-25, W1-26, W1-28, W1-20) |
''')

S81_NOTE = W('''

**02-Oct-2026 note (W1-99, ValeVision3D v2.71.3).** The Wave 1 continuation added one caller: the sheet model's Sheets
unit reads `Na__CfApi__GetLoadedProjectData` to see whether the project has a `LayoutEditor__DrawingRegister` block before
RenumberSheets writes a drawing number (W1-21). The specification's document code moved off the `?project=` token to
ProjectData's `Na__DrawData__GetDocumentCode` (SpecPdf, SpecDocument; W1-25 by OC-09); the specification's save
transport still keys on the project code. The Colour Palette and Floor Areas read their own config JSON beside them,
and PdfFonts the AD04 font host - static files, not storage. No TrueVision transport was copied (gate G6: no
`na-truevision-api`, `NaProjectPortal/` or `/r2/` route in ValeVision's code); the continuation changed neither the
local server, nor the worker, nor the editor-owned key list, and deployed nothing.
''')


def build(text_lines):
    lines = list(text_lines)
    reg = L.register_rows(lines)
    mods = BB.load_map()
    old_bb = {r['i']: r['cells'][11] for r in reg}

    # ---- Module Register flips ----------------------------------------------------
    flipped, seen = [], set()
    for r in reg:
        vv, tv = L.row_paths(r)
        key = vv or tv
        cells = list(r['cells'])
        spec = None
        if key in FLIPS:
            spec = FLIPS[key]
        elif tv in FLIPS and r['sub'] == '3.5':
            spec, key = FLIPS[tv], tv
        if spec:
            if key in seen:
                raise SystemExit('two register rows for %s' % key)
            seen.add(key)
            for col, fn in spec.items():
                cells[col] = fn(cells[col])
            flipped.append(key)
        r['cells'] = cells
    missing = set(FLIPS) - seen
    if missing:
        raise SystemExit('flip keys not found in the register: %s' % sorted(missing))

    # ---- Blocked by: the end-of-continuation map ----------------------------------------
    bb = BB.compute(reg, mods)
    kept_none = []
    for r in reg:
        new = bb[r['i']]
        if new == '-' and old_bb[r['i']] == 'none':
            new = 'none'                                   # left the map's closure in part 1: nothing blocks it
            kept_none.append(r['cells'][0] if not r['cells'][0].startswith('-') else r['cells'][1])
        r['cells'][11] = new
        lines[r['i']] = L.join_row(r['cells'])
    if len(kept_none) != 3:
        raise SystemExit('expected 3 rows to keep none, got %d: %s' % (len(kept_none), kept_none))
    kinds0 = collections.Counter('none' if v == 'none' else '-' if v == '-' else 'list' for v in old_bb.values())
    kinds1 = collections.Counter('none' if r['cells'][11] == 'none' else '-' if r['cells'][11] == '-' else 'list'
                                 for r in reg)
    s3 = [x.format(cleared=kinds1['none'] - kinds0['none'], none0=kinds0['none'], none1=kinds1['none'],
                   list0=kinds0['list'], list1=kinds1['list']) for x in S3_NOTE]

    # ---- Release Watermark ---------------------------------------------------------------
    i4 = lines.index('## 4. Release Watermark')
    i5 = lines.index('## 5. Decisions')
    done, flips = set(), collections.Counter()
    pkg_rows = collections.defaultdict(list)
    more, notes_only = 0, 0
    for n in range(i4, i5):
        ln = lines[n]
        if ln.startswith(EYEDROPPER_ROW):
            c = L.split_row(ln)
            assert c[4].strip('*') == 'PARTIAL', c[4]
            c[10] = c[10].rstrip() + ' ' + note(EYEDROPPER_NOTE)
            lines[n] = L.join_row(c)
            done.add('eyedropper')
            more += 1
            for p in CONT:
                if p in EYEDROPPER_NOTE:
                    pkg_rows[p].append('the eyedropper row')
            continue
        if not ln.startswith('| v2.'):
            continue
        c = L.split_row(ln)
        ver = c[0].split()[0]
        if ver not in WM:
            continue
        spec = WM[ver]
        old_cls = c[4].strip('*')
        if 'cls' in spec:
            new_cls = spec['cls']
            if old_cls == new_cls:
                raise SystemExit('%s: class already %s' % (ver, new_cls))
            flips[(old_cls, new_cls)] += 1
            c[4] = '**%s**' % new_cls if new_cls != 'PORTED' else new_cls
        elif old_cls == 'PARTIAL':
            more += 1
        else:
            notes_only += 1
        if 'vv' in spec:
            assert c[5] == '-', (ver, c[5])
            c[5] = spec['vv']
        if 'vv_app' in spec:
            c[5] = app(c[5], spec['vv_app'])
        if 'pk' in spec:
            have = [p.strip() for p in c[6].split(',') if p.strip() and p.strip() != '-']
            c[6] = ', '.join(have + [p for p in spec['pk'] if p not in have])
        c[10] = note(spec['note']) if c[10].strip() in ('', '-') else c[10].rstrip() + ' ' + note(spec['note'])
        lines[n] = L.join_row(c)
        done.add(ver)
        blob = spec['note'] + ' ' + spec.get('vv', '') + ' ' + spec.get('vv_app', '')
        for p in CONT:
            if re.search(re.escape(p) + r'\b', blob):
                pkg_rows[p].append(ver)
    if set(WM) | {'eyedropper'} != done:
        raise SystemExit('watermark rows not found: %s' % sorted((set(WM) | {'eyedropper'}) - done))
    if dict(flips) != EXPECT_FLIP_COUNTS:
        raise SystemExit('class flips %r, expected %r' % (dict(flips), EXPECT_FLIP_COUNTS))
    counts = collections.Counter()
    for n in range(i4, i5):
        if lines[n].startswith('| v2.') or lines[n].startswith('| (unnumbered'):
            counts[L.split_row(lines[n])[4].strip('*')] += 1
    if sum(counts.values()) != 177:
        raise SystemExit('watermark rows counted: %d, expected 177' % sum(counts.values()))
    open_n = counts['PARTIAL'] + counts['PENDING-SIGNOFF'] + counts['NOT-CONSIDERED'] + counts['REOPENED']
    n_flips = sum(flips.values())
    wm_counts = ['After the Wave 1 continuation (v2.71.3): PORTED %d, PARTIAL %d, PENDING-SIGNOFF %d, NOT-CONSIDERED %d,'
                 % (counts['PORTED'], counts['PARTIAL'], counts['PENDING-SIGNOFF'], counts['NOT-CONSIDERED']),
                 'REOPENED %d (the %d rows the bullet above names moved); every other class unchanged; open **%d**.'
                 % (counts['REOPENED'], n_flips, open_n)]
    words = {29: 'Twenty-nine', 30: 'Thirty', 31: 'Thirty-one', 28: 'Twenty-eight'}
    nums = {11: 'eleven', 12: 'twelve', 13: 'thirteen', 10: 'ten'}
    intro = WM_INTRO(words.get(more, str(more)), nums.get(notes_only, str(notes_only)))
    k = [n for n, ln in enumerate(lines) if ln.startswith('- **After Wave 1 (ValeVision3D v2.71.2, 02-Oct-2026; W1-99).**')]
    assert len(k) == 1
    e = k[0] + 1
    while lines[e].startswith('  '):
        e += 1
    assert lines[e] == '' and lines[e - 1].startswith('  unconfirmed in the v2.71.2 devlog entry (DR-01 (c)).')
    lines[e:e] = intro
    k = [n for n, ln in enumerate(lines) if ln.startswith('After Wave 1 (v2.71.2): PORTED 55, PARTIAL 52')]
    assert len(k) == 1 and lines[k[0] + 1].startswith('rows the bullet above names moved); every other class unchanged; open **108**.')
    assert lines[k[0] + 2] == ''
    lines[k[0] + 2:k[0] + 2] = [''] + wm_counts

    # ---- 3.8: dated notes; 3.9 before the '---' that closes section 3 --------------------------
    k = [n for n, ln in enumerate(lines) if ln.startswith('| Not run | W1-07, W1-19, W1-20, W1-21, W1-22, W1-25,')]
    assert len(k) == 1
    c = L.split_row(lines[k[0]])
    c[3] = c[3].rstrip() + ' ' + NOT_RUN_NOTE
    lines[k[0]] = L.join_row(c)
    k = [n for n, ln in enumerate(lines) if ln == RECORDS_LINE_OLD]
    assert len(k) == 1
    lines[k[0]] = RECORDS_LINE_OLD + ' ' + RECORDS_LINE_NOTE
    i4 = lines.index('## 4. Release Watermark')
    j = i4 - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2] == "- TrueVision's halves of both packages are queued for WT-08 in section 7."
    lines[j - 1:j - 1] = [''] + S39(pkg_rows)
    # ---- section 3: the dated note after part 1's "Refreshed" note ---------------------------
    k = [n for n, ln in enumerate(lines) if ln.startswith('**Refreshed 02-Oct-2026 by W1-99 (ValeVision3D v2.71.2).** "Blocked by"')]
    assert len(k) == 1
    e = k[0]
    while lines[e] != '':
        e += 1
    assert lines[e - 1].startswith('name their ValeVision path; section 3.8 lists the changes by package.')
    lines[e:e] = [''] + s3

    # ---- 1.4, 2.1, 2.3 ----------------------------------------------------------------
    k = [n for n, ln in enumerate(lines) if ln.startswith('- **Wave 1 (ValeVision3D v2.71.2, 02-Oct-2026; W1-99).** The wave')]
    assert len(k) == 1
    e = k[0] + 1
    while lines[e].startswith('  '):
        e += 1
    assert lines[e] == '' and lines[e + 1] == '### 1.5 How this file is kept'
    lines[e:e] = S14_BULLET
    k = [n for n, ln in enumerate(lines) if ln.startswith('**02-Oct-2026 note (W1-99, ValeVision3D v2.71.2).** 49 now holds')]
    assert len(k) == 1
    e = k[0]
    while lines[e] != '':
        e += 1
    assert lines[e + 1] == '### 2.2 Folder renumbering (01-Oct-2026)'
    lines[e:e] = [''] + S21_NOTE
    k = [n for n, ln in enumerate(lines) if ln.startswith('**02-Oct-2026 note (W1-99).** Wave 1 created nine of TrueVision')]
    assert len(k) == 1
    e = k[0]
    while lines[e] != '':
        e += 1
    assert lines[e - 1].endswith('it is not a scribe file.') and lines[e + 1] == '---'
    lines[e:e] = [''] + S23_NOTE

    # ---- 5.1 ---------------------------------------------------------------------------
    k = lines.index('### 5.2 D01 to D40, as they stand on 01-Oct-2026')
    assert lines[k - 1] == '' and lines[k - 2].startswith('  the toolbar 1.9.4) where the audit')
    lines[k - 1:k - 1] = S51_NOTE

    # ---- 6: the dimension-split row's note, then the continuation's offers -----------------------
    arch = lines.index(ARCHIVE_HEAD)
    k = [n for n, ln in enumerate(lines[:arch]) if ln.startswith('| Dimension config and preview splits |')]
    assert len(k) == 1
    c = L.split_row(lines[k[0]])
    c[4] = c[4] + DIM_SPLIT_NOTE
    lines[k[0]] = L.join_row(c)
    k = lines.index('## 7. TrueVision-side records waiting for the TrueVision lane')
    j = k - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2].startswith('| The dead `.na-le-tabs__tab--spec` rule |')
    lines[j - 1:j - 1] = [''] + S6_OFFERS

    # ---- 7: dated notes on part 1's rows, then the continuation's rows -------------------------
    arch = lines.index(ARCHIVE_HEAD)
    for start, add, col in ((QR_NOTE_ROW, QR_NOTE_ADD, 2), (ROW124, ROW124_ADD, 2)):
        k = [n for n, ln in enumerate(lines[:arch]) if ln.startswith(start)]
        assert len(k) == 1, start
        c = L.split_row(lines[k[0]])
        c[col] = c[col] + add
        lines[k[0]] = L.join_row(c)
    k = lines.index('## 8. Transport (DIV-4)')
    j = k - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2].startswith(ROW124)
    lines[j - 1:j - 1] = [''] + S7_ROWS

    # ---- 8.1 note after part 1's note ---------------------------------------------------
    k = [n for n, ln in enumerate(lines) if ln.startswith('**02-Oct-2026 note (W1-99, ValeVision3D v2.71.2).** The facade has more callers')]
    assert len(k) == 1
    e = k[0]
    while lines[e] != '':
        e += 1
    assert lines[e - 1].startswith('code). Wave 1 changed neither the local server')
    lines[e:e] = [''] + S81_NOTE
    return lines, flipped, dict(flips), counts, open_n, kinds0, kinds1, more, notes_only, pkg_rows


APPENDED = [RECORDS_LINE_OLD]          # non-table lines this pass extends (old text kept as a prefix)


def checks(old_lines, new_lines):
    old_t = '\r\n'.join(old_lines)
    new_t = '\r\n'.join(new_lines)
    new_t.encode('ascii')
    for ln in new_lines:
        assert '\r' not in ln and '\n' not in ln
    a_old = old_t[old_t.index('## 9. Archive'):]
    a_new = new_t[new_t.index('## 9. Archive'):]
    assert a_old == a_new, 'Archive changed'
    assert old_t[:old_t.index('## 1. Header')] == new_t[:new_t.index('## 1. Header')], 'preamble changed'
    stop = new_lines.index(ARCHIVE_HEAD)
    cur, bad = None, []
    for n, ln in enumerate(new_lines[:stop]):
        if ln.startswith('| ') and n + 1 < len(new_lines) and new_lines[n + 1].startswith('|---'):
            cur = len(L.split_row(ln))
            continue
        if ln.startswith('|---'):
            continue
        if ln.startswith('| '):
            if cur is None or len(L.split_row(ln)) != cur:
                bad.append((n + 1, len(L.split_row(ln)), cur))
        elif not ln.startswith('|'):
            cur = None
    assert not bad, 'table rows with the wrong column count: %r' % bad[:5]
    cur, bad = None, []
    for n, ln in enumerate(new_lines[:stop]):
        if ln.startswith('| ') and n + 1 < len(new_lines) and new_lines[n + 1].startswith('|---'):
            cur = ln.count('|')
            continue
        if ln.startswith('| ') and ln.count('|') != cur:
            bad.append((n + 1, ln.count('|'), cur))
    assert not bad, 'table rows with a bare pipe in a cell: %r' % bad[:5]
    reg = L.register_rows(new_lines)
    assert len(reg) == 610, len(reg)
    assert all(r['cells'][11] for r in reg), 'an empty Blocked by cell'
    # every old non-table line is still there, in order (the appended-to lines as prefixes)
    old_stop = old_lines.index(ARCHIVE_HEAD)
    in_tables = lambda ln: ln.startswith('| ') and not ln.startswith('|---')
    keep = [ln for ln in old_lines[:old_stop] if not in_tables(ln)]
    it = iter(new_lines[:stop])
    for ln in keep:
        for cand in it:
            if cand == ln or (ln in APPENDED and cand.startswith(ln + ' **[02-Oct-2026 note (W1-99, v2.71.3)')):
                break
        else:
            raise AssertionError('old line lost or out of order: %r' % ln[:100])
    # every old table row is still there (unchanged), or is a row this pass is allowed to change
    new_set = set(new_lines[:stop])
    changed = [ln for ln in old_lines[:old_stop] if in_tables(ln) and ln not in new_set]
    return changed


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    raw = open(L.LEDGER, 'rb').read()
    if mode == '--restore':
        pre = open(PRE, 'rb').read()
        cand = open(CAND, 'rb').read()
        if sha1(raw) != sha1(cand):
            raise SystemExit('REFUSED: the ledger is not this pass\'s candidate (%s)' % sha1(raw)[:8])
        with open(L.LEDGER, 'wb') as fh:
            fh.write(pre)
        print('restored the pre-image', sha1(pre)[:8])
        return
    if sha1(raw) != EXPECT:
        raise SystemExit('STOPPED: the ledger is not at W1-99 part 1\'s final SHA-1 (%s != %s)' % (sha1(raw)[:8], EXPECT[:8]))
    old_lines = L.read_lines()
    new_lines, flipped, flips, counts, open_n, kinds0, kinds1, more, notes_only, pkg_rows = build(old_lines)
    changed = checks(old_lines, new_lines)
    out = '\r\n'.join(new_lines).encode('ascii')
    with open(CAND, 'wb') as fh:
        fh.write(out)
    print('register rows changed by spec: %d; Blocked by none %d -> %d, list %d -> %d, - %d -> %d'
          % (len(flipped), kinds0['none'], kinds1['none'], kinds0['list'], kinds1['list'], kinds0['-'], kinds1['-']))
    print('watermark flips:', flips, '; PARTIAL rows gaining more:', more, '; notes only:', notes_only)
    print('classes after:', dict(counts), '; open', open_n)
    print('rows per package:', {p: len(v) for p, v in sorted(pkg_rows.items())})
    print('old table rows rewritten: %d' % len(changed))
    print('candidate: %d -> %d bytes, sha1 %s' % (len(raw), len(out), sha1(out)[:8]))
    if mode == '--build':
        return
    if mode == '--apply':
        os.makedirs(os.path.dirname(PRE), exist_ok=True)
        if not os.path.exists(PRE):
            with open(PRE, 'wb') as fh:
                fh.write(raw)
        assert sha1(open(PRE, 'rb').read()) == EXPECT
        cur = open(L.LEDGER, 'rb').read()
        if sha1(cur) != EXPECT:
            raise SystemExit('STOPPED: the ledger changed while the candidate was built')
        tmp = L.LEDGER + '.w1-99c.tmp'
        with open(tmp, 'wb') as fh:
            fh.write(out)
        os.replace(tmp, L.LEDGER)
        assert sha1(open(L.LEDGER, 'rb').read()) == sha1(out)
        print('written', L.LEDGER)
        return
    raise SystemExit(__doc__)


if __name__ == '__main__':
    main()
