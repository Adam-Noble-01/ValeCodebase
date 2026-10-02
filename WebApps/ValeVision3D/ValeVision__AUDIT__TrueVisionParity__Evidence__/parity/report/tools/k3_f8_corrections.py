# -*- coding: utf-8 -*-
"""K3 - the Section F (R6) F.8 corrections layer, applied by k3_build.py (H2, 01-Oct-2026).

Section F of the parity report corrects K3 in its F.8 rows C1-C36 (C34-C36 added by H1 on 01-Oct-2026). Until 01-Oct-2026 they were only
overlaid on Section F's rendering, so the JSON a swarm agent reads was behind the plan. H2 makes
k3_build.py apply them to the catalogue itself, so wp_canonical.json, hot_file_ownership.json,
wp_raw_map.json and K3__WorkPackages.md carry them:

  * package text and target ops, and the planner steps (C12's split_justification, C20's hot-file
    slots), come from r6_corrections.py - the one source of the F.8 rows - and are applied with its
    own _apply, so the JSON reads exactly as the rows say: a changed line ends in [F.8 Cn], an added
    target, hot file or source note carries (F.8 Cn); each package lists its rows in f8_corrections;
  * the K3 rule texts F.8 changes (swarm rules R3, R5, R8, R11 and gate G4) come from
    r6_corrections.RULE_OPS;
  * C33's new package W5-07 is defined here (K3-derived: no raw package carries it).

Every op is guarded: it applies when its old text is present, is skipped (and logged as such) when its
new text is already there, and stops the build when neither holds - a stale correction is never
applied silently. LOG lists every op as applied; h2_record_corrections.py turns it into
data/wp_corrections_applied.json.

K3_NO_F8=1 in the environment builds K3 without this layer: the generator then reproduces the pre-H2
catalogue (data/*.pre_h2.json), which is how H2 showed that only the corrections changed.

Every fact in W5-07 was checked on 01-Oct-2026, read-only (VV at 7b4e593a, TV at b2aa9151).
"""
import copy
import os

import k3_common as C
import r6_corrections as K

ENABLED = os.environ.get('K3_NO_F8') != '1'
APPLIED = K.APPLIED_TO_JSON
LOG = []

W5_07 = K.PROPOSED_ID                                   # F.8 C33
W5_07_HARD_GATE = ("Runs only if Adam answers DR-25 'retire' when W4-09 re-decides it at the publishing port "
                   "(DR-25 default (a): the per-project Layout Mode switch stays); otherwise the integrator marks it "
                   "SKIPPED-HELD (F.4.2 step 6) and DR-25 (a) stands.")

if ENABLED:
    C.P(W5_07, 'W5',
        'Retire the Layout Mode switch (only if DR-25 is answered retire at W4-09)',
        "Only on Adam's 'retire' answer to DR-25 when W4-09 re-decides it: remove VV's per-project Layout Mode switch so the "
        "drawing tabs follow TrueVision's rule - shown when the Layout Editor is enabled in config and the project has at least "
        "one sheet (TV TabStrip :316) - here and on the live site, where W4-09's published-only viewer keeps unfinished sheets "
        "from clients.",
        tv=[C.TLE('05__Core__ModeController/Na__LayoutEditor__TabStrip__.js (reference only: the visibility rule at :316)')],
        vv=[C.PD + ' (drop LAYOUT_MODE_KEY and Get/SetLayoutModeEnabled; the stored key stays in existing project.json files, never read or written again)',
            C.MC + " (IsAvailable on TV's rule; drop IsLayoutModeOn and SetLayoutMode)",
            C.LDR + ' (IsAvailable on the same rule from the raw block; drop its two Layout Mode exports)',
            C.TABS + ' (visibility exactly TV :316, through the facade)',
            C.DEVMENU + ' (Layout Mode row removed)',
            C.AC + ' (the three LayoutMode labels removed)'],
        hot=[C.PD, C.MC, C.LDR, C.TABS, C.DEVMENU, C.AC],
        deps=['W5-03', 'W5-05'],
        gated=['DR-22', 'DR-25'],
        size='S', est=250,
        est_note="F.8 C33's estimate, not K3's: about 250 lines of removals and one visibility rule over six files",
        adapt=[
            'ProjectData (VV :112, :323-331, :487-488 at 7b4e593a): delete Na__DrawData__LAYOUT_MODE_KEY, Na__DrawData__GetLayoutModeEnabled '
            'and Na__DrawData__SetLayoutModeEnabled and their exports; a stored LayoutEditor__DrawingsData__LayoutModeEnabled stays in existing '
            'project.json files and is never read or written again.',
            "ModeController: Na__LeMode__IsAvailable (VV :327-330) takes TV's rule, Na__LeCfg__IsEnabled() and at least one sheet (TV TabStrip :316); "
            'delete Na__LeMode__IsLayoutModeOn and Na__LeMode__SetLayoutMode (VV :336, :347; exports :901-902).',
            'Loader: Na__LeLoad__IsAvailable (VV :503-507) answers the same rule from the raw block before the editor has loaded; delete '
            'Na__LeLoad__IsLayoutModeOn (:512) and Na__LeLoad__SetLayoutMode (:614) and their exports.',
            'TabStrip: the strip is visible exactly as TV :316 (Na__LeCfg__IsEnabled() && sheets.length > 0), read through the loader facade '
            '(Na__LeLoad__IsAvailable).',
            'Dev menu Controls: delete the Layout Mode row (Na__LeDev__BuildLayoutModeSwitch, VV :258-280, mounted at :325), the off branch that '
            'hides the sheet list (:327-334) and the two loader imports (:97-98). LE AppConfig: delete LayoutEditor__Labels__LayoutModeLabel, '
            'LayoutModeHint and LayoutModeOffNote (VV :502-504).',
            "Each file's PORT NOTE Divergences line for the Layout Mode switch is deleted (the switch is VV-only; nothing is ported from TV).",
        ],
        acc=[
            'On a project whose stored Layout Mode switch is off, the strip shows when Na__LeCfg__IsEnabled() and at least one sheet hold, '
            'exactly as TV TabStrip :316.',
            'The live site still shows clients published drawings only (W4-09).',
            'G1 and G2 pass with no importer of a removed name (Na__DrawData__GetLayoutModeEnabled, Na__DrawData__SetLayoutModeEnabled, '
            'Na__LeMode__IsLayoutModeOn, Na__LeMode__SetLayoutMode, Na__LeLoad__IsLayoutModeOn, Na__LeLoad__SetLayoutMode).',
            'The Layout Mode PORT NOTE Divergences lines are deleted, and no LayoutMode label remains in the LE AppConfig.',
            "Adam's W5 smoke item 3 (F.5.4) passes for W5-07.",
        ],
        tests=[], src=[],
        risk="Low: removals and one visibility rule. A project whose switch was off gains its drawing tabs once it has a sheet "
             "(TV's rule, the intended change); W4-09's published-only viewer keeps unfinished sheets from clients.",
        notes=["Added from R6 F.8 C33 on 01-Oct-2026 (H2); K3-derived, no raw package carries it. DR-25 (a) keeps the switch now and "
               "recommends retiring it at the publishing port (DR-22); W4-09 records the re-decision, and only a 'retire' answer releases "
               "W5-07 (otherwise SKIPPED-HELD, F.4.2 step 6)."])


def _entry(cid, pkg, field, op, before, after):
    """One LOG entry: the changed list item (1-based) or the whole string, before and after."""
    k = op['kind']
    e = {'cid': cid, 'pkg': pkg, 'field': field, 'kind': k, 'index': None, 'old': None, 'new': None, 'status': 'applied'}
    if before == after:
        e['status'] = 'already present (skipped)'
        return e
    if k in ('list_sub', 'source_note'):
        i = op['index']
        e.update(index=i, old=before[i - 1], new=after[i - 1])
    elif k == 'list_add':
        e.update(index=len(after), old=None, new=after[-1])
    else:
        e.update(old=before, new=after)
    return e


def apply(cat):
    """Apply every F.8 op to the catalogue; k3_build.py calls this after it has set the hard gates."""
    if not ENABLED:
        return LOG
    by = {p['wp_id']: p for p in cat}
    by[W5_07]['hard_gate'] = W5_07_HARD_GATE
    by[W5_07]['f8_corrections'] = [K.PROPOSED['id']]
    LOG.append({'cid': K.PROPOSED['id'], 'pkg': W5_07, 'field': '(package)', 'kind': 'add_package', 'index': None,
                'old': None, 'new': 'W5-07 defined in k3_f8_corrections.py', 'status': 'applied'})
    for cid, op in K.package_ops():
        p = by[op['pkg']]
        field = op['field']
        before = copy.deepcopy(p.get(field))
        K._apply(p, op, cid)                       # raises when the correction has gone stale
        LOG.append(_entry(cid, op['pkg'], field, op, before, copy.deepcopy(p.get(field))))
        rows = p.setdefault('f8_corrections', [])
        if cid not in rows:
            rows.append(cid)
    for cid, op in K.RULE_OPS:
        rules = C.SWARM_RULES if op['list'] == 'swarm_rules' else C.STANDARD_GATES
        i = K.rule_index(rules, op['rule'])
        holder = {'wp_id': 'K3 ' + op['rule'], op['field']: rules[i]}
        before = rules[i]
        K._apply(holder, op, cid)
        rules[i] = holder[op['field']]
        LOG.append(_entry(cid, 'K3 ' + op['list'], op['rule'], op, before, rules[i]))
    for p in cat:
        if p.get('f8_corrections'):
            p['f8_corrections'] = sorted(p['f8_corrections'], key=lambda c: int(c[1:]))
    return LOG


def meta():
    """The f8_corrections block of wp_canonical.json."""
    if not ENABLED:
        return None
    applied = sorted({e['cid'] for e in LOG if e['status'] == 'applied'}, key=lambda c: int(c[1:]))
    return {
        'applied': APPLIED,
        'by': 'H2 (k3_build.py through k3_f8_corrections.py); rows C34-C36 added by H1 (01-Oct-2026) and applied the same way',
        'rows': 'Section F (report/R6__F_SwarmDelegationPlan.md), F.8 rows C1-C%d' % max(int(c['id'][1:]) for c in K.CORRECTIONS),
        'ops': 'report/tools/r6_corrections.py (EARLIER_ROW_OPS, CORRECTIONS, PLANNER_OPS, RULE_OPS); W5-07 in report/tools/k3_f8_corrections.py',
        'record': 'data/wp_corrections_applied.json (correction -> package -> field -> old -> new)',
        'baseline': 'data/wp_canonical.pre_h2.json, data/hot_file_ownership.pre_h2.json, data/wp_raw_map.pre_h2.json',
        'marks': 'a changed line ends in [F.8 Cn]; an added target, hot file or source note carries (F.8 Cn); '
                 'each corrected package lists its rows in f8_corrections',
        'rows_applied': applied,
        'rows_with_nothing_to_apply': {c: K.NOT_APPLICABLE[c] for c in sorted(K.NOT_APPLICABLE, key=lambda c: int(c[1:]))},
        'packages_added': [W5_07],
        'rules_amended': list(dict.fromkeys(op['rule'] for _, op in K.RULE_OPS)),
    }
