"""Íconos de camisas y pantalones como los dibuja el juego en el inventario.

La camisa es la base de 8x8 más su máscara teñida con el color por defecto; el pantalón es su ícono de 16x16 teñido.
03-build-data.py usa `layout` para saber dónde queda cada prenda y 04-assets.py usa `render` para dibujar la hoja.
"""
import json, os

COLS = 32  # celdas de 16x16 por fila en assets/sheets/ropa.png


def _C(raw, p): return json.load(open(os.path.join(raw, p + '.json'), encoding='utf8'))['content']


def layout(raw):
    """[(id calificado, 'S'|'P', datos)] en el orden de las celdas de la hoja."""
    out = []
    for kind, f in (('S', 'Data/Shirts'), ('P', 'Data/Pants')):
        for k, v in _C(raw, f).items(): out.append((f'({kind}){k}', kind, v))
    return out


def celda(i): return (i % COLS) * 16, (i // COLS) * 16


def tamano(n): return [COLS * 16, (n + COLS - 1) // COLS * 16]


def _color(v):
    c = (v.get('DefaultColor') or '').strip()
    if not c: return (255, 255, 255)
    if c[0].isdigit(): return tuple(int(x) for x in c.split()[:3])
    from PIL import ImageColor  # el juego también acepta nombres de color de XNA, como "White"
    return ImageColor.getrgb(c)[:3]


def _tenir(im, col):
    r, g, b, a = im.split()
    r = r.point(lambda x: x * col[0] // 255); g = g.point(lambda x: x * col[1] // 255); b = b.point(lambda x: x * col[2] // 255)
    from PIL import Image
    return Image.merge('RGBA', (r, g, b, a))


def render(raw, dst):
    from PIL import Image
    L = layout(raw)
    sh = Image.open(os.path.join(raw, 'Characters/Farmer/shirts.png')).convert('RGBA')
    pa = Image.open(os.path.join(raw, 'Characters/Farmer/pants.png')).convert('RGBA')
    out = Image.new('RGBA', tuple(tamano(len(L))))
    for i, (_, kind, v) in enumerate(L):
        x, y = celda(i); idx = v['SpriteIndex']; col = _color(v)
        if kind == 'S':
            sx, sy = idx * 8 % 128, idx * 8 // 128 * 32
            base = sh.crop((sx, sy, sx + 8, sy + 8))
            out.paste(Image.alpha_composite(base, _tenir(sh.crop((sx + 128, sy, sx + 136, sy + 8)), col)), (x, y))
        else:
            n = pa.width // 192
            sx, sy = 192 * (idx % n), 688 * (idx // n) + 672
            out.paste(_tenir(pa.crop((sx, sy, sx + 16, sy + 16)), col), (x, y))
    out.save(dst)
