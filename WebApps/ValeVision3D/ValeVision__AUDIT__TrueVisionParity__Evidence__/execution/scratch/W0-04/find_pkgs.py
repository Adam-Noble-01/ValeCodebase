# Read-only: which packages mention a substring in their edits / targets / any field.
import json, sys
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\wp_canonical.json"
d = json.load(open(P, encoding="utf-8"))
pk = d["packages"]
items = pk if isinstance(pk, list) else list(pk.values())
needle = sys.argv[1]
for p in items:
    hits = []
    for k, v in p.items():
        s = json.dumps(v, ensure_ascii=False)
        if needle in s:
            hits.append(k)
    if hits:
        ed = [e for e in p.get("edits", []) if needle in e]
        print(p.get("wp_id"), p.get("wave"), "fields:", hits, "edits:", ed)
