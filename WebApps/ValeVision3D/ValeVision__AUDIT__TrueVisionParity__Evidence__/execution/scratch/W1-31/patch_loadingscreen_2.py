# W1-31 - second, small pass on Na__LayoutEditor__LoadingScreen__.js (LF file): name the headline as
# TrueVision's first-open veil's (this app's veil takes it with LoadingVeil 1.1.0, W1-33), not "the
# editor's own". Refuses unless the file is the first pass's output (sha1 f974c445...).
import hashlib
import sys
from pathlib import Path

TARGET = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader\Na__LayoutEditor__LoadingScreen__.js')
BEFORE = 'f974c4458e71cc6ea26be25cfb2ee9201b6bb3e5'
SAVED  = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-31\preimage\Na__LayoutEditor__LoadingScreen__.pass1.js')

PAIRS = [
('''// - TRUEVISION'S WORDS. The title is the headline of the editor's own
//   first-open veil, "Your Drawings Are Loading" (the label
//   VeilDrawingsHeadline), so the reader is told the same thing whichever
//   cover is up. The status lines under it are the loader's.
''', '''// - TRUEVISION'S WORDS. The title is the headline of TrueVision's first-open
//   veil, "Your Drawings Are Loading" (its label VeilDrawingsHeadline), so the
//   reader is told the same thing whichever cover is up. The status lines
//   under it are the loader's.
'''),
('''// - THE TITLE IS TRUEVISION'S. "Loading Layout Editor..." becomes "Your
//   Drawings Are Loading", the headline of the editor's own first-open veil
//   (its label VeilDrawingsHeadline), as DR-39 asks. The screen's look, its
//   status lines and its error state are unchanged.
''', '''// - THE TITLE IS TRUEVISION'S. "Loading Layout Editor..." becomes "Your
//   Drawings Are Loading", the headline of TrueVision's first-open veil (its
//   label VeilDrawingsHeadline), as DR-39 asks. The screen's look, its status
//   lines and its error state are unchanged.
'''),
]


def main():
    raw = TARGET.read_bytes()
    sha = hashlib.sha1(raw).hexdigest()
    if sha != BEFORE:
        sys.exit('REFUSED: file is ' + sha + ', expected ' + BEFORE)
    assert b'\r' not in raw
    SAVED.write_bytes(raw)
    text = raw.decode('utf-8')
    for n, (old, new) in enumerate(PAIRS, 1):
        assert text.count(old) == 1, (n, text.count(old))
        text = text.replace(old, new, 1)
    out = text.encode('utf-8')
    TARGET.write_bytes(out)
    print('written', len(out), 'bytes, sha1', hashlib.sha1(out).hexdigest())


if __name__ == '__main__':
    main()
