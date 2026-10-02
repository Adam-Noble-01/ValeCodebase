# W0-09 scratch: put the validated candidate in place of the live WCP/server.py, atomically, then
# confirm Adam's running debug server reloaded and still answers. On any failure the original bytes
# go back at once. Restore only:  python deploy_server.py --restore
import os
import sys
import json
import time
import urllib.request

LIVE      = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\server.py'
HERE      = os.path.dirname(os.path.abspath(__file__))
ORIGINAL  = os.path.join(HERE, 'original_server.py')
CANDIDATE = os.path.join(HERE, 'candidate_server.py')
BASE_URL  = 'http://localhost:8000'
NO_PROXY  = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def put_in_place(source_bytes):
    temp = LIVE + '.w009.tmp'                                    # <-- Not *.py: the stat reloader never watches it
    with open(temp, 'wb') as handle:
        handle.write(source_bytes)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp, LIVE)


def get(path, timeout=3):
    with NO_PROXY.open(BASE_URL + path, timeout=timeout) as response:
        return response.status, response.headers.get('Content-Type', ''), response.read()


original  = open(ORIGINAL, 'rb').read()
candidate = open(CANDIDATE, 'rb').read()

if '--restore' in sys.argv:
    put_in_place(original)
    print('RESTORED original server.py bytes')
    sys.exit(0)

live_now = open(LIVE, 'rb').read()
if live_now != original:
    print('STOP: the live server.py changed since it was read; nothing written')
    sys.exit(2)

status, _, _ = get('/api/check-localhost')
assert status == 200, status
put_in_place(candidate)
print('candidate in place at', time.strftime('%H:%M:%S'))

deadline = time.time() + 45
health = None
while time.time() < deadline:
    time.sleep(1.0)
    try:
        status, content_type, body = get('/api/health')
        if status == 200 and 'json' in content_type:
            health = json.loads(body)
            break
    except Exception as error:
        last_error = error
        continue

check_ok = False
try:
    status, _, _ = get('/api/check-localhost')
    check_ok = status == 200
except Exception as error:
    print('check-localhost failed:', error)

if not check_ok or not health or health.get('service') != 'whitecardopedia-local-dev':
    put_in_place(original)
    print('FAILED: check-localhost', check_ok, 'health', health, '- original server.py bytes RESTORED')
    sys.exit(1)

print('check-localhost 200; /api/health', health)
