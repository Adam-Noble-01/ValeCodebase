# Read TV files at the pin with git show (bytes) and save copies into scratch/W0-04/tv_at_pin/ for reading.
import os, subprocess, sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
PREFIX = "na-apps/30__TrueVision__CoreAppCode/"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "tv_at_pin")

FILES = [
    "03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css",
    "03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css",
    "03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css",
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css",
    "02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css",
    "80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs",
    "80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs",
    "02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneEditor.js",
    "TrueVision__DEVLOG__.md",
]

def main():
    os.makedirs(OUT, exist_ok=True)
    for rel in FILES:
        r = subprocess.run(["git", "-C", NAWEB, "show", f"{PIN}:{PREFIX}{rel}"], capture_output=True)
        if r.returncode != 0:
            print("MISSING", rel, r.stderr.decode(errors="replace").strip())
            continue
        dst = os.path.join(OUT, rel.replace("/", "__"))
        with open(dst, "wb") as f:
            f.write(r.stdout)
        print(len(r.stdout), rel)

main()
