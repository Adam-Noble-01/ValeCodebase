#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - PROJECT ACTIONS (SERVER)
=============================================================================
 FILE       : WhitecardVision__FlaskServer__ProjectActions__.py
 NAMESPACE  : Wv
 MODULE     : FlaskServer - ProjectActions
 PURPOSE    : Shared project lifecycle handlers for the local WhitecardVision
              server. Keeps the main request handler focused on routing while
              all project actions live in a dedicated module.
=============================================================================
"""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from re import Pattern
from typing import Any

from WhitecardVision__FlaskServer__ProjectPaths__ import (
    Wv__Server__CurrentYearFolderName,
    Wv__Server__ResolveProjectDir,
)
from WhitecardVision__FlaskServer__ProjectSchema__ import (
    Wv__Server__BuildCleanProjectSlug,
    Wv__Server__BuildDefaultProjectJson,
    Wv__Server__ReplaceProjectFolderSegmentInJson,
)
from WhitecardVision__FlaskServer__ThumbnailBackfill__ import (
    Wv__Server__BackfillProjectJsonThumbPaths,
    Wv__Server__GenerateMissingProjectThumbFiles,
)
from WhitecardVision__FlaskServer__Thumbnails__ import Wv__Thumbnails__IsAvailable


# -----------------------------------------------------------------------------
# REGION | Project Action Helpers
# -----------------------------------------------------------------------------


# HELPER FUNCTION | Read a project JSON file from disk
# ------------------------------------------------------------
def Wv__Server__ProjectActions__ReadProjectJson(json_path: Path) -> dict[str, Any]:
    return json.loads(json_path.read_text(encoding="utf-8") or "{}")
# ------------------------------------------------------------


# HELPER FUNCTION | Write a project JSON file to disk
# ------------------------------------------------------------
def Wv__Server__ProjectActions__WriteProjectJson(json_path: Path, project_json_data: dict[str, Any]) -> None:
    json_path.write_text(
        json.dumps(project_json_data, indent=4, ensure_ascii=False),
        encoding="utf-8",
    )
# ------------------------------------------------------------


# HELPER FUNCTION | Resolve one canonical JSON file path for a project
# ------------------------------------------------------------
def Wv__Server__ProjectActions__ResolveProjectJsonPath(project_dir: Path, project_name: str) -> Path:
    return project_dir / f"{project_name}__WcVisData__.json"
# ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project List Action
# -----------------------------------------------------------------------------


# FUNCTION | List every project across every year folder
# ------------------------------------------------------------
def Wv__Server__ProjectActions__HandleProjectList(
    request_handler: Any,
    project_data_path: Path,
    year_folder_pattern: Pattern[str],
) -> None:
    project_data_path.mkdir(parents=True, exist_ok=True)

    collected_projects: list[dict[str, Any]] = []
    for year_path in sorted(project_data_path.iterdir()):
        if not year_path.is_dir():
            continue
        if not year_folder_pattern.match(year_path.name):
            continue

        for project_dir in sorted(year_path.iterdir()):
            if not project_dir.is_dir():
                continue
            if not project_dir.name.endswith("__WcVisData"):
                continue

            project_name = project_dir.name[:-len("__WcVisData")]
            json_path = Wv__Server__ProjectActions__ResolveProjectJsonPath(project_dir, project_name)
            metadata_block: dict[str, Any] = {}
            if json_path.is_file():
                try:
                    loaded_json = Wv__Server__ProjectActions__ReadProjectJson(json_path)
                    metadata_block = loaded_json.get("Wv__ProjectFile__Metadata", {}) or {}
                except Exception as read_error:
                    print(f"[WARN] Could not parse {json_path.name}: {read_error}")

            display_name_raw = str(metadata_block.get("Wv__ProjectFile__Metadata__ProjectName", "") or "").strip()
            collected_projects.append({
                "projectName"     : display_name_raw or project_name,
                "projectSlug"     : project_name,
                "yearFolder"      : year_path.name,
                "description"     : metadata_block.get("Wv__ProjectFile__Metadata__Description", ""),
                "dateCreatedUtc"  : metadata_block.get("Wv__ProjectFile__Metadata__DateCreatedUtc", ""),
                "dateModifiedUtc" : metadata_block.get("Wv__ProjectFile__Metadata__DateModifiedUtc", ""),
                "projectDirRel"   : f"04__LocalProjectData/{year_path.name}/{project_dir.name}",
            })

    collected_projects.sort(key=lambda item: item.get("dateModifiedUtc", ""), reverse=True)
    request_handler.Wv__Server__WriteJsonResponse(200, {"ok": True, "data": collected_projects})
# ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Create Action
# -----------------------------------------------------------------------------


# FUNCTION | Create a project folder and seed JSON
# ------------------------------------------------------------
def Wv__Server__ProjectActions__HandleProjectCreate(
    request_handler: Any,
    project_data_path: Path,
    year_folder_pattern: Pattern[str],
    project_name_pattern: Pattern[str],
    project_subfolders: tuple[str, ...],
    schema_version: str,
) -> None:
    request_body = request_handler.Wv__Server__ReadJsonBody()
    if request_body is None:
        return

    project_name = str(request_body.get("projectName", "")).strip()
    description = str(request_body.get("description", "")).strip()
    display_name = str(request_body.get("displayName", "")).strip() or project_name
    year_folder_raw = str(request_body.get("yearFolder", "")).strip()

    if not project_name_pattern.match(project_name):
        request_handler.Wv__Server__WriteJsonResponse(400, {
            "ok"    : False,
            "error" : "projectName must be 1-64 chars of [A-Za-z0-9_-] starting with alphanumeric.",
        })
        return

    year_folder_name = year_folder_raw or Wv__Server__CurrentYearFolderName()
    if not year_folder_pattern.match(year_folder_name):
        request_handler.Wv__Server__WriteJsonResponse(400, {
            "ok"    : False,
            "error" : f"Invalid yearFolder '{year_folder_name}'.",
        })
        return

    project_dir = Wv__Server__ResolveProjectDir(
        year_folder_name,
        project_name,
        project_data_path,
        year_folder_pattern,
        project_name_pattern,
    )
    if project_dir.exists():
        request_handler.Wv__Server__WriteJsonResponse(409, {
            "ok"    : False,
            "error" : f"Project '{project_name}' already exists in {year_folder_name}.",
        })
        return

    project_dir.mkdir(parents=True, exist_ok=False)
    for subfolder_name in project_subfolders:
        (project_dir / subfolder_name).mkdir(exist_ok=True)

    project_json_path = Wv__Server__ProjectActions__ResolveProjectJsonPath(project_dir, project_name)
    project_json_data = Wv__Server__BuildDefaultProjectJson(
        project_name=project_name,
        year_folder_name=year_folder_name,
        description=description,
        schema_version=schema_version,
        display_name=display_name,
    )
    Wv__Server__ProjectActions__WriteProjectJson(project_json_path, project_json_data)

    print(f"[PROJECT] Created: {year_folder_name}/{project_name}__WcVisData/")
    request_handler.Wv__Server__WriteJsonResponse(200, {
        "ok"  : True,
        "data": {
            "projectName"    : project_name,
            "yearFolder"     : year_folder_name,
            "projectDirRel"  : f"04__LocalProjectData/{year_folder_name}/{project_name}__WcVisData",
            "projectJsonRel" : f"04__LocalProjectData/{year_folder_name}/{project_name}__WcVisData/{project_name}__WcVisData__.json",
        },
    })
# ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Load Action
# -----------------------------------------------------------------------------


# FUNCTION | Load one project JSON from disk
# ------------------------------------------------------------
def Wv__Server__ProjectActions__HandleProjectLoad(
    request_handler: Any,
    year_folder_name: str,
    project_name: str,
    project_data_path: Path,
    year_folder_pattern: Pattern[str],
    project_name_pattern: Pattern[str],
) -> None:
    project_dir = Wv__Server__ResolveProjectDir(
        year_folder_name,
        project_name,
        project_data_path,
        year_folder_pattern,
        project_name_pattern,
    )
    json_path = Wv__Server__ProjectActions__ResolveProjectJsonPath(project_dir, project_name)
    if not json_path.is_file():
        request_handler.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
        return

    try:
        project_json_data = Wv__Server__ProjectActions__ReadProjectJson(json_path)
        request_handler.Wv__Server__WriteJsonResponse(200, {"ok": True, "data": project_json_data})
    except Exception as load_error:
        request_handler.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": str(load_error)})
# ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Save Action
# -----------------------------------------------------------------------------


# FUNCTION | Save a project JSON and reconcile slug changes
# ------------------------------------------------------------
def Wv__Server__ProjectActions__HandleProjectSave(
    request_handler: Any,
    year_folder_name: str,
    current_slug: str,
    project_data_path: Path,
    year_folder_pattern: Pattern[str],
    project_name_pattern: Pattern[str],
    schema_version: str,
) -> None:
    project_dir = Wv__Server__ResolveProjectDir(
        year_folder_name,
        current_slug,
        project_data_path,
        year_folder_pattern,
        project_name_pattern,
    )
    if not project_dir.is_dir():
        request_handler.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
        return

    request_body = request_handler.Wv__Server__ReadJsonBody()
    if request_body is None:
        return

    now_iso = datetime.now(timezone.utc).isoformat()
    metadata_block = request_body.get("Wv__ProjectFile__Metadata", {}) or {}
    metadata_block.setdefault("Wv__ProjectFile__Metadata__ProjectName", current_slug)
    metadata_block.setdefault("Wv__ProjectFile__Metadata__ProjectCode", current_slug)
    metadata_block.setdefault("Wv__ProjectFile__Metadata__PreviousNames", [])
    metadata_block.setdefault("Wv__ProjectFile__Metadata__YearFolder", year_folder_name)
    metadata_block.setdefault("Wv__ProjectFile__Metadata__SchemaVersion", schema_version)
    if not isinstance(metadata_block["Wv__ProjectFile__Metadata__PreviousNames"], list):
        metadata_block["Wv__ProjectFile__Metadata__PreviousNames"] = []

    display_name = str(metadata_block.get("Wv__ProjectFile__Metadata__ProjectName") or current_slug).strip()
    desired_slug = Wv__Server__BuildCleanProjectSlug(display_name) or current_slug

    if desired_slug != current_slug:
        year_path = (project_data_path / year_folder_name).resolve()
        new_dir = (year_path / f"{desired_slug}__WcVisData").resolve()
        if new_dir.exists():
            request_handler.Wv__Server__WriteJsonResponse(409, {
                "ok"    : False,
                "error" : f"A project with folder id '{desired_slug}' already exists in {year_folder_name}.",
            })
            return
        try:
            shutil.move(str(project_dir), str(new_dir))
        except Exception as move_error:
            request_handler.Wv__Server__WriteJsonResponse(500, {
                "ok"    : False,
                "error" : f"Folder move failed: {move_error}",
            })
            return

        old_json = Wv__Server__ProjectActions__ResolveProjectJsonPath(new_dir, current_slug)
        new_json = Wv__Server__ProjectActions__ResolveProjectJsonPath(new_dir, desired_slug)
        if old_json.is_file():
            try:
                old_json.rename(new_json)
            except Exception as rename_error:
                request_handler.Wv__Server__WriteJsonResponse(500, {
                    "ok"    : False,
                    "error" : f"Folder moved to {new_dir.name} but JSON rename failed: {rename_error}",
                })
                return
        if not new_json.is_file():
            request_handler.Wv__Server__WriteJsonResponse(500, {
                "ok"    : False,
                "error" : f"JSON file missing at {new_json.name} after move.",
            })
            return

        old_seg = f"{current_slug}__WcVisData"
        new_seg = f"{desired_slug}__WcVisData"
        request_body = Wv__Server__ReplaceProjectFolderSegmentInJson(request_body, old_seg, new_seg)
        metadata_block = request_body.get("Wv__ProjectFile__Metadata", {}) or {}

        previous_entry = {
            "previousProjectCode" : current_slug,
            "previousProjectName" : str(metadata_block.get("Wv__ProjectFile__Metadata__ProjectName") or current_slug),
            "renamedAtUtc"        : now_iso,
            "newProjectCode"      : desired_slug,
            "newProjectName"      : display_name,
        }
        if not isinstance(metadata_block.get("Wv__ProjectFile__Metadata__PreviousNames"), list):
            metadata_block["Wv__ProjectFile__Metadata__PreviousNames"] = []
        metadata_block["Wv__ProjectFile__Metadata__PreviousNames"].append(previous_entry)
        metadata_block["Wv__ProjectFile__Metadata__ProjectCode"] = desired_slug
        metadata_block["Wv__ProjectFile__Metadata__ProjectName"] = display_name
        request_body["Wv__ProjectFile__Metadata"] = metadata_block

        active_json_path = new_json
        print(f"[PROJECT] Renamed: {year_folder_name}/{current_slug}__WcVisData -> {desired_slug}__WcVisData")
        renamed = True
    else:
        active_json_path = Wv__Server__ProjectActions__ResolveProjectJsonPath(project_dir, current_slug)
        renamed = False

    metadata_block = request_body.get("Wv__ProjectFile__Metadata", {}) or {}
    metadata_block["Wv__ProjectFile__Metadata__DateModifiedUtc"] = now_iso
    request_body["Wv__ProjectFile__Metadata"] = metadata_block

    try:
        Wv__Server__ProjectActions__WriteProjectJson(active_json_path, request_body)
        if not renamed:
            print(f"[PROJECT] Saved: {year_folder_name}/{current_slug}__WcVisData/{current_slug}__WcVisData__.json")
        request_handler.Wv__Server__WriteJsonResponse(200, {
            "ok"  : True,
            "data": {
                "yearFolder"  : year_folder_name,
                "projectName" : desired_slug,
                "renamed"     : renamed,
            },
        })
    except Exception as write_error:
        request_handler.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": str(write_error)})
# ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Duplicate Action
# -----------------------------------------------------------------------------


# FUNCTION | Duplicate a full project folder tree into a new project id
# ------------------------------------------------------------
def Wv__Server__ProjectActions__HandleProjectDuplicate(
    request_handler: Any,
    year_folder_name: str,
    source_project_name: str,
    project_data_path: Path,
    year_folder_pattern: Pattern[str],
    project_name_pattern: Pattern[str],
    schema_version: str,
    app_root_path: Path,
) -> None:
    source_project_dir = Wv__Server__ResolveProjectDir(
        year_folder_name,
        source_project_name,
        project_data_path,
        year_folder_pattern,
        project_name_pattern,
    )
    if not source_project_dir.is_dir():
        request_handler.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Source project not found"})
        return

    source_json_path = Wv__Server__ProjectActions__ResolveProjectJsonPath(source_project_dir, source_project_name)
    if not source_json_path.is_file():
        request_handler.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Source project JSON not found"})
        return

    request_body = request_handler.Wv__Server__ReadJsonBody()
    if request_body is None:
        return

    requested_display_name = str(request_body.get("displayName", "")).strip()
    requested_project_name = str(request_body.get("projectName", "")).strip()
    duplicate_display_name = requested_display_name or f"{source_project_name}__COPY__"
    duplicate_project_name = requested_project_name or Wv__Server__BuildCleanProjectSlug(duplicate_display_name)

    if not project_name_pattern.match(duplicate_project_name):
        request_handler.Wv__Server__WriteJsonResponse(400, {
            "ok"    : False,
            "error" : "projectName must be 1-64 chars of [A-Za-z0-9_-] starting with alphanumeric.",
        })
        return

    destination_project_dir = Wv__Server__ResolveProjectDir(
        year_folder_name,
        duplicate_project_name,
        project_data_path,
        year_folder_pattern,
        project_name_pattern,
    )
    if destination_project_dir.exists():
        request_handler.Wv__Server__WriteJsonResponse(409, {
            "ok"    : False,
            "error" : f"Project '{duplicate_project_name}' already exists in {year_folder_name}.",
        })
        return

    try:
        destination_project_dir.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source_project_dir, destination_project_dir)

        duplicate_json_old_path = Wv__Server__ProjectActions__ResolveProjectJsonPath(
            destination_project_dir,
            source_project_name,
        )
        duplicate_json_new_path = Wv__Server__ProjectActions__ResolveProjectJsonPath(
            destination_project_dir,
            duplicate_project_name,
        )
        if not duplicate_json_old_path.is_file():
            raise FileNotFoundError(f"Copied JSON not found at {duplicate_json_old_path.name}")
        duplicate_json_old_path.rename(duplicate_json_new_path)

        duplicate_project_json = Wv__Server__ProjectActions__ReadProjectJson(duplicate_json_new_path)
        duplicate_project_json = Wv__Server__ReplaceProjectFolderSegmentInJson(
            duplicate_project_json,
            f"{source_project_name}__WcVisData",
            f"{duplicate_project_name}__WcVisData",
        )

        now_iso = datetime.now(timezone.utc).isoformat()
        metadata_block = duplicate_project_json.get("Wv__ProjectFile__Metadata", {}) or {}
        metadata_block["Wv__ProjectFile__Metadata__ProjectName"] = duplicate_display_name
        metadata_block["Wv__ProjectFile__Metadata__ProjectCode"] = duplicate_project_name
        metadata_block["Wv__ProjectFile__Metadata__PreviousNames"] = []
        metadata_block["Wv__ProjectFile__Metadata__YearFolder"] = year_folder_name
        metadata_block["Wv__ProjectFile__Metadata__SchemaVersion"] = schema_version
        metadata_block["Wv__ProjectFile__Metadata__DateCreatedUtc"] = now_iso
        metadata_block["Wv__ProjectFile__Metadata__DateModifiedUtc"] = now_iso
        duplicate_project_json["Wv__ProjectFile__Metadata"] = metadata_block

        Wv__Server__ProjectActions__WriteProjectJson(duplicate_json_new_path, duplicate_project_json)
    except Exception as duplicate_error:
        try:
            if destination_project_dir.exists():
                shutil.rmtree(destination_project_dir)
        except Exception as cleanup_error:
            print(f"[WARN] Duplicate cleanup failed for {destination_project_dir.name}: {cleanup_error}")
        request_handler.Wv__Server__WriteJsonResponse(500, {
            "ok"    : False,
            "error" : f"Project duplicate failed: {duplicate_error}",
        })
        return

    thumbs_generated = 0
    json_fields_updated = 0
    try:
        thumbs_generated = Wv__Server__GenerateMissingProjectThumbFiles(destination_project_dir)
        json_fields_updated = Wv__Server__BackfillProjectJsonThumbPaths(
            destination_project_dir,
            duplicate_project_name,
            app_root_path,
        )
    except Exception as backfill_error:
        print(f"[WARN] Duplicate thumb backfill failed for {duplicate_project_name}: {backfill_error}")

    print(
        f"[PROJECT] Duplicated: {year_folder_name}/{source_project_name}__WcVisData "
        f"-> {duplicate_project_name}__WcVisData"
    )
    request_handler.Wv__Server__WriteJsonResponse(200, {
        "ok"  : True,
        "data": {
            "projectName"        : duplicate_project_name,
            "projectSlug"        : duplicate_project_name,
            "projectDisplayName" : duplicate_display_name,
            "yearFolder"         : year_folder_name,
            "projectDirRel"      : f"04__LocalProjectData/{year_folder_name}/{duplicate_project_name}__WcVisData",
            "projectJsonRel"     : f"04__LocalProjectData/{year_folder_name}/{duplicate_project_name}__WcVisData/{duplicate_project_name}__WcVisData__.json",
            "thumbsGenerated"    : thumbs_generated,
            "jsonFieldsUpdated"  : json_fields_updated,
        },
    })
# ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Delete Action
# -----------------------------------------------------------------------------


# FUNCTION | Delete a full project directory tree
# ------------------------------------------------------------
def Wv__Server__ProjectActions__HandleProjectDelete(
    request_handler: Any,
    year_folder_name: str,
    project_name: str,
    project_data_path: Path,
    year_folder_pattern: Pattern[str],
    project_name_pattern: Pattern[str],
) -> None:
    project_dir = Wv__Server__ResolveProjectDir(
        year_folder_name,
        project_name,
        project_data_path,
        year_folder_pattern,
        project_name_pattern,
    )
    if not project_dir.is_dir():
        request_handler.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
        return

    try:
        shutil.rmtree(project_dir)
        print(f"[PROJECT] Deleted: {year_folder_name}/{project_name}__WcVisData/")
        request_handler.Wv__Server__WriteJsonResponse(200, {"ok": True})
    except Exception as delete_error:
        request_handler.Wv__Server__WriteJsonResponse(500, {"ok": False, "error": str(delete_error)})
# ------------------------------------------------------------


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Project Thumbnail Backfill Action
# -----------------------------------------------------------------------------


# FUNCTION | Generate missing thumbs and update JSON thumb fields
# ------------------------------------------------------------
def Wv__Server__ProjectActions__HandleThumbBackfill(
    request_handler: Any,
    year_folder_name: str,
    project_name: str,
    project_data_path: Path,
    year_folder_pattern: Pattern[str],
    project_name_pattern: Pattern[str],
    app_root_path: Path,
) -> None:
    project_dir = Wv__Server__ResolveProjectDir(
        year_folder_name,
        project_name,
        project_data_path,
        year_folder_pattern,
        project_name_pattern,
    )
    if not project_dir.is_dir():
        request_handler.Wv__Server__WriteJsonResponse(404, {"ok": False, "error": "Project not found"})
        return

    generated_count = Wv__Server__GenerateMissingProjectThumbFiles(project_dir)
    updated_fields_count = Wv__Server__BackfillProjectJsonThumbPaths(
        project_dir,
        project_name,
        app_root_path,
    )

    request_handler.Wv__Server__WriteJsonResponse(200, {
        "ok"  : True,
        "data": {
            "thumbsGenerated"   : generated_count,
            "jsonFieldsUpdated" : updated_fields_count,
            "pilAvailable"      : Wv__Thumbnails__IsAvailable(),
        },
    })
# ------------------------------------------------------------


# endregion ----------------------------------------------------
