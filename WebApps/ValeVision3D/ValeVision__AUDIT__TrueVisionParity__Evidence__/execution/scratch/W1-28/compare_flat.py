"""Old vs new screen shots with FLAT viewport cards: every differing pixel classified as
   - edge : within 2 px of a card's edge in either picture (the frame's sub-pixel place: translate vs left/top)
   - text : elsewhere, small (max channel difference <= 80) - glyph anti-aliasing noise
   - other: anything else - a real change of what is drawn over what
"""
import glob
import json
import os

import numpy as np
from PIL import Image

SCRATCH = os.path.dirname(os.path.abspath(__file__))
PNG = os.path.join(SCRATCH, "png")
CARDS = [np.array([200, 214, 229]), np.array([229, 214, 200])]   # #c8d6e5 (2D), #e5d6c8 (3D)


def load(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.int16)


def card_mask(img):
    m = np.zeros(img.shape[:2], dtype=bool)
    for c in CARDS:
        m |= (np.abs(img - c).max(axis=2) <= 6)
    return m


def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(m, dy, axis=0), dx, axis=1)
    return out


def erode(m, r):
    return ~dilate(~m, r)


def main():
    rows = []
    for new_path in sorted(glob.glob(os.path.join(PNG, "new__*__flat__*.png")) + glob.glob(os.path.join(PNG, "new__*__clear__*.png"))):
        name = os.path.basename(new_path)[5:-4]
        old_path = os.path.join(PNG, "old__" + name + ".png")
        a, b = load(old_path), load(new_path)
        if a.shape != b.shape:
            rows.append({"name": name, "shape": [list(a.shape), list(b.shape)]})
            continue
        d = np.abs(a - b).max(axis=2)
        changed = d > 0
        ma, mb = card_mask(a), card_mask(b)
        band = (dilate(ma, 2) & ~erode(ma, 2)) | (dilate(mb, 2) & ~erode(mb, 2))
        edge = changed & band
        rest = changed & ~band
        text = rest & (d <= 80)
        other = rest & (d > 80)
        row = {"name": name, "changed": int(changed.sum()), "edge": int(edge.sum()), "text": int(text.sum()), "other": int(other.sum()),
               "cardPixels": [int(ma.sum()), int(mb.sum())]}
        if other.any():
            ys, xs = np.nonzero(other)
            row["otherBbox"] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
        rows.append(row)
        print(json.dumps(row))
    with open(os.path.join(SCRATCH, "logs", "compare_flat.json"), "w", encoding="utf-8") as fh:
        json.dump(rows, fh, indent=1)


if __name__ == "__main__":
    main()
