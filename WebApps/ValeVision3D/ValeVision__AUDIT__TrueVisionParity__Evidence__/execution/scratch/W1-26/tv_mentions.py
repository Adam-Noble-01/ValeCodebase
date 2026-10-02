# W1-26 scratch: every "TrueVision" / "Noble" / NA-ish mention in the candidates, labelled by the header block it
# sits in (DESCRIPTION / INTEGRATION / PORT NOTE / DEVELOPMENT LOG / code), so a running-app name in TrueVision's
# DESCRIPTION or INTEGRATION (K2 H4) cannot slip through.
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidate")
PAT = re.compile(r"TrueVision|Noble|NOBLE|PS01|Musters|na-apps|noble-architecture|NaProjectPortal|/q/|/s/")
for root, _, files in os.walk(CAND):
    for name in files:
        path = os.path.join(root, name)
        lines = open(path, encoding="utf-8").read().split("\n")
        block = "code"
        hits = []
        for i, line in enumerate(lines, 1):
            s = line.strip().lstrip("/").lstrip("*").strip()
            for head in ("DESCRIPTION", "INTEGRATION", "PORT NOTE", "DEVELOPMENT LOG", "WHY THE VALUE", "USAGE"):
                if s.startswith(head):
                    block = head
            if re.match(r"^// =+$", line) or re.match(r"^// REGION", line) or line.startswith("import ") or line.startswith("    import"):
                block = "code" if not line.startswith("// =") or i > 5 else block
            if PAT.search(line):
                hits.append((i, block, line.strip()[:150]))
        if hits:
            print("\n== " + os.path.relpath(path, CAND))
            for h in hits:
                print("   %4d %-16s %s" % h)
