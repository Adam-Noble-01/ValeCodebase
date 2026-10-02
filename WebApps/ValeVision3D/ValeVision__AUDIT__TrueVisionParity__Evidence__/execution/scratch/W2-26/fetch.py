import subprocess, shutil, pathlib
names=['DimensionTool','RectangleTool','TextTool','LeaderTool']
vv=pathlib.Path(r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools')
for n in names:
    p=f'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__{n}__.js'
    b=subprocess.run(['git','-C',r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb','show','b2aa9151:'+p],capture_output=True,check=True).stdout
    open(f'tv_{n}.js','wb').write(b)
    v=(vv/f'Na__LayoutEditor__{n}__.js').read_bytes()
    open(f'vv_before_{n}.js','wb').write(v)
    print(n,'TV',len(b),b.count(b'\r\n'),b.count(b'\n'),'VV',len(v),v.count(b'\r\n'),v.count(b'\n'))
