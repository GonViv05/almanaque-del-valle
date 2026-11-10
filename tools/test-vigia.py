#!/usr/bin/env python3
"""Pruebas del vigía sobre COPIAS de una partida: nunca toca los guardados reales.

Uso: python3 test-vigia.py [carpeta-de-la-partida]
"""
import hashlib, importlib.util, json, os, re, shutil, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('vigia', os.path.join(HERE, 'vigia.py')); V = importlib.util.module_from_spec(spec); spec.loader.exec_module(V)
if len(sys.argv) < 2: sys.exit('Uso: test-vigia.py <carpeta de una partida>')
SAVE = sys.argv[1]
NOMBRE = os.path.basename(SAVE.rstrip('/'))
fallos = 0
def ok(cond, msg):
    global fallos
    print(('  ok  ' if cond else 'FALLA ') + msg)
    if not cond: fallos += 1
def md5(p): return hashlib.md5(open(p, 'rb').read()).hexdigest()
ANTES = {f: md5(os.path.join(SAVE, f)) for f in os.listdir(SAVE)}
D = V.cargar_datos(); pr = V.Precios(D)
tmp = tempfile.mkdtemp(prefix='vigia-'); saves = os.path.join(tmp, 'saves'); salida = os.path.join(tmp, 'data')
shutil.copytree(SAVE, os.path.join(saves, NOMBRE))
ruta = os.path.join(saves, NOMBRE, NOMBRE)
avisos = []
def nota(t, c, i): avisos.append((t, c, i)); return True
def editar(dia, delta_total, extra_fish=0):
    """Avanza la copia a `dia` y suma dinero: lo que hace el juego al dormir."""
    s = open(ruta, encoding='utf8').read()
    s = re.sub(r'<dayOfMonth>\d+</dayOfMonth>', f'<dayOfMonth>{dia}</dayOfMonth>', s, count=1)
    t = int(re.search(r'<totalMoneyEarned>(\d+)</totalMoneyEarned>', s).group(1)) + delta_total
    s = re.sub(r'<totalMoneyEarned>\d+</totalMoneyEarned>', f'<totalMoneyEarned>{t}</totalMoneyEarned>', s, count=1)
    if extra_fish:  # 5 sardinas enviadas más
        s = re.sub(r'(<key><string>131</string></key><value><int>)(\d+)', lambda m: m.group(1) + str(int(m.group(2)) + extra_fish), s, count=1)
    open(ruta, 'w', encoding='utf8').write(s)
def pro(notificar=nota): return V.procesar(ruta, NOMBRE, salida, D, pr, notificar)
hist = lambda: V.cargar_historial(os.path.join(salida, 'historial', NOMBRE + '.json'))
def partida():
    s = open(os.path.join(salida, 'partida.js'), encoding='utf8').read(); return json.loads(s[len('window.PARTIDA='):].rstrip().rstrip(';'))

print('Lectura'); snap, _ = pro(); f0 = snap['fecha']
ok(snap['jugador'] and snap['total'] > 0, f"jugador {snap['jugador']}, total {snap['total']}")
ok(not any(c['loc'] not in ('Farm', 'Greenhouse') for c in snap['cultivos']), 'solo cultivos de granja/invernadero')
ok(not any(c['seed'] is None for c in snap['cultivos']), f"{sum(c['n'] for c in snap['cultivos'])} plantas propias (sin jengibre silvestre)")
ok(all(c['falta'] >= 0 for c in snap['cultivos']), 'días restantes no negativos')
ok(all(c['seed'] in {x['id'] for x in D['crops']} for c in snap['cultivos']), 'todas las semillas existen en los datos')
ok(snap['isla'] is False and snap['invernadero'] is False, 'isla e invernadero sin desbloquear en esta partida')
ok(snap['lotesOk'] is True, 'lotes estándar reconocidos')
ok('Fried Egg' in snap['recetas']['cook'] and snap['recetas']['craft'].get('Wood Path', 0) > 0, f"recetas: {len(snap['recetas']['craft'])} de fabricación, {len(snap['recetas']['cook'])} de cocina")
ok(all(k in {r['key'] for r in D['recipes']} for k in list(snap['recetas']['craft']) + snap['recetas']['cook']), 'todas las recetas aprendidas existen en los datos')
ok(snap['inventario'].get('388', 0) > 0 and all(n > 0 for n in snap['inventario'].values()), f"inventario y cofres: {len(snap['inventario'])} objetos distintos, {snap['inventario'].get('388', 0)} de madera")
ok(snap['maquinas'].get('130', 0) >= 5, f"máquinas y objetos grandes: {sum(snap['maquinas'].values())} ({snap['maquinas'].get('130', 0)} cofres)")
ok(any(snap['lotes'].values()), 'hay progreso de lotes leído')

print('Primer día: usa _old')
r = hist()['dias'][str(f0['abs'])]
ok(r['ingreso'] is not None and r['dias'] == 1, f"delta contra _old: ingreso {r['ingreso']}")
ok(sum(r['cat'].values()) == r['ingreso'], 'la suma de rubros cierra con el total real')
d = f0['d'] + 1

print('Día siguiente'); editar(d, 5000, 5); pro()
r = hist()['dias'][str(f0['abs'] + 1)]
ok(r['ingreso'] == 5000, f"ingreso real {r['ingreso']}")
ok(sum(r['cat'].values()) == 5000, 'rubros cierran')
ok(r['enviadoHoy'].get('131') == 5, '5 sardinas enviadas ese día')
ok(r['cat']['pesca'] > 0, f"pesca estimada {r['cat']['pesca']}")
print('Misma fecha no duplica')
pro(); h = hist(); r2 = h['dias'][str(f0['abs'] + 1)]
ok(r2['ingreso'] == 5000 and len(h['dias']) == 2, 'reprocesar el mismo día deja el mismo ingreso')

print('Reparto no se pasa del real')
est = V.reparto({'131': 1000}, 100, snap['profs'], pr); ok(sum(est.values()) == 100 and est['pesca'] <= 100, f"escala: {est}")
est = V.reparto({}, 700, snap['profs'], pr); ok(est['otros'] == 700, 'sin envíos, todo en Otros')
est = V.reparto({'24': 10}, 0, [], pr); ok(sum(est.values()) == 0, 'ingreso cero')

print('Rubros')
for i, e in (('24', 'cultivo'), ('131', 'pesca'), ('176', 'ganaderia'), ('424', 'ganaderia'), ('348', 'cultivo'), ('445', 'pesca'), ('430', 'ganaderia'), ('334', 'otros'), ('16', 'otros')):
    ok(pr.rubro(i) == e, f"{D['objects'][i]['en']} -> {e}")

print('XML truncado')
ok_ex = False
bak = open(ruta, encoding='utf8').read(); open(ruta, 'w', encoding='utf8').write(bak[:len(bak) // 2])
antes_js = md5(os.path.join(salida, 'partida.js'))
try: pro()
except V.ET.ParseError: ok_ex = True
ok(ok_ex, 'lanza ParseError para reintentar'); ok(md5(os.path.join(salida, 'partida.js')) == antes_js, 'no pisa partida.js')
open(ruta, 'w', encoding='utf8').write(bak)

print('Cumpleaños')
v = D['villagers'][0]
sn = dict(snap, fecha=dict(y=2, s=v['bs'], d=v['bd'], abs=V.abs_dia(2, v['bs'], v['bd'])))
c = V.cumples(sn, D); ok(any(x['id'] == v['id'] for x in c['hoy']), f"{v['name']} cumple hoy")
ok(c['hoy'] and c['hoy'][0]['ama'], f"gustos: {c['hoy'][0]['ama'][:3]}")
h = {'dias': {}, 'notified': []}; avisos.clear()
ok(V.avisar(h, sn, c, V.ROOT, nota) and len(avisos) >= 1, 'envía el aviso'); n = len(avisos)
V.avisar(h, sn, c, V.ROOT, nota); ok(len(avisos) == n, 'no lo repite')
h2 = {'dias': {}, 'notified': []}; ok(not V.avisar(h2, sn, c, V.ROOT, lambda *_: False) and not h2['notified'], 'si notify-send falla, queda pendiente')
k = next(x for x in D['villagers'] if x['id'] == 'Kent'); sn3 = dict(snap, fecha=dict(y=1, s=k['bs'], d=k['bd'], abs=1))
ok(not any(x['id'] == 'Kent' for x in V.cumples(sn3, D)['hoy']), 'Kent no aparece el año 1')
s28 = dict(snap, fecha=dict(y=1, s=0, d=28, abs=28)); c28 = V.cumples(s28, D); ok(isinstance(c28['manana'], list), 'día 28 pasa a la estación siguiente')

print('Rebobinar')
editar(f0['d'], 0); pro(); ok(str(f0['abs'] + 1) not in hist()['dias'], 'volver a una fecha anterior borra el futuro')

print('Salida para la wiki')
p = partida(); ok(p['ok'] and p['stamp'] and p['fecha']['abs'] == f0['abs'], 'partida.js válido'); ok('enviados' not in json.dumps(p['ingresos']['dias']), 'el historial completo no va a la wiki')

print('Los guardados reales no cambiaron')
ok(ANTES == {f: md5(os.path.join(SAVE, f)) for f in os.listdir(SAVE)}, 'checksums iguales')
shutil.rmtree(tmp)
print(f"\n{'TODO OK' if not fallos else str(fallos) + ' FALLOS'}"); sys.exit(1 if fallos else 0)
