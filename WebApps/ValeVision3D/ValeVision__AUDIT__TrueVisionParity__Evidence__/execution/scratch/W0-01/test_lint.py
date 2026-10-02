"""Negative tests for gen_and_patch.markdown_lint: each bad sample must fail, each good one pass."""
import importlib.util, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gp', os.path.join(HERE, 'gen_and_patch.py'))
gp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gp)

canon = json.load(io.open(os.path.join(gp.EVID, 'parity', 'data', 'wp_canonical.json'), encoding='utf-8'))
g3 = canon['standard_gates'][2]
g4 = canon['standard_gates'][3]

bad = [
    '- ' + g3,                                   # <VV app root> is a raw HTML tag
    '- ' + g4,                                   # __PLAN__ renders bold
    'text <span class="x"> more',
    'a word __bold__ here',
    'odd ` backtick',
]
good = [
    '- `' + g3 + '`',
    '- `' + g4 + '`',
    '| D41 | DR-01 | Na__Verify__ModuleGraph__ and Na__Verify__Exports__ | x |',
    'path `VaApps/Projects/<folderId>/` stays in a span',
]

ok = True
for s in bad:
    try:
        gp.markdown_lint(s)
        print('MISSED (should fail):', s[:70]); ok = False
    except SystemExit:
        print('caught as expected  :', s[:70])
for s in good:
    try:
        gp.markdown_lint(s)
        print('passed as expected  :', s[:70])
    except SystemExit:
        print('FALSE ALARM         :', s[:70]); ok = False
print('LINT TESTS', 'PASS' if ok else 'FAIL')
sys.exit(0 if ok else 1)
