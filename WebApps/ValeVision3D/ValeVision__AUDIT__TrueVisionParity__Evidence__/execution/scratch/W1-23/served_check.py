# W1-23 - read-only GETs on Adam's running Flask server: the health route answers, and each of the
# seven files is served byte-identical to the file on disk. Nothing is written anywhere.
import hashlib
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_w1_23 as build  # noqa: E402

BASE = 'http://localhost:8000'
VV = build.VV


def get(url):
    with urllib.request.urlopen(url, timeout=20) as response:
        return response.status, response.read()


status, _ = get(BASE + '/api/check-localhost')
print('/api/check-localhost ->', status)
bad = 0 if status == 200 else 1
for leaf, path in build.FILES.items():
    rel = os.path.relpath(path, VV).replace('\\', '/')
    code, body = get(BASE + '/ValeVision3D/' + rel)
    disk = open(path, 'rb').read()
    same = body == disk
    bad += 0 if (code == 200 and same) else 1
    print('%3d  %-45s served %s disk (sha256 %s)' % (code, leaf, '==' if same else '!=', hashlib.sha256(body).hexdigest()[:16]))
sys.exit(1 if bad else 0)
