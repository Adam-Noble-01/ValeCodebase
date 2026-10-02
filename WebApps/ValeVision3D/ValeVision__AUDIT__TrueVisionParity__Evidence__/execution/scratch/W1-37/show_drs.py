import json
import sys

PATH = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json"

with open(PATH, encoding="utf-8") as f:
    data = json.load(f)

want = set(sys.argv[1:])
for d in data:
    if d.get("id") in want or d.get("dr_id") in want:
        print("=" * 100)
        for k, v in d.items():
            if isinstance(v, (dict, list)):
                v = json.dumps(v, ensure_ascii=False, indent=1)
            print(f"[{k}] {v}")
