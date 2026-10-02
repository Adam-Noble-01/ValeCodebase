#!/usr/bin/env python3
"""H2 - write data/wp_corrections_applied.json: every Section F (R6) F.8 correction as applied to K3.

Reads the corrected files (data/wp_canonical.json, hot_file_ownership.json, wp_raw_map.json), their
pre-H2 copies (*.pre_h2.json) and the op log of k3_f8_corrections.py (by importing k3_build, which
rebuilds the catalogue in memory and writes nothing). The record maps
correction id -> package -> field -> {old, new}, and proves that the log explains the whole
difference: replaying the logged ops on the pre-H2 records, plus the fields K3 derives from them,
gives the corrected records exactly. Anything else is listed under 'unattributed' and fails (exit 1).
"""
import collections
import copy
import json
import os
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(TOOLS, '..', '..', 'data'))
sys.path.insert(0, TOOLS)

import k3_build as B            # noqa: E402  (in-memory build; writes nothing when imported)
import r6_corrections as K      # noqa: E402
import r6_prose as T            # noqa: E402

OUT = os.path.join(DATA, 'wp_corrections_applied.json')


def load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


def norm(x):
    return json.loads(json.dumps(x, ensure_ascii=False))


pre, post = load('wp_canonical.pre_h2.json'), load('wp_canonical.json')
hot_pre, hot_post = load('hot_file_ownership.pre_h2.json'), load('hot_file_ownership.json')
raw_pre, raw_post = load('wp_raw_map.pre_h2.json'), load('wp_raw_map.json')
PRE = {p['wp_id']: p for p in pre['packages']}
POST = {p['wp_id']: p for p in post['packages']}
unattributed = []

# 0. the files on disk are the generator's output (so the in-memory log describes them)
for name, disk, gen in (('wp_canonical.json', post, B.canonical), ('hot_file_ownership.json', hot_post, B.hot_doc),
                        ('wp_raw_map.json', raw_post, B.raw_map)):
    if disk != norm(gen):
        unattributed.append('%s on disk differs from a fresh k3_build.py run' % name)

# 1. the op log, in application order, beside the ops that produced it
LOG = list(B.F8_LOG)
pkg_ops = list(K.package_ops())
pkg_log = [e for e in LOG if e['field'] != '(package)' and not e['pkg'].startswith('K3 ')]
rule_log = [e for e in LOG if e['pkg'].startswith('K3 ')]
assert len(pkg_log) == len(pkg_ops) and len(rule_log) == len(K.RULE_OPS), 'log and ops disagree'
for e, (cid, op) in zip(pkg_log, pkg_ops):
    assert (e['cid'], e['pkg'], e['field']) == (cid, op['pkg'], op['field']), (e, cid, op)

applied = collections.OrderedDict()


def put(cid, pkg, key, old, new, derived=None):
    slot = applied.setdefault(cid, collections.OrderedDict()).setdefault(pkg, collections.OrderedDict())
    if key in slot:                      # two ops of one row on one item: keep the first old, the last new
        slot[key]['new'] = new
        slot[key]['ops'] = slot[key].get('ops', 1) + 1
    else:
        slot[key] = {'old': old, 'new': new}
        if derived:
            slot[key]['derived'] = derived


for e in LOG:
    if e['status'] != 'applied':
        unattributed.append('op logged as %s: %s %s %s' % (e['status'], e['cid'], e['pkg'], e['field']))
        continue
    if e['field'] == '(package)':
        put(e['cid'], e['pkg'], '(package added)', None, POST[e['pkg']])
    elif e['pkg'].startswith('K3 '):
        put(e['cid'], 'K3 rules', '%s %s' % (e['pkg'][3:], e['field']), e['old'], e['new'])
    elif e['kind'] in ('list_sub', 'source_note'):
        put(e['cid'], e['pkg'], '%s[%d]' % (e['field'], e['index']), e['old'], e['new'])
    elif e['kind'] == 'list_add':
        put(e['cid'], e['pkg'], '%s[%d] (added)' % (e['field'], e['index']), None, e['new'])
    else:
        put(e['cid'], e['pkg'], e['field'], e['old'], e['new'])

# 2. fields K3 derives from a correction, attributed to the row that caused them
TARGET_KINDS = ('vv_targets', 'tv_targets', 'hot_files')
DERIVED = collections.defaultdict(dict)      # pkg -> field -> cid
for cid, op in pkg_ops:
    if op['field'] in TARGET_KINDS:
        for f in ('edits', 'file_count'):
            DERIVED[op['pkg']].setdefault(f, cid)
    if op['field'] == 'split_justification':
        for f in ('size', 'size_note'):
            DERIVED[op['pkg']][f] = cid
DERIVED['W5-99'].update({'depends_on': 'C33', 'auto_added_depends_on': 'C33'})
NOTE = 'recomputed by k3_build.py from the corrected record'

replayed = 0
for w, old in PRE.items():
    new = POST.get(w)
    if new is None:
        unattributed.append('package %s removed' % w)
        continue
    r = copy.deepcopy(old)
    for cid, op in pkg_ops:
        if op['pkg'] == w:
            K._apply(r, op, cid)
    for f, cid in DERIVED.get(w, {}).items():
        if old.get(f) != new.get(f):
            put(cid, w, f, old.get(f), new.get(f), NOTE)
        r[f] = new.get(f)
        if new.get(f) is None:
            r.pop(f, None)
    if 'f8_corrections' in new:
        r['f8_corrections'] = new['f8_corrections']
    if r != new:
        bad = sorted(k for k in set(r) | set(new) if r.get(k) != new.get(k))
        unattributed.append('package %s: fields %s differ from the replay' % (w, bad))
    else:
        replayed += 1
for w in POST:
    if w not in PRE and w != K.PROPOSED_ID:
        unattributed.append('package %s added without a correction' % w)

# 3. K3 rule texts: replay the rule ops on the pre-H2 lists
rules = {'swarm_rules': list(pre['swarm_rules']), 'standard_gates': list(pre['standard_gates'])}
for cid, op in K.RULE_OPS:
    lst = rules[op['list']]
    i = K.rule_index(lst, op['rule'])
    holder = {'wp_id': 'K3', op['field']: lst[i]}
    K._apply(holder, op, cid)
    lst[i] = holder[op['field']]
for k in rules:
    if rules[k] != post[k]:
        unattributed.append('%s differ from the replay of RULE_OPS' % k)

# 4. top-level fields K3 derives (critical path, waves, topological order)
derived = collections.OrderedDict()
topo_old, topo_new = pre['topological_order'], post['topological_order']
if [x for x in topo_new if x != K.PROPOSED_ID] != topo_old:
    unattributed.append('topological order of the pre-H2 packages changed')
derived['topological_order'] = {'cause': 'C33', 'old_count': len(topo_old), 'new_count': len(topo_new),
                                 'change': 'W5-07 inserted at position %d (after %s, before %s); every other package keeps its order'
                                           % (topo_new.index('W5-07') + 1, topo_new[topo_new.index('W5-07') - 1], topo_new[topo_new.index('W5-07') + 1])}
cp_old, cp_new = pre['critical_path'], post['critical_path']
derived['critical_path'] = {'cause': 'C33 (W5-07 lies on the W5 chain W5-01 -> W5-05 -> W5-07 -> W5-99)',
                            'by_est_lines': {'old': {'est_lines': cp_old['by_est_lines']['est_lines'], 'packages': len(cp_old['by_est_lines']['path'])},
                                             'new': {'est_lines': cp_new['by_est_lines']['est_lines'], 'packages': len(cp_new['by_est_lines']['path'])}},
                            'by_package_count': {'old': cp_old['by_package_count']['packages'], 'new': cp_new['by_package_count']['packages']},
                            'per_wave_changed': {w: {'old': cp_old['per_wave'][w], 'new': cp_new['per_wave'][w]}
                                                 for w in cp_old['per_wave'] if cp_old['per_wave'][w] != cp_new['per_wave'][w]},
                            'truevision_lane_unchanged': cp_old['truevision_lane'] == cp_new['truevision_lane']}
wv_old = {x['wave']: x for x in pre['waves']}
wv_new = {x['wave']: x for x in post['waves']}
derived['waves'] = {w: {k: {'old': wv_old[w][k], 'new': wv_new[w][k]} for k in wv_old[w] if wv_old[w][k] != wv_new[w][k]}
                    for w in wv_old if wv_old[w] != wv_new[w]}
derived['waves']['cause'] = 'W0: C12 (W0-03 sized XL by its 16 files); W5: C33 (W5-07, 250 lines)'
for k in sorted(set(pre) | set(post)):
    if k in ('packages', 'swarm_rules', 'standard_gates', 'topological_order', 'critical_path', 'waves', 'f8_corrections'):
        continue
    if pre.get(k) != post.get(k):
        unattributed.append('top-level %s changed' % k)
if 'f8_corrections' not in post:
    unattributed.append('wp_canonical.json has no f8_corrections block')

# 5. hot_file_ownership.json
HP = {h['file']: h for h in hot_pre['files']}
HN = {h['file']: h for h in hot_post['files']}
hot_changes = collections.OrderedDict()
CAUSE = {'W5-07': 'C33', 'W2-05': 'C20'}
for f in sorted(set(HP) | set(HN)):
    a, b = HP.get(f), HN.get(f)
    if a == b:
        continue
    if a is None:
        cause = 'C20' if b['editors'] == ['W1-10', 'W2-05'] else None
    elif b is None:
        cause = None
    else:
        added = [x for x in b['editors'] if x not in a['editors']]
        cause = CAUSE.get(added[0]) if len(added) == 1 and [x for x in b['editors'] if x != added[0]] == a['editors'] else None
    if not cause:
        unattributed.append('hot file %s changed without a correction' % f)
        continue
    hot_changes.setdefault(cause, collections.OrderedDict())[f] = {
        'old': None if a is None else {'editors': a['editors'], 'rule': a['rule']},
        'new': {'editors': b['editors'], 'rule': b['rule']}}
for k in hot_pre:
    if k not in ('files', 'counts') and hot_pre[k] != hot_post[k]:
        unattributed.append('hot_file_ownership %s changed' % k)
derived['hot_file_counts'] = {'old': hot_pre['counts'], 'new': hot_post['counts'], 'cause': 'C20 (the elevation data module becomes a hot file)'}

# 6. wp_raw_map.json: only the package count may change
for k in raw_pre:
    if k == 'coverage':
        diff = {x for x in raw_pre[k] if raw_pre[k][x] != raw_post[k][x]}
        if diff - {'canonical_packages'}:
            unattributed.append('wp_raw_map coverage changed: %s' % sorted(diff))
    elif raw_pre[k] != raw_post[k]:
        unattributed.append('wp_raw_map %s changed' % k)
derived['wp_raw_map'] = {'coverage.canonical_packages': {'old': raw_pre['coverage']['canonical_packages'],
                                                         'new': raw_post['coverage']['canonical_packages']},
                         'cause': 'C33', 'every raw id maps as before': True}

# 7. one line per F.8 row (step 1 of H2: the correction, the packages and fields it changes)
ITEMS = collections.OrderedDict((c[0], c[1]) for c in T.CORRECTIONS)
for c in K.CORRECTIONS:
    ITEMS[c['id']] = c['item']
ITEMS[K.PROPOSED['id']] = K.PROPOSED['item']
ITEMS = collections.OrderedDict(sorted(ITEMS.items(), key=lambda kv: int(kv[0][1:])))   # H1: C34-C36 follow C33
rows = collections.OrderedDict()
for cid, item in ITEMS.items():
    ch = applied.get(cid, {})
    fields = ['%s %s' % (pkg, key) for pkg, keys in ch.items() for key in keys]
    rows[cid] = {
        'item': item,
        'status': 'nothing to apply' if cid in K.NOT_APPLICABLE else 'applied',
        'packages': sorted(p for p in ch if p != 'K3 rules'),
        'k3_rules': sorted(ch.get('K3 rules', {})),
        'fields': fields,
        'hot_file_ownership': sorted(hot_changes.get(cid, {})),
        'json_line': K.json_line(cid),
    }
    if cid in K.NOT_APPLICABLE:
        rows[cid]['reason'] = K.NOT_APPLICABLE[cid]
    elif not ch:
        unattributed.append('row %s is marked applied but changed nothing' % cid)

record = collections.OrderedDict([
    ('id', 'H2'),
    ('applied', K.APPLIED_TO_JSON),
    ('description', 'Every Section F (R6) F.8 correction (rows C1-C33, and C34-C36 that H1 added) as applied to the K3 artefacts on 01-Oct-2026 by k3_build.py through '
                    'k3_f8_corrections.py (ops in r6_corrections.py). "applied" maps correction id -> package -> field -> {old, new}; '
                    'a list field is keyed field[n] (1-based item; "(added)" for an appended item); fields marked "derived" are recomputed by '
                    'K3 from the corrected record; "K3 rules" are the swarm_rules / standard_gates texts. Two ops of one row on one item keep the '
                    'first old and the last new text ("ops": 2).'),
    ('files', {'corrected': ['data/wp_canonical.json', 'data/hot_file_ownership.json', 'data/wp_raw_map.json', 'report/K3__WorkPackages.md'],
               'before': ['data/wp_canonical.pre_h2.json', 'data/hot_file_ownership.pre_h2.json', 'data/wp_raw_map.pre_h2.json',
                          'report/K3__WorkPackages.pre_h2.md'],
               'generator': ['report/tools/k3_build.py', 'report/tools/k3_f8_corrections.py', 'report/tools/r6_corrections.py']}),
    ('summary', {'rows': len(rows),
                 'rows_applied': [c for c, r in rows.items() if r['status'] == 'applied'],
                 'rows_with_nothing_to_apply': [c for c, r in rows.items() if r['status'] != 'applied'],
                 'ops_logged': len(LOG),
                 'packages_corrected': sorted({p for c in applied.values() for p in c if p not in ('K3 rules', K.PROPOSED_ID, 'W5-99')}),
                 'packages_added': [K.PROPOSED_ID],
                 'packages_with_derived_changes_only': ['W5-99'],
                 'k3_rules_amended': list(dict.fromkeys(op['rule'] for _, op in K.RULE_OPS)),
                 'packages_replayed_exactly': replayed}),
    ('rows', rows),
    ('applied', applied),
    ('hot_file_ownership', hot_changes),
    ('derived', derived),
    ('package_rows', {w: p['f8_corrections'] for w, p in POST.items() if p.get('f8_corrections')}),
    ('unattributed', unattributed),
])
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(record, f, indent=1, ensure_ascii=False)
s = record['summary']
print('wrote', OUT)
print('rows applied %d, nothing to apply %s; ops %d; packages corrected %d + added %s; rules %s; replayed exactly %d of %d'
      % (len(s['rows_applied']), s['rows_with_nothing_to_apply'], s['ops_logged'], len(s['packages_corrected']), s['packages_added'],
         s['k3_rules_amended'], replayed, len(PRE)))
print('unattributed:', unattributed or 'none')
sys.exit(1 if unattributed else 0)
