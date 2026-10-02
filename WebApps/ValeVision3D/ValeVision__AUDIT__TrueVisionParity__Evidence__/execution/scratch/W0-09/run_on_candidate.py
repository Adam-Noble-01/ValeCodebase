# W0-09 scratch: run one test file against the CANDIDATE server.py (scratch copy), never the live one.
# The candidate is executed as the module "server" with __file__ set to the live path, so every
# path it computes is the real Whitecardopedia folder's; the tests repoint the library's roots.
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

candidate = os.path.join(HERE, sys.argv[2] if len(sys.argv) > 2 else 'candidate_server.py')
source    = open(candidate, 'rb').read()
module    = types.ModuleType('server')
module.__file__ = os.path.join(WCP, 'server.py')
sys.modules['server'] = module
exec(compile(source, module.__file__, 'exec'), module.__dict__)

test_file = sys.argv[1]
sys.argv  = [test_file]
runpy.run_path(test_file, run_name='__main__')
