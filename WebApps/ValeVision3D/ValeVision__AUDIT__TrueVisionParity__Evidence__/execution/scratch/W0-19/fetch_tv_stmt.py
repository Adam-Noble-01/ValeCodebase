import subprocess
PIN='b2aa9151'
NAWEB=r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
base='na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/'
for rel in ('01__Core__Data/Na__LayoutEditor__Statement__Data__Index__.js','01__Core__Data/Na__LayoutEditor__Statement__Data__.js','01__Core__Data/Na__LayoutEditor__Statement__Images__.js','07__Export__Publish/Na__LayoutEditor__Statement__Publish__Images__.js','03__Ui__Page/Na__LayoutEditor__Statement__Manager__.js'):
    out=subprocess.run(['git','-C',NAWEB,'show',PIN+':'+base+rel],capture_output=True).stdout
    open(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W0-19\tv_clients\\'+rel.split('/')[-1],'wb').write(out)
    print(rel, len(out))
