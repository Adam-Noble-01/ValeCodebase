#!/usr/bin/env python3
# =============================================================================
# VALEVISION THEIA - API - VIDEOS (THE LIST, ITS TITLES, ORDER AND POSTERS)
# =============================================================================
#
# FILE       : TheiaVideoPlayer__Api__Videos__.py
# MODULE     : Theia API Videos
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Read a project's videos for whoever is watching, and let managers
#              edit titles, descriptions, order and visibility - kept in step with
#              ValeVision 3D's Video Studio both ways
# CREATED    : 07-Oct-2026
#
# DESCRIPTION:
# - READ: GET api/projects/<id>/videos answers each audience (theia_core.audience_for)
#   with only what it may see. A share link's view is counted once per visit.
# - TWO-WAY WITH VALEVISION 3D:
#     Theia -> 3D  a title or description saved here is also written into the path
#                  in the project record's VideoStudio__Config (Na__Theia__UpdateVv3dVideo).
#     3D -> Theia  ValeVision 3D's Save Video Settings and Publish & Sync All call
#                  api/projects/<id>/videos/sync; the newer MetaUpdatedIso wins.
# - A VIDEO DROPPED INTO THE FOLDER is written into the data file ("adopted") the
#   first time a manager edits it, orders it or gives it a poster.
# - Every write keeps the previous data file as a revision (ValeShared__Library__).
#
# ROUTES:
#   GET    /api/health
#   GET    /api/config                                 the player, cache and connection settings (public)
#   GET    /api/projects                               projects with videos (Employee)
#   GET    /api/projects/<id>/videos[?share=&view=1]   the videos, for the asker's audience
#   PATCH  /api/projects/<id>/library                  {title}                       (Management)
#   PATCH  /api/projects/<id>/videos/<video>           {title, description, visible} (Management)
#   POST   /api/projects/<id>/videos/order             {order: [ids]}                (Management)
#   POST   /api/projects/<id>/videos/sync              from ValeVision 3D            (Management)
#   POST   /api/projects/<id>/videos/<video>/poster    multipart poster + thumbnail  (Management)
#   DELETE /api/projects/<id>/videos/<video>           the entry and its files       (AppAdmin)
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

import os

from flask import Blueprint, jsonify, request

import TheiaVideoPlayer__Api__Core__ as theia_core
import ValeShared__TheiaVideo__ as theia
from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__Require
from ValeShared__Library__ import Na__Library__Conflict, Na__Library__ListProjects, Na__Library__Locked

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

theia_videos_api         = Blueprint('theia_videos_api', __name__)

CLIENT_CONFIG_PREFIXES   = ('TheiaConfig__Quality__', 'TheiaConfig__Player__', 'TheiaConfig__Prefetch__',
                            'TheiaConfig__Cache__', 'TheiaConfig__Connection__', 'TheiaConfig__Share__ExpiryOptions')
MAX_TITLE                = 140
MAX_DESCRIPTION          = 4000
MAX_IMAGE_BYTES          = 15 * 1024 * 1024
IMAGE_MAGIC              = ((b'RIFF', 'webp'), (b'\x89PNG', 'png'), (b'\xff\xd8\xff', 'jpg'))

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def _project_or_404(pid):
    folder = theia_core.project_folder(pid)
    if not folder:
        return None, theia_core.fail(f'no project {pid!r}', 404)
    return folder, None


def _clean_text(value, limit):
    return str(value or '').replace('\r\n', '\n').strip()[:limit]


def file_record(view, uploaded_iso=''):
    """The video's file as the data file stores it, from its probed view."""
    return {
        'TheiaVideo__File__Path'        : view['path'],
        'TheiaVideo__File__Quality'     : view.get('quality') or '',
        'TheiaVideo__File__Width'       : int(view.get('width') or 0),
        'TheiaVideo__File__Height'      : int(view.get('height') or 0),
        'TheiaVideo__File__Fps'         : view.get('fps') or 0,
        'TheiaVideo__File__Codec'       : view.get('codec') or '',
        'TheiaVideo__File__Bytes'       : int(view.get('bytes') or 0),
        'TheiaVideo__File__BitrateKbps' : int(view.get('bitrateKbps') or 0),
        'TheiaVideo__File__DurationMs'  : int(view.get('durationMs') or 0),
        'TheiaVideo__File__FastStart'   : bool(view.get('fastStart')),
        'TheiaVideo__File__HasAudio'    : bool(view.get('hasAudio')),
        'TheiaVideo__File__UploadedIso' : uploaded_iso,
    }


def adopt_entry(view):
    """A data-file entry for a video only the folder knew about: its file is the one that plays (else the largest)."""
    pick = view['file'] or next((f for f in sorted(view['files'], key=lambda f: -(f.get('height') or 0)) if f.get('exists')), None)
    return {
        'TheiaVideo__Video__Id'              : view['id'],
        'TheiaVideo__Video__Order'           : view['order'],
        'TheiaVideo__Video__Title'           : view['title'],
        'TheiaVideo__Video__Description'     : view['description'],
        'TheiaVideo__Video__Scheme'          : view['scheme'],
        'TheiaVideo__Video__Visible'         : True,
        'TheiaVideo__Video__DurationMs'      : view['durationMs'],
        'TheiaVideo__Video__Source'          : theia.NA__THEIA__SOURCE_FOLDER,
        'TheiaVideo__Video__SourceVideoId'   : '',
        'TheiaVideo__Video__File'            : file_record(pick) if pick else {},
        'TheiaVideo__Video__Poster'          : view['posterName'],
        'TheiaVideo__Video__Thumbnail'       : view['thumbName'],
        'TheiaVideo__Video__PublishedIso'    : '',
        'TheiaVideo__Video__PublishedBy'     : '',
        'TheiaVideo__Video__MetaUpdatedIso'  : '',
        'TheiaVideo__Video__MetaUpdatedBy'   : '',
    }


def entry_for_edit(library, video_id):
    """(entry in the data file, its view): adopting a folder-only video first. (None, None) if unknown."""
    view = next((v for v in library['videos'] if v['id'] == video_id), None)
    if view is None:
        return None, None
    index, entry = theia.Na__Theia__FindEntry(library['data'], video_id)
    if entry is None:
        entry = adopt_entry(view)
        library['data']['TheiaVideo__Library__Videos'].append(entry)
    return entry, view


def delete_files(folder, view):
    """A video's file (and any other sizes of it), its poster and thumbnail (only ever inside this project's Theia folders)."""
    removed = []
    for f in view.get('files') or []:
        path = theia.Na__Theia__Inside(theia.Na__Theia__VideosDir(folder), f['path'])
        if path and path.is_file():
            path.unlink()
            removed.append(f['path'])
    for name in (view.get('posterName'), view.get('thumbName')):
        path = theia.Na__Theia__Inside(theia.Na__Theia__ThumbsDir(folder), name) if name else None
        if path and path.is_file():
            path.unlink()
            removed.append(name)
    return removed


def library_answer(folder, audience, user=None, share=None, only_ids=None):
    """The videos answer every read and every write returns."""
    library = theia.Na__Theia__Library(folder)
    answer = {
        'ok'       : True,
        'audience' : audience,
        'project'  : theia_core.project_public(folder, library),
        'library'  : {'rev': library['rev'], 'schemes': library['schemes']},
        'videos'   : theia.Na__Theia__ForAudience(library, audience, only_ids=only_ids),
        'can'      : theia_core.can_for(user) if user else {'edit': False, 'publish': False, 'share': False, 'delete': False},
    }
    if audience == 'manager' and library['problem']:
        answer['library']['problem'] = library['problem']
    if audience != 'client':
        answer['project']['galleryUrl'] = f"/project-gallery/?id={folder.name}"
        answer['project']['valevisionUrl'] = f"/valevision/?project={folder.name}"
    if share:
        answer['share'] = {'label': share.get('TheiaShare__Link__Label') or '',
                           'expiresIso': share.get('TheiaShare__Link__ExpiresIso')}
    return answer

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Health, Config and the Project List
# -----------------------------------------------------------------------------

@theia_videos_api.get('/api/health')
def health():
    return jsonify({'ok': True, 'app': theia_core.APP_NAME, 'service': theia_core.SERVICE_NAME})


@theia_videos_api.get('/api/config')
def client_config():
    """The player, quality and caching policy: the same file the server enforces."""
    cfg = theia.Na__Theia__Config()
    response = jsonify({'ok': True, 'config': {k: v for k, v in cfg.items() if k.startswith(CLIENT_CONFIG_PREFIXES)}})
    response.headers['Cache-Control'] = 'no-cache'
    return response


@theia_videos_api.get('/api/projects')
@Na__Auth__Require(theia_core.VIEW_LEVEL)
def list_projects():
    """Every project with videos staff can watch (managers also see those with only hidden or below-2K ones)."""
    user = Na__Auth__CurrentUser()
    manager = user['levelRank'] <= theia_core.rank_of(theia_core.EDIT_LEVEL)
    out = []
    for pid, folder in Na__Library__ListProjects():
        if not theia.Na__Theia__HasVideos(folder):
            continue
        library = theia.Na__Theia__Library(folder)
        visible = theia.Na__Theia__ForAudience(library, 'staff')
        if not visible and not manager:
            continue
        first = visible[0] if visible else None
        out.append({
            'id'         : pid,
            'year'       : folder.parent.name.replace('ValeProjects__', ''),
            'code'       : str((library['record'] or {}).get('projectCode') or ''),
            'title'      : library['title'],
            'count'      : len(visible),
            'hiddenCount': len(library['videos']) - len(visible),
            'durationMs' : sum(v['durationMs'] for v in visible),
            'thumbUrl'   : (first or {}).get('thumbUrl') or '',
        })
    return jsonify({'ok': True, 'projects': out})

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | One Project's Videos
# -----------------------------------------------------------------------------

@theia_videos_api.get('/api/projects/<pid>/videos')
def project_videos(pid):
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    audience, user, share, error = theia_core.audience_for(folder)
    token = request.args.get('share') or request.headers.get(theia_core.SHARE_HEADER) or ''
    if error:
        if token and request.args.get('view') == '1':                         # <-- Someone opened a dead link: who, and from where
            theia_core.activity('link.open-refused', 'Opened a client link that has expired or been switched off', folder,
                                link=token[:64], ok=False)
        return error
    only_ids = None
    if share:
        only_ids = [str(i) for i in (share.get('TheiaShare__Link__VideoIds') or []) if i] or None
        if request.args.get('view') == '1':
            theia_core.note_share_view(folder, share.get('TheiaShare__Link__Token'))
            theia_core.activity('link.open', 'Opened the Theia web viewer from a client link', folder,
                                target=share.get('TheiaShare__Link__Label') or '', link=share.get('TheiaShare__Link__Token') or '')
    response = jsonify(library_answer(folder, audience, user, share, only_ids))
    response.headers['Cache-Control'] = 'no-store'
    return response


@theia_videos_api.patch('/api/projects/<pid>/library')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def edit_library(pid):
    """The project's title in Theia (blank: the project's own name)."""
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    body = request.get_json(silent=True) or {}
    with Na__Library__Locked(theia.Na__Theia__DataPath(folder)):
        library = theia.Na__Theia__Library(folder)
        data = library['data']
        if 'title' in body:
            data['TheiaVideo__Library__ProjectTitle'] = _clean_text(body.get('title'), MAX_TITLE)
        try:
            theia.Na__Theia__WriteData(folder, data, theia_core.user_code(), expected_rev=body.get('_rev'))
        except Na__Library__Conflict:
            return theia_core.fail('Someone else changed these videos since you opened them. Reload and try again.', 409,
                                   **library_answer(folder, 'manager', Na__Auth__CurrentUser()))
    theia_core.activity('video.library', 'Renamed the project in Theia', folder,
                        target=data.get('TheiaVideo__Library__ProjectTitle') or '')
    return jsonify(library_answer(folder, 'manager', Na__Auth__CurrentUser()))


@theia_videos_api.patch('/api/projects/<pid>/videos/<vid>')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def edit_video(pid, vid):
    """Title, description, visibility. A ValeVision 3D video's title and description go to its path too."""
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    body = request.get_json(silent=True) or {}
    code = theia_core.user_code()
    vv3d_changes = None
    with Na__Library__Locked(theia.Na__Theia__DataPath(folder)):
        library = theia.Na__Theia__Library(folder)
        entry, view = entry_for_edit(library, vid)
        if entry is None:
            return theia_core.fail(f'no video {vid!r} in this project', 404)
        meta_changed = False
        if 'title' in body:
            title = _clean_text(body.get('title'), MAX_TITLE)
            if not title:
                return theia_core.fail('A video needs a title.', 400)
            meta_changed |= title != view['title']
            entry['TheiaVideo__Video__Title'] = title
        if 'description' in body:
            description = _clean_text(body.get('description'), MAX_DESCRIPTION)
            meta_changed |= description != view['description']
            entry['TheiaVideo__Video__Description'] = description
        if 'visible' in body:
            entry['TheiaVideo__Video__Visible'] = bool(body.get('visible'))
        if meta_changed:
            stamp = theia.Na__Theia__NowIso()
            entry['TheiaVideo__Video__Title'] = entry.get('TheiaVideo__Video__Title') or view['title']
            entry['TheiaVideo__Video__Description'] = entry.get('TheiaVideo__Video__Description', view['description'])
            entry['TheiaVideo__Video__MetaUpdatedIso'] = stamp
            entry['TheiaVideo__Video__MetaUpdatedBy'] = code
            if entry.get('TheiaVideo__Video__Source') == theia.NA__THEIA__SOURCE_VV3D and entry.get('TheiaVideo__Video__SourceVideoId'):
                vv3d_changes = {'VideoStudio__Video__Title'          : entry['TheiaVideo__Video__Title'],
                                'VideoStudio__Video__Description'    : entry['TheiaVideo__Video__Description'],
                                'VideoStudio__Video__MetaUpdatedIso' : stamp}
        try:
            theia.Na__Theia__WriteData(folder, library['data'], code, expected_rev=body.get('_rev'))
        except Na__Library__Conflict:
            return theia_core.fail('Someone else changed these videos since you opened them. Reload and try again.', 409,
                                   **library_answer(folder, 'manager', Na__Auth__CurrentUser()))
    changed = [k for k in ('title', 'description') if k in body] + (['shown' if body.get('visible') else 'hidden']
                                                                      if 'visible' in body else [])
    theia_core.activity('video.edit', 'Edited a video: ' + (', '.join(changed) or 'no change'), folder,
                        target=entry.get('TheiaVideo__Video__Title') or vid)
    synced = None
    if vv3d_changes:                                                           # <-- Outside the data file's lock: the record has its own
        synced = theia.Na__Theia__UpdateVv3dVideo(folder, entry['TheiaVideo__Video__SourceVideoId'], vv3d_changes, code)
    answer = library_answer(folder, 'manager', Na__Auth__CurrentUser())
    answer['valevision3dSynced'] = synced
    return jsonify(answer)


@theia_videos_api.post('/api/projects/<pid>/videos/order')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def order_videos(pid):
    """The playing order: {order: [video ids, first to last]}. Ids not listed keep their place after those that are."""
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    body = request.get_json(silent=True) or {}
    wanted = [str(i) for i in (body.get('order') or []) if i]
    with Na__Library__Locked(theia.Na__Theia__DataPath(folder)):
        library = theia.Na__Theia__Library(folder)
        for vid in wanted:
            entry_for_edit(library, vid)                                       # <-- Folder-only videos join the file so their place sticks
        entries = library['data']['TheiaVideo__Library__Videos']
        rank = {vid: i for i, vid in enumerate(wanted)}
        ordered = sorted(entries, key=lambda e: (rank.get(e['TheiaVideo__Video__Id'], len(wanted)), theia.Na__Theia__Order(e)))
        for i, entry in enumerate(ordered, start=1):
            entry['TheiaVideo__Video__Order'] = i
        try:
            theia.Na__Theia__WriteData(folder, library['data'], theia_core.user_code(), expected_rev=body.get('_rev'))
        except Na__Library__Conflict:
            return theia_core.fail('Someone else changed these videos since you opened them. Reload and try again.', 409,
                                   **library_answer(folder, 'manager', Na__Auth__CurrentUser()))
    theia_core.activity('video.order', 'Changed the order of the videos', folder, detail={'Videos': len(wanted)})
    return jsonify(library_answer(folder, 'manager', Na__Auth__CurrentUser()))


@theia_videos_api.post('/api/projects/<pid>/videos/sync')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def sync_from_valevision3d(pid):
    """
    ValeVision 3D's Video Studio, after a save or a Publish & Sync All:
      {videos: [{sourceVideoId, title, description, metaUpdatedIso, order}],
       applyOrder: bool, removeSourceVideoIds: [ids]}       (removing needs AppAdmin)
    Titles and descriptions: the newer MetaUpdatedIso wins. applyOrder puts the
    published paths in the Video Studio's order, ahead of any other videos.
    """
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    body = request.get_json(silent=True) or {}
    items = [i for i in (body.get('videos') or []) if isinstance(i, dict) and i.get('sourceVideoId')]
    remove = [str(i) for i in (body.get('removeSourceVideoIds') or []) if i]
    user = Na__Auth__CurrentUser()
    if remove and user['levelRank'] > theia_core.rank_of(theia_core.DELETE_LEVEL):
        return theia_core.fail(f'Removing videos from Theia needs {theia_core.DELETE_LEVEL} permission.', 403)
    code = theia_core.user_code()
    updated, removed_files = 0, []
    with Na__Library__Locked(theia.Na__Theia__DataPath(folder)):
        library = theia.Na__Theia__Library(folder)
        entries = library['data']['TheiaVideo__Library__Videos']
        by_source = {str(e.get('TheiaVideo__Video__SourceVideoId')): e for e in entries
                     if e.get('TheiaVideo__Video__Source') == theia.NA__THEIA__SOURCE_VV3D}
        for item in items:
            entry = by_source.get(str(item['sourceVideoId']))
            if entry is None:
                continue
            stamp = theia.Na__Theia__Stamp(item.get('metaUpdatedIso'))           # <-- Blank when it is not a believable time
            if stamp and theia.Na__Theia__IsNewer(stamp, entry.get('TheiaVideo__Video__MetaUpdatedIso')):
                title = _clean_text(item.get('title'), MAX_TITLE)
                if title:
                    entry['TheiaVideo__Video__Title'] = title
                entry['TheiaVideo__Video__Description'] = _clean_text(item.get('description'), MAX_DESCRIPTION)
                entry['TheiaVideo__Video__MetaUpdatedIso'] = stamp
                entry['TheiaVideo__Video__MetaUpdatedBy'] = code
                updated += 1
        if body.get('applyOrder'):
            vv_rank = {str(i['sourceVideoId']): float(i.get('order') or 1e6) for i in items}
            first = sorted([e for e in entries if str(e.get('TheiaVideo__Video__SourceVideoId')) in vv_rank
                            and e.get('TheiaVideo__Video__Source') == theia.NA__THEIA__SOURCE_VV3D],
                           key=lambda e: vv_rank[str(e['TheiaVideo__Video__SourceVideoId'])])
            rest = sorted([e for e in entries if e not in first], key=theia.Na__Theia__Order)
            for i, entry in enumerate(first + rest, start=1):
                entry['TheiaVideo__Video__Order'] = i
        for sid in remove:
            entry = by_source.get(sid)
            if entry is None:
                continue
            view = next((v for v in library['videos'] if v['id'] == entry['TheiaVideo__Video__Id']), None)
            if view:
                removed_files += delete_files(folder, view)
            entries.remove(entry)
        theia.Na__Theia__WriteData(folder, library['data'], code)
    if updated or remove:                                                      # <-- Called after every Video Studio save: real changes only
        theia_core.activity('video.sync', 'Synced videos from ValeVision 3D', folder,
                            detail={'Titles updated': updated, 'Removed': len(remove)})
    answer = library_answer(folder, 'manager', user)
    answer.update({'updated': updated, 'removedFiles': removed_files})
    return jsonify(answer)


@theia_videos_api.delete('/api/projects/<pid>/videos/<vid>')
@Na__Auth__Require(theia_core.DELETE_LEVEL)
def delete_video(pid, vid):
    """Take a video out of Theia: its entry, its file and its posters. ValeVision 3D's path is kept."""
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    code = theia_core.user_code()
    source_id = ''
    with Na__Library__Locked(theia.Na__Theia__DataPath(folder)):
        library = theia.Na__Theia__Library(folder)
        view = next((v for v in library['videos'] if v['id'] == vid), None)
        if view is None:
            return theia_core.fail(f'no video {vid!r} in this project', 404)
        removed = delete_files(folder, view)
        index, entry = theia.Na__Theia__FindEntry(library['data'], vid)
        if entry is not None:
            if entry.get('TheiaVideo__Video__Source') == theia.NA__THEIA__SOURCE_VV3D:
                source_id = str(entry.get('TheiaVideo__Video__SourceVideoId') or '')
            library['data']['TheiaVideo__Library__Videos'].pop(index)
            theia.Na__Theia__WriteData(folder, library['data'], code)
    if source_id:
        theia.Na__Theia__UpdateVv3dVideo(folder, source_id, {'VideoStudio__Video__TheiaPublish': None}, code)
    theia_core.log(f' [THEIA] {code} removed {vid} from {folder.name}: {len(removed)} files')
    theia_core.activity('video.delete', 'Removed a video from Theia', folder, target=view.get('title') or vid,
                        detail={'Files': len(removed)})
    answer = library_answer(folder, 'manager', Na__Auth__CurrentUser())
    answer['removedFiles'] = removed
    return jsonify(answer)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Posters (made in the browser from the video itself, kept for everyone)
# -----------------------------------------------------------------------------

def _image_kind(data):
    for magic, kind in IMAGE_MAGIC:
        if data.startswith(magic) and (kind != 'webp' or data[8:12] == b'WEBP'):
            return kind
    return None


@theia_videos_api.post('/api/projects/<pid>/videos/<vid>/poster')
@Na__Auth__Require(theia_core.EDIT_LEVEL)
def save_poster(pid, vid):
    """multipart: poster (required) and thumbnail (optional), WebP, PNG or JPEG, 15 MB at most each."""
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    files = {k: request.files.get(k) for k in ('poster', 'thumbnail')}
    if not files['poster']:
        return theia_core.fail('No poster image sent.', 400)
    blobs = {}
    for key, upload in files.items():
        if not upload:
            continue
        data = upload.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES or not _image_kind(data):
            return theia_core.fail(f'The {key} must be a WebP, PNG or JPEG of 15 MB or less.', 400)
        blobs[key] = data
    with Na__Library__Locked(theia.Na__Theia__DataPath(folder)):
        library = theia.Na__Theia__Library(folder)
        entry, view = entry_for_edit(library, vid)
        if entry is None:
            return theia_core.fail(f'no video {vid!r} in this project', 404)
        names = {'poster': entry.get('TheiaVideo__Video__Poster') or view['posterName'],
                 'thumbnail': entry.get('TheiaVideo__Video__Thumbnail') or view['thumbName']}
        thumbs = theia.Na__Theia__ThumbsDir(folder)
        thumbs.mkdir(parents=True, exist_ok=True)
        for key, data in blobs.items():
            target = theia.Na__Theia__Inside(thumbs, names[key])
            if target is None:
                return theia_core.fail('Refused file name.', 400)
            tmp = target.with_name(target.name + '.w.tmp')
            tmp.write_bytes(data)
            os.replace(tmp, target)
        entry['TheiaVideo__Video__Poster'] = names['poster']
        entry['TheiaVideo__Video__Thumbnail'] = names['thumbnail'] if 'thumbnail' in blobs else entry.get('TheiaVideo__Video__Thumbnail', names['thumbnail'])
        theia.Na__Theia__WriteData(folder, library['data'], theia_core.user_code())
    theia_core.activity('video.poster', 'Set a video poster', folder, target=view.get('title') or vid)
    return jsonify(library_answer(folder, 'manager', Na__Auth__CurrentUser()))

# endregion -------------------------------------------------------------------
