#!/usr/bin/env python3
"""Vigía de la partida de Stardew Valley.

Cuando el juego guarda (al dormir), lee la partida más reciente, actualiza data/partida.js para la
wiki, registra el historial de ingresos y avisa los cumpleaños. Los guardados solo se leen.
Sin dependencias: Python 3 estándar.
"""
import argparse, json, os, subprocess, sys, tempfile, time
import xml.etree.ElementTree as ET
import idioma

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)


def carpeta_saves():
    if os.name == 'nt': return os.path.join(os.environ.get('APPDATA', ''), 'StardewValley', 'Saves')
    normal = os.path.expanduser('~/.config/StardewValley/Saves')
    flatpak = os.path.expanduser('~/.var/app/com.valvesoftware.Steam/config/StardewValley/Saves')
    return flatpak if not os.path.isdir(normal) and os.path.isdir(flatpak) else normal


SAVES = carpeta_saves()
SKEY = {'spring': 0, 'summer': 1, 'fall': 2, 'winter': 3}
XSI = '{http://www.w3.org/2001/XMLSchema-instance}type'
INTERVALO = 3
CULTIVO, PESCA, GANADO, OTROS = 'cultivo', 'pesca', 'ganaderia', 'otros'
# Artesanales: el rubro depende de qué los origina. Los demás van a Otros.
ART_CULTIVO = {'303', '342', '344', '346', '348', '350', '614', 'Raisins', 'DriedFruit'}
ART_PESCA = {'445', '447', 'SmokedFish'}
ART_GANADO = {'306', '307', '308', '424', '426', '428', '432', '807'}
ANIMAL_CATS = {-5, -6, -18, -14}
CROP_CATS = {-75, -79, -80}


# Textos de los avisos y de la consola, en el idioma del vigía (--idioma, o el del sistema).
TEXTOS = {
    'es': dict(nombre='Almanaque del Valle', hoy='Hoy cumple', manana='Mañana cumple', ama='Le encanta: {}.', gusta='Le gusta: {}.',
               sin_partidas='No encontré partidas en ', fecha='{n}: día {d}, estación {s}, año {y}', marcha='Vigía en marcha:', incompleto='Guardado incompleto, reintento:'),
    'en': dict(nombre='Valley Almanac', hoy='Birthday today:', manana='Birthday tomorrow:', ama='Loves: {}.', gusta='Likes: {}.',
               sin_partidas='No saves found in ', fecha='{n}: day {d}, season {s}, year {y}', marcha='Watcher running:', incompleto='Save not finished, retrying:'),
}
TX = TEXTOS['es']


def cargar_datos(root=ROOT, idioma='es'):
    ruta = os.path.join(root, 'data/data.en.js')
    if idioma != 'en' or not os.path.exists(ruta): ruta = os.path.join(root, 'data/data.js')
    src = open(ruta, encoding='utf8').read()
    return json.loads(src[len('window.SDV='):].rstrip().rstrip(';'))


def bare(i):
    return i[3:] if i and i.startswith('(O)') else i


def entero(x, d=0):
    try: return int(float(x))
    except (TypeError, ValueError): return d


def abs_dia(y, s, d):
    return (y - 1) * 112 + s * 28 + d


# ---------- lectura del guardado
def _cultivo(crop, dirt, loc):
    if crop.findtext('forageCrop') == 'true': return None  # jengibre silvestre: crece solo, no es plantado
    if crop.findtext('dead') == 'true': return {'muerto': True, 'loc': loc}
    fases = [entero(e.text) for e in crop.findall('phaseDays/int')]
    cur = entero(crop.findtext('currentPhase')); dia = entero(crop.findtext('dayOfCurrentPhase'))
    if crop.findtext('fullGrown') == 'true': falta = max(0, dia)  # rebrote: el juego cuenta hacia atrás y sigue bajando si no se cosecha
    elif not fases or cur >= len(fases) - 1: falta = 0
    else: falta = max(0, fases[cur] - dia) + sum(fases[cur + 1:len(fases) - 1])
    return {'seed': bare(crop.findtext('seedIndex')), 'item': bare(crop.findtext('indexOfHarvest')), 'falta': falta,
            'abono': bare(dirt.findtext('fertilizer')) if dirt is not None else None, 'loc': loc}


def _cultivos_de(loc, nombre):
    out = []
    for it in loc.findall('terrainFeatures/item'):
        tf = it.find('value/TerrainFeature')
        if tf is None or tf.get(XSI) != 'HoeDirt': continue
        c = tf.find('crop')
        if c is not None: out.append(_cultivo(c, tf, nombre))
    for o in loc.iter('Object'):
        if 'IndoorPot' not in (o.get(XSI) or ''): continue
        c = next(o.iter('crop'), None)
        if c is not None: out.append(_cultivo(c, o.find('hoeDirt'), nombre))
    return [x for x in out if x]


def _agrupar(cultivos):
    g = {}
    for c in cultivos:
        if c.get('muerto'): continue
        k = (c['seed'], c['falta'], c['loc'], c['abono'])
        if k in g: g[k]['n'] += 1
        else: g[k] = dict(c, n=1)
    return sorted(g.values(), key=lambda x: (x['falta'], str(x['seed'])))


def _lotes(cc, bundle_data, D):
    """Progreso por lote, con las mismas claves que usa la wiki: `sala/id` -> {índice: bool}."""
    if cc is None: return {}, [False] * 6, True
    por_id = {str(b['id']): (r, b) for r in D['rooms'] for b in r['bundles']}
    estandar = True
    for it in bundle_data:
        k = it.findtext('key/string') or ''; v = it.findtext('value/string') or ''
        partes = v.split('/'); area, _, bid = k.partition('/')
        tripletas = partes[2].split() if len(partes) > 2 else []
        guardados = [t for t in tripletas[0::3]]
        r_b = por_id.get(bid)
        if not r_b or r_b[0]['id'] != area: estandar = False; continue
        propios = [str(x.get('id', '-1')) for x in r_b[1]['items']]
        if guardados != propios: estandar = False
    out = {}
    for it in cc.findall('bundles/item'):
        bid = it.findtext('key/int'); bs = [e.text == 'true' for e in it.findall('value/ArrayOfBoolean/boolean')]
        if bid not in por_id: continue
        r, b = por_id[bid]
        out[f"{r['id']}/{b['id']}"] = {str(i): bs[i] for i in range(min(len(b['items']), len(bs))) if bs[i]}
    areas = [e.text == 'true' for e in cc.findall('areasComplete/boolean')]
    return out, areas, estandar


def _objetos(items, out):
    for it in items:
        if it.get(XSI) != 'Object' or it.findtext('bigCraftable') == 'true': continue
        i = bare(it.findtext('itemId'))
        if i: out[i] = out.get(i, 0) + entero(it.findtext('stack'), 1)


def _inventario(root, p):
    """Objetos en la mochila, los cofres y la heladera: lo que se puede usar para fabricar o cocinar."""
    out = {}
    _objetos(p.findall('items/Item'), out)
    for el in root.find('locations').iter():
        if (el.get(XSI) == 'Chest' and el.findtext('playerChest') == 'true') or el.tag == 'fridge':
            _objetos(el.findall('items/Item'), out)
    return out


def _maquinas(root, p):
    """Objetos grandes (barriles, envasadoras...) colocados o guardados, por id.
    Los sótanos vienen con toneles de fábrica: solo cuenta el propio y desde la tercera ampliación de la casa."""
    out = {}
    def contar(nodo):
        for el in nodo.iter():
            if el.findtext('bigCraftable') == 'true':
                i = el.findtext('itemId')
                if i: out[i] = out.get(i, 0) + 1
    contar(p)
    sotano = entero(p.findtext('houseUpgradeLevel')) >= 3
    for loc in root.find('locations'):
        n = loc.findtext('name') or ''
        if n.startswith('Cellar') and not (n == 'Cellar' and sotano): continue
        contar(loc)
    return out


def leer_partida(ruta, D):
    root = ET.parse(ruta).getroot()
    p = root.find('player')
    y, s, d = entero(root.findtext('year'), 1), SKEY.get(root.findtext('currentSeason'), 0), entero(root.findtext('dayOfMonth'), 1)
    enviados = {bare(i.findtext('key/string')): entero(i.findtext('value/int')) for i in p.findall('basicShipped/item')}
    stats = {i.findtext('key/string'): entero(i.findtext('value/unsignedInt')) for i in p.findall('stats/Values/item')}
    peces = {}
    for i in p.findall('fishCaught/item'):
        v = i.findall('value/ArrayOfInt/int')
        peces[bare(i.findtext('key/string'))] = entero(v[0].text) if v else 1
    amistad = {}
    for i in p.findall('friendshipData/item'):
        f = i.find('value/Friendship')
        if f is not None:
            amistad[i.findtext('key/string')] = dict(pts=entero(f.findtext('Points')), sem=entero(f.findtext('GiftsThisWeek')), hoy=entero(f.findtext('GiftsToday')), estado=f.findtext('Status'))
    mail = {e.text for e in p.findall('mailReceived/string')}
    cultivos, animales, cc = [], [], None
    for loc in root.find('locations'):
        nombre = loc.findtext('name')
        if nombre in ('Farm', 'Greenhouse'): cultivos += _cultivos_de(loc, nombre)
        if nombre == 'CommunityCenter': cc = loc
        if nombre == 'Farm':
            for a in loc.iter('FarmAnimal'):
                animales.append(dict(tipo=a.findtext('type'), nombre=a.findtext('name'), edad=entero(a.findtext('age')), amistad=entero(a.findtext('friendshipTowardFarmer')), feliz=entero(a.findtext('happiness'))))
    lotes, areas, estandar = _lotes(cc, root.findall('bundleData/item'), D)
    profs = sorted(entero(e.text) for e in p.findall('professions/int'))
    recetas = dict(craft={i.findtext('key/string'): entero(i.findtext('value/int')) for i in p.findall('craftingRecipes/item')},
                   cook=[i.findtext('key/string') for i in p.findall('cookingRecipes/item')],
                   cocinadas={bare(i.findtext('key/string')): entero(i.findtext('value/int')) for i in p.findall('recipesCooked/item')})
    return dict(
        fecha=dict(y=y, s=s, d=d, abs=abs_dia(y, s, d)), jugador=p.findtext('name'), granja=p.findtext('farmName'),
        dinero=entero(p.findtext('money')), total=entero(p.findtext('totalMoneyEarned')),
        niveles={k: entero(p.findtext(k + 'Level')) for k in ('farming', 'fishing', 'foraging', 'mining', 'combat')},
        profs=profs, enviados=enviados, stats=stats, peces=peces, amistad=amistad, cultivos=_agrupar(cultivos),
        muertos=sum(1 for c in cultivos if c.get('muerto')), animales=animales, lotes=lotes, areas=areas, lotesOk=estandar,
        recetas=recetas, inventario=_inventario(root, p), maquinas=_maquinas(root, p),
        isla='willyBoatFixed' in mail or 'Visited_Island' in mail, invernadero=bool(areas and areas[0]) or 'ccPantry' in mail)


# ---------- ingresos
class Precios:
    def __init__(self, D):
        self.o = D['objects']
        self.cosecha = {c['item'] for c in D['crops']} | {t['item'] for t in D['trees'] if t.get('item')}

    def rubro(self, i):
        o = self.o.get(i)
        if not o: return OTROS
        c = o['c']
        if c in CROP_CATS: return CULTIVO if i in self.cosecha else OTROS  # lo recolectado no es cultivo
        if c == -4: return PESCA
        if c in ANIMAL_CATS or i == '430': return GANADO
        if i == '812': return PESCA
        if i in ART_CULTIVO: return CULTIVO
        if i in ART_PESCA: return PESCA
        if i in ART_GANADO: return GANADO
        return OTROS

    def venta(self, i, profs):
        o = self.o.get(i)
        if not o: return 0
        p, c, m = o['p'], o['c'], 1.0
        if 0 in profs and c in ANIMAL_CATS: m *= 1.2
        if 1 in profs and c in CROP_CATS and i in self.cosecha: m *= 1.1
        if 4 in profs and c == -26: m *= 1.4
        if c == -4 and 8 in profs: m *= 1.5
        elif c == -4 and 6 in profs: m *= 1.25
        if 15 in profs and c == -27: m *= 1.25
        return int(p * m)


def reparto(enviado, real, profs, pr):
    """Reparto estimado de `real` entre rubros. El juego no guarda el ingreso por rubro."""
    est = {CULTIVO: 0, PESCA: 0, GANADO: 0}
    for i, n in enviado.items():
        r = pr.rubro(i)
        if r in est: est[r] += n * pr.venta(i, profs)
    suma = sum(est.values())
    if real is not None and suma > real:
        k = real / suma if suma else 0
        est = {a: int(b * k) for a, b in est.items()}
    est[OTROS] = max(0, (real or 0) - sum(est.values()))
    return est


def registrar(hist, snap, pr, prev_extra=None):
    """Guarda el día en el historial. La misma fecha se sobrescribe, así un día no suma dos veces."""
    dias, a = hist['dias'], snap['fecha']['abs']
    for k in [k for k in dias if int(k) > a]: del dias[k]  # se volvió a una partida anterior
    previas = [int(k) for k in dias if int(k) < a]
    prev = dias[str(max(previas))] if previas else prev_extra
    rec = dict(y=snap['fecha']['y'], s=snap['fecha']['s'], d=snap['fecha']['d'], abs=a, total=snap['total'], dinero=snap['dinero'], enviados=snap['enviados'], stats=snap['stats'])
    if prev is None or prev['abs'] >= a:
        rec.update(ingreso=None, dias=0, cat=None, enviadoHoy={}, statsHoy={})
    else:
        real = max(0, snap['total'] - prev['total'])
        hoy = {i: n - prev['enviados'].get(i, 0) for i, n in snap['enviados'].items() if n > prev['enviados'].get(i, 0)}
        stats = {k: v - prev['stats'].get(k, 0) for k, v in snap['stats'].items() if v > prev['stats'].get(k, 0)}
        rec.update(ingreso=real, dias=a - prev['abs'], cat=reparto(hoy, real, snap['profs'], pr), enviadoHoy=hoy, statsHoy=stats)
    dias[str(a)] = rec
    return rec


def cargar_historial(ruta):
    try:
        with open(ruta, encoding='utf8') as f: h = json.load(f)
    except (OSError, ValueError): h = {}
    h.setdefault('dias', {}); h.setdefault('notified', [])
    return h


def snap_base(ruta_old, snap, D):
    """El archivo _old es el día anterior: da el primer delta aunque el historial recién empiece."""
    try: viejo = leer_partida(ruta_old, D)
    except (OSError, ET.ParseError): return None
    if viejo['fecha']['abs'] >= snap['fecha']['abs']: return None
    return dict(abs=viejo['fecha']['abs'], total=viejo['total'], enviados=viejo['enviados'], stats=viejo['stats'])


# ---------- cumpleaños
def cumples(snap, D):
    f = snap['fecha']; manana = (f['s'], f['d'] + 1) if f['d'] < 28 else ((f['s'] + 1) % 4, 1)
    nombre = lambda i: D['objects'].get(i, {}).get('n', i)
    def lista(s, d):
        out = []
        for v in D['villagers']:
            if v['bs'] != s or v['bd'] != d: continue
            if (v['id'] == 'Leo' and not snap['isla']) or (v['id'] == 'Kent' and f['y'] < 2): continue  # todavía no están en el pueblo
            ama = v['personal']['love'] or v['gift']['love']
            out.append(dict(id=v['id'], name=v['name'], tex=v['tex'], ama=[nombre(i) for i in ama[:6]], gusta=[nombre(i) for i in v['personal']['like'][:4]]))
        return out
    return dict(hoy=lista(f['s'], f['d']), manana=lista(*manana))


def avisar(hist, snap, c, root, notificar):
    """Manda cada aviso una sola vez. Devuelve False si alguno falló, para reintentar."""
    a, ok = snap['fecha']['abs'], True
    for cuando, titulo in (('hoy', TX['hoy']), ('manana', TX['manana'])):
        for v in c[cuando]:
            clave = f"{a}:{v['id']}:{cuando}"
            if clave in hist['notified']: continue
            cuerpo = TX['ama'].format(', '.join(v['ama']))
            if v['gusta']: cuerpo += '\n' + TX['gusta'].format(', '.join(v['gusta']))
            icono = os.path.join(root, 'assets/ui/notif', v['tex'] + '.png')
            if notificar(f"{titulo} {v['name']}", cuerpo, icono if os.path.exists(icono) else None): hist['notified'].append(clave)
            else: ok = False
    hist['notified'] = hist['notified'][-80:]
    return ok


def notify_windows(titulo, cuerpo, _icono):
    ps = ("Add-Type -AssemblyName System.Windows.Forms,System.Drawing;$n=New-Object System.Windows.Forms.NotifyIcon;"
          "$n.Icon=[System.Drawing.SystemIcons]::Information;$n.Visible=$true;"
          "$n.ShowBalloonTip(15000,$env:ALMANAQUE_T,$env:ALMANAQUE_C,'Info');Start-Sleep 8;$n.Dispose()")
    env = dict(os.environ, ALMANAQUE_T=titulo, ALMANAQUE_C=cuerpo)
    try: return subprocess.run(['powershell', '-NoProfile', '-Command', ps], env=env, timeout=30, capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW).returncode == 0
    except (OSError, subprocess.SubprocessError): return False


def notify_mac(titulo, cuerpo, _icono):
    # El texto va como argumento del script: así no hay que escaparlo para AppleScript.
    cmd = ['osascript', '-e', 'on run argv', '-e', 'display notification (item 2 of argv) with title (item 3 of argv) subtitle (item 1 of argv)', '-e', 'end run', titulo, cuerpo, TX['nombre']]
    try: return subprocess.run(cmd, timeout=10, capture_output=True).returncode == 0
    except (OSError, subprocess.SubprocessError): return False


def notify_send(titulo, cuerpo, icono):
    if os.name == 'nt': return notify_windows(titulo, cuerpo, icono)
    if sys.platform == 'darwin': return notify_mac(titulo, cuerpo, icono)
    cmd = ['notify-send', '-a', TX['nombre'], '-t', '15000']
    if icono: cmd += ['-i', icono]
    try: return subprocess.run(cmd + ['--', titulo, cuerpo], timeout=10, capture_output=True).returncode == 0
    except (OSError, subprocess.SubprocessError): return False


# ---------- salida
def escribir_atomico(ruta, texto):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(ruta), suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf8') as f: f.write(texto)
    os.chmod(tmp, 0o644); os.replace(tmp, ruta)


def resumen(snap, hist, nombre, stamp, D, pr):
    dias = [hist['dias'][k] for k in sorted(hist['dias'], key=int)]
    filas, estaciones = [], {}
    for r in dias:
        if r['ingreso'] is None: continue
        filas.append({k: r[k] for k in ('y', 's', 'd', 'abs', 'ingreso', 'dias', 'cat')})
        e = estaciones.setdefault(f"{r['y']}-{r['s']}", dict(y=r['y'], s=r['s'], ingreso=0, cat={CULTIVO: 0, PESCA: 0, GANADO: 0, OTROS: 0}))
        e['ingreso'] += r['ingreso']
        for k, v in r['cat'].items(): e['cat'][k] += v
    ultimo = dias[-1] if dias else {}
    top = sorted(snap['enviados'].items(), key=lambda kv: -kv[1] * pr.venta(kv[0], snap['profs']))[:18]
    p = snap['profs']
    return dict(
        ok=True, stamp=stamp, save=nombre, jugador=snap['jugador'], granja=snap['granja'], fecha=snap['fecha'], dinero=snap['dinero'], total=snap['total'],
        niveles=snap['niveles'], farm=dict(level=snap['niveles']['farming'], tiller=1 in p, agri=5 in p, artisan=4 in p, fisher=6 in p, angler=8 in p),
        cultivos=snap['cultivos'], muertos=snap['muertos'], peces=snap['peces'], amistad=snap['amistad'], animales=snap['animales'], lotes=snap['lotes'], lotesOk=snap['lotesOk'],
        isla=snap['isla'], invernadero=snap['invernadero'], stats=snap['stats'], cumples=cumples(snap, D), recetas=snap['recetas'], inventario=snap['inventario'], maquinas=snap['maquinas'],
        ingresos=dict(dias=filas, estaciones=list(estaciones.values()), hoy=ultimo.get('ingreso'), catHoy=ultimo.get('cat'), statsHoy=ultimo.get('statsHoy', {}), enviadoHoy=ultimo.get('enviadoHoy', {}),
                      acumulado=reparto(snap['enviados'], snap['total'], p, pr), top=top))


def procesar(ruta, nombre, salida, D, pr, notificar, root=ROOT):
    snap = leer_partida(ruta, D)
    ruta_h = os.path.join(salida, 'historial', nombre + '.json')
    hist = cargar_historial(ruta_h)
    extra = None if hist['dias'] else snap_base(ruta + '_old', snap, D)
    registrar(hist, snap, pr, extra)
    st = os.stat(ruta); stamp = f"{nombre}:{snap['fecha']['abs']}:{st.st_mtime_ns}"
    out = resumen(snap, hist, nombre, stamp, D, pr)
    escribir_atomico(os.path.join(salida, 'partida.js'), 'window.PARTIDA=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    ok = avisar(hist, snap, out['cumples'], root, notificar)
    escribir_atomico(ruta_h, json.dumps(hist, ensure_ascii=False, separators=(',', ':')))
    return snap, ok


def mas_reciente(saves):
    mejor = None
    try: nombres = os.listdir(saves)
    except OSError: return None
    for n in nombres:
        r = os.path.join(saves, n, n)
        try: st = os.stat(r)
        except OSError: continue
        if mejor is None or st.st_mtime_ns > mejor[0]: mejor = (st.st_mtime_ns, st.st_size, r, n)
    return mejor


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--saves', default=SAVES); ap.add_argument('--salida', default=os.path.join(ROOT, 'data'))
    ap.add_argument('--una-vez', action='store_true', help='procesa la partida más reciente y termina')
    ap.add_argument('--sin-notificar', action='store_true')
    ap.add_argument('--idioma', choices=idioma.IDIOMAS, help='idioma de los avisos (por defecto, el del sistema)')
    a = ap.parse_args()
    global TX
    lang = idioma.elegir(a.idioma); TX = TEXTOS[lang]
    D = cargar_datos(idioma=lang); pr = Precios(D)
    notificar = (lambda *_: True) if a.sin_notificar else notify_send
    if a.una_vez:
        m = mas_reciente(a.saves)
        if not m: sys.exit(TX['sin_partidas'] + a.saves)
        snap, _ = procesar(m[2], m[3], a.salida, D, pr, notificar); f = snap['fecha']
        print(TX['fecha'].format(n=m[3], d=f['d'], s=f['s'], y=f['y'])); return
    print(TX['marcha'], a.saves, flush=True)
    hecho, espera, reintento = None, None, 0
    while True:
        m = mas_reciente(a.saves)
        firma = m[:2] + (m[3],) if m else None
        if firma and firma != hecho:
            if firma == espera:  # no cambió entre dos vueltas: el juego terminó de escribir
                try:
                    snap, ok = procesar(m[2], m[3], a.salida, D, pr, notificar); hecho = firma
                    reintento = 0 if ok else time.monotonic() + 60
                    f = snap['fecha']; print(TX['fecha'].format(n=m[3], d=f['d'], s=f['s'], y=f['y']), flush=True)
                except (ET.ParseError, OSError) as e:
                    print(TX['incompleto'], e, flush=True); espera = None
            else: espera = firma
        elif firma and reintento and time.monotonic() >= reintento:  # el demonio de notificaciones no estaba listo
            try:
                _, ok = procesar(m[2], m[3], a.salida, D, pr, notificar)
                reintento = 0 if ok else time.monotonic() + 60
            except (ET.ParseError, OSError): reintento = time.monotonic() + 60
        time.sleep(INTERVALO)


if __name__ == '__main__':
    main()
