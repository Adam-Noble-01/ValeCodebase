"""W2-99 scratch: builds write_devlog_w2.py from W1-99 C2's write_devlog_w1c.py (anchored replacements, each once)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', 'W1-99', 'C2', 'write_devlog_w1c.py'), encoding='utf-8').read()
R = [
    ("W1-99 Parity Scribe (Wave 1 continuation) - the continuation's entry at the top of ValeVision__DEVLOG__.md\n"
     "(ValeVision3D v2.71.3).",
     "W2-99 Parity Scribe (Wave 2) - the wave's entry at the top of ValeVision__DEVLOG__.md (ValeVision3D v2.71.4).\n"
     "Adapted from W1-99 C2's write_devlog_w1c.py: only the file names, the expected SHA-1 and the versions changed."),
    ("The entry text is scratch/W1-99/C2/devlog_entry_w1c.txt. It goes above the v2.71.2 entry (the newest), after the title\n"
     "line and its blank line, exactly as part 1 placed v2.71.2.",
     "The entry text is scratch/W2-99/devlog_entry_w2.txt. It goes above the v2.71.3 entry (the newest), after the title\n"
     "line and its blank line, exactly as W1-99 placed v2.71.3."),
    ("  - the devlog is at part 1's recorded SHA-1 and its first version heading is still v2.71.2",
     "  - the devlog is at W1-99's recorded final SHA-1 and its first version heading is still v2.71.3"),
    ("scratch/W1-99/C2/preimage_records/", "scratch/W2-99/preimage_records/"),
    ("python -B write_devlog_w1c.py", "python -B write_devlog_w2.py"),
    ("ENTRY = os.path.join(HERE, 'devlog_entry_w1c.txt')", "ENTRY = os.path.join(HERE, 'devlog_entry_w2.txt')"),
    ("EXPECT = '457c14892a9add38e0071b660d54816e5b95ba07'      # W1-99 part 1's final SHA-1 (its Port Record)",
     "EXPECT = 'f627b2506a31754d67f525bc4dbe48cf5ced39cf'      # W1-99 part 2's final SHA-1 (its Port Record)"),
    ("TOP = (2, 71, 2)\nNEW_VER = (2, 71, 3)", "TOP = (2, 71, 3)\nNEW_VER = (2, 71, 4)"),
    ("not v2.71.2 - a parallel session may have released", "not v2.71.3 - a parallel session may have released"),
    ("assert heads[0].startswith('## ValeVision3D v2.71.3 - ') and heads[1].startswith('## ValeVision3D v2.71.2 - ')",
     "assert heads[0].startswith('## ValeVision3D v2.71.4 - ') and heads[1].startswith('## ValeVision3D v2.71.3 - ')"),
    ("expected part 1\\'s %s", "expected W1-99\\'s %s"),
    ("print('checks: top was v2.71.2, entry v2.71.3 (next patch step), ASCII, pure CRLF, undo proof exact')",
     "print('checks: top was v2.71.3, entry v2.71.4 (next patch step), ASCII, pure CRLF, undo proof exact')"),
    ("tmp = DEVLOG + '.w1-99c.tmp'", "tmp = DEVLOG + '.w2-99.tmp'"),
]
for a, b in R:
    n = src.count(a)
    if n != 1:
        raise SystemExit('anchor %d times: %r' % (n, a[:70]))
    src = src.replace(a, b)
open(os.path.join(HERE, 'write_devlog_w2.py'), 'w', encoding='utf-8', newline='\n').write(src)
print('wrote write_devlog_w2.py')
