"""W0-15 - Layout Editor config foundation (build, check, apply, restore).

Builds the eight ValeVision files of LE/03__Core__Config from TrueVision's
text at the pin (b2aa9151, saved by fetch_and_preimage.py under tv_at_pin/)
plus ONLY the seams the package lists (and the identity seams P3/P15 name),
every replacement asserted to match exactly once.

Usage
  python apply_w0_15.py --build      write the eight outputs to out/ and check them (no repo write)
  python apply_w0_15.py --apply      drift check against the pre-images, then write the eight live files
  python apply_w0_15.py --check-live live files == the built outputs
  python apply_w0_15.py --restore    write the pre-images back (byte for byte)

Line endings: the six whole-file ports (AppConfig, barrel, KeyMap, SheetSetup,
ToolSetup, EditorSetup) and the key file are written as git show returns TV's
text (LF). Readers gets a PORT NOTE only and keeps its own CRLF.
Never run from a bash heredoc; this file is written with the Write tool.
"""
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV_DIR = os.path.join(HERE, 'tv_at_pin')
PRE_DIR = os.path.join(HERE, 'preimage')
OUT_DIR = os.path.join(HERE, 'out')
VV_ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
CFG_REL = '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/'

FILES = [
    'Na__Hotkeys__DrawingTabs__.json',
    'Na__LayoutEditor__AppConfig__.json',
    'Na__LayoutEditor__ConfigState__.js',
    'Na__LayoutEditor__ConfigState__EditorSetup__.js',
    'Na__LayoutEditor__ConfigState__KeyMap__.js',
    'Na__LayoutEditor__ConfigState__Readers__.js',
    'Na__LayoutEditor__ConfigState__SheetSetup__.js',
    'Na__LayoutEditor__ConfigState__ToolSetup__.js',
]

PORT_DATE = '01-Oct-2026'
VVREL = '{{VVREL:W0-15}}'

AD04_BASE = 'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/'
AD04_LIGHT = 'AD04_03_-_Standard-Font_-_Open-Sans-Light.ttf'
AD04_REGULAR = 'AD04_01_-_Standard-Font_-_Open-Sans-Regular.ttf'
AD04_SEMIBOLD = 'AD04_02_-_Standard-Font_-_Open-Sans-SemiBold.ttf'
JSPDF_35 = './02__Src__AppModules/35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js'
PDFJS_07 = './04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.min.js'
PDFJS_07_WORKER = './04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.worker.min.js'
STATEMENT_CSS_URL = ('https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/'
                     '51__System__LayoutEditor/52__Feature__StatementWriter/08__Style__Stylesheets/'
                     'Na__LayoutEditor__Styles__Statement__Document__.css')


# -----------------------------------------------------------------------------
# helpers
# -----------------------------------------------------------------------------

def read_bytes(path):
    with open(path, 'rb') as f:
        return f.read()


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def sub_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit('REPLACEMENT %s: expected 1 match, found %d\n  old: %r' % (label, n, old[:200]))
    return text.replace(old, new, 1)


def jdump(value):
    return json.dumps(value, ensure_ascii=False)


def key_span(text, key):
    """(key_start, value_start, value_end) of the member "key": <value>. Must be unique."""
    pat = re.compile(r'"' + re.escape(key) + r'"\s*:\s*')
    hits = list(pat.finditer(text))
    if len(hits) != 1:
        raise SystemExit('KEY %s: expected 1 member, found %d' % (key, len(hits)))
    m = hits[0]
    vstart = m.end()
    _, vend = json.JSONDecoder().raw_decode(text, vstart)
    return m.start(), vstart, vend


def set_value(text, key, value_text, label=None):
    _, vs, ve = key_span(text, key)
    return text[:vs] + value_text + text[ve:]


def get_value_text(text, key):
    _, vs, ve = key_span(text, key)
    return text[vs:ve]


def line_bounds(text, pos):
    ls = text.rfind('\n', 0, pos) + 1
    le = text.find('\n', pos)
    return ls, (len(text) if le == -1 else le)


def delete_member(text, key):
    """Delete a one-line member '<indent>"key": value,\n' (it must end with a comma)."""
    ks, vs, ve = key_span(text, key)
    ls, le = line_bounds(text, ks)
    line = text[ls:le]
    if not line.rstrip().endswith(',') or text[ve:le].strip() != ',':
        raise SystemExit('DELETE %s: not a one-line member ending in a comma: %r' % (key, line[:120]))
    return text[:ls] + text[le + 1:]


def insert_after_member(text, key, new_lines):
    """Insert members after the one-line member "key" (which must end with a comma)."""
    ks, vs, ve = key_span(text, key)
    ls, le = line_bounds(text, ks)
    if text[ve:le].strip() != ',':
        raise SystemExit('INSERT after %s: member is not followed by a comma on its line' % key)
    indent = re.match(r'[ \t]*', text[ls:le]).group(0)
    block = ''.join(indent + nl + '\n' for nl in new_lines)
    return text[:le + 1] + block + text[le + 1:]


# -----------------------------------------------------------------------------
# AppConfig
# -----------------------------------------------------------------------------

def build_appconfig(tv_text, vv):
    t = tv_text
    VVB = lambda block, key: vv['LayoutEditor__' + block + '__Config']['LayoutEditor__' + block + '__' + key]
    LAB = lambda key: vv['LayoutEditor__Labels__Config']['LayoutEditor__Labels__' + key]

    # STYLE | Open Sans first is withheld with the PDF fonts (W1-25): value and the two notes that describe it
    for k in ('Description', 'FontFamily', 'TitleValueWeightNote'):
        t = set_value(t, 'LayoutEditor__Style__' + k, jdump(VVB('Style', k)))

    # TITLE BLOCK | brand values (16 brand values, K2 V1) and their notes
    for k in ('LogoAssetPath', 'LogoCellWidthMm', 'LogoMaxHeightMm', 'LogoAspectWidthOverHeight',
              'LogoAspectWidthOverHeightNote', 'LogoPaddingVMm', 'LogoPaddingHMm', 'DrawnByDefault'):
        t = set_value(t, 'LayoutEditor__TitleBlock__' + k, jdump(VVB('TitleBlock', k)))
    t = delete_member(t, 'LayoutEditor__TitleBlock__LogoCellWidthMmNote')      # <-- TrueVision's logo cell history (40 mm, 4 mm air); the Vale cell is 34

    # TITLE BLOCK | identity: the numbering-schema notes are TrueVision's own file
    t = sub_once(t, 'measures 20.4. See TrueVision__NOTES__DrawingNumberingSchema__.md."',
                 'measures 20.4. See the DrawingNumberingSchema NOTES in TrueVision3D."', 'DocumentIdNote')

    # TITLE BLOCK | Rows and their note withheld until the Document ID switch (W1-22)
    t = set_value(t, 'LayoutEditor__TitleBlock__RowsNote', jdump(VVB('TitleBlock', 'RowsNote')))
    rows = get_value_text(t, 'LayoutEditor__TitleBlock__Rows')
    rows2 = sub_once(rows, '{ "Key": "DocumentId",    "Label": "Document ID",   "WidthMm": 24 },',
                     '{ "Key": "DrawingNumber", "Label": "Drawing No.",   "WidthMm": 24 },', 'Rows DocumentId')
    rows2 = sub_once(rows2, '{ "Key": "Revision",      "Label": "Rev",           "WidthMm": 28, "ValuePrefix": "Revision" },',
                     '{ "Key": "Revision",      "Label": "Rev",           "WidthMm": 28 },', 'Rows ValuePrefix')
    t = set_value(t, 'LayoutEditor__TitleBlock__Rows', rows2)

    # TITLE BLOCK | a client's postal address is not copied into Vale's config (identity / privacy)
    t = sub_once(t, "RB05's address, 'West Beacon Farm, Deans Lane, Woodhouse Eaves, Leicestershire, LE12 8TE', had already grown",
                 "RB05's site address had already grown", 'RowWidthFactorByPaperNote')

    # TITLE BLOCK | the Project QR cell lands switched off (DR-12)
    t = set_value(t, 'LayoutEditor__TitleBlock__QrCellEnabled', 'false')

    # TITLE BLOCK | Classic scan stays on the 35 copy until the vendor/asset copies land (W0-16)
    scans = get_value_text(t, 'LayoutEditor__TitleBlock__ClassicScanAssets')
    scans2 = scans.replace('./01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png',
                           VVB('TitleBlock', 'ClassicScanAssets')['A3'])
    if scans2.count(VVB('TitleBlock', 'ClassicScanAssets')['A3']) != 4:
        raise SystemExit('ClassicScanAssets: expected 4 paths')
    t = set_value(t, 'LayoutEditor__TitleBlock__ClassicScanAssets', scans2)

    # TITLE BLOCK | Classic anchors: ValeVision keeps its DrawingNumber anchor beside TrueVision's DocumentId (W1-22 retires it)
    anchors = get_value_text(t, 'LayoutEditor__TitleBlock__ClassicFieldAnchors')
    vv_dn = vv['LayoutEditor__TitleBlock__Config']['LayoutEditor__TitleBlock__ClassicFieldAnchors']['A3']['DrawingNumber']
    dn_line = '"DrawingNumber": { "X": %s, "Y": %s, "FontMm": %s, "Align": %s },' % (
        jdump(vv_dn['X']), jdump(vv_dn['Y']), jdump(vv_dn['FontMm']), jdump(vv_dn['Align']))
    old_doc = '                "DocumentId":    { "X": 330, "Y": 289, "FontMm": 2.2, "Align": "left" },\n'
    anchors2 = sub_once(anchors, old_doc, old_doc + '                ' + dn_line + '\n', 'anchors DrawingNumber')
    t = set_value(t, 'LayoutEditor__TitleBlock__ClassicFieldAnchors', anchors2)

    # SCALES | 1:200 and its note withheld (W1-22, DR-17)
    t = set_value(t, 'LayoutEditor__Scales__Description', jdump(VVB('Scales', 'Description')))
    t = set_value(t, 'LayoutEditor__Scales__AvailableScaleDenominators', '[20, 50, 100]')

    # PANELS | the fold group's new sections withheld (W2-29, W3-07, W3-09, W3-10) with the note naming them
    t = set_value(t, 'LayoutEditor__Panels__FocusNote', jdump(VVB('Panels', 'FocusNote')))
    acc = VVB('Panels', 'AccordionSections')
    t = set_value(t, 'LayoutEditor__Panels__AccordionSections', '[ ' + ', '.join(jdump(a) for a in acc) + ' ]')

    # PLAN DOORS | ValeVision's linetype category key (K2 K3)
    t = set_value(t, 'LayoutEditor__PlanDoors__SwingCategoryKeys', '["ValeVision__Linetype__DoorSwings"]')

    # SELECTION | TrueVision's three misplaced Measure labels are not copied (TV defect; VV keeps them in Labels)
    sel_start = t.index('"LayoutEditor__Selection__Config"')
    sel_end = t.index('"LayoutEditor__EditScope__Config"')
    for k in ('MeasureOffsetAgain', 'MeasureNoOffsetSide', 'MeasureDimOffsetTitle'):
        at = t.index('"LayoutEditor__Labels__' + k + '"')
        if not (sel_start < at < sel_end):
            raise SystemExit('expected %s inside the Selection block' % k)
        t = delete_member(t, 'LayoutEditor__Labels__' + k)
        sel_end = t.index('"LayoutEditor__EditScope__Config"')

    # PDF | brand, the 35 jsPDF path until W0-16, Open Sans described with W1-25, fonts per DR-21's default
    for k in ('Description', 'Author', 'Creator', 'JsPdfScriptPath'):
        t = set_value(t, 'LayoutEditor__Pdf__' + k, jdump(VVB('Pdf', k)))
    t = set_value(t, 'LayoutEditor__Pdf__FontBasePath', jdump(AD04_BASE))
    t = set_value(t, 'LayoutEditor__Pdf__FontCdnBase', jdump(AD04_BASE))
    t = sub_once(t, 'FontCdnBase is the fallback, matching Na__CoreUi__Styles__Fonts__.css."',
                 'FontCdnBase is the fallback, matching Na__CoreUi__Styles__Fonts__.css. In ValeVision both name the AD04 '
                 'copies that stylesheet already loads (there is no same-origin copy yet), so each cut is fetched once; '
                 'move both, with the stylesheet, when a Vale-owned copy is named."', 'FontsNote')
    fonts = get_value_text(t, 'LayoutEditor__Pdf__Fonts')
    fonts2 = sub_once(fonts, '"CommonFont-01__OpenSans__Light__.ttf"', jdump(AD04_LIGHT), 'font light')
    fonts2 = sub_once(fonts2, '"CommonFont-01__OpenSans__Regular__.ttf"', jdump(AD04_REGULAR), 'font regular')
    fonts2 = sub_once(fonts2, '"CommonFont-01__OpenSans__SemiBold__.ttf"', jdump(AD04_SEMIBOLD), 'font semibold')
    t = set_value(t, 'LayoutEditor__Pdf__Fonts', fonts2)

    # SPECIFICATION | ValeVision's file names (sibling of project.json; no legacy name)
    t = sub_once(t, '(FileName) beside TrueVision__ProjectData__.json, kept locally',
                 '(FileName) beside project.json, kept locally', 'Specification Description')
    t = sub_once(t, 'appended to the project code when no number has been typed, so PS01 gives PS01_SPEC; type PS01_T02_SPEC over it to sit with the sheets."',
                 'appended to the project code when no number has been typed, so PS01 gives PS01_SPEC."', 'Specification RevisionNote (no job stages, DR-11)')
    t = set_value(t, 'LayoutEditor__Specification__FileName', jdump(VVB('Specification', 'FileName')))
    t = set_value(t, 'LayoutEditor__Specification__LegacyFileName', '""')

    # MARGIN NOTES | the description is reworded with the toolbar's Notes button (W1-35, R3 c1)
    t = set_value(t, 'LayoutEditor__MarginNotes__Description', jdump(VVB('MarginNotes', 'Description')))

    # LABELS | 13 rewordings withheld (W1-32, W1-34, W1-35, W5-01)
    for k in ('TabLabelFormatNote', 'StatusTitle', 'SheetNameCodeTitle', 'NoSheets', 'TabsPreviousTitle',
              'TabsNextTitle', 'ToolMoveTitle', 'ToolSelectTitle', 'SpecificationTab', 'PdfMarginOverflow',
              'MeasureIdleTitle', 'MeasurePaperTitle', 'MeasureViewportTitle'):
        t = set_value(t, 'LayoutEditor__Labels__' + k, jdump(LAB(k)))
    # LABELS | identity: ValeVision's project folder replaces TrueVision's content folder (DR-29 A)
    t = sub_once(t, 'Export Site Plan Data, into 30__TrueVision__AppContent/SitePlan__DrawingData."',
                 "Export Site Plan Data, into the project folder's SitePlan__DrawingData.\"", 'SitePlanNoData')
    # LABELS | ValeVision-only labels kept where ValeVision has them
    t = insert_after_member(t, 'LayoutEditor__Labels__NoSheets',
                            ['"LayoutEditor__Labels__' + k + '": ' + jdump(LAB(k)) + ',' for k in ('LayoutModeLabel', 'LayoutModeHint', 'LayoutModeOffNote')])
    t = insert_after_member(t, 'LayoutEditor__Labels__SpecificationTabUnsynced',
                            ['"LayoutEditor__Labels__' + k + '": ' + jdump(LAB(k)) + ',' for k in ('MarginToggle', 'MarginToggleTitle')])
    t = insert_after_member(t, 'LayoutEditor__Labels__MeasureDimEndTitle',
                            ['"LayoutEditor__Labels__' + k + '": ' + jdump(LAB(k)) + ',' for k in ('MeasureOffsetAgain', 'MeasureNoOffsetSide', 'MeasureDimOffsetTitle')])

    # DRAWING REGISTER | VV values (K2 V2: no PlanVision path; DR-11 default: no job stages, {project}_{drawing}; Vale logo aspect)
    t = set_value(t, 'LayoutEditor__DrawingRegister__PdfJsScriptPath', jdump(PDFJS_07))
    t = set_value(t, 'LayoutEditor__DrawingRegister__PdfJsWorkerPath', jdump(PDFJS_07_WORKER))
    t = sub_once(t, 'they build the identifier the title block prints. See TrueVision__NOTES__DrawingNumberingSchema__.md."',
                 'they build the identifier the title block prints. See the DrawingNumberingSchema NOTES in TrueVision3D."', 'ColumnsSchemaNote')
    t = set_value(t, 'LayoutEditor__DrawingRegister__Phases', '[]')
    t = set_value(t, 'LayoutEditor__DrawingRegister__DefaultPhaseNote', jdump(
        "What a sheet is read as when its phase has never been set, including every drawing made before the phase "
        "existed. Empty until Vale's own stage list is supplied (Phases is empty too), so a sheet declares no phase and "
        "its document code reads {project}_{drawing}. Set the two together, and before the first drawing is published: "
        "a document code names published folders."))
    t = set_value(t, 'LayoutEditor__DrawingRegister__DefaultPhase', '""')
    t = set_value(t, 'LayoutEditor__DrawingRegister__DocumentCodeFormat', '"{project}_{drawing}"')
    t = set_value(t, 'LayoutEditor__DrawingRegister__LetterheadLogoAspect', '4.5')

    # STATEMENT | VV-only switch (DR-10 default: off), VV names, VV public origin, identity wording
    t = insert_after_member(t, 'LayoutEditor__Statement__Description', [
        '"LayoutEditor__Statement__Enabled": false,',
        '"LayoutEditor__Statement__EnabledNote": ' + jdump(
            "ValeVision only: whether the Design Statements tab is built at all. Off until it is decided that Vale "
            "projects carry written statements; the Statement Writer's code is present either way, so switching it on "
            "is this one value. TrueVision has no such switch and always builds the tab.") + ',',
    ])
    t = sub_once(t, 'A statement is a FOLDER under FolderName in the project\'s TrueVision content, holding',
                 'A statement is a FOLDER under FolderName in the project\'s folder, holding', 'Statement Description')
    t = set_value(t, 'LayoutEditor__Statement__IndexFileName', '"ValeVision__StatementDocs__.json"')
    t = sub_once(t, 'Typing \\"Design & Access Statement\\" into project RB05 therefore gives 02__DesignAccessStatement and RB05_T01_S02__WestFarm__DesignAccessStatement__.md.',
                 'Typing \\"Design & Access Statement\\" therefore gives the folder 02__DesignAccessStatement and a markdown file named by FilePattern, ending __DesignAccessStatement__.md.',
                 'Statement NamingNote')
    t = sub_once(t, 'written to the local file through the ProjectVision server.',
                 'written to the local file through the local server.', 'Statement AutoSaveLocalNote')
    t = set_value(t, 'LayoutEditor__Statement__StylesheetUrl', jdump(STATEMENT_CSS_URL))
    return t


# -----------------------------------------------------------------------------
# PORT NOTE blocks
# -----------------------------------------------------------------------------

TV_PN_SPLIT = ('// PORT NOTE:\n'
               '// - Ported from   : the ValeVision3D v2.47.0 split of the same module (same unit, same functions)\n'
               '// - Parity        : verbatim (moved code)\n')


def pn(lines):
    return '// PORT NOTE:\n' + ''.join('// ' + l + '\n' if l else '//\n' for l in lines)


def build_keymap(tv):
    t = tv
    t = sub_once(t, '// TRUEVISION3D - LAYOUT EDITOR - CONFIG STATE - KEY MAP', '// VALEVISION3D - LAYOUT EDITOR - CONFIG STATE - KEY MAP', 'banner')
    t = sub_once(t, TV_PN_SPLIT + '// - Divergences   : Console prefix only.\n// - Back-port     : n/a (this IS the back-port)\n', pn([
        '- Authored in   : ValeVision3D first (1.0.0, split out of Na__LayoutEditor__ConfigState__.js on',
        '                  15-Sep-2026, v2.47.0; 1.0.1, its key file renamed Na__Hotkeys__DrawingTabs__.json,',
        '                  {{VVREL:W0-03}}); since ported back whole from TrueVision3D 1.11.0 (HEAD b2aa9151)',
        '- Source version: 1.11.0 (TrueVision3D v2.151.0, 22-Sep-2026; read at b2aa9151)',
        '- Ported on     : ' + PORT_DATE + ' for ValeVision3D ' + VVREL,
        '- Parity        : verbatim',
        '- Divergences   :',
        '  - Console prefix and banner read ValeVision3D.',
        '- Back-port     : none.',
    ]), 'port note')
    t = sub_once(t, "console.warn('[TrueVision3D LayoutEditor] Key map fetch failed ('", "console.warn('[ValeVision3D LayoutEditor] Key map fetch failed ('", 'console 1')
    t = sub_once(t, "console.warn('[TrueVision3D LayoutEditor] Key map unreadable - '", "console.warn('[ValeVision3D LayoutEditor] Key map unreadable - '", 'console 2')
    return t


def build_barrel(tv):
    t = tv
    t = sub_once(t, '// TRUEVISION3D - LAYOUT EDITOR - CONFIG STATE\n', '// VALEVISION3D - LAYOUT EDITOR - CONFIG STATE\n', 'banner')
    t = sub_once(t, ('// - The mode controller calls SetAppConfig then Ready from its Initialize,\n'
                     '//   which Index.html calls as the app loads; every other module in this\n'
                     '//   folder reads through the getters.\n'),
                 ('// - The mode controller calls SetAppConfig then Ready as it initialises, which\n'
                  '//   the loader (01__Core__Loader) starts the first time the editor is used;\n'
                  '//   every other Layout Editor module reads through the getters.\n'), 'integration')
    t = sub_once(t, ('// PORT NOTE:\n'
                     '// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__ConfigState__.js\n'
                     '// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n'
                     '// - Parity        : verbatim\n'
                     '// - Divergences   : Console prefix, header and folder numbers only.\n'
                     '// - Back-port     : n/a (this IS the back-port)\n'), pn([
        '- Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from Lantern',
        "                  Designer's config blocks; split into its units at 1.15.0, v2.47.0; ValeVision's last",
        '                  version 1.17.0, 20-Sep-2026); since ported back whole from TrueVision3D 1.29.0',
        '                  (HEAD b2aa9151)',
        '- Source version: 1.29.0 (TrueVision3D v2.149.0, 22-Sep-2026; read at b2aa9151)',
        '- Ported on     : ' + PORT_DATE + ' for ValeVision3D ' + VVREL,
        '- Parity        : adapted (header only: the code is verbatim)',
        '- Divergences   :',
        '  - INTEGRATION names the loader (01__Core__Loader), which starts the mode controller the',
        "    first time the editor is used, where TrueVision's index page starts it as the app loads.",
        '  - Banner reads ValeVision3D. (No console output in this file.)',
        '- Back-port     : none.',
    ]), 'port note')
    return t


def build_readers_vv(vv_bytes):
    crlf = b'\r\n' in vv_bytes
    t = vv_bytes.decode('utf-8').replace('\r\n', '\n')
    t = sub_once(t, ('// PORT NOTE:\n'
                     '// - Ported from   : split out of Na__LayoutEditor__ConfigState__.js (15-Sep-2026, ValeVision3D v2.47.0)\n'
                     '// - Parity        : verbatim (moved code)\n'
                     '// - Divergences   : n/a\n'
                     "// - Back-port     : the same split applies to TrueVision's copy.\n"), pn([
        '- Authored in   : ValeVision3D first (1.0.0, split out of Na__LayoutEditor__ConfigState__.js on',
        '                  15-Sep-2026, v2.47.0); TrueVision3D took the same split in v2.55.0, and its copy',
        '                  at HEAD b2aa9151 is this 1.0.0',
        '- Source version: 1.0.0 (TrueVision3D v2.55.0, 15-Sep-2026; read at b2aa9151)',
        '- Ported on     : ' + PORT_DATE + ' for ValeVision3D ' + VVREL + ' (this PORT NOTE only; the code was already equal)',
        '- Parity        : verbatim',
        '- Divergences   :',
        '  - Console prefix and banner read ValeVision3D.',
        '- Back-port     : none (TrueVision took the split in v2.55.0).',
    ]), 'readers port note')
    if crlf:
        t = t.replace('\n', '\r\n')
    return t.encode('utf-8')


def build_sheetsetup(tv):
    t = tv
    t = sub_once(t, '// TRUEVISION3D - LAYOUT EDITOR - CONFIG STATE - SHEET SETUP', '// VALEVISION3D - LAYOUT EDITOR - CONFIG STATE - SHEET SETUP', 'banner')
    old_pn = (TV_PN_SPLIT +
              '// - Divergences   : GetPlanDoorsSetup, GetModelSourceSetup and PdfFontCuts\n'
              '//                   (TrueVision only), the site plan scales, the 1:200 in the\n'
              '//                   scales fallback and the Hide swings fallbacks, the PDF fonts,\n'
              "//                   TrueVision's own defaults (style font, logo aspect, drawn\n"
              '//                   by, PDF author, creator and jsPDF path) and one word in\n'
              '//                   the raster comment.\n'
              '// - Back-port     : n/a (this IS the back-port)\n')
    t = sub_once(t, old_pn, pn([
        '- Authored in   : ValeVision3D first (1.0.0, split out of Na__LayoutEditor__ConfigState__.js on',
        "                  15-Sep-2026, v2.47.0; ValeVision's last version, 1.3.0 of 20-Sep-2026, stood at",
        "                  TrueVision's 1.4.0); since ported back whole from TrueVision3D 1.9.0 (HEAD b2aa9151)",
        '- Source version: 1.9.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151)',
        '- Ported on     : ' + PORT_DATE + ' for ValeVision3D ' + VVREL,
        '- Parity        : adapted',
        '- Divergences   :',
        '  - Banner reads ValeVision3D. (No console output in this file.)',
        "  - ValeVision's own defaults: the Vale logo cell (34 mm wide, 5.5 mm high, aspect 4.5 for the",
        '    2000 x 444 asset, paddings 1.8 and 2.5), Drawn By "Vale Garden Houses", PDF author "Vale',
        '    Garden Houses Limited" and creator "ValeVision3D Layout Editor".',
        "  - As the shipped config does until each is switched on: the title block rows keep DrawingNumber",
        '    ("Drawing No.", no Revision prefix) until the Document ID, the scales stop at 1:100 until 1:200,',
        '    and the style font keeps Helvetica first until the PDF embeds Open Sans.',
        '  - jsPdfScriptPath stays on 35__System__PageLayoutSystem until the vendor copy is in place.',
        "  - Door swing linework is ValeVision__Linetype__DoorSwings (this app's linetype keys).",
        "  - PDF fonts: the AD04 Open Sans cuts the screen's @font-face already loads, for the base path",
        '    and the CDN base alike, until a Vale-owned copy is named.',
        '- Back-port     : none.',
    ]), 'port note')
    t = sub_once(t, ("{ Key : 'Title', Label : 'Drawing Title', WidthMm : 60, Flex : 1 }, { Key : 'DocumentId', Label : 'Document ID', WidthMm : 24 },   "
                     "// <-- The title takes what the paper has left; the id is the whole identifier, PS01_T02_D01"),
                 ("{ Key : 'Title', Label : 'Drawing Title', WidthMm : 60, Flex : 1 }, { Key : 'DrawingNumber', Label : 'Drawing No.', WidthMm : 24 },   "
                  "// <-- The title takes what the paper has left"), 'rows 1')
    t = sub_once(t, ("{ Key : 'Revision', Label : 'Rev', WidthMm : 28, ValuePrefix : 'Revision' }, { Key : 'Scale', Label : 'Scale', WidthMm : 28 },   "
                     "// <-- The four small cells are one module, sized for the widest thing any of them says; Rev prints \"Revision A\""),
                 ("{ Key : 'Revision', Label : 'Rev', WidthMm : 28 }, { Key : 'Scale', Label : 'Scale', WidthMm : 28 },   "
                  "// <-- The four small cells are one module, sized for the widest thing any of them says"), 'rows 2')
    t = sub_once(t, '        scales     : [ 20, 50, 100, 200 ],\n', '        scales     : [ 20, 50, 100 ],\n', 'scales')
    t = sub_once(t, "swingCategoryKeys   : [ 'TrueVision__Linetype__DoorSwings' ],", "swingCategoryKeys   : [ 'ValeVision__Linetype__DoorSwings' ],", 'swing')
    t = sub_once(t, "FileName : 'CommonFont-01__OpenSans__Light__.ttf' }", "FileName : '" + AD04_LIGHT + "' }", 'font L')
    t = sub_once(t, "FileName : 'CommonFont-01__OpenSans__Regular__.ttf' }", "FileName : '" + AD04_REGULAR + "' }", 'font R')
    t = sub_once(t, "FileName : 'CommonFont-01__OpenSans__SemiBold__.ttf' }", "FileName : '" + AD04_SEMIBOLD + "' }", 'font S')
    t = sub_once(t, "Na__LeCfg__Val('Style', 'FontFamily', \"'Open Sans', Helvetica, Arial, sans-serif\")",
                 "Na__LeCfg__Val('Style', 'FontFamily', \"Helvetica, Arial, 'Open Sans', sans-serif\")", 'style font')
    t = sub_once(t, "Na__LeCfg__Num('TitleBlock', 'LogoCellWidthMm', 40)", "Na__LeCfg__Num('TitleBlock', 'LogoCellWidthMm', 34)", 'logo cell')
    t = sub_once(t, "Na__LeCfg__Num('TitleBlock', 'LogoMaxHeightMm', 8)", "Na__LeCfg__Num('TitleBlock', 'LogoMaxHeightMm', 5.5)", 'logo max h')
    t = sub_once(t, "Na__LeCfg__Num('TitleBlock', 'LogoAspectWidthOverHeight', 4.096)", "Na__LeCfg__Num('TitleBlock', 'LogoAspectWidthOverHeight', 4.5)", 'logo aspect')
    t = sub_once(t, "Na__LeCfg__Num('TitleBlock', 'LogoPaddingVMm', 1.2)", "Na__LeCfg__Num('TitleBlock', 'LogoPaddingVMm', 1.8)", 'logo pad v')
    t = sub_once(t, "Na__LeCfg__Num('TitleBlock', 'LogoPaddingHMm', 4),      //", "Na__LeCfg__Num('TitleBlock', 'LogoPaddingHMm', 2.5),    //", 'logo pad h')
    t = sub_once(t, "Na__LeCfg__Val('TitleBlock', 'DrawnByDefault', 'Noble Architecture')", "Na__LeCfg__Val('TitleBlock', 'DrawnByDefault', 'Vale Garden Houses')", 'drawn by')
    t = sub_once(t, "Na__LeCfg__Val('Pdf', 'Author', 'Noble Architecture Ltd')", "Na__LeCfg__Val('Pdf', 'Author', 'Vale Garden Houses Limited')", 'author')
    t = sub_once(t, "Na__LeCfg__Val('Pdf', 'Creator', 'TrueVision3D Layout Editor')", "Na__LeCfg__Val('Pdf', 'Creator', 'ValeVision3D Layout Editor')", 'creator')
    t = sub_once(t, "Na__LeCfg__Val('Pdf', 'JsPdfScriptPath', './04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js')",
                 "Na__LeCfg__Val('Pdf', 'JsPdfScriptPath', '" + JSPDF_35 + "')", 'jspdf')
    t = sub_once(t, "Na__LeCfg__Val('Pdf', 'FontBasePath', '../01__Assets__NaApps__CommonAssets/NaApps__CommonFonts/')",
                 "Na__LeCfg__Val('Pdf', 'FontBasePath', '" + AD04_BASE + "')", 'font base')
    t = sub_once(t, "Na__LeCfg__Val('Pdf', 'FontCdnBase', 'https://www.noble-architecture.com/na-apps/01__Assets__NaApps__CommonAssets/NaApps__CommonFonts/')",
                 "Na__LeCfg__Val('Pdf', 'FontCdnBase', '" + AD04_BASE + "')", 'font cdn')
    return t


def build_toolsetup(tv):
    t = tv
    t = sub_once(t, '// TRUEVISION3D - LAYOUT EDITOR - CONFIG STATE - TOOL SETUP', '// VALEVISION3D - LAYOUT EDITOR - CONFIG STATE - TOOL SETUP', 'banner')
    old_pn = (TV_PN_SPLIT +
              "// - Divergences   : GetDimensionSetup's defaultExtensionMm and defaultAtScale,\n"
              "//                   GetShapeSetup's defaultAtScale and GetSnappingSetup's\n"
              '//                   viewport carry keys.\n'
              '// - Back-port     : n/a (this IS the back-port)\n')
    t = sub_once(t, old_pn, pn([
        '- Authored in   : ValeVision3D first (1.0.0, split out of Na__LayoutEditor__ConfigState__.js on',
        '                  15-Sep-2026, v2.47.0); since ported back whole from TrueVision3D 1.5.0 (HEAD b2aa9151)',
        '- Source version: 1.5.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at b2aa9151)',
        '- Ported on     : ' + PORT_DATE + ' for ValeVision3D ' + VVREL,
        '- Parity        : verbatim',
        '- Divergences   :',
        '  - Banner reads ValeVision3D. (No console output in this file.)',
        '- Back-port     : none.',
    ]), 'port note')
    return t


def build_editorsetup(tv):
    t = tv
    t = sub_once(t, '// TRUEVISION3D - LAYOUT EDITOR - CONFIG STATE - EDITOR SETUP', '// VALEVISION3D - LAYOUT EDITOR - CONFIG STATE - EDITOR SETUP', 'banner')
    old_pn = (TV_PN_SPLIT +
              "// - Divergences   : GetSpecificationSetup's TrueVision file names (with\n"
              "//                   legacyFileName), and TrueVision's wording in the comments\n"
              '//                   above it and GetMarginNotesSetup.\n'
              '// - Back-port     : n/a (this IS the back-port)\n')
    t = sub_once(t, old_pn, pn([
        '- Authored in   : ValeVision3D first (1.0.0, split out of Na__LayoutEditor__ConfigState__.js on',
        '                  15-Sep-2026, v2.47.0); since ported back whole from TrueVision3D 1.6.0 (HEAD b2aa9151)',
        '- Source version: 1.6.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)',
        '- Ported on     : ' + PORT_DATE + ' for ValeVision3D ' + VVREL,
        '- Parity        : adapted',
        '- Divergences   :',
        '  - Banner reads ValeVision3D. (No console output in this file.)',
        "  - This app's sibling files: the specification is ValeVision__DrawingNotes__.json with no",
        '    legacy name, and the statement index ValeVision__StatementDocs__.json.',
        "  - Drawing register: PDF.js from this app's vendor copy (07__Vendor__PdfJs__v3.11.174), the Vale",
        "    letterhead logo's aspect (4.5), the document code {project}_{drawing} and no job stages until",
        "    Vale's own are supplied, and the palette named for neither practice.",
        '- Back-port     : none.',
    ]), 'port note')
    t = sub_once(t, '    // (TrueVision__DrawingNotes__.json locally and on R2; LegacyFileName is the\n',
                 '    // (ValeVision__DrawingNotes__.json locally and on R2; LegacyFileName is the\n', 'spec comment')
    t = sub_once(t, "Na__LeCfg__Val('Specification', 'FileName', 'TrueVision__DrawingNotes__.json')",
                 "Na__LeCfg__Val('Specification', 'FileName', 'ValeVision__DrawingNotes__.json')", 'spec file')
    t = sub_once(t, "Na__LeCfg__Val('Specification', 'LegacyFileName', 'TrueVision__ProjectSpecification__.json')",
                 "Na__LeCfg__Val('Specification', 'LegacyFileName', '')", 'spec legacy')
    t = sub_once(t, "String(val('IndexFileName', 'TrueVision__StatementDocs__.json'))",
                 "String(val('IndexFileName', 'ValeVision__StatementDocs__.json'))", 'index file')
    t = sub_once(t, ("    const Na__LeCfg__REGISTER_PHASES = [                                           // <-- T01 Concept through T04 Site: the middle third of a document code\n"
                     "        { code : 'T01', name : 'Concept' },\n"
                     "        { code : 'T02', name : 'Planning' },\n"
                     "        { code : 'T03', name : 'Building Regs' },\n"
                     "        { code : 'T04', name : 'Site & Remedial' }\n"
                     "    ];\n"),
                 "    const Na__LeCfg__REGISTER_PHASES = [];                                         // <-- None until Vale's own stages are supplied: no phase, and no middle third in a document code\n",
                 'phases')
    t = sub_once(t, '    // FUNCTION | Drawing Register Defaults and Noble Architecture Paper Palette\n',
                 '    // FUNCTION | Drawing Register Defaults and Paper Palette\n', 'palette')
    t = sub_once(t, "val('PdfJsScriptPath', '/na-apps/20__PlanVision__CoreAppCode/01__AppDependencies__VersionLocked/PdfJs__3.11.174/build/pdf.min.js')",
                 "val('PdfJsScriptPath', '" + PDFJS_07 + "')", 'pdfjs')
    t = sub_once(t, "val('PdfJsWorkerPath', '/na-apps/20__PlanVision__CoreAppCode/01__AppDependencies__VersionLocked/PdfJs__3.11.174/build/pdf.worker.min.js')",
                 "val('PdfJsWorkerPath', '" + PDFJS_07_WORKER + "')", 'pdfjs worker')
    t = sub_once(t, "String(val('DefaultPhase', 'T01'))", "String(val('DefaultPhase', ''))", 'default phase')
    t = sub_once(t, "String(val('DocumentCodeFormat', '{project}_{phase}_{drawing}'))", "String(val('DocumentCodeFormat', '{project}_{drawing}'))", 'code format')
    t = sub_once(t, "num('LetterheadLogoAspect', 4.096),                 // <-- The asset is 2048 x 500; see TitleBlock LogoAspectWidthOverHeightNote",
                 "num('LetterheadLogoAspect', 4.5),                   // <-- The asset is 2000 x 444; see TitleBlock LogoAspectWidthOverHeightNote", 'aspect')
    return t


# -----------------------------------------------------------------------------
# build / check / apply
# -----------------------------------------------------------------------------

def build_all():
    tv = {f: read_bytes(os.path.join(TV_DIR, f)) for f in FILES}
    pre = {f: read_bytes(os.path.join(PRE_DIR, f)) for f in FILES}
    vv_cfg = json.loads(pre['Na__LayoutEditor__AppConfig__.json'].decode('utf-8-sig'))
    out = {}
    out['Na__Hotkeys__DrawingTabs__.json'] = tv['Na__Hotkeys__DrawingTabs__.json']                      # <-- TV's bytes verbatim
    out['Na__LayoutEditor__AppConfig__.json'] = build_appconfig(tv['Na__LayoutEditor__AppConfig__.json'].decode('utf-8'), vv_cfg).encode('utf-8')
    out['Na__LayoutEditor__ConfigState__.js'] = build_barrel(tv['Na__LayoutEditor__ConfigState__.js'].decode('utf-8')).encode('utf-8')
    out['Na__LayoutEditor__ConfigState__EditorSetup__.js'] = build_editorsetup(tv['Na__LayoutEditor__ConfigState__EditorSetup__.js'].decode('utf-8')).encode('utf-8')
    out['Na__LayoutEditor__ConfigState__KeyMap__.js'] = build_keymap(tv['Na__LayoutEditor__ConfigState__KeyMap__.js'].decode('utf-8')).encode('utf-8')
    out['Na__LayoutEditor__ConfigState__Readers__.js'] = build_readers_vv(pre['Na__LayoutEditor__ConfigState__Readers__.js'])
    out['Na__LayoutEditor__ConfigState__SheetSetup__.js'] = build_sheetsetup(tv['Na__LayoutEditor__ConfigState__SheetSetup__.js'].decode('utf-8')).encode('utf-8')
    out['Na__LayoutEditor__ConfigState__ToolSetup__.js'] = build_toolsetup(tv['Na__LayoutEditor__ConfigState__ToolSetup__.js'].decode('utf-8')).encode('utf-8')
    for f, b in out.items():
        if b'\r\n' in b and f != 'Na__LayoutEditor__ConfigState__Readers__.js':
            raise SystemExit('unexpected CRLF in ' + f)
    # the config and the key file must parse with no duplicate keys
    for f in ('Na__LayoutEditor__AppConfig__.json', 'Na__Hotkeys__DrawingTabs__.json'):
        dups = []

        def hook(pairs):
            seen = set()
            for k, _ in pairs:
                if k in seen:
                    dups.append(k)
                seen.add(k)
            return dict(pairs)
        json.loads(out[f].decode('utf-8'), object_pairs_hook=hook)
        if dups:
            raise SystemExit('duplicate keys in %s: %s' % (f, dups))
    return pre, out


def live_path(f):
    return os.path.join(VV_ROOT, (CFG_REL + f).replace('/', os.sep))


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else '--build'
    manifest = json.load(open(os.path.join(HERE, 'preimage_manifest.json'), encoding='utf-8'))
    if arg == '--restore':
        for f in FILES:
            b = read_bytes(os.path.join(PRE_DIR, f))
            if sha1(b) != manifest['vv'][CFG_REL + f]['sha1']:
                raise SystemExit('pre-image damaged: ' + f)
            with open(live_path(f), 'wb') as fh:
                fh.write(b)
            print('restored', f)
        return
    pre, out = build_all()
    if arg == '--build':
        os.makedirs(OUT_DIR, exist_ok=True)
        for f, b in out.items():
            with open(os.path.join(OUT_DIR, f), 'wb') as fh:
                fh.write(b)
            print('built %-52s %7d bytes  sha1 %s' % (f, len(b), sha1(b)[:12]))
        return
    if arg == '--apply':
        for f in FILES:                                                    # <-- drift check: a file that changed under us stops everything
            live = read_bytes(live_path(f))
            if sha1(live) != manifest['vv'][CFG_REL + f]['sha1']:
                raise SystemExit('DRIFT: %s changed since the pre-image (live %s, pre %s) - nothing written' % (f, sha1(live)[:12], manifest['vv'][CFG_REL + f]['sha1'][:12]))
        for f in FILES:
            with open(live_path(f), 'wb') as fh:
                fh.write(out[f])
            print('wrote', f, sha1(out[f])[:12])
        return
    if arg == '--check-live':
        bad = 0
        for f in FILES:
            same = read_bytes(live_path(f)) == out[f]
            bad += 0 if same else 1
            print('SAME ' if same else 'DIFF ', f)
        sys.exit(1 if bad else 0)
    raise SystemExit('unknown argument ' + arg)


if __name__ == '__main__':
    main()
