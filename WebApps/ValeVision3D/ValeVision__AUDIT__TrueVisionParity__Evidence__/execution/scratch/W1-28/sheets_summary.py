"""Summarise the local VV projects' sheets (read-only): layers, item counts per layer, dimensions' scale keys, groups."""
import json
import os

WCP = r"D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Projects"
FOLDERS = ["2026/3047__Doous", "2026/44371__Gill", "2026/57994__Harris__Scheme-02"]

for folder in FOLDERS:
    path = os.path.join(WCP, folder.replace("/", os.sep), "project.json")
    if not os.path.exists(path):
        print(folder, "NO project.json")
        continue
    with open(path, encoding="utf-8") as fh:
        project = json.load(fh)
    block = project.get("LayoutEditor__DrawingsData") or {}
    sheets = block.get("LayoutEditor__DrawingsData__Sheets") or []
    print("=" * 100)
    print(folder, "sheets:", len(sheets))
    for s in sheets:
        layers = sorted(s.get("Sheet__Layers") or [], key=lambda l: l.get("Layer__Order", 0))
        print(f"  {s.get('Sheet__Id')} '{s.get('Sheet__Name')}' {s.get('Sheet__PaperSize')} {s.get('Sheet__Orientation')} "
              f"TB={s.get('Sheet__TitleBlockStyle')} LayerStack={s.get('Sheet__LayerStack')} margin={bool((s.get('Sheet__MarginNotes') or {}).get('MarginNotes__Enabled'))}")
        for l in layers:
            lid = l.get("Layer__Id")
            n = {k: sum(1 for x in (s.get(f"Sheet__{k}") or []) if x.get(f"{k[:-1] if k != 'Leaders' else 'Leader'}__LayerId") == lid)
                 for k in ("Viewports", "Annotations", "Dimensions", "Shapes")}
            n["Leaders"] = sum(1 for x in (s.get("Sheet__Leaders") or []) if x.get("Leader__LayerId") == lid)
            print(f"     L{l.get('Layer__Order')} {lid} '{l.get('Layer__Name')}' type={l.get('Layer__Type')} vis={l.get('Layer__Visible')} "
                  f"lock={l.get('Layer__Locked')} sel={l.get('Layer__Selectable')}  {n}")
        for v in s.get("Sheet__Viewports") or []:
            print(f"     viewport {v.get('Viewport__Id')} {v.get('Viewport__Kind')} 1:{v.get('Viewport__ScaleDenominator')} frame={v.get('Viewport__FrameMm')} "
                  f"layer={v.get('Viewport__LayerId')} markup={v.get('Viewport__MarkupMode')} styles.base={ (v.get('Viewport__Styles') or {}).get('baseImage') }")
        for d in s.get("Sheet__Dimensions") or []:
            print(f"     dim {d.get('Dimension__Id')} vp={d.get('Dimension__ViewportId')} atScale={d.get('Dimension__AtScale')}")
        print(f"     groups: {len(s.get('Sheet__Groups') or [])}  annotations: {len(s.get('Sheet__Annotations') or [])}  shapes: {len(s.get('Sheet__Shapes') or [])}  leaders: {len(s.get('Sheet__Leaders') or [])}")
