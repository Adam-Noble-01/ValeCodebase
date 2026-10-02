"""W1-34 - shared helpers for the build scripts (bytes in, bytes out, line endings kept)."""
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
    "loader": LE + r"\01__Core__Loader\Na__LayoutEditor__Loader__.js",
    "boot":   LE + r"\01__Core__Loader\Na__LayoutEditor__Styles__Boot__.css",
    "config": LE + r"\03__Core__Config\Na__LayoutEditor__AppConfig__.json",
    "mode":   LE + r"\05__Core__ModeController\Na__LayoutEditor__ModeController__.js",
    "tabs":   LE + r"\05__Core__ModeController\Na__LayoutEditor__TabStrip__.js",
    "spec":   LE + r"\50__Feature__Specification\Na__LayoutEditor__Styles__Specification__.css",
    "dev":    LE + r"\70__DevTools__DevMenu\Na__LayoutEditor__DevMenu__Controls__.js",
}

# TrueVision at the pin b2aa9151 (git show), the bytes the build scripts may read
TV_FILES = {
    "tabs":   (r"02__Src__AppModules\51__System__LayoutEditor\05__Core__ModeController\Na__LayoutEditor__TabStrip__.js", "3e5499fef61187cbd449d6468bc4f823f6c7bbbd"),
    "mode":   (r"02__Src__AppModules\51__System__LayoutEditor\05__Core__ModeController\Na__LayoutEditor__ModeController__.js", "6a6997bfa3823b7c23ef53be841c21955e8d128e"),
    "main":   (r"02__Src__AppModules\51__System__LayoutEditor\10__Core__SheetSurface\Na__LayoutEditor__Styles__Main__.css", "33acdcccdc3bd85a42284369d1fa7af8f60c6afe"),
    "config": (r"02__Src__AppModules\51__System__LayoutEditor\03__Core__Config\Na__LayoutEditor__AppConfig__.json", "bd14eda34fef9e9b472b68cccb7c74e58a189eec"),
    "spec":   (r"02__Src__AppModules\51__System__LayoutEditor\50__Feature__Specification\Na__LayoutEditor__Styles__Specification__.css", "0941bbcc0c5a495aecfbcf873965af0976c5217e"),
    "dev":    (r"02__Src__AppModules\51__System__LayoutEditor\70__DevTools__DevMenu\Na__LayoutEditor__DevMenu__Controls__.js", "53bb35363a81f2e4f132249753caf1670ecb6833"),
}


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def live_path(key):
    return os.path.join(VV, FILES[key])


def pre_path(key):
    return os.path.join(PRE, FILES[key])


def pre_bytes(key):
    """The pre-image this package took at its start, checked against the recorded SHA-1."""
    table = json.load(open(os.path.join(HERE, "preimage_hashes.json"), encoding="utf-8"))
    data = open(pre_path(key), "rb").read()
    if sha1(data) != table[FILES[key]]["sha1"]:
        raise SystemExit("pre-image of " + key + " does not match its recorded SHA-1")
    return data


def pre_sha1(key):
    table = json.load(open(os.path.join(HERE, "preimage_hashes.json"), encoding="utf-8"))
    return table[FILES[key]]["sha1"]


def tv_text(key):
    rel, want = TV_FILES[key]
    data = open(os.path.join(TV, rel), "rb").read()
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
