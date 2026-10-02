# W1-09 scratch: compute the port's outputs (port_w1_09.py) into scratch/W1-09/staged/ for review before landing.
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import port_w1_09 as port  # noqa: E402

STAGED = os.path.join(port.SCRATCH, "staged")
for spec in port.FILES:
    src = port.tv_bytes(spec["tv"])
    out, problems = port.apply_seams(src, spec["seams"])
    if problems:
        print("problems:", problems)
        sys.exit(1)
    dst = os.path.join(STAGED, spec["tv"].replace("/", os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(out)
    print("staged", dst)
