# -*- coding: utf-8 -*-
"""Independent check of the K1 decision register (reads only the written outputs and the raw data).

PASS requires:
 1. every raw decision id (decisions.json) and every decision-type finding (findings_verified.json: category
    'decision' or action 'needs_decision') appears in exactly one DR's source_ids, or is listed as dropped with a reason;
 2. decision_raw_map.json's raw_id_map agrees with the DRs' source_ids, id for id;
 3. DR ids run DR-01..DR-NN without gaps, sorted by urgency tier;
 4. every DR carries non-empty title, question, options, recommendation, default_if_unanswered, blocks, urgency,
    source_ids, and well-formed conflicts_resolved entries;
 5. every work package named in blocks.work_packages exists in work_packages.json;
 6. every source id exists in the raw data.
"""
import json, os, sys
from collections import Counter

PARITY = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
D = os.path.join(PARITY, "data")
load = lambda n: json.load(open(os.path.join(D, n), encoding="utf-8"))

dec, fnd, wps = load("decisions.json"), load("findings_verified.json"), load("work_packages.json")
reg, mp = load("decision_register.json"), load("decision_raw_map.json")

universe = [d["id"] for d in dec] + [f["id"] for f in fnd if f.get("category") == "decision" or f.get("action") == "needs_decision"]
U = set(universe)
wp_ids = {w["id"] for w in wps}
fail = []

# 1. exactly-once coverage
cnt = Counter(s for r in reg for s in r["source_ids"])
dropped = mp.get("dropped", {})
for rid in universe:
    n = cnt.get(rid, 0)
    if rid in dropped:
        if n: fail.append(f"{rid} is dropped but also in {n} DR(s)")
        if not str(dropped[rid]).strip(): fail.append(f"{rid} dropped without a reason")
    elif n != 1:
        fail.append(f"{rid} appears in {n} DRs")
extra = set(cnt) - U
if extra: fail.append(f"source ids outside the universe: {sorted(extra)}")
if set(dropped) - U: fail.append(f"dropped ids outside the universe: {sorted(set(dropped) - U)}")

# 2. raw map agreement
rm = mp["raw_id_map"]
if set(rm) != U: fail.append("raw_id_map keys != universe")
for r in reg:
    for s in r["source_ids"]:
        if rm.get(s) != r["dr_id"]: fail.append(f"raw_id_map[{s}]={rm.get(s)} but {s} is in {r['dr_id']}")
for rid, v in rm.items():
    if v == "DROPPED" and rid not in dropped: fail.append(f"{rid} DROPPED in map but no reason")

# 3. ids and urgency order
tier = {"before Wave 0": 0, "before the wave that needs it": 1, "can wait": 2}
ids = [r["dr_id"] for r in reg]
if ids != [f"DR-{i+1:02d}" for i in range(len(reg))]: fail.append(f"DR ids not consecutive: {ids}")
t = [tier.get(r["urgency"], 99) for r in reg]
if t != sorted(t) or 99 in t: fail.append(f"urgency not sorted or invalid: {t}")
if reg and reg[0]["key"] != "GATE": fail.append("DR-01 is not the port gate")
if len(reg) > 1 and reg[1]["key"] != "RENUM": fail.append("DR-02 is not the folder renumber")

# 4. shape
for r in reg:
    for f in ("theme", "title", "question", "recommendation", "default_if_unanswered", "urgency"):
        if not str(r.get(f, "")).strip(): fail.append(f"{r['dr_id']} empty {f}")
    if not r.get("options"): fail.append(f"{r['dr_id']} no options")
    if not r.get("source_ids"): fail.append(f"{r['dr_id']} no source ids")
    b = r.get("blocks", {})
    if not b.get("systems") or not b.get("waves"): fail.append(f"{r['dr_id']} blocks incomplete")
    for c in r.get("conflicts_resolved", []):
        if not all(str(c.get(k, "")).strip() for k in ("topic", "positions", "evidence", "resolution")):
            fail.append(f"{r['dr_id']} malformed conflict entry")
    if "[[" in json.dumps(r, ensure_ascii=False): fail.append(f"{r['dr_id']} has an unresolved [[placeholder]]")
# 5. work packages exist
    for w in b.get("work_packages", []):
        if w not in wp_ids: fail.append(f"{r['dr_id']} names unknown work package {w}")
# 6. source ids exist
known = {d["id"] for d in dec} | {f["id"] for f in fnd}
for r in reg:
    for s in r["source_ids"] + r.get("related_ids", []):
        if s not in known: fail.append(f"{r['dr_id']} unknown id {s}")

print(f"universe: {len(universe)} ids ({len(dec)} raw decisions + {len(universe) - len(dec)} decision-type findings)")
print(f"canonical decisions: {len(reg)}; mapped: {sum(1 for v in rm.values() if v != 'DROPPED')}; dropped: {len(dropped)}")
print(f"urgency: {dict(Counter(r['urgency'] for r in reg))}")
print(f"conflict entries: {sum(len(r.get('conflicts_resolved', [])) for r in reg)}; DRs with conflicts: {sum(1 for r in reg if r.get('conflicts_resolved'))}")
if fail:
    print("FAIL"); [print(" -", f) for f in fail]; sys.exit(1)
print("PASS")
