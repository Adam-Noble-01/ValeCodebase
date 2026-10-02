"""Re-create scratch/W2-29/tv/ (TrueVision's files at the pin) for harness/acceptance_check.mjs."""
import os
import subprocess

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')
FILES = {
    'Na__LayoutEditor__Panel__Patterns__.js': '36__System__HatchPatternTools/Na__LayoutEditor__Panel__Patterns__.js',
    'Na__LayoutEditor__Styles__Patterns__.css': '36__System__HatchPatternTools/Na__LayoutEditor__Styles__Patterns__.css',
    'ModeController_TV.js': '05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
    'AppConfig_TV.json': '03__Core__Config/Na__LayoutEditor__AppConfig__.json',
}
os.makedirs(OUT, exist_ok=True)
for name, rel in FILES.items():
    data = subprocess.run(['git', '-C', NAWEB, 'show', f'{PIN}:{APP}{rel}'], check=True, capture_output=True).stdout
    open(os.path.join(OUT, name), 'wb').write(data)
    print(name, len(data))
