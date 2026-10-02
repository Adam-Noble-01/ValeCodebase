# =============================================================================
# W1-24 scratch: what the PDFs w1_24_realpdf.mjs wrote actually hold
# =============================================================================
# For every image XObject: its /DecodeParms predictor, the PNG filter byte that
# starts every row of its inflated stream (1 = Sub, 4 = Paeth), and whether the
# decoded pixels (qpdf applies the predictor) equal the source picture's.
#   python -B w1_24_pdfcheck.py
# Expectations: before__* Paeth on every row; candidate__* Sub on every row;
# candidate__small__SLOW Paeth (the override); pixels identical everywhere.
# =============================================================================
import os
import sys
import zlib

import pikepdf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PDF = os.path.join(HERE, 'pdf')
SOURCES = {
    (1100, 760): 'source__underlay_small.png',
    (640, 400): 'source__picture3d_small.png',
    (4518, 5183): 'source__underlay_big.png',
}
EXPECT = {
    'before__small.pdf': 4, 'candidate__small.pdf': 1, 'candidate__small__SLOW.pdf': 4,
    'before__big.pdf': 4, 'candidate__big.pdf': 1,
}
NAMES = {0: 'None', 1: 'Sub', 2: 'Up', 3: 'Average', 4: 'Paeth'}
Image.MAX_IMAGE_PIXELS = None


def source_rgb(size):
    with Image.open(os.path.join(PDF, SOURCES[size])) as im:
        return im.convert('RGB').tobytes()


def main():
    failures = 0
    for extra in ('live__small.pdf', 'live__big.pdf'):                         # <-- The live file's own run, once it is landed
        if os.path.exists(os.path.join(PDF, extra)):
            EXPECT[extra] = 1
    for name, want in EXPECT.items():
        path = os.path.join(PDF, name)
        if not os.path.exists(path):
            print('MISSING', name)
            failures += 1
            continue
        pdf = pikepdf.open(path)
        print('%s  (%d bytes)' % (name, os.path.getsize(path)))
        for page in pdf.pages:
            for key, xobj in page.images.items():
                w, h = int(xobj.Width), int(xobj.Height)
                parms = xobj.get('/DecodeParms')
                predictor = int(parms.get('/Predictor')) if parms is not None else None
                colors = int(parms.get('/Colors')) if parms is not None else 3
                raw = xobj.read_raw_bytes()
                inflated = zlib.decompress(raw)
                row = w * colors + 1
                rows = len(inflated) // row
                hist = {}
                for r in range(rows):
                    t = inflated[r * row]
                    hist[t] = hist.get(t, 0) + 1
                decoded = xobj.read_bytes()
                same = decoded == source_rgb((w, h))
                decoded_mb = w * h * colors / 1e6
                only = (len(hist) == 1 and want in hist and hist[want] == h)
                ok = only and same and rows == h
                failures += 0 if ok else 1
                print('  %s %dx%d  %.1f MB decoded  stream %d bytes  /Predictor %s  rows: %s  pixels %s  -> %s' % (
                    key, w, h, decoded_mb, len(raw), predictor,
                    ', '.join('%s x%d' % (NAMES.get(k, k), v) for k, v in sorted(hist.items())),
                    'IDENTICAL to the source' if same else 'DIFFER from the source',
                    'PASS' if ok else 'FAIL (expected every row %s)' % NAMES[want]))
    print('RESULT: %s' % ('PASS' if failures == 0 else 'FAIL (%d)' % failures))
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
