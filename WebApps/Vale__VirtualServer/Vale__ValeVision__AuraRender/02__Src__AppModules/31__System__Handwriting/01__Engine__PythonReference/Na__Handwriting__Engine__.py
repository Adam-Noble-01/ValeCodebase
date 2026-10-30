"""
=============================================================================
 VALEVISION AURA - HANDWRITING - THE ENGINE (FROM THE VALE HANDWRITING STUDIO)
=============================================================================

FILE       : Na__Handwriting__Engine__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Real pen-trajectory synthesis and owned-stroke rendering. Coordinates are mm.
CREATED    : 02-Oct-2026 (the studio); brought into AURA 30-Oct-2026

DESCRIPTION:
- The Vale Handwriting Studio's engine.py (Dev__EarlyStageDev__TestingFiles/
  Experiment__HandwritingTest/02__AppSourceCode/engine.py, revision 2026-10-02.2),
  copied unchanged but for where it finds the toolkit: ROOT is this folder and
  VENDOR the pinned toolkit beside it (01__Vendor__PyTorchHandwritingSynthesis__899e9432,
  X-rayLaser/pytorch-handwriting-synthesis-toolkit at 899e9432, MIT; its Epoch 46
  checkpoint, whose IAM-OnDB training data makes the weights an evaluation asset).
- Needs Python 3.12 with torch (CPU) and numpy: the studio's own .venv has them.
  AURA's API runs it through AuraRender__Handwriting__Worker__.py, on a PC only:
  never on the server (Adam, 30-Oct-2026: the server is resource constrained).
- The reference for the WebAssembly rewrite that will run in the browser.

=============================================================================
"""
from pathlib import Path
from functools import lru_cache
import hashlib
import html
import json
import math
import re
import sys
import threading
import time
import numpy as np

ROOT = Path(__file__).resolve().parent                                   # AURA: the engine's own folder
VENDOR = ROOT / '01__Vendor__PyTorchHandwritingSynthesis__899e9432'      # AURA: the pinned toolkit beside it
CHARSET = json.loads((VENDOR / 'checkpoints/Epoch_46/meta.json').read_text())['charset']
MODEL_LOCK = threading.Lock()

# Deliberately explicit strokes for technical symbols and protected numerals.
# These are original prototype geometry, not a handwriting font or learned model.
TECH = {
 ' ': [],
 'm': [[(0,10),(0,4),(1,4),(2,5),(3,10)],[(2,5),(4,4),(5,5),(6,10)],[(5,5),(7,4),(8,5),(9,10)]],
 'c': [[(6,5),(4,4),(1,5),(0,8),(2,10),(5,10),(6,9)]],
 'f': [[(5,0),(3,0),(2,2),(2,11)],[(0,4),(5,4)]],
 't': [[(3,1),(3,9),(4,10),(6,9)],[(0,4),(6,4)]],
 'i': [[(2,4),(2,10)],[(2,1),(2.1,1)]],
 'n': [[(0,10),(0,4),(1,4),(1,6),(3,4),(5,4),(6,6),(6,10)]],
 'x': [[(0,4),(6,10)],[(6,4),(0,10)]],
 'X': [[(0,0),(6,10)],[(6,0),(0,10)]],
 '0': [[(3,0),(1,1),(0,4),(0,8),(1,10),(3,10),(5,8),(6,3),(5,1),(3,0)]],
 '1': [[(1,2),(3,0),(3,10)],[(1,10),(5,10)]],
 '2': [[(0,2),(1,0),(4,0),(6,2),(5,4),(0,10),(6,10)]],
 '3': [[(0,1),(3,0),(5,1),(5,3),(3,5),(5,6),(6,8),(4,10),(1,10),(0,9)]],
 '4': [[(5,10),(5,0),(0,7),(7,7)]],
 '5': [[(6,0),(1,0),(0,5),(3,4),(5,5),(6,8),(4,10),(1,10),(0,9)]],
 '6': [[(5,0),(2,1),(0,5),(0,8),(2,10),(4,10),(6,8),(5,6),(3,5),(0,6)]],
 '7': [[(0,0),(6,0),(2,10)]],
 '8': [[(3,0),(0,2),(1,4),(5,6),(6,8),(4,10),(1,10),(0,8),(1,6),(5,3),(5,1),(3,0)]],
 '9': [[(6,5),(3,6),(0,4),(0,2),(2,0),(5,0),(6,3),(5,8),(3,10),(1,10)]],
 '.': [[(2,10),(2.1,10)]], ',': [[(2,10),(1,12)]],
 '+': [[(0,5),(6,5)],[(3,2),(3,8)]], '-': [[(0,5),(6,5)]],
 '−': [[(0,5),(6,5)]], '=': [[(0,4),(6,4)],[(0,7),(6,7)]],
 '±': [[(0,4),(6,4)],[(3,1),(3,7)],[(0,10),(6,10)]],
 '×': [[(0,2),(6,8)],[(6,2),(0,8)]], '°': [[(2,0),(0,1),(0,3),(2,4),(4,3),(4,1),(2,0)]],
 'Ø': [[(3,0),(0,2),(0,8),(3,10),(6,8),(6,2),(3,0)],[(0,11),(6,-1)]],
 '/': [[(0,11),(6,0)]], ':': [[(2,3),(2.1,3)],[(2,8),(2.1,8)]],
 '&': [[(7,10),(1,4),(1,1),(3,0),(5,1),(5,3),(0,7),(0,9),(2,10),(5,9),(7,5)]],
 '²': [[(0,1),(1,0),(3,0),(4,1),(0,5),(4,5)]],
 '³': [[(0,0),(3,0),(4,1),(2,2),(4,3),(4,4),(2,5),(0,5)]],
 '–': [[(0,5),(7,5)]], '—': [[(0,5),(9,5)]],
 '(': [[(4,0),(1,3),(1,8),(4,11)]], ')': [[(1,0),(4,3),(4,8),(1,11)]],
}

def number(value, name, low, high, default):
    if value is None: return default
    if isinstance(value, bool): raise ValueError(f'{name} must be a number.')
    try: value = float(value)
    except (ValueError, TypeError): raise ValueError(f'{name} must be a number.')
    if not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f'{name} must be between {low} and {high}.')
    return value

def validate(payload):
    if not isinstance(payload, dict): raise ValueError('Expected a JSON object.')
    text = payload.get('text', '')
    if not isinstance(text, str) or not text.strip() or len(text) > 600:
        raise ValueError('Enter 1–600 characters per note.')
    text = text.replace('\r\n','\n').replace('\r','\n').replace('\t','    ')
    engine = payload.get('engine', 'neural')
    if engine not in ('neural', 'captured'): raise ValueError('Unknown engine.')
    color = payload.get('color', '#263b37')
    if not isinstance(color,str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', color): raise ValueError('Use a six-digit hex ink colour.')
    options = dict(text=text, engine=engine, color=color,
        size=number(payload.get('size'),'Letter height',2,12,4.5),
        width=number(payload.get('width'),'Note width',25,350,135),
        pen=number(payload.get('pen'),'Pen width',0.1,1.2,0.3),
        variation=number(payload.get('variation'),'Variation',0,1,0.3),
        neatness=number(payload.get('neatness'),'Neatness',0.2,2.5,1.1),
        spacing=number(payload.get('spacing'),'Line spacing',1.05,3,1.35),
        seed=int(number(payload.get('seed'),'Seed',0,2147483647,42)),
        protect_numbers=payload.get('protect_numbers', True))
    if not isinstance(options['protect_numbers'],bool): raise ValueError('protect_numbers must be boolean.')
    if engine == 'neural':
        bad = sorted(set(text) - set(CHARSET + '\n' + ''.join(TECH) + '’‘“”'))
        if bad: raise ValueError('No strokes available for: ' + ' '.join(bad) + '. Capture these characters in Artist library, or edit the text.')
    return options

def seed_for(seed, text, index):
    return int.from_bytes(hashlib.sha256(f'{seed}:{text}:{index}'.encode()).digest()[:4], 'little')

@lru_cache(maxsize=1)
def load_model():
    import torch
    torch.set_num_threads(1)
    sys.path.insert(0, str(VENDOR))
    from handwriting_synthesis.models import SynthesisNetwork
    meta = json.loads((VENDOR / 'checkpoints/Epoch_46/meta.json').read_text())
    model = SynthesisNetwork.get_default_model(len(CHARSET)+1, torch.device('cpu'), bias=1.0)
    model.load_state_dict(torch.load(VENDOR / 'checkpoints/Epoch_46/model.pt', map_location='cpu', weights_only=True))
    model.eval()
    return model, meta

@lru_cache(maxsize=128)
def neural_strokes(text, seed, neatness):
    import torch
    with MODEL_LOCK, torch.inference_mode():
        model, meta = load_model()
        model.mixture.bias = float(neatness)
        ctext = text + '  '
        context = torch.zeros(1, len(ctext), len(CHARSET)+1)
        for i,ch in enumerate(ctext): context[0,i,CHARSET.index(ch)+1] = 1
        limit = min(6500, max(1200, len(ctext)*110))
        with torch.random.fork_rng(devices=[]):
            for attempt in range(4):
                model.mixture.bias = max(0.2,float(neatness)*(0.78**attempt))
                torch.manual_seed((seed + attempt*104729) % 4294967296)
                points, attention = model.sample_means_with_attention(context, steps=limit, stochastic=True)
                coverage=torch.bincount(attention.argmax(dim=1),minlength=len(ctext))
                complete=len(points)<limit and all(int(coverage[i])>=2 for i,ch in enumerate(text) if ch.isalnum())
                if complete:break
        # Upstream terminates when the final character's window exceeds .8,
        # which need not be the largest attention component on that step.
        if not complete: raise ValueError('The model did not finish this phrase. Try a new variation, shorter note, or higher neatness.')
        arr = (points * torch.tensor(meta['std']) + torch.tensor(meta['mu'])).numpy()
    arr[:,:2] = np.cumsum(arr[:,:2],axis=0)
    if not np.isfinite(arr).all(): raise ValueError('Model produced invalid strokes. Try another variation.')
    # Remove gross baseline inclination while preserving local movement.
    x, y = arr[:,0], arr[:,1]
    if np.ptp(x)>0:
        slope = np.polyfit(x, y, 1)[0]
        arr[:,1] -= (x-x[0])*np.clip(slope,-0.18,0.18)
    arr[:,:2] -= arr[:,:2].min(axis=0)
    scale = max(float(np.ptp(arr[:,1])),1)
    arr[:,:2] /= scale
    strokes=[]; current=[]
    for x,y,up in arr:
        current.append([float(x),float(y),0.5])
        if up>0.5:
            if current: strokes.append(current)
            current=[]
    if current: strokes.append(current)
    return strokes, float(np.ptp(arr[:,0])), attempt

def curve(points):
    """Catmull–Rom converted to cubic Beziers, interpolating recorded points."""
    if len(points)==1: points=[points[0], [points[0][0]+0.005,points[0][1],0.5]]
    d=f'M {points[0][0]:.3f} {points[0][1]:.3f}'
    for i in range(len(points)-1):
        a=points[max(0,i-1)]; b=points[i]; c=points[i+1]; e=points[min(len(points)-1,i+2)]
        d+=f' C {b[0]+(c[0]-a[0])/6:.3f} {b[1]+(c[1]-a[1])/6:.3f} {c[0]-(e[0]-b[0])/6:.3f} {c[1]-(e[1]-b[1])/6:.3f} {c[0]:.3f} {c[1]:.3f}'
    return d

def technical_strokes(text):
    strokes=[]; x=0
    for ch in text:
        for stroke in TECH[ch]: strokes.append([[x+a/10,b/10,0.5] for a,b in stroke])
        x += 0.4 if ch in '.,: ' else 1.06 if ch=='m' else 0.82
    return strokes, x

def captured_strokes(text, glyphs, rng, variation):
    strokes=[]; x=0
    for ch in text:
        if ch==' ': x+=0.55; continue
        variants=glyphs.get(ch)
        if not variants: raise ValueError(f'Capture the character “{ch}” in Artist library first.')
        sample=variants[int(rng.integers(len(variants)))]
        stretch = 1+rng.normal(0,0.028)*variation
        lean = rng.normal(0,0.04)*variation
        drift = rng.normal(0,0.025)*variation
        for stroke in sample['strokes']:
            strokes.append([[x+px*stretch+lean*(1-py),py+drift,p] for px,py,p in stroke])
        x += sample['advance']*stretch+0.09
    return strokes, x

def render(options, glyphs=None, progress=lambda *_:None):
    start=time.perf_counter(); o=options; rng=np.random.default_rng(o['seed'])
    raw=o['text']; text=raw.translate(str.maketrans({'’':"'",'‘':"'",'“':'"','”':'"'})) if o['engine']=='neural' else raw
    if o['engine']=='captured':
        missing=sorted(set(text)-set(glyphs or {})-set(' \n'))
        if missing: raise ValueError('Artist library is missing: '+ ' '.join(missing))
    # Wrap prose conservatively; actual measured stroke bounds drive final wrapping.
    chars=max(6,min(42,int(o['width']/o['size']*1.8)))
    units=[]
    for pindex,paragraph in enumerate(text.split('\n')):
        if pindex: units.append(('break',''))
        words=re.findall(r'\S+| +',paragraph)
        chunk=''
        for word in words:
            if len(chunk+word)>chars and chunk.strip(): units.append(('text',chunk.strip())); chunk=''
            chunk+=word
        if chunk.strip(): units.append(('text',chunk.strip()))
    paths=[]; x=1.5; y=1.5; line=0; max_x=0; min_y=1.5; line_max=o['size']; warnings=[]; count=0
    def new_line():
        nonlocal x,y,line,line_max
        y+=max(o['size']*o['spacing'],line_max+o['size']*0.1); x=1.5; line+=1; line_max=o['size']
    for unit_index,(kind,value) in enumerate(units):
        if kind=='break': new_line(); continue
        if x>1.5: new_line()
        if o['engine']=='captured': pieces=[value]
        else:
            # Numbers are explicit strokes; unsupported symbols never vanish silently.
            split_chars=''.join(ch for ch in TECH if ch not in CHARSET)
            pattern='['+re.escape(split_chars)+']+'
            if o['protect_numbers']: pattern=r'\d+(?:[.,]\d+)*(?:\s*(?:mm|cm|ft|in|m)\b)?|(?<=\s)[xX](?=\s)|'+pattern
            pieces=re.split('('+pattern+')',value)
        for piece_index,piece in enumerate(pieces):
            if not piece: continue
            if not piece.strip(): x+=o['size']*0.55; continue
            if piece.startswith(' ') and x>1.5: x+=o['size']*0.4
            piece=piece.strip()
            progress(unit_index/max(len(units),1),f'Writing line {line+1}')
            if o['engine']=='captured': strokes,width=captured_strokes(piece,glyphs,rng,o['variation'])
            elif all(ch in TECH for ch in piece): strokes,width=technical_strokes(piece)
            else:
                strokes,width,retries=neural_strokes(piece,seed_for(o['seed'],piece,count),o['neatness'])
                if retries: warnings.append('A stalled phrase was regenerated at lower pen confidence. Inspect the recovered lettering.')
            count+=1
            scale=o['size']; available=o['width']-3
            if width*scale > available:
                scale=available/max(width,0.01)
                warnings.append('A long phrase was reduced to fit the note width; widen the box for larger lettering.')
            if x+width*scale>o['width']-1.5 and x>1.5: new_line()
            slant=rng.normal(0,0.026)*o['variation']
            for si,stroke in enumerate(strokes):
                transformed=[]
                for px,py,p in stroke:
                    tx=x+(px+slant*(1-py))*scale
                    ty=y+py*scale+math.sin(px*0.6+count)*scale*0.022*o['variation']
                    transformed.append([tx,ty,p])
                pressure=float(np.mean([p[2] for p in stroke]))
                weight=o['pen']*(1+o['variation']*(0.2*(pressure-0.5)+0.1*math.sin(si*0.9+count)))
                paths.append(f'<path d="{curve(transformed)}" stroke-width="{weight:.3f}"/>')
                if transformed:
                    line_max=max(line_max,max(p[1] for p in transformed)-y)
                    min_y=min(min_y,min(p[1] for p in transformed))
            x+=width*scale+o['size']*0.45; max_x=max(max_x,x)
    offset=max(0,1-min_y)
    height=y+line_max+2+offset
    if height>500: raise ValueError('This note is too tall. Reduce the text or letter height, or widen its box.')
    title=html.escape(raw)
    body=''.join(paths)
    if offset:
        # Translate the paths themselves so importers need no transform support.
        def shift(match):
            values=match.group(1).split()
            for i in range(1,len(values),2): values[i]=f'{float(values[i])+offset:.3f}'
            return ' '.join(values)
        body=re.sub(r'(?<=[MC] )([\d. -]+)',shift,body)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{o["width"]}mm" height="{height:.3f}mm" viewBox="0 0 {o["width"]} {height:.3f}" role="img" aria-label="{html.escape(raw,quote=True)}"><title>{title}</title><g fill="none" stroke="{o["color"]}" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>'
    if o['engine']=='neural': warnings.append('Neural handwriting can misform or omit letters. Proofread the strokes before issuing a drawing.')
    return dict(svg=svg,width=o['width'],ink_width=round(min(o['width'],max_x+1),3),height=round(height,3),lines=line+1,strokes=len(paths),seed=o['seed'],engine=o['engine'],source=raw,options=o,warnings=list(dict.fromkeys(warnings)),seconds=round(time.perf_counter()-start,2))
