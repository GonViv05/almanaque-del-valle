#!/usr/bin/env python3
"""Instalador de Almanaque del Valle / Valley Almanac (Windows, macOS y Linux).

Genera los datos y sprites (en español y en inglés) desde tu propia copia de Stardew Valley, crea un acceso
directo y, si querés, deja corriendo el vigía de la partida. La carpeta del juego y los guardados solo se leen.
Habla en el idioma del sistema (español o inglés); --idioma lo cambia.
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
NOMBRES = ('Almanaque del Valle', 'Valley Almanac')  # el acceso directo lleva el nombre del idioma elegido
sys.path.insert(0, TOOLS)
import idioma  # noqa: E402

IDIOMA = idioma.sistema()


def t(es, en):
    return en if IDIOMA == 'en' else es


def nombre():
    return t(*NOMBRES)


class Fallo(Exception):
    pass


def paso(n, texto):
    print(f'\n[{n}/6] {texto}', flush=True)


def correr(cmd, cwd=TOOLS, env=None):
    e = dict(os.environ, PYTHONUTF8='1', **(env or {}))
    r = subprocess.run([str(c) for c in cmd], cwd=cwd, env=e)
    if r.returncode: raise Fallo(t('Falló: ', 'Failed: ') + ' '.join(str(c) for c in cmd))


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
        raise Fallo(t(f'En "{indicado}" no encontré los archivos del juego (Content/ y StardewValley.GameData.dll).',
                      f'The game files (Content/ and StardewValley.GameData.dll) are not in "{indicado}".'))
    for c in candidatos():
        if es_juego(c): return c
    if not preguntar: raise Fallo(t('No encontré el juego. Indicá la carpeta con --juego "<ruta>".', 'Game not found. Pass its folder with --juego "<path>".'))
    print(t('No encontré Stardew Valley automáticamente.', 'Could not find Stardew Valley automatically.'))
    print(t('En Steam: clic derecho en el juego > Administrar > Ver archivos locales, y copiá esa ruta.',
            'In Steam: right-click the game > Manage > Browse local files, and copy that path.'))
    while True:
        if MAC: print(t('En Mac también podés arrastrar la carpeta (o Stardew Valley.app) a esta ventana.', 'On Mac you can also drag the folder (or Stardew Valley.app) into this window.'))
        c = input(t('Carpeta del juego (vacío para salir): ', 'Game folder (empty to quit): ')).strip().strip('"\'')
        if not WIN: c = c.replace('\\ ', ' ')  # la Terminal escapa los espacios al arrastrar
        if not c: raise Fallo(t('Instalación cancelada.', 'Installation cancelled.'))
        if es_juego(os.path.expanduser(c)): return os.path.expanduser(c)
        print(t('Ahí no están los archivos del juego (Content/ y StardewValley.GameData.dll). Probá de nuevo.',
                'The game files (Content/ and StardewValley.GameData.dll) are not there. Try again.'))


def comprobar_programas():
    if sys.version_info < (3, 9): raise Fallo(t('Hace falta Python 3.9 o más nuevo.', 'Python 3.9 or newer is required.'))
    node, npm = shutil.which('node'), shutil.which('npm')
    if not node or not npm: raise Fallo(t('Hace falta Node.js 22.7 o más nuevo: https://nodejs.org/', 'Node.js 22.7 or newer is required: https://nodejs.org/'))
    v = subprocess.run([node, '--version'], capture_output=True, text=True).stdout.strip()
    if tuple(int(x) for x in v.lstrip('v').split('.')[:2]) < (22, 7):
        raise Fallo(t(f'Tu Node.js es {v}; hace falta 22.7 o más nuevo: https://nodejs.org/', f'Your Node.js is {v}; 22.7 or newer is required: https://nodejs.org/'))
    return node, npm


def python_venv(gui=False):
    if WIN: return os.path.join(VENV, 'Scripts', 'pythonw.exe' if gui else 'python.exe')
    return os.path.join(VENV, 'bin', 'python')


def generar(juego, node, npm):
    paso(2, t('Preparando dependencias (solo la primera vez tarda)', 'Preparing dependencies (only slow the first time)'))
    if not os.path.exists(python_venv()): venv.create(VENV, with_pip=True)
    py = python_venv()
    correr([py, '-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', 'requirements.txt'])
    correr([npm, 'ci', '--silent', '--no-audit', '--no-fund'])
    dll, content = rutas_juego(juego)
    paso(3, t('Leyendo el formato de datos de tu versión del juego', "Reading your game version's data format"))
    correr([py, '00-schemas.py', dll, 'schemes.json'])
    paso(4, t('Extrayendo datos y sprites del juego (en español y en inglés)', 'Extracting game data and sprites (in English and Spanish)'))
    correr([node, '01-unpack.mjs'], env={'SDV_CONTENT': content})
    correr([py, '03-build-data.py'])
    correr([py, '03-build-data.py', '--lang', 'en'])
    correr([py, '04-assets.py'])
    partida = os.path.join(ROOT, 'data', 'partida.js')
    if not os.path.exists(partida):
        with open(partida, 'w', encoding='utf8') as f: f.write('window.PARTIDA=null;\n')


def leer_partida_ahora():
    import vigia
    if vigia.mas_reciente(vigia.SAVES):
        correr([python_venv(), 'vigia.py', '--una-vez', '--sin-notificar', '--idioma', IDIOMA])
    else:
        print(t('Todavía no hay partidas guardadas: la pestaña Mi Granja se completa cuando juegues.',
                'No saves yet: the My Farm tab fills in once you play.'))


# ---------- acceso directo
def escritorio_windows():
    r = subprocess.run(['powershell', '-NoProfile', '-Command', "[Environment]::GetFolderPath('Desktop')"], capture_output=True, text=True)
    return r.stdout.strip() or os.path.join(HOME, 'Desktop')


def powershell(script, **valores):
    env = dict(os.environ, **valores)
    subprocess.run(['powershell', '-NoProfile', '-Command', script], env=env, check=True)


def app_mac(n=None):
    return os.path.join(HOME, 'Applications', (n or nombre()) + '.app')


def crear_acceso():
    indice = os.path.join(ROOT, 'index.html')
    if MAC:
        # Una mini app de AppleScript que abre la wiki en el navegador; queda en ~/Applications y la encuentra Spotlight.
        texto = lambda x: '"' + x.replace('\\', '\\\\').replace('"', '\\"') + '"'
        for n in NOMBRES:  # si había una del otro idioma, se reemplaza
            if os.path.exists(app_mac(n)): shutil.rmtree(app_mac(n))
        os.makedirs(os.path.dirname(app_mac()), exist_ok=True)
        subprocess.run(['osacompile', '-o', app_mac(), '-e', f'do shell script "open " & quoted form of {texto(indice)}'], check=True, capture_output=True)
        icns = os.path.join(app_mac(), 'Contents', 'Resources', 'applet.icns')
        subprocess.run(['sips', '-s', 'format', 'icns', os.path.join(ROOT, 'assets/ui/icon.png'), '--out', icns], capture_output=True)
        print(t(f'Acceso creado en {app_mac()} (buscalo con Spotlight: "Almanaque").', f'Shortcut created at {app_mac()} (find it with Spotlight: "Almanac").'))
    elif WIN:
        for n in NOMBRES: borrar(os.path.join(escritorio_windows(), n + '.lnk'), avisar=False)
        powershell('$s=(New-Object -ComObject WScript.Shell).CreateShortcut($env:ALM_LNK);$s.TargetPath=$env:ALM_DST;$s.Save()',
                   ALM_LNK=os.path.join(escritorio_windows(), nombre() + '.lnk'), ALM_DST=indice)
        print(t('Acceso directo creado en el Escritorio.', 'Shortcut created on the Desktop.'))
    else:
        d = os.path.join(HOME, '.local/share/applications'); os.makedirs(d, exist_ok=True)
        esc = lambda p: p.replace('\\', '\\\\').replace('"', '\\"')
        with open(os.path.join(d, 'almanaque-del-valle.desktop'), 'w', encoding='utf8') as f:
            f.write(f'[Desktop Entry]\nType=Application\nName={nombre()}\nComment={t("Guía de Stardew Valley conectada a tu partida", "Stardew Valley guide connected to your save")}\n'
                    f'Exec=xdg-open "{esc(indice)}"\nIcon={os.path.join(ROOT, "assets/ui/icon.png")}\nCategories=Game;Utility;\nTerminal=false\n')
        print(t('Acceso creado en el menú de aplicaciones.', 'Shortcut added to the applications menu.'))


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
    activo = t('Vigía activo: arranca solo al iniciar sesión.', 'Watcher on: it starts by itself when you log in.')
    if WIN:
        vbs = f'CreateObject("WScript.Shell").Run """{python_venv(True)}"" ""{script}"" --idioma {IDIOMA}", 0, False\r\n'
        with open(inicio_windows(), 'w', encoding='utf-16') as f: f.write(vbs)
        subprocess.Popen(['wscript', inicio_windows()])
        print(activo)
        return
    if MAC:
        import plistlib
        log = os.path.join(HOME, 'Library', 'Logs', 'almanaque-vigia.log')
        os.makedirs(os.path.dirname(plist_mac()), exist_ok=True); os.makedirs(os.path.dirname(log), exist_ok=True)
        with open(plist_mac(), 'wb') as f:
            plistlib.dump(dict(Label=ETIQUETA_MAC, ProgramArguments=[sys.executable, script, '--idioma', IDIOMA], RunAtLoad=True, KeepAlive=dict(SuccessfulExit=False),
                               ThrottleInterval=10, EnvironmentVariables=dict(PYTHONUNBUFFERED='1', PYTHONUTF8='1'), StandardOutPath=log, StandardErrorPath=log), f)
        dominio = f'gui/{os.getuid()}'
        subprocess.run(['launchctl', 'bootout', dominio, plist_mac()], capture_output=True)  # si ya estaba, se recarga
        subprocess.run(['launchctl', 'bootstrap', dominio, plist_mac()], check=True)
        print(activo)
        if carpeta_protegida_mac():
            print(t('Ojo: esta carpeta está en Escritorio, Documentos o Descargas. macOS puede pedir permiso para que Python escriba acá;'
                    ' si la wiki no se actualiza al dormir, mové la carpeta a tu carpeta personal y volvé a correr el instalador.',
                    'Heads up: this folder is in Desktop, Documents or Downloads. macOS may ask for permission for Python to write here;'
                    ' if the wiki does not update when you sleep, move the folder to your home folder and run the installer again.'))
        return
    if not shutil.which('systemctl'):
        print(t(f'Sin systemd: para activarlo, agregá a tu inicio de sesión: python3 "{script}" --idioma {IDIOMA}',
                f'No systemd: to turn it on, add this to your login startup: python3 "{script}" --idioma {IDIOMA}'))
        return
    os.makedirs(os.path.dirname(unidad_systemd()), exist_ok=True)
    with open(unidad_systemd(), 'w', encoding='utf8') as f:
        f.write(f'[Unit]\nDescription={nombre()}: {t("vigía de la partida de Stardew Valley", "Stardew Valley save watcher")}\n\n[Service]\n'
                f'ExecStart="{sys.executable}" "{script}" --idioma {IDIOMA}\nRestart=on-failure\nRestartSec=10\n'
                f'Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=%t/bus\nEnvironment=PYTHONUNBUFFERED=1\n\n[Install]\nWantedBy=default.target\n')
    subprocess.run(['systemctl', '--user', 'daemon-reload'], check=True)
    subprocess.run(['systemctl', '--user', 'enable', '--now', SERVICIO], check=True)
    subprocess.run(['systemctl', '--user', 'restart', SERVICIO], check=True)
    print(activo)


def borrar(ruta, avisar=True):
    try:
        os.remove(ruta)
        if avisar: print(t('Borrado:', 'Removed:'), ruta)
    except FileNotFoundError:
        pass


def desinstalar():
    if WIN:
        # Corta el vigía que esté corriendo: solo el proceso de este script.
        powershell("Get-CimInstance Win32_Process -Filter \"Name='pythonw.exe'\" | Where-Object { $_.CommandLine -like \"*$env:ALM_S*\" } | ForEach-Object { Stop-Process -Id $_.ProcessId }",
                   ALM_S=os.path.join(TOOLS, 'vigia.py'))
        borrar(inicio_windows())
        for n in NOMBRES: borrar(os.path.join(escritorio_windows(), n + '.lnk'))
    elif MAC:
        if os.path.exists(plist_mac()):
            subprocess.run(['launchctl', 'bootout', f'gui/{os.getuid()}', plist_mac()], capture_output=True)
            borrar(plist_mac())
        for n in NOMBRES:
            if os.path.exists(app_mac(n)): shutil.rmtree(app_mac(n)); print(t('Borrado:', 'Removed:'), app_mac(n))
    else:
        if shutil.which('systemctl') and os.path.exists(unidad_systemd()):
            subprocess.run(['systemctl', '--user', 'disable', '--now', SERVICIO])
            borrar(unidad_systemd())
            subprocess.run(['systemctl', '--user', 'daemon-reload'])
        borrar(os.path.join(HOME, '.local/share/applications/almanaque-del-valle.desktop'))
    print(t('Listo. Para quitarlo del todo, borrá esta carpeta. Tu juego y tus partidas no se tocaron.',
            'Done. To remove it completely, delete this folder. Your game and your saves were not touched.'))


def si_no(pregunta):
    while True:
        r = input(f'{pregunta} [{t("S/n", "Y/n")}]: ').strip().lower()
        if r in ('', 's', 'si', 'sí', 'y', 'yes'): return True
        if r in ('n', 'no'): return False


def main():
    global IDIOMA
    for s in (sys.stdout, sys.stderr): s.reconfigure(encoding='utf-8', errors='replace')
    previo = argparse.ArgumentParser(add_help=False); previo.add_argument('--idioma', choices=idioma.IDIOMAS)
    IDIOMA = idioma.elegir(previo.parse_known_args()[0].idioma)
    ap = argparse.ArgumentParser(description=t('Instalador de Almanaque del Valle (Windows, macOS y Linux).', 'Valley Almanac installer (Windows, macOS and Linux).'))
    ap.add_argument('--juego', help=t('carpeta de Stardew Valley, si no se detecta sola', 'Stardew Valley folder, if it is not found automatically'))
    ap.add_argument('--idioma', choices=idioma.IDIOMAS, help=t('idioma del instalador, del acceso directo y de los avisos (por defecto, el del sistema)',
                                                               'language of the installer, the shortcut and the notifications (default: the system one)'))
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--con-vigia', action='store_true', help=t('activa el vigía sin preguntar', 'turns the watcher on without asking'))
    g.add_argument('--sin-vigia', action='store_true', help=t('no activa el vigía ni pregunta', 'does not turn the watcher on nor ask'))
    ap.add_argument('--sin-acceso', action='store_true', help=t('no crea el acceso directo', 'does not create the shortcut'))
    ap.add_argument('--desinstalar', action='store_true', help=t('quita el vigía y el acceso directo', 'removes the watcher and the shortcut'))
    a = ap.parse_args()
    try:
        if a.desinstalar: return desinstalar()
        interactivo = sys.stdin.isatty()
        paso(1, t('Buscando el juego', 'Looking for the game'))
        node, npm = comprobar_programas()
        juego = buscar_juego(a.juego, interactivo)
        print(t('Encontrado:', 'Found:'), juego)
        generar(juego, node, npm)
        paso(5, t('Leyendo tu partida más reciente', 'Reading your latest save'))
        leer_partida_ahora()
        paso(6, t('Últimos detalles', 'Final touches'))
        if not a.sin_acceso: crear_acceso()
        print('\n' + t('El vigía actualiza la wiki cada vez que dormís en el juego y avisa los cumpleaños.',
                       'The watcher updates the wiki every time you sleep in the game and reminds you of birthdays.'))
        if a.con_vigia or (not a.sin_vigia and interactivo and si_no(t('¿Activarlo al iniciar sesión?', 'Turn it on at login?'))): activar_vigia()
        print('\n' + t('Listo. Abrí: ', 'Done. Open: ') + os.path.join(ROOT, 'index.html'))
    except (Fallo, subprocess.CalledProcessError, OSError) as e:
        sys.exit('\n' + t('Error: ', 'Error: ') + str(e))
    except (KeyboardInterrupt, EOFError):
        sys.exit('\n' + t('Instalación cancelada.', 'Installation cancelled.'))


if __name__ == '__main__':
    main()
