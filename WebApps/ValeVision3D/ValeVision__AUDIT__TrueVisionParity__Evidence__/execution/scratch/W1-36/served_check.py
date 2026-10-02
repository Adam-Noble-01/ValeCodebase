"""W1-36 scratch: read-only GETs on Adam's running Flask server - the changed modules are served as written."""
import hashlib
import os
import urllib.request

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
BASE = "http://localhost:8000/ValeVision3D/"
FILES = [
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js",
    "02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js",
    "02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js",
    "02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json",
]


def get(url):
    req = urllib.request.Request(url, headers={"Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status, r.read()


status, _ = get("http://localhost:8000/api/check-localhost")
print("api/check-localhost", status)
for rel in FILES:
    status, body = get(BASE + rel)
    disk = open(os.path.join(VV, rel.replace("/", os.sep)), "rb").read()
    print("%d %s %s" % (status, "same-as-disk" if body == disk else "DIFFERS", rel))
