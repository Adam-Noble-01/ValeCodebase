# W0-04 G0 preflight: pre-images and SHA-1 of the owned existing files, absence of the new files,
# EOL facts, TV pin presence. Read-only on the repo; writes only into this scratch folder.
import hashlib, json, os, shutil, subprocess, sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
TEST = os.path.join(VV, "80__Testing__PrototypeEnvironment")
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, "preimage")

EXISTING = ["Na__Verify__ModuleGraph__.mjs", "Na__Verify__Exports__.mjs"]
NEW = ["Na__Verify__ParityNaming__.mjs", "Na__Verify__PortNotes__.mjs", "Na__Verify__UiParity__.mjs",
       "Na__Test__LoaderStylesheets__.test.mjs"]

def eol(b):
    crlf = b.count(b"\r\n")
    lf = b.count(b"\n") - crlf
    return {"crlf": crlf, "lf": lf, "mixed": bool(crlf and lf)}

def main():
    os.makedirs(PRE, exist_ok=True)
    manifest = {}
    for name in EXISTING:
        p = os.path.join(TEST, name)
        b = open(p, "rb").read()
        manifest[name] = {"sha1": hashlib.sha1(b).hexdigest(), "bytes": len(b), **eol(b),
                          "nonascii": sum(1 for x in b if x > 127)}
        if "--write" in sys.argv:
            dst = os.path.join(PRE, name)
            if not os.path.exists(dst):
                shutil.copyfile(p, dst)
    for name in NEW:
        manifest[name] = {"exists": os.path.exists(os.path.join(TEST, name))}
    pin = subprocess.run(["git", "-C", r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb", "cat-file", "-e", "b2aa9151"],
                         capture_output=True)
    manifest["tv_pin_b2aa9151"] = pin.returncode == 0
    print(json.dumps(manifest, indent=1))
    if "--write" in sys.argv:
        with open(os.path.join(HERE, "preimage_manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=1)

main()
