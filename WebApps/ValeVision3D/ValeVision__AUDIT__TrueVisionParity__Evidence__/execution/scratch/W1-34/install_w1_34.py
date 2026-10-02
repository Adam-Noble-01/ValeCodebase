"""W1-34 - install the built files into the live tree, or restore the pre-images.

install  : refuses unless every live file is still exactly its pre-image (the SHA-1s taken at the start);
           then writes each built file in one write and records the written SHA-1s.
--restore: puts each pre-image back, only where the live file is still exactly what this package wrote.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w134_common import FILES, WRITTEN, sha1, live_path, pre_bytes, pre_sha1, built_path  # noqa: E402


def install():
    for key, rel in FILES.items():
        now = sha1(open(live_path(key), "rb").read())
        if now != pre_sha1(key):
            raise SystemExit("a file I own moved under me: " + rel + " " + now[:8] + " (pre-image " + pre_sha1(key)[:8] + ")")
    written = {}
    for key, rel in FILES.items():
        data = open(built_path(key), "rb").read()
        with open(live_path(key), "wb") as handle:
            handle.write(data)
        written[rel] = sha1(data)
        print("wrote", sha1(data)[:8], len(data), rel)
    with open(WRITTEN, "w", encoding="utf-8") as handle:
        json.dump(written, handle, indent=1)


def restore():
    written = json.load(open(WRITTEN, encoding="utf-8"))
    for key, rel in FILES.items():
        path = live_path(key)
        if sha1(open(path, "rb").read()) != written[rel]:
            print("SKIP (changed since written):", rel)
            continue
        data = pre_bytes(key)
        with open(path, "wb") as handle:
            handle.write(data)
        print("restored", sha1(data)[:8], rel)


if __name__ == "__main__":
    restore() if "--restore" in sys.argv else install()
