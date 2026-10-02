import json

BASE = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__"
HOT = BASE + r"\parity\data\hot_file_ownership.json"
STATE = BASE + r"\execution\execution_state.json"

NEEDLES = [
    "Na__LayoutEditor__Assets__.js",
    "Na__ProjectedLinework__Persistence__.js",
    "Na__AppUtils__R2AssetUpload__.js",
    "Na__PresentationMode__Thumbnail__Renderer.js",
]

with open(HOT, encoding="utf-8") as fh:
    hot = json.load(fh)


def walk(obj, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if any(n in str(k) for n in NEEDLES):
                print("KEY:", path + "/" + str(k))
                print(json.dumps(v, indent=1)[:3000])
                print("-" * 60)
            else:
                walk(v, path + "/" + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, dict) and any(n in json.dumps(v) for n in NEEDLES) and ("path" in v or "file" in v):
                print("ITEM:", path + "[" + str(i) + "]")
                print(json.dumps(v, indent=1)[:3000])
                print("-" * 60)
            else:
                walk(v, path + "[" + str(i) + "]")


print("TOP KEYS:", list(hot.keys())[:20] if isinstance(hot, dict) else type(hot))
walk(hot)

with open(STATE, encoding="utf-8") as fh:
    state = json.load(fh)

print("STATE TOP KEYS:", list(state.keys()) if isinstance(state, dict) else type(state))
pk = state.get("packages", {}) if isinstance(state, dict) else {}
for pid in ["W0-02", "W0-01", "W0-06", "W0-11", "W0-12", "W0-13", "W0-14", "W0-17"]:
    print(pid, json.dumps(pk.get(pid), indent=None)[:600] if pk else None)
