"""W2-10 port: ViewportTitleText 1.1.0, ViewportIdentity config, the title text test.

Reads TV's bytes as extracted at the pin (b2aa9151) into this scratch folder, applies the
named VV seams (banner, printed title, PORT NOTE) and writes the three VV files whole (LF,
TV's text). Hash-guarded: refuses to write if a VV target changed since the snapshot.
"""
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
VP = os.path.join(VV, "02__Src__AppModules", "51__System__LayoutEditor", "20__System__Viewports")

TARGETS = {
    "title": (os.path.join(VP, "Na__LayoutEditor__ViewportTitleText__.js"),
              "f7d873cf9acbd12e5121b226c448278698f5800c9d67ff504e825f570d0b8694",
              "tv__Na__LayoutEditor__ViewportTitleText__.js"),
    "config": (os.path.join(VP, "Na__LayoutEditor__ViewportIdentity__Config__.json"),
               "1890753f99ba6b6816d9b66d64c2fe02ae3c9ad5eae1c3fd8b68ff6b619a1f5b",
               "tv__Na__LayoutEditor__ViewportIdentity__Config__.json"),
    "test": (os.path.join(VV, "80__Testing__PrototypeEnvironment", "Na__Test__ViewportTitleText__.test.mjs"),
             "f472336556205090d9ee422f711cff6173bc1929596ad3a359913321bf9a03b8",
             "tv__Na__Test__ViewportTitleText__.test.mjs"),
}


def sha(b):
    return hashlib.sha256(b).hexdigest()


def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        sys.exit("ABORT: %s matched %d times" % (label, n))
    return text.replace(old, new)


def build_title(tv):
    out = replace_once(tv, "// TRUEVISION3D - LAYOUT EDITOR - VIEWPORT TITLE TEXT\n",
                       "// VALEVISION3D - LAYOUT EDITOR - VIEWPORT TITLE TEXT\n", "title banner")
    old_note = (
        "// PORT NOTE:\n"
        "// - Authored in   : TrueVision3D first (19-Sep-2026)\n"
        "// - ValeVision    : 1.0.0 ported 20-Sep-2026 as ValeVision3D v2.67.0, verbatim\n"
        "// - Ahead of it   : 1.1.0 (the storey level) is TrueVision only. ValeVision\n"
        "//                   holds 1.0.0 and its floor plans have no storey field.\n"
    )
    new_note = (
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportTitleText__.js\n"
        "// - Source version: 1.1.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-10}}, the whole file. This app's copy\n"
        "//                   before it was 1.0.0, taken verbatim from TrueVision 1.0.0 on 20-Sep-2026 as\n"
        "//                   ValeVision3D v2.67.0. TrueVision's v2.87.0 entry carries no sign-off by Adam;\n"
        "//                   it comes across under DR-01 (c) and is named so. Until the viewport identity\n"
        "//                   module answers a level (its 1.1.0), no fact here carries one, so every title\n"
        "//                   is written exactly as 1.0.0 wrote it.\n"
        "// - Parity        : verbatim (the code is TrueVision 1.1.0's; the banner and this note are the\n"
        "//                   only differences)\n"
        "// - Divergences   :\n"
        "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
        "// - Back-port     : none.\n"
    )
    return replace_once(out, old_note, new_note, "title PORT NOTE")


def build_test(tv):
    out = replace_once(tv, "// TRUEVISION3D - TEST - LAYOUT EDITOR - VIEWPORT TITLE TEXT\n",
                       "// VALEVISION3D - TEST - LAYOUT EDITOR - VIEWPORT TITLE TEXT\n", "test banner")
    out = replace_once(out, "    console.log('TrueVision3D - viewport title text');\n",
                       "    console.log('ValeVision3D - viewport title text');\n", "test printed title")
    anchor = (
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// DEVELOPMENT LOG:\n"
    )
    note = (
        "// -----------------------------------------------------------------------------\n"
        "//\n"
        "// PORT NOTE:\n"
        "// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ViewportTitleText__.test.mjs\n"
        "// - Source version: 1.1.0 (TrueVision3D v2.87.0, 20-Sep-2026, 48 checks; read at b2aa9151)\n"
        "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-10}}, with ViewportTitleText 1.1.0.\n"
        "//                   This app's copy before it was 1.0.0 (ValeVision3D v2.67.0, 20-Sep-2026).\n"
        "// - Parity        : verbatim - every check is TrueVision's, run against this app's own module. The\n"
        "//                   fixtures are TrueVision project sheets (PS02): they are what the house style\n"
        "//                   was measured from.\n"
        "// - Divergences   :\n"
        "//   - Banner and the printed title read ValeVision3D.\n"
        "// - Back-port     : none.\n"
        "//\n"
    ) + anchor
    return replace_once(out, anchor, note, "test PORT NOTE anchor")


def main():
    dry = "--dry" in sys.argv
    plan = {}
    for key, (path, before_hash, src_name) in TARGETS.items():
        cur = open(path, "rb").read()
        if sha(cur) != before_hash:
            sys.exit("ABORT: %s changed since the snapshot (sha %s)" % (path, sha(cur)))
        tv = open(os.path.join(HERE, src_name), "rb").read()
        if b"\r\n" in tv:
            sys.exit("ABORT: TV source %s is not LF" % src_name)
        text = tv.decode("utf-8")
        if key == "title":
            text = build_title(text)
        elif key == "test":
            text = build_test(text)
        plan[path] = text.encode("utf-8")
    for path, data in plan.items():
        if dry:
            open(os.path.join(HERE, "out__" + os.path.basename(path)), "wb").write(data)
            print("DRY", path, len(data))
        else:
            open(path, "wb").write(data)
            print("WROTE", path, len(data), sha(data))


if __name__ == "__main__":
    main()
