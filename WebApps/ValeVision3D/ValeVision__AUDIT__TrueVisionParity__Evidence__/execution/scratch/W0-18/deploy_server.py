"""
W0-18 scratch: put the validated candidate in place of the live WCP/server.py, atomically, then confirm Adam's
running debug server reloaded, still answers /api/check-localhost and /api/health, and now serves the two new
blueprints (read-only GETs: the spelling dictionary, and the sheet-picture list of 2026/3047__Doous, which never
makes a folder). On any failure the original bytes go back at once.
Restore only:  python deploy_server.py --restore   (puts back original_server.py, sha1 79b71065 - W0-09's version)
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


def put_in_place(source_bytes):
    temp = LIVE + '.w018.tmp'                                    # <-- Not *.py: the stat reloader never watches it
    with open(temp, 'wb') as handle:
        handle.write(source_bytes)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp, LIVE)


def get(path, timeout=3):
    try:
        with NO_PROXY.open(BASE_URL + path, timeout=timeout) as response:
            return response.status, response.headers.get('Content-Type', ''), response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get('Content-Type', ''), error.read()


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
images_before = os.path.exists(os.path.join(DOOUS, '05__Layout__DrawingDocs__Images'))

status, _, _ = get('/api/check-localhost')
assert status == 200, status
put_in_place(candidate)
print('candidate in place at', time.strftime('%H:%M:%S'), 'sha1', hashlib.sha1(candidate).hexdigest()[:8])

deadline = time.time() + 60
spellings = None
while time.time() < deadline:
    time.sleep(1.0)
    try:
        status, content_type, body = get('/api/valevision/user-config/spellings')
    except Exception:
        continue                                                 # <-- Mid-reload: nothing listens for a moment
    if status == 200 and 'json' in content_type:
        spellings = json.loads(body)
        break

try:
    check_status, _, _ = get('/api/check-localhost')
except Exception as error:
    check_status = repr(error)
if check_status != 200:
    restore(f'/api/check-localhost answered {check_status}')
try:
    health_status, _, health_body = get('/api/health')
    health = json.loads(health_body)
except Exception as error:
    restore(f'/api/health failed: {error!r}')
if health_status != 200 or health.get('service') != 'whitecardopedia-local-dev':
    restore(f'/api/health answered {health_status} {health}')
if not spellings:
    restore('the spellings route never answered 200 (did the reloader pick the change up?)')
groups = (spellings.get('document') or {}).get('ValeVision__UserSpellings__Groups')
if spellings.get('status') != 'ok' or spellings.get('writable') is not True or not isinstance(groups, list):
    restore(f'the spellings route answered {spellings.get("status")}, writable {spellings.get("writable")}')

list_status, _, list_body = get('/api/valevision/sheet-images/list?folder-id=2026/3047__Doous')
listing = json.loads(list_body) if list_status in (200, 404) else None
images_after = os.path.exists(os.path.join(DOOUS, '05__Layout__DrawingDocs__Images'))
if list_status != 200 or listing.get('status') != 'ok' or images_after != images_before:
    restore(f'the sheet-images list answered {list_status} {listing}; images folder {images_before} -> {images_after}')
refused_status, _, refused_body = get('/api/valevision/sheet-images/list?project-folder=..&year=2026')
if refused_status != 404:
    restore(f'a ".." project answered {refused_status}')

print('check-localhost 200; /api/health', health)
print('spellings: status', spellings['status'], 'writable', spellings['writable'], 'groups', [g.get('Group__Key') for g in groups])
print('sheet-images list 2026/3047__Doous:', listing, '- images folder made:', images_after)
print('".." project:', refused_status, json.loads(refused_body))
