# W1-09 scratch: print the TV devlog entries (at pin b2aa9151) for the releases this package carries, and every
# devlog line that names a 49 depth-fog file or the depth fog, so the Port Record can name each release exactly.
import subprocess
import re
import sys

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
APP = "na-apps/30__TrueVision__CoreAppCode/"

data = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + APP + "TrueVision__DEVLOG__.md"], capture_output=True, check=True).stdout
text = data.decode("utf-8", errors="replace")
lines = text.split("\n")

wanted = sys.argv[1:] or ["v2.94.0", "v2.103.0"]

# Locate release headings
heads = []
for i, line in enumerate(lines):
    m = re.match(r"^##\s+TrueVision3D\s+(v\d+\.\d+\.\d+)\b", line)
    if m:
        heads.append((i, m.group(1)))

for idx, (start, ver) in enumerate(heads):
    if ver in wanted:
        end = heads[idx + 1][0] if idx + 1 < len(heads) else len(lines)
        print("=" * 100)
        print("LINES %d-%d  %s" % (start + 1, end, ver))
        print("=" * 100)
        out = "\n".join(lines[start:end])
        sys.stdout.buffer.write(out.encode("ascii", errors="replace") + b"\n")
