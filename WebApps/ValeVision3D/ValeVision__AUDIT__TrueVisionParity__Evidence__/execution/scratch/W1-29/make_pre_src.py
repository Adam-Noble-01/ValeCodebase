# W1-29 scratch: a minimal 02__Src__AppModules tree holding the handler's PRE-IMAGE (no key scope), the new KeyScope
# (the scope section needs it) and the live 3D dictionary, so the test sections can be run against the old handler
# to prove they bite. Nothing in the live tree is touched.
import os
import shutil

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules'
HERE = os.path.dirname(os.path.abspath(__file__))
PRE_SRC = os.path.join(HERE, 'pre_src', '02__Src__AppModules')

os.makedirs(os.path.join(PRE_SRC, '03__AppUtils'), exist_ok=True)
os.makedirs(os.path.join(PRE_SRC, '02__AppData'), exist_ok=True)
shutil.copyfile(os.path.join(HERE, 'preimage', 'Na__AppUtils__ValeVision__HotkeyHandler__.js'),
                os.path.join(PRE_SRC, '03__AppUtils', 'Na__AppUtils__ValeVision__HotkeyHandler__.js'))
shutil.copyfile(os.path.join(VV, '03__AppUtils', 'Na__AppUtils__KeyScope__.js'),
                os.path.join(PRE_SRC, '03__AppUtils', 'Na__AppUtils__KeyScope__.js'))
shutil.copyfile(os.path.join(VV, '02__AppData', 'Na__Hotkeys__3dModelTab__.json'),
                os.path.join(PRE_SRC, '02__AppData', 'Na__Hotkeys__3dModelTab__.json'))
print('pre-image tree:', PRE_SRC)
