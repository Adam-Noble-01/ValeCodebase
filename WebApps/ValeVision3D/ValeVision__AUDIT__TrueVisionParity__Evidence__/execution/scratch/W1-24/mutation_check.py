# W1-24 scratch: does each contract check bite? Plant one fault at a time in a copy of the landed
# exporter (scratch/W1-24/mutants/, never the live file) and run w1_24_contract.mjs on it: every
# mutant must fail at least the checks named for it; the unmutated control must pass 22/22.
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_w1_24 as build  # noqa: E402

MUT = os.path.join(HERE, 'mutants')
MUTANTS = [
    ('control', None, None, []),
    ('M1 default packing SLOW', ": 'FAST';\r\n        doc.addImage", ": 'SLOW';\r\n        doc.addImage", ['C2', 'C11']),
    ('M2 no strict check on a 3D render', "            if (!dataUrl && options && options.strict) throw new Error('A 3D viewport could not be rendered.');\r\n", '', ['C14']),
    ('M3 no strict check on a missing source', "{ if (options && options.strict) throw new Error('A viewport drawing source is missing.'); return; }", 'return;', ['C13', 'C15']),
    ('M4 save not awaited', 'await built.doc.save(built.filename, { returnPromise : true });', 'built.doc.save(built.filename, { returnPromise : true });', ['C16', 'C17']),
    ('M5 LoadLibrary not exported', '        Na__LePdf__LoadLibrary,   ', '        //Na__LePdf__LoadLibrary,   ', ['C1', 'C18']),
    ('M6 the viewport loop drops the options', 'ordered[i], options);', 'ordered[i]);', ['C10', 'C13', 'C14']),
    ('M7 ExportSheet drops the options', 'Na__LePdf__BuildDocument(sheet, options);', 'Na__LePdf__BuildDocument(sheet);', ['C15']),
    ('M8 any truthy pictureCompression passes', "typeof options.pictureCompression === 'string'", 'options.pictureCompression', ['C11']),
    ('M9 the 3D picture skips AddPicture', "Na__LePdf__AddPicture(doc, dataUrl, frame.X + rect.X, frame.Y + rect.Y, rect.WidthMm, rect.HeightMm, options);",
     "doc.addImage(dataUrl, 'PNG', frame.X + rect.X, frame.Y + rect.Y, rect.WidthMm, rect.HeightMm);", ['C2', 'C10']),
]


def main():
    os.makedirs(MUT, exist_ok=True)
    live = open(build.LIVE, 'rb').read().decode('utf-8')
    bad = 0
    for name, old, new, must_fail in MUTANTS:
        text = live
        if old is not None:
            if text.count(old) != 1:
                print('%-45s CANNOT PLANT (%d matches)' % (name, text.count(old)))
                bad += 1
                continue
            text = text.replace(old, new)
        path = os.path.join(MUT, name.split(' ')[0] + '__' + build.LEAF)
        with open(path, 'wb') as fh:
            fh.write(text.encode('utf-8'))
        out = os.path.join(MUT, name.split(' ')[0] + '__contract.json')
        res = subprocess.run(['node', os.path.join(HERE, 'w1_24_contract.mjs'), '--set', 'mutant', '--file', path, '--out', out],
                             capture_output=True, text=True, encoding='utf-8', errors='replace')
        results = json.load(open(out, encoding='utf-8'))['results']
        failed = [r['id'] for r in results if not r['ok']]
        if old is None:
            ok = not failed
            print('%-45s %s (%d/%d pass)' % (name, 'matches the landed file' if ok else 'FAILED: ' + ', '.join(failed), len(results) - len(failed), len(results)))
        else:
            ok = all(c in failed for c in must_fail)
            print('%-45s %s - fails %s' % (name, 'caught' if ok else 'NOT CAUGHT (wanted ' + ', '.join(must_fail) + ')', ', '.join(failed) or 'nothing'))
        bad += 0 if ok else 1
    print('RESULT: %s' % ('PASS - control clean, every mutant caught' if not bad else 'FAIL (%d)' % bad))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
