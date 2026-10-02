#!/usr/bin/env python3
"""R2 Section B - TV-only modules VV gains, counted by system, from K3's canonical packages.

A TV-only file (no VV twin at its K2 target path) is GAINED when a VV-wave K3 package
(W0-W6, not WT) names it in tv_sources. Directory sources (ending '/') count every TV-only
file under them. Everything else is NOT GAINED and is classified by the K2/K1 reason.
Reads tools/out/r2b_extract.json and data/wp_canonical.json; writes tools/out/r2b_tvonly.json.
"""
import json
import os
import re
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.abspath(__file__))
PARITY = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
X = json.load(open(os.path.join(OUT, 'r2b_extract.json'), encoding='utf-8'))
K3 = json.load(open(os.path.join(PARITY, 'data', 'wp_canonical.json'), encoding='utf-8'))
M = '02__Src__AppModules/'
LE = M + '51__System__LayoutEditor/'


def norm(p):
    p = p.strip()
    p = re.sub(r'\s*\(.*?\)\s*$', '', p)       # drop trailing "(names and signatures only)" etc.
    p = p.replace('TVM/', M).replace('TV/', '')
    return p


src_owner = defaultdict(set)    # VV target path or dir (TV-relative after W0-02) -> wp ids
for pk in K3['packages']:
    if pk['wave'] == 'WT':
        continue
    for s in pk.get('vv_targets', []) or []:
        if '->' in s:
            continue
        t = s.strip()
        t = re.sub(r'\s*\((?:new|verbatim|deleted)[^)]*\)\s*$', '', t)
        if '(deleted)' in s:
            continue
        t = re.sub(r'\s*\(.*?\)\s*$', '', t)
        t = t.replace('VVM/', M).replace('VV/', '')
        src_owner[t].add(pk['wp_id'])


def owners(rel):
    out = set(src_owner.get(rel, set()))
    for k, v in src_owner.items():
        if k.endswith('/') and rel.startswith(k):
            out |= v
    return out


def system(rel):
    if rel.startswith(LE):
        rest = rel[len(LE):].split('/')
        return '51 LE/' + (rest[0] if len(rest) > 1 else '(root)')
    if rel.startswith(M):
        return rel[len(M):].split('/')[0]
    return rel.split('/')[0]


NOT_GAINED_REASON = [
    (r'^02__Src__AppModules/41__System__SectionCutEngine/', 'DIV-2: TV cut engine; VV keeps 41__System__CrossSectionView (DR-26, DR-41)'),
    (r'Na__DrawView__ProfileLines__\.js$', 'DIV-1: VV keeps 05 2dProfileLines + LineworkSettings (K2 s.7)'),
    (r'Na__RenderPipeline__PostProcessing__Setup\.js$', 'DIV-1: VV dual engine 05/01__Engine__PureEngine + 02__Engine__MaxEngine'),
    (r'^02__Src__AppModules/62__Feature__AppInstallability/', 'VV uses the shared Whitecardopedia PWA (K2 TF-T46, DR-07)'),
    (r'^02__Src__AppModules/75__System__UserInstructionsSystem/', 'Not ported for drawing parity (DR-44)'),
    (r'^02__Src__AppModules/76__System__FullscreenMode/', 'VV keeps 60__Feature__FullScreenMode (DR-44)'),
    (r'Na__Hotkeys__Manager\.js$', 'Twin kept apart: VV 03 Na__AppUtils__ValeVision__HotkeyHandler__ (DR-33)'),
    (r'Na__AppLoader__ProjectDataLoader__\.js$', 'TV placeholder file (S12-F44)'),
    (r'Na__UiFeature__ModelGroup(Selector|TransitionOverlay__)\.js$', 'DR-09: no Design Phase menu in VV'),
    (r'^02__Src__AppModules/27__System__ContextMenuSystem/', 'DR-44: TV 3D right-click menu not ported (renderer and styles only, W4-11)'),
    (r'Na__UiFeature__Styles__PwaInstallability__\.css$', 'VV uses the shared Whitecardopedia PWA (DR-07)'),
    (r'Na__UiFeature__Styles__SceneInspector__\.css$', 'FR-24 optional split, not recommended (DR-44, W5-04 on request)'),
]


def reason(rel):
    for rx, why in NOT_GAINED_REASON:
        if re.search(rx, rel):
            return why
    return ''


rows = []
for rel in X['tv_only']:
    if not (rel.startswith(M) or rel.startswith('03__Style__AppStylesheets/')):
        continue
    rec = X['tv'][rel]
    own = sorted(owners(rel))
    rows.append({'tv': rel, 'system': system(rel), 'lines': rec.get('lines', 0), 'ext': rec.get('ext'),
                 'gained_by': own, 'gained': bool(own), 'reason': '' if own else reason(rel)})

by = defaultdict(lambda: Counter())
lines = defaultdict(lambda: Counter())
for r in rows:
    k = 'gained' if r['gained'] else ('not_gained_reasoned' if r['reason'] else 'not_gained_unowned')
    by[r['system']][k] += 1
    lines[r['system']][k] += r['lines']
json.dump({'rows': rows, 'by_system': {k: dict(v) for k, v in by.items()},
           'lines_by_system': {k: dict(v) for k, v in lines.items()}},
          open(os.path.join(OUT, 'r2b_tvonly.json'), 'w', encoding='utf-8'), indent=1)

tot = Counter()
for s in sorted(by):
    c = by[s]
    tot.update(c)
    print('%-48s gained %3d (%6d lines) | reasoned-not %3d | unowned %3d' % (
        s, c['gained'], lines[s]['gained'], c['not_gained_reasoned'], c['not_gained_unowned']))
print('TOTAL', dict(tot))
print('\nUnowned TV-only files (no VV-wave package names them):')
for r in rows:
    if not r['gained'] and not r['reason']:
        print('   ', r['tv'], r['lines'])
