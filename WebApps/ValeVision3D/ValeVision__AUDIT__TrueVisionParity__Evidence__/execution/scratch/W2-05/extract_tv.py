"""W2-05 - copy the TrueVision files this package reads, at the pin, into scratch/W2-05/tv/ (bytes, as git show returns them),
and the ValeVision pre-images into scratch/W2-05/backup/ (only when no backup exists yet)."""
import os, subprocess, shutil, hashlib

PIN     = "b2aa9151"
TV_REPO = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TV_APP  = "na-apps/30__TrueVision__CoreAppCode/"
VV_ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE    = os.path.dirname(os.path.abspath(__file__))

TV_FILES = [
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js",
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__RowBuilders__.js",
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__AppConfig__.json",
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css",
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js",
    "02__Src__AppModules/48__System__CrossSectionViews/Na__CrossSection__DevMenu__Editor__.js",
    "02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js",
    "02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__RowBuilders__.js",
    "Index.html",
]

VV_FILES = [
    "02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js",
    "02__Src__AppModules/41__System__CrossSectionView/Na__UiFeature__CrossSectionView__DevControls.js",
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__AppConfig__.json",
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js",
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__RowBuilders__.js",
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js",
    "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css",
    "index.html",
]

def main():
    tv_dir = os.path.join(HERE, "tv"); os.makedirs(tv_dir, exist_ok=True)
    for rel in TV_FILES:
        b = subprocess.run(["git", "-C", TV_REPO, "show", PIN + ":" + TV_APP + rel], capture_output=True, check=True).stdout
        open(os.path.join(tv_dir, os.path.basename(rel)), "wb").write(b)
        print("tv", rel, len(b), hashlib.sha256(b).hexdigest()[:12])
    bk = os.path.join(HERE, "backup"); os.makedirs(bk, exist_ok=True)
    for rel in VV_FILES:
        dst = os.path.join(bk, os.path.basename(rel))
        src = os.path.join(VV_ROOT, rel.replace("/", os.sep))
        if os.path.exists(dst):
            print("backup kept", rel); continue
        shutil.copyfile(src, dst)
        b = open(dst, "rb").read()
        print("backup", rel, len(b), "CRLF" if b"\r\n" in b else "LF", hashlib.sha256(b).hexdigest()[:12])

if __name__ == "__main__":
    main()
