#!/usr/bin/env python3
# =============================================================================
# VALEVISION THEIA - API - UPLOADS AND PUBLISHING (VIDEO FILES IN, SAFELY)
# =============================================================================
#
# FILE       : TheiaVideoPlayer__Api__Uploads__.py
# MODULE     : Theia API Uploads
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Take a video file and its posters from ValeVision 3D's Publish to
#              Theia (or any manager) in chunks, check every byte, then publish
#              them into the project's Theia folders and data file in one step
# CREATED    : 07-Oct-2026
#
# DESCRIPTION:
# - WHY CHUNKS. Cloudflare and nginx cap a request at 100 MB, and a 4K walkthrough
#   is often over 1 GB. A file goes up as PUTs of up to 64 MB (16 MB by default,
#   TheiaConfig__Upload__ChunkBytes), each carrying its SHA-256, written at its
#   own offset. Chunks may arrive in any order, in parallel, and be re-sent: the
#   session keeps the byte ranges received, so an interrupted upload resumes.
# - STREAMED WHILE RENDERING. ValeVision 3D uploads a video's frames while it is
#   still rendering them. An MP4's index (moov) can only be written once every
#   frame is known, yet a fast-start file needs it at the front: so the upload
#   reserves the first reservedHeadBytes of the file, the frames arrive after
#   them, and Complete writes the head - ftyp, moov, padding, the mdat header -
#   into the reserved space. Nothing is copied, and the file plays from its
#   first bytes. A plain file upload reserves nothing.
# - CHECKED BEFORE IT COUNTS. Complete probes the finished file: it must be an
#   MP4 with a video track, every frame it lists must be in the file, and it
#   must reach the quality floor (TheiaConfig__Quality__MinimumHeightPx, 1440 =
#   2K). Anything else is refused and never published.
# - PUBLISH moves the finished uploads to their stable names
#   (Videos__<Scheme>/<id>__TheiaVideo__<video>__<height>p__.mp4, posters in
#   Content__VideoThumbnails), replaces the video's old file, writes the data file,
#   and, for a ValeVision 3D path, writes the publish stamp into the path in the
#   project record.
# - STAGING lives in the project: ValeVision__TheiaVideo/UserData__UploadStaging/
#   <upload id>.upload.tmp and .session.tmp. *.tmp never syncs and nginx denies
#   UserData folders. Unfinished uploads are cleared after StaleHours.
# - DISK. The server has a small disk: an upload is refused when it would leave
#   less than TheiaConfig__Upload__DiskReserveBytes free.
#
# ROUTES (all need Management):
#   GET    /api/publish-spec                                  the 2K floor, chunk size, free disk
#   POST   /api/projects/<id>/uploads                         {purpose, videoId, reservedHeadBytes, expectedBytes}
#   PUT    /api/projects/<id>/uploads/<upload>?offset=N       raw bytes; X-Theia-Chunk-Sha256
#   GET    /api/projects/<id>/uploads/<upload>                the ranges received (resume)
#   POST   /api/projects/<id>/uploads/<upload>/complete?payloadBytes=N   body: the reserved head bytes
#   DELETE /api/projects/<id>/uploads/<upload>                abandon
#   POST   /api/projects/<id>/videos/<video>/publish          {title, description, scheme, video, poster, ...}
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 07-Oct-2026 - Version 1.0.0
# - Initial build.
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import hashlib
import os
import re
import secrets
import shutil
import time
from pathlib import Path

from flask import Blueprint, jsonify, request

import TheiaVideoPlayer__Api__Core__ as theia_core
import TheiaVideoPlayer__Api__Videos__ as theia_videos
import ValeShared__TheiaVideo__ as theia
from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__Require
from ValeShared__Library__ import NA__LIBRARY__DIR, Na__Library__Locked
from ValeShared__Mp4Probe__ import Na__Mp4__Probe

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

theia_uploads_api        = Blueprint('theia_uploads_api', __name__)

PURPOSES                 = {'video': 'video', 'poster': 'image', 'thumbnail': 'image'}
UPLOAD_ID                = re.compile(theia_core.UPLOAD_ID_PATTERN)
MAX_CHUNK_BYTES          = 64 * 1024 * 1024                                       # <-- Under the 100 MB request cap, with room
MAX_HEAD_BYTES           = 64 * 1024 * 1024
MAX_IMAGE_BYTES          = 15 * 1024 * 1024
STREAM_BLOCK             = 1024 * 1024
SHA_HEADER               = 'X-Theia-Chunk-Sha256'

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def _project_or_404(pid):
    folder = theia_core.project_folder(pid)
    if not folder:
        return None, theia_core.fail(f'no project {pid!r}', 404)
    return folder, None


def _session_or_404(folder, upload_id):
    if not UPLOAD_ID.match(str(upload_id or '')):
        return None, theia_core.fail('bad upload id', 400)
    session = theia_core.read_session(folder, upload_id)
    if not session:
        return None, theia_core.fail('That upload is not on the server (finished, abandoned or cleared).', 404)
    return session, None


def _write_session(folder, upload_id, session):
    _, session_path = theia_core.staging_paths(folder, upload_id)
    theia_core.write_json_atomic(session_path, session)


def _received(session):
    return sum(b - a for a, b in session.get('TheiaUpload__Session__Ranges') or [])


def _replace(source, target):
    """os.replace, retried briefly: on Windows a file still being streamed to a browser refuses a rename for a moment."""
    for delay in (0.05, 0.2, 0.5, 1.0, 2.0, None):
        try:
            os.replace(source, target)
            return
        except PermissionError:
            if delay is None:
                raise
            time.sleep(delay)


def _discard(folder, upload_id, message, probe):
    """A finished upload that failed its check: refused (422) and its files dropped at once - the disk is small."""
    for path in theia_core.staging_paths(folder, upload_id):
        try:
            path.unlink()
        except OSError:
            pass
    theia_core.log(f' [THEIA] upload {upload_id} refused and discarded: {message}')
    return theia_core.fail(message, 422, probe=probe, discarded=True)


def _disk_free(path):
    try:
        return shutil.disk_usage(path).free
    except OSError:
        return 0


def _image_ok(path):
    try:
        with open(path, 'rb') as fh:
            head = fh.read(16)
        size = path.stat().st_size
    except OSError:
        return False, 'unreadable'
    if size > MAX_IMAGE_BYTES:
        return False, 'larger than 15 MB'
    if head.startswith(b'RIFF') and head[8:12] == b'WEBP':
        return True, 'webp'
    if head.startswith(b'\x89PNG') or head.startswith(b'\xff\xd8\xff'):
        return True, 'png/jpeg'
    return False, 'not a WebP, PNG or JPEG'

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Publish Spec (what ValeVision 3D should render)
# -----------------------------------------------------------------------------

@theia_uploads_api.get('/api/publish-spec')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def publish_spec():
    cfg = theia.Na__Theia__Config()
    library_dir = NA__LIBRARY__DIR
    return jsonify({
        'ok'                 : True,
        'minimumHeight'      : theia.Na__Theia__MinimumHeight(cfg),
        'minimumQuality'     : theia.Na__Theia__QualityLabel(theia.Na__Theia__MinimumHeight(cfg)),
        'posterWidth'        : int(cfg.get('TheiaConfig__Publish__PosterWidthPx') or 1920),
        'thumbnailWidth'     : int(cfg.get('TheiaConfig__Publish__ThumbnailWidthPx') or 524),
        'chunkBytes'         : int(cfg.get('TheiaConfig__Upload__ChunkBytes') or 16 * 1024 * 1024),
        'maxChunkBytes'      : MAX_CHUNK_BYTES,
        'maxFileBytes'       : int(cfg.get('TheiaConfig__Upload__MaxFileBytes') or 0),
        'diskFreeBytes'      : _disk_free(library_dir),
        'diskReserveBytes'   : int(cfg.get('TheiaConfig__Upload__DiskReserveBytes') or 0),
    })

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Upload Sessions
# -----------------------------------------------------------------------------

@theia_uploads_api.post('/api/projects/<pid>/uploads')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def start_upload(pid):
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    body = request.get_json(silent=True) or {}
    cfg = theia.Na__Theia__Config()
    purpose = str(body.get('purpose') or '')
    video_id = str(body.get('videoId') or '')
    if purpose not in PURPOSES:
        return theia_core.fail(f'purpose must be one of {", ".join(PURPOSES)}', 400)
    if not theia.NA__THEIA__ID.match(video_id):
        return theia_core.fail('a valid videoId is required', 400)
    try:
        reserved = int(body.get('reservedHeadBytes') or 0)
        expected = int(body.get('expectedBytes') or 0)
    except (TypeError, ValueError):
        return theia_core.fail('reservedHeadBytes and expectedBytes must be whole numbers', 400)
    if reserved < 0 or reserved > MAX_HEAD_BYTES or (PURPOSES[purpose] == 'image' and reserved):
        return theia_core.fail('reservedHeadBytes out of range', 400)
    max_file = int(cfg.get('TheiaConfig__Upload__MaxFileBytes') or 0)
    if expected and max_file and expected > max_file:
        return theia_core.fail(f'That file is larger than the {max_file // (1024 ** 3)} GB Theia accepts.', 413)

    staging = theia.Na__Theia__StagingDir(folder)
    staging.mkdir(parents=True, exist_ok=True)
    theia_core.clean_stale_uploads(folder, cfg.get('TheiaConfig__Upload__StaleHours'))
    need = int(cfg.get('TheiaConfig__Upload__DiskReserveBytes') or 0) + (expected or (2 * 1024 ** 3 if purpose == 'video' else 0))
    free = _disk_free(staging)
    if free < need:
        return theia_core.fail(f'The server is short of disk space ({free / 1024 ** 3:.1f} GB free). Ask Adam to make room before publishing.', 507,
                               diskFreeBytes=free)

    upload_id = time.strftime('UP%Y%m%dT%H%M%S', time.gmtime()) + '_' + secrets.token_hex(4)
    data_path, _ = theia_core.staging_paths(folder, upload_id)
    data_path.write_bytes(b'')
    session = {
        'TheiaUpload__Session__Id'                : upload_id,
        'TheiaUpload__Session__ProjectId'         : folder.name,
        'TheiaUpload__Session__Purpose'           : purpose,
        'TheiaUpload__Session__VideoId'           : video_id,
        'TheiaUpload__Session__ReservedHeadBytes' : reserved,
        'TheiaUpload__Session__ExpectedBytes'     : expected,
        'TheiaUpload__Session__CreatedIso'        : theia.Na__Theia__NowIso(),
        'TheiaUpload__Session__CreatedBy'         : theia_core.user_code(),
        'TheiaUpload__Session__State'             : 'open',
        'TheiaUpload__Session__Ranges'            : [],
    }
    _write_session(folder, upload_id, session)
    theia_core.log(f' [THEIA] upload {upload_id} started for {folder.name}/{video_id} ({purpose})')
    return jsonify({'ok': True, 'uploadId': upload_id,
                    'chunkBytes': int(cfg.get('TheiaConfig__Upload__ChunkBytes') or 16 * 1024 * 1024),
                    'maxChunkBytes': MAX_CHUNK_BYTES})


@theia_uploads_api.put('/api/projects/<pid>/uploads/<upload_id>')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def put_chunk(pid, upload_id):
    """Raw bytes written at ?offset=; the X-Theia-Chunk-Sha256 header, when sent, must match what arrived."""
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    session, missing = _session_or_404(folder, upload_id)
    if missing:
        return missing
    if session.get('TheiaUpload__Session__State') != 'open':
        return theia_core.fail('That upload is already complete.', 409)
    try:
        offset = int(request.args.get('offset', ''))
    except ValueError:
        return theia_core.fail('?offset= is required', 400)
    length = request.content_length
    if length is None:
        return theia_core.fail('Content-Length is required', 411)
    if length <= 0 or length > MAX_CHUNK_BYTES:
        return theia_core.fail(f'a chunk must be 1 byte to {MAX_CHUNK_BYTES // (1024 * 1024)} MB', 413)
    reserved = int(session.get('TheiaUpload__Session__ReservedHeadBytes') or 0)
    max_file = int(theia.Na__Theia__Config().get('TheiaConfig__Upload__MaxFileBytes') or 0)
    if offset < reserved:
        return theia_core.fail('the reserved head is sent with complete, not as a chunk', 400)
    if PURPOSES[session['TheiaUpload__Session__Purpose']] == 'image' and offset + length > MAX_IMAGE_BYTES:
        return theia_core.fail('an image must be 15 MB or less', 413)
    if max_file and offset + length > max_file:
        return theia_core.fail('that would make the file larger than Theia accepts', 413)

    data_path, _ = theia_core.staging_paths(folder, upload_id)
    digest = hashlib.sha256()
    written = 0
    with open(data_path, 'r+b') as fh:
        fh.seek(offset)
        while written < length:
            block = request.stream.read(min(STREAM_BLOCK, length - written))
            if not block:
                break
            digest.update(block)
            fh.write(block)
            written += len(block)
    if written != length:
        return theia_core.fail(f'the chunk arrived short ({written} of {length} bytes); send it again', 400)
    expected_sha = (request.headers.get(SHA_HEADER) or '').strip().lower()
    if expected_sha and expected_sha != digest.hexdigest():
        return theia_core.fail('the chunk was damaged on the way (SHA-256 mismatch); send it again', 422)

    _, session_path = theia_core.staging_paths(folder, upload_id)
    with Na__Library__Locked(session_path):                                    # <-- Parallel chunks merge their ranges one at a time
        session = theia_core.read_session(folder, upload_id) or session
        if session.get('TheiaUpload__Session__State') != 'open':
            return theia_core.fail('That upload is already complete.', 409)
        session['TheiaUpload__Session__Ranges'] = theia_core.merge_ranges(
            (session.get('TheiaUpload__Session__Ranges') or []) + [[offset, offset + length]])
        _write_session(folder, upload_id, session)
    return jsonify({'ok': True, 'receivedBytes': _received(session)})


@theia_uploads_api.get('/api/projects/<pid>/uploads/<upload_id>')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def upload_status(pid, upload_id):
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    session, missing = _session_or_404(folder, upload_id)
    if missing:
        return missing
    return jsonify({'ok': True, 'state': session.get('TheiaUpload__Session__State'),
                    'ranges': session.get('TheiaUpload__Session__Ranges') or [], 'receivedBytes': _received(session),
                    'probe': session.get('TheiaUpload__Session__Probe')})


@theia_uploads_api.post('/api/projects/<pid>/uploads/<upload_id>/complete')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def complete_upload(pid, upload_id):
    """?payloadBytes=N; the body is the reserved head (empty when nothing was reserved). Probes the result."""
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    session, missing = _session_or_404(folder, upload_id)
    if missing:
        return missing
    try:
        payload = int(request.args.get('payloadBytes', ''))
    except ValueError:
        return theia_core.fail('?payloadBytes= is required', 400)
    if (request.content_length or 0) > MAX_HEAD_BYTES:
        return theia_core.fail('head too large', 413)
    head = request.get_data(cache=False) or b''
    data_path, session_path = theia_core.staging_paths(folder, upload_id)
    cfg = theia.Na__Theia__Config()
    with Na__Library__Locked(session_path):
        session = theia_core.read_session(folder, upload_id) or session
        if session.get('TheiaUpload__Session__State') == 'complete':
            return jsonify({'ok': True, 'probe': session.get('TheiaUpload__Session__Probe'), 'already': True})
        reserved = int(session.get('TheiaUpload__Session__ReservedHeadBytes') or 0)
        if len(head) != reserved:
            return theia_core.fail(f'the head must be exactly {reserved} bytes (got {len(head)})', 400)
        if payload <= 0:
            return theia_core.fail('nothing was uploaded', 400)
        need = [reserved, reserved + payload]
        ranges = session.get('TheiaUpload__Session__Ranges') or []
        if not any(a <= need[0] and b >= need[1] for a, b in ranges):
            missing_bytes = payload - sum(max(0, min(b, need[1]) - max(a, need[0])) for a, b in ranges)
            return theia_core.fail(f'{missing_bytes} bytes have not arrived yet; resume the upload', 409,
                                   ranges=ranges, missingBytes=missing_bytes)
        with open(data_path, 'r+b') as fh:
            if head:
                fh.seek(0)
                fh.write(head)
            fh.truncate(reserved + payload)
            fh.flush()
            os.fsync(fh.fileno())

        purpose = session['TheiaUpload__Session__Purpose']
        if PURPOSES[purpose] == 'video':
            probe = Na__Mp4__Probe(data_path)
            if not probe.get('ok') or not probe.get('complete'):
                return _discard(folder, upload_id, f"The file is not a complete MP4: {probe.get('error') or 'frames missing from its end'}.", probe)
            floor = theia.Na__Theia__MinimumHeight(cfg)
            if int(probe.get('height') or 0) < floor:
                return _discard(folder, upload_id, f"The video is {probe.get('height')}px tall: Theia needs at least {floor}px (2K).", probe)
        else:
            ok, kind = _image_ok(data_path)
            if not ok:
                return _discard(folder, upload_id, f'The image is {kind}.', None)
            probe = {'ok': True, 'kind': kind, 'sizeBytes': data_path.stat().st_size}
        session['TheiaUpload__Session__State'] = 'complete'
        session['TheiaUpload__Session__Probe'] = probe
        session['TheiaUpload__Session__CompletedIso'] = theia.Na__Theia__NowIso()
        _write_session(folder, upload_id, session)
    theia_core.log(f' [THEIA] upload {upload_id} complete: {payload + reserved} bytes')
    return jsonify({'ok': True, 'probe': probe})


@theia_uploads_api.delete('/api/projects/<pid>/uploads/<upload_id>')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def abandon_upload(pid, upload_id):
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    if not UPLOAD_ID.match(str(upload_id or '')):
        return theia_core.fail('bad upload id', 400)
    for path in theia_core.staging_paths(folder, upload_id):
        try:
            path.unlink()
        except OSError:
            pass
    return jsonify({'ok': True})

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Publish (finished uploads become a video in Theia)
# -----------------------------------------------------------------------------

@theia_uploads_api.post('/api/projects/<pid>/videos/<vid>/publish')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def publish_video(pid, vid):
    """
    {title, description, scheme, video: upload id, poster, thumbnail (upload ids or null),
     source: 'ValeVision3D', sourceVideoId, fingerprint, metaUpdatedIso, order, export: {...}}
    One file per video: it replaces the video's file and its entry; a ValeVision 3D path gets its publish stamp.
    """
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    if not theia.NA__THEIA__ID.match(str(vid or '')):
        return theia_core.fail('bad video id', 400)
    body = request.get_json(silent=True) or {}
    scheme = str(body.get('scheme') or theia.NA__THEIA__DEFAULT_SCHEME)
    if not theia.NA__THEIA__SCHEME.match(scheme):
        return theia_core.fail('bad scheme name', 400)
    source = str(body.get('source') or 'Upload')
    source_id = str(body.get('sourceVideoId') or '')
    title = theia_videos._clean_text(body.get('title'), theia_videos.MAX_TITLE)
    description = theia_videos._clean_text(body.get('description'), theia_videos.MAX_DESCRIPTION)
    meta_iso = theia.Na__Theia__Stamp(body.get('metaUpdatedIso'))                 # <-- Blank when it is not a believable time
    code = theia_core.user_code()
    cfg = theia.Na__Theia__Config()

    # SESSIONS | Every upload named must be complete, this project's, and for this purpose
    def load(upload_id, purpose):
        session = theia_core.read_session(folder, upload_id) if UPLOAD_ID.match(str(upload_id or '')) else None
        if not session or session.get('TheiaUpload__Session__State') != 'complete':
            raise ValueError(f'upload {upload_id} is not complete on the server')
        if session.get('TheiaUpload__Session__Purpose') != purpose or session.get('TheiaUpload__Session__VideoId') != vid:
            raise ValueError(f'upload {upload_id} was not made for this {purpose}')
        return session
    if not body.get('video'):
        return theia_core.fail('the video file is required (its upload id)', 400)
    try:
        video = load(body['video'], 'video')
        poster = load(body['poster'], 'poster') if body.get('poster') else None
        thumbnail = load(body['thumbnail'], 'thumbnail') if body.get('thumbnail') else None
    except ValueError as error:
        return theia_core.fail(str(error), 409)
    height = int(video['TheiaUpload__Session__Probe'].get('height') or 0)

    stamp = theia.Na__Theia__NowIso()
    with Na__Library__Locked(theia.Na__Theia__DataPath(folder)):
        library = theia.Na__Theia__Library(folder)
        index, entry = theia.Na__Theia__FindEntry(library['data'], vid)
        if entry is not None and source == theia.NA__THEIA__SOURCE_VV3D and \
                entry.get('TheiaVideo__Video__Source') == theia.NA__THEIA__SOURCE_VV3D and \
                str(entry.get('TheiaVideo__Video__SourceVideoId') or '') != source_id:
            return theia_core.fail(f'Theia already has a different video called {vid}.', 409)
        old_view = next((v for v in library['videos'] if v['id'] == vid), None)

        # MOVE | Staging -> its stable name (same disk: a rename, never a copy)
        videos_dir, thumbs_dir = theia.Na__Theia__VideosDir(folder), theia.Na__Theia__ThumbsDir(folder)
        rel = theia.Na__Theia__FileRel(folder, scheme, vid, height)
        target = videos_dir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        data_path, session_path = theia_core.staging_paths(folder, video['TheiaUpload__Session__Id'])
        _replace(data_path, target)
        session_path.unlink(missing_ok=True)
        record = theia_videos.file_record(theia.Na__Theia__FileView(folder, rel, None, cfg),
                                          video.get('TheiaUpload__Session__CompletedIso') or stamp)
        images = {}
        for key, session, name in (('poster', poster, theia.Na__Theia__PosterName(folder, vid)),
                                   ('thumbnail', thumbnail, theia.Na__Theia__ThumbName(folder, vid, cfg.get('TheiaConfig__Publish__ThumbnailWidthPx') or 524))):
            if session:
                thumbs_dir.mkdir(parents=True, exist_ok=True)
                data_path, session_path = theia_core.staging_paths(folder, session['TheiaUpload__Session__Id'])
                _replace(data_path, thumbs_dir / name)
                session_path.unlink(missing_ok=True)
                images[key] = name

        # OLD FILES | Whatever an earlier publish of this video left at another size or in another scheme
        removed = []
        old_paths = set(theia.Na__Theia__PublishedFiles(folder, vid)) | {f['path'] for f in (old_view or {}).get('files') or []}
        for old in sorted(old_paths - {rel}):
            path = theia.Na__Theia__Inside(videos_dir, old)
            if path and path.is_file():
                path.unlink()
                removed.append(old)

        # ENTRY | New, or the existing one updated; a title edited in Theia since the path's own wins
        if entry is None:
            entry = theia_videos.adopt_entry(old_view) if old_view else {'TheiaVideo__Video__Id': vid}
            entry['TheiaVideo__Video__Order'] = body.get('order') or (max([theia.Na__Theia__Order(e) for e in library['data']['TheiaVideo__Library__Videos']
                                                                            if theia.Na__Theia__Order(e) < 1e9] or [0]) + 1)
            entry['TheiaVideo__Video__Visible'] = True
            library['data']['TheiaVideo__Library__Videos'].append(entry)
        if not entry.get('TheiaVideo__Video__Title') or theia.Na__Theia__IsNewer(meta_iso, entry.get('TheiaVideo__Video__MetaUpdatedIso')):
            entry['TheiaVideo__Video__Title'] = title or entry.get('TheiaVideo__Video__Title') or vid
            entry['TheiaVideo__Video__Description'] = description
            entry['TheiaVideo__Video__MetaUpdatedIso'] = meta_iso or stamp
            entry['TheiaVideo__Video__MetaUpdatedBy'] = code
        entry.update({
            'TheiaVideo__Video__Scheme'            : scheme,
            'TheiaVideo__Video__DurationMs'        : record['TheiaVideo__File__DurationMs'],
            'TheiaVideo__Video__Source'            : source,
            'TheiaVideo__Video__SourceVideoId'     : source_id,
            'TheiaVideo__Video__SourceFingerprint' : str(body.get('fingerprint') or ''),
            'TheiaVideo__Video__File'              : record,
            'TheiaVideo__Video__PublishedIso'      : stamp,
            'TheiaVideo__Video__PublishedBy'       : code,
        })
        entry.pop('TheiaVideo__Video__Renditions', None)                       # <-- The first build's list of sizes, replaced by File
        if images.get('poster'):
            entry['TheiaVideo__Video__Poster'] = images['poster']
        if images.get('thumbnail'):
            entry['TheiaVideo__Video__Thumbnail'] = images['thumbnail']
        if isinstance(body.get('export'), dict):
            entry['TheiaVideo__Video__Export'] = {f'TheiaVideo__Export__{k[:1].upper()}{k[1:]}': v for k, v in body['export'].items()
                                                  if isinstance(k, str) and re.match(r'^[A-Za-z][A-Za-z0-9]{0,40}$', k)}

        # FOLDER ENTRIES | A dropped-in entry written for these same files (a title edited before this
        # publish) gives way to the published video, so the video is never listed twice
        taken = {rel} | old_paths
        library['data']['TheiaVideo__Library__Videos'] = [
            e for e in library['data']['TheiaVideo__Library__Videos']
            if e is entry or e.get('TheiaVideo__Video__Source') != theia.NA__THEIA__SOURCE_FOLDER
            or str((e.get('TheiaVideo__Video__File') or {}).get('TheiaVideo__File__Path') or '') not in taken]
        theia.Na__Theia__WriteData(folder, library['data'], code)
        final_title, final_description = entry['TheiaVideo__Video__Title'], entry.get('TheiaVideo__Video__Description') or ''
        final_meta = entry.get('TheiaVideo__Video__MetaUpdatedIso') or ''

    # VALEVISION 3D | The path remembers what was published, and when
    publish_block = {
        'VideoStudio__TheiaPublish__TheiaVideoId' : vid,
        'VideoStudio__TheiaPublish__PublishedIso' : stamp,
        'VideoStudio__TheiaPublish__PublishedBy'  : code,
        'VideoStudio__TheiaPublish__Fingerprint'  : str(body.get('fingerprint') or ''),
        'VideoStudio__TheiaPublish__Scheme'       : scheme,
        'VideoStudio__TheiaPublish__DurationMs'   : record['TheiaVideo__File__DurationMs'],
        'VideoStudio__TheiaPublish__Quality'      : record['TheiaVideo__File__Quality'],
        'VideoStudio__TheiaPublish__Width'        : record['TheiaVideo__File__Width'],
        'VideoStudio__TheiaPublish__Height'       : record['TheiaVideo__File__Height'],
    }
    synced = None
    if source == theia.NA__THEIA__SOURCE_VV3D and source_id:
        synced = theia.Na__Theia__UpdateVv3dVideo(folder, source_id, {'VideoStudio__Video__TheiaPublish': publish_block}, code)
    theia_core.log(f' [THEIA] {code} published {folder.name}/{vid}: {rel}' + (f' (removed {", ".join(removed)})' if removed else ''))
    answer = theia_videos.library_answer(folder, 'manager', Na__Auth__CurrentUser())
    answer.update({'publish': publish_block, 'valevision3dSynced': synced, 'removedFiles': removed,
                   'title': final_title, 'description': final_description, 'metaUpdatedIso': final_meta})
    return jsonify(answer)

# endregion -------------------------------------------------------------------
