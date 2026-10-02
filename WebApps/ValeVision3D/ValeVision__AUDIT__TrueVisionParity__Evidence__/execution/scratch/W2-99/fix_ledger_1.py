"""W2-99 scratch: blank-line placement and one rewrap in the ledger builder and its text (anchors asserted once)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def patch(name, pairs):
    p = os.path.join(HERE, name)
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        n = s.count(a)
        if n != 1:
            raise SystemExit('%s: anchor %d times: %r' % (name, n, a[:70]))
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8', newline='\n').write(s)


patch('update_ledger_w2.py', [
    ("    lines[k + 1:k + 1] = T.S6_MOVED + [ld_row] + T.S6_MEMO\n",
     "    lines[k + 1:k + 1] = [''] + T.S6_MOVED + [ld_row, ''] + T.S6_MEMO\n"),
    ("    lines[j - 1:j - 1] = T.S6_OFFERS\n", "    lines[j - 1:j - 1] = [''] + T.S6_OFFERS\n"),
    ("    lines[j - 1:j - 1] = T.S7_ROWS\n", "    lines[j - 1:j - 1] = [''] + T.S7_ROWS\n"),
    ("    lines[e:e] = T.S81_NOTE\n", "    lines[e:e] = [''] + T.S81_NOTE\n"),
])
patch('ledger_w2_text.py', [
    ("  waits, all from NOT-CONSIDERED: v2.75.0, v2.98.0, v2.102.0, v2.108.0, v2.117.0, v2.118.0, v2.122.0, v2.128.0,\n"
     "  v2.129.0, v2.131.0, v2.134.0, v2.149.0, v2.151.0, v2.153.0, v2.157.0 and v2.163.0. {more} rows already PARTIAL gained\n"
     "  more, and dated notes on {notes} more name the logs, configs or designs the wave took with no change of class. The\n",
     "  waits, all from NOT-CONSIDERED: v2.75.0, v2.98.0, v2.102.0, v2.108.0, v2.117.0, v2.118.0, v2.122.0, v2.128.0,\n"
     "  v2.129.0, v2.131.0, v2.134.0, v2.149.0, v2.151.0, v2.153.0, v2.157.0 and v2.163.0.\n"
     "  {more} rows already PARTIAL gained more, and dated notes on {notes} more name the logs, configs or designs the\n"
     "  wave took with no change of class. The\n"),
])
print('patched')
