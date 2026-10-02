"""Scratch (W0-02): run parity/report/tools/k2_path_gate.py unchanged, except that the two
orchestrator-owned root records (ValeVision__AUDIT__TrueVisionParity__* and
ValeVision__WORKING_MEMORY__TrueVisionParity__*) join the gate's history exemption, exactly as the
execution copy of the renumber script exempts them. Every other check and file is the gate's own.

Usage: python path_gate_records_exempt.py [k2_path_gate.py arguments ...]
"""
import os, re, sys, importlib.util

GATE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\report\tools\k2_path_gate.py'

spec = importlib.util.spec_from_file_location('k2_path_gate', GATE)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
gate.HISTORY = re.compile(gate.HISTORY.pattern[:-1] + r'|__AUDIT__TrueVisionParity__|__WORKING_MEMORY__TrueVisionParity__)', re.I)
print('(records-exempt wrapper: HISTORY = %s)' % gate.HISTORY.pattern)
sys.argv = [GATE] + sys.argv[1:]
gate.main()
