"""W2-15: read TrueVision files at the pin b2aa9151 (bytes, never the working tree)."""
import subprocess, sys, os, hashlib

PIN = "b2aa9151"
REPO = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
APP = "na-apps/30__TrueVision__CoreAppCode/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tv")


def show(rel, rev=PIN):
    return subprocess.run(["git", "-C", REPO, "show", f"{rev}:{APP}{rel}"], capture_output=True, check=True).stdout


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for rel in sys.argv[1:]:
        rev = PIN
        if "@" in rel:
            rel, rev = rel.split("@", 1)
        data = show(rel, rev)
        name = os.path.basename(rel)
        if rev != PIN:
            name = f"{rev}__{name}"
        with open(os.path.join(OUT, name), "wb") as f:
            f.write(data)
        print(rev, rel, len(data), hashlib.sha1(data).hexdigest()[:8], "CRLF" if b"\r\n" in data else "LF")
