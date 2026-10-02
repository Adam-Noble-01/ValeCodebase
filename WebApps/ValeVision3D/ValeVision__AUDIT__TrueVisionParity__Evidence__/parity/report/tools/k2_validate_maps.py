#!/usr/bin/env python3
"""Standalone validator for the two K2 maps (no live-tree access needed).

Checks that parity/data/target_folder_map.json and parity/data/file_rename_map.json
parse, carry every required field with the right type, use only the allowed
scope / action / kind values, cite only decision ids that exist in
decisions.json, never give two rows the same target, and that every VV-only
top-level folder moved to a new number lands outside TrueVision's current list.
Exit 0 = valid.
"""
import json, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, '..', '..', 'data'))
TV_TOP_NUMS = {'01', '02', '03', '04', '05', '06', '07', '10', '11', '15', '20', '21', '25', '26', '27', '30', '40', '41', '42', '43',
               '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '62', '70', '75', '76', '80'}

TF_REQ = {'id': str, 'scope': str, 'current_vv': (str, type(None)), 'target_vv': (str, type(None)), 'tv_equivalent': (str, type(None)),
          'action': str, 'reason': str, 'importers_to_update': dict, 'config_paths_to_update': list, 'risk': str,
          'decision_refs': list, 'evidence': list}
FR_REQ = {'id': str, 'current_vv': (str, type(None)), 'target_vv': (str, type(None)), 'tv_twin': (str, type(None)), 'kind': str,
          'reason': str, 'importers': list, 'risk': str, 'decision_refs': list}
SCOPES = {'top', 'le_sub', 'root_content', 'style'}
ACTIONS = {'keep', 'renumber', 'rename', 'move', 'merge', 'retire', 'add', 'add_later'}
KINDS = {'rename', 'move', 'merge', 'retire', 'shim'}


def main():
    errs = []
    tf = json.load(open(os.path.join(DATA, 'target_folder_map.json'), encoding='utf-8'))
    fr = json.load(open(os.path.join(DATA, 'file_rename_map.json'), encoding='utf-8'))
    dec = {d['id'] for d in json.load(open(os.path.join(DATA, 'decisions.json'), encoding='utf-8'))}
    if not isinstance(tf, list) or not isinstance(fr, list):
        errs.append('both maps must be JSON arrays')
    for rows, req, name in ((tf, TF_REQ, 'target_folder_map'), (fr, FR_REQ, 'file_rename_map')):
        ids = Counter(r.get('id') for r in rows)
        for i, n in ids.items():
            if n > 1:
                errs.append('%s duplicate id %s' % (name, i))
        for r in rows:
            for k, t in req.items():
                if k not in r:
                    errs.append('%s %s missing %s' % (name, r.get('id'), k))
                elif not isinstance(r[k], t):
                    errs.append('%s %s field %s has type %s' % (name, r.get('id'), k, type(r[k]).__name__))
            for d in r.get('decision_refs', []):
                if d not in dec:
                    errs.append('%s %s unknown decision %s' % (name, r.get('id'), d))
    for r in tf:
        if r['scope'] not in SCOPES:
            errs.append('%s bad scope %s' % (r['id'], r['scope']))
        if r['action'] not in ACTIONS:
            errs.append('%s bad action %s' % (r['id'], r['action']))
        if r['action'] in ('renumber', 'rename', 'move', 'add', 'add_later') and not r['target_vv']:
            errs.append('%s action %s needs a target_vv' % (r['id'], r['action']))
        if r['action'] == 'retire' and r['target_vv']:
            errs.append('%s retire must have target_vv null' % r['id'])
        if r['scope'] == 'top' and r['action'] == 'renumber' and r['tv_equivalent'] is None:
            n = re.match(r'^02__Src__AppModules/(\d\d)__', r['target_vv'])
            if n and n.group(1) in TV_TOP_NUMS:
                errs.append('%s VV-only folder lands on a TV number %s' % (r['id'], n.group(1)))
    targets = Counter(r['target_vv'] for r in tf if r['target_vv'])
    for t, n in targets.items():
        if n > 1:
            errs.append('target_folder_map target used %d times: %s' % (n, t))
    for r in fr:
        if r['kind'] not in KINDS:
            errs.append('%s bad kind %s' % (r['id'], r['kind']))
        if r['kind'] == 'retire' and r['target_vv']:
            errs.append('%s retire must have target_vv null' % r['id'])
        if r['kind'] in ('rename', 'move', 'shim') and not r['target_vv']:
            errs.append('%s %s needs a target_vv' % (r['id'], r['kind']))
    print('target_folder_map: %d rows %s' % (len(tf), dict(Counter((r['scope'], r['action']) for r in tf))))
    print('file_rename_map:   %d rows %s' % (len(fr), dict(Counter(r['kind'] for r in fr))))
    if errs:
        print('INVALID (%d):' % len(errs))
        for e in errs:
            print('  ' + e)
        sys.exit(1)
    print('VALID')


if __name__ == '__main__':
    main()
