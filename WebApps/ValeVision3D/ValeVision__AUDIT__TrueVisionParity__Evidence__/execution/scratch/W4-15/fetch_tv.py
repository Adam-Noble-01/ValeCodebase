import subprocess, hashlib, os
REPO = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
BASE = "na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/08__Style__Stylesheets/"
NAMES = ["Na__LayoutEditor__Styles__Statement__.css", "Na__LayoutEditor__Styles__Statement__Document__.css"]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tv")
os.makedirs(OUT, exist_ok=True)
for n in NAMES:
    b = subprocess.run(["git", "-C", REPO, "show", PIN + ":" + BASE + n], capture_output=True, check=True).stdout
    blob = subprocess.run(["git", "-C", REPO, "rev-parse", PIN + ":" + BASE + n], capture_output=True, check=True).stdout.decode().strip()
    open(os.path.join(OUT, n), "wb").write(b)
    print(n, len(b), "bytes", b.count(b"\n"), "lines", "CRLF" if b"\r\n" in b else "LF", "blob", blob[:8], "sha256", hashlib.sha256(b).hexdigest()[:8])
