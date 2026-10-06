"""Assemble manual figures from the captures made by build_manual_figures.js.

Reads scratch/_fig/*.png and report.json; writes img/interface-layout.png,
img/codon-example.png, img/move-slide-example.png and img/tree-example.png.
Run: node scratch/build_manual_figures.js && python scratch/build_manual_figures.py
"""
import json
import os
import shutil

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(__file__)
FIG = os.path.join(HERE, '_fig')
IMG = os.path.join(HERE, '..', 'img')
SCALE = 2  # deviceScaleFactor used for the captures
report = json.load(open(os.path.join(FIG, 'report.json'), encoding='utf-8'))


def font(size):
    for name in ('arialbd.ttf', 'DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


# ---- 1.4 layout: numbered outlines around the four areas ------------------------------
im = Image.open(os.path.join(FIG, 'layout.png')).convert('RGB')
d = ImageDraw.Draw(im)
L = report['layout']
areas = [('1', L['menus']), ('2', L['openMenu']), ('3', L['viewport']), ('4', L['versionFile'])]
colour = (220, 40, 40)
f = font(34)
for label, b in areas:
    x0, y0 = b['x'] * SCALE, b['y'] * SCALE
    x1, y1 = (b['x'] + b['w']) * SCALE, min((b['y'] + b['h']) * SCALE, im.height - 3)
    d.rectangle([x0, y0, x1, y1], outline=colour, width=5)
    # badge inside the top-left corner of large areas; just below thin ones (1 and 4)
    # so it covers no control
    bx, by = (x0 + 8, y1 + 6) if label in ('1', '4') else (x0 + 8, y0 + 8)
    if label == '1':   # empty stretch of the row, between Alignment and Keys
        bx = x0 + (x1 - x0) * 0.78
    if label == '3':   # blank bottom-right corner of the viewport
        bx, by = x1 - 60, y1 - 60
    d.ellipse([bx, by, bx + 44, by + 44], fill=colour)
    d.text((bx + 22, by + 22), label, fill='white', font=f, anchor='mm')
im.save(os.path.join(IMG, 'interface-layout.png'), optimize=True)

# ---- 5.4 codon and 9.4 tree: used as captured -----------------------------------------
shutil.copyfile(os.path.join(FIG, 'codon.png'), os.path.join(IMG, 'codon-example.png'))
shutil.copyfile(os.path.join(FIG, 'tree.png'), os.path.join(IMG, 'tree-example.png'))

# ---- 8.4 move/slide: three labelled panels --------------------------------------------
panels = [('Before', 'move_before.png'),
          ('After Move NoGaps on beta_del (grab column 13, drag 3 right)', 'move_after.png'),
          ('After Slide KeepGaps on beta_fs (grab column 6, drag 1 left)', 'slide_after.png')]
ims = [Image.open(os.path.join(FIG, n)).convert('RGB') for _, n in panels]
lab = font(24)
d0 = ImageDraw.Draw(Image.new('RGB', (1, 1)))
pad, head = 16, 40
W = max(max(i.width for i in ims), max(int(d0.textlength(tt, font=lab)) for tt, _ in panels)) + 2 * pad
H = sum(i.height + head + pad for i in ims) + pad
out = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(out)
y = pad
for (title, _), i in zip(panels, ims):
    d.text((pad, y + 6), title, fill=(40, 40, 40), font=lab)
    out.paste(i, (pad, y + head))
    y += head + i.height + pad
out.save(os.path.join(IMG, 'move-slide-example.png'), optimize=True)

for n in ('interface-layout', 'codon-example', 'move-slide-example', 'tree-example'):
    print(n, Image.open(os.path.join(IMG, n + '.png')).size)
