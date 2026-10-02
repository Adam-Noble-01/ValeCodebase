"""W1-25 build / apply / restore - Embedded PDF fonts (PdfFonts) and Open Sans Medium.

    python -B build_w1_25.py --build     candidates into scratch/W1-25/candidate/ (+ logs/)
    python -B build_w1_25.py --apply     pre-image hashes checked, pre-images kept, one whole write per file
    python -B build_w1_25.py --restore   pre-images back (refuses a file anyone changed since --apply)
    python -B build_w1_25.py --verify    live files equal the candidates

TrueVision is read only at the pin with git show. Every edit of an existing file is an exact,
asserted-once replacement on the file's own bytes with its own line ending; the two whole-file
takes (SpecPdf, Fonts.css) and the new module (PdfFonts) are TrueVision's text as git show
returns it (LF) with the declared seams re-applied.
"""
import difflib
import hashlib
import json
import os
import subprocess
import sys

PIN = 'b2aa9151'
TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, 'candidate')
PRE = os.path.join(HERE, 'preimage')
LOGS = os.path.join(HERE, 'logs')
WRITTEN = os.path.join(HERE, 'sha256__written.txt')
VVREL = '{{VVREL:W1-25}}'

LE = '02__Src__AppModules/51__System__LayoutEditor/'
FILES = {
    'PdfFonts':     LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js',
    'SpecPdf':      LE + '50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js',
    'SpecDocument': LE + '50__Feature__Specification/Na__LayoutEditor__SpecDocument__.js',
    'PdfExporter':  LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js',
    'AppConfig':    LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    'FontsCss':     '03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css',
}
# sha256 of each existing file as read at this package's start (02-Oct-2026 06:2x), None = new file
PREIMAGE_SHA256 = {
    'PdfFonts':     None,
    'SpecPdf':      '8a46cd5b6065165f976a609bdf5a1df5b7349412bed15f199afd9fbeefa20813',
    'SpecDocument': '32ff735c4a1445b8a3b736f94681b5d501013ee49d02a4718dd94bd601532f78',
    'PdfExporter':  '2994ac15df76ef5e0779d7a771d0717fcf0711d37cb09b0ab9cbf1b4c3acdff9',
    'AppConfig':    '0a8eab33fa4f3c8cbd122acd2c219a376e4047f2bd8004d11b63fab8df98cc69',
    'FontsCss':     '8f6c019162ce8567c7468c503d5e079797b415125e5ef672d286b9df131ad04c',
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def tv_bytes(rel):
    return subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + rel], check=True, capture_output=True).stdout


def live_path(key):
    return os.path.join(VV, FILES[key].replace('/', os.sep))


def read_live(key):
    path = live_path(key)
    return open(path, 'rb').read() if os.path.exists(path) else None


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('ANCHOR %s found %d times (expected 1)' % (label, count))
    return text.replace(old, new)


def to_text(data):
    """bytes -> (LF text, eol) keeping the file's own line ending."""
    text = data.decode('utf-8')
    eol = '\r\n' if '\r\n' in text else '\n'
    if eol == '\r\n':
        if text.replace('\r\n', '').count('\n'):
            raise SystemExit('mixed line endings')
        text = text.replace('\r\n', '\n')
    return text, eol


def to_bytes(text, eol):
    if eol == '\r\n':
        text = text.replace('\n', '\r\n')
    return text.encode('utf-8')


# =============================================================================
# PdfFonts - new, TrueVision 1.0.0 whole (LF); banner, PORT NOTE, three console prefixes
# =============================================================================
def build_pdffonts():
    text = tv_bytes(FILES['PdfFonts']).decode('utf-8')
    assert '\r\n' not in text
    text = once(text, '// TRUEVISION3D - LAYOUT EDITOR - PDF FONTS\n', '// VALEVISION3D - LAYOUT EDITOR - PDF FONTS\n', 'pdffonts banner')
    port_note = (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.54.0, 14-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D ' + VVREL + ' - the whole file, new in this app.\n'
        '// - Parity        : verbatim (the code is TrueVision 1.0.0\'s; the banner, the three console prefixes\n'
        '//                   and this note are the only differences)\n'
        '// - Divergences   :\n'
        '//   - Banner and console prefixes read ValeVision3D.\n'
        '//   - The paths are this app\'s config values (DR-21): FontBasePath and FontCdnBase both name the\n'
        '//     AD04 copies of the Open Sans files on www.noble-architecture.com/assets/ that\n'
        '//     Na__CoreUi__Styles__Fonts__.css loads (byte for byte TrueVision\'s cuts), so each cut is\n'
        '//     fetched from one address, once.\n'
        '// - Back-port     : none.\n'
        '//\n'
        '// -----------------------------------------------------------------------------\n'
        '//\n'
    )
    anchor = ('//   and paper glyphs share the same metrics.\n'
              '//\n'
              '// -----------------------------------------------------------------------------\n'
              '//\n'
              '// DEVELOPMENT LOG:\n')
    text = once(text, anchor,
                '//   and paper glyphs share the same metrics.\n'
                '//\n'
                '// -----------------------------------------------------------------------------\n'
                '//\n' + port_note +
                '// DEVELOPMENT LOG:\n', 'pdffonts port note')
    for old in ("'[TrueVision3D LayoutEditor] PDF font unavailable: '",
                "'[TrueVision3D LayoutEditor] Open Sans could not be loaded for PDF export; Helvetica will be used.'",
                "'[TrueVision3D LayoutEditor] Open Sans could not be embedded in the PDF.'"):
        text = once(text, old, old.replace('[TrueVision3D ', '[ValeVision3D '), 'pdffonts console ' + old[:40])
    return text.encode('utf-8')


# =============================================================================
# SpecPdf - TrueVision 1.0.0 taken whole (LF); banner, PORT NOTE, display name, document code, console
# =============================================================================
def build_specpdf():
    text = tv_bytes(FILES['SpecPdf']).decode('utf-8')
    assert '\r\n' not in text
    text = once(text, '// TRUEVISION3D - LAYOUT EDITOR - SPECIFICATION PDF DOWNLOAD\n',
                '// VALEVISION3D - LAYOUT EDITOR - SPECIFICATION PDF DOWNLOAD\n', 'specpdf banner')
    tv_note = ('// PORT NOTE:\n'
               '// - Ported from   : n/a (TrueVision3D first, 17-Sep-2026)\n'
               '// - Back-port     : offer to ValeVision3D with the revision fields.\n')
    vv_note = (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.63.0, 17-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 17-Sep-2026 for ValeVision3D v2.56.0; taken whole 02-Oct-2026 for ValeVision3D\n'
        '//                   ' + VVREL + ', with Na__LayoutEditor__PdfFonts__: the Open Sans cuts are in memory\n'
        '//                   before a line is measured and installed in the document, as TrueVision\'s are, and\n'
        '//                   the save is awaited. This app\'s copy before it was its 1.0.2 (01-Oct-2026,\n'
        '//                   v2.71.1): TrueVision\'s 1.0.0 without the two font lines and the awaited save, set\n'
        '//                   in Helvetica, with the display-name seam (1.0.2) and the console prefix (1.0.1).\n'
        '// - Parity        : adapted\n'
        '// - Divergences   :\n'
        '//   - The project\'s name comes from Na__CfApi__GetProjectDisplayName() (the project data the app\n'
        '//     loaded), where TrueVision reads the project context its PWA layer publishes on window - which\n'
        '//     ValeVision does not have (K2 K4).\n'
        '//   - The project code the document prints, numbers itself by and names its file by is\n'
        '//     Na__DrawData__GetDocumentCode() (the loaded project\'s own code, DR-11), where TrueVision reads\n'
        '//     Na__DrawData__GetProjectCode(): here that is the ?project= token, which can be a folder id\n'
        '//     such as 2026/3047__Doous and printed 2026/3047__Doous_SPEC.\n'
        '//   - Banner and console prefix read ValeVision3D.\n'
        '// - Back-port     : the display-name and document-code accessors, in place of the PWA global and the\n'
        '//                   ?project= code.\n'
    )
    text = once(text, tv_note, vv_note, 'specpdf port note')
    text = once(text,
                "    import { Na__DrawData__GetProjectCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n",
                "    import { Na__DrawData__GetDocumentCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';   // <-- The project's own code (ValeVision, DR-11): this app's ?project= can be a folder id\n"
                "    import { Na__CfApi__GetProjectDisplayName } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';   // <-- The project's name, from the project data the app loaded\n",
                'specpdf imports')
    text = once(text,
                "        const code    = Na__DrawData__GetProjectCode() || '';\n"
                "        let   name    = '';\n"
                "        try {\n"
                "            const context = window.TrueVision__Pwa__ProjectContext;\n"
                "            name = (context && typeof context.get === 'function' && context.get().displayName) || '';\n"
                "        } catch (e) { name = ''; }\n",
                "        const code    = Na__DrawData__GetDocumentCode() || '';            // <-- ValeVision seam (DR-11): the project's own code, never the ?project= folder id\n"
                "        const name    = Na__CfApi__GetProjectDisplayName() || '';         // <-- ValeVision seam (K2 K4): the loaded project's own name\n",
                'specpdf meta')
    text = once(text, "'[TrueVision3D LayoutEditor] The specification could not be downloaded.'",
                "'[ValeVision3D LayoutEditor] The specification could not be downloaded.'", 'specpdf console')
    return text.encode('utf-8')


# =============================================================================
# Fonts.css - TrueVision's sheet taken whole (LF); the sources are this app's AD04 host (DR-21)
# =============================================================================
AD04 = 'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/'
CUT_FILES = {
    'Regular':  'AD04_01_-_Standard-Font_-_Open-Sans-Regular.ttf',
    'SemiBold': 'AD04_02_-_Standard-Font_-_Open-Sans-SemiBold.ttf',
    'Light':    'AD04_03_-_Standard-Font_-_Open-Sans-Light.ttf',
    'Medium':   'AD04_04_-_Standard-Font_-_Open-Sans-Medium.ttf',
}


def build_fontscss():
    text = tv_bytes(FILES['FontsCss']).decode('utf-8')
    assert '\r\n' not in text
    pad = ' ' * len('    src                                : ')
    for cut, fname in CUT_FILES.items():
        old = ("    src                                : url('../../01__Assets__NaApps__CommonAssets/NaApps__CommonFonts/CommonFont-01__OpenSans__" + cut + "__.ttf') format('truetype'),\n"
               + pad + "url('https://www.noble-architecture.com/na-apps/01__Assets__NaApps__CommonAssets/NaApps__CommonFonts/CommonFont-01__OpenSans__" + cut + "__.ttf') format('truetype');\n")
        new = "    src                                : url('" + AD04 + fname + "') format('truetype');\n"
        text = once(text, old, new, 'fonts src ' + cut)
    seam = ('/* ================================================================= */\n'
            '/* REGION  |  Custom Font Loading - Open Sans                       */\n'
            '/* ================================================================= */\n'
            '\n'
            '/* ValeVision3D seam (DR-21): each face is read from the AD04 copy of the\n'
            '   same Open Sans file on www.noble-architecture.com/assets/, one source\n'
            '   each, where TrueVision reads its own font folder first and its CDN copy\n'
            '   second. The PDF exporter embeds the same files (Pdf FontCdnBase in the\n'
            '   Layout Editor config), so the screen and the paper share one face. Move\n'
            '   both together when a Vale-owned copy is named. */\n'
            '\n')
    text = once(text,
                '/* ================================================================= */\n'
                '/* REGION  |  Custom Font Loading - Open Sans                       */\n'
                '/* ================================================================= */\n'
                '\n', seam, 'fonts region head')
    return text.encode('utf-8')


# =============================================================================
# PdfExporter - hunk replay into this app's own sequence (CRLF kept): TrueVision 1.4.0's font lines
# =============================================================================
def build_pdfexporter(pre):
    text, eol = to_text(pre)
    text = once(text,
                '//                   strict and pictureCompression options, LoadLibrary and the awaited save\n'
                '//                   02-Oct-2026 for ValeVision3D v2.71.2\n',
                '//                   strict and pictureCompression options, LoadLibrary and the awaited save\n'
                '//                   02-Oct-2026 for ValeVision3D v2.71.2; the Open Sans cuts (1.4.0, with\n'
                '//                   Na__LayoutEditor__PdfFonts__) 02-Oct-2026 for ValeVision3D ' + VVREL + '\n',
                'exporter ported on')
    text = once(text,
                '//   - EnsureJsPdf answers what LoadLibrary answers: it does not wait for the Open Sans cuts yet\n'
                '//     (TrueVision3D\'s 1.4.0, Na__LayoutEditor__PdfFonts__, is not here).\n'
                '//   - Not here yet: TrueVision3D\'s 1.2.0 and 1.12.0 (site plans, and their strict check), 1.4.0\n'
                '//     (Open Sans), 1.6.0 (depth fog, and its picture\'s packing), 1.7.0 (the Layers list\'s paint\n'
                '//     order), 1.8.0 (Sheet Images), 1.9.0 (turned viewports) and 1.10.0 (note regions).\n',
                '//   - Not here yet: TrueVision3D\'s 1.2.0 and 1.12.0 (site plans, and their strict check), 1.6.0\n'
                '//     (depth fog, and its picture\'s packing), 1.7.0 (the Layers list\'s paint order), 1.8.0 (Sheet\n'
                '//     Images), 1.9.0 (turned viewports) and 1.10.0 (note regions).\n',
                'exporter divergences')
    text = once(text,
                '// - Printed at 100 percent a 1:50 viewport measures true because every\n'
                '//   coordinate is a paper millimetre.\n'
                '//\n'
                '// INTEGRATION:\n',
                '// - Printed at 100 percent a 1:50 viewport measures true because every\n'
                '//   coordinate is a paper millimetre.\n'
                '// - Open Sans is embedded before anything is drawn. jsPDF\'s built-in\n'
                '//   Helvetica is only the fallback when the TTF files cannot be fetched.\n'
                '//   // @delegate: ./Na__LayoutEditor__PdfFonts__.js\n'
                '//\n'
                '// INTEGRATION:\n',
                'exporter description')
    text = once(text,
                '// DEVELOPMENT LOG:\n'
                '// 02-Oct-2026 - Version 1.2.2 (TrueVision3D\'s picture packing and export options, v2.71.2)\n',
                '// DEVELOPMENT LOG:\n'
                '// 02-Oct-2026 - Version 1.2.3 (TrueVision3D\'s Open Sans embedding, ' + VVREL + ')\n'
                '// - The Open Sans cuts are in memory before any document is measured or\n'
                '//   drawn: EnsureJsPdf awaits Na__LePdfFonts__EnsureLoaded once jsPDF is\n'
                '//   there, and BuildDocument installs the cuts in each new document, made\n'
                '//   with putOnlyUsedFonts so a cut no text is set in stays out of the file.\n'
                '//   Ported from TrueVision3D (PdfExporter 1.4.0, 14-Sep-2026).\n'
                '// - The page\'s text is set by the chrome painter, which picks Helvetica\n'
                '//   until Na__LayoutEditor__SheetChrome__ 1.14.0 chooses Open Sans through\n'
                '//   Na__LePdfFonts__SetFont; until then the file carries Helvetica alone.\n'
                '//\n'
                '// 02-Oct-2026 - Version 1.2.2 (TrueVision3D\'s picture packing and export options, v2.71.2)\n',
                'exporter log')
    text = once(text,
                "    import { Na__LeCfg__GetPdfSetup, Na__LeCfg__GetLineworkSetup, Na__LeCfg__GetLabel, Na__LeCfg__GetSpecificationSetup, Na__LeCfg__FormatLabel } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';\n",
                "    import { Na__LeCfg__GetPdfSetup, Na__LeCfg__GetLineworkSetup, Na__LeCfg__GetLabel, Na__LeCfg__GetSpecificationSetup, Na__LeCfg__FormatLabel } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';\n"
                "    import { Na__LePdfFonts__EnsureLoaded, Na__LePdfFonts__Install } from './Na__LayoutEditor__PdfFonts__.js';\n",
                'exporter import')
    text = once(text,
                '    // FUNCTION | Make Sure jsPDF Exists Before Any Document Is Measured or Drawn\n'
                '    // ------------------------------------------------------------\n'
                '    async function Na__LePdf__EnsureJsPdf() {\n'
                '        const JsPdf = await Na__LePdf__LoadLibrary();\n'
                '        return JsPdf;                                                             // <-- TrueVision3D also awaits its Open Sans cuts here (Na__LayoutEditor__PdfFonts__, not ported yet)\n'
                '    }\n',
                '    // FUNCTION | Make Sure jsPDF Exists and Open Sans Is Ready to Embed\n'
                '    // ------------------------------------------------------------\n'
                '    async function Na__LePdf__EnsureJsPdf() {\n'
                '        const JsPdf = await Na__LePdf__LoadLibrary();\n'
                '        await Na__LePdfFonts__EnsureLoaded();                                     // <-- TTF in memory before any document is measured or drawn\n'
                '        return JsPdf;\n'
                '    }\n',
                'exporter ensure')
    text = once(text,
                "        const doc    = new JsPdf({ orientation : layout.Page.Orientation, unit : 'mm', format : [ layout.Page.WidthMm, layout.Page.HeightMm ], compress : true });\n",
                "        const doc    = new JsPdf({ orientation : layout.Page.Orientation, unit : 'mm', format : [ layout.Page.WidthMm, layout.Page.HeightMm ], compress : true, putOnlyUsedFonts : true });\n"
                "        Na__LePdfFonts__Install(doc);                                             // <-- Open Sans into this document; Helvetica remains if the TTF never arrived\n",
                'exporter build')
    return to_bytes(text, eol)


# =============================================================================
# SpecDocument - one seam (CRLF kept): the code the pages print is the project's own (OC-09)
# =============================================================================
def build_specdocument(pre):
    text, eol = to_text(pre)
    text = once(text,
                '// - Reads the live specification (Na__LayoutEditor__SpecData__), the project\n'
                '//   code, the project\'s name (the name part of its folder id, the way the\n'
                '//   share-link emails name a project), and from the config the drawing style,\n'
                '//   the title block\'s logo and the PDF author.\n',
                '// - Reads the live specification (Na__LayoutEditor__SpecData__), the project\'s\n'
                '//   own code (Na__DrawData__GetDocumentCode), the project\'s name (the name\n'
                '//   part of its folder id, the way the share-link emails name a project), and\n'
                '//   from the config the drawing style, the title block\'s logo and the PDF\n'
                '//   author.\n',
                'specdoc integration')
    text = once(text,
                '// - ValeVision    : ported 15-Sep-2026. The logo and the company come from this\n'
                '//                   app\'s own config. Two parts adapted: the project\'s name\n'
                '//                   comes from its folder id (TrueVision reads its PWA project\n'
                '//                   context), and the DrawView path is 42__.\n',
                '// - ValeVision    : ported 15-Sep-2026. The logo and the company come from this\n'
                '//                   app\'s own config. Two parts adapted: the project\'s name\n'
                '//                   comes from its folder id (TrueVision reads its PWA project\n'
                '//                   context), and the code the pages print and number the\n'
                '//                   document by is the project\'s own\n'
                '//                   (Na__DrawData__GetDocumentCode, DR-11), where TrueVision\n'
                '//                   prints its ?project= code - here a folder id such as\n'
                '//                   2026/3047__Doous (' + VVREL + ').\n',
                'specdoc port note')
    text = once(text,
                '// DEVELOPMENT LOG:\n'
                '// 14-Sep-2026 - Version 1.0.0\n',
                '// DEVELOPMENT LOG:\n'
                '// 02-Oct-2026 - Version 1.0.1 (the document code, ' + VVREL + ')\n'
                '// - The code the pages print - the first page\'s Project and Document No.\n'
                '//   and the running head - is the project\'s own (3047, from\n'
                '//   Na__DrawData__GetDocumentCode), not the ?project= token, which opened\n'
                '//   from the gallery is the folder id and printed 2026/3047__Doous_SPEC. The\n'
                '//   folder id is still read from the token, for the project\'s name.\n'
                '//\n'
                '// 14-Sep-2026 - Version 1.0.0\n',
                'specdoc log')
    text = once(text,
                "    import { Na__DrawData__GetProjectCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n",
                "    import { Na__DrawData__GetProjectCode, Na__DrawData__GetDocumentCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n",
                'specdoc import')
    text = once(text,
                '    // A folder id with no name part has no name to add.\n'
                '    // ------------------------------------------------------------\n'
                '    function Na__LeSpecDoc__Project() {\n'
                "        const code   = Na__DrawData__GetProjectCode() || '';\n"
                "        const folder = String((code && Na__AppUtils__NormalizeProjectFolderId(String(code))) || '').split('/').pop();\n",
                '    // A folder id with no name part has no name to add. The code the pages\n'
                '    // print is the project\'s own (3047), never the ?project= token the folder\n'
                '    // id is read from.\n'
                '    // ------------------------------------------------------------\n'
                '    function Na__LeSpecDoc__Project() {\n'
                "        const token  = Na__DrawData__GetProjectCode() || '';                      // <-- The ?project= token: it names the project's folder\n"
                "        const code   = Na__DrawData__GetDocumentCode() || '';                     // <-- ValeVision seam (DR-11): the project's own code\n"
                "        const folder = String((token && Na__AppUtils__NormalizeProjectFolderId(String(token))) || '').split('/').pop();\n",
                'specdoc project')
    return to_bytes(text, eol)


# =============================================================================
# AppConfig - four withheld values switched to TrueVision's lines (LF kept)
# =============================================================================
APPCONFIG_KEYS = [
    '"LayoutEditor__Style__Description":',
    '"LayoutEditor__Style__FontFamily":',
    '"LayoutEditor__Style__TitleValueWeightNote":',
    '"LayoutEditor__Pdf__Description":',
]


def line_with(text, key):
    hits = [line for line in text.split('\n') if line.strip().startswith(key)]
    if len(hits) != 1:
        raise SystemExit('KEY %s found %d times' % (key, len(hits)))
    return hits[0]


def build_appconfig(pre):
    text, eol = to_text(pre)
    tv = tv_bytes(FILES['AppConfig']).decode('utf-8')
    for key in APPCONFIG_KEYS:
        old = line_with(text, key)
        new = line_with(tv, key)
        if old == new:
            raise SystemExit('KEY %s already equals TrueVision\'s' % key)
        text = once(text, old + '\n', new + '\n', 'appconfig ' + key)
    json.loads(text)
    return to_bytes(text, eol)


# =============================================================================
# Driver
# =============================================================================
def build_all():
    pres = {k: read_live(k) for k in FILES}
    for key, want in PREIMAGE_SHA256.items():
        have = pres[key]
        if want is None:
            if have is not None:
                raise SystemExit('PRECONDITION %s should not exist yet' % key)
        elif have is None or sha256(have) != want:
            raise SystemExit('PRECONDITION %s changed since this package read it (%s)' % (key, sha256(have)[:16] if have else 'missing'))
    out = {
        'PdfFonts':     build_pdffonts(),
        'SpecPdf':      build_specpdf(),
        'FontsCss':     build_fontscss(),
        'PdfExporter':  build_pdfexporter(pres['PdfExporter']),
        'SpecDocument': build_specdocument(pres['SpecDocument']),
        'AppConfig':    build_appconfig(pres['AppConfig']),
    }
    return pres, out


def cand_path(key):
    return os.path.join(CAND, os.path.basename(FILES[key]))


def write_logs(pres, out):
    os.makedirs(LOGS, exist_ok=True)
    lines = []
    for key in ('PdfFonts', 'SpecPdf', 'FontsCss'):
        tv = tv_bytes(FILES[key]).decode('utf-8').split('\n')
        new = out[key].decode('utf-8').split('\n')
        lines += list(difflib.unified_diff(tv, new, 'TV@' + PIN + '/' + FILES[key], 'candidate/' + FILES[key], lineterm='', n=1))
        lines.append('')
    for key in ('SpecPdf', 'FontsCss', 'PdfExporter', 'SpecDocument', 'AppConfig'):
        old = pres[key].decode('utf-8').replace('\r\n', '\n').split('\n')
        new = out[key].decode('utf-8').replace('\r\n', '\n').split('\n')
        lines += list(difflib.unified_diff(old, new, 'preimage/' + FILES[key], 'candidate/' + FILES[key], lineterm='', n=1))
        lines.append('')
    open(os.path.join(LOGS, 'w1_25_changes.diff'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    if mode == '--build':
        pres, out = build_all()
        os.makedirs(CAND, exist_ok=True)
        for key, data in out.items():
            open(cand_path(key), 'wb').write(data)
            eol = 'CRLF' if b'\r\n' in data else 'LF'
            print('%-13s %7d B  %s  sha256 %s' % (key, len(data), eol, sha256(data)[:16]))
        write_logs(pres, out)
        print('logs/w1_25_changes.diff written')
    elif mode == '--apply':
        pres, out = build_all()
        os.makedirs(PRE, exist_ok=True)
        for key, data in pres.items():
            if data is not None:
                open(os.path.join(PRE, os.path.basename(FILES[key])), 'wb').write(data)
        for key, data in out.items():
            if open(cand_path(key), 'rb').read() != data:
                raise SystemExit('candidate %s is stale: run --build and review first' % key)
        rows = []
        for key, data in out.items():
            path = live_path(key)
            with open(path, 'wb') as fh:
                fh.write(data)
            rows.append('%s  %s  bytes=%d %s' % (sha256(data), FILES[key], len(data), 'CRLF' if b'\r\n' in data else 'LF'))
            print('written', FILES[key])
        open(WRITTEN, 'w', encoding='utf-8', newline='\n').write('\n'.join(rows) + '\n')
    elif mode == '--verify':
        ok = True
        for key in FILES:
            live = read_live(key)
            cand = open(cand_path(key), 'rb').read()
            same = live == cand
            ok = ok and same
            print('%-13s live == candidate: %s' % (key, same))
        sys.exit(0 if ok else 1)
    elif mode == '--restore':
        written = {}
        for row in open(WRITTEN, encoding='utf-8').read().split('\n'):
            if row.strip():
                digest, rel = row.split('  ')[:2]
                written[rel] = digest
        for key, rel in FILES.items():
            live = read_live(key)
            if live is None or sha256(live) != written.get(rel):
                raise SystemExit('REFUSED: %s changed since --apply' % rel)
        for key, rel in FILES.items():
            pre = os.path.join(PRE, os.path.basename(rel))
            if PREIMAGE_SHA256[key] is None:
                os.remove(live_path(key))
                print('removed', rel)
            else:
                data = open(pre, 'rb').read()
                assert sha256(data) == PREIMAGE_SHA256[key]
                open(live_path(key), 'wb').write(data)
                print('restored', rel)
    else:
        raise SystemExit(__doc__)


if __name__ == '__main__':
    main()
