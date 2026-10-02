"""W0-14 apply script: asset upload contract, VV-gated asset modules and TV's thumbnail call shape.

Usage:
    python apply_w0_14.py --dry-run    build every output into scratch/W0-14/out/ and diffs into scratch/W0-14/diffs/
    python apply_w0_14.py --write      the same, then write the four live files (each in one whole write)
    python apply_w0_14.py --restore    put the four pre-images back (only over this script's own output)
    python apply_w0_14.py --rewrite    rebuild and write again over this script's own previous output only
                                       (--rewrite-dry-run builds without writing)

Rules kept (execution policy 7, R6 F.1 P3/P18):
- Assets 1.0.1 and Persistence 1.2.1 are whole-file ports: the output starts from TrueVision's bytes at the pin
  (git show, LF) and only the listed seams are re-applied, each an exact-count replacement that fails loudly.
- R2AssetUpload and the Thumbnail Renderer are ValeVision-bodied files: the reviewed targets in scratch/W0-14/target/
  replace them, written with the live file's own line ending (both LF, checked).
- Before any write, every live file must still equal its pre-image (SHA-256 in preimage_manifest.json): a file that
  changed under this package is a stop condition, and nothing is written.
"""
import difflib
import hashlib
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
TV_APP = "na-apps/30__TrueVision__CoreAppCode"

ASSETS = "02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__Assets__.js"
PERSIST = "02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js"
R2ASSET = "02__Src__AppModules/03__AppUtils/Na__AppUtils__R2AssetUpload__.js"
THUMB = "02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js"
FILES = [ASSETS, PERSIST, R2ASSET, THUMB]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def live_path(rel):
    return os.path.join(VV, rel.replace("/", os.sep))


def tv_bytes(rel):
    return subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TV_APP + "/" + rel], capture_output=True, check=True).stdout


def replace_exact(text, old, new, count, label):
    found = text.count(old)
    if found != count:
        raise SystemExit(f"STOP: seam '{label}' expected {count} occurrence(s) of its anchor, found {found}")
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# Seams for the two whole-file ports (TrueVision text -> ValeVision text)
# -----------------------------------------------------------------------------

ASSETS_TV_PORT_NOTE = r"""// PORT NOTE:
// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__Assets__.js
// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)
// - Parity        : verbatim, but for the folder Load reads from
// - Divergences   : Console prefix, header and folder numbers. Load reads from
//                   the URL's project folder, where TrueVision's upload writes,
//                   not from a folder named after the project code.
// - Back-port     : n/a (this IS the back-port)
"""

ASSETS_VV_PORT_NOTE = r"""// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5); since ported back
//                   whole from TrueVision3D 1.0.1 (HEAD b2aa9151)
// - Source version: 1.0.1 (TrueVision3D v2.54.0, 14-Sep-2026; read at b2aa9151) - in that release's
//                   commit; its devlog entry does not name the change (module log 14-Sep-2026)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W0-14}}
// - Parity        : adapted
// - Divergences   :
//   - Banner and console prefix read ValeVision3D.
//   - CanUpload asks Na__AppUtils__IsRunningOnLocalhost, not TrueVision's DevGate (TD01): only the
//     local Flask server hands out the worker key, so an unlocked session anywhere else would
//     render, try an upload that cannot land and toast (VV D24, DR-31 (2)). The import sits where
//     TrueVision imports Na__DevGate__IsAuthoringEnabled.
//   - Na__LeAssets__FolderId's two helpers carry TrueVision's names with ValeVision's meaning
//     (W0-11): the master-index folderId ("2026/3047__Doous"), and null rather than a guess.
//     Uploads go through Na__AppUtils__R2AssetUpload, ValeVision's twin, which resolves the same
//     folder from the project code (DIV-4).
// - Back-port     : none.
"""

PERSIST_TV_PORT_NOTE = r"""// PORT NOTE:
// - Ported from   : ValeVision3D 50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js
// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)
// - Parity        : verbatim, but for the folder FetchAsset reads from
// - Divergences   : Console prefix, header and folder numbers. FetchAsset reads
//                   from the URL's project folder, where TrueVision's upload
//                   writes, not from a folder named after the project code.
// - Back-port     : n/a (this IS the back-port)
"""

PERSIST_VV_PORT_NOTE = r"""// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.20.0, port Phase 4, from the Lantern
//                   Designer's VghLantern__ProjectedEdges__LineworkStore__.mjs of 07-Aug-2026; ValeVision's
//                   own 1.1.0 and 1.2.0 followed, 1.2.0 taken from TrueVision's Edge Styles); since ported
//                   back whole from TrueVision3D 1.2.1 (HEAD b2aa9151)
// - Source version: 1.2.1 (TrueVision3D v2.54.0, 14-Sep-2026; read at b2aa9151) - in that release's
//                   commit; its devlog entry does not name the change (module log 14-Sep-2026)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W0-14}}
// - Parity        : adapted
// - Divergences   :
//   - Banner and console prefix read ValeVision3D.
//   - The browser copy lives in IndexedDB ValeVision3D__ProjectedLinework (TrueVision3D__ProjectedLinework
//     in TrueVision): a database name carries the app's token.
//   - A stored block's Meta.Description reads "one ValeVision drawing".
//   - BakeBeforeSave bakes on localhost only (Na__AppUtils__IsRunningOnLocalhost), not whenever
//     TrueVision's DevGate says the session may author (TD01): the upload is a data-path write only
//     the local Flask server's worker key can make, so a bake anywhere else is CPU spent on an
//     upload that cannot land (VV D24, DR-31 (2)). The import sits where TrueVision imports
//     Na__DevGate__IsAuthoringEnabled.
//   - Na__PlStore__FolderId's two helpers carry TrueVision's names with ValeVision's meaning
//     (W0-11): the master-index folderId ("2026/3047__Doous"), and null rather than a guess. The
//     bake uploads through Na__AppUtils__R2AssetUpload, ValeVision's twin, which resolves the same
//     folder from the project code (DIV-4).
// - Back-port     : none.
"""

GATE_IMPORT_ASSETS_TV = "    import { Na__DevGate__IsAuthoringEnabled } from '../../03__AppUtils/Na__AppUtils__DevGate__.js';\n"
GATE_IMPORT_ASSETS_VV = ("    import { Na__AppUtils__IsRunningOnLocalhost } from '../../03__AppUtils/Na__AppUtils__ProjectLoader.js';"
                         "   // <-- ValeVision: the data-path gate is the hostname test (VV D24)\n")
GATE_IMPORT_PERSIST_TV = "    import { Na__DevGate__IsAuthoringEnabled } from '../03__AppUtils/Na__AppUtils__DevGate__.js';\n"
GATE_IMPORT_PERSIST_VV = ("    import { Na__AppUtils__IsRunningOnLocalhost } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';"
                          "   // <-- ValeVision: the data-path gate is the hostname test (VV D24)\n")


def build_assets():
    text = tv_bytes(ASSETS).decode("utf-8")
    text = replace_exact(text, "// TRUEVISION3D - LAYOUT EDITOR - ASSETS\n", "// VALEVISION3D - LAYOUT EDITOR - ASSETS\n", 1, "banner (H1)")
    text = replace_exact(text, ASSETS_TV_PORT_NOTE, ASSETS_VV_PORT_NOTE, 1, "PORT NOTE (H5)")
    text = replace_exact(text, GATE_IMPORT_ASSETS_TV, GATE_IMPORT_ASSETS_VV, 1, "gate import (VV D24)")
    text = replace_exact(text,
                         "        return Na__DevGate__IsAuthoringEnabled() && !!Na__DrawData__GetProjectCode();\n",
                         "        return Na__AppUtils__IsRunningOnLocalhost() && !!Na__DrawData__GetProjectCode();\n",
                         1, "CanUpload gate (VV D24)")
    text = replace_exact(text, "'[TrueVision3D LayoutEditor] Snapshot upload failed:'", "'[ValeVision3D LayoutEditor] Snapshot upload failed:'", 1, "console prefix (C1)")
    return text.encode("utf-8")


def build_persistence():
    text = tv_bytes(PERSIST).decode("utf-8")
    text = replace_exact(text, "// TRUEVISION3D - PROJECTED LINEWORK - PERSISTENCE\n", "// VALEVISION3D - PROJECTED LINEWORK - PERSISTENCE\n", 1, "banner (H1)")
    text = replace_exact(text, PERSIST_TV_PORT_NOTE, PERSIST_VV_PORT_NOTE, 1, "PORT NOTE (H5)")
    text = replace_exact(text, GATE_IMPORT_PERSIST_TV, GATE_IMPORT_PERSIST_VV, 1, "gate import (VV D24)")
    text = replace_exact(text, "'TrueVision3D__ProjectedLinework'", "'ValeVision3D__ProjectedLinework'", 1, "IndexedDB name (B2)")
    text = replace_exact(text, "'Projected linework for one TrueVision drawing, ", "'Projected linework for one ValeVision drawing, ", 1, "stored Description")
    text = replace_exact(text, "[TrueVision3D ProjectedLinework]", "[ValeVision3D ProjectedLinework]", 8, "console prefix (C1)")
    text = replace_exact(text,
                         "        if (!Na__DevGate__IsAuthoringEnabled()) return null;\n",
                         "        if (!Na__AppUtils__IsRunningOnLocalhost()) return null;\n",
                         1, "BakeBeforeSave gate (VV D24)")
    return text.encode("utf-8")


def build_target(rel, live_bytes):
    name = os.path.basename(rel)
    data = open(os.path.join(HERE, "target", name), "rb").read()
    text = data.decode("utf-8").replace("\r\n", "\n")
    if b"\r\n" in live_bytes:
        if live_bytes.count(b"\r\n") != live_bytes.count(b"\n"):
            raise SystemExit(f"STOP: {name} has mixed line endings; not patched")
        text = text.replace("\n", "\r\n")
    return text.encode("utf-8")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--dry-run"
    manifest = json.load(open(os.path.join(HERE, "preimage_manifest.json"), encoding="utf-8"))
    out_dir = os.path.join(HERE, "out")
    diff_dir = os.path.join(HERE, "diffs")
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(diff_dir, exist_ok=True)

    if mode == "--restore":
        own = json.load(open(os.path.join(HERE, "applied_manifest.json"), encoding="utf-8"))
        for rel in FILES:
            current = open(live_path(rel), "rb").read()
            if sha256(current) != own[rel]:
                print(f"SKIP restore of {rel}: it is not this script's output any more")
                continue
            pre = open(os.path.join(HERE, "preimage", os.path.basename(rel)), "rb").read()
            if sha256(pre) != manifest["vv"][rel]["sha256"]:
                raise SystemExit(f"STOP: pre-image copy of {rel} does not match its recorded hash")
            with open(live_path(rel), "wb") as fh:
                fh.write(pre)
            print(f"restored {rel}")
        return

    # 1. Nothing changed under this package. --write starts from the pre-images; --rewrite (and
    #    --rewrite-dry-run) only ever replaces this script's own previous output.
    rewriting = mode in ("--rewrite", "--rewrite-dry-run")
    if rewriting:
        own = json.load(open(os.path.join(HERE, "applied_manifest.json"), encoding="utf-8"))
        expected = {rel: own[rel] for rel in FILES}
    else:
        expected = {rel: manifest["vv"][rel]["sha256"] for rel in FILES}
    for rel in FILES:
        data = open(live_path(rel), "rb").read()
        if sha256(data) != expected[rel]:
            raise SystemExit(f"STOP: {rel} is not what this package expects (stop condition: a file I own changed under me)")
    live = {}
    for rel in FILES:
        pre = open(os.path.join(HERE, "preimage", os.path.basename(rel)), "rb").read()
        if sha256(pre) != manifest["vv"][rel]["sha256"]:
            raise SystemExit(f"STOP: pre-image copy of {rel} does not match its recorded hash")
        live[rel] = pre                                                          # <-- Line endings and diffs are taken from the pre-image

    # 2. The TV pin is what the manifest recorded
    for rel in (ASSETS, PERSIST):
        if sha256(tv_bytes(rel)) != manifest["tv"][rel]["sha256"]:
            raise SystemExit(f"STOP: TrueVision {rel} at {PIN} does not match the recorded read")

    # 3. Build
    outputs = {
        ASSETS: build_assets(),
        PERSIST: build_persistence(),
        R2ASSET: build_target(R2ASSET, live[R2ASSET]),
        THUMB: build_target(THUMB, live[THUMB]),
    }

    applied = {}
    for rel, data in outputs.items():
        name = os.path.basename(rel)
        with open(os.path.join(out_dir, name), "wb") as fh:
            fh.write(data)
        before = live[rel].decode("utf-8").replace("\r\n", "\n").split("\n")
        after = data.decode("utf-8").replace("\r\n", "\n").split("\n")
        diff = "\n".join(difflib.unified_diff(before, after, "before/" + name, "after/" + name, n=2, lineterm=""))
        with open(os.path.join(diff_dir, name + ".diff"), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(diff + "\n")
        applied[rel] = sha256(data)
        eol = "CRLF" if b"\r\n" in data else "LF"
        print(f"built {name:<52} {len(live[rel]):>6} -> {len(data):>6} bytes  {eol}  sha256 {applied[rel][:12]}")

    with open(os.path.join(HERE, "built_manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(applied, fh, indent=1)

    if mode not in ("--write", "--rewrite"):
        print("dry run: nothing written to the repository")
        return

    # 4. Write, each file in one whole write, re-checking the expected hash immediately before
    for rel, data in outputs.items():
        current = open(live_path(rel), "rb").read()
        if sha256(current) != expected[rel]:
            raise SystemExit(f"STOP: {rel} changed during the run; nothing more written")
        with open(live_path(rel), "wb") as fh:
            fh.write(data)
        if sha256(open(live_path(rel), "rb").read()) != applied[rel]:
            raise SystemExit(f"STOP: {rel} did not read back as written")
        print(f"wrote {rel}")
    with open(os.path.join(HERE, "applied_manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(applied, fh, indent=1)


if __name__ == "__main__":
    main()
