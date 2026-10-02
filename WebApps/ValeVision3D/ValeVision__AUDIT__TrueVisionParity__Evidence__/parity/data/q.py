"""Query the verified parity data.

Usage (python q.py [options]):
  --what findings|wps|decisions|slices   which file to query (default findings)
  --cat folder,module_naming             filter findings by category (comma list)
  --act port_verbatim,rename_move        filter findings by action
  --sev critical,high                    filter findings by severity
  --slice S01,S02a                       filter by slice id
  --grep text                            case-insensitive substring over every text field and path
  --ids S05a-F01,S05a-F02                exact ids
  --fields id,title,action               fields to output (default: all)
  --trunc 400                            truncate each string field to N chars (0 = no truncation)
  --format json|md|ids|count             output format (default json)

Examples:
  python q.py --cat folder --format md
  python q.py --what wps --grep ModeController --fields id,slice,title,hot_files,depends_on
  python q.py --what decisions --format md
  python q.py --act build_vv_transport --fields id,title,tv_paths,recommendation,vv_adaptation --trunc 500
  python q.py --sev critical --format count
"""
import argparse, json, os, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
FILES = {
    "findings": "findings_verified.json",
    "wps": "work_packages.json",
    "decisions": "decisions.json",
    "slices": "slices.json",
}

ap = argparse.ArgumentParser()
ap.add_argument("--what", default="findings", choices=list(FILES))
ap.add_argument("--cat"); ap.add_argument("--act"); ap.add_argument("--sev"); ap.add_argument("--slice")
ap.add_argument("--grep"); ap.add_argument("--ids"); ap.add_argument("--fields")
ap.add_argument("--trunc", type=int, default=0)
ap.add_argument("--format", default="json", choices=["json", "md", "ids", "count"])
a = ap.parse_args()

rows = json.load(open(os.path.join(HERE, FILES[a.what]), encoding="utf-8"))
split = lambda s: [x.strip() for x in s.split(",") if x.strip()] if s else None

def keep(r):
    if split(a.cat) and r.get("category") not in split(a.cat): return False
    if split(a.act) and r.get("action") not in split(a.act): return False
    if split(a.sev) and r.get("severity") not in split(a.sev): return False
    if split(a.slice) and (r.get("slice") or r.get("id")) not in split(a.slice): return False
    if split(a.ids) and r.get("id") not in split(a.ids): return False
    if a.grep and a.grep.lower() not in json.dumps(r, ensure_ascii=False).lower(): return False
    return True

rows = [r for r in rows if keep(r)]

def trunc(v):
    if a.trunc and isinstance(v, str) and len(v) > a.trunc:
        return v[: a.trunc] + "..."
    if isinstance(v, list):
        return [trunc(x) for x in v]
    return v

flds = split(a.fields)
out = []
for r in rows:
    r2 = {k: trunc(v) for k, v in r.items() if (not flds or k in flds)}
    out.append(r2)

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

if a.format == "count":
    print(len(out), "rows")
    for key in ("slice", "category", "action", "severity", "size"):
        c = Counter(r.get(key) for r in rows if r.get(key) is not None)
        if c: print(key, dict(c))
elif a.format == "ids":
    print("\n".join(str(r.get("id")) for r in out))
elif a.format == "md":
    if not out:
        print("(no rows)")
    else:
        cols = flds or list(dict.fromkeys(k for r in out for k in r.keys()))
        cell = lambda v: (", ".join(map(str, v)) if isinstance(v, list) else str(v if v is not None else "")).replace("|", "/").replace("\n", " ")
        print("| " + " | ".join(cols) + " |")
        print("|" + "---|" * len(cols))
        for r in out:
            print("| " + " | ".join(cell(r.get(c)) for c in cols) + " |")
else:
    print(json.dumps(out, indent=1, ensure_ascii=False))
