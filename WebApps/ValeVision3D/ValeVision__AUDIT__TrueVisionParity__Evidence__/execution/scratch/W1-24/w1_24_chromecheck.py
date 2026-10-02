# =============================================================================
# W1-24 scratch: did Chromium's PDF viewer paint the big picture as it is?
# =============================================================================
# The source picture is grey (R = G, B = R + 4 at most): every coloured pixel
# Chromium paints inside the page is garbling, and so is any dark pixel the
# picture does not have there. Reads the screenshots w1_24_chrome.mjs took.
#   python -B w1_24_chromecheck.py
# =============================================================================
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PDF = os.path.join(HERE, 'pdf')
Image.MAX_IMAGE_PIXELS = None


def page_box(rgb):
    # The paper: the large near-white block right of the thumbnail pane. Find
    # its columns and rows from the brightest wide run.
    bright = (rgb.min(axis=2) >= 245)
    cols = np.where(bright.mean(axis=0) > 0.25)[0]
    rows = np.where(bright.mean(axis=1) > 0.25)[0]
    return int(cols.min()), int(rows.min()), int(cols.max()), int(rows.max())


def measure(name):
    path = os.path.join(PDF, 'chrome__' + name + '.png')
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    x0, y0, x1, y1 = page_box(rgb)
    page = rgb[y0:y1 + 1, x0:x1 + 1]
    spread = page.max(axis=2) - page.min(axis=2)
    coloured = float((spread > 40).mean())
    dark = float((page.max(axis=2) < 40).mean())
    return (x0, y0, x1, y1), coloured, dark


def main():
    src = np.asarray(Image.open(os.path.join(PDF, 'source__underlay_big.png')).convert('RGB')).astype(np.int16)
    src_spread = src.max(axis=2) - src.min(axis=2)
    print('source picture: coloured pixels %.4f%%, dark pixels %.4f%%' % (
        100 * float((src_spread > 40).mean()), 100 * float((src.max(axis=2) < 40).mean())))
    failures = 0
    runs = [('before__big', False), ('candidate__big', True)]
    if os.path.exists(os.path.join(PDF, 'chrome__live__big.png')):
        runs.append(('live__big', True))                                         # <-- The landed file's own PDF
    for name, want_clean in runs:
        box, coloured, dark = measure(name)
        clean = coloured < 0.001 and dark < 0.01
        verdict = ('clean' if clean else 'GARBLED')
        expected = (clean == want_clean)
        failures += 0 if (expected or not want_clean) else 1
        print('%-15s page %s  coloured %.3f%%  dark %.3f%%  -> %s%s' % (
            name, box, 100 * coloured, 100 * dark, verdict,
            '' if expected else '  (unexpected)'))
    print('RESULT: %s' % ('PASS - the FAST picture paints clean in Chromium\'s PDF viewer' if failures == 0 else 'FAIL'))
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
