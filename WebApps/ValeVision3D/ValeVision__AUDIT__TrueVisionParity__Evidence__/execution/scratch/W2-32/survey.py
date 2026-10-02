import json, glob, os
ROOT = r"D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/Projects/2026"
for d in sorted(glob.glob(ROOT + "/*/")):
    pj = os.path.join(d, "project.json")
    if not os.path.exists(pj):
        continue
    p = json.load(open(pj, encoding="utf-8"))
    dd = p.get("LayoutEditor__DrawingsData") if isinstance(p, dict) else None
    print(os.path.basename(d.rstrip("/\\")), "top keys:", list(p.keys())[:12])
    if dd:
        for s in dd.get("LayoutEditor__DrawingsData__Sheets", []):
            bubbles = [l.get("Leader__SpecNoteId") for l in s.get("Sheet__Leaders", []) if l.get("Leader__Type") == "bubble"]
            print("   ", s.get("Sheet__Id"), s.get("Sheet__Name"), "bubbles", bubbles, "margin", s.get("Sheet__MarginNotes"))
    notes = os.path.join(d, "ValeVision__DrawingNotes__.json")
    if os.path.exists(notes):
        n = json.load(open(notes, encoding="utf-8"))
        for g in n.get("ProjectSpecification__Groups", []):
            print("    group", g.get("Group__Id"), g.get("Group__Prefix"), g.get("Group__IsGeneral"), [(x.get("Note__Id"), x.get("Note__Code")) for x in g.get("Group__Notes", [])])
