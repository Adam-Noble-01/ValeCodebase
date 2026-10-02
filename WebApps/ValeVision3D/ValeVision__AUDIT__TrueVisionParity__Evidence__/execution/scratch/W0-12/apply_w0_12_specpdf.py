# W0-12 - SpecPdf: the project name through Na__CfApi__GetProjectDisplayName (K2 K4), PORT NOTE to K2 H5, log 1.0.2.
#
# Reads the file as bytes, checks the pre-image hash, makes every replacement exactly once on the LF-normalised
# text, then writes it back with the file's own line ending (CRLF here). --dry-run writes the candidate beside this
# script instead; --restore puts the saved pre-image back (only while the file is still this script's result).
import hashlib
import os
import sys

sys.dont_write_bytecode = True

HERE      = os.path.dirname(os.path.abspath(__file__))
TARGET    = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\50__Feature__Specification\Na__LayoutEditor__SpecPdf__.js'
PREIMAGE  = os.path.join(HERE, 'preimage', 'Na__LayoutEditor__SpecPdf__.js.bak')
CANDIDATE = os.path.join(HERE, 'candidate__Na__LayoutEditor__SpecPdf__.js')
PRE_SHA1  = 'e67a5014316727a50108ba687b3c0e92d885b5f6'

REPLACEMENTS = [
    # 1. THE PORT NOTE, in K2 H5 order (the stale "drawing core is 40" sentence goes: W0-02 made it true of both apps)
    (
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js\n"
        "// - Ported on     : 17-Sep-2026 for ValeVision3D v2.56.0\n"
        "// - Parity        : behavioural\n"
        "// - Divergences   : ValeVision3D has no Na__LayoutEditor__PdfFonts__, so the pages\n"
        "//                   are set in the face its own measurer uses (Helvetica) rather\n"
        "//                   than in an embedded Open Sans. Measurement and painting agree\n"
        "//                   either way, which is what the layout depends on. The drawing\n"
        "//                   core is 40__System__DrawingViewCore here.\n"
        "// - Back-port     : n/a (TrueVision3D authored it)\n",
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js\n"
        "// - Source version: 1.0.0 (TrueVision3D v2.63.0, 17-Sep-2026; still 1.0.0 at HEAD b2aa9151)\n"
        "// - Ported on     : 17-Sep-2026 for ValeVision3D v2.56.0\n"
        "// - Parity        : adapted\n"
        "// - Divergences   :\n"
        "//   - ValeVision3D has no Na__LayoutEditor__PdfFonts__ yet, so the pages are set in the face its own\n"
        "//     measurer uses (Helvetica) rather than in an embedded Open Sans. Measurement and painting agree\n"
        "//     either way, which is what the layout depends on.\n"
        "//   - The project's name comes from Na__CfApi__GetProjectDisplayName() (the project data the app\n"
        "//     loaded), where TrueVision reads the project context its PWA layer publishes on window - which\n"
        "//     ValeVision does not have, so this PDF printed no project name before.\n"
        "//   - Banner and console prefix read ValeVision3D.\n"
        "// - Back-port     : the display-name accessor, in place of the PWA global.\n"
    ),
    # 2. THE DEVELOPMENT LOG, newest first as this file keeps it
    (
        "// DEVELOPMENT LOG:\n"
        "// 01-Oct-2026 - Version 1.0.1 (identity hygiene, {{VVREL:W0-03}})\n",
        "// DEVELOPMENT LOG:\n"
        "// 01-Oct-2026 - Version 1.0.2 (the project name, {{VVREL:W0-12}})\n"
        "// - Page one names the project under the document's title: the name is\n"
        "//   read from the project data the app loaded, through the transport\n"
        "//   facade's Na__CfApi__GetProjectDisplayName(), as ValeVision has no PWA\n"
        "//   project context to read it from.\n"
        "//\n"
        "// 01-Oct-2026 - Version 1.0.1 (identity hygiene, {{VVREL:W0-03}})\n"
    ),
    # 3. THE IMPORT, beside the project code's
    (
        "    import { Na__DrawData__GetProjectCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n",
        "    import { Na__DrawData__GetProjectCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n"
        "    import { Na__CfApi__GetProjectDisplayName } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';   // <-- The project's name, from the project data the app loaded\n"
    ),
    # 4. THE SEAM: one line where TrueVision reads its PWA global
    (
        "        let   name    = '';\n"
        "        try {\n"
        "            const context = window.TrueVision__Pwa__ProjectContext;\n"
        "            name = (context && typeof context.get === 'function' && context.get().displayName) || '';\n"
        "        } catch (e) { name = ''; }\n",
        "        const name    = Na__CfApi__GetProjectDisplayName() || '';         // <-- ValeVision seam (K2 K4): the loaded project's own name\n"
    ),
]


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def build(original):
    crlf = b'\r\n' in original
    text = original.decode('utf-8').replace('\r\n', '\n')
    for old, new in REPLACEMENTS:
        count = text.count(old)
        if count != 1:
            raise SystemExit(f'expected exactly one match, found {count}: {old[:70]!r}')
        text = text.replace(old, new)
    if crlf:
        text = text.replace('\n', '\r\n')
    return text.encode('utf-8')


def main(argv):
    if '--restore' in argv:
        current = open(TARGET, 'rb').read()
        expected = build(open(PREIMAGE, 'rb').read())
        if current != expected:
            raise SystemExit('refused: the file is not this script\'s result any more (someone changed it since)')
        with open(TARGET, 'wb') as handle:
            handle.write(open(PREIMAGE, 'rb').read())
        print('restored', sha1(open(TARGET, 'rb').read()))
        return
    original = open(TARGET, 'rb').read()
    if sha1(original) != PRE_SHA1:
        raise SystemExit(f'refused: {TARGET} changed since it was read (sha1 {sha1(original)}, expected {PRE_SHA1})')
    result = build(original)
    if '--dry-run' in argv:
        with open(CANDIDATE, 'wb') as handle:
            handle.write(result)
        print('candidate written', CANDIDATE, sha1(result), len(result), 'bytes', result.count(b'\r\n'), 'CRLF', result.count(b'\n'), 'LF')
        return
    tmp = TARGET + '.w0_12.tmp'
    with open(tmp, 'wb') as handle:
        handle.write(result)
    os.replace(tmp, TARGET)
    print('applied', sha1(result), len(result), 'bytes', result.count(b'\r\n'), 'CRLF', result.count(b'\n'), 'LF')


if __name__ == '__main__':
    main(sys.argv[1:])
