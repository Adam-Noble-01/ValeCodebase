import json, sys
p = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json"
d = json.load(open(p, encoding="utf-8"))
items = d.get("decisions") if isinstance(d, dict) else d
if items is None:
    items = [v for v in d.values() if isinstance(v, list)][0]
for it in items:
    if it.get("id") in sys.argv[1:] or it.get("dr_id") in sys.argv[1:]:
        print(json.dumps(it, indent=1)[:5000])
        print("-----")
