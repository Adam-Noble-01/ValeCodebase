"""
W0-19 scratch: run one test file against the CANDIDATE blueprints and the CANDIDATE server.py (scratch copies), never
the live WCP files. Each candidate is executed under its real module name with __file__ set to its live path, so
every path it computes is the real one; the tests repoint the Projects root.
Usage: python run_on_candidates.py <test file> [args...] [--server candidate|none] [--candidate-dir DIR]
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


argv = list(sys.argv[1:])
server_mode = 'candidate'
candidate_dir = os.path.join(HERE, 'candidate')
if '--server' in argv:
    at = argv.index('--server')
    server_mode = argv[at + 1]
    del argv[at:at + 2]
if '--candidate-dir' in argv:
    at = argv.index('--candidate-dir')
    candidate_dir = argv[at + 1]
    del argv[at:at + 2]

for name in ('Server__ValeVisionPublished__Api__', 'Server__ValeVisionStatements__Api__'):
    load(name, os.path.join(candidate_dir, name + '.py'), os.path.join(WCP, name + '.py'))
if server_mode == 'candidate':
    load('server', os.path.join(HERE, 'candidate_server.py'), os.path.join(WCP, 'server.py'))

test_file = argv[0]
sys.argv  = argv
runpy.run_path(test_file, run_name='__main__')
