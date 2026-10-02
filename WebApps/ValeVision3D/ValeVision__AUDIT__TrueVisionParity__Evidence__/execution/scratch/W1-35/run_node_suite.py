"""W1-35 - run every node test of 80__Testing__PrototypeEnvironment (*.test.mjs) in an app root; print each exit code.

python run_node_suite.py <app root>
The tests write only to the OS temp folder (F.0); this script writes nothing.
"""
import os
import subprocess
import sys


def main():
    root = os.path.abspath(sys.argv[1])
    tests = sorted(n for n in os.listdir(os.path.join(root, "80__Testing__PrototypeEnvironment")) if n.endswith(".test.mjs"))
    failed = []
    for name in tests:
        rel = "80__Testing__PrototypeEnvironment/" + name
        try:
            run = subprocess.run(["node", rel], cwd=root, capture_output=True, timeout=600)
            code = run.returncode
            tail = (run.stdout.decode("utf-8", "replace").strip().splitlines() or [""])[-1][:150]
        except subprocess.TimeoutExpired:
            code, tail = "TIMEOUT", ""
        print(("PASS " if code == 0 else "FAIL ") + str(code).ljust(8) + name + "  | " + tail)
        if code != 0:
            failed.append(name)
    print("\n%d test files, %d exit 0, %d not: %s" % (len(tests), len(tests) - len(failed), len(failed), ", ".join(failed) or "-"))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
