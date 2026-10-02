"""Composite tree for the LayerMenu test's last part while W2-19 (ObjectSnap Search and the test bundle) has not landed.

Every file the test loads comes from this app's LIVE tree, except the two W2-19 will port verbatim from
TrueVision at b2aa9151 and that are missing here: 28__System__ObjectSnap/..__Search__.js and the test
bundle Na__TestEnv__ObjectSnapBundle__.cjs. Those come from the pin. The test file is the live one.
"""
import os, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D'
TV_GIT = r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.join(HERE, 'composite')
LE = '02__Src__AppModules/51__System__LayoutEditor/'
OS = LE + '28__System__ObjectSnap/'
live = [
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__Layers__.js',
    LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__Shapes__.js',
    LE + '30__System__SheetTools/Na__LayoutEditor__LayerMenu__.js',
    LE + '30__System__SheetTools/Na__LayoutEditor__ItemClipboard__.js',
    LE + '30__System__SheetTools/Na__LayoutEditor__SelectionBox__.js',
    LE + '15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js',
    LE + '20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js',
    OS + 'Na__LayoutEditor__ObjectSnap__State__.js',
    OS + 'Na__LayoutEditor__ObjectSnap__Geometry__.js',
    OS + 'Na__LayoutEditor__ObjectSnap__Index__.js',
    OS + 'Na__LayoutEditor__ObjectSnap__Sources__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__LayerMenu__.test.mjs',
]
pinned = [OS + 'Na__LayoutEditor__ObjectSnap__Search__.js',
          '80__Testing__PrototypeEnvironment/Na__TestEnv__ObjectSnapBundle__.cjs']
if os.path.exists(OUT): shutil.rmtree(OUT)
for rel in live:
    dst = os.path.join(OUT, rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(VV, rel), dst); print('live  ', rel)
for rel in pinned:
    if os.path.exists(os.path.join(VV, rel)):
        print('NOTE: now present live, using live:', rel)
        src = open(os.path.join(VV, rel), 'rb').read()
    else:
        src = subprocess.run(['git', '-C', TV_GIT, 'show', 'b2aa9151:' + TV_APP + rel], capture_output=True, check=True).stdout
    dst = os.path.join(OUT, rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, 'wb').write(src); print('pinned', rel)
