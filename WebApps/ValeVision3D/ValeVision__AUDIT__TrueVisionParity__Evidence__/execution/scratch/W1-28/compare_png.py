"""Compare the harness PNGs old vs new (pixel diff), and sample the synthetic sheet's magenta points.

    python compare_png.py [old-prefix] [new-prefix]      (defaults: old new)
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

SCRATCH = os.path.dirname(os.path.abspath(__file__))
PNG = os.path.join(SCRATCH, "png")
DIFF = os.path.join(SCRATCH, "png", "diff")
os.makedirs(DIFF, exist_ok=True)
OLD = sys.argv[1] if len(sys.argv) > 1 else "old"
NEW = sys.argv[2] if len(sys.argv) > 2 else "new"


def load(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.int16)


def compare(name):
    a_path = os.path.join(PNG, f"{OLD}__{name}.png")
    b_path = os.path.join(PNG, f"{NEW}__{name}.png")
    if not (os.path.exists(a_path) and os.path.exists(b_path)):
        return {"name": name, "missing": [p for p in (a_path, b_path) if not os.path.exists(p)]}
    a, b = load(a_path), load(b_path)
    if a.shape != b.shape:
        return {"name": name, "shape": [list(a.shape), list(b.shape)]}
    d = np.abs(a - b).max(axis=2)
    changed = d > 0
    out = {"name": name, "size": [int(a.shape[1]), int(a.shape[0])], "pixels": int(changed.sum()), "maxDiff": int(d.max())}
    if out["pixels"]:
        ys, xs = np.nonzero(changed)
        out["bbox"] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
        out["over8"] = int((d > 8).sum())
        img = np.where(changed[..., None], np.array([255, 0, 0], dtype=np.int16), (a // 3 + 170)).astype(np.uint8)
        Image.fromarray(img).save(os.path.join(DIFF, f"{name}.png"))
    return out


def sample(prefix, name, points_px):
    path = os.path.join(PNG, f"{prefix}__{name}.png")
    if not os.path.exists(path):
        return None
    img = load(path)
    return {label: [int(v) for v in img[int(y), int(x)]] for label, (x, y) in points_px.items()}


def main():
    names = sorted({os.path.basename(p)[len(NEW) + 2:-4] for p in glob.glob(os.path.join(PNG, f"{NEW}__*.png"))})
    results = [compare(n) for n in names]
    for r in results:
        flag = "SAME" if r.get("pixels") == 0 else "DIFF"
        print(f"{flag}  {r['name']:60s} {json.dumps({k: v for k, v in r.items() if k != 'name'})}")
    # The synthetic sheet: magenta (#ff00ff) inside the 2D frame (150, 100) and outside every frame (125, 160), paper mm
    screen = lambda mm: (mm[0] * 3.2, mm[1] * 3.2)          # zoom 1 at 3.2 px/mm
    pdf = lambda mm: (mm[0] * 3, mm[1] * 3)                 # the PDF raster at 3 px/mm
    pts = {"inFrame": (150, 100), "outside": (125, 160)}
    print("\nSYNTHETIC SAMPLES (RGB): magenta = [255, 0, 255]")
    for prefix in (OLD, NEW):
        for case in ("over__opaque", "under__opaque", "over__lines", "under__lines"):
            s = sample(prefix, "synthetic__" + case, {k: screen(v) for k, v in pts.items()})
            p = sample(prefix, "pdf__synthetic__" + case, {k: pdf(v) for k, v in pts.items()})
            print(f"  {prefix:4s} {case:15s} screen {s}   pdf {p}")
    with open(os.path.join(SCRATCH, "logs", f"compare__{OLD}__{NEW}.json"), "w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=1)


if __name__ == "__main__":
    main()
