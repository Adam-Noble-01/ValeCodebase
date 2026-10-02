"""W1-34 - AppConfig (LF kept) and the Dev menu (CRLF kept).
- AppConfig: the four label values W0-15 withheld for the tab strip take TrueVision's text, each line made
  byte-equal to TrueVision's own line: SpecificationTab, TabsPreviousTitle, TabsNextTitle, NoSheets. No key
  is added or removed (W0-15 already took DrawingsTab ... TabStripNote).
- Dev menu: the NoSheets fallback equals the config value, so the line reads the same before the editor
  has loaded and after; log 1.4.1 with the release placeholder.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w134_common import pre_bytes, split_eol, join_eol, replace_once, tv_text, write_built  # noqa: E402

LABELS = {
    "SpecificationTab":  ('"Project Specification"', '"Specification"'),
    "TabsPreviousTitle": ('"The drawing before this one"', '"The tab before this one"'),
    "TabsNextTitle":     ('"The drawing after this one"', '"The tab after this one"'),
    "NoSheets":          ('"No sheets yet. New Sheet makes the first one and opens it."',
                          '"No sheets yet. New Sheet below makes the first; the tab strip and its Drawings menu appear with it."'),
}


def line_of(text, key):
    prefix = '        "LayoutEditor__Labels__' + key + '": '
    hits = [line for line in text.split("\n") if line.startswith(prefix)]
    if len(hits) != 1:
        raise SystemExit(key + " found " + str(len(hits)) + " times")
    return hits[0]


def build_config():
    text, eol = split_eol(pre_bytes("config"))
    tv = tv_text("config")
    for key, (old_value, new_value) in LABELS.items():
        here = line_of(text, key)
        theirs = line_of(tv, key)
        prefix = '        "LayoutEditor__Labels__' + key + '": '
        if here != prefix + old_value + ",":
            raise SystemExit(key + " is not the withheld value: " + here)
        if theirs != prefix + new_value + ",":
            raise SystemExit(key + " is not TrueVision's expected value: " + theirs)
        text = replace_once(text, here + "\n", theirs + "\n", key)
    json.loads(text)
    tv_labels = json.loads(tv)["LayoutEditor__Labels__Config"]
    vv_labels = json.loads(text)["LayoutEditor__Labels__Config"]
    for key in LABELS:
        full = "LayoutEditor__Labels__" + key
        if vv_labels[full] != tv_labels[full]:
            raise SystemExit(key + " does not equal TrueVision's after the change")
    write_built("config", join_eol(text, eol))
    return vv_labels


def build_dev(vv_labels):
    text, eol = split_eol(pre_bytes("dev"))
    no_sheets = vv_labels["LayoutEditor__Labels__NoSheets"]
    if "'" in no_sheets:
        raise SystemExit("the NoSheets value would need escaping")
    text = replace_once(text,
        "            empty.textContent = Na__LeLoad__GetLabel('NoSheets', 'No sheets yet. New Sheet makes the first one and opens it.');\n",
        "            empty.textContent = Na__LeLoad__GetLabel('NoSheets', '" + no_sheets + "');\n",
        "NoSheets fallback")
    text = replace_once(text,
        "// DEVELOPMENT LOG:\n"
        "// 19-Sep-2026 - Version 1.4.0\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.4.1 ({{VVREL:W1-34}})\n"
        "// - The empty sheet list reads TrueVision's words, as the config now does:\n"
        "//   \"No sheets yet. New Sheet below makes the first; the tab strip and its\n"
        "//   Drawings menu appear with it.\" The fallback is the config's value, so\n"
        "//   the line reads the same before the editor has loaded and after. With\n"
        "//   TrueVision's tab strip 2.0.0 (TrueVision3D v2.158.0).\n"
        "//\n"
        "// 19-Sep-2026 - Version 1.4.0\n",
        "dev log")
    write_built("dev", join_eol(text, eol))


if __name__ == "__main__":
    build_dev(build_config())
