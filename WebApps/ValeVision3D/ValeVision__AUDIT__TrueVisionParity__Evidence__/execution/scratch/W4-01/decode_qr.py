# Rasterise the qr path mark of each fixture sheet and try to decode it with OpenCV (is it a real QR of NA's address?)
import json, re, sys, os
import numpy as np, cv2

root = sys.argv[1]
for doc in sorted(os.listdir(root)):
    p = os.path.join(root, doc, 'Document__Sheet__.json')
    if not os.path.exists(p):
        continue
    d = json.load(open(p, encoding='utf-8'))
    for m in d.get('PublishedSheet__Marks', []):
        if m.get('Mark__Role') == 'qr' and m.get('Mark__Type') == 'path':
            rects = re.findall(r'M([\d.]+),([\d.]+)h([\d.]+)v([\d.]+)h-[\d.]+Z', m['Mark__D'])
            xs = [float(r[0]) for r in rects]; ys = [float(r[1]) for r in rects]
            x0, y0 = min(xs), min(ys); cell = float(rects[0][2])
            n = int(round((max(xs) - x0) / cell)) + 1
            scale = 10; pad = 4
            img = np.full(((n + 2 * pad) * scale, (n + 2 * pad) * scale), 255, np.uint8)
            for r in rects:
                cx = int(round((float(r[0]) - x0) / cell)) + pad; cy = int(round((float(r[1]) - y0) / cell)) + pad
                img[cy * scale:(cy + 1) * scale, cx * scale:(cx + 1) * scale] = 0
            text, pts, _ = cv2.QRCodeDetector().detectAndDecode(img)
            print(doc, 'modules', n, 'decoded:', repr(text))
