"""W0-11 scratch: read-only GET probe that the localhost fallback URL form ResolveAssetUrl now builds
(${origin}/Whitecardopedia/Projects/<folderId>/<rel>) is served by Adam's running Flask server, and that a
missing file answers a real 404 (not the app shell). No writes, no server control."""
import json
import urllib.error
import urllib.request

ORIGIN = 'http://localhost:8000'
FOLDER = '2026/3047__Doous'
CASES = [
    ('existing linework', 'LayoutEditor/Linework/Elevation_001.json', 200),
    ('existing project.json', 'project.json', 200),
    ('missing asset', 'LayoutEditor/Snapshots/__no_such_file__W0-11.webp', 404),
]

ok = True
for name, rel, want in CASES:
    url = '%s/Whitecardopedia/Projects/%s/%s' % (ORIGIN, FOLDER, rel)
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            status, ctype, body = resp.status, resp.headers.get('Content-Type', ''), resp.read(200)
    except urllib.error.HTTPError as err:
        status, ctype, body = err.code, err.headers.get('Content-Type', ''), err.read(200)
    except Exception as err:  # server not running
        status, ctype, body = None, '', repr(err).encode()
    passed = status == want and not (want == 200 and b'<!DOCTYPE html' in body[:200])
    ok = ok and passed
    print('%s  %-22s %s -> %s %s %r' % ('PASS' if passed else 'FAIL', name, url, status, ctype, body[:60]))

print('RESULT:', 'PASS' if ok else 'FAIL')
