import json

PATH = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\hot_file_ownership.json"

with open(PATH, encoding="utf-8") as f:
    data = json.load(f)

needles = ["Na__PlanAnnotations__Toolbar__", "Na__CoreUi__Styles__Index__"]


def walk(node, path):
    if isinstance(node, dict):
        for k, v in node.items():
            if any(n in str(k) for n in needles):
                print("/".join(path + [str(k)]), "::", json.dumps(v, ensure_ascii=False)[:3000])
            else:
                walk(v, path + [str(k)])
    elif isinstance(node, list):
        for i, v in enumerate(node):
            if isinstance(v, dict) and any(n in json.dumps(v) for n in needles) and ("path" in v or "file" in v):
                print("/".join(path + [str(i)]), "::", json.dumps(v, ensure_ascii=False)[:3000])
            else:
                walk(v, path + [str(i)])


print(type(data), list(data.keys())[:20] if isinstance(data, dict) else len(data))
walk(data, [])
