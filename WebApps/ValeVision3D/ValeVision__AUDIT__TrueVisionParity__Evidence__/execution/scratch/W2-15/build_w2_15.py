"""W2-15 build / apply / restore for the one file this package owns.

  python -B build_w2_15.py --build       candidate (CRLF, as the live file) from candidate/*.LF.js; diff vs pre-image
  python -B build_w2_15.py --apply       write the candidate to the live path (pre-image hash re-checked first)
  python -B build_w2_15.py --check-live  live == candidate?
  python -B build_w2_15.py --restore     put the pre-image back (only if the live file is still this package's)

Bytes in, bytes out. The live file is CRLF throughout (711 CRLF lines at the pre-image), so the candidate is
authored LF and converted to CRLF here; no other byte is touched.
"""
import difflib
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = "Na__LayoutEditor__SnapshotRenderer__.js"
LIVE = os.path.join(r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules",
                    "51__System__LayoutEditor", "25__System__RenderStyles", NAME)
PRE = os.path.join(HERE, "preimage", NAME)
SRC_LF = os.path.join(HERE, "candidate", NAME.replace(".js", ".LF.js"))
CAND = os.path.join(HERE, "candidate", NAME)
PRE_SHA = "783280bc0ed015904aad9e98bb929eead64b165ba1b592ec3154d8e11b1b6950"


def sha(b):
    return hashlib.sha256(b).hexdigest()


def read(p):
    with open(p, "rb") as f:
        return f.read()


def build():
    live = read(LIVE)
    pre = read(PRE)
    assert sha(pre) == PRE_SHA, "pre-image copy changed"
    assert sha(live) == PRE_SHA, "live file is not the pre-image: " + sha(live)
    src = read(SRC_LF)
    assert b"\r" not in src, "LF source carries a CR"
    assert src.endswith(b"\n")
    out = src.replace(b"\n", b"\r\n")
    assert out.count(b"\r\n") == out.count(b"\n")
    with open(CAND, "wb") as f:
        f.write(out)
    print("candidate", len(out), "bytes", out.count(b"\r\n"), "CRLF lines, sha256", sha(out))
    a = pre.decode("utf-8").replace("\r\n", "\n").splitlines(keepends=True)
    b = out.decode("utf-8").replace("\r\n", "\n").splitlines(keepends=True)
    diff = "".join(difflib.unified_diff(a, b, "preimage/" + NAME, "candidate/" + NAME, n=3))
    with open(os.path.join(HERE, "w2_15_changes.diff"), "w", encoding="utf-8", newline="\n") as f:
        f.write(diff)
    plus = sum(1 for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++"))
    minus = sum(1 for l in diff.splitlines() if l.startswith("-") and not l.startswith("---"))
    print("diff +%d -%d lines (w2_15_changes.diff)" % (plus, minus))


def apply():
    live = read(LIVE)
    assert sha(live) == PRE_SHA, "REFUSED: the live file changed since it was read: " + sha(live)
    cand = read(CAND)
    with open(LIVE, "wb") as f:
        f.write(cand)
    assert read(LIVE) == cand
    print("applied", sha(cand))


def check_live():
    live, cand = read(LIVE), read(CAND)
    print("LIVE == CANDIDATE" if live == cand else "LIVE DIFFERS (" + sha(live) + ")")
    return live == cand


def restore():
    live, cand = read(LIVE), read(CAND)
    assert live == cand, "REFUSED: the live file is not this package's candidate any more"
    pre = read(PRE)
    assert sha(pre) == PRE_SHA
    with open(LIVE, "wb") as f:
        f.write(pre)
    print("restored", PRE_SHA)


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "--build"
    {"--build": build, "--apply": apply, "--check-live": check_live, "--restore": restore}[arg]()
