# W1-31 - patch Na__LayoutEditor__LoadingScreen__.js (LF file) with byte-exact anchors.
# Reads bytes, applies each (old, new) pair once, keeps LF, writes the file in one write.
# Refuses if the file is not the pre-image.
#   python -B patch_loadingscreen.py            apply
#   python -B patch_loadingscreen.py --check    dry run (anchors only)
#   python -B patch_loadingscreen.py --restore  put the pre-image back
import hashlib
import sys
from pathlib import Path

TARGET = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader\Na__LayoutEditor__LoadingScreen__.js')
PREIMAGE = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-31\preimage\Na__LayoutEditor__LoadingScreen__.js')
PRE_SHA1 = '601e53037de7054f637a3aee350a661a0c0b9a20'

PAIRS = []

# -----------------------------------------------------------------------------
# 1. Header: DESCRIPTION wording bullet, PORT NOTE, new log entry
# -----------------------------------------------------------------------------
PAIRS.append(('''// - A load that fails turns the screen into its error state: what went
//   wrong, Reload Page (a module that failed to load stays failed until the
//   page is reloaded) and Back to 3D Model.
//
// INTEGRATION:
// - Driven by Na__LayoutEditor__Loader__ only. Its extra rules live in
//   Na__LayoutEditor__Styles__Boot__.css, which loads with the page.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none
// - Ported on     : 15-Sep-2026 for ValeVision3D v2.45.0
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : with the loader.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 15-Sep-2026 - Version 1.0.0
''', '''// - A load that fails turns the screen into its error state: what went
//   wrong, Reload Page (a module that failed to load stays failed until the
//   page is reloaded) and Back to 3D Model.
// - TRUEVISION'S WORDS. The title is the headline of the editor's own
//   first-open veil, "Your Drawings Are Loading" (the label
//   VeilDrawingsHeadline), so the reader is told the same thing whichever
//   cover is up. The status lines under it are the loader's.
//
// INTEGRATION:
// - Driven by Na__LayoutEditor__Loader__ only. Its extra rules live in
//   Na__LayoutEditor__Styles__Boot__.css, which loads with the page.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.45.0), with the loader. No TrueVision
//                   twin: TrueVision's editor loads with the page, behind its own start-up screen.
// - Mirrors       : the headline of TrueVision3D's first-open veil, "Your Drawings Are Loading"
//                   (Na__LayoutEditor__LoadingVeil__ 1.1.0, label VeilDrawingsHeadline, TrueVision3D
//                   v2.83.0, 20-Sep-2026; read at b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-31}} (the wording)
// - Parity        : new - a permanent ValeVision seam with the loader (DR-24 (a))
// - Divergences   : n/a (no TrueVision twin)
// - Back-port     : none by default; offered to TrueVision only with the loader (DR-24 (a), DR-36).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.1 (TrueVision's veil wording, {{VVREL:W1-31}})
// - THE TITLE IS TRUEVISION'S. "Loading Layout Editor..." becomes "Your
//   Drawings Are Loading", the headline of the editor's own first-open veil
//   (its label VeilDrawingsHeadline), as DR-39 asks. The screen's look, its
//   status lines and its error state are unchanged.
//
// 15-Sep-2026 - Version 1.0.0
'''))

# -----------------------------------------------------------------------------
# 2. The title constant and why it is a fallback
# -----------------------------------------------------------------------------
PAIRS.append(('''    // MODULE CONSTANTS | Element Id, Start-Up Screen Classes, Timing and Wording
    // ------------------------------------------------------------
    // The wording cannot come from the editor's config: the screen is up
    // precisely because that config has not loaded yet.
    // ------------------------------------------------------------
''', '''    // MODULE CONSTANTS | Element Id, Start-Up Screen Classes, Timing and Wording
    // ------------------------------------------------------------
    // The wording cannot come from the editor's config: the screen is up
    // precisely because that config has not loaded yet. So the title is the
    // veil label's own fallback, word for word, and the loader reads the
    // drawing count's label from the config once it is there.
    // ------------------------------------------------------------
'''))
PAIRS.append(('''    const Na__LeLoadScreen__TITLE       = 'Loading Layout Editor...';
''', '''    const Na__LeLoadScreen__TITLE       = 'Your Drawings Are Loading';        // <-- The first-open veil's headline (label VeilDrawingsHeadline; TrueVision's wording, DR-39)
'''))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--apply'
    if mode == '--restore':
        data = PREIMAGE.read_bytes()
        assert hashlib.sha1(data).hexdigest() == PRE_SHA1, 'pre-image copy is not the recorded pre-image'
        TARGET.write_bytes(data)
        print('restored', TARGET, hashlib.sha1(data).hexdigest())
        return
    raw = TARGET.read_bytes()
    sha = hashlib.sha1(raw).hexdigest()
    if sha != PRE_SHA1:
        sys.exit('REFUSED: ' + str(TARGET) + ' is ' + sha + ', not the pre-image ' + PRE_SHA1 + ' (changed under us?)')
    assert b'\r' not in raw, 'expected an LF file'
    text = raw.decode('utf-8')
    for n, (old, new) in enumerate(PAIRS, 1):
        count = text.count(old)
        if count != 1:
            sys.exit('REFUSED: anchor %d found %d times' % (n, count))
        assert '\r' not in new and '\t' not in new, 'pair %d has CR or TAB' % n
        text = text.replace(old, new, 1)
    out = text.encode('utf-8')
    if mode == '--check':
        print('anchors OK (%d pairs); would write %d bytes (%d lines), sha1 %s' % (len(PAIRS), len(out), out.count(b'\n'), hashlib.sha1(out).hexdigest()))
        return
    TARGET.write_bytes(out)
    print('written', TARGET, len(out), 'bytes,', out.count(b'\n'), 'lines, sha1', hashlib.sha1(out).hexdigest())


if __name__ == '__main__':
    main()
