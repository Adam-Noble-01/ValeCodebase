"""W0-16 scratch: build, apply, check and restore the package.

  --build       build the six edited files into out/ from the pre-images (every replacement asserted
                to match exactly once; each file keeps its own line ending)
  --apply       drift check (live == pre-image, new targets absent), then write the five new files
                from new/ and the six edited files from out/
  --check-live  compare the live tree with new/ and out/
  --restore     put the six pre-images back byte for byte, delete the five new files and the folders
                this package created (only if empty)

Reads and writes only the files of W0-16's edits list (plus this scratch folder).
"""
import hashlib, json, os, sys

VV      = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SCRATCH = os.path.dirname(os.path.abspath(__file__))

JSPDF_35   = '02__Src__AppModules/35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js'
JSPDF_05   = '04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js'
SCAN_35    = '02__Src__AppModules/35__System__PageLayoutSystem/PageLayoutSystem__TitleBlock__A3__.png'
SCAN_NEW   = '01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png'

NEW_FILES = [
    JSPDF_05,
    '04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1/html2canvas.umd.js',
    '04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.min.js',
    '04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.worker.min.js',
    SCAN_NEW,
]
# Folders this package creates (deepest first, so --restore can remove them when empty)
NEW_DIRS = [
    '04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build',
    '04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174',
    '04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1',
    '04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0',
    '01__AppAssets__ValeVision/06__AppAssets__TitleBlocks',
]

APPCONFIG = '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json'
SHEETSET  = '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js'
INDEX     = '04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__ImportMap__Index__.json'
README    = '04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__VersionLock__README__.md'
TEST_SPEC = '80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html'
TEST_TBC  = '80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html'


# -----------------------------------------------------------------------------
# The replacements: (old, new). Written with '\n'; converted to each file's own line ending.
# -----------------------------------------------------------------------------

SCAN_OLD_PATH = './' + SCAN_35
SCAN_NEW_PATH = './' + SCAN_NEW

EDITS = {
    APPCONFIG: [
        ('        "LayoutEditor__TitleBlock__ClassicScanAssets": {\n'
         '            "A3": "%s",\n'
         '            "A4": "%s",\n'
         '            "A2": "%s",\n'
         '            "A1": "%s"\n'
         '        },\n' % ((SCAN_OLD_PATH,) * 4),
         '        "LayoutEditor__TitleBlock__ClassicScanAssets": {\n'
         '            "A3": "%s",\n'
         '            "A4": "%s",\n'
         '            "A2": "%s",\n'
         '            "A1": "%s"\n'
         '        },\n' % ((SCAN_NEW_PATH,) * 4)),
        ('        "LayoutEditor__Pdf__JsPdfScriptPath": "./%s",\n' % JSPDF_35,
         '        "LayoutEditor__Pdf__JsPdfScriptPath": "./%s",\n' % JSPDF_05),
    ],
    SHEETSET: [
        ('//   - jsPdfScriptPath stays on 35__System__PageLayoutSystem until the vendor copy is in place.\n', ''),
        ("            jsPdfScriptPath   : Na__LeCfg__Val('Pdf', 'JsPdfScriptPath', './%s'),\n" % JSPDF_35,
         "            jsPdfScriptPath   : Na__LeCfg__Val('Pdf', 'JsPdfScriptPath', './%s'),\n" % JSPDF_05),
    ],
    INDEX: [
        (' jsPDF is vendored separately under 02__Src__AppModules/35__System__PageLayoutSystem/01__Dependencies__VersionLocked and is not part of this set.",\n',
         ' jsPDF (vendor 05), html2canvas (vendor 06) and PDF.js (vendor 07) sit in this folder but are NOT part of the coordinated set and may be upgraded on their own; they are UMD scripts injected by tag, never import-map entries, so they are absent from the map below on purpose. The legacy page layout system (02__Src__AppModules/35__System__PageLayoutSystem) keeps its own copy of jsPDF until that folder is retired.",\n'),
    ],
    README: [
        ('Pinned coordinated set (09-Sep-2026). Do not upgrade these packages independently.\n',
         'Pinned coordinated set (09-Sep-2026): vendor folders 01 to 04. Do not upgrade these packages independently.\n'),
        ('| 04 | `04__Vendor__ThreeEdgeProjection__v0.0.10` | three-edge-projection | 0.0.10 at f794481 | `src/index.js` |\n',
         '| 04 | `04__Vendor__ThreeEdgeProjection__v0.0.10` | three-edge-projection | 0.0.10 at f794481 | `src/index.js` |\n'
         '| 05 | `05__Vendor__JsPdf__v4.1.0` | jspdf | 4.1.0 (built 2026-02-02) | `jspdf.umd.js` (UMD, injected by tag) |\n'
         '| 06 | `06__Vendor__Html2Canvas__v1.4.1` | html2canvas | 1.4.1 | `html2canvas.umd.js` (UMD, injected by tag) |\n'
         '| 07 | `07__Vendor__PdfJs__v3.11.174` | pdfjs-dist | 3.11.174 | `build/pdf.min.js` (UMD, injected by tag; its worker is `build/pdf.worker.min.js`) |\n'),
        ('jsPDF (UMD classic script) is vendored separately under\n'
         '`02__Src__AppModules/35__System__PageLayoutSystem/01__Dependencies__VersionLocked` and is\n'
         'independent of this set.\n',
         '\n'
         '## The document-output vendors (05, 06, 07)\n'
         '\n'
         'Vendors 05, 06 and 07 are NOT part of the coordinated 3D set. Each is independent of that set\n'
         'and of the others, and can be upgraded on its own: rename its folder to the new version and\n'
         'update every path string listed below. All three are UMD bundles injected as a `<script>` tag\n'
         'the first time they are needed, never imported as ES modules, so none has an import map entry\n'
         'and none ever will. 05 and 06 carry TrueVision3D\'s folder numbers and file names; 07 is this\n'
         'app\'s own number for PDF.js and is offered to TrueVision3D, whose register still loads PDF.js\n'
         'from another app\'s folder.\n'
         '\n'
         '| Vendor | Read by | Config key (`Na__LayoutEditor__AppConfig__.json`) | Hard-coded fallback |\n'
         '|---|---|---|---|\n'
         '| jsPDF | `Na__LayoutEditor__PdfExporter__.js` (Download PDF; the specification\'s `Na__LayoutEditor__SpecPdf__.js` loads it through the exporter) | `LayoutEditor__Pdf__JsPdfScriptPath` | `Na__LayoutEditor__ConfigState__SheetSetup__.js` |\n'
         '| html2canvas | the Statement Writer\'s PDF export (not in ValeVision3D yet) | `LayoutEditor__Statement__Html2CanvasScriptPath` | `Na__LayoutEditor__ConfigState__EditorSetup__.js` |\n'
         '| PDF.js | the Drawing Register\'s PDF preview (not in ValeVision3D yet); the worker path is handed to PDF.js, not injected | `LayoutEditor__DrawingRegister__PdfJsScriptPath`, `LayoutEditor__DrawingRegister__PdfJsWorkerPath` | `Na__LayoutEditor__ConfigState__EditorSetup__.js` |\n'
         '\n'
         'Each path is written down twice - in the config JSON and as a hard-coded default in a\n'
         'ConfigState module - so moving a file means editing both, or the app silently falls back to a\n'
         'path that no longer exists and the PDF button does nothing. Two test pages load jsPDF by path\n'
         'too: `80__Testing__PrototypeEnvironment/Na__Test__SpecificationPdf__.html` and\n'
         '`80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html`.\n'
         '\n'
         'The legacy Create Drawing page that Image Export opens\n'
         '(`02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html`) keeps\n'
         'its own copy of jsPDF in `35__System__PageLayoutSystem/01__Dependencies__VersionLocked/` and\n'
         'loads it by relative path, so that copy stays until the folder is retired. It is the same 4.1.0\n'
         'build: the same git blob as `05__Vendor__JsPdf__v4.1.0/jspdf.umd.js`.\n'),
        ('  `PWA_SW_VERSION_TOKEN` updated in the same change (and the `WebApps/live_sw.js` copy).\n',
         '  `PWA_SW_VERSION_TOKEN` updated in the same change (and the `WebApps/live_sw.js` copy).\n'
         '- Vendors 05 to 07 are not on that precache list: a browser fetches each one the first time it\n'
         '  is needed, and the shared worker then keeps it like any other script.\n'),
        ('## Upgrade history\n\n',
         '## Upgrade history\n\n'
         '- 01-Oct-2026: the document-output vendors, for ValeVision3D {{VVREL:W0-16}}: jsPDF 4.1.0 copied to\n'
         '  `05__Vendor__JsPdf__v4.1.0` (the same git blob as the 35 copy and as TrueVision3D\'s 05),\n'
         '  html2canvas 1.4.1 to `06__Vendor__Html2Canvas__v1.4.1` and PDF.js 3.11.174 (pdfjs-dist,\n'
         '  Apache-2.0) to `07__Vendor__PdfJs__v3.11.174/build/`, each byte-identical to the build\n'
         '  TrueVision3D runs at b2aa9151. The Layout Editor\'s config and its fallback read jsPDF from 05\n'
         '  from now on; the 35 copy stays for the legacy Create Drawing page.\n'),
    ],
    TEST_SPEC: [
        ('<script src="../%s"></script>\n' % JSPDF_35,
         '<script src="../%s"></script>\n' % JSPDF_05),
    ],
    TEST_TBC: [
        ('<script src="./%s"></script>\n' % JSPDF_35,
         '<script src="./%s"></script>\n' % JSPDF_05),
    ],
}


def p(rel):
    return os.path.join(VV, rel.replace('/', os.sep))


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def file_eol(data, rel):
    crlf = data.count(b'\r\n')
    lf_only = data.count(b'\n') - crlf
    if crlf and lf_only:
        sys.exit('mixed line endings in ' + rel)
    return b'\r\n' if crlf else b'\n'


def manifest():
    return json.load(open(os.path.join(SCRATCH, 'fetch_report.json'), encoding='utf-8'))


def build():
    os.makedirs(os.path.join(SCRATCH, 'out'), exist_ok=True)
    pre = manifest()['preimages']
    for rel, pairs in EDITS.items():
        data = open(os.path.join(SCRATCH, 'preimage', os.path.basename(rel)), 'rb').read()
        assert sha1(data) == pre[rel]['sha1'], 'pre-image changed: ' + rel
        nl = file_eol(data, rel)
        for old, new in pairs:
            ob = old.encode('utf-8').replace(b'\n', nl)
            nb = new.encode('utf-8').replace(b'\n', nl)
            count = data.count(ob)
            assert count == 1, '%s: expected 1 match, found %d for %r' % (rel, count, old[:90])
            data = data.replace(ob, nb)
        assert file_eol(data, rel) == nl
        open(os.path.join(SCRATCH, 'out', os.path.basename(rel)), 'wb').write(data)
        print('built  %-70s %s  %d -> %d bytes' % (rel, 'CRLF' if nl == b'\r\n' else 'LF', pre[rel]['size'], len(data)))


def apply():
    pre = manifest()['preimages']
    drift = [rel for rel in EDITS if sha1(open(p(rel), 'rb').read()) != pre[rel]['sha1']]
    if drift:
        sys.exit('DRIFT - a file changed since the pre-image, nothing written: ' + ', '.join(drift))
    present = [rel for rel in NEW_FILES if os.path.exists(p(rel))]
    if present:
        sys.exit('a new target already exists, nothing written: ' + ', '.join(present))
    for rel in EDITS:
        if not os.path.exists(os.path.join(SCRATCH, 'out', os.path.basename(rel))):
            sys.exit('run --build first')
    created = []
    for d in reversed(NEW_DIRS):
        if not os.path.isdir(p(d)):
            os.makedirs(p(d))
            created.append(d)
    for rel in NEW_FILES:
        data = open(os.path.join(SCRATCH, 'new', rel.replace('/', os.sep)), 'rb').read()
        with open(p(rel), 'wb') as handle:
            handle.write(data)
        print('copied %s (%d bytes)' % (rel, len(data)))
    for rel in EDITS:
        data = open(os.path.join(SCRATCH, 'out', os.path.basename(rel)), 'rb').read()
        with open(p(rel), 'wb') as handle:
            handle.write(data)
        print('wrote  %s (%d bytes)' % (rel, len(data)))
    json.dump({'created_dirs': created}, open(os.path.join(SCRATCH, 'apply_record.json'), 'w'), indent=2)


def check_live():
    bad = 0
    for rel in NEW_FILES:
        a = open(p(rel), 'rb').read() if os.path.exists(p(rel)) else None
        b = open(os.path.join(SCRATCH, 'new', rel.replace('/', os.sep)), 'rb').read()
        ok = a == b
        bad += not ok
        print(('SAME  ' if ok else 'DIFF  ') + rel)
    for rel in EDITS:
        a = open(p(rel), 'rb').read()
        b = open(os.path.join(SCRATCH, 'out', os.path.basename(rel)), 'rb').read()
        ok = a == b
        bad += not ok
        print(('SAME  ' if ok else 'DIFF  ') + rel)
    # The legacy 35 copies are untouched
    for rel in (JSPDF_35, SCAN_35):
        print('kept  %s (%d bytes)' % (rel, os.path.getsize(p(rel))))
    sys.exit(1 if bad else 0)


def restore():
    for rel in EDITS:
        data = open(os.path.join(SCRATCH, 'preimage', os.path.basename(rel)), 'rb').read()
        with open(p(rel), 'wb') as handle:
            handle.write(data)
        print('restored ' + rel)
    for rel in NEW_FILES:
        if os.path.exists(p(rel)):
            os.remove(p(rel))
            print('removed  ' + rel)
    for d in NEW_DIRS:
        if os.path.isdir(p(d)) and not os.listdir(p(d)):
            os.rmdir(p(d))
            print('removed  ' + d + '/')


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    {'--build': build, '--apply': apply, '--check-live': check_live, '--restore': restore}.get(mode, lambda: sys.exit(__doc__))()
