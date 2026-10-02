"""W1-33 - shared helpers for the patch scripts (bytes in, bytes out, line endings kept)."""
import hashlib
import json
import os

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, "preimage")
TV = os.path.join(HERE, "tv")
WRITTEN = os.path.join(HERE, "written.json")

LE = r"02__Src__AppModules\51__System__LayoutEditor"
FILES = {
    "loader":   LE + r"\01__Core__Loader\Na__LayoutEditor__Loader__.js",
    "screen":   LE + r"\01__Core__Loader\Na__LayoutEditor__LoadingScreen__.js",
    "boot":     LE + r"\01__Core__Loader\Na__LayoutEditor__Styles__Boot__.css",
    "veil":     LE + r"\05__Core__ModeController\Na__LayoutEditor__LoadingVeil__.js",
    "mode":     LE + r"\05__Core__ModeController\Na__LayoutEditor__ModeController__.js",
    "main":     LE + r"\10__Core__SheetSurface\Na__LayoutEditor__Styles__Main__.css",
    "overlays": r"03__Style__AppStylesheets\Na__UiFeature__Styles__LoadingOverlays__.css",
    "test":     r"80__Testing__PrototypeEnvironment\Na__Test__LoaderFacade__.test.mjs",
}

TV_SHA1 = {
    "Na__LayoutEditor__LoadingVeil__.js": "30ae16a98a988abefa9b51ea1bc9089cdf4d578d",
    "Na__UiFeature__Styles__LoadingOverlays__.css": "c615a5b520157b61ea97cacd86cc50b4e812a1f7",
    "Na__LayoutEditor__Styles__Main__.css": "33acdcccdc3bd85a42284369d1fa7af8f60c6afe",
}


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def path_of(key):
    return os.path.join(VV, FILES[key])


def read_bytes(key):
    return open(path_of(key), "rb").read()


def preimage_sha1(key):
    table = json.load(open(os.path.join(PRE, "sha1.json")))
    rel = FILES[key]
    if rel in table:
        return table[rel]["sha1"]
    return None


def tv_text(name):
    data = open(os.path.join(TV, name), "rb").read()
    if sha1(data) != TV_SHA1[name]:
        raise SystemExit("TV source " + name + " is not the pinned bytes")
    text = data.decode("utf-8")
    if "\r" in text:
        raise SystemExit("TV source " + name + " has CR characters")
    return text


def split_eol(data):
    """bytes -> (lf_text, eol) ; refuses a mixed file."""
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


def record_written(key, data):
    table = json.load(open(WRITTEN)) if os.path.exists(WRITTEN) else {}
    table[FILES[key]] = sha1(data)
    json.dump(table, open(WRITTEN, "w"), indent=1)
