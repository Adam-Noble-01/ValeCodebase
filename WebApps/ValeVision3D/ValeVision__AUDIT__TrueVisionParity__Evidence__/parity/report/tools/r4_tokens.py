# R4 helper: compare every CSS custom-property definition (--Vale_*, --Na_Le_*, --na-le-*) in the
# shared stylesheet folders of TV and VV. Read-only. Prints name, TV value(s), VV value(s), state.
import os, re, collections

TV = r"D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps/30__TrueVision__CoreAppCode"
VV = r"D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D"
SUBS = ["03__Style__AppStylesheets", "02__Src__AppModules/51__System__LayoutEditor"]
PAT = re.compile(r"(--(?:Vale_|Na_Le_|na-le-)[A-Za-z0-9_\-]+)\s*:\s*([^;]+);")


def scan(root):
    out = collections.defaultdict(list)
    for sub in SUBS:
        base = os.path.join(root, sub)
        for dp, dn, fn in os.walk(base):
            if '.claude' in dp or 'node_modules' in dp:
                continue
            for f in fn:
                if not f.endswith('.css'):
                    continue
                p = os.path.join(dp, f)
                txt = open(p, encoding='utf-8', errors='replace').read()
                txt = re.sub(r"/\*.*?\*/", "", txt, flags=re.S)
                rel = os.path.relpath(p, root).replace(os.sep, '/')
                for m in PAT.finditer(txt):
                    out[m.group(1)].append((m.group(2).strip(), rel))
    return out


t, v = scan(TV), scan(VV)
names = sorted(set(t) | set(v))
counts = collections.Counter()
for n in names:
    tv = sorted(set(x[0] for x in t.get(n, [])))
    vv = sorted(set(x[0] for x in v.get(n, [])))
    if tv and vv:
        st = 'same' if tv == vv else 'DIFF'
    elif tv:
        st = 'tv-only'
    else:
        st = 'vv-only'
    counts[st] += 1
    if st != 'same' or n.startswith('--Vale_'):
        where_t = sorted(set(x[1].split('/')[-1] for x in t.get(n, [])))
        where_v = sorted(set(x[1].split('/')[-1] for x in v.get(n, [])))
        print(f"{st:8s} | {n} | TV {tv} {where_t} | VV {vv} {where_v}")
print(f"\nTOTAL names {len(names)}: {dict(counts)}")
