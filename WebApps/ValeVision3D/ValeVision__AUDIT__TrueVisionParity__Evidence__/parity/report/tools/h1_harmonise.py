# -*- coding: utf-8 -*-
"""H1 - final cross-section harmonisation (01-Oct-2026): apply every edit, rebuild every generated artefact, validate.

Usage:  python h1_harmonise.py [--dry]      (from parity/report/tools)

Order (re-runnable; each edit is idempotent):
  1. edits to generator inputs and tools (h1_edits_tools.py, h1_edits_gen.py) and to the hand-maintained documents
     (h1_edits_docs.py: R1, R3, R4, the prose of the K2 docs);
  2. generators: k1_build_register.py (K1) -> k2_build_maps.py (K2) -> k3_build.py (K3, with the F.8 layer, rows C1-C36)
     -> h2_record_corrections.py (wp_corrections_applied.json) -> r6_build_sectionF.py (R6) -> r2b_render.py (R2)
     -> r5_inventory.py + r5_assemble.py (R5) -> r0_assemble.py (R0, which re-runs r0_build_decisions.py);
  3. validators: k1_check_register.py, k2_validate_maps.py, k3_verify_outputs.py, r6_check_md.py, r6_check_mermaid.py,
     h2_validate.py, r3_check_tables.py, r4_check_section.py, r1_check_paths.py, critic/ids_check.py, h1_check.py.
If r0_revise.py is ever re-run (it rebuilds r0_source.md and r0_build_decisions.py from r0_revise_base/), run this
script again afterwards: the R0 edits are re-applied. Read-only on both apps, NAAPPS and WCP.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import h1_patchlib as L      # noqa: E402
import h1_edits_tools as ET  # noqa: E402
import h1_edits_gen as EG    # noqa: E402
import h1_edits_docs as ED   # noqa: E402

DRY = '--dry' in sys.argv
GROUPS = [
    ('K3/R6 F.8 rows (r6_corrections, k3_f8_corrections, k3_report_md)', ET.K3_F8),
    ('H2 record/validators and the critic id check', ET.H2_TOOLS),
    ('R6 prose and builder', ET.R6),
    ('K1 content', EG.K1),
    ('K2 generator', EG.K2GEN),
    ('R0 source and decision notes', EG.R0),
    ('R2 renderer', EG.R2),
    ('R5 template and generators', EG.R5),
    ('R1 (hand-maintained)', ED.R1),
    ('R3 (hand-maintained)', ED.R3),
    ('R4 (hand-maintained)', ED.R4),
    ('K2 docs prose', ED.K2),
]


def run(script, *args):
    cmd = [sys.executable, os.path.join(HERE, script)] + list(args)
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=HERE, encoding='utf-8', errors='replace')
    tail = (r.stdout.strip().split('\n') or [''])[-1]
    print('  %-28s exit %d  %s' % (script, r.returncode, tail[:150]))
    if r.returncode != 0:
        print(r.stdout[-3000:])
        print(r.stderr[-3000:])
    return r


def main():
    print('== 1. edits (%s)' % ('dry run' if DRY else 'write'))
    for name, edits in GROUPS:
        print('-', name)
        L.apply(edits, dry=DRY)
        if not DRY:
            L.save_record(edits, name)
    if DRY:
        return
    print('== 2. generators')
    for s in ('k1_build_register.py', 'k2_build_maps.py', 'k3_build.py', 'h2_record_corrections.py', 'r6_build_sectionF.py',
              'r2b_render.py', 'r5_inventory.py', 'r5_assemble.py', 'r0_assemble.py'):
        r = run(s)
        if r.returncode != 0:
            raise SystemExit('generator failed: ' + s)
    print('== 3. validators')
    rep = os.path.normpath(os.path.join(HERE, '..'))
    bad = []
    for s, args in (('k1_check_register.py', ()), ('k2_validate_maps.py', ()), ('k3_verify_outputs.py', ()),
                    ('r6_check_md.py', ()), ('r6_check_mermaid.py', ()), ('h2_validate.py', ()),
                    ('r3_check_tables.py', (os.path.join(rep, 'R3__C_WiringRequirements.md'),)),
                    ('r4_check_section.py', ()),
                    ('r1_check_paths.py', (os.path.join(rep, 'R1__A_FolderNaming_FolderDivergence.md'),)),
                    ('critic/ids_check.py', ()), ('h1_check.py', ())):
        if not os.path.exists(os.path.join(HERE, s)):
            print('  %-28s (missing)' % s)
            continue
        r = run(s, *args)
        if r.returncode != 0:
            bad.append(s)
    print('validators failing:', bad or 'none')


if __name__ == '__main__':
    main()
