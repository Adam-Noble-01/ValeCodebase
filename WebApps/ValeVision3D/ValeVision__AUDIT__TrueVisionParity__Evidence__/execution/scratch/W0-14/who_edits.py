"""List every package whose edits / vv_targets / hot_files name one of W0-14's four files (read only)."""
import json

WP = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\wp_canonical.json"
NEEDLES = [
    "Na__AppUtils__R2AssetUpload__.js",
    "Na__PresentationMode__Thumbnail__Renderer.js",
    "Na__ProjectedLinework__Persistence__.js",
    "Na__LayoutEditor__Assets__.js",
]

data = json.load(open(WP, encoding="utf-8"))
packages = data if isinstance(data, list) else data.get("packages", data.get("work_packages", []))
if isinstance(packages, dict):
    packages = list(packages.values())
for pkg in packages:
    if not isinstance(pkg, dict):
        continue
    hits = []
    for field in ("edits", "vv_targets", "hot_files"):
        for path in pkg.get(field, []) or []:
            if any(n in path for n in NEEDLES):
                hits.append(f"{field}:{path.split('/')[-1]}")
    if hits:
        print(pkg.get("wp_id"), pkg.get("wave"), sorted(set(hits)))
