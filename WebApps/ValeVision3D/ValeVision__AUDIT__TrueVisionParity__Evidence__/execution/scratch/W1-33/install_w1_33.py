"""W1-33 - install the built files into the live tree, or restore the pre-images.

install : refuses unless every live file is still exactly its pre-image (the test: W1-31's recorded bytes);
          then writes each built file in one write and records the written SHA-1s.
--restore: puts each pre-image back, only where the live file is still exactly what this package wrote.
"""
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w133_common import HERE, PRE, VV, FILES, WRITTEN, sha1, preimage_sha1  # noqa: E402

TEST_PRE = os.path.join(PRE, "Na__Test__LoaderFacade__.test.mjs")


def live(key):
    return os.path.join(VV, FILES[key])


def install():
    # The test's pre-image is taken now (it is not one of the seven; W1-31 wrote it)
    test_bytes = open(live("test"), "rb").read()
    if not sha1(test_bytes).startswith("2ecf7abf"):
        raise SystemExit("the LoaderFacade test moved since W1-31: " + sha1(test_bytes)[:8])
    for key in FILES:
        if key == "test":
            continue
        now = sha1(open(live(key), "rb").read())
        if now != preimage_sha1(key):
            raise SystemExit("a file I own moved under me: " + FILES[key] + " " + now[:8])
    if not os.path.exists(TEST_PRE):
        open(TEST_PRE, "wb").write(test_bytes)
    written = {}
    for key, rel in FILES.items():
        data = open(os.path.join(HERE, "built", os.path.basename(rel)), "rb").read()
        with open(live(key), "wb") as handle:
            handle.write(data)
        written[rel] = sha1(data)
        print("wrote", sha1(data)[:8], len(data), rel)
    json.dump(written, open(WRITTEN, "w"), indent=1)


def restore():
    written = json.load(open(WRITTEN))
    for key, rel in FILES.items():
        path = live(key)
        if sha1(open(path, "rb").read()) != written[rel]:
            print("SKIP (changed since written):", rel)
            continue
        pre = TEST_PRE if key == "test" else os.path.join(PRE, os.path.basename(rel))
        data = open(pre, "rb").read()
        with open(path, "wb") as handle:
            handle.write(data)
        print("restored", sha1(data)[:8], rel)


if __name__ == "__main__":
    restore() if "--restore" in sys.argv else install()
