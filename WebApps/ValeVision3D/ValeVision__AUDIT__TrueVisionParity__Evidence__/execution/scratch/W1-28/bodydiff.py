"""Unified diff of two files below their header (from the first REGION line), CRLF normalised."""
import difflib
import sys


def body(path, from_header):
    with open(path, encoding="utf-8") as fh:
        lines = fh.read().replace("\r\n", "\n").split("\n")
    if from_header:
        return lines
    for i, line in enumerate(lines):
        if line.startswith("// REGION |") or line.startswith("/* REGION"):
            return lines[max(0, i - 1):]
    return lines


def main():
    a, b = sys.argv[1], sys.argv[2]
    whole = len(sys.argv) > 3 and sys.argv[3] == "--whole"
    la, lb = body(a, whole), body(b, whole)
    for line in difflib.unified_diff(la, lb, fromfile=a, tofile=b, lineterm="", n=2):
        print(line)


if __name__ == "__main__":
    main()
