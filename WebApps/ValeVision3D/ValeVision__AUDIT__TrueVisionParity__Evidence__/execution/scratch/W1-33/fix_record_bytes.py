"""W1-33 - put the LoaderFacade test's pre-image byte count into the Port Record (replaces a placeholder)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
pre = open(os.path.join(HERE, "preimage", "Na__Test__LoaderFacade__.test.mjs"), "rb").read()
record = os.path.join(HERE, "..", "..", "port_records", "W1-33.md")
data = open(record, "rb").read()
old = b"74,???-> 75,098"
if data.count(old) != 1:
    raise SystemExit("placeholder not found once")
new = ("{:,}".format(len(pre)) + " -> 75,098").encode("ascii")
open(record, "wb").write(data.replace(old, new, 1))
print("test pre-image", len(pre), "bytes; record updated")
