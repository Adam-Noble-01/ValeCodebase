"""W1-35 - shared helpers for the build scripts (bytes in, bytes out, line endings kept)."""
import hashlib
import json
import os

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, "preimage")
TV = os.path.join(HERE, "tv")
BUILT = os.path.join(HERE, "built")
WRITTEN = os.path.join(HERE, "written.json")

LE = r"02__Src__AppModules\51__System__LayoutEditor"
FILES = {
    "toolbar": LE + r"\40__Ui__Panels\Na__LayoutEditor__Toolbar__.js",
    "config":  LE + r"\03__Core__Config\Na__LayoutEditor__AppConfig__.json",
}
# The pre-images taken at the start of the package (snapshot_preimages.py): W0-06's Toolbar
# (VV 1.9.3, resolved to v2.71.1 by W0-99) and W1-34's AppConfig (its recorded sha1 184b4ef4).
PRE_SHA1 = {
    "toolbar": "3e27ab151c75af5c72d1024c8e25071e088791cf",
    "config":  "184b4ef470ced80c6354f7c604be862e1e87eac9",
}
# TrueVision at the pin b2aa9151 (git show), the only TV bytes the build scripts read
TV_FILES = {
    "toolbar": ("tv_Toolbar.js",     "50a81798b50562480de4462ff865210895b4482c"),
    "config":  ("tv_AppConfig.json", "bd14eda34fef9e9b472b68cccb7c74e58a189eec"),
}


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def live_path(key):
    return os.path.join(VV, FILES[key])


def pre_path(key):
    return os.path.join(PRE, os.path.basename(FILES[key]))


def pre_bytes(key):
    """The pre-image this package took at its start, checked against the recorded SHA-1."""
    data = open(pre_path(key), "rb").read()
    if sha1(data) != PRE_SHA1[key]:
        raise SystemExit("pre-image of " + key + " does not match its recorded SHA-1")
    return data


def tv_text(key):
    name, want = TV_FILES[key]
    data = open(os.path.join(TV, name), "rb").read()
    if sha1(data) != want:
        raise SystemExit("TV source " + key + " is not the pinned bytes")
    text = data.decode("utf-8")
    if "\r" in text:
        raise SystemExit("TV source " + key + " has CR characters")
    return text


def split_eol(data):
    """bytes -> (lf_text, eol); refuses a mixed file."""
    crlf = data.count(b"\r\n")
    lf = data.count(b"\n") - crlf
    if crlf and lf:
        raise SystemExit("mixed line endings")
    eol = "\r\n" if crlf else "\n"
    return data.decode("utf-8").replace("\r\n", "\n"), eol


def join_eol(text, eol):
    if "\r" in text:
        raise SystemExit("edited text carries CR")
    return (text.replace("\n", eol) if eol != "\n" else text).encode("utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("anchor '" + label + "' found " + str(count) + " times")
    return text.replace(old, new, 1)


def built_path(key):
    return os.path.join(BUILT, os.path.basename(FILES[key]))


def write_built(key, data):
    os.makedirs(BUILT, exist_ok=True)
    with open(built_path(key), "wb") as handle:
        handle.write(data)
    print("built", sha1(data)[:8], len(data), FILES[key])
