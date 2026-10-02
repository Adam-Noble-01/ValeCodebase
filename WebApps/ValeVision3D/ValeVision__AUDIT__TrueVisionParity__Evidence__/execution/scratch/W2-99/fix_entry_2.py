"""W2-99 scratch: one more Known, accepted bullet (records hygiene) in the devlog entry, before the Meta__Author bullet."""
import os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'devlog_entry_w2.txt')
t = open(P, encoding='ascii').read()
anchor = '- `Meta__Author : "Adam Noble - Noble Architecture"` stays in the Spell Check config'
add = ('- RECORDS HYGIENE FOR W6-01 (comments only; nothing breaks): the 49 render layer\'s PORT NOTE still says nothing\n'
       '  calls RenderLayerFrame (the snapshot renderer does since W2-15); RenderComposites\' header and its config\'s\n'
       '  Meta__WhyWeightsHere still name the main config\'s Drawing2dEdgeWidth, which W2-08 removed; the Cross Sections\n'
       '  README\'s file table predates W2-02; FacePick\'s and GizmoGrip\'s PORT NOTEs still say TrueVision has neither\n'
       '  (both apps hold both, unused); SpecData__Transport\'s PORT NOTE names the retired R2DrawingNotes as history.\n')
assert t.count(anchor) == 1
t = t.replace(anchor, add + anchor)
open(P, 'w', encoding='ascii', newline='\n').write(t)
print('added')
