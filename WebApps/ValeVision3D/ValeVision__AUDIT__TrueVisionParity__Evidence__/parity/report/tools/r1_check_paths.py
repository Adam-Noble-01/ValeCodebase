#!/usr/bin/env python3
"""R1 helper: checks every backticked path in the Section A markdown that names a
CURRENT file or folder (TVM/, VVM/, TV/, VV/, WCP/, NAAPPS/ prefixes, and bare
02__Src__AppModules paths). Paths that are targets (created later) are listed as
'absent' for a human to confirm they are targets. Read-only."""
import os, re, sys
ROOTS = {
    'TVM/': r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/',
    'VVM/': r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/',
    'TV/': r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps/30__TrueVision__CoreAppCode/',
    'VV/': r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/',
    'WCP/': r'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/',
    'NAAPPS/': r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps/',
    'WebApps/': r'D:/10_CoreLib__ValeCodebase/WebApps/',
}
md = open(sys.argv[1], encoding='utf-8').read()
seen = set()
for m in re.finditer(r'`([^`]+)`', md):
    s = m.group(1).strip()
    s = re.sub(r':\d[\d, :\-]*$', '', s)  # drop :line refs
    for pre, base in ROOTS.items():
        if s.startswith(pre):
            rel = s[len(pre):]
            if '...' in rel or '<' in rel or '*' in rel:
                continue
            full = os.path.join(base, rel)
            key = (pre, rel)
            if key in seen:
                break
            seen.add(key)
            print(('ok     ' if os.path.exists(full) else 'ABSENT ') + pre + rel)
            break
