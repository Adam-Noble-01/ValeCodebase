"""R3 helper: which canonical K3 package ports / edits a given path (TV source or VV target).
Usage: python r3_wp_lookup.py <substring> [<substring> ...]
Read-only over parity/data/wp_canonical.json."""
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, '..', '..', 'data', 'wp_canonical.json'), encoding='utf-8'))
for q in sys.argv[1:]:
    hits = []
    for p in D['packages']:
        where = []
        for k in ('tv_sources', 'vv_targets', 'edits', 'tests_to_port'):
            for s in (p.get(k) or []):
                if q.lower() in str(s).lower():
                    where.append(k)
                    break
        if where:
            hits.append(f"{p['wp_id']}({'/'.join(w[:2] for w in where)})")
    print(f"{q}: {', '.join(hits) if hits else '-'}")
