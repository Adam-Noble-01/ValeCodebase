#!/usr/bin/env python3
# W0-07 scratch tool: build the staged copies of the three Whitecardopedia sync scripts and
# the new stub-client test under execution/prepared/W0-07/ (mirroring the repo-relative path
# from D:/10_CoreLib__ValeCodebase), and the unified diff execution/prepared/W0-07.patch
# against the live files. The live Whitecardopedia files are only READ (execution policy 2).
#
# Every edit is an exact, single-occurrence anchor match on the live text (CRLF normalised to
# LF while editing, written back as CRLF - each live file is uniformly CRLF). The script stops
# without writing anything if a live file changed since the pre-image or an anchor is not
# found exactly once.
import difflib
import hashlib
import json
import sys
from pathlib import Path

REPO      = Path(r"D:/10_CoreLib__ValeCodebase")
EXEC_DIR  = REPO / "WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution"
SCRATCH   = EXEC_DIR / "scratch/W0-07"
SNIPS     = SCRATCH / "snippets"
STAGE     = EXEC_DIR / "prepared/W0-07"
PATCH     = EXEC_DIR / "prepared/W0-07.patch"
MANIFEST  = SCRATCH / "preimage/manifest.json"

TOOLS_REL = "WebApps/Whitecardopedia/Tools__DevUtils"
SYNC_REL  = f"{TOOLS_REL}/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py"
AUDIT_REL = f"{TOOLS_REL}/AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py"
LIB_REL   = f"{TOOLS_REL}/AutomationUtil__R2Common__Lib__.py"
TEST_REL  = f"{TOOLS_REL}/Tests/Na__Test__SyncPipeline__EditorKeys__.test.py"
TEST_SRC  = SCRATCH / "src/Na__Test__SyncPipeline__EditorKeys__.test.py"


def snip(name: str) -> str:
    return (SNIPS / name).read_text(encoding="utf-8").replace("\r\n", "\n")


def replace_exact(text: str, old: str, new: str, label: str) -> str:
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"STOP: {label}: anchor found {n} times (expected 1)")
    return text.replace(old, new, 1)


def replace_region(text: str, start: str, end: str, new: str, label: str) -> str:
    if text.count(start) != 1 or text.count(end) != 1:
        raise SystemExit(f"STOP: {label}: start x{text.count(start)}, end x{text.count(end)} (expected 1 each)")
    i, j = text.index(start), text.index(end)
    if j <= i:
        raise SystemExit(f"STOP: {label}: end marker before start marker")
    return text[:i] + new + text[j:]


def insert_before(text: str, marker: str, new: str, label: str) -> str:
    if text.count(marker) != 1:
        raise SystemExit(f"STOP: {label}: marker found {text.count(marker)} times (expected 1)")
    i = text.index(marker)
    return text[:i] + new + text[i:]


def build_sync(text: str) -> str:
    text = replace_exact(text, snip("sync__E1_description__old.txt"), snip("sync__E1_description__new.txt"), "sync E1 description")
    text = replace_exact(text, snip("sync__E2_devlog__old.txt"), snip("sync__E2_devlog__new.txt"), "sync E2 devlog")
    text = insert_before(text, "def na_update_project_json_images(", snip("sync__E3a_helpers__insert.txt"), "sync E3a helpers")
    text = replace_exact(text, snip("sync__E3b_scan__old.txt"), snip("sync__E3b_scan__new.txt"), "sync E3b scan")
    text = replace_region(text, "def na_purge_stale_r2_glbs(", "def na_collect_local_image_names(",
                          snip("sync__E4_glb_purge__region.txt"), "sync E4 glb purge")
    text = replace_region(text, "def na_purge_stale_r2_images(", "def na_upload_glbs_to_r2(",
                          snip("sync__E5_image_purge__region.txt"), "sync E5 image purge")
    text = replace_region(text, "def na_upload_project_json_to_r2(", "def na_merge_camera_in_r2_project_json(",
                          snip("sync__E6_upload__region.txt"), "sync E6 upload")
    return text


def build_lib(text: str) -> str:
    text = replace_exact(text, snip("lib__L1_description__old.txt"), snip("lib__L1_description__new.txt"), "lib L1 description")
    text = replace_exact(text, snip("lib__L2_devlog__old.txt"), snip("lib__L2_devlog__new.txt"), "lib L2 devlog")
    text = replace_exact(text, snip("lib__L3_imports__old.txt"), snip("lib__L3_imports__new.txt"), "lib L3 imports")
    text = replace_exact(text, snip("lib__L4_constants__old.txt"), snip("lib__L4_constants__new.txt"), "lib L4 constants")
    text = insert_before(text, "    # FUNCTION | Upload a Local File to R2 With the Correct Content Type",
                         snip("lib__L5_list_top_level__insert.txt"), "lib L5 list helper")
    if not text.endswith("# endregion -------------------------------------------------------------------\n"):
        raise SystemExit("STOP: lib L6: the live lib no longer ends with its last endregion line")
    text = text + snip("lib__L6_editor_keys__append.txt")
    return text


def build_audit(text: str) -> str:
    text = replace_exact(text, snip("audit__A1_description__old.txt"), snip("audit__A1_description__new.txt"), "audit A1 description")
    text = replace_exact(text, snip("audit__A2_devlog__old.txt"), snip("audit__A2_devlog__new.txt"), "audit A2 devlog")
    text = replace_exact(text, snip("audit__A3_apply__old.txt"), snip("audit__A3_apply__new.txt"), "audit A3 apply")
    return text


def unified(rel: str, old_bytes, new_bytes: bytes) -> str:
    """git-style unified diff; content lines keep their CRLF so the patch applies to the CRLF working tree."""
    new_lines = new_bytes.decode("utf-8").splitlines(keepends=True)
    if old_bytes is None:
        header = [f"diff --git a/{rel} b/{rel}\n", "new file mode 100644\n"]
        body   = difflib.unified_diff([], new_lines, fromfile="/dev/null", tofile=f"b/{rel}", n=3)
    else:
        old_lines = old_bytes.decode("utf-8").splitlines(keepends=True)
        header = [f"diff --git a/{rel} b/{rel}\n"]
        body   = difflib.unified_diff(old_lines, new_lines, fromfile=f"a/{rel}", tofile=f"b/{rel}", n=3)
    out = header
    for line in body:
        if line.startswith(("---", "+++", "@@")) and not line.endswith("\n"):
            line += "\n"
        out.append(line)
    return "".join(out)


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    live = {}
    for rel in (SYNC_REL, AUDIT_REL, LIB_REL):
        data = (REPO / rel).read_bytes()
        if hashlib.sha1(data).hexdigest() != manifest[rel]["sha1"]:
            raise SystemExit(f"STOP: {rel} changed since the pre-image was captured")
        if data.count(b"\r\n") != data.count(b"\n"):
            raise SystemExit(f"STOP: {rel} has mixed line endings")
        live[rel] = data

    builders = {SYNC_REL: build_sync, LIB_REL: build_lib, AUDIT_REL: build_audit}
    staged   = {}
    for rel, build in builders.items():
        text = live[rel].decode("utf-8").replace("\r\n", "\n")
        staged[rel] = build(text).replace("\n", "\r\n").encode("utf-8")

    test_text = TEST_SRC.read_text(encoding="utf-8").replace("\r\n", "\n")
    staged[TEST_REL] = test_text.replace("\n", "\r\n").encode("utf-8")

    for rel, data in staged.items():
        dest = STAGE / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)

    parts = []
    for rel in (LIB_REL, SYNC_REL, AUDIT_REL, TEST_REL):
        parts.append(unified(rel, live.get(rel), staged[rel]))
    PATCH.write_bytes("".join(parts).encode("utf-8"))

    summary = {rel: {"sha1": hashlib.sha1(data).hexdigest(), "bytes": len(data),
                     "live_sha1": hashlib.sha1(live[rel]).hexdigest() if rel in live else None}
               for rel, data in staged.items()}
    summary["patch"] = {"path": str(PATCH), "sha1": hashlib.sha1(PATCH.read_bytes()).hexdigest(), "bytes": PATCH.stat().st_size}
    (SCRATCH / "staged_manifest.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
