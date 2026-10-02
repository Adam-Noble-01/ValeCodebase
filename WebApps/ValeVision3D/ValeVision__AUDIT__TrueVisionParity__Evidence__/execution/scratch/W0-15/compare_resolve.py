"""Compare two keymap_resolve.mjs outputs (read-only).

Usage: python compare_resolve.py <before.json> <after.json>

Prints:
  1. fallback parity inside each file (file vs built-in fallback),
  2. every press whose resolution changed from before (file) to after (file),
     classified: NEW (unbound -> action), LOST (action -> unbound), CHANGED,
  3. the same for the fallback (before fallback -> after fallback),
  4. the non-keyboard answers (pointer, wheel, selection, guards, setups).
"""
import json
import sys

# Actions VV's current keyboard switches handle (SheetTools__Keyboard__ :383-473,
# Controls__Pc__ RunKeyAction :183-190, ModeController OnSaveKey :633).
HANDLED = {
    'Edit__Cancel', 'Edit__Deselect', 'Edit__Finish', 'Edit__Delete', 'Edit__NudgeLeft', 'Edit__NudgeRight',
    'Edit__NudgeUp', 'Edit__NudgeDown', 'Tool__SelectToggle', 'Tool__Select', 'Tool__Move', 'Tool__Text',
    'Tool__Dimension', 'Tool__Draw', 'Tool__Rectangle', 'Tool__Leader', 'Tool__Eyedropper', 'Tool__EyedropperPalette',
    'Snap__Toggle', 'Edit__Undo', 'Edit__Redo', 'Edit__Copy', 'Edit__Paste', 'Edit__Duplicate', 'Edit__Group',
    'Edit__Ungroup', 'Nav__ZoomFit', 'Nav__ZoomActualSize', 'Nav__ZoomIn', 'Nav__ZoomOut', 'Nav__PanLeft',
    'Nav__PanRight', 'Nav__PanUp', 'Nav__PanDown', 'Edit__Save',
}


def base(a):
    return a.split('+coarse')[0]


def parity(name, d):
    fk, bk = d['file']['keys'], d['fallback']['keys']
    diff = [k for k in fk if fk[k] != bk.get(k)]
    print('[%s] file vs fallback: %d presses, %d differ' % (name, len(fk), len(diff)))
    for k in diff[:60]:
        print('    %-28s file %-28s fallback %s' % (k, fk[k], bk.get(k)))
    rest_diff = [k for k in d['file']['rest'] if d['file']['rest'][k] != d['fallback']['rest'][k] and k not in ('catalogue',)]
    print('[%s] non-keyboard answers differing file vs fallback: %s' % (name, rest_diff))
    return diff


def change(label, a, b):
    news, lost, changed = [], [], []
    for k in sorted(set(a) | set(b)):
        x, y = a.get(k), b.get(k)
        if x is None or y is None or x == y:
            continue
        if x == '-':
            news.append((k, y))
        elif y == '-':
            lost.append((k, x))
        else:
            changed.append((k, x, y))
    print('\n== %s: NEW %d, LOST %d, CHANGED %d' % (label, len(news), len(lost), len(changed)))
    for k, y in news:
        flag = '  <-- HANDLED by VV today' if base(y) in HANDLED else ''
        print('  NEW     %-28s -> %s%s' % (k, y, flag))
    for k, x in lost:
        flag = '  <-- WAS HANDLED' if base(x) in HANDLED else ''
        print('  LOST    %-28s %s -> -%s' % (k, x, flag))
    for k, x, y in changed:
        flag = ''
        if base(x) in HANDLED or base(y) in HANDLED:
            flag = '  <-- HANDLED action involved'
        print('  CHANGED %-28s %s -> %s%s' % (k, x, y, flag))
    return news, lost, changed


def main():
    before = json.load(open(sys.argv[1], encoding='utf-8'))
    after = json.load(open(sys.argv[2], encoding='utf-8'))
    parity('before', before)
    parity('after', after)
    change('file: before -> after', before['file']['keys'], after['file']['keys'])
    change('fallback: before -> after', before['fallback']['keys'], after['fallback']['keys'])
    print('\n== non-keyboard answers, file: before -> after')
    for k in after['file']['rest']:
        if before['file']['rest'].get(k) != after['file']['rest'][k]:
            print('  %s\n     before %s\n     after  %s' % (k, json.dumps(before['file']['rest'].get(k))[:600], json.dumps(after['file']['rest'][k])[:600]))


if __name__ == '__main__':
    main()
