from pathlib import Path
p = Path(__file__).with_name('build_w4_16.py')
t = p.read_text(encoding='utf-8')
old = "(offered to TrueVision as a back-port, S07b-F51)."
assert t.count(old) == 1, t.count(old)
t = t.replace(old, "(W4-12; a back-port offer, S07b-F51).")
old2 = "        if not dry and target.exists():"
assert t.count(old2) == 1
t = t.replace(old2, "        if not dry and target.exists() and '--replace' not in sys.argv:")
p.write_text(t, encoding='utf-8')
print('patched')
