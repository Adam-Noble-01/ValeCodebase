#!/usr/bin/env python3
# =============================================================================
# VALEVISION3D - TEST - USER SPELLINGS API
# =============================================================================
#
# FILE       : Na__Test__UserSpellingsApi__.test.py
# MODULE     : UserSpellingsApiTest
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Prove the spelling dictionary's read, add and remove routes, the house style they write in, and everything they must refuse
# CREATED    : 22-Sep-2026
#
# DESCRIPTION:
# - Drives WebApps/Whitecardopedia/Server__ValeVisionUserConfig__Api__.py
#   through Flask's test client, on its own and as server.py registers it. No
#   server is started and no port is used.
# - THE REAL DICTIONARY IS NEVER WRITTEN. The blueprint reads its folder from
#   a module constant at call time, so the test points that constant at a
#   temporary folder holding a COPY of the shipped dictionary before the
#   first request, and checks at the end that the shipped file is untouched.
# - THE SHIPPED FILE IS CHECKED TOO: it parses, it round-trips through the
#   house-style writer byte for byte (so the first Add rewrites one line of
#   it, not all of them), every entry is made of words the app reads back,
#   and no word is listed twice.
# - A FILE BROKEN BY A HAND EDIT - not JSON, or not UTF-8 - is never written
#   over, and both routes say it is unreadable and where; one saved with a
#   byte order mark is read, and written back without it.
# - The atomic write: a write that fails part way leaves the old file whole.
# - VALEVISION3D: the shipped dictionary is the app root's
#   50__ValeVision__UserConfig/ValeVision__UserSpellings__.json, its keys
#   prefixed ValeVision__UserSpellings__, its app group 'Added in ValeVision',
#   and it names no Noble Architecture app; server.py serves the route and a
#   read answers status ok; a word of the Vale software group is not added
#   twice; an add and then a remove of one word leave the file byte for byte
#   as it was, but for its stamp.
#
# USAGE:
#     python 80__Testing__PrototypeEnvironment/Na__Test__UserSpellingsApi__.test.py
#
#   Exit 0 = every check passed. Exit 1 = at least one did not. Needs flask:
#   the copy bundled with Whitecardopedia's server is used when there is one.
#   Writes no byte-code: the repository tracks Whitecardopedia's __pycache__
#   and the bundled dependencies' __pycache__ files.
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__UserSpellingsApi__.test.py
# - Source version: 1.0.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at HEAD b2aa9151)
# - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W0-18}}
# - Parity        : adapted - every TrueVision check is kept, in its order, against ValeVision's blueprint and
#                   dictionary
# - Divergences   :
#   - Drives WCP/Server__ValeVisionUserConfig__Api__.py on /api/valevision/user-config/spellings (TrueVision:
#     na-apps/ProjectVision__TrueVisionUserConfig__Api__.py, /api/truevision/user-config/spellings), with the flask
#     bundled beside server.py; sys.dont_write_bytecode is set before anything is imported.
#   - The console that cannot print a word is the shared library's: the blueprint prints through its log.
#   - ValeVision checks follow TrueVision's (the dictionary's place, prefix and Vale software group, the route as
#     server.py serves it, the add-then-remove round trip); check() falls back to ASCII when the console cannot
#     print a detail.
# - Back-port     : none.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 22-Sep-2026 - Version 1.0.0
# - Written with the spelling dictionary (TrueVision3D v2.144.0).
#
# =============================================================================

import sys
sys.dont_write_bytecode = True                                      # <-- Whitecardopedia's __pycache__ is tracked; a test must not touch it
import os
import re
import json
import shutil
import hashlib
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR    = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))                               # <-- WebApps/ValeVision3D
SERVER_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', 'Whitecardopedia'))   # <-- The folder server.py and the blueprint are in
BUNDLED    = os.path.join(SERVER_DIR, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
if os.path.exists(BUNDLED):
    sys.path.insert(0, BUNDLED)                                     # <-- The same flask server.py itself runs on
sys.path.insert(0, SERVER_DIR)

import Server__ValeVisionUserConfig__Api__ as api                  # noqa: E402
import Server__ValeVisionShared__Lib__ as lib                      # noqa: E402
from flask import Flask                                             # noqa: E402

ROUTE      = '/api/valevision/user-config/spellings'
SHIPPED    = os.path.join(api.USER_CONFIG_DIR, api.SPELLINGS_FILE_NAME)
WORD_READ  = re.compile(r"[^\W_]+(?:['’][^\W_]+)*")           # <-- The app's tokeniser, as Python writes it

failed = 0


def check(name, passed, detail=''):
    global failed
    if not passed:
        failed += 1
    line = ('  PASS  ' if passed else '  FAIL  ') + name + (('   ' + str(detail)) if (detail and not passed) else '')
    try:
        print(line)
    except UnicodeEncodeError:
        print(line.encode('ascii', 'backslashreplace').decode('ascii'))


def digest(path):
    with open(path, 'rb') as handle:
        return hashlib.sha256(handle.read()).hexdigest()


print('\nValeVision3D - user spellings api\n')

# -----------------------------------------------------------------------------
# THE SHIPPED FILE
# -----------------------------------------------------------------------------
print('  The shipped dictionary')
shipped_hash = digest(SHIPPED)
with open(SHIPPED, encoding='utf-8') as handle:
    shipped_text = handle.read()
shipped = json.loads(shipped_text)
check('it is a JSON object with its Meta, stamp and groups', isinstance(shipped, dict) and api.KEY_META in shipped and api.KEY_UPDATED in shipped and isinstance(shipped.get(api.KEY_GROUPS), list))
check('it round-trips through the house-style writer byte for byte', api.dump_house_style(json.loads(shipped_text)) == shipped_text)
check('the app group is present, last and empty', shipped[api.KEY_GROUPS][-1].get('Group__Key') == api.APP_GROUP_KEY and shipped[api.KEY_GROUPS][-1].get('Group__Words') == [])
bad_parts, seen, twice = [], {}, []
for group in shipped[api.KEY_GROUPS]:
    for entry in group.get('Group__Words', []):
        parts = WORD_READ.findall(entry)
        if not parts or any(api.clean_word(part) != part for part in parts):
            bad_parts.append(entry)
        key = api._match_key(entry)
        if key in seen:
            twice.append(entry)
        seen[key] = entry
check('every entry is made of words the app reads back', not bad_parts, bad_parts)
check('no word is listed twice', not twice, twice)
check('the specifications\' own trade words are in it', all(api._match_key(word) in seen for word in ('rooflight', 'cill', 'monocouche', 'weatherboarding', 'uPVC', 'GFFL')))

print('\n  The shipped dictionary in ValeVision3D')
check('it lives at the app root, in 50__ValeVision__UserConfig/ValeVision__UserSpellings__.json', os.path.normcase(os.path.abspath(SHIPPED)) == os.path.normcase(os.path.join(APP_DIR, '50__ValeVision__UserConfig', 'ValeVision__UserSpellings__.json')), SHIPPED)
check('its keys are ValeVision\'s: Meta, UpdatedIso and Groups prefixed ValeVision__UserSpellings__', list(shipped.keys()) == ['ValeVision__UserSpellings__Meta', 'ValeVision__UserSpellings__UpdatedIso', 'ValeVision__UserSpellings__Groups'], list(shipped.keys()))
check('its Meta names the file it is in', shipped[api.KEY_META].get('Meta__FileName') == api.SPELLINGS_FILE_NAME, shipped[api.KEY_META].get('Meta__FileName'))
check('the app group is titled Added in ValeVision', shipped[api.KEY_GROUPS][-1].get('Group__Title') == 'Added in ValeVision' == api.APP_GROUP_TITLE, shipped[api.KEY_GROUPS][-1].get('Group__Title'))
na_words = [word for word in ('TrueVision', 'PlanVision', 'ProjectVision') if api._match_key(word) in seen]
check('it lists no Noble Architecture app, and the Vale apps instead', not na_words and all(api._match_key(word) in seen for word in ('ValeVision', 'Whitecardopedia')), na_words)
check('nothing in it names TrueVision', 'TrueVision' not in shipped_text and 'ProjectVision' not in shipped_text)
check('the file is UTF-8 with no byte order mark', open(SHIPPED, 'rb').read(3) != b'\xef\xbb\xbf')

# -----------------------------------------------------------------------------
# THE ROUTES, ON A COPY
# -----------------------------------------------------------------------------
real_dir = api.USER_CONFIG_DIR
temp_dir = tempfile.mkdtemp(prefix='na_user_spellings_api_')
shutil.copyfile(SHIPPED, os.path.join(temp_dir, api.SPELLINGS_FILE_NAME))
api.USER_CONFIG_DIR = temp_dir                                      # <-- Read at call time by every route
copy_path = os.path.join(temp_dir, api.SPELLINGS_FILE_NAME)

app = Flask(__name__)
app.register_blueprint(api.valevision_user_config_api)
client = app.test_client()

print('\n  Read')
answer = client.get(ROUTE)
body = answer.get_json()
check('a read answers the document and that it can be written', answer.status_code == 200 and body.get('writable') is True and body.get('document') == shipped, body.get('status'))
check('...and status ok', body.get('status') == 'ok', body.get('status'))

import server as srv                                                # noqa: E402  (the same blueprint module, so the copy is what it reads)
rules = {}
for rule in srv.app.url_map.iter_rules():
    rules.setdefault(str(rule), set()).update(rule.methods)          # <-- The GET and the POST are two rules on one path
check('server.py serves the route, GET and POST', ROUTE in rules and {'GET', 'POST'} <= rules.get(ROUTE, set()), sorted(rules.get(ROUTE, ())))
answer = srv.app.test_client().get(ROUTE)
body = answer.get_json() or {}
check('...and answers { status ok, writable true, document } through server.py', answer.status_code == 200 and body.get('status') == 'ok' and body.get('writable') is True and body.get('document') == shipped, body.get('status'))

print('\n  Add')
before = open(copy_path, encoding='utf-8').read()
answer = client.post(ROUTE, json={'action': 'add', 'word': '  Zeroflex '})
body = answer.get_json()
check('a new word is added, trimmed', answer.status_code == 200 and body.get('added') is True and body.get('word') == 'Zeroflex', body)
after = open(copy_path, encoding='utf-8').read()
on_disk = json.loads(after)
app_words = on_disk[api.KEY_GROUPS][-1]['Group__Words']
check('it lands in the app group', app_words == ['Zeroflex'], app_words)
check('the file stays in the house style', api.dump_house_style(json.loads(after)) == after)
changed_lines = [line for line in after.splitlines() if line not in before.splitlines()]
check('only the new word and the stamp are new lines in the file', sorted(changed_lines, key=len) == sorted([line for line in changed_lines if 'Zeroflex' in line or api.KEY_UPDATED in line], key=len) and len(changed_lines) == 2, changed_lines)
check('the stamp moved on', on_disk[api.KEY_UPDATED] != shipped[api.KEY_UPDATED])

client.post(ROUTE, json={'action': 'add', 'word': 'aardvarkboard'})
client.post(ROUTE, json={'action': 'add', 'word': 'Mumbleply'})
app_words = json.loads(open(copy_path, encoding='utf-8').read())[api.KEY_GROUPS][-1]['Group__Words']
check('the app group is kept in alphabetical order, whatever the case', app_words == ['aardvarkboard', 'Mumbleply', 'Zeroflex'], app_words)

stamp = json.loads(open(copy_path, encoding='utf-8').read())[api.KEY_UPDATED]
answer = client.post(ROUTE, json={'action': 'add', 'word': 'VELUX'})
body = answer.get_json()
check('a word another group already has, in any case, is not added twice', answer.status_code == 200 and body.get('added') is False, body)
check('...and the file is not rewritten', json.loads(open(copy_path, encoding='utf-8').read())[api.KEY_UPDATED] == stamp)
answer = client.post(ROUTE, json={'action': 'add', 'word': 'Schlüter'})
check('an accented word the file has is found as it is', answer.get_json().get('added') is False)
answer = client.post(ROUTE, json={'action': 'add', 'word': 'O’Brien'})
check('an apostrophe inside a word is taken, as typed', answer.status_code == 200 and answer.get_json().get('added') is True and answer.get_json().get('word') == 'O’Brien', answer.get_json())
answer = client.post(ROUTE, json={'action': 'add', 'word': "o'brien"})
check('...and the straight apostrophe is the same word', answer.get_json().get('added') is False, answer.get_json())
def refusing_print(*args, **kwargs):
    raise UnicodeEncodeError('cp1252', 'α', 0, 1, 'character maps to <undefined>')
lib.print = refusing_print                                          # <-- A module global shadows the builtin: the console that cannot print a Greek letter (the blueprint prints through the library's log)
try:
    answer = client.post(ROUTE, json={'action': 'add', 'word': 'αλφα'})
finally:
    del lib.print
check('a console that cannot print the word never fails the add', answer.status_code == 200 and answer.get_json().get('added') is True, answer.get_json())
stamp = json.loads(open(copy_path, encoding='utf-8').read())[api.KEY_UPDATED]
answer = client.post(ROUTE, json={'action': 'add', 'word': 'valevision'})
check('a word of the Vale software group, in any case, is not added twice either', answer.status_code == 200 and answer.get_json().get('added') is False and json.loads(open(copy_path, encoding='utf-8').read())[api.KEY_UPDATED] == stamp, answer.get_json())

print('\n  Remove')
answer = client.post(ROUTE, json={'action': 'remove', 'word': 'zeroflex'})
body = answer.get_json()
check('a word is removed in any case', answer.status_code == 200 and body.get('removed') == 1, body)
app_words = json.loads(open(copy_path, encoding='utf-8').read())[api.KEY_GROUPS][-1]['Group__Words']
check('...and is gone from the file', 'Zeroflex' not in app_words, app_words)
answer = client.post(ROUTE, json={'action': 'remove', 'word': 'Kingspan'})
groups = json.loads(open(copy_path, encoding='utf-8').read())[api.KEY_GROUPS]
check('a word in a hand-made group is removed from that group', answer.get_json().get('removed') == 1 and 'Kingspan' not in groups[0]['Group__Words'])
answer = client.post(ROUTE, json={'action': 'remove', 'word': 'Farrow'})
check('a word that is only part of an entry (Farrow & Ball) is not removed', answer.status_code == 200 and answer.get_json().get('removed') == 0, answer.get_json())
answer = client.post(ROUTE, json={'action': 'remove', 'word': 'Nonesuchword'})
check('removing a word the file does not have changes nothing', answer.status_code == 200 and answer.get_json().get('removed') == 0)

print('\n  Refusals')
for name, payload in (
    ('two words are refused',                     {'action': 'add', 'word': 'Farrow Ball'}),
    ('a path is refused',                         {'action': 'add', 'word': '../etc/passwd'}),
    ('markup is refused',                         {'action': 'add', 'word': '<b>bold</b>'}),
    ('digits alone are refused',                  {'action': 'add', 'word': '1500'}),
    ('a leading apostrophe is refused',           {'action': 'add', 'word': "'tis"}),
    ('a hyphenated pair is refused (add each)',   {'action': 'add', 'word': 'Jeld-Wen'}),
    ('an empty word is refused',                  {'action': 'add', 'word': '   '}),
    ('a word that is not text is refused',        {'action': 'add', 'word': 42}),
    ('a word too long is refused',                {'action': 'add', 'word': 'a' * (api.MAX_WORD_LENGTH + 1)}),
    ('an unknown action is refused',              {'action': 'delete', 'word': 'Velux'}),
):
    answer = client.post(ROUTE, json=payload)
    check(name, answer.status_code == 400 and 'error' in (answer.get_json() or {}), answer.get_json())
check('a body that is not a JSON object is refused', client.post(ROUTE, data='word=Velux', content_type='text/plain').status_code == 400)
check('a word with digits and letters is a word (K15)', api.clean_word('K15') == 'K15')

print('\n  A broken or missing file')
with open(copy_path, 'w', encoding='utf-8') as handle:
    handle.write('{ "not": "finished"')
answer = client.post(ROUTE, json={'action': 'add', 'word': 'Velux'})
body = answer.get_json() or {}
check('a file that is not JSON is never overwritten by an add', answer.status_code == 500 and open(copy_path, encoding='utf-8').read() == '{ "not": "finished"', body)
check('...and the answer says so: unreadable, the line and column, nothing written', body.get('unreadable') is True and 'is not valid JSON: line 1, column 20' in body.get('error', '') and 'nothing was written' in body.get('error', ''), body)
answer = client.get(ROUTE)
body = answer.get_json() or {}
check('a read of it answers the same, so the app can say where to look', answer.status_code == 500 and body.get('unreadable') is True and 'line 1, column 20' in body.get('error', ''), body)

with open(copy_path, 'wb') as handle:
    handle.write(b'{ "word": "Caf' + bytes([0xE9]) + b'" }')          # <-- Saved as Windows-1252 by a hand editor, not UTF-8
answer = client.get(ROUTE)
body = answer.get_json() or {}
check('a file that is not UTF-8 is unreadable too, and says so', answer.status_code == 500 and body.get('unreadable') is True and 'not UTF-8' in body.get('error', ''), body)

with open(copy_path, 'w', encoding='utf-8-sig') as handle:
    handle.write(shipped_text)
answer = client.get(ROUTE)
check('a file saved with a byte order mark (some Windows editors) is read', answer.status_code == 200 and (answer.get_json() or {}).get('document') == shipped, answer.get_json())
answer = client.post(ROUTE, json={'action': 'add', 'word': 'Zeroflex'})
raw = open(copy_path, 'rb').read()
text = raw.decode('utf-8')
check('...and an add writes it back without the mark, in the house style, the word in', answer.status_code == 200 and raw[:3] != bytes([0xEF, 0xBB, 0xBF]) and '"Zeroflex"' in text and api.dump_house_style(json.loads(text)) == text, answer.get_json())
os.remove(copy_path)
answer = client.post(ROUTE, json={'action': 'add', 'word': 'Velux'})
check('a missing file is reported, not made from nothing', answer.status_code == 500 and not os.path.exists(copy_path), answer.get_json())
answer = client.get(ROUTE)
check('a read of a missing file answers no document', answer.status_code == 200 and answer.get_json().get('document') is None)

print('\n  The atomic write')
target = os.path.join(temp_dir, 'atomic.json')
api.write_text_atomic(target, 'first\n')
check('a write lands', open(target, encoding='utf-8').read() == 'first\n')
check('and leaves no temporary file', [name for name in os.listdir(temp_dir) if name.endswith('.tmp')] == [])
real_replace = os.replace
def refusing_replace(src, dst):
    raise PermissionError('held open by another program')
os.replace = refusing_replace
try:
    api.write_text_atomic(target, 'second\n')
finally:
    os.replace = real_replace
check('where the move is refused the file is still written, in place', open(target, encoding='utf-8').read() == 'second\n')
check('...and the temporary file is cleaned up', [name for name in os.listdir(temp_dir) if name.endswith('.tmp')] == [])

print('\n  An add and a remove, on a fresh copy')
shutil.copyfile(SHIPPED, copy_path)
first_bytes = open(copy_path, 'rb').read()
answer_add    = client.post(ROUTE, json={'action': 'add', 'word': 'Quixotiboard'})
answer_remove = client.post(ROUTE, json={'action': 'remove', 'word': 'Quixotiboard'})
last_bytes    = open(copy_path, 'rb').read()
stamp_line    = re.compile(rb'\n    "' + api.KEY_UPDATED.encode('ascii') + rb'": "[^"]*",\n')
check('an add and then a remove of the same word both land', answer_add.get_json().get('added') is True and answer_remove.get_json().get('removed') == 1, (answer_add.get_json(), answer_remove.get_json()))
check('...and leave the file byte for byte as it was, but for its stamp', last_bytes != first_bytes and stamp_line.sub(b'\n', last_bytes) == stamp_line.sub(b'\n', first_bytes) and len(stamp_line.findall(first_bytes)) == 1, len(last_bytes) - len(first_bytes))

api.USER_CONFIG_DIR = real_dir
shutil.rmtree(temp_dir, ignore_errors=True)
check('the shipped dictionary was never written', digest(SHIPPED) == shipped_hash)

print('\n  ' + ('ALL PASSED' if failed == 0 else f'{failed} FAILED') + '\n')
sys.exit(1 if failed else 0)
