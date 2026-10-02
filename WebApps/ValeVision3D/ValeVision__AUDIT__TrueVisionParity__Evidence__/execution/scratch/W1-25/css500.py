"""For each 'font-weight: 500' declaration in VV's DropdownAndToast stylesheet, print the selector it sits in."""
import re

PATH = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\03__Style__AppStylesheets\Na__UiFeature__Styles__DropdownAndToast__.css'
text = open(PATH, encoding='utf-8').read()
lines = text.split('\n')
for i, line in enumerate(lines):
    if re.search(r'font-weight\s*:\s*500', line):
        j = i
        while j > 0 and '{' not in lines[j]:
            j -= 1
        k = j
        while k > 0 and lines[k - 1].strip() and not lines[k - 1].strip().endswith('}') and not lines[k - 1].strip().startswith('/*'):
            k -= 1
        print(i + 1, ' | '.join(l.strip() for l in lines[k:j + 1]))
