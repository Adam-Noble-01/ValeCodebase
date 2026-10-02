import json
import sys

PATH = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json"

with open(PATH, encoding="utf-8") as fh:
    data = json.load(fh)

wanted = set(sys.argv[1:])
for item in data:
    ident = item.get("id") or item.get("dr_id") or item.get("DR")
    if ident in wanted:
        print(json.dumps(item, indent=1, ensure_ascii=False))
        print("-" * 70)
