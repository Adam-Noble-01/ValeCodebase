# =============================================================================
# W1-24 scratch: build, apply, check and restore the PdfExporter hunk replay
# =============================================================================
#   python -B build_w1_24.py --build        pre-image -> candidate/ (every replacement asserted exactly once)
#   python -B build_w1_24.py --apply        candidate -> live, only if live still equals the pre-image
#   python -B build_w1_24.py --check-live   live == candidate ?
#   python -B build_w1_24.py --restore      pre-image -> live, only if live still equals what --apply wrote
#
# The file is pure CRLF; the replacements are made on the LF-normalised text and
# the result is written back CRLF. New text must be ASCII.
# =============================================================================
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
REL = os.path.join('02__Src__AppModules', '51__System__LayoutEditor', '60__Feature__PdfExport',
                   'Na__LayoutEditor__PdfExporter__.js')
LIVE = os.path.join(VV, REL)
LEAF = 'Na__LayoutEditor__PdfExporter__.js'
BEFORE = os.path.join(HERE, 'before', LEAF)
CANDIDATE = os.path.join(HERE, 'candidate', LEAF)
PRE_SHA = '3bd517ccdff0eba7e9c4217e41e9837440704d72952ad687f7bbfa96a45d0580'
WRITTEN = os.path.join(HERE, 'sha256__written.txt')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    with open(path, 'rb') as fh:
        return fh.read()


# -----------------------------------------------------------------------------
# The hunks (old -> new), LF text
# -----------------------------------------------------------------------------
REPLACEMENTS = []

# 1. PORT NOTE: Ported on, Divergences
REPLACEMENTS.append(('PORT NOTE', """// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5); the linework call's shape
//                   01-Oct-2026 for ValeVision3D {{VVREL:W1-23}}
// - Parity        : adapted
// - Divergences   :
//   - Against its sources: any paper size; vector content; primitives shared with the screen.
//   - EnsureLinework is handed the viewport's Model Source, as TrueVision3D's exporter does; it is
//     always the live model here (ValeVision3D has no design phases).
//   - Not here yet: TrueVision3D's 1.4.0 to 1.12.0.
// - Back-port     : none.
""", """// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5); the linework call's shape
//                   01-Oct-2026 for ValeVision3D {{VVREL:W1-23}}; the picture packing (1.11.0), the
//                   strict and pictureCompression options, LoadLibrary and the awaited save
//                   02-Oct-2026 for ValeVision3D {{VVREL:W1-24}}
// - Parity        : adapted
// - Divergences   :
//   - Against its sources: any paper size; vector content; primitives shared with the screen.
//   - EnsureLinework is handed the viewport's Model Source, as TrueVision3D's exporter does; it is
//     always the live model here (ValeVision3D has no design phases).
//   - EnsureJsPdf answers what LoadLibrary answers: it does not wait for the Open Sans cuts yet
//     (TrueVision3D's 1.4.0, Na__LayoutEditor__PdfFonts__, is not here).
//   - Not here yet: TrueVision3D's 1.2.0 and 1.12.0 (site plans, and their strict check), 1.4.0
//     (Open Sans), 1.6.0 (depth fog, and its picture's packing), 1.7.0 (the Layers list's paint
//     order), 1.8.0 (Sheet Images), 1.9.0 (turned viewports) and 1.10.0 (note regions).
// - Back-port     : none.
"""))

# 2. DEVELOPMENT LOG: the 1.2.2 entry on top
REPLACEMENTS.append(('DEVELOPMENT LOG', """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.2.1 (TrueVision3D's linework call, {{VVREL:W1-23}})
""", """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.2.2 (TrueVision3D's picture packing and export options, {{VVREL:W1-24}})
// - Viewport pictures (the 2D underlay and the 3D picture) are packed 'FAST' -
//   the Sub predictor - through Na__LePdf__AddPicture. jsPDF's default on a
//   compressed document is Paeth, and Chrome's PDF viewer (and Android's)
//   garbles a Paeth picture over 60 MB decoded into black blocks and streaks.
//   Pictures come out larger, with the same pixels. options.pictureCompression
//   can override it. Ported from TrueVision3D (PdfExporter 1.11.0, v2.155.0).
// - BuildDocument, DrawViewport and ExportSheet take TrueVision3D's options:
//   { strict : true } throws when a 2D viewport's drawing source is missing or
//   a 3D viewport could not be rendered, where the default leaves the frame
//   empty and still exports. Download PDF and the Dev menu pass no options.
// - Na__LePdf__LoadLibrary loads jsPDF alone and is exported; EnsureJsPdf
//   awaits it, as TrueVision3D's does. ExportSheet awaits the save
//   (returnPromise), so its toast follows the hand-over to the browser.
//
// 01-Oct-2026 - Version 1.2.1 (TrueVision3D's linework call, {{VVREL:W1-23}})
"""))

# 3. jsPDF loading: the LoadLibrary / EnsureJsPdf split
REPLACEMENTS.append(('jsPDF loading', """    // FUNCTION | Make Sure window.jspdf.jsPDF Exists (injects the vendored UMD once)
    // ------------------------------------------------------------
    function Na__LePdf__EnsureJsPdf() {
        if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
        if (Na__LePdf__LoadPromise) return Na__LePdf__LoadPromise;
        Na__LePdf__LoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src   = Na__LeCfg__GetPdfSetup().jsPdfScriptPath;
            script.async = true;
            script.onload  = () => (window.jspdf && window.jspdf.jsPDF) ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF did not register'));
            script.onerror = () => reject(new Error('jsPDF failed to load from ' + script.src));
            document.head.appendChild(script);
        }).catch((error) => { Na__LePdf__LoadPromise = null; throw error; });
        return Na__LePdf__LoadPromise;
    }
    // ------------------------------------------------------------
""", """    // FUNCTION | Load the Vendored jsPDF UMD Once
    // ------------------------------------------------------------
    function Na__LePdf__LoadLibrary() {
        if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
        if (Na__LePdf__LoadPromise) return Na__LePdf__LoadPromise;
        Na__LePdf__LoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src   = Na__LeCfg__GetPdfSetup().jsPdfScriptPath;
            script.async = true;
            script.onload  = () => (window.jspdf && window.jspdf.jsPDF) ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF did not register'));
            script.onerror = () => reject(new Error('jsPDF failed to load from ' + script.src));
            document.head.appendChild(script);
        }).catch((error) => { Na__LePdf__LoadPromise = null; throw error; });
        return Na__LePdf__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Make Sure jsPDF Exists Before Any Document Is Measured or Drawn
    // ------------------------------------------------------------
    async function Na__LePdf__EnsureJsPdf() {
        const JsPdf = await Na__LePdf__LoadLibrary();
        return JsPdf;                                                             // <-- TrueVision3D also awaits its Open Sans cuts here (Na__LayoutEditor__PdfFonts__, not ported yet)
    }
    // ------------------------------------------------------------
"""))

# 4. The picture helper, before Draw One Viewport (TrueVision3D 1.11.0 verbatim)
REPLACEMENTS.append(('AddPicture', """    // HELPER FUNCTION | Draw One Viewport
    // ------------------------------------------------------------
    async function Na__LePdf__DrawViewport(doc, sheet, viewport) {
""", """    // HELPER FUNCTION | Put One Viewport Picture on the Page
    // ------------------------------------------------------------
    // EVERY VIEWPORT PICTURE IS PACKED 'FAST'. Given no compression, jsPDF
    // picks 'SLOW' on a compressed document - the Paeth predictor on every
    // row - and Chrome's PDF viewer, the same engine as Android's, paints
    // black blocks and streaks over any such picture over 60,000,000 decoded
    // bytes (PS01 D01's proposed plan, 4518 x 5183 px, 70.3 MB). 'FAST' is the
    // Sub predictor, which never reads the row above, so it cannot happen; the
    // cost is a larger picture. Sheet Images have always been packed this way.
    // options.pictureCompression overrides it for a caller that wants other.
    // ------------------------------------------------------------
    function Na__LePdf__AddPicture(doc, dataUrl, x, y, widthMm, heightMm, options) {
        const packing = (options && typeof options.pictureCompression === 'string') ? options.pictureCompression : 'FAST';
        doc.addImage(dataUrl, 'PNG', x, y, widthMm, heightMm, undefined, packing);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw One Viewport
    // ------------------------------------------------------------
    async function Na__LePdf__DrawViewport(doc, sheet, viewport, options) {
"""))

# 5. DrawViewport: the strict check on a missing drawing source, the underlay through AddPicture
REPLACEMENTS.append(('2D strict + underlay', """                if (!described.definition) return;
                const underlay = await Na__LeVp2d__RenderForExport(viewport);
                if (underlay && underlay.dataUrl) doc.addImage(underlay.dataUrl, 'PNG', frame.X, frame.Y, frame.WidthMm, frame.HeightMm);
""", """                if (!described.definition) { if (options && options.strict) throw new Error('A viewport drawing source is missing.'); return; }
                const underlay = await Na__LeVp2d__RenderForExport(viewport);
                if (underlay && underlay.dataUrl) Na__LePdf__AddPicture(doc, underlay.dataUrl, frame.X, frame.Y, frame.WidthMm, frame.HeightMm, options);
"""))

# 6. DrawViewport: the strict check on a 3D render, the picture through AddPicture
REPLACEMENTS.append(('3D strict + picture', """            const dataUrl = await Na__LeVp3d__RenderForExport(sheet, viewport);
            if (dataUrl) {
                const rect = Na__LeVp3d__ExportRectMm(viewport);                   // <-- The picture's own rectangle, or the frame when it shows a window of a zoomed picture
                doc.addImage(dataUrl, 'PNG', frame.X + rect.X, frame.Y + rect.Y, rect.WidthMm, rect.HeightMm);
            }
""", """            const dataUrl = await Na__LeVp3d__RenderForExport(sheet, viewport);
            if (!dataUrl && options && options.strict) throw new Error('A 3D viewport could not be rendered.');
            if (dataUrl) {
                const rect = Na__LeVp3d__ExportRectMm(viewport);                   // <-- The picture's own rectangle, or the frame when it shows a window of a zoomed picture
                Na__LePdf__AddPicture(doc, dataUrl, frame.X + rect.X, frame.Y + rect.Y, rect.WidthMm, rect.HeightMm, options);
            }
"""))

# 7. BuildDocument takes the options and hands them to each viewport
REPLACEMENTS.append(('BuildDocument signature', """    async function Na__LePdf__BuildDocument(sheet) {
""", """    async function Na__LePdf__BuildDocument(sheet, options) {
"""))
REPLACEMENTS.append(('BuildDocument viewport loop', """        for (let i = 0; i < ordered.length; i++) await Na__LePdf__DrawViewport(doc, sheet, ordered[i]);   // <-- Pictures at the raster export level
""", """        for (let i = 0; i < ordered.length; i++) await Na__LePdf__DrawViewport(doc, sheet, ordered[i], options);   // <-- Pictures at the raster export level
"""))

# 8. ExportSheet takes the options and awaits the save
REPLACEMENTS.append(('ExportSheet signature', """    async function Na__LePdf__ExportSheet(sheet, showToast) {
""", """    async function Na__LePdf__ExportSheet(sheet, showToast, options) {
"""))
REPLACEMENTS.append(('ExportSheet build + save', """            const built = await Na__LePdf__BuildDocument(sheet);
            built.doc.save(built.filename);
""", """            const built = await Na__LePdf__BuildDocument(sheet, options);
            await built.doc.save(built.filename, { returnPromise : true });
"""))

# 9. The export list gains LoadLibrary (TrueVision3D's line verbatim)
REPLACEMENTS.append(('exports', """    export {
        Na__LePdf__EnsureJsPdf,
        Na__LePdf__BuildDocument,
        Na__LePdf__ExportSheet
    };
""", """    export {
        Na__LePdf__EnsureJsPdf,
        Na__LePdf__LoadLibrary,                                                 // <-- jsPDF ALONE, for the statement PDF: it draws no text, so the Open Sans cuts EnsureJsPdf also fetches would be half a megabyte a reader never uses
        Na__LePdf__BuildDocument,
        Na__LePdf__ExportSheet
    };
"""))


# -----------------------------------------------------------------------------
# Actions
# -----------------------------------------------------------------------------
def build():
    raw = read(BEFORE)
    if sha(raw) != PRE_SHA:
        raise SystemExit('pre-image hash mismatch: ' + sha(raw))
    if raw.count(b'\r\n') != raw.count(b'\n'):
        raise SystemExit('pre-image is not pure CRLF')
    text = raw.decode('utf-8').replace('\r\n', '\n')
    for name, old, new in REPLACEMENTS:
        n = text.count(old)
        if n != 1:
            raise SystemExit('hunk "%s": expected exactly 1 occurrence, found %d' % (name, n))
        try:
            new.encode('ascii')
        except UnicodeEncodeError:
            raise SystemExit('hunk "%s": new text is not ASCII' % name)
        text = text.replace(old, new)
        print('hunk OK:', name)
    out = text.replace('\n', '\r\n').encode('utf-8')
    os.makedirs(os.path.dirname(CANDIDATE), exist_ok=True)
    with open(CANDIDATE, 'wb') as fh:
        fh.write(out)
    print('candidate written: %d -> %d bytes, sha256 %s, crlf %d, lone lf %d' % (
        len(raw), len(out), sha(out), out.count(b'\r\n'), out.count(b'\n') - out.count(b'\r\n')))


def apply():
    live = read(LIVE)
    if sha(live) != PRE_SHA:
        raise SystemExit('REFUSED: the live file changed since the pre-image (live sha256 %s)' % sha(live))
    cand = read(CANDIDATE)
    with open(LIVE, 'wb') as fh:
        fh.write(cand)
    after = read(LIVE)
    with open(WRITTEN, 'w', encoding='utf-8') as fh:
        fh.write('%s  %s  bytes=%d crlf=%d lf=%d\n' % (sha(after), REL, len(after), after.count(b'\r\n'),
                                                     after.count(b'\n') - after.count(b'\r\n')))
    print('applied: live sha256 %s (%d bytes)' % (sha(after), len(after)))


def check_live():
    live = read(LIVE)
    cand = read(CANDIDATE)
    print('LIVE == CANDIDATE' if live == cand else 'LIVE != CANDIDATE', sha(live))
    return 0 if live == cand else 1


def restore():
    live = read(LIVE)
    with open(WRITTEN, 'r', encoding='utf-8') as fh:
        written = fh.read().split()[0]
    if sha(live) != written:
        raise SystemExit('REFUSED: the live file is not what --apply wrote (someone changed it since)')
    pre = read(BEFORE)
    with open(LIVE, 'wb') as fh:
        fh.write(pre)
    print('restored pre-image: sha256 %s' % sha(read(LIVE)))


if __name__ == '__main__':
    action = sys.argv[1] if len(sys.argv) > 1 else '--build'
    if action == '--build':
        build()
    elif action == '--apply':
        apply()
    elif action == '--check-live':
        sys.exit(check_live())
    elif action == '--restore':
        restore()
    else:
        raise SystemExit('unknown action ' + action)
