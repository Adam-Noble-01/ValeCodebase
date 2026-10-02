"""
W0-18 scratch: build candidate_server.py from the live WCP/server.py (W0-09's version, sha1 79b71065...), adding
the sheet-images and user-config blueprint registrations and their header lines. Reads bytes, keeps the file's
own CRLF line endings and UTF-8 text byte for byte outside the inserts. Writes ONLY the scratch candidate; the
live file is swapped later by deploy_server.py after validation.
"""
import hashlib
import os
import sys

LIVE      = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\server.py'
HERE      = os.path.dirname(os.path.abspath(__file__))
ORIGINAL  = os.path.join(HERE, 'original_server.py')
CANDIDATE = os.path.join(HERE, 'candidate_server.py')
EXPECTED  = '79b71065'                                                   # <-- W0-09's post-swap server.py

data = open(LIVE, 'rb').read()
sha1 = hashlib.sha1(data).hexdigest()
if not sha1.startswith(EXPECTED):
    print('STOP: live server.py is', sha1, 'not W0-09\'s', EXPECTED)
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


# 1. DESCRIPTION: one bullet after W0-09's last one
text = insert_after(text,
    "# - A project folder id never resolves outside Projects/ (no '.' or '..'\n"
    "#   segment, real path checked: 400 otherwise), and an unknown /api/ route\n"
    "#   answers a JSON 404, never index.html\n",
    "# - Serves the ValeVision3D Layout Editor's sheet pictures (filed by document\n"
    "#   id under each project's 05__Layout__DrawingDocs__Images folder, archived\n"
    "#   never deleted) and its spelling dictionary through the blueprints beside\n"
    "#   it, ported from TrueVision3D's local server\n")

# 2. API ENDPOINTS: the five new routes after the scrapbook lines
text = insert_after(text,
    "# - POST /api/valevision/scrapbook/items/delete : Move a Custom Scrapbook item file into its quarantine folder\n",
    "# - GET  /api/valevision/sheet-images/list      : The pictures on a project's sheets under its 05__Layout__DrawingDocs__Images\n"
    "#                                                 folder, the archive marked (Server__ValeVisionSheetImages__Api__.py)\n"
    "# - POST /api/valevision/sheet-images/upload    : Store one picture (raw bytes; PUT too), named by its content, in its document-id folder\n"
    "# - POST /api/valevision/sheet-images/reconcile : File each picture the drawings use under its document id; archive the rest, never delete\n"
    "# - GET  /api/valevision/user-config/spellings  : The spelling dictionary, ValeVision3D/50__ValeVision__UserConfig/ValeVision__UserSpellings__.json\n"
    "#                                                 (Server__ValeVisionUserConfig__Api__.py)\n"
    "# - POST /api/valevision/user-config/spellings  : Add a word to the dictionary or take one out { action : 'add' | 'remove', word }\n")

# 3. The registration, after the shared library's import block
text = insert_after(text,
    "import Server__ValeVisionShared__Lib__ as vv_shared                      # <-- ValeVision3D Flask persistence core\n"
    "# ------------------------------------------------------------\n",
    "\n"
    "\n"
    "# INITIALIZATION | Register the ValeVision3D Sheet Images and User Config Routes\n"
    "# ------------------------------------------------------------\n"
    "# Ported from TrueVision3D's local server and built on the shared library\n"
    "# above: the pictures placed on Layout Editor sheets, filed by document id\n"
    "# under each project's 05__Layout__DrawingDocs__Images folder (K1 DR-29),\n"
    "# and the spelling dictionary in ../ValeVision3D/50__ValeVision__UserConfig/\n"
    "# (K1 DR-20). Their specific routes win over the JSON 404 for unknown /api/\n"
    "# routes below.\n"
    "from Server__ValeVisionSheetImages__Api__ import valevision_sheet_images_api   # <-- ValeVision3D Layout Editor pictures, filed by document id\n"
    "from Server__ValeVisionUserConfig__Api__ import valevision_user_config_api     # <-- ValeVision3D user config: the spelling dictionary\n"
    "app.register_blueprint(valevision_sheet_images_api)                            # <-- /api/valevision/sheet-images/{list,upload,reconcile}\n"
    "app.register_blueprint(valevision_user_config_api)                             # <-- /api/valevision/user-config/spellings\n"
    "# ------------------------------------------------------------\n")

out = text.encode('utf-8')
assert out.count(b'\r\n') == out.count(b'\n'), 'candidate is not pure CRLF'
with open(ORIGINAL, 'wb') as handle:
    handle.write(data)
with open(CANDIDATE, 'wb') as handle:
    handle.write(out)
print('original ', len(data), 'bytes sha1', sha1[:8], data.count(b'\n'), 'lines')
print('candidate', len(out), 'bytes sha1', hashlib.sha1(out).hexdigest()[:8], out.count(b'\n'), 'lines (+%d)' % (out.count(b'\n') - data.count(b'\n')))
