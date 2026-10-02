"""Read the canonical parity work packages (wp_canonical.json) for the execution of the plan.

  python pkg.py W1-13                 full JSON of one package (every field, F.8 corrections applied)
  python pkg.py W1-13 --brief         the fields a swarm agent needs, as readable text
  python pkg.py --wave W1 --dag       ids of a wave in topological order with their in-wave dependencies (JSON)
  python pkg.py --wave W1 --list      one line per package: id, size, est lines, deps, hard gate, title
  python pkg.py --rules               the swarm rules R1-R11 and standard gates G1-G7 from the JSON header
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "parity", "data", "wp_canonical.json")
doc = json.load(open(DATA, encoding="utf-8"))
pk = doc["packages"]
by = {p["wp_id"]: p for p in pk}
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

args = sys.argv[1:]

def topo(ids):
    ids = list(ids); s = set(ids); out = []; seen = set()
    def visit(i):
        if i in seen: return
        seen.add(i)
        for d in by[i].get("depends_on", []):
            if d in s: visit(d)
        out.append(i)
    for i in sorted(ids, key=lambda x: (x.endswith("-99"), x)):
        visit(i)
    return out

if "--rules" in args:
    print(json.dumps({"swarm_rules": doc.get("swarm_rules"), "standard_gates": doc.get("standard_gates")}, indent=1, ensure_ascii=False))
elif "--wave" in args:
    w = args[args.index("--wave") + 1]
    ids = topo([p["wp_id"] for p in pk if p["wave"] == w])
    if "--dag" in args:
        print(json.dumps({i: [d for d in by[i].get("depends_on", []) if d in ids] for i in ids}, ensure_ascii=False))
    else:
        for i in ids:
            p = by[i]
            ext = [d for d in p.get("depends_on", []) if d not in ids]
            print(f"{i:6} {p['size']:2} {p.get('est_lines') or '-':>6}  deps={[d for d in p.get('depends_on', []) if d in ids]} ext={ext} gate={p.get('hard_gate','')[:60]!r}  {p['title'][:90]}")
elif args:
    p = by[args[0]]
    if "--brief" in args:
        for k in ("wp_id", "wave", "title", "goal", "tv_sources", "vv_targets", "edits", "hot_files", "depends_on", "gated_by",
                  "hard_gate", "size", "est_lines", "vv_adaptations", "acceptance", "tests_to_port", "harness_gates", "risk", "notes", "source_wp_ids"):
            v = p.get(k)
            if v in (None, "", []): continue
            if isinstance(v, list):
                print(f"## {k}"); [print(f"- {x}") for x in v]
            else:
                print(f"## {k}\n{v}")
    else:
        print(json.dumps(p, indent=1, ensure_ascii=False))
else:
    print(__doc__)
