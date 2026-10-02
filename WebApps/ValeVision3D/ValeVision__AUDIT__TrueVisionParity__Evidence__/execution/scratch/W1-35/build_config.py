"""W1-35 - build the Layout Editor AppConfig: the Notes toggle's labels out, the Margin Notes
description to TrueVision's line.

Reads the pre-image (LF, W1-34's written bytes) and TrueVision's AppConfig at the pin b2aa9151.
Three line edits and nothing else:
  - LayoutEditor__MarginNotes__Description takes TrueVision's line byte for byte (the value
    W0-15 withheld for this package: "Switched on per sheet with Show notes margin in the
    Margin Notes panel ..."), so the MarginNotes block equals TrueVision's;
  - LayoutEditor__Labels__MarginToggle and LayoutEditor__Labels__MarginToggleTitle are deleted
    (TrueVision has neither; this app's only reader was the toolbar's Notes button).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w135_common import pre_bytes, tv_text, split_eol, join_eol, replace_once, write_built  # noqa: E402


def one_line(text, prefix, label):
    lines = [l for l in text.split("\n") if l.startswith(prefix)]
    if len(lines) != 1:
        raise SystemExit("line '" + label + "' found " + str(len(lines)) + " times")
    return lines[0]


def strict_load(text):
    def hook(pairs):
        seen = {}
        for key, value in pairs:
            if key in seen:
                raise SystemExit("duplicate key " + key)
            seen[key] = value
        return seen
    return json.loads(text, object_pairs_hook=hook)


def main():
    vv, eol = split_eol(pre_bytes("config"))
    if eol != "\n":
        raise SystemExit("the AppConfig was expected LF")
    tv = tv_text("config")

    prefix = '        "LayoutEditor__MarginNotes__Description": '
    vv_line = one_line(vv, prefix, "VV MarginNotes Description")
    tv_line = one_line(tv, prefix, "TV MarginNotes Description")
    if "Show notes margin in the Margin Notes panel" not in tv_line:
        raise SystemExit("TrueVision's description is not the expected one")
    vv = replace_once(vv, vv_line + "\n", tv_line + "\n", "MarginNotes Description")

    toggle = one_line(vv, '        "LayoutEditor__Labels__MarginToggle": ', "MarginToggle")
    title  = one_line(vv, '        "LayoutEditor__Labels__MarginToggleTitle": ', "MarginToggleTitle")
    vv = replace_once(vv, toggle + "\n" + title + "\n", "", "MarginToggle and MarginToggleTitle")

    # SELF-CHECKS | valid JSON, no duplicate, the block now TrueVision's, nothing else moved
    cfg = strict_load(vv)
    tvcfg = strict_load(tv)
    if "MarginToggle" in vv:
        raise SystemExit("MarginToggle left in the config")
    if cfg["LayoutEditor__MarginNotes__Config"] != tvcfg["LayoutEditor__MarginNotes__Config"]:
        raise SystemExit("the MarginNotes block is not TrueVision's")
    before = strict_load(split_eol(pre_bytes("config"))[0])
    for block, body in before.items():
        if block in ("LayoutEditor__MarginNotes__Config", "LayoutEditor__Labels__Config"):
            continue
        if cfg.get(block) != body:
            raise SystemExit("block changed that should not: " + block)
    labels_before = dict(before["LayoutEditor__Labels__Config"])
    labels_before.pop("LayoutEditor__Labels__MarginToggle")
    labels_before.pop("LayoutEditor__Labels__MarginToggleTitle")
    if list(labels_before.items()) != list(cfg["LayoutEditor__Labels__Config"].items()):
        raise SystemExit("the Labels block changed beyond the two keys")
    write_built("config", join_eol(vv, eol))


if __name__ == "__main__":
    main()
