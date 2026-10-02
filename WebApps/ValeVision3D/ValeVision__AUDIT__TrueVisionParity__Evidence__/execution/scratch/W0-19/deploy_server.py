"""
W0-19 scratch: put the validated candidate in place of the live WCP/server.py, atomically, then confirm Adam's
running debug server reloaded, still answers /api/check-localhost and /api/health, still serves W0-18's routes, and
now serves the published and statement blueprints - read-only GETs only, against 2026/3047__Doous, which never make
a folder. On any failure the original bytes go back at once.
Restore only:  python deploy_server.py --restore   (puts back original_server.py, sha1 7874094f - W0-18's version)
"""
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request

LIVE      = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\server.py'
DOOUS     = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Projects\2026\3047__Doous'
HERE      = os.path.dirname(os.path.abspath(__file__))
ORIGINAL  = os.path.join(HERE, 'original_server.py')
CANDIDATE = os.path.join(HERE, 'candidate_server.py')
BASE_URL  = 'http://localhost:8000'
NO_PROXY  = urllib.request.build_opener(urllib.request.ProxyHandler({}))
WATCHED   = ('06__Layout__PublishedDocuments', '10__StatementDocs', '05__Layout__DrawingDocs__Images')


def put_in_place(source_bytes):
    temp = LIVE + '.w019.tmp'                                    # <-- Not *.py: the stat reloader never watches it
    with open(temp, 'wb') as handle:
        handle.write(source_bytes)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp, LIVE)


def get(path, timeout=5):
    try:
        with NO_PROXY.open(BASE_URL + path, timeout=timeout) as response:
            return response.status, response.headers.get('Content-Type', ''), response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get('Content-Type', ''), error.read()


def get_json(path):
    status, content_type, body = get(path)
    return status, (json.loads(body) if 'json' in content_type else None)


def restore(reason):
    put_in_place(original)
    print('FAILED:', reason, '- original server.py bytes RESTORED at', time.strftime('%H:%M:%S'))
    sys.exit(1)


original  = open(ORIGINAL, 'rb').read()
candidate = open(CANDIDATE, 'rb').read()

if '--restore' in sys.argv:
    put_in_place(original)
    print('RESTORED original server.py bytes (sha1 %s)' % hashlib.sha1(original).hexdigest()[:8])
    sys.exit(0)

live_now = open(LIVE, 'rb').read()
if live_now != original:
    print('STOP: the live server.py changed since it was read; nothing written')
    sys.exit(2)
folders_before = {name: os.path.exists(os.path.join(DOOUS, name)) for name in WATCHED}

status, _, _ = get('/api/check-localhost')
assert status == 200, status
put_in_place(candidate)
print('candidate in place at', time.strftime('%H:%M:%S'), 'sha1', hashlib.sha1(candidate).hexdigest()[:8])

deadline = time.time() + 60
listing = None
while time.time() < deadline:
    time.sleep(1.0)
    try:
        status, answer = get_json('/api/valevision/published/list?folder-id=2026/3047__Doous')
    except Exception:
        continue                                                 # <-- Mid-reload: nothing listens for a moment
    if status == 200 and isinstance(answer, dict) and answer.get('root') == '06__Layout__PublishedDocuments':
        listing = answer
        break

try:
    check_status, _, _ = get('/api/check-localhost')
except Exception as error:
    check_status = repr(error)
if check_status != 200:
    restore(f'/api/check-localhost answered {check_status}')
try:
    health_status, health = get_json('/api/health')
except Exception as error:
    restore(f'/api/health failed: {error!r}')
if health_status != 200 or not health or health.get('service') != 'whitecardopedia-local-dev':
    restore(f'/api/health answered {health_status} {health}')
if not listing:
    restore('the published list route never answered 200 (did the reloader pick the change up?)')

results = {}
try:
    results['published list (Doous)']             = (listing.get('status'), len(listing.get('files') or []))
    status, answer = get_json('/api/valevision/statements/tree?folder-id=2026/3047__Doous')
    results['statements tree (Doous)']            = (status, answer)
    if status != 200 or answer.get('status') != 'ok':
        restore(f'the statements tree answered {status} {answer}')
    status, answer = get_json('/api/valevision/published/file?folder-id=2026/3047__Doous&path=3047_D01/Document__Manifest__.json')
    results['published file, not published']     = (status, answer)
    if status != 404 or answer != {'error': 'Not published: 3047_D01/Document__Manifest__.json'}:
        restore(f'a missing manifest answered {status} {answer}')
    status, answer = get_json('/api/valevision/statements/file?folder-id=2026/3047__Doous&path=01__W019__Probe/Missing__.md')
    results['statement file, not there']          = (status, answer)
    if status != 404 or not answer or answer.get('missing') is not True:
        restore(f'a missing statement file answered {status} {answer}')
    status, answer = get_json('/api/valevision/statements/tree?project-folder=..&year=2026')
    results['statements tree, ".." project']      = (status, answer)
    if status != 404:
        restore(f'a ".." project answered {status}')
    status, answer = get_json('/api/valevision/published/file?folder-id=2026/3047__Doous&path=../project.json')
    results['published file, ".." path']          = (status, answer)
    if status != 400:
        restore(f'a ".." published path answered {status}')
    status, answer = get_json('/api/valevision/sheet-images/list?folder-id=2026/3047__Doous')
    results['sheet-images list (W0-18, Doous)']   = (status, answer and answer.get('status'))
    if status != 200:
        restore(f'the sheet-images list answered {status}')
    status, answer = get_json('/api/valevision/user-config/spellings')
    results['spellings (W0-18)']                  = (status, answer and answer.get('status'))
    if status != 200:
        restore(f'the spellings route answered {status}')
    status, answer = get_json('/api/valevision/no-such-route')
    results['unknown /api/ route']                = (status, answer)
    if status != 404 or not answer:
        restore(f'an unknown API route answered {status}')
except SystemExit:
    raise
except Exception as error:
    restore(f'a read-only check raised {error!r}')

folders_after = {name: os.path.exists(os.path.join(DOOUS, name)) for name in WATCHED}
if folders_after != folders_before:
    restore(f'a content folder appeared in 2026/3047__Doous: {folders_before} -> {folders_after}')

print('check-localhost 200; /api/health', health)
for label, value in results.items():
    print('%-38s %s' % (label, value))
print('content folders in 2026/3047__Doous before/after (none made):', folders_after)
