# W0-06 G0 preflight: byte pre-images and SHA-1 of every existing file this package edits.
# Writes scratch/W0-06/preimage/<flattened name> and preimage_manifest.json. Read-only on the repo.
import hashlib, json, os, subprocess, sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCR = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(SCR, "preimage")
os.makedirs(PRE, exist_ok=True)

EXISTING = [
    r"02__Src__AppModules\03__AppUtils\Na__AppUtils__R2AssetUpload__.js",
    r"02__Src__AppModules\21__System__PresentationMode\Na__PresentationMode__DevMenu__SceneEditor.js",
    r"02__Src__AppModules\21__System__PresentationMode\Na__PresentationMode__DevMenu__SceneReorder__.js",
    r"02__Src__AppModules\21__System__PresentationMode\Na__PresentationMode__DevMenu__SceneRowBuilders__.js",
    r"02__Src__AppModules\51__System__LayoutEditor\07__Core__SheetData\Na__LayoutEditor__History__.js",
    r"02__Src__AppModules\51__System__LayoutEditor\40__Ui__Panels\Na__LayoutEditor__Toolbar__.js",
    r"ValeVision__DEVLOG__.md",
    r"ValeVision__PARITY__TrueVisionLedger__.md",
    r"ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md",
]
NEW = [
    r"02__Src__AppModules\41__System__CrossSectionView\README__CrossSectionView__.md",
    r"ValeVision__NOTES__FolderNumberRegistry__.md",
    r"ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md",
]

manifest = {"existing": {}, "new_absent": {}}
for rel in EXISTING:
    p = os.path.join(VV, rel)
    b = open(p, "rb").read()
    flat = rel.replace("\\", "__SLASH__")
    open(os.path.join(PRE, flat), "wb").write(b)
    manifest["existing"][rel] = {
        "sha1": hashlib.sha1(b).hexdigest(),
        "bytes": len(b),
        "crlf": b.count(b"\r\n"),
        "lf": b.count(b"\n"),
        "bom": b[:3] == b"\xef\xbb\xbf",
        "nonascii": sum(1 for x in b if x > 127),
        "preimage": flat,
    }
for rel in NEW:
    manifest["new_absent"][rel] = not os.path.exists(os.path.join(VV, rel))

paths = ["WebApps/ValeVision3D/" + r.replace("\\", "/") for r in EXISTING + NEW]
st = subprocess.run(["git", "-C", r"D:\10_CoreLib__ValeCodebase", "status", "--short", "--"] + paths,
                    capture_output=True, text=True)
manifest["git_status"] = st.stdout.splitlines()
pin = subprocess.run(["git", "-C", r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb", "cat-file", "-e", "b2aa9151"],
                     capture_output=True, text=True)
manifest["tv_pin_present"] = (pin.returncode == 0)
json.dump(manifest, open(os.path.join(SCR, "preimage_manifest.json"), "w", encoding="utf-8"), indent=1)
print(json.dumps(manifest, indent=1))
