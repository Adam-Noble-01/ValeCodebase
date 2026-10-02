"""
W0-19 scratch: build candidate_server.py from the live WCP/server.py (W0-18's version, sha1 7874094f...), adding the
published-documents and statement blueprint registrations and their header lines. Reads bytes, keeps the file's own
CRLF line endings and UTF-8 text byte for byte outside the inserts. Writes ONLY the scratch candidate (and a copy of
the original); the live file is swapped later by deploy_server.py after validation.
"""
import hashlib
import os
import sys

LIVE      = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\server.py'
HERE      = os.path.dirname(os.path.abspath(__file__))
ORIGINAL  = os.path.join(HERE, 'original_server.py')
CANDIDATE = os.path.join(HERE, 'candidate_server.py')
EXPECTED  = '7874094f'                                                   # <-- W0-18's post-swap server.py

data = open(LIVE, 'rb').read()
sha1 = hashlib.sha1(data).hexdigest()
if not sha1.startswith(EXPECTED):
    print('STOP: live server.py is', sha1, 'not W0-18\'s', EXPECTED)
    sys.exit(2)
assert not data.startswith(b'\xef\xbb\xbf')
assert data.count(b'\r\n') == data.count(b'\n'), 'server.py is not pure CRLF'
text = data.decode('utf-8')
EOL = '\r\n'


def crlf(block):
    return block.replace('\n', EOL)


def insert_after(source, anchor, addition):
    anchor = crlf(anchor)
    count = source.count(anchor)
    if count != 1:
        print('STOP: anchor found', count, 'times:', anchor[:80])
        sys.exit(3)
    return source.replace(anchor, anchor + crlf(addition))


def endpoint(method, route, words, more=()):
    """One API ENDPOINTS line in the header's columns: the colon at column 48, wrapped lines at column 50."""
    line = ('# - %-4s %-39s: %s\n' % (method, route, words))
    for extra in more:
        line += '#' + ' ' * 49 + extra + '\n'
    return line


def comment_at_79(code, comment):
    return code + ' ' * max(1, 79 - len(code)) + '# <-- ' + comment + '\n'


# 1. DESCRIPTION: one bullet after W0-18's
text = insert_after(text,
    "# - Serves the ValeVision3D Layout Editor's sheet pictures (filed by document\n"
    "#   id under each project's 05__Layout__DrawingDocs__Images folder, archived\n"
    "#   never deleted) and its spelling dictionary through the blueprints beside\n"
    "#   it, ported from TrueVision3D's local server\n",
    "# - Files the ValeVision3D Layout Editor's published documents (each project's\n"
    "#   06__Layout__PublishedDocuments: sniffed atomic writes, a revision archived\n"
    "#   to 00__Archive__Revisions and never written over, a prune that touches one\n"
    "#   document) and its statement documents (10__StatementDocs: fenced, pictures\n"
    "#   never written over, deletes quarantined) through the blueprints beside it,\n"
    "#   ported from TrueVision3D's local server; a published or statement file that\n"
    "#   is not there answers a JSON 404, never the index page\n")

# 2. API ENDPOINTS: the twelve new routes after W0-18's spellings lines
text = insert_after(text,
    "# - POST /api/valevision/user-config/spellings  : Add a word to the dictionary or take one out { action : 'add' | 'remove', word }\n",
    endpoint('GET', '/api/valevision/published/list', "Every published file under a project's 06__Layout__PublishedDocuments, or one",
             ["document's (Server__ValeVisionPublished__Api__.py)"]) +
    endpoint('GET', '/api/valevision/published/file', 'A published JSON file read fresh (manifest, index); a JSON 404 when not published') +
    endpoint('POST', '/api/valevision/published/file', 'Write one baked file (raw bytes, sniffed; PUT too), atomically; never into the archive') +
    endpoint('POST', '/api/valevision/published/archive', 'Zip a document folder into 00__Archive__Revisions (never over an older zip), then remove it') +
    endpoint('POST', '/api/valevision/published/prune', 'Delete the files of ONE document its new manifest no longer names') +
    endpoint('GET', '/api/valevision/statements/tree', "Every file under a project's 10__StatementDocs (Server__ValeVisionStatements__Api__.py)") +
    endpoint('GET', '/api/valevision/statements/file', 'One statement file as stored, with Last-Modified; a JSON 404 { missing } when not there') +
    endpoint('POST', '/api/valevision/statements/file', "Write a statement's markdown or HTML { path, text }, keeping its line endings") +
    endpoint('POST', '/api/valevision/statements/image', 'Store a dropped picture { path, dataBase64 }, never over another (__02, __03 ...)') +
    endpoint('POST', '/api/valevision/statements/folder', 'Make a folder inside 10__StatementDocs') +
    endpoint('POST', '/api/valevision/statements/move', 'Move or rename inside 10__StatementDocs, never over something already there') +
    endpoint('POST', '/api/valevision/statements/delete', 'Move a file or folder into 00__Deleted__Quarantine { path, confirm : path }; never',
             ['unlinked']))

# 3. The registration, after W0-18's registration block
text = insert_after(text,
    "app.register_blueprint(valevision_user_config_api)                             # <-- /api/valevision/user-config/spellings\n"
    "# ------------------------------------------------------------\n",
    "\n"
    "\n"
    "# INITIALIZATION | Register the ValeVision3D Published Documents and Statement Routes\n"
    "# ------------------------------------------------------------\n"
    "# Ported from TrueVision3D's local server and built on the shared library\n"
    "# above: each project's published drawings, filed under its\n"
    "# 06__Layout__PublishedDocuments folder (00__Archive__Revisions local only),\n"
    "# and its statement documents under 10__StatementDocs (K1 DR-29). A missing\n"
    "# published or statement file answers a JSON 404 through these routes, never\n"
    "# through the static route below. Their specific routes win over the JSON 404\n"
    "# for unknown /api/ routes below.\n" +
    comment_at_79('from Server__ValeVisionPublished__Api__ import valevision_published_api', 'ValeVision3D Layout Editor published documents') +
    comment_at_79('from Server__ValeVisionStatements__Api__ import valevision_statements_api', 'ValeVision3D Statement Writer files (the tab is switched off, K1 DR-10)') +
    comment_at_79('app.register_blueprint(valevision_published_api)', '/api/valevision/published/{file,list,archive,prune}') +
    comment_at_79('app.register_blueprint(valevision_statements_api)', '/api/valevision/statements/{tree,file,image,folder,move,delete}') +
    "# ------------------------------------------------------------\n")

out = text.encode('utf-8')
assert out.count(b'\r\n') == out.count(b'\n'), 'candidate is not pure CRLF'
with open(ORIGINAL, 'wb') as handle:
    handle.write(data)
with open(CANDIDATE, 'wb') as handle:
    handle.write(out)
print('original ', len(data), 'bytes sha1', sha1[:8], data.count(b'\n'), 'lines')
print('candidate', len(out), 'bytes sha1', hashlib.sha1(out).hexdigest()[:8], out.count(b'\n'), 'lines (+%d)' % (out.count(b'\n') - data.count(b'\n')))
