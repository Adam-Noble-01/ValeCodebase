"""List identity / NA markers in the TV sources (outside nothing - every line), to plan the seams."""
import os
import re
import sys

T = "True" + "Vision"
PATTERNS = [
    ("window-global", re.compile(r"window\." + T + "__")),
    ("na-marker", re.compile("30__" + T + "__AppContent")),
    ("storage-key", re.compile(T + "3D__")),
    ("identity-literal", re.compile(T + "__")),
    ("console-prefix", re.compile(r"\[" + T + "3D")),
    ("banner-token", re.compile(T.upper() + "3D")),
    ("na-route", re.compile("/api/" + T.lower(), re.I)),
    ("na-header", re.compile("X-" + T + "-")),
    ("na-transport", re.compile("na-" + T.lower() + "-api")),
    ("na-marker", re.compile("Na" + "ProjectPortal")),
    ("na-marker", re.compile("/na-" + "apps/")),
    ("na-host", re.compile(r"noble-architecture\.com", re.I)),
    ("mention", re.compile(T)),
]


def main():
    for path in sys.argv[1:]:
        with open(path, encoding="utf-8") as fh:
            lines = fh.read().replace("\r\n", "\n").split("\n")
        print("=" * 90)
        print(os.path.basename(path))
        for i, line in enumerate(lines, 1):
            for code, pat in PATTERNS:
                if pat.search(line):
                    print(f"  {i:5d} {code:16s} {line.strip()[:150]}")
                    break


if __name__ == "__main__":
    main()
