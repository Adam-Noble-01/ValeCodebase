"""Run every node test in the VV test folder from the VV app root; print exit code and the last line of each."""
import glob
import os
import subprocess
import sys
import time

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
TESTS = os.path.join(VV, "80__Testing__PrototypeEnvironment")
LOGDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs", sys.argv[1] if len(sys.argv) > 1 else "run")


def main():
    os.makedirs(LOGDIR, exist_ok=True)
    files = sorted(glob.glob(os.path.join(TESTS, "*.test.mjs")) + glob.glob(os.path.join(TESTS, "*.test.cjs")))
    only = sys.argv[2:]
    results = []
    for path in files:
        name = os.path.basename(path)
        if only and not any(o in name for o in only):
            continue
        t0 = time.time()
        try:
            proc = subprocess.run(["node", os.path.relpath(path, VV)], cwd=VV, capture_output=True, timeout=600)
            code = proc.returncode
            out = (proc.stdout + proc.stderr).decode("utf-8", "replace")
        except subprocess.TimeoutExpired as exc:
            code = "TIMEOUT"
            out = ((exc.stdout or b"") + (exc.stderr or b"")).decode("utf-8", "replace")
        with open(os.path.join(LOGDIR, name + ".log"), "w", encoding="utf-8") as fh:
            fh.write(out)
        lines = [l for l in out.strip().split("\n") if l.strip()]
        fails = sum(1 for l in lines if "FAIL" in l and "0 fail" not in l.lower())
        results.append((name, code, round(time.time() - t0, 1), fails, lines[-1][:140] if lines else ""))
        print(f"{name:45s} exit={code}  {results[-1][2]:6.1f}s  FAIL-lines={fails}  | {results[-1][4]}", flush=True)
    bad = [r for r in results if r[1] != 0]
    print(f"\n{len(results) - len(bad)}/{len(results)} exit 0")
    for r in bad:
        print("  NOT OK:", r[0], r[1])


if __name__ == "__main__":
    main()
