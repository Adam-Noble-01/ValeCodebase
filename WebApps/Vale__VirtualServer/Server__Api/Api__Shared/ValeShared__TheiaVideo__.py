"""
=============================================================================
 VALE SHARED API - VALEVISION THEIA VIDEO LIBRARY (THE DATA MODEL)
=============================================================================

FILE       : ValeShared__TheiaVideo__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : One project's Theia videos as every app sees them: the data file,
             the files really on disk, files dropped into the folder by hand,
             the 2K floor, and ValeVision 3D's titles kept in step
CREATED    : 07-Oct-2026

DESCRIPTION:
- LAYOUT, inside a library project (Vale__Projects__MasterLibrary/ValeProjects__<yyyy>/<id>/):
    ValeVision__TheiaVideo/
      AppData__VideoData/<id>__VideoAppData__.json      the video list (project-data lane: both ways)
      Content__VideoFiles/Videos__<Scheme>/<file>.mp4    the video files (heavy content; nginx serves them)
      Content__VideoThumbnails/<file>.webp               posters (1920 wide) and thumbnails (524 wide)
      UserData__ShareLinks/<id>__TheiaShareLinks__.json  client links (user data: through the API only)
      UserData__UploadStaging/<upload id>.*.tmp          uploads in progress (*.tmp never syncs)
- ONE FILE PER VIDEO, at the size it was made. No second sizes and no quality
  switching (Adam, 07-Oct-2026): viewers are expected to have a good
  connection, and Theia's cache and buffering do the rest.
- ONE VIEW, BUILT ON READ. Na__Theia__Library() joins the data file with the
  folder: a file that is missing is reported, never offered; an MP4 dropped
  into Content__VideoFiles by hand appears as a video of its own. Files that
  differ only by a __2160p__ / __1440p__ token are one video: the largest
  plays and managers see the others listed as unused. Nothing is written by a
  read.
- THE 2K FLOOR. A file shorter than the config's minimum height (1440) is never
  offered to a viewer. Such a video is shown only to managers, flagged, so it
  can be made again at 2K or above.
- VALEVISION 3D IN STEP. A video published from ValeVision 3D's Video Studio
  names its path (SourceVideoId). Its title and description live in both
  places - this file and the path in the project record's VideoStudio__Config -
  and each carries MetaUpdatedIso: the newer side wins on read, and every
  writer writes both (Na__Theia__UpdateVv3dVideo).
- URLs carry ?v=<size>-<modified> of the file on disk, so a replaced file is
  a new address and no browser or service-worker cache can mix old and new.
- Used by the Theia API (Server__Api/Api__ValeVision__TheiaVideoPlayer) and by
  the Gallery API (the video icon on a card and the Videos panel).

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
07-Oct-2026 - Version 1.0.0
- Initial build for ValeVision Theia. The same day: one file per video
  (TheiaVideo__Video__File; the first build's Renditions list is still read),
  stamps more than a day ahead never win, and an empty placeholder data file is
  cleared before the first write (the shared writer threw on it).

=============================================================================
"""

from __future__ import annotations

import json
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from ValeShared__Library__ import (NA__LIBRARY__ROOT, Na__Library__Locked, Na__Library__ReadJson, Na__Library__Url,
                                   Na__Library__WriteJson)
from ValeShared__Mp4Probe__ import Na__Mp4__ProbeCached


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__THEIA__APP_DIR                = Path(__file__).resolve().parents[2] / "Vale__ValeVision__TheiaVideoPlayer"   # <-- Code, so beside this file (a sandbox VALE_ROOT holds data only)
NA__THEIA__CONFIG_PATH            = NA__THEIA__APP_DIR / "02__Src__AppModules" / "02__AppData" / "Na__AppConfig__TheiaVideoPlayer__.json"
NA__THEIA__BUCKET                 = "ValeVision__TheiaVideo"
NA__THEIA__DATA_DIR               = "AppData__VideoData"
NA__THEIA__VIDEOS_DIR             = "Content__VideoFiles"
NA__THEIA__THUMBS_DIR             = "Content__VideoThumbnails"
NA__THEIA__SHARES_DIR             = "UserData__ShareLinks"
NA__THEIA__STAGING_DIR            = "UserData__UploadStaging"
NA__THEIA__SCHEME_PREFIX          = "Videos__"
NA__THEIA__DEFAULT_SCHEME         = "Scheme-01"
NA__THEIA__SCHEMA_VERSION         = 1
NA__THEIA__ID                     = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$")
NA__THEIA__SCHEME                 = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,40}$")
NA__THEIA__HEIGHT_TOKEN           = re.compile(r"__(\d{3,4})p__", re.I)
NA__THEIA__VIDEO_EXT              = (".mp4", ".m4v", ".mov")
NA__THEIA__VS_SECTION             = "VideoStudio__Config"                      # <-- ValeVision 3D's block in the project record
NA__THEIA__VS_VIDEOS              = "VideoStudio__Config__Videos"
NA__THEIA__SOURCE_VV3D            = "ValeVision3D"
NA__THEIA__SOURCE_FOLDER          = "Folder"

# APP CONFIG DEFAULTS | Used for any key the config file leaves out
NA__THEIA__DEFAULT_CONFIG         = {
    "TheiaConfig__Quality__MinimumHeightPx"      : 1440,
    "TheiaConfig__Publish__PosterWidthPx"        : 1920,
    "TheiaConfig__Publish__ThumbnailWidthPx"     : 524,
    "TheiaConfig__Upload__ChunkBytes"            : 16 * 1024 * 1024,
    "TheiaConfig__Upload__MaxFileBytes"          : 24 * 1024 * 1024 * 1024,
    "TheiaConfig__Upload__DiskReserveBytes"      : 4 * 1024 * 1024 * 1024,
    "TheiaConfig__Upload__StaleHours"            : 48,
    "TheiaConfig__Share__TokenBytes"             : 18,
}
NA__THEIA__CONFIG_CACHE           = {"mtime": None, "doc": None}
NA__THEIA__CONFIG_LOCK            = threading.Lock()

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Small Helpers
# -----------------------------------------------------------------------------

# HELPER FUNCTION | The Time as Every Vale App Writes It: UTC, Milliseconds, Z
# ------------------------------------------------------------
def Na__Theia__NowIso() -> str:
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"
# ---------------------------------------------------------------

# HELPER FUNCTION | A Stamp Worth Comparing (blank: not a UTC ISO time, or more than a day ahead)
# ------------------------------------------------------------
# The newer edit wins between Theia and ValeVision 3D, so a stamp from a PC
# whose clock is far ahead (or a test value) would otherwise beat every later
# edit for good. Such a stamp counts as blank: the next real edit replaces it.
# ------------------------------------------------------------
NA__THEIA__STAMP          = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$")
NA__THEIA__STAMP_AHEAD_S  = 86400                                               # <-- A day of clock error is tolerated

def Na__Theia__Stamp(value) -> str:
    text = str(value or "")
    if not NA__THEIA__STAMP.match(text):
        return ""
    limit = (datetime.now(timezone.utc) + timedelta(seconds=NA__THEIA__STAMP_AHEAD_S)).strftime("%Y-%m-%dT%H:%M:%S")
    return "" if text[:19] > limit else text
# ---------------------------------------------------------------

# HELPER FUNCTION | Newer of Two ISO Stamps (blank, or not believable, counts as oldest)
# ------------------------------------------------------------
def Na__Theia__IsNewer(a: str, b: str) -> bool:
    return Na__Theia__Stamp(a) > Na__Theia__Stamp(b)                            # <-- Fixed-width UTC ISO strings sort as times
# ---------------------------------------------------------------

# HELPER FUNCTION | A Title From a File Name ("64135__Holt__Garden-Walk__2160p__.mp4" -> "Garden Walk")
# ------------------------------------------------------------
def Na__Theia__TitleFromStem(stem: str, project_id: str = "") -> str:
    text = NA__THEIA__HEIGHT_TOKEN.sub("__", stem)
    if project_id and text.startswith(project_id + "__"):
        text = text[len(project_id) + 2:]
    text = re.sub(r"^TheiaVideo__", "", text)
    text = re.sub(r"[_\-]+", " ", text).strip()
    return text or stem
# ---------------------------------------------------------------

# HELPER FUNCTION | A Safe Id From Any Text
# ------------------------------------------------------------
def Na__Theia__SafeId(text: str, prefix: str = "") -> str:
    core = re.sub(r"[^A-Za-z0-9_-]+", "-", str(text or "")).strip("-_")[:60] or "Video"
    return (prefix + core)[:80]
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | App Config (shared with the browser: the one place the policy lives)
# -----------------------------------------------------------------------------

# FUNCTION | The App Config, Defaults Filled In (re-read when the file changes)
# ------------------------------------------------------------
def Na__Theia__Config() -> dict:
    with NA__THEIA__CONFIG_LOCK:
        try:
            mtime = NA__THEIA__CONFIG_PATH.stat().st_mtime_ns
        except OSError:
            mtime = None
        if NA__THEIA__CONFIG_CACHE["doc"] is None or NA__THEIA__CONFIG_CACHE["mtime"] != mtime:
            doc = {}
            if mtime is not None:
                try:
                    doc = json.loads(NA__THEIA__CONFIG_PATH.read_text(encoding="utf-8"))
                except (OSError, ValueError):
                    doc = {}                                                   # <-- A broken config never stops the API: defaults
            merged = dict(NA__THEIA__DEFAULT_CONFIG)
            merged.update({k: v for k, v in doc.items() if not k.startswith("_")})
            NA__THEIA__CONFIG_CACHE.update(mtime=mtime, doc=merged)
        return NA__THEIA__CONFIG_CACHE["doc"]
# ---------------------------------------------------------------

# HELPER FUNCTION | The 2K Floor, and the Name of a Height ("4K", "2K", "1080p")
# ------------------------------------------------------------
NA__THEIA__QUALITY_NAMES          = ((4320, "8K"), (2160, "4K"), (1440, "2K"))

def Na__Theia__MinimumHeight(cfg: dict | None = None) -> int:
    return int((cfg or Na__Theia__Config()).get("TheiaConfig__Quality__MinimumHeightPx") or 1440)

def Na__Theia__QualityLabel(height: int) -> str:
    for floor, name in NA__THEIA__QUALITY_NAMES:
        if int(height or 0) >= floor:
            return name
    return f"{int(height or 0)}p"
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Paths
# -----------------------------------------------------------------------------

# FUNCTION | Where a Project's Theia Files Live
# ------------------------------------------------------------
def Na__Theia__Bucket(folder: Path) -> Path:
    return Path(folder) / NA__THEIA__BUCKET

def Na__Theia__DataPath(folder: Path) -> Path:
    return Na__Theia__Bucket(folder) / NA__THEIA__DATA_DIR / f"{Path(folder).name}__VideoAppData__.json"

def Na__Theia__VideosDir(folder: Path) -> Path:
    return Na__Theia__Bucket(folder) / NA__THEIA__VIDEOS_DIR

def Na__Theia__ThumbsDir(folder: Path) -> Path:
    return Na__Theia__Bucket(folder) / NA__THEIA__THUMBS_DIR

def Na__Theia__SharesPath(folder: Path) -> Path:
    return Na__Theia__Bucket(folder) / NA__THEIA__SHARES_DIR / f"{Path(folder).name}__TheiaShareLinks__.json"

def Na__Theia__StagingDir(folder: Path) -> Path:
    return Na__Theia__Bucket(folder) / NA__THEIA__STAGING_DIR

def Na__Theia__RecordPath(folder: Path) -> Path:
    return Path(folder) / f"ProjectData__{Path(folder).name}__.json"
# ---------------------------------------------------------------

# HELPER FUNCTION | A Path Inside a Base, From a Stored Relative Path (None if it would escape)
# ------------------------------------------------------------
def Na__Theia__Inside(base: Path, rel: str) -> Path | None:
    rel = str(rel or "").replace("\\", "/").strip("/")
    if not rel or any(p in ("", ".", "..") for p in rel.split("/")) or ":" in rel:
        return None
    target = (base / rel).resolve()
    return target if target.is_relative_to(base.resolve()) else None
# ---------------------------------------------------------------

# HELPER FUNCTION | A File's Public URL With a Version Stamp From the File Itself
# ------------------------------------------------------------
def Na__Theia__FileUrl(path: Path) -> str:
    try:
        st = path.stat()
        stamp = f"{st.st_size:x}-{st.st_mtime_ns // 1_000_000:x}"
    except OSError:
        stamp = "0"
    return f"{Na__Library__Url(path)}?v={stamp}"
# ---------------------------------------------------------------

# FUNCTION | The Final File Names of a Published Video (stable: a republish replaces in place)
# ------------------------------------------------------------
def Na__Theia__FileRel(folder: Path, scheme: str, video_id: str, height: int) -> str:
    return f"{NA__THEIA__SCHEME_PREFIX}{scheme}/{Path(folder).name}__TheiaVideo__{video_id}__{int(height)}p__.mp4"

def Na__Theia__PublishedFiles(folder: Path, video_id: str) -> list:
    """Every file a publish of this video has written, in any scheme and at any size (relative paths)."""
    base = Na__Theia__VideosDir(folder)
    pattern = re.compile(rf"^{re.escape(Path(folder).name)}__TheiaVideo__{re.escape(video_id)}__\d{{3,4}}p__\.mp4$", re.I)
    if not base.is_dir():
        return []
    return sorted(f.relative_to(base).as_posix() for d in base.iterdir() if d.is_dir() and d.name.startswith(NA__THEIA__SCHEME_PREFIX)
                  for f in d.iterdir() if f.is_file() and pattern.match(f.name))

def Na__Theia__PosterName(folder: Path, video_id: str) -> str:
    return f"{Path(folder).name}__TheiaVideo__{video_id}__Poster__.webp"

def Na__Theia__ThumbName(folder: Path, video_id: str, width: int = 524) -> str:
    return f"{Path(folder).name}__TheiaVideo__{video_id}__Thumbnail__{int(width)}p__.webp"
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Data File
# -----------------------------------------------------------------------------

# FUNCTION | A New, Empty Data File for a Project
# ------------------------------------------------------------
def Na__Theia__EmptyData(folder: Path, record: dict | None = None) -> dict:
    record = record or {}
    return {
        "TheiaVideo__Library__Description"   : "ValeVision Theia: the videos published for this project, in playing order. "
                                               "Written by the Theia API (and by ValeVision 3D's Publish to Theia, through it). "
                                               "One file per video, in Content__VideoFiles/Videos__<Scheme>/; posters in "
                                               "Content__VideoThumbnails/. Titles and descriptions of ValeVision 3D paths are "
                                               "kept in step with the project record by MetaUpdatedIso: the newer side wins.",
        "TheiaVideo__Library__SchemaVersion" : NA__THEIA__SCHEMA_VERSION,
        "TheiaVideo__Library__ProjectId"     : Path(folder).name,
        "TheiaVideo__Library__ProjectCode"   : str(record.get("projectCode") or ""),
        "TheiaVideo__Library__ProjectName"   : str(record.get("projectName") or ""),
        "TheiaVideo__Library__ProjectTitle"  : "",
        "TheiaVideo__Library__UpdatedIso"    : "",
        "TheiaVideo__Library__UpdatedBy"     : "",
        "TheiaVideo__Library__Videos"        : [],
    }
# ---------------------------------------------------------------

# FUNCTION | Read a Project's Data File: (data, problem). Never raises; a missing,
#            empty or broken file reads as an empty list, with the problem named.
# ------------------------------------------------------------
def Na__Theia__ReadData(folder: Path, record: dict | None = None) -> tuple:
    path = Na__Theia__DataPath(folder)
    problem = None
    data = None
    if path.is_file():
        try:
            text = path.read_text(encoding="utf-8-sig")
            data = json.loads(text) if text.strip() else None                  # <-- Adam's placeholder files are 0 bytes
        except (OSError, ValueError) as error:
            problem = f"{path.name} could not be read ({type(error).__name__}); it will be rewritten on the next save"
    if not isinstance(data, dict):
        data = Na__Theia__EmptyData(folder, record)
    if not isinstance(data.get("TheiaVideo__Library__Videos"), list):
        data["TheiaVideo__Library__Videos"] = []
    data["TheiaVideo__Library__Videos"] = [v for v in data["TheiaVideo__Library__Videos"]
                                          if isinstance(v, dict) and NA__THEIA__ID.match(str(v.get("TheiaVideo__Video__Id") or ""))]
    return data, problem
# ---------------------------------------------------------------

# FUNCTION | Write a Project's Data File (atomic, _rev checked, revision kept)
# ------------------------------------------------------------
# Adam's folder templates hold 0-byte placeholders under the real names. The
# shared writer reads the file it replaces (for _rev and the revision copy),
# and an empty file is not JSON: it threw, so the first publish into a project
# moved its files but never wrote this list (07-Oct-2026, 64135__Holt). An
# empty placeholder has nothing to keep, so it goes first.
# ------------------------------------------------------------
def Na__Theia__WriteData(folder: Path, data: dict, user_code: str = "", expected_rev: int | None = None) -> dict:
    path = Na__Theia__DataPath(folder)
    with Na__Library__Locked(path):                                            # <-- Re-entrant: callers already hold it
        try:
            if path.is_file() and not path.read_bytes().strip():
                path.unlink()                                                  # <-- The empty placeholder, never a real list
        except OSError:
            pass
        return Na__Theia__WriteDataNow(folder, data, user_code, expected_rev)
# ---------------------------------------------------------------

def Na__Theia__WriteDataNow(folder: Path, data: dict, user_code: str = "", expected_rev: int | None = None) -> dict:
    data = dict(data)
    data["TheiaVideo__Library__UpdatedIso"] = Na__Theia__NowIso()
    data["TheiaVideo__Library__UpdatedBy"] = user_code or ""
    data["TheiaVideo__Library__Videos"] = sorted(data.get("TheiaVideo__Library__Videos") or [],
                                                 key=lambda v: (Na__Theia__Order(v), str(v.get("TheiaVideo__Video__Id"))))
    return Na__Library__WriteJson(Na__Theia__DataPath(folder), data, user_code, Path(folder), expected_rev=expected_rev)
# ---------------------------------------------------------------

# HELPER FUNCTION | A Video's Order Number (missing sorts last)
# ------------------------------------------------------------
def Na__Theia__Order(entry: dict) -> float:
    try:
        return float(entry.get("TheiaVideo__Video__Order"))
    except (TypeError, ValueError):
        return 1e9
# ---------------------------------------------------------------

# FUNCTION | Find a Video in the Data File: (index, entry) or (-1, None)
# ------------------------------------------------------------
def Na__Theia__FindEntry(data: dict, video_id: str) -> tuple:
    for i, v in enumerate(data.get("TheiaVideo__Library__Videos") or []):
        if v.get("TheiaVideo__Video__Id") == video_id:
            return i, v
    return -1, None
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | ValeVision 3D's Video Studio Paths (the other half of the two-way link)
# -----------------------------------------------------------------------------

# FUNCTION | The Video Studio Paths in a Project Record: {VideoStudio__Video__Id: path}
# ------------------------------------------------------------
def Na__Theia__Vv3dVideos(record: dict | None) -> dict:
    block = (record or {}).get(NA__THEIA__VS_SECTION) or {}
    videos = block.get(NA__THEIA__VS_VIDEOS) if isinstance(block, dict) else None
    return {str(v.get("VideoStudio__Video__Id")): v for v in (videos or [])
            if isinstance(v, dict) and v.get("VideoStudio__Video__Id")}
# ---------------------------------------------------------------

# HELPER FUNCTION | A Path's Title as Theia Shows It (its Title, else its Name)
# ------------------------------------------------------------
def Na__Theia__Vv3dTitle(vs_video: dict) -> str:
    return str(vs_video.get("VideoStudio__Video__Title") or vs_video.get("VideoStudio__Video__Name") or "").strip()
# ---------------------------------------------------------------

# FUNCTION | Write Changes Into One Video Studio Path of the Project Record (locked; other keys untouched)
# ------------------------------------------------------------
def Na__Theia__UpdateVv3dVideo(folder: Path, source_video_id: str, changes: dict, user_code: str = "") -> bool:
    """changes: VideoStudio__Video__* keys to set (a value of None removes the key). False when the
    record or the path is not there - a Theia video whose path was deleted in ValeVision 3D."""
    path = Na__Theia__RecordPath(folder)
    with Na__Library__Locked(path):                                            # <-- The read is inside the same lock as the write
        record = Na__Library__ReadJson(path)
        if not isinstance(record, dict):
            return False
        target = Na__Theia__Vv3dVideos(record).get(str(source_video_id))
        if target is None:
            return False
        for key, value in changes.items():
            if value is None:
                target.pop(key, None)
            else:
                target[key] = value
        Na__Library__WriteJson(path, record, user_code, Path(folder))
        return True
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Folder (files really on disk, and files dropped in by hand)
# -----------------------------------------------------------------------------

# FUNCTION | Every Video File in Content__VideoFiles: [{rel, path, scheme, stem, height token}]
# ------------------------------------------------------------
def Na__Theia__ScanFiles(folder: Path) -> list:
    base = Na__Theia__VideosDir(folder)
    found = []
    if not base.is_dir():
        return found
    for entry in sorted(base.iterdir()):
        if entry.is_dir() and entry.name.startswith(NA__THEIA__SCHEME_PREFIX):
            scheme = entry.name[len(NA__THEIA__SCHEME_PREFIX):] or NA__THEIA__DEFAULT_SCHEME
            files = sorted(entry.iterdir())
        elif entry.is_file():
            scheme, files = NA__THEIA__DEFAULT_SCHEME, [entry]
        else:
            continue
        for f in files:
            if f.is_file() and f.suffix.lower() in NA__THEIA__VIDEO_EXT and not f.name.startswith("."):
                token = NA__THEIA__HEIGHT_TOKEN.search(f.name)
                found.append({"rel": f.relative_to(base).as_posix(), "path": f, "scheme": scheme,
                              "stem": NA__THEIA__HEIGHT_TOKEN.sub("__", f.stem).rstrip("_") if token else f.stem.rstrip("_"),
                              "height": int(token.group(1)) if token else 0})
    return found
# ---------------------------------------------------------------

# FUNCTION | One Video File as the Page Needs It (probed from the file on disk)
# ------------------------------------------------------------
def Na__Theia__FileView(folder: Path, rel: str, stored: dict | None, cfg: dict) -> dict:
    stored = stored or {}
    path = Na__Theia__Inside(Na__Theia__VideosDir(folder), rel)
    view = {"path": rel, "exists": bool(path and path.is_file()), "ok": False, "problem": ""}
    if not view["exists"]:
        view["problem"] = "file not on this server"
        return view
    probe = Na__Mp4__ProbeCached(path)
    if not probe.get("ok"):
        view["problem"] = probe.get("error") or "not a playable MP4"
        return view
    height = int(probe.get("height") or stored.get("TheiaVideo__File__Height") or 0)
    view.update({
        "ok"          : bool(probe.get("complete")),
        "problem"     : "" if probe.get("complete") else "the file is incomplete (frames missing from its end)",
        "quality"     : Na__Theia__QualityLabel(height),
        "width"       : int(probe.get("width") or 0),
        "height"      : height,
        "fps"         : probe.get("fps") or 0,
        "codec"       : probe.get("codec") or "",
        "bytes"       : int(probe.get("sizeBytes") or 0),
        "bitrateKbps" : int(probe.get("bitrateKbps") or 0),
        "durationMs"  : int(probe.get("durationMs") or 0),
        "hasAudio"    : bool(probe.get("hasAudio")),
        "fastStart"   : bool(probe.get("fastStart")),
        "moovOffset"  : int(probe.get("moovOffset") or 0),
        "moovBytes"   : int(probe.get("moovBytes") or 0),
        "url"         : Na__Theia__FileUrl(path),
        "belowMinimum": height < Na__Theia__MinimumHeight(cfg),
    })
    return view
# ---------------------------------------------------------------

# HELPER FUNCTION | A Poster or Thumbnail URL, If the File Is There
# ------------------------------------------------------------
def Na__Theia__ImageUrl(folder: Path, name: str) -> str:
    path = Na__Theia__Inside(Na__Theia__ThumbsDir(folder), name) if name else None
    return Na__Theia__FileUrl(path) if path and path.is_file() else ""
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Library View (data file + folder + ValeVision 3D, joined)
# -----------------------------------------------------------------------------

# FUNCTION | One Video's Full View
# ------------------------------------------------------------
# files: the video's file first, then any other sizes of it found in the
# folder. The one that plays is the largest complete file at or above 2K.
# ------------------------------------------------------------
def Na__Theia__VideoView(folder: Path, entry: dict, files: list, cfg: dict, in_data: bool) -> dict:
    present = sorted([f for f in files if f["ok"]], key=lambda f: -f["height"])
    chosen = next((f for f in present if not f["belowMinimum"]), None)
    best = chosen or (present[0] if present else None)
    video_id = str(entry.get("TheiaVideo__Video__Id"))
    poster = entry.get("TheiaVideo__Video__Poster") or Na__Theia__PosterName(folder, video_id)
    thumb = entry.get("TheiaVideo__Video__Thumbnail") or Na__Theia__ThumbName(folder, video_id, cfg.get("TheiaConfig__Publish__ThumbnailWidthPx") or 524)
    return {
        "id"              : video_id,
        "order"           : Na__Theia__Order(entry),
        "title"           : str(entry.get("TheiaVideo__Video__Title") or "").strip() or video_id,
        "description"     : str(entry.get("TheiaVideo__Video__Description") or ""),
        "scheme"          : str(entry.get("TheiaVideo__Video__Scheme") or NA__THEIA__DEFAULT_SCHEME),
        "visible"         : entry.get("TheiaVideo__Video__Visible", True) is not False,
        "durationMs"      : int(entry.get("TheiaVideo__Video__DurationMs") or (best or {}).get("durationMs") or 0),
        "hasAudio"        : bool(chosen and chosen.get("hasAudio")),
        "posterUrl"       : Na__Theia__ImageUrl(folder, poster),
        "thumbUrl"        : Na__Theia__ImageUrl(folder, thumb) or Na__Theia__ImageUrl(folder, poster),
        "posterName"      : poster,                                            # <-- Where a poster for this video is (or would be) kept
        "thumbName"       : thumb,
        "file"            : chosen,                                            # <-- The one file that plays (None: nothing at 2K or above)
        "files"           : files,
        "unusedFiles"     : [f["path"] for f in present if f is not chosen],
        "playable"        : chosen is not None,
        "belowMinimum"    : bool(present) and chosen is None,
        "missingFiles"    : [f["path"] for f in files if not f["exists"]],
        "problems"        : [f"{f['path']}: {f['problem']}" for f in files if f["exists"] and not f["ok"]],
        "source"          : str(entry.get("TheiaVideo__Video__Source") or NA__THEIA__SOURCE_FOLDER),
        "sourceVideoId"   : str(entry.get("TheiaVideo__Video__SourceVideoId") or ""),
        "fingerprint"     : str(entry.get("TheiaVideo__Video__SourceFingerprint") or ""),
        "publishedIso"    : str(entry.get("TheiaVideo__Video__PublishedIso") or ""),
        "publishedBy"     : str(entry.get("TheiaVideo__Video__PublishedBy") or ""),
        "metaUpdatedIso"  : str(entry.get("TheiaVideo__Video__MetaUpdatedIso") or ""),
        "metaUpdatedBy"   : str(entry.get("TheiaVideo__Video__MetaUpdatedBy") or ""),
        "inData"          : in_data,
    }
# ---------------------------------------------------------------

# FUNCTION | A Project's Theia Library: {data, problem, videos, schemes, title}
# ------------------------------------------------------------
def Na__Theia__Library(folder: Path, record: dict | None = None, cfg: dict | None = None) -> dict:
    folder = Path(folder)
    cfg = cfg or Na__Theia__Config()
    if record is None:
        record = Na__Library__ReadJson(Na__Theia__RecordPath(folder)) or {}
    data, problem = Na__Theia__ReadData(folder, record)
    vs_videos = Na__Theia__Vv3dVideos(record)
    files = Na__Theia__ScanFiles(folder)
    group_of = {f["rel"]: (f["scheme"], f["stem"]) for f in files}            # <-- Sizes of one video share a group
    by_group = {}
    for f in files:
        by_group.setdefault((f["scheme"], f["stem"]), []).append(f)
    claimed_groups = set()
    videos = []

    # DATA FILE | Each listed video, its file checked against the disk
    for entry in data["TheiaVideo__Library__Videos"]:
        entry = dict(entry)
        if entry.get("TheiaVideo__Video__Source") == NA__THEIA__SOURCE_VV3D:  # <-- The newer of the two titles wins
            vs = vs_videos.get(str(entry.get("TheiaVideo__Video__SourceVideoId") or ""))
            if vs and Na__Theia__IsNewer(vs.get("VideoStudio__Video__MetaUpdatedIso"), entry.get("TheiaVideo__Video__MetaUpdatedIso")):
                entry["TheiaVideo__Video__Title"] = Na__Theia__Vv3dTitle(vs) or entry.get("TheiaVideo__Video__Title")
                entry["TheiaVideo__Video__Description"] = vs.get("VideoStudio__Video__Description") or ""
                entry["TheiaVideo__Video__MetaUpdatedIso"] = vs.get("VideoStudio__Video__MetaUpdatedIso")
        stored = entry.get("TheiaVideo__Video__File") if isinstance(entry.get("TheiaVideo__Video__File"), dict) else {}
        rel = str(stored.get("TheiaVideo__File__Path") or "")
        if not rel:                                                            # <-- The first build (07-Oct-2026) kept a list of sizes:
            legacy = [r for r in entry.get("TheiaVideo__Video__Renditions") or []  #     its largest plays until the video is published again
                      if isinstance(r, dict) and r.get("TheiaVideo__Rendition__File")]
            if legacy:
                top = max(legacy, key=lambda r: int(r.get("TheiaVideo__Rendition__Height") or 0))
                rel, stored = str(top["TheiaVideo__Rendition__File"]), {"TheiaVideo__File__Height": top.get("TheiaVideo__Rendition__Height")}
        entry_files = [Na__Theia__FileView(folder, rel, stored, cfg)] if rel else []
        if rel in group_of:                                                    # <-- Other sizes of the same file: shown as unused
            claimed_groups.add(group_of[rel])
            entry_files += [Na__Theia__FileView(folder, f["rel"], None, cfg) for f in by_group[group_of[rel]] if f["rel"] != rel]
        videos.append(Na__Theia__VideoView(folder, entry, entry_files, cfg, in_data=True))

    # FOLDER | Files nobody listed: one video per name (sizes of it, by the __<height>p__ token, are one video)
    groups = {key: group for key, group in by_group.items() if key not in claimed_groups}
    next_order = max([v["order"] for v in videos if v["order"] < 1e9] or [0]) + 1
    known_ids = {v["id"] for v in videos}
    for (scheme, stem), group in sorted(groups.items()):
        video_id = Na__Theia__SafeId(stem.replace(folder.name + "__", "", 1), prefix="Folder__")
        while video_id in known_ids:
            video_id += "_"
        known_ids.add(video_id)
        entry = {"TheiaVideo__Video__Id": video_id, "TheiaVideo__Video__Order": next_order,
                 "TheiaVideo__Video__Title": Na__Theia__TitleFromStem(stem, folder.name),
                 "TheiaVideo__Video__Scheme": scheme, "TheiaVideo__Video__Source": NA__THEIA__SOURCE_FOLDER,
                 "TheiaVideo__Video__Poster": f"{stem}__Poster__.webp",
                 "TheiaVideo__Video__Thumbnail": f"{stem}__Thumbnail__{cfg.get('TheiaConfig__Publish__ThumbnailWidthPx') or 524}p__.webp"}
        group_files = [Na__Theia__FileView(folder, f["rel"], None, cfg) for f in group]
        videos.append(Na__Theia__VideoView(folder, entry, group_files, cfg, in_data=False))
        next_order += 1

    videos.sort(key=lambda v: (v["order"], v["id"]))
    schemes = []
    for v in videos:
        if v["scheme"] not in schemes:
            schemes.append(v["scheme"])
    title = (str(data.get("TheiaVideo__Library__ProjectTitle") or "").strip()
             or str(record.get("projectNameAlias") or "").strip() or str(record.get("projectName") or "").strip() or folder.name)
    return {"data": data, "problem": problem, "videos": videos, "schemes": schemes, "title": title,
            "rev": int(data.get("_rev", 0) or 0), "record": record}
# ---------------------------------------------------------------

# FUNCTION | The Videos a Given Audience May See, Ready for JSON
# ------------------------------------------------------------
NA__THEIA__CLIENT_KEYS            = ("id", "order", "title", "description", "scheme", "durationMs", "hasAudio",
                                     "posterUrl", "thumbUrl")
NA__THEIA__FILE_KEYS              = ("quality", "width", "height", "fps", "codec", "bytes", "bitrateKbps", "durationMs",
                                     "hasAudio", "fastStart", "moovOffset", "moovBytes", "url")

def Na__Theia__ForAudience(library: dict, audience: str, only_ids: list | None = None) -> list:
    """audience: 'client' (a share link), 'staff' (Employee), 'manager' (Management and AppAdmin)."""
    out = []
    for v in library["videos"]:
        if only_ids and v["id"] not in only_ids:
            continue
        if audience != "manager" and (not v["visible"] or not v["playable"]):
            continue                                                           # <-- Hidden, or below the 2K floor: managers only
        item = {k: v[k] for k in NA__THEIA__CLIENT_KEYS}
        item["file"] = {k: v["file"].get(k) for k in NA__THEIA__FILE_KEYS} if v["file"] else None
        if audience != "client":
            item.update({k: v[k] for k in ("visible", "playable", "source", "sourceVideoId", "publishedIso",
                                           "metaUpdatedIso", "inData")})
        if audience == "manager":
            item.update({k: v[k] for k in ("belowMinimum", "missingFiles", "problems", "unusedFiles", "publishedBy",
                                           "metaUpdatedBy", "fingerprint")})
            item["files"] = [{k: f.get(k) for k in ("path", "exists", "ok", "problem", "quality", "height", "bytes")}
                             for f in v["files"]]
        out.append(item)
    return out
# ---------------------------------------------------------------

# FUNCTION | Does a Project Have Theia Videos? (cheap: a data file or a video file, no probing)
# ------------------------------------------------------------
def Na__Theia__HasVideos(folder: Path) -> bool:
    bucket = Na__Theia__Bucket(folder)
    if not bucket.is_dir():
        return False
    data_path = Na__Theia__DataPath(folder)
    try:
        if data_path.is_file() and data_path.stat().st_size > 2:
            data, _ = Na__Theia__ReadData(folder)
            if data["TheiaVideo__Library__Videos"]:
                return True
    except OSError:
        pass
    return bool(Na__Theia__ScanFiles(folder))
# ---------------------------------------------------------------

# FUNCTION | The Gallery's Summary: what staff can watch, in order
# ------------------------------------------------------------
def Na__Theia__Summary(folder: Path, record: dict | None = None) -> dict:
    if not Na__Theia__HasVideos(folder):
        return {"count": 0, "videos": []}
    library = Na__Theia__Library(folder, record)
    videos = [{"id": v["id"], "title": v["title"], "durationMs": v["durationMs"], "thumbUrl": v["thumbUrl"],
               "scheme": v["scheme"], "quality": v["file"]["quality"] if v["file"] else ""}
              for v in Na__Theia__ForAudience(library, "staff")]
    return {"count": len(videos), "videos": videos, "title": library["title"]}
# ---------------------------------------------------------------

# endregion ----------------------------------------------------
