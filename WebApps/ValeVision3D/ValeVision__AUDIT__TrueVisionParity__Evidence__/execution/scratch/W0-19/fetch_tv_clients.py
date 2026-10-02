"""Fetch the TrueVision client files that call the published and statement routes (reference only), at the pin."""
import os
import subprocess

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv_clients')
APP = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/'

FILES = [
    APP + '03__AppUtils/Na__AppUtils__LocalProjectMirror__.js',
    APP + '51__System__LayoutEditor/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Data__Transport__.js',
    APP + '51__System__LayoutEditor/52__Feature__StatementWriter/04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Cards__.js',
    APP + '51__System__LayoutEditor/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__Transport__.js',
    APP + '52__System__Layout__PublishedDocuments/Na__PubDoc__Urls__.js',
    APP + '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js',
]

os.makedirs(OUT, exist_ok=True)
for rel in FILES:
    proc = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + rel], capture_output=True)
    if proc.returncode != 0:
        print('MISSING', rel)
        continue
    with open(os.path.join(OUT, os.path.basename(rel)), 'wb') as handle:
        handle.write(proc.stdout)
    print(rel, len(proc.stdout))
