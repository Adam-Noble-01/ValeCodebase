#!/usr/bin/env python3
# W0-07 scratch tool: capture byte pre-images and SHA-1s of the package's four files,
# or verify that the live files still match the captured manifest.
#   python w0_07_preimage.py capture
#   python w0_07_preimage.py verify
import hashlib
import json
import shutil
import sys
from pathlib import Path

REPO      = Path(r"D:/10_CoreLib__ValeCodebase")
SCRATCH   = Path(__file__).resolve().parent
PRE_DIR   = SCRATCH / "preimage"
MANIFEST  = PRE_DIR / "manifest.json"
FILES     = [
    "WebApps/ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json",
    "WebApps/Whitecardopedia/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py",
    "WebApps/Whitecardopedia/Tools__DevUtils/AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py",
    "WebApps/Whitecardopedia/Tools__DevUtils/AutomationUtil__R2Common__Lib__.py",
]


def sha1(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def capture():
    PRE_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for rel in FILES:
        src  = REPO / rel
        data = src.read_bytes()
        dest = PRE_DIR / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        manifest[rel] = {
            "sha1": sha1(data),
            "bytes": len(data),
            "crlf": data.count(b"\r\n"),
            "lf": data.count(b"\n"),
        }
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


def verify():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    ok = True
    for rel, rec in manifest.items():
        now = sha1((REPO / rel).read_bytes())
        same = now == rec["sha1"]
        ok = ok and same
        print(("SAME    " if same else "CHANGED ") + rel)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    {"capture": capture, "verify": verify}[sys.argv[1]]()
