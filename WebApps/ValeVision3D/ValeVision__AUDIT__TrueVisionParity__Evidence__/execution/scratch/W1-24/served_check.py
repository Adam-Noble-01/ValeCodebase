# W1-24 - read-only GETs on Adam's running Flask server: the health route answers, and the exporter
# (and the jsPDF its LoadLibrary injects, at the configured path) is served; the exporter byte-identical
# to the file on disk. Nothing is written anywhere.
import hashlib
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_w1_24 as build  # noqa: E402

BASE = 'http://localhost:8000'
JSPDF_REL = '04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js'


def get(url):
    with urllib.request.urlopen(url, timeout=20) as response:
        return response.status, response.read()


status, _ = get(BASE + '/api/check-localhost')
print('/api/check-localhost ->', status)
bad = 0 if status == 200 else 1
rel = build.REL.replace('\\', '/')
code, body = get(BASE + '/ValeVision3D/' + rel)
disk = open(build.LIVE, 'rb').read()
same = body == disk
bad += 0 if (code == 200 and same) else 1
print('%3d  %s served %s disk (sha256 %s)' % (code, rel, '==' if same else '!=', hashlib.sha256(body).hexdigest()[:16]))
code, body = get(BASE + '/ValeVision3D/' + JSPDF_REL)
disk = open(os.path.join(build.VV, JSPDF_REL.replace('/', os.sep)), 'rb').read()
same = body == disk
bad += 0 if (code == 200 and same) else 1
print('%3d  %s served %s disk (%d bytes)' % (code, JSPDF_REL, '==' if same else '!=', len(body)))
sys.exit(1 if bad else 0)
