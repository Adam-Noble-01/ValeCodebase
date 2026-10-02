import json, sys
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json"
d = json.load(open(P, encoding="utf-8"))
items = d if isinstance(d, list) else d.get("decisions", d.get("register", d))
if isinstance(items, dict):
    items = list(items.values())
want = sys.argv[1:] or ["DR-03", "DR-05", "DR-24", "DR-34", "DR-43"]
for it in items:
    if it.get("id") in want or it.get("dr_id") in want:
        print("=" * 100)
        for k, v in it.items():
            if isinstance(v, (list, dict)):
                v = json.dumps(v, ensure_ascii=False)
            s = str(v)
            if len(s) > 3000:
                s = s[:3000] + " ..."
            print(f"{k}: {s}")
