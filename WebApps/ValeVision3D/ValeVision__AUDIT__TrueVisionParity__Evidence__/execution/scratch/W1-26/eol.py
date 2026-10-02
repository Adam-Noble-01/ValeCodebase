# W1-26 scratch: line endings, size and sha1 of files (app-relative or absolute). Read-only.
import hashlib
import os
import sys

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
for arg in sys.argv[1:]:
    path = arg if os.path.isabs(arg) else os.path.join(VV, arg.replace("/", os.sep))
    if not os.path.exists(path):
        print("MISSING  " + arg)
        continue
    data = open(path, "rb").read()
    crlf = data.count(b"\r\n")
    lf = data.count(b"\n") - crlf
    bom = data.startswith(b"\xef\xbb\xbf")
    print("%s  %7d B  crlf=%-5d lf=%-5d bom=%s  last=%r  %s" % (hashlib.sha1(data).hexdigest()[:8], len(data), crlf, lf, bom, data[-2:], arg))
