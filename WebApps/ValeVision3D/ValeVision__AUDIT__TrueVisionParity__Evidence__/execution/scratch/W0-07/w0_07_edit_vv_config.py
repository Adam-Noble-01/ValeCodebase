#!/usr/bin/env python3
# W0-07 scratch tool: add the ProjectData__EditorOwnedKeys block to the ValeVision main
# app config, right after ProjectData__AssetUrls. Byte-level edit that keeps the file's own
# line endings (CRLF in the working tree). Refuses to run if the file changed since the
# pre-image was captured, or if the anchor is not found exactly once.
import hashlib
import json
import sys
from pathlib import Path

CONFIG   = Path(r"D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json")
PRE_SHA1 = "55f4b0d47bbb5147b7769eb5fc52510ac0d9af2b"          # captured by w0_07_preimage.py capture

ANCHOR = (
    '        "ProjectData__AssetUrls__BuildManifestUrl"  : "https://cdn.noble-architecture.com/VaApps/Index/Na__BuildVersion__Manifest__.json"\n'
    '    },\n'
    '    "LoadResilience__Config": {\n'
)

KEYS = [
    "PresentationMode__SavedCameraScenes",
    "LayoutEditor__DrawingsData",
    "LayoutEditor__DrawingRegister",
    "CrossSection__SceneData",
    "CrossSection__Config",
    "Navmode__EnabledModes",
    "Navmode__OrbitMaxDistanceMm",
    "Camera__DefaultPosition",
    "OrbitHelperCube__Position",
    "FogPlane__Config",
    "RenderEngine__Config",
    "VideoStudio__Config",
    "GridLine__Grid__Offset__Config",
]

DESCRIPTION = (
    "The one list of top-level project.json keys the ValeVision editor owns (dev menus, presentation scenes, "
    "cross sections, the Layout Editor). The editor writes them to R2 first, so the local copy can fall behind. "
    "Anything that writes project.json whole keeps each listed key that R2 holds from R2's copy: the Whitecardopedia "
    "SketchUp cloud sync and the R2 audit/backfill tool (Whitecardopedia/Tools__DevUtils/AutomationUtil__R2Common__Lib__.py) "
    "do so, then write the merged document locally too; the sync still re-points IMG-slot scene thumbnails inside R2's copy "
    "of PresentationMode__SavedCameraScenes. The editor worker's merge-keys guard and the localhost load overlay take their "
    "key lists from here as well. A new top-level key the editor writes joins this list in the same change, or a sync from "
    "another machine drops it. Never list a pipeline key (projectCode, projectName, folderId, basePath, images, allImages, "
    "displayImages, thumbnailImage, valeVision_ModelUrls, ValeVison3D__SketchUpCameraData): the sync tools refuse a list that does."
)


def build_block() -> str:
    lines = [
        '    "ProjectData__EditorOwnedKeys": {',
        '        "ProjectData__EditorOwnedKeys__Description" : ' + json.dumps(DESCRIPTION, ensure_ascii=False) + ',',
        '        "ProjectData__EditorOwnedKeys__Keys"        : [',
    ]
    for i, key in enumerate(KEYS):
        lines.append('            ' + json.dumps(key) + (',' if i < len(KEYS) - 1 else ''))
    lines.append('        ]')
    lines.append('    },')
    return '\n'.join(lines) + '\n'


def main():
    raw = CONFIG.read_bytes()
    if hashlib.sha1(raw).hexdigest() != PRE_SHA1:
        print("STOP: the config changed since the pre-image was captured.")
        sys.exit(2)
    if raw.count(b"\r\n") != raw.count(b"\n"):
        print("STOP: mixed line endings; refusing to guess.")
        sys.exit(2)
    eol  = "\r\n" if b"\r\n" in raw else "\n"
    text = raw.decode("utf-8").replace("\r\n", "\n")
    if text.count(ANCHOR) != 1:
        print(f"STOP: anchor found {text.count(ANCHOR)} times (expected 1).")
        sys.exit(2)
    if '"ProjectData__EditorOwnedKeys"' in text:
        print("STOP: block already present.")
        sys.exit(2)

    head, tail = ANCHOR.split('    "LoadResilience__Config": {\n')
    new_text = text.replace(ANCHOR, head + build_block() + '    "LoadResilience__Config": {\n', 1)

    parsed = json.loads(new_text)                                   # must stay valid JSON
    block  = parsed["ProjectData__EditorOwnedKeys"]
    assert block["ProjectData__EditorOwnedKeys__Keys"] == KEYS
    before = json.loads(text)
    for k, v in before.items():                                     # every other block untouched
        assert parsed[k] == v, k
    assert list(parsed.keys()).index("ProjectData__EditorOwnedKeys") == list(parsed.keys()).index("ProjectData__AssetUrls") + 1

    out = new_text.replace("\n", eol).encode("utf-8")
    CONFIG.write_bytes(out)
    print(f"WROTE {CONFIG} ({len(raw)} -> {len(out)} bytes, eol={'CRLF' if eol == chr(13) + chr(10) else 'LF'})")
    print("sha1 after:", hashlib.sha1(out).hexdigest())


if __name__ == "__main__":
    main()
