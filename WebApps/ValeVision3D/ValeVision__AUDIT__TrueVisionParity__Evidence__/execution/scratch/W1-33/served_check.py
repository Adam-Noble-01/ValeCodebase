"""W1-33 - read-only GETs: the local Flask server answers, and serves each changed file as it is on disk."""
import hashlib
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w133_common import VV, FILES  # noqa: E402

BASE = "http://localhost:8000"


def get(url):
    with urllib.request.urlopen(url, timeout=20) as response:
        return response.status, response.read()


status, _ = get(BASE + "/api/check-localhost")
print("api/check-localhost", status)
for key, rel in FILES.items():
    if key == "test":
        continue
    url = BASE + "/ValeVision3D/" + rel.replace("\\", "/")
    try:
        code, body = get(url)
    except Exception as error:  # noqa: BLE001
        print("ERROR", rel, error)
        continue
    disk = open(os.path.join(VV, rel), "rb").read()
    same = hashlib.sha1(body).hexdigest() == hashlib.sha1(disk).hexdigest()
    print(code, "equal to disk" if same else "DIFFERS (" + str(len(body)) + " vs " + str(len(disk)) + ")", rel)
