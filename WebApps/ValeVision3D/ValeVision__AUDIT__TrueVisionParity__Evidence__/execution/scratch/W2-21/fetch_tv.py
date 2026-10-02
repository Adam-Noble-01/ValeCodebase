import subprocess, os
pin='b2aa9151'
base='na-apps/30__TrueVision__CoreAppCode/'
files=['02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/'+f for f in [
'Na__LayoutEditor__EditScope__.js','Na__LayoutEditor__ItemClipboard__.js','Na__LayoutEditor__SelectionSet__.js',
'Na__LayoutEditor__SelectionBox__.js','Na__LayoutEditor__Eyedropper__.js','Na__LayoutEditor__LayerMenu__.js',
'Na__LayoutEditor__SheetTools__NoteTooltip__.js']]
for f in files:
    b=subprocess.run(['git','-C','D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb','show',pin+':'+base+f],capture_output=True).stdout
    open('tv/'+os.path.basename(f),'wb').write(b)
    print(f, len(b), b.count(b'\r\n'))
r=subprocess.run(['git','-C','D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb','ls-tree','-r','--name-only',pin,base+'80__Testing__PrototypeEnvironment/'],capture_output=True,text=True).stdout
print([l for l in r.splitlines() if 'LayerMenu' in l])
