import json
import sys

PATH = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\wp_canonical.json"

with open(PATH, encoding="utf-8") as f:
    data = json.load(f)

needle = sys.argv[1]
print("top-level keys:", list(data.keys()) if isinstance(data, dict) else type(data))


def walk(node, path):
    if isinstance(node, dict):
        for k, v in node.items():
            walk(v, path + [str(k)])
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, path + [str(i)])
    else:
        s = str(node)
        if needle in s:
            print("/".join(path), "::", s[:400])


walk(data, [])
