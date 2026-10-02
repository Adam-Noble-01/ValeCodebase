"""W2-13 - take TrueVision's Na__LayoutEditor__ModelLayers__Config__.json 1.2.0
changes into ValeVision's (port_adapted, merge): the linework-modifiers group as
ValeVision__LineworkModifier__*, the storey fallback prefix, Meta 1.2.0 and the
SSOT version read. VV's own keys, coarse rows, legacy group and Meta notes stay.

TV text is read at the pin with git show (bytes) and the group / meta / fallback
lines are copied from it, swapping only the TrueVision__ app token.

Usage: python patch_modellayers_config.py [--check]
"""
import json
import subprocess
import sys
from pathlib import Path

TARGET = Path(r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\25__System__RenderStyles\Na__LayoutEditor__ModelLayers__Config__.json")
ORIG   = Path(r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W2-13\orig\Na__LayoutEditor__ModelLayers__Config__.json")
TV_GIT = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TV_REL = "na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__ModelLayers__Config__.json"
PIN    = "b2aa9151"

raw = TARGET.read_bytes()
if raw != ORIG.read_bytes():
    sys.exit("STOP: the live file is not the pre-image this package read")
assert raw.count(b"\r\n") == raw.count(b"\n"), "expected a pure CRLF file"
text = raw.decode("utf-8").replace("\r\n", "\n")

tv = subprocess.run(["git", "-C", TV_GIT, "show", PIN + ":" + TV_REL], capture_output=True, check=True).stdout.decode("utf-8")
assert "\r\n" not in tv
tv_lines = tv.split("\n")


def tv_line(prefix):
    hits = [l for l in tv_lines if l.lstrip().startswith(prefix)]
    if len(hits) != 1:
        sys.exit("STOP: TV line %r found %d times" % (prefix, len(hits)))
    return hits[0]


def tv_block(start_prefix, end_line):
    """Lines from the one starting with start_prefix up to and including the first equal to end_line."""
    at = [i for i, l in enumerate(tv_lines) if l.lstrip().startswith(start_prefix)]
    if len(at) != 1:
        sys.exit("STOP: TV block start %r found %d times" % (start_prefix, len(at)))
    i = at[0]
    j = tv_lines.index(end_line, i)
    return tv_lines[i:j + 1]


def vv_token(s):
    return s.replace("TrueVision__", "ValeVision__")


# --- TV pieces, app token swapped -------------------------------------------------
meta_modifiers = tv_line('"Meta__LineworkModifiers"')
assert meta_modifiers.rstrip().endswith('",')
group_open_at  = [i for i, l in enumerate(tv_lines) if '"Group__Id"     : "linework-modifiers"' in l]
assert len(group_open_at) == 1
g0 = group_open_at[0] - 1                          # the '        {' line
assert tv_lines[g0] == "        {"
g1 = tv_lines.index("        },", g0)
group_lines = [vv_token(l) for l in tv_lines[g0:g1 + 1]]
storey_prefix = vv_token(tv_line('"Fallback__StoreyElementPrefix"'))
storey_note   = vv_token(tv_line('"Fallback__StoreyElementNote"'))

REPLACEMENTS = []

REPLACEMENTS.append((
    '        "Meta__Version"         : "1.1.1",\n',
    '        "Meta__Version"         : "1.2.0",\n'))
REPLACEMENTS.append((
    '        "Meta__SsotVersionRead" : "2.3.2",\n',
    '        "Meta__SsotVersionRead" : "2.4.0",\n'))
REPLACEMENTS.append((
    "The edge style fields and TrueVision's split building rows (1.1.0) on 13-Sep-2026.\",\n",
    "The edge style fields and TrueVision's split building rows (1.1.0) on 13-Sep-2026. "
    "The linework-modifiers group (SSOT 76-79, under ValeVision__LineworkModifier__ keys) and the storey fallback prefix (1.2.0) "
    "on 02-Oct-2026, read at TrueVision3D b2aa9151.\",\n"))

# Meta__LineworkModifiers after Meta__AnnotationDraws (TV's order).
draws_at = [l for l in text.split("\n") if l.startswith('        "Meta__AnnotationDraws" :')]
assert len(draws_at) == 1
REPLACEMENTS.append((draws_at[0] + "\n", draws_at[0] + "\n" + meta_modifiers + "\n"))

# The group, between Annotation and Scene Context (TV's order).
REPLACEMENTS.append((
    '        },\n        {\n            "Group__Id"     : "context",\n',
    '        },\n' + "\n".join(group_lines) + '\n        {\n            "Group__Id"     : "context",\n'))

# The storey fallback.
REPLACEMENTS.append((
    '        "Fallback__SplitOnDouble": " - "\n    }\n',
    '        "Fallback__SplitOnDouble": " - ",\n' + storey_prefix + "\n" + storey_note + "\n    }\n"))

for old, new in REPLACEMENTS:
    n = text.count(old)
    if n != 1:
        sys.exit("STOP: expected exactly one match, found %d for:\n%s" % (n, old[:200]))
    text = text.replace(old, new)

doc = json.loads(text)                             # must still parse
assert "TrueVision__" not in text, "an app-token literal survived"

out = text.replace("\n", "\r\n").encode("utf-8")
if "--check" in sys.argv:
    print("check ok, %d bytes, groups: %s" % (len(out), [g["Group__Id"] for g in doc["LayoutEditor__ModelLayers__Groups"]]))
else:
    TARGET.write_bytes(out)
    print("written, %d bytes, groups: %s" % (len(out), [g["Group__Id"] for g in doc["LayoutEditor__ModelLayers__Groups"]]))
