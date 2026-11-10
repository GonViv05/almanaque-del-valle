#!/usr/bin/env python3
"""Copia hojas de sprites del juego a ../assets, recorta piezas de interfaz y convierte las fuentes bitmap a TTF."""
import json, os, shutil
from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
HERE = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(HERE, '.raw'); A = os.path.join(os.path.dirname(HERE), 'assets')
for d in ('sheets', 'ui', 'fonts', 'portraits', 'animals', 'characters'): os.makedirs(os.path.join(A, d), exist_ok=True)
def cp(src, dst): shutil.copy(os.path.join(RAW, src), os.path.join(A, dst))
for s, d in [('Maps/springobjects.png', 'o'), ('TileSheets/Objects_2.png', 'o2'), ('TileSheets/crops.png', 'crops'), ('TileSheets/Craftables.png', 'big'), ('LooseSprites/JunimoNote.es-ES.png', 'junimo'), ('LooseSprites/stardewPanorama.png', 'panorama'), ('TileSheets/fruitTrees.png', 'trees')]:
    cp(s, f'sheets/{d}.png')
# Pestaña Objetos: armas, herramientas, sombreros, muebles y la hoja de ropa (teñida como en el inventario).
for s in ['TileSheets/weapons', 'TileSheets/tools', 'Characters/Farmer/hats', 'TileSheets/FreeCactuses'] + ['TileSheets/' + f[:-4] for f in sorted(os.listdir(os.path.join(RAW, 'TileSheets'))) if f.endswith('.png') and 'furniture' in f]:
    cp(s + '.png', f'sheets/{s.split("/")[-1]}.png')
import ropa
ropa.render(RAW, os.path.join(A, 'sheets/ropa.png'))
for f in os.listdir(os.path.join(RAW, 'Portraits')):
    if f.endswith('.png') and '_' not in f: cp('Portraits/' + f, 'portraits/' + f)
# Iconos para las notificaciones de cumpleaños: primer retrato de cada hoja, en píxeles nítidos.
os.makedirs(os.path.join(A, 'ui/notif'), exist_ok=True)
for f in os.listdir(os.path.join(A, 'portraits')):
    if not f.endswith('.png'): continue
    im = Image.open(os.path.join(A, 'portraits', f)).convert('RGBA'); c = im.width // 2
    im.crop((0, 0, c, c)).resize((128, 128), Image.NEAREST).save(os.path.join(A, 'ui/notif', f))
for f in os.listdir(os.path.join(RAW, 'Characters')):
    if f.endswith('.png') and '_' not in f: cp('Characters/' + f, 'characters/' + f)
for f in os.listdir(os.path.join(RAW, 'Animals')):
    if f.endswith('.png'): cp('Animals/' + f, 'animals/' + f)
cur = Image.open(os.path.join(RAW, 'LooseSprites/Cursors.es-ES.png' if os.path.exists(os.path.join(RAW, 'LooseSprites/Cursors.es-ES.png')) else 'LooseSprites/Cursors.png')).convert('RGBA')
men = Image.open(os.path.join(RAW, 'Maps/MenuTiles.png')).convert('RGBA')
txt = Image.open(os.path.join(RAW, 'LooseSprites/textBox.png')).convert('RGBA')
UI = dict(cursor=(0, 0, 16, 16), hand=(32, 0, 16, 16), coin=(193, 373, 9, 10), heart=(211, 428, 7, 6), heartE=(218, 428, 7, 6), qs=(338, 400, 8, 8), qg=(346, 400, 8, 8), qi=(346, 392, 8, 8),
    tab=(16, 368, 16, 16), box=(384, 373, 18, 18), ok=(128, 256, 64, 64), cancel=(192, 256, 64, 64), left=(352, 495, 12, 11), right=(365, 495, 12, 11), up=(421, 459, 11, 12), down=(421, 472, 11, 12), bar=(435, 463, 6, 10), runner=(403, 383, 6, 6), chk0=(227, 425, 9, 9), chk1=(236, 425, 9, 9), ddbox=(433, 451, 3, 3), ddarrow=(437, 450, 10, 11), clock=(333, 431, 71, 43), sunny=(341, 421, 12, 8), rain=(365, 421, 12, 8), digits=(368, 56, 50, 7), s0=(406, 441, 12, 8), s1=(406, 449, 12, 8), s2=(406, 457, 12, 8), s3=(406, 465, 12, 8), plank=(293, 360, 24, 24))
for k, r in UI.items(): cur.crop((r[0], r[1], r[0] + r[2], r[1] + r[3])).save(os.path.join(A, f'ui/{k}.png'))
for k in ('cursor', 'hand'): Image.open(os.path.join(A, f'ui/{k}.png')).resize((48, 48), Image.NEAREST).save(os.path.join(A, f'ui/{k}48.png'))
Image.open(os.path.join(RAW, 'Maps/springobjects.png')).convert('RGBA').crop((0, 16, 16, 32)).resize((128, 128), Image.NEAREST).save(os.path.join(A, 'ui/icon.png'))
men.crop((0, 256, 60, 60 + 256)).save(os.path.join(A, 'ui/menu.png'))
men.crop((128, 128, 192, 192)).save(os.path.join(A, 'ui/slot.png'))
txt.save(os.path.join(A, 'ui/textbox.png'))
# Tablero del calendario del pueblo (con los días de la semana en español) y la estrella de los festivales.
bb = Image.open(os.path.join(RAW, 'LooseSprites/Billboard.es-ES.png' if os.path.exists(os.path.join(RAW, 'LooseSprites/Billboard.es-ES.png')) else 'LooseSprites/Billboard.png')).convert('RGBA')
bb.crop((0, 198, 301, 396)).save(os.path.join(A, 'ui/calendario.png'))
bb.crop((140, 398, 150, 408)).save(os.path.join(A, 'ui/star.png'))
# ---- fuentes: cada píxel de la fuente original pasa a ser un cuadrado en el TTF
PX = 32
def build(name, family):
    j = json.load(open(os.path.join(RAW, f'Fonts/{name}.json'), encoding='utf8'))['content']
    img = Image.open(os.path.join(RAW, f'Fonts/{name}.png')).convert('RGBA').getchannel('A')
    W, H = img.size; px = img.load(); ls = j['verticalLineSpacing']; hs = j.get('horizontalSpacing', 0) or 0
    base = round(ls * .78); glyphs = {'.notdef': TTGlyphPen(None).glyph()}; adv = {'.notdef': (PX * 8, 0)}; cmap = {}
    for ch, g, c, k in zip(j['characterMap'], j['glyphs'], j['cropping'], j['kerning']):
        name_ = 'u%04X' % ord(ch); pen = TTGlyphPen(None)
        lsb = (k['x'] + c['x']) * PX; y0 = base - c['y']
        spans = {}
        for y in range(g['height']):
            x = 0; row = []
            while x < g['width']:
                if g['x'] + x < W and g['y'] + y < H and px[g['x'] + x, g['y'] + y] >= 128:
                    s = x
                    while x < g['width'] and px[g['x'] + x, g['y'] + y] >= 128: x += 1
                    row.append((s, x))
                else: x += 1
            spans[y] = row
        done = set()
        for y in range(g['height']):
            for r in spans[y]:
                if (y, r) in done: continue
                h = 1
                while y + h < g['height'] and r in spans[y + h] and (y + h, r) not in done: done.add((y + h, r)); h += 1
                x1, x2 = r[0] * PX + lsb, r[1] * PX + lsb; y1 = (y0 - y) * PX; y2 = y1 - h * PX
                pen.moveTo((x1, y1)); pen.lineTo((x2, y1)); pen.lineTo((x2, y2)); pen.lineTo((x1, y2)); pen.closePath()
        glyphs[name_] = pen.glyph(); adv[name_] = (max(0, (k['x'] + k['y'] + k['z'] + hs) * PX), lsb); cmap[ord(ch)] = name_
    order = list(glyphs)
    fb = FontBuilder(1024, isTTF=True); fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf({n: glyphs[n] for n in order})
    fb.setupHorizontalMetrics({n: adv[n] for n in order}); asc = base * PX; desc = -(ls - base) * PX
    fb.setupHorizontalHeader(ascent=asc, descent=desc); fb.setupOS2(sTypoAscender=asc, sTypoDescender=desc, usWinAscent=asc, usWinDescent=-desc, sTypoLineGap=0)
    fb.setupNameTable(dict(familyName=family, styleName='Regular')); fb.setupPost(); fb.save(os.path.join(A, f'fonts/{family}.ttf'))
    print(family, len(cmap), 'glifos; alto de línea', ls)
build('SmallFont.es-ES', 'SDVSmall'); build('SpriteFont1.es-ES', 'SDVDialog')
# Firefox no carga fuentes desde file://: van embebidas para que index.html abra con doble clic.
import base64
css = ''.join("@font-face{font-family:%s;src:url(data:font/ttf;base64,%s) format('truetype');}\n" % (f, base64.b64encode(open(os.path.join(A, f'fonts/{f}.ttf'), 'rb').read()).decode()) for f in ('SDVSmall', 'SDVDialog'))
open(os.path.join(os.path.dirname(HERE), 'css/fonts.css'), 'w', encoding='utf8').write(css)
sheet = Image.new('RGBA', (1000, 560), (90, 120, 90, 255)); x = y = 8; rowh = 0
for k, r in list(UI.items()):
    im = cur.crop((r[0], r[1], r[0] + r[2], r[1] + r[3])); z = 4 if r[2] < 40 else 2; im = im.resize((im.width * z, im.height * z), Image.NEAREST)
    if x + im.width > 990: x = 8; y += rowh + 8; rowh = 0
    sheet.paste(im, (x, y), im); x += im.width + 10; rowh = max(rowh, im.height)
m = men.crop((0, 256, 60, 316)).resize((180, 180), Image.NEAREST); sheet.paste(m, (8, y + rowh + 10), m)
m = men.crop((128, 128, 192, 192)).resize((128, 128), Image.NEAREST); sheet.paste(m, (200, y + rowh + 10), m)
j = Image.open(os.path.join(RAW, 'LooseSprites/JunimoNote.png')).convert('RGBA'); c = j.crop((0, 180, 640, 308)); sheet.paste(c, (340, y + rowh + 10), c)
sheet.save(os.path.join(HERE, '.contact.png'))
