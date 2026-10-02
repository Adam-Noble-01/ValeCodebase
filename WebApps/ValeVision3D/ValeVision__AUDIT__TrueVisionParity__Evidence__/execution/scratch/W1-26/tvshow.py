# W1-26 scratch helper: read TrueVision files ONLY at the pin (b2aa9151) into the
# session scratchpad (never into the repository tree). Bytes, no text decoding.
#   python tvshow.py <app-relative path> [...]     -> writes copies, prints sha1/size/eol
#   python tvshow.py --ls <app-relative dir>       -> git ls-tree at the pin
import hashlib, os, subprocess, sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
APP = "na-apps/30__TrueVision__CoreAppCode/"
OUT = os.environ.get("W126_TV_OUT") or os.path.join(
    r"C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad",
    "W1-26_tv")


def show(rel):
    rel = rel.replace("\\", "/").lstrip("/")
    data = subprocess.run(["git", "-C", NAWEB, "show", f"{PIN}:{APP}{rel}"],
                          capture_output=True, check=True).stdout
    return data


def main(argv):
    if argv and argv[0] == "--ls":
        for d in argv[1:]:
            d = d.replace("\\", "/").rstrip("/")
            r = subprocess.run(["git", "-C", NAWEB, "ls-tree", "--name-only", f"{PIN}:{APP}{d}"],
                               capture_output=True, text=True)
            print(r.stdout or r.stderr)
        return
    for rel in argv:
        data = show(rel)
        dst = os.path.join(OUT, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "wb") as f:
            f.write(data)
        crlf = data.count(b"\r\n")
        lf = data.count(b"\n") - crlf
        print(f"{hashlib.sha1(data).hexdigest()[:8]}  {len(data):>7} B  crlf={crlf} lf={lf}  {rel}")


if __name__ == "__main__":
    main(sys.argv[1:])
