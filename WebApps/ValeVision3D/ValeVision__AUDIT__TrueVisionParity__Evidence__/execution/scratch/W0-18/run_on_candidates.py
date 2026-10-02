"""
W0-18 scratch: run one test file against the CANDIDATE blueprints and the CANDIDATE server.py (scratch copies),
never the live WCP files. Each candidate is executed under its real module name with __file__ set to its live path,
so every path it computes (USER_CONFIG_DIR, PROJECTS_ROOT, ...) is the real one; the tests repoint them.
Usage: python run_on_candidates.py <test file> [--server candidate|none]
"""
import os
import sys
import types
import runpy

sys.dont_write_bytecode = True
WCP     = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'
HERE    = os.path.dirname(os.path.abspath(__file__))
BUNDLED = os.path.join(WCP, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
sys.path.insert(0, BUNDLED)
sys.path.insert(0, WCP)


def load(module_name, candidate_path, live_path):
    module = types.ModuleType(module_name)
    module.__file__ = live_path
    sys.modules[module_name] = module
    exec(compile(open(candidate_path, 'rb').read(), live_path, 'exec'), module.__dict__)
    return module


candidate_dir = sys.argv[sys.argv.index('--candidate-dir') + 1] if '--candidate-dir' in sys.argv else os.path.join(HERE, 'candidate')
for name in ('Server__ValeVisionSheetImages__Api__', 'Server__ValeVisionUserConfig__Api__'):
    load(name, os.path.join(candidate_dir, name + '.py'), os.path.join(WCP, name + '.py'))
if '--server' not in sys.argv or sys.argv[sys.argv.index('--server') + 1] == 'candidate':
    load('server', os.path.join(HERE, 'candidate_server.py'), os.path.join(WCP, 'server.py'))

test_file = sys.argv[1]
sys.argv  = [test_file]
runpy.run_path(test_file, run_name='__main__')
