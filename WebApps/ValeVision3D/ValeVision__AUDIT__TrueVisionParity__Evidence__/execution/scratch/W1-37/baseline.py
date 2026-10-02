"""Record the pre-change state of every W1-37 target: sha1, size, line count and line ending."""
import hashlib
import os
import sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))

TARGETS = [
    "02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js",
    "03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Manager__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Picker__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Config__.json",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css",
    "02__Src__AppModules/54__Feature__ColourPalette/README__ColourPalette__.md",
]


def describe(path):
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        data = f.read()
    crlf = data.count(b"\r\n")
    lf = data.count(b"\n") - crlf
    eol = "CRLF" if crlf and not lf else ("LF" if lf and not crlf else ("MIXED" if crlf and lf else "none"))
    return hashlib.sha1(data).hexdigest(), len(data), data.count(b"\n"), eol


out_name = sys.argv[1] if len(sys.argv) > 1 else "baseline_sha1.txt"
rows = []
for rel in TARGETS:
    d = describe(os.path.join(VV, rel.replace("/", os.sep)))
    if d is None:
        rows.append(f"ABSENT\t-\t-\t-\t{rel}")
    else:
        rows.append(f"{d[0]}\t{d[1]}\t{d[2]}\t{d[3]}\t{rel}")
text = "\n".join(rows) + "\n"
print(text, end="")
with open(os.path.join(HERE, out_name), "w", encoding="utf-8", newline="\n") as f:
    f.write(text)
