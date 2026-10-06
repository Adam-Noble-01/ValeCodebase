#!/usr/bin/env python3
# =============================================================================
# VALEVISION3D - USER CONFIG API (FLASK BLUEPRINT)
# =============================================================================
#
# FILE       : ValeVision3D__Api__UserConfig__.py
# MODULE     : ValeVisionUserConfigApi
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Read the ValeVision spelling dictionary, and add a word to it or take one out, for the app's Add to Dictionary
# CREATED    : 22-Sep-2026
#
# DESCRIPTION:
# - THE USER CONFIG FOLDER. The settings that belong to the practice rather
#   than to a project live at the ValeVision app root, in:
#       WebApps/ValeVision3D/50__ValeVision__UserConfig/
#   The first of them is ValeVision__UserSpellings__.json: the words the spell
#   check in ValeVision's text boxes accepts that the browser's own dictionary
#   does not know - manufacturers, product names, the practice's own terms.
# - A browser cannot write a file, so the app's Add to Dictionary asks this
#   blueprint to. Registered by server.py beside this file.
#   Localhost only; on the public website there is no such server and the
#   dictionary is read-only (it is still read, from the file itself).
# - THE FILE KEEPS ITS HOUSE STYLE. It is written by hand as often as by the
#   app, so every write puts it back exactly the way it is laid out by hand:
#   four-space indents, the keys of each object padded so their colons line
#   up, a blank line between the top-level blocks, and one word to a line.
#   A document that round-trips through here is byte-identical, so the first
#   Add never rewrites the whole file in git.
# - ONE WORD AT A TIME, AND CHECKED. A word is letters and digits (any
#   alphabet), with an apostrophe inside it if it needs one - the same
#   definition of a word the app's spell check reads text with - at most
#   MAX_WORD_LENGTH long and with a letter in it. Anything else is refused:
#   a request can never write a sentence, a path or markup into the file.
# - NOTHING IS LOST. The file is read fresh from disk for every change, so a
#   word Adam typed in by hand a moment ago is kept. The change goes to a
#   temporary file beside it that is then moved over the old one
#   (os.replace), so a crash mid-write leaves the old dictionary whole. A word
#   the app adds goes into the AddedInTheApp group, which is kept in
#   alphabetical order; a word already in ANY group is not added twice.
#   Remove takes a word out of whichever groups hold it.
# - A BROKEN FILE IS NEVER WRITTEN OVER, AND SAYS WHERE IT IS BROKEN. A hand
#   edit that leaves a comma out makes the file unreadable; both routes then
#   answer 500 with unreadable: true and the line and column to look at, and
#   no change is written until it is put right - a rewrite from what could be
#   read would throw the rest of the file away. A byte order mark, which some
#   Windows editors put at the front of a file they save, is read past.
#
# ROUTES:
#   GET  /api/valevision/user-config/spellings    { status, writable, document }
#   POST /api/valevision/user-config/spellings    { action : 'add' | 'remove', word }
#                                                 -> { status, added | removed, word, document }
#   Either, with the file broken:                 500 { error, unreadable : true }
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Ported from   : TrueVision3D's local server, na-apps/ProjectVision__TrueVisionUserConfig__Api__.py
# - Source version: 1.0.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at HEAD b2aa9151)
# - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1
# - Parity        : adapted - TrueVision's routes, word rule, house-style writer and answers, so a dictionary
#                   written by either app reads and round-trips in the other once its key prefix is swapped
# - Divergences   :
#   - Route /api/valevision/user-config/spellings; blueprint valevision_user_config_api, registered by
#     WebApps/ValeVisionGallery/server.py (TrueVision: /api/truevision/user-config/spellings, registered by
#     na-apps/ProjectVision__LocalServer__Main__.py).
#   - The folder is WebApps/ValeVision3D/50__ValeVision__UserConfig/ and the file ValeVision__UserSpellings__.json;
#     its keys are prefixed ValeVision__UserSpellings__ and the app's group is titled 'Added in ValeVision'
#     (K1 DR-20; TrueVision reads its own prefix in code, so ValeVision carries this seam, K1 DR-42).
#   - Rebased on Server__ValeVisionShared__Lib__.py: write_text_atomic is the library's, exported here under
#     TrueVision's name (a refused move is retried for about a second and a half before the file is written in
#     place, and the temporary file is named by tempfile, so two requests never share one); the never-failing log,
#     the clock and the unreadable-file message are the library's too.
# - Back-port     : none.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 06-Oct-2026 - Version 1.2.0
# - Add / remove holds Na__Library__Locked on the dictionary across processes (two gunicorn
#   workers): two words added at once both stay. The missing-folder message names the real folder.
#
# 06-Oct-2026 - Version 1.1.0
# - Moved into Api__ValeVision3D for app.valegardenhouses.com: the dictionary is the user-data folder
#   Vale__ValeVision3D/50__UserData__SpellCheckDictionary (nginx never serves it; GET here does); a write
#   needs a signed-in user at the authoring level (AppAdmin). Routes and behaviour unchanged.
#
# 22-Sep-2026 - Version 1.0.0
# - Initial implementation: the spelling dictionary's read, add and remove,
#   the house-style writer, the atomic write, and a broken file reported by
#   line and column rather than written over (TrueVision3D v2.144.0).
#
# =============================================================================


# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import os
import re
import json
import traceback
import unicodedata

from flask import Blueprint, jsonify, request

import ValeVision3D__Api__Core__ as vv_shared                     # <-- ValeVision3D's shared server helpers: the atomic write, the log, the clock
from ValeShared__Auth__ import Na__Auth__Require                    # <-- Writes need the authoring level (vv_shared.AUTHOR_LEVEL)
from ValeShared__Library__ import Na__Library__Locked               # <-- One writer at a time across every worker

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

VALEVISION_APP_DIR      = str(vv_shared.APP_DIR)                                # <-- Vale__ValeVision3D in the mirror (/srv/vale/Vale__ValeVision3D)
USER_CONFIG_DIR         = os.path.join(VALEVISION_APP_DIR, '50__UserData__SpellCheckDictionary')    # <-- User data: nginx never serves it; this API does

SPELLINGS_FILE_NAME     = 'ValeVision__UserSpellings__.json'
KEY_PREFIX              = 'ValeVision__UserSpellings__'
KEY_META                = KEY_PREFIX + 'Meta'
KEY_UPDATED             = KEY_PREFIX + 'UpdatedIso'
KEY_GROUPS              = KEY_PREFIX + 'Groups'

APP_GROUP_KEY           = 'AddedInTheApp'                            # <-- The one group the app writes into
APP_GROUP_TITLE         = 'Added in ValeVision'
APP_GROUP_NOTE          = ('Words added from a spell-checked box with Add to Dictionary. The app keeps this group '
                           'in alphabetical order and only ever adds here; move a word into a group above whenever you like.')

MAX_WORD_LENGTH         = 60
MAX_BODY_BYTES          = 4096                                       # <-- A word is a few bytes; this only stops a runaway request
WORD_PATTERN            = re.compile(r"^[^\W_]+(?:['’][^\W_]+)*$")   # <-- Letters and digits, an apostrophe only inside: the app's own word
ACTIONS                 = frozenset({'add', 'remove'})
UNREADABLE_ERRORS       = (json.JSONDecodeError, UnicodeDecodeError)  # <-- A file edited by hand into something that is not JSON, or not UTF-8

INDENT                  = '    '

valevision_user_config_api = Blueprint('valevision_user_config_api', __name__)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The House-Style Writer
# -----------------------------------------------------------------------------

def _scalar(value):
    """One JSON value that is not an object or an array, as the file writes it."""
    return json.dumps(value, ensure_ascii=False)


def _format_value(value, depth):
    """A value at an indent depth: objects and arrays open onto their own lines."""
    if isinstance(value, dict):
        return _format_object(value, depth)
    if isinstance(value, list):
        return _format_array(value, depth)
    return _scalar(value)


def _format_object(obj, depth):
    """
    A nested object: one key to a line, each key padded so the colons line
    up - the way every hand-written ValeVision config is laid out.
    """
    if not obj:
        return '{}'
    pad    = INDENT * (depth + 1)
    width  = max(len(_scalar(str(key))) for key in obj.keys())
    lines  = []
    for key, value in obj.items():
        quoted = _scalar(str(key))
        lines.append(f'{pad}{quoted}{" " * (width - len(quoted))} : {_format_value(value, depth + 1)}')
    return '{\n' + ',\n'.join(lines) + '\n' + (INDENT * depth) + '}'


def _format_array(items, depth):
    """An array: empty on one line, otherwise one item to a line."""
    if not items:
        return '[]'
    pad = INDENT * (depth + 1)
    return '[\n' + ',\n'.join(pad + _format_value(item, depth + 1) for item in items) + '\n' + (INDENT * depth) + ']'


def dump_house_style(document):
    """
    The whole document as text. The top level is a list of blocks, each key
    written unpadded with a blank line between them, as the hand-written
    index and config files are; everything below takes the padded form.
    """
    blocks = [f'{INDENT}{_scalar(str(key))}: {_format_value(value, 1)}' for key, value in document.items()]
    return '{\n' + ',\n\n'.join(blocks) + '\n}\n'

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Reading and Writing the File
# -----------------------------------------------------------------------------

_log              = vv_shared.log                                    # <-- A line in the server's output that can never fail the request it describes
_now_iso          = vv_shared.now_iso                                # <-- The current time as the app writes it: UTC, milliseconds, Z
write_text_atomic = vv_shared.write_text_atomic                      # <-- TrueVision's name: temporary file, flushed, moved over the target; in place where the move is refused


def _spellings_path():
    """Where the dictionary lives."""
    return os.path.join(USER_CONFIG_DIR, SPELLINGS_FILE_NAME)


def _read_document():
    """
    The dictionary as it is on disk now, or None when it is missing or not a
    JSON object. A file that is not JSON, or not UTF-8, raises one of
    UNREADABLE_ERRORS for the route to explain.
    """
    try:
        with open(_spellings_path(), 'r', encoding='utf-8-sig') as file_handle:   # <-- -sig: a byte order mark a Windows editor saved is read past, not refused
            data = json.load(file_handle)
        return data if isinstance(data, dict) else None
    except FileNotFoundError:
        return None


def _unreadable_message(error):
    """Where a file edited by hand stopped being readable, so it can be found and put right."""
    return vv_shared.unreadable_message(SPELLINGS_FILE_NAME, error)


def _write_document(document):
    """Stamp the dictionary and write it in the house style."""
    document[KEY_UPDATED] = _now_iso()
    write_text_atomic(_spellings_path(), dump_house_style(document))

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Words and Groups
# -----------------------------------------------------------------------------

def clean_word(raw):
    """
    The word as it will be stored, or None when it is not one word: NFC,
    trimmed, a curly apostrophe kept as typed, letters and digits with an
    apostrophe only inside, a letter somewhere, at most MAX_WORD_LENGTH.
    """
    if not isinstance(raw, str):
        return None
    word = unicodedata.normalize('NFC', raw.strip())
    if not word or len(word) > MAX_WORD_LENGTH:
        return None
    if not WORD_PATTERN.match(word):
        return None
    if not any(character.isalpha() for character in word):
        return None
    return word


def _match_key(word):
    """How two spellings are compared: case and the apostrophe's shape set aside."""
    return unicodedata.normalize('NFC', word).replace('’', "'").casefold()


def _groups(document):
    """The groups list, made present and made a list of objects."""
    groups = document.get(KEY_GROUPS)
    if not isinstance(groups, list):
        groups = []
        document[KEY_GROUPS] = groups
    return [group for group in groups if isinstance(group, dict)]


def _words_of(group):
    """A group's words list, made present."""
    words = group.get('Group__Words')
    if not isinstance(words, list):
        words = []
        group['Group__Words'] = words
    return words


def _find(document, word):
    """Every (group, index) holding the word, in any case."""
    key   = _match_key(word)
    found = []
    for group in _groups(document):
        for index, entry in enumerate(_words_of(group)):
            if isinstance(entry, str) and _match_key(entry) == key:
                found.append((group, index))
    return found


def _app_group(document):
    """The group the app adds to, made when the file has none: always last, where the app's own words belong."""
    for group in _groups(document):
        if group.get('Group__Key') == APP_GROUP_KEY:
            return group
    group = {
        'Group__Key'   : APP_GROUP_KEY,
        'Group__Title' : APP_GROUP_TITLE,
        'Group__Note'  : APP_GROUP_NOTE,
        'Group__Words' : []
    }
    document[KEY_GROUPS].append(group)
    return group


def add_word(document, word):
    """Add a clean word to the app's group unless a group has it already. True when it was added."""
    if _find(document, word):
        return False
    _groups(document)                                                # <-- Makes the groups list present first
    group = _app_group(document)
    words = _words_of(group)
    words.append(word)
    words.sort(key=lambda entry: (_match_key(entry) if isinstance(entry, str) else '', entry if isinstance(entry, str) else ''))
    return True


def remove_word(document, word):
    """Take a word out of every group that holds it, in any case. How many were taken out."""
    found = _find(document, word)
    for group, index in sorted(found, key=lambda pair: pair[1], reverse=True):
        del _words_of(group)[index]
    return len(found)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Route Handlers
# -----------------------------------------------------------------------------

@valevision_user_config_api.route('/api/valevision/user-config/spellings', methods=['GET'])
def spellings_read():
    """The dictionary as it is on disk, and whether this server can write it."""
    try:
        document = _read_document()
    except UNREADABLE_ERRORS as error:
        message = _unreadable_message(error)
        _log(f'[UserConfig] {message}')
        return jsonify({'error': message, 'unreadable': True}), 500
    except Exception as error:
        traceback.print_exc()
        return jsonify({'error': f'The spelling dictionary could not be read: {type(error).__name__}'}), 500

    return jsonify({
        'status'   : 'ok',
        'writable' : os.path.isdir(USER_CONFIG_DIR),
        'document' : document
    })


@valevision_user_config_api.route('/api/valevision/user-config/spellings', methods=['POST'])
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def spellings_change():
    """Add one word to the dictionary, or take one out."""
    if request.content_length is not None and request.content_length > MAX_BODY_BYTES:
        return jsonify({'error': 'The request is too large'}), 413

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({'error': 'Request body must be a JSON object'}), 400

    action = body.get('action')
    if action not in ACTIONS:
        return jsonify({'error': f'Unknown action "{action}": add or remove'}), 400

    word = clean_word(body.get('word'))
    if not word:
        return jsonify({'error': f'"{body.get("word")}" is not one word: letters and digits, with an apostrophe inside it if needed, up to {MAX_WORD_LENGTH} characters'}), 400

    if not os.path.isdir(USER_CONFIG_DIR):
        return jsonify({'error': f'The user config folder {os.path.basename(USER_CONFIG_DIR)} is missing'}), 500

    try:
        with Na__Library__Locked(_spellings_path()):                    # <-- Read, change and write as one step
            document = _read_document()
            if document is None:
                return jsonify({'error': f'{SPELLINGS_FILE_NAME} is missing or is not a JSON object - restore it before adding words'}), 500

            if action == 'add':
                changed = add_word(document, word)
                if changed:
                    _write_document(document)
            else:
                removed = remove_word(document, word)
                if removed:
                    _write_document(document)
    except UNREADABLE_ERRORS as error:
        message = f'{_unreadable_message(error)} - nothing was written'
        _log(f'[UserConfig] {message}')
        return jsonify({'error': message, 'unreadable': True}), 500
    except Exception as error:
        traceback.print_exc()
        return jsonify({'error': f'The spelling dictionary could not be written: {type(error).__name__}'}), 500

    if action == 'add':
        if changed:
            _log(f'[UserConfig] Added "{word}" to the spelling dictionary')
        return jsonify({'status': 'ok', 'added': changed, 'word': word, 'document': document})
    if removed:
        _log(f'[UserConfig] Removed "{word}" from the spelling dictionary')
    return jsonify({'status': 'ok', 'removed': removed, 'word': word, 'document': document})

# endregion -------------------------------------------------------------------
