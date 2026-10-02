import subprocess
t = subprocess.run(['git','-C',r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb','show','b2aa9151:na-apps/30__TrueVision__CoreAppCode/TrueVision__DEVLOG__.md'],capture_output=True).stdout.decode('utf-8','replace').splitlines()
for a,b in ((6940,6949),(1318,1328),(1355,1365)):
    print('----', a, b)
    for i in range(a-1, b):
        print(i+1, t[i][:230])
