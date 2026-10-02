# W1-26 scratch: run the browser harness's 'new' scenario with each planted fault laid over the live tree, then
# the analysis, and list which checks failed - each mutant must be caught. Afterwards the clean live run is
# repeated so logs/browser__*.json are the landed tree's again.   python -B run_mutants.py
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def run(cmd):
    return subprocess.run(cmd, cwd=HERE, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=900)


def main():
    names = sorted(os.listdir(os.path.join(HERE, "mutants")))
    lines, caught = [], 0
    for name in names:
        h = run(["node", "browser_w1_26.mjs", "--new", os.path.join("mutants", name), "--old", "preimage", "new"])
        a = run(["python", "-B", "analyse_w1_26.py", "--label", "mutant__" + name])
        fails = [l.strip() for l in a.stdout.splitlines() if l.strip().startswith("FAIL")]
        ok = a.returncode != 0 and fails
        caught += 1 if ok else 0
        lines.append("== %s: %s (%d check(s) failed)" % (name, "CAUGHT" if ok else "NOT CAUGHT", len(fails)))
        lines += ["     " + f[:220] for f in fails]
        if h.returncode != 0:
            lines.append("     harness exit %d: %s" % (h.returncode, (h.stdout + h.stderr)[-300:]))
    clean_h = run(["node", "browser_w1_26.mjs", "--new", "live", "--old", "preimage"])
    clean_a = run(["python", "-B", "analyse_w1_26.py", "--label", "live"])
    lines.append("== clean (live tree, all three scenarios): analysis exit %d - %s" % (clean_a.returncode, clean_a.stdout.strip().splitlines()[-1] if clean_a.stdout.strip() else "?"))
    lines.append("MUTANTS CAUGHT: %d of %d" % (caught, len(names)))
    out = "\n".join(lines)
    open(os.path.join(HERE, "logs", "mutants.txt"), "w", encoding="utf-8").write(out + "\n")
    print(out)
    return 0 if caught == len(names) and clean_a.returncode == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
