#!/usr/bin/env python3
# =============================================================================
# VALEVISION 3D - API - PAGE LAYOUTS (CREATE DRAWING: THE JOB'S SAVED LAYOUTS)
# =============================================================================
#
# FILE       : ValeVision3D__Api__PageLayouts__.py
# MODULE     : ValeVision3D API Page Layouts
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Keep the page layouts people make with Create Drawing (LayoutVision 2D)
#              in the job's own data file, with who made each one and who changed it last
# CREATED    : 09-Oct-2026
#
# DESCRIPTION:
# - ONE FILE PER JOB, BESIDE ITS PICTURES:
#     <project>/ValeVision3D/UserData__UserGeneratedContent__Images/
#         ValeVision__PageLayouts__.json                              the job's layouts (written here only)
#         PageLayouts/<layout id>/<id>__Image__<stamp>.png             the picture placed on the sheet
#         PageLayouts/<layout id>/<id>__Thumbnail__<stamp>.webp        a small picture of the whole sheet
#         PageLayouts/<layout id>/00__Archive/                         pictures a re-render replaced (newest 5)
#   User data: made on the server, collected to the PC, never pushed over.
# - SHARED PER JOB, LABELLED BY USER (Adam, 09-Oct-2026): every signed-in account
#   sees every layout of the job; any staff account (Employee and up) saves and may
#   update any layout. The server stamps who made it and when (CreatedBy, CreatedIso:
#   once) and who changed it last (UpdatedBy, UpdatedIso: every save) from the
#   session, never from the request. Deleting is for the layout's creator, or
#   Management and up.
# - DELETE MEANS DELETE (Adam, 09-Oct-2026: no archives that will be long forgotten):
#   the record leaves the file, then the layout's folder goes for good, its picture,
#   thumbnail and replaced pictures with it. The app makes it hard to do by accident
#   (the word delete has to be typed). Only the file's revisions in
#   ProjectData__Revisions still hold the record's text (no pictures), as for every
#   JSON the library writes. Until 1.1.0 a deleted layout's folder was moved to
#   PageLayouts/00__Archive/<layout id>__<stamp>/; those were cleared on 09-Oct-2026.
# - TWO PEOPLE, ONE LAYOUT: each layout carries its own Rev. A save names the Rev it
#   was built on; when the layout has moved on since, nothing is written and the
#   answer is 409 with the layout as it is now.
# - THE FILE IS WRITTEN THE LIBRARY'S WAY (Na__Library__WriteJson): locked across
#   processes, atomic, _rev bumped, the copy it replaces kept in ProjectData__Revisions.
#   A file broken by hand is never written over: reads and saves answer 500 naming
#   the line, as the spelling dictionary does.
# - THE LAYOUT'S CONTENT is the page's own (the picture's place on the sheet, the
#   composition guide, the render settings, the view it was rendered from): kept as
#   sent, objects only, size capped. A save that leaves a block out keeps the stored one.
# - The activity ledger names each save and delete (ValeVision3D__Api__Activity__, through
#   g.na_vv3d_activity).
#
# ROUTES:
#   GET  /api/projects/<id>/page-layouts                        the job's layouts, newest first (signed in)
#   GET  /api/projects/<id>/page-layouts/files/<path>           a layout's picture or thumbnail (signed in)
#   POST /api/projects/<id>/page-layouts                        save one (Employee): multipart layout, image, thumbnail
#   POST /api/projects/<id>/page-layouts/<layout id>/delete     delete one for good (its creator, or Management)
#
# ENVIRONMENT:
#   VALEVISION3D_PAGELAYOUT_LEVEL   who may save (default Employee)
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.2)
# - Delete is final (Adam): the layout's folder is removed, not moved to
#   PageLayouts/00__Archive. The answer and the activity ledger say how many files went.
#
# 09-Oct-2026 - Version 1.0.0
# - Initial build for the Create Drawing page's saved layouts (ValeVision3D v2.75.0).
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import json
import os
import re
import secrets
import shutil
import struct
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, g, jsonify, request

import ValeVision3D__Api__Core__ as vv_shared
from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__Level, Na__Auth__Ranks, Na__Auth__Require
from ValeShared__Library__ import Na__Library__Locked, Na__Library__WriteJson

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

valevision_page_layouts_api = Blueprint('valevision_page_layouts_api', __name__)

DATA_FILE                = 'ValeVision__PageLayouts__.json'                       # <-- In <project>/ValeVision3D/UserData__UserGeneratedContent__Images/
FILES_DIR                = 'PageLayouts'                                          # <-- One folder per layout beside it
ARCHIVE_DIR              = '00__Archive'
SCHEMA_VERSION           = 1

# WHO | Levels (lower rank = more rights)
READ_LEVEL               = 'Affiliate'                                            # <-- Any signed-in account sees the job's layouts
SAVE_LEVEL               = os.environ.get('VALEVISION3D_PAGELAYOUT_LEVEL') or 'Employee'   # <-- Any staff account saves (Adam, 09-Oct-2026)
DELETE_ANY_LEVEL         = 'Management'                                           # <-- Deletes someone else's layout; its creator always may

# LIMITS | Only stop a runaway request; a real layout is far below each
KEEP_SUPERSEDED          = 5                                                      # <-- Pictures a re-render replaced, kept per layout
MAX_LAYOUT_BYTES         = 512 * 1024                                             # <-- The layout's JSON (no pictures in it)
MAX_IMAGE_BYTES          = 96 * 1024 * 1024                                       # <-- An 8K PNG of whitecard is a few tens of MB
MAX_THUMB_BYTES          = 4 * 1024 * 1024
MAX_NAME_LENGTH          = 120
MAX_LAYOUTS              = 500                                                    # <-- Per job

# NAMES | What the server makes, and the only files a read may send
LAYOUT_ID                = re.compile(r'^PL-\d{8}-\d{6}-[a-z0-9]{4}$')
STORED_FILE              = re.compile(r'^PageLayouts/(PL-\d{8}-\d{6}-[a-z0-9]{4})/\1__(Image|Thumbnail)__\d{8}-\d{6}-\d{3}\.(png|webp|jpg)$')
ID_ALPHABET              = 'abcdefghijklmnopqrstuvwxyz0123456789'

# KEYS | The data file
K_DESCRIPTION            = 'PageLayouts__Library__Description'
K_SCHEMA                 = 'PageLayouts__Library__SchemaVersion'
K_PROJECT                = 'PageLayouts__Library__ProjectId'
K_LIB_UPDATED_ISO        = 'PageLayouts__Library__UpdatedIso'
K_LIB_UPDATED_BY         = 'PageLayouts__Library__UpdatedBy'
K_LAYOUTS                = 'PageLayouts__Library__Layouts'

# KEYS | One layout (the server writes the first eleven; the page writes the blocks)
K_ID                     = 'PageLayouts__Layout__Id'
K_NAME                   = 'PageLayouts__Layout__Name'
K_REV                    = 'PageLayouts__Layout__Rev'
K_CREATED_BY             = 'PageLayouts__Layout__CreatedBy'
K_CREATED_BY_NAME        = 'PageLayouts__Layout__CreatedByName'
K_CREATED_ISO            = 'PageLayouts__Layout__CreatedIso'
K_UPDATED_BY             = 'PageLayouts__Layout__UpdatedBy'
K_UPDATED_BY_NAME        = 'PageLayouts__Layout__UpdatedByName'
K_UPDATED_ISO            = 'PageLayouts__Layout__UpdatedIso'
K_IMAGE_FILE             = 'PageLayouts__Layout__ImageFile'
K_IMAGE_WIDTH            = 'PageLayouts__Layout__ImageWidthPx'
K_IMAGE_HEIGHT           = 'PageLayouts__Layout__ImageHeightPx'
K_THUMB_FILE             = 'PageLayouts__Layout__ThumbnailFile'
CONTENT_KEYS             = ('PageLayouts__Layout__Sheet',                          # <-- { Format, WidthMm, HeightMm, TitleBlock }
                            'PageLayouts__Layout__ImagePlacement',                 # <-- The picture's place and trims on the sheet, mm
                            'PageLayouts__Layout__Guide',                          # <-- The composition guide: shown, margins in mm
                            'PageLayouts__Layout__RenderSettings',                 # <-- Resolution, aspect, anti-aliasing, enhance, line weights
                            'PageLayouts__Layout__SourceView')                     # <-- The camera, layers, lighting it was rendered from

DESCRIPTION              = ('LayoutVision 2D page layouts made with Create Drawing in ValeVision 3D: one record per '
                            'layout, the picture and a thumbnail of the sheet in PageLayouts/<layout id>/. Written by '
                            'the ValeVision 3D API only (ValeVision3D__Api__PageLayouts__.py), which stamps who made '
                            'each layout and who changed it last.')

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def _refuse(message, status=400, **extra):
    body = {'ok': False, 'error': message}
    body.update(extra)
    return jsonify(body), status


def _utc_stamp():
    """'20261009-084012-123': a file name's time, UTC, to the millisecond."""
    now = datetime.now(timezone.utc)
    return now.strftime('%Y%m%d-%H%M%S-') + f'{now.microsecond // 1000:03d}'


def _new_id(taken):
    """'PL-20261009-084012-a1b2': a layout id no other layout of the job has."""
    while True:
        layout_id = 'PL-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S') + '-' + ''.join(
            secrets.choice(ID_ALPHABET) for _ in range(4))
        if layout_id not in taken:
            return layout_id


def _images_dir(folder: Path) -> Path:
    return Path(folder) / vv_shared.APP_BUCKET / vv_shared.IMAGES_DIR


def _data_path(folder: Path) -> Path:
    return _images_dir(folder) / DATA_FILE


def _empty(folder: Path):
    return {
        K_DESCRIPTION     : DESCRIPTION,
        K_SCHEMA          : SCHEMA_VERSION,
        K_PROJECT         : Path(folder).name,
        K_LIB_UPDATED_ISO : '',
        K_LIB_UPDATED_BY  : '',
        K_LAYOUTS         : [],
    }


def _read(folder: Path):
    """
    (data, problem). A missing or empty file reads as a job with no layouts. A file
    that is not JSON (a hand edit gone wrong) reads as (None, where it is broken):
    it is never written over.
    """
    path = _data_path(folder)
    if not path.is_file():
        return _empty(folder), None
    try:
        text = path.read_text(encoding='utf-8-sig')
    except OSError as error:
        return None, f'{DATA_FILE} could not be read ({type(error).__name__})'
    if not text.strip():
        return _empty(folder), None                                                # <-- A 0-byte placeholder: nothing saved yet
    try:
        data = json.loads(text)
    except ValueError as error:
        return None, vv_shared.unreadable_message(DATA_FILE, error) + ' - put it right before saving'
    if not isinstance(data, dict):
        return None, f'{DATA_FILE} is not a JSON object - put it right before saving'
    if not isinstance(data.get(K_LAYOUTS), list):
        data[K_LAYOUTS] = []
    data[K_LAYOUTS] = [e for e in data[K_LAYOUTS] if isinstance(e, dict) and LAYOUT_ID.match(str(e.get(K_ID) or ''))]
    return data, None


def _find(data, layout_id):
    for i, entry in enumerate(data.get(K_LAYOUTS) or []):
        if entry.get(K_ID) == layout_id:
            return i, entry
    return -1, None


def _clean_name(raw):
    """The name as stored: one line, no control characters, trimmed, at most MAX_NAME_LENGTH."""
    if not isinstance(raw, str):
        return ''
    text = re.sub(r'[\x00-\x1f\x7f]+', ' ', raw)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:MAX_NAME_LENGTH].strip()


def _sniff(data):
    """The picture type the bytes really are: 'png', 'webp', 'jpg', or None."""
    if len(data) >= 8 and data[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    if len(data) >= 12 and data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'webp'
    if len(data) >= 3 and data[:3] == b'\xff\xd8\xff':
        return 'jpg'
    return None


def _png_size(data):
    """(width, height) from a PNG's header, or None."""
    if len(data) < 24 or data[12:16] != b'IHDR':
        return None
    return struct.unpack('>II', data[16:24])


def _upload(field, limit):
    """(bytes, type) of an uploaded picture, (None, None) when none was sent, or raises ValueError with the reason."""
    item = request.files.get(field)
    if not item:
        return None, None
    data = item.read(limit + 1)
    if len(data) > limit:
        raise ValueError(f'The {field} is too large ({limit // (1024 * 1024)} MB at most)')
    if not data:
        raise ValueError(f'The {field} is empty')
    kind = _sniff(data)
    if not kind:
        raise ValueError(f'The {field} is not a PNG, WebP or JPEG picture')
    return data, kind


def _whole_number(value, low=1, high=100000):
    return value if isinstance(value, int) and not isinstance(value, bool) and low <= value <= high else None


def _user():
    user = Na__Auth__CurrentUser() or {}
    return user, (user.get('code') or ''), (user.get('name') or user.get('code') or '')


def _public(entry, folder: Path):
    """A layout as the page sees it: as stored, plus where its pictures are read from (relative to api/)."""
    out = dict(entry)
    base = f'projects/{Path(folder).name}/page-layouts/files/'
    out['imageUrl']     = base + entry[K_IMAGE_FILE] if entry.get(K_IMAGE_FILE) else ''
    out['thumbnailUrl'] = base + entry[K_THUMB_FILE] if entry.get(K_THUMB_FILE) else ''
    return out


def _archive_superseded(images_dir: Path, rels):
    """
    Move pictures a save replaced into the layout's 00__Archive, keeping the newest
    KEEP_SUPERSEDED of each kind (pictures, thumbnails). Never raises: a picture that
    cannot move simply stays beside the new one.
    """
    for rel in rels:
        try:
            match = STORED_FILE.match(rel or '')
            if not match:
                continue
            path = images_dir / rel
            if not path.is_file():
                continue
            archive = path.parent / ARCHIVE_DIR
            archive.mkdir(parents=True, exist_ok=True)
            os.replace(path, archive / path.name)
            kind = f'__{match.group(2)}__'
            same_kind = sorted((p for p in archive.iterdir() if p.is_file() and kind in p.name), key=lambda p: p.name)
            for old in same_kind[:-KEEP_SUPERSEDED]:                           # <-- Names sort by their UTC stamp
                old.unlink()
        except OSError as error:
            vv_shared.log(f' [PAGE LAYOUTS] A replaced picture stayed where it was ({rel}): {error}')


def _remove_quietly(paths):
    for path in paths:
        try:
            Path(path).unlink()
        except OSError:
            pass

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Reading
# -----------------------------------------------------------------------------

@valevision_page_layouts_api.get('/api/projects/<path:token>/page-layouts')
@Na__Auth__Require(READ_LEVEL)
def page_layouts_list(token):
    """The job's layouts, the last changed first, and who may save and delete."""
    folder = vv_shared.resolve_project(token)
    if not folder:
        return _refuse(f'Project not found: {token}', 404)
    data, problem = _read(folder)
    if data is None:
        vv_shared.log(f' [PAGE LAYOUTS] {folder.name}: {problem}')
        return _refuse(problem, 500, unreadable=True)
    layouts = sorted(data[K_LAYOUTS], key=lambda e: str(e.get(K_UPDATED_ISO) or ''), reverse=True)
    response = jsonify({
        'ok'             : True,
        'projectId'      : folder.name,
        'saveLevel'      : SAVE_LEVEL,
        'deleteAnyLevel' : DELETE_ANY_LEVEL,
        'layouts'        : [_public(e, folder) for e in layouts],
    })
    response.headers['Cache-Control'] = 'no-store'
    return response


@valevision_page_layouts_api.get('/api/projects/<path:token>/page-layouts/files/<path:rel_path>')
@Na__Auth__Require(READ_LEVEL)
def page_layouts_file(token, rel_path):
    """A layout's picture or thumbnail: only names this blueprint makes, only inside the job's images folder."""
    folder = vv_shared.resolve_project(token)
    if not folder:
        return _refuse(f'Project not found: {token}', 404)
    rel = str(rel_path or '').replace('\\', '/')
    if not STORED_FILE.match(rel):
        return _refuse('Refused path')
    images_dir = _images_dir(folder)
    path = images_dir / rel
    if not vv_shared.is_inside(path, images_dir) or not path.is_file():
        return _refuse(f'Not on the server: {rel}', 404, missing=True)
    return vv_shared.send_private_file(str(path))

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Saving
# -----------------------------------------------------------------------------

@valevision_page_layouts_api.post('/api/projects/<path:token>/page-layouts')
@Na__Auth__Require(SAVE_LEVEL)
def page_layouts_save(token):
    """
    Save one layout (multipart): 'layout' is its JSON, 'image' the picture (needed for a
    new layout; leave it out to keep the stored one), 'thumbnail' a small picture of
    the sheet. With PageLayouts__Layout__Id and __Rev it updates that layout; without,
    it makes a new one. Answers { ok, created, layout }.
    """
    folder = vv_shared.resolve_project(token)
    if not folder:
        return _refuse(f'Project not found: {token}', 404)

    raw = request.form.get('layout') or ''
    if len(raw.encode('utf-8')) > MAX_LAYOUT_BYTES:
        return _refuse('The layout is too large to save', 413)
    try:
        sent = json.loads(raw) if raw else None
    except ValueError:
        return _refuse('The layout is not valid JSON')
    if not isinstance(sent, dict):
        return _refuse('No layout was sent')

    name = _clean_name(sent.get(K_NAME))
    if not name:
        return _refuse('Give the layout a name')
    content = {}
    for key in CONTENT_KEYS:
        if key not in sent or sent[key] is None:
            continue
        if not isinstance(sent[key], dict):
            return _refuse(f'{key} must be an object')
        content[key] = sent[key]

    layout_id = str(sent.get(K_ID) or '').strip()
    if layout_id and not LAYOUT_ID.match(layout_id):
        return _refuse('That is not a layout id')

    try:
        image, image_kind = _upload('image', MAX_IMAGE_BYTES)
        thumb, thumb_kind = _upload('thumbnail', MAX_THUMB_BYTES)
    except ValueError as error:
        return _refuse(str(error))

    _user_rec, code, user_name = _user()
    images_dir = _images_dir(folder)
    if not vv_shared.is_inside(images_dir, vv_shared.PROJECTS_ROOT):
        return _refuse('The job folder is not in the projects library', 500)
    path = _data_path(folder)

    with Na__Library__Locked(path):                                            # <-- Read, check, write the pictures and the file as one step
        data, problem = _read(folder)
        if data is None:
            vv_shared.log(f' [PAGE LAYOUTS] Save refused for {folder.name}: {problem}')
            return _refuse(problem, 500, unreadable=True)

        index, current = _find(data, layout_id) if layout_id else (-1, None)
        if layout_id and current is None:
            return _refuse('This layout is no longer saved for the job (it was deleted). Use Save as New to keep it.',
                           404, missing=True)
        if current is not None:
            sent_rev = sent.get(K_REV)
            stored_rev = int(current.get(K_REV) or 0)
            if not isinstance(sent_rev, int) or isinstance(sent_rev, bool) or sent_rev != stored_rev:
                who = current.get(K_UPDATED_BY_NAME) or current.get(K_UPDATED_BY) or 'Someone'
                return _refuse(f'{who} saved this layout after you opened it. Open it again to see their changes, '
                               f'or use Save as New to keep yours.', 409, conflict=True, current=_public(current, folder))
        else:
            if image is None:
                return _refuse('A new layout needs its picture')
            if len(data[K_LAYOUTS]) >= MAX_LAYOUTS:
                return _refuse(f'This job already has {MAX_LAYOUTS} layouts: delete some first')
            layout_id = _new_id({e.get(K_ID) for e in data[K_LAYOUTS]})

        # PICTURES FIRST | the file only ever names pictures that are on disk
        stamp = _utc_stamp()
        layout_dir = images_dir / FILES_DIR / layout_id
        written = []
        image_rel = thumb_rel = None
        try:
            if image is not None:
                image_rel = f'{FILES_DIR}/{layout_id}/{layout_id}__Image__{stamp}.{image_kind}'
                vv_shared.write_bytes_atomic(str(images_dir / image_rel), image)
                written.append(images_dir / image_rel)
            if thumb is not None:
                thumb_rel = f'{FILES_DIR}/{layout_id}/{layout_id}__Thumbnail__{stamp}.{thumb_kind}'
                vv_shared.write_bytes_atomic(str(images_dir / thumb_rel), thumb)
                written.append(images_dir / thumb_rel)
        except OSError as error:
            _remove_quietly(written)
            vv_shared.log(f' [PAGE LAYOUTS] Pictures not written for {folder.name}/{layout_id}: {error}')
            return _refuse('The pictures could not be written on the server', 500)

        # THE RECORD | the server's stamps first, then the page's own blocks
        old = current or {}
        now = vv_shared.now_iso()
        entry = {
            K_ID              : layout_id,
            K_NAME            : name,
            K_REV             : int(old.get(K_REV) or 0) + 1,
            K_CREATED_BY      : old.get(K_CREATED_BY) or code,
            K_CREATED_BY_NAME : old.get(K_CREATED_BY_NAME) or user_name,
            K_CREATED_ISO     : old.get(K_CREATED_ISO) or now,
            K_UPDATED_BY      : code,
            K_UPDATED_BY_NAME : user_name,
            K_UPDATED_ISO     : now,
            K_IMAGE_FILE      : image_rel or old.get(K_IMAGE_FILE) or '',
            K_IMAGE_WIDTH     : old.get(K_IMAGE_WIDTH),
            K_IMAGE_HEIGHT    : old.get(K_IMAGE_HEIGHT),
            K_THUMB_FILE      : thumb_rel or old.get(K_THUMB_FILE) or '',
        }
        if image is not None:
            size = _png_size(image) if image_kind == 'png' else None
            entry[K_IMAGE_WIDTH]  = size[0] if size else _whole_number(sent.get(K_IMAGE_WIDTH))
            entry[K_IMAGE_HEIGHT] = size[1] if size else _whole_number(sent.get(K_IMAGE_HEIGHT))
        for key in CONTENT_KEYS:
            if key in content:
                entry[key] = content[key]
            elif key in old:
                entry[key] = old[key]                                          # <-- A block the save left out is kept

        layouts = data[K_LAYOUTS]
        if index >= 0:
            layouts[index] = entry
        else:
            layouts.append(entry)
        data[K_DESCRIPTION]     = DESCRIPTION
        data[K_SCHEMA]          = SCHEMA_VERSION
        data[K_PROJECT]         = folder.name
        data[K_LIB_UPDATED_ISO] = now
        data[K_LIB_UPDATED_BY]  = code

        try:
            if path.is_file() and not path.read_bytes().strip():
                path.unlink()                                                  # <-- A 0-byte placeholder: the shared writer cannot read it
            written_doc = Na__Library__WriteJson(path, data, user_code=code, project_folder=folder)
        except Exception as error:                                             # noqa: BLE001
            _remove_quietly(written)
            vv_shared.log(f' [PAGE LAYOUTS] {DATA_FILE} not written for {folder.name}: {type(error).__name__}: {error}')
            return _refuse('The layout could not be saved on the server', 500)

        replaced = []
        if image_rel and old.get(K_IMAGE_FILE) and old.get(K_IMAGE_FILE) != image_rel:
            replaced.append(old.get(K_IMAGE_FILE))
        if thumb_rel and old.get(K_THUMB_FILE) and old.get(K_THUMB_FILE) != thumb_rel:
            replaced.append(old.get(K_THUMB_FILE))
        _archive_superseded(images_dir, replaced)                              # <-- Only now: the file points at the new pictures

    created = current is None
    g.na_vv3d_activity = {
        'text'   : f'{"Created" if created else "Saved"} page layout {name}',
        'target' : name,
        'detail' : {'Layout': layout_id, 'Picture': 'new' if image is not None else 'kept'},
    }
    return jsonify({'ok': True, 'created': created, 'layout': _public(entry, folder),
                    'revision': written_doc.get('revision')})

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Deleting
# -----------------------------------------------------------------------------

@valevision_page_layouts_api.post('/api/projects/<path:token>/page-layouts/<layout_id>/delete')
@Na__Auth__Require(SAVE_LEVEL)
def page_layouts_delete(token, layout_id):
    """Delete one layout for good: off the job's list, then its folder and every picture in it. Its creator, or Management."""
    if not LAYOUT_ID.match(str(layout_id or '')):
        return _refuse('That is not a layout id')
    folder = vv_shared.resolve_project(token)
    if not folder:
        return _refuse(f'Project not found: {token}', 404)
    user, code, _user_name = _user()
    images_dir = _images_dir(folder)
    path = _data_path(folder)

    with Na__Library__Locked(path):
        data, problem = _read(folder)
        if data is None:
            return _refuse(problem, 500, unreadable=True)
        index, entry = _find(data, layout_id)
        if entry is None:
            return _refuse('This layout is not saved for the job (already deleted?)', 404, missing=True)
        need = Na__Auth__Ranks().get(DELETE_ANY_LEVEL, 2)
        if entry.get(K_CREATED_BY) != code and Na__Auth__Level(user) > need:
            who = entry.get(K_CREATED_BY_NAME) or entry.get(K_CREATED_BY) or 'its creator'
            return _refuse(f'Only {who} or a manager can delete this layout', 403)

        del data[K_LAYOUTS][index]
        data[K_LIB_UPDATED_ISO] = vv_shared.now_iso()
        data[K_LIB_UPDATED_BY]  = code
        try:
            Na__Library__WriteJson(path, data, user_code=code, project_folder=folder)
        except Exception as error:                                             # noqa: BLE001
            vv_shared.log(f' [PAGE LAYOUTS] {DATA_FILE} not written for {folder.name}: {type(error).__name__}: {error}')
            return _refuse('The layout could not be deleted on the server', 500)

        removed = _remove_layout_files(images_dir, layout_id, folder.name)    # <-- Only now: the file no longer names its pictures

    name = entry.get(K_NAME) or layout_id
    g.na_vv3d_activity = {'text': f'Deleted page layout {name}', 'target': name,
                          'detail': {'Layout': layout_id, 'Files removed': removed}}
    return jsonify({'ok': True, 'deleted': layout_id, 'filesRemoved': removed})


def _remove_layout_files(images_dir: Path, layout_id: str, project_name: str) -> int:
    """
    Delete a layout's folder for good: its picture, its thumbnail and the pictures
    re-saves replaced (its own 00__Archive). Answers how many files went. Never
    raises: the record is already off the list, so a file that will not go is
    logged and left (it can no longer be reached from the app).
    """
    files_root = (images_dir / FILES_DIR).resolve()
    layout_dir = images_dir / FILES_DIR / layout_id
    if not layout_dir.is_dir() or layout_dir.is_symlink():
        return 0
    if layout_dir.resolve().parent != files_root:                              # <-- Only ever a folder directly in PageLayouts/
        vv_shared.log(f' [PAGE LAYOUTS] {layout_id} not removed for {project_name}: its folder is not where it should be')
        return 0
    count = sum(1 for p in layout_dir.rglob('*') if p.is_file())
    failures = []

    def _note(_func, path, _exc):
        failures.append(path)

    try:
        shutil.rmtree(layout_dir, onexc=_note)                                 # <-- Python 3.12 and up (the server's)
    except TypeError:
        shutil.rmtree(layout_dir, onerror=_note)                               # <-- An older Python on a PC
    if failures:
        vv_shared.log(f' [PAGE LAYOUTS] {layout_id} for {project_name}: {len(failures)} item(s) could not be removed, '
                      f'e.g. {failures[0]}')
    return max(0, count - len(failures))

# endregion -------------------------------------------------------------------
