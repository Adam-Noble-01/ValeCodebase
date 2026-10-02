#!/usr/bin/env python3
# =============================================================================
# W0-07 DRY RUN - the fixed (staged) sync on 2026/3047__Doous, against an in-memory R2
# =============================================================================
#
# What it does (nothing reaches R2, the network or the live Whitecardopedia Projects folder):
# - Loads the STAGED shared lib and sync script (execution/prepared/W0-07/...) and the
#   Na__StubS3Client from the staged test; 'import boto3' is blocked.
# - The editor-owned key list is the live ValeVision3D Na__AppConfig__Main.json (read only).
# - Each scenario works on a throw-away COPY of WebApps/Whitecardopedia/Projects/2026/3047__Doous
#   in the session temp folder (outside every repo); the local production folder
#   C:/01__ValeProjects/ValeProjects__2026/3047__Doous__MaxModel is only READ (latest edition
#   images, GLBs, ProjectData camera block) - exactly what the real sync reads.
# - The stub R2 is seeded from the copied folder (R2 mirrors disk) plus the production GLB
#   names; scenarios B-D add an R2-ahead state (sheets and a scene saved on R2 only, a
#   superseded top-level edition, the new content folders, a removed GLB).
# - The thumbnail generator is replaced by a stub that writes placeholder files into the copy
#   (the real one would regenerate thumbnails in the LIVE Projects folder).
# - The post-action steps of main() (master index, build manifest, master-config mirror) are
#   not run: they never touch project.json or images and are unchanged by W0-07.
# - For comparison, the UNFIXED purge (a pristine copy of the live function, from
#   scratch/W0-07/red_check) is run against scenario A's seeded R2 state.
#
# Output: scratch/W0-07/dry_run__2026-3047__Doous.json and .md
# =============================================================================
import sys
sys.dont_write_bytecode = True
sys.modules['boto3'] = None                                       # <-- NETWORK GUARD

import copy
import importlib.util
import json
import os
import shutil
import tempfile
from contextlib import contextmanager
from pathlib import Path

REPO        = Path(r"D:/10_CoreLib__ValeCodebase")
SCRATCH     = Path(__file__).resolve().parent
STAGED      = SCRATCH.parent.parent / "prepared" / "W0-07" / "WebApps" / "Whitecardopedia" / "Tools__DevUtils"
RED_TOOLS   = SCRATCH / "red_check" / "WebApps" / "Whitecardopedia" / "Tools__DevUtils"
LIVE_WCP    = REPO / "WebApps" / "Whitecardopedia"
LIVE_PROJ   = LIVE_WCP / "Projects" / "2026" / "3047__Doous"
LIVE_FETCH  = LIVE_WCP / "Tools__DevUtils" / "AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py"
VV_CONFIG   = REPO / "WebApps" / "ValeVision3D" / "02__Src__AppModules" / "02__AppData" / "Na__AppConfig__Main.json"
LOCAL_BASE  = Path(r"C:/01__ValeProjects")
LOCAL_ROOT  = LOCAL_BASE / "ValeProjects__2026" / "3047__Doous__MaxModel"
TEMP_ROOT   = Path(os.environ.get("TEMP", tempfile.gettempdir())) / "na_w0_07_dry_run"
BUCKET      = "dry-run-stub-bucket"
WEB_FOLDER  = "3047__Doous"
PREFIX      = f"VaApps/Projects/2026/{WEB_FOLDER}"
PJ_KEY      = f"{PREFIX}/project.json"
SUPERSEDED  = "01-Sep-2026"

sys.path.insert(0, str(STAGED))
import AutomationUtil__R2Common__Lib__ as r2lib                    # noqa: E402  (the STAGED lib)


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


sync     = load("w0_07_dry__sync", STAGED / "AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py")
testmod  = load("w0_07_dry__test", STAGED / "Tests" / "Na__Test__SyncPipeline__EditorKeys__.test.py")
old_sync = load("w0_07_dry__old_sync", RED_TOOLS / "AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py")
Stub     = testmod.Na__StubS3Client
assert Path(r2lib.__file__).resolve().parent == STAGED.resolve(), r2lib.__file__


@contextmanager
def patched(module, **attrs):
    missing = object()
    saved = {k: getattr(module, k, missing) for k in attrs}
    for k, v in attrs.items():
        setattr(module, k, v)
    try:
        yield
    finally:
        for k, v in saved.items():
            if v is missing:
                delattr(module, k)
            else:
                setattr(module, k, v)


def thumb(png, ext=".webp"):
    return png[:-4] + "__Thumbnail__524p__" + ext


def seed_from_folder(stub, folder: Path):
    """R2 mirrors the local Whitecardopedia folder (top level and sub-folders)."""
    for path in folder.rglob("*"):
        if path.is_file():
            rel = path.relative_to(folder).as_posix()
            stub.put_bytes(f"{PREFIX}/{rel}", path.read_bytes())


def seed_glbs(stub):
    glb_dir = LOCAL_ROOT / "10__ContentDelivered__Local" / "ValeVision__GlbFileSync"
    for f in sorted(glb_dir.iterdir()):
        if f.is_file() and f.suffix.lower() == ".glb":
            stub.objects[f"{PREFIX}/{f.name}"] = {"Body": b"", "Size": f.stat().st_size, "ContentType": "model/gltf-binary", "CacheControl": None}


def make_r2_ahead(stub, local_pj: Path):
    """R2 holds editor saves the local copy lacks, a superseded edition and the new content folders."""
    r2_doc = stub.document(PJ_KEY)
    sheets = r2_doc["LayoutEditor__DrawingsData"]["LayoutEditor__DrawingsData__Sheets"]
    extra  = copy.deepcopy(sheets[0])
    for key in list(extra.keys()):
        if key.endswith("__Name"):
            extra[key] = "DRY RUN - sheet saved on R2 only"
        if key.endswith("__Id"):
            extra[key] = "Sheet_DryRunR2Only"
    sheets.append(extra)
    scenes = r2_doc["PresentationMode__SavedCameraScenes"]["PresentationMode__SavedCameraScenes__Scenes"]
    for scene in scenes:
        if scene.get("PresentationMode__Scene__Id") == "su_scene_1":
            scene["PresentationMode__Scene__ThumbnailUrl"] = thumb(f"IMG01__3dView__MainShot____WhitecardImage__{SUPERSEDED}.png")
    scenes.append({"PresentationMode__Scene__Id": "Scene_DryRun", "PresentationMode__Scene__Name": "DRY RUN - scene saved on R2 only",
                   "PresentationMode__Scene__Order": 9, "PresentationMode__Scene__ThumbnailUrl": "PresentationMode/Thumbnails/Scene_DryRun.webp"})
    stub.put_bytes(PJ_KEY, json.dumps(r2_doc, indent=4).encode("utf-8"), "application/json")

    local_doc = json.loads(local_pj.read_bytes().decode("utf-8"))   # the stale disk: no drawings block at all
    local_doc.pop("LayoutEditor__DrawingsData", None)
    local_pj.write_bytes(json.dumps(local_doc, indent=4).replace("\n", "\r\n").encode("utf-8"))

    names = ["IMG01__3dView__MainShot____WhitecardImage__", "IMG02__3dView__Interior__View-01__WhitecardImage__",
             "IMG03__3dView__Interior__View-02__WhitecardImage__", "IMG04__3dView__Interior__View-03__WhitecardImage__",
             "IMG05__3dView__Interior__View-04__WhitecardImage__", "IMG06__3dView__Interior__View-05__WhitecardImage__"]
    for stem in names:
        png = f"{stem}{SUPERSEDED}.png"
        for key in (png, thumb(png), thumb(png, ".jpg")):
            stub.put_bytes(f"{PREFIX}/{key}", b"superseded")
    for rel in ("05__Layout__DrawingDocs__Images/D01/z__0123456789.webp",
                "06__Layout__PublishedDocuments/D01/D01__Published__Manifest__.json",
                "06__Layout__PublishedDocuments/D01/D01__Tier1__.webp",
                "06__Layout__PublishedDocuments/D01/D01__Print__.png",
                "10__StatementDocs/Design Statement/Figure-01.png",
                "SitePlan/Doous__SitePlan__MeshModel__.glb"):
        stub.put_bytes(f"{PREFIX}/{rel}", b"new content folder")
    stub.put_bytes(f"{PREFIX}/Doous__TrueVision__MainBuildingModel__ExistingWalls__MeshModel__.glb", b"removed model")
    return r2_doc


def fake_thumbnails_for(wcp_dir: Path):
    def fake(year, project_folder, report):
        for name in sync.na_collect_source_image_names(wcp_dir):
            for ext in (".webp", ".jpg"):
                (wcp_dir / thumb(name, ext)).write_bytes(b"dry-run placeholder thumbnail")
        report.add_step("Generate Thumbnails", True, "DRY RUN: placeholder thumbnails written into the temp copy.")
    return fake


def summarise_document_change(before: dict, after: dict):
    changed = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
    return {"changedKeys": changed, "added": sorted(k for k in after if k not in before), "removed": sorted(k for k in before if k not in after)}


def run_scenario(name: str, action: str, r2_ahead: bool):
    work = TEMP_ROOT / name
    if work.exists():
        shutil.rmtree(work)
    wcp_base = work / "Projects"
    wcp_dir  = wcp_base / "2026" / WEB_FOLDER
    shutil.copytree(LIVE_PROJ, wcp_dir)
    fetch_copy = work / "fetch_module_copy" / LIVE_FETCH.name
    fetch_copy.parent.mkdir(parents=True)
    shutil.copy2(LIVE_FETCH, fetch_copy)

    stub = Stub()
    seed_from_folder(stub, wcp_dir)
    seed_glbs(stub)
    r2_doc_seeded = make_r2_ahead(stub, wcp_dir / "project.json") if r2_ahead else stub.document(PJ_KEY)
    r2_before   = stub.document(PJ_KEY)
    keys_before = set(stub.objects)
    local_before = json.loads((wcp_dir / "project.json").read_bytes().decode("utf-8"))

    report = sync.SyncReport(WEB_FOLDER, action)
    with patched(sync, WCP_PROJECTS_BASE=wcp_base, LOCAL_PROJECTS_BASE=LOCAL_BASE, FETCH_SCRIPT=fetch_copy,
                 _FETCH_MODULE_CACHE=None, na_generate_thumbnails=fake_thumbnails_for(wcp_dir),
                 na_load_r2_credentials=lambda: {"R2_BUCKET_NAME": BUCKET}, na_build_r2_client=lambda creds: stub), \
         patched(r2lib, VV_APP_CONFIG_PATH=VV_CONFIG):
        fn = {"all": sync.na_sync_all, "glb": sync.na_sync_glb, "images": sync.na_sync_images}[action]
        fn(WEB_FOLDER, "26", LOCAL_ROOT, wcp_dir, report)

    r2_after    = stub.document(PJ_KEY)
    local_after = json.loads((wcp_dir / "project.json").read_bytes().decode("utf-8"))
    deleted     = sorted(keys_before - set(stub.objects))
    sub_deleted = [k for k in deleted if "/" in k[len(PREFIX) + 1:]]
    writes      = [c["Key"] for op, c in stub.calls if op in ("put_object", "upload_file")]
    editor_keys = r2lib.na_load_editor_owned_keys(VV_CONFIG)
    sub_before  = sorted(k for k in keys_before if "/" in k[len(PREFIX) + 1:])

    def scene_thumbs(doc):
        block = doc.get("PresentationMode__SavedCameraScenes") or {}
        return {s.get("PresentationMode__Scene__Id"): s.get("PresentationMode__Scene__ThumbnailUrl")
                for s in block.get("PresentationMode__SavedCameraScenes__Scenes", [])}

    result = {
        "scenario": name, "action": action, "r2Ahead": r2_ahead,
        "steps": report.steps,
        "listCalls": [c for c in stub.calls_of("list_objects_v2")],
        "deleted": deleted,
        "subFolderKeysBefore": len(sub_before),
        "subFolderKeysDeleted": sub_deleted,
        "writesOutsidePrefix": [k for k in writes if not k.startswith(PREFIX + "/")],
        "projectJsonWrites": len([1 for op, c in stub.calls if op == "put_object" and c["Key"] == PJ_KEY]),
        "editorKeysOnR2Before": [k for k in editor_keys if k in r2_before],
        "editorKeysChangedOnR2": [k for k in editor_keys if r2_before.get(k) != r2_after.get(k)],
        "r2ProjectJsonChange": summarise_document_change(r2_before, r2_after),
        "localProjectJsonChange": summarise_document_change(local_before, local_after),
        "localReceivedR2Drawings": local_after.get("LayoutEditor__DrawingsData") == r2_before.get("LayoutEditor__DrawingsData"),
        "r2DrawingsKept": r2_after.get("LayoutEditor__DrawingsData") == r2_before.get("LayoutEditor__DrawingsData"),
        "sceneThumbsBefore": scene_thumbs(r2_before),
        "sceneThumbsAfter": scene_thumbs(r2_after),
    }
    for c in result["listCalls"]:
        c.pop("Bucket", None)
    return result, stub, wcp_dir


def old_purge_on(stub_seed: "Stub", wcp_dir: Path):
    """What the UNFIXED live purge would delete from the same seeded R2 state."""
    stub = Stub()
    stub.objects = copy.deepcopy(stub_seed.objects)
    keep   = old_sync.na_collect_local_image_names(wcp_dir)
    report = old_sync.SyncReport(WEB_FOLDER, "all")
    before = set(stub.objects)
    old_sync.na_purge_stale_r2_images(stub, BUCKET, PREFIX, keep, report)
    return sorted(before - set(stub.objects))


def main():
    sync.na_force_utf8_streams()
    if TEMP_ROOT.exists():
        shutil.rmtree(TEMP_ROOT)
    TEMP_ROOT.mkdir(parents=True)
    live_sha_before = {p.relative_to(LIVE_PROJ).as_posix(): p.stat().st_mtime_ns for p in LIVE_PROJ.rglob("*") if p.is_file()}

    results = []
    # Scenario A, plus the unfixed purge against the very same seeded state
    seed_stub = Stub()
    seed_copy = TEMP_ROOT / "_seed_copy" / WEB_FOLDER
    shutil.copytree(LIVE_PROJ, seed_copy)
    seed_from_folder(seed_stub, seed_copy)
    seed_glbs(seed_stub)
    old_deleted = old_purge_on(seed_stub, seed_copy)

    for name, action, ahead in (("A__all__R2_mirrors_disk", "all", False),
                                ("B__all__R2_ahead_of_disk", "all", True),
                                ("C__glb__R2_ahead_of_disk", "glb", True),
                                ("D__images__R2_ahead_of_disk", "images", True)):
        print(f"\n=== {name}")
        result, _, _ = run_scenario(name, action, ahead)
        results.append(result)

    live_sha_after = {p.relative_to(LIVE_PROJ).as_posix(): p.stat().st_mtime_ns for p in LIVE_PROJ.rglob("*") if p.is_file()}
    out = {
        "project": "2026/3047__Doous",
        "stagedTools": str(STAGED),
        "editorKeyList": str(VV_CONFIG),
        "localProductionFolderReadOnly": str(LOCAL_ROOT),
        "liveProjectFolderUntouched": live_sha_before == live_sha_after,
        "unfixedPurgeWouldDelete": old_deleted,
        "scenarios": results,
    }
    (SCRATCH / "dry_run__2026-3047__Doous.json").write_text(json.dumps(out, indent=2), encoding="utf-8")

    lines = ["# W0-07 dry run - 2026/3047__Doous (in-memory R2 stub; nothing reached R2, the network or the live Projects folder)", ""]
    lines.append(f"- Staged tools: `{STAGED}`")
    lines.append(f"- Editor-owned key list: `{VV_CONFIG}` ({len(r2lib.na_load_editor_owned_keys(VV_CONFIG))} keys)")
    lines.append(f"- Local production folder (read only): `{LOCAL_ROOT}`")
    lines.append(f"- Live `Projects/2026/3047__Doous` untouched (file mtimes before == after): **{out['liveProjectFolderUntouched']}**")
    lines.append(f"- UNFIXED purge on the R2-mirrors-disk state would delete **{len(old_deleted)}** object(s):")
    for k in old_deleted:
        lines.append(f"  - `{k[len(PREFIX) + 1:]}`")
    for r in results:
        lines.append("")
        lines.append(f"## {r['scenario']} (action `{r['action']}`)")
        lines.append(f"- Deleted on R2: {len(r['deleted'])} -> " + (", ".join(f"`{k[len(PREFIX) + 1:]}`" for k in r['deleted']) or "none"))
        lines.append(f"- Sub-folder keys before: {r['subFolderKeysBefore']}; deleted: {len(r['subFolderKeysDeleted'])}")
        lines.append(f"- Listing calls: {len(r['listCalls'])}, all with Delimiter '/': {all(c['Delimiter'] == '/' for c in r['listCalls'])}")
        lines.append(f"- Writes outside the project prefix: {len(r['writesOutsidePrefix'])}")
        lines.append(f"- project.json writes to R2: {r['projectJsonWrites']}")
        lines.append(f"- Editor-owned keys R2 held before: {', '.join(r['editorKeysOnR2Before'])}")
        lines.append(f"- Editor-owned keys whose R2 value changed: {', '.join(r['editorKeysChangedOnR2']) or 'none'}")
        lines.append(f"- R2 LayoutEditor__DrawingsData kept: {r['r2DrawingsKept']}; local file received it: {r['localReceivedR2Drawings']}")
        lines.append(f"- R2 project.json keys changed: {', '.join(r['r2ProjectJsonChange']['changedKeys']) or 'none'}")
        lines.append(f"- Local project.json keys changed: {', '.join(r['localProjectJsonChange']['changedKeys']) or 'none'}")
        changed_thumbs = {k: (v, r['sceneThumbsAfter'].get(k)) for k, v in r['sceneThumbsBefore'].items() if v != r['sceneThumbsAfter'].get(k)}
        lines.append(f"- Scene thumbnails re-pointed on R2: {len(changed_thumbs)}" + "".join(f"\n  - {k}: `{a}` -> `{b}`" for k, (a, b) in changed_thumbs.items()))
        lines.append("- Report steps:")
        for s in r["steps"]:
            lines.append(f"  - {'OK ' if s['success'] else 'ERR'} {s['label']}: {s['message']}")
    (SCRATCH / "dry_run__2026-3047__Doous.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    shutil.rmtree(TEMP_ROOT, ignore_errors=True)


if __name__ == "__main__":
    main()
