# W1-18 scratch: plant two defects in copies of the rehearsal files (never the live tree) to prove the acceptance
# harness bites: LineStyleTool's default controls take the prefix 'shapes', and GradientTool clips a plain shape even-odd.
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'rehearsal')
DST = os.path.join(HERE, 'planted')


def plant(name, old, new):
    with open(os.path.join(SRC, name), 'rb') as fh:
        data = fh.read()
    if data.count(old) != 1:
        raise SystemExit('anchor not found once in ' + name)
    os.makedirs(DST, exist_ok=True)
    with open(os.path.join(DST, name), 'wb') as fh:
        fh.write(data.replace(old, new))
    print('planted', name)


plant('Na__LayoutEditor__LineStyleTool__.js',
      b"const Na__LeDash__CONTROLS  = Na__LeDash__ControlsFor('shape');",
      b"const Na__LeDash__CONTROLS  = Na__LeDash__ControlsFor('shapes');")
plant('Na__LayoutEditor__GradientTool__.js',
      b"if (holed) doc.clip('evenodd'); else doc.clip();",
      b"doc.clip('evenodd');")
