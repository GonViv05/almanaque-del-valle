#!/usr/bin/env python3
"""Instalador de Almanaque del Valle (Windows, macOS y Linux).

Genera los datos y sprites desde tu propia copia de Stardew Valley, crea un acceso directo y,
si querés, deja corriendo el vigía de la partida. La carpeta del juego y los guardados solo se leen.
"""
import argparse, os, re, shutil, subprocess, sys, venv

ROOT = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.join(ROOT, 'tools')
VENV = os.path.join(TOOLS, '.venv')
WIN = os.name == 'nt'
MAC = sys.platform == 'darwin'
HOME = os.path.expanduser('~')
SUBDIRS = ['steamapps/common/Stardew Valley']
SERVICIO = 'almanaque-vigia'
ETIQUETA_MAC = 'io.github.gonviv05.almanaque-vigia'


class Fallo(Exception):
    pass


def paso(n, texto):
    print(f'\n[{n}/6] {texto}', flush=True)


def correr(cmd, cwd=TOOLS, env=None):
    e = dict(os.environ, PYTHONUTF8='1', **(env or {}))
    r = subprocess.run([str(c) for c in cmd], cwd=cwd, env=e)
    if r.returncode: raise Fallo(f'Falló: {" ".join(str(c) for c in cmd)}')


def bibliotecas_steam():
    raices = []
    if WIN:
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Valve\Steam') as k:
                raices.append(winreg.QueryValueEx(k, 'SteamPath')[0])
        except OSError:
            pass
        for v in ('ProgramFiles(x86)', 'ProgramFiles'):
            if os.environ.get(v): raices.append(os.path.join(os.environ[v], 'Steam'))
    elif MAC:
        raices.append(os.path.join(HOME, 'Library/Application Support/Steam'))
    else:
        raices += [os.path.join(HOME, p) for p in ('.local/share/Steam', '.steam/steam', '.steam/root', '.var/app/com.valvesoftware.Steam/.local/share/Steam')]
    salida = list(raices)
    for r in raices:
        try:
            with open(os.path.join(r, 'steamapps', 'libraryfolders.vdf'), encoding='utf8', errors='replace') as f:
                salida += [p.replace('\\\\', '\\') for p in re.findall(r'"path"\s+"([^"]+)"', f.read())]
        except OSError:
            pass
    return salida


def rutas_juego(c):
    """(StardewValley.GameData.dll, carpeta Content) si el juego está en c, o None.
    En Windows y Linux están juntos; en Mac, dentro del paquete: Contents/MacOS y Contents/Resources/Content."""
    if not c: return None
    for d, content in ((c, os.path.join(c, 'Content')),
                       (os.path.join(c, 'Contents', 'MacOS'), os.path.join(c, 'Contents', 'Resources', 'Content')),
                       (c, os.path.join(c, '..', 'Resources', 'Content'))):
        dll = os.path.join(d, 'StardewValley.GameData.dll')
        if os.path.isfile(dll) and os.path.isdir(content): return dll, os.path.normpath(content)
    return None


def es_juego(c):
    return rutas_juego(c) is not None


def candidatos():
    for b in bibliotecas_steam():
        for s in SUBDIRS: yield os.path.join(b, s)
    if WIN:
        for v in ('ProgramFiles(x86)', 'ProgramFiles'):
            if os.environ.get(v):
                yield os.path.join(os.environ[v], 'GOG Galaxy', 'Games', 'Stardew Valley')
                yield os.path.join(os.environ[v], 'ModifiableWindowsApps', 'Stardew Valley')
    elif MAC:
        for d in ('/Applications', os.path.join(HOME, 'Applications')): yield os.path.join(d, 'Stardew Valley.app')
    else:
        yield os.path.join(HOME, 'GOG Games', 'Stardew Valley', 'game')


def buscar_juego(indicado, preguntar):
    if indicado:
        if es_juego(indicado): return indicado
        raise Fallo(f'En "{indicado}" no encontré los archivos del juego (Content/ y StardewValley.GameData.dll).')
    for c in candidatos():
        if es_juego(c): return c
    if not preguntar: raise Fallo('No encontré el juego. Indicá la carpeta con --juego "<ruta>".')
    print('No encontré Stardew Valley automáticamente.')
    print('En Steam: clic derecho en el juego > Administrar > Ver archivos locales, y copiá esa ruta.')
    while True:
        if MAC: print('En Mac también podés arrastrar la carpeta (o Stardew Valley.app) a esta ventana.')
        c = input('Carpeta del juego (vacío para salir): ').strip().strip('"\'')
        if not WIN: c = c.replace('\\ ', ' ')  # la Terminal escapa los espacios al arrastrar
        if not c: raise Fallo('Instalación cancelada.')
        if es_juego(os.path.expanduser(c)): return os.path.expanduser(c)
        print('Ahí no están los archivos del juego (Content/ y StardewValley.GameData.dll). Probá de nuevo.')


def comprobar_programas():
    if sys.version_info < (3, 9): raise Fallo('Hace falta Python 3.9 o más nuevo.')
    node, npm = shutil.which('node'), shutil.which('npm')
    if not node or not npm: raise Fallo('Hace falta Node.js 22.7 o más nuevo: https://nodejs.org/')
    v = subprocess.run([node, '--version'], capture_output=True, text=True).stdout.strip()
    if tuple(int(x) for x in v.lstrip('v').split('.')[:2]) < (22, 7): raise Fallo(f'Tu Node.js es {v}; hace falta 22.7 o más nuevo: https://nodejs.org/')
    return node, npm


def python_venv(gui=False):
    if WIN: return os.path.join(VENV, 'Scripts', 'pythonw.exe' if gui else 'python.exe')
    return os.path.join(VENV, 'bin', 'python')


def generar(juego, node, npm):
    paso(2, 'Preparando dependencias (solo la primera vez tarda)')
    if not os.path.exists(python_venv()): venv.create(VENV, with_pip=True)
    py = python_venv()
    correr([py, '-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', 'requirements.txt'])
    correr([npm, 'ci', '--silent', '--no-audit', '--no-fund'])
    dll, content = rutas_juego(juego)
    paso(3, 'Leyendo el formato de datos de tu versión del juego')
    correr([py, '00-schemas.py', dll, 'schemes.json'])
    paso(4, 'Extrayendo datos y sprites del juego')
    correr([node, '01-unpack.mjs'], env={'SDV_CONTENT': content})
    correr([py, '03-build-data.py'])
    correr([py, '04-assets.py'])
    partida = os.path.join(ROOT, 'data', 'partida.js')
    if not os.path.exists(partida):
        with open(partida, 'w', encoding='utf8') as f: f.write('window.PARTIDA=null;\n')


def leer_partida_ahora():
    sys.path.insert(0, TOOLS)
    import vigia
    if vigia.mas_reciente(vigia.SAVES):
        correr([python_venv(), 'vigia.py', '--una-vez', '--sin-notificar'])
    else:
        print('Todavía no hay partidas guardadas: la pestaña Mi Granja se completa cuando juegues.')


# ---------- acceso directo
def escritorio_windows():
    r = subprocess.run(['powershell', '-NoProfile', '-Command', "[Environment]::GetFolderPath('Desktop')"], capture_output=True, text=True)
    return r.stdout.strip() or os.path.join(HOME, 'Desktop')


def powershell(script, **valores):
    env = dict(os.environ, **valores)
    subprocess.run(['powershell', '-NoProfile', '-Command', script], env=env, check=True)


def app_mac():
    return os.path.join(HOME, 'Applications', 'Almanaque del Valle.app')


def crear_acceso():
    indice = os.path.join(ROOT, 'index.html')
    if MAC:
        # Una mini app de AppleScript que abre la wiki en el navegador; queda en ~/Applications y la encuentra Spotlight.
        texto = lambda t: '"' + t.replace('\\', '\\\\').replace('"', '\\"') + '"'
        if os.path.exists(app_mac()): shutil.rmtree(app_mac())
        os.makedirs(os.path.dirname(app_mac()), exist_ok=True)
        subprocess.run(['osacompile', '-o', app_mac(), '-e', f'do shell script "open " & quoted form of {texto(indice)}'], check=True, capture_output=True)
        icns = os.path.join(app_mac(), 'Contents', 'Resources', 'applet.icns')
        subprocess.run(['sips', '-s', 'format', 'icns', os.path.join(ROOT, 'assets/ui/icon.png'), '--out', icns], capture_output=True)
        print(f'Acceso creado en {app_mac()} (buscalo con Spotlight: "Almanaque").')
    elif WIN:
        powershell('$s=(New-Object -ComObject WScript.Shell).CreateShortcut($env:ALM_LNK);$s.TargetPath=$env:ALM_DST;$s.Save()',
                   ALM_LNK=os.path.join(escritorio_windows(), 'Almanaque del Valle.lnk'), ALM_DST=indice)
        print('Acceso directo creado en el Escritorio.')
    else:
        d = os.path.join(HOME, '.local/share/applications'); os.makedirs(d, exist_ok=True)
        esc = lambda p: p.replace('\\', '\\\\').replace('"', '\\"')
        with open(os.path.join(d, 'almanaque-del-valle.desktop'), 'w', encoding='utf8') as f:
            f.write(f'[Desktop Entry]\nType=Application\nName=Almanaque del Valle\nComment=Guía de Stardew Valley conectada a tu partida\n'
                    f'Exec=xdg-open "{esc(indice)}"\nIcon={os.path.join(ROOT, "assets/ui/icon.png")}\nCategories=Game;Utility;\nTerminal=false\n')
        print('Acceso creado en el menú de aplicaciones.')


# ---------- vigía
def inicio_windows():
    return os.path.join(os.environ['APPDATA'], 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'almanaque-vigia.vbs')


def plist_mac():
    return os.path.join(HOME, 'Library', 'LaunchAgents', ETIQUETA_MAC + '.plist')


def carpeta_protegida_mac():
    return MAC and any(ROOT.startswith(os.path.join(HOME, d) + os.sep) for d in ('Desktop', 'Documents', 'Downloads'))


def unidad_systemd():
    return os.path.join(HOME, '.config/systemd/user', SERVICIO + '.service')


def activar_vigia():
    script = os.path.join(TOOLS, 'vigia.py')
    if WIN:
        vbs = f'CreateObject("WScript.Shell").Run """{python_venv(True)}"" ""{script}""", 0, False\r\n'
        with open(inicio_windows(), 'w', encoding='utf-16') as f: f.write(vbs)
        subprocess.Popen(['wscript', inicio_windows()])
        print('Vigía activo: arranca solo al iniciar sesión.')
        return
    if MAC:
        import plistlib
        log = os.path.join(HOME, 'Library', 'Logs', 'almanaque-vigia.log')
        os.makedirs(os.path.dirname(plist_mac()), exist_ok=True); os.makedirs(os.path.dirname(log), exist_ok=True)
        with open(plist_mac(), 'wb') as f:
            plistlib.dump(dict(Label=ETIQUETA_MAC, ProgramArguments=[sys.executable, script], RunAtLoad=True, KeepAlive=dict(SuccessfulExit=False),
                               ThrottleInterval=10, EnvironmentVariables=dict(PYTHONUNBUFFERED='1', PYTHONUTF8='1'), StandardOutPath=log, StandardErrorPath=log), f)
        dominio = f'gui/{os.getuid()}'
        subprocess.run(['launchctl', 'bootout', dominio, plist_mac()], capture_output=True)  # si ya estaba, se recarga
        subprocess.run(['launchctl', 'bootstrap', dominio, plist_mac()], check=True)
        print('Vigía activo: arranca solo al iniciar sesión.')
        if carpeta_protegida_mac():
            print('Ojo: esta carpeta está en Escritorio, Documentos o Descargas. macOS puede pedir permiso para que Python escriba acá;'
                  ' si la wiki no se actualiza al dormir, mové la carpeta a tu carpeta personal y volvé a correr el instalador.')
        return
    if not shutil.which('systemctl'):
        print(f'Sin systemd: para activarlo, agregá a tu inicio de sesión: python3 "{script}"')
        return
    os.makedirs(os.path.dirname(unidad_systemd()), exist_ok=True)
    with open(unidad_systemd(), 'w', encoding='utf8') as f:
        f.write(f'[Unit]\nDescription=Almanaque del Valle: vigía de la partida de Stardew Valley\n\n[Service]\n'
                f'ExecStart="{sys.executable}" "{script}"\nRestart=on-failure\nRestartSec=10\n'
                f'Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=%t/bus\nEnvironment=PYTHONUNBUFFERED=1\n\n[Install]\nWantedBy=default.target\n')
    subprocess.run(['systemctl', '--user', 'daemon-reload'], check=True)
    subprocess.run(['systemctl', '--user', 'enable', '--now', SERVICIO], check=True)
    subprocess.run(['systemctl', '--user', 'restart', SERVICIO], check=True)
    print('Vigía activo: arranca solo al iniciar sesión.')


def borrar(ruta):
    try:
        os.remove(ruta); print('Borrado:', ruta)
    except FileNotFoundError:
        pass


def desinstalar():
    if WIN:
        # Corta el vigía que esté corriendo: solo el proceso de este script.
        powershell("Get-CimInstance Win32_Process -Filter \"Name='pythonw.exe'\" | Where-Object { $_.CommandLine -like \"*$env:ALM_S*\" } | ForEach-Object { Stop-Process -Id $_.ProcessId }",
                   ALM_S=os.path.join(TOOLS, 'vigia.py'))
        borrar(inicio_windows())
        borrar(os.path.join(escritorio_windows(), 'Almanaque del Valle.lnk'))
    elif MAC:
        if os.path.exists(plist_mac()):
            subprocess.run(['launchctl', 'bootout', f'gui/{os.getuid()}', plist_mac()], capture_output=True)
            borrar(plist_mac())
        if os.path.exists(app_mac()): shutil.rmtree(app_mac()); print('Borrado:', app_mac())
    else:
        if shutil.which('systemctl') and os.path.exists(unidad_systemd()):
            subprocess.run(['systemctl', '--user', 'disable', '--now', SERVICIO])
            borrar(unidad_systemd())
            subprocess.run(['systemctl', '--user', 'daemon-reload'])
        borrar(os.path.join(HOME, '.local/share/applications/almanaque-del-valle.desktop'))
    print('Listo. Para quitarlo del todo, borrá esta carpeta. Tu juego y tus partidas no se tocaron.')


def si_no(pregunta):
    while True:
        r = input(f'{pregunta} [S/n]: ').strip().lower()
        if r in ('', 's', 'si', 'sí', 'y', 'yes'): return True
        if r in ('n', 'no'): return False


def main():
    for s in (sys.stdout, sys.stderr): s.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--juego', help='carpeta de Stardew Valley, si no se detecta sola')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--con-vigia', action='store_true', help='activa el vigía sin preguntar')
    g.add_argument('--sin-vigia', action='store_true', help='no activa el vigía ni pregunta')
    ap.add_argument('--sin-acceso', action='store_true', help='no crea el acceso directo')
    ap.add_argument('--desinstalar', action='store_true', help='quita el vigía y el acceso directo')
    a = ap.parse_args()
    try:
        if a.desinstalar: return desinstalar()
        interactivo = sys.stdin.isatty()
        paso(1, 'Buscando el juego')
        node, npm = comprobar_programas()
        juego = buscar_juego(a.juego, interactivo)
        print('Encontrado:', juego)
        generar(juego, node, npm)
        paso(5, 'Leyendo tu partida más reciente')
        leer_partida_ahora()
        paso(6, 'Últimos detalles')
        if not a.sin_acceso: crear_acceso()
        print('\nEl vigía actualiza la wiki cada vez que dormís en el juego y avisa los cumpleaños.')
        if a.con_vigia or (not a.sin_vigia and interactivo and si_no('¿Activarlo al iniciar sesión?')): activar_vigia()
        print(f'\nListo. Abrí: {os.path.join(ROOT, "index.html")}')
    except (Fallo, subprocess.CalledProcessError, OSError) as e:
        sys.exit(f'\nError: {e}')
    except (KeyboardInterrupt, EOFError):
        sys.exit('\nInstalación cancelada.')


if __name__ == '__main__':
    main()
